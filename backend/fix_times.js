const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixTimes() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Connected to DB. Fixing times...");

        const executeSafely = async (query) => {
            try {
                await db.query(query);
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    console.log("Duplicate entry found. Attempting to delete the old record instead...");
                    // Transform UPDATE to DELETE
                    const deleteQuery = query.replace(/^UPDATE (.*?) SET .*? WHERE (.*)$/, 'DELETE $1 FROM $1 WHERE $2');
                    try {
                        await db.query(deleteQuery);
                        console.log("Old duplicate record deleted successfully.");
                    } catch (delErr) {
                        console.error("Failed to delete duplicate:", delErr.message);
                    }
                } else {
                    console.error("Query failed:", e.message);
                }
            }
        };

        // Devadarsh: 7:30 PM (19:30:00)
        await executeSafely(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '19:30:00', t.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND (t.start_time LIKE '%10:00%' OR t.start_time LIKE '%10:%')`);
        await executeSafely(`UPDATE faculty_schedules fs JOIN students s ON fs.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND (fs.start_time LIKE '%10:00%' OR fs.start_time LIKE '%10:%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN timetable t ON fs.timetable_id = t.id JOIN students s ON t.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND (fs.start_time LIKE '%10:00%' OR fs.start_time LIKE '%10:%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND (fs.start_time LIKE '%10:00%' OR fs.start_time LIKE '%10:%')`);

        // Ryan: 7:30 PM (19:30:00)
        await executeSafely(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '19:30:00', t.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND (t.start_time LIKE '%07:30%' OR t.start_time LIKE '%7:30%')`);
        await executeSafely(`UPDATE faculty_schedules fs JOIN students s ON fs.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND (fs.start_time LIKE '%07:30%' OR fs.start_time LIKE '%7:30%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN timetable t ON fs.timetable_id = t.id JOIN students s ON t.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND (fs.start_time LIKE '%07:30%' OR fs.start_time LIKE '%7:30%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND (fs.start_time LIKE '%07:30%' OR fs.start_time LIKE '%7:30%')`);

        // Zenha: 1:00 PM (13:00:00)
        await executeSafely(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '13:00:00', t.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND (t.start_time LIKE '%01:00%' OR t.start_time LIKE '%1:00%')`);
        await executeSafely(`UPDATE faculty_schedules fs JOIN students s ON fs.student_id = s.id SET fs.start_time = '13:00:00', fs.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND (fs.start_time LIKE '%01:00%' OR fs.start_time LIKE '%1:00%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN timetable t ON fs.timetable_id = t.id JOIN students s ON t.student_id = s.id SET fs.start_time = '13:00:00', fs.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND (fs.start_time LIKE '%01:00%' OR fs.start_time LIKE '%1:00%')`);
        await executeSafely(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '13:00:00', fs.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND (fs.start_time LIKE '%01:00%' OR fs.start_time LIKE '%1:00%')`);

        console.log("Times fixed successfully!");

    } catch(e) {
        console.error("Error fixing times:", e);
    } finally {
        if (db) await db.end();
        process.exit();
    }
}

fixTimes();
