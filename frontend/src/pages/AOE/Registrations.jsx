import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, User, GraduationCap, MapPin, Mail, Phone, Lock, BookOpen, Clock, Calendar, CheckCircle, ShieldCheck, Trash2, Eye, EyeOff, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Select from 'react-select';

const gradeOptions = [
  { value: 'KG 1', label: 'KG 1' },
  { value: 'KG 2', label: 'KG 2' },
  ...[...Array(12)].map((_, i) => ({ value: `Class ${i + 1}`, label: `Class ${i + 1}` }))
];

const syllabusOptions = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'STATE', label: 'STATE' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IGCSE', label: 'IGCSE' },
  { value: 'IB', label: 'IB' },
  { value: 'Other', label: 'Other' }
];

const languageOptions = [
  { value: 'Eng', label: 'Eng' },
  { value: 'BL-AD', label: 'BL-AD' },
  { value: 'BL-SM', label: 'BL-SM' },
  { value: 'MLM', label: 'MLM' },
  { value: 'HIN', label: 'HIN' },
  { value: 'TML', label: 'TML' }
];

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    padding: '4px',
    backgroundColor: '#f8fafc',
    borderColor: state.isFocused ? '#008080' : '#f1f5f9',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(0,128,128,0.2)' : 'none',
    '&:hover': {
      borderColor: '#008080'
    },
    fontWeight: '700',
    fontSize: '0.875rem'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#008080' : state.isFocused ? '#f0fdfa' : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    fontWeight: '700',
    fontSize: '0.875rem',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#008080'
    }
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1e293b'
  })
};

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

