const db = require('../config/db');

// @desc    Create a new mentor-student interaction log
// @route   POST /api/mentor-logs/create
// @access  Protected (Mentor)
const createLog = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        const {
            student_id,
            date,
            connection_method,
            session_start_time,
            session_end_time,
            focus_level,
            energy_level,
            stress_level,
            homework_status,
            revision_done,
            doubts_present,
            main_issue,
            secondary_issue,
            weak_subject,
            problem_clarity,
            action_type,
            action_detail,
            action_specific,
            student_engagement,
            understanding_after_session,
            previous_task_status,
            followup_required,
            followup_date,
            student_status,
            session_quality_rating,
            interaction_files
        } = req.body;

        const requiredFields = [
            'student_id',
            'date',
            'connection_method',
            'session_start_time',
            'session_end_time',
            'focus_level',
            'energy_level',
            'stress_level',
            'homework_status',
            'revision_done',
            'doubts_present',
            'main_issue',
            'weak_subject',
            'problem_clarity',
            'action_type',
            'action_specific',
            'student_engagement',
            'understanding_after_session',
            'followup_required',
            'student_status',
            'session_quality_rating'
        ];

        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                return res.status(400).json({ success: false, message: `${field} is required` });
            }
        }

        if (followup_required && !followup_date) {
            return res.status(400).json({ success: false, message: "followup_date is required when followup_required is true" });
        }

        const [prevRows] = await db.query(
            `SELECT id FROM mentor_session_logs WHERE student_id = ? AND mentor_id = ? ORDER BY created_at DESC LIMIT 1`,
            [student_id, mentor_id]
        );

        if (prevRows.length > 0 && !previous_task_status) {
            return res.status(400).json({ success: false, message: "previous_task_status is mandatory before submitting a new session" });
        }

        const start = new Date(session_start_time);
        const end = new Date(session_end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return res.status(400).json({ success: false, message: "Invalid session_start_time/session_end_time" });
        }

        const session_duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000);

        const query = `
            INSERT INTO mentor_session_logs (
                student_id, mentor_id, date, connection_method, session_start_time, session_end_time,
                session_duration_minutes,
                focus_level, energy_level, stress_level, homework_status, revision_done, doubts_present,
                main_issue, secondary_issue, weak_subject, problem_clarity, action_type, action_detail,
                action_specific, student_engagement, understanding_after_session, previous_task_status,
                followup_required, followup_date, student_status, session_quality_rating, interaction_files
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            student_id, mentor_id, date, connection_method, session_start_time, session_end_time,
            session_duration_minutes,
            focus_level, energy_level, stress_level, homework_status, revision_done, doubts_present,
            main_issue, secondary_issue, weak_subject, problem_clarity, action_type, action_detail,
            action_specific, student_engagement, understanding_after_session, previous_task_status,
            followup_required, followup_date || null, student_status, session_quality_rating,
            interaction_files ? JSON.stringify(interaction_files) : null
        ];

        await db.query(query, values);

        // Notify Admin of new session log
        try {
            const [[student]] = await db.query('SELECT name FROM students WHERE id = ?', [student_id]);
            await db.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)', [
                `<b>New Session Log:</b> Mentor <b>${req.user.name}</b> submitted a session report for <b>${student?.name || student_id}</b>.`,
                student_id,
                'mentor_session_log'
            ]);
        } catch (nErr) {
            console.error("Notification Error:", nErr.message);
        }

        res.status(201).json({ success: true, message: "Interaction log submitted successfully" });
    } catch (error) {
        console.error("Create Log Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// @desc    Get the last session log for a specific student (Continuity Feature)
// @route   GET /api/mentor-logs/previous/:studentId
// @access  Protected (Mentor)
const getPreviousSession = async (req, res) => {
    try {
        const { studentId } = req.params;
        const mentorId = req.user.id;
        const [rows] = await db.query(
            `SELECT main_issue, action_type, followup_date, created_at 
             FROM mentor_session_logs 
             WHERE student_id = ? AND mentor_id = ?
             ORDER BY created_at DESC LIMIT 1`,
            [studentId, mentorId]
        );

        if (rows.length === 0) {
            return res.status(200).json({ success: true, data: null });
        }

        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error("Get Previous Session Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get student improvement trend (Analytics)
// @route   GET /api/mentor-logs/analytics/:studentId
// @access  Protected (Mentor/Admin)
const getStudentAnalytics = async (req, res) => {
    try {
        const { studentId } = req.params;
        const mentorId = req.user.id;
        const [rows] = await db.query(
            `SELECT date, focus_level, energy_level, stress_level, student_engagement, 
                    understanding_after_session, student_status, session_quality_rating,
                    main_issue, action_type, followup_required, previous_task_status
             FROM mentor_session_logs 
             WHERE student_id = ? AND mentor_id = ?
             ORDER BY date ASC`,
            [studentId, mentorId]
        );

        const total = rows.length;
        const improvedCount = rows.filter(r => r.understanding_after_session === 'Improved').length;
        const followupsRequested = rows.filter(r => Number(r.followup_required) === 1).length;
        const followupsChecked = rows.filter(r => r.previous_task_status && r.previous_task_status !== 'Not Checked').length;
        const diagnosisConsistency = rows.filter(r =>
            (r.main_issue === 'No Issue' && r.student_status === 'On Track') ||
            (r.main_issue !== 'No Issue' && r.student_status !== 'On Track')
        ).length;

        const summary = {
            mentor_accuracy_percent: total ? Math.round((diagnosisConsistency / total) * 100) : 0,
            student_improvement_percent: total ? Math.round((improvedCount / total) * 100) : 0,
            followup_consistency_percent: followupsRequested ? Math.round((followupsChecked / followupsRequested) * 100) : 0
        };

        res.status(200).json({ success: true, data: rows, summary });
    } catch (error) {
        console.error("Get Analytics Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.createLog = createLog;
exports.getPreviousSession = getPreviousSession;
exports.getStudentAnalytics = getStudentAnalytics;
