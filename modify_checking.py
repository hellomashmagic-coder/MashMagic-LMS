import re

file_path = "frontend/src/pages/AOE/CheckingSection.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
imports = """import Pagination from '../../components/common/Pagination';
import MobileCard from '../../components/common/MobileCard';
import { CheckCircle, Eye, ShieldAlert, MessageSquare, Plus, Check, Target, RotateCcw, User, Calendar, BookOpen, Clock, AlertTriangle } from 'lucide-react';"""
content = re.sub(r"import \{ CheckCircle.*?lucide-react';", imports, content)

# 2. State
state_updates = """  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedId, setExpandedId] = useState(null);"""
content = content.replace("  const [loading, setLoading] = useState(true);", state_updates)

# 3. useEffects
old_use_effect = """  useEffect(() => {
    fetchData();
    fetchFaculties();
  }, [activeTab]);"""
new_use_effect = """  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    fetchFaculties();
  }, [activeTab, page]);"""
content = content.replace(old_use_effect, new_use_effect)

# 4. fetchData
old_fetch = """  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'live_class') {
        const res = await api.get('/aoe/live-class-evaluations');
        if (res.data.success) setEvaluations(res.data.data);
      } else if (activeTab === 'session_audit') {
        const res = await api.get('/aoe/faculty-checks');
        if (res.data.success) setSessions(res.data.data);
      } else {
        const res = await api.get('/aoe/faculty-logs-pending');
        if (res.data.success) {
          setPendingLogs(res.data.data);
        }
      }
    } catch (error) {"""
new_fetch = """  const fetchData = async () => {
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
    } catch (error) {"""
content = content.replace(old_fetch, new_fetch)

