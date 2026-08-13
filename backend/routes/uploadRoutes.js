const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', requireAuth, upload.single('file'), (req, res) => {
    console.log("Upload request received");
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
