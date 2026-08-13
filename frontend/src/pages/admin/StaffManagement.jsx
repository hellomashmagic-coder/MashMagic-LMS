import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCog, Mail, Phone, Briefcase, Lock, Unlock, Eye, Edit2, Trash2, Key, Ban, Calendar } from 'lucide-react';
import MobileCard from '../../components/common/MobileCard';

const StaffManagement = () => {
 const { user } = useAuth();
 const [expandedRowId, setExpandedRowId] = useState(null);
 const isSuperAdmin = user?.role === 'super_admin';
 const [staff, setStaff] = useState([]);
 const [filteredStaff, setFilteredStaff] = useState([]);
 const [loading, setLoading] = useState(true);
 const [sortBy, setSortBy] = useState('newest');
 const [searchTerm, setSearchTerm] = useState('');
 
 // Pagination State
 const [page, setPage] = useState(1);
 const limit = 50;
 const [totalRecords, setTotalRecords] = useState(0);

 const [selectedMember, setSelectedMember] = useState(null);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [isEditingModal, setIsEditingModal] = useState(false);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [editFormData, setEditFormData] = useState({
 name: '',
 email: '',
 phone_number: '',
 role: '',
 status: ''
 });

 useEffect(() => {
   fetchStaff();
 }, [page, searchTerm]);

 // Reset to page 1 when search changes
 useEffect(() => {
   setPage(1);
 }, [searchTerm]);

 const fetchStaff = async () => {
   try {
     setLoading(true);
     const apiPath = user?.role === 'academic_head' ? '/academic-head/staff' : '/admin/staff';
     const response = await api.get(`${apiPath}?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`);
     const staffData = (response.data.data || []).filter(s => s.role !== 'student');
     setStaff(staffData);
     setFilteredStaff(staffData);
     setTotalRecords(response.data.total || 0);
     setLoading(false);
   } catch (error) {
     toast.error("Failed to fetch staff members");
     setLoading(false);
   }
 };

 const handleSearch = (query) => {
   setSearchTerm(query);
 };

 const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (sortBy === 'newest') return b.id - a.id;
    if (sortBy === 'oldest') return a.id - b.id;
    return 0;
  });

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Fetching data for export...');
      const apiPath = user?.role === 'academic_head' ? '/academic-head/staff' : '/admin/staff';
      const response = await api.get(`${apiPath}?search=${encodeURIComponent(searchTerm)}&export=true`);
      const exportData = (response.data.data || []).filter(s => s.role !== 'student');
      toast.dismiss(toastId);

      const headers = ['Name', 'Email', 'Role', 'Status'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(s => [
          `"${s.name}"`,
          `"${s.email}"`,
          `"${s.role}"`,
          `"${s.status}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast.error('Failed to export staff members');
    }
  };

  const handleView = (member) => {
    setSelectedMember(member);
    setIsDetailModalOpen(true);
    toast.success(`Accessing profile for ${member.name}`);
  };

 const handleEdit = (member) => {
 setSelectedMember(member);
 setEditFormData({
 name: member.name,
 email: member.email,
 phone_number: member.phone || '',
 role: member.role,
 status: member.status
 });
 setIsEditingModal(false);
 setIsEditModalOpen(true);
 };

 const handleUpdate = async (e) => {
 e.preventDefault();
 try {
 await api.put(`/admin/users/${selectedMember.id}`, editFormData);
 toast.success("Staff profile updated successfully");
 setIsEditModalOpen(false);
 fetchStaff();
 } catch (error) {
 toast.error(error.response?.data?.message || "Failed to update profile");
 }
 };

 const handleDelete = async (member) => {
 premiumConfirm(async () => {
 try {
 await api.delete(`/admin/delete/${member.id}`);
 toast.success("Staff member removed from system");
 fetchStaff();
 } catch (error) {
 const errorMsg = error.response?.data?.message || "Failed to delete member";
 toast.error(errorMsg);
 }
 }, { 
 name: member.name, 
 title: 'Remove Staff Member', 
 message: `Are you sure you want to permanently delete staff member ${member.name}? This action will remove all their data from the database forever and cannot be undone.`,
 type: 'danger'
 });
 };

  const columns = [
    {
      header: 'No.',
      width: '60px',
      render: (row, { index }) => (
        <span className="text-xs font-black text-slate-400">{index + 1}</span>
      )
    },
    { 
      header: 'Staff Member', accessor: 'name' },
 { header: 'Email', accessor: 'email' },
 {
 header: 'Staff Role',
 accessor: 'role',
 render: (row) => (
 <span className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm group-hover:bg-white group-hover:border-[#008080]/20 transition-all">
 {row.role.replace('_', ' ')}
 </span>
 )
 },
  {
  header: 'Status',
  accessor: 'status',
  render: (row) => (
  <span className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all hover:scale-105 active:scale-95 ${
    row.status === 'active' 
      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' 
      : row.status === 'inactive' 
      ? 'bg-slate-50 text-slate-600 border-slate-100'
      : row.status === 'pending' 
      ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
  }`}>
    {row.status === 'active' ? 'Active' : row.status === 'inactive' ? 'Backup' : row.status === 'pending' ? 'Pending' : row.status === 'left' ? 'Left' : row.status}
  </span>
  )
  },
 ];

  const renderStaffMobileCard = (row, { isExpanded, onToggle }) => {
    const initials = row.name
      ? row.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    const statusColors = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      inactive: 'bg-slate-50 text-slate-600 border-slate-100',
      pending: 'bg-amber-50 text-amber-600 border-amber-100',
      left: 'bg-rose-50 text-rose-600 border-rose-100'
    };
    const currentStatus = row.status || 'inactive';
    const statusText = { active: 'Active', inactive: 'Backup', pending: 'Pending', left: 'Left' };

    const badges = [
      <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusColors[currentStatus] || statusColors.inactive}`}>
        {statusText[currentStatus] || currentStatus}
      </span>
    ];

    const expandedContent = (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          {row.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold truncate">{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold">{row.phone}</span>
            </div>
          )}
          {row.created_at && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold">Joined: {new Date(row.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          )}
        </div>
      </div>
    );

    const primaryActions = [
      { icon: <Eye size={14} />, label: 'View', onClick: () => handleView(row) },
    ];
    
    if (isSuperAdmin) {
       primaryActions.push({ icon: <Edit2 size={14} />, label: 'Edit', onClick: () => handleEdit(row) });
    }

    const moreActions = [];
    if (isSuperAdmin) {
      moreActions.push({ icon: <Key size={14} />, label: 'Reset Password', onClick: () => toast.info('Reset password coming soon') });
      moreActions.push({ icon: <Ban size={14} />, label: 'Disable', onClick: () => toast.info('Disable feature coming soon') });
      moreActions.push({ icon: <Trash2 size={14} />, label: 'Delete', onClick: () => handleDelete(row), danger: true });
    }

    return (
      <MobileCard
        isExpanded={isExpanded}
        onToggle={onToggle}
        avatar={
          <div className="w-10 h-10 rounded-xl bg-[#008080]/10 border border-[#008080]/20 flex items-center justify-center shrink-0">
            <span className="text-[#008080] text-sm font-black tracking-tighter">{initials}</span>
          </div>
        }
        title={row.name}
        subtitle={row.role ? row.role.replace('_', ' ').toUpperCase() : 'STAFF'}
        badges={badges}
        expandedContent={expandedContent}
        primaryActions={primaryActions}
        moreActions={moreActions}
      />
    );
  };

 return (
 <div className="flex flex-col gap-10 pb-10">
 <div className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-10">
 <div className="text-center md:text-left">
 <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Staff Directory</h2>
 <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center md:justify-start gap-3 mt-1">
 <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse"></div>
 Manage all staff members and their system access roles
 </p>
 </div>
 <div className="bg-[#008080] px-4 md:px-8 py-5 rounded-[24px] border border-slate-800 shadow-2xl flex items-center gap-5 group hover:translate-x-1 transition-all">
 <ShieldCheck className="text-white" size={20} strokeWidth={2.5} />
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none mb-1">Total Staff</span>
 <span className="text-2xl font-black text-white leading-none tabular-nums tracking-tighter">{staff.length}</span>
 </div>
 </div>
 </div>

 <DataTable
  columns={columns}
  data={sortedStaff}
  loading={loading}
  onSearch={handleSearch}
  onExport={handleExport}
  onView={handleView}
  onViewFilter={(row) => ['sub_admin', 'mentor_head', 'academic_head', 'ssc', 'super_admin'].includes(row.role)}
  onDelete={isSuperAdmin ? handleDelete : undefined}
  onEdit={isSuperAdmin ? handleEdit : undefined}
  searchPlaceholder="Search by name, email or role..."
  page={page}
  totalPages={Math.ceil(totalRecords / limit) || 1}
  totalRecords={totalRecords}
  onPageChange={setPage}
  expandedRowId={expandedRowId}
  onToggleExpand={(id) => setExpandedRowId(expandedRowId === id ? null : id)}
  renderMobileCard={renderStaffMobileCard}
  />

  {/* Staff Detail Modal */}
  <Modal
    isOpen={isDetailModalOpen}
    onClose={() => setIsDetailModalOpen(false)}
    title="Staff Member Profile"
    size="md"
  >
    {selectedMember && (
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="w-20 h-20 bg-[#008080] text-white rounded-[24px] flex items-center justify-center text-3xl font-black shadow-lg">
            {selectedMember.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase">{selectedMember.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-1 bg-[#008080]/10 text-[#008080] rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#008080]/20">
                {selectedMember.role.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                selectedMember.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : selectedMember.status === 'inactive'
                  ? 'bg-slate-50 text-slate-600 border-slate-100'
                  : selectedMember.status === 'pending'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {selectedMember.status === 'active' ? 'Active' : selectedMember.status === 'inactive' ? 'Backup' : selectedMember.status === 'pending' ? 'Pending' : selectedMember.status === 'left' ? 'Left' : selectedMember.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4">
            <Mail className="text-slate-400" size={20} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
              <span className="text-sm font-bold text-slate-700">{selectedMember.email || 'N/A'}</span>
            </div>
          </div>
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4">
            <Phone className="text-slate-400" size={20} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact Number</span>
              <span className="text-sm font-bold text-slate-700">{selectedMember.phone || 'N/A'}</span>
            </div>
          </div>
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4">
            <ShieldCheck className="text-slate-400" size={20} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Access</span>
              <span className="text-sm font-bold text-slate-700">Level: {selectedMember.role.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button className="px-4 md:px-8 py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#008080] transition-all shadow-lg" onClick={() => setIsDetailModalOpen(false)}>Close Profile</button>
        </div>
      </div>
    )}
  </Modal>

 <Modal
 isOpen={isEditModalOpen}
 onClose={() => setIsEditModalOpen(false)}
 title="Edit Staff Details"
 size="md"
 >
 <form onSubmit={handleUpdate} className="flex flex-col gap-6 relative">
 <div className="flex justify-end mb-2">
    <button 
        type="button" 
        onClick={() => setIsEditingModal(prev => !prev)}
        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isEditingModal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200'}`}
    >
        {isEditingModal ? <><Unlock size={14} /> Editing</> : <><Lock size={14} /> Unlock Fields</>}
    </button>
 </div>
 <div className={`flex flex-col gap-6 transition-opacity duration-300 ${!isEditingModal ? 'opacity-60 pointer-events-none' : ''}`}>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Full Name</label>
 <div className="relative">
 <UserCog size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
 <input
 type="text"
 className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-sm"
 value={editFormData.name}
 onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
 disabled={!isEditingModal}
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Email</label>
 <div className="relative">
 <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
 <input
 type="email"
 className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-sm"
 value={editFormData.email}
 onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
 disabled={!isEditingModal}
 required
 />
 </div>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Phone</label>
 <div className="relative">
 <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
 <input
 type="text"
 className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-sm"
 value={editFormData.phone_number}
 onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
 disabled={!isEditingModal}
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Staff Role</label>
 <div className="relative">
 <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
 <select
 className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-sm appearance-none"
 value={editFormData.role}
 onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
 disabled={!isEditingModal}
 >
 <option value="mentor">Mentor</option>
 <option value="faculty">Faculty</option>
 <option value="mentor_head">Mentor Head</option>
 <option value="academic_head">Academic Head</option>
 <option value="ssc">SSC</option>
 <option value="super_admin">Super Admin</option>
 <option value="sub_admin">Sub Admin</option>
 </select>
 </div>
 </div>
  <div className="flex flex-col gap-2">
  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Account Status</label>
  <div className="relative">
  <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
  <select
  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] transition-all shadow-sm appearance-none"
  value={editFormData.status}
  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
  disabled={!isEditingModal}
  >
  <option value="active">Active</option>
  <option value="inactive">Backup</option>
  <option value="pending">Pending</option>
  <option value="left">Left</option>
  </select>
  </div>
  </div>
 </div>
 </div>

 <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-50 transition-opacity duration-300">
 <button
 type="button"
 className="px-6 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
 onClick={() => setIsEditModalOpen(false)}
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 md:px-8 py-3 rounded-2xl bg-[#008080] text-white text-sm font-bold hover:bg-[#008080] transition-all shadow-lg shadow-[#008080]/30 active:scale-95"
 >
 Save Changes
 </button>
 </div>
 </form>
 </Modal>
 </div>
 );
};

export default StaffManagement;
