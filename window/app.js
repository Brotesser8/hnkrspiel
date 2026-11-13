import { ACTIVITIES, buildHours, scoreHour, scoreLabel, aqiLabel, weatherLabel, topWindows, windowInsights, windowTime, dayLabel } from "./logic.mjs";

const $ = id => document.getElementById(id);
const state = {
  location: { name: "Zürich", country: "Schweiz", latitude: 47.3769, longitude: 8.5417 },
  activity: "walk", duration: 2, day: "all",
  hours: [], weather: null, air: null, selected: null, loadedAt: 0, request: 0
};
const dom = {
  search: $("citySearch"), results: $("searchResults"), searchWrap: $("searchWrap"),
  locate: $("locateButton"), refresh: $("refreshButton"), status: $("statusMessage"),
  activity: $("activityChoices"), duration: $("durationChoices"), days: $("dayChoices"),
  bestLocation: $("bestLocation"), bestDay: $("recommendedDay"), bestTime: $("bestHeading"),
  bestScore: $("bestScore"), bestLabel: $("bestLabel"), insights: $("insights"),
  currentCity: $("currentCity"), currentTemperature: $("currentTemperature"),
  currentDescription: $("currentDescription"), currentFeels: $("currentFeels"),
  currentRain: $("currentRain"), currentWind: $("currentWind"), currentAqi: $("currentAqi"),
  currentAqiLabel: $("currentAqiLabel"), currentUv: $("currentUv"), currentIcon: $("currentIcon"),
  chart: $("chart"), viewport: $("chartViewport"), selected: $("selectedDetails"),
  alternatives: $("alternatives")
};
let loadController, searchController, searchTimer, searchItems = [], activeResult = -1;
const num = v => typeof v === "number" && Number.isFinite(v) ? v : null;
const value = (v, suffix = "") => num(v) === null ? "–" : String(Math.round(v)) + suffix;
const dayAfter = day => new Date(Date.parse(day + "T12:00:00Z") + 86400000).toISOString().slice(0, 10);
const placeLabel = loc => loc.name + (loc.country ? ", " + loc.country : "");

function announce(message, error = false) {
  dom.status.textContent = message;
  dom.status.classList.toggle("error", error);
}

async function fetchJson(url, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (data.error) throw new Error(data.reason || "API-Fehler");
    return data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

function setLoading(on) {
  dom.refresh.disabled = on;
  dom.refresh.classList.toggle("loading", on);
  dom.refresh.setAttribute("aria-busy", String(on));
}

function resetForecast() {
  dom.bestLocation.textContent = placeLabel(state.location);
  dom.bestDay.textContent = "–";
  dom.bestTime.textContent = "–";
  dom.bestScore.textContent = "–";
  dom.bestLabel.textContent = "Wird geladen …";
  dom.insights.replaceChildren();
  dom.currentCity.textContent = state.location.name.toLocaleUpperCase("de-CH");
  dom.currentTemperature.textContent = "–°";
  dom.currentDescription.textContent = "Wird geladen";
  dom.currentFeels.textContent = "Gefühlt –°";
  dom.currentRain.textContent = "– %";
  dom.currentWind.textContent = "– km/h";
  dom.currentAqi.textContent = "–";
  dom.currentAqiLabel.textContent = "Keine Daten";
  dom.currentUv.textContent = "–";
  dom.currentIcon.textContent = "◌";
  dom.chart.replaceChildren();
  dom.selected.textContent = "Prognose wird geladen …";
  dom.alternatives.textContent = "Prognose wird geladen …";
}

async function loadLocation(location, options = {}) {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
    announce("Ungültige Koordinaten.", true);
    return;
  }
  const request = ++state.request;
  loadController?.abort();
  loadController = new AbortController();
  state.location = location;
  state.selected = null;
  state.hours = [];
  state.weather = null;
  state.air = null;
  if (!options.silent) resetForecast();
  setLoading(true);
  announce("Lade Wetter- und Luftdaten für " + location.name + " …");
  const coords = "latitude=" + encodeURIComponent(location.latitude) + "&longitude=" + encodeURIComponent(location.longitude);
  const weatherUrl = "https://api.open-meteo.com/v1/forecast?" + coords +
    "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,weather_code,is_day,cloud_cover" +
    "&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto&forecast_days=4";
  const airUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?" + coords +
    "&hourly=us_aqi,uv_index&timezone=auto&forecast_days=4";
  const [w, a] = await Promise.allSettled([
    fetchJson(weatherUrl, loadController.signal),
    fetchJson(airUrl, loadController.signal)
  ]);
  if (request !== state.request) return;
  setLoading(false);
  if (w.status !== "fulfilled") {
    state.hours = [];
    resetForecast();
    dom.bestLabel.textContent = "Prognose nicht verfügbar";
    dom.currentDescription.textContent = "Keine Daten";
    dom.selected.textContent = "Bitte versuche es später erneut.";
    dom.alternatives.textContent = "Keine Prognose verfügbar.";
    announce("Die Wetter-API ist nicht erreichbar. Bitte später erneut aktualisieren.", true);
    return;
  }
  try {
    state.weather = w.value;
    state.air = a.status === "fulfilled" ? a.value : null;
    state.hours = buildHours(state.weather, state.air);
    if (state.hours.length < 3) throw new Error("Zu wenige Stunden vorhanden");
    state.loadedAt = Date.now();
    renderAll(true);
    const localClock = state.weather.current?.time?.slice(11, 16) || "–";
    const airNote = state.air ? "" : " · Ohne Luftqualitätsdaten";
    announce(placeLabel(state.location) + " · Stand " + localClock + " Ortszeit · Prognose, keine Messgarantie" + airNote);
  } catch (error) {
    console.error("WINDOW: ungültige Antwort", error);
    state.hours = [];
    resetForecast();
    dom.bestLabel.textContent = "Prognose nicht verfügbar";
    announce("Die API lieferte unvollständige Prognosedaten. Bitte erneut versuchen.", true);
  }
}

