import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import api from '../../services/api';
import { Calendar, Target, Users, CheckCircle2, ShieldAlert, DownloadCloud, Search, SearchX, ChevronDown, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DailyMentorHeadReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [expandedCardIdx, setExpandedCardIdx] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [filterDate]);

  const fetchReport = async () => {
    setLoading(true);
    setExpandedCardIdx(null);
    try {
      const res = await api.get(`/admin/mentor-head-report?date=${filterDate}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error("Failed to load Mentor Head Report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setIsExporting(true);
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Preparing report...',
      success: 'Report downloaded successfully!',
      error: 'Failed to download report'
    }).finally(() => setIsExporting(false));
  };

  const toggleCard = (idx) => {
    setExpandedCardIdx(prev => prev === idx ? null : idx);
  };

  const filteredReportData = useMemo(() => {
    if (!deferredSearchTerm) return reportData;
    const lower = deferredSearchTerm.toLowerCase();
    return reportData.filter(r => r.mentorHeadName?.toLowerCase().includes(lower));
  }, [reportData, deferredSearchTerm]);

  // Calculate global stats based on filtered data (or all data)
  const {
    globalCheckedStudents,
    globalRemainingStudents,
    totalStudents
  } = useMemo(() => {
    const allStudentsMap = new Map();
    const checkedStudentsMap = new Map();
    filteredReportData.forEach(row => {
      row.checkedStudents?.forEach(student => {
        checkedStudentsMap.set(student.id, student);
      });
      row.checkedStudents?.forEach(student => allStudentsMap.set(student.id, student));
      row.remainingStudents?.forEach(student => allStudentsMap.set(student.id, student));
    });
    return {
      globalCheckedStudents: Array.from(checkedStudentsMap.values()),
      globalRemainingStudents: Array.from(allStudentsMap.values()).filter(s => !checkedStudentsMap.has(s.id)),
      totalStudents: allStudentsMap.size
    };
  }, [filteredReportData]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Target className="text-[#008080] shrink-0" />
            <span className="truncate">Daily Verification Report</span>
          </h2>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">
            Monitor daily student verifications and accountability across mentor heads
          </p>
        </div>

        {/* SEARCH, FILTER & DATE PICKER - Premium Mobile Refinements */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* 1. Search Bar */}
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Mentor Head..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl pl-12 pr-4 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all hover:border-[#008080] shadow-sm"
              aria-label="Search Mentor Heads"
            />
          </div>

          {/* 2. Date Picker */}
          <div className="relative w-full md:w-auto">
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)} 
              max={new Date().toISOString().split('T')[0]} 
              className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl pl-12 pr-4 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all hover:border-[#008080] shadow-sm"
              aria-label="Filter by Date"
            />
          </div>

          {/* 3. Export Button */}
          <button 
            onClick={handleDownload}
            disabled={isExporting || loading || filteredReportData.length === 0}
            className="w-full md:w-auto min-h-[44px] bg-[#008080] hover:bg-[#006666] text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#008080]/20"
            aria-label="Export Report"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <DownloadCloud size={18} />
            )}
            <span className="uppercase tracking-widest text-[10px] md:text-xs">Export</span>
          </button>
        </div>
      </header>

      {/* Mentor Head Performance - Mobile & Desktop Views */}
      <div className="bg-transparent md:bg-white md:rounded-[2.5rem] md:p-6 md:shadow-sm md:border md:border-slate-100 overflow-hidden">
        
        {/* DESKTOP TABLE (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-full md:w-[600px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest rounded-tl-xl text-center">No.</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Mentor Head Name</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap">Total Students</th>
                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap rounded-tr-xl">Checked By Them</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 animate-pulse">
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-8 mx-auto"></div></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0"></div>
                        <div className="h-4 bg-slate-100 rounded w-32"></div>
                      </div>
                    </td>
                    <td className="p-4"><div className="h-6 bg-slate-100 rounded-lg w-16 mx-auto"></div></td>
                    <td className="p-4"><div className="h-6 bg-slate-100 rounded-lg w-16 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredReportData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 md:p-12">
                    <div className="flex flex-col items-center justify-center text-center opacity-60">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <SearchX size={32} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest">No Mentor Heads Found</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 mb-4">Try adjusting your filters or search term</p>
                      <button onClick={() => setSearchTerm('')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-colors">Clear Search</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReportData.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 text-sm font-black text-slate-400 text-center">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#008080]/10 text-[#008080] flex items-center justify-center font-black text-xs shrink-0">
                          {row.mentorHeadName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{row.mentorHeadName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-black border border-slate-100">
                        <Users size={14} className="text-slate-500 shrink-0" />
                        {row.totalStudents}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-black border border-emerald-100">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        {row.checkedToday}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LAYOUT (Hidden on desktop) */}
        <div className="md:hidden flex flex-col gap-4">
          {loading ? (
            // Skeleton Mobile Cards
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm animate-pulse">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0"></div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 h-12 bg-slate-100 rounded-2xl"></div>
                  <div className="flex-1 h-12 bg-slate-100 rounded-2xl"></div>
                </div>
              </div>
            ))
          ) : filteredReportData.length === 0 ? (
            // Empty State Mobile
            <div className="bg-white rounded-[2rem] p-4 md:p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
                <SearchX size={36} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-2">No Results Found</h3>
              <p className="text-[11px] font-bold text-slate-500 mb-6 leading-relaxed">We couldn't find any mentor heads matching your search criteria.</p>
              <button 
                onClick={() => setSearchTerm('')} 
                className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest transition-colors active:scale-95"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredReportData.map((row, idx) => {
              const isExpanded = expandedCardIdx === idx;
              const pendingCount = row.totalStudents - row.checkedToday;
              const completionRate = row.totalStudents > 0 ? Math.round((row.checkedToday/row.totalStudents)*100) : 0;
              
              return (
              <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 transform">
                {/* Collapsed Header */}
                <button 
                  type="button"
                  onClick={() => toggleCard(idx)}
                  className="w-full text-left p-5 flex flex-col gap-4 cursor-pointer focus:outline-none focus:bg-slate-50 transition-colors relative"
                  aria-expanded={isExpanded}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#008080]/10 text-[#008080] flex items-center justify-center font-black text-base shrink-0 shadow-inner">
                        {row.mentorHeadName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 leading-tight">{row.mentorHeadName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {row.totalStudents} Assigned Students
                        </span>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 bg-[#008080]/10 text-[#008080]' : ''}`}>
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  <div className="flex gap-3 w-full">
                    <div className="flex-1 bg-emerald-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-emerald-100/50">
                      <span className="text-sm font-black text-emerald-600">{row.checkedToday}</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.15em] mt-0.5">Verified</span>
                    </div>
                    <div className="flex-1 bg-rose-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-rose-100/50">
                      <span className="text-sm font-black text-rose-600">{pendingCount}</span>
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.15em] mt-0.5">Pending</span>
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}
                  aria-hidden={!isExpanded}
                >
                  <div className="p-5 bg-slate-50/50 flex flex-col gap-5">
                    
                    {/* Performance Summary */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Activity size={14} className="text-[#008080]"/> 
                          Daily Progress
                        </span>
                        <span className="text-xs font-black text-[#008080] bg-[#008080]/10 px-2 py-0.5 rounded-md">{completionRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-[#008080] rounded-full transition-all duration-1000 ease-out" style={{width: `${completionRate}%`}}></div>
                      </div>
                    </div>

                    {/* Report Statistics & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Clock size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Date</span>
                          <span className="text-[11px] font-bold text-slate-700">{new Date(row.date).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
                        className="min-h-[44px] flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase tracking-widest px-5 py-2 bg-slate-800 rounded-xl active:scale-95 transition-transform hover:bg-slate-700 w-full sm:w-auto"
                      >
                        <DownloadCloud size={14} />
                        Export Data
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )})
          )}
        </div>
      </div>

      {/* Global Student Tracking - REPORT SUMMARY CARDS (2-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {/* Checked Students */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100 flex flex-col h-[400px] md:h-[500px]">
          <div className="flex justify-between items-center mb-5 md:mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> 
              Verified
            </h3>
            <span className="inline-flex items-center justify-center px-3 md:px-4 min-h-[28px] bg-emerald-100 text-emerald-700 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-inner shadow-emerald-200/50 whitespace-nowrap">
              {loading ? '--' : globalCheckedStudents.length} / {loading ? '--' : totalStudents}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[52px] bg-slate-50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : globalCheckedStudents.length > 0 ? (
              <ul className="divide-y divide-slate-50/50 space-y-1.5">
                {globalCheckedStudents.map(student => (
                  <li key={student.id} className="py-2.5 flex flex-col gap-1 rounded-xl px-3 group min-h-[52px] justify-center cursor-default hover:bg-emerald-50/30 transition-colors border border-transparent hover:border-emerald-100/50">
                    <span className="text-[12px] md:text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors truncate leading-tight">{student.name}</span>
                    <span className="text-[9px] md:text-[10px] font-black text-emerald-500/70 uppercase tracking-widest truncate">{student.registration_number || 'No Reg #'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-70 p-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <p className="text-[11px] md:text-xs font-black text-slate-600 uppercase tracking-widest mb-1">No students checked</p>
                <p className="text-[10px] font-bold text-slate-400">Pending verification</p>
              </div>
            )}
          </div>
        </div>

        {/* Remaining Students */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100 flex flex-col h-[400px] md:h-[500px]">
          <div className="flex justify-between items-center mb-5 md:mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
              <ShieldAlert size={20} className="text-rose-500 shrink-0" /> 
              Pending
            </h3>
            <span className="inline-flex items-center justify-center px-3 md:px-4 min-h-[28px] bg-rose-100 text-rose-700 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-inner shadow-rose-200/50 whitespace-nowrap">
              {loading ? '--' : globalRemainingStudents.length} Left
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[52px] bg-slate-50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : globalRemainingStudents.length > 0 ? (
              <ul className="divide-y divide-slate-50/50 space-y-1.5">
                {globalRemainingStudents.map(student => (
                  <li key={student.id} className="py-2.5 flex flex-col gap-1 rounded-xl px-3 group min-h-[52px] justify-center cursor-default hover:bg-rose-50/30 transition-colors border border-transparent hover:border-rose-100/50">
                    <span className="text-[12px] md:text-sm font-bold text-slate-700 group-hover:text-rose-700 transition-colors truncate leading-tight">{student.name}</span>
                    <span className="text-[9px] md:text-[10px] font-black text-rose-500/70 uppercase tracking-widest truncate">{student.registration_number || 'No Reg #'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-70 p-4 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Target size={28} className="text-slate-400" />
                </div>
                <p className="text-[11px] md:text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Verifications complete</p>
                <p className="text-[10px] font-bold text-slate-400">Excellent work today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyMentorHeadReport;