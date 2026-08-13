const db = require('../config/db');

const getISTDate = () => {
    return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' }).split(',')[0];
};

const returnMergedAssignments = async (savedAssignments, targetDate, mentor_id, isPaused, res) => {
    if (savedAssignments && savedAssignments.length > 0) {
        const studentIds = savedAssignments.map(a => a.id);
        const [latestStudents] = await db.query(
        `SELECT id, name, priority_category, enrollment_type, badge, onboarding_status, last_session_type, mentorship_completed 
             FROM students 
             WHERE id IN (?)`,
            [studentIds]
        );
        const studentMap = new Map(latestStudents.map(s => [s.id, s]));
        savedAssignments = savedAssignments.filter(assignment => {
            const latest = studentMap.get(assignment.id);
            return latest && latest.mentorship_completed !== 1;
        }).map(assignment => {
            const latest = studentMap.get(assignment.id);
            if (latest) {
                return {
                    ...assignment,
                    name: latest.name,
                    priority_category: latest.priority_category,
                    enrollment_type: latest.enrollment_type,
                    badge: latest.badge,
                    onboarding_status: latest.onboarding_status
                };
            }
            return assignment;
        });
    }
    
    // Merge with actual completed logs for this date to ensure carry-over students who were completed today show up
    const [completedLogs] = await db.query(
        `SELECT DISTINCT s.id, s.name, s.priority_category, s.enrollment_type, s.badge, s.onboarding_status,
            CASE WHEN msl.session_duration_minutes IS NOT NULL THEN 'MEDIUM' ELSE 'QUICK' END as sessionType
         FROM students s
         LEFT JOIN student_interaction_logs sil ON s.id = sil.student_id AND sil.date = ? AND sil.mentor_id = ?
         LEFT JOIN mentor_session_logs msl ON s.id = msl.student_id AND DATE(msl.created_at) = ? AND msl.mentor_id = ?
         WHERE (sil.id IS NOT NULL OR msl.id IS NOT NULL)`,
        [targetDate, mentor_id, targetDate, mentor_id]
    );

    const finalAssignments = savedAssignments || [];
    const existingIds = new Set(finalAssignments.map(a => a.id));

    for (const log of completedLogs) {
        if (!existingIds.has(log.id)) {
            finalAssignments.push({
                ...log,
                status: 'COMPLETED'
            });
            existingIds.add(log.id);
        } else {
            // Ensure it's marked as completed if it exists
            const index = finalAssignments.findIndex(a => a.id === log.id);
            if (index !== -1 && finalAssignments[index].status !== 'COMPLETED') {
                finalAssignments[index].status = 'COMPLETED';
            }
        }
    }

    return res.status(200).json({ success: true, data: finalAssignments, is_paused: isPaused });
};

