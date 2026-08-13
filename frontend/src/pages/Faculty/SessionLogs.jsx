import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Calendar, User, BookOpen, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SessionLogs = () => {
 const [logs, setLogs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');

 const fetchLogs = async () => {
 try {
 const res = await api.get('/faculty/mentor-logs');
 setLogs(res.data.data);
 } catch (error) {
 toast.error("Failed to fetch session audit logs");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchLogs();
 }, []);

 const filteredLogs = logs.filter(l =>
 l.student_name.toLowerCase().includes(search.toLowerCase()) ||
 l.mentor_name?.toLowerCase().includes(search.toLowerCase()) ||
 l.chapter.toLowerCase().includes(search.toLowerCase())
 );

 if (loading) return <div className="p-20 text-center text-slate-600 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Accessing Verification Audit Trail...</div>;

 return (
 <div className="space-y-8 pb-10">
 {/* Page Header */}
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Verification Audit</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Chronological audit ledger of all mentor-student interactions</p>
 </div>

 {/* Action Bar */}
 <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
 <div className="relative w-full md:w-96">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
 <input
 type="text"
 placeholder="Search by student, mentor or unit..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all"
 />
 </div>
 <div className="px-5 py-2.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
 Chronological Ledger
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
 <div className="overflow-x-auto text-left">
 <table className="w-full">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100">
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Student Entity</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Subject Module</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap text-center">Efficiency</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap text-center">Risk Vector</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Operational Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {filteredLogs.length > 0 ? (
 filteredLogs.map((log) => (
 <tr key={log.id} className="hover:bg-emerald-50/20 transition-all group">
 <td className="px-4 md:px-8 py-6 whitespace-nowrap">
 <div className="flex flex-col">
 <span className="text-xs font-black text-slate-900">{new Date(log.date).toLocaleDateString()}</span>
 <span className="text-[9px] font-bold text-slate-600 uppercase mt-1">Session {log.session_number}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 whitespace-nowrap">
 <div className="flex flex-col">
 <span className="text-sm font-black text-slate-700 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{log.student_name}</span>
 <span className="text-[9px] font-bold text-slate-600 uppercase mt-1">Mentor: {log.mentor_name}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 whitespace-nowrap">
 <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/50 inline-block">
 <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{log.chapter}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 text-center whitespace-nowrap">
 <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${log.student_performance === 'Excellent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
 log.student_performance === 'Good' ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' :
 log.student_performance === 'Average' ? 'bg-amber-50 text-amber-600 border-amber-100' :
 'bg-rose-50 text-rose-600 border-rose-100'
 }`}>
 {log.student_performance}
 </span>
 </td>
 <td className="px-4 md:px-8 py-6 text-center whitespace-nowrap">
 <div className="flex items-center justify-center gap-2">
 <div className={`w-2 h-2 rounded-full ${log.risk_level === 'High' ? 'bg-rose-500 animate-pulse' : log.risk_level === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
 <span className={`text-[10px] font-black uppercase tracking-widest ${log.risk_level === 'High' ? 'text-rose-600' : 'text-slate-500'}`}>
 {log.risk_level}
 </span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 min-w-full md:w-[300px]">
 <p className="text-[11px] font-bold text-slate-500 line-clamp-2 leading-relaxed">
 {log.issues_reported || log.topics_covered || 'No operational anomalies documented.'}
 </p>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="6" className="py-20 text-center">
 <AlertCircle size={40} className="mx-auto text-slate-200 mb-4" />
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No verification logs found matching the filter.</p>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};

export default SessionLogs;
