const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Student Badge migration...');

        // 1. Update Students Table
        try {
            await pool.query('ALTER TABLE students ADD COLUMN enrollment_type ENUM("Mentorship", "Tuition", "Mentorship and Tuition") DEFAULT NULL');
            await pool.query('ALTER TABLE students ADD COLUMN badge ENUM("Gold", "Silver", "Diamond") DEFAULT NULL');
            console.log('Added enrollment_type and badge to students');
        } catch (e) {
            console.log('Columns in students might already exist');
        }

        // 2. Update Users Table (for auth and profile consistency)
        try {
            await pool.query('ALTER TABLE users ADD COLUMN enrollment_type ENUM("Mentorship", "Tuition", "Mentorship and Tuition") DEFAULT NULL');
            await pool.query('ALTER TABLE users ADD COLUMN badge ENUM("Gold", "Silver", "Diamond") DEFAULT NULL');
            console.log('Added enrollment_type and badge to users');
        } catch (e) {
            console.log('Columns in users might already exist');
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
