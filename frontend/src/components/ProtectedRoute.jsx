import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Array<string>} props.allowedRoles - Optional list of roles allowed to access this route
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based authorization
  if (allowedRoles && allowedRoles.length > 0) {
    // Read role from state or fallback to sessionStorage
    const storedRole = sessionStorage.getItem('role');
    const normalizeRole = (r) => (r || '').toLowerCase().replace(/_/g, '').trim();
    const userRoleNormalized = normalizeRole(user?.role || storedRole);

    const hasPermission = allowedRoles.some(role => normalizeRole(role) === userRoleNormalized);

    if (!hasPermission) {
      // Redirect to appropriate dashboard based on role to avoid login loop
      const r = userRoleNormalized;

      if (r === 'admin' || r === 'superadmin' || r === 'subadmin') return <Navigate to="/admin/dashboard" replace />;
      if (r === 'mentorhead') return <Navigate to="/mentor-head/dashboard" replace />;
      if (r === 'academichead') return <Navigate to="/academic-head/dashboard" replace />;
      if (r === 'mentor') return <Navigate to="/mentor/dashboard" replace />;
      if (r === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
      if (r === 'student') return <Navigate to="/student/dashboard" replace />;
      if (r === 'ssc') return <Navigate to="/ssc/dashboard" replace />;

      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
