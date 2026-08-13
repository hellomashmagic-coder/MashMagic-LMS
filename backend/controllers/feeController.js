const db = require('../config/db');

// @desc    Get fee structures (with installments and consumed hours)
// @route   GET /api/admin/fees/:entity_type
const getFees = async (req, res) => {
    try {
        const { entity_type } = req.params;

        const [structures] = await db.query(`
            SELECT f.*, 
                   (SELECT SUM(installment_amount) FROM fee_installments WHERE fee_structure_id = f.id) as total_paid_amount
            FROM fee_structures f
            WHERE f.entity_type = ?
        `, [entity_type]);

        const [installments] = await db.query(`
            SELECT fi.* 
            FROM fee_installments fi
            JOIN fee_structures f ON fi.fee_structure_id = f.id
            WHERE f.entity_type = ?
            ORDER BY fi.installment_date ASC
        `, [entity_type]);

        let consumedMap = {};
        if (entity_type === 'student') {
            const [completedSessions] = await db.query(`
                SELECT student_id, start_time, end_time
                FROM timetable 
                WHERE status = 'Completed'
            `);
            
            completedSessions.forEach(session => {
                if (session.start_time && session.end_time) {
                    const [startH, startM] = session.start_time.split(':').map(Number);
                    const [endH, endM] = session.end_time.split(':').map(Number);
                    
                    const startMins = (startH * 60) + (startM || 0);
                    const endMins = (endH * 60) + (endM || 0);
                    let diffMins = endMins - startMins;
                    
                    // Handle case where session crosses midnight (rare but possible)
                    if (diffMins < 0) diffMins += 24 * 60;
                    
                    if (!consumedMap[session.student_id]) consumedMap[session.student_id] = 0;
                    consumedMap[session.student_id] += diffMins / 60;
                }
            });
        }

        // Group installments
        const data = structures.map(s => {
            const insts = installments.filter(i => i.fee_structure_id === s.id);
            const hourlyRate = (s.total_hours > 0) ? (s.total_fee / s.total_hours) : 0;
            const totalPaidAmount = s.total_paid_amount || 0;
            const paidHours = (hourlyRate > 0) ? (totalPaidAmount / hourlyRate) : 0;
            
            return {
                ...s,
                installments: insts,
                hourly_rate: hourlyRate,
                total_paid_amount: totalPaidAmount,
                paid_hours: paidHours,
                consumed_hours: consumedMap[s.entity_id] || 0
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("GET_FEES_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Save/Update Fee Structure and Installments
// @route   POST /api/admin/fees
const saveFee = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { entity_type, entity_id, total_fee, total_hours, installments } = req.body;

        // Check if exists
        const [existing] = await connection.query(
            'SELECT id FROM fee_structures WHERE entity_type = ? AND entity_id = ?', 
            [entity_type, entity_id]
        );

        let feeId;
        if (existing.length > 0) {
            feeId = existing[0].id;
            await connection.query(
                'UPDATE fee_structures SET total_fee = ?, total_hours = ? WHERE id = ?',
                [total_fee, total_hours, feeId]
            );
            // Delete old installments
            await connection.query('UPDATE fee_installments SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE fee_structure_id = ?', [feeId]);
        } else {
            const [result] = await connection.query(
                'INSERT INTO fee_structures (entity_type, entity_id, total_fee, total_hours) VALUES (?, ?, ?, ?)',
                [entity_type, entity_id, total_fee, total_hours]
            );
            feeId = result.insertId;
        }

        // Insert new installments
        if (installments && installments.length > 0) {
            for (let inst of installments) {
                if (inst.installment_amount > 0 && inst.installment_date) {
                    await connection.query(
                        'INSERT INTO fee_installments (fee_structure_id, installment_date, installment_amount) VALUES (?, ?, ?)',
                        [feeId, inst.installment_date, inst.installment_amount]
                    );
                }
            }
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Fee details saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error("SAVE_FEE_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getFees,
    saveFee
};
