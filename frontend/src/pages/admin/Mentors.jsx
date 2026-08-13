import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import MobileCard from '../../components/common/MobileCard';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { Eye, Edit2, Ban, Trash2, Filter, Download, UserPlus, Search, ArrowUpRight, Users, ListTodo, TrendingUp, Phone, Mail, CheckCircle, MoreVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Mentors = () => {
 const { user } = useAuth();
 const isSuperAdmin = user?.role === 'super_admin';
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedMentor, setSelectedMentor] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [mentorStudents, setMentorStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentForExams, setSelectedStudentForExams] = useState(null);
  const [studentExams, setStudentExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editFormData, setEditFormData] = useState({
 name: '',
 email: '',
 phone_number: '',
 status: '',
 role: 'mentor'
 });

  useEffect(() => {
    fetchMentors();
  }, [page, searchTerm, sortBy]);

  // Reset to page 1 when search or sorting changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/mentors?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`);
      const realMentors = response.data.data;
      setMentors(realMentors);
      setTotalRecords(response.data.total || 0);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch mentors");
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchTerm(query);
  };

  const sortedMentors = mentors; // Sorting handled by backend ideally, or keep as is if no sorting provided by backend for 'newest'. Wait, keeping it simple:

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Fetching data for export...');
      const response = await api.get(`/admin/mentors?search=${encodeURIComponent(searchTerm)}&export=true`);
      const exportData = response.data.data;
      toast.dismiss(toastId);

      const headers = ['Name', 'Email', 'Phone', 'Students Count', 'Completion Rate', 'Status'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(m => [
          `"${m.name}"`,
          `"${m.email}"`,
          `"${m.phone || ''}"`,
          m.studentsCount,
          `"${m.completionRate}%"`,
          `"${m.status}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mentors_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast.error('Failed to export mentors');
    }
  };

 const handleSelectStudent = async (student) => {
   setSelectedStudentForExams(student);
   setLoadingExams(true);
   try {
     const res = await api.get(`/admin/students/${student.id}/exams`);
     if (res.data.success) {
       setStudentExams(res.data.data);
     }
   } catch (error) {
     console.error("Failed to fetch student exams", error);
     setStudentExams([]);
   } finally {
     setLoadingExams(false);
   }
 };

 const handleView = async (mentor) => {
 setSelectedMentor(mentor);
 setIsModalOpen(true);
 setLoadingStudents(true);
 setSelectedStudentForExams(null);
 setStudentExams([]);
 try {
 const res = await api.get(`/admin/students?mentor_id=${mentor.id}`);
 if (res.data.success) {
 const students = res.data.data;
 setMentorStudents(students);
 if (students.length > 0) {
   handleSelectStudent(students[0]);
 }
 }
 } catch (error) {
 console.error("Failed to fetch mentor students");
 } finally {
 setLoadingStudents(false);
 }
 };

 const handleEdit = (mentor) => {
 setSelectedMentor(mentor);
 setEditFormData({
 name: mentor.name,
 email: mentor.email,
 phone_number: mentor.phone || '',
 status: mentor.status,
 role: 'mentor'
 });
 setIsEditModalOpen(true);
 };

 const handleUpdate = async (e) => {
 e.preventDefault();
 try {
 await api.put(`/admin/users/${selectedMentor.id}`, editFormData);
 toast.success("Mentor updated successfully");
 setIsEditModalOpen(false);
 fetchMentors();
 } catch (error) {
 toast.error(error.response?.data?.message || "Failed to update mentor");
 }
 };

 const handleApprove = async (mentor) => {
 try {
 await api.put(`/admin/approve/${mentor.id}`);
 toast.success(`${mentor.name} approved successfully`);
 fetchMentors();
 } catch (error) {
 toast.error("Failed to approve mentor");
 }
 };

 const handleBlock = async (mentor) => {
 premiumConfirm(async () => {
 try {
 await api.put(`/admin/block/${mentor.id}`);
 toast.success(`${mentor.name} blocked successfully`);
 fetchMentors();
 } catch (error) {
 toast.error("Failed to block mentor");
 }
 }, { 
 name: mentor.name, 
 title: 'Block Access', 
 message: `Suspending access for ${mentor.name} will prevent them from logging in. Continue?`,
 type: 'standard'
 });
 };

 const handleDelete = async (mentor) => {
 premiumConfirm(async () => {
 try {
 await api.delete(`/admin/delete/${mentor.id}`);
 toast.success(`${mentor.name} deleted successfully`);
 fetchMentors();
 } catch (error) {
 toast.error("Failed to delete mentor");
 }
 }, { 
 name: mentor.name, 
 title: 'Permanent Deletion', 
 message: `Are you sure you want to permanently delete mentor ${mentor.name}? This action will remove all their data from the database forever and cannot be undone.`,
 type: 'danger'
 });
 };

 const columns = [
 {
   header: 'No.',
   width: '60px',
   render: (row, { index }) => (
     <span className="text-[12px] font-black text-slate-400">{index + 1}</span>
   )
 },
 { header: 'Mentor Name', accessor: 'name' },
 { header: 'Email ID', accessor: 'email' },
 { 
   header: 'Assigned Students', 
   accessor: 'studentsCount',
   render: (row, { isExpanded, onToggle }) => (
     <button 
       type="button" 
       onClick={(e) => { 
         e.stopPropagation(); 
         if (!isExpanded) {
           handleViewInline(row);
         } else {
           onToggle();
         }
       }}
       className="text-[10px] font-black text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
     >
       {row.studentsCount} STUDENTS
     </button>
   )
 },
  {
  header: 'Performance Level',
  accessor: 'completionRate',
  render: (row) => (
  <div className="flex flex-col gap-1.5 w-32">
  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
  <span>Sessions</span>
  <span className="text-emerald-600">{row.completedSessions || 0} ({row.completionRate}%)</span>
  </div>
  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${row.completionRate}%` }}></div>
  </div>
  </div>
  )
  },
  {
  header: 'Account Status',
  accessor: 'status',
  render: (row) => (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
      row.status === 'active' 
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
        : row.status === 'inactive' 
        ? 'bg-slate-50 text-slate-600 border-slate-100' 
        : row.status === 'pending' 
        ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' 
        : 'bg-rose-50 text-rose-600 border-rose-100'
    }`}>
      {row.status === 'active' ? 'Active' : row.status === 'inactive' ? 'Backup' : row.status === 'pending' ? 'Pending' : row.status === 'left' ? 'Left' : row.status}
    </span>
  )
  },
 ];

  const renderMentorMobileCard = (row, { isExpanded, onToggle }) => {
    const initials = row.name
      ? row.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    const statusColors = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      inactive: 'bg-slate-50 text-slate-600 border-slate-100',
      pending: 'bg-amber-50 text-amber-600 border-amber-100',
      left: 'bg-rose-50 text-rose-600 border-rose-100'
    };
    const currentStatus = row.status || 'unknown';
    const statusText = { active: 'Active', inactive: 'Inactive', pending: 'Pending', left: 'Left' };

    const badges = [
      <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusColors[currentStatus] || statusColors.inactive}`}>
        {statusText[currentStatus] || currentStatus}
      </span>
    ];

    const metrics = [
      { icon: <Users size={12} />, value: `${row.studentsCount || 0} Students` },
      { icon: <TrendingUp size={12} />, value: `${row.completionRate || 0}% Perf.` }
    ];

    const expandedContent = (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          {row.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={14} className="text-slate-400" />
              <span className="text-xs font-bold">{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone size={14} className="text-slate-400" />
              <span className="text-xs font-bold">{row.phone}</span>
            </div>
          )}
        </div>
        
        {/* Performance Visualization */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
            <span>Completed Sessions</span>
            <span className="text-emerald-600">{row.completedSessions || 0} ({row.completionRate || 0}%)</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${row.completionRate || 0}%` }}></div>
          </div>
        </div>
      </div>
    );

    const primaryActions = [
      { icon: <Eye size={14} />, label: 'View', onClick: () => handleView(row) },
      { icon: <Edit2 size={14} />, label: 'Edit', onClick: () => handleEdit(row) }
    ];

    const moreActions = [];
    if (row.status !== 'active') {
      moreActions.push({ icon: <CheckCircle size={14} />, label: 'Approve', onClick: () => handleApprove(row) });
    }
    if (row.status !== 'blocked') {
      moreActions.push({ icon: <Ban size={14} />, label: 'Block', onClick: () => handleBlock(row) });
    }
    moreActions.push({ icon: <Trash2 size={14} />, label: 'Delete', onClick: () => handleDelete(row), danger: true });

    return (
      <MobileCard
        isExpanded={isExpanded}
        onToggle={onToggle}
        avatar={
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5 border border-[#10B981]/20 flex items-center justify-center">
            <span className="text-[#10B981] text-sm font-black tracking-tighter">{initials}</span>
          </div>
        }
        title={row.name}
        subtitle={
          <span className="flex items-center gap-1 text-[#008080]">
            <ListTodo size={10} />
            {row.completedSessions || 0} Sessions
          </span>
        }
        badges={badges}
        metrics={metrics}
        expandedContent={expandedContent}
        primaryActions={primaryActions}
        moreActions={moreActions}
      />
    );
  };

 return (
 <div className="flex flex-col gap-10">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
    <div className="flex flex-col">
      <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Mentor Network</h2>
      <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Manage and monitor all mentors and their student assignments</p>
    </div>
    
    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-md px-6 py-4 rounded-[20px] border border-white/60 shadow-sm group">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sort By</span>
      <div className="w-px h-6 bg-slate-200"></div>
      <select 
        value={sortBy} 
        onChange={(e) => setSortBy(e.target.value)}
        className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-slate-800 outline-none focus:ring-0 cursor-pointer"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
    <div className="bg-white/70 backdrop-blur-md p-4 md:p-8 rounded-[35px] border border-white/60 shadow-sm flex flex-col gap-2 group transition-all hover:bg-white hover:shadow-md">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[#008080] transition-colors">Total Mentors</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{mentors.length}</span>
        <span className="text-[10px] text-slate-600 mb-1 uppercase tracking-widest">Database Total</span>
      </div>
    </div>
    
    <div className="bg-white/70 backdrop-blur-md p-4 md:p-8 rounded-[35px] border border-white/60 shadow-sm flex flex-col gap-2 group transition-all hover:bg-white hover:shadow-md">
      <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Active Mentors</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{mentors.filter(m => m.status === 'active').length}</span>
        <div className="flex items-center gap-1.5 mb-1 bg-[#10B981]/10 px-2 py-0.5 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></div>
           <span className="text-[10px] text-[#10B981] uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  </div>

  <DataTable
  columns={columns}
  data={sortedMentors}
  loading={loading}
  onSearch={handleSearch}
  onExport={handleExport}
  onView={handleView}
  page={page}
  totalPages={Math.ceil(totalRecords / limit) || 1}
  totalRecords={totalRecords}
  onPageChange={setPage}
  expandedRowId={expandedRowId}
  onToggleExpand={(id) => setExpandedRowId(expandedRowId === id ? null : id)}
  renderMobileCard={renderMentorMobileCard}
  renderSubRow={(mentor, onClose) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 pl-2">
        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
          <Users size={16} className="text-[#008080]" /> Assigned Students & Deliverables: {mentor.name.toUpperCase()}
        </h4>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all"
        >
          <span className="text-xs font-black uppercase text-slate-400 hover:text-slate-600">Close</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col h-[350px]">
          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 shrink-0">Assigned Students ({mentorStudents.length})</h5>
          <div className="space-y-3 overflow-y-auto pr-2 grow">
            {loadingStudents ? (
              <div className="text-center py-4 md:py-8 text-[10px] font-black text-slate-600 animate-pulse">FETCHING STUDENTS...</div>
            ) : mentorStudents.length > 0 ? mentorStudents.map((student) => {
              const isSelected = selectedStudentForExams?.id === student.id;
              return (
                <div key={student.id} onClick={() => handleSelectStudent(student)} className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer group ${isSelected ? 'bg-[#008080]/10 border-[#008080]/30 shadow-md shadow-[#008080]/5' : 'bg-white border-slate-100 hover:border-[#008080]/30 hover:shadow-md'}`}>
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs font-black transition-colors leading-none ${isSelected ? 'text-[#008080]' : 'text-slate-700 group-hover:text-[#008080]'}`}>{student.name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">REG: {student.registration_number || 'UNKNOWN'}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-[#008080] bg-[#008080]/5 px-2 py-0.5 rounded-lg uppercase leading-none">{student.course || 'N/A'}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest opacity-80 leading-none">{student.grade ? `${student.grade} GRADE` : ''}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-4 md:py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">No students assigned</div>
            )}
          </div>
        </div>
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h5 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Immediate Deliverables</h5>
            {selectedStudentForExams && (
              <span className="text-[10px] font-black text-[#008080] bg-[#008080]/5 px-2.5 py-1 rounded-lg uppercase truncate max-w-[180px]">
                {selectedStudentForExams.name}
              </span>
            )}
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 grow">
            {loadingExams ? (
              <div className="text-center py-4 md:py-8 text-[10px] font-black text-slate-600 animate-pulse">FETCHING ASSESSMENTS...</div>
            ) : !selectedStudentForExams ? (
              <div className="text-center py-4 md:py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">Select a student to view deliverables</div>
            ) : studentExams.length > 0 ? (
              studentExams.map((exam, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-[#008080]/20 transition-all cursor-default group">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#008080] transition-colors">
                      Assessment {i + 1} <span className="text-[9px] font-normal text-slate-400">(Milestone {exam.milestone})</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${exam.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : exam.status === 'Postponed' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                      {exam.status || 'Pending'}
                    </span>
                  </div>
                  {(exam.chapter || exam.portions || exam.score != null) && (
                    <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      {exam.chapter && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wider">Chapter:</span>
                          <span className="font-medium text-slate-700">{exam.chapter}</span>
                        </div>
                      )}
                      {exam.portions && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wider">Portions:</span>
                          <span className="font-medium text-slate-700">{exam.portions}</span>
                        </div>
                      )}
                      {exam.score != null && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wider">Score:</span>
                          <span className="font-bold text-emerald-600">{exam.score}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 md:py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">No assessments found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}
  searchPlaceholder="Filter mentors by name or email..."
  />

 {/* Edit Mentor Modal */}
 <Modal
 isOpen={isEditModalOpen}
 onClose={() => setIsEditModalOpen(false)}
 title="Edit Mentor Profile"
 size="md"
 >
 <form onSubmit={handleUpdate} className="flex flex-col gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Full Name</label>
 <input
 type="text"
 className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 transition-all"
 value={editFormData.name}
 onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
 required
 />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Email Address</label>
 <input
 type="email"
 className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all"
 value={editFormData.email}
 onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
 required
 />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Phone Number</label>
 <input
 type="text"
 className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all"
 value={editFormData.phone_number}
 onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
 />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Account Status</label>
 <select
 className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 transition-all"
 value={editFormData.status}
 onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
 >
  <option value="active">Active</option>
  <option value="inactive">Backup</option>
  <option value="pending">Pending</option>
  <option value="left">Left</option>
 </select>
 </div>
 <div className="flex justify-end gap-3 mt-8">
 <button type="button" className="px-4 md:px-8 py-3.5 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
 <button type="submit" className="px-5 md:px-10 py-3.5 rounded-2xl bg-gradient-to-br from-[#006666] to-[#008080] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-[#008080]/30 hover:-translate-y-1 transition-all shadow-md shadow-[#008080]/20">Save Changes</button>
 </div>
 </form>
 </Modal>


 </div>
 );
};

const MentorStat = ({ label, value, icon, color }) => {
 const colors = {
 teal: 'bg-[#008080]/5 text-[#008080] border-[#008080]/20',
 yellow: 'bg-[#F59E0B]/5 text-[#F59E0B] border-[#F59E0B]/20',
 emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50'
 };
 return (
 <div className={`p-6 border rounded-[28px] flex items-center gap-5 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 ${colors[color]}`}>
 <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-[20px] flex items-center justify-center shadow-sm border border-white/50">
 {icon}
 </div>
 <div className="flex flex-col gap-1">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none">{label}</p>
 <h4 className="text-2xl font-black tracking-tighter leading-none">{value}</h4>
 </div>
 </div>
 );
};

export default Mentors;
