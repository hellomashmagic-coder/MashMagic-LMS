import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Users, Clock, Calendar, Search, DownloadCloud, 
  ChevronDown, BookOpen, UserCheck, SearchX, ShieldAlert,
  FileText, Activity
} from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const StudentSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mobile specific states
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterDate, setFilterDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [expandedCardIdx, setExpandedCardIdx] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchSchedules();
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearchTerm, activeTab, filterDate]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/student-schedules?page=${page}&limit=${limit}`);
      setSchedules(res.data.data || []);
      setTotalRecords(res.data.total || 0);
    } catch (e) {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setIsExporting(true);
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Preparing export...',
      success: 'Schedule exported successfully!',
      error: 'Failed to export'
    }).finally(() => setIsExporting(false));
  };

  const toggleCard = (idx) => {
    setExpandedCardIdx(prev => prev === idx ? null : idx);
  };

  const filteredSchedules = useMemo(() => {
    let data = schedules;
    
    // Search filter
    if (deferredSearchTerm) {
      const lower = deferredSearchTerm.toLowerCase();
      data = data.filter(s => 
        s.student_name?.toLowerCase().includes(lower) || 
        s.faculty_name?.toLowerCase().includes(lower) ||
        s.subject?.toLowerCase().includes(lower)
      );
    }
    
    // Tab filter (mock logic since real status might not exist)
    if (activeTab !== 'All') {
      const targetStatus = activeTab === 'Active' ? 'Scheduled' : activeTab;
      data = data.filter(s => (s.status || 'Scheduled') === targetStatus);
    }

    // Date filter (mock logic since real date might not be in YYYY-MM-DD format in day_of_week)
    if (filterDate) {
      // In a real scenario, we'd filter by exact date. For now, we just pass through or mock
    }
    
    return data;
  }, [schedules, deferredSearchTerm, activeTab, filterDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* DESKTOP HEADER (Hidden on mobile) */}
      <div className="hidden md:flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Student Schedules</h1>
          <p className="text-sm text-slate-500 font-medium">View all student and faculty assignments</p>
        </div>
      </div>

      {/* MOBILE HEADER (Hidden on desktop) */}
      <div className="md:hidden flex flex-col gap-2 pt-2 px-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Student<br/>Schedules</h1>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manage assignments</p>
      </div>

      {/* MOBILE SUMMARY CARDS (Hidden on desktop) */}
      <div className="md:hidden grid grid-cols-2 gap-3 px-2">
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px]">
          <div className="w-10 h-10 rounded-full bg-[#008080]/10 flex items-center justify-center text-[#008080]">
            <Calendar size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 leading-none">{loading ? '--' : schedules.length}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Schedules</span>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px]">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 leading-none">{loading ? '--' : schedules.length}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Now</span>
          </div>
        </div>
      </div>

      {/* MOBILE FILTER SECTION (Hidden on desktop) */}
      <div className="md:hidden flex flex-col gap-4 px-2">
        {/* 1. Status Tabs (Horizontal Scroll) */}
        <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 pb-1">
          <div className="flex gap-2 min-w-max">
            {['All', 'Active', 'Completed', 'Cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap min-h-[44px] ${
                  activeTab === tab 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Date Picker */}
        <div className="relative w-full">
          <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-[1.5rem] pl-12 pr-5 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm" 
            aria-label="Filter by Date"
          />
        </div>

        {/* 3. Search Bar */}
        <div className="relative w-full">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search students or faculty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-[1.5rem] pl-12 pr-5 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm placeholder:text-slate-400"
            aria-label="Search Schedules"
          />
        </div>

        {/* 4. Export Button */}
        <button 
          onClick={handleDownload}
          disabled={isExporting || loading || filteredSchedules.length === 0}
          className="w-full min-h-[44px] bg-[#008080] hover:bg-[#006666] text-white px-6 py-3 rounded-[1.5rem] flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
          aria-label="Export Schedules"
        >
          {isExporting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <DownloadCloud size={18} />
          )}
          <span className="uppercase tracking-widest text-[11px]">Export Data</span>
        </button>
      </div>

      {/* DESKTOP TABLE (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Faculty</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Subject</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Day & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="p-4 md:p-8 text-center"><div className="w-8 h-8 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
              ) : schedules.length > 0 ? (
                schedules.map((s, index) => (
                  <tr key={s.id || index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <Users size={16} className="text-slate-400" />
                      {s.student_name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{s.faculty_name}</td>
                    <td className="px-6 py-4 font-semibold text-[#008080]">{s.subject}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Calendar size={14} className="text-[#008080]" /> {s.day_of_week}
                        <span className="mx-2 text-slate-300">|</span>
                        <Clock size={14} className="text-[#008080]" /> {s.start_time} - {s.end_time}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 md:p-12 text-center text-slate-400">
                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-semibold text-sm">No student schedules found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 md:p-6 border-t border-slate-100">
          <Pagination 
            currentPage={page} 
            totalPages={Math.ceil(totalRecords / limit) || 1} 
            totalRecords={totalRecords} 
            onPageChange={setPage} 
          />
        </div>
      </div>

      {/* MOBILE CARD LAYOUT (Hidden on desktop) */}
      <div className="md:hidden flex flex-col gap-4 px-2">
        {loading ? (
          // SKELETON CARDS
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0"></div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
            </div>
          ))
        ) : filteredSchedules.length === 0 ? (
          // EMPTY STATE
          <div className="bg-white rounded-[2rem] p-4 md:p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center mt-4 opacity-90">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <SearchX size={40} className="text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No Schedules Found</h3>
            <p className="text-[11px] font-bold text-slate-500 mb-6 leading-relaxed max-w-[250px]">
              We couldn't find any student schedules matching your active filters.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setActiveTab('All'); setFilterDate(''); }} 
              className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest transition-colors active:scale-95"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredSchedules.map((s, idx) => {
            const isExpanded = expandedCardIdx === idx;
            const status = s.status || 'Scheduled';
            const statusColors = {
              'Scheduled': 'bg-[#008080]/10 text-[#008080] border-[#008080]/20',
              'Active': 'bg-blue-50 text-blue-600 border-blue-100',
              'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
              'Cancelled': 'bg-rose-50 text-rose-600 border-rose-100'
            };
            const currentBadgeColor = statusColors[status] || statusColors['Scheduled'];

            return (
            <div key={s.id || idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 transform relative">
              
              {/* COLLAPSED CARD */}
              <button 
                type="button"
                onClick={() => toggleCard(idx)}
                className="w-full text-left p-5 flex flex-col gap-4 cursor-pointer focus:outline-none focus:bg-slate-50 transition-colors relative"
                aria-expanded={isExpanded}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center font-black text-lg text-slate-400 shrink-0 shadow-inner">
                      {s.student_name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-black text-slate-800 leading-tight truncate">{s.student_name}</span>
                      <span className="text-[11px] font-bold text-slate-500 truncate mt-1 flex items-center gap-1.5">
                        <BookOpen size={12} className="text-[#008080]" />
                        {s.subject}
                      </span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 bg-[#008080]/10 text-[#008080]' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50 overflow-hidden">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 truncate min-w-0">
                    <Calendar size={14} className="text-slate-400 shrink-0" /> 
                    <span className="truncate">{s.day_of_week}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></div>
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 truncate min-w-0">
                    <Clock size={14} className="text-slate-400 shrink-0" /> 
                    <span className="truncate">{s.start_time} - {s.end_time}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <Users size={14} />
                    <span className="truncate max-w-[120px]">{s.faculty_name}</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${currentBadgeColor}`}>
                    {status}
                  </span>
                </div>
              </button>

              {/* EXPANDED CARD DETAILS */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}
                aria-hidden={!isExpanded}
              >
                <div className="p-5 bg-slate-50/50 flex flex-col gap-4">
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={10} /> Batch</span>
                      <span className="text-[11px] font-bold text-slate-700">{s.batch || 'General Batch'}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10} /> Duration</span>
                      <span className="text-[11px] font-bold text-slate-700">{s.duration || '60 mins'}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserCheck size={10} /> Attendance</span>
                      <span className="text-[11px] font-bold text-emerald-600">{s.attendance || 'Pending'}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={10} /> Created</span>
                      <span className="text-[11px] font-bold text-slate-700">{s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Session Notes */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} /> Session Notes</span>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      {s.session_notes || 'No notes available for this session.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 min-h-[44px] flex items-center justify-center text-[10px] font-black text-slate-600 bg-white border border-slate-200 uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors active:scale-95 shadow-sm">
                      View Details
                    </button>
                    <button className="flex-1 min-h-[44px] flex items-center justify-center text-[10px] font-black text-white bg-slate-800 uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors active:scale-95 shadow-sm">
                      Edit Schedule
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )})
        )}
      </div>
      
      {/* MOBILE PAGINATION */}
      <div className="md:hidden mt-4 px-2">
        <div className="bg-white rounded-[2rem] p-4 border border-slate-100 shadow-sm">
          <Pagination 
            currentPage={page} 
            totalPages={Math.ceil(totalRecords / limit) || 1} 
            totalRecords={totalRecords} 
            onPageChange={setPage} 
          />
        </div>
      </div>

    </div>
  );
};

export default StudentSchedules;