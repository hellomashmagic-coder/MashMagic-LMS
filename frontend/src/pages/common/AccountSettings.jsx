import React, { useState, useEffect } from 'react';
import { User, Mail, Smartphone, MapPin, Lock, Save, ArrowLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AccountSettings = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone_number: user?.phone_number || '',
        place: user?.place || ''
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone_number: user.phone_number || '',
                place: user.place || ''
            });
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await api.put('/auth/update-profile', profileData);
            if (res.data.success) {
                updateUser(res.data.user);
                toast.success("Profile metadata synchronized!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Profile update failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) return toast.error("New passwords do not match");
        if (passwordData.new.length < 6) return toast.error("Security key must be at least 6 characters");

        try {
            setUpdatingPassword(true);
            const res = await api.put('/auth/change-password', {
                currentPassword: passwordData.current,
                newPassword: passwordData.new
            });
            if (res.data.success) {
                toast.success("Access credentials updated!");
                setPasswordData({ current: '', new: '', confirm: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Credential update failed");
        } finally {
            setUpdatingPassword(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 pb-32 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-[#008080] font-black text-[10px] uppercase tracking-widest transition-colors mb-4"
                    >
                        <ArrowLeft size={16} /> Return to Profile
                    </button>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Account Configuration</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Manage your profile and security settings</p>
                </div>
                <div className="flex items-center gap-4 px-6 py-4 bg-emerald-50 rounded-[28px] border border-emerald-100">
                    <ShieldCheck className="text-emerald-500" size={24} />
                    <div>
                        <p className="text-[10px] font-black text-emerald-900 uppercase leading-none mb-1">Account Access</p>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Auth Level: {user?.role?.toUpperCase()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Personal Information Section */}
                <div className="space-y-8">
                    <div className="bg-white p-5 md:p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-10 flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#008080]/10 rounded-xl flex items-center justify-center text-[#008080]">
                                <User size={20} />
                            </div>
                            Personal Details
                        </h3>

                        <form onSubmit={handleProfileUpdate} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#008080]/10 outline-none transition-all"
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#008080]/10 outline-none transition-all"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="text"
                                                value={profileData.phone_number}
                                                onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#008080]/10 outline-none transition-all"
                                                placeholder="Phone number"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="text"
                                                value={profileData.place}
                                                onChange={(e) => setProfileData({...profileData, place: e.target.value})}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#008080]/10 outline-none transition-all"
                                                placeholder="Location"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full mt-6 py-5 bg-[#008080] text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#008080] transition-all shadow-xl shadow-[#008080]/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {loading ? 'Syncing Profile...' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Security Section */}
                {user?.role !== 'mentor' && user?.role !== 'faculty' && (
                <div className="space-y-8">
                    <div className="bg-[#008080] p-5 md:p-10 rounded-[48px] shadow-2xl shadow-[#008080]/40 relative overflow-hidden group">
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#008080]/10 rounded-full -mb-24 -ml-24 blur-3xl transition-colors duration-1000"></div>
                        
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-10 flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                <KeyRound size={20} />
                            </div>
                            Change Password
                        </h3>

                        <form onSubmit={handlePasswordChange} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Current Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="password"
                                        required
                                        value={passwordData.current}
                                        onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-[#008080]/20 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="password"
                                        required
                                        value={passwordData.new}
                                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-[#008080]/20 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="password"
                                        required
                                        value={passwordData.confirm}
                                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-[#008080]/20 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={updatingPassword}
                                className="w-full mt-6 py-5 bg-[#008080] text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#009090] transition-all shadow-xl shadow-[#008080]/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {updatingPassword ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
                                {updatingPassword ? 'Updating Credentials...' : 'Update Password'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-50 p-4 md:p-8 rounded-[40px] border border-slate-100 flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Privacy Notice</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">
                                Changing your access key will require a fresh login across all active sessions on other devices for security synchronization.
                            </p>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default AccountSettings;
