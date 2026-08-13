import React, { useState } from 'react';
import { User, Mail, Shield, Smartphone, Camera, Save, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Profile = () => {
 const { user, setAuthData } = useAuth();
 const [isEditing, setIsEditing] = useState(false);
 const [loading, setLoading] = useState(false);

 // Profile Data
 const [formData, setFormData] = useState({
 name: user?.name || '',
 email: user?.email || '',
 phone_number: user?.phone_number || '',
 });

 // Password Update Data
 const [passwordData, setPasswordData] = useState({
 currentPassword: '',
 newPassword: '',
 confirmPassword: ''
 });

 const handleProfileUpdate = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const token = sessionStorage.getItem('token');
 const res = await axios.put(`/api/admin/users/${user.id}`, {
 ...formData,
 role: user.role,
 status: user.status
 }, {
 headers: { Authorization: `Bearer ${token}` }
 });

 if (res.data.success) {
 // Update local auth state to reflect new name/email
 setAuthData({
 token: sessionStorage.getItem('token'),
 user: { ...user, ...formData },
 role: user.role
 });
 toast.success('Profile updated successfully!', {
 icon: <CheckCircle2 className="text-[#008080]" />,
 style: { borderRadius: '20px', background: '#fff', color: '#0f172a' }
 });
 setIsEditing(false);
 }
 } catch (error) {
 toast.error(error.response?.data?.message || 'Failed to update profile');
 } finally {
 setLoading(false);
 }
 };

 const handlePasswordChange = async (e) => {
 e.preventDefault();
 if (passwordData.newPassword !== passwordData.confirmPassword) {
 return toast.error("Passwords don't match");
 }
 
 setLoading(true);
 try {
 const token = sessionStorage.getItem('token');
 // Assuming we reuse the update-user route or have a dedicated one. 
 // For now, let's assume we have a dedicated password route or pass it to update-user.
 // Many apps use a separate POST /api/auth/change-password.
 const res = await axios.put(`/api/admin/sub-admins/${user.id}`, {
 ...formData,
 password: passwordData.newPassword
 }, {
 headers: { Authorization: `Bearer ${token}` }
 });

 if (res.data.success) {
 toast.success('Security settings updated!');
 setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
 }
 } catch (error) {
 toast.error(error.response?.data?.message || 'Failed to update password');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-700">
 {/* Header */}
 <div className="mb-10 text-center md:text-left">
 <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Account Control</h1>
 <p className="text-slate-500 font-medium">Manage your professional credentials and secure your access.</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Sidebar Card */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
 <div className="h-24 bg-gradient-to-br from-[#008080] to-teal-400 relative">
 <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
 <div className="relative group">
 <div className="w-24 h-24 bg-[#008080] rounded-[28px] border-4 border-white flex items-center justify-center text-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
 <User size={40} className="opacity-80" />
 </div>
 <button className="absolute bottom-0 right-0 p-2 bg-white text-slate-900 rounded-xl shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
 <Camera size={14} />
 </button>
 </div>
 </div>
 </div>
 <div className="pt-16 pb-8 px-6 text-center">
 <h2 className="text-xl font-black text-slate-900 mb-1">{user?.name}</h2>
 <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#008080]/10 text-[#008080] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#008080]/10">
 <Shield size={10} />
 {user?.role?.replace('_', ' ')}
 </span>
 </div>
 <div className="border-t border-slate-50 p-4 space-y-1">
 <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[#008080] bg-[#008080]/5 rounded-2xl transition-all">
 <User size={18} />
 Personal Info
 </button>
 <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">
 <Lock size={18} />
 Security & Privacy
 </button>
 </div>
 </div>

 <div className="bg-amber-50/50 border border-amber-200/50 rounded-3xl p-6">
 <div className="flex items-start gap-4">
 <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
 <AlertCircle size={20} />
 </div>
 <div>
 <h4 className="text-sm font-black text-amber-900 tracking-tight">Security Alert</h4>
 <p className="text-xs text-amber-700/80 font-medium leading-relaxed mt-1">
 Avoid sharing your credentials. System access is logged and verified per session.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content Area */}
 <div className="lg:col-span-2 space-y-8">
 {/* Personal Information */}
 <div className="bg-white rounded-[32px] border border-slate-200 p-4 md:p-8 shadow-xl shadow-slate-200/50">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
 <User size={20} />
 </div>
 Identity Details
 </h3>
 <button 
 onClick={() => setIsEditing(!isEditing)}
 className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
 isEditing 
 ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
 : 'bg-[#008080] text-white shadow-lg shadow-[#008080]/20 hover:opacity-90'
 }`}
 >
 {isEditing ? 'Cancel' : 'Modify'}
 </button>
 </div>

 <form onSubmit={handleProfileUpdate} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Display Name</label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
 <User size={18} />
 </div>
 <input 
 type="text" 
 disabled={!isEditing}
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all disabled:opacity-50"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Email Terminal</label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
 <Mail size={18} />
 </div>
 <input 
 type="email" 
 disabled={!isEditing}
 value={formData.email}
 onChange={(e) => setFormData({...formData, email: e.target.value})}
 className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all disabled:opacity-50"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Phone Link</label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
 <Smartphone size={18} />
 </div>
 <input 
 type="text" 
 disabled={!isEditing}
 value={formData.phone_number}
 onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
 className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all disabled:opacity-50"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Access Tier</label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
 <Shield size={18} />
 </div>
 <input 
 type="text" 
 disabled
 value={user?.role?.toUpperCase()}
 className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-[#008080] opacity-80 cursor-not-allowed"
 />
 </div>
 </div>
 </div>

 {isEditing && (
 <button 
 type="submit"
 disabled={loading}
 className="w-full md:w-auto flex items-center justify-center gap-3 px-4 md:px-8 py-4 bg-[#008080] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#008080]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
 >
 <Save size={18} />
 Synchronize Changes
 </button>
 )}
 </form>
 </div>

 {/* Security Update */}
 <div className="bg-white rounded-[32px] border border-slate-200 p-4 md:p-8 shadow-xl shadow-slate-200/50">
 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight mb-8">
 <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
 <Lock size={20} />
 </div>
 Access Security
 </h3>

 <form onSubmit={handlePasswordChange} className="space-y-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Current Passcode</label>
 <input 
 type="password" 
 value={passwordData.currentPassword}
 onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none"
 />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">New Terminal Secret</label>
 <input 
 type="password" 
 value={passwordData.newPassword}
 onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all outline-none"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Re-verify Secret</label>
 <input 
 type="password" 
 value={passwordData.confirmPassword}
 onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all outline-none"
 />
 </div>
 </div>
 <button 
 type="submit"
 disabled={loading}
 className="w-full md:w-auto flex items-center justify-center gap-3 px-4 md:px-8 py-4 bg-[#008080] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#008080]/20 hover:scale-[1.02] active:scale-95 transition-all"
 >
 <Lock size={18} />
 Rotate Passcode
 </button>
 </form>
 </div>
 </div>
 </div>
 </div>
 );
};

export default Profile;
