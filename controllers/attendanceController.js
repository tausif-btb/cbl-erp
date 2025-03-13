const { validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

exports.checkIn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { location } = req.body;
    
    // Get employee ID - either from request body or from authenticated user
    let employeeId = req.body.employeeId;
    
    // If no employee ID provided and user is an employee, get their employee record
    if (!employeeId && req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user.userId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee record not found' });
      }
      employeeId = employee._id;
    }
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Create today's date with time set to 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance record for today exists
    let attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (attendance) {
      if (attendance.checkIn.time) {
        return res.status(400).json({ message: 'Already checked in today' });
      }
      
      // Update existing record
      attendance.checkIn = {
        time: new Date(),
        location: {
          type: 'Point',
          coordinates: location || [0, 0]
        }
      };
      attendance.status = 'present';
    } else {
      // Create new attendance record
      attendance = new Attendance({
        employeeId,
        date: today,
        checkIn: {
          time: new Date(),
          location: {
            type: 'Point',
            coordinates: location || [0, 0]
          }
        },
        status: 'present'
      });
    }

    await attendance.save();

    res.status(200).json({
      message: 'Checked in successfully',
      attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkOut = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { location } = req.body;
    
    // Get employee ID - either from request body or from authenticated user
    let employeeId = req.body.employeeId;
    
    // If no employee ID provided and user is an employee, get their employee record
    if (!employeeId && req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user.userId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee record not found' });
      }
      employeeId = employee._id;
    }
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Create today's date with time set to 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance record for today exists
    const attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance || !attendance.checkIn.time) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    // Update checkout info
    const checkoutTime = new Date();
    attendance.checkOut = {
      time: checkoutTime,
      location: {
        type: 'Point',
        coordinates: location || [0, 0]
      }
    };

    // Calculate work hours
    const checkInTime = new Date(attendance.checkIn.time);
    const diffMs = checkoutTime - checkInTime;
    const diffHrs = diffMs / (1000 * 60 * 60);
    attendance.workHours = parseFloat(diffHrs.toFixed(2));

    await attendance.save();

    res.status(200).json({
      message: 'Checked out successfully',
      attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = { employeeId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employeeId', 'firstName lastName employmentType');

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const summary = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDateObj, $lte: endDateObj }
        }
      },
      {
        $group: {
          _id: '$employeeId',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
          wfh: { $sum: { $cond: [{ $eq: ['$status', 'wfh'] }, 1, 0] } },
          totalWorkHours: { $sum: '$workHours' },
          averageWorkHours: { $avg: '$workHours' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $project: {
          _id: 1,
          employeeName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          present: 1,
          absent: 1,
          halfDay: 1,
          leave: 1,
          wfh: 1,
          totalWorkHours: 1,
          averageWorkHours: { $round: ['$averageWorkHours', 2] }
        }
      }
    ]);

    res.status(200).json(summary);
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 