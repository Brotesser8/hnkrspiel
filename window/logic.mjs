export const ACTIVITIES = {
  walk: { label: "Spazieren", ideal: [10, 24], rain: 0.62, wind: 1.1, heat: 2.2, aqi: 1, daylight: 2 },
  run: { label: "Joggen", ideal: [5, 19], rain: 0.62, wind: 0.95, heat: 3.4, aqi: 1.6, daylight: 2 },
  bike: { label: "Velofahren", ideal: [9, 24], rain: 0.95, wind: 2, heat: 2.5, aqi: 1.2, daylight: 4 },
  terrace: { label: "Draussen sitzen", ideal: [16, 27], rain: 1.05, wind: 1.45, heat: 2, aqi: 1, daylight: 22 }
};

const number = value => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

export function buildHours(weather, air = null) {
  if (!weather || !weather.hourly || !Array.isArray(weather.hourly.time)) {
    throw new Error("Die Wetterdaten enthalten keine Stundenprognose.");
  }
  const w = weather.hourly;
  const aq = air && air.hourly && Array.isArray(air.hourly.time) ? air.hourly : null;
  const aqIndex = new Map((aq?.time || []).map((time, index) => [time, index]));
  // The API supplies local ISO times. Compare them as strings rather than
  // parsing them as the visitor's (potentially different) browser timezone.
  const nowHour = typeof weather.current?.time === "string"
    ? weather.current.time.slice(0, 13)
    : w.time[0]?.slice(0, 13) || "";
  return w.time.map((time, i) => {
    const ai = aqIndex.get(time);
    return {
      time,
      day: time.slice(0, 10),
      hour: Number(time.slice(11, 13)),
      temp: number(w.temperature_2m?.[i]),
      feels: number(w.apparent_temperature?.[i]),
      rain: number(w.precipitation_probability?.[i]),
      mm: number(w.precipitation?.[i]),
      wind: number(w.wind_speed_10m?.[i]),
      code: number(w.weather_code?.[i]),
      isDay: number(w.is_day?.[i]),
      cloud: number(w.cloud_cover?.[i]),
      aqi: ai === undefined ? null : number(aq.us_aqi?.[ai]),
      uv: ai === undefined ? null : number(aq.uv_index?.[ai])
    };
  }).filter(hour => hour.time.slice(0, 13) >= nowHour && hour.temp !== null).slice(0, 48);
}

export function scoreHour(hour, activity = "walk") {
  const a = ACTIVITIES[activity] || ACTIVITIES.walk;
  let score = 100;
  const felt = hour.feels ?? hour.temp;
  if (felt !== null && felt !== undefined) {
    if (felt < a.ideal[0]) score -= (a.ideal[0] - felt) * 2.4;
    if (felt > a.ideal[1]) score -= (felt - a.ideal[1]) * a.heat;
  }
  if (hour.rain !== null) score -= hour.rain * a.rain * 0.55;
  if (hour.mm !== null) score -= Math.min(24, hour.mm * 6) * a.rain;
  if (hour.wind !== null) score -= Math.max(0, hour.wind - 12) * a.wind * 0.65;
  if (hour.aqi !== null) {
    if (hour.aqi > 50) score -= Math.min(25, (hour.aqi - 50) * 0.27) * a.aqi;
    if (hour.aqi > 100) score -= Math.min(35, (hour.aqi - 100) * 0.4) * a.aqi;
  }
  if (hour.uv !== null && hour.uv > 5) score -= (hour.uv - 5) * (activity === "run" ? 2.5 : 1.8);
  if (hour.isDay === 0) score -= a.daylight;
  if ([95, 96, 99].includes(hour.code)) score -= 44;
  if ([65, 67, 75, 82, 86].includes(hour.code)) score -= 22;
  if (activity === "bike" && hour.code !== null && [56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(hour.code)) score -= 25;
  if (activity === "terrace" && hour.cloud !== null && hour.cloud > 85) score -= 5;
  return Math.round(clamp(score, 0, 100));
}

export function scoreLabel(score) {
  if (score >= 82) return "Ideal";
  if (score >= 65) return "Sehr gut";
  if (score >= 45) return "Machbar";
  return "Eher ungünstig";
}

export function aqiLabel(aqi) {
  if (aqi === null || aqi === undefined) return "Keine Daten";
  if (aqi <= 50) return "Gut";
  if (aqi <= 100) return "Mässig";
  if (aqi <= 150) return "Ungesund für empfindliche Personen";
  if (aqi <= 200) return "Ungesund";
  return "Sehr ungesund";
}

export function weatherLabel(code) {
  if (code === null || code === undefined) return "Wetterprognose";
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Leicht bewölkt";
  if (code === 3) return "Bewölkt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Nieselregen";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
}

export function windowsFor(hours, activity = "walk", duration = 2, day = "all") {
  const result = [];
  for (let i = 0; i <= hours.length - duration; i++) {
    const part = hours.slice(i, i + duration);
    if (part.some((h, j) => j && h.time <= part[j - 1].time)) continue;
    if (day !== "all" && part[0].day !== day) continue;
    const scores = part.map(h => scoreHour(h, activity));
    const average = scores.reduce((sum, score) => sum + score, 0) / duration;
    const score = Math.round(clamp(average - (Math.max(...scores) - Math.min(...scores)) * 0.12, 0, 100));
    result.push({ start: i, duration, score, from: part[0], to: part[part.length - 1] });
  }
  return result.sort((a, b) => b.score - a.score || a.start - b.start);
}

export function topWindows(hours, activity = "walk", duration = 2, day = "all", count = 3) {
  const ranked = windowsFor(hours, activity, duration, day);
  const selected = [];
  for (const candidate of ranked) {
    if (selected.every(pick => candidate.start >= pick.start + duration || pick.start >= candidate.start + duration)) {
      selected.push(candidate);
    }
    if (selected.length === count) break;
  }
  return selected;
}

export function windowInsights(hours, window) {
  if (!window) return [];
  const slice = hours.slice(window.start, window.start + window.duration);
  const mean = key => {
    const values = slice.map(h => h[key]).filter(v => v !== null && v !== undefined);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const rain = mean("rain"), wind = mean("wind"), felt = mean("feels") ?? mean("temp");
  const aqi = mean("aqi");
  const facts = [];
  if (rain !== null) facts.push(rain < 20 ? "Geringes Regenrisiko" : rain >= 55 ? "Erhöhtes Regenrisiko" : "Etwas Regen möglich");
  if (felt !== null) facts.push(Math.round(felt) + "° gefühlt");
  if (wind !== null && wind >= 25) facts.push("Kräftiger Wind");
  else if (wind !== null) facts.push("Wind " + Math.round(wind) + " km/h");
  if (aqi !== null) facts.push("Luft " + aqiLabel(Math.round(aqi)).toLowerCase());
  return facts;
}

export function windowTime(window) {
  if (!window) return "–";
  const start = window.from.time.slice(11, 16);
  const endHour = (window.to.hour + 1) % 24;
  return start + "–" + String(endHour).padStart(2, "0") + ":00";
}

export function dayLabel(day, compact = false) {
  if (!day) return "";
  const date = new Date(day + "T12:00:00Z");
  return new Intl.DateTimeFormat("de-CH", { timeZone: "UTC", weekday: compact ? "short" : "long", day: "numeric", month: "short" }).format(date);
}
