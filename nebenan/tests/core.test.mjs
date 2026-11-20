import test from "node:test";
import assert from "node:assert/strict";
import {CHANNELS,CITIES,ART_TOPICS,BOOK_TOPICS,SOUND_REGIONS,SOURCES,number,dateLabel,localClock,weekday,wmoWeather,aqiDescription,parseForecast,normalizeCity,safeHttps,parseArtworks,normalizeBooks,parseQuakes,parseEonet,parseCharts,upcomingHoliday,safePocket,randomIndex} from "../core.mjs";
import {request} from "../api.mjs";

test("six independent channels, ten documented API sources",()=>{
 assert.equal(CHANNELS.length,6);
 assert.equal(new Set(CHANNELS.map(x=>x.id)).size,6);
 assert.equal(SOURCES.length,10);
 SOURCES.forEach(s=>assert.equal(new URL(s.url).protocol,"https:"));
});
test("cities have valid geographical positions and real timezone identifiers",()=>{
 assert.equal(CITIES.length,10);
 for(const c of CITIES){
  assert.ok(Math.abs(c.lat)<=90&&Math.abs(c.lon)<=180);
  assert.equal(c.countryCode.length,2);
  assert.doesNotThrow(()=>new Intl.DateTimeFormat("de-CH",{timeZone:c.timezone}));
  assert.match(localClock(c.timezone,new Date("2026-01-01T12:00:00Z")),/^\d{2}:\d{2}$/);
 }
 const city=normalizeCity({id:4,name:"Helsinki",latitude:60.17,longitude:24.94,country:"Finland",country_code:"FI",timezone:"Europe/Helsinki",admin1:"Uusimaa"});
 assert.equal(city.countryCode,"FI");
 assert.equal(normalizeCity({latitude:999,longitude:0}),null);
});
test("weather codes and modeled air index produce truthful labels",()=>{
 assert.equal(wmoWeather(0).tone,"clear");
 assert.equal(wmoWeather(61).name,"Regen");
 assert.equal(wmoWeather(75).tone,"snow");
 assert.equal(aqiDescription(55).name,"Mässig");
 assert.equal(aqiDescription(999).pct,100);
 assert.equal(aqiDescription(null).name,"Nicht verfügbar");
});
test("daily forecast preserves ordering and rejects absent data",()=>{
 const raw={daily:{time:["2026-11-20","2026-11-21"],temperature_2m_max:[16,12],temperature_2m_min:[8,7],weather_code:[3,61],precipitation_probability_max:[15,70]}};
 const rows=parseForecast(raw);assert.equal(rows.length,2);assert.equal(rows[1].rain,70);
 assert.equal(weekday(rows[0].date).length>0,true);
 assert.throws(()=>parseForecast({}));
});
test("Art Institute adapter uses public domain images and safe IIIF URLs",()=>{
 const data=parseArtworks({data:[{id:42,title:"A test painting",image_id:"abc-123",is_public_domain:true,artist_display:"Artist",date_display:"1901"},{id:5,title:"Rights restricted",image_id:"q",is_public_domain:false}]});
 assert.equal(data.length,1);assert.equal(data[0].id,42);
 assert.match(data[0].image,/\/full\/843,\/0\/default\.jpg$/);
 assert.match(data[0].link,/\/artworks\/42$/);
});
test("book adapter deduplicates works and handles covers",()=>{
 const books=normalizeBooks({docs:[{key:"/works/OL1W",title:"First",author_name:["A"],cover_i:17},{key:"/works/OL1W",title:"Duplicate"},{key:"/works/OL2W",title:"Second",first_publish_year:1967}]});
 assert.equal(books.length,2);
 assert.equal(books[0].cover,"https://covers.openlibrary.org/b/id/17-M.jpg");
 assert.equal(books[1].cover,null);
});
test("earthquake and NASA events preserve coordinates and sources",()=>{
 const q=parseQuakes({features:[{id:"abc",properties:{place:"Near Bern",mag:3.5,time:Date.now(),url:"https://earthquake.usgs.gov/1"},geometry:{coordinates:[7.4,46.9,5]}}]});
 assert.equal(q[0].lat,46.9);assert.equal(q[0].label,"M 3.5");
 const e=parseEonet({events:[{id:"evt",title:"Wildfire",categories:[{title:"Wildfires"}],sources:[{url:"https://eonet.gsfc.nasa.gov/" }],geometry:[{type:"Point",coordinates:[-121,38],date:"2026-11-20T00:00:00Z"}]}]});
 assert.equal(e[0].lon,-121);assert.equal(e[0].label,"Wildfires");
 assert.throws(()=>parseQuakes(null));
});
test("music feed, holidays and pocket entries validate external input",()=>{
 assert.deepEqual(parseCharts({feed:{results:[{name:"Track",artistName:"Someone",artworkUrl100:"https://example.org/a.jpg",url:"javascript:evil()"}]}}).map(x=>x.url),["https://music.apple.com/"]);
 const h=upcomingHoliday([{date:"2026-11-21",types:["Observance"]},{date:"2026-12-25",types:["Public"]}],new Date("2026-11-20T10:00:00Z"));
 assert.equal(h.date,"2026-12-25");
 assert.equal(safeHttps("javascript:alert(1)"),null);
 const p=safePocket([{id:"book-1",type:"Book",title:"Hello",url:"https://openlibrary.org/"},{id:"bad",type:"Foo",title:"World",url:"javascript:alert(1)"}]);
 assert.equal(p.length,1);
});
test("random selection is constrained and metadata covers every channel",()=>{
 assert.equal(randomIndex(6,()=>.5),3);
 assert.equal(randomIndex(0),-1);
 assert.equal(ART_TOPICS.length,6);assert.equal(BOOK_TOPICS.length,6);assert.equal(SOUND_REGIONS.length,7);
 assert.ok(number(1000000).length>5);assert.ok(dateLabel("2026-12-25").includes("Dez"));
});
test("API client deduplicates simultaneous calls and caches results",async()=>{
 const former=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({ok:true,at:calls})};};
 try{
  const [a,b]=await Promise.all([request("https://api.example.test/cache-case-a"),request("https://api.example.test/cache-case-a")]);
  const c=await request("https://api.example.test/cache-case-a");
  assert.equal(calls,1);assert.deepEqual(a,b);assert.deepEqual(b,c);
 }finally{globalThis.fetch=former;}
});
