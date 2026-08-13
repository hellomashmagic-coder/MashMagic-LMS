const db = require('./backend/config/db');

async function test() {
    try {
        const [rows1] = await db.query("SHOW COLUMNS FROM mentor_faculty_interactions");
        console.log("mentor_faculty_interactions:", rows1.map(r => r.Field));

        const [rows2] = await db.query("SHOW COLUMNS FROM faculty_interaction_logs");
        console.log("faculty_interaction_logs:", rows2.map(r => r.Field));

        const [rows3] = await db.query("SHOW COLUMNS FROM student_reports");
        console.log("student_reports:", rows3.map(r => r.Field));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
