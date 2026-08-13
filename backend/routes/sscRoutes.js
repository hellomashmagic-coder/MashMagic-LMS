const express = require('express');
const router = express.Router();
const { getFacultyChangeHistory } = require('../controllers/facultyHistoryController');
const { getDashboardStats, getStudentsTrack, getDailyUpdates } = require('../controllers/sscController');
const { getStudentById, saveExamPlan } = require('../controllers/aoeController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const db = require('../config/db');

router.get('/debug-faculty-verify', async (req, res) => {
    const db = require('../config/db');
    try {
        const studentName = req.query.name;   // optional filter
        const report = {};

        // ─── 1. TIMETABLE: faculty_id cross-check ─────────────────────────────
        let ttQuery = `
            SELECT t.id as timetable_id, s.name as student_name, s.id as student_id,
                   t.date, t.start_time, t.faculty_id,
                   t.faculty_name AS stored_in_timetable,
                   u.name        AS users_table_name,
                   u.role        AS users_table_role,
                   f.name        AS faculties_table_name,
                   COALESCE(NULLIF(TRIM(u.name),''), NULLIF(TRIM(f.name),''), t.faculty_name, 'MISSING') AS correct_name
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            LEFT JOIN users u    ON t.faculty_id = u.id AND u.role = 'faculty'
            LEFT JOIN faculties f ON t.faculty_id = f.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = 0)
              AND t.faculty_id IS NOT NULL
        `;
        const ttParams = [];
        if (studentName) { ttQuery += ' AND s.name LIKE ?'; ttParams.push(`%${studentName}%`); }
        ttQuery += ' ORDER BY t.id DESC LIMIT 50';

        const [timetableRows] = await db.query(ttQuery, ttParams);

        // Flag mismatches: stored name vs correct name
        const timetableMismatches = timetableRows.filter(r =>
            r.stored_in_timetable &&
            r.correct_name !== 'MISSING' &&
            r.stored_in_timetable.trim().toLowerCase() !== r.correct_name.trim().toLowerCase()
        );

        report.timetable_faculty_check = {
            total_checked: timetableRows.length,
            mismatches_found: timetableMismatches.length,
            mismatches: timetableMismatches,
            all_rows: timetableRows
        };

        // ─── 2. FACULTY_SESSIONS: faculty_id cross-check ──────────────────────
        let fsQuery = `
            SELECT fs.id as session_id, s.name as student_name, s.id as student_id,
                   fs.date, fs.start_time, fs.topic, fs.status,
                   fs.faculty_id,
                   u.name  AS users_table_name,
                   u.role  AS users_table_role,
                   f.name  AS faculties_table_name,
                   COALESCE(NULLIF(TRIM(u.name),''), NULLIF(TRIM(f.name),''), 'MISSING') AS correct_name_now,
                   CASE 
                     WHEN u.name IS NOT NULL THEN 'OK - from users table'
                     WHEN f.name IS NOT NULL THEN 'FALLBACK - from old faculties table'
                     ELSE 'BROKEN - faculty_id not found anywhere'
                   END AS status_note
            FROM faculty_sessions fs
            LEFT JOIN session_attendance sa ON fs.id = sa.session_id AND (sa.is_deleted IS NULL OR sa.is_deleted = 0)
            LEFT JOIN students s  ON sa.student_id = s.id
            LEFT JOIN users u     ON fs.faculty_id = u.id AND u.role = 'faculty'
            LEFT JOIN faculties f  ON fs.faculty_id = f.id
            WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0)
              AND fs.faculty_id IS NOT NULL
        `;
        const fsParams = [];
        if (studentName) { fsQuery += ' AND s.name LIKE ?'; fsParams.push(`%${studentName}%`); }
        fsQuery += ' GROUP BY fs.id ORDER BY fs.id DESC LIMIT 50';

        const [sessionRows] = await db.query(fsQuery, fsParams);

        const brokenSessions  = sessionRows.filter(r => r.status_note.startsWith('BROKEN'));
        const fallbackSessions = sessionRows.filter(r => r.status_note.startsWith('FALLBACK'));
        const okSessions      = sessionRows.filter(r => r.status_note.startsWith('OK'));

        report.faculty_sessions_check = {
            total_checked:    sessionRows.length,
            ok_count:         okSessions.length,
            fallback_count:   fallbackSessions.length,
            broken_count:     brokenSessions.length,
            broken_sessions:  brokenSessions,
            fallback_sessions: fallbackSessions,
            all_rows:         sessionRows
        };

        // ─── 3. ORPHAN faculty_ids (not in users OR faculties) ────────────────
        const [orphanFacultyIds] = await db.query(`
            SELECT DISTINCT t.faculty_id,
                u.id AS in_users, f.id AS in_faculties
            FROM timetable t
            LEFT JOIN users u    ON t.faculty_id = u.id AND u.role = 'faculty'
            LEFT JOIN faculties f ON t.faculty_id = f.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = 0)
              AND t.faculty_id IS NOT NULL
              AND u.id IS NULL AND f.id IS NULL
        `);
        report.orphan_faculty_ids_in_timetable = orphanFacultyIds;

        // ─── 4. SUMMARY ───────────────────────────────────────────────────────
        report.summary = {
            timetable_mismatches:      timetableMismatches.length,
            session_broken_faculty:    brokenSessions.length,
            session_fallback_faculty:  fallbackSessions.length,
            session_ok_faculty:        okSessions.length,
            orphan_faculty_ids:        orphanFacultyIds.length,
            overall_status: (
                timetableMismatches.length === 0 &&
                brokenSessions.length === 0
            ) ? '✅ ALL CLEAN' : '⚠️ ISSUES FOUND - see details above'
        };

        res.json({ success: true, filter: studentName || 'ALL', report });
    } catch (e) {
        res.json({ success: false, error: e.message, stack: e.stack });
    }
});

router.get('/debug-db', async (req, res) => {
    const db = require('../config/db');
    try {
        const studentId = 471;
        const [tt] = await db.query('SELECT COUNT(*) as count FROM timetable WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [studentId]);
        const [fs] = await db.query('SELECT COUNT(*) as count FROM faculty_schedules WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [studentId]);
        
        const [fses] = await db.query(`
            SELECT COUNT(*) as count 
            FROM faculty_sessions fses
            LEFT JOIN session_attendance sa ON fses.id = sa.session_id
            LEFT JOIN timetable t ON fses.timetable_id = t.id
            WHERE (sa.student_id = ? OR t.student_id = ?) AND (fses.is_deleted IS NULL OR fses.is_deleted = 0)
        `, [studentId, studentId]);

        res.json({ success: true, timetable: tt[0].count, faculty_schedules: fs[0].count, faculty_sessions: fses[0].count });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// One-time cleanup: soft-delete faculty_sessions whose parent timetable is already deleted
router.get('/cleanup-orphaned-sessions', async (req, res) => {
    const db = require('../config/db');
    try {
        // Find all active faculty_sessions linked to a soft-deleted timetable
        const [orphans] = await db.query(`
            SELECT fs.id as fs_id, fs.timetable_id, fs.faculty_id, fs.date, fs.topic
            FROM faculty_sessions fs
            JOIN timetable t ON fs.timetable_id = t.id
            WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0)
              AND t.is_deleted = 1
        `);

        if (orphans.length === 0) {
            return res.json({ success: true, message: '✅ No orphaned sessions found. Everything is clean!', cleaned: 0 });
        }

        // Dry-run mode: just show what will be cleaned (add ?fix=1 to actually run)
        if (req.query.fix !== '1') {
            return res.json({
                success: true,
                message: `⚠️ Found ${orphans.length} orphaned faculty_session(s) whose timetable is deleted. Add ?fix=1 to clean them.`,
                preview: orphans
            });
        }

        // Actually clean them
        let cleanedCount = 0;
        for (const orphan of orphans) {
            await db.query(
                'UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
                [orphan.fs_id]
            );
            await db.query(
                'UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
                [orphan.fs_id]
            );
            cleanedCount++;
        }

        // Also log to audit
        await db.query(
            "INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)",
            ['CLEANUP_ORPHANED_SESSIONS', `Cleaned ${cleanedCount} orphaned faculty_sessions linked to deleted timetable rows`, null, 'system']
        );

        res.json({
            success: true,
            message: `✅ Cleaned ${cleanedCount} orphaned faculty_session(s). Academic Schedule will no longer show deleted timetable sessions.`,
            cleaned: cleanedCount,
            details: orphans
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

router.use(requireAuth);
router.use(requireRole('ssc', 'super_admin', 'academic_head'));

router.get('/dashboard', getDashboardStats);
router.get('/students', getStudentsTrack);
router.get('/daily-updates', getDailyUpdates);
router.get('/students/:id', getStudentById);

// Exam Schedule routes
router.get('/exam-schedules', async (req, res) => {
    try {
        const { student_id, status } = req.query;
        let sql = `
            SELECT se.*, s.name as student_name, s.course, s.grade, m.name as mentor_name
            FROM student_exams se
            JOIN students s ON se.student_id = s.id
            LEFT JOIN mentors m ON s.mentor_id = m.id
            WHERE 1=1
        `;
        const params = [];
        if (student_id) { sql += ' AND se.student_id = ?'; params.push(student_id); }
        if (status) { sql += ' AND se.status = ?'; params.push(status); }
        sql += ' ORDER BY se.scheduled_date ASC, se.created_at DESC';
        const [rows] = await db.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/exam-schedules', saveExamPlan);

router.put('/exam-schedules/:id/result', async (req, res) => {
    try {
        const { score, status, notes } = req.body;
        await db.query('UPDATE student_exams SET score = ?, status = ?, reason = ? WHERE id = ?', [score, status || 'Completed', notes, req.params.id]);
        res.json({ success: true, message: 'Exam result updated' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/exam-schedules/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM student_exams WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// SSC Timetable Routes
const { 
    getFacultiesAll, getMentorsAll, getTimetable, createSession, updateSession, deleteSession, 
    getStudentAcademicSchedule, updateStudentAcademicSchedule, createBatchTimetable 
} = require('../controllers/sscController');

router.get('/faculties-all', getFacultiesAll);
router.get('/mentors-all', getMentorsAll);
router.get('/timetable', getTimetable);
router.post('/timetable', createSession);
router.put('/timetable/:id', updateSession);
router.delete('/timetable/:id', deleteSession);
router.get('/students/:id/schedule', getStudentAcademicSchedule);
router.post('/students/:id/schedule', updateStudentAcademicSchedule);
router.post('/timetable/batch', createBatchTimetable);

module.exports = router;


// Get faculty change history
router.get('/students/:id/faculty-history', getFacultyChangeHistory);
