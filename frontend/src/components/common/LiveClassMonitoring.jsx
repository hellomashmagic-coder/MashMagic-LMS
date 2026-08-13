import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Video, User, BookOpen, Clock, ExternalLink, Search, Filter, Activity, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const checkIsLive = (session, now = new Date()) => {
  if (!session.start_time || !session.end_time || !session.date) return false;
  if (session.status === 'Completed') return false;
  
  const sessionDate = new Date(session.date);
  
  if (
    now.getFullYear() !== sessionDate.getFullYear() ||
    now.getMonth() !== sessionDate.getMonth() ||
    now.getDate() !== sessionDate.getDate()
  ) {
    return false;
  }
  
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = session.start_time.split(':').map(Number);
  const [endH, endM] = session.end_time.split(':').map(Number);
  
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  
  return currentMins >= startMins && currentMins <= endMins;
};

const LiveClassMonitoring = ({ role }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 60000); // Auto refresh every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

 const fetchLiveSessions = async () => {
 try {
 const endpoint = role === 'admin' ? '/admin/live-monitoring' : role === 'academic_operation_executive' ? '/aoe/live-monitoring' : '/academic-head/live-monitoring';
 const res = await api.get(endpoint);
 setSessions(res.data.data);
 } catch (error) {
 toast.error("Failed to fetch live sessions");
 } finally {
 setLoading(false);
 }
 };

  const filteredSessions = sessions.filter(s => 
  s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  s.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  s.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const dataToExport = filteredSessions.map(session => ({
      "Student Name": session.student_name,
      "Registration Number": session.registration_number || 'N/A',
      "Faculty Name": session.faculty_name,
      "Mentor Name": session.mentor_name,
      "Topic": session.topic,
      "Date": session.date,
      "Start Time": session.start_time,
      "End Time": session.end_time,
      "Status": checkIsLive(session, currentTime) ? 'Live' : 'Scheduled',
      "Meeting Link": session.meeting_link || 'Unavailable'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Live_Classes");
    XLSX.writeFile(workbook, "Live_Classes_Monitoring.xlsx");
  };

  if (loading) return <div className="p-4 md:p-8 text-center text-slate-400 font-bold animate-pulse">Scanning Active Classrooms...</div>;

 return (
 <div className="space-y-8 pb-10">
 {/* Control Header */}
 <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
 <div className="flex items-center gap-6">
 <div className="w-14 h-14 bg-[#008080] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#008080]/30">
 <Video size={28} />
 </div>
 <div>
 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Live Class Monitoring</h2>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time oversight of ongoing academic sessions</p>
 </div>
 </div>
 
 <div className="flex items-center gap-4 w-full md:w-auto">
 <div className="relative flex-1 md:w-80">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
 <input 
 type="text" 
 placeholder="Search Student, Faculty or Topic..." 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-inner"
 />
 </div>
 <button onClick={handleExport} className="px-4 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm font-black uppercase text-[10px] flex items-center gap-2">
  <Download size={16} /> Export
 </button>
 <button onClick={fetchLiveSessions} className="p-4 bg-[#008080] text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95">
 <Activity size={20} />
 </button>
 </div>
 </div>

 {/* Live Counter Info */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-[#008080]/10 border border-[#008080] p-6 rounded-3xl">
 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mb-1">Total Running Classes</p>
 <h4 className="text-3xl font-black text-[#008080] leading-none">{filteredSessions.length}</h4>
 </div>
 <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Primary Subjects</p>
 <h4 className="text-3xl font-black text-emerald-700 leading-none">
 {new Set(filteredSessions.map(s => s.topic)).size}
 </h4>
 </div>
 <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
 <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Active Faculties</p>
 <h4 className="text-3xl font-black text-amber-700 leading-none">
 {new Set(filteredSessions.map(s => s.faculty_name)).size}
 </h4>
 </div>
 </div>

 {/* Mentor Breakdown Section */}
 {filteredSessions.length > 0 && (
 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="flex items-center gap-2 mb-6 ml-2">
 <User className="text-[#008080]" size={16} />
 <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Classes per Mentor</h3>
 </div>
 <div className="flex flex-wrap gap-4">
 {Object.entries(
 filteredSessions.reduce((acc, curr) => {
 acc[curr.mentor_name] = (acc[curr.mentor_name] || 0) + 1;
 return acc;
 }, {})
 ).map(([name, count]) => (
 <div key={name} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 group hover:bg-[#008080] hover:text-white transition-all cursor-default animate-in zoom-in-95 duration-500">
 <span className="text-xs font-bold">{name}</span>
 <span className="w-6 h-6 bg-white group-hover:bg-[#008080] group-hover:text-white text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm transition-colors">
 {count}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Class Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredSessions.length > 0 ? (
 filteredSessions.map((session) => (
 <div key={session.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative group overflow-hidden">
  {/* LIVE Badge */}
  <div className="absolute top-6 right-6">
  {checkIsLive(session, currentTime) ? (
  <span className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
  <span className="text-[8px] font-black text-rose-600 uppercase tracking-tighter">Live Monitor</span>
  </span>
  ) : (
  <span className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Scheduled</span>
  </span>
  )}
  </div>

 <div className="flex items-center gap-4 mb-6">
 <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
 <BookOpen size={24} />
 </div>
 <div className="pr-12">
 <h3 className="text-base font-black text-slate-900 leading-tight uppercase truncate">
 {session.topic}
 </h3>
 <div className="flex items-center gap-2 mt-1">
 <Clock size={12} className="text-slate-300" />
 <span className="text-[10px] font-bold text-slate-400 ">
 {session.start_time} - {session.end_time}
 </span>
 </div>
 </div>
 </div>

 <div className="space-y-4 mb-8">
 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#008080] font-black shadow-sm">
 {session.student_name[0]}
 </div>
 <div>
 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Student</p>
 <p className="text-xs font-black text-slate-800">{session.student_name}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Reg #</p>
 <p className="text-[10px] font-black text-slate-900 ">{session.registration_number || 'N/A'}</p>
 </div>
 </div>

 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-rose-600 font-black shadow-sm">
 {session.faculty_name[0]}
 </div>
 <div>
 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Faculty</p>
 <p className="text-xs font-black text-slate-800">{session.faculty_name}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Mentor</p>
 <p className="text-[10px] font-black text-slate-900 ">{session.mentor_name}</p>
 </div>
 </div>
 </div>

 {session.meeting_link ? (
 <a 
 href={session.meeting_link.startsWith('http') ? session.meeting_link : `https://${session.meeting_link}`}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center justify-center gap-3 w-full bg-[#008080] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 group"
 >
 Jump into Session <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
 </a>
 ) : (
 <div className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-slate-200">
 Link Unavailable
 </div>
 )}
 </div>
 ))
 ) : (
 <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
 <Video className="mx-auto text-slate-200 mb-4 animate-bounce" size={48} />
 <h3 className="text-xl font-black text-slate-400 uppercase ">No Live Classes Detected</h3>
 <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-2">Active sessions will appear here automatically</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default LiveClassMonitoring;
