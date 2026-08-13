import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import { 
  LayoutDashboard, 
  Activity, 
  UserPlus, 
  GraduationCap, 
  Users,
  Briefcase,
  ShieldAlert,
  ScrollText,
  MessageSquare,
  Presentation,
  CalendarDays
} from 'lucide-react';

const AOELayout = () => {
 const location = useLocation();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [isCollapsed, setIsCollapsed] = useState(false);

 const navItems = [
 { path: '/aoe/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
 { path: '/aoe/actions', icon: <Activity size={18} />, label: 'Faculty Performance Index' },
 { path: '/aoe/registrations', icon: <UserPlus size={18} />, label: 'Registrations' },
 { path: '/aoe/students', icon: <GraduationCap size={18} />, label: 'Students' },
 { path: '/aoe/mentors', icon: <Users size={18} />, label: 'Mentors' },
 { path: '/aoe/faculties', icon: <Briefcase size={18} />, label: 'Faculties' },
  { path: '/aoe/academic-schedule', icon: <ScrollText size={18} />, label: 'Academic Schedule' },
  { path: '/aoe/meetings', icon: <Presentation size={18} />, label: 'Parent Meetings' },
  { path: '/aoe/demo-schedule', icon: <CalendarDays size={18} />, label: 'Demo Schedule' },
  { path: '/aoe/exam-scores', icon: <ScrollText size={18} />, label: 'Exam Scores' },
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
 title="AOE"
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

export default AOELayout;
