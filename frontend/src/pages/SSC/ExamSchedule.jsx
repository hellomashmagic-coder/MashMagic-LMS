import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { ClipboardList, Plus, X, Search, Calendar, BookOpen, CheckCircle, Clock, AlertTriangle, Trash2, Award, Filter, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
const ExamSchedule = () => {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    milestone: '',
    chapter: '',
    portions: '',
    exam_type: 'Written',
    scheduled_date: ''
  });
  const [resultForm, setResultForm] = useState({
    score: '',
    status: 'Completed',
    notes: ''
  });
  const statusConfig = {
    Pending: {
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock size={11} />
    },
    Completed: {
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle size={11} />
    },
    Postponed: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <AlertTriangle size={11} />
    },
    Absent: {
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <X size={11} />
    }
  };
  useEffect(() => {
    fetchExams();
    fetchStudents();
  }, []);
  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ssc/exam-schedules');
      if (res.data.success) setExams(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load exam schedules');
    } finally {
      setLoading(false);
    }
  };
  const fetchStudents = async () => {
    try {
      const res = await api.get('/ssc/students');
      if (res.data.success) setStudents(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.student_id || !form.milestone || !form.scheduled_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/ssc/exam-schedules', form);
      if (res.data.success) {
        toast.success('Exam scheduled successfully!');
        setIsModalOpen(false);
        setForm({
          student_id: '',
          milestone: '',
          chapter: '',
          portions: '',
          exam_type: 'Written',
          scheduled_date: ''
        });
        fetchExams();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule exam');
    } finally {
      setSaving(false);
    }
  };
  const handleResultSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/ssc/exam-schedules/${selectedExam.id}/result`, resultForm);
      if (res.data.success) {
        toast.success('Exam result saved!');
        setIsResultModalOpen(false);
        setSelectedExam(null);
        fetchExams();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = exam => {
    premiumConfirm(async () => {
      try {
        await api.delete(`/ssc/exam-schedules/${exam.id}`);
        toast.success('Exam record deleted');
        fetchExams();
      } catch (e) {
        toast.error('Failed to delete');
      }
    }, {
      title: 'Delete Exam Record',
      message: `Are you sure you want to delete this exam record for ${exam.student_name}?`,
      type: 'danger'
    });
  };
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const nameStr = e.student_name || '';
      const courseStr = e.course || '';
      const milestoneStr = String(e.milestone_session || '');
      const matchSearch = nameStr.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || courseStr.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || milestoneStr.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [exams, searchTerm, filterStatus]);
  const stats = useMemo(() => ({
    total: exams.length,
    pending: exams.filter(e => e.status === 'Pending').length,
    completed: exams.filter(e => e.status === 'Completed').length,
    postponed: exams.filter(e => e.status === 'Postponed').length
  }), [exams]);
  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Loading Exam Schedules...</p>
        </div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-white p-4 md:p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-[#008080]/10 text-[#008080] rounded-2xl flex items-center justify-center">
                                <ClipboardList size={24} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Exam Schedule</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Plan, track and record student milestone exams</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#008080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#006666] transition-all shadow-lg shadow-[#008080]/20 hover:shadow-xl hover:scale-105 active:scale-95">
                        <Plus size={16} /> Schedule New Exam
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-50">
                    {[{
          label: 'Total Exams',
          value: stats.total,
          color: 'text-slate-800',
          bg: 'bg-slate-50'
        }, {
          label: 'Pending',
          value: stats.pending,
          color: 'text-amber-600',
          bg: 'bg-amber-50'
        }, {
          label: 'Completed',
          value: stats.completed,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50'
        }, {
          label: 'Postponed',
          value: stats.postponed,
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        }].map(s => <div key={s.label} className={`${s.bg} p-6 rounded-[2rem] flex flex-col gap-1`}>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-2xl md:text-4xl font-black ${s.color} tracking-tighter`}>{s.value}</span>
                        </div>)}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search by student name, course, milestone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-4 ring-[#008080]/10 focus:bg-white transition-all" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 ring-[#008080]/10 cursor-pointer hover:bg-white transition-all">
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Postponed">Postponed</option>
                        <option value="Absent">Absent</option>
                    </select>
                    <button onClick={fetchExams} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 hover:bg-[#008080] hover:text-white transition-all">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-4 md:px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Milestone</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Chapter / Topic</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled Date</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Score</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredExams.length > 0 ? filteredExams.map((exam, index) => {
              const sc = statusConfig[exam.status] || statusConfig.Pending;
              return <tr key={exam.id} className="hover:bg-slate-50/50 transition-all group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                                        <td className="px-4 md:px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#008080]/20 to-[#008080]/10 rounded-xl flex items-center justify-center font-black text-[#008080] text-sm">
                                                    {(exam.student_name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{exam.student_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{exam.course} • {exam.grade}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-3 py-1.5 bg-[#008080]/10 text-[#008080] rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                M{exam.milestone_session}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-700 max-w-[180px] truncate">{exam.chapter || '—'}</p>
                                            {exam.portions && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">{exam.portions}</p>}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-[10px] font-black text-slate-600 uppercase">{exam.exam_type || 'Written'}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                                <Calendar size={13} className="text-slate-400" />
                                                {exam.scheduled_date ? new Date(exam.scheduled_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border w-fit ${sc.color}`}>
                                                    {sc.icon} {exam.status}
                                                </span>
                                                {exam.score != null && <div className="flex items-center gap-1 mt-1">
                                                        <Award size={12} className="text-amber-500" />
                                                        <span className="text-[11px] font-black text-slate-800">{exam.score}%</span>
                                                    </div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {exam.status === 'Pending' && <button onClick={() => {
                      setSelectedExam(exam);
                      setResultForm({
                        score: '',
                        status: 'Completed',
                        notes: ''
                      });
                      setIsResultModalOpen(true);
                    }} className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                                                        Enter Result
                                                    </button>}
                                                <button onClick={() => handleDelete(exam)} className="p-2 bg-white border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>;
            }) : <tr>
                                    <td colSpan="7" className="py-24 text-center">
                                        <ClipboardList size={40} className="text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No exam schedules found</p>
                                        <button onClick={() => setIsModalOpen(true)} className="mt-4 px-5 py-2.5 bg-[#008080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#006666] transition-all">
                                            Schedule First Exam
                                        </button>
                                    </td>
                                </tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Exam Modal */}
            {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#008080]/5 to-transparent">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Schedule Exam</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Plan a milestone exam for a student</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student *</label>
                                <select value={form.student_id} onChange={e => setForm({
              ...form,
              student_id: e.target.value
            })} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all">
                                    <option value="">Select a student...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.course} ({s.grade})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Milestone # *</label>
                                    <input type="number" min="1" placeholder="e.g. 5" value={form.milestone} onChange={e => setForm({
                ...form,
                milestone: e.target.value
              })} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Exam Type</label>
                                    <select value={form.exam_type} onChange={e => setForm({
                ...form,
                exam_type: e.target.value
              })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all">
                                        <option>Written</option>
                                        <option>Oral</option>
                                        <option>MCQ</option>
                                        <option>Practical</option>
                                        <option>Online</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Chapter / Topic</label>
                                <input type="text" placeholder="e.g. Organic Chemistry - Chapter 5" value={form.chapter} onChange={e => setForm({
              ...form,
              chapter: e.target.value
            })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Portions / Syllabus</label>
                                <textarea rows={2} placeholder="Describe the exam portions..." value={form.portions} onChange={e => setForm({
              ...form,
              portions: e.target.value
            })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all resize-none" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Scheduled Date *</label>
                                <input type="date" value={form.scheduled_date} onChange={e => setForm({
              ...form,
              scheduled_date: e.target.value
            })} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-[#008080] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#006666] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#008080]/20">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                    {saving ? 'Saving...' : 'Schedule Exam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>}

            {/* Enter Result Modal */}
            {isResultModalOpen && selectedExam && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-transparent">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Enter Exam Result</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{selectedExam.student_name} — M{selectedExam.milestone_session}</p>
                            </div>
                            <button onClick={() => setIsResultModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleResultSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Result Status</label>
                                <select value={resultForm.status} onChange={e => setResultForm({
              ...resultForm,
              status: e.target.value
            })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all">
                                    <option value="Completed">Completed</option>
                                    <option value="Postponed">Postponed</option>
                                    <option value="Absent">Absent</option>
                                </select>
                            </div>

                            {resultForm.status === 'Completed' && <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Score (%)</label>
                                    <input type="number" min="0" max="100" placeholder="Enter score (0-100)" value={resultForm.score} onChange={e => setResultForm({
              ...resultForm,
              score: e.target.value
            })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all" />
                                </div>}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Notes / Remarks</label>
                                <textarea rows={3} placeholder="Any remarks about the exam..." value={resultForm.notes} onChange={e => setResultForm({
              ...resultForm,
              notes: e.target.value
            })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsResultModalOpen(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {saving ? 'Saving...' : 'Save Result'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>}
        </div>;
};
export default ExamSchedule;