const db = require('./backend/config/db');

async function test() {
    try {
        const query = `
            SELECT * FROM (
                -- 1. Mentors logging interactions with Faculty
                SELECT 
                    mfi.id, mfi.created_at, mfi.mentor_id, mfi.student_id,
                    CONVERT(m.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('Faculty Call' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    CONVERT(mfi.main_issue USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes,
                    NULL as understanding_level, NULL as student_confidence, NULL as stress_level,
                    mfi.is_flagged, CONVERT(mfi.flag_reason USING utf8mb4) COLLATE utf8mb4_unicode_ci as flag_reason,
                    CONVERT(f.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as faculty_name, mfi.faculty_id
                FROM mentor_faculty_interactions mfi
                LEFT JOIN mentors m ON mfi.mentor_id = m.id
                LEFT JOIN students s ON mfi.student_id = s.id
                LEFT JOIN faculties f ON mfi.faculty_id = f.id
                WHERE 1=1

                UNION ALL

                -- 2. Mentors tracking Faculty
                SELECT 
                    fil.id, fil.created_at, fil.mentor_id, fil.student_id,
                    CONVERT(m.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_name, 
                    CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('Faculty Tracking' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    CONVERT(fil.notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes,
                    NULL as understanding_level, NULL as student_confidence, NULL as stress_level,
                    0 as is_flagged, NULL as flag_reason,
                    CONVERT(f.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as faculty_name, fil.faculty_id
                FROM faculty_interaction_logs fil
                LEFT JOIN mentors m ON fil.mentor_id = m.id
                LEFT JOIN students s ON fil.student_id = s.id
                LEFT JOIN faculties f ON fil.faculty_id = f.id
                WHERE 1=1

                UNION ALL

                -- 3. Faculty Intelligence Reports
                SELECT 
                    sr.id, sr.created_at, NULL as mentor_id, sr.student_id,
                    NULL as mentor_name, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name,
                    CONVERT('Faculty Intelligence' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    CONVERT(sr.remarks USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes,
                    NULL as understanding_level, NULL as student_confidence, NULL as stress_level,
                    0 as is_flagged, NULL as flag_reason,
                    CONVERT(f.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as faculty_name, sr.faculty_id
                FROM student_reports sr
                LEFT JOIN students s ON sr.student_id = s.id
                LEFT JOIN faculties f ON sr.faculty_id = f.id
                WHERE 1=1

                UNION ALL

                -- 4. Actual Faculty Sessions
                SELECT 
                    fs.id, fs.created_at, NULL as mentor_id, NULL as student_id,
                    NULL as mentor_name, NULL as student_name,
                    CONVERT('Faculty Session' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source,
                    CONVERT(fs.topic USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes,
                    NULL as understanding_level, NULL as student_confidence, NULL as stress_level,
                    0 as is_flagged, NULL as flag_reason,
                    CONVERT(f.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as faculty_name, fs.faculty_id
                FROM faculty_sessions fs
                LEFT JOIN users f ON fs.faculty_id = f.id
                WHERE 1=1
            ) as unified_faculty_logs
            ORDER BY created_at DESC LIMIT 1;
        `;
        const [rows] = await db.query(query, []);
        console.log("SUCCESS:", rows);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit();
    }
}

test();
