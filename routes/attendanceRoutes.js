const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Employee check-in
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Optional if user is an employee
 *               location:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: [longitude, latitude]
 *     responses:
 *       200:
 *         description: Successfully checked in
 */
router.post('/check-in', 
  protect, 
  [
    body('location').optional().isArray(),
    body('employeeId').optional().isMongoId()
  ],
  attendanceController.checkIn
);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Employee check-out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Optional if user is an employee
 *               location:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: [longitude, latitude]
 *     responses:
 *       200:
 *         description: Successfully checked out
 */
router.post('/check-out', 
  protect, 
  [
    body('location').optional().isArray(),
    body('employeeId').optional().isMongoId()
  ],
  attendanceController.checkOut
);

/**
 * @swagger
 * /api/attendance/employee/{employeeId}:
 *   get:
 *     summary: Get attendance records for an employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get('/employee/:employeeId', 
  protect, 
  attendanceController.getAttendanceByEmployee
);

/**
 * @swagger
 * /api/attendance/summary:
 *   get:
 *     summary: Get attendance summary for all employees
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Attendance summary
 */
router.get('/summary', 
  protect, 
  authorize('super_admin', 'admin', 'hr'),
  attendanceController.getAttendanceSummary
);

module.exports = router; 