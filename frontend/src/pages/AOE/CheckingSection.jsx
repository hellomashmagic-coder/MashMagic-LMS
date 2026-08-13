import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import MobileCard from '../../components/common/MobileCard';
import { CheckCircle, Eye, ShieldAlert, MessageSquare, Plus, Check, Target, RotateCcw, User, Calendar, BookOpen, Clock, AlertTriangle } from 'lucide-react';
const CheckingSection = () => {
  const [activeTab, setActiveTab] = useState('live_class');
  const [faculties, setFaculties] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    faculty_id: '',
    student_id: '',
    joined_class: false,
    faculty_active: false,
    interactive: false,
    faculty_camera_on: false,
    student_camera_on: false,
    energy_level: 3,
    screen_sharing: false,
    faculty_background: false,
    student_interaction_level: 3,
    check_method: 'Link',
    remarks: '',
    proof_url: '',
    class_date: new Date().toISOString().split('T')[0]
  });
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    id: null,
    verification_status: 'Verified',
    verification_remarks: ''
  });
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    fetchFaculties();
  }, [activeTab, page]);
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'live_class') {
        const res = await api.get(`/aoe/live-class-evaluations?page=${page}&limit=${limit}`);
        if (res.data.success) {
            setEvaluations(res.data.data);
            setTotalItems(res.data.total || 0);
        }
      } else if (activeTab === 'session_audit') {
        const res = await api.get(`/aoe/faculty-checks?page=${page}&limit=${limit}`);
        if (res.data.success) {
            setSessions(res.data.data);
            setTotalItems(res.data.total || 0);
        }
      } else {
        const res = await api.get(`/aoe/faculty-logs-pending?page=${page}&limit=${limit}`);
        if (res.data.success) {
          setPendingLogs(res.data.data);
          setTotalItems(res.data.total || 0);
        }
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  const handleAddCheck = async sessionId => {
    try {
      await api.post(`/aoe/sessions/${sessionId}/check`);
      setSessions(prev => prev.map(s => {
        if (s.session_id === sessionId) {
          return {
            ...s,
            check_count: (s.check_count || 0) + 1
          };
        }
        return s;
      }));
      toast.success('Session audit marked as checked');
    } catch (error) {
      toast.error("Audit verification failed");
    }
  };
  const handleRemoveCheck = async sessionId => {
    try {
      await api.delete(`/aoe/sessions/${sessionId}/uncheck`);
      setSessions(prev => prev.map(s => {
        if (s.session_id === sessionId && s.check_count > 0) {
          return {
            ...s,
            check_count: s.check_count - 1
          };
        }
        return s;
      }));
      toast.success('Audit verification removed');
    } catch (error) {
      toast.error("Failed to remove verification");
    }
  };
  const fetchFaculties = async () => {
    try {
      const res = await api.get('/aoe/faculties');
      if (res.data.success) {
        setFaculties(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };
  const handleEvalSubmit = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/aoe/live-class-evaluations', evalForm);
      if (res.data.success) {
        toast.success('Evaluation Submitted');
        setIsEvalModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting evaluation');
    }
  };
  const handleVerifySubmit = async e => {
    e.preventDefault();
    try {
      const res = await api.put(`/aoe/faculty-logs/${verifyForm.id}/verify`, {
        verification_status: verifyForm.verification_status,
        verification_remarks: verifyForm.verification_remarks
      });
      if (res.data.success) {
        toast.success('Verification Complete');
        setIsVerifyModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error verifying log');
    }
  };
  return <div className="space-y-10 pb-20">
 {/* Header */}
 <div className="bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Institutional Audit Hub</h2>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
 <ShieldAlert size={14} className="text-[#008080]" />
 Comprehensive Quality Control & Verification
 </p>
 </div>
 <div className="flex flex-wrap gap-3">
 <TabButton active={activeTab === 'live_class'} onClick={() => setActiveTab('live_class')} label="Live Class Audit" />
 <TabButton active={activeTab === 'faculty_logs'} onClick={() => setActiveTab('faculty_logs')} label="Log Verification" />
 <TabButton active={activeTab === 'session_audit'} onClick={() => setActiveTab('session_audit')} label="Session Compliance" />

 {activeTab === 'live_class' && <button onClick={() => setIsEvalModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200">
 <Plus size={16} /> New Eval
 </button>}
 </div>
 </div>

 {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div></div> : <>
 {/* Session Audit Content */}
 {activeTab === 'session_audit' && <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="w-full overflow-x-auto">
<table className="hidden md:table w-full text-left border-collapse min-w-max">
 <thead>
 <tr className="bg-slate-50/50 border-b border-slate-100">
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Faculty Member</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Session Date</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Chapter / Topic</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Audit Track</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Audit Status</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Verification</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {sessions.map((session, index) => {
                const isChecked = session.check_count > 0;
                return <tr key={`${session.session_id}-${session.student_id}`} className={`group transition-all ${isChecked ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="px-4 md:px-8 py-6">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${isChecked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
 {session.faculty_name?.charAt(0)}
 </div>
 <span className="font-bold text-slate-700">{session.faculty_name}</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 text-xs font-bold text-slate-500 ">
 {new Date(session.date).toLocaleDateString()}
 </td>
 <td className="px-4 md:px-8 py-6">
 <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{session.chapter}</p>
 <p className="text-[10px] text-slate-600 font-bold max-w-[200px] truncate">{session.topics_covered}</p>
 </td>
 <td className="px-4 md:px-8 py-6">
 <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{session.student_name}</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-[#008080] rounded-full" style={{
                          width: `${Math.min(session.total_verified_for_student / 30 * 100, 100)}%`
                        }}></div>
 </div>
 <span className="text-[9px] font-black text-[#008080] uppercase ">{session.total_verified_for_student}/30 Audited</span>
 </div>
 </td>
 <td className="px-4 md:px-8 py-6 text-center">
 {isChecked ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
 <Check size={10} /> Verified
 </span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">
 <Target size={10} /> Pending
 </span>}
 </td>
 <td className="px-4 md:px-8 py-6 text-right">
 <div className="flex items-center justify-end gap-2">
 <button onClick={() => handleAddCheck(session.session_id)} className={`p-2.5 rounded-xl border transition-all ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 text-slate-600 hover:text-[#008080] hover:border-[#008080] shadow-sm'}`}>
 <Check size={18} />
 </button>
 {isChecked && <button onClick={() => handleRemoveCheck(session.session_id)} className="p-2.5 rounded-xl bg-white border border-rose-100 text-rose-500 hover:bg-rose-50" title="Undo Verification">
 <RotateCcw size={18} />
 </button>}
 </div>
 </td>
 </tr>;
              })}
 {sessions.length === 0 && <tr><td colSpan="6" className="px-4 md:px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">No sessions found for audit.</td></tr>}
 </tbody>
 </table>
 <div className="md:hidden flex flex-col gap-4 p-4">
   {sessions.map((session, index) => {
     const isChecked = session.check_count > 0;
     return (
       <MobileCard
         key={`${session.session_id}-${session.student_id}`}
         title={session.faculty_name || 'Unknown'}
         subtitle={`${new Date(session.date).toLocaleDateString()} | ${session.chapter}`}
         status={isChecked ? 'Verified' : 'Pending'}
         statusColor={isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}
         action={
           <div className="flex gap-2">
             <button onClick={() => handleAddCheck(session.session_id)} className={`p-3 rounded-xl border transition-all ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-[#008080]'}`}>
               <Check size={18} />
             </button>
             {isChecked && <button onClick={() => handleRemoveCheck(session.session_id)} className="p-3 rounded-xl bg-white border border-rose-100 text-rose-500">
               <RotateCcw size={18} />
             </button>}
           </div>
         }
         data={[
           { label: 'Topics', value: session.topics_covered || 'N/A' },
           { label: 'Student', value: session.student_name || 'N/A' },
           { label: 'Audited', value: `${session.total_verified_for_student}/30` }
         ]}
       />
     );
   })}
   {sessions.length === 0 && <p className="text-center text-slate-500 py-5 md:py-10">No sessions found</p>}
 </div>
</div>
 </div>}

 {/* Live Class Content */}
 {activeTab === 'live_class' && <div className="space-y-6">
 {evaluations.length === 0 ? <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center shadow-sm">
 <ShieldAlert size={48} className="mx-auto text-slate-300 mb-6" />
 <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">No Live Classes Evaluated</h3>
 <p className="text-slate-600 font-bold text-sm">Start by clicking "New Evaluation".</p>
 </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {evaluations.map(ev => <div key={ev.id} className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 relative group">
 <div className="flex justify-between items-start mb-6">
 <div>
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Faculty Name</span>
 <h3 className="text-xl font-black text-slate-900">{ev.faculty_name}</h3>
 </div>
 <div className="bg-[#008080]/10 text-[#008080] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
 {new Date(ev.class_date).toLocaleDateString()}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
 <MetricItem label="Joined Class" value={ev.joined_class} />
 <MetricItem label="Faculty Active" value={ev.faculty_active} />
 <MetricItem label="Interactive" value={ev.interactive} />
 <MetricItem label="Faculty Camera" value={ev.faculty_camera_on} />
 <MetricItem label="Student Camera" value={ev.student_camera_on} />
 <MetricItem label="Screen Sharing" value={ev.screen_sharing} />
 <MetricItem label="Pro Background" value={ev.faculty_background} />
 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
 <span className="text-[10px] font-bold text-slate-500 uppercase">Energy</span>
 <span className="text-[10px] font-black text-[#008080] bg-[#008080]/10 px-2 py-0.5 rounded-md">{ev.energy_level}/5</span>
 </div>
 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
 <span className="text-[10px] font-bold text-slate-500 uppercase">Interaction</span>
 <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{ev.student_interaction_level}/5</span>
 </div>
 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
 <span className="text-[10px] font-bold text-slate-500 uppercase">Check Via</span>
 <span className="text-[10px] font-black text-slate-900 ">{ev.check_method}</span>
 </div>
 </div>
 {ev.remarks && <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Remarks</span>
 <p className="text-xs font-bold text-slate-700 ">"{ev.remarks}"</p>
 </div>}
 {ev.proof_url && <a href={ev.proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-[#008080] uppercase hover:underline">
 <Eye size={12} /> View Screenshot Proof
 </a>}
 </div>)}
 </div>}
 </div>}

 {/* Faculty Logs Review Content */}
 {activeTab === 'faculty_logs' && <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
 <div className="w-full overflow-x-auto">
<table className="hidden md:table w-full text-left border-collapse min-w-max">
 <thead>
 <tr className="bg-slate-50/50 border-b border-slate-100">
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Date / Session</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Faculty / Student</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Class Progress</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Verification</th>
 <th className="px-4 md:px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {pendingLogs.map((log, index) => <tr key={log.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
 <td className="px-4 md:px-8 py-6">
 <p className="text-sm font-black text-slate-900">{new Date(log.date).toLocaleDateString()}</p>
 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sess: {log.session_number}</p>
 </td>
 <td className="px-4 md:px-8 py-6">
 <p className="text-sm font-bold text-slate-700">{log.faculty_name || 'N/A'}</p>
 <p className="text-xs font-bold text-[#008080] mt-1">{log.student_name || 'N/A'}</p>
 </td>
 <td className="px-4 md:px-8 py-6 max-w-xs">
 <p className="text-xs font-bold text-slate-700 truncate"><span className="text-slate-600">Chap:</span> {log.chapter}</p>
 <p className="text-xs font-bold text-slate-700 truncate mt-1"><span className="text-slate-600">Topics:</span> {log.topics_covered}</p>
 </td>
 <td className="px-4 md:px-8 py-6">
 {log.verification_status === 'Pending' ? <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">Pending</span> : log.verification_status === 'Verified' ? <div className="flex flex-col gap-1">
 <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 inline-block w-max">Verified</span>
 {log.verification_remarks && <p className="text-[10px] text-slate-500 max-w-[150px] truncate">{log.verification_remarks}</p>}
 </div> : <div className="flex flex-col gap-1">
 <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 inline-block w-max">Rejected</span>
 {log.verification_remarks && <p className="text-[10px] text-slate-500 max-w-[150px] truncate">{log.verification_remarks}</p>}
 </div>}
 </td>
 <td className="px-4 md:px-8 py-6 text-right">
 <button onClick={() => {
                    setVerifyForm({
                      id: log.id,
                      verification_status: log.verification_status === 'Pending' ? 'Verified' : log.verification_status,
                      verification_remarks: log.verification_remarks || ''
                    });
                    setIsVerifyModalOpen(true);
                  }} className="inline-flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#008080] hover:border-[#008080] hover:bg-[#008080]/10 shadow-sm transition-all">
 <CheckCircle size={18} />
 </button>
 </td>
 </tr>)}
 {pendingLogs.length === 0 && <tr><td colSpan="5" className="px-4 md:px-8 py-20 text-center text-slate-600 font-bold">No daily logs found.</td></tr>}
 </tbody>
 </table>
 <div className="md:hidden flex flex-col gap-4 p-4">
   {pendingLogs.map((log) => (
     <MobileCard
       key={log.id}
       title={log.faculty_name || 'N/A'}
       subtitle={`${new Date(log.date).toLocaleDateString()} | Sess: ${log.session_number}`}
       status={log.verification_status}
       statusColor={log.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : log.verification_status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}
       action={
         <button onClick={() => {
           setVerifyForm({
             id: log.id,
             verification_status: log.verification_status === 'Pending' ? 'Verified' : log.verification_status,
             verification_remarks: log.verification_remarks || ''
           });
           setIsVerifyModalOpen(true);
         }} className="p-3 rounded-xl border border-slate-200 text-slate-600 bg-white">
           <CheckCircle size={18} />
         </button>
       }
       data={[
         { label: 'Student', value: log.student_name || 'N/A' },
         { label: 'Chapter', value: log.chapter || 'N/A' },
         { label: 'Remarks', value: log.verification_remarks || 'None' }
       ]}
     />
   ))}
   {pendingLogs.length === 0 && <p className="text-center text-slate-500 py-5 md:py-10">No daily logs found</p>}
 </div>
</div>
 </div>}
 {totalItems > 0 && (
   <Pagination
     currentPage={page}
     totalItems={totalItems}
     itemsPerPage={limit}
     onPageChange={setPage}
   />
 )}
 </>}

 {/* Live Class Eval Modal */}
 {isEvalModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-[#008080]/60 backdrop-blur-sm max-h-[90vh] overflow-y-auto" onClick={() => setIsEvalModalOpen(false)}></div>
 <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden relative z-10 animate-in zoom-in duration-300">
 <div className="px-5 md:px-10 py-4 md:py-8 bg-[#008080] text-white relative">
 <h3 className="text-2xl font-black tracking-tighter uppercase relative z-10">Live Class Check</h3>
 </div>
 <form onSubmit={handleEvalSubmit} className="p-5 md:p-10 space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="col-span-2 md:col-span-1">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Check Method</label>
 <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]" value={evalForm.check_method} onChange={e => setEvalForm({
                ...evalForm,
                check_method: e.target.value
              })}>
 <option value="Link">Joined via Meet Link</option>
 <option value="Direct">Physical/Direct Room Check</option>
 <option value="CCTV">Monitoring via CCTV</option>
 </select>
 </div>
 <div className="col-span-2 md:col-span-1">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Class Date</label>
 <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]" value={evalForm.class_date} onChange={e => setEvalForm({
                ...evalForm,
                class_date: e.target.value
              })} />
 </div>
 <div className="col-span-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Target Faculty</label>
 <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]" value={evalForm.faculty_id} onChange={e => setEvalForm({
                ...evalForm,
                faculty_id: e.target.value
              })}>
 <option value="">-- Choose Faculty Member --</option>
 {faculties.map(f => <option key={f.id} value={f.id || f.user_id}>{f.name}</option>)}
 </select>
 </div>
 </div>

 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
 <CheckboxItem label="Student Camera ON" checked={evalForm.student_camera_on} onChange={v => setEvalForm({
              ...evalForm,
              student_camera_on: v
            })} />
 <CheckboxItem label="Faculty Camera ON" checked={evalForm.faculty_camera_on} onChange={v => setEvalForm({
              ...evalForm,
              faculty_camera_on: v
            })} />
 <CheckboxItem label="Screen Sharing ON" checked={evalForm.screen_sharing} onChange={v => setEvalForm({
              ...evalForm,
              screen_sharing: v
            })} />
 <CheckboxItem label="Professional BG" checked={evalForm.faculty_background} onChange={v => setEvalForm({
              ...evalForm,
              faculty_background: v
            })} />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 block">Faculty Energy (1-5)</label>
 <input type="range" min="1" max="5" step="1" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#008080]" value={evalForm.energy_level} onChange={e => setEvalForm({
                ...evalForm,
                energy_level: parseInt(e.target.value)
              })} />
 <div className="flex justify-between px-1"><span className="text-[9px] font-bold text-slate-600">Low</span><span className="text-[10px] font-black text-[#008080]">{evalForm.energy_level}</span><span className="text-[9px] font-bold text-slate-600">High</span></div>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 block">Student Interaction (1-5)</label>
 <input type="range" min="1" max="5" step="1" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={evalForm.student_interaction_level} onChange={e => setEvalForm({
                ...evalForm,
                student_interaction_level: parseInt(e.target.value)
              })} />
 <div className="flex justify-between px-1"><span className="text-[9px] font-bold text-slate-600">Bored</span><span className="text-[10px] font-black text-emerald-600">{evalForm.student_interaction_level}</span><span className="text-[9px] font-bold text-slate-600">Active</span></div>
 </div>
 </div>

 <div>
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Proof / Screenshot URL (Optional)</label>
 <input type="text" placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080]" value={evalForm.proof_url} onChange={e => setEvalForm({
              ...evalForm,
              proof_url: e.target.value
            })} />
 </div>
 <div>
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Remarks</label>
 <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#008080] min-h-[100px]" value={evalForm.remarks} placeholder="Add notes..." onChange={e => setEvalForm({
              ...evalForm,
              remarks: e.target.value
            })}></textarea>
 </div>
 <div className="flex gap-4 pt-4">
 <button type="submit" className="flex-1 bg-[#008080] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#008080]/30 hover:bg-[#008080] transition-all">Save Evaluation</button>
 <button type="button" onClick={() => setIsEvalModalOpen(false)} className="flex-1 bg-white text-slate-600 py-4 rounded-2xl border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
 </div>
 </form>
 </div>
 </div>}

 {/* Verify Log Modal */}
 {isVerifyModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-[#008080]/60 backdrop-blur-sm max-h-[90vh] overflow-y-auto" onClick={() => setIsVerifyModalOpen(false)}></div>
 <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden relative z-10 animate-in zoom-in duration-300">
 <div className="px-5 md:px-10 py-4 md:py-8 bg-[#008080] text-white relative">
 <h3 className="text-2xl font-black tracking-tighter uppercase relative z-10">Verify Faculty Log</h3>
 </div>
 <form onSubmit={handleVerifySubmit} className="p-5 md:p-10 space-y-6">
 <div>
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Verification Status</label>
 <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-50" value={verifyForm.verification_status} onChange={e => setVerifyForm({
              ...verifyForm,
              verification_status: e.target.value
            })}>
 <option value="Pending">Pending</option>
 <option value="Verified">Verified Correctly</option>
 <option value="Rejected">Rejected/Needs Revision</option>
 </select>
 </div>
 <div>
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2 mb-2 block">Manager Remarks</label>
 <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-50 min-h-[120px]" value={verifyForm.verification_remarks} placeholder="Write your remarks after checking logs..." required={verifyForm.verification_status === 'Rejected'} onChange={e => setVerifyForm({
              ...verifyForm,
              verification_remarks: e.target.value
            })}></textarea>
 </div>
 <div className="flex gap-4 pt-4">
 <button type="submit" className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all">Save Status</button>
 <button type="button" onClick={() => setIsVerifyModalOpen(false)} className="px-6 bg-white text-slate-600 rounded-2xl border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
 </div>
 </form>
 </div>
 </div>}
 </div>;
};
const MetricItem = ({
  label,
  value
}) => <div className="flex items-center justify-between border-b border-slate-50 pb-2">
 <span className="text-xs font-bold text-slate-500">{label}</span>
 {value ? <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md"><Check size={12} /> Yes</span> : <span className="text-[10px] font-black uppercase text-slate-300">No</span>}
 </div>;
const CheckboxItem = ({
  label,
  checked,
  onChange
}) => <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-[#008080]/10/50 transition-all" onClick={() => onChange(!checked)}>
 <span className="text-xs font-bold text-slate-700">{label}</span>
 <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${checked ? 'bg-[#008080] text-white' : 'bg-slate-200'}`}>
 {checked && <Check size={14} />}
 </div>
 </div>;
const TabButton = ({
  active,
  onClick,
  label
}) => <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
 {label}
 </button>;
export default CheckingSection;