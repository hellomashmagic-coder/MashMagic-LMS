import React, { useState } from 'react';
import axios from 'axios';
import {
  UserPlus,
  Phone,
  MapPin,
  Lock,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const MentorRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    place: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Mentor name is required';
        break;
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = 'Invalid email address';
        }
        break;
      case 'phone_number':
        if (!value) {
          error = 'Phone number is required';
        } else if (!/^\d{10,15}$/.test(value.replace(/[^0-9]/g, ''))) {
          error = 'Invalid phone number';
        }
        break;
      case 'place':
        if (!value.trim()) error = 'Location is required';
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post('/api/mentor-head/register-mentor', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Mentor registered successfully!");
        setFormData({
          name: '',
          email: '',
          phone_number: '',
          place: '',
          password: ''
        });
        setErrors({});
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Visual Side */}
        <div className="md:w-2/5 bg-[#008080] p-4 md:p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full blur-2xl md:blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full blur-2xl md:blur-3xl opacity-50 animate-pulse delay-700"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-md rounded-[1rem] md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-white/20">
              <ShieldCheck size={28} className="md:w-8 md:h-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none mb-3 md:mb-4">
              Expand Your<br />Network.
            </h2>
            <p className="text-emerald-50 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-relaxed">
              Onboard new mentors into the MashMagic ecosystem.
            </p>
          </div>

          <div className="relative z-10 mt-8 md:mt-12 bg-white/5 backdrop-blur-sm p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 hidden sm:block">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-400 flex items-center justify-center text-slate-900 shrink-0">
                <ShieldCheck size={14} className="md:w-4 md:h-4" />
              </div>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#008080]">Secure Registration</span>
            </div>
            <p className="text-[10px] md:text-xs text-white/80 leading-relaxed">
              Passwords are automatically hashed and data is encrypted before storage.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="md:w-3/5 p-6 md:p-12 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 gap-5 md:gap-6">
              
              {/* Full Name */}
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 md:ml-2">Mentor Name</label>
                <div className="relative group">
                  <div className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#008080]'}`}>
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    placeholder="MENTOR NAME"
                    className={`w-full min-h-[48px] md:min-h-0 pl-11 md:pl-14 pr-4 md:pr-6 py-3.5 md:py-5 bg-slate-50 border rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-bold tracking-wide transition-all outline-none ${
                      errors.name 
                        ? 'border-rose-200 focus:border-rose-300 focus:ring-2 ring-rose-100 bg-rose-50/30' 
                        : 'border-transparent focus:ring-2 ring-[#008080]/20 focus:bg-white'
                    }`}
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-2 animate-in fade-in slide-in-from-top-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 md:ml-2">Email ID</label>
                <div className="relative group">
                  <div className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#008080]'}`}>
                    <User size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="EMAIL ADDRESS"
                    className={`w-full min-h-[48px] md:min-h-0 pl-11 md:pl-14 pr-4 md:pr-6 py-3.5 md:py-5 bg-slate-50 border rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-bold tracking-wide transition-all outline-none ${
                      errors.email 
                        ? 'border-rose-200 focus:border-rose-300 focus:ring-2 ring-rose-100 bg-rose-50/30' 
                        : 'border-transparent focus:ring-2 ring-[#008080]/20 focus:bg-white'
                    }`}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-2 animate-in fade-in slide-in-from-top-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 md:ml-2">Phone Number</label>
                <div className="relative group">
                  <div className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.phone_number ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#008080]'}`}>
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="phone_number"
                    placeholder="PHONE NUMBER"
                    className={`w-full min-h-[48px] md:min-h-0 pl-11 md:pl-14 pr-4 md:pr-6 py-3.5 md:py-5 bg-slate-50 border rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-bold tracking-wide transition-all outline-none ${
                      errors.phone_number 
                        ? 'border-rose-200 focus:border-rose-300 focus:ring-2 ring-rose-100 bg-rose-50/30' 
                        : 'border-transparent focus:ring-2 ring-[#008080]/20 focus:bg-white'
                    }`}
                    value={formData.phone_number}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.phone_number && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-2 animate-in fade-in slide-in-from-top-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{errors.phone_number}</span>
                  </div>
                )}
              </div>

              {/* Place */}
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 md:ml-2">Location</label>
                <div className="relative group">
                  <div className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.place ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#008080]'}`}>
                    <MapPin size={18} />
                  </div>
                  <input
                    type="text"
                    name="place"
                    placeholder="LOCATION"
                    className={`w-full min-h-[48px] md:min-h-0 pl-11 md:pl-14 pr-4 md:pr-6 py-3.5 md:py-5 bg-slate-50 border rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-bold tracking-wide transition-all outline-none ${
                      errors.place 
                        ? 'border-rose-200 focus:border-rose-300 focus:ring-2 ring-rose-100 bg-rose-50/30' 
                        : 'border-transparent focus:ring-2 ring-[#008080]/20 focus:bg-white'
                    }`}
                    value={formData.place}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.place && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-2 animate-in fade-in slide-in-from-top-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{errors.place}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 md:ml-2">Password</label>
                <div className="relative group">
                  <div className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#008080]'}`}>
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="PASSWORD"
                    className={`w-full min-h-[48px] md:min-h-0 pl-11 md:pl-14 pr-12 md:pr-14 py-3.5 md:py-5 bg-slate-50 border rounded-xl md:rounded-[1.5rem] text-[13px] md:text-sm font-bold tracking-wide transition-all outline-none ${
                      errors.password 
                        ? 'border-rose-200 focus:border-rose-300 focus:ring-2 ring-rose-100 bg-rose-50/30' 
                        : 'border-transparent focus:ring-2 ring-[#008080]/20 focus:bg-white'
                    }`}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-2 animate-in fade-in slide-in-from-top-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{errors.password}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] md:min-h-[56px] bg-[#008080] text-white rounded-xl md:rounded-[1.5rem] py-4 md:py-5 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl hover:shadow-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-[#008080] disabled:active:scale-100 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Authorize Registration</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MentorRegistration;
