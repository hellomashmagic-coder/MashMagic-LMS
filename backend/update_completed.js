require('dotenv').config({path: './backend/.env'});
const db = require('./config/db');

async function fixCompleted() {
    try {
        console.log("Checking for students who should be marked as completed...");
        // 1. Get all students who are not completed
        const [students] = await db.query('SELECT id, course FROM students WHERE course_completed = 0 AND is_deleted = 0');
        
        let completedCount = 0;
        
        for (const student of students) {
            // Get course total hours
            const [courseRows] = await db.query('SELECT total_hours FROM courses WHERE name = ?', [student.course]);
            if (courseRows.length === 0) continue;
            const totalHours = courseRows[0].total_hours;
            
            // Get consumed minutes from faculty_sessions
            const [sessions] = await db.query(`
                SELECT fs.minutes_taken
                FROM faculty_sessions fs
                LEFT JOIN session_attendance sa ON fs.id = sa.session_id
                LEFT JOIN timetable t ON fs.timetable_id = t.id
                WHERE (sa.student_id = ? OR t.student_id = ?)
                AND (fs.is_deleted IS NULL OR fs.is_deleted = 0)
                AND fs.status = 'Completed'
            `, [student.id, student.id]);
            
            let totalMinutes = 0;
            sessions.forEach(s => totalMinutes += (s.minutes_taken || 0));
            const consumedHours = totalMinutes / 60;
            
            if (consumedHours >= totalHours && totalHours > 0) {
                console.log(`Student ${student.id} (${student.course}): Consumed ${consumedHours}h >= Total ${totalHours}h. Marking completed.`);
                await db.query('UPDATE students SET course_completed = 1, course_completed_date = CURDATE() WHERE id = ?', [student.id]);
                completedCount++;
            }
        }
        
        console.log(`Finished. Marked ${completedCount} students as completed.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}

fixCompleted();
