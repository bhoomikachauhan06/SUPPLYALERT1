/**
 * DrishtiFlow — Upload Service
 * ===============================
 * Handles CSV file uploads to Firebase Storage.
 */

const { storage, db } = require("../config/firebase.config");
const config = require("../config/app.config");
const { parse } = require("csv-parse/sync");

class UploadService {
  /**
   * Process and store a CSV upload.
   */
  async processCSVUpload(userId, file) {
    const uploadRecord = {
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      status: "PROCESSING",
      createdAt: new Date().toISOString(),
    };

    // Parse CSV
    let records;
    try {
      records = parse(file.buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      uploadRecord.rowCount = records.length;
    } catch (error) {
      uploadRecord.status = "FAILED";
      uploadRecord.error = error.message;

      if (db) {
        await db.collection(config.collections.uploads).add(uploadRecord);
      }

      throw Object.assign(new Error(`CSV parsing failed: ${error.message}`), {
        statusCode: 400,
      });
    }

    // Upload to Firebase Storage
    let storageUrl = null;
    if (storage) {
      try {
        const bucket = storage.bucket();
        const fileName = `uploads/${userId}/${Date.now()}_${file.originalname}`;
        const fileRef = bucket.file(fileName);

        await fileRef.save(file.buffer, {
          metadata: { contentType: file.mimetype },
        });

        const [url] = await fileRef.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        storageUrl = url;
      } catch (error) {
        console.error("Storage upload failed:", error.message);
      }
    }

    uploadRecord.storageUrl = storageUrl;
    uploadRecord.status = "COMPLETED";
    uploadRecord.processedAt = new Date().toISOString();

    // Save upload record
    if (!db) throw new Error("Database not initialized");
    
    const docRef = await db.collection(config.collections.uploads).add(uploadRecord);

    return {
      id: docRef.id,
      ...uploadRecord,
      records,
    };
  }

  /**
   * Get upload history for a user.
   */
  async getUploadHistory(userId, { page = 1, limit = 20 } = {}) {
    if (!db) throw new Error("Database not initialized");

    const offset = (page - 1) * limit;
    const snapshot = await db
      .collection(config.collections.uploads)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const uploads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { uploads, page, limit };
  }
}

module.exports = new UploadService();
