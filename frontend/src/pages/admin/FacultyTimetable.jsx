import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const FacultyTimetable = () => {
  const [timetable, setTimetable] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [formData, setFormData] = useState({
    faculty_id: '',
    subject: '',
    day_of_week: 'Monday',
    start_time: '10:00',
    end_time: '11:00'
  });
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
  
  useEffect(() => {
    fetchFaculties();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [filterFaculty, filterSubject, filterDay, page]);

  useEffect(() => {
    setPage(1);
  }, [filterFaculty, filterSubject, filterDay]);
  const fetchFaculties = async () => {
    try {
      const res = await api.get('/admin/faculties');
      setFaculties(res.data.data || []);
    } catch (e) {
      toast.error("Failed to load faculties");
    }
  };
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const params = {
        faculty_id: filterFaculty,
        subject: filterSubject,
        day_of_week: filterDay,
        page,
        limit
      };
      const res = await api.get('/admin/faculty-timetable', {
        params
      });
      setTimetable(res.data.data || []);
      setTotalRecords(res.data.total || 0);
    } catch (e) {
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };
  const handleAddSlot = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/faculty-timetable', formData);
      if (res.data.success) {
        toast.success('Slot added successfully');
        setIsAddModalOpen(false);
        fetchTimetable();
        setFormData({
          faculty_id: '',
          subject: '',
          day_of_week: 'Monday',
          start_time: '10:00',
          end_time: '11:00'
        });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add slot');
    }
  };
  const handleDeleteSlot = async id => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    try {
      const res = await api.delete(`/admin/faculty-timetable/${id}`);
      if (res.data.success) {
        toast.success('Slot deleted');
        fetchTimetable();
      }
    } catch (e) {
      toast.error('Failed to delete slot');
    }
  };
  return <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Faculty Timetable</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage master availability slots for faculties</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#008080] text-white rounded-xl font-bold hover:bg-[#006666] transition-all shadow-md active:scale-95">
                    <Plus size={18} /> Add New Slot
                </button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty</label>
                    <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#008080]/20 outline-none">
                        <option value="">All Faculties</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#008080]/20 outline-none">
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Day of Week</label>
                    <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#008080]/20 outline-none">
                        <option value="">All Days</option>
                        {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button onClick={() => {
          setFilterFaculty('');
          setFilterSubject('');
          setFilterDay('');
        }} className="w-full p-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Faculty</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Subject</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Day</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Time Slot</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? <tr><td colSpan="5" className="p-4 md:p-8 text-center"><div className="w-8 h-8 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr> : timetable.length > 0 ? timetable.map((slot, index) => <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{slot.faculty_name}</td>
                                        <td className="px-6 py-4 font-semibold text-[#008080] bg-[#008080]/5">{slot.subject}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-600">{slot.day_of_week}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg w-fit">
                                                <Clock size={14} className="text-[#008080]" />
                                                {slot.start_time} - {slot.end_time}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>) : <tr>
                                    <td colSpan="5" className="p-6 md:p-12 text-center text-slate-400">
                                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="font-semibold text-sm">No timetable slots found.</p>
                                    </td>
                                </tr>}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-100">
                  <Pagination 
                    currentPage={page} 
                    totalPages={Math.ceil(totalRecords / limit) || 1} 
                    totalRecords={totalRecords} 
                    onPageChange={setPage} 
                  />
                </div>
            </div>

            {isAddModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 bg-[#008080] text-white">
                            <h2 className="text-xl font-black uppercase tracking-tight">Add Timetable Slot</h2>
                        </div>
                        <form onSubmit={handleAddSlot} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty</label>
                                <select required value={formData.faculty_id} onChange={e => setFormData({
              ...formData,
              faculty_id: e.target.value
            })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#008080]">
                                    <option value="">Select Faculty</option>
                                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                                <select required value={formData.subject} onChange={e => setFormData({
              ...formData,
              subject: e.target.value
            })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#008080]">
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Day of Week</label>
                                <select required value={formData.day_of_week} onChange={e => setFormData({
              ...formData,
              day_of_week: e.target.value
            })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#008080]">
                                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Time</label>
                                    <input type="time" required value={formData.start_time} onChange={e => setFormData({
                ...formData,
                start_time: e.target.value
              })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#008080]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Time</label>
                                    <input type="time" required value={formData.end_time} onChange={e => setFormData({
                ...formData,
                end_time: e.target.value
              })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#008080]" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 text-white font-bold bg-[#008080] rounded-xl hover:bg-[#006666] transition-colors shadow-md">Save Slot</button>
                            </div>
                        </form>
                    </div>
                </div>}
        </div>;
};
export default FacultyTimetable;