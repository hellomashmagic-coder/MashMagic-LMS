const db = require('../config/db');

const getFacultyChangeHistory = async (req, res) => {
    try {
        const studentId = req.params.id;
        const [history] = await db.query(
            `SELECT subject, old_faculty_name, new_faculty_name, changed_by_name, changed_by_role, changed_at 
             FROM faculty_change_history 
             WHERE student_id = ? 
             ORDER BY changed_at DESC`,
            [studentId]
        );
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error("GET_FACULTY_HISTORY_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getFacultyChangeHistory };
