const express = require('express');
const router = express.Router();
const { getFacultyChangeHistory } = require('../controllers/facultyHistoryController');
const {
    getMentorDashboard,
    getMentorStudents,
    getStudentDetails,
    getMentorTasks,
    completeMentorTask,
    getMentorTimetable,
    createSession,
    updateSession,
    deleteSession,
    createStudentLog,
    getStudentLogs,
    toggleStudentConnection,
    completeOnboarding,
    createBatchTimetable,
    getPendingExams,
    getExamHistory,
    submitExamResult,
    logDailyHours,
    getDailyHours,
    getAcademicSchedule,
    getStudentDailyUpdates,
    createMentorshipLog,
    getMentorshipLogs,
    getStudentAcademicSchedule,
    updateStudentAcademicSchedule,
    updateAcademicSessionReminder,
    completeAcademicSession,
    getMentors,
    recalculateAllSessionNumbers
} = require('../controllers/mentorController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { upload } = require('../config/cloudinary');

// Apply basic auth to all routes
router.use(requireAuth);

router.get('/dashboard', requireRole('mentor', 'ssc'), getMentorDashboard);
router.get('/students', requireRole('mentor', 'ssc', 'super_admin', 'admin', 'mentor_head', 'academic_head'), getMentorStudents);
router.get('/students/:id', requireRole('mentor', 'ssc', 'super_admin', 'admin', 'mentor_head', 'academic_head'), getStudentDetails);
router.get('/students/:id/schedule', requireRole('mentor', 'ssc', 'super_admin', 'admin', 'mentor_head', 'academic_head'), getStudentAcademicSchedule);
router.post('/students/:id/schedule', requireRole('ssc', 'super_admin', 'admin'), updateStudentAcademicSchedule);
router.get('/tasks', requireRole('mentor'), getMentorTasks);
router.put('/tasks/:id/complete', requireRole('mentor'), upload.single('proof'), completeMentorTask);
router.get('/timetable', requireRole('mentor', 'super_admin', 'admin', 'mentor_head', 'ssc', 'academic_head'), getMentorTimetable);
router.get('/recalculate-all', requireRole('super_admin', 'admin', 'ssc'), recalculateAllSessionNumbers);
router.post('/timetable', requireRole('ssc'), createSession);
router.put('/timetable/:id', requireRole('ssc'), updateSession);
router.delete('/timetable/:id', requireRole('ssc'), deleteSession);
router.post('/student-log', requireRole('mentor', 'ssc'), createStudentLog);
router.get('/student-logs', requireRole('mentor', 'ssc', 'super_admin', 'admin'), getStudentLogs);
router.post('/daily-hours', requireRole('mentor'), logDailyHours);
router.get('/daily-hours/:studentId', requireRole('mentor', 'super_admin', 'admin'), getDailyHours);
router.get('/students/:studentId/daily-updates', requireRole('mentor', 'ssc', 'super_admin', 'admin'), getStudentDailyUpdates);
router.put('/students/:studentId/connection', requireRole('mentor', 'ssc'), toggleStudentConnection);
router.put('/students/:studentId/onboard', requireRole('mentor', 'ssc', 'super_admin', 'admin'), completeOnboarding);
router.get('/exams/pending', requireRole('mentor'), getPendingExams);
router.get('/exams/history', requireRole('mentor'), getExamHistory);
router.get('/academic-schedule', requireRole('mentor', 'ssc', 'academic_head', 'super_admin'), getAcademicSchedule);
router.put('/academic-schedule/:id/reminder', requireRole('mentor', 'ssc', 'academic_head', 'super_admin'), updateAcademicSessionReminder);
router.put('/academic-schedule/:id/complete', requireRole('mentor', 'ssc', 'academic_head', 'super_admin'), completeAcademicSession);
router.post('/timetable/batch', requireRole('ssc'), createBatchTimetable);
router.post('/exams/submit', requireRole('mentor'), submitExamResult);
router.post('/mentorship-log', requireRole('mentor', 'ssc'), createMentorshipLog);
router.get('/mentorship-logs/:studentId', requireRole('mentor', 'ssc', 'super_admin', 'admin'), getMentorshipLogs);
router.get('/faculties-all', requireRole('mentor', 'ssc', 'super_admin', 'admin', 'mentor_head', 'academic_head'), require('../controllers/mentorHeadController').getFaculties);
router.get('/mentors-all', requireRole('mentor', 'ssc', 'super_admin', 'admin', 'mentor_head', 'academic_head'), getMentors);


module.exports = router;

// Get faculty change history
router.get('/students/:id/faculty-history', getFacultyChangeHistory);
