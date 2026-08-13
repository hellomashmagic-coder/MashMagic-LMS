import React, { useState, useEffect } from 'react';
import { Users, BookOpen, UserCheck, Clock, Calendar, ChevronRight, TrendingUp, ShieldCheck, ClipboardList, Activity } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle
}) => {
  const isTeal = color.includes('008080') || color.includes('14B8A6');
  const displayColor = isTeal ? 'bg-[#008080]' : color;
  return <div className="bg-white/80 backdrop-blur-xl p-5 md:p-10 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
 <div className={`absolute -right-4 -top-4 w-32 h-32 ${displayColor} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700`}></div>
 
 <div className="flex flex-col gap-8 relative z-10">
 <div className={`w-16 h-16 ${displayColor.replace('bg-', 'text-')} bg-slate-50/50 rounded-[24px] flex items-center justify-center border border-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-sm`}>
 <Icon size={32} strokeWidth={2.5} />
 </div>
 <div>
 <h3 className="text-3xl md:text-5xl font-black text-slate-800 tabular-nums tracking-tighter leading-none mb-3">{value}</h3>
 <div className="space-y-1">
 <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none">{title}</p>
 {subtitle && <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none opacity-60 ">{subtitle}</p>}
 </div>
 </div>
 </div>
 </div>;
};
const AcademicHeadDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [data, setData] = useState({
    stats: {
      totalStudents: 0,
      totalFaculties: 0,
      totalMentors: 0,
      todaySessions: 0
    },
    schedule: [],
    activityFeed: [],
    examAnalytics: []
  });
  useEffect(() => {
    fetchDashboardData();
  }, []);
  const fetchDashboardData = async () => {
    try {
      const [dashRes, examRes, studentsRes] = await Promise.all([api.get('/aoe/dashboard'), api.get('/aoe/exam-analytics'), api.get('/aoe/students')]);
      if (dashRes.data.success) {
        setData(prev => ({
          ...prev,
          ...dashRes.data.data,
          examAnalytics: examRes.data.success ? examRes.data.data : []
        }));
      }
      if (studentsRes.data.success) {
        setStudents((studentsRes.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };
  const handleStudentChange = async e => {
    const studentId = e.target.value;
    setSelectedStudent(studentId);
    try {
      const params = studentId ? {
        student_id: studentId
      } : {};
      const res = await api.get('/aoe/exam-analytics', {
        params
      });
      if (res.data.success) {
        setData(prev => ({
          ...prev,
          examAnalytics: res.data.data
        }));
      }
    } catch (error) {
      toast.error("Failed to load student exam analytics");
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Loading dashboard data...</p>
 </div>
 </div>;
  }
  return <div className="flex flex-col gap-10 pb-10">
 {/* Header Section */}
 <div className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-10">
 <div className="text-center md:text-left">
 <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4 ">Academic Dashboard</h2>
 <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center md:justify-start gap-3">
 <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
 Overview of student performance and academic activity
 </p>
 </div>
 <div className="flex items-center gap-5">

  <div className="flex items-center gap-4 bg-slate-50/50 px-4 md:px-8 py-5 rounded-[24px] border border-slate-100/50 shadow-inner group">
  <Activity size={20} strokeWidth={3} className="text-[#008080] group-hover:rotate-180 transition-transform duration-700" />
  <span className="text-xs font-black text-slate-600 uppercase tracking-[0.25em] leading-none">{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            })}</span>
  </div>
 </div>
 </div>

 {/* KPI Row */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
 <StatCard title="Total Students" subtitle="Active Enrollments" value={data.stats.totalStudents} icon={Users} color="bg-[#008080]" />
 <StatCard title="Faculty Members" subtitle="Assigned Faculty" value={data.stats.totalFaculties} icon={ShieldCheck} color="bg-[#008080]" />
 <StatCard title="Total Mentors" subtitle="Active Mentors" value={data.stats.totalMentors} icon={UserCheck} color="bg-[#10B981]" />
 <StatCard title="Today's Sessions" subtitle="Scheduled Classes" value={data.stats.todaySessions} icon={Clock} color="bg-[#EF4444]" />
 </div>

 {/* Exam Analytics Graph Section */}
 <section className="bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
 <div>
 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">Exam Performance Analytics</h3>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">Average marks across all academic subjects</p>
 </div>
 <div className="flex items-center gap-5 w-full lg:w-auto">
 <select value={selectedStudent} onChange={handleStudentChange} className="flex-1 lg:min-w-[280px] bg-slate-50/80 border border-slate-100 text-slate-800 text-xs rounded-[20px] px-6 py-4 font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-[#008080]/5 cursor-pointer shadow-inner appearance-none transition-all">
 <option value="">Global Class Average</option>
 {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
 </select>
 <div className="w-14 h-14 bg-[#008080]/10 rounded-[20px] border border-[#008080]/20 flex items-center justify-center text-[#008080] shrink-0 shadow-sm">
 <TrendingUp size={28} />
 </div>
 </div>
 </div>

 <div className="h-[400px] w-full relative">
 {data.examAnalytics.length > 0 ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
 <BarChart data={data.examAnalytics} margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{
              fill: '#94a3b8',
              fontSize: 10,
              fontWeight: 900
            }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{
              fill: '#94a3b8',
              fontSize: 10,
              fontWeight: 900
            }} domain={[0, 100]} />
 <Tooltip cursor={{
              fill: '#f8fafc'
            }} contentStyle={{
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              fontWeight: 'bold'
            }} />
 <Legend wrapperStyle={{
              paddingTop: '20px',
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }} />
 <Bar name="Average Marks (%)" dataKey="percentage" radius={[12, 12, 0, 0]} barSize={60}>
 {data.examAnalytics.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.percentage > 75 ? '#008080' : entry.percentage > 50 ? '#6366F1' : '#F59E0B'} fillOpacity={0.8} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer> : <div className="h-full flex flex-col items-center justify-center text-slate-200">
 <Activity size={60} strokeWidth={1} />
 <p className="text-[10px] font-black uppercase tracking-widest mt-4">No exam data available.</p>
 </div>}
 </div>
 </section>

 {/* Today's Schedule Section */}
 <section className="bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
 <div className="p-6 md:p-12 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
 <div className="text-center sm:text-left">
 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">Academic Timeline</h3>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">Today's scheduled classes and sessions</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="bg-[#10B981]/10 border border-[#10B981]/20 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-sm shadow-sm group">
 <div className="w-2 h-2 bg-[#10B981] rounded-full animate-ping opacity-60"></div>
 <span className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">Live Updates Active</span>
 </div>
 </div>
 </div>

 <div className="p-4">
 {data.schedule.length === 0 ? <div className="py-20 flex flex-col items-center text-center">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
 <Calendar size={40} />
 </div>
 <h4 className="text-lg font-bold text-slate-900 ">No scheduled sessions for today.</h4>
 <p className="text-slate-600 text-sm max-w-xs mx-auto mt-2 font-medium">Any new schedules added by mentors will appear here in real-time.</p>
 </div> : <div className="overflow-x-auto">
 <table className="w-full text-left border-separate border-spacing-y-2">
 <thead>
 <tr>
 <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Timeline</th>
 <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Student & Subject</th>
 <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Faculty In-Charge</th>
 <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
 <th className="px-4 md:px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {data.schedule.map((session, idx) => <tr key={session.id} className="group hover:bg-slate-50/80 transition-all duration-300"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{idx + 1}</td>
 <td className="px-4 md:px-8 py-6 first:rounded-l-[2rem]">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-[#008080]/5 rounded-[18px] flex items-center justify-center text-[#008080] border border-[#008080]/10 group-hover:bg-[#008080] group-hover:text-white transition-all duration-500">
 <Clock size={18} strokeWidth={2.5} />
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="text-base font-black text-slate-800 tracking-tight leading-none ">{session.start_time} — {session.end_time}</span>
 <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">SESSION #{idx + 1}</span>
 </div>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex flex-col">
 <span className="text-sm font-black text-slate-900">{session.student_name}</span>
 <span className="text-[10px] font-bold text-[#008080] uppercase tracking-widest mt-0.5">{session.subject || 'Academic Session'}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
 {session.faculty_name?.charAt(0) || '?'}
 </div>
 <span className="text-sm font-bold text-slate-600">{session.faculty_name || 'Unassigned'}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${session.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : session.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'}`}>
 {session.status}
 </span>
 </td>
 <td className="px-4 md:px-8 py-6 text-right last:rounded-r-[40px]">
 <button className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 hover:text-[#008080] hover:border-[#008080]/40 transition-all hover:shadow-[0_10px_20px_rgba(20,184,166,0.15)] group-hover:-translate-x-2">
 <ChevronRight size={22} strokeWidth={3} />
 </button>
 </td>
 </tr>)}
 </tbody>
 </table>
 </div>}
 </div>
 </section>

 {/* Faculty Intelligence Feed */}
 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
 <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mb-12">
 <div className="text-center sm:text-left">
 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">Activity Feed</h3>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">Recent student reports and interaction updates</p>
 </div>
 <div className="w-14 h-14 bg-[#008080] text-[#008080] rounded-[22px] flex items-center justify-center shadow-2xl relative group">
 <div className="absolute inset-0 bg-[#008080] opacity-0 group-hover:opacity-20 blur-xl transition-all duration-700"></div>
 <Activity size={24} strokeWidth={3} className="relative z-10" />
 </div>
 </div>

 <div className="space-y-6">
 {!data.activityFeed || data.activityFeed.length === 0 ? <p className="text-center py-5 md:py-10 text-slate-600 font-bold ">No activity recorded yet today.</p> : data.activityFeed.map((activity, i) => <div key={i} className="flex gap-8 p-4 md:p-8 rounded-[32px] bg-slate-50/40 border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-[0_15px_40px_rgba(0,0,0,0.04)] transition-all duration-500 group relative overflow-hidden">
 <div className="absolute top-0 right-0 w-24 h-24 bg-[#008080]/5 rounded-bl-[40px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
 <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-white relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-6 ${activity.type === 'Student Report' ? 'bg-[#008080] text-white' : activity.type === 'Student Interaction' ? 'bg-[#10B981] text-white' : 'bg-[#6366F1] text-white'}`}>
 <ClipboardList size={22} strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0 relative z-10">
 <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
 <h4 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">{activity.type} — {activity.student_name}</h4>
 <span className="text-[9px] font-black text-slate-600 bg-white border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest shrink-0">{new Date(activity.date).toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}</span>
 </div>
 <p className="text-sm font-bold text-slate-500 line-clamp-2 mb-4 leading-relaxed opacity-80 decoration-[#008080]/30">"{activity.details || 'No additional details provided.'}"</p>
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-1.5 rounded-full bg-[#008080]"></div>
 <span className="text-[10px] font-black text-[#008080] uppercase tracking-[0.2em]">LOGGED BY: {activity.origin_name}</span>
 </div>
 </div>
 </div>)}
 </div>
 </div>

 <div className="flex flex-col gap-8">
 <div className="bg-[#008080] p-5 md:p-10 rounded-[3rem] text-white flex flex-col justify-between overflow-hidden relative group">
 <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-4">
 <TrendingUp size={20} className="text-emerald-400" />
 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Performance Overview</span>
 </div>
 <h4 className="text-2xl font-black leading-tight">Academic performance <br /><span className="text-[#008080]">trending up</span> by 12.4%</h4>
 </div>
 <div className="relative z-10 mt-10">
 <p className="text-2xl md:text-4xl font-black text-emerald-400 tracking-tighter">Gold</p>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cohort Rating</p>
 </div>
 </div>

 <div className="bg-[#008080] p-6 md:p-12 rounded-[40px] text-white flex flex-col justify-center relative overflow-hidden group shadow-2xl shadow-[#008080]/30 hover:scale-[1.02] transition-all duration-700">
 <div className="absolute left-0 bottom-0 w-64 h-64 bg-black/10 rounded-full -ml-16 -mb-16 blur-3xl group-hover:bg-black/20 transition-all duration-700"></div>
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h4 className="text-3xl font-black mb-3 tracking-tighter uppercase leading-none">System Status</h4>
 <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.25em] max-w-[180px] leading-relaxed">All academic platforms and schedules are running smoothly.</p>
 </div>
 <div className="w-20 h-20 bg-white/10 rounded-[28px] border border-white/20 flex items-center justify-center backdrop-blur-xl group-hover:rotate-12 transition-transform duration-700">
 <ShieldCheck size={40} strokeWidth={2.5} className="text-white" />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>;
};
export default AcademicHeadDashboard;