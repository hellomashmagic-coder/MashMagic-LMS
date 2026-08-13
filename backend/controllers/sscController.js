const db = require('../config/db');
const { logFacultyChanges } = require('../utils/facultyChangeLogger');
const { syncTimetableToFacultySession } = require('../utils/timetableSync');

// Helper: write to audit_logs table
async function logAudit({ action, entity = 'timetable', entity_id = null, user_id = null, user_role = null, old_data = null, new_data = null, details = null }) {
    try {
        await db.query(
            'INSERT INTO audit_logs (action, entity, entity_id, user_id, user_role, old_data, new_data, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [action, entity, entity_id, user_id, user_role, old_data ? JSON.stringify(old_data) : null, new_data ? JSON.stringify(new_data) : null, details]
        );
    } catch (e) { /* non-blocking */ }
}

// @desc    Get SSC Dashboard Stats
// @route   GET /api/ssc/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        // Placeholder stats
        res.status(200).json({
            success: true,
            data: {
                activeStudents: 0,
                mentorSyncs: 0,
                successRate: '0%',
                pendingReviews: 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Students for SSC Tracking
// @route   GET /api/ssc/students
exports.getStudentsTrack = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, 
            m.name as mentor_name,
            COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') 
                 FROM faculty_schedules fs 
                 JOIN users u ON fs.faculty_id = u.id 
                 WHERE fs.student_id = s.id),
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
            WHERE s.status != 'rejected'
            ORDER BY s.name ASC
        `);
        const { calculateStudentHours } = require('../utils/studentHoursHelper');
        const augmentedRows = await calculateStudentHours(rows, db);
        res.status(200).json({ success: true, data: augmentedRows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Daily Updates from Faculties
// @route   GET /api/ssc/daily-updates
exports.getDailyUpdates = async (req, res) => {
    try {
        const [updates] = await db.query(`
            SELECT r.*, 
                   s.name as student_name, 
                   s.grade as student_grade,
                   f.name as faculty_name 
            FROM timetable_reports r
            JOIN students s ON r.student_id = s.id
            JOIN users f ON r.faculty_id = f.id
            ORDER BY r.submitted_at DESC
        `);
        res.status(200).json({ success: true, data: updates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// SSC Timetable Controller Functions

const convertTo24Hour = (timeStr) => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(' ');
    if (!modifier) return timeStr;
    let [hours, minutes] = time.split(':');
    if (hours === '12') { hours = '00'; }
    if (modifier.toLowerCase() === 'pm') { hours = parseInt(hours, 10) + 12; }
    return `${hours}:${minutes}:00`;
};

exports.getFacultiesAll = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name FROM users WHERE role = 'faculty' ORDER BY name ASC");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMentorsAll = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name FROM users WHERE role = 'mentor' ORDER BY name ASC");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTimetable = async (req, res) => {
    try {
        const { start_date, end_date, student_id, status } = req.query;
        let query = `
            SELECT t.*, s.name as student_name, s.course, m.name as mentor_name 
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            LEFT JOIN users m ON t.mentor_id = m.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = 0)
        `;
        const params = [];

        if (start_date) { query += ' AND t.date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND t.date <= ?'; params.push(end_date); }
        if (student_id) { query += ' AND t.student_id = ?'; params.push(student_id); }
        if (status) { query += ' AND t.status = ?'; params.push(status); }

        query += ' ORDER BY t.date DESC, t.start_time ASC';

        const [rows] = await db.query(query, params);

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM timetable
            WHERE is_deleted IS NULL OR is_deleted = 0
        `);

        res.status(200).json({ success: true, data: rows, summary: stats[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, date, start_time, end_time, chapter, subject, session_type, status, notes, faculty_id, faculty_name } = req.body;
        
        if (!faculty_id) {
            return res.status(400).json({ success: false, message: "Please Add Faculty. Faculty is required to create a session." });
        }

        let finalFacultyName = faculty_name || null;
        if (faculty_id) {
            const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [faculty_id]);
            if (facObj) finalFacultyName = facObj.name;
        }

        const [student] = await connection.query('SELECT mentor_id FROM students WHERE id = ?', [student_id]);
        const mentor_id = student[0]?.mentor_id || null;

        const [maxSessionResult] = await connection.query('SELECT MAX(session_number) as max_sn FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ?', [student_id]);
        const nextSessionNumber = (maxSessionResult[0].max_sn || 0) + 1;

        const formattedStartTime = convertTo24Hour(start_time);
        const formattedEndTime = convertTo24Hour(end_time);

        const start = new Date(`1970-01-01T${formattedStartTime}`);
        const end = new Date(`1970-01-01T${formattedEndTime}`);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        const duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

        // Check for duplicates using complete business key
        const [existing] = await connection.query(
            'SELECT id FROM timetable WHERE student_id = ? AND date = ? AND start_time = ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [student_id, date, formattedStartTime]
        );
        if (existing.length > 0) {
            await connection.rollback();
            await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['DUPLICATE_TIMETABLE_PREVENTED', `Duplicate attempt for student ${student_id} on ${date}`, req.user.id, req.user.role]);
            return res.status(409).json({ success: false, message: "Duplicate timetable entry already exists for this slot." });
        }

        const [result] = await connection.query(`
            INSERT INTO timetable (mentor_id, student_id, session_number, date, start_time, end_time, duration, chapter, subject, session_type, status, notes, faculty_id, faculty_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [mentor_id, student_id, nextSessionNumber, date, formattedStartTime, formattedEndTime, duration, chapter, subject || null, session_type, status, notes, faculty_id || null, finalFacultyName]);

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

        await logAudit({
            action: 'CREATE_SESSION',
            entity_id: result.insertId,
            user_id: req.user.id,
            user_role: req.user.role,
            new_data: req.body,
            details: `SSC created session for student ${student_id}`
        });

        // Sync with faculty_sessions INSIDE the transaction
        try {
            await syncTimetableToFacultySession(result.insertId, connection);
        } catch (syncErr) {
            console.error("SSC Create Session Sync Error:", syncErr);
            throw new Error("Failed to sync timetable to faculty_session: " + syncErr.message);
        }

        // Verify sync relation only if faculty is assigned
        if (faculty_id) {
            const [syncVerify] = await connection.query('SELECT id FROM faculty_sessions WHERE timetable_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [result.insertId]);
            if (syncVerify.length === 0) {
                throw new Error(`CRITICAL FAILURE: Mandatory Sync Verification failed for Session ${result.insertId}.`);
            }
        }

        // Final COMMIT
        await connection.commit();
        res.status(201).json({ success: true, message: "Session created", data: { id: result.insertId } });
    } catch (error) {
        await connection.rollback();
        await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['CREATE_SESSION_FAILED', error.message, req.user.id, req.user.role]);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const sessionId = parseInt(req.params.id, 10);
        const { date, start_time, end_time, chapter, subject, session_type, status, status_reason, notes, faculty_id, faculty_name } = req.body;

        if (!faculty_id) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Please Add Faculty. Faculty is required for all sessions." });
        }

        let finalFacultyName = faculty_name || null;
        if (faculty_id) {
            const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [faculty_id]);
            if (facObj) finalFacultyName = facObj.name;
        }

        const formattedStartTime = convertTo24Hour(start_time);
        const formattedEndTime = convertTo24Hour(end_time);

        const start = new Date(`1970-01-01T${formattedStartTime}`);
        const end = new Date(`1970-01-01T${formattedEndTime}`);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        const duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

        const [[oldSession]] = await connection.query('SELECT * FROM timetable WHERE id = ?', [sessionId]);
        if (!oldSession) throw new Error("CRITICAL FAILURE: Session not found.");

        // Archive before update
        const { archiveTimetable } = require('../utils/archiver');
        await archiveTimetable(connection, oldSession.student_id, 'UPDATE_BEFORE', { id: req.user?.id, role: req.user?.role });

        // Duplicate Check
        const [existing] = await connection.query(
            'SELECT id FROM timetable WHERE student_id = ? AND date = ? AND start_time = ? AND id != ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [oldSession.student_id, date, formattedStartTime, sessionId]
        );
        if (existing.length > 0) {
            await connection.rollback();
            await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['DUPLICATE_TIMETABLE_PREVENTED', `Duplicate attempt during update for session ${sessionId}`, req.user?.id, req.user?.role]);
            return res.status(409).json({ success: false, message: "Duplicate timetable entry already exists for this slot." });
        }

        const [updateResult] = await connection.query(`
            UPDATE timetable 
            SET date = ?, start_time = ?, end_time = ?, duration = ?, chapter = ?, subject = ?, session_type = ?, status = ?, cancel_note = ?, notes = ?, faculty_id = ?, faculty_name = ?
            WHERE id = ?
        `, [date, formattedStartTime, formattedEndTime, duration, chapter, subject || null, session_type, status, status_reason || null, notes, faculty_id || null, finalFacultyName, sessionId]);

        if (updateResult.affectedRows === 0) {
            throw new Error("CRITICAL FAILURE: No records updated. Session may not exist.");
        }

        // Save Verification
        const saveVerifier = require('../utils/saveVerifier');
        await saveVerifier.verifySave(connection, 'timetable', sessionId, {
            date, start_time: formattedStartTime, end_time: formattedEndTime, subject: subject || null, faculty_id: faculty_id || null
        });

        // Referential Integrity Verification
        await saveVerifier.verifyReferentialIntegrity(connection, [
            { table: 'users_or_faculties', column: 'id', value: faculty_id || null }
        ]);

        await logAudit({
            action: 'UPDATE_SESSION',
            entity_id: sessionId,
            user_id: req.user.id,
            user_role: req.user.role,
            old_data: oldSession,
            new_data: req.body,
            details: `SSC updated session ${sessionId}`
        });

        // Sync with faculty_sessions INSIDE the transaction
        try {
            await syncTimetableToFacultySession(sessionId, connection);
        } catch (syncErr) {
            console.error("SSC Update Session Sync Error:", syncErr);
            throw new Error("Failed to sync updated timetable to faculty_session: " + syncErr.message);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Session updated" });
    } catch (error) {
        await connection.rollback();
        await db.query("INSERT INTO audit_logs (action, details, user_id, user_role) VALUES (?, ?, ?, ?)", ['UPDATE_SESSION_FAILED', error.message, req.user?.id, req.user?.role]);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const sessionId = req.params.id;
        const [[oldSession]] = await connection.query('SELECT * FROM timetable WHERE id = ?', [sessionId]);
        if (!oldSession) throw new Error("CRITICAL FAILURE: Session not found.");

        // Archive before delete
        const { archiveTimetable } = require('../utils/archiver');
        await archiveTimetable(connection, oldSession.student_id, 'DELETE_BEFORE', { id: req.user?.id, role: req.user?.role });

        const [updateResult] = await connection.query('UPDATE timetable SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
        
        if (updateResult.affectedRows === 0) {
            throw new Error("CRITICAL FAILURE: No records marked as deleted. Session may not exist.");
        }

        await logAudit({
            action: 'DELETE_SESSION',
            entity_id: sessionId,
            user_id: req.user.id,
            user_role: req.user.role,
            old_data: oldSession,
            details: `SSC deleted session ${sessionId}`
        });

        // Sync deletion with faculty_sessions INSIDE transaction
        try {
            await syncTimetableToFacultySession(sessionId, connection);
        } catch (syncErr) {
            console.error("SSC Delete Session Sync Error:", syncErr);
            throw new Error("Failed to sync deletion to faculty_session: " + syncErr.message);
        }

        // GUARANTEED DIRECT DELETE: Explicitly soft-delete faculty_sessions linked to this timetable
        // This is a safety net in case syncTimetableToFacultySession missed anything
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

exports.getStudentAcademicSchedule = async (req, res) => {
    try {
        const studentId = req.params.id;
        const [schedules] = await db.query(`
            SELECT fs.*, u.name as faculty_name 
            FROM faculty_schedules fs
            LEFT JOIN users u ON fs.faculty_id = u.id
            WHERE fs.student_id = ? AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            ORDER BY FIELD(fs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), fs.start_time ASC
        `, [studentId]);
        
        if (schedules && schedules.length > 0) {
            const [[student]] = await db.query('SELECT subjects_json FROM students WHERE id = ?', [studentId]);
            if (student && student.subjects_json) {
                let subjects = [];
                try {
                    subjects = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
                } catch (e) {}
                
                schedules.forEach(s => {
                    if (!s.faculty_id && s.subject) {
                        const matchingSubject = subjects.find(sub => sub.subject === s.subject);
                        if (matchingSubject && (matchingSubject.facultyId || matchingSubject.faculty_id)) {
                            s.faculty_id = matchingSubject.facultyId || matchingSubject.faculty_id;
                            s.faculty_name = matchingSubject.facultyName || matchingSubject.faculty_name || null;
                        }
                    }
                });
            }
            return res.status(200).json({ success: true, data: schedules });
        }

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
                    let pFacultyId = p.faculty_id || p.facultyId || null; // Removed fallback to student.faculty_id
                    let pFacultyName = p.faculty_name || p.facultyName || null; // Removed fallback to student.faculty_name
                    
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

                            if (!isDuplicate) {
                                generatedSchedules.push(newSlot);
                            }
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

exports.updateStudentAcademicSchedule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const studentId = req.params.id;
        const { schedules } = req.body;

        if (!schedules || !Array.isArray(schedules)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Invalid payload: schedules must be an array." });
        }

        // Validate and normalize required fields
        for (const s of schedules) {
            if (!s.day_of_week || !s.start_time || !s.end_time || !s.faculty_id) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "Invalid payload: Missing required schedule fields (day, start time, end time, faculty)." });
            }
            // Normalize time (e.g. "7.30 " -> "07:30:00", "6pm" -> "18:00:00")
            const cleanTime = (t) => {
                if (!t) return "00:00:00";
                let clean = t.replace(/\./g, ':').trim().toLowerCase();
                const isPM = clean.includes('pm');
                const isAM = clean.includes('am');
                clean = clean.replace(/[a-z\s]/g, '').trim();
                
                let parts = clean.split(':');
                let hh = parseInt(parts[0] || '0', 10);
                if (isNaN(hh)) hh = 0;
                if (isPM && hh < 12) hh += 12;
                if (isAM && hh === 12) hh = 0;
                
                let mm = parts[1] ? String(parts[1]).padEnd(2, '0').substring(0, 2) : '00';
                let ss = parts[2] ? String(parts[2]).padEnd(2, '0').substring(0, 2) : '00';
                return `${String(hh).padStart(2, '0')}:${mm}:${ss}`;
            };
            s.start_time = cleanTime(s.start_time);
            s.end_time = cleanTime(s.end_time);
        }

        await connection.query('UPDATE faculty_schedules SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE student_id = ?', [studentId]);

        let subjectsUpdated = false;
        const [[student]] = await connection.query('SELECT subjects_json, mentor_id FROM students WHERE id = ?', [studentId]);
        let subjects = [];
        if (student && student.subjects_json) {
            try {
                subjects = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
            } catch (e) {}
        }

        const insertedTimetableIds = [];

        if (schedules && Array.isArray(schedules) && schedules.length > 0) {
            for (const s of schedules) {
                const facId = s.faculty_id ? parseInt(s.faculty_id) : null;
                
                if (facId && s.subject) {
                    const matchingSubject = subjects.find(sub => sub.subject === s.subject);
                    if (matchingSubject && matchingSubject.faculty_id != facId && matchingSubject.facultyId != facId) {
                        matchingSubject.faculty_id = facId;
                        matchingSubject.facultyId = facId;
                        const [[facObj]] = await connection.query('SELECT name FROM users WHERE id = ?', [facId]);
                        if (facObj) {
                            matchingSubject.faculty_name = facObj.name;
                            matchingSubject.facultyName = facObj.name;
                        }
                        subjectsUpdated = true;
                    }
                }

                await connection.query(`
                    INSERT INTO faculty_schedules (student_id, day_of_week, start_time, end_time, subject, faculty_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [studentId, s.day_of_week, s.start_time, s.end_time, s.subject, facId]);
            }
            // Post-Insert Verification for faculty_schedules
            const [verifySchedulesRows] = await connection.query('SELECT COUNT(id) as count FROM faculty_schedules WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [studentId]);
            if (Number(verifySchedulesRows[0].count) !== schedules.length) {
                throw new Error(`CRITICAL FAILURE: Registration schedule save verification failed. Expected ${schedules.length} rows, found ${verifySchedulesRows[0].count}.`);
            }

            // ── AUTO-SYNC: Generate timetable entries for the next 4 weeks ──
            const dayMap = { Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };
            const actualMentorId = student?.mentor_id || null;

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

            // Soft delete all future regular classes for this student to wipe the old recurring schedule
            await connection.query(`
                UPDATE timetable 
                SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
                WHERE student_id = ? 
                  AND date >= CURRENT_DATE 
                  AND session_type = 'Regular Class' 
                  AND status = 'Scheduled'
            `, [studentId]);

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
                    const [result] = await connection.query(`
                        INSERT INTO timetable (mentor_id, student_id, session_number, date, start_time, end_time, duration, chapter, subject, session_type, status, notes, faculty_id, faculty_name, session_mode, is_deleted)
                        VALUES (?, ?, 0, ?, ?, ?, ?, '', ?, 'Regular Class', 'Scheduled', '', ?, ?, 'Online', 0)
                        ON DUPLICATE KEY UPDATE
                            is_deleted = 0,
                            mentor_id = VALUES(mentor_id),
                            end_time = VALUES(end_time),
                            duration = VALUES(duration),
                            subject = VALUES(subject),
                            faculty_id = VALUES(faculty_id),
                            faculty_name = VALUES(faculty_name),
                            status = 'Scheduled'
                    `, [actualMentorId, studentId, date, start24, end24, duration, s.subject || '', facId, faculty_name]);
                    
                    // We can't reliably get the insertId if it's an update in some cases, so we fetch it
                    const [existing] = await connection.query(
                        'SELECT id FROM timetable WHERE student_id = ? AND date = ? AND start_time = ? AND (is_deleted IS NULL OR is_deleted = 0)',
                        [studentId, date, start24]
                    );
                    if (existing.length > 0) {
                        insertedTimetableIds.push(existing[0].id);
                    }
                }
            }
            
            // Post-Insert Verification
            if (insertedTimetableIds.length > 0) {
                const [verifyRows] = await connection.query('SELECT COUNT(id) as count FROM timetable WHERE id IN (?)', [insertedTimetableIds]);
                if (Number(verifyRows[0].count) !== insertedTimetableIds.length) {
                    throw new Error(`CRITICAL FAILURE: Academic Schedule timetable generation verification failed. Expected ${insertedTimetableIds.length}, found ${verifyRows[0].count}`);
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
        
        if (subjectsUpdated) {
            await logFacultyChanges(studentId, subjects, req.user);
            await connection.query('UPDATE students SET subjects_json = ? WHERE id = ?', [JSON.stringify(subjects), studentId]);
        }

        let syncedCount = 0;
        // Sync generated sessions to faculty_sessions INSIDE the transaction
        for (const tid of insertedTimetableIds) {
            try {
                await syncTimetableToFacultySession(tid, connection);
                syncedCount++;
            } catch (err) {
                console.error("Academic schedule timetable sync error for ID", tid, err);
                throw new Error("Failed to sync timetable to faculty_session");
            }
        }

        // Verify faculty_sessions synchronization
        if (syncedCount !== insertedTimetableIds.length) {
            throw new Error(`CRITICAL FAILURE: faculty_sessions synchronization failed. Expected ${insertedTimetableIds.length} synced, found ${syncedCount}.`);
        }

        // Verify Academic Schedule visibility only if faculty was assigned
        const [visibilityCheck] = await connection.query(`
            SELECT COUNT(fs.id) as count
            FROM faculty_sessions fs
            LEFT JOIN session_attendance sa ON fs.id = sa.session_id
            LEFT JOIN timetable t ON fs.timetable_id = t.id
            WHERE (sa.student_id = ? OR t.student_id = ?) AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
        `, [studentId, studentId]);

        let timetablesWithFacultyCount = 0;
        if (insertedTimetableIds.length > 0) {
            const [withFacRows] = await connection.query('SELECT COUNT(id) as count FROM timetable WHERE id IN (?) AND faculty_id IS NOT NULL', [insertedTimetableIds]);
            timetablesWithFacultyCount = withFacRows[0].count;
        }

        if (Number(visibilityCheck[0].count) === 0 && timetablesWithFacultyCount > 0) {
            throw new Error(`CRITICAL FAILURE: Academic Schedule visibility verification failed. Zero sessions visible for student ${studentId}.`);
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

        res.status(200).json({ 
            success: true, 
            message: "Academic schedule updated successfully",
            report: {
                total_requested: schedules.length,
                total_saved: schedules.length,
                total_verified: schedules.length,
                failed: 0,
                skipped: 0,
                visibility_verified: true
            }
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.createBatchTimetable = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, sessions } = req.body;

        if (!sessions || sessions.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "No sessions provided" });
        }

        for (const s of sessions) {
            if (!s.faculty_id) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "Please Add Faculty. Faculty is required for all sessions." });
            }
        }

        const report = {
            total_requested: sessions.length,
            total_saved: 0,
            total_verified: 0,
            skipped_duplicates: 0,
            failed: 0
        };
        const insertedIds = [];

        const [[studentObj]] = await connection.query('SELECT mentor_id, subjects_json FROM students WHERE id = ?', [student_id]);
        const actualMentorId = studentObj?.mentor_id || null;
        
        let subjects = [];
        if (studentObj && studentObj.subjects_json) {
            try {
                subjects = typeof studentObj.subjects_json === 'string' ? JSON.parse(studentObj.subjects_json) : studentObj.subjects_json;
            } catch (e) {}
        }
        let subjectsUpdated = false;

        const [maxSessionResult] = await connection.query('SELECT MAX(session_number) as max_sn FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ?', [student_id]);
        let currentSessionNum = (maxSessionResult[0].max_sn || 0) + 1;

        for (const session of sessions) {
            const { date, start_time, end_time, chapter, session_type, notes, faculty_id, faculty_name, subject } = session;

            if (faculty_id && subject) {
               const matchingSubject = subjects.find(sub => sub.subject === subject);
               if (matchingSubject && matchingSubject.faculty_id != faculty_id && matchingSubject.facultyId != faculty_id) {
                   matchingSubject.faculty_id = faculty_id;
                   matchingSubject.facultyId = faculty_id;
                   matchingSubject.faculty_name = faculty_name;
                   matchingSubject.facultyName = faculty_name;
                   subjectsUpdated = true;
               }
            }

            const formattedStartTime = convertTo24Hour(start_time);
            const formattedEndTime = convertTo24Hour(end_time);

            // Check for duplicates
            const [existing] = await connection.query(
                'SELECT id FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ? AND date = ? AND start_time = ? AND end_time = ? AND (subject = ? OR (? IS NULL AND subject IS NULL)) AND (faculty_id = ? OR (? IS NULL AND faculty_id IS NULL))',
                [student_id, date, formattedStartTime, formattedEndTime, subject || null, subject || null, faculty_id || null, faculty_id || null]
            );
            if (existing.length > 0) {
                report.skipped_duplicates++;
                continue;
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

            try {
                const [result] = await connection.query(`
                    INSERT INTO timetable (mentor_id, student_id, session_number, date, start_time, end_time, duration, chapter, subject, session_type, status, notes, faculty_id, faculty_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [actualMentorId, student_id, currentSessionNum++, date, formattedStartTime, formattedEndTime, duration, chapter, subject || null, session_type || 'Regular Class', 'Scheduled', notes || '', faculty_id ? parseInt(faculty_id) : null, finalFacultyName]);
                
                insertedIds.push(result.insertId);
                report.total_saved++;
            } catch (err) {
                report.failed++;
                throw err; // Trigger rollback
            }
        }

        if (subjectsUpdated) {
            await connection.query('UPDATE students SET subjects_json = ? WHERE id = ?', [JSON.stringify(subjects), student_id]);
        }

        // Post-Insert Database Verification
        if (insertedIds.length > 0) {
            const [verificationResult] = await connection.query(
                'SELECT COUNT(id) as count FROM timetable WHERE id IN (?)',
                [insertedIds]
            );
            const verifiedCount = verificationResult[0].count;
            if (verifiedCount !== report.total_saved) {
                throw new Error(`CRITICAL FAILURE: Timetable verification failed. Expected ${report.total_saved} inserts, found ${verifiedCount}`);
            }
            report.total_verified = verifiedCount;
        }

        let syncedCount = 0;
        // Sync generated sessions to faculty_sessions INSIDE the transaction
        for (const tid of insertedIds) {
            try {
                await syncTimetableToFacultySession(tid, connection);
                syncedCount++;
            } catch (err) {
                console.error("Batch timetable sync error for ID", tid, err);
                throw new Error("Failed to sync timetable to faculty_session");
            }
        }

        // Mandatory Sync Verification
        if (syncedCount !== insertedIds.length) {
            throw new Error(`CRITICAL FAILURE: Mandatory Sync Verification failed. Timetable count (${insertedIds.length}) != Faculty Session sync count (${syncedCount}).`);
        }

        await connection.commit();

        res.status(201).json({ success: true, message: "Batch timetable created", report });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};
