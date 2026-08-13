require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_exams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                mentor_id INT NOT NULL,
                milestone_session INT NOT NULL,
                score VARCHAR(50) DEFAULT NULL,
                status ENUM('Pending', 'Completed', 'Postponed') DEFAULT 'Pending',
                postponed_date DATE DEFAULT NULL,
                reason TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_exam (student_id, milestone_session)
            )
        `);
        console.log('STUDENT_EXAMS_TABLE_CREATED');
        process.exit(0);
    } catch (err) {
        console.error('MIGRATION_ERROR:' + err.message);
        process.exit(1);
    }
}
migrate();
