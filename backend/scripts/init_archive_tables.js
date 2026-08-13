const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
    let connection;
    try {
        const pool = require('../config/db.js');
        connection = await pool.getConnection();

        console.log("Starting DB Initialization...");

        // 1. Add timetable_created to students if not exists
        try {
            await connection.query('ALTER TABLE students ADD COLUMN timetable_created TINYINT(1) DEFAULT 0');
            console.log("Added timetable_created column to students.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("timetable_created column already exists.");
            } else {
                throw e;
            }
        }

        // 2. Create student_archive
        await connection.query(`
            CREATE TABLE IF NOT EXISTS student_archive (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                user_id INT,
                user_role VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                full_json_snapshot JSON,
                INDEX (student_id)
            )
        `);
        console.log("student_archive table checked/created.");

        // 3. Create timetable_archive
        await connection.query(`
            CREATE TABLE IF NOT EXISTS timetable_archive (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                user_id INT,
                user_role VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                full_json_snapshot JSON,
                INDEX (student_id)
            )
        `);
        console.log("timetable_archive table checked/created.");

        // 4. Create faculty_schedule_archive
        await connection.query(`
            CREATE TABLE IF NOT EXISTS faculty_schedule_archive (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                user_id INT,
                user_role VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                full_json_snapshot JSON,
                INDEX (student_id)
            )
        `);
        console.log("faculty_schedule_archive table checked/created.");

        // 5. Create academic_schedule_archive
        await connection.query(`
            CREATE TABLE IF NOT EXISTS academic_schedule_archive (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                user_id INT,
                user_role VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                full_json_snapshot JSON,
                INDEX (student_id)
            )
        `);
        console.log("academic_schedule_archive table checked/created.");

        console.log("DB Initialization Complete.");

    } catch (e) {
        console.error("Error during initialization:", e);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit();
    }
}

run();
