import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../services/api';
import { ChevronLeft, Calendar, BookOpen, ClipboardList, FileText, Plus, User, GraduationCap, TrendingUp, ShieldAlert, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
const StudentDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('academic');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [dailyHours, setDailyHours] = useState([]);

  // Form state for new report
  const [reportForm, setReportForm] = useState({
    type: 'Academic',
    remarks: '',
    action_taken: '',
    status: 'Open',
    follow_up_date: ''
  });
  useEffect(() => {
    fetchStudentData();
  }, [id]);
  const fetchStudentData = async () => {
    try {
      const res = await axios.get(`/faculty/students/${id}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      toast.error("Profile access denied or student not found");
      navigate('/faculty/students');
    } finally {
      setLoading(false);
    }

    // Fetch daily hours
    try {
      const resLogs = await axios.get(`/faculty/daily-hours/${id}`);
      if (resLogs.data.success) {
        setDailyHours(resLogs.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleReportSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/faculty/reports', {
        ...reportForm,
        student_id: id
      });
      if (res.data.success) {
        toast.success("Report submitted successfully");
        setIsReportModalOpen(false);
        fetchStudentData();
      }
    } catch (error) {
      toast.error("Submission failed");
    }
  };
  if (loading) return <div className="animate-pulse space-y-8"><div className="h-64 bg-slate-100 rounded-[3rem]"></div></div>;
  return <div className="space-y-10 pb-20">
 {/* Header */}
 <div className="flex items-center justify-between">
 <button onClick={() => navigate(-1)} className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
 <ChevronLeft size={16} />
 Back to Roster
 </button>
 <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-3 px-4 md:px-8 py-3 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-100">
 <Plus size={16} />
 New Interaction Report
 </button>
 </div>

 {/* Profile Overview Card */}
 <div className="bg-[#008080] rounded-[3.5rem] p-6 md:p-12 text-white relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-80 h-80 bg-[#008080]/10 rounded-full -mr-40 -mt-40 blur-[80px]"></div>
 <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
 <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-700">
 <span className="text-3xl md:text-5xl font-black text-white">{data?.profile?.name?.charAt(0)}</span>
 </div>
 <div className="text-center md:text-left flex-1">
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
 <span className="bg-[#008080] text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">Active Member</span>
 <span className="bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/10">ID: {data?.profile?.roll_number}</span>
 </div>
 <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 ">{data?.profile?.name}</h1>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
 <div>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Department</p>
 <p className="font-bold text-lg">{data?.profile?.department || 'General Academic'}</p>
 </div>
 <div>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Attendance</p>
 <p className="font-bold text-lg text-emerald-400">{data?.profile?.attendance_percentage || '0'}% Avg</p>
 </div>
 <div>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
 <p className="font-bold text-lg">{data?.profile?.performance_status === 'Green' ? 'Good' : data?.profile?.performance_status === 'Yellow' ? 'Average' : data?.profile?.performance_status === 'Red' ? 'Poor' : data?.profile?.performance_status}</p>
 </div>
 <div>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Contact</p>
 <p className="font-bold text-lg">{data?.profile?.phone_number || 'No Phone'}</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Detailed Info Tabs */}
 <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="flex border-b border-slate-100 px-6 md:px-10 pt-8 gap-10 overflow-x-auto no-scrollbar">
 {[{
          id: 'academic',
          label: 'Academic Marks',
          icon: GraduationCap
        }, {
          id: 'attendance',
          label: 'Attendance History',
          icon: Calendar
        }, {
          id: 'interaction',
          label: 'Interaction History',
          icon: ClipboardList
        }, {
          id: 'hours',
          label: 'Daily Hours',
          icon: Clock
        }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-8 flex items-center gap-3 transition-all duration-500 relative group
 ${activeTab === tab.id ? 'text-[#008080] font-black' : 'text-slate-600 font-bold hover:text-slate-600'}
 `}>
 <tab.icon size={18} className={activeTab === tab.id ? 'animate-bounce-slow' : ''} />
 <span className="text-xs uppercase tracking-widest">{tab.label}</span>
 {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#008080] rounded-full animate-in zoom-in duration-300"></div>}
 </button>)}
 </div>

 <div className="p-6 md:p-10">
 {/* Academic Marks Tab */}
 {activeTab === 'academic' && <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-6">
 <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
 <TrendingUp className="text-[#008080]" size={20} />
 Subject Performance
 </h3>
 {data?.marks?.length > 0 ? <div className="space-y-4">
 {data.marks.map((mark, i) => <div key={i} className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100/50 hover:bg-[#008080]/10/30 transition-all duration-500">
 <div>
 <p className="font-black text-slate-900 leading-none mb-1">{mark.subject}</p>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{mark.term || 'Term 1'}</p>
 </div>
 <div className="text-right">
 <p className="text-xl font-black text-[#008080]">{mark.marks}/{mark.total}</p>
 <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Grade: {mark.grade}</p>
 </div>
 </div>)}
 </div> : <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6 md:p-12 text-center">
 <p className="text-slate-600 font-black text-xs uppercase tracking-widest">No mark records found.</p>
 </div>}
 </div>

 {/* Academic Summary Placeholder */}
 <div className="bg-[#008080]/10 overflow-hidden rounded-[2.5rem] p-6 md:p-10 relative">
 <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12">
 <BookOpen size={120} />
 </div>
 <h4 className="text-[#008080] font-black text-xl mb-4 tracking-tight">Faculty Remarks</h4>
 <p className="text-[#008080]/80 text-sm font-medium leading-relaxed ">
 "Student shows strong analytical skills in Core subjects. Continued attention to attendance in practical labs is recommended for overall performance consistency."
 </p>
 <div className="mt-8 pt-8 border-t border-[#008080]/50">
 <button className="text-[#008080] font-black text-[10px] uppercase tracking-widest hover:underline">
 Update Faculty Note
 </button>
 </div>
 </div>
 </div>}

 {/* Attendance Tab */}
 {activeTab === 'attendance' && <div className="space-y-8">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
 <div className="bg-emerald-50 p-4 md:p-8 rounded-[2rem] border border-emerald-100">
 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Present</p>
 <p className="text-3xl font-black text-emerald-700">{data?.attendance?.filter(a => a.status === 'Present').length || 0}</p>
 </div>
 <div className="bg-rose-50 p-4 md:p-8 rounded-[2rem] border border-rose-100">
 <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Absents</p>
 <p className="text-3xl font-black text-rose-700">{data?.attendance?.filter(a => a.status === 'Absent').length || 0}</p>
 </div>
 <div className="bg-[#008080]/10 p-4 md:p-8 rounded-[2rem] border border-[#008080]">
 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mb-1">Status Grade</p>
 <p className="text-3xl font-black text-[#008080]">Excellent</p>
 </div>
 </div>
 <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100">
 <div className="w-full overflow-x-auto">
<table className="w-full text-left">
 <thead>
 <tr>
 <th className="px-4 md:px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Session Topic</th>
 <th className="px-4 md:px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date</th>
 <th className="px-4 md:px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {data?.attendance?.map((att, idx) => <tr key={idx} className="hover:bg-white transition-all">
 <td className="px-4 md:px-8 py-4 font-bold text-slate-900 text-sm">{att.topic}</td>
 <td className="px-4 md:px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{new Date(att.date).toLocaleDateString()}</td>
 <td className="px-4 md:px-8 py-4 text-xs">
 <span className={`px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest shadow-sm ${att.status === 'Present' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
 {att.status}
 </span>
 </td>
 </tr>)}
 </tbody>
 </table>
</div>
 </div>
 </div>}

 {/* Interaction History Tab */}
 {activeTab === 'interaction' && <div className="space-y-6">
 {data?.reports?.length > 0 ? data.reports.map((report, idx) => <div key={idx} className="bg-slate-50 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 relative group hover:bg-white transition-all duration-500 shadow-sm hover:shadow-xl">
 <div className="absolute top-8 right-8">
 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${report.status === 'Open' ? 'bg-[#008080] text-white' : 'bg-[#008080] text-white'}`}>
 {report.status}
 </span>
 </div>
 <div className="flex gap-6 items-start">
 <div className="w-14 h-14 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080]">
 <ShieldAlert size={28} />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <h4 className="text-lg font-black text-slate-900 tracking-tight">{report.type} Issue</h4>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">• {new Date(report.created_at).toLocaleDateString()}</span>
 </div>
 <p className="text-slate-700 text-sm font-medium leading-relaxed mb-6">"{report.remarks}"</p>
 <div className="bg-white/50 p-6 rounded-3xl border border-slate-100">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Action Taken</p>
 <p className="text-slate-900 text-sm font-bold">{report.action_taken || 'Awaiting update...'}</p>
 </div>
 </div>
 </div>
 </div>) : <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
 <Plus size={48} className="mx-auto text-slate-300 mb-4" />
 <p className="text-slate-600 font-black text-xs uppercase tracking-widest">No interaction history recorded.</p>
 </div>}
 </div>}

 {/* Daily Hours Tab */}
 {activeTab === 'hours' && <div className="space-y-6">
 <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
 <Clock className="text-[#008080]" size={20} />
 Daily Logged Hours (By Mentor)
 </h3>
 {dailyHours.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {dailyHours.map(log => <div key={log.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Date</span>
 <span className="text-sm font-bold text-slate-700">{new Date(log.date).toLocaleDateString()}</span>
 </div>
 <div className="flex flex-col gap-1 text-right">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hours Logged</span>
 <span className="text-xl font-black text-[#008080]">{log.hours} Hrs</span>
 </div>
 </div>)}
 </div> : <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
 <Clock size={48} className="mx-auto text-slate-300 mb-4" />
 <p className="text-slate-600 font-black text-xs uppercase tracking-widest">No daily hours logged yet.</p>
 </div>}
 </div>}
 </div>
 </div>

 {/* Interaction Report Modal */}
 {isReportModalOpen && <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-3xl bg-[#008080]/10 animate-in fade-in duration-300">
 <div className="bg-white w-full max-w-2xl rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
 <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center text-white bg-[#008080] relative">
 <div className="absolute top-0 right-0 w-40 h-40 bg-[#008080]/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
 <div className="relative">
 <h3 className="text-2xl font-black tracking-tight ">Submit Report</h3>
 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">MashMagic Academic Platform</p>
 </div>
 <button onClick={() => setIsReportModalOpen(false)} className="text-slate-600 hover:text-white transition-colors relative">
 <ChevronLeft size={24} className="rotate-90" />
 </button>
 </div>
 <form onSubmit={handleReportSubmit} className="p-6 md:p-12 space-y-8">
 <div className="grid grid-cols-2 gap-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4">Interaction Type</label>
 <select className="w-full px-4 md:px-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all cursor-pointer" value={reportForm.type} onChange={e => setReportForm({
                ...reportForm,
                type: e.target.value
              })}>
 <option>Academic</option>
 <option>Behaviour</option>
 <option>Attendance</option>
 <option>Counseling</option>
 </select>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4">Follow-up Date</label>
 <input type="date" className="w-full px-4 md:px-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all" value={reportForm.follow_up_date} onChange={e => setReportForm({
                ...reportForm,
                follow_up_date: e.target.value
              })} />
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4">Observation Remarks</label>
 <textarea placeholder="Enter detailed observation notes..." rows="3" className="w-full px-4 md:px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all resize-none" value={reportForm.remarks} onChange={e => setReportForm({
              ...reportForm,
              remarks: e.target.value
            })} required />
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4">Action Taken / Proposed</label>
 <textarea placeholder="Planned corrective actions..." rows="2" className="w-full px-4 md:px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all resize-none" value={reportForm.action_taken} onChange={e => setReportForm({
              ...reportForm,
              action_taken: e.target.value
            })} />
 </div>

 <div className="flex gap-4 pt-6">
 <button type="button" onClick={() => setIsReportModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
 Cancel
 </button>
 <button type="submit" className="flex-[2] py-5 bg-[#008080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#008080] transition-all shadow-xl shadow-[#008080]/30">
 Save Report
 </button>
 </div>
 </form>
 </div>
 </div>}
 </div>;
};
export default StudentDetails;