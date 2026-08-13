const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'mashmagic_docs',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf', 'docx', 'xlsx'],
            resource_type: 'auto'
        }
    });
} else {
    // Fallback to local storage
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
}

const upload = multer({ storage: storage });

module.exports = {
    cloudinary,
    upload
};
