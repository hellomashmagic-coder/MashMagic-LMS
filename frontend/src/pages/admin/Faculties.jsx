import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import MobileCard from '../../components/common/MobileCard';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { Eye, Edit2, Ban, Trash2, Filter, Download, UserPlus, Search, UserSquare2, GraduationCap, Check, Users, Phone, Mail, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SUBJECT_OPTIONS = [
  "Mathematics", "Science", "Social Science", "English", "Malayalam", 
  "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", 
  "Business Studies", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"
];

const Faculties = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [facultyDetail, setFacultyDetail] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    status: '',
    role: 'faculty'
  });

  const [selectedSyllabi, setSelectedSyllabi] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  const toggleSyllabus = (syl) => {
    setSelectedSyllabi(prev => 
      prev.includes(syl) ? prev.filter(s => s !== syl) : [...prev, syl]
    );
  };

  const toggleSection = (sec) => {
    setSelectedSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const toggleSubject = (sub) => {
    setSelectedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  useEffect(() => {
    fetchFaculties();
  }, [page, searchTerm]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedSyllabi, selectedSections, selectedSubjects]);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/faculties?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`);
      const realFaculties = response.data.data;
      setFaculties(realFaculties);
      setTotalRecords(response.data.total || 0);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch faculties");
      setLoading(false);
    }
  };

  const filteredFaculties = React.useMemo(() => {
    return faculties.filter(f => {
      const matchesSearch = searchTerm === '' ||
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        
      let matchesSyllabus = true;
      if (selectedSyllabi.length > 0) {
        const fSyllabus = f.syllabus 
          ? (typeof f.syllabus === 'string' ? f.syllabus.split(',') : (Array.isArray(f.syllabus) ? f.syllabus : [f.syllabus]))
          : [];
        const normalizedSyllabi = fSyllabus.map(s => s.trim().toUpperCase());
        matchesSyllabus = selectedSyllabi.some(syl => normalizedSyllabi.includes(syl.toUpperCase()));
      }

      let matchesSection = true;
      if (selectedSections.length > 0) {
        const fSection = f.section 
          ? (typeof f.section === 'string' ? f.section.split(',') : (Array.isArray(f.section) ? f.section : [f.section]))
          : [];
        const normalizedSections = fSection.map(s => s.trim().toUpperCase());
        matchesSection = selectedSections.some(sec => normalizedSections.includes(sec.toUpperCase()));
      }

      let matchesSubject = true;
      if (selectedSubjects.length > 0) {
        const fSubject = f.subject 
          ? (typeof f.subject === 'string' ? f.subject.split(',') : (Array.isArray(f.subject) ? f.subject : [f.subject]))
          : [];
        const normalizedSubjects = fSubject.map(s => s.trim().toUpperCase());
        matchesSubject = selectedSubjects.some(sub => normalizedSubjects.includes(sub.toUpperCase()));
      }

      return matchesSearch && matchesSyllabus && matchesSection && matchesSubject;
    });
  }, [faculties, searchTerm, selectedSyllabi, selectedSections, selectedSubjects]);

  const sortedFaculties = React.useMemo(() => {
    return [...filteredFaculties].sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'oldest') return a.id - b.id;
      return 0;
    });
  }, [filteredFaculties, sortBy]);

 const handleExport = (dataToExport = filteredFaculties) => {
    import('xlsx').then(XLSX => {
      const exportData = dataToExport.map(f => ({
        'Name': f.name || '',
        'Email': f.email || '',
        'Phone': f.phone || '',
        'Mentors Assigned': f.mentorsUnder || 0,
        'Students Assigned': f.studentsUnder || 0,
        'Status': f.status || '',
        'Created At': f.created_at ? new Date(f.created_at).toLocaleDateString() : ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Faculties");
      XLSX.writeFile(wb, `faculties_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  const handleView = async (faculty) => {
    setSelectedFaculty(faculty);
    setIsModalOpen(true);
    setDetailLoading(true);
    setFacultyDetail(null);
    try {
      const response = await api.get(`/admin/faculties/${faculty.id}/details`);
      setFacultyDetail(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch faculty details");
    } finally {
      setDetailLoading(false);
    }
  };

 const handleEdit = (faculty) => {
 setSelectedFaculty(faculty);
 setEditFormData({
 name: faculty.name,
 email: faculty.email,
 phone_number: faculty.phone || '',
 status: faculty.status,
 role: 'faculty'
 });
 setIsEditModalOpen(true);
 };

 const handleUpdate = async (e) => {
 e.preventDefault();
 try {
 await api.put(`/admin/users/${selectedFaculty.id}`, editFormData);
 toast.success("Faculty updated successfully");
 setIsEditModalOpen(false);
 fetchFaculties();
 } catch (error) {
 toast.error(error.response?.data?.message || "Failed to update faculty");
 }
 };

 const handleApprove = async (faculty) => {
 try {
 await api.put(`/admin/approve/${faculty.id}`);
 toast.success(`Faculty ${faculty.name} approved`);
 fetchFaculties();
 } catch (error) {
 toast.error("Failed to approve faculty");
 }
 };

 const handleBlock = async (faculty) => {
 premiumConfirm(async () => {
 try {
 await api.put(`/admin/block/${faculty.id}`);
 toast.success(`${faculty.name} blocked successfully`);
 fetchFaculties();
 } catch (error) {
 toast.error("Failed to block faculty");
 }
 }, { 
 name: faculty.name, 
 title: 'Block Faculty', 
 message: `Suspending faculty ${faculty.name} will disable their access to students and logs.`,
 type: 'standard'
 });
 };

 const handleDelete = async (faculty) => {
 premiumConfirm(async () => {
 try {
 await api.delete(`/admin/delete/${faculty.id}`);
 toast.success(`Faculty ${faculty.name} deleted`);
 fetchFaculties();
 } catch (error) {
 toast.error("Failed to delete faculty");
 }
 }, { 
 name: faculty.name, 
 title: 'Permanent Deletion', 
 message: `Are you sure you want to permanently delete faculty member ${faculty.name}? This action will remove all their data from the database forever and cannot be undone.`,
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
  { header: 'Faculty Lead', accessor: 'name' },
  { header: 'Email Address', accessor: 'email' },
  { header: 'Direct Contact', accessor: 'phone' },
  { header: 'Mentors Group', accessor: 'mentorsUnder' },
  { header: 'Total Students', accessor: 'studentsUnder' },
 {
  header: 'Status',
  accessor: 'status',
  render: (row) => (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
      row.status === 'active' 
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
        : row.status === 'inactive' 
        ? 'bg-slate-50 text-slate-600 border-slate-100' 
        : row.status === 'pending' 
        ? 'bg-amber-50 text-amber-600 border-amber-100' 
        : 'bg-rose-50 text-rose-600 border-rose-100'
    }`}>
      {row.status === 'active' ? 'Active' : row.status === 'inactive' ? 'Backup' : row.status === 'pending' ? 'Pending' : row.status === 'left' ? 'Left' : row.status}
    </span>
  )
  },
 ];

  const renderFacultyMobileCard = (row, { isExpanded, onToggle }) => {
    // Generate initials
    const initials = row.name
      ? row.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    const statusColors = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      inactive: 'bg-slate-50 text-slate-600 border-slate-100',
      pending: 'bg-amber-50 text-amber-600 border-amber-100',
      left: 'bg-rose-50 text-rose-600 border-rose-100'
    };
    const statusText = { active: 'Active', inactive: 'Backup', pending: 'Pending', left: 'Left' };
    const currentStatus = row.status || 'unknown';

    const badges = [
      <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusColors[currentStatus] || statusColors.inactive}`}>
        {statusText[currentStatus] || currentStatus}
      </span>
    ];

    const metrics = [
      { icon: <Users size={12} />, value: `${row.studentsUnder || 0} Students` },
      { icon: <UserSquare2 size={12} />, value: `${row.mentorsUnder || 0} Mentors` }
    ];

    const expandedContent = (
      <div className="space-y-3">
        {row.email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail size={14} className="text-slate-400" />
            <span className="text-xs font-bold">{row.email}</span>
          </div>
        )}
        {row.subject && (
          <div className="flex items-start gap-2 text-slate-600">
            <BookOpen size={14} className="text-slate-400 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {(typeof row.subject === 'string' ? row.subject.split(',') : row.subject || []).map((sub, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">{sub.trim()}</span>
              ))}
            </div>
          </div>
        )}
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008080]/10 to-[#008080]/5 border border-[#008080]/20 flex items-center justify-center">
            <span className="text-[#008080] text-sm font-black tracking-tighter">{initials}</span>
          </div>
        }
        title={row.name}
        subtitle={
          <span className="flex items-center gap-1">
            <Phone size={10} />
            {row.phone || 'No Phone'}
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
      <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Faculty Administration</h2>
      <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Manage and monitor all tuition faculties</p>
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
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[#008080] transition-colors">Total Faculty</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{faculties.length}</span>
        <span className="text-[10px] text-slate-600 mb-1 uppercase tracking-widest">Database Total</span>
      </div>
    </div>
    
    <div className="bg-white/70 backdrop-blur-md p-4 md:p-8 rounded-[35px] border border-white/60 shadow-sm flex flex-col gap-2 group transition-all hover:bg-white hover:shadow-md">
      <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Active Faculties</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{faculties.filter(f => f.status === 'active').length}</span>
        <div className="flex items-center gap-1.5 mb-1 bg-[#10B981]/10 px-2 py-0.5 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></div>
           <span className="text-[10px] text-[#10B981] uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  </div>

  {/* Collapsible Filter Panel */}
  {isFilterOpen && (
    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Syllabus Filter */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Syllabus</h4>
          <div className="flex flex-wrap gap-2">
            {['CBSE', 'STATE'].map(syl => {
              const isSelected = selectedSyllabi.includes(syl);
              return (
                <button
                  key={syl}
                  type="button"
                  onClick={() => toggleSyllabus(syl)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' 
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                    {isSelected && <Check size={8} className="text-white" />}
                  </div>
                  {syl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Filter */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Section</h4>
          <div className="flex flex-wrap gap-2">
            {['LP', 'UP', 'HS', 'HSS'].map(sec => {
              const isSelected = selectedSections.includes(sec);
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => toggleSection(sec)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' 
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                    {isSelected && <Check size={8} className="text-white" />}
                  </div>
                  {sec}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Filter */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Subject Focus</h4>
          {selectedSubjects.length > 0 && (
            <button 
              type="button" 
              onClick={() => setSelectedSubjects([])}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              Clear Subjects
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {SUBJECT_OPTIONS.map(sub => {
            const isSelected = selectedSubjects.includes(sub);
            return (
              <button
                key={sub}
                type="button"
                onClick={() => toggleSubject(sub)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border truncate ${
                  isSelected 
                    ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' 
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                }`}
                title={sub}
              >
                <div className={`w-3 h-3 rounded-sm border flex flex-shrink-0 items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                  {isSelected && <Check size={8} className="text-white" />}
                </div>
                <span className="truncate">{sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )}

  <DataTable
    columns={columns}
    data={filteredFaculties}
    loading={loading}
    onSearch={(query) => setSearchTerm(query)}
    onExport={handleExport}
    onView={handleView}
    page={page}
    totalPages={Math.ceil(totalRecords / limit) || 1}
    totalRecords={totalRecords}
    onPageChange={setPage}
    onFilter={
      <button 
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className={`flex items-center gap-2 px-6 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest border transition-all ${
          isFilterOpen || (selectedSyllabi.length + selectedSections.length + selectedSubjects.length) > 0
            ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' 
            : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:text-slate-900 shadow-sm shadow-slate-100/10'
        }`}
      >
        <Filter size={16} /> Filters
        {(selectedSyllabi.length + selectedSections.length + selectedSubjects.length) > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#008080] text-white">
            {selectedSyllabi.length + selectedSections.length + selectedSubjects.length}
          </span>
        )}
      </button>
    }
    searchPlaceholder="Search leads by name or email..."
    renderMobileCard={renderFacultyMobileCard}
  />

 {/* Edit Faculty Modal */}
 <Modal
 isOpen={isEditModalOpen}
 onClose={() => setIsEditModalOpen(false)}
 title="Edit Faculty Details"
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
 className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/10 transition-all"
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

  <Modal
  isOpen={isModalOpen}
  onClose={() => { setIsModalOpen(false); setFacultyDetail(null); }}
  title="Faculty Profile"
  size="lg"
  >
  {selectedFaculty && (
  <div className="flex flex-col gap-8">
  <div className="flex items-center gap-8 p-4 md:p-8 bg-[#008080]/5 rounded-[32px] border border-[#008080]/10 shadow-[0_10px_30px_rgba(20,184,166,0.05)]">
  <div className="w-24 h-24 bg-gradient-to-br from-[#006666] to-[#008080] text-white rounded-[28px] flex items-center justify-center text-2xl md:text-4xl font-black shadow-xl shadow-[#008080]/20">
  {selectedFaculty.name.charAt(0)}
  </div>
  <div className="flex flex-col gap-2">
  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none ">{selectedFaculty.name}</h3>
  <p className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">{selectedFaculty.email}</p>
  <div className="mt-3 flex gap-2">
  <span className="px-4 py-1.5 bg-[#F59E0B]/10 rounded-xl text-[9px] font-bold text-[#F59E0B] border border-[#F59E0B]/20 uppercase tracking-[0.15em]">
  Tuition Faculty
  </span>
  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold border uppercase tracking-[0.15em] ${
    selectedFaculty.status === 'active' 
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
      : selectedFaculty.status === 'inactive'
      ? 'bg-slate-50 text-slate-600 border-slate-100'
      : selectedFaculty.status === 'pending'
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : 'bg-rose-50 text-rose-600 border-rose-100'
  }`}>
  Status: {selectedFaculty.status === 'active' ? 'Active' : selectedFaculty.status === 'inactive' ? 'Backup' : selectedFaculty.status === 'pending' ? 'Pending' : selectedFaculty.status === 'left' ? 'Left' : selectedFaculty.status}
  </span>
  </div>
  </div>
  </div>

  <div className="bg-white border border-slate-100 rounded-[32px] p-4 md:p-8 space-y-6 shadow-sm">
    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Registration Details</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.name}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.email || 'N/A'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direct Contact / Phone</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.phone || 'N/A'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registered Subject</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.subject || 'N/A'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Syllabus Focus</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.syllabus || 'N/A'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Section Coverage</span>
        <span className="text-sm font-bold text-slate-800">{selectedFaculty.section || 'N/A'}</span>
      </div>
    </div>
  </div>

  {detailLoading ? (
    <div className="flex flex-col items-center justify-center py-5 md:py-10 gap-3">
      <div className="w-8 h-8 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fetching assignment roster...</p>
    </div>
  ) : facultyDetail ? (
    <div className="space-y-6">
      <div className="p-4 md:p-8 bg-white border border-slate-100 rounded-[32px] flex items-center gap-6 hover:border-[#F59E0B]/20 hover:shadow-lg transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/5 rounded-bl-[48px] -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="p-4 bg-[#F59E0B]/5 text-[#F59E0B] rounded-[20px] shadow-sm relative z-10 border border-[#F59E0B]/10">
          <GraduationCap size={24} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none mb-2">Enrolled Students</p>
          <h4 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{facultyDetail.students?.length || 0}</h4>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Student & Subject Roster</h5>
        {facultyDetail.students && facultyDetail.students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyDetail.students.map((student, idx) => (
              <div key={idx} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col gap-3 shadow-inner hover:border-[#008080]/30 hover:bg-white transition-all">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.student_name}</span>
                  <span className="px-2.5 py-1 bg-[#008080]/10 text-[#008080] border border-[#008080]/20 rounded-lg text-[8px] font-black uppercase tracking-widest">
                    {student.grade || 'Grade N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subject Taught</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">{student.subject || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Course Group</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">{student.course || 'N/A'}</span>
                  </div>
                </div>
                {student.day_of_week && (
                  <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-500 bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[#008080] uppercase tracking-wider">{student.day_of_week}</span>
                    <span className="text-slate-300">|</span>
                    <span>{student.start_time} - {student.end_time}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 md:p-8 text-center bg-slate-50 border border-slate-100 rounded-[2rem]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active students assigned to this faculty</p>
          </div>
        )}
      </div>
    </div>
  ) : null}

  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100/50">
  <button className="px-4 md:px-8 py-4 rounded-[20px] border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-600 hover:bg-slate-50 transition-all font-sans" onClick={() => { setIsModalOpen(false); setFacultyDetail(null); }}>Close</button>
  </div>
  </div>
  )}
  </Modal>
 </div>
 );
};

export default Faculties;
