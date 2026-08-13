const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 90;

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper to format date as YYYY_MM_DD
function getTimestamp() {
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
}

async function runBackup() {
    const timestamp = getTimestamp();
    const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);
    
    // Ensure we don't overwrite
    if (fs.existsSync(backupFile)) {
        console.log(`Backup for today already exists at ${backupFile}`);
        return;
    }

    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'mashmagic';

    const dumpCmd = `mysqldump -h ${host} -u ${user} ${password ? `-p"${password}"` : ''} ${database} > "${backupFile}"`;

    exec(dumpCmd, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup failed: ${error.message}`);
            // Log failure to admin_notifications and audit_logs
            try {
                await db.query("INSERT INTO admin_notifications (message, action_type, is_read) VALUES (?, 'system_backup', 0)", [`CRITICAL: Database Backup Failed! ${error.message}`]);
                const { logAudit } = require('../utils/auditLogger');
                await logAudit({
                    action: 'BACKUP_FAILED',
                    details: `Error: ${error.message}`,
                    user_id: 1,
                    user_role: 'admin',
                    entity: 'system'
                });
            } catch (e) {
                console.error("Failed to write failure logs to DB", e);
            }
            process.exit(1);
        }

        console.log(`Backup successfully created at ${backupFile}`);
        try {
            const { logAudit } = require('../utils/auditLogger');
            await logAudit({
                action: 'BACKUP_SUCCESS',
                details: `Backup created at ${backupFile}`,
                user_id: 1,
                user_role: 'admin',
                entity: 'system'
            });
        } catch (e) {
            console.error("Failed to write success log to DB", e);
        }

        // Pruning old backups
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            if (file.startsWith('backup_') && file.endsWith('.sql')) {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    console.log(`Pruned old backup: ${file}`);
                }
            }
        });

        process.exit(0);
    });
}

runBackup();
