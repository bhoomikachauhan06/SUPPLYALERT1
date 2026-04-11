/**
 * DrishtiFlow Backend — Firebase Configuration
 * ================================================
 * Initializes Firebase Admin SDK for server-side operations.
 * 
 * Provides:
 * - Firestore database access
 * - Firebase Auth verification
 * - Firebase Storage access
 */

const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

let firebaseApp;

function initializeFirebase() {
  if (firebaseApp) return firebaseApp;

  try {
    // Option 1: Use service account JSON file (recommended for production)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });
    }
    // Option 2: Use environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
    }
    // Option 3: Default credentials (for Cloud Run, etc.)
    else {
      firebaseApp = admin.initializeApp();
    }

    console.log("✅ Firebase Admin SDK initialized for " + process.env.FIREBASE_PROJECT_ID);
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    firebaseApp = null;
  }

  return firebaseApp;
}

// Initialize on import
initializeFirebase();

// Firestore
const db = firebaseApp ? admin.firestore() : null;

// Auth
const auth = firebaseApp ? admin.auth() : null;

// Storage
const storage = firebaseApp ? admin.storage() : null;

module.exports = {
  admin,
  db,
  auth,
  storage,
  initializeFirebase,
};
