import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, CheckCircle, Ban, Trash2, Pencil, Download } from 'lucide-react';
import StudentListFilterDropdown from './StudentListFilterDropdown';
import DatePicker, { DateObject } from "react-multi-date-picker";
import * as XLSX from 'xlsx';
import Pagination from './common/Pagination';

const DataTable = ({
 columns,
 data,
 loading,
 onSearch,
 onFilter,
 onExport,
 onView,
 onApprove,
 onBlock,
 onDelete,
 onEdit,
 onViewFilter,
 onEditFilter,
 onDeleteFilter,
 onApproveFilter,
 onBlockFilter,
 searchPlaceholder = "Search records...",
 filterValue,
 onFilterChange,
 renderSubRow,
 expandedRowId,
 onToggleExpand,
 extraActions = [],
 renderMobileCard,
 // Pagination props
 page,
 totalPages,
 totalRecords,
 onPageChange
}) => {
  const [internalExpandedId, setInternalExpandedId] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState([]);
  const [exportType, setExportType] = useState('all');
 const currentExpandedId = expandedRowId !== undefined ? expandedRowId : internalExpandedId;
 const handleToggle = onToggleExpand || ((id) => setInternalExpandedId(currentExpandedId === id ? null : id));
 const useFilterDropdown = filterValue !== undefined && onFilterChange;
  const hasActions = onView || onEdit || onApprove || onBlock || onDelete || extraActions.length > 0;
  const enhancedColumns = columns || [];

  const handleSmartExport = () => {
    let exportData = [...data];
    if (exportType === 'range' && exportDateRange.length > 0) {
      const start = new Date(exportDateRange[0].format("YYYY-MM-DD"));
      start.setHours(0, 0, 0, 0);
      const end = exportDateRange.length > 1 ? new Date(exportDateRange[1].format("YYYY-MM-DD")) : new Date(start);
      end.setHours(23, 59, 59, 999);

      exportData = exportData.filter(item => {
        // Try common date fields
        const dateStr = item.date || item.createdAt || item.admission_date || item.created_at;
        if (!dateStr) return true; // keep if no date field to filter by

        let itemDate;
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts[0].length === 2 && parts[2]?.length === 4) { // DD-MM-YYYY
                itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                itemDate = new Date(dateStr);
            }
        } else {
            itemDate = new Date(dateStr);
        }
        return itemDate >= start && itemDate <= end;
      });
    }

    if (exportData.length === 0) {
      alert("No data to export for this date range.");
      return;
    }

    if (typeof onExport === 'function') {
      onExport(exportData);
      setShowExportModal(false);
      return;
    }

    // Fallback: Map columns
    const sheetData = exportData.map(item => {
      const row = {};
      enhancedColumns.forEach(col => {
        if (col.header !== 'Actions' && col.header !== 'Profile') {
          let val = item[col.accessor];
          if (typeof val === 'object') val = JSON.stringify(val);
          row[col.header] = val || '';
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, `Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  return (
  <div className="bg-white/70 backdrop-blur-xl rounded-[28px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-500">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 md:p-8 border-b border-slate-100/50 gap-6 w-full">
 <div className="relative w-full lg:w-96 group">
 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-all duration-300" />
 <input
 type="text"
 placeholder={searchPlaceholder}
 onChange={(e) => onSearch && onSearch(e.target.value)}
 className="w-full bg-white/50 border border-slate-100 rounded-[18px] py-3.5 pl-12 pr-5 text-sm font-bold text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080]/20 transition-all shadow-sm placeholder:text-slate-300"
 />
 </div>

  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
  <div className="flex items-center gap-4 px-6 py-3.5 bg-slate-50/50 border border-slate-100 rounded-[18px] mr-2">
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</span>
      <span className="text-sm font-black text-slate-700">{data.length}</span>
    </div>
    <div className="w-px h-6 bg-slate-200"></div>
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Active</span>
      <span className="text-sm font-black text-emerald-600">{data.filter(item => item.status === 'active').length}</span>
    </div>
  </div>

 {onFilter ? (
 typeof onFilter === 'function' && !onFilterChange ? (
 <button
 onClick={onFilter}
 className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white border border-slate-100 rounded-[18px] text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95 group"
 >
 <Filter size={16} className="text-slate-400 group-hover:rotate-12 transition-transform" />
 <span>Filters</span>
 </button>
 ) : (
 onFilter
 )
 ) : null}
 {useFilterDropdown && (
 <StudentListFilterDropdown
 value={filterValue}
 onChange={onFilterChange}
 className="flex-1 lg:flex-none w-full lg:w-auto min-w-[160px]"
 />
 )}
 {onExport && (
 <button
 onClick={() => setShowExportModal(true)}
 className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-4 md:px-8 py-3.5 bg-gradient-to-br from-[#006666] to-[#008080] rounded-[18px] text-[11px] font-black uppercase tracking-[0.2em] text-white hover:shadow-lg hover:shadow-[#008080]/30 hover:-translate-y-0.5 transition-all active:scale-95"
 >
 <Download size={16} />
 <span>Export</span>
 </button>
 )}
 </div>
 </div>

  {/* Export Modal */}
  {showExportModal && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Download className="text-[#008080]" size={20} /> Export Data
          </h3>
          <button 
            onClick={() => setShowExportModal(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
          >
            <Ban size={16} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Export Options</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType('all')}
                className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  exportType === 'all' 
                    ? 'border-[#008080] bg-[#008080]/5 text-[#008080]' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                Export All
              </button>
              <button
                onClick={() => setExportType('range')}
                className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  exportType === 'range' 
                    ? 'border-[#008080] bg-[#008080]/5 text-[#008080]' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                Custom Date Range
              </button>
            </div>
          </div>

          {exportType === 'range' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 Select Date Range
              </label>
              <div className="w-full">
                <DatePicker
                  value={exportDateRange}
                  onChange={setExportDateRange}
                  range
                  format="YYYY/MM/DD"
                  containerClassName="w-full"
                  inputClass="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-[#008080] focus:ring-4 focus:ring-[#008080]/10 outline-none transition-all text-slate-700"
                  placeholder="Select dates..."
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400">If you only want a single date, just click the date twice.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => setShowExportModal(false)}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSmartExport}
            className="px-6 py-2 bg-[#008080] hover:bg-[#006060] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#008080]/20"
          >
            Generate Excel
          </button>
        </div>
      </div>
    </div>
  )}

 {/* Desktop View (Table) */}
 <div className="hidden md:block overflow-x-auto custom-scrollbar">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/40">
 {enhancedColumns.map((col, index) => (
 <th key={index} className="px-4 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100/50" style={{ width: col.width }}>
 {col.header}
 </th>
 ))}
 {hasActions && <th className="px-4 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100/50 text-center">Actions</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100/50">
 {loading ? (
 [...Array(6)].map((_, i) => (
 <tr key={i} className="animate-pulse">
 {enhancedColumns.map((_, j) => (
 <td key={j} className="px-4 md:px-8 py-6"><div className="h-4 bg-slate-100 rounded-[6px] w-full"></div></td>
 ))}
 <td className="px-4 md:px-8 py-6"><div className="h-8 bg-slate-100 rounded-[10px] w-full"></div></td>
 </tr>
 ))
 ) : data.length === 0 ? (
 <tr>
 <td colSpan={enhancedColumns.length + 1} className="px-4 md:px-8 py-24 text-center">
 <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
 <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center border border-slate-100 shadow-inner">
 <Search size={32} className="text-slate-200" />
 </div>
 <div>
 <p className="text-sm font-black text-slate-900 tracking-tight">No match found</p>
 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Try adjusting your filters</p>
 </div>
 </div>
 </td>
 </tr>
 ) : (
 data.map((row, rowIndex) => {
 const isExpanded = currentExpandedId === (row.id !== undefined ? row.id : rowIndex);
 return (
 <React.Fragment key={row.id !== undefined ? row.id : rowIndex}>
 <tr className="group hover:bg-[#F8FAFC]/80 transition-all duration-300">
 {enhancedColumns.map((col, colIndex) => (
 <td key={colIndex} className="px-4 md:px-8 py-6 whitespace-nowrap text-sm text-slate-600 font-bold">
 {col.render ? col.render(row, { isExpanded, onToggle: () => handleToggle(row.id !== undefined ? row.id : rowIndex), index: rowIndex }) : row[col.accessor]}
 </td>
 ))}
 {hasActions && (
 <td className="px-4 md:px-8 py-6 text-center">
 <div className="flex justify-center items-center gap-2">
 {onView && (onViewFilter ? onViewFilter(row) : true) && (
 <button
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#008080] hover:bg-[#008080]/10 rounded-[12px] transition-all hover:scale-110 active:scale-95"
 onClick={() => onView(row)}
 title="View profile"
 >
 <Eye size={18} />
 </button>
 )}

 {onEdit && (onEditFilter ? onEditFilter(row) : true) && (
 <button
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#008080] hover:bg-[#008080]/10 rounded-[12px] transition-all hover:scale-110 active:scale-95"
 onClick={() => onEdit(row)}
 title="Modify data"
 >
 <Pencil size={18} />
 </button>
 )}

 {onApprove && row.status !== 'active' && (onApproveFilter ? onApproveFilter(row) : true) && (
 <button
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-[12px] transition-all hover:scale-110 active:scale-95"
 onClick={() => onApprove(row)}
 title="Authorize access"
 >
 <CheckCircle size={18} />
 </button>
 )}

 {onBlock && row.status !== 'blocked' && (onBlockFilter ? onBlockFilter(row) : true) && (
 <button
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-[12px] transition-all hover:scale-110 active:scale-95"
 onClick={() => onBlock(row)}
 title="Restrict access"
 >
 <Ban size={18} />
 </button>
 )}

 {onDelete && (onDeleteFilter ? onDeleteFilter(row) : true) && (
 <button
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[12px] transition-all hover:scale-110 active:scale-95"
 onClick={() => onDelete(row)}
 title="Terminate account"
 >
 <Trash2 size={18} />
 </button>
 )}
 {extraActions.map((actionFn, i) => (
   <React.Fragment key={`extra-${i}`}>{actionFn(row)}</React.Fragment>
 ))}
 </div>
 </td>
 )}
 </tr>
 {isExpanded && renderSubRow && (
   <tr className="bg-slate-50/80 border-b border-slate-100">
     <td colSpan={enhancedColumns.length + (hasActions ? 1 : 0)} className="p-4 md:p-8">
       {renderSubRow(row, () => handleToggle(row.id !== undefined ? row.id : rowIndex))}
     </td>
   </tr>
 )}
 </React.Fragment>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Mobile View (Cards) */}
 <div className={`md:hidden ${renderMobileCard ? 'p-4 bg-slate-50/30' : 'divide-y divide-slate-100/50'}`}>
 {loading ? (
 [...Array(3)].map((_, i) => (
 <div key={i} className="p-6 space-y-4 animate-pulse">
 <div className="h-4 bg-slate-100 rounded w-3/4"></div>
 <div className="h-4 bg-slate-100 rounded w-1/2"></div>
 <div className="grid grid-cols-2 gap-4 pt-4">
 <div className="h-10 bg-slate-100 rounded-xl"></div>
 <div className="h-10 bg-slate-100 rounded-xl"></div>
 </div>
 </div>
 ))
 ) : data.length === 0 ? (
 <div className="px-4 md:px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No records detected</div>
 ) : (
 data.map((row, rowIndex) => {
 const isExpanded = currentExpandedId === (row.id !== undefined ? row.id : rowIndex);
 
 if (renderMobileCard) {
    return (
      <React.Fragment key={row.id !== undefined ? row.id : rowIndex}>
        {renderMobileCard(row, { isExpanded, onToggle: () => handleToggle(row.id !== undefined ? row.id : rowIndex), index: rowIndex })}
      </React.Fragment>
    );
 }

 return (
 <div key={row.id !== undefined ? row.id : rowIndex} className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
 {/* Primary Info (First Column) */}
 <div className="flex items-center justify-between">
 <div className="flex-1 overflow-hidden">
 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">#{rowIndex + 1} &bull; {columns[0].header}</div>
 <div className="font-bold text-slate-900 truncate">
 {columns[0].render ? columns[0].render(row, { isExpanded, onToggle: () => handleToggle(row.id !== undefined ? row.id : rowIndex), index: rowIndex }) : row[columns[0].accessor]}
 </div>
 </div>
 {onView && (onViewFilter ? onViewFilter(row) : true) && (
 <div className="pl-4">
 <button 
 className="w-10 h-10 flex items-center justify-center bg-[#008080]/10 text-[#008080] rounded-xl"
 onClick={() => onView(row)}
 >
 <Eye size={18} strokeWidth={2.5} />
 </button>
 </div>
 )}
 </div>

 {/* Secondary Details Grid */}
 <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
 {columns.slice(1).map((col, colIndex) => (
 <div key={colIndex} className="overflow-hidden">
 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{col.header}</div>
 <div className="text-[11px] font-black text-slate-700 truncate">
 {col.render ? col.render(row, { isExpanded, onToggle: () => handleToggle(row.id !== undefined ? row.id : rowIndex), index: rowIndex }) : row[col.accessor] || '---'}
 </div>
 </div>
 ))}
 </div>

 {/* Action Row */}
 {(hasActions) && (
 <div className="flex items-center gap-2 pt-4 justify-end">
 {onEdit && (onEditFilter ? onEditFilter(row) : true) && (
 <button className="flex-1 py-3 px-4 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center justify-center gap-2" onClick={() => onEdit(row)}>
 <Pencil size={14} /> Edit
 </button>
 )}
 {onApprove && row.status !== 'active' && (onApproveFilter ? onApproveFilter(row) : true) && (
 <button className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2" onClick={() => onApprove(row)}>
 <CheckCircle size={14} /> Approve
 </button>
 )}
 <div className="flex gap-2">
 {onBlock && row.status !== 'blocked' && (onBlockFilter ? onBlockFilter(row) : true) && (
 <button className="w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl border border-amber-100" onClick={() => onBlock(row)}>
 <Ban size={16} />
 </button>
 )}
 {onDelete && (onDeleteFilter ? onDeleteFilter(row) : true) && (
 <button className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl border border-rose-100" onClick={() => onDelete(row)}>
 <Trash2 size={16} />
 </button>
 )}
 {extraActions.map((actionFn, i) => (
   <React.Fragment key={`extra-${i}`}>{actionFn(row)}</React.Fragment>
 ))}
 </div>
 </div>
 )}

 {/* Sub Row for Mobile */}
 {isExpanded && renderSubRow && (
   <div className="mt-4 pt-4 border-t border-slate-200">
     {renderSubRow(row, () => handleToggle(row.id !== undefined ? row.id : rowIndex))}
   </div>
 )}
 </div>
 );
 })
 )}
 </div>

 {page && totalPages ? (
   <Pagination 
     currentPage={page} 
     totalPages={totalPages} 
     totalRecords={totalRecords} 
     onPageChange={onPageChange} 
   />
 ) : (
 <div className="flex items-center justify-between px-4 md:px-8 py-6 bg-slate-50/20 border-t border-slate-100/50">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse"></div>
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Record cluster: {data.length} units detected</span>
 </div>
 <div className="flex items-center gap-3">
 <button className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm" disabled>
 <ChevronLeft size={18} className="group-active:-translate-x-0.5 transition-transform" />
 </button>
 <div className="px-5 py-2 rounded-[12px] bg-gradient-to-br from-[#006666] to-[#008080] text-white text-xs font-black shadow-lg shadow-[#008080]/20">1</div>
 <button className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all group shadow-sm">
 <ChevronRight size={18} className="group-active:translate-x-0.5 transition-transform" />
 </button>
 </div>
 </div>
 )}
 </div>
 );
};

export default DataTable;
