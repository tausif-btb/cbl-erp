const cron = require('node-cron');
const Employee = require('../models/Employee');
const emailService = require('./emailService');

// Initialize alert service
const initAlertService = () => {
  // Birthday alerts - runs daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      await sendBirthdayAlerts();
    } catch (error) {
      console.error('Birthday alert error:', error);
    }
  });

  // Appraisal alerts - runs weekly on Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    try {
      await sendAppraisalAlerts();
    } catch (error) {
      console.error('Appraisal alert error:', error);
    }
  });

  console.log('Alert service initialized');
};

// Send birthday alerts
const sendBirthdayAlerts = async () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Find employees with birthdays today
  const employees = await Employee.find({
    $expr: {
      $and: [
        { $eq: [{ $month: '$dateOfBirth' }, month] },
        { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] }
      ]
    }
  });

  if (employees.length === 0) {
    return;
  }

  // Get HR emails
  const hrEmails = await getHREmails();

  // Send notifications to HR
  const hrEmailData = {
    to: hrEmails,
    subject: 'Employee Birthday Reminder',
    text: `The following employee(s) have birthdays today: ${employees.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ')}`
  };
  
  await emailService.sendEmail(hrEmailData);

  // Send birthday wishes to employees
  for (const employee of employees) {
    const employeeEmailData = {
      to: employee.email,
      subject: 'Happy Birthday!',
      text: `Dear ${employee.firstName},\n\nHappy Birthday from the entire team at CBL ERP! We wish you a wonderful day and a great year ahead.\n\nBest regards,\nHR Team`
    };
    
    await emailService.sendEmail(employeeEmailData);
  }
};

// Send appraisal alerts
const sendAppraisalAlerts = async () => {
  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  // Find employees with appraisals due in the next 30 days
  const employees = await Employee.find({
    nextAppraisal: {
      $gte: today,
      $lte: thirtyDaysLater
    }
  });

  if (employees.length === 0) {
    return;
  }

  // Get HR emails
  const hrEmails = await getHREmails();

  // Send notifications to HR
  const hrEmailData = {
    to: hrEmails,
    subject: 'Upcoming Employee Appraisals',
    text: `The following employee(s) have appraisals due in the next 30 days:\n\n${employees.map(emp => 
      `${emp.firstName} ${emp.lastName} - Due on ${emp.nextAppraisal.toDateString()}`
    ).join('\n')}`
  };
  
  await emailService.sendEmail(hrEmailData);

  // Send reminder to employees
  for (const employee of employees) {
    const employeeEmailData = {
      to: employee.email,
      subject: 'Upcoming Performance Appraisal',
      text: `Dear ${employee.firstName},\n\nThis is a reminder that your performance appraisal is scheduled for ${employee.nextAppraisal.toDateString()}. Please prepare any necessary documentation and self-assessment before the meeting.\n\nBest regards,\nHR Team`
    };
    
    await emailService.sendEmail(employeeEmailData);
  }
};

// Helper function to get HR emails
const getHREmails = async () => {
  const hrEmployees = await Employee.find().populate({
    path: 'userId',
    match: { role: 'hr', isActive: true },
    select: 'email'
  });

  const hrEmails = hrEmployees
    .filter(emp => emp.userId)
    .map(emp => emp.email);
  
  return hrEmails;
};

module.exports = {
  initAlertService,
  sendBirthdayAlerts,
  sendAppraisalAlerts
}; 