const db = require('../config/db');

/**
 * AuditService handles logging of critical state changes (INSERT, UPDATE, SOFT_DELETE, RESTORE)
 * to ensure a full history of the database operations is kept.
 */
class AuditService {
    /**
     * Log a database action
     * @param {string} tableName - The name of the table being modified
     * @param {number} recordId - The ID of the record being modified
     * @param {string} actionType - 'INSERT', 'UPDATE', 'SOFT_DELETE', 'RESTORE'
     * @param {Object} oldData - The state of the record before the change (can be null for INSERT)
     * @param {Object} newData - The state of the record after the change (can be null for SOFT_DELETE)
     * @param {number} userId - The ID of the user performing the action
     * @param {string} userRole - The role of the user performing the action
     */
    static async logAction(tableName, recordId, actionType, oldData = null, newData = null, userId = null, userRole = null) {
        try {
            await db.query(
                `INSERT INTO audit_logs (table_name, record_id, action_type, old_data, new_data, performed_by, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tableName,
                    recordId,
                    actionType,
                    oldData ? JSON.stringify(oldData) : null,
                    newData ? JSON.stringify(newData) : null,
                    userId,
                    userRole
                ]
            );
        } catch (error) {
            console.error(`[AuditService Error] Failed to log action for ${tableName} ID ${recordId}:`, error.message);
            // We usually don't want audit failures to block the main transaction, but we log them heavily
        }
    }

    /**
     * Helper to fetch old data before an update/delete
     */
    static async getRecordState(tableName, recordId) {
        try {
            const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error(`[AuditService Error] Failed to fetch state for ${tableName} ID ${recordId}:`, error.message);
            return null;
        }
    }
}

module.exports = AuditService;
