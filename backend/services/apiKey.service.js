/**
 * DrishtiFlow — API Key Service
 * ==============================
 * Manages external API keys for data ingestion.
 * 
 * Scalability (CLAUDE.md):
 * - USES Firestore for persistent storage of hashed keys
 * - USES SHA-256 for one-way secure hashing
 */

const crypto = require("crypto");
const { db } = require("../config/firebase.config");
const config = require("../config/app.config");
const { logger } = require("../utils/logger");

class ApiKeyService {
  /**
   * Generate a new API key for a user.
   * Returns the raw key (only shown once) and saves the hash.
   */
  async createKey(userId, label = "Default Key") {
    if (!db) throw new Error("Firestore not initialized");

    // Generate a random 32-character key with prefix
    const rawKey = `df_${crypto.randomBytes(24).toString("hex")}`;
    const hashedKey = this._hashKey(rawKey);

    const keyData = {
      userId,
      label,
      hashedKey,
      prefix: rawKey.substring(0, 7), // "df_xxxx" for display
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      isActive: true,
    };

    const docRef = await db.collection(config.collections.apiKeys).add(keyData);

    return {
      id: docRef.id,
      rawKey, // IMPORTANT: Raw key returned only once
      ...keyData,
    };
  }

  /**
   * Validate a raw API key.
   * Returns the associated userId if valid.
   */
  async validateKey(rawKey) {
    if (!db) throw new Error("Firestore not initialized");

    const hashedKey = this._hashKey(rawKey);
    const snapshot = await db
      .collection(config.collections.apiKeys)
      .where("hashedKey", "==", hashedKey)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const keyDoc = snapshot.docs[0];
    const keyData = keyDoc.data();

    // Update last used timestamp (async)
    keyDoc.ref.update({ lastUsedAt: new Date().toISOString() }).catch(err => {
      console.error("Failed to update API key lastUsedAt:", err);
    });

    return {
      userId: keyData.userId,
      keyId: keyDoc.id,
    };
  }

  /**
   * List all keys for a user.
   */
  async listKeys(userId) {
    if (!db) throw new Error("Firestore not initialized");

    const snapshot = await db
      .collection(config.collections.apiKeys)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      hashedKey: undefined, // Never return hash to client
    }));
  }

  /**
   * Revoke (deactivate) an API key.
   */
  async revokeKey(keyId, userId) {
    if (!db) throw new Error("Firestore not initialized");

    const keyRef = db.collection(config.collections.apiKeys).doc(keyId);
    const doc = await keyRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
      throw new Error("API key not found or unauthorized");
    }

    await keyRef.update({ isActive: false, updatedAt: new Date().toISOString() });
    return { id: keyId, isActive: false };
  }

  /**
   * Internal hash function.
   */
  _hashKey(rawKey) {
    return crypto.createHash("sha256").update(rawKey).digest("hex");
  }
}

module.exports = new ApiKeyService();
