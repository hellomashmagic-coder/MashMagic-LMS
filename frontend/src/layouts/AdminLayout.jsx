import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
 LayoutDashboard, 
 UserCheck, 
 Users, 
 UserSquare2, 
 GraduationCap, 
 ListTodo, 
 FileText, 
 Target, 
 ScrollText,
 MessageSquare,
 Presentation,
 IndianRupee,
 Calendar,
 Clock,
 ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AdminLayout = () => {
 const { user } = useAuth();
 const location = useLocation();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [isCollapsed, setIsCollapsed] = useState(false);
 const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

 const fetchPendingApprovals = async () => {
 try {
 const res = await api.get('/admin/pending-users');
 if (res.data.success) {
 setPendingApprovalsCount(res.data.data.length);
 }
 } catch (error) {
 console.error('Error fetching pending approvals:', error);
 }
 };

 useEffect(() => {
 if (user) {
 fetchPendingApprovals();
 // Allow components inside Outlet to trigger a nav refresh
 window.refetchNotifications = fetchPendingApprovals;
 }
 return () => {
 window.refetchNotifications = null;
 };
 }, [user]);

 const navItems = [
 { path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', perm: 'dashboard' },
 { path: '/admin/admin-management', icon: <UserCheck size={20} />, label: 'Sub Admins', perm: 'admins' },
 { path: '/admin/approvals', icon: <UserCheck size={20} />, label: 'Approvals', perm: 'approvals', dotBadge: pendingApprovalsCount },
 { path: '/admin/students', icon: <Users size={20} />, label: 'Students', perm: 'students' },
 { path: '/admin/mentors', icon: <UserSquare2 size={20} />, label: 'Mentors', perm: 'mentors' },
 { path: '/admin/faculties', icon: <GraduationCap size={20} />, label: 'Faculties', perm: 'faculties' },
 { path: '/admin/staff', icon: <UserSquare2 size={20} />, label: 'Staff Management', perm: 'staff' },
 { path: '/admin/tasks', icon: <ListTodo size={20} />, label: 'Tasks', perm: 'tasks' },
 { path: '/admin/reports', icon: <FileText size={20} />, label: 'Weekly Reports', perm: 'reports' },
 { path: '/admin/integrity', icon: <ShieldCheck size={20} />, label: 'Integrity Scan', perm: 'reports' },
 { path: '/admin/academic-schedule', icon: <ScrollText size={20} />, label: 'Academic Schedule', perm: 'monitoring' },
 { path: '/admin/daily-updates', icon: <FileText size={20} />, label: 'Daily Updates', perm: 'monitoring' },
 { path: '/admin/mentor-head-report', icon: <Target size={20} />, label: 'Mentor Head Report', perm: 'reports' },
   { path: '/admin/logs', icon: <ScrollText size={20} />, label: 'Interaction Logs', perm: 'logs' },
   { path: '/admin/ah-interactions', icon: <MessageSquare size={20} />, label: 'AH Interactions', perm: 'logs' },
   { path: '/admin/ah-meetings', icon: <Presentation size={20} />, label: 'AH Meetings', perm: 'logs' },
   { path: '/admin/parent-meetings', icon: <Presentation size={20} />, label: 'Parent Meetings', perm: 'parent_meetings' },
   { path: '/admin/fees', icon: <IndianRupee size={20} />, label: 'Fee Management', perm: 'fees' },
   { path: '/admin/faculty-timetable', icon: <Calendar size={20} />, label: 'Faculty Timetable', perm: 'faculties' },
   { path: '/admin/student-schedules', icon: <Clock size={20} />, label: 'Student Schedules', perm: 'students' },
   { path: '/admin/audit-logs', icon: <FileText size={20} />, label: 'Audit Trail', perm: 'logs' },

 ].filter(item => {
    // Main Admin has full access
    if (user?.role === 'super_admin') return true;
    
    // Sub Admins filtered by granular permissions
    if (user?.role === 'sub_admin') {
      const perms = user?.permissions || {};
      if (item.perm) return !!perms[item.perm];
      return true;
    }
    
    return false;
  });

 return (
 <div className="flex min-h-screen relative overflow-hidden" 
 style={{ background: 'linear-gradient(180deg, #F8FAFC, #EEF2F7)' }}>
 {/* Mobile Overlay */}
 {isSidebarOpen && (
 <div 
 className="fixed inset-0 bg-[#008080]/40 backdrop-blur-md z-[990] md:hidden cursor-pointer transition-all duration-500"
 onClick={() => setIsSidebarOpen(false)}
 />
 )}
 
 <Sidebar 
 isOpen={isSidebarOpen} 
 setIsOpen={setIsSidebarOpen} 
 isCollapsed={isCollapsed} 
 setIsCollapsed={setIsCollapsed} 
 navItems={navItems}
 title="Admin Panel"
 />
 
  <div className={`flex-1 flex flex-col min-w-0 w-full h-screen overflow-y-auto transition-all duration-300 ${isCollapsed ? 'md:ml-[88px]' : 'md:ml-72'}`}>
    <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
    <main className="p-4 md:p-10 overflow-x-hidden w-full max-w-full">
      <div className="w-full h-full">
        <Outlet />
      </div>
    </main>
 </div>
 </div>
 );
};

export default AdminLayout;
