import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, MoreVertical, Edit2, Trash2, Eye, FileText, CheckCircle2, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MobileCard from '../../components/common/MobileCard';

const ExamScores = ({ initialData, onRefresh }) => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'academic_head';

  const [scores, setScores] = useState(initialData || []);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    student_id: '',
    subject: '',
    exam_name: '',
    score: '',
    total_marks: '100'
  });

  useEffect(() => {
    setScores(initialData || []);
  }, [initialData]);

  const handleAddClick = () => {
    if (!isAcademicHead) return;
    setFormData({ student_id: '', subject: '', exam_name: '', score: '', total_marks: '100' });
    setSelectedScore(null);
    setShowAddEditModal(true);
  };

  const handleEditClick = (score) => {
    if (!isAcademicHead) return;
    setFormData({
      student_id: score.student_id,
      subject: score.subject || 'General',
      exam_name: score.exam_name || 'Unit Test',
      score: score.score,
      total_marks: score.total_marks || '100'
    });
    setSelectedScore(score);
    setShowAddEditModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!isAcademicHead) return;
    if (!window.confirm("Are you sure you want to delete this exam score?")) return;
    try {
      await api.delete(`/academic-head/exam-scores/${id}`);
      toast.success("Exam score deleted");
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete score");
    }
  };

  const handleViewClick = (score) => {
    setSelectedScore(score);
    setShowViewModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.score) > parseFloat(formData.total_marks)) {
      toast.error("Marks obtained cannot exceed Total marks.");
      return;
    }
    try {
      if (selectedScore) {
        await api.put(`/academic-head/exam-scores/${selectedScore.id}`, formData);
        toast.success("Exam score updated");
      } else {
        await api.post('/academic-head/exam-scores', formData);
        toast.success("Exam score added");
      }
      setShowAddEditModal(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const filteredScores = scores.filter(s => 
    s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.exam_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header and Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <FileText className="text-blue-500" /> Exam Scores
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search scores..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {isAcademicHead && (
            <button 
              onClick={handleAddClick}
              className="h-10 px-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <PlusCircle size={16} /> Add Score
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Student</th>
              <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject</th>
              <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Exam Name</th>
              <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Score</th>
              <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredScores.length === 0 && (
              <tr><td colSpan="5" className="py-8 text-center text-xs font-bold text-slate-400">No exam scores available.</td></tr>
            )}
            {filteredScores.map((item) => {
               const marks = parseFloat(item.score || 0);
               const total = parseFloat(item.total_marks || 100);
               const percentage = Math.round((marks / total) * 100);
               return (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-4 text-xs font-black text-slate-900 uppercase">{item.student_name}</td>
                <td className="py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.subject || 'General'}</td>
                <td className="py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.exam_name || 'Unit Test'}</td>
                <td className="py-4 text-xs font-black text-blue-600">{item.score}/{item.total_marks || 100} <span className="text-[10px] text-slate-400 ml-1">({percentage}%)</span></td>
                <td className="py-4 flex items-center gap-2">
                  <button onClick={() => handleViewClick(item)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Eye size={14}/></button>
                  {isAcademicHead && (
                    <>
                      <button onClick={() => handleEditClick(item)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"><Edit2 size={14}/></button>
                      <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><Trash2 size={14}/></button>
                    </>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-4">
        {filteredScores.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-black text-slate-700">No Exam Scores</h3>
            <p className="text-xs font-medium text-slate-500 mt-1 mb-6">There are no exam scores available yet.</p>
            {isAcademicHead && (
              <button onClick={handleAddClick} className="w-full h-10 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <PlusCircle size={14} /> Add First Exam Score
              </button>
            )}
          </div>
        ) : (
          filteredScores.map(item => {
            const marks = parseFloat(item.score || 0);
            const total = parseFloat(item.total_marks || 100);
            const percentage = Math.round((marks / total) * 100);
            const passed = percentage >= 35;

            const actions = [{ icon: <Eye size={12} />, label: 'View Details', onClick: () => handleViewClick(item) }];
            if (isAcademicHead) {
              actions.push({ icon: <Edit2 size={12} />, label: 'Edit', onClick: () => handleEditClick(item) });
              actions.push({ icon: <Trash2 size={12} />, label: 'Delete', danger: true, onClick: () => handleDeleteClick(item.id) });
            }

            return (
              <MobileCard
                key={item.id}
                isExpanded={false}
                onToggle={() => {}}
                avatar={
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-inner ${passed ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' : 'bg-gradient-to-br from-rose-400 to-rose-500'}`}>
                    <span className="text-[10px]">{percentage}%</span>
                  </div>
                }
                title={item.student_name}
                subtitle={`${item.subject || 'General'} - ${item.exam_name || 'Unit Test'}`}
                badges={[
                  <div key="status" className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {passed ? 'Passed' : 'Failed'}
                  </div>
                ]}
                metrics={[
                  { icon: <FileText size={12}/>, value: `${marks} / ${total}` }
                ]}
                moreActions={actions}
              />
            );
          })
        )}
      </div>

      {/* Modals */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-tight">{selectedScore ? 'Edit Exam Score' : 'Add Exam Score'}</h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm border border-slate-100"><X size={16}/></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {!selectedScore && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student (ID)</label>
                  <input type="text" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required placeholder="Student ID" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} disabled={!!selectedScore} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50" required placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Name</label>
                <input type="text" value={formData.exam_name} onChange={e => setFormData({...formData, exam_name: e.target.value})} disabled={!!selectedScore} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50" required placeholder="e.g. Mid Term" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marks Obtained</label>
                  <input type="number" step="0.1" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Marks</label>
                  <input type="number" step="0.1" value={formData.total_marks} onChange={e => setFormData({...formData, total_marks: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100">
                <button type="submit" className="w-full h-12 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                  {selectedScore ? 'Save Changes' : 'Add Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-tight">Score Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm border border-slate-100"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student</span>
                <p className="text-sm font-bold text-slate-900 break-words">{selectedScore.student_name}</p>
                {selectedScore.grade && <p className="text-xs font-medium text-slate-500 mt-1">Grade: {selectedScore.grade}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                  <p className="text-sm font-bold text-slate-700 break-words">{selectedScore.subject || 'General'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exam</span>
                  <p className="text-sm font-bold text-slate-700 break-words">{selectedScore.exam_name || 'Unit Test'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Marks</span>
                  <p className="text-lg font-black text-blue-600">{selectedScore.score} <span className="text-xs text-slate-400 font-medium">/ {selectedScore.total_marks || 100}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Percentage</span>
                  <p className="text-lg font-black text-slate-700">{Math.round((parseFloat(selectedScore.score || 0) / parseFloat(selectedScore.total_marks || 100)) * 100)}%</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                 <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${Math.round((parseFloat(selectedScore.score || 0) / parseFloat(selectedScore.total_marks || 100)) * 100) >= 35 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {Math.round((parseFloat(selectedScore.score || 0) / parseFloat(selectedScore.total_marks || 100)) * 100) >= 35 ? 'Passed' : 'Failed'}
                 </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Added By</span>
                  <span className="text-[10px] font-bold text-slate-700">{selectedScore.added_by || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</span>
                  <span className="text-[10px] font-bold text-slate-700">{new Date(selectedScore.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamScores;
