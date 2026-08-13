import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import MentorLayout from './components/Mentor/MentorLayout';
import FacultyLayout from './components/Faculty/FacultyLayout';
import MentorHeadLayout from './components/MentorHead/MentorHeadLayout';
import AOELayout from './components/AOE/AOELayout';
import AcademicHeadLayout from './components/AcademicHead/AcademicHeadLayout';
import SSCLayout from './components/SSC/SSCLayout';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Common Pages
import AdminProfile from './pages/common/Profile';
import AccountSettings from './pages/common/AccountSettings';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import AuditLogs from './pages/admin/AuditLogs';
import Students from './pages/admin/Students';
import Mentors from './pages/admin/Mentors';
import Faculties from './pages/admin/Faculties';
import Tasks from './pages/admin/Tasks';
import Reports from './pages/admin/Reports';
import InteractionLogs from './pages/admin/InteractionLogs';
import EditInteractionLog from './pages/common/EditInteractionLog';
import Approvals from './pages/admin/Approvals';
import DailyMentorHeadReport from './pages/admin/DailyMentorHeadReport';
import AdminManagement from './pages/admin/AdminManagement';
import StaffManagement from './pages/admin/StaffManagement';
import AdminDailyUpdates from './pages/admin/AdminDailyUpdates';

import AdminAcademicSchedule from './pages/admin/AcademicSchedule';
import AHInteractions from './pages/admin/AHInteractions';
import AHParentMeetings from './pages/admin/AHParentMeetings';
import FeesManagement from './pages/admin/FeesManagement';
import IntegrityDashboard from './pages/admin/IntegrityDashboard';

import AdminFacultyTimetable from './pages/admin/FacultyTimetable';
import AdminStudentSchedules from './pages/admin/StudentSchedules';

// Mentor Panel Pages
import MentorDashboard from './pages/Mentor/MentorDashboard';
import MyStudents from './pages/Mentor/MyStudents';
import StudentDetails from './pages/common/StudentDetails';
import MyTasks from './pages/Mentor/MyTasks';
import Timetable from './pages/Mentor/Timetable';
import StudentInteractionLog from './pages/Mentor/StudentInteractionLog';
import Exams from './pages/Mentor/Exams';
import AcademicSchedule from './pages/Mentor/AcademicSchedule';
import StudentsData from './pages/Mentor/StudentsData';

// Faculty Panel Pages
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import FacultyStudents from './pages/Faculty/MyStudents';
import FacultySessions from './pages/Faculty/FacultySessions';
import FacultyReports from './pages/Faculty/FacultyReports';
import FacultyExams from './pages/Faculty/FacultyExams';
import FacultyTasks from './pages/Faculty/FacultyTasks';
import FacultyTimetable from './pages/Faculty/FacultyTimetable';
import FacultySchedule from './pages/Faculty/FacultySchedule';
import FacultyNotifications from './pages/Faculty/FacultyNotifications';
import MentorFeedbackView from './pages/Faculty/StudentLogs'; // Renamed import for clarity
import FacultyProfile from './pages/Faculty/FacultyProfile';

// Mentor Head Pages
import MentorHeadDashboard from './pages/MentorHead/MentorHeadDashboard';
import MentorRegistration from './pages/MentorHead/MentorRegistration';
import MentorsList from './pages/MentorHead/MentorsList';
import CourseCompletedTracker from './pages/MentorHead/CourseCompletedTracker';
import MentorDetails from './pages/MentorHead/MentorDetails';
import StudentCheckTracker from './pages/MentorHead/StudentCheckTracker';
import AHDailyUpdates from './pages/AcademicHead/AHDailyUpdates';
import StudentShift from './pages/MentorHead/StudentShift';
import MentorHeadInteractions from './pages/MentorHead/MentorHeadInteractions';
import MentorHeadTasks from './pages/MentorHead/MentorHeadTasks';
import FacultyDirectoryMentorHead from './pages/MentorHead/FacultyDirectory';
import MentorHeadNotifications from './pages/MentorHead/MentorHeadNotifications';
import MentorsListAcademic from './pages/AOE/MentorsList';
import RemoveMentors from './pages/MentorHead/RemoveMentors';

