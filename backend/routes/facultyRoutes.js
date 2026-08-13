const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getStudents,
    getStudentProfile,
    createSession,
    getSessions,
    completeSession,
    submitReport,
    getReports,
    getFacultyTasks,
    submitTaskProof,
    uploadDocument,
    getDocuments,
    deleteDocument,
    getNotifications,
    markRead,
    updateProfile,
    getMentorLogs,
    getStudentExamScores,
    submitExamScore,
    getProfile
} = require('../controllers/facultyController');
const { getTimetable, getAcademicSchedule, submitTimetableReport } = require('../controllers/facultyTimetableController');
const { getDailyHours } = require('../controllers/mentorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// All faculty routes are protected and restricted to role 'faculty'
router.use(protect);
router.use(authorize('faculty'));

// Dashboard
router.get('/dashboard', getDashboard);

// Students
router.get('/students', getStudents);
router.get('/students/:id', getStudentProfile);

// Sessions (Old)
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.put('/sessions/:id/complete', completeSession);

// Timetable & Academic Schedule (New)
router.get('/timetable', getTimetable);
router.get('/schedule', getAcademicSchedule);
router.post('/schedule/report', submitTimetableReport);

// Reports
router.get('/reports', getReports);
router.post('/reports', submitReport);
router.get('/faculty-logs', getMentorLogs);
router.get('/faculty_logs', getMentorLogs);

// Daily Hours
router.get('/daily-hours/:studentId', getDailyHours);

// Exam Scores
router.get('/exam-scores', getStudentExamScores);
router.post('/exam-scores', submitExamScore);

// Tasks
router.get('/tasks', getFacultyTasks);
router.put('/tasks/:id/proof', upload.single('proof'), submitTaskProof);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markRead);

// Profile
router.get('/profile', getProfile);
router.put('/profile', upload.single('profile_image'), updateProfile);

module.exports = router;
