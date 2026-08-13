import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, CheckCircle2, TrendingUp, Activity, Clock, User, 
  Loader2, Target, ShieldAlert, RefreshCw, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const MentorHeadDashboard = () => {
  const [stats, setStats] = useState({
    totalMentors: 0,
    totalInteractions: 0,
    avgEfficiency: 0,
    totalFaculties: 0
  });
  const [dailySummary, setDailySummary] = useState({
    totalStudents: 0,
    checkedToday: 0,
    remaining: 0
  });
  const [examData, setExamData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [coverageData, setCoverageData] = useState([]);
  const [highRiskData, setHighRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [mentorName, filterDate]);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const activityParams = {};
      if (mentorName) activityParams.mentor_name = mentorName;
      if (filterDate) activityParams.date = filterDate;

      const [statsRes, activitiesRes, summaryRes, examRes, coverageRes, riskRes] = await Promise.all([
        axios.get('/api/mentor-head/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/mentor-head/activities', { headers: { Authorization: `Bearer ${token}` }, params: activityParams }),
        axios.get('/api/mentor-head/daily-summary', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/mentor-head/exam-analytics', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/mentor-interactions/weekly-coverage', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/mentor-interactions/high-risk-students', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) {
        const mentors = statsRes.data.data;
        const totalInteractions = mentors.reduce((acc, curr) => acc + parseInt(curr.completed_count || 0), 0);
        setStats({
          totalMentors: mentors.length,
          totalInteractions,
          avgEfficiency: mentors.length > 0 ? (totalInteractions / mentors.length).toFixed(1) : 0,
          totalFaculties: statsRes.data.totalFaculties || 0
        });
      }

      if (activitiesRes.data.success) setActivities(activitiesRes.data.data);
      if (summaryRes.data.success) setDailySummary(summaryRes.data.data);
      if (examRes.data.success) setExamData(examRes.data.data);
      if (coverageRes.data.success) setCoverageData(coverageRes.data.data);
      if (riskRes.data.success) setHighRiskData(riskRes.data.data);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#008080] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      
      {/* Page Title (Hero Section) */}
      <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:shadow-md transition-all duration-300">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Operations Dashboard</h2>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1.5 md:gap-2">
            <TrendingUp size={14} className="text-[#008080] shrink-0" />
            <span className="truncate">Centralized oversight of mentor network performance</span>
          </p>
        </div>
      </div>

      {/* Stats Overview (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md md:hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex flex-col justify-between h-auto">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-[#008080]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#008080] group-hover:scale-110 transition-transform duration-300 shrink-0">
              <Users size={16} className="md:w-6 md:h-6" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black text-[#008080] uppercase tracking-widest bg-[#008080]/10 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">Active</span>
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{stats.totalMentors}</h3>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] mt-1 truncate">Mentors</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md md:hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex flex-col justify-between h-auto">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <User size={16} className="md:w-6 md:h-6" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">Active</span>
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{stats.totalFaculties}</h3>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] mt-1 truncate">Faculties</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md md:hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex flex-col justify-between h-auto">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <CheckCircle2 size={16} className="md:w-6 md:h-6" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-50 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">Done</span>
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{stats.totalInteractions}</h3>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] mt-1 truncate">Interactions</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md md:hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex flex-col justify-between h-auto">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <TrendingUp size={16} className="md:w-6 md:h-6" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-50 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">Avg</span>
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{stats.avgEfficiency}</h3>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] mt-1 truncate">Updates/Mentor</p>
          </div>
        </div>
      </div>

      {/* Daily Student Verification Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5">
        <div className="lg:col-span-2 grid grid-cols-3 gap-3 md:gap-5">
          <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center text-center col-span-3 md:col-span-1 min-h-[90px] hover:shadow-md transition-all duration-300">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-slate-600 mx-auto mb-1 md:mb-2" />
            <h3 className="text-2xl md:text-3xl font-black text-slate-900">{dailySummary.totalStudents}</h3>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Total Students</p>
          </div>
          <div className="bg-emerald-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col justify-center text-center col-span-1 min-h-[100px] hover:shadow-md transition-all duration-300">
            <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8 text-emerald-500 mx-auto mb-1 md:mb-2" />
            <h3 className="text-xl md:text-3xl font-black text-emerald-700">{dailySummary.checkedToday}</h3>
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">Checked</p>
          </div>
          <div className="bg-rose-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-rose-100 shadow-sm flex flex-col justify-center text-center col-span-1 min-h-[100px] hover:shadow-md transition-all duration-300">
            <ShieldAlert className="w-5 h-5 md:w-8 md:h-8 text-rose-500 mx-auto mb-1 md:mb-2" />
            <h3 className="text-xl md:text-3xl font-black text-rose-700">{dailySummary.remaining}</h3>
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-rose-600 mt-1">Remaining</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[160px] md:min-h-[200px] hover:shadow-md transition-all duration-300">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 md:mb-4">Verification Progress</h4>
          {dailySummary.totalStudents > 0 ? (
            <div className="h-24 md:h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Checked', value: dailySummary.checkedToday },
                      { name: 'Remaining', value: dailySummary.remaining }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#008080" />
                    <Cell fill="#e11d48" />
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} Students`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Activity size={24} className="mb-2" />
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Exam Score Analytics & High Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
        
        {/* Academic Performance */}
        <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-[#008080]/5 rounded-full -mr-16 -mt-16 md:-mr-32 md:-mt-32 blur-2xl md:blur-3xl transition-transform duration-1000 group-hover:scale-125"></div>
          <div className="flex justify-between items-start md:items-center mb-4 md:mb-6 relative z-10 gap-2">
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase leading-tight">Academic Performance</h3>
              <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">Cross-cohort success rate</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <Target size={16} className="md:w-5 md:h-5" />
            </div>
          </div>

          <div className="h-[180px] md:h-[220px] w-full relative z-10">
            {examData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={examData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="percentage"
                    nameKey="subject"
                    label={({ name, percent }) => `${name.substring(0, 3)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                  >
                    {examData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#008080' : '#14b8a6'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Activity size={32} className="mb-2 opacity-50" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Analytics pending sync</p>
              </div>
            )}
          </div>
        </div>

        {/* High Risk Students List */}
        <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start md:items-center mb-4 md:mb-6 gap-2">
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <ShieldAlert className="text-rose-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                High-Risk Students
              </h3>
              <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">Priority 1 Attention Required</p>
            </div>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] md:max-h-[250px] pr-2 custom-scrollbar">
            {highRiskData.length > 0 ? highRiskData.map((student) => (
              <div key={student.id} className="flex flex-row items-center justify-between p-3 md:p-4 bg-rose-50 border border-rose-100 rounded-[1.25rem] gap-3 active:scale-[0.99] transition-transform duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black shrink-0 text-xs md:text-base">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs md:text-sm truncate">{student.name}</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-rose-600 uppercase tracking-widest truncate">Flagged Priority</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 block">Mentor</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-700 block truncate max-w-[80px] md:max-w-[120px]">{student.mentor_name || 'N/A'}</span>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-6">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No immediate risk flagged</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Coverage Report Tracking */}
      <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Calendar className="text-[#008080] w-5 h-5 md:w-6 md:h-6 shrink-0" />
              Mentorship Coverage
            </h3>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">Rotation compliance monitoring</p>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left">
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mentor</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">DEEP</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">MEDIUM</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QUICK</th>
                <th className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {coverageData.map((student) => (
                <tr key={student.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-4 first:rounded-l-2xl border-y border-l border-slate-50 group-hover:border-[#008080]/20">
                    <div className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{student.name}</div>
                  </td>
                  <td className="px-5 py-4 border-y border-slate-50 group-hover:border-[#008080]/20">
                    <div className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{student.mentor_name}</div>
                  </td>
                  <td className="px-5 py-4 border-y border-slate-50 group-hover:border-[#008080]/20">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      student.priority_category === 'High' ? 'bg-rose-50 text-rose-600' :
                      student.priority_category === 'Medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {student.priority_category}
                    </span>
                  </td>
                  <td className="px-5 py-4 border-y border-slate-50 group-hover:border-[#008080]/20 text-center">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto font-black text-xs ${
                      student.deep_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {student.deep_count}
                    </div>
                  </td>
                  <td className="px-5 py-4 border-y border-slate-50 group-hover:border-[#008080]/20 text-center">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mx-auto font-black text-xs text-slate-600">
                      {student.medium_count}
                    </div>
                  </td>
                  <td className="px-5 py-4 border-y border-slate-50 group-hover:border-[#008080]/20 text-center">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mx-auto font-black text-xs text-slate-600">
                      {student.quick_count}
                    </div>
                  </td>
                  <td className="px-5 py-4 last:rounded-r-2xl border-y border-r border-slate-50 group-hover:border-[#008080]/20">
                    {(student.priority_category === 'High' && student.deep_count < 1) ? (
                      <span className="flex items-center gap-1.5 text-rose-500 font-black text-[9px] uppercase tracking-widest">
                        <ShieldAlert size={12} /> Missed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                        <CheckCircle2 size={12} /> Compliant
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKED CARDS */}
        <div className="md:hidden flex flex-col gap-3">
          {coverageData.map((student) => (
            <div key={student.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0 pr-2">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{student.name}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{student.mentor_name}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${
                  student.priority_category === 'High' ? 'bg-rose-100 text-rose-700' :
                  student.priority_category === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {student.priority_category}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-xl p-2 text-center flex flex-col items-center justify-center border ${student.deep_count > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest mb-0.5">Deep</span>
                  <span className="text-sm font-black">{student.deep_count}</span>
                </div>
                <div className="bg-white rounded-xl p-2 text-center flex flex-col items-center justify-center border border-slate-200 text-slate-600">
                  <span className="text-[8px] font-black uppercase tracking-widest mb-0.5 text-slate-400">Med</span>
                  <span className="text-sm font-black">{student.medium_count}</span>
                </div>
                <div className="bg-white rounded-xl p-2 text-center flex flex-col items-center justify-center border border-slate-200 text-slate-600">
                  <span className="text-[8px] font-black uppercase tracking-widest mb-0.5 text-slate-400">Quick</span>
                  <span className="text-sm font-black">{student.quick_count}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                {(student.priority_category === 'High' && student.deep_count < 1) ? (
                  <span className="flex items-center gap-1 text-rose-500 font-black text-[9px] uppercase tracking-widest">
                    <ShieldAlert size={12} /> Missed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Compliant
                  </span>
                )}
              </div>
            </div>
          ))}
          {coverageData.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No coverage data</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Feed Section */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px] hover:shadow-md transition-all duration-300">
        <div className="p-5 md:p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="text-[#008080] w-5 h-5 md:w-6 md:h-6 shrink-0" />
                Live Activity Feed
              </h3>
              <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Real-time mentor updates</p>
            </div>
            
            <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:flex-none min-w-[120px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080]">
                  <User size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Mentor"
                  className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#008080]/10 min-h-[40px] md:min-h-[44px]"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                />
              </div>
              <div className="relative group flex-1 md:flex-none min-w-[130px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080]">
                  <Calendar size={14} />
                </div>
                <input
                  type="date"
                  className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#008080]/10 min-h-[40px] md:min-h-[44px]"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <div className="hidden sm:block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 whitespace-nowrap">
                  {lastSynced || 'Just now'}
                </div>
                <button onClick={fetchDashboardData} disabled={loading} title="Refresh Data" className="p-2.5 md:p-3 bg-[#008080]/10 text-[#008080] rounded-xl hover:bg-[#008080] hover:text-white transition-all active:scale-[0.95] min-h-[40px] md:min-h-[44px] min-w-[40px] flex items-center justify-center shrink-0">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8">
          {activities.length > 0 ? (
            <div className="space-y-5 md:space-y-6 relative before:absolute before:inset-0 before:ml-4 md:before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
              {activities.map((activity) => (
                <div key={activity.log_id} className="relative flex items-start md:items-center gap-3 md:gap-6 group">
                  <div className="flex items-center justify-center w-8 h-8 md:w-12 md:h-12 mt-1 md:mt-0 rounded-full border-2 md:border-4 border-white bg-slate-50 shadow-sm shrink-0 z-10 md:group-hover:scale-110 transition-transform duration-300">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#008080] rounded-full animate-pulse"></div>
                  </div>

                  <div className="flex-1 p-4 md:p-6 bg-white rounded-[1.25rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md md:hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 md:mb-3 gap-1 md:gap-2">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="shrink-0 inline-block text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[#008080] bg-[#008080]/10 px-2 py-0.5 rounded-md">
                            {activity.type || 'Update'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs md:text-sm truncate">{activity.mentor_name}</h4>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div className="flex items-center gap-1 text-[#008080]">
                          <Clock size={10} className="md:w-3 md:h-3" />
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                            {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 mb-2 md:mb-3">
                      <p className="text-slate-600 text-[11px] md:text-xs font-medium leading-relaxed line-clamp-2">
                        {activity.mentor_notes || activity.details || `Interacted with ${activity.student_name} regarding academic progress.`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={12} className="text-slate-500 shrink-0" />
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{activity.student_name}</span>
                      </div>
                      <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] shrink-0 truncate max-w-[80px] md:max-w-[120px]">
                        {activity.mentor_place}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 md:py-8 md:py-16">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-2 md:mb-4">
                <Activity size={20} className="md:w-8 md:h-8" />
              </div>
              <h3 className="text-sm md:text-base font-black text-slate-900">No Recent Activity</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mt-1">
                Mentor updates appear here in real-time.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default MentorHeadDashboard;