function getFilterDay() {
  if (state.day === "all" || !state.hours.length) return "all";
  const today = state.hours[0].day;
  return state.day === "today" ? today : dayAfter(today);
}

function setActiveButtons(container, key, current) {
  container.querySelectorAll("button").forEach(button => {
    const selected = button.dataset[key] === String(current);
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderAll(pickNew = false) {
  if (!state.hours.length) return;
  setActiveButtons(dom.activity, "activity", state.activity);
  setActiveButtons(dom.duration, "hours", state.duration);
  setActiveButtons(dom.days, "day", state.day);
  const picks = topWindows(state.hours, state.activity, state.duration, getFilterDay(), 4);
  const best = picks[0] || null;
  if (pickNew || state.selected === null || state.selected >= state.hours.length) {
    state.selected = best?.start ?? 0;
  }
  renderRecommendation(best);
  renderCurrent();
  renderChart(best);
  renderSelected();
  renderAlternatives(picks.slice(1));
}

function renderRecommendation(best) {
  dom.bestLocation.textContent = placeLabel(state.location);
  dom.insights.replaceChildren();
  if (!best) {
    dom.bestTime.textContent = "Kein Fenster";
    dom.bestDay.textContent = "–";
    dom.bestScore.textContent = "–";
    dom.bestLabel.textContent = "Für diesen Tag ist kein vollständiger Zeitraum verfügbar.";
    return;
  }
  dom.bestTime.textContent = windowTime(best);
  dom.bestDay.textContent = dayLabel(best.from.day, true);
  dom.bestScore.textContent = String(best.score);
  dom.bestLabel.textContent = best.score < 45 ? "Aktuell eher ungünstig – " + scoreLabel(best.score) :
    scoreLabel(best.score) + " für " + ACTIVITIES[state.activity].label.toLowerCase();
  windowInsights(state.hours, best).forEach(text => {
    const chip = document.createElement("span");
    chip.textContent = text;
    dom.insights.append(chip);
  });
}

function weatherSymbol(code, isDay) {
  if ([95, 96, 99].includes(code)) return "ϟ";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "☂";
  if ([45, 48].includes(code)) return "≋";
  if (code === 3) return "☁";
  if (code === 0) return isDay === 0 ? "☾" : "☀";
  return isDay === 0 ? "☾" : "◐";
}

function renderCurrent() {
  const current = state.weather?.current || {};
  const first = state.hours[0];
  const t = num(current.temperature_2m) ?? first.temp;
  const feels = num(current.apparent_temperature) ?? first.feels;
  const wind = num(current.wind_speed_10m) ?? first.wind;
  const code = num(current.weather_code) ?? first.code;
  dom.currentCity.textContent = state.location.name.toLocaleUpperCase("de-CH");
  dom.currentTemperature.textContent = value(t, "°");
  dom.currentFeels.textContent = "Gefühlt " + value(feels, "°");
  dom.currentDescription.textContent = weatherLabel(code);
  dom.currentIcon.textContent = weatherSymbol(code, first.isDay);
  dom.currentRain.textContent = value(first.rain, " %");
  dom.currentWind.textContent = value(wind, " km/h");
  dom.currentAqi.textContent = value(first.aqi);
  dom.currentAqiLabel.textContent = aqiLabel(first.aqi);
  dom.currentUv.textContent = value(first.uv);
}

function renderChart(best) {
  const scroll = dom.viewport.scrollLeft;
  const fragment = document.createDocumentFragment();
  const selectedDay = getFilterDay();
  for (let i = 0; i < state.hours.length; i++) {
    const hour = state.hours[i];
    const score = scoreHour(hour, state.activity);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chart-hour " + (score >= 75 ? "good" : score >= 45 ? "okay" : "poor");
    if (best && i >= best.start && i < best.start + best.duration) button.classList.add("in-best");
    if (i === state.selected) button.classList.add("selected");
    if (selectedDay !== "all" && hour.day !== selectedDay) button.style.opacity = ".28";
    button.setAttribute("aria-pressed", String(i === state.selected));
    button.setAttribute("aria-label", dayLabel(hour.day, true) + " " + hour.time.slice(11, 16) +
      ", Outdoor-Score " + score + " von 100");
    button.title = hour.time.slice(11, 16) + " · " + score + "/100 · " + weatherLabel(hour.code);
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.height = Math.max(5, score * 1.16) + "px";
    button.append(bar);
    if (hour.hour % 6 === 0 || i === 0) {
      const label = document.createElement("span");
      label.className = "hour-label";
      label.textContent = String(hour.hour).padStart(2, "0") + "h";
      button.append(label);
    }
    button.addEventListener("click", () => {
      state.selected = i;
      if (state.day !== "all" && hour.day !== getFilterDay()) state.day = "all";
      renderAll();
    });
    fragment.append(button);
  }
  dom.chart.replaceChildren(fragment);
  dom.viewport.scrollLeft = scroll;
}

function selectedStat(label, text) {
  const box = document.createElement("div");
  box.className = "selected-metric";
  const caption = document.createElement("small");
  caption.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = text;
  box.append(caption, strong);
  return box;
}

function renderSelected() {
  dom.selected.replaceChildren();
  const hour = state.hours[state.selected] || state.hours[0];
  if (!hour) return;
  const header = document.createElement("div");
  header.className = "selected-header";
  const main = document.createElement("strong");
  main.textContent = dayLabel(hour.day, true) + " · " + hour.time.slice(11, 16) + " Uhr";
  const caption = document.createElement("small");
  caption.textContent = weatherLabel(hour.code) + " · Score " + scoreHour(hour, state.activity) + "/100";
  header.append(main, caption);
  dom.selected.append(header,
    selectedStat("GEFÜHLT", value(hour.feels ?? hour.temp, "°C")),
    selectedStat("REGENRISIKO", value(hour.rain, " %")),
    selectedStat("WIND", value(hour.wind, " km/h")),
    selectedStat("LUFT (US-AQI)", value(hour.aqi))
  );
}

function renderAlternatives(picks) {
  dom.alternatives.replaceChildren();
  if (!picks.length) {
    const empty = document.createElement("div");
    empty.className = "alternative empty";
    empty.textContent = "Keine weiteren vollständigen Zeitfenster in dieser Auswahl.";
    dom.alternatives.append(empty);
    return;
  }
  for (const pick of picks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "alternative";
    button.setAttribute("aria-label", "Alternative " + dayLabel(pick.from.day, true) + ", " +
      windowTime(pick) + ", Score " + pick.score);
    const top = document.createElement("div");
    top.className = "alternative-top";
    const day = document.createElement("span");
    day.className = "alternative-day";
    day.textContent = dayLabel(pick.from.day, true).toLocaleUpperCase("de-CH");
    const badge = document.createElement("span");
    badge.className = "alternative-score" + (pick.score < 45 ? " low" : pick.score < 75 ? " medium" : "");
    badge.textContent = pick.score + "/100";
    top.append(day, badge);
    const timing = document.createElement("strong");
    timing.className = "alternative-time";
    timing.textContent = windowTime(pick);
    const info = document.createElement("span");
    info.className = "alternative-bottom";
    info.textContent = windowInsights(state.hours, pick).slice(0, 2).join(" · ") || scoreLabel(pick.score);
    button.append(top, timing, info);
    button.addEventListener("click", () => {
      state.selected = pick.start;
      renderAll();
      const tile = dom.chart.children[pick.start];
      if (tile) dom.viewport.scrollTo({ left: Math.max(0, tile.offsetLeft - dom.viewport.clientWidth / 2), behavior: "smooth" });
      $("timelineHeading").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    dom.alternatives.append(button);
  }
}

function hideSearch() {
  dom.results.hidden = true;
  dom.search.setAttribute("aria-expanded", "false");
  dom.search.removeAttribute("aria-activedescendant");
  activeResult = -1;
}

function showSearch(items) {
  searchItems = items;
  activeResult = -1;
  dom.results.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "search-message";
    empty.textContent = "Kein Ort gefunden. Probiere einen anderen Namen.";
    dom.results.append(empty);
  }
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.setAttribute("role", "option");
    button.id = "city-result-" + index;
    button.setAttribute("aria-selected", "false");
    const title = document.createElement("span");
    title.textContent = item.name + (item.admin1 && item.admin1 !== item.name ? ", " + item.admin1 : "");
    const country = document.createElement("small");
    country.textContent = item.country || "";
    button.append(title, country);
    button.addEventListener("click", () => selectPlace(item));
    dom.results.append(button);
  });
  dom.results.hidden = false;
  dom.search.setAttribute("aria-expanded", "true");
}

function selectPlace(item) {
  clearTimeout(searchTimer);
  searchController?.abort();
  dom.search.value = "";
  hideSearch();
  const latitude = Number(item.latitude), longitude = Number(item.longitude);
  loadLocation({ name: item.name, country: item.country || "", latitude, longitude });
}

async function runSearch(query) {
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  try {
    const url = "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(query) + "&count=6&language=de&format=json";
    const data = await fetchJson(url, controller.signal);
    if (controller !== searchController || dom.search.value.trim() !== query) return;
    showSearch((data.results || []).filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude)));
  } catch (error) {
    if (controller !== searchController || error.name === "AbortError") return;
    dom.results.replaceChildren();
    const note = document.createElement("div");
    note.className = "search-message";
    note.textContent = "Ortssuche gerade nicht verfügbar.";
    dom.results.append(note);
    dom.results.hidden = false;
    dom.search.setAttribute("aria-expanded", "true");
  }
}

