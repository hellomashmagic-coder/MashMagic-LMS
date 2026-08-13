import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import InteractionFormUI from '../../components/common/InteractionFormUI';
import {
 MessageSquare, CheckCircle, ArrowLeft, Target, AlertCircle, BarChart3,
 CloudLightning, FileText, Camera, Phone, UserCheck, HeartPulse, Brain,
 Clock, Activity, BookOpen, Smile, Plus, Frown, Meh, MoreHorizontal, Upload, ImageIcon, Loader2, Zap, TrendingUp, ShieldAlert, CheckCircle2, ChevronRight, XCircle, Play, Pause, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import MultiDatePicker from 'react-multi-date-picker';
const DatePicker = MultiDatePicker.default ? MultiDatePicker.default : MultiDatePicker;

// Get today's date as YYYY-MM-DD local string
const getTodayStr = () => {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
// Subtract 1 day from a YYYY-MM-DD string
const subtractOneDay = (dateStr) => {
 const d = new Date(dateStr + 'T00:00:00');
 d.setDate(d.getDate() - 1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const StudentInteractionLog = () => {
 const location = useLocation();
 const navigate = useNavigate();

 const [loading, setLoading] = useState(false);
 const [assignedLoading, setAssignedLoading] = useState(true);
 const [submitted, setSubmitted] = useState(false);
 const [allStudents, setAllStudents] = useState([]);
 const [assignedStudents, setAssignedStudents] = useState([]);
 const [yesterdayPending, setYesterdayPending] = useState([]);
 const [selectedStudent, setSelectedStudent] = useState(null);
 const [isYesterdayLog, setIsYesterdayLog] = useState(false);
 const [activeTab, setActiveTab] = useState('both'); // 'both', 'mentorship', 'tuition'
 const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'completed', 'yesterday'
 
 // View report modal for completed students
 const [viewReportModal, setViewReportModal] = useState(null); // { student, reportData, sessionType }
 const [viewReportLoading, setViewReportLoading] = useState(false);

 // Form States
 const [isPaused, setIsPaused] = useState(false);
 const [sessionType, setSessionType] = useState(null); // 'DEEP', 'MEDIUM', 'QUICK', 'CANCELLED'
 const [formData, setFormData] = useState({});
 const [files, setFiles] = useState([]);
 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

 useEffect(() => {
   fetchAssignedStudents();
   fetchYesterdayPending();
   fetchAllStudents();
 }, [selectedDate]);

 const fetchAssignedStudents = async () => {
   setAssignedLoading(true);
   try {
     const res = await api.get(`/mentor-interactions/daily-assignments?date=${selectedDate}`);
     setAssignedStudents(res.data.data);
     if (res.data.is_paused !== undefined) {
       setIsPaused(res.data.is_paused);
     }
   } catch (error) {
     toast.error("Failed to load daily assignments");
   } finally {
     setAssignedLoading(false);
   }
 };

 const fetchYesterdayPending = async () => {
   try {
     // Pass selectedDate so backend calculates "day before selectedDate" correctly
     const res = await api.get(`/mentor-interactions/yesterday-pending?date=${selectedDate}`);
     setYesterdayPending(res.data.data || []);
   } catch (error) {
     console.error("Failed to load yesterday's pending:", error);
     setYesterdayPending([]);
   }
 };

 const handleTogglePause = async () => {
   try {
     const res = await api.post('/mentor-interactions/toggle-pause');
     setIsPaused(res.data.is_paused);
     toast.success(res.data.is_paused ? "Interaction Rotation Paused" : "Interaction Rotation Resumed");
     fetchAssignedStudents();
   } catch (error) {
     toast.error("Failed to toggle pause status");
   }
 };

 const handleViewCompletedReport = async (student) => {
    setViewReportLoading(true);
    try {
      const res = await api.get(`/mentor-interactions/report/${student.id}/today?date=${selectedDate}`);
      setViewReportModal({
        student,
        reportData: res.data.data || {},
        sessionType: res.data.session_type || student.sessionType || 'QUICK'
      });
    } catch (error) {
      toast.error('Could not load interaction report for this date');
    } finally {
      setViewReportLoading(false);
    }
  };

 const fetchAllStudents = async () => {
   try {
     const res = await api.get('/mentor/students');
     setAllStudents(res.data.data);
   } catch (error) {
     console.error("Failed to load all students");
   }
 };

 const handleStudentSelect = (student, type, isYesterday = false) => {
   setSelectedStudent(student);
   setSessionType(type || 'TUITION');
   setSubmitted(false);
   setFiles([]);
   setIsYesterdayLog(isYesterday);
   
   // Initialize form data based on type
   if (type === 'DEEP') {
     setFormData({
       student_status_before: 'Yes',
       main_problem: 'No major issue',
       root_cause: '',
       mentor_guidance: '',
       action_plan: '',
       student_response: 'Positive / motivated',
       followup_required: 'No',
       followup_when: 'Tomorrow',
       attention_level: 'Stable',
       next_session_type: 'MEDIUM'
     });
   } else if (type === 'MEDIUM') {
     setFormData({
       progress: 'Good',
       class_attendance: 'Regular',
       issue_found: 'No',
       issue_category: 'Academic',
       quick_guidance: '',
       next_task: '',
       upgrade_to_deep: 'No',
       next_session_type: 'QUICK'
     });
   } else if (type === 'QUICK') {
     setFormData({
       availability: 'Attended call',
       study_status: 'Studied properly',
       attendance: 'Attended',
       immediate_concern: 'No',
       immediate_concern_category: 'Academic',
       next_session_type: 'QUICK',
       quick_notes: ''
     });
   } else {
     // Simple Tuition Tracking
     setFormData({
       date: new Date().toISOString().split('T')[0],
       attendance: 'Present',
       notes: ''
     });
   }
 };

 const handleChange = (e) => {
   const { name, value } = e.target;
   setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = async (e) => {
   e.preventDefault();
   setLoading(true);

    try {
      if (sessionType === 'CANCELLED') {
        if (!formData.cancel_reason) {
          toast.error("Cancellation Reason is mandatory");
          setLoading(false);
          return;
        }
      } else if (sessionType === 'DEEP') {
        if (!formData.action_plan || !formData.main_problem || !formData.root_cause || !formData.mentor_guidance) {
          toast.error("Please fill all mandatory fields (Problem, Root Cause, Guidance, and Action Plan)");
          setLoading(false);
          return;
        }
      } else if (sessionType === 'MEDIUM') {
        if (!formData.next_task) {
          toast.error("Next Task is mandatory for Medium sessions");
          setLoading(false);
          return;
        }
      } else if (sessionType === 'QUICK') {
        if (!formData.study_status) {
          toast.error("Today's Study Status is mandatory");
          setLoading(false);
          return;
        }
      }

     if (sessionType === 'TUITION') {
       // Old legacy logging or simple tracking for tuition
       await api.post('/mentor/student-log', {
         ...formData,
         student_id: selectedStudent.id,
         student_name: selectedStudent.name,
         connection_method: 'Other',
         mentor_notes: formData.notes
       });
     } else {
       // New Structured Interaction System
       const formDataObj = new FormData();
       formDataObj.append('student_id', selectedStudent.id);
       formDataObj.append('session_type', sessionType);
       formDataObj.append('next_session_type', formData.next_session_type || 'QUICK');
       formDataObj.append('report_data', JSON.stringify(formData));
       
       if (isYesterdayLog) {
           // Interaction date = selectedDate - 1
           formDataObj.append('interaction_date', subtractOneDay(selectedDate));
       }
       
       if (files && files.length > 0) {
           files.forEach(file => {
               formDataObj.append('files', file);
           });
       }

       await api.post('/mentor-interactions/submit-report', formDataObj, {
           headers: { 'Content-Type': 'multipart/form-data' }
       });
     }

     toast.success("Interaction submitted successfully!");
     setSubmitted(true);
     fetchAssignedStudents(); // Refresh daily list
     fetchYesterdayPending(); // Refresh yesterday pending list
     fetchAllStudents(); // Refresh all students list
    } catch (error) {
     console.error('Submission error:', error?.response?.data || error?.message || error);
     const msg = error?.response?.data?.message || error?.message || 'Submission failed';
     toast.error(msg);
    } finally {
     setLoading(false);
    }
 };

 const isDiamondCategory = (s) => {
    if (!s) return false;
    const badge = s.badge?.toLowerCase();
    const type = s.enrollment_type?.toLowerCase();
    return badge === 'diamond' || 
           type === 'both' || 
           type === 'mentorship and tuition' || 
           type === 'mentorship & tuition' || 
           type === 'mentorship + tuition' ||
           (type && type.includes('mentorship') && type.includes('tuition'));
  };

 const isGoldCategory = (s) => {
    if (!s) return false;
    if (isDiamondCategory(s)) return false;
    const badge = s.badge?.toLowerCase();
    const type = s.enrollment_type?.toLowerCase();
    return badge === 'gold' || 
           (type && type.includes('mentorship')) ||
           type === 'mentorship only';
  };

 const getSessionIcon = (type) => {
   switch(type) {
     case 'DEEP': return <Activity className="text-rose-500" size={20} />;
     case 'MEDIUM': return <TrendingUp className="text-amber-500" size={20} />;
     case 'QUICK': return <Zap className="text-blue-500" size={20} />;
     default: return <UserCheck className="text-slate-400" size={20} />;
   }
 };

 const getSessionColor = (type) => {
   switch(type) {
     case 'DEEP': return 'bg-rose-50 border-rose-100 text-rose-600';
     case 'MEDIUM': return 'bg-amber-50 border-amber-100 text-amber-600';
     case 'QUICK': return 'bg-blue-50 border-blue-100 text-blue-600';
     default: return 'bg-slate-50 border-slate-100 text-slate-600';
   }
 };

 const getInteractionDisplayCount = (student) => {
   if (!student) return null;
   const possibleCount =
     student.today_interaction_number ??
     student.interaction_number ??
     student.today_interaction_count ??
     student.interaction_count_today ??
     student.interactions_today ??
     student.interactionCount ??
     student.session_count_today;
   return typeof possibleCount === 'number' && possibleCount > 0 ? possibleCount : null;
 };

 // Main List Screen
 if (!selectedStudent) {
   return (
     <div className="max-w-6xl mx-auto p-4 md:p-10 pb-20 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
       <header className="bg-white/70 backdrop-blur-xl p-4 md:p-8 md:p-14 rounded-[40px] md:rounded-[48px] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col md:flex-row justify-between items-center gap-10">
         <div className="text-center md:text-left">
           <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-4">Mentor Execution Hub</h1>
           <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-3 justify-center md:justify-start">
             <div className="w-2 h-2 rounded-full bg-[#008080] animate-ping"></div>
             Decision-Driven Mentorship Platform
           </p>
         </div>
           <div className="flex gap-2 sm:gap-4 flex-wrap sm:flex-nowrap justify-center sm:justify-start w-full md:w-auto">
              <div className="flex-1 min-w-[80px] p-3 sm:p-6 bg-rose-50 rounded-[1.5rem] sm:rounded-3xl border border-rose-100 text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-rose-600 uppercase mb-1">Deep</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-900">{assignedStudents.filter(s => s.sessionType === 'DEEP').length || 0}</p>
              </div>
              <div className="flex-1 min-w-[80px] p-3 sm:p-6 bg-amber-50 rounded-[1.5rem] sm:rounded-3xl border border-amber-100 text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase mb-1">Med</p>
                  <p className="text-xl sm:text-2xl font-black text-amber-900">{assignedStudents.filter(s => s.sessionType === 'MEDIUM').length || 0}</p>
              </div>
              <div className="flex-1 min-w-[80px] p-3 sm:p-6 bg-blue-50 rounded-[1.5rem] sm:rounded-3xl border border-blue-100 text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase mb-1">Quick</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-900">{assignedStudents.filter(s => s.sessionType === 'QUICK').length || 0}</p>
              </div>
           </div>
        </header>

        <div className="space-y-4">
         {/* Main Category Tabs & Pause Toggle */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-2 bg-white/50 backdrop-blur-md rounded-[28px] border border-slate-200/50 relative md:sticky md:top-4 z-20 md:z-50 shadow-sm">
           <div className="flex flex-wrap gap-4 flex-1 w-full">
             {[
               { id: 'both', label: `Mentorship + Tuition (${allStudents.filter(isDiamondCategory).length})`, color: 'bg-purple-600' },
               { id: 'mentorship', label: `Mentorship Only (${allStudents.filter(isGoldCategory).length})`, color: 'bg-amber-500' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex-1 py-4 px-6 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'text-slate-600 hover:bg-white'}`}
               >
                 {tab.label}
               </button>
             ))}
           </div>
           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
              {/* Date Picker - AOE style, blocks future dates */}
              <div className="relative z-50 w-full sm:w-auto">
                <DatePicker
                  value={selectedDate}
                  onChange={(dateObj) => {
                    if (dateObj) {
                      const formatted = dateObj.format('YYYY-MM-DD');
                      setSelectedDate(formatted);
                      setStatusFilter('pending');
                    }
                  }}
                  placeholder="Select Date"
                  inputClass="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-[#008080] cursor-pointer min-w-[140px]"
                  containerClassName="relative z-50 w-full"
                />
              </div>
             <button
               onClick={handleTogglePause}
               className={`w-full sm:w-auto justify-center px-6 py-3 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${isPaused ? 'bg-red-500 text-white shadow-red-200 shadow-lg' : 'bg-green-500 text-white shadow-green-200 shadow-lg'}`}
             >
               {isPaused ? <Play fill="currentColor" size={16} /> : <Pause fill="currentColor" size={16} />}
               {isPaused ? 'Resume Rotation' : 'Pause Rotation'}
             </button>
           </div>
         </div>

         {!!isPaused && (
           <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
             <AlertCircle className="text-rose-500" size={24} />
             <p className="text-[11px] font-black text-rose-700 lowercase tracking-widest">Interaction Rotation is currently paused. You will not receive new assignments until you resume.</p>
           </div>
         )}

         {/* Sub-Tabs: Status Filter */}
         <div className="flex flex-col sm:flex-row justify-center gap-3 w-full py-1 px-1">
           <button
             onClick={() => setStatusFilter('pending')}
             className={`w-full sm:w-auto shrink-0 px-4 md:px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center sm:justify-start gap-3 ${statusFilter === 'pending' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-rose-200'}`}
           >
             <div className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'pending' ? 'bg-white animate-pulse' : 'bg-rose-500'}`}></div>
             {selectedDate === getTodayStr() ? 'Student Interaction' : `Interactions (${selectedDate})`} ({
               assignedStudents.filter(s => s.status?.toUpperCase() !== 'COMPLETED' && s.status?.toUpperCase() !== 'CANCELLED' && (activeTab === 'both' ? isDiamondCategory(s) : isGoldCategory(s))).length
             })
           </button>
           <button
             onClick={() => setStatusFilter('completed')}
             className={`w-full sm:w-auto shrink-0 px-4 md:px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center sm:justify-start gap-3 ${statusFilter === 'completed' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-emerald-200'}`}
           >
             <div className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'completed' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></div>
             Completed {selectedDate === getTodayStr() ? 'Today' : selectedDate} ({
               assignedStudents.filter(s => (s.status?.toUpperCase() === 'COMPLETED' || s.status?.toUpperCase() === 'CANCELLED') && (activeTab === 'both' ? isDiamondCategory(s) : isGoldCategory(s))).length
             })
           </button>
           <button
             onClick={() => setStatusFilter('yesterday')}
             className={`w-full sm:w-auto shrink-0 px-4 md:px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center sm:justify-start gap-3 ${statusFilter === 'yesterday' ? 'bg-amber-500 text-white shadow-xl shadow-amber-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-amber-200'}`}
           >
             <div className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'yesterday' ? 'bg-white animate-pulse' : 'bg-amber-500'}`}></div>
             {selectedDate === getTodayStr() ? 'Yesterday Pending' : `${subtractOneDay(selectedDate)} Pending`} ({yesterdayPending.length})
           </button>
         </div>
       </div>

        {/* Main Content Area */}
        <div className="min-h-[400px]">
          {selectedDate > getTodayStr() ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Calendar size={40} className="text-slate-300" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center max-w-sm">
                Tomorrow's interactions will be visible tomorrow. <br/>
                <span className="text-[10px] text-slate-400">Please select today or a past date to view interactions.</span>
              </p>
            </div>
          ) : assignedLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 size={40} className="animate-spin text-[#008080]" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Data...</p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-500">
             {statusFilter !== 'yesterday' && activeTab !== 'tuition' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-4">
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                         <ShieldAlert size={18} className="text-[#008080]" /> 
                         {statusFilter === 'pending' ? 'Student Interaction Fleet' : 'Concluded Interactions'}
                     </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(assignedStudents.length > 0 ? assignedStudents : [])
                       .filter(s => {
                         const matchesStatus = statusFilter === 'completed' 
                           ? (s.status === 'COMPLETED' || s.status === 'CANCELLED') 
                           : (s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
                         const matchesTab = activeTab === 'both' ? isDiamondCategory(s) : isGoldCategory(s);
                         return matchesStatus && matchesTab;
                       })
                       .map(student => {
                         const sessionType = student.sessionType || 'QUICK';
                         const isCompleted = student.status === 'COMPLETED';
                         const isCancelled = student.status === 'CANCELLED';
                         return (
                           <div
                             key={student.id}
                             onClick={() => {
                                if (statusFilter === 'pending') handleStudentSelect(student, sessionType);
                                else if (isCompleted || isCancelled) handleViewCompletedReport(student);
                             }}
                             className={`group relative overflow-hidden p-4 md:p-8 rounded-[3rem] border transition-all text-left flex flex-col justify-between h-64 ${
                                isCompleted ? 'bg-emerald-50/50 border-emerald-100 cursor-pointer hover:shadow-xl hover:scale-[1.02]' 
                                : isCancelled ? 'bg-rose-50/50 border-rose-100 cursor-pointer hover:shadow-xl hover:scale-[1.02]' 
                                : 'bg-white border-slate-100 hover:shadow-2xl hover:scale-[1.02] hover:border-slate-200 active:scale-95 cursor-pointer'}`}
                           >
                             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-150 duration-700 ${getSessionColor(sessionType).split(' ')[0]}`}></div>
                             
                             <div>
                               <div className="flex justify-between items-start mb-4">
                                 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getSessionColor(sessionType)}`}>
                                   {sessionType} SESSION
                                 </div>
                                 {student.is_carry_over && (
                                   <div className="px-3 py-1.5 bg-orange-100 text-orange-600 border border-orange-200 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                     <Clock size={10} /> Carry Over
                                   </div>
                                 )}
                                 {isCompleted && <CheckCircle2 className="text-emerald-500" size={24} />}
                                 {isCancelled && <XCircle className="text-rose-500" size={24} />}
                               </div>
                               <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase mb-2 break-words">{student.name}</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">MM-{student.id.toString().padStart(4, '0')} • {student.priority_category || 'Stable'} Priority</p>
                               
                               <div className="mt-4 flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100" title={`Consumed: ${student.consumed_hours || 0} | Paid Limit: ${student.paid_hours || 0}`}>
                                  <div className={`w-2 h-2 rounded-full ${student.payment_alert_level === 'Critical' ? 'bg-rose-500 animate-pulse' : student.payment_alert_level === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'} shrink-0`}></div>
                                  <div className="flex flex-col gap-0.5">
                                    <p className={`text-[9px] font-black uppercase break-words whitespace-normal leading-tight ${student.payment_alert_level === 'Critical' ? 'text-rose-600' : student.payment_alert_level === 'Warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                      {student.payment_alert_level || 'Safe'} • {Math.round(((student.consumed_hours || 0) / (student.paid_hours || 1)) * 100)}%
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                      {student.consumed_hours || 0} hrs cycle consumed / {Math.round(student.paid_hours || 0)} hrs cycle limit
                                    </p>
                                  </div>
                                </div>
                             </div>

                             <div className="flex items-center justify-between mt-6">
                               <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getSessionColor(sessionType)}`}>
                                   {getSessionIcon(sessionType)}
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                   {isCompleted ? 'Report Logged' : isCancelled ? 'Cancelled' : 'Awaiting Interaction'}
                                 </span>
                               </div>
                               <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                             </div>
                           </div>
                         );
                       })}
                    {assignedStudents.filter(s => {
                        const sStatus = s.status?.toUpperCase() || 'PENDING';
                        const matchesStatus = statusFilter === 'completed' ? (sStatus === 'COMPLETED' || sStatus === 'CANCELLED') : (sStatus !== 'COMPLETED' && sStatus !== 'CANCELLED');
                        const matchesTab = activeTab === 'both' ? isDiamondCategory(s) : isGoldCategory(s);
                        return matchesStatus && matchesTab;
                    }).length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">All students in your today's fleet are {statusFilter === 'pending' ? 'accounted for' : 'awaiting action'}.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

             {statusFilter === 'yesterday' && (
               <div className="space-y-8">
                  <div className="flex items-center justify-between px-4">
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                         <Clock size={18} className="text-amber-500" /> 
                         Yesterday Pending Students
                     </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {yesterdayPending.map(student => {
                         const sessionType = student.sessionType || 'QUICK';
                         return (
                           <div
                             key={student.id}
                             onClick={() => handleStudentSelect(student, sessionType, true)}
                             className={`group relative overflow-hidden p-4 md:p-8 rounded-[3rem] border transition-all text-left flex flex-col justify-between h-64 bg-amber-50/50 border-amber-100 cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:border-amber-200 active:scale-95`}
                           >
                             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-150 duration-700 ${getSessionColor(sessionType).split(' ')[0]}`}></div>
                             
                             <div>
                               <div className="flex justify-between items-start mb-4">
                                 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getSessionColor(sessionType)}`}>
                                   {sessionType} SESSION
                                 </div>
                                 <div className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                   <Clock size={10} /> From Yesterday
                                 </div>
                               </div>
                               <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase mb-2 break-words">{student.name}</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">MM-{student.id.toString().padStart(4, '0')} • {student.priority_category || 'Stable'} Priority</p>
                             </div>

                             <div className="flex items-center justify-between mt-6">
                               <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getSessionColor(sessionType)}`}>
                                   {getSessionIcon(sessionType)}
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                   Pending from Yesterday
                                 </span>
                               </div>
                               <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                             </div>
                           </div>
                         );
                       })}
                    {yesterdayPending.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No pending students from yesterday. All caught up!</p>
                      </div>
                    )}
                  </div>
               </div>
             )}
            </div>
          )}
        </div>

      {/* Read-only Report Modal for Completed Students */}
      {viewReportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewReportModal(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{viewReportModal.student.name}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{viewReportModal.sessionType} Session • {selectedDate} • Read Only</p>
              </div>
              <button onClick={() => setViewReportModal(null)} className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                <XCircle size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-4 md:p-8">
              <InteractionFormUI
                sessionType={viewReportModal.sessionType}
                formData={viewReportModal.reportData}
                setFormData={() => {}}
                isReadOnly={true}
              />
            </div>
          </div>
        </div>
      )}

      {viewReportLoading && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-4 md:p-8 shadow-2xl flex items-center gap-4">
            <Loader2 size={24} className="animate-spin text-[#008080]" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Loading Report...</span>
          </div>
        </div>
      )}
     </div>
   );
 }

 // Interaction Form Screen
 return (
   <div className="max-w-4xl mx-auto space-y-10 p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
     <button
       onClick={() => { setSelectedStudent(null); setSubmitted(false); }}
       className="flex items-center gap-2 text-slate-600 hover:text-[#008080] font-black text-[10px] uppercase tracking-widest transition-colors mb-4"
     >
       <ArrowLeft size={16} /> Return to Dashboard
     </button>

     <header className={`border p-5 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all ${sessionType === 'CANCELLED' ? 'bg-slate-900 border-slate-800' : sessionType === 'DEEP' ? 'bg-rose-950 border-rose-900' : sessionType === 'MEDIUM' ? 'bg-amber-950 border-amber-900' : sessionType === 'QUICK' ? 'bg-blue-950 border-blue-900' : 'bg-[#008080] border-slate-800'}`}>
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -mr-40 -mt-40 opacity-10 ${sessionType === 'CANCELLED' ? 'bg-slate-500' : sessionType === 'DEEP' ? 'bg-rose-500' : sessionType === 'MEDIUM' ? 'bg-amber-500' : sessionType === 'QUICK' ? 'bg-blue-500' : 'bg-[#008080]'}`}></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${sessionType === 'CANCELLED' ? 'bg-slate-500' : sessionType === 'DEEP' ? 'bg-rose-500' : sessionType === 'MEDIUM' ? 'bg-amber-500' : sessionType === 'QUICK' ? 'bg-blue-500' : 'bg-[#008080]'}`}>
              {sessionType === 'CANCELLED' ? <XCircle size={24} /> : getSessionIcon(sessionType)}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase mb-2 break-words">{selectedStudent.name}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] break-words">
                 {sessionType} SESSION • {isYesterdayLog ? subtractOneDay(selectedDate) : selectedDate}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md w-full sm:w-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest break-words text-center sm:text-left leading-tight">
              Completed {assignedStudents.filter(s => s.status === 'COMPLETED').length} / {assignedStudents.length} Sessions Today
            </p>
          </div>
        </div>
     </header>

     <div className="px-2">
       <div className="flex flex-col sm:flex-row items-center sm:inline-flex gap-2 sm:gap-4 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 w-full sm:w-auto text-center sm:text-left">
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interaction Count</p>
         <p className="text-sm font-black text-slate-900">
           {getInteractionDisplayCount(selectedStudent) ? `#${getInteractionDisplayCount(selectedStudent)}` : 'N/A'}
         </p>
       </div>
     </div>

     {!submitted ? (
       <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 space-y-12 relative">
         {sessionType !== 'CANCELLED' && (
           <div className="absolute top-8 right-8 z-20">
             <button
               type="button"
               onClick={() => setSessionType('CANCELLED')}
               className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-rose-100"
             >
               <XCircle size={14} /> Cancel Session
             </button>
           </div>
         )}

         {sessionType === 'CANCELLED' && (
           <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="p-4 md:p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="text-slate-500" size={24} />
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cancel Interaction</h3>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  You are about to cancel this interaction. This will clear it from your pending list, but you MUST provide a reason.
                </p>
                
                <div className="space-y-2 mt-6">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Cancellation Reason (Mandatory)</label>
                  <textarea 
                    name="cancel_reason" 
                    rows="3" 
                    required 
                    value={formData.cancel_reason || ''} 
                    onChange={handleChange} 
                    className="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-slate-900/10 transition-all placeholder:text-slate-300" 
                    placeholder="Why was this session cancelled? (e.g., Student unreachable, Number busy...)"
                  ></textarea>
                </div>
              </div>
           </div>
         )}
         <InteractionFormUI sessionType={sessionType} formData={formData} setFormData={setFormData} />

         {/* File Upload Section */}
         {sessionType !== 'CANCELLED' && sessionType !== 'TUITION' && (
            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#008080]/10 flex items-center justify-center">
                  <Upload size={16} className="text-[#008080]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Attach Files</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Upload any screenshots, documents, or proofs</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <input 
                  type="file" 
                  multiple 
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  className="block w-full text-xs font-bold text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-[#008080] file:text-white hover:file:bg-[#006666] file:cursor-pointer file:transition-colors bg-white border border-slate-200 rounded-xl"
                />
                {files.length > 0 && (
                  <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest ml-2 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {files.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
         )}

         <div className="pt-8">
           <button
             type="submit"
             disabled={loading}
             className={`w-full p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] font-black text-xs sm:text-sm uppercase tracking-widest sm:tracking-[0.3em] shadow-2xl transition-all disabled:opacity-50 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-4 active:scale-[0.98] ${sessionType === 'CANCELLED' ? 'bg-slate-800 text-white shadow-slate-200 hover:-translate-y-1' : sessionType === 'DEEP' ? 'bg-rose-600 text-white shadow-rose-200 hover:-translate-y-1' : sessionType === 'MEDIUM' ? 'bg-amber-500 text-white shadow-amber-200 hover:-translate-y-1' : sessionType === 'QUICK' ? 'bg-blue-600 text-white shadow-blue-200 hover:-translate-y-1' : 'bg-[#008080] text-white hover:-translate-y-1'}`}
           >
             <span className="break-words text-center">{loading ? 'Saving...' : sessionType === 'CANCELLED' ? 'Save Cancelled Interaction' : 'Save Interaction'}</span>
             {!loading && (sessionType === 'CANCELLED' ? <XCircle size={24} className="shrink-0" /> : <CheckCircle2 size={24} className="shrink-0" />)}
           </button>
         </div>

       </form>
     ) : (
       <div className="space-y-8 animate-in fade-in zoom-in duration-300">
         <div className="bg-emerald-50 border border-emerald-100 p-6 md:p-12 rounded-[4rem] text-center shadow-xl">
           <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200">
             <CheckCircle2 size={40} strokeWidth={3} />
           </div>
           <h2 className="text-3xl font-black text-emerald-900 mb-2 uppercase tracking-tight">Interaction Saved!</h2>
           <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-10">The student's interaction log has been updated successfully.</p>
           <button
             onClick={() => { setSelectedStudent(null); setSubmitted(false); }}
             className="px-6 md:px-12 py-5 bg-emerald-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-700 hover:shadow-xl transition-all active:scale-95"
           >
             Continue Today's Plan
           </button>
         </div>
       </div>
     )}
   </div>
 );
};

export default StudentInteractionLog;
