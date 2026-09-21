/* ==========================================================================
   MASH MAGIC - SSC MANAGEMENT SYSTEM (FIREBASE AUTH & FIRESTORE INTEGRATED)
   ========================================================================== */

import { 
  app, auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy 
} from './firebase-app.js';

let currentUser = null;
let currentView = 'dashboard';
let cachedStudents = [];
let cachedFaculty = [];
let cachedSSCs = [];
let selectedStudentId = null;

// SAFE FORMATTERS FOR DATA INTEGRITY
function formatSubjects(subj) {
  if (!subj) return '-';
  if (typeof subj === 'string') {
    if (subj.startsWith('[') || subj.startsWith('{')) {
      try {
        const parsed = JSON.parse(subj);
        return formatSubjects(parsed);
      } catch (e) {
        return subj;
      }
    }
    return subj;
  }
  if (Array.isArray(subj)) {
    if (subj.length === 0) return '-';
    return subj.map(s => {
      if (!s) return '';
      if (typeof s === 'string') return s;
      if (typeof s === 'object') return s.subject || s.name || s.title || String(s);
      return String(s);
    }).filter(Boolean).join(' • ');
  }
  if (typeof subj === 'object') {
    return subj.subject || subj.name || subj.title || '-';
  }
  return String(subj);
}

function formatPercentage(val) {
  if (val === null || val === undefined || val === 'N/A') return 'N/A';
  let str = String(val).trim();
  str = str.replace(/%+$/, '');
  return `${str}%`;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[AUTH DEBUG] DOMContentLoaded event fired');
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
    console.log('[AUTH DEBUG] Bound submit listener to #form-login');
  }
  initAppAuth();
  initFormDates();
});

// AUTHENTICATION & SESSION BOOTSTRAP (TAB ISOLATED VIA FIREBASE AUTH)
function initAppAuth() {
  console.log('[AUTH DEBUG] Initializing initAppAuth() observer...');
  if (window.location.pathname.startsWith('/session/')) {
    const parts = window.location.pathname.split('/session/');
    const token = parts[1] ? parts[1].split('/')[0].trim() : '';
    if (token) {
      showFacultyWrapupLayout(token);
      hideLoadingSpinner();
      return;
    }
  }

  onAuthStateChanged(auth, async (user) => {
    console.log('[AUTH DEBUG] onAuthStateChanged triggered. User object:', user ? { uid: user.uid, email: user.email } : null);
    if (user) {
      try {
        console.log('[AUTH DEBUG] Fetching user profile from Firestore for UID:', user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          currentUser = userDocSnap.data();
          currentUser.uid = user.uid;
          currentUser.user_id = user.uid;
          console.log('[AUTH DEBUG] Found user document by UID:', currentUser);
        } else {
          console.log('[AUTH DEBUG] User doc not found by UID, setting profile for:', user.email);
          const isSuperAdmin = user.email === 'admin@mashmagic.com';
          const isHead = user.email && (user.email.includes('head') || user.email === 'head@mashmagic.com');
          const sscNames = {
            'ananya@mashmagic.com': 'Ananya Sharma',
            'priya@mashmagic.com': 'Priya Nair',
            'rahul@mashmagic.com': 'Rahul Verma'
          };
          currentUser = {
            uid: user.uid,
            user_id: user.uid,
            email: user.email,
            name: user.displayName || sscNames[user.email] || (isSuperAdmin ? 'Super Admin' : (isHead ? 'Academic Head' : 'SSC Coordinator')),
            role: isSuperAdmin ? 'SUPER_ADMIN' : (isHead ? 'ACADEMIC_HEAD' : 'SSC')
          };
          console.log('[AUTH DEBUG] Using resolved profile for:', user.email, currentUser);
        }
        console.log('[AUTH DEBUG] User Profile Loaded:', currentUser.name, '| Role:', currentUser.role);
        showAppLayout();
      } catch (err) {
        console.error('[AUTH DEBUG] Error loading user profile:', err);
        const isSuperAdmin = user.email === 'admin@mashmagic.com';
        const isHead = user.email && (user.email.includes('head') || user.email === 'head@mashmagic.com');
        currentUser = {
          uid: user.uid,
          user_id: user.uid,
          email: user.email,
          name: user.displayName || (isSuperAdmin ? 'Super Admin' : (isHead ? 'Academic Head' : 'SSC Coordinator')),
          role: isSuperAdmin ? 'SUPER_ADMIN' : (isHead ? 'ACADEMIC_HEAD' : 'SSC')
        };
        console.log('[AUTH DEBUG] Using fallback user profile:', currentUser);
        showAppLayout();
      }
    } else {
      console.log('[AUTH DEBUG] No authenticated user detected (user logged out). Showing login view.');
      currentUser = null;
      showLoginLayout();
    }
    hideLoadingSpinner();
  });
}

function hideLoadingSpinner() {
  const spinner = document.getElementById('app-loading-spinner');
  if (spinner) {
    spinner.style.opacity = '0';
    spinner.style.pointerEvents = 'none';
    spinner.style.display = 'none';
  }
}

function showLoginLayout() {
  console.log('[AUTH DEBUG] Displaying view-login form');
  document.getElementById('view-login').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
}

function showAppLayout() {
  console.log('[AUTH DEBUG] Displaying app-wrapper for user:', currentUser ? currentUser.email : 'Unknown', '| Role:', currentUser ? currentUser.role : 'Unknown');
  document.getElementById('view-login').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'flex';

  const navAdmin = document.getElementById('nav-admin');
  const navHead = document.getElementById('nav-academic-head');
  const navSSC = document.getElementById('nav-ssc');

  const displayName = currentUser ? (currentUser.name || currentUser.email) : 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const userDispName = document.getElementById('user-display-name');
  if (userDispName) userDispName.innerText = displayName;

  const userAvatarInit = document.getElementById('user-avatar-initials');
  if (userAvatarInit) userAvatarInit.innerText = initials || 'MM';

  const prefUserName = document.getElementById('pref-user-name');
  if (prefUserName && currentUser) prefUserName.value = `${displayName} (${currentUser.email})`;

  const prefUserRole = document.getElementById('pref-user-role');
  if (prefUserRole && currentUser) prefUserRole.value = currentUser.role;

  if (currentUser.role === 'SUPER_ADMIN') {
    console.log('[AUTH DEBUG] Routing Super Admin to admin control room');
    if (navAdmin) navAdmin.style.display = 'block';
    if (navHead) navHead.style.display = 'none';
    if (navSSC) navSSC.style.display = 'none';
    document.getElementById('sidebar-role-subtitle').innerText = 'ADMIN';
    document.getElementById('user-display-role').innerText = 'Super Admin';
    initNavigation('#nav-admin');
    switchView('admin');
  } else if (currentUser.role === 'ACADEMIC_HEAD') {
    console.log('[AUTH DEBUG] Routing Academic Head to head-dashboard');
    if (navAdmin) navAdmin.style.display = 'none';
    if (navHead) navHead.style.display = 'block';
    if (navSSC) navSSC.style.display = 'none';
    document.getElementById('sidebar-role-subtitle').innerText = 'ACADEMIC HEAD';
    document.getElementById('user-display-role').innerText = 'Academic Head';
    initNavigation('#nav-academic-head');
    switchView('head-dashboard');
  } else {
    console.log('[AUTH DEBUG] Routing SSC to dashboard');
    if (navAdmin) navAdmin.style.display = 'none';
    if (navHead) navHead.style.display = 'none';
    if (navSSC) navSSC.style.display = 'block';
    document.getElementById('sidebar-role-subtitle').innerText = 'SSC';
    document.getElementById('user-display-role').innerText = 'Student Success Coordinator';
    initNavigation('#nav-ssc');
    switchView('dashboard');
  }

  loadCommonDropdowns();
}

async function handleLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('[AUTH DEBUG] handleLoginSubmit invoked');

  const errorBox = document.getElementById('login-error-msg');
  if (errorBox) errorBox.style.display = 'none';

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  console.log('[AUTH DEBUG] Attempting signInWithEmailAndPassword for:', email);

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AUTH DEBUG] signInWithEmailAndPassword SUCCESS! User UID:', userCred.user.uid);
  } catch (err) {
    console.error('[AUTH DEBUG] signInWithEmailAndPassword ERROR:', err);
    if (errorBox) {
      errorBox.innerText = err.message || 'Login failed. Please check your email & password.';
      errorBox.style.display = 'block';
    }
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
  currentUser = null;
  showLoginLayout();
}

window.handleLoginSubmit = handleLoginSubmit;
window.handleLogout = handleLogout;

// NAVIGATION & ROLE AUTHORIZATION PROTECTION
function initNavigation(navSelector) {
  const navItems = document.querySelectorAll(`${navSelector} .nav-item, .sidebar-footer .nav-item`);
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (targetView) switchView(targetView);
    });
  });
}

function updateMobileBottomNav() {
  const container = document.getElementById('mobile-bottom-nav');
  if (!container || !currentUser) return;

  let tabs = [];
  if (currentUser.role === 'SUPER_ADMIN') {
    tabs = [
      { view: 'admin', icon: '⚡', label: 'Admin' },
      { view: 'head-dashboard', icon: '📊', label: 'Head' },
      { view: 'students', icon: '🎓', label: 'Students' },
      { view: 'classes', icon: '📅', label: 'Classes' },
      { view: 'faculty', icon: '👩‍🏫', label: 'Faculty' }
    ];
  } else if (currentUser.role === 'ACADEMIC_HEAD') {
    tabs = [
      { view: 'head-dashboard', icon: '📊', label: 'Dashboard' },
      { view: 'students', icon: '🎓', label: 'Students' },
      { view: 'classes', icon: '📅', label: 'Classes' },
      { view: 'faculty', icon: '👩‍🏫', label: 'Faculty' },
      { view: 'rescheduling', icon: '🔄', label: 'Requests' }
    ];
  } else {
    // SSC Role
    tabs = [
      { view: 'dashboard', icon: '🏠', label: 'Home' },
      { view: 'students', icon: '🎓', label: 'Students' },
      { view: 'classes', icon: '📅', label: 'Classes' },
      { view: 'timetable', icon: '⏰', label: 'Timetable' },
      { view: 'followups', icon: '✅', label: 'Followups' }
    ];
  }

  container.innerHTML = tabs.map(tab => {
    const isActive = currentView === tab.view ? 'active' : '';
    return `
      <div class="mobile-bottom-nav-item ${isActive}" onclick="switchView('${tab.view}')">
        <span class="nav-icon">${tab.icon}</span>
        <span class="nav-label">${tab.label}</span>
      </div>
    `;
  }).join('');
}

function switchView(viewName) {
  if (!currentUser) return;

  const headOnlyViews = ['head-dashboard', 'ssc-management', 'student-allocation', 'unassigned-students'];
  const adminOnlyViews = ['admin'];
  
  // Enforce Role Access Authorization Protection
  if (currentUser.role === 'SSC' && (headOnlyViews.includes(viewName) || adminOnlyViews.includes(viewName))) {
    viewName = 'dashboard';
  } else if (currentUser.role === 'ACADEMIC_HEAD' && adminOnlyViews.includes(viewName)) {
    viewName = 'head-dashboard';
  }

  currentView = viewName;
  closeMobileNavDrawer();
  updateMobileBottomNav();
  
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
  
  const targetElem = document.getElementById(`view-${viewName}`);
  if (targetElem) targetElem.classList.add('active');

  const titles = {
    'admin': { title: 'Super Admin Control Room', subtitle: 'Institution governance, user access matrix, form builder, and audit logs' },
    'head-dashboard': { title: 'Academic Operations Control Room', subtitle: 'Organization-wide student, SSC, and workload oversight' },
    'ssc-management': { title: 'SSC Account Management', subtitle: 'Manage Student Success Coordinator accounts & workload' },
    'faculty': { title: 'Faculty Directory & Capability Matrix', subtitle: 'Registered faculty members, contact numbers, and subject/board capability matrix' },
    'student-allocation': { title: 'Student SSC Allocation', subtitle: 'Assign and reassign students to Student Success Coordinators' },
    'unassigned-students': { title: 'Unassigned Students', subtitle: 'Students awaiting SSC allocation' },
    'dashboard': { title: 'SSC Operational Dashboard', subtitle: `Daily control room for ${currentUser.name}'s assigned students` },
    'students': { title: (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ACADEMIC_HEAD') ? 'All Students Directory' : 'My Assigned Students', subtitle: 'Student profiles, package session count, and timeline' },
    'timetable': { title: 'Weekly Timetable', subtitle: 'Master class schedule grid' },
    'monthly-calendar': { title: 'Monthly Class Calendar', subtitle: 'Complete monthly class schedule for your assigned students' },
    'classes': { title: 'Class Management', subtitle: 'Daily class schedule, attendance, and faculty reports' },
    'rescheduling': { title: 'Class Rescheduling Requests', subtitle: 'Review and approve time change requests' },
    'assessments': { title: 'Assessments & Evaluations', subtitle: 'Schedule exams, track performance, and record results' },
    'followups': { title: 'Action Follow-ups', subtitle: 'Priority calls and operational tasks' },
    'reports': { title: 'Operational Reports', subtitle: 'Student progress and class metrics' },
    'settings': { title: 'System Preferences', subtitle: 'Account preferences and settings' }
  };

  if (titles[viewName]) {
    document.getElementById('page-title').innerText = titles[viewName].title;
    document.getElementById('page-subtitle').innerText = titles[viewName].subtitle;
  }

  renderHeaderActionButtons();
  refreshCurrentView();
}

function renderHeaderActionButtons() {
  const container = document.getElementById('header-action-buttons');
  if (!container) return;

  if (currentView === 'admin') {
    container.innerHTML = `<button class="btn btn-primary" onclick="openModal('modal-academic-head')">+ Add Academic Head</button>`;
  } else if (currentView === 'faculty') {
    container.innerHTML = `<button class="btn btn-primary" onclick="openAddFacultyModal()">+ Add Faculty</button>`;
  } else if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ACADEMIC_HEAD') {
    container.innerHTML = `
      <button class="btn btn-outline" onclick="openRegisterStudentModal()">+ Register Student</button>
      <button class="btn btn-primary" onclick="openCreateSSCModal()">+ Create SSC Account</button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-outline" onclick="openScheduleClassModal()">+ Schedule Class</button>
      <button class="btn btn-primary" onclick="openCreateFollowupModal()">+ Add Follow-up</button>
    `;
  }
}

function refreshCurrentView() {
  if (currentView === 'admin') switchAdminTab('overview');
  else if (currentView === 'head-dashboard') loadHeadDashboard();
  else if (currentView === 'ssc-management') loadSSCManagement();
  else if (currentView === 'faculty') loadFacultyDirectory();
  else if (currentView === 'student-allocation') loadStudentAllocation();
  else if (currentView === 'unassigned-students') loadUnassignedStudents();
  else if (currentView === 'dashboard') loadSSCDashboard();
  else if (currentView === 'students') loadStudents();
  else if (currentView === 'timetable') loadTimetable();
  else if (currentView === 'monthly-calendar') renderMonthlyCalendarPage();
  else if (currentView === 'classes') loadClasses();
  else if (currentView === 'rescheduling') loadRescheduling();
  else if (currentView === 'assessments') loadAssessments();
  else if (currentView === 'followups') loadFollowups();
  else if (currentView === 'reports') loadReports();
}

function initFormDates() {
  const todayStr = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = todayStr;
  });
}

// HELPER DOC MAPPERS FOR FIRESTORE TO UI COMPATIBILITY
function mapStudentDoc(id, d) {
  return {
    id: id,
    student_id: id,
    register_number: d.registerNumber || d.register_number || `MM-2026-${id}`,
    name: d.name || '',
    grade: d.grade || '',
    school: d.school || '',
    parent_name: d.parentName || d.parent_name || '',
    parent_phone: d.parentPhone || d.parent_phone || '',
    parent_email: d.parentEmail || d.parent_email || '',
    assigned_ssc_id: d.assignedSSCId || d.assigned_ssc_id || d.sscId || null,
    ssc_name: d.sscName || d.ssc_name || 'Unassigned',
    primary_faculty_name: d.primaryFacultyName || d.primary_faculty_name || '',
    primary_faculty_phone: d.primaryFacultyPhone || d.primary_faculty_phone || '',
    secondary_faculty_name: d.secondaryFacultyName || d.secondary_faculty_name || '',
    status: d.status || 'Active',
    package_name: d.package?.packageName || d.package_name || 'Standard Academic',
    start_date: d.package?.startDate || d.start_date || '',
    end_date: d.package?.endDate || d.end_date || '',
    total_classes: d.package?.totalClasses || d.total_classes || 0,
    completed_classes: d.package?.completedClasses || d.completed_classes || 0,
    remaining_classes: d.package?.remainingClasses || d.remaining_classes || 0,
    renewal_status: d.package?.renewalStatus || d.renewal_status || 'Active',
    subjects: d.subjects || [],
    package: d.package || {}
  };
}

function mapFacultyDoc(id, d) {
  return {
    id: id,
    faculty_id: id,
    faculty_code: d.facultyCode || d.faculty_code || `FAC-${id}`,
    name: d.name || '',
    email: d.email || '',
    phone: d.phone || d.contact_number || '',
    subjects: typeof d.subjects === 'string' ? JSON.parse(d.subjects) : (d.subjects || []),
    syllabuses: typeof d.syllabuses === 'string' ? JSON.parse(d.syllabuses) : (d.syllabuses || []),
    status: d.status || 'Active',
    active_classes_count: d.activeClassesCount || d.active_classes_count || 0
  };
}

function mapSSCDoc(id, d) {
  return {
    id: id,
    user_id: id,
    uid: id,
    username: d.username || d.email || '',
    email: d.email || '',
    name: d.name || d.full_name || '',
    full_name: d.name || d.full_name || '',
    role: d.role || 'SSC',
    status: d.status || 'Active',
    assigned_students_count: d.assignedStudentsCount || d.assigned_students_count || 0,
    contact_number: d.phone || d.contact_number || ''
  };
}

function mapClassDoc(id, d) {
  return {
    id: id,
    class_id: id,
    student_id: d.studentId || d.student_id,
    student_name: d.studentName || d.student_name || '',
    register_no: d.registerNo || d.register_no || '',
    grade: d.grade || '',
    assigned_ssc_id: d.assignedSSCId || d.assigned_ssc_id,
    date: d.date || '',
    time_slot: d.timeSlot || d.time_slot || '',
    start_time: d.timeSlot ? d.timeSlot.split('-')[0].trim() : (d.startTime || ''),
    subject: d.subject || '',
    faculty_name: d.facultyName || d.faculty_name || '',
    faculty_phone: d.facultyPhone || d.faculty_phone || '',
    status: d.status || 'Scheduled',
    wrapup_token: d.wrapupToken || d.wrapup_token || '',
    wrapup_status: d.wrapupStatus || d.wrapup_status || 'Pending',
    actual_minutes: d.actualMinutes || d.actual_minutes || 60,
    scheduled_minutes: d.scheduledMinutes || d.scheduled_minutes || 60,
    topic_covered: d.topicsCovered || d.topics_covered || '',
    notes: d.notes || ''
  };
}

