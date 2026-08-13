require('dotenv').config();
const db = require('../config/db');
async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS academic_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_url TEXT NOT NULL,
                uploaded_by INT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )
        `);
        console.log('academic_documents table created/verified');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
migrate();
