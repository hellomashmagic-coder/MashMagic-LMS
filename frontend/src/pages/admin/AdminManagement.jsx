import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Search, Edit, Trash2, CheckCircle, XCircle, Loader2, ShieldCheck, Mail, Phone, Lock, User, Eye, EyeOff, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { premiumConfirm } from '../../utils/premiumConfirm';
const AdminManagement = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    status: 'active',
    permissions: {}
  });
  const [fullControl, setFullControl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeMoreMenuId, setActiveMoreMenuId] = useState(null);
  const permissionCategories = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      options: [
        { key: 'dashboard', label: 'Global Dashboard' },
        { key: 'monitoring', label: 'Live Monitoring' }
      ]
    },
    {
      id: 'student',
      title: 'Student Management',
      options: [
        { key: 'students', label: 'Student Management' },
        { key: 'approvals', label: 'Registration Approvals' }
      ]
    },
    {
      id: 'faculty',
      title: 'Faculty Management',
      options: [{ key: 'faculties', label: 'Faculty Management' }]
    },
    {
      id: 'mentor',
      title: 'Mentor Management',
      options: [{ key: 'mentors', label: 'Mentor Management' }]
    },
    {
      id: 'settings',
      title: 'Settings & Logs',
      options: [
        { key: 'admins', label: 'Sub-Admin Management' },
        { key: 'tasks', label: 'Task Management System' },
        { key: 'logs', label: 'System Interaction Logs' }
      ]
    }
  ];
  
  const permissionOptions = permissionCategories.flatMap(c => c.options);
  useEffect(() => {
    fetchSubAdmins();
  }, []);
  const fetchSubAdmins = async () => {
    try {
      const res = await api.get('/admin/sub-admins');
      if (res.data.success) {
        setSubAdmins(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching sub-admins:', error);
      toast.error("Failed to load admin accounts");
    } finally {
      setLoading(false);
    }
  };
  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      password: '',
      status: 'active',
      permissions: {}
    });
    setFullControl(false);
    setShowPassword(false);
    setIsModalOpen(true);
  };
  const handleOpenEdit = admin => {
    setEditingAdmin(admin);
    const perms = admin.permissions ? typeof admin.permissions === 'string' ? JSON.parse(admin.permissions) : admin.permissions : {};
    setFormData({
      name: admin.name,
      email: admin.email,
      phone_number: admin.phone_number || '',
      password: '',
      status: admin.status,
      permissions: perms
    });

    // Check if all permissions are true
    const isFull = permissionOptions.every(opt => perms[opt.key]);
    setFullControl(isFull);
    setShowPassword(false);
    setIsModalOpen(true);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAdmin) {
        await api.put(`/admin/sub-admins/${editingAdmin.id}`, formData);
        toast.success("Sub Admin updated successfully");
      } else {
        await api.post('/admin/sub-admins', formData);
        toast.success("Sub Admin created successfully");
      }
      setIsModalOpen(false);
      fetchSubAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (id, name) => {
    premiumConfirm(async () => {
      try {
        await api.delete(`/admin/sub-admins/${id}`);
        toast.success("Sub Admin deleted successfully");
        fetchSubAdmins();
      } catch (error) {
        toast.error("Failed to delete account");
      }
    }, {
      name: name,
      title: 'Delete Admin Account',
      message: `Are you sure you want to permanently delete the admin account for ${name}? This action will remove all their data from the database forever and cannot be undone.`,
      type: 'danger'
    });
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
 <Loader2 className="w-8 h-8 text-[#008080] animate-spin" />
 </div>;
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Page Header */}
      <div className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Sub-Admin Management</h2>
          <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center md:justify-start gap-3 mt-1">
            <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse"></div>
            Manage sub-admin accounts and their system permissions
          </p>
        </div>
        <button onClick={handleOpenCreate} className="bg-gradient-to-br from-slate-800 to-slate-900 text-[#008080] px-5 md:px-10 py-6 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4 hover:shadow-2xl hover:shadow-[#008080]/20 hover:-translate-y-1 transition-all group">
          <UserPlus size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
          <span>Add Sub-Admin</span>
        </button>
      </div>

 <div className="bg-white rounded-[2.5rem] md:border border-slate-100 md:shadow-sm overflow-hidden min-h-[500px]">
 <div className="overflow-x-auto">
 {/* Desktop Table View */}
 <table className="w-full text-left border-collapse hidden md:table">
 <thead>
 <tr className="bg-slate-50/40 border-b border-slate-100/50">
 <th className="p-4 md:p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] ">Admin Name</th>
 <th className="p-4 md:p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] ">Contact Details</th>
 <th className="p-4 md:p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] ">Status</th>
 <th className="p-4 md:p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] ">Created Date</th>
 <th className="p-4 md:p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {subAdmins.map((admin, index) => <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors group">
 <td className="p-4 md:p-8">
 <div className="flex items-center gap-5">
 <div className="w-14 h-14 bg-gradient-to-br from-[#008080] to-slate-900 rounded-[20px] flex items-center justify-center text-white font-black shadow-xl shadow-[#008080]/20 transition-transform group-hover:scale-110 group-hover:rotate-6">
 {admin.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <span className="text-lg font-black text-slate-800 block tracking-tighter leading-none uppercase group-hover:text-[#008080] transition-colors mb-2">{admin.name}</span>
 <div className="flex items-center gap-2">
 <Lock size={12} className="text-[#008080] opacity-60" />
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Sub-Admin</span>
 </div>
 </div>
 </div>
 </td>
 <td className="p-6">
 <div className="flex flex-col gap-1">
 <span className="text-xs font-bold text-slate-600">{admin.email}</span>
 <span className="text-xs font-bold text-slate-600">{admin.phone_number || 'No Phone'}</span>
 </div>
 </td>
 <td className="p-4 md:p-8">
   <span className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all group-hover:scale-105 ${admin.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : admin.status === 'inactive' ? 'bg-slate-50 text-slate-600 border-slate-100' : admin.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'}`}>
     {admin.status === 'active' ? 'Active' : admin.status === 'inactive' ? 'Backup' : admin.status === 'pending' ? 'Pending' : admin.status === 'left' ? 'Left' : admin.status}
   </span>
 </td>
 <td className="p-6">
 <span className="text-xs font-bold text-slate-500">
 {admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-GB') : 'N/A'}
 </span>
 </td>
 <td className="p-4 md:p-8 text-right">
 <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
 <button onClick={() => handleOpenEdit(admin)} className="w-12 h-12 rounded-[18px] flex items-center justify-center text-slate-300 hover:text-[#008080] hover:bg-[#008080]/10 transition-all border border-transparent hover:border-[#008080]/20 active:scale-90">
 <Edit size={22} strokeWidth={2.5} />
 </button>
 <button onClick={() => handleDelete(admin.id, admin.name)} className="w-12 h-12 rounded-[18px] flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 active:scale-95">
 <Trash2 size={22} strokeWidth={2.5} />
 </button>
 </div>
 </td>
 </tr>)}
 {subAdmins.length === 0 && <tr>
 <td colSpan="5" className="p-20 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
 <Shield size={32} />
 </div>
 <h3 className="text-lg font-black text-slate-900">No Sub Admins Found</h3>
 <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Create your first sub admin to start delegating work.</p>
 </div>
 </td>
 </tr>}
 </tbody>
 </table>

  {/* Mobile Card View */}
  <div className="md:hidden flex flex-col gap-4 p-4">
    {subAdmins.map((admin) => (
      <div key={admin.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Collapsed Header */}
        <div 
          className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => {
            setExpandedAdminId(expandedAdminId === admin.id ? null : admin.id);
            setActiveMoreMenuId(null);
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#008080] to-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-[#008080]/20 shrink-0">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{admin.name}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{admin.phone_number || 'No Phone'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${admin.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              {admin.status === 'active' ? 'Active' : admin.status}
            </span>
            {expandedAdminId === admin.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </div>

        {/* Expanded Content */}
        {expandedAdminId === admin.id && (
          <div className="px-5 pb-5 border-t border-slate-50 pt-4 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Address</span>
                <span className="text-xs font-bold text-slate-700">{admin.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Created On</span>
                <span className="text-xs font-bold text-slate-700">{admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Permissions Overview</span>
                <span className="text-xs font-bold text-[#008080] truncate block">
                  {(() => {
                    const perms = admin.permissions ? (typeof admin.permissions === 'string' ? JSON.parse(admin.permissions) : admin.permissions) : {};
                    const activePerms = permissionOptions.filter(opt => perms[opt.key]).map(opt => opt.label);
                    return activePerms.length > 0 ? activePerms.join(', ') : 'No Access';
                  })()}
                </span>
              </div>

              {/* Mobile Actions */}
              <div className="pt-4 mt-2 border-t border-slate-100 flex gap-2 relative">
                <button 
                  onClick={() => handleOpenEdit(admin)}
                  className="flex-1 bg-[#008080] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Edit size={14} /> Edit Admin
                </button>
                <button 
                  onClick={() => setActiveMoreMenuId(activeMoreMenuId === admin.id ? null : admin.id)}
                  className="w-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center relative"
                >
                  <MoreVertical size={16} />
                  
                  {activeMoreMenuId === admin.id && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                      <div 
                        className="p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(admin); setActiveMoreMenuId(null); }}
                      >
                        <Lock size={14} className="text-slate-400" /> Reset Password
                      </div>
                      <div 
                        className="p-3 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                        onClick={(e) => { e.stopPropagation(); handleDelete(admin.id, admin.name); setActiveMoreMenuId(null); }}
                      >
                        <Trash2 size={14} className="text-rose-400" /> Delete Admin
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    ))}

    {subAdmins.length === 0 && (
      <div className="flex flex-col items-center justify-center p-5 md:p-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-center mt-4">
        <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-300 mb-4">
          <Shield size={28} />
        </div>
        <h3 className="text-sm font-black text-slate-800">No Sub Admins Found</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Tap Add Sub-Admin to create one</p>
      </div>
    )}
  </div>
 </div>
 </div>

 <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAdmin ? "Edit Sub Admin" : "Create New Sub Admin"}>
 <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 w-full max-w-full">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
 {/* Name */}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
 <div className="relative group">
 <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input type="text" required className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold tracking-wide" placeholder="Enter full name" value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} />
 </div>
 </div>

 {/* Email */}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
 <div className="relative group">
 <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input type="email" required disabled={!!editingAdmin} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold tracking-wide disabled:opacity-50" placeholder="email@mashmagic.com" value={formData.email} onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} />
 </div>
 </div>

 {/* Phone */}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
 <div className="relative group">
 <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input type="tel" className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold tracking-wide" placeholder="Enter mobile number" value={formData.phone_number} onChange={e => setFormData({
                ...formData,
                phone_number: e.target.value
              })} />
 </div>
 </div>

 {/* Status */}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Account Status</label>
 <div className="flex gap-2">
 <button type="button" onClick={() => setFormData({
                ...formData,
                status: 'active'
              })} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${formData.status === 'active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
 <CheckCircle size={14} />
 Active
 </button>
 <button type="button" onClick={() => setFormData({
                ...formData,
                status: 'inactive'
              })} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${formData.status === 'inactive' ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
 <XCircle size={14} />
 Backup
 </button>
 </div>
 </div>

 {/* Password */}
  <div className="space-y-2 md:col-span-2">
  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
  {editingAdmin ? "Reset Password (Leave blank to keep)" : "Password"}
  <span className="text-rose-500 ml-1">{!editingAdmin && "*"}</span>
  </label>
  <div className="relative group">
  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
  <input type={showPassword ? "text" : "password"} required={!editingAdmin} className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold tracking-wide" placeholder="••••••••" value={formData.password} onChange={e => setFormData({
                ...formData,
                password: e.target.value
              })} />
  <button 
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
  >
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
  </div>
  {/* Password Strength Indicator */}
  {formData.password && (
    <div className="flex gap-1 mt-2 px-1">
      <div className={`h-1 flex-1 rounded-full ${formData.password.length > 0 ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
      <div className={`h-1 flex-1 rounded-full ${formData.password.length >= 6 ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
      <div className={`h-1 flex-1 rounded-full ${formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
    </div>
  )}
  </div>

 {/* Permissions Header */}
 <div className="md:col-span-2 pt-4 border-t border-slate-100 flex items-center justify-between">
 <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Sub-Admin Permissions</h4>
 <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:inline">Full Access Control</span>
 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest sm:hidden">Full Access</span>
 <button type="button" onClick={() => {
                const newVal = !fullControl;
                setFullControl(newVal);
                const newPerms = {};
                permissionOptions.forEach(opt => newPerms[opt.key] = newVal);
                setFormData({
                  ...formData,
                  permissions: newPerms
                });
              }} className={`w-12 h-6 sm:w-10 sm:h-5 rounded-full relative transition-all duration-300 shadow-inner ${fullControl ? 'bg-[#008080]' : 'bg-slate-300'}`}>
 <div className={`absolute top-1 sm:top-1 w-4 h-4 sm:w-3 sm:h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${fullControl ? 'left-7 sm:left-6' : 'left-1'}`}></div>
 </button>
 </div>
 </div>

 {/* Permissions Categories */}
 <div className="md:col-span-2 space-y-3">
    {permissionCategories.map((category) => (
      <div key={category.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedCategories({
            ...expandedCategories,
            [category.id]: !expandedCategories[category.id]
          })}
          className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-slate-50 transition-colors"
        >
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{category.title}</span>
          {expandedCategories[category.id] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        
        {expandedCategories[category.id] && (
          <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-100/50 mt-2 pt-4">
            {category.options.map(opt => (
              <button key={opt.key} type="button" onClick={() => {
                const newPerms = {
                  ...formData.permissions,
                  [opt.key]: !formData.permissions[opt.key]
                };
                setFormData({
                  ...formData,
                  permissions: newPerms
                });
                setFullControl(permissionOptions.every(o => newPerms[o.key]));
              }} className={`p-4 sm:p-3 rounded-2xl sm:rounded-xl border text-[11px] sm:text-[10px] font-bold text-left transition-all flex items-center justify-between sm:justify-start gap-3 ${formData.permissions[opt.key] ? 'bg-[#008080]/10 border-[#008080]/20 text-[#008080]' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 shadow-sm'}`}>
                <span className="order-1 sm:order-2">{opt.label}</span>
                <div className={`w-10 h-5 sm:w-4 sm:h-4 rounded-full sm:rounded-md border-2 relative transition-all order-2 sm:order-1 ${formData.permissions[opt.key] ? 'bg-[#008080] border-[#008080]' : 'bg-slate-100 border-slate-200'}`}>
                  {/* Mobile toggle dot (hidden on desktop) */}
                  <div className={`sm:hidden absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${formData.permissions[opt.key] ? 'left-6' : 'left-1'}`}></div>
                  {/* Desktop checkmark (hidden on mobile) */}
                  {formData.permissions[opt.key] && <div className="hidden sm:block absolute inset-0 flex items-center justify-center text-white"><CheckCircle size={12} strokeWidth={4} /></div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    ))}
 </div>
 </div>

  <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:flex-1 p-4 sm:p-5 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all text-center">
  Cancel
  </button>
  <button type="submit" disabled={isSubmitting} className="w-full sm:flex-[2] p-4 sm:p-5 bg-[#008080] text-white rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-[#006666] transition-all shadow-lg shadow-[#008080]/30 flex items-center justify-center gap-2 disabled:opacity-50">
  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <span>{editingAdmin ? "Update Admin" : "Create Sub-Admin"}</span>}
  </button>
  </div>
 </form>
 </Modal>
 </div>
  );
};
export default AdminManagement;