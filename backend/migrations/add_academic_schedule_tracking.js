require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration: add_reminder_and_minutes_to_faculty_sessions...');

        const columns = [
            { name: 'reminder_1', type: 'BOOLEAN DEFAULT 0' },
            { name: 'reminder_1_remark', type: 'TEXT' },
            { name: 'reminder_2', type: 'BOOLEAN DEFAULT 0' },
            { name: 'reminder_2_remark', type: 'TEXT' },
            { name: 'reminder_3', type: 'BOOLEAN DEFAULT 0' },
            { name: 'reminder_3_remark', type: 'TEXT' },
            { name: 'minutes_taken', type: 'INT DEFAULT NULL' },
            { name: 'minutes_locked', type: 'BOOLEAN DEFAULT 0' }
        ];

        const [existingColumns] = await db.query('DESCRIBE faculty_sessions');
        const columnNames = existingColumns.map(c => c.Field);

        for (const col of columns) {
            if (!columnNames.includes(col.name)) {
                await db.query(`ALTER TABLE faculty_sessions ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Added column: ${col.name}`);
            } else {
                console.log(`Column already exists: ${col.name}`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
