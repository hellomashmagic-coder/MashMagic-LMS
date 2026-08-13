const db = require('../config/db');
const AuditService = require('../services/auditService');

// Safe list of tables that support soft delete and recovery
const ALLOWED_TABLES = [
    'students', 'mentors', 'faculties', 'users', 'timetable', 
    'tasks', 'faculty_schedules', 'student_interaction_logs', 
    'faculty_interaction_logs'
];

exports.getDeletedRecords = async (req, res) => {
    try {
        const { table } = req.query;
        if (!table || !ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing table parameter' });
        }

        const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE is_deleted = 1 ORDER BY deleted_at DESC LIMIT 100`);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("GET_DELETED_RECORDS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.restoreRecord = async (req, res) => {
    const { table, id } = req.body;
    let transactionStarted = false;

    try {
        if (!table || !ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ success: false, message: 'Invalid table parameter' });
        }
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID is required' });
        }

        // --- BEGIN TRANSACTION ---
        await db.query('START TRANSACTION');
        transactionStarted = true;

        // Verify record exists and is actually deleted
        const [records] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ? AND is_deleted = 1`, [id]);
        if (records.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Deleted record not found' });
        }
        const oldState = records[0];

        // Ensure restore validation prevents duplicates (Phase 3.4)
        // E.g., if restoring a student, check if their email or registration number is now taken by an active record
        if (table === 'students') {
            const [dups] = await db.query(
                `SELECT id FROM students WHERE (email = ? OR registration_number = ?) AND (is_deleted IS NULL OR is_deleted = 0)`, 
                [oldState.email, oldState.registration_number]
            );
            if (dups.length > 0) {
                await db.query('ROLLBACK');
                return res.status(409).json({ success: false, message: 'Cannot restore: Email or Registration Number conflicts with an existing active student.' });
            }
        }

        // Restore the record
        await db.query(`UPDATE \`${table}\` SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`, [id]);

        // Fetch the new state
        const [newRecords] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
        const newState = newRecords[0];

        // Audit Logging
        const userId = req.user ? req.user.id : null;
        const userRole = req.user ? req.user.role : 'System';
        await AuditService.logAction(table, id, 'RESTORE', oldState, newState, userId, userRole);

        // --- COMMIT TRANSACTION ---
        await db.query('COMMIT');
        res.status(200).json({ success: true, message: 'Record restored successfully' });
    } catch (error) {
        if (transactionStarted) {
            await db.query('ROLLBACK');
        }
        console.error("RESTORE_RECORD_ERROR:", error);
        res.status(500).json({ success: false, message: "Restore failed: " + error.message });
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { table, record_id, limit = 100 } = req.query;
        let query = 'SELECT * FROM audit_logs';
        const params = [];
        const conditions = [];

        if (table) {
            conditions.push('table_name = ?');
            params.push(table);
        }
        if (record_id) {
            conditions.push('record_id = ?');
            params.push(record_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [rows] = await db.query(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("GET_AUDIT_LOGS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
