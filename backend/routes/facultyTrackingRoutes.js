const express = require('express');
const router = express.Router();
const {
    createClassUpdate,
    getFacultyClassUpdates,
    createMentorReview,
    createInteraction,
    getInteractions
} = require('../controllers/facultyTrackingController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Base path: /api/faculty-tracking
router.use(requireAuth);

// Faculty Routes
router.post('/class-update', requireRole('faculty'), createClassUpdate);

// Mentor Routes
router.get('/mentor/class-updates', requireRole('mentor'), getFacultyClassUpdates);
router.post('/mentor/review', requireRole('mentor'), createMentorReview);
router.post('/mentor/interaction', requireRole('mentor'), createInteraction);
router.get('/mentor/interactions', requireRole('mentor'), getInteractions);

module.exports = router;
