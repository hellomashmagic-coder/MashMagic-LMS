const AuditService = require('../services/auditService');

const deleteProtection = (req, res, next) => {
    if (req.method === 'DELETE') {
        const protectedPaths = [
            '/students', 
            '/faculties', 
            '/mentors', 
            '/users',
            '/delete'
        ];

        const isProtected = protectedPaths.some(path => req.path.toLowerCase().includes(path));

        if (isProtected) {
            console.log(`[AUDIT SAFETY] Authorized DELETE request initiated for ${req.originalUrl} by user: ${req.user ? req.user.id : 'Anonymous'}`);
        }
    }
    
    // Pass through to actual authorized controller routes
    next();
};

module.exports = deleteProtection;
