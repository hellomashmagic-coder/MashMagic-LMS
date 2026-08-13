const db = require('./config/db');

async function run() {
    try {
        console.log("--- FACULTY SCHEDULES ---");
        const [schedules] = await db.query("SELECT * FROM faculty_schedules WHERE student_id = 472");
        console.log(JSON.stringify(schedules, null, 2));

        console.log("\n--- TIMETABLE (ALL) ---");
        const [timetable] = await db.query("SELECT * FROM timetable WHERE student_id = 472");
        console.log(JSON.stringify(timetable, null, 2));

        console.log("\n--- AUDIT LOGS / ACTIVITY LOGS ---");
        const [tables] = await db.query("SHOW TABLES LIKE '%log%'");
        const logTables = tables.map(t => Object.values(t)[0]);

        for (const table of logTables) {
            try {
                const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
                const colNames = columns.map(c => c.Field);
                
                let conditions = [];
                if (colNames.includes('student_id')) conditions.push("student_id = 472");
                if (colNames.includes('message')) conditions.push("message LIKE '%472%'");
                if (colNames.includes('details')) conditions.push("details LIKE '%472%'");
                if (colNames.includes('action')) conditions.push("action LIKE '%472%'");
                
                if (conditions.length > 0) {
                    const [logs] = await db.query(`SELECT * FROM ${table} WHERE ${conditions.join(' OR ')}`);
                    if (logs.length > 0) {
                        console.log(`\n--- Logs from ${table} ---`);
                        console.log(JSON.stringify(logs, null, 2));
                    }
                }
            } catch (e) {}
        }

        console.log("\n--- ADMIN NOTIFICATIONS ---");
        const [notifications] = await db.query("SELECT * FROM admin_notifications WHERE message LIKE '%472%' OR related_id = 472");
        console.log(JSON.stringify(notifications, null, 2));
        
        console.log("\n--- SYSTEM LOGS ---");
        try {
            const [systemLogs] = await db.query("SELECT * FROM system_logs WHERE message LIKE '%472%' OR details LIKE '%472%' OR entity_id = 472");
            console.log(JSON.stringify(systemLogs, null, 2));
        } catch(e) {}

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

run();
