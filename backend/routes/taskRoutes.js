const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const { upload } = require('../config/cloudinary');

// All task routes require authentication
router.use(requireAuth);

// Admin and Mentor Head routes for creating/deleting
router.get('/', getTasks);
router.post('/', requireRole('super_admin', 'admin', 'sub_admin', 'academic_head', 'academic_operation_executive', 'mentor_head'), createTask);
router.delete('/:id', requireRole('super_admin', 'admin', 'sub_admin', 'academic_head', 'academic_operation_executive', 'mentor_head'), deleteTask);

// Status update can be done by anybody assigned to the task
router.put('/:id/status', upload.single('proof'), updateTaskStatus);

module.exports = router;
