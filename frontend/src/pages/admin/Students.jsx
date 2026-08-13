import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { Eye, Edit2, Ban, Trash2, Filter, Download, Search, UserPlus, CheckCircle, Clock, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sortStudentsByOption } from '../../components/StudentListFilterDropdown';
import { mockStudentHours } from '../../utils/mockStudentHours';
import MobileStudentCard from '../../components/common/MobileStudentCard';
import Pagination from '../../components/common/Pagination';

const Students = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'oldest'
  const [filterMentor, setFilterMentor] = useState('all');
  const [filterFaculty, setFilterFaculty] = useState('all');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);
  const [mentorsList, setMentorsList] = useState([]);
  const [facultiesList, setFacultiesList] = useState([]);
  const [activeTab, setActiveTab] = useState('enrolled_scholars'); // 'enrolled_scholars', 'active_plus', 'completed', 'mentorship_completed'

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone_number: '',
    grade: '',
    subject: '',
    timetable: '',
    status: '',
    course_completed: 0,
    course: '',
    syllabus: '',
    school_name: '',
    preferred_language: '',
    country: '',
    admission_date: '',
    meeting_link: '',
    enrollment_type: '',
    nextInstallment: '',
    total_fees: '',
    total_hours: '',
    hour: '',
    mentorId: '',
    mentorName: ''
  });
  const [dailyHours, setDailyHours] = useState([]);
  const [mentorSearch, setMentorSearch] = useState('');
  const [showMentorDropdown, setShowMentorDropdown] = useState(false);
  useEffect(() => {
    fetchStudents();
    fetchMentors();
  }, [searchTerm, sortBy, activeTab, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, activeTab]);
  const fetchMentors = async () => {
    try {
      const res = await api.get('/admin/mentors');
      if (res.data.success) setMentorsList(res.data.data || []);
    } catch (e) {}
  };
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/students?search=${searchTerm}&sortBy=${sortBy}&activeTab=${activeTab}&page=${page}&limit=${limit}`);
      let realStudents = response.data.data;
      setTotalRecords(response.data.total || 0);

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
      setStudents(realStudents);
      setFilteredStudents(realStudents);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch students");
      setLoading(false);
    }
  };
  const handleSearch = query => {
    setSearchTerm(query);
  };
  const handleExport = async () => {
    try {
      const toastId = toast.loading('Fetching data for export...');
      const response = await api.get(`/admin/students?search=${searchTerm}&sortBy=${sortBy}&activeTab=${activeTab}&export=true`);
      let dataToExport = response.data.data;
      toast.dismiss(toastId);

      import('xlsx').then(XLSX => {
        const exportData = dataToExport.map(s => ({
          'Registration Number': s.registration_number || '',
          'Name': s.name || '',
          'Email': s.email || '',
          'Phone': s.phone_number || '',
          'Grade': s.grade || '',
          'Syllabus': s.syllabus || '',
          'Course': s.course || '',
          'Mentor': s.mentor || 'Not Assigned',
          'Faculty': s.faculty || 'Not Assigned',
          'Status': s.status || '',
          'Onboarding Status': s.onboarding_status || '',
          'Assessment Level': s.assessment_level || '',
          'Created At': s.created_at ? new Date(s.created_at).toLocaleDateString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      });
    } catch (e) {
      toast.error('Failed to export students');
    }
  };
  const handleView = student => {
    navigate(`/admin/students/${student.id}`);
  };
  const handleEdit = student => {
    setSelectedStudent(student);
    setMentorSearch('');
    setShowMentorDropdown(false);
    setEditFormData({
      id: student.id,
      name: student.name || '',
      email: student.email || '',
      phone_number: student.phone_number || '',
      grade: student.grade || '',
      subject: student.subject || '',
      course: student.course || '',
      syllabus: student.syllabus || '',
      school_name: student.school_name || '',
      preferred_language: student.preferred_language || '',
      country: student.country || '',
      admission_date: student.admission_date ? student.admission_date.split('T')[0] : '',
      meeting_link: student.meeting_link || '',
      enrollment_type: student.enrollment_type || '',
      nextInstallment: student.next_installment_date ? student.next_installment_date.split('T')[0] : '',
      course_completed: student.course_completed || 0,
      mentorship_completed: student.mentorship_completed || 0,
      status: student.status || 'active',
      timetable: student.timetable_summary || '',
      total_fees: student.total_fees || '',
      total_hours: student.total_hours || '',
      hour: student.hour || '',
      mentorId: student.mentor_id || '',
      mentorName: student.mentor || ''
    });
    setIsEditingModal(false);
    setIsEditModalOpen(true);
  };
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentStudent, setInstallmentStudent] = useState(null);
  const handleAddInstallmentClick = student => {
    setInstallmentStudent(student);
    setInstallmentAmount('');
    setIsInstallmentModalOpen(true);
  };
  const handleInstallmentSubmit = async e => {
    e.preventDefault();
    if (!installmentAmount || isNaN(installmentAmount) || installmentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      const res = await api.post(`/admin/students/${installmentStudent.id}/installments`, {
        amount: parseFloat(installmentAmount),
        notes: `Logged manually by ${user?.name || 'Admin'}`
      });
      if (res.data.success) {
        toast.success("Installment logged successfully");
        setIsInstallmentModalOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to log installment");
    }
  };
  const handleEditSubmit = async e => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/students/${editFormData.id}`, editFormData);
      if (res.data.success) {
        toast.success("Student updated successfully");
        setIsEditModalOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update student");
    }
  };
  const handleApprove = async student => {
    try {
      await api.put(`/admin/approve/${student.id}`, {
        role: 'student'
      });
      toast.success(`${student.name} approved successfully`);
      fetchStudents(); // Refresh list
    } catch (error) {
      toast.error("Failed to approve student");
    }
  };
  const handleBlock = async student => {
    premiumConfirm(async () => {
      try {
        await api.put(`/admin/block/${student.id}`, {
          role: 'student'
        });
        toast.success(`${student.name} blocked successfully`);
        fetchStudents();
      } catch (error) {
        toast.error("Failed to block student");
      }
    }, {
      name: student.name,
      title: 'Block Access',
      message: `Suspending ${student.name} will restrict their dashboard access. Continue?`,
      type: 'standard'
    });
  };
  const handleDelete = async student => {
    premiumConfirm(async () => {
      try {
        await api.delete(`/admin/delete/${student.id}?role=student`);
        toast.success(`${student.name} deleted successfully`);
        fetchStudents();
      } catch (error) {
        toast.error("Failed to delete student");
      }
    }, {
      name: student.name,
      title: 'Permanent Deletion',
      message: `Are you sure you want to permanently delete student ${student.name}? This action will remove all their data from the database forever and cannot be undone.`,
      type: 'danger'
    });
  };

  // ─── Fee Management ────────────────────────────────────
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeStudent, setFeeStudent] = useState(null);
  const [feeDetails, setFeeDetails] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    paid_hours: '',
    notes: ''
  });
  const calcPaidHours = (amount, totalFee, totalHours) => {
    if (!amount || !totalFee || !totalHours || totalFee <= 0 || totalHours <= 0) return '';
    const rate = parseFloat(totalFee) / parseFloat(totalHours);
    return (parseFloat(amount) / rate).toFixed(2);
  };
  const handleOpenFee = async student => {
    setFeeStudent(student);
    setIsFeeModalOpen(true);
    setFeeLoading(true);
    setShowAddInstallment(false);
    setNewInstallment({
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      paid_hours: '',
      notes: ''
    });
    try {
      const res = await api.get(`/admin/student-details/${student.id}`);
      if (res.data.success) setFeeDetails(res.data.data);
    } catch (e) {
      toast.error('Failed to load fee details');
    } finally {
      setFeeLoading(false);
    }
  };
  const handleSubmitInstallment = async e => {
    e.preventDefault();
    if (!newInstallment.amount || parseFloat(newInstallment.amount) <= 0) return toast.error('Enter valid amount');
    try {
      const paid_hours = newInstallment.paid_hours || calcPaidHours(newInstallment.amount, feeDetails?.total_fees, feeDetails?.total_hours);
      const res = await api.post(`/admin/students/${feeStudent.id}/installments`, {
        amount: parseFloat(newInstallment.amount),
        payment_date: newInstallment.payment_date,
        paid_hours: parseFloat(paid_hours) || 0,
        notes: newInstallment.notes || `Logged by Admin`
      });
      if (res.data.success) {
        toast.success('Installment added!');
        setShowAddInstallment(false);
        setNewInstallment({
          payment_date: new Date().toISOString().split('T')[0],
          amount: '',
          paid_hours: '',
          notes: ''
        });
        // Refresh fee details
        const refresh = await api.get(`/admin/student-details/${feeStudent.id}`);
        if (refresh.data.success) setFeeDetails(refresh.data.data);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add installment');
    }
  };
  const columns = [{
    header: 'No.',
    width: '60px',
    render: (row, {
      index
    }) => <span className="text-[12px] font-black text-slate-400">{index + 1}</span>
  }, {
    header: 'Student Name & ID',
    accessor: 'name',
    render: row => <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 tracking-tight">{row.name}</span>
            <div className="flex gap-1">
              {row.badge === 'Gold' && <span title="Mentorship Plan" className="cursor-help text-xs">🥇</span>}
              {row.badge === 'Silver' && <span title="Tuition Plan" className="cursor-help text-xs">🥈</span>}
              {row.badge === 'Diamond' && <span title="Mentorship & Tuition Plan" className="cursor-help text-xs">💎</span>}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {row.registration_number || '---'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{row.email}</span>
          </div>
          {row.course_completed === 1 && <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Course Completed
              </span>
            </div>}
          {row.mentorship_completed === 1 && <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-600 border border-teal-100 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Mentorship Completed
              </span>
            </div>}
        </div>
  }, {
    header: 'Academics & Fee',
    render: row => <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-black text-slate-700">{row.grade}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[120px]">{row.subject || '---'}</span>
          
          <div className="flex flex-col gap-1 mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between gap-2" title={`Consumed: ${row.consumed_hours || 0} | Paid: ${row.paid_hours || 0}`}>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${row.payment_alert_level === 'Critical' ? 'bg-rose-500 animate-pulse' : row.payment_alert_level === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                <span className={`text-[9px] font-black uppercase ${row.payment_alert_level === 'Critical' ? 'text-rose-600' : row.payment_alert_level === 'Warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {row.payment_alert_level || 'Safe'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Lifetime Hours: <span className="text-[#008080] font-black">{row.total_lifetime_consumed_hours || 0} / {row.total_hours || 0} hrs</span></span>
            </div>

            {row.subject_hours && row.subject_hours.length > 0 && <div className="flex flex-col gap-1 mt-1 border-t border-slate-200 pt-1.5 w-full">
                {row.subject_hours.map((sh, idx) => <div key={idx} className="flex justify-between items-start text-[8px] font-black uppercase text-slate-500">
                    <div className="flex flex-col gap-0.5 max-w-[100px]">
                      <span className="truncate text-slate-700">{sh.subject}</span>
                      {sh.faculties && <span className="text-[7px] text-[#008080] tracking-tighter truncate flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[#008080]"></span> {sh.faculties}
                        </span>}
                    </div>
                    <span className="text-slate-700 ml-1 whitespace-nowrap">{sh.consumed_hours} / {sh.allocated_hours} Hrs</span>
                  </div>)}
              </div>}

            {isSuperAdmin && <button onClick={e => {
          e.stopPropagation();
          handleAddInstallmentClick(row);
        }} className="mt-1 w-full py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 text-[8px] font-black uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Add Fee
              </button>}
          </div>
        </div>
  }, {
    header: 'Assigned Mentor & Faculty',
    render: (row, {
      isExpanded,
      onToggle
    }) => <div className="flex flex-col gap-1">
          <span className="text-[11px] font-black text-slate-700 truncate max-w-[120px]">
            {row.mentor || 'Not Assigned'}
          </span>
          {row.faculty ? <button type="button" onClick={e => {
        e.stopPropagation();
        onToggle();
      }} className="text-[10px] font-black text-[#008080] hover:text-[#006666] underline uppercase tracking-widest cursor-pointer text-left block">
              View Faculties ({String(row.faculty).split(',').length})
            </button> : <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[120px]">No Faculty</span>}
        </div>
  }, {
    header: 'Level',
    width: '120px',
    render: row => <span className={`inline-flex items-center justify-center min-w-[100px] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${row.assessment_level === 'Level 1' ? 'bg-rose-50 text-rose-600 border-rose-200' : row.assessment_level === 'Level 2' ? 'bg-amber-50 text-amber-600 border-amber-200' : row.assessment_level === 'Level 3' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {row.assessment_level || 'Unassessed'}
        </span>
  }, {
    header: 'Status',
    width: '120px',
    render: row => <span className={`inline-flex items-center justify-center min-w-[120px] px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-sm border transition-all ${row.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : row.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : row.status === 'inactive' ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          {row.status === 'active' ? 'Active' : row.status === 'inactive' ? 'Backup' : row.status === 'pending' ? 'Pending Approval' : row.status === 'left' ? 'Left' : row.status}
        </span>
  }];
  const processedStudents = useMemo(() => {
    let filtered = sortStudentsByOption(filteredStudents, sortBy);
    if (activeTab === 'mentorship_completed') {
      filtered = filtered.filter(s => s.mentorship_completed == 1);
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(s => s.course_completed == 1);
    }
    return filtered;
  }, [filteredStudents, sortBy, activeTab]);

  return <div className="flex flex-col gap-10 pb-10">
      <div className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Student Enrollment</h2>
          <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center md:justify-start gap-3 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#008080] animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.5)]"></span>
            Comprehensive list of all registered students
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="flex items-center gap-4 bg-slate-50/50 px-4 md:px-8 py-5 rounded-[24px] border border-slate-100/50 shadow-inner group">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none whitespace-nowrap">Sort By</span>
            <div className="w-px h-10 bg-slate-200"></div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-[0.1em] text-slate-800 outline-none focus:ring-0 cursor-pointer ">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <button onClick={() => setActiveTab('enrolled_scholars')} className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'enrolled_scholars' ? 'bg-[#008080] border-[#008080] text-white scale-105 shadow-xl shadow-[#008080]/20' : 'bg-white/70 backdrop-blur-md border-white/60 hover:bg-white hover:shadow-md'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600 group-hover:text-[#008080]'}`}>Total Enrollment</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'enrolled_scholars' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">{students.length}</span>
            <span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'enrolled_scholars' ? 'text-white/80' : 'text-slate-600'}`}>Active Members</span>
          </div>
        </button>
        
        <button onClick={() => setActiveTab('mentorship_completed')} className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'mentorship_completed' ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-xl shadow-emerald-500/20' : 'bg-white/70 backdrop-blur-md border-white/60 hover:bg-white hover:shadow-md'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'mentorship_completed' ? 'text-white/80' : 'text-emerald-600 group-hover:text-emerald-700'}`}>Mentorship Completed</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'mentorship_completed' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">{students.filter(s => s.mentorship_completed == 1).length}</span>
            <span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'mentorship_completed' ? 'text-white/80' : 'text-slate-600'}`}>Total</span>
          </div>
        </button>

        <button onClick={() => setActiveTab('completed')} className={`p-4 md:p-8 rounded-[35px] border shadow-sm flex flex-col gap-2 transition-all text-left ${activeTab === 'completed' ? 'bg-teal-600 border-teal-600 text-white scale-105 shadow-xl shadow-teal-500/20' : 'bg-white/70 backdrop-blur-md border-white/60 hover:bg-white hover:shadow-md'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'completed' ? 'text-white/80' : 'text-teal-600 group-hover:text-teal-700'}`}>Course Completed</span>
          <div className={`flex items-end gap-3 font-black tracking-tighter ${activeTab === 'completed' ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-2xl md:text-4xl leading-none">{students.filter(s => s.course_completed == 1).length}</span>
            <span className={`text-[10px] mb-1 uppercase tracking-widest ${activeTab === 'completed' ? 'text-white/80' : 'text-slate-600'}`}>Total</span>
          </div>
        </button>
      </div>

      <div className="hidden md:block">
      <DataTable columns={columns} data={processedStudents} loading={loading} onSearch={handleSearch} onExport={handleExport} onView={handleView} onEdit={isSuperAdmin ? handleEdit : undefined} onDelete={isSuperAdmin ? handleDelete : undefined} onBlock={isSuperAdmin ? handleBlock : undefined} 
      page={page} totalPages={Math.ceil(totalRecords / limit) || 1} totalRecords={totalRecords} onPageChange={setPage}
      extraActions={isSuperAdmin ? [student => <button key="fee" title="Fee Management" onClick={e => {
      e.stopPropagation();
      handleOpenFee(student);
    }} className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition-all">
            <span className="text-[10px] font-black">₹</span>
          </button>] : []} expandedRowId={expandedRowId} onToggleExpand={id => setExpandedRowId(expandedRowId === id ? null : id)} renderSubRow={(student, onClose) => <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 pl-2">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <span className="w-2 h-2 rounded-full bg-[#008080]"></span> Assigned Faculties: {student.name.toUpperCase()}
              </h4>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all">
                <span className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {student.faculty ? String(student.faculty).split(',').map((f, i) => <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:bg-white hover:border-[#008080]/30 transition-all group">
                  <div className="w-8 h-8 bg-[#008080]/10 text-[#008080] rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 group-hover:bg-[#008080] group-hover:text-white transition-all">
                    {f.trim().charAt(0)}
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{f.trim()}</span>
                </div>) : <span className="text-xs font-bold text-slate-400">No Faculty Assigned</span>}
            </div>
          </div>} searchPlaceholder="Search by name, email or reg #" />
      </div>

      <div className="md:hidden">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-sm animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0"></div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : processedStudents.length === 0 ? (
          <div className="py-20 text-center">
             <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Search size={32} className="text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold text-sm">No students found</p>
             <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {processedStudents.map(student => (
              <MobileStudentCard
                key={student.id}
                student={student}
                isExpanded={expandedRowId === student.id}
                onToggle={() => setExpandedRowId(expandedRowId === student.id ? null : student.id)}
                onEdit={isSuperAdmin ? handleEdit : undefined}
                onView={handleView}
                onDelete={isSuperAdmin ? handleDelete : undefined}
                onBlock={isSuperAdmin ? handleBlock : undefined}
                onAddFee={isSuperAdmin ? handleOpenFee : undefined}
              />
            ))}
            
            {/* Mobile Pagination */}
            {page && Math.ceil(totalRecords / limit) > 0 && (
              <div className="mt-4">
                <Pagination 
                  currentPage={page} 
                  totalPages={Math.ceil(totalRecords / limit) || 1} 
                  totalRecords={totalRecords} 
                  onPageChange={setPage} 
                />
              </div>
            )}
          </div>
        )}
      </div>

    {/* Edit Student Modal */}
 <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student Details" size="lg">
 <form onSubmit={handleEditSubmit} className="flex flex-col gap-0 relative">
   <div className="flex justify-end mb-4">
     <button type="button" onClick={() => setIsEditingModal(prev => !prev)} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isEditingModal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200'}`}>
       {isEditingModal ? <><Unlock size={14} /> Editing</> : <><Lock size={14} /> Unlock Fields</>}
     </button>
   </div>

   <div className={`transition-opacity duration-300 space-y-6 ${!isEditingModal ? 'opacity-60 pointer-events-none' : ''}`}>

     {/* Personal Info */}
     <div>
       <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Personal Info</h4>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.name} onChange={e => setEditFormData({
                  ...editFormData,
                  name: e.target.value
                })} disabled={!isEditingModal} required />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email</label>
           <input type="email" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.email} onChange={e => setEditFormData({
                  ...editFormData,
                  email: e.target.value
                })} disabled={!isEditingModal} />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.phone_number} onChange={e => setEditFormData({
                  ...editFormData,
                  phone_number: e.target.value
                })} disabled={!isEditingModal} />
         </div>
       </div>
     </div>

     {/* Academic Details */}
     <div className="pt-4 border-t border-slate-100">
       <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Academic Details</h4>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Grade</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.grade} onChange={e => setEditFormData({
                  ...editFormData,
                  grade: e.target.value
                })} disabled={!isEditingModal} required />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Subject</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.subject} onChange={e => setEditFormData({
                  ...editFormData,
                  subject: e.target.value
                })} disabled={!isEditingModal} />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course / Stream</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.course} onChange={e => setEditFormData({
                  ...editFormData,
                  course: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. Mission X" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Syllabus</label>
           <select className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 transition-all" value={editFormData.syllabus} onChange={e => setEditFormData({
                  ...editFormData,
                  syllabus: e.target.value
                })} disabled={!isEditingModal}>
             <option value="">Select Syllabus</option>
             {['CBSE', 'STATE', 'ICSE', 'IGCSE', 'IB'].map(s => <option key={s} value={s}>{s}</option>)}
           </select>
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">School / Institution</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.school_name} onChange={e => setEditFormData({
                  ...editFormData,
                  school_name: e.target.value
                })} disabled={!isEditingModal} placeholder="School name" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Preferred Language</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.preferred_language} onChange={e => setEditFormData({
                  ...editFormData,
                  preferred_language: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. English" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Country</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.country} onChange={e => setEditFormData({
                  ...editFormData,
                  country: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. India" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Admission Date</label>
           <input type="date" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 transition-all" value={editFormData.admission_date} onChange={e => setEditFormData({
                  ...editFormData,
                  admission_date: e.target.value
                })} disabled={!isEditingModal} />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Enrollment Type</label>
           <select className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 transition-all" value={editFormData.enrollment_type} onChange={e => setEditFormData({
                  ...editFormData,
                  enrollment_type: e.target.value
                })} disabled={!isEditingModal}>
             <option value="">Select Type</option>
             <option value="Mentorship">Mentorship Only 🥇</option>
             <option value="Tuition">Tuition Only 🥈</option>
             <option value="Mentorship and Tuition">Mentorship & Tuition 💎</option>
           </select>
         </div>
         <div className="col-span-1 sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Live Session Link</label>
           <input type="text" className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all" value={editFormData.meeting_link} onChange={e => setEditFormData({
                  ...editFormData,
                  meeting_link: e.target.value
                })} disabled={!isEditingModal} placeholder="https://meet.google.com/..." />
         </div>
         <div className="col-span-1 sm:col-span-2 md:col-span-3 flex flex-col gap-1.5 relative">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Assigned Mentor</label>
           <div className="relative">
             <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/30 transition-all pr-10" placeholder="Search mentor by name..." value={mentorSearch || editFormData.mentorName || ''} onChange={e => {
                    setMentorSearch(e.target.value);
                    setShowMentorDropdown(true);
                  }} onFocus={() => setShowMentorDropdown(true)} disabled={!isEditingModal} />
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▾</span>
           </div>
           {showMentorDropdown && isEditingModal && <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
               {mentorsList.filter(m => m.name?.toLowerCase().includes((mentorSearch || '').toLowerCase())).map(m => <button key={m.id} type="button" className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#008080]/5 hover:text-[#008080] transition-colors flex items-center gap-3" onClick={() => {
                    setEditFormData({
                      ...editFormData,
                      mentorId: m.id,
                      mentorName: m.name
                    });
                    setMentorSearch('');
                    setShowMentorDropdown(false);
                  }}>
                     <div className="w-7 h-7 rounded-xl bg-[#008080]/10 text-[#008080] flex items-center justify-center font-black text-xs shrink-0">{m.name?.charAt(0)}</div>
                     {m.name}
                   </button>)}
               {mentorsList.filter(m => m.name?.toLowerCase().includes((mentorSearch || '').toLowerCase())).length === 0 && <div className="px-4 py-3 text-sm text-slate-400 font-bold">No mentor found</div>}
             </div>}
         </div>
       </div>
     </div>

     {/* Status */}
     <div className="pt-4 border-t border-slate-100">
       <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Status</h4>
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Account Status</label>
           <select className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 transition-all" value={editFormData.status} onChange={e => setEditFormData({
                  ...editFormData,
                  status: e.target.value
                })} disabled={!isEditingModal}>
             <option value="active">Active</option>
             <option value="inactive">Backup</option>
             <option value="pending">Pending Approval</option>
             <option value="left">Left</option>
             <option value="rejected">Rejected</option>
           </select>
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Progress</label>
           <button type="button" onClick={() => setEditFormData({
                  ...editFormData,
                  course_completed: editFormData.course_completed === 1 ? 0 : 1
                })} disabled={!isEditingModal} className={`p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-3 ${editFormData.course_completed === 1 ? 'bg-teal-500 border-teal-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
             {editFormData.course_completed === 1 ? <><CheckCircle size={14} /> Completed</> : <><Clock size={14} /> In Progress</>}
           </button>
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mentorship Progress</label>
           <button type="button" onClick={() => setEditFormData({
                  ...editFormData,
                  mentorship_completed: editFormData.mentorship_completed === 1 ? 0 : 1
                })} disabled={!isEditingModal} className={`p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-3 ${editFormData.mentorship_completed === 1 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
             {editFormData.mentorship_completed === 1 ? <><CheckCircle size={14} /> Completed</> : <><Clock size={14} /> In Progress</>}
           </button>
         </div>
       </div>
       <div className="flex flex-col gap-1.5 mt-4">
         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Timetable Summary</label>
         <textarea className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]/20 transition-all min-h-[80px]" value={editFormData.timetable} onChange={e => setEditFormData({
                ...editFormData,
                timetable: e.target.value
              })} disabled={!isEditingModal} />
       </div>
     </div>

     {/* Fee Details Section */}
     <div className="pt-4 border-t border-amber-100 bg-amber-50/30 rounded-2xl p-4">
       <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Fee Details</h4>
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Next Installment</label>
           <input type="date" className="p-3.5 bg-white border border-amber-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/30 transition-all" value={editFormData.nextInstallment} onChange={e => setEditFormData({
                  ...editFormData,
                  nextInstallment: e.target.value
                })} disabled={!isEditingModal} />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Fee (₹)</label>
           <input type="number" className="p-3.5 bg-white border border-amber-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/30 transition-all" value={editFormData.total_fees} onChange={e => setEditFormData({
                  ...editFormData,
                  total_fees: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. 50000" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Hours</label>
           <input type="number" className="p-3.5 bg-white border border-amber-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/30 transition-all" value={editFormData.total_hours} onChange={e => setEditFormData({
                  ...editFormData,
                  total_hours: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. 100" />
         </div>
         <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Hours / Week</label>
           <input type="number" className="p-3.5 bg-white border border-amber-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/30 transition-all" value={editFormData.hour} onChange={e => setEditFormData({
                  ...editFormData,
                  hour: e.target.value
                })} disabled={!isEditingModal} placeholder="e.g. 5" />
         </div>
       </div>
     </div>

   </div>

   <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
     <button type="button" className="px-4 md:px-8 py-4 rounded-[18px] border border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
     <button type="submit" className="px-5 md:px-10 py-4 rounded-[18px] bg-gradient-to-br from-[#006666] to-[#008080] text-white text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-[#008080]/30 hover:-translate-y-1 transition-all shadow-md">Save Changes</button>
   </div>
 </form>
 </Modal>

 {/* Add Installment Modal */}
 <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title={`Add Installment for ${installmentStudent?.name}`} size="sm">
 <form onSubmit={handleInstallmentSubmit} className="flex flex-col gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Installment Amount (₹)</label>
 <input type="number" className="p-5 bg-amber-50/50 border border-amber-100 rounded-[20px] text-lg font-black text-amber-700 outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all placeholder:text-amber-300" placeholder="e.g. 10000" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} required autoFocus />
 </div>
 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
 <button type="button" className="px-6 py-3 rounded-2xl border border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all font-sans" onClick={() => setIsInstallmentModalOpen(false)}>Cancel</button>
 <button type="submit" className="px-4 md:px-8 py-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-1 transition-all font-sans">Submit Payment</button>
 </div>
 </form>
 </Modal>

 {/* ─── Fee Management Modal ─────────────────────────── */}
 {isFeeModalOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 px-4 pb-8">
     <div className="absolute inset-0 bg-black/40 backdrop-blur-sm max-h-[90vh] overflow-y-auto" onClick={() => setIsFeeModalOpen(false)} />
     <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
       <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 md:px-8 pt-8 pb-4 border-b border-slate-100 rounded-t-[2.5rem]">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-xl font-black text-slate-900 tracking-tight">Fee Management</h2>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{feeStudent?.name}</p>
           </div>
           <button onClick={() => setIsFeeModalOpen(false)} className="p-2 rounded-2xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
           </button>
         </div>
       </div>

       <div className="p-4 md:p-8 space-y-6">
         {feeLoading ? <div className="flex justify-center items-center py-20">
             <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
           </div> : feeDetails ? <>
             {/* Alert Banner */}
             {feeDetails.alert_level === 'Critical' && <div className="animate-pulse p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                 <div>
                   <p className="text-xs font-black text-red-700 uppercase tracking-widest">🚨 Critical Alert — {feeDetails.usage_pct}% Hours Consumed</p>
                   <p className="text-[11px] text-red-600 mt-0.5">Student has used {feeDetails.consumed_hours} of {feeDetails.total_paid_hours} paid hours. Immediate renewal required!</p>
                 </div>
               </div>}
             {feeDetails.alert_level === 'Warning' && <div className="animate-pulse p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                 <div>
                   <p className="text-xs font-black text-amber-700 uppercase tracking-widest">⚠️ Warning — {feeDetails.usage_pct}% Hours Consumed</p>
                   <p className="text-[11px] text-amber-600 mt-0.5">Student has used {feeDetails.consumed_hours} of {feeDetails.total_paid_hours} paid hours. Consider next installment soon.</p>
                 </div>
               </div>}

             {/* Overview Cards */}
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Fee</p>
                 <p className="text-xl font-black text-slate-800">₹{parseFloat(feeDetails.total_fees || 0).toLocaleString()}</p>
               </div>
               <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Hours</p>
                 <p className="text-xl font-black text-slate-800">{feeDetails.total_hours || 0} hrs</p>
               </div>
               <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-1">
                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Total Paid</p>
                 <p className="text-xl font-black text-emerald-700">₹{parseFloat(feeDetails.total_paid || 0).toLocaleString()}</p>
               </div>
               <div className={`p-5 rounded-2xl border flex flex-col gap-1 ${feeDetails.alert_level === 'Critical' ? 'bg-red-50 border-red-200' : feeDetails.alert_level === 'Warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                 <p className={`text-[9px] font-black uppercase tracking-widest ${feeDetails.alert_level === 'Critical' ? 'text-red-600' : feeDetails.alert_level === 'Warning' ? 'text-amber-600' : 'text-blue-600'}`}>Hours Used</p>
                 <p className={`text-xl font-black ${feeDetails.alert_level === 'Critical' ? 'text-red-700' : feeDetails.alert_level === 'Warning' ? 'text-amber-700' : 'text-blue-700'}`}>{feeDetails.consumed_hours} / {feeDetails.total_paid_hours}</p>
               </div>
             </div>

             {/* Progress Bar */}
             {feeDetails.total_paid_hours > 0 && <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hour Consumption</span>
                   <span className={`text-[11px] font-black px-3 py-1 rounded-full ${feeDetails.alert_level === 'Critical' ? 'bg-red-100 text-red-700' : feeDetails.alert_level === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{feeDetails.usage_pct}%</span>
                 </div>
                 <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-700 ${feeDetails.alert_level === 'Critical' ? 'bg-red-500 animate-pulse' : feeDetails.alert_level === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} style={{
                  width: `${Math.min(feeDetails.usage_pct, 100)}%`
                }} />
                 </div>
                 <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <span>0%</span>
                   <span className="text-amber-500">70%</span>
                   <span className="text-red-500">90%</span>
                   <span>100%</span>
                 </div>
               </div>}

             {/* Installment History */}
             <div className="border border-slate-100 rounded-2xl overflow-hidden">
               <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-b border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Installment History</h4>
                 <button type="button" onClick={() => {
                  setShowAddInstallment(true);
                }} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-sm hover:shadow-amber-200 hover:shadow-md active:scale-95">
                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                   Add Installment
                 </button>
               </div>

               {/* Add Installment Form */}
               {showAddInstallment && <form onSubmit={handleSubmitInstallment} className="p-5 bg-amber-50/50 border-b border-amber-100 space-y-4">
                   <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">New Installment Entry</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Payment Date</label>
                       <input type="date" className="p-3 bg-white border border-amber-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300/50 transition-all" value={newInstallment.payment_date} onChange={e => setNewInstallment(p => ({
                      ...p,
                      payment_date: e.target.value
                    }))} required />
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Installment Amount (₹)</label>
                       <input type="number" className="p-3 bg-white border border-amber-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300/50 transition-all" placeholder="e.g. 5000" value={newInstallment.amount} onChange={e => setNewInstallment(p => ({
                      ...p,
                      amount: e.target.value,
                      paid_hours: calcPaidHours(e.target.value, feeDetails?.total_fees, feeDetails?.total_hours)
                    }))} required />
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Paid Hours <span className="text-amber-500">(Auto-calculated)</span></label>
                       <input type="number" step="0.01" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-300/50 transition-all" placeholder="Auto" value={newInstallment.paid_hours || calcPaidHours(newInstallment.amount, feeDetails?.total_fees, feeDetails?.total_hours)} onChange={e => setNewInstallment(p => ({
                      ...p,
                      paid_hours: e.target.value
                    }))} />
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Notes (optional)</label>
                       <input type="text" className="p-3 bg-white border border-amber-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300/50 transition-all" placeholder="e.g. Month 1 fee" value={newInstallment.notes} onChange={e => setNewInstallment(p => ({
                      ...p,
                      notes: e.target.value
                    }))} />
                     </div>
                   </div>
                   {feeDetails?.total_fees > 0 && feeDetails?.total_hours > 0 && <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                       Rate: ₹{(parseFloat(feeDetails.total_fees) / parseFloat(feeDetails.total_hours)).toFixed(0)}/hr &nbsp;•&nbsp;
                       Paid Hours = Amount ÷ Rate
                     </p>}
                   <div className="flex gap-3 justify-end">
                     <button type="button" onClick={() => setShowAddInstallment(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                     <button type="submit" className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-sm">Save Installment</button>
                   </div>
                 </form>}

               {/* Installments Table */}
               <div className="max-h-[300px] overflow-y-auto">
                 <div className="w-full overflow-x-auto">
<table className="w-full text-left">
                   <thead className="sticky top-0 bg-white shadow-sm">
                     <tr>
                       <th className="py-3 px-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                       <th className="py-3 px-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                       <th className="py-3 px-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Paid Hours</th>
                       <th className="py-3 px-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Notes</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {(feeDetails.installments || []).length === 0 ? <tr><td colSpan="4" className="py-5 md:py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No installments recorded yet</td></tr> : (feeDetails.installments || []).map((inst, idx) => <tr key={inst.id || idx} className="hover:bg-slate-50/60 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{idx + 1}</td>
                         <td className="py-3 px-5 text-[11px] font-black text-slate-600">{new Date(inst.payment_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}</td>
                         <td className="py-3 px-5 text-[11px] font-black text-emerald-600">₹{parseFloat(inst.amount).toLocaleString()}</td>
                         <td className="py-3 px-5">
                           <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-100">
                             {parseFloat(inst.paid_hours || 0).toFixed(2)} hrs
                           </span>
                         </td>
                         <td className="py-3 px-5 text-[10px] font-bold text-slate-400 italic">{inst.notes || '—'}</td>
                       </tr>)}
                   </tbody>
                 </table>
</div>
               </div>
             </div>
           </> : <p className="text-center py-5 md:py-10 text-[11px] text-slate-400 font-bold uppercase tracking-widest">No data found.</p>}
       </div>
     </div>
   </div>}

 </div>;
};
const InfoGroup = ({
  label,
  value,
  highlight
}) => <div className="flex flex-col gap-2 p-6 bg-slate-50/50 rounded-[24px] border border-slate-100 hover:border-[#008080]/30 hover:bg-white hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] transition-all group overflow-hidden relative">
 <div className={`absolute top-0 right-0 w-12 h-12 bg-[#008080]/5 rounded-bl-[24px] transition-all duration-500 scale-0 group-hover:scale-100`}></div>
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-[#008080] transition-colors">{label}</label>
 <p className={`text-sm font-bold leading-relaxed ${highlight ? 'text-[#008080]' : 'text-slate-800'}`}>{value || '---'}</p>
 </div>;
export default Students;