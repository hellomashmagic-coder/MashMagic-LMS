import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, ShieldAlert, CheckCircle2, User, Calendar, Target, Star, BookOpen, GraduationCap, Save, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
const AcademicActions = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');

  // Default to current month e.g., "2026-06"
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);
  const [formData, setFormData] = useState({
    demo_conversion_rate: 0,
    attendance_punctuality: 0,
    parent_feedback: 0,
    student_exam_improvement: 0,
    academic_head_rating: 0
  });
  useEffect(() => {
    fetchFaculties();
  }, []);
  useEffect(() => {
    if (selectedFaculty && selectedMonth) {
      fetchPerformanceData();
    }
  }, [selectedFaculty, selectedMonth]);
  const fetchFaculties = async () => {
    try {
      const res = await api.get('/aoe/dropdowns');
      if (res.data.success && res.data.data.faculties) {
        setFaculties(res.data.data.faculties);
      }
    } catch (error) {
      toast.error("Failed to fetch faculties");
    }
  };
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/aoe/faculty-performance?faculty_id=${selectedFaculty}&month_year=${selectedMonth}`);
      if (res.data.success && res.data.data) {
        setFormData({
          demo_conversion_rate: res.data.data.demo_conversion_rate || 0,
          attendance_punctuality: res.data.data.attendance_punctuality || 0,
          parent_feedback: res.data.data.parent_feedback || 0,
          student_exam_improvement: res.data.data.student_exam_improvement || 0,
          academic_head_rating: res.data.data.academic_head_rating || 0
        });
      } else {
        // Reset if no data but keep demo rate if calculated from backend
        setFormData({
          demo_conversion_rate: res.data.demo_rate || 0,
          attendance_punctuality: 0,
          parent_feedback: 0,
          student_exam_improvement: 0,
          academic_head_rating: 0
        });
      }
    } catch (error) {
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async e => {
    e.preventDefault();
    try {
      await api.post('/aoe/faculty-performance', {
        faculty_id: selectedFaculty,
        month_year: selectedMonth,
        ...formData
      });
      toast.success("Performance Index saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save data");
    }
  };
  const handleInputChange = (field, value, max) => {
    let val = parseFloat(value);
    if (isNaN(val)) val = 0;
    if (val > max) val = max;
    if (val < 0) val = 0;
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };
  const totalScore = (parseFloat(formData.demo_conversion_rate || 0) + parseFloat(formData.attendance_punctuality || 0) + parseFloat(formData.parent_feedback || 0) + parseFloat(formData.student_exam_improvement || 0) + parseFloat(formData.academic_head_rating || 0)).toFixed(2);
  return <div className="space-y-10 pb-20 max-w-[1200px] mx-auto animate-in fade-in duration-700">
      <div className="bg-[#008080] p-5 md:p-10 rounded-[3.5rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-white backdrop-blur-sm -rotate-6 transition-all duration-500">
            <Activity size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-white/20 text-[10px] font-black tracking-widest uppercase rounded-full">Stage Thirteen - Quality & Continuity</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none">Faculty Performance Index</h1>
            <p className="text-white/80 text-xs font-bold mt-2 max-w-xl leading-relaxed">
              Managed by the AOE. Scored monthly out of 100 to drive ranking, incentives, training needs, and quality control.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
              <User size={12} className="text-[#008080]" /> Select Faculty
            </label>
            <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none">
              <option value="">-- Choose Faculty --</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.subject})</option>)}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={12} className="text-[#008080]" /> Select Month
            </label>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 ring-[#008080]/10 transition-all outline-none" />
          </div>
        </div>

        {selectedFaculty && selectedMonth && <form onSubmit={handleSave} className="animate-in slide-in-from-bottom-4">
            {loading ? <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div></div> : <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                <div className="w-full overflow-x-auto">
<table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#008080] text-white">
                      <th className="px-4 md:px-8 py-5 text-xs font-black uppercase tracking-widest w-2/3">Performance Dimension</th>
                      <th className="px-4 md:px-8 py-5 text-xs font-black uppercase tracking-widest text-center w-1/3">Weight / Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Target size={18} className="text-[#008080]" />
                          <span className="text-sm font-bold text-slate-700">Demo conversion rate</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 ml-8 uppercase tracking-widest font-bold">Auto-calculated from demo schedules</p>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" readOnly value={formData.demo_conversion_rate} className="w-20 text-center p-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-[#008080] outline-none" />
                          <span className="text-xs font-black text-slate-400">/ 25%</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-[#008080]" />
                          <span className="text-sm font-bold text-slate-700">Attendance & punctuality</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" step="0.1" value={formData.attendance_punctuality} onChange={e => handleInputChange('attendance_punctuality', e.target.value, 15)} className="w-20 text-center p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 focus:border-[#008080] focus:ring-2 ring-[#008080]/20 outline-none transition-all" />
                          <span className="text-xs font-black text-slate-400">/ 15%</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Star size={18} className="text-[#008080]" />
                          <span className="text-sm font-bold text-slate-700">Parent feedback</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" step="0.1" value={formData.parent_feedback} onChange={e => handleInputChange('parent_feedback', e.target.value, 20)} className="w-20 text-center p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 focus:border-[#008080] focus:ring-2 ring-[#008080]/20 outline-none transition-all" />
                          <span className="text-xs font-black text-slate-400">/ 20%</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <GraduationCap size={18} className="text-[#008080]" />
                          <span className="text-sm font-bold text-slate-700">Student exam improvement</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" step="0.1" value={formData.student_exam_improvement} onChange={e => handleInputChange('student_exam_improvement', e.target.value, 25)} className="w-20 text-center p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 focus:border-[#008080] focus:ring-2 ring-[#008080]/20 outline-none transition-all" />
                          <span className="text-xs font-black text-slate-400">/ 25%</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <ShieldAlert size={18} className="text-[#008080]" />
                          <span className="text-sm font-bold text-slate-700">Academic Head rating</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" step="0.1" value={formData.academic_head_rating} onChange={e => handleInputChange('academic_head_rating', e.target.value, 15)} className="w-20 text-center p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 focus:border-[#008080] focus:ring-2 ring-[#008080]/20 outline-none transition-all" />
                          <span className="text-xs font-black text-slate-400">/ 15%</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td className="px-4 md:px-8 py-6 font-black uppercase tracking-widest text-sm">Total monthly score</td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-black">{totalScore}</span>
                          <span className="text-xs font-black text-slate-400">/ 100</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
</div>

                <div className="p-4 md:p-8 bg-slate-50 flex justify-end">
                  <button type="submit" className="px-5 md:px-10 py-4 bg-[#008080] hover:bg-[#006666] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-2">
                    <Save size={16} /> Save Performance Index
                  </button>
                </div>
              </div>}
          </form>}
      </div>
    </div>;
};
export default AcademicActions;