const fs = require('fs');
const path = require('path');
const db = require('../config/db'); // Adjust path as needed


// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

async function logAudit({ action, entity = 'database', entity_id = null, user_id = null, user_role = null, old_data = null, new_data = null, details = null }) {
    try {
        await db.query(
            'INSERT INTO audit_logs (action, entity, entity_id, user_id, user_role, old_data, new_data, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [action, entity, entity_id, user_id, user_role, old_data ? JSON.stringify(old_data) : null, new_data ? JSON.stringify(new_data) : null, details]
        );
    } catch (e) { /* ignore */ }
}

async function runIntegrityCheck() {
    const connection = await db.getConnection();
    console.log("Starting Daily Database Integrity Check...");

    try {
        const report = {
            date: new Date().toISOString(),
            metrics: {},
            issues: {}
        };

        // Metrics queries
        const queries = {
            active_students: 'SELECT COUNT(*) as count FROM students WHERE is_active = 1',
            faculty_members: "SELECT COUNT(*) as count FROM users WHERE role = 'faculty'",
            active_timetable: 'SELECT COUNT(*) as count FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0)',
            faculty_schedules: 'SELECT COUNT(*) as count FROM faculty_schedules WHERE (is_deleted IS NULL OR is_deleted = 0)',
            faculty_sessions: 'SELECT COUNT(*) as count FROM faculty_sessions WHERE (is_deleted IS NULL OR is_deleted = 0)',
            attendance_records: 'SELECT COUNT(*) as count FROM session_attendance',
            archive_records: 'SELECT (SELECT COUNT(*) FROM timetable_archives) + (SELECT COUNT(*) FROM faculty_sessions_archives) as count'
        };

        for (const [key, query] of Object.entries(queries)) {
            const [[result]] = await connection.query(query);
            report.metrics[key] = result.count || 0;
        }

        // Issue Queries
        const issueQueries = {
            orphan_timetable: 'SELECT COUNT(*) as count FROM timetable t LEFT JOIN students s ON t.student_id = s.id WHERE s.id IS NULL AND (t.is_deleted IS NULL OR t.is_deleted = 0)',
            orphan_faculty_sessions: 'SELECT COUNT(*) as count FROM faculty_sessions fs LEFT JOIN faculties f ON fs.faculty_id = f.id WHERE fs.faculty_id IS NOT NULL AND f.id IS NULL AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)',
            orphan_attendance: 'SELECT COUNT(*) as count FROM session_attendance sa LEFT JOIN faculty_sessions fs ON sa.session_id = fs.id WHERE fs.id IS NULL',
            duplicate_timetable: `SELECT COUNT(*) as count FROM (
                SELECT student_id, faculty_id, subject, date, start_time, end_time 
                FROM timetable 
                WHERE (is_deleted IS NULL OR is_deleted = 0)
                GROUP BY student_id, faculty_id, subject, date, start_time, end_time 
                HAVING COUNT(*) > 1
            ) dupes`,
            duplicate_faculty_sessions: `SELECT COUNT(*) as count FROM (
                SELECT faculty_id, topic, date 
                FROM faculty_sessions 
                WHERE (is_deleted IS NULL OR is_deleted = 0)
                GROUP BY faculty_id, topic, date 
                HAVING COUNT(*) > 1
            ) dupes`,
            invalid_student_references: 'SELECT COUNT(*) as count FROM timetable t LEFT JOIN students s ON t.student_id = s.id WHERE s.id IS NULL',
            invalid_faculty_references: 'SELECT COUNT(*) as count FROM timetable t LEFT JOIN faculties f ON t.faculty_id = f.id WHERE t.faculty_id IS NOT NULL AND f.id IS NULL',
            archive_mismatch_count: 'SELECT COUNT(*) as count FROM timetable t WHERE t.is_deleted = 1 AND NOT EXISTS (SELECT 1 FROM timetable_archives a WHERE a.original_id = t.id)'
        };

        for (const [key, query] of Object.entries(issueQueries)) {
            const [[result]] = await connection.query(query);
            report.issues[key] = result.count || 0;
        }

        // Generate report file
        const reportName = `db_health_report_${new Date().toISOString().split('T')[0]}.json`;
        const reportPath = path.join(reportsDir, reportName);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Determine health status
        const totalIssues = Object.values(report.issues).reduce((sum, val) => sum + val, 0);
        const healthStatus = totalIssues === 0 ? 'HEALTHY' : 'ISSUES_DETECTED';

        // Log to audit
        await logAudit({
            action: 'DAILY_DB_HEALTH_CHECK',
            details: `Database health check completed. Status: ${healthStatus}. Found ${totalIssues} potential issues. Report saved to ${reportName}`,
            user_id: 1, // System admin
            user_role: 'admin',
            new_data: { totalIssues, reportName }
        });

        // Generate Admin Notification if issues detected
        if (totalIssues > 0) {
            await connection.query(`
                INSERT INTO admin_notifications (message, action_type, is_read)
                VALUES (?, ?, 0)
            `, [
                `CRITICAL: Daily integrity check found ${totalIssues} data inconsistencies. Please review ${reportName}.`,
                'database_integrity'
            ]);
        }

        console.log(`Database Integrity Check finished. Status: ${healthStatus}`);
        return report;
    } catch (error) {
        console.error("Integrity Checker Error:", error);
        await logAudit({
            action: 'DAILY_DB_HEALTH_CHECK_FAILED',
            details: `Integrity check failed: ${error.message}`,
            user_id: 1,
            user_role: 'admin'
        });
        throw error;
    } finally {
        connection.release();
    }
}

// Support running directly
if (require.main === module) {
    runIntegrityCheck()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runIntegrityCheck };
