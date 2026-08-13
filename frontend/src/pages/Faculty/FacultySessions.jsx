import React, {  useState, useEffect , useDeferredValue } from 'react';
import axios from '../../services/api';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Search,
  BookOpen,
  User,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const FacultySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
	const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/faculty/sessions');
      if (res.data.success) setSessions(res.data.data);
    } catch (error) {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.topic.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
    (s.student_name && s.student_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="bg-white/70 backdrop-blur-xl p-5 md:p-10 rounded-[40px] border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#008080] text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-[#008080]/20">
            <Calendar size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">Recorded Sessions</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               <Activity size={12} className="text-[#008080]" /> 
               Auto-synced from your Daily Class Updates
            </p>
          </div>
        </div>

        <div className="relative group w-full md:w-96">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" size={18} />
           <input 
             type="text"
             placeholder="Search by student or topic..."
             className="w-full bg-white border border-slate-100 pl-14 pr-6 py-4 rounded-[20px] text-xs font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-[#008080]/5 focus:border-[#008080] transition-all"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* Sessions Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="h-64 bg-white/50 rounded-[40px] border border-slate-50 animate-pulse"></div>
           ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSessions.map((session) => (
            <div 
              key={session.id} 
              className="bg-white p-5 md:p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={28} />
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                     CONCLUDED
                   </span>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> {session.duration || 'N/A'}
                   </span>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                 <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={12} /> SESSION TOPIC
                 </p>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase group-hover:text-[#008080] transition-colors line-clamp-2">
                   {session.topic}
                 </h3>
              </div>

              <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-[#008080]/10 group-hover:text-[#008080] transition-all">
                      <User size={18} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enrolled Student</p>
                      <p className="text-xs font-black text-slate-800 uppercase">{session.student_name || 'Individual'}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                   <p className="text-xs font-black text-slate-800">{new Date(session.date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[50px] border border-slate-100 shadow-sm animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-8">
             <Calendar size={48} />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tight ">No sessions recorded yet</h3>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 max-w-xs mx-auto">
             Submit a "Daily Class Update" for your students to see session records appear here automatically.
           </p>
        </div>
      )}
    </div>
  );
};

export default FacultySessions;
