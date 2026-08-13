import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import {
  Users,
  ClipboardList,
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const isTeal = color.includes('008080') || color.includes('14B8A6');
  const displayColor = isTeal ? 'bg-[#008080]' : color;
  
  return (
    <div className="bg-white/80 backdrop-blur-xl p-4 md:p-8 rounded-[32px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${displayColor} opacity-[0.05] rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      <div className="flex flex-col gap-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 ${displayColor.replace('bg-', 'text-')} bg-slate-50/50 rounded-[20px] flex items-center justify-center border border-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12`}>
            <Icon size={28} strokeWidth={2.5} />
          </div>
          {trend && (
            <div className="bg-emerald-50/50 border border-emerald-100 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{trend}</span>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-slate-800 tabular-nums tracking-tighter leading-none mb-3">{value || 0}</h3>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none">{title}</p>
        </div>
      </div>
    </div>
  );
};

const FacultyDashboard = () => {
  const [stats, setStats] = useState({
    badges: { totalStudents: 0, pendingReports: 0, upcomingSessions: 0, completedSessions: 0, pendingTasks: 0 },
    charts: { performance: [], attendance: [] }
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchStats = async () => {
      try {
        const res = await axios.get('/faculty/dashboard');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Header Section */}
      <div className="bg-white/70 backdrop-blur-xl p-6 md:p-10 rounded-[32px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 ">Faculty Oversight</h2>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-2">
            Monitor student progress and academic performance
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50/50 px-6 py-4 rounded-[20px] border border-slate-100/50 shadow-inner">
          <CalendarDays size={16} strokeWidth={3} className="text-[#008080]" />
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <StatCard
          title="Assigned Students"
          value={stats?.badges?.totalStudents || 0}
          icon={Users}
          color="bg-[#008080]"
          trend="+2 Active Students"
        />
        <StatCard
          title="Pending Reports"
          value={stats?.badges?.pendingReports || 0}
          icon={ClipboardList}
          color="bg-rose-500"
        />
        <StatCard
          title="Upcoming Schedules"
          value={stats?.badges?.upcomingSessions || 0}
          icon={CalendarDays}
          color="bg-[#6366F1]"
        />
        <StatCard
          title="Session Success"
          value={stats?.badges?.completedSessions || 0}
          icon={CheckCircle}
          color="bg-[#10B981]"
        />
        <StatCard
          title="Pending Tasks"
          value={stats?.badges?.pendingTasks || 0}
          icon={AlertCircle}
          color="bg-[#F59E0B]"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-10">
        {/* Performance Bar Chart */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-700">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance Distribution</h3>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-1">Student Academic Status</p>
            </div>
            <div className="w-12 h-12 bg-[#008080]/10 rounded-2xl flex items-center justify-center text-[#008080]">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {mounted && stats && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={(stats?.charts?.performance || []).map(entry => ({
                  ...entry,
                  displayStatus: entry.status === 'Green' ? 'Good' : entry.status === 'Yellow' ? 'Average' : entry.status === 'Red' ? 'Poor' : entry.status
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayStatus"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                    {(stats?.charts?.performance || []).map((entry, index) => {
                      const fillColors = {
                        'Green': '#008080',
                        'Yellow': '#F59E0B',
                        'Red': '#EF4444'
                      };
                      const fill = fillColors[entry.status] || '#94a3b8';
                      return (
                        <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.8} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Attendance Line Chart */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-12 rounded-[40px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-700">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Attendance Overview</h3>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-1">7-Day Attendance Trend (%)</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
              <Calendar size={24} />
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {mounted && stats && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={stats?.charts?.attendance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    dy={10}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#008080"
                    strokeWidth={4}
                    dot={{ r: 6, fill: '#008080', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Engine Status */}
      <div className="bg-[#008080] p-6 md:p-12 rounded-[40px] relative overflow-hidden group shadow-2xl shadow-[#008080]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#008080]/20 rounded-full -mr-48 -mt-48 blur-[100px] transition-all duration-1000 group-hover:scale-150"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none mb-4">System Status</h2>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">All systems operating normally</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
            <button className="bg-gradient-to-br from-[#006666] to-[#008080] text-white px-5 md:px-10 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-[#008080]/40 hover:-translate-y-1 transition-all">
              Generate Summary Report
            </button>
            <button className="bg-slate-800 text-white px-5 md:px-10 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-700 transition-all">
              Sync Attendance Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
