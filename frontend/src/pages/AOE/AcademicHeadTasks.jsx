import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar, Clock, AlertTriangle, Layers, Upload, ExternalLink } from 'lucide-react';

const AcademicHeadTasks = () => {
 const { user } = useAuth();
 const [tasks, setTasks] = useState([]);
 const [filteredTasks, setFilteredTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [assignees, setAssignees] = useState([]);
 const [filterPriority, setFilterPriority] = useState('All');
 const [uploadingId, setUploadingId] = useState(null);
 const [formData, setFormData] = useState({
 title: '',
 description: '',
 mentor_id: '', // Reusing this field name as backend expects it for assigned_to
 deadline: '',
 priority: 'Medium'
 });

 useEffect(() => {
 fetchTasks();
 fetchAssignees();
 }, []);

 const fetchTasks = async () => {
 try {
 setLoading(true);
 const response = await api.get('/tasks');
 setTasks(response.data.data);
 setFilteredTasks(response.data.data);
 setLoading(false);
 } catch (error) {
 toast.error("Failed to load tasks");
 setLoading(false);
 }
 };

 const handleComplete = async (taskId, file = null) => {
 if (!file) {
 try {
 await api.put(`/api/tasks/${taskId}/status`, { status: 'Completed' });
 toast.success("Task completed!");
 fetchTasks();
 } catch (error) {
 toast.error("Action failed");
 }
 return;
 }

 const formDataUpload = new FormData();
 formDataUpload.append('proof', file);
 formDataUpload.append('status', 'Completed');

 setUploadingId(taskId);
 try {
 await api.put(`/api/tasks/${taskId}/status`, formDataUpload, {
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

 const fetchAssignees = async () => {
 try {
 const response = await api.get('/aoe/dropdowns');
 const { faculties, mentors, mentorHeads } = response.data.data;

 // Consolidate all potential assignees
 const allAssignees = [
 ...faculties.map(f => ({ ...f, type: 'Faculty' })),
 ...mentors.map(m => ({ ...m, type: 'Mentor' })),
 ...mentorHeads.map(mh => ({ ...mh, type: 'Mentor Head' }))
 ];

 setAssignees(allAssignees);
 } catch (error) {
 console.error("Failed to fetch assignee list");
 }
 };

 const handleSearch = (query) => {
 const filtered = tasks.filter(t =>
 t.title?.toLowerCase().includes(query.toLowerCase()) ||
 t.description?.toLowerCase().includes(query.toLowerCase()) ||
 t.mentor_name?.toLowerCase().includes(query.toLowerCase())
 );
 setFilteredTasks(filtered);
 };

 const handleFilter = () => {
 const priorities = ['All', 'High', 'Medium', 'Low'];
 const currentIndex = priorities.indexOf(filterPriority);
 const nextIndex = (currentIndex + 1) % priorities.length;
 const nextPriority = priorities[nextIndex];

 setFilterPriority(nextPriority);

 if (nextPriority === 'All') {
 setFilteredTasks(tasks);
 } else {
 setFilteredTasks(tasks.filter(t => t.priority === nextPriority));
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 await api.post('/tasks', formData);
 toast.success("Task assigned to faculty successfully");
 setIsModalOpen(false);
 setFormData({ title: '', description: '', mentor_id: '', deadline: '', priority: 'Medium' });
 fetchTasks();
 } catch (error) {
 toast.error(error.response?.data?.message || "Failed to create task");
 }
 };

 const handleDelete = async (task) => {
 const id = task.id;
 const title = task.title || 'this task';

 premiumConfirm(async () => {
 try {
 await api.delete(`/tasks/${id}`);
 toast.success("Task removed");
 fetchTasks();
 } catch (error) {
 toast.error("Failed to delete task");
 }
 }, {
 name: title,
 title: 'Delete Task',
 message: `Are you sure you want to permanently delete the task "${title}"?`,
 type: 'danger'
 });
 };

 const academicPresets = [
 { title: 'Conduct Chapter Exam', desc: 'Conduct a formal exam after completing Chapter 5.', priority: 'High' },
 { title: 'Curriculum Audit', desc: 'Review student progress logs for the current week.', priority: 'Medium' },
 { title: 'Remedial Session', desc: 'Identify students struggling with recent chapters and schedule a remedial session.', priority: 'High' },
 { title: 'Parent Update Call', desc: 'Initiate interaction with parents for the selected student bunch.', priority: 'Medium' }
 ];

 const applyPreset = (preset) => {
 setFormData({
 ...formData,
 title: preset.title,
 description: preset.desc,
 priority: preset.priority
 });
 };

 const columns = [
 {
 header: 'Task Objective', accessor: 'title', render: (row) => (
 <div className="flex flex-col">
 <span className="font-bold text-slate-900">{row.title}</span>
 <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider truncate max-w-[200px] mt-0.5">{row.description}</span>
 </div>
 )
 },
 {
 header: 'Assigned To', accessor: 'mentor_name', render: (row) => (
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-[#008080]/10 rounded-xl flex items-center justify-center text-[10px] font-black text-[#008080] border border-[#008080] uppercase shrink-0">
 {row.mentor_name?.charAt(0) || 'U'}
 </div>
 <div className="flex flex-col">
 <span className="text-slate-700 font-bold text-xs truncate max-w-[120px]">{row.mentor_name || 'Unassigned'}</span>
 </div>
 </div>
 </div>
 )
 },
 {
 header: 'Assigned By', accessor: 'assigner_name', render: (row) => (
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-700">{row.assigner_name || 'System Admin'}</span>
 <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{row.assigner_role?.replace('_', ' ') || 'admin'}</span>
 </div>
 )
 },
 {
 header: 'Deadline', accessor: 'deadline', render: (row) => (
 <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase">
 <Calendar size={14} className="text-slate-300" />
 {new Date(row.deadline).toLocaleDateString()}
 </div>
 )
 },
 {
 header: 'Priority', accessor: 'priority', render: (row) => (
 <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${row.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
 row.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
 'bg-emerald-50 text-emerald-600 border border-emerald-100'
 }`}>
 {row.priority}
 </span>
 )
 },
 {
 header: 'Phase', accessor: 'status', render: (row) => (
 <div className="flex flex-col gap-2">
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${row.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
 <span className={`text-[10px] font-black uppercase tracking-widest ${row.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
 {row.status}
 </span>
 </div>
 
 {row.status === 'Completed' ? (
 <div className="flex flex-col gap-1">
 {row.completed_at && (
 <span className="text-[9px] font-bold text-slate-500 lowercase">
 at {new Date(row.completed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
 </span>
 )}
 {row.proof_url && (
 <a 
 href={row.proof_url} 
 target="_blank" 
 rel="noopener noreferrer" 
 className="text-[9px] font-black text-[#008080] hover:underline uppercase tracking-tighter bg-[#008080]/5 px-1.5 py-0.5 rounded w-fit"
 >
 View Evidence
 </a>
 )}
 </div>
 ) : (
 row.assigned_to === user.id && (
 <div className="flex flex-col gap-2 mt-2">
 <input
 type="file"
 id={`proof-${row.id}`}
 className="hidden"
 onChange={(e) => handleComplete(row.id, e.target.files[0])}
 />
 <label
 htmlFor={`proof-${row.id}`}
 className={`bg-[#008080] text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-[#006666] transition-all flex items-center justify-center gap-2 ${uploadingId === row.id ? 'opacity-50 cursor-wait' : ''}`}
 >
 <Upload size={12} />
 {uploadingId === row.id ? 'Uploading...' : 'Upload & Close'}
 </label>
 <button
 onClick={() => handleComplete(row.id)}
 className="bg-[#008080] text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all font-bold"
 >
 Mark Done
 </button>
 </div>
 )
 )}
 </div>
 )
 },
 ];

 return (
 <div className="flex flex-col gap-8">
 <div className="flex justify-between items-end">
 <div className="flex flex-col gap-1">
 <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">Academic Task Delegation</h2>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Assignment of academic deliverables to the workforce</p>
 </div>
 <button
 onClick={() => setIsModalOpen(true)}
 className="flex items-center gap-3 bg-[#008080] text-white px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#008080] transition-all shadow-xl shadow-[#008080]/30 hover:-translate-y-1 active:scale-95"
 >
 <Plus size={18} />
 <span>Initiate New Task</span>
 </button>
 </div>

 <DataTable
 columns={columns}
 data={filteredTasks}
 loading={loading}
 onSearch={handleSearch}
 onFilter={handleFilter}
 onDelete={handleDelete}
 searchPlaceholder="Search tasks or faculty leads..."
 />

 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title="Academic Task Assignment"
 size="md"
 >
 <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-2">
 <div className="flex flex-col gap-3">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Quick Action Templates</label>
 <select
 onChange={(e) => {
 const preset = academicPresets.find(p => p.title === e.target.value);
 if (preset) applyPreset(preset);
 }}
 className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold text-slate-700 appearance-none"
 defaultValue=""
 >
 <option value="" disabled>Select a preset action...</option>
 {academicPresets.map((p, i) => (
 <option key={i} value={p.title}>{p.title}</option>
 ))}
 </select>
 <p className="text-[9px] font-bold text-slate-600 ml-1">* Selecting a template will auto-fill the target details below.</p>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Task Identification</label>
 <input
 type="text"
 required
 className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold text-slate-700"
 placeholder="e.g., Weekly Class Report Review"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 />
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Operational Directives</label>
 <textarea
 rows="4"
 required
 className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold text-slate-700 resize-none"
 placeholder="Detail out the specific requirements for this faculty member..."
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Assign User</label>
 <select
 required
 className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold text-slate-700 appearance-none"
 value={formData.mentor_id}
 onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
 >
 <option value="">Select Assignee</option>
 <optgroup label="Faculties">
 {assignees.filter(a => a.type === 'Faculty').map(f => (
 <option key={f.id} value={f.id}>{f.name}</option>
 ))}
 </optgroup>
 <optgroup label="Mentors">
 {assignees.filter(a => a.type === 'Mentor').map(m => (
 <option key={m.id} value={m.id}>{m.name}</option>
 ))}
 </optgroup>
 <optgroup label="Mentor Heads">
 {assignees.filter(a => a.type === 'Mentor Head').map(mh => (
 <option key={mh.id} value={mh.id}>{mh.name}</option>
 ))}
 </optgroup>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Submission Cut-off</label>
 <input
 type="date"
 required
 className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-bold text-slate-700"
 value={formData.deadline}
 onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
 />
 </div>
 </div>

 <div className="flex flex-col gap-3 mt-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 text-center">Priority Categorization</label>
 <div className="grid grid-cols-3 gap-3">
 {['Low', 'Medium', 'High'].map((p) => (
 <button
 key={p}
 type="button"
 onClick={() => setFormData({ ...formData, priority: p })}
 className={`
 p-4 rounded-3xl border-2 text-[10px] font-black uppercase tracking-widest transition-all
 ${formData.priority === p
 ? 'bg-yellow-400 border-[#008080] text-slate-900 shadow-xl shadow-slate-200 -translate-y-1'
 : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}
 `}
 >
 {p}
 </button>
 ))}
 </div>
 </div>

 <button
 type="submit"
 className="w-full bg-[#008080] text-white p-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-[#008080] transition-all shadow-xl shadow-[#008080]/30 mt-4 flex items-center justify-center gap-3 group"
 >
 <span>Submit Task</span>
 <Layers size={20} className="transition-transform group-hover:rotate-12" />
 </button>
 </form>
 </Modal>
 </div>
 );
};

export default AcademicHeadTasks;
