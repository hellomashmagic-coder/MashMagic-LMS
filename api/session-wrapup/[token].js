import admin from 'firebase-admin';

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
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const db = admin.firestore();
  const wrapupRef = db.collection('sessionWrapups').doc(token);

  if (req.method === 'GET') {
    try {
      const doc = await wrapupRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Invalid or expired wrap-up link' });
      }
      return res.status(200).json(doc.data());
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const doc = await wrapupRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Invalid or expired wrap-up link' });
      }

      const sessionData = doc.data();
      const {
        status,
        actualMinutes,
        topicsCovered,
        studentEngagement,
        homeworkAssigned,
        notes
      } = req.body;

      const updatedWrapup = {
        ...sessionData,
        wrapupStatus: 'Submitted',
        classStatus: status || 'Completed',
        actualMinutes: parseInt(actualMinutes || sessionData.scheduledMinutes || 60, 10),
        topicsCovered: topicsCovered || '',
        studentEngagement: studentEngagement || 'Good',
        homeworkAssigned: homeworkAssigned || '',
        notes: notes || '',
        submittedAt: new Date().toISOString()
      };

      await wrapupRef.set(updatedWrapup, { merge: true });

      // Update class occurrence if classId exists
      if (sessionData.classId) {
        await db.collection('classOccurrences').doc(sessionData.classId).set({
          wrapupStatus: 'Submitted',
          status: status || 'Completed',
          actualMinutes: parseInt(actualMinutes || sessionData.scheduledMinutes || 60, 10),
          topicsCovered: topicsCovered || '',
          notes: notes || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      return res.status(200).json({
        success: true,
        message: 'Wrap-up report submitted successfully',
        data: updatedWrapup
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
