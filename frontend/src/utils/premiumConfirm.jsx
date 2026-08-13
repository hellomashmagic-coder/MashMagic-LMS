import toast from 'react-hot-toast';
import { AlertCircle, ShieldAlert } from 'lucide-react';

/**
 * Premium Confirmation Toast
 * @param {Function} callback - Function to execute on confirm
 * @param {Object} options - { name, title, message, type }
 */
export const premiumConfirm = (callback, { name = '', title = '', message = '', type = 'danger' } = {}) => {
 const isDanger = type === 'danger';
 const Icon = isDanger ? AlertCircle : ShieldAlert;
 
 const confirmBtnClass = isDanger 
 ? 'bg-rose-600 shadow-rose-200/50 hover:bg-rose-700' 
 : 'bg-gradient-to-br from-[#006666] to-[#008080] shadow-[#008080]/20 hover:shadow-[#008080]/40';
 
 const iconBg = isDanger ? 'bg-rose-50' : 'bg-[#008080]/10';
 const iconColor = isDanger ? 'text-rose-500' : 'text-[#008080]';

 toast.custom((t) => (
 <div
 className={`${
 t.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out zoom-out-95'
 } max-w-sm w-full bg-white/95 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)] rounded-[32px] pointer-events-auto flex flex-col overflow-hidden border border-white/60 duration-300`}
 >
 <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-slate-100 to-transparent opacity-20"></div>
 
 <div className="p-5 md:p-10">
 <div className="flex flex-col items-center text-center gap-6">
 <div className={`w-20 h-20 ${iconBg} rounded-[28px] flex items-center justify-center shadow-inner border border-white/50`}>
 <Icon className={`h-8 w-8 ${iconColor}`} />
 </div>
 <div className="space-y-3">
 <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">
 {title || (isDanger ? 'Critical Decision' : 'Confirm Action')}
 </p>
 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
 {message || `Confirm action for ${name}?`}
 </p>
 </div>
 </div>
 
 <div className="mt-12 grid grid-cols-2 gap-4">
 <button
 onClick={() => toast.dismiss(t.id)}
 className="px-6 py-4 rounded-[20px] bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
 >
 Cancel
 </button>
 <button
 onClick={() => {
 toast.dismiss(t.id);
 callback();
 }}
 className={`px-6 py-4 ${confirmBtnClass} text-white text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all shadow-xl active:scale-95`}
 >
 {isDanger ? 'Confirm' : 'Proceed'}
 </button>
 </div>
 </div>
 </div>
 ), { duration: 60000, position: 'top-center' });
};
