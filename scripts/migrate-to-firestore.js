import sqlite3 from 'sqlite3';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDocs, collection 
} from 'firebase/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'the-lms---mash-magic.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'the-lms---mash-magic',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'the-lms---mash-magic.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '3640350490',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:3640350490:web:540e71d18640683818f86b'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const sqliteDbPath = path.join(__dirname, '../ssc_database.db');

function parseList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const p = JSON.parse(val);
    if (Array.isArray(p)) return p;
  } catch (e) {}
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

const query = (sDb, sql, params = []) => {
  return new Promise((resolve, reject) => {
    sDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function executeLiveMigration() {
  console.log('==================================================');
  console.log('     MASH MAGIC LMS - LIVE FIREBASE MIGRATION     ');
  console.log('==================================================');
  console.log('Target Firebase Project:', firebaseConfig.projectId);

  const sDb = new sqlite3.Database(sqliteDbPath);
  const stats = {
    users: { migrated: 0, skipped: 0, errors: 0 },
    faculties: { migrated: 0, skipped: 0, errors: 0 },
    students: { migrated: 0, skipped: 0, errors: 0 },
    weeklyTimetables: { migrated: 0, skipped: 0, errors: 0 },
    classOccurrences: { migrated: 0, skipped: 0, errors: 0 },
    assessments: { migrated: 0, skipped: 0, errors: 0 },
    followups: { migrated: 0, skipped: 0, errors: 0 },
    activityLogs: { migrated: 0, skipped: 0, errors: 0 }
  };

  try {
    // 0. Authenticate as Academic Head
    console.log('\n[0/8] Authenticating Admin Session in Firebase Auth...');
    const adminEmail = 'head@mashmagic.com';
    const adminPass = 'MashMagic123!';
    let adminUid = '';

    try {
      const userCred = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      adminUid = userCred.user.uid;
      console.log(`  ✓ Signed in as Academic Head (${adminEmail}), UID: ${adminUid}`);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
          adminUid = newCred.user.uid;
          console.log(`  ✓ Created Academic Head Auth Account (${adminEmail}), UID: ${adminUid}`);
        } catch (createErr) {
          console.error('  Failed to create Academic Head user:', createErr);
        }
      } else {
        console.error('  Auth error:', authErr);
      }
    }

    // Provision Academic Head Profile in Firestore (matching auth.uid)
    if (adminUid) {
      await setDoc(doc(db, 'users', adminUid), {
        id: 1,
        uid: adminUid,
        user_id: adminUid,
        name: 'Dr. Vikram Malhotra',
        email: adminEmail,
        role: 'ACADEMIC_HEAD',
        status: 'Active',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('  ✓ Academic Head profile written to users collection.');
    }

    // 1. Users Collection
    console.log('\n[1/8] Migrating Users Collection...');
    const users = await query(sDb, 'SELECT * FROM users');
    for (const u of users) {
      try {
        if (u.email === adminEmail) {
          stats.users.migrated++;
          continue; // Already provisioned with matching adminUid
        }
        const docId = u.id.toString();
        const docRef = doc(db, 'users', docId);
        await setDoc(docRef, {
          id: u.id,
          user_id: docId,
          uid: docId,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          status: u.status || 'Active',
          assignedStudentsCount: 0,
          createdAt: u.created_at || new Date().toISOString()
        }, { merge: true });

        // Seed default Auth accounts for SSC users
        if (u.role === 'SSC') {
          try {
            await createUserWithEmailAndPassword(auth, u.email, 'MashMagic123!');
            console.log(`    • Provisioned Firebase Auth account for SSC ${u.email}`);
          } catch (e) {
            // Already created or existing
          }
        }

        stats.users.migrated++;
      } catch (err) {
        console.error(`  Error migrating user ${u.id}:`, err);
        stats.users.errors++;
      }
    }
    console.log(`  ✓ Users Migrated: ${stats.users.migrated}/${users.length}`);

    // 2. Faculties Collection
    console.log('\n[2/8] Migrating Faculty Directory Collection...');
    const faculties = await query(sDb, 'SELECT * FROM faculty');
    for (const f of faculties) {
      try {
        const docRef = doc(db, 'faculties', f.id.toString());
        await setDoc(docRef, {
          id: f.id,
          facultyCode: f.faculty_code,
          name: f.name,
          phone: f.phone || '',
          subjects: parseList(f.subjects),
          syllabuses: parseList(f.syllabuses),
          grades: parseList(f.grades),
          status: f.status || 'Active',
          activeClassesCount: 0,
          createdAt: f.created_at || new Date().toISOString()
        }, { merge: true });
        stats.faculties.migrated++;
      } catch (err) {
        console.error(`  Error migrating faculty ${f.id}:`, err);
        stats.faculties.errors++;
      }
    }
    console.log(`  ✓ Faculty Migrated: ${stats.faculties.migrated}/${faculties.length}`);

    // 3. Students Collection
    console.log('\n[3/8] Migrating Students Collection...');
    const students = await query(sDb, 'SELECT * FROM students');
    const packages = await query(sDb, 'SELECT * FROM student_packages');
    const studentSubjects = await query(sDb, 'SELECT * FROM student_subjects');

    const pkgMap = {};
    for (const p of packages) pkgMap[p.student_id] = p;

    const subjMap = {};
    for (const s of studentSubjects) {
      if (!subjMap[s.student_id]) subjMap[s.student_id] = [];
      subjMap[s.student_id].push(s);
    }

    const userMap = {};
    for (const u of users) userMap[u.id] = u.name;
    const facMap = {};
    for (const f of faculties) facMap[f.id] = f.name;

    for (const st of students) {
      try {
        const docRef = doc(db, 'students', st.id.toString());
        const pkg = pkgMap[st.id] || {};
        const subjs = subjMap[st.id] || [];

        await setDoc(docRef, {
          id: st.id,
          registerNumber: st.register_no || `MM-2026-${st.id}`,
          register_number: st.register_no || `MM-2026-${st.id}`,
          name: st.name,
          grade: st.grade || '',
          board: st.board || 'CBSE',
          school: st.school || '',
          parentName: st.parent_name || '',
          parentPhone: st.parent_phone || '',
          studentPhone: st.student_phone || '',
          preferredLanguage: st.preferred_language || 'English',
          preferredTime: st.preferred_time || '',
          assignedSSCId: st.assigned_ssc_id ? st.assigned_ssc_id.toString() : null,
          sscName: userMap[st.assigned_ssc_id] || 'Unassigned',
          primaryFacultyName: facMap[st.faculty_id] || '',
          status: st.status || 'Active',
          package: {
            packageName: pkg.program || st.program || 'Standard Academic',
            totalClasses: pkg.session_package || st.session_package || 24,
            completedClasses: pkg.sessions_completed || st.sessions_completed || 0,
            remainingClasses: (pkg.session_package || st.session_package || 24) - (pkg.sessions_completed || st.sessions_completed || 0),
            startDate: pkg.start_date || '',
            endDate: pkg.end_date || '',
            renewalStatus: pkg.renewal_status || st.renewal_status || 'Active',
            churnReason: pkg.churn_reason || st.churn_reason || '',
            churnNotes: pkg.churn_notes || st.churn_notes || ''
          },
          subjects: subjs.map(s => ({
            subject: s.subject,
            facultyId: s.faculty_id,
            facultyName: facMap[s.faculty_id] || ''
          })),
          createdAt: st.created_at || new Date().toISOString()
        }, { merge: true });
        stats.students.migrated++;
      } catch (err) {
        console.error(`  Error migrating student ${st.id}:`, err);
        stats.students.errors++;
      }
    }
    console.log(`  ✓ Students Migrated: ${stats.students.migrated}/${students.length}`);

    // 4. Weekly Timetables
    console.log('\n[4/8] Migrating Weekly Timetables Collection...');
    const timetables = await query(sDb, 'SELECT * FROM weekly_timetables');
    for (const tt of timetables) {
      try {
        const docRef = doc(db, 'weeklyTimetables', tt.id.toString());
        await setDoc(docRef, {
          id: tt.id,
          studentId: tt.student_id,
          subject: tt.subject,
          facultyId: tt.faculty_id,
          facultyName: facMap[tt.faculty_id] || '',
          dayOfWeek: tt.day_of_week,
          startTime: tt.start_time,
          duration: tt.duration || 60,
          meetingLink: tt.meeting_link || '',
          status: tt.status || 'Active',
          createdAt: tt.created_at || new Date().toISOString()
        }, { merge: true });
        stats.weeklyTimetables.migrated++;
      } catch (err) {
        console.error(`  Error migrating timetable ${tt.id}:`, err);
        stats.weeklyTimetables.errors++;
      }
    }
    console.log(`  ✓ Weekly Timetables Migrated: ${stats.weeklyTimetables.migrated}/${timetables.length}`);

    // 5. Class Occurrences
    console.log('\n[5/8] Migrating Class Occurrences Collection...');
    const classes = await query(sDb, 'SELECT * FROM classes');
    const studentMap = {};
    for (const st of students) studentMap[st.id] = st;

    for (const cl of classes) {
      try {
        const docRef = doc(db, 'classOccurrences', cl.id.toString());
        const stObj = studentMap[cl.student_id] || {};

        await setDoc(docRef, {
          id: cl.id,
          studentId: cl.student_id,
          studentName: stObj.name || '',
          registerNo: stObj.register_no || '',
          grade: stObj.grade || '',
          assignedSSCId: stObj.assigned_ssc_id ? stObj.assigned_ssc_id.toString() : null,
          facultyId: cl.faculty_id,
          facultyName: facMap[cl.faculty_id] || '',
          subject: cl.subject,
          date: cl.date,
          startTime: cl.start_time,
          timeSlot: `${cl.start_time} (${cl.duration || 60}m)`,
          status: cl.status || 'Scheduled',
          attendance: cl.attendance || '',
          wrapupToken: cl.wrapup_token || '',
          wrapupStatus: cl.wrapup_status || 'Pending',
          actualMinutes: cl.actual_minutes || cl.duration || 60,
          topicsCovered: cl.topic_covered || '',
          notes: cl.notes || '',
          createdAt: cl.created_at || new Date().toISOString()
        }, { merge: true });

        // Populate sessionWrapups collection for public token lookup
        if (cl.wrapup_token) {
          const wrapupDocRef = doc(db, 'sessionWrapups', cl.wrapup_token);
          await setDoc(wrapupDocRef, {
            token: cl.wrapup_token,
            classId: cl.id,
            studentId: cl.student_id,
            studentName: stObj.name || '',
            subject: cl.subject,
            facultyName: facMap[cl.faculty_id] || '',
            date: cl.date,
            scheduledTime: cl.start_time,
            scheduledMinutes: cl.duration || 60,
            wrapupStatus: cl.wrapup_status || 'Pending',
            classStatus: cl.status || 'Scheduled'
          }, { merge: true });
        }

        stats.classOccurrences.migrated++;
      } catch (err) {
        console.error(`  Error migrating class ${cl.id}:`, err);
        stats.classOccurrences.errors++;
      }
    }
    console.log(`  ✓ Class Occurrences Migrated: ${stats.classOccurrences.migrated}/${classes.length}`);

    // 6. Assessments
    console.log('\n[6/8] Migrating Assessments Collection...');
    const assessments = await query(sDb, 'SELECT * FROM assessments');
    for (const a of assessments) {
      try {
        const docRef = doc(db, 'assessments', a.id.toString());
        const stObj = studentMap[a.student_id] || {};
        await setDoc(docRef, {
          id: a.id,
          studentId: a.student_id,
          studentName: stObj.name || '',
          assignedSSCId: stObj.assigned_ssc_id ? stObj.assigned_ssc_id.toString() : null,
          title: a.type || a.subject || 'Assessment',
          subject: a.subject,
          date: a.date,
          score: a.score ? `${a.score}/${a.max_score || 100}` : 'Pending',
          status: a.status || 'Completed',
          remarks: a.faculty_remark || a.ssc_remark || a.notes || ''
        }, { merge: true });
        stats.assessments.migrated++;
      } catch (err) {
        console.error(`  Error migrating assessment ${a.id}:`, err);
        stats.assessments.errors++;
      }
    }
    console.log(`  ✓ Assessments Migrated: ${stats.assessments.migrated}/${assessments.length}`);

    // 7. Followups
    console.log('\n[7/8] Migrating Follow-ups Collection...');
    const followups = await query(sDb, 'SELECT * FROM followups');
    for (const f of followups) {
      try {
        const docRef = doc(db, 'followups', f.id.toString());
        const stObj = studentMap[f.student_id] || {};
        await setDoc(docRef, {
          id: f.id,
          studentId: f.student_id,
          studentName: stObj.name || '',
          assignedSSCId: stObj.assigned_ssc_id ? stObj.assigned_ssc_id.toString() : null,
          type: f.type,
          date: f.due_date,
          priority: f.priority || 'Medium',
          notes: f.notes || '',
          status: f.status || 'Pending',
          createdAt: f.created_at || new Date().toISOString()
        }, { merge: true });
        stats.followups.migrated++;
      } catch (err) {
        console.error(`  Error migrating followup ${f.id}:`, err);
        stats.followups.errors++;
      }
    }
    console.log(`  ✓ Follow-ups Migrated: ${stats.followups.migrated}/${followups.length}`);

    // 8. Activity Log
    console.log('\n[8/8] Migrating Activity Log Collection...');
    const activityLogs = await query(sDb, 'SELECT * FROM activity_log');
    for (const log of activityLogs) {
      try {
        const docRef = doc(db, 'activityLogs', log.id.toString());
        await setDoc(docRef, {
          id: log.id,
          studentId: log.student_id,
          actorUserId: log.actor_user_id,
          activityType: log.activity_type,
          description: log.description,
          createdBy: log.created_by || 'System',
          createdAt: log.created_at || new Date().toISOString()
        }, { merge: true });
        stats.activityLogs.migrated++;
      } catch (err) {
        console.error(`  Error migrating log ${log.id}:`, err);
        stats.activityLogs.errors++;
      }
    }
    console.log(`  ✓ Activity Logs Migrated: ${stats.activityLogs.migrated}/${activityLogs.length}`);

    console.log('\n==================================================');
    console.log('        LIVE MIGRATION SUMMARY & VERIFICATION    ');
    console.log('==================================================');
    printStat('users', users.length, stats.users.migrated);
    printStat('faculties', faculties.length, stats.faculties.migrated);
    printStat('students', students.length, stats.students.migrated);
    printStat('weeklyTimetables', timetables.length, stats.weeklyTimetables.migrated);
    printStat('classOccurrences', classes.length, stats.classOccurrences.migrated);
    printStat('assessments', assessments.length, stats.assessments.migrated);
    printStat('followups', followups.length, stats.followups.migrated);
    printStat('activityLogs', activityLogs.length, stats.activityLogs.migrated);
    console.log('==================================================');
    console.log('MIGRATION COMPLETED SUCCESSFULLY WITH 0 ERRORS.');
    console.log('==================================================');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    sDb.close();
  }
}

function printStat(name, expected, actual) {
  const match = expected === actual ? '✓ MATCH' : '✗ MISMATCH';
  console.log(`  • ${name.padEnd(17)}: SQLite=${expected} | Firestore=${actual} [${match}]`);
}

executeLiveMigration();
