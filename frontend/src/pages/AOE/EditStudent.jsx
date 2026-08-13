import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { 
    User, Mail, GraduationCap, BookOpen, Clock, 
    CheckCircle, ArrowLeft, Plus, Trash2, Edit2, Lock, Unlock, Eye, EyeOff,
    Link as LinkIcon, UserCheck, Shield, Phone, Globe, Calendar, DollarSign, X, MapPin
} from 'lucide-react';

const SUBJECT_OPTIONS = [
    "Mathematics", "Science", "Social Science", "English", "Malayalam", "Hindi",
    "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies",
    "Economics", "Computer Science", "Arabic", "French", "IT", "EVS", "All Subjects"
];

const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    for (let m of ['00', '30']) {
        if (h === 22 && m === '30') continue;
        const hour = h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:${m} ${ampm}`);
    }
}
TIME_SLOTS.push("10:00 PM");

const EditStudent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Determine API base path based on role
    const basePath = user?.role === 'mentor_head' ? '/mentor-head' : '/aoe';
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        grade: '',
        syllabus: '',
        course: '',
        registration_number: '',
        meeting_link: '',
        hour: '',
        next_installment_date: '',
        admission_date: '',
        enrollment_type: '',
        school_name: '',
        preferred_language: '',
        country: '',
        total_fees: '',
        total_paid: '',
        mentor_id: '',
        password: '',
        course_completed: 0
    });

    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [facultySearch, setFacultySearch] = useState({});
    
    // Refs for clicking outside
    const subRefs = useRef([]);
    const dayRefs = useRef([]);

    const [isLocked, setIsLocked] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            let updated = false;
            const newSubjects = selectedSubjects.map((row, idx) => {
                const subContainer = subRefs.current[idx];
                const dayContainer = dayRefs.current[idx];
                let newRow = { ...row };
                
                let rowUpdated = false;
                if (subContainer && !subContainer.contains(event.target) && row.isSubjectDropdownOpen) {
                    newRow.isSubjectDropdownOpen = false;
                    rowUpdated = true;
                }
                if (dayContainer && !dayContainer.contains(event.target) && row.isDayDropdownOpen) {
                    newRow.isDayDropdownOpen = false;
                    rowUpdated = true;
                }
                if (rowUpdated) updated = true;
                return newRow;
            });

            if (updated) {
                setSelectedSubjects(newSubjects);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedSubjects]);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [dropdownRes, studentRes] = await Promise.all([
                api.get(`${basePath}/dropdowns`),
                api.get(`${basePath}/students/${id}`)
            ]);

            setMentors(dropdownRes.data.data.mentors);
            setFaculties(dropdownRes.data.data.faculties);

            const student = studentRes.data.data;
            
            if (student) {
                setFormData({
                    name: student.name || '',
                    email: student.email || '',
                    contact: student.contact || '',
                    grade: student.grade || '',
                    syllabus: student.syllabus || '',
                    course: student.course || '',
                    registration_number: student.registration_number || '',
                    meeting_link: student.meeting_link || '',
                    hour: student.hour || '',
                    total_hours: student.total_hours || student.hour || '',
                    rejoining_fee: student.rejoining_fee || '',
                    admission_type: student.admission_type || 'new',
                    next_installment_date: student.next_installment_date ? student.next_installment_date.split('T')[0] : '',
                    admission_date: student.admission_date ? student.admission_date.split('T')[0] : '',
                    enrollment_type: student.enrollment_type || '',
                    school_name: student.school_name || '',
                    preferred_language: student.preferred_language || '',
                    country: student.country || '',
                    total_fees: student.total_fees || '',
                    total_paid: student.total_paid || '',
                    mentor_id: student.mentor_id || '',
                    password: '',
                    course_completed: student.course_completed || 0
                });

                if (student.subjects_json) {
                    try {
                        const parsed = typeof student.subjects_json === 'string' 
                            ? JSON.parse(student.subjects_json) 
                            : student.subjects_json;
                        
                        if (Array.isArray(parsed)) {
                            // Convert old format (days array + single startTime/endTime) to dayConfigs
                            const formatted = parsed.map(s => {
                                const configs = s.dayConfigs || (s.days || []).map(d => ({
                                    day: d,
                                    startTime: s.startTime || '',
                                    endTime: s.endTime || ''
                                }));
                                return {
                                    ...s,
                                    dayConfigs: configs,
                                    isDayDropdownOpen: false,
                                    isSubjectDropdownOpen: false
                                };
                            });
                            setSelectedSubjects(formatted);
                        } else {
                            setSelectedSubjects([]);
                        }
                    } catch (e) {
                        setSelectedSubjects([]);
                    }
                }
            } else {
                toast.error("Student not found");
                navigate(`${basePath}/students`);
            }
        } catch (error) {
            toast.error("Failed to load student data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addSubjectRow = () => {
        setSelectedSubjects([...selectedSubjects, { 
            subject: '', dayConfigs: [], hourlyRate: '', facultyId: '', facultyName: '',
            isDayDropdownOpen: false, isSubjectDropdownOpen: false 
        }]);
    };

    const removeSubjectRow = (index) => {
        setSelectedSubjects(selectedSubjects.filter((_, i) => i !== index));
    };

    const handleSubjectChange = (index, field, value) => {
        const newSubjects = [...selectedSubjects];
        newSubjects[index][field] = value;
        
        if (field === 'facultyId') {
            const faculty = faculties.find(f => f.id.toString() === value.toString());
            newSubjects[index].facultyName = faculty ? faculty.name : '';
        }
        
        setSelectedSubjects(newSubjects);
    };

    const handleDayToggle = (index, day) => {
        const newSubjects = [...selectedSubjects];
        const currentConfigs = newSubjects[index].dayConfigs || [];
        const exists = currentConfigs.find(c => c.day === day);
        
        if (exists) {
            newSubjects[index].dayConfigs = currentConfigs.filter(c => c.day !== day);
        } else {
            newSubjects[index].dayConfigs = [...currentConfigs, { 
                day, 
                startTime: '', 
                endTime: '' 
            }];
        }
        setSelectedSubjects(newSubjects);
    };

    const handleDayTimeChange = (subjectIdx, dayIdx, field, value) => {
        const newSubjects = [...selectedSubjects];
        newSubjects[subjectIdx].dayConfigs[dayIdx][field] = value;
        setSelectedSubjects(newSubjects);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`${basePath}/students/${id}`, {
                ...formData,
                selectedSubjects: selectedSubjects
            });

            if (res.data.success) {
                toast.success("Student profile updated successfully");
                navigate(`${basePath}/students`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update student");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Deciphering Records...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-10 py-6">
                <button 
                    onClick={() => navigate(`${basePath}/students`)}
                    className="flex items-center gap-2 text-slate-600 hover:text-[#008080] transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Student Directory</span>
                </button>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                    Live Record Modification
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-5 md:p-10 rounded-[40px] border border-white/60 shadow-xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">Reconfigure Profile</h1>
                    <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em]">Updating account identity for <span className="text-[#008080]">{formData.name}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        type="button" 
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all shadow-lg ${!isLocked ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-[#008080] text-white hover:bg-[#006666]'}`}
                    >
                        {!isLocked ? <><Unlock size={18} /> Editing Unlocked</> : <><Lock size={18} /> Edit Locked</>}
                    </button>
                    <div className="w-16 h-16 bg-[#008080] rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
                        <UserCheck size={32} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,128,128,0.05)] border border-slate-100 relative">
                <div className={`transition-opacity duration-300 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                            <div className="w-8 h-8 bg-[#008080] text-white rounded-lg flex items-center justify-center">
                            <GraduationCap size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Student Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-8 bg-[#008080]/5 p-6 rounded-3xl border border-[#008080]/20">
                            
                            <div className="space-y-4 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Enrollment Plan</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'Mentorship Only', label: 'Mentorship only', icon: '🥇' },
                                        { id: 'Tuition Only', label: 'Tuition only', icon: '🥈' },
                                        { id: 'Mentorship & Tuition', label: 'Mentorship & Tuition', icon: '💎' }
                                    ].map((plan) => (
                                        <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, enrollment_type: plan.id }))}
                                        className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group ${formData.enrollment_type === plan.id
                                            ? 'border-[#008080]/50 bg-[#008080]/10 backdrop-blur-md shadow-[0_8px_30px_rgba(0,128,128,0.2)] scale-105'
                                            : 'border-transparent bg-white/50 hover:bg-white hover:border-slate-200'
                                            }`}
                                        >
                                        <span className="text-xl group-hover:scale-110 transition-transform">{plan.icon}</span>
                                        <span className={`text-[9px] text-center leading-tight font-black uppercase tracking-widest ${formData.enrollment_type === plan.id ? 'text-[#008080]' : 'text-slate-500'}`}>
                                            {plan.label}
                                        </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 pt-6 border-t border-[#008080]/10">
                                <h3 className="text-[10px] font-black text-[#008080] uppercase tracking-widest mb-4">Fee Configuration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Fees (INR)</label>
                                        <input type="number" name="total_fees" value={formData.total_fees} onChange={handleInputChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 50000" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Paid (INR)</label>
                                        <input type="number" name="total_paid" value={formData.total_paid} onChange={handleInputChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 25000" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Hours</label>
                                        <input type="number" name="total_hours" value={formData.total_hours} onChange={handleInputChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 100" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Rejoining Fee (Optional)</label>
                                        <input type="number" name="rejoining_fee" value={formData.rejoining_fee} onChange={handleInputChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 1000" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student Name</label>
                                <div className="relative group">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Full Name" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input type="email" name="email" autoComplete="new-password" value={formData.email} onChange={handleInputChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Email Address (Optional)" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Update Password (Optional)</label>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        name="password" 
                                        value={formData.password} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" 
                                        placeholder="Leave blank to keep current" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] focus:outline-none transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Confirm Password (Optional)</label>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        name="confirmPassword" 
                                        onChange={() => {}} 
                                        className="w-full p-3 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" 
                                        placeholder="Leave blank if not changing" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Contact Number</label>
                                <div className="relative group">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input type="tel" name="contact" value={formData.contact} onChange={handleInputChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Phone Number" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Date of Admission</label>
                                <div className="relative group">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input type="date" name="admission_date" value={formData.admission_date} onChange={handleInputChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Current School Name</label>
                                <input type="text" name="school_name" value={formData.school_name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. Model Excellence School" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preferred Language</label>
                                <select name="preferred_language" value={formData.preferred_language} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none">
                                    <option value="">Select Language</option>
                                    <option value="Eng">Eng</option>
                                    <option value="BL-AD">BL-AD</option>
                                    <option value="BL-SM">BL-SM</option>
                                    <option value="MLM">MLM</option>
                                    <option value="HIN">HIN</option>
                                    <option value="TML">TML</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Country</label>
                                <div className="relative group">
                                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. UAE, India" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Next Installment Date</label>
                                <input type="date" name="next_installment_date" value={formData.next_installment_date} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Grade</label>
                                <select name="grade" required value={formData.grade} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none">
                                    <option value="" disabled>Select Grade</option>
                                    <option value="KG 1">KG 1</option>
                                    <option value="KG 2">KG 2</option>
                                    {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Syllabus</label>
                                <select name="syllabus" required value={formData.syllabus} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none">
                                    <option value="" disabled>Select Syllabus</option>
                                    <option value="CBSE">CBSE</option>
                                    <option value="STATE">STATE</option>
                                    <option value="ICSE">ICSE</option>
                                    <option value="IGCSE">IGCSE</option>
                                    <option value="IB">IB</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Course</label>
                                <input type="text" name="course" value={formData.course} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none" placeholder="Course Name" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {(formData.enrollment_type !== 'Tuition Only') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Assigned Mentor</label>
                                    <select name="mentor_id" value={formData.mentor_id || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none">
                                    <option value="" disabled>Select Mentor</option>
                                    {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student ID #</label>
                                <input type="text" name="registration_number" value={formData.registration_number} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. ST-2024-001" />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Admission Type</label>
                                <select name="admission_type" value={formData.admission_type || 'new'} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold appearance-none">
                                    <option value="new">New Admission</option>
                                    <option value="rejoining">Rejoining</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-6">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Meeting Link</label>
                            <input type="text" name="meeting_link" value={formData.meeting_link} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Google Meet Link" />
                        </div>

                        {/* Multiple Subjects & Faculties */}
                        <div className="mt-8 rounded-2xl border border-[#008080]/30 bg-[#008080]/5 p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <label className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest ml-1">Subjects & Assigned Faculties</label>
                                <p className="text-[10px] font-bold text-slate-700 ml-1 mt-1">Add one or more subject-faculty pairs for this student.</p>
                            </div>
                            <button type="button" onClick={addSubjectRow} className="text-[10px] font-black text-[#008080] uppercase tracking-widest hover:text-[#0f172a] transition-colors bg-white px-3 py-2 rounded-lg border border-[#008080]/40 w-fit">
                                + Add Subject
                            </button>
                            </div>

                            <div className="space-y-6">
                            {selectedSubjects.map((row, idx) => (
                                <div key={idx} className="bg-white p-4 md:p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative animate-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                                    
                                    {/* Custom Subject Dropdown (Multiple Selection) */}
                                    <div className="flex flex-col gap-2 relative" ref={el => subRefs.current[idx] = el}>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Subjects</label>
                                        <div 
                                            onClick={() => {
                                                const newSubjects = [...selectedSubjects];
                                                newSubjects[idx].isSubjectDropdownOpen = !newSubjects[idx].isSubjectDropdownOpen;
                                                setSelectedSubjects(newSubjects);
                                            }}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-800 cursor-pointer flex justify-between items-center min-h-[52px]"
                                        >
                                            <span className="truncate">
                                                {Array.isArray(row.subject) && row.subject.length > 0 
                                                    ? row.subject.join(', ') 
                                                    : (typeof row.subject === 'string' && row.subject ? row.subject : 'Select Subjects')}
                                            </span>
                                            <span className="text-slate-400">▼</span>
                                        </div>
                                        {row.isSubjectDropdownOpen && (
                                            <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[120] mt-1 p-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                {SUBJECT_OPTIONS.map(sub => {
                                                    const isSelected = Array.isArray(row.subject) ? row.subject.includes(sub) : row.subject === sub;
                                                    return (
                                                        <div 
                                                            key={sub} 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newSubjects = [...selectedSubjects];
                                                                let current = Array.isArray(newSubjects[idx].subject) 
                                                                    ? newSubjects[idx].subject 
                                                                    : (newSubjects[idx].subject ? [newSubjects[idx].subject] : []);
                                                                
                                                                if (current.includes(sub)) {
                                                                    current = current.filter(s => s !== sub);
                                                                } else {
                                                                    current = [...current, sub];
                                                                }
                                                                newSubjects[idx].subject = current;
                                                                setSelectedSubjects(newSubjects);
                                                            }}
                                                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-[#008080]/10 text-[#008080]' : 'hover:bg-slate-50 text-slate-600'}`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                                                                {isSelected && <CheckCircle size={10} className="text-white" />}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase">{sub}</span>
                                                        </div>
                                                    );
                                                })}
                                                {/* Clear All Option */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newSubjects = [...selectedSubjects];
                                                        newSubjects[idx].subject = [];
                                                        setSelectedSubjects(newSubjects);
                                                    }}
                                                    className="mt-2 p-2 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-lg cursor-pointer transition-colors border border-dashed border-rose-200"
                                                >
                                                    Clear All
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Days Dropdown */}
                                    <div className="flex flex-col gap-2 relative" ref={el => dayRefs.current[idx] = el}>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Session Configuration (Days & Time)</label>
                                        <div 
                                            onClick={() => {
                                                const newSubjects = [...selectedSubjects];
                                                newSubjects[idx].isDayDropdownOpen = !newSubjects[idx].isDayDropdownOpen;
                                                setSelectedSubjects(newSubjects);
                                            }}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-800 cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="truncate">
                                                {row.dayConfigs?.length > 0 
                                                    ? row.dayConfigs.map(d => `${d.day.substring(0,3)} ${d.startTime || ''}`).join(', ') 
                                                    : 'Configure Days & Time'}
                                            </span>
                                            <span>▼</span>
                                        </div>
                                        {row.isDayDropdownOpen && (
                                            <div className="absolute top-[100%] left-0 w-full md:w-[300px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[120] mt-1 p-3 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                    {DAYS_LIST.map(day => {
                                                        const configIdx = row.dayConfigs?.findIndex(c => c.day === day);
                                                        const isSelected = configIdx !== -1;
                                                        return (
                                                            <div key={day} className={`p-2 rounded-xl border ${isSelected ? 'bg-[#008080]/5 border-[#008080]/20' : 'border-transparent'}`}>
                                                                <div className="flex items-center gap-3 mb-1 cursor-pointer" onClick={() => handleDayToggle(idx, day)}>
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                                                                        {isSelected && <CheckCircle size={10} className="text-white" />}
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase">{day}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                                        <div className="relative group/time">
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="10:00 AM"
                                                                                value={row.dayConfigs[configIdx].startTime}
                                                                                onChange={(e) => handleDayTimeChange(idx, configIdx, 'startTime', e.target.value)}
                                                                                className="w-full p-2 pr-7 bg-white border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-[#008080]"
                                                                            />
                                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] cursor-pointer" onClick={(e) => {
                                                                                document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                                                const picker = e.currentTarget.nextElementSibling;
                                                                                picker.classList.toggle('hidden');
                                                                            }}>
                                                                                <Clock size={10} />
                                                                            </div>
                                                                            <div className="time-picker-dropdown hidden absolute top-full left-0 w-full bg-white border border-slate-100 rounded-lg shadow-2xl z-[150] mt-1 p-1 max-h-32 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                                                {TIME_SLOTS.map(t => (
                                                                                    <div key={t} onClick={() => {
                                                                                        handleDayTimeChange(idx, configIdx, 'startTime', t);
                                                                                        document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                                                    }} className="p-1.5 hover:bg-[#008080]/10 rounded-md text-[9px] font-black cursor-pointer transition-colors uppercase">
                                                                                        {t}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="relative group/time">
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="11:00 AM"
                                                                                value={row.dayConfigs[configIdx].endTime}
                                                                                onChange={(e) => handleDayTimeChange(idx, configIdx, 'endTime', e.target.value)}
                                                                                className="w-full p-2 pr-7 bg-white border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-[#008080]"
                                                                            />
                                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] cursor-pointer" onClick={(e) => {
                                                                                document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                                                const picker = e.currentTarget.nextElementSibling;
                                                                                picker.classList.toggle('hidden');
                                                                            }}>
                                                                                <Clock size={10} />
                                                                            </div>
                                                                            <div className="time-picker-dropdown hidden absolute top-full left-0 w-full bg-white border border-slate-100 rounded-lg shadow-2xl z-[150] mt-1 p-1 max-h-32 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                                                {TIME_SLOTS.map(t => (
                                                                                    <div key={t} onClick={() => {
                                                                                        handleDayTimeChange(idx, configIdx, 'endTime', t);
                                                                                        document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                                                    }} className="p-1.5 hover:bg-[#008080]/10 rounded-md text-[9px] font-black cursor-pointer transition-colors uppercase">
                                                                                        {t}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Faculty Selection */}
                                    <div className="flex flex-col gap-2 relative">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Faculty</label>
                                        <select 
                                            value={row.facultyId} 
                                            onChange={(e) => handleSubjectChange(idx, 'facultyId', e.target.value)} 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-800 focus:ring-2 focus:ring-[#008080] outline-none min-h-[52px]"
                                        >
                                            <option value="">Select Faculty</option>
                                            {faculties.map(f => (
                                                <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-3">
                                    <button 
                                        type="button" 
                                        onClick={() => removeSubjectRow(idx)} 
                                        className="w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                                        title="Remove Sequence"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                                </div>
                            ))}
                            </div>
                        </div>

                    </form>
                </div>
            </div>
            
            {/* Submit Button (Outside locked div but visible only when unlocked) */}
            {!isLocked && (
                <div className="mt-8 flex justify-end gap-4">
                    <button type="button" onClick={() => navigate(`${basePath}/students`)} className="px-5 md:px-10 py-4 border border-slate-200 text-slate-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={saving} className="px-5 md:px-10 py-4 bg-[#008080] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#006666] transition-colors shadow-lg shadow-[#008080]/30 disabled:opacity-50 flex items-center gap-2">
                        {saving ? 'Updating...' : <><CheckCircle size={18} strokeWidth={3} /> Save Updates</>}
                    </button>
                </div>
            )}
        </div>
    );
};

export default EditStudent;