import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Clock, Search, BookOpen, Calendar, User, FileText, AlertTriangle, FileEdit, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DailyUpdatesView = ({ role = 'admin' }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State for Academic Head
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      // We made the API available under /ssc/daily-updates for everyone, 
      // but let's check if they have specific routes. Let's just use /ssc/daily-updates since we added requireRole for all admins there.
      // Wait, we exposed it under admin, aoe, etc. Let's just use the current role prefix if possible or just use /admin/daily-updates.
      // Wait, the easiest is to hit the endpoint for the current role.
      let endpoint = '/ssc/daily-updates';
      if (role === 'aoe' || role === 'academic_operation_executive') endpoint = '/aoe/daily-updates';
      else if (role === 'mentor_head') endpoint = '/mentor-head/daily-updates';
      else if (role === 'academic_head') endpoint = '/academic-head/daily-updates';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setUpdates(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch daily updates');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (report) => {
    setEditingReport({ ...report });
    setShowEditModal(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      // Endpoint available only for Academic Head
      const res = await api.put(`/academic-head/daily-updates/${editingReport.id}`, {
        date: new Date(editingReport.date).toISOString().split('T')[0],
        start_time: editingReport.start_time,
        end_time: editingReport.end_time,
        subject: editingReport.subject,
        topic: editingReport.topic,
        homework_given: editingReport.homework_given,
        remarks: editingReport.remarks
      });
      if (res.data.success) {
        toast.success('Report updated successfully');
        setShowEditModal(false);
        fetchUpdates();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update report');
    }
  };

  const filteredUpdates = updates.filter(update => 
    update.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    update.faculty_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    update.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            Faculty Daily Updates
            <div className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] tracking-widest font-black">
              {updates.length} TOTAL
            </div>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Track daily class reports submitted by faculties</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group w-full md:w-auto md:min-w-full md:w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by student, faculty, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold placeholder:font-medium focus:outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-xs uppercase tracking-widest">Retrieving Updates...</p>
          </div>
        ) : filteredUpdates.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <BookOpen size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900">No Updates Found</h3>
            <p className="text-slate-500 font-bold max-w-xs mx-auto text-sm">No daily class reports have been submitted yet or match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Submitted At</th>
                  <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Faculty Details</th>
                  <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Student Details</th>
                  <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Class Info</th>
                  <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Remarks</th>
                  {role === 'academic_head' && (
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUpdates.map((update) => (
                  <tr key={update.id} className={`transition-colors ${update.is_late ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-4 md:px-8 py-6 align-top">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-black whitespace-nowrap flex items-center gap-2 ${update.is_late ? 'text-rose-600' : 'text-slate-900'}`}>
                          <Calendar size={14} className={update.is_late ? "text-rose-400" : "text-slate-400"} />
                          {new Date(update.submitted_at).toLocaleDateString('en-GB')}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2 ${update.is_late ? 'text-rose-500' : 'text-slate-500'}`}>
                          <Clock size={12} className={update.is_late ? "text-rose-400" : "text-slate-400"} />
                          {new Date(update.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {update.is_late && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-white bg-rose-500 px-2 py-1 rounded-md uppercase tracking-widest w-fit">
                            <AlertTriangle size={10} /> Late Report
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-6 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                          <User size={14} />
                        </div>
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{update.faculty_name}</span>
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-6 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-[#008080] uppercase tracking-tight">{update.student_name}</span>
                        {update.student_grade && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Grade: {update.student_grade}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-6 align-top max-w-[250px]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 whitespace-nowrap">
                            {update.subject || 'N/A'}
                          </span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 whitespace-nowrap flex items-center gap-1">
                            <Clock size={10} /> {update.start_time} - {update.end_time}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 bg-white/50 p-3 rounded-xl border border-slate-100/50 line-clamp-2" title={update.topic}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Topic:</span>
                          {update.topic || 'No topic details'}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <FileText size={14} className={update.homework_given ? "text-emerald-500" : "text-slate-400"} />
                          {update.homework_given ? 'Homework Given' : 'No Homework'}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 md:px-8 py-6 align-top max-w-[250px]">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                        {update.remarks || 'No remarks provided.'}
                      </p>
                    </td>

                    {role === 'academic_head' && (
                      <td className="px-4 md:px-8 py-6 align-top">
                        <button 
                          onClick={() => handleEditClick(update)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <FileEdit size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal for Academic Head */}
      {showEditModal && editingReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Session Report</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitEdit} className="p-4 md:p-8 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Date</label>
                    <input 
                      type="date" 
                      required
                      value={editingReport.date ? new Date(editingReport.date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingReport({...editingReport, date: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Subject</label>
                    <input 
                      type="text" 
                      required
                      value={editingReport.subject}
                      onChange={(e) => setEditingReport({...editingReport, subject: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Start Time</label>
                    <input 
                      type="time" 
                      required
                      value={editingReport.start_time}
                      onChange={(e) => setEditingReport({...editingReport, start_time: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">End Time</label>
                    <input 
                      type="time" 
                      required
                      value={editingReport.end_time}
                      onChange={(e) => setEditingReport({...editingReport, end_time: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500"
                    />
                 </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Topic Taught</label>
                  <input 
                    required
                    type="text" 
                    value={editingReport.topic}
                    onChange={(e) => setEditingReport({...editingReport, topic: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Remarks</label>
                  <textarea 
                    required
                    rows="3"
                    value={editingReport.remarks}
                    onChange={(e) => setEditingReport({...editingReport, remarks: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="edit_homework"
                    checked={editingReport.homework_given}
                    onChange={(e) => setEditingReport({...editingReport, homework_given: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="edit_homework" className="text-sm font-black text-slate-900 uppercase tracking-widest cursor-pointer">
                    Homework Given
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 md:px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyUpdatesView;
