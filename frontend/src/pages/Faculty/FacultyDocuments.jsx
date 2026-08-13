import React, {  useState, useEffect , useDeferredValue } from 'react';
import axios from '../../services/api';
import {
 Files,
 Upload,
 Trash2,
 FileText,
 Download,
 Plus,
 MoreHorizontal,
 Search,
 Clock,
 Eye,
 FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';

const FacultyDocuments = () => {
 const [documents, setDocuments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isUploading, setIsUploading] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);

 useEffect(() => {
 fetchDocuments();
 }, []);

 const fetchDocuments = async () => {
 try {
 const res = await axios.get('/faculty/documents');
 if (res.data.success) setDocuments(res.data.data);
 } catch (error) {
 toast.error("Failed to load documents");
 } finally {
 setLoading(false);
 }
 };

 const handleUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 const title = prompt("Enter document title:", file.name);
 if (!title) return;

 const formData = new FormData();
 formData.append('file', file);
 formData.append('title', title);

 setIsUploading(true);
 try {
 const res = await axios.post('/faculty/documents', formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 if (res.data.success) {
 toast.success("Document stored successfully");
 fetchDocuments();
 }
 } catch (error) {
 toast.error("Upload failed");
 } finally {
 setIsUploading(false);
 }
 };

 const handleDelete = async (docParam) => {
 const id = typeof docParam === 'object' ? docParam.id : docParam;
 const title = typeof docParam === 'object' ? docParam.title : 'this document';

 premiumConfirm(async () => {
 try {
 const res = await axios.delete(`/faculty/documents/${id}`);
 if (res.data.success) {
 toast.success("Document purged");
 fetchDocuments();
 }
 } catch (error) {
 toast.error("Deletion failed");
 }
 }, {
 name: title,
 title: 'Delete Asset',
 message: `Are you sure you want to permanently delete the document "${title}"? This action will remove it from the database forever and cannot be recovered.`,
 type: 'danger'
 });
 };

 const filteredDocs = documents.filter(doc =>
 doc.title.toLowerCase().includes(deferredSearchTerm.toLowerCase())
 );

 const getFileIcon = (type) => {
 if (type?.includes('pdf')) return <span className="text-rose-500 font-black">PDF</span>;
 if (type?.includes('word') || type?.includes('docx')) return <span className="text-[#008080] font-black">DOCX</span>;
 if (type?.includes('image')) return <span className="text-emerald-500 font-black">IMG</span>;
 return <span className="text-slate-600 font-black">FILE</span>;
 };

 return (
 <div className="space-y-12">
 {/* Header Area */}
 <div className="flex flex-col md:flex-row justify-between items-center gap-8">
 <div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase ">Resource Vault</h2>
 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Manage study materials and academic assets</p>
 </div>

 <div className="flex items-center gap-4">
 <input
 type="file"
 id="doc-upload"
 className="hidden"
 onChange={handleUpload}
 />
 <label
 htmlFor="doc-upload"
 className={`flex items-center gap-4 px-5 md:px-10 py-5 bg-[#008080] text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-[#008080] transition-all shadow-2xl shadow-[#008080]/30 ${isUploading ? 'opacity-50 cursor-wait' : ''
 }`}
 >
 {isUploading ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
 {isUploading ? 'Encrypting & Syncing...' : 'Upload Academic Asset'}
 </label>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
 <div className="relative flex-1 group">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#008080] transition-colors" size={18} />
 <input
 type="text"
 placeholder="Search assets by title..."
 className="w-full pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <div className="flex items-center gap-3 px-4 md:px-8 border-l border-slate-100">
 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Total Assets</p>
 <p className="text-xl font-black text-slate-900 tabular-nums">{documents.length}</p>
 </div>
 </div>

 {/* Documents List */}
 <div className="grid grid-cols-1 gap-4">
 {loading ? (
 [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-[2rem] animate-pulse"></div>)
 ) : filteredDocs.length > 0 ? (
 filteredDocs.map((doc) => (
 <div key={doc.id} className="bg-white p-4 pl-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#008080] transition-all duration-500 group flex items-center justify-between">
 <div className="flex items-center gap-8">
 <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-[#008080]/10 group-hover:border-[#008080] transition-colors overflow-hidden">
 <div className="text-[8px] flex flex-col items-center">
 <FileText size={20} className="text-slate-600 group-hover:text-[#008080] transition-colors mb-1" />
 {getFileIcon(doc.file_type)}
 </div>
 </div>
 <div>
 <h4 className="font-black text-slate-900 tracking-tight group-hover:text-[#008080] transition-colors">{doc.title}</h4>
 <div className="flex items-center gap-4 mt-1.5 font-black text-[9px] text-slate-600 uppercase tracking-widest">
 <span className="flex items-center gap-1.5"><Clock size={10} /> {new Date(doc.created_at).toLocaleDateString()}</span>
 <span className="flex items-center gap-1.5">• Cloud Storage Active</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 pr-4">
 <a
 href={doc.file_url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-4 bg-slate-50 text-slate-600 hover:bg-[#008080] hover:text-white rounded-2xl transition-all duration-500 group/btn"
 >
 <Eye size={18} className="group-hover/btn:scale-110 transition-transform" />
 </a>
 <a
 href={doc.file_url}
 download
 className="p-4 bg-slate-50 text-slate-600 hover:bg-[#008080] hover:text-white rounded-2xl transition-all duration-500 group/btn"
 >
 <Download size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />
 </a>
 <button
 onClick={() => handleDelete(doc)}
 className="p-4 bg-slate-50 text-rose-300 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-500"
 >
 <Trash2 size={18} />
 </button>
 <button className="p-4 text-slate-300 hover:text-slate-900 transition-colors">
 <MoreHorizontal size={18} />
 </button>
 </div>
 </div>
 ))
 ) : (
 <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
 <FolderOpen size={48} />
 </div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tight ">Resource Vault Empty</h3>
 <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Start uploading study materials and academic assets</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default FacultyDocuments;
