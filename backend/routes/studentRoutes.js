const express = require('express');
const router = express.Router();
const { 
    submitDailyUpdate,
    getMyUpdates
} = require('../controllers/studentController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Apply middleware (Students or any user role that is a student)
router.use(requireAuth);
router.use(requireRole('student'));

router.post('/daily-update', submitDailyUpdate);
router.get('/my-updates', getMyUpdates);

module.exports = router;
