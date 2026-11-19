import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import assert from "node:assert/strict";

const root=resolve(".");
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://localhost");
  const file=resolve(root,"."+decodeURIComponent(u.pathname)+(u.pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
  const content=await readFile(file);
  res.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(content);
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const base="http://127.0.0.1:"+server.address().port+"/nebenan/?qa=1";
let browser;
const svgTile='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="#dce8db"/><path d="M0 80 Q60 30 120 110 T256 90 M0 160 Q80 100 144 175 T256 170 M40 0 Q95 75 50 145 T80 256" stroke="#c2d2c1" stroke-width="3" fill="none"/><path d="M10 240 Q100 190 170 220 T280 225" stroke="#f9f9ed" stroke-width="10" fill="none"/></svg>';
const svgDog='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e8d6bd"/><ellipse cx="160" cy="110" rx="69" ry="71" fill="#8b684c"/><path d="M112 61 Q60 22 75 126 L117 105 M208 61 Q260 22 245 126 L203 105" fill="#634a39"/><circle cx="137" cy="104" r="8" fill="#191d1a"/><circle cx="184" cy="104" r="8" fill="#191d1a"/><ellipse cx="160" cy="135" rx="19" ry="12" fill="#2c2927"/><path d="M145 155 Q160 170 176 155" stroke="#2c2927" stroke-width="4" fill="none"/></svg>';
const svgMonster='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f9eee3"/><path d="M66 81 43 20 84 59 116 58 155 20 134 83 Q159 110 139 149 Q98 187 62 149 Q45 120 66 81Z" fill="#e0ad60" stroke="#8a624e" stroke-width="5"/><circle cx="82" cy="112" r="7" fill="#282821"/><circle cx="119" cy="112" r="7" fill="#282821"/><path d="M88 137 Q102 144 115 137" stroke="#38332b" stroke-width="4" fill="none"/></svg>';
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1365,height:900},reducedMotion:"reduce"});
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 const entries=[];
 for(let i=65;i<=90;i++)for(let j=65;j<=90;j++){
  const code=String.fromCharCode(i)+String.fromCharCode(j);
  if(entries.length>=125)break;
  if(code==="CH"||code==="JP")continue;
  entries.push({name:"Land "+code,alpha2Code:code,alpha3Code:code+"A",latlng:[0+i-65,0+j-65],capital:"Hauptstadt "+code,region:"Asia",currencies:[{code:"USD"}],flag:"🌐",timezones:["UTC+02:00"],population:20000,area:40000});
 }
 entries[0]={name:"Schweiz",alpha2Code:"CH",alpha3Code:"CHE",numericCode:"756",latlng:[46.8182,8.2275],capital:"Bern",region:"Europe",currencies:[{code:"CHF"}],timezones:["UTC+01:00"],flag:"🇨🇭",population:9000000,area:41285};
 entries[1]={name:"Japan",alpha2Code:"JP",alpha3Code:"JPN",numericCode:"392",latlng:[36,138],capital:"Tokyo",region:"Asia",currencies:[{code:"JPY"}],timezones:["UTC+09:00"],flag:"🇯🇵",population:124000000,area:377975};
 const bordersMock={
  type:"Topology",
  arcs:[
    [[5.5,45.4],[5,0],[0,2.8],[-5,0],[0,-2.8]],
    [[127,29],[21,0],[0,18],[-21,0],[0,-18]]
  ],
  objects:{countries:{type:"GeometryCollection",geometries:[
    {id:"756",type:"Polygon",arcs:[[0]],properties:{name:"Switzerland"}},
    {id:"392",type:"Polygon",arcs:[[1]],properties:{name:"Japan"}}
  ]}}
 };
 await page.route("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",route=>route.fulfill({json:bordersMock}));
 await page.route("https://countries.dev/countries**",route=>route.fulfill({json:entries}));
 await page.route("https://rss.marketingtools.apple.com/api/v2/**",route=>route.fulfill({json:{feed:{results:[{name:"Demo-Song eins",artistName:"Band A",url:"https://music.apple.com/"},{name:"Demo-Song zwei",artistName:"Band B",url:"https://music.apple.com/"}]}}}));
 await page.route("https://api.frankfurter.dev/v2/rate/**",route=>route.fulfill({json:{rate:.9,date:"2026-11-19"}}));
 await page.route("https://nagerholidays.com/api/v4/Holidays/**",route=>{
  const y=Number(route.request().url().match(/\/(\d{4})$/)?.[1]||2027);
  route.fulfill({json:[{date:y+"-12-25",localName:"Weihnachten",nationalHoliday:true,holidayTypes:["Public"]},{date:y+"-12-26",localName:"Feiertag zwei",nationalHoliday:true,holidayTypes:["Public"]},{date:y+"-01-01",localName:"Neujahr",nationalHoliday:true,holidayTypes:["Public"]}]});
 });
 await page.route("https://api.worldbank.org/v2/**",route=>route.fulfill({json:[{page:1},[{date:"2025",value:9000000}]]}));
 await page.route("https://earthquake.usgs.gov/earthquakes/feed/**",route=>route.fulfill({json:{features:[{properties:{place:"Südlich von Island",mag:3.1,time:Date.now()},geometry:{coordinates:[-20,64,10]}}]}}));
 await page.route("https://eonet.gsfc.nasa.gov/api/v3/**",route=>route.fulfill({json:{events:[{title:"Waldbrand im Testgebiet",geometry:[{type:"Point",coordinates:[20,40]}],categories:[{title:"Wildfires"}]}]}}));
 await page.route("https://ssd-api.jpl.nasa.gov/cad.api?**",route=>route.fulfill({json:{fields:["dist","cd","des","v_rel"],data:[[".015","2026-Nov-19","2026 AB","12.5"]]}}));
 await page.route("https://dog.ceo/api/breeds/image/random",route=>route.fulfill({json:{status:"success",message:"https://images.example.org/dog.png"}}));
 await page.route("https://images.example.org/**",route=>route.fulfill({body:route.request().url().includes("dog.png")?svgDog:svgMonster,contentType:"image/svg+xml"}));
 await page.route("https://pokeapi.co/api/v2/pokemon/**",route=>route.fulfill({json:{id:25,name:"pikachu",types:[{type:{name:"electric"}}],sprites:{other:{"official-artwork":{front_default:"https://images.example.org/poke.png"}}}}}));
 await page.route("https://api.transitous.org/api/v6/plan?**",route=>route.fulfill({json:{itineraries:[{startTime:"2026-11-19T09:00:00Z",endTime:"2026-11-19T09:43:00Z",duration:2580,transfers:0,legs:[{mode:"RAIL",routeShortName:"IC 8"}]}]}}));
 await page.route("https://tile.openstreetmap.org/**",route=>route.fulfill({body:svgTile,contentType:"image/svg+xml"}));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator("#countryName").getByText("Schweiz").waitFor({timeout:20000});
 await page.locator("#musicContent .track").first().waitFor({timeout:20000});
 await page.locator("#mapLoading").waitFor({state:"hidden",timeout:15000});
 await page.locator("#borderStatus").getByText(/Länderflächen/).waitFor({timeout:15000});
 assert.equal(await page.locator("#worldMap #mapFallback").count(),0,"map container must not include blocking fallback overlays");
 assert.ok(await page.evaluate(()=>window.__NEBENAN_QA__.map()?.getZoom()>=2),"Leaflet initialized");
 assert.equal(await page.locator("#mapQuakeCount").textContent(),"1");
 assert.equal(await page.locator("#mapNatureCount").textContent(),"1");
 await page.locator('[data-map-mode="quakes"]').click();
 assert.equal(await page.locator('[data-map-mode="quakes"]').getAttribute("aria-pressed"),"true");
 await page.locator('[data-map-mode="nature"]').click();
 assert.equal(await page.locator("#mapLegendQuakes").isHidden(),true);
 await page.locator('[data-map-mode="all"]').click();
 await page.locator("#mapContrast").click();
 assert.equal(await page.locator("#mapShell").evaluate(x=>x.classList.contains("map-high-contrast")),true);
 await page.locator("#mapContrast").click();
 await page.locator("#mapHelp").click();
 assert.equal(await page.locator("#mapHelpPanel").isVisible(),true);
 await page.keyboard.press("Escape");
 assert.equal(await page.locator("#mapHelpPanel").isHidden(),true);
 await page.locator("#mapExpand").click();
 assert.equal(await page.locator("#mapShell").evaluate(x=>x.classList.contains("map-expanded")),true);
 await page.keyboard.press("Escape");
 assert.equal(await page.locator("#mapShell").evaluate(x=>x.classList.contains("map-expanded")),false);
 await page.locator("#mapZoomIn").click();
 assert.ok((await page.locator("#mapZoomLevel").textContent()).startsWith("ZOOM "));
 await page.evaluate(()=>window.__NEBENAN_QA__.map().setView([46.8,8.0],6,{animate:false}));
 const landClick=await page.evaluate(()=>{
   const map=window.__NEBENAN_QA__.map();
   const p=map.latLngToContainerPoint([46.8,8.0]);
   const box=document.getElementById("worldMap").getBoundingClientRect();
   return {x:box.left+p.x,y:box.top+p.y};
 });
 await page.mouse.click(landClick.x,landClick.y);
 await page.locator("#countryName").getByText("Schweiz").waitFor();
 await page.locator("#countryStatus").getByText(/Auf der Karte ausgewählt/).waitFor();
 await page.locator("#mapReset").click();
 assert.equal(await page.locator(".source-item").count(),12);
 assert.equal(await page.locator("#musicContent .track").count(),2);
 await page.locator("#countryInput").fill("Japan");
 await page.locator(".search-submit").click();
 await page.locator("#countryName").getByText("Japan").waitFor();
 assert.equal(await page.locator("#currencyFrom").inputValue(),"JPY");
 await page.locator("#amountInput").fill("20");
 await page.locator("#exchangeForm button[type=submit]").click();
 await page.locator("#currencyContent").getByText(/18/).waitFor({timeout:9000});
 await page.locator("#quakeRange").selectOption("week");
 await page.locator("#quakeContent li").first().waitFor();
 await page.locator("#dogButton").click();
 await page.locator("#dogContent img").waitFor();
 await page.locator("#journeyButton").click();
 await page.locator(".journey-result").first().waitFor({timeout:20000});
 await page.locator("#pokemonReveal").click();
 await page.locator("#pokemonAnswer").getByText(/PIKACHU/).waitFor();
 await page.locator("#quizOptions button").first().click();
 assert.match(await page.locator("#quizFeedback").textContent(),/gehört zu/);
 await mkdir("nebenan/test-artifacts",{recursive:true});
 await page.screenshot({path:"nebenan/test-artifacts/desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:"nebenan/test-artifacts/mobile.png",fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3),false,"no horizontal overflow on mobile");
 assert.deepEqual(errors,[],"no uncaught page errors");
 console.log("PASS: NEBENAN desktop, map, country selection, charts, currency, routes, dog, game and mobile");
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
