import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import { 
 LayoutDashboard, 
 Target, 
 ShieldCheck, 
 UserPlus, 
 Users, 
 GraduationCap, 
 Briefcase, 
 ListTodo, 
 CheckCircle2, 
 Activity,
 Bell,
 ScrollText
} from 'lucide-react';

const MentorHeadLayout = () => {
 const location = useLocation();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [isCollapsed, setIsCollapsed] = useState(false);

 const navItems = [
 { path: '/mentor-head/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
 { path: '/mentor-head/checks', icon: <Target className="w-[18px] h-[18px]" />, label: 'Student Checks' },
 { path: '/mentor-head/shift', icon: <ShieldCheck className="w-[18px] h-[18px]" />, label: 'Student Shift' },
 { path: '/mentor-head/register-mentor', icon: <UserPlus size={18} />, label: 'Register Mentor' },
 { path: '/mentor-head/mentors', icon: <Users size={18} />, label: 'Mentors List' },
 { path: '/mentor-head/students', icon: <GraduationCap size={18} />, label: 'Students' },
 { path: '/mentor-head/remove-mentors', icon: <UserPlus size={18} />, label: 'Remove Mentors' },
 { path: '/mentor-head/faculties', icon: <Briefcase size={18} />, label: 'Faculties' },
 { path: '/mentor-head/tasks', icon: <ListTodo size={18} />, label: 'Tasks' },
 { path: '/mentor-head/course-completed', icon: <CheckCircle2 size={18} />, label: 'Mentorship Completed' },
 { path: '/mentor-head/interactions', icon: <Activity size={18} />, label: 'Logs' },
 { path: '/mentor-head/notifications', icon: <Bell size={18} />, label: 'Notifications' },
 ];

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
 title="Mentor Head"
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

export default MentorHeadLayout;
