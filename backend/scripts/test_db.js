require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function test() {
    const db = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mash_magic'
    });

    try {
        const [students] = await db.query('SELECT id, name, grade, subjects_json, subject FROM students WHERE id IN (488, 489) OR name LIKE "%IZZAH%" OR name LIKE "%HIRASH%"');
        console.log("Students:", JSON.stringify(students, null, 2));

        const [subjects] = await db.query('SELECT * FROM student_subjects WHERE student_id IN (SELECT id FROM students WHERE name LIKE "%IZZAH%" OR name LIKE "%HIRASH%")');
        console.log("Subjects:", JSON.stringify(subjects, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
