import React, {  useState, useEffect , useDeferredValue } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import { 
  CalendarDays, ListTodo, Plus, Target, Presentation, 
  Video, RefreshCcw, Save, XCircle, Search, Clock, DollarSign, User, BookOpen,
  CheckCircle, CheckCircle2, Pencil, Trash2, Star, MessageSquare, Link as LinkIcon, AlertCircle, SearchX, Calendar, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatTime12h = (time24) => {
  if (!time24) return '';
  const timeStr = String(time24);
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const [hours, minutes] = parts;
  let h = parseInt(hours, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

const AOEDemoSchedule = () => {
  const [activeTab, setActiveTab] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [students, setStudents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFacultySuggestions, setShowFacultySuggestions] = useState(false);
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const [demoList, setDemoList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [nextDemoId, setNextDemoId] = useState('DE01');
  const [nextPreDemoId, setNextPreDemoId] = useState('DE01');
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('demo');
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  // Helper date/time formatters
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB');
  const formatTime = (timeStr) => formatTime12h(timeStr);

  // Current time state for Live button logic
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Form State
  const [formData, setFormData] = useState({
    demo_id: '',
    student_name: '',
    student_type: 'new',
    syllabus: '',
    section: '',
    subject: '',
    faculty_id: '',
    registered_faculty_input: '',
    faculty_name_input: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    hour_rate: '',
    meeting_link: ''
  });

  const SYLLABUS_OPTIONS = ["CBSE", "STATE", "ICSE", "IGCSE", "IB"];
  const SECTION_OPTIONS = ["KG", "LP", "UP", "HS", "HSS"];

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [modalMode, setModalMode] = useState('evaluate');
  const [evalData, setEvalData] = useState({
    prep_score: 0,
    comm_score: 0,
    concept_score: 0,
    engage_score: 0,
    parent_score: 0,
    remarks: ''
  });
  const [updateFormData, setUpdateFormData] = useState({});

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);

  const evalTotalScore = 
    (Number(evalData.prep_score) || 0) + 
    (Number(evalData.comm_score) || 0) + 
    (Number(evalData.concept_score) || 0) + 
    (Number(evalData.engage_score) || 0) + 
    (Number(evalData.parent_score) || 0);

  const uniqueSubjects = Array.from(new Set(faculties.map(f => f.subject).filter(Boolean)));
  const registeredFacultyCount = faculties.length;
  const isRegisteredFacultyName = (name) => {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return false;
    return faculties.some((f) => (f.name || '').trim().toLowerCase() === normalized);
  };

  useEffect(() => {
    fetchFaculties();
    fetchStudents();
    fetchDemos();
    fetchNextIds();
    
    // Update time every minute
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => {
    fetchDemos();
  }, [page, filterType, deferredSearchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filterType, deferredSearchTerm]);

  const fetchDemos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/aoe/demo-schedules', {
        params: { page, limit, type: filterType, search: deferredSearchTerm }
      });
      if (response.data.success) {
        setDemoList(response.data.data || []);
        setTotalRecords(response.data.total || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch demo schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextIds = async () => {
    try {
      const [demoRes, preDemoRes] = await Promise.all([
        api.get('/aoe/demo-schedules/next-id?type=demo'),
        api.get('/aoe/demo-schedules/next-id?type=pre-demo')
      ]);
      if (demoRes.data.success) setNextDemoId(demoRes.data.next_id);
      if (preDemoRes.data.success) setNextPreDemoId(preDemoRes.data.next_id);
    } catch (error) {
      console.error('Failed to fetch next demo IDs', error);
    }
  };

  const handlePreDemoSubmit = async (e) => {
    e.preventDefault();
    try {
      const typedDemoFacultyName = (formData.faculty_name_input || '').trim();
      const registeredFacultyName = (formData.registered_faculty_input || '').trim();
      const exactRegisteredFacultyMatch = faculties.find(
        (f) => (f.name || '').trim().toLowerCase() === registeredFacultyName.toLowerCase()
      );

      const payload = {
        ...formData,
        faculty_id: exactRegisteredFacultyMatch ? exactRegisteredFacultyMatch.id : (formData.faculty_id || ''),
        faculty_name_input: typedDemoFacultyName || registeredFacultyName,
        type: 'pre-demo',
        status: 'completed'
      };

      const scheduleRes = await api.post('/aoe/demo-schedules', payload);
      const newId = scheduleRes.data.demo?.id || scheduleRes.data.id;
      
      if (newId) {
        await api.put(`/aoe/demo-schedules/${newId}/evaluate`, evalData);
      }
      
      toast.success('Pre-Demo Evaluated Successfully');
      setActiveTab('pre-demo');
      setFormData({
        id: undefined, demo_id: '', type: 'demo', student_name: '', student_type: 'new', syllabus: '', section: '', subject: '', faculty_id: '', registered_faculty_input: '', faculty_name_input: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', hour_rate: '', meeting_link: ''
      });
      setEvalData({ prep_score: 0, comm_score: 0, concept_score: 0, engage_score: 0, parent_score: 0, remarks: '' });
      fetchDemos();
      fetchNextIds();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create pre-demo evaluation');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const isPreDemo = activeTab === 'schedule_pre_demo';

    const typedDemoFacultyName = (formData.faculty_name_input || '').trim();
    const registeredFacultyName = (formData.registered_faculty_input || '').trim();
    const exactRegisteredFacultyMatch = faculties.find(
      (f) => (f.name || '').trim().toLowerCase() === registeredFacultyName.toLowerCase()
    );

    if (!isPreDemo && !typedDemoFacultyName) {
      toast.error('Please enter demo faculty name');
      return;
    }

    const payload = {
      ...formData,
      faculty_id: exactRegisteredFacultyMatch ? exactRegisteredFacultyMatch.id : (formData.faculty_id || ''),
      faculty_name_input: typedDemoFacultyName,
      type: isPreDemo ? 'pre-demo' : 'demo'
    };

    try {
      if (formData.id) {
        await api.put(`/aoe/demo-schedules/${formData.id}`, payload);
        toast.success('Demo Schedule Updated Successfully');
        setShowEditModal(false);
      } else {
        await api.post('/aoe/demo-schedules', payload);
        toast.success('Demo Schedule Created Successfully');
      }
      
      setFormData({
        id: undefined,
        demo_id: '',
        type: 'demo',
        student_name: '',
        student_type: 'new',
        syllabus: '',
        section: '',
        subject: '',
        faculty_id: '',
        registered_faculty_input: '',
        faculty_name_input: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        hour_rate: '',
        meeting_link: ''
      });
      setActiveTab(isPreDemo ? 'pre-demo' : 'demo');
      fetchDemos();
      fetchNextIds();
    } catch (error) {
      toast.error(error.response?.data?.message || (formData.id ? 'Failed to update schedule' : 'Failed to create schedule'));
    }
  };

  const handleEditClick = (demo) => {
    setFormData({
      id: demo.id,
      demo_id: demo.demo_id || '',
      type: demo.type || 'demo',
      student_name: demo.student_name || '',
      student_type: demo.student_type || 'new',
      syllabus: demo.syllabus || '',
      section: demo.section || '',
      subject: demo.subject || '',
      faculty_id: demo.faculty_id || '',
      registered_faculty_input: demo.faculty_id ? (faculties.find((f) => f.id === demo.faculty_id)?.name || demo.faculty_name || '') : '',
      faculty_name_input: demo.faculty_name || '',
      date: demo.date ? demo.date.substring(0, 10) : new Date().toISOString().split('T')[0],
      start_time: demo.start_time ? demo.start_time.substring(0, 5) : '',
      end_time: demo.end_time ? demo.end_time.substring(0, 5) : '',
      hour_rate: demo.hour_rate || '',
      meeting_link: demo.meeting_link || ''
    });
    setShowEditModal(true);
  };

  const handleToggleSuccess = async (demoId) => {
    try {
      const res = await api.put(`/aoe/demo-schedules/${demoId}/toggle-success`);
      toast.success('Demo success status updated');
      fetchDemos();
    } catch (error) {
      toast.error('Failed to update success status');
    }
  };

  const handleDeleteClick = async (demoId) => {
    if (window.confirm('Are you sure you want to delete this demo schedule?')) {
      try {
        await api.delete(`/aoe/demo-schedules/${demoId}`);
        toast.success('Demo Schedule Deleted Successfully');
        fetchDemos();
      } catch (error) {
        toast.error('Failed to delete demo schedule');
      }
    }
  };

  const openEvaluationModal = (demo) => {
    setSelectedDemo(demo);
    setEvalData({
      prep_score: demo.prep_score || 0,
      comm_score: demo.comm_score || 0,
      concept_score: demo.concept_score || 0,
      engage_score: demo.engage_score || 0,
      parent_score: demo.parent_score || 0,
      remarks: demo.remarks || ''
    });
    setShowModal(true);
  };

  const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/aoe/demo-schedules/${selectedDemo.id}/evaluate`, evalData);
      toast.success('Evaluation submitted successfully');
      setShowModal(false);
      fetchDemos();
    } catch (error) {
      toast.error('Failed to submit evaluation');
    }
  };

  const filteredDemos = demoList;

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-[#008080]">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Target size={24} />
            </div>
            </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-4 p-2 bg-slate-50/80 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-inner">
        <button
          onClick={() => { setActiveTab('demo'); setFilterType('demo'); }}
          className={`flex-1 min-w-[200px] py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
            activeTab === 'demo'
              ? 'bg-white text-[#008080] shadow-md border-b-2 border-b-[#008080]'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <ListTodo size={16} /> Demo Schedule
        </button>
        <button
          onClick={() => { setActiveTab('pre-demo'); setFilterType('pre-demo'); }}
          className={`flex-1 min-w-[200px] py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
            activeTab === 'pre-demo'
              ? 'bg-white text-emerald-600 shadow-md border-b-2 border-b-emerald-600'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Target size={16} /> Pre-Demo
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'schedule_demo' || activeTab === 'schedule_pre_demo' ? (
        <div className="bg-white p-4 md:p-8 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Target className="text-[#008080]" /> {activeTab === 'schedule_pre_demo' ? 'Add Pre-Demo Evaluation' : 'Schedule New Demo'}
            </h2>
            <button 
              onClick={() => setActiveTab(activeTab === 'schedule_pre_demo' ? 'pre-demo' : 'demo')}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          
          {activeTab === 'schedule_pre_demo' ? (
            <form onSubmit={handlePreDemoSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Target size={12}/> Pre-Demo ID (Auto)
                  </label>
                  <div className="w-full p-4 bg-[#008080]/10 border-2 border-[#008080]/30 rounded-2xl text-sm font-black text-[#008080] tracking-widest flex items-center gap-2">
                    <Target size={14} className="shrink-0" />
                    {nextPreDemoId}
                    <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase">Auto-assigned</span>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Presentation size={12}/> Faculty Name
                    <span className="ml-auto text-[9px] font-bold text-slate-400 normal-case">Type any name or pick from {registeredFacultyCount} registered</span>
                  </label>
                  <input
                    type="text"
                    value={formData.faculty_name_input}
                    onFocus={() => setShowFacultySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowFacultySuggestions(false), 200)}
                    onChange={(e) => {
                      setFormData({ ...formData, faculty_name_input: e.target.value, registered_faculty_input: e.target.value, faculty_id: '' });
                      setShowFacultySuggestions(true);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    placeholder="Type faculty name (registered or new demo faculty)..."
                  />

                  {showFacultySuggestions && formData.faculty_name_input && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto top-full left-0">
                      {faculties
                        .filter(f =>
                          f.name.toLowerCase().includes(formData.faculty_name_input.toLowerCase()) ||
                          (f.subject && f.subject.toLowerCase().includes(formData.faculty_name_input.toLowerCase()))
                        )
                        .map(f => (
                          <div
                            key={f.id}
                            className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({ ...formData, faculty_name_input: f.name, registered_faculty_input: f.name, faculty_id: f.id });
                              setShowFacultySuggestions(false);
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{f.name}</div>
                              {f.subject && <div className="text-[9px] text-slate-400">{f.subject}</div>}
                            </div>
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">REGISTERED</span>
                          </div>
                        ))}
                      {faculties.filter(f => f.name.toLowerCase().includes(formData.faculty_name_input.toLowerCase())).length === 0 && (
                        <div className="px-4 py-4 text-[10px] text-indigo-500 font-bold text-center flex items-center justify-center gap-2">
                          ✦ Demo only — will not be added to database
                        </div>
                      )}
                    </div>
                  )}

                  {formData.faculty_name_input && (
                    <p className={`mt-2 text-[10px] font-bold ${isRegisteredFacultyName(formData.faculty_name_input) ? 'text-emerald-600' : 'text-indigo-500'}`}>
                      {isRegisteredFacultyName(formData.faculty_name_input)
                        ? '✓ Registered faculty — linked to faculty profile'
                        : '✦ Demo faculty name — for demo list only, not added to database'}
                    </p>
                  )}
                </div>
              </div>

              {/* Evaluation criteria part */}
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 text-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">Evaluation Score</h3>
                <div className="text-2xl md:text-4xl font-black text-indigo-900">{evalTotalScore} <span className="text-xl text-indigo-400">/ 50</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { id: 'prep', label: 'Basic Setup', field: 'prep_score' },
                  { id: 'comm', label: 'Communication', field: 'comm_score' },
                  { id: 'concept', label: 'Concept Delivery', field: 'concept_score' },
                  { id: 'engage', label: 'Student Engagement', field: 'engage_score' },
                  { id: 'parent', label: 'Parent Response', field: 'parent_score' }
                ].map((item) => (
                  <div key={item.id} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Star size={12} className={evalData[item.field] > 0 ? "text-amber-400" : "text-slate-300"}/> 
                      {item.label} (1-10)
                    </label>
                    <input
                      type="number" min="0" max="10" required
                      value={evalData[item.field]}
                      onChange={(e) => setEvalData({...evalData, [item.field]: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <MessageSquare size={12}/> Remarks
                </label>
                <textarea
                  rows="3" required
                  value={evalData.remarks}
                  onChange={(e) => setEvalData({...evalData, remarks: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  placeholder="Add your remarks about the demo..."
                />
              </div>

              <div className="flex justify-end pt-8 border-t border-slate-50">
                <button
                  type="submit"
                  className="px-5 md:px-10 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Submit Pre-Demo
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateSchedule} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Target size={12}/> Demo ID {formData.id ? '(Editable)' : '(Auto)'}
                </label>
                {formData.id ? (
                  <input
                    type="text" required
                    value={formData.demo_id}
                    onChange={(e) => setFormData({ ...formData, demo_id: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    placeholder="Demo ID"
                  />
                ) : (
                  <div className="w-full p-4 bg-[#008080]/10 border-2 border-[#008080]/30 rounded-2xl text-sm font-black text-[#008080] tracking-widest flex items-center gap-2">
                    <Target size={14} className="shrink-0" />
                    {nextDemoId}
                    <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase">Auto-assigned</span>
                  </div>
                )}
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
                  <option value="demo">Demo Student</option>
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
                  placeholder="Type to search or enter new name"
                />
                
                {/* Custom Autocomplete Dropdown */}
                {showSuggestions && formData.student_name && activeTab !== 'schedule_pre_demo' && (
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
                          {s.email && <div className="text-[9px] text-slate-400">{s.email}</div>}
                        </div>
                      ))}
                    {students.filter(s => s.name.toLowerCase().includes(formData.student_name.toLowerCase())).length === 0 && (
                      <div className="px-4 py-4 text-[10px] text-indigo-500 font-bold text-center flex items-center justify-center gap-2">
                        ✦ Demo only — will not be added to database
                      </div>
                    )}
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
                  placeholder="E.g., Mathematics"
                />
                
                {/* Subject Autocomplete Dropdown */}
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
                    {uniqueSubjects.filter(subj => subj.toLowerCase().includes(formData.subject.toLowerCase())).length === 0 && (
                      <div className="px-4 py-4 text-[10px] text-slate-500 font-bold text-center">
                        No matches found. You can add this as a new subject.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Presentation size={12}/> {activeTab === 'schedule_pre_demo' ? 'Demo Faculty Name' : 'Faculty Name'} <span className="text-rose-500">*</span>
                  {activeTab !== 'schedule_pre_demo' && <span className="ml-auto text-[9px] font-bold text-slate-400 normal-case">Type any name or pick from {registeredFacultyCount} registered</span>}
                </label>
                <input
                  type="text"
                  required={true}
                  value={formData.faculty_name_input}
                  onFocus={() => setShowFacultySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFacultySuggestions(false), 200)}
                  onChange={(e) => {
                    setFormData({ ...formData, faculty_name_input: e.target.value, registered_faculty_input: e.target.value, faculty_id: '' });
                    setShowFacultySuggestions(true);
                  }}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  placeholder="Type faculty name (registered or new demo faculty)..."
                />

                {showFacultySuggestions && formData.faculty_name_input && activeTab !== 'schedule_pre_demo' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto top-full left-0">
                    {faculties
                      .filter(f =>
                        f.name.toLowerCase().includes(formData.faculty_name_input.toLowerCase()) ||
                        (f.subject && f.subject.toLowerCase().includes(formData.faculty_name_input.toLowerCase()))
                      )
                      .map(f => (
                        <div
                          key={f.id}
                          className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, faculty_name_input: f.name, registered_faculty_input: f.name, faculty_id: f.id });
                            setShowFacultySuggestions(false);
                          }}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{f.name}</div>
                            {f.subject && <div className="text-[9px] text-slate-400">{f.subject}</div>}
                          </div>
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">REGISTERED</span>
                        </div>
                      ))}
                    {faculties.filter(f => f.name.toLowerCase().includes(formData.faculty_name_input.toLowerCase())).length === 0 && (
                      <div className="px-4 py-4 text-[10px] text-indigo-500 font-bold text-center flex items-center justify-center gap-2">
                        ✦ Demo only — will not be added to database
                      </div>
                    )}
                  </div>
                )}

                {formData.faculty_name_input && (
                  <p className={`mt-2 text-[10px] font-bold ${isRegisteredFacultyName(formData.faculty_name_input) ? 'text-emerald-600' : 'text-indigo-500'}`}>
                    {isRegisteredFacultyName(formData.faculty_name_input)
                      ? '✓ Registered faculty — linked to faculty profile'
                      : '✦ Demo faculty name — for demo list only, not added to database'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <CalendarDays size={12}/> Date {activeTab !== 'schedule_pre_demo' && '*'}
                </label>
                <input
                  type="date" required={activeTab !== 'schedule_pre_demo'}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Clock size={12}/> Start Time {activeTab !== 'schedule_pre_demo' && '*'}
                </label>
                <input
                  type="time" required={activeTab !== 'schedule_pre_demo'}
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Clock size={12}/> End Time {activeTab !== 'schedule_pre_demo' && '*'}
                </label>
                <input
                  type="time" required={activeTab !== 'schedule_pre_demo'}
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
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Video size={12}/> Meeting Link (e.g. Google Meet / Zoom)
                </label>
                <input
                  type="text"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-slate-50">
              <button
                type="submit"
                className="px-5 md:px-10 py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#006666] transition-all flex items-center gap-2"
              >
                <Save size={16} /> Save Schedule
              </button>
            </div>
          </form>
          )}
        </div>
      ) : (
        <div className="bg-white p-4 md:p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-50 pb-6">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <ListTodo className={activeTab === 'pre-demo' ? 'text-emerald-600' : 'text-[#008080]'} /> 
                {activeTab === 'pre-demo' ? 'Pre-Demos' : 'Scheduled Demos'}
              </h2>
              <button
                onClick={() => {
                  setFormData({ id: undefined, demo_id: '', student_name: '', student_type: 'new', syllabus: '', section: '', subject: '', faculty_id: '', registered_faculty_input: '', faculty_name_input: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', hour_rate: '', meeting_link: '' });
                  setActiveTab(activeTab === 'pre-demo' ? 'schedule_pre_demo' : 'schedule_demo');
                }}
                className={`px-6 py-2.5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 ${activeTab === 'pre-demo' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#008080] hover:bg-[#006666]'}`}
              >
                <Plus size={14} /> Add {activeTab === 'pre-demo' ? 'Pre-Demo Evaluation' : 'Demo'}
              </button>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search student or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[300px] pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none border border-slate-100 focus:ring-4 ring-[#008080]/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredDemos.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchX size={32} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">No Demos Found</h3>
              <p className="text-slate-500 font-medium text-sm mt-2">Adjust your search or filter criteria</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDemos.map(demo => (
                <div key={demo.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-150"></div>
                  
                  {/* Status Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    demo.status === 'scheduled' ? 'bg-emerald-500' :
                    demo.status === 'completed' ? 'bg-[#008080]' :
                    demo.status === 'cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}></div>

                  <div className="relative z-10 flex flex-col lg:flex-row gap-8 justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          demo.type === 'demo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {demo.type === 'pre-demo' ? 'Pre-Demo' : 'Demo'}
                        </span>
                        <span className="text-sm font-bold text-slate-400">ID: {demo.demo_id}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</p>
                          <p className="text-lg font-black text-slate-900">{demo.student_name}</p>
                          <p className="text-sm font-medium text-slate-500 mt-1">{demo.student_type} • {demo.syllabus}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faculty / Subject</p>
                          <p className="text-lg font-black text-slate-900">{demo.faculty_name || 'Unassigned'}</p>
                          <p className="text-sm font-medium text-slate-500 mt-1">{demo.subject} • Sec {demo.section}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 min-w-[200px]">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar size={16} className="text-[#008080]" />
                          <span className="font-bold text-slate-700">{formatDate(demo.date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-[#008080]" />
                          <span className="font-bold text-slate-700">{formatTime(demo.start_time)} - {formatTime(demo.end_time)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 justify-between">
                        <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                          demo.status === 'scheduled' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          demo.status === 'completed' ? 'bg-slate-50 border-slate-200 text-slate-700' :
                          demo.status === 'cancelled' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {demo.status}
                        </span>
                        
                        <div className="flex gap-2">
                          {demo.meeting_link && (
                            <a 
                              href={demo.meeting_link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"
                              title="Join Meeting"
                            >
                              <Video size={18} />
                            </a>
                          )}
                          <button 
                            onClick={() => openEvaluationModal(demo)}
                            className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-[#008080] hover:text-white transition-colors shadow-sm"
                            title="Update Status/Score"
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scores Preview for Completed */}
                  {demo.status === 'completed' && demo.total_score > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-6 overflow-x-auto relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Score</p>
                        <p className="text-2xl font-black text-[#008080]">{demo.total_score}<span className="text-sm text-slate-400">/50</span></p>
                      </div>
                      <div className="w-px h-10 bg-slate-200"></div>
                      <div className="flex gap-8 min-w-max">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Prep</p>
                          <p className="font-bold text-slate-700">{demo.prep_score}/10</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Comm</p>
                          <p className="font-bold text-slate-700">{demo.comm_score}/10</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Concept</p>
                          <p className="font-bold text-slate-700">{demo.concept_score}/10</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Engage</p>
                          <p className="font-bold text-slate-700">{demo.engage_score}/10</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Parent</p>
                          <p className="font-bold text-slate-700">{demo.parent_score}/10</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluation Modal */}
      {showModal && selectedDemo && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {selectedDemo?.type === 'pre-demo' ? 'Evaluate Pre-Demo' : 'Evaluate Demo'}
                </h2>
                <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mt-1">
                  {selectedDemo.student_name} • {selectedDemo.faculty_name}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-all">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleEvaluationSubmit} className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8">
              
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 text-center mb-8">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Total Score</p>
                <h3 className="text-2xl md:text-4xl font-black text-indigo-900">{evalTotalScore} <span className="text-xl text-indigo-400">/ 50</span></h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: selectedDemo?.type === 'pre-demo' ? 'Basic Setup' : 'Preparation', field: 'prep_score' },
                  { label: 'Communication', field: 'comm_score' },
                  { label: 'Concept Delivery', field: 'concept_score' },
                  { label: 'Student Engagement', field: 'engage_score' },
                  { label: 'Parent Response', field: 'parent_score' },
                ].map((item) => (
                  <div key={item.field} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex justify-between">
                      <span>{item.label}</span>
                      <span className="text-[#008080]">out of 10</span>
                    </label>
                    <input
                      type="number" min="0" max="10" required
                      value={evalData[item.field]}
                      onChange={(e) => setEvalData({...evalData, [item.field]: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Remarks</label>
                <textarea
                  rows="3"
                  value={evalData.remarks}
                  onChange={(e) => setEvalData({...evalData, remarks: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  placeholder="Add your remarks about the demo..."
                ></textarea>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#006666] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Demo Modal */}
      {showEditModal && formData.id && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Demo Schedule</h2>
                <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mt-1">
                  Update details for {formData.student_name}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setFormData({
                    id: undefined, demo_id: '', type: 'demo', student_name: '', student_type: 'new', syllabus: '', section: '', subject: '', faculty_id: '', registered_faculty_input: '', faculty_name_input: '', start_time: '', end_time: '', hour_rate: '', meeting_link: ''
                  });
                }} 
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-all"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Target size={12}/> Demo ID *</label>
                  <input
                    type="text" required
                    value={formData.demo_id}
                    onChange={(e) => setFormData({ ...formData, demo_id: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Target size={12}/> Student Type *</label>
                  <select required value={formData.student_type} onChange={(e) => setFormData({ ...formData, student_type: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none">
                    <option value="new">New Student</option>
                    <option value="existing">Existing Student</option>
                  </select>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><User size={12}/> Student Name *</label>
                  <input type="text" required value={formData.student_name} onChange={(e) => setFormData({ ...formData, student_name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><BookOpen size={12}/> Syllabus *</label>
                  <select required value={formData.syllabus} onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none">
                    <option value="" disabled>Select Syllabus</option>
                    {SYLLABUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Target size={12}/> Section *</label>
                  <select required value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none">
                    <option value="" disabled>Select Section</option>
                    {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><BookOpen size={12}/> Subject *</label>
                  <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Presentation size={12}/> Registered Faculty (Optional) <span className="text-[9px] text-slate-400">Registered: {registeredFacultyCount}</span></label>
                  <input
                    type="text"
                    value={formData.registered_faculty_input}
                    onFocus={() => setShowFacultySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowFacultySuggestions(false), 200)}
                    onChange={(e) => {
                      setFormData({ ...formData, registered_faculty_input: e.target.value, faculty_id: '' });
                      setShowFacultySuggestions(true);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    placeholder="Search registered faculty..."
                  />
                  {showFacultySuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-40 overflow-y-auto top-full left-0">
                      {faculties
                        .filter(f => f.name.toLowerCase().includes(formData.registered_faculty_input.toLowerCase()) || (f.subject && f.subject.toLowerCase().includes(formData.registered_faculty_input.toLowerCase())))
                        .map(f => (
                          <div 
                            key={f.id}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({ ...formData, registered_faculty_input: f.name, faculty_id: f.id });
                              setShowFacultySuggestions(false);
                            }}
                          >
                            <div className="text-xs font-bold text-slate-800">{f.name}</div>
                            {f.subject && <div className="text-[9px] text-slate-400">{f.subject}</div>}
                          </div>
                        ))}
                      {faculties.filter(f => f.name.toLowerCase().includes(formData.registered_faculty_input.toLowerCase())).length === 0 && (
                        <div className="px-4 py-4 text-[10px] text-slate-500 font-bold text-center">
                          No registered faculty match.
                        </div>
                      )}
                    </div>
                  )}
                  {!!formData.registered_faculty_input && (
                    <p className={`mt-2 text-[10px] font-bold ${isRegisteredFacultyName(formData.registered_faculty_input) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isRegisteredFacultyName(formData.registered_faculty_input)
                        ? 'Registered faculty detected.'
                        : 'Type and pick from registered list (optional field).'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Presentation size={12}/> Demo Faculty Name {formData.type !== 'pre-demo' && '*'}</label>
                  <input
                    type="text"
                    required={formData.type !== 'pre-demo'}
                    value={formData.faculty_name_input}
                    onChange={(e) => setFormData({ ...formData, faculty_name_input: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                    placeholder="Type demo faculty name..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><CalendarDays size={12}/> Date {formData.type !== 'pre-demo' && '*'}</label>
                  <input type="date" required={formData.type !== 'pre-demo'} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={12}/> Start Time {formData.type !== 'pre-demo' && '*'}</label>
                  <input type="time" required={formData.type !== 'pre-demo'} value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={12}/> End Time {formData.type !== 'pre-demo' && '*'}</label>
                  <input type="time" required={formData.type !== 'pre-demo'} value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><DollarSign size={12}/> Hourly Rate</label>
                  <input type="number" step="0.01" min="0" value={formData.hour_rate} onChange={(e) => setFormData({ ...formData, hour_rate: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Video size={12}/> Meeting Link (e.g. Google Meet / Zoom)</label>
                  <input type="text" value={formData.meeting_link} onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-slate-50">
                <button
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false);
                    setFormData({
                      id: undefined, demo_id: '', student_name: '', student_type: 'new', syllabus: '', section: '', subject: '', faculty_id: '', registered_faculty_input: '', faculty_name_input: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', hour_rate: '', meeting_link: ''
                    });
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#006666] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Update Demo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AOEDemoSchedule;
