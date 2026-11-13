import { CATEGORY, normalizeUSGS, normalizeEONET, haversineKm, scoreGuess, pickMissions, regionHint, hemisphereHint, formatAge, rankLabel } from "./logic.mjs";

const $ = id => document.getElementById(id);
const dom = Object.fromEntries([
  "globe","mainStage","globeFallback","retryGlobe","mapStatus","coordinates",
  "exploreTab","gameTab","exploreConsole","huntConsole","quickPlay","rotateButton",
  "resetView","refreshButton","eventList","feedScroll","feedCount","feedHeading",
  "quakeCount","nasaCount","usgsState","nasaState","updatedAt","filters",
  "eventDetail","closeDetail","detailType","detailTitle","detailMagnitude",
  "detailDepth","detailDate","detailLink","largestMag","largestPlace",
  "lastAge","lastPlace","utcClock","soundButton","soundLabel","toast","gamePinHint",
  "exitHunt","startHunt","huntReady","personalBest","huntIntro","mission",
  "missionProgress","missionScore","roundTrack","signalIndex","missionRegion",
  "missionMagnitude","missionDepth","missionAge","missionActive","missionResult",
  "guessCoords","hintButton","clueBox","lockGuess","roundPoints","resultRank",
  "resultLocation","resultDistance","resultSource","nextMission","huntFinished",
  "finalScore","finalRank","playAgain","shareScore"
].map(id => [id, $(id)]));

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";
const NASA_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=250";
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
const state = {
  mode: "explore", filter: "all", events: [], quakes: [], nasa: [], selected: null,
  globe: null, autoRotate: !reducedMotion, lastUpdate: 0,
  game: { missions: [], index: 0, total: 0, hint: false, guess: null, status: "intro" },
  sound: false, best: loadBest()
};
let toastTimer, soundContext, updatePromise = null;
const locale = "de-CH";
const value = (n, digits = 0) => typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";
const escapeHtml = s => String(s).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const readableTime = ms => ms ? new Intl.DateTimeFormat(locale, { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"UTC", hour12:false }).format(ms) + " UTC" : "–";
const typeLabel = type => CATEGORY[type]?.label || "Naturereignis";
const coordinate = (lat, lng) =>
  Math.abs(lat).toFixed(3) + "° " + (lat >= 0 ? "N" : "S") +
  " / " + Math.abs(lng).toFixed(3) + "° " + (lng >= 0 ? "E" : "W");

function loadBest() {
  try {
    const n = Number(localStorage.getItem("rift_best_v1"));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch { return 0; }
}
function saveBest(score) {
  try { localStorage.setItem("rift_best_v1", String(score)); } catch { /* storage optional */ }
}
function notify(message) {
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.hidden = true, 3700);
}
function playSound(kind = "click") {
  if (!state.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    soundContext ||= new Audio();
    if (soundContext.state === "suspended") soundContext.resume().catch(() => {});
    const now = soundContext.currentTime;
    const oscillator = soundContext.createOscillator(), gain = soundContext.createGain();
    oscillator.type = kind === "result" ? "sine" : "triangle";
    const tones = { click:[330,420], lock:[300,700], result:[530,880], miss:[210,140] };
    const [start, end] = tones[kind] || tones.click;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + .16);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.04, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
    oscillator.connect(gain).connect(soundContext.destination);
    oscillator.start(now);
    oscillator.stop(now + .26);
  } catch { /* Sound is optional; failure never breaks gameplay. */ }
}

