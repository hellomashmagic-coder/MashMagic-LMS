const db = require('../config/db');

// --- FACULTY ACTIONS ---

// @desc    Submit a daily class update for a student
// @route   POST /api/faculty-tracking/class-update
// @access  Private (Faculty)
const createClassUpdate = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const {
            student_id,
            subject,
            date,
            class_duration,
            topic_taught,
            homework_given,
            homework_details,
            attention_level,
            participation_level,
            understanding_level,
            issue_flag,
            issue_type,
            faculty_files
        } = req.body;

        if (!student_id || !subject) {
            return res.status(400).json({ success: false, message: "Student ID and Subject are required" });
        }

        const query = `
            INSERT INTO faculty_class_updates (
                student_id, faculty_id, subject, date, class_duration,
                topic_taught, homework_given, homework_details,
                attention_level, participation_level, understanding_level,
                issue_flag, issue_type, faculty_files
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            student_id,
            facultyId,
            subject,
            date || new Date().toISOString().split('T')[0],
            class_duration,
            topic_taught,
            homework_given === 'Yes' || homework_given === true ? 1 : 0,
            homework_details,
            attention_level,
            participation_level,
            understanding_level,
            issue_flag === 'Yes' || issue_flag === true ? 1 : 0,
            issue_type || null,
            faculty_files ? JSON.stringify(faculty_files) : null
        ];

        const [result] = await db.query(query, values);
        const facultyLogId = result.insertId;

        // --- AUTOMATIC SESSION CREATION ---
        // Create a completed session record for this daily update
        const [sessionResult] = await db.query(
            'INSERT INTO faculty_sessions (faculty_id, topic, date, status, duration) VALUES (?, ?, ?, "Completed", ?)',
            [facultyId, `${subject} - ${topic_taught}`, date || new Date().toISOString().split('T')[0], class_duration]
        );

        const sessionId = sessionResult.insertId;

        // Record attendance for this student in this session
        await db.query(
            'INSERT INTO session_attendance (session_id, student_id, status) VALUES (?, ?, "Present")',
            [sessionId, student_id]
        );

        // --- MILESTONE ALERT FOR ACADEMIC HEAD ---
        // Check total completed sessions for this faculty-student pair
        const [[{ sessionCount }]] = await db.query(
            'SELECT COUNT(*) as sessionCount FROM faculty_sessions s JOIN session_attendance a ON s.id = a.session_id WHERE s.faculty_id = ? AND a.student_id = ? AND s.status = "Completed"',
            [facultyId, student_id]
        );

        if (sessionCount > 0 && sessionCount % 5 === 0) {
            const [[{ facultyName }]] = await db.query('SELECT name FROM users WHERE id = ?', [facultyId]);
            const [[{ studentName }]] = await db.query('SELECT name FROM students WHERE id = ?', [student_id]);
            
            const alertMessage = `MILESTONE: Faculty ${facultyName} has completed ${sessionCount} sessions for Student ${studentName}.`;
            
            await db.query(
                'INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, "session_milestone")',
                [alertMessage, facultyLogId]
            );
        }

        res.status(201).json({ success: true, message: "Daily class update submitted and session recorded successfully" });
    } catch (error) {
        console.error("Create Class Update Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// --- MENTOR ACTIONS ---

// @desc    Get all faculty class updates for students assigned to the mentor (Tab 1)
// @route   GET /api/faculty-tracking/mentor/class-updates
// @access  Private (Mentor)
const getFacultyClassUpdates = async (req, res) => {
    try {
        const mentorId = req.user.id;
        
        // Fetch students assigned to this mentor who have Mentorship (Gold/Diamond)
        // AND fetch all faculty logs for those students
        const [rows] = await db.query(`
            SELECT fcu.*, s.name as student_name, u.name as faculty_name,
                   mr.todays_observation, mr.reviewed_at
            FROM faculty_class_updates fcu
            JOIN students s ON fcu.student_id = s.id
            JOIN users u ON fcu.faculty_id = u.id
            LEFT JOIN mentor_reviews mr ON fcu.id = mr.faculty_log_id
            WHERE s.mentor_id = ?
            ORDER BY fcu.created_at DESC
        `, [mentorId]);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Get Faculty Updates Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Submit a mentor review for a specific faculty log (Tab 2)
// @route   POST /api/faculty-tracking/mentor/review
// @access  Private (Mentor)
const createMentorReview = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { faculty_log_id, todays_observation } = req.body;

        if (!faculty_log_id || !todays_observation) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Check if already reviewed
        const [existing] = await db.query('SELECT id FROM mentor_reviews WHERE faculty_log_id = ?', [faculty_log_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "Log already reviewed" });
        }

        await db.query(`
            INSERT INTO mentor_reviews (faculty_log_id, mentor_id, todays_observation)
            VALUES (?, ?, ?)
        `, [faculty_log_id, mentorId, todays_observation]);

        res.status(201).json({ success: true, message: "Review submitted successfully" });
    } catch (error) {
        console.error("Create Mentor Review Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Create a mentor-faculty interaction (Tab 3)
// @route   POST /api/faculty-tracking/mentor/interaction
// @access  Private (Mentor)
const createInteraction = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const {
            faculty_log_id,
            student_id,
            subject,
            faculty_name,
            date,
            connection_method,
            main_issue,
            issue_details,
            teacher_feedback,
            root_cause,
            action_plan,
            responsibility,
            followup_required,
            followup_date,
            issue_understood,
            interaction_quality_rating
        } = req.body;

        const query = `
            INSERT INTO mentor_faculty_interactions (
                faculty_log_id, student_id, mentor_id, subject, faculty_name,
                date, connection_method, main_issue, issue_details,
                teacher_feedback, root_cause, action_plan, responsibility,
                followup_required, followup_date, issue_understood, interaction_quality_rating
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            faculty_log_id,
            student_id,
            mentorId,
            subject,
            faculty_name,
            date || new Date().toISOString().split('T')[0],
            connection_method,
            main_issue,
            issue_details,
            teacher_feedback,
            root_cause,
            action_plan,
            responsibility,
            followup_required === 'Yes' || followup_required === true ? 1 : 0,
            followup_date || null,
            issue_understood,
            interaction_quality_rating
        ];

        await db.query(query, values);

        // Notify Admin of new mentor-faculty interaction
        try {
            const [[student]] = await db.query('SELECT name FROM students WHERE id = ?', [student_id]);
            await db.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)', [
                `<b>Faculty Tracking:</b> Mentor <b>${req.user.name}</b> logged an interaction with Faculty <b>${faculty_name}</b> regarding <b>${student?.name || student_id}</b>.`,
                student_id,
                'mentor_faculty_interaction'
            ]);
        } catch (nErr) {
            console.error("Notification Error:", nErr.message);
        }

        res.status(201).json({ success: true, message: "Interaction log submitted successfully" });
    } catch (error) {
        console.error("Create Interaction Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get all interactions for a specific student or mentor
// @route   GET /api/faculty-tracking/mentor/interactions
const getInteractions = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const [rows] = await db.query(`
            SELECT mfi.*, s.name as student_name
            FROM mentor_faculty_interactions mfi
            JOIN students s ON mfi.student_id = s.id
            WHERE mfi.mentor_id = ?
            ORDER BY mfi.created_at DESC
        `, [mentorId]);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    createClassUpdate,
    getFacultyClassUpdates,
    createMentorReview,
    createInteraction,
    getInteractions
};
