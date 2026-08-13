import React from 'react';

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  totalRecords = 0, 
  onPageChange,
  entityName = "Records"
}) => {
  // Ensure totalPages is at least 1 even if no records
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="p-4 md:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest hidden md:block">
        Total {entityName}: {totalRecords}
      </span>
      <div className="flex items-center justify-between w-full md:w-auto gap-1 sm:gap-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex-1 md:flex-none min-h-[48px] md:min-h-[32px] px-2 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:bg-slate-50 transition-all"
        >
          ← Prev
        </button>
        <button 
          className="flex-1 md:flex-none min-h-[48px] md:min-h-[32px] px-2 sm:px-4 py-2 bg-[#008080] text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#008080]/30 cursor-default"
        >
          Page {currentPage} of {safeTotalPages}
        </button>
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="flex-1 md:flex-none min-h-[48px] md:min-h-[32px] px-2 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:bg-slate-50 transition-all"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default Pagination;
