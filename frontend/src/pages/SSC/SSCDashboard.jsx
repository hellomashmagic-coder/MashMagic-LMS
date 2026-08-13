import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Activity, 
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SSCDashboard = () => {
  const [stats, setStats] = useState({
    activeStudents: 0,
    mentorsSyncing: 0,
    successRate: '0%',
    pendingReviews: 0,
    recentInteractions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/mentor/dashboard');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching SSC dashboard data:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statItems = [
    { label: 'Active Students', value: stats.activeStudents, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Mentors Syncing', value: stats.mentorsSyncing, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Success Rate', value: stats.successRate, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Reviews', value: stats.pendingReviews, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-b-indigo-600">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SSC Intelligence Dashboard</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Student Success Coordination • Academic Department</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            Term: Q2 2026
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{loading ? '...' : stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-5 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full min-h-[400px]">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recent Interactions Feed</h3>
          </div>
          
          <div className="flex-1 space-y-6 overflow-y-auto max-h-[300px] pr-2">
            {stats.recentInteractions && stats.recentInteractions.length > 0 ? (
              stats.recentInteractions.map((log, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight">{log.student_name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(log.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-relaxed italic">"{log.remarks || 'No notes provided'}"</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 md:py-12">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <Activity size={24} />
                </div>
                <h4 className="text-sm font-black text-slate-600 uppercase">No Recent Activity</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Interactions feed will populate as mentors sync logs</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#008080] p-5 md:p-10 rounded-[2.5rem] shadow-xl text-white flex flex-col h-full min-h-[400px]">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-white">SSC Workflow Status</h3>
          </div>
          
          <div className="flex-1 space-y-6">
            {[
              { task: 'Database Mapping', status: 'Completed', color: 'text-emerald-400' },
              { task: 'Mentor Assignment Tracking', status: 'Active', color: 'text-indigo-400' },
              { task: 'Academic Progress Sync', status: 'Active', color: 'text-indigo-400' },
              { task: 'Success Reporting Module', status: 'Active', color: 'text-indigo-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                <span className="text-[11px] font-black uppercase tracking-widest">{item.task}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSCDashboard;
