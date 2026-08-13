const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token first. If it fails, it will jump to the catch block.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Fetch user. If DB fails, we should handle it as a 500, not 401.
            let user;
            try {
                user = await User.findById(decoded.id);
            } catch (dbError) {
                console.error(`[AUTH DB ERROR] Failed to fetch user:`, dbError.message);
                return res.status(500).json({ success: false, message: "Internal server error during authentication check." });
            }

            if (!user) {
                return res.status(401).json({ success: false, message: "Not authorized, user not found" });
            }

            if (user.status !== 'active') {
                return res.status(403).json({ success: false, message: "Account is inactive/blocked" });
            }

            if (user.isApproved !== 1) {
                return res.status(403).json({ success: false, message: "Account pending approval" });
            }

            req.user = user;
            return next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.error(`[AUTH] Token Expired: ${error.expiredAt}`);
                return res.status(401).json({ success: false, message: "Token expired, please login again", isExpired: true });
            }
            console.error(`[AUTH] JWT Verification Failed:`, error.message);
            return res.status(401).json({ success: false, message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role (${req.user.role}) is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { protect, authorize, requireAuth: protect };
