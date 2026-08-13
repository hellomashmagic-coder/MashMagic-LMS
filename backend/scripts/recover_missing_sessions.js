const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const { syncTimetableToFacultySession } = require('../utils/timetableSync');

async function runRecovery() {
    console.log("=================================================");
    console.log("RECOVERY SCRIPT: RESTORE MISSING FACULTY SESSIONS");
    console.log("=================================================");

    const report = {
        before: {
            total_timetable: 0,
            total_faculty_sessions: 0,
            orphaned_timetable: 0,
            affected_students: 0
        },
        recovery: {
            total_scanned: 0,
            recovered_count: 0,
            failed_count: 0,
            student_details: {}
        },
        after: {
            total_timetable: 0,
            total_faculty_sessions: 0
        }
    };

    try {
        console.log("Generating BEFORE snapshot...");
        
        const [[ttBefore]] = await db.query('SELECT COUNT(id) as count FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0)');
        const [[fsBefore]] = await db.query('SELECT COUNT(id) as count FROM faculty_sessions WHERE (is_deleted IS NULL OR is_deleted = 0)');
        
        const [orphanedRows] = await db.query(`
            SELECT t.id, t.student_id, s.name as student_name
            FROM timetable t
            LEFT JOIN faculty_sessions fs ON t.id = fs.timetable_id AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            LEFT JOIN students s ON t.student_id = s.id
            WHERE (t.is_deleted IS NULL OR t.is_deleted = 0)
            AND fs.id IS NULL
        `);

        const affectedStudents = new Set(orphanedRows.map(r => r.student_id));

        report.before.total_timetable = ttBefore.count;
        report.before.total_faculty_sessions = fsBefore.count;
        report.before.orphaned_timetable = orphanedRows.length;
        report.before.affected_students = affectedStudents.size;

        console.log(`BEFORE SNAPSHOT:`);
        console.log(`- Total Timetable: ${report.before.total_timetable}`);
        console.log(`- Total Faculty Sessions: ${report.before.total_faculty_sessions}`);
        console.log(`- Orphaned Timetable (Missing Sessions): ${report.before.orphaned_timetable}`);
        console.log(`- Affected Students: ${report.before.affected_students}`);

        if (report.before.orphaned_timetable === 0) {
            console.log("No orphaned records found. Exiting safely.");
            process.exit(0);
        }

        console.log("\nStarting Recovery Process...");

        for (const t of orphanedRows) {
            report.recovery.total_scanned++;
            
            if (!report.recovery.student_details[t.student_id]) {
                report.recovery.student_details[t.student_id] = {
                    student_id: t.student_id,
                    student_name: t.student_name || 'Unknown',
                    missing_count: 0,
                    recovered_count: 0,
                    failed_count: 0
                };
            }
            
            report.recovery.student_details[t.student_id].missing_count++;

            try {
                await syncTimetableToFacultySession(t.id);
                report.recovery.recovered_count++;
                report.recovery.student_details[t.student_id].recovered_count++;
            } catch (err) {
                console.error(`Failed to sync timetable ID ${t.id}:`, err.message);
                report.recovery.failed_count++;
                report.recovery.student_details[t.student_id].failed_count++;
            }
        }

        console.log("\nGenerating AFTER snapshot...");
        
        const [[ttAfter]] = await db.query('SELECT COUNT(id) as count FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0)');
        const [[fsAfter]] = await db.query('SELECT COUNT(id) as count FROM faculty_sessions WHERE (is_deleted IS NULL OR is_deleted = 0)');
        
        report.after.total_timetable = ttAfter.count;
        report.after.total_faculty_sessions = fsAfter.count;

        console.log(`AFTER SNAPSHOT:`);
        console.log(`- Total Timetable: ${report.after.total_timetable}`);
        console.log(`- Total Faculty Sessions: ${report.after.total_faculty_sessions}`);

        console.log("\nVerification Rule Check:");
        const expectedFacultySessions = report.before.total_faculty_sessions + report.recovery.recovered_count;
        console.log(`${report.before.total_faculty_sessions} (before) + ${report.recovery.recovered_count} (recovered) = ${expectedFacultySessions} (Expected)`);
        console.log(`Actual After Count: ${report.after.total_faculty_sessions}`);

        if (expectedFacultySessions !== report.after.total_faculty_sessions) {
            console.error("CRITICAL ERROR: Verification Rule Failed! Mismatch detected.");
            console.error("Please review the database logs. No records were deleted, but sync count is anomalous.");
        } else {
            console.log("Verification Passed Successfully.");
        }

        console.log("\n=================================================");
        console.log("RECOVERY COMPLETE.");
        console.log("=================================================");
        console.log("Detailed Student Report:");
        for (const sid in report.recovery.student_details) {
            const detail = report.recovery.student_details[sid];
            console.log(`Student ID: ${detail.student_id} | Name: ${detail.student_name} | Missing: ${detail.missing_count} | Recovered: ${detail.recovered_count} | Failed: ${detail.failed_count}`);
        }

    } catch (error) {
        console.error("FATAL ERROR IN RECOVERY SCRIPT:", error);
    }

    process.exit(0);
}

runRecovery();
