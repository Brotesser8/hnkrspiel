/**
 * Pure data adapters and game rules for RIFT. No UI, network or browser dependencies.
 * External APIs: USGS GeoJSON summary and NASA EONET v3 events.
 */
const EARTH_RADIUS_KM = 6371.0088;
const finite = n => typeof n === "number" && Number.isFinite(n);
const clip = (n, low, high) => Math.max(low, Math.min(high, n));
export const CATEGORY = Object.freeze({
  quake: { label: "Erdbeben", color: "#ff765e", icon: "◈" },
  wildfire: { label: "Waldbrand", color: "#ffa66a", icon: "✳" },
  storm: { label: "Sturm", color: "#76d8f6", icon: "◎" },
  volcano: { label: "Vulkan", color: "#cf9cff", icon: "▲" }
});
export function normalizeUSGS(json) {
  if (!json || !Array.isArray(json.features)) throw new Error("Ungültige USGS-Antwort");
  return json.features.map(feature => {
    const geo = feature?.geometry?.coordinates, props = feature?.properties || {};
    const [lng, lat, depth] = Array.isArray(geo) ? geo : [];
    if (!finite(lat) || !finite(lng) || !finite(props.mag) ||
        !finite(props.time) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return {
      id: "usgs:" + String(feature.id || props.code || props.time),
      source: "USGS", type: "quake", lat, lng,
      title: String(props.place || "Unbekannte Region").slice(0, 180),
      magnitude: Math.round(props.mag * 10) / 10,
      depth: finite(depth) ? Math.round(depth * 10) / 10 : null,
      time: props.time,
      url: typeof props.url === "string" && props.url.startsWith("https://earthquake.usgs.gov/") ? props.url : "",
      tsunami: props.tsunami === 1
    };
  }).filter(Boolean).sort((a, b) => b.time - a.time);
}
function eonetCategory(categories) {
  const names = Array.isArray(categories) ? categories.map(item => String(item?.id || "").toLowerCase()) : [];
  if (names.includes("wildfires")) return "wildfire";
  if (names.includes("severestorms")) return "storm";
  if (names.includes("volcanoes")) return "volcano";
  return null;
}
export function normalizeEONET(json) {
  if (!json || !Array.isArray(json.events)) throw new Error("Ungültige NASA-Antwort");
  return json.events.map(event => {
    const type = eonetCategory(event.categories);
    if (!type) return null;
    const points = Array.isArray(event.geometry) ? event.geometry.filter(item =>
      item.type === "Point" && Array.isArray(item.coordinates) && item.coordinates.length >= 2 &&
      finite(item.coordinates[0]) && finite(item.coordinates[1])) : [];
    if (!points.length) return null;
    const geometry = points[points.length - 1];
    const [lng, lat] = geometry.coordinates;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const time = Date.parse(geometry.date || "");
    return {
      id: "nasa:" + String(event.id || event.title),
      source: "NASA EONET", type, lat, lng,
      title: String(event.title || "Naturereignis").slice(0, 180),
      magnitude: null, depth: null,
      time: finite(time) ? time : 0,
      url: /^https:\/\/eonet\.gsfc\.nasa\.gov\//.test(event.link || "") ? event.link : "",
      tsunami: false
    };
  }).filter(Boolean).sort((a, b) => b.time - a.time);
}
export function haversineKm(a, b) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(finite)) return NaN;
  const toRad = n => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(clip(h, 0, 1)), Math.sqrt(1 - clip(h, 0, 1)));
}
export function scoreGuess(distanceKm, hints = 0) {
  if (!finite(distanceKm) || distanceKm < 0) return 0;
  // Exponential decay gives 5,000 for a perfect hit, about 2,500 at 1,180km.
  const base = Math.round(5000 * Math.exp(-distanceKm / 1700));
  return clip(base - Math.max(0, Math.floor(hints)) * 700, 0, 5000);
}
export function regionHint(place) {
  const text = String(place || "").trim();
  const segments = text.split(",").map(s => s.trim()).filter(Boolean);
  // Most USGS locations are "N km E of City, Country"; show country, not precise site.
  if (segments.length >= 2) return segments.slice(-1)[0];
  return text.replace(/^\d+(?:[.,]\d+)?\s*km\s+(?:N|S|E|W|NNE|ENE|ESE|SSE|SSW|WSW|WNW|NNW|NE|NW|SE|SW)\s+of\s+/i, "")
    .replace(/^(?:north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+(?:the\s+)?/i, "")
    || "Unbekannte Region";
}
export function hemisphereHint(q) {
  return (q.lat >= 0 ? "Nordhalbkugel" : "Südhalbkugel") + " · " +
    (q.lng >= 0 ? "östliche Länge" : "westliche Länge");
}
export function pickMissions(quakes, count = 5, seed = 0) {
  // Prefer reasonably large quakes, but rotate the pool for replay variety.
  // A seed keeps the choices repeatable in tests.
  const unique = new Map();
  quakes.filter(e => e.type === "quake" && finite(e.magnitude) && e.magnitude >= 4.5 &&
    typeof e.title === "string" && finite(e.lat) && finite(e.lng)).forEach(e => unique.set(e.id, e));
  const pool = [...unique.values()].sort((a, b) => b.magnitude - a.magnitude || b.time - a.time);
  const eligible = pool.slice(0, Math.max(count, Math.ceil(pool.length * .8)));
  const start = eligible.length ? Math.abs(Math.trunc(seed || 0)) % eligible.length : 0;
  const candidates = [...eligible.slice(start), ...eligible.slice(0, start), ...pool.slice(eligible.length)];
  const selected = [];
  for (const minDistance of [2300, 1100, 0]) {
    for (const q of candidates) {
      if (selected.length >= count) break;
      if (!selected.some(s => s.id === q.id) && selected.every(s => haversineKm(s, q) >= minDistance)) selected.push(q);
    }
    if (selected.length >= count) break;
  }
  return selected.slice(0, count);
}
export function formatAge(ms, now = Date.now()) {
  if (!finite(ms) || ms <= 0) return "Zeit unbekannt";
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return "vor " + min + " Min.";
  const hours = Math.floor(min / 60);
  if (hours < 24) return "vor " + hours + " Std.";
  const days = Math.floor(hours / 24);
  return "vor " + days + (days === 1 ? " Tag" : " Tagen");
}
export function rankLabel(score) {
  if (score >= 4200) return "SEISMIC LEGEND";
  if (score >= 2700) return "MASTER TRACKER";
  if (score >= 1300) return "FIELD AGENT";
  return "ROOKIE EXPLORER";
}
