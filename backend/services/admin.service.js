/**
 * DrishtiFlow — Admin Service
 * ==============================
 * Admin-only operations: user management, usage monitoring.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.ROLE_ENGINE: SUPER_ADMIN permissions
 * - ORCHESTRATION.ANALYTICS_ENGINE: Metrics
 */

const { auth, db } = require("../config/firebase.config");
const config = require("../config/app.config");

class AdminService {
  /**
   * List all users (Admin only).
   */
  async listUsers({ page = 1, limit = 20 } = {}) {
    if (!db) throw new Error("Database not initialized");

    const offset = (page - 1) * limit;
    const snapshot = await db
      .collection(config.collections.users)
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const totalSnapshot = await db.collection(config.collections.users).count().get();

    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return { 
      users, 
      total: totalSnapshot.data().count,
      page: parseInt(page), 
      limit: parseInt(limit) 
    };
  }

  /**
   * Get platform-wide analytics.
   */
  async getPlatformStats() {
    if (!db) throw new Error("Database not initialized");

    const [usersSnap, shipmentsSnap, predictionsSnap, simulationsSnap, uploadsSnap] =
      await Promise.all([
        db.collection(config.collections.users).count().get(),
        db.collection(config.collections.shipments).count().get(),
        db.collection(config.collections.predictions).count().get(),
        db.collection(config.collections.simulations).count().get(),
        db.collection(config.collections.uploads).count().get(),
      ]);

    return {
      total_users: usersSnap.data().count,
      total_shipments: shipmentsSnap.data().count,
      total_predictions: predictionsSnap.data().count,
      total_simulations: simulationsSnap.data().count,
      total_uploads: uploadsSnap.data().count,
    };
  }

  /**
   * Get recent uploads across all users.
   */
  async getRecentUploads({ limit = 20 } = {}) {
    if (!db) throw new Error("Database not initialized");

    const snapshot = await db
      .collection(config.collections.uploads)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const uploads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { uploads };
  }

  /**
   * Delete a user (Admin only).
   */
  async deleteUser(uid) {
    if (!auth || !db) throw new Error("Firebase Service not initialized");

    await auth.deleteUser(uid);
    await db.collection(config.collections.users).doc(uid).delete();

    return { deleted: uid };
  }
}

module.exports = new AdminService();
