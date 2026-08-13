import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar as CalendarIcon, Clock, User, BookOpen, Video, FileEdit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ExportButton from '../../components/common/ExportButton';
import MobileCard from '../../components/common/MobileCard';

const FacultySchedule = () => {
  const [schedule, setSchedule] = useState({ today: [], upcoming: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [expandedMobileCards, setExpandedMobileCards] = useState({});
  const [reportData, setReportData] = useState({
    topic: '',
    homework_given: false,
    remarks: ''
  });

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/schedule');
      if (res.data.success) {
        setSchedule(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (session) => {
    setSelectedSession(session);
    setReportData({
      topic: '',
      homework_given: false,
      remarks: ''
    });
    setShowModal(true);
  };

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        timetable_id: selectedSession.id,
        student_id: selectedSession.student_id,
        date: selectedSession.date,
        start_time: selectedSession.start_time,
        end_time: selectedSession.end_time,
        subject: selectedSession.student_subject,
        ...reportData
      };
      
      const res = await api.post('/faculty/schedule/report', payload);
      if (res.data.success) {
        toast.success('Report submitted successfully');
        setShowModal(false);
        fetchSchedule(); // Refresh data
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    }
  };

  const currentList = schedule[activeTab] || [];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            Academic Schedule
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Manage your classes and submit reports</p>
        </div>
        <ExportButton 
          data={[...schedule.today, ...schedule.upcoming, ...schedule.completed]}
          filename="faculty_schedule"
          dateField="date"
          columns={[
            { header: "Student Name", accessor: "student_name" },
            { header: "Subject", accessor: "student_subject" },
            { header: "Date", accessor: row => row.date ? new Date(row.date).toLocaleDateString('en-GB') : 'TBD' },
            { header: "Start Time", accessor: row => row.start_time ? new Date(`2000-01-01T${row.start_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD' },
            { header: "End Time", accessor: row => row.end_time ? new Date(`2000-01-01T${row.end_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD' },
            { header: "Status", accessor: "status" }
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-6 py-4 text-sm font-black uppercase tracking-widest transition-colors ${
            activeTab === 'today' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Today Sessions
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-4 text-sm font-black uppercase tracking-widest transition-colors ${
            activeTab === 'upcoming' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-4 text-sm font-black uppercase tracking-widest transition-colors ${
            activeTab === 'completed' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="font-black text-xs uppercase tracking-widest">Loading...</p>
           </div>
        ) : currentList.length === 0 ? (
          <div className="p-20 text-center space-y-4 bg-white rounded-3xl border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <CalendarIcon size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">No {activeTab} Sessions</h3>
          </div>
        ) : (
          currentList.map(session => (
            <React.Fragment key={session.id}>
            <div className="hidden md:flex bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-xl font-black">{new Date(session.date).getDate()}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    {session.student_name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {session.start_time} - {session.end_time || 'N/A'}</span>
                    <span className="flex items-center gap-1.5"><BookOpen size={14} /> {session.student_subject}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {activeTab === 'today' && session.student_meeting_link && (
                  <a 
                    href={session.student_meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                  >
                    <Video size={16} /> Live
                  </a>
                )}
                
                {(activeTab === 'today' || activeTab === 'completed') && session.status !== 'Completed' && (
                   <button 
                    onClick={() => handleReportClick(session)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <FileEdit size={16} /> Report
                  </button>
                )}

                {session.status === 'Completed' && (
                  <span className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                    Report Submitted
                  </span>
                )}
              </div>
            </div>

            <div className="md:hidden block">
              <MobileCard
                isExpanded={!!expandedMobileCards[session.id]}
                onToggle={() => setExpandedMobileCards(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                avatar={
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-[12px] font-black leading-none">{new Date(session.date).getDate()}</span>
                    <span className="text-[7px] font-bold uppercase tracking-widest">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                }
                title={session.student_name}
                subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.student_subject}</span>}
                badges={
                  session.status === 'Completed' ? 
                  [<span key="comp" className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-md">Report Submitted</span>] :
                  []
                }
                metrics={[
                  { icon: <Clock size={12} />, value: session.start_time ? `${session.start_time} - ${session.end_time || 'N/A'}` : 'TBD' }
                ]}
                expandedContent={
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student Subject</span>
                      <span className="text-xs font-bold text-slate-800">{session.student_subject}</span>
                    </div>
                  </div>
                }
                primaryActions={
                  [
                    ...(activeTab === 'today' && session.student_meeting_link ? [{
                      icon: <Video size={14} />,
                      label: 'Live',
                      onClick: () => window.open(session.student_meeting_link, '_blank'),
                      variant: 'danger'
                    }] : []),
                    ...((activeTab === 'today' || activeTab === 'completed') && session.status !== 'Completed' ? [{
                      icon: <FileEdit size={14} />,
                      label: 'Report',
                      onClick: () => handleReportClick(session),
                      variant: 'primary'
                    }] : [])
                  ]
                }
              />
            </div>
            </React.Fragment>
          ))
        )}
      </div>

      {/* Report Modal */}
      {showModal && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Submit Session Report</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitReport} className="p-4 md:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</span>
                  <p className="text-sm font-black text-slate-900 uppercase">{selectedSession.student_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</span>
                  <p className="text-sm font-black text-slate-900 uppercase">{selectedSession.student_subject}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</span>
                  <p className="text-sm font-black text-slate-900 uppercase">{new Date(selectedSession.date).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
                  <p className="text-sm font-black text-slate-900 uppercase">{selectedSession.start_time} - {selectedSession.end_time}</p>
                </div>
              </div>

              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                 <Clock size={16} /> 
                 Must be submitted within 15 minutes of class completion. Late submissions will be flagged.
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Topic Taught</label>
                  <input 
                    required
                    type="text" 
                    value={reportData.topic}
                    onChange={(e) => setReportData({...reportData, topic: e.target.value})}
                    placeholder="E.g. Algebra Chapter 1"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Remarks</label>
                  <textarea 
                    required
                    rows="3"
                    value={reportData.remarks}
                    onChange={(e) => setReportData({...reportData, remarks: e.target.value})}
                    placeholder="Enter student performance, feedback, etc."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="homework"
                    checked={reportData.homework_given}
                    onChange={(e) => setReportData({...reportData, homework_given: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="homework" className="text-sm font-black text-slate-900 uppercase tracking-widest cursor-pointer">
                    Homework Given
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 md:px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FacultySchedule;
