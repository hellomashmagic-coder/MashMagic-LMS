import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

const MobileCard = ({
  isExpanded,
  onToggle,
  avatar,
  title,
  subtitle,
  badges = [],
  metrics = [],
  expandedContent,
  primaryActions = [],
  moreActions = []
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="bg-white rounded-[20px] border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Collapsed Header - Clickable for expand */}
      <div 
        className="p-4 sm:p-5 cursor-pointer hover:bg-slate-50 transition-colors relative"
        onClick={(e) => {
          // Prevent toggle if clicking on menu button or inside menu
          if (menuRef.current && menuRef.current.contains(e.target)) return;
          onToggle();
        }}
      >
        <div className="flex items-start gap-4">
          {/* Avatar Area */}
          {avatar && (
            <div className="shrink-0 pt-0.5">
              {avatar}
            </div>
          )}
          
          {/* Primary Info */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight break-words">{title}</span>
                {subtitle && (
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest break-words mt-0.5">
                    {subtitle}
                  </span>
                )}
              </div>

              {/* Status / Badges - Below title on mobile, right on desktop */}
              {badges.length > 0 && (
                <div className="flex flex-wrap justify-start sm:justify-end gap-1.5 shrink-0 w-full sm:w-auto sm:pl-2 mt-1 sm:mt-0">
                  {badges.map((badge, idx) => (
                    <div key={idx}>{badge}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Metrics Row (e.g. Students, Mentors) */}
            {metrics.length > 0 && (
              <div className="flex items-center gap-3 mt-3 overflow-x-auto no-scrollbar pb-1">
                {metrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {metric.icon && <span className="text-slate-400">{metric.icon}</span>}
                    <span className="text-[10px] font-bold tracking-wider">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expand Indicator */}
        <div className="absolute bottom-4 right-4">
          {expandedContent && (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-100' : 'bg-transparent'}`}>
              {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content with Animation */}
      {isExpanded && expandedContent && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-50 pt-4 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
          
          {/* Custom Expanded Details */}
          <div className="space-y-4 mb-4">
            {expandedContent}
          </div>

          {/* Action Row */}
          {(primaryActions.length > 0 || moreActions.length > 0) && (
            <div className="pt-4 border-t border-slate-100 flex gap-2 relative z-10">
              
              {/* Primary Actions (View, Edit) */}
              {primaryActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (action.onClick) action.onClick(e);
                  }}
                  className={`flex-1 py-3 px-2 min-h-[44px] rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${action.className || 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {action.icon && action.icon}
                  <span className="truncate">{action.label}</span>
                </button>
              ))}

              {/* More Actions (Delete, Suspend) */}
              {moreActions.length > 0 && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(!isMenuOpen);
                    }}
                    className={`w-[44px] h-[44px] rounded-xl border flex items-center justify-center transition-all ${isMenuOpen ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {isMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                      {moreActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            if (action.onClick) action.onClick(e);
                          }}
                          className={`w-full min-h-[44px] p-3 text-[11px] font-bold flex items-center gap-3 transition-colors ${action.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'} ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          {action.icon && action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileCard;