// Mentor Interaction Tracking
import FacultyTracking from './pages/Mentor/FacultyTracking';
import MentorInteractions from './pages/Mentor/MentorInteractions';

// AOE Pages
import AOEDashboard from './pages/AOE/AcademicHeadDashboard';
import Registrations from './pages/AOE/Registrations';
import AOETasks from './pages/AOE/AcademicHeadTasks';
import AOEFacultyActivity from './pages/AOE/AcademicHeadFacultyActivity';
import AcademicActions from './pages/AOE/AcademicActions';
import AOEAcademicSchedule from './pages/AOE/AcademicSchedule';
import FacultyDirectory from './pages/AOE/FacultyDirectory';
import StudentsListAcademic from './pages/AOE/StudentsList';
import MentorsListAcademicAOE from './pages/AOE/MentorsList';
import Documents from './pages/AOE/Documents';
import FacultyAudit from './pages/AOE/FacultyAudit';
import StudentLogsAcademic from './pages/AOE/StudentLogs';
import FacultyLogsAcademic from './pages/AOE/FacultyLogs';
import CheckingSection from './pages/AOE/CheckingSection';
import AOELiveMonitoring from './pages/AOE/LiveMonitoring';
import EditStudent from './pages/AOE/EditStudent';
import EditFaculty from './pages/AOE/EditFaculty';
import Interactions from './pages/AOE/Interactions';
import ParentMeetings from './pages/AOE/ParentMeetings';
import AOEDemoSchedule from './pages/AOE/AOEDemoSchedule';
import EditDemoSchedule from './pages/AOE/EditDemoSchedule';
import AOEDailyUpdates from './pages/AOE/AOEDailyUpdates';
import AoeExams from './pages/AOE/AoeExams';

// Academic Head Pages
import OperationsHub from './pages/AcademicHead/OperationsHub';

