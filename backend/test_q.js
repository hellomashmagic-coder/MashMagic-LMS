const mysql = require('mysql2/promise');

async function verify() {
    const db = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'MashMagic2026!',
        database: 'mashmagic'
    });

    console.log('\n========== DATABASE CROSS-VERIFICATION REPORT ==========\n');

    // 1. Check Muhammed Hirash
    console.log('--- 1. Muhammed Hirash student record ---');
    const [hirash] = await db.query("SELECT id, name, mentor_id FROM students WHERE name LIKE '%hirash%'");
    console.log(hirash);
    
    const hirashId = hirash[0]?.id;
    if (!hirashId) { console.log('Student not found!'); process.exit(1); }

    // 2. Check timetable rows for this student
    console.log('\n--- 2. Timetable rows for this student ---');
    const [tt] = await db.query(`
        SELECT id, date, start_time, end_time, faculty_id, faculty_name, subject, session_type, status
        FROM timetable 
        WHERE student_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
        ORDER BY id DESC LIMIT 10
    `, [hirashId]);
    console.log(tt);

    // 3. faculty_id from latest timetable - check in BOTH users and faculties
    if (tt.length > 0) {
        const latestFacultyId = tt[0].faculty_id;
        console.log(`\n--- 3. Faculty ID in latest timetable row: ${latestFacultyId} ---`);
        
        const [fromUsers] = await db.query("SELECT id, name, role FROM users WHERE id = ?", [latestFacultyId]);
        console.log('From users table:', fromUsers);
        
        const [fromFaculties] = await db.query("SELECT id, name FROM faculties WHERE id = ?", [latestFacultyId]);
        console.log('From faculties table:', fromFaculties);
    }

    // 4. faculty_sessions for this student
    console.log('\n--- 4. faculty_sessions for this student ---');
    const [fs] = await db.query(`
        SELECT fs.id, fs.faculty_id, fs.topic, fs.date, fs.start_time, fs.status, fs.timetable_id,
               u.name as users_faculty_name,
               f.name as faculties_faculty_name
        FROM faculty_sessions fs
        LEFT JOIN session_attendance sa ON fs.id = sa.session_id
        LEFT JOIN users u ON fs.faculty_id = u.id AND u.role = 'faculty'
        LEFT JOIN faculties f ON fs.faculty_id = f.id
        WHERE sa.student_id = ? AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
        ORDER BY fs.id DESC LIMIT 10
    `, [hirashId]);
    console.log(fs);

    // 5. All faculty_ids in timetable - check if they exist in users table
    console.log('\n--- 5. ALL distinct faculty IDs in timetable vs users vs faculties ---');
    const [allFacIds] = await db.query(`
        SELECT DISTINCT faculty_id FROM timetable 
        WHERE student_id = ? AND faculty_id IS NOT NULL AND (is_deleted IS NULL OR is_deleted = 0)
    `, [hirashId]);
    
    for (const row of allFacIds) {
        const fid = row.faculty_id;
        const [[uRow]] = await db.query("SELECT id, name, role FROM users WHERE id = ?", [fid]);
        const [[fRow]] = await db.query("SELECT id, name FROM faculties WHERE id = ?", [fid]);
        console.log(`faculty_id=${fid} | users: ${uRow ? uRow.name + '(' + uRow.role + ')' : 'NOT FOUND'} | faculties: ${fRow ? fRow.name : 'NOT FOUND'}`);
    }

    // 6. Summary: what does the API actually show?
    console.log('\n--- 6. What API currently returns (new query with users table first) ---');
    const [apiResult] = await db.query(`
        SELECT fs.id, fs.faculty_id, fs.date, fs.start_time, fs.topic,
               COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(f.name), ''), 'Unassigned') as faculty_name_NEW,
               s.name as student_name
        FROM faculty_sessions fs
        LEFT JOIN users u ON fs.faculty_id = u.id AND u.role = 'faculty'
        LEFT JOIN faculties f ON fs.faculty_id = f.id
        LEFT JOIN session_attendance sa ON fs.id = sa.session_id
        LEFT JOIN students s ON sa.student_id = s.id
        WHERE sa.student_id = ? AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
        ORDER BY fs.id DESC LIMIT 10
    `, [hirashId]);
    console.log(apiResult);

    console.log('\n========== END OF REPORT ==========\n');
    await db.end();
    process.exit(0);
}

verify().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
