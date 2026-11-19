import test from "node:test";
import assert from "node:assert/strict";
import {PRESETS,insideSwissMapBounds,toLV95,heightUrl,profileUrl,geoAdminMapUrl,cleanLabel,profilePoints,nextHolidays,fmtNum} from "../core.mjs";
import {SOURCES,matchingSources} from "../catalogue.mjs";
test("32 original sources are individually documented",()=>{
  assert.equal(SOURCES.length,32);
  assert.equal(new Set(SOURCES.map(s=>s.title)).size,32);
  for(const s of SOURCES){
    assert.ok(["live","reference","excluded"].includes(s.status));
    assert.equal(new URL(s.url).protocol,"https:");
    assert.ok(s.detail.length>20);
  }
});
test("geographic features cover Swiss sample cities",()=>{
  Object.values(PRESETS).forEach(c=>assert.ok(insideSwissMapBounds(c.lat,c.lng),c.name));
  assert.equal(insideSwissMapBounds(48.8,8.5),false);
  assert.equal(insideSwissMapBounds(NaN,8.5),false);
});
test("official Swiss coordinate conversion is in reasonable survey range",()=>{
  const p=toLV95(PRESETS.zuerich.lat,PRESETS.zuerich.lng);
  assert.ok(Math.abs(p.e-2683304)<25);
  assert.ok(Math.abs(p.n-1247926)<25);
  assert.match(heightUrl(PRESETS.bern.lat,PRESETS.bern.lng),/sr=2056/);
  assert.match(geoAdminMapUrl(46.948,7.447),/center=/);
});
test("profile uses a GeoJSON line in LV95",()=>{
  const u=new URL(profileUrl(PRESETS.bern,PRESETS.zuerich));
  const geom=JSON.parse(u.searchParams.get("geom"));
  assert.equal(geom.type,"LineString");
  assert.equal(geom.coordinates.length,2);
  assert.ok(geom.coordinates.every(x=>x[0]>2000000&&x[1]>1000000));
});
test("profiles filter missing and nonnumeric heights",()=>{
  const data=[{dist:0,alts:{COMB:150}},{dist:100,alts:{DTM2:300}},{dist:200,alts:{COMB:null}},{dist:300,alts:{}}];
  const results=profilePoints(data);
  assert.deepEqual(results.slice(0,2),[{dist:0,height:150},{dist:100,height:300}]);
  assert.ok(results.every(row=>Number.isFinite(row.height)));
});
test("holidays are chronological and future-only",()=>{
  const dates=[{date:"2026-01-01",holidayTypes:["Public"]},{date:"2026-12-25",holidayTypes:["Public"]},{date:"2027-01-01",holidayTypes:["Public"]},{date:"2026-12-22",holidayTypes:["Observance"]}];
  assert.deepEqual(nextHolidays(dates,new Date(2026,10,19)).map(h=>h.date),["2026-12-25","2027-01-01"]);
});
test("source search honors the no-fixed-quota filter",()=>{
  const excluded=matchingSources(SOURCES,{filter:"excluded",query:"Open-Meteo"});
  assert.equal(excluded.length,2);
  assert.ok(matchingSources(SOURCES,{filter:"live"}).length>=8);
  assert.equal(cleanLabel("<i>Ort</i> <b>Bern</b> &amp; Bern"),"Ort Bern & Bern");
  assert.ok(fmtNum(9000000).includes("9"));
});
