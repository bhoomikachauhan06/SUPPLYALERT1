import { NextResponse } from "next/server";

// ── Mock Signal Data ──────────────────────────────────
const MOCK_SIGNALS = {
  weather: [
    { id: "W001", type: "typhoon",   region: "South China Sea",    severity: 8.5, affected: ["Shanghai", "Hong Kong", "Guangzhou"], eta_days: 2 },
    { id: "W002", type: "storm",     region: "North Atlantic",      severity: 5.2, affected: ["Rotterdam", "Hamburg"],               eta_days: 4 },
    { id: "W003", type: "fog",       region: "English Channel",     severity: 3.8, affected: ["Southampton", "Le Havre"],            eta_days: 1 },
    { id: "W004", type: "hurricane", region: "Gulf of Mexico",      severity: 7.1, affected: ["Houston", "New Orleans"],             eta_days: 5 },
  ],
  geopolitical: [
    { id: "G001", type: "conflict",  region: "Eastern Europe",   risk_score: 7.2, affected_routes: ["Rotterdam-Odessa", "Hamburg-Kyiv"] },
    { id: "G002", type: "sanctions", region: "Middle East",       risk_score: 6.5, affected_routes: ["Suez Canal", "Red Sea"] },
    { id: "G003", type: "strikes",   region: "Western Europe",    risk_score: 4.8, affected_routes: ["French Ports", "German Ports"] },
  ],
  port_congestion: [
    { port: "Rotterdam",    congestion_index: 8.1, avg_wait_hours: 48, vessels_queued: 24 },
    { port: "Shanghai",     congestion_index: 7.4, avg_wait_hours: 36, vessels_queued: 18 },
    { port: "Los Angeles",  congestion_index: 6.9, avg_wait_hours: 28, vessels_queued: 12 },
    { port: "Mumbai",       congestion_index: 6.8, avg_wait_hours: 32, vessels_queued: 15 },
    { port: "Singapore",    congestion_index: 4.2, avg_wait_hours: 12, vessels_queued:  6 },
  ],
  overall_index: 72.4,
  last_updated: new Date().toISOString(),
  source: "demo",
};

export async function GET() {
  const weatherKey = process.env.OPENWEATHERMAP_API_KEY;
  const newsKey    = process.env.NEWSDATA_API_KEY;

  if (weatherKey && newsKey) {
    try {
      // Try fetching real weather for key ports
      const ports = [
        { name: "Shanghai",    lat: 31.2304, lon: 121.4737 },
        { name: "Rotterdam",   lat: 51.9244, lon:   4.4777 },
        { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
        { name: "Singapore",   lat:  1.3521, lon: 103.8198 },
      ];

      const weatherData = await Promise.all(
        ports.map(async (p) => {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${p.lat}&lon=${p.lon}&appid=${weatherKey}&units=metric`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) throw new Error("Weather API error");
          const d = await res.json();
          return {
            port: p.name,
            condition: d.weather[0].main,
            description: d.weather[0].description,
            wind_speed: d.wind.speed,
            severity: Math.min((d.wind.speed / 30) * 10, 10),
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: { ...MOCK_SIGNALS, weather_live: weatherData, source: "live" },
        timestamp: Date.now(),
      });
    } catch {
      // Fall through to demo
    }
  }

  return NextResponse.json({
    success: true,
    data: MOCK_SIGNALS,
    timestamp: Date.now(),
  });
}
