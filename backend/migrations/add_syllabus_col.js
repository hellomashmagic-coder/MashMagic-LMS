const db = require('../config/db');

async function migrate() {
    try {
        console.log("Checking if syllabus column exists in students table...");
        const [rows] = await db.query("SHOW COLUMNS FROM students LIKE 'syllabus'");
        if (rows.length === 0) {
            console.log("Adding syllabus column to students table...");
            await db.query("ALTER TABLE students ADD COLUMN syllabus VARCHAR(50) DEFAULT NULL AFTER grade");
            console.log("Adding syllabus column to users table...");
            await db.query("ALTER TABLE users ADD COLUMN syllabus VARCHAR(50) DEFAULT NULL AFTER grade");
            console.log("Migration successful!");
        } else {
            console.log("Syllabus column already exists.");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit();
    }
}

migrate();
