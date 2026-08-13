import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, ArrowLeft, GraduationCap, Clock, Activity, ShieldCheck, Users, AlertCircle, Edit2, Trash2, X, Save, ChevronRight, Search, Filter, Lock, Unlock, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
const MentorDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [mentorData, setMentorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditingStudentModal, setIsEditingStudentModal] = useState(false);

  // Quick Assessment State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentStudent, setAssessmentStudent] = useState(null);
  const [assessmentScores, setAssessmentScores] = useState({
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0
  });

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [studentSort, setStudentSort] = useState('desc');
  const fetchMentorDetails = async () => {
    try {
      const [detailsRes, monitoringRes] = await Promise.all([api.get(`/mentor-head/mentor/${id}/details`), api.get(`/mentor-head/mentors/${id}/monitoring`)]);
      if (detailsRes.data.success && monitoringRes.data.success) {
        setMentorData({
          ...detailsRes.data.data,
          monitoring: monitoringRes.data.data
        });
      }
    } catch (error) {
      console.error('Error details:', error);
      const msg = error.response?.data?.message || "Failed to fetch mentor details";
      const detail = error.response?.data?.error || "";
      toast.error(`${msg}: ${detail}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (id) fetchMentorDetails();
  }, [id]);
  const enrichedStudents = useMemo(() => {
    if (!mentorData) return [];
    const {
      assignedStudents,
      logs,
      facultyLogs
    } = mentorData;
    return assignedStudents.map(student => {
      const studentLogs = logs.filter(l => l.student_id === student.id);
      const studentFacultyLogs = facultyLogs.filter(l => l.student_id === student.id);
      const lastLog = studentLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return {
        ...student,
        lastInteractionDate: lastLog ? lastLog.date : null,
        totalInteractions: studentLogs.length,
        verificationCount: studentFacultyLogs.length
      };
    });
  }, [mentorData]);
  const filteredStudents = useMemo(() => {
    let result = enrichedStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.faculty_name?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesFilter = studentFilter === 'all' || s.onboarding_status === studentFilter;
      return matchesSearch && matchesFilter;
    });
    return result.sort((a, b) => {
      if (studentSort === 'desc') return b.id - a.id;
      if (studentSort === 'asc') return a.id - b.id;
      return 0;
    });
  }, [enrichedStudents, studentSearch, studentFilter, studentSort]);
  const handleEditStudent = student => {
    setEditingStudent({
      ...student
    });
    setIsEditingStudentModal(false);
    setIsEditModalOpen(true);
  };
  const handleOpenAssessment = student => {
    setAssessmentStudent(student);
    setAssessmentScores({
      q1: 0,
      q2: 0,
      q3: 0,
      q4: 0,
      q5: 0
    });
    setIsAssessmentModalOpen(true);
  };
  const calculateAssessmentScore = () => {
    return Object.values(assessmentScores).reduce((a, b) => a + b, 0);
  };
  const getAssessmentLevel = score => {
    if (score >= 5 && score <= 12) return 'Level 1';
    if (score >= 13 && score <= 19) return 'Level 2';
    if (score >= 20 && score <= 25) return 'Level 3';
    return 'Pending';
  };
  const handleSubmitAssessment = async () => {
    const totalScore = calculateAssessmentScore();
    if (totalScore === 0) {
      toast.error('Please complete the assessment before submitting');
      return;
    }
    const level = getAssessmentLevel(totalScore);
    try {
      toast.success(`Assessment submitted! Score: ${totalScore} (${level})`);
      setIsAssessmentModalOpen(false);
    } catch (error) {
      toast.error('Failed to submit assessment');
    }
  };
  const handleUpdateStudent = async () => {
    try {
      const res = await api.put(`/mentor-head/students/${editingStudent.id}`, editingStudent);
      if (res.data.success) {
        toast.success('Student details updated');
        setIsEditModalOpen(false);
        fetchMentorDetails(); // Refresh
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };
  const handleDeleteStudent = async (studentId, studentName) => {
    premiumConfirm(async () => {
      try {
        const res = await api.delete(`/mentor-head/students/${studentId}`);
        if (res.data.success) {
          toast.success('Student removed');
          fetchMentorDetails(); // Refresh
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }, {
      name: studentName,
      title: 'Delete Student Record',
      message: `Are you sure you want to permanently delete student ${studentName}? This action will remove all their data from the database forever and cannot be undone.`,
      type: 'danger'
    });
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-screen gap-4">
 <div className="relative">
 <div className="w-16 h-16 border-4 border-[#008080] border-t-[#008080] rounded-full animate-spin"></div>
 <Activity className="absolute inset-0 m-auto text-[#008080] animate-pulse" size={20} />
 </div>
 <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest animate-pulse">Syncing Dashboard...</p>
 </div>;
  }
  if (!mentorData) {
    return <div className="flex flex-col items-center justify-center h-screen gap-6">
 <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-xl shadow-rose-100">
 <AlertCircle size={48} />
 </div>
 <div className="text-center">
 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mentor Not Found</h2>
 <p className="text-slate-500 font-bold mt-2">The record you are looking for does not exist or has been removed.</p>
 </div>
 <button onClick={() => navigate(-1)} className="px-4 md:px-8 py-3 bg-[#008080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#008080]/30 hover:scale-105 transition-transform">
 Return to Directory
 </button>
 </div>;
  }
  const {
    profile,
    logs,
    facultyLogs,
    monitoring
  } = mentorData;
  const totalStudentsCount = monitoring?.assignedStudents?.length || 0;
  const connectedToday = monitoring?.todayConnectionCount || 0;
  const progressPercent = totalStudentsCount > 0 ? connectedToday / totalStudentsCount * 100 : 0;
  return <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
 {/* Header Navigation */}
 <div className="flex items-center justify-between px-4">
 <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-600 hover:text-[#008080] transition-all font-bold uppercase tracking-widest text-[10px]">
 <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-[#008080]/10 group-hover:border-[#008080] transition-all">
 <ArrowLeft size={14} />
 </div>
 Back to List
 </button>
 <div className="flex items-center gap-2 px-5 py-2.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#008080]/30">
 <User size={14} className="opacity-70" />
 Mentor Profile
 </div>
 </div>

 {/* SECTION 1: PROFILE HEADER + ACTIVITY SCORE */}
 <div className="flex flex-col xl:flex-row gap-8">
 {/* Profile Card */}
 <div className="flex-grow bg-white p-5 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#008080]/50 to-purple-50/50 rounded-full -mr-40 -mt-40 blur-3xl opacity-60"></div>

 <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
 <div className="relative group">
 <div className="absolute inset-0 bg-[#008080] rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
 <div className="w-40 h-40 bg-gradient-to-br from-[#008080] via-[#008080] to-purple-700 rounded-[2.5rem] flex items-center justify-center text-white text-3xl md:text-5xl font-black shadow-2xl relative z-10">
 {profile.name.charAt(0)}
 </div>
 </div>

 <div className="text-center md:text-left">
 <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
 <div className={`w-2 h-2 rounded-full ${profile.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{profile.status} Member</span>
 </div>
 <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
 {profile.name}
 </h1>

 <div className="flex flex-wrap justify-center md:justify-start gap-3">
 <div className="flex items-center gap-3 text-slate-600 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm hover:border-[#008080] transition-colors">
 <Phone size={14} className="text-[#008080]" />
 <span className="text-xs font-bold font-mono tracking-wider">{profile.phone_number || 'N/A'}</span>
 </div>
 <div className="flex items-center gap-3 text-slate-600 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm hover:border-[#008080] transition-colors">
 <MapPin size={14} className="text-[#008080]" />
 <span className="text-xs font-bold uppercase tracking-widest">{profile.place || 'N/A'}</span>
 </div>
 <div className="flex items-center gap-3 text-slate-600 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm hover:border-[#008080] transition-colors">
 <Calendar size={14} className="text-[#008080]" />
 <span className="text-xs font-bold uppercase tracking-widest">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Activity Score Card */}
 <div className="w-full xl:w-[450px] bg-[#008080] p-5 md:p-10 rounded-[3.5rem] text-white shadow-2xl shadow-[#008080]/10 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-48 h-48 bg-[#008080]/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

 <div className="relative z-10 space-y-10">
 <div className="flex justify-between items-start">
 <div className="space-y-1">
 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">Real-time Metrics</p>
 <h3 className="text-2xl font-black text-white">Activity Score</h3>
 </div>
 <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md">
 <Activity size={20} className="text-[#008080]" />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-8">
 <div>
 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Total Connections</p>
 <div className="flex items-baseline gap-1">
 <span className="text-2xl md:text-4xl font-black text-[#008080]">{monitoring?.monthlyConnections || 0}</span>
 <span className="text-[10px] font-bold text-slate-600 uppercase">/ Month</span>
 </div>
 </div>
 <div className="text-right">
 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Daily Goal</p>
 <div className="flex items-baseline justify-end gap-1">
 <span className="text-2xl md:text-4xl font-black text-white">{connectedToday}</span>
 <span className="text-xl font-bold text-slate-600">/ {totalStudentsCount}</span>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex justify-between items-end">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Marking Progress</span>
 <span className="text-lg font-black text-[#008080]">{progressPercent.toFixed(0)}%</span>
 </div>
 <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
 <div className="h-full bg-gradient-to-r from-emerald-400 via-[#008080] to-purple-600 transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.3)]" style={{
                width: `${progressPercent}%`
              }}></div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* SECTION 2: KPI SUMMARY ROW */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {[{
        label: 'Total Students',
        value: totalStudentsCount,
        icon: Users,
        color: 'text-[#008080]',
        bg: 'bg-[#008080]/10',
        unit: 'Members'
      }, {
        label: 'Connected Today',
        value: connectedToday,
        icon: Activity,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        unit: 'Sessions'
      }, {
        label: 'Total Interactions',
        value: logs.length,
        icon: GraduationCap,
        color: 'text-[#008080]',
        bg: 'bg-[#008080]/10',
        unit: 'Logs'
      }, {
        label: 'Total Verifications',
        value: facultyLogs?.length || 0,
        icon: ShieldCheck,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        unit: 'Checks'
      }].map((kpi, idx) => <div key={idx} className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
 <div className="flex items-center justify-between mb-6">
 <div className={`w-14 h-14 ${kpi.bg} rounded-2xl flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
 <kpi.icon size={26} />
 </div>
 <ChevronRight size={18} className="text-slate-200 group-hover:text-[#008080] transition-colors" />
 </div>
 <div className="flex justify-between items-baseline mb-1">
 <span className="text-2xl md:text-4xl font-black text-slate-900">{kpi.value}</span>
 <span className="text-[10px] font-black text-slate-300 uppercase">{kpi.unit}</span>
 </div>
 <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{kpi.label}</div>
 </div>)}
 </div>

 {/* SECTION 3: ASSIGNED STUDENTS & FACULTY (FULL WIDTH) */}
 <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
 <div className="p-5 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-50/20">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#008080] shadow-xl shadow-slate-200/50">
 <GraduationCap size={32} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Assigned Students & Faculty</h3>
 <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Academic Portfolio Management</p>
 </div>
 </div>

 <div className="flex items-center gap-4 w-full md:w-auto">
 <div className="relative flex-grow md:flex-grow-0 md:min-w-full md:w-[350px]">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
 <input type="text" placeholder="Search by student or faculty identity..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold focus:shadow-2xl focus:shadow-[#008080] focus:border-[#008080] transition-all outline-none" />
 </div>
 <div className="relative">
 <Filter size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#008080]" />
 <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="bg-white border border-slate-200 text-[#008080] rounded-[1.5rem] py-4 pl-12 pr-10 text-[11px] font-black uppercase tracking-widest appearance-none focus:ring-4 focus:ring-[#008080] outline-none cursor-pointer">
 <option value="all">All Status</option>
 <option value="pending">Onboarding</option>
 <option value="completed">Active</option>
 </select>
 </div>
 <div className="relative">
 <Clock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#008080]" />
 <select value={studentSort} onChange={e => setStudentSort(e.target.value)} className="bg-white border border-slate-200 text-[#008080] rounded-[1.5rem] py-4 pl-12 pr-10 text-[11px] font-black uppercase tracking-widest appearance-none focus:ring-4 focus:ring-[#008080] outline-none cursor-pointer">
 <option value="desc">Newest First</option>
 <option value="asc">Oldest First</option>
 </select>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-slate-50/50">
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Student Identity</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Assigned Faculty</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Last Interaction</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Sessions</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Verifications</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Status</th>
 <th className="px-5 md:px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredStudents.length > 0 ? filteredStudents.map((s, index) => <tr key={s.id} className="hover:bg-[#008080]/10/20 transition-all group"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="px-5 md:px-10 py-4 md:py-8">
 <div className="flex flex-col">
 <span className="text-base font-black text-slate-900 group-hover:text-[#008080] transition-colors">{s.name}</span>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{s.grade} • {s.course}</span>
 {s.is_shifted && <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded text-[8px] font-black uppercase tracking-widest border border-rose-100">Shifted from {s.shifted_from}</span>}
 </div>
 </div>
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8">
 <div className="flex items-center gap-3">
 <div className={`w-2.5 h-2.5 rounded-full ${s.faculty_name === 'Not Assigned' ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'}`}></div>
 <span className={`text-sm font-black ${s.faculty_name === 'Not Assigned' ? 'text-rose-500' : 'text-slate-600'}`}>
 {s.faculty_name}
 </span>
 </div>
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8 text-center">
 {s.lastInteractionDate ? <div className="flex flex-col items-center">
 <span className="text-xs font-black text-slate-700">{new Date(s.lastInteractionDate).toLocaleDateString()}</span>
 <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Chronological</span>
 </div> : <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ">No Data</span>}
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8 text-center">
 <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#008080]/10 text-[#008080] text-xs font-black border border-[#008080] shadow-sm">
 {s.totalInteractions}
 </div>
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8 text-center">
 <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 text-xs font-black border border-purple-100 shadow-sm">
 {s.verificationCount}
 </div>
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8">
 <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.onboarding_status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
 {s.onboarding_status === 'completed' ? 'Active' : 'New Student'}
 </span>
 </td>
 <td className="px-5 md:px-10 py-4 md:py-8 text-right">
 <div className="flex items-center justify-end gap-3">
 <button onClick={() => handleOpenAssessment(s)} className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm flex items-center gap-2" title="Quick Assessment">
 <ClipboardList size={16} />
 <span className="text-[10px] font-black uppercase tracking-widest">Assess</span>
 </button>
 <button onClick={() => handleEditStudent(s)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[#008080] hover:bg-[#008080]/10 transition-all shadow-sm" title="Edit Student">
 <Edit2 size={16} />
 </button>
 <button onClick={() => handleDeleteStudent(s.id, s.name)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-rose-600 hover:bg-rose-50 transition-all shadow-sm" title="Delete Student">
 <Trash2 size={16} />
 </button>
 </div>
 </td>
 </tr>) : <tr>
 <td colSpan="7" className="px-5 md:px-10 py-24 text-center">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-inner">
 <Search size={40} />
 </div>
 <h4 className="text-xl font-black text-slate-900 tracking-tight">Data Not Found</h4>
 <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Try adjusting your search or filters</p>
 </td>
 </tr>}
 </tbody>
 </table>
 </div>
 </div>

 {/* Student Edit Modal */}
 {isEditModalOpen && editingStudent && <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
 <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-white/20 max-h-[90vh] overflow-y-auto">
 <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
 <div className="flex items-center gap-4">
 <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 ">
 <Edit2 size={20} className="text-[#008080]" /> Edit Student Registry
 </h2>
 <button type="button" onClick={() => setIsEditingStudentModal(prev => !prev)} className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${isEditingStudentModal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'}`}>
 {isEditingStudentModal ? <><Unlock size={12} /> Editing</> : <><Lock size={12} /> Unlock</>}
 </button>
 </div>
 <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-600 hover:text-slate-600 hover:shadow-md transition-all">
 <X size={20} />
 </button>
 </div>
 <div className={`p-4 md:p-8 space-y-6 transition-opacity duration-300 ${!isEditingStudentModal ? 'opacity-60 pointer-events-none' : ''}`}>
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Student Name</label>
 <input type="text" value={editingStudent.name} onChange={e => setEditingStudent(prev => ({
                ...prev,
                name: e.target.value
              }))} disabled={!isEditingStudentModal} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all" />
 </div>
 <div>
 <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Grade / Level</label>
 <input type="text" value={editingStudent.grade} onChange={e => setEditingStudent(prev => ({
                ...prev,
                grade: e.target.value
              }))} disabled={!isEditingStudentModal} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Email Address</label>
 <input type="email" value={editingStudent.email} onChange={e => setEditingStudent(prev => ({
                ...prev,
                email: e.target.value
              }))} disabled={!isEditingStudentModal} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all" />
 </div>
 <div>
 <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
 <input type="text" value={editingStudent.phone_number} onChange={e => setEditingStudent(prev => ({
                ...prev,
                phone_number: e.target.value
              }))} disabled={!isEditingStudentModal} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all" />
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Course / Subject</label>
 <input type="text" value={editingStudent.course} onChange={e => setEditingStudent(prev => ({
              ...prev,
              course: e.target.value
            }))} disabled={!isEditingStudentModal} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all" />
 </div>
 </div>
 <div className={`px-4 md:px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 transition-opacity duration-300 ${!isEditingStudentModal ? 'opacity-60 pointer-events-none' : ''}`}>
 <button onClick={() => setIsEditModalOpen(false)} className="px-4 md:px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-all">
 Discard
 </button>
 <button onClick={handleUpdateStudent} className="px-4 md:px-8 py-3.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#008080]/30 hover:bg-[#008080] hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2">
 <Save size={16} /> Secure Updates
 </button>
 </div>
 </div>
 </div>}

 {/* Quick Assessment Modal */}
 {isAssessmentModalOpen && assessmentStudent && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
     <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 border border-slate-100 flex flex-col max-h-[90vh]">
       
       {/* Header */}
       <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-[#005050] text-white shrink-0">
         <div className="flex flex-col">
           <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
             <ClipboardList size={24} className="text-emerald-400" />
             Quick Assessment
           </h2>
           <p className="text-xs font-bold text-emerald-100 mt-1 uppercase tracking-widest">
             {assessmentStudent.name} • First 2 Sessions
           </p>
         </div>
         <button onClick={() => setIsAssessmentModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all">
           <X size={20} />
         </button>
       </div>

       {/* Content */}
       <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex-grow bg-slate-50">
         <div className="mb-6">
           <p className="text-slate-600 font-bold text-sm">Score each area 1-5. Total score determines level.</p>
         </div>
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_120px_160px] bg-[#005050] text-white">
              <div className="p-4 text-sm font-bold border-b border-[#006060]">Assessment Area</div>
              <div className="p-4 text-sm font-bold border-b border-[#006060]">1 — Poor</div>
              <div className="p-4 text-sm font-bold border-b border-[#006060]">3 — Average</div>
              <div className="p-4 text-sm font-bold border-b border-[#006060]">5 — Strong</div>
              <div className="p-4 text-sm font-bold border-b border-[#006060] text-center">Score (circle)</div>
            </div>
            <div className="divide-y divide-slate-100">
              {[{
                   id: 'q1',
                   area: 'How many days per week does the student study?',
                   l1: 'Never',
                   l3: '3 days',
                   l5: 'Daily'
                 }, {
                   id: 'q2',
                   area: 'How quickly does student complete homework?',
                   l1: 'Never does it',
                   l3: 'Sometimes',
                   l5: 'Always on time'
                 }, {
                   id: 'q3',
                   area: 'Can student explain what they learned?',
                   l1: 'Cannot explain',
                   l3: 'Partially',
                   l5: 'Clearly in own words'
                 }, {
                   id: 'q4',
                   area: 'Does student cover all subjects in the week?',
                   l1: '1-2 subjects only',
                   l3: 'Some balance',
                   l5: 'All subjects'
                 }, {
                   id: 'q5',
                   area: 'How motivated and confident is the student?',
                   l1: 'Avoids studying',
                   l3: 'Neutral',
                   l5: 'Confident and motivated'
                 }].map((row, index) => <div key={row.id} className={`flex flex-col md:grid md:grid-cols-[1fr_120px_120px_120px_160px] md:items-center p-5 md:p-0 ${index % 2 === 0 ? 'bg-emerald-50/30' : 'bg-white'}`}>
                    <div className="w-full p-0 md:p-4 text-sm font-bold text-slate-800 mb-4 md:mb-0 flex items-start gap-2">
                      <span className="text-emerald-600 font-black">{index + 1}.</span>
                      <span>{row.area}</span>
                    </div>
                    <div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l1}</div>
                    <div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l3}</div>
                    <div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l5}</div>
                    <div className="w-full p-0 md:p-4 flex justify-start md:justify-center pl-6 md:pl-0">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((val) => <button key={val} onClick={() => setAssessmentScores(prev => ({
                         ...prev,
                         [row.id]: val
                       }))} className={`shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${assessmentScores[row.id] === val ? 'bg-[#008080] text-white shadow-md ring-2 ring-[#008080] ring-offset-1 scale-110' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {val}
                          </button>)}
                      </div>
                    </div>
                  </div>)}
            </div>
          </div>
       </div>

       {/* Footer with Levels and Submit */}
       <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
         
         <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <div className={`px-4 py-3 rounded-xl flex items-center justify-center min-w-[140px] border transition-all ${calculateAssessmentScore() >= 5 && calculateAssessmentScore() <= 12 ? 'bg-rose-100 border-rose-200 shadow-sm scale-105' : 'bg-rose-50/50 border-rose-100/50 opacity-60'}`}>
             <span className="text-rose-800 font-bold text-xs uppercase tracking-widest">
               Score 5-12 &rarr; Level 1
             </span>
           </div>
           <div className={`px-4 py-3 rounded-xl flex items-center justify-center min-w-[140px] border transition-all ${calculateAssessmentScore() >= 13 && calculateAssessmentScore() <= 19 ? 'bg-amber-100 border-amber-200 shadow-sm scale-105' : 'bg-amber-50/50 border-amber-100/50 opacity-60'}`}>
             <span className="text-amber-800 font-bold text-xs uppercase tracking-widest">
               Score 13-19 &rarr; Level 2
             </span>
           </div>
           <div className={`px-4 py-3 rounded-xl flex items-center justify-center min-w-[140px] border transition-all ${calculateAssessmentScore() >= 20 && calculateAssessmentScore() <= 25 ? 'bg-emerald-100 border-emerald-200 shadow-sm scale-105' : 'bg-emerald-50/50 border-emerald-100/50 opacity-60'}`}>
             <span className="text-emerald-800 font-bold text-xs uppercase tracking-widest">
               Score 20-25 &rarr; Level 3
             </span>
           </div>
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
           <div className="text-right">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Score</p>
             <p className="text-2xl font-black text-slate-900">{calculateAssessmentScore()}</p>
           </div>
           <button onClick={handleSubmitAssessment} disabled={calculateAssessmentScore() < 5} className={`px-4 md:px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${calculateAssessmentScore() >= 5 ? 'bg-[#008080] text-white shadow-[#008080]/30 hover:bg-[#006060] hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
             <Save size={16} /> Submit Score
           </button>
         </div>

       </div>
     </div>
   </div>}

 </div>;
};
export default MentorDetails;