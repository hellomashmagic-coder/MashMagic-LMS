import React, { useState, useEffect, useRef } from 'react';
import axios from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User, Phone, Lock, Camera, CheckCircle, Shield, Mail, Info, ArrowRight,
  BookOpen, Clock, Calendar, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const LANG_OPTIONS = [
  { id: 'ENG-100', label: 'English - 100%' },
  { id: 'BL-ADV-MAL', label: 'Bilingual - Advanced (70% English, 30% Malayalam)' },
  { id: 'BL-SMP-MAL', label: 'Bilingual - Simple (70% Malayalam, 30% English)' },
  { id: 'MAL-ONLY', label: 'Malayalam Only' },
  { id: 'HIN-100', label: 'Hindi 100%' },
  { id: 'BL-ADV-HIN', label: 'Bilingual - Advanced (70% Hindi, 30% English)' },
  { id: 'BL-SMP-HIN', label: 'Bilingual - Simple (70% English, 30% Hindi)' },
  { id: 'ARB-100', label: 'Arabic 100%' },
  { id: 'TAM-100', label: 'Tamil 100%' }
];

const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Science", "Social Science", "Social", "History", 
  "Geography", "Political Science", "English", "Hindi", "Malayalam", "Accountancy", 
  "Business Studies", "Business", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"
];

const SYLLABUS_OPTIONS = ["CBSE", "STATE", "ICSE", "IGCSE", "IB"];

const TIME_SLOTS_24 = [];
for (let h = 6; h <= 22; h++) {
  ['00', '15', '30', '45'].forEach(m => {
    const hh24 = h.toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = (h % 12 || 12).toString().padStart(2, '0');
    TIME_SLOTS_24.push({ val24: `${hh24}:${m}`, val12: `${h12}:${m} ${ampm}` });
  });
}
TIME_SLOTS_24.push({ val24: '23:00', val12: '11:00 PM' });

const to24H = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return timeStr;
};

const FacultyProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    phone_number: '',
    faculty_id_card: '',
    section: '',
    syllabus: [],
    languages_proficiency: [],
    qualification: '',
    experience: '',
    availability: [''],
    hourly_rate: '',
    teaching_mode: 'Both',
    joining_date: '',
    remarks: '',
    primary_subject: '',
    secondary_subjects: [],
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [dropdowns, setDropdowns] = useState({
    primary: false,
    secondary: false,
    section: false,
    syllabus: false,
    language: false
  });

  const refs = {
    primary: useRef(null),
    secondary: useRef(null),
    section: useRef(null),
    syllabus: useRef(null),
    language: useRef(null)
  };

  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      let closedAny = false;
      const newDropdowns = { ...dropdowns };
      Object.keys(refs).forEach(key => {
        if (refs[key].current && !refs[key].current.contains(event.target)) {
          if (newDropdowns[key]) {
            newDropdowns[key] = false;
            closedAny = true;
          }
        }
      });
      if (closedAny) setDropdowns(newDropdowns);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdowns]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/faculty/profile');
      if (res.data.success) {
        const u = res.data.data;
        updateUser(u);
        setImagePreview(u.profile_pic || u.profile_image || null);
        
        let parsedSyllabus = [];
        let parsedLangs = [];
        let parsedSecondary = [];
        let parsedPrimary = [];
        
        try { parsedSyllabus = typeof u.syllabus === 'string' ? JSON.parse(u.syllabus) : (u.syllabus || []); } catch(e){}
        try { parsedLangs = typeof u.languages_proficiency === 'string' ? JSON.parse(u.languages_proficiency) : (u.languages_proficiency || []); } catch(e){}
        try { parsedSecondary = typeof u.secondary_subjects === 'string' ? JSON.parse(u.secondary_subjects) : (u.secondary_subjects || []); } catch(e){}
        try { parsedPrimary = typeof (u.subject || u.primary_subject) === 'string' && (u.subject || u.primary_subject).startsWith('[') ? JSON.parse(u.subject || u.primary_subject) : ((u.subject || u.primary_subject) ? (u.subject || u.primary_subject).split(', ') : []); } catch(e){ parsedPrimary = (u.subject || u.primary_subject) ? [(u.subject || u.primary_subject)] : []; }

        let parsedAvailability = [''];
        if (u.availability) {
          try {
            parsedAvailability = typeof u.availability === 'string' && u.availability.startsWith('[') 
              ? JSON.parse(u.availability) 
              : u.availability.split(',').map(s=>s.trim());
          } catch(e) {
            parsedAvailability = [u.availability];
          }
        }

        setFormData(prev => ({
          ...prev,
          phone_number: u.phone_number || '',
          faculty_id_card: u.faculty_id_card || '',
          section: u.section || '',
          syllabus: Array.isArray(parsedSyllabus) ? parsedSyllabus : [],
          languages_proficiency: Array.isArray(parsedLangs) ? parsedLangs : [],
          qualification: u.qualification || '',
          experience: u.experience || '',
          availability: Array.isArray(parsedAvailability) && parsedAvailability.length > 0 ? parsedAvailability : [''],
          hourly_rate: u.hourly_rate || '',
          teaching_mode: u.teaching_mode || 'Both',
          joining_date: u.joining_date ? new Date(u.joining_date).toISOString().split('T')[0] : '',
          remarks: u.remarks || '',
          primary_subject: Array.isArray(parsedPrimary) ? parsedPrimary : [],
          secondary_subjects: Array.isArray(parsedSecondary) ? parsedSecondary : []
        }));
      }
    } catch (error) {
      console.error("Failed to fetch profile");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      handleProfileUpdate(file);
    }
  };

  const handleProfileUpdate = async (file = null) => {
    const updateData = new FormData();
    if (file) updateData.append('profile_image', file);
    
    // Append all non-password fields
    updateData.append('phone_number', formData.phone_number);
    updateData.append('faculty_id_card', formData.faculty_id_card);
    updateData.append('section', formData.section);
    updateData.append('qualification', formData.qualification);
    updateData.append('experience', formData.experience);
    updateData.append('availability', JSON.stringify(formData.availability));
    updateData.append('hourly_rate', formData.hourly_rate);
    updateData.append('teaching_mode', formData.teaching_mode);
    updateData.append('joining_date', formData.joining_date);
    updateData.append('remarks', formData.remarks);
    
    // JSON arrays
    formData.syllabus.forEach((item, index) => updateData.append(`syllabus[${index}]`, item));
    formData.languages_proficiency.forEach((item, index) => updateData.append(`languages_proficiency[${index}]`, item));
    formData.secondary_subjects.forEach((item, index) => updateData.append(`secondary_subjects[${index}]`, item));
    formData.primary_subject.forEach((item, index) => updateData.append(`primary_subject[${index}]`, item));

    setLoading(true);
    try {
      const res = await axios.put('/faculty/profile', updateData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success("Profile updated successfully");
        if (res.data.user) updateUser(res.data.user);
      }
    } catch (error) {
      toast.error("Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      return toast.error("Password mismatch");
    }

    setLoading(true);
    try {
      const res = await axios.put('/faculty/profile', {
        password: formData.new_password
      });
      if (res.data.success) {
        toast.success("Security credentials updated");
        setFormData({ ...formData, current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (error) {
      toast.error("Security update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleDropdown = (key) => setDropdowns(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Identity Control</h2>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Manage your core credentials and public profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Identity Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-[#008080] rounded-[3.5rem] p-5 md:p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#008080]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative group/avatar cursor-pointer mb-8">
                <div className="w-40 h-40 bg-white/10 backdrop-blur-xl rounded-[3rem] border-2 border-white/20 flex items-center justify-center overflow-hidden transition-all duration-700 group-hover/avatar:scale-105 group-hover/avatar:border-[#008080]">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-slate-500" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-2 right-2 w-12 h-12 bg-[#008080] text-white rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer hover:bg-[#008080] transition-all hover:scale-110 active:scale-90"
                >
                  <Camera size={20} />
                  <input type="file" id="avatar-upload" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <h3 className="text-2xl font-black tracking-tight mb-2">{user?.name}</h3>
              <p className="text-[10px] font-black text-[#008080] uppercase tracking-[0.3em] mb-8">Authorized Faculty</p>

              <div className="w-full space-y-4 pt-10 border-t border-white/10">
                <div className="flex items-center gap-4 text-slate-100">
                  <Mail size={16} />
                  <span className="text-xs font-bold truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-4 text-emerald-400">
                  <Shield size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Secured</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6">System Privileges</h4>
            <div className="space-y-4">
              {[
                'Full Roster Access',
                'Cross-Student Interaction',
                'Asset Distribution Rights',
                'Session Orchestration'
              ].map((priv, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-700">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs font-bold">{priv}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white p-6 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080]">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Academic & Professional Profile</h3>
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Update your subjects and availability</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col gap-2 relative" ref={refs.primary}>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Primary Subject</label>
                <div 
                  onClick={() => toggleDropdown('primary')}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black cursor-pointer flex justify-between items-center min-h-[46px]"
                >
                  <span className="truncate max-w-[150px]">
                    {formData.primary_subject && formData.primary_subject.length > 0 ? formData.primary_subject.join(', ') : 'Select Primary'}
                  </span>
                  <span className="text-slate-400">▼</span>
                </div>
                {dropdowns.primary && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] mt-1 p-2 max-h-60 overflow-y-auto">
                    {SUBJECT_OPTIONS.map(sub => (
                      <div 
                        key={sub} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const curr = formData.primary_subject || [];
                          setFormData({ ...formData, primary_subject: curr.includes(sub) ? curr.filter(s => s !== sub) : [...curr, sub] });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.primary_subject && formData.primary_subject.includes(sub) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.primary_subject && formData.primary_subject.includes(sub) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                          {formData.primary_subject && formData.primary_subject.includes(sub) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{sub}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 relative" ref={refs.secondary}>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Secondary Subjects</label>
                <div 
                  onClick={() => toggleDropdown('secondary')}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black cursor-pointer flex justify-between items-center min-h-[46px]"
                >
                  <span className="truncate max-w-[150px]">
                    {formData.secondary_subjects.length > 0 ? formData.secondary_subjects.join(', ') : 'Select Subjects'}
                  </span>
                  <span className="text-slate-400">▼</span>
                </div>
                {dropdowns.secondary && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] mt-1 p-2 max-h-60 overflow-y-auto">
                    {SUBJECT_OPTIONS.filter(s => s !== formData.primary_subject).map(sub => (
                      <div 
                        key={sub} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const curr = formData.secondary_subjects;
                          setFormData({ ...formData, secondary_subjects: curr.includes(sub) ? curr.filter(s => s !== sub) : [...curr, sub] });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.secondary_subjects.includes(sub) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.secondary_subjects.includes(sub) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                          {formData.secondary_subjects.includes(sub) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{sub}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Faculty ID #</label>
                <input type="text" name="faculty_id_card" value={formData.faculty_id_card || 'Not Set'} disabled className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed" />
              </div>

              <div className="flex flex-col gap-2 relative" ref={refs.section}>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Section Coverage</label>
                <div 
                  onClick={() => toggleDropdown('section')}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black cursor-pointer flex justify-between items-center min-h-[46px]"
                >
                  <span className="truncate max-w-[150px]">
                    {formData.section ? formData.section : 'Select Sections'}
                  </span>
                  <span className="text-slate-400">▼</span>
                </div>
                {dropdowns.section && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] mt-1 p-2 max-h-60 overflow-y-auto">
                    {["KG", "LP", "UP", "HS", "HSS"].map(sec => (
                      <div 
                        key={sec} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const current = formData.section ? formData.section.split(', ') : [];
                          const updated = current.includes(sec) ? current.filter(s => s !== sec) : [...current, sec];
                          setFormData({ ...formData, section: updated.join(', ') });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.section?.includes(sec) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.section?.includes(sec) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                          {formData.section?.includes(sec) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{sec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Highest Qualification</label>
                <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" placeholder="MSc, BEd" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Experience</label>
                <input type="text" name="experience" value={formData.experience} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" placeholder="5 Years" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Teaching Mode</label>
                <select name="teaching_mode" value={formData.teaching_mode} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none text-black">
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Hourly Rate (₹)</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input type="text" name="hourly_rate" value={formData.hourly_rate || 'Not Set'} disabled className="w-full p-3 pl-10 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed" />
                </div>
              </div>


              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Joining Date</label>
                <div className="relative group">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
              <div className="flex flex-col gap-2 relative" ref={refs.syllabus}>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Syllabus Expertise</label>
                <div 
                  onClick={() => toggleDropdown('syllabus')}
                  className="w-full p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-black cursor-pointer flex justify-between items-center min-h-[46px]"
                >
                  <span className="truncate max-w-[250px]">
                    {formData.syllabus?.length > 0 ? formData.syllabus.join(', ') : 'Select Syllabus'}
                  </span>
                  <span className="text-slate-400">▼</span>
                </div>
                {dropdowns.syllabus && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] mt-1 p-2 max-h-60 overflow-y-auto">
                    {SYLLABUS_OPTIONS.map(syl => (
                      <div 
                        key={syl} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const curr = formData.syllabus;
                          setFormData({ ...formData, syllabus: curr.includes(syl) ? curr.filter(s => s !== syl) : [...curr, syl] });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.syllabus.includes(syl) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.syllabus.includes(syl) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                          {formData.syllabus.includes(syl) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{syl}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 relative" ref={refs.language}>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Language Proficiency</label>
                <div 
                  onClick={() => toggleDropdown('language')}
                  className="w-full p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-black cursor-pointer flex justify-between items-center min-h-[46px]"
                >
                  <span className="truncate max-w-[250px]">
                    {formData.languages_proficiency?.length > 0 ? formData.languages_proficiency.map(id => LANG_OPTIONS.find(l => l.id === id)?.label || id).join(', ') : 'Select Languages'}
                  </span>
                  <span className="text-slate-400">▼</span>
                </div>
                {dropdowns.language && (
                  <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] mt-1 p-2 max-h-60 overflow-y-auto">
                    {LANG_OPTIONS.map(lang => (
                      <div 
                        key={lang.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const curr = formData.languages_proficiency;
                          setFormData({ ...formData, languages_proficiency: curr.includes(lang.id) ? curr.filter(l => l !== lang.id) : [...curr, lang.id] });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.languages_proficiency.includes(lang.id) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${formData.languages_proficiency.includes(lang.id) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                          {formData.languages_proficiency.includes(lang.id) && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{lang.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Availability (Time Slots)</label>
                {formData.availability.map((slot, index) => (
                  <div key={index} className="flex flex-col gap-1 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Slot {index + 1}</span>
                      {formData.availability.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => {
                            const newSlots = formData.availability.filter((_, i) => i !== index);
                            setFormData({ ...formData, availability: newSlots });
                          }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove Time Slot"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          value={to24H((slot || '').split(' - ')[0] || '')} 
                          onChange={(e) => {
                            const newSlots = [...formData.availability];
                            const parts = (newSlots[index] || '').split(' - ');
                            // Convert back to 12-hour format before saving or keep 24-hour if that's what we want
                            // Wait, the backend probably saves it as is. 
                            newSlots[index] = `${e.target.value} - ${parts[1] ? to24H(parts[1]) : ''}`;
                            setFormData({ ...formData, availability: newSlots });
                          }} 
                          className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" 
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">to</span>
                      <div className="relative flex-1">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          value={to24H((slot || '').split(' - ')[1] || '')} 
                          onChange={(e) => {
                            const newSlots = [...formData.availability];
                            const parts = (newSlots[index] || '').split(' - ');
                            newSlots[index] = `${parts[0] ? to24H(parts[0]) : ''} - ${e.target.value}`;
                            setFormData({ ...formData, availability: newSlots });
                          }} 
                          className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, availability: [...formData.availability, ''] })}
                  className="mt-2 py-2 px-4 bg-[#008080]/10 text-[#008080] rounded-xl text-xs font-bold hover:bg-[#008080] hover:text-white transition-colors w-fit"
                >
                  + Add Time Slot
                </button>
                <p className="text-[10px] text-slate-500 ml-1">Define your total available hours. Add multiple slots if needed.</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-black focus:bg-white focus:ring-2 focus:ring-[#008080] outline-none" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleProfileUpdate()}
              disabled={loading}
              className="px-5 md:px-10 py-5 bg-[#008080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all inline-flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Synchronizing...' : 'Synchronize Profile & Academic Details'}
              <ArrowRight size={14} />
            </button>
          </div>


        </div>
      </div>
    </div>
  );
};

export default FacultyProfile;
