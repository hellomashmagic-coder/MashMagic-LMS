import React, { useState, useEffect, useDeferredValue } from 'react';
import axios from '../../services/api';
import Select from 'react-select';
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  BookOpen,
  GraduationCap,
  CheckCircle,
  X,
  TrendingUp,
  SearchX,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const AoeExams = () => {
  const [scores, setScores] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    subject: '',
    chapter: '',
    publication: '',
    question_paper: null,
    answer_sheet: null,
    marks: '',
    total: '',
    grade: '',
    term: '',
    exam_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/aoe/exam-scores');
      if (res.data.success) {
        setScores(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load exam scores");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/aoe/students');
      if (res.data.success) {
        setStudents((res.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (error) {
      console.error("Error fetching students", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let qpUrl = '';
      if (formData.question_paper) {
        const uploadData = new FormData();
        uploadData.append('file', formData.question_paper);
        const upRes = await axios.post('/upload', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (upRes.data.success) qpUrl = upRes.data.url;
      }

      let asUrl = '';
      if (formData.answer_sheet) {
        const uploadData = new FormData();
        uploadData.append('file', formData.answer_sheet);
        const upRes = await axios.post('/upload', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (upRes.data.success) asUrl = upRes.data.url;
      }

      const payload = { ...formData, question_paper: qpUrl, answer_sheet: asUrl };
      const res = await axios.post('/aoe/exam-scores', payload);
      if (res.data.success) {
        toast.success("Exam score added successfully");
        setShowAddModal(false);
        setFormData({
          student_id: '', subject: '', chapter: '', publication: '', question_paper: null, answer_sheet: null,
          marks: '', total: '', grade: '', term: '', exam_date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add score");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredScores = scores.filter(s =>
    (s.student_name && s.student_name.toLowerCase().includes(deferredSearchTerm.toLowerCase())) ||
    (s.subject && s.subject.toLowerCase().includes(deferredSearchTerm.toLowerCase())) ||
    (s.term && s.term.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Page Header */}
      <div className="bg-white p-5 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#008080]/5 rounded-full -mr-32 -mt-32 blur-3xl transition-transform duration-1000 group-hover:scale-150"></div>
        <div className="text-center md:text-left relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Exam Score Center</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2 justify-center md:justify-start">
            <TrendingUp size={14} className="text-[#008080]" />
            Manage and track academic performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#008080] text-white px-4 md:px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#008080]/30 hover:bg-[#008080] transition-all flex items-center gap-3 active:scale-95"
          >
            <Plus size={18} />
            Add New Score
          </button>
          <div className="w-16 h-16 bg-[#008080] rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
            <Trophy size={28} />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by student, subject or term..."
            className="w-full bg-white border border-slate-200 pl-16 pr-8 py-5 rounded-[1.8rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-white border border-slate-200 px-4 md:px-8 rounded-[1.8rem] flex items-center gap-3 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-100 rounded-[2.8rem] animate-pulse"></div>)
        ) : filteredScores.length > 0 ? (
          filteredScores.map((score) => (
            <div key={score.id} className="bg-white p-5 md:p-10 rounded-[2.8rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-700 group flex flex-col xl:flex-row gap-8 items-start xl:items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50/50 rounded-full -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-110"></div>

              {/* Score Circle */}
              <div className="w-24 h-24 rounded-[2.2rem] bg-[#008080]/10 flex flex-col items-center justify-center relative z-10 transition-transform group-hover:rotate-6 duration-500">
                <span className="text-2xl font-black text-[#008080] leading-none">{score.marks}</span>
                <div className="w-10 h-[2px] bg-[#008080] my-1"></div>
                <span className="text-[10px] font-black text-[#008080] uppercase tracking-tighter">{score.total}</span>
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-5 py-2 bg-[#008080] text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
                    {score.subject}
                  </span>
                  <span className="px-5 py-2 bg-[#008080] text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                    {score.term}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2">
                    <Calendar size={12} />
                    {new Date(score.exam_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:translate-x-1 transition-transform uppercase ">{score.student_name}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em]">Grade Secured: <span className="text-slate-900">{score.grade}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto relative z-10 pt-6 xl:pt-0 border-t xl:border-t-0 border-slate-50">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-[#008080]' : 'bg-slate-200'}`}></div>
                  ))}
                </div>
                <button className="px-4 md:px-8 py-4 bg-slate-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#008080] hover:text-white transition-all flex items-center gap-3 group/btn">
                  View Analytics
                  <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
              <SearchX size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">No scores registered</h3>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Start by adding a new exam result</p>
          </div>
        )}
      </div>

      {/* Add Score Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#008080]/60 backdrop-blur-xl max-h-[90vh] overflow-y-auto" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 md:p-10 rounded-[3.5rem] relative z-[2001] shadow-2xl animate-in fade-in zoom-in-95 duration-500 border border-slate-100">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase ">Add Exam Score</h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">Enter student performance details</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 text-slate-600 hover:bg-[#008080] hover:text-white rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student</label>
                  <Select
                    options={students.map(s => ({ value: s.id, label: `${s.name} (${s.roll_number || 'No Roll'})` }))}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        padding: '8px',
                        backgroundColor: '#f8fafc',
                        borderColor: state.isFocused ? '#008080' : '#f1f5f9',
                        borderRadius: '1rem',
                        boxShadow: state.isFocused ? '0 0 0 2px rgba(0,128,128,0.2)' : 'none',
                        '&:hover': { borderColor: '#008080' },
                        fontWeight: '700',
                        fontSize: '0.875rem'
                      }),
                      menuPortal: base => ({ ...base, zIndex: 9999 })
                    }}
                    menuPortalTarget={document.body}
                    value={formData.student_id ? { value: formData.student_id, label: students.find(s => s.id === formData.student_id) ? students.find(s => s.id === formData.student_id).name : '' } : null}
                    onChange={(opt) => setFormData({ ...formData, student_id: opt ? opt.value : '' })}
                    placeholder="Select Student"
                    isClearable
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Subject</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Mathematics, Science, etc."
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Chapter</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="Chapter 1, Integers, etc."
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Publication</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="NCERT, SCERT, etc."
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.publication}
                      onChange={(e) => setFormData({ ...formData, publication: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Marks Obtained</label>
                  <div className="relative group">
                    <Trophy className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="number"
                      required
                      placeholder="Score"
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Marks</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="number"
                      required
                      placeholder="Out of"
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.total}
                      onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Grade</label>
                  <div className="relative group">
                    <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="A+, B, etc."
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Exam / Term</label>
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Unit Test, Mid Term, etc."
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.term}
                      onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Exam Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-100 pl-14 pr-8 py-4 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Question Paper (Optional)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      onChange={(e) => setFormData({ ...formData, question_paper: e.target.files[0] })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Answer Sheet (Optional)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all outline-none"
                      onChange={(e) => setFormData({ ...formData, answer_sheet: e.target.files[0] })}
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={submitting}
                type="submit"
                className="w-full bg-[#008080] text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-[#008080] transition-all shadow-2xl shadow-[#008080]/30 flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
              >
                {submitting ? 'Broadcasting score...' : 'Register Exam Score'}
                {!submitting && <CheckCircle size={18} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AoeExams;