# 5. Session Audit Table update
old_session_table = """        {activeTab === 'session_audit' && <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
new_session_table = """        {activeTab === 'session_audit' && <div className="space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hidden md:block">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
content = content.replace(old_session_table, new_session_table)

old_session_end = """            </table>
          </div>
        </div>}"""
new_session_end = """            </table>
          </div>
        </div>
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
          {sessions.length > 0 ? sessions.map((session) => {
              const isChecked = session.check_count > 0;
              return (
                  <MobileCard
                      key={`${session.session_id}-${session.student_id}`}
                      isExpanded={expandedId === `${session.session_id}-${session.student_id}`}
                      onToggle={() => setExpandedId(expandedId === `${session.session_id}-${session.student_id}` ? null : `${session.session_id}-${session.student_id}`)}
                      avatar={
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase shadow-inner ${isChecked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              {session.faculty_name?.charAt(0) || <User size={16} />}
                          </div>
                      }
                      title={
                          <span className="flex items-center gap-1 text-slate-900 font-bold">
                              {session.faculty_name}
                          </span>
                      }
                      subtitle={
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                              <Calendar size={10} /> {new Date(session.date).toLocaleDateString()}
                          </span>
                      }
                      content={
                          <div className="flex flex-col gap-3 mt-3">
                              <div className="pt-2 border-t border-slate-100 flex justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student</span>
                                  <span className="text-xs text-slate-700 font-bold">{session.student_name}</span>
                              </div>
                              <div className="pt-2 border-t border-slate-100">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Topic / Chapter</span>
                                  <p className="text-xs text-slate-700 font-bold">{session.chapter}</p>
                                  <p className="text-[10px] text-slate-500">{session.topics_covered}</p>
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Audit Status</span>
                                  {isChecked ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                      <Check size={10} /> Verified
                                  </span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                      <Target size={10} /> Pending
                                  </span>}
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Audit Track</span>
                                   <span className="text-[9px] font-black text-[#008080] uppercase ">{session.total_verified_for_student}/30 Audited</span>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                                   <button onClick={() => handleAddCheck(session.session_id)} className={`flex-1 p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
                                      <Check size={14} /> Verify
                                   </button>
                                   {isChecked && <button onClick={() => handleRemoveCheck(session.session_id)} className="p-3 rounded-xl bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center" title="Undo Verification">
                                      <RotateCcw size={14} />
                                   </button>}
                              </div>
                          </div>
                      }
                  />
              );
          }) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">No sessions found for audit.</span>
              </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={Math.ceil(totalItems / limit)} onPageChange={setPage} />
        </div>}"""
content = content.replace(old_session_end, new_session_end)

# 6. Live Class Table Update
old_live_table = """        {activeTab === 'live_class' && <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
new_live_table = """        {activeTab === 'live_class' && <div className="space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hidden md:block">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
content = content.replace(old_live_table, new_live_table)

old_live_end = """                      </a>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}"""
new_live_end = """                      </a>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
        {evaluations.length > 0 ? evaluations.map((ev) => (
            <MobileCard
                key={ev.id}
                isExpanded={expandedId === `ev-${ev.id}`}
                onToggle={() => setExpandedId(expandedId === `ev-${ev.id}` ? null : `ev-${ev.id}`)}
                avatar={
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase shadow-inner bg-[#008080]/10 text-[#008080]">
                        {ev.faculty_name?.charAt(0) || <User size={16} />}
                    </div>
                }
                title={
                    <span className="flex items-center gap-1 text-slate-900 font-bold">
                        {ev.faculty_name}
                    </span>
                }
                subtitle={
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <Calendar size={10} /> {new Date(ev.date).toLocaleDateString()}
                    </span>
                }
                content={
                    <div className="flex flex-col gap-3 mt-3">
                        <div className="pt-2 border-t border-slate-100 flex justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student</span>
                            <span className="text-xs text-slate-700 font-bold">{ev.student_name}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                            <p className="text-xs text-slate-700 font-bold">{ev.subject}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Feedback</span>
                             <p className="text-xs text-slate-700 font-medium line-clamp-2">{ev.feedback}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Rating</span>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-xs">
                                {ev.rating}/5
                            </span>
                        </div>
                        {ev.video_link && (
                            <div className="pt-3 border-t border-slate-100 flex justify-end">
                                <a href={ev.video_link} target="_blank" rel="noopener noreferrer" className="p-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    <Eye size={14} /> Watch Session
                                </a>
                            </div>
                        )}
                    </div>
                }
            />
        )) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500">No evaluations found.</span>
            </div>
        )}
      </div>
      <Pagination currentPage={page} totalPages={Math.ceil(totalItems / limit)} onPageChange={setPage} />
      </div>}"""
content = content.replace(old_live_end, new_live_end)

# 7. Faculty Logs Table update
old_logs_table = """        {activeTab === 'faculty_logs' && <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
new_logs_table = """        {activeTab === 'faculty_logs' && <div className="space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hidden md:block">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">"""
content = content.replace(old_logs_table, new_logs_table)

old_logs_end = """            </table>
          </div>
        </div>}
      </>}"""
new_logs_end = """            </table>
          </div>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
          {pendingLogs.length > 0 ? pendingLogs.map((log) => (
              <MobileCard
                  key={log.id}
                  isExpanded={expandedId === `log-${log.id}`}
                  onToggle={() => setExpandedId(expandedId === `log-${log.id}` ? null : `log-${log.id}`)}
                  avatar={
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase shadow-inner bg-[#008080]/10 text-[#008080]">
                          <User size={16} />
                      </div>
                  }
                  title={
                      <span className="flex flex-col">
                          <span className="text-slate-900 font-bold">{log.faculty_name || 'N/A'}</span>
                          <span className="text-xs text-[#008080]">{log.student_name || 'N/A'}</span>
                      </span>
                  }
                  subtitle={
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                          <Calendar size={10} /> {new Date(log.date).toLocaleDateString()}
                          <span className="mx-1">•</span>
                          Sess: {log.session_number}
                      </span>
                  }
                  content={
                      <div className="flex flex-col gap-3 mt-3">
                          <div className="pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chapter & Topics</span>
                              <p className="text-xs text-slate-700 font-bold"><span className="text-slate-600 font-normal">Chap:</span> {log.chapter}</p>
                              <p className="text-xs text-slate-700 font-bold"><span className="text-slate-600 font-normal">Topics:</span> {log.topics_covered}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-start">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                              {log.verification_status === 'Pending' ? (
                                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">Pending</span>
                              ) : log.verification_status === 'Verified' ? (
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">Verified</span>
                                      {log.verification_remarks && <p className="text-[9px] text-slate-500">{log.verification_remarks}</p>}
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100">Rejected</span>
                                      {log.verification_remarks && <p className="text-[9px] text-slate-500">{log.verification_remarks}</p>}
                                  </div>
                              )}
                          </div>
                          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                               <button onClick={(e) => {
                                   e.stopPropagation();
                                   setVerifyForm({
                                     id: log.id,
                                     verification_status: log.verification_status === 'Pending' ? 'Verified' : log.verification_status,
                                     verification_remarks: log.verification_remarks || ''
                                   });
                                   setIsVerifyModalOpen(true);
                               }} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest shadow-sm hover:text-[#008080] hover:border-[#008080] hover:bg-[#008080]/10 transition-all flex items-center justify-center gap-2">
                                   <CheckCircle size={14} /> Review Log
                               </button>
                          </div>
                      </div>
                  }
              />
          )) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">No daily logs found.</span>
              </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={Math.ceil(totalItems / limit)} onPageChange={setPage} />
        </div>}
      </>}"""
content = content.replace(old_logs_end, new_logs_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CheckingSection.jsx successfully.")
