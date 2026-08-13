import React, {  useState, useEffect , useDeferredValue } from 'react';
import {
 Activity,
 ClipboardList,
 Calendar,
 User,
 CheckCircle2,
 Clock,
 Search,
 Filter,
 ArrowUpRight,
 MessageSquare,
 Lock,
 XCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AcademicHeadFacultyActivity = () => {
 const [activeTab, setActiveTab] = useState('sessions');
 const [loading, setLoading] = useState(true);
 const [activities, setActivities] = useState({ sessions: [], reports: [] });
 const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);

 const [editingSession, setEditingSession] = useState(null);
 const [isEditMinutesModalOpen, setIsEditMinutesModalOpen] = useState(false);
 const [newMinutes, setNewMinutes] = useState('');

 useEffect(() => {
 fetchActivity();
 }, []);

 const fetchActivity = async () => {
 try {
 const response = await api.get('/aoe/faculty-activity-logs');
 if (response.data.success) {
 setActivities(response.data.data);
 }
 } catch (error) {
 toast.error("Failed to load activity logs");
 } finally {
 setLoading(false);
 }
 };

 const handleEditMinutesSubmit = async (e) => {
    e.preventDefault();
    if (!newMinutes || isNaN(newMinutes) || parseInt(newMinutes) <= 0) {
      return toast.error("Please enter a valid number of minutes");
    }
    try {
      const res = await api.put(`/mentor/academic-schedule/${editingSession.id}/complete`, {
        minutes_taken: parseInt(newMinutes)
      });
      if (res.data.success) {
        toast.success("Session duration updated successfully");
        setIsEditMinutesModalOpen(false);
        fetchActivity();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update duration");
    }
  };

 const filteredData = activities[activeTab].filter(item => {
 const searchStr = deferredSearchTerm.toLowerCase();
 if (activeTab === 'sessions') {
 return item.faculty_name?.toLowerCase().includes(searchStr) ||
 item.topic?.toLowerCase().includes(searchStr);
 } else {
 return item.faculty_name?.toLowerCase().includes(searchStr) ||
 item.student_name?.toLowerCase().includes(searchStr) ||
 item.remarks?.toLowerCase().includes(searchStr);
 }
 });

 return (
 <div className="flex flex-col gap-10">
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Faculty Activity</h2>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
 <Activity size={14} className="text-[#008080]" />
 Monitoring of faculty sessions and academic reports
 </p>
 </div>

 <div className="flex bg-white p-1.5 rounded-[2rem] border border-slate-100 shadow-sm self-stretch md:self-auto">
 <button
 onClick={() => setActiveTab('sessions')}
 className={`flex-1 md:w-40 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sessions' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-slate-600 hover:text-slate-600'}`}
 >
 Live Sessions
 </button>
 <button
 onClick={() => setActiveTab('reports')}
 className={`flex-1 md:w-40 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-slate-600 hover:text-slate-600'}`}
 >
 Academic Reports
 </button>
 </div>
 </div>

 {/* Filter Bar */}
 <div className="flex flex-col md:flex-row gap-4 items-center">
 <div className="relative flex-1 group w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input
 type="text"
 placeholder={activeTab === 'sessions' ? "Filter by faculty or topic..." : "Filter by faculty, student or remarks..."}
 className="w-full pl-16 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#008080] transition-all shadow-sm"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <button className="p-5 bg-white border border-slate-100 rounded-2xl text-slate-600 hover:text-[#008080] transition-all shadow-sm">
 <Filter size={20} />
 </button>
 </div>

 {/* Content List */}
 <div className="grid grid-cols-1 gap-6 pb-20">
 {loading ? (
 [1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-50 rounded-[3rem] animate-pulse border border-slate-100"></div>)
 ) : filteredData.length === 0 ? (
 <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100">
 <Search className="mx-auto text-slate-100 mb-6" size={60} />
 <h3 className="text-xl font-black text-slate-900 tracking-tight">Zero traces found</h3>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-2">No matching activity records in the current matrix</p>
 </div>
 ) : (
 filteredData.map((item, idx) => (
 <div key={idx} className="bg-white p-5 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-700 group flex flex-col lg:flex-row gap-8 items-start relative overflow-hidden">
 <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full -mr-40 -mt-40 transition-transform duration-700 group-hover:scale-110"></div>

 {/* Icon Section */}
 <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center relative z-10 shrink-0 ${activeTab === 'sessions' ? 'bg-[#008080]/10 text-[#008080]' : 'bg-emerald-50 text-emerald-500'}`}>
 {activeTab === 'sessions' ? <Clock size={32} /> : <ClipboardList size={32} />}
 </div>

 {/* Core Info */}
 <div className="flex-1 relative z-10 space-y-4">
 <div className="flex flex-wrap items-center gap-3">
 <span className="px-5 py-1.5 bg-[#008080] text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
 {activeTab === 'sessions' ? 'Session' : 'Audit Report'}
 </span>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
 <Calendar size={14} />
 {new Date(item.date || item.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
 </span>
 </div>

 <div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight">
 {activeTab === 'sessions' ? item.topic : `Report on ${item.student_name}`}
 </h3>
 <p className="text-slate-500 text-sm font-bold flex items-center gap-2 mt-1">
 <User size={14} className="text-[#008080]" />
 Lead: <span className="text-[#008080]">{item.faculty_name}</span>
 </p>
 </div>

 {activeTab === 'reports' && (
 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed max-w-3xl">
 "{item.remarks}"
 </div>
 )}
 </div>

 {/* Meta Actions */}
 <div className="flex flex-col gap-4 w-full lg:w-48 relative z-10 lg:text-right border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-10">
 {activeTab === 'sessions' ? (
 <div className="space-y-4">
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Attendance</p>
 <p className="text-lg font-black text-slate-900">{item.student_count || 0} Students</p>
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Duration</p>
 <p className="text-sm font-black text-slate-800">{item.minutes_taken ? `${item.minutes_taken} mins` : 'Not recorded'}</p>
 </div>
 <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${item.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
 {item.status}
 </span>
 </div>
 ) : (
 <div className="space-y-4">
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Audit Status</p>
 <p className="text-lg font-black text-slate-900 tracking-tight capitalize">{item.status}</p>
 </div>
 <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-block ${item.type === 'Academic' ? 'bg-[#008080] text-white' : 'bg-rose-100 text-rose-700'
 }`}>
 {item.type} Issue
 </div>
 </div>
 )}

 {activeTab === 'sessions' && item.status === 'Completed' && (
    <button 
      onClick={() => {
        setEditingSession(item);
        setNewMinutes(item.minutes_taken || '');
        setIsEditMinutesModalOpen(true);
      }}
      className="mt-2 flex items-center justify-center lg:justify-end gap-2 text-[10px] font-black text-[#008080] uppercase tracking-widest hover:text-slate-900 transition-all group"
    >
      <Clock size={14} /> Edit Duration
    </button>
  )}

 <button className="mt-2 flex items-center justify-center lg:justify-end gap-2 text-[10px] font-black text-[#008080] uppercase tracking-widest hover:text-[#008080] transition-all group">
 Deep Dive Analysis
 <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>

  {/* Edit Minutes Modal */}
  {isEditMinutesModalOpen && editingSession && (
    <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-5 md:p-10 space-y-8 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#008080] text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Override Duration</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AOE Override</p>
            </div>
          </div>
          <button 
            onClick={() => setIsEditMinutesModalOpen(false)}
            className="w-10 h-10 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl flex items-center justify-center transition-colors"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <p className="text-[10px] font-bold text-indigo-700 uppercase leading-relaxed tracking-wider">
            Editing Session: <span className="font-black">{editingSession.topic}</span><br />
            Faculty: <span className="font-black">{editingSession.faculty_name}</span>
          </p>
        </div>

        <form onSubmit={handleEditMinutesSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Session Minutes Taken</label>
            <div className="relative">
              <input
                type="number"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                placeholder="e.g. 90"
                required
                className="w-full p-5 pl-14 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
              <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#008080]" size={20} />
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" className="flex-1 py-4 bg-[#008080] hover:bg-[#008080] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">Save Changes</button>
            <button type="button" onClick={() => setIsEditMinutesModalOpen(false)} className="px-4 md:px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )}
  </div>
  );
};

export default AcademicHeadFacultyActivity;
