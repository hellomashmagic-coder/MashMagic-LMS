import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

const FilterDropdown = ({ value, onChange, options, className = '', placeholder = 'Filter' }) => {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);

 useEffect(() => {
 const handleClickOutside = (e) => {
 if (ref.current && !ref.current.contains(e.target)) setOpen(false);
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const currentLabel = options.find((o) => o.value === value)?.label || placeholder;

 return (
 <div className={`relative ${className}`} ref={ref}>
 <button
 type="button"
 onClick={() => setOpen((o) => !o)}
 className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2.5 px-6 py-3.5 bg-white border border-slate-100 rounded-[18px] text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95 group"
 >
 <Filter size={16} className={`transition-transform duration-300 ${open ? 'rotate-12 text-[#008080]' : 'text-slate-400 group-hover:rotate-12'}`} />
 <span>{value ? currentLabel : placeholder}</span>
 <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
 </button>
 {open && (
 <div className="absolute right-0 top-full mt-2.5 z-50 min-w-[200px] py-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
 <div className="px-4 py-2 border-b border-slate-50">
 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{placeholder}</span>
 </div>
 <div className="mt-1">
 {options.map((opt) => (
 <button
 key={opt.value}
 type="button"
 onClick={() => {
 onChange(opt.value);
 setOpen(false);
 }}
 className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
 opt.value === value 
 ? 'bg-[#008080]/10 text-[#008080] border-l-4 border-[#008080]' 
 : 'text-slate-600 hover:bg-slate-50 hover:pl-6'
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
};

export default FilterDropdown;
