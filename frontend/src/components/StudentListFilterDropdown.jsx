import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

export const STUDENT_SORT_OPTIONS = [
 { value: '', label: 'Default order' },
 { value: 'join_oldest', label: 'Join date: Oldest first' },
 { value: 'join_newest', label: 'Join date: Newest first' },
 { value: 'active_first', label: 'Active students first' },
 { value: 'inactive_first', label: 'Inactive students first' },
];

const StudentListFilterDropdown = ({ value, onChange, options = STUDENT_SORT_OPTIONS, className='' }) => {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);

 useEffect(() => {
 const handleClickOutside = (e) => {
 if (ref.current && !ref.current.contains(e.target)) setOpen(false);
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const currentLabel = options.find((o) => o.value === value)?.label || 'Filter';

 return (
 <div className={`relative ${className}`} ref={ref}>
 <button
 type="button"
 onClick={() => setOpen((o) => !o)}
 className="w-full sm:w-auto min-h-[48px] flex items-center justify-between sm:justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
 >
 <Filter size={18} className="text-slate-400" />
 <span>{value ? currentLabel : 'Filter'}</span>
 <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
 </button>
 {open && (
 <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 min-w-[220px] max-w-[90vw] max-h-[60vh] sm:max-w-none overflow-y-auto py-1.5 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50">
 {options.map((opt) => (
 <button
 key={opt.value || 'default'}
 type="button"
 onClick={() => {
 onChange(opt.value);
 setOpen(false);
 }}
 className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors whitespace-normal break-words ${opt.value === value ? 'bg-[#008080]/10 text-[#008080]' : 'text-slate-700 hover:bg-slate-50'}`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 )}
 </div>
 );
};

/** Sort a list of students by the given sort option. Students should have created_at and status (or onboarding_status for mentor). */
export function sortStudentsByOption(list, sortOption) {
 if (!sortOption || !Array.isArray(list)) return list;
 const arr = [...list];
 const getDate = (s) => (s.created_at ? new Date(s.created_at).getTime() : 0);
 const isActive = (s) => (s.status || '').toLowerCase() === 'active' || (s.onboarding_status || '').toLowerCase() === 'completed';
 switch (sortOption) {
 case 'join_oldest':
 return arr.sort((a, b) => getDate(a) - getDate(b));
 case 'join_newest':
 return arr.sort((a, b) => getDate(b) - getDate(a));
 case 'active_first':
 return arr.sort((a, b) => (isActive(b) ? 1 : 0) - (isActive(a) ? 1 : 0));
 case 'inactive_first':
 return arr.sort((a, b) => (isActive(a) ? 1 : 0) - (isActive(b) ? 1 : 0));
 default:
 return arr;
 }
}

export default StudentListFilterDropdown;
