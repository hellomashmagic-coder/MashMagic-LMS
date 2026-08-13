import React, { useState, useEffect, useDeferredValue } from 'react';
import axios from 'axios';
import { Users, Search, MoreHorizontal, Phone, MapPin, Loader2, LayoutDashboard, CheckCircle2, ArrowUpDown, Edit2, Trash2, X, GraduationCap, BookOpen, Eye, ShieldCheck, Mail, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { premiumConfirm } from '../../utils/premiumConfirm';
import MobileCard from '../../components/common/MobileCard';
const MentorsList = () => {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState({
    id: '',
    name: '',
    email: '',
    phone_number: '',
    place: '',
    password: ''
  });
  const [isEditingMentorModal, setIsEditingMentorModal] = useState(false);

  // Detail Modal States
  const [selectedMentorForDetail, setSelectedMentorForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Student View States
  const [expandedMentorId, setExpandedMentorId] = useState(null);
  const [mentorStudents, setMentorStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.get('/api/mentor-head/mentor-activity', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.data.success) {
          setMentors(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching mentors:', error);
        toast.error("Failed to load mentors list");
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);
  const filteredMentors = mentors.filter(m => m.mentor_name?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || m.phone_number?.includes(searchTerm));
  const handleEdit = mentor => {
    setEditingMentor({
      id: mentor.mentor_id,
      name: mentor.mentor_name,
      email: mentor.email || '',
      phone_number: mentor.phone_number || '',
      place: mentor.place || '',
      password: ''
    });
    setIsEditingMentorModal(false);
    setIsEditModalOpen(true);
  };
  const handleUpdateMentor = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const payload = {
        ...editingMentor
      };
      if (!payload.password) delete payload.password;
      const res = await axios.put(`/api/mentor-head/mentors/${editingMentor.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        toast.success('Mentor details updated successfully');
        setIsEditModalOpen(false);
        setMentors(mentors.map(m => m.mentor_id === editingMentor.id ? {
          ...m,
          mentor_name: editingMentor.name,
          email: editingMentor.email,
          phone_number: editingMentor.phone_number,
          place: editingMentor.place
        } : m));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update mentor');
    }
  };
  const handleDelete = async (mentorId, mentorName) => {
    premiumConfirm(async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.delete(`/api/mentor-head/mentors/${mentorId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.data.success) {
          toast.success('Mentor deleted successfully');
          setMentors(mentors.filter(m => m.mentor_id !== mentorId));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete mentor');
      }
    }, {
      name: mentorName,
      title: 'Delete Mentor Account',
      message: `You are permanently removing ${mentorName}. This will unassign their students and archive records.`,
      type: 'danger'
    });
  };
  const handleViewStudents = async mentor => {
    if (expandedMentorId === mentor.mentor_id) {
      setExpandedMentorId(null);
      setMentorStudents([]);
      return;
    }
    setExpandedMentorId(mentor.mentor_id);
    setLoadingStudents(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`/api/mentor-head/students-all?mentor_id=${mentor.mentor_id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setMentorStudents(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load assigned students");
    } finally {
      setLoadingStudents(false);
    }
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-64 gap-4">
 <Loader2 className="w-8 h-8 text-[#008080] animate-spin" />
 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Database...</p>
 </div>;
  }
  return <div className="space-y-8 p-4 md:p-8">
 {/* Page Title */}
 <div className="bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
 <div>
 <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mentor Registry</h2>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
 <Users size={14} className="text-[#008080]" />
 Comprehensive database of all active mentors, their assigned students, and daily connection progress
 </p>
 </div>

 <div className="relative group">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input type="text" placeholder="FILTER BY NAME, PHONE, OR LOCATION..." className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-bold uppercase tracking-[0.1em] focus:ring-4 ring-[#008080]/10 w-full md:w-96 shadow-sm transition-all outline-none focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 </div>
 </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-2 group transition-all hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[#008080] transition-colors">Total Mentors</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{mentors.length}</span>
        <span className="text-[10px] text-slate-600 mb-1 uppercase tracking-widest">Database Total</span>
      </div>
    </div>
    
    <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-2 group transition-all hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1">
      <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Active Pulse</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{mentors.filter(m => m.status === 'active' || m.isActive === 1).length}</span>
        <div className="flex items-center gap-1.5 mb-1 bg-[#008080]/10 px-2 py-0.5 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse"></div>
           <span className="text-[10px] text-[#008080] uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  </div>

 <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden shadow-xl shadow-slate-200/40">
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/50 border-b border-slate-100">
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-[60px]">No.</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[200px]">Mentor</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Total Students</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Connected Today</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[250px]">Connection Progress</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {filteredMentors.map((mentor, index) => {
              const total = mentor.total_assigned_students || 0;
              const connected = mentor.students_connected_today || 0;
              const progress = total > 0 ? connected / total * 100 : 0;
              return <React.Fragment key={mentor.mentor_id}>
 <tr className="hover:bg-slate-50/50 transition-colors group">
 <td className="px-6 py-4 font-black text-slate-400 text-[12px]">{index + 1}</td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-gradient-to-br from-[#008080] via-[#008080] to-purple-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-[#008080] group-hover:scale-110 transition-transform uppercase">
 {mentor.mentor_name.charAt(0)}
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-black text-slate-900 group-hover:text-[#008080] transition-colors uppercase">{mentor.mentor_name}</span>
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {mentor.mentor_id}</span>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 text-center">
 <button onClick={() => handleViewStudents(mentor)} className="text-[10px] font-black text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-[#008080] hover:text-white hover:border-[#008080] transition-all cursor-pointer shadow-sm">
 {total} STUDENTS
 </button>
 </td>
 <td className="px-6 py-4 text-center">
 <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
 {connected}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-4">
 <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
 <div className="h-full bg-gradient-to-r from-emerald-400 to-[#008080] transition-all duration-1000" style={{
                          width: `${progress}%`
                        }}></div>
 </div>
 <span className="text-[10px] font-black text-slate-500 w-10 text-right">
 {progress.toFixed(0)}%
 </span>
 </div>
 </td>
 <td className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <button onClick={e => {
                        e.stopPropagation();
                        setSelectedMentorForDetail(mentor);
                        setIsDetailModalOpen(true);
                      }} className="p-2.5 bg-white border border-slate-100 rounded-xl text-[#008080] hover:bg-[#008080] hover:text-white transition-all shadow-sm" title="Quick View">
 <Eye size={18} />
 </button>
 <button onClick={e => {
                        e.stopPropagation();
                        navigate(`/mentor-head/mentors/${mentor.mentor_id}`);
                      }} className="p-2.5 bg-white border border-slate-100 rounded-xl text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm" title="Full Dashboard">
 <LayoutDashboard size={18} />
 </button>
 <button onClick={e => {
                        e.stopPropagation();
                        handleEdit(mentor);
                      }} className="p-2.5 bg-white border border-slate-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Edit Mentor">
 <Edit2 size={18} />
 </button>
 <button onClick={e => {
                        e.stopPropagation();
                        handleDelete(mentor.mentor_id, mentor.mentor_name);
                      }} className="p-2.5 bg-white border border-slate-100 rounded-xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Delete Mentor">
 <Trash2 size={18} />
 </button>
 </div>
 </td>
 </tr>
 {expandedMentorId === mentor.mentor_id && <tr className="bg-slate-50/80 border-b border-slate-100">
     <td colSpan="5" className="p-4 md:p-8">
       <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
         <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
           <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
             <Users size={16} className="text-[#008080]" /> Assigned Students: {mentor.mentor_name.toUpperCase()} ({mentorStudents.length})
           </h4>
           <button onClick={() => setExpandedMentorId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all">
             <X size={18} />
           </button>
         </div>
         {loadingStudents ? <div className="text-center py-6 md:py-12 font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">
             Loading Assigned Students...
           </div> : mentorStudents.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {mentorStudents.map((student, index) => <div key={student.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3 group hover:bg-white hover:border-[#008080] hover:shadow-lg transition-all">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-[#008080] text-white rounded-lg flex items-center justify-center text-xs font-black shadow-md uppercase shrink-0">
                     {student.name.charAt(0)}
                   </div>
                   <div className="flex flex-col min-w-0">
                     <span className="text-xs font-black text-slate-900 uppercase truncate">{student.name}</span>
                     <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">{student.registration_number || 'REG-PENDING'}</span>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-2 mt-auto">
                   <span className="text-[8px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 uppercase">{student.course || 'N/A'}</span>
                   <span className="text-[8px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 uppercase">Grade {student.grade || 'N/A'}</span>
                 </div>
               </div>)}
           </div> : <div className="text-center py-6 md:py-12 text-slate-400 font-black text-[10px] uppercase tracking-widest">
             No students assigned to this mentor
           </div>}
       </div>
     </td>
   </tr>}
 </React.Fragment>;
            })}
 </tbody>
 </table>
 </div>
 
 <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
  {filteredMentors.map((mentor) => {
    const total = mentor.total_assigned_students || 0;
    const connected = mentor.students_connected_today || 0;
    
    return (
      <MobileCard
        key={mentor.mentor_id}
        isExpanded={expandedMentorId === mentor.mentor_id}
        onToggle={() => handleViewStudents(mentor)}
        avatar={
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008080] via-[#008080] to-purple-700 text-white flex items-center justify-center font-black shadow-sm">
            {mentor.mentor_name?.charAt(0)}
          </div>
        }
        title={mentor.mentor_name}
        subtitle={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {mentor.mentor_id}</span>}
        badges={[
          <span key="connected" className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase">
            Connected: {connected} / {total}
          </span>
        ]}
        metrics={[]}
        expandedContent={
          <div className="space-y-4">
            <div className="pt-2 border-t border-slate-100 mt-2">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-50">
                <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Assigned Students ({mentorStudents.length})</h5>
              </div>
              {loadingStudents ? (
                <div className="py-4 text-center">
                  <div className="inline-block w-4 h-4 border-2 border-[#008080]/30 border-t-[#008080] rounded-full animate-spin mb-2"></div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Loading...</div>
                </div>
              ) : mentorStudents.length > 0 ? (
                <div className="space-y-2">
                  {mentorStudents.map(student => (
                    <div key={student.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-black text-slate-900 truncate">{student.name}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">{student.registration_number || 'REG-PENDING'}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                        <span>{student.course || 'N/A'}</span>
                        <span>Grade {student.grade || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-[9px] font-bold text-slate-400 uppercase">No students assigned</div>
              )}
            </div>
          </div>
        }
        primaryActions={[
          { icon: <Eye size={14} />, label: 'View', onClick: (e) => { e.stopPropagation(); setSelectedMentorForDetail(mentor); setIsDetailModalOpen(true); } }
        ]}
        moreActions={[
          { icon: <LayoutDashboard size={14} />, label: 'Dashboard', onClick: (e) => { e.stopPropagation(); navigate(`/mentor-head/mentors/${mentor.mentor_id}`); } },
          { icon: <Edit2 size={14} />, label: 'Edit', onClick: (e) => { e.stopPropagation(); handleEdit(mentor); } },
          { icon: <Trash2 size={14} />, label: 'Delete', danger: true, onClick: (e) => { e.stopPropagation(); handleDelete(mentor.mentor_id, mentor.mentor_name); } }
        ]}
      />
    );
  })}
 </div>
 </div>

 {filteredMentors.length === 0 && <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
 <Users size={40} />
 </div>
 <h3 className="text-xl font-black text-slate-900 tracking-tight">System Empty</h3>
 <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">
 No mentors found matching your current filters. Try expanding your search.
 </p>
 </div>}

 {/* Mentor Detail Modal */}
 {isDetailModalOpen && selectedMentorForDetail && <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
     <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
       <div className="px-5 md:px-10 py-4 md:py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
         <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gradient-to-br from-[#008080] to-purple-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg uppercase">
             {selectedMentorForDetail.mentor_name.charAt(0)}
           </div>
           <div>
             <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Mentor Identity</h2>
             <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Admin Control Profile</p>
           </div>
         </div>
         <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all">
           <X size={20} />
         </button>
       </div>

       <div className="p-5 md:p-10 space-y-10">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-6">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</span>
               <p className="text-lg font-black text-slate-900 uppercase">{selectedMentorForDetail.mentor_name}</p>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</span>
               <p className="text-sm font-bold text-slate-700">{selectedMentorForDetail.phone_number || 'No Phone Data'}</p>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Pulse</span>
               <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${selectedMentorForDetail.status === 'active' || selectedMentorForDetail.isActive === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                 <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedMentorForDetail.status || 'Active'}</p>
               </div>
             </div>
           </div>
           <div className="space-y-6">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</span>
               <p className="text-sm font-bold text-slate-700">{selectedMentorForDetail.email || 'No Email Registered'}</p>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Geographic Location</span>
               <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{selectedMentorForDetail.place || 'Not Specified'}</p>
             </div>
           </div>
         </div>
         
         <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#008080] shadow-sm">
               <ShieldCheck size={24} />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Administrative Role</p>
               <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Verified Mentor Faculty</p>
             </div>
           </div>
           <div className="flex gap-2">
             <button onClick={() => {
                setIsDetailModalOpen(false);
                handleEdit(selectedMentorForDetail);
              }} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
               Edit
             </button>
             <button onClick={() => navigate(`/mentor-head/mentors/${selectedMentorForDetail.mentor_id}`)} className="px-5 md:px-10 py-4 bg-[#008080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#008080] transition-all shadow-lg flex-1">
               Full Dashboard
             </button>
           </div>
         </div>
       </div>
     </div>
   </div>}

  {/* Edit Mentor Modal */}
  {isEditModalOpen && <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              <Edit2 size={20} className="text-[#008080]" /> Reconfigure Account
            </h2>
            <button type="button" onClick={() => setIsEditingMentorModal(prev => !prev)} className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${isEditingMentorModal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'}`}>
              {isEditingMentorModal ? <><Unlock size={12} /> Editing</> : <><Lock size={12} /> Unlock</>}
            </button>
          </div>
          <button onClick={() => setIsEditModalOpen(false)} className="text-slate-600 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className={`p-4 md:p-8 space-y-6 transition-opacity duration-300 ${!isEditingMentorModal ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Mentor Name</label>
              <input type="text" value={editingMentor.name} onChange={e => setEditingMentor({
                ...editingMentor,
                name: e.target.value
              })} disabled={!isEditingMentorModal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#008080] transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Identity</label>
              <input type="text" value={editingMentor.phone_number} onChange={e => setEditingMentor({
                ...editingMentor,
                phone_number: e.target.value
              })} disabled={!isEditingMentorModal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#008080] transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
            <input type="email" value={editingMentor.email} onChange={e => setEditingMentor({
              ...editingMentor,
              email: e.target.value
            })} disabled={!isEditingMentorModal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#008080] transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Geographic Location</label>
            <input type="text" value={editingMentor.place} onChange={e => setEditingMentor({
              ...editingMentor,
              place: e.target.value
            })} disabled={!isEditingMentorModal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#008080] transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Security Update (Optional)</label>
            <input type="password" placeholder="LEAVE BLANK TO RETAIN CURRENT" value={editingMentor.password} onChange={e => setEditingMentor({
              ...editingMentor,
              password: e.target.value
            })} disabled={!isEditingMentorModal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-200 transition-all uppercase placeholder:text-[9px]" />
          </div>
        </div>
        <div className={`px-4 md:px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 transition-opacity duration-300 ${!isEditingMentorModal ? 'opacity-60 pointer-events-none' : ''}`}>
          <button onClick={() => setIsEditModalOpen(false)} className="px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
            Abort Sync
          </button>
          <button onClick={handleUpdateMentor} className="px-4 md:px-8 py-3 bg-[#008080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#008080]/30 hover:-translate-y-0.5 active:scale-95 transition-all">
            Commit Updates
          </button>
        </div>
      </div>
    </div>}


 </div>;
};
export default MentorsList;