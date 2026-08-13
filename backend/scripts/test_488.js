const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'MashMagic2026!',
    database: 'mashmagic'
};

async function test() {
    let db;
    try {
        db = await mysql.createPool(dbConfig);
        
        // 1. Get student 488
        const [students] = await db.query('SELECT * FROM students WHERE id = 488');
        
        // 2. Fetch student_subjects directly
        const [subs] = await db.query('SELECT * FROM student_subjects WHERE student_id = 488');
        console.log("student_subjects in DB:", subs);
        
        // 3. Check live sessions
        const [sessions] = await db.query(`
            SELECT t.student_id, t.duration, t.chapter AS subject, fs.minutes_taken 
            FROM timetable t
            LEFT JOIN faculty_sessions fs ON t.id = fs.timetable_id
            WHERE t.status = "Completed" AND t.student_id = 488
        `);
        console.log("Live sessions:", sessions);

    } catch (e) {
        console.error(e);
    } finally {
        if (db) await db.end();
        process.exit(0);
    }
}
test();
