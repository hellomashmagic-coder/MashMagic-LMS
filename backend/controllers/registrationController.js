const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @desc    Register a student
// @route   POST /api/register/student
const registerStudent = async (req, res) => {
    try {
        const {
            name,
            grade,
            subject,
            course,
            hour,
            time_table,
            mentor_name,
            faculty_name,
            next_installment_date,
            enrollment_type
        } = req.body;

        const badge = enrollment_type === 'Mentorship' ? 'Gold' : 
                      enrollment_type === 'Tuition' ? 'Silver' : 
                      enrollment_type === 'Mentorship and Tuition' ? 'Diamond' : null;

        const query = `
            INSERT INTO students (
                name, grade, subject, course, hour, 
                time_table, mentor_name, faculty_name, next_installment_date, enrollment_type, badge, status, isApproved, priority_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 'High')
        `;

        const [studentResult] = await db.query(query, [
            name,
            grade,
            subject,
            course,
            hour,
            JSON.stringify(time_table || {}),
            mentor_name || null,
            faculty_name || null,
            next_installment_date || null,
            enrollment_type || null,
            badge
        ]);

        const studentId = studentResult.insertId;

        // Notify Admin (Informational only, no action_type to require approval)
        await db.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, NULL)', [
            `<b>New Student Registration:</b> ${name} registered for <b>${course}</b> (${grade}).`,
            studentId
        ]);

        // Automatically insert initial session into timetable if mentor exists
        if (mentor_name) {
            // Attempt to find user id for this mentor name
            const [mentorUsers] = await db.query('SELECT id FROM users WHERE name = ? AND role = "mentor" LIMIT 1', [mentor_name]);

            if (mentorUsers.length > 0) {
                const mentorUserId = mentorUsers[0].id;

                // Update student record with the found mentor_id for panel linkage
                await db.query('UPDATE students SET mentor_id = ? WHERE id = ?', [mentorUserId, studentId]);

                // Insert a placeholder "Scheduled" session
                await db.query(`
                    INSERT INTO timetable (
                        mentor_id, student_id, session_number, date, status, 
                        chapter, start_time, end_time, duration, session_type
                    ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)
                `, [
                    mentorUserId, studentId, 1, 'Scheduled',
                    'Initial Introduction Session', '10:00', '11:00', '1h 0m', 'Regular Class'
                ]);
            }
        }

        res.status(201).json({
            success: true,
            message: "Student registered and session scheduled",
            studentId
        });
    } catch (error) {
        console.error("Student Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to register student",
            error: error.message
        });
    }
};

// @desc    Register a mentor
// @route   POST /api/register/mentor
const registerMentor = async (req, res) => {
    try {
        const { name, phone_number } = req.body;

        // 1. Create record in mentors table
        const [result] = await db.query(
            'INSERT INTO mentors (name, phone_number) VALUES (?, ?)',
            [name, phone_number]
        );

        // 2. Create user account for panel access
        // Use phone_number as email (identifier) and password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(phone_number, salt);

        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, role, status, isApproved, isActive) VALUES (?, ?, ?, ?, ?, 0, 0)',
            [name, phone_number, hashedPassword, 'mentor', 'pending']
        );

        const userId = userResult.insertId;



        // 3. Generate Token
        const token = jwt.sign(
            { id: userId, role: 'mentor' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Mentor registered successfully and logged in",
            token,
            role: 'mentor',
            user: {
                id: userId,
                name,
                email: phone_number,
                role: 'mentor'
            }
        });
    } catch (error) {
        console.error("Mentor Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to register mentor",
            error: error.message
        });
    }
};

// @desc    Register a faculty
// @route   POST /api/register/faculty
const registerFaculty = async (req, res) => {
    try {
        const { name, phone_number } = req.body;

        // 1. Create record in faculties table
        const [result] = await db.query(
            'INSERT INTO faculties (name, phone_number) VALUES (?, ?)',
            [name, phone_number]
        );

        // 2. Create user account for panel access
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(phone_number, salt);

        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, role, status, isApproved, isActive) VALUES (?, ?, ?, ?, ?, 0, 0)',
            [name, phone_number, hashedPassword, 'faculty', 'pending']
        );

        const userId = userResult.insertId;



        // 3. Generate Token
        const token = jwt.sign(
            { id: userId, role: 'faculty' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Faculty registered successfully and logged in",
            token,
            role: 'faculty',
            user: {
                id: userId,
                name,
                email: phone_number,
                role: 'faculty'
            }
        });
    } catch (error) {
        console.error("Faculty Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to register faculty",
            error: error.message
        });
    }
};

// @desc    Get all mentors
// @route   GET /api/register/mentors
const getMentors = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM mentors ORDER BY name ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching mentors", error: error.message });
    }
};

// @desc    Get all faculties
// @route   GET /api/register/faculties
const getFaculties = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM faculties ORDER BY name ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching faculties", error: error.message });
    }
};

// @desc    Register a lead from public website contact form
// @route   POST /api/register/public-lead
const publicLeadRegistration = async (req, res) => {
    try {
        const {
            studentName,
            parentName,
            email,
            phone,
            whatsapp,
            grade,
            subject,
            location
        } = req.body;

        if (!studentName || !phone) {
            return res.status(400).json({ success: false, message: "Name and Phone are required" });
        }

        const query = `
            INSERT INTO public_leads (
                student_name, parent_name, email, phone, whatsapp, grade, subject, location, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
        `;

        const [result] = await db.query(query, [
            studentName, parentName, email, phone, whatsapp, grade, subject, location
        ]);

        // Notify Admin
        await db.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)', [
            `<b>New Public Lead:</b> ${studentName} (${grade}) registered via website.`,
            result.insertId,
            'public_lead'
        ]);

        res.status(201).json({
            success: true,
            message: "Registration successful! Our team will contact you soon.",
            leadId: result.insertId
        });
    } catch (error) {
        console.error("Public Lead Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process registration",
            error: error.message
        });
    }
};

module.exports = {
    registerStudent,
    registerMentor,
    registerFaculty,
    getMentors,
    getFaculties,
    publicLeadRegistration
};
