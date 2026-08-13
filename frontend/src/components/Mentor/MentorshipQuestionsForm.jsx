import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, Upload, Loader2, FileText, Calendar, Target, Activity } from 'lucide-react';

const steps = [
    'Basic Details',
    'Student State',
    'Academic Status',
    'Mentor Diagnosis',
    'Mentor Guidance',
    'Interaction Quality',
    'Follow-Up',
    'Final Decision',
    'Session Rating',
    'Proof Upload'
];

const initialForm = {
    date: new Date().toISOString().split('T')[0],
    connection_method: 'WhatsApp Chat',
    session_start_time: '',
    session_end_time: '',
    focus_level: '',
    energy_level: 'Normal',
    stress_level: 'Medium',
    homework_status: 'Completed',
    revision_done: true,
    doubts_present: false,
    main_issue: 'No Issue',
    secondary_issue: '',
    weak_subject: '',
    problem_clarity: 'Clear',
    action_type: 'Complete Homework',
    action_detail: '',
    action_specific: true,
    student_engagement: 'Medium',
    understanding_after_session: 'Same',
    previous_task_status: '',
    followup_required: false,
    followup_date: '',
    student_status: 'On Track',
    session_quality_rating: '',
    interaction_files: []
};

const MentorshipQuestionsForm = ({ selectedStudent, setSubmitted, fetchStudentLogs }) => {
    const [form, setForm] = useState(initialForm);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previousSession, setPreviousSession] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        if (!selectedStudent?.id) return;
        setForm(initialForm);
        setStep(0);
        loadContinuity(selectedStudent.id);
    }, [selectedStudent?.id]);

    const loadContinuity = async (studentId) => {
        try {
            const [prevRes, analyticsRes] = await Promise.all([
                api.get(`/mentor-logs/previous/${studentId}`),
                api.get(`/mentor-logs/analytics/${studentId}`)
            ]);
            setPreviousSession(prevRes.data?.data || null);
            setAnalytics(analyticsRes.data?.summary || null);
        } catch (error) {
            setPreviousSession(null);
            setAnalytics(null);
        }
    };

    const requiredCheck = useMemo(() => {
        const required = [
            form.date, form.connection_method, form.session_start_time, form.session_end_time,
            form.focus_level, form.energy_level, form.stress_level,
            form.homework_status, String(form.revision_done), String(form.doubts_present),
            form.main_issue, form.weak_subject, form.problem_clarity,
            form.action_type, String(form.action_specific),
            form.student_engagement, form.understanding_after_session,
            String(form.followup_required), form.student_status, form.session_quality_rating
        ];
        return required.every(Boolean);
    }, [form]);

    const completionPercent = Math.round(((step + 1) / steps.length) * 100);

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const uploadFiles = async (files) => {
        if (!files?.length) return;
        const fd = new FormData();
        Array.from(files).forEach(file => fd.append('files', file));
        setUploading(true);
        try {
            const res = await api.post('/mentor-logs/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const urls = res.data?.urls || [];
            setForm(prev => ({ ...prev, interaction_files: [...prev.interaction_files, ...urls] }));
            toast.success('Files uploaded');
        } catch (error) {
            toast.error(error.response?.data?.message || 'File upload failed');
        } finally {
            setUploading(false);
        }
    };

    const validateBeforeSubmit = () => {
        if (!requiredCheck) {
            toast.error('Please fill all required fields');
            return false;
        }
        if (form.followup_required && !form.followup_date) {
            toast.error('Follow-up date is required');
            return false;
        }
        if (previousSession && !form.previous_task_status) {
            toast.error('Update previous task status before submitting');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateBeforeSubmit()) return;
        setLoading(true);
        try {
            await api.post('/mentor-logs/create', {
                ...form,
                student_id: selectedStudent.id
            });
            toast.success('Mentor session logged successfully');
            setSubmitted(true);
            if (fetchStudentLogs) fetchStudentLogs(selectedStudent.id);
            setForm(initialForm);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit session');
        } finally {
            setLoading(false);
        }
    };

    const stepContent = () => {
        switch (step) {
            case 0:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Date *"><input type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} className={inputCls} /></Field>
                        <Field label="Connection Method *"><Select value={form.connection_method} onChange={(v) => updateForm('connection_method', v)} options={['WhatsApp Chat', 'Voice Note', 'Voice Call', 'Video Call']} /></Field>
                        <Field label="Session Start Time *"><input type="datetime-local" value={form.session_start_time} onChange={(e) => updateForm('session_start_time', e.target.value)} className={inputCls} /></Field>
                        <Field label="Session End Time *"><input type="datetime-local" value={form.session_end_time} onChange={(e) => updateForm('session_end_time', e.target.value)} className={inputCls} /></Field>
                    </div>
                );
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="Focus Level (1-5) *"><Select value={form.focus_level} onChange={(v) => updateForm('focus_level', Number(v))} options={['1', '2', '3', '4', '5']} /></Field>
                        <Field label="Energy Level *"><Select value={form.energy_level} onChange={(v) => updateForm('energy_level', v)} options={['Low', 'Normal', 'High']} /></Field>
                        <Field label="Stress Level *"><Select value={form.stress_level} onChange={(v) => updateForm('stress_level', v)} options={['Low', 'Medium', 'High']} /></Field>
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="Homework Status *"><Select value={form.homework_status} onChange={(v) => updateForm('homework_status', v)} options={['Completed', 'Partial', 'Not Done']} /></Field>
                        <Field label="Revision Done *"><Select value={String(form.revision_done)} onChange={(v) => updateForm('revision_done', v === 'true')} options={['true', 'false']} labels={{ true: 'Yes', false: 'No' }} /></Field>
                        <Field label="Doubts Present *"><Select value={String(form.doubts_present)} onChange={(v) => updateForm('doubts_present', v === 'true')} options={['true', 'false']} labels={{ true: 'Yes', false: 'No' }} /></Field>
                    </div>
                );
            case 3:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Main Issue *"><Select value={form.main_issue} onChange={(v) => updateForm('main_issue', v)} options={['No Issue', 'Low Focus', 'Distraction', 'Procrastination', 'Homework Pending', 'Concept Difficulty', 'Low Motivation']} /></Field>
                        <Field label="Secondary Issue (Optional)"><Select value={form.secondary_issue} onChange={(v) => updateForm('secondary_issue', v)} options={['', 'Low Focus', 'Distraction', 'Procrastination', 'Homework Pending', 'Concept Difficulty', 'Low Motivation']} labels={{ '': 'None' }} /></Field>
                        <Field label="Weak Subject *"><Select value={form.weak_subject} onChange={(v) => updateForm('weak_subject', v)} options={['Mathematics', 'Science', 'English', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'Computer Science', 'Economics']} /></Field>
                        <Field label="Problem Clarity *"><Select value={form.problem_clarity} onChange={(v) => updateForm('problem_clarity', v)} options={['Clear', 'Partial', 'Not Clear']} /></Field>
                    </div>
                );
            case 4:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Action Type *"><Select value={form.action_type} onChange={(v) => updateForm('action_type', v)} options={['Complete Homework', 'Revise Topic', 'Start on Time', 'Reduce Distraction', 'Practice Questions', 'Doubt Clarification']} /></Field>
                        <Field label="Action Is Specific? *"><Select value={String(form.action_specific)} onChange={(v) => updateForm('action_specific', v === 'true')} options={['true', 'false']} labels={{ true: 'Yes', false: 'No' }} /></Field>
                        <Field label="Action Detail (Optional)"><textarea rows="3" value={form.action_detail} onChange={(e) => updateForm('action_detail', e.target.value)} className={inputCls} placeholder="Only required when mentor wants to add extra detail." /></Field>
                    </div>
                );
            case 5:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Student Engagement *"><Select value={form.student_engagement} onChange={(v) => updateForm('student_engagement', v)} options={['High', 'Medium', 'Low']} /></Field>
                        <Field label="Understanding After Session *"><Select value={form.understanding_after_session} onChange={(v) => updateForm('understanding_after_session', v)} options={['Improved', 'Same', 'Not Improved']} /></Field>
                    </div>
                );
            case 6:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Previous Task Status *"><Select value={form.previous_task_status} onChange={(v) => updateForm('previous_task_status', v)} options={['Completed', 'Not Completed', 'Not Checked']} /></Field>
                        <Field label="Follow-up Required *"><Select value={String(form.followup_required)} onChange={(v) => updateForm('followup_required', v === 'true')} options={['true', 'false']} labels={{ true: 'Yes', false: 'No' }} /></Field>
                        {form.followup_required && (
                            <Field label="Follow-up Date *"><input type="date" value={form.followup_date} onChange={(e) => updateForm('followup_date', e.target.value)} className={inputCls} /></Field>
                        )}
                    </div>
                );
            case 7:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Student Status *"><Select value={form.student_status} onChange={(v) => updateForm('student_status', v)} options={['Critical', 'Needs Attention', 'On Track']} /></Field>
                    </div>
                );
            case 8:
                return (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-700">Session KPI Rating *</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button key={num} type="button" onClick={() => updateForm('session_quality_rating', num)} className={`px-4 py-2 rounded-xl font-black ${form.session_quality_rating === num ? 'bg-[#008080] text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="space-y-4">
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                uploadFiles(e.dataTransfer.files);
                            }}
                            className="border-2 border-dashed border-slate-300 rounded-2xl p-4 md:p-8 bg-slate-50 text-center"
                        >
                            <Upload className="mx-auto text-[#008080] mb-2" />
                            <p className="text-sm font-bold text-slate-700">Drag & drop files (image/pdf/audio)</p>
                            <input type="file" multiple accept="image/*,.pdf,audio/*" onChange={(e) => uploadFiles(e.target.files)} className="mt-3 text-xs" />
                        </div>
                        {uploading && <p className="text-xs font-bold text-[#008080] flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Uploading...</p>}
                        <div className="space-y-2">
                            {form.interaction_files.map((url, idx) => (
                                <div key={`${url}-${idx}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2">
                                    <span className="text-xs font-bold text-slate-700 truncate flex items-center gap-2"><FileText size={14} /> {url}</span>
                                    <button type="button" onClick={() => updateForm('interaction_files', form.interaction_files.filter((_, i) => i !== idx))} className="text-rose-500 text-xs font-black">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8">
            <div className="bg-[#008080] text-white rounded-3xl p-5 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black tracking-tight">Mentor Performance + Student Impact Tracker</h3>
                    <p className="text-[10px] uppercase tracking-widest text-slate-300">Student: {selectedStudent?.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Progress</p>
                    <p className="text-sm font-black">{completionPercent}%</p>
                </div>
            </div>

            {previousSession && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Continuity Snapshot (Last Session)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                        <p><span className="text-slate-500">Main Issue:</span> {previousSession.main_issue}</p>
                        <p><span className="text-slate-500">Action Type:</span> {previousSession.action_type}</p>
                        <p><span className="text-slate-500">Follow-up:</span> {previousSession.followup_date ? new Date(previousSession.followup_date).toLocaleDateString() : 'None'}</p>
                    </div>
                </div>
            )}

            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Metric label="Mentor Accuracy" value={`${analytics.mentor_accuracy_percent}%`} icon={<Target size={14} />} />
                    <Metric label="Improvement Trend" value={`${analytics.student_improvement_percent}%`} icon={<Activity size={14} />} />
                    <Metric label="Follow-up Consistency" value={`${analytics.followup_consistency_percent}%`} icon={<Calendar size={14} />} />
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {steps.map((title, idx) => (
                    <button key={title} type="button" onClick={() => setStep(idx)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${idx === step ? 'bg-[#008080] text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {idx + 1}. {title}
                    </button>
                ))}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 mb-4">{steps[step]}</h4>
                {stepContent()}
            </div>

            <div className="flex items-center justify-between gap-3">
                <button type="button" disabled={step === 0} onClick={() => setStep(prev => Math.max(0, prev - 1))} className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-700 disabled:opacity-50">Previous</button>
                {step < steps.length - 1 ? (
                    <button type="button" onClick={() => setStep(prev => Math.min(steps.length - 1, prev + 1))} className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#008080] text-white">Next</button>
                ) : (
                    <button type="submit" disabled={loading || uploading} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#008080] text-white flex items-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                        Submit Session
                    </button>
                )}
            </div>
        </form>
    );
};

const inputCls = 'w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none';

const Field = ({ label, children }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const Select = ({ value, onChange, options, labels = {} }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Select</option>
        {options.map((opt) => (
            <option key={opt} value={opt}>{labels[opt] || opt}</option>
        ))}
    </select>
);

const Metric = ({ label, value, icon }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">{icon}{label}</p>
        <p className="text-lg font-black text-[#008080]">{value}</p>
    </div>
);

export default MentorshipQuestionsForm;
