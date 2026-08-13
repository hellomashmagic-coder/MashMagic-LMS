import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, UserMinus, Search, AlertTriangle, X, Loader2, UserX } from 'lucide-react';
import StudentListFilterDropdown from '../../components/StudentListFilterDropdown';
import Pagination from '../../components/common/Pagination';

const RemoveMentors = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalEnrollment: 0,
    removedCount: 0,
    courseCompletedCount: 0,
    activeCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'active', 'completed', 'removed'
  const [actionLoading, setActionLoading] = useState(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [studentToRemove, setStudentToRemove] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [page, filterMode, sortBy, searchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [filterMode, sortBy, searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/mentor-head/students?page=${page}&limit=${limit}&filterMode=${filterMode}&sortBy=${sortBy}&search=${encodeURIComponent(searchTerm)}&stats=true`);
      setStudents(res.data.data || []);
      setTotalRecords(res.data.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveMentor = (student) => {
    setStudentToRemove(student);
  };

  const handleRemoveMentor = async () => {
    if (!studentToRemove) return;
    
    setActionLoading(studentToRemove.id);
    try {
      await api.put(`/mentor-head/students/${studentToRemove.id}/remove-mentor`);
      toast.success("Mentor removed successfully");
      
      // Optimistic update
      setStudents(prev => prev.map(s => {
        if (s.id === studentToRemove.id) {
          return {
            ...s,
            previous_mentor_name: s.mentor_name,
            mentor_id: null,
            mentor_name: null
          };
        }
        return s;
      }));
      setStudentToRemove(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove mentor");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStudents = students;

  const { removedCount, courseCompletedCount, activeCount, totalEnrollment } = stats;

  return (
    <div className="space-y-6 md:space-y-12 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white p-6 md:p-14 rounded-[1.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-10 hover:shadow-md transition-shadow duration-300">
        <div className="text-left">
          <h2 className="text-2xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2 md:mb-4">Mentor Removal</h2>
          <p className="text-slate-500 md:text-slate-600 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3 mt-1 md:mt-3">
            <span className="w-2 h-2 rounded-full bg-[#008080] animate-pulse shrink-0"></span>
            Manage Mentor Assignments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div 
          onClick={() => setFilterMode('all')}
          className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${filterMode === 'all' ? 'bg-[#008080] text-white shadow-md shadow-[#008080]/20 border-[#008080]' : 'bg-white border-slate-100 hover:border-[#008080]/30 hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${filterMode === 'all' ? 'bg-white/20' : 'bg-slate-50 text-[#008080]'}`}>
              <Users size={16} className="md:w-6 md:h-6" />
            </div>
            <p className={`text-[9px] md:text-sm font-black uppercase tracking-widest truncate ${filterMode === 'all' ? 'text-white/80' : 'text-slate-500'}`}>Total</p>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">{totalEnrollment}</p>
        </div>

        <div 
          onClick={() => setFilterMode('active')}
          className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${filterMode === 'active' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${filterMode === 'active' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-500'}`}>
              <Users size={16} className="md:w-6 md:h-6" />
            </div>
            <p className={`text-[9px] md:text-sm font-black uppercase tracking-widest truncate ${filterMode === 'active' ? 'text-white/80' : 'text-slate-500'}`}>Active</p>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">{activeCount}</p>
        </div>

        <div 
          onClick={() => setFilterMode('completed')}
          className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${filterMode === 'completed' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${filterMode === 'completed' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-500'}`}>
              <UserMinus size={16} className="md:w-6 md:h-6" />
            </div>
            <p className={`text-[9px] md:text-sm font-black uppercase tracking-widest truncate ${filterMode === 'completed' ? 'text-white/80' : 'text-slate-500'}`}>Completed</p>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">{courseCompletedCount}</p>
        </div>

        <div 
          onClick={() => setFilterMode('removed')}
          className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${filterMode === 'removed' ? 'bg-rose-500 text-white shadow-md shadow-rose-200 border-rose-500' : 'bg-white border-slate-100 hover:border-rose-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${filterMode === 'removed' ? 'bg-white/20' : 'bg-rose-50 text-rose-500'}`}>
              <UserMinus size={16} className="md:w-6 md:h-6" />
            </div>
            <p className={`text-[9px] md:text-sm font-black uppercase tracking-widest truncate ${filterMode === 'removed' ? 'text-white/80' : 'text-slate-500'}`}>Removed</p>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">{removedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or mentor..."
            className="w-full min-h-[48px] py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 md:border-slate-100 rounded-xl md:rounded-2xl text-[13px] md:text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/20 transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="w-full md:w-auto">
            <StudentListFilterDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-6 md:p-8 space-y-4">
            {/* Desktop Skeletons */}
            <div className="hidden md:block">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl mb-3 animate-pulse"></div>
              ))}
            </div>
            {/* Mobile Skeletons */}
            <div className="md:hidden space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-slate-50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Mentor</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Removed Mentor</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                        <td className="px-4 md:px-8 py-6 text-slate-400 font-black">{idx + 1}</td>
                        <td className="px-4 md:px-8 py-6">
                          <p className="font-black text-slate-900 leading-none truncate max-w-[200px]">{student.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: MM-{student.id.toString().padStart(4, '0')}</p>
                        </td>
                        <td className="px-4 md:px-8 py-6">
                          {student.mentor_id ? (
                            <span className="bg-[#008080]/10 text-[#008080] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest inline-block truncate max-w-[150px]">
                              {student.mentor_name}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">No Mentor</span>
                          )}
                        </td>
                        <td className="px-4 md:px-8 py-6">
                          {student.previous_mentor_name ? (
                            <span className="bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest inline-block truncate max-w-[150px]">
                              {student.previous_mentor_name}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">None</span>
                          )}
                        </td>
                        <td className="px-4 md:px-8 py-6 text-right">
                          {student.mentor_id && (
                            <button
                              onClick={() => confirmRemoveMentor(student)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all duration-200 shadow-md shadow-rose-200 active:scale-95 disabled:opacity-50"
                            >
                              Remove Mentor
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 md:px-8 py-20 text-center">
                        <UserX size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No mentor assignments found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden flex flex-col p-4 space-y-4 bg-slate-50/50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div key={student.id} className="bg-white p-4 rounded-[1.25rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h4 className="font-black text-[14px] text-slate-900 truncate">{student.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: MM-{student.id.toString().padStart(4, '0')}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Mentor</span>
                        {student.mentor_id ? (
                          <span className="bg-[#008080]/10 text-[#008080] px-2 py-1 rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest truncate block">
                            {student.mentor_name}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest block truncate">No Mentor</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 border-l border-slate-100 pl-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Removed Mentor</span>
                        {student.previous_mentor_name ? (
                          <span className="bg-rose-50 text-rose-500 px-2 py-1 rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest truncate block">
                            {student.previous_mentor_name}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest block truncate">None</span>
                        )}
                      </div>
                    </div>

                    {student.mentor_id && (
                      <div className="mt-1 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => confirmRemoveMentor(student)}
                          className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-rose-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:bg-rose-600 transition-colors duration-200 shadow-md shadow-rose-200/50 active:scale-[0.98]"
                        >
                          Remove Mentor
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 md:py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <UserX size={24} className="text-slate-300" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm mb-1">No assignments found</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white">
               <Pagination 
                 currentPage={page} 
                 totalPages={Math.ceil(totalRecords / limit) || 1} 
                 totalRecords={totalRecords} 
                 onPageChange={setPage} 
               />
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-250 flex flex-col">
            
            <div className="flex justify-between items-start mb-5 md:mb-6">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-inner shrink-0">
                <AlertTriangle size={24} />
              </div>
              <button 
                onClick={() => !actionLoading && setStudentToRemove(null)} 
                disabled={actionLoading !== null}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 leading-tight">Remove Mentor</h3>
            <p className="text-[13px] md:text-sm font-medium text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to remove the mentor assignment for <span className="font-bold text-slate-900">{studentToRemove.name}</span>?
            </p>

            <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100 flex items-center justify-between mb-8 shadow-inner">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Mentor</span>
                <span className="text-xs md:text-sm font-bold text-slate-700 truncate">{studentToRemove.mentor_name}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setStudentToRemove(null)}
                disabled={actionLoading !== null}
                className="flex-1 min-h-[48px] px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-[1.25rem] transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMentor}
                disabled={actionLoading !== null}
                className="flex-1 min-h-[48px] px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] md:text-xs font-black uppercase tracking-widest rounded-[1.25rem] transition-all shadow-md shadow-rose-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-80"
              >
                {actionLoading !== null ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Mentor'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RemoveMentors;
