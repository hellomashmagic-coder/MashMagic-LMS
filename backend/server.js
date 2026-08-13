const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');

const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const deleteProtection = require('./middleware/deleteProtection');

// Middleware
app.use(deleteProtection);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/dev', require('./routes/devRoutes'));
app.use('/api/register', require('./routes/registrationRoutes'));
app.use('/api/mentor-head', require('./routes/mentorHeadRoutes'));
app.use('/api/recovery', require('./routes/recoveryRoutes'));
app.use('/api/mentor', require('./routes/mentorRoutes'));
app.use('/api/academic-head', require('./routes/academicHeadRoutes'));
app.use('/api/aoe', require('./routes/aoeRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/student', studentRoutes);
app.use('/api/mentor-logs', require('./routes/mentorLogRoutes'));
app.use('/api/faculty-tracking', require('./routes/facultyTrackingRoutes'));
app.use('/api/mentor-interactions', require('./routes/mentorInteractionRoutes'));
app.use('/api/ssc', require('./routes/sscRoutes'));

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to MashMagic Edu Tech API v2 - Permissions Fixed" });
});

app.post('/api/fix-demos-now', async (req, res) => {
    try {
        const [demos] = await pool.query('SELECT id, demo_id FROM aoe_demo_schedules ORDER BY created_at ASC');
        for (let i = 0; i < demos.length; i++) {
            const demoIdStr = `de${String(i + 1).padStart(2, '0')}`;
            await pool.query('UPDATE aoe_demo_schedules SET demo_id = ? WHERE id = ?', [demoIdStr, demos[i].id]);
        }
        res.status(200).json({ success: true, message: 'Fixed demo IDs' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Test Connection and Start Server
const PORT = process.env.PORT || 5000;

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

const syncStudentsOnStart = async () => {
    try {
        console.log('🔄 Synchronizing students with user approval status...');

        // 0. Auto-approve all pending students (bypassing student approval system)
        const [userApproveRes] = await pool.query(`
            UPDATE users 
            SET status = 'active', isApproved = 1, isActive = 1
            WHERE role = 'student' AND (status = 'pending' OR isApproved = 0)
        `);
        const [studentApproveRes] = await pool.query(`
            UPDATE students 
            SET status = 'active', isApproved = 1
            WHERE status = 'pending' OR isApproved = 0
        `);
        const [notifDeleteRes] = await pool.query(`
            DELETE FROM admin_notifications 
            WHERE action_type = 'student_registration'
        `);
        if (userApproveRes.affectedRows > 0 || studentApproveRes.affectedRows > 0) {
            console.log(`✅ Auto-approved ${userApproveRes.affectedRows} pending student users and ${studentApproveRes.affectedRows} student profiles on start.`);
            console.log(`✅ Cleared ${notifDeleteRes.affectedRows} student registration notifications.`);
        }

        // 1. Sync Approved Students
        // If a student's matching user is active/approved, set the student to active/approved
        const [approveResult] = await pool.query(`
            UPDATE students s
            JOIN users u ON (s.user_id = u.id OR (s.email IS NOT NULL AND s.email = u.email))
            SET s.status = 'active', s.isApproved = 1
            WHERE u.role = 'student' 
            AND (u.status = 'active' OR u.isApproved = 1)
            AND (s.status != 'active' OR s.isApproved = 0)
        `);
        if (approveResult.affectedRows > 0) {
            console.log(`✅ Automatically approved ${approveResult.affectedRows} students whose user accounts were already active/approved.`);
        }

        // Auto deletion of rejected students has been removed per user request

        // 3. Sync mentor_id in timetable with the current student's mentor_id
        const [timetableSyncRes] = await pool.query(`
            UPDATE timetable t
            JOIN students s ON t.student_id = s.id
            SET t.mentor_id = s.mentor_id
            WHERE t.mentor_id IS NULL OR t.mentor_id != s.mentor_id
        `);
        if (timetableSyncRes.affectedRows > 0) {
            console.log(`✅ Synchronized mentor_id for ${timetableSyncRes.affectedRows} sessions in timetable.`);
        }

        console.log('✅ Student synchronization and cleanup complete');
    } catch (err) {
        console.log('⚠️ Failed to sync students on startup:', err.message);
    }
};

const startServer = async () => {
    try {
        // Test database connection
        const [rows] = await pool.query('SELECT 1');
        console.log('✅ Database connected successfully');

        // Execute student synchronization and cleanup
        await syncStudentsOnStart();

        // Automatic DB Schema Expansion for live environments
        try {
            console.log('🔄 Checking database scheme for newly added features...');
            
            // Core Tables Creation
            const coreTables = [
                `CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    phone_number VARCHAR(50) UNIQUE,
                    place VARCHAR(255),
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    isApproved TINYINT(1) DEFAULT 0,
                    isActive TINYINT(1) DEFAULT 1,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE TABLE IF NOT EXISTS students (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone_number VARCHAR(50),
                    place VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'active',
                    isApproved TINYINT(1) DEFAULT 0,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE TABLE IF NOT EXISTS student_audit_status (
                    student_id INT PRIMARY KEY,
                    last_audited_at DATETIME NULL,
                    current_subject_index INT DEFAULT 0,
                    total_audits INT DEFAULT 0
                );`,
                `CREATE TABLE IF NOT EXISTS faculty_audit_status (
                    faculty_id INT PRIMARY KEY,
                    total_audits INT DEFAULT 0
                );`,
                `CREATE TABLE IF NOT EXISTS academic_quality_audits (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    date DATE NOT NULL,
                    student_id INT NOT NULL,
                    student_name VARCHAR(255) NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    faculty_id INT NOT NULL,
                    faculty_name VARCHAR(255) NOT NULL,
                    student_count INT DEFAULT 1,
                    faculty_count INT DEFAULT 1,
                    status VARCHAR(50) DEFAULT 'Pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE TABLE IF NOT EXISTS faculty_edit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    edited_by INT NOT NULL,
                    edited_by_name VARCHAR(255),
                    changes_summary TEXT NULL,
                    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`
            ];

            for (const tableQuery of coreTables) {
                await pool.query(tableQuery);
            }

            const migrations = [
                'ALTER TABLE users ADD COLUMN role VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT "pending";',
                'ALTER TABLE users ADD COLUMN isApproved TINYINT(1) DEFAULT 0;',
                'ALTER TABLE users ADD COLUMN isActive TINYINT(1) DEFAULT 1;',
                'ALTER TABLE users ADD COLUMN grade VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN subject VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN course VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN hour VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN mentor_name VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN faculty_name VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN secondary_subjects JSON NULL;',
                'ALTER TABLE users ADD COLUMN next_installment_date VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN time_table JSON NULL;',
                'ALTER TABLE users ADD COLUMN enrollment_type VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN badge VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL;',
                'ALTER TABLE users ADD COLUMN meeting_link VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN phone_number VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN registeredBy INT NULL;',
                'ALTER TABLE users ADD COLUMN faculty_id_card VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN section VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN syllabus VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN languages_proficiency JSON NULL;',
                'ALTER TABLE users ADD COLUMN qualification VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN experience VARCHAR(100) NULL;',
                'ALTER TABLE users ADD COLUMN availability VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN hourly_rate DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE users ADD COLUMN teaching_mode VARCHAR(50) NULL;',
                'ALTER TABLE users ADD COLUMN joining_date DATE NULL;',
                'ALTER TABLE users ADD COLUMN remarks TEXT NULL;',
                'ALTER TABLE users ADD COLUMN profile_pic TEXT NULL;',
                
                'ALTER TABLE students ADD COLUMN badge VARCHAR(50) NULL;',
                'ALTER TABLE students ADD COLUMN batch VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN enrollment_type VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN course_completed BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE students ADD COLUMN attendance_percentage DECIMAL(5,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN performance_status VARCHAR(50) DEFAULT "Green";',
                'ALTER TABLE students ADD COLUMN mentor_id INT NULL;',
                'ALTER TABLE students ADD COLUMN email VARCHAR(255) NULL;',
                'ALTER TABLE students ADD COLUMN password VARCHAR(255) NULL;',
                'ALTER TABLE students ADD COLUMN user_id INT NULL;',
                'ALTER TABLE students ADD COLUMN meeting_link VARCHAR(255) NULL;',
                'ALTER TABLE students ADD COLUMN isApproved TINYINT(1) DEFAULT 0;',
                'ALTER TABLE students ADD COLUMN registration_number VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN faculty_hourly_rate DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN subjects_json JSON NULL;',
                'ALTER TABLE students ADD COLUMN grade VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN syllabus VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN subject VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN course VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN hour VARCHAR(50) NULL;',
                'ALTER TABLE students ADD COLUMN mentor_name VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN faculty_id INT NULL;',
                'ALTER TABLE students ADD COLUMN faculty_name VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN onboarding_status VARCHAR(50) DEFAULT "pending";',
                'ALTER TABLE students ADD COLUMN next_installment_date VARCHAR(50) NULL;',
                'ALTER TABLE students ADD COLUMN time_table JSON NULL;',
                'ALTER TABLE students ADD COLUMN registeredBy INT NULL;',
                'ALTER TABLE students ADD COLUMN profile_pic TEXT NULL;',
                'ALTER TABLE students ADD COLUMN contact VARCHAR(50) NULL;',
                'ALTER TABLE students ADD COLUMN admission_date DATE NULL;',
                'ALTER TABLE students ADD COLUMN school_name VARCHAR(255) NULL;',
                'ALTER TABLE students ADD COLUMN preferred_language VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN country VARCHAR(100) NULL;',
                'ALTER TABLE students ADD COLUMN total_fees DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN total_paid DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN total_hours INT DEFAULT 0;',
                'ALTER TABLE students ADD COLUMN admission_type VARCHAR(50) DEFAULT "new";',
                'ALTER TABLE students ADD COLUMN current_installment_amount DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN current_installment_start_hours DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN rejoining_fee DECIMAL(10,2) DEFAULT 0.00;',
                'ALTER TABLE students ADD COLUMN assessment_level VARCHAR(50) DEFAULT "Unassessed";',
                'ALTER TABLE users ADD COLUMN place VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN registeredBy INT NULL;',
                'ALTER TABLE users ADD COLUMN profile_pic TEXT NULL;',
                
                'ALTER TABLE students ADD COLUMN priority_category ENUM("High", "Medium", "Stable") DEFAULT "Stable";',
                'ALTER TABLE students ADD COLUMN last_session_type ENUM("DEEP", "MEDIUM", "QUICK") NULL;',
                'ALTER TABLE students ADD COLUMN last_session_date DATE NULL;',
                'ALTER TABLE students ADD COLUMN performance_status ENUM("Excellent", "Good", "Average", "Critical") DEFAULT "Good";',
                'ALTER TABLE students ADD COLUMN course_completed TINYINT(1) DEFAULT 0;',
                'ALTER TABLE students ADD COLUMN mentorship_completed TINYINT(1) DEFAULT 0;',
                'ALTER TABLE students ADD COLUMN completion_remarks TEXT NULL;',
                'ALTER TABLE students ADD COLUMN completion_file TEXT NULL;',
                'ALTER TABLE students ADD COLUMN course_completed_date DATE NULL;',
                'ALTER TABLE faculty_schedules MODIFY COLUMN faculty_id INT NULL;',
                'ALTER TABLE faculty_schedules MODIFY COLUMN start_time VARCHAR(20) NULL;',
                'ALTER TABLE faculty_schedules MODIFY COLUMN end_time VARCHAR(20) NULL;',
                
                'ALTER TABLE student_exams ADD COLUMN chapter VARCHAR(255) NULL;',
                'ALTER TABLE users ADD COLUMN interaction_paused BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE users ADD COLUMN current_rotation_index INT DEFAULT 0;',
                'ALTER TABLE faculty_schedules ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE faculty_schedules ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE students ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE students ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE mentors ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE mentors ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE faculties ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE faculties ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE admin_notifications ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE admin_notifications ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE faculty_sessions ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE faculty_sessions ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE session_attendance ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE session_attendance ADD COLUMN deleted_at DATETIME NULL;',
                
                // Cleanup: remove emails from students that belong to a staff member
                'UPDATE students s INNER JOIN users u ON s.email = u.email SET s.email = NULL WHERE u.role != "student";',
                'ALTER TABLE mentors ADD COLUMN interaction_paused BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE mentors ADD COLUMN current_rotation_index INT DEFAULT 0;',
                'ALTER TABLE student_exams ADD COLUMN portions TEXT NULL;',
                'ALTER TABLE student_exams ADD COLUMN exam_type VARCHAR(100) NULL;',
                'ALTER TABLE student_exams ADD COLUMN scheduled_date DATE NULL;',
                'ALTER TABLE student_exams ADD COLUMN subject VARCHAR(255) NULL;',
                'ALTER TABLE student_exams ADD COLUMN exam_name VARCHAR(255) NULL;',
                'ALTER TABLE student_exams ADD COLUMN total_marks INT DEFAULT 100;',
                'ALTER TABLE student_exams ADD COLUMN added_by VARCHAR(255) NULL;',
                'ALTER TABLE student_marks ADD COLUMN chapter VARCHAR(255) NULL;',
                'ALTER TABLE student_marks ADD COLUMN publication VARCHAR(255) NULL;',
                'ALTER TABLE student_marks ADD COLUMN question_paper TEXT NULL;',
                'ALTER TABLE student_marks ADD COLUMN answer_sheet TEXT NULL;',

                // Reordering Columns for Students Table
                'ALTER TABLE students MODIFY COLUMN registration_number VARCHAR(100) AFTER id;',
                'ALTER TABLE students MODIFY COLUMN name VARCHAR(255) AFTER registration_number;',
                'ALTER TABLE students MODIFY COLUMN email VARCHAR(255) AFTER name;',
                'ALTER TABLE students MODIFY COLUMN password VARCHAR(255) AFTER email;',
                'ALTER TABLE students MODIFY COLUMN grade VARCHAR(100) AFTER password;',
                'ALTER TABLE students MODIFY COLUMN subject VARCHAR(100) AFTER grade;',
                'ALTER TABLE students MODIFY COLUMN course VARCHAR(100) AFTER subject;',
                'ALTER TABLE students MODIFY COLUMN mentor_id INT AFTER course;',
                'ALTER TABLE students MODIFY COLUMN mentor_name VARCHAR(100) AFTER mentor_id;',
                'ALTER TABLE students MODIFY COLUMN faculty_id INT AFTER mentor_name;',
                'ALTER TABLE students MODIFY COLUMN faculty_name VARCHAR(100) AFTER faculty_id;',
                
                // Move less important columns to the end
                'ALTER TABLE students MODIFY COLUMN roll_number VARCHAR(50) AFTER profile_pic;',

                `CREATE TABLE IF NOT EXISTS student_installments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    payment_date DATE NOT NULL,
                    notes TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );`,
                `CREATE TABLE IF NOT EXISTS daily_assignments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mentor_id INT NOT NULL,
                    date DATE NOT NULL,
                    assignments JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY (mentor_id, date)
                );`,

                `CREATE TABLE IF NOT EXISTS mentor_session_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mentor_id INT,
                    student_id INT,
                    session_type ENUM('DEEP', 'MEDIUM', 'QUICK'),
                    report_data JSON,
                    is_flagged TINYINT(1) DEFAULT 0,
                    flag_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mentor_id) REFERENCES users(id),
                    FOREIGN KEY (student_id) REFERENCES students(id)
                );`,
                
                `CREATE TABLE IF NOT EXISTS mentor_session_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    date DATE NOT NULL,
                    connection_method ENUM('WhatsApp Chat', 'Voice Note', 'Voice Call', 'Video Call') NOT NULL,
                    session_start_time DATETIME NOT NULL,
                    session_end_time DATETIME NOT NULL,
                    session_duration_minutes INT NULL,
                    focus_level INT,
                    energy_level ENUM('Low', 'Normal', 'High'),
                    stress_level ENUM('Low', 'Medium', 'High'),
                    homework_status ENUM('Completed', 'Partial', 'Not Done'),
                    revision_done BOOLEAN,
                    doubts_present BOOLEAN,
                    main_issue ENUM('No Issue', 'Low Focus', 'Distraction', 'Procrastination', 'Homework Pending', 'Concept Difficulty', 'Low Motivation'),
                    secondary_issue VARCHAR(255),
                    weak_subject VARCHAR(100),
                    problem_clarity ENUM('Clear', 'Partial', 'Not Clear'),
                    action_type ENUM('Complete Homework', 'Revise Topic', 'Start on Time', 'Reduce Distraction', 'Practice Questions', 'Doubt Clarification'),
                    action_detail TEXT,
                    action_specific BOOLEAN,
                    student_engagement ENUM('High', 'Medium', 'Low'),
                    understanding_after_session ENUM('Improved', 'Same', 'Not Improved'),
                    previous_task_status ENUM('Completed', 'Not Completed', 'Not Checked'),
                    followup_required BOOLEAN,
                    followup_date DATE,
                    student_status ENUM('Critical', 'Needs Attention', 'On Track'),
                    session_quality_rating INT,
                    interaction_files JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS student_interaction_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mentor_id INT,
                    student_id INT,
                    date DATE,
                    session_number INT,
                    connection_method VARCHAR(50),
                    self_clarity INT,
                    confusing_topic TEXT,
                    can_solve_independently VARCHAR(20),
                    homework_status VARCHAR(50),
                    homework_difficulty VARCHAR(50),
                    revision_quality VARCHAR(50),
                    confidence INT,
                    motivation_level INT,
                    exam_anxiety INT,
                    focus_level INT,
                    student_requests TEXT,
                    parent_update_priority VARCHAR(20),
                    mentor_action_needed TEXT,
                    mentor_notes TEXT,
                    connected_today TINYINT(1) DEFAULT 1,
                    screenshot_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mentor_id) REFERENCES users(id),
                    FOREIGN KEY (student_id) REFERENCES students(id)
                );`,

                'ALTER TABLE mentor_session_logs ADD COLUMN session_duration_minutes INT NULL;',

                `CREATE TABLE IF NOT EXISTS student_daily_updates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    data_content TEXT,
                    registration_date DATE,
                    registration_time TIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS timetable_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    timetable_id INT NOT NULL,
                    faculty_id INT NOT NULL,
                    student_id INT NOT NULL,
                    date DATE,
                    start_time VARCHAR(50),
                    end_time VARCHAR(50),
                    subject VARCHAR(100),
                    topic TEXT,
                    homework_given BOOLEAN DEFAULT FALSE,
                    remarks TEXT,
                    is_late BOOLEAN DEFAULT FALSE,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS faculty_class_updates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    faculty_id INT NOT NULL,
                    subject VARCHAR(100),
                    date DATE,
                    class_duration VARCHAR(50),
                    topic_taught TEXT,
                    homework_given BOOLEAN,
                    homework_details TEXT,
                    attention_level ENUM('High', 'Medium', 'Low'),
                    participation_level ENUM('Active', 'Moderate', 'Passive'),
                    understanding_level ENUM('Good', 'Average', 'Poor'),
                    issue_flag BOOLEAN DEFAULT FALSE,
                    issue_type ENUM('Concept difficulty', 'Not attentive', 'Homework not done', 'Slow learning', 'Behaviour issue'),
                    faculty_files JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS mentor_reviews (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_log_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    todays_observation ENUM('Normal', 'Needs Attention', 'Issue Detected'),
                    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY (faculty_log_id)
                );`,

                `CREATE TABLE IF NOT EXISTS mentor_faculty_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_log_id INT NOT NULL,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    subject VARCHAR(100),
                    faculty_name VARCHAR(100),
                    date DATE,
                    connection_method ENUM('Call', 'WhatsApp'),
                    main_issue TEXT,
                    issue_details TEXT,
                    teacher_feedback TEXT,
                    root_cause ENUM('Concept gap', 'Carelessness', 'Lack of practice', 'Distraction'),
                    action_plan TEXT,
                    responsibility ENUM('Student', 'Mentor', 'Faculty', 'Parent'),
                    followup_required BOOLEAN,
                    followup_date DATE,
                    issue_understood ENUM('Yes', 'Partial', 'No'),
                    interaction_quality_rating INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS admin_notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    message TEXT NOT NULL,
                    related_id INT NULL,
                    action_type VARCHAR(100) NULL,
                    is_read TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                
                `CREATE TABLE IF NOT EXISTS faculty_change_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    subject VARCHAR(100),
                    old_faculty_id INT,
                    old_faculty_name VARCHAR(255),
                    new_faculty_id INT,
                    new_faculty_name VARCHAR(255),
                    changed_by_id INT,
                    changed_by_name VARCHAR(255),
                    changed_by_role VARCHAR(50),
                    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id)
                );`,

                'ALTER TABLE mentor_session_reports ADD COLUMN is_flagged TINYINT(1) DEFAULT 0;',
                'ALTER TABLE mentor_session_reports ADD COLUMN flag_reason TEXT;',

                `CREATE TABLE IF NOT EXISTS mentorship_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    mentor_id INT,
                    action_details TEXT,
                    focus_rating INT,
                    homework_status VARCHAR(50),
                    priority VARCHAR(20),
                    main_issue TEXT,
                    consistency_rating INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (mentor_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS faculty_interaction_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT,
                    student_id INT,
                    mentor_id INT,
                    date DATE,
                    notes TEXT,
                    session_number INT,
                    parent_update_needed TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS faculty_schedules (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    student_id INT NOT NULL,
                    subject VARCHAR(100),
                    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
                    start_time VARCHAR(20),
                    end_time VARCHAR(20),
                    hourly_rate DECIMAL(10,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action VARCHAR(255) NOT NULL,
                    entity VARCHAR(100) DEFAULT 'timetable',
                    entity_id INT NULL,
                    user_id INT NULL,
                    user_role VARCHAR(50) NULL,
                    old_data JSON NULL,
                    new_data JSON NULL,
                    details TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,


                `CREATE TABLE IF NOT EXISTS faculty_timetable (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    subject VARCHAR(100) NOT NULL,
                    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
                    start_time VARCHAR(20) NOT NULL,
                    end_time VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS student_marks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    faculty_id INT,
                    subject VARCHAR(100),
                    term VARCHAR(50),
                    marks DECIMAL(5,2),
                    total DECIMAL(5,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id)
                );`,

                `CREATE TABLE IF NOT EXISTS student_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    faculty_id INT NOT NULL,
                    report_text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (faculty_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS mentor_session_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    main_issue VARCHAR(255),
                    action_type VARCHAR(100),
                    understanding_after_session INT,
                    session_quality_rating INT,
                    stress_level INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (mentor_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS mentorship_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    action_details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (mentor_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS mentor_faculty_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    main_issue TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (mentor_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS faculty_interaction_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    notes TEXT,
                    date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (mentor_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS ah_parent_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    date DATE NOT NULL,
                    interaction_data JSON,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (academic_head_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS ah_faculty_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    date DATE NOT NULL,
                    interaction_data JSON,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id),
                    FOREIGN KEY (academic_head_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS ah_faculty_rotation (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    rotation_date DATE NOT NULL,
                    status ENUM('Pending', 'Called', 'Missed') DEFAULT 'Pending',
                    next_call_date DATE,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS ah_parent_meetings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    meeting_date DATE NOT NULL,
                    meeting_time VARCHAR(20) NOT NULL,
                    status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
                    meeting_link VARCHAR(255),
                    report_data JSON,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (academic_head_id) REFERENCES users(id)
                );`,

                `CREATE TABLE IF NOT EXISTS student_exams (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    mentor_id INT NOT NULL,
                    milestone_session INT NOT NULL,
                    score VARCHAR(50) DEFAULT NULL,
                    status ENUM('Pending', 'Completed', 'Postponed') DEFAULT 'Pending',
                    postponed_date DATE DEFAULT NULL,
                    reason TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_exam (student_id, milestone_session)
                );`,

                `CREATE TABLE IF NOT EXISTS ah_faculty_quality (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    class_topic VARCHAR(255),
                    score INT NOT NULL,
                    remarks TEXT,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS ah_faculty_replacements (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    reason TEXT NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS ah_faculty_rotation (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    academic_head_id INT NOT NULL,
                    rotation_date DATE NOT NULL,
                    status ENUM('Pending', 'Called', 'Missed') DEFAULT 'Pending',
                    next_call_date DATE,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS ah_escalations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    academic_head_id INT NOT NULL,
                    issue_type VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_head_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS aoe_demo_schedules (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    aoe_id INT NOT NULL,
                    demo_id VARCHAR(50) NULL,
                    student_name VARCHAR(255) NOT NULL,
                    student_type ENUM('new', 'existing') DEFAULT 'new',
                    subject VARCHAR(255) NOT NULL,
                    faculty_id INT NOT NULL,
                    start_time VARCHAR(50) NOT NULL,
                    end_time VARCHAR(50) NOT NULL,
                    hour_rate DECIMAL(10,2) DEFAULT 0.00,
                    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
                    prep_score INT DEFAULT 0,
                    comm_score INT DEFAULT 0,
                    concept_score INT DEFAULT 0,
                    engage_score INT DEFAULT 0,
                    parent_score INT DEFAULT 0,
                    total_score INT DEFAULT 0,
                    is_successful TINYINT(1) DEFAULT 0,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (aoe_id) REFERENCES users(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS fee_structures (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(50) NOT NULL,
                    total_fee DECIMAL(10,2) NOT NULL,
                    total_hours INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,

                `CREATE TABLE IF NOT EXISTS fee_installments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fee_structure_id INT NOT NULL,
                    installment_number INT NOT NULL,
                    installment_date DATE NOT NULL,
                    installment_amount DECIMAL(10,2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS student_subjects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    subject_name VARCHAR(255) NOT NULL,
                    allocated_hours DECIMAL(10,2) DEFAULT 0.00,
                    historical_consumed_hours DECIMAL(10,2) DEFAULT 0.00,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );`,

                `CREATE TABLE IF NOT EXISTS student_growth_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    report_data JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );`,

                // MentorHead Assessment tracking
                'ALTER TABLE students ADD COLUMN assessment_score INT NULL;',
                'ALTER TABLE students ADD COLUMN assessment_history JSON NULL;',

                // Add new columns to aoe_demo_schedules
                'ALTER TABLE aoe_demo_schedules ADD COLUMN demo_id VARCHAR(50) NULL;',
                'ALTER TABLE aoe_demo_schedules ADD COLUMN syllabus VARCHAR(255) NULL;',
                'ALTER TABLE aoe_demo_schedules ADD COLUMN section VARCHAR(255) NULL;',
                'ALTER TABLE aoe_demo_schedules ADD COLUMN is_successful TINYINT(1) DEFAULT 0;',
                'CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);',
                'CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);',
                'CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students(mentor_id);',
                'CREATE INDEX IF NOT EXISTS idx_students_faculty_id ON students(faculty_id);',
                'CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);',

                'RENAME TABLE mentor_timetable TO timetable;',
                'ALTER TABLE timetable ADD COLUMN faculty_id INT NULL;',
                'ALTER TABLE timetable ADD COLUMN faculty_name VARCHAR(255) NULL;',
                'ALTER TABLE timetable ADD COLUMN subject VARCHAR(100) NULL;',
                'ALTER TABLE timetable ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
                'ALTER TABLE timetable ADD COLUMN deleted_at DATETIME NULL;',
                'ALTER TABLE timetable ADD COLUMN session_mode VARCHAR(50) DEFAULT "Online";',
                'ALTER TABLE faculty_sessions ADD COLUMN timetable_id INT NULL;',
                'ALTER TABLE faculty_sessions ADD COLUMN minutes_taken INT NULL;',
                'ALTER TABLE faculty_sessions ADD COLUMN minutes_locked TINYINT(1) DEFAULT 0;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_1 TINYINT(1) DEFAULT 0;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_1_remark TEXT NULL;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_2 TINYINT(1) DEFAULT 0;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_2_remark TEXT NULL;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_3 TINYINT(1) DEFAULT 0;',
                'ALTER TABLE faculty_sessions ADD COLUMN reminder_3_remark TEXT NULL;',
                'ALTER TABLE faculty_sessions MODIFY COLUMN status VARCHAR(50) DEFAULT \'Scheduled\';',
                'ALTER TABLE timetable MODIFY COLUMN status VARCHAR(50) DEFAULT \'Scheduled\';',
                'ALTER TABLE faculty_sessions ADD COLUMN cancel_note TEXT NULL;',
                'ALTER TABLE timetable ADD COLUMN cancel_note TEXT NULL;'
            ];
            for (const migration of migrations) {
                try {
                    await pool.query(migration);
                    // console.log(`✅ Applied migration: ${migration.split(' ')[4] || 'Table Creation'}`);
                } catch (err) {
                    // Ignore duplicate column errors
                    if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEY' && err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                        // console.log(`ℹ️ Migration info: ${err.message}`);
                    }
                }
            }

            // Dynamically drop invalid foreign key on timetable.faculty_id if it exists referencing users
            try {
                const [fks] = await pool.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('timetable', 'aoe_demo_schedules') AND COLUMN_NAME = 'faculty_id' AND REFERENCED_TABLE_NAME = 'users'
                `, [process.env.DB_NAME || 'mashmagic']);
                for (const fk of fks) {
                    await pool.query(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                    console.log(`✅ Dynamically dropped invalid foreign key constraint: ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
                }
            } catch (fkErr) {
                console.log('ℹ️ Dynamic FK drop info:', fkErr.message);
            }

            // Fallback: Try dropping common constraint names directly to be 100% sure
            const commonFks = ['timetable_ibfk_1', 'timetable_ibfk_2', 'timetable_ibfk_3', 'timetable_ibfk_4'];
            for (const fk of commonFks) {
                try {
                    await pool.query(`ALTER TABLE timetable DROP FOREIGN KEY ${fk}`);
                    console.log(`✅ Dropped foreign key constraint by name: ${fk}`);
                } catch (e) {
                    // Ignore if constraint does not exist
                }
            }

            // Fallback for aoe_demo_schedules
            try {
                await pool.query(`ALTER TABLE aoe_demo_schedules DROP FOREIGN KEY aoe_demo_schedules_ibfk_2`);
                console.log(`✅ Dropped foreign key constraint by name: aoe_demo_schedules_ibfk_2`);
            } catch (e) {
                // Ignore if constraint does not exist
            }

            console.log('✅ Database schema is up to date');
        } catch (migErr) {
            console.log('Migration check suppressed:', migErr.message);
        }

        // Start Integrity Checker Cron Job
        const cron = require('node-cron');
        const { runIntegrityCheck } = require('./cron/integrity_checker');
        
        // Run immediately on startup
        runIntegrityCheck();
        
        // Schedule to run every day at midnight (00:00)
        cron.schedule('0 0 * * *', () => {
            runIntegrityCheck();
        });

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
};

startServer();
