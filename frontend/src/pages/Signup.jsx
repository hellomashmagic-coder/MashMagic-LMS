import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Loader2, UserPlus, ChevronRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Signup = () => {
 const [formData, setFormData] = useState({
 name: '',
 email: '',
 password: ''
 });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [checkingSuper, setCheckingSuper] = useState(true);
 const navigate = useNavigate();

 React.useEffect(() => {
 const checkSuperAdmin = async () => {
 try {
 const res = await api.get('/auth/check-super-admin');
 if (res.data.success && res.data.exists) {
 toast.error("Super Admin already exists. Public registration is disabled.");
 navigate('/login');
 }
 } catch (error) {
 console.error("Check failed:", error);
 } finally {
 setCheckingSuper(false);
 }
 };
 checkSuperAdmin();
 }, [navigate]);

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 await api.post('/auth/register', formData);
 toast.success("Account created successfully! Please login.");
 navigate('/login');
 } catch (error) {
 toast.error(error.response?.data?.message || "Registration failed. Try again.");
 } finally {
 setIsSubmitting(false);
 }
 };

 if (checkingSuper) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-600 animate-pulse">Verifying System State...</div>;

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
 <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
 {/* Brand / Header */}
 <div className="text-center mb-10 flex flex-col items-center">
 <div className="w-16 h-16 bg-[#008080] rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-[#008080]/20 rotate-3 transition-transform hover:rotate-0">
 <UserPlus size={36} />
 </div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tight">Join Network</h1>
 <p className="text-slate-500 font-semibold mt-1 uppercase tracking-widest text-[10px]">Create Your Identity</p>
 </div>

 {/* Card */}
 <div className="bg-white p-5 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-[#008080]/10 rounded-full -mr-16 -mt-16 opacity-50"></div>

 <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
 <div className="relative group">
 <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input
 name="name"
 type="text"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#f8ba2b] transition-all font-medium"
 placeholder="Enter your name"
 value={formData.name}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
 <div className="relative group">
 <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input
 name="email"
 type="email"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#f8ba2b] transition-all font-medium"
 placeholder="your@email.com"
 value={formData.email}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Password</label>
 <div className="relative group">
 <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
 <input
 name="password"
 type="password"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] focus:border-[#f8ba2b] transition-all font-medium"
 placeholder="Create password"
 value={formData.password}
 onChange={handleChange}
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={isSubmitting}
 className="w-full bg-[#008080] text-white p-4 rounded-2xl font-black text-sm hover:bg-[#006666] transition-all shadow-lg shadow-[#008080]/20 flex items-center justify-center gap-2 group mt-2"
 >
 {isSubmitting ? (
 <Loader2 size={20} className="animate-spin" />
 ) : (
 <>
 <span>Create Account</span>
 <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
 </>
 )}
 </button>
 </form>

 <div className="mt-8 pt-6 border-t border-slate-50 text-center">
 <p className="text-slate-500 text-sm font-bold/80">
 Already registered? {' '}
 <Link to="/login" className="text-[#008080] hover:text-[#008080] transition-colors underline underline-offset-4 decoration-2 font-black">
 Login Here
 </Link>
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};

export default Signup;