function glStatus(message) { dom.mapStatus.textContent = message; }
function showGlobeFailure() {
  dom.globeFallback.hidden = false;
  glStatus("3D OFFLINE");
  state.globe = null;
  dom.startHunt.disabled = true;
  dom.huntReady.textContent = "3D nicht verfügbar. Starte die Seite mit WebGL-fähigem Browser neu.";
}
function canWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch { return false; }
}
function initGlobe() {
  if (!window.Globe || !canWebGL()) { showGlobeFailure(); return; }
  try {
    dom.globe.replaceChildren();
    const globe = window.Globe(dom.globe, { animateIn: !reducedMotion, rendererConfig: { antialias: true, alpha: false } })
      .width(Math.max(200, dom.mainStage.clientWidth))
      .height(Math.max(300, dom.mainStage.clientHeight))
      .backgroundColor("#071017")
      .globeImageUrl("https://cdn.jsdelivr.net/npm/three-globe@2.44.0/example/img/earth-night.jpg")
      .bumpImageUrl("https://cdn.jsdelivr.net/npm/three-globe@2.44.0/example/img/earth-topology.png")
      .showAtmosphere(true)
      .atmosphereColor("#2e9d9e")
      .atmosphereAltitude(.19)
      .pointLat("lat").pointLng("lng")
      .pointAltitude(point => point.type === "quake" ? .015 + Math.max(0, point.magnitude - 4.4) * .014 : .017)
      .pointRadius(point => point.type === "quake" ? .28 + Math.max(0, point.magnitude - 4.4) * .18 : .45)
      .pointResolution(9)
      .pointColor(point => point.isGuess ? "#bde8a5" : point.isAnswer ? "#ffffff" : CATEGORY[point.type]?.color || "#ffffff")
      .pointLabel(point => point.isGuess ? "Dein Tipp" : point.isAnswer ? "Tatsächliches Epizentrum" :
        "<b>" + escapeHtml(point.title) + "</b><br>" + escapeHtml(typeLabel(point.type)) +
        (point.magnitude !== null ? " · M " + point.magnitude.toFixed(1) : ""))
      .pointsTransitionDuration(reducedMotion ? 0 : 400)
      .ringLat("lat").ringLng("lng")
      .ringColor(item => item.isAnswer ? ["#ffffff","#b5ffda00"] : item.isGuess ? ["#c5f18f","#c5f18f00"] : ["#ff8566","#ff856600"])
      .ringMaxRadius(point => point.isAnswer ? 7 : 4)
      .ringPropagationSpeed(reducedMotion ? 0 : 1.8)
      .ringRepeatPeriod(reducedMotion ? 1e9 : 1250)
      .arcColor(() => ["#bff2c3", "#fa8869"])
      .arcStroke(.35)
      .arcDashLength(.45)
      .arcDashGap(.12)
      .arcDashAnimateTime(reducedMotion ? 0 : 3500)
      .onPointClick(point => {
        if (state.mode === "explore") selectEvent(point);
      })
      .onGlobeClick(({ lat, lng }) => {
        dom.coordinates.textContent = coordinate(lat, lng);
        if (state.mode === "hunt" && state.game.status === "aim") {
          state.game.guess = { lat, lng };
          dom.guessCoords.textContent = coordinate(lat, lng);
          dom.lockGuess.disabled = false;
          dom.lockGuess.textContent = "POSITION BESTÄTIGEN ↗";
          updateMapMarkers();
          playSound("click");
        }
      });
    globe.pointOfView({ lat: 15, lng: 85, altitude: 2.15 }, 0);
    const controls = globe.controls();
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = .32;
    controls.enableDamping = true;
    controls.dampingFactor = .045;
    controls.minDistance = 118;
    controls.maxDistance = 520;
    state.globe = globe;
    dom.globeFallback.hidden = true;
    updateMapMarkers();
    glStatus("3D SYSTEM ONLINE");
    dom.startHunt.disabled = state.quakes.length < 5;
  } catch (error) {
    console.error("RIFT globe:", error);
    showGlobeFailure();
  }
}
function sizeGlobe() {
  if (state.globe) {
    state.globe.width(Math.max(200, dom.mainStage.clientWidth));
    state.globe.height(Math.max(300, dom.mainStage.clientHeight));
  }
}
if ("ResizeObserver" in window) new ResizeObserver(sizeGlobe).observe(dom.mainStage);
else window.addEventListener("resize", sizeGlobe);

