/**
 * Test script for WeatherService
 */
const weatherService = require("./backend/services/weather.service");

async function testWeather() {
  console.log("🧪 Testing Weather Service (Open-Meteo)...");
  
  // Test with Mumbai coordinates
  const lat = 19.0760;
  const lng = 72.8777;
  
  try {
    const score = await weatherService.getWeatherSeverity(lat, lng);
    console.log(`✅ Success! Weather Risk Score for Mumbai: ${score}/10`);
    
    // Test with a location that might have different weather (e.g. Reykjavik)
    const score2 = await weatherService.getWeatherSeverity(64.1466, -21.9426);
    console.log(`✅ Success! Weather Risk Score for Reykjavik: ${score2}/10`);
    
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  }
}

testWeather();
