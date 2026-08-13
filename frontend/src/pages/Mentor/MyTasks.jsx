import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ListTodo, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const MyTasks = () => {
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchTasks();
 }, []);

  const [uploadingId, setUploadingId] = useState(null);

 const fetchTasks = async () => {
 try {
 const res = await api.get('/mentor/tasks');
 setTasks(res.data.data);
 } catch (error) {
 toast.error("Failed to load tasks");
 } finally {
 setLoading(false);
 }
 };

 const handleComplete = async (taskId, file = null) => {
 if (!file) {
 try {
 await api.put(`/mentor/tasks/${taskId}/complete`);
 toast.success("Task completed!");
 fetchTasks();
 } catch (error) {
 toast.error("Action failed");
 }
 return;
 }

 const formData = new FormData();
 formData.append('proof', file);

 setUploadingId(taskId);
 try {
 await api.put(`/mentor/tasks/${taskId}/complete`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 toast.success("Task completed with proof!");
 fetchTasks();
 } catch (error) {
 toast.error("Upload failed");
 } finally {
 setUploadingId(null);
 }
 };

 const getStatusStyles = (status, deadline) => {
 if (status === 'Completed') return { bg: 'bg-emerald-50/50', text: 'text-emerald-700', border: 'border-emerald-100', icon: <CheckCircle size={20} className="text-emerald-500" /> };

 const isOverdue = new Date(deadline) < new Date() && status !== 'Completed';
 if (isOverdue) return { bg: 'bg-rose-50/50', text: 'text-rose-700', border: 'border-rose-100', icon: <AlertCircle size={20} className="text-rose-500" /> };

 return { bg: 'bg-amber-50/50', text: 'text-amber-700', border: 'border-amber-100', icon: <Clock size={20} className="text-amber-500" /> };
 };

 return (
 <div className="flex flex-col gap-10 pb-10">
 <header className="bg-white/70 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10">
 <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 md:gap-8 w-full">
 <div className="w-16 h-16 md:w-20 md:h-20 bg-[#008080] rounded-[24px] md:rounded-[28px] shadow-2xl shadow-[#008080]/30 flex items-center justify-center text-white shrink-0 group hover:rotate-12 transition-transform duration-700">
 <ListTodo size={28} className="md:w-[36px] md:h-[36px]" strokeWidth={2.5} />
 </div>
 <div>
 <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3 break-words px-2 md:px-0">My Tasks</h1>
 <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-3 mt-1">
 <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse shrink-0"></div>
 Assigned Tasks & Action Items
 </p>
 </div>
 </div>
 </header>

 {loading ? (
 <div className="text-center p-20 text-slate-600 font-bold animate-pulse">Loading Tasks...</div>
 ) : (
 <div className="flex flex-col gap-4">
 {tasks.map((task) => {
 const style = getStatusStyles(task.status, task.deadline);
 return (
 <div key={task.id} className={`p-6 rounded-[2rem] border ${style.border} ${style.bg} transition-all duration-300 relative group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md`}>
 {/* Left Side: Icon, Status, Title, Desc */}
 <div className="flex items-start gap-5 flex-1 w-full">
 <div className={`mt-0.5 h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-white shadow-sm border ${style.border}`}>
 {style.icon}
 </div>
 <div className="flex flex-col gap-1.5 w-full">
 <div className="flex flex-wrap items-center gap-3">
 <h3 className="text-base font-black text-slate-900 leading-tight break-words">{task.title}</h3>
 <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg bg-white border ${style.border} ${style.text} shadow-sm shrink-0`}>
 {task.status === 'Completed' ? 'Completed' : (new Date(task.deadline) < new Date() ? 'Overdue' : 'Pending')}
 </span>
 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
 {task.priority || 'Standard'}
 </span>
 </div>
 <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl line-clamp-2 pr-4">{task.description}</p>
 </div>
 </div>

 {/* Right Side: Details & Action */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200/50 justify-between md:justify-end shrink-0">
 <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto">
 <div className="flex flex-col">
 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Assigned By</p>
 <p className="text-[10px] font-bold text-slate-700 uppercase truncate max-w-[100px]">
 {task.assigner_name || 'Admin'} <span className="opacity-50 lowercase">({task.assigner_role?.replace('_', ' ') || 'admin'})</span>
 </p>
 </div>
 <div className="flex flex-col">
 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Deadline</p>
 <p className="text-[10px] font-bold text-slate-700">{new Date(task.deadline).toLocaleDateString()}</p>
 </div>
 </div>

 <div className="w-full sm:w-[180px] flex flex-col sm:items-end gap-3 mt-2 sm:mt-0">
 {task.status !== 'Completed' ? (
 <div className="flex flex-col gap-2 w-full">
 <input
 type="file"
 id={`proof-${task.id}`}
 className="hidden"
 onChange={(e) => handleComplete(task.id, e.target.files[0])}
 />
 <label
 htmlFor={`proof-${task.id}`}
 className={`bg-[#008080] text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-[#006666] transition-all flex items-center justify-center gap-2 ${uploadingId === task.id ? 'opacity-50 cursor-wait' : ''}`}
 >
 {uploadingId === task.id ? 'Uploading...' : 'Upload & Close'}
 </label>
 <button
 onClick={() => handleComplete(task.id)}
 className="bg-[#008080] text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
 >
 Mark Done
 </button>
 </div>
 ) : (
 <div className="text-left sm:text-right flex flex-col gap-2 items-start sm:items-end w-full">
 <div className="text-[9px] font-black text-[#008080] uppercase tracking-widest">
 Finished At: <br />
 <span className="text-slate-500 font-bold">
 {task.completed_at ? new Date(task.completed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'Verified'}
 </span>
 </div>
 {task.proof_url && (
 <a 
 href={task.proof_url} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-[9px] font-black text-[#008080] hover:underline uppercase tracking-widest bg-[#008080]/5 px-2 py-1 rounded-md"
 >
 View Attachment
 </a>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 {tasks.length === 0 && (
 <div className="py-10 md:py-20 px-4 md:px-0 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center shadow-sm w-full mx-auto">
 <CheckCircle size={40} className="text-emerald-100 mb-4" />
 <p className="text-slate-600 font-bold text-center break-words text-sm md:text-base">No active tasks found.</p>
 </div>
 )}
 </div>
 )}
 </div>
 );
};

export default MyTasks;
