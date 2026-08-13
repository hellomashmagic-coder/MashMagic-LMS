import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import InteractionFormUI from '../../components/common/InteractionFormUI';

const EditInteractionLog = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    
    // Attempt to get log and apiPrefix from navigation state
    const initialLog = location.state?.log || null;
    const apiPrefix = location.state?.apiPrefix || '/admin';
    
    const [log, setLog] = useState(initialLog);
    const [editFormData, setEditFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialLog) {
            let parsedReport = {};
            if (initialLog.report_data) {
                try {
                    parsedReport = typeof initialLog.report_data === 'string' 
                        ? JSON.parse(initialLog.report_data) 
                        : initialLog.report_data;
                } catch (e) {
                    console.error("Error parsing report_data:", e);
                }
            }
            setEditFormData({
                main_issue: initialLog.main_issue || '',
                notes: initialLog.notes || '',
                report_data: parsedReport,
                interaction_date: initialLog.created_at ? new Date(initialLog.created_at).toISOString().split('T')[0] : (initialLog.date ? new Date(initialLog.date).toISOString().split('T')[0] : '')
            });
        } else {
            // If they land on this page directly without state, we navigate back.
            toast.error("Interaction log data missing. Please select from the list.");
            navigate(-1);
        }
    }, [initialLog, navigate]);

    const handleSave = async () => {
        if (!log) return;
        setIsSaving(true);
        try {
            const endpoint = `${apiPrefix}/interactions/${encodeURIComponent(log.source || 'Interaction Hub')}/${log.id}`;
            const res = await api.put(endpoint, editFormData);
            if (res.data.success) {
                toast.success('Log updated successfully');
                navigate(-1);
            }
        } catch (error) {
            console.error("Error updating log:", error);
            toast.error(error.response?.data?.message || 'Error updating log');
        } finally {
            setIsSaving(false);
        }
    };

    if (!log) return null;

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-3 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Edit Interaction Log</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Modify details for this session</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
                    <div className="space-y-8">
                        <div className="mb-6">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Interaction Date</label>
                            <input 
                                type="date" 
                                className="w-full md:w-1/3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none" 
                                value={editFormData.interaction_date || ''} 
                                onChange={e => setEditFormData({...editFormData, interaction_date: e.target.value})} 
                            />
                        </div>

                        {(!log.source || log.source === 'Interaction Hub' || log.source.startsWith('Hub:')) && (
                            <InteractionFormUI 
                                sessionType={(log.session_type || log.source.replace('Hub: ', '') || 'QUICK').toUpperCase()} 
                                formData={editFormData.report_data || {}} 
                                setFormData={(newData) => setEditFormData({...editFormData, report_data: typeof newData === 'function' ? newData(editFormData.report_data) : newData})} 
                                isReadOnly={false} 
                            />
                        )}

                        {log.source === 'Session Log' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Main Issue</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none" value={editFormData.main_issue || ''} onChange={e => setEditFormData({
                                        ...editFormData,
                                        main_issue: e.target.value
                                    })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Notes</label>
                                    <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none min-h-[120px]" value={editFormData.notes || ''} onChange={e => setEditFormData({
                                        ...editFormData,
                                        notes: e.target.value
                                    })} />
                                </div>
                            </div>
                        )}

                        {log.source === 'Interaction Log' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mentor Notes</label>
                                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none min-h-[120px]" value={editFormData.notes || ''} onChange={e => setEditFormData({
                                    ...editFormData,
                                    notes: e.target.value
                                })} />
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-3">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className="px-6 py-3 bg-[#008080] hover:bg-[#006666] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-[#008080]/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditInteractionLog;
