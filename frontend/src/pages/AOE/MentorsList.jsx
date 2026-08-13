import React, {  useState, useEffect , useDeferredValue } from 'react';
import {
 Users, Search, Edit2, Trash2, X, Save,
 ShieldCheck, Activity, MapPin, Phone, Mail, Calendar, Eye
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import MobileCard from '../../components/common/MobileCard';
import Pagination from '../../components/common/Pagination';

const MentorsList = () => {
 const [mentors, setMentors] = useState([]);
 const [loading, setLoading] = useState(true);
 const [page, setPage] = useState(1);
 const [limit] = useState(50);
 const [totalRecords, setTotalRecords] = useState(0);
 const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);

 // Edit Modal States
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editingMentor, setEditingMentor] = useState(null);
 const [selectedMentorForDetail, setSelectedMentorForDetail] = useState(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

 // Inline Student View States
 const [expandedMentorId, setExpandedMentorId] = useState(null);
 const [mentorStudents, setMentorStudents] = useState([]);
 const [loadingStudents, setLoadingStudents] = useState(false);

 useEffect(() => {
  setPage(1);
 }, [deferredSearchTerm]);

 useEffect(() => {
  fetchMentors();
 }, [page, deferredSearchTerm]);

 const fetchMentors = async () => {
  try {
   setLoading(true);
   const params = new URLSearchParams({ page, limit });
   if (deferredSearchTerm) params.append('search', deferredSearchTerm);
   
   const res = await api.get(`/aoe/mentors-all?${params.toString()}`);
   if (res.data.success) {
    setMentors(res.data.data);
    setTotalRecords(res.data.total || 0);
   }
  } catch (error) {
   toast.error("Failed to load mentor directory");
  } finally {
   setLoading(false);
  }
 };

 const handleEdit = (mentor) => {
 setEditingMentor({ ...mentor });
 setIsEditModalOpen(true);
 };

 const handleUpdate = async () => {
 try {
 const res = await api.put(`/aoe/mentors/${editingMentor.id}`, editingMentor);
 if (res.data.success) {
 toast.success("Mentor profile updated");
 setIsEditModalOpen(false);
 fetchMentors();
 }
 } catch (error) {
 toast.error(error.response?.data?.message || "Update failed");
 }
 };

 const handleDelete = async (id, name) => {
 premiumConfirm(async () => {
 try {
 const res = await api.delete(`/aoe/mentors/${id}`);
 if (res.data.success) {
 toast.success("Mentor profile deleted");
 fetchMentors();
 }
 } catch (error) {
 toast.error(error.response?.data?.message || "Delete failed");
 }
 }, { 
 name: name,
 title: 'Delete Mentor Faculty', 
 message: `You are about to purge ${name} from the academic faculty records. This action is irreversible.`,
 type: 'danger'
 });
 };

 const handleViewStudents = async (mentor) => {
 if (expandedMentorId === mentor.id) {
 setExpandedMentorId(null);
 setMentorStudents([]);
 return;
 }

 setExpandedMentorId(mentor.id);
 setLoadingStudents(true);
 try {
 const res = await api.get(`/aoe/students?mentor_id=${mentor.id}`);
 if (res.data.success) {
 setMentorStudents(res.data.data);
 }
 } catch (error) {
 toast.error("Failed to fetch assigned students");
 } finally {
 setLoadingStudents(false);
 }
 };

 const filteredMentors = mentors;

 if (loading) return <div className="p-20 text-center font-black text-slate-600 animate-pulse">SYNCING MENTOR DIRECTORY...</div>;

 return (
    <>
      <div className="space-y-8 animate-in fade-in duration-700 p-4 md:p-8">
        {/* Header */}
        <div className="bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mentor Faculty</h2>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Users size={14} className="text-[#008080]" />
              AOE level management of all mentor profiles and assignments
            </p>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
            <input
              type="text"
              placeholder="FILTER BY NAME OR LOCATION..."
              className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase tracking-[0.1em] focus:ring-4 ring-[#008080]/10 w-full md:w-96 shadow-sm transition-all outline-none focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="h-32 w-28 bg-white rounded-full border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center p-4">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">Total<br />Mentors</span>
              <div className="mt-2 flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{mentors.length}</span>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Database Total</span>
              </div>
            </div>

            <div className="h-32 w-28 bg-white rounded-full border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center p-4">
              <span className="text-[9px] font-black text-[#008080] uppercase tracking-widest leading-tight">Active<br />Pulse</span>
              <div className="mt-2 flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{mentors.filter(m => m.status === 'active').length}</span>
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[7px] text-emerald-600 font-black uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List Layout */}
        <div className="flex flex-col gap-4">
          {filteredMentors.length > 0 ? filteredMentors.map((mentor, index) => (
            <div key={mentor.id} className="bg-white group rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="hidden md:block p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#008080] to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-[#008080] shrink-0 group-hover:scale-105 transition-transform">
                      {mentor.name.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-[#008080] transition-colors uppercase truncate">{index + 1} - {mentor.name}</h3>
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          mentor.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : mentor.status === 'inactive' 
                            ? 'bg-slate-50 text-slate-600 border-slate-100' 
                            : mentor.status === 'pending' 
                            ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {mentor.status === 'active' ? 'Active' : mentor.status === 'inactive' ? 'Backup' : mentor.status === 'pending' ? 'Pending' : mentor.status === 'left' ? 'Left' : mentor.status}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={10} className="text-slate-600" />
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{mentor.place || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail size={10} className="text-slate-600" />
                          <span className="text-[9px] font-bold text-slate-600">{mentor.email}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewStudents(mentor)}
                        className="flex items-center gap-2 mt-3 w-fit group/btn"
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest flex items-center gap-2">
                            View {mentor.studentCount} Assigned Students
                            <ShieldCheck size={12} className={`transition-all duration-300 ${expandedMentorId === mentor.id ? 'rotate-180 text-purple-600' : 'text-[#008080]'}`} />
                          </span>
                          <div className="h-0.5 w-0 group-hover/btn:w-full bg-[#008080] transition-all duration-300"></div>
                        </div>
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedMentorForDetail(mentor);
                          setIsDetailModalOpen(true);
                        }}
                        className="w-10 h-10 bg-slate-50 text-[#008080] rounded-xl flex items-center justify-center hover:bg-[#008080] hover:text-white transition-all shadow-sm border border-slate-100"
                        title="View Full Profile"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Student List Section */}
                {expandedMentorId === mentor.id && (
                  <div className="mt-8 pt-6 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4 pl-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#008080] rounded-full"></div>
                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Assigned Students Registry</h5>
                      </div>
                    </div>

                    {loadingStudents ? (
                      <div className="py-5 md:py-10 text-center">
                        <div className="inline-block w-5 h-5 border-2 border-[#008080]/30 border-t-[#008080] rounded-full animate-spin mb-2"></div>
                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Synchronizing student records...</div>
                      </div>
                    ) : mentorStudents.length > 0 ? (
                      <div className="space-y-3">
                        {mentorStudents.map((student) => (
                          <div key={student.id} className="p-4 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-[#008080] hover:shadow-xl transition-all duration-300 group/student">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 items-center gap-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-500 font-black shadow-sm group-hover/student:bg-[#008080] group-hover/student:text-white transition-all shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[12px] font-black text-slate-900 uppercase truncate">{student.name}</h4>
                                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{student.registration_number || 'REG-PENDING'}</span>
                                </div>
                              </div>

                              <div className="flex flex-col lg:items-center">
                                <span className="text-[10px] font-black text-slate-900 uppercase truncate">{student.faculty_name || 'Unassigned'}</span>
                                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter">Academic Faculty</span>
                              </div>

                              <div className="flex flex-col lg:items-center">
                                <span className="text-[10px] font-black text-slate-900 uppercase truncate">{student.mentor_name || mentor.name}</span>
                                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter">Assigned Mentor</span>
                              </div>

                              <div className="flex flex-col lg:items-center">
                                <span className="text-[10px] font-black text-[#008080] uppercase">{student.course}</span>
                                <span className="text-[7px] font-bold text-slate-600 uppercase">{student.grade}</span>
                              </div>

                              <div className="flex flex-col items-end">
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm 
                                  ${student.performance === 'Excellent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    student.performance === 'Very Good' ? 'bg-[#008080]/10 text-[#008080] border border-[#008080]' :
                                      student.performance === 'Good' ? 'bg-[#008080]/10 text-[#008080] border border-[#008080]' :
                                        student.performance === 'Average' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                          student.performance === 'Needs Improvement' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                  {student.performance}
                                </div>
                                <span className="text-[7px] font-bold text-slate-600 uppercase mt-1 tracking-[0.2em]">Live Analytics: {student.avg_score}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-5 md:py-10 bg-slate-50/50 rounded-2xl text-center border border-dashed border-slate-200">
                        <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] ">No students currently assigned to this mentor</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MOBILE */}
              <div className="md:hidden block">
                <MobileCard
                  isExpanded={expandedMentorId === mentor.id}
                  onToggle={() => handleViewStudents(mentor)}
                  avatar={
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008080] to-purple-600 text-white flex items-center justify-center font-black shadow-sm">
                      {mentor.name.charAt(0)}
                    </div>
                  }
                  title={mentor.name}
                  subtitle={
                    <span className="flex items-center gap-1 text-slate-500">
                      <ShieldCheck size={10} className="text-[#008080]" />
                      Assigned Students: {mentor.studentCount}
                    </span>
                  }
                  badges={[
                    <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                      mentor.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {mentor.status || 'Active'}
                    </span>
                  ]}
                  metrics={[
                    { icon: <MapPin size={12} />, value: mentor.place || 'Unknown' }
                  ]}
                  expandedContent={
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        {mentor.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-xs font-bold">{mentor.email}</span>
                          </div>
                        )}
                        {mentor.phone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            <span className="text-xs font-bold">{mentor.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Nested students view for mobile */}
                      <div className="pt-4 border-t border-slate-100 mt-2">
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3">Assigned Students Registry</h5>
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
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${student.performance === 'Excellent' || student.performance === 'Very Good' || student.performance === 'Good' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{student.performance}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                                  <span>{student.course}</span>
                                  <span>{student.grade}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-[9px] font-bold text-slate-400 uppercase">No students</div>
                        )}
                      </div>
                    </div>
                  }
                  primaryActions={[
                    { icon: <Eye size={14} />, label: 'Profile', onClick: () => { setSelectedMentorForDetail(mentor); setIsDetailModalOpen(true); } }
                  ]}
                  moreActions={[]}
                />
              </div>
            </div>
          )) : (
            <div className="py-20 bg-white rounded-[3rem] border border-slate-100 text-center shadow-sm">
              <Users size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">No mentors matching your search parameters</p>
            </div>
          )}
        </div>

        {/* Pagination Component */}
        {(!loading && filteredMentors.length > 0) && (
          <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-[3rem]">
            <Pagination 
              currentPage={page} 
              totalPages={Math.ceil(totalRecords / limit) || 1} 
              totalRecords={totalRecords} 
              onPageChange={setPage} 
            />
          </div>
        )}

        {/* Mentor Detail Modal */}
        {isDetailModalOpen && selectedMentorForDetail && (
          <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
              <div className="px-5 md:px-10 py-4 md:py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#008080] to-purple-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                    {selectedMentorForDetail.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Mentor Identity</h2>
                    <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Academic Faculty Profile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 md:p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</span>
                      <p className="text-lg font-black text-slate-900 uppercase">{selectedMentorForDetail.name}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</span>
                      <p className="text-sm font-bold text-slate-700">{selectedMentorForDetail.phone_number}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Pulse</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          selectedMentorForDetail.status === 'active' 
                            ? 'bg-emerald-500' 
                            : selectedMentorForDetail.status === 'inactive' 
                            ? 'bg-slate-400' 
                            : selectedMentorForDetail.status === 'pending' 
                            ? 'bg-amber-500 animate-pulse' 
                            : 'bg-rose-500'
                        }`}></div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          {selectedMentorForDetail.status === 'active' ? 'Active' : selectedMentorForDetail.status === 'inactive' ? 'Backup' : selectedMentorForDetail.status === 'pending' ? 'Pending' : selectedMentorForDetail.status === 'left' ? 'Left' : selectedMentorForDetail.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</span>
                      <p className="text-sm font-bold text-slate-700">{selectedMentorForDetail.email}</p>
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
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Verified Academic Mentor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MentorsList;
