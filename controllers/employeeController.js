const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const User = require('../models/User');

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({})
      .sort({ createdAt: -1 });
    
    res.status(200).json(employees);
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check authorization
    if (req.user.role === 'employee' && 
        req.user.userId.toString() !== employee.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this employee data' });
    }
    
    res.status(200).json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new employee
exports.createEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      bloodGroup,
      employmentType,
      department,
      position,
      joiningDate,
      salary,
      emergencyContact,
      userId
    } = req.body;

    // Check if employee with this email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Create new employee
    const employee = new Employee({
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      bloodGroup,
      employmentType,
      department,
      position,
      joiningDate,
      salary,
      emergencyContact,
      userId
    });

    await employee.save();

    // If userId is provided, update the user with employee ID
    if (userId) {
      await User.findByIdAndUpdate(userId, { employeeId: employee._id });
    }

    res.status(201).json({
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find employee by ID
    let employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Update employee
    employee = await Employee.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find employee
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Delete employee
    await Employee.findByIdAndDelete(id);
    
    // If employee has associated user, update that user
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { employeeId: null });
    }
    
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 