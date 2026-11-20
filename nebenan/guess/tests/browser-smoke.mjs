import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,resolve,sep} from "node:path";
import assert from "node:assert/strict";
import {OBJECTS,valueToSlider} from "../data.mjs";

const repoRoot=resolve(".");
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".json":"application/json"};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://127.0.0.1"),name=decodeURIComponent(u.pathname);
  const file=resolve(repoRoot,"."+name+(name.endsWith("/")?"index.html":""));
  if(!file.startsWith(repoRoot+sep)){res.writeHead(403);res.end("Forbidden");return;}
  const bytes=await readFile(file);
  res.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(bytes);
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port+"/nebenan/guess/";
const ids=["scale","distance","time","weather"];
let browser;
async function only(page,mode){
 for(const name of ids){
  const b=page.locator('.mode-card[data-mode="'+name+'"]');
  const active=await b.getAttribute("aria-pressed")==="true";
  if(active!==(name===mode))await b.click();
 }
 assert.equal(await page.locator(".mode-card[aria-pressed=true]").count(),1);
}
async function chooseSlider(page,value){
 await page.locator("#guessSlider").evaluate((n,v)=>{n.value=String(v);n.dispatchEvent(new Event("input",{bubbles:true}));},value);
}
async function start(page,mode){
 await only(page,mode);
 await page.locator("#startButton").click();
 await page.locator("#lockButton").waitFor({state:"visible"});
 await page.waitForFunction(()=>!document.querySelector("#guessSlider").disabled,{timeout:12000});
}
async function finishRounds(page){
 for(let index=0;index<5;index++){
  if(index)await page.waitForFunction(()=>!document.querySelector("#guessSlider").disabled);
  await page.locator("#lockButton").click();
  await page.locator("#revealPanel").waitFor({state:"visible"});
  assert.equal(await page.locator("#guessSlider").isDisabled(),true);
  assert.equal(await page.locator("#revealSource").getAttribute("target"),"_blank");
  await page.locator("#nextButton").click();
 }
 assert.equal(await page.locator("#finalView").isVisible(),true);
 assert.equal(await page.locator(".history-row").count(),5);
 await page.locator("#reconfigureButton").click();
}