dom.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchController?.abort();
  const query = dom.search.value.trim();
  if (query.length < 2) { hideSearch(); return; }
  searchTimer = setTimeout(() => runSearch(query), 350);
});
dom.search.addEventListener("keydown", event => {
  if (event.key === "Escape") { hideSearch(); return; }
  if (dom.results.hidden || !searchItems.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    activeResult = (activeResult + (event.key === "ArrowDown" ? 1 : -1) + searchItems.length) % searchItems.length;
    dom.results.querySelectorAll('[role="option"]').forEach((item, index) => {
      item.classList.toggle("active", index === activeResult);
      item.setAttribute("aria-selected", String(index === activeResult));
    });
    dom.search.setAttribute("aria-activedescendant", "city-result-" + activeResult);
  } else if (event.key === "Enter") {
    event.preventDefault();
    selectPlace(searchItems[Math.max(0, activeResult)]);
  }
});
document.addEventListener("click", event => {
  if (!dom.searchWrap.contains(event.target)) hideSearch();
});

dom.activity.addEventListener("click", event => {
  const button = event.target.closest("button[data-activity]");
  if (!button || !state.hours.length) return;
  state.activity = button.dataset.activity;
  renderAll(true);
});
dom.duration.addEventListener("click", event => {
  const button = event.target.closest("button[data-hours]");
  if (!button || !state.hours.length) return;
  state.duration = Number(button.dataset.hours);
  renderAll(true);
});
dom.days.addEventListener("click", event => {
  const button = event.target.closest("button[data-day]");
  if (!button || !state.hours.length) return;
  state.day = button.dataset.day;
  renderAll(true);
});
dom.refresh.addEventListener("click", () => loadLocation(state.location));
dom.locate.addEventListener("click", () => {
  if (!navigator.geolocation) { announce("Dein Browser unterstützt keine Standortbestimmung.", true); return; }
  dom.locate.disabled = true;
  announce("Warte auf deine Standortfreigabe …");
  navigator.geolocation.getCurrentPosition(
    position => {
      dom.locate.disabled = false;
      loadLocation({
        name: "Mein Standort", country: "",
        latitude: position.coords.latitude, longitude: position.coords.longitude
      });
    },
    error => {
      dom.locate.disabled = false;
      announce(error.code === 1 ? "Standortzugriff abgelehnt. Suche stattdessen einen Ort." :
        "Standort konnte nicht ermittelt werden. Versuche die Suche.", true);
    },
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
});
// Refresh only while the page is visible; avoid hammering free public APIs.
setInterval(() => {
  if (!document.hidden && state.loadedAt && Date.now() - state.loadedAt > 15 * 60 * 1000 && !dom.refresh.disabled) {
    loadLocation(state.location, { silent: true });
  }
}, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.loadedAt && Date.now() - state.loadedAt > 15 * 60 * 1000 && !dom.refresh.disabled) {
    loadLocation(state.location, { silent: true });
  }
});

resetForecast();
loadLocation(state.location);