const Registrations = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showStudentConfirmPassword, setShowStudentConfirmPassword] = useState(false);

  // Dropdowns data
  const [mentors, setMentors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef(null);

  // Forms data
  const [studentForm, setStudentForm] = useState({
    name: '', email: '', contact: '', password: '', confirmPassword: '',
    grade: '', syllabus: '', mentorId: '', course: '', 
    admissionDate: new Date().toISOString().split('T')[0],
    schoolName: '', preferredLanguage: '', country: '',
    totalFees: '', totalPaid: '', nextInstallmentDate: '', 
    admissionType: 'new', registrationNumber: '', meetingLink: '',
    enrollmentType: '', rejoiningFee: ''
  });

  const [selectedSubjects, setSelectedSubjects] = useState([
    { 
      subject: '', 
      dayConfigs: [], // Array of { day: string, startTime: string, endTime: string }
      facultyId: '', 
      facultyName: '', 
      hourlyRate: '', 
      availableFaculties: [], 
      isDayDropdownOpen: false, 
      isSubjectDropdownOpen: false,
      isFacultyDropdownOpen: false,
      facultySearchQuery: ''
    }
  ]);

  const [facultyForm, setFacultyForm] = useState({
    name: '', email: '', phone_number: '', place: '', password: '', confirmPassword: '', availability: [''],
    primary_subject: '', secondary_subjects: [], section: '', qualification: '', experience: '', 
    teaching_mode: 'Both', joining_date: new Date().toISOString().split('T')[0], syllabus: [], languages_proficiency: []
  });

  const [sscForm, setSscForm] = useState({
    name: '', email: '', phone_number: '', place: '', password: '', confirmPassword: ''
  });

  // Refs for clicking outside
  const secondaryRef = useRef(null);
  const sectionRef = useRef(null);
  const syllabusRef = useRef(null);
  const langRef = useRef(null);
  const subRefs = useRef([]);
  const dayRefs = useRef([]);
  const facultyRefs = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Student registration row dropdowns
      let updated = false;
      
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target) && isStudentDropdownOpen) {
        setIsStudentDropdownOpen(false);
      }

      const newSubjects = selectedSubjects.map((row, idx) => {
        const subContainer = subRefs.current[idx];
        const dayContainer = dayRefs.current[idx];
        const facultyContainer = facultyRefs.current[idx];
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
        if (facultyContainer && !facultyContainer.contains(event.target) && row.isFacultyDropdownOpen) {
          newRow.isFacultyDropdownOpen = false;
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
    "Mathematics", "Science", "Social Science", "Social", "English", "Malayalam", 
    "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business", 
    "Business Studies", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"
  ];

  const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const coursesList = ["Mission X", "Classmate", "Crash 45", "Bright Bridge", "Magic Revision"];
  const SYLLABUS_OPTIONS = ["CBSE", "STATE", "ICSE", "IGCSE", "IB"];

  const TIME_SLOTS = [];
  for (let h = 8; h <= 22; h++) {
    for (let m of ['00', '30']) {
      if (h === 22 && m === '30') continue; // Stop at 10:00 PM
      const hour = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:${m} ${ampm}`);
    }
  }
  TIME_SLOTS.push("10:00 PM");

  const fetchTimeoutRef = useRef(null);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await api.get('/aoe/dropdowns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMentors(res.data.data.mentors || []);
        setFaculties(res.data.data.faculties || []);
      }
      
      const stdRes = await api.get('/aoe/students-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (stdRes.data.success) {
        setAllStudents(stdRes.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch dropdowns:", error);
    }
  };

  const fetchAvailableFaculties = async (index, subject, dayConfigs) => {
    const subjectsToFetch = Array.isArray(subject) ? subject : (subject ? [subject] : []);
    if (subjectsToFetch.length === 0 || !dayConfigs || dayConfigs.length === 0) return;
    
    // Check if all configs have day, startTime and endTime
    const isValid = dayConfigs.every(c => c.day && c.startTime && c.endTime);
    if (!isValid) return;

    try {
      const subjectParam = subjectsToFetch.join(',');
      // Send dayConfigs as JSON string for complex availability checking
      const configsParam = encodeURIComponent(JSON.stringify(dayConfigs));
      const res = await api.get(`/aoe/available-faculties?subject=${subjectParam}&dayConfigs=${configsParam}`);
      if (res.data.success) {
        setSelectedSubjects(prev => {
          const newSubjects = [...prev];
          if (newSubjects[index]) {
            newSubjects[index].availableFaculties = res.data.data.filter(f => f.isAvailable);
          }
          return newSubjects;
        });
      }
    } catch (error) {
      console.error("Failed to fetch available faculties:", error);
    }
  };

  const handleSubjectChange = (index, field, value) => {
    const newSubjects = [...selectedSubjects];
    newSubjects[index][field] = value;
    if (field === 'facultyId') {
      const listToSearch = (newSubjects[index].availableFaculties && newSubjects[index].availableFaculties.length > 0) ? newSubjects[index].availableFaculties : faculties;
      const faculty = listToSearch.find(f => f.id.toString() === value);
      newSubjects[index].facultyName = faculty ? faculty.name : '';
      if (faculty && faculty.hourly_rate) {
        newSubjects[index].hourlyRate = faculty.hourly_rate;
      }
    }
    setSelectedSubjects(newSubjects);
    if (['subject', 'dayConfigs'].includes(field)) {
      const row = newSubjects[index];
      const hasSubject = Array.isArray(row.subject) ? row.subject.length > 0 : !!row.subject;
      if (hasSubject && row.dayConfigs && row.dayConfigs.length > 0) {
        fetchAvailableFaculties(index, row.subject, row.dayConfigs);
      }
    }
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
    
    const row = newSubjects[index];
    const hasSubject = Array.isArray(row.subject) ? row.subject.length > 0 : !!row.subject;
    if (hasSubject && row.dayConfigs.length > 0) {
      fetchAvailableFaculties(index, row.subject, row.dayConfigs);
    }
  };

  const handleDayTimeChange = (subjectIdx, dayIdx, field, value) => {
    const newSubjects = [...selectedSubjects];
    newSubjects[subjectIdx].dayConfigs[dayIdx][field] = value;
    setSelectedSubjects(newSubjects);
    
    const row = newSubjects[subjectIdx];
    const hasSubject = Array.isArray(row.subject) ? row.subject.length > 0 : !!row.subject;
    if (hasSubject && row.dayConfigs.length > 0) {
      fetchAvailableFaculties(subjectIdx, row.subject, row.dayConfigs);
    }
  };



  const handleExistingStudentSelect = (student) => {
    setStudentForm(prev => ({
      ...prev,
      name: student.name || '',
      email: '', // Deliberately clear email for rejoining so it can be re-entered
      password: '',
      confirmPassword: '',
      contact: student.phone_number || student.contact || '',
      grade: student.grade || '',
      syllabus: student.syllabus || '',
      course: student.course || '',
      mentorId: student.mentor_id || '',
      schoolName: student.school_name || '',
      preferredLanguage: student.preferred_language || '',
      country: student.country || '',
      registrationNumber: student.registration_number || '',
      admissionType: 'rejoining' // Ensure this stays
    }));

    if (student.subjects_json) {
      try {
        const parsedSubjects = typeof student.subjects_json === 'string' ? JSON.parse(student.subjects_json) : student.subjects_json;
        if (Array.isArray(parsedSubjects) && parsedSubjects.length > 0) {
          const subjectsWithState = parsedSubjects.map(sub => ({
            ...sub,
            availableFaculties: [],
            isDayDropdownOpen: false, 
            isSubjectDropdownOpen: false,
            isFacultyDropdownOpen: false,
            facultySearchQuery: ''
          }));
          setSelectedSubjects(subjectsWithState);
        }
      } catch (e) {
        console.error("Error parsing student subjects:", e);
      }
    }

    setIsStudentDropdownOpen(false);
    setStudentSearchQuery('');
  };

  const handleStudentChange = (e) => setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  const handleSelectChange = (name, option) => setStudentForm({ ...studentForm, [name]: option ? option.value : '' });
  const handleFacultyChange = (e) => setFacultyForm({ ...facultyForm, [e.target.name]: e.target.value });
  const handleSSCChange = (e) => setSscForm({ ...sscForm, [e.target.name]: e.target.value });

  const addSubjectRow = () => {
    setSelectedSubjects([...selectedSubjects, { 
      subject: '', 
      dayConfigs: [], 
      facultyId: '', 
      facultyName: '', 
      hourlyRate: '', 
      availableFaculties: [],
      isDayDropdownOpen: false, 
      isSubjectDropdownOpen: false,
      isFacultyDropdownOpen: false,
      facultySearchQuery: ''
    }]);
  };

  const submitStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.enrollmentType) {
      return toast.error("Please select an Enrollment Plan before registering.");
    }
    if (studentForm.password && studentForm.password !== studentForm.confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    setLoading(true);
    try {
      const flattenedSubjects = [];
      selectedSubjects.forEach(s => {
        if (s.dayConfigs && s.dayConfigs.length > 0) {
          s.dayConfigs.forEach(config => {
            flattenedSubjects.push({
              ...s,
              day: config.day,
              startTime: config.startTime,
              endTime: config.endTime,
              days: [config.day] // For backward compatibility with some controller logic
            });
          });
        } else {
          // Keep the subject-faculty assignment even if no schedule is set
          flattenedSubjects.push({ ...s });
        }
      });
      const res = await api.post('/aoe/register-student', { ...studentForm, selectedSubjects: flattenedSubjects });
      if (res.data.success) {
        toast.success('Student Registered Successfully!');
        setStudentForm({
          name: '', email: '', contact: '', password: '', confirmPassword: '',
          grade: '', syllabus: '', mentorId: '', course: '', 
          admissionDate: new Date().toISOString().split('T')[0],
          schoolName: '', preferredLanguage: '', country: '',
          totalFees: '', totalPaid: '', totalHours: '', nextInstallmentDate: '', 
          admissionType: 'new', registrationNumber: '', meetingLink: '',
          enrollmentType: '', rejoiningFee: ''
        });
        setSelectedSubjects([{ subject: '', dayConfigs: [], facultyId: '', facultyName: '', hourlyRate: '', availableFaculties: [] }]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  const submitFaculty = async (e) => {
    e.preventDefault();
    if (facultyForm.password && facultyForm.password !== facultyForm.confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    setLoading(true);
    try {
      const facultyData = {
        ...facultyForm,
        availability: JSON.stringify(facultyForm.availability.filter(slot => slot && slot.trim() !== ''))
      };
      const res = await api.post('/aoe/register-faculty', facultyData);
      if (res.data.success) {
        toast.success('Faculty Account Created Successfully!');
        setFacultyForm({
          name: '', email: '', phone_number: '', place: '', password: '', confirmPassword: '', availability: [''],
          primary_subject: '', secondary_subjects: [], section: '', qualification: '', experience: '', 
          teaching_mode: 'Both', joining_date: new Date().toISOString().split('T')[0], syllabus: [], languages_proficiency: []
        });
        fetchDropdowns();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register faculty');
    } finally {
      setLoading(false);
    }
  };

  const submitSSC = async (e) => {
    e.preventDefault();
    if (sscForm.password && sscForm.password !== sscForm.confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    setLoading(true);
    try {
      const res = await api.post('/aoe/register-ssc', sscForm);
      if (res.data.success) {
        toast.success(res.data.message || "SSC registered successfully");
        setSscForm({ name: '', email: '', phone_number: '', place: '', password: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 md:px-8 py-4 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Onboarding Gateway</h1>
            <p className="text-slate-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mt-1">Unified registration portal for students and faculty</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080] rotate-3 shrink-0">
            <UserPlus size={20} className="md:w-6 md:h-6" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit mx-auto shadow-inner">
          {[
            { id: 'student', label: 'Student' },
            { id: 'faculty', label: 'Faculty Registration' },
            { id: 'ssc', label: 'SSC' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                ? 'bg-white text-[#008080] shadow-sm scale-100'
                : 'text-slate-500 hover:text-slate-800 scale-95'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Formal Registration Container */}
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,128,128,0.05)] border border-slate-100">
          {activeTab === 'student' && (
            <form onSubmit={submitStudent} className="animate-in fade-in slide-in-from-right-4 duration-500" autoComplete="off">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                <div className="w-8 h-8 bg-[#008080] text-white rounded-lg flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Normal Registration</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-8 bg-[#008080]/5 p-6 rounded-3xl border border-[#008080]/20">
                <div className="flex flex-col gap-2 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Admission Type</label>
                  <Select
                    options={[
                      { value: 'new', label: 'New Student' },
                      { value: 'existing', label: 'Existing Student' },
                      { value: 'rejoining', label: 'Rejoining' }
                    ]}
                    styles={customSelectStyles}
                    value={
                      [
                        { value: 'new', label: 'New Student' },
                        { value: 'existing', label: 'Existing Student' },
                        { value: 'rejoining', label: 'Rejoining' }
                      ].find(opt => opt.value === studentForm.admissionType) || null
                    }
                    onChange={(option) => handleSelectChange('admissionType', option)}
                    placeholder="Select Admission Type"
                    isClearable
                  />

                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Enrollment Plan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'Mentorship', label: 'Mentorship only', icon: '🥇' },
                      { id: 'Tuition', label: 'Tuition only', icon: '🥈' },
                      { id: 'Mentorship and Tuition', label: 'Mentorship & Tuition', icon: '💎' }
                    ].map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setStudentForm(prev => ({ ...prev, enrollmentType: plan.id }))}
                        className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group ${studentForm.enrollmentType === plan.id
                          ? 'border-[#008080]/50 bg-[#008080]/10 backdrop-blur-md shadow-[0_8px_30px_rgba(0,128,128,0.2)] scale-105'
                          : 'border-transparent bg-white/50 hover:bg-white hover:border-slate-200'
                          }`}
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">{plan.icon}</span>
                        <span className={`text-[9px] text-center leading-tight font-black uppercase tracking-widest ${studentForm.enrollmentType === plan.id ? 'text-[#008080]' : 'text-slate-500'}`}>
                          {plan.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {(studentForm.admissionType === 'new' || studentForm.admissionType === 'rejoining') && (
                  <div className="col-span-1 md:col-span-2 pt-6 border-t border-[#008080]/10">
                    <h3 className="text-[10px] font-black text-[#008080] uppercase tracking-widest mb-4">Fee Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {studentForm.admissionType === 'rejoining' ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Hours</label>
                            <input type="number" name="totalHours" value={studentForm.totalHours || ''} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 100" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Rejoining Fee (INR)</label>
                            <input type="number" name="rejoiningFee" value={studentForm.rejoiningFee || ''} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 1500" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Fees (INR)</label>
                            <input type="number" name="totalFees" value={studentForm.totalFees} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 50000" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Fees (INR)</label>
                            <input type="number" name="totalFees" value={studentForm.totalFees} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 50000" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Paid (INR)</label>
                            <input type="number" name="totalPaid" value={studentForm.totalPaid} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 25000" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Total Hours</label>
                            <input type="number" name="totalHours" value={studentForm.totalHours || ''} onChange={handleStudentChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080] font-bold shadow-sm" placeholder="E.g. 100" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student Name</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input type="text" name="name" required value={studentForm.name} onChange={handleStudentChange} autoComplete="off" className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Full Name" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input type="email" name="email" autoComplete="new-password" value={studentForm.email} onChange={handleStudentChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Email Address (Optional)" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Login Password (Optional)</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input 
                      type={showStudentPassword ? "text" : "password"} 
                      name="password" 
                      autoComplete="new-password"
                      value={studentForm.password} 
                      onChange={handleStudentChange} 
                      className="w-full p-3 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" 
                      placeholder="••••••••" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] focus:outline-none transition-colors"
                    >
                      {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Confirm Password (Optional)</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input 
                      type={showStudentConfirmPassword ? "text" : "password"} 
                      name="confirmPassword" 
                      autoComplete="new-password"
                      value={studentForm.confirmPassword} 
                      onChange={handleStudentChange} 
                      className="w-full p-3 pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" 
                      placeholder="••••••••" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowStudentConfirmPassword(!showStudentConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] focus:outline-none transition-colors"
                    >
                      {showStudentConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Contact Number</label>
                  <div className="relative group">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input type="tel" name="contact" value={studentForm.contact} onChange={handleStudentChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Phone Number" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Date of Admission</label>
                  <div className="relative group">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input type="date" name="admissionDate" value={studentForm.admissionDate} onChange={handleStudentChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Current School Name</label>
                  <input type="text" name="schoolName" value={studentForm.schoolName} onChange={handleStudentChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. Model Excellence School" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preferred Language</label>
                  <Select
                    options={languageOptions}
                    styles={customSelectStyles}
                    value={languageOptions.find(opt => opt.value === studentForm.preferredLanguage) || null}
                    onChange={(option) => handleSelectChange('preferredLanguage', option)}
                    placeholder="Select Language"
                    isClearable
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Country</label>
                  <div className="relative group">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" />
                    <input type="text" name="country" value={studentForm.country} onChange={handleStudentChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. UAE, India" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Next Installment Date</label>
                  <input type="date" name="nextInstallmentDate" value={studentForm.nextInstallmentDate} onChange={handleStudentChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" />
                </div>
              </div>

              

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Grade</label>
                  <Select
                    options={gradeOptions}
                    styles={customSelectStyles}
                    value={gradeOptions.find(opt => opt.value === studentForm.grade) || null}
                    onChange={(option) => handleSelectChange('grade', option)}
                    placeholder="Select Grade"
                    isClearable
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Syllabus</label>
                  <Select
                    options={syllabusOptions}
                    styles={customSelectStyles}
                    value={syllabusOptions.find(opt => opt.value === studentForm.syllabus) || null}
                    onChange={(option) => handleSelectChange('syllabus', option)}
                    placeholder="Select Syllabus"
                    isClearable
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Course</label>
                  <Select
                    options={coursesList.map(c => ({ value: c, label: c }))}
                    styles={customSelectStyles}
                    value={coursesList.includes(studentForm.course) ? { value: studentForm.course, label: studentForm.course } : null}
                    onChange={(option) => handleSelectChange('course', option)}
                    placeholder="Select Course"
                    isClearable
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {studentForm.enrollmentType !== 'Tuition' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Assigned Mentor</label>
                    <Select
                      options={mentors.map(m => ({ value: m.id, label: m.name }))}
                      styles={customSelectStyles}
                      value={mentors.find(m => m.id === studentForm.mentorId) ? { value: studentForm.mentorId, label: mentors.find(m => m.id === studentForm.mentorId).name } : null}
                      onChange={(option) => handleSelectChange('mentorId', option)}
                      placeholder="Select Mentor (Optional)"
                      isClearable
                    />
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Student ID #</label>
                  <input type="text" name="registrationNumber" value={studentForm.registrationNumber} onChange={handleStudentChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="E.g. ST-2024-001" autoComplete="off" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Meeting Link</label>
                <input type="text" name="meetingLink" value={studentForm.meetingLink} onChange={handleStudentChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-bold" placeholder="Google Meet Link" />
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
                        {/* Subject Dropdown (React-Select Multi) */}
                        <div className="flex flex-col gap-2 relative">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subjects</label>
                          <Select
                            isMulti
                            isSearchable
                            options={SUBJECT_OPTIONS.map(sub => ({ value: sub, label: sub }))}
                            styles={customSelectStyles}
                            value={(Array.isArray(row.subject) ? row.subject : (row.subject ? [row.subject] : [])).map(sub => ({ value: sub, label: sub }))}
                            onChange={(selectedOptions) => {
                              const selectedValues = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                              const newSubjects = [...selectedSubjects];
                              newSubjects[idx].subject = selectedValues;
                              setSelectedSubjects(newSubjects);
                              
                              if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
                              fetchTimeoutRef.current = setTimeout(() => {
                                fetchAvailableFaculties(idx, newSubjects[idx].subject, newSubjects[idx].dayConfigs);
                              }, 500);
                            }}
                            placeholder="Select Subjects..."
                          />
                        </div>

                        {/* Days Picker (Dropdown to toggle) */}
                        <div className="flex flex-col gap-2 relative" ref={el => dayRefs.current[idx] = el}>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Days</label>
                          <div 
                            onClick={() => {
                              const newSubjects = [...selectedSubjects];
                              newSubjects[idx].isDayDropdownOpen = !newSubjects[idx].isDayDropdownOpen;
                              setSelectedSubjects(newSubjects);
                            }}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 cursor-pointer flex justify-between items-center"
                          >
                            <span className="truncate">
                               {row.dayConfigs && row.dayConfigs.length > 0 
                                ? row.dayConfigs.map(c => `${c.day.substring(0, 3)} ${c.startTime || ''}${c.startTime && c.endTime ? ' - ' : ''}${c.endTime || ''}`).join(', ') 
                                : 'Add Days'}
                            </span>
                            <span className="text-slate-400">▼</span>
                          </div>
                          
                          {row.isDayDropdownOpen && (
                            <div 
                              className="absolute top-[100%] left-0 w-full md:w-[320px] md:w-[400px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] mt-1 p-4 animate-in fade-in zoom-in-95 duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                {DAYS_LIST.map(day => {
                                  const configIdx = row.dayConfigs?.findIndex(c => c.day === day);
                                  const isSelected = configIdx !== -1;
                                  return (
                                    <div 
                                      key={day} 
                                      className={`p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[#008080]/5 border-[#008080]/20' : 'hover:bg-slate-50 border-transparent'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div 
                                          className="flex items-center gap-3 cursor-pointer"
                                          onClick={() => handleDayToggle(idx, day)}
                                        >
                                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                                            {isSelected && <CheckCircle size={12} className="text-white" />}
                                          </div>
                                          <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-[#008080]' : 'text-slate-600'}`}>{day}</span>
                                        </div>
                                        {isSelected && (
                                          <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Configured</span>
                                          </div>
                                        )}
                                      </div>

                                      {isSelected && (
                                        <div className="grid grid-cols-2 gap-2 mt-2 animate-in slide-in-from-top-1 duration-300">
                                          <div className="relative group/time">
                                            <input 
                                              type="text"
                                              placeholder="Start"
                                              value={row.dayConfigs[configIdx].startTime}
                                              onChange={(e) => handleDayTimeChange(idx, configIdx, 'startTime', e.target.value)}
                                              className="w-full bg-white p-2 pr-7 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none border border-slate-200 focus:border-[#008080]"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] cursor-pointer" onClick={(e) => {
                                              document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                              const picker = e.currentTarget.nextElementSibling;
                                              picker.classList.toggle('hidden');
                                            }}>
                                              <Clock size={12} />
                                            </div>
                                            <div className="time-picker-dropdown hidden absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[150] mt-1 p-1 max-h-40 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                              {TIME_SLOTS.map(t => (
                                                <div key={t} onClick={() => {
                                                  handleDayTimeChange(idx, configIdx, 'startTime', t);
                                                  document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                }} className="p-2 hover:bg-[#008080]/10 rounded-lg text-[9px] font-black cursor-pointer transition-colors uppercase">
                                                  {t}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="relative group/time">
                                            <input 
                                              type="text"
                                              placeholder="End"
                                              value={row.dayConfigs[configIdx].endTime}
                                              onChange={(e) => handleDayTimeChange(idx, configIdx, 'endTime', e.target.value)}
                                              className="w-full bg-white p-2 pr-7 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none border border-slate-200 focus:border-[#008080]"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008080] cursor-pointer" onClick={(e) => {
                                              document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                              const picker = e.currentTarget.nextElementSibling;
                                              picker.classList.toggle('hidden');
                                            }}>
                                              <Clock size={12} />
                                            </div>
                                            <div className="time-picker-dropdown hidden absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[150] mt-1 p-1 max-h-40 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                              {TIME_SLOTS.map(t => (
                                                <div key={t} onClick={() => {
                                                  handleDayTimeChange(idx, configIdx, 'endTime', t);
                                                  document.querySelectorAll('.time-picker-dropdown').forEach(el => el.classList.add('hidden'));
                                                }} className="p-2 hover:bg-[#008080]/10 rounded-lg text-[9px] font-black cursor-pointer transition-colors uppercase">
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

                        {/* Faculty Selector (React-Select) */}
                        <div className="flex flex-col gap-2 relative">
                          <label className="text-[10px] font-black text-[#008080] uppercase tracking-widest ml-1">Assigned Faculty</label>
                          <Select
                            options={((row.availableFaculties && row.availableFaculties.length > 0) ? row.availableFaculties : faculties).map(f => ({
                              value: f.id.toString(),
                              label: `${f.name} ${f.isAvailable === false ? '(NOT AVAILABLE)' : ''} ${f.subject ? `- ${f.subject}` : ''}`
                            }))}
                            styles={customSelectStyles}
                            value={
                              row.facultyId 
                                ? { 
                                    value: row.facultyId, 
                                    label: faculties.find(f => f.id.toString() === row.facultyId)?.name || 'Unknown' 
                                  } 
                                : null
                            }
                            onChange={(option) => {
                              handleSubjectChange(idx, 'facultyId', option ? option.value : '');
                            }}
                            placeholder={row.dayConfigs?.length === 0 ? 'Select Days First' : 'Search Faculty...'}
                            isClearable
                            isSearchable
                            isDisabled={row.dayConfigs?.length === 0}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hourly Rate:</label>
                           <input 
                              type="number" 
                              value={row.hourlyRate} 
                              onChange={(e) => handleSubjectChange(idx, 'hourlyRate', e.target.value)}
                              className="w-24 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#008080]" 
                              placeholder="₹ 500"
                           />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newSubjects = [...selectedSubjects];
                            newSubjects.splice(idx, 1);
                            setSelectedSubjects(newSubjects);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-2 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full mt-8 bg-[#008080] text-white p-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl hover:shadow-[#008080] flex items-center justify-center gap-3">
                {loading ? 'Processing...' : 'Register Student'}
                {!loading && <CheckCircle size={16} />}
              </button>
            </form>
          )}

          {activeTab === 'faculty' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <form onSubmit={submitFaculty} autoComplete="off" className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Faculty Onboarding System</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="text" name="name" required value={facultyForm.name} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="Faculty Name" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="email" name="email" required autoComplete="new-password" value={facultyForm.email} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="Email Address" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="tel" name="phone_number" required value={facultyForm.phone_number} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="Phone Number" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Place / City</label>
                  <div className="relative group">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="text" name="place" required value={facultyForm.place} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="Location" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Assign Login Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="password" name="password" required value={facultyForm.password} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="password" name="confirmPassword" required value={facultyForm.confirmPassword} onChange={handleFacultyChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 font-bold" placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>
              </div>

              {/* Advanced Faculty Profile Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Primary Subject</label>
                  <Select
                    isMulti
                    options={SUBJECT_OPTIONS.map(sub => ({ value: sub, label: sub }))}
                    value={facultyForm.primary_subject ? (Array.isArray(facultyForm.primary_subject) ? facultyForm.primary_subject.map(s => ({ value: s, label: s })) : facultyForm.primary_subject.split(',').filter(Boolean).map(s => ({ value: s, label: s }))) : []}
                    onChange={(sel) => setFacultyForm({...facultyForm, primary_subject: sel ? sel.map(s => s.value) : []})}
                    styles={customSelectStyles}
                    placeholder="Select Primary Subjects"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Secondary Subjects</label>
                  <Select
                    isMulti
                    options={SUBJECT_OPTIONS.map(sub => ({ value: sub, label: sub }))}
                    value={facultyForm.secondary_subjects.map(s => ({ value: s, label: s }))}
                    onChange={(sel) => setFacultyForm({...facultyForm, secondary_subjects: sel ? sel.map(s => s.value) : []})}
                    styles={customSelectStyles}
                    placeholder="Select Secondary Subjects"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Section Coverage</label>
                  <Select
                    options={gradeOptions}
                    value={facultyForm.section ? { value: facultyForm.section, label: facultyForm.section } : null}
                    onChange={(sel) => setFacultyForm({...facultyForm, section: sel ? sel.value : ''})}
                    styles={customSelectStyles}
                    placeholder="Select Section"
                    isClearable
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Highest Qualification</label>
                  <input type="text" value={facultyForm.qualification} onChange={(e) => setFacultyForm({...facultyForm, qualification: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600 font-bold" placeholder="e.g. MSc, BEd" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Experience</label>
                  <input type="text" value={facultyForm.experience} onChange={(e) => setFacultyForm({...facultyForm, experience: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600 font-bold" placeholder="e.g. 5 Years" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Teaching Mode</label>
                  <Select
                    options={[{value:'Online',label:'Online'},{value:'Offline',label:'Offline'},{value:'Both',label:'Both'}]}
                    value={{ value: facultyForm.teaching_mode, label: facultyForm.teaching_mode }}
                    onChange={(sel) => setFacultyForm({...facultyForm, teaching_mode: sel.value})}
                    styles={customSelectStyles}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Joining Date</label>
                  <input type="date" value={facultyForm.joining_date} onChange={(e) => setFacultyForm({...facultyForm, joining_date: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600 font-bold" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Syllabus Expertise</label>
                  <Select
                    isMulti
                    options={syllabusOptions}
                    value={facultyForm.syllabus.map(s => ({ value: s, label: s }))}
                    onChange={(sel) => setFacultyForm({...facultyForm, syllabus: sel ? sel.map(s => s.value) : []})}
                    styles={customSelectStyles}
                    placeholder="Select Syllabus"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Language Proficiency</label>
                  <Select
                    isMulti
                    options={languageOptions}
                    value={facultyForm.languages_proficiency.map(s => ({ value: s, label: s }))}
                    onChange={(sel) => setFacultyForm({...facultyForm, languages_proficiency: sel ? sel.map(s => s.value) : []})}
                    styles={customSelectStyles}
                    placeholder="Select Languages"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-6 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Availability (Time Slots)</label>
                {facultyForm.availability.map((slot, index) => (
                  <div key={index} className="flex flex-col gap-1 p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Slot {index + 1}</span>
                      {facultyForm.availability.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => {
                            const newSlots = facultyForm.availability.filter((_, i) => i !== index);
                            setFacultyForm({ ...facultyForm, availability: newSlots });
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
                            const newSlots = [...facultyForm.availability];
                            const parts = (newSlots[index] || '').split(' - ');
                            newSlots[index] = `${e.target.value} - ${parts[1] ? to24H(parts[1]) : ''}`;
                            setFacultyForm({ ...facultyForm, availability: newSlots });
                          }} 
                          className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-black focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none" 
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">to</span>
                      <div className="relative flex-1">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          value={to24H((slot || '').split(' - ')[1] || '')} 
                          onChange={(e) => {
                            const newSlots = [...facultyForm.availability];
                            const parts = (newSlots[index] || '').split(' - ');
                            newSlots[index] = `${parts[0] ? to24H(parts[0]) : ''} - ${e.target.value}`;
                            setFacultyForm({ ...facultyForm, availability: newSlots });
                          }} 
                          className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-black focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setFacultyForm({ ...facultyForm, availability: [...facultyForm.availability, ''] })}
                  className="mt-2 py-2 px-4 bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors w-fit"
                >
                  + Add Time Slot
                </button>
                <p className="text-[10px] text-slate-500 ml-1">Define faculty available hours. Add multiple slots if needed.</p>
              </div>

                  <button disabled={loading} type="submit" className="w-full mt-8 bg-[#008080] text-white p-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl hover:shadow-emerald-100 flex items-center justify-center gap-3">
                    {loading ? 'Processing...' : 'Securely Onboard Faculty'}
                    {!loading && <CheckCircle size={16} />}
                  </button>
                </form>
            </div>
          )}

          {activeTab === 'ssc' && (
            <form onSubmit={submitSSC} className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-10" autoComplete="off">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">SSC Onboarding</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Register Student Success Coordinator</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" name="name" required autoComplete="off" value={sscForm.name} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="Enter full name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="email" name="email" required autoComplete="new-password" value={sscForm.email} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="email@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="tel" name="phone_number" required autoComplete="off" value={sscForm.phone_number} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="Contact number" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Place / City</label>
                  <div className="relative group">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" name="place" required autoComplete="off" value={sscForm.place} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="Work location" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Login Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" name="password" required value={sscForm.password} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" name="confirmPassword" required value={sscForm.confirmPassword} onChange={handleSSCChange} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-indigo-500/10 transition-all text-black" placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button 
                  disabled={loading} 
                  type="submit" 
                  className="px-5 md:px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#008080] transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {loading ? 'Processing...' : 'Complete SSC Registration'}
                  {!loading && <CheckCircle size={18} />}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;
