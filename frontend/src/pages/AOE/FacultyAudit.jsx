import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, CheckCircle2, ShieldAlert, RotateCcw, User, BookOpen, UserCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
const FacultyAudit = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchQualityAudits();
  }, []);
  const fetchQualityAudits = async () => {
    try {
      const res = await api.get('/aoe/quality-audits');
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load academic quality audits");
    } finally {
      setLoading(false);
    }
  };
  const handleVerify = async id => {
    try {
      await api.put(`/aoe/quality-audits/${id}/verify`);
      setSessions(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            status: 'Verified'
          };
        }
        return s;
      }));
      toast.success('Audit marked as verified');
    } catch (error) {
      toast.error("Audit verification failed");
    }
  };
  if (loading) return <div className="p-20 text-center">
        <div className="w-16 h-16 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Synchronizing Audit Data...</p>
    </div>;
  return <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="bg-white p-5 md:p-10 rounded-[4rem] border border-slate-100 shadow-sm mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
                <div className="w-12 h-12 bg-[#008080] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#008080]/30 rotate-3">
                    <ShieldAlert size={28} />
                </div>
                Academic Quality Sessions
            </h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Rotating daily institutional audit schedule to ensure academic quality
            </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 rounded-tl-[1.5rem]">Student</th>
                            <th className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">Faculty</th>
                            <th className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">Subject</th>
                            <th className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 text-center">Audit Status</th>
                            <th className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 text-center rounded-tr-[1.5rem]">Verification</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.length === 0 ? <tr>
                                <td colSpan="5" className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                                    No sessions available for audit today.
                                </td>
                            </tr> : sessions.map((session, index) => {
              const isVerified = session.status === 'Verified';
              return <tr key={session.id} className={`group transition-all ${isVerified ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                                        <td className="p-6 border-b border-slate-50">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase ${isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {session.student_name?.charAt(0)}
                                                    </div>
                                                    <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{session.student_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <GraduationCap size={12} className="text-[#008080]" />
                                                    Student Count: <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{session.student_count}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-slate-50">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
                                                    <UserCheck size={14} className="text-slate-400" />
                                                    {session.faculty_name}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <BookOpen size={12} className="text-emerald-500" />
                                                    Faculty Count: <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{session.faculty_count}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-slate-50">
                                            <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest bg-[#008080]/5 px-3 py-1.5 rounded-lg border border-[#008080]/10">
                                                {session.subject}
                                            </span>
                                        </td>
                                        <td className="p-6 border-b border-slate-50 text-center">
                                            {isVerified ? <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100">
                                                    <CheckCircle2 size={12} />
                                                    Verified
                                                </div> : <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <Target size={12} />
                                                    Pending
                                                </div>}
                                        </td>
                                        <td className="p-6 border-b border-slate-50 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleVerify(session.id)} disabled={isVerified} className={`
                                                        flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest border
                                                        ${isVerified ? 'bg-emerald-50 border-emerald-100 text-emerald-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-[#008080] hover:text-[#008080] shadow-sm hover:scale-105 active:scale-95'}
                                                    `}>
                                                    <Target size={14} />
                                                    {isVerified ? 'Done' : 'Audit Verify'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>;
            })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>;
};
export default FacultyAudit;