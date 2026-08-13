import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { GraduationCap, AlertCircle, Calendar, Clock, ArrowRight, CheckCircle2, Timer, XCircle, FileText, Target, History } from 'lucide-react';
const Exams = () => {
  const [pendingExams, setPendingExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [selectedExam, setSelectedExam] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    type: 'Complete',
    // 'Complete' or 'Postpone'
    score: '',
    postponed_date: '',
    reason: ''
  });
  useEffect(() => {
    fetchExams();
    fetchHistory();
  }, []);
  const fetchExams = async () => {
    try {
      const res = await api.get('/mentor/exams/pending');
      setPendingExams(res.data.data);
    } catch (error) {
      toast.error("Failed to load exam milestones");
    } finally {
      setLoading(false);
    }
  };
  const fetchHistory = async () => {
    try {
      const res = await api.get('/mentor/exams/history');
      setHistory(res.data.data);
    } catch (error) {
      console.error("History error:", error);
    }
  };
  const handleOpenSubmit = exam => {
    setSelectedExam(exam);
    setFormData({
      type: 'Complete',
      score: '',
      postponed_date: '',
      reason: ''
    });
    setIsSubmitModalOpen(true);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await api.post('/mentor/exams/submit', {
        student_id: selectedExam.student_id,
        milestone: selectedExam.milestone,
        ...formData
      });
      toast.success(formData.type === 'Complete' ? "Exam score recorded" : "Exam postponed");
      setIsSubmitModalOpen(false);
      fetchExams();
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };
  const filteredHistory = history.filter(h => h.student_name.toLowerCase().includes(historySearch.toLowerCase()) || h.score?.toLowerCase().includes(historySearch.toLowerCase()));
  return <div className="space-y-8 pb-20 max-w-[1200px] mx-auto">
 {/* Header Area */}
 <div className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-[#008080] overflow-hidden relative">
 <div className="absolute top-0 right-0 w-64 h-64 bg-[#008080]/10 rounded-full -mr-32 -mt-32 opacity-50"></div>

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex items-center gap-5">
 <div className="w-14 h-14 bg-[#008080] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#008080]/30 rotate-3 transition-all duration-500">
 <GraduationCap size={28} />
 </div>
 <div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Academic Milestones</h1>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">Exam Alerts & Assessment Tracking to monitor student performance • PHASE 2026</p>
 </div>
 </div>

 <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
 <AlertCircle className="text-[#008080]" size={18} />
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
 {pendingExams.length} Actions Required
 </span>
 </div>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
 <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl w-fit">
 {[{
          id: 'pending',
          label: 'Upcoming Exams',
          count: pendingExams.length
        }, {
          id: 'history',
          label: 'Exam History',
          count: history.length
        }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 md:px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3
 ${activeTab === tab.id ? 'bg-white text-[#008080] shadow-lg' : 'text-slate-500 hover:text-slate-800'}
 `}>
 {tab.label}
 {tab.count > 0 && <span className={`px-2 py-0.5 rounded-full text-[8px] ${activeTab === tab.id ? 'bg-[#008080] text-white' : 'bg-slate-200 text-slate-500'}`}>
 {tab.count}
 </span>}
 </button>)}
 </div>

 {activeTab === 'history' && <div className="relative group w-full md:w-80">
 <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#008080] transition-colors" size={16} />
 <input type="text" placeholder="Search history..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/5 transition-all" />
 </div>}
 </div>

 {/* List Section */}
 {loading ? <div className="flex flex-col items-center justify-center p-20 space-y-4">
 <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
 <p className="text-xs font-black text-slate-600 uppercase tracking-widest animate-pulse">Syncing Milestone Data...</p>
 </div> : activeTab === 'pending' ? pendingExams.length === 0 ? <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-center shadow-sm">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
 <CheckCircle2 size={40} />
 </div>
 <h3 className="text-lg font-black text-slate-900 tracking-tight">No Pending Assessments</h3>
 <p className="text-xs font-bold text-slate-600 mt-2 uppercase tracking-widest leading-loose max-w-sm mx-auto">
 All students are currently in compliance with their exam schedules. Keep up the high performance!
 </p>
 </div> : <div className="grid gap-6">
 {pendingExams.map((exam, idx) => <div key={idx} className="bg-white rounded-[3.5rem] p-6 md:p-10 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col xl:flex-row items-center gap-10 animate-in slide-in-from-bottom-2 duration-300 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-[#008080]/10 rounded-full -mr-16 -mt-16 opacity-30"></div>
 
 <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center border border-slate-100 group-hover:bg-[#008080] group-hover:text-white group-hover:border-[#008080] transition-all duration-700 shrink-0 rotate-3 group-hover:rotate-0">
 <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">Session</span>
 <span className="text-2xl md:text-4xl font-black tracking-tighter ">{exam.milestone}</span>
 </div>

 <div className="flex-1 space-y-4">
 <div className="flex items-center gap-4">
 <h3 className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-[#008080] transition-colors uppercase">{exam.student_name}</h3>
 <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${exam.status.includes('Postponed') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
 {exam.status}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
 <div>
 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Target Chapter</span>
 <p className="text-xs font-black text-slate-900 ">
 {exam.chapter || 'Pending...'}
 </p>
 </div>
 <div>
 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Portions / Details</span>
 <p className="text-[11px] font-bold text-slate-600 ">
 {exam.portions || 'Scope assignment pending from Academic Head'}
 </p>
 </div>
 {exam.exam_type && <div className="pt-1">
 <span className="px-2 py-0.5 bg-[#008080] text-white rounded text-[8px] font-black uppercase tracking-tighter">
 {exam.exam_type}
 </span>
 </div>}
 </div>
 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
 <div>
 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Target Timeline</span>
 <p className="text-sm font-black text-[#008080] ">
 {exam.scheduled_date ? new Date(exam.scheduled_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }) : 'Date TBD'}
 </p>
 </div>
 <Calendar className="text-[#008080]" size={24} />
 </div>
 </div>

 <div className="flex flex-wrap gap-5 pt-2">
 <div className="flex items-center gap-2 text-slate-600 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-100/50">
 <Clock size={14} className="text-slate-600" />
 <span className="text-[10px] font-black uppercase tracking-widest ">Current Progress: {exam.session_count} Sessions</span>
 </div>
 </div>
 </div>

 <button onClick={() => handleOpenSubmit(exam)} className="px-5 md:px-10 py-6 bg-[#008080] text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#008080] hover:bg-rose-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 w-full xl:w-fit group-hover:scale-105">
 Record Exam Result <ArrowRight size={20} />
 </button>
 </div>)}
 </div> : (/* History Tab */
    <div className="space-y-4">
 {filteredHistory.length === 0 ? <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-center shadow-sm">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
 <History size={40} />
 </div>
 <h3 className="text-lg font-black text-slate-900 tracking-tight">No History Found</h3>
 <p className="text-xs font-bold text-slate-600 mt-2 uppercase tracking-widest">Adjust your search or start recording milestones.</p>
 </div> : <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 border-b border-slate-100">
 <tr>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Milestone</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Student</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Recorded Date</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Score / Insight</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {filteredHistory.map((h, i) => <tr key={i} className="hover:bg-slate-50/50 transition-colors group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{i + 1}</td>
 <td className="px-4 md:px-8 py-6">
 <div className="w-12 h-12 bg-[#008080]/10 text-[#008080] rounded-xl flex items-center justify-center font-black ">
 #{h.milestone_session}
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 font-black text-slate-900 ">{h.student_name}</td>
 <td className="px-4 md:px-8 py-6 text-xs font-bold text-slate-500">
 {new Date(h.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
 </td>
 <td className="px-4 md:px-8 py-6">
 {h.status === 'Completed' ? <span className="text-lg font-black text-[#008080] tracking-tighter ">{h.score}</span> : <span className="text-[10px] font-black text-amber-600 uppercase ">Rescheduled to {new Date(h.postponed_date).toLocaleDateString()}</span>}
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex justify-center">
 <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${h.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
 {h.status}
 </span>
 </div>
 </td>
 </tr>)}
 </tbody>
 </table>
 </div>
 </div>}
 </div>)}

 {/* Assessment Submission Modal */}
 {isSubmitModalOpen && <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
 <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-500 border border-white/20 max-h-[90vh] overflow-y-auto">
 {/* Modal Header */}
 <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center bg-[#008080] text-white relative h-32">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
 <div className="relative z-10">
 <h2 className="text-2xl font-black tracking-tight uppercase">Assessment Status</h2>
 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 mt-1 flex items-center gap-2">
 <GraduationCap size={12} /> Milestone #{selectedExam?.milestone} • {selectedExam?.student_name}
 </p>
 </div>
 <button onClick={() => setIsSubmitModalOpen(false)} className="relative z-10 w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all border border-white/10 active:scale-90">
 <XCircle size={24} />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-10">
 {/* Toggle Selector */}
 <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50">
 <button type="button" onClick={() => setFormData({
              ...formData,
              type: 'Complete'
            })} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 flex items-center justify-center gap-2 ${formData.type === 'Complete' ? 'bg-white text-[#008080] shadow-xl shadow-slate-200/50' : 'text-slate-600 hover:text-slate-600'}`}>
 <Target size={14} /> Submit Score
 </button>
 <button type="button" onClick={() => setFormData({
              ...formData,
              type: 'Postpone'
            })} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 flex items-center justify-center gap-2 ${formData.type === 'Postpone' ? 'bg-white text-amber-600 shadow-xl shadow-slate-200/50' : 'text-slate-600 hover:text-slate-600'}`}>
 <Calendar size={14} /> Handle Later
 </button>
 </div>

 {/* Content Area */}
 {formData.type === 'Complete' ? <div className="space-y-6 animate-in fade-in duration-500">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 ">Exam Performance Insight *</label>
 <div className="relative group">
 <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#008080] transition-colors">
 <Target size={20} />
 </div>
 <input type="text" required autoFocus placeholder="e.g. 92% | Tier A++" className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:bg-white focus:ring-8 ring-[#008080]/5 transition-all outline-none placeholder:font-bold placeholder:opacity-30" value={formData.score} onChange={e => setFormData({
                  ...formData,
                  score: e.target.value
                })} />
 </div>
 <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-1">Note: This score will be synced with Academic Head reports.</p>
 </div>
 </div> : <div className="space-y-8 animate-in fade-in duration-500">
 <div className="grid grid-cols-1 gap-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 ">Rescheduled Date *</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
 <input type="date" required className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:bg-white focus:ring-8 ring-amber-500/5 transition-all outline-none" value={formData.postponed_date} onChange={e => setFormData({
                    ...formData,
                    postponed_date: e.target.value
                  })} />
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 ">Reason for Postponement *</label>
 <div className="relative group">
 <FileText className="absolute left-5 top-5 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
 <textarea required rows="3" placeholder="Briefly explain the postponement factor..." className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:bg-white focus:ring-8 ring-amber-500/5 transition-all outline-none placeholder:font-bold placeholder:opacity-30" value={formData.reason} onChange={e => setFormData({
                    ...formData,
                    reason: e.target.value
                  })}></textarea>
 </div>
 </div>
 </div>
 </div>}

 {/* Submit Button */}
 <button type="submit" className={`w-full py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${formData.type === 'Complete' ? 'bg-[#008080] text-white shadow-[#008080]/30/50 hover:bg-[#008080]' : 'bg-amber-600 text-white shadow-amber-200/50 hover:bg-amber-700'}`}>
 <GraduationCap size={18} />
 {formData.type === 'Complete' ? 'Submit Result' : 'Submit Postponement'}
 </button>
 </form>
 </div>
 </div>}
 </div>;
};
export default Exams;