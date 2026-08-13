import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import api from '../../services/api';
import { 
  ShieldCheck, Bell, Clock, Search, Filter, Trash2, CheckCircle2, 
  AlertCircle, ShieldAlert, Trash, Eye, RefreshCw, DownloadCloud,
  ChevronDown, Monitor, Smartphone, Globe, ArrowRight, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const AuditLogs = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedCardIdx, setExpandedCardIdx] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [page, deferredSearchTerm, typeFilter, userFilter, dateFilter]);

  useEffect(() => {
    // Reset page to 1 on filter changes
    setPage(1);
  }, [deferredSearchTerm, typeFilter, userFilter, dateFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notifications', {
        params: {
          page,
          limit,
          search: deferredSearchTerm,
          type: typeFilter,
          date: dateFilter
        }
      });
      setNotifications(res.data.data || []);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      toast.error("Failed to load system audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to purge all audit records?")) return;
    try {
      await api.delete('/admin/notifications/clear-all');
      setNotifications([]);
      toast.success("Audit logs purged");
    } catch (error) {
      toast.error("Purge failed");
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Exporting audit trail...',
      success: 'Export successful!',
      error: 'Export failed'
    }).finally(() => setIsExporting(false));
  };

  const toggleCard = (idx) => {
    setExpandedCardIdx(prev => prev === idx ? null : idx);
  };

  const filteredLogs = notifications;

  const getIcon = type => {
    if (type?.includes('fraud')) return <ShieldAlert className="text-rose-500" size={20} />;
    if (type?.includes('registration')) return <CheckCircle2 className="text-[#008080]" size={20} />;
    return <Bell className="text-slate-400" size={20} />;
  };

  // Helper to extract a dummy username or module from message if not provided
  const extractSubject = (message = '') => {
    const cleaned = message.replace(/<[^>]+>/g, '');
    if (cleaned.toLowerCase().includes('fraud')) return 'Security Module';
    if (cleaned.toLowerCase().includes('mentor')) return 'Mentor Management';
    return 'System Core';
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* DESKTOP HEADER */}
      <header className="hidden md:flex bg-white p-5 md:p-10 md:p-14 rounded-[3.5rem] border border-slate-100 shadow-sm flex-col md:flex-row justify-between items-center gap-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-4">System Notifications & Logs</h1>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
            <ShieldCheck size={16} className="text-[#008080]" />
            Monitor recent system activities and notifications
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchNotifications} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-slate-600 hover:bg-white hover:shadow-lg transition-all">
            <RefreshCw size={20} />
          </button>
          <button onClick={handleClearAll} className="px-4 md:px-8 py-4 bg-rose-50 text-rose-600 rounded-[1.5rem] border border-rose-100 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm">
            Clear All Notifications
          </button>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex flex-col gap-2 pt-2 px-2">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Audit<br/>Trail</h1>
          <button onClick={fetchNotifications} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500 active:scale-95 transition-transform">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#008080]" />
          System Activities
        </p>
      </div>

      {/* MOBILE SUMMARY CARDS */}
      <div className="md:hidden grid grid-cols-2 gap-3 px-2">
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px]">
          <div className="w-10 h-10 rounded-full bg-[#008080]/10 flex items-center justify-center text-[#008080]">
            <ShieldCheck size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 leading-none">{loading ? '--' : notifications.length}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Logs</span>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px]">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 leading-none">{loading ? '--' : notifications.filter(n => n.action_type?.includes('fraud')).length}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Security Alerts</span>
          </div>
        </div>
      </div>

      {/* MOBILE FILTER SECTION */}
      <div className="md:hidden flex flex-col gap-4 px-2">
        {/* 1. Search Bar */}
        <div className="relative w-full">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-[1.5rem] pl-12 pr-5 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm placeholder:text-slate-400"
          />
        </div>

        {/* 2. Activity Type Filter */}
        <div className="relative w-full">
          <Filter size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)} 
            className="w-full bg-white border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] pl-12 pr-10 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm appearance-none"
          >
            <option value="all">All Activities</option>
            <option value="mentor_session_report">Session Reports</option>
            <option value="fraud_alert">Security Alerts</option>
            <option value="mentor_registration">Registrations</option>
            <option value="staff_update">System Updates</option>
          </select>
          <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 3. User Filter */}
        <div className="relative w-full">
          <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select 
            value={userFilter} 
            onChange={e => setUserFilter(e.target.value)} 
            className="w-full bg-white border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] pl-12 pr-10 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm appearance-none"
          >
            <option value="all">All Users / System</option>
            <option value="system">System Core</option>
            <option value="admins">Administrators</option>
          </select>
          <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 4. Date Picker */}
        <div className="relative w-full">
          <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-[1.5rem] pl-12 pr-5 py-3 min-h-[44px] outline-none focus:ring-4 focus:ring-[#008080]/20 transition-all shadow-sm"
          />
        </div>

        {/* 5. Export Button */}
        <button 
          onClick={handleExport}
          disabled={isExporting || loading || filteredLogs.length === 0}
          className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-[1.5rem] flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
        >
          {isExporting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <DownloadCloud size={18} />
          )}
          <span className="uppercase tracking-widest text-[11px]">Export Audit Trail</span>
        </button>
      </div>

      {/* DESKTOP FILTERS (Hidden on mobile) */}
      <div className="hidden md:flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" />
          <input type="text" placeholder="Search notifications..." className="w-full bg-white p-6 pl-16 rounded-[2.5rem] border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-[#008080]/5 font-bold text-slate-700 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white px-5 md:px-10 py-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-[#008080]/5 cursor-pointer">
          <option value="all">All Notifications</option>
          <option value="mentor_session_report">Mentor Session Reports</option>
          <option value="fraud_alert">Security Alerts</option>
          <option value="mentor_registration">Registrations</option>
          <option value="staff_update">System Updates</option>
        </select>
      </div>

      {/* DESKTOP TABLE (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 md:px-10 py-4 md:py-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date & Time</th>
                <th className="px-5 md:px-10 py-4 md:py-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Message / Details</th>
                <th className="px-5 md:px-10 py-4 md:py-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Category</th>
                <th className="px-5 md:px-10 py-4 md:py-8 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse">
                <td colSpan="4" className="px-5 md:px-10 py-4 md:py-8"><div className="h-6 bg-slate-100 rounded-full w-full"></div></td>
              </tr>) : filteredLogs.length > 0 ? filteredLogs.map((log, index) => <tr key={log.id || index} className={`hover:bg-slate-50/50 transition-all group ${log.is_read ? 'opacity-60' : ''}`}>
                <td className="px-5 md:px-10 py-4 md:py-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-[#008080] group-hover:text-white transition-all">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 md:px-10 py-4 md:py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#008080]/30 group-hover:bg-[#008080] transition-colors shadow-[0_0_10px_rgba(0,128,128,0.2)]"></div>
                    <div className="text-xs font-bold text-slate-700 leading-relaxed max-w-xl" dangerouslySetInnerHTML={{ __html: log.message }}></div>
                  </div>
                </td>
                <td className="px-5 md:px-10 py-4 md:py-8">
                  <div className="flex items-center gap-3">
                    {getIcon(log.action_type)}
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{log.action_type?.replace(/_/g, ' ')}</span>
                  </div>
                </td>
                <td className="px-5 md:px-10 py-4 md:py-8 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!log.is_read && <button className="text-[9px] font-black text-[#008080] uppercase tracking-widest flex items-center gap-2 hover:underline">Mark as Read</button>}
                    <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash size={16} /></button>
                  </div>
                </td>
              </tr>) : <tr>
                <td colSpan="4" className="px-5 md:px-10 py-40 text-center">
                  <ShieldCheck size={48} className="text-slate-100 mx-auto mb-6" />
                  <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em]">No logs found.</p>
                </td>
              </tr>}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* PAGINATION DESKTOP */}
      <div className="hidden md:block bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mt-6">
        <Pagination 
          currentPage={page} 
          totalPages={Math.ceil(totalRecords / limit) || 1} 
          totalRecords={totalRecords} 
          onPageChange={setPage} 
        />
      </div>

      {/* MOBILE CARD LAYOUT (Hidden on desktop) */}
      <div className="md:hidden flex flex-col gap-4 px-2">
        {loading ? (
          // SKELETON AUDIT CARDS
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0"></div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="h-12 bg-slate-50 rounded-xl w-full"></div>
            </div>
          ))
        ) : filteredLogs.length === 0 ? (
          // EMPTY STATE
          <div className="bg-white rounded-[2rem] p-4 md:p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center mt-4">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <ShieldCheck size={40} className="text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No Audit Trails Found</h3>
            <p className="text-[11px] font-bold text-slate-500 mb-6 leading-relaxed max-w-[250px]">
              No system activities match your current filters. 
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setTypeFilter('all'); setUserFilter('all'); setDateFilter(''); }} 
              className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest transition-colors active:scale-95"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isExpanded = expandedCardIdx === idx;
            const subjectModule = extractSubject(log.message);
            const isFraud = log.action_type?.includes('fraud');
            const isReg = log.action_type?.includes('registration');
            
            const badgeColor = isFraud 
              ? 'bg-rose-50 text-rose-600 border-rose-100' 
              : isReg 
                ? 'bg-[#008080]/10 text-[#008080] border-[#008080]/20'
                : 'bg-slate-100 text-slate-600 border-slate-200';

            const cleanMsg = log.message?.replace(/<[^>]+>/g, '') || 'System action executed';

            return (
            <div key={log.id || idx} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 transform relative ${log.is_read ? 'opacity-70' : 'opacity-100'}`}>
              
              {/* COLLAPSED CARD */}
              <button 
                type="button"
                onClick={() => toggleCard(idx)}
                className="w-full text-left p-5 flex flex-col gap-4 cursor-pointer focus:outline-none focus:bg-slate-50 transition-colors relative"
                aria-expanded={isExpanded}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                      {isFraud ? <ShieldAlert size={20} className="text-rose-400" /> : <User size={20} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-black text-slate-800 leading-tight truncate">System Actor</span>
                      <span className="text-[10px] font-bold text-slate-500 truncate mt-1">
                        {subjectModule}
                      </span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 bg-[#008080]/10 text-[#008080]' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50">
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed line-clamp-2">
                    {cleanMsg}
                  </p>
                </div>

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badgeColor}`}>
                    {log.action_type?.replace(/_/g, ' ') || 'Action'}
                  </span>
                </div>
              </button>

              {/* EXPANDED CARD DETAILS */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}
                aria-hidden={!isExpanded}
              >
                <div className="p-5 bg-slate-50/50 flex flex-col gap-4">
                  
                  {/* Detailed Log Comparison (Mocked for missing fields) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Previous Value</span>
                        <span className="text-[11px] font-medium text-slate-500 line-through">Null / Unset</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 shrink-0" />
                      <div className="flex-1 flex flex-col gap-1 text-right">
                        <span className="text-[9px] font-black text-[#008080] uppercase tracking-widest">Updated Value</span>
                        <span className="text-[11px] font-bold text-slate-800">Recorded Activity</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Monitor size={10} /> Device</span>
                      <span className="text-[11px] font-bold text-slate-700">Desktop / Web</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Globe size={10} /> Browser</span>
                      <span className="text-[11px] font-bold text-slate-700">Chrome 118</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10} /> Exact Timestamp</span>
                      <span className="text-[11px] font-bold text-slate-700">{new Date(log.created_at).toLocaleString('en-GB')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 min-h-[44px] flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 bg-white border border-slate-200 uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors active:scale-95 shadow-sm">
                      <Eye size={14} /> View JSON
                    </button>
                    <button className="min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50 transition-colors active:scale-95 shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )})
        )}
      </div>

      {/* PAGINATION MOBILE */}
      <div className="md:hidden px-2 mt-4">
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
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

export default AuditLogs;