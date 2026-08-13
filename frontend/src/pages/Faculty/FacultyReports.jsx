import React, { useState, useEffect, useDeferredValue } from 'react';
import axios from '../../services/api';
import {
 ClipboardList,
 Search,
 Filter,
 ChevronRight,
 MoreHorizontal,
 FileText,
 Calendar,
 ArrowUpRight,
 SearchX
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const FacultyReports = () => {
 const [reports, setReports] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);

 const [page, setPage] = useState(1);
 const limit = 50;
 const [totalRecords, setTotalRecords] = useState(0);

 useEffect(() => {
 fetchReports();
 }, [page, deferredSearchTerm]);

 useEffect(() => {
 setPage(1);
 }, [deferredSearchTerm]);

 const fetchReports = async () => {
 setLoading(true);
 try {
 const res = await axios.get('/faculty/reports', {
     params: { page, limit, search: deferredSearchTerm }
 });
 if (res.data.success) {
 setReports(res.data.data || []);
 setTotalRecords(res.data.total || 0);
 }
 } catch (error) {
 toast.error("Failed to load reports");
 } finally {
 setLoading(false);
 }
 };

 const filteredReports = reports;

 return (
 <div className="space-y-12 pb-20">
 {/* Page Header */}
 <div className="bg-white p-5 md:p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
 <div className="text-center md:text-left">
 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Faculty Reports</h1>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2 justify-center md:justify-start">
 <FileText size={14} className="text-[#008080]" />
 Comprehensive archive of student performance reports
 </p>
 </div>
 <div className="w-16 h-16 bg-[#008080] rounded-3xl flex items-center justify-center text-white shadow-xl shadow-[#008080]/30 rotate-6">
 <ClipboardList size={28} />
 </div>
 </div>

 <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
 <div className="relative group">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input
 type="text"
 placeholder="Search reports..."
 className="bg-white border border-slate-200 pl-14 pr-8 py-4 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all shadow-sm min-w-full md:w-[300px]"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>


 {/* Reports List */}
 <div className="grid grid-cols-1 gap-6">
 {loading ? (
 [1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)
 ) : filteredReports.length > 0 ? (
 filteredReports.map((report) => (
 <div key={report.id} className="bg-white p-5 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-700 group flex flex-col lg:flex-row gap-8 items-start lg:items-center relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-125"></div>

 <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center relative z-10 ${report.type === 'Academic' ? 'bg-[#008080]/10 text-[#008080]' :
 report.type === 'Behaviour' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
 }`}>
 <ClipboardList size={32} />
 </div>

 <div className="flex-1 relative z-10">
 <div className="flex flex-wrap items-center gap-3 mb-3">
 <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${report.type === 'Academic' ? 'bg-[#008080] text-white' :
 report.type === 'Behaviour' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
 }`}>
 {report.type}
 </span>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
 <Calendar size={12} />
 Submited {new Date(report.created_at).toLocaleDateString()}
 </span>
 </div>
 <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:translate-x-1 transition-transform">{report.student_name}</h3>
 <p className="text-slate-600 text-sm font-medium line-clamp-2 leading-relaxed max-w-2xl">
 "{report.remarks}"
 </p>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto relative z-10">
 <div className="text-center lg:text-right pr-6 border-r border-slate-100 hidden xl:block">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</p>
 <p className="font-bold text-slate-900">{report.status}</p>
 </div>
 <button className="px-4 md:px-8 py-4 bg-[#008080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200">
 Full Intel
 <ArrowUpRight size={14} />
 </button>
 <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 transition-all">
 <MoreHorizontal size={18} />
 </button>
 </div>
 </div>
 ))
 ) : (
 <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
 <SearchX size={48} />
 </div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight ">No reports found</h3>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Try adjusting your search criteria</p>
 </div>
 )}
 </div>

 {reports.length > 0 && (
 <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-slate-100 mt-6 shadow-sm">
 <Pagination 
 currentPage={page} 
 totalPages={Math.ceil(totalRecords / limit) || 1} 
 totalRecords={totalRecords} 
 onPageChange={setPage} 
 />
 </div>
 )}
 </div >
 );
};

export default FacultyReports;
