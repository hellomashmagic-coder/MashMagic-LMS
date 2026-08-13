import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Clock, Calendar, Search, Plus, Filter, Target, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, RefreshCcw, Save, CalendarClock, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import MultiDatePicker from "react-multi-date-picker";
import Select from 'react-select';
const DatePicker = MultiDatePicker.default ? MultiDatePicker.default : MultiDatePicker;
import { useNavigate } from 'react-router-dom';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { useAuth } from '../../context/AuthContext';

const formatTo24hTime = (timeStr) => {
  if (!timeStr) return '10:00';
  let cleanTime = timeStr.trim().toLowerCase().replace('.', ':');
  
  const isPM = cleanTime.includes('pm');
  const isAM = cleanTime.includes('am');
  cleanTime = cleanTime.replace('am', '').replace('pm', '').trim();
  
  const parts = cleanTime.split(':');
  if (parts.length >= 1) {
    let hours = parseInt(parts[0], 10);
    let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    
    if (isNaN(hours)) return '10:00';
    if (isNaN(minutes)) minutes = 0;
    
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
    
    const hoursStr = String(hours).padStart(2, '0');
    const minsStr = String(minutes).padStart(2, '0');
    return `${hoursStr}:${minsStr}`;
  }
  return '10:00';
};

const Timetable = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [summary, setSummary] = useState({
    total: 0, completed: 0, cancelled: 0, postponed: 0, upcoming: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkSessions, setBulkSessions] = useState([]);
  const [studentSchedule, setStudentSchedule] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editScheduleData, setEditScheduleData] = useState([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    student_id: '',
    mentor_id: '',
    status: '',
    start_date: '',
    end_date: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    chapter: '',
    session_type: 'Regular Class',
    status: 'Scheduled',
    status_reason: '',
    notes: '',
    faculty_id: null,
    faculty_name: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchTimetable(true);
    const interval = setInterval(() => {
      fetchTimetable(false);
    }, 10000); // Silent background auto-polling every 10 seconds
    return () => clearInterval(interval);
  }, [filters]);

  useEffect(() => {
    fetchStudents();
    fetchFaculties();
    if (user?.role === 'academic_head' || user?.role === 'super_admin') {
      fetchMentors();
    }
  }, [user, filters.mentor_id]);

  const fetchFaculties = async () => {
    try {
      const res = await api.get('/mentor/faculties-all');
      setFaculties(res.data.data);
    } catch (error) {
      console.error("Failed to load faculties");
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await api.get('/academic-head/mentors-all');
      setMentors(res.data.data);
    } catch (error) {
      console.error("Failed to load mentors");
    }
  };

  const fetchTimetable = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await api.get(`/mentor/timetable?${params.toString()}`);
      setSessions(res.data.data);
      setSummary(res.data.summary);
    } catch (error) {
      if (showLoading) toast.error("Failed to load timetable");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const endpoint = (user?.role === 'academic_head' || user?.role === 'super_admin')
        ? `/academic-head/students-all${filters.mentor_id ? `?mentor_id=${filters.mentor_id}` : ''}`
        : '/mentor/students';
      const res = await api.get(endpoint);
      const sortedStudents = (res.data.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setStudents(sortedStudents);
    } catch (error) {
      console.error("Failed to load students");
    }
  };
  
  useEffect(() => {
    const autoPopulate = async () => {
      if (formData.student_id && !editingSession) {
        try {
          setIsScheduleLoading(true);
          const res = await api.get(`/mentor/students/${formData.student_id}/schedule`);
          const schedule = res.data.data;
          setStudentSchedule(schedule || []);
          
          const dayName = new Date(formData.date).toLocaleDateString('en-GB', { weekday: 'long' });
          const todaySlot = schedule.find(slot => slot.day_of_week === dayName);
          
          if (todaySlot) {
            toast.success(`Registration schedule available for this day. You can auto-fill from the reference list.`);
          }
        } catch (error) {
          console.error("Failed to fetch student schedule");
          setStudentSchedule([]);
        } finally {
          setIsScheduleLoading(false);
        }
      } else {
        setStudentSchedule(null);
      }
    };
    autoPopulate();
  }, [formData.student_id, formData.date]);

  const handleCreateOpen = () => {
    setEditingSession(null);
    setRescheduleMode(false);
    setIsBulkMode(false);
    setBulkSessions([]);
    setFormData({
      student_id: filters.student_id || '',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:00',
      chapter: '',
      session_type: 'Regular Class',
      status: 'Scheduled',
      status_reason: '',
      notes: '',
      faculty_id: null,
      faculty_name: ''
    });
    setShowModal(true);
  };
  
  const handleBulkOpen = () => {
    setEditingSession(null);
    setRescheduleMode(false);
    setIsBulkMode(true);
    setBulkSessions([]);
    setFormData({
      student_id: filters.student_id || '',
      date: [new Date().toISOString().split('T')[0]],
      start_time: '',
      end_time: '',
      chapter: '',
      session_type: 'Regular Class',
      status: 'Scheduled',
      status_reason: '',
      notes: '',
      faculty_id: null,
      faculty_name: ''
    });
    setShowModal(true);
  };

  const handleEditOpen = (session) => {
    setRescheduleMode(false);
    setEditingSession(session);
    setFormData({
      student_id: session.student_id,
      date: formatDate(session.date) || '',
      start_time: (session.start_time || '10:00').substring(0, 5),
      end_time: (session.end_time || '11:00').substring(0, 5),
      chapter: session.chapter || '',
      subject: session.subject || '',
      session_type: session.session_type || 'Regular Class',
      status: session.status || 'Scheduled',
      status_reason: session.status_reason || '',
      notes: session.notes || '',
      faculty_id: String(session.faculty_id || ''),
      faculty_name: session.faculty_name || '',
      session_mode: session.session_mode || 'Online'
    });
    setShowModal(true);
  };

  const handleRescheduleOpen = (session) => {
    setRescheduleMode(true);
    setEditingSession(session);
    setFormData({
      student_id: session.student_id,
      date: formatDate(session.date) || '',
      start_time: (session.start_time || '10:00').substring(0, 5),
      end_time: (session.end_time || '11:00').substring(0, 5),
      chapter: session.chapter || '',
      subject: session.subject || '',
      session_type: session.session_type || 'Regular Class',
      status: session.status || 'Scheduled',
      status_reason: session.status_reason || '',
      notes: session.notes || '',
      faculty_id: String(session.faculty_id || ''),
      faculty_name: session.faculty_name || '',
      session_mode: session.session_mode || 'Online'
    });
    setShowModal(true);
  };

  const handleDelete = async (sessionParam) => {
    const id = typeof sessionParam === 'object' ? sessionParam.id : sessionParam;
    const name = typeof sessionParam === 'object' ? sessionParam.student_name : 'the selected';
    
    premiumConfirm(async () => {
      try {
        await api.delete(`/mentor/timetable/${id}`);
        toast.success("Session deleted");
        fetchTimetable();
      } catch (error) {
        toast.error(error.response?.data?.message || "Delete failed");
      }
    }, {
      name: `${name}'s Session`,
      title: 'Delete Scheduled Session',
      message: `Are you sure you want to permanently delete this session? This action will remove it from the database forever and cannot be undone.`,
      type: 'danger'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isBulkMode) {
      if (formData.end_time <= formData.start_time) {
        toast.error("End time must be after start time");
        return;
      }

      const needsReason = ['Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled'].includes(formData.status);
      if (needsReason && !formData.status_reason?.trim()) {
        toast.error(`Please provide a reason for mark as ${formData.status}`);
        return;
      }

      try {
        if (editingSession) {
          const updateData = { ...formData, date: Array.isArray(formData.date) ? formData.date[0] : formData.date };
          await api.put(`/mentor/timetable/${editingSession.id}`, updateData);
          toast.success("Session updated");
        } else {
          const dates = Array.isArray(formData.date) ? formData.date : [formData.date];
          for (const dateStr of dates) {
            await api.post('/mentor/timetable', { ...formData, date: dateStr });
          }
          if (dates.length > 1) {
            toast.success(`${dates.length} Sessions created`);
          } else {
            toast.success("Session created");
          }
        }
        setShowModal(false);
        setEditingSession(null);
        setRescheduleMode(false);
        fetchTimetable();
      } catch (error) {
        toast.error(error.response?.data?.message || "Operation failed");
      }
    } else {
      if (bulkSessions.length === 0) {
        toast.error("Add at least one session to the list");
        return;
      }

      try {
        console.log("Sending bulk timetable data:", { student_id: formData.student_id, sessions: bulkSessions });
        await api.post('/mentor/timetable/batch', {
          student_id: formData.student_id,
          sessions: bulkSessions
        });
        toast.success(`${bulkSessions.length} sessions scheduled successfully`);
        setShowModal(false);
        fetchTimetable();
      } catch (error) {
        console.error("Batch Timetable Creation Error:", error);
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        toast.error(error.response?.data?.message || "Batch operation failed");
      }
    }
  };
  
  const addToBatch = () => {
    if (!formData.student_id || !formData.date || !formData.start_time || !formData.end_time) {
      toast.error("Please fill all required fields for this session");
      return;
    }
    
    const updatedSessions = [...bulkSessions, { ...formData }];
    updatedSessions.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.start_time.localeCompare(b.start_time);
    });
    setBulkSessions(updatedSessions);
    toast.success("Session added to list");
    setFormData({
      ...formData,
      start_time: '',
      end_time: '',
      chapter: '',
      faculty_id: null,
      faculty_name: ''
    });
    setSelectedSlot(null);
  };
  
  const removeFromBatch = (index) => {
    setBulkSessions(bulkSessions.filter((_, i) => i !== index));
  };

  const handleScheduleEditOpen = () => {
    if (!formData.student_id) {
      toast.error("Please select a student first");
      return;
    }
    setEditScheduleData([...studentSchedule]);
    setShowScheduleModal(true);
  };

  const addScheduleSlot = () => {
    setEditScheduleData([...editScheduleData, {
      day_of_week: 'Monday',
      start_time: '10:00:00',
      end_time: '11:00:00',
      subject: '',
      faculty_id: null
    }]);
  };

  const removeScheduleSlot = (index) => {
    setEditScheduleData(editScheduleData.filter((_, i) => i !== index));
  };

  const handleScheduleSubmit = async () => {
    try {
      await api.post(`/mentor/students/${formData.student_id}/schedule`, { schedules: editScheduleData });
      toast.success("Registration schedule updated");
      setShowScheduleModal(false);
      // Refresh current student's schedule reference
      const res = await api.get(`/mentor/students/${formData.student_id}/schedule`);
      setStudentSchedule(res.data.data);
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update schedule");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-[#008080] text-white border-[#008080]';
      case 'Completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'Postponed': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'Cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'Faculty Cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'Student Cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'No Show': return 'bg-slate-800 text-white border-[#008080]';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setQuickFilter = (type) => {
    const today = new Date();
    let start, end;

    if (type === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (type === 'today') {
      start = today;
      end = today;
    } else if (type === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      end = new Date(today.setDate(diff + 6));
    }

    setFilters({
      ...filters,
      start_date: formatDate(start),
      end_date: formatDate(end)
    });
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-[#008080]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#008080] rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 group hover:rotate-0 transition-all duration-500">
            <CalendarClock size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Timetable Management</h1>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">View student class schedules</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setQuickFilter('this_month')}
            className="flex items-center gap-2 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
          >
            <Calendar size={16} /> This Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {[
          { label: 'Total Sessions', value: summary.total, icon: Calendar, color: 'text-slate-900', bg: 'bg-white border-slate-100' },
          { label: 'Completed', value: summary.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100/50' },
          { label: 'Upcoming', value: summary.upcoming, icon: Clock, color: 'text-[#008080]', bg: 'bg-[#008080]/10 border-[#008080]/50' },
          { label: 'Postponed', value: summary.postponed, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-100/50' },
          { label: 'Cancelled', value: summary.cancelled, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50/50 border-rose-100/50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 md:p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-500`}>
            <div className={`w-10 h-10 ${stat.bg.replace('/50', '')} rounded-xl flex items-center justify-center mb-4 text-slate-600 group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-end gap-4 md:gap-6 justify-between">
          <div className="flex-1 w-full md:min-w-[240px]">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1 mb-2 block">Target Student</label>
            <div className="relative group">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={16} />
              <select
                value={filters.student_id}
                onChange={(e) => setFilters({ ...filters, student_id: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-black text-slate-700 focus:bg-white focus:ring-4 ring-[#008080]/10 outline-none appearance-none transition-all cursor-pointer"
              >
                <option value="">All Students</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="w-full md:w-[200px]">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1 mb-2 block">Filter by Month</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={16} />
              <select
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (e.target.value === 'full') {
                    setFilters({ ...filters, start_date: '', end_date: '' });
                    return;
                  }
                  const [year, month] = e.target.value.split('-');
                  const start = new Date(year, month - 1, 1);
                  const end = new Date(year, month, 0);
                  setFilters({
                    ...filters,
                    start_date: formatDate(start),
                    end_date: formatDate(end)
                  });
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-black text-slate-700 focus:bg-white focus:ring-4 ring-[#008080]/10 outline-none appearance-none transition-all cursor-pointer"
              >
                <option value="">Select Target Month</option>
                <option value="full">All Months</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="w-full md:w-[200px]">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1 mb-2 block">Filter by Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-black text-slate-700 focus:bg-white focus:ring-4 ring-[#008080]/10 outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {['Scheduled', 'Completed', 'Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button
            onClick={() => setFilters({ ...filters, student_id: '', status: '', start_date: '', end_date: '' })}
            className="px-4 md:px-8 py-4 bg-[#008080] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#008080] shadow-xl shadow-slate-100 transition-all active:scale-95 "
          >
            Reset Filters
          </button>
        </div>

        <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <label className="text-[9px] font-black text-slate-600 uppercase ">Custom Range:</label>
            <label className="text-[9px] font-black text-slate-600 uppercase ">Custom Range:</label>
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 z-50 relative">
              <DatePicker
                range
                value={[filters.start_date, filters.end_date].filter(Boolean)}
                onChange={(dates) => {
                  if (dates && dates.length > 0) {
                    const sorted = dates.map(d => d.format("YYYY-MM-DD")).sort();
                    setFilters({ ...filters, start_date: sorted[0], end_date: sorted[sorted.length - 1] || sorted[0] });
                  } else {
                    setFilters({ ...filters, start_date: '', end_date: '' });
                  }
                }}
                placeholder="Select Date Range..."
                inputClass="bg-transparent border-none px-3 py-1 text-[10px] font-bold text-slate-600 outline-none w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-32 space-y-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] animate-pulse">Loading sessions...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden flex flex-col md:flex-row items-stretch">
              <div className={`w-3 shrink-0 ${getStatusColor(session.status).split(' ')[0]} opacity-40 group-hover:opacity-100 transition-opacity`}></div>

              <div className="flex-grow p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6 min-w-[250px]">
                  <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-600 group-hover:bg-[#008080] group-hover:text-white transition-all duration-700 -rotate-3 group-hover:rotate-0">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">{session.student_name}</h3>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1">
                      {session.session_number === 0 ? 'SN N/A' : `SN #${session.session_number}`} • {session.session_type} 
                      {session.faculty_name && ` • Faculty: ${session.faculty_name}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-8 flex-grow">
                  <div className="flex items-center gap-3 bg-slate-50/50 px-5 py-3 rounded-2xl border border-slate-100 transition-colors group-hover:bg-[#008080]/10">
                    <Calendar size={16} className="text-[#008080]" />
                    <span className="text-xs font-black text-slate-700 ">{new Date(session.date).toLocaleDateString('en-GB')}</span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50/50 px-5 py-3 rounded-2xl border border-slate-100 transition-colors group-hover:bg-[#008080]/10">
                    <Clock size={16} className="text-[#008080]" />
                    <span className="text-xs font-black text-slate-700 tracking-tighter">
                      {(session.start_time || '00:00').substring(0, 5)} - {(session.end_time || '00:00').substring(0, 5)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 flex-grow min-w-[200px]">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1">Chapter / Primary Topic</span>
                    <p className="text-sm font-black text-slate-900 truncate ">{session.chapter || 'Pending topic assignment'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 pl-8 md:border-l border-slate-100">
                  <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(session.status)} shadow-sm whitespace-nowrap`}>
                    {session.status}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="col-span-full py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100 shadow-inner">
                <Target size={48} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">No sessions found matching your criteria.</h3>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {rescheduleMode ? 'Quick Reschedule' : (editingSession ? 'Edit Session' : 'Create New Session')}
                </h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                  {rescheduleMode ? 'Change session date' : (editingSession ? 'Modify existing session details' : 'Schedule a new class session')}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingSession(null); setRescheduleMode(false); }} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90 shadow-inner">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-10 space-y-12">
              {rescheduleMode ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Student</p>
                      <p className="text-base font-black text-indigo-900">{editingSession?.student_name}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">New Target Date *</label>
                    <DatePicker
                      multiple={!editingSession}
                      value={formData.date}
                      onChange={(dates) => {
                        if (Array.isArray(dates)) {
                          setFormData({ ...formData, date: dates.map(d => d.format("YYYY-MM-DD")) });
                        } else if (dates) {
                          setFormData({ ...formData, date: [dates.format("YYYY-MM-DD")] });
                        } else {
                          setFormData({ ...formData, date: [] });
                        }
                      }}
                      containerClassName="w-full relative z-50"
                      inputClass="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-lg font-black focus:bg-white focus:ring-8 ring-indigo-500/10 transition-all outline-none cursor-pointer"
                      placeholder="Select Target Date(s)"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-8">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student Selection *</label>
                      <select
                        required
                        disabled={!!editingSession}
                        value={formData.student_id || ''}
                        onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none disabled:opacity-50"
                      >
                        <option value="">Select Student</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Session Date *</label>
                      <DatePicker
                        multiple={!editingSession}
                        value={formData.date}
                        onChange={(dates) => {
                          if (Array.isArray(dates)) {
                            setFormData({ ...formData, date: dates.map(d => d.format("YYYY-MM-DD")) });
                          } else if (dates) {
                            setFormData({ ...formData, date: [dates.format("YYYY-MM-DD")] });
                          } else {
                            setFormData({ ...formData, date: [] });
                          }
                        }}
                        containerClassName="w-full relative z-50"
                        inputClass="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none cursor-pointer"
                        placeholder="Select Date(s)"
                      />
                    </div>

                    {/* Registration Slot Helper */}
                    {studentSchedule && studentSchedule.length > 0 && !editingSession && (
                      <div className="md:col-span-2 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                             <Info size={14} /> Registered Academic Slot Reference
                          </label>
                          <button
                            type="button"
                            onClick={handleScheduleEditOpen}
                            className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 uppercase"
                          >
                            <Edit2 size={12} /> Edit Registration Timetable
                          </button>
                        </div>
                        <select
                          onChange={(e) => {
                            const idx = e.target.value;
                            if (idx === "") return;
                            const slot = studentSchedule[idx];
                            setFormData({
                              ...formData,
                              start_time: formatTo24hTime(slot.start_time),
                              end_time: formatTo24hTime(slot.end_time),
                              chapter: slot.subject || '',
                              faculty_id: String(slot.faculty_id),
                              faculty_name: slot.faculty_name
                            });
                            setSelectedSlot(idx);
                          }}
                          className="w-full p-4 bg-white border border-emerald-200 rounded-2xl text-[11px] font-black text-emerald-700 outline-none focus:ring-4 ring-emerald-500/10 transition-all cursor-pointer"
                        >
                          <option value="">Auto-fill from registered schedule...</option>
                          {studentSchedule && studentSchedule.map((slot, idx) => {
                            const currentDay = new Date(formData.date).toLocaleDateString('en-GB', { weekday: 'long' });
                            if (slot.day_of_week !== currentDay) return null;
                            return (
                              <option key={idx} value={idx}>
                                 {slot.subject} | {(slot.start_time || '').substring(0, 5)} - {(slot.end_time || '').substring(0, 5)} ({slot.faculty_name})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {!editingSession && !isScheduleLoading && studentSchedule !== null && studentSchedule.length === 0 && formData.student_id && (
                      <div className="md:col-span-2 bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center justify-between">
                         <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">No registration schedule found for this student</p>
                         <button
                            type="button"
                            onClick={handleScheduleEditOpen}
                            className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl uppercase"
                          >
                            Setup Schedule
                          </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Start Time *</label>
                      <input
                        type="time"
                        required={!isBulkMode}
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">End Time *</label>
                      <input
                        type="time"
                        required={!isBulkMode}
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Faculty Assignment *</label>
                      <select
                        required
                        value={formData.faculty_id || ''}
                        onChange={(e) => {
                          const fac = faculties.find(f => f.id == e.target.value);
                          setFormData({ ...formData, faculty_id: e.target.value, faculty_name: fac?.name || '' });
                        }}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                      >
                        <option value="">Select Faculty</option>
                        {(() => {
                          const assignedIds = new Set((studentSchedule || []).map(s => String(s.faculty_id)));
                          const assigned = faculties.filter(f => assignedIds.has(String(f.id)));
                          const others = faculties.filter(f => !assignedIds.has(String(f.id)));
                          
                          return (
                            <>
                              {assigned.length > 0 ? (
                                <optgroup label="Assigned to Student">
                                  {assigned.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </optgroup>
                              ) : !formData.student_id ? (
                                faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                              ) : (
                                <option disabled>No faculties assigned to this student</option>
                              )}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Topic / Chapter</label>
                      <input
                        type="text"
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                        placeholder="Enter topic name"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#008080] uppercase tracking-widest ml-1">Attention Level (Session Type)</label>
                      <select
                        value={formData.session_type || 'Regular Class'}
                        onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:ring-4 ring-[#008080]/10 transition-all cursor-pointer text-[#008080]"
                      >
                        {['Regular Class', 'DEEP', 'MEDIUM', 'QUICK'].map(s => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {editingSession && (
                      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#008080] uppercase tracking-widest ml-1">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full p-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:ring-4 ring-slate-200 transition-all cursor-pointer shadow-xl shadow-slate-200"
                          >
                            {['Scheduled', 'Completed', 'Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled', 'No Show'].map(s => (
                              <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Reason for Status Change *</label>
                          <textarea
                            required={['Postponed', 'Cancelled', 'Faculty Cancelled', 'Student Cancelled'].includes(formData.status)}
                            value={formData.status_reason}
                            onChange={(e) => setFormData({ ...formData, status_reason: e.target.value })}
                            rows="2"
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 ring-rose-500/10 transition-all outline-none"
                            placeholder="Reason for change..."
                          ></textarea>
                        </div>
                      </div>
                    )}
                  </div>

                  {isBulkMode && (
                    <div className="pt-6 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={addToBatch}
                        className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-3"
                      >
                        <Plus size={16} /> Add Session to List
                      </button>

                      {bulkSessions.length > 0 && (
                        <div className="mt-8 space-y-3">
                          <div className="flex items-center justify-between px-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sessions to Schedule ({bulkSessions.length})</h4>
                            <button type="button" onClick={() => setBulkSessions([])} className="text-[10px] font-black text-rose-500 uppercase">Clear All</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {bulkSessions.map((session, index) => (
                              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-[#008080] transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#008080] font-black text-[10px] shadow-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-slate-800">{new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                    <p className="text-[9px] font-bold text-slate-500">{session.start_time} - {session.end_time}</p>
                                  </div>
                                </div>
                                <button type="button" onClick={() => removeFromBatch(index)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingSession(null); setRescheduleMode(false); }}
                  className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 ${rescheduleMode ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-[#008080] hover:bg-[#006666] shadow-[#008080]/30'}`}
                >
                  {rescheduleMode ? <RefreshCcw size={16} /> : (editingSession ? <RefreshCcw size={16} /> : <Plus size={16} />)}
                  {rescheduleMode ? 'Apply Reschedule' : (editingSession ? 'Update Session' : isBulkMode ? 'Schedule All Sessions' : 'Create New Session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Manage Registration Schedule</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Configure student's recurring academic timeline</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-6">
              <div className="hidden lg:grid grid-cols-5 gap-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-1">Day of Week</div>
                <div className="col-span-1">Start Time</div>
                <div className="col-span-1">End Time</div>
                <div className="col-span-1">Subject</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {editScheduleData.map((slot, index) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-[#008080] transition-all relative">
                  <select
                    value={slot.day_of_week}
                    onChange={(e) => {
                      const newData = [...editScheduleData];
                      newData[index].day_of_week = e.target.value;
                      setEditScheduleData(newData);
                    }}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <input
                    type="time"
                    value={(() => {
                      if (!slot.start_time) return '';
                      let clean = slot.start_time.replace(/\./g, ':').trim();
                      let isPM = /PM/i.test(clean);
                      let isAM = /AM/i.test(clean);
                      clean = clean.replace(/[a-zA-Z\s]/g, '').trim();
                      let parts = clean.split(':');
                      let hours = parseInt(parts[0] || '0', 10);
                      if (isPM && hours < 12) hours += 12;
                      if (isAM && hours === 12) hours = 0;
                      return `${String(hours).padStart(2, '0')}:${parts[1] ? String(parts[1]).padEnd(2, '0').substring(0, 2) : '00'}`;
                    })()}
                    onChange={(e) => {
                      const newData = [...editScheduleData];
                      newData[index].start_time = e.target.value + ':00';
                      setEditScheduleData(newData);
                    }}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none"
                  />

                  <input
                    type="time"
                    value={(() => {
                      if (!slot.end_time) return '';
                      let clean = slot.end_time.replace(/\./g, ':').trim();
                      let isPM = /PM/i.test(clean);
                      let isAM = /AM/i.test(clean);
                      clean = clean.replace(/[a-zA-Z\s]/g, '').trim();
                      let parts = clean.split(':');
                      let hours = parseInt(parts[0] || '0', 10);
                      if (isPM && hours < 12) hours += 12;
                      if (isAM && hours === 12) hours = 0;
                      return `${String(hours).padStart(2, '0')}:${parts[1] ? String(parts[1]).padEnd(2, '0').substring(0, 2) : '00'}`;
                    })()}
                    onChange={(e) => {
                      const newData = [...editScheduleData];
                      newData[index].end_time = e.target.value + ':00';
                      setEditScheduleData(newData);
                    }}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none"
                  />

                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={slot.subject}
                    onChange={(e) => {
                      const newData = [...editScheduleData];
                      newData[index].subject = e.target.value;
                      setEditScheduleData(newData);
                    }}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none"
                  />

                  <div className="flex justify-end items-center gap-2">
                    <div className="w-[150px] text-left">
                      <Select
                        value={
                          slot.faculty_id
                            ? { value: slot.faculty_id, label: faculties.find(f => String(f.id) === String(slot.faculty_id))?.name || 'Unknown' }
                            : null
                        }
                        onChange={(selectedOption) => {
                          const newData = [...editScheduleData];
                          newData[index].faculty_id = selectedOption ? selectedOption.value : '';
                          setEditScheduleData(newData);
                        }}
                        options={faculties.map(f => ({ value: String(f.id), label: f.name }))}
                        isSearchable
                        placeholder="Faculty..."
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderRadius: '0.75rem',
                            padding: '0.1rem',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            borderColor: '#f1f5f9',
                            boxShadow: 'none',
                            '&:hover': { borderColor: '#008080' }
                          }),
                          menuPortal: base => ({ ...base, zIndex: 99999 })
                        }}
                        menuPortalTarget={document.body}
                      />
                    </div>
                    <button onClick={() => removeScheduleSlot(index)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addScheduleSlot}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#008080] hover:text-[#008080] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Academic Slot
              </button>
            </div>

            <div className="p-4 md:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                className="flex-[2] py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#008080]/30 hover:bg-[#006666] transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Save Registration Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
