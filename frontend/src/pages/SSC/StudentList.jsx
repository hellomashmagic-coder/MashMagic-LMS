import React, {  useState, useEffect, useMemo , useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { User, Users, ChevronRight, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentListFilterDropdown, { sortStudentsByOption } from '../../components/StudentListFilterDropdown';
import ExportButton from '../../components/common/ExportButton';
import { mockStudentHours } from '../../utils/mockStudentHours';
import MobileCard from '../../components/common/MobileCard';

const StudentRow = ({ student, navigate }) => {
  const isPending = student.onboarding_status === 'pending';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const alertClass = student.payment_alert_level === 'Critical' ? 'payment-alert-critical' : student.payment_alert_level === 'Warning' ? 'payment-alert-warning' : '';

  const badges = [];
  if (isPending) {
    badges.push(<span key="pending" className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md animate-pulse">Onboarding Phase</span>);
  }
  if (student.course_completed === 1) {
    badges.push(<span key="course" className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-md">Course Completed</span>);
  }
  if (student.mentorship_completed === 1) {
    badges.push(<span key="mentorship" className="px-2 py-0.5 bg-teal-50 text-teal-600 border border-teal-100 text-[9px] font-black uppercase tracking-widest rounded-md">Mentorship Completed</span>);
  }
  if (student.payment_alert_level === 'Critical' || student.payment_alert_level === 'Warning') {
    badges.push(<span key="alert" className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${student.payment_alert_level === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'}`}>{student.payment_alert_level}</span>);
  }

  return (
    <>
    <div
      onClick={() => navigate(`/ssc/students/${student.id}`)}
      className={`hidden md:flex group relative bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 flex-col gap-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${isPending ? 'border-amber-100 bg-amber-50/10' : ''} ${alertClass}`}
      title={student.payment_alert_level && student.payment_alert_level !== 'None' ? `Payment Alert: ${student.consumed_hours} consumed / ${student.paid_hours} paid hours` : ''}
    >
      <div className="flex flex-col lg:flex-row items-center gap-8 w-full">
        {/* Student Profile Info */}
        <div className="flex items-center gap-5 flex-1 min-w-0 w-full">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500 ${isPending ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-[#008080] group-hover:bg-[#008080] group-hover:text-white group-hover:border-[#008080]'}`}>
            <User size={28} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-slate-900 truncate leading-none uppercase tracking-tighter">{student.name}</h3>
              {isPending && (
                <span className="px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Onboarding Phase</span>
              )}
              {student.course_completed === 1 && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase tracking-widest rounded-full">Course Completed</span>
              )}
              {student.mentorship_completed === 1 && (
                <span className="px-3 py-1 bg-teal-50 text-teal-600 border border-teal-100 text-[8px] font-black uppercase tracking-widest rounded-full">Mentorship Completed</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: MM-{student.id.toString().padStart(4, '0')}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className="text-[10px] font-bold text-[#008080] uppercase tracking-widest font-black">{student.course || 'Technical Course'}</span>
            </div>
          </div>
        </div>

        {/* Support Team Area */}
        <div className="flex flex-col md:flex-row items-center gap-8 px-4 md:px-8 py-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50 w-full lg:w-auto min-w-full md:w-[400px]">
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Academic Mentor</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#008080]"></div>
              <p className="text-[11px] font-black text-slate-800 uppercase truncate">{student.mentor_name || 'Not Assigned'}</p>
            </div>
          </div>
          
          <div className="hidden md:block w-[1px] h-10 bg-slate-200"></div>

          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Faculty Experts</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
              {student.faculty_names ? (
                <button 
                  type="button" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-[11px] font-black text-[#008080] hover:text-[#006666] underline uppercase tracking-widest cursor-pointer text-left block"
                >
                  View Faculties ({student.faculty_names.split(',').length})
                </button>
              ) : (
                <p className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[150px]">
                  None Assigned
                </p>
              )}
            </div>
          </div>

          <div className="hidden md:block w-[1px] h-10 bg-slate-200"></div>

          <div className="flex-1 min-w-0 bg-slate-50 p-2 rounded-xl border border-slate-100" title={`Consumed: ${student.consumed_hours || 0} | Paid: ${student.paid_hours || 0}`}>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Cycle</p>
                  <div className="flex items-center gap-1.5" title={student.payment_alert_level}>
                    <div className={`w-1.5 h-1.5 rounded-full ${student.payment_alert_level === 'Critical' ? 'bg-rose-500 animate-pulse' : student.payment_alert_level === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'} shrink-0`}></div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black tracking-tighter flex items-baseline">
                    <span className="text-emerald-700">{student.consumed_hours !== undefined ? student.consumed_hours : '0'}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-600 font-bold">{student.paid_hours || student.total_entitled_hours || student.total_hours || '0'} hr</span>
                  </p>
                </div>
              </div>
              <div className="w-[1px] bg-slate-200"></div>
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Lifetime</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black tracking-tighter flex items-baseline">
                    <span className="text-[#008080]">{student.total_lifetime_consumed_hours || 0}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-600 font-bold">{student.total_hours || 0} hr</span>
                  </p>
                </div>
              </div>
            </div>
              <div className="flex flex-col gap-0.5 mt-2">
              {student.subject_hours && student.subject_hours.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-200 flex flex-col gap-1">
                  <span className="text-[7px] font-black text-[#008080] uppercase tracking-widest mb-0.5">Subject Breakdown</span>
                  {student.subject_hours.map((sh, idx) => (
                    <div key={idx} className="flex justify-between items-start text-[8px] font-black uppercase text-slate-500">
                      <div className="flex flex-col gap-0.5 max-w-[100px]">
                        <span className="truncate text-slate-700">{sh.subject}</span>
                        {sh.faculties && (
                            <span className="text-[7px] text-[#008080] tracking-tighter truncate flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-[#008080]"></span> {sh.faculties}
                            </span>
                        )}
                      </div>
                      <span className="text-slate-700 ml-2 whitespace-nowrap">{sh.consumed_hours} / {sh.allocated_hours} Hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Arrow */}
        <div className="hidden lg:flex items-center justify-center w-12 h-12 bg-white rounded-2xl border border-slate-100 group-hover:bg-[#008080] group-hover:text-white transition-all shrink-0">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Sub Row for Faculties */}
      {isExpanded && student.faculty_names && (
        <div onClick={(e) => e.stopPropagation()} className="w-full mt-2 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300 cursor-default">
          <div className="flex items-center justify-between pb-4 mb-4 pl-2 border-b border-slate-50">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <span className="w-2 h-2 rounded-full bg-[#008080]"></span> Assigned Faculties: {student.name.toUpperCase()}
            </h4>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Close</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {student.faculty_names.split(',').map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:bg-white hover:border-[#008080]/30 transition-all group">
                <div className="w-8 h-8 bg-[#008080]/10 text-[#008080] rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 group-hover:bg-[#008080] group-hover:text-white transition-all">
                  {f.trim().charAt(0)}
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{f.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="md:hidden block">
      <MobileCard
        isExpanded={isMobileExpanded}
        onToggle={() => setIsMobileExpanded(!isMobileExpanded)}
        avatar={
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-xl font-black uppercase ${isPending ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-gradient-to-br from-[#008080]/10 to-[#008080]/20 border-slate-100 text-[#008080]'}`}>
            {student.name.charAt(0)}
          </div>
        }
        title={student.name}
        subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: MM-{student.id.toString().padStart(4, '0')}</span>}
        badges={badges}
        metrics={[
          { icon: null, value: <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hrs: <span className="text-[#008080]">{student.total_lifetime_consumed_hours || 0}</span>/{student.total_hours || 0}</div> },
        ]}
        expandedContent={
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Course</span>
                <span className="text-xs font-bold text-slate-800">{student.course || 'Technical Course'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-3">
                <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mentor</span>
                    <span className="text-xs font-bold text-slate-800">{student.mentor_name || 'Not Assigned'}</span>
                </div>
                <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Current Cycle</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-emerald-700">{student.consumed_hours !== undefined ? student.consumed_hours : '0'}</span>
                        <span className="text-[9px] text-slate-400">/</span>
                        <span className="text-[10px] font-bold text-slate-600">{student.paid_hours || student.total_entitled_hours || student.total_hours || '0'} hr</span>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject Breakdown</span>
                {student.subject_hours && student.subject_hours.length > 0 ? (
                    <div className="space-y-2">
                        {student.subject_hours.map((sh, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-slate-700 uppercase truncate max-w-[120px]" title={sh.subject}>{sh.subject}</span>
                                <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">{sh.consumed_hours}/{sh.allocated_hours}h</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[10px] font-bold text-slate-400 uppercase">N/A</div>
                )}
            </div>

            {student.faculty_names && (
                <div className="pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assigned Faculties ({student.faculty_names.split(',').length})</span>
                    <div className="flex flex-wrap gap-2">
                        {student.faculty_names.split(',').map((f, i) => (
                            <span key={i} className="text-[9px] font-black bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 uppercase">
                                {f.trim()}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="pt-4 flex justify-center">
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/ssc/students/${student.id}`); }}
                    className="w-full py-2 bg-slate-50 text-[#008080] font-black uppercase text-[10px] rounded-lg border border-slate-100 hover:bg-[#008080] hover:text-white transition-all shadow-sm"
                >
                    View Full Details
                </button>
            </div>
          </div>
        }
        primaryActions={[
            { icon: <ChevronRight size={14} />, label: 'Details', onClick: (e) => { e.stopPropagation(); navigate(`/ssc/students/${student.id}`); } }
        ]}
      />
    </div>
    </>
  );
};

const SSCStudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState('');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'new'
  const [activeTab, setActiveTab] = useState('enrolled_scholars');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ssc/students');
      let realStudents = res.data.data || [];
      // Inject mock hours for specific students requested by user
      realStudents = realStudents.map(student => {
        const mockKey = Object.keys(mockStudentHours).find(key => student.name && student.name.toLowerCase().includes(key.toLowerCase()));
        if (mockKey) {
          const mockObj = mockStudentHours[mockKey];
          return { 
            ...student, 
            ...mockObj,
            consumed_hours: (parseFloat(student.consumed_hours) || 0) + (mockObj.consumed_hours || 0),
            total_lifetime_consumed_hours: (parseFloat(student.total_lifetime_consumed_hours) || 0) + (mockObj.total_lifetime_consumed_hours || 0)
          };
        }
        return student;
      });
      setStudents(realStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (error) {
      toast.error("Database connection failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => {
      const isPending = s.onboarding_status === 'pending';
      if (viewMode === 'new' && !isPending) return false;
      const nameStr = s.name || '';
      const courseStr = s.course || '';
      return nameStr.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
             courseStr.toLowerCase().includes(deferredSearchTerm.toLowerCase());
    });

    if (activeTab === 'active_plus') {
      filtered = filtered.filter(s => s.course_completed !== 1);
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(s => s.course_completed === 1);
    }

    return sortStudentsByOption(filtered, sortBy);
  }, [students, viewMode, searchTerm, sortBy, activeTab]);

  return (
    <div className="space-y-12 pb-20">
      {/* Page Header */}
      <div className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Student Success Tracker</h2>
          <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center md:justify-start gap-3 mt-1">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
            Coordinating Global Academic Support Teams
          </p>
        </div>
        <div className="w-20 h-20 bg-indigo-600 rounded-[28px] shadow-2xl shadow-indigo-600/30 flex items-center justify-center text-white">
          <Users size={36} strokeWidth={2.5} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button 
          onClick={() => setActiveTab('enrolled_scholars')}
          className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'enrolled_scholars' ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-indigo-600/5 hover:-translate-y-1'}`}
        >
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600 group-hover:text-indigo-600'}`}>Enrolled Scholars</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'enrolled_scholars' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">{students.length}</span>
            <span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600'}`}>Total Population</span>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('active_plus')}
          className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'active_plus' ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-indigo-600/5 hover:-translate-y-1'}`}
        >
          <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'active_plus' ? 'text-white/80' : 'text-indigo-600'}`}>Active Plus</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'active_plus' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">
              {students.filter(s => s.course_completed !== 1).length}
            </span>
            <div className={`flex items-center gap-1.5 mb-1 px-2 py-0.5 rounded-full ${activeTab === 'active_plus' ? 'bg-white/20' : 'bg-indigo-600/10'}`}>
               <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'active_plus' ? 'bg-white' : 'bg-indigo-600'}`}></div>
               <span className={`text-[10px] uppercase tracking-widest ${activeTab === 'active_plus' ? 'text-white' : 'text-indigo-600'}`}>Live</span>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('completed')}
          className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-xl shadow-emerald-500/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'}`}
        >
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'completed' ? 'text-white/80' : 'text-emerald-600 hover:text-emerald-700'}`}>Course Completed</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'completed' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">{students.filter(s => s.course_completed === 1).length}</span>
            <span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'completed' ? 'text-white/80' : 'text-slate-600'}`}>Total Achievers</span>
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search student or course..."
            className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StudentListFilterDropdown value={sortBy} onChange={setSortBy} />
          <ExportButton 
            data={filteredStudents}
            filename="ssc_students"
            dateField="created_at"
            columns={[
              { header: 'Reg #', accessor: 'registration_number' },
              { header: 'Name', accessor: 'name' },
              { header: 'Course', accessor: 'course' },
              { header: 'Grade', accessor: 'grade' },
              { header: 'Mentor', accessor: 'mentor_name' },
              { header: 'Faculty', accessor: 'faculty_names' },
              { header: 'Session Count', accessor: 'session_count' },
              { header: 'Connected Today', accessor: 'connected_today' },
              { header: 'Status', accessor: 'status' }
            ]}
          />
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            <button
              onClick={() => setViewMode('active')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              All Students ({students.length})
            </button>
            <button
              onClick={() => setViewMode('new')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'new' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Onboarding ({students.filter(s => s.onboarding_status === 'pending').length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-32 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregating Student Data...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((student) => (
            <StudentRow key={student.id} student={student} navigate={navigate} />
          ))}
          
          {filteredStudents.length === 0 && (
            <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No student profiles detected</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SSCStudentList;
