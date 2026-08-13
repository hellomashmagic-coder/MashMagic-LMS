const db = require('../config/db');
const path = require('path');
const { logFacultyChanges } = require('../utils/facultyChangeLogger');

// Helper: write to audit_logs table
async function logAudit({ action, entity = 'timetable', entity_id = null, user_id = null, user_role = null, old_data = null, new_data = null, details = null }) {
    try {
        await db.query(
            'INSERT INTO audit_logs (action, entity, entity_id, user_id, user_role, old_data, new_data, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [action, entity, entity_id, user_id, user_role, old_data ? JSON.stringify(old_data) : null, new_data ? JSON.stringify(new_data) : null, details]
        );
    } catch (e) { /* non-blocking */ }
}

const convertTo24Hour = (timeStr) => {
    if (!timeStr) return null;
    timeStr = timeStr.trim().toLowerCase();
    
    // If it is already in HH:MM:SS or HH:MM 24-hour format
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
        let hrs = parseInt(match24[1], 10);
        let mins = parseInt(match24[2], 10);
        let secs = match24[3] ? parseInt(match24[3], 10) : 0;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Match 12-hour format with AM/PM (e.g. "8:00 pm", "10:30 am", "8 pm")
    const match12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (match12) {
        let hrs = parseInt(match12[1], 10);
        let mins = match12[2] ? parseInt(match12[2], 10) : 0;
        const ampm = match12[3];

        if (ampm === 'pm' && hrs < 12) {
            hrs += 12;
        } else if (ampm === 'am' && hrs === 12) {
            hrs = 0;
        }
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
    }

    return timeStr;
};

