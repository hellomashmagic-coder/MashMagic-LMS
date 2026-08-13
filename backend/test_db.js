const mysql = require('mysql2/promise');

async function run() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'MashMagic2026!',
        database: 'mashmagic'
    });

    try {
        console.log("--- FACULTY SCHEDULES ---");
        const [schedules] = await connection.query("SELECT * FROM faculty_schedules WHERE student_id = 472");
        console.log(JSON.stringify(schedules, null, 2));

        console.log("\n--- TIMETABLE (ALL) ---");
        const [timetable] = await connection.query("SELECT * FROM timetable WHERE student_id = 472");
        console.log(JSON.stringify(timetable, null, 2));

        console.log("\n--- AUDIT LOGS / ACTIVITY LOGS ---");
        // Check for any log tables
        const [tables] = await connection.query("SHOW TABLES LIKE '%log%'");
        const logTables = tables.map(t => Object.values(t)[0]);

        for (const table of logTables) {
            try {
                // Determine structure to query
                const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
                const colNames = columns.map(c => c.Field);
                
                let conditions = [];
                if (colNames.includes('student_id')) conditions.push("student_id = 472");
                if (colNames.includes('message')) conditions.push("message LIKE '%472%'");
                if (colNames.includes('details')) conditions.push("details LIKE '%472%'");
                if (colNames.includes('action')) conditions.push("action LIKE '%472%'");
                
                if (conditions.length > 0) {
                    const [logs] = await connection.query(`SELECT * FROM ${table} WHERE ${conditions.join(' OR ')}`);
                    if (logs.length > 0) {
                        console.log(`\n--- Logs from ${table} ---`);
                        console.log(JSON.stringify(logs, null, 2));
                    }
                }
            } catch (e) {
                // Ignore query errors for individual tables
            }
        }

        console.log("\n--- ADMIN NOTIFICATIONS ---");
        const [notifications] = await connection.query("SELECT * FROM admin_notifications WHERE message LIKE '%472%' OR related_id = 472");
        console.log(JSON.stringify(notifications, null, 2));
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await connection.end();
    }
}

run();
