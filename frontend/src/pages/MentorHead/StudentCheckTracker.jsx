import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, CheckCircle2, ShieldAlert, RotateCcw, User, Calendar, Activity, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const StudentCheckTracker = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('least_checked');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchStudentChecks();
  }, [page, sortBy]);

  // Reset page to 1 when sort changes
  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  const fetchStudentChecks = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`/api/mentor-head/daily-student-checks?page=${page}&limit=${limit}&sortBy=${sortBy}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setStudents(res.data.data || []);
        setTotalRecords(res.data.total || 0);
      }
    } catch (error) {
      toast.error("Failed to load student checks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCheck = async studentId => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`/api/mentor-head/students/${studentId}/check`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStudents(prev => prev.map(s => {
        if (s.student_id === studentId) {
          return {
            ...s,
            total_check_count: (s.total_check_count || 0) + 1
          };
        }
        return s;
      }));
      toast.success('Marked student as checked');
    } catch (error) {
      toast.error("Failed to add check");
    }
  };

  const handleRemoveCheck = async studentId => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`/api/mentor-head/students/${studentId}/uncheck`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStudents(prev => prev.map(s => {
        if (s.student_id === studentId && (s.total_check_count || 0) > 0) {
          return {
            ...s,
            total_check_count: s.total_check_count - 1
          };
        }
        return s;
      }));
      toast.success('Check removed');
    } catch (error) {
      toast.error("Failed to remove check");
    }
  };

  if (loading) return <div className="p-4 md:p-8 text-center text-slate-600 font-bold">Loading tracker...</div>;

  const sortedStudents = students;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Page Title */}
      <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[4rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#008080] rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#008080]/30 rotate-3 shrink-0">
              <Target size={24} className="md:w-7 md:h-7" />
            </div>
            Verification Registry
          </h2>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-2 md:mt-3 flex items-center gap-1.5 md:gap-2">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0 md:w-[14px] md:h-[14px]" />
            <span className="truncate">Internal audit of daily mentor-student interaction verification</span>
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 bg-slate-50 p-2 rounded-[1rem] md:rounded-2xl border border-slate-100 shrink-0 w-full md:w-auto">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2 whitespace-nowrap">Sort By:</span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)} 
            className="flex-1 md:w-auto bg-white border border-slate-200 md:border-none rounded-[0.75rem] md:rounded-xl px-3 md:px-4 py-2.5 md:py-2 text-[11px] md:text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#008080]/20 shadow-sm min-h-[44px] md:min-h-0 appearance-none"
          >
            <option value="least_checked">Least Checked First</option>
            <option value="most_checked">Most Checked First</option>
            <option value="name">Student Name (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-100">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Student Name</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Assigned Mentor</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Last Interaction Date</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Interaction Count</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Check Count</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, index) => {
                const checkCount = student.total_check_count || 0;
                let rowClass = "border-b border-slate-50 transition-colors group bg-white hover:bg-slate-50/50";
                let badge = null;
                if (checkCount === 1) {
                  rowClass = "border-b border-emerald-100 transition-colors group bg-emerald-50 hover:bg-emerald-100/50 text-emerald-900";
                } else if (checkCount >= 2) {
                  rowClass = "border-b border-rose-100 transition-colors group bg-rose-50 hover:bg-rose-100/50 text-rose-900";
                  badge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 ml-2 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-sm">
                      {checkCount}
                    </span>
                  );
                }
                
                return (
                  <tr key={student.student_id} className={rowClass}>
                    <td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                    <td className="p-4 text-sm font-bold flex items-center gap-2">
                      {student.student_name}
                      {student.onboarding_status === 'pending' && (
                        <span className="px-2 py-0.5 bg-rose-50 rounded-md text-[8px] font-black text-rose-600 shadow-sm border border-rose-100 uppercase tracking-widest">
                          New
                        </span>
                      )}
                      {badge}
                    </td>
                    <td className="p-4 text-xs font-bold">
                      {student.mentor_name || 'Unassigned'}
                    </td>
                    <td className="p-4 text-xs font-bold opacity-80">
                      {student.last_interaction_date ? new Date(student.last_interaction_date).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4 text-sm font-black opacity-80">
                      {student.total_interaction_count || 0}
                    </td>
                    <td className="p-4 text-sm font-black opacity-80">
                      {checkCount}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleAddCheck(student.student_id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all bg-white border border-slate-200 text-slate-600 shadow-sm hover:scale-105 active:scale-95 uppercase tracking-widest">
                          <CheckCircle2 size={14} className={checkCount > 0 ? 'text-emerald-500' : 'text-slate-600'} />
                          Checked
                        </button>
                        {checkCount > 0 && (
                          <button onClick={() => handleRemoveCheck(student.student_id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all bg-white border border-slate-200 text-slate-600 shadow-sm hover:scale-105 active:scale-95 uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50" title="Undo Check">
                            <RotateCcw size={14} />
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKED CARDS */}
        <div className="md:hidden flex flex-col gap-3">
          {sortedStudents.map((student, index) => {
            const checkCount = student.total_check_count || 0;
            const isNever = !student.last_interaction_date;
            
            let cardStyle = "bg-slate-50/50 border-slate-100";
            if (checkCount === 1) cardStyle = "bg-emerald-50 border-emerald-100";
            if (checkCount >= 2) cardStyle = "bg-rose-50 border-rose-100";

            return (
              <div key={student.student_id || index} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-4 active:scale-[0.99] transition-transform duration-200 ${cardStyle}`}>
                
                {/* Header (Student & Mentor) */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{student.student_name}</h4>
                      {student.onboarding_status === 'pending' && (
                        <span className="px-2 py-0.5 bg-rose-100 rounded-md text-[8px] font-black text-rose-700 shadow-sm border border-rose-200 uppercase tracking-widest shrink-0">
                          New
                        </span>
                      )}
                      {checkCount >= 2 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-sm shrink-0">
                          {checkCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                      <User size={12} className="shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-widest truncate">{student.mentor_name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-[1rem] p-2.5 border border-slate-200 shadow-sm flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> Last Active
                    </span>
                    <span className={`text-[11px] font-bold truncate ${isNever ? 'text-rose-500' : 'text-slate-700'}`}>
                      {isNever ? 'Never' : new Date(student.last_interaction_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="bg-white rounded-[1rem] p-2.5 border border-slate-200 shadow-sm flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Activity size={10} /> Interactions
                    </span>
                    <span className="text-[11px] font-black text-slate-700">
                      {student.total_interaction_count || 0} Total
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                  <button 
                    onClick={() => handleAddCheck(student.student_id)} 
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl text-[11px] font-black transition-all bg-white border border-slate-200 text-slate-700 shadow-sm active:scale-95 uppercase tracking-widest"
                  >
                    <CheckCircle2 size={16} className={checkCount > 0 ? 'text-emerald-500' : 'text-slate-400'} />
                    {checkCount > 0 ? 'Checked' : 'Mark Checked'}
                  </button>
                  
                  {checkCount > 0 && (
                    <button 
                      onClick={() => handleRemoveCheck(student.student_id)} 
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all bg-white border border-rose-200 text-rose-500 shadow-sm active:scale-95 hover:bg-rose-50"
                      title="Undo Check"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
          
          {sortedStudents.length === 0 && (
            <div className="text-center py-5 md:py-10">
              <CheckSquare size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No students found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 md:mt-6 border-t border-slate-100 pt-4 md:pt-6">
           <Pagination 
             currentPage={page} 
             totalPages={Math.ceil(totalRecords / limit) || 1} 
             totalRecords={totalRecords} 
             onPageChange={setPage} 
           />
        </div>

      </div>
    </div>
  );
};

export default StudentCheckTracker;