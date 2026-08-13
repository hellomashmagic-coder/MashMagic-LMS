const db = require('../config/db');
const bcrypt = require('bcrypt');
const { logFacultyChanges } = require('../utils/facultyChangeLogger');
const User = require('../models/userModel');

const ensureAoeDemoScheduleColumns = async () => {
    const columnsToAdd = [
        'ALTER TABLE aoe_demo_schedules ADD COLUMN type VARCHAR(50) DEFAULT "demo"',
        'ALTER TABLE aoe_demo_schedules ADD COLUMN faculty_name VARCHAR(255) NULL',
        'ALTER TABLE aoe_demo_schedules ADD COLUMN date DATE NULL',
        'ALTER TABLE aoe_demo_schedules ADD COLUMN syllabus VARCHAR(255) NULL',
        'ALTER TABLE aoe_demo_schedules ADD COLUMN section VARCHAR(255) NULL',
        'ALTER TABLE aoe_demo_schedules ADD COLUMN meeting_link VARCHAR(255) NULL',
        'ALTER TABLE aoe_demo_schedules MODIFY COLUMN faculty_id INT NULL'
    ];

    for (const query of columnsToAdd) {
        try {
            await db.query(query);
        } catch (e) {
            // column already exists
        }
    }
};

// @desc    Get dashboard metrics and today's schedule
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const safeQuery = async (query, params, label) => {
            try {
                const [result] = await db.query(query, params);
                return result;
            } catch (err) {
                console.error(`[AOE Dashboard Error] ${label}:`, err.message);
                return [];
            }
        };

        const studentsStats = await safeQuery('SELECT COUNT(*) as totalStudents FROM students WHERE status = "active"', [], 'totalStudents');
        const facultiesStats = await safeQuery('SELECT COUNT(*) as totalFaculties FROM faculties WHERE status = "active"', [], 'totalFaculties');
        const mentorsStats = await safeQuery('SELECT COUNT(*) as totalMentors FROM mentors WHERE status = "active"', [], 'totalMentors');

        const totalStudents = studentsStats[0]?.totalStudents || 0;
        const totalFaculties = facultiesStats[0]?.totalFaculties || 0;
        const totalMentors = mentorsStats[0]?.totalMentors || 0;

        const schedule = await safeQuery(`
            SELECT 
                tt.id, tt.start_time, tt.end_time, tt.chapter, tt.status,
                s.name as student_name, s.subject,
                u.name as faculty_name
            FROM timetable tt
            JOIN students s ON tt.student_id = s.id
            LEFT JOIN users u ON s.faculty_id = u.id AND u.role = 'faculty'
            WHERE tt.date = ?
            ORDER BY tt.start_time ASC
        `, [today], 'schedule');

        const activityFeed = await safeQuery(`
            SELECT * FROM (
                 (SELECT CONVERT('Quick Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(sil.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, sil.created_at as date
                  FROM student_interaction_logs sil
                  JOIN students s ON sil.student_id = s.id
                  JOIN users u ON sil.mentor_id = u.id WHERE u.role = 'mentor')
                 UNION ALL
                 (SELECT CONVERT('Session Log' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(CONCAT(msl.main_issue, ': ', msl.action_type) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, msl.created_at as date
                  FROM mentor_session_logs msl
                  JOIN students s ON msl.student_id = s.id
                  JOIN users u ON msl.mentor_id = u.id WHERE u.role = 'mentor')
                 UNION ALL
                 (SELECT CONVERT('Hub Report' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, 
                          CONVERT(COALESCE(
                              JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.notes')), 
                              JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.action_plan')),
                              JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.next_task')),
                              JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.study_status')),
                              JSON_UNQUOTE(JSON_EXTRACT(msr.report_data, '$.main_problem')),
                              msr.session_type
                          ) USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, 
                          CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, msr.created_at as date
                  FROM mentor_session_reports msr
                  JOIN students s ON msr.student_id = s.id
                  JOIN users u ON msr.mentor_id = u.id WHERE u.role = 'mentor'
                  AND msr.report_data IS NOT NULL AND JSON_VALID(msr.report_data))
                UNION ALL
                (SELECT CONVERT('Mentorship' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(ml.action_details USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, ml.created_at as date
                 FROM mentorship_logs ml
                 JOIN students s ON ml.student_id = s.id
                 JOIN mentors u ON ml.mentor_id = u.id)
                UNION ALL
                (SELECT CONVERT('Faculty Interaction' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(fil.notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, fil.created_at as date
                 FROM faculty_interaction_logs fil
                 JOIN students s ON fil.student_id = s.id
                 JOIN mentors u ON fil.mentor_id = u.id)
                UNION ALL
                (SELECT CONVERT('Staff Call' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(mfi.main_issue USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, mfi.created_at as date
                 FROM mentor_faculty_interactions mfi
                 JOIN students s ON mfi.student_id = s.id
                 JOIN mentors u ON mfi.mentor_id = u.id)
                UNION ALL
                 (SELECT CONVERT('Intelligence' USING utf8mb4) COLLATE utf8mb4_unicode_ci as type, CONVERT(COALESCE(r.remarks, 'No details') USING utf8mb4) COLLATE utf8mb4_unicode_ci as mentor_notes, CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as student_name, CONVERT(u.name USING utf8mb4) COLLATE utf8mb4_unicode_ci as origin_name, r.created_at as date
                  FROM student_reports r 
                  JOIN students s ON r.student_id = s.id 
                  JOIN faculties u ON r.faculty_id = u.id)
            ) as combined_logs
            ORDER BY date DESC
            LIMIT 20
        `, [], 'activityFeed');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalStudents,
                    totalFaculties,
                    totalMentors,
                    todaySessions: (schedule || []).length
                },
                schedule: schedule || [],
                activityFeed: activityFeed || []
            }
        });
    } catch (error) {
        console.error('FATAL ERROR in getDashboardStats:', error);
        res.status(500).json({ success: false, message: "Dashboard Critical Error", error: error.message });
    }
};

