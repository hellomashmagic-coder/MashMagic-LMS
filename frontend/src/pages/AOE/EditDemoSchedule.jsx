import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Target, User, BookOpen, Presentation, Clock, DollarSign, Save, XCircle } from 'lucide-react';

const EditDemoSchedule = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [students, setStudents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    demo_id: '',
    student_name: '',
    student_type: 'new',
    syllabus: '',
    section: '',
    subject: '',
    faculty_id: '',
    faculty_name_input: '',
    start_time: '',
    end_time: '',
    hour_rate: ''
  });

  const SYLLABUS_OPTIONS = ["CBSE", "STATE", "ICSE", "IGCSE", "IB"];
  const SECTION_OPTIONS = ["KG", "LP", "UP", "HS", "HSS"];

  useEffect(() => {
    fetchFaculties();
    fetchStudents();
    
    // Initialize form with passed data or fetch if not present
    if (location.state && location.state.demo) {
      const demo = location.state.demo;
      setFormData({
        id: demo.id,
        demo_id: demo.demo_id || '',
        student_name: demo.student_name || '',
        student_type: demo.student_type || 'new',
        syllabus: demo.syllabus || '',
        section: demo.section || '',
        subject: demo.subject || '',
        faculty_id: demo.faculty_id || '',
        faculty_name_input: demo.faculty_name || '',
        start_time: demo.start_time || '',
        end_time: demo.end_time || '',
        hour_rate: demo.hour_rate || ''
      });
    } else {
      // In a real scenario, you might want to fetch by ID if accessed directly via URL
      toast.error("Demo data not found. Redirecting to schedule list.");
      navigate('/aoe/demo-schedule');
    }
  }, [location.state, navigate]);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/aoe/students');
      if (response.data.success) {
        setStudents((response.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await api.get('/aoe/dropdowns');
      if (response.data.success && response.data.data.faculties) {
        setFaculties(response.data.data.faculties);
      }
    } catch (error) {
      console.error('Error fetching faculties:', error);
    }
  };

  const uniqueSubjects = Array.from(new Set(faculties.map(f => f.subject).filter(Boolean)));
  const registeredFacultyCount = faculties.length;
  const isRegisteredFacultyName = (name) => {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return false;
    return faculties.some((f) => (f.name || '').trim().toLowerCase() === normalized);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    const typedFacultyName = (formData.faculty_name_input || '').trim();
    if (!typedFacultyName) {
      toast.error('Please enter a faculty name');
      return;
    }

    const exactFacultyMatch = faculties.find(
      (f) => (f.name || '').trim().toLowerCase() === typedFacultyName.toLowerCase()
    );
    const payload = {
      ...formData,
      faculty_id: exactFacultyMatch ? exactFacultyMatch.id : (formData.faculty_id || ''),
      faculty_name_input: typedFacultyName
    };

    setLoading(true);
    try {
      await api.put(`/aoe/demo-schedules/${formData.id}`, payload);
      toast.success('Demo Schedule Updated Successfully');
      navigate('/aoe/demo-schedule');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1200px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-[#008080]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Edit Demo Schedule
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Update details for Demo #{formData.demo_id}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/aoe/demo-schedule')}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-600 transition-colors flex items-center gap-2"
        >
          <XCircle size={16} /> Cancel & Return
        </button>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <form onSubmit={handleUpdateSchedule} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Target size={12}/> Demo ID *
              </label>
              <input
                type="text" required
                value={formData.demo_id}
                onChange={(e) => setFormData({ ...formData, demo_id: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Target size={12}/> Student Type *
              </label>
              <select
                required
                value={formData.student_type}
                onChange={(e) => setFormData({ ...formData, student_type: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              >
                <option value="new">New Student</option>
                <option value="existing">Existing Student</option>
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <User size={12}/> Student Name *
              </label>
              <input
                type="text" required
                value={formData.student_name}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, student_name: val });
                  setShowSuggestions(true);
                }}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
              
              {showSuggestions && formData.student_name && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto top-full left-0">
                  {students
                    .filter(s => s.name.toLowerCase().includes(formData.student_name.toLowerCase()))
                    .map(s => (
                      <div 
                        key={s.id}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData({ 
                            ...formData, 
                            student_name: s.name,
                            student_type: 'existing',
                            syllabus: s.syllabus || '',
                            section: s.section || s.grade || ''
                          });
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="text-xs font-bold text-slate-800">{s.name}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <BookOpen size={12}/> Syllabus *
              </label>
              <select
                required
                value={formData.syllabus}
                onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              >
                <option value="" disabled>Select Syllabus</option>
                {SYLLABUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Target size={12}/> Section *
              </label>
              <select
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              >
                <option value="" disabled>Select Section</option>
                {SECTION_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <BookOpen size={12}/> Subject *
              </label>
              <input
                type="text" required
                value={formData.subject}
                onFocus={() => setShowSubjectSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSubjectSuggestions(false), 200)}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  setShowSubjectSuggestions(true);
                }}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
              
              {showSubjectSuggestions && formData.subject && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto top-full left-0">
                  {uniqueSubjects
                    .filter(subj => subj.toLowerCase().includes(formData.subject.toLowerCase()))
                    .map((subj, idx) => (
                      <div 
                        key={idx}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, subject: subj });
                          setShowSubjectSuggestions(false);
                        }}
                      >
                        <div className="text-xs font-bold text-slate-800">{subj}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Presentation size={12}/> Faculty * <span className="text-[9px] text-slate-400">Registered: {registeredFacultyCount}</span>
              </label>
              <input
                type="text"
                required
                value={formData.faculty_name_input}
                onChange={(e) => {
                  setFormData({ ...formData, faculty_name_input: e.target.value, faculty_id: '' });
                }}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                placeholder="Search or type faculty name..."
                list="edit-demo-faculty-list"
              />
              <datalist id="edit-demo-faculty-list">
                {faculties.map((f) => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
              {!!formData.faculty_name_input && (
                <p className={`mt-2 text-[10px] font-bold ${isRegisteredFacultyName(formData.faculty_name_input) ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isRegisteredFacultyName(formData.faculty_name_input)
                    ? 'Registered faculty detected.'
                    : 'Not in registered list. Will be saved for this demo only.'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12}/> Start Time *
              </label>
              <input
                type="time" required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12}/> End Time *
              </label>
              <input
                type="time" required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DollarSign size={12}/> Hourly Rate
              </label>
              <input
                type="number" step="0.01" min="0"
                value={formData.hour_rate}
                onChange={(e) => setFormData({ ...formData, hour_rate: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-8 border-t border-slate-50">
            <button
              type="submit"
              disabled={loading}
              className="px-5 md:px-10 py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#006666] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Updating...' : <><Save size={16} /> Update Schedule</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDemoSchedule;