function autoRotation(enabled) {
  state.autoRotate = enabled;
  dom.rotateButton.setAttribute("aria-pressed", String(enabled));
  if (state.globe) state.globe.controls().autoRotate = enabled;
}
function goTo(lat, lng, altitude = 1.85) {
  if (!state.globe) return;
  autoRotation(false);
  state.globe.pointOfView({ lat, lng, altitude }, reducedMotion ? 0 : 1050);
}
function updateMapMarkers() {
  if (!state.globe) return;
  if (state.mode === "explore") {
    const filtered = visibleEvents();
    state.globe.pointsData(filtered);
    const strongest = [...filtered].filter(e => e.type === "quake").sort((a,b) => b.magnitude - a.magnitude).slice(0, 7);
    state.globe.ringsData(state.selected ? [state.selected] : strongest);
    state.globe.arcsData([]);
  } else {
    const game = state.game;
    const points = [];
    if (game.guess) points.push({ ...game.guess, isGuess: true, type: "guess" });
    if (game.status === "revealed" && game.missions[game.index])
      points.push({ ...game.missions[game.index], isAnswer: true });
    state.globe.pointsData(points);
    state.globe.ringsData(game.status === "revealed" ? points.filter(p => p.isAnswer) :
      game.guess ? [{ ...game.guess, isGuess: true }] : []);
    state.globe.arcsData(game.status === "revealed" && game.guess ? [{
      startLat: game.guess.lat, startLng: game.guess.lng,
      endLat: game.missions[game.index].lat, endLng: game.missions[game.index].lng
    }] : []);
  }
}

async function getJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
async function refreshData() {
  if (updatePromise) return updatePromise;
  dom.refreshButton.disabled = true;
  dom.refreshButton.classList.add("spinning");
  glStatus("RECEIVING TRANSMISSIONS");
  updatePromise = (async () => {
    const results = await Promise.allSettled([getJSON(USGS_URL), getJSON(NASA_URL)]);
    const source = [dom.usgsState, dom.nasaState];
    let anySuccess = false;
    results.forEach((result, index) => {
      let ok = false;
      if (result.status === "fulfilled") {
        try {
          const data = index === 0 ? normalizeUSGS(result.value) : normalizeEONET(result.value);
          if (index === 0) state.quakes = data; else state.nasa = data;
          ok = true; anySuccess = true;
        } catch (error) { console.warn("RIFT: malformed feed", error); }
      } else console.warn("RIFT: feed failed", index === 0 ? "USGS" : "NASA", result.reason);
      source[index].classList.toggle("ok", ok);
      source[index].classList.toggle("fail", !ok);
    });
    state.events = [...state.quakes, ...state.nasa].sort((a, b) => b.time - a.time);
    if (anySuccess) state.lastUpdate = Date.now();
    dom.quakeCount.textContent = state.quakes.length.toLocaleString(locale);
    dom.nasaCount.textContent = state.nasa.length.toLocaleString(locale);
    dom.updatedAt.textContent = anySuccess ? "SYNC " + new Intl.DateTimeFormat(locale, { hour:"2-digit", minute:"2-digit" }).format(Date.now()) :
      "DATA CONNECTION FAILED";
    dom.startHunt.disabled = state.quakes.length < 5 || !state.globe;
    dom.huntReady.textContent = state.quakes.length < 5 ? "Zu wenige USGS-Erdbeben für eine Mission. Bitte später aktualisieren." :
      state.globe ? state.quakes.length + " Signale verfügbar · bereit zum Start" : "3D-Globus erforderlich";
    renderTelemetry();
    renderFeed();
    updateMapMarkers();
    glStatus(anySuccess ? "SIGNAL FEED ACTIVE" : "DATA LINK UNAVAILABLE");
    if (!anySuccess) notify("Datenquellen derzeit nicht erreichbar. Erneut versuchen.");
    else if (results.some(r => r.status === "rejected")) notify("Einige Datenquellen sind nicht erreichbar. Andere Signale bleiben sichtbar.");
  })().finally(() => {
    updatePromise = null;
    dom.refreshButton.disabled = false;
    dom.refreshButton.classList.remove("spinning");
  });
  return updatePromise;
}

