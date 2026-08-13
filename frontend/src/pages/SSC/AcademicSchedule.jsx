import React, {  useState, useEffect , useDeferredValue } from 'react';
import api from '../../services/api';
import {
  CalendarClock, Clock, BookOpen, Users,
  Search, Filter, ChevronRight, Activity, Radio, Video,
  Calendar, AlertCircle, Bell, CheckSquare, MessageSquareText, Lock, 
  ShieldCheck, Timer, XCircle, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ExportButton from '../../components/common/ExportButton';
import MultiDatePicker from "react-multi-date-picker";
const DatePicker = MultiDatePicker.default ? MultiDatePicker.default : MultiDatePicker;

const checkIsLive = (session) => {
  if (!session.start_time || !session.end_time || !session.date) return false;
  if (session.status !== 'Scheduled') return false;
  
  const now = new Date();
  const sessionDate = new Date(session.date);
  
  if (
    now.getFullYear() !== sessionDate.getFullYear() ||
    now.getMonth() !== sessionDate.getMonth() ||
    now.getDate() !== sessionDate.getDate()
  ) {
    return false;
  }
  
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = session.start_time.split(':').map(Number);
  const [endH, endM] = session.end_time.split(':').map(Number);
  
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  
  return currentMins >= startMins && currentMins <= endMins;
};

const AcademicSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);
  const [activeTab, setActiveTab] = useState('today');
  const [filterDate, setFilterDate] = useState([]);
  const [joinedSessions, setJoinedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('joinedSessions')) || {}; } catch { return {}; }
  });
  
  const handleJoinSession = (session) => {
    const newJoined = { ...joinedSessions, [session.id]: true };
    setJoinedSessions(newJoined);
    localStorage.setItem('joinedSessions', JSON.stringify(newJoined));
    window.open(session.meeting_link, '_blank');
  };
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [minutesTaken, setMinutesTaken] = useState('');
  const [completionStatus, setCompletionStatus] = useState('Completed');
  const [cancelNote, setCancelNote] = useState('');

  // Keep tracking input values for reminder remarks in a local state so they are editable
  const [reminderRemarks, setReminderRemarks] = useState({ 1: '', 2: '', 3: '' });

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Removed timer that causes whole component re-render every 10 seconds

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/mentor/academic-schedule');
      setSchedule(res.data.data);
    } catch (error) {
      toast.error("Failed to load academic schedule");
    } finally {
      setLoading(false);
    }
  };

  const localTodayStr = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentData = React.useMemo(() => {
    const todayStr = localTodayStr;

    let filtered = schedule.filter(session => {
      const matchesSearch =
        (session.topic || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        (session.faculty_name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        (session.student_name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase());
      return matchesSearch;
    });

    if (activeTab === 'today') {
      return filtered.filter(s => {
        const sessionDate = s.date.split('T')[0];
        return sessionDate <= todayStr && s.status === 'Scheduled';
      });
    } else if (activeTab === 'calendar') {
      return filtered.filter(s => {
        const sessionDate = s.date.split('T')[0];
        if (filterDate && filterDate.length > 0) {
           return filterDate.includes(sessionDate) && s.status === 'Scheduled';
        }
        return sessionDate > todayStr && s.status === 'Scheduled';
      });
    } else {
      return filtered.filter(s => s.status !== 'Scheduled');
    }
  }, [schedule, deferredSearchTerm, activeTab, filterDate, localTodayStr]);

  const { totalCount, todayCount, completedCount, filteredCount } = React.useMemo(() => ({
    totalCount: schedule.length,
    todayCount: schedule.filter(s => s.date && s.date.split('T')[0] === localTodayStr).length,
    completedCount: schedule.filter(s => s.status !== 'Scheduled').length,
    filteredCount: currentData.length
  }), [schedule, localTodayStr, currentData]);

  const handleReminderSave = async (num, remark) => {
    if (!remark.trim()) return toast("Please type a note to save", { icon: "✍️" });
    try {
      await api.put(`/mentor/academic-schedule/${selectedSession.id}/reminder`, {
        reminder_num: num,
        remark: remark
      });
      toast.success(`Reminder ${num} recorded successfully`);
      
      // Update selectedSession locally
      const updatedSession = { 
        ...selectedSession, 
        [`reminder_${num}`]: 1, 
        [`reminder_${num}_remark`]: remark 
      };
      setSelectedSession(updatedSession);
      
      // Update main schedule state
      setSchedule(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update reminder");
    }
  };

  const saveQuickReminder1 = async (session) => {
    const remark = window.prompt("Enter remark for Reminder 1 (e.g., 'Sent via WhatsApp'):");
    if (remark === null) return; 
    if (!remark.trim()) return toast("Please type a note to save", { icon: "✍️" });
    
    try {
      await api.put(`/mentor/academic-schedule/${session.id}/reminder`, {
        reminder_num: 1,
        remark: remark
      });
      toast.success(`Reminder 1 recorded successfully`);
      
      const updatedSession = { 
        ...session, 
        reminder_1: 1, 
        reminder_1_remark: remark 
      };
      setSchedule(prev => prev.map(s => s.id === session.id ? updatedSession : s));
      if (selectedSession?.id === session.id) {
        setSelectedSession(updatedSession);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update reminder");
    }
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    let finalMinutes = 0;
    if (completionStatus === 'Completed' || completionStatus === 'Others') {
      if (!minutesTaken || isNaN(minutesTaken) || parseInt(minutesTaken) <= 0) {
        return toast.error("Enter valid positive minutes");
      }
      finalMinutes = parseInt(minutesTaken);
    }
    
    if (completionStatus === 'Others' && !cancelNote.trim()) {
      return toast.error("Please provide a note for 'Others' status");
    }

    setIsSubmitting(true);
    try {
      await api.put(`/mentor/academic-schedule/${selectedSession.id}/complete`, {
        minutes_taken: finalMinutes,
        status: completionStatus,
        cancel_note: cancelNote
      });
      toast.success(`Session marked as ${completionStatus}`);
      setIsCompleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setCompletionStatus('Completed');
      setCancelNote('');
      fetchSchedule();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailsModal = (session) => {
    setSelectedSession(session);
    setReminderRemarks({
      1: session.reminder_1_remark || '',
      2: session.reminder_2_remark || '',
      3: session.reminder_3_remark || ''
    });
    setIsDetailsModalOpen(true);
  };


  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-black text-slate-600 uppercase tracking-widest animate-pulse">Syncing Academic Timetable...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-[#008080]">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-[#008080] rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 shrink-0">
            <CalendarClock size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight ">Academic Schedule Coordination</h1>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">Success monitoring of faculty-led sessions</p>
          </div>
        </div>

        <div className="flex gap-4 hidden">
        </div>
      </div>

      
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</p>
            <p className="text-lg font-black text-slate-900 leading-none">{totalCount}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <Timer size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today</p>
            <p className="text-lg font-black text-slate-900 leading-none">{todayCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified / Closed</p>
            <p className="text-lg font-black text-slate-900 leading-none">{completedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtered</p>
            <p className="text-lg font-black text-slate-900 leading-none">{filteredCount}</p>
          </div>
        </div>
      </div>
  
      {/* Tabs and Search Bar */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 md:space-y-6">
        <div className="grid grid-cols-12 gap-3 md:flex md:flex-row md:items-center md:justify-between md:gap-6 w-full">
          
          <div className="contents md:flex md:items-center md:gap-2">
            <div className="col-span-12 md:col-auto flex p-1.5 bg-slate-100 rounded-[1rem] md:rounded-2xl gap-2 items-center w-full md:w-auto order-1 md:order-none">
              <button
                onClick={() => { setActiveTab('today'); setFilterDate([]); }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 min-h-[44px] md:min-h-0 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'today' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === 'today' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                Live/Today
              </button>

              <button
                onClick={() => { setActiveTab('completed'); }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 min-h-[44px] md:min-h-0 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'completed' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === 'completed' ? 'bg-slate-500' : 'bg-slate-300'}`}></div>
                Completed
              </button>
            </div>

            <div className="col-span-12 min-[360px]:col-span-8 md:col-auto flex items-center gap-2 w-full md:w-auto order-2 md:order-none">
              <DatePicker
                  multiple
                  value={filterDate}
                  onChange={(dates) => { 
                      if (dates && dates.length > 0) {
                          const formatted = dates.map(d => d.format("YYYY-MM-DD"));
                          setFilterDate(formatted);
                          setActiveTab('calendar');
                      } else {
                          setFilterDate([]);
                          setActiveTab('today');
                      }
                  }}
                  placeholder="Select Dates"
                  inputClass={`w-full min-h-[44px] md:min-h-0 px-4 md:px-6 py-2.5 md:py-3.5 bg-white border rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 transition-all cursor-pointer shadow-sm ${
                      activeTab === 'calendar' ? 'border-[#008080] text-[#008080] ring-[#008080]/10' : 'border-slate-100 text-slate-600 hover:border-[#008080]'
                  }`}
                  containerClassName="w-full md:w-48 relative z-50 flex-1 md:flex-none"
              />
              { activeTab === 'calendar' && filterDate && filterDate.length > 0 && (
                  <button 
                      onClick={() => { setFilterDate([]); setActiveTab('today'); }}
                      className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shrink-0"
                  >
                      <XCircle size={16} />
                  </button>
              ) }
            </div>
          </div>

          <div className="col-span-12 md:col-auto flex-1 max-w-md relative w-full order-4 md:order-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter by student or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] md:min-h-0 pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 bg-slate-50 border-none rounded-[1rem] md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 ring-[#008080]/5 outline-none transition-all"
            />
          </div>

          <div className="col-span-12 min-[360px]:col-span-4 md:col-auto flex items-center justify-end w-full md:w-auto order-3 md:order-none">
            <div className="w-full md:w-auto [&>button]:w-full [&>button]:min-h-[44px] md:[&>button]:min-h-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
              <ExportButton 
                data={schedule}
                filename="academic_schedule"
                dateField="date"
                columns={[
                  { header: "Student Name", accessor: "student_name" },
                  { header: "Faculty Name", accessor: "faculty_name" },
                  { header: "Subject", accessor: "subject" },
                  { header: "Topic / Chapter", accessor: row => row.topic || row.chapter || 'General Session' },
                  { header: "Date", accessor: row => row.date ? new Date(row.date).toLocaleDateString('en-GB') : 'TBD' },
                  { header: "Start Time", accessor: row => row.start_time ? new Date(`2000-01-01T${row.start_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD' },
                  { header: "End Time", accessor: row => row.end_time ? new Date(`2000-01-01T${row.end_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD' },
                  { header: "Status", accessor: "status" },
                  { header: "Minutes Taken", accessor: "minutes_taken" },
                  { header: "Cancel Note", accessor: "cancel_note" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timetable List View */}
      <div className="space-y-4">
        {currentData.map((session, idx) => (
          <div key={idx} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden flex flex-col md:flex-row items-stretch">
            <div className={`w-2 md:w-3 shrink-0 ${session.status !== 'Scheduled' ? 'bg-emerald-500' : 'bg-amber-500'} opacity-40 group-hover:opacity-100 transition-opacity animate-pulse`}></div>
            
            <div className="flex-grow p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              
              <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto md:min-w-[200px]">
                <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 text-slate-400 font-black text-[10px] md:text-xs">
                  #{idx + 1}
                </div>
                <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-slate-600 group-hover:bg-[#008080] group-hover:text-white transition-all duration-700 -rotate-3 group-hover:rotate-0 shrink-0">
                  <Users size={20} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs md:text-sm font-black text-slate-900 tracking-tight uppercase truncate">{session.student_name}</h3>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1 truncate">
                    Faculty: {session.faculty_name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:gap-6 flex-grow">
                <div className="flex items-center gap-2 md:gap-3 bg-slate-50/50 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-100 transition-colors group-hover:bg-[#008080]/10">
                  <Calendar size={14} className="text-[#008080]" />
                  <span className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">
                    {session.date ? new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3 bg-slate-50/50 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-100 transition-colors group-hover:bg-[#008080]/10">
                  <Clock size={14} className="text-[#008080]" />
                  <span className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">
                    {session.start_time ? new Date(`2000-01-01T${session.start_time}`).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[150px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Topic</span>
                  <p className="text-[10px] md:text-xs font-black text-slate-900 truncate">{session.topic || 'General Session'}</p>
                </div>

                {session.status !== 'Scheduled' && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                    <Timer size={12} /> {session.minutes_taken}m ({session.status})
                  </div>
                )}
              </div>

              {activeTab !== 'calendar' && (
                <div className="flex items-center justify-end md:justify-start gap-2 md:gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 w-full md:w-auto mt-2 md:mt-0">
                  {session.meeting_link && session.status === 'Scheduled' && session.date && session.date.split('T')[0] === localTodayStr && (
                    <button 
                      onClick={() => handleJoinSession(session)}
                      title="Watch Session"
                      className={`px-4 h-11 rounded-[1rem] flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all ${
                        checkIsLive(session)
                        ? `bg-red-500 text-white hover:bg-red-600 hover:scale-[1.05] ${!joinedSessions[session.id] ? 'shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' : 'shadow-sm'}`
                        : 'bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white shadow-sm'
                      }`}
                    >
                      <Video size={14} /> LIVE
                    </button>
                  )}
                  
                  {session.status === 'Scheduled' && !session.reminder_1 && (
                    <button 
                      onClick={() => saveQuickReminder1(session)}
                      title="Send Reminder 1"
                      className="px-4 h-11 rounded-[1rem] flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-600 hover:text-white shadow-sm"
                    >
                      <Bell size={14} /> R1
                    </button>
                  ) || (session.reminder_1 && (
                    <div title="Reminder 1 Sent" className="px-4 h-11 rounded-[1rem] flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm cursor-help" onClick={() => toast(`Reminder 1: ${session.reminder_1_remark}`, { icon: 'ℹ️' })}>
                      <CheckSquare size={14} /> R1
                    </div>
                  ))}

                  <button 
                    onClick={() => openDetailsModal(session)}
                    title="Session Details"
                    className="w-11 h-11 bg-slate-50 text-slate-700 border border-slate-200 rounded-[1rem] flex items-center justify-center hover:border-[#008080] hover:text-[#008080] transition-all shadow-sm"
                  >
                    <BookOpen size={16} />
                  </button>

                  {session.status === 'Scheduled' && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedSession(session);
                      setMinutesTaken(''); 
                      setCompletionStatus('Completed'); 
                      setCancelNote(''); 
                      setIsCompleteModalOpen(true); 
                    }}
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#008080] hover:text-white transition-all group-hover:scale-110 shadow-sm"
                    title="Audit / Close Session"
                  >
                    <CheckSquare size={16} />
                  </button>
                )}

                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentData.length === 0 && (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <AlertCircle size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No sessions detected</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">There are no academic logs matching this tab filter</p>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl px-5 md:px-10 py-6 border-b border-slate-100 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Session Insights</h2>
                <p className="text-[10px] font-black text-[#008080] uppercase tracking-[0.2em] mt-1">{selectedSession.student_name}'s Timeline</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"><XCircle size={24} /></button>
            </div>

            <div className="p-5 md:p-10 space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Faculty Name</p>
                  <p className="text-sm font-black text-slate-800">{selectedSession.faculty_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Session Date</p>
                  <p className="text-sm font-black text-slate-800">{new Date(selectedSession.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[8px] font-black text-[#008080] uppercase tracking-widest mb-2">Subject Expertise</p>
                  <p className="text-base font-black text-slate-900">{selectedSession.topic}</p>
                </div>
              </div>

              {/* Reminder Section (Direct remark inputs) */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Bell size={14} className="text-[#008080]" /> Communication Triggers & Remarks
                </h4>
                <div className="space-y-4">
                  {[2, 3].map(n => {
                    const isSent = selectedSession[`reminder_${n}`];
                    return (
                      <div key={n} className={`p-6 rounded-2xl border transition-all ${isSent ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'} flex flex-col gap-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isSent ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {n}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Reminder {n}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {isSent ? 'Sent' : 'Pending'}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <input 
                              type="text"
                              value={reminderRemarks[n]}
                              onChange={(e) => setReminderRemarks(prev => ({ ...prev, [n]: e.target.value }))}
                              placeholder={`Type remark for Reminder ${n}...`}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 ring-[#008080]/15 outline-none transition-all"
                            />
                          </div>
                          <button
                            onClick={() => handleReminderSave(n, reminderRemarks[n])}
                            className="px-4 py-2.5 bg-[#008080] hover:bg-[#008080] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status / Completion Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity size={14} className="text-[#008080]" /> Phase Execution
                </h4>
                {selectedSession.status !== 'Scheduled' ? (
                  <div className="p-4 md:p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-emerald-900">Session {selectedSession.status}</p>
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-lg self-start">
                          <Timer size={12} /> {selectedSession.minutes_taken} Minutes Recorded
                        </span>
                        {selectedSession.cancel_note && (
                          <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-lg self-start">
                            Note: {selectedSession.cancel_note}
                          </span>
                        )}
                        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-lg self-start">
                          <Lock size={12} /> Duration Locked
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Only Academic Head can edit duration now</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedSession && selectedSession.status === 'Scheduled' && (
                      <div className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                          <Clock size={24} />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Session In Progress</p>
                        <p className="text-[9px] font-bold text-slate-400 max-w-[200px]">Use the audit button on the table to close this session.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {isCompleteModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-[#008080]/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-5 md:p-10 space-y-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><CheckSquare size={24} /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Verify Completion</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final session hour audit</p>
              </div>
            </div>
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-rose-600 shrink-0" size={18} />
              <p className="text-[9px] font-bold text-rose-700 uppercase leading-relaxed tracking-widest">Caution: Once minutes are recorded, they become read-only and locked for further editing.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Completed', 'Faculty Cancelled', 'Student Cancelled', 'Others'].map(status => (
                <button
                  key={status}
                  onClick={() => setCompletionStatus(status)}
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${completionStatus === status ? 'bg-[#008080] text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  {status}
                </button>
              ))}
            </div>
            
            {(completionStatus === 'Completed' || completionStatus === 'Others') && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Total Minutes Taken *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={minutesTaken}
                    onChange={(e) => setMinutesTaken(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full p-5 pl-14 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none"
                  />
                  <Timer className="absolute left-5 top-1/2 -translate-y-1/2 text-[#008080]" size={20} />
                </div>
              </div>
            )}

            {completionStatus === 'Others' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Additional Notes *</label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Please specify the reason..."
                  className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none min-h-[100px]"
                />
              </div>
            )}
              <div className="flex gap-4">
                <button onClick={handleComplete} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all">Submit</button>
                <button onClick={() => setIsCompleteModalOpen(false)} className="px-4 md:px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Back</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSchedule;