// @desc    Get mentor dashboard stats
// @route   GET /api/mentor/dashboard
const getMentorDashboard = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const role = req.user.role;

        // Helper to run query safely
        const safeQuery = async (query, params, label) => {
            try {
                const [result] = await db.query(query, params);
                return result;
            } catch (err) {
                console.error(`[Dashboard Error] ${label}:`, err.message);
                return [];
            }
        };

        if (role === 'ssc') {
            const studentCount = await safeQuery('SELECT COUNT(*) as count FROM students WHERE status != "rejected"', [], 'ssc_studentCount');
            const totalCount = await safeQuery('SELECT COUNT(*) as count FROM students', [], 'ssc_totalCount');
            const mentorCount = await safeQuery('SELECT COUNT(*) as count FROM users WHERE role = "mentor" AND status = "active"', [], 'ssc_mentorCount');
            const onboardedCount = await safeQuery('SELECT COUNT(*) as count FROM students WHERE onboarding_status = "completed"', [], 'ssc_onboardedCount');
            const pendingCount = await safeQuery('SELECT COUNT(*) as count FROM students WHERE onboarding_status = "pending"', [], 'ssc_pendingCount');

            const activeStudents = studentCount[0]?.count || 0;
            const mentorsSyncing = mentorCount[0]?.count || 0;
            const onboarded = onboardedCount[0]?.count || 0;
            const total = totalCount[0]?.count || 0;
            const pendingReviews = pendingCount[0]?.count || 0;

            const successRate = total > 0 ? `${((onboarded / total) * 100).toFixed(0)}%` : '0%';

            const recentInteractions = await safeQuery(`
                SELECT sil.created_at, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT('Quick' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(sil.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as remarks
                FROM student_interaction_logs sil
                JOIN students s ON sil.student_id = s.id
                ORDER BY sil.created_at DESC LIMIT 5
            `, [], 'ssc_recentInteractions');

            return res.status(200).json({
                success: true,
                data: {
                    activeStudents,
                    mentorsSyncing,
                    successRate,
                    pendingReviews,
                    recentInteractions
                }
            });
        }

        const hideTuitionOnly = ['mentor', 'mentor_head'].includes(req.user.role);
        const enrollmentCondition = hideTuitionOnly ? "AND (LOWER(enrollment_type) LIKE '%mentorship%' OR LOWER(enrollment_type) = 'both')" : "";

        const studentCount = await safeQuery(`SELECT COUNT(*) as count FROM students WHERE mentor_id = ? AND status NOT IN ('rejected', 'inactive') AND course_completed = 0 AND mentorship_completed = 0 ${enrollmentCondition}`, [mentorId], 'studentCount');
        const sessionCount = await safeQuery('SELECT COUNT(*) as count FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND mentor_id = ?', [mentorId], 'sessionCount');
        const pendingTasks = await safeQuery('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status != "Completed"', [mentorId], 'pendingTasks');
        const completedTasks = await safeQuery('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = "Completed"', [mentorId], 'completedTasks');
        const studentLogsCount = await safeQuery('SELECT COUNT(*) as count FROM student_interaction_logs WHERE mentor_id = ?', [mentorId], 'studentLogsCount');

        const sessionStats = await safeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND mentor_id = ? AND status = 'Completed') as completed_sessions,
                (SELECT COUNT(*) FROM student_interaction_logs WHERE mentor_id = ?) as student_verified_sessions
        `, [mentorId, mentorId], 'sessionStats');

        const recentInteractions = await safeQuery(`
            SELECT * FROM (
                (SELECT sil.created_at, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT('Quick' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(sil.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as remarks, sil.self_clarity, sil.confidence
                 FROM student_interaction_logs sil
                 JOIN students s ON sil.student_id = s.id
                 WHERE sil.mentor_id = ?)
                UNION ALL
                (SELECT msl.created_at, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT('Session' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(CONCAT(msl.main_issue, ': ', msl.action_type) USING utf8mb4) COLLATE utf8mb4_unicode_ci as remarks, msl.understanding_after_session as self_clarity, msl.session_quality_rating as confidence
                 FROM mentor_session_logs msl
                 JOIN students s ON msl.student_id = s.id
                 WHERE msl.mentor_id = ?)
                UNION ALL
                (SELECT msr.created_at, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(msr.session_type USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.notes')) USING utf8mb4) COLLATE utf8mb4_unicode_ci as remarks, NULL as self_clarity, NULL as confidence
                 FROM mentor_session_reports msr
                 JOIN students s ON msr.student_id = s.id
                 WHERE msr.mentor_id = ?)
                UNION ALL
                (SELECT ml.created_at, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT('Mentorship' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(ml.action_details USING utf8mb4) COLLATE utf8mb4_unicode_ci as remarks, NULL as self_clarity, NULL as confidence
                 FROM mentorship_logs ml
                 JOIN students s ON ml.student_id = s.id
                 WHERE ml.mentor_id = ?)
            ) as interactions
            ORDER BY created_at DESC LIMIT 10
        `, [mentorId, mentorId, mentorId, mentorId], 'recentInteractions');

        const liveSessions = await safeQuery(`
            SELECT DISTINCT fs.id, fs.faculty_id, fs.topic, fs.date, fs.start_time, fs.end_time, fs.status, u.name as faculty_name, 1 as is_live, s.meeting_link, s.registration_number, s.name as student_name
            FROM faculty_sessions fs
            JOIN faculties u ON fs.faculty_id = u.id
            JOIN session_attendance sa ON fs.id = sa.session_id
            JOIN students s ON sa.student_id = s.id
            WHERE s.mentor_id = ? AND fs.date = CURDATE() AND CURTIME() BETWEEN fs.start_time AND fs.end_time
            ORDER BY fs.start_time ASC
        `, [mentorId], 'liveSessions');

        const upcomingSessions = await safeQuery(`
            SELECT DISTINCT fs.id, fs.faculty_id, fs.topic, fs.date, fs.start_time, fs.end_time, fs.status, u.name as faculty_name, 0 as is_live
            FROM faculty_sessions fs
            JOIN faculties u ON fs.faculty_id = u.id
            JOIN session_attendance sa ON fs.id = sa.session_id
            JOIN students s ON sa.student_id = s.id
            WHERE s.mentor_id = ? AND ((fs.date = CURDATE() AND fs.start_time > CURTIME()) OR fs.date > CURDATE())
            ORDER BY fs.date ASC, fs.start_time ASC
            LIMIT 10
        `, [mentorId], 'upcomingSessions');

        const pastSessions = await safeQuery(`
            SELECT DISTINCT fs.id, fs.faculty_id, fs.topic, fs.date, fs.start_time, fs.end_time, fs.status, u.name as faculty_name, 0 as is_live
            FROM faculty_sessions fs
            JOIN faculties u ON fs.faculty_id = u.id
            JOIN session_attendance sa ON fs.id = sa.session_id
            JOIN students s ON sa.student_id = s.id
            WHERE s.mentor_id = ? AND ((fs.date = CURDATE() AND fs.end_time < CURTIME()) OR fs.date < CURDATE())
            ORDER BY fs.date DESC, fs.end_time DESC
            LIMIT 10
        `, [mentorId], 'pastSessions');

        res.status(200).json({
            success: true,
            data: {
                totalStudents: studentCount[0]?.count || 0,
                totalSessions: sessionCount[0]?.count || 0,
                pendingTasks: pendingTasks[0]?.count || 0,
                completedTasks: completedTasks[0]?.count || 0,
                totalStudentInteractions: studentLogsCount[0]?.count || 0,
                audit: sessionStats[0] || { completed_sessions: 0, student_verified_sessions: 0 },
                recentInteractions,
                liveSessions,
                upcomingSessions,
                pastSessions
            }
        });
    } catch (error) {
        console.error("FATAL DASHBOARD ERROR:", error);
        res.status(500).json({ success: false, message: "Internal Dashboard Error" });
    }
};

// @desc    Get assigned students
// @route   GET /api/mentor/students
const getMentorStudents = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const isPrivileged = ['super_admin', 'admin', 'mentor_head', 'academic_head', 'academic_operation_executive', 'ssc'].includes(req.user.role);
        
        const { search, page, limit, viewMode, sortBy } = req.query;

        let whereConditions = `s.status NOT IN ('rejected', 'inactive') AND s.course_completed = 0 AND s.mentorship_completed = 0
            AND (LOWER(s.enrollment_type) LIKE '%mentorship%' OR LOWER(s.enrollment_type) = 'both')`;
            
        let params = [];

        if (!isPrivileged) {
            whereConditions += ' AND s.mentor_id = ?';
            params.push(mentorId);
        }

        if (search) {
            whereConditions += ' AND (s.name LIKE ? OR s.registration_number LIKE ? OR s.course LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (viewMode === 'new') {
            whereConditions += ' AND s.onboarding_status = "completed"';
            whereConditions += ` AND (SELECT COUNT(*) FROM timetable mt WHERE (mt.is_deleted IS NULL OR mt.is_deleted = 0) AND mt.student_id = s.id AND mt.status != 'Cancelled') < 5`;
        }

        let orderByClause = 'ORDER BY s.created_at DESC';
        if (sortBy === 'name_asc') orderByClause = 'ORDER BY s.name ASC';
        else if (sortBy === 'name_desc') orderByClause = 'ORDER BY s.name DESC';
        else if (sortBy === 'join_oldest') orderByClause = 'ORDER BY s.created_at ASC';

        let query = `
            SELECT s.*, 
            m.name as mentor_name,
            COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') 
                 FROM faculty_schedules fs JOIN faculties u ON fs.faculty_id = u.id WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id),
                s.faculty_name
            ) as faculty_names,
            (SELECT COUNT(*) FROM timetable mt WHERE (mt.is_deleted IS NULL OR mt.is_deleted = 0) AND mt.student_id = s.id AND mt.status != 'Cancelled') as session_count,
            CASE WHEN EXISTS (
                SELECT 1 FROM student_interaction_logs sil 
                WHERE sil.student_id = s.id AND sil.date = CURDATE() AND sil.connected_today = TRUE
            ) THEN 1 ELSE 0 END as connected_today,
            s.onboarding_status
            FROM students s 
            LEFT JOIN mentors m ON s.mentor_id = m.id
            WHERE ${whereConditions}
            ${orderByClause}
        `;

        let total = 0;
        let responseData = { success: true };

        if (page) {
            const parsedPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || 50;
            const offset = (parsedPage - 1) * parsedLimit;
            
            const countQuery = `SELECT COUNT(*) as total FROM students s WHERE ${whereConditions}`;
            const [countRows] = await db.query(countQuery, params);
            total = countRows[0].total;

            query += ' LIMIT ? OFFSET ?';
            params.push(parsedLimit, offset);
            
            responseData.total = total;
            responseData.totalPages = Math.ceil(total / parsedLimit);
            responseData.currentPage = parsedPage;
        }

        const [rows] = await db.query(query, params);
        
        const { calculateStudentHours } = require('../utils/studentHoursHelper');
        const augmentedRows = await calculateStudentHours(rows, db);

        responseData.data = augmentedRows;
        if (!page) responseData.count = augmentedRows.length;

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student details
// @route   GET /api/mentor/students/:id
const getStudentDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const studentId = req.params.id;

        const isPrivileged = ['super_admin', 'admin', 'sub_admin', 'mentor_head', 'academic_head', 'academic_operation_executive', 'aoe', 'ssc'].includes(userRole);
        
        let queryStr = `
            SELECT s.*, m.name as mentor_name, 
            COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') 
                 FROM faculty_schedules fs JOIN faculties u ON fs.faculty_id = u.id WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id),
                s.faculty_name
            ) as faculty_name 
            FROM students s 
            LEFT JOIN mentors m ON s.mentor_id = m.id 
            WHERE s.id = ?
        `;
        let queryParams = [studentId];
        
        if (!isPrivileged) {
            if (userRole === 'faculty') {
                queryStr += ` AND (s.faculty_id = ? OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?))`;
                queryParams.push(userId, userId);
            } else {
                queryStr += ` AND s.mentor_id = ?`;
                queryParams.push(userId);
            }
        }

        const [student] = await db.query(queryStr, queryParams);

        if (!student.length) {
            return res.status(404).json({ success: false, message: req.user.role === 'ssc' ? "Student not found" : "Student not found or not assigned to you" });
        }

        const [timetable] = await db.query('SELECT * FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ? ORDER BY date ASC, start_time ASC', [studentId]);
        
        let studentLogs = [];
        try {
            const [logs] = await db.query(`
                SELECT * FROM (
                    SELECT 
                        sil.id, sil.date, 
                        CONVERT(sil.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as details, 
                        CONVERT('Quick Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, 
                        sil.created_at
                    FROM student_interaction_logs sil 
                    WHERE sil.student_id = ?
                    
                    UNION ALL
                    
                    SELECT 
                        msl.id, DATE(msl.created_at) as date, 
                        CONVERT(CONCAT(msl.main_issue, ': ', msl.action_type) USING utf8mb4) COLLATE utf8mb4_unicode_ci as details, 
                        CONVERT('Session Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, 
                        msl.created_at
                    FROM mentor_session_logs msl
                    WHERE msl.student_id = ?

                    UNION ALL

                    SELECT 
                        msr.id, DATE(msr.created_at) as date, 
                        CONVERT(COALESCE(
                            JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.notes')), 
                            JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.action_plan')),
                            JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.next_task')),
                            JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.study_status')),
                            JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.main_problem')),
                            msr.session_type
                        ) USING utf8mb4) COLLATE utf8mb4_unicode_ci as details, 
                        CONVERT(CONCAT('Hub: ', msr.session_type) USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, 
                        msr.created_at
                    FROM mentor_session_reports msr
                    WHERE msr.student_id = ?

                    UNION ALL

                    SELECT 
                        ml.id, DATE(ml.created_at) as date, 
                        CONVERT(ml.action_details USING utf8mb4) COLLATE utf8mb4_unicode_ci as details, 
                        CONVERT('Mentorship' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, 
                        ml.created_at
                    FROM mentorship_logs ml
                    WHERE ml.student_id = ?
                ) as combined_logs
                ORDER BY created_at DESC
            `, [studentId, studentId, studentId, studentId]);
            studentLogs = logs;
        } catch (logErr) {
            console.error("LOG_QUERY_ERROR:", logErr);
            // If UNION fails, try with minimal columns and conversion
            const [logs] = await db.query(`
                SELECT * FROM (
                    SELECT sil.id, sil.date, CONVERT(sil.mentor_notes USING utf8mb4) as details, CONVERT('Quick Log' USING utf8mb4) as type, sil.created_at
                    FROM student_interaction_logs sil 
                    WHERE sil.student_id = ?
                    
                    UNION ALL
                    
                    SELECT l.id, DATE(l.created_at) as date, CONVERT(CONCAT(l.main_issue, ': ', l.action_type) USING utf8mb4) as details, CONVERT('Session Log' USING utf8mb4) as type, l.created_at
                    FROM mentor_session_logs l
                    WHERE l.student_id = ?

                    UNION ALL

                    SELECT msr.id, DATE(msr.created_at) as date, CONVERT(JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.notes')) USING utf8mb4) as details, CONVERT(CONCAT('Hub: ', msr.session_type) USING utf8mb4) as type, msr.created_at
                    FROM mentor_session_reports msr
                    WHERE msr.student_id = ?
                ) as combined_logs
                ORDER BY created_at DESC
            `, [studentId, studentId, studentId]);
            studentLogs = logs;
        }

        const [mentorshipLogs] = await db.query(`
            SELECT
                id,
                DATE(created_at) AS session_date,
                main_issue,
                secondary_issue,
                weak_subject,
                action_type,
                action_detail AS action_details,
                IF(followup_required = 1, TRUE, FALSE) AS follow_up_required,
                followup_date AS follow_up_date,
                'Medium' AS priority,
                student_status,
                previous_task_status,
                understanding_after_session,
                session_quality_rating,
                created_at
            FROM mentor_session_logs
            WHERE student_id = ? ${isPrivileged ? '' : 'AND mentor_id = ?'}
            ORDER BY created_at DESC
        `, isPrivileged ? [studentId] : [studentId, userId]);

        const [dailyUpdates] = await db.query(`
            SELECT *, 
            DATE_FORMAT(registration_date, '%d-%m-%Y') as formatted_date,
            DATE_FORMAT(registration_time, '%l:%i %p') as formatted_time
            FROM student_daily_updates 
            WHERE student_id = ? 
            ORDER BY registration_date DESC, registration_time DESC
        `, [studentId]);

        const [marks] = await db.query('SELECT * FROM student_marks WHERE student_id = ? ORDER BY created_at DESC', [studentId]);

        const [attendance] = await db.query(`
            SELECT a.*, s.topic, s.date 
            FROM session_attendance a
            JOIN faculty_sessions s ON a.session_id = s.id
            WHERE a.student_id = ?
            ORDER BY s.date DESC
        `, [studentId]);

        const [installments] = await db.query(`
            SELECT id, amount, payment_date, notes, created_at
            FROM student_installments
            WHERE student_id = ?
            ORDER BY payment_date DESC, created_at DESC
        `, [studentId]);

        res.status(200).json({
            success: true,
            data: {
                ...student[0],
                timetable,
                studentLogs,
                mentorshipLogs,
                dailyUpdates,
                marks,
                attendance,
                installments
            }
        });
    } catch (error) {
        console.error("GET_STUDENT_DETAILS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get mentor tasks
// @route   GET /api/mentor/tasks
const getMentorTasks = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const [rows] = await db.query(`
            SELECT t.*, u.name as assigner_name, u.role as assigner_role 
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_by = u.id 
            WHERE t.assigned_to = ? 
            ORDER BY t.created_at DESC
        `, [mentorId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complete mentor task
// @route   PUT /api/mentor/tasks/:id/complete
const processMentorTaskCompletion = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const taskId = req.params.id;
        const proof_url = req.file ? req.file.path : null;

        const [result] = await db.query(
            'UPDATE tasks SET status = "Completed", proof_url = ?, completed_at = NOW() WHERE id = ? AND assigned_to = ?',
            [proof_url, taskId, mentorId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        res.status(200).json({ success: true, message: "Task marked as completed with proof" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get mentor timetable with filters and summary
// @route   GET /api/mentor/timetable
const getMentorTimetable = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { student_id, mentor_id, status, start_date, end_date } = req.query;

        let query = `
            SELECT t.*, s.name as student_name 
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (req.user.role === 'mentor') {
            query += ' AND t.mentor_id = ?';
            params.push(mentorId);
        } else if (mentor_id) {
            query += ' AND t.mentor_id = ?';
            params.push(mentor_id);
        }

        if (student_id) {
            query += ' AND t.student_id = ?';
            params.push(student_id);
        }
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (start_date && end_date) {
            query += ' AND t.date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        } else if (start_date) {
            query += ' AND t.date >= ?';
            params.push(start_date);
        } else if (end_date) {
            query += ' AND t.date <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY t.date DESC, t.start_time DESC';

        const [rows] = await db.query(query, params);

        // Calculate summary
        const summary = {
            total: rows.length,
            completed: rows.filter(r => r.status === 'Completed').length,
            cancelled: rows.filter(r => r.status === 'Cancelled').length,
            postponed: rows.filter(r => r.status === 'Postponed').length,
            upcoming: rows.filter(r => r.status === 'Scheduled').length,
            noShow: rows.filter(r => r.status === 'No Show').length
        };

        res.status(200).json({ success: true, data: rows, summary });
    } catch (error) {
        console.error("TIMETABLE_API_ERR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const recalculateSessionNumbers = async (studentId, connectionObj = db) => {
    try {
        const [sessions] = await connectionObj.query(
            'SELECT id, status FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ? ORDER BY date ASC, start_time ASC',
            [studentId]
        );
        for (let i = 0; i < sessions.length; i++) {
            await connectionObj.query(
                'UPDATE timetable SET session_number = ? WHERE id = ?',
                [i + 1, sessions[i].id]
            );
        }
    } catch (error) {
        console.error("Error recalculating session numbers:", error);
    }
};

// @desc    Recalculate all session numbers for all students (Admin utility)
// @route   GET /api/mentor/recalculate-all
const recalculateAllSessionNumbers = async (req, res) => {
    try {
        const [students] = await db.query('SELECT id FROM students');
        for (let s of students) {
            await recalculateSessionNumbers(s.id);
        }
        res.status(200).json({ success: true, message: `Successfully recalculated session numbers for ${students.length} students.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new session
// @route   POST /api/mentor/timetable
const createSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const {
            student_id, date, start_time, end_time,
            chapter, session_type, status, status_reason, notes,
            faculty_id, faculty_name, session_mode, subject
        } = req.body;

        const formattedStartTime = convertTo24Hour(start_time);
        const formattedEndTime = convertTo24Hour(end_time);

        if (!faculty_id) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Please Add Faculty. Faculty is required to create a session." });
        }

        // Resolve student's actual mentor_id
        const [[studentObj]] = await connection.query('SELECT mentor_id FROM students WHERE id = ?', [student_id]);
        if (!studentObj) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Student not found" });
        }
        const targetMentorId = studentObj.mentor_id || null;

        // Duplicate Check using full business key
        const [existing] = await connection.query(
            'SELECT id FROM timetable WHERE student_id = ? AND faculty_id <=> ? AND subject <=> ? AND date = ? AND start_time = ? AND end_time = ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [student_id, faculty_id || null, subject || null, date, formattedStartTime, formattedEndTime]
        );
        if (existing.length > 0) {
            await connection.rollback();
            await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['DUPLICATE_TIMETABLE_PREVENTED', `Duplicate attempt for student ${student_id} on ${date}`, req.user.id, req.user.role]);
            return res.status(409).json({ success: false, message: "Duplicate timetable entry already exists for this slot." });
        }

        // 1. Conflict Check for Student
        const isTakingTime = !['Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show'].includes(status || 'Scheduled');
        if (isTakingTime) {
            const [studentConflicts] = await connection.query(`
                SELECT id FROM timetable 
                WHERE student_id = ? AND date = ? 
                AND status NOT IN ('Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show')
                AND (
                    (start_time < ? AND end_time > ?)
                ) AND (is_deleted IS NULL OR is_deleted = 0)
            `, [student_id, date, formattedEndTime, formattedStartTime]);

            if (studentConflicts.length > 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "Student has a time conflict with another session." });
            }

            // 2. Conflict Check for Faculty
            if (faculty_id) {
                const [facultyConflicts] = await connection.query(`
                    SELECT id FROM timetable 
                    WHERE faculty_id = ? AND date = ? 
                    AND status NOT IN ('Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show')
                    AND (
                        (start_time < ? AND end_time > ?)
                    ) AND (is_deleted IS NULL OR is_deleted = 0)
                `, [faculty_id, date, formattedEndTime, formattedStartTime]);

                if (facultyConflicts.length > 0) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: "Faculty has a time conflict with another session." });
                }
            }
        }

        let finalFacultyName = faculty_name || null;
        if (faculty_id) {
            const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [faculty_id]);
            if (facObj) finalFacultyName = facObj.name;
        }

        const session_number = 0;
        const start = new Date(`1970-01-01T${formattedStartTime}`);
        const end = new Date(`1970-01-01T${formattedEndTime}`);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        const duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

        const [result] = await connection.query(`
            INSERT INTO timetable (
                mentor_id, student_id, session_number, date, start_time, end_time,
                duration, chapter, subject, session_type, status, status_reason, notes, 
                faculty_id, faculty_name, session_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            targetMentorId, student_id, session_number, date, formattedStartTime, formattedEndTime,
            duration, chapter, subject || null, session_type, status || 'Scheduled', status_reason, notes,
            (faculty_id ? parseInt(faculty_id) : null), finalFacultyName, session_mode || 'Online'
        ]);

        // Post-Insert Save Verification
        const saveVerifier = require('../utils/saveVerifier');
        await saveVerifier.verifySave(connection, 'timetable', result.insertId, {
            student_id, date, start_time: formattedStartTime, end_time: formattedEndTime, subject: subject || null, faculty_id: faculty_id || null
        });

        // Referential Integrity Verification
        await saveVerifier.verifyReferentialIntegrity(connection, [
            { table: 'students', column: 'id', value: student_id },
            { table: 'users_or_faculties', column: 'id', value: faculty_id || null }
        ]);

        const { syncTimetableToFacultySession } = require('../utils/timetableSync');
        await syncTimetableToFacultySession(result.insertId, connection);
        
        await recalculateSessionNumbers(student_id, connection);

        await logAudit({
            action: 'CREATE_SESSION',
            entity_id: result.insertId,
            user_id: req.user.id,
            user_role: req.user.role,
            new_data: req.body,
            details: `Mentor created session for student ${student_id}`
        });

        await connection.commit();
        res.status(201).json({ success: true, message: "Session created successfully", id: result.insertId });
    } catch (error) {
        await connection.rollback();
        await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['CREATE_SESSION_FAILED', error.message, req.user?.id, req.user?.role]);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Update session
// @route   PUT /api/mentor/timetable/:id
const updateSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const sessionId = req.params.id;
        const {
            date, start_time, end_time,
            chapter, session_type, status, status_reason, notes,
            faculty_id, faculty_name, session_mode, subject
        } = req.body;

        if (!faculty_id) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Please Add Faculty. Faculty is required for all sessions." });
        }

        const formattedStartTime = convertTo24Hour(start_time);
        const formattedEndTime = convertTo24Hour(end_time);

        // Get existing session
        const [existing] = await connection.query('SELECT * FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND id = ?', [sessionId]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Session not found" });
        }
        const existingSession = existing[0];
        const targetMentorId = existingSession.mentor_id || null;

        if (loggedInUserRole === 'mentor' && targetMentorId !== loggedInUserId) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: "Not authorized to update this session" });
        }

        // Archive before update
        const { archiveTimetable } = require('../utils/archiver');
        await archiveTimetable(connection, existingSession.student_id, 'UPDATE_BEFORE', { id: req.user?.id, role: req.user?.role });

        // Duplicate Check using full business key
        const [existingDupe] = await connection.query(
            'SELECT id FROM timetable WHERE student_id = ? AND faculty_id <=> ? AND subject <=> ? AND date = ? AND start_time = ? AND end_time = ? AND id != ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [existingSession.student_id, faculty_id || null, subject || null, date, formattedStartTime, formattedEndTime, sessionId]
        );
        if (existingDupe.length > 0) {
            await connection.rollback();
            await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['DUPLICATE_TIMETABLE_PREVENTED', `Duplicate attempt during update for session ${sessionId}`, req.user?.id, req.user?.role]);
            return res.status(409).json({ success: false, message: "Duplicate timetable entry already exists for this slot." });
        }

        // Conflict checks only if the session is active and taking up time
        const isTakingTime = !['Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show'].includes(status || 'Scheduled');

        if (isTakingTime) {
            const [studentConflicts] = await connection.query(`
                SELECT id FROM timetable 
                WHERE student_id = ? AND date = ? AND id != ?
                AND status NOT IN ('Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show')
                AND (
                    (start_time < ? AND end_time > ?)
                ) AND (is_deleted IS NULL OR is_deleted = 0)
            `, [existingSession.student_id, date, sessionId, formattedEndTime, formattedStartTime]);

            if (studentConflicts.length > 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "Student has a time conflict with another session." });
            }

            if (faculty_id) {
                const [facultyConflicts] = await connection.query(`
                    SELECT id FROM timetable 
                    WHERE faculty_id = ? AND date = ? AND id != ?
                    AND status NOT IN ('Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show')
                    AND (
                        (start_time < ? AND end_time > ?)
                    ) AND (is_deleted IS NULL OR is_deleted = 0)
                `, [faculty_id, date, sessionId, formattedEndTime, formattedStartTime]);

                if (facultyConflicts.length > 0) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: "Faculty has a time conflict with another session." });
                }
            }
        }

        const start = new Date(`1970-01-01T${formattedStartTime}`);
        const end = new Date(`1970-01-01T${formattedEndTime}`);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        const duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

        let finalFacultyName = faculty_name || null;
        if (faculty_id) {
            const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [faculty_id]);
            if (facObj) finalFacultyName = facObj.name;
        }

        const [updateResult] = await connection.query(`
            UPDATE timetable 
            SET date = ?, start_time = ?, end_time = ?, duration = ?, chapter = ?, subject = ?,
                session_type = ?, status = ?, status_reason = ?, notes = ?,
                faculty_id = ?, faculty_name = ?, session_mode = ?
            WHERE id = ?
        `, [
            date, formattedStartTime, formattedEndTime, duration, chapter, subject || null,
            session_type, status, status_reason, notes,
            faculty_id || null, finalFacultyName, session_mode || 'Online',
            sessionId
        ]);

        if (updateResult.affectedRows === 0) {
            throw new Error("CRITICAL FAILURE: No records updated.");
        }

        // Save Verification
        const saveVerifier = require('../utils/saveVerifier');
        await saveVerifier.verifySave(connection, 'timetable', sessionId, {
            date, start_time: formattedStartTime, end_time: formattedEndTime, subject: subject || null, faculty_id: faculty_id || null
        });

        // Referential Integrity
        await saveVerifier.verifyReferentialIntegrity(connection, [
            { table: 'users_or_faculties', column: 'id', value: faculty_id || null }
        ]);

        const { syncTimetableToFacultySession } = require('../utils/timetableSync');
        await syncTimetableToFacultySession(sessionId, connection);
        
        await recalculateSessionNumbers(existingSession.student_id, connection);

        await logAudit({
            action: 'UPDATE_SESSION',
            entity_id: sessionId,
            user_id: req.user.id,
            user_role: req.user.role,
            old_data: existingSession,
            new_data: req.body,
            details: `Mentor updated session ${sessionId}`
        });

        await connection.commit();
        res.status(200).json({ success: true, message: "Session updated successfully" });
    } catch (error) {
        await connection.rollback();
        await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['UPDATE_SESSION_FAILED', error.message, req.user?.id, req.user?.role]);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Delete session
const deleteSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const sessionId = req.params.id;

        const [[sessionToDelete]] = await connection.query('SELECT mentor_id, student_id FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND id = ?', [sessionId]);
        if (!sessionToDelete) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (loggedInUserRole === 'mentor' && sessionToDelete.mentor_id !== loggedInUserId) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: "Not authorized to delete this session" });
        }

        // Archive before delete
        const { archiveTimetable } = require('../utils/archiver');
        await archiveTimetable(connection, sessionToDelete.student_id, 'DELETE_BEFORE', { id: req.user?.id, role: req.user?.role });

        const [result] = await connection.query('UPDATE timetable SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);

        if (result.affectedRows === 0) {
            throw new Error("CRITICAL FAILURE: No records marked as deleted.");
        }

        const { syncTimetableToFacultySession } = require('../utils/timetableSync');
        await syncTimetableToFacultySession(sessionId, connection);

        // GUARANTEED DIRECT DELETE: Explicitly soft-delete faculty_sessions linked to this timetable
        const [linkedSessions] = await connection.query(
            'SELECT id FROM faculty_sessions WHERE timetable_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [sessionId]
        );
        for (const linked of linkedSessions) {
            await connection.query(
                'UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
                [linked.id]
            );
            await connection.query(
                'UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
                [linked.id]
            );
        }

        // Verify: No active faculty_sessions should remain for this timetable_id
        const [remainCheck] = await connection.query(
            'SELECT COUNT(*) as cnt FROM faculty_sessions WHERE timetable_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [sessionId]
        );
        if (remainCheck[0].cnt > 0) {
            throw new Error(`CRITICAL FAILURE: ${remainCheck[0].cnt} faculty_session(s) still active after delete for timetable ${sessionId}`);
        }

        await recalculateSessionNumbers(sessionToDelete.student_id, connection);

        await logAudit({
            action: 'DELETE_SESSION',
            entity_id: sessionId,
            user_id: req.user.id,
            user_role: req.user.role,
            old_data: sessionToDelete,
            details: `Mentor deleted session ${sessionId}`
        });

        await connection.commit();
        res.status(200).json({ success: true, message: "Session deleted" });
    } catch (error) {
        await connection.rollback();
        await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['DELETE_SESSION_FAILED', error.message, req.user?.id, req.user?.role]);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Removed complete/cancel/postpone legacy routes in favor of unified updateSession

