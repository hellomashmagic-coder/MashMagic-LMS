import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, User, Phone, BookOpen, Clock, Calendar, CheckSquare, MessageSquare, History, Contact, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/Mentor/StatusBadge';
import { useAuth } from '../../context/AuthContext';
const StudentDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info, timetable, logs
  const [facultyHistory, setFacultyHistory] = useState([]);
  const [showFacultyHistory, setShowFacultyHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isAdmin = ['super_admin', 'sub_admin', 'mentor_head', 'academic_head'].includes(user?.role);
  const isSSC = user?.role === 'ssc';
  const isMentor = user?.role === 'mentor';
  const isFaculty = user?.role === 'faculty';

  // Determine back path based on role
  const getBackPath = () => {
    if (user?.role === 'academic_operation_executive' || user?.role === 'aoe') return '/aoe/students';
    if (isAdmin) {
      if (user.role === 'mentor_head') return '/mentor-head/students';
      if (user.role === 'academic_head') return '/academic-head/students';
      return '/admin/students';
    }
    if (isSSC) return '/ssc/students';
    if (isFaculty) return '/faculty/students';
    return '/mentor/students';
  };
  const backPath = getBackPath();
  const backLabel = 'Back to Student Directory';
  useEffect(() => {
    fetchStudentDetails();
  }, [id]);
  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      let endpoint;
      const role = user?.role;
      if (role === 'academic_operation_executive' || role === 'aoe') {
        endpoint = `/aoe/students/${id}`;
      } else if (role === 'ssc') {
        endpoint = `/ssc/students/${id}`;
      } else if (role === 'faculty') {
        endpoint = `/faculty/students/${id}`;
      } else if (role === 'mentor_head') {
        endpoint = `/mentor-head/students/${id}`;
      } else {
        endpoint = `/mentor/students/${id}`;
      }

      // For admins, we can use the admin endpoint or the mentor endpoint. 
      // The original logic mapped admin/super_admin to `/mentor/students/${id}`. Let's keep it that way.
      const studentRes = await api.get(endpoint);
      if (studentRes.data.success) {
        setStudent(studentRes.data.data);
      }

      // Only fetch fees if admin (not mentor_head, they don't have /admin/fees access)
      const canFetchAdminFees = isAdmin && user?.role !== 'mentor_head' && user?.role !== 'academic_head';
      if (canFetchAdminFees) {
        try {
          const feesRes = await api.get(`/admin/fees/student`);
          if (feesRes.data.success) {
            const feeStruct = feesRes.data.data.find(f => f.entity_id === parseInt(id));
            if (feeStruct) {
              setFees(feeStruct);
            }
          }
        } catch (err) {
          console.error("Error fetching fees:", err);
        }
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
      toast.error("Failed to load student details");
      navigate(backPath);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacultyHistory = async () => {
    try {
      setLoadingHistory(true);
      let endpoint;
      const role = user?.role;
      if (role === 'academic_operation_executive' || role === 'aoe') {
        endpoint = `/aoe/students/${id}/faculty-history`;
      } else if (role === 'ssc') {
        endpoint = `/ssc/students/${id}/faculty-history`;
      } else if (role === 'faculty') {
        endpoint = `/faculty/students/${id}/faculty-history`;
      } else if (role === 'mentor_head') {
        endpoint = `/mentor-head/students/${id}/faculty-history`;
      } else if (role === 'academic_head') {
        endpoint = `/academic-head/students/${id}/faculty-history`;
      } else if (isAdmin) {
        endpoint = `/admin/students/${id}/faculty-history`;
      } else {
        endpoint = `/mentor/students/${id}/faculty-history`;
      }

      const res = await api.get(endpoint);
      if (res.data.success) {
        setFacultyHistory(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching faculty history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timetable' && showFacultyHistory && facultyHistory.length === 0) {
      fetchFacultyHistory();
    }
  }, [activeTab, showFacultyHistory]);
  const handleUpdateStatus = async (sessionId, currentSession, newStatus) => {
    if (isAdmin || isMentor) {
      try {
        const res = await api.put(`/mentor/timetable/${sessionId}`, {
          ...currentSession,
          status: newStatus
        });
        if (res.data.success) {
          toast.success(`Status updated to ${newStatus}`);
          fetchStudentDetails();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to update status");
      }
    } else {
      toast.error("Permission denied to update status");
    }
  };
  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest animate-pulse">Loading Student Profile...</p>
        </div>;
  if (!student) return null;
  return <div className="max-w-[1400px] mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button onClick={() => navigate(backPath)} className="group flex items-center gap-2 text-slate-600 hover:text-[#008080] font-black text-[10px] uppercase tracking-widest transition-all mb-6">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-[#008080]/10 group-hover:border-[#008080] transition-all">
                    <ArrowLeft size={14} />
                </div>
                {backLabel}
            </button>

            {/* Profile Header */}
            <div className="bg-white p-5 md:p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row gap-10 items-center md:items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#008080]/20 to-purple-50/20 rounded-full -mr-40 -mt-40 blur-3xl opacity-60"></div>
                
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#008080] rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <div className="w-40 h-40 bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300 relative z-10 border border-slate-100 shadow-inner">
                        <User size={80} className="text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                            {student.name}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            {student.onboarding_status === 'pending' && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
                                    {isSSC ? 'Onboarding Pending' : 'New Student'}
                                </span>}
                            {student.status === 'active' ? <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm flex items-center gap-1">
                                    <BadgeCheck size={10} /> Active
                                </span> : <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 shadow-sm">
                                    {student.status}
                                </span>}
                            {student.is_shifted && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 shadow-sm flex items-center gap-1">
                                    <History size={10} /> Shifted: {student.shifted_from}
                                </span>}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
                        <div className="px-5 py-2.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#008080]/20">
                            {student.course}
                        </div>
                        <div className="px-5 py-2.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#008080]/20">
                            {student.grade}
                        </div>
                        {student.badge && <div className="px-5 py-2.5 bg-white border border-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2">
                                {student.badge === 'Gold' && '🥇 Gold'}
                                {student.badge === 'Silver' && '🥈 Silver'}
                                {student.badge === 'Diamond' && '💎 Diamond'}
                             </div>}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-slate-50">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><BookOpen size={12} /> Primary Subject</p>
                            <p className="text-sm font-black text-slate-700">{student.subject}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Clock size={12} /> Allocated Hours</p>
                            <p className="text-sm font-black text-slate-700">{student.hour} Hrs/Week</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Phone size={12} /> Contact</p>
                            <p className="text-sm font-black text-slate-700">{student.phone_number || student.contact || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Calendar size={12} /> Next Payment</p>
                            <p className="text-sm font-black text-[#008080]">{student.next_installment_date ? new Date(student.next_installment_date).toLocaleDateString('en-GB') : 'Pending'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-2 p-3 md:p-1.5 bg-slate-50 md:bg-white border-none md:border md:border-slate-100 shadow-none md:shadow-sm rounded-[1.5rem] md:rounded-[2rem] w-full md:w-fit mx-auto md:mx-0">
                {[{
        id: 'info',
        label: 'Academic Information',
        icon: <User size={16} className="md:w-[14px] md:h-[14px]" />
      }, {
        id: 'timetable',
        label: 'Session Timetable',
        icon: <Clock size={16} className="md:w-[14px] md:h-[14px]" />
      }, {
        id: 'logs',
        label: 'Interaction History',
        icon: <History size={16} className="md:w-[14px] md:h-[14px]" />
      }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                            flex items-center justify-start md:justify-center gap-3 md:gap-2 px-6 md:px-8 py-4 md:py-4 min-h-[48px] md:min-h-0 rounded-[1.25rem] md:rounded-[1.5rem] text-[11px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200
                            ${activeTab === tab.id ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30 border-transparent' : 'bg-white md:bg-transparent text-slate-600 md:text-slate-500 border border-slate-200 md:border-transparent hover:text-slate-800 hover:bg-slate-50'}
                        `}>
                        {tab.icon} {tab.label}
                    </button>)}
            </div>

            <div className="bg-white p-5 md:p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/20 border border-slate-100 min-h-[500px]">
                {activeTab === 'info' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <section className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <CheckSquare size={20} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Academic Context</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <InfoItem label="Registration Number" value={student.registration_number || student.roll_number || 'N/A'} />
                                <div className="p-6 bg-[#008080]/10 backdrop-blur-md rounded-[2.5rem] border border-[#008080]/30 shadow-[0_4px_30px_rgba(0,128,128,0.1)] hover:bg-[#008080]/15 hover:shadow-lg hover:shadow-[#008080]/20 transition-all group">
                                    <p className="text-[9px] font-black text-[#008080]/70 uppercase tracking-[0.2em] mb-1.5 transition-colors">Enrollment Type</p>
                                    <p className="text-sm font-black text-[#008080] tracking-tight">{student.enrollment_type || 'Academic'}</p>
                                </div>
                                <InfoItem label="Course / Stream" value={student.course} />
                                <InfoItem label="Grade / Level" value={student.grade} />
                                <InfoItem label="Syllabus" value={student.syllabus} />
                                <InfoItem label="School / Institution" value={student.school_name} />
                                <InfoItem label="Preferred Language" value={student.preferred_language} />
                                <InfoItem label="Country" value={student.country} />
                                <InfoItem label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-GB') : 'N/A'} />
                                <InfoItem label="Live Session Link" value={student.meeting_link ? <a href={student.meeting_link.startsWith('http') ? student.meeting_link : `https://${student.meeting_link}`} target="_blank" rel="noopener noreferrer" className="text-[#008080] hover:underline inline-block truncate max-w-full font-black">
                                                {student.meeting_link}
                                            </a> : 'Not Specified'} />
                                <InfoItem label="Assigned Faculty" value={student.faculty_name || 'Not Specified'} />
                                <InfoItem label="Lead Mentor" value={student.mentor_name || 'Not Specified'} />
                            </div>
                        </section>
 
                        <section className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <MessageSquare size={20} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Enrollment Summary</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="p-4 md:p-8 bg-[#008080] text-white rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#008080]/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-4">Class Schedule</p>
                                    <div className="text-sm font-medium leading-relaxed text-white space-y-2">
                                        {(() => {
                  if (student.subjects_json && student.subjects_json !== '{}' && student.subjects_json !== '[]') {
                    try {
                      const parsed = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed.map((s, idx) => <div key={idx} className="bg-white/10 p-3 rounded-xl border border-white/10">
                                                                <p className="font-black text-yellow-400 text-xs mb-1">
                                                                    {Array.isArray(s.subject) ? s.subject.join(', ') : s.subject}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {s.dayConfigs ? s.dayConfigs.map((d, i) => <span key={i} className="text-[10px] bg-white/20 px-2 py-1 rounded-lg">
                                                                            {d.day.substring(0, 3)}: {d.startTime}-{d.endTime}
                                                                        </span>) : s.days?.map((d, i) => <span key={i} className="text-[10px] bg-white/20 px-2 py-1 rounded-lg">
                                                                            {d.substring(0, 3)}
                                                                        </span>)}
                                                                </div>
                                                            </div>);
                      }
                    } catch (e) {
                      // fallback
                    }
                  }
                  const tt = student.time_table !== '{}' ? student.time_table : null;
                  const ts = student.timetable_summary !== '{}' ? student.timetable_summary : null;
                  return tt || ts || 'Standard operation procedures apply for this profile. Academic progress is monitored weekly.';
                })()}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance status</p>
                                        <p className="text-sm font-black text-slate-700">{student.performance_status || 'Stable'}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance rate</p>
                                        <p className="text-sm font-black text-emerald-600">{student.attendance_percentage || 0}%</p>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-6">
                                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <span className="text-sm font-black">₹</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Summary</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fees</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-slate-700">₹{fees ? fees.total_fee : student.total_fees || 0}</p>
                                                {fees && fees.paid_hours > 0 && fees.consumed_hours / fees.paid_hours >= 0.9 ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[8px] font-black uppercase animate-pulse">90% Consumed</span> : fees && fees.paid_hours > 0 && fees.consumed_hours / fees.paid_hours >= 0.7 ? <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black uppercase animate-pulse">70% Consumed</span> : null}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                                            <p className="text-sm font-black text-emerald-600">₹{fees ? fees.total_paid_amount : student.total_paid || 0}</p>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Amount</p>
                                            <p className={`text-sm font-black ${fees && fees.total_fee - fees.total_paid_amount > 0 ? 'text-rose-600' : !fees && (student.total_fees || 0) - (student.total_paid || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                ₹{fees ? Math.max(0, fees.total_fee - fees.total_paid_amount) : Math.max(0, (student.total_fees || 0) - (student.total_paid || 0))}
                                            </p>
                                        </div>
                                    </div>
                                    </div>

                                    {student.installments && student.installments.length > 0 && <div className="mt-6 border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Payment History</h4>
                                                <span className="text-[9px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                                    {student.installments.length} Records
                                                </span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                <div className="w-full overflow-x-auto">
<table className="w-full text-left">
                                                    <thead className="sticky top-0 bg-white shadow-sm">
                                                        <tr>
                                                            <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                                            <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                                                            <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Notes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {student.installments.map((inst, idx) => <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{idx + 1}</td>
                                                                <td className="py-3 px-6 text-[11px] font-black text-slate-600">
                                                                    {new Date(inst.payment_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                                                                </td>
                                                                <td className="py-3 px-6 text-[11px] font-black text-emerald-600">
                                                                    ₹{inst.amount}
                                                                </td>
                                                                <td className="py-3 px-6 text-[10px] font-bold text-slate-500 italic">
                                                                    {inst.notes || '---'}
                                                                </td>
                                                            </tr>)}
                                                    </tbody>
                                                </table>
</div>
                                            </div>
                                        </div>}
                                </div>
                        </section>
                    </div>}

                {activeTab === 'timetable' && <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Session Timetable</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setShowFacultyHistory(true)} className="flex items-center gap-2 px-4 py-2 bg-[#008080]/10 hover:bg-[#008080]/20 rounded-xl text-[10px] font-black text-[#008080] uppercase tracking-widest border border-[#008080]/20 transition-colors">
                                    <History size={12} /> Faculty History
                                </button>
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                                    <Clock size={12} /> Live Schedule
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="py-6 px-4 md:px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">#Sess</th>
                                        <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date</th>
                                        <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Time</th>
                                        <th className="py-6 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Topics Covered</th>
                                        <th className="py-6 px-4 md:px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {student.timetable && student.timetable.length > 0 ? student.timetable.map((session, index) => <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                                            <td className="py-4 md:py-8 px-4 md:px-8">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xs shadow-inner">
                                                    #{session.session_number}
                                                </div>
                                            </td>
                                            <td className="py-4 md:py-8 px-4">
                                                <p className="text-sm font-black text-slate-700">{new Date(session.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}</p>
                                                {session.status === 'Postponed' && session.new_date && <p className="text-[9px] font-black text-amber-600 mt-1 uppercase">RESCHEDULED: {new Date(session.new_date).toLocaleDateString('en-GB')}</p>}
                                            </td>
                                            <td className="py-4 md:py-8 px-4 font-bold text-slate-600 text-sm">{session.start_time} - {session.end_time}</td>
                                            <td className="py-4 md:py-8 px-4">
                                                <p className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:line-clamp-none transition-all">{session.chapter_topic || session.chapter || 'Awaiting Content'}</p>
                                            </td>
                                            <td className="py-4 md:py-8 px-4 md:px-8 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <StatusBadge status={session.status} />
                                                    {(isAdmin || isMentor) && <select className="text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 rounded-xl p-2 outline-none cursor-pointer hover:border-[#008080] transition-all" value={session.status} onChange={e => handleUpdateStatus(session.id, session, e.target.value)}>
                                                            <option value="Scheduled">Schedule</option>
                                                            <option value="Completed">Complete</option>
                                                            <option value="Postponed">Postpone</option>
                                                            <option value="Absent">Absent</option>
                                                            <option value="Cancelled">Cancel</option>
                                                        </select>}
                                                </div>
                                            </td>
                                        </tr>) : <tr>
                                            <td colSpan="5" className="py-32 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-inner">
                                                    <Clock size={32} />
                                                </div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No academic sessions found in database.</p>
                                            </td>
                                        </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>}

                {activeTab === 'logs' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <section className="space-y-8">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <History size={24} className="text-[#008080]" /> Mentorship Activity
                                </h3>
                                <span className="px-4 py-1.5 bg-slate-50 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                                    {student.studentLogs?.length || 0} Entries
                                </span>
                            </div>

                            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-4 scrollbar-hide">
                                {student.studentLogs && student.studentLogs.length > 0 ? student.studentLogs.map(log => <div key={log.id} className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl hover:bg-white transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#008080]/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest">{log.type}</span>
                                                <span className="text-lg font-black text-slate-900">{new Date(log.date || log.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
                                                {new Date(log.created_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                                            </span>
                                        </div>

                                        <div className="bg-white/60 p-6 rounded-2xl border border-white/80 shadow-inner mb-6 relative z-10">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Narrative / Summary</p>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                                "{log.details || log.mentor_notes || 'No summary provided.'}"
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-6 relative z-10">
                                            {log.self_clarity !== undefined && <MetricSmall label="Clarity" value={`${log.self_clarity}%`} />}
                                            {log.confidence !== undefined && <MetricSmall label="Confidence" value={`${log.confidence}/5`} />}
                                            {log.status && <MetricSmall label="State" value={log.status} />}
                                        </div>

                                        {log.screenshot_url && <a href={log.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-6 text-[10px] font-black text-[#008080] hover:underline uppercase tracking-widest bg-[#008080]/5 w-fit px-4 py-2 rounded-xl transition-all hover:bg-[#008080]/10">
                                                View Attachment
                                            </a>}
                                    </div>) : <div className="py-32 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No mentorship logs available.</p>
                                    </div>}
                            </div>
                        </section>

                        <section className="space-y-8">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <Contact size={24} className="text-purple-600" /> Faculty Archive
                                </h3>
                                <span className="px-4 py-1.5 bg-purple-50 rounded-xl text-[9px] font-black text-purple-600 uppercase tracking-widest border border-purple-100">
                                    Verified Sessions
                                </span>
                            </div>

                            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-4 scrollbar-hide">
                                {student.facultyLogs && student.facultyLogs.length > 0 ? student.facultyLogs.map(log => <div key={log.id} className="p-4 md:p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div>
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">ACADEMIC CHECK</span>
                                                <h4 className="text-lg font-black text-slate-900 mt-1">{log.chapter || 'Topic Unspecified'}</h4>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.date).toLocaleDateString('en-GB')}</span>
                                        </div>

                                        <div className="space-y-4 mb-6 relative z-10">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Topics covered</p>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">{log.topics_covered || '---'}</p>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Student Performance</span>
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.student_performance === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {log.student_performance || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {log.screenshot_url && <a href={log.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-4 text-[10px] font-black text-purple-500 hover:underline uppercase tracking-widest bg-purple-50 w-fit px-4 py-2 rounded-xl">
                                                View Attachment
                                            </a>}
                                    </div>) : <div className="py-32 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No faculty logs found.</p>
                                    </div>}
                            </div>
                        </section>
                    </div>}
            </div>

            {/* Faculty History Modal */}
            {showFacultyHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col relative">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                    <History className="text-[#008080]" /> Faculty Change History
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Tracking faculty assignments for {student?.name}
                                </p>
                            </div>
                            <button onClick={() => setShowFacultyHistory(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-2 rounded-xl">
                                ✕
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                            {loadingHistory ? (
                                <div className="py-20 text-center">
                                    <div className="w-8 h-8 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading History...</p>
                                </div>
                            ) : facultyHistory.length > 0 ? (
                                Object.entries(facultyHistory.reduce((acc, curr) => {
                                    if (!acc[curr.subject]) acc[curr.subject] = [];
                                    acc[curr.subject].push(curr);
                                    return acc;
                                }, {})).map(([subject, changes]) => (
                                    <div key={subject} className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 relative">
                                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-white text-[#008080] text-[9px] font-black uppercase tracking-widest rounded-bl-2xl rounded-tr-[1.5rem] border-b border-l border-slate-100">
                                            {subject}
                                        </div>
                                        <div className="space-y-4 mt-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                            {changes.map((change, idx) => (
                                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                        <User size={16} />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                {new Date(change.changed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[9px] font-black text-slate-400">
                                                                {new Date(change.changed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-black text-slate-800 my-2">
                                                            {change.old_faculty_name || 'Unassigned'} <span className="text-slate-400 mx-1">→</span> <span className="text-[#008080]">{change.new_faculty_name || 'Unassigned'}</span>
                                                        </p>
                                                        <div className="mt-2 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                                                            Changed by: {change.changed_by_name} ({change.changed_by_role})
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                                        <History size={32} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No faculty changes recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>;
};
const InfoItem = ({
  label,
  value
}) => <div className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all group">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-[#008080] transition-colors">{label}</p>
        <p className="text-sm font-black text-slate-800 tracking-tight">{value || 'Not Specified'}</p>
    </div>;
const MetricSmall = ({
  label,
  value
}) => <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
        <span className="text-[11px] font-black text-slate-800">{value}</span>
    </div>;
export default StudentDetails;