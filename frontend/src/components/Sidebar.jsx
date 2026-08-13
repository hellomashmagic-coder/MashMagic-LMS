import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  GraduationCap,
  ListTodo,
  FileText,
  LogOut,
  User,
  ScrollText,
  UserCheck,
  Target,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Contact,
  CalendarClock,
  Calendar,
  ClipboardList,
  Bell,
  Settings,
  HelpCircle,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import mlogo from '../assets/mlogo.png';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed, navItems, title = "MashMagic" }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out");
    navigate('/login');
  };

  return (
    <aside className={`fixed left-0 top-0 h-full flex flex-col z-[1000] bg-white shadow-[0_0_40px_rgba(0,0,0,0.03)] border-r border-slate-100 transition-all duration-300 ease-in-out md:translate-x-0 
    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
     w-[80%] max-w-[20rem] sm:w-80 ${isCollapsed ? 'md:w-[88px]' : 'md:w-72'}`}>
    
    {/* Mobile Close Button */}
    <button 
      onClick={() => setIsOpen(false)}
      className="md:hidden absolute right-4 top-4 z-[1100] p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all"
    >
      <X size={20} />
    </button>

    {/* Collapse Toggle Bar (Desktop Only) */}
    <button 
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="hidden md:flex absolute -right-4 top-24 w-8 h-8 bg-[#008080] rounded-full items-center justify-center text-white shadow-lg border-2 border-white z-50 hover:scale-110 active:scale-95 transition-all"
    >
      {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
    </button>

    <div className={`p-4 md:p-8 border-b border-slate-100 flex flex-col items-center transition-all duration-500 overflow-hidden ${isCollapsed ? 'px-2 py-4' : 'px-4 md:px-8 py-6'}`}>
      <div className="flex items-center justify-center w-full relative">
        <div className={`transition-all duration-500 flex flex-col items-center w-full`}>
          {/* THE 'FULL' LOGO AREA */}
          <div className={`transition-all duration-700 flex items-center justify-center ${isCollapsed ? 'w-20 h-20 mb-0' : 'w-full h-24 mb-0'}`}>
            <img 
              src={mlogo} 
              alt="Logo" 
              className={`transition-all duration-700 ${isCollapsed ? 'w-16 h-16 object-contain' : 'w-full h-full object-contain scale-[2.2]'}`} 
            />
          </div>
        </div>
      </div>
    </div>

    <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
      {navItems.map((item) => (
        item.children ? (
          <div key={item.label} className="flex flex-col gap-1">
            <button
              onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative w-full
                ${openDropdown === item.label
                  ? `bg-slate-50 font-bold shadow-sm ${item.colorClass === 'blue' ? 'text-blue-600' : item.colorClass === 'violet' ? 'text-violet-600' : 'text-[#008080]'}`
                  : `text-[#64748b] hover:bg-slate-50 hover:translate-x-1 ${item.colorClass === 'blue' ? 'hover:text-blue-600' : item.colorClass === 'violet' ? 'hover:text-violet-600' : 'hover:text-[#008080]'}`}
                ${isCollapsed ? 'justify-center px-0 mx-auto w-12' : ''}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`transition-all duration-300 ${isCollapsed ? 'scale-110' : 'opacity-80 group-hover:opacity-100 flex items-center justify-center shrink-0'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-sm font-medium tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 truncate">{item.label}</span>
                  {openDropdown === item.label ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
            </button>
            {openDropdown === item.label && !isCollapsed && (
              <div className="flex flex-col gap-1 pl-4 mt-1 animate-in slide-in-from-top-2 duration-300">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative
                      ${isActive
                        ? `${item.colorClass === 'blue' ? 'bg-blue-600' : item.colorClass === 'violet' ? 'bg-violet-600' : 'bg-[#008080]'} text-white font-bold shadow-md`
                        : `text-[#64748b] hover:bg-slate-50 hover:translate-x-1 ${item.colorClass === 'blue' ? 'hover:text-blue-600' : item.colorClass === 'violet' ? 'hover:text-violet-600' : 'hover:text-[#008080]'}`}
                    `}
                  >
                    <span className="opacity-80 group-hover:opacity-100 flex items-center justify-center shrink-0">
                      {child.icon}
                    </span>
                    <span className="text-sm font-medium tracking-tight whitespace-nowrap truncate">{child.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ) : (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative
              ${isActive
                ? 'bg-[#008080] text-white font-bold shadow-[0_10px_20px_rgba(0,128,128,0.2)]'
                : 'text-[#64748b] hover:bg-slate-50 hover:text-[#008080] hover:translate-x-1'}
              ${isCollapsed ? 'justify-center px-0 mx-auto w-12' : ''}
            `}
            title={isCollapsed ? item.label : undefined}
          >
            <span className={`transition-all duration-300 ${isCollapsed ? 'scale-110' : 'opacity-80 group-hover:opacity-100 flex items-center justify-center shrink-0'}`}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-sm font-medium tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 truncate">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${item.badgeColor || 'bg-rose-500 text-white animate-pulse'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            )}

            {isCollapsed && item.dotBadge > 0 && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse absolute top-2 right-2"></span>
            )}
          </NavLink>
        )
      ))}
    </nav>

    <div className={`p-4 space-y-4 transition-all ${isCollapsed ? 'flex flex-col items-center px-2 pb-8' : ''}`}>
      {/* User Profile Summary */}
      <div className={`bg-slate-50 border border-slate-100 p-4 rounded-[24px] flex items-center gap-3 group hover:bg-slate-100 transition-all cursor-pointer overflow-hidden ${isCollapsed ? 'justify-center w-12 h-12 p-0 rounded-2xl' : ''}`}>
        <div className={`shrink-0 bg-gradient-to-br from-[#008080] to-[#20B2AA] flex items-center justify-center text-white shadow-lg transition-all overflow-hidden ${isCollapsed ? 'w-full h-full rounded-2xl' : 'w-10 h-10 rounded-[14px] group-hover:scale-110'}`}>
          {user?.profile_pic ? (
            <img src={user.profile_pic} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={isCollapsed ? 20 : 20} />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden animate-in fade-in duration-500">
            <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest leading-none mb-1">
              {user?.role?.split('_').join(' ')}
            </span>
            <span className="text-xs font-bold text-slate-700 truncate">{user?.name}</span>
          </div>
        )}
      </div>
      <button
        onClick={handleLogout}
        className={`flex items-center justify-center transition-all duration-300 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent group overflow-hidden ${isCollapsed ? 'w-12 h-12 rounded-2xl' : 'w-full px-4 py-4 rounded-[20px] gap-3 text-[10px] font-black uppercase tracking-[0.2em]'}`}
      >
        <LogOut size={16} className={`${!isCollapsed ? 'group-hover:-translate-x-1' : ''} transition-transform`} />
        {!isCollapsed && <span className="animate-in fade-in duration-300">Logout</span>}
      </button>
    </div>
    </aside>
  );
};

export default Sidebar;