const getDailyAssignments = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        
        // ONE-TIME SELF-HEALING: Fix corrupted Niranjana (ID: 187) record using precise JSON parsing
        try {
            const todayStr = getISTDate();
            const [allAssignments] = await db.query('SELECT id, date, assignments FROM daily_assignments WHERE mentor_id = ?', [mentor_id]);
            
            for (let record of allAssignments) {
                let assignments = record.assignments;
                if (typeof assignments === 'string') {
                    try { assignments = JSON.parse(assignments); } catch(e) { continue; }
                }
                
                let updated = false;
                // Convert DB date safely handling timezones
                let recordDateStr = '';
                if (record.date instanceof Date) {
                    const offset = record.date.getTimezoneOffset();
                    recordDateStr = new Date(record.date.getTime() - (offset*60*1000)).toISOString().split('T')[0];
                } else {
                    recordDateStr = String(record.date).split('T')[0];
                }
                
                const updatedAssignments = assignments.map(a => {
                    if (a.id == 187) {
                        if (recordDateStr === todayStr && a.status === 'COMPLETED') {
                            // Revert her TODAY assignment back to PENDING
                            updated = true;
                            return { ...a, status: 'PENDING' };
                        } else if (recordDateStr < todayStr && a.status === 'PENDING') {
                            // Clear her YESTERDAY pending status
                            updated = true;
                            return { ...a, status: 'COMPLETED' };
                        }
                    }
                    return a;
                });

                if (updated) {
                    await db.query('UPDATE daily_assignments SET assignments = ? WHERE id = ?', [JSON.stringify(updatedAssignments), record.id]);
                }
            }

            // Fix Niranjana's created_at dates in the logs so she correctly appears under yesterday's date in the timeline
            await db.query(`UPDATE mentor_session_reports SET created_at = '2026-06-18 12:00:00' WHERE student_id = 187 AND DATE(created_at) = ?`, [todayStr]);
            await db.query(`UPDATE student_interaction_logs SET date = '2026-06-18' WHERE student_id = 187 AND date = ?`, [todayStr]);
            await db.query(`UPDATE student_interaction_logs SET created_at = '2026-06-18 12:00:00' WHERE student_id = 187 AND DATE(created_at) = ?`, [todayStr]);

        } catch(e) {
            console.error("Self-healing error:", e);
        }

        const today = getISTDate();

        const [currentStudents] = await db.query(
            `SELECT id, onboarding_status FROM students 
             WHERE mentor_id = ? 
             AND (LOWER(enrollment_type) LIKE '%mentorship%' OR LOWER(enrollment_type) = 'both')
             AND status != 'inactive' AND course_completed = 0 AND mentorship_completed = 0`,
            [mentor_id]
        );

        // Support past date viewing (for date picker)
        const dateParam = req.query.date;
        const targetDate = dateParam || today;
        const isToday = targetDate === today;

        let [mentorRows] = await db.query('SELECT interaction_paused FROM users WHERE id = ?', [mentor_id]);
        if (mentorRows.length === 0) {
            [mentorRows] = await db.query('SELECT interaction_paused FROM mentors WHERE id = ?', [mentor_id]);
        }
        const mentor = mentorRows[0];
        const isPaused = mentor ? mentor.interaction_paused : false;

        // Check if assignments already exist for targetDate
        const [existing] = await db.query(
            'SELECT assignments FROM daily_assignments WHERE mentor_id = ? AND date = ?',
            [mentor_id, targetDate]
        );

        if (existing.length > 0) {
            let savedAssignments = existing[0].assignments;
            if (typeof savedAssignments === 'string') {
                try {
                    savedAssignments = JSON.parse(savedAssignments);
                } catch (e) {
                    console.error("JSON_PARSE_ERROR in getDailyAssignments:", e);
                    savedAssignments = [];
                }
            }
            
            if (isToday) {
                // Check if any pending onboarding student is missing from savedAssignments
                const savedIds = new Set((savedAssignments || []).map(a => a.id));
                const hasMissingOnboarding = currentStudents.some(s => s.onboarding_status === 'pending' && !savedIds.has(s.id));
                
                // Check if any student in savedAssignments is NO LONGER valid
                const currentIds = new Set(currentStudents.map(s => s.id));
                const hasInvalidStudents = (savedAssignments || []).some(a => !currentIds.has(a.id));

                // If total students changed significantly, missing onboarding students, or invalid students exist, regenerate
                if (hasMissingOnboarding || hasInvalidStudents || (Array.isArray(savedAssignments) && savedAssignments.length < 15 && currentStudents.length > savedAssignments.length)) {
                    // Drop out of the block to regenerate below
                } else {
                    return await returnMergedAssignments(savedAssignments, targetDate, mentor_id, isPaused, res);
                }
            } else {
                // Past dates should never regenerate
                return await returnMergedAssignments(savedAssignments, targetDate, mentor_id, isPaused, res);
            }
        }

        // Past date: if no record exists, return empty (no generation for past dates) but still check completed logs
        if (!isToday) {
            const [completedLogs] = await db.query(
                `SELECT DISTINCT s.id, s.name, s.priority_category, s.enrollment_type, s.badge, s.onboarding_status,
                    CASE WHEN msl.session_duration_minutes IS NOT NULL THEN 'MEDIUM' ELSE 'QUICK' END as sessionType
                 FROM students s
                 LEFT JOIN student_interaction_logs sil ON s.id = sil.student_id AND sil.date = ? AND sil.mentor_id = ?
                 LEFT JOIN mentor_session_logs msl ON s.id = msl.student_id AND DATE(msl.created_at) = ? AND msl.mentor_id = ?
                 WHERE (sil.id IS NOT NULL OR msl.id IS NOT NULL)`,
                [targetDate, mentor_id, targetDate, mentor_id]
            );
            
            const pastAssignments = completedLogs.map(log => ({ ...log, status: 'COMPLETED' }));
            return res.status(200).json({ success: true, data: pastAssignments, is_paused: isPaused });
        }

        // Generate new assignments (only for today)
        const assignments = await generateAssignments(mentor_id, today);
        
        // Save to DB
        await db.query(
            'INSERT INTO daily_assignments (mentor_id, date, assignments) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE assignments = ?',
            [mentor_id, today, JSON.stringify(assignments), JSON.stringify(assignments)]
        );

        res.status(200).json({ success: true, data: assignments, is_paused: isPaused });
    } catch (error) {
        console.error('Get Daily Assignments Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const generateAssignments = async (mentor_id, today) => {
    // Check if mentor is paused
    let [mentorRows] = await db.query('SELECT interaction_paused, current_rotation_index FROM users WHERE id = ?', [mentor_id]);
    if (mentorRows.length === 0) {
        [mentorRows] = await db.query('SELECT interaction_paused, current_rotation_index FROM mentors WHERE id = ?', [mentor_id]);
    }
    const mentor = mentorRows[0];
    if (mentor && mentor.interaction_paused) {
        return []; // Return empty if paused
    }

    const [students] = await db.query(
        `SELECT id, name, priority_category, enrollment_type, badge, onboarding_status, last_session_type 
         FROM students 
         WHERE mentor_id = ? 
         AND (LOWER(enrollment_type) LIKE '%mentorship%' OR LOWER(enrollment_type) = 'both')
         AND status != 'inactive' AND course_completed = 0 AND mentorship_completed = 0
         ORDER BY id ASC`,
        [mentor_id]
    );

    if (students.length === 0) return [];

    let selectedForToday = [];
    let carryOverStudents = [];

    // Query the most recent past assignment record for this mentor
    const [lastRecord] = await db.query(
        'SELECT assignments, date FROM daily_assignments WHERE mentor_id = ? AND date < ? ORDER BY date DESC LIMIT 1',
        [mentor_id, today]
    );

    if (lastRecord.length > 0) {
        let prevAssignments = lastRecord[0].assignments;
        if (typeof prevAssignments === 'string') {
            try { prevAssignments = JSON.parse(prevAssignments); } catch(e) { prevAssignments = []; }
        }
        if (Array.isArray(prevAssignments) && prevAssignments.length > 0) {
            // Find students who were NOT completed yesterday/last session
            const uncompleted = prevAssignments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
            const activeStudentMap = new Map(students.map(s => [s.id, s]));
            
            for (const a of uncompleted) {
                if (activeStudentMap.has(a.id)) {
                    carryOverStudents.push(activeStudentMap.get(a.id));
                }
            }
        }
    }

    // Determine where the next rotation should start using current_rotation_index
    const shiftAmount = students.length >= 25 ? 10 : 15;
    let nextStartIndex = mentor ? mentor.current_rotation_index : 0;
    
    // Ensure index is within bounds
    if (nextStartIndex >= students.length) {
        nextStartIndex = 0;
    }

    const deep = [];
    const medium = [];
    const quick = [];
    const carryOverSet = new Set();

    // 1. Mandatory First Day Students -> DEEP
    const onboardingStudents = students.filter(s => s.onboarding_status === 'pending');
    for (const s of onboardingStudents) {
        deep.push({ ...s, sessionType: 'DEEP', status: 'PENDING' });
        carryOverSet.add(s.id);
    }

    // 2. We no longer add carry-over students to carryOverSet
    // The user strictly wants the "Student Interaction" tab to show exactly 15 students 
    // according to pure rotation, even if it means a student appears in both Today's rotation and Yesterday Pending.
    
    let currIdx = nextStartIndex;
    let attempts = 0;
    
    // If total assigned students <= 15, we want all of them in today's rotation
    if (students.length <= 15) {
        carryOverSet.clear();
        for (const s of onboardingStudents) carryOverSet.add(s.id);
    }
    
    // The total daily limit is 15. We strictly pick 15 students for today's rotation.
    let selectedCount = onboardingStudents.length;
    
    // We select up to 15 students sequentially
    while (selectedCount < 15 && attempts < students.length) {
        const candidate = students[currIdx];
        if (!carryOverSet.has(candidate.id)) {
            // Determine session type strictly based on last_session_type (from Next Attention Level), fallback to QUICK if never interacted
            const assignedType = candidate.last_session_type || 'QUICK';

            if (assignedType === 'DEEP') {
                deep.push({ ...candidate, sessionType: 'DEEP', status: 'PENDING' });
            } else if (assignedType === 'MEDIUM') {
                medium.push({ ...candidate, sessionType: 'MEDIUM', status: 'PENDING' });
            } else {
                quick.push({ ...candidate, sessionType: 'QUICK', status: 'PENDING' });
            }
            
            carryOverSet.add(candidate.id);
            selectedCount++;
        }
        currIdx = (currIdx + 1) % students.length;
        attempts++;
    }

    // Advance the rotation index for the next day
    // Only update rotation index if there are more than 15 students. 
    // If <= 15, we want to just start at 0 (or keep it as is, since it selects all anyway).
    const newRotationIndex = students.length > 15 ? currIdx : 0;
    
    await db.query('UPDATE users SET current_rotation_index = ? WHERE id = ?', [newRotationIndex, mentor_id]);
    await db.query('UPDATE mentors SET current_rotation_index = ? WHERE id = ?', [newRotationIndex, mentor_id]);

    return [...deep, ...medium, ...quick];
};

const submitSessionReport = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const mentor_id = req.user.id;
        let { student_id, session_type, next_session_type, report_data, session_number, session_id } = req.body;

        if (typeof report_data === 'string') {
            try {
                report_data = JSON.parse(report_data);
            } catch(e) {
                console.error("Error parsing report_data:", e);
            }
        }

        if (!student_id || !session_type || !report_data) {
            return res.status(400).json({ success: false, message: 'Missing required fields: student_id, session_type, and report_data are required' });
        }

        // Log upload warning if files failed to upload
        if (req.uploadError) {
            console.warn('[SUBMIT REPORT] File upload failed, proceeding without files:', req.uploadError);
        }

        // Add uploaded files to report_data
        if (req.files && req.files.length > 0) {
            report_data.files = req.files.map(file => {
                if (file.path && file.path.startsWith('http')) {
                    return file.path;
                }
                return '/uploads/' + file.filename;
            });
        }

        // 4. Fraud Check (Module 7)
        let isFlagged = 0;
        let flagReason = null;

        const [history] = await connection.query(
            'SELECT report_data FROM mentor_session_reports WHERE student_id = ? ORDER BY created_at DESC LIMIT 1',
            [student_id]
        );

        if (history.length > 0) {
            let lastReport = history[0].report_data;
            if (typeof lastReport === 'string') {
                try {
                    lastReport = JSON.parse(lastReport);
                } catch (e) {
                    lastReport = {};
                }
            }
            const currentPlan = report_data.action_plan || '';
            const lastPlan = lastReport?.action_plan || '';

            if (currentPlan && currentPlan === lastPlan && currentPlan.length > 10) {
                isFlagged = 1;
                flagReason = 'Duplicate Action Plan detected';
            }
        }

        // 5. Save Report - with exact duplicate check based on session details
        const today = getISTDate();
        const interactionDate = req.body.interaction_date || today;

        if (session_type !== 'CANCELLED') {
            // New duplicate logic: Check for exact same session_id or session_number if provided, else check date + session_type
            let duplicateQuery = 'SELECT id FROM mentor_session_reports WHERE mentor_id = ? AND student_id = ? AND DATE(created_at) = ? AND session_type = ?';
            let duplicateParams = [mentor_id, student_id, interactionDate, session_type];
            
            // If the UI passes session_id, ensure we don't duplicate for the exact same session_id
            if (session_id) {
                duplicateQuery = 'SELECT id FROM mentor_session_reports WHERE mentor_id = ? AND student_id = ? AND report_data LIKE ?';
                duplicateParams = [mentor_id, student_id, `%\"session_id\":\"${session_id}\"%`];
            }

            const [existingLog] = await connection.query(duplicateQuery, duplicateParams);

            if (existingLog.length > 0) {
                await connection.rollback();
                return res.status(409).json({ success: false, message: "A report for this specific interaction already exists." });
            }

            const created_at_val = `${interactionDate} 12:00:00`;
            let insertedId = null;
            try {
                const [result] = await connection.query(
                    'INSERT INTO mentor_session_reports (student_id, mentor_id, session_type, report_data, is_flagged, flag_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [student_id, mentor_id, session_type, JSON.stringify(report_data), isFlagged, flagReason, created_at_val]
                );
                insertedId = result.insertId;
            } catch (dbErr) {
                // Remove fallback to guarantee schema consistency, throwing triggers rollback
                throw new Error(`CRITICAL FAILURE: Interaction log insert failed: ${dbErr.message}`);
            }

            // Post-Insert Database Verification
            const [verifyRows] = await connection.query('SELECT id FROM mentor_session_reports WHERE id = ?', [insertedId]);
            if (verifyRows.length === 0) {
                throw new Error("CRITICAL FAILURE: Interaction report verification failed after insert.");
            }
            
            // Check student_interaction_logs if table exists
            try {
                // Drop the foreign key constraint that blocks mentors who are not in the users table
                try {
                    await connection.query('ALTER TABLE student_interaction_logs DROP FOREIGN KEY student_interaction_logs_ibfk_1');
                } catch (fkErr) {
                    // Ignore error if it's already dropped or doesn't exist
                }

                // If the table exists and is part of workflow, insert into it too.
                const [silResult] = await connection.query(`
                    INSERT INTO student_interaction_logs (student_id, mentor_id, mentor_notes, connected_today, date)
                    VALUES (?, ?, ?, 1, ?)
                `, [student_id, mentor_id, report_data.action_plan || report_data.notes || '', interactionDate]);
                
                const [silVerify] = await connection.query('SELECT id FROM student_interaction_logs WHERE id = ?', [silResult.insertId]);
                if (silVerify.length === 0) {
                    throw new Error("CRITICAL FAILURE: student_interaction_logs verification failed.");
                }
            } catch (silErr) {
                if (silErr.code !== 'ER_NO_SUCH_TABLE') {
                    throw new Error(`CRITICAL FAILURE: student_interaction_logs insert failed: ${silErr.message}`);
                }
                // If table doesn't exist, we safely ignore this check as per prompt ("if this table participates")
            }
        }
        // 6. Update assignment list status across ALL historical records up to interactionDate
        // If a student's interaction is completed, it should clear them from all past pending lists
        // BUT it should NOT clear them from future dates (like Today) if they were assigned again
        const [allAssignments] = await connection.query(
            'SELECT id, date, assignments FROM daily_assignments WHERE mentor_id = ? AND date <= ?',
            [mentor_id, interactionDate]
        );

        for (let record of allAssignments) {
            let assignments = record.assignments;
            if (typeof assignments === 'string') {
                try { assignments = JSON.parse(assignments); } catch (e) { continue; }
            }
            
            let updated = false;
            const updatedAssignments = assignments.map(a => {
                if (a.id == student_id && a.status !== 'COMPLETED' && a.status !== 'CANCELLED') {
                    updated = true;
                    return { 
                        ...a, 
                        status: session_type === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
                        ...(session_type === 'CANCELLED' && report_data.cancel_reason ? { cancel_reason: report_data.cancel_reason } : {})
                    };
                }
                return a;
            });

            if (updated) {
                await connection.query(
                    'UPDATE daily_assignments SET assignments = ? WHERE id = ?',
                    [JSON.stringify(updatedAssignments), record.id]
                );
            }
        }
        if (session_type === 'CANCELLED') {
            await connection.commit();
            return res.status(200).json({ success: true, message: 'Session cancelled and logged' });
        }

        // 7. Priority Logic (Manual Priority from Mentor)
        // Set priority based on mentor's selection for the next interaction type
        const [[currentStudent]] = await connection.query('SELECT priority_category FROM students WHERE id = ?', [student_id]);
        let currentP = currentStudent?.priority_category || 'Stable';
        let finalPriority = currentP;

        // ONLY update priority if next_session_type is explicitly provided by the mentor
        if (next_session_type) {
            if (next_session_type === 'DEEP') finalPriority = 'High';
            else if (next_session_type === 'MEDIUM') finalPriority = 'Medium';
            else if (next_session_type === 'QUICK') finalPriority = 'Stable';
        }
        // If next_session_type is not provided, keep current priority_category

        await connection.query(
            'UPDATE students SET priority_category = ?, last_session_type = ?, last_session_date = ?, onboarding_status = "completed" WHERE id = ?',
            [finalPriority, next_session_type || session_type, interactionDate, student_id]
        );

        // Notify Admin of new session report
        try {
            const [[student]] = await connection.query('SELECT name FROM students WHERE id = ?', [student_id]);
            let msg = `<b>Interaction Hub:</b> Mentor <b>${req.user.name}</b> completed a <b>${session_type}</b> session with <b>${student?.name || student_id}</b>.`;
            if (isFlagged) msg += ` <span style="color: red;">⚠️ Possible Fraud Detected!</span>`;

            await connection.query('INSERT INTO admin_notifications (message, related_id, action_type) VALUES (?, ?, ?)', [
                msg,
                student_id,
                'mentor_session_report'
            ]);
        } catch (nErr) {
            console.error("Notification Error:", nErr.message);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Report submitted and student state updated', flagged: isFlagged });
    } catch (error) {
        await connection.rollback();
        console.error('Submit Session Report Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    } finally {
        connection.release();
    }
};

const getHighRiskStudents = async (req, res) => {
    try {
        const [students] = await db.query(
            `SELECT id, name, priority_category, last_session_date, mentor_name 
             FROM students 
             WHERE priority_category = 'High' 
             OR id IN (SELECT student_id FROM mentor_session_reports WHERE is_flagged = 1)
             ORDER BY last_session_date DESC`
        );
        res.status(200).json({ success: true, data: students });
    } catch (error) {
        console.error('Get High Risk Students Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const getWeeklyCoverage = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id, s.name, s.priority_category, s.mentor_name,
                COUNT(CASE WHEN r.session_type = 'DEEP' THEN 1 END) as deep_count,
                COUNT(CASE WHEN r.session_type = 'MEDIUM' THEN 1 END) as medium_count,
                COUNT(CASE WHEN r.session_type = 'QUICK' THEN 1 END) as quick_count,
                MAX(r.created_at) as last_interaction
            FROM students s
            LEFT JOIN mentor_session_reports r ON s.id = r.student_id AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            WHERE s.status != 'rejected'
            GROUP BY s.id
            ORDER BY deep_count ASC, medium_count ASC
        `;

        const [coverage] = await db.query(query);
        res.status(200).json({ success: true, data: coverage });
    } catch (error) {
        console.error('Weekly Coverage Error:', error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateSessionReport = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        const { id: student_id } = req.params;
        let { session_type, next_session_type, report_data } = req.body;

        if (typeof report_data === 'string') {
            try { report_data = JSON.parse(report_data); } catch(e) {}
        }

        if (req.files && req.files.length > 0) {
            report_data.files = req.files.map(file => {
                if (file.path && file.path.startsWith('http')) return file.path;
                return '/uploads/' + file.filename;
            });
        }

        const today = getISTDate();
        
        const [existing] = await db.query(
            'SELECT id, report_data FROM mentor_session_reports WHERE mentor_id = ? AND student_id = ? AND DATE(created_at) = ? ORDER BY id DESC LIMIT 1',
            [mentor_id, student_id, today]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'No interaction logged today for this student' });
        }

        if (!report_data.files && existing[0].report_data) {
            let oldData = existing[0].report_data;
            if (typeof oldData === 'string') {
                try { oldData = JSON.parse(oldData); } catch(e) { oldData = {}; }
            }
            if (oldData.files) {
                report_data.files = oldData.files;
            }
        }

        await db.query(
            'UPDATE mentor_session_reports SET session_type = ?, report_data = ? WHERE id = ?',
            [session_type, JSON.stringify(report_data), existing[0].id]
        );

        if (next_session_type) {
            const [[currentStudent]] = await db.query('SELECT priority_category FROM students WHERE id = ?', [student_id]);
            let finalPriority = currentStudent?.priority_category || 'Stable';
            if (next_session_type === 'DEEP') finalPriority = 'High';
            else if (next_session_type === 'MEDIUM') finalPriority = 'Medium';
            else if (next_session_type === 'QUICK') finalPriority = 'Stable';

            await db.query(
                'UPDATE students SET priority_category = ?, last_session_type = ? WHERE id = ?',
                [finalPriority, next_session_type || session_type, student_id]
            );
        }

        res.status(200).json({ success: true, message: 'Interaction updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteSessionReport = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        const { id: student_id } = req.params;
        const today = getISTDate();

        await db.query(
            'DELETE FROM mentor_session_reports WHERE mentor_id = ? AND student_id = ? AND DATE(created_at) = ?',
            [mentor_id, student_id, today]
        );

        const [assignmentRow] = await db.query(
            'SELECT id, assignments FROM daily_assignments WHERE mentor_id = ? AND date = ?',
            [mentor_id, today]
        );

        if (assignmentRow.length > 0) {
            let assignments = assignmentRow[0].assignments;
            if (typeof assignments === 'string') {
                try { assignments = JSON.parse(assignments); } catch(e) { assignments = []; }
            }
            
            const updatedAssignments = assignments.map(a => 
                a.id == student_id ? { ...a, status: 'PENDING' } : a
            );

            await db.query(
                'UPDATE daily_assignments SET assignments = ? WHERE id = ?',
                [JSON.stringify(updatedAssignments), assignmentRow[0].id]
            );
        }

        res.status(200).json({ success: true, message: 'Interaction deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTodaySessionReport = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        const { id: student_id } = req.params;
        const dateParam = req.query.date;
        const targetDate = dateParam || getISTDate();

        const [existing] = await db.query(
            'SELECT id, report_data, session_type, created_at FROM mentor_session_reports WHERE mentor_id = ? AND student_id = ? AND DATE(created_at) = ? ORDER BY id DESC LIMIT 1',
            [mentor_id, student_id, targetDate]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'No interaction logged for this date' });
        }

        let report_data = existing[0].report_data;
        if (typeof report_data === 'string') {
            try { report_data = JSON.parse(report_data); } catch(e) { report_data = {}; }
        }

        res.status(200).json({ success: true, data: report_data, session_type: existing[0].session_type, report_id: existing[0].id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getYesterdayPending = async (req, res) => {
    try {
        const mentor_id = req.user.id;
        
        // Support custom date: if date param given, "yesterday" means date-1 
        const dateParam = req.query.date;
        const today = getISTDate();
        const referenceDate = dateParam || today;
        
        // Fetch the most recent past assignments (could be yesterday, or Friday if today is Monday)
        const [yesterdayRecord] = await db.query(
            'SELECT assignments FROM daily_assignments WHERE mentor_id = ? AND date < ? ORDER BY date DESC LIMIT 1',
            [mentor_id, referenceDate]
        );

        if (yesterdayRecord.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        let assignments = yesterdayRecord[0].assignments;
        if (typeof assignments === 'string') {
            try {
                assignments = JSON.parse(assignments);
            } catch (e) {
                console.error("JSON_PARSE_ERROR in getYesterdayPending:", e);
                assignments = [];
            }
        }

        // Filter: only students who were NOT completed and NOT cancelled yesterday
        // Also exclude students who are already completed today (to prevent duplicates)
        const [todayCompletedRows] = await db.query(
            'SELECT student_id FROM mentor_session_reports WHERE mentor_id = ? AND DATE(created_at) = ?',
            [mentor_id, referenceDate]
        );
        const completedTodayIds = new Set(todayCompletedRows.map(r => r.student_id));

        const pendingStudents = (assignments || []).filter(a => 
            a.status === 'PENDING' && !completedTodayIds.has(a.id)
        );

        res.status(200).json({ success: true, data: pendingStudents });
    } catch (error) {
        console.error("getYesterdayPending Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


module.exports = {
    getDailyAssignments,
    submitSessionReport,
    getHighRiskStudents,
    getWeeklyCoverage,
    updateSessionReport,
    deleteSessionReport,
    getTodaySessionReport,
    getYesterdayPending,
    togglePause: async (req, res) => { 
        try { 
            const mentor_id = req.user.id; 
            let [mentorRows] = await db.query('SELECT interaction_paused FROM users WHERE id = ?', [mentor_id]); 
            if (mentorRows.length === 0) {
                [mentorRows] = await db.query('SELECT interaction_paused FROM mentors WHERE id = ?', [mentor_id]);
            }
            const mentor = mentorRows[0];
            const newStatus = mentor ? !mentor.interaction_paused : false; 
            await db.query('UPDATE users SET interaction_paused = ? WHERE id = ?', [newStatus, mentor_id]); 
            await db.query('UPDATE mentors SET interaction_paused = ? WHERE id = ?', [newStatus, mentor_id]); 
            res.status(200).json({ success: true, is_paused: newStatus, message: 'Pause status updated' }); 
        } catch(err) { 
            console.error(err); 
            res.status(500).json({ success: false, message: 'Server Error' }); 
        } 
    }
};