// SSC Pages
import SSCDashboard from './pages/SSC/SSCDashboard';
import SSCStudentList from './pages/SSC/StudentList';
import SSCTimetable from './pages/SSC/Timetable';
import SSCAcademicSchedule from './pages/SSC/AcademicSchedule';
import SSCDailyUpdates from './pages/SSC/SSCDailyUpdates';
import SSCExamSchedule from './pages/SSC/ExamSchedule';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            className: 'rounded-2xl font-bold text-sm shadow-xl',
            duration: 3000,
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Admin Routes (Super Admin) */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="mentors" element={<Mentors />} />
            <Route path="faculties" element={<Faculties />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="mentor-head-report" element={<DailyMentorHeadReport />} />
            <Route path="logs" element={<InteractionLogs />} />
            <Route path="logs/edit/:id" element={<EditInteractionLog />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="integrity" element={<IntegrityDashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="admin-management" element={<AdminManagement />} />
            <Route path="students/:id" element={<StudentDetails />} />

            <Route path="academic-schedule" element={<AdminAcademicSchedule />} />
            <Route path="daily-updates" element={<AdminDailyUpdates />} />
            <Route path="ah-interactions" element={<AHInteractions />} />
            <Route path="ah-interactions/edit/:id" element={<EditInteractionLog />} />
            <Route path="parent-meetings" element={<AHParentMeetings />} />
            <Route path="fees" element={<FeesManagement />} />
            <Route path="faculty-timetable" element={<AdminFacultyTimetable />} />
            <Route path="student-schedules" element={<AdminStudentSchedules />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* Mentor Head System */}
          <Route path="/mentor-head" element={
            <ProtectedRoute allowedRoles={['mentor_head']}>
              <MentorHeadLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/mentor-head/dashboard" replace />} />
            <Route path="dashboard" element={<MentorHeadDashboard />} />
            <Route path="checks" element={<StudentCheckTracker />} />
            <Route path="shift" element={<StudentShift />} />
            <Route path="register-mentor" element={<MentorRegistration />} />
            <Route path="mentors" element={<MentorsList />} />
            <Route path="mentors/:id" element={<MentorDetails />} />
            <Route path="students" element={<StudentsListAcademic role="mentor_head" />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="remove-mentors" element={<RemoveMentors />} />
            <Route path="edit-student/:id" element={<EditStudent />} />
            <Route path="edit-faculty/:id" element={<EditFaculty />} />
            <Route path="faculties" element={<FacultyDirectoryMentorHead />} />
            <Route path="course-completed" element={<CourseCompletedTracker />} />
            <Route path="tasks" element={<MentorHeadTasks />} />
            <Route path="interactions" element={<MentorHeadInteractions />} />
            <Route path="interactions/edit/:id" element={<EditInteractionLog />} />
            <Route path="notifications" element={<MentorHeadNotifications />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* AOE System */}
          <Route path="/aoe" element={
            <ProtectedRoute allowedRoles={['academic_operation_executive']}>
              <AOELayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/aoe/dashboard" replace />} />
            <Route path="dashboard" element={<AOEDashboard />} />
            <Route path="actions" element={<AcademicActions />} />
            <Route path="faculties" element={<FacultyDirectory />} />
            <Route path="students" element={<StudentsListAcademic role="academic_operation_executive" />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="edit-student/:id" element={<EditStudent />} />
            <Route path="edit-faculty/:id" element={<EditFaculty />} />
            <Route path="mentors" element={<MentorsListAcademicAOE />} />
            <Route path="documents" element={<Documents />} />
            <Route path="faculty-audit" element={<FacultyAudit />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="tasks" element={<AOETasks />} />
            <Route path="faculty-activity" element={<AOEFacultyActivity />} />
            <Route path="student-logs" element={<StudentLogsAcademic />} />
            <Route path="faculty-logs" element={<FacultyLogsAcademic />} />
            <Route path="checking" element={<CheckingSection />} />
            <Route path="live-monitoring" element={<AOELiveMonitoring />} />
            <Route path="academic-schedule" element={<AOEAcademicSchedule />} />
            <Route path="interactions" element={<Interactions />} />
            <Route path="interactions/edit/:id" element={<EditInteractionLog />} />
            <Route path="meetings" element={<ParentMeetings />} />
            <Route path="demo-schedule" element={<AOEDemoSchedule />} />
            <Route path="daily-updates" element={<AOEDailyUpdates />} />
            <Route path="exam-scores" element={<AoeExams />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* Academic Head System */}
          <Route path="/academic-head" element={
            <ProtectedRoute allowedRoles={['academic_head']}>
              <AcademicHeadLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/academic-head/academic-quality" replace />} />
            <Route path="dashboard" element={<Navigate to="/academic-head/academic-quality" replace />} />
            <Route path="academic-quality" element={<OperationsHub section="academic_quality" />} />
            <Route path="students" element={<StudentsListAcademic role="academic_head" />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="edit-student/:id" element={<EditStudent />} />
            <Route path="faculties" element={<FacultyDirectory role="academic_head" />} />
            <Route path="edit-faculty/:id" element={<EditFaculty />} />
            <Route path="mentors" element={<MentorsListAcademic />} />
            <Route path="parent-meetings" element={<OperationsHub section="parent_meetings" />} />
            <Route path="exam-scores" element={<OperationsHub section="exam_scores" />} />
            <Route path="growth-monitor" element={<OperationsHub section="student_growth" />} />
            <Route path="faculty-replacement" element={<OperationsHub section="faculty_replacement" />} />
            <Route path="escalations" element={<OperationsHub section="escalation" />} />
            <Route path="course-completions" element={<OperationsHub section="course_completions" />} />
            <Route path="daily-updates" element={<AHDailyUpdates />} />
            
            {/* AOE Panels inside Academic Head */}
            <Route path="aoe/dashboard" element={<AOEDashboard />} />
            <Route path="aoe/actions" element={<AcademicActions />} />
            <Route path="aoe/faculties" element={<FacultyDirectory />} />
            <Route path="aoe/students" element={<StudentsListAcademic role="academic_head" />} />
            <Route path="aoe/students/:id" element={<StudentDetails />} />
            <Route path="aoe/mentors" element={<MentorsListAcademic />} />
            <Route path="aoe/registrations" element={<Registrations />} />
            <Route path="aoe/tasks" element={<AOETasks />} />
            <Route path="aoe/checking" element={<CheckingSection />} />
            <Route path="aoe/live-monitoring" element={<AOELiveMonitoring />} />
            <Route path="aoe/academic-schedule" element={<AOEAcademicSchedule />} />
            <Route path="aoe/interactions" element={<Interactions />} />
            <Route path="aoe/interactions/edit/:id" element={<EditInteractionLog />} />
            <Route path="aoe/meetings" element={<ParentMeetings />} />
            <Route path="aoe/demo-schedule" element={<AOEDemoSchedule />} />
            <Route path="aoe/demo-schedule/edit/:id" element={<EditDemoSchedule />} />

            {/* SSC Panels inside Academic Head */}
            <Route path="ssc/dashboard" element={<SSCDashboard />} />
            <Route path="ssc/students" element={<SSCStudentList />} />
            <Route path="ssc/students/:id" element={<StudentDetails />} />
            <Route path="ssc/timetable" element={<SSCTimetable />} />
            <Route path="ssc/academic-schedule" element={<SSCAcademicSchedule />} />
          </Route>

          {/* SSC System */}
          <Route path="/ssc" element={
            <ProtectedRoute allowedRoles={['ssc']}>
              <SSCLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/ssc/dashboard" replace />} />
            <Route path="dashboard" element={<SSCDashboard />} />
            <Route path="students" element={<SSCStudentList />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="timetable" element={<SSCTimetable />} />
            <Route path="academic-schedule" element={<SSCAcademicSchedule />} />
            <Route path="exam-schedule" element={<SSCExamSchedule />} />
            <Route path="daily-updates" element={<SSCDailyUpdates />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* Faculty System */}
          <Route path="/faculty" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="students" element={<FacultyStudents />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="sessions" element={<FacultySessions />} />
            <Route path="timetable" element={<FacultyTimetable />} />
            <Route path="schedule" element={<FacultySchedule />} />
            <Route path="reports" element={<FacultyReports />} />
            <Route path="exam-scores" element={<FacultyExams />} />
            <Route path="mentor-feedback" element={<MentorFeedbackView />} />
            <Route path="tasks" element={<FacultyTasks />} />
            <Route path="notifications" element={<FacultyNotifications />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<FacultyProfile />} />
          </Route>

          {/* Mentor System */}
          <Route path="/mentor" element={
            <ProtectedRoute allowedRoles={['mentor']}>
              <MentorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/mentor/dashboard" replace />} />
            <Route path="dashboard" element={<MentorDashboard />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="tasks" element={<MyTasks />} />
            <Route path="interaction-logs" element={<StudentInteractionLog />} />
            <Route path="logs-history" element={<MentorInteractions />} />
            <Route path="logs-history/edit/:id" element={<EditInteractionLog />} />
            <Route path="faculty-logs" element={<FacultyTracking />} />
            <Route path="exams" element={<Exams />} />
            <Route path="students-data" element={<StudentsData />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* Root Redirection */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50 text-center">
              <h1 className="text-9xl font-black text-slate-200">404</h1>
              <p className="text-xl font-bold text-slate-600 -mt-8 mb-8 text-black">Access Token Invalid or Page Missing</p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-[#008080] text-white px-4 md:px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[10px]"
              >
                Return to Safety
              </button>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
