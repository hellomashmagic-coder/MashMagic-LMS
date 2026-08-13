import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Users, CalendarClock, ListTodo, CheckCircle2, MessageSquare,
  Activity, ChevronRight, Clock, BookOpen, Zap, TrendingUp,
  AlertTriangle, Search, Bell, RefreshCw, Calendar, Sparkles,
  ArrowRight, Star, Target, Award, BarChart3, PlayCircle,
  CheckCircle, XCircle, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Animated Number Counter
   ───────────────────────────────────────────── */
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const end = parseInt(value, 10);
    if (end === 0) return;
    const duration = 900;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

/* ─────────────────────────────────────────────
   Skeleton Loader
   ───────────────────────────────────────────── */
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer rounded-2xl ${className}`} />
);

/* ─────────────────────────────────────────────
   Stat Card
   ───────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, gradient, glow, loading }) => (
  <div className={`relative group overflow-hidden bg-white rounded-[28px] border border-slate-100/80 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] hover:-translate-y-1.5 transition-all duration-500 p-6 md:p-8 cursor-default`}>
    {/* Glow blob */}
    <div className={`absolute -right-6 -top-6 w-28 h-28 ${glow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
    {/* Gradient accent bar */}
    <div className={`absolute top-0 left-0 right-0 h-[3px] ${gradient} rounded-t-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

    <div className="relative z-10 flex flex-col gap-6">
      <div className={`w-12 h-12 md:w-14 md:h-14 ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
        <Icon size={22} strokeWidth={2.5} className="text-white" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-10 w-20 mb-2" />
        ) : (
          <h3 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums tracking-tighter leading-none mb-2">
            <AnimatedNumber value={value} />
          </h3>
        )}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] leading-none">{title}</p>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Session Card
   ───────────────────────────────────────────── */
