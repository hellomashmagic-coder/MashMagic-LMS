const db = require('../config/db');

// @desc    Submit daily data update from student portal
// @route   POST /api/student/daily-update
const submitDailyUpdate = async (req, res) => {
    try {
        const studentUserId = req.user.id;
        const { data_content } = req.body;

        if (!data_content) {
            return res.status(400).json({ success: false, message: "Content is required" });
        }

        // Find the student record and their mentor
        const [studentRows] = await db.query('SELECT id, mentor_id FROM students WHERE user_id = ?', [studentUserId]);
        
        if (studentRows.length === 0) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        const studentId = studentRows[0].id;
        const mentorId = studentRows[0].mentor_id;

        if (!mentorId) {
            return res.status(400).json({ success: false, message: "No mentor assigned. Please contact administration." });
        }

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().split(' ')[0];

        await db.query(`
            INSERT INTO student_daily_updates (student_id, mentor_id, data_content, registration_date, registration_time)
            VALUES (?, ?, ?, ?, ?)
        `, [studentId, mentorId, data_content, today, now]);

        res.status(201).json({ success: true, message: "Daily update submitted successfully" });
    } catch (error) {
        console.error("Student Daily Update Error:", error);
        res.status(500).json({ success: false, message: "Server error during submission" });
    }
};

// @desc    Get student's own updates
// @route   GET /api/student/my-updates
const getMyUpdates = async (req, res) => {
    try {
        const studentUserId = req.user.id;
        const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [studentUserId]);
        
        if (studentRows.length === 0) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        const [rows] = await db.query(`
            SELECT *, 
            DATE_FORMAT(registration_date, '%d-%m-%Y') as formatted_date,
            DATE_FORMAT(registration_time, '%l:%i %p') as formatted_time
            FROM student_daily_updates 
            WHERE student_id = ? 
            ORDER BY registration_date DESC, registration_time DESC
        `, [studentRows[0].id]);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitDailyUpdate,
    getMyUpdates
};
