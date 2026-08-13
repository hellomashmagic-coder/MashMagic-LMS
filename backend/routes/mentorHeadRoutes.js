const express = require('express');
const router = express.Router();
const { getFacultyChangeHistory } = require('../controllers/facultyHistoryController');
const {
    registerMentor,
    getDashboardStats,
    getMentorStudents,
    getAllActivities,
    getMentorDetails,
    getMentorActivityDashboard,
    getMentorMonitoringDetails,
    shiftStudent,
    getDailyStudentChecks,
    checkStudentToday,
    uncheckStudent,
    getDailySummary,
    getAllStudents,
    getStudentInteractionLogs,
    getFacultyInteractionLogs,
    getMentorInteractionLogs,
    getFacultyIntelligenceLogs,
    getExamAnalytics,
    editStudent,
    deleteStudent,
    getFaculties,
    getFacultyById,
    editFaculty,
    deleteFaculty,
    getMentors,
    getStudents,
    editMentor,
    deleteMentor,
    getStudentById,
    toggleMentorshipCompleted,
    deleteInteractionLog,
    getDropdownData,
    getAcademicSchedule,
    assignMentor,
    updateStudentAssessmentLevel,
    updateInteractionLog,
    getInteractionHistory,
    removeMentor
} = require('../controllers/mentorHeadController');
const { getDailyUpdates } = require('../controllers/sscController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All routes require mentor_head role
router.use(requireAuth);
router.use(requireRole('mentor_head', 'super_admin'));

router.get('/academic-schedule', getAcademicSchedule);
router.post('/register-mentor', registerMentor);
router.get('/dashboard', getDashboardStats);
router.get('/activities', getAllActivities);
router.get('/mentor/:mentorId/students', getMentorStudents);
router.get('/mentor/:mentorId/details', getMentorDetails);
router.get('/dropdowns', getDropdownData);

// Monitoring Architecture Routes
router.get('/mentor-activity', getMentorActivityDashboard);
router.get('/mentors/:mentorId/monitoring', getMentorMonitoringDetails);
router.put('/students/:studentId/assign', assignMentor);
router.put('/students/:studentId/remove-mentor', removeMentor);
router.put('/students/:studentId/shift', shiftStudent);
router.put('/students/:studentId/assessment-level', updateStudentAssessmentLevel);
router.get('/daily-student-checks', getDailyStudentChecks);
router.post('/students/:studentId/check', checkStudentToday);
router.delete('/students/:studentId/uncheck', uncheckStudent);
router.get('/daily-summary', getDailySummary);
router.get('/all-students', getAllStudents);
router.get('/exam-analytics', getExamAnalytics);

// Student Management for Mentor Head (Unified)
router.get('/students-all', getStudents);
router.get('/students', getStudents);
router.get('/daily-updates', getDailyUpdates);
router.get('/students/:id', getStudentById);
router.put('/students/:id', editStudent);
router.delete('/students/:id', deleteStudent);
router.put('/students/:studentId/mentorship-complete', toggleMentorshipCompleted);

// Intelligence Hub Routes
router.get('/student-logs', getStudentInteractionLogs);
router.get('/faculty-logs', getFacultyInteractionLogs);
router.get('/mentor-logs', getMentorInteractionLogs);
router.get('/faculty-intelligence', getFacultyIntelligenceLogs);
router.delete('/logs/:id', deleteInteractionLog);
router.put('/interactions/:source/:id', upload.array('files', 5), updateInteractionLog);
router.get('/interactions/:source/:id/history', getInteractionHistory);

// Faculty Management for Mentor Head
router.get('/faculties-all', getFaculties);
router.get('/faculties/:id', getFacultyById);
router.put('/faculties/:id', editFaculty);
router.delete('/faculties/:id', deleteFaculty);



// Mentor Management for Mentor Head (Unified)
router.get('/mentors-all', getMentors);
router.put('/mentors/:mentorId', editMentor);
router.delete('/mentors/:mentorId', deleteMentor);

module.exports = router;

// Get faculty change history
router.get('/students/:id/faculty-history', getFacultyChangeHistory);
