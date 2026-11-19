import test from "node:test";
import assert from "node:assert/strict";
import {CITIES,COUNTRY_DEFAULTS,SOURCES,normalizeCountries,nearestCountry,chooseQuiz,currencyCode,localOffsetTime,upcomingHolidays,parseJpl,parseJourney,musicUrl,travelUrl,fmtNumber} from "../core.mjs";

const countries=normalizeCountries(COUNTRY_DEFAULTS);
test("country directory normalizes coordinates, ISO codes and display fields",()=>{
 assert.equal(countries.length,7);
 const japan=countries.find(c=>c.alpha2Code==="JP");
 assert.equal(japan.lat,36);
 assert.equal(japan.lon,138);
 assert.equal(currencyCode(japan),"JPY");
 assert.equal(normalizeCountries([{name:"Invalid",alpha2Code:"FO",latlng:[NaN,90]}]).length,0);
});
test("nearest country uses great-circle distance",()=>{
 const ch=countries.find(c=>c.alpha2Code==="CH");
 assert.equal(nearestCountry(countries,46.8,8.5).alpha2Code,ch.alpha2Code);
 assert.equal(nearestCountry(countries,-41,174).alpha2Code,"NZ");
 assert.equal(nearestCountry([],0,0),null);
});
test("local UTC-offset clocks do not implicitly claim daylight savings",()=>{
 assert.equal(localOffsetTime(new Date("2026-01-01T00:00:00Z"),"UTC+09:00"),"09:00");
 assert.equal(localOffsetTime(new Date("2026-01-01T00:00:00Z"),"UTC-03:30"),"20:30");
 assert.equal(localOffsetTime(new Date("2026-01-01T00:00:00Z"),"weird"),"—:—");
});
test("quiz generates one correct answer and four unique choices",()=>{
 const q=chooseQuiz(countries,()=>.6);
 assert.ok(q);
 assert.equal(q.options.length,4);
 assert.equal(new Set(q.options).size,4);
 assert.ok(q.options.includes(q.answer));
 assert.equal(chooseQuiz(countries.slice(0,3)),null);
});
test("holiday selection uses public dates and skips past and observances",()=>{
 const input=[
  {date:"2026-01-01",types:["Public"]},
  {date:"2026-11-20",types:["Public"]},
  {date:"2026-11-21",types:["Observance"]},
  {date:"2026-12-25",holidayTypes:["Public"]}
 ];
 assert.deepEqual(upcomingHolidays(input,new Date("2026-11-19T12:00:00Z")).map(x=>x.date),["2026-11-20","2026-12-25"]);
});
test("JPL rows are read according to fields order, not fixed offsets",()=>{
 const rows=parseJpl({fields:["dist","cd","v_rel","des"],data:[["0.012","2026-Nov-20","10.2","2026 AB"],["none","","","bad"]]});
 assert.equal(rows.length,1);
 assert.equal(rows[0].name,"2026 AB");
 assert.equal(rows[0].au,.012);
});
test("journey duration seconds are converted to minutes",()=>{
 const result=parseJourney({itineraries:[{startTime:"2026-11-19T09:00:00Z",endTime:"2026-11-19T09:45:00Z",duration:2700,transfers:1,legs:[{mode:"RAIL",routeShortName:"IC1"}]}]});
 assert.equal(result.length,1);
 assert.equal(result[0].durationMinutes,45);
 assert.equal(result[0].legs[0].name,"IC1");
});
test("music URL and route link encode a verified public endpoint",()=>{
 assert.equal(musicUrl("CH"),"https://rss.marketingtools.apple.com/api/v2/ch/music/most-played/10/songs.json");
 const route=new URL(travelUrl(CITIES.zurich,CITIES.bern));
 assert.equal(route.host,"api.transitous.org");
 assert.equal(route.pathname,"/api/v6/plan");
 assert.equal(route.searchParams.get("numItineraries"),"3");
});
test("all data sources are documented with valid links",()=>{
 assert.equal(SOURCES.length,12);
 for(const s of SOURCES){assert.ok(s.note.length>15);assert.equal(new URL(s.url).protocol,"https:");}
 assert.ok(fmtNumber(123456).length>3);
});