function visibleEvents() { return state.filter === "all" ? state.events : state.events.filter(e => e.type === state.filter); }
function setFilter(type) {
  state.filter = type;
  state.selected = null;
  dom.eventDetail.hidden = true;
  dom.filters.querySelectorAll("button").forEach(button => {
    const active = button.dataset.filter === type;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderFeed();
  updateMapMarkers();
}
function renderFeed() {
  const events = visibleEvents();
  dom.feedHeading.textContent = state.filter === "all" ? "LATEST TRANSMISSIONS" : typeLabel(state.filter).toUpperCase() + " TRANSMISSIONS";
  dom.feedCount.textContent = events.length.toLocaleString(locale) + " SIGNALS";
  const fragment = document.createDocumentFragment();
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "loading-message";
    empty.textContent = state.lastUpdate ? "Keine Ereignisse in dieser Kategorie gemeldet." : "Keine Daten. Aktualisiere den Feed.";
    fragment.append(empty);
  }
  for (const event of events.slice(0, 80)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "feed-item" + (state.selected?.id === event.id ? " selected" : "");
    button.setAttribute("aria-label", typeLabel(event.type) + ": " + event.title + ". Auf Globus anzeigen");
    const icon = document.createElement("span");
    icon.className = "feed-icon";
    icon.style.color = CATEGORY[event.type].color;
    icon.style.borderColor = CATEGORY[event.type].color + "55";
    icon.style.backgroundColor = CATEGORY[event.type].color + "12";
    icon.textContent = CATEGORY[event.type].icon;
    const copy = document.createElement("span");
    copy.className = "feed-copy";
    const title = document.createElement("strong");
    title.textContent = event.title;
    const source = document.createElement("small");
    source.textContent = event.source + " / " + typeLabel(event.type).toUpperCase();
    copy.append(title, source);
    const right = document.createElement("span");
    right.className = "feed-right";
    const mag = document.createElement("span");
    mag.className = "feed-magnitude";
    mag.textContent = event.magnitude === null ? "↗" : "M" + event.magnitude.toFixed(1);
    const age = document.createElement("span");
    age.className = "feed-age";
    age.textContent = formatAge(event.time);
    right.append(mag, age);
    button.append(icon, copy, right);
    button.addEventListener("click", () => selectEvent(event));
    fragment.append(button);
  }
  dom.eventList.replaceChildren(fragment);
}
function selectEvent(event) {
  if (state.mode !== "explore") return;
  state.selected = event;
  dom.eventDetail.hidden = false;
  dom.detailType.textContent = event.source + " / " + typeLabel(event.type).toUpperCase();
  dom.detailTitle.textContent = event.title;
  dom.detailMagnitude.textContent = event.magnitude === null ? "–" : "M " + event.magnitude.toFixed(1);
  dom.detailDepth.textContent = event.depth === null ? "–" : value(event.depth, 1) + " km";
  dom.detailDate.textContent = readableTime(event.time);
  dom.detailLink.hidden = !event.url;
  if (event.url) dom.detailLink.href = event.url;
  dom.coordinates.textContent = coordinate(event.lat, event.lng);
  goTo(event.lat, event.lng, 1.55);
  renderFeed();
  updateMapMarkers();
  playSound("click");
}
function renderTelemetry() {
  if (!state.quakes.length) {
    dom.largestMag.textContent = "—";
    dom.largestPlace.textContent = "Keine USGS-Daten";
    dom.lastAge.textContent = "—";
    dom.lastPlace.textContent = "Keine USGS-Daten";
    return;
  }
  const largest = [...state.quakes].sort((a,b) => b.magnitude - a.magnitude)[0];
  const latest = state.quakes[0];
  dom.largestMag.textContent = value(largest.magnitude, 1);
  dom.largestPlace.textContent = largest.title;
  dom.lastAge.textContent = formatAge(latest.time);
  dom.lastPlace.textContent = latest.title;
}

function switchMode(mode) {
  state.mode = mode;
  const hunt = mode === "hunt";
  dom.exploreConsole.hidden = hunt;
  dom.huntConsole.hidden = !hunt;
  dom.exploreTab.classList.toggle("active", !hunt);
  dom.exploreTab.setAttribute("aria-pressed", String(!hunt));
  dom.gameTab.classList.toggle("active", hunt);
  dom.gameTab.setAttribute("aria-pressed", String(hunt));
  dom.gamePinHint.hidden = !hunt || state.game.status !== "aim";
  if (hunt) {
    autoRotation(false);
    if (!state.game.missions.length) showIntro();
  } else {
    state.game.status = "intro";
    state.game.guess = null;
    state.game.missions = [];
    dom.coordinates.textContent = "--.----° N / --.----° E";
    autoRotation(!reducedMotion);
  }
  updateMapMarkers();
  playSound("click");
}
function showIntro() {
  dom.huntIntro.hidden = false;
  dom.mission.hidden = true;
  dom.huntFinished.hidden = true;
  dom.personalBest.textContent = state.best ? state.best.toLocaleString(locale) + " PTS" : "—";
  dom.startHunt.disabled = state.quakes.length < 5 || !state.globe;
  dom.gamePinHint.hidden = true;
}
function startGame() {
  if (!state.globe) { notify("3D-Globus benötigt. Bitte Browser/WebGL prüfen."); return; }
  const missions = pickMissions(state.quakes, 5);
  if (missions.length < 5) { notify("Aktuell zu wenige echte Erdbeben für fünf Missionen."); return; }
  state.game = { missions, index: 0, total: 0, hint: false, guess: null, status: "aim" };
  dom.huntIntro.hidden = true;
  dom.huntFinished.hidden = true;
  dom.mission.hidden = false;
  beginRound();
  playSound("lock");
}
function beginRound() {
  const g = state.game, mission = g.missions[g.index];
  g.hint = false; g.guess = null; g.status = "aim";
  dom.gamePinHint.hidden = false;
  dom.missionActive.hidden = false;
  dom.missionResult.hidden = true;
  dom.clueBox.hidden = true;
  dom.clueBox.textContent = "";
  dom.hintButton.disabled = false;
  dom.hintButton.textContent = "HINWEIS ENTSCHLÜSSELN   −700 PTS";
  dom.guessCoords.textContent = "NO TARGET SELECTED";
  dom.lockGuess.disabled = true;
  dom.lockGuess.textContent = "POSITION BESTÄTIGEN ↗";
  dom.missionProgress.textContent = "MISSION " + String(g.index + 1).padStart(2,"0") + " / " + String(g.missions.length).padStart(2,"0");
  dom.signalIndex.textContent = "#" + String(g.index + 1).padStart(2,"0");
  dom.missionScore.textContent = String(g.total).padStart(5,"0");
  dom.missionRegion.textContent = regionHint(mission.title);
  dom.missionMagnitude.textContent = "M " + value(mission.magnitude, 1);
  dom.missionDepth.textContent = mission.depth === null ? "–" : value(mission.depth, 0) + " KM";
  dom.missionAge.textContent = formatAge(mission.time).toUpperCase();
  dom.roundTrack.replaceChildren();
  g.missions.forEach((_,i) => {
    const tick = document.createElement("span");
    tick.className = i < g.index ? "done" : i === g.index ? "current" : "";
    dom.roundTrack.append(tick);
  });
  updateMapMarkers();
  // Do not point the camera at the solution before players guess.
  if (state.globe) state.globe.pointOfView({
    lat: g.index % 2 ? -4 : 8,
    lng: [-55,35,-125,90,0][g.index] ?? 0,
    altitude: 2.35
  }, reducedMotion ? 0 : 750);
}
function revealHint() {
  const g = state.game;
  if (g.status !== "aim" || g.hint) return;
  g.hint = true;
  dom.hintButton.disabled = true;
  dom.hintButton.textContent = "HINWEIS ENTSCHLÜSSELT";
  dom.clueBox.hidden = false;
  dom.clueBox.textContent = "📡 " + hemisphereHint(g.missions[g.index]);
  playSound("click");
}
function lockGuess() {
  const g = state.game;
  if (g.status !== "aim" || !g.guess) return;
  const mission = g.missions[g.index];
  const distance = Math.round(haversineKm(g.guess, mission));
  if (!Number.isFinite(distance)) { notify("Ungültige Koordinaten."); return; }
  const points = scoreGuess(distance, Number(g.hint));
  g.total += points; g.status = "revealed";
  dom.missionActive.hidden = true;
  dom.missionResult.hidden = false;
  dom.gamePinHint.hidden = true;
  dom.roundPoints.textContent = "+" + points.toLocaleString(locale);
  dom.resultRank.textContent = rankLabel(points);
  dom.resultLocation.textContent = mission.title;
  dom.resultDistance.textContent = distance.toLocaleString(locale) + " KM";
  dom.resultSource.hidden = !mission.url;
  if (mission.url) dom.resultSource.href = mission.url;
  dom.nextMission.textContent = g.index === g.missions.length - 1 ? "ERGEBNIS ANZEIGEN ↗" : "NÄCHSTES SIGNAL ↗";
  dom.missionScore.textContent = String(g.total).padStart(5, "0");
  updateMapMarkers();
  // Center the two points' approximate spherical midpoint for visual reveal.
  goTo(mission.lat, mission.lng, distance > 3500 ? 2.15 : 1.72);
  playSound(points > 1200 ? "result" : "miss");
}
function nextRound() {
  const g = state.game;
  if (g.status !== "revealed") return;
  g.index++;
  if (g.index >= g.missions.length) finishGame();
  else beginRound();
}
function finishGame() {
  const g = state.game;
  g.status = "finished";
  if (g.total > state.best) {
    state.best = g.total;
    saveBest(g.total);
  }
  dom.mission.hidden = true;
  dom.huntFinished.hidden = false;
  dom.gamePinHint.hidden = true;
  dom.finalScore.textContent = g.total.toLocaleString(locale) + " PTS";
  dom.finalRank.textContent = rankLabel(g.total / g.missions.length);
  state.globe?.arcsData([]);
  state.globe?.ringsData([]);
  state.globe?.pointsData([]);
  playSound("result");
}
async function shareScore() {
  const g = state.game;
  const text = "RIFT // SIGNAL HUNT 🌍\n" + g.total.toLocaleString(locale) +
    " / 25'000 Punkte · " + rankLabel(g.total / 5) +
    "\nEchte Erdbeben. Fünf Missionen.\nhttps://brotesser8.github.io/hnkrspiel/rift/";
  try {
    if (navigator.share) await navigator.share({ title: "RIFT – Signal Hunt", text });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text); notify("Score in die Zwischenablage kopiert!");
    } else notify("Teilen wird in diesem Browser nicht unterstützt.");
  } catch (error) { if (error.name !== "AbortError") notify("Teilen leider nicht möglich."); }
}

