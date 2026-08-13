import React, { useState } from 'react';
import { Download, Calendar, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import MultiDatePicker, { DateObject } from "react-multi-date-picker";

const DatePicker = MultiDatePicker.default ? MultiDatePicker.default : MultiDatePicker;

const ExportButton = ({ data, fetchData, filename = "export", dateField = "createdAt", columns = [], customButtonClass = null, buttonText = "Export", fullWidth = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState([]); // [startDate, endDate]
  const [exportType, setExportType] = useState('all'); // 'all', 'range'

  const handleExport = async () => {
    let filteredData = [];

    if (fetchData) {
      filteredData = await fetchData(exportType, dateRange);
      if (!filteredData) {
        setShowModal(false);
        return;
      }
    } else {
      filteredData = [...data];

      if (exportType === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        filteredData = data.filter(item => {
          const itemDateStr = item[dateField];
          if (!itemDateStr) return false;
          
          let itemDate;
          if (typeof itemDateStr === 'string' && itemDateStr.includes('-')) {
              const parts = itemDateStr.split('-');
              if (parts[0].length === 2 && parts[2].length === 4) { // DD-MM-YYYY
                  itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                  itemDate = new Date(itemDateStr);
              }
          } else {
              itemDate = new Date(itemDateStr);
          }

          return itemDate >= today && itemDate <= end;
        });
      } else if (exportType === 'range' && dateRange.length > 0) {
        const start = new Date(dateRange[0].format("YYYY-MM-DD"));
        start.setHours(0, 0, 0, 0);

        const end = dateRange.length > 1 ? new Date(dateRange[1].format("YYYY-MM-DD")) : new Date(start);
        end.setHours(23, 59, 59, 999);

        filteredData = data.filter(item => {
          const itemDateStr = item[dateField];
          if (!itemDateStr) return false;
          
          let itemDate;
          if (typeof itemDateStr === 'string' && itemDateStr.includes('-')) {
              const parts = itemDateStr.split('-');
              if (parts[0].length === 2 && parts[2].length === 4) { // DD-MM-YYYY
                  itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                  itemDate = new Date(itemDateStr);
              }
          } else {
              itemDate = new Date(itemDateStr);
          }

          return itemDate >= start && itemDate <= end;
        });
      }
    }

    if (filteredData.length === 0) {
      alert("No data available to export for the selected range.");
      return;
    }

    let exportData = filteredData;
    if (columns && columns.length > 0) {
      exportData = filteredData.map(item => {
        const obj = {};
        columns.forEach(col => {
          if (typeof col === 'string') {
            obj[col] = item[col];
          } else {
            obj[col.header] = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
          }
        });
        return obj;
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);

    setShowModal(false);
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={customButtonClass || `flex items-center gap-2 px-4 py-2 bg-[#008080]/10 hover:bg-[#008080]/20 rounded-xl text-[10px] font-black text-[#008080] uppercase tracking-widest border border-[#008080]/20 transition-all shadow-sm${fullWidth ? ' w-full min-h-[48px] justify-center' : ''}`}
      >
        <Download size={12} /> {buttonText}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Download className="text-[#008080]" size={20} /> Export Data
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider">Export Options</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setExportType('all')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      exportType === 'all' 
                        ? 'border-[#008080] bg-[#008080]/5 text-[#008080]' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setExportType('today')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      exportType === 'today' 
                        ? 'border-[#008080] bg-[#008080]/5 text-[#008080]' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setExportType('range')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      exportType === 'range' 
                        ? 'border-[#008080] bg-[#008080]/5 text-[#008080]' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {exportType === 'range' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} /> Select Date Range
                  </label>
                  <div className="w-full">
                    <DatePicker
                      value={dateRange}
                      onChange={setDateRange}
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
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleExport}
                className="px-6 py-2 bg-[#008080] hover:bg-[#006060] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#008080]/20"
              >
                Generate Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
