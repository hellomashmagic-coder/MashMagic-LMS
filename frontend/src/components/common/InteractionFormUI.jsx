import React, { useState } from 'react';
import { AlertCircle, Brain, Paperclip, Download } from 'lucide-react';

const InteractionFormUI = ({ sessionType, formData, setFormData, isReadOnly = false }) => {
  const [expandedFields, setExpandedFields] = useState({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

  const handleChange = (e) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const expandField = (fieldName) => {
    setExpandedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const getRows = (fieldName, baseRows, expandedRows = 8) => (
    expandedFields[fieldName] ? expandedRows : baseRows
  );

  const normalizeFileUrl = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return '#';
    const trimmed = filePath.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

    let cleanPath = trimmed
      .replace(/^undefined\/?/i, '/')
      .replace(/\/undefined\/+/gi, '/')
      .replace(/^\/?mentor-head\/undefined\/?/i, '/')
      .replace(/\/+/g, '/');
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = `/api${cleanPath}`;
    }

    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}${cleanPath}`;
  };

  const renderButtonOptions = (field, options, activeColor, inactiveColor, defaultLabel = '') => (
    <div className="flex flex-wrap gap-2 w-full">
      {options.map(opt => {
        const isActive = formData[field] === opt;
        const baseClass = "flex-1 min-w-[30%] sm:min-w-0 min-h-[48px] py-3 px-2 rounded-2xl text-[9px] font-black uppercase transition-all shadow-sm flex items-center justify-center text-center leading-tight break-words";
        const colorClass = isActive 
          ? activeColor 
          : isReadOnly 
            ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed'
            : inactiveColor;
            
        return (
          <button 
            key={opt} 
            type="button" 
            onClick={() => !isReadOnly && setFormData({ ...formData, [field]: opt })} 
            disabled={isReadOnly}
            className={`${baseClass} ${colorClass}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`space-y-8 ${isReadOnly ? 'opacity-95' : ''}`}
      onClick={isReadOnly ? (e) => e.stopPropagation() : undefined}
      onMouseDown={isReadOnly ? (e) => e.stopPropagation() : undefined}
    >
      {sessionType === 'DEEP' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 p-4 sm:p-6 rounded-[2.5rem] border border-slate-100 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Planned Task Completed?</label>
              {renderButtonOptions('student_status_before', ['Yes', 'Partially', 'No'], 'bg-yellow-400 text-slate-900 shadow-lg', 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-100')}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Main Problem</label>
              <select name="main_problem" value={formData.main_problem || ''} onChange={handleChange} disabled={isReadOnly} className="w-full py-3 px-4 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-70 disabled:bg-slate-50">
                <option value="">Select...</option>
                {['Academic difficulty', 'Lack of consistency', 'Low confidence', 'Distraction / mobile usage', 'Emotional issue', 'No major issue'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Student Response</label>
              {renderButtonOptions('student_response', ['Positive', 'Neutral', 'Resistant'], 'bg-yellow-400 text-slate-900 shadow-lg', 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-100')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Root Cause</label>
              <textarea name="root_cause" rows="2" value={formData.root_cause || (isReadOnly ? 'No notes provided' : '')} onChange={handleChange} readOnly={isReadOnly} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:bg-rose-50/30 transition-all focus:border-rose-200" placeholder="Why is this happening?"></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Mentor Guidance</label>
              <textarea name="mentor_guidance" rows="2" value={formData.mentor_guidance || (isReadOnly ? 'No notes provided' : '')} onChange={handleChange} readOnly={isReadOnly} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:bg-rose-50/30 transition-all focus:border-rose-200" placeholder="What exact guidance was given?"></textarea>
            </div>
          </div>

          <div className="space-y-2 relative group">
            <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1 absolute -top-3 left-6 bg-white px-2">Action Plan</label>
            <textarea name="action_plan" rows={getRows('action_plan', 3)} value={formData.action_plan || (isReadOnly ? 'No notes provided' : '')} onChange={handleChange} onClick={() => expandField('action_plan')} onFocus={() => expandField('action_plan')} readOnly={isReadOnly} className={`w-full p-4 md:p-8 bg-rose-50/50 border-2 border-rose-100 focus:border-rose-300 rounded-[2.5rem] text-lg font-black text-slate-900 outline-none transition-all placeholder:text-rose-200 shadow-[0_10px_40px_rgba(244,63,94,0.05)] ${isReadOnly ? 'cursor-pointer' : ''}`} placeholder="What should student do before next session?"></textarea>
          </div>

          <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">Follow-up Required?</label>
              <div className="flex gap-2">
                {['Yes', 'No'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, followup_required: opt})} disabled={isReadOnly} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.followup_required === opt ? 'bg-yellow-400 text-slate-900 shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{opt}</button>
                ))}
              </div>
            </div>
            {formData.followup_required === 'Yes' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto animate-in slide-in-from-right-4">
                <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">When?</span>
                <select name="followup_when" value={formData.followup_when || ''} onChange={handleChange} disabled={isReadOnly} className="p-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none disabled:opacity-70">
                  <option value="">Select...</option>
                  {['Tomorrow', 'Within 2 days', 'This week'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {sessionType === 'MEDIUM' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row gap-6 bg-slate-50 p-4 sm:p-6 rounded-[2.5rem] border border-slate-100 items-end">
            <div className="flex-1 space-y-3 w-full">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Progress Since Last Session</label>
              {renderButtonOptions('progress', ['Good', 'Average', 'Poor'], 'bg-amber-500 text-white shadow-lg', 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-100')}
            </div>
            <div className="flex-1 space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Class Attendance</label>
              <select name="class_attendance" value={formData.class_attendance || ''} onChange={handleChange} disabled={isReadOnly} className="w-full py-3 px-4 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-70 disabled:bg-slate-50">
                <option value="">Select...</option>
                {['Regular', 'Missed 1 class', 'Missed multiple'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Any Issue Found?</label>
              {renderButtonOptions('issue_found', ['Yes', 'No'], 'bg-amber-600 text-white shadow-md', 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-100')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Guidance Given</label>
              <textarea name="quick_guidance" rows="2" value={formData.quick_guidance || (isReadOnly ? 'No notes provided' : '')} onChange={handleChange} readOnly={isReadOnly} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:bg-amber-50/30 transition-all focus:border-amber-200" placeholder="Briefly summarize the correction..."></textarea>
            </div>
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 absolute -top-3 left-6 bg-white px-2">Next Task Assigned (Compulsory)</label>
              <textarea name="next_task" rows="3" value={formData.next_task || (isReadOnly ? 'No notes provided' : '')} onChange={handleChange} readOnly={isReadOnly} className="w-full p-4 md:p-8 bg-amber-50/50 border-2 border-amber-100 focus:border-amber-300 rounded-[2.5rem] text-lg font-black text-slate-900 outline-none transition-all placeholder:text-amber-200 shadow-[0_10px_40px_rgba(245,158,11,0.05)]" placeholder="What is the very next action for the student?"></textarea>
            </div>
          </div>

          <div className="p-4 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">Need Deep Session?</label>
              <div className="flex gap-2">
                {['Yes', 'No'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, upgrade_to_deep: opt})} disabled={isReadOnly} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.upgrade_to_deep === opt ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionType === 'QUICK' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 sm:p-6 rounded-[2.5rem] border border-slate-100">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Student Available?</label>
              <div className="flex gap-1">
                {['Attended call', 'Did not attend'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, availability: opt})} disabled={isReadOnly} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.availability === opt ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>{opt === 'Attended call' ? 'Attended' : 'Missed'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Study Status</label>
              <div className="flex gap-1">
                {['Studied properly', 'Studied partially', 'Not studied'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, study_status: opt})} disabled={isReadOnly} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.study_status === opt ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>{opt.split(' ')[1] || 'Properly'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Class Attendance</label>
              <div className="flex gap-1">
                {['Attended', 'Missed'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, attendance: opt})} disabled={isReadOnly} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.attendance === opt ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-[2.5rem] border transition-all ${formData.immediate_concern === 'Yes' ? 'bg-rose-50 border-rose-200 shadow-xl shadow-rose-100/50' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                {formData.immediate_concern === 'Yes' && <AlertCircle size={16} className="text-rose-500" />}
                Immediate Concern?
              </label>
              <div className="flex gap-2">
                {['Yes', 'No'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, immediate_concern: opt})} disabled={isReadOnly} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.immediate_concern === opt ? (opt === 'Yes' ? 'bg-rose-500 text-white shadow-md' : 'bg-[#008080] text-white shadow-md') : 'bg-slate-100 text-slate-400'}`}>{opt}</button>
                ))}
              </div>
            </div>
            {formData.immediate_concern === 'Yes' && (
              <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                {['Academic', 'Discipline', 'Device Addiction', 'Emotional', 'Attendance'].map(opt => (
                  <button key={opt} type="button" onClick={() => !isReadOnly && setFormData({...formData, immediate_concern_category: opt})} disabled={isReadOnly} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${formData.immediate_concern_category === opt ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-rose-400 border border-rose-200'}`}>{opt}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interaction Details Area */}
      {(sessionType === 'DEEP' || sessionType === 'MEDIUM' || sessionType === 'QUICK') && (
        <div className="space-y-3 mb-8 mt-6">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Today's Interaction Details</label>
          <textarea 
            name="interaction_details" 
            rows={getRows('interaction_details', 3)} 
            value={formData.interaction_details || (isReadOnly ? 'No notes provided' : '')} 
            onChange={handleChange} 
            onClick={() => expandField('interaction_details')}
            onFocus={() => expandField('interaction_details')}
            readOnly={isReadOnly}
            className={`w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#008080] focus:ring-4 focus:ring-[#008080]/10 transition-all placeholder:text-slate-400 ${isReadOnly ? 'cursor-pointer' : ''}`} 
            placeholder="Type detailed notes about today's interaction..."
          ></textarea>
        </div>
      )}

      {/* Next Attention Level & Notes */}
      {(sessionType === 'DEEP' || sessionType === 'MEDIUM' || sessionType === 'QUICK') && (
        <div className={`p-4 md:p-8 rounded-[3rem] border space-y-6 transition-all ${formData.next_session_type === 'DEEP' ? 'bg-rose-950 border-rose-900 shadow-[0_0_40px_rgba(244,63,94,0.1)]' : 'bg-[#008080] border-slate-800'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                {formData.next_session_type === 'DEEP' && <AlertCircle className="text-rose-500" size={20} />}
                Next Attention Level
              </h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select the intensity for the next interaction</p>
            </div>
            <div className="flex w-full sm:w-auto gap-1 sm:gap-2 p-1.5 bg-white/10 rounded-2xl justify-between sm:justify-center">
              {[
                { id: 'DEEP', label: 'Deep', color: 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]' },
                { id: 'MEDIUM', label: 'Medium', color: 'bg-amber-500 text-white shadow-lg' },
                { id: 'QUICK', label: 'Quick', color: 'bg-blue-500 text-white shadow-lg' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !isReadOnly && setFormData({...formData, next_session_type: opt.id})}
                  disabled={isReadOnly}
                  className={`flex-1 sm:flex-none shrink min-w-0 px-1 sm:px-6 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest transition-all text-center break-words leading-none sm:leading-normal ${formData.next_session_type === opt.id ? opt.color : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes (Optional)</label>
            <textarea 
              name="quick_notes" 
              rows={getRows('quick_notes', 2, 6)} 
              value={formData.quick_notes || (isReadOnly ? 'No notes provided' : '')} 
              onChange={handleChange} 
              onClick={() => expandField('quick_notes')}
              onFocus={() => expandField('quick_notes')}
              readOnly={isReadOnly}
              className={`w-full p-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-sm font-bold text-white outline-none focus:bg-white/10 transition-all placeholder:text-slate-600 ${isReadOnly ? 'cursor-pointer' : ''}`} 
              placeholder="Anything important noticed?"
            ></textarea>
          </div>
        </div>
      )}

      {/* AI Recommendation Box */}
      {(sessionType === 'DEEP' || sessionType === 'MEDIUM' || sessionType === 'QUICK') && !isReadOnly && (
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-[#008080]/10 flex items-center justify-center">
            <Brain size={18} className="text-[#008080]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Next Recommended Action</p>
            <p className="text-sm font-black text-slate-900 uppercase">
              {formData.immediate_concern === 'Yes' || formData.progress === 'Poor' ? 'Schedule Deep Session & Inform Parent' :
               formData.next_session_type === 'DEEP' ? 'Prepare root cause analysis for next Deep Session' :
               'Monitor student behavior tomorrow'}
            </p>
          </div>
        </div>
      )}
      
      {/* File Upload Display (Read-Only Mode) */}
      {isReadOnly && (formData.files || formData.file) && (
        <div className="mt-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
           <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Paperclip size={14} /> Attached Files
           </h4>
           <div className="flex flex-wrap gap-4">
             {(Array.isArray(formData.files || formData.file) ? (formData.files || formData.file) : (typeof (formData.files || formData.file) === 'string' ? (formData.files || formData.file).split(',') : [])).map((f, i) => (
                <a key={i} href={normalizeFileUrl(f)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl hover:border-[#008080] hover:shadow-md transition-all group">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#008080]/10 group-hover:text-[#008080]">
                     <Download size={16} />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-slate-700">Attachment {i + 1}</p>
                     <p className="text-[9px] font-bold text-slate-400 truncate w-32">Click to view</p>
                   </div>
                </a>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default InteractionFormUI;
