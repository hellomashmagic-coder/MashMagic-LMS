const pool = require('../config/db');

const createAoeTables = async () => {
    try {
        console.log("Starting AOE table creation...");

        // 1. Faculty Quality
        await pool.query(`
            CREATE TABLE IF NOT EXISTS aoe_faculty_quality (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                aoe_id INT NOT NULL,
                class_topic VARCHAR(255),
                score INT NOT NULL,
                remarks TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (aoe_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ aoe_faculty_quality table created");

        // 2. Faculty Replacements
        await pool.query(`
            CREATE TABLE IF NOT EXISTS aoe_faculty_replacements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                aoe_id INT NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (aoe_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ aoe_faculty_replacements table created");

        // 3. Escalations
        await pool.query(`
            CREATE TABLE IF NOT EXISTS aoe_escalations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                aoe_id INT NOT NULL,
                issue_type VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
                FOREIGN KEY (aoe_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ aoe_escalations table created");

        console.log("All AOE tables created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating AOE tables:", error);
        process.exit(1);
    }
};

createAoeTables();
