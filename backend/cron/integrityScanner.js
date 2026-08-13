const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../integrity_report.json');

const scanIntegrity = async () => {
    console.log("Starting Timetable Integrity Scan...");
    const report = {
        last_scanned: new Date().toISOString(),
        missing_timetables: [],
        orphan_sessions: [],
        mismatched_hours: [],
        summary: {
            total_active_students: 0,
            missing_timetables_count: 0,
            orphan_sessions_count: 0,
            mismatched_hours_count: 0,
            status: "HEALTHY"
        }
    };

    try {
        // 1. Missing Timetables: Active students with NO timetable records at all
        const [missingTimetables] = await db.query(`
            SELECT s.id, s.name, s.grade, s.course 
            FROM students s
            LEFT JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(t.id) = 0
        `);
        report.missing_timetables = missingTimetables;
        report.summary.missing_timetables_count = missingTimetables.length;

        const [activeStudents] = await db.query(`SELECT COUNT(*) as count FROM students WHERE status = 'active'`);
        report.summary.total_active_students = activeStudents[0].count;

        // 2. Orphan Sessions: Faculty sessions that point to a non-existent or deleted timetable
        // (Excluding standalone sessions where timetable_id IS NULL)
        const [orphanSessions] = await db.query(`
            SELECT fs.id as session_id, fs.timetable_id, fs.faculty_id, fs.topic, fs.date 
            FROM faculty_sessions fs
            LEFT JOIN timetable t ON fs.timetable_id = t.id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE fs.timetable_id IS NOT NULL AND t.id IS NULL
        `);
        report.orphan_sessions = orphanSessions;
        report.summary.orphan_sessions_count = orphanSessions.length;

        // 3. Optional: Mismatched Hours Check could go here.
        // For now, we leave it empty to keep performance high, but the array is ready.

        // Determine Status
        if (report.summary.missing_timetables_count > 0 || report.summary.orphan_sessions_count > 0) {
            report.summary.status = "FAILED";
        }

        // Save report
        fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
        console.log(`Scan complete. Found ${report.summary.missing_timetables_count} missing timetables and ${report.summary.orphan_sessions_count} orphan sessions.`);
    } catch (error) {
        console.error("Error during integrity scan:", error);
    }
};

// Export to allow manual running or cron scheduling
module.exports = scanIntegrity;

// If run directly via node
if (require.main === module) {
    scanIntegrity().then(() => process.exit(0));
}
