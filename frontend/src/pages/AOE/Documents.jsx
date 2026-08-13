import React, {  useState, useEffect , useDeferredValue } from 'react';
import api from '../../services/api';
import {
 Upload, FileText, Trash2, Download, Search,
 Plus, X, Filter, Folder, File, Activity,
 ShieldCheck, ExternalLink, Calendar, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';

const Documents = () => {
 const [documents, setDocuments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [newDoc, setNewDoc] = useState({
 title: '',
 description: '',
 file_url: '',
 category: 'General'
 });

 useEffect(() => {
 fetchDocuments();
 }, []);

 const fetchDocuments = async () => {
 try {
 const res = await api.get('/aoe/documents');
 setDocuments(res.data.data);
 } catch (error) {
 toast.error("Failed to load documents");
 } finally {
 setLoading(false);
 }
 };

 const handleUpload = async (e) => {
 e.preventDefault();
 try {
 await api.post('/aoe/documents', newDoc);
 toast.success("Document registry updated");
 setIsModalOpen(false);
 setNewDoc({ title: '', description: '', file_url: '', category: 'General' });
 fetchDocuments();
 } catch (error) {
 toast.error(error.response?.data?.message || "Upload failed");
 }
 };

 const handleDelete = async (docParam) => {
 const id = typeof docParam === 'object' ? docParam.id : docParam;
 const title = typeof docParam === 'object' ? docParam.title : 'this document';

 premiumConfirm(async () => {
 try {
 await api.delete(`/aoe/documents/${id}`);
 toast.success("Document removed");
 setDocuments(prev => prev.filter(d => d.id !== id));
 } catch (error) {
 toast.error("Deletion failed");
 }
 }, {
 name: title,
 title: 'Terminate Document Entry',
 message: `Are you sure you want to permanently remove the document "${title}"?`,
 type: 'danger'
 });
 };

 const filteredDocs = documents.filter(doc =>
 doc.title.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
 doc.category.toLowerCase().includes(deferredSearchTerm.toLowerCase())
 );

 const categories = ['General', 'Curriculum', 'Syllabus', 'Results', 'Policies', 'Faculty Guide'];

 return (
 <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
 {/* Header Section */}
 <div className="bg-white p-5 md:p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-40"></div>
 <div className="relative z-10 flex items-center gap-6">
 <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-100 -rotate-6 group hover:rotate-0 transition-all duration-500">
 <Folder size={32} />
 </div>
 <div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Institutional Repository</h1>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
 <ShieldCheck size={12} className="text-emerald-500" />
 Central vault for academic curricula, operational policies, and institutional assets
 </p>
 </div>
 </div>

 <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
 <div className="relative group w-full sm:w-80">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
 <input
 type="text"
 placeholder="Identify Document..."
 className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:bg-white focus:ring-8 ring-emerald-500/5 outline-none transition-all"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <button
 onClick={() => setIsModalOpen(true)}
 className="w-full sm:w-auto px-5 md:px-10 py-4 bg-[#008080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 hover:-translate-y-1 active:scale-95 "
 >
 <Plus size={18} /> Ingest Asset
 </button>
 </div>
 </div>

 {/* Content Area */}
 {loading ? (
 <div className="flex flex-col items-center justify-center p-32 space-y-4">
 <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Accessing Encrypted Vault...</p>
 </div>
 ) : filteredDocs.length === 0 ? (
 <div className="bg-white p-32 rounded-[4rem] text-center border-2 border-dashed border-slate-100">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
 <FileText size={48} />
 </div>
 <h3 className="text-xl font-black text-slate-900 uppercase">Repository Void</h3>
 <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-[0.2em] leading-loose max-w-sm mx-auto ">
 No academic assets detected in the current filter stack. Initiate new document ingestion.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
 {filteredDocs.map((doc) => (
 <div key={doc.id} className="bg-white rounded-[3rem] p-4 md:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-50 transition-colors duration-500"></div>

 <div className="relative z-10 flex items-start justify-between mb-8">
 <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-lg shadow-emerald-50 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
 <File size={28} />
 </div>
 <div className="text-right">
 <span className="bg-slate-50 px-4 py-1.5 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
 {doc.category}
 </span>
 </div>
 </div>

 <div className="relative z-10 mb-10">
 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-3 line-clamp-1">{doc.title}</h3>
 <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-2">
 {doc.description || "No supplemental intelligence provided."}
 </p>
 </div>

 <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
 <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest ">
 <Calendar size={12} /> {new Date(doc.created_at).toLocaleDateString()}
 </div>
 <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest justify-end">
 <User size={12} /> {doc.uploaded_by_name}
 </div>
 </div>

 <div className="relative z-10 pt-8 border-t border-slate-50 flex items-center gap-4">
 <a
 href={doc.file_url}
 target="_blank"
 rel="noreferrer"
 className="flex-1 py-4 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all border border-slate-100"
 >
 Access <ExternalLink size={14} />
 </a>
 <button
 onClick={() => handleDelete(doc)}
 className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all group/del border border-rose-100"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Ingestion Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 bg-[#008080]/60 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
 <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-500 border border-white/20 max-h-[90vh] overflow-y-auto">
 <div className="bg-[#008080] p-5 md:p-10 flex justify-between items-center relative h-32 overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32"></div>
 <div className="relative z-10 flex items-center gap-6">
 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 text-emerald-400 shadow-xl">
 <Upload size={32} />
 </div>
 <h2 className="text-2xl font-black text-white uppercase tracking-tight">Asset Ingestion</h2>
 </div>
 <button
 onClick={() => setIsModalOpen(false)}
 className="relative z-10 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 active:scale-95"
 >
 <X size={24} />
 </button>
 </div>

 <form onSubmit={handleUpload} className="p-6 md:p-12 space-y-8">
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ">Asset Title</label>
 <input
 required
 type="text"
 className="w-full px-4 md:px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-8 ring-[#008080]/5 outline-none transition-all "
 placeholder="Eg: Q3 Mathematics Syllabus"
 value={newDoc.title}
 onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ">Category</label>
 <div className="relative">
 <select
 className="w-full px-4 md:px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold appearance-none focus:bg-white outline-none transition-all "
 value={newDoc.category}
 onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
 >
 {categories.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <Filter className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ">File Source (URL)</label>
 <input
 required
 type="text"
 className="w-full px-4 md:px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:ring-8 ring-[#008080]/5 outline-none transition-all "
 placeholder="https://drive.google.com/..."
 value={newDoc.file_url}
 onChange={(e) => setNewDoc({ ...newDoc, file_url: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ">Supplied Intelligence (Description)</label>
 <textarea
 rows="4"
 className="w-full px-4 md:px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white outline-none transition-all resize-none "
 placeholder="Brief summary of document significance..."
 value={newDoc.description}
 onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
 ></textarea>
 </div>
 </div>

 <button
 type="submit"
 className="w-full py-6 bg-[#008080] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 hover:-translate-y-1 "
 >
 <ShieldCheck size={20} /> AUTHORIZE REGISTRY LOCK
 </button>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default Documents;
