import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  UserPlus,
  GraduationCap,
  UserSquare2,
  BarChart3,
  TrendingUp,
  ListTodo,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mail,
  User
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import StatCard from '../../components/StatCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    mentors: 0,
    faculties: 0,
    pendingApprovals: 0
  });
  const [mentorHeadReport, setMentorHeadReport] = useState({
    totalStudents: 0,
    checkedToday: 0,
    remaining: 0
  });
  const [examData, setExamData] = useState([]);
  const [mentorDistribution, setMentorDistribution] = useState([]);
  const [taskPerformance, setTaskPerformance] = useState([]);
  const [portalLogins, setPortalLogins] = useState([]);
  const [taskFilter, setTaskFilter] = useState('today');
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [summaryRes, reportRes, examRes, distRes, taskRes, portalRes] = await Promise.all([
          api.get('/admin/dashboard-summary'),
          api.get('/admin/mentor-head-report'),
          api.get('/admin/exam-analytics'),
          api.get('/admin/mentor-distribution'),
          api.get(`/admin/task-analytics?range=${taskFilter}`),
          api.get('/admin/student-portal-logins')
        ]);

        if (summaryRes.data.success) {
          setStats(summaryRes.data.data);
        }

        if (reportRes.data.success) {
          const reports = reportRes.data.data;
          if (Array.isArray(reports)) {
            const totalStudents = reports.length > 0 ? Number(reports[0].totalStudents) : 0;
            const checkedToday = reports.reduce((sum, curr) => sum + Number(curr.checkedToday || 0), 0);
            setMentorHeadReport({
              totalStudents: totalStudents,
              checkedToday: checkedToday,
              remaining: totalStudents - checkedToday
            });
          } else {
            setMentorHeadReport(reportRes.data.data);
          }
        }

        if (examRes.data.success) {
          setExamData(examRes.data.data.map(item => ({
            ...item,
            percentage: Number(item.percentage || 0)
          })));
        }

        if (distRes.data.success) {
          const colors = ['#008080', '#006666', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];
          const mappedDist = distRes.data.data.map((item, idx) => ({
            name: item.mentor_name,
            value: Number(item.student_count || 0),
            color: colors[idx % colors.length]
          }));
          setMentorDistribution(mappedDist);
        }

        if (taskRes.data.success) {
          setTaskPerformance(taskRes.data.data);
        }

        if (portalRes.data.success) {
          setPortalLogins(portalRes.data.data);
        }

        setLoading(false);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        toast.error("Failed to fetch dashboard statistics");
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchTaskAnalytics = async () => {
      try {
        const res = await api.get(`/admin/task-analytics?range=${taskFilter}`);
        if (res.data.success) {
          setTaskPerformance(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch task analytics", error);
      }
    };
    if (isMounted) fetchTaskAnalytics();
  }, [taskFilter, isMounted]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 sm:gap-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col mb-2">
          <div className="h-8 sm:h-10 w-48 sm:w-64 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/80 p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] h-[120px] sm:h-[140px] border border-white/50 shadow-sm flex flex-col justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
              <div className="h-8 w-24 bg-slate-200 rounded mt-2"></div>
              <div className="h-4 w-12 bg-slate-200 rounded mt-auto"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="w-full bg-white/80 p-6 sm:p-10 rounded-[24px] sm:rounded-[32px] h-[300px] sm:h-[450px] border border-white/50 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      <div className="flex flex-col mb-2">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2 sm:mb-3">Workspace Overview</h2>
        <div className="flex items-center gap-3">
          <div className="px-2 sm:px-3 py-1 bg-[#008080]/10 rounded-md sm:rounded-lg border border-[#008080]/20">
            <p className="text-[#008080] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">System Status: Active</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total Students"
          value={stats.students}
          icon={<Users size={24} />}
          trend={12}
        />
        <StatCard
          title="Active Mentors"
          value={stats.mentors}
          icon={<UserSquare2 size={24} />}
          trend={5}
        />
        <StatCard
          title="Faculties"
          value={stats.faculties}
          icon={<GraduationCap size={24} />}
          trend={-2}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={<UserPlus size={24} />}
          trend={18}
          type="warning"
        />
      </div>

      {/* Charts Section */}
      <div className="flex flex-col gap-6">
        <div className="w-full bg-white/80 backdrop-blur-xl p-5 sm:p-10 rounded-[20px] sm:rounded-[32px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10 w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#006666] to-[#008080] text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-lg shadow-[#008080]/20">
                <Activity size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">Task Performance</h4>
                <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Tasks assigned vs completed</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] bg-[#10B981]" />
                  <span className="text-slate-600 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Tasks Assigned</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] bg-[#000000]" />
                  <span className="text-slate-600 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Task Completed</span>
                </div>
              </div>
              <div className="relative group w-full sm:w-auto">
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl sm:rounded-2xl focus:ring-[#008080] focus:border-[#008080] block w-full px-4 sm:px-6 py-2.5 sm:py-3 transition-all hover:bg-white cursor-pointer min-w-full sm:min-w-[140px]"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last3">Last 3 Days</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last14">Last 14 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Previous Month</option>
                </select>
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-[#008080] transition-colors">
                  <ChevronLeft size={16} className="-rotate-90" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full h-[280px] sm:h-[400px] overflow-x-auto custom-scrollbar">
            <div style={{ minWidth: `${Math.max(100, taskPerformance.length * 60)}px`, height: '100%' }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskPerformance}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      fontSize={12}
                      fontWeight={800}
                      tick={{ fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dy={12}
                      interval={0}
                    />
                    <YAxis fontSize={12} fontWeight={800} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)'
                      }}
                      itemSorter={(item) => (item.name === 'Tasks Assigned' ? -1 : 1)}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar
                      name="Tasks Assigned"
                      dataKey="tasks"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                      minPointSize={5}
                    />
                    <Bar
                      name="Task Completed"
                      dataKey="completed"
                      fill="#000000"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                      minPointSize={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-10 rounded-[20px] sm:rounded-[32px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-lg">
                <Users size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">Student Distribution</h4>
                <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Students assigned per mentor</p>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[300px] relative">
              {isMounted && mentorDistribution.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={mentorDistribution.flatMap((mentor, idx) => {
                        const items = [
                          { name: mentor.name, value: 0.8, color: '#008080', type: 'mentor' },
                          { name: `${mentor.name}'s Students`, value: mentor.value, color: '#000000', type: 'student' }
                        ];
                        if (idx < mentorDistribution.length - 1) {
                          items.push({ name: 'gap', value: 0.5, color: 'transparent', type: 'gap' });
                        }
                        return items;
                      })}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={115}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {mentorDistribution.flatMap((mentor, idx) => {
                        const cells = [
                          <Cell key={`m-${idx}`} fill="#008080" />,
                          <Cell key={`s-${idx}`} fill="#000000" />
                        ];
                        if (idx < mentorDistribution.length - 1) {
                          cells.push(<Cell key={`g-${idx}`} fill="transparent" />);
                        }
                        return cells;
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          if (data.type === 'gap') return null;
                          return (
                            <div className="bg-[#008080]/90 backdrop-blur-md p-3 rounded-xl shadow-2xl border border-white/10 font-bold text-[11px] text-white">
                              <p className={data.type === 'mentor' ? 'text-[#008080]' : 'text-slate-200'}>
                                {data.name}
                              </p>
                              <p className="text-white/70">
                                {data.type === 'mentor' ? 'Leader' : `${data.value} Members`}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '30px' }}
                      content={({ payload }) => (
                        <div className="flex justify-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#008080]" />
                            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">Mentors</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#000000]" />
                            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">Students</span>
                          </div>
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Top Mentor</span>
                <span className="text-base font-bold text-slate-900 truncate">
                  {mentorDistribution[0]?.name || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Avg Students</span>
                <span className="text-base font-bold text-slate-900">
                  {mentorDistribution.length > 0
                    ? Math.round(mentorDistribution.reduce((acc, d) => acc + d.value, 0) / mentorDistribution.length)
                    : 0} / mentor
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-10 rounded-[20px] sm:rounded-[32px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10 w-full">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-lg shadow-[#F59E0B]/20">
                  <ListTodo size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">Daily Student Checks</h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Student tracking by Mentor Head</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[300px] relative">
              {isMounted && mentorHeadReport.totalStudents > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Checked Today', value: mentorHeadReport.checkedToday, color: '#008080' },
                        { name: 'Remaining', value: mentorHeadReport.remaining, color: '#EF4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={115}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {[
                        { name: 'Checked Today', value: mentorHeadReport.checkedToday, color: '#008080' },
                        { name: 'Remaining', value: mentorHeadReport.remaining, color: '#EF4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '30px' }} fontSize={11} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No Check Data</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Check back later today</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total</span>
                <span className="text-base font-bold text-slate-900">{mentorHeadReport.totalStudents}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Checked</span>
                <span className="text-base font-bold text-emerald-600">{mentorHeadReport.checkedToday}</span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Remaining</span>
                <span className="text-base font-bold text-rose-600">{mentorHeadReport.remaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends & Portal Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Performance Line Chart Section */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-5 sm:p-10 rounded-[20px] sm:rounded-[32px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-12 w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#10B981] to-[#059669] text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">Exam Performance Trends</h4>
                <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Average score percentages</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[250px] sm:h-[350px] relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={examData.length > 0 ? examData : []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008080" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#008080" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey={examData.length > 0 ? "subject" : "month"}
                    fontSize={11}
                    fontWeight={800}
                    tick={{ fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    fontSize={11}
                    fontWeight={800}
                    tick={{ fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    itemStyle={{ color: '#0fb5b5' }}
                  />
                  <Area
                    name="Success %"
                    type="monotone"
                    dataKey={examData.length > 0 ? "percentage" : "score"}
                    stroke="#008080"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorSuccess)"
                    dot={{ fill: '#fff', r: 6, strokeWidth: 3, stroke: '#008080' }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#008080' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Student Portal Activity Section */}
        <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-8 rounded-[20px] sm:rounded-[32px] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col h-[400px] sm:h-[480px]">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#008080] to-[#006666] text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-lg shadow-[#008080]/20">
              <Activity size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Student Portal Activity</h4>
              <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Live Logs</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-3 sm:space-y-4">
            {portalLogins.length > 0 ? (
              portalLogins.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 hover:border-[#008080]/20 transition-all flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">
                        {log.message.replace('<b>Student Portal Login:</b> ', '').replace(' logged into the student dashboard.', '')}
                      </span>
                      <span className="text-[9px] font-black text-[#008080] uppercase tracking-widest">
                        {log.grade} | {log.course}
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1" />
                  </div>
                  <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-400" />
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {log.email && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail size={10} className="text-slate-400" />
                        {log.email}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <Activity size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600">No Recent Logins</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Activity logs will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
