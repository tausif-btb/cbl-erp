const { validationResult } = require('express-validator');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// Create a new payroll
exports.createPayroll = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      employeeId,
      month,
      year,
      baseSalary,
      allowances,
      deductions,
      bonus,
      taxAmount,
      paymentMethod,
      comments
    } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if payroll for this month/year already exists
    const existingPayroll = await Payroll.findOne({
      employeeId,
      month,
      year
    });

    if (existingPayroll) {
      return res.status(400).json({ message: 'Payroll for this month already exists' });
    }

    // Calculate net salary
    const netSalary = (baseSalary + (allowances || 0) + (bonus || 0)) - (deductions || 0) - (taxAmount || 0);

    // Create new payroll record
    const payroll = new Payroll({
      employeeId,
      month,
      year,
      baseSalary,
      allowances: allowances || 0,
      deductions: deductions || 0,
      bonus: bonus || 0,
      taxAmount: taxAmount || 0,
      netSalary,
      paymentMethod: paymentMethod || 'bank_transfer',
      comments
    });

    await payroll.save();

    res.status(201).json({
      message: 'Payroll created successfully',
      payroll
    });
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all payrolls with filtering options
exports.getAllPayrolls = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    
    const query = {};
    
    if (month) query.month = month;
    if (year) query.year = year;
    if (status) query.paymentStatus = status;

    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json(payrolls);
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payroll by ID
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'firstName lastName email department position');
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }
    
    res.status(200).json(payroll);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payrolls by employee ID
exports.getPayrollsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const payrolls = await Payroll.find({ employeeId })
      .sort({ year: -1, month: -1 });
    
    res.status(200).json(payrolls);
  } catch (error) {
    console.error('Get employee payrolls error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payroll status
exports.updatePayrollStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentReference } = req.body;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }
    
    // Update payroll
    payroll.paymentStatus = paymentStatus;
    
    if (paymentStatus === 'paid') {
      payroll.paymentDate = paymentDate || new Date();
      payroll.paymentReference = paymentReference;
    }
    
    await payroll.save();
    
    res.status(200).json({
      message: 'Payroll status updated successfully',
      payroll
    });
  } catch (error) {
    console.error('Update payroll status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete payroll
exports.deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }
    
    // Only allow deletion if status is pending
    if (payroll.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete processed payroll' });
    }
    
    await Payroll.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Payroll deleted successfully' });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 