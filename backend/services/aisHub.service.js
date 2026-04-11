/**
 * DrishtiFlow — AISHub Vessel Tracking Service
 * ============================================
 * Fetches real-time ship positions and statuses from AISHub.
 */

const axios = require("axios");
const config = require("../config/app.config");

class AISHubService {
  constructor() {
    this.baseUrl = "https://data.aishub.net/ws.php";
    this.username = config.aisHub.username;
  }

  /**
   * Fetch real-time data for vessels with full parameter support.
   * @param {Object} options 
   * @param {Array<number>} options.mmsis 
   * @param {Array<number>} options.imos
   * @param {Object} options.bounds { latmin, latmax, lonmin, lonmax }
   * @returns {Promise<Array<Object>>}
   */
  async getVesselData({ mmsis = [], imos = [], bounds = {} } = {}) {
    if (!this.username || this.username === "YOUR_USERNAME_HERE") {
      console.warn("[AISHubService] Missing AISHUB_USERNAME. Skipping fetch.");
      return [];
    }

    try {
      const params = {
        username: this.username,
        format: config.aisHub.format || 1,
        output: config.aisHub.output || "json",
        compress: config.aisHub.compress || 0,
        interval: config.aisHub.interval || 0,
      };

      // Vessel identifiers
      if (mmsis.length > 0) params.mmsi = mmsis.join(",");
      if (imos.length > 0) params.imo = imos.join(",");

      // Geographic filters (Bounding Box)
      if (bounds.latmin) params.latmin = bounds.latmin;
      if (bounds.latmax) params.latmax = bounds.latmax;
      if (bounds.lonmin) params.lonmin = bounds.lonmin;
      if (bounds.lonmax) params.lonmax = bounds.lonmax;

      console.log(`[AISHubService] Fetching AIS data with params:`, {
        mmsis: mmsis.length,
        imos: imos.length,
        hasBounds: Object.keys(bounds).length > 0,
        compress: params.compress
      });
      
      const response = await axios.get(this.baseUrl, { params });
      let data = response.data;

      // Handle compression if enabled (Simplified: AISHub usually handles JSON encoding POST-compression)
      // Note: If compress=2, axios might already handle gzip if headers are set, 
      // but AISHub's direct binary stream might need manual handling if not standard.
      // For now we keep it simple as Node/Axios usually handles standard gzip.

      if (!Array.isArray(data) || data.length < 2) {
        console.warn("[AISHubService] Unexpected API response format:", typeof data);
        return [];
      }

      const errorCode = data[0];
      const vessels = data[1] || [];

      if (errorCode !== 0) {
        this._handleApiError(errorCode);
        return [];
      }

      return vessels;
    } catch (error) {
      console.error("[AISHubService] API request failed:", error.message);
      return [];
    }
  }

  /**
   * Map AISHub error codes to human-readable logs.
   */
  _handleApiError(code) {
    const errors = {
      1: "Invalid username",
      2: "Empty result",
      3: "Invalid format",
      4: "Invalid search parameters",
      5: "Limit exceeded",
    };
    console.error(`[AISHubService] API Error ${code}: ${errors[code] || "Unknown error"}`);
  }
}

module.exports = new AISHubService();
