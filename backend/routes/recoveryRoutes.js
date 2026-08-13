const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recoveryController');
const { authorize, protect } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('super_admin')); // Only super_admin can access the Recovery Center

router.get('/deleted', recoveryController.getDeletedRecords);
router.post('/restore', recoveryController.restoreRecord);
router.get('/audit-logs', recoveryController.getAuditLogs);

module.exports = router;
