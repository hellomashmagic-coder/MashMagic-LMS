import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  CheckSquare,
  MessageSquare,
  Clock
} from 'lucide-react';

const FacultyLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { path: '/faculty/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/faculty/students', icon: <Users size={18} />, label: 'Students' },
    { path: '/faculty/sessions', icon: <Calendar size={18} />, label: 'Sessions' },
    { path: '/faculty/reports', icon: <ClipboardList size={18} />, label: 'Reports' },
    { path: '/faculty/exam-scores', icon: <CheckSquare size={18} />, label: 'Exam Scores' },
    { path: '/faculty/timetable', icon: <Clock size={18} />, label: 'Timetable' },
    { path: '/faculty/schedule', icon: <Calendar size={18} />, label: 'Academic Schedule' },
    { path: '/faculty/mentor-feedback', icon: <MessageSquare size={18} />, label: 'Mentor Feedback' },
    { path: '/faculty/tasks', icon: <CheckSquare size={18} />, label: 'Tasks' },
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
        title="Faculty Hub"
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

export default FacultyLayout;
