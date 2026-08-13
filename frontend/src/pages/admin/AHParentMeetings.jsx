import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Calendar, Clock, Video, Presentation, CheckCircle2, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const AHParentMeetings = () => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchMeetings();
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'active' ? 'Scheduled' : 'Completed';
      const res = await api.get(`/admin/ah-parent-meetings?status=${statusFilter}&page=${page}&limit=${limit}`);
      setMeetings(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch parent meetings');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
              <Presentation size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Academic Head Parent Meetings</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">View Parent Meetings Scheduled & Reported by Academic Head</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button onClick={() => setActiveTab('active')} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${activeTab === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <ListTodo size={16} /> Active Meetings
          </button>
          <button onClick={() => setActiveTab('completed')} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${activeTab === 'completed' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}>
            <CheckCircle2 size={16} /> Completed Meetings
          </button>
        </div>

        {/* Content */}
        {loading ? <div className="p-6 md:p-12 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100">
            Loading meetings...
          </div> : <>
            {activeTab === 'active' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetings.length === 0 ? <div className="col-span-full bg-white rounded-3xl p-6 md:p-12 border border-slate-100 shadow-sm text-center">
                    <CheckCircle2 size={32} className="mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-black text-slate-700">No Active Meetings</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">There are no upcoming meetings scheduled right now.</p>
                  </div> : meetings.map(m => <div key={m.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-black text-slate-900 text-lg">{m.student_name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                            <Calendar size={12} /> {new Date(m.meeting_date).toLocaleDateString('en-GB')} at {m.meeting_time}
                          </div>
                        </div>
                      </div>
                      
                      {m.notes && <div className="text-sm font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl flex-grow">
                          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Agenda</span>
                          {m.notes}
                        </div>}
                      
                      {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-600 mb-4">
                          <Video size={14} /> Join Meeting
                        </a>}
                      
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">Scheduled By</span>
                        <span className="text-slate-700">{m.academic_head_name}</span>
                      </div>
                    </div>)}
              </div>}

            {activeTab === 'completed' && <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Date & Time</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Student</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Agenda</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Report / Summary</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Handled By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.length > 0 ? meetings.map((m, index) => {
                  let summary = '';
                  try {
                    summary = typeof m.report_data === 'string' ? JSON.parse(m.report_data).summary : m.report_data?.summary || '';
                  } catch (e) {
                    summary = m.report_data;
                  }
                  return <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                          <td className="p-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                            {new Date(m.meeting_date).toLocaleDateString('en-GB')} <span className="text-slate-400 text-xs ml-1">{m.meeting_time}</span>
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-700">
                            {m.student_name}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-500 max-w-xs">
                            {m.notes || '-'}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-700 max-w-md bg-emerald-50/30">
                            {summary}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                            {m.academic_head_name}
                          </td>
                        </tr>;
                }) : <tr>
                          <td colSpan="5" className="p-4 md:p-8 text-center text-slate-400 font-medium">
                            No completed meetings found
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </div>}

            {totalPages > 1 && (
              <Pagination 
                currentPage={page}
                totalPages={totalPages}
                totalRecords={totalRecords}
                onPageChange={setPage}
                entityName="Meetings"
              />
            )}
          </>}
      </div>
    </div>;
};
export default AHParentMeetings;