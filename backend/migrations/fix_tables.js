const db = require('../config/db');

async function fixTables() {
    console.log("Starting database fixes...");

    const tables = ['mentors', 'faculties', 'students'];

    for (const table of tables) {
        try {
            await db.query(`ALTER TABLE ${table} ADD COLUMN phone_number VARCHAR(50) UNIQUE NULL`);
            console.log(`Added phone_number to ${table} table.`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`phone_number already exists in ${table} table.`);
            } else if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log(`${table} table does not exist. Creating it...`);
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ${table} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) UNIQUE,
                        phone_number VARCHAR(50) UNIQUE,
                        place VARCHAR(255),
                        password VARCHAR(255) NOT NULL,
                        role VARCHAR(50) NOT NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        isApproved TINYINT(1) DEFAULT 0,
                        isActive TINYINT(1) DEFAULT 1,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);
                console.log(`Created ${table} table.`);
            } else {
                console.error(`Error fixing ${table}:`, error.message);
            }
        }
    }
    console.log("Fixes complete!");
    process.exit(0);
}

fixTables();
