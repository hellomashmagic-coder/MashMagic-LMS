const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

router.get('/run-audit', async (req, res) => {
    try {
        console.log("Starting DB Audit via API...");
        const [students] = await db.query('SELECT * FROM students');
        
        let report = {
            total_students_scanned: students.length,
            fields_analysis: {},
            students_missing_data: []
        };

        const checkFields = [
            'name', 'email', 'phone_number', 'place', 'grade', 
            'course', 'mentor_id', 'faculty_name', 'subjects_json', 
            'onboarding_status', 'status', 'isApproved'
        ];

        checkFields.forEach(f => report.fields_analysis[f] = { present: 0, missing: 0 });

        students.forEach(s => {
            let missingForThisStudent = [];
            checkFields.forEach(f => {
                if (s[f] === null || s[f] === '' || s[f] === undefined || s[f] === '[]' || s[f] === '{}') {
                    report.fields_analysis[f].missing++;
                    missingForThisStudent.push(f);
                } else {
                    report.fields_analysis[f].present++;
                }
            });

            if (missingForThisStudent.length > 0) {
                report.students_missing_data.push({
                    student_id: s.id,
                    student_name: s.name,
                    missing_fields: missingForThisStudent
                });
            }
        });

        // Orphan check
        const [timetables] = await db.query('SELECT id FROM timetable WHERE student_id NOT IN (SELECT id FROM students)');
        report.orphaned_timetables = timetables.map(t => t.id);

        const reportPath = path.join(__dirname, '../../student_audit_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        res.json({ success: true, message: "Audit complete", data: report });
    } catch (error) {
        console.error("Audit error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