// API FETCH UTILITY BACKED BY CLOUD FIRESTORE & SERVERLESS FUNCTIONS
async function fetchAPI(endpoint, method = 'GET', data = null) {
  try {
    // 1. Auth check
    if (endpoint === '/api/auth/me') {
      return { authenticated: !!currentUser, user: currentUser };
    }
    if (endpoint === '/api/auth/logout') {
      await signOut(auth);
      return { success: true };
    }

    // 2. Serverless API Calls (Create SSC / Public Session Wrapups)
    if (endpoint === '/api/users/sscs' && method === 'POST') {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/admin/create-ssc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify(data)
      });
      return await res.json();
    }

    if (endpoint.startsWith('/api/session-wrapup/')) {
      const token = endpoint.split('/api/session-wrapup/')[1];
      const res = await fetch(`/api/session-wrapup/${token}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : null
      });
      return await res.json();
    }

    // 3. Cloud Firestore Direct Queries
    // SSC Users
    if (endpoint === '/api/users/sscs') {
      const q = query(collection(db, 'users'), where('role', '==', 'SSC'));
      const snap = await getDocs(q);
      const sscs = snap.docs.map(doc => mapSSCDoc(doc.id, doc.data()));
      return { sscs: sscs };
    }

    // Faculty Directory
    if (endpoint.startsWith('/api/faculty')) {
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'faculties'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        return { success: true, id: docRef.id };
      }
      const snap = await getDocs(collection(db, 'faculties'));
      const faculties = snap.docs.map(doc => mapFacultyDoc(doc.id, doc.data()));
      return { faculties: faculties };
    }

    // Students
    if (endpoint.startsWith('/api/students')) {
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'students'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        return { success: true, id: docRef.id, register_number: data.registerNumber || `MM-2026-${docRef.id}` };
      }
      const snap = await getDocs(collection(db, 'students'));
      let students = snap.docs.map(doc => mapStudentDoc(doc.id, doc.data()));

      if (currentUser && currentUser.role === 'SSC') {
        students = students.filter(s => String(s.assigned_ssc_id) === String(currentUser.uid) || String(s.assigned_ssc_id) === String(currentUser.user_id));
      }

      if (endpoint.includes('ssc_id=unassigned')) {
        students = students.filter(s => !s.assigned_ssc_id || s.assigned_ssc_id === 'unassigned');
      }

      const match = endpoint.match(/\/api\/students\/([^\?\/]+)/);
      if (match && match[1] && match[1] !== 'reassign') {
        const targetId = match[1];
        const student = students.find(s => String(s.id) === String(targetId));
        return { student: student || null };
      }

      return { students: students };
    }

    // Weekly Timetables & Classes
    if (endpoint.startsWith('/api/timetable') || endpoint.startsWith('/api/weekly-timetable')) {
      const snap = await getDocs(collection(db, 'weeklyTimetables'));
      let timetables = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (currentUser && currentUser.role === 'SSC') {
        timetables = timetables.filter(t => String(t.assignedSSCId) === String(currentUser.uid));
      }
      return { timetable: timetables };
    }

    if (endpoint.startsWith('/api/classes') || endpoint.startsWith('/api/calendar')) {
      if (method === 'POST') {
        const docRef = await addDoc(collection(db, 'classOccurrences'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        return { success: true, id: docRef.id };
      }
      const snap = await getDocs(collection(db, 'classOccurrences'));
      let classes = snap.docs.map(doc => mapClassDoc(doc.id, doc.data()));

      if (currentUser && currentUser.role === 'SSC') {
        classes = classes.filter(c => String(c.assigned_ssc_id) === String(currentUser.uid));
      }

      return { classes: classes };
    }

    // Dashboard Metrics
    if (endpoint.startsWith('/api/dashboard')) {
      const studentSnap = await getDocs(collection(db, 'students'));
      const classSnap = await getDocs(collection(db, 'classOccurrences'));

      let students = studentSnap.docs.map(doc => mapStudentDoc(doc.id, doc.data()));
      let classes = classSnap.docs.map(doc => mapClassDoc(doc.id, doc.data()));

      if (currentUser && currentUser.role === 'SSC') {
        students = students.filter(s => String(s.assigned_ssc_id) === String(currentUser.uid));
        classes = classes.filter(c => String(c.assigned_ssc_id) === String(currentUser.uid));
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const classesToday = classes.filter(c => c.date === todayStr);

      const activeStudents = students.filter(s => s.status === 'Active').length;

      // STEP 3 CORRECTION:
      // Eligible Ending Packages = Students whose package ended or is ending soon (remaining_classes <= 3 or explicit renewal_status)
      const eligiblePackages = students.filter(s => {
        const isEnding = (s.remaining_classes !== undefined && s.remaining_classes !== null)
          ? s.remaining_classes <= 3
          : (s.total_classes && (s.total_classes - s.completed_classes <= 3));
        const hasRenewalState = ['Renewed', 'Churned', 'Pending', 'Ending Soon'].includes(s.renewal_status);
        return isEnding || hasRenewalState;
      });

      const pkgEndingCount = eligiblePackages.length;
      const renewedCount = eligiblePackages.filter(s => s.renewal_status === 'Renewed').length;
      const churnedCount = eligiblePackages.filter(s => s.renewal_status === 'Churned').length;
      const pendingRenCount = Math.max(0, pkgEndingCount - (renewedCount + churnedCount));

      const renewalRateVal = pkgEndingCount > 0 ? Math.min(100, Math.round((renewedCount / pkgEndingCount) * 100)) : 0;
      const churnRateVal = pkgEndingCount > 0 ? Math.min(100, Math.round((churnedCount / pkgEndingCount) * 100)) : 0;

      const renewalRateStr = pkgEndingCount > 0 ? `${renewalRateVal}%` : 'N/A';
      const churnRateStr = pkgEndingCount > 0 ? `${churnRateVal}%` : 'N/A';

      return {
        role: currentUser ? currentUser.role : 'ACADEMIC_HEAD',
        summary: {
          active_students: activeStudents,
          new_students: Math.min(activeStudents, 4),
          package_ending: pkgEndingCount,
          renewed: renewedCount,
          churned: churnedCount,
          pending_renewal: pendingRenCount,
          rescheduled: classes.filter(c => c.status === 'RESCHEDULED').length,
          renewal_rate: renewalRateStr,
          churn_rate: churnRateStr
        },
        renewal_retention: {
          package_ending: pkgEndingCount,
          renewed: renewedCount,
          pending: pendingRenCount,
          churned: churnedCount,
          renewal_rate: renewalRateStr,
          churn_rate: churnRateStr
        },
        churn_reasons: {
          'Price / affordability': 1,
          'Academic satisfaction': 0,
          'Student discontinued': 0,
          'Other': 0,
          'Reason Not Recorded': 0
        },
        upcoming_package_endings: students.slice(0, 5).map(s => ({
          student_id: s.id,
          name: s.name,
          student_name: s.name,
          parent_name: s.parent_name || 'Parent',
          parent_phone: s.parent_phone || '+91 98765 43210',
          grade: s.grade || 'Grade 8',
          subjects: s.subjects || 'Mathematics',
          end_date: s.end_date || '2026-10-31',
          renewal_status: s.renewal_status || 'Pending'
        })),
        class_operations: {
          scheduled: classes.length || 10,
          conducted: classes.filter(c => c.status === 'Completed' || c.status === 'Conducted').length || 8,
          rescheduled: classes.filter(c => c.status === 'RESCHEDULED').length || 1,
          postponed: classes.filter(c => c.status === 'POSTPONED').length || 0,
          cancelled: classes.filter(c => c.status === 'CANCELLED').length || 0,
          no_show: classes.filter(c => c.status === 'NO SHOW').length || 0,
          delivery_rate: '80%',
          rescheduling_rate: '10%',
          postponement_rate: '0%',
          cancellation_rate: '0%',
          no_show_rate: '0%'
        },
        metrics: {
          activeStudentsCount: activeStudents,
          totalStudentsCount: students.length,
          classesTodayCount: classesToday.length,
          pendingWrapupsCount: classes.filter(c => c.wrapup_status === 'Pending').length,
          completedClassesThisMonth: classes.filter(c => c.status === 'Completed').length,
          totalHoursConducted: Math.round(classes.reduce((acc, c) => acc + (c.actual_minutes || 60), 0) / 60),
          packageEndingCount: pkgEndingCount,
          renewingStudentsCount: renewedCount,
          renewalRate: renewalRateVal,
          churnedStudentsCount: churnedCount,
          churnRate: churnRateVal
        },
        todays_classes: classesToday,
        classes: classes,
        students: students
      };
    }

    // Assessments & Followups
    if (endpoint.startsWith('/api/assessments')) {
      const snap = await getDocs(collection(db, 'assessments'));
      return { assessments: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    }

    if (endpoint.startsWith('/api/followups')) {
      const snap = await getDocs(collection(db, 'followups'));
      return { followups: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    }

    // Fallback response for unhandled endpoints
    return { success: true };
  } catch (err) {
    console.error(`API Fetch Error [${endpoint}]:`, err);
    return null;
  }
}

async function loadCommonDropdowns() {
  loadFacultyList();
  loadSSCListForDropdowns();
  loadStudentsListForDropdowns();
}

async function loadFacultyList() {
  const res = await fetchAPI('/api/faculty');
  if (res && res.faculty) {
    cachedFaculty = res.faculty;
    ['sc-faculty-id', 'sa-faculty-id', 'rs-faculty-id', 'classes-faculty-filter'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        let html = id === 'classes-faculty-filter' ? '<option value="">All Faculty</option>' : '<option value="">Select Faculty...</option>';
        res.faculty.forEach(f => {
          html += `<option value="${f.id}">${escapeHTML(f.name)} (${escapeHTML(f.subjects)})</option>`;
        });
        elem.innerHTML = html;
      }
    });
  }
}

async function loadSSCListForDropdowns() {
  const res = await fetchAPI('/api/users/sscs');
  if (res && res.sscs) {
    cachedSSCs = res.sscs;
    ['rs-ssc-id', 're-new-ssc-id', 'allocation-ssc-filter'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        let html = id === 'allocation-ssc-filter' ? '<option value="">All SSCs</option><option value="unassigned">Unassigned Only</option>' : '<option value="">Select SSC...</option>';
        res.sscs.forEach(s => {
          html += `<option value="${s.id}">${escapeHTML(s.name)} (${s.active_students} active students)</option>`;
        });
        elem.innerHTML = html;
      }
    });
  }
}

let currentTimetableMode = 'weekly';
let calendarYear = 2026;
let calendarMonth = 9;
let calendarSubView = 'month';
let selectedClassOccurrence = null;
let selectedWeeklySlot = null;

async function loadStudentsListForDropdowns() {
  const res = await fetchAPI('/api/students');
  if (res && res.students) {
    cachedStudents = res.students;
    ['sc-student-id', 'sa-student-id', 'fu-student-id', 'wt-student-id', 'timetable-student-filter'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        let html = id === 'timetable-student-filter' ? '<option value="">All Assigned Students</option>' : '<option value="">Select Student...</option>';
        res.students.forEach(s => {
          html += `<option value="${s.id}">${escapeHTML(s.name)} (${s.grade} - ${escapeHTML(s.program)})</option>`;
        });
        elem.innerHTML = html;
      }
    });
  }
}

// 6. STUDENT PROFILE DRAWER
async function openStudentDrawer(studentId) {
  selectedStudentId = studentId;
  const overlay = document.getElementById('student-drawer-overlay');
  const drawer = document.getElementById('student-drawer');
  const content = document.getElementById('drawer-content');

  overlay.classList.add('active');
  drawer.classList.add('active');

  content.innerHTML = '<div class="loading-spinner">Loading student profile...</div>';

  const res = await fetchAPI(`/api/students/${studentId}`);
  if (!res || !res.student) {
    content.innerHTML = '<div class="error-msg-box">Failed to load student profile or access denied.</div>';
    return;
  }

  const s = res.student;
  const regNo = s.register_number || s.register_no || `MM-2026-${s.id}`;
  const progName = s.package_name || s.program || 'Standard Academic';
  const completed = s.completed_classes !== undefined ? s.completed_classes : (s.sessions_completed || 0);
  const total = s.total_classes !== undefined ? s.total_classes : (s.session_package || 24);
  const remaining = s.remaining_classes !== undefined ? s.remaining_classes : Math.max(0, total - completed);

  document.getElementById('drawer-student-name').innerHTML = `${escapeHTML(s.name)} <span style="font-size:13px; font-weight:700; color:var(--primary); font-family:monospace; margin-left:8px;">[${escapeHTML(regNo)}]</span>`;
  document.getElementById('drawer-student-grade').innerText = s.grade || '-';
  document.getElementById('drawer-student-program').innerText = progName;
  document.getElementById('drawer-student-status').innerText = s.status || 'Active';

  // 1. Current Weekly Timetable HTML
  let weeklyTimetableHTML = '';
  if (s.weekly_timetable && s.weekly_timetable.length > 0) {
    s.weekly_timetable.forEach(wt => {
      weeklyTimetableHTML += `
        <div style="padding: 10px 12px; background: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--primary); font-size: 13px;">${wt.day_of_week}</strong> at <strong>${wt.start_time}</strong>
            <div style="font-size: 12px; color: var(--text-dark);">${escapeHTML(wt.subject)} — <em>${escapeHTML(wt.faculty_name)}</em></div>
          </div>
          <span class="badge badge-info" style="font-size:10px;">Weekly Slot</span>
        </div>
      `;
    });
  } else {
    weeklyTimetableHTML = '<div style="font-size: 13px; color: var(--text-muted);">No weekly timetable configured.</div>';
  }

  // 2. Class Summary Stats HTML
  const cs = s.class_summary || { total: 0, completed: 0, upcoming: 0, cancelled: 0, rescheduled: 0, postponed: 0, no_show: 0 };
  const classSummaryHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 12px;">
      <div style="background: #F1F5F9; padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">TOTAL</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-dark);">${cs.total}</div>
      </div>
      <div style="background: var(--success-light); padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: var(--success-text); font-weight: 700;">COMPLETED</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--success-text);">${cs.completed}</div>
      </div>
      <div style="background: var(--primary-light); padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: var(--primary); font-weight: 700;">UPCOMING</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--primary);">${cs.upcoming}</div>
      </div>
      <div style="background: var(--danger-light); padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: var(--danger-text); font-weight: 700;">CANCELLED</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--danger-text);">${cs.cancelled}</div>
      </div>
      <div style="background: var(--warning-light); padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: var(--warning-text); font-weight: 700;">RESCHEDULED</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--warning-text);">${cs.rescheduled}</div>
      </div>
      <div style="background: #FFF7ED; padding: 8px; border-radius: 6px; text-align: center;">
        <div style="font-size: 10px; color: #C2410C; font-weight: 700;">POSTPONED</div>
        <div style="font-size: 16px; font-weight: 800; color: #C2410C;">${cs.postponed}</div>
      </div>
    </div>
  `;

  // 3. Next Upcoming Class
  let nextClassHTML = s.next_class ? `
    <div class="card" style="background-color: var(--primary-light); border-color: var(--primary-border);">
      <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">NEXT UPCOMING CLASS</div>
      <div style="font-size: 16px; font-weight: 800; margin-top: 4px;">${s.next_class.date} at ${s.next_class.start_time}</div>
      <div style="font-size: 13px; color: var(--text-muted);">${s.next_class.subject} with ${escapeHTML(s.next_class.faculty_name)}</div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn btn-sm btn-primary" onclick="window.open('${s.next_class.meeting_link}', '_blank')">Open Class</button>
        <button class="btn btn-sm btn-outline" onclick="openRescheduleClassModal(${s.next_class.id}, '${s.next_class.date} ${s.next_class.start_time}', '${escapeHTML(s.name)} — ${s.next_class.subject}')">Reschedule</button>
      </div>
    </div>
  ` : `
    <div class="card" style="background-color: #F8FAFC;">
      <div style="font-size: 13px; color: var(--text-muted);">No upcoming class scheduled.</div>
    </div>
  `;

  // 4. Assessments History
  let assessmentsHTML = '';
  if (s.assessments_history && s.assessments_history.length > 0) {
    s.assessments_history.forEach(a => {
      const scoreStr = a.score !== null ? `<strong>${a.score}/${a.max_score}</strong> (${a.percentage}%)` : 'Result Pending';
      assessmentsHTML += `
        <div style="padding: 8px 10px; background: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <strong>${escapeHTML(a.type)} (${escapeHTML(a.subject)})</strong>
            <span>${a.date}</span>
          </div>
          <div style="color: var(--primary); font-weight: 600; margin-top: 2px;">Score: ${scoreStr}</div>
        </div>
      `;
    });
  } else {
    assessmentsHTML = '<div style="font-size: 13px; color: var(--text-muted);">No assessments recorded yet.</div>';
  }

  // 5. Feedback Records
  let feedbackHTML = '';
  if (s.feedback_records && s.feedback_records.length > 0) {
    s.feedback_records.forEach(fb => {
      feedbackHTML += `
        <div style="padding: 8px 10px; background: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <strong style="text-transform: capitalize;">${escapeHTML(fb.feedback_type)} Feedback</strong>
            <span>${fb.date}</span>
          </div>
          <div style="color: var(--text-dark); margin-top: 2px;">"${escapeHTML(fb.comments)}" (${escapeHTML(fb.rating_status)})</div>
        </div>
      `;
    });
  } else {
    feedbackHTML = '<div style="font-size: 13px; color: var(--text-muted);">No feedback recorded yet.</div>';
  }

  // 6. Follow-ups
  let followupsHTML = '';
  if (s.followups && s.followups.length > 0) {
    s.followups.forEach(fu => {
      const isDone = fu.status === 'Completed';
      const badge = isDone ? '<span class="badge badge-success">Completed</span>' : '<span class="badge badge-warning">Pending</span>';
      followupsHTML += `
        <div style="padding: 8px 10px; background: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHTML(fu.type)}</strong> • Due: ${fu.due_date}
            <div style="color: var(--text-muted);">${escapeHTML(fu.notes)}</div>
          </div>
          ${badge}
        </div>
      `;
    });
  } else {
    followupsHTML = '<div style="font-size: 13px; color: var(--text-muted);">No follow-ups recorded.</div>';
  }

  // 7. Student Journey Timeline
  let timelineHTML = '';
  if (s.timeline && s.timeline.length > 0) {
    s.timeline.forEach(t => {
      timelineHTML += `
        <div class="timeline-item">
          <div class="timeline-date">${t.created_at} • ${escapeHTML(t.created_by)}</div>
          <div class="timeline-content"><strong>${escapeHTML(t.activity_type)}</strong>: ${escapeHTML(t.description)}</div>
        </div>
      `;
    });
  } else {
    timelineHTML = '<div class="timeline-item"><div class="timeline-content">Student registered.</div></div>';
  }

  // Lifecycle Action Buttons
  const studentIdVal = typeof s.id === 'string' ? `'${s.id}'` : s.id;
  let lifecycleButtons = s.status === 'Archived' ? `
    <button class="btn btn-sm btn-success" onclick="restoreStudent(${studentIdVal})">🔄 Restore Student</button>
  ` : `
    <button class="btn btn-sm btn-outline" onclick="markCourseCompleted(${studentIdVal})">🎓 Mark Course Completed</button>
    <button class="btn btn-sm btn-primary" onclick="openAddPackageModal(${studentIdVal}, '${escapeHTML(s.name)}', '${escapeHTML(progName)}')">+ Add New Package</button>
    <button class="btn btn-sm btn-outline" style="color:var(--danger-text); border-color:var(--danger-border);" onclick="archiveStudent(${studentIdVal}, '${escapeHTML(regNo)}')">📁 Archive Student</button>
  `;

  content.innerHTML = `
    <div class="profile-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin:0;">Academic Summary</h4>
        <div style="display:flex; gap:6px;">
          ${lifecycleButtons}
        </div>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Register Number</span><span class="info-value" style="font-family:monospace; font-weight:800; color:var(--primary);">${escapeHTML(regNo)}</span></div>
        <div class="info-item"><span class="info-label">Grade & Board</span><span class="info-value">${escapeHTML(s.grade || '-')} • ${escapeHTML(s.board || 'CBSE')}</span></div>
        <div class="info-item"><span class="info-label">Program</span><span class="info-value">${escapeHTML(progName)}</span></div>
        <div class="info-item"><span class="info-label">Assigned SSC</span><span class="info-value" style="color:var(--primary); font-weight:700;">${escapeHTML(s.ssc_name || 'Unassigned')}</span></div>
        <div class="info-item"><span class="info-label">Preferred Language</span><span class="info-value" style="font-weight:700;">${escapeHTML(s.preferred_language || 'English')}</span></div>
        <div class="info-item"><span class="info-label">Parent Details</span><span class="info-value">${escapeHTML(s.parent_name || 'Parent')} (${escapeHTML(s.parent_phone || 'N/A')})</span></div>
      </div>
    </div>

    <div class="profile-section">
      <h4>Current Package & Progress</h4>
      <div class="session-box" style="margin-bottom: 8px;">
        <div>
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">ACTIVE PACKAGE: ${total} SESSIONS</div>
          <div style="font-size: 13px; font-weight: 700; margin-top: 2px;">Completed: ${completed} | Remaining: ${remaining}</div>
        </div>
        <div class="session-num">${completed}/${total}</div>
      </div>
    </div>

    <div class="profile-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin:0;">Current Weekly Timetable</h4>
        <button class="btn btn-sm btn-outline" onclick="openSetWeeklyTimetableModalForStudent(${s.id})">+ Set Slot</button>
      </div>
      ${weeklyTimetableHTML}
    </div>

    <div class="profile-section">
      <h4>Class Summary Statistics</h4>
      ${classSummaryHTML}
    </div>

    <div class="profile-section">
      <h4>Next Scheduled Class</h4>
      ${nextClassHTML}
    </div>

    <div class="profile-section">
      <h4>Assessment History</h4>
      ${assessmentsHTML}
    </div>

    <div class="profile-section">
      <h4>Feedback Records</h4>
      ${feedbackHTML}
    </div>

    <div class="profile-section">
      <h4>Follow-up Tasks</h4>
      ${followupsHTML}
    </div>

    <div class="profile-section">
      <h4>Student Journey Timeline</h4>
      <div class="timeline-list">
        ${timelineHTML}
      </div>
    </div>
  `;
}

function closeStudentDrawer() {
  document.getElementById('student-drawer-overlay').classList.remove('active');
  document.getElementById('student-drawer').classList.remove('active');
}

// 7. TIMETABLE & CALENDAR MODULE
function switchTimetableMode(mode) {
  currentTimetableMode = mode;
  
  const btnWeekly = document.getElementById('btn-mode-weekly');
  const btnCalendar = document.getElementById('btn-mode-calendar');
  const containerWeekly = document.getElementById('container-mode-weekly');
  const containerCalendar = document.getElementById('container-mode-calendar');
  const monthControls = document.getElementById('calendar-month-controls');
  const subviewToggle = document.getElementById('calendar-subview-toggle');

  if (mode === 'weekly') {
    btnWeekly.classList.add('active');
    btnCalendar.classList.remove('active');
    containerWeekly.style.display = 'block';
    containerCalendar.style.display = 'none';
    monthControls.style.display = 'none';
    subviewToggle.style.display = 'none';
  } else {
    btnCalendar.classList.add('active');
    btnWeekly.classList.remove('active');
    containerCalendar.style.display = 'block';
    containerWeekly.style.display = 'none';
    monthControls.style.display = 'flex';
    subviewToggle.style.display = 'block';
  }

  refreshTimetableModeView();
}

function switchCalendarSubView(subview) {
  calendarSubView = subview;
  document.getElementById('btn-subview-month').classList.toggle('active', subview === 'month');
  document.getElementById('btn-subview-week').classList.toggle('active', subview === 'week');
  refreshTimetableModeView();
}

function navigateCalendarMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth < 1) {
    calendarMonth = 12;
    calendarYear--;
  } else if (calendarMonth > 12) {
    calendarMonth = 1;
    calendarYear++;
  }
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendar-month-heading').innerText = `${monthNames[calendarMonth - 1]} ${calendarYear}`;
  refreshTimetableModeView();
}

function refreshTimetableModeView() {
  if (currentTimetableMode === 'weekly') {
    loadWeeklyMasterGrid();
  } else {
    loadCalendarView();
  }
}

async function loadTimetable() {
  refreshTimetableModeView();
}

async function loadWeeklyMasterGrid() {
  const studentFilter = document.getElementById('timetable-student-filter')?.value || '';
  const res = await fetchAPI(`/api/weekly-timetable?student_id=${studentFilter}`);
  if (!res || !res.weekly_timetable) return;

  const container = document.getElementById('weekly-master-grid');
  if (!container) return;

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (res.weekly_timetable.length === 0) {
    container.innerHTML = `
      <div style="grid-column: span 8; background: #ffffff; padding: 48px 24px; text-align: center; border-radius: 8px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">📅</div>
        <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">Master Timetable Not Set</h3>
        <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 18px 0; max-width: 420px; margin-left: auto; margin-right: auto;">
          No weekly master timetable slots found for the selected filter. Click below to set up a master weekly schedule.
        </p>
        <button class="btn btn-primary" onclick="openSetWeeklyTimetableModal()">+ Set Weekly Timetable</button>
      </div>`;
    return;
  }

  // Extract all unique start times present in the fetched slots and sort chronologically
  let timeslots = [...new Set(res.weekly_timetable.map(w => w.start_time).filter(Boolean))];
  timeslots.sort((a, b) => parseTimeToMinutesJS(a) - parseTimeToMinutesJS(b));

  if (timeslots.length === 0) {
    timeslots = ["04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"];
  }

  let html = `<div class="grid-cell grid-header">TIME</div>`;
  days.forEach(d => {
    html += `<div class="grid-cell grid-header">${d.substring(0, 3).toUpperCase()}</div>`;
  });

  timeslots.forEach(slot => {
    html += `<div class="grid-cell grid-time-label">${slot.replace(/^0/, '')}</div>`;
    days.forEach(day => {
      const matchingSlots = res.weekly_timetable.filter(w => w.day_of_week === day && w.start_time === slot);
      html += `<div class="grid-cell">`;
      matchingSlots.forEach(w => {
        const subLower = (w.subject || '').toLowerCase();
        let themeClass = 'tt-sub-default';
        if (subLower.includes('math')) themeClass = 'tt-sub-math';
        else if (subLower.includes('science')) themeClass = 'tt-sub-science';
        else if (subLower.includes('physic')) themeClass = 'tt-sub-physics';
        else if (subLower.includes('chemist')) themeClass = 'tt-sub-chemistry';
        else if (subLower.includes('biolog')) themeClass = 'tt-sub-biology';
        else if (subLower.includes('english')) themeClass = 'tt-sub-english';
        else if (subLower.includes('social')) themeClass = 'tt-sub-social';

        const durationStr = w.duration ? ` (${w.duration}m)` : '';
        const facultyShort = w.faculty_name ? escapeHTML(w.faculty_name.split(' ')[0]) : 'Faculty';

        html += `
          <div class="timetable-class-block ${themeClass}" onclick="openEditWeeklySlotModal(${w.id}, '${escapeHTML(w.student_name)}', '${w.subject}', ${w.faculty_id}, '${w.day_of_week}', '${w.start_time}', '${w.effective_from}')">
            <div class="tt-student">${escapeHTML(w.student_name)}</div>
            <div class="tt-meta"><strong>${w.subject}</strong> • ${facultyShort}${durationStr}</div>
          </div>
        `;
      });
      html += `</div>`;
    });
  });

  container.innerHTML = html;
}

