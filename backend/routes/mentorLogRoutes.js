const express = require('express');
const router = express.Router();
const { 
    createLog, 
    getPreviousSession, 
    getStudentAnalytics 
} = require('../controllers/mentorLogController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { upload } = require('../config/cloudinary');

// Base path: /api/mentor-logs
router.use(requireAuth);

// Create Log - Mentor only
router.post('/create', requireRole('mentor'), createLog);

// Proof Upload - Multi
router.post('/upload', (req, res) => {
    upload.array('files', 8)(req, res, (err) => {
        if (err) {
            console.error('[UPLOAD ERROR]', err.message);
            return res.status(500).json({ success: false, message: 'File upload failed: ' + err.message });
        }
        try {
            const urls = (req.files || []).map(f => f.path);
            res.status(200).json({ success: true, urls });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// Continuity Feature
router.get('/previous/:studentId', requireRole('mentor'), getPreviousSession);

// Analytics
router.get('/analytics/:studentId', requireRole('mentor'), getStudentAnalytics);

module.exports = router;
