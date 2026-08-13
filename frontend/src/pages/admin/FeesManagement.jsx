import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { IndianRupee, Clock, Plus, Trash2, Edit2, AlertTriangle, Users, Briefcase, Calculator, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
const FeesManagement = () => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'staff'
  const [entities, setEntities] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    total_fee: '',
    total_hours: '',
    installments: []
  });
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all entities (students or staff)
      const entitiesRes = await api.get(activeTab === 'student' ? '/admin/students' : '/admin/staff', {
        params: { page, limit }
      });
      const entitiesData = activeTab === 'student' ? entitiesRes.data.students : entitiesRes.data.data;
      setEntities(entitiesData || []);
      setTotalRecords(entitiesRes.data.total || 0);

      // 2. Fetch fee structures for the active tab
      const feesRes = await api.get(`/admin/fees/${activeTab}`);
      setFeeStructures(feesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  const openFeeModal = entity => {
    setSelectedEntity(entity);
    const existingFee = feeStructures.find(f => f.entity_id === entity.id);
    if (existingFee) {
      setFormData({
        total_fee: existingFee.total_fee,
        total_hours: existingFee.total_hours,
        installments: existingFee.installments.map(i => ({
          ...i,
          installment_date: i.installment_date ? i.installment_date.split('T')[0] : ''
        }))
      });
    } else {
      setFormData({
        total_fee: '',
        total_hours: '',
        installments: []
      });
    }
    setIsModalOpen(true);
  };
  const addInstallment = () => {
    setFormData(prev => ({
      ...prev,
      installments: [...prev.installments, {
        installment_date: '',
        installment_amount: ''
      }]
    }));
  };
  const updateInstallment = (index, field, value) => {
    const updated = [...formData.installments];
    updated[index][field] = value;
    setFormData({
      ...formData,
      installments: updated
    });
  };
  const removeInstallment = index => {
    const updated = formData.installments.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      installments: updated
    });
  };
  const saveFeeStructure = async e => {
    e.preventDefault();
    try {
      const payload = {
        entity_type: activeTab,
        entity_id: selectedEntity.id,
        total_fee: parseFloat(formData.total_fee) || 0,
        total_hours: parseFloat(formData.total_hours) || 0,
        installments: formData.installments.filter(i => i.installment_amount && i.installment_date)
      };
      await api.post('/admin/fees', payload);
      toast.success('Fee structure updated successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save fee structure');
    }
  };
  const getBlinkStatus = fee => {
    if (!fee || fee.paid_hours === 0) return null;
    const ratio = fee.consumed_hours / fee.paid_hours;
    if (ratio >= 0.9) return 'critical'; // 90%
    if (ratio >= 0.7) return 'warning'; // 70%
    return 'good';
  };
  return <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">Fee Management</h1>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Manage tuition fees and installments
          </p>
        </div>

        <div className="flex w-full md:w-auto bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab('student')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 min-h-[44px] md:min-h-0 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16} /> Students
          </button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 min-h-[44px] md:min-h-0 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Briefcase size={16} /> Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 md:p-20 gap-4 bg-white rounded-3xl border border-slate-100">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading fee data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

          {/* ── MOBILE CARDS (< md) ───────────────────────────────── */}
          <div className="md:hidden divide-y divide-slate-100">
            {entities.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 p-16 text-slate-400">
                <Briefcase size={36} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No {activeTab}s found</p>
              </div>
            ) : entities.map((entity, index) => {
              const fee = feeStructures.find(f => f.entity_id === entity.id);
              const blinkStatus = getBlinkStatus(fee);
              return (
                <div key={entity.id} className="p-4 space-y-3">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 ${activeTab === 'student' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                        {entity.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{entity.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{entity.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openFeeModal(entity)}
                      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${fee ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                      title={fee ? 'Edit Fee' : 'Add Fee'}
                    >
                      {fee ? <Edit2 size={16} /> : <Plus size={16} />}
                    </button>
                  </div>

                  {/* Fee stats pills */}
                  {fee ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fee</p>
                        <div className="flex items-center gap-0.5 font-black text-slate-800 text-sm">
                          <IndianRupee size={13} />{fee.total_fee}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hours</p>
                        <div className="flex items-center gap-1 font-black text-slate-800 text-sm">
                          <Clock size={13} />{fee.total_hours} hrs
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Paid</p>
                        <div className="flex items-center gap-0.5 font-black text-emerald-700 text-sm">
                          <IndianRupee size={13} />{fee.total_paid_amount}
                        </div>
                        <p className="text-[9px] text-emerald-500 font-bold mt-0.5">{parseFloat(fee.paid_hours).toFixed(2)} hrs paid</p>
                      </div>
                      {activeTab === 'student' && (
                        <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Consumed</p>
                          <p className="font-black text-indigo-700 text-sm">{parseFloat(fee.consumed_hours).toFixed(2)} hrs</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <IndianRupee size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-400">No fee structure set</span>
                    </div>
                  )}

                  {/* Status badge */}
                  {activeTab === 'student' && fee && fee.paid_hours > 0 && (
                    <div>
                      {blinkStatus === 'critical' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-black uppercase animate-pulse">
                          <AlertTriangle size={11} /> 90% Hours Consumed
                        </span>
                      ) : blinkStatus === 'warning' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase animate-pulse">
                          <AlertTriangle size={11} /> 70% Hours Consumed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">
                          Healthy
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {/* PAGINATION MOBILE */}
            <div className="p-4 mt-2 border-t border-slate-100 bg-slate-50">
              <Pagination 
                currentPage={page} 
                totalPages={Math.ceil(totalRecords / limit) || 1} 
                totalRecords={totalRecords} 
                onPageChange={setPage} 
              />
            </div>
          </div>

          {/* ── DESKTOP TABLE (≥ md) ─────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full min-w-full md:w-[900px] text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  <th className="p-4 pl-6 bg-slate-50">Name / Details</th>
                  <th className="p-4 bg-slate-50">Total Fee</th>
                  <th className="p-4 bg-slate-50">Total Hours</th>
                  <th className="p-4 bg-slate-50">Paid Details</th>
                  <th className="p-4 bg-slate-50">Status / Alert</th>
                  <th className="p-4 pr-6 text-right bg-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entities.map((entity, index) => {
                  const fee = feeStructures.find(f => f.entity_id === entity.id);
                  const blinkStatus = getBlinkStatus(fee);
                  return (
                    <tr key={entity.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50 w-10">{index + 1}</td>
                      <td className="p-4 pl-6">
                        <p className="text-sm font-black text-slate-900">{entity.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{entity.email}</p>
                      </td>
                      <td className="p-4">
                        {fee ? <div className="flex items-center gap-1 font-bold text-slate-700"><IndianRupee size={14} /> {fee.total_fee}</div> : <span className="text-xs text-slate-400">Not set</span>}
                      </td>
                      <td className="p-4">
                        {fee ? <div className="flex items-center gap-1 font-bold text-slate-700"><Clock size={14} /> {fee.total_hours} hrs</div> : <span className="text-xs text-slate-400">Not set</span>}
                      </td>
                      <td className="p-4">
                        {fee ? <div className="space-y-1">
                          <p className="text-xs font-black text-emerald-600 flex items-center gap-1">Paid: <IndianRupee size={12}/>{fee.total_paid_amount}</p>
                          <p className="text-[10px] font-bold text-slate-500">Paid Hrs: {parseFloat(fee.paid_hours).toFixed(2)}</p>
                          {activeTab === 'student' && <p className="text-[10px] font-bold text-indigo-500">Consumed Hrs: {parseFloat(fee.consumed_hours).toFixed(2)}</p>}
                        </div> : <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="p-4">
                        {activeTab === 'student' && fee && fee.paid_hours > 0
                          ? blinkStatus === 'critical'
                            ? <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase animate-pulse"><AlertTriangle size={12} /> 90% Consumed</span>
                            : blinkStatus === 'warning'
                              ? <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase animate-pulse"><AlertTriangle size={12} /> 70% Consumed</span>
                              : <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Healthy</span>
                          : <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button onClick={() => openFeeModal(entity)} className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ml-auto hover:bg-indigo-600 hover:text-white transition-all active:scale-95">
                          {fee ? <Edit2 size={14} /> : <Plus size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {entities.length === 0 && (
                  <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Briefcase size={32} className="opacity-20" />
                      <span>No {activeTab}s found</span>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION DESKTOP */}
          <div className="hidden md:block p-6 bg-slate-50 border-t border-slate-100">
            <Pagination 
              currentPage={page} 
              totalPages={Math.ceil(totalRecords / limit) || 1} 
              totalRecords={totalRecords} 
              onPageChange={setPage} 
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedEntity && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-4 md:px-6 py-3.5 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm md:text-lg font-black text-slate-900 uppercase truncate">Fee: {selectedEntity.name}</h2>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">{activeTab}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-11 h-11 flex items-center justify-center bg-white rounded-2xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0 border border-slate-100 text-lg">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="feeForm" onSubmit={saveFeeStructure} className="space-y-8">
                
                {/* Main Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><IndianRupee size={12} /> Total Fee</label>
                    <input type="number" required min="0" value={formData.total_fee} onChange={e => setFormData({
                  ...formData,
                  total_fee: e.target.value
                })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 ring-indigo-500/10 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> Total Hours</label>
                    <input type="number" required min="0" value={formData.total_hours} onChange={e => setFormData({
                  ...formData,
                  total_hours: e.target.value
                })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 ring-indigo-500/10 outline-none" />
                  </div>
                  
                  {formData.total_fee && formData.total_hours && <div className="col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                      <Calculator className="text-indigo-500" />
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Calculated Hourly Rate</p>
                        <p className="text-lg font-black text-indigo-700">₹ {(formData.total_fee / formData.total_hours).toFixed(2)} / hr</p>
                      </div>
                    </div>}
                </div>

                {/* Installments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Installments</h3>
                    <button type="button" onClick={addInstallment} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all">
                      <Plus size={14} /> Add Installment
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.installments.map((inst, index) => {
                  const hourlyRate = formData.total_fee && formData.total_hours ? formData.total_fee / formData.total_hours : 0;
                  const calculatedHours = hourlyRate > 0 && inst.installment_amount ? (inst.installment_amount / hourlyRate).toFixed(2) : 0;
                  return <div key={index} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl relative group">
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Paid Date</label>
                            <input type="date" required value={inst.installment_date} onChange={e => updateInstallment(index, 'installment_date', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Amount</label>
                            <input type="number" required min="0" value={inst.installment_amount} onChange={e => updateInstallment(index, 'installment_amount', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="₹0" />
                          </div>
                          <div className="flex-1 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Auto Paid Hrs</label>
                            <p className="text-sm font-black text-slate-700">{calculatedHours} hrs</p>
                          </div>
                          <button type="button" onClick={() => removeInstallment(index)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shrink-0">
                            <Trash2 size={16} />
                          </button>
                        </div>;
                })}
                    {formData.installments.length === 0 && <div className="p-4 md:p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                        <p className="text-xs font-bold text-slate-400">No installments added yet</p>
                      </div>}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="w-full md:w-auto min-h-[44px] px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase hover:bg-slate-200 transition-all">Cancel</button>
              <button form="feeForm" type="submit" className="w-full md:w-auto min-h-[44px] px-4 md:px-8 py-3 rounded-xl text-xs font-black text-white uppercase bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">Save Details</button>
            </div>
          </div>
        </div>}

    </div>;
};
export default FeesManagement;