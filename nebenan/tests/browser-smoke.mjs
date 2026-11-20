import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,resolve,sep} from "node:path";
import assert from "node:assert/strict";

const root=resolve(".");
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".json":"application/json"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost"),path=decodeURIComponent(url.pathname);
  const filepath=resolve(root,"."+path+(path.endsWith("/")?"index.html":""));
  if(!filepath.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
  const data=await readFile(filepath);
  res.writeHead(200,{"Content-Type":types[extname(filepath)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base="http://127.0.0.1:"+server.address().port+"/nebenan/";
const vector='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#cabed7"/><rect x="30" y="30" width="340" height="340" rx="8" fill="#8a9fb2"/><circle cx="190" cy="192" r="115" fill="#ecc891"/><path d="M70 270Q160 90 300 160" fill="none" stroke="#796d69" stroke-width="10"/></svg>';
const dogVector='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#e8c69f"/><circle cx="200" cy="140" r="82" fill="#8b684c"/><path d="M146 82 108 45 122 146 154 108 M253 82 292 45 282 146 249 108" fill="#624a39"/><circle cx="171" cy="126" r="9" fill="#231d1b"/><circle cx="229" cy="126" r="9" fill="#231d1b"/><circle cx="200" cy="171" r="16" fill="#2f2823"/></svg>';
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:1420,height:980},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",err=>errors.push(err.message));
 const counters={weather:0,air:0,art:0,books:0,earth:0,sound:0,play:0};
 const nextDays=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(2026,10,20+i));return d.toISOString().slice(0,10);});
 await page.route("https://api.open-meteo.com/v1/forecast?**",route=>{
  counters.weather++;
  route.fulfill({json:{current:{temperature_2m:18,weather_code:1,is_day:1,wind_speed_10m:6,precipitation:0},daily:{time:nextDays,temperature_2m_max:[18,16,14,12,15,19],temperature_2m_min:[7,5,6,4,6,8],weather_code:[1,3,61,45,0,2],precipitation_probability_max:[10,20,65,45,0,5]}}});
 });
 await page.route("https://air-quality-api.open-meteo.com/v1/air-quality?**",route=>{
  counters.air++;
  route.fulfill({json:{current:{european_aqi:27}}});
 });
 await page.route("https://geocoding-api.open-meteo.com/v1/search?**",route=>route.fulfill({json:{results:[{id:35,name:"Reykjavík",latitude:64.1466,longitude:-21.9426,country:"Island",country_code:"IS",timezone:"Atlantic/Reykjavik",admin1:"Höfuðborgarsvæðið"}]}}));
 await page.route("https://date.nager.at/api/v3/NextPublicHolidays/**",route=>route.fulfill({json:[{date:"2026-12-25",localName:"Christmas Day",name:"Christmas",global:true,types:["Public"]},{date:"2027-01-01",localName:"New Year",global:true,types:["Public"]}]}));
 await page.route("https://api.artic.edu/api/v1/artworks/search?**",route=>{
  counters.art++;const q=new URL(route.request().url()).searchParams.get("q")||"Art";
  route.fulfill({json:{data:Array.from({length:8},(_,i)=>({id:200+i,title:q+" No. "+(i+1),artist_display:"An artist / Chicago",date_display:"1900",image_id:"test-"+i,is_public_domain:true,thumbnail:{alt_text:"Art image "+i}}))}});
 });
 await page.route("https://openlibrary.org/search.json?**",route=>{
  counters.books++;
  route.fulfill({json:{docs:Array.from({length:8},(_,i)=>({key:"/works/OL"+(200+i)+"W",title:"An interesting book "+(i+1),author_name:["Writer "+i],first_publish_year:1950+i,cover_i:200+i}))}});
 });
 await page.route("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",route=>{
  counters.earth++;
  route.fulfill({json:{features:[{id:"quake123",properties:{place:"Northern Japan",mag:4.2,time:Date.now(),url:"https://earthquake.usgs.gov/earthquakes/"},geometry:{coordinates:[139.7,35.8,30]}},{id:"quake456",properties:{place:"South of Iceland",mag:3.1,time:Date.now(),url:"https://earthquake.usgs.gov/earthquakes/"},geometry:{coordinates:[-21,63,12]}}]}});
 });
 await page.route("https://eonet.gsfc.nasa.gov/api/v3/events?**",route=>route.fulfill({json:{events:[{id:"event1",title:"Wildfire in the hills",categories:[{title:"Wildfires"}],geometry:[{type:"Point",coordinates:[-120,39],date:"2026-11-20T00:00:00Z"}],sources:[{url:"https://eonet.gsfc.nasa.gov/"}]}]}}));
 await page.route("https://rss.marketingtools.apple.com/api/v2/**",route=>{counters.sound++;route.fulfill({json:{feed:{results:[{name:"The track that matters",artistName:"Artist One",artworkUrl100:"https://mock.assets.test/cover.svg",url:"https://music.apple.com/track"},{name:"A different sound",artistName:"Artist Two",artworkUrl100:"https://mock.assets.test/cover.svg",url:"https://music.apple.com/track2"}]}}});});
 await page.route("https://pokeapi.co/api/v2/pokemon/**",route=>{counters.play++;route.fulfill({json:{id:25,name:"pikachu",types:[{type:{name:"electric"}}],sprites:{other:{"official-artwork":{front_default:"https://mock.assets.test/pokemon.svg"}}}}});});
 await page.route("https://dog.ceo/api/breeds/image/random",route=>route.fulfill({json:{status:"success",message:"https://mock.assets.test/dog.svg"}}));
 await page.route("https://www.artic.edu/iiif/2/**",route=>route.fulfill({body:vector,contentType:"image/svg+xml"}));
 await page.route("https://covers.openlibrary.org/**",route=>route.fulfill({body:vector,contentType:"image/svg+xml"}));
 await page.route("https://mock.assets.test/**",route=>route.fulfill({body:route.request().url().includes("dog")?dogVector:vector,contentType:"image/svg+xml"}));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator("#weatherTemp").getByText("18").waitFor({timeout:15000});
 assert.equal(await page.locator(".station").count(),6);
 assert.equal(await page.locator(".forecast-day").count(),6);
 assert.equal((await page.locator("#airLabel").textContent()).includes("Gut"),true);
 assert.equal(await page.locator(".source-link").count(),10);
 await mkdir("nebenan/test-artifacts",{recursive:true});
 await page.screenshot({path:"nebenan/test-artifacts/desktop-world.png",fullPage:true});
 await page.locator("#citySearch").fill("Reykjavik");
 await page.locator("#cityGo").click();
 await page.locator("#citySearchResults button").first().click();
 await page.locator("#weatherCity").getByText("Reykjavík").waitFor();
 await page.locator("#saveCity").click();
 await page.locator("#openPocket").click();
 assert.equal(await page.locator(".pocket-entry").count(),1);
 await page.locator("#closePocket").click();
 await page.locator('[data-channel="art"]').click();
 await page.locator(".art-thumb").first().waitFor({timeout:15000});
 assert.ok(await page.locator(".art-thumb").count()>=5);
 await page.locator('[data-id="portrait"]').click();
 await page.locator("#artFeature h4").getByText(/portrait/).waitFor();
 await page.locator("#saveArt").click();
 await page.screenshot({path:"nebenan/test-artifacts/desktop-art.png",fullPage:true});
 await page.locator('[data-channel="books"]').click();
 await page.locator(".book-card").first().waitFor({timeout:15000});
 await page.locator("#bookSearch").fill("urban design");
 await page.locator("#bookForm button[type=submit]").click();
 await page.locator("#bookLead h4").getByText(/interesting book/).waitFor();
 await page.locator(".book-card").nth(1).click();
 await page.locator("#saveBook").click();
 await page.locator("#openPocket").click();
 assert.equal(await page.locator(".pocket-entry").count(),3);
 await page.locator(".pocket-entry button").first().click();
 assert.equal(await page.locator(".pocket-entry").count(),2);
 await page.keyboard.press("Escape");
 await page.locator('[data-channel="earth"]').click();
 await page.locator(".event-item").first().waitFor({timeout:15000});
 assert.equal(await page.locator(".radar-point").count(),2);
 await page.locator(".event-item").first().click();
 await page.locator("#selectedEvent a").getByText("Originalmeldung").waitFor();
 await page.locator('[data-earth="events"]').click();
 await page.locator(".event-item strong").first().waitFor();
 assert.match(await page.locator(".event-item strong").first().textContent(),/Wildfire/);
 assert.equal(await page.locator(".radar-point").count(),1);
 await page.locator('[data-channel="sound"]').click();
 await page.locator(".track-row").first().waitFor({timeout:15000});
 assert.equal(await page.locator(".track-row").count(),2);
 await page.locator("#soundCountries [data-id=jp]").click();
 await page.locator("#soundListTitle").getByText(/JAPAN/).waitFor();
 await page.locator('[data-channel="play"]').click();
 assert.equal(await page.locator(".mixup-tiles > span").count(),6);
 assert.match(await page.locator("#panel-play").textContent(),/ALMOST/);
 assert.equal(await page.locator('a[href="./guess/"]').count()>=1,true);
 await page.locator('a[href="./guess/"]').last().waitFor();
 await page.locator("#surprise").click();
 assert.equal(await page.locator(".station[aria-selected=true]").count(),1);
 await page.locator('[data-channel="world"]').click();
 await page.screenshot({path:"nebenan/test-artifacts/desktop.png",fullPage:true});
 // Minimal mobile checks at common device sizes, including no sideways scrolling.
 for(const size of [{width:390,height:844},{width:360,height:740},{width:768,height:960}]){
  await page.setViewportSize(size);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,"No horizontal overflow: "+size.width);
  await page.locator('[data-channel="art"]').click();
  assert.equal(await page.locator("#panel-art").isVisible(),true);
  assert.equal(await page.locator("#panel-world").isHidden(),true);
  if(size.width===390)await page.screenshot({path:"nebenan/test-artifacts/mobile-art.png",fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-channel="world"]').click();
 await page.screenshot({path:"nebenan/test-artifacts/mobile.png",fullPage:true});
 assert.deepEqual(errors,[],"No unhandled browser errors");
 assert.ok(counters.weather>=1&&counters.art>=1&&counters.books>=1&&counters.earth>=1&&counters.sound>=1);
 console.log("PASS: FREQUENCY (6 channels, search, saving, real data adapters, keyboard, art, books, radar, music, guessing, mobile)");
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
