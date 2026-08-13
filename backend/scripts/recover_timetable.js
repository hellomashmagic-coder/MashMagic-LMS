const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isDryRun = process.argv.includes('--dry-run');

// Standard days of week map
const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

// Calculate dates for a specific day of the week for the next X weeks
function getUpcomingDates(dayOfWeekStr, numWeeks = 4) {
    const dates = [];
    const targetDay = dayMap[dayOfWeekStr];
    
    if (targetDay === undefined) return dates;

    let d = new Date();
    // Move to the first occurrence of this day
    d.setDate(d.getDate() + ((targetDay + 7 - d.getDay()) % 7));
    
    for (let i = 0; i < numWeeks; i++) {
        dates.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 7);
    }
    
    return dates;
}

function convertTo24Hour(time12h) {
    if (!time12h) return null;
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

function calculateDuration(start24, end24) {
    if (!start24 || !end24) return null;
    const start = new Date(`1970-01-01T${start24}`);
    const end = new Date(`1970-01-01T${end24}`);
    const diffMins = Math.round((end - start) / 60000);
    if (diffMins < 0) return '0h 0m';
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
}

async function run() {
    let connection;
    try {
        const pool = require('../config/db.js');
        connection = await pool.getConnection();

        console.log(`Starting Recovery Script... Mode: ${isDryRun ? 'DRY-RUN (No Data Will Be Saved)' : 'LIVE'}`);

        // Get students who have active faculty_schedules but NO timetable records at all
        const [missingStudents] = await connection.query(`
            SELECT DISTINCT s.id as student_id, s.name, s.mentor_id
            FROM students s
            JOIN faculty_schedules fs ON s.id = fs.student_id
            LEFT JOIN timetable t ON s.id = t.student_id
            WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0)
            AND t.id IS NULL
            AND s.id != 205
        `);

        console.log(`Found ${missingStudents.length} students missing from timetable.`);

        let totalRecordsToCreate = 0;

        if (!isDryRun) {
            await connection.beginTransaction();
        }

        for (const student of missingStudents) {
            console.log(`\nProcessing Student: ${student.name} (ID: ${student.student_id})`);
            
            // Get their schedules
            const [schedules] = await connection.query(`
                SELECT id, day_of_week, start_time, end_time, subject, faculty_id 
                FROM faculty_schedules 
                WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
            `, [student.student_id]);

            let studentRecordsCreated = 0;

            for (const schedule of schedules) {
                const upcomingDates = getUpcomingDates(schedule.day_of_week, 4); // 4 weeks
                const start24 = convertTo24Hour(schedule.start_time);
                const end24 = convertTo24Hour(schedule.end_time);
                const duration = calculateDuration(start24, end24);

                // Fetch faculty name safely
                let faculty_name = null;
                if (schedule.faculty_id) {
                    const [fac] = await connection.query('SELECT name FROM users WHERE id = ?', [schedule.faculty_id]);
                    if (fac.length > 0) faculty_name = fac[0].name;
                }

                for (const date of upcomingDates) {
                    // Check for duplicates
                    const [existing] = await connection.query(`
                        SELECT id FROM timetable 
                        WHERE student_id = ? AND date = ? AND start_time = ? AND (is_deleted IS NULL OR is_deleted = 0)
                    `, [student.student_id, date, start24]);

                    if (existing.length === 0) {
                        studentRecordsCreated++;
                        totalRecordsToCreate++;

                        if (!isDryRun) {
                            // Insert into timetable
                            await connection.query(`
                                INSERT INTO timetable (
                                    mentor_id, student_id, session_number, date, start_time, end_time,
                                    duration, chapter, subject, session_type, status, notes, 
                                    faculty_id, faculty_name, session_mode
                                ) VALUES (?, ?, 0, ?, ?, ?, ?, '', ?, 'Regular Class', 'Scheduled', '', ?, ?, 'Online')
                            `, [
                                student.mentor_id || null, 
                                student.student_id, 
                                date, 
                                start24, 
                                end24, 
                                duration, 
                                schedule.subject || '', // Saving subject directly into subject column
                                schedule.faculty_id || null, 
                                faculty_name
                            ]);
                        }
                    }
                }
            }
            console.log(`-> Prepared ${studentRecordsCreated} timetable entries for ${student.name}`);
            
            // Re-calculate session numbers if live
            if (!isDryRun && studentRecordsCreated > 0) {
                // simple recalculate since mentorController might not be accessible from here
                const [sessions] = await connection.query(`
                    SELECT id FROM timetable 
                    WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0) 
                    ORDER BY date ASC, start_time ASC
                `, [student.student_id]);
                
                for (let i = 0; i < sessions.length; i++) {
                    await connection.query('UPDATE timetable SET session_number = ? WHERE id = ?', [i + 1, sessions[i].id]);
                }
            }
        }

        console.log(`\n===========================================`);
        console.log(`TOTAL RECORDS TO BE CREATED: ${totalRecordsToCreate}`);
        console.log(`===========================================`);

        if (!isDryRun) {
            // Write audit log
            await connection.query(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action VARCHAR(255),
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await connection.query('INSERT INTO audit_logs (action, details) VALUES (?, ?)', [
                'TIMETABLE_RECOVERY', 
                `Recovered timetable for ${missingStudents.length} students. Total records created: ${totalRecordsToCreate}`
            ]);

            await connection.commit();
            console.log("SUCCESS: Transactions Committed.");
        } else {
            console.log("SUCCESS: Dry-run completed. Run without --dry-run to execute.");
        }

    } catch (e) {
        if (!isDryRun && connection) {
            await connection.rollback();
            console.error("ROLLED BACK DUE TO ERROR!");
        }
        console.error("Error:", e);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

run();
