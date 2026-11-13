import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUSGS, normalizeEONET, haversineKm, scoreGuess, pickMissions, regionHint, hemisphereHint, formatAge, rankLabel } from "../logic.mjs";

function quake(id, lat, lng, mag = 5.2, title = "23 km E of A, Japan") {
  return { type: "Feature", id, geometry: { type: "Point", coordinates: [lng, lat, 10] },
    properties: { place: title, mag, time: 1794561000000, url: "https://earthquake.usgs.gov/earthquakes/eventpage/" + id, tsunami: 0 } };
}
const quakeFeed = { features: [
  quake("a", 35, 140, 6.1),
  quake("b", -20, -70, 5.3, "70 km S of B, Chile"),
  quake("c", 61, -150, 5.2, "10 km N of C, Alaska"),
  quake("d", 10, 100, 5.1, "3 km W of D, Thailand"),
  quake("e", -45, 169, 4.9, "19 km S of E, New Zealand"),
  quake("f", 44, 15, 4.7, "12 km SE of F, Croatia")
] };

test("USGS format retains correct coordinate order, depth, source and magnitude", () => {
  const q = normalizeUSGS(quakeFeed)[0];
  assert.equal(q.lat, 35); assert.equal(q.lng, 140);
  assert.equal(q.depth, 10); assert.equal(q.magnitude, 6.1);
  assert.equal(q.source, "USGS"); assert.equal(q.type, "quake");
});

test("bad locations, magnitudes and unknown feed shape get rejected safely", () => {
  const invalid = { ...quake("bad", 100, 140), geometry: { coordinates: [140, 100, 10] } };
  assert.equal(normalizeUSGS({ features: [invalid] }).length, 0);
  assert.throws(() => normalizeUSGS({}), /Ungültige USGS-Antwort/);
});

test("NASA EONET maps distinct event categories and latest Point", () => {
  const NASA = { events: [
    { id:"A", title:"Mountain Fire", categories:[{id:"wildfires"}], link:"https://eonet.gsfc.nasa.gov/api/v3/events/A",
      geometry:[{type:"Point", coordinates:[-120,44], date:"2026-11-10T09:00:00Z"}, {type:"Point", coordinates:[-121,45],date:"2026-11-11T10:00:00Z"}] },
    { id:"B", title:"Tropical Storm", categories:[{id:"severeStorms"}],
      geometry:[{type:"Point",coordinates:[90,-8],date:"2026-11-11T00:00:00Z"}] },
    { id:"C", title:"Volcano", categories:[{id:"volcanoes"}],
      geometry:[{type:"Point",coordinates:[124,14],date:"2026-11-11T00:00:00Z"}] },
    { id:"D", title:"Ice", categories:[{id:"seaLakeIce"}],
      geometry:[{type:"Point",coordinates:[10,80]}] },
    { id:"E", title:"Flood as polygon", categories:[{id:"wildfires"}],
      geometry:[{type:"Polygon",coordinates:[[[10,10],[11,10],[11,11]]]}] }
  ] };
  const events = normalizeEONET(NASA);
  assert.equal(events.length, 3);
  const fire = events.find(e => e.id === "nasa:A");
  assert.equal(fire.type, "wildfire"); assert.equal(fire.lat,45); assert.equal(fire.lng,-121);
  assert.ok(events.some(e => e.type === "storm"));
  assert.ok(events.some(e => e.type === "volcano"));
});

test("haversine distance handles antimeridian and identical coordinates", () => {
  assert.equal(haversineKm({lat:0,lng:0},{lat:0,lng:0}),0);
  assert.ok(Math.abs(haversineKm({lat:0,lng:0},{lat:0,lng:180})-20015.1)<1);
  assert.ok(haversineKm({lat:0,lng:179},{lat:0,lng:-179}) < 230);
});

test("score is within 0–5000, hints reduce points, errors never reward", () => {
  assert.equal(scoreGuess(0),5000);
  assert.equal(scoreGuess(0,1),4300);
  assert.ok(scoreGuess(4000)<scoreGuess(500));
  assert.equal(scoreGuess(-10),0);
  assert.equal(scoreGuess(Infinity),0);
  assert.equal(scoreGuess(40000),0);
});

test("Missions are geographically spread out and unique", () => {
  const qs=normalizeUSGS(quakeFeed);
  const missions=pickMissions(qs,5);
  assert.equal(missions.length,5);
  assert.equal(new Set(missions.map(e=>e.id)).size,5);
});

test("Region clue hides exact town, retains broad country", () => {
  assert.equal(regionHint("85 km W of City, Japan"),"Japan");
  assert.equal(regionHint("southwest of the Loyalty Islands"),"Loyalty Islands");
  assert.equal(regionHint("southeast of Loyalty Islands"),"Loyalty Islands");
  assert.equal(hemisphereHint({lat:-10,lng:-70}),"Südhalbkugel · westliche Länge");
});

test("Age formatting and ranks have stable boundaries", () => {
  assert.equal(formatAge(1000,1000),"gerade eben");
  assert.equal(formatAge(1000,1000+7200000),"vor 2 Std.");
  assert.equal(rankLabel(5000),"SEISMIC LEGEND");
  assert.equal(rankLabel(100),"ROOKIE EXPLORER");
});
