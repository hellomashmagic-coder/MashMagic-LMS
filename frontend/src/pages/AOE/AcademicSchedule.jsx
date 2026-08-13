import React, { useState, useEffect, useDeferredValue } from 'react';
import api from '../../services/api';
import {
  CalendarClock, Clock, BookOpen, Users,
  Search, Filter, ChevronRight, Activity, Radio, Video,
  Calendar, AlertCircle, Bell, CheckSquare, MessageSquareText, Lock, 
  ShieldCheck, Timer, XCircle, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ExportButton from '../../components/common/ExportButton';
import MultiDatePicker from "react-multi-date-picker";
import MobileCard from '../../components/common/MobileCard';
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
  
  return currentMins >= (startMins - 5) && currentMins <= endMins;
};

const AcademicSchedule = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState([{ day_of_week: 'Monday', start_time: '', end_time: '', subject: '', faculty_id: '' }]);
  const [minutesTaken, setMinutesTaken] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);
  const [activeTab, setActiveTab] = useState('today');
  const [filterDate, setFilterDate] = useState([]); // Now an array for multiple dates
  const [joinedSessions, setJoinedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('joinedSessions')) || {}; } catch { return {}; }
  });
  
  const handleJoinSession = (session) => {
    const newJoined = { ...joinedSessions, [session.id]: true };
    setJoinedSessions(newJoined);
    localStorage.setItem('joinedSessions', JSON.stringify(newJoined));
    window.open(session.meeting_link, '_blank');
  };
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [expandedMobileCards, setExpandedMobileCards] = useState({});

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/aoe/academic-schedule');
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
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight ">Academic Schedule</h1>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">Monitoring faculty-led sessions for your students</p>
          </div>
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
            <CheckSquare size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completed</p>
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
                      <X size={16} />
                  </button>
              ) }
            </div>
          </div>

          <div className="col-span-12 md:col-auto flex-1 max-w-md relative w-full order-4 md:order-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search student or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] md:min-h-0 pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 bg-slate-50 border-none rounded-[1rem] md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 ring-[#008080]/5 outline-none transition-all"
            />
          </div>

          <div className="col-span-12 min-[360px]:col-span-4 md:col-auto flex items-center justify-end w-full md:w-auto order-3 md:order-none">
            <div className="w-full md:w-auto [&>button]:w-full [&>button]:min-h-[44px] md:[&>button]:min-h-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
              <ExportButton 
                data={schedule}
                filename="academic_schedule_aoe"
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
                  { header: "Minutes Taken", accessor: "minutes_taken" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="space-y-4">
        {currentData.map((session, idx) => (
          <React.Fragment key={session.id || idx}>
          <div className="hidden md:flex bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden flex-col md:flex-row items-stretch">
            <div className={`w-3 shrink-0 ${session.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'} opacity-40 group-hover:opacity-100 transition-opacity animate-pulse`}></div>
            
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

                {session.status === 'Completed' && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                    <Timer size={12} /> {session.minutes_taken}m
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
                
                <button 
                  onClick={() => { setSelectedSession(session); setIsDetailsModalOpen(true); }}
                  title="Session Details"
                  className="w-11 h-11 bg-slate-50 text-slate-700 border border-slate-200 rounded-[1rem] flex items-center justify-center hover:border-[#008080] hover:text-[#008080] transition-all shadow-sm"
                >
                  <BookOpen size={16} />
                </button>

                {session.status === 'Scheduled' && (
                    <button 
                      onClick={() => { setSelectedSession(session); setMinutesTaken(''); setIsCompleteModalOpen(true); }}
                      title="Class Completed"
                      className="w-11 h-11 bg-[#008080] text-white hover:bg-[#008080] rounded-[1rem] flex items-center justify-center transition-all shadow-sm"
                    >
                      <CheckSquare size={16} />
                    </button>
                  )}
              </div>
              )}
            </div>
          </div>

          <div className="md:hidden block">
            <MobileCard
              isExpanded={!!expandedMobileCards[session.id || idx]}
              onToggle={() => setExpandedMobileCards(prev => ({ ...prev, [session.id || idx]: !prev[session.id || idx] }))}
              avatar={
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-xs ${session.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  #{idx + 1}
                </div>
              }
              title={session.student_name}
              subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.faculty_name}</span>}
              badges={
                session.status === 'Completed' ? 
                [<span key="comp" className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-md">Completed</span>] :
                [<span key="sch" className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest rounded-md animate-pulse">Scheduled</span>]
              }
              metrics={[
                { icon: <Calendar size={12} />, value: session.date ? new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD' },
                { icon: <Clock size={12} />, value: session.start_time ? new Date(`2000-01-01T${session.start_time}`).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD' }
              ]}
              expandedContent={
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Topic</span>
                    <span className="text-xs font-bold text-slate-800">{session.topic || 'General Session'}</span>
                  </div>
                  {session.status === 'Completed' && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Duration</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Timer size={12}/> {session.minutes_taken}m</span>
                    </div>
                  )}
                </div>
              }
              primaryActions={
                [
                  ...(session.meeting_link && session.status === 'Scheduled' && session.date && session.date.split('T')[0] === localTodayStr ? [{
                    icon: <Video size={14} />,
                    label: 'LIVE',
                    onClick: () => handleJoinSession(session),
                    variant: checkIsLive(session) ? 'danger' : 'outline'
                  }] : []),
                  {
                    icon: <BookOpen size={14} />,
                    label: 'Details',
                    onClick: () => { setSelectedSession(session); setIsDetailsModalOpen(true); },
                    variant: 'outline'
                  },
                  ...(session.status === 'Scheduled' ? [{
                    icon: <CheckSquare size={14} />,
                    label: 'Complete',
                    onClick: () => { setSelectedSession(session); setMinutesTaken(''); setIsCompleteModalOpen(true); },
                    variant: 'primary'
                  }] : [])
                ]
              }
            />
          </div>
          </React.Fragment>
        ))}
      </div>

      {currentData.length === 0 && (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <AlertCircle size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No logs in this category</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">There are no academic sessions to display here</p>
        </div>
      )}

      {/* Details Modal (Read-only for Mentors) */}
      {isDetailsModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl px-5 md:px-10 py-6 border-b border-slate-100 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Session Context</h2>
                <p className="text-[10px] font-black text-[#008080] uppercase tracking-[0.2em] mt-1">Audit View for Mentors</p>
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

              {/* Reminder Section (Read-only) */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Bell size={14} className="text-[#008080]" /> Communication Triggers (SSC Managed)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(n => (
                    <div
                      key={n}
                      className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedSession[`reminder_${n}`] ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-slate-300'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedSession[`reminder_${n}`] ? 'bg-emerald-600 text-white' : 'bg-slate-50'}`}>
                        {selectedSession[`reminder_${n}`] ? <CheckSquare size={14} /> : <span className="text-[10px] font-black">{n}</span>}
                      </div>
                      <span className="text-[9px] font-black uppercase">Reminder {n}</span>
                      {selectedSession[`reminder_${n}_remark`] && (
                        <p className="text-[7px] text-center italic mt-1">{selectedSession[`reminder_${n}_remark`]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity size={14} className="text-[#008080]" /> Phase Metrics
                </h4>
                {selectedSession.status === 'Completed' ? (
                  <div className="p-4 md:p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-emerald-900">Session Verified</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-lg">
                          <Timer size={12} /> {selectedSession.minutes_taken} Minutes Logged
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                      <Clock size={32} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900">Session In-Progress</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Waiting for SSC completion verification</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSchedule;
