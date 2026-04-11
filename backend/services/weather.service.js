/**
 * DrishtiFlow — Weather Service (Open-Meteo)
 * ==========================================
 * Real-time meteorological risk assessment.
 */

const axios = require("axios");

class WeatherService {
  constructor() {
    this.baseUrl = "https://api.open-meteo.com/v1/forecast";
  }

  /**
   * Get weather severity score for a location.
   * @param {number} lat 
   * @param {number} lng 
   * @returns {Promise<number>} Score from 0.0 to 10.0
   */
  async getWeatherSeverity(lat, lng) {
    if (!lat || !lng) return 5.0; // Default to neutral if coords missing

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lng,
          current: "weather_code,wind_speed_10m",
          timezone: "auto"
        }
      });

      const current = response.data.current;
      if (!current) return 5.0;

      const code = current.weather_code;
      const severity = this._mapWmoCodeToSeverity(code);

      console.log(`[WeatherService] Lat: ${lat}, Lng: ${lng}, Code: ${code}, Severity: ${severity}`);
      return severity;
    } catch (error) {
      console.error("[WeatherService] Error fetching weather:", error.message);
      return 5.0; // Fallback to moderate risk
    }
  }

  /**
   * Internal mapping of WMO Weather Interpretation Codes (WW)
   * to internal 0-10 Risk Engine scale.
   * Ref: https://open-meteo.com/en/docs
   */
  _mapWmoCodeToSeverity(code) {
    // 0: Clear sky
    if (code === 0) return 0.0;
    
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    if ([1, 2, 3].includes(code)) return 2.0;

    // 45, 48: Fog and depositing rime fog
    if ([45, 48].includes(code)) return 5.0;

    // 51, 53, 55: Drizzle (Light, Moderate, Dense)
    if ([51, 53, 55].includes(code)) return 4.0;

    // 56, 57: Freezing Drizzle
    if ([56, 57].includes(code)) return 6.0;

    // 61, 63, 65: Rain (Slight, Moderate, Heavy)
    if (code === 61) return 5.5;
    if (code === 63) return 7.0;
    if (code === 65) return 8.5;

    // 66, 67: Freezing Rain
    if ([66, 67].includes(code)) return 9.0;

    // 71, 73, 75: Snow fall (Slight, Moderate, Heavy)
    if (code === 71) return 7.5;
    if (code === 73) return 8.5;
    if (code === 75) return 9.5;

    // 77: Snow grains
    if (code === 77) return 8.0;

    // 80, 81, 82: Rain showers (Slight, Moderate, Violent)
    if (code === 80) return 6.0;
    if (code === 81) return 7.5;
    if (code === 82) return 9.0;

    // 85, 86: Snow showers (Slight, Heavy)
    if (code === 85) return 8.0;
    if (code === 86) return 9.5;

    // 95, 96, 99: Thunderstorm (Slight, With Hail)
    if (code === 95) return 9.0;
    if ([96, 99].includes(code)) return 10.0;

    return 5.0; // Default
  }
}

module.exports = new WeatherService();