// @desc    Create student interaction log
// @route   POST /api/mentor/student-log
const createStudentLog = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const {
            student_id, date, connection_method,
            // Section 2
            self_clarity, confusing_topic, can_solve_independently,
            // Section 3
            homework_status, homework_difficulty, revision_quality,
            // Section 4
            confidence, motivation_level, exam_anxiety, focus_level,
            // Section 5
            student_requests, parent_update_priority, mentor_action_needed, mentor_notes, connected_today = false,
            screenshot_url = null
        } = req.body;

        if (!student_id || !date || !connection_method) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Validate numeric ranges
        if (self_clarity < 0 || self_clarity > 100) {
            return res.status(400).json({ success: false, message: "Self Clarity must be 0-100" });
        }
        if (confidence < 1 || confidence > 5) {
            return res.status(400).json({ success: false, message: "Confidence must be 1-5" });
        }

        // Auto-increment session number for this student
        const [maxSessionResult] = await db.query(
            'SELECT MAX(session_number) as max_sn FROM student_interaction_logs WHERE student_id = ?',
            [student_id]
        );
        const nextSessionNumber = (maxSessionResult[0].max_sn || 0) + 1;

        const query = `
            INSERT INTO student_interaction_logs (
                mentor_id, student_id, date, session_number,
                connection_method,
                self_clarity, confusing_topic, can_solve_independently,
                homework_status, homework_difficulty, revision_quality,
                confidence, motivation_level, exam_anxiety, focus_level,
                student_requests, parent_update_priority, mentor_action_needed, mentor_notes, connected_today,
                screenshot_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(query, [
            mentorId, student_id, date, nextSessionNumber,
            connection_method,
            self_clarity, confusing_topic, can_solve_independently,
            homework_status, homework_difficulty, revision_quality,
            confidence, motivation_level, exam_anxiety, focus_level,
            student_requests, parent_update_priority, mentor_action_needed, mentor_notes, connected_today,
            screenshot_url
        ]);

        // Notify Admin/Academic Head
        await db.query('INSERT INTO admin_notifications (message) VALUES (?)', [`Mentor (${req.user.name}) submitted a new Student Interaction Log for ${student_id}`]);

        res.status(201).json({ success: true, message: "Student interaction log saved successfully", session_number: nextSessionNumber });
    } catch (error) {
        console.error("Create Log Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get mentor student logs (Unified Audit for Mentor)
// @route   GET /api/mentor/student-logs
const getStudentLogs = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { student_id, startDate, endDate } = req.query;

        let whereClause = 'WHERE 1=1 AND s.mentor_id = ?';
        if (student_id) whereClause += ' AND s.id = ?';
        if (startDate) whereClause += ' AND created_at >= ?';
        if (endDate) whereClause += ' AND created_at <= ?';

        const buildParams = () => {
            let p = [mentorId];
            if (student_id) p.push(student_id);
            if (startDate) p.push(startDate);
            if (endDate) p.push(endDate + ' 23:59:59');
            return p;
        };

        const params = [
            ...buildParams(),
            ...buildParams(),
            ...buildParams(),
            ...buildParams()
        ];

        const [rows] = await db.query(`
            SELECT * FROM (
                SELECT 
                    CONVERT('Interaction Hub' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    r.id, r.mentor_id, r.student_id, r.created_at,
                    CONVERT(COALESCE(m.name, u.name) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CAST(r.session_type AS CHAR) as session_number,
                    CONVERT(r.session_type USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_type,
                    CONVERT(COALESCE(
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.quick_notes')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.quick_guidance')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.mentor_guidance')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.action_plan')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.next_task')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.study_status')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.main_problem')),
                        JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.notes')),
                        r.session_type
                    ) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.self_clarity')) AS CHAR) as understanding_level,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.confidence')) AS CHAR) as student_confidence,
                    NULL as stress_level,
                    r.is_flagged,
                    CONVERT(r.flag_reason USING utf8mb4) COLLATE utf8mb4_unicode_ci as flag_reason,
                    NULL as screenshot_url,
                    r.report_data as report_data
                FROM mentor_session_reports r
                LEFT JOIN users u ON r.mentor_id = u.id AND u.role = 'mentor'
                LEFT JOIN mentors m ON (r.mentor_id = m.id OR (u.id IS NOT NULL AND (m.phone_number = u.email OR m.email = u.email OR m.name = u.name)))
                JOIN students s ON r.student_id = s.id
                ${whereClause.replace(/created_at/g, 'r.created_at')}

                UNION ALL

                SELECT 
                    CONVERT('Session Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    l.id, l.mentor_id, l.student_id, l.created_at,
                    CONVERT(COALESCE(m.name, u.name) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('S-Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_number,
                    CONVERT('MEDIUM' USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_type,
                    CONVERT(COALESCE(l.action_detail, CONCAT_WS(': ', NULLIF(l.main_issue, ''), NULLIF(l.action_type, ''))) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes,
                    CAST(l.understanding_after_session AS CHAR) as understanding_level,
                    CAST(l.session_quality_rating AS CHAR) as student_confidence,
                    CAST(l.stress_level AS CHAR) as stress_level,
                    NULL as is_flagged,
                    NULL as flag_reason,
                    NULL as screenshot_url,
                    JSON_OBJECT(
                        'connection_method', l.connection_method,
                        'session_duration_minutes', l.session_duration_minutes,
                        'focus_level', l.focus_level,
                        'energy_level', l.energy_level,
                        'stress_level', l.stress_level,
                        'homework_status', l.homework_status,
                        'revision_done', l.revision_done,
                        'doubts_present', l.doubts_present,
                        'main_issue', l.main_issue,
                        'secondary_issue', l.secondary_issue,
                        'weak_subject', l.weak_subject,
                        'problem_clarity', l.problem_clarity,
                        'action_type', l.action_type,
                        'action_detail', l.action_detail,
                        'action_specific', l.action_specific,
                        'student_engagement', l.student_engagement,
                        'understanding_after_session', l.understanding_after_session,
                        'previous_task_status', l.previous_task_status,
                        'followup_required', l.followup_required,
                        'followup_date', l.followup_date,
                        'student_status', l.student_status,
                        'session_quality_rating', l.session_quality_rating
                    ) as report_data
                FROM mentor_session_logs l
                LEFT JOIN users u ON l.mentor_id = u.id AND u.role = 'mentor'
                LEFT JOIN mentors m ON (l.mentor_id = m.id OR (u.id IS NOT NULL AND (m.phone_number = u.email OR m.email = u.email OR m.name = u.name)))
                JOIN students s ON l.student_id = s.id
                ${whereClause.replace(/created_at/g, 'l.created_at')}

                UNION ALL

                SELECT 
                    CONVERT('Quick Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    logs.id, logs.mentor_id, logs.student_id, logs.created_at,
                    CONVERT(COALESCE(m.name, u.name) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('Q-Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_number,
                    CONVERT('QUICK' USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_type,
                    CONVERT(logs.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes,
                    CAST(logs.self_clarity AS CHAR) as understanding_level,
                    CAST(logs.confidence AS CHAR) as student_confidence,
                    CAST(logs.exam_anxiety AS CHAR) as stress_level,
                    NULL as is_flagged,
                    NULL as flag_reason,
                    CONVERT(logs.screenshot_url USING utf8mb4) COLLATE utf8mb4_unicode_ci as screenshot_url,
                    JSON_OBJECT(
                        'connection_method', logs.connection_method,
                        'self_clarity', logs.self_clarity,
                        'confusing_topic', logs.confusing_topic,
                        'can_solve_independently', logs.can_solve_independently,
                        'homework_status', logs.homework_status,
                        'homework_difficulty', logs.homework_difficulty,
                        'revision_quality', logs.revision_quality,
                        'confidence', logs.confidence,
                        'motivation_level', logs.motivation_level,
                        'focus_level', logs.focus_level,
                        'exam_anxiety', logs.exam_anxiety,
                        'student_requests', logs.student_requests,
                        'parent_update_priority', logs.parent_update_priority,
                        'mentor_action_needed', logs.mentor_action_needed,
                        'connected_today', logs.connected_today
                    ) as report_data
                FROM student_interaction_logs logs
                LEFT JOIN users u ON logs.mentor_id = u.id AND u.role = 'mentor'
                LEFT JOIN mentors m ON (logs.mentor_id = m.id OR (u.id IS NOT NULL AND (m.phone_number = u.email OR m.email = u.email OR m.name = u.name)))
                JOIN students s ON logs.student_id = s.id
                ${whereClause.replace(/created_at/g, 'logs.created_at')}

                UNION ALL

                SELECT 
                    CONVERT('Mentorship' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    ml.id, ml.mentor_id, ml.student_id, ml.created_at,
                    CONVERT(COALESCE(m.name, u.name) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('M-Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as session_number,
                    'DEEP' as session_type,
                    CONVERT(ml.action_details USING utf8mb4) as mentor_notes,
                    NULL as understanding_level,
                    NULL as student_confidence,
                    NULL as stress_level,
                    NULL as is_flagged,
                    NULL as flag_reason,
                    NULL as screenshot_url,
                    JSON_OBJECT(
                        'session_date', ml.session_date,
                        'main_issue', ml.main_issue,
                        'secondary_issue', ml.secondary_issue,
                        'weak_subject', ml.weak_subject,
                        'consistency_rating', ml.consistency_rating,
                        'focus_rating', ml.focus_rating,
                        'effort_level', ml.effort_level,
                        'homework_status', ml.homework_status,
                        'action_type', ml.action_type,
                        'action_details', ml.action_details,
                        'follow_up_required', ml.follow_up_required,
                        'follow_up_date', ml.follow_up_date,
                        'priority', ml.priority,
                        'student_status', ml.student_status
                    ) as report_data
                FROM mentorship_logs ml
                LEFT JOIN users u ON ml.mentor_id = u.id AND u.role = 'mentor'
                LEFT JOIN mentors m ON (ml.mentor_id = m.id OR (u.id IS NOT NULL AND (m.phone_number = u.email OR m.email = u.email OR m.name = u.name)))
                JOIN students s ON ml.student_id = s.id
                ${whereClause.replace(/created_at/g, 'ml.created_at')}
            ) as unified_logs
            ORDER BY created_at DESC
        `, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("GET_STUDENT_LOGS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Toggle student connected today status
// @route   PUT /api/mentor/students/:studentId/connection
const toggleStudentConnection = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { studentId } = req.params;
        const { connected_today } = req.body;
        const date = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' }).split(',')[0];

        if (connected_today) {
            // Check if log already exists
            const [existing] = await db.query('SELECT id FROM student_interaction_logs WHERE mentor_id = ? AND student_id = ? AND date = ?', [mentorId, studentId, date]);
            if (!existing.length) {
                await db.query(`
                    INSERT INTO student_interaction_logs (mentor_id, student_id, date, mentor_notes, connected_today)
                    VALUES (?, ?, ?, 'Quick connection marked by Mentor', TRUE)
                 `, [mentorId, studentId, date]);
            } else {
                await db.query(`
                    UPDATE student_interaction_logs SET connected_today = TRUE WHERE mentor_id = ? AND student_id = ? AND date = ?
                 `, [mentorId, studentId, date]);
            }
        } else {
            await db.query(`
                UPDATE student_interaction_logs SET connected_today = FALSE WHERE mentor_id = ? AND student_id = ? AND date = ?
             `, [mentorId, studentId, date]);
        }
        res.status(200).json({ success: true, message: 'Connection status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complete student onboarding
// @route   PUT /api/mentor/students/:id/onboard
const completeOnboarding = async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const { studentId } = req.params;

        let query = 'UPDATE students SET onboarding_status = "completed" WHERE id = ?';
        let params = [studentId];

        if (loggedInUserRole === 'mentor') {
            query += ' AND mentor_id = ?';
            params.push(loggedInUserId);
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Student not found or permission denied" });
        }

        res.status(200).json({ success: true, message: "Student onboarding completed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create batch timetable (For Onboarding)
// @route   POST /api/mentor/timetable/batch
const createBatchTimetable = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;
        const { student_id, sessions } = req.body;

        if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
            return res.status(400).json({ success: false, message: "No sessions provided" });
        }

        // Get student's actual mentor_id
        const [[studentObj]] = await connection.query(
            'SELECT mentor_id FROM students WHERE id = ?',
            [student_id]
        );

        if (!studentObj) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Use student's actual mentor_id; do NOT fallback to SSC/admin user ID
        // as that would violate FK constraints on mentor_id column
        const actualMentorId = studentObj.mentor_id || null;

        // 1. (Session numbers will be recalculated after insert)
        let currentSessionNum = 0;

        // 2. Prepare and Insert each session
        const insertedIds = [];
        for (const session of sessions) {
            const { date, start_time, end_time, chapter, session_type, notes, faculty_id, faculty_name, session_mode } = session;

            const formattedStartTime = convertTo24Hour(start_time);
            const formattedEndTime = convertTo24Hour(end_time);

            // Calculate duration
            const start = new Date(`1970-01-01T${formattedStartTime}`);
            const end = new Date(`1970-01-01T${formattedEndTime}`);
            const diffMs = end - start;
            const diffMins = Math.round(diffMs / 60000);
            const duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

            let finalFacultyName = faculty_name || null;
            if (faculty_id) {
                const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [faculty_id]);
                if (facObj) finalFacultyName = facObj.name;
            }

            const [result] = await connection.query(`
                INSERT INTO timetable (
                    mentor_id, student_id, session_number, date, start_time, end_time,
                    duration, chapter, subject, session_type, status, notes, 
                    faculty_id, faculty_name, session_mode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, ?)
            `, [
                actualMentorId, student_id, currentSessionNum++, date, formattedStartTime, formattedEndTime,
                duration, chapter, session.subject || null, session_type || 'Regular Class', notes || '',
                (faculty_id ? parseInt(faculty_id) : null), finalFacultyName, session_mode || 'Online'
            ]);

            insertedIds.push(result.insertId);
        }

        // Recalculate session numbers correctly ordered by date and time
        await recalculateSessionNumbers(student_id, connection);

        // 3. Mark student as onboarded
        let updateQuery = 'UPDATE students SET onboarding_status = "completed" WHERE id = ?';
        let updateParams = [student_id];

        if (loggedInUserRole === 'mentor') {
            updateQuery += ' AND mentor_id = ?';
            updateParams.push(loggedInUserId);
        }

        await connection.query(updateQuery, updateParams);

        // Sync to faculty_sessions inside the transaction
        const { syncTimetableToFacultySession } = require('../utils/timetableSync');
        for (const timetableId of insertedIds) {
            await syncTimetableToFacultySession(timetableId, connection);
        }

        // Verify sync before commit
        for (const timetableId of insertedIds) {
            const [syncVerify] = await connection.query('SELECT id FROM faculty_sessions WHERE timetable_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [timetableId]);
            if (syncVerify.length === 0) throw new Error(`Sync verification failed for timetable ID ${timetableId}`);
        }

        // Also check if onboarding status needs to be tracked properly (it already sets completed)
        await connection.query('UPDATE students SET timetable_created = 1 WHERE id = ?', [student_id]);

        await connection.commit();
        res.status(201).json({ success: true, message: "Timetable created and onboarding completed" });
    } catch (error) {
        await connection.rollback();
        console.error("Batch Timetable Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Get pending exams list for mentor
// @route   GET /api/mentor/exams/pending
const getPendingExams = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const [students] = await db.query('SELECT id, name FROM students WHERE mentor_id = ? AND status != "rejected"', [mentorId]);
        let pendingExams = [];
        for (const student of students) {
            const [rows] = await db.query('SELECT MAX(session_number) as current_max FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ? AND status != "Cancelled"', [student.id]);
            const currentMax = rows[0].current_max || 0;
            for (let milestone = 5; milestone <= currentMax; milestone += 5) {
                const [existing] = await db.query('SELECT id, status, score, chapter, portions, exam_type, scheduled_date FROM student_exams WHERE student_id = ? AND milestone_session = ?', [student.id, milestone]);
                if (existing.length === 0 || existing[0].status !== 'Completed') {
                    pendingExams.push({
                        id: existing.length > 0 ? existing[0].id : null,
                        student_id: student.id,
                        student_name: student.name,
                        milestone: milestone,
                        status: existing.length > 0 ? existing[0].status : 'Pending',
                        session_count: currentMax,
                        chapter: existing.length > 0 ? existing[0].chapter : null,
                        portions: existing.length > 0 ? existing[0].portions : null,
                        exam_type: existing.length > 0 ? existing[0].exam_type : 'MCQ',
                        scheduled_date: existing.length > 0 ? existing[0].scheduled_date : null
                    });
                }
            }
        }
        res.status(200).json({ success: true, data: pendingExams });
    } catch (error) {
        console.error("Get Pending Exams Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get completed exam history for mentor's students
// @route   GET /api/mentor/exams/history
const getExamHistory = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const [history] = await db.query(`SELECT se.*, s.name as student_name FROM student_exams se JOIN students s ON se.student_id = s.id WHERE se.mentor_id = ? ORDER BY se.created_at DESC`, [mentorId]);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error("Get Exam History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit exam result or postponement
// @route   POST /api/mentor/exams/submit
const submitExamResult = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { student_id, milestone, score, type, postponed_date, reason } = req.body;

        if (!student_id || !milestone || !type) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        if (type === 'Complete') {
            if (!score) return res.status(400).json({ success: false, message: "Score is required for completion" });
            await db.query(`
                INSERT INTO student_exams (student_id, mentor_id, milestone_session, score, status)
                VALUES (?, ?, ?, ?, 'Completed')
                ON DUPLICATE KEY UPDATE score = VALUES(score), status = 'Completed', postponed_date = NULL, reason = NULL
            `, [student_id, mentorId, milestone, score]);
            res.status(200).json({ success: true, message: "Exam score submitted successfully" });
        } else if (type === 'Postpone') {
            if (!postponed_date || !reason) return res.status(400).json({ success: false, message: "Postponed date and reason are required" });
            await db.query(`
                INSERT INTO student_exams (student_id, mentor_id, milestone_session, status, postponed_date, reason)
                VALUES (?, ?, ?, 'Postponed', ?, ?)
                ON DUPLICATE KEY UPDATE status = 'Postponed', postponed_date = VALUES(postponed_date), reason = VALUES(reason)
            `, [student_id, mentorId, milestone, postponed_date, reason]);
            res.status(200).json({ success: true, message: "Exam postponed successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid submission type" });
        }
    } catch (error) {
        console.error("Submit Exam Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const logDailyHours = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { student_id, hours, date } = req.body;
        if (!student_id || !hours || !date) return res.status(400).json({ success: false, message: 'Student ID, hours, and date are required' });
        const formattedDate = new Date(date).toISOString().split('T')[0];
        await db.query(`INSERT INTO daily_hours_log (student_id, mentor_id, hours, date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE hours = VALUES(hours)`, [student_id, mentorId, hours, formattedDate]);
        res.status(200).json({ success: true, message: 'Daily hours logged successfully' });
    } catch (error) {
        console.error("Error logging daily hours:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getDailyHours = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const [logs] = await db.query('SELECT * FROM daily_hours_log WHERE student_id = ? ORDER BY date DESC', [studentId]);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error("Error fetching daily hours:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get full academic schedule for mentor's students
// @route   GET /api/mentor/academic-schedule
const getAcademicSchedule = async (req, res) => {
    try {
        const mentorId = req.user.id;
        let query = `
            SELECT fs.*, 
                   COALESCE(NULLIF(TRIM(f_user.name), ''), NULLIF(TRIM(u.name), ''), NULLIF(TRIM(t.faculty_name), ''), 'Unassigned') as faculty_name, 
                   COALESCE(NULLIF(TRIM(GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ')), ''), 'No Student Assigned') as student_name, 
                   MAX(s.id) as student_id, 
                   MAX(s.meeting_link) as meeting_link, 
                   MAX(t.session_number) as session_number
            FROM faculty_sessions fs
            LEFT JOIN users f_user ON fs.faculty_id = f_user.id AND f_user.role = 'faculty'
            LEFT JOIN faculties u ON fs.faculty_id = u.id
            LEFT JOIN session_attendance sa ON fs.id = sa.session_id AND (sa.is_deleted IS NULL OR sa.is_deleted = 0)
            LEFT JOIN timetable t ON fs.timetable_id = t.id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            LEFT JOIN students s ON (sa.student_id = s.id OR t.student_id = s.id)
            WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0)
              AND s.id IS NOT NULL
              AND (
                fs.timetable_id IS NULL
                OR EXISTS (
                    SELECT 1 FROM timetable tt 
                    WHERE tt.id = fs.timetable_id 
                    AND (tt.is_deleted IS NULL OR tt.is_deleted = 0)
                )
              )
        `;
        const params = [];

        if (req.user.role !== 'ssc') {
            query += ' AND s.mentor_id = ?';
            params.push(mentorId);
        }

        query += ' GROUP BY fs.id ORDER BY fs.date DESC, fs.start_time ASC';

        const [rows] = await db.query(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Academic Schedule Error Detail:", error);
        res.status(500).json({ success: false, message: "Academic Schedule retrieval failed", error: error.message });
    }
};

const getStudentDailyUpdates = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { studentId } = req.params;

        // 1. Daily Updates from Student Portal
        const [dailyUpdates] = await db.query(`
            SELECT *, 
            DATE_FORMAT(registration_date, '%d-%m-%Y') as formatted_date,
            DATE_FORMAT(registration_time, '%l:%i %p') as formatted_time
            FROM student_daily_updates 
            WHERE student_id = ? 
            ORDER BY registration_date DESC, registration_time DESC
        `, [studentId]);

        // 2. Exam Marks
        const [marks] = await db.query(`
            SELECT * FROM student_marks 
            WHERE student_id = ? 
            ORDER BY created_at DESC
        `, [studentId]);

        // 3. Attendance History
        const [attendance] = await db.query(`
            SELECT a.*, s.topic, s.date 
            FROM session_attendance a
            JOIN faculty_sessions s ON a.session_id = s.id
            WHERE a.student_id = ?
            ORDER BY s.date DESC
        `, [studentId]);

        res.status(200).json({ 
            success: true, 
            data: {
                dailyUpdates,
                marks,
                attendance
            }
        });
    } catch (error) {
        console.error("Error fetching student comprehensive data:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const createMentorshipLog = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const {
            student_id, session_date, main_issue, secondary_issue, weak_subject,
            consistency_rating, focus_rating, effort_level, homework_status,
            action_type, action_details, follow_up_required, follow_up_date,
            priority, student_status
        } = req.body;

        await db.query(`
            INSERT INTO mentorship_logs (
                student_id, mentor_id, session_date, main_issue, secondary_issue, weak_subject,
                consistency_rating, focus_rating, effort_level, homework_status,
                action_type, action_details, follow_up_required, follow_up_date,
                priority, student_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            student_id, mentorId, session_date, main_issue, secondary_issue, weak_subject,
            consistency_rating, focus_rating, effort_level, homework_status,
            action_type, action_details, follow_up_required ? 1 : 0, follow_up_date || null,
            priority, student_status
        ]);
        
        // Notify Admin of new mentorship log
        try {
            const [[student]] = await db.query('SELECT name FROM students WHERE id = ?', [student_id]);
            await db.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)', [
                `<b>Mentorship Log:</b> Mentor <b>${req.user.name}</b> submitted a mentorship report for <b>${student?.name || student_id}</b>.`,
                student_id,
                'mentorship_log'
            ]);
        } catch (nErr) {
            console.error("Notification Error:", nErr.message);
        }

        res.status(201).json({ success: true, message: "Mentorship session logged successfully" });
    } catch (error) {
        console.error("Error creating mentorship log:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMentorshipLogs = async (req, res) => {
    try {
        const { studentId } = req.params;
        const [rows] = await db.query('SELECT * FROM mentorship_logs WHERE student_id = ? ORDER BY session_date DESC', [studentId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching mentorship logs:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update session reminder and remark
// @route   PUT /api/mentor/academic-schedule/:id/reminder
const updateAcademicSessionReminder = async (req, res) => {
    try {
        const { reminder_num, remark } = req.body;
        const sessionId = req.params.id;

        if (![1, 2, 3].includes(reminder_num)) {
            return res.status(400).json({ success: false, message: "Invalid reminder number" });
        }

        const reminderField = `reminder_${reminder_num}`;
        const remarkField = `reminder_${reminder_num}_remark`;

        await db.query(`
            UPDATE faculty_sessions 
            SET ${reminderField} = 1, ${remarkField} = ? 
            WHERE id = ?
        `, [remark, sessionId]);

        res.status(200).json({ success: true, message: `Reminder ${reminder_num} updated` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark academic session as completed with minutes taken
// @route   PUT /api/mentor/academic-schedule/:id/complete
const completeAcademicSession = async (req, res) => {
    try {
        const { minutes_taken, status, cancel_note } = req.body;
        const sessionId = req.params.id;
        const loggedInUserRole = req.user ? req.user.role : '';

        // Check if already locked
        const [session] = await db.query('SELECT minutes_locked, timetable_id FROM faculty_sessions WHERE id = ?', [sessionId]);
        if (session.length > 0 && session[0].minutes_locked && loggedInUserRole !== 'academic_head' && loggedInUserRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: "This session's duration is locked and cannot be edited." });
        }

        const finalStatus = status || 'Completed';
        const finalMinutes = minutes_taken || 0;

        await db.query(`
            UPDATE faculty_sessions 
            SET status = ?, minutes_taken = ?, cancel_note = ?, minutes_locked = 1 
            WHERE id = ?
        `, [finalStatus, finalMinutes, cancel_note || null, sessionId]);

        // Bidirectional sync: if this session is linked to a timetable session, mark it as Completed too
        if (session.length > 0 && session[0].timetable_id) {
            await db.query(`
                UPDATE timetable 
                SET status = ?, cancel_note = ? 
                WHERE id = ?
            `, [finalStatus, cancel_note || null, session[0].timetable_id]);
        }

        // Auto-complete course if consumed hours >= total hours
        if (finalStatus === 'Completed') {
            // Find student_id
            let [studentRows] = await db.query(`
                SELECT sa.student_id, t.student_id as t_student_id 
                FROM faculty_sessions fs
                LEFT JOIN session_attendance sa ON fs.id = sa.session_id
                LEFT JOIN timetable t ON fs.timetable_id = t.id
                WHERE fs.id = ?
            `, [sessionId]);

            if (studentRows.length > 0) {
                const sId = studentRows[0].student_id || studentRows[0].t_student_id;
                if (sId) {
                    // Get all minutes taken
                    const [allSessions] = await db.query(`
                        SELECT fs.minutes_taken 
                        FROM faculty_sessions fs
                        LEFT JOIN session_attendance sa ON fs.id = sa.session_id
                        LEFT JOIN timetable t ON fs.timetable_id = t.id
                        WHERE (sa.student_id = ? OR t.student_id = ?) 
                        AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
                        AND fs.status = 'Completed'
                    `, [sId, sId]);

                    let totalConsumedMinutes = 0;
                    allSessions.forEach(s => totalConsumedMinutes += (s.minutes_taken || 0));
                    const consumedHours = totalConsumedMinutes / 60;

                    // Get allocated hours
                    const [studentInfo] = await db.query(`SELECT course, course_completed FROM students WHERE id = ?`, [sId]);
                    if (studentInfo.length > 0 && studentInfo[0].course_completed === 0) {
                        const courseName = studentInfo[0].course;
                        const [courseRows] = await db.query(`SELECT total_hours FROM courses WHERE name = ?`, [courseName]);
                        if (courseRows.length > 0) {
                            const totalHours = courseRows[0].total_hours;
                            if (consumedHours >= totalHours) {
                                await db.query(`UPDATE students SET course_completed = 1, course_completed_date = CURDATE() WHERE id = ?`, [sId]);
                            }
                        }
                    }
                }
            }
        }

        res.status(200).json({ success: true, message: `Session marked as ${finalStatus} and locked` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student's academic schedule (pre-set in academic panel)
// @route   GET /api/mentor/students/:id/schedule
const getStudentAcademicSchedule = async (req, res) => {
    try {
        const studentId = req.params.id;
        const [schedules] = await db.query(`
            SELECT fs.*, u.name as faculty_name 
            FROM faculty_schedules fs
            LEFT JOIN users u ON fs.faculty_id = u.id AND u.role = 'faculty'
            WHERE fs.student_id = ? AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            ORDER BY FIELD(fs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), fs.start_time ASC
        `, [studentId]);
        
        if (schedules && schedules.length > 0) {
            // Enrich schedules with faculty info from subjects_json if missing
            const [[student2]] = await db.query('SELECT subjects_json FROM students WHERE id = ?', [studentId]);
            if (student2 && student2.subjects_json) {
                let subjects2 = [];
                try { subjects2 = typeof student2.subjects_json === 'string' ? JSON.parse(student2.subjects_json) : student2.subjects_json; } catch (e) {}
                schedules.forEach(s => {
                    if (!s.faculty_id && s.subject) {
                        const m = subjects2.find(sub => sub.subject === s.subject);
                        if (m && (m.facultyId || m.faculty_id)) {
                            s.faculty_id = m.facultyId || m.faculty_id;
                            s.faculty_name = m.facultyName || m.faculty_name || null;
                        }
                    }
                });
            }
            return res.status(200).json({ success: true, data: schedules });
        }

        // Fallback to subjects_json if faculty_schedules is empty
        const [[student]] = await db.query('SELECT subjects_json, faculty_id, faculty_name FROM students WHERE id = ?', [studentId]);
        if (student && student.subjects_json) {
            let parsed = [];
            try {
                parsed = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
            } catch (e) {}

            let generatedSchedules = [];
            if (Array.isArray(parsed)) {
                parsed.forEach(p => {
                    let subjectStr = Array.isArray(p.subject) ? p.subject.join(', ') : p.subject;
                    let pFacultyId = p.faculty_id || p.facultyId || null;
                    let pFacultyName = p.faculty_name || p.facultyName || null;
                    
                    if (p.dayConfigs && Array.isArray(p.dayConfigs)) {
                        p.dayConfigs.forEach(dc => {
                            const newSlot = {
                                day_of_week: dc.day,
                                start_time: convertTo24Hour(dc.startTime) || '10:00:00',
                                end_time: convertTo24Hour(dc.endTime) || '11:00:00',
                                subject: subjectStr,
                                faculty_id: pFacultyId,
                                faculty_name: pFacultyName
                            };
                            // Prevent exact duplicates (same day + time + subject)
                            const isDuplicate = generatedSchedules.some(s =>
                                s.day_of_week === newSlot.day_of_week &&
                                s.start_time === newSlot.start_time &&
                                s.end_time === newSlot.end_time &&
                                s.subject === newSlot.subject
                            );
                            if (!isDuplicate) generatedSchedules.push(newSlot);
                        });
                    }
                });
            }
            if (generatedSchedules.length > 0) {
                return res.status(200).json({ success: true, data: generatedSchedules });
            }
        }
        
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update student's academic schedule
// @route   POST /api/mentor/students/:id/schedule
const updateStudentAcademicSchedule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const studentId = req.params.id;
        const { schedules } = req.body; // Array of {day_of_week, start_time, end_time, subject, faculty_id}

        // 1. Soft-delete existing schedules
        const mappedSubjects = schedules ? schedules.map(s => ({ subject: s.subject, facultyId: s.faculty_id })) : [];
        await logFacultyChanges(studentId, mappedSubjects, req.user);
        await connection.query('UPDATE faculty_schedules SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE student_id = ?', [studentId]);

        const [[studentRow]] = await connection.query('SELECT mentor_id FROM students WHERE id = ?', [studentId]);
        const actualMentorId = studentRow?.mentor_id || null;

        // 2. Insert new schedules
        if (schedules && Array.isArray(schedules) && schedules.length > 0) {
            for (const s of schedules) {
                const facId = s.faculty_id ? parseInt(s.faculty_id) : null;
                await connection.query(`
                    INSERT INTO faculty_schedules (student_id, day_of_week, start_time, end_time, subject, faculty_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [studentId, s.day_of_week, s.start_time, s.end_time, s.subject, facId]);
            }

            // ── AUTO-SYNC: Generate timetable entries for the next 4 weeks ──
            const dayMap = { Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };

            function getUpcomingDates(dayOfWeekStr, numWeeks = 4) {
                const dates = [];
                const targetDay = dayMap[dayOfWeekStr];
                if (targetDay === undefined) return dates;
                let d = new Date();
                d.setDate(d.getDate() + ((targetDay + 7 - d.getDay()) % 7));
                for (let i = 0; i < numWeeks; i++) {
                    dates.push(d.toISOString().split('T')[0]);
                    d.setDate(d.getDate() + 7);
                }
                return dates;
            }

            for (const s of schedules) {
                const facId = s.faculty_id ? parseInt(s.faculty_id) : null;
                const upcomingDates = getUpcomingDates(s.day_of_week, 4);
                const start24 = s.start_time;
                const end24 = s.end_time;
                const startD = new Date(`1970-01-01T${start24}`);
                const endD = new Date(`1970-01-01T${end24}`);
                const diffMins = Math.round((endD - startD) / 60000);
                const duration = diffMins > 0 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : '0h 0m';

                let faculty_name = null;
                if (facId) {
                    const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [facId]);
                    if (facObj) faculty_name = facObj.name;
                }

                for (const date of upcomingDates) {
                    const [existing] = await connection.query(
                        'SELECT id FROM timetable WHERE student_id = ? AND date = ? AND start_time = ? AND (is_deleted IS NULL OR is_deleted = 0)',
                        [studentId, date, start24]
                    );
                    if (existing.length === 0) {
                        await connection.query(`
                            INSERT INTO timetable (mentor_id, student_id, session_number, date, start_time, end_time, duration, chapter, subject, session_type, status, notes, faculty_id, faculty_name, session_mode)
                            VALUES (?, ?, 0, ?, ?, ?, ?, '', ?, 'Regular Class', 'Scheduled', '', ?, ?, 'Online')
                        `, [actualMentorId, studentId, date, start24, end24, duration, s.subject || '', facId, faculty_name]);
                    }
                }
            }

            // Recalculate session numbers
            const [allSessions] = await connection.query(
                'SELECT id FROM timetable WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY date ASC, start_time ASC',
                [studentId]
            );
            for (let i = 0; i < allSessions.length; i++) {
                await connection.query('UPDATE timetable SET session_number = ? WHERE id = ?', [i + 1, allSessions[i].id]);
            }
        }

        // --- TIMETABLE PERSISTENCE GUARANTEE CHECK ---
        const [[studentCheck]] = await connection.query("SELECT status FROM students WHERE id = ?", [studentId]);
        if (studentCheck && studentCheck.status === 'active') {
            const [[countCheck]] = await connection.query(
                "SELECT COUNT(*) as count FROM timetable WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)", 
                [studentId]
            );
            
            if (countCheck.count === 0) {
                await connection.rollback();
                console.error(`[PERSISTENCE ERROR] Student ${studentId} generated 0 timetable records. Marking generation as FAILED.`);
                require('fs').appendFileSync('integrity_report.json', `\n[${new Date().toISOString()}] FAILED generation for student: ${studentId}`);
                return res.status(500).json({ success: false, message: "Timetable Persistence Guarantee failed. Missing records for active student." });
            }
        }
        // ----------------------------------------------

        await connection.commit();
        res.status(200).json({ success: true, message: "Academic schedule updated successfully" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

const getMentors = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name FROM users WHERE role = 'mentor' ORDER BY name ASC");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Syncs a timetable session to faculty_sessions and session_attendance
async function syncTimetableToFacultySession(timetableId) {
    try {
        // Fetch timetable session details
        const [[timetableSession]] = await db.query('SELECT * FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND id = ?', [timetableId]);
        if (!timetableSession) {
            // Timetable session was deleted - find and delete synced faculty_sessions
            const [[existingSync]] = await db.query('SELECT id FROM faculty_sessions WHERE timetable_id = ?', [timetableId]);
            if (existingSync) {
                await db.query('UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ?', [existingSync.id]);
                await db.query('UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [existingSync.id]);
            }
            return;
        }

        const {
            faculty_id, student_id, date, start_time, end_time, chapter, session_type, status, duration
        } = timetableSession;

        // If no faculty is assigned yet, delete any existing sync (since a faculty_session requires a valid faculty_id to join users table)
        if (!faculty_id) {
            const [[existingSync]] = await db.query('SELECT id FROM faculty_sessions WHERE timetable_id = ?', [timetableId]);
            if (existingSync) {
                await db.query('UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ?', [existingSync.id]);
                await db.query('UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [existingSync.id]);
            }
            return;
        }

        // Calculate minutes_taken if Completed
        let minutes_taken = null;
        let minutes_locked = 0;
        if (status === 'Completed') {
            minutes_locked = 1;
            if (start_time && end_time) {
                const start = new Date(`1970-01-01T${start_time}`);
                const end = new Date(`1970-01-01T${end_time}`);
                const diffMs = end - start;
                minutes_taken = Math.max(0, Math.round(diffMs / 60000));
            }
        }

        const topic = chapter || session_type || 'General Session';

        // Check if synced session already exists
        const [[existingSync]] = await db.query(
            'SELECT id, minutes_locked, minutes_taken FROM faculty_sessions WHERE timetable_id = ?',
            [timetableId]
        );

        if (existingSync) {
            const sessionId = existingSync.id;
            
            // Respect minutes lock
            const newMinutesTaken = existingSync.minutes_locked ? existingSync.minutes_taken : minutes_taken;
            const newMinutesLocked = existingSync.minutes_locked ? existingSync.minutes_locked : minutes_locked;

            await db.query('SET FOREIGN_KEY_CHECKS=0;');
            
            await db.query(`
                UPDATE faculty_sessions 
                SET faculty_id = ?, topic = ?, date = ?, start_time = ?, end_time = ?, status = ?, duration = ?, minutes_taken = ?, minutes_locked = ?
                WHERE id = ?
            `, [faculty_id, topic, date, start_time, end_time, status, duration, newMinutesTaken, newMinutesLocked, sessionId]);

            // Sync student ID in session attendance
            await db.query(`
                UPDATE session_attendance 
                SET student_id = ? 
                WHERE session_id = ?
            `, [student_id, sessionId]);

            await db.query('SET FOREIGN_KEY_CHECKS=1;');
        } else {
            await db.query('SET FOREIGN_KEY_CHECKS=0;');
            
            // Create new synced faculty session
            const [fsResult] = await db.query(`
                INSERT INTO faculty_sessions (timetable_id, faculty_id, topic, date, start_time, end_time, status, duration, minutes_taken, minutes_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [timetableId, faculty_id, topic, date, start_time, end_time, status, duration, minutes_taken, minutes_locked]);

            const sessionId = fsResult.insertId;

            // Insert into session_attendance
            await db.query(`
                INSERT INTO session_attendance (session_id, student_id, status)
                VALUES (?, ?, 'Present')
            `, [sessionId, student_id]);

            await db.query('SET FOREIGN_KEY_CHECKS=1;');
        }
    } catch (error) {
        console.error('Error in syncTimetableToFacultySession:', error.message);
        throw new Error('Sync to Academic Schedule failed: ' + error.message);
    }
}

module.exports = {
    getMentorDashboard,
    getMentorStudents,
    getStudentDetails,
    getStudentAcademicSchedule,
    updateStudentAcademicSchedule,
    getMentorTasks,
    completeMentorTask: processMentorTaskCompletion,
    getMentorTimetable,
    createSession,
    updateSession,
    deleteSession,
    createStudentLog,
    getStudentLogs,
    toggleStudentConnection,
    updateAcademicSessionReminder,
    completeAcademicSession,
    getAcademicSchedule,
    completeOnboarding,
    createBatchTimetable,
    getPendingExams,
    getExamHistory,
    submitExamResult,
    logDailyHours,
    getDailyHours,
    getStudentDailyUpdates,
    createMentorshipLog,
    getMentorshipLogs,
    getMentors,
    recalculateAllSessionNumbers,
    syncTimetableToFacultySession
};
