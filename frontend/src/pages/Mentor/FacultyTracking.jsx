import React, {  useState, useEffect , useDeferredValue } from 'react';
import axios from '../../services/api';
import { 
  ClipboardList, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  MessageSquare,
  TrendingUp,
  FileText,
  Activity,
  History,
  CheckSquare,
  ChevronRight,
  Filter,
  ArrowRight,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const FacultyTracking = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [logs, setLogs] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  // Review Form State
  const [reviewData, setReviewData] = useState({
    todays_observation: 'Normal'
  });

  // Interaction Form State
  const [interactionData, setInteractionData] = useState({
    connection_method: 'WhatsApp',
    main_issue: '',
    issue_details: '',
    teacher_feedback: '',
    root_cause: 'Concept gap',
    action_plan: '',
    responsibility: 'Student',
    followup_required: 'No',
    followup_date: '',
    issue_understood: 'Yes',
    interaction_quality_rating: 5
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, interactionsRes] = await Promise.all([
        axios.get('/faculty-tracking/mentor/class-updates'),
        axios.get('/faculty-tracking/mentor/interactions')
      ]);
      setLogs(logsRes.data.data);
      setInteractions(interactionsRes.data.data);
    } catch (error) {
      toast.error("Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      await axios.post('/faculty-tracking/mentor/review', {
        faculty_log_id: selectedLog.id,
        ...reviewData
      });
      toast.success("Log Reviewed Successfully");
      setIsReviewModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Review failed");
    }
  };

  const handleInteractionSubmit = async () => {
    try {
      await axios.post('/faculty-tracking/mentor/interaction', {
        ...interactionData,
        faculty_log_id: selectedLog.id,
        student_id: selectedLog.student_id,
        subject: selectedLog.subject,
        faculty_name: selectedLog.faculty_name
      });
      toast.success("Interaction Logged Successfully");
      setIsInteractionModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };

  const filteredLogs = logs.filter(l => 
    l.student_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
    l.subject.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
    l.faculty_name.toLowerCase().includes(deferredSearchTerm.toLowerCase())
  );

  const exportToExcel = async () => {
    setExportLoading(true);
    try {
      let dataToExport = [...filteredLogs];

      if (exportDateFrom) {
        dataToExport = dataToExport.filter(l => {
          const d = (l.date || l.created_at || '').split('T')[0];
          return d >= exportDateFrom;
        });
      }
      if (exportDateTo) {
        dataToExport = dataToExport.filter(l => {
          const d = (l.date || l.created_at || '').split('T')[0];
          return d <= exportDateTo;
        });
      }

      if (dataToExport.length === 0) {
        toast.error('No data found for the selected date range');
        setExportLoading(false);
        return;
      }

      const XLSX = await import('xlsx');
      const exportData = dataToExport.map(log => ({
        'Student Name': log.student_name || 'N/A',
        'Subject': log.subject || 'N/A',
        'Faculty': log.faculty_name || 'N/A',
        'Date': log.date ? new Date(log.date).toLocaleDateString('en-GB') : 'N/A',
        'Time': log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        'Observation': log.todays_observation || 'PENDING REVIEW',
        'Topic Taught': log.topic_taught || 'N/A',
        'Duration (mins)': log.class_duration || 'N/A',
        'Homework Given': log.homework_given ? 'Yes' : 'No',
        'Homework Details': log.homework_details || 'N/A',
        'Attention Level': log.attention_level || 'N/A',
        'Participation Level': log.participation_level || 'N/A',
        'Understanding Level': log.understanding_level || 'N/A',
        'Issue Detected': log.issue_flag ? 'Yes' : 'No',
        'Issue Type': log.issue_type || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 22 }, // Student Name
        { wch: 16 }, // Subject
        { wch: 22 }, // Faculty
        { wch: 14 }, // Date
        { wch: 12 }, // Time
        { wch: 18 }, // Observation
        { wch: 25 }, // Topic Taught
        { wch: 16 }, // Duration
        { wch: 16 }, // Homework Given
        { wch: 30 }, // Homework Details
        { wch: 16 }, // Attention
        { wch: 18 }, // Participation
        { wch: 18 }, // Understanding
        { wch: 14 }, // Issue Detected
        { wch: 18 }, // Issue Type
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Updates");
      const fromLabel = exportDateFrom || 'all';
      const toLabel = exportDateTo || 'dates';
      XLSX.writeFile(wb, `Faculty_Log_${fromLabel}_to_${toLabel}.xlsx`);
      toast.success(`Exported ${exportData.length} records`);
      setExportModal(false);
    } catch (e) {
      toast.error('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const getObservationColor = (obs) => {
    switch(obs) {
      case 'Normal': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Needs Attention': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Issue Detected': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">Faculty Log Overview</h2>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={14} className="text-[#008080]" /> STUDENT PERFORMANCE TRACKER
          </p>
        </div>

        <div className="bg-white p-1.5 rounded-[22px] border border-slate-200 flex flex-wrap gap-2 shadow-sm">
          {[
            { id: 'history', label: 'Daily Updates', icon: <History size={16} /> },
            { id: 'review', label: 'Mentor Review', icon: <CheckSquare size={16} /> },
            { id: 'interaction', label: 'Interactions', icon: <MessageSquare size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none justify-center items-center gap-2 md:gap-3 px-3 md:px-6 py-3 rounded-[18px] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-yellow-400 text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in duration-500">
        
        {/* Tab 1: History (Full History) */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
               <div className="flex-1 relative group w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search by student, faculty or subject..."
                    className="w-full bg-white border border-slate-200 pl-14 pr-6 py-5 rounded-[24px] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <button onClick={() => setExportModal(true)} className="bg-[#008080] p-5 rounded-[24px] border border-[#008080] text-white hover:bg-[#006666] hover:border-[#006666] transition-all shadow-sm shadow-[#008080]/20 flex items-center justify-center group" title="Export to Excel">
                  <Download size={20} className="group-hover:scale-110 transition-transform" />
               </button>
               <button className="bg-white p-5 rounded-[24px] border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                  <Filter size={20} />
               </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
               {filteredLogs.map(log => (
                 <div key={log.id} className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden hover:border-[#008080]/30 transition-all group">
                    <div className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-50 rounded-[22px] flex items-center justify-center text-slate-600 group-hover:bg-[#008080]/10 group-hover:text-[#008080] transition-all">
                             <User size={28} />
                          </div>
                          <div>
                             <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{log.student_name}</h4>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest">{log.subject}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                   <Clock size={12} /> {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Faculty</p>
                             <p className="text-sm font-black text-slate-700 uppercase">{log.faculty_name}</p>
                          </div>
                          <div className="h-10 w-[1px] bg-slate-100 mx-4 hidden md:block"></div>
                          <div className={`px-5 py-3 rounded-[18px] border text-[10px] font-black uppercase tracking-widest ${getObservationColor(log.todays_observation || 'Not Reviewed')}`}>
                             {log.todays_observation || 'PENDING REVIEW'}
                          </div>
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="w-12 h-12 bg-[#008080] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#008080]/20 hover:scale-105 transition-all"
                          >
                             <Eye size={20} />
                          </button>
                       </div>
                    </div>

                    {/* Expandable Details (when selected) */}
                    {selectedLog?.id === log.id && (
                      <div className="px-4 md:px-8 pb-10 pt-4 border-t border-slate-50 space-y-10 animate-in slide-in-from-top-4 duration-500">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Class Context</p>
                               <p className="text-sm font-bold text-slate-800 leading-relaxed mb-4">{log.topic_taught}</p>
                               <div className="flex items-center gap-3">
                                  <div className="px-3 py-1.5 bg-white rounded-xl text-[9px] font-black text-slate-600 border border-slate-100">
                                     {log.class_duration}
                                  </div>
                                  <div className="px-3 py-1.5 bg-white rounded-xl text-[9px] font-black text-[#008080] border border-[#008080]/10">
                                     {new Date(log.date).toLocaleDateString()}
                                  </div>
                               </div>
                            </div>

                            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Homework Status</p>
                               <p className="text-sm font-bold text-slate-800 mb-2">{log.homework_given ? 'YES' : 'NO'}</p>
                               <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{log.homework_details || 'N/A'}"</p>
                            </div>

                            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Observations</p>
                               <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">Attention</span>
                                     <span className="text-[10px] font-black text-slate-900 uppercase">{log.attention_level}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">Participation</span>
                                     <span className="text-[10px] font-black text-slate-900 uppercase">{log.participation_level}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">Understanding</span>
                                     <span className="text-[10px] font-black text-slate-900 uppercase">{log.understanding_level}</span>
                                  </div>
                               </div>
                            </div>

                            <div className={`p-6 rounded-[24px] border ${log.issue_flag ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                               <p className="text-[9px] font-black uppercase tracking-widest mb-2">Issue Status</p>
                               <h5 className="text-sm font-black uppercase mb-2">{log.issue_flag ? '🔴 ISSUE DETECTED' : '🟢 ALL NORMAL'}</h5>
                               {log.issue_flag && <p className="text-xs font-bold uppercase tracking-tight">{log.issue_type}</p>}
                            </div>
                         </div>
                         
                         {/* Files */}
                         {log.faculty_files && JSON.parse(log.faculty_files).length > 0 && (
                           <div className="pt-6 border-t border-slate-50">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Attachments</p>
                              <div className="flex flex-wrap gap-4">
                                 {JSON.parse(log.faculty_files).map((file, idx) => (
                                   <a 
                                     key={idx} 
                                     href={file} 
                                     target="_blank" 
                                     rel="noreferrer"
                                     className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 hover:border-[#008080] transition-all group/file"
                                   >
                                      <FileText size={18} className="text-slate-400 group-hover/file:text-[#008080]" />
                                      <span className="text-[10px] font-black text-slate-600 uppercase">View Document #{idx + 1}</span>
                                   </a>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Tab 2: Mentor Review */}
        {activeTab === 'review' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {logs.filter(l => !l.todays_observation).map(log => (
               <div key={log.id} className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-xl flex flex-col justify-between hover:-translate-y-1 transition-all group">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                       <div className="w-14 h-14 bg-slate-50 rounded-[20px] flex items-center justify-center text-slate-600 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
                          <CheckSquare size={24} />
                       </div>
                       <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">REVIEW PENDING</span>
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{log.student_name}</h4>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.subject} • Faculty: {log.faculty_name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Attention</span>
                          <span className={`text-[10px] font-black uppercase ${log.attention_level === 'Low' ? 'text-rose-500' : 'text-slate-800'}`}>{log.attention_level}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Issue Flag</span>
                          <span className={`text-[10px] font-black uppercase ${log.issue_flag ? 'text-rose-500' : 'text-emerald-500'}`}>{log.issue_flag ? 'YES' : 'NO'}</span>
                       </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedLog(log); setIsReviewModalOpen(true); }}
                    className="w-full mt-8 py-4 bg-[#008080] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-[#008080]/20 active:scale-95 transition-all"
                  >
                     Analyze & Review <ChevronRight size={16} />
                  </button>
               </div>
             ))}
             {logs.filter(l => !l.todays_observation).length === 0 && (
               <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-slate-100">
                  <CheckCircle2 size={64} className="mx-auto text-emerald-100 mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 uppercase">All Reviewed</h3>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">All faculty logs have been successfully reviewed.</p>
               </div>
             )}
          </div>
        )}

        {/* Tab 3: Interactions */}
        {activeTab === 'interaction' && (
          <div className="space-y-10">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Student Interactions</h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                      <TrendingUp size={14} /> HIGH PRIORITY
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {interactions.map(item => (
                  <div key={item.id} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-xl flex flex-col lg:flex-row gap-10">
                     <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-[#008080]/10 text-[#008080] rounded-[22px] flex items-center justify-center">
                              <MessageSquare size={28} />
                           </div>
                           <div>
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{item.student_name}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                 {item.subject} • {new Date(item.date).toLocaleDateString()}
                                 <span className="flex items-center gap-1 text-[#008080]">
                                    <ArrowRight size={10} /> {item.connection_method}
                                 </span>
                              </p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Core Issue</p>
                              <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{item.main_issue}"</p>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Root Cause Identified</p>
                              <p className="text-sm font-black text-rose-500 uppercase">{item.root_cause}</p>
                           </div>
                        </div>
                     </div>

                     <div className="lg:w-[400px] bg-slate-50 p-4 md:p-8 rounded-[32px] flex flex-col justify-between">
                        <div className="space-y-6">
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Action Plan</p>
                              <p className="text-sm font-bold text-slate-800 uppercase leading-snug">{item.action_plan}</p>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsibility</p>
                                 <p className="text-[10px] font-black text-[#008080] uppercase">{item.responsibility}</p>
                              </div>
                              {item.followup_required ? (
                                <div className="text-right space-y-1">
                                   <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Follow-up Target</p>
                                   <p className="text-[10px] font-black text-rose-500 uppercase">{new Date(item.followup_date).toLocaleDateString()}</p>
                                </div>
                              ) : null}
                           </div>
                        </div>
                        <div className="pt-6 border-t border-slate-200 mt-6 flex justify-between items-center">
                           <div className="flex gap-1">
                              {[1,2,3,4,5].map(v => (
                                <div key={v} className={`w-2 h-2 rounded-full ${v <= item.interaction_quality_rating ? 'bg-[#008080]' : 'bg-slate-200'}`}></div>
                              ))}
                           </div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quality Rating</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Review Modal */}
      {isReviewModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
              <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mentor Review</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Analyzing log for {selectedLog.student_name}</p>
                 </div>
                 <button onClick={() => setIsReviewModalOpen(false)} className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-6 md:p-10 space-y-10">
                 <div className="bg-slate-50 p-4 md:p-8 rounded-[28px] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 text-amber-500">
                       <AlertCircle size={20} />
                       <span className="text-xs font-black uppercase tracking-widest">Faculty Observation</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{selectedLog.topic_taught}"</p>
                    {selectedLog.issue_flag && (
                      <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 w-fit">
                         <TrendingUp size={14} />
                         <span className="text-[10px] font-black uppercase">{selectedLog.issue_type}</span>
                      </div>
                    )}
                 </div>

                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Overall Assessment</label>
                    <div className="grid grid-cols-3 gap-4">
                       {[
                         { id: 'Normal', color: 'emerald' },
                         { id: 'Needs Attention', color: 'amber' },
                         { id: 'Issue Detected', color: 'rose' }
                       ].map(opt => (
                         <button 
                           key={opt.id}
                           onClick={() => setReviewData({ todays_observation: opt.id })}
                           className={`py-5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all border-2 ${reviewData.todays_observation === opt.id ? `bg-${opt.color}-500 text-white border-transparent shadow-xl` : 'bg-white border-slate-100 text-slate-400'}`}
                         >
                            {opt.id}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button 
                      onClick={handleReviewSubmit}
                      className="flex-1 py-5 bg-[#008080] text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
                    >
                       COMMIT REVIEW <CheckCircle2 size={18} />
                    </button>
                    {reviewData.todays_observation === 'Issue Detected' && (
                      <button 
                        onClick={() => { setIsReviewModalOpen(false); setIsInteractionModalOpen(true); }}
                        className="flex-1 py-5 bg-rose-500 text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
                      >
                         INITIATE INTERACTION <ArrowRight size={18} />
                      </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Interaction Modal */}
      {isInteractionModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in slide-in-from-bottom-10 duration-500">
              <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-10">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Interaction Log</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Issue Resolution Tracker • {selectedLog.student_name}</p>
                 </div>
                 <button onClick={() => setIsInteractionModalOpen(false)} className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-100">
                    <X size={24} />
                 </button>
              </div>

              <div className="p-6 md:p-10 space-y-12">
                 {/* Section 1: Interaction Metadata */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Connection Method</label>
                       <div className="flex gap-2">
                          {['Call', 'WhatsApp'].map(v => (
                            <button 
                              key={v}
                              onClick={() => setInteractionData({...interactionData, connection_method: v})}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${interactionData.connection_method === v ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                            >
                              {v}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Main Issue Category</label>
                       <input 
                         type="text"
                         placeholder="e.g. Concept Gap in Trigonometry"
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]/10"
                         value={interactionData.main_issue}
                         onChange={e => setInteractionData({...interactionData, main_issue: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Section 2: Details */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Detailed Observation</label>
                       <textarea 
                         rows={3}
                         placeholder="Describe the issue details..."
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]/10 resize-none"
                         value={interactionData.issue_details}
                         onChange={e => setInteractionData({...interactionData, issue_details: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Faculty/Teacher Feedback</label>
                       <textarea 
                         rows={3}
                         placeholder="What does the teacher say?"
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]/10 resize-none"
                         value={interactionData.teacher_feedback}
                         onChange={e => setInteractionData({...interactionData, teacher_feedback: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Section 3: Root Cause & Action */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Root Cause Identification</label>
                       <select 
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]/10"
                         value={interactionData.root_cause}
                         onChange={e => setInteractionData({...interactionData, root_cause: e.target.value})}
                       >
                          <option>Concept gap</option>
                          <option>Carelessness</option>
                          <option>Lack of practice</option>
                          <option>Distraction</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Primary Responsibility</label>
                       <div className="flex flex-wrap gap-2">
                          {['Student', 'Mentor', 'Faculty', 'Parent'].map(v => (
                            <button 
                              key={v}
                              onClick={() => setInteractionData({...interactionData, responsibility: v})}
                              className={`flex-1 min-w-[100px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${interactionData.responsibility === v ? 'bg-[#008080] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                            >
                              {v}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Action Plan (The Resolve)</label>
                       <input 
                         type="text"
                         placeholder="What is the next immediate step to solve this?"
                         className="w-full p-5 bg-yellow-400 text-slate-900 border-transparent rounded-2xl text-sm font-bold shadow-xl outline-none"
                         value={interactionData.action_plan}
                         onChange={e => setInteractionData({...interactionData, action_plan: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Section 4: Followup & Quality */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                    <div className="space-y-6">
                       <div className="flex items-center gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                             <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${interactionData.followup_required === 'Yes' ? 'bg-[#008080] border-[#008080] text-white' : 'bg-white border-slate-100 text-transparent'}`}>
                                <CheckCircle2 size={18} />
                             </div>
                             <input type="checkbox" className="hidden" checked={interactionData.followup_required === 'Yes'} onChange={e => setInteractionData({...interactionData, followup_required: e.target.checked ? 'Yes' : 'No'})} />
                             <span className="text-xs font-black text-slate-900 uppercase">Follow-up Required</span>
                          </label>
                       </div>
                       {interactionData.followup_required === 'Yes' && (
                         <div className="animate-in slide-in-from-left-4 duration-300">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Follow-up Target Date</label>
                            <input 
                              type="date"
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold mt-2"
                              value={interactionData.followup_date}
                              onChange={e => setInteractionData({...interactionData, followup_date: e.target.value})}
                            />
                         </div>
                       )}
                    </div>
                    <div className="space-y-6">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Interaction Quality Rating</label>
                          <div className="flex gap-2">
                             {[1,2,3,4,5].map(v => (
                               <button 
                                 key={v}
                                 onClick={() => setInteractionData({...interactionData, interaction_quality_rating: v})}
                                 className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${interactionData.interaction_quality_rating === v ? 'bg-[#008080] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                               >
                                  {v}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 <button 
                   onClick={handleInteractionSubmit}
                   className="w-full py-6 bg-[#008080] text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
                 >
                    SAVE INTERACTION <CheckCircle2 size={20} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* X Modal for details (reusing selectedLog) */}
      {!isReviewModalOpen && !isInteractionModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           {/* Simple close trigger */}
           <div className="absolute inset-0" onClick={() => setSelectedLog(null)}></div>
           {/* Detailed View is already handled in-line in history tab, but could be a modal too */}
        </div>
      )}

    {/* Export Date Range Modal */}
    {exportModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-[2rem] shadow-2xl p-4 md:p-8 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-3"><Download className="text-[#008080]" size={20} /> Export Faculty Logs</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select date range to export</p>
            </div>
            <button onClick={() => setExportModal(false)} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">From Date</label>
              <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:bg-white transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">To Date</label>
              <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-[#008080]/10 focus:bg-white transition-all" />
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-[10px] font-bold text-slate-500 leading-relaxed border border-slate-100">
              💡 Leave both empty to export all. Pick one date for a single day. Pick a range for multiple days.
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setExportModal(false)}
                className="flex-1 py-3.5 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={exportToExcel} disabled={exportLoading}
                className="flex-[2] py-3.5 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#006666] transition-all shadow-lg shadow-[#008080]/30 flex items-center justify-center gap-2 disabled:opacity-60">
                {exportLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
                {exportLoading ? 'Exporting...' : 'Export to Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};

const X = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default FacultyTracking;
