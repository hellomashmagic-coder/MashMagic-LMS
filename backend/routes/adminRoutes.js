const express = require('express');
const router = express.Router();
const { getFacultyChangeHistory } = require('../controllers/facultyHistoryController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getDailyHours } = require('../controllers/mentorController');
const { getDailyUpdates } = require('../controllers/sscController');
const { getFees, saveFee } = require('../controllers/feeController');
const {
    getAdminDashboardSummary,
    getUsers,
    getUserById,
    approveUser,
    blockUser,
    deleteUser,
    getAllStudentLogs,
    getAllFacultyLogs,
    getPendingUsers,
    rejectUser,
    getDailyMentorHeadReport,
    getAdminNotifications,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
    getAllStudentsForAdmin,
    getAllMentorsForAdmin,
    getAllFacultiesForAdmin,
    getFacultyDetailsForAdmin,
    getStaffMembers,
    getSubAdmins,
    createSubAdmin,
    updateSubAdmin,
    deleteSubAdmin,
    updateStudentForAdmin,
    updateUserForAdmin,
    getExamAnalytics,
    getMentorDistribution,
    getTaskAnalytics,
    getLiveMonitoring,
    getStudentPortalLogins,
    getStudentExamsForAdmin,
    getAcademicSchedule,
    addStudentInstallment,
    getStudentDetailsForAdmin,
    getAHParentInteractions,
    getAHFacultyInteractions,
    getAHParentMeetings,
    getFacultyTimetable,
    addFacultyTimetableSlot,
    removeFacultyTimetableSlot,
    getAvailableFacultiesForSubject,
    getAvailableSlotsForFaculty,
    getStudentSchedules,
    healthCheck,
    getEvidence,
    getIntegrityReport
} = require('../controllers/adminController');

const { updateInteractionLog, getInteractionHistory } = require('../controllers/mentorHeadController');

router.use(requireAuth);

router.get('/student-portal-logins', requireRole('super_admin', 'sub_admin'), getStudentPortalLogins);
router.get('/academic-schedule', requireRole('super_admin', 'sub_admin'), getAcademicSchedule);

// General view access for admin and super_admin
router.get('/dashboard-summary', requireRole('super_admin', 'sub_admin'), getAdminDashboardSummary);
router.get('/pending-users', requireRole('super_admin', 'sub_admin'), getPendingUsers);
router.get('/users', requireRole('super_admin', 'sub_admin'), getUsers);
router.get('/restore-missing-students', async (req, res) => {
    try {
        const db = require('../config/db');
        let logs = [];
        // 1. Re-insert missing students from the users table
        const [missingUsers] = await db.query(`
            SELECT * FROM users 
            WHERE role = 'student' 
            AND id NOT IN (SELECT user_id FROM students WHERE user_id IS NOT NULL)
        `);
        
        let restored = 0;
        for (const u of missingUsers) {
            await db.query(`
                INSERT INTO students (user_id, name, email, contact, status)
                VALUES (?, ?, ?, ?, ?)
            `, [u.id, u.name, u.email, u.phone_number, u.status]);
            restored++;
        }
        logs.push(`Re-inserted ${restored} missing students from users table.`);
        
        // 2. Fix completely corrupted students (like multiple Joel Johnsons) by matching their ORIGINAL unique contact number
        const [allStudents] = await db.query(`SELECT id, name, contact, user_id FROM students WHERE contact IS NOT NULL AND contact != ''`);
        let nameFixed = 0;
        for (const j of allStudents) {
            // Find the real user who has this exact phone number
            const [u] = await db.query(`SELECT id, name FROM users WHERE phone_number = ? AND role = 'student' LIMIT 1`, [j.contact]);
            
            if (u.length > 0 && (u[0].name !== j.name || u[0].id !== j.user_id)) {
                await db.query(`UPDATE students SET name = ?, user_id = ? WHERE id = ?`, [u[0].name, u[0].id, j.id]);
                logs.push(`Fixed corrupted student ID ${j.id}: Name was '${j.name}', now properly matched to '${u[0].name}' using phone number.`);
                nameFixed++;
            }
        }
        logs.push(`Restored ${nameFixed} corrupted names in students table.`);
        res.json({ success: true, message: "Restoration Complete", details: logs });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
router.get('/students', requireRole('super_admin', 'sub_admin'), getAllStudentsForAdmin);
router.get('/student-details/:id', requireRole('super_admin', 'sub_admin'), getStudentDetailsForAdmin);
router.get('/students/:id/exams', requireRole('super_admin', 'sub_admin'), getStudentExamsForAdmin);
router.get('/mentors', requireRole('super_admin', 'sub_admin'), getAllMentorsForAdmin);
router.get('/faculties', requireRole('super_admin', 'sub_admin'), getAllFacultiesForAdmin);
router.get('/faculties/:id/details', requireRole('super_admin', 'sub_admin'), getFacultyDetailsForAdmin);
router.get('/staff', requireRole('super_admin', 'sub_admin'), getStaffMembers);
router.get('/users/:id', requireRole('super_admin', 'sub_admin'), getUserById);
router.get('/student-logs', requireRole('super_admin', 'sub_admin'), getAllStudentLogs);
router.get('/faculty-logs', requireRole('super_admin', 'sub_admin'), getAllFacultyLogs);
router.get('/mentor-head-report', requireRole('super_admin', 'sub_admin'), getDailyMentorHeadReport);
router.get('/exam-analytics', requireRole('super_admin', 'sub_admin'), getExamAnalytics);
router.get('/mentor-distribution', requireRole('super_admin', 'sub_admin'), getMentorDistribution);
router.get('/task-analytics', requireRole('super_admin', 'sub_admin'), getTaskAnalytics);
router.get('/live-monitoring', requireRole('super_admin', 'sub_admin'), getLiveMonitoring);

router.put('/interactions/:source/:id', requireRole('super_admin', 'sub_admin', 'mentor_head', 'mentor'), updateInteractionLog);
router.get('/interactions/:source/:id/history', requireRole('super_admin', 'sub_admin', 'mentor_head', 'mentor'), getInteractionHistory);

// View AH Interactions & Meetings
router.get('/ah-parent-interactions', requireRole('super_admin', 'sub_admin'), getAHParentInteractions);
router.get('/ah-faculty-interactions', requireRole('super_admin', 'sub_admin'), getAHFacultyInteractions);
router.get('/ah-parent-meetings', requireRole('super_admin', 'sub_admin'), getAHParentMeetings);

// Daily Updates
router.get('/daily-updates', requireRole('super_admin', 'sub_admin'), getDailyUpdates);

// Management & Action routes
router.put('/reject/:id', requireRole('super_admin', 'sub_admin'), rejectUser);
router.put('/approve/:id', requireRole('super_admin', 'sub_admin'), approveUser);
router.put('/block/:id', requireRole('super_admin', 'sub_admin'), blockUser);
router.put('/users/:id', requireRole('super_admin', 'sub_admin'), updateUserForAdmin);
router.put('/students/:id', requireRole('super_admin', 'sub_admin'), updateStudentForAdmin);
router.post('/students/:id/installments', requireRole('super_admin', 'sub_admin'), addStudentInstallment);

// Health Check & Integrity
router.get('/health-check', requireRole('super_admin'), healthCheck);
router.get('/integrity-report', requireRole('super_admin'), getIntegrityReport);
router.get('/evidence', getEvidence);

// Fees Management
router.get('/fees/:entity_type', requireRole('super_admin', 'sub_admin'), getFees);
router.post('/fees', requireRole('super_admin', 'sub_admin'), saveFee);

// Notifications (Super Admin, Sub Admin & Mentor Head)
router.get('/notifications', requireRole('super_admin', 'sub_admin', 'mentor_head'), getAdminNotifications);
router.put('/notifications/:id/read', requireRole('super_admin', 'sub_admin', 'mentor_head'), markNotificationRead);
router.delete('/notifications/:id', requireRole('super_admin', 'sub_admin', 'mentor_head'), deleteNotification);
router.delete('/notifications/clear-all', requireRole('super_admin', 'sub_admin', 'mentor_head'), clearAllNotifications);

// Super Admin ONLY actions
router.use(requireRole('super_admin'));
router.delete('/delete/:id', deleteUser);

// Sub Admin management
router.get('/sub-admins', getSubAdmins);
router.post('/sub-admins', createSubAdmin);
router.put('/sub-admins/:id', updateSubAdmin);
router.delete('/sub-admins/:id', deleteSubAdmin);

// Log Routes
router.get('/student-logs-full', getAllStudentLogs);
router.get('/faculty-logs-full', getAllFacultyLogs);
router.get('/daily-hours/:studentId', getDailyHours);
// Scheduling System Routes
router.get('/faculty-timetable', requireRole('super_admin', 'sub_admin', 'mentor_head'), getFacultyTimetable);
router.post('/faculty-timetable', requireRole('super_admin', 'sub_admin', 'mentor_head'), addFacultyTimetableSlot);
router.delete('/faculty-timetable/:id', requireRole('super_admin', 'sub_admin', 'mentor_head'), removeFacultyTimetableSlot);
router.get('/available-faculties', requireRole('super_admin', 'sub_admin', 'mentor_head'), getAvailableFacultiesForSubject);
router.get('/faculty-available-slots/:facultyId', requireRole('super_admin', 'sub_admin', 'mentor_head'), getAvailableSlotsForFaculty);
router.get('/student-schedules', requireRole('super_admin', 'sub_admin', 'mentor_head'), getStudentSchedules);

module.exports = router;

// Get faculty change history
router.get('/students/:id/faculty-history', getFacultyChangeHistory);
