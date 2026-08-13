import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import {
 CheckSquare,
 Clock,
 AlertCircle,
 Upload,
 CheckCircle2,
 Calendar,
 ArrowUpRight,
 Search,
 FileText,
 ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const FacultyTasks = () => {
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [uploadingId, setUploadingId] = useState(null);

 useEffect(() => {
 fetchTasks();
 }, []);

 const fetchTasks = async () => {
 try {
 const res = await axios.get('/faculty/tasks');
 if (res.data.success) {
 setTasks(res.data.data);
 }
 } catch (error) {
 toast.error("Failed to load tasks");
 } finally {
 setLoading(false);
 }
 };

 const handleFileUpload = async (taskId, file) => {
 if (!file) return;

 const formData = new FormData();
 formData.append('proof', file);

 setUploadingId(taskId);
 try {
 const res = await axios.put(`/faculty/tasks/${taskId}/proof`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 if (res.data.success) {
 toast.success("Task completed with proof");
 fetchTasks();
 }
 } catch (error) {
 toast.error("Upload failed");
 } finally {
 setUploadingId(null);
 }
 };

 return (
 <div className="space-y-12">
 {/* Header Area */}
 <div className="flex flex-col md:flex-row justify-between items-center gap-8">
 <div>
 <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operational Tasks</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Administrative directives from Academic Head</p>
 </div>

 <div className="flex gap-4">
 <div className="bg-[#008080]/10 px-4 md:px-8 py-5 rounded-[2rem] border border-[#008080] flex items-center gap-4">
 <div className="w-10 h-10 bg-[#008080] rounded-2xl flex items-center justify-center text-white">
 <CheckSquare size={20} />
 </div>
 <div>
 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Active Tasks</p>
 <p className="text-xl font-black text-[#008080]">{tasks.filter(t => t.status === 'Pending').length}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Tasks Grid */}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
 {loading ? (
 [1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-100 rounded-[3.5rem] animate-pulse"></div>)
 ) : tasks.length > 0 ? (
 tasks.map((task) => (
 <div key={task.id} className="bg-white p-6 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
 <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full -mr-40 -mt-40 transition-transform duration-700 group-hover:scale-150"></div>

 <div className="relative z-10">
 <div className="flex justify-between items-start mb-10">
 <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
 }`}>
 {task.status === 'Completed' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
 </div>
 <div className="text-right">
 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm inline-block ${task.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
 }`}>
 {task.status}
 </div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-3 flex items-center justify-end gap-2">
 <Calendar size={12} />
 Deadline: {new Date(task.deadline).toLocaleDateString()}
 </p>
 </div>
 </div>

 <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">{task.title}</h3>
 <p className="text-slate-600 text-sm font-medium leading-relaxed mb-10 max-w-xl">
 {task.description}
 </p>

 <div className="pt-10 border-t border-slate-50 flex flex-wrap items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
 <FileText size={18} />
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Assigned By</p>
 <p className="text-xs font-black text-slate-900">{task.assigned_by_name || 'Academic Head'}</p>
 </div>
 </div>

 {task.status === 'Pending' ? (
 <div className="flex items-center gap-4">
 <input
 type="file"
 id={`proof-${task.id}`}
 className="hidden"
 onChange={(e) => handleFileUpload(task.id, e.target.files[0])}
 />
 <label
 htmlFor={`proof-${task.id}`}
 className={`flex items-center gap-3 px-4 md:px-8 py-4 bg-yellow-400 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-[#008080] transition-all shadow-xl shadow-slate-200 ${uploadingId === task.id ? 'opacity-50 cursor-wait' : ''
 }`}
 >
 <Upload size={14} />
 {uploadingId === task.id ? 'Uploading...' : 'Upload Proof & Close'}
 </label>
 </div>
 ) : (
 <div className="flex items-center gap-3">
 {task.proof_url && (
 <a
 href={task.proof_url}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-2 text-[#008080] font-black text-[10px] uppercase tracking-widest hover:underline"
 >
 View Submission <ExternalLink size={12} />
 </a>
 )}
 <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest flex flex-col items-end gap-1 px-6 py-4 bg-emerald-50 rounded-2xl">
 <div className="flex items-center gap-2">
 <CheckCircle2 size={14} /> Verified Completed
 </div>
 {task.completed_at && (
 <span className="text-[9px] text-slate-500 font-bold lowercase tracking-normal">
 at {new Date(task.completed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
 </span>
 )}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
 <CheckSquare size={48} />
 </div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight ">Clear Schedule</h3>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">All administrative tasks have been addressed</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default FacultyTasks;
