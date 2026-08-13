import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  MessageSquare, 
  Contact, 
  CalendarClock, 
  Calendar, 
  GraduationCap, 
  ClipboardList,
  ScrollText
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MentorLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const fetchPendingTasks = async () => {
    try {
      const res = await api.get('/mentor/tasks');
      const pending = res.data.data.filter(t => t.status !== 'Completed').length;
      setPendingTasksCount(pending);
    } catch (error) {}
  };

  useEffect(() => {
    if (user) {
      fetchPendingTasks();
      const interval = setInterval(() => {
        fetchPendingTasks();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);



  const navItems = [
    { path: '/mentor/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/mentor/students', icon: <Users size={18} />, label: 'My Students' },
    { path: '/mentor/students-data', icon: <ClipboardList size={18} />, label: 'Students Data' },
    { path: '/mentor/tasks', icon: <ListTodo size={18} />, label: 'Tasks', badge: pendingTasksCount },
    { path: '/mentor/interaction-logs', icon: <MessageSquare size={18} />, label: 'Student Interactions' },
    { path: '/mentor/logs-history', icon: <ScrollText size={18} />, label: 'Logs History' },
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
        title="Mentor Hub"
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

export default MentorLayout;