dom.filters.addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (button) { setFilter(button.dataset.filter); playSound(); }
});
dom.refreshButton.addEventListener("click", refreshData);
dom.closeDetail.addEventListener("click", () => {
  state.selected = null; dom.eventDetail.hidden = true;
  renderFeed(); updateMapMarkers();
});
dom.rotateButton.addEventListener("click", () => { autoRotation(!state.autoRotate); playSound(); });
dom.resetView.addEventListener("click", () => {
  state.globe?.pointOfView({ lat: 15, lng: 85, altitude: 2.15 }, reducedMotion ? 0 : 900);
  autoRotation(!reducedMotion && state.mode === "explore");
  playSound();
});
dom.exploreTab.addEventListener("click", () => switchMode("explore"));
dom.gameTab.addEventListener("click", () => switchMode("hunt"));
dom.quickPlay.addEventListener("click", () => {
  switchMode("hunt");
  if (state.quakes.length >= 5 && state.globe) startGame();
});
dom.exitHunt.addEventListener("click", () => switchMode("explore"));
dom.startHunt.addEventListener("click", startGame);
dom.hintButton.addEventListener("click", revealHint);
dom.lockGuess.addEventListener("click", lockGuess);
dom.nextMission.addEventListener("click", nextRound);
dom.playAgain.addEventListener("click", startGame);
dom.shareScore.addEventListener("click", shareScore);
dom.retryGlobe.addEventListener("click", initGlobe);
dom.soundButton.addEventListener("click", () => {
  state.sound = !state.sound;
  dom.soundButton.setAttribute("aria-pressed", String(state.sound));
  dom.soundButton.setAttribute("aria-label", state.sound ? "Sound ausschalten" : "Sound einschalten");
  dom.soundLabel.textContent = state.sound ? "ON" : "OFF";
  if (state.sound) playSound("lock");
});
function tick() {
  dom.utcClock.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone:"UTC", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false
  }).format(Date.now()) + " UTC";
  if (state.quakes.length) {
    dom.lastAge.textContent = formatAge(state.quakes[0].time);
  }
}
tick();
setInterval(tick, 1000);
setInterval(() => {
  if (!document.hidden && Date.now() - state.lastUpdate > 10 * 60 * 1000 && !updatePromise) refreshData();
}, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (state.globe) document.hidden ? state.globe.pauseAnimation() : state.globe.resumeAnimation();
  if (!document.hidden && Date.now() - state.lastUpdate > 10 * 60 * 1000 && !updatePromise) refreshData();
});
initGlobe();
showIntro();
refreshData();
