import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, MapPin, Lock, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const MentorSignup = () => {
 const navigate = useNavigate();
 const [formData, setFormData] = useState({
 name: '',
 phone_number: '',
 place: '',
 password: ''
 });
 const [loading, setLoading] = useState(false);

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 await api.post('/auth/signup/mentor', formData);
 toast.success("Mentor Account Created Successfully! Please Login.");
 navigate('/login'); // Redirect to generic login, or specific mentor login if I create one
 } catch (error) {
 toast.error(error.response?.data?.message || "Signup failed");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
 <div className="max-w-md w-full bg-white p-5 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

 <div className="text-center mb-10 relative z-10">
 <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Mentor Access</h1>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Join the Elite Teaching Force</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
 <div className="relative group">
 <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-600 transition-colors" />
 <input
 name="name"
 type="text"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all font-bold text-slate-700"
 placeholder="John Doe"
 value={formData.name}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
 <div className="relative group">
 <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-600 transition-colors" />
 <input
 name="phone_number"
 type="tel"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all font-bold text-slate-700"
 placeholder="+91 9876543210"
 value={formData.phone_number}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Place / City</label>
 <div className="relative group">
 <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-600 transition-colors" />
 <input
 name="place"
 type="text"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all font-bold text-slate-700"
 placeholder="New York, USA"
 value={formData.place}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Password</label>
 <div className="relative group">
 <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-600 transition-colors" />
 <input
 name="password"
 type="password"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all font-bold text-slate-700"
 placeholder="••••••••"
 value={formData.password}
 onChange={handleChange}
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-purple-600 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-200 hover:bg-purple-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-4"
 >
 {loading ? <Loader2 size={20} className="animate-spin" /> : <>Register <ArrowRight size={18} /></>}
 </button>

 <div className="text-center mt-6">
 <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
 Already have an account?{' '}
 <Link to="/login" className="text-purple-600 hover:text-purple-800 transition-colors">Login</Link>
 </p>
 </div>
 </form>
 </div>
 </div>
 );
};

export default MentorSignup;
