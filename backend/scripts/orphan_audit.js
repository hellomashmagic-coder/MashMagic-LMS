const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runOrphanAudit() {
    console.log("Starting Phase 1.5: Orphan Record Detection...");
    try {
        let report = {
            orphaned_timetables: [],
            orphaned_faculty_sessions: [],
            orphaned_interaction_logs: [],
            orphaned_mentor_session_reports: []
        };

        // 1. Orphaned timetables (student doesn't exist)
        const [timetables] = await db.query('SELECT * FROM faculty_timetable WHERE student_id NOT IN (SELECT id FROM students)');
        report.orphaned_timetables = timetables.map(t => t.id);

        // 2. Orphaned faculty sessions
        const [sessions] = await db.query('SELECT * FROM faculty_sessions WHERE student_id NOT IN (SELECT id FROM students)');
        report.orphaned_faculty_sessions = sessions.map(s => s.id);

        // 3. Orphaned interaction logs
        const [interactionLogs] = await db.query('SELECT * FROM student_interaction_logs WHERE student_id NOT IN (SELECT id FROM students)');
        report.orphaned_interaction_logs = interactionLogs.map(l => l.id);

        // 4. Orphaned mentor reports
        const [mentorReports] = await db.query('SELECT * FROM mentor_session_reports WHERE student_id NOT IN (SELECT id FROM students)');
        report.orphaned_mentor_session_reports = mentorReports.map(r => r.id);

        const reportPath = path.join(__dirname, '../../orphan_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log("Orphan report generated at orphan_report.json");
        
    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        process.exit(0);
    }
}

runOrphanAudit();