try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:940},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 let weatherHits=0;
 await page.route("https://api.open-meteo.com/v1/forecast?**",route=>{weatherHits++;route.fulfill({json:{current:{temperature_2m:23.6,time:"2026-11-20T14:00"}}});});
 await page.goto(base,{waitUntil:"domcontentloaded"});
 assert.equal(await page.locator(".mode-card").count(),4);
 assert.equal(await page.locator(".mode-card.selected").count(),3);
 assert.equal(await page.locator(".custom-expander").count(),1);
 await mkdir("nebenan/guess/test-artifacts",{recursive:true});
 await page.screenshot({path:"nebenan/guess/test-artifacts/almost-setup-desktop.png",fullPage:true});

 // Mode #1: actual draggable SVG heights, exact fact overlay, hint penalty, full five-round game.
 await page.locator("#toggleCustom").click();
 await page.locator("#customRef").fill("Mein Glockenturm");
 await page.locator("#customRefHeight").fill("60");
 await page.locator("#customTarget").fill("Mein Rathaus");
 await page.locator("#customTargetHeight").fill("90");
 await page.locator("#customForm button[type=submit]").click();
 assert.equal(await page.locator(".custom-row").count(),1);
 await page.reload({waitUntil:"domcontentloaded"});
 assert.equal(await page.locator(".custom-row").count(),1,"Custom question must persist in localStorage");
 await page.locator('[data-rounds="5"]').click();
 await start(page,"scale");
 assert.equal(await page.locator("#referenceArt svg").count(),1);
 assert.equal(await page.locator("#targetArt svg").count(),1);
 const initial=await page.locator("#estimateReadout").textContent();
 const target=await page.locator("#targetSpecimen").boundingBox();
 assert.ok(target&&target.height>40);
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2-40,{steps:8});
 await page.mouse.up();
 assert.notEqual(await page.locator("#estimateReadout").textContent(),initial,"Direct drag must affect guess");
 const labels=await page.locator(".scale-labels strong").allTextContents();
 const figures=Object.values(OBJECTS);
 // User-defined rounds also work; all source values in the fixture are known.
 const value=name=>figures.find(x=>x.name===name)?.height||(name==="Mein Glockenturm"?60:name==="Mein Rathaus"?90:null);
 const trueRatio=value(labels[1])/value(labels[0]);
 assert.ok(Number.isFinite(trueRatio));
 await chooseSlider(page,Math.round(valueToSlider(trueRatio,.25,3.3)));
 await page.locator("#hintButton").click();
 assert.equal(await page.locator("#hintMessage").isVisible(),true);
 await page.locator("#lockButton").click();
 await page.locator("#revealPanel").waitFor({state:"visible"});
 assert.ok(await page.locator("#revealSource").getAttribute("href"));
 assert.ok(await page.locator(".scale-reveal-line").count()===1);
 const withHint=parseInt((await page.locator("#revealPoints").textContent()).replace(/[^0-9]/g,""),10);
 assert.ok(withHint>=680&&withHint<=700,"Hint must cap score at 700, received "+withHint);
 await page.screenshot({path:"nebenan/guess/test-artifacts/almost-reveal-desktop.png",fullPage:true});
 // Finish the remaining 4 scale rounds.
 for(let i=1;i<5;i++){
  await page.locator("#nextButton").click();
  await page.waitForFunction(()=>!document.querySelector("#guessSlider").disabled);
  await page.locator("#lockButton").click();
  await page.locator("#revealPanel").waitFor({state:"visible"});
 }
 await page.locator("#nextButton").click();
 assert.equal(await page.locator(".history-row").count(),5);
 await page.screenshot({path:"nebenan/guess/test-artifacts/almost-finish-desktop.png",fullPage:true});
 await page.locator("#reconfigureButton").click();

 // Mode #2: slider and distance marker actually respond.
 await start(page,"distance");
 assert.equal(await page.locator(".place-pin").count(),2);
 const firstDistance=await page.locator("#estimateReadout").textContent();
 await chooseSlider(page,950);
 assert.notEqual(await page.locator("#estimateReadout").textContent(),firstDistance);
 assert.ok(parseFloat(await page.locator("#distanceFill").evaluate(n=>getComputedStyle(n).width))>0);
 await page.locator("#lockButton").click();
 assert.match(await page.locator("#revealFact").textContent(),/Luftlinie/);
 await page.locator("#backButton").click();

 // Mode #3: date placement, actual marker and historic source.
 await start(page,"time");
 assert.equal(await page.locator(".timeline-pin").count(),1);
 await chooseSlider(page,900);
 assert.ok(Number(await page.locator("#timelinePin strong").textContent())>1990);
 await page.locator("#lockButton").click();
 assert.equal(await page.locator(".timeline-pin-actual").count(),1);
 await page.locator("#backButton").click();

 // Mode #4: real API adapter (mocked in CI), proper answer reveal and source.
 await start(page,"weather");
 assert.equal(weatherHits,1,"Weather API must not fetch for unrelated game types");
 assert.equal(await page.locator(".thermo-outline").count(),1);
 await chooseSlider(page,700);
 await page.locator("#lockButton").click();
 assert.match(await page.locator("#revealedTruth").textContent(),/23,6 °C/);
 assert.match(await page.locator("#revealSource").getAttribute("href"),/open-meteo/);
 await page.locator("#backButton").click();
 // Switching away should not fire another weather API call.
 assert.equal(weatherHits,1);

 // Simulate unavailable weather service in a separate browser context.
 const broken=await browser.newPage({viewport:{width:800,height:900},reducedMotion:"reduce"});
 const brokenErrors=[];broken.on("pageerror",x=>brokenErrors.push(x.message));
 await broken.route("https://api.open-meteo.com/v1/forecast?**",r=>r.fulfill({status:503,body:"Offline"}));
 await broken.goto(base,{waitUntil:"domcontentloaded"});
 await broken.locator('[data-rounds="5"]').click();
 await only(broken,"weather");await broken.locator("#startButton").click();
 await broken.locator("#revealStatus").getByText("SIGNAL LOST").waitFor();
 assert.equal(await broken.locator("#lockButton").isHidden(),true);
 assert.match(await broken.locator("#revealFact").textContent(),/keine Werte erfunden|keine Schätzung bewertet/i);
 await broken.locator("#nextButton").click();
 await broken.locator("#revealStatus").getByText("SIGNAL LOST").waitFor();
 assert.deepEqual(brokenErrors,[]);
 await broken.close();

 // Responsive rendering. A touch-sized target and no horizontally clipped controls.
 for(const viewport of [{width:390,height:844},{width:360,height:740},{width:768,height:920}]){
  await page.setViewportSize(viewport);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"Setup overflow at "+viewport.width);
  if(viewport.width===390)await page.screenshot({path:"nebenan/guess/test-artifacts/almost-setup-mobile.png",fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await start(page,"scale");
 await page.screenshot({path:"nebenan/guess/test-artifacts/almost-play-mobile.png",fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"Mobile play horizontally clipped");
 await page.locator("#lockButton").click();
 await page.locator("#revealPanel").waitFor({state:"visible"});
 await page.screenshot({path:"nebenan/guess/test-artifacts/almost-reveal-mobile.png",fullPage:true});
 assert.deepEqual(errors,[],"No unhandled exceptions");
 console.log("PASS: ALMOST desktop+mobile, scaling drag, factual overlays, precision and score, custom persistence, timeline, routes, live weather and offline fallback");
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
