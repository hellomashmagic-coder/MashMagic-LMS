const express = require('express');
const router = express.Router();
const { getFacultyChangeHistory } = require('../controllers/facultyHistoryController');
const {
    getDropdownData,
    registerStudent,
    registerFaculty,
    registerSSC,
    getDashboardStats,
    getAllFacultyActivity,
    getStudentInteractionLogs,
    getFacultyInteractionLogs,
    getAcademicActions,
    getDailyFacultyChecks,
    checkFacultySessionToday,
    uncheckFacultySession,
    getFacultyDirectory,
    getAcademicDocuments,
    uploadAcademicDocument,
    deleteAcademicDocument,
    getLiveClassEvaluations,
    submitLiveClassEvaluation,
    getPendingFacultyLogs,
    verifyFacultyLog,
    getExamAnalytics,
    editFaculty,
    getFacultyEditHistory,
    getAllFacultyEditHistory,
    deleteFaculty,
    editStudent,
    deleteStudent,
    getStudentById,
    getStudents,
    getMentors,
    editMentor,
    deleteMentor,
    saveExamPlan,
    getLiveMonitoring,
    getAvailableFaculties,
    getStaff,
    syncLegacyData,
    getAcademicSchedule,
    getAHParentInteractions,
    createAHParentInteraction,
    getAHFacultyInteractions,
    createAHFacultyInteraction,
    getAHParentMeetings,
    scheduleAHParentMeeting,
    reportAHParentMeeting,
    getDemoSchedules,
    createDemoSchedule,
    editDemoSchedule,
    deleteDemoSchedule,
    updateDemoEvaluation,
    getQualityAudits,
    generateQualityAudits,
    verifyQualityAudit,
    markLiveClassFeedbacksRead,
    forceSync,
    deduplicateStudents,
    getExamScores,
    addExamScore,
    getFacultyPerformance,
    saveFacultyPerformance,
    toggleDemoSuccess,
    getNextDemoId
} = require('../controllers/aoeController');

// Debug route
const { getDailyUpdates } = require('../controllers/sscController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All routes require academic_operation_executive role
router.use(requireAuth);
router.use(requireRole('academic_operation_executive', 'super_admin', 'academic_head'));

router.get('/dashboard', getDashboardStats);
router.get('/academic-schedule', getAcademicSchedule);
router.get('/exam-analytics', getExamAnalytics);
router.get('/actions', getAcademicActions);
router.get('/faculties', getFacultyDirectory);
router.get('/documents', getAcademicDocuments);
router.post('/documents', uploadAcademicDocument);
router.delete('/documents/:id', deleteAcademicDocument);
router.get('/faculty-activity-logs', getAllFacultyActivity);
router.get('/student-logs', getStudentInteractionLogs);
router.get('/faculty-logs', getFacultyInteractionLogs);
router.get('/faculty-checks', getDailyFacultyChecks);
router.post('/sessions/:sessionId/check', checkFacultySessionToday);
router.delete('/sessions/:sessionId/uncheck', uncheckFacultySession);

// Academic Quality Audits (Rotating Logic)
router.get('/quality-audits', getQualityAudits);
router.post('/quality-audits/generate', generateQualityAudits);
router.put('/quality-audits/:id/verify', verifyQualityAudit);
router.get('/dropdowns', getDropdownData);
router.get('/available-faculties', getAvailableFaculties);
router.post('/force-sync', forceSync);
router.post('/register-student', registerStudent);
router.post('/register-faculty', registerFaculty);
router.post('/register-ssc', registerSSC);

// Checking Section
router.get('/live-class-evaluations', getLiveClassEvaluations);
router.post('/live-class-evaluations', submitLiveClassEvaluation);
router.post('/exams/plan', saveExamPlan);
router.get('/faculty-logs-pending', getPendingFacultyLogs);
router.put('/faculty-logs/:id/verify', verifyFacultyLog);
router.post('/deduplicate-students', deduplicateStudents);
router.get('/exam-scores', getExamScores);
router.post('/exam-scores', addExamScore);

// New Management Routes
router.get('/faculty-history', getAllFacultyEditHistory);
router.get('/students/:id', getStudentById);
router.put('/faculties/:id', editFaculty);
router.get('/faculties/:id/history', getFacultyEditHistory);
router.delete('/faculties/:id', deleteFaculty);
router.put('/students/:id', editStudent);
router.delete('/students/:id', deleteStudent);

// Management Lists
// Daily Updates
router.get('/daily-updates', getDailyUpdates);

// Students
router.post('/students', registerStudent);
router.get('/students-all', getStudents);
router.get('/students', getStudents);
router.get('/mentors-all', getMentors);
router.get('/staff', getStaff);
router.get('/live-monitoring', getLiveMonitoring);
router.put('/mentors/:id', editMentor);
router.delete('/mentors/:id', deleteMentor);
router.post('/sync-legacy-data', syncLegacyData);

// Interactions & Meetings
router.get('/parent-interactions', getAHParentInteractions);
router.post('/parent-interactions', createAHParentInteraction);
router.get('/faculty-interactions', getAHFacultyInteractions);
router.post('/faculty-interactions', createAHFacultyInteraction);
router.get('/parent-meetings', getAHParentMeetings);
router.post('/parent-meetings', scheduleAHParentMeeting);
router.put('/parent-meetings/:id/report', reportAHParentMeeting);

// Demo Schedules
router.get('/demo-schedules', getDemoSchedules);
router.get('/demo-schedules/next-id', getNextDemoId);
router.post('/demo-schedules', createDemoSchedule);
router.put('/demo-schedules/:id', editDemoSchedule);
router.delete('/demo-schedules/:id', deleteDemoSchedule);
router.put('/demo-schedules/:id/evaluate', updateDemoEvaluation);
router.put('/demo-schedules/:id/toggle-success', toggleDemoSuccess);
router.post('/demo-schedules/fix-ids', require('../controllers/aoeController').fixDemoIds);

// Faculty Performance Index
router.get('/faculty-performance', getFacultyPerformance);
router.post('/faculty-performance', saveFacultyPerformance);

module.exports = router;

// Get faculty change history
router.get('/students/:id/faculty-history', getFacultyChangeHistory);
