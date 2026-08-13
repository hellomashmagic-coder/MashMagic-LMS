const requireRole = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase().trim();
        // Flatten roles to handle both 'role1', 'role2' and ['role1', 'role2']
        const allowedRoles = roles.flat().map(r => r?.toLowerCase()?.trim());

        if (!req.user || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user?.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { requireRole };
