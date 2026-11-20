import test from "node:test";
import assert from "node:assert/strict";
import {MODES,OBJECTS,BANK,SCALE_ROUNDS,DISTANCE_ROUNDS,TIME_ROUNDS,LIVE_CITIES,buildDeck,shuffle,
  greatCircleKm,sliderToValue,valueToSlider,pointsFor,ratioScore,linearScore,percentError,formatValue,nextRange,safeModeSettings,normaliseModes} from "../data.mjs";
test("four distinct modes and 70+ varied real-world challenges",()=>{
 assert.deepEqual(MODES.map(x=>x.id),["scale","distance","time","weather"]);
 assert.ok(SCALE_ROUNDS.length>=15);assert.ok(DISTANCE_ROUNDS.length>=20);
 assert.ok(TIME_ROUNDS.length>=20);assert.ok(LIVE_CITIES.length>=10);
 assert.ok(Object.values(BANK).flat().length>=70);
 const ids=Object.values(BANK).flat().map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
});
test("all landmark ratios fit the slider and link to sources",()=>{
 const {min,max}=nextRange("scale");
 for(const q of SCALE_ROUNDS){
  assert.ok(q.reference.height>0&&q.target.height>0);
  assert.equal(q.truth,q.target.height/q.reference.height);
  assert.ok(q.truth>=min&&q.truth<=max,q.reference.name+" vs "+q.target.name+": "+q.truth);
  assert.equal(new URL(q.reference.source).protocol,"https:");
  assert.equal(new URL(q.target.source).protocol,"https:");
 }
 assert.equal(OBJECTS.eiffel.height,330);assert.equal(OBJECTS.burj.height,828);
 assert.equal(OBJECTS.skytree.height,634);
});
test("great-circle distances make sense and are symmetric",()=>{
 const a={lat:47.3769,lon:8.5417},b={lat:46.948,lon:7.4474};
 const d=greatCircleKm(a,b);
 assert.ok(d>90&&d<110);
 assert.ok(Math.abs(greatCircleKm(a,b)-greatCircleKm(b,a))<1e-8);
 assert.equal(greatCircleKm(a,a),0);
 for(const q of DISTANCE_ROUNDS)assert.ok(q.truth>=nextRange("distance").min&&q.truth<=nextRange("distance").max);
});
test("history entries use valid years and named sources",()=>{
 for(const q of TIME_ROUNDS){
  assert.ok(q.truth>=1800&&q.truth<=2026);assert.ok(q.label.length>10);
  assert.equal(new URL(q.source).protocol,"https:");
 }
});
test("deck covers selected modes without repeating",()=>{
 const deck=buildDeck(["scale","distance","time","weather"],12,()=>.35);
 assert.equal(deck.length,12);
 assert.deepEqual(new Set(deck.map(x=>x.mode)),new Set(["scale","distance","time","weather"]));
 assert.equal(new Set(deck.map(x=>x.id)).size,12);
 assert.equal(buildDeck(["scale"],5).length,5);
 assert.deepEqual(buildDeck([],10),[]);
 assert.deepEqual(normaliseModes(["scale","bogus","scale"]),["scale"]);
 assert.deepEqual(shuffle([1],()=>.1),[1]);
});
test("logarithmic sliders roundtrip and clamp",()=>{
 for(const [min,max] of [[.25,3.3],[40,18000]]){
  for(const value of [min,Math.sqrt(min*max),max]){
   const s=valueToSlider(value,min,max);
   assert.ok(Math.abs(sliderToValue(s,min,max)-value)<1e-9*max);
  }
  assert.equal(sliderToValue(-100,min,max),min);
  assert.ok(Math.abs(sliderToValue(1100,min,max)-max)<1e-9);
 }
});
test("closer answers yield more points; hints reduce result",()=>{
 assert.equal(ratioScore(2,2),1000);
 assert.ok(ratioScore(2.1,2)>ratioScore(3,2));
 assert.ok(ratioScore(.5,2)<ratioScore(1.8,2));
 assert.equal(linearScore(1969,1969,28),1000);
 assert.ok(linearScore(1971,1969,28)>linearScore(2000,1969,28));
 assert.equal(pointsFor("scale",2,2,true),700);
 assert.equal(pointsFor("time",1977,1977,false),1000);
 assert.equal(pointsFor("weather",10,10,true),700);
 assert.equal(pointsFor("scale",-1,2),0);
 assert.equal(percentError(3,2),50);
});
test("formatting and settings validation",()=>{
 assert.equal(formatValue("time",1969),"1969");
 assert.ok(formatValue("distance",1133).includes("km"));
 assert.ok(formatValue("weather",-4.5).includes("°C"));
 assert.deepEqual(safeModeSettings({modes:["weather"],rounds:5}),{modes:["weather"],rounds:5});
 assert.equal(safeModeSettings({modes:["invalid"],rounds:99}).rounds,8);
 assert.ok(new Set(LIVE_CITIES.map(x=>x.city.zone)).size>5);
});
