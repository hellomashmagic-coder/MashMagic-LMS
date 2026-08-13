const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function recoverData() {
    console.log("Starting Phase 2: Safe Data Recovery...");
    try {
        const auditFile = path.join(__dirname, '../../student_audit_report.json');
        if (!fs.existsSync(auditFile)) {
            console.error("student_audit_report.json not found! Please run the audit scripts first.");
            process.exit(1);
        }

        const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
        console.log(`Loaded audit report for ${auditData.length} students.`);

        for (const student of auditData) {
            // We will only perform safe recoveries (e.g., fallback fetching missing email from users table)
            if (student.fields.email && student.fields.email.status === 'MISSING') {
                const [users] = await db.query('SELECT email FROM users WHERE id = (SELECT user_id FROM students WHERE id = ?)', [student.student_id]);
                if (users.length > 0 && users[0].email) {
                    await db.query('UPDATE students SET email = ? WHERE id = ?', [users[0].email, student.student_id]);
                    console.log(`[RECOVERED] Student ${student.name} missing email recovered from users table: ${users[0].email}`);
                }
            }
            
            // Example of recovering missing contact
            if (student.fields.contact && student.fields.contact.status === 'MISSING') {
                const [users] = await db.query('SELECT phone_number FROM users WHERE id = (SELECT user_id FROM students WHERE id = ?)', [student.student_id]);
                if (users.length > 0 && users[0].phone_number) {
                    await db.query('UPDATE students SET contact = ? WHERE id = ?', [users[0].phone_number, student.student_id]);
                    console.log(`[RECOVERED] Student ${student.name} missing contact recovered from users table.`);
                }
            }
            
            // Note: We DO NOT overwrite existing valid data.
        }

        console.log("Recovery Phase Complete! All missing data that could safely be recovered from fallback tables has been restored.");
    } catch (e) {
        console.error("Recovery failed:", e);
    } finally {
        process.exit(0);
    }
}

recoverData();
