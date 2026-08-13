import React, { useState, useEffect, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Users, User, Mail, Phone, Calendar, Search, Filter, Activity, Edit2, Trash2, X, Save, BookOpen, MapPin, ShieldCheck, Eye, GraduationCap, History, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import ExportButton from '../../components/common/ExportButton';
import MobileCard from '../../components/common/MobileCard';
import Pagination from '../../components/common/Pagination';

const FacultyDirectory = ({
  role = 'academic_operation_executive'
}) => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('directory');
  const [editHistory, setEditHistory] = useState([]);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const navBasePath = role === 'academic_head' ? '/academic-head' : '/aoe';
  const navigate = useNavigate();
  const [selectedSyllabi, setSelectedSyllabi] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const toggleSyllabus = syl => {
    setSelectedSyllabi(prev => prev.includes(syl) ? prev.filter(s => s !== syl) : [...prev, syl]);
  };
  const toggleSection = sec => {
    setSelectedSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };
  const toggleSubject = sub => {
    setSelectedSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
  };
  const LANG_OPTIONS = [{
    id: 'ENG-100',
    label: 'English - 100%'
  }, {
    id: 'BL-ADV-MAL',
    label: 'Bilingual - Advanced (70% English, 30% Malayalam)'
  }, {
    id: 'BL-SMP-MAL',
    label: 'Bilingual - Simple (70% Malayalam, 30% English)'
  }, {
    id: 'MAL-ONLY',
    label: 'Malayalam Only'
  }, {
    id: 'HIN-100',
    label: 'Hindi 100%'
  }, {
    id: 'BL-ADV-HIN',
    label: 'Bilingual - Advanced (70% Hindi, 30% English)'
  }, {
    id: 'BL-SMP-HIN',
    label: 'Bilingual - Simple (70% English, 30% Hindi)'
  }, {
    id: 'ARB-100',
    label: 'Arabic 100%'
  }, {
    id: 'TAM-100',
    label: 'Tamil 100%'
  }];
  const SUBJECT_OPTIONS = ["Mathematics", "Science", "Social Science", "English", "Malayalam", "Hindi", "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", "Economics", "Computer Science", "Arabic", "French", "IT", "EVS"];
  useEffect(() => {
    setPage(1);
  }, [deferredSearchTerm, selectedSyllabi, selectedSections, selectedSubjects, sortBy, activeTab]);

  useEffect(() => {
    if (activeTab === 'directory') {
      fetchFaculties();
    } else {
      fetchEditHistory();
    }
  }, [page, sortBy, activeTab, deferredSearchTerm, selectedSyllabi, selectedSections, selectedSubjects]);

  const fetchEditHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/aoe/faculty-history?page=${page}&limit=${limit}`);
      if (res.data.success) {
        setEditHistory(res.data.data);
        setTotalRecords(res.data.total || 0);
      }
    } catch (e) {
      toast.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit, sortBy });
      if (deferredSearchTerm) params.append('search', deferredSearchTerm);
      if (selectedSyllabi.length > 0) params.append('syllabi', selectedSyllabi.join(','));
      if (selectedSections.length > 0) params.append('sections', selectedSections.join(','));
      if (selectedSubjects.length > 0) params.append('subjects', selectedSubjects.join(','));
      
      const res = await api.get(`/aoe/faculties?${params.toString()}`);
      if (res.data.success) {
        setFaculties(res.data.data);
        setTotalRecords(res.data.total || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch faculty directory");
    } finally {
      setLoading(false);
    }
  };

  const handleEditFaculty = faculty => {
    navigate(`${navBasePath}/edit-faculty/${faculty.id}`);
  };
  const handleDeleteFaculty = async facultyParam => {
    const id = typeof facultyParam === 'object' ? facultyParam.id : facultyParam;
    const name = typeof facultyParam === 'object' ? facultyParam.name : 'this faculty';
    const confirm = await premiumConfirm({
      title: "Terminate Faculty Access?",
      message: `You are about to permanently delete ${name}'s profile and all associated academic records. This action cannot be undone.`,
      confirmText: "Permanently Delete",
      type: "danger"
    });
    if (confirm) {
      try {
        const res = await api.delete(`/aoe/faculties/${id}`);
        if (res.data.success) {
          toast.success("Faculty access revoked successfully");
          fetchFaculties();
        }
      } catch (error) {
        toast.error("Operation failed");
      }
    }
  };
  const filteredFaculties = faculties; // Backend now handles all filtering

  return <div className="p-4 md:p-8 min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
              Faculty Management
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Manage academic staff credentials and track modifications</p>
          </div>
          
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => setActiveTab('directory')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'directory' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30' : 'text-slate-500 hover:bg-slate-50'}`}>
              Directory
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-[#008080] text-white shadow-lg shadow-[#008080]/30' : 'text-slate-500 hover:bg-slate-50'}`}>
              Edit History
            </button>
          </div>
        </div>

        {activeTab === 'directory' && <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 w-full">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative group min-w-full md:w-[300px] flex-1 md:flex-initial">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
                  <input type="text" placeholder="Search by name, email or subject..." className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#008080]/10 focus:border-[#008080] transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isFilterOpen || selectedSyllabi.length + selectedSections.length + selectedSubjects.length > 0 ? 'bg-[#008080]/10 text-[#008080] border-[#008080]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  <Filter size={16} /> Filters
                  {selectedSyllabi.length + selectedSections.length + selectedSubjects.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#008080] text-white">
                      {selectedSyllabi.length + selectedSections.length + selectedSubjects.length}
                    </span>}
                </button>
                <ExportButton 
                    data={filteredFaculties}
                    filename="faculty_directory"
                    dateField="created_at"
                    columns={[
                        { header: 'Name', accessor: 'name' },
                        { header: 'Email', accessor: 'email' },
                        { header: 'Phone', accessor: 'phone' },
                        { header: 'Syllabus Focus', accessor: 'syllabus' },
                        { header: 'Section Focus', accessor: 'section' },
                        { header: 'Subject Focus', accessor: 'subjects' },
                        { header: 'Status', accessor: 'status' }
                    ]}
                />
              </div>

              <select className="bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-[#008080] shadow-sm cursor-pointer w-full md:w-auto" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Sort: Newest First</option>
                <option value="name">Sort: Alphabetical</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>

            {/* Collapsible Filter Panel */}
            {isFilterOpen && <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg space-y-6 animate-in slide-in-from-top-4 duration-300">
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
          </div>}

        {/* Stats Row */}
        {activeTab === 'directory' && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Staff</p>
              <h3 className="text-2xl font-black text-slate-900">{faculties.filter(f => f.status === 'active').length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-[#008080]/10 text-[#008080] rounded-2xl flex items-center justify-center">
              <GraduationCap size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Expertise</p>
              <h3 className="text-2xl font-black text-slate-900">{SUBJECT_OPTIONS.length}+</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Onboarding Pipeline</p>
              <h3 className="text-2xl font-black text-slate-900">{faculties.filter(f => f.status === 'pending').length}</h3>
            </div>
          </div>
        </div>}

        {/* Main Content Area */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          {loading ? <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-xs uppercase tracking-widest">Retrieving Staff Data...</p>
            </div> : activeTab === 'directory' && filteredFaculties.length === 0 ? <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900">No Faculty Found</h3>
              <p className="text-slate-500 font-bold max-w-xs mx-auto text-sm">We couldn't find any staff matching your search criteria.</p>
            </div> : activeTab === 'directory' ? <div><div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-[80px]">No.</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Faculty Profile</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subject Focus</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Joined Date</th>
                    <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredFaculties.map((faculty, index) => <tr key={faculty.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 md:px-8 py-6 font-black text-slate-400 text-[12px]">{index + 1}</td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#008080] text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-[#008080]/20 group-hover:scale-110 transition-transform">
                            {faculty.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{faculty.name}</h4>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] mt-1">
                              <Mail size={12} /> {faculty.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {faculty.subject ? faculty.subject.split(',').map((sub, idx) => <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                              {sub}
                            </span>) : <span className="text-slate-300 font-bold text-[10px] uppercase">Unassigned</span>}
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${faculty.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${faculty.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'}`} />
                          {faculty.status}
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                          {new Date(faculty.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                        </p>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => {
                      setSelectedFaculty(faculty);
                      setIsDetailModalOpen(true);
                    }} className="w-10 h-10 bg-white text-[#008080] rounded-xl flex items-center justify-center hover:bg-[#008080] hover:text-white transition-all shadow-sm border border-slate-100" title="Quick View">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => handleEditFaculty(faculty)} className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100" title="Edit Faculty">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDeleteFaculty(faculty)} className="w-10 h-10 bg-white text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-slate-100" title="Delete Faculty">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
              </div>
              <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
                {filteredFaculties.map((faculty) => {
                  const initials = faculty.name ? faculty.name.charAt(0).toUpperCase() : '?';
                  
                  const badges = [
                    <span key="status" className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${faculty.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {faculty.status}
                    </span>
                  ];

                  const metrics = [
                    { icon: <GraduationCap size={12} />, value: faculty.subject ? faculty.subject.split(',')[0] : 'Unassigned' }
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
                        {faculty.phone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            <span className="text-xs font-bold">{faculty.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      {faculty.subject && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Focus</p>
                          <div className="flex flex-wrap gap-1.5">
                            {faculty.subject.split(',').map((sub, idx) => (
                              <span key={idx} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  const primaryActions = [
                    { icon: <Eye size={14} />, label: 'View', onClick: () => { setSelectedFaculty(faculty); setIsDetailModalOpen(true); } }
                  ];

                  const moreActions = [
                    { icon: <Edit2 size={14} />, label: 'Edit', onClick: () => navigate(`${navBasePath}/faculty/edit/${faculty.id}`) },
                    { icon: <History size={14} />, label: 'History', onClick: () => handleViewHistory(faculty.id) }
                  ];

                  if (role === 'academic_head') {
                    moreActions.push({ icon: <Trash2 size={14} />, label: 'Delete', onClick: () => premiumConfirm('Delete Faculty', 'Are you sure you want to remove this faculty member? This cannot be undone.', () => handleDelete(faculty.id)), danger: true });
                  }

                  return (
                    <MobileCard
                      key={faculty.id}
                      isExpanded={expandedCardId === faculty.id}
                      onToggle={() => setExpandedCardId(expandedCardId === faculty.id ? null : faculty.id)}
                      avatar={
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008080] to-[#008080]/80 text-white flex items-center justify-center font-black shadow-sm">
                          {initials}
                        </div>
                      }
                      title={faculty.name}
                      subtitle={
                        <span className="text-slate-500">
                          Joined: {new Date(faculty.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      }
                      badges={badges}
                      metrics={metrics}
                      expandedContent={expandedContent}
                      primaryActions={primaryActions}
                      moreActions={moreActions}
                    />
                  );
                })}
              </div>
            </div> : <div className="overflow-x-auto">
              {editHistory.length === 0 ? <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <History size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No History Found</h3>
                  <p className="text-slate-500 font-bold max-w-xs mx-auto text-sm">No faculties have been edited yet.</p>
                </div> : <div className="w-full overflow-x-auto">
<table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date & Time</th>
                      <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Faculty Name</th>
                      <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Edited By</th>
                      <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Changes Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {editHistory.map((log, index) => <tr key={log.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                        <td className="px-4 md:px-8 py-6">
                          <p className="text-xs font-black text-slate-900">
                            {new Date(log.edited_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {new Date(log.edited_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                          </p>
                        </td>
                        <td className="px-4 md:px-8 py-6">
                          <p className="text-sm font-black text-[#008080] uppercase tracking-tight">{log.faculty_name || 'Unknown Faculty'}</p>
                        </td>
                        <td className="px-4 md:px-8 py-6">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User size={14} />
                            <span className="text-xs font-bold">{log.edited_by_name || 'Admin'}</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-8 py-6">
                          <span className="inline-block px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                            {log.changes_summary}
                          </span>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
</div>}
            </div>}
            
            {/* Pagination Component */}
            {(!loading && ((activeTab === 'directory' && filteredFaculties.length > 0) || (activeTab === 'history' && editHistory.length > 0))) && (
              <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50">
                <Pagination 
                  currentPage={page} 
                  totalPages={Math.ceil(totalRecords / limit) || 1} 
                  totalRecords={totalRecords} 
                  onPageChange={setPage} 
                />
              </div>
            )}
        </div>
      </div>
      {/* Faculty Detail Modal */}
      {isDetailModalOpen && selectedFaculty && <div className="fixed inset-0 bg-[#008080]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-50 flex justify-between items-start md:items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#008080] text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                  {selectedFaculty.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Faculty Identity</h2>
                  <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Live Credential Audit</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-8 md:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</span>
                    <p className="text-sm font-black text-slate-900 uppercase">{selectedFaculty.name}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.email}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.phone_number || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.place || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty ID</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.faculty_id_card || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.qualification || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.experience || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hourly Rate</span>
                    <p className="text-sm font-bold text-slate-700">{selectedFaculty.hourly_rate ? `₹${selectedFaculty.hourly_rate}` : 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Onboarding Date</span>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {selectedFaculty.created_at && !isNaN(new Date(selectedFaculty.created_at)) ? new Date(selectedFaculty.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }) : 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Expertise</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedFaculty.subject ? selectedFaculty.subject.split(',').map((sub, idx) => <span key={idx} className="px-3 py-1 bg-[#008080]/10 text-[#008080] rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#008080]/20">
                          {sub.trim()}
                        </span>) : <span className="text-xs text-slate-400">N/A</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${selectedFaculty.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedFaculty.status}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authorization</p>
                    <p className="text-xs font-black text-slate-900 uppercase">Verified Faculty Account</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>}

    </div>;
};
export default FacultyDirectory;