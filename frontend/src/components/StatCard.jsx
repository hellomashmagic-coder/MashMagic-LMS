import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon, trend, type = 'default' }) => {
 const isPositive = trend > 0;
 
 return (
 <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] sm:hover:-translate-y-1.5 sm:hover:scale-[1.02] transition-all duration-300 sm:duration-500 group relative overflow-hidden h-full flex flex-col justify-between">
 {/* Subtle Gradient Glow */}
 <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#008080]/5 rounded-full blur-3xl group-hover:bg-[#008080]/10 transition-colors duration-500"></div>
 
 <div className="flex justify-between items-start relative z-10 flex-1">
 <div className="space-y-3 sm:space-y-4 flex-1">
 <div className="space-y-1 sm:space-y-1.5">
 <p className="text-[10px] sm:text-xs font-black text-slate-400 tracking-[0.2em] uppercase leading-none">{title}</p>
 <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{value}</h3>
 </div>
 
 {trend && (
 <div className={`flex items-center gap-1 sm:gap-2 text-[10px] sm:text-[11px] font-black mt-3 sm:mt-4 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl w-fit border shadow-sm transition-all duration-500 ${
 isPositive 
 ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50 group-hover:bg-emerald-100 group-hover:shadow-emerald-200/20' 
 : 'bg-rose-50/50 text-rose-600 border-rose-100/50 group-hover:bg-rose-100 group-hover:shadow-rose-200/20'
 }`}>
 <div className={`transition-transform duration-500 ${isPositive ? 'group-hover:-translate-y-0.5' : 'group-hover:translate-y-0.5'}`}>
 {isPositive ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
 </div>
 <span className="tracking-tight">{Math.abs(trend)}%</span>
 <span className="text-slate-400 font-bold ml-0.5 sm:ml-1 opacity-60 hidden sm:inline">vs last month</span>
 </div>
 )}
 </div>
 
 <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 bg-gradient-to-br from-[#006666]/5 to-[#008080]/10 rounded-[14px] sm:rounded-[18px] flex items-center justify-center text-[#008080] border border-[#008080]/10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-sm ml-2">
 {React.cloneElement(icon, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
 </div>
 </div>
 </div>
 );
};

export default StatCard;
