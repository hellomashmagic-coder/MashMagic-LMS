require('dotenv').config();
const db = require('../config/db');

async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS faculty_verification (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                academic_head_id INT NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES faculty_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('faculty_verification table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
