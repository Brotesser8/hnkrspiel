import test from "node:test";
import assert from "node:assert/strict";
import { buildHours, scoreHour, topWindows, windowsFor, windowTime, dayLabel, aqiLabel, weatherLabel } from "../logic.mjs";

const sample = () => {
  const time = Array.from({ length: 10 }, (_, index) =>
    "2026-06-12T" + String(index + 8).padStart(2, "0") + ":00");
  const weather = {
    current: { time: "2026-06-12T09:33" },
    hourly: {
      time,
      temperature_2m: time.map(() => 21),
      apparent_temperature: time.map(() => 21),
      precipitation_probability: time.map(() => 0),
      precipitation: time.map(() => 0),
      wind_speed_10m: time.map(() => 8),
      weather_code: time.map(() => 1),
      is_day: time.map(() => 1),
      cloud_cover: time.map(() => 15)
    }
  };
  const air = {
    hourly: {
      time: [...time].reverse(),
      us_aqi: time.map((_, i) => i * 10),
      uv_index: time.map(() => 3)
    }
  };
  return { weather, air };
};

test("starts at the local current hour, even when the visitor has another timezone", () => {
  const { weather, air } = sample();
  const hours = buildHours(weather, air);
  assert.equal(hours[0].time, "2026-06-12T09:00");
  assert.equal(hours.length, 9);
  assert.equal(hours[0].aqi, 80);
});

test("missing air-quality forecast remains null, not a fabricated zero", () => {
  const { weather } = sample();
  const hours = buildHours(weather);
  assert.equal(hours[0].aqi, null);
  assert.equal(hours[0].uv, null);
  assert.equal(aqiLabel(hours[0].aqi), "Keine Daten");
});

test("rain sharply reduces suitability and never raises it", () => {
  const { weather } = sample();
  const hour = buildHours(weather)[0];
  const dry = scoreHour(hour, "walk");
  assert.ok(scoreHour({ ...hour, rain: 85, mm: 3 }, "walk") < dry);
});

test("cycling penalizes strong wind more than walking", () => {
  const { weather } = sample();
  const hour = buildHours(weather)[0];
  const walkLoss = scoreHour(hour, "walk") - scoreHour({ ...hour, wind: 40 }, "walk");
  const bikeLoss = scoreHour(hour, "bike") - scoreHour({ ...hour, wind: 40 }, "bike");
  assert.ok(bikeLoss > walkLoss);
});

test("running penalizes unhealthy air, thunderstorms, and strong UV", () => {
  const { weather } = sample();
  const hour = buildHours(weather)[0];
  const fair = scoreHour({ ...hour, temp: 15, feels: 15 }, "run");
  assert.ok(scoreHour({ ...hour, temp: 15, feels: 15, aqi: 170 }, "run") < fair);
  assert.ok(scoreHour({ ...hour, temp: 15, feels: 15, code: 95 }, "run") < fair);
  assert.ok(scoreHour({ ...hour, temp: 15, feels: 15, uv: 10 }, "run") < fair);
});

test("top recommendations never overlap", () => {
  const { weather } = sample();
  const hours = buildHours(weather);
  const picks = topWindows(hours, "walk", 3, "all", 3);
  assert.equal(picks.length, 3);
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      assert.ok(picks[i].start + 3 <= picks[j].start || picks[j].start + 3 <= picks[i].start);
    }
  }
});

test("duration and day filter are respected", () => {
  const { weather } = sample();
  const hours = buildHours(weather);
  assert.equal(windowsFor(hours, "walk", 2).length, 8);
  assert.equal(windowsFor(hours, "walk", 2, "2026-06-13").length, 0);
  assert.equal(windowTime(windowsFor(hours, "walk", 2).find(window => window.start === 0)), "09:00–11:00");
});

test("weather labels and dates remain human-readable", () => {
  assert.equal(weatherLabel(95), "Gewitter");
  assert.match(dayLabel("2026-06-12", true), /12/);
});

test("invalid data is rejected rather than rendered as weather", () => {
  assert.throws(() => buildHours({}), /Stundenprognose/);
});
