const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const payrollController = require('../controllers/payrollController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * /api/payroll:
 *   post:
 *     summary: Create a new payroll record
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - month
 *               - year
 *               - baseSalary
 *             properties:
 *               employeeId:
 *                 type: string
 *               month:
 *                 type: number
 *               year:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payroll created successfully
 */
router.post('/', 
  protect, 
  authorize('super_admin', 'admin', 'accounts'),
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
    body('baseSalary').isNumeric().withMessage('Base salary must be a number')
  ],
  payrollController.createPayroll
);

/**
 * @swagger
 * /api/payroll:
 *   get:
 *     summary: Get all payroll records
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: number
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *     responses:
 *       200:
 *         description: List of payroll records
 */
router.get('/', 
  protect, 
  authorize('super_admin', 'admin', 'accounts', 'hr'),
  payrollController.getAllPayrolls
);

/**
 * @swagger
 * /api/payroll/{id}:
 *   get:
 *     summary: Get payroll record by ID
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll record
 */
router.get('/:id', 
  protect, 
  payrollController.getPayrollById
);

/**
 * @swagger
 * /api/payroll/employee/{employeeId}:
 *   get:
 *     summary: Get payroll records for an employee
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of payroll records for an employee
 */
router.get('/employee/:employeeId', 
  protect,
  payrollController.getPayrollsByEmployee
);

/**
 * @swagger
 * /api/payroll/{id}/status:
 *   patch:
 *     summary: Update payroll payment status
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed]
 *     responses:
 *       200:
 *         description: Payroll status updated
 */
router.patch('/:id/status', 
  protect, 
  authorize('super_admin', 'admin', 'accounts'),
  [
    body('paymentStatus').isIn(['pending', 'paid', 'failed']).withMessage('Valid payment status is required')
  ],
  payrollController.updatePayrollStatus
);

/**
 * @swagger
 * /api/payroll/{id}:
 *   delete:
 *     summary: Delete payroll record
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll deleted
 */
router.delete('/:id', 
  protect, 
  authorize('super_admin', 'admin'),
  payrollController.deletePayroll
);

module.exports = router; 