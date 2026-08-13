const db = require('../config/db');
const User = require('../models/userModel');
const { calculateStudentHours } = require('../utils/studentHoursHelper');

// @desc    Get dashboard stats for faculty
// @route   GET /api/faculty/dashboard
const getDashboard = async (req, res) => {
    try {
        const facultyId = req.user.id;

        // 1. Total Assigned Students
        const [[{ totalStudents }]] = await db.query(`
            SELECT COUNT(DISTINCT s.id) as totalStudents 
            FROM students s 
            WHERE s.faculty_id = ? 
               OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?)
        `, [facultyId, facultyId]);

        // 2. Pending Reports (Open reports)
        const [[{ pendingReports }]] = await db.query(
            'SELECT COUNT(*) as pendingReports FROM student_reports WHERE faculty_id = ? AND status = "Open"',
            [facultyId]
        );

        // 3. Upcoming Sessions (Today)
        const [[{ upcomingSessions }]] = await db.query(
            'SELECT COUNT(*) as upcomingSessions FROM faculty_sessions WHERE faculty_id = ? AND date = CURDATE() AND status = "Scheduled"',
            [facultyId]
        );

        // 4. Completed Sessions
        const [[{ completedSessions }]] = await db.query(
            'SELECT COUNT(*) as completedSessions FROM faculty_sessions WHERE faculty_id = ? AND status = "Completed"',
            [facultyId]
        );

        // 5. Tasks Pending
        const [[{ pendingTasks }]] = await db.query(
            'SELECT COUNT(*) as pendingTasks FROM tasks WHERE assigned_to = ? AND status = "Pending"',
            [facultyId]
        );

        // 6. Performance Overview (Distribution of students across performance statuses)
        const [performanceData] = await db.query(`
            SELECT s.performance_status as status, COUNT(DISTINCT s.id) as count 
            FROM students s 
            WHERE s.faculty_id = ? 
               OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?)
            GROUP BY s.performance_status
        `, [facultyId, facultyId]);

        // 7. Attendance Overview (Averaged attendance over the last 7 days from session_attendance)
        const [attendanceData] = await db.query(`
            SELECT s.date, 
                   (SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100 as percentage
            FROM faculty_sessions s
            JOIN session_attendance a ON s.id = a.session_id
            WHERE s.faculty_id = ?
            GROUP BY s.date
            ORDER BY s.date DESC
            LIMIT 7
        `, [facultyId]);

        res.status(200).json({
            success: true,
            data: {
                badges: {
                    totalStudents,
                    pendingReports,
                    upcomingSessions,
                    completedSessions,
                    pendingTasks
                },
                charts: {
                    performance: performanceData,
                    attendance: attendanceData.reverse()
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Dashboard error", error: error.message });
    }
};

// @desc    Get assigned students
// @route   GET /api/faculty/students
const getStudents = async (req, res) => {
    try {
        const facultyId = req.user.id;

        const [facultyRows] = await db.query('SELECT subject, secondary_subjects FROM users WHERE id = ?', [facultyId]);
        const facultySubjects = [];
        if (facultyRows.length > 0) {
            const f = facultyRows[0];
            if (f.subject) facultySubjects.push(f.subject.toLowerCase().trim());
            if (f.secondary_subjects) {
                try {
                    let sec = f.secondary_subjects;
                    if (typeof sec === 'string') sec = JSON.parse(sec);
                    if (Array.isArray(sec)) facultySubjects.push(...sec.map(s => s.toLowerCase().trim()));
                } catch(e) {}
            }
        }

        let [students] = await db.query(`
            SELECT DISTINCT s.id, s.name, s.roll_number, s.department, s.attendance_percentage, s.performance_status, s.status, s.created_at, s.badge, s.enrollment_type, s.total_fees, s.total_hours, s.total_paid
            FROM students s
            WHERE s.faculty_id = ? 
               OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?)
        `, [facultyId, facultyId]);

        students = await calculateStudentHours(students, db);

        // Filter subject_hours to only include the subjects this faculty teaches
        if (facultySubjects.length > 0) {
            students = students.map(student => {
                if (student.subject_hours && Array.isArray(student.subject_hours)) {
                    student.subject_hours = student.subject_hours.filter(sh => 
                        sh.subject && facultySubjects.includes(sh.subject.toLowerCase().trim())
                    );
                }
                return student;
            });
        }

        res.status(200).json({ success: true, count: students.length, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student detailed profile
// @route   GET /api/faculty/students/:id
const getStudentProfile = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const studentId = req.params.id;

        // Verify assignment
        const [check] = await db.query(`
            SELECT 1 FROM students s 
            WHERE s.id = ? 
              AND (s.faculty_id = ? OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?))
        `, [studentId, facultyId, facultyId]);
        if (check.length === 0) return res.status(403).json({ success: false, message: "Student not assigned to you" });

        const [student] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
        const [marks] = await db.query('SELECT * FROM student_marks WHERE student_id = ? ORDER BY created_at DESC', [studentId]);
        const [attendance] = await db.query(`
            SELECT a.*, s.topic, s.date 
            FROM session_attendance a
            JOIN faculty_sessions s ON a.session_id = s.id
            WHERE a.student_id = ?
            ORDER BY s.date DESC
        `, [studentId]);
        const [reports] = await db.query('SELECT * FROM student_reports WHERE student_id = ? ORDER BY created_at DESC', [studentId]);

        res.status(200).json({
            success: true,
            data: {
                profile: student[0],
                marks,
                attendance,
                reports
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Session Management
const createSession = async (req, res) => {
    const { topic, date, studentIds } = req.body;
    const facultyId = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Duplicate Check
        const [existing] = await connection.query(
            'SELECT id FROM faculty_sessions WHERE faculty_id = ? AND topic <=> ? AND date = ? AND (is_deleted IS NULL OR is_deleted = 0)',
            [facultyId, topic || null, date]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: "Duplicate session already exists for this topic and date." });
        }

        const [sessionResult] = await connection.query(
            'INSERT INTO faculty_sessions (faculty_id, topic, date, status) VALUES (?, ?, ?, "Scheduled")',
            [facultyId, topic, date]
        );

        const sessionId = sessionResult.insertId;

        // Post-Insert Save Verification
        const saveVerifier = require('../utils/saveVerifier');
        await saveVerifier.verifySave(connection, 'faculty_sessions', sessionId, {
            faculty_id: facultyId, topic: topic || null, date, status: 'Scheduled'
        });

        // Referential Integrity Verification
        await saveVerifier.verifyReferentialIntegrity(connection, [
            { table: 'users_or_faculties', column: 'id', value: facultyId }
        ]);

        if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
            const attendanceValues = studentIds.map(sid => [sessionId, sid, 'Present']);
            await connection.query(
                'INSERT INTO session_attendance (session_id, student_id, status) VALUES ?',
                [attendanceValues]
            );

            // Verify attendance references
            for (const sid of studentIds) {
                await saveVerifier.verifyReferentialIntegrity(connection, [
                    { table: 'students', column: 'id', value: sid }
                ]);
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: "Session created with students" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

const getSessions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, 
                   (SELECT COUNT(*) FROM session_attendance WHERE session_id = s.id) as student_count,
                   (SELECT st.name FROM students st JOIN session_attendance sa ON st.id = sa.student_id WHERE sa.session_id = s.id LIMIT 1) as student_name
            FROM faculty_sessions s
            WHERE s.faculty_id = ?
            ORDER BY s.date DESC
        `, [req.user.id]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const completeSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { attendance } = req.body; // Array of {student_id, status}
        const sessionId = req.params.id;

        await connection.beginTransaction();

        const [updateResult] = await connection.query('UPDATE faculty_sessions SET status = "Completed" WHERE id = ?', [sessionId]);
        if (updateResult.affectedRows === 0) {
            throw new Error("CRITICAL FAILURE: No records updated. Session may not exist.");
        }

        if (attendance && attendance.length > 0) {
            for (const record of attendance) {
                await connection.query(
                    'UPDATE session_attendance SET status = ? WHERE session_id = ? AND student_id = ?',
                    [record.status, sessionId, record.student_id]
                );
            }
        }

        // Post-Update Verification
        const [verify] = await connection.query('SELECT status FROM faculty_sessions WHERE id = ?', [sessionId]);
        if (verify.length === 0 || verify[0].status !== 'Completed') {
            throw new Error("CRITICAL FAILURE: Update verification failed.");
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Session marked as completed" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Interaction Reports
const submitReport = async (req, res) => {
    const { student_id, type, remarks, action_taken, status, follow_up_date } = req.body;
    try {
        await db.query(`
            INSERT INTO student_reports (faculty_id, student_id, type, remarks, action_taken, status, follow_up_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, student_id, type, remarks, action_taken, status || 'Open', follow_up_date || null]);
        res.status(201).json({ success: true, message: "Report submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getReports = async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        let query = `
            SELECT r.*, s.name as student_name
            FROM student_reports r
            JOIN students s ON r.student_id = s.id
            WHERE r.faculty_id = ?
        `;
        let params = [req.user.id];

        if (search) {
            query += ` AND (s.name LIKE ? OR r.type LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY r.created_at DESC`;

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            let countQuery = 'SELECT COUNT(*) as total FROM student_reports r JOIN students s ON r.student_id = s.id WHERE r.faculty_id = ?';
            let countParams = [req.user.id];
            
            if (search) {
                countQuery += ` AND (s.name LIKE ? OR r.type LIKE ?)`;
                countParams.push(`%${search}%`, `%${search}%`);
            }
            
            const [countResult] = await db.query(countQuery, countParams);
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
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Task Section
const getFacultyTasks = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, u.name as assigned_by_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_by = u.id
            WHERE t.assigned_to = ?
            ORDER BY t.deadline ASC
        `, [req.user.id]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const submitTaskProof = async (req, res) => {
    try {
        const taskId = req.params.id;
        const proof_url = req.file ? req.file.path : null;

        await db.query(`
            UPDATE tasks SET status = "Completed", proof_url = ?, completed_at = NOW() WHERE id = ? AND assigned_to = ?
        `, [proof_url, taskId, req.user.id]);

        res.status(200).json({ success: true, message: "Task marked as completed with proof" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Document Management
const uploadDocument = async (req, res) => {
    try {
        const { title } = req.body;
        const file_url = req.file ? req.file.path : null;
        const file_type = req.file ? req.file.mimetype : null;

        if (!file_url) return res.status(400).json({ success: false, message: "File required" });

        await db.query(`
            INSERT INTO faculty_documents (faculty_id, title, file_url, file_type)
            VALUES (?, ?, ?, ?)
        `, [req.user.id, title, file_url, file_type]);

        res.status(201).json({ success: true, message: "Document uploaded to Cloudinary" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getDocuments = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM faculty_documents WHERE faculty_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const [doc] = await db.query('SELECT * FROM faculty_documents WHERE id = ? AND faculty_id = ?', [req.params.id, req.user.id]);
        if (doc.length === 0) return res.status(404).json({ success: false, message: "Document not found" });

        // Optionally delete from Cloudinary here if you have the public_id
        await db.query('UPDATE faculty_documents SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Notifications
const getNotifications = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        let params = [req.user.id];

        if (status === 'unread') {
            query += ' AND is_read = 0';
        } else if (status === 'read') {
            query += ' AND is_read = 1';
        }
        
        query += ' ORDER BY created_at DESC';

        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
            if (status === 'unread') countQuery += ' AND is_read = 0';
            else if (status === 'read') countQuery += ' AND is_read = 1';
            
            const [countResult] = await db.query(countQuery, [req.user.id]);
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
        res.status(500).json({ success: false, message: error.message });
    }
};

const markRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Profile Settings
const getProfile = async (req, res) => {
    try {
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (user.length === 0) return res.status(404).json({ success: false, message: "User not found" });
        
        delete user[0].password;
        res.status(200).json({ success: true, data: user[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Profile
const updateProfile = async (req, res) => {
    try {
        const { 
            phone_number, password, 
            faculty_id_card, section, syllabus, languages_proficiency,
            qualification, experience, availability, hourly_rate,
            teaching_mode, joining_date, remarks, primary_subject, secondary_subjects
        } = req.body;
        
        const updates = [];
        const params = [];

        if (phone_number) { updates.push('phone_number = ?'); params.push(phone_number); }
        if (faculty_id_card) { updates.push('faculty_id_card = ?'); params.push(faculty_id_card); }
        if (section) { updates.push('section = ?'); params.push(section); }
        if (syllabus) { updates.push('syllabus = ?'); params.push(JSON.stringify(syllabus)); }
        if (languages_proficiency) { updates.push('languages_proficiency = ?'); params.push(JSON.stringify(languages_proficiency)); }
        if (qualification) { updates.push('qualification = ?'); params.push(qualification); }
        if (experience) { updates.push('experience = ?'); params.push(experience); }
        if (availability) { updates.push('availability = ?'); params.push(availability); }
        if (hourly_rate) { updates.push('hourly_rate = ?'); params.push(hourly_rate); }
        if (teaching_mode) { updates.push('teaching_mode = ?'); params.push(teaching_mode); }
        if (joining_date) { updates.push('joining_date = ?'); params.push(joining_date); }
        if (remarks) { updates.push('remarks = ?'); params.push(remarks); }
        if (primary_subject) { updates.push('subject = ?'); params.push(primary_subject); }
        if (secondary_subjects) { updates.push('secondary_subjects = ?'); params.push(JSON.stringify(secondary_subjects)); }

        if (password) {
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (req.file) {
            updates.push('profile_image = ?'); // Assuming you add this column or use existing
            params.push(req.file.path);
        }

        if (updates.length === 0) return res.status(400).json({ success: false, message: "No updates provided" });

        params.push(req.user.id);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (updatedUser.length > 0) {
            delete updatedUser[0].password; // Don't send password back
            return res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser[0] });
        }

        res.status(200).json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logs submitted by mentors for this faculty's students
const getMentorLogs = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const [rows] = await db.query(`
            SELECT logs.*, s.name as student_name, u.name as mentor_name,
            IF(logs.parent_update_needed = 1, 'Yes', 'No') as parent_update_needed
            FROM faculty_interaction_logs logs
            JOIN students s ON logs.student_id = s.id
            LEFT JOIN users u ON logs.mentor_id = u.id
            WHERE logs.faculty_id = ?
            ORDER BY logs.date DESC, logs.session_number DESC
        `, [facultyId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student exam scores
const getStudentExamScores = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const [rows] = await db.query(`
            SELECT m.*, s.name as student_name
            FROM student_marks m
            JOIN students s ON m.student_id = s.id
            WHERE s.faculty_id = ? 
               OR EXISTS (SELECT 1 FROM faculty_schedules fs WHERE (fs.is_deleted IS NULL OR fs.is_deleted = 0) AND fs.student_id = s.id AND fs.faculty_id = ?)
            ORDER BY m.exam_date DESC, m.created_at DESC
        `, [facultyId, facultyId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit exam score
const submitExamScore = async (req, res) => {
    const { student_id, subject, chapter, publication, marks, total, grade, term, exam_date, question_paper, answer_sheet } = req.body;
    const facultyId = req.user.id;

    try {
        await db.query(`
            INSERT INTO student_marks (student_id, faculty_id, subject, chapter, publication, marks, total, grade, term, exam_date, question_paper, answer_sheet)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [student_id, facultyId, subject, chapter || null, publication || null, marks, total, grade, term, exam_date, question_paper || null, answer_sheet || null]);

        res.status(201).json({ success: true, message: "Exam score submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDashboard,
    getStudents,
    getStudentProfile,
    createSession,
    getSessions,
    completeSession,
    submitReport,
    getReports,
    getFacultyTasks,
    submitTaskProof,
    uploadDocument,
    getDocuments,
    deleteDocument,
    getNotifications,
    markRead,
    updateProfile,
    getMentorLogs,
    getStudentExamScores,
    submitExamScore,
    getProfile
};
