import React, { useState, useEffect, useDeferredValue } from 'react';
import axios from '../../services/api';
import { ClipboardList, Search, Calendar, BookOpen, ArrowUpRight, SearchX, Clock, User, CheckCircle2, XCircle, HelpCircle, ShieldAlert, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
const StudentLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [viewingLog, setViewingLog] = useState(null);
  useEffect(() => {
    fetchLogs();
  }, []);
  const fetchLogs = async () => {
    try {
      const res = await axios.get('/faculty/faculty-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };
  const filteredLogs = logs.filter(l => l.student_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || l.chapter.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || l.mentor_name?.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
  const getHomeworkStatusIcon = status => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'Partially Completed':
        return <HelpCircle size={16} className="text-amber-500" />;
      case 'Not Done':
        return <XCircle size={16} className="text-rose-500" />;
      default:
        return null;
    }
  };
  return <div className="space-y-10">
 {/* Header Area */}
 <div className="flex flex-col md:flex-row justify-between items-center gap-8">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Student Logs</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Mentor-submitted session logs</p>
 </div>

 <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
 <div className="relative group">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input type="text" placeholder="Search by student, chapter or mentor..." className="bg-white border border-slate-200 pl-14 pr-8 py-4 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all shadow-sm min-w-full md:w-[350px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 </div>
 </div>
 </div>

 {/* Logs List - Table View for precise data */}
 <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 font-black text-[10px] text-slate-600 uppercase tracking-widest ">
 <th className="px-4 md:px-8 py-6">Date & Session</th>
 <th className="px-4 md:px-8 py-6">Student & Mentor</th>
 <th className="px-4 md:px-8 py-6">Chapter & Topics</th>
 <th className="px-4 md:px-8 py-6">Homework Status</th>
 <th className="px-4 md:px-8 py-6 text-center">Test Score</th>
 <th className="px-4 md:px-8 py-6 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {loading ? [1, 2, 3, 4, 5].map((i, index) => <tr key={i} className="animate-pulse"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td colSpan="6" className="px-4 md:px-8 py-6 h-20 bg-slate-50/50"></td>
 </tr>) : filteredLogs.length > 0 ? filteredLogs.map((log, index) => <tr key={log.id} className="hover:bg-[#008080]/10/20 transition-all group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex flex-col">
 <span className="font-black text-slate-900 text-sm whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</span>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1 mt-1">
 <Clock size={10} /> Session #{log.session_number}
 </span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex flex-col">
 <span className="font-black text-slate-800 text-sm ">{log.student_name}</span>
 <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest mt-1 flex items-center gap-1">
 <User size={10} /> {log.mentor_name || 'System'}
 </span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="max-w-xs">
 <span className="font-bold text-slate-900 text-xs block truncate">{log.chapter}</span>
 <span className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-1">{log.topics_covered}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/50 w-fit">
 {getHomeworkStatusIcon(log.homework_status)}
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
 {log.homework_status}
 </span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 text-center">
 {log.test_score ? <span className="px-4 py-1.5 bg-[#008080] text-white rounded-full text-[10px] font-black tracking-widest shadow-lg shadow-[#008080]/30">
 {log.test_score}
 </span> : <span className="text-[10px] font-black text-slate-300 uppercase ">No Test</span>}
 </td>
 <td className="px-4 md:px-8 py-6 text-right">
 <button onClick={() => setViewingLog(log)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#008080] hover:border-[#008080] transition-all shadow-sm hover:shadow-md active:scale-95">
 <Eye size={18} />
 </button>
 </td>
 </tr>) : <tr>
 <td colSpan="6" className="py-20 text-center">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
 <SearchX size={40} />
 </div>
 <h3 className="text-xl font-black text-slate-900 tracking-tight ">No logs found</h3>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">We couldn't find any interaction records</p>
 </td>
 </tr>}
 </tbody>
 </table>
 </div>
 </div>

 {/* View Details Modal */}
 {viewingLog && <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
 <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in slide-in-from-bottom-10 duration-500">
 <div className="sticky top-0 bg-white/80 backdrop-blur-xl px-5 md:px-10 py-4 md:py-8 border-b border-slate-100 flex justify-between items-center z-10">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 bg-[#008080]/10 rounded-[2rem] flex items-center justify-center text-[#008080]">
 <BookOpen size={32} />
 </div>
 <div>
 <h2 className="text-2xl font-black text-slate-900 tracking-tight ">Session Report</h2>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1">{viewingLog.student_name} • Session #{viewingLog.session_number}</p>
 </div>
 </div>
 <button onClick={() => setViewingLog(null)} className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90">
 <X size={24} />
 </button>
 </div>

 <div className="p-5 md:p-10 space-y-12">
 {/* Key Performance Indicators */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Performance</p>
 <div className="flex gap-1.5">
 {[1, 2, 3, 4, 5].map(star => <div key={star} className={`w-2.5 h-2.5 rounded-full ${star <= (viewingLog.student_performance || 0) ? 'bg-amber-400' : 'bg-slate-200'}`}></div>)}
 </div>
 </div>
 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Engagement</p>
 <p className="text-sm font-black text-slate-900 uppercase">{viewingLog.engagement_level}</p>
 </div>
 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Risk Level</p>
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${viewingLog.risk_level === 'High' ? 'bg-rose-500 animate-pulse' : viewingLog.risk_level === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
 <span className={`text-[10px] font-black uppercase tracking-widest ${viewingLog.risk_level === 'High' ? 'text-rose-600' : 'text-slate-700'}`}>
 {viewingLog.risk_level}
 </span>
 </div>
 </div>
 <div className="bg-[#008080]/10 p-6 rounded-3xl border border-[#008080]/50">
 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mb-1">Test Result</p>
 <p className="text-sm font-black text-[#008080] ">{viewingLog.test_score || 'Not Conducted'}</p>
 </div>
 </div>

 {/* Detailed Sections */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <div className="space-y-8">
 <div className="relative pl-8 border-l-2 border-slate-100">
 <div className="absolute -left-2 top-0 w-4 h-4 bg-[#008080] rounded-full border-4 border-white shadow-sm"></div>
 <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Subject Context</h4>
 <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">{viewingLog.chapter}</h3>
 <p className="text-sm text-slate-600 font-medium leading-relaxed">{viewingLog.topics_covered}</p>
 </div>

 <div className="relative pl-8 border-l-2 border-slate-100">
 <div className="absolute -left-2 top-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
 <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Homework Assessment</h4>
 <div className="flex items-center gap-2 mb-2">
 {getHomeworkStatusIcon(viewingLog.homework_status)}
 <span className="text-xs font-black text-slate-800 uppercase ">Status: {viewingLog.homework_status}</span>
 </div>
 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
 <p className="text-xs text-slate-500 font-bold leading-relaxed">
 {viewingLog.homework_given || 'No specific homework documented for this session.'}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-8">
 <div className="relative pl-8 border-l-2 border-slate-100">
 <div className="absolute -left-2 top-0 w-4 h-4 bg-rose-500 rounded-full border-4 border-white shadow-sm"></div>
 <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Issues Reported</h4>
 <p className="text-sm text-slate-600 font-medium leading-relaxed bg-rose-50/30 p-4 rounded-2xl border border-rose-100/30">
 {viewingLog.issues_reported || 'No issues reported during this session.'}
 </p>
 </div>

 <div className="relative pl-8 border-l-2 border-slate-100">
 <div className="absolute -left-2 top-0 w-4 h-4 bg-amber-500 rounded-full border-4 border-white shadow-sm"></div>
 <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Remedial Plan</h4>
 <p className="text-sm text-slate-600 font-medium leading-relaxed bg-amber-50/30 p-4 rounded-2xl border border-amber-100/30">
 {viewingLog.remedial_plan || 'Maintaining current academic progress with no adjustments needed.'}
 </p>
 </div>
 </div>
 </div>

 {/* Critical Status Row */}
 <div className="p-4 md:p-8 bg-[#008080] rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
 <div className="relative flex flex-wrap gap-8 items-center">
 <div className="text-center md:text-left">
 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Parent Notification</p>
 <span className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${viewingLog.parent_update_needed === 'Yes' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30/20' : 'bg-slate-800 text-slate-600'}`}>
 {viewingLog.parent_update_needed === 'Yes' ? 'Urgent Required' : 'Not Needed'}
 </span>
 </div>
 <div className="text-center md:text-left">
 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Faculty Attention</p>
 <span className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${viewingLog.faculty_intervention_required === 'Yes' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-600'}`}>
 {viewingLog.faculty_intervention_required === 'Yes' ? 'Action Required' : 'On Track'}
 </span>
 </div>
 </div>

 {viewingLog.screenshot_url && <a href={viewingLog.screenshot_url} target="_blank" rel="noreferrer" className="relative bg-white text-slate-900 px-4 md:px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/20 ">
 View Attachment
 </a>}
 </div>

 {/* Mentor Memo */}
 <div className="bg-slate-50 p-4 md:p-8 rounded-[2.5rem] border border-slate-100">
 <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
 <ShieldAlert size={14} className="text-amber-500" /> Mentor's Internal Memo
 </h4>
 <p className="text-sm text-slate-600 font-bold leading-relaxed">
 "{viewingLog.notes || 'No confidential notes provided for this session.'}"
 </p>
 </div>
 </div>
 </div>
 </div>}
 </div>;
};
export default StudentLogs;