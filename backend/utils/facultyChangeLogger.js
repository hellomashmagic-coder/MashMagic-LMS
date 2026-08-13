const db = require('../config/db');

/**
 * Compares old and new faculty schedules for a student and logs any changes to faculty_change_history.
 * @param {number} studentId - The ID of the student.
 * @param {Array} newSubjects - The new subjects array (finalSubjects).
 * @param {Object} user - The user object making the change (req.user).
 */
const logFacultyChanges = async (studentId, newSubjects, user) => {
    try {
        if (!user || !user.id || !user.role) return;

        // Fetch current active schedules
        const [currentSchedules] = await db.query(
            `SELECT subject, faculty_id, u.name as faculty_name 
             FROM faculty_schedules fs 
             LEFT JOIN faculties u ON fs.faculty_id = u.id 
             WHERE fs.student_id = ? AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)`,
            [studentId]
        );

        // Group current by subject
        const currentBySubject = {};
        for (const sch of currentSchedules) {
            // Subject could be comma separated if multiple, but usually we compare by primary subject
            const subStr = sch.subject || 'Unspecified';
            if (!currentBySubject[subStr]) {
                currentBySubject[subStr] = { id: sch.faculty_id, name: sch.faculty_name };
            }
        }

        // Group new by subject
        const newBySubject = {};
        if (newSubjects && Array.isArray(newSubjects)) {
            for (const sub of newSubjects) {
                const subjectStr = Array.isArray(sub.subject) 
                    ? (sub.subject.length > 0 ? sub.subject.join(', ') : 'Unspecified') 
                    : (sub.subject || 'Unspecified');
                
                if (!newBySubject[subjectStr]) {
                    newBySubject[subjectStr] = { id: sub.facultyId, name: sub.facultyName };
                }
            }
        }

        const changesToLog = [];

        // Check for modified or new subjects
        for (const [subject, newFac] of Object.entries(newBySubject)) {
            const oldFac = currentBySubject[subject];
            
            // If the faculty ID changed or it's a new assignment with a faculty
            if (newFac.id) {
                if (!oldFac || oldFac.id != newFac.id) {
                    changesToLog.push([
                        studentId,
                        subject,
                        oldFac ? oldFac.id : null,
                        oldFac ? oldFac.name : null,
                        newFac.id,
                        newFac.name,
                        user.id,
                        user.name || 'Admin',
                        user.role
                    ]);
                }
            }
        }

        // We can also check if a subject was completely removed, but usually we only track when a faculty is assigned or changed.
        // For now, tracking assignment/changes is sufficient.

        if (changesToLog.length > 0) {
            const query = `
                INSERT INTO faculty_change_history 
                (student_id, subject, old_faculty_id, old_faculty_name, new_faculty_id, new_faculty_name, changed_by_id, changed_by_name, changed_by_role)
                VALUES ?
            `;
            await db.query(query, [changesToLog]);
        }
    } catch (error) {
        console.error("LOG_FACULTY_CHANGE_ERROR:", error);
    }
};

module.exports = { logFacultyChanges };
