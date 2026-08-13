import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, Search, Download, CheckCircle2, XCircle, AlertTriangle, Printer, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MobileCard from '../../components/common/MobileCard';

const GrowthMonitor = ({ initialData, onRefresh }) => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'academic_head';

  const [students, setStudents] = useState(initialData || []);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  useEffect(() => {
    setStudents(initialData || []);
  }, [initialData]);

  const handleGenerateReport = async (student) => {
    if (!isAcademicHead) return;
    if (isGenerating) return;
    setGeneratingId(student.id);
    setIsGenerating(true);
    
    try {
      const res = await api.post(`/academic-head/student-growth/generate/${student.id}`);
      if (res.data.success) {
        toast.success(`Report generated for ${student.name}`);
        onRefresh(); // Refresh parent data to get latest report
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
      setGeneratingId(null);
    }
  };

  const handleViewReport = (student) => {
    if (!student.latest_report) {
      toast.error("No report available. Please generate one first.");
      return;
    }
    setSelectedReport(student.latest_report);
    setShowReportModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.batch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.grade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStatusBadge = (status) => {
    let colorClass = 'bg-slate-50 text-slate-600';
    if (status === 'Excellent') colorClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    else if (status === 'Good') colorClass = 'bg-blue-50 text-blue-600 border border-blue-100';
    else if (status === 'Average') colorClass = 'bg-amber-50 text-amber-600 border border-amber-100';
    else if (status === 'Needs Improvement') colorClass = 'bg-rose-50 text-rose-600 border border-rose-100';

    return (
      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-block ${colorClass}`}>
        {status || 'Unknown'}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header and Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 printable-hidden">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="text-violet-500" /> Student Growth Analytics
        </h2>
        
        <div className="flex flex-col w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Desktop (hidden based on prompt requirements, only focusing on mobile layout 240-767) */}
      <div className="hidden md:block bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto printable-hidden">
         <p className="text-sm font-bold text-slate-400">Please view this on a mobile device for the full Student Growth Analytics experience.</p>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-4 printable-hidden">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-violet-50 text-violet-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={32} />
            </div>
            <h3 className="text-base font-black text-slate-700">No student growth data available.</h3>
            <p className="text-xs font-medium text-slate-500 mt-1 mb-6">There are no active students to track.</p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const hasReport = !!student.latest_report;
            const latestGrowth = hasReport ? student.latest_report.overall_growth_percentage : 0;
            const status = hasReport ? student.latest_report.performance_status : (student.performance_status || 'Pending');

            return (
              <div key={student.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-50 flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{student.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      {student.grade || 'N/A'} • {student.batch || 'No Batch'}
                    </p>
                  </div>
                  {hasReport && renderStatusBadge(status)}
                </div>
                
                <div className="p-4 sm:p-5 flex-1">
                  {hasReport ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Growth</p>
                        <p className="text-lg font-black text-violet-600">{latestGrowth}%</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                        <p className="text-lg font-black text-slate-700">{student.latest_report.attendance_percentage}%</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exam Avg</p>
                        <p className="text-lg font-black text-blue-600">{student.latest_report.assessment_performance}%</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subj Progress</p>
                        <p className="text-lg font-black text-slate-700">{student.latest_report.overall_subject_progress}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      <div className="w-10 h-10 bg-white text-slate-300 rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                        <AlertTriangle size={20} />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Growth Report Not Generated</h4>
                      <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[200px]">Generate a report to unlock comprehensive analytics for this student.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {hasReport ? (
                    <>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full text-center sm:text-left sm:w-auto">
                        Updated: {new Date(student.latest_report.generated_at).toLocaleDateString()}
                      </p>
                      <div className="flex w-full sm:w-auto gap-2">
                        {isAcademicHead && (
                          <button onClick={() => handleGenerateReport(student)} disabled={isGenerating} className="flex-1 sm:flex-none h-10 px-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                            {isGenerating && generatingId === student.id ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                            <span className="inline">Refresh</span>
                          </button>
                        )}
                        <button onClick={() => handleViewReport(student)} className="flex-[2] sm:flex-none h-10 px-4 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                          <FileText size={12} /> View Report
                        </button>
                      </div>
                    </>
                  ) : (
                    isAcademicHead && (
                      <button onClick={() => handleGenerateReport(student)} disabled={isGenerating} className="w-full h-11 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm">
                        {isGenerating && generatingId === student.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Generate Report
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Report Modal (Responsive) */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto print-friendly-modal max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 printable-hidden rounded-t-[2rem]">
              <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <FileText className="text-violet-500" size={18} /> Growth Report
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="h-8 px-3 bg-violet-100 text-violet-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-200 transition-colors flex items-center gap-1">
                  <Printer size={12} /> <span className="hidden sm:inline">Print / PDF</span>
                </button>
                <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm border border-slate-100"><XCircle size={16}/></button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto print-friendly-content space-y-6 flex-1">
              
              {/* Header Section */}
              <div className="text-center mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-violet-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto shadow-inner mb-3">
                  {selectedReport.overall_growth_percentage}%
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase break-words">{selectedReport.student_name}</h2>
                <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest break-words">{selectedReport.grade} • Mentor: {selectedReport.mentor}</p>
                <div className="mt-4 flex justify-center">{renderStatusBadge(selectedReport.performance_status)}</div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                  <p className="text-xl font-black text-slate-700">{selectedReport.attendance_percentage}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessment Avg</p>
                  <p className="text-xl font-black text-blue-600">{selectedReport.assessment_performance}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall Subject Completion</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, selectedReport.overall_subject_progress)}%` }}></div>
                    </div>
                    <span className="text-sm font-black text-slate-700">{selectedReport.overall_subject_progress}%</span>
                  </div>
                </div>
              </div>

              {/* Subject Progress */}
              {selectedReport.subject_progress && selectedReport.subject_progress.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subject-wise Progress</h4>
                  <div className="space-y-3">
                    {selectedReport.subject_progress.map((sub, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-700 truncate">{sub.subject}</span>
                        <div className="flex items-center gap-2 w-full sm:w-1/2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, sub.progress_percentage)}%` }}></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 w-8 text-right">{sub.progress_percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths & Areas for Improvement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                   <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Strengths</h4>
                   <ul className="list-disc list-inside text-xs font-bold text-slate-700 space-y-1 break-words">
                     {selectedReport.strengths && selectedReport.strengths.length > 0 ? 
                       selectedReport.strengths.map((s, i) => <li key={i}>{s}</li>) : 
                       <li>Consistent effort</li>}
                   </ul>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                   <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Areas for Improvement</h4>
                   <ul className="list-disc list-inside text-xs font-bold text-slate-700 space-y-1 break-words">
                     {selectedReport.areas_for_improvement && selectedReport.areas_for_improvement.length > 0 ? 
                       selectedReport.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>) : 
                       <li>Needs more focus</li>}
                   </ul>
                </div>
              </div>

              {/* Mentors & Parents */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mentor Remarks</h4>
                  <p className="text-xs font-medium text-slate-700 break-words">{selectedReport.mentor_remarks}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Parent Meeting Summary</h4>
                  <p className="text-xs font-medium text-slate-700 break-words">{selectedReport.parent_meeting_summary}</p>
                </div>
              </div>

              {/* Growth Trend */}
              <div className="bg-gradient-to-r from-violet-500 to-indigo-500 p-4 rounded-2xl text-white">
                <h4 className="text-[10px] font-black text-violet-200 uppercase tracking-widest mb-1">Overall Growth Trend</h4>
                <p className="text-sm font-bold break-words">{selectedReport.growth_trend}</p>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Report Generated: {new Date(selectedReport.generated_at).toLocaleString()}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-friendly-modal, .print-friendly-modal * {
            visibility: visible;
          }
          .print-friendly-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
          .printable-hidden {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GrowthMonitor;
