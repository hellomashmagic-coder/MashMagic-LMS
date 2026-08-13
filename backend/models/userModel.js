const db = require('../config/db');

const User = {
    // Find user by email or phone number across all relevant tables
    findByIdentifier: async (identifier) => {
        // Check users table (Admins)
        let [rows] = await db.query(
            'SELECT * FROM users WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );
        if (rows.length > 0) return rows[0];

        // Check mentors table
        [rows] = await db.query(
            'SELECT * FROM mentors WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );
        if (rows.length > 0) return rows[0];

        // Check faculties table
        [rows] = await db.query(
            'SELECT * FROM faculties WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );
        if (rows.length > 0) return rows[0];

        // Check students table
        [rows] = await db.query(
            'SELECT * FROM students WHERE email = ? OR phone_number = ?',
            [identifier, identifier]
        );
        if (rows.length > 0) return { ...rows[0], role: 'student' }; // Ensure role is 'student'

        return null;
    },

    // Create a new user in the appropriate table
    create: async (userData) => {
        const {
            name, phone_number = null, place = null, email = null,
            password, role = 'user', status = 'pending',
            registeredBy = null, isApproved = 0, enrollment_type = null, badge = null
        } = userData;

        // Determine target table
        let targetTable = 'users';

        const subjectsList = [userData.primary_subject, ...(userData.secondary_subjects || [])].filter(Boolean);
        const subjectValue = subjectsList.length > 0 ? subjectsList.join(',') : ((userData.subjects && Array.isArray(userData.subjects)) ? userData.subjects.join(',') : (userData.subject || null));
        const syllabusValue = Array.isArray(userData.syllabus) ? userData.syllabus.join(',') : (userData.syllabus || null);
        const hourlyRateValue = Array.isArray(userData.hourly_rates) ? userData.hourly_rates.join(',') : (userData.hourly_rate || 0);

        let columns = `name, phone_number, place, email, password, role, status, isApproved, isActive`;
        let values = `?, ?, ?, ?, ?, ?, ?, ?, ?`;
        let paramsArray = [
            name, phone_number, place, email, password, role, status, isApproved, status === 'active' ? 1 : 1
        ];

        if (registeredBy) {
            columns += `, createdBy`;
            values += `, ?`;
            paramsArray.push(registeredBy);
        }

        // For all roles, we append the extra columns since they are in the users table
        columns += `, grade, subject, course, hour, mentor_name, faculty_name, next_installment_date, 
            time_table, enrollment_type, badge, meeting_link, 
            faculty_id_card, section, syllabus, languages_proficiency, qualification, 
            experience, availability, hourly_rate, teaching_mode, joining_date, remarks`;
        values += `, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`;
        paramsArray.push(
            userData.grade || null, subjectValue, userData.course || null, userData.hour || null, userData.mentor_name || null, userData.faculty_name || null, userData.next_installment_date || null, userData.time_table || null,
            enrollment_type, badge, userData.meeting_link || null,
            userData.faculty_id_card || null, userData.section || null, syllabusValue, 
            userData.languages_proficiency ? JSON.stringify(userData.languages_proficiency) : null,
            userData.qualification || null, userData.experience || null, userData.availability || null,
            hourlyRateValue, userData.teaching_mode || null, userData.joining_date || null, userData.remarks || null
        );

        if (role === 'student') {
            columns += `, total_fees, total_paid, total_hours, admission_type, current_installment_amount, current_installment_start_hours`;
            values += `, ?, ?, ?, ?, ?, ?`;
            paramsArray.push(
                userData.total_fees || 0,
                userData.total_paid || 0,
                userData.total_hours || 0,
                userData.admission_type || 'new',
                userData.current_installment_amount || 0,
                userData.current_installment_start_hours || 0
            );
        }

        const [result] = await db.query(
            `INSERT INTO ${targetTable} (${columns}) VALUES (${values})`,
            paramsArray
        );
        const newId = result.insertId;

        // Also insert into the specific role tables to maintain data integrity
        if (role === 'faculty') {
            try {
                await db.query(
                    'INSERT INTO faculties (id, name, email, phone_number, status, subject) VALUES (?, ?, ?, ?, ?, ?)',
                    [newId, name, email || null, phone_number || null, status, subjectValue]
                );
            } catch (err) { console.error("Faculty Insert Sync Error:", err); }
        } else if (role === 'mentor') {
            try {
                await db.query(
                    'INSERT INTO mentors (id, name, email, phone_number, status) VALUES (?, ?, ?, ?, ?)',
                    [newId, name, email || null, phone_number || null, status]
                );
            } catch (err) { console.error("Mentor Insert Sync Error:", err); }
        } else if (role === 'student') {
            try {
                await db.query(`
                    INSERT INTO students (
                        id, user_id, name, email, password, contact, grade, course, 
                        admission_type, total_fees, total_paid, total_hours, 
                        current_installment_amount, current_installment_start_hours,
                        status, isApproved, priority_category, enrollment_type, badge, subjects_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Stable", ?, ?, ?)
                `, [
                    newId, newId, name, email || null, password, phone_number || null, userData.grade || null, userData.course || null,
                    userData.admission_type || 'new', userData.total_fees || 0, userData.total_paid || 0, userData.total_hours || 0,
                    userData.current_installment_amount || 0, userData.current_installment_start_hours || 0,
                    status, isApproved, enrollment_type, badge,
                    userData.subjects ? JSON.stringify(userData.subjects) : null
                ]);
            } catch (err) { console.error("Student Insert Sync Error:", err); }
        }

        return newId;
    },

    // Find user by ID across all relevant tables
    findById: async (id) => {
        let [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length > 0) return rows[0];

        [rows] = await db.query('SELECT * FROM mentors WHERE id = ?', [id]);
        if (rows.length > 0) return rows[0];

        [rows] = await db.query('SELECT * FROM faculties WHERE id = ?', [id]);
        if (rows.length > 0) return rows[0];

        [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
        if (rows.length > 0) return { ...rows[0], role: 'student' };

        return null;
    }
};

module.exports = User;
