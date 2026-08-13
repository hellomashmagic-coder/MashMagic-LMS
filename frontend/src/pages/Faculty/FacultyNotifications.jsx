import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import {
 Bell,
 BellOff,
 CheckCircle2,
 Clock,
 AlertCircle,
 MailOpen,
 Trash2,
 Calendar,
 ChevronRight,
 SearchX
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const FacultyNotifications = () => {
 const [notifications, setNotifications] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('all');
 const [page, setPage] = useState(1);
 const limit = 50;
 const [totalRecords, setTotalRecords] = useState(0);

 useEffect(() => {
 fetchNotifications();
 }, [page, filter]);

 useEffect(() => {
 setPage(1);
 }, [filter]);

 const fetchNotifications = async () => {
 setLoading(true);
 try {
 const res = await axios.get('/faculty/notifications', {
     params: { page, limit, status: filter }
 });
 if (res.data.success) {
     setNotifications(res.data.data || []);
     setTotalRecords(res.data.total || 0);
 }
 } catch (error) {
 toast.error("Failed to sync notifications");
 } finally {
 setLoading(false);
 }
 };

 const markAsRead = async (id) => {
 try {
 const res = await axios.put(`/faculty/notifications/${id}/read`);
 if (res.data.success) {
 setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
 toast.success("Notification marked as read");
 }
 } catch (error) {
 toast.error("Failed to mark as read");
 }
 };

 const filteredNotifs = notifications;

 const getIcon = (type) => {
 switch (type) {
 case 'Task': return <AlertCircle className="text-rose-500" size={24} />;
 case 'Session': return <Calendar className="text-[#008080]" size={24} />;
 default: return <Bell className="text-slate-600" size={24} />;
 }
 };

 return (
 <div className="space-y-12">
 {/* Header Area */}
 <div className="flex flex-col md:flex-row justify-between items-center gap-8">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Notification Centre</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Real-time system updates and academic alerts</p>
 </div>

 <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
 {['all', 'unread', 'read'].map(f => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-4 md:px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${filter === f ? 'bg-[#008080] text-white shadow-xl shadow-[#008080]/30' : 'text-slate-600 hover:text-white'
 }`}
 >
 {f}
 </button>
 ))}
 </div>
 </div>

 {/* Notifications List */}
 <div className="space-y-6">
 {loading ? (
 [1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)
 ) : filteredNotifs.length > 0 ? (
 filteredNotifs.map((notif) => (
 <div
 key={notif.id}
 onClick={() => !notif.is_read && markAsRead(notif.id)}
 className={`group relative bg-white p-5 md:p-10 rounded-[3rem] border transition-all duration-700 cursor-pointer overflow-hidden ${notif.is_read
 ? 'border-slate-100 opacity-70 grayscale'
 : 'border-[#008080] shadow-2xl shadow-[#008080]/5 hover:-translate-y-1'
 }`}
 >
 {!notif.is_read && (
 <div className="absolute top-0 left-0 w-2 h-full bg-[#008080]"></div>
 )}
 <div className="flex items-start gap-8">
 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${notif.is_read ? 'bg-slate-50' : 'bg-[#008080]/10'
 }`}>
 {getIcon(notif.type)}
 </div>
 <div className="flex-1">
 <div className="flex justify-between items-start mb-2">
 <h3 className={`text-xl font-black tracking-tight ${notif.is_read ? 'text-slate-500' : 'text-slate-900'}`}>
 {notif.title}
 </h3>
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
 <Clock size={12} />
 {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {!notif.is_read && (
 <span className="w-2.5 h-2.5 bg-[#008080] rounded-full animate-ping"></span>
 )}
 </div>
 </div>
 <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-3xl ">
 "{notif.message}"
 </p>
 <div className="mt-6 flex items-center gap-4">
 <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest px-4 py-1.5 bg-[#008080]/10 rounded-full">
 Source: System
 </span>
 {notif.is_read && (
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
 <CheckCircle2 size={12} />
 Read
 </span>
 )}
 </div>
 </div>
 <div className="hidden md:flex items-center justify-center translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 pr-4">
 <ChevronRight className="text-[#008080]" size={32} />
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
 <BellOff size={48} />
 </div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight ">No Notifications</h3>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">No active notifications in this category</p>
 </div>
 )}
 </div>

 {notifications.length > 0 && (
 <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm mt-6">
 <Pagination 
 currentPage={page} 
 totalPages={Math.ceil(totalRecords / limit) || 1} 
 totalRecords={totalRecords} 
 onPageChange={setPage} 
 />
 </div>
 )}
 </div>
 );
};

export default FacultyNotifications;
