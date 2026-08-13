import React, { useState, useEffect, useDeferredValue } from 'react';
import axios from 'axios';
import { GraduationCap, CheckCircle2, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const CourseCompletedTracker = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalEnrollment: 0,
    mentorshipCompletedCount: 0,
    mentorshipPendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filter, setFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchStudents();
  }, [page, filter, deferredSearchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filter, deferredSearchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`/api/mentor-head/students?page=${page}&limit=${limit}&mentorship_status=${filter}&search=${encodeURIComponent(deferredSearchTerm)}&stats=true`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setStudents(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalRecords(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      toast.error("Failed to load students list");
    } finally {
      setLoading(false);
    }
  };
  const toggleStatus = async (studentId, currentStatus) => {
    try {
      const token = sessionStorage.getItem('token');
      const newStatus = !currentStatus;
      await axios.put(`/api/mentor-head/students/${studentId}/mentorship-complete`, {
        isCompleted: newStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            mentorship_completed: newStatus ? 1 : 0
          };
        }
        return s;
      }));
      toast.success(newStatus ? 'Marked as Mentorship Completed' : 'Unmarked Mentorship Completed');
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading && students.length === 0) return <div className="p-4 md:p-8 text-center text-slate-600 font-bold">Loading records...</div>;
  return <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  {/* Page Title & Stats */}
  <div className="bg-white p-5 md:p-10 rounded-[4rem] border border-slate-100 shadow-sm mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
  <div>
  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
  <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 rotate-3">
  <GraduationCap size={28} />
  </div>
  Mentorship Completions
  </h2>
  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
  <CheckCircle2 size={14} className="text-emerald-500" />
  Manage and track students who have successfully completed their mentorship
  </p>
  </div>

  <div className="flex gap-4 w-full md:w-auto">
  <div className="flex-1 md:flex-none bg-slate-50 px-4 md:px-6 py-4 rounded-3xl border border-slate-100 text-center">
  <p className="text-2xl md:text-3xl font-black text-slate-900">{stats.totalEnrollment || 0}</p>
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">Total</p>
  </div>
  <div className="flex-1 md:flex-none bg-emerald-50 px-4 md:px-6 py-4 rounded-3xl border border-emerald-100 text-center">
  <p className="text-2xl md:text-3xl font-black text-emerald-600">{stats.mentorshipCompletedCount || 0}</p>
  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Completed</p>
  </div>
  <div className="flex-1 md:flex-none bg-amber-50 px-4 md:px-6 py-4 rounded-3xl border border-amber-100 text-center">
  <p className="text-2xl md:text-3xl font-black text-amber-600">{stats.mentorshipPendingCount || 0}</p>
  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mt-1">In Progress</p>
  </div>
  </div>
  </div>

 {/* Controls */}
 <div className="flex flex-col md:flex-row gap-4 mb-6">
 <div className="relative flex-1">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
  <input type="text" placeholder="Search student or course..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full min-h-[48px] bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#008080] focus:ring-4 focus:ring-[#008080]/10 transition-all placeholder:text-slate-600 placeholder:font-medium" />
  </div>
  <div className="grid grid-cols-2 md:flex gap-3 md:gap-2 pb-2 md:pb-0">
    <button onClick={() => setFilter('all')} className={`col-span-1 md:flex-1 px-2 md:px-6 py-3 min-h-[48px] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center text-center leading-tight break-words ${filter === 'all' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30 -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
      Mark Completions
    </button>
    <button onClick={() => setFilter('completed')} className={`col-span-1 md:flex-1 px-2 md:px-6 py-3 min-h-[48px] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center text-center leading-tight break-words ${filter === 'completed' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30 -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
      Completed
    </button>
    <button onClick={() => setFilter('pending')} className={`col-span-2 md:col-span-1 md:flex-1 px-2 md:px-6 py-3 min-h-[48px] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center text-center leading-tight break-words ${filter === 'pending' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30 -translate-y-0.5' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
      In Progress
    </button>
  </div>
 </div>

 {/* Table */}
 {/* Desktop Table */}
 <div className="hidden md:block bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse min-w-full md:w-[800px]">
 <thead>
 <tr className="border-b border-slate-100 bg-slate-50">
 <th className="p-4 rounded-tl-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">Student</th>
 <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Course & Grade</th>
 <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Assigned To</th>
 <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
 {filter === 'all' && <th className="p-4 rounded-tr-xl text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>}
 </tr>
 </thead>
 <tbody>
 {students.length > 0 ? students.map((student, index) => {
              const isCompleted = student.mentorship_completed === 1;
              return <tr key={student.id} className="border-b border-slate-50 transition-colors group hover:bg-slate-50/50">
 <td className="p-4">
 <p className="text-sm font-bold text-slate-900">{student.name}</p>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">ID: {student.id}</p>
 </td>
 <td className="p-4">
 <p className="text-xs font-bold text-slate-700">{student.course || 'N/A'}</p>
 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest mt-0.5">{student.grade || 'N/A'}</p>
 </td>
 <td className="p-4">
 <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#008080]"></span> {student.mentor_name || 'Unassigned Mentor'}</p>
 <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {student.faculty_name || 'Unassigned Faculty'}</p>
 </td>
 <td className="p-4">
 {isCompleted ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
 <CheckCircle2 size={12} />
 Completed
 </span> : <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
 <RotateCcw size={12} />
 Ongoing
 </span>}
 </td>
 {filter === 'all' && <td className="p-4 text-right">
 <button onClick={() => toggleStatus(student.id, isCompleted)} className={`inline-flex items-center gap-2 px-4 py-2 min-h-[48px] rounded-xl text-[10px] font-black transition-all shadow-sm hover:scale-105 active:scale-95 uppercase tracking-widest ${isCompleted ? 'bg-white border border-rose-200 text-rose-500 hover:bg-rose-50' : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'}`}>
 {isCompleted ? <>
 <RotateCcw size={14} />
 Undo Completion
 </> : <>
 <CheckCircle2 size={14} />
 Mark Completed
 </>}
 </button>
 </td>}
 </tr>;
            }) : <tr>
 <td colSpan="5" className="p-4 md:p-8 text-center text-slate-600 font-bold">
 No students found matching your criteria.
 </td>
 </tr>}
 </tbody>
 </table>
 </div>
 </div>

 {/* Mobile Cards */}
 <div className="md:hidden space-y-4">
  {students.length > 0 ? students.map(student => {
    const isCompleted = student.mentorship_completed === 1;
    return (
      <div key={student.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900">{student.name}</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {student.id}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Course</p>
            <p className="text-xs font-bold text-slate-700">{student.course || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grade</p>
            <p className="text-xs font-black text-[#008080]">{student.grade || 'N/A'}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-3 rounded-2xl space-y-2">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Mentor</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#008080]"></span> {student.mentor_name || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Faculty</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {student.faculty_name || 'Unassigned'}</p>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
            {isCompleted ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <CheckCircle2 size={12} /> Completed
            </span> : <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
              <RotateCcw size={12} /> Ongoing
            </span>}
          </div>
          
          {filter === 'all' && (
            <button 
              onClick={() => toggleStatus(student.id, isCompleted)} 
              className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isCompleted ? 'bg-white border border-rose-200 text-rose-500 hover:bg-rose-50' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'}`}
            >
              {isCompleted ? <>
                <RotateCcw size={14} /> Undo Completion
              </> : <>
                <CheckCircle2 size={14} /> Mark Completed
              </>}
            </button>
          )}
        </div>
      </div>
    );
  }) : (
    <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 text-center shadow-sm">
      <p className="text-sm font-bold text-slate-500">No students found matching your criteria.</p>
    </div>
  )}
 </div>

 {totalPages > 1 && (
  <Pagination 
    currentPage={page} 
    totalPages={totalPages} 
    totalRecords={totalRecords} 
    onPageChange={setPage} 
    entityName="Students"
  />
 )}
 </div>;
};
export default CourseCompletedTracker;