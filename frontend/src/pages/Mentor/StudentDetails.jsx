import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, User, Phone, BookOpen, Clock, Calendar, CheckSquare, MessageSquare, History, Contact, ClipboardList, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/Mentor/StatusBadge';
import { useAuth } from '../../context/AuthContext';
const StudentDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info, timetable, logs, portal, academic
  const {
    user
  } = useAuth();
  const isSSC = user?.role === 'ssc';
  const backPath = isSSC ? '/ssc/students' : '/mentor/students';
  const backLabel = isSSC ? 'Back to Student Directory' : 'Back to My Students';
  const handleUpdateStatus = async (sessionId, currentSession, newStatus) => {
    try {
      const res = await api.put(`/mentor/timetable/${sessionId}`, {
        ...currentSession,
        status: newStatus
      });
      if (res.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchStudentDetails(); // Refresh data
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };
  useEffect(() => {
    fetchStudentDetails();
  }, [id]);
  const fetchStudentDetails = async () => {
    try {
      const res = await api.get(`/mentor/students/${id}`);
      setStudent(res.data.data);
    } catch (error) {
      toast.error("Failed to load student details");
      navigate('/mentor/students');
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <div className="p-20 text-center text-slate-600 font-bold animate-pulse">Accessing Encrypted Profile...</div>;
  if (!student) return null;
  return <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-slate-600 hover:text-[#008080] font-black text-[10px] uppercase tracking-widest transition-colors mb-6">
 <ArrowLeft size={16} /> {backLabel}
 </button>

 {/* Profile Header */}
 <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-50 flex flex-col md:flex-row gap-10 items-center md:items-start relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-[#008080]/10 rounded-full -mr-32 -mt-32 opacity-30"></div>
 <div className="w-40 h-40 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 relative z-10">
 <User size={80} />
 </div>
 <div className="flex-1 text-center md:text-left relative z-10">
 <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start break-words px-2 text-center md:text-left">
 {student.name}
 {student.onboarding_status === 'pending' && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-100 shadow-sm not-">
 New Student
 </span>}
 {student.is_shifted && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-100 shadow-sm flex items-center gap-2 not-">
 <History size={12} /> Shifted: {student.shifted_from}
 </span>}
 </h1>
 <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
 <span className="px-5 py-2 bg-[#008080] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#008080]/30 ">
 {student.course}
 </span>
 <span className="px-5 py-2 bg-[#008080] text-white rounded-2xl text-xs font-black uppercase tracking-widest">
 {student.grade}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><BookOpen size={12} /> Primary Subject</p>
 <p className="text-base font-bold text-slate-700">{student.subject}</p>
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Clock size={12} /> Allocated Hours</p>
 <p className="text-base font-bold text-slate-700">{student.hour} Hrs/Week</p>
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Phone size={12} /> Contact</p>
 <p className="text-base font-bold text-slate-700">{student.phone_number || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Calendar size={12} /> Next Payment</p>
 <p className="text-base font-bold text-[#008080]">{student.next_installment_date ? new Date(student.next_installment_date).toLocaleDateString('en-GB') : 'Pending'}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className="flex justify-start md:justify-center gap-2 p-1.5 bg-slate-100 rounded-3xl w-full md:w-fit overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
 {[{
        id: 'info',
        label: 'Detailed Info',
        icon: <User size={14} />
      }, {
        id: 'timetable',
        label: 'Session Timetable',
        icon: <Clock size={14} />
      }, {
        id: 'logs',
        label: 'Student Interactions',
        icon: <History size={14} />
      }, {
        id: 'portal',
        label: 'Portal Activity',
        icon: <ClipboardList size={14} />
      }, {
        id: 'academic',
        label: 'Academic Performance',
        icon: <TrendingUp size={14} />
      }].filter(tab => !(isSSC && tab.id === 'logs')).map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
 flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shrink-0
 ${activeTab === tab.id ? 'bg-white text-[#008080] shadow-lg' : 'text-slate-500 hover:text-slate-800'}
 `}>
 {tab.icon} {tab.label}
 </button>)}
 </div>

 {/* Content Area */}
 <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-50 min-h-[400px]">
 {activeTab === 'info' && <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <section className="space-y-6">
 <h3 className="text-lg font-black text-slate-900 border-b-2 border-[#008080] pb-2 flex items-center gap-3">
 <CheckSquare size={20} className="text-[#008080]" /> Academic Context
 </h3>
 <div className="space-y-4">
 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#008080] transition-colors">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Enrolled Course</p>
 <p className="text-sm font-bold text-slate-700">{student.course}</p>
 </div>
 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#008080] transition-colors">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Assigned Faculty Name</p>
 <p className="text-sm font-bold text-slate-700">{student.faculty_name || 'Not Specified'}</p>
 </div>
 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#008080] transition-colors">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Mentor Name (Ref)</p>
 <p className="text-sm font-bold text-slate-700">{student.mentor_name || 'You'}</p>
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <h3 className="text-lg font-black text-slate-900 border-b-2 border-[#008080] pb-2 flex items-center gap-3">
 <MessageSquare size={20} className="text-[#008080]" /> Enrollment Notes
 </h3>
 <div className="p-4 md:p-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-500 text-sm font-semibold leading-relaxed">
 This section contains internal enrollment notes and status updates for the student's academic path. Standard operation procedures apply.
 </div>
 </section>
 </div>}

 {activeTab === 'timetable' && <div className="space-y-6">
 <h3 className="text-lg font-black text-slate-900 border-b-2 border-[#008080] pb-2">Academic Roadmap (Sessions)</h3>
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-50">
 <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">#Sess</th>
 <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date</th>
 <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Timing</th>
 <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Chapters / Topics</th>
 <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status / Action</th>
 </tr>
 </thead>
 <tbody>
 {student.timetable.map((session, index) => <tr key={session.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="py-6 px-4 font-black text-slate-600 text-sm">#{session.session_number}</td>
 <td className="py-6 px-4 font-bold text-slate-700 text-sm">
 {new Date(session.date).toLocaleDateString('en-GB')}
 {session.status === 'Postponed' && session.new_date && <p className="text-[10px] text-amber-600 mt-1">New: {new Date(session.new_date).toLocaleDateString('en-GB')}</p>}
 </td>
 <td className="py-6 px-4 font-bold text-slate-700 text-sm">{session.start_time} - {session.end_time}</td>
 <td className="py-6 px-4 font-bold text-slate-700 text-sm ">{session.chapter_topic || 'Pending Assignment'}</td>
 <td className="py-6 px-4">
 <div className="flex items-center gap-3">
 <StatusBadge status={session.status} />
 {['super_admin', 'admin', 'ssc'].includes(user?.role) && <select className="text-[10px] font-black uppercase tracking-widest bg-slate-100 border-none rounded-lg p-1 outline-none cursor-pointer hover:bg-slate-200 transition-colors" value={session.status} onChange={e => handleUpdateStatus(session.id, session, e.target.value)}>
 <option value="Scheduled">Schedule</option>
 <option value="Completed">Complete</option>
 <option value="Postponed">Postpone</option>
 <option value="Absent">Absent</option>
 <option value="Cancelled">Cancel</option>
 </select>}
 </div>
 </td>
 </tr>)}
 {student.timetable.length === 0 && <tr>
 <td colSpan="5" className="py-20 text-center text-slate-600 font-bold">No sessions scheduled yet.</td>
 </tr>}
 </tbody>
 </table>
 </div>

 <div className="md:hidden flex flex-col gap-4 py-4">
    {student.timetable.map((session, index) => (
      <div key={session.id} className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 flex flex-col gap-3 relative">
         <div className="flex justify-between items-start gap-4">
           <span className="text-[10px] font-black bg-[#008080] text-white px-3 py-1 rounded-full uppercase tracking-widest shrink-0">#{session.session_number}</span>
           <div className="shrink-0"><StatusBadge status={session.status} /></div>
         </div>
         <div>
           <p className="text-sm font-black text-slate-700 break-words">{session.chapter_topic || 'Pending Assignment'}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{new Date(session.date).toLocaleDateString('en-GB')}</span>
            <span>{session.start_time} - {session.end_time}</span>
          </div>
          {session.status === 'Postponed' && session.new_date && <p className="text-[10px] text-amber-600 mt-1 uppercase font-bold tracking-widest">New Date: {new Date(session.new_date).toLocaleDateString('en-GB')}</p>}
        </div>
        {['super_admin', 'admin', 'ssc'].includes(user?.role) && (
          <div className="mt-2 pt-3 border-t border-slate-200">
            <select className="w-full text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 rounded-lg p-2 outline-none cursor-pointer focus:border-[#008080]" value={session.status} onChange={e => handleUpdateStatus(session.id, session, e.target.value)}>
              <option value="Scheduled">Schedule</option>
              <option value="Completed">Complete</option>
              <option value="Postponed">Postpone</option>
              <option value="Absent">Absent</option>
              <option value="Cancelled">Cancel</option>
            </select>
          </div>
        )}
      </div>
    ))}
    {student.timetable.length === 0 && (
      <div className="text-center py-5 md:py-10 text-slate-400 font-bold text-[10px] uppercase tracking-widest">No sessions scheduled yet.</div>
    )}
 </div>
 </div>}

 {activeTab === 'logs' && !isSSC && <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
 <section className="space-y-6">
 <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
 <History size={20} className="text-[#008080]" /> Session History Logs
 </h3>
 <div className="space-y-4">
 {student.studentLogs.map(log => <div key={log.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-20 h-20 bg-[#008080] rounded-full -mr-10 -mt-10 opacity-20 group-hover:scale-150 transition-transform"></div>
 <div className="flex justify-between items-start mb-4 relative z-10">
 <span className="text-[10px] font-black bg-[#008080] text-white px-3 py-1 rounded-full uppercase">Session #{log.session_number}</span>
 <span className="text-[10px] font-black text-slate-600 uppercase">{new Date(log.created_at || log.date).toLocaleDateString('en-GB')}</span>
 </div>

 <div className="mb-4 space-y-2 relative z-10">
 <div>
 <p className="text-[8px] font-black text-slate-600 uppercase">Mentor Notes</p>
 <p className="text-xs text-slate-600 font-medium line-clamp-2">{log.mentor_notes || 'No notes provided.'}</p>
 </div>
 <div>
 <p className="text-[8px] font-black text-slate-600 uppercase">Weak Area</p>
 <p className="text-xs text-slate-600 line-clamp-2">{log.weak_area_identified || 'N/A'}</p>
 </div>
 </div>

 <div className="flex flex-wrap gap-4 relative z-10 pt-2 border-t border-slate-100">
 <div className="flex flex-col">
 <span className="text-[8px] font-black text-slate-600 uppercase">Confidence</span>
 <span className="text-[10px] font-bold text-[#008080]">{log.concept_confidence}/5</span>
 </div>
 <div className="flex flex-col">
 <span className="text-[8px] font-black text-slate-600 uppercase">HW Status</span>
 <span className={`text-[10px] font-bold ${log.homework_status === 'Done' ? 'text-emerald-600' : 'text-amber-600'}`}>{log.homework_status}</span>
 </div>
 <div className="flex flex-col">
 <span className="text-[8px] font-black text-slate-600 uppercase">Parent Priority</span>
 <span className={`text-[10px] font-bold ${log.parent_update_priority === 'High' ? 'text-rose-600' : 'text-slate-600'}`}>{log.parent_update_priority}</span>
 </div>
 </div>

 {log.screenshot_url && <a href={log.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-4 text-[10px] font-black text-[#008080] hover:underline uppercase tracking-wide">View Screenshot Evidence</a>}
 </div>)}
 {student.studentLogs.length === 0 && <p className="text-slate-600 text-center text-sm font-bold py-5 md:py-10">No student interaction logs found.</p>}
 </div>
 </section>

 <section className="space-y-6">
 <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
 <Contact size={20} className="text-purple-600" /> Faculty Log Archive
 </h3>
 <div className="space-y-4">
 {student.facultyLogs.map(log => <div key={log.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
 <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
 <div className="flex justify-between items-start mb-3 relative z-10">
 <span className="text-sm font-bold text-slate-700">{log.chapter}</span>
 <span className="text-[10px] font-black text-slate-600 uppercase">{new Date(log.date).toLocaleDateString('en-GB')}</span>
 </div>
 <div className="mb-3 space-y-2 relative z-10">
 <div>
 <p className="text-[8px] font-black text-slate-600 uppercase">Topic Coverage</p>
 <p className="text-xs text-slate-500 line-clamp-2">{log.topics_covered}</p>
 </div>
 <div>
 <p className="text-[8px] font-black text-slate-600 uppercase">Performance</p>
 <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${log.student_performance === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
 {log.student_performance}
 </span>
 </div>
 </div>

 {log.screenshot_url && <a href={log.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-[10px] font-black text-purple-500 hover:underline uppercase tracking-wide">View Evidence</a>}
 </div>)}
 {student.facultyLogs.length === 0 && <p className="text-slate-600 text-center text-sm font-bold py-5 md:py-10">No faculty interaction logs found.</p>}
 </div>
 </section>
 </div>}

 {activeTab === 'portal' && <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-900 border-b-2 border-teal-500 pb-2 flex items-center gap-3">
          <ClipboardList size={20} className="text-teal-500" /> Student Portal Streams
        </h3>
        <span className="px-4 py-1.5 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100">
          {student.dailyUpdates?.length || 0} Entries Recorded
        </span>
      </div>

      <div className="relative space-y-6">
        {student.dailyUpdates?.length > 0 && <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-100 rounded-full hidden md:block" />}
        
        {student.dailyUpdates?.map((update, idx) => <div key={update.id} className="relative flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-4 duration-500" style={{
            animationDelay: `${idx * 100}ms`
          }}>
            <div className="hidden md:flex w-14 h-14 bg-white rounded-2xl border-4 border-slate-50 items-center justify-center text-teal-500 shadow-sm relative z-10">
              <Calendar size={20} />
            </div>
            <div className="flex-1 bg-slate-50/50 hover:bg-white transition-all border border-slate-100 p-4 md:p-8 rounded-[32px] group hover:shadow-xl hover:shadow-slate-200/50">
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
                <div className="flex items-center gap-3">
                  <div className="bg-[#008080] text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ">
                    {update.formatted_date}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs bg-white px-4 py-1.5 rounded-xl border border-slate-100">
                    <Clock size={14} className="text-teal-500" />
                    {update.formatted_time}
                  </div>
                </div>
              </div>
              <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{update.data_content}</p>
            </div>
          </div>)}
        {(!student.dailyUpdates || student.dailyUpdates.length === 0) && <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No activity logs transmitted from student portal yet.</p>
          </div>}
      </div>
    </div>}

  {activeTab === 'academic' && <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Marks Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-black text-slate-900 border-b-2 border-indigo-500 pb-2 flex items-center gap-3">
          <TrendingUp size={20} className="text-indigo-500" /> Exam & Assessment Scores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {student.marks?.map(mark => <div key={mark.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-125 transition-transform" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase">{mark.term || 'Test'}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{mark.exam_date ? new Date(mark.exam_date).toLocaleDateString('en-GB') : ''}</span>
                </div>
                <h4 className="text-base font-black text-slate-900 mb-1">{mark.subject}</h4>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{mark.marks}</span>
                  <span className="text-slate-400 font-bold mb-1">/ {mark.total}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade Achieved</span>
                  <span className="text-lg font-black text-indigo-600">{mark.grade || 'N/A'}</span>
                </div>
              </div>
            </div>)}
          {(!student.marks || student.marks.length === 0) && <div className="col-span-full text-center py-5 md:py-10 bg-slate-50 rounded-[2rem] text-slate-400 text-[10px] font-black uppercase tracking-widest">No exam records available.</div>}
        </div>
      </section>

      {/* Attendance Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-black text-slate-900 border-b-2 border-emerald-500 pb-2 flex items-center gap-3">
          <CheckSquare size={20} className="text-emerald-500" /> Attendance History
        </h3>
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="hidden md:block w-full overflow-x-auto">
<table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Topic / Session</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {student.attendance?.map(att => <tr key={att.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6 text-sm font-bold text-slate-600">{new Date(att.date).toLocaleDateString('en-GB')}</td>
                  <td className="py-5 px-6 text-sm font-bold text-slate-900">{att.topic}</td>
                  <td className="py-5 px-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${att.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {att.status}
                    </span>
                  </td>
                </tr>)}
              {(!student.attendance || student.attendance.length === 0) && <tr>
                  <td colSpan="3" className="py-5 md:py-10 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">No attendance records found.</td>
                </tr>}
            </tbody>
           </table>
</div>

          <div className="md:hidden flex flex-col gap-3 p-4">
            {student.attendance?.map(att => (
              <div key={att.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(att.date).toLocaleDateString('en-GB')}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shrink-0 ${att.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {att.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 break-words">{att.topic}</p>
              </div>
            ))}
            {(!student.attendance || student.attendance.length === 0) && (
              <div className="text-center py-5 md:py-10 text-slate-400 text-[10px] font-black uppercase tracking-widest">No attendance records found.</div>
            )}
          </div>
        </div>
      </section>
    </div>}
 </div>
 </div>;
};
export default StudentDetails;