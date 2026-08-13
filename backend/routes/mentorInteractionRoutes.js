const express = require('express');
const router = express.Router();
const controller = require('../controllers/mentorInteractionController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// Wrapper: catches multer/cloudinary upload errors and returns clean JSON
const handleUpload = (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
        if (err) {
            console.error('[UPLOAD ERROR]', err.message);
            // Don't crash — continue without files so controller can handle
            req.files = [];
            req.uploadError = err.message;
        }
        next();
    });
};

router.get('/daily-assignments', protect, controller.getDailyAssignments);
router.get('/yesterday-pending', protect, controller.getYesterdayPending);
router.post('/submit-report', protect, handleUpload, controller.submitSessionReport);
router.get('/high-risk-students', protect, controller.getHighRiskStudents);
router.get('/weekly-coverage', protect, controller.getWeeklyCoverage);
router.post('/toggle-pause', protect, controller.togglePause);
router.get('/report/:id/today', protect, controller.getTodaySessionReport);
router.put('/report/:id', protect, handleUpload, controller.updateSessionReport);
router.delete('/report/:id', protect, controller.deleteSessionReport);

module.exports = router;
