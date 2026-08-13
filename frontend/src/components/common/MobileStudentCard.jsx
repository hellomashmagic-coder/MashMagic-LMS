import React, { useState } from 'react';
import { 
  ChevronDown, 
  MoreVertical, 
  Clock, 
  UserSquare2,
  Edit2,
  Eye,
  IndianRupee,
  Ban,
  Trash2,
  CalendarDays,
  FileText
} from 'lucide-react';

const MobileStudentCard = ({ 
  student, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onView, 
  onBlock, 
  onDelete,
  onAddFee,
  onAttendance,
  onPaymentHistory
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Helper for generating avatar initials
  const getInitials = (name) => {
    if (!name) return 'S';
    return String(name).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper for status badge styling
  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'inactive': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'blocked': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Helper for level badge styling
  const getLevelStyle = (level) => {
    switch(level) {
      case 'Level 1': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Level 2': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Level 3': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100'; // Unassessed
    }
  };

  const handleToggle = (e) => {
    if (showMoreMenu) setShowMoreMenu(false); // Close menu if clicking card
    onToggle();
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMoreMenu(!showMoreMenu);
  };

  return (
    <div className={`bg-white border rounded-[16px] transition-all duration-300 relative ${isExpanded ? 'border-[#008080]/30 shadow-md shadow-[#008080]/5' : 'border-slate-100 shadow-sm hover:border-slate-200'} mb-3 overflow-hidden`}>
      
      {/* --- Collapsed View --- */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between gap-3 relative z-10 bg-white"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 shrink-0 rounded-[14px] bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shadow-inner">
            {getInitials(student.name)}
          </div>
          
          {/* Main Info */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-sm truncate">{student.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black text-slate-400 tracking-wider">#{student.roll_number || student.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className="text-[10px] font-bold text-slate-500 truncate">{student.grade} • {student.subject || 'All Subjects'}</span>
            </div>
            
            {/* Badges Row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(student.status)}`}>
                {student.status || 'Unknown'}
              </span>
              <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getLevelStyle(student.level || student.badge)}`}>
                {student.level || student.badge || 'Unassessed'}
              </span>
            </div>
          </div>
        </div>

        {/* Expand Icon */}
        <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown size={16} strokeWidth={3} />
        </div>
      </div>

      {/* --- Expanded Accordion View --- */}
      <div 
        className={`transition-all duration-300 ease-in-out bg-slate-50/50 ${isExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        <div className="p-4 space-y-4">
          
          {/* Progress Section */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Progress
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lifetime</span>
                <p className="text-xs font-bold text-[#008080] mt-0.5">{parseFloat(student.total_lifetime_consumed_hours || 0).toFixed(2)} Hrs</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject</span>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{parseFloat(student.consumed_hours || 0).toFixed(2)} Hrs</p>
              </div>
            </div>
          </div>

          {/* Faculty Section */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <UserSquare2 size={12} /> Personnel
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned Faculty</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate block">
                    {student.faculty ? String(student.faculty).split(',').map(f => f.trim()).join(', ') : 'No Faculty'}
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mentor</span>
                <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{student.mentor || student.mentorName || 'Unassigned'}</p>
              </div>
            </div>
          </div>

          {/* Fee Section */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <IndianRupee size={12} /> Fees
            </h4>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid / Total</span>
                <p className="text-xs font-bold text-slate-700 mt-0.5">₹{student.total_paid || 0} / ₹{student.total_fees || 0}</p>
              </div>
              {onAddFee && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddFee(student); }}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                >
                  + Add Fee
                </button>
              )}
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex items-center gap-2 pt-2 relative">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(student); }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors h-[44px]"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
            
            {/* 3-Dot More Menu */}
            <div className="relative">
              <button 
                onClick={toggleMenu}
                className={`w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-colors ${showMoreMenu ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <MoreVertical size={18} />
              </button>

              {/* Dropdown Menu */}
              {showMoreMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }}
                  ></div>
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-right">
                    <div className="py-1 flex flex-col">
                      {onView && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); onView(student); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 h-[44px]"
                        >
                          <Eye size={16} className="text-slate-400 shrink-0" /> View Profile
                        </button>
                      )}
                      
                      {onAttendance && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); onAttendance(student); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 h-[44px]"
                        >
                          <CalendarDays size={16} className="text-slate-400 shrink-0" /> Attendance
                        </button>
                      )}

                      {onPaymentHistory && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); onPaymentHistory(student); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 h-[44px]"
                        >
                          <FileText size={16} className="text-slate-400 shrink-0" /> Payment History
                        </button>
                      )}

                      {onBlock && student.status !== 'blocked' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); onBlock(student); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-3 border-t border-slate-50 h-[44px]"
                        >
                          <Ban size={16} className="text-amber-500 shrink-0" /> Block Student
                        </button>
                      )}

                      {onDelete && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); onDelete(student); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 h-[44px]"
                        >
                          <Trash2 size={16} className="text-rose-500 shrink-0" /> Delete Student
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MobileStudentCard;
