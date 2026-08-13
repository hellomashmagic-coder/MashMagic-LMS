import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

const PostponeModal = ({ session, onClose, onConfirm }) => {
 const [newDate, setNewDate] = useState('');
 const [facultyCancelled, setFacultyCancelled] = useState(false);

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!newDate) return;
 onConfirm(session.id, newDate, facultyCancelled);
 };

 return (
 <div className="fixed inset-0 bg-[#008080]/50 backdrop-blur-sm flex items-center justify-center p-6 z-[9999]">
 <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-4 md:p-8 border border-white/20 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-xl font-black text-slate-900">Postpone Session</h3>
 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
 <X size={20} />
 </button>
 </div>

 <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Info</p>
 <p className="text-sm font-bold text-slate-700">Topic: {session.chapter_topic || 'Untitled Session'}</p>
 <p className="text-xs text-slate-500">Current Date: {new Date(session.date).toLocaleDateString()}</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Date</label>
 <div className="relative">
 <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="date"
 required
 className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[#008080] focus:border-[#008080] transition-all font-semibold"
 value={newDate}
 onChange={(e) => setNewDate(e.target.value)}
 />
 </div>
 </div>

 <label className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-white hover:border-rose-200 transition-all">
 <input
 type="checkbox"
 className="w-5 h-5 rounded border-2 border-slate-300 text-rose-500 focus:ring-0 transition-all cursor-pointer"
 checked={facultyCancelled}
 onChange={(e) => setFacultyCancelled(e.target.checked)}
 />
 <span className="text-xs font-black text-rose-700 uppercase tracking-widest">Cancelled by Faculty?</span>
 </label>

 <button
 type="submit"
 className="w-full bg-[#008080] text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#008080] transition-all shadow-lg shadow-[#008080]/30"
 >
 Confirm Postpone
 </button>
 </form>
 </div>
 </div>
 );
};

export default PostponeModal;
