import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar, Clock, AlertTriangle, Eye, Edit2, Trash2, CheckCircle, AlignLeft, UserCog, UserPlus } from 'lucide-react';
import MobileCard from '../../components/common/MobileCard';

import FilterDropdown from '../../components/FilterDropdown';

const Tasks = () => {
 const { user } = useAuth();
 const isSuperAdmin = user?.role === 'super_admin';
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [expandedRowId, setExpandedRowId] = useState(null);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [assignees, setAssignees] = useState([]);
 const [filterPriority, setFilterPriority] = useState('');
 const [formData, setFormData] = useState({
 title: '',
 description: '',
 mentor_id: '',
 deadline: '',
 priority: 'Medium'
 });

 const [searchTerm, setSearchTerm] = useState('');
 
 // Pagination State
 const [page, setPage] = useState(1);
 const limit = 50;
 const [totalRecords, setTotalRecords] = useState(0);

 useEffect(() => {
 fetchAssignees();
 }, []);

 useEffect(() => {
 fetchTasks();
 }, [page, searchTerm, filterPriority]);

 // Reset to page 1 when search or filter changes
 useEffect(() => {
 setPage(1);
 }, [searchTerm, filterPriority]);

 const fetchTasks = async () => {
 try {
 setLoading(true);
 const response = await api.get(`/tasks?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(filterPriority || 'All')}`);
 setTasks(response.data.data);
 setTotalRecords(response.data.total || 0);
 setLoading(false);
 } catch (error) {
 toast.error("Failed to load tasks");
 setLoading(false);
 }
 };

 const handleSearch = (query) => {
 setSearchTerm(query);
 };

 const handleFilterChange = (priority) => {
 setFilterPriority(priority);
 };

 const priorityOptions = [
 { value: '', label: 'All Priorities' },
 { value: 'High', label: 'High Priority' },
 { value: 'Medium', label: 'Medium Priority' },
 { value: 'Low', label: 'Low Priority' }
 ];

 const handleExport = async () => {
 try {
 const toastId = toast.loading('Fetching data for export...');
 const response = await api.get(`/tasks?search=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(filterPriority || 'All')}&export=true`);
 const exportData = response.data.data;
 toast.dismiss(toastId);

 if (!exportData || exportData.length === 0) {
 toast.error("No data to export");
 return;
 }

 const headers = ['Objective', 'Description', 'Mentor', 'Deadline', 'Priority', 'Status'];
 const csvContent = [
 headers.join(','),
 ...exportData.map(t => [
 `"${t.title || ''}"`,
 `"${t.description || ''}"`,
 `"${t.mentor_name || 'Unassigned'}"`,
 t.deadline,
 t.priority,
 t.status
 ].join(','))
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 toast.success("Tasks exported as CSV");
 } catch (e) {
 toast.error('Failed to export tasks');
 }
 };

 const fetchAssignees = async () => {
 try {
 const response = await api.get('/admin/users');
 const targetRoles = ['mentor', 'faculty', 'mentor_head', 'academic_head'];
 const filteredUsers = response.data.data.filter(u => targetRoles.includes(u.role));
 setAssignees(filteredUsers);
 } catch (error) {
 console.error("Failed to fetch users for task assignment");
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 await api.post('/tasks', formData);
 toast.success("Task assigned successfully");
 setIsModalOpen(false);
 setFormData({ title: '', description: '', mentor_id: '', deadline: '', priority: 'Medium' });
 fetchTasks();
 } catch (error) {
 toast.error(error.response?.data?.message || "Failed to create task");
 }
 };

 const handleDelete = async (task) => {
 premiumConfirm(async () => {
 try {
 await api.delete(`/tasks/${task.id}`);
 toast.success("Task removed");
 fetchTasks();
 } catch (error) {
 toast.error("Failed to delete task");
 }
 }, { 
 name: task.title, 
 title: 'Delete Task', 
 message: `Are you sure you want to permanently delete the task "${task.title}"? This action will remove it from the database forever and cannot be recovered.`,
 type: 'danger'
 });
 };

 const columns = [
 {
 header: 'Task Title', accessor: 'title', render: (row) => (
 <div className="flex flex-col">
 <span className="font-bold text-slate-900">{row.title}</span>
 <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">{row.description}</span>
 </div>
 )
 },
 {
 header: 'Assigned To', accessor: 'mentor_name', render: (row) => (
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 uppercase shrink-0">
 {row.mentor_name?.charAt(0) || 'U'}
 </div>
 <span className="text-slate-600 font-semibold text-xs truncate max-w-[120px]">{row.mentor_name || 'Unassigned'}</span>
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
 <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
 <Calendar size={14} className="text-slate-300" />
 {new Date(row.deadline).toLocaleDateString()}
 </div>
 )
 },
 {
 header: 'Priority', accessor: 'priority', render: (row) => (
 <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${row.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
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
 <span className={`text-[11px] font-black uppercase tracking-widest ${row.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
 {row.status}
 </span>
 </div>
 {row.status === 'Completed' && (
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
 )}
 </div>
 )
 },
 ];

  const renderTaskMobileCard = (row, { isExpanded, onToggle }) => {
    const initials = row.mentor_name
      ? row.mentor_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    const priorityColors = {
      High: 'bg-rose-50 text-rose-600 border-rose-100',
      Medium: 'bg-amber-50 text-amber-600 border-amber-100',
      Low: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };
    
    const statusColors = {
      Completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'In Progress': 'bg-blue-50 text-blue-600 border-blue-100',
      Pending: 'bg-amber-50 text-amber-600 border-amber-100',
      Overdue: 'bg-rose-50 text-rose-600 border-rose-100'
    };

    const currentPriority = row.priority || 'Medium';
    const currentStatus = row.status || 'Pending';

    const badges = [
      <span key="priority" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${priorityColors[currentPriority] || priorityColors.Medium}`}>
        {currentPriority}
      </span>,
      <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusColors[currentStatus] || statusColors.Pending} ${currentStatus === 'Pending' ? 'animate-pulse' : ''}`}>
        {currentStatus}
      </span>
    ];

    const expandedContent = (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          {row.description && (
            <div className="flex items-start gap-2 text-slate-600">
              <AlignLeft size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="text-xs font-bold leading-relaxed">{row.description}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <UserCog size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs font-bold">Assigned By: {row.assigner_name || 'System Admin'}</span>
          </div>
          {row.created_at && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold">Created: {new Date(row.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          )}
          {row.updated_at && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold">Updated: {new Date(row.updated_at).toLocaleDateString('en-GB')}</span>
            </div>
          )}
          {row.notes && (
            <div className="flex items-start gap-2 text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[10px] font-bold italic">{row.notes}</span>
            </div>
          )}
        </div>
      </div>
    );

    const primaryActions = [
      { icon: <Eye size={14} />, label: 'View', onClick: () => toast.info('View feature coming soon') },
    ];
    
    if (isSuperAdmin) {
       primaryActions.push({ icon: <Edit2 size={14} />, label: 'Edit', onClick: () => toast.info('Edit feature coming soon') });
    }

    const moreActions = [];
    if (isSuperAdmin) {
      moreActions.push({ icon: <CheckCircle size={14} />, label: 'Mark Complete', onClick: () => toast.info('Mark complete coming soon') });
      moreActions.push({ icon: <UserPlus size={14} />, label: 'Reassign', onClick: () => toast.info('Reassign feature coming soon') });
      moreActions.push({ icon: <Trash2 size={14} />, label: 'Delete', onClick: () => handleDelete(row), danger: true });
    }

    return (
      <MobileCard
        isExpanded={isExpanded}
        onToggle={onToggle}
        avatar={
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <span className="text-slate-500 text-sm font-black tracking-tighter">{initials}</span>
          </div>
        }
        title={row.title}
        subtitle={
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[#008080] font-bold text-xs uppercase tracking-widest">{row.mentor_name || 'Unassigned'}</span>
            <span className="text-slate-400 text-[10px] flex items-center gap-1 font-black uppercase tracking-widest">
              <Calendar size={12} className="text-slate-300" /> Due {new Date(row.deadline).toLocaleDateString('en-GB')}
            </span>
          </div>
        }
        badges={badges}
        expandedContent={expandedContent}
        primaryActions={primaryActions}
        moreActions={moreActions}
      />
    );
  };

 return (
 <div className="flex flex-col gap-10 pb-10">
 <div className="bg-white/70 backdrop-blur-xl p-5 md:p-10 rounded-[32px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-8">
 <div className="text-center md:text-left">
 <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Tasks Management</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse"></div>
 Coordinate and track educational tasks for the mentor network
 </p>
 </div>
 {isSuperAdmin && (
 <button
 onClick={() => setIsModalOpen(true)}
 className="bg-gradient-to-br from-[#006666] to-[#008080] text-white px-4 md:px-8 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-[#008080]/40 hover:-translate-y-1 transition-all flex items-center gap-3"
 >
 <Plus size={18} strokeWidth={3} />
 <span>Assign New Task</span>
 </button>
 )}
 </div>

 <DataTable
  columns={columns}
  data={tasks}
  loading={loading}
  onSearch={handleSearch}
  onFilter={
    <FilterDropdown
      value={filterPriority}
      onChange={handleFilterChange}
      options={priorityOptions}
      placeholder="Priority"
    />
  }
  onExport={handleExport}
  onDelete={isSuperAdmin ? handleDelete : undefined}
  searchPlaceholder="Search tasks by title, description or mentor..."
  filterValue={filterPriority}
  onFilterChange={handleFilterChange}
  expandedRowId={expandedRowId}
  onToggleExpand={(id) => setExpandedRowId(expandedRowId === id ? null : id)}
  renderMobileCard={renderTaskMobileCard}
  page={page}
  totalPages={Math.ceil(totalRecords / limit) || 1}
  totalRecords={totalRecords}
  onPageChange={setPage}
  />

 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title="Create New Task"
 size="md"
 >
 <form onSubmit={handleSubmit} className="flex flex-col gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Task Title</label>
 <input
 type="text"
 required
 className="p-5 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-[13px] outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all font-black uppercase tracking-widest text-slate-700 placeholder:text-slate-300 shadow-inner"
 placeholder="ENTER TASK TITLE..."
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 />
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Task Description</label>
 <textarea
 rows="4"
 required
 className="p-5 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-[13px] outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all font-bold text-slate-600 placeholder:text-slate-300 shadow-inner resize-none "
 placeholder="Specify detailed task instructions..."
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Assignee</label>
 <select
 required
 className="p-5 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-[10px] outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all font-black uppercase tracking-[0.1em] appearance-none cursor-pointer shadow-inner"
 value={formData.mentor_id}
 onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
 >
 <option value="">SELECT ASSIGNEE</option>
 <option value="all_mentors" className="font-bold text-[#008080]">✦ ALL MENTORS (BULK ASSIGN)</option>
 <option value="all_faculties" className="font-bold text-[#008080]">✦ ALL FACULTIES (BULK ASSIGN)</option>
 <optgroup label="MENTORS">
 {assignees.filter(a => a.role === 'mentor').map(m => (
 <option key={m.id} value={m.id}>{m.name}</option>
 ))}
 </optgroup>
 <optgroup label="FACULTIES">
 {assignees.filter(a => a.role === 'faculty').map(f => (
 <option key={f.id} value={f.id}>{f.name}</option>
 ))}
 </optgroup>
 <optgroup label="MENTOR HEADS">
 {assignees.filter(a => a.role === 'mentor_head').map(mh => (
 <option key={mh.id} value={mh.id}>{mh.name}</option>
 ))}
 </optgroup>
 <optgroup label="ACADEMIC HEADS">
 {assignees.filter(a => a.role === 'academic_head').map(ah => (
 <option key={ah.id} value={ah.id}>{ah.name}</option>
 ))}
 </optgroup>
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Deadline</label>
 <div className="relative">
 <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#008080] opacity-50" />
 <input
 type="date"
 required
 className="w-full p-5 pl-14 bg-slate-50/50 border border-slate-100/50 rounded-2xl text-[11px] outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all font-black uppercase tracking-[0.2em] shadow-inner"
 value={formData.deadline}
 onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
 />
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-4">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Priority</label>
 <div className="grid grid-cols-3 gap-4">
 {['Low', 'Medium', 'High'].map((p) => (
 <button
 key={p}
 type="button"
 onClick={() => setFormData({ ...formData, priority: p })}
 className={`
 p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500
 ${formData.priority === p
 ? 'bg-[#008080] border-[#008080] text-[#008080] shadow-2xl scale-[1.02]'
 : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}
 `}
 >
 {p}
 </button>
 ))}
 </div>
 </div>

 <button
 type="submit"
 className="w-full bg-[#008080] text-white p-6 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-2xl shadow-[#008080]/10 mt-4 flex items-center justify-center gap-4 group "
 >
 <span>Create Task</span>
 <div className="w-1.5 h-1.5 rounded-full bg-[#008080] group-hover:animate-ping"></div>
 </button>
 </form>
 </Modal>
 </div>
 );
};

export default Tasks;
