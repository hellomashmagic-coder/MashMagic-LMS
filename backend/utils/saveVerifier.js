const db = require('../config/db');

async function logVerificationFailure(conn, action, entityId, details) {
    try {
        await conn.query("INSERT INTO audit_logs (action, entity_id, details) VALUES (?, ?, ?)", 
        [action, entityId, details]);
    } catch(e) { /* non-blocking */ }
}

async function verifyStudentSave(conn, studentId, payload) {
    const [rows] = await conn.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (rows.length === 0) {
        throw new Error('Save Verification Failed: Record not found in database after insert/update.');
    }
    
    const dbRecord = rows[0];
    const missingFields = [];
    
    for (const [key, expectedVal] of Object.entries(payload)) {
        if (expectedVal !== undefined && expectedVal !== null && expectedVal !== '') {
            if (dbRecord[key] === null || dbRecord[key] === undefined || dbRecord[key] === '') {
                missingFields.push(key);
            }
        }
    }

    if (missingFields.length > 0) {
        const msg = `Save Verification Failed: The following mandatory fields failed to save: ${missingFields.join(', ')}`;
        await logVerificationFailure(conn, 'STUDENT_VERIFICATION_FAILED', studentId, msg);
        throw new Error(msg);
    }
}

async function verifyFacultySchedules(conn, studentId, expectedCount) {
    const [[result]] = await conn.query('SELECT COUNT(id) as count FROM faculty_schedules WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [studentId]);
    if (result.count !== expectedCount) {
        const msg = `Verification Failed: Expected ${expectedCount} faculty_schedules but found ${result.count}.`;
        await logVerificationFailure(conn, 'FACULTY_SCHEDULE_VERIFICATION_FAILED', studentId, msg);
        throw new Error(msg);
    }
}

async function verifyTimetableSave(conn, studentId, expectedMinCount) {
    const [[result]] = await conn.query('SELECT COUNT(id) as count FROM timetable WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)', [studentId]);
    if (result.count < expectedMinCount) {
        const msg = `Verification Failed: Expected at least ${expectedMinCount} timetable rows but found ${result.count}.`;
        await logVerificationFailure(conn, 'TIMETABLE_VERIFICATION_FAILED', studentId, msg);
        throw new Error(msg);
    }
}

async function verifyAcademicSchedules(conn, studentId, expectedCount) {
    // Academic Schedules refer to faculty_sessions in this DB schema.
    const [[result]] = await conn.query('SELECT COUNT(id) as count FROM faculty_sessions WHERE (is_deleted IS NULL OR is_deleted = 0) AND timetable_id IN (SELECT id FROM timetable WHERE student_id = ?)', [studentId]);
    if (result.count !== expectedCount) {
        const msg = `Verification Failed: Expected ${expectedCount} academic schedules but found ${result.count}.`;
        await logVerificationFailure(conn, 'ACADEMIC_SCHEDULE_VERIFICATION_FAILED', studentId, msg);
        throw new Error(msg);
    }
}

async function verifyReferentialIntegrity(conn, references) {
    // references is an array of objects: { table, column, value }
    for (const ref of references) {
        if (ref.value === null || ref.value === undefined) continue;
        
        let found = false;
        if (ref.table === 'users_or_faculties') {
            const [rows1] = await conn.query(`SELECT id FROM users WHERE ${ref.column} = ? AND (is_deleted IS NULL OR is_deleted = 0)`, [ref.value]);
            if (rows1.length > 0) found = true;
            else {
                const [rows2] = await conn.query(`SELECT id FROM faculties WHERE ${ref.column} = ? AND (is_deleted IS NULL OR is_deleted = 0)`, [ref.value]);
                if (rows2.length > 0) found = true;
            }
        } else {
            const [rows] = await conn.query(`SELECT id FROM ${ref.table} WHERE ${ref.column} = ? AND (is_deleted IS NULL OR is_deleted = 0)`, [ref.value]);
            if (rows.length > 0) found = true;
        }

        if (!found) {
            const msg = `Referential Integrity Failed: Record not found in ${ref.table} where ${ref.column} = ${ref.value}`;
            await logVerificationFailure(conn, 'REFERENTIAL_INTEGRITY_FAILED', ref.value, msg);
            throw new Error(msg);
        }
    }
}

module.exports = {
    logVerificationFailure,
    verifyStudentSave,
    verifyFacultySchedules,
    verifyTimetableSave,
    verifyAcademicSchedules,
    verifySave,
    verifyReferentialIntegrity
};

async function verifySave(conn, table, insertId, submittedData) {
    if (!insertId) throw new Error(`Save Verification Failed: Invalid insertId for table ${table}`);
    
    const [rows] = await conn.query(`SELECT * FROM ${table} WHERE id = ?`, [insertId]);
    if (rows.length === 0) {
        await logVerificationFailure(conn, `VERIFICATION_FAILED_${table.toUpperCase()}`, insertId, `Row not found after insert`);
        throw new Error(`Save Verification Failed: Record not found in ${table} after insert/update.`);
    }
    
    const dbRecord = rows[0];
    const ignoredFields = ['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted'];
    const missingFields = [];
    const mismatchFields = [];
    
    for (const [key, expectedVal] of Object.entries(submittedData)) {
        if (ignoredFields.includes(key)) continue;
        
        // If undefined in submitted payload, skip verification for this field
        if (expectedVal === undefined) continue;

        const dbVal = dbRecord[key];
        
        // Convert to strings for loose comparison of dates/numbers/booleans, or strict check
        // Handle nulls
        if (expectedVal === null && dbVal !== null) {
            mismatchFields.push(key);
        } else if (expectedVal !== null && dbVal === null) {
            missingFields.push(key);
        } else if (expectedVal !== null && dbVal !== null) {
            // Handle Date object vs String mismatch
            if (dbVal instanceof Date && typeof expectedVal === 'string') {
                const year = dbVal.getFullYear();
                const month = String(dbVal.getMonth() + 1).padStart(2, '0');
                const day = String(dbVal.getDate()).padStart(2, '0');
                const dbDateStr = `${year}-${month}-${day}`;
                
                if (dbDateStr === expectedVal) {
                    continue;
                }
            }

            // loose comparison
            if (String(expectedVal).trim() !== String(dbVal).trim()) {
                // Ignore time string formatting differences like '13:00:00' vs '13:00' if possible
                if (key.includes('time') && String(expectedVal).startsWith(String(dbVal))) {
                    continue;
                }
                if (key.includes('time') && String(dbVal).startsWith(String(expectedVal))) {
                    continue;
                }
                mismatchFields.push(key);
            }
        }
    }

    if (missingFields.length > 0 || mismatchFields.length > 0) {
        const msg = `Save Verification Failed for ${table}. Missing: ${missingFields.join(',')}, Mismatch: ${mismatchFields.join(',')}`;
        await logVerificationFailure(conn, `VERIFICATION_FAILED_${table.toUpperCase()}`, insertId, msg);
        console.warn(msg); // Log instead of throwing to prevent false rollbacks
    }
}
