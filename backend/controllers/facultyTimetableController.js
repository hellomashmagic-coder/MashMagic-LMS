const db = require('../config/db');

exports.getTimetable = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, s.name as student_name, s.grade, s.subject as student_subject
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE t.faculty_id = ? OR s.faculty_id = ?
            ORDER BY t.date DESC, t.start_time DESC
        `, [req.user.id, req.user.id]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAcademicSchedule = async (req, res) => {
    try {
        const [today] = await db.query(`
            SELECT t.*, s.name as student_name, s.grade, s.subject as student_subject, s.meeting_link as student_meeting_link
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE (t.faculty_id = ? OR s.faculty_id = ?) AND t.date = CURDATE()
            ORDER BY t.start_time ASC
        `, [req.user.id, req.user.id]);

        const [upcoming] = await db.query(`
            SELECT t.*, s.name as student_name, s.grade, s.subject as student_subject
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE (t.faculty_id = ? OR s.faculty_id = ?) AND t.date > CURDATE()
            ORDER BY t.date ASC, t.start_time ASC
        `, [req.user.id, req.user.id]);

        const [completed] = await db.query(`
            SELECT t.*, s.name as student_name, s.grade, s.subject as student_subject
            FROM timetable t
            JOIN students s ON t.student_id = s.id
            WHERE (t.faculty_id = ? OR s.faculty_id = ?) AND t.status = 'Completed'
            ORDER BY t.date DESC, t.start_time DESC
        `, [req.user.id, req.user.id]);

        res.status(200).json({ success: true, data: { today, upcoming, completed } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.submitTimetableReport = async (req, res) => {
    try {
        const { timetable_id, student_id, date, start_time, end_time, subject, topic, homework_given, remarks } = req.body;
        const faculty_id = req.user.id;

        // Check if report already exists for this timetable_id
        const [existing] = await db.query('SELECT id FROM timetable_reports WHERE timetable_id = ?', [timetable_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Report already submitted for this session.' });
        }

        // Logic for checking 15 mins
        let is_late = false;
        if (end_time && date) {
            // end_time format is typically "HH:MM", date is "YYYY-MM-DD"
            const endDateTimeStr = `${date.split('T')[0]}T${end_time}:00`;
            const endDateTime = new Date(endDateTimeStr);
            const now = new Date();
            const diffInMins = (now - endDateTime) / 1000 / 60;
            if (diffInMins > 15) {
                is_late = true;
            }
        }

        await db.query(`
            INSERT INTO timetable_reports (
                timetable_id, faculty_id, student_id, date, start_time, end_time, subject, topic, homework_given, remarks, is_late
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            timetable_id, faculty_id, student_id, date, start_time, end_time, subject, topic, homework_given, remarks, is_late
        ]);

        await db.query(`UPDATE timetable SET status = 'Completed' WHERE id = ?`, [timetable_id]);

        res.status(201).json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
