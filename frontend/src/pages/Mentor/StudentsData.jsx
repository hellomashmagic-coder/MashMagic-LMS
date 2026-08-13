import React, { useState, useEffect, useDeferredValue } from 'react';
import { Users, Search, ChevronRight, Calendar, Clock, ClipboardList, CheckCircle2, AlertCircle, TrendingUp, History, GraduationCap } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
const StudentsData = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState({
    dailyUpdates: [],
    marks: [],
    attendance: []
  });
  const [loading, setLoading] = useState(true);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [detailTab, setDetailTab] = useState('activity'); // activity, marks, attendance

  useEffect(() => {
    fetchStudents();
  }, []);
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mentor/students');
      if (res.data.success) {
        setStudents((res.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };
  const fetchDailyUpdates = async studentId => {
    try {
      setUpdatesLoading(true);
      const res = await api.get(`/mentor/students/${studentId}/daily-updates`);
      if (res.data.success) {
        setComprehensiveData(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch student data");
    } finally {
      setUpdatesLoading(false);
    }
  };
  const handleStudentSelect = student => {
    setSelectedStudent(student);
    fetchDailyUpdates(student.id);
  };
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || s.email?.toLowerCase().includes(deferredSearchTerm.toLowerCase()));

  // Calculate streaks/stats
  const totalUpdates = comprehensiveData.dailyUpdates?.length || 0;
  const uniqueDays = [...new Set(comprehensiveData.dailyUpdates?.map(u => u.formatted_date) || [])].length;
  return <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 opacity-50" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Users className="text-teal-600" size={32} />
            Student Tracking Gateway
          </h1>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">
            Monitor daily progress and task completion
          </p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={18} />
          <input type="text" placeholder="Search student name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-8 focus:ring-teal-500/5 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Students List Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Assigned Personnel</h3>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">
              {filteredStudents.length} Active
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl border border-slate-100 animate-pulse" />) : filteredStudents.length === 0 ? <div className="bg-white p-6 md:p-12 rounded-[32px] border border-dashed border-slate-200 text-center">
                <AlertCircle className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-sm font-bold text-slate-600 uppercase ">No Students Found</p>
              </div> : filteredStudents.map(student => {
            const isNew = student.created_at && new Date() - new Date(student.created_at) < 24 * 60 * 60 * 1000;
            const isOnboarding = student.onboarding_status === 'pending';
            const alertClass = student.payment_alert_level === 'Critical' ? 'payment-alert-critical' : student.payment_alert_level === 'Warning' ? 'payment-alert-warning' : '';
            return <button key={student.id} onClick={() => handleStudentSelect(student)} className={`w-full p-5 rounded-[28px] border transition-all flex items-center gap-4 group relative overflow-hidden ${alertClass}
                    ${selectedStudent?.id === student.id ? 'bg-yellow-400 border-[#008080] text-slate-900 shadow-xl translate-x-2' : 'bg-white border-slate-100 text-slate-600 hover:border-teal-500/30 hover:bg-teal-50/10'}
                    `} title={student.payment_alert_level && student.payment_alert_level !== 'None' ? `Payment Alert: ${student.consumed_hours} consumed / ${student.paid_hours} paid hours` : ''}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110 duration-500
                    ${selectedStudent?.id === student.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-600'}`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-black tracking-tight break-words">{student.name}</h4>
                        {isNew && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className={`text-[8px] font-bold uppercase tracking-widest opacity-60 break-words`}>
                          {student.course}
                        </p>
                        {isOnboarding && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[7px] font-black uppercase rounded-lg border border-amber-500/20">
                            New Student
                          </span>}
                        {isNew && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase rounded-lg shadow-sm">
                            NEW
                          </span>}
                      </div>
                    </div>
                    <ChevronRight className={`transition-transform duration-500 shrink-0 ${selectedStudent?.id === student.id ? 'translate-x-1' : 'opacity-20 translate-x-0'}`} size={20} />
                  </button>;
          })}
          </div>
        </div>

        {/* Updates Detail View */}
        <div className="lg:col-span-8">
          {selectedStudent ? <div className="space-y-6">
              {/* Stats Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{
              label: 'Class Hours',
              value: `${selectedStudent.consumed_hours || 0} / ${selectedStudent.paid_hours || 0}`,
              icon: <Clock size={20} />,
              color: selectedStudent.payment_alert_level === 'Critical' ? 'bg-rose-500' : selectedStudent.payment_alert_level === 'Warning' ? 'bg-amber-500' : 'bg-slate-800'
            }, {
              label: 'Total Logs',
              value: totalUpdates,
              icon: <History size={20} />,
              color: 'bg-indigo-500'
            }, {
              label: 'Days Active',
              value: uniqueDays,
              icon: <Calendar size={20} />,
              color: 'bg-teal-500'
            }, {
              label: 'Updates Today',
              value: (comprehensiveData.dailyUpdates || []).filter(u => u.formatted_date === new Date().toLocaleDateString('en-GB').split('/').join('-')).length,
              icon: <CheckCircle2 size={20} />,
              color: 'bg-emerald-500'
            }].map((stat, i) => <div key={i} className={`bg-white p-4 sm:p-6 rounded-[32px] border ${stat.label === 'Class Hours' && selectedStudent.payment_alert_level !== 'None' ? 'border-rose-200 shadow-rose-100 animate-pulse' : 'border-slate-100'} shadow-sm flex flex-col gap-4`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
                        {stat.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest break-words whitespace-normal leading-tight">{stat.label}</p>
                        <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter break-words whitespace-normal">{stat.value}</p>
                      </div>
                    </div>
                  </div>)}
              </div>

              {/* Main Content Card */}
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
                    {[{
                  id: 'activity',
                  label: 'Activity Streams',
                  icon: <ClipboardList size={14} />
                }, {
                  id: 'marks',
                  label: 'Exam Marks',
                  icon: <TrendingUp size={14} />
                }, {
                  id: 'attendance',
                  label: 'Attendance',
                  icon: <CheckCircle2 size={14} />
                }].map(tab => <button key={tab.id} onClick={() => setDetailTab(tab.id)} className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${detailTab === tab.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab.icon} {tab.label}
                      </button>)}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                      {selectedStudent.registration_number || 'Not Provided'}
                    </span>
                  </div>
                </div>

                <div className="p-4 md:p-8">
                  {updatesLoading ? <div className="flex flex-col items-center justify-center h-64 space-y-4">
                      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Loading Data...</p>
                    </div> : <>
                      {detailTab === 'activity' && <div className="space-y-6">
                          {(comprehensiveData.dailyUpdates || []).length === 0 ? <div className="flex flex-col items-center justify-center h-80 text-center p-6 md:p-12 bg-slate-50/50 rounded-[32px] border border-slate-100">
                              <TrendingUp className="text-slate-200 mb-6" size={64} />
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase mb-2">No activity recorded</h4>
                              <p className="text-sm font-bold text-slate-600 max-w-xs">No activity found for this student.</p>
                            </div> : <div className="relative space-y-8">
                              <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-100 rounded-full hidden md:block" />
                              {comprehensiveData.dailyUpdates.map((update, idx) => <div key={update.id} className="relative flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-4 duration-500">
                                  <div className="hidden md:flex w-14 h-14 bg-white rounded-2xl border-4 border-slate-50 items-center justify-center text-teal-500 shadow-sm relative z-10">
                                    <Calendar size={20} />
                                  </div>
                                  <div className="flex-1 bg-slate-50/50 hover:bg-white transition-all border border-slate-100 p-4 md:p-8 rounded-[32px] group/item hover:shadow-xl hover:shadow-slate-200/50">
                                    <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
                                      <div className="flex items-center gap-3">
                                        <div className="bg-[#008080] text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ">{update.formatted_date}</div>
                                        <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs bg-white px-4 py-1.5 rounded-xl border border-slate-100">
                                          <Clock size={14} className="text-teal-500" /> {update.formatted_time}
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{update.data_content}</p>
                                  </div>
                                </div>)}
                            </div>}
                        </div>}

                      {detailTab === 'marks' && <div className="space-y-6">
                          {(comprehensiveData.marks || []).length === 0 ? <div className="flex flex-col items-center justify-center h-80 text-center p-6 md:p-12 bg-slate-50/50 rounded-[32px] border border-slate-100">
                              <GraduationCap className="text-slate-200 mb-6" size={64} />
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase mb-2">No Mark Records</h4>
                              <p className="text-sm font-bold text-slate-600 max-w-xs">No exam marks found for this student.</p>
                            </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {comprehensiveData.marks.map(mark => <div key={mark.id} className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 hover:bg-white transition-all">
                                  <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black bg-teal-600 text-white px-3 py-1 rounded-full uppercase">{mark.term || 'Test'}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{mark.exam_date ? new Date(mark.exam_date).toLocaleDateString('en-GB') : ''}</span>
                                  </div>
                                  <h4 className="text-base font-black text-slate-900 mb-4">{mark.subject}</h4>
                                  <div className="flex items-end gap-2">
                                    <span className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{mark.marks}</span>
                                    <span className="text-slate-400 font-bold mb-1">/ {mark.total}</span>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade</span>
                                    <span className="text-lg font-black text-teal-600">{mark.grade || 'N/A'}</span>
                                  </div>
                                </div>)}
                            </div>}
                        </div>}

                      {detailTab === 'attendance' && <div className="space-y-6">
                          {(comprehensiveData.attendance || []).length === 0 ? <div className="flex flex-col items-center justify-center h-80 text-center p-6 md:p-12 bg-slate-50/50 rounded-[32px] border border-slate-100">
                              <CheckCircle2 className="text-slate-200 mb-6" size={64} />
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase mb-2">No Attendance Logs</h4>
                              <p className="text-sm font-bold text-slate-600 max-w-xs">No session presence history recorded.</p>
                            </div> : <div className="overflow-hidden rounded-[32px] border border-slate-100 p-6 bg-slate-50/50">
                              <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="p-4 text-[11px] font-black text-slate-600 uppercase tracking-widest">Date</th>
                                      <th className="p-4 text-[11px] font-black text-slate-600 uppercase tracking-widest">Topic</th>
                                      <th className="p-4 text-[11px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {comprehensiveData.attendance.map((att) => (
                                      <tr key={att.id} className="border-b border-slate-100 hover:bg-white transition-all">
                                        <td className="p-4 text-sm font-bold text-slate-900">{att.date ? new Date(att.date).toLocaleDateString('en-GB') : 'N/A'}</td>
                                        <td className="p-4 text-sm text-slate-600">{att.topic || 'N/A'}</td>
                                        <td className="p-4">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${att.status === 'Present' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {att.status || 'N/A'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>}
                        </div>}
                    </>}
                </div>
              </div>
            </div> : <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-white rounded-[40px] border border-slate-100 text-center p-12">
              <Users className="text-slate-200 mb-6" size={64} />
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">No Student Selected</h3>
              <p className="text-sm font-bold text-slate-600 max-w-xs">Please select a student from the sidebar to view their detailed tracking information and history.</p>
            </div>}
        </div>
      </div>
    </div>;
};
export default StudentsData;