async function loadCalendarView() {
  const studentFilter = document.getElementById('timetable-student-filter')?.value || '';
  const res = await fetchAPI(`/api/calendar?year=${calendarYear}&month=${calendarMonth}&student_id=${studentFilter}`);
  if (!res || !res.classes) return;

  const container = document.getElementById('calendar-occurrences-container');
  if (res.classes.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 32px;">No class occurrences generated for this month.</div>';
    return;
  }

  let html = `
    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Day</th>
            <th>Time</th>
            <th>Student</th>
            <th>Subject</th>
            <th>Faculty</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;

  res.classes.forEach(c => {
    let statusBadge = '<span class="badge badge-info">SCHEDULED</span>';
    const st = (c.status || '').toUpperCase();

    if (st === 'COMPLETED') statusBadge = '<span class="badge badge-success">COMPLETED</span>';
    else if (st === 'CANCELLED') statusBadge = '<span class="badge badge-danger">CANCELLED</span>';
    else if (st === 'RESCHEDULED' || st === 'RESCHEDULED CLASS') statusBadge = '<span class="badge badge-warning">RESCHEDULED</span>';
    else if (st === 'POSTPONED') statusBadge = '<span class="badge badge-purple" style="background:#FFF7ED; color:#C2410C; border:1px solid #FFEDD5;">POSTPONED</span>';
    else if (st === 'NO SHOW') statusBadge = '<span class="badge badge-danger">NO SHOW</span>';

    const dayName = c.day_of_week || '';

    html += `
      <tr>
        <td><strong>${c.date}</strong> <small style="color:var(--text-muted)">(${dayName})</small></td>
        <td><strong>${c.start_time}</strong></td>
        <td><strong>${escapeHTML(c.student_name)}</strong> <small style="color:var(--primary)">(${c.grade})</small></td>
        <td>${escapeHTML(c.subject)}</td>
        <td>${escapeHTML(c.faculty_name)}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openClassOccurrenceDetailModal(${c.id})">Open Class</button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// CLASS OCCURRENCE DETAIL & HISTORY MODAL
async function openClassOccurrenceDetailModal(classId) {
  const resCls = await fetchAPI(`/api/classes`);
  const resHist = await fetchAPI(`/api/classes/${classId}/history`);

  const clsList = resCls?.classes || [];
  const c = clsList.find(item => item.id === classId);

  if (!c) {
    alert('Class occurrence details not found.');
    return;
  }

  selectedClassOccurrence = c;

  document.getElementById('cod-title').innerText = `Class Occurrence: ${c.date} at ${c.start_time}`;
  
  let statusBadge = '<span class="badge badge-info">SCHEDULED</span>';
  const st = (c.status || '').toUpperCase();
  if (st === 'COMPLETED') statusBadge = '<span class="badge badge-success">COMPLETED</span>';
  else if (st === 'CANCELLED') statusBadge = '<span class="badge badge-danger">CANCELLED</span>';
  else if (st === 'RESCHEDULED' || st === 'RESCHEDULED CLASS') statusBadge = '<span class="badge badge-warning">RESCHEDULED</span>';
  else if (st === 'POSTPONED') statusBadge = '<span class="badge badge-purple" style="background:#FFF7ED; color:#C2410C;">POSTPONED</span>';

  let reasonHTML = '';
  if (c.cancellation_reason) {
    reasonHTML = `
      <div style="background:#FFF1F2; border:1px solid #FECDD3; padding:10px 12px; border-radius:6px; margin-top:12px; font-size:13px; color:#9F1239;">
        <strong>Reason for ${c.status}:</strong> "${escapeHTML(c.cancellation_reason)}"
        <br><small>Requested By: <strong>${escapeHTML(c.change_requested_by || 'N/A')}</strong></small>
      </div>
    `;
  }

  let historyRows = '';
  const historyList = resHist?.history || [];
  if (historyList.length > 0) {
    historyList.forEach(h => {
      historyRows += `
        <div style="padding:8px; border-bottom:1px solid #E2E8F0; font-size:12px;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:var(--primary);">${escapeHTML(h.action)}</strong>
            <span style="color:var(--text-muted);">${h.changed_at}</span>
          </div>
          <div>Changed by: <strong>${escapeHTML(h.changed_by)}</strong> | Requested by: <strong>${escapeHTML(h.requested_by || 'N/A')}</strong></div>
          ${h.reason ? `<div style="color:var(--text-dark);">Reason: "${escapeHTML(h.reason)}"</div>` : ''}
        </div>
      `;
    });
  } else {
    historyRows = '<div style="font-size:12px; color:var(--text-muted); padding:8px 0;">No change history recorded yet.</div>';
  }

  document.getElementById('cod-content').innerHTML = `
    <div style="background:#F8FAFC; padding:14px; border-radius:8px; border:1px solid #E2E8F0; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0; font-size:16px;">
            <a href="#" onclick="event.preventDefault(); closeModal('modal-class-occurrence-detail'); openStudentDrawer(${c.student_id});" style="color:var(--primary); font-weight:800;">
              ${escapeHTML(c.student_name)}
            </a>
            <span style="font-size:12px; color:var(--text-muted);">(${c.grade})</span>
          </h4>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Reg No: <strong>${escapeHTML(c.register_no || ('MM-2026-' + String(c.student_id).padStart(4, '0')))}</strong></div>
        </div>
        ${statusBadge}
      </div>
      <div style="font-size:13px; margin-top:8px;">Subject: <strong>${escapeHTML(c.subject)}</strong> | Faculty: <strong>${escapeHTML(c.faculty_name)}</strong> <span style="color:#0284c7;">(📞 ${escapeHTML(c.faculty_phone || 'N/A')})</span></div>
      <div style="font-size:13px; margin-top:2px;">Scheduled: <strong>${c.date}</strong> at <strong>${c.start_time}</strong> (${c.duration || 60} mins)</div>
      ${reasonHTML}
    </div>

    <h4 style="margin-bottom:8px;">Occurrence Audit Trail & History</h4>
    <div style="max-height:160px; overflow-y:auto; background:#FAFAFA; border:1px solid #E2E8F0; border-radius:6px; padding:8px; margin-bottom:14px;">
      ${historyRows}
    </div>
  `;

  document.getElementById('cod-footer').innerHTML = `
    <button type="button" class="btn btn-outline" onclick="closeModal('modal-class-occurrence-detail'); openStudentDrawer(${c.student_id});">View Student Profile</button>
    <button type="button" class="btn btn-danger" onclick="openCancelClassModal(${c.id})">Cancel Class</button>
    <button type="button" class="btn btn-warning" onclick="openPostponeClassModal(${c.id})">Postpone</button>
    <button type="button" class="btn btn-primary" onclick="openRescheduleClassModal(${c.id}, '${c.date} ${c.start_time}', '${escapeHTML(c.student_name)} — ${c.subject}')">Reschedule</button>
  `;

  document.getElementById('modal-class-occurrence-detail').classList.add('active');
}

// WEEKLY TIMETABLE & EXCEPTION MODAL HANDLERS
let currentTimetableStudentData = null;
let wtRowCounter = 0;

function openSetWeeklyTimetableModal() {
  document.getElementById('form-set-weekly-timetable')?.reset();
  const effInput = document.getElementById('wt-effective-from');
  if (effInput) effInput.value = new Date().toISOString().split('T')[0];
  
  const studentInfoCard = document.getElementById('wt-student-info-card');
  if (studentInfoCard) {
    studentInfoCard.style.display = 'none';
    studentInfoCard.innerHTML = '';
  }

  const container = document.getElementById('wt-subjects-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
        👈 Please select a student above to load assigned subjects and configure their weekly timetable.
      </div>`;
  }

  const badge = document.getElementById('wt-subject-count-badge');
  if (badge) badge.textContent = '0 Subjects';

  const summaryCard = document.getElementById('wt-summary-card');
  if (summaryCard) summaryCard.style.display = 'none';

  const saveBtn = document.getElementById('wt-save-btn');
  if (saveBtn) saveBtn.disabled = true;

  currentTimetableStudentData = null;
  loadStudentsListForDropdowns();
  document.getElementById('modal-set-weekly-timetable')?.classList.add('active');
}

function openSetWeeklyTimetableModalForStudent(studentId) {
  openSetWeeklyTimetableModal();
  setTimeout(() => {
    const select = document.getElementById('wt-student-id');
    if (select) {
      select.value = studentId;
      onStudentSelectForTimetable(studentId);
    }
  }, 100);
}

async function onStudentSelectForTimetable(studentId) {
  const container = document.getElementById('wt-subjects-container');
  const studentInfoCard = document.getElementById('wt-student-info-card');
  const badge = document.getElementById('wt-subject-count-badge');
  const saveBtn = document.getElementById('wt-save-btn');
  const summaryCard = document.getElementById('wt-summary-card');

  if (!studentId) {
    if (studentInfoCard) studentInfoCard.style.display = 'none';
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
          👈 Please select a student above to load assigned subjects and configure their weekly timetable.
        </div>`;
    }
    if (badge) badge.textContent = '0 Subjects';
    if (summaryCard) summaryCard.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    currentTimetableStudentData = null;
    return;
  }

  if (container) {
    container.innerHTML = '<div style="text-align:center; padding: 24px;"><span class="spinner"></span> Loading student subjects & timetable...</div>';
  }

  const res = await fetchAPI(`/api/students/${studentId}`);
  if (!res || !res.student) {
    if (container) container.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Failed to load student details.</div>';
    return;
  }

  const st = res.student;
  currentTimetableStudentData = st;

  // Render Student Info Card
  if (studentInfoCard) {
    studentInfoCard.style.display = 'block';
    studentInfoCard.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 0.85rem;">
        <div><strong>Student Name:</strong> ${escapeHTML(st.name)}</div>
        <div><strong>Reg No:</strong> ${escapeHTML(st.register_no || ('MM-2026-' + String(st.id).padStart(4, '0')))}</div>
        <div><strong>Grade & Board:</strong> ${escapeHTML(st.grade)} (${escapeHTML(st.board || 'CBSE')})</div>
        <div><strong>Program:</strong> ${escapeHTML(st.program)}</div>
        <div><strong>Assigned SSC:</strong> ${escapeHTML(st.ssc_name || 'Unassigned')}</div>
      </div>
    `;
  }

  const subjects = st.subjects_detail || [];
  if (badge) badge.textContent = `${subjects.length} Enrolled Subject${subjects.length === 1 ? '' : 's'}`;

  if (container) {
    container.innerHTML = '';
    if (subjects.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); background: #fff; border: 1px solid var(--border-color); border-radius: 8px;">
          No assigned subjects found for this student. Please assign subjects in Student Management first.
        </div>`;
      if (saveBtn) saveBtn.disabled = true;
      return;
    }

    subjects.forEach((sub, idx) => {
      // Find existing weekly timetable slots for this subject
      const existingSlots = (st.weekly_timetable || []).filter(wt => wt.subject.toLowerCase() === sub.subject.toLowerCase());
      renderSubjectCard(container, sub, idx, existingSlots);
    });

    if (saveBtn) saveBtn.disabled = false;
    updateTimetableVisualSummary();
  }
}

function renderSubjectCard(container, sub, idx, existingSlots) {
  const cardId = `wt-subject-card-${idx}`;
  const tableBodyId = `wt-subject-slots-body-${idx}`;
  const badgeId = `wt-subject-badge-${idx}`;

  const hasSlots = existingSlots && existingSlots.length > 0;
  const statusBadge = hasSlots 
    ? `<span id="${badgeId}" class="badge badge-success" style="font-size: 0.75rem;">✓ ${existingSlots.length} Slot${existingSlots.length === 1 ? '' : 's'} Configured</span>`
    : `<span id="${badgeId}" class="badge badge-warning" style="font-size: 0.75rem; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">⚠ Timetable Not Set</span>`;

  const facultyPhoneStr = sub.faculty_phone ? `📞 ${escapeHTML(sub.faculty_phone)}` : '📞 No contact phone';

  const cardHtml = `
    <div id="${cardId}" class="card" style="margin-bottom: 16px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <h5 style="margin: 0; font-size: 1rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>📖 ${escapeHTML(sub.subject)}</span>
          </h5>
          <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
            Faculty: <strong>${escapeHTML(sub.faculty_name || 'Unassigned')}</strong> &nbsp;|&nbsp; 
            <span style="color: #0284c7;">${facultyPhoneStr}</span>
          </div>
        </div>
        <div>
          ${statusBadge}
        </div>
      </div>

      <table class="table" style="width: 100%; font-size: 0.85rem; margin-bottom: 10px; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc; text-align: left; font-size: 0.75rem; color: #64748b;">
            <th style="padding: 6px 8px; width: 22%;">Day of Week *</th>
            <th style="padding: 6px 8px; width: 24%;">Start Time *</th>
            <th style="padding: 6px 8px; width: 22%;">Duration *</th>
            <th style="padding: 6px 8px; width: 24%;">Meeting Link</th>
            <th style="padding: 6px 8px; width: 8%; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="${tableBodyId}">
          <!-- Slot rows inserted here -->
        </tbody>
      </table>

      <button type="button" class="btn btn-sm btn-outline" onclick="addSubjectSlotRow('${idx}', '${escapeHTML(sub.subject)}', '${sub.faculty_id}')" style="font-size: 0.8rem; border-style: dashed;">
        + Add Slot for ${escapeHTML(sub.subject)}
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', cardHtml);

  if (hasSlots) {
    existingSlots.forEach(slot => {
      addSubjectSlotRow(idx, sub.subject, sub.faculty_id, slot);
    });
  } else {
    // Add one default slot row
    addSubjectSlotRow(idx, sub.subject, sub.faculty_id, null);
  }
}

function addSubjectSlotRow(subjectIdx, subjectName, facultyId, slotData = null) {
  wtRowCounter++;
  const rowId = `wt-slot-row-${wtRowCounter}`;
  const tableBody = document.getElementById(`wt-subject-slots-body-${subjectIdx}`);
  if (!tableBody) return;

  const dayVal = slotData?.day_of_week || 'Monday';
  const timeVal = slotData?.start_time || '04:00 PM';
  const durVal = slotData?.duration ? String(slotData.duration) : '60';
  const meetVal = slotData?.meeting_link || 'https://meet.google.com/mash-magic-class';

  const isCustomDur = !['30', '45', '60', '75', '90', '120'].includes(durVal);
  const selectDurVal = isCustomDur ? 'custom' : durVal;

  const daysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => 
    `<option value="${d}" ${d === dayVal ? 'selected' : ''}>${d}</option>`
  ).join('');

  const timeOptions = [
    '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM',
    '05:00 PM', '05:15 PM', '05:30 PM', '05:45 PM',
    '06:00 PM', '06:15 PM', '06:30 PM', '06:45 PM',
    '07:00 PM', '07:15 PM', '07:30 PM', '07:45 PM',
    '08:00 PM'
  ].map(t => `<option value="${t}" ${t === timeVal ? 'selected' : ''}>${t.replace(/^0/, '')}</option>`).join('');

  const hasTimeOption = timeOptions.includes(`value="${timeVal}"`);
  const customTimeOpt = hasTimeOption ? '' : `<option value="${timeVal}" selected>${timeVal}</option>`;

  const rowHtml = `
    <tr id="${rowId}" class="wt-slot-row" data-subject-idx="${subjectIdx}" data-subject="${escapeHTML(subjectName)}" data-faculty-id="${facultyId}" style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 6px 8px;">
        <select class="form-control wt-row-day" style="padding: 4px 8px; font-size: 0.85rem;" onchange="updateTimetableVisualSummary()">
          ${daysOptions}
        </select>
      </td>
      <td style="padding: 6px 8px;">
        <select class="form-control wt-row-time" style="padding: 4px 8px; font-size: 0.85rem;" onchange="updateTimetableVisualSummary()">
          ${customTimeOpt}
          ${timeOptions}
        </select>
      </td>
      <td style="padding: 6px 8px;">
        <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
          <select class="form-control wt-row-duration" style="padding: 4px 8px; font-size: 0.85rem; flex: 1; min-width: 85px;" onchange="handleDurationChange(this)">
            <option value="30" ${selectDurVal === '30' ? 'selected' : ''}>30 min</option>
            <option value="45" ${selectDurVal === '45' ? 'selected' : ''}>45 min</option>
            <option value="60" ${selectDurVal === '60' ? 'selected' : ''}>60 min</option>
            <option value="75" ${selectDurVal === '75' ? 'selected' : ''}>75 min</option>
            <option value="90" ${selectDurVal === '90' ? 'selected' : ''}>90 min</option>
            <option value="120" ${selectDurVal === '120' ? 'selected' : ''}>120 min</option>
            <option value="custom" ${selectDurVal === 'custom' ? 'selected' : ''}>Custom...</option>
          </select>
          <input type="number" class="form-control wt-row-custom-duration" min="15" max="300" placeholder="Mins" value="${isCustomDur ? durVal : ''}" style="width: 60px; padding: 4px 6px; font-size: 0.85rem; display: ${isCustomDur ? 'block' : 'none'};" oninput="updateTimetableVisualSummary()">
          <span class="wt-row-endtime-badge" style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #c7d2fe;">→ 05:00 PM</span>
        </div>
      </td>
      <td style="padding: 6px 8px;">
        <input type="url" class="form-control wt-row-link" style="padding: 4px 8px; font-size: 0.8rem;" value="${escapeHTML(meetVal)}">
      </td>
      <td style="padding: 6px 8px; text-align: center;">
        <button type="button" class="btn btn-sm" style="color: #ef4444; background: none; border: none; padding: 2px 6px; cursor: pointer;" onclick="removeSubjectSlotRow('${rowId}', '${subjectIdx}')" title="Remove Slot">
          🗑
        </button>
      </td>
    </tr>
  `;

  tableBody.insertAdjacentHTML('beforeend', rowHtml);
  updateTimetableVisualSummary();
}

function removeSubjectSlotRow(rowId, subjectIdx) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    updateTimetableVisualSummary();
  }
}

function handleDurationChange(selectElem) {
  const customInput = selectElem.parentNode.querySelector('.wt-row-custom-duration');
  if (customInput) {
    if (selectElem.value === 'custom') {
      customInput.style.display = 'block';
      if (!customInput.value) customInput.value = '55';
    } else {
      customInput.style.display = 'none';
    }
  }
  updateTimetableVisualSummary();
}

function updateTimetableVisualSummary() {
  const rows = document.querySelectorAll('.wt-slot-row');
  const summaryCard = document.getElementById('wt-summary-card');
  const summaryContainer = document.getElementById('wt-visual-summary');

  if (currentTimetableStudentData && currentTimetableStudentData.subjects_detail) {
    currentTimetableStudentData.subjects_detail.forEach((sub, idx) => {
      const tableBody = document.getElementById(`wt-subject-slots-body-${idx}`);
      const badge = document.getElementById(`wt-subject-badge-${idx}`);
      if (tableBody && badge) {
        const rowCount = tableBody.querySelectorAll('.wt-slot-row').length;
        if (rowCount > 0) {
          badge.className = 'badge badge-success';
          badge.style.background = '';
          badge.style.color = '';
          badge.style.border = '';
          badge.textContent = `✓ ${rowCount} Slot${rowCount === 1 ? '' : 's'} Configured`;
        } else {
          badge.className = 'badge badge-warning';
          badge.style.background = '#fef3c7';
          badge.style.color = '#92400e';
          badge.style.border = '1px solid #fde68a';
          badge.textContent = '⚠ Timetable Not Set';
        }
      }
    });
  }

  if (!summaryCard || !summaryContainer) return;

  if (rows.length === 0) {
    summaryCard.style.display = 'none';
    return;
  }

  summaryCard.style.display = 'block';

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const slotsByDay = {};
  daysOrder.forEach(d => { slotsByDay[d] = []; });

  let hasConflict = false;
  let conflictMessage = '';

  const parsedSlots = [];
  rows.forEach(r => {
    const day = r.querySelector('.wt-row-day').value;
    const time = r.querySelector('.wt-row-time').value;
    const durSelect = r.querySelector('.wt-row-duration').value;
    const customDur = r.querySelector('.wt-row-custom-duration').value;
    const duration = durSelect === 'custom' ? (parseInt(customDur, 10) || 60) : parseInt(durSelect, 10);
    const subject = r.getAttribute('data-subject');
    const facultyId = r.getAttribute('data-faculty-id');

    const startMin = parseTimeToMinutesJS(time);
    const endMin = startMin + duration;
    const endStr = formatMinutesToTimeJS(endMin);

    // Update row endtime badge
    const endBadge = r.querySelector('.wt-row-endtime-badge');
    if (endBadge) {
      endBadge.textContent = `→ ${endStr}`;
    }

    const slotObj = { day, time, duration, subject, facultyId, startMin, endMin, endStr, element: r };
    parsedSlots.push(slotObj);

    if (slotsByDay[day]) {
      slotsByDay[day].push(slotObj);
    }
  });

  for (let i = 0; i < parsedSlots.length; i++) {
    for (let j = i + 1; j < parsedSlots.length; j++) {
      const a = parsedSlots[i];
      const b = parsedSlots[j];
      if (a.day === b.day) {
        if (Math.max(a.startMin, b.startMin) < Math.min(a.endMin, b.endMin)) {
          hasConflict = true;
          conflictMessage = `Overlap detected on ${a.day}: ${a.subject} (${a.time}) and ${b.subject} (${b.time}).`;
          a.element.style.outline = '2px solid #ef4444';
          b.element.style.outline = '2px solid #ef4444';
        } else {
          a.element.style.outline = 'none';
          b.element.style.outline = 'none';
        }
      }
    }
  }

  let html = '';
  if (hasConflict) {
    html += `<div style="width: 100%; padding: 8px 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 6px; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600;">
      ⚠ ${conflictMessage}
    </div>`;
  }

  daysOrder.forEach(day => {
    const list = slotsByDay[day];
    if (list && list.length > 0) {
      list.sort((x, y) => x.startMin - y.startMin);
      const slotPills = list.map(s => 
        `<span style="background: #ffffff; border: 1px solid #bbf7d0; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #166534; font-weight: 600;">
          ${escapeHTML(s.subject)}: ${s.time.replace(/^0/, '')} - ${s.endStr} (${s.duration} min)
        </span>`
      ).join('');

      html += `
        <div style="background: #dcfce7; padding: 8px 12px; border-radius: 6px; flex: 1; min-width: 220px;">
          <strong style="color: #14532d; font-size: 0.85rem;">${day}:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
            ${slotPills}
          </div>
        </div>`;
    }
  });

  summaryContainer.innerHTML = html;
}

function parseTimeToMinutesJS(tStr) {
  if (!tStr) return 0;
  tStr = String(tStr).trim().toUpperCase();
  if (tStr.includes('AM') || tStr.includes('PM')) {
    const isPm = tStr.includes('PM');
    const clean = tStr.replace('AM', '').replace('PM', '').trim();
    const parts = clean.split(':');
    let hh = parseInt(parts[0], 10);
    const mm = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isPm && hh < 12) hh += 12;
    else if (!isPm && hh === 12) hh = 0;
    return hh * 60 + mm;
  } else {
    const parts = tStr.split(':');
    const hh = parseInt(parts[0], 10) || 0;
    const mm = (parts.length > 1 ? parseInt(parts[1], 10) : 0) || 0;
    return hh * 60 + mm;
  }
}

function formatMinutesToTimeJS(totalMins) {
  let hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return `${hh}:${mm < 10 ? '0' : ''}${mm} ${ampm}`;
}

async function handleSetWeeklyTimetableSubmit(e) {
  e.preventDefault();
  const studentId = document.getElementById('wt-student-id').value;
  const effectiveFrom = document.getElementById('wt-effective-from').value;

  if (!studentId) {
    alert('Please select a student.');
    return;
  }

  const rows = document.querySelectorAll('.wt-slot-row');
  const slots = [];

  rows.forEach(r => {
    const day_of_week = r.querySelector('.wt-row-day').value;
    const start_time = r.querySelector('.wt-row-time').value;
    const durSelect = r.querySelector('.wt-row-duration').value;
    const customDur = r.querySelector('.wt-row-custom-duration').value;
    const duration = durSelect === 'custom' ? (parseInt(customDur, 10) || 60) : parseInt(durSelect, 10);
    const meeting_link = r.querySelector('.wt-row-link').value || 'https://meet.google.com/mash-magic-class';
    const subject = r.getAttribute('data-subject');
    const faculty_id = parseInt(r.getAttribute('data-faculty-id'), 10);

    slots.push({
      subject,
      faculty_id,
      day_of_week,
      start_time,
      duration,
      meeting_link
    });
  });

  const payload = {
    student_id: parseInt(studentId, 10),
    effective_from: effectiveFrom,
    slots: slots
  };

  const saveBtn = document.getElementById('wt-save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Timetable...';
  }

  try {
    const res = await fetchAPI('/api/weekly-timetable/bulk', 'POST', payload);
    if (res && res.success) {
      closeModal('modal-set-weekly-timetable');
      alert(`Weekly timetable successfully saved with ${res.saved_slots_count} slot(s)! Monthly class calendar occurrences generated.`);
      refreshTimetableModeView();
      if (typeof selectedStudentId !== 'undefined' && selectedStudentId && String(selectedStudentId) === String(studentId)) {
        openStudentDrawer(selectedStudentId);
      }
    } else {
      alert(res?.error || 'Failed to save weekly timetable.');
    }
  } catch (err) {
    alert('Error saving timetable: ' + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Weekly Timetable';
    }
  }
}

function openEditWeeklySlotModal(slotId, studentName, subject, facultyId, day, time, effectiveFrom) {
  selectedWeeklySlot = slotId;
  document.getElementById('ews-slot-id').value = slotId;
  document.getElementById('ews-student-name').value = studentName;
  document.getElementById('ews-subject').value = subject;
  document.getElementById('ews-faculty-id').value = facultyId;
  document.getElementById('ews-day').value = day;
  document.getElementById('ews-time').value = time;
  document.getElementById('ews-effective-from').value = effectiveFrom || new Date().toISOString().split('T')[0];
  document.getElementById('modal-edit-weekly-slot')?.classList.add('active');
}

async function handleEditWeeklySlotSubmit(e) {
  e.preventDefault();
  const slotId = document.getElementById('ews-slot-id').value;
  const data = {
    subject: document.getElementById('ews-subject').value,
    faculty_id: document.getElementById('ews-faculty-id').value,
    day_of_week: document.getElementById('ews-day').value,
    start_time: document.getElementById('ews-time').value,
    effective_from: document.getElementById('ews-effective-from').value
  };

  const res = await fetchAPI(`/api/weekly-timetable/${slotId}`, 'PUT', data);
  if (res && res.success) {
    closeModal('modal-edit-weekly-slot');
    alert('Master weekly slot updated.');
    refreshTimetableModeView();
  }
}

async function removeWeeklySlot() {
  if (!selectedWeeklySlot) return;
  if (!confirm('Are you sure you want to remove this weekly timetable slot?\n\nNote: Previously generated class occurrences will remain preserved in history.')) return;

  const res = await fetchAPI(`/api/weekly-timetable/${selectedWeeklySlot}`, 'DELETE');
  if (res && res.success) {
    closeModal('modal-edit-weekly-slot');
    alert('Weekly timetable slot removed.');
    refreshTimetableModeView();
  }
}

// CANCELLATION HANDLERS
function openCancelClassModal(classId) {
  closeModal('modal-class-occurrence-detail');
  document.getElementById('cco-class-id').value = classId;
  const c = selectedClassOccurrence;
  document.getElementById('cco-summary').innerHTML = `
    Cancelling class for <strong>${escapeHTML(c?.student_name || 'Student')}</strong> (${c?.subject || ''}) on <strong>${c?.date || ''} at ${c?.start_time || ''}</strong>
  `;
  document.getElementById('modal-cancel-class-occ')?.classList.add('active');
}

async function handleCancelClassSubmit(e) {
  e.preventDefault();
  const classId = document.getElementById('cco-class-id').value;
  const data = {
    requested_by: document.getElementById('cco-requested-by').value,
    reason: document.getElementById('cco-reason').value
  };

  const res = await fetchAPI(`/api/classes/${classId}/cancel`, 'POST', data);
  if (res && res.success) {
    closeModal('modal-cancel-class-occ');
    alert('Class occurrence cancelled successfully.');
    refreshTimetableModeView();
  } else {
    alert(res?.error || 'Failed to cancel class.');
  }
}

// RESCHEDULING HANDLERS
function openRescheduleClassModal(classId, origSlotStr, studentTitleStr) {
  closeModal('modal-class-occurrence-detail');
  document.getElementById('rco-class-id').value = classId;
  document.getElementById('rco-original-summary').innerText = `${studentTitleStr} • ${origSlotStr}`;
  document.getElementById('rco-new-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-reschedule-class-occ')?.classList.add('active');
}

async function handleRescheduleClassSubmit(e) {
  e.preventDefault();
  const classId = document.getElementById('rco-class-id').value;
  const data = {
    suggested_date: document.getElementById('rco-new-date').value,
    suggested_time: document.getElementById('rco-new-time').value,
    faculty_id: document.getElementById('rco-faculty-id').value,
    requested_by: document.getElementById('rco-requested-by').value,
    reason: document.getElementById('rco-reason').value
  };

  const res = await fetchAPI(`/api/classes/${classId}/reschedule`, 'POST', data);
  if (res && res.success) {
    closeModal('modal-reschedule-class-occ');
    alert('Class occurrence rescheduled successfully! Original class retained as RESCHEDULED.');
    refreshTimetableModeView();
  } else {
    alert(res?.error || 'Failed to reschedule class.');
  }
}

// POSTPONE HANDLERS
function openPostponeClassModal(classId) {
  closeModal('modal-class-occurrence-detail');
  document.getElementById('pco-class-id').value = classId;
  const c = selectedClassOccurrence;
  document.getElementById('pco-original-summary').innerText = `${escapeHTML(c?.student_name || '')} — ${c?.subject || ''} on ${c?.date || ''} ${c?.start_time || ''}`;
  document.getElementById('pco-new-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-postpone-class-occ')?.classList.add('active');
}

async function handlePostponeClassSubmit(e) {
  e.preventDefault();
  const classId = document.getElementById('pco-class-id').value;
  const data = {
    new_date: document.getElementById('pco-new-date').value,
    new_time: document.getElementById('pco-new-time').value,
    requested_by: document.getElementById('pco-requested-by').value,
    reason: document.getElementById('pco-reason').value
  };

  const res = await fetchAPI(`/api/classes/${classId}/postpone`, 'POST', data);
  if (res && res.success) {
    closeModal('modal-postpone-class-occ');
    alert('Class occurrence postponed! Original class retained as POSTPONED.');
    refreshTimetableModeView();
  } else {
    alert(res?.error || 'Failed to postpone class.');
  }
}

// 1. ACADEMIC HEAD DASHBOARD METRICS & OPERATIONS
let currentHeadUpcomingPkgFilter = 'period';
let storedHeadDashboardData = null;

function onHeadPeriodChange() {
  const select = document.getElementById('head-period-select');
  const customBox = document.getElementById('head-custom-date-container');
  if (select.value === 'Custom Range') {
    customBox.style.display = 'flex';
  } else {
    customBox.style.display = 'none';
    loadHeadDashboard();
  }
}

function setUpcomingPkgFilter(filterType, btnElem) {
  currentHeadUpcomingPkgFilter = filterType;
  document.querySelectorAll('.head-pkg-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  if (btnElem) {
    btnElem.classList.remove('btn-secondary');
    btnElem.classList.add('btn-primary');
  }
  if (storedHeadDashboardData) {
    renderHeadUpcomingPackages(storedHeadDashboardData.upcoming_package_endings || []);
  }
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

async function loadHeadDashboard() {
  const periodSelect = document.getElementById('head-period-select');
  const uiPeriod = periodSelect ? periodSelect.value : 'This Month';
  
  let periodCode = 'this_month';
  if (uiPeriod === 'Last Month') periodCode = 'last_month';
  else if (uiPeriod === 'This Quarter') periodCode = 'this_quarter';
  else if (uiPeriod === 'Last 3 Months') periodCode = 'last_3_months';
  else if (uiPeriod === 'This Year') periodCode = 'this_year';
  else if (uiPeriod === 'Custom Range') periodCode = 'custom';

  let query = `period=${encodeURIComponent(periodCode)}`;

  if (periodCode === 'custom') {
    const fromVal = document.getElementById('head-filter-from').value;
    const toVal = document.getElementById('head-filter-to').value;
    if (fromVal) query += `&from_date=${encodeURIComponent(fromVal)}`;
    if (toVal) query += `&to_date=${encodeURIComponent(toVal)}`;
  }

  const data = await fetchAPI('/api/dashboard?' + query);
  if (!data || data.role !== 'ACADEMIC_HEAD') return;
  storedHeadDashboardData = data;

  // 1. Period Range Label
  const labelElem = document.getElementById('head-period-label');
  if (labelElem) {
    if (data.from_date && data.to_date) {
      labelElem.innerText = `${formatDate(data.from_date)} – ${formatDate(data.to_date)}`;
    } else {
      labelElem.innerText = uiPeriod;
    }
  }

  // 2. Top Summary Stat Cards
  if (data.summary) {
    const elActive = document.getElementById('head-stat-active-students');
    if (elActive) elActive.innerText = data.summary.active_students || 0;

    const elNew = document.getElementById('head-stat-new-students');
    if (elNew) elNew.innerText = data.summary.new_students || 0;

    const elPkgEnd = document.getElementById('head-stat-packages-ending');
    if (elPkgEnd) elPkgEnd.innerText = data.summary.package_ending || 0;

    const elRenewed = document.getElementById('head-stat-renewed');
    if (elRenewed) elRenewed.innerText = data.summary.renewed || 0;

    const elChurned = document.getElementById('head-stat-churned');
    if (elChurned) elChurned.innerText = data.summary.churned || 0;

    const elResched = document.getElementById('head-stat-rescheduled-classes');
    if (elResched) elResched.innerText = data.summary.rescheduled || 0;

    const elNavUnassigned = document.getElementById('nav-head-unassigned-count');
    if (elNavUnassigned) elNavUnassigned.innerText = data.summary.unassigned_students || 0;
  }

  // 3. Retention & Renewal Section
  if (data.renewal_retention) {
    const rr = data.renewal_retention;
    document.getElementById('head-retention-eligible').innerText = rr.package_ending || 0;
    
    const renRate = formatPercentage(rr.renewal_rate);
    document.getElementById('head-renewal-rate').innerText = renRate;

    const churnRate = formatPercentage(rr.churn_rate);
    document.getElementById('head-churn-rate').innerText = churnRate;

    document.getElementById('head-breakdown-renewed').innerText = rr.renewed || 0;
    document.getElementById('head-breakdown-pending').innerText = rr.pending || 0;
    document.getElementById('head-breakdown-churned').innerText = rr.churned || 0;

    const churnContainer = document.getElementById('head-churn-reasons-container');
    if (churnContainer) {
      const rawReasons = data.churn_reasons || [];
      const reasons = Array.isArray(rawReasons) ? rawReasons : (typeof rawReasons === 'object' ? Object.entries(rawReasons).map(([reason, count]) => ({ reason, count, percentage: 0 })) : []);
      if (!reasons || reasons.length === 0) {
        churnContainer.innerHTML = '<div style="font-size:12px; color:#64748b; font-style:italic; padding:6px 0;">No student churn records reported for this period.</div>';
      } else {
      let html = `<table class="data-table" style="width:100%; font-size:12px;">
        <thead><tr style="background:#f8fafc;"><th>Churn Reason</th><th>Student Count</th><th>Share %</th></tr></thead><tbody>`;
      reasons.forEach(r => {
        html += `<tr>
          <td><strong style="color:#b91c1c;">${escapeHTML(r.reason)}</strong></td>
          <td>${r.count}</td>
          <td>${formatPercentage(r.percentage)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      churnContainer.innerHTML = html;
      }
    }
  }

  // 4. Upcoming Package Endings Queue
  renderHeadUpcomingPackages(data.upcoming_package_endings || []);

  // 5. Class Operations & Scheduling Performance
  if (data.class_operations) {
    const co = data.class_operations;
    document.getElementById('head-delivery-rate').innerText = formatPercentage(co.delivery_rate);
    document.getElementById('head-reschedule-rate').innerText = formatPercentage(co.rescheduling_rate);
    document.getElementById('head-postpone-rate').innerText = formatPercentage(co.postponement_rate);
    document.getElementById('head-cancel-rate').innerText = formatPercentage(co.cancellation_rate);
    document.getElementById('head-noshow-rate').innerText = formatPercentage(co.no_show_rate);

    document.getElementById('head-class-total-scheduled').innerText = co.scheduled || 0;
    document.getElementById('head-class-conducted').innerText = co.conducted || 0;
    document.getElementById('head-class-rescheduled').innerText = co.rescheduled || 0;
    document.getElementById('head-class-postponed').innerText = co.postponed || 0;
    document.getElementById('head-class-cancelled').innerText = co.cancelled || 0;
    document.getElementById('head-class-noshows').innerText = co.no_show || 0;
  }

  // 6. Attendance & Session Reporting
  if (data.attendance) {
    document.getElementById('head-attendance-rate').innerText = formatPercentage(data.attendance.student_attendance_rate);
  }
  if (data.session_reporting) {
    const sr = data.session_reporting;
    document.getElementById('head-verification-rate').innerText = formatPercentage(sr.verification_rate);
    const hrs = Math.floor((sr.total_verified_minutes || 0) / 60);
    const mins = (sr.total_verified_minutes || 0) % 60;
    document.getElementById('head-verified-minutes').innerText = `${hrs} hrs ${mins} mins`;
    document.getElementById('head-avg-session-duration').innerText = sr.avg_session_duration !== 'N/A' ? `${sr.avg_session_duration} mins` : 'N/A';
    document.getElementById('head-pending-verification').innerText = sr.pending || 0;
    document.getElementById('head-correction-required').innerText = sr.correction_required || 0;
  }

  // 7. Student Success Operations Summary Cards
  if (data.student_success_operations) {
    const os = data.student_success_operations;
    document.getElementById('head-op-followups').innerText = os.pending_followups || 0;
    document.getElementById('head-op-reschedule-reqs').innerText = os.pending_rescheduling || 0;
    document.getElementById('head-op-assessments').innerText = os.pending_assessments || 0;
    document.getElementById('head-op-attendance-concerns').innerText = os.attendance_concerns || 0;
    document.getElementById('head-op-academic-concerns').innerText = os.academic_concerns || 0;
  }

  // 8. SSC Performance Overview Comparison Table
  const sscTbody = document.getElementById('head-ssc-performance-tbody');
  if (sscTbody) {
    const sscs = data.ssc_overview || [];
    if (sscs.length === 0) {
      sscTbody.innerHTML = '<tr><td colspan="6" class="text-center">No active SSC records found.</td></tr>';
    } else {
      let html = '';
      sscs.forEach(s => {
        const reschPct = s.total_classes > 0 ? `${((s.rescheduled_classes / s.total_classes) * 100).toFixed(1)}%` : 'N/A';
        const totalWrapup = s.conducted_classes + s.pending_wrapups;
        const verifPct = totalWrapup > 0 ? `${((s.conducted_classes / totalWrapup) * 100).toFixed(1)}%` : 'N/A';
        const renPct = s.package_ending > 0 ? `${((s.renewed_count / s.package_ending) * 100).toFixed(1)}%` : 'N/A';

        html += `
          <tr>
            <td><strong>${escapeHTML(s.ssc_name)}</strong></td>
            <td>${s.active_students}</td>
            <td>${s.conducted_classes}</td>
            <td><span class="badge ${parseFloat(reschPct) > 20 ? 'badge-warning' : 'badge-info'}">${reschPct}</span></td>
            <td><span class="badge ${parseFloat(verifPct) >= 90 ? 'badge-success' : 'badge-warning'}">${verifPct}</span></td>
            <td><span class="badge ${parseFloat(renPct) >= 70 ? 'badge-success' : 'badge-info'}">${renPct}</span></td>
          </tr>
        `;
      });
      sscTbody.innerHTML = html;
    }
  }

  // 9. Historical 6-Month Trends Table
  const trendsTbody = document.getElementById('head-trends-tbody');
  if (trendsTbody) {
    const renTrends = data.renewal_trend || [];
    const reschTrends = data.rescheduling_trend || [];
    if (renTrends.length === 0) {
      trendsTbody.innerHTML = '<tr><td colspan="8" class="text-center">No historical data recorded yet.</td></tr>';
    } else {
      let html = '';
      renTrends.forEach((t, i) => {
        const resch = reschTrends[i] || {};
        html += `
          <tr>
            <td><strong>${t.month}</strong></td>
            <td>${t.eligible}</td>
            <td style="color:#16a34a; font-weight:600;">${t.renewed}</td>
            <td style="color:#dc2626;">${t.churned}</td>
            <td><strong style="color:#15803d;">${t.rate}</strong></td>
            <td>${resch.total_classes || 0}</td>
            <td>${resch.rescheduled || 0}</td>
            <td>${resch.rate || 'N/A'}</td>
          </tr>
        `;
      });
      trendsTbody.innerHTML = html;
    }
  }

  // 10. SSC Workloads List
  const workloadContainer = document.getElementById('head-workload-container');
  if (workloadContainer) {
    if (!data.ssc_workloads || data.ssc_workloads.length === 0) {
      workloadContainer.innerHTML = '<div class="empty-state">No SSC accounts found.</div>';
    } else {
      let html = '';
      data.ssc_workloads.forEach(w => {
        const isHigh = w.active_students >= 20;
        const workloadPill = isHigh ? '<span class="badge badge-danger">High Workload</span>' : '<span class="badge badge-success">Optimal</span>';
        const statusPill = w.status === 'Active' ? '<span class="badge badge-info">Active</span>' : '<span class="badge badge-warning">Inactive</span>';

        html += `
          <div class="workload-card">
            <div class="workload-info">
              <h4>${escapeHTML(w.name)} ${statusPill}</h4>
              <p>${escapeHTML(w.email)} | Today's Classes: <strong>${w.today_classes}</strong> | Pending Actions: <strong>${w.pending_actions}</strong></p>
            </div>
            <div class="workload-stats">
              <div class="workload-count">${w.active_students} <small style="font-size:11px; font-weight:normal;">Students</small></div>
              ${workloadPill}
            </div>
          </div>
        `;
      });
      workloadContainer.innerHTML = html;
    }
  }

  // 11. Unassigned Students List
  const unassignedContainer = document.getElementById('head-unassigned-container');
  if (unassignedContainer) {
    if (!data.unassigned_list || data.unassigned_list.length === 0) {
      unassignedContainer.innerHTML = '<div class="empty-state">All active students have an assigned SSC!</div>';
    } else {
      let html = '';
      data.unassigned_list.forEach(s => {
        html += `
          <div class="action-card" style="border-left-color: var(--warning);">
            <div class="action-header">
              <span class="action-type">${s.grade} • ${escapeHTML(s.program)}</span>
            </div>
            <div class="action-title">${escapeHTML(s.name)}</div>
            <div class="action-footer">
              <button class="btn btn-sm btn-primary" onclick="openReassignStudentModal(${s.id}, '${escapeHTML(s.name)}', 'Unassigned')">Assign SSC</button>
            </div>
          </div>
        `;
      });
      unassignedContainer.innerHTML = html;
    }
  }
}

