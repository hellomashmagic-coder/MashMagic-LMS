import React, { useState, useEffect, useDeferredValue } from 'react';
import { Users, Search, Edit2, Trash2, X, Save, Eye, ShieldCheck, Activity, MapPin, Phone, Mail, Calendar, Briefcase, Filter, Check } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import MobileCard from '../../components/common/MobileCard';
import Pagination from '../../components/common/Pagination';
const SUBJECT_OPTIONS = ["Mathematics", "Science", "Social Science", "English", "Malayalam", "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"];
const FacultyDirectory = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFaculties: 0, activeFaculties: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [selectedSyllabi, setSelectedSyllabi] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);
  const toggleSyllabus = syl => {
    setSelectedSyllabi(prev => prev.includes(syl) ? prev.filter(s => s !== syl) : [...prev, syl]);
  };
  const toggleSection = sec => {
    setSelectedSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };
  const toggleSubject = sub => {
    setSelectedSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
  };
  useEffect(() => {
    fetchFaculties();
  }, [page, deferredSearchTerm, selectedSyllabi, selectedSections, selectedSubjects]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [deferredSearchTerm, selectedSyllabi, selectedSections, selectedSubjects]);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        stats: 'true'
      });
      if (deferredSearchTerm) params.append('search', deferredSearchTerm);
      if (selectedSyllabi.length > 0) params.append('syllabus', selectedSyllabi.join(','));
      if (selectedSections.length > 0) params.append('section', selectedSections.join(','));
      if (selectedSubjects.length > 0) params.append('subject', selectedSubjects.join(','));

      const res = await api.get(`/mentor-head/faculties-all?${params.toString()}`);
      if (res.data.success) {
        setFaculties(res.data.data || []);
        setTotalRecords(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      toast.error("Failed to load faculty directory");
    } finally {
      setLoading(false);
    }
  };
  const filteredFaculties = faculties;
  if (loading) return <div className="p-20 text-center font-black text-slate-600 animate-pulse">SYNCING FACULTY DATA...</div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
 {/* Header */}
 <div className="bg-white p-5 md:p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
 <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 rotate-3">
 <Briefcase size={28} />
 </div>
 Faculty Registry
 </h2>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
 <ShieldCheck size={14} className="text-emerald-500" />
 Mentor Head level oversight of teaching staff and account status
 </p>
 </div>

  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
    <div className="relative group min-w-full md:w-[300px] flex-1 md:flex-initial">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
      <input type="text" placeholder="FILTER BY NAME OR EMAIL..." className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-bold uppercase tracking-[0.1em] focus:ring-4 ring-[#008080]/10 w-full shadow-sm transition-all outline-none focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
    </div>
    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-5 py-4 rounded-3xl text-xs font-black uppercase tracking-widest border transition-all ${isFilterOpen || selectedSyllabi.length + selectedSections.length + selectedSubjects.length > 0 ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}>
      <Filter size={16} /> Filters
      {selectedSyllabi.length + selectedSections.length + selectedSubjects.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#008080] text-white">
          {selectedSyllabi.length + selectedSections.length + selectedSubjects.length}
        </span>}
    </button>
  </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-2 group transition-all hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[#008080] transition-colors">Total Faculties</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{stats.totalFaculties || 0}</span>
        <span className="text-[10px] text-slate-600 mb-1 uppercase tracking-widest">Database Total</span>
      </div>
    </div>
    
    <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-2 group transition-all hover:shadow-xl hover:shadow-[#008080]/5 hover:-translate-y-1">
      <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Active Pulse</span>
      <div className="flex items-end gap-3 font-black text-slate-900 tracking-tighter">
        <span className="text-2xl md:text-4xl leading-none">{stats.activeFaculties || 0}</span>
        <div className="flex items-center gap-1.5 mb-1 bg-[#008080]/10 px-2 py-0.5 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse"></div>
           <span className="text-[10px] text-[#008080] uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  </div>

  {/* Collapsible Filter Panel */}
  {isFilterOpen && <div className="bg-white p-4 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Syllabus Filter */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Syllabus</h4>
          <div className="flex flex-wrap gap-2">
            {['CBSE', 'STATE'].map(syl => {
              const isSelected = selectedSyllabi.includes(syl);
              return <button key={syl} type="button" onClick={() => toggleSyllabus(syl)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}>
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                    {isSelected && <Check size={8} className="text-white" />}
                  </div>
                  {syl}
                </button>;
            })}
          </div>
        </div>

        {/* Section Filter */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Section</h4>
          <div className="flex flex-wrap gap-2">
            {['LP', 'UP', 'HS', 'HSS'].map(sec => {
              const isSelected = selectedSections.includes(sec);
              return <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}>
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                    {isSelected && <Check size={8} className="text-white" />}
                  </div>
                  {sec}
                </button>;
            })}
          </div>
        </div>
      </div>

      {/* Subject Filter */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Subject Focus</h4>
          {selectedSubjects.length > 0 && <button type="button" onClick={() => setSelectedSubjects([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">
              Clear Subjects
            </button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {SUBJECT_OPTIONS.map(sub => {
            const isSelected = selectedSubjects.includes(sub);
            return <button key={sub} type="button" onClick={() => toggleSubject(sub)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border truncate ${isSelected ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`} title={sub}>
                <div className={`w-3 h-3 rounded-sm border flex flex-shrink-0 items-center justify-center ${isSelected ? 'bg-[#008080] border-[#008080]' : 'border-slate-300'}`}>
                  {isSelected && <Check size={8} className="text-white" />}
                </div>
                <span className="truncate">{sub}</span>
              </button>;
          })}
        </div>
      </div>
    </div>}

 {/* List */}
 <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/50 border-b border-slate-100">
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-[80px]">No.</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Faculty</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Email</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Phone</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Place</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
 <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {filteredFaculties.length > 0 ? filteredFaculties.map((faculty, index) => <tr key={faculty.id} className="hover:bg-emerald-50/20 transition-all group">
 <td className="px-6 py-4 font-black text-slate-400 text-[12px]">{index + 1}</td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-[#008080] rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-emerald-100">
 {faculty.name?.charAt(0)}
 </div>
 <div className="min-w-0">
 <div className="text-sm font-black text-slate-900 group-hover:text-[#008080] transition-colors uppercase truncate">{faculty.name}</div>
 <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">ID {faculty.id}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2 text-xs font-bold text-slate-600 truncate max-w-[200px]" title={faculty.email}>
 <Mail size={14} className="text-slate-300" />
 {faculty.email || 'N/A'}
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
 <Phone size={14} className="text-slate-300" />
 {faculty.phone_number || 'N/A'}
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
 <MapPin size={14} className="text-slate-300" />
 {faculty.place || 'N/A'}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${String(faculty.status || 'active').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
 <Activity size={12} className={String(faculty.status || 'active').toLowerCase() === 'active' ? 'text-emerald-500' : 'text-rose-500'} />
 {faculty.status || 'active'}
 </span>
 </td>
 <td className="px-6 py-4 text-right">
 <button onClick={() => {
                  setSelectedFaculty(faculty);
                  setIsDetailModalOpen(true);
                }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[#008080] hover:bg-[#008080]/10 transition-all shadow-sm" title="View Profile">
 <Eye size={16} />
 </button>
 </td>
 </tr>) : <tr>
 <td colSpan={7} className="px-4 md:px-8 py-20 text-center">
 <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">System empty or no faculty found</p>
 </td>
 </tr>}
 </tbody>
 </table>
 </div>
 
 <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
    {filteredFaculties.length > 0 ? filteredFaculties.map((faculty) => {
      const initials = faculty.name ? faculty.name.charAt(0).toUpperCase() : '?';
      const statusStr = String(faculty.status || 'active').toLowerCase();
      
      const badges = [
        <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${statusStr === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          {faculty.status || 'active'}
        </span>
      ];

      const metrics = [
        { icon: <MapPin size={12} />, value: faculty.place || 'N/A' }
      ];

      const expandedContent = (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {faculty.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={14} className="text-slate-400" />
                <span className="text-xs font-bold">{faculty.email}</span>
              </div>
            )}
            {faculty.phone_number && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span className="text-xs font-bold">{faculty.phone_number}</span>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">ID: {faculty.id}</span>
          </div>
        </div>
      );

      const primaryActions = [
        { icon: <Eye size={14} />, label: 'Profile', onClick: () => { setSelectedFaculty(faculty); setIsDetailModalOpen(true); } }
      ];

      return (
        <MobileCard
          key={faculty.id}
          isExpanded={expandedCardId === faculty.id}
          onToggle={() => setExpandedCardId(expandedCardId === faculty.id ? null : faculty.id)}
          avatar={
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-[#008080] text-white flex items-center justify-center font-black shadow-sm">
              {initials}
            </div>
          }
          title={faculty.name}
          subtitle={<span className="text-slate-500">View Faculty Details</span>}
          badges={badges}
          metrics={metrics}
          expandedContent={expandedContent}
          primaryActions={primaryActions}
          moreActions={[]}
        />
      );
    }) : (
      <div className="p-5 md:p-10 text-center">
        <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">No faculty found</p>
      </div>
    )}
 </div>
 </div>

  {/* Pagination Component */}
  <div className="p-4 md:p-6 border-t border-slate-100 bg-white">
      <Pagination 
          currentPage={page} 
          totalPages={Math.ceil(totalRecords / limit) || 1} 
          totalRecords={totalRecords} 
          onPageChange={setPage} 
      />
  </div>

 {/* Faculty Detail Modal */}
 {isDetailModalOpen && selectedFaculty && <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
 <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
 <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-50 flex justify-between items-start md:items-center bg-slate-50/50">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg uppercase">
 {selectedFaculty.name.charAt(0)}
 </div>
 <div>
 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Faculty Identity</h2>
 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Academic Professional Profile</p>
 </div>
 </div>
 <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all">
 <X size={20} />
 </button>
 </div>

 <div className="p-6 md:p-10 space-y-8 md:space-y-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
 <div className="space-y-6">
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</span>
 <p className="text-lg font-black text-slate-900 uppercase">{selectedFaculty.name}</p>
 </div>
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</span>
 <p className="text-sm font-bold text-slate-700">{selectedFaculty.email || 'N/A'}</p>
 </div>
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</span>
 <p className="text-sm font-bold text-slate-700">{selectedFaculty.phone_number || 'N/A'}</p>
 </div>
 </div>
 <div className="space-y-6">
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Pulse</span>
 <div className="flex items-center gap-2 mt-1">
 <div className={`w-2 h-2 rounded-full ${String(selectedFaculty.status || 'active').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
 <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedFaculty.status || 'ACTIVE'}</p>
 </div>
 </div>
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Geographic Location</span>
 <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{selectedFaculty.place || 'Not Specified'}</p>
 </div>
 </div>
 </div>

 <div className="p-6 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 shrink-0 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
 <ShieldCheck size={24} />
 </div>
 <div>
 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Administrative Role</p>
 <p className="text-xs font-black text-slate-900 uppercase leading-snug">Verified Teaching Faculty</p>
 </div>
 </div>
 <button onClick={() => setIsDetailModalOpen(false)} className="w-full md:w-auto px-4 md:px-8 py-3.5 bg-[#008080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg min-h-[48px]">
 Close Registry
 </button>
 </div>
 </div>
 </div>
 </div>}
 </div>;
};
export default FacultyDirectory;