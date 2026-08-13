/**
 * SSC TIMETABLE INTEGRITY INVESTIGATION SCRIPT
 * 
 * Investigates all students for SSC timetable status:
 * 1. Active students with timetable = 0 (missing)
 * 2. Students whose timetable records are soft-deleted (is_deleted=1), but faculty_schedules still active
 * 3. Students with faculty_sessions but no timetable
 * 4. Students with timetable but no faculty_sessions
 * 5. Root cause per category (sourced from audit_logs if available)
 * 
 * Run from: e:\my works\MashMagic-LMS-Dashboard\backend
 * Command: node ssc_integrity_check.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');

function sep(title) {
    console.log('\n' + '='.repeat(70));
    console.log('  ' + title);
    console.log('='.repeat(70));
}

async function run() {
    try {
        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 1: Active students with 0 timetable records (active + not deleted)
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-1: Active students with 0 timetable records');
        const [cat1] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                s.created_at as registered_at,
                COUNT(DISTINCT fs.id) as faculty_schedules_count,
                COUNT(DISTINCT t.id) as timetable_count
            FROM students s
            LEFT JOIN faculty_schedules fs ON s.id = fs.student_id AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            LEFT JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(DISTINCT t.id) = 0
            ORDER BY s.id ASC
        `);
        console.log(`Total affected: ${cat1.length}`);
        cat1.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | onboarding=${r.onboarding_status} | faculty_schedules=${r.faculty_schedules_count} | timetable=${r.timetable_count} | registered=${r.registered_at?.toISOString?.()?.split('T')[0] || r.registered_at}`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 2: Students whose timetable records are soft-deleted (is_deleted=1)
        //             but faculty_schedules still active
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-2: Students with soft-deleted timetable but active faculty_schedules');
        const [cat2] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                COUNT(DISTINCT fs.id) as active_faculty_schedules,
                COUNT(DISTINCT td.id) as deleted_timetable_rows,
                MIN(td.deleted_at) as first_deletion,
                MAX(td.deleted_at) as last_deletion
            FROM students s
            JOIN faculty_schedules fs ON s.id = fs.student_id AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            JOIN timetable td ON s.id = td.student_id AND td.is_deleted = 1
            LEFT JOIN timetable ta ON s.id = ta.student_id AND (ta.is_deleted IS NULL OR ta.is_deleted = 0)
            WHERE ta.id IS NULL
            GROUP BY s.id
            ORDER BY s.id ASC
        `);
        console.log(`Total affected: ${cat2.length}`);
        cat2.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | active_schedules=${r.active_faculty_schedules} | deleted_timetable_rows=${r.deleted_timetable_rows} | first_deletion=${r.first_deletion?.toISOString?.()?.split('T')[0] || r.first_deletion} | last_deletion=${r.last_deletion?.toISOString?.()?.split('T')[0] || r.last_deletion}`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 3: Students with faculty_sessions but NO active timetable
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-3: Students with faculty_sessions but no active timetable');
        const [cat3] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                COUNT(DISTINCT fses.id) as faculty_session_count,
                COUNT(DISTINCT t.id) as active_timetable_count
            FROM students s
            JOIN faculty_sessions fses ON (
                fses.id IN (
                    SELECT sa.session_id FROM session_attendance sa WHERE sa.student_id = s.id
                ) OR fses.timetable_id IN (
                    SELECT tt.id FROM timetable tt WHERE tt.student_id = s.id
                )
            )
            AND (fses.is_deleted IS NULL OR fses.is_deleted = 0)
            LEFT JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(DISTINCT t.id) = 0
            ORDER BY s.id ASC
        `);
        console.log(`Total affected: ${cat3.length}`);
        cat3.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | onboarding=${r.onboarding_status} | faculty_sessions=${r.faculty_session_count} | active_timetable=${r.active_timetable_count}`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 4: Students with active timetable but NO faculty_sessions
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-4: Students with active timetable but NO faculty_sessions');
        const [cat4] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                COUNT(DISTINCT t.id) as active_timetable_count,
                COUNT(DISTINCT fses.id) as faculty_session_count
            FROM students s
            JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            LEFT JOIN faculty_sessions fses ON (
                fses.timetable_id = t.id OR fses.id IN (
                    SELECT sa.session_id FROM session_attendance sa WHERE sa.student_id = s.id
                )
            ) AND (fses.is_deleted IS NULL OR fses.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(DISTINCT fses.id) = 0
            ORDER BY s.id ASC
        `);
        console.log(`Total affected: ${cat4.length}`);
        cat4.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | onboarding=${r.onboarding_status} | active_timetable=${r.active_timetable_count} | faculty_sessions=${r.faculty_session_count}`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 5: Cross-reference – students where faculty_schedules > 0 AND timetable = 0
        //             Sub-classified by onboarding_status
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-5: faculty_schedules > 0 AND timetable = 0 (cross-reference)');
        const [cat5] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                s.created_at as registered_at,
                COUNT(DISTINCT fs.id) as faculty_schedules_count,
                GROUP_CONCAT(DISTINCT fs.day_of_week ORDER BY fs.day_of_week SEPARATOR ', ') as schedule_days,
                GROUP_CONCAT(DISTINCT fs.subject ORDER BY fs.subject SEPARATOR ', ') as subjects
            FROM students s
            JOIN faculty_schedules fs ON s.id = fs.student_id AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            LEFT JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(DISTINCT t.id) = 0
            ORDER BY s.onboarding_status, s.id ASC
        `);
        console.log(`Total affected: ${cat5.length}`);
        cat5.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | onboarding=${r.onboarding_status} | schedules=${r.faculty_schedules_count} | days=[${r.schedule_days}] | subjects=[${r.subjects}]`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // CATEGORY 6: Students with NO faculty_schedules AND NO timetable (completely unassigned)
        // ──────────────────────────────────────────────────────────────────────
        sep('CAT-6: Active students with NO faculty_schedules AND NO timetable');
        const [cat6] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                s.onboarding_status,
                s.created_at as registered_at,
                s.course,
                s.grade
            FROM students s
            LEFT JOIN faculty_schedules fs ON s.id = fs.student_id AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            LEFT JOIN timetable t ON s.id = t.student_id AND (t.is_deleted IS NULL OR t.is_deleted = 0)
            WHERE s.status = 'active'
            GROUP BY s.id
            HAVING COUNT(DISTINCT fs.id) = 0 AND COUNT(DISTINCT t.id) = 0
            ORDER BY s.id ASC
        `);
        console.log(`Total affected: ${cat6.length}`);
        cat6.forEach(r => {
            console.log(`  [${r.student_id}] ${r.name} | onboarding=${r.onboarding_status} | course=${r.course} | grade=${r.grade} | registered=${r.registered_at?.toISOString?.()?.split('T')[0] || r.registered_at}`);
        });

        // ──────────────────────────────────────────────────────────────────────
        // AUDIT LOGS: Check if any SSC timetable operations were logged for affected students
        // ──────────────────────────────────────────────────────────────────────
        sep('AUDIT LOGS: SSC timetable operations');
        try {
            const affectedIds = [...new Set([...cat1.map(r=>r.student_id), ...cat2.map(r=>r.student_id)])];
            if (affectedIds.length > 0) {
                const [auditRows] = await db.query(`
                    SELECT * FROM audit_logs
                    WHERE details LIKE '%student%'
                    AND (
                        ${affectedIds.map(id => `details LIKE '%${id}%'`).join(' OR ')}
                        OR action LIKE '%TIMETABLE%'
                    )
                    ORDER BY created_at DESC
                    LIMIT 50
                `);
                if (auditRows.length === 0) {
                    console.log('  No audit_logs found for affected students.');
                } else {
                    auditRows.forEach(r => {
                        console.log(`  [${r.created_at?.toISOString?.() || r.created_at}] action=${r.action} | entity_id=${r.entity_id} | user=${r.user_id} | details=${(r.details||'').substring(0,100)}`);
                    });
                }
            } else {
                console.log('  No affected students in CAT-1/CAT-2 to check audit logs for.');
            }
        } catch (e) {
            console.log(`  audit_logs table error: ${e.message}`);
        }

        // ──────────────────────────────────────────────────────────────────────
        // TIMETABLE HISTORY: soft-deleted records per student
        // ──────────────────────────────────────────────────────────────────────
        sep('TIMETABLE HISTORY: soft-deleted rows per student (top 30)');
        const [history] = await db.query(`
            SELECT 
                s.id as student_id,
                s.name,
                s.status,
                COUNT(t.id) as deleted_rows,
                MIN(t.deleted_at) as first_deleted,
                MAX(t.deleted_at) as last_deleted
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE t.is_deleted = 1
            GROUP BY s.id
            ORDER BY COUNT(t.id) DESC
            LIMIT 30
        `);
        if (history.length === 0) {
            console.log('  No soft-deleted timetable records found anywhere in the system.');
        } else {
            history.forEach(r => {
                console.log(`  [${r.student_id}] ${r.name} | status=${r.status} | deleted_rows=${r.deleted_rows} | first=${r.first_deleted?.toISOString?.()?.split('T')[0] || r.first_deleted} | last=${r.last_deleted?.toISOString?.()?.split('T')[0] || r.last_deleted}`);
            });
        }

        // ──────────────────────────────────────────────────────────────────────
        // FACULTY CHANGE HISTORY: for students in CAT-1 (to see who touched their schedules)
        // ──────────────────────────────────────────────────────────────────────
        sep('FACULTY CHANGE HISTORY: for CAT-1 students');
        try {
            if (cat1.length > 0) {
                const cat1Ids = cat1.map(r => r.student_id);
                const placeholders = cat1Ids.map(() => '?').join(',');
                const [fcHistory] = await db.query(`
                    SELECT 
                        fch.student_id,
                        s.name as student_name,
                        fch.changed_at,
                        fch.changed_by_name,
                        fch.changed_by_role,
                        fch.changes_summary
                    FROM faculty_change_history fch
                    JOIN students s ON fch.student_id = s.id
                    WHERE fch.student_id IN (${placeholders})
                    ORDER BY fch.student_id, fch.changed_at ASC
                `, cat1Ids);
                if (fcHistory.length === 0) {
                    console.log('  No faculty_change_history records found for affected students.');
                } else {
                    fcHistory.forEach(r => {
                        console.log(`  [${r.student_id}] ${r.student_name} | changed_at=${r.changed_at?.toISOString?.() || r.changed_at} | by=${r.changed_by_name}(${r.changed_by_role}) | ${(r.changes_summary||'').substring(0,100)}`);
                    });
                }
            }
        } catch (e) {
            console.log(`  faculty_change_history table error: ${e.message}`);
        }

        // ──────────────────────────────────────────────────────────────────────
        // SUMMARY TABLE
        // ──────────────────────────────────────────────────────────────────────
        sep('SUMMARY');
        console.log(`  CAT-1  (active, timetable=0):                               ${cat1.length} students`);
        console.log(`  CAT-2  (soft-deleted timetable, active faculty_schedules):   ${cat2.length} students`);
        console.log(`  CAT-3  (faculty_sessions exist, no active timetable):        ${cat3.length} students`);
        console.log(`  CAT-4  (active timetable, no faculty_sessions):              ${cat4.length} students`);
        console.log(`  CAT-5  (faculty_schedules>0, timetable=0):                   ${cat5.length} students`);
        console.log(`  CAT-6  (no faculty_schedules, no timetable):                 ${cat6.length} students`);
        console.log('');

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        process.exit(0);
    }
}

run();
