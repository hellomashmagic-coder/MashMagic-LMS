async function captureAndArchive(conn, tableName, archiveTableName, studentId, actionType, user) {
    try {
        if (!studentId) return;
        
        let query = `SELECT * FROM ${tableName} WHERE `;
        
        if (tableName === 'students') {
            query += 'id = ?';
        } else {
            query += 'student_id = ?';
        }

        const [rows] = await conn.query(query, [studentId]);

        if (!rows || rows.length === 0) return;

        const snapshotJson = JSON.stringify(rows);
        const userId = user && user.id ? user.id : null;
        const userRole = user && user.role ? user.role : 'System';

        await conn.query(
            `INSERT INTO ${archiveTableName} (student_id, action_type, user_id, user_role, full_json_snapshot) VALUES (?, ?, ?, ?, ?)`,
            [studentId, actionType, userId, userRole, snapshotJson]
        );
    } catch (e) {
        console.error(`[ARCHIVER ERROR] Failed to archive ${tableName} to ${archiveTableName}:`, e.message);
        throw new Error(`Archive Protection Failed for ${tableName}: ${e.message}`);
    }
}

async function archiveStudent(conn, studentId, actionType = 'UPDATE', user = null) {
    await captureAndArchive(conn, 'students', 'student_archive', studentId, actionType, user);
}

async function archiveTimetable(conn, studentId, actionType = 'UPDATE', user = null) {
    await captureAndArchive(conn, 'timetable', 'timetable_archive', studentId, actionType, user);
}

async function archiveFacultySchedule(conn, studentId, actionType = 'UPDATE', user = null) {
    await captureAndArchive(conn, 'faculty_schedules', 'faculty_schedule_archive', studentId, actionType, user);
}

async function archiveAcademicSchedule(conn, studentId, actionType = 'UPDATE', user = null) {
    // Academic Schedule usually refers to faculty_sessions or timetable depending on context.
    // But there is a table called 'academic_schedule_archive' requested. 
    // Usually the academic schedule table might be 'faculty_sessions' for the student.
    await captureAndArchive(conn, 'faculty_sessions', 'academic_schedule_archive', studentId, actionType, user);
}

module.exports = {
    archiveStudent,
    archiveTimetable,
    archiveFacultySchedule,
    archiveAcademicSchedule
};
