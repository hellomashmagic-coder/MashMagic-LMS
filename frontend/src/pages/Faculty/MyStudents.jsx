import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/api';
import { Search, User, ChevronRight, MoreHorizontal, GraduationCap, MapPin, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentListFilterDropdown, { sortStudentsByOption } from '../../components/StudentListFilterDropdown';
import ExportButton from '../../components/common/ExportButton';
import MobileCard from '../../components/common/MobileCard';
const FacultyStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState('');
  const [expandedMobileCards, setExpandedMobileCards] = useState({});
  const navigate = useNavigate();
  useEffect(() => {
    fetchStudents();
  }, []);
  const fetchStudents = async () => {
    try {
      const res = await axios.get('/faculty/students');
      if (res.data.success) {
        setStudents((res.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };
  const StatusBadge = ({
    status
  }) => {
    const colors = {
      Green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      Yellow: 'bg-amber-50 text-amber-600 border-amber-100',
      Red: 'bg-rose-50 text-rose-600 border-rose-100'
    };
    const labels = {
      Green: 'Good',
      Yellow: 'Average',
      Red: 'Poor'
    };
    return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[status] || colors.Green}`}>
 {labels[status] || status}
 </span>;
  };
  const filteredStudents = useMemo(() => {
    const filtered = students.filter(s => {
      const nameStr = s.name || '';
      const rollStr = s.roll_number || '';
      return nameStr.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || rollStr.toLowerCase().includes(deferredSearchTerm.toLowerCase());
    });
    return sortStudentsByOption(filtered, sortBy);
  }, [students, searchTerm, sortBy]);
  return <div className="space-y-8">
 {/* Page Title */}
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Assigned Roster</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Manage and monitor your assigned students</p>
 </div>

 {/* Header / Actions */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="relative group flex-1 max-w-md">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input type="text" placeholder="Search students by name or roll number..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 </div>
 <div className="flex gap-4">
 <StudentListFilterDropdown value={sortBy} onChange={setSortBy} />
 <ExportButton 
    data={filteredStudents}
    filename="my_students"
    dateField="created_at"
    columns={[
      { header: 'Reg #', accessor: 'roll_number' },
      { header: 'Name', accessor: 'name' },
      { header: 'Department', accessor: 'department' },
      { header: 'Attendance %', accessor: 'attendance_percentage' },
      { header: 'Performance', accessor: 'performance_status' }
    ]}
 />
 </div>
 </div>

 {/* Students List - Responsive (Table for Desktop, Cards for Mobile) */}
 <div className="bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
 {/* Desktop View (Table) */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/50">
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Student Information</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Roll Number</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Department</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Hours</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Attendance</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Performance</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {loading ? [1, 2, 3, 4, 5].map((i, index) => <tr key={i} className="animate-pulse"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td colSpan="5" className="px-4 md:px-8 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
 </tr>) : filteredStudents.length > 0 ? filteredStudents.map((student, index) => <tr key={student.id} className="hover:bg-slate-50/80 transition-all group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-white font-black text-xl group-hover:bg-[#008080] group-hover:text-white transition-all duration-500">
 {student.name.charAt(0)}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <p className="font-black text-slate-900 leading-none mb-0.5">{student.name}</p>
 {student.badge === 'Gold' && <span title="Mentorship Plan" className="cursor-help text-base">🥇</span>}
 {student.badge === 'Tuition' && <span title="Tuition Plan" className="cursor-help text-base">🥈</span>}
 {student.badge === 'Diamond' && <span title="Mentorship & Tuition Plan" className="cursor-help text-base">💎</span>}
 </div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Undergraduate</p>
 </div>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 font-bold text-slate-600 font-mono text-xs tracking-wider uppercase">
 {student.roll_number || 'N/A'}
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-[#008080] rounded-full"></div>
 <span className="text-xs font-bold text-slate-700 tracking-tight uppercase">{student.department || 'General'}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex flex-col gap-1 min-w-[120px]">
 {student.subject_hours && student.subject_hours.length > 0 ? student.subject_hours.map((sh, idx) => <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase text-[#008080]">
 <span>{sh.subject}</span>
 <span className="text-slate-700 ml-2">{sh.consumed_hours} / {sh.allocated_hours} Hrs</span>
 </div>) : <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No subject hours logged</span>}
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex flex-col items-center gap-2">
 <span className="text-xs font-black text-slate-900 tabular-nums">{student.attendance_percentage}%</span>
 <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-1000 ${parseFloat(student.attendance_percentage) > 85 ? 'bg-emerald-500' : parseFloat(student.attendance_percentage) > 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{
                      width: `${student.attendance_percentage}%`
                    }}></div>
 </div>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6">
 <StatusBadge status={student.performance_status || 'Green'} />
 </td>
 </tr>) : <tr>
 <td colSpan="5" className="px-4 md:px-8 py-20 text-center">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
 <GraduationCap size={40} />
 </div>
 <p className="text-slate-900 font-black text-xl">No students found</p>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Adjust your search filters or check your assignments</p>
 </td>
 </tr>}
 </tbody>
 </table>
 </div>

 {/* Mobile View (Cards) */}
 <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50">
    {loading ? (
        [1, 2, 3].map(i => <div key={i} className="animate-pulse h-32 bg-white rounded-2xl"></div>)
    ) : filteredStudents.length > 0 ? (
        filteredStudents.map((student, index) => {
            const statusLabels = { Green: 'Good', Yellow: 'Average', Red: 'Poor' };
            const statusColors = {
                Green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                Yellow: 'bg-amber-50 text-amber-600 border-amber-100',
                Red: 'bg-rose-50 text-rose-600 border-rose-100'
            };
            const studentStatus = student.performance_status || 'Green';
            const badges = [];
            
            badges.push(
                <span key="status" className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${statusColors[studentStatus] || statusColors.Green}`}>
                    {statusLabels[studentStatus] || studentStatus}
                </span>
            );
            if(student.badge === 'Gold') badges.push(<span key="g" title="Mentorship Plan">🥇</span>);
            if(student.badge === 'Tuition') badges.push(<span key="t" title="Tuition Plan">🥈</span>);
            if(student.badge === 'Diamond') badges.push(<span key="d" title="Mentorship & Tuition Plan">💎</span>);

            return (
                <MobileCard
                    key={student.id}
                    isExpanded={!!expandedMobileCards[student.id]}
                    onToggle={() => setExpandedMobileCards(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                    avatar={
                        <div className="w-10 h-10 bg-[#008080]/10 rounded-xl flex items-center justify-center text-[#008080] font-black text-lg">
                            {student.name.charAt(0)}
                        </div>
                    }
                    title={student.name}
                    subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.department || 'General'} | {student.roll_number || 'N/A'}</span>}
                    badges={badges}
                    metrics={[
                        { icon: null, value: <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Att: <span className="text-[#008080]">{student.attendance_percentage}%</span></div> }
                    ]}
                    expandedContent={
                        <div className="space-y-4">
                            <div className="pt-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject Hours</span>
                                {student.subject_hours && student.subject_hours.length > 0 ? (
                                    <div className="space-y-2">
                                        {student.subject_hours.map((sh, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-[10px] font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-700 uppercase">{sh.subject}</span>
                                                <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">{sh.consumed_hours} / {sh.allocated_hours} Hrs</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">No subject hours logged</div>
                                )}
                            </div>
                        </div>
                    }
                />
            );
        })
    ) : (
        <div className="py-20 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100 shadow-sm">
                <GraduationCap size={32} />
            </div>
            <p className="text-slate-900 font-black text-sm uppercase">No students found</p>
        </div>
    )}
 </div>
 </div>
 </div>;
};
export default FacultyStudents;