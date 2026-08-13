const mysql = require('mysql2/promise');

async function test() {
    const db = await mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: 'MashMagic2026!',
        database: 'mashmagic'
    });

    try {
        const [students] = await db.query('SELECT id, name, grade, subjects_json, subject FROM students WHERE name LIKE "%IZZAH%" OR name LIKE "%HIRASH%"');
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
