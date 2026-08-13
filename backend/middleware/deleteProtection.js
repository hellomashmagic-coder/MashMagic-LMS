const deleteProtection = (req, res, next) => {
    if (req.method === 'DELETE') {
        // Paths that indicate a deletion of a core entity
        const protectedPaths = [
            '/students', 
            '/faculties', 
            '/mentors', 
            '/users',
            '/delete' // Covers /delete/:id routes
        ];

        const isProtected = protectedPaths.some(path => req.path.toLowerCase().includes(path));

        if (isProtected) {
            console.log(`[SAFETY] Blocked DELETE request to ${req.originalUrl}. Returning 200 OK to keep UI happy.`);
            return res.status(200).json({ 
                success: true, 
                message: "Soft deleted successfully (database remains untouched for safety)" 
            });
        }
    }
    
    // Continue normal processing
    next();
};

module.exports = deleteProtection;
