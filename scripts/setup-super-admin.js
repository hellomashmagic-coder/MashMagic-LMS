import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc 
} from 'firebase/firestore';

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

const ADMIN_EMAIL = 'admin@mashmagic.com';
const ADMIN_PASS = 'AdminPassword123!';

async function setupSuperAdmin() {
  console.log('🚀 Starting Super Admin Provisioning for:', ADMIN_EMAIL);
  let userCred = null;

  try {
    userCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    console.log('✓ Existing Auth user logged in. UID:', userCred.user.uid);
  } catch (err) {
    console.log('Auth login failed, attempting to create new account...', err.message);
    try {
      userCred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
      console.log('✓ New Super Admin account created in Firebase Auth. UID:', userCred.user.uid);
    } catch (createErr) {
      console.error('❌ Failed to create auth user:', createErr);
      process.exit(1);
    }
  }

  const uid = userCred.user.uid;
  const userDocRef = doc(db, 'users', uid);

  await setDoc(userDocRef, {
    uid: uid,
    user_id: uid,
    email: ADMIN_EMAIL,
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    status: 'Active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  }, { merge: true });

  console.log('✓ Firestore user profile updated in users collection:', uid, '| role: SUPER_ADMIN');

  // Refresh auth ID token so Firestore rules pick up existing user doc
  await userCred.user.getIdToken(true);

  // Initialize Institution Settings (if security rules permit)
  try {
    await setDoc(doc(db, 'institutions', 'default'), {
      name: 'Mash Magic Academic LMS',
      code: 'MM-ACAD-2026',
      email: ADMIN_EMAIL,
      phone: '+91 98765 43210',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✓ Institution settings doc initialized');
  } catch (e) {
    console.warn('⚠️ Institution settings doc write skipped (security rules pending console publish):', e.message);
  }

  // Initialize Audit Log entry
  try {
    await setDoc(doc(db, 'auditLogs', `init_${Date.now()}`), {
      timestamp: new Date().toISOString(),
      performedByUid: uid,
      performedByEmail: ADMIN_EMAIL,
      performedByRole: 'SUPER_ADMIN',
      action: 'PROVISION_SUPER_ADMIN',
      targetType: 'USER',
      targetId: uid,
      details: { message: 'Super Admin provisioning script executed successfully' },
      createdAt: new Date().toISOString()
    });
    console.log('✓ Audit log entry created');
  } catch (e) {
    console.warn('⚠️ Audit log write skipped:', e.message);
  }

  console.log('🎉 Super Admin setup completed successfully!');
  process.exit(0);
}

setupSuperAdmin();