const getExamAnalytics = async (req, res) => {
    try {
        const { student_id } = req.query;
        let query = student_id ? 
            'SELECT milestone_session as subject, CAST(score AS DECIMAL(10,2)) as percentage FROM student_exams WHERE status = "Completed" AND student_id = ?' :
            'SELECT milestone_session as subject, AVG(CAST(score AS DECIMAL(10,2))) as percentage FROM student_exams WHERE status = "Completed" GROUP BY milestone_session';
        const [stats] = await db.query(query, student_id ? [student_id] : []);
        res.status(200).json({ success: true, data: stats });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAllFacultyActivity = async (req, res) => {
    try {
        const [sessions] = await db.query('SELECT s.*, u.name as faculty_name FROM faculty_sessions s JOIN faculties u ON s.faculty_id = u.id ORDER BY s.date DESC');
        const [reports] = await db.query('SELECT r.*, s.name as student_name, u.name as faculty_name FROM student_reports r JOIN students s ON r.student_id = s.id JOIN faculties u ON r.faculty_id = u.id ORDER BY r.created_at DESC');
        res.status(200).json({ success: true, data: { sessions, reports } });
    } catch (error) { res.status(500).json({ success: false, message: "Server Error", error: error.message }); }
};

const performAutoSync = async () => {
    try {
        const [ms] = await db.query('SELECT * FROM users WHERE role = "mentor"');
        for (const m of ms) {
            try {
                const [existing] = await db.query('SELECT id FROM mentors WHERE email = ? OR phone_number = ? OR name = ? LIMIT 1', [m.email, m.phone_number, m.name]);
                if (existing.length > 0) {
                    await db.query('UPDATE mentors SET name = ?, email = ?, phone_number = ?, status = ? WHERE id = ?', [m.name, m.email, m.phone_number, m.status, existing[0].id]);
                } else {
                    await db.query('INSERT INTO mentors (name, email, phone_number, status) VALUES (?, ?, ?, ?)', [m.name, m.email, m.phone_number, m.status]);
                }
            } catch (err) {
                console.error(`Error syncing mentor ${m.id}:`, err.message);
            }
        }
        
        const [fs] = await db.query('SELECT * FROM users WHERE role = "faculty"');
        for (const f of fs) {
            try {
                const [existing] = await db.query('SELECT id FROM faculties WHERE email = ? OR phone_number = ? OR name = ? LIMIT 1', [f.email, f.phone_number, f.name]);
                if (existing.length > 0) {
                    await db.query('UPDATE faculties SET name = ?, email = ?, phone_number = ?, status = ?, subject = COALESCE(subject, ?) WHERE id = ?', [f.name, f.email, f.phone_number, f.status, f.subject || null, existing[0].id]);
                } else {
                    await db.query('INSERT INTO faculties (name, email, phone_number, status, subject) VALUES (?, ?, ?, ?, ?)', [f.name, f.email, f.phone_number, f.status, f.subject || null]);
                }
            } catch (err) {
                console.error(`Error syncing faculty ${f.id}:`, err.message);
            }
        }

        // Reverse sync: Legacy faculties to users table
        const [legacyFaculties] = await db.query('SELECT * FROM faculties f WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = f.email OR u.phone_number = f.phone_number OR u.name = f.name)');
        for (const lf of legacyFaculties) {
            try {
                const hash = await bcrypt.hash(lf.phone_number || "faculty123", 10);
                await db.query(`
                    INSERT INTO users (name, email, phone_number, password, role, status, isApproved)
                    VALUES (?, ?, ?, ?, 'faculty', ?, 0)
                `, [lf.name, lf.email || null, lf.phone_number || null, hash, lf.status || 'pending']);
            } catch (err) {
                console.error(`Error reverse syncing legacy faculty ${lf.name}:`, err.message);
            }
        }

        const [sts] = await db.query('SELECT * FROM users WHERE role = "student"');
        for (const s of sts) {
            try {
                let existing = [];
                // 1. Try to find by user_id
                const [byUserId] = await db.query('SELECT id, user_id FROM students WHERE user_id = ? LIMIT 1', [s.id]);
                if (byUserId.length > 0) {
                    existing = byUserId;
                } else {
                    // 2. Fallback: find by contact/email ONLY if the student does not have a user_id yet
                    let findQ = 'SELECT id, user_id FROM students WHERE user_id IS NULL AND (1=0';
                    let findParams = [];
                    if (s.phone_number) { findQ += ' OR contact = ?'; findParams.push(s.phone_number); }
                    if (s.email) { findQ += ' OR email = ?'; findParams.push(s.email); }
                    findQ += ') LIMIT 1';
                    
                    if (findParams.length > 0) {
                        const [byContact] = await db.query(findQ, findParams);
                        if (byContact.length > 0) existing = byContact;
                    }
                }
                
                if (existing.length > 0) {
                    await db.query('UPDATE students SET user_id = ?, name = ?, email = COALESCE(email, ?), contact = COALESCE(contact, ?), status = ? WHERE id = ?', 
                        [s.id, s.name, s.email || null, s.phone_number || null, s.status, existing[0].id]);
                } else {
                    await db.query('INSERT INTO students (user_id, name, email, contact, status) VALUES (?, ?, ?, ?, ?)', 
                        [s.id, s.name, s.email || null, s.phone_number || null, s.status]);
                }
            } catch (err) {
                console.error(`Error syncing student ${s.id}:`, err.message);
            }
        }
    } catch (e) { console.error("AUTO_SYNC_ERR:", e.message); }
};

const forceSync = async (req, res) => {
    try {
        // SAFE SYNC: No automatic deletion of students.
        // We only add/update records, never delete.
        await performAutoSync();
        res.status(200).json({ success: true, message: "Sync complete" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};


const getAvailableFaculties = async (req, res) => {
    try {
        await performAutoSync();
        let { subject, dayConfigs } = req.query;
        
        let configs = [];
        if (dayConfigs) {
            try { configs = JSON.parse(decodeURIComponent(dayConfigs)); }
            catch(e) { configs = JSON.parse(dayConfigs); }
        }

        const subjectsList = subject ? subject.split(',') : [];

        // Base query to get faculties that match the subject criteria
        // We use users table with role = 'faculty' instead of faculties view/table to be safe.
        const [faculties] = await db.query('SELECT id, name, subject as primary_subject, secondary_subjects, profile_pic, hourly_rate FROM users WHERE role = "faculty"');

        const matchingFaculties = faculties.filter(f => {
            if (subjectsList.length === 0) return true;
            let allSubjects = [];
            if (f.primary_subject) {
                allSubjects = f.primary_subject.split(',').map(s => s.trim());
            }
            try { 
                let secs = f.secondary_subjects ? (typeof f.secondary_subjects === 'string' ? JSON.parse(f.secondary_subjects) : f.secondary_subjects) : []; 
                if (Array.isArray(secs)) allSubjects.push(...secs.map(s => s.trim()));
            } catch(e){}
            
            // Check if faculty has ALL requested subjects (or ANY? usually ANY is fine if one faculty is chosen per row)
            return subjectsList.some(s => allSubjects.includes(s.trim()));
        });

        if (configs.length === 0) {
            return res.status(200).json({ success: true, data: matchingFaculties.map(f => ({ ...f, isAvailable: true })) });
        }

        // Build conflict conditions for all configs
        const conflictConditions = configs.map(() => `(fs.day_of_week = ? AND STR_TO_DATE(fs.start_time, '%h:%i %p') < STR_TO_DATE(?, '%h:%i %p') AND STR_TO_DATE(fs.end_time, '%h:%i %p') > STR_TO_DATE(?, '%h:%i %p'))`).join(' OR ');
        
        let params = [];
        configs.forEach(c => {
            params.push(c.day, c.endTime, c.startTime);
        });

        // We can check all matched faculties at once
        const facultyIds = matchingFaculties.map(f => f.id);
        if (facultyIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const placeholders = facultyIds.map(() => '?').join(',');
        params = [...params, ...facultyIds];

        const [conflicts] = await db.query(`
            SELECT DISTINCT faculty_id 
            FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND (${conflictConditions}) 
            AND faculty_id IN (${placeholders})
        `, params);

        const conflictedIds = conflicts.map(c => c.faculty_id);

        const finalData = matchingFaculties.map(f => ({
            ...f,
            subject: f.primary_subject, // backwards compatibility
            isAvailable: !conflictedIds.includes(f.id)
        }));

        res.status(200).json({ success: true, data: finalData });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getDropdownData = async (req, res) => {
    try {
        await performAutoSync();
        const [ms] = await db.query('SELECT id, name FROM mentors');
        const [mhs] = await db.query('SELECT id, name FROM users WHERE role = "mentor_head"');
        const [fs] = await db.query('SELECT id, name, subject FROM faculties');
        res.status(200).json({ success: true, data: { mentors: ms, mentorHeads: mhs, faculties: fs } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const registerStudent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { 
            name, email, contact, password, grade, course, mentorId,
            admissionDate, schoolName, preferredLanguage, country,
            totalFees, totalPaid, totalHours, nextInstallmentDate,
            admissionType, registrationNumber, meetingLink, enrollmentType,
            selectedSubjects, rejoiningFee, syllabus
        } = req.body;

        // Ensure student email does not conflict with staff emails
        // If a staff email was auto-filled by the browser, silently remove it
        let finalEmail = email;
        if (finalEmail && finalEmail.trim() !== '') {
            const [staffCheck] = await conn.query('SELECT id FROM users WHERE email = ? AND role != "student"', [finalEmail]);
            if (staffCheck.length > 0) {
                finalEmail = null;
            }
        }

        const hash = await bcrypt.hash(password || "student123", 10);
        
        let badge = 'Stable';
        if (enrollmentType === 'Mentorship') badge = 'Gold';
        if (enrollmentType === 'Tuition') badge = 'Silver';
        if (enrollmentType === 'Mentorship and Tuition') badge = 'Diamond';

        await conn.beginTransaction();
        const [ur] = await conn.query('INSERT INTO users (name, email, phone_number, password, role, status, isApproved, isActive) VALUES (?, ?, ?, ?, "student", "active", 1, 1)', [name, finalEmail || null, contact || null, hash]);
        
        const [studentResult] = await conn.query(`
            INSERT INTO students (
                name, email, password, user_id, contact, grade, course, mentor_id, 
                admission_date, school_name, preferred_language, country, 
                total_fees, total_paid, total_hours, next_installment_date, 
                admission_type, registration_number, meeting_link, enrollment_type, badge, 
                subjects_json, status, isApproved, priority_category, rejoining_fee, syllabus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "active", 1, "High", ?, ?)
        `, [
            name, finalEmail || null, hash, ur.insertId, contact || null, grade, course, mentorId || null,
            admissionDate || null, schoolName || null, preferredLanguage || null, country || null,
            totalFees || 0, totalPaid || 0, totalHours || 0, nextInstallmentDate || null,
            admissionType || 'new', registrationNumber || null, meetingLink || null, enrollmentType || null, badge,
            selectedSubjects ? JSON.stringify(selectedSubjects) : null,
            rejoiningFee || 0, syllabus || null
        ]);

        const studentId = studentResult.insertId;

        if (selectedSubjects && Array.isArray(selectedSubjects) && selectedSubjects.length > 0) {
            for (const sub of selectedSubjects) {
                const subjectStr = Array.isArray(sub.subject) 
                    ? (sub.subject.length > 0 ? sub.subject.join(', ') : null) 
                    : (sub.subject || null);
                
                if (sub.dayConfigs && Array.isArray(sub.dayConfigs) && sub.dayConfigs.length > 0) {
                    for (const config of sub.dayConfigs) {
                        if (sub.facultyId && config.day && config.startTime && config.endTime) {
                            await conn.query(`
                                INSERT INTO faculty_schedules (
                                    faculty_id, student_id, subject, day_of_week, start_time, end_time, hourly_rate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [
                                sub.facultyId, studentId, subjectStr, config.day, config.startTime, config.endTime, sub.hourlyRate || 0
                            ]);
                        }
                    }
                } else {
                    const days = sub.days || (sub.day ? [sub.day] : []);
                    for (const day of days) {
                        if (sub.facultyId && day && sub.startTime && sub.endTime) {
                            await conn.query(`
                                INSERT INTO faculty_schedules (
                                    faculty_id, student_id, subject, day_of_week, start_time, end_time, hourly_rate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [
                                sub.facultyId, studentId, subjectStr, day, sub.startTime, sub.endTime, sub.hourlyRate || 0
                            ]);
                        }
                    }
                }
            }
        }

        // --- PHASE 3: REGISTRATION GUARANTEE (VERIFICATION) ---
        const { verifyStudentSave, verifyFacultySchedules } = require('../utils/saveVerifier');

        // Prepare the exact payload we expect to be saved
        const payloadToVerify = {
            name, email: finalEmail || null, contact: contact || null, grade, course, mentor_id: mentorId || null,
            admission_date: admissionDate || null, school_name: schoolName || null, 
            preferred_language: preferredLanguage || null, country: country || null,
            total_fees: totalFees || 0, total_paid: totalPaid || 0, total_hours: totalHours || 0,
            next_installment_date: nextInstallmentDate || null, admission_type: admissionType || 'new',
            registration_number: registrationNumber || null, meeting_link: meetingLink || null, 
            enrollment_type: enrollmentType || null, badge,
            subjects_json: selectedSubjects ? JSON.stringify(selectedSubjects) : null,
            rejoining_fee: rejoiningFee || 0, syllabus: syllabus || null,
            user_id: ur.insertId
        };

        await verifyStudentSave(conn, studentId, payloadToVerify);

        const finalSubjects = selectedSubjects;
        if (finalSubjects && Array.isArray(finalSubjects) && finalSubjects.length > 0) {
            let expectedSchedulesCount = 0;
            for (const sub of finalSubjects) {
                if (sub.dayConfigs && Array.isArray(sub.dayConfigs) && sub.dayConfigs.length > 0) {
                    expectedSchedulesCount += sub.dayConfigs.filter(c => sub.facultyId && c.day && c.startTime && c.endTime).length;
                } else {
                    const days = sub.days || (sub.day ? [sub.day] : []);
                    expectedSchedulesCount += days.filter(day => sub.facultyId && day && sub.startTime && sub.endTime).length;
                }
            }
            if (expectedSchedulesCount > 0) {
                await verifyFacultySchedules(conn, studentId, expectedSchedulesCount);
            }
        }

        await conn.commit();
        conn.release();
        res.status(201).json({ success: true, message: "Student registered successfully with complete data verification" });
    } catch (e) { await conn.rollback(); conn.release(); res.status(500).json({ success: false, message: e.message }); }
};

const registerFaculty = async (req, res) => {
    try {
        const { name, email, phone_number, password, ...rest } = req.body;
        const hash = await bcrypt.hash(password || phone_number || "faculty123", 10);
        
        // Auto-generate faculty_id_card (e.g. FAC-01)
        const [rows] = await db.query('SELECT faculty_id_card FROM users WHERE role = "faculty" AND faculty_id_card LIKE "FAC-%" ORDER BY CAST(SUBSTRING(faculty_id_card, 5) AS UNSIGNED) DESC LIMIT 1');
        let nextId = "FAC-01";
        if (rows.length > 0 && rows[0].faculty_id_card) {
            const currentNumber = parseInt(rows[0].faculty_id_card.split('-')[1], 10);
            if (!isNaN(currentNumber)) {
                nextId = `FAC-${String(currentNumber + 1).padStart(2, '0')}`;
            }
        }
        rest.faculty_id_card = nextId;

        await User.create({ name, email, phone_number, password: hash, role: 'faculty', status: 'pending', ...rest });
        res.status(201).json({ success: true, message: "Faculty registered", data: { faculty_id_card: nextId } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const registerSSC = async (req, res) => {
    try {
        const { name, email, phone_number, password } = req.body;
        const hash = await bcrypt.hash(password || phone_number || "ssc123", 10);
        await User.create({ name, email, phone_number, password: hash, role: 'ssc', status: 'pending' });
        res.status(201).json({ success: true, message: "SSC registered" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getStudentInteractionLogs = async (req, res) => {
    try {
        const { student_id, mentor_id, startDate, endDate } = req.query;
        let params = [];
        const baseWhere = (tableAlias, dateCol = 'created_at') => {
            let clause = 'WHERE 1=1';
            if (student_id) { clause += ` AND ${tableAlias}.student_id = ?`; params.push(student_id); }
            if (mentor_id) { clause += ` AND ${tableAlias}.mentor_id = ?`; params.push(mentor_id); }
            if (startDate) { clause += ` AND ${tableAlias}.${dateCol} >= ?`; params.push(startDate); }
            if (endDate) { clause += ` AND ${tableAlias}.${dateCol} <= ?`; params.push(endDate + ' 23:59:59'); }
            return clause;
        };

        const query = `
            SELECT * FROM (
                SELECT sil.id, sil.created_at, CONVERT('Quick' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source, CONVERT(sil.mentor_notes USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes, m.name as mentor_name, s.name as student_name 
                FROM student_interaction_logs sil 
                JOIN mentors m ON sil.mentor_id = m.id 
                JOIN students s ON sil.student_id = s.id 
                ${baseWhere('sil')}
                UNION ALL
                SELECT msl.id, msl.created_at, CONVERT('Session' USING utf8mb4) COLLATE utf8mb4_unicode_ci as source, CONVERT(msl.main_issue USING utf8mb4) COLLATE utf8mb4_unicode_ci as notes, m.name as mentor_name, s.name as student_name 
                FROM mentor_session_logs msl 
                JOIN mentors m ON msl.mentor_id = m.id 
                JOIN students s ON msl.student_id = s.id 
                ${baseWhere('msl')}
            ) as logs ORDER BY created_at DESC
        `;
        // Since baseWhere pushes to params, we need to handle UNION parameters carefully. 
        // For simplicity in this rewrite, I'll reset params and just pass what's needed.
        let finalParams = [];
        const getP = () => { let p = []; if(student_id) p.push(student_id); if(mentor_id) p.push(mentor_id); if(startDate) p.push(startDate); if(endDate) p.push(endDate + ' 23:59:59'); return p; };
        finalParams = [...getP(), ...getP()];

        const [rows] = await db.query(query, finalParams);
        res.status(200).json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFacultyInteractionLogs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT f.*, u.name as faculty_name, s.name as student_name FROM faculty_interaction_logs f JOIN faculties u ON f.faculty_id = u.id JOIN students s ON f.student_id = s.id ORDER BY f.created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAcademicActions = async (req, res) => {
    try {
        // 1. Fetch Milestones (Students needing exam plans)
        const [milestones] = await db.query(`
            SELECT 
                r.student_id, s.name as student_name, r.session_number as milestone,
                m.name as mentor_name,
                MAX(e.portions) as portions, MAX(e.chapter) as chapter, 
                MAX(e.exam_type) as exam_type, MAX(e.scheduled_date) as scheduled_date
            FROM timetable r
            JOIN students s ON r.student_id = s.id
            LEFT JOIN mentors m ON s.mentor_id = m.id
            LEFT JOIN student_exams e ON r.student_id = e.student_id AND r.session_number = e.milestone_session
            WHERE (r.session_number % 5 = 0)
            AND r.status = 'Completed'
            AND (e.id IS NULL OR e.status = 'Pending')
            GROUP BY r.student_id, r.session_number, s.name, m.name
            ORDER BY MAX(r.date) DESC
        `);

        // 2. Fetch Daily Logs (Faculty sessions today)
        const [dailyLogs] = await db.query(`
            SELECT fs.*, f.name as faculty_name 
            FROM faculty_sessions fs
            JOIN faculties f ON fs.faculty_id = f.id
            WHERE fs.date = CURDATE()
            ORDER BY fs.start_time ASC
        `);

        res.status(200).json({ 
            success: true, 
            data: { 
                milestones: milestones || [], 
                dailyLogs: dailyLogs || [] 
            } 
        });
    } catch (e) {
        console.error("GET_ACADEMIC_ACTIONS_ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const getDailyFacultyChecks = async (req, res) => {
    try {
        const { page, limit } = req.query;
        let query = 'SELECT * FROM faculty_sessions WHERE date = CURDATE()';
        
        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            const countQuery = 'SELECT COUNT(*) as total FROM faculty_sessions WHERE date = CURDATE()';
            const [countResult] = await db.query(countQuery);
            const total = countResult[0].total;
            
            query += ' LIMIT ? OFFSET ?';
            const [rows] = await db.query(query, [limitNum, offset]);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const checkFacultySessionToday = async (req, res) => {
    try {
        await db.query('UPDATE faculty_sessions SET status = "Completed" WHERE id = ?', [req.params.sessionId]);
        res.status(200).json({ success: true, message: "Done" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const uncheckFacultySession = async (req, res) => {
    try {
        await db.query('UPDATE faculty_sessions SET status = "Scheduled" WHERE id = ?', [req.params.sessionId]);
        res.status(200).json({ success: true, message: "Unchecked" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFacultyDirectory = async (req, res) => {
    try {
        await performAutoSync();
        const { page, limit, search, syllabi, sections, subjects, sortBy } = req.query;
        let query = 'SELECT * FROM faculties WHERE status = "active"';
        let countQuery = 'SELECT COUNT(*) as total FROM faculties WHERE status = "active"';
        let params = [];
        
        if (search) {
            const searchParam = `%${search}%`;
            const searchCondition = ' AND (name LIKE ? OR email LIKE ? OR subjects LIKE ?)';
            query += searchCondition;
            countQuery += searchCondition;
            params.push(searchParam, searchParam, searchParam);
        }

        if (syllabi) {
            const syllabiArr = syllabi.split(',');
            if (syllabiArr.length > 0) {
                const syllabiConditions = syllabiArr.map(() => 'syllabus LIKE ?').join(' OR ');
                query += ` AND (${syllabiConditions})`;
                countQuery += ` AND (${syllabiConditions})`;
                syllabiArr.forEach(syl => params.push(`%${syl}%`));
            }
        }

        if (sections) {
            const sectionsArr = sections.split(',');
            if (sectionsArr.length > 0) {
                const sectionsConditions = sectionsArr.map(() => 'section LIKE ?').join(' OR ');
                query += ` AND (${sectionsConditions})`;
                countQuery += ` AND (${sectionsConditions})`;
                sectionsArr.forEach(sec => params.push(`%${sec}%`));
            }
        }

        if (subjects) {
            const subjectsArr = subjects.split(',');
            if (subjectsArr.length > 0) {
                const subjectsConditions = subjectsArr.map(() => 'subjects LIKE ?').join(' OR ');
                query += ` AND (${subjectsConditions})`;
                countQuery += ` AND (${subjectsConditions})`;
                subjectsArr.forEach(sub => params.push(`%${sub}%`));
            }
        }

        if (sortBy === 'name') {
            query += ' ORDER BY name ASC';
        } else if (sortBy === 'oldest') {
            query += ' ORDER BY id ASC';
        } else {
            query += ' ORDER BY id DESC';
        }

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;

            query += ' LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAcademicDocuments = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM academic_documents ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const uploadAcademicDocument = async (req, res) => {
    try {
        await db.query('INSERT INTO academic_documents (title, type, url) VALUES (?, ?, ?)', [req.body.title, req.body.type, req.body.url]);
        res.status(201).json({ success: true, message: "Uploaded" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteAcademicDocument = async (req, res) => {
    try {
        await db.query('UPDATE academic_documents SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getLiveClassEvaluations = async (req, res) => {
    try {
        const { page, limit } = req.query;
        let query = 'SELECT e.*, uf.name as faculty_name FROM live_class_feedbacks e JOIN faculties uf ON e.faculty_id = uf.id ORDER BY e.created_at DESC';
        
        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            const countQuery = 'SELECT COUNT(*) as total FROM live_class_feedbacks e JOIN faculties uf ON e.faculty_id = uf.id';
            const [countResult] = await db.query(countQuery);
            const total = countResult[0].total;
            
            query += ' LIMIT ? OFFSET ?';
            const [rows] = await db.query(query, [limitNum, offset]);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const markLiveClassFeedbacksRead = async (req, res) => {
    try {
        await db.query('UPDATE live_class_feedbacks SET is_read = 1');
        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const submitLiveClassEvaluation = async (req, res) => {
    try {
        await db.query('INSERT INTO live_class_feedbacks (academic_operation_executive_id, faculty_id, student_id, remarks) VALUES (?, ?, ?, ?)', [req.user.id, req.body.faculty_id, req.body.student_id || null, req.body.remarks]);
        res.status(201).json({ success: true, message: "Submitted" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getPendingFacultyLogs = async (req, res) => {
    try {
        const { page, limit } = req.query;
        let query = 'SELECT f.*, u.name as faculty_name FROM faculty_interaction_logs f JOIN users u ON f.faculty_id = u.id WHERE u.role = "faculty" AND verification_status = "Pending" ORDER BY f.created_at DESC';
        
        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            const countQuery = 'SELECT COUNT(*) as total FROM faculty_interaction_logs f JOIN users u ON f.faculty_id = u.id WHERE u.role = "faculty" AND verification_status = "Pending"';
            const [countResult] = await db.query(countQuery);
            const total = countResult[0].total;
            
            query += ' LIMIT ? OFFSET ?';
            const [rows] = await db.query(query, [limitNum, offset]);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const verifyFacultyLog = async (req, res) => {
    try {
        await db.query('UPDATE faculty_interaction_logs SET verification_status = ?, verified_by = ? WHERE id = ?', [req.body.status, req.user.id, req.params.id]);
        res.status(200).json({ success: true, message: "Verified" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const editFaculty = async (req, res) => {
    try {
        const { 
            name, email, phone_number, password,
            place, faculty_id_card, qualification, experience, 
            availability, hourly_rate, teaching_mode, joining_date, remarks,
            primary_subject, secondary_subjects, syllabus, languages_proficiency, section
        } = req.body;

        const subjectsList = [primary_subject, ...(secondary_subjects || [])].filter(Boolean);
        const subjectValue = subjectsList.length > 0 ? subjectsList.join(',') : null;
        const syllabusValue = Array.isArray(syllabus) ? syllabus.join(',') : (syllabus || null);
        const languagesValue = languages_proficiency ? JSON.stringify(languages_proficiency) : null;

        let updateQuery = `
            UPDATE faculties SET 
                name = ?, email = ?, phone_number = ?, place = ?,
                faculty_id_card = ?, qualification = ?, experience = ?,
                availability = ?, hourly_rate = ?, teaching_mode = ?, joining_date = ?,
                remarks = ?, subject = ?, syllabus = ?, languages_proficiency = ?, section = ?
        `;
        let params = [
            name, email || null, phone_number || null, place || null,
            faculty_id_card || null, qualification || null, experience || null,
            availability || null, hourly_rate || null, teaching_mode || null, joining_date || null,
            remarks || null, subjectValue, syllabusValue, languagesValue, section || null
        ];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateQuery += `, password = ?`;
            params.push(hashedPassword);
        }

        updateQuery += ` WHERE id = ?`;
        params.push(req.params.id);

        await db.query(updateQuery, params);
        
        // Log the edit
        try {
            const editorId = req.user.id;
            const editorName = req.user.name || null;
            const changes = `Updated profile for ${name || 'faculty'}`;
            await db.query(
                `INSERT INTO faculty_edit_logs (faculty_id, edited_by, edited_by_name, changes_summary) VALUES (?, ?, ?, ?)`,
                [req.params.id, editorId, editorName, changes]
            );
        } catch (logErr) {
            console.error("Error logging faculty edit:", logErr);
        }

        res.status(200).json({ success: true, message: "Updated" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFacultyEditHistory = async (req, res) => {
    try {
        const [logs] = await db.query(
            `SELECT * FROM faculty_edit_logs WHERE faculty_id = ? ORDER BY edited_at DESC`,
            [req.params.id]
        );
        res.status(200).json({ success: true, data: logs });
    } catch (e) {
        console.error("Error fetching faculty edit history:", e);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getAllFacultyEditHistory = async (req, res) => {
    try {
        const { page, limit } = req.query;
        let query = `SELECT l.*, f.name as faculty_name 
             FROM faculty_edit_logs l
             LEFT JOIN faculties f ON l.faculty_id = f.id
             ORDER BY l.edited_at DESC`;
        
        let countQuery = `SELECT COUNT(*) as total FROM faculty_edit_logs`;

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            const [countResult] = await db.query(countQuery);
            const total = countResult[0].total;

            query += ' LIMIT ? OFFSET ?';
            const [logs] = await db.query(query, [limitNum, offset]);
            res.status(200).json({ success: true, total, data: logs });
        } else {
            const [logs] = await db.query(query);
            res.status(200).json({ success: true, data: logs });
        }
    } catch (e) {
        console.error("Error fetching all faculty edit history:", e);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const deleteFaculty = async (req, res) => {
    try {
        console.log(`[SAFETY] deleteFaculty skipped for faculty ${req.params.id}. Returning 200 OK.`);
        res.status(200).json({ success: true, message: "Soft deleted successfully (database unaffected for safety)" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const editStudent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { 
            name, email, contact, grade, syllabus, course, total_hours, hour,
            next_installment_date, admission_date, registration_number, 
            meeting_link, meetingLink, enrollment_type, admission_type,
            school_name, preferred_language, country, total_fees, total_paid,
            selectedSubjects, subjects_json, mentor_id, password, rejoining_fee, rejoiningFee
        } = req.body;

        const finalMeetingLink = meetingLink || meeting_link;
        const finalSubjects = selectedSubjects || subjects_json || [];
        
        const [[student]] = await conn.query('SELECT name, user_id FROM students WHERE id = ?', [id]);
        if (!student) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        let finalEmail = email;
        if (finalEmail) {
            const [[existingEmail]] = await conn.query('SELECT id, role, email FROM users WHERE email = ? AND id != ?', [finalEmail, student.user_id || 0]);
            if (existingEmail) {
                if (existingEmail.role !== 'student') {
                    // Browser autofilled a staff email. Revert to student's current email.
                    const [[currentStudent]] = await conn.query('SELECT email FROM students WHERE id = ?', [id]);
                    finalEmail = currentStudent.email;
                } else {
                    await conn.rollback();
                    conn.release();
                    return res.status(400).json({ 
                        success: false, 
                        message: `Email conflict: ${finalEmail} is already registered to another student. Please use a different email.` 
                    });
                }
            }
        }

        // Prepare primary faculty/subject for legacy columns
        let primaryFacultyId = null;
        let primaryFacultyName = null;
        let primarySubject = null;

        if (finalSubjects.length > 0) {
            primaryFacultyId = finalSubjects[0].facultyId || null;
            primaryFacultyName = finalSubjects[0].facultyName || null;
            primarySubject = Array.isArray(finalSubjects[0].subject) 
                ? (finalSubjects[0].subject.length > 0 ? finalSubjects[0].subject.join(', ') : null) 
                : (finalSubjects[0].subject || null);
        }

        // Sync Badge with Enrollment Type
        const badge = enrollment_type === 'Mentorship Only' ? 'Gold' : 
                      enrollment_type === 'Tuition Only' ? 'Silver' : 
                      (enrollment_type === 'Mentorship & Tuition' || enrollment_type === 'Mentorship and Tuition') ? 'Diamond' : null;

        const { archiveStudent, archiveFacultySchedule } = require('../utils/archiver');
        await archiveStudent(conn, id, 'UPDATE', req.user);
        await archiveFacultySchedule(conn, id, 'UPDATE', req.user);

        // Update Students table
        await conn.query(
            `UPDATE students SET 
                name = ?, email = ?, contact = ?, grade = ?, syllabus = ?, course = ?, total_hours = ?, hour = ?,
                next_installment_date = ?, admission_date = ?, registration_number = ?, roll_number = ?,
                meeting_link = ?, enrollment_type = ?, admission_type = ?, badge = ?,
                school_name = ?, preferred_language = ?, country = ?, 
                total_fees = ?, total_paid = ?,
                subjects_json = ?, subject = ?, faculty_id = ?, faculty_name = ?, mentor_id = ?,
                course_completed = ?, rejoining_fee = ?, timetable_created = 0
             WHERE id = ?`, 
            [
                name, finalEmail || null, contact || null, grade || null, syllabus || null, course || null, total_hours || hour || null, hour || null,
                next_installment_date || null, admission_date || null, registration_number || null, registration_number || null,
                finalMeetingLink || null, enrollment_type || null, admission_type || null, badge,
                school_name || null, preferred_language || null, country || null,
                total_fees || 0, total_paid || 0,
                JSON.stringify(finalSubjects), primarySubject || null, primaryFacultyId || null, primaryFacultyName || null, mentor_id || null, 
                req.body.course_completed || 0,
                rejoining_fee || rejoiningFee || 0,
                id
            ]
        );

        // Update linked Users table
        if (student.user_id) {
            let userUpdateQuery = 'UPDATE users SET name = ?, email = ?, phone_number = ?';
            let userParams = [name, finalEmail || null, contact || null];

            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                userUpdateQuery += ', password = ?';
                userParams.push(hashedPassword);
            }

            userUpdateQuery += ' WHERE id = ?';
            userParams.push(student.user_id);
            await conn.query(userUpdateQuery, userParams);
        }

        // --- SYNC FACULTY SCHEDULES --- (soft delete existing, then re-insert)
        await logFacultyChanges(id, finalSubjects, req.user);
        await conn.query('UPDATE faculty_schedules SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE student_id = ?', [id]);

        if (finalSubjects && Array.isArray(finalSubjects) && finalSubjects.length > 0) {
            for (const sub of finalSubjects) {
                const subjectStr = Array.isArray(sub.subject) 
                    ? (sub.subject.length > 0 ? sub.subject.join(', ') : null) 
                    : (sub.subject || null);
                
                if (sub.dayConfigs && Array.isArray(sub.dayConfigs) && sub.dayConfigs.length > 0) {
                    for (const config of sub.dayConfigs) {
                        if (sub.facultyId && config.day && config.startTime && config.endTime) {
                            await conn.query(`
                                INSERT INTO faculty_schedules (
                                    faculty_id, student_id, subject, day_of_week, start_time, end_time, hourly_rate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [
                                sub.facultyId, id, subjectStr, config.day, config.startTime, config.endTime, sub.hourlyRate || 0
                            ]);
                        }
                    }
                } else {
                    const days = sub.days || (sub.day ? [sub.day] : []);
                    for (const day of days) {
                        if (sub.facultyId && day && sub.startTime && sub.endTime) {
                            await conn.query(`
                                INSERT INTO faculty_schedules (
                                    faculty_id, student_id, subject, day_of_week, start_time, end_time, hourly_rate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [
                                sub.facultyId, id, subjectStr, day, sub.startTime, sub.endTime, sub.hourlyRate || 0
                            ]);
                        }
                    }
                }
            }
        }

        const { verifyStudentSave, verifyFacultySchedules } = require('../utils/saveVerifier');
        
        const payloadToVerify = {
            name, email: finalEmail || null, contact: contact || null, grade: grade || null, syllabus: syllabus || null, course: course || null,
            total_hours: total_hours || hour || null, hour: hour || null,
            next_installment_date: next_installment_date || null, admission_date: admission_date || null,
            registration_number: registration_number || null, meeting_link: finalMeetingLink || null,
            enrollment_type: enrollment_type || null, admission_type: admission_type || null, badge,
            school_name: school_name || null, preferred_language: preferred_language || null, country: country || null,
            total_fees: total_fees || 0, total_paid: total_paid || 0,
            subjects_json: JSON.stringify(finalSubjects),
            course_completed: req.body.course_completed || 0, rejoining_fee: rejoining_fee || rejoiningFee || 0,
            timetable_created: 0
        };

        await verifyStudentSave(conn, id, payloadToVerify);

        if (finalSubjects && Array.isArray(finalSubjects) && finalSubjects.length > 0) {
            let expectedSchedulesCount = 0;
            for (const sub of finalSubjects) {
                if (sub.dayConfigs && Array.isArray(sub.dayConfigs) && sub.dayConfigs.length > 0) {
                    expectedSchedulesCount += sub.dayConfigs.filter(c => sub.facultyId && c.day && c.startTime && c.endTime).length;
                } else {
                    const days = sub.days || (sub.day ? [sub.day] : []);
                    expectedSchedulesCount += days.filter(day => sub.facultyId && day && sub.startTime && sub.endTime).length;
                }
            }
            if (expectedSchedulesCount > 0) {
                await verifyFacultySchedules(conn, id, expectedSchedulesCount);
            }
        }

        await conn.query('INSERT INTO admin_notifications (message) VALUES (?)', [`AOE (${req.user ? req.user.name : 'Unknown'}) updated student profile and sync'd schedule for: ${student.name}`]);
        
        await conn.commit();
        conn.release();
        res.status(200).json({ success: true, message: 'Student profile updated successfully' });
    } catch (error) { 
        if (conn && conn.rollback) await conn.rollback();
        if (conn && conn.release) conn.release();
        console.error("EDIT_STUDENT_ERROR:", error);
        require('fs').appendFileSync('debug_error.txt', new Date().toISOString() + ' - EDIT_STUDENT_ERROR: ' + error.stack + '\n');
        res.status(500).json({ success: false, message: error.message }); 
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('UPDATE students SET status = "rejected" WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }
        res.status(200).json({ success: true, message: "Student record hidden from dashboard" });
    } catch (e) { 
        console.error("DELETE_STUDENT_ERROR:", e);
        res.status(500).json({ success: false, message: e.message }); 
    }
};

const getStudentById = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, m.name as mentor_name, 
            COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') 
                 FROM faculty_schedules fs JOIN faculties u ON fs.faculty_id = u.id WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id),
                s.faculty_name
            ) as faculty_name 
            FROM students s 
            LEFT JOIN mentors m ON s.mentor_id = m.id 
            WHERE s.id = ?
        `, [req.params.id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const student = rows[0];

        // Fetch timetable
        const [timetable] = await db.query('SELECT * FROM timetable WHERE (is_deleted IS NULL OR is_deleted = 0) AND student_id = ? ORDER BY date ASC, start_time ASC', [student.id]);
        student.timetable = timetable;

        res.status(200).json({ success: true, data: student });
    } catch (e) {
        console.error("GET_STUDENT_BY_ID_ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const { calculateStudentHours } = require('../utils/studentHoursHelper');

const getStudents = async (req, res) => {
    try {
        const { mentor_id, faculty_id, search, sortBy, course, page, limit, activeTab, filterMode, stats } = req.query;

        // Support both old activeTab and new filterMode param
        const resolvedFilter = filterMode || activeTab || 'enrolled_scholars';

        let baseWhere = `WHERE (s.status != 'rejected' OR s.status IS NULL) AND s.status = 'active'`;
        let params = [];

        if (mentor_id) {
            baseWhere += ' AND s.mentor_id = ?';
            params.push(mentor_id);
        }
        if (faculty_id) {
            const facClause = ' AND (s.faculty_id = ? OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?))';
            baseWhere += facClause;
            params.push(faculty_id, faculty_id);
        }
        if (course && course !== 'all') {
            baseWhere += ' AND s.course = ?';
            params.push(course);
        }
        if (search) {
            baseWhere += ' AND (s.name LIKE ? OR s.registration_number LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam);
        }

        // filterMode-based DB-level filtering
        let filterClause = '';
        if (resolvedFilter === 'completed') {
            filterClause = ' AND s.course_completed = 1';
        } else if (resolvedFilter === 'active_plus') {
            // for AOE/academic_head active_plus uses hours threshold (in-memory), don't add DB filter
        } else if (resolvedFilter === 'enrolled_scholars') {
            // no extra filter
        }

        let sql = `
            SELECT s.*, m.name as mentor_name, 
            COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') 
                 FROM faculty_schedules fs JOIN faculties u ON fs.faculty_id = u.id WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id),
                s.faculty_name
            ) as faculty_name 
            FROM students s 
            LEFT JOIN mentors m ON s.mentor_id = m.id 
            ${baseWhere}${filterClause}
        `;
        let countSql = `
            SELECT COUNT(DISTINCT s.id) as total
            FROM students s 
            LEFT JOIN mentors m ON s.mentor_id = m.id 
            ${baseWhere}${filterClause}
        `;

        if (sortBy === 'join_oldest') {
            sql += ' ORDER BY s.id ASC';
        } else if (sortBy === 'name_asc') {
            sql += ' ORDER BY s.name ASC';
        } else if (sortBy === 'name_desc') {
            sql += ' ORDER BY s.name DESC';
        } else {
            sql += ' ORDER BY s.id DESC'; // join_newest
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        let responseData = { success: true };

        // Stats for summary cards
        if (stats === 'true') {
            try {
                const [mcCols] = await db.query("SHOW COLUMNS FROM students LIKE 'mentorship_completed'");
                const hasMentorshipCompleted = mcCols.length > 0;

                const statsQueryStr = `
                    SELECT 
                        COUNT(*) as totalEnrollment,
                        SUM(CASE WHEN course_completed = 1 THEN 1 ELSE 0 END) as courseCompletedCount,
                        SUM(CASE WHEN (course_completed IS NULL OR course_completed = 0) AND status = 'active' THEN 1 ELSE 0 END) as activeCourseCount,
                        ${hasMentorshipCompleted ? `
                        SUM(CASE WHEN mentorship_completed = 1 THEN 1 ELSE 0 END) as mentorshipCompletedCount,
                        SUM(CASE WHEN (mentorship_completed IS NULL OR mentorship_completed = 0) AND status = 'active' THEN 1 ELSE 0 END) as activeMentorshipCount
                        ` : `
                        0 as mentorshipCompletedCount,
                        0 as activeMentorshipCount
                        `}
                    FROM students WHERE status != 'rejected'
                `;
                const [statsRows] = await db.query(statsQueryStr);
                responseData.stats = statsRows[0];
            } catch (statsErr) {
                console.error("AOE_STATS_QUERY_ERROR:", statsErr.message);
                responseData.stats = {
                    totalEnrollment: 0,
                    courseCompletedCount: 0,
                    activeCourseCount: 0,
                    mentorshipCompletedCount: 0,
                    activeMentorshipCount: 0
                };
            }
        }

        if (resolvedFilter === 'active_plus') {
            // Need in-memory filtering because hours are calculated in Node
            const [rows] = await db.query(sql, params);
            let augmentedRows = await calculateStudentHours(rows, db);

            // active_plus: students with >= 8 lifetime consumed hours
            augmentedRows = augmentedRows.filter(s => (s.total_lifetime_consumed_hours || 0) >= 8);

            const total = augmentedRows.length;
            const paginatedRows = augmentedRows.slice(offset, offset + limitNum);
            responseData.total = total;
            responseData.data = paginatedRows;
            return res.status(200).json(responseData);
        } else {
            // SQL Pagination
            const [countResult] = await db.query(countSql, params);
            const total = countResult[0].total;

            sql += ' LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [rows] = await db.query(sql, params);
            const augmentedRows = await calculateStudentHours(rows, db);
            responseData.total = total;
            responseData.data = augmentedRows;
            return res.status(200).json(responseData);
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getMentors = async (req, res) => {
    try {
        await performAutoSync();
        const { page, limit, search } = req.query;
        let query = 'SELECT m.*, (SELECT COUNT(*) FROM students WHERE mentor_id = m.id AND status != "rejected") as studentCount FROM mentors m WHERE m.status = "active"';
        let countQuery = 'SELECT COUNT(*) as total FROM mentors m WHERE m.status = "active"';
        let params = [];

        if (search) {
            query += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone_number LIKE ?)';
            countQuery += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone_number LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY m.name ASC';

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;

            query += ' LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const editMentor = async (req, res) => {
    try {
        const { name, email, phone_number } = req.body;
        await db.query('UPDATE mentors SET name = ?, email = ?, phone_number = ? WHERE id = ?', [name, email, phone_number, req.params.id]);
        res.status(200).json({ success: true, message: "Updated" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteMentor = async (req, res) => {
    try {
        console.log(`[SAFETY] deleteMentor skipped for mentor ${req.params.id}. Returning 200 OK.`);
        res.status(200).json({ success: true, message: "Soft deleted successfully (database unaffected for safety)" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getLiveMonitoring = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT fs.*, u.name as faculty_name, s.name as student_name FROM faculty_sessions fs JOIN users u ON fs.faculty_id = u.id JOIN session_attendance sa ON fs.id = sa.session_id JOIN students s ON sa.student_id = s.id WHERE u.role = "faculty" AND fs.date = CURDATE()');
        res.status(200).json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getStaff = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, email, phone_number as phone, role, status FROM users WHERE role IN ("mentor", "faculty", "ssc", "admin", "academic_operation_executive", "mentor_head") ORDER BY name ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const syncLegacyData = async (req, res) => {
    try { await performAutoSync(); res.status(200).json({ success: true, message: "Synced" }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const saveExamPlan = async (req, res) => {
    try {
        const { student_id, milestone, portions, chapter, exam_type, scheduled_date } = req.body;
        await db.query(`
            INSERT INTO student_exams 
                (student_id, milestone_session, portions, chapter, exam_type, scheduled_date, status) 
            VALUES (?, ?, ?, ?, ?, ?, "Pending") 
            ON DUPLICATE KEY UPDATE 
                portions = VALUES(portions), 
                chapter = VALUES(chapter), 
                exam_type = VALUES(exam_type), 
                scheduled_date = VALUES(scheduled_date)
        `, [student_id, milestone, portions, chapter, exam_type, scheduled_date]);
        res.status(200).json({ success: true, message: "Saved" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAcademicSchedule = async (req, res) => {
    try {
        const query = `
            SELECT id, faculty_id, student_id, date, start_time, end_time,
                   topic, status, faculty_name, student_name, meeting_link, minutes_taken
            FROM (
                SELECT 
                    t.id as id,
                    t.faculty_id,
                    t.student_id,
                    t.date,
                    t.start_time,
                    t.end_time,
                    COALESCE(t.chapter, t.session_type, 'General Session') as topic,
                    t.status,
                    COALESCE(t.faculty_name, f.name, 'TBD') as faculty_name,
                    s.name as student_name,
                    s.meeting_link,
                    fs.minutes_taken
                FROM timetable t
                LEFT JOIN users f ON t.faculty_id = f.id
                JOIN students s ON t.student_id = s.id
                LEFT JOIN faculty_sessions fs ON t.id = fs.timetable_id
                WHERE (t.is_deleted IS NULL OR t.is_deleted = 0)

                UNION ALL

                SELECT 
                    fs.id as id,
                    fs.faculty_id,
                    sa.student_id,
                    fs.date,
                    fs.start_time,
                    fs.end_time,
                    fs.topic,
                    fs.status,
                    u.name as faculty_name,
                    s.name as student_name,
                    s.meeting_link,
                    fs.minutes_taken
                FROM faculty_sessions fs
                LEFT JOIN users u ON fs.faculty_id = u.id AND u.role = 'faculty'
                LEFT JOIN session_attendance sa ON fs.id = sa.session_id
                LEFT JOIN students s ON sa.student_id = s.id
                WHERE fs.timetable_id IS NULL
            ) combined_schedules
            ORDER BY date DESC, start_time ASC
        `;
        const [rows] = await db.query(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- AH Interactions & Meetings ---
const getAHParentInteractions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, s.name as student_name, u.name as academic_operation_executive_name
            FROM ah_parent_interactions p
            JOIN students s ON p.student_id = s.id
            JOIN users u ON p.academic_head_id = u.id
            ORDER BY p.date DESC, p.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createAHParentInteraction = async (req, res) => {
    try {
        const { student_id, date, interaction_data, notes } = req.body;
        const academic_head_id = req.user.id;
        await db.query(`
            INSERT INTO ah_parent_interactions (student_id, academic_head_id, date, interaction_data, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [student_id, academic_head_id, date, JSON.stringify(interaction_data || {}), notes || '']);
        res.json({ success: true, message: 'Parent interaction logged successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAHFacultyInteractions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT f.*, u2.name as faculty_name, u.name as academic_operation_executive_name
            FROM ah_faculty_interactions f
            JOIN users u2 ON f.faculty_id = u2.id
            JOIN users u ON f.academic_head_id = u.id
            ORDER BY f.date DESC, f.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createAHFacultyInteraction = async (req, res) => {
    try {
        const { faculty_id, date, interaction_data, notes } = req.body;
        const academic_head_id = req.user.id;
        await db.query(`
            INSERT INTO ah_faculty_interactions (faculty_id, academic_head_id, date, interaction_data, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [faculty_id, academic_head_id, date, JSON.stringify(interaction_data || {}), notes || '']);
        res.json({ success: true, message: 'Faculty interaction logged successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAHParentMeetings = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        let query = `
            SELECT m.*, s.name as student_name, u.name as academic_operation_executive_name
            FROM ah_parent_meetings m
            JOIN students s ON m.student_id = s.id
            JOIN users u ON m.academic_head_id = u.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) as total
            FROM ah_parent_meetings m
            JOIN students s ON m.student_id = s.id
            JOIN users u ON m.academic_head_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += ' AND m.status = ?';
            countQuery += ' AND m.status = ?';
            params.push(status);
        }

        query += ' ORDER BY m.meeting_date DESC, m.meeting_time DESC';

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;

            query += ' LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [rows] = await db.query(query, params);
            res.json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query, params);
            res.json({ success: true, data: rows });
        }
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const scheduleAHParentMeeting = async (req, res) => {
    try {
        const { student_id, meeting_date, meeting_time, meeting_link, notes } = req.body;
        const academic_head_id = req.user.id;
        await db.query(`
            INSERT INTO ah_parent_meetings (student_id, academic_head_id, meeting_date, meeting_time, status, meeting_link, notes)
            VALUES (?, ?, ?, ?, 'Scheduled', ?, ?)
        `, [student_id, academic_head_id, meeting_date, meeting_time, meeting_link || '', notes || '']);
        res.json({ success: true, message: 'Meeting scheduled successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const reportAHParentMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { report_data, status } = req.body;
        await db.query(`
            UPDATE ah_parent_meetings 
            SET report_data = ?, status = ?
            WHERE id = ?
        `, [JSON.stringify(report_data || {}), status || 'Completed', id]);
        res.json({ success: true, message: 'Meeting reported successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getDemoSchedules = async (req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS aoe_demo_schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                aoe_id INT,
                demo_id VARCHAR(50),
                type VARCHAR(50) DEFAULT 'demo',
                date DATE,
                student_name VARCHAR(255),
                student_type VARCHAR(50),
                syllabus VARCHAR(50),
                section VARCHAR(50),
                subject VARCHAR(100),
                faculty_id INT,
                faculty_name VARCHAR(255),
                start_time TIME,
                end_time TIME,
                hour_rate DECIMAL(10,2) DEFAULT 0.00,
                meeting_link VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                prep_score INT DEFAULT 0,
                comm_score INT DEFAULT 0,
                concept_score INT DEFAULT 0,
                engage_score INT DEFAULT 0,
                parent_score INT DEFAULT 0,
                total_score INT DEFAULT 0,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await ensureAoeDemoScheduleColumns();

        const { page, limit, search, type } = req.query;
        let query = `
            SELECT d.*, COALESCE(d.faculty_name, f.name) as faculty_name 
            FROM aoe_demo_schedules d
            LEFT JOIN faculties f ON d.faculty_id = f.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM aoe_demo_schedules d
            LEFT JOIN faculties f ON d.faculty_id = f.id
            WHERE 1=1
        `;
        let params = [];

        if (type && type !== 'all') {
            query += ' AND d.type = ?';
            countQuery += ' AND d.type = ?';
            params.push(type);
        }

        if (search) {
            const searchParam = `%${search}%`;
            const searchCondition = ' AND (d.student_name LIKE ? OR COALESCE(d.faculty_name, f.name) LIKE ? OR d.demo_id LIKE ?)';
            query += searchCondition;
            countQuery += searchCondition;
            params.push(searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY d.id DESC';

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;

            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;

            query += ' LIMIT ? OFFSET ?';
            params.push(limitNum, offset);

            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, total, data: rows });
        } else {
            const [rows] = await db.query(query, params);
            res.status(200).json({ success: true, data: rows });
        }
    } catch (error) {
        console.error("GET_DEMOS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const fixDemoIds = async (req, res) => {
    try {
        // Fix demo type IDs
        const [demos] = await db.query("SELECT id, demo_id, type FROM aoe_demo_schedules WHERE type = 'demo' OR type IS NULL ORDER BY created_at ASC");
        for (let i = 0; i < demos.length; i++) {
            const demoIdStr = `DE${String(i + 1).padStart(2, '0')}`;
            await db.query("UPDATE aoe_demo_schedules SET demo_id = ?, type = 'demo' WHERE id = ?", [demoIdStr, demos[i].id]);
        }
        // Fix pre-demo type IDs
        const [preDemos] = await db.query("SELECT id, demo_id FROM aoe_demo_schedules WHERE type = 'pre-demo' ORDER BY created_at ASC");
        for (let i = 0; i < preDemos.length; i++) {
            const demoIdStr = `DE${String(i + 1).padStart(2, '0')}`;
            await db.query('UPDATE aoe_demo_schedules SET demo_id = ? WHERE id = ?', [demoIdStr, preDemos[i].id]);
        }
        res.status(200).json({ success: true, message: `Fixed IDs: ${demos.length} demos, ${preDemos.length} pre-demos` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getNextDemoId = async (req, res) => {
    try {
        const { type } = req.query; // 'demo' or 'pre-demo'
        const prefix = 'DE';
        const [rows] = await db.query(
            'SELECT demo_id FROM aoe_demo_schedules WHERE type = ? AND demo_id IS NOT NULL AND demo_id != "" ORDER BY created_at ASC',
            [type || 'demo']
        );
        // Extract numbers from existing IDs of this type
        const usedNumbers = rows
            .map(r => r.demo_id)
            .filter(id => id && id.startsWith(prefix))
            .map(id => parseInt(id.slice(prefix.length), 10))
            .filter(n => !isNaN(n));

        let nextNum = 1;
        while (usedNumbers.includes(nextNum)) nextNum++;
        const nextId = `${prefix}${String(nextNum).padStart(2, '0')}`;
        res.status(200).json({ success: true, next_id: nextId });
    } catch (error) {
        console.error('GET_NEXT_DEMO_ID_ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const createDemoSchedule = async (req, res) => {
    try {
        await ensureAoeDemoScheduleColumns();
        const { type, date, student_name, student_type, syllabus, section, subject, faculty_id, faculty_name_input, start_time, end_time, hour_rate, meeting_link } = req.body;
        const aoe_id = req.user.id;
        const demoType = type || 'demo';
        const prefix = 'DE';
        const normalizedFacultyName = (faculty_name_input || '').trim();

        let resolvedFacultyId = faculty_id || null;
        if (!resolvedFacultyId && normalizedFacultyName) {
            const [matchedFaculty] = await db.query(
                'SELECT id FROM faculties WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
                [normalizedFacultyName]
            );
            if (matchedFaculty.length > 0) {
                resolvedFacultyId = matchedFaculty[0].id;
            }
        }

        // Auto-generate unique demo_id for this type
        const [rows] = await db.query(
            'SELECT demo_id FROM aoe_demo_schedules WHERE type = ? AND demo_id IS NOT NULL AND demo_id != "" ORDER BY created_at ASC',
            [demoType]
        );
        const usedNumbers = rows
            .map(r => r.demo_id)
            .filter(id => id && id.startsWith(prefix))
            .map(id => parseInt(id.slice(prefix.length), 10))
            .filter(n => !isNaN(n));

        let nextNum = 1;
        while (usedNumbers.includes(nextNum)) nextNum++;
        const auto_demo_id = `${prefix}${String(nextNum).padStart(2, '0')}`;

        const [result] = await db.query(`
            INSERT INTO aoe_demo_schedules 
                (aoe_id, demo_id, type, date, student_name, student_type, syllabus, section, subject, faculty_id, faculty_name, start_time, end_time, hour_rate, meeting_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [aoe_id, auto_demo_id, demoType, date || null, student_name || null, student_type || 'new', syllabus || null, section || null, subject || null, resolvedFacultyId, normalizedFacultyName || null, start_time || null, end_time || null, hour_rate || 0, meeting_link || null]);

        res.status(201).json({ success: true, message: 'Demo schedule created successfully', demo_id: auto_demo_id, id: result.insertId });
    } catch (error) {
        console.error("CREATE_DEMO_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const editDemoSchedule = async (req, res) => {
    try {
        await ensureAoeDemoScheduleColumns();
        const { id } = req.params;
        const { demo_id, type, date, student_name, student_type, syllabus, section, subject, faculty_id, faculty_name_input, start_time, end_time, hour_rate, meeting_link } = req.body;
        const normalizedFacultyName = (faculty_name_input || '').trim();

        let resolvedFacultyId = faculty_id || null;
        if (!resolvedFacultyId && normalizedFacultyName) {
            const [matchedFaculty] = await db.query(
                'SELECT id FROM faculties WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
                [normalizedFacultyName]
            );
            if (matchedFaculty.length > 0) {
                resolvedFacultyId = matchedFaculty[0].id;
            }
        }
        
        await db.query(`
            UPDATE aoe_demo_schedules 
            SET demo_id=?, type=?, date=?, student_name=?, student_type=?, syllabus=?, section=?, subject=?, faculty_id=?, faculty_name=?, start_time=?, end_time=?, hour_rate=?, meeting_link=?
            WHERE id=?
        `, [demo_id || null, type || 'demo', date || null, student_name || null, student_type || 'new', syllabus || null, section || null, subject || null, resolvedFacultyId, normalizedFacultyName || null, start_time || null, end_time || null, hour_rate || 0, meeting_link || null, id]);
        
        res.status(200).json({ success: true, message: 'Demo schedule updated successfully' });
    } catch (error) {
        console.error("EDIT_DEMO_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteDemoSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE aoe_demo_schedules SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id=?', [id]);
        res.status(200).json({ success: true, message: 'Demo schedule deleted successfully' });
    } catch (error) {
        console.error("DELETE_DEMO_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateDemoEvaluation = async (req, res) => {
    try {
        const { id } = req.params;
        const { prep_score, comm_score, concept_score, engage_score, parent_score, remarks } = req.body;
        
        const total = (Number(prep_score) || 0) + (Number(comm_score) || 0) + (Number(concept_score) || 0) + (Number(engage_score) || 0) + (Number(parent_score) || 0);

        await db.query(`
            UPDATE aoe_demo_schedules
            SET prep_score = ?, comm_score = ?, concept_score = ?, engage_score = ?, parent_score = ?, total_score = ?, remarks = ?, status = 'completed'
            WHERE id = ?
        `, [prep_score, comm_score, concept_score, engage_score, parent_score, total, remarks, id]);

        res.status(200).json({ success: true, message: 'Demo evaluation saved successfully' });
    } catch (error) {
        console.error("UPDATE_DEMO_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleDemoSuccess = async (req, res) => {
    try {
        const { id } = req.params;
        const [demo] = await db.query('SELECT is_successful FROM aoe_demo_schedules WHERE id = ?', [id]);
        if (demo.length === 0) return res.status(404).json({ success: false, message: 'Demo not found' });
        
        const newStatus = demo[0].is_successful ? 0 : 1;
        await db.query('UPDATE aoe_demo_schedules SET is_successful = ? WHERE id = ?', [newStatus, id]);
        
        res.status(200).json({ success: true, message: 'Demo success toggled', is_successful: newStatus });
    } catch (error) {
        console.error("TOGGLE_DEMO_SUCCESS_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getFacultyPerformance = async (req, res) => {
    try {
        const { faculty_id, month_year } = req.query; // month_year format: '2026-06'
        if (!faculty_id || !month_year) return res.status(400).json({ success: false, message: 'faculty_id and month_year are required' });

        // Calculate demo conversion rate dynamically
        const [demos] = await db.query(`
            SELECT 
                COUNT(*) as total_demos,
                SUM(CASE WHEN is_successful = 1 THEN 1 ELSE 0 END) as successful_demos
            FROM aoe_demo_schedules
            WHERE faculty_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
        `, [faculty_id, month_year]);

        let calculated_rate = 0;
        if (demos[0].total_demos > 0) {
            calculated_rate = (demos[0].successful_demos / demos[0].total_demos) * 25; // mapped out of 25%
        }

        const [rows] = await db.query('SELECT * FROM faculty_performance_index WHERE faculty_id = ? AND month_year = ?', [faculty_id, month_year]);
        
        if (rows.length > 0) {
            // Include dynamically calculated demo conversion rate alongside saved data
            const responseData = { ...rows[0], demo_conversion_rate: calculated_rate.toFixed(2) };
            res.json({ success: true, data: responseData });
        } else {
            res.json({ success: true, data: null, demo_rate: calculated_rate.toFixed(2) });
        }
    } catch (error) {
        console.error("GET_FACULTY_PERFORMANCE_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const saveFacultyPerformance = async (req, res) => {
    try {
        const { faculty_id, month_year, demo_conversion_rate, attendance_punctuality, parent_feedback, student_exam_improvement, academic_head_rating } = req.body;
        
        const total = parseFloat(demo_conversion_rate) + parseFloat(attendance_punctuality) + parseFloat(parent_feedback) + parseFloat(student_exam_improvement) + parseFloat(academic_head_rating);

        await db.query(`
            INSERT INTO faculty_performance_index 
            (faculty_id, month_year, demo_conversion_rate, attendance_punctuality, parent_feedback, student_exam_improvement, academic_head_rating, total_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            demo_conversion_rate = VALUES(demo_conversion_rate),
            attendance_punctuality = VALUES(attendance_punctuality),
            parent_feedback = VALUES(parent_feedback),
            student_exam_improvement = VALUES(student_exam_improvement),
            academic_head_rating = VALUES(academic_head_rating),
            total_score = VALUES(total_score)
        `, [faculty_id, month_year, demo_conversion_rate, attendance_punctuality, parent_feedback, student_exam_improvement, academic_head_rating, total]);

        res.json({ success: true, message: 'Performance index saved' });
    } catch (error) {
        console.error("SAVE_FACULTY_PERFORMANCE_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const generateDailyAuditsInternal = async () => {
    try {
        const [existing] = await db.query('SELECT id FROM academic_quality_audits WHERE date = CURDATE() LIMIT 1');
        if (existing.length > 0) return; // Already generated

        const [students] = await db.query(`
            SELECT s.id, s.name, s.subjects_json, sas.last_audited_at, sas.current_subject_index, sas.total_audits
            FROM students s
            LEFT JOIN student_audit_status sas ON s.id = sas.student_id
            WHERE s.status = 'active' AND s.subjects_json IS NOT NULL
            ORDER BY sas.last_audited_at ASC, s.id ASC
            LIMIT 100
        `);

        let generatedCount = 0;
        let auditsToInsert = [];

        for (const student of students) {
            if (generatedCount >= 15) break;

            let subjects = [];
            try {
                subjects = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
            } catch (e) {}

            if (!subjects || subjects.length === 0) continue;

            let currIndex = student.current_subject_index || 0;
            if (currIndex >= subjects.length) currIndex = 0;

            const selectedSubject = subjects[currIndex];
            const subjectName = Array.isArray(selectedSubject.subject) ? selectedSubject.subject.join(', ') : selectedSubject.subject;
            const facultyId = selectedSubject.facultyId;
            const facultyName = selectedSubject.facultyName;

            if (!subjectName || !facultyId) {
                await db.query(`
                    INSERT INTO student_audit_status (student_id, last_audited_at, current_subject_index, total_audits)
                    VALUES (?, NOW(), ?, ?)
                    ON DUPLICATE KEY UPDATE last_audited_at = NOW(), current_subject_index = ?
                `, [student.id, currIndex + 1, student.total_audits || 0, currIndex + 1]);
                continue;
            }

            const newStudentCount = (student.total_audits || 0) + 1;
            
            let newFacultyCount = 1;
            const [facStatus] = await db.query('SELECT total_audits FROM faculty_audit_status WHERE faculty_id = ?', [facultyId]);
            if (facStatus.length > 0) {
                newFacultyCount = facStatus[0].total_audits + 1;
            }

            auditsToInsert.push({
                student_id: student.id,
                student_name: student.name,
                subject: subjectName,
                faculty_id: facultyId,
                faculty_name: facultyName,
                student_count: newStudentCount,
                faculty_count: newFacultyCount,
                next_index: currIndex + 1
            });

            await db.query(`
                INSERT INTO student_audit_status (student_id, last_audited_at, current_subject_index, total_audits)
                VALUES (?, NOW(), ?, ?)
                ON DUPLICATE KEY UPDATE last_audited_at = NOW(), current_subject_index = ?, total_audits = ?
            `, [student.id, currIndex + 1, newStudentCount, currIndex + 1, newStudentCount]);

            await db.query(`
                INSERT INTO faculty_audit_status (faculty_id, total_audits)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE total_audits = ?
            `, [facultyId, newFacultyCount, newFacultyCount]);

            generatedCount++;
        }

        for (const audit of auditsToInsert) {
            await db.query(`
                INSERT INTO academic_quality_audits (date, student_id, student_name, subject, faculty_id, faculty_name, student_count, faculty_count, status)
                VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, 'Pending')
            `, [audit.student_id, audit.student_name, audit.subject, audit.faculty_id, audit.faculty_name, audit.student_count, audit.faculty_count]);
        }
        
        console.log(`[AUDIT] Automatically generated ${generatedCount} daily audits.`);
    } catch (e) {
        console.error("GENERATE_QUALITY_AUDITS_INTERNAL_ERROR:", e);
    }
};

const getQualityAudits = async (req, res) => {
    try {
        let [rows] = await db.query('SELECT * FROM academic_quality_audits WHERE date = CURDATE() ORDER BY id DESC');
        
        if (rows.length === 0) {
            await generateDailyAuditsInternal();
            [rows] = await db.query('SELECT * FROM academic_quality_audits WHERE date = CURDATE() ORDER BY id DESC');
        }
        
        res.status(200).json({ success: true, data: rows });
    } catch (e) {
        console.error("GET_QUALITY_AUDITS_ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const verifyQualityAudit = async (req, res) => {
    try {
        await db.query('UPDATE academic_quality_audits SET status = "Verified" WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: "Done" });
    } catch (e) {
        console.error("VERIFY_QUALITY_AUDITS_ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const generateQualityAudits = async (req, res) => {
    try {
        const [students] = await db.query(`
            SELECT s.id, s.name, s.subjects_json, sas.last_audited_at, sas.current_subject_index, sas.total_audits
            FROM students s
            LEFT JOIN student_audit_status sas ON s.id = sas.student_id
            WHERE s.status = 'active' AND s.subjects_json IS NOT NULL
            ORDER BY sas.last_audited_at ASC, s.id ASC
            LIMIT 100
        `);

        let generatedCount = 0;
        let auditsToInsert = [];

        for (const student of students) {
            if (generatedCount >= 15) break;

            let subjects = [];
            try {
                subjects = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
            } catch (e) {}

            if (!subjects || subjects.length === 0) continue;

            let currIndex = student.current_subject_index || 0;
            if (currIndex >= subjects.length) currIndex = 0;

            const selectedSubject = subjects[currIndex];
            const subjectName = Array.isArray(selectedSubject.subject) ? selectedSubject.subject.join(', ') : selectedSubject.subject;
            const facultyId = selectedSubject.facultyId;
            const facultyName = selectedSubject.facultyName;

            if (!subjectName || !facultyId) {
                // if invalid, just advance index to avoid infinite loops on this student
                await db.query(`
                    INSERT INTO student_audit_status (student_id, last_audited_at, current_subject_index, total_audits)
                    VALUES (?, NOW(), ?, ?)
                    ON DUPLICATE KEY UPDATE last_audited_at = NOW(), current_subject_index = ?
                `, [student.id, currIndex + 1, student.total_audits || 0, currIndex + 1]);
                continue;
            }

            const newStudentCount = (student.total_audits || 0) + 1;
            
            let newFacultyCount = 1;
            const [facStatus] = await db.query('SELECT total_audits FROM faculty_audit_status WHERE faculty_id = ?', [facultyId]);
            if (facStatus.length > 0) {
                newFacultyCount = facStatus[0].total_audits + 1;
            }

            auditsToInsert.push({
                student_id: student.id,
                student_name: student.name,
                subject: subjectName,
                faculty_id: facultyId,
                faculty_name: facultyName,
                student_count: newStudentCount,
                faculty_count: newFacultyCount,
                next_index: currIndex + 1
            });

            await db.query(`
                INSERT INTO student_audit_status (student_id, last_audited_at, current_subject_index, total_audits)
                VALUES (?, NOW(), ?, ?)
                ON DUPLICATE KEY UPDATE last_audited_at = NOW(), current_subject_index = ?, total_audits = ?
            `, [student.id, currIndex + 1, newStudentCount, currIndex + 1, newStudentCount]);

            await db.query(`
                INSERT INTO faculty_audit_status (faculty_id, total_audits)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE total_audits = ?
            `, [facultyId, newFacultyCount, newFacultyCount]);

            generatedCount++;
        }

        for (const audit of auditsToInsert) {
            await db.query(`
                INSERT INTO academic_quality_audits (date, student_id, student_name, subject, faculty_id, faculty_name, student_count, faculty_count, status)
                VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, 'Pending')
            `, [audit.student_id, audit.student_name, audit.subject, audit.faculty_id, audit.faculty_name, audit.student_count, audit.faculty_count]);
        }

        res.status(200).json({ success: true, message: "Generated " + generatedCount + " audits for today." });

    } catch (e) {
        console.error("GENERATE_QUALITY_AUDITS_ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const deduplicateStudents = async (req, res) => {
    try {
        console.log(`[SAFETY] deduplicateStudents disabled for database safety.`);
        res.status(200).json({ success: true, message: "Deduplication logic applied visually in UI. Database remains untouched for safety." });
    } catch(err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


const getExamScores = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT m.*, s.name as student_name, f.name as faculty_name
            FROM student_marks m
            JOIN students s ON m.student_id = s.id
            LEFT JOIN faculties f ON m.faculty_id = f.id
            ORDER BY m.exam_date DESC, m.created_at DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addExamScore = async (req, res) => {
    const { student_id, faculty_id, subject, chapter, publication, marks, total, grade, term, exam_date, question_paper, answer_sheet } = req.body;
    try {
        await db.query(`
            INSERT INTO student_marks (student_id, faculty_id, subject, chapter, publication, marks, total, grade, term, exam_date, question_paper, answer_sheet)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [student_id, faculty_id || req.user.id, subject, chapter || null, publication || null, marks, total, grade, term, exam_date, question_paper || null, answer_sheet || null]);
        res.status(201).json({ success: true, message: "Exam score submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getExamAnalytics, getDashboardStats, getAllFacultyActivity, getAvailableFaculties, getDropdownData, registerStudent, registerFaculty, registerSSC, getStudentInteractionLogs, getFacultyInteractionLogs, getAcademicActions, getDailyFacultyChecks, checkFacultySessionToday, uncheckFacultySession, getFacultyDirectory, getAcademicDocuments, uploadAcademicDocument, deleteAcademicDocument, getLiveClassEvaluations, submitLiveClassEvaluation, getPendingFacultyLogs, verifyFacultyLog, editFaculty, getFacultyEditHistory, getAllFacultyEditHistory, deleteFaculty, editStudent, deleteStudent, getStudentById, getStudents, getMentors, editMentor, deleteMentor, getLiveMonitoring, getStaff, syncLegacyData, saveExamPlan, getAcademicSchedule,
    getAHParentInteractions, createAHParentInteraction, getAHFacultyInteractions,    createAHFacultyInteraction,
    fixDemoIds,
    getAHParentMeetings,
    scheduleAHParentMeeting,
    reportAHParentMeeting,
    getDemoSchedules,
    getNextDemoId,
    createDemoSchedule,
    editDemoSchedule,
    deleteDemoSchedule,
    updateDemoEvaluation,
    getQualityAudits,
    generateQualityAudits,
    verifyQualityAudit,
    markLiveClassFeedbacksRead,
    forceSync,
    deduplicateStudents,
    getExamScores,
    addExamScore,
    toggleDemoSuccess,
    getFacultyPerformance,
    saveFacultyPerformance
};
