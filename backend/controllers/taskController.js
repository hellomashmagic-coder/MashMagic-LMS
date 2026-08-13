const db = require('../config/db');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private (super_admin)
const getTasks = async (req, res) => {
    try {
        const { startDate, endDate, category, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.export === 'true' ? 5000 : (parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;
        let sql = `
            SELECT t.*, u.name as mentor_name, u.email as mentor_email, 
                   creator.name as assigner_name, creator.role as assigner_role
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id 
            LEFT JOIN users creator ON t.assigned_by = creator.id
            WHERE 1=1
        `;
        let params = [];

        // Filter by date
        if (startDate) {
            sql += ' AND t.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND t.created_at <= ?';
            params.push(endDate + ' 23:59:59');
        }

        // Filter by category
        // Filter by category (status)
        if (category && category !== 'All' && category !== 'All Tasks') {
            if (category === 'Active Records') {
                sql += " AND t.status NOT IN ('Completed', 'Success', 'Rejected')";
            } else if (category === 'Archived Records') {
                sql += " AND t.status IN ('Completed', 'Success', 'Rejected')";
            } else {
                sql += ' AND t.status = ?';
                params.push(category);
            }
        }

        // Role-based filtering
        if (req.user.role === 'academic_head' || req.user.role === 'academic_operation_executive') {
            sql += ' AND t.assigned_by = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'mentor' || req.user.role === 'faculty') {
            sql += ' AND t.assigned_to = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'mentor_head') {
            // Mentor head can see tasks they created, tasks assigned to them, AND tasks assigned to any mentor
            sql += ' AND (t.assigned_by = ? OR t.assigned_to = ? OR u.role = "mentor")';
            params.push(req.user.id, req.user.id);
        } else if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'sub_admin') {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        // Search filtering
        if (search) {
            sql += ' AND (t.title LIKE ? OR t.description LIKE ? OR u.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        let countSql = sql.replace('SELECT t.*, u.name as mentor_name, u.email as mentor_email, \n                   creator.name as assigner_name, creator.role as assigner_role', 'SELECT COUNT(*) as total');
        // Let's just write a clean count query
        countSql = `
            SELECT COUNT(*) as total
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id 
            LEFT JOIN users creator ON t.assigned_by = creator.id
            WHERE 1=1
        `;
        let countParams = [];

        if (startDate) {
            countSql += ' AND t.created_at >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countSql += ' AND t.created_at <= ?';
            countParams.push(endDate + ' 23:59:59');
        }

        if (category && category !== 'All' && category !== 'All Tasks') {
            if (category === 'Active Records') {
                countSql += " AND t.status NOT IN ('Completed', 'Success', 'Rejected')";
            } else if (category === 'Archived Records') {
                countSql += " AND t.status IN ('Completed', 'Success', 'Rejected')";
            } else {
                countSql += ' AND t.status = ?';
                countParams.push(category);
            }
        }

        if (req.user.role === 'academic_head' || req.user.role === 'academic_operation_executive') {
            countSql += ' AND t.assigned_by = ?';
            countParams.push(req.user.id);
        } else if (req.user.role === 'mentor' || req.user.role === 'faculty') {
            countSql += ' AND t.assigned_to = ?';
            countParams.push(req.user.id);
        } else if (req.user.role === 'mentor_head') {
            countSql += ' AND (t.assigned_by = ? OR t.assigned_to = ? OR u.role = "mentor")';
            countParams.push(req.user.id, req.user.id);
        }

        if (search) {
            countSql += ' AND (t.title LIKE ? OR t.description LIKE ? OR u.name LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [countResult] = await db.query(countSql, countParams);
        const total = countResult[0].total;

        sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(sql, params);
        res.status(200).json({ success: true, count: rows.length, total, data: rows });
    } catch (error) {
        console.error("GET_TASKS_ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (super_admin)
const createTask = async (req, res) => {
    const { title, description, mentor_id, deadline, priority } = req.body;
    try {
        if (mentor_id === 'all_mentors' || mentor_id === 'all_faculties') {
            const roleFilter = mentor_id === 'all_mentors' ? 'mentor' : 'faculty';
            const [users] = await db.query('SELECT id FROM users WHERE role = ?', [roleFilter]);
            
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: `No active ${roleFilter}s found to assign tasks.` });
            }

            const values = users.map(u => [title, description, u.id, req.user.id, deadline, priority]);
            const sql = 'INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority) VALUES ?';
            const [result] = await db.query(sql, [values]);

            return res.status(201).json({
                success: true,
                message: `Task successfully assigned to all ${roleFilter}s`,
                taskCount: result.affectedRows
            });
        }

        const sql = 'INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [title, description, mentor_id, req.user.id, deadline, priority]);

        res.status(201).json({
            success: true,
            message: "Task created and assigned successfully",
            taskId: result.insertId
        });
    } catch (error) {
        console.error("CREATE_TASK_ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private (super_admin, mentor)
const updateTaskStatus = async (req, res) => {
    const { status } = req.body;
    const proof_url = req.file ? req.file.path : null;
    
    try {
        let query = 'UPDATE tasks SET status = ?';
        let params = [status];

        if (status === 'Completed') {
            query += ', completed_at = NOW()';
            if (proof_url) {
                query += ', proof_url = ?';
                params.push(proof_url);
            }
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        const [result] = await db.query(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }
        res.status(200).json({ success: true, message: "Task status updated successfully" });
    } catch (error) {
        console.error("UPDATE_TASK_STATUS_ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (super_admin)
const deleteTask = async (req, res) => {
    try {
        const [result] = await db.query('UPDATE tasks SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }
        res.status(200).json({ success: true, message: "Task removed from system" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTaskStatus,
    deleteTask
};
