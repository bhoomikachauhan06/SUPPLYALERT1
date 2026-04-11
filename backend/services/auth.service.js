/**
 * DrishtiFlow — Auth Service
 * ============================
 * Business logic for authentication & user management.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.AUTH_FLOW: Validate → Generate tokens → Set cookies → Return profile
 * - DIRECTIVES.SEPARATION_OF_CONCERNS: Service → logic only
 */

const { auth, db } = require("../config/firebase.config");
const config = require("../config/app.config");

class AuthService {
  /**
   * Register a new user.
   * Creates Firebase Auth user + Firestore profile.
   */
  async register({ email, name, password, role = "USER", company }) {
    if (!auth || !db) throw new Error("Firebase Service not initialized");

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims (role)
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create Firestore profile
    const userProfile = {
      email,
      name,
      role,
      company: company || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    await db
      .collection(config.collections.users)
      .doc(userRecord.uid)
      .set(userProfile);

    return {
      uid: userRecord.uid,
      ...userProfile,
    };
  }

  /**
   * Verify Firebase ID token and return/create user profile.
   * Called after client-side Firebase Auth login.
   */
  async verifyAndLogin(idToken) {
    if (!auth || !db) throw new Error("Firebase Service not initialized");

    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get or create user profile
    const userRef = db.collection(config.collections.users).doc(uid);
    const userDoc = await userRef.get();

    let userData;

    if (userDoc.exists) {
      userData = userDoc.data();
      // Update last login
      await userRef.update({
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Auto-create profile for new OAuth users
      userData = {
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split("@")[0],
        role: "USER",
        company: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await userRef.set(userData);
    }

    return {
      uid,
      ...userData,
    };
  }

  /**
   * Get user profile by UID.
   */
  async getUserProfile(uid) {
    if (!db) throw new Error("Firestore not initialized");

    const userDoc = await db
      .collection(config.collections.users)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    return { uid, ...userDoc.data() };
  }

  /**
   * Update user profile.
   */
  async updateProfile(uid, updates) {
    if (!db) throw new Error("Firestore not initialized");

    const allowed = ["name", "company"];
    const sanitized = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }
    sanitized.updatedAt = new Date().toISOString();

    await db
      .collection(config.collections.users)
      .doc(uid)
      .update(sanitized);

    return this.getUserProfile(uid);
  }

  /**
   * Update user role (admin only).
   */
  async updateRole(uid, role) {
    if (!auth || !db) throw new Error("Firebase Service not initialized");

    await auth.setCustomUserClaims(uid, { role });
    await db.collection(config.collections.users).doc(uid).update({
      role,
      updatedAt: new Date().toISOString(),
    });

    return { uid, role };
  }
}

module.exports = new AuthService();
