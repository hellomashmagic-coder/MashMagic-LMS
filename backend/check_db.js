const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDb() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await db.query(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '13:00:00', t.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND t.date = '2026-06-25'`);
        await db.query(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '13:00:00', fs.end_time = '14:00:00' WHERE s.name LIKE '%zenha%' AND fs.date = '2026-06-25'`);

        await db.query(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '19:30:00', t.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND t.date = '2026-06-25'`);
        await db.query(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%ryan%' AND fs.date = '2026-06-25'`);

        await db.query(`UPDATE timetable t JOIN students s ON t.student_id = s.id SET t.start_time = '19:30:00', t.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND t.date = '2026-06-25'`);
        await db.query(`UPDATE faculty_sessions fs JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id SET fs.start_time = '19:30:00', fs.end_time = '20:30:00' WHERE s.name LIKE '%devadarsh%' AND fs.date = '2026-06-25'`);

        console.log('Force updated times for today!');
        console.error(e);
    } finally {
        if(db) await db.end();
        process.exit();
    }
}
checkDb();
