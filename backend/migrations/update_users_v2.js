const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add createdBy column
        try {
            await pool.query('ALTER TABLE users ADD COLUMN createdBy INT NULL');
            await pool.query('ALTER TABLE users ADD CONSTRAINT fk_user_created_by FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL');
            console.log('Added createdBy column and foreign key');
        } catch (e) {
            console.log('createdBy column might already exist');
        }

        // Add isActive column if status is not enough
        try {
            await pool.query('ALTER TABLE users ADD COLUMN isActive TINYINT(1) DEFAULT 1');
            console.log('Added isActive column');
        } catch (e) {
            console.log('isActive column might already exist');
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
