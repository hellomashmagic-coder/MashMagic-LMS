const db = require('../config/db');
const saveVerifier = require('../utils/saveVerifier');
const { logAudit } = require('../utils/auditLogger');
const { syncTimetableToFacultySession } = require('../utils/timetableSync');

/**
 * Safely recovers a student's timetable and faculty_sessions from archive
 * up to a specific timestamp.
 */
async function recoverFromArchive(studentId, targetTimestamp) {
    if (!studentId || !targetTimestamp) {
        console.error("Usage: node recover_from_archive.js <studentId> <YYYY-MM-DD HH:MM:SS>");
        process.exit(1);
    }

    const connection = await db.getConnection();
    try {
        console.log(`Starting recovery for Student ID: ${studentId} up to ${targetTimestamp}`);
        await connection.beginTransaction();

        // Find archived timetable records
        const [archivedTimetables] = await connection.query(`
            SELECT * FROM timetable_archives 
            WHERE student_id = ? AND archived_at <= ?
            ORDER BY archived_at DESC
        `, [studentId, targetTimestamp]);

        if (archivedTimetables.length === 0) {
            console.log("No archived records found for the given criteria.");
            await connection.rollback();
            return;
        }

        let recoveredCount = 0;

        for (const archive of archivedTimetables) {
            // Check if record is currently marked as deleted
            const [[currentRecord]] = await connection.query('SELECT id, is_deleted FROM timetable WHERE id = ?', [archive.original_id]);
            
            if (currentRecord && currentRecord.is_deleted === 1) {
                // Validate before restoring
                // 1. Duplicate check
                const [dupeCheck] = await connection.query(`
                    SELECT id FROM timetable 
                    WHERE student_id = ? AND faculty_id <=> ? AND subject <=> ? AND date = ? AND start_time = ? AND end_time = ? AND id != ? AND (is_deleted IS NULL OR is_deleted = 0)
                `, [archive.student_id, archive.faculty_id, archive.subject, archive.date, archive.start_time, archive.end_time, archive.original_id]);

                if (dupeCheck.length > 0) {
                    console.log(`Skipping recovery of session ${archive.original_id}: Duplicate detected.`);
                    continue;
                }

                // 2. Referential integrity check
                await saveVerifier.verifyReferentialIntegrity(connection, [
                    { table: 'students', column: 'id', value: archive.student_id },
                    { table: 'faculties', column: 'id', value: archive.faculty_id }
                ]);

                // Restore
                const [restoreResult] = await connection.query(`
                    UPDATE timetable 
                    SET is_deleted = 0, deleted_at = NULL, mentor_id = ?, session_number = ?, date = ?, start_time = ?, end_time = ?, duration = ?, chapter = ?, subject = ?, session_type = ?, status = ?, status_reason = ?, notes = ?, faculty_id = ?, faculty_name = ?, session_mode = ?
                    WHERE id = ?
                `, [
                    archive.mentor_id, archive.session_number, archive.date, archive.start_time, archive.end_time, archive.duration, archive.chapter, archive.subject, archive.session_type, archive.status, archive.status_reason, archive.notes, archive.faculty_id, archive.faculty_name, archive.session_mode,
                    archive.original_id
                ]);

                if (restoreResult.affectedRows > 0) {
                    recoveredCount++;
                    // Restore sync to faculty sessions
                    await syncTimetableToFacultySession(archive.original_id, connection);
                }
            }
        }

        await logAudit({
            action: 'RECOVER_FROM_ARCHIVE',
            details: `Recovered ${recoveredCount} records for student ${studentId} from archive.`,
            user_id: 1, // System admin
            user_role: 'admin',
            new_data: { recoveredCount, studentId, targetTimestamp }
        });

        await connection.commit();
        console.log(`Recovery successful! Restored ${recoveredCount} records.`);

    } catch (error) {
        await connection.rollback();
        console.error("Recovery failed:", error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

if (require.main === module) {
    const studentId = process.argv[2];
    const timestamp = process.argv[3];
    recoverFromArchive(studentId, timestamp);
}

module.exports = { recoverFromArchive };
