import React, { useState, useEffect } from 'react';
import { User, Users, GraduationCap, Phone, Clock, Calendar, CheckCircle, MapPin, Lock, Mail } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RegistrationForm = ({ onSuccess, preSelectedRole }) => {
 const [role, setRole] = useState(preSelectedRole || 'student');
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (preSelectedRole) setRole(preSelectedRole);
 }, [preSelectedRole]);

 const [formData, setFormData] = useState({
 name: '',
 email: '',
 phone_number: '',
 place: '',
 password: '',
 grade: '',
 syllabus: '',
 subject: '',
 course: '',
 hour: '',
 mentor_name: '',
 faculty_name: '',
 enrollment_type: '', // Mentorship, Tuition, etc.
 admission_type: 'new', // new or rejoin
 total_fees: '',
 total_paid: '',
 total_hours: '',
 next_installment_date: '',
 time_table: {
 mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
 },
 meeting_link: ''
 });

 const handleRoleChange = (newRole) => {
 setRole(newRole);
 // Soft reset
 setFormData(prev => ({
 ...prev,
 grade: '', syllabus: '', subject: '', course: '', hour: '', mentor_name: '', faculty_name: '',
 }));
 };

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleTimetableChange = (day, value) => {
 setFormData(prev => ({
 ...prev,
 time_table: { ...prev.time_table, [day]: value }
 }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);

 try {
 let endpoint = '';
 let payload = {};

 if (role === 'super_admin' || role === 'mentor_head' || role === 'academic_head') {
 endpoint = '/auth/register';
 payload = {
 name: formData.name,
 email: formData.email,
 phone_number: formData.phone_number,
 place: formData.place,
 password: formData.password,
 role: role // 'super_admin', 'mentor_head', or 'academic_head'
 };
 } else {
 // Student
 endpoint = '/auth/register';
 payload = { ...formData, role: 'student' };
 }

 const response = await api.post(endpoint, payload);

 if (response.data.success) {
 toast.success(response.data.message);
 if (onSuccess) onSuccess(response.data);

 // Reset form
 setFormData({
 name: '',
 email: '',
 phone_number: '',
 place: '',
 password: '',
 grade: '',
 syllabus: '',
 subject: '',
 course: '',
 hour: '',
 mentor_name: '',
 faculty_name: '',
 enrollment_type: '',
 next_installment_date: '',
 time_table: {
 mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
 }
 });
 }
 } catch (error) {
 toast.error(error.response?.data?.message || "Registration failed");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col gap-6">
 {/* Role Switcher - conditional */}
 {!preSelectedRole && (
 <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
 {['student', 'super_admin'].map((r) => (
 <button
 key={r}
 type="button"
 onClick={() => handleRoleChange(r)}
 className={`
 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
 ${role === r ? 'bg-white text-[#008080] shadow-sm' : 'text-slate-400'}
 `}
 >
 {r.replace('_', ' ')}
 </button>
 ))}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
 <div className="relative group">
 <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
 <input
 type="text"
 name="name"
 required
 className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Name"
 value={formData.name}
 onChange={handleInputChange}
 />
 </div>
 </div>

 {(role === 'super_admin' || role === 'mentor_head' || role === 'academic_head') && (
 <>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
 <div className="relative group">
 <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
 <input
 type="email"
 name="email"
 className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder={`${role.replace('_', ' ')} Email`}
 value={formData.email}
 onChange={handleInputChange}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
 <div className="relative group">
 <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
 <input
 type="text"
 name="phone_number"
 required
 className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Phone"
 value={formData.phone_number}
 onChange={handleInputChange}
 />
 </div>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Place</label>
 <div className="relative group">
 <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
 <input
 type="text"
 name="place"
 required
 className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Place"
 value={formData.place}
 onChange={handleInputChange}
 />
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
 <div className="relative group">
 <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
 <input
 type="password"
 name="password"
 className="w-full p-3 pl-12 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="******"
 value={formData.password}
 onChange={handleInputChange}
 />
 </div>
 </div>
 </>
 )}

 {(role === 'mentor' || role === 'faculty') && (
 <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">
 Registration for this role is restricted to head panels.
 </p>
 </div>
 )}

 {role === 'student' && (
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
 <select
 name="grade"
 required
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold appearance-none"
 value={formData.grade}
 onChange={handleInputChange}
 >
 <option value="" disabled>Select Grade</option>
 <option value="KG 1">KG 1</option>
 <option value="KG 2">KG 2</option>
 {[...Array(12)].map((_, i) => (
 <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Syllabus</label>
 <select
 name="syllabus"
 required
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold appearance-none"
 value={formData.syllabus}
 onChange={handleInputChange}
 >
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
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
 <select
 name="subject"
 required
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold appearance-none"
 value={formData.subject}
 onChange={handleInputChange}
 >
 <option value="" disabled>Select Subject</option>
 <option value="Mathematics">Mathematics</option>
 <option value="Physics">Physics</option>
 <option value="Chemistry">Chemistry</option>
 <option value="Biology">Biology</option>
 <option value="Science">Science</option>
 <option value="Social Science">Social Science</option>
 <option value="English">English</option>
 <option value="Malayalam">Malayalam</option>
 <option value="Hindi">Hindi</option>
 <option value="Arabic">Arabic</option>
 <option value="Accountancy">Accountancy</option>
 <option value="Business Studies">Business Studies</option>
 <option value="Economics">Economics</option>
 <option value="Computer Science">Computer Science</option>
 <option value="All Subjects">All Subjects</option>
 </select>
 </div>
 </div>
 )}

 {role === 'student' && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course</label>
 <input
 type="text"
 name="course"
 required
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Course"
 value={formData.course}
 onChange={handleInputChange}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hour</label>
 <input
 type="text"
 name="hour"
 required
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Hour"
 value={formData.hour}
 onChange={handleInputChange}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mentor Name</label>
 <input
 type="text"
 name="mentor_name"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Mentor Name"
 value={formData.mentor_name}
 onChange={handleInputChange}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Name</label>
 <input
 type="text"
 name="faculty_name"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Faculty Name"
 value={formData.faculty_name}
 onChange={handleInputChange}
 />
 </div>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Installment Date</label>
 <input
 type="date"
 name="next_installment_date"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 value={formData.next_installment_date}
 onChange={handleInputChange}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Email (Optional)</label>
 <input
 type="email"
 name="email"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Email Address"
 value={formData.email}
 onChange={handleInputChange}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Password (Optional)</label>
 <input
 type="password"
 name="password"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="Set Password"
 value={formData.password}
 onChange={handleInputChange}
 />
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Meet Link (Optional)</label>
 <input
 type="text"
 name="meeting_link"
 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#008080] font-semibold"
 placeholder="https://meet.google.com/..."
 value={formData.meeting_link}
 onChange={handleInputChange}
 />
 </div>

 {/* NEW: Enrollment Type (Badge System) */}
 <div className="flex flex-col gap-4 p-4 bg-[#008080]/5 rounded-2xl border border-[#008080]/10">
 <label className="text-[10px] font-black text-[#008080] uppercase tracking-widest ml-1 flex items-center gap-2">
 <span className="bg-[#008080] text-white p-1 rounded">?</span> Enrollment Type Selection
 </label>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {[
 { label: 'Mentorship only', type: 'Mentorship', badge: 'Gold 🥇' },
 { label: 'Tuition only', type: 'Tuition', badge: 'Silver 🥈' },
 { label: 'Both Plan', type: 'Mentorship and Tuition', badge: 'Diamond 💎' }
 ].map((item) => (
 <button
 key={item.type}
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, enrollment_type: item.type }))}
 className={`
 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1
 ${formData.enrollment_type === item.type 
 ? 'bg-[#008080]/10 border-[#008080] shadow-sm' 
 : 'bg-white border-slate-100 hover:border-slate-200'}
 `}
 >
 <span className="text-[10px] font-black text-slate-900 leading-none">{item.label}</span>
 <span className="text-[9px] font-bold text-[#008080] uppercase tracking-tighter">{item.badge}</span>
 </button>
 ))}
 </div>
 </div>

 {/* NEW: Admission Type and Fee Tracking */}
 <div className="flex flex-col gap-4 p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
 <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 flex items-center gap-2">
 <span className="bg-amber-500 text-white p-1 rounded">₹</span> Admission & Fee Tracking
 </label>
 
 <div className="grid grid-cols-2 gap-3 mb-2">
 <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, admission_type: 'new' }))}
 className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${formData.admission_type === 'new' ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}
 >
 New Admission
 </button>
 <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, admission_type: 'rejoin' }))}
 className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${formData.admission_type === 'rejoin' ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}
 >
 Rejoining
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Course Fee</label>
 <input
 type="number"
 name="total_fees"
 className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold"
 placeholder="e.g. 50000"
 value={formData.total_fees}
 onChange={handleInputChange}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Initial Payment</label>
 <input
 type="number"
 name="total_paid"
 className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold"
 placeholder="e.g. 10000"
 value={formData.total_paid}
 onChange={handleInputChange}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Hours</label>
 <input
 type="number"
 name="total_hours"
 className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold"
 placeholder="e.g. 144"
 value={formData.total_hours}
 onChange={handleInputChange}
 />
 </div>
 </div>
 </div>

 {/* Weekly Time Table */}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weekly Time Table</label>
 <div className="grid grid-cols-4 gap-2">
 {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
 <div key={day} className="flex flex-col gap-1">
 <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">{day}</span>
 <input
 type="text"
 placeholder="Time"
 className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] outline-none focus:bg-white font-bold"
 value={formData.time_table[day]}
 onChange={(e) => handleTimetableChange(day, e.target.value)}
 />
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 <button
 type="submit"
 disabled={loading}
 className={`
 w-full bg-[#008080] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest 
 transition-all flex items-center justify-center gap-2 shadow-sm
 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#008080] hover:text-white shadow-lg shadow-[#008080]/30 hover:shadow-[#008080]/30/50'}
 `}
 >
 {loading ? 'Submitting...' : `Register as ${role.replace('_', ' ')}`}
 {!loading && <CheckCircle size={16} />}
 </button>
 </form>
 </div>
 );
};

export default RegistrationForm;
