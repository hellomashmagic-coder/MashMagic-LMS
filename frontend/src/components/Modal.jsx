import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
 if (!isOpen) return null;

 const sizes = {
 sm: 'max-w-md',
 md: 'max-w-2xl',
 lg: 'max-w-4xl',
 xl: 'max-w-6xl'
 };

 return (
 <div
 className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center sm:p-4 bg-[#008080]/40 backdrop-blur-md animate-in fade-in duration-500"
 onClick={onClose}
 >
 <div
 className={`bg-white/95 backdrop-blur-2xl w-full ${sizes[size]} rounded-t-[32px] sm:rounded-b-[32px] sm:rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden border border-white/60 relative`}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Decorative Accent */}
 <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#006666] via-[#008080] to-[#F59E0B]/20"></div>
 
 {/* Mobile drag handle indicator */}
 <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden"></div>

 <div className="flex items-center justify-between px-5 py-4 md:px-10 md:py-8 border-b border-slate-100/50">
 <div>
 <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none">{title}</h3>
 <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 sm:mt-2">Action required • MashMagic LMS</p>
 </div>
 <button
 className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 rounded-xl sm:rounded-2xl transition-all duration-300 group shadow-sm border border-slate-50 shrink-0"
 onClick={onClose}
 >
 <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-10 custom-scrollbar pb-8 sm:pb-10">
 {children}
 </div>
 </div>
 </div>
 );
};

export default Modal;
