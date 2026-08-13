import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
 MessageSquare, CheckCircle, ArrowLeft, Target, AlertCircle, BarChart3,
 CloudLightning, FileText, Camera, Phone, UserCheck, HeartPulse, Brain,
 Clock, Activity, BookOpen, Smile, Plus, Frown, Meh, MoreHorizontal, Upload, ImageIcon, Loader2, Zap, TrendingUp, ShieldAlert, CheckCircle2, ChevronRight, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

const SSCInteractionLogs = () => {
 const location = useLocation();
 const navigate = useNavigate();

 const [loading, setLoading] = useState(false);
 const [assignedLoading, setAssignedLoading] = useState(true);
 const [submitted, setSubmitted] = useState(false);
 const [allStudents, setAllStudents] = useState([]);
 const [assignedStudents, setAssignedStudents] = useState([]);
 const [selectedStudent, setSelectedStudent] = useState(null);
 const [activeTab, setActiveTab] = useState('both'); // 'both', 'mentorship', 'tuition'
 const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'completed'
 
 // Form States
 const [sessionType, setSessionType] = useState(null); // 'DEEP', 'MEDIUM', 'QUICK'
 const [formData, setFormData] = useState({});

 useEffect(() => {
   fetchAssignedStudents();
   fetchAllStudents();
 }, []);

 const fetchAssignedStudents = async () => {
   setAssignedLoading(true);
   try {
     const res = await api.get('/mentor-interactions/daily-assignments');
     setAssignedStudents(res.data.data);
   } catch (error) {
     toast.error("Failed to load daily assignments");
   } finally {
     setAssignedLoading(false);
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

 const handleStudentSelect = (student, type) => {
   setSelectedStudent(student);
   setSessionType(type || 'TUITION');
   setSubmitted(false);
   
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
       priority_tag: 'Stable'
     });
   } else if (type === 'MEDIUM') {
     setFormData({
       progress: 'Good',
       class_attendance: 'Regular',
       issue_found: 'No',
       issue_category: 'Academic',
       quick_guidance: '',
       next_task: '',
       upgrade_to_deep: 'No'
     });
   } else if (type === 'QUICK') {
     setFormData({
       availability: 'Attended call',
       study_status: 'Studied properly',
       attendance: 'Attended',
       immediate_concern: 'No',
       motivation_given: 'Yes'
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
      // Validation Rules from Product Document
      if (sessionType === 'DEEP') {
        if (!formData.action_plan || !formData.main_problem || !formData.root_cause || !formData.guidance_given) {
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
       await api.post('/mentor-interactions/submit-report', {
         student_id: selectedStudent.id,
         session_type: sessionType,
         report_data: formData
       });
     }

     toast.success("Interaction submitted successfully!");
     setSubmitted(true);
     fetchAssignedStudents(); // Refresh daily list
     fetchAllStudents(); // Refresh all students list
   } catch (error) {
     toast.error(error.response?.data?.message || "Submission failed");
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
           type === 'mentorship' || 
           type === 'mentorship only';
  };

 const isSilverCategory = (s) => !isDiamondCategory(s) && !isGoldCategory(s);

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

 // Main List Screen
 if (!selectedStudent) {
   return (
     <div className="max-w-6xl mx-auto p-4 md:p-10 pb-20 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
       <header className="bg-white/70 backdrop-blur-xl p-4 md:p-8 md:p-14 rounded-[40px] md:rounded-[48px] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col md:flex-row justify-between items-center gap-10">
         <div className="text-center md:text-left">
           <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-4">SSC Success Logs</h1>
           <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-3 justify-center md:justify-start">
             <div className="w-2 h-2 rounded-full bg-[#008080] animate-ping"></div>
             Decision-Driven Mentorship Platform
           </p>
         </div>
          <div className="flex gap-4">
             <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 text-center">
                 <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Deep</p>
                 <p className="text-2xl font-black text-rose-900">{assignedStudents.filter(s => s.sessionType === 'DEEP').length || 0}</p>
             </div>
             <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-center">
                 <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Med</p>
                 <p className="text-2xl font-black text-amber-900">{assignedStudents.filter(s => s.sessionType === 'MEDIUM').length || 0}</p>
             </div>
             <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                 <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Quick</p>
                 <p className="text-2xl font-black text-blue-900">{assignedStudents.filter(s => s.sessionType === 'QUICK').length || 0}</p>
             </div>
          </div>
       </header>

       <div className="space-y-4">
        {/* Main Category Tabs */}
        <div className="flex flex-wrap gap-4 p-2 bg-white/50 backdrop-blur-md rounded-[28px] border border-slate-200/50 sticky top-4 z-50 shadow-sm">
          {[
            { id: 'both', label: 'Mentorship + Tuition', color: 'bg-purple-600' },
            { id: 'mentorship', label: 'Mentorship Only', color: 'bg-amber-500' },
            { id: 'tuition', label: 'Tuition Only', color: 'bg-[#008080]' }
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

        {/* Sub-Tabs: Status Filter */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 md:px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${statusFilter === 'pending' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-rose-200'}`}
          >
            <div className={`w-2 h-2 rounded-full ${statusFilter === 'pending' ? 'bg-white animate-pulse' : 'bg-rose-500'}`}></div>
            Awaiting Interaction ({activeTab === 'tuition' ? 
              allStudents.filter(s => isSilverCategory(s) && !s.connected_today).length :
              assignedStudents.filter(s => s.status !== 'COMPLETED').length
            })
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 md:px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${statusFilter === 'completed' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-emerald-200'}`}
          >
            <div className={`w-2 h-2 rounded-full ${statusFilter === 'completed' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></div>
            Completed Today ({activeTab === 'tuition' ? 
              allStudents.filter(s => isSilverCategory(s) && s.connected_today).length :
              assignedStudents.filter(s => s.status === 'COMPLETED').length
            })
          </button>
        </div>
      </div>

       {/* Main Content Area */}
       <div className="min-h-[400px]">
         {assignedLoading ? (
           <div className="flex flex-col items-center justify-center py-40 gap-4">
             <Loader2 size={40} className="animate-spin text-[#008080]" />
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Data...</p>
           </div>
         ) : (
           <div className="space-y-10 animate-in fade-in duration-500">
             {activeTab !== 'tuition' ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-4">
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                         <ShieldAlert size={18} className="text-[#008080]" /> 
                         {statusFilter === 'pending' ? 'Pending Execution Fleet' : 'Concluded Interactions'}
                     </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(assignedStudents.length > 0 ? assignedStudents : [])
                       .filter(s => {
                         const matchesStatus = statusFilter === 'completed' ? s.status === 'COMPLETED' : s.status !== 'COMPLETED';
                         return matchesStatus;
                       })
                       .map(student => {
                         const sessionType = student.sessionType || 'QUICK';
                         const isCompleted = student.status === 'COMPLETED';
                         return (
                           <button
                             key={student.id}
                             onClick={() => handleStudentSelect(student, sessionType)}
                             className={`group relative overflow-hidden p-4 md:p-8 rounded-[3rem] border transition-all text-left flex flex-col justify-between h-64 ${isCompleted ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100 hover:shadow-2xl hover:scale-[1.02] hover:border-slate-200 active:scale-95'}`}
                           >
                             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 transition-transform group-hover:scale-150 duration-700 ${getSessionColor(sessionType).split(' ')[0]}`}></div>
                             
                             <div>
                               <div className="flex justify-between items-start mb-4">
                                 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getSessionColor(sessionType)}`}>
                                   {sessionType} SESSION
                                 </div>
                                 {isCompleted && <CheckCircle2 className="text-emerald-500" size={24} />}
                               </div>
                               <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase mb-2 truncate">{student.name}</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">MM-{student.id.toString().padStart(4, '0')} • {student.priority_category || 'Stable'} Priority</p>
                             </div>

                             <div className="flex items-center justify-between mt-6">
                               <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getSessionColor(sessionType)}`}>
                                   {getSessionIcon(sessionType)}
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                   {isCompleted ? 'Report Logged' : 'Awaiting Interaction'}
                                 </span>
                               </div>
                               <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                             </div>
                           </button>
                         );
                       })}
                    {assignedStudents.filter(s => {
                        const matchesStatus = statusFilter === 'completed' ? s.status === 'COMPLETED' : s.status !== 'COMPLETED';
                        return matchesStatus;
                    }).length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{statusFilter === 'pending' ? 'All tasks complete for today!' : 'No completed tasks yet.'}</p>
                      </div>
                    )}
                  </div>
                </div>
             ) : (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-4 h-8 bg-[#008080] rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {statusFilter === 'pending' ? 'Pending Tuition Attendance' : 'Concluded Tuition Records'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allStudents
                      .filter(s => isSilverCategory(s) && (statusFilter === 'completed' ? s.connected_today : !s.connected_today))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(student => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student, 'TUITION')}
                        className={`bg-white p-4 md:p-8 rounded-[3rem] border border-slate-100 hover:shadow-xl hover:scale-[1.02] transition-all text-left group h-48 flex flex-col justify-between ${student.connected_today ? 'bg-emerald-50/50 border-emerald-100' : ''}`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate">{student.name}</h3>
                            {student.connected_today && <CheckCircle2 className="text-emerald-500" size={20} />}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{student.course} • Grade {student.grade}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#008080] text-[9px] font-black uppercase tracking-[0.2em]">
                            {student.connected_today ? 'View Record' : 'Track Attendance'}
                          </div>
                          <ArrowLeft size={16} className="text-slate-300 rotate-180" />
                        </div>
                      </button>
                    ))}
                    {allStudents.filter(s => isSilverCategory(s) && (statusFilter === 'completed' ? s.connected_today : !s.connected_today)).length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No students in this {statusFilter} category.</p>
                      </div>
                    )}
                  </div>
                </div>
             )}
           </div>
         )}
       </div>
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
       <ArrowLeft size={16} /> Return to Execution Hub
     </button>

     <header className={`border p-5 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all ${sessionType === 'DEEP' ? 'bg-rose-950 border-rose-900' : sessionType === 'MEDIUM' ? 'bg-amber-950 border-amber-900' : sessionType === 'QUICK' ? 'bg-blue-950 border-blue-900' : 'bg-[#008080] border-slate-800'}`}>
         <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -mr-40 -mt-40 opacity-10 ${sessionType === 'DEEP' ? 'bg-rose-500' : sessionType === 'MEDIUM' ? 'bg-amber-500' : sessionType === 'QUICK' ? 'bg-blue-500' : 'bg-[#008080]'}`}></div>
         <div className="relative z-10 flex items-center gap-6">
           <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${sessionType === 'DEEP' ? 'bg-rose-500' : sessionType === 'MEDIUM' ? 'bg-amber-500' : sessionType === 'QUICK' ? 'bg-blue-500' : 'bg-[#008080]'}`}>
             {getSessionIcon(sessionType)}
           </div>
           <div>
             <h1 className="text-3xl font-black text-white tracking-tight uppercase">{selectedStudent.name}</h1>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Global Interaction & Progress Monitoring</p>
           </div>
         </div>
      </header>

     {!submitted ? (
       <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 space-y-12">
         
         {sessionType === 'DEEP' && (
           <div className="space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">1. Student Status Before Session (Completed planned tasks?)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Yes', 'Partially', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, student_status_before: opt})} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.student_status_before === opt ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{opt}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">2. Main Problem Identified (Compulsory)</label>
                  <select name="main_problem" value={formData.main_problem} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase">
                    {['Academic difficulty', 'Lack of consistency', 'Low confidence', 'Distraction / mobile usage', 'Emotional issue', 'No major issue'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>
             </div>

             <div className="space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">3. Root Cause (Compulsory) - WHY this problem is happening?</label>
                   <textarea name="root_cause" rows="2" required value={formData.root_cause} onChange={handleChange} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-200" placeholder="Analyze the fundamental reason..."></textarea>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">4. Mentor Guidance Given (Compulsory) - What exact strategy was given?</label>
                   <textarea name="mentor_guidance" rows="2" required value={formData.mentor_guidance} onChange={handleChange} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-200" placeholder="What exact solution/strategy was given?"></textarea>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">5. Action Plan Set for Student (Compulsory) - Clear, measurable task</label>
                   <textarea name="action_plan" rows="2" required value={formData.action_plan} onChange={handleChange} className="w-full p-6 bg-yellow-400 text-slate-900 rounded-[2rem] text-sm font-bold outline-none border-none" placeholder="Example: 'Complete 2 chapters + revise notes'"></textarea>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">6. Student Response Level</label>
                  <div className="flex gap-2">
                    {['Positive / motivated', 'Neutral', 'Not responsive'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, student_response: opt})} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase transition-all ${formData.student_response === opt ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{opt}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">8. Priority Tag After Session</label>
                  <div className="flex gap-2">
                    {['High', 'Medium', 'Stable'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, priority_tag: opt})} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase transition-all ${formData.priority_tag === opt ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{opt}</button>
                    ))}
                  </div>
               </div>
             </div>

             <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <input type="checkbox" id="followup" checked={formData.followup_required === 'Yes'} onChange={(e) => setFormData({...formData, followup_required: e.target.checked ? 'Yes' : 'No'})} className="w-6 h-6 rounded-lg text-rose-500 border-slate-300 focus:ring-rose-500" />
                  <label htmlFor="followup" className="text-xs font-black text-slate-900 uppercase tracking-widest">7. Follow-up Required?</label>
                </div>
                {formData.followup_required === 'Yes' && (
                  <div className="flex items-center gap-4 animate-in slide-in-from-right-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase">When?</span>
                    <select name="followup_when" value={formData.followup_when} onChange={handleChange} className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none">
                      {['Tomorrow', 'Within 2 days', 'This week'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                )}
             </div>
           </div>
         )}

         {sessionType === 'MEDIUM' && (
           <div className="space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">1. Progress Since Last Session</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Good', 'Average', 'Poor'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, progress: opt})} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.progress === opt ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{opt}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">2. Class Attendance Status</label>
                  <select name="class_attendance" value={formData.class_attendance} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase">
                    {['Regular', 'Missed 1 class', 'Missed multiple'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>
             </div>

             <div className="p-4 md:p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-100 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">3. Any Issue Found?</span>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, issue_found: opt})} className={`px-4 md:px-8 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.issue_found === opt ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-400 border border-amber-100'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                {formData.issue_found === 'Yes' && (
                  <div className="animate-in slide-in-from-top-4 duration-300">
                    <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-1">Category</label>
                    <div className="flex gap-2 mt-2">
                      {['Academic', 'Discipline', 'Focus issue'].map(opt => (
                        <button key={opt} type="button" onClick={() => setFormData({...formData, issue_category: opt})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.issue_category === opt ? 'bg-yellow-400 text-slate-900' : 'bg-white text-slate-400 border border-slate-100'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}
             </div>

             <div className="space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">4. Quick Guidance Given - What correction did mentor give?</label>
                   <textarea name="quick_guidance" rows="2" value={formData.quick_guidance} onChange={handleChange} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-200" placeholder="Briefly summarize the correction..."></textarea>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">5. Next Task Assigned - Simple instruction (compulsory)</label>
                   <input type="text" name="next_task" required value={formData.next_task} onChange={handleChange} className="w-full p-6 bg-[#008080] text-white rounded-[2rem] text-sm font-bold outline-none border-none" placeholder="What is the very next action for the student?" />
                </div>
             </div>

             <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">6. Need Upgrade to Deep Session?</span>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, upgrade_to_deep: opt})} className={`px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.upgrade_to_deep === opt ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">(This is important for system auto-adjustment)</p>
             </div>
           </div>
         )}

         {sessionType === 'QUICK' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl">
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">1. Student Availability</span>
                       <select name="availability" value={formData.availability} onChange={handleChange} className="p-2 bg-transparent border-none text-[10px] font-black uppercase text-blue-600 outline-none">
                          {['Attended call', 'Did not attend'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl">
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">3. Class Attendance Today</span>
                       <select name="attendance" value={formData.attendance} onChange={handleChange} className="p-2 bg-transparent border-none text-[10px] font-black uppercase text-[#008080] outline-none">
                          {['Attended', 'Missed'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl">
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">5. Motivation Given?</span>
                       <div className="flex gap-2">
                          {['Yes', 'No'].map(opt => (
                            <button key={opt} type="button" onClick={() => setFormData({...formData, motivation_given: opt})} className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.motivation_given === opt ? 'bg-[#008080] text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{opt}</button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">2. Today's Study Status</label>
                       <div className="flex flex-col gap-2">
                          {['Studied properly', 'Studied partially', 'Not studied'].map(opt => (
                            <button key={opt} type="button" onClick={() => setFormData({...formData, study_status: opt})} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all text-left px-6 ${formData.study_status === opt ? 'bg-yellow-400 text-slate-900 shadow-xl translate-x-2' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{opt}</button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-5 md:p-10 bg-rose-50 rounded-[3rem] border border-rose-100 text-center space-y-6">
                 <div className="space-y-2">
                    <h4 className="text-lg font-black text-rose-900 uppercase tracking-tight">4. Any Immediate Concern?</h4>
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest max-w-sm mx-auto">Mark for Deep Session (Auto trigger)</p>
                 </div>
                 <div className="flex justify-center gap-4">
                    {['Yes', 'No'].map(opt => (
                       <button key={opt} type="button" onClick={() => setFormData({...formData, immediate_concern: opt})} className={`px-6 md:px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.immediate_concern === opt ? 'bg-rose-500 text-white shadow-xl scale-110' : 'bg-white text-slate-400 border border-rose-200 hover:bg-rose-100/50'}`}>{opt}</button>
                    ))}
                 </div>
              </div>
            </div>
         )}

         {sessionType === 'TUITION' && (
           <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Attendance Status</label>
                   <select name="attendance" value={formData.attendance} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase">
                     {['Present', 'Absent', 'Late'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Date</label>
                   <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Observations / Quick Notes</label>
                 <textarea name="notes" rows="4" value={formData.notes} onChange={handleChange} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-slate-900/10" placeholder="Any specific notes for today's tuition..."></textarea>
              </div>
           </div>
         )}

         <div className="pt-8">
           <button
             type="submit"
             disabled={loading}
             className={`w-full p-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 active:scale-[0.98] ${sessionType === 'DEEP' ? 'bg-rose-600 text-white shadow-rose-200 hover:-translate-y-1' : sessionType === 'MEDIUM' ? 'bg-amber-500 text-white shadow-amber-200 hover:-translate-y-1' : sessionType === 'QUICK' ? 'bg-blue-600 text-white shadow-blue-200 hover:-translate-y-1' : 'bg-[#008080] text-white hover:-translate-y-1'}`}
           >
             {loading ? 'Saving Interaction...' : 'Save Interaction'}
             {!loading && <CheckCircle2 size={24} />}
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

export default SSCInteractionLogs;
