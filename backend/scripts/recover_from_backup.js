const fs = require('fs');
const readline = require('readline');
const db = require('../config/db');
const saveVerifier = require('../utils/saveVerifier');
const { logAudit } = require('../utils/auditLogger');

/**
 * Safely recovers rows for a specific table from an SQL dump.
 * Uses INSERT IGNORE to prevent overwriting existing rows.
 * Runs inside a transaction.
 */
async function recoverFromBackup(dumpFilePath, tableName) {
    if (!dumpFilePath || !tableName) {
        console.error("Usage: node recover_from_backup.js <path_to_sql_dump> <table_name>");
        process.exit(1);
    }

    if (!fs.existsSync(dumpFilePath)) {
        console.error(`File not found: ${dumpFilePath}`);
        process.exit(1);
    }

    console.log(`Starting safe recovery for table '${tableName}' from ${dumpFilePath}`);

    const connection = await db.getConnection();
    let recoveredCount = 0;

    try {
        await connection.beginTransaction();

        const fileStream = fs.createReadStream(dumpFilePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // Match mysqldump insert statements: INSERT INTO `table_name` VALUES ...
        // We will transform INSERT INTO to INSERT IGNORE INTO to safely insert missing rows only.
        const insertRegex = new RegExp(`^INSERT INTO \`${tableName}\` VALUES (.*);$`);

        for await (const line of rl) {
            const match = line.match(insertRegex);
            if (match) {
                const valuesString = match[1];
                
                // Safe execution using IGNORE
                const safeQuery = `INSERT IGNORE INTO \`${tableName}\` VALUES ${valuesString}`;
                const [result] = await connection.query(safeQuery);
                
                recoveredCount += result.affectedRows;
            }
        }

        await logAudit({
            action: 'RECOVER_FROM_BACKUP',
            details: `Recovered ${recoveredCount} missing rows into table ${tableName} from backup ${dumpFilePath}.`,
            user_id: 1, // System admin
            user_role: 'admin',
            new_data: { recoveredCount, tableName, dumpFilePath }
        });

        await connection.commit();
        console.log(`Recovery successful! Inserted ${recoveredCount} missing rows into '${tableName}'.`);

    } catch (error) {
        await connection.rollback();
        console.error("Recovery failed:", error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

if (require.main === module) {
    const dumpPath = process.argv[2];
    const table = process.argv[3];
    recoverFromBackup(dumpPath, table);
}

module.exports = { recoverFromBackup };
