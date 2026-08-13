import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, FileText, Search, MessageSquare, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const AHInteractions = () => {
  const [activeTab, setActiveTab] = useState('parent'); // 'parent' or 'faculty'
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchInteractions();
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'parent' 
        ? `/admin/ah-parent-interactions?page=${page}&limit=${limit}` 
        : `/admin/ah-faculty-interactions?page=${page}&limit=${limit}`;
      const res = await api.get(endpoint);
      setInteractions(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch interactions');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Academic Head Interactions</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">View Parent & Faculty Interactions Logged by Academic Head</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button onClick={() => setActiveTab('parent')} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${activeTab === 'parent' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Users size={16} /> Parent Interactions
          </button>
          <button onClick={() => setActiveTab('faculty')} className={`pb-4 px-2 font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${activeTab === 'faculty' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Briefcase size={16} /> Faculty Interactions
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? <div className="p-6 md:p-12 text-center text-slate-400 font-medium">Loading records...</div> : <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                      {activeTab === 'parent' ? 'Student' : 'Faculty'}
                    </th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Notes / Details</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.length > 0 ? interactions.map((item, index) => <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50"><td className="p-6 text-sm font-black text-slate-400 border-b border-slate-50">{index + 1}</td>
                      <td className="p-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {activeTab === 'parent' ? item.student_name : item.faculty_name}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600 max-w-md">
                        {item.notes}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                        {item.academic_head_name}
                      </td>
                    </tr>) : <tr>
                      <td colSpan="4" className="p-4 md:p-8 text-center text-slate-400 font-medium">
                        No interactions found for this category
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>}
            
          {totalPages > 1 && (
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              totalRecords={totalRecords} 
              onPageChange={setPage} 
              entityName="Interactions"
            />
          )}
        </div>

      </div>
    </div>;
};
export default AHInteractions;