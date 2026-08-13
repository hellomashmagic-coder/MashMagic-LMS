import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
    User, Mail, GraduationCap, BookOpen, Clock, 
    CheckCircle, ArrowLeft, Plus, Trash2, Edit2, Lock, Unlock, Eye, EyeOff,
    Link as LinkIcon, UserCheck, Shield, Phone, MapPin, Briefcase, Calendar, Info, History
} from 'lucide-react';

const SUBJECT_OPTIONS = [
    "Mathematics", "Science", "Social Science", "English", "Malayalam", 
    "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", 
    "Business Studies", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"
];

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

const SYLLABUS_OPTIONS = ["CBSE", "STATE", "ICSE", "IGCSE", "IB"];
const SECTION_OPTIONS = ["KG", "LP", "UP", "HS", "HSS"];

const EditFaculty = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        place: '',
        faculty_id_card: '',
        qualification: '',
        experience: '',
        availability: '',
        lp_rate: '',
        up_rate: '',
        hs_rate: '',
        hss_rate: '',
        teaching_mode: 'Both',
        joining_date: '',
        remarks: '',
        primary_subject: '',
        secondary_subjects: [],
        syllabus: [],
        languages_proficiency: [],
        section: '', // This will be comma separated string in DB
        password: '',
        isSecondaryDropdownOpen: false,
        isSectionDropdownOpen: false,
        isSyllabusDropdownOpen: false,
        isLangDropdownOpen: false
    });

    const [editHistory, setEditHistory] = useState([]);
    const [editModes, setEditModes] = useState({
        basic: false,
        expertise: false,
        logistics: false
    });
    const [showPassword, setShowPassword] = useState(false);

    // Refs for clicking outside
    const secondaryRef = useRef(null);
    const sectionRef = useRef(null);
    const syllabusRef = useRef(null);
    const langRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (secondaryRef.current && !secondaryRef.current.contains(event.target)) {
                setFormData(prev => ({ ...prev, isSecondaryDropdownOpen: false }));
            }
            if (sectionRef.current && !sectionRef.current.contains(event.target)) {
                setFormData(prev => ({ ...prev, isSectionDropdownOpen: false }));
            }
            if (syllabusRef.current && !syllabusRef.current.contains(event.target)) {
                setFormData(prev => ({ ...prev, isSyllabusDropdownOpen: false }));
            }
            if (langRef.current && !langRef.current.contains(event.target)) {
                setFormData(prev => ({ ...prev, isLangDropdownOpen: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchFacultyData();
    }, [id]);

    const fetchFacultyData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/aoe/faculties`);
            const faculty = res.data.data.find(f => f.id.toString() === id);
            
            if (faculty) {
                // Parse subjects
                const allSubjects = faculty.subject ? faculty.subject.split(',') : [];
                const primary_subject = allSubjects.length > 0 ? allSubjects[0] : '';
                const secondary_subjects = allSubjects.length > 1 ? allSubjects.slice(1) : [];

                // Parse JSON/Strings
                let languages = [];
                try {
                    languages = faculty.languages_proficiency 
                        ? (typeof faculty.languages_proficiency === 'string' ? JSON.parse(faculty.languages_proficiency) : faculty.languages_proficiency) 
                        : [];
                } catch (e) { languages = []; }

                let syllabus = [];
                if (faculty.syllabus) {
                    syllabus = typeof faculty.syllabus === 'string' ? faculty.syllabus.split(',') : (Array.isArray(faculty.syllabus) ? faculty.syllabus : [faculty.syllabus]);
                }

                let lp = '', up = '', hs = '', hss = '';
                try {
                    const parsedRates = JSON.parse(faculty.hourly_rate || '{}');
                    if (typeof parsedRates === 'object' && parsedRates !== null) {
                        lp = parsedRates.lp || '';
                        up = parsedRates.up || '';
                        hs = parsedRates.hs || '';
                        hss = parsedRates.hss || '';
                    } else {
                        lp = faculty.hourly_rate || ''; // Fallback
                    }
                } catch(e) {
                    lp = faculty.hourly_rate || '';
                }

                setFormData({
                    ...faculty,
                    name: faculty.name || '',
                    email: faculty.email || '',
                    phone_number: faculty.phone_number || '',
                    place: faculty.place || '',
                    primary_subject,
                    secondary_subjects,
                    languages_proficiency: languages,
                    syllabus,
                    section: faculty.section || '',
                    joining_date: faculty.joining_date ? new Date(faculty.joining_date).toISOString().split('T')[0] : '',
                    lp_rate: lp,
                    up_rate: up,
                    hs_rate: hs,
                    hss_rate: hss,
                    password: '',
                    isSecondaryDropdownOpen: false,
                    isSectionDropdownOpen: false,
                    isSyllabusDropdownOpen: false,
                    isLangDropdownOpen: false
                });

                // Fetch Edit History
                try {
                    const historyRes = await api.get(`/aoe/faculties/${id}/history`);
                    if (historyRes.data.success) {
                        setEditHistory(historyRes.data.data);
                    }
                } catch (historyErr) {
                    console.error("Failed to load edit history");
                }
            } else {
                toast.error("Faculty not found");
                navigate('/aoe/faculties');
            }
        } catch (error) {
            toast.error("Failed to load faculty data");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleDropdown = (field) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleMultiSelect = (field, value) => {
        setFormData(prev => {
            const current = prev[field] || [];
            const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
            return { ...prev, [field]: updated };
        });
    };

    const handleSectionToggle = (sec) => {
        setFormData(prev => {
            const current = prev.section ? prev.section.split(', ') : [];
            const updated = current.includes(sec) ? current.filter(s => s !== sec) : [...current, sec];
            return { ...prev, section: updated.join(', ') };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...formData };
            payload.hourly_rate = JSON.stringify({
                lp: formData.lp_rate,
                up: formData.up_rate,
                hs: formData.hs_rate,
                hss: formData.hss_rate
            });
            const res = await api.put(`/aoe/faculties/${id}`, payload);
            if (res.data.success) {
                toast.success("Faculty profile updated successfully");
                navigate('/aoe/faculties');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Accessing Credentials...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 py-6">
                <button onClick={() => navigate('/aoe/faculties')} className="flex items-center gap-2 text-slate-600 hover:text-[#008080] transition-colors">
                    <ArrowLeft size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Faculty Directory</span>
                </button>
                <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px] font-black uppercase tracking-widest">
                    Expertise Modification
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-5 md:p-10 rounded-[40px] border border-white/60 shadow-xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">Refine Faculty</h1>
                    <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em]">Updating professional profile for <span className="text-[#008080]">{formData.name}</span></p>
                </div>
                <div className="w-16 h-16 bg-[#008080] rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
                    <Briefcase size={32} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Section 1: Core Credentials */}
                <div className="bg-white p-4 md:p-8 md:p-12 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/40 relative">
                    {/* Overlay to prevent clicks when disabled (optional, but disabled prop works too) */}
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                <User size={20} />
                            </div>
                            Basic Identity
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setEditModes(prev => ({ ...prev, basic: !prev.basic }))}
                            className={`p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${editModes.basic ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100'}`}
                        >
                            {editModes.basic ? <><Unlock size={14} /> Editing</> : <><Lock size={14} /> Edit Section</>}
                        </button>
                    </h2>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${!editModes.basic ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Full Name</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleInputChange} disabled={!editModes.basic} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={!editModes.basic} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#008080]" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Phone Number</label>
                            <input type="text" name="phone_number" value={formData.phone_number} onChange={handleInputChange} disabled={!editModes.basic} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Place / City</label>
                            <input type="text" name="place" value={formData.place} onChange={handleInputChange} disabled={!editModes.basic} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Faculty ID Card #</label>
                            <input type="text" name="faculty_id_card" value={formData.faculty_id_card} onChange={handleInputChange} disabled={!editModes.basic} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Update Password (Optional)</label>
                            <div className="relative group">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-400 transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleInputChange} 
                                    disabled={!editModes.basic} 
                                    placeholder="Leave blank to keep current" 
                                    className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-rose-200" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={!editModes.basic}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 focus:outline-none transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Expertise & Mapping */}
                <div className="bg-[#008080] p-4 md:p-8 md:p-12 rounded-[48px] shadow-2xl shadow-[#008080]/40 text-white space-y-10 relative">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                <GraduationCap size={20} />
                            </div>
                            Academic Expertise
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setEditModes(prev => ({ ...prev, expertise: !prev.expertise }))}
                            className={`p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${editModes.expertise ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
                        >
                            {editModes.expertise ? <><Unlock size={14} /> Editing</> : <><Lock size={14} /> Edit Section</>}
                        </button>
                    </h2>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 transition-opacity duration-300 ${!editModes.expertise ? 'opacity-60 pointer-events-none' : ''}`}>
                        {/* Primary & Secondary Subjects */}
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Primary Subject Focus</label>
                                <select name="primary_subject" value={formData.primary_subject} onChange={handleInputChange} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-[#008080] transition-all appearance-none">
                                    <option value="" className="text-slate-900">Select Primary</option>
                                    {SUBJECT_OPTIONS.map(sub => <option key={sub} value={sub} className="text-slate-900">{sub}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 relative" ref={secondaryRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Secondary Subject Expertise</label>
                                <div onClick={() => toggleDropdown('isSecondaryDropdownOpen')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold cursor-pointer flex justify-between items-center">
                                    <span className="truncate max-w-full md:w-[300px]">{formData.secondary_subjects?.length > 0 ? formData.secondary_subjects.join(', ') : 'Select Secondary Subjects'}</span>
                                    <span>▼</span>
                                </div>
                                {formData.isSecondaryDropdownOpen && (
                                    <div className="absolute top-[100%] left-0 w-full bg-white text-slate-900 border border-slate-100 rounded-2xl shadow-2xl z-[150] mt-1 p-2 max-h-60 overflow-y-auto animate-in fade-in duration-200">
                                        {SUBJECT_OPTIONS.map(sub => (
                                            <div key={sub} onClick={() => handleMultiSelect('secondary_subjects', sub)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.secondary_subjects?.includes(sub) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.secondary_subjects?.includes(sub) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                                                    {formData.secondary_subjects?.includes(sub) && <CheckCircle size={10} className="text-white" />}
                                                </div>
                                                <span className="text-xs font-bold">{sub}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section & Syllabus */}
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2 relative" ref={sectionRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Section Coverage</label>
                                <div onClick={() => toggleDropdown('isSectionDropdownOpen')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold cursor-pointer flex justify-between items-center">
                                    <span className="truncate">{formData.section || 'Select Sections'}</span>
                                    <span>▼</span>
                                </div>
                                {formData.isSectionDropdownOpen && (
                                    <div className="absolute top-[100%] left-0 w-full bg-white text-slate-900 border border-slate-100 rounded-2xl shadow-2xl z-[150] mt-1 p-2 animate-in fade-in duration-200">
                                        {SECTION_OPTIONS.map(sec => (
                                            <div key={sec} onClick={() => handleSectionToggle(sec)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.section?.includes(sec) ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.section?.includes(sec) ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                                                    {formData.section?.includes(sec) && <CheckCircle size={10} className="text-white" />}
                                                </div>
                                                <span className="text-xs font-bold">{sec}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 relative" ref={syllabusRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Syllabus Expertise</label>
                                <div onClick={() => toggleDropdown('isSyllabusDropdownOpen')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold cursor-pointer flex justify-between items-center">
                                    <span className="truncate">{formData.syllabus?.length > 0 ? formData.syllabus.join(', ') : 'Select Syllabus'}</span>
                                    <span>▼</span>
                                </div>
                                {formData.isSyllabusDropdownOpen && (
                                    <div className="absolute top-[100%] left-0 w-full bg-white text-slate-900 border border-slate-100 rounded-2xl shadow-2xl z-[150] mt-1 p-2 animate-in fade-in duration-200">
                                        {SYLLABUS_OPTIONS.map(syl => (
                                            <div key={syl} onClick={() => handleMultiSelect('syllabus', syl)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.syllabus?.includes(syl) ? 'bg-blue-600/10 text-blue-600' : 'hover:bg-slate-50'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.syllabus?.includes(syl) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                    {formData.syllabus?.includes(syl) && <CheckCircle size={10} className="text-white" />}
                                                </div>
                                                <span className="text-xs font-bold">{syl}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`pt-6 border-t border-white/10 transition-opacity duration-300 ${!editModes.expertise ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex flex-col gap-2 relative max-w-md" ref={langRef}>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Language Proficiency</label>
                            <div onClick={() => toggleDropdown('isLangDropdownOpen')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold cursor-pointer flex justify-between items-center">
                                <span className="truncate">{formData.languages_proficiency?.length > 0 ? formData.languages_proficiency.map(id => LANG_OPTIONS.find(l => l.id === id)?.label || id).join(', ') : 'Select Languages'}</span>
                                <span>▼</span>
                            </div>
                            {formData.isLangDropdownOpen && (
                                <div className="absolute top-[100%] left-0 w-full bg-white text-slate-900 border border-slate-100 rounded-2xl shadow-2xl z-[150] mt-1 p-2 animate-in fade-in duration-200">
                                    {LANG_OPTIONS.map(lang => (
                                        <div key={lang.id} onClick={() => handleMultiSelect('languages_proficiency', lang.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${formData.languages_proficiency?.includes(lang.id) ? 'bg-emerald-600/10 text-emerald-600' : 'hover:bg-slate-50'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.languages_proficiency?.includes(lang.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                                                {formData.languages_proficiency?.includes(lang.id) && <CheckCircle size={10} className="text-white" />}
                                            </div>
                                            <span className="text-xs font-bold">{lang.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 3: Professional & Logistics */}
                <div className="bg-white p-4 md:p-8 md:p-12 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/40 space-y-10 relative">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Clock size={20} />
                            </div>
                            Logistics & Administration
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setEditModes(prev => ({ ...prev, logistics: !prev.logistics }))}
                            className={`p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${editModes.logistics ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100'}`}
                        >
                            {editModes.logistics ? <><Unlock size={14} /> Editing</> : <><Lock size={14} /> Edit Section</>}
                        </button>
                    </h2>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${!editModes.logistics ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Hourly Rates by Section (₹)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">LP Rate</span>
                                    <input type="number" name="lp_rate" value={formData.lp_rate} onChange={handleInputChange} disabled={!editModes.logistics} placeholder="0" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">UP Rate</span>
                                    <input type="number" name="up_rate" value={formData.up_rate} onChange={handleInputChange} disabled={!editModes.logistics} placeholder="0" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">HS Rate</span>
                                    <input type="number" name="hs_rate" value={formData.hs_rate} onChange={handleInputChange} disabled={!editModes.logistics} placeholder="0" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">HSS Rate</span>
                                    <input type="number" name="hss_rate" value={formData.hss_rate} onChange={handleInputChange} disabled={!editModes.logistics} placeholder="0" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Joining Date</label>
                            <input type="date" name="joining_date" value={formData.joining_date} onChange={handleInputChange} disabled={!editModes.logistics} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Teaching Mode</label>
                            <select name="teaching_mode" value={formData.teaching_mode} onChange={handleInputChange} disabled={!editModes.logistics} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none">
                                <option value="Online">Online Only</option>
                                <option value="Offline">Offline Only</option>
                                <option value="Both">Both Modes</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Experience (Years)</label>
                            <input type="text" name="experience" value={formData.experience} onChange={handleInputChange} disabled={!editModes.logistics} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Highest Qualification</label>
                            <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} disabled={!editModes.logistics} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Daily Availability</label>
                            <input type="text" name="availability" value={formData.availability} onChange={handleInputChange} disabled={!editModes.logistics} placeholder="E.g. 4PM - 9PM IST" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                        </div>
                    </div>

                    <div className={`flex flex-col gap-2 pt-6 border-t border-slate-100 transition-opacity duration-300 ${!editModes.logistics ? 'opacity-60 pointer-events-none' : ''}`}>
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Internal Academic Remarks</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} disabled={!editModes.logistics} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold outline-none h-32 resize-none" placeholder="Enter notes about faculty performance or specialization..." />
                    </div>
                </div>

                {/* Section 4: Edit History */}
                {editHistory.length > 0 && (
                    <div className="bg-white p-4 md:p-8 md:p-12 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/40">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <History size={20} />
                            </div>
                            Modification History
                        </h2>
                        
                        <div className="space-y-4">
                            {editHistory.map((log) => (
                                <div key={log.id} className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-black text-slate-900">{log.edited_by_name || 'Admin'}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                                {new Date(log.edited_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                                            {log.changes_summary}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-10">
                    <button type="button" onClick={() => navigate('/aoe/faculties')} className="w-full sm:w-auto px-5 md:px-10 py-5 rounded-[24px] border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-sans">
                        Discard Changes
                    </button>
                    <button disabled={saving} type="submit" className="w-full sm:w-auto px-6 md:px-12 py-5 rounded-[24px] bg-[#008080] text-white text-xs font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-[#008080] hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Synchronizing...
                            </>
                        ) : (
                            <>
                                Commit Faculty Update <CheckCircle size={18} strokeWidth={3} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditFaculty;
