import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Phone, Lock, LogIn, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import mlogo from '../../assets/mlogo.png';

const MentorLogin = () => {
 const [formData, setFormData] = useState({
 phone_number: '',
 password: ''
 });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const { login, setAuthData } = useAuth();
 const navigate = useNavigate();

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 // Use phone_number as identifier
 const user = await login(formData.phone_number, formData.password);
 const role = user.role?.toLowerCase().trim();

 if (role === 'mentor') {
 toast.success(`Welcome Mentor ${user.name}!`);
 navigate('/mentor/dashboard');
 } else {
 toast.error("Access Restricted: Mentor Area Only");
 // Optional: Logout if role mismatch
 // logout();
 }
 } catch (error) {
 const errorMsg = error.response?.data?.message || "Login failed. Check phone/password.";
 toast.error(errorMsg);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
 <div className="max-w-md w-full bg-white p-5 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-[#008080]/10 rounded-full -mr-16 -mt-16 opacity-50"></div>

 <div className="text-center mb-10 relative z-10">
 <div className="w-28 h-28 flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110 duration-500 bg-transparent">
 <img src={mlogo} alt="Logo" className="w-full h-full object-contain scale-[2.5]" />
 </div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mentor Login</h1>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Secure Access Portal</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
 <div className="relative group">
 <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input
 name="phone_number"
 type="tel"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#f8ba2b] transition-all font-bold text-slate-700"
 placeholder="+91 9876543210"
 value={formData.phone_number}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Password</label>
 <div className="relative group">
 <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input
 name="password"
 type="password"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#f8ba2b] transition-all font-bold text-slate-700"
 placeholder="••••••••"
 value={formData.password}
 onChange={handleChange}
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={isSubmitting}
 className="w-full bg-[#008080] text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#008080]/30 hover:bg-[#008080] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-4"
 >
 {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <>Login <ChevronRight size={18} /></>}
 </button>

 <div className="text-center mt-6">
 <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
 New Mentor?{' '}
 <Link to="/mentor/signup" className="text-[#008080] hover:text-[#008080] transition-colors">Register Here</Link>
 </p>
 </div>
 </form>
 </div>
 </div>
 );
};

export default MentorLogin;
