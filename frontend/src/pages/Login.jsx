import React, { useState, useEffect } from 'react'; // Verified Login Component
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ChevronRight, 
  Eye, 
  EyeOff,
  Building2,
  Check
} from 'lucide-react';
import mlogo from '../assets/mlogo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({
    fullName: '',
    phone: '',
    place: ''
  });
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  // Map sub-roles for better selection
  const subRoles = {
    'admin': ['Super Admin', 'Sub Admin'],
    'academic': ['Academic Head', 'AOE', 'SSC', 'Faculty'],
    'mentor': ['Mentor Head', 'Mentor']
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password || !dept || !role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let finalRole = role.toLowerCase().replace(/ /g, '_');
      // Normalize SSC role mapping
      if (role === 'SSC') finalRole = 'ssc';
      if (role === 'AOE') finalRole = 'academic_operation_executive';

      // Map frontend dept to backend department parameter
      const deptMap = {
        'admin': 'admin',
        'mentor': 'mentor_dept',
        'academic': 'academic_dept',
        'faculty': 'academic_dept'
      };
      
      const response = await api.post('/auth/login', { 
        email, 
        password, 
        role: finalRole,
        department: deptMap[dept]
      });
      
      if (response.data.token) {
        // Update authentication state reactively
        setAuthData({
          ...response.data,
          role: finalRole
        });
        
        toast.success("Welcome to MashMagic");
        
        if (finalRole === 'super_admin' || finalRole === 'sub_admin') navigate('/admin/dashboard');
        else if (finalRole === 'academic_head') navigate('/academic-head/dashboard');
        else if (finalRole === 'academic_operation_executive') navigate('/aoe/dashboard');
        else if (finalRole === 'mentor_head') navigate('/mentor-head/dashboard');
        else if (finalRole === 'mentor') navigate('/mentor/dashboard');
        else if (finalRole === 'faculty_head') navigate('/faculty-head/dashboard');
        else if (finalRole === 'faculty') navigate('/faculty/dashboard');
        else if (finalRole === 'ssc') navigate('/ssc/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!regData.fullName || !email || !password || !regData.phone || !regData.place) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    toast.loading('Registering Account...');
    
    try {
      let finalRole = role.toLowerCase().replace(/ /g, '_');
      if (role === 'AOE') finalRole = 'academic_operation_executive';
      const response = await api.post('/auth/register', {
        name: regData.fullName,
        email: email,
        password: password,
        phone_number: regData.phone,
        place: regData.place,
        role: finalRole
      });

      if (response.data.success) {
        toast.dismiss();
        
        // Specialized messages based on role
        if (finalRole === 'super_admin' || finalRole === 'admin') {
          toast.success("Account Created. Welcome to MashMagic");
        } else {
          toast.success("Account Created. Waiting for Admin Approval");
        }

        setIsRegistering(false);
        // Clear fields
        setRegData({ fullName: '', phone: '', place: '' });
        setPassword('');
        setEmail('');
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 relative overflow-x-hidden overflow-y-auto bg-[#020617]">
      {/* Enterprise Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0d9488]/15 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1e1b4b]/40 blur-[150px] rounded-full" />
      
      {/* Main Vault Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white/[0.02] backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500">
        
        {/* Visual Branding Section */}
        <div className="hidden lg:flex flex-col justify-between items-center text-center p-4 md:p-8 lg:p-12 lg:py-20 bg-gradient-to-br from-[#0d9488]/10 to-transparent border-r border-white/5 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <img src={mlogo} className="h-24 w-auto object-contain mb-8 drop-shadow-xl mx-auto scale-[2.5]" alt="Logo" />
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#0d9488] rounded-xl flex items-center justify-center shadow-lg shadow-[#0d9488]/30">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter uppercase">MashMagic <span className="text-[#0d9488]">Hub</span></span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white leading-[1.1] mb-6 tracking-tight max-w-md mx-auto">
              Welcome to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d9488] to-[#2dd4bf]">MashMagic Portal.</span>
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-sm font-medium mx-auto">
              Manage your academic activities, mentorships, and student progress seamlessly.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md w-full max-w-sm">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] bg-slate-800 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-300 font-bold tracking-tight">
                <span className="text-white font-black">500+</span> Professionals Online
              </p>
            </div>
          </div>
        </div>

        {/* Login/Signup Form Section */}
        <div className="p-6 md:p-8 flex flex-col justify-center">

          {/* Mobile Logo */}
          <div className="flex lg:hidden justify-center mb-10 mt-12">
            <img src={mlogo} className="h-16 w-auto object-contain drop-shadow-xl scale-[1.8]" alt="Logo" />
          </div>
          
          {/* Heading Section */}
          <div className="mb-4">
            <h2 className="text-3xl font-black text-[#0d9488] mb-1 tracking-tight uppercase drop-shadow-md">
              Account Login
            </h2>
            <p className="text-[#f8ba2b] text-[9px] font-black uppercase tracking-[0.3em] opacity-90">
              Please enter your details to sign in
            </p>
          </div>

          {!isRegistering ? (
            <div className="transition-all duration-300">
              {/* Department Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['admin', 'mentor', 'academic'].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDept(d); setRole(''); }}
                    className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 border ${
                      dept === d 
                      ? 'bg-gradient-to-br from-[#0d9488]/30 to-[#14b8a6]/10 backdrop-blur-xl border-[#0d9488]/50 shadow-[0_0_20px_rgba(13,148,136,0.3)] scale-105' 
                      : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className={dept === d ? "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400" : ""}>
                      {d}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Role Selector */}
                <div className="space-y-3">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1 drop-shadow-sm">Select Your Role</label>
                  <div className="flex flex-wrap gap-2">
                    {dept && subRoles[dept].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 border ${
                          role === r 
                          ? 'bg-gradient-to-r from-[#0d9488]/40 to-transparent backdrop-blur-md text-white border-[#0d9488] shadow-lg shadow-[#0d9488]/20 ring-1 ring-[#0d9488]/50' 
                          : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Credential ID */}
                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1 drop-shadow">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none">
                      <User size={18} />
                    </div>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-6 py-3 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                    />
                  </div>
                </div>

                {/* Security Key */}
                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1 drop-shadow">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-12 py-3 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0d9488] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          className="peer hidden"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <div className="w-5 h-5 border-2 border-[#0d9488]/30 rounded-lg bg-white/5 peer-checked:bg-[#0d9488] peer-checked:border-[#0d9488] transition-all duration-300 shadow-inner"></div>
                        <Check className="absolute w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform duration-300 left-[4px]" />
                      </div>
                      <span className="text-[11px] font-black text-slate-600 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">
                        Remember Me
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-[11px] font-black text-[#f8ba2b] hover:text-yellow-400 transition-colors tracking-widest uppercase underline underline-offset-4"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {(role === 'Super Admin' || role === 'Academic Head' || role === 'AOE' || role === 'Mentor Head' || role === 'Faculty') && role !== 'SSC' && (
                    <div className="flex justify-center pt-2 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={() => setIsRegistering(true)}
                        className="text-[11px] text-[#0d9488] font-black tracking-[0.15em] uppercase hover:text-[#14b8a6] transition-all flex items-center gap-2 group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488] group-hover:animate-ping" />
                        Create {role} Account
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-4 bg-[#f8ba2b] hover:bg-[#eab308] text-black font-black rounded-2xl transition-all duration-300 transform active:scale-95 shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-4 group relative overflow-hidden"
                >
                  <span className="relative uppercase tracking-[0.3em] text-xs">{loading ? 'SIGNING IN...' : 'SIGN IN'}</span>
                  {!loading && <ShieldCheck className="relative w-5 h-5 group-hover:scale-110 transition-transform" />}
                </button>
              </form>
            </div>
          ) : (
            <div className="relative transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-[0.1em] uppercase drop-shadow-lg">Create Account</h2>
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#0d9488] transition-all border border-white/5"
                >
                  <ChevronRight className="rotate-180" size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1">Full Name</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none" />
                    <input 
                      type="text"
                      placeholder="John Doe"
                      className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                      value={regData.fullName}
                      onChange={(e) => setRegData({...regData, fullName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1">Email Address</label>
                  <div className="relative group">
                    <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none" />
                    <input 
                      type="email"
                      placeholder={`primary@${role.toLowerCase().replace(' ', '')}.com`}
                      className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1">Phone Number</label>
                    <div className="relative group">
                      <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none" />
                      <input 
                        type="tel"
                        placeholder="+91 ...."
                        className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20_px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                        value={regData.phone}
                        onChange={(e) => setRegData({...regData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1">Location / Place</label>
                    <div className="relative group">
                      <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="Location"
                        className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                        value={regData.place}
                        onChange={(e) => setRegData({...regData, place: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] pl-1">Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0d9488] transition-colors pointer-events-none" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full bg-white text-slate-900 rounded-2xl pl-12 pr-12 py-4 text-sm font-black outline-none border-b-4 border-slate-200 focus:border-[#0d9488] transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] placeholder:text-slate-300 cursor-text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0d9488] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-4 bg-gradient-to-r from-[#0d9488] to-[#14b8a6] hover:from-[#0f766e] hover:to-[#0d9488] text-white font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#0d9488]/20 active:scale-95"
                >
                  <span>Register as {role}</span>
                  <ShieldCheck size={18} />
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <ShieldCheck key={i} size={14} className="text-[#0d9488]/40" />
              ))}
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] text-[#f8ba2b] font-black uppercase tracking-[0.3em] drop-shadow">
                Secured by MashMagic LMS Portal
              </p>
              <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
                Developed by <a href="https://linkedin.com/in/bibinthankachan" target="_blank" rel="noopener noreferrer" className="text-[#f8ba2b] hover:text-yellow-400 hover:underline transition-all font-black">Bibin Thankachan</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
