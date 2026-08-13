import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ScrollText, Search, User, Clock, Calendar, ChevronLeft, ChevronRight, History, ExternalLink, ArrowLeft, Users, ShieldAlert, CheckSquare, Filter, BookOpen, ChevronDown, SlidersHorizontal, X, SortAsc, CalendarClock, Pencil, Trash2, Paperclip } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';

import InteractionFormUI from '../../components/common/InteractionFormUI';
import MultiDatePicker from "react-multi-date-picker";
const DatePicker = MultiDatePicker.default ? MultiDatePicker.default : MultiDatePicker;
const DEEP_QUESTION_LABELS = {
  student_status_before: 'Planned Task Completed?',
  main_problem: 'Main Problem',
  root_cause: 'Root Cause',
  mentor_guidance: 'Mentor Guidance',
  action_plan: 'Action Plan',
  student_response: 'Student Response',
  followup_required: 'Follow-up Required?',
  followup_when: 'When?',
  next_session_type: 'Next Attention Level',
  interaction_details: 'Today\'s Interaction Details',
  quick_notes: 'Additional Notes',
  // legacy
  student_status: 'Student Status'
};
const MEDIUM_QUESTION_LABELS = {
  progress: 'Progress Since Last Session',
  class_attendance: 'Class Attendance',
  issue_found: 'Any Issue Found?',
  quick_guidance: 'Guidance Given',
  next_task: 'Next Task Assigned',
  upgrade_to_deep: 'Need Deep Session?',
  next_session_type: 'Next Attention Level',
  interaction_details: 'Today\'s Interaction Details',
  quick_notes: 'Additional Notes',
  // legacy
  issue_category: 'Issue Category'
};
const QUICK_QUESTION_LABELS = {
  availability: 'Student Available?',
  study_status: 'Study Status',
  attendance: 'Class Attendance',
  immediate_concern: 'Immediate Concern?',
  immediate_concern_category: 'Concern Category',
  next_session_type: 'Next Attention Level',
  interaction_details: 'Today\'s Interaction Details',
  quick_notes: 'Additional Notes',
  // legacy
  connection_method: 'Connection Method',
  self_clarity: 'Self Clarity',
  confusing_topic: 'Confusing Topic',
  can_solve_independently: 'Can Solve Independently?',
  homework_status: 'Homework Status',
  homework_difficulty: 'Homework Difficulty',
  revision_quality: 'Revision Quality',
  confidence: 'Confidence Level',
  motivation_level: 'Motivation Level',
  exam_anxiety: 'Exam Anxiety',
  focus_level: 'Focus Level',
  student_requests: 'Student Requests',
  parent_update_priority: 'Parent Update Priority',
  mentor_action_needed: 'Mentor Action Needed',
  connected_today: 'Connected Today?'
};
const CommonInteractionLogs = ({
  role
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'faculty'
  const [entities, setEntities] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState({
    start: '',
    end: ''
  });
  const [mentorFilter, setMentorFilter] = useState('all');
  const [mentors, setMentors] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [listDateFilter, setListDateFilter] = useState('all');
  const [listCustomRange, setListCustomRange] = useState({
    start: '',
    end: ''
  });
  const [listCustomDates, setListCustomDates] = useState([]);
  const [selectedMentorTab, setSelectedMentorTab] = useState('all');
  const [mentorDateFilters, setMentorDateFilters] = useState({});
  const [selectedLogTab, setSelectedLogTab] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [staffTypeFilter, setStaffTypeFilter] = useState('all'); // 'all', 'mentor', 'faculty'
  const [listLogs, setListLogs] = useState([]);

  // Pagination for interaction logs
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  // New state variables for Edit and History Modal
  const [editModalLog, setEditModalLog] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editFiles, setEditFiles] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [historyModalLog, setHistoryModalLog] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleDeleteLog = async (log) => {
    if (!window.confirm("Are you sure you want to delete this log? This action cannot be undone.")) return;
    try {
      const source = log.source || log.session_type || 'student_interaction_logs';
      const endpoint = `${getApiPrefix()}/logs/${log.id}?source=${encodeURIComponent(source)}`;
      const res = await api.delete(endpoint);
      if (res.data?.success) {
        toast.success("Log deleted successfully");
        fetchLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete log");
    }
  };

  // Dynamic API prefix based on role
  const getApiPrefix = () => {
    if (role === 'mentor_head') return '/mentor-head';
    if (role === 'academic_head') return '/academic-head';
    if (role === 'ssc') return '/ssc';
    if (role === 'mentor') return '/mentor';
    return '/admin';
  };
  const apiPrefix = getApiPrefix();
  const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
  const normalizeFileUrl = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return '#';
    const trimmed = filePath.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    let cleanPath = trimmed
      .replace(/^undefined\/?/i, '/')
      .replace(/\/undefined\/+/gi, '/')
      .replace(/^\/?mentor-head\/undefined\/?/i, '/')
      .replace(/\/+/g, '/');
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
    if (cleanPath.startsWith('/uploads/')) cleanPath = `/api${cleanPath}`;
    return `${API_BASE_URL.replace(/\/$/, '')}${cleanPath}`;
  };
  const getLogFiles = (logOrReport) => {
    if (!logOrReport) return [];
    const rawFiles = logOrReport.files || logOrReport.file || logOrReport.screenshot_url || logOrReport.interaction_files;
    if (Array.isArray(rawFiles)) return rawFiles.filter(Boolean);
    if (typeof rawFiles === 'string') return rawFiles.split(',').map((f) => f.trim()).filter(Boolean);
    return [];
  };
  const groupLogsByDate = logsList => {
    const groups = {};
    const sorted = [...logsList].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date).getTime();
      const dateB = new Date(b.created_at || b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    sorted.forEach(log => {
      const d = new Date(log.created_at || log.date);
      const weekday = d.toLocaleDateString('en-US', {
        weekday: 'long'
      });
      const dateStr = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const groupKey = `${weekday}, ${dateStr}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(log);
    });
    return groups;
  };
  const isConductedByMentor = log => {
    if (activeTab === 'faculty') {
      return !!log.mentor_name;
    }
    if (!log.mentor_name) return false;
    return mentors.some(m => m.name && m.name.toLowerCase() === log.mentor_name.toLowerCase());
  };
  const isConductedByFaculty = log => {
    if (activeTab === 'faculty') {
      return !log.mentor_name && !!log.faculty_name;
    }
    if (!log.mentor_name) return false;
    return !mentors.some(m => m.name && m.name.toLowerCase() === log.mentor_name.toLowerCase());
  };
  useEffect(() => {
    fetchEntities();
    fetchMentors();
  }, [activeTab, role, listDateFilter, listCustomRange]);
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentDetails();
      fetchLogs();
    }
  }, [selectedStudent, dateFilter, customRange, mentorFilter, staffTypeFilter, page]);

  useEffect(() => {
    // Reset page to 1 when filters change
    setPage(1);
  }, [dateFilter, customRange, mentorFilter, staffTypeFilter]);
  const fetchMentors = async () => {
    if (role === 'mentor' || role === 'faculty') return;
    try {
      const endpoint = role === 'mentor_head' || role === 'academic_head' ? `${apiPrefix}/mentors-all` : `${apiPrefix}/mentors`;
      const res = await api.get(endpoint);
      setMentors(res.data.data || []);
    } catch (error) {
      console.error("Error fetching mentors:", error);
    }
  };
  const fetchStudentDetails = async () => {
    try {
      if (!selectedStudent) return;
      const endpoint = activeTab === 'student' ? `${apiPrefix}/students/${selectedStudent.id}` : `${apiPrefix}/faculties/${selectedStudent.id}`;
      const res = await api.get(endpoint);
      setStudentDetails(res.data.data || null);
      
      // Reset page when selecting a new student
      setPage(1);
    } catch (e) {
      console.warn("Failed to fetch full profile details. Using summary data.", e);
    }
  };
  const getResolvedDates = (filter, customRange) => {
    let startDate = filter === 'custom' ? customRange.start : undefined;
    let endDate = filter === 'custom' ? customRange.end : undefined;
    if (filter !== 'all' && filter !== 'custom') {
      const today = new Date();
      const yyyyMmDd = (d) => {
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
      };
      if (filter === 'today') {
        startDate = yyyyMmDd(today);
        endDate = startDate;
      } else if (filter === 'yesterday') {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        startDate = yyyyMmDd(d);
        endDate = startDate;
      } else if (filter === 'this_week') {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay());
        startDate = yyyyMmDd(d);
        endDate = yyyyMmDd(today);
      } else if (filter === 'this_month') {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = yyyyMmDd(d);
        endDate = yyyyMmDd(today);
      } else if (filter === 'last_month') {
        const d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const d2 = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = yyyyMmDd(d1);
        endDate = yyyyMmDd(d2);
      }
    } else if (filter === 'custom_multiple') {
      // If we need a single start/end range to fetch logs from backend covering all dates
      if (listCustomDates.length > 0) {
        const sortedDates = [...listCustomDates].sort();
        startDate = sortedDates[0];
        endDate = sortedDates[sortedDates.length - 1];
      }
    }
    return { startDate, endDate };
  };

  const fetchEntities = async () => {
    try {
      setLoading(true);
      let endpoint;
      const { startDate, endDate } = getResolvedDates(listDateFilter, listCustomRange);
      const params = {
        startDate,
        endDate,
        dateFilter: listDateFilter !== 'all' ? listDateFilter : undefined
      };
      if (activeTab === 'student') {
        endpoint = role === 'mentor_head' || role === 'academic_head' ? `${apiPrefix}/students-all` : `${apiPrefix}/students`;
      } else {
        endpoint = role === 'mentor_head' ? `${apiPrefix}/faculties-all` : `${apiPrefix}/faculties`;
      }
      const res = await api.get(endpoint, {
        params
      });
      setEntities(res.data.data || []);

      // Also fetch logs for filtering and sorting
      let logsEndpoint;
      if (activeTab === 'student') {
        logsEndpoint = `${apiPrefix}/student-logs`;
      } else {
        logsEndpoint = `${apiPrefix}/faculty-logs`;
      }
      const logsRes = await api.get(logsEndpoint, {
        params
      });
      setListLogs(logsRes.data.data || []);
    } catch {
      toast.error(`Failed to load ${activeTab}s`);
    } finally {
      setLoading(false);
    }
  };
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getResolvedDates(dateFilter, customRange);
      const params = {
        dateFilter,
        startDate,
        endDate,
        mentor_id: mentorFilter !== 'all' ? mentorFilter : undefined,
        student_id: activeTab === 'student' ? selectedStudent.id : undefined,
        faculty_id: activeTab === 'faculty' ? selectedStudent.id : undefined,
        page,
        limit
      };
      let endpoint;
      if (activeTab === 'student') {
        endpoint = `${apiPrefix}/student-logs`;
      } else {
        endpoint = `${apiPrefix}/faculty-logs`;
      }
      const res = await api.get(endpoint, {
        params
      });
      setLogs(res.data.data || []);
      setTotalRecords(res.data.total || 0);
    } catch {
      toast.error("Failed to load interaction history");
    } finally {
      setLoading(false);
    }
  };
  const fetchExportData = async (exportType, dateRange, studentId = null) => {
    const loadingToast = toast.loading("Fetching logs for export...");
    try {
      let params = {
        student_id: studentId || undefined,
        mentor_id: studentId && mentorFilter !== 'all' ? mentorFilter : undefined
      };
      
      if (exportType === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.dateFilter = 'custom';
        params.startDate = todayStr;
        params.endDate = todayStr;
      } else if (exportType === 'range' && dateRange && dateRange.length > 0) {
        params.dateFilter = 'custom';
        params.startDate = dateRange[0].format("YYYY-MM-DD");
        params.endDate = dateRange.length > 1 ? dateRange[1].format("YYYY-MM-DD") : dateRange[0].format("YYYY-MM-DD");
      } else {
        params.dateFilter = 'all';
      }

      let endpoint;
      if (activeTab === 'student') {
        endpoint = `${apiPrefix}/student-logs`;
      } else {
        endpoint = role === 'mentor_head' ? `${apiPrefix}/mentor-logs` : `${apiPrefix}/faculty-logs`;
      }
      
      const res = await api.get(endpoint, { params });
      const exportData = res.data.data || [];
      if (exportData.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No logs found to export for the selected date range");
        return null;
      }
      
      const excelData = exportData.map(item => {
        let reportAnswersStr = "";
        if (item.report_data) {
          try {
            const parsed = typeof item.report_data === 'string' ? JSON.parse(item.report_data) : item.report_data;
            reportAnswersStr = Object.entries(parsed).map(([k, v]) => {
              let label = k.replace(/_/g, ' ');
              label = label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              const sessionTypeUpper = (item.session_type || '').toUpperCase();
              if (sessionTypeUpper === 'DEEP' && DEEP_QUESTION_LABELS[k]) {
                label = DEEP_QUESTION_LABELS[k];
              } else if (sessionTypeUpper === 'MEDIUM' && MEDIUM_QUESTION_LABELS[k]) {
                label = MEDIUM_QUESTION_LABELS[k];
              } else if (sessionTypeUpper === 'QUICK' && QUICK_QUESTION_LABELS[k]) {
                label = QUICK_QUESTION_LABELS[k];
              }
              return `${label}: ${v}`;
            }).join(" | ");
          } catch (e) { }
        }
        return {
          "ID": item.id,
          "Date": item.created_at || item.date,
          "Student Name": item.student_name,
          "Mentor/Faculty Name": item.mentor_name || item.faculty_name,
          "Source/Type": item.source || item.type,
          "Session Type": item.session_type,
          "Notes/Remarks": item.mentor_notes || item.notes || item.remarks,
          "Understanding Level (%)": item.understanding_level,
          "Confidence (1-5)": item.student_confidence,
          "Stress Level": item.stress_level,
          "Is Flagged": item.is_flagged ? "Yes" : "No",
          "Flag Reason": item.flag_reason,
          "Detailed Questionnaire Responses": reportAnswersStr
        };
      });
      
      toast.dismiss(loadingToast);
      return excelData;
    } catch (error) {
      console.error("Export failed:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export logs");
      return null;
    }
  };
  const handleOpenEdit = log => {
    const source = log.source || 'Interaction Hub';
    let initialData = {};
    if (source === 'Session Log') {
      initialData = {
        main_issue: log.main_issue || '',
        action_type: log.action_type || ''
      };
    } else if (source === 'Interaction Log' || source === 'Quick Log') {
      initialData = {
        notes: log.notes || log.mentor_notes || ''
      };
    } else {
      let parsedReport = {};
      try {
        parsedReport = log.report_data
          ? (typeof log.report_data === 'string' ? JSON.parse(log.report_data) : log.report_data)
          : {};
      } catch {
        parsedReport = {};
      }
      const fallbackFiles = getLogFiles(log);
      const logDataToPass = {
        ...log,
        report_data: {
          ...parsedReport,
          files: parsedReport.files || fallbackFiles
        }
      };
      navigate(`edit/${log.id}`, { state: { log: logDataToPass, apiPrefix } });
      return;
    }
    navigate(`edit/${log.id}`, { state: { log, apiPrefix } });
  };

  const handleSaveEdit = async () => {
    if (!editModalLog) return;
    setIsSavingEdit(true);
    try {
      const source = editModalLog.source || 'Interaction Hub';
      const endpoint = `${apiPrefix}/interactions/${encodeURIComponent(source)}/${editModalLog.id}`;
      const formPayload = new FormData();

      if (source === 'Session Log') {
        formPayload.append('main_issue', editFormData.main_issue || '');
        formPayload.append('action_type', editFormData.action_type || '');
      } else if (source === 'Interaction Log' || source === 'Quick Log') {
        formPayload.append('notes', editFormData.notes || '');
      } else {
        const currentReportData = editFormData.report_data || {};
        formPayload.append('report_data', JSON.stringify(currentReportData));
      }

      editFiles.forEach((file) => formPayload.append('files', file));

      await api.put(endpoint, formPayload);
      toast.success('Interaction updated successfully');
      setEditModalLog(null);
      setEditFiles([]);
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update interaction');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenHistory = async log => {
    setHistoryModalLog(log);
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/admin/interactions/${log.source || 'Interaction Hub'}/${log.id}/history`);
      setHistoryLogs(res.data.data || []);
    } catch {
      toast.error('Failed to load edit history');
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const resetFilters = () => {
    setDateFilter('all');
    setCustomRange({
      start: '',
      end: ''
    });
    setMentorFilter('all');
    setSortOrder('newest');
    setStaffTypeFilter('all');
    setShowFilterPanel(false);
  };
  const resetListFilters = () => {
    setListDateFilter('all');
    setListCustomRange({
      start: '',
      end: ''
    });
    setListCustomDates([]);
  };
  const filteredEntities = useMemo(() => {
    let base = entities.filter(e => e.name?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || e.email?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || e.registration_number?.toLowerCase().includes(deferredSearchTerm.toLowerCase()));

    // Mentor Head - Student Tab specific logic
    const isMentorHeadStudentView = activeTab === 'student' && role === 'mentor_head';
    let activeDateFilter = null;

    if (isMentorHeadStudentView) {
      if (selectedMentorTab !== 'all') {
        base = base.filter(e => String(e.mentor_id) === String(selectedMentorTab));
        activeDateFilter = mentorDateFilters[selectedMentorTab];
      } else {
        activeDateFilter = mentorDateFilters['all'];
      }
    }

    const latestLogMap = {};
    listLogs.forEach(log => {
      const entityId = activeTab === 'student' ? log.student_id : log.faculty_id || log.mentor_id;
      if (entityId) {
        const logDate = new Date(log.created_at || log.date);

        // If there's an active mentor-specific date filter, only consider logs on that exact date
        if (isMentorHeadStudentView && activeDateFilter) {
          const yyyyMmDd = `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}-${logDate.getDate().toString().padStart(2, '0')}`;
          if (yyyyMmDd !== activeDateFilter) return;
        }

        const logTimestamp = logDate.getTime();
        if (!latestLogMap[entityId] || logTimestamp > latestLogMap[entityId]) {
          latestLogMap[entityId] = logTimestamp;
        }
      }
    });

    if (isMentorHeadStudentView && activeDateFilter) {
      // Strictly show ONLY students who had interactions on the selected date
      base = base.filter(e => latestLogMap[e.id] !== undefined);
    } else if (listDateFilter === 'custom_multiple' && listCustomDates.length > 0) {
      base = base.filter(e => {
        const logDate = latestLogMap[e.id];
        if (!logDate) return false;
        const d = new Date(logDate);
        const yyyyMmDd = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        return listCustomDates.includes(yyyyMmDd);
      });
    } else if (listDateFilter !== 'all') {
      base = base.filter(e => latestLogMap[e.id] !== undefined);
    }

    base.sort((a, b) => {
      const dateA = latestLogMap[a.id] || 0;
      const dateB = latestLogMap[b.id] || 0;
      return dateB - dateA; // Always newest first for interaction lists
    });

    return base;
  }, [entities, listLogs, deferredSearchTerm, activeTab, listDateFilter, listCustomDates, selectedMentorTab, mentorDateFilters, role]);
  if (viewMode === 'list') {
    return <div className="space-y-4 md:space-y-8 animate-in fade-in duration-700">
      <div className="bg-white/70 backdrop-blur-xl p-5 md:p-10 rounded-[24px] md:rounded-[40px] border border-white/60 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1 md:mb-3 uppercase">Interaction Archive</h2>
          <p className="text-slate-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em]">Centralized monitoring of academic &amp; mentorship logs</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto">
          <button onClick={() => {
            setActiveTab('student');
            resetListFilters();
          }} className={`flex-1 md:flex-none flex items-center justify-center min-h-[44px] px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'student' ? 'bg-white text-[#008080] shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            Student Focus
          </button>
          {role !== 'mentor' && <button onClick={() => {
            setActiveTab('faculty');
            resetListFilters();
          }} className={`flex-1 md:flex-none flex items-center justify-center min-h-[44px] px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'faculty' ? 'bg-white text-purple-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            Faculty Focus
          </button>}
        </div>
      </div>

      {activeTab === 'student' && role === 'mentor_head' && (
        <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden p-6">
          <div className="flex flex-col xl:flex-row gap-6 justify-between items-center">
            <div className="flex overflow-x-auto gap-3 pb-2 w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <button
                onClick={() => setSelectedMentorTab('all')}
                className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMentorTab === 'all'
                    ? 'bg-[#008080] text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
              >
                All Mentors
              </button>
              {mentors.map(mentor => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentorTab(mentor.id)}
                  className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${String(selectedMentorTab) === String(mentor.id)
                      ? 'bg-[#008080] text-white shadow-md'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <User size={14} />
                  {mentor.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col gap-3 md:gap-6">
          {/* Search row */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008080] transition-colors" size={16} />
              <input type="text" placeholder={`Search ${activeTab}s by name, email or ID...`} className="w-full pl-12 md:pl-16 pr-4 md:pr-8 py-3.5 md:py-5 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-[#008080]/5 outline-none transition-all min-h-[44px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'student' && role === 'mentor_head' ? (
                <div className="shrink-0 flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm hover:border-[#008080] transition-all min-h-[44px]">
                  <CalendarClock size={16} className="text-[#008080] shrink-0" />
                  <DatePicker
                    value={mentorDateFilters[selectedMentorTab] || ''}
                    onChange={(date) => {
                      setMentorDateFilters(prev => ({
                        ...prev,
                        [selectedMentorTab]: date ? date.format("YYYY-MM-DD") : null
                      }));
                    }}
                    format="YYYY-MM-DD"
                    placeholder="Select Date..."
                    inputClass="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none w-24 cursor-pointer"
                  />
                  {mentorDateFilters[selectedMentorTab] && (
                    <button
                      onClick={() => {
                        setMentorDateFilters(prev => ({
                          ...prev,
                          [selectedMentorTab]: null
                        }));
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm shrink-0"
                      title="Clear Date Filter"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ) : (
                <DatePicker
                  multiple
                  value={listCustomDates}
                  onChange={(dates) => {
                    if (dates && dates.length > 0) {
                      const formatted = dates.map(d => d.format("YYYY-MM-DD"));
                      setListCustomDates(formatted);
                      setListDateFilter('custom_multiple');
                    } else {
                      setListCustomDates([]);
                      setListDateFilter('all');
                    }
                  }}
                  placeholder="Select Dates..."
                  inputClass="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 ring-[#008080]/10 transition-all cursor-pointer shadow-sm hover:border-[#008080] min-h-[44px]"
                  containerClassName="w-40 md:w-48"
                />
              )}
              <ExportButton
                fetchData={(exportType, dateRange) => fetchExportData(exportType, dateRange, null)}
                filename="interaction_logs"
                buttonText="Export"
                customButtonClass="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border bg-[#008080] text-white border-[#008080] hover:bg-[#006666] active:scale-95 shadow-sm min-h-[44px] whitespace-nowrap"
              />
              {listDateFilter !== 'all' && <button onClick={resetListFilters} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shrink-0">
                <X size={16} />
              </button>}
            </div>
          </div>
          {/* Entity count */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total:</span>
            <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black border border-slate-100">{filteredEntities.length} Entities</span>
          </div>
        </div>


        {/* DESKTOP TABLE (>= md) */}
        <div className="hidden md:block overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-full md:w-[640px] text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/95 border-b border-slate-100/50 backdrop-blur-sm">
                <th className="w-12 md:w-16 px-4 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest text-center bg-slate-50">#</th>
                <th className="px-4 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50">Name</th>
                <th className="px-4 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 hidden sm:table-cell">Details</th>
                <th className="px-4 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 hidden sm:table-cell">Status</th>
                <th className="px-4 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest text-right bg-slate-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr>
                <td colSpan="5" className="px-5 md:px-10 py-20 text-center">
                  <div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr> : filteredEntities.length > 0 ? filteredEntities.map((entity, index) => <tr key={entity.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => {
                setSelectedStudent(entity);
                setViewMode('detail');
              }}>
                <td className="px-4 md:px-10 py-4 md:py-6 text-xs font-black text-slate-400 text-center">{index + 1}</td>
                <td className="px-4 md:px-10 py-4 md:py-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-base md:text-lg shadow-lg shrink-0 ${activeTab === 'student' ? 'bg-[#008080]' : 'bg-purple-600'}`}>
                      {entity.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{entity.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{entity.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-10 py-4 md:py-6 hidden sm:table-cell">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'student' ? 'text-[#008080]' : 'text-purple-600'}`}>
                      {entity.course || entity.role || 'General'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {entity.grade ? `Grade ${entity.grade}` : entity.role === 'faculty' ? 'Teaching Faculty' : 'Staff/Coord'}
                    </span>
                  </div>
                </td>
                <td className="px-4 md:px-10 py-4 md:py-6 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${entity.status === 'active' || activeTab === 'student' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      {entity.status === 'active' ? 'Active' : activeTab === 'student' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-4 md:px-10 py-4 md:py-6 text-right">
                  <button className={`inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 min-h-[44px] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border border-slate-100 bg-white whitespace-nowrap ${activeTab === 'student' ? 'text-[#008080] group-hover:bg-[#008080] group-hover:text-white' : 'text-purple-600 group-hover:bg-purple-600 group-hover:text-white'}`}>
                    <span className="hidden sm:inline">Access </span>Timeline
                    <ArrowLeft size={13} className="rotate-180 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </td>
              </tr>) : <tr>
                <td colSpan="5" className="px-6 py-24 md:py-40 text-center">
                  <History size={40} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">No records found matching your search.</p>
                  <button onClick={resetListFilters} className="mt-2 px-6 py-2.5 min-h-[44px] bg-[#008080] text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
                    Clear Filters
                  </button>
                </td>
              </tr>}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST (< md) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-slate-100">
              <div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : filteredEntities.length > 0 ? (
            filteredEntities.map((entity, index) => (
              <div key={entity.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer" onClick={() => {
                setSelectedStudent(entity);
                setViewMode('detail');
              }}>
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0 ${activeTab === 'student' ? 'bg-[#008080]' : 'bg-purple-600'}`}>
                      {entity.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{entity.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{entity.email}</p>
                    </div>
                  </div>
                  <button className={`shrink-0 flex items-center gap-1.5 px-3 h-10 rounded-xl transition-all shadow-sm border border-slate-100 bg-slate-50 ${activeTab === 'student' ? 'text-[#008080]' : 'text-purple-600'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">Timeline</span>
                    <ArrowLeft size={12} className="rotate-180" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-slate-100">
              <History size={40} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">No records found matching your search.</p>
              <button onClick={resetListFilters} className="mt-2 px-6 py-2.5 min-h-[44px] bg-[#008080] text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>;
  }
  return <div className="space-y-5 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-700 pb-20">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8">
      <div className="flex items-center gap-4 md:gap-8">
        <button onClick={() => {
          setViewMode('list');
          setSelectedStudent(null);
          resetFilters();
        }} className="w-11 h-11 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#008080] transition-all group flex items-center justify-center active:scale-90 shrink-0">
          <ArrowLeft size={20} className="text-slate-400 group-hover:text-[#008080] transition-colors" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-1 bg-[#008080]/10 text-[#008080] rounded-lg text-[8px] font-black uppercase tracking-widest border border-[#008080]/20">Active Audit</span>
            <span className="text-slate-300">/</span>
            <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{selectedStudent.registration_number || selectedStudent.id}</span>
          </div>
          <h1 className="text-xl md:text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight md:leading-none">
            <span className="truncate block md:inline">{selectedStudent.name || 'Unknown Entity'}</span>
            <span className="text-slate-300 font-light mx-2 md:mx-4 hidden md:inline">|</span>
            <span className={`text-base md:text-3xl lg:text-5xl block md:inline ${activeTab === 'student' ? 'text-[#008080]' : 'text-purple-600'}`}>
              {activeTab === 'student' ? 'Mentorship Audit' : 'Academic Audit'}
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <ExportButton
          fetchData={(exportType, dateRange) => fetchExportData(exportType, dateRange, selectedStudent.id)}
          filename={`${selectedStudent?.name || 'student'}_interaction_logs`}
          buttonText="Export"
          customButtonClass="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 min-h-[44px] rounded-2xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border bg-[#008080] text-white border-[#008080] hover:bg-[#006666] active:scale-95 whitespace-nowrap"
        />
        <button onClick={() => setShowFilterPanel(!showFilterPanel)} className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 min-h-[44px] rounded-2xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border whitespace-nowrap ${showFilterPanel ? 'bg-yellow-400 text-slate-900 border-[#008080]' : 'bg-white text-slate-600 border-slate-100 hover:border-[#008080]'}`}>
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Custom </span>Filter
        </button>
        {(dateFilter !== 'all' || mentorFilter !== 'all' || sortOrder !== 'newest' || staffTypeFilter !== 'all') && <button onClick={resetFilters} className="flex items-center gap-2 px-3 py-3 min-h-[44px] rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
          <X size={14} />
          <span className="hidden sm:inline">Reset</span>
        </button>}
      </div>
    </header>

    {showFilterPanel && <div className="flex flex-col md:flex-row gap-8 p-5 md:p-10 bg-[#008080] rounded-[3.5rem] shadow-2xl animate-in slide-in-from-top-6 duration-700 items-end">
      <div className="flex-1 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-2">Start Date</label>
        <div className="relative group">
          <Calendar size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#008080] transition-colors" />
          <input type="date" className="w-full bg-white/10 p-5 pl-14 rounded-[1.8rem] border border-white/10 text-xs font-black uppercase tracking-widest text-white outline-none focus:ring-4 focus:ring-white/5 transition-all" value={customRange.start} onChange={e => {
            setCustomRange({
              ...customRange,
              start: e.target.value
            });
            setDateFilter('custom');
          }} />
        </div>
      </div>

      <div className="flex-1 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-2">End Date</label>
        <div className="relative group">
          <Calendar size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#008080] transition-colors" />
          <input type="date" className="w-full bg-white/10 p-5 pl-14 rounded-[1.8rem] border border-white/10 text-xs font-black uppercase tracking-widest text-white outline-none focus:ring-4 focus:ring-white/5 transition-all" value={customRange.end} onChange={e => {
            setCustomRange({
              ...customRange,
              end: e.target.value
            });
            setDateFilter('custom');
          }} />
        </div>
      </div>

      <div className="pb-1 px-4">
        <button onClick={() => setShowFilterPanel(false)} className="text-[9px] font-black text-[#008080] uppercase tracking-widest hover:text-white transition-colors h-12">
          Collapse Panel
        </button>
      </div>
    </div>}

    {loading ? <div className="flex flex-col items-center justify-center py-40 gap-8">
      <div className="w-16 h-16 border-4 border-[#008080] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,128,128,0.2)]"></div>
      <div className="text-center">
        <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-2">Loading Interaction History</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fetching records from the database</p>
      </div>
    </div> : logs.length > 0 ? <div className="space-y-10">
      {/* Interaction Type Tabs and Sort/Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-[2.5rem]">
        <div className="flex overflow-x-auto gap-2 md:gap-3 bg-white p-1.5 md:p-2 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 scrollbar-none">
          {['ALL', 'QUICK', 'MEDIUM', 'DEEP'].map(tab => <button key={tab} onClick={() => setSelectedLogTab(tab)} className={`shrink-0 px-5 md:px-8 py-2.5 md:py-3 min-h-[40px] rounded-xl md:rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${selectedLogTab === tab ? 'bg-yellow-400 text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab}
          </button>)}
          {logs.some(l => !['QUICK', 'MEDIUM', 'DEEP'].includes((l.session_type || l.type || l.source || '').toUpperCase())) && <button onClick={() => setSelectedLogTab('OTHERS')} className={`shrink-0 px-5 md:px-8 py-2.5 md:py-3 min-h-[40px] rounded-xl md:rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${selectedLogTab === 'OTHERS' ? 'bg-yellow-400 text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            OTHERS
          </button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {selectedLogTab === 'ALL' ? (() => {
          const processedLogs = logs.filter(log => {
            if (staffTypeFilter === 'mentor') return isConductedByMentor(log);
            if (staffTypeFilter === 'faculty') return isConductedByFaculty(log);
            return true;
          });
          const grouped = groupLogsByDate(processedLogs);
          const dateKeys = Object.keys(grouped).sort((a, b) => {
            const dateA = new Date(a.split(', ')[1].split('/').reverse().join('-'));
            const dateB = new Date(b.split(', ')[1].split('/').reverse().join('-'));
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
          });
          if (dateKeys.length === 0) {
            return <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">No interactions recorded for this timeline.</p>
            </div>;
          }
          return <div className="space-y-12">
            {dateKeys.map(dateKey => {
              const dayLogs = grouped[dateKey];
              return <div key={dateKey} className="space-y-4 md:space-y-6">
                {/* Day Header */}
                <div className="bg-[#008080] text-white px-4 md:px-8 py-3.5 md:py-5 rounded-2xl md:rounded-[2rem] flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Calendar size={16} className="text-white/70 shrink-0" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-wide break-words">{dateKey}</span>
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black text-white/80 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-xl border border-white/20 whitespace-nowrap ml-2">{dayLogs.length} Logs</span>
                </div>

                {/* Timeline list of day's logs */}
                <div className="space-y-3 md:space-y-4">
                  {dayLogs.map(log => <div key={log.id} className="flex flex-col md:flex-row gap-3 md:gap-6 pl-3 md:pl-8 relative border-l-2 border-slate-100 py-3 md:py-4 last:border-l-transparent">
                    {/* Exact Time Highlighted */}
                    <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0 shrink-0 md:w-32 md:pt-2">
                      <span className="inline-block px-3 py-1.5 md:py-2 bg-slate-950 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-wide shadow-md border border-slate-800 whitespace-nowrap">
                        {new Date(log.created_at || log.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                      <div className="md:mt-2 text-[9px] font-black uppercase tracking-widest text-[#008080] leading-tight md:pl-1 truncate max-w-[140px] md:max-w-[120px] md:break-words md:whitespace-normal">
                        {role === 'super_admin' || role === 'mentor_head' ? log.mentor_name || log.faculty_name || 'Not Specified' : log.mentor_name || 'Mentor'}
                      </div>
                    </div>

                    {/* Full Details Display */}
                    <div onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className={`flex-1 bg-white rounded-2xl md:rounded-[2.5rem] border transition-all relative overflow-hidden group cursor-pointer p-4 md:p-8 ${expandedLogId === log.id ? 'ring-2 md:ring-4 ring-slate-900/5 border-[#008080] shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                        <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest border ${(log.session_type || log.type || '').toUpperCase() === 'DEEP' ? 'bg-rose-50 text-rose-600 border-rose-100' : (log.session_type || log.type || '').toUpperCase() === 'MEDIUM' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-emerald-50 text-[#008080] border-emerald-100'}`}>
                          {(log.session_type || log.type || 'QUICK').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {(role === 'super_admin' || role === 'admin' || role === 'mentor_head' || role === 'mentor') && <button onClick={e => {
                            e.stopPropagation();
                            handleOpenHistory(log);
                          }} className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors shadow-sm" title="View Edit History">
                            <History size={15} strokeWidth={2.5} />
                          </button>}
                          {(role === 'super_admin' || role === 'admin' || role === 'mentor_head' || role === 'mentor') && <button onClick={e => {
                            e.stopPropagation();
                            handleOpenEdit(log);
                          }} className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm" title="Edit Interaction">
                            <Pencil size={15} strokeWidth={2.5} />
                          </button>}
                          {role === 'mentor_head' && <button onClick={e => {
                            e.stopPropagation();
                            handleDeleteLog(log);
                          }} className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Interaction">
                            <Trash2 size={15} strokeWidth={2.5} />
                          </button>}
                          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${expandedLogId === log.id ? 'bg-yellow-400 text-slate-900 rotate-180 scale-110 shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                            <ChevronDown size={17} strokeWidth={3} />
                          </div>
                        </div>
                      </div>

                      {/* Notes Preview when collapsed, or full detail section when expanded */}
                      {expandedLogId !== log.id ? <div className="mb-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes Preview</p>
                        <p className="text-xs md:text-sm font-bold text-slate-500 leading-relaxed italic line-clamp-2 md:truncate break-words">
                          &ldquo;{log.mentor_notes || log.notes || log.remarks || 'No notes provided.'}&rdquo;
                        </p>
                      </div> : <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-100 space-y-6 md:space-y-8 animate-in slide-in-from-top-4 duration-500">
                        {/* Narrative Section Removed: Details merged into Questionnaire */}

                        {/* Questionnaire Section */}
                        {(() => {
                          let parsedReportData = null;
                          if (log.report_data) {
                            try {
                              parsedReportData = typeof log.report_data === 'string' ? JSON.parse(log.report_data) : { ...log.report_data };
                            } catch (e) {
                              console.error("Failed to parse report_data:", e);
                            }
                          }
                          
                          if (!parsedReportData) parsedReportData = {};
                          
                          const sessionTypeUpper = (log.session_type || 'QUICK').toUpperCase();
                          const defaultNotes = log.mentor_notes || log.notes || log.remarks;

                          // Map legacy fields to new UI fields for backwards compatibility
                          if (parsedReportData.notes && !parsedReportData.quick_notes) parsedReportData.quick_notes = parsedReportData.notes;
                          if (parsedReportData.notes && !parsedReportData.quick_guidance) parsedReportData.quick_guidance = parsedReportData.notes;
                          if (parsedReportData.notes && !parsedReportData.mentor_guidance) parsedReportData.mentor_guidance = parsedReportData.notes;
                          if (parsedReportData.main_problem && !parsedReportData.root_cause) parsedReportData.root_cause = parsedReportData.main_problem;

                          // Fallback unmapped core notes into proper form fields
                          if (defaultNotes && !['QUICK', 'MEDIUM', 'DEEP'].includes(defaultNotes)) {
                            if (sessionTypeUpper === 'QUICK' && !parsedReportData.quick_notes) parsedReportData.quick_notes = defaultNotes;
                            if (sessionTypeUpper === 'MEDIUM' && !parsedReportData.interaction_details) parsedReportData.interaction_details = defaultNotes;
                            if (sessionTypeUpper === 'DEEP' && !parsedReportData.action_plan) parsedReportData.action_plan = defaultNotes;
                          }
                          
                          return (
                            <div className="space-y-4">
                              <InteractionFormUI
                                sessionType={sessionTypeUpper}
                                formData={parsedReportData}
                                setFormData={() => { }}
                                isReadOnly={true}
                              />
                            </div>
                          );
                        })()}

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                          {Object.entries(log).map(([key, val]) => {
                            if (['mentor_notes', 'notes', 'remarks', 'student_id', 'mentor_id', 'id', 'created_at', 'date', 'student_name', 'mentor_name', 'source', 'type', 'session_type', 'session_number', 'report_data'].includes(key)) return null;
                            if (val === null || val === undefined || val === '') return null;
                            return <div key={key} className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col gap-1.5 shadow-sm hover:border-[#008080]/30 transition-colors">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-black text-[#008080] uppercase truncate">{String(val)}</span>
                            </div>;
                          })}
                          {log.understanding_level !== undefined && log.understanding_level !== null && <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col gap-1.5 shadow-sm">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Understanding Level</span>
                            <span className="text-lg font-black text-emerald-700">{log.understanding_level}%</span>
                          </div>}
                          {log.student_confidence !== undefined && log.student_confidence !== null && <div className="p-5 bg-[#008080] border border-slate-800 rounded-3xl flex flex-col gap-1.5 shadow-sm text-white">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self Confidence</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black">{log.student_confidence}</span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < log.student_confidence ? 'bg-[#008080]' : 'bg-white/20'}`}></div>)}
                              </div>
                            </div>
                          </div>}
                        </div>
                      </div>}
                    </div>
                  </div>)}
                </div>
              </div>;
            })}
          </div>;
        })() : logs.filter(log => {
          const type = (log.session_type || log.type || log.source || 'QUICK').toUpperCase();
          if (selectedLogTab === 'OTHERS') {
            if (['QUICK', 'MEDIUM', 'DEEP'].includes(type)) return false;
          } else {
            if (!type.includes(selectedLogTab)) return false;
          }
          if (staffTypeFilter === 'mentor') return isConductedByMentor(log);
          if (staffTypeFilter === 'faculty') return isConductedByFaculty(log);
          return true;
        }).length > 0 ? logs.filter(log => {
          const type = (log.session_type || log.type || log.source || 'QUICK').toUpperCase();
          if (selectedLogTab === 'OTHERS') {
            if (['QUICK', 'MEDIUM', 'DEEP'].includes(type)) return false;
          } else {
            if (!type.includes(selectedLogTab)) return false;
          }
          if (staffTypeFilter === 'mentor') return isConductedByMentor(log);
          if (staffTypeFilter === 'faculty') return isConductedByFaculty(log);
          return true;
        }).sort((a, b) => {
          const timeA = new Date(a.created_at || a.date).getTime();
          const timeB = new Date(b.created_at || b.date).getTime();
          return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
        }).map(log => <div key={log.id} className={`bg-white rounded-[2.5rem] border transition-all relative overflow-hidden group ${expandedLogId === log.id ? 'ring-4 ring-slate-900/5 border-[#008080] shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300'}`}>
          <div onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className="p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 cursor-pointer">
            {/* Date & Time Highlight */}
            <div className="flex items-center gap-6 shrink-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedLogTab === 'QUICK' ? 'bg-[#008080]' : selectedLogTab === 'MEDIUM' ? 'bg-purple-600' : 'bg-pink-600'}`}>
                <CalendarClock size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 leading-none mb-1.5 uppercase tracking-tight bg-slate-100 px-3 py-1 rounded-lg">
                  {new Date(log.created_at || log.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                  })}
                </span>
                <span className="text-[10px] font-bold text-[#008080] uppercase tracking-widest pl-1">
                  {new Date(log.created_at || log.date).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            </div>

            {/* Mentor/Faculty Identity */}
            <div className="flex-1 border-x border-slate-100 px-4 md:px-8 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#008080] rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg">
                  {(role === 'super_admin' || role === 'mentor_head' ? log.mentor_name || log.faculty_name || 'M' : log.mentor_name || 'M').charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Conducted By</p>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-[#008080] transition-colors">
                    {role === 'super_admin' || role === 'mentor_head' ? log.mentor_name || log.faculty_name || 'Not Specified' : log.mentor_name || 'Academic Mentor'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Synchronized</span>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${expandedLogId === log.id ? 'bg-yellow-400 text-slate-900 rotate-180 scale-110 shadow-xl shadow-[#008080]/20' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                <ChevronDown size={20} strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Expanded Content (Accordion) */}
          {expandedLogId === log.id && <div className="px-4 md:px-8 pb-4 md:pb-8 animate-in slide-in-from-top-4 duration-500">
            <div className="pt-4 md:pt-8 border-t border-slate-100 space-y-6 md:space-y-8">
              {/* Narrative Section */}
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#008080] rounded-full opacity-10"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ScrollText size={12} /> Detailed Notes
                </p>
                <div className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed p-4 md:p-8 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100 relative shadow-inner break-words overflow-hidden">
                  <div className="absolute top-4 left-4 opacity-5">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM14.017 21V18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM3 18C3 16.8954 3.89543 16 5 16H8C9.10457 16 10 16.8954 10 18V21C10 22.1046 9.10457 23 8 23H5C3.89543 23 3 22.1046 3 21V18ZM3 18V16C3 13.7909 4.79086 12 7 12H10V14H7C5.89543 14 5 14.8954 5 16V18H3Z" /></svg>
                  </div>
                  {log.mentor_notes || log.notes || log.remarks || 'No notes provided for this session.'}
                </div>
              </div>

              {/* Questionnaire Section */}
              {(() => {
                let parsedReportData = null;
                if (log.report_data) {
                  try {
                    parsedReportData = typeof log.report_data === 'string' ? JSON.parse(log.report_data) : log.report_data;
                  } catch (e) {
                    console.error("Failed to parse report_data:", e);
                  }
                }
                if (!parsedReportData) return null;
                return (
                  <div className="space-y-4 mt-8">
                    <InteractionFormUI
                      sessionType={(log.session_type || 'QUICK').toUpperCase()}
                      formData={parsedReportData}
                      setFormData={() => { }}
                      isReadOnly={true}
                    />
                  </div>
                );
              })()}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {Object.entries(log).map(([key, val]) => {
                  if (['mentor_notes', 'notes', 'remarks', 'student_id', 'mentor_id', 'id', 'created_at', 'date', 'student_name', 'mentor_name', 'source', 'type', 'session_type', 'session_number', 'report_data'].includes(key)) return null;
                  if (val === null || val === undefined || val === '') return null;
                  return <div key={key} className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col gap-1.5 shadow-sm hover:border-[#008080]/30 transition-colors">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-black text-[#008080] uppercase truncate">{String(val)}</span>
                  </div>;
                })}
                {log.understanding_level !== undefined && log.understanding_level !== null && <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Understanding Level</span>
                  <span className="text-lg font-black text-emerald-700">{log.understanding_level}%</span>
                </div>}
                {log.student_confidence !== undefined && log.student_confidence !== null && <div className="p-5 bg-[#008080] border border-slate-800 rounded-3xl flex flex-col gap-1.5 shadow-sm text-white">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self Confidence</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">{log.student_confidence}</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < log.student_confidence ? 'bg-[#008080]' : 'bg-white/20'}`}></div>)}
                    </div>
                  </div>
                </div>}
              </div>
            </div>
          </div>}
        </div>) : <div className="py-16 md:py-32 text-center bg-slate-50 rounded-2xl md:rounded-[3rem] border-2 border-dashed border-slate-200">
          <History size={36} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">No {selectedLogTab} sequences identified for this timeline</p>
        </div>}
      </div>
      
      {/* PAGINATION */}
      <div className="mt-8 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <Pagination 
          currentPage={page} 
          totalPages={Math.ceil(totalRecords / limit) || 1} 
          totalRecords={totalRecords} 
          onPageChange={setPage} 
        />
      </div>

    </div> : <div className="py-28 md:py-60 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] md:rounded-[5rem] border-2 border-dashed border-slate-200 animate-in zoom-in duration-1000 px-6">
      <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-5 md:mb-8 border border-slate-100 shadow-inner">
        <History size={36} className="md:w-12 md:h-12" />
      </div>
      <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">No Sessions Found</h3>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 md:mt-3 max-w-xs md:max-w-md mx-auto leading-loose">
        No interaction logs found for this user.
      </p>
    </div>}
    {/* History Modal */}
    {historyModalLog && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Edit History</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">View timeline of changes for this log</p>
          </div>
          <button onClick={() => setHistoryModalLog(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {isLoadingHistory ? <div className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Loading history...</div> : historyLogs.length === 0 ? <div className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No previous edits found for this log.</div> : <div className="space-y-6">
            {historyLogs.map((h, index) => {
              const prev = typeof h.previous_data === 'string' ? JSON.parse(h.previous_data) : h.previous_data;
              const next = typeof h.new_data === 'string' ? JSON.parse(h.new_data) : h.new_data;
              return <div key={h.id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50 relative">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-[#008080] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  Edit #{historyLogs.length - index}
                </div>
                <div className="flex justify-between items-center mb-4 mt-2 border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Edited by {h.editor_name || 'Unknown'} ({h.edited_by_role})</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div className="space-y-4">
                  {Object.keys(next).map(key => {
                    const pVal = prev[key];
                    const nVal = next[key];
                    if (typeof pVal === 'object') {
                      // For report_data JSON
                      const pReport = typeof pVal === 'string' ? JSON.parse(pVal) : pVal || {};
                      const nReport = typeof nVal === 'string' ? JSON.parse(nVal) : nVal || {};
                      return Object.keys(nReport).map(rKey => {
                        if (pReport[rKey] !== nReport[rKey]) {
                          return <div key={rKey} className="text-xs">
                            <span className="font-black text-slate-700 uppercase tracking-wider">{rKey.replace(/_/g, ' ')}:</span>
                            <div className="mt-1 grid grid-cols-2 gap-4">
                              <div className="bg-rose-50 text-rose-700 p-2 rounded line-through border border-rose-100">{pReport[rKey] || 'N/A'}</div>
                              <div className="bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">{nReport[rKey] || 'N/A'}</div>
                            </div>
                          </div>;
                        }
                        return null;
                      });
                    } else if (pVal !== nVal) {
                      return <div key={key} className="text-xs">
                        <span className="font-black text-slate-700 uppercase tracking-wider">{key.replace(/_/g, ' ')}:</span>
                        <div className="mt-1 grid grid-cols-2 gap-4">
                          <div className="bg-rose-50 text-rose-700 p-2 rounded line-through border border-rose-100">{pVal || 'N/A'}</div>
                          <div className="bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">{nVal || 'N/A'}</div>
                        </div>
                      </div>;
                    }
                    return null;
                  })}
                </div>
              </div>;
            })}
          </div>}
        </div>
      </div>
    </div>}

    {/* Edit Modal */}
    {editModalLog && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Edit Interaction Log</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Modify details for this session</p>
          </div>
          <button onClick={() => {
            setEditModalLog(null);
            setEditFiles([]);
          }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {(!editModalLog.source || editModalLog.source === 'Interaction Hub' || editModalLog.source.startsWith('Hub:')) && (
            <div className="bg-white">
              <InteractionFormUI
                sessionType={(editModalLog.session_type || (editModalLog.source || '').replace('Hub: ', '') || 'QUICK').toUpperCase()}
                formData={editFormData.report_data || {}}
                setFormData={(newData) => setEditFormData({ ...editFormData, report_data: newData })}
              />
            </div>
          )}

          {editModalLog.source === 'Session Log' && <>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Main Issue</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none" value={editFormData.main_issue || ''} onChange={e => setEditFormData({
                ...editFormData,
                main_issue: e.target.value
              })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Action Type</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none" value={editFormData.action_type || ''} onChange={e => setEditFormData({
                ...editFormData,
                action_type: e.target.value
              })} />
            </div>
          </>}

          {(editModalLog.source === 'Interaction Log' || editModalLog.source === 'Quick Log') && <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mentor Notes</label>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-[#008080]/20 outline-none min-h-[120px]" value={editFormData.notes || ''} onChange={e => setEditFormData({
              ...editFormData,
              notes: e.target.value
            })} />
          </div>}

          {/* Existing Uploaded Files */}
          {(() => {
            const source = editModalLog.source || 'Interaction Hub';
            let existingFiles = [];
            if (source === 'Session Log' || source === 'Interaction Log' || source === 'Quick Log') {
              existingFiles = getLogFiles(editModalLog);
            } else {
              existingFiles = getLogFiles(editFormData.report_data || {});
            }
            if (!existingFiles.length) return null;
            return (
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Existing Files
                </label>
                <div className="flex flex-wrap gap-3">
                  {existingFiles.map((f, i) => (
                    <a
                      key={`${f}-${i}`}
                      href={normalizeFileUrl(f)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-[10px] font-black uppercase tracking-widest text-slate-600"
                    >
                      <Paperclip size={12} /> File {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Upload New Files */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Upload Additional Files</label>
            <input
              type="file"
              multiple
              onChange={(e) => setEditFiles(Array.from(e.target.files || []))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
            />
            {editFiles.length > 0 && (
              <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">
                {editFiles.length} file(s) selected for upload
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-[2rem]">
          <button onClick={() => setEditModalLog(null)} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSaveEdit} disabled={isSavingEdit} className="px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#008080] text-white hover:bg-[#006666] transition-colors disabled:opacity-50">
            {isSavingEdit ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>}
  </div>;
};

export default CommonInteractionLogs;