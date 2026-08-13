const db = require('../config/db');

async function syncTimetableToFacultySession(timetableId, conn = null) {
    const queryExecutor = conn || db;
    try {
        // Fetch timetable session details
        const [[timetableSession]] = await queryExecutor.query('SELECT * FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND id = ?', [timetableId]);
        if (!timetableSession) {
            // Timetable session was deleted - find and delete synced faculty_sessions
            const [[existingSync]] = await queryExecutor.query('SELECT id FROM faculty_sessions WHERE timetable_id = ?', [timetableId]);
            if (existingSync) {
                await queryExecutor.query('UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ?', [existingSync.id]);
                await queryExecutor.query('UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [existingSync.id]);
            }
            return;
        }

        const {
            faculty_id, student_id, date, start_time, end_time, chapter, session_type, status, duration
        } = timetableSession;

        // If no faculty is assigned yet, delete any existing sync
        if (!faculty_id) {
            const [[existingSync]] = await queryExecutor.query('SELECT id FROM faculty_sessions WHERE timetable_id = ?', [timetableId]);
            if (existingSync) {
                await queryExecutor.query('UPDATE session_attendance SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE session_id = ?', [existingSync.id]);
                await queryExecutor.query('UPDATE faculty_sessions SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [existingSync.id]);
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
        const [[existingSync]] = await queryExecutor.query(
            'SELECT id, minutes_locked, minutes_taken FROM faculty_sessions WHERE timetable_id = ?',
            [timetableId]
        );

        if (existingSync) {
            const sessionId = existingSync.id;
            
            let newMinutesTaken = existingSync.minutes_locked ? existingSync.minutes_taken : minutes_taken;
            let newMinutesLocked = existingSync.minutes_locked ? existingSync.minutes_locked : minutes_locked;
            
            // If session is reverted back to Scheduled, unlock it to prevent deadlocks
            if (status === 'Scheduled') {
                newMinutesLocked = 0;
            }

            await queryExecutor.query('SET FOREIGN_KEY_CHECKS=0;');
            
            await queryExecutor.query(`
                UPDATE faculty_sessions 
                SET faculty_id = ?, topic = ?, date = ?, start_time = ?, end_time = ?, status = ?, duration = ?, minutes_taken = ?, minutes_locked = ?
                WHERE id = ?
            `, [faculty_id, topic, date, start_time, end_time, status, duration, newMinutesTaken, newMinutesLocked, sessionId]);

            // Sync student ID in session attendance
            await queryExecutor.query(`
                UPDATE session_attendance 
                SET student_id = ? 
                WHERE session_id = ?
            `, [student_id, sessionId]);

            await queryExecutor.query('SET FOREIGN_KEY_CHECKS=1;');
        } else {
            await queryExecutor.query('SET FOREIGN_KEY_CHECKS=0;');
            
            const [fsResult] = await queryExecutor.query(`
                INSERT INTO faculty_sessions (timetable_id, faculty_id, topic, date, start_time, end_time, status, duration, minutes_taken, minutes_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [timetableId, faculty_id, topic, date, start_time, end_time, status, duration, minutes_taken, minutes_locked]);

            const sessionId = fsResult.insertId;

            await queryExecutor.query(`
                INSERT INTO session_attendance (session_id, student_id, status)
                VALUES (?, ?, 'Present')
            `, [sessionId, student_id]);

            await queryExecutor.query('SET FOREIGN_KEY_CHECKS=1;');
        }
    } catch (error) {
        console.error('Error in syncTimetableToFacultySession:', error.message);
        throw new Error('Sync to Academic Schedule failed: ' + error.message);
    }
}

module.exports = {
    syncTimetableToFacultySession
};