const SessionCard = ({ session, isLive, isPast }) => (
  <div className={`group relative overflow-hidden rounded-[28px] border flex flex-col h-full transition-all duration-500
    ${isLive
      ? 'bg-gradient-to-br from-[#005f5f] via-[#007777] to-[#00a0a0] border-transparent shadow-2xl shadow-[#008080]/30'
      : isPast
        ? 'bg-slate-50 border-slate-100 hover:bg-white'
        : 'bg-white border-slate-100 hover:border-[#008080]/30 hover:shadow-[0_12px_40px_rgba(0,128,128,0.10)]'
    }`}>

    {/* Live badge */}
    {isLive && (
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-[9px] font-black text-white uppercase tracking-widest">LIVE</span>
      </div>
    )}

    {/* Past opacity veil */}
    {isPast && <div className="absolute inset-0 bg-white/40 z-0 pointer-events-none rounded-[28px]" />}

    <div className="p-6 flex flex-col h-full relative z-10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
          ${isLive ? 'bg-white/15 text-white border border-white/20' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
          <CalendarClock size={11} />
          {session.date ? new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black
          ${isLive ? 'bg-white/15 text-white border border-white/20' : 'bg-[#008080]/8 text-[#008080] border border-[#008080]/15'}`}>
          <Clock size={10} />
          {session.start_time ? session.start_time.substring(0, 5) : 'TBD'}
        </div>
      </div>

      {/* Topic */}
      <h4 className={`text-base font-black tracking-tight leading-tight uppercase mb-3 transition-colors flex-1
        ${isLive ? 'text-white' : isPast ? 'text-slate-500' : 'text-slate-900 group-hover:text-[#008080]'}`}>
        {session.topic || 'General Session'}
      </h4>

      {/* Student */}
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-5
        ${isLive ? 'text-white/70' : 'text-slate-400'}`}>
        Student: <span className={isLive ? 'text-white font-black' : 'text-slate-700 font-black'}>{session.student_name || 'N/A'}</span>
      </p>

      {/* Join button for live */}
      {isLive && session.meeting_link && (
        <a
          href={session.meeting_link.startsWith('http') ? session.meeting_link : `https://${session.meeting_link}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-white text-[#008080] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest mb-4 hover:shadow-xl transition-all active:scale-95 group/btn"
        >
          <PlayCircle size={14} /> Join Session <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-1" />
        </a>
      )}

      {/* Faculty footer */}
      <div className={`flex items-center gap-3 pt-4 border-t ${isLive ? 'border-white/10' : 'border-slate-100'} mt-auto`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0
          ${isLive ? 'bg-white/15 text-white' : 'bg-gradient-to-br from-[#006666] to-[#00a0a0] text-white'}`}>
          {session.faculty_name?.charAt(0)?.toUpperCase() || 'F'}
        </div>
        <div className="min-w-0">
          <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isLive ? 'text-white/50' : 'text-slate-400'}`}>Faculty</p>
          <p className={`text-[11px] font-black uppercase truncate ${isLive ? 'text-white' : 'text-slate-700'}`}>{session.faculty_name || 'N/A'}</p>
        </div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Interaction Badge
   ───────────────────────────────────────────── */
const InteractionTypeBadge = ({ type }) => {
  const t = (type || '').toUpperCase();
  if (t === 'QUICK') return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[8px] font-black uppercase tracking-widest rounded-full">Quick</span>;
  if (t === 'MEDIUM') return <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-black uppercase tracking-widest rounded-full">Medium</span>;
  if (t === 'DEEP') return <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 text-[8px] font-black uppercase tracking-widest rounded-full">Deep</span>;
  return <span className="px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 text-[8px] font-black uppercase tracking-widest rounded-full">{type || 'N/A'}</span>;
};

/* ─────────────────────────────────────────────
   Interaction Card
   ───────────────────────────────────────────── */
const InteractionCard = ({ log, idx }) => (
  <div className="group bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-400 p-6 animate-in fade-in slide-in-from-bottom-3"
    style={{ animationDelay: `${idx * 60}ms` }}>
    <div className="flex items-start justify-between mb-4 gap-2">
      <InteractionTypeBadge type={log.type || log.session_type} />
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
        {log.created_at ? new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
      </span>
    </div>
    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-[#008080] transition-colors truncate">
      {log.student_name}
    </h4>
    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2 italic mb-4">
      "{log.remarks || log.mentor_notes || log.notes || 'No notes provided.'}"
    </p>
    <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
      {log.self_clarity != null && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Clarity</span>
          <span className="text-xs font-black text-emerald-500">{log.self_clarity}%</span>
        </div>
      )}
      {log.confidence != null && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confidence</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= log.confidence ? 'bg-[#008080]' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Empty State
   ───────────────────────────────────────────── */
const EmptyState = ({ icon: Icon, message, sub }) => (
  <div className="col-span-full py-16 flex flex-col items-center justify-center bg-slate-50/60 rounded-[28px] border border-dashed border-slate-200 group transition-all duration-500 hover:border-[#008080]/30">
    <div className="w-20 h-20 rounded-[24px] bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
      <Icon size={32} strokeWidth={1.2} className="text-slate-300 group-hover:text-[#008080] transition-colors duration-500" />
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{message}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
  </div>
);

/* ─────────────────────────────────────────────
   Section Header
   ───────────────────────────────────────────── */
const SectionHeader = ({ color, title, badge }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className={`w-1.5 h-8 ${color} rounded-full`} />
    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
      {title}
      {badge}
    </h3>
    <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
  </div>
);

/* ─────────────────────────────────────────────
   Priority Alert
   ───────────────────────────────────────────── */
const MilestoneAlert = ({ count, navigate }) => (
  <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 border border-rose-100 rounded-[28px] p-6 md:p-8 shadow-sm animate-in slide-in-from-top-4 duration-700 group">
    {/* Decorative circles */}
    <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-200/30 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl" />

    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
      <div className="flex items-start sm:items-center gap-5">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-200 shrink-0 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform">
          <AlertTriangle size={26} strokeWidth={2.5} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">Priority</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase leading-none mb-2">
            Priority Conflict Detected
          </h3>
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider leading-relaxed max-w-lg">
            There are <span className="underline decoration-2 decoration-rose-300">{count} pending assessments</span> awaiting evaluation. Immediate action required.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/mentor/exams')}
        className="shrink-0 w-full lg:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white px-7 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5 transition-all active:scale-95 group/btn"
      >
        Evaluate Assessments
        <ChevronRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Floating Quick Actions
   ───────────────────────────────────────────── */
const QuickActions = ({ onRefresh, refreshing }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      {open && (
        <>
          <button onClick={() => { navigate('/mentor/schedule'); setOpen(false); }}
            className="flex items-center gap-2 bg-white border border-slate-100 shadow-xl px-4 py-3 rounded-2xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all animate-in slide-in-from-bottom-2 duration-200">
            <Calendar size={15} /> Calendar
          </button>
          <button onClick={() => { navigate('/mentor/notifications'); setOpen(false); }}
            className="flex items-center gap-2 bg-white border border-slate-100 shadow-xl px-4 py-3 rounded-2xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all animate-in slide-in-from-bottom-2 duration-300">
            <Bell size={15} /> Alerts
          </button>
          <button onClick={() => { onRefresh(); setOpen(false); }}
            className="flex items-center gap-2 bg-white border border-slate-100 shadow-xl px-4 py-3 rounded-2xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all animate-in slide-in-from-bottom-2 duration-400">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95
          ${open ? 'bg-slate-800 text-white rotate-45' : 'bg-gradient-to-br from-[#008080] to-[#006666] text-white hover:scale-110'}`}
        aria-label="Quick Actions"
      >
        <Zap size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Dashboard
   ───────────────────────────────────────────── */
const MentorDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0, totalSessions: 0, pendingTasks: 0,
    completedTasks: 0, pendingExams: 0,
    totalStudentInteractions: 0, totalFacultyInteractions: 0,
    liveSessions: [], upcomingSessions: [], pastSessions: [], recentInteractions: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, examsRes] = await Promise.all([
        api.get('/mentor/dashboard'),
        api.get('/mentor/exams/pending')
      ]);
      setStats({
        ...dashRes.data.data,
        pendingExams: examsRes.data.data?.length || 0
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (isRefresh) toast.error('Failed to refresh dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = () => fetchStats(true);

  const statCards = [
    { title: 'Assigned Students', value: stats.totalStudents, icon: Users, gradient: 'bg-gradient-to-br from-[#008080] to-[#006666]', glow: 'bg-[#008080]/30' },
    { title: 'Scheduled Sessions', value: stats.totalSessions, icon: CalendarClock, gradient: 'bg-gradient-to-br from-indigo-500 to-violet-600', glow: 'bg-indigo-200' },
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: ListTodo, gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', glow: 'bg-amber-200' },
    { title: 'Completed Tasks', value: stats.completedTasks, icon: CheckCircle2, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', glow: 'bg-emerald-200' },
    { title: 'Student Reach', value: stats.totalStudentInteractions, icon: Target, gradient: 'bg-gradient-to-br from-[#008080] to-cyan-600', glow: 'bg-cyan-200' },
    { title: 'Faculty Interactions', value: stats.totalFacultyInteractions, icon: MessageSquare, gradient: 'bg-gradient-to-br from-pink-500 to-rose-500', glow: 'bg-pink-200' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-10 pb-28">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-white rounded-[28px] md:rounded-[36px] border border-slate-100/80 shadow-[0_4px_30px_rgba(0,0,0,0.05)] p-6 md:p-10">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#008080]/8 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-amber-400/8 to-transparent rounded-full -ml-10 -mb-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              {/* Eyebrow */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-[#008080] to-[#006666] rounded-xl flex items-center justify-center shadow-lg shadow-[#008080]/30">
                  <Sparkles size={14} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-[#008080] uppercase tracking-[0.25em]">Mentor Portal</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live</span>
              </div>

              <h1 className="text-2xl md:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">
                Mentor<br className="hidden sm:block" /> Oversight
              </h1>
              <p className="text-slate-500 text-xs md:text-sm font-semibold max-w-xl leading-relaxed">
                Monitor student progress, academic performance, schedules, and mentor activities from one intelligent dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Date badge */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl shadow-inner">
                <Clock size={14} strokeWidth={2.5} className="text-slate-500" />
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.15em] whitespace-nowrap">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-[#008080] hover:border-[#008080] hover:text-white text-slate-500 transition-all active:scale-95 shadow-sm"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Priority Alert ── */}
        {stats.pendingExams > 0 && (
          <MilestoneAlert count={stats.pendingExams} navigate={navigate} />
        )}

        {/* ── Stats Grid ── */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 size={16} className="text-[#008080]" />
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Performance Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5">
            {statCards.map((card, i) => (
              <StatCard key={i} {...card} loading={loading} />
            ))}
          </div>
        </div>

        {/* ── Academic Sessions Section ── */}
        <div className="bg-white rounded-[28px] md:rounded-[36px] border border-slate-100/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 md:p-10 space-y-12">
          {/* Section title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-50">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">
                Academic Sessions & Activity
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Overview of live classes, recent interactions, and upcoming schedules
              </p>
            </div>
            <button
              onClick={() => navigate('/mentor/schedule')}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#008080]/8 text-[#008080] border border-[#008080]/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all active:scale-95"
            >
              Full Schedule <ArrowRight size={13} />
            </button>
          </div>

          {/* ── Active Sessions ── */}
          <div>
            <SectionHeader
              color="bg-[#008080] shadow-[0_0_12px_rgba(0,128,128,0.5)] animate-pulse"
              title="Active Sessions"
              badge={stats.liveSessions?.length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#008080]/10 text-[#008080] text-[9px] font-black rounded-full border border-[#008080]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-ping" />
                  {stats.liveSessions.length} LIVE
                </span>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-64" />)
              ) : stats.liveSessions?.length > 0 ? (
                stats.liveSessions.map((s, i) => <SessionCard key={`live-${i}`} session={s} isLive />)
              ) : (
                <EmptyState icon={Activity} message="No Active Sessions Found" sub="All sessions are currently offline" />
              )}
            </div>
          </div>

          {/* ── Recent Interactions ── */}
          <div>
            <SectionHeader color="bg-indigo-400" title="Recent Interactions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-44" />)
              ) : stats.recentInteractions?.length > 0 ? (
                stats.recentInteractions.map((log, i) => <InteractionCard key={`log-${i}`} log={log} idx={i} />)
              ) : (
                <EmptyState icon={MessageSquare} message="No Recent Interactions" sub="Interactions will appear here after logging sessions" />
              )}
            </div>
          </div>

          {/* ── Upcoming Sessions ── */}
          <div>
            <SectionHeader color="bg-violet-400" title="Upcoming Sessions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-60" />)
              ) : stats.upcomingSessions?.length > 0 ? (
                stats.upcomingSessions.slice(0, 8).map((s, i) => <SessionCard key={`upcoming-${i}`} session={s} />)
              ) : (
                <EmptyState icon={Calendar} message="No Upcoming Sessions" sub="Future sessions will appear here once scheduled" />
              )}
            </div>
          </div>

          {/* ── Recently Concluded ── */}
          <div>
            <SectionHeader color="bg-slate-300" title="Recently Concluded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-60" />)
              ) : stats.pastSessions?.length > 0 ? (
                stats.pastSessions.slice(0, 4).map((s, i) => <SessionCard key={`past-${i}`} session={s} isPast />)
              ) : (
                <EmptyState icon={CheckCircle} message="No Concluded Sessions" sub="Completed sessions will show here" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quick Actions */}
      <QuickActions onRefresh={handleRefresh} refreshing={refreshing} />
    </div>
  );
};

export default MentorDashboard;
