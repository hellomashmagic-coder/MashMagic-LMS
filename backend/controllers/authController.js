const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const db = require('../config/db');

// @desc    Register a new user (Student / Admin default)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const targetRole = role || 'student';
        const isStudent = targetRole === 'student';

        if (!name || (!email && !req.body.phone_number) || (!isStudent && !password)) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const identifier = email || req.body.phone_number;
        const existingUser = await User.findByIdentifier(identifier);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Identifier already registered" });
        }

        // ROLE EXISTENCE LOGIC (Restriction for single high-level roles)
        const restrictedRoles = ['super_admin', 'mentor_head', 'academic_head', 'academic_operation_executive', 'ssc'];
        
        if (restrictedRoles.includes(targetRole)) {
            const [existingRole] = await db.query('SELECT id FROM users WHERE role = ?', [targetRole]);
            
            if (existingRole.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: `Registration Restricted: A ${targetRole.replace('_', ' ')} already exists in the system. Duplicates are not allowed for security reasons.`
                });
            }
        }

        const trimmedPassword = (password || req.body.phone_number || "123456").trim();
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

        // For initial setup: first Super Admin registration is automatically approved
        let status = 'pending';
        let isApproved = 0;
        let isActive = 0;

        // Force 'admin' to 'super_admin' if it somehow comes through
        let finalRole = (targetRole === 'admin') ? 'super_admin' : targetRole;

        const [anyAdmins] = await db.query('SELECT id FROM users WHERE role = "super_admin"');

        if (anyAdmins.length === 0 && finalRole === 'super_admin') {
            status = 'active';
            isApproved = 1;
            isActive = 1;
        } else if (finalRole === 'student') {
            status = 'active';
            isApproved = 1;
            isActive = 1;
        }

        const userPayload = {
            name,
            email: normalizedEmail,
            phone_number: req.body.phone_number ? req.body.phone_number.trim() : null,
            place: req.body.place || null,
            password: hashedPassword,
            role: finalRole,
            status,
            isApproved,
            isActive
        };

        // Add additional student fields if role is student
        if (finalRole === 'student') {
            const initialPaid = parseFloat(req.body.total_paid) || 0;
            Object.assign(userPayload, {
                grade: req.body.grade || null,
                subject: req.body.subject || null,
                course: req.body.course || null,
                hour: req.body.hour || null,
                total_fees: parseFloat(req.body.total_fees) || 0,
                total_paid: initialPaid,
                total_hours: parseInt(req.body.total_hours) || 0,
                admission_type: req.body.admission_type || 'new',
                current_installment_amount: initialPaid,
                current_installment_start_hours: 0,
                mentor_name: req.body.mentor_name || null,
                faculty_name: req.body.faculty_name || null,
                next_installment_date: req.body.next_installment_date || null,
                time_table: req.body.time_table ? JSON.stringify(req.body.time_table) : null,
                enrollment_type: req.body.enrollment_type || null,
                meeting_link: req.body.meeting_link || null,
                badge: req.body.enrollment_type === 'Mentorship' ? 'Gold' : 
                       req.body.enrollment_type === 'Tuition' ? 'Silver' : 
                       req.body.enrollment_type === 'Mentorship and Tuition' ? 'Diamond' : null
            });
        }

        const userId = await User.create(userPayload);

        // Add initial installment if payment was made during registration
        if (finalRole === 'student' && userPayload.total_paid > 0) {
            try {
                await db.query(
                    'INSERT INTO student_installments (student_id, amount, payment_date, notes) VALUES (?, ?, CURDATE(), ?)',
                    [userId, userPayload.total_paid, 'Initial Payment at Registration']
                );
            } catch (err) {
                console.error("Failed to add initial installment:", err);
            }
        }

        res.status(201).json({
            success: true,
            message: status === 'active'
                ? (finalRole === 'super_admin' ? "Super Admin created successfully." : `${finalRole.replace('_', ' ')} registered successfully.`)
                : `${finalRole.replace('_', ' ')} registration request submitted. Please wait for Admin approval.`,
            userId,
            role: finalRole,
            status
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// @desc    Check if Super Admin exists
// @route   GET /api/auth/check-super-admin
const checkSuperAdminExists = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id FROM users WHERE role = "admin" OR role = "super_admin" LIMIT 1');
        res.status(200).json({
            success: true,
            exists: rows.length > 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mentor Signup
// @route   POST /api/auth/signup/mentor
const mentorSignup = async (req, res) => {
    try {
        const { name, phone_number, place, password } = req.body;

        if (!name || !phone_number || !password) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const existingUser = await User.findByIdentifier(phone_number);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already registered" });
        }

        const trimmedPassword = password.trim();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

        const userId = await User.create({
            name,
            phone_number: phone_number.trim(),
            place,
            password: hashedPassword,
            role: 'mentor',
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: "Mentor account request submitted. Please wait for Admin approval.",
            userId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Faculty Signup
// @route   POST /api/auth/signup/faculty
const facultySignup = async (req, res) => {
    try {
        const { name, phone_number, place, password } = req.body;

        if (!name || !phone_number || !password) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const existingUser = await User.findByIdentifier(phone_number);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already registered" });
        }

        const trimmedPassword = password.trim();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

        const userId = await User.create({
            name,
            phone_number: phone_number.trim(),
            place,
            password: hashedPassword,
            role: 'faculty',
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: "Faculty account request submitted. Please wait for Admin approval.",
            userId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, phone_number, identifier: reqIdentifier, password, role: requestedRole, department } = req.body;
        const identifier = (reqIdentifier || email || phone_number)?.trim();

        if (!identifier || !password || !department || !requestedRole) {
            return res.status(400).json({ success: false, message: "All security protocols (Credentials, Department, Role) are required." });
        }

        // Try lookup with normalized identifier
        const normalizedIdentifier = identifier.includes('@') ? identifier.toLowerCase() : identifier;
        const user = await User.findByIdentifier(normalizedIdentifier);

        if (!user) {
            console.log(`[LOGIN FAILED] Identifier NOT FOUND: ${normalizedIdentifier}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const trimmedPassword = password.trim();
        const isMatch = await bcrypt.compare(trimmedPassword, user.password);

        if (!isMatch) {
            console.log(`[LOGIN FAILED] Password mismatch for: ${normalizedIdentifier}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Handle legacy 'aoe' role format
        const actualUserRole = user.role === 'aoe' ? 'academic_operation_executive' : user.role;

        // Strict Role Match Check
        if (actualUserRole !== requestedRole) {
            console.log(`[LOGIN REJECTED] Role Mismatch: User ${identifier} is ${user.role}, but tried to login as ${requestedRole}`);
            return res.status(403).json({ 
                success: false, 
                message: `Unauthorized: Your account is registered as ${actualUserRole.replace('_', ' ').toUpperCase()}, but you are attempting to login as ${requestedRole.replace('_', ' ').toUpperCase()}. Please select the correct role.` 
            });
        }

        // Department Hierarchy Validation (Safeguard)
        const dbRole = user.role.toLowerCase().replace('_', '');

        if (department === 'admin') {
            if (dbRole !== 'admin' && dbRole !== 'superadmin' && dbRole !== 'subadmin') {
                return res.status(403).json({ success: false, message: "Unauthorized: Only Admin personnel can login here." });
            }
        } else if (department === 'mentor_dept') {
            if (dbRole !== 'mentor' && dbRole !== 'mentorhead') {
                return res.status(403).json({ success: false, message: "Unauthorized: Only Mentor Department staff can login here." });
            }
        } else if (department === 'academic_dept') {
            if (dbRole !== 'faculty' && dbRole !== 'academichead' && dbRole !== 'ssc' && actualUserRole !== 'academic_operation_executive') {
                return res.status(403).json({ success: false, message: "Unauthorized: Only Academic Department staff can login here." });
            }
        } else if (department === 'student_dept') {
            if (dbRole !== 'student') {
                return res.status(403).json({ success: false, message: "Unauthorized: Only students can login here." });
            }
        }

        console.log(`[LOGIN SUCCESS] User: ${identifier} | Role: ${user.role}`);

        // Approval Check - must be first
        if (user.isApproved !== 1) {
            return res.status(403).json({ success: false, message: "Account pending Admin approval. Please contact support." });
        }

        // Status Check
        if (user.status === 'pending' || user.status === 'left') {
            return res.status(403).json({ success: false, message: "Account in 'Left' status or pending approval. Please contact Admin." });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, message: "Account application rejected." });
        }

        if (user.status !== 'active' || user.isActive === 0) {
            return res.status(403).json({ success: false, message: "Account is in 'Backup' or blocked state." });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // If it's a student login from the main website portal
        if (dbRole === 'student') {
            await db.query(
                'INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)',
                [`<b>Student Portal Login:</b> ${user.name} logged into the student dashboard.`, user.id, 'student_login']
            );
        }

        return res.status(200).json({
            success: true,
            token,
            role: user.role,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

const updateProfilePic = async (req, res) => {
    try {
        const { profile_pic } = req.body;
        const userId = req.user.id;

        if (!profile_pic) {
            return res.status(400).json({ success: false, message: "Profile picture URL is required" });
        }

        // Update in users table
        await db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [profile_pic, userId]);

        // Also check if user is a student and update students table if linked
        await db.query('UPDATE students SET profile_pic = ? WHERE user_id = ?', [profile_pic, userId]);

        res.status(200).json({ success: true, message: "Profile picture updated successfully", profile_pic });
    } catch (error) {
        console.error("Update Profile Pic Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new password are required" });
        }

        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "The current password you entered is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.status(200).json({ success: true, message: "Security credentials updated successfully" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email, phone_number, place } = req.body;
        const userId = req.user.id;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        // Update in users table
        await db.query(
            'UPDATE users SET name = ?, email = ?, phone_number = ?, place = ? WHERE id = ?',
            [name, email, phone_number, place, userId]
        );

        // Also update in students table if linked
        await db.query(
            'UPDATE students SET name = ?, email = ?, phone_number = ?, place = ? WHERE user_id = ?',
            [name, email, phone_number, place, userId]
        );

        res.status(200).json({ 
            success: true, 
            message: "Profile metadata updated successfully",
            user: { name, email, phone_number, place }
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.register = register;
exports.mentorSignup = mentorSignup;
exports.facultySignup = facultySignup;
exports.login = login;
exports.checkSuperAdminExists = checkSuperAdminExists;
exports.updateProfilePic = updateProfilePic;
exports.changePassword = changePassword;
exports.updateProfile = updateProfile;
