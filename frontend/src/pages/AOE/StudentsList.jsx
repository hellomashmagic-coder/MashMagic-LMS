import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Users, Search, Filter, Edit2, Trash2, X, Save, Pencil, GraduationCap, BookOpen, Clock, Activity, Calendar, Eye, ClipboardList, XCircle, UserMinus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StudentListFilterDropdown, { sortStudentsByOption } from '../../components/StudentListFilterDropdown';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import { premiumConfirm } from '../../utils/premiumConfirm';
import MobileCard from '../../components/common/MobileCard';
import { mockStudentHours } from '../../utils/mockStudentHours';

const StudentsList = ({
  role = 'academic_operation_executive'
}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterCourse, setFilterCourse] = useState('all');
  const [stats, setStats] = useState({
    totalEnrollment: 0,
    activeCourseCount: 0,
    activeMentorshipCount: 0,
    courseCompletedCount: 0,
    mentorshipCompletedCount: 0
  });
  const [sortBy, setSortBy] = useState('join_newest');
  const [mentors, setMentors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [filterMentor, setFilterMentor] = useState('all');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [activeTab, setActiveTab] = useState('enrolled_scholars'); // 'enrolled_scholars', 'active_plus', 'completed'
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // Assign Mentor Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const deferredAssignSearchTerm = useDeferredValue(assignSearchTerm);
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);

  // Quick Assessment State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentStudent, setAssessmentStudent] = useState(null);
  const [assessmentScores, setAssessmentScores] = useState({
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0
  });

  // View Assessment History State
  const [viewAssessmentHistoryStudent, setViewAssessmentHistoryStudent] = useState(null);

  // Edit Hours State
  const [editHoursModal, setEditHoursModal] = useState({
    show: false,
    student: null,
    total_hours: 0,
    total_lifetime_consumed_hours: 0
  });
  const [isUpdatingHours, setIsUpdatingHours] = useState(false);

  // Inline Edit Subject Hours State
  const [inlineEditSubject, setInlineEditSubject] = useState({ studentId: null, index: null, allocatedHours: '' });
  const [inlineAddSubject, setInlineAddSubject] = useState({ studentId: null, subject: '', allocatedHours: '' });
  const [isUpdatingInlineHours, setIsUpdatingInlineHours] = useState(false);
  const predefinedSubjects = ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science", "Economics", "Business Studies", "Accountancy", "History", "Geography"];

  const handleInlineSaveSubject = async (studentId, currentSubjects, newSubjectObj, editIndex = null) => {
    try {
      setIsUpdatingInlineHours(true);
      let updatedSubjects = [...(currentSubjects || [])];
      
      if (editIndex !== null) {
        updatedSubjects[editIndex] = { ...updatedSubjects[editIndex], allocated_hours: newSubjectObj.allocated_hours };
      } else {
        updatedSubjects.push({
          subject: newSubjectObj.subject,
          allocated_hours: newSubjectObj.allocated_hours,
          consumed_hours: 0,
          faculties: '' 
        });
      }

      const res = await api.put(`${apiPath}/students/${studentId}/subject-hours`, {
          subject_hours: updatedSubjects
      });

      if (res.data.success) {
        toast.success(editIndex !== null ? 'Subject hours updated!' : 'Subject added successfully!');
        setInlineEditSubject({ studentId: null, index: null, allocatedHours: '' });
        setInlineAddSubject({ studentId: null, subject: '', allocatedHours: '' });
        
        setStudents(prev => prev.map(s => {
          if (s.id === studentId) return { ...s, subject_hours: updatedSubjects };
          return s;
        }));
      } else {
        toast.error(res.data.message || 'Failed to update subject');
      }
    } catch (error) {
      toast.error('Server error updating subject');
    } finally {
      setIsUpdatingInlineHours(false);
    }
  };

  const handleInlineDeleteSubject = (student, idxToDelete) => {
    premiumConfirm(async () => {
      try {
        setIsUpdatingInlineHours(true);
        let updatedSubjects = [...(student.subject_hours || [])];
        updatedSubjects.splice(idxToDelete, 1);
        
        const res = await api.put(`${apiPath}/students/${student.id}/subject-hours`, {
            subject_hours: updatedSubjects
        });

        if (res.data.success) {
          toast.success('Subject deleted successfully!');
          setStudents(prev => prev.map(s => {
            if (s.id === student.id) return { ...s, subject_hours: updatedSubjects };
            return s;
          }));
        } else {
          toast.error(res.data.message || 'Failed to delete subject');
        }
      } catch (error) {
        toast.error('Server error deleting subject');
      } finally {
        setIsUpdatingInlineHours(false);
      }
    }, {
      name: `subject ${student.subject_hours[idxToDelete].subject}`,
      title: 'Delete Subject',
      message: `Are you sure you want to delete ${student.subject_hours[idxToDelete].subject} for this student?`,
      type: 'danger'
    });
  };

  // Base API path based on role
  const apiPath = role === 'mentor_head' ? '/mentor-head' : '/aoe';
  // Navigation base path (frontend routes)
  const navBasePath = role === 'mentor_head' ? '/mentor-head' : role === 'academic_head' ? '/academic-head' : '/aoe';
  const navigate = useNavigate();
  const coursesList = ["Mission X", "Classmate", "Crash 45", "Bright Bridge", "Magic Revision"];
  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, filterCourse, filterMentor, filterFaculty, activeTab]);

  useEffect(() => {
    fetchStudents();
  }, [role, page, deferredSearchTerm, sortBy, filterCourse, filterMentor, filterFaculty, activeTab]);
  const fetchDropdownData = async () => {
    try {
      const res = await api.get(`${apiPath}/dropdowns`);
      if (res.data.success) {
        setMentors(res.data.data.mentors || []);
        setFaculties(res.data.data.faculties || []);
      }
    } catch (error) {
      console.error("Dropdown fetch error:", error);
    }
  };
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit, sortBy, filterMode: activeTab, stats: 'true' });
      if (deferredSearchTerm) params.append('search', deferredSearchTerm);
      if (filterCourse !== 'all') params.append('course', filterCourse);
      if (filterMentor !== 'all') params.append('mentor_id', filterMentor);
      if (filterFaculty !== 'all') params.append('faculty_id', filterFaculty);
      
      const res = await api.get(`${apiPath}/students-all?${params.toString()}`);

      let fetchedStudents = res.data.data || [];

      setStudents(fetchedStudents);
      setTotalRecords(res.data.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      toast.error("Failed to load students directory");
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = student => {
    navigate(`${navBasePath}/edit-student/${student.id}`);
  };
  const handleView = student => {
    navigate(`${navBasePath}/students/${student.id}`);
  };
  const handleDelete = async studentParam => {
    const id = typeof studentParam === 'object' ? studentParam.id : studentParam;
    const name = typeof studentParam === 'object' ? studentParam.name : 'this student';
    premiumConfirm(async () => {
      try {
        const res = await api.delete(`${apiPath}/students/${id}`);
        if (res.data.success) {
          toast.success("Student record deleted");
          fetchStudents();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Delete failed");
      }
    }, {
      name: name,
      title: 'Delete Student Record',
      message: `Are you sure you want to permanently delete student ${name}? This action will remove all their data from the database forever and cannot be undone.`,
      type: 'danger'
    });
  };
  const handleAssignSubmit = async e => {
    e.preventDefault();
    if (!selectedMentorId) {
      toast.error('Please select a mentor');
      return;
    }
    setIsAssigning(true);
    try {
      const res = await api.put(`${apiPath}/students/${selectedStudentForAssign.id}/assign`, {
        mentorId: selectedMentorId
      });
      if (res.data.success) {
        toast.success('Mentor assigned successfully');
        setIsAssignModalOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mentor');
    } finally {
      setIsAssigning(false);
    }
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
  
  // Prevent body scrolling when assessment modal is open
  useEffect(() => {
    if (isAssessmentModalOpen || isAssignModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAssessmentModalOpen, isAssignModalOpen]);

  // Handle Escape key to close Assign Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAssignModalOpen) {
        setIsAssignModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAssignModalOpen]);
  const handleEditHoursSubmit = async e => {
    e.preventDefault();
    if (!editHoursModal.student) return;
    setIsUpdatingHours(true);
    try {
      // First update total hours
      const res = await api.put(`/academic-head/students/${editHoursModal.student.id}/hours`, {
        total_hours: editHoursModal.total_hours,
        total_lifetime_consumed_hours: editHoursModal.total_lifetime_consumed_hours
      });
      
      // Then update subject hours
      if (editHoursModal.subject_hours) {
        await api.put(`/academic-head/students/${editHoursModal.student.id}/subject-hours`, {
            subject_hours: editHoursModal.subject_hours
        });
      }

      if (res.data.success) {
        toast.success('Hours updated successfully!');
        fetchStudents();
        setEditHoursModal({
          show: false,
          student: null,
          total_hours: 0,
          total_lifetime_consumed_hours: 0,
          subject_hours: []
        });
      } else {
        toast.error(res.data.message || 'Failed to update hours');
      }
    } catch (error) {
      toast.error('Error updating hours');
    } finally {
      setIsUpdatingHours(false);
    }
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
    if (Object.values(assessmentScores).includes(0)) {
      toast.error('Please complete all questions before submitting');
      return;
    }
    const level = getAssessmentLevel(totalScore);
    
    try {
      setIsSubmittingAssessment(true);
      await api.put(`/mentor-head/students/${assessmentStudent.id}/assessment-level`, {
        level,
        score: totalScore
      });
      toast.success(`Assessment submitted! Score: ${totalScore} (${level})`);
      setIsAssessmentModalOpen(false);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to submit assessment');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };
  // Backend now handles search, filter, and sorting
  const filteredStudents = students;
  if (loading) return <div className="p-20 text-center font-black text-slate-600 animate-pulse">SYNCING STUDENT RECORDS...</div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
			{/* Header */}
			<div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
				<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
					<div className="max-w-md">
						<h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Student Directory</h2>
						<p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
							<GraduationCap size={14} className="text-[#008080]" />
							Comprehensive database of all enrolled students across all courses and mentors
						</p>
					</div>

					<div className="relative group w-full lg:w-96">
						<Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
						<input type="text" placeholder="SEARCH BY NAME OR REG #..." className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase tracking-[0.1em] focus:ring-4 ring-[#008080]/10 w-full shadow-sm transition-all outline-none focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
					</div>
				</div>

				{/* Filters Row */}
				{/* Desktop layout (md+): unchanged flat flex-wrap */}
				<div className="hidden md:flex flex-wrap items-center gap-4 pt-6 border-t border-slate-50">
					<div className="flex items-center gap-2 bg-slate-100/50 px-4 py-2 rounded-xl">
						<Activity size={12} className="text-[#008080]" />
						<span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Quick Filters:</span>
					</div>

					<select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 ring-[#008080]/10 transition-all cursor-pointer shadow-sm hover:bg-white">
						<option value="all">All Courses</option>
						{coursesList.map(c => <option key={c} value={c}>{c}</option>)}
					</select>

					<div className="relative">
						<select value={filterMentor} onChange={e => setFilterMentor(e.target.value)} className="h-14 pl-6 pr-12 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all appearance-none cursor-pointer min-w-[160px] shadow-sm hover:bg-white">
							<option value="all">All Mentors</option>
							{mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
						</select>
						<Users size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
					</div>

					<div className="relative">
						<select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="h-14 pl-6 pr-12 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all appearance-none cursor-pointer min-w-[160px] shadow-sm hover:bg-white">
							<option value="all">All Faculties</option>
							{faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
						</select>
						<Activity size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
					</div>

					<div className="lg:ml-auto flex items-center gap-3">
						<StudentListFilterDropdown value={sortBy} onChange={setSortBy} />
                        <ExportButton 
                            data={filteredStudents}
                            filename="aoe_students"
                            dateField="created_at"
                            columns={[
                                { header: 'Reg #', accessor: 'registration_number' },
                                { header: 'Name', accessor: 'name' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone_number' },
                                { header: 'Course', accessor: 'course' },
                                { header: 'Grade', accessor: 'grade' },
                                { header: 'Mentor', accessor: 'mentor_name' },
                                { header: 'Faculty', accessor: 'faculty_names' },
                                { header: 'Total Hours', accessor: 'total_hours' },
                                { header: 'Consumed Hours', accessor: 'total_lifetime_consumed_hours' },
                                { header: 'Status', accessor: 'status' }
                            ]}
                        />
					</div>
				</div>

				{/* Mobile layout (<md): grid rows */}
				<div className="md:hidden space-y-3 pt-6 border-t border-slate-50">
					{/* Row 1: All Courses | All Mentors */}
					<div className="grid grid-cols-2 gap-3">
						<select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full min-h-[48px] px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 ring-[#008080]/10 transition-all cursor-pointer shadow-sm truncate">
							<option value="all">All Courses</option>
							{coursesList.map(c => <option key={c} value={c}>{c}</option>)}
						</select>

						<div className="relative">
							<select value={filterMentor} onChange={e => setFilterMentor(e.target.value)} className="w-full min-h-[48px] pl-3 pr-8 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all appearance-none cursor-pointer shadow-sm truncate">
								<option value="all">All Mentors</option>
								{mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
							</select>
							<Users size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
						</div>
					</div>

					{/* Row 2: All Faculties | Sort */}
					<div className="grid grid-cols-2 gap-3">
						<div className="relative">
							<select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="w-full min-h-[48px] pl-3 pr-8 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 ring-[#008080]/10 focus:border-[#008080] transition-all appearance-none cursor-pointer shadow-sm truncate">
								<option value="all">All Faculties</option>
								{faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
							</select>
							<Activity size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
						</div>

						<div className="w-full">
							<StudentListFilterDropdown value={sortBy} onChange={setSortBy} fullWidth />
						</div>
					</div>

					{/* Row 3: Export full width */}
					<div className="w-full">
                        <ExportButton 
                            data={filteredStudents}
                            filename="aoe_students"
                            dateField="created_at"
                            fullWidth
                            columns={[
                                { header: 'Reg #', accessor: 'registration_number' },
                                { header: 'Name', accessor: 'name' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone_number' },
                                { header: 'Course', accessor: 'course' },
                                { header: 'Grade', accessor: 'grade' },
                                { header: 'Mentor', accessor: 'mentor_name' },
                                { header: 'Faculty', accessor: 'faculty_names' },
                                { header: 'Total Hours', accessor: 'total_hours' },
                                { header: 'Consumed Hours', accessor: 'total_lifetime_consumed_hours' },
                                { header: 'Status', accessor: 'status' }
                            ]}
                        />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
				<button onClick={() => setActiveTab('enrolled_scholars')} className={`p-4 md:p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-2 transition-all ${activeTab === 'enrolled_scholars' ? 'bg-[#008080] border-[#008080] text-white scale-105 shadow-xl shadow-[#008080]/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1'}`}>
					<span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600 group-hover:text-[#008080]'}`}>Enrolled Scholars</span>
					<div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'enrolled_scholars' ? 'text-white' : 'text-slate-900'}`}>
						<span className="text-2xl md:text-4xl leading-none">{stats.totalEnrollment || 0}</span>
						<span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600'}`}>Total Population</span>
					</div>
				</button>

				<button onClick={() => setActiveTab('active_plus')} className={`p-4 md:p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-2 transition-all ${activeTab === 'active_plus' ? 'bg-[#008080] border-[#008080] text-white scale-105 shadow-xl shadow-[#008080]/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1'}`}>
					<span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'active_plus' ? 'text-white/80' : 'text-[#008080]'}`}>Active Plus</span>
					<div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'active_plus' ? 'text-white' : 'text-slate-900'}`}>
						<span className="text-2xl md:text-4xl leading-none">
                            {role === 'mentor_head' ? (stats.activeMentorshipCount || 0) : (stats.activeCourseCount || 0)}
                        </span>
						<div className={`flex items-center gap-1.5 mb-1 px-2 py-0.5 rounded-full ${activeTab === 'active_plus' ? 'bg-white/20' : 'bg-[#008080]/10'}`}>
							<div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'active_plus' ? 'bg-white' : 'bg-[#008080]'}`}></div>
							<span className={`text-[10px] uppercase tracking-widest ${activeTab === 'active_plus' ? 'text-white' : 'text-[#008080]'}`}>Live</span>
						</div>
					</div>
				</button>

                {(role === 'mentor_head' || role === 'academic_operation_executive' || role === 'aoe' || role === 'ssc' || role === 'academic_head') && <button onClick={() => setActiveTab('completed')} className={`p-4 md:p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-2 transition-all ${activeTab === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-xl shadow-emerald-500/20' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'}`}>
					<span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'completed' ? 'text-white/80' : 'text-emerald-600 hover:text-emerald-700'}`}>
                        {role === 'mentor_head' ? 'Mentorship Completed' : 'Course Completed'}
                    </span>
					<div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'completed' ? 'text-white' : 'text-slate-900'}`}>
						<span className="text-2xl md:text-4xl leading-none">
                            {role === 'mentor_head' ? (stats.mentorshipCompletedCount || 0) : (stats.courseCompletedCount || 0)}
                        </span>
						<span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'completed' ? 'text-white/80' : 'text-slate-500'}`}>Total Achievers</span>
					</div>
				</button>}
			</div>

			{/* Table */}
			<div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
				<div className="hidden md:block overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-100">
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest w-[80px]">No.</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Student Information</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Course & Grade</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Hours</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Mentor & Faculty</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Level</th>
								<th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right sticky right-0 bg-slate-50/90 backdrop-blur-sm z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-50">
							{filteredStudents.length > 0 ? filteredStudents.map((student, index) => <React.Fragment key={student.id}>
									<tr className="hover:bg-[#008080]/10/20 transition-all group">
										<td className="px-4 md:px-8 py-6 font-black text-slate-400 text-[12px]">{(page - 1) * limit + index + 1}</td>
										<td className="px-4 md:px-8 py-6">
											<div className="flex items-center gap-4">
												<div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-600 font-black shadow-inner group-hover:from-[#008080] group-hover:to-[#008080] group-hover:text-white transition-all transform group-hover:scale-110">
													{student.name.charAt(0)}
												</div>
												<div>
													<div className="flex items-center gap-2">
														<div className="text-sm font-black text-slate-900 group-hover:text-[#008080] transition-colors uppercase flex-shrink-0">{student.name}</div>

														
														{/* Student Badge System */}
														{role === 'mentor_head' && !student.mentor_id && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-widest whitespace-nowrap animate-pulse">
																NEW
															</span>}

														{student.badge === 'Gold' && <span title="Mentorship Plan" className="text-lg cursor-help">🥇</span>}
														{student.badge === 'Silver' && <span title="Tuition Plan" className="text-lg cursor-help">🥈</span>}
														{student.badge === 'Diamond' && <span title="Mentorship & Tuition Plan" className="text-lg cursor-help">💎</span>}

														{(role === 'mentor_head' ? student.mentorship_completed === 1 : student.course_completed === 1) && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${role === 'mentor_head' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
																<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
															{role === 'mentor_head' ? 'Mentorship Completed' : 'Course Completed'}
															</span>}
													</div>
													<div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
														Joined {new Date(student.created_at).toLocaleDateString()}
														{student.registration_number && <span className="ml-2 pl-2 border-l border-slate-200">Reg: <span className="text-slate-900 font-black">{student.registration_number}</span></span>}
													</div>
												</div>
											</div>
										</td>
										<td className="px-4 md:px-8 py-6">
											<div className="flex flex-col">
												<span className="text-xs font-black text-slate-700 uppercase tracking-widest">{student.course}</span>
												<span className="text-[10px] font-bold text-[#008080] uppercase mt-0.5">{student.grade}</span>
											</div>
										</td>
										<td className="px-4 md:px-8 py-6">
											<div className="flex flex-col gap-1">
												<div className="flex flex-col gap-0.5">
													<span className="text-[8px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
														Lifetime Hours: <span className="text-[#008080] font-black">{student.total_lifetime_consumed_hours || 0} / {student.total_hours || 0} hrs</span>
														{role === 'academic_head' && <button onClick={() => setEditHoursModal({
                          show: true,
                          student,
                          total_hours: student.total_hours || 0,
                          total_lifetime_consumed_hours: student.total_lifetime_consumed_hours || 0,
                          subject_hours: student.subject_hours ? JSON.parse(JSON.stringify(student.subject_hours)) : []
                        })} className="text-slate-400 hover:text-indigo-500 transition-colors ml-1" title="Edit Hours">
																<Pencil size={10} />
															</button>}
													</span>
												</div>
												{student.subject_hours && student.subject_hours.length > 0 && <div className="flex flex-col gap-1 mt-1 border-t border-slate-100 pt-1.5 w-full min-w-[120px]">
														{student.subject_hours.map((sh, idx) => <div key={idx} className="flex justify-between items-start text-[9px] font-black uppercase text-slate-500">
																<div className="flex flex-col gap-0.5 max-w-[100px]">
																	<span className="truncate text-slate-700">{sh.subject}</span>
																	{sh.faculties && <span className="text-[7px] text-[#008080] tracking-tighter truncate flex items-center gap-1">
																			<span className="w-1 h-1 rounded-full bg-[#008080]"></span> {sh.faculties}
																		</span>}
																</div>
																<span className="text-slate-700 ml-2 whitespace-nowrap">{sh.consumed_hours} / {sh.allocated_hours} Hrs</span>
															</div>)}
													</div>}
											</div>
										</td>
										<td className="px-4 md:px-8 py-6">
											<div className="space-y-2">
												<div className="flex items-center gap-2">
													<div className="w-1.5 h-1.5 rounded-full bg-[#008080]"></div>
													<span className="text-[10px] font-black text-slate-700 uppercase">Mentor: {student.mentor_name || 'N/A'}</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div>
													{student.faculty_name ? <button type="button" onClick={e => {
                        e.stopPropagation();
                        setExpandedStudentId(expandedStudentId === student.id ? null : student.id);
                      }} className="text-[10px] font-black text-[#008080] hover:text-[#006666] underline uppercase tracking-widest cursor-pointer text-left block">
															View Faculties ({student.faculty_name.split(',').length})
														</button> : <span className="text-[10px] font-black text-slate-700 uppercase">Faculty: N/A</span>}
												</div>
											</div>
										</td>
										<td className="px-4 md:px-8 py-6 text-center">
												<div className="flex flex-col items-center gap-1 group/score relative">
                                                <span 
                                                    onClick={() => setViewAssessmentHistoryStudent(student)}
                                                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm border cursor-pointer hover:shadow-md hover:scale-105 transition-all ${student.assessment_level === 'Level 1' ? 'bg-rose-50 text-rose-600 border-rose-200' : student.assessment_level === 'Level 2' ? 'bg-amber-50 text-amber-600 border-amber-200' : student.assessment_level === 'Level 3' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                                    {student.assessment_level || 'Unassessed'} {student.assessment_score ? `(${student.assessment_score})` : ''}
                                                </span>
                                                {/* Tooltip hint on hover */}
                                                <div className="absolute top-full mt-2 right-1/2 translate-x-1/2 hidden group-hover/score:block bg-slate-800 text-white p-2 rounded-lg shadow-xl z-50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                    Click to view details
                                                </div>
                                            </div>
										</td>
										<td className="px-4 md:px-8 py-6 text-right sticky right-0 bg-white/90 backdrop-blur-sm z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
											<div className="flex items-center justify-end gap-2">
												<button onClick={() => handleView(student)} className="p-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-400 hover:border-[#008080] hover:text-[#008080] transition-all shadow-sm" title="View Details">
													<Eye size={16} />
												</button>
												{role === 'mentor_head' && <>
														<button onClick={() => handleOpenAssessment(student)} className="p-2.5 bg-white border-2 border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm group/assess" title="Quick Assessment">
															<ClipboardList size={16} />
														</button>
														<button onClick={() => {
                        setSelectedStudentForAssign(student);
                        setSelectedMentorId(student.mentor_id || '');
                        setIsAssignModalOpen(true);
                      }} className="p-2.5 bg-white border-2 border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/assign" title="Assign Mentor">
															<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
														</button>
													</>}

												{(role === 'academic_operation_executive' || role === 'academic_head') && <>
														<button onClick={() => handleEdit(student)} className="p-2.5 bg-white border-2 border-[#008080]/40 rounded-xl text-[#008080] hover:bg-[#008080] hover:text-white transition-all shadow-sm group/edit" title="Edit Student">
															<Edit2 size={16} />
														</button>
														<button onClick={() => handleDelete(student)} className="p-2.5 bg-white border-2 border-rose-200 rounded-xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Delete Student">
															<Trash2 size={16} />
														</button>
													</>}
											</div>
										</td>
									</tr>
									{expandedStudentId === student.id && <tr className="bg-slate-50/80 border-b border-slate-100">
											<td colSpan="4" className="p-4 md:p-8">
												<div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
													<div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 pl-2">
														<h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
															<span className="w-2 h-2 rounded-full bg-[#008080]"></span> Assigned Faculties: {student.name.toUpperCase()}
														</h4>
														<button onClick={() => setExpandedStudentId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all">
															<span className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Close</span>
														</button>
													</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
														{student.faculty_name && student.faculty_name.split(',').map((f, i) => <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:bg-white hover:border-[#008080/30 transition-all group">
																<div className="w-8 h-8 bg-[#008080]/10 text-[#008080] rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 group-hover:bg-[#008080] group-hover:text-white transition-all">
																	{f.trim().charAt(0)}
																</div>
																<span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{f.trim()}</span>
															</div>)}
													</div>
												</div>
											</td>
										</tr>}
								</React.Fragment>) : <tr>
									<td colSpan="7" className="px-4 md:px-8 py-20 text-center">
										<p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">No students found</p>
									</td>
								</tr>}
						</tbody>
					</table>
				</div>

				<div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
					{filteredStudents.length > 0 ? filteredStudents.map((student) => {
						const primaryActions = [
							{ icon: <Eye size={14} />, label: 'View', onClick: (e) => { e.stopPropagation(); handleView(student); } }
						];

						const moreActions = [];
						
						if (role === 'mentor_head') {
							moreActions.push({ icon: <ClipboardList size={14} />, label: 'Assess', onClick: (e) => { e.stopPropagation(); handleOpenAssessment(student); } });
							moreActions.push({ icon: <Users size={14} />, label: 'Assign', onClick: (e) => {
								e.stopPropagation();
								setSelectedStudentForAssign(student);
								setSelectedMentorId(student.mentor_id || '');
								setIsAssignModalOpen(true);
							}});
						}
						
						if (role === 'academic_operation_executive' || role === 'academic_head') {
							moreActions.push({ icon: <Edit2 size={14} />, label: 'Edit', onClick: (e) => { e.stopPropagation(); handleEdit(student); } });
							moreActions.push({ icon: <Trash2 size={14} />, label: 'Delete', danger: true, onClick: (e) => { e.stopPropagation(); handleDelete(student); } });
						}

						const badges = [];
						if (role === 'mentor_head' && !student.mentor_id) {
							badges.push(<span key="new" className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-widest animate-pulse">NEW</span>);
						}
						if ((role === 'mentor_head' ? student.mentorship_completed === 1 : student.course_completed === 1)) {
							badges.push(<span key="completed" className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${role === 'mentor_head' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>Completed</span>);
						}

						return (
							<MobileCard
								key={student.id}
								isExpanded={expandedStudentId === student.id}
								onToggle={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
								avatar={
									<div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-black shadow-inner uppercase">
										{student.name.charAt(0)}
									</div>
								}
								title={
									<span className="flex items-center gap-1">
										{student.name}
										{student.badge === 'Gold' && '🥇'}
										{student.badge === 'Silver' && '🥈'}
										{student.badge === 'Diamond' && '💎'}
									</span>
								}
								subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase">Reg: {student.registration_number || 'PENDING'}</span>}
								badges={badges}
								metrics={[
									{ icon: <BookOpen size={12} />, value: `${student.course || 'N/A'}` },
									{ icon: <Clock size={12} />, value: `${student.total_lifetime_consumed_hours || 0}/${student.total_hours || 0}h` }
								]}
								expandedContent={
									<div className="space-y-4">
										<div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-3">
											<div>
												<span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mentor</span>
												<span className="text-xs font-bold text-slate-800">{student.mentor_name || 'N/A'}</span>
											</div>
											<div>
												<span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Grade</span>
												<span className="text-xs font-bold text-[#008080]">{student.grade || 'N/A'}</span>
											</div>
										</div>

										<div className="pt-2 border-t border-slate-100 mt-3">
											<div className="flex justify-between items-center mb-2">
												<span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Subject Hours</span>
												{role === 'academic_head' && inlineAddSubject.studentId !== student.id && (
													<button onClick={(e) => {
														e.stopPropagation();
														setInlineAddSubject({ studentId: student.id, subject: '', allocatedHours: '' });
													}} className="text-[9px] font-black text-[#008080] hover:text-[#006060] uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md transition-colors">
														+ Add Subject
													</button>
												)}
											</div>
											<div className="space-y-2">
												{student.subject_hours && student.subject_hours.map((sh, idx) => {
													const isEditing = inlineEditSubject.studentId === student.id && inlineEditSubject.index === idx;
													
													return (
														<div key={idx} className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100 gap-2 transition-all">
															<div className="flex justify-between items-start">
																<div className="flex flex-col flex-1 min-w-0 mr-2">
																	<span className="text-[10px] font-bold text-slate-700 uppercase truncate">{sh.subject}</span>
																	{sh.faculties && <span className="text-[8px] text-[#008080] uppercase truncate max-w-[120px]">{sh.faculties}</span>}
																</div>
																
																{!isEditing && (
																	<div className="flex items-center gap-2 shrink-0">
																		<span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{sh.consumed_hours}/{sh.allocated_hours}h</span>
																		{role === 'academic_head' && (
																			<div className="flex gap-1 sm:gap-2 border-l border-slate-200 pl-2 ml-1">
																				<button onClick={(e) => {
																					e.stopPropagation();
																					setInlineEditSubject({ studentId: student.id, index: idx, allocatedHours: sh.allocated_hours });
																				}} className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors" title="Edit Hours">
																					<Edit2 size={12} />
																				</button>
																				<button onClick={(e) => {
																					e.stopPropagation();
																					handleInlineDeleteSubject(student, idx);
																				}} className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Delete Subject">
																					<Trash2 size={12} />
																				</button>
																			</div>
																		)}
																	</div>
																)}
															</div>
															
															{isEditing && (
																<div className="flex items-center justify-between gap-2 mt-1 border-t border-slate-100 pt-2 animate-in slide-in-from-top-1">
																	<div className="flex items-center gap-2 flex-1">
																		<span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hrs:</span>
																		<input 
																			type="number" 
																			min="0"
																			value={inlineEditSubject.allocatedHours}
																			onChange={(e) => setInlineEditSubject({...inlineEditSubject, allocatedHours: e.target.value})}
																			className="w-16 px-2 py-1 text-[10px] font-bold border border-slate-200 rounded focus:border-[#008080] outline-none shadow-sm"
																			onClick={(e) => e.stopPropagation()}
																		/>
																	</div>
																	<div className="flex gap-1.5 shrink-0">
																		<button onClick={(e) => {
																			e.stopPropagation();
																			if (!inlineEditSubject.allocatedHours || inlineEditSubject.allocatedHours < 0) return toast.error('Invalid hours');
																			handleInlineSaveSubject(student.id, student.subject_hours, { allocated_hours: inlineEditSubject.allocatedHours }, idx);
																		}} disabled={isUpdatingInlineHours} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors shadow-sm">
																			<Check size={14} />
																		</button>
																		<button onClick={(e) => {
																			e.stopPropagation();
																			setInlineEditSubject({ studentId: null, index: null, allocatedHours: '' });
																		}} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors shadow-sm">
																			<X size={14} />
																		</button>
																	</div>
																</div>
															)}
														</div>
													);
												})}

												{inlineAddSubject.studentId === student.id && (
													<div className="flex flex-col bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 gap-3 mt-3 animate-in slide-in-from-top-2 shadow-sm">
														<div className="flex flex-col gap-1.5">
															<span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">New Subject Details</span>
															<select 
																value={inlineAddSubject.subject}
																onChange={(e) => setInlineAddSubject({...inlineAddSubject, subject: e.target.value})}
																className="w-full px-3 py-2 text-[10px] font-bold border border-indigo-200 rounded-lg focus:border-indigo-500 outline-none bg-white text-slate-700 shadow-inner"
																onClick={(e) => e.stopPropagation()}
															>
																<option value="">-- Select Subject --</option>
																{predefinedSubjects.map(sub => {
																	const isAssigned = student.subject_hours && student.subject_hours.some(sh => sh.subject === sub);
																	return (
																		<option key={sub} value={sub} disabled={isAssigned}>
																			{sub} {isAssigned ? '(Already Assigned)' : ''}
																		</option>
																	);
																})}
															</select>
														</div>
														<div className="flex items-center justify-between border-t border-indigo-100 pt-2">
															<div className="flex items-center gap-2">
																<span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Allocated:</span>
																<input 
																	type="number" 
																	min="0"
																	placeholder="0"
																	value={inlineAddSubject.allocatedHours}
																	onChange={(e) => setInlineAddSubject({...inlineAddSubject, allocatedHours: e.target.value})}
																	className="w-16 px-2 py-1.5 text-[10px] font-bold border border-indigo-200 rounded-lg focus:border-indigo-500 outline-none bg-white shadow-inner"
																	onClick={(e) => e.stopPropagation()}
																/>
															</div>
															<div className="flex gap-2">
                                                                <button onClick={(e) => {
																	e.stopPropagation();
																	setInlineAddSubject({ studentId: null, subject: '', allocatedHours: '' });
																}} className="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm">
																	Cancel
																</button>
																<button onClick={(e) => {
																	e.stopPropagation();
																	if (!inlineAddSubject.subject) return toast.error('Please select a subject');
																	if (!inlineAddSubject.allocatedHours || inlineAddSubject.allocatedHours < 0) return toast.error('Valid hours required');
																	handleInlineSaveSubject(student.id, student.subject_hours, { subject: inlineAddSubject.subject, allocated_hours: inlineAddSubject.allocatedHours });
																}} disabled={isUpdatingInlineHours} className="px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md transition-colors">
																	Save
																</button>
															</div>
														</div>
													</div>
												)}
												
												{(!student.subject_hours || student.subject_hours.length === 0) && inlineAddSubject.studentId !== student.id && (
													<div className="text-center py-4 bg-slate-50/80 border border-slate-100 border-dashed rounded-xl">
														<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">No subjects allocated</span>
                                                        {role === 'academic_head' && (
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInlineAddSubject({ studentId: student.id, subject: '', allocatedHours: '' });
                                                            }} className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest underline underline-offset-4">
                                                                Add First Subject
                                                            </button>
                                                        )}
													</div>
												)}
											</div>
										</div>

										<div className="pt-3 border-t border-slate-100 flex items-center justify-between">
											<span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assessment</span>
											<span 
												onClick={(e) => { e.stopPropagation(); setViewAssessmentHistoryStudent(student); }}
												className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border cursor-pointer hover:shadow-md transition-all ${student.assessment_level === 'Level 1' ? 'bg-rose-50 text-rose-600 border-rose-200' : student.assessment_level === 'Level 2' ? 'bg-amber-50 text-amber-600 border-amber-200' : student.assessment_level === 'Level 3' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
												{student.assessment_level || 'Unassessed'} {student.assessment_score ? `(${student.assessment_score})` : ''}
											</span>
										</div>
									</div>
								}
								primaryActions={primaryActions}
								moreActions={moreActions}
							/>
						);
					}) : (
						<div className="px-4 md:px-8 py-6 md:py-12 text-center bg-white rounded-2xl border border-slate-100">
							<p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">No students found</p>
						</div>
					)}
				</div>
                
                {/* Pagination */}
                {!loading && filteredStudents.length > 0 && (
                  <div className="mt-4 p-4 md:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(totalRecords / limit) || 1}
                      totalRecords={totalRecords}
                      onPageChange={setPage}
                    />
                  </div>
                )}
			</div>

			{/* Assign Mentor Modal */}
			{isAssignModalOpen && selectedStudentForAssign && (
				<div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white rounded-3xl sm:rounded-[2rem] w-[95vw] sm:w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
						
						{/* Sticky Header */}
						<div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 backdrop-blur-sm shrink-0 sticky top-0 z-20 rounded-t-3xl sm:rounded-t-[2rem]">
							<div className="flex flex-col overflow-hidden">
								<h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight truncate">Assign Mentor</h3>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">For {selectedStudentForAssign.name}</p>
							</div>
							<button onClick={() => setIsAssignModalOpen(false)} className="w-12 h-12 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
								<X size={16} />
							</button>
						</div>

						<form onSubmit={handleAssignSubmit} className="flex flex-col flex-grow overflow-hidden">
							{/* Scrollable Content */}
							<div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
								<div className="space-y-2 relative">
									<label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Select Mentor</label>
									<div className="w-full min-h-[48px] px-4 py-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors flex justify-between items-center" onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}>
										<span className="truncate pr-2">{selectedMentorId ? mentors.find(m => m.id === selectedMentorId)?.name : 'Choose a mentor...'}</span>
										<span className="text-slate-400 text-[10px] shrink-0">▼</span>
									</div>
									
									{isAssignDropdownOpen && (
										<div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden top-full left-0 max-h-[50vh] sm:max-h-64 flex flex-col">
											<div className="p-2 sm:p-3 border-b border-slate-100 bg-slate-50/90 backdrop-blur-sm sticky top-0 shrink-0">
												<div className="relative flex items-center">
													<Search size={16} className="absolute left-3 text-slate-400" />
													<input type="text" autoFocus placeholder="Search mentor name..." value={assignSearchTerm} onChange={e => setAssignSearchTerm(e.target.value)} className="w-full min-h-[48px] sm:min-h-[40px] pl-10 pr-3 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-[#008080] focus:ring-2 ring-[#008080]/20 bg-white" />
												</div>
											</div>
											<div className="overflow-y-auto custom-scrollbar flex-grow p-1.5 sm:p-2">
												{mentors.filter(m => m.name.toLowerCase().includes(deferredAssignSearchTerm.toLowerCase())).map(m => (
													<div key={m.id} onClick={() => {
														setSelectedMentorId(m.id);
														setIsAssignDropdownOpen(false);
														setAssignSearchTerm('');
													}} className={`min-h-[48px] sm:min-h-[40px] px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer rounded-xl transition-all flex items-center justify-between gap-3 border ${selectedMentorId === m.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>
														<span className="truncate">{m.name}</span>
														{selectedMentorId === m.id && (
															<div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
																<Check size={12} strokeWidth={3} />
															</div>
														)}
													</div>
												))}
												{mentors.filter(m => m.name.toLowerCase().includes(deferredAssignSearchTerm.toLowerCase())).length === 0 && (
													<div className="px-4 py-4 md:py-8 text-xs text-slate-400 text-center font-bold uppercase tracking-widest">No mentors found</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
							
							{/* Sticky Footer */}
							<div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 sticky bottom-0 z-20">
								<button type="button" onClick={() => setIsAssignModalOpen(false)} className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
									Cancel
								</button>
								<button type="submit" disabled={isAssigning || !selectedMentorId} className={`w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isAssigning && selectedMentorId ? 'bg-[#008080] text-white hover:bg-[#006666] shadow-lg shadow-[#008080]/20 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
									{isAssigning ? (
										<><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> Assigning...</>
									) : (
										<><Save size={14} className="shrink-0" /> Confirm</>
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* View Assessment History Modal */}
			{viewAssessmentHistoryStudent && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
					<div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
						{/* Header */}
						<div className="bg-[#008080] p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
							<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
							<div className="relative z-10">
								<h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
										<ClipboardList size={20} className="text-white" />
									</div>
									Assessment Details
								</h3>
								<p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-2 ml-1">
									{viewAssessmentHistoryStudent.name} • Quick Assessment Record
								</p>
							</div>
							<button onClick={() => setViewAssessmentHistoryStudent(null)} className="relative z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all shadow-sm border border-white/10">
								<X size={18} />
							</button>
						</div>

						<div className="p-6 sm:p-8 space-y-8 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
							
							{/* Current vs Previous Comparison */}
							{(() => {
								const currentScore = viewAssessmentHistoryStudent.assessment_score;
								const currentLevel = viewAssessmentHistoryStudent.assessment_level;
								let history = [];
								if (viewAssessmentHistoryStudent.assessment_history) {
									try {
										history = typeof viewAssessmentHistoryStudent.assessment_history === 'string' ? JSON.parse(viewAssessmentHistoryStudent.assessment_history) : viewAssessmentHistoryStudent.assessment_history;
										if (!Array.isArray(history)) history = [];
									} catch (e) {
										history = [];
									}
								}
								
								if (!currentLevel) {
									return (
										<div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
											<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
												<Activity size={24} className="text-slate-300" />
											</div>
											<h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Assessment Taken</h4>
											<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">This student has not been assessed yet.</p>
										</div>
									);
								}

								const allAssessments = [];
								if (viewAssessmentHistoryStudent.assessment_history) {
									try {
										const hist = typeof viewAssessmentHistoryStudent.assessment_history === 'string' ? JSON.parse(viewAssessmentHistoryStudent.assessment_history) : viewAssessmentHistoryStudent.assessment_history;
										if (Array.isArray(hist)) allAssessments.push(...hist);
									} catch (e) {
										// ignore invalid history
									}
								}
								// Add current as an attempt if it's not fully mirrored in history
								if (currentLevel) {
									allAssessments.push({
										level: currentLevel,
										score: currentScore,
										date: new Date().toISOString()
									});
								}

								const getBestScoreForLevel = (lvl) => {
									const attempts = allAssessments.filter(a => a.level === lvl);
									if (attempts.length === 0) return null;
									const withScore = attempts.filter(a => a.score != null);
									if (withScore.length > 0) return withScore[withScore.length - 1];
									return attempts[attempts.length - 1]; 
								};

								const levels = [
									{ name: 'Level 1', data: getBestScoreForLevel('Level 1'), styles: { text: 'text-rose-600', border: 'border-rose-200', gradient: 'from-rose-500/10' } },
									{ name: 'Level 2', data: getBestScoreForLevel('Level 2'), styles: { text: 'text-amber-600', border: 'border-amber-200', gradient: 'from-amber-500/10' } },
									{ name: 'Level 3', data: getBestScoreForLevel('Level 3'), styles: { text: 'text-emerald-600', border: 'border-emerald-200', gradient: 'from-emerald-500/10' } }
								];

								return (
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										{levels.map(lvl => (
											<div key={lvl.name} className={`bg-white p-6 rounded-3xl shadow-sm relative overflow-hidden transition-all ${lvl.data ? `border ${lvl.styles.border} shadow-md scale-[1.02]` : 'border border-slate-100 opacity-60'}`}>
												{lvl.data && <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${lvl.styles.gradient} to-transparent rounded-full -translate-y-1/2 translate-x-1/2`}></div>}
												<p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${lvl.data ? lvl.styles.text : 'text-slate-400'}`}>{lvl.name}</p>
												{lvl.data ? (
													<div>
														<div className="flex items-end gap-3 relative z-10">
															<span className="text-3xl md:text-5xl font-black text-slate-900 leading-none">{lvl.data.score || 'N/A'}</span>
															<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Points</span>
														</div>
														<p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">
															{lvl.data.date ? new Date(lvl.data.date).toLocaleDateString() : 'Recorded'}
														</p>
													</div>
												) : (
													<div className="flex flex-col h-full justify-center">
														<span className="text-2xl md:text-4xl font-black text-slate-200 leading-none mb-3">-</span>
														<p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Not Reached</p>
													</div>
												)}
											</div>
										))}
									</div>
								);
							})()}

							{/* Detailed Timeline */}
							{(() => {
								let history = [];
								if (viewAssessmentHistoryStudent.assessment_history) {
									try {
										history = typeof viewAssessmentHistoryStudent.assessment_history === 'string' ? JSON.parse(viewAssessmentHistoryStudent.assessment_history) : viewAssessmentHistoryStudent.assessment_history;
										if (!Array.isArray(history)) history = [];
									} catch (e) {
										history = [];
									}
								}

								if (!history || history.length === 0) return null;

								return (
									<div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
										<h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
											<Activity size={14} className="text-[#008080]" />
											Historical Progress
										</h4>
										<div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
											{[...history].reverse().map((h, i) => (
												<div key={i} className="relative pl-6">
													<div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${i === 0 ? 'bg-[#008080]' : 'bg-slate-300'}`}></div>
													<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
														<div>
															<p className="text-xs font-black text-slate-700 uppercase tracking-widest">{h.level} <span className="text-slate-400 font-bold ml-1">({h.score} points)</span></p>
															<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
														</div>
														{h.previous_score && (
															<div className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-flex self-start sm:self-auto">
																From: {h.previous_level} ({h.previous_score})
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								);
							})()}

						</div>
					</div>
				</div>
			)}

			{/* Quick Assessment Modal */}
			{isAssessmentModalOpen && assessmentStudent && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
					<div className="bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl w-[95vw] sm:w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 border border-slate-100 flex flex-col max-h-[90vh]">
						
						{/* Sticky Header */}
						<div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-[#005050] text-white shrink-0 sticky top-0 z-20">
							<div className="flex flex-col">
								<h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 sm:gap-3 tracking-tight">
									<ClipboardList size={20} className="text-emerald-400 sm:w-6 sm:h-6 shrink-0" />
									<span className="truncate">Quick Assessment</span>
								</h2>
								<p className="text-[10px] sm:text-xs font-bold text-emerald-100 mt-1 uppercase tracking-widest truncate">
									{assessmentStudent.name} • First 2 Sessions
								</p>
							</div>
							<button onClick={() => setIsAssessmentModalOpen(false)} className="w-12 h-12 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all">
								<X size={20} />
							</button>
						</div>

						{/* Content */}
						<div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-slate-50">
							<div className="mb-4 sm:mb-6">
								<p className="text-slate-600 font-bold text-xs sm:text-sm">Score each area 1-5. Total score determines level.</p>
							</div>

							<div className="bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border border-slate-200 overflow-hidden">
								<div className="hidden md:grid md:grid-cols-[1fr_120px_120px_120px_160px] bg-[#005050] text-white">
									<div className="p-4 text-sm font-bold border-b border-[#006060]">Assessment Area</div>
									<div className="p-4 text-sm font-bold border-b border-[#006060]">1 — Poor</div>
									<div className="p-4 text-sm font-bold border-b border-[#006060]">3 — Average</div>
									<div className="p-4 text-sm font-bold border-b border-[#006060]">5 — Strong</div>
									<div className="p-4 text-sm font-bold border-b border-[#006060] text-center">Score (circle)</div>
								</div>
								<div className="flex flex-col gap-4 sm:gap-0 sm:divide-y sm:divide-slate-100">
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
                }].map((row, index) => <div key={row.id} className={`flex flex-col md:grid md:grid-cols-[1fr_120px_120px_120px_160px] md:items-center p-5 sm:p-0 bg-white rounded-2xl sm:rounded-none shadow-sm sm:shadow-none border sm:border-0 border-slate-100 ${index % 2 === 0 ? 'sm:bg-emerald-50/30' : 'sm:bg-white'}`}>
												<div className="w-full text-sm font-bold text-slate-800 mb-4 md:mb-0 flex items-start gap-2 sm:p-4">
													<span className="text-emerald-600 font-black shrink-0">{index + 1}.</span> 
													<span>{row.area}</span>
												</div>
												
												{/* Desktop Legends */}
												<div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l1}</div>
												<div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l3}</div>
												<div className="hidden md:block p-4 text-[11px] italic text-slate-500 leading-tight">{row.l5}</div>
												
												{/* Mobile Legends */}
												<div className="md:hidden flex flex-col gap-1.5 mb-4 px-6">
													<div className="flex items-center justify-between text-[10px] text-slate-500 italic"><span className="font-bold">1</span> <span>{row.l1}</span></div>
													<div className="flex items-center justify-between text-[10px] text-slate-500 italic"><span className="font-bold">3</span> <span>{row.l3}</span></div>
													<div className="flex items-center justify-between text-[10px] text-slate-500 italic"><span className="font-bold">5</span> <span>{row.l5}</span></div>
												</div>

												<div className="w-full flex justify-center md:p-4">
													<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-1.5 w-full">
														{[1, 2, 3, 4, 5].map((val) => <button key={val} onClick={() => setAssessmentScores(prev => ({
                        ...prev,
                        [row.id]: val
                      }))} className={`w-12 h-12 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-sm font-bold transition-all shrink-0 ${assessmentScores[row.id] === val ? 'bg-[#008080] text-white shadow-md ring-2 ring-[#008080] ring-offset-2 sm:ring-offset-1' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
																{val}
															</button>)}
													</div>
												</div>
											</div>)}
								</div>
							</div>
						</div>

						{/* Sticky Footer */}
						<div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 shrink-0 z-20">
							
							<div className="flex flex-row flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto overflow-hidden">
								<div className={`flex-1 md:flex-none px-2 sm:px-4 py-2 sm:py-3 rounded-xl flex items-center justify-center min-w-[80px] sm:min-w-[140px] border transition-all ${calculateAssessmentScore() >= 5 && calculateAssessmentScore() <= 12 ? 'bg-rose-100 border-rose-200 shadow-sm md:scale-105' : 'bg-rose-50/50 border-rose-100/50 opacity-60'}`}>
									<span className="text-rose-800 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-center flex flex-col md:flex-row gap-0.5 md:gap-1">
										<span>Score 5-12</span><span className="hidden md:inline">&rarr;</span><span>Level 1</span>
									</span>
								</div>
								<div className={`flex-1 md:flex-none px-2 sm:px-4 py-2 sm:py-3 rounded-xl flex items-center justify-center min-w-[80px] sm:min-w-[140px] border transition-all ${calculateAssessmentScore() >= 13 && calculateAssessmentScore() <= 19 ? 'bg-amber-100 border-amber-200 shadow-sm md:scale-105' : 'bg-amber-50/50 border-amber-100/50 opacity-60'}`}>
									<span className="text-amber-800 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-center flex flex-col md:flex-row gap-0.5 md:gap-1">
										<span>Score 13-19</span><span className="hidden md:inline">&rarr;</span><span>Level 2</span>
									</span>
								</div>
								<div className={`flex-1 md:flex-none px-2 sm:px-4 py-2 sm:py-3 rounded-xl flex items-center justify-center min-w-[80px] sm:min-w-[140px] border transition-all ${calculateAssessmentScore() >= 20 && calculateAssessmentScore() <= 25 ? 'bg-emerald-100 border-emerald-200 shadow-sm md:scale-105' : 'bg-emerald-50/50 border-emerald-100/50 opacity-60'}`}>
									<span className="text-emerald-800 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-center flex flex-col md:flex-row gap-0.5 md:gap-1">
										<span>Score 20-25</span><span className="hidden md:inline">&rarr;</span><span>Level 3</span>
									</span>
								</div>
							</div>

							<div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
								<div className="text-left md:text-right shrink-0">
									<p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Score</p>
									<p className="text-2xl font-black text-slate-900">{calculateAssessmentScore()}</p>
								</div>
								<button onClick={handleSubmitAssessment} disabled={Object.values(assessmentScores).includes(0) || isSubmittingAssessment} className={`flex-1 md:flex-none min-h-[48px] px-6 sm:px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${!Object.values(assessmentScores).includes(0) && !isSubmittingAssessment ? 'bg-[#008080] text-white shadow-[#008080]/30 hover:bg-[#006060] hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
									{isSubmittingAssessment ? (
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
											<span>Submitting...</span>
										</div>
									) : (
										<>
											<Save size={16} className="shrink-0" /> 
											<span className="truncate">{Object.values(assessmentScores).includes(0) ? 'Complete All' : 'Submit Score'}</span>
										</>
									)}
								</button>
							</div>

						</div>
					</div>
				</div>}
			{/* Edit Hours Modal */}
			{editHoursModal.show && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
							<div>
								<h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
									<Clock className="text-indigo-500" size={18} /> Edit Hours
								</h2>
								<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
									{editHoursModal.student?.name}
								</p>
							</div>
							<button onClick={() => setEditHoursModal({
            show: false,
            student: null,
            total_hours: 0,
            total_lifetime_consumed_hours: 0
          })} className="text-slate-400 hover:text-rose-500 transition-colors">
								<XCircle size={20} />
							</button>
						</div>
						<form onSubmit={handleEditHoursSubmit} className="p-6 space-y-4">
							<div className="space-y-2">
								<label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Allocated Hours</label>
								<input type="number" step="0.01" value={editHoursModal.total_hours} onChange={e => setEditHoursModal({
              ...editHoursModal,
              total_hours: e.target.value
            })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" required />
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Lifetime Consumed</label>
								<input type="number" step="0.01" value={editHoursModal.total_lifetime_consumed_hours} onChange={e => setEditHoursModal({
              ...editHoursModal,
              total_lifetime_consumed_hours: e.target.value
            })} className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
							</div>

              {/* Subject Hours Editor */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Subject Specific Hours</span>
                  
                  {editHoursModal.subject_hours && editHoursModal.subject_hours.length > 0 && (
                      <div className="space-y-3">
                        {editHoursModal.subject_hours.map((sh, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 border border-slate-100 rounded-xl bg-slate-50">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-700">{sh.subject || sh.subject_name}</span>
                                    <button type="button" onClick={() => {
                                        const newSh = [...editHoursModal.subject_hours];
                                        newSh.splice(idx, 1);
                                        setEditHoursModal({ ...editHoursModal, subject_hours: newSh });
                                    }} className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase">
                                        Delete
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Allocated Hrs</label>
                                        <input type="number" step="0.01" value={sh.allocated_hours || 0} onChange={e => {
                                            const newSh = [...editHoursModal.subject_hours];
                                            newSh[idx].allocated_hours = parseFloat(e.target.value);
                                            setEditHoursModal({ ...editHoursModal, subject_hours: newSh });
                                        }} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Consumed Hrs</label>
                                        <input type="number" step="0.01" value={sh.historical_consumed_hours || sh.consumed_hours || 0} onChange={e => {
                                            const newSh = [...editHoursModal.subject_hours];
                                            newSh[idx].historical_consumed_hours = parseFloat(e.target.value);
                                            setEditHoursModal({ ...editHoursModal, subject_hours: newSh });
                                        }} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}
                      </div>
                  )}

                  {/* Add Subject Section */}
                  <div className="mt-4 flex gap-2">
                      <input 
                          type="text" 
                          placeholder="Type subject name to add..." 
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!e.target.value.trim()) return;
                                  const newSh = [...(editHoursModal.subject_hours || [])];
                                  newSh.push({
                                      subject_name: e.target.value.trim(),
                                      allocated_hours: 0,
                                      historical_consumed_hours: 0
                                  });
                                  setEditHoursModal({ ...editHoursModal, subject_hours: newSh });
                                  e.target.value = "";
                              }
                          }}
                      />
                      <button 
                          type="button"
                          className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                          onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling;
                              if (!input.value.trim()) return;
                              const newSh = [...(editHoursModal.subject_hours || [])];
                              newSh.push({
                                  subject_name: input.value.trim(),
                                  allocated_hours: 0,
                                  historical_consumed_hours: 0
                              });
                              setEditHoursModal({ ...editHoursModal, subject_hours: newSh });
                              input.value = "";
                          }}
                      >
                          Add
                      </button>
                  </div>
                </div>
              
							<div className="pt-2 flex justify-end gap-3">
								<button type="button" onClick={() => setEditHoursModal({
              show: false,
              student: null,
              total_hours: 0,
              total_lifetime_consumed_hours: 0
            })} className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
								<button type="submit" disabled={isUpdatingHours} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-colors disabled:opacity-50">
									{isUpdatingHours ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
						</form>
					</div>
				</div>}
		</div>;
};
export default StudentsList;