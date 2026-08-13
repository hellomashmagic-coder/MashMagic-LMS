import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Bell, ChevronDown, CheckCircle, LogOut, Settings, User, Menu, Check, X, CheckCheck, ShieldCheck, Activity, GraduationCap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { premiumConfirm } from '../utils/premiumConfirm';
import mlogo from '../assets/mlogo.png';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const adminName = user?.name || "Super Admin";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const profileRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    if (user && isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    window.refetchNotifications = fetchNotifications;
    return () => { delete window.refetchNotifications; };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        performSearch();
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    try {
      setIsSearching(true);
      const token = sessionStorage.getItem('token');
      // Generic search endpoint for students
      const res = await axios.get(`/api/mentor/students?search=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSearchResults(res.data.data.slice(0, 8)); // Limit to top 8
        setIsSearchOpen(true);
      }
    } catch (error) {
      console.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (student) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    // Navigate based on role or to a common details page
    if (user?.role === 'mentor') {
      navigate(`/mentor/students/${student.id}`);
    } else if (user?.role === 'academic_head' || user?.role === 'super_admin') {
      navigate(`/academic-head/students/edit/${student.id}`);
    } else {
      navigate(`/mentor/students/${student.id}`);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (e) {}
  };

  const markRead = async (id, e) => {
    e.stopPropagation();
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/admin/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {}
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`/api/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {}
  };

  const handleQuickApprove = async (notif, e) => {
    e.stopPropagation();
    try {
      const token = sessionStorage.getItem('token');
      const role = notif.action_type.split('_')[0]; 
      await axios.put(`/api/admin/approve/${notif.related_id}`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Approved successfully");
      fetchNotifications();
      if (window.refetchNotifications) window.refetchNotifications();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleQuickReject = async (notif, e) => {
    e.stopPropagation();
    try {
      const token = sessionStorage.getItem('token');
      const role = notif.action_type.split('_')[0];
      await axios.put(`/api/admin/reject/${notif.related_id}`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rejected successfully");
      fetchNotifications();
      if (window.refetchNotifications) window.refetchNotifications();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const clearAllNotifications = async () => {
    premiumConfirm(async () => {
      try {
        const token = sessionStorage.getItem('token');
        await axios.delete('/api/admin/notifications/clear-all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications([]);
        toast.success("All notifications cleared");
      } catch (error) {
        toast.error("Failed to clear notifications");
      }
    }, {
      title: 'Clear Notifications',
      message: 'Are you sure you want to clear all notifications? This action will hide all alerts from your view.',
      type: 'warning'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSettingsClick = () => {
    setIsProfileOpen(false);
    const rolePaths = {
      'super_admin': '/admin/account-settings',
      'admin': '/admin/account-settings',
      'mentor_head': '/mentor-head/account-settings',
      'academic_head': '/academic-head/account-settings',
      'mentor': '/mentor/account-settings',
      'faculty': '/faculty/account-settings',
      'ssc': '/ssc/account-settings'
    };
    const path = rolePaths[user?.role];
    if (path) {
      navigate(path);
    } else {
      toast.error('Settings route not defined');
    }
  };

  const handleProfileClick = () => {
    setIsProfileOpen(false);
    const rolePaths = {
      'super_admin': '/admin/profile',
      'admin': '/admin/profile',
      'mentor_head': '/mentor-head/profile',
      'academic_head': '/academic-head/profile',
      'mentor': '/mentor/profile',
      'faculty': '/faculty/profile',
      'ssc': '/ssc/profile'
    };
    const path = rolePaths[user?.role];
    if (path) {
      navigate(path);
    } else {
      toast.error('Profile route not defined for this role');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <nav
      className={`sticky top-0 z-[900] w-full transition-all duration-300 bg-gradient-to-r from-[#008080]/10 via-white/70 to-[#008080]/5 backdrop-blur-2xl border-b border-[#008080]/10 ${
        isScrolled
          ? 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
          : 'shadow-sm shadow-[#008080]/5'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Menu toggle + Logo + Product Name */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onMenuClick}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100 active:scale-95"
            >
              <Menu size={22} />
            </button>
            <img 
              src={mlogo} 
              alt="Mash Magic Logo" 
              className="w-9 h-9 object-contain hidden md:block scale-150 ml-2 mr-1" 
            />
            <span className="font-semibold text-slate-900 tracking-tight hidden sm:block uppercase tracking-widest text-sm">
              {user?.role ? user.role.replace('_', ' ') : 'MASH MAGIC'}
            </span>
          </div>

          {/* Center: Smart Search Bar */}
          <div className="flex-1 max-w-md px-6 hidden md:block" ref={searchRef}>
            <div
              className={`relative flex items-center w-full transition-all duration-300 ease-out ${
                isSearchFocused ? 'scale-[1.02]' : 'scale-100'
              }`}
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search
                  className={`w-4 h-4 transition-colors duration-300 ${
                    isSearchFocused ? 'text-slate-900' : 'text-slate-400'
                  }`}
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    performSearch();
                  }
                }}
                className="block w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200/60 rounded-full text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:bg-white focus:border-slate-300 shadow-inner transition-all duration-300"
                placeholder="Search students by name or ID..."
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                onBlur={() => setIsSearchFocused(false)}
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
                  <RefreshCw className="w-3 h-3 text-[#008080] animate-spin" />
                </div>
              )}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
                  ⌘K
                </span>
              </div>

              {/* Global Search Results Dropdown */}
              {isSearchOpen && (searchResults.length > 0 || isSearching) && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden z-[1001] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 max-h-[400px] overflow-y-auto">
                    {isSearching && searchResults.length === 0 ? (
                      <div className="p-4 md:p-8 text-center">
                        <RefreshCw className="w-6 h-6 text-[#008080] animate-spin mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching Database...</p>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 mb-2 border-b border-slate-50">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Results</span>
                        </div>
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#008080] group-hover:text-white transition-all">
                              <GraduationCap size={18} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-900 leading-tight">{result.name}</h4>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">ID: {result.student_id} • {result.course || 'Regular Batch'}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-[#008080] transition-colors" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Press Enter for Advanced Search</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search Icon */}
          <div className="flex md:hidden ml-auto mr-2">
            <button className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Status Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium tracking-wide">Verified Hub</span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1"></div>

            {/* Action Icons */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => window.location.reload()}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[14px] transition-all duration-200 hover:scale-105 active:scale-95"
                title="Refresh Panel"
              >
                <RefreshCw className="w-4.5 h-4.5" strokeWidth={2} />
              </button>

              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setIsProfileOpen(false);
                  }}
                  className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[14px] transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Bell className="w-4.5 h-4.5" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>

                {/* Notifications Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="fixed inset-x-4 top-16 md:absolute md:inset-auto md:right-0 md:top-full md:mt-4 md:w-[420px] bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden z-[1000] flex flex-col transition-all duration-200 origin-top-right scale-100 opacity-100 max-h-[calc(100vh-100px)] md:max-h-[500px]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Activity size={16} className="text-emerald-500" />
                          Activity Feed
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <button 
                            onClick={clearAllNotifications}
                            className="text-[10px] font-semibold text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          >
                            Clear All
                          </button>
                        )}
                        <span className="text-[10px] font-medium text-white bg-[#008080] px-2 py-0.5 rounded-full">{unreadCount} New</span>
                      </div>
                    </div>
                    
                    <div className="overflow-y-auto p-2 space-y-1 flex-grow">
                      {notifications.length === 0 ? (
                        <div className="py-6 md:py-12 flex flex-col items-center justify-center text-slate-400">
                          <Bell size={24} className="mb-2 opacity-20" />
                          <p className="text-xs font-medium">All caught up!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`group relative p-3 rounded-2xl transition-all border border-transparent ${
                              notif.is_read ? 'hover:bg-slate-50' : 'bg-emerald-50/30 hover:bg-emerald-50/50'
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                notif.is_read ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                <Bell size={14} />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div 
                                  className={`text-xs leading-relaxed ${notif.is_read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}
                                  dangerouslySetInnerHTML={{ __html: notif.message }}
                                />
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              
                              <div className="absolute right-2 top-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                {notif.action_type && (
                                  <>
                                    <button 
                                      onClick={(e) => handleQuickApprove(notif, e)} 
                                      className="p-1.5 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-full shadow-sm transition-colors"
                                      title="Approve"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button 
                                      onClick={(e) => handleQuickReject(notif, e)}
                                      className="p-1.5 bg-white text-red-500 hover:bg-red-500 hover:text-white rounded-full shadow-sm transition-colors"
                                      title="Reject"
                                    >
                                      <X size={12} />
                                    </button>
                                  </>
                                )}
                                {!notif.is_read && !notif.action_type && (
                                  <button 
                                    onClick={(e) => markRead(notif.id, e)} 
                                    className="p-1.5 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-full shadow-sm transition-colors"
                                    title="Mark read"
                                  >
                                    <CheckCheck size={12} />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => deleteNotification(notif.id, e)}
                                  className="p-1.5 bg-white text-slate-400 hover:bg-red-500 hover:text-white rounded-full shadow-sm transition-colors"
                                  title="Delete"
                                >
                                  <ShieldCheck className="rotate-45" size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsDropdownOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                {user?.profile_pic ? (
                  <img src={user.profile_pic} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200">
                    <User size={14} />
                  </div>
                )}
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{adminName}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              <div
                className={`absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-[18px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-2 transition-all duration-200 origin-top-right ${
                  isProfileOpen
                    ? 'opacity-100 scale-100 translate-y-0 visible'
                    : 'opacity-0 scale-95 -translate-y-2 invisible'
                }`}
              >
                <div className="px-4 py-2 border-b border-slate-50 mb-1 bg-slate-50/50 mx-2 rounded-xl">
                  <p className="text-sm font-medium text-slate-900 truncate">{adminName}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
                
                <div className="px-2 mt-2">
                  <button onClick={handleProfileClick} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-[12px] transition-colors">
                    <User className="w-4 h-4" /> My Profile
                  </button>
                  <button onClick={handleSettingsClick} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-[12px] transition-colors">
                    <Settings className="w-4 h-4" /> Account Settings
                  </button>
                </div>
                
                <div className="h-px bg-slate-50 my-2 mx-4"></div>
                
                <div className="px-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-[12px] transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
