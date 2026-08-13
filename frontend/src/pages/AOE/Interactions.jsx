import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, UserPlus, FileText, PlusCircle, Search, Save, CheckCircle2, Clock, Calendar, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
const Interactions = () => {
  const [activeMainTab, setActiveMainTab] = useState('parent'); // 'parent' or 'faculty'
  const [activeSubTab, setActiveSubTab] = useState('log'); // 'log' or 'view'

  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [formData, setFormData] = useState({
    targetId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    interaction_data: {}
  });
  useEffect(() => {
    fetchDropdowns();
  }, []);
  useEffect(() => {
    if (activeSubTab === 'view') {
      fetchInteractions();
    }
  }, [activeMainTab, activeSubTab]);
  const fetchDropdowns = async () => {
    try {
      const [stdRes, facRes] = await Promise.all([api.get('/aoe/students-all'), api.get('/aoe/faculties')]);
      setStudents((stdRes.data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setFaculties(facRes.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch students/faculties');
    }
  };
  const fetchInteractions = async () => {
    try {
      const endpoint = activeMainTab === 'parent' ? '/aoe/parent-interactions' : '/aoe/faculty-interactions';
      const res = await api.get(endpoint);
      setInteractions(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch interactions');
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.targetId) {
      toast.error(`Please select a ${activeMainTab === 'parent' ? 'Student' : 'Faculty'}`);
      return;
    }
    try {
      const endpoint = activeMainTab === 'parent' ? '/aoe/parent-interactions' : '/aoe/faculty-interactions';
      const payload = {
        date: formData.date,
        notes: formData.notes,
        interaction_data: formData.interaction_data
      };
      if (activeMainTab === 'parent') {
        payload.student_id = formData.targetId;
      } else {
        payload.faculty_id = formData.targetId;
      }
      await api.post(endpoint, payload);
      toast.success('Interaction logged successfully');
      setFormData({
        ...formData,
        notes: '',
        interaction_data: {}
      });
      if (activeSubTab === 'view') fetchInteractions();
    } catch (err) {
      toast.error('Failed to log interaction');
    }
  };
  return <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080]">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Interaction Logs</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Manage Parent & Faculty Interactions</p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button onClick={() => {
          setActiveMainTab('parent');
          setFormData({
            ...formData,
            targetId: ''
          });
        }} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all ${activeMainTab === 'parent' ? 'text-[#008080] border-b-2 border-[#008080]' : 'text-slate-400 hover:text-slate-600'}`}>
            Parent Interactions
          </button>
          <button onClick={() => {
          setActiveMainTab('faculty');
          setFormData({
            ...formData,
            targetId: ''
          });
        }} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all ${activeMainTab === 'faculty' ? 'text-[#008080] border-b-2 border-[#008080]' : 'text-slate-400 hover:text-slate-600'}`}>
            Faculty Interactions
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveSubTab('log')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'log' ? 'bg-[#008080] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <PlusCircle size={14} /> Log Interaction
          </button>
          <button onClick={() => setActiveSubTab('view')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'view' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <FileText size={14} /> View Interactions
          </button>
        </div>

        {/* Content */}
        {activeSubTab === 'log' ? <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {activeMainTab === 'parent' ? 'Select Student' : 'Select Faculty'}
                  </label>
                  <select value={formData.targetId} onChange={e => setFormData({
                ...formData,
                targetId: e.target.value
              })} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]" required>
                    <option value="">-- Select --</option>
                    {activeMainTab === 'parent' ? students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.registration_number})</option>) : faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({
                ...formData,
                date: e.target.value
              })} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Interaction Details / Notes
                </label>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-sm text-blue-800">
                  <span className="font-bold">Note:</span> The exact form structure for {activeMainTab} interactions will be added here once provided. For now, use this general notes area.
                </div>
                <textarea value={formData.notes} onChange={e => setFormData({
              ...formData,
              notes: e.target.value
            })} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080] min-h-[150px]" placeholder={`Enter details about the interaction with the ${activeMainTab}...`} required />
              </div>

              <button type="submit" className="h-12 px-4 md:px-8 rounded-xl bg-[#008080] text-white font-black uppercase text-xs tracking-widest hover:bg-[#006666] transition-all flex items-center justify-center gap-2 w-full md:w-auto">
                <Save size={16} /> Save Interaction
              </button>

            </form>
          </div> : <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                      {activeMainTab === 'parent' ? 'Student' : 'Faculty'}
                    </th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Notes</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.length > 0 ? interactions.map((item, index) => <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                      <td className="p-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {activeMainTab === 'parent' ? item.student_name : item.faculty_name}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600 max-w-md">
                        {item.notes}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-500">
                        {item.academic_operation_executive_name}
                      </td>
                    </tr>) : <tr>
                      <td colSpan="4" className="p-4 md:p-8 text-center text-slate-400 font-medium">
                        No interactions found
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
          </div>}

      </div>
    </div>;
};
export default Interactions;