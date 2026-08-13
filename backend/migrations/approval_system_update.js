const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Approval Workflow migration...');

        // 1. Update Users Table
        try {
            await pool.query('ALTER TABLE users ADD COLUMN isApproved TINYINT(1) DEFAULT 0');
            console.log('Added isApproved to users');
        } catch (e) {
            console.log('isApproved in users might already exist');
        }

        try {
            await pool.query('ALTER TABLE users ADD COLUMN registeredBy INT NULL');
            await pool.query('ALTER TABLE users ADD CONSTRAINT fk_user_registered_by FOREIGN KEY (registeredBy) REFERENCES users(id) ON DELETE SET NULL');
            console.log('Added registeredBy to users');
        } catch (e) {
            console.log('registeredBy in users might already exist');
        }

        // 2. Update Students Table
        try {
            await pool.query('ALTER TABLE students ADD COLUMN isApproved TINYINT(1) DEFAULT 0');
            console.log('Added isApproved to students');
        } catch (e) {
            console.log('isApproved in students might already exist');
        }

        try {
            await pool.query('ALTER TABLE students ADD COLUMN registeredBy INT NULL');
            await pool.query('ALTER TABLE students ADD CONSTRAINT fk_student_registered_by FOREIGN KEY (registeredBy) REFERENCES users(id) ON DELETE SET NULL');
            console.log('Added registeredBy to students');
        } catch (e) {
            console.log('registeredBy in students might already exist');
        }

        // 3. Mark existing active users as approved
        await pool.query('UPDATE users SET isApproved = 1 WHERE status = "active"');
        await pool.query('UPDATE students SET isApproved = 1 WHERE status = "active"');
        console.log('Marked existing active accounts as approved');

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
