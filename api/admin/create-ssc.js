import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // Verify caller is Academic Head
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'ACADEMIC_HEAD') {
      return res.status(403).json({ error: 'Forbidden: caller is not Academic Head' });
    }

    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name' });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Store user document in Firestore
    const sscData = {
      uid: userRecord.uid,
      name,
      email,
      phone: phone || '',
      role: 'SSC',
      status: 'Active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(sscData);

    return res.status(200).json({
      success: true,
      message: 'SSC account created successfully',
      user: sscData
    });
  } catch (error) {
    console.error('Create SSC API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