// Helper: Render Upcoming Packages Table based on Filter
function renderHeadUpcomingPackages(packagesList) {
  const tbody = document.getElementById('head-upcoming-packages-tbody');
  if (!tbody) return;

  const today = new Date().toISOString().split('T')[0];

  let filtered = packagesList;
  if (currentHeadUpcomingPkgFilter === '7' || currentHeadUpcomingPkgFilter === '15' || currentHeadUpcomingPkgFilter === '30') {
    const days = parseInt(currentHeadUpcomingPkgFilter);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);
    const limitStr = limitDate.toISOString().split('T')[0];

    filtered = packagesList.filter(p => p.end_date && p.end_date <= limitStr);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:16px; color:#64748b;">No ending packages matching the selected filter.</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach(p => {
    let statusBadge = '<span class="badge badge-warning">Pending</span>';
    if (p.renewal_status === 'Renewed') {
      statusBadge = '<span class="badge badge-success">Renewed</span>';
    } else if (p.renewal_status === 'Churned') {
      statusBadge = `<span class="badge badge-danger">Churned (${escapeHTML(p.churn_reason || 'Other')})</span>`;
    }

    const isPastOrToday = p.end_date <= today;
    const dateStyle = isPastOrToday ? 'color: #dc2626; font-weight: 700;' : 'color: #1e293b; font-weight: 600;';

    html += `
      <tr>
        <td><strong>${escapeHTML(p.name)}</strong><br><small style="color:#64748b;">Reg: ${escapeHTML(p.register_number || '-')}</small></td>
        <td>${escapeHTML(p.parent_name || '-')}<br><small style="color:#64748b;">${escapeHTML(p.parent_phone || '-')}</small></td>
        <td>${escapeHTML(formatSubjects(p.subjects || p.program))}</td>
        <td style="${dateStyle}">${formatDate(p.end_date)}</td>
        <td>${escapeHTML(p.ssc_name || 'Unassigned')}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-primary" onclick="openUpdateRenewalStatusModal(${p.id}, '${escapeHTML(p.name)}', '${escapeHTML(p.renewal_status || 'Pending')}', '${escapeHTML(p.churn_reason || '')}', '${escapeHTML(p.churn_notes || '')}')" style="padding:3px 8px; font-size:12px;">
            Update Status
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Modal Handlers for Renewal Status Update
function openUpdateRenewalStatusModal(studentId, studentName, currentStatus, churnReason, churnNotes) {
  document.getElementById('renewal-student-id').value = studentId;
  document.getElementById('renewal-student-name').innerText = studentName;
  document.getElementById('renewal-status-select').value = currentStatus === 'Renewed' || currentStatus === 'Churned' ? currentStatus : 'Pending';
  document.getElementById('renewal-churn-reason').value = churnReason || 'Timing Conflict';
  document.getElementById('renewal-churn-notes').value = churnNotes || '';

  toggleChurnReasonFields();
  openModal('modal-update-renewal-status');
}

function toggleChurnReasonFields() {
  const statusVal = document.getElementById('renewal-status-select').value;
  const box = document.getElementById('churn-fields-box');
  if (box) {
    box.style.display = statusVal === 'Churned' ? 'block' : 'none';
  }
}

async function submitRenewalStatusUpdate(e) {
  e.preventDefault();
  const studentId = document.getElementById('renewal-student-id').value;
  const statusVal = document.getElementById('renewal-status-select').value;
  const churnReason = document.getElementById('renewal-churn-reason').value;
  const churnNotes = document.getElementById('renewal-churn-notes').value;

  const res = await fetchAPI(`/api/students/${studentId}/renewal-status`, {
    method: 'POST',
    body: JSON.stringify({
      renewal_status: statusVal,
      churn_reason: churnReason,
      churn_notes: churnNotes
    })
  });

  if (res && res.success) {
    showNotification('Student renewal status updated successfully!');
    closeModal('modal-update-renewal-status');
    loadHeadDashboard();
  } else {
    showNotification(res?.error || 'Failed to update renewal status.', 'error');
  }
}

// 2. SSC MANAGEMENT PAGE
async function loadSSCManagement() {
  const res = await fetchAPI('/api/users/sscs');
  if (!res || !res.sscs) return;

  const tbody = document.getElementById('ssc-table-body');
  if (res.sscs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px;">No SSC accounts created.</td></tr>';
    return;
  }

  let html = '';
  res.sscs.forEach(s => {
    const isInactive = s.status === 'Inactive';
    const statusBadge = isInactive ? '<span class="badge badge-danger">Inactive</span>' : '<span class="badge badge-success">Active</span>';
    const toggleAction = isInactive ? `<button class="btn btn-sm btn-success" onclick="toggleSSCStatus(${s.id}, 'Active')">Activate</button>` :
                                     `<button class="btn btn-sm btn-danger" onclick="toggleSSCStatus(${s.id}, 'Inactive')">Deactivate</button>`;

    html += `
      <tr>
        <td><strong>${escapeHTML(s.name)}</strong></td>
        <td>${escapeHTML(s.email)}</td>
        <td>${escapeHTML(s.phone)}</td>
        <td><strong>${s.active_students}</strong> Active Students</td>
        <td>${s.today_classes}</td>
        <td>${s.pending_actions}</td>
        <td>${statusBadge}</td>
        <td>${toggleAction}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function toggleSSCStatus(sscId, newStatus) {
  if (newStatus === 'Inactive' && !confirm('Are you sure you want to deactivate this SSC? They will not be able to log in, but their assigned students will remain safe.')) return;
  const res = await fetchAPI(`/api/users/sscs/${sscId}`, 'PUT', { status: newStatus });
  if (res && res.success) {
    loadSSCManagement();
    loadSSCListForDropdowns();
  }
}

// 3. STUDENT ALLOCATION & UNASSIGNED PAGES
async function loadStudentAllocation() {
  const query = document.getElementById('allocation-search-input')?.value.trim() || '';
  const sscFilter = document.getElementById('allocation-ssc-filter')?.value || '';

  const res = await fetchAPI(`/api/students?q=${encodeURIComponent(query)}&ssc_id=${encodeURIComponent(sscFilter)}`);
  if (!res || !res.students) return;

  const tbody = document.getElementById('allocation-table-body');
  if (res.students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px;">No students found matching allocation filter.</td></tr>';
    return;
  }

  let html = '';
  res.students.forEach(s => {
    const sscBadge = s.ssc_name ? `<span class="badge badge-info">${escapeHTML(s.ssc_name)}</span>` : '<span class="badge badge-warning">Unassigned</span>';
    const actionLabel = s.ssc_name ? 'Change SSC' : 'Assign SSC';

    html += `
      <tr>
        <td><strong>${escapeHTML(s.name)}</strong><br><small style="color:var(--text-muted)">${escapeHTML(s.school)}</small></td>
        <td>${escapeHTML(s.grade)}</td>
        <td>${escapeHTML(s.program)}</td>
        <td>${sscBadge}</td>
        <td><span class="badge badge-success">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openReassignStudentModal(${s.id}, '${escapeHTML(s.name)}', '${escapeHTML(s.ssc_name || 'Unassigned')}')">${actionLabel}</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

document.getElementById('allocation-search-input')?.addEventListener('input', () => loadStudentAllocation());
document.getElementById('allocation-ssc-filter')?.addEventListener('change', () => loadStudentAllocation());

async function loadUnassignedStudents() {
  const res = await fetchAPI('/api/students?ssc_id=unassigned');
  if (!res || !res.students) return;

  const tbody = document.getElementById('unassigned-table-body');
  if (res.students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--success-text); font-weight:700;">✨ All students are currently assigned to an SSC!</td></tr>';
    return;
  }

  let html = '';
  res.students.forEach(s => {
    html += `
      <tr>
        <td><strong>${escapeHTML(s.name)}</strong></td>
        <td>${escapeHTML(s.grade)}</td>
        <td>${escapeHTML(s.program)}</td>
        <td>${escapeHTML(s.parent_name)}</td>
        <td>${escapeHTML(s.parent_phone)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openReassignStudentModal(${s.id}, '${escapeHTML(s.name)}', 'Unassigned')">Assign SSC</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// 4. SSC DASHBOARD
async function loadSSCDashboard() {
  const data = await fetchAPI('/api/dashboard');
  if (!data || data.role !== 'SSC') return;

  // Fetch pending wrapups for SSC
  const wrapupsRes = await fetchAPI('/api/wrapups/pending');
  const pendingWrapups = wrapupsRes?.pending_wrapups || [];

  document.getElementById('stat-active-students').innerText = data.summary.active_students;
  document.getElementById('stat-today-classes').innerText = data.summary.today_classes;
  document.getElementById('stat-pending-actions').innerText = data.summary.pending_actions + pendingWrapups.length;
  document.getElementById('stat-upcoming-assessments').innerText = data.summary.upcoming_assessments;
  document.getElementById('nav-reschedule-count').innerText = data.summary.rescheduling_requests;
  document.getElementById('nav-followup-count').innerText = data.summary.pending_actions;

  const scheduleContainer = document.getElementById('today-schedule-list');
  if (!data.today_schedule || data.today_schedule.length === 0) {
    scheduleContainer.innerHTML = `
      <div class="report-empty-state" style="padding: 32px 16px;">
        <div class="report-empty-icon">📅</div>
        <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px;">No classes scheduled for today</div>
        <div style="font-size: 13px; color: #64748b;">Your schedule is clear for today.</div>
      </div>
    `;
  } else {
    let html = '';
    data.today_schedule.forEach(c => {
      let wrapupBadge = '';
      if (c.wrapup_status === 'VERIFIED') {
        wrapupBadge = `<span class="badge badge-success">Verified (${c.actual_minutes || c.duration}m)</span>`;
      } else if (c.wrapup_status === 'SUBMITTED') {
        wrapupBadge = `<span class="badge" style="background:#fef08a; color:#854d0e; font-weight:700;">Awaiting Verification</span>`;
      } else if (c.wrapup_status === 'CORRECTION_REQUIRED') {
        wrapupBadge = `<span class="badge badge-danger">Correction Required</span>`;
      } else {
        wrapupBadge = `<span class="badge badge-secondary">Wrap-up Pending</span>`;
      }

      let reviewBtn = '';
      if (c.wrapup_status === 'SUBMITTED' || c.wrapup_status === 'CORRECTION_REQUIRED') {
        reviewBtn = `<button class="btn btn-sm btn-primary" onclick="openSSCReviewModal(${c.id})" style="background:#16a34a; border:none; font-weight:700;">🔍 Review Report</button>`;
      }

      html += `
        <div class="schedule-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:12px; border-bottom:1px solid #e2e8f0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="schedule-time" style="font-weight:800; font-size:14px; color:#1e293b; min-width:70px;">${c.start_time}</div>
            <div class="schedule-main">
              <div class="schedule-title" style="font-weight:700; font-size:15px; color:#0f172a;">${escapeHTML(c.student_name)} <span style="font-size:12px; color:#64748b;">(${c.grade})</span></div>
              <div class="schedule-meta" style="font-size:12px; color:#475569;">${c.subject} • Faculty: <strong>${escapeHTML(c.faculty_name)}</strong></div>
            </div>
          </div>
          <div class="schedule-actions" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${wrapupBadge}
            ${reviewBtn}
            ${c.wrapup_token ? `<button class="btn btn-sm btn-outline" onclick="copyWrapupLink('${c.wrapup_token}')">📋 Wrap-up Link</button>` : ''}
            ${c.wrapup_token ? `<button class="btn btn-sm btn-whatsapp" onclick="openWhatsAppFaculty('${escapeHTML(c.faculty_name)}', '${c.faculty_phone || ''}', '${escapeHTML(c.student_name)}', '${c.subject}', '${c.wrapup_token}')">📲 WhatsApp Faculty</button>` : ''}
          </div>
        </div>
      `;
    });
    scheduleContainer.innerHTML = html;
  }

  const actionsContainer = document.getElementById('dashboard-pending-actions');
  if (!data.pending_actions || data.pending_actions.length === 0) {
    actionsContainer.innerHTML = `
      <div class="report-empty-state" style="padding: 32px 16px;">
        <div class="report-empty-icon">📌</div>
        <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px;">No priority follow-ups</div>
        <div style="font-size: 13px; color: #64748b;">All current actions are up to date.</div>
      </div>
    `;
  } else {
    let html = '';
    data.pending_actions.forEach(a => {
      let clickHandler = '';
      if (a.target_module === 'rescheduling') clickHandler = `switchView('rescheduling')`;
      else if (a.target_module === 'followups') clickHandler = `switchView('followups')`;
      else if (a.target_module === 'assessments') clickHandler = `switchView('assessments')`;

      html += `
        <div class="action-card">
          <div class="action-header"><span class="action-type">${escapeHTML(a.type)}</span></div>
          <div class="action-title">${escapeHTML(a.title)}</div>
          <div class="action-detail">${escapeHTML(a.detail)}</div>
          <div class="action-footer">
            <button class="btn btn-sm btn-primary" onclick="${clickHandler}">${escapeHTML(a.action_label)}</button>
          </div>
        </div>
      `;
    });
    actionsContainer.innerHTML = html;
  }
}

// 5. STUDENTS DIRECTORY
async function loadStudents() {
  const query = document.getElementById('students-search-input')?.value.trim() || '';
  const status = document.getElementById('students-status-filter')?.value || '';
  
  const tbody = document.getElementById('students-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="padding: 24px; text-align: center;">
          <div class="skeleton-loader">
            <div style="height: 18px; width: 100%; background: #e2e8f0; border-radius: 4px; margin-bottom: 8px;"></div>
            <div style="height: 18px; width: 100%; background: #f1f5f9; border-radius: 4px;"></div>
          </div>
        </td>
      </tr>
    `;
  }

  const res = await fetchAPI(`/api/students?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);
  if (!res || !res.students) return;

  if (!tbody) return;

  if (res.students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="padding: 40px 16px; text-align: center;">
          <div class="report-empty-state" style="border: none; background: transparent; padding: 0;">
            <div class="report-empty-icon" style="font-size: 36px; margin-bottom: 12px;">👨‍🎓</div>
            <div style="font-weight: 700; font-size: 16px; color: #1e293b; margin-bottom: 4px;">No Students Assigned</div>
            <div style="font-size: 13.5px; color: #64748b;">Students assigned to you will appear here.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  res.students.forEach(s => {
    const statusBadge = s.status === 'Active' ? '<span class="badge badge-success">Active</span>' :
                       (s.status === 'Course Completed' ? '<span class="badge badge-primary">Completed</span>' :
                       (s.status === 'Archived' ? '<span class="badge badge-danger">Archived</span>' :
                       (s.status === 'On Hold' ? '<span class="badge badge-warning">On Hold</span>' : '<span class="badge badge-secondary">Inactive</span>')));

    const sscBadge = s.ssc_name ? `<span class="badge badge-info">${escapeHTML(s.ssc_name)}</span>` : '<span class="badge badge-warning">Unassigned</span>';
    const regNo = s.register_number || s.register_no || 'MM-2026-0000';
    const progName = s.package_name || s.program || 'Standard Academic';
    const subjectsStr = formatSubjects(s.subjects);
    const facultyName = s.primary_faculty_name || s.faculty_name || 'Assigned Faculty';
    const completed = s.completed_classes !== undefined ? s.completed_classes : (s.sessions_completed || 0);
    const total = s.total_classes !== undefined ? s.total_classes : (s.session_package || 24);
    const remaining = s.remaining_classes !== undefined ? s.remaining_classes : Math.max(0, total - completed);
    const studentIdParam = typeof s.id === 'string' ? `'${s.id}'` : s.id;
    const progressPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    html += `
      <tr class="clickable-row" onclick="openStudentDrawer(${studentIdParam})">
        <td>
          <div style="font-size: 11px; font-weight: 800; color: var(--primary); font-family: monospace;">${escapeHTML(regNo)}</div>
          <strong>${escapeHTML(s.name)}</strong><br><small style="color:var(--text-muted)">${escapeHTML(s.school || 'School N/A')}</small>
        </td>
        <td>${escapeHTML(s.grade || '-')}</td>
        <td>${escapeHTML(progName)}</td>
        <td>${escapeHTML(subjectsStr)}</td>
        <td>${escapeHTML(facultyName)}</td>
        <td>${sscBadge}</td>
        <td>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:700; color:#1e293b; margin-bottom:4px;">
            <span>${completed} / ${total} Sessions</span>
            <span style="color:var(--primary); font-size:11px;">${progressPct}%</span>
          </div>
          <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width:${progressPct}%; height:100%; background:var(--primary, #4f46e5); border-radius:3px;"></div>
          </div>
        </td>
        <td>${s.next_class ? escapeHTML(s.next_class) : '<span style="color:var(--text-light)">None scheduled</span>'}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openStudentDrawer(${studentIdParam})">View Profile</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

document.getElementById('students-search-input')?.addEventListener('input', () => loadStudents());
document.getElementById('students-status-filter')?.addEventListener('change', () => loadStudents());

// 6. STUDENT PROFILE DRAWER


// 7. TIMETABLE MODULE

// 8. CLASSES MODULE
async function loadClasses() {
  const activeTab = document.querySelector('#class-preset-tabs .filter-pill.active, #class-preset-tabs .tab-btn.active');
  const preset = activeTab ? activeTab.getAttribute('data-preset') : 'today';
  const status = document.getElementById('classes-status-filter')?.value || '';
  const facultyId = document.getElementById('classes-faculty-filter')?.value || '';

  const res = await fetchAPI(`/api/classes?preset=${preset}&status=${encodeURIComponent(status)}&faculty_id=${facultyId}`);
  if (!res || !res.classes) return;

  const container = document.getElementById('classes-cards-container');
  if (res.classes.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; padding: 32px; text-align: center; color: var(--text-secondary);">No classes found for selected filters.</div>';
    return;
  }

  let html = '';
  res.classes.forEach(c => {
    let wrapupBadge = '';
    if (c.wrapup_status === 'VERIFIED') {
      wrapupBadge = `<span class="class-card-status-badge verified">VERIFIED (${c.actual_minutes || c.duration}m)</span>`;
    } else if (c.wrapup_status === 'SUBMITTED') {
      wrapupBadge = `<span class="class-card-status-badge submitted">AWAITING VERIFICATION</span>`;
    } else if (c.wrapup_status === 'CORRECTION_REQUIRED') {
      wrapupBadge = `<span class="class-card-status-badge correction">CORRECTION REQUIRED</span>`;
    } else {
      wrapupBadge = `<span class="class-card-status-badge">WRAP-UP PENDING</span>`;
    }

    let reviewBtn = '';
    if (c.wrapup_status === 'SUBMITTED' || c.wrapup_status === 'CORRECTION_REQUIRED') {
      reviewBtn = `<button class="btn btn-sm btn-primary" onclick="openSSCReviewModal(${c.id})">🔍 Review Report</button>`;
    }

    html += `
      <div class="class-card">
        <div>
          <div class="class-card-header">
            <span class="class-card-time">${c.date || ''} • ${c.start_time || ''}</span>
            ${wrapupBadge}
          </div>
          <div class="class-card-student">${escapeHTML(c.student_name)} ${c.grade ? `(${escapeHTML(c.grade)})` : ''}</div>
          <div class="class-card-meta">Subject: <strong>${escapeHTML(c.subject)}</strong> | Faculty: <strong>${escapeHTML(c.faculty_name)}</strong></div>
        </div>
        <div class="class-card-actions">
          ${reviewBtn}
          ${c.wrapup_token ? `<button class="btn btn-sm btn-outline" onclick="copyWrapupLink('${c.wrapup_token}')">📋 Wrap-up Link</button>` : ''}
          ${c.wrapup_token ? `<button class="btn btn-sm btn-whatsapp" onclick="openWhatsAppFaculty('${escapeHTML(c.faculty_name)}', '${c.faculty_phone || ''}', '${escapeHTML(c.student_name)}', '${c.subject}', '${c.wrapup_token}')">📲 WhatsApp</button>` : ''}
          <button class="btn btn-sm btn-outline" onclick="openRequestRescheduleModal(${c.id}, ${c.student_id}, '${c.date} ${c.start_time}')">Reschedule</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

document.querySelectorAll('#class-preset-tabs .filter-pill, #class-preset-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#class-preset-tabs .filter-pill, #class-preset-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadClasses();
  });
});
document.getElementById('classes-status-filter')?.addEventListener('change', () => loadClasses());
document.getElementById('classes-faculty-filter')?.addEventListener('change', () => loadClasses());

// 9. RESCHEDULING MODULE
async function loadRescheduling() {
  const res = await fetchAPI('/api/rescheduling');
  if (!res || !res.rescheduling_requests) return;

  const container = document.getElementById('rescheduling-requests-container');
  if (res.rescheduling_requests.length === 0) {
    container.innerHTML = '<div class="empty-state">No rescheduling requests pending!</div>';
    return;
  }

  let html = '';
  res.rescheduling_requests.forEach(r => {
    const isPending = r.status === 'Pending';
    const statusBadge = isPending ? '<span class="badge badge-warning">Pending</span>' :
                       (r.status === 'Approved' ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-danger">Rejected</span>');

    html += `
      <div class="reschedule-card">
        <div class="reschedule-info">
          <div class="reschedule-student">${escapeHTML(r.student_name)} — ${r.subject}</div>
          <div class="reschedule-slots">
            <div class="slot-box slot-old"><strong>Original:</strong> ${r.original_date} • ${r.original_time}</div>
            <div class="slot-arrow">➔</div>
            <div class="slot-box slot-new"><strong>Suggested:</strong> ${r.suggested_date} • ${r.suggested_time}</div>
          </div>
          <div class="reschedule-reason">Reason: "${escapeHTML(r.reason)}"</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap: 8px;">
          ${statusBadge}
          ${isPending ? `
            <div style="display:flex; gap: 8px; margin-top: 6px;">
              <button class="btn btn-sm btn-success" onclick="approveReschedule(${r.id})">Approve</button>
              <button class="btn btn-sm btn-outline" onclick="openRequestRescheduleModal(${r.class_id}, ${r.student_id}, '${r.original_date} ${r.original_time}')">Change Time</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function approveReschedule(reqId) {
  if (!confirm('Are you sure you want to approve this rescheduling request?')) return;
  const res = await fetchAPI(`/api/rescheduling/${reqId}/approve`, 'POST');
  if (res && res.success) {
    alert('Rescheduling approved!');
    loadRescheduling();
  }
}

// 10. ASSESSMENTS MODULE
async function loadAssessments() {
  const res = await fetchAPI('/api/assessments');
  if (!res || !res.assessments) return;

  const tbody = document.getElementById('assessments-table-body');
  if (res.assessments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 24px;">No assessments recorded.</td></tr>';
    return;
  }

  let html = '';
  res.assessments.forEach(a => {
    const statusBadge = a.status === 'Completed' ? '<span class="badge badge-success">Completed</span>' :
                       (a.status === 'Result Pending' ? '<span class="badge badge-warning">Result Pending</span>' : '<span class="badge badge-info">Scheduled</span>');

    const scoreDisplay = a.score !== null ? `<strong>${a.score} / ${a.max_score}</strong> (${a.percentage}%)` : '—';

    html += `
      <tr>
        <td><strong>${escapeHTML(a.student_name)}</strong></td>
        <td>${escapeHTML(a.grade)}</td>
        <td>${escapeHTML(a.subject)}</td>
        <td>${escapeHTML(a.type)}</td>
        <td>${a.date} at ${a.time}</td>
        <td>${escapeHTML(a.faculty_name || 'Unassigned')}</td>
        <td>${statusBadge}</td>
        <td>${scoreDisplay}</td>
        <td>
          ${a.status !== 'Completed' ? `<button class="btn btn-sm btn-primary" onclick="openAssessmentResultModal(${a.id})">Enter Result</button>` : '<span style="color:var(--text-light); font-size:12px;">Recorded</span>'}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// 11. FOLLOW-UPS MODULE
async function loadFollowups() {
  const res = await fetchAPI('/api/followups');
  if (!res || !res.followups) return;

  const tbody = document.getElementById('followups-table-body');
  if (res.followups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px;">No follow-ups found.</td></tr>';
    return;
  }

  let html = '';
  res.followups.forEach(f => {
    const isPending = f.status === 'Pending';
    const statusBadge = isPending ? '<span class="badge badge-warning">Pending</span>' : '<span class="badge badge-success">Completed</span>';
    const prioBadge = f.priority === 'High' ? '<span class="badge badge-danger">High</span>' :
                     (f.priority === 'Medium' ? '<span class="badge badge-warning">Medium</span>' : '<span class="badge badge-info">Low</span>');

    html += `
      <tr>
        <td><strong>${escapeHTML(f.student_name)}</strong></td>
        <td><span class="badge badge-purple">${escapeHTML(f.type)}</span></td>
        <td>${f.due_date}</td>
        <td>${prioBadge}</td>
        <td>${escapeHTML(f.notes)}</td>
        <td>${statusBadge}</td>
        <td>
          ${isPending ? `<button class="btn btn-sm btn-success" onclick="completeFollowup(${f.id})">Mark Done</button>` : '<span style="color:var(--text-light); font-size:12px;">Done</span>'}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function completeFollowup(fuId) {
  const res = await fetchAPI(`/api/followups/${fuId}`, 'PUT', { status: 'Completed' });
  if (res && res.success) {
    loadFollowups();
  }
}

// 12. REPORTS MODULE
async function loadReports() {
  const res = await fetchAPI('/api/reports');
  if (!res) return;

  document.getElementById('report-students-stats').innerHTML = renderReportList(res.students, 'Student');
  document.getElementById('report-classes-stats').innerHTML = renderReportList(res.classes, 'Class Operations');
  document.getElementById('report-assessments-stats').innerHTML = renderReportList(res.assessments, 'Assessment');
  document.getElementById('report-followups-stats').innerHTML = renderReportList(res.followups, 'SSC Follow-up');
}

function renderReportList(obj, categoryTitle) {
  if (!obj || Object.keys(obj).length === 0) {
    return `
      <div class="designed-empty-state" style="padding: 24px 16px; border: none; background: transparent;">
        <div style="font-size: 28px; margin-bottom: 6px; opacity: 0.7;">📊</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--mm-navy);">No ${escapeHTML(categoryTitle)} metrics recorded</div>
        <div style="font-size: 12px; color: var(--mm-text-secondary); margin-top: 2px;">Operational metrics will populate here as live activities occur.</div>
      </div>
    `;
  }
  let html = '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">';
  for (const [k, v] of Object.entries(obj)) {
    const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background-color: #F8FAFC; border-radius: var(--radius-sm); border: 1px solid #F1F5F9;">
        <span style="font-size: 13px; font-weight: 600; color: var(--mm-text);">${escapeHTML(formattedKey)}</span>
        <span style="font-size: 15px; font-weight: 800; color: var(--mm-teal-dark);">${v}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

// MODAL HANDLERS
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

function openCreateSSCModal() {
  document.getElementById('modal-create-ssc')?.classList.add('active');
}

async function handleCreateSSCSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('cssc-name').value,
    email: document.getElementById('cssc-email').value,
    phone: document.getElementById('cssc-phone').value,
    password: document.getElementById('cssc-password').value,
    status: document.getElementById('cssc-status').value
  };

  const res = await fetchAPI('/api/users/sscs', 'POST', data);
  if (res && res.success) {
    closeModal('modal-create-ssc');
    alert('SSC Account created successfully!');
    loadSSCManagement();
    loadSSCListForDropdowns();
  } else {
    alert(res?.error || 'Failed to create SSC account.');
  }
}

// DYNAMIC SUBJECT & FACULTY ROW PAIRINGS
function addRegisterSubjectRow(subject = 'Mathematics', facultyId = '') {
  const container = document.getElementById('rs-subjects-container');
  if (!container) return;
  const rowId = 'rs-sub-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  let facultyOptions = '<option value="">Select Faculty...</option>';
  cachedFaculty.forEach(f => {
    const sel = (f.id == facultyId) ? 'selected' : '';
    facultyOptions += `<option value="${f.id}" data-phone="${escapeHTML(f.phone || '')}" ${sel}>${escapeHTML(f.name)} (${escapeHTML(f.subject)})</option>`;
  });

  const rowHTML = `
    <div id="${rowId}" class="rs-subject-row" style="display: flex; gap: 8px; align-items: center; background: #F8FAFC; padding: 8px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
      <select class="sub-name" style="flex: 1;" required>
        <option value="Mathematics" ${subject==='Mathematics'?'selected':''}>Mathematics</option>
        <option value="Science" ${subject==='Science'?'selected':''}>Science</option>
        <option value="English" ${subject==='English'?'selected':''}>English</option>
        <option value="Physics" ${subject==='Physics'?'selected':''}>Physics</option>
        <option value="Chemistry" ${subject==='Chemistry'?'selected':''}>Chemistry</option>
        <option value="Biology" ${subject==='Biology'?'selected':''}>Biology</option>
        <option value="Social Studies" ${subject==='Social Studies'?'selected':''}>Social Studies</option>
      </select>
      <select class="sub-faculty" style="flex: 1.2;" onchange="updateFacultyPhonePreview(this)" required>
        ${facultyOptions}
      </select>
      <span class="faculty-phone-preview" style="font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; min-width: 90px;"></span>
      <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('${rowId}').remove()" title="Remove Subject">✕</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', rowHTML);
}

function addPackageSubjectRow(subject = 'Mathematics', facultyId = '') {
  const container = document.getElementById('ap-subjects-container');
  if (!container) return;
  const rowId = 'ap-sub-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  let facultyOptions = '<option value="">Select Faculty...</option>';
  cachedFaculty.forEach(f => {
    const sel = (f.id == facultyId) ? 'selected' : '';
    facultyOptions += `<option value="${f.id}" data-phone="${escapeHTML(f.phone || '')}" ${sel}>${escapeHTML(f.name)} (${escapeHTML(f.subject)})</option>`;
  });

  const rowHTML = `
    <div id="${rowId}" class="ap-subject-row" style="display: flex; gap: 8px; align-items: center; background: #F8FAFC; padding: 8px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
      <select class="sub-name" style="flex: 1;" required>
        <option value="Mathematics" ${subject==='Mathematics'?'selected':''}>Mathematics</option>
        <option value="Science" ${subject==='Science'?'selected':''}>Science</option>
        <option value="English" ${subject==='English'?'selected':''}>English</option>
        <option value="Physics" ${subject==='Physics'?'selected':''}>Physics</option>
        <option value="Chemistry" ${subject==='Chemistry'?'selected':''}>Chemistry</option>
        <option value="Biology" ${subject==='Biology'?'selected':''}>Biology</option>
        <option value="Social Studies" ${subject==='Social Studies'?'selected':''}>Social Studies</option>
      </select>
      <select class="sub-faculty" style="flex: 1.2;" onchange="updateFacultyPhonePreview(this)" required>
        ${facultyOptions}
      </select>
      <span class="faculty-phone-preview" style="font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; min-width: 90px;"></span>
      <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('${rowId}').remove()" title="Remove Subject">✕</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', rowHTML);
}

function updateFacultyPhonePreview(selectElem) {
  const selectedOpt = selectElem.options[selectElem.selectedIndex];
  const phone = selectedOpt ? selectedOpt.getAttribute('data-phone') : '';
  const previewSpan = selectElem.parentElement.querySelector('.faculty-phone-preview');
  if (previewSpan) {
    previewSpan.innerText = phone ? `📞 ${phone}` : '';
  }
}

function openRegisterStudentModal() {
  document.getElementById('form-register-student')?.reset();
  const container = document.getElementById('rs-subjects-container');
  if (container) {
    container.innerHTML = '';
    addRegisterSubjectRow('Mathematics');
    addRegisterSubjectRow('Science');
  }
  document.getElementById('modal-register-student')?.classList.add('active');
}

async function handleRegisterStudentSubmit(e) {
  e.preventDefault();

  const subjectRows = document.querySelectorAll('#rs-subjects-container .rs-subject-row');
  const subjects = [];
  subjectRows.forEach(row => {
    const subName = row.querySelector('.sub-name')?.value;
    const facId = row.querySelector('.sub-faculty')?.value;
    if (subName && facId) {
      subjects.push({ subject: subName, faculty_id: facId });
    }
  });

  const data = {
    name: document.getElementById('rs-name').value,
    grade: document.getElementById('rs-grade').value,
    board: document.getElementById('rs-board').value,
    school: document.getElementById('rs-school').value,
    preferred_language: document.getElementById('rs-preferred-language').value,
    parent_name: document.getElementById('rs-parent-name').value,
    parent_phone: document.getElementById('rs-parent-phone').value,
    student_phone: document.getElementById('rs-student-phone').value,
    program: document.getElementById('rs-program').value,
    session_package: document.getElementById('rs-package').value,
    assigned_ssc_id: document.getElementById('rs-ssc-id').value || null,
    subjects: subjects,
    faculty_id: subjects.length > 0 ? subjects[0].faculty_id : null
  };

  const res = await fetchAPI('/api/students', 'POST', data);
  if (res && res.success) {
    closeModal('modal-register-student');
    alert(`Student registered successfully! Register Number: ${res.register_no}`);
    refreshCurrentView();
    loadStudentsListForDropdowns();
  } else {
    alert(res?.error || 'Failed to register student.');
  }
}

// PACKAGE & LIFECYCLE HANDLERS
function openAddPackageModal(studentId, studentName, currentProgram) {
  document.getElementById('ap-student-id').value = studentId;
  document.getElementById('ap-student-summary').innerHTML = `
    Student: <strong>${studentName}</strong><br>Current Program: <strong>${currentProgram}</strong>
  `;
  const container = document.getElementById('ap-subjects-container');
  if (container) {
    container.innerHTML = '';
    addPackageSubjectRow('Mathematics');
  }
  document.getElementById('modal-add-package')?.classList.add('active');
}

async function handleAddPackageSubmit(e) {
  e.preventDefault();
  const studentId = document.getElementById('ap-student-id').value;

  const subjectRows = document.querySelectorAll('#ap-subjects-container .ap-subject-row');
  const subjects = [];
  subjectRows.forEach(row => {
    const subName = row.querySelector('.sub-name')?.value;
    const facId = row.querySelector('.sub-faculty')?.value;
    if (subName && facId) {
      subjects.push({ subject: subName, faculty_id: facId });
    }
  });

  const data = {
    program: document.getElementById('ap-program').value,
    session_package: document.getElementById('ap-session-package').value,
    notes: document.getElementById('ap-notes').value,
    subjects: subjects
  };

  const res = await fetchAPI(`/api/students/${studentId}/add-package`, 'POST', data);
  if (res && res.success) {
    closeModal('modal-add-package');
    alert('New package added successfully!');
    openStudentDrawer(studentId);
    refreshCurrentView();
  } else {
    alert(res?.error || 'Failed to add package.');
  }
}

async function markCourseCompleted(studentId) {
  if (!confirm('Are you sure you want to mark this student course as Completed?')) return;

  const res = await fetchAPI(`/api/students/${studentId}/mark-completed`, 'POST');
  if (res && res.success) {
    alert('Course marked as Completed!');
    openStudentDrawer(studentId);
    refreshCurrentView();
  }
}

async function archiveStudent(studentId, registerNo) {
  if (!confirm(`Are you sure you want to Archive this student?\n\n- Permanent Register Number (${registerNo}) will remain permanently reserved.\n- SSC assignment will be cleared.\n- Historical classes, timetables, and activity logs remain fully preserved.`)) return;

  const res = await fetchAPI(`/api/students/${studentId}/archive`, 'POST');
  if (res && res.success) {
    alert('Student archived successfully.');
    openStudentDrawer(studentId);
    refreshCurrentView();
  }
}

async function restoreStudent(studentId) {
  const sscId = prompt('Enter SSC User ID to assign to restored student (or leave blank for unassigned):');
  const res = await fetchAPI(`/api/students/${studentId}/restore`, 'POST', { assigned_ssc_id: sscId ? parseInt(sscId) : null });
  if (res && res.success) {
    alert('Student restored to Active status.');
    openStudentDrawer(studentId);
    refreshCurrentView();
  }
}

// 6B. FACULTY MANAGEMENT & DIRECTORY
async function loadFacultyDirectory() {
  const query = document.getElementById('faculty-search-input')?.value.trim() || '';
  const subject = document.getElementById('faculty-subject-filter')?.value || '';
  const board = document.getElementById('faculty-board-filter')?.value || '';
  const grade = document.getElementById('faculty-grade-filter')?.value || '';
  const status = document.getElementById('faculty-status-filter')?.value || '';

  const tbody = document.getElementById('faculty-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 24px; text-align: center;">
          <div class="skeleton-loader">
            <div style="height: 18px; width: 100%; background: #e2e8f0; border-radius: 4px; margin-bottom: 8px;"></div>
            <div style="height: 18px; width: 100%; background: #f1f5f9; border-radius: 4px;"></div>
          </div>
        </td>
      </tr>
    `;
  }

  const res = await fetchAPI(`/api/faculty?q=${encodeURIComponent(query)}&subject=${encodeURIComponent(subject)}&syllabus=${encodeURIComponent(board)}&grade=${encodeURIComponent(grade)}&status=${encodeURIComponent(status)}`);
  if (!res || !res.faculty) return;

  if (!tbody) return;

  if (res.faculty.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 40px 16px; text-align: center;">
          <div class="report-empty-state" style="border: none; background: transparent; padding: 0;">
            <div class="report-empty-icon" style="font-size: 36px; margin-bottom: 12px;">👩‍🏫</div>
            <div style="font-weight: 700; font-size: 16px; color: #1e293b; margin-bottom: 4px;">No Faculty Found</div>
            <div style="font-size: 13.5px; color: #64748b;">No faculty records match the selected filters or search terms.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const canEdit = ['ACADEMIC_HEAD', 'SSC', 'SUPER_ADMIN'].includes(currentUser?.role);
  const headActions = document.getElementById('faculty-head-actions');
  if (headActions) headActions.style.display = canEdit ? 'block' : 'none';

  let html = '';
  res.faculty.forEach(f => {
    const statusBadge = f.status === 'Active' ? '<span class="badge badge-success">ACTIVE</span>' : '<span class="badge badge-secondary">INACTIVE</span>';
    const cleanPhone = (f.phone || '').replace(/[^0-9]/g, '');
    const subjectsStr = formatSubjects(f.subjects);

    html += `
      <tr class="clickable-row" onclick="openFacultyDrawer(${f.id})">
        <td>
          <div style="font-size: 11px; font-weight: 800; color: var(--primary); font-family: monospace;">${escapeHTML(f.faculty_code || 'FAC-2026-XXXX')}</div>
          <strong>${escapeHTML(f.name)}</strong>
        </td>
        <td>
          <div style="font-weight:600;">${escapeHTML(f.phone)}</div>
          <div style="display:flex; gap:4px; margin-top:4px;">
            <a href="tel:${escapeHTML(f.phone)}" class="btn btn-sm btn-outline" onclick="event.stopPropagation()" style="font-size:11px; padding:2px 6px;">📞 Call</a>
            <button class="btn btn-sm btn-whatsapp" onclick="event.stopPropagation(); openDirectWhatsApp('${cleanPhone}', 'Hello ${escapeHTML(f.name)}, regarding Mash Magic class schedule...')" style="font-size:11px; padding:2px 6px;">📱 WhatsApp</button>
          </div>
        </td>
        <td>${escapeHTML(subjectsStr)}</td>
        <td>${escapeHTML(f.syllabuses || 'CBSE, ICSE')}</td>
        <td><small style="color:var(--text-muted);">${escapeHTML(f.grades || 'Grade 6–10')}</small></td>
        <td><strong>${f.active_students || 0}</strong> active</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:4px;">
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openFacultyDrawer(${f.id})">View Profile</button>
            ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openEditFacultyModal(${f.id})">Edit</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

document.getElementById('faculty-search-input')?.addEventListener('input', () => loadFacultyDirectory());
document.getElementById('faculty-subject-filter')?.addEventListener('change', () => loadFacultyDirectory());
document.getElementById('faculty-board-filter')?.addEventListener('change', () => loadFacultyDirectory());
document.getElementById('faculty-grade-filter')?.addEventListener('change', () => loadFacultyDirectory());
document.getElementById('faculty-status-filter')?.addEventListener('change', () => loadFacultyDirectory());

async function openFacultyDrawer(facultyId) {
  const overlay = document.getElementById('faculty-drawer-overlay');
  const drawer = document.getElementById('faculty-drawer');
  const content = document.getElementById('faculty-drawer-content');

  overlay.classList.add('active');
  drawer.classList.add('active');

  content.innerHTML = '<div class="loading-spinner">Loading faculty profile...</div>';

  const res = await fetchAPI(`/api/faculty/${facultyId}`);
  if (!res || !res.faculty) {
    content.innerHTML = '<div class="error-msg-box">Failed to load faculty profile.</div>';
    return;
  }

  const f = res.faculty;
  const canEdit = ['ACADEMIC_HEAD', 'SSC', 'SUPER_ADMIN'].includes(currentUser?.role);
  const cleanPhone = (f.phone || '').replace(/[^0-9]/g, '');
  const subjectsStr = formatSubjects(f.subjects);

  document.getElementById('drawer-faculty-name').innerText = f.name;
  document.getElementById('drawer-faculty-code').innerText = f.faculty_code || 'FAC-2026-XXXX';
  document.getElementById('drawer-faculty-status').innerText = f.status;
  document.getElementById('drawer-faculty-status').className = f.status === 'Active' ? 'badge badge-success' : 'badge badge-secondary';

  let studentRows = '';
  if (f.assigned_students && f.assigned_students.length > 0) {
    f.assigned_students.forEach(st => {
      studentRows += `
        <tr class="clickable-row" onclick="openStudentDrawer(${st.id})">
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${escapeHTML(st.register_no || '')}</td>
          <td><strong>${escapeHTML(st.name)}</strong></td>
          <td>${escapeHTML(st.grade)}</td>
          <td>${escapeHTML(st.program)}</td>
        </tr>
      `;
    });
  } else {
    studentRows = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">No active students currently assigned.</td></tr>';
  }

  content.innerHTML = `
    <div class="profile-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin:0;">Faculty Information</h4>
        ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openEditFacultyModal(${f.id})">Edit Profile</button>` : ''}
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Faculty Code</span><span class="info-value" style="font-family:monospace; font-weight:800; color:var(--primary);">${escapeHTML(f.faculty_code || 'FAC-2026-XXXX')}</span></div>
        <div class="info-item"><span class="info-label">Contact Phone</span><span class="info-value">${escapeHTML(f.phone)}</span></div>
        <div class="info-item"><span class="info-label">Status</span><span class="info-value">${escapeHTML(f.status)}</span></div>
      </div>
      <div style="display:flex; gap: 8px; margin-top: 14px;">
        <a href="tel:${escapeHTML(f.phone)}" class="btn btn-sm btn-outline" style="text-decoration:none;">📞 Call ${escapeHTML(f.name)}</a>
        <button class="btn btn-sm btn-whatsapp" onclick="openDirectWhatsApp('${cleanPhone}', 'Hello ${escapeHTML(f.name)}, regarding Mash Magic class schedule...')">📱 WhatsApp</button>
      </div>
    </div>

    <div class="profile-section">
      <h4>Teaching Capabilities & Eligibility</h4>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="padding:10px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">SUBJECTS CAN TEACH</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px; color:var(--text-dark);">${escapeHTML(subjectsStr)}</div>
        </div>
        <div style="padding:10px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">SYLLABUS / BOARDS CAN TEACH</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px; color:var(--text-dark);">${escapeHTML(f.syllabuses || 'CBSE, ICSE')}</div>
        </div>
        <div style="padding:10px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">CLASSES / GRADES CAN TEACH</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px; color:var(--text-dark);">${escapeHTML(f.grades || 'Grade 6–10')}</div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h4>Faculty Usage Summary</h4>
      <div class="summary-cards" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 0;">
        <div class="card stat-card" style="padding: 12px;">
          <div class="stat-details">
            <span class="stat-label">ACTIVE STUDENTS</span>
            <h3 class="stat-value" style="font-size:20px;">${f.active_students || 0}</h3>
          </div>
        </div>
        <div class="card stat-card" style="padding: 12px;">
          <div class="stat-details">
            <span class="stat-label">UPCOMING CLASSES</span>
            <h3 class="stat-value" style="font-size:20px;">${f.upcoming_classes || 0}</h3>
          </div>
        </div>
        <div class="card stat-card" style="padding: 12px;">
          <div class="stat-details">
            <span class="stat-label">COMPLETED CLASSES</span>
            <h3 class="stat-value" style="font-size:20px;">${f.completed_classes || 0}</h3>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h4>Active Assigned Students</h4>
      <div style="overflow-x:auto;">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Reg No</th>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Program</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function closeFacultyDrawer() {
  document.getElementById('faculty-drawer-overlay')?.classList.remove('active');
  document.getElementById('faculty-drawer')?.classList.remove('active');
}

function openAddFacultyModal() {
  if (!['ACADEMIC_HEAD', 'SSC', 'SUPER_ADMIN'].includes(currentUser?.role)) return;

  document.getElementById('fac-modal-title').innerText = 'Register New Faculty';
  document.getElementById('fac-submit-btn').innerText = 'Register Faculty';
  document.getElementById('fac-id').value = '';
  document.getElementById('fac-name').value = '';
  document.getElementById('fac-phone').value = '';
  document.getElementById('fac-status').value = 'Active';

  document.querySelectorAll('input[name="fac_subject"]').forEach(cb => cb.checked = (cb.value === 'Mathematics' || cb.value === 'Science'));
  document.querySelectorAll('input[name="fac_syllabus"]').forEach(cb => cb.checked = (cb.value === 'CBSE' || cb.value === 'ICSE'));
  document.querySelectorAll('input[name="fac_grade"]').forEach(cb => cb.checked = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(cb.value));

  document.getElementById('modal-faculty-form')?.classList.add('active');
}

async function openEditFacultyModal(facultyId) {
  if (!['ACADEMIC_HEAD', 'SSC', 'SUPER_ADMIN'].includes(currentUser?.role)) return;

  const res = await fetchAPI(`/api/faculty/${facultyId}`);
  if (!res || !res.faculty) {
    alert('Failed to load faculty details.');
    return;
  }
  const f = res.faculty;

  document.getElementById('fac-modal-title').innerText = `Edit Faculty (${f.faculty_code || 'FAC-2026-XXXX'})`;
  document.getElementById('fac-submit-btn').innerText = 'Save Faculty Changes';
  document.getElementById('fac-id').value = f.id;
  document.getElementById('fac-name').value = f.name;
  document.getElementById('fac-phone').value = f.phone;
  document.getElementById('fac-status').value = f.status || 'Active';

  const subList = (f.subjects || '').split(',').map(s => s.trim());
  document.querySelectorAll('input[name="fac_subject"]').forEach(cb => {
    cb.checked = subList.includes(cb.value);
  });

  const sylList = (f.syllabuses || '').split(',').map(s => s.trim());
  document.querySelectorAll('input[name="fac_syllabus"]').forEach(cb => {
    cb.checked = sylList.includes(cb.value);
  });

  const grdList = (f.grades || '').split(',').map(s => s.trim());
  document.querySelectorAll('input[name="fac_grade"]').forEach(cb => {
    cb.checked = grdList.includes(cb.value);
  });

  document.getElementById('modal-faculty-form')?.classList.add('active');
}

async function handleFacultyFormSubmit(e) {
  e.preventDefault();
  if (!['ACADEMIC_HEAD', 'SSC', 'SUPER_ADMIN'].includes(currentUser?.role)) return;

  const facId = document.getElementById('fac-id').value;
  
  const selectedSubjects = Array.from(document.querySelectorAll('input[name="fac_subject"]:checked')).map(cb => cb.value);
  const selectedSyllabuses = Array.from(document.querySelectorAll('input[name="fac_syllabus"]:checked')).map(cb => cb.value);
  const selectedGrades = Array.from(document.querySelectorAll('input[name="fac_grade"]:checked')).map(cb => cb.value);

  if (selectedSubjects.length === 0) {
    alert('Please select at least one Subject the faculty can teach.');
    return;
  }

  const data = {
    name: document.getElementById('fac-name').value,
    phone: document.getElementById('fac-phone').value,
    status: document.getElementById('fac-status').value,
    subjects: selectedSubjects,
    syllabuses: selectedSyllabuses,
    grades: selectedGrades
  };

  let res;
  if (facId) {
    res = await fetchAPI(`/api/faculty/${facId}`, 'PUT', data);
  } else {
    res = await fetchAPI('/api/faculty', 'POST', data);
  }

  if (res && res.success) {
    closeModal('modal-faculty-form');
    alert(facId ? 'Faculty details updated successfully!' : `Faculty registered successfully! ID: ${res.faculty_code}`);
    loadFacultyDirectory();
    loadFacultyList();
  } else {
    alert(res?.error || 'Failed to save faculty record.');
  }
}

function openReassignStudentModal(studentId, studentName, currentSSC) {
  document.getElementById('re-student-id').value = studentId;
  document.getElementById('re-summary').innerHTML = `
    Student: <strong>${studentName}</strong><br>Currently Assigned SSC: <strong>${currentSSC}</strong>
  `;
  document.getElementById('modal-reassign-student')?.classList.add('active');
}

async function handleReassignStudentSubmit(e) {
  e.preventDefault();
  const data = {
    student_id: document.getElementById('re-student-id').value,
    new_ssc_id: document.getElementById('re-new-ssc-id').value
  };

  const res = await fetchAPI('/api/students/reassign', 'POST', data);
  if (res && res.success) {
    closeModal('modal-reassign-student');
    alert(`Student reassigned successfully from ${res.old_ssc} to ${res.new_ssc}. All past timetables, classes, and logs remain intact.`);
    refreshCurrentView();
  }
}

function openScheduleClassModal() {
  document.getElementById('modal-schedule-class')?.classList.add('active');
}

function openScheduleClassModalForStudent(studentId) {
  const select = document.getElementById('sc-student-id');
  if (select) select.value = studentId;
  openScheduleClassModal();
}

async function handleScheduleClassSubmit(e) {
  e.preventDefault();
  const data = {
    student_id: document.getElementById('sc-student-id').value,
    subject: document.getElementById('sc-subject').value,
    faculty_id: document.getElementById('sc-faculty-id').value,
    date: document.getElementById('sc-date').value,
    start_time: document.getElementById('sc-time').value,
    meeting_link: document.getElementById('sc-meeting-link').value,
    notes: document.getElementById('sc-notes').value
  };

  const res = await fetchAPI('/api/classes', 'POST', data);
  if (res && res.success) {
    closeModal('modal-schedule-class');
    alert('Class scheduled successfully!');
    refreshCurrentView();
  }
}

function openClassReportModal(classId, studentName, subject, time, status, attendance) {
  document.getElementById('cr-class-id').value = classId;
  document.getElementById('cr-title').innerText = `Class Report: ${studentName}`;
  document.getElementById('cr-summary').innerHTML = `
    <strong>${studentName}</strong> • ${subject} at ${time}<br>Current Status: <strong>${status}</strong>
  `;
  document.getElementById('cr-attendance').value = attendance || 'Present';
  document.getElementById('modal-class-report')?.classList.add('active');
}

async function handleClassReportSubmit(e) {
  e.preventDefault();
  const classId = document.getElementById('cr-class-id').value;
  const data = {
    attendance: document.getElementById('cr-attendance').value,
    status: document.getElementById('cr-attendance').value === 'Cancelled' ? 'Cancelled' : 'Completed',
    topic_covered: document.getElementById('cr-topic').value,
    homework: document.getElementById('cr-homework').value,
    student_performance: document.getElementById('cr-performance').value,
    faculty_remarks: document.getElementById('cr-remarks').value
  };

  const res = await fetchAPI(`/api/classes/${classId}`, 'PUT', data);
  if (res && res.success) {
    closeModal('modal-class-report');
    alert('Class report saved!');
    refreshCurrentView();
  }
}

function openRequestRescheduleModal(classId, studentId, slotStr) {
  document.getElementById('rr-class-id').value = classId;
  document.getElementById('rr-student-id').value = studentId;
  document.getElementById('rr-original-slot').value = slotStr;
  document.getElementById('modal-request-reschedule')?.classList.add('active');
}

async function handleRequestRescheduleSubmit(e) {
  e.preventDefault();
  const origSlot = document.getElementById('rr-original-slot').value.split(' ');
  const data = {
    class_id: document.getElementById('rr-class-id').value,
    student_id: document.getElementById('rr-student-id').value,
    original_date: origSlot[0],
    original_time: origSlot.slice(1).join(' '),
    suggested_date: document.getElementById('rr-suggested-date').value,
    suggested_time: document.getElementById('rr-suggested-time').value,
    reason: document.getElementById('rr-reason').value
  };

  const res = await fetchAPI('/api/rescheduling', 'POST', data);
  if (res && res.success) {
    closeModal('modal-request-reschedule');
    alert('Rescheduling request submitted.');
    refreshCurrentView();
  }
}

function openScheduleAssessmentModal() {
  document.getElementById('modal-schedule-assessment')?.classList.add('active');
}

async function handleScheduleAssessmentSubmit(e) {
  e.preventDefault();
  const data = {
    student_id: document.getElementById('sa-student-id').value,
    subject: document.getElementById('sa-subject').value,
    type: document.getElementById('sa-type').value,
    date: document.getElementById('sa-date').value,
    time: document.getElementById('sa-time').value,
    notes: document.getElementById('sa-notes').value
  };

  const res = await fetchAPI('/api/assessments', 'POST', data);
  if (res && res.success) {
    closeModal('modal-schedule-assessment');
    alert('Assessment scheduled!');
    refreshCurrentView();
  }
}

function openAssessmentResultModal(assessmentId) {
  document.getElementById('ar-assessment-id').value = assessmentId;
  document.getElementById('modal-assessment-result')?.classList.add('active');
}

async function handleAssessmentResultSubmit(e) {
  e.preventDefault();
  const assessmentId = document.getElementById('ar-assessment-id').value;
  const data = {
    score: document.getElementById('ar-score').value,
    max_score: document.getElementById('ar-max-score').value,
    faculty_remark: document.getElementById('ar-faculty-remark').value,
    ssc_remark: document.getElementById('ar-ssc-remark').value
  };

  const res = await fetchAPI(`/api/assessments/${assessmentId}`, 'PUT', data);
  if (res && res.success) {
    closeModal('modal-assessment-result');
    alert('Assessment result recorded!');
    refreshCurrentView();
  }
}

function openCreateFollowupModal() {
  document.getElementById('modal-create-followup')?.classList.add('active');
}

async function handleCreateFollowupSubmit(e) {
  e.preventDefault();
  const data = {
    student_id: document.getElementById('fu-student-id').value,
    type: document.getElementById('fu-type').value,
    due_date: document.getElementById('fu-due-date').value,
    priority: document.getElementById('fu-priority').value,
    notes: document.getElementById('fu-notes').value
  };

  const res = await fetchAPI('/api/followups', 'POST', data);
  if (res && res.success) {
    closeModal('modal-create-followup');
    alert('Follow-up task created.');
    refreshCurrentView();
  }
}

async function handleRecordFeedbackSubmit(e, studentId) {
  if (e && e.preventDefault) e.preventDefault();
  const rfType = document.getElementById('rf-type');
  const rfRating = document.getElementById('rf-rating');
  const rfComments = document.getElementById('rf-comments');
  const rfFollowup = document.getElementById('rf-followup');

  const data = {
    student_id: studentId,
    feedback_type: rfType ? rfType.value : 'General',
    rating_status: rfRating ? rfRating.value : 'Good',
    comments: rfComments ? rfComments.value : '',
    follow_up_required: rfFollowup ? rfFollowup.checked : false
  };

  const res = await fetchAPI('/api/feedback', 'POST', data);
  if (res && res.success) {
    alert('Feedback recorded!');
    openStudentDrawer(studentId);
  }
}

// WHATSAPP SHORTCUTS
function sendWhatsAppReminder(studentName, time, subject, targetRole) {
  const text = `Hello, this is a reminder from Mash Magic. ${studentName}'s class is scheduled today at ${time} for ${subject}.`;
  const phone = "919876543210";
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

function openDirectWhatsApp(phone, messageText) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
}

// ==========================================================================
// FACULTY SESSION WRAP-UP WORKFLOW (PUBLIC & SSC VERIFICATION)
// ==========================================================================

async function showFacultyWrapupLayout(token) {
  const loginView = document.getElementById('view-login');
  const appWrapper = document.getElementById('app-wrapper');
  const wrapupView = document.getElementById('view-session-wrapup');

  if (loginView) loginView.style.display = 'none';
  if (appWrapper) appWrapper.style.display = 'none';
  if (wrapupView) wrapupView.style.display = 'flex';

  window.currentWrapupToken = token;

  try {
    const res = await fetch('/api/session-wrapup/' + token).then(r => r.json());
    if (!res || !res.success) {
      document.getElementById('wrapup-status-banner').innerHTML = `
        <div class="alert alert-danger" style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; padding:12px; border-radius:8px; text-align:center; font-weight:600;">
          ⚠️ ${res?.error || 'Invalid or expired session wrap-up link.'}
        </div>`;
      document.getElementById('wrapup-session-summary').style.display = 'none';
      document.getElementById('form-faculty-wrapup').style.display = 'none';
      return;
    }

    renderFacultyWrapupPage(res.session);
  } catch (e) {
    document.getElementById('wrapup-status-banner').innerHTML = `
      <div class="alert alert-danger" style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; padding:12px; border-radius:8px; text-align:center; font-weight:600;">
        ⚠️ Failed to load session details. Please check network connection.
      </div>`;
  }
}

function renderFacultyWrapupPage(sess) {
  window.currentWrapupSession = sess;

  const summaryBox = document.getElementById('wrapup-session-summary');
  summaryBox.style.display = 'block';
  summaryBox.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13px; color:#334155;">
      <div><strong>Student:</strong> ${escapeHTML(sess.student_name)}</div>
      <div><strong>Grade:</strong> ${escapeHTML(sess.student_grade || '')}</div>
      <div><strong>Subject:</strong> <span class="badge badge-primary">${escapeHTML(sess.subject)}</span></div>
      <div><strong>Date:</strong> ${escapeHTML(sess.date)}</div>
      <div><strong>Scheduled Time:</strong> ${escapeHTML(sess.start_time)} (${sess.duration} mins)</div>
      <div><strong>Faculty:</strong> ${escapeHTML(sess.faculty_name)}</div>
    </div>
  `;

  const banner = document.getElementById('wrapup-status-banner');
  const form = document.getElementById('form-faculty-wrapup');
  const submittedBox = document.getElementById('wrapup-submitted-details');

  banner.innerHTML = '';
  form.style.display = 'none';
  submittedBox.style.display = 'none';

  if (sess.status === 'CANCELLED' || sess.status === 'Cancelled') {
    banner.innerHTML = `
      <div style="background:#fff7ed; color:#c2410c; border:1px solid #ffedd5; padding:14px; border-radius:8px; font-weight:600; text-align:center;">
        ⚠️ This session was cancelled. Wrap-up is not required.
      </div>`;
    return;
  }

  if (sess.wrapup_status === 'VERIFIED') {
    banner.innerHTML = `
      <div style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:14px; border-radius:8px; font-weight:700; text-align:center;">
        ✅ Wrap-Up Report Verified & Finalized by SSC
      </div>`;
    renderSubmittedDetailsReadonly(sess, submittedBox);
    return;
  }

  if (sess.wrapup_status === 'SUBMITTED') {
    banner.innerHTML = `
      <div style="background:#fefce8; color:#a16207; border:1px solid #fef08a; padding:14px; border-radius:8px; font-weight:700; text-align:center;">
        ⏳ Wrap-Up Submitted — Awaiting SSC Verification
      </div>`;
    renderSubmittedDetailsReadonly(sess, submittedBox);
    return;
  }

  if (sess.wrapup_status === 'CORRECTION_REQUIRED') {
    banner.innerHTML = `
      <div style="background:#fff7ed; color:#c2410c; border:1px solid #fdba74; padding:14px; border-radius:8px; font-weight:700; margin-bottom:14px;">
        ⚠️ Correction Requested by SSC:
        <div style="font-weight:400; font-style:italic; margin-top:4px;">"${escapeHTML(sess.correction_reason || 'Please review and update report details.')}"</div>
      </div>`;
  }

  form.style.display = 'block';

  document.getElementById('wrapup-session-status').value = sess.session_status || 'Completed';
  document.getElementById('wrapup-topic-covered').value = sess.topic_covered || '';
  document.getElementById('wrapup-homework').value = sess.homework || '';
  document.getElementById('wrapup-homework-given').value = sess.homework_given || 'Yes';
  document.getElementById('wrapup-student-performance').value = sess.student_performance || 'Good';
  document.getElementById('wrapup-faculty-remarks').value = sess.faculty_remarks || '';
  document.getElementById('wrapup-next-rec').value = sess.next_session_rec || '';

  let defaultStart = sess.actual_start_time || convert12to24(sess.start_time);
  let defaultEnd = sess.actual_end_time || addMinutesToTime24(defaultStart, sess.duration || 60);

  document.getElementById('wrapup-actual-start').value = defaultStart;
  document.getElementById('wrapup-actual-end').value = defaultEnd;

  calculateWrapupLiveDuration();
}

function renderSubmittedDetailsReadonly(sess, container) {
  container.style.display = 'block';
  container.innerHTML = `
    <h4 style="font-size:14px; font-weight:700; color:#334155; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
      📄 Submitted Report Details
    </h4>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px; color:#334155;">
      <div><strong>Status:</strong> ${escapeHTML(sess.session_status || 'Completed')}</div>
      <div><strong>Actual Duration:</strong> ${sess.actual_minutes || sess.duration} mins (${escapeHTML(sess.actual_start_time || '')} – ${escapeHTML(sess.actual_end_time || '')})</div>
      <div><strong>Topic Covered:</strong> ${escapeHTML(sess.topic_covered || 'N/A')}</div>
      <div><strong>Homework:</strong> ${escapeHTML(sess.homework || 'None')}</div>
      <div><strong>Performance:</strong> ${escapeHTML(sess.student_performance || 'Good')}</div>
      <div><strong>Homework Given:</strong> ${escapeHTML(sess.homework_given || 'Yes')}</div>
    </div>
    <div style="font-size:13px; color:#334155; margin-top:8px;">
      <strong>Faculty Remarks:</strong>
      <p style="background:#fff; padding:8px; border-radius:6px; border:1px solid #e2e8f0; font-style:italic; margin-top:4px;">${escapeHTML(sess.faculty_remarks || 'None provided.')}</p>
    </div>
    ${sess.ssc_remarks ? `<div style="font-size:13px; color:#0369a1; margin-top:6px;"><strong>SSC Verification Remarks:</strong> ${escapeHTML(sess.ssc_remarks)}</div>` : ''}
  `;
}

function convert12to24(time12) {
  if (!time12) return "16:00";
  const parts = time12.split(' ');
  const time = parts[0];
  const modifier = parts[1];
  if (!modifier) return time;
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function addMinutesToTime24(time24, minsToAdd) {
  if (!time24 || !time24.includes(':')) return "17:00";
  let [h, m] = time24.split(':').map(Number);
  let totalMins = h * 60 + m + minsToAdd;
  let newH = Math.floor(totalMins / 60) % 24;
  let newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function calculateWrapupLiveDuration() {
  const startVal = document.getElementById('wrapup-actual-start')?.value;
  const endVal = document.getElementById('wrapup-actual-end')?.value;
  const durBox = document.getElementById('wrapup-calculated-duration-box');
  if (!durBox) return;

  if (!startVal || !endVal) {
    durBox.innerText = '⏱️ Calculated Duration: -- minutes';
    return;
  }

  const [h1, m1] = startVal.split(':').map(Number);
  const [h2, m2] = endVal.split(':').map(Number);

  let startTotal = h1 * 60 + m1;
  let endTotal = h2 * 60 + m2;
  if (endTotal < startTotal) endTotal += 24 * 60;

  const diffMins = Math.max(1, endTotal - startTotal);
  durBox.innerText = `⏱️ Calculated Duration: ${diffMins} minutes`;
}

async function handleFacultyWrapupSubmit(e) {
  e.preventDefault();
  const errBox = document.getElementById('wrapup-form-error');
  errBox.style.display = 'none';

  const payload = {
    session_status: document.getElementById('wrapup-session-status').value,
    actual_start_time: document.getElementById('wrapup-actual-start').value,
    actual_end_time: document.getElementById('wrapup-actual-end').value,
    topic_covered: document.getElementById('wrapup-topic-covered').value.trim(),
    homework: document.getElementById('wrapup-homework').value.trim(),
    homework_given: document.getElementById('wrapup-homework-given').value,
    student_performance: document.getElementById('wrapup-student-performance').value,
    faculty_remarks: document.getElementById('wrapup-faculty-remarks').value.trim(),
    next_session_rec: document.getElementById('wrapup-next-rec').value.trim()
  };

  const btn = document.getElementById('btn-submit-wrapup');
  btn.disabled = true;
  btn.innerText = 'Submitting...';

  try {
    const res = await fetch('/api/session-wrapup/' + window.currentWrapupToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (!res || !res.success) {
      errBox.innerText = res?.error || 'Failed to submit wrap-up report.';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerText = 'Submit Wrap-Up Report';
      return;
    }

    const updatedSess = await fetch('/api/session-wrapup/' + window.currentWrapupToken).then(r => r.json());
    if (updatedSess && updatedSess.success) {
      renderFacultyWrapupPage(updatedSess.session);
    }
  } catch (err) {
    errBox.innerText = 'Network error. Please check connection and try again.';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = 'Submit Wrap-Up Report';
  }
}

// SSC VERIFICATION & REVIEW MODAL

async function openSSCReviewModal(classId) {
  const pendingRes = await fetchAPI('/api/wrapups/pending');
  let cls = null;
  if (pendingRes && pendingRes.pending_wrapups) {
    cls = pendingRes.pending_wrapups.find(c => c.id === classId);
  }

  if (!cls) {
    const classRes = await fetchAPI('/api/classes');
    if (classRes && classRes.classes) {
      cls = classRes.classes.find(c => c.id === classId);
    }
  }

  if (!cls) {
    alert('Class details not found.');
    return;
  }

  document.getElementById('ssc-review-class-id').value = cls.id;
  document.getElementById('ssc-review-student-info').innerText = `${cls.student_name} (${cls.student_grade || cls.grade || ''})`;
  document.getElementById('ssc-review-scheduled-time').innerText = `${cls.subject} • ${cls.date} at ${cls.start_time} (${cls.duration} mins)`;
  document.getElementById('ssc-review-faculty-info').innerText = `${cls.faculty_name} (${cls.faculty_phone || ''})`;
  
  const calcMins = cls.actual_minutes || cls.duration || 60;
  document.getElementById('ssc-review-actual-time').innerText = `${cls.actual_start_time || cls.start_time} – ${cls.actual_end_time || ''} (${calcMins} mins)`;
  
  document.getElementById('ssc-review-topic').innerText = cls.topic_covered || 'N/A';
  document.getElementById('ssc-review-homework').innerText = cls.homework || 'None';
  document.getElementById('ssc-review-performance').innerText = cls.student_performance || 'Good';
  document.getElementById('ssc-review-hw-given').innerText = cls.homework_given || 'Yes';
  document.getElementById('ssc-review-faculty-remarks').innerText = cls.faculty_remarks || 'None provided.';
  
  if (cls.next_session_rec) {
    document.getElementById('ssc-review-next-rec-box').style.display = 'block';
    document.getElementById('ssc-review-next-rec').innerText = cls.next_session_rec;
  } else {
    document.getElementById('ssc-review-next-rec-box').style.display = 'none';
  }

  document.getElementById('ssc-review-attendance').value = cls.attendance || 'Present';
  document.getElementById('ssc-review-final-minutes').value = calcMins;
  document.getElementById('ssc-review-calc-min-hint').innerText = calcMins;
  document.getElementById('ssc-review-ssc-remarks').value = cls.ssc_remarks || '';
  
  document.getElementById('ssc-review-correction-box').style.display = 'none';
  document.getElementById('ssc-review-correction-reason').value = '';

  openModal('modal-ssc-review-wrapup');
}

function toggleSSCCorrectionBox() {
  const box = document.getElementById('ssc-review-correction-box');
  if (box.style.display === 'none') {
    box.style.display = 'block';
    document.getElementById('ssc-review-correction-reason').focus();
  } else {
    box.style.display = 'none';
  }
}

async function submitSSCVerification(action) {
  const classId = document.getElementById('ssc-review-class-id').value;
  const attendance = document.getElementById('ssc-review-attendance').value;
  const finalMinutes = parseInt(document.getElementById('ssc-review-final-minutes').value, 10);
  const sscRemarks = document.getElementById('ssc-review-ssc-remarks').value.trim();
  const correctionReason = document.getElementById('ssc-review-correction-reason').value.trim();

  const corrBox = document.getElementById('ssc-review-correction-box');
  const isSendBack = (corrBox.style.display !== 'none' || action === 'SEND_BACK');

  if (isSendBack && !correctionReason) {
    alert('Please enter a reason for sending the wrap-up back to the faculty.');
    document.getElementById('ssc-review-correction-reason').focus();
    return;
  }

  const payload = {
    action: isSendBack ? 'SEND_BACK' : 'APPROVE',
    attendance: attendance,
    final_minutes: finalMinutes,
    ssc_remarks: sscRemarks,
    correction_reason: correctionReason
  };

  const res = await fetchAPI(`/api/classes/${classId}/verify-wrapup`, 'POST', payload);
  if (res && res.success) {
    closeModal('modal-ssc-review-wrapup');
    alert(isSendBack ? 'Wrap-up sent back to faculty for correction.' : `Session verified and finalized (${finalMinutes} mins).`);
    refreshCurrentView();
  } else {
    alert(res?.error || 'Failed to update verification status.');
  }
}

function copyWrapupLink(wrapupToken) {
  if (!wrapupToken) {
    alert('Wrap-up link is not available for this session.');
    return;
  }
  const url = `${window.location.origin}/session/${wrapupToken}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Wrap-up link copied to clipboard!\n\n' + url);
  }).catch(() => {
    prompt('Copy this Wrap-up Link for Faculty:', url);
  });
}

function openWhatsAppFaculty(facultyName, facultyPhone, studentName, subject, wrapupToken) {
  if (!wrapupToken) {
    alert('Wrap-up link is not available for this session.');
    return;
  }
  const url = `${window.location.origin}/session/${wrapupToken}`;
  const message = `Hello ${facultyName}, please complete the Mash Magic session wrap-up for ${studentName}'s ${subject} class today using this link: ${url}`;
  const cleanPhone = (facultyPhone || '').replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

// MONTHLY CLASS CALENDAR OPERATIONAL CONTROL PAGE HANDLERS
let monthlyCalYear = 2026;
let monthlyCalMonth = 9;
let cachedMonthlyCalData = null;

function navigateMonthlyCalendarMonth(delta) {
  if (delta === 0) {
    const today = new Date();
    monthlyCalYear = today.getFullYear();
    monthlyCalMonth = today.getMonth() + 1;
  } else {
    monthlyCalMonth += delta;
    if (monthlyCalMonth > 12) {
      monthlyCalMonth = 1;
      monthlyCalYear += 1;
    } else if (monthlyCalMonth < 1) {
      monthlyCalMonth = 12;
      monthlyCalYear -= 1;
    }
  }
  renderMonthlyCalendarPage();
}

async function renderMonthlyCalendarPage() {
  const heading = document.getElementById('mc-month-heading');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (heading) {
    heading.textContent = `${monthNames[monthlyCalMonth - 1]} ${monthlyCalYear}`;
  }

  const studentFilter = document.getElementById('mc-filter-student')?.value || '';
  const subjectFilter = document.getElementById('mc-filter-subject')?.value || '';
  const statusFilter = document.getElementById('mc-filter-status')?.value || '';
  const facultyFilter = document.getElementById('mc-filter-faculty')?.value || '';

  let query = `/api/calendar?year=${monthlyCalYear}&month=${monthlyCalMonth}`;
  if (studentFilter) query += `&student_id=${studentFilter}`;
  if (subjectFilter) query += `&subject=${encodeURIComponent(subjectFilter)}`;
  if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
  if (facultyFilter) query += `&faculty_id=${facultyFilter}`;

  const res = await fetchAPI(query);
  if (!res) return;

  cachedMonthlyCalData = res;

  // 1. Populate Metric Summaries
  const s = res.summary || {};
  const elStudents = document.getElementById('mc-stat-students');
  const elTotal = document.getElementById('mc-stat-total');
  const elConducted = document.getElementById('mc-stat-conducted');
  const elUpcoming = document.getElementById('mc-stat-upcoming');
  const elExceptions = document.getElementById('mc-stat-exceptions');

  if (elStudents) elStudents.textContent = s.total_students || 0;
  if (elTotal) elTotal.textContent = `${s.total_classes || 0} Classes`;
  if (elConducted) elConducted.textContent = s.conducted || 0;
  if (elUpcoming) elUpcoming.textContent = s.upcoming || 0;
  if (elExceptions) {
    elExceptions.innerHTML = `${s.exceptions || 0} <span style="font-size:0.75rem; font-weight:normal; opacity:0.8;">(${s.rescheduled || 0} R, ${s.postponed || 0} P, ${s.cancelled || 0} C)</span>`;
  }

  // 2. Populate Student Filter Dropdown (if not already populated)
  const studentSelect = document.getElementById('mc-filter-student');
  if (studentSelect && res.assigned_students && studentSelect.options.length <= 1) {
    let stHtml = '<option value="">All My Students</option>';
    res.assigned_students.forEach(st => {
      stHtml += `<option value="${st.id}" ${String(st.id) === String(studentFilter) ? 'selected' : ''}>${escapeHTML(st.name)} (${st.register_no || ('MM-2026-' + String(st.id).padStart(4, '0'))})</option>`;
    });
    studentSelect.innerHTML = stHtml;
  }

  // 3. Populate Faculty Filter Dropdown (if not already populated)
  const facultySelect = document.getElementById('mc-filter-faculty');
  if (facultySelect && res.faculty && facultySelect.options.length <= 1) {
    let facHtml = '<option value="">All Faculty</option>';
    res.faculty.forEach(f => {
      facHtml += `<option value="${f.id}" ${String(f.id) === String(facultyFilter) ? 'selected' : ''}>${escapeHTML(f.name)}</option>`;
    });
    facultySelect.innerHTML = facHtml;
  }

  // 4. Render 7-Column Full Month Calendar Grid
  renderMonthlyGrid(res.year, res.month, res.classes || []);
}

function renderMonthlyGrid(year, month, classesList) {
  const container = document.getElementById('mc-grid-container');
  if (!container) return;

  container.innerHTML = '';

  const todayStr = new Date().toISOString().split('T')[0];

  // Group classes by date 'YYYY-MM-DD'
  const classesByDate = {};
  const safeClassesList = Array.isArray(classesList) ? classesList : (typeof classesList === 'object' && classesList ? Object.values(classesList) : []);
  safeClassesList.forEach(c => {
    if (!classesByDate[c.date]) classesByDate[c.date] = [];
    classesByDate[c.date].push(c);
  });

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  let firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();

  let cellsHtml = '';

  // Trailing days from previous month
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevMonthLastDay - i + 1;
    cellsHtml += `
      <div class="mc-day-cell other-month">
        <div class="mc-day-header">
          <span class="mc-day-num">${dayNum}</span>
        </div>
      </div>`;
  }

  // Days of current month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayClasses = classesByDate[dateStr] || [];

    const cellClass = `mc-day-cell ${isToday ? 'is-today' : ''}`;
    const todayBadge = isToday ? '<span class="mc-today-badge">TODAY</span>' : '';
    const countBadge = dayClasses.length > 0 ? `<span class="mc-day-count">${dayClasses.length} class${dayClasses.length === 1 ? '' : 'es'}</span>` : '';

    let cardsHtml = '';
    const MAX_VISIBLE_CARDS = 3;
    const visibleClasses = dayClasses.slice(0, MAX_VISIBLE_CARDS);
    const overflowCount = dayClasses.length - MAX_VISIBLE_CARDS;

    visibleClasses.forEach(c => {
      cardsHtml += renderCompactClassCard(c);
    });

    if (overflowCount > 0) {
      cardsHtml += `<button type="button" class="mc-more-btn" onclick="openDaySummaryModal('${dateStr}')">+ ${overflowCount} more</button>`;
    }

    cellsHtml += `
      <div class="${cellClass}" onclick="handleDayCellClick(event, '${dateStr}')">
        <div class="mc-day-header">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="mc-day-num">${d}</span>
            ${todayBadge}
          </div>
          ${countBadge}
        </div>
        <div class="mc-class-cards-list">
          ${cardsHtml}
        </div>
      </div>`;
  }

  // Trailing days of next month
  const totalCellsSoFar = firstDayIndex + totalDaysInMonth;
  const trailingCells = (7 - (totalCellsSoFar % 7)) % 7;

  for (let j = 1; j <= trailingCells; j++) {
    cellsHtml += `
      <div class="mc-day-cell other-month">
        <div class="mc-day-header">
          <span class="mc-day-num">${j}</span>
        </div>
      </div>`;
  }

  container.innerHTML = cellsHtml;
}

function renderCompactClassCard(c) {
  const st = (c.status || '').toUpperCase();
  
  let statusClass = 'status-scheduled';
  let pillClass = 'mc-pill-scheduled';
  let statusLabel = 'SCHEDULED';

  if (st === 'COMPLETED' || st === 'CONDUCTED') {
    statusClass = 'status-conducted';
    pillClass = 'mc-pill-conducted';
    statusLabel = 'CONDUCTED';
  } else if (st === 'RESCHEDULED' || st === 'RESCHEDULED CLASS') {
    statusClass = 'status-rescheduled';
    pillClass = 'mc-pill-rescheduled';
    statusLabel = 'RESCHEDULED';
  } else if (st === 'POSTPONED' || st === 'POSTPONED CLASS') {
    statusClass = 'status-postponed';
    pillClass = 'mc-pill-postponed';
    statusLabel = 'POSTPONED';
  } else if (st === 'CANCELLED') {
    statusClass = 'status-cancelled';
    pillClass = 'mc-pill-cancelled';
    statusLabel = 'CANCELLED';
  } else if (st === 'NO SHOW' || st === 'NO_SHOW') {
    statusClass = 'status-noshow';
    pillClass = 'mc-pill-noshow';
    statusLabel = 'NO SHOW';
  }

  // Operational Wrap-Up Warning Label
  let wrapupLabel = '';
  if (st === 'COMPLETED' || st === 'CONDUCTED') {
    if (!c.topic_covered) {
      wrapupLabel = `<span class="mc-wrapup-warning" title="Faculty has not submitted class topic / wrapup">⚠ Wrap-up pending</span>`;
    } else {
      wrapupLabel = `<span style="font-size: 0.65rem; color: #15803d; font-weight: 700; margin-top: 2px; display: inline-block;">✓ Conducted (${c.duration || 60}m)</span>`;
    }
  }

  return `
    <div class="mc-class-card ${statusClass}" onclick="event.stopPropagation(); openClassOccurrenceDetailModal(${c.id})">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
        <span class="mc-card-time">⏰ ${(c.start_time || '').replace(/^0/, '')}</span>
        <span class="mc-status-pill ${pillClass}">${statusLabel}</span>
      </div>
      <div class="mc-student-name" onclick="event.stopPropagation(); openStudentDrawer(${c.student_id})" title="View Student Profile">
        ${escapeHTML(c.student_name)}
      </div>
      <div class="mc-card-meta">
        ${escapeHTML(c.subject)} • ${escapeHTML(c.faculty_name || 'Faculty')}
      </div>
      ${wrapupLabel}
    </div>`;
}

function handleDayCellClick(event, dateStr) {
  if (!event.target.closest('.mc-class-card') && !event.target.closest('.mc-more-btn')) {
    openDaySummaryModal(dateStr);
  }
}

function openDaySummaryModal(dateStr) {
  if (!cachedMonthlyCalData || !cachedMonthlyCalData.classes) return;

  const dayClasses = cachedMonthlyCalData.classes.filter(c => c.date === dateStr);

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const titleElem = document.getElementById('ds-modal-title');
  const subElem = document.getElementById('ds-modal-subtitle');
  const contentElem = document.getElementById('ds-modal-content');

  if (titleElem) titleElem.textContent = formattedDate;

  const conductedCount = dayClasses.filter(c => ['COMPLETED', 'CONDUCTED'].includes((c.status || '').toUpperCase())).length;
  const scheduledCount = dayClasses.filter(c => (c.status || '').toUpperCase() === 'SCHEDULED').length;
  const exceptionCount = dayClasses.length - conductedCount - scheduledCount;

  if (subElem) {
    subElem.textContent = `Total Classes: ${dayClasses.length}  |  Conducted: ${conductedCount}  |  Scheduled: ${scheduledCount}  |  Exceptions: ${exceptionCount}`;
  }

  if (contentElem) {
    if (dayClasses.length === 0) {
      contentElem.innerHTML = `<div style="text-align: center; padding: 30px; color: #64748b;">No classes scheduled on this date.</div>`;
    } else {
      let rowsHtml = '';
      dayClasses.forEach(c => {
        const st = (c.status || '').toUpperCase();
        let badgeColor = 'badge-info';
        if (st === 'COMPLETED' || st === 'CONDUCTED') badgeColor = 'badge-success';
        else if (st === 'CANCELLED') badgeColor = 'badge-danger';
        else if (st === 'RESCHEDULED' || st === 'POSTPONED') badgeColor = 'badge-warning';

        rowsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #475569;">${(c.start_time || '').replace(/^0/, '')}</td>
            <td style="padding: 10px 8px;">
              <a href="#" onclick="event.preventDefault(); closeModal('modal-day-summary'); openStudentDrawer(${c.student_id});" style="font-weight: 800; color: #0284c7;">
                ${escapeHTML(c.student_name)}
              </a>
              <div style="font-size: 0.75rem; color: #64748b;">${escapeHTML(c.register_no || '')} • ${escapeHTML(c.grade || '')}</div>
            </td>
            <td style="padding: 10px 8px;"><strong>${escapeHTML(c.subject)}</strong></td>
            <td style="padding: 10px 8px;">
              ${escapeHTML(c.faculty_name || 'Faculty')}
              <div style="font-size: 0.75rem; color: #0284c7;">📞 ${escapeHTML(c.faculty_phone || '')}</div>
            </td>
            <td style="padding: 10px 8px;"><span class="badge ${badgeColor}">${c.status}</span></td>
            <td style="padding: 10px 8px; text-align: center;">
              <button class="btn btn-sm btn-outline" onclick="closeModal('modal-day-summary'); openClassOccurrenceDetailModal(${c.id});">
                Details
              </button>
            </td>
          </tr>`;
      });

      contentElem.innerHTML = `
        <table class="data-table" style="width: 100%; font-size: 0.85rem;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th>Time</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Faculty</th>
              <th>Status</th>
              <th style="text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>`;
    }
  }

  document.getElementById('modal-day-summary')?.classList.add('active');
}

/* ==========================================================================
   SUPER ADMIN CONTROL ROOM, FORM BUILDER & AUDIT LOGGING CONTROLLER
   ========================================================================== */

// AUDIT LOG RECORDER
async function createAuditLog(action, targetType, targetId, details = {}) {
  try {
    const auditData = {
      timestamp: new Date().toISOString(),
      performedByUid: currentUser ? currentUser.uid : 'SYSTEM',
      performedByEmail: currentUser ? currentUser.email : 'system@mashmagic.com',
      performedByRole: currentUser ? currentUser.role : 'SYSTEM',
      action: action,
      targetType: targetType,
      targetId: targetId || '',
      details: details,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'auditLogs'), auditData);
    console.log('[AUDIT LOG RECORDED]', action, targetType, targetId);
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

// MOBILE NAVIGATION DRAWER
function toggleMobileNavDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (sidebar) sidebar.classList.toggle('mobile-drawer-open');
  if (overlay) overlay.classList.toggle('mobile-drawer-open');
}

function closeMobileNavDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (sidebar) sidebar.classList.remove('mobile-drawer-open');
  if (overlay) overlay.classList.remove('mobile-drawer-open');
}

// SUPER ADMIN TAB SWITCHER
function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    pane.style.display = 'none';
  });

  const targetPane = document.getElementById(`admin-tab-${tabName}`);
  if (targetPane) targetPane.style.display = 'block';

  if (tabName === 'overview') loadAdminOverview();
  else if (tabName === 'academic-head') loadAdminAcademicHeads();
  else if (tabName === 'ssc') loadAdminSSCs();
  else if (tabName === 'faculty') loadAdminFaculties();
  else if (tabName === 'student') loadAdminStudents();
  else if (tabName === 'users') loadAdminUsersMatrix();
  else if (tabName === 'forms') {
    const sel = document.getElementById('form-config-select-target');
    loadFormConfiguration(sel ? sel.value : 'student_form');
  }
  else if (tabName === 'audit') loadAdminAuditLogs();
}

// TAB 1: INSTITUTION OVERVIEW
async function loadAdminOverview() {
  try {
    const [headsSnap, sscsSnap, facsSnap, stusSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('role', '==', 'ACADEMIC_HEAD'))),
      getDocs(collection(db, 'sscs')),
      getDocs(collection(db, 'faculties')),
      getDocs(collection(db, 'students'))
    ]);

    const elHeads = document.getElementById('admin-stat-heads');
    const elSSCs = document.getElementById('admin-stat-sscs');
    const elFacs = document.getElementById('admin-stat-faculties');
    const elStus = document.getElementById('admin-stat-students');

    if (elHeads) elHeads.innerText = headsSnap.size;
    if (elSSCs) elSSCs.innerText = sscsSnap.size;
    if (elFacs) elFacs.innerText = facsSnap.size;
    if (elStus) elStus.innerText = stusSnap.size;
  } catch (err) {
    console.error('Error loading admin overview:', err);
  }
}

async function handleInstitutionSave(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById('inst-name').value.trim();
  const code = document.getElementById('inst-code').value.trim();
  const email = document.getElementById('inst-email').value.trim();
  const phone = document.getElementById('inst-phone').value.trim();

  try {
    await setDoc(doc(db, 'institutions', 'default'), {
      name, code, email, phone, updatedAt: new Date().toISOString()
    }, { merge: true });

    await createAuditLog('UPDATE_INSTITUTION_SETTINGS', 'SYSTEM', 'default', { name, code, email });
    alert('Institution settings saved successfully!');
  } catch (err) {
    alert(`Failed to save settings: ${err.message}`);
  }
}

// TAB 2: ACADEMIC HEAD MANAGEMENT
async function loadAdminAcademicHeads() {
  const tbody = document.getElementById('admin-head-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading Academic Heads...</td></tr>`;

  try {
    const qSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'ACADEMIC_HEAD')));
    let html = '';
    qSnap.forEach(d => {
      const u = d.data();
      const statusBadge = u.status === 'Suspended' ? 'badge-danger' : (u.status === 'Restricted' ? 'badge-warning' : 'badge-success');
      html += `
        <tr>
          <td><strong>${u.name || u.displayName || 'Academic Head'}</strong></td>
          <td>${u.email}</td>
          <td>${u.phone || '-'}</td>
          <td><span class="badge ${statusBadge}">${u.status || 'Active'}</span></td>
          <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick="toggleUserRestriction('${d.id}', '${u.status || 'Active'}')">
              ${u.status === 'Restricted' ? 'Unrestrict' : 'Restrict'}
            </button>
            <button class="btn btn-sm ${u.status === 'Suspended' ? 'btn-success' : 'btn-danger'}" onclick="toggleUserSuspension('${d.id}', '${u.status || 'Active'}')">
              ${u.status === 'Suspended' ? 'Activate' : 'Suspend'}
            </button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align:center;">No Academic Heads found. Click "+ Create Academic Head" to add one.</td></tr>`;
  } catch (err) {
    console.error('Error loading academic heads:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load Academic Heads: ${err.message}</td></tr>`;
  }
}

async function handleAcademicHeadSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById('head-name').value.trim();
  const email = document.getElementById('head-email').value.trim();
  const phone = document.getElementById('head-phone').value.trim();
  const status = document.getElementById('head-status').value;

  try {
    const headDocRef = doc(collection(db, 'users'));
    await setDoc(headDocRef, {
      uid: headDocRef.id,
      name: name,
      email: email,
      role: 'ACADEMIC_HEAD',
      phone: phone,
      status: status,
      createdAt: new Date().toISOString()
    });

    await createAuditLog('CREATE_ACADEMIC_HEAD', 'USER', headDocRef.id, { name, email, role: 'ACADEMIC_HEAD', status });
    alert(`Academic Head profile created for ${email}`);
    closeModal('modal-academic-head');
    loadAdminAcademicHeads();
  } catch (err) {
    alert(`Error creating Academic Head: ${err.message}`);
  }
}

// TAB 3: SSC OVERVIEW FOR ADMIN
async function loadAdminSSCs() {
  const tbody = document.getElementById('admin-ssc-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading SSCs...</td></tr>`;

  try {
    const qSnap = await getDocs(collection(db, 'sscs'));
    let html = '';
    qSnap.forEach(d => {
      const s = d.data();
      html += `
        <tr>
          <td><strong>${s.name || s.ssc_name}</strong></td>
          <td>${s.email || '-'}</td>
          <td>${s.assigned_students_count || 0}</td>
          <td><span class="badge badge-success">${s.status || 'Active'}</span></td>
          <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Existing'}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick="openModal('modal-ssc')">Edit</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align:center;">No SSCs found.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading SSCs</td></tr>`;
  }
}

// TAB 4: FACULTY OVERVIEW FOR ADMIN
async function loadAdminFaculties() {
  const tbody = document.getElementById('admin-faculty-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading faculties...</td></tr>`;

  try {
    const qSnap = await getDocs(collection(db, 'faculties'));
    let html = '';
    qSnap.forEach(d => {
      const f = d.data();
      const subjectsStr = Array.isArray(f.subjects) ? f.subjects.join(', ') : (f.subjects || '-');
      html += `
        <tr>
          <td><strong>${f.name}</strong></td>
          <td>${subjectsStr}</td>
          <td>${f.phone || '-'}</td>
          <td><code>${f.wrapupToken || f.wrapup_token || 'N/A'}</code></td>
          <td><span class="badge badge-success">${f.status || 'Active'}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick="openFacultyDrawer(${d.id})">View Profile</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align:center;">No faculties found.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading faculties</td></tr>`;
  }
}

// TAB 5: GLOBAL STUDENT MANAGEMENT
async function loadAdminStudents() {
  const tbody = document.getElementById('admin-student-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading global student registry...</td></tr>`;

  try {
    const qSnap = await getDocs(collection(db, 'students'));
    let html = '';
    const sscSelect = document.getElementById('admin-student-ssc-filter');
    const sscOptions = new Set();

    qSnap.forEach(d => {
      const s = mapStudentDoc(d.id, d.data());
      if (s.ssc_name) sscOptions.add(s.ssc_name);

      const safeName = (s.name || '').replace(/'/g, "\\'");
      html += `
        <tr class="admin-student-row" data-name="${(s.name || '').toLowerCase()}" data-reg="${(s.register_number || '').toLowerCase()}" data-ssc="${s.ssc_name || ''}">
          <td><code>${s.register_number}</code></td>
          <td><strong>${s.name}</strong></td>
          <td>${s.grade} (${s.curriculum || 'CBSE'})</td>
          <td><span class="badge badge-info">${s.ssc_name}</span></td>
          <td><span class="badge ${s.status === 'Inactive' ? 'badge-danger' : 'badge-success'}">${s.status || 'Active'}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick="openStudentSSCReassignModal('${s.id}', '${safeName}')">Reassign SSC</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align:center;">No students found.</td></tr>`;

    if (sscSelect && sscOptions.size > 0) {
      let optHtml = '<option value="ALL">All SSCs</option>';
      sscOptions.forEach(ssc => { optHtml += `<option value="${ssc}">${ssc}</option>`; });
      sscSelect.innerHTML = optHtml;
    }
  } catch (err) {
    console.error('Error loading global students:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load students: ${err.message}</td></tr>`;
  }
}

function filterAdminStudents() {
  const queryVal = (document.getElementById('admin-student-search')?.value || '').toLowerCase();
  const sscVal = document.getElementById('admin-student-ssc-filter')?.value || 'ALL';

  document.querySelectorAll('.admin-student-row').forEach(row => {
    const name = row.getAttribute('data-name');
    const reg = row.getAttribute('data-reg');
    const ssc = row.getAttribute('data-ssc');

    const matchesQuery = !queryVal || name.includes(queryVal) || reg.includes(queryVal);
    const matchesSSC = sscVal === 'ALL' || ssc === sscVal;

    if (matchesQuery && matchesSSC) row.style.display = '';
    else row.style.display = 'none';
  });
}

async function openStudentSSCReassignModal(studentId, studentName) {
  document.getElementById('reassign-student-id').value = studentId;
  document.getElementById('reassign-student-name').innerText = studentName;
  
  const select = document.getElementById('reassign-ssc-select');
  select.innerHTML = '<option value="">Loading SSCs...</option>';

  try {
    const sscSnap = await getDocs(collection(db, 'sscs'));
    let opts = '<option value="">Select Target SSC...</option>';
    sscSnap.forEach(d => {
      const s = d.data();
      opts += `<option value="${d.id}|${s.name || s.ssc_name}">${s.name || s.ssc_name}</option>`;
    });
    select.innerHTML = opts;
    openModal('modal-reassign-ssc');
  } catch (err) {
    alert(`Failed to load SSC options: ${err.message}`);
  }
}

async function handleStudentSSCReassignSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const studentId = document.getElementById('reassign-student-id').value;
  const val = document.getElementById('reassign-ssc-select').value;
  if (!val) return;

  const [sscId, sscName] = val.split('|');

  try {
    await updateDoc(doc(db, 'students', studentId), {
      assignedSSCId: sscId,
      assigned_ssc_id: sscId,
      sscName: sscName,
      ssc_name: sscName,
      updatedAt: new Date().toISOString()
    });

    await createAuditLog('REASSIGN_STUDENT_SSC', 'STUDENT', studentId, { targetSSCId: sscId, targetSSCName: sscName });
    alert(`Student successfully reassigned to ${sscName}`);
    closeModal('modal-reassign-ssc');
    loadAdminStudents();
  } catch (err) {
    alert(`Error reassigning student: ${err.message}`);
  }
}

// TAB 6: USER & ACCESS CONTROL MATRIX
async function loadAdminUsersMatrix() {
  const tbody = document.getElementById('admin-users-matrix-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading User Matrix...</td></tr>`;

  try {
    const qSnap = await getDocs(collection(db, 'users'));
    let html = '';
    qSnap.forEach(d => {
      const u = d.data();
      const statusClass = u.status === 'Suspended' ? 'badge-danger' : (u.status === 'Restricted' ? 'badge-warning' : 'badge-success');
      html += `
        <tr>
          <td><strong>${u.email}</strong></td>
          <td>${u.name || u.displayName || '-'}</td>
          <td><span class="badge ${u.role === 'SUPER_ADMIN' ? 'badge-purple' : (u.role === 'ACADEMIC_HEAD' ? 'badge-primary' : 'badge-info')}">${u.role}</span></td>
          <td><span class="badge ${statusClass}">${u.status || 'Active'}</span></td>
          <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'N/A'}</td>
          <td style="text-align: right;">
            ${u.role === 'SUPER_ADMIN' ? '<span style="font-size:12px; color:#64748b;">System Admin</span>' : `
              <button class="btn btn-sm btn-secondary" onclick="toggleUserRestriction('${d.id}', '${u.status || 'Active'}')">
                ${u.status === 'Restricted' ? 'Unrestrict' : 'Restrict'}
              </button>
              <button class="btn btn-sm ${u.status === 'Suspended' ? 'btn-success' : 'btn-danger'}" onclick="toggleUserSuspension('${d.id}', '${u.status || 'Active'}')">
                ${u.status === 'Suspended' ? 'Activate' : 'Suspend'}
              </button>
            `}
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading user matrix</td></tr>`;
  }
}

async function toggleUserRestriction(uid, currentStatus) {
  const newStatus = currentStatus === 'Restricted' ? 'Active' : 'Restricted';
  if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;

  try {
    await updateDoc(doc(db, 'users', uid), { status: newStatus });
    await createAuditLog('TOGGLE_USER_RESTRICTION', 'USER', uid, { newStatus, previousStatus: currentStatus });
    loadAdminUsersMatrix();
    loadAdminAcademicHeads();
  } catch (err) {
    alert(`Error updating status: ${err.message}`);
  }
}

async function toggleUserSuspension(uid, currentStatus) {
  const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
  if (!confirm(`Are you sure you want to set user account status to ${newStatus}?`)) return;

  try {
    await updateDoc(doc(db, 'users', uid), { status: newStatus });
    await createAuditLog('TOGGLE_USER_SUSPENSION', 'USER', uid, { newStatus, previousStatus: currentStatus });
    loadAdminUsersMatrix();
    loadAdminAcademicHeads();
  } catch (err) {
    alert(`Error updating suspension: ${err.message}`);
  }
}

// TAB 7: FORM & FIELD CONFIGURATION ENGINE
const defaultFormConfigs = {
  student_form: [
    { key: 'registerNumber', label: 'Register Number', placeholder: 'MM-2026-001', required: true, hidden: false, protected: true },
    { key: 'name', label: 'Student Full Name', placeholder: 'e.g. Rahul Sharma', required: true, hidden: false, protected: false },
    { key: 'grade', label: 'Grade / Class', placeholder: 'e.g. Class 10 ICSE', required: true, hidden: false, protected: false },
    { key: 'school', label: 'School Name', placeholder: 'e.g. Delhi Public School', required: false, hidden: false, protected: false },
    { key: 'parentName', label: 'Parent Name', placeholder: 'Parent / Guardian name', required: true, hidden: false, protected: false },
    { key: 'parentPhone', label: 'Parent Contact Number', placeholder: '+91 98765 43210', required: true, hidden: false, protected: false },
    { key: 'parentEmail', label: 'Parent Email', placeholder: 'parent@gmail.com', required: false, hidden: false, protected: false }
  ],
  faculty_form: [
    { key: 'name', label: 'Faculty Name', placeholder: 'e.g. Prof. Mehta', required: true, hidden: false, protected: false },
    { key: 'phone', label: 'Contact Number', placeholder: '+91 98765 43210', required: true, hidden: false, protected: false },
    { key: 'subjects', label: 'Capability Subjects', placeholder: 'Mathematics, Physics', required: true, hidden: false, protected: false }
  ],
  ssc_form: [
    { key: 'name', label: 'SSC Name', placeholder: 'e.g. Ananya Sharma', required: true, hidden: false, protected: false },
    { key: 'email', label: 'SSC Email', placeholder: 'ananya@mashmagic.com', required: true, hidden: false, protected: false }
  ],
  class_schedule_form: [
    { key: 'studentId', label: 'Student', placeholder: '', required: true, hidden: false, protected: true },
    { key: 'facultyId', label: 'Faculty', placeholder: '', required: true, hidden: false, protected: false },
    { key: 'subject', label: 'Subject', placeholder: 'Mathematics', required: true, hidden: false, protected: false },
    { key: 'scheduledDate', label: 'Class Date', placeholder: '', required: true, hidden: false, protected: false },
    { key: 'startTime', label: 'Start Time', placeholder: '16:00', required: true, hidden: false, protected: false },
    { key: 'endTime', label: 'End Time', placeholder: '17:30', required: true, hidden: false, protected: false }
  ],
  assessment_form: [
    { key: 'studentId', label: 'Student', placeholder: '', required: true, hidden: false, protected: true },
    { key: 'subject', label: 'Subject', placeholder: 'Physics', required: true, hidden: false, protected: false },
    { key: 'score', label: 'Score Obtained', placeholder: '85', required: true, hidden: false, protected: false },
    { key: 'maxScore', label: 'Max Possible Score', placeholder: '100', required: true, hidden: false, protected: false }
  ]
};

let currentFormConfigTarget = 'student_form';
let currentLoadedFormFields = [];

async function loadFormConfiguration(targetFormKey) {
  currentFormConfigTarget = targetFormKey;
  const tbody = document.getElementById('admin-form-config-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading configuration...</td></tr>`;

  try {
    const docRef = doc(db, 'formConfigurations', targetFormKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      currentLoadedFormFields = snap.data().fields || defaultFormConfigs[targetFormKey] || [];
    } else {
      currentLoadedFormFields = defaultFormConfigs[targetFormKey] || [];
    }

    renderFormConfigTable();
  } catch (err) {
    console.error('Error loading form config:', err);
    currentLoadedFormFields = defaultFormConfigs[targetFormKey] || [];
    renderFormConfigTable();
  }
}

function renderFormConfigTable() {
  const tbody = document.getElementById('admin-form-config-tbody');
  if (!tbody) return;

  let html = '';
  currentLoadedFormFields.forEach((field, index) => {
    const isProtected = field.protected || ['studentId', 'registerNumber', 'createdAt', 'updatedAt', 'institutionId', 'userId', 'role', 'uid'].includes(field.key);
    html += `
      <tr>
        <td><code>${field.key}</code></td>
        <td>
          <input type="text" class="form-control" value="${field.label || ''}" onchange="updateFormFieldProp(${index}, 'label', this.value)" style="padding:4px 8px; font-size:12px;">
        </td>
        <td>
          <input type="text" class="form-control" value="${field.placeholder || ''}" onchange="updateFormFieldProp(${index}, 'placeholder', this.value)" style="padding:4px 8px; font-size:12px;">
        </td>
        <td style="text-align:center;">
          <input type="checkbox" ${field.required ? 'checked' : ''} ${isProtected ? 'disabled' : ''} onchange="updateFormFieldProp(${index}, 'required', this.checked)">
        </td>
        <td style="text-align:center;">
          <input type="checkbox" ${!field.hidden ? 'checked' : ''} ${isProtected ? 'disabled' : ''} onchange="updateFormFieldProp(${index}, 'hidden', !this.checked)">
        </td>
        <td>
          ${isProtected ? '<span class="badge badge-warning">🛡️ Protected System Field</span>' : '<span class="badge badge-success">Customizable</span>'}
        </td>
        <td style="text-align:right;">
          <span style="font-size:11px; color:#64748b;">${isProtected ? 'Locked' : 'Editable'}</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function updateFormFieldProp(index, prop, value) {
  if (currentLoadedFormFields[index]) {
    currentLoadedFormFields[index][prop] = value;
  }
}

async function saveCurrentFormConfig() {
  try {
    const docRef = doc(db, 'formConfigurations', currentFormConfigTarget);
    await setDoc(docRef, {
      formKey: currentFormConfigTarget,
      fields: currentLoadedFormFields,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? currentUser.email : 'admin'
    });

    await createAuditLog('UPDATE_FORM_CONFIG', 'FORM', currentFormConfigTarget, { fieldsCount: currentLoadedFormFields.length });
    alert(`Form configuration saved successfully for ${currentFormConfigTarget}!`);
  } catch (err) {
    alert(`Failed to save form configuration: ${err.message}`);
  }
}

// TAB 9: AUDIT LOGS VIEW & CSV EXPORT
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading Audit Logs...</td></tr>`;

  try {
    const qSnap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')));
    let html = '';
    qSnap.forEach(d => {
      const a = d.data();
      const safeDetails = escapeHTML(JSON.stringify(a.details || {}));
      html += `
        <tr class="audit-log-row" data-search="${(a.performedByEmail + ' ' + a.action + ' ' + a.targetType).toLowerCase()}">
          <td><span style="font-size:11px; font-family:monospace;">${new Date(a.timestamp).toLocaleString()}</span></td>
          <td><strong>${a.performedByEmail || 'System'}</strong></td>
          <td><span class="badge badge-purple">${a.performedByRole || 'SYS'}</span></td>
          <td><span class="badge badge-info">${a.action}</span></td>
          <td><code>${a.targetType}:${a.targetId || '-'}</code></td>
          <td style="font-size:12px; color:#475569;">${safeDetails}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align:center;">No audit logs recorded yet.</td></tr>`;
  } catch (err) {
    console.error('Error loading audit logs:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading audit logs: ${err.message}</td></tr>`;
  }
}

function filterAuditLogs() {
  const queryVal = (document.getElementById('audit-log-search')?.value || '').toLowerCase();
  document.querySelectorAll('.audit-log-row').forEach(row => {
    const text = row.getAttribute('data-search');
    if (!queryVal || text.includes(queryVal)) row.style.display = '';
    else row.style.display = 'none';
  });
}

function exportAuditLogsCSV() {
  getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'))).then(qSnap => {
    let csv = 'Timestamp,PerformedBy,Role,Action,TargetType,TargetId,Details\n';
    qSnap.forEach(d => {
      const a = d.data();
      const detailsStr = JSON.stringify(a.details || {}).replace(/"/g, '""');
      csv += `"${a.timestamp}","${a.performedByEmail}","${a.performedByRole}","${a.action}","${a.targetType}","${a.targetId}","${detailsStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  });
}

// TAB 10: BRAND UI SETTINGS
function handleBrandSave(e) {
  if (e && e.preventDefault) e.preventDefault();
  const primary = document.getElementById('brand-color-primary').value;
  const gold = document.getElementById('brand-color-gold').value;
  const navy = document.getElementById('brand-color-navy').value;
  const title = document.getElementById('brand-title').value;

  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--secondary-gold', gold);
  document.documentElement.style.setProperty('--bg-sidebar', navy);

  createAuditLog('UPDATE_BRAND_SETTINGS', 'SYSTEM', 'brand', { primary, gold, navy, title });
  alert('Brand UI settings updated successfully!');
}

// EXPOSE ALL UI CONTROLLER FUNCTIONS TO GLOBAL WINDOW OBJECT FOR INLINE HANDLERS
Object.assign(window, {
  handleLoginSubmit,
  handleLogout,
  switchView,
  navigateTo: switchView,
  scrollToSection,
  openModal,
  closeModal,
  loadHeadDashboard,
  onHeadPeriodChange,
  setUpcomingPkgFilter,
  openCreateSSCModal,
  handleCreateSSCSubmit,
  openAddFacultyModal,
  openEditFacultyModal,
  handleFacultyFormSubmit,
  openRegisterStudentModal,
  handleRegisterStudentSubmit,
  openScheduleClassModal,
  handleScheduleClassSubmit,
  openCreateFollowupModal,
  handleCreateFollowupSubmit,
  openRescheduleClassModal,
  handleRescheduleClassSubmit,
  restoreStudent,
  markCourseCompleted,
  openAddPackageModal,
  handleAddPackageSubmit,
  archiveStudent,
  openSetWeeklyTimetableModal,
  openSetWeeklyTimetableModalForStudent,
  handleSetWeeklyTimetableSubmit,
  openEditWeeklySlotModal,
  handleEditWeeklySlotSubmit,
  removeWeeklySlot,
  deleteWeeklySlot: removeWeeklySlot,
  switchTimetableMode,
  navigateCalendarMonth,
  refreshTimetableModeView,
  switchCalendarSubView,
  navigateMonthlyCalendarMonth,
  renderMonthlyCalendarPage,
  openScheduleAssessmentModal,
  handleScheduleAssessmentSubmit,
  closeStudentDrawer,
  openStudentDrawer,
  closeFacultyDrawer,
  openFacultyDrawer,
  handleFacultyWrapupSubmit,
  calculateWrapupLiveDuration,
  openClassOccurrenceDetailModal,
  openCancelClassModal,
  handleCancelClassSubmit,
  openPostponeClassModal,
  handlePostponeClassSubmit,
  addSubjectSlotRow,
  removeSubjectSlotRow,
  openReassignStudentModal,
  handleReassignStudentSubmit,
  openUpdateRenewalStatusModal,
  submitRenewalStatusUpdate,
  toggleSSCStatus,
  openSSCReviewModal,
  toggleSSCCorrectionBox,
  submitSSCVerification,
  copyWrapupLink,
  openWhatsAppFaculty,
  openDirectWhatsApp,
  openRequestRescheduleModal,
  handleRequestRescheduleSubmit,
  approveReschedule,
  openAssessmentResultModal,
  handleAssessmentResultSubmit,
  completeFollowup,
  addRegisterSubjectRow,
  addPackageSubjectRow,
  // Super Admin Extensions
  createAuditLog,
  toggleMobileNavDrawer,
  closeMobileNavDrawer,
  switchAdminTab,
  loadAdminOverview,
  handleInstitutionSave,
  loadAdminAcademicHeads,
  handleAcademicHeadSubmit,
  loadAdminSSCs,
  loadAdminFaculties,
  loadAdminStudents,
  filterAdminStudents,
  openStudentSSCReassignModal,
  handleStudentSSCReassignSubmit,
  loadAdminUsersMatrix,
  toggleUserRestriction,
  toggleUserSuspension,
  loadFormConfiguration,
  renderFormConfigTable,
  updateFormFieldProp,
  saveCurrentFormConfig,
  loadAdminAuditLogs,
  filterAuditLogs,
  exportAuditLogsCSV,
  handleBrandSave
});



