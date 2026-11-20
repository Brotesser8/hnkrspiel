import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,resolve,sep} from "node:path";
import assert from "node:assert/strict";
import {CATEGORIES} from "../data.mjs";

const root=resolve(".");
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://127.0.0.1"),path=decodeURIComponent(u.pathname);
  const file=resolve(root,"."+path+(path.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
  const content=await readFile(file);
  res.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(content);
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base="http://127.0.0.1:"+server.address().port+"/nebenan/guess/";
const picture='<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350"><rect width="350" height="350" fill="#ded7f3"/><circle cx="180" cy="175" r="113" fill="#6a8e7d"/><path d="M120 220L150 90L201 105L253 225" fill="#c4e8b2" stroke="#344f49" stroke-width="9"/><circle cx="145" cy="154" r="9" fill="#2c3c39"/><circle cx="219" cy="154" r="9" fill="#2c3c39"/></svg>';
let browser;
const setupMocks=async page=>{
 let lastWiki="";
 await page.route("https://en.wikipedia.org/w/api.php?**",route=>{
  const u=new URL(route.request().url());
  lastWiki=u.searchParams.get("titles")||"";
  route.fulfill({json:{query:{pages:[{pageid:33,title:lastWiki,pageimage:"Demo.svg",thumbnail:{source:"https://mixup.mock/image.svg"}}]}}});
 });
 await page.route("https://de.wikipedia.org/w/api.php?**",route=>{
  const u=new URL(route.request().url());lastWiki=u.searchParams.get("titles")||"";
  route.fulfill({json:{query:{pages:[{pageid:33,title:lastWiki,pageimage:"Demo.svg",thumbnail:{source:"https://mixup.mock/image.svg"}}]}}});
 });
 await page.route("https://api.artic.edu/api/v1/artworks/search?**",route=>{
  const q=new URL(route.request().url()).searchParams.get("q")||"";
  route.fulfill({json:{data:[{id:56,title:q,image_id:"demo",is_public_domain:true,artist_display:"An artist"}]}});
 });
 await page.route("https://openlibrary.org/search.json?**",route=>{
  const q=new URL(route.request().url()).searchParams.get("title")||"";
  route.fulfill({json:{docs:[{key:"/works/OL1W",title:q,cover_i:221}]}});
 });
 for(const url of ["https://mixup.mock/**","https://flagcdn.com/**","https://covers.openlibrary.org/**","https://www.artic.edu/iiif/2/**"]){
  await page.route(url,route=>route.fulfill({contentType:"image/svg+xml",body:picture}));
 }
 return ()=>lastWiki;
};
async function waitImage(page){
 await page.waitForFunction(()=>{
  const loading=document.querySelector("#imageLoader"),image=document.querySelector("#mysteryImage"),emoji=document.querySelector("#emojiFallback");
  return loading?.hidden&&(image&&!image.hidden||emoji&&!emoji.hidden);
 },null,{timeout:18000});
}
async function selectCorrectFlag(page){
 const source=await page.locator("#mysteryImage").getAttribute("src");
 const code=source?.match(/\/w640\/([a-z]{2})\.png/)?.[1];
 assert.ok(code,"Flag image should use a two-letter country code: "+source);
 const answer=CATEGORIES.find(c=>c.id==="flags").items.find(x=>x.page===code)?.answer;
 assert.ok(answer,"Flag not found "+code);
 await page.locator("#choiceAnswers button").filter({hasText:answer}).first().click();
 return answer;
}
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:980},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const latestWiki=await setupMocks(page);
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator("#topicGrid .topic-card").first().waitFor();
 assert.equal(await page.locator("#topicGrid .topic-card").count(),15);
 assert.equal(await page.locator("#selectedCount").textContent(),"4 AUSGEWÄHLT");
 const duplicates=await page.evaluate(()=>{const ids=[...document.querySelectorAll("[id]")].map(n=>n.id);return ids.filter((s,i)=>ids.indexOf(s)!==i);});
 assert.deepEqual(duplicates,[],"All IDs should be unique");
 await mkdir("nebenan/guess/test-artifacts",{recursive:true});
 await page.screenshot({path:"nebenan/guess/test-artifacts/setup-desktop.png",fullPage:true});

 // Flag-only 5-round game. Each answer is chosen based on the real image URL.
 await page.locator("#clearTopics").click();
 await page.locator('[data-topic="flags"]').click();
 await page.locator('[data-rounds="5"]').click();
 await page.locator("#startGame").click();
 assert.equal(await page.locator("#setupView").isHidden(),true);
 await waitImage(page);
 assert.equal(await page.locator("#choiceAnswers button").count(),4);
 await page.locator("#hintButton").click();
 assert.equal(await page.locator("#hintText").isVisible(),true);
 await selectCorrectFlag(page);
 assert.match(await page.locator("#feedback").textContent(),/Richtig/);
 assert.equal(await page.locator("#scoreValue").textContent(),"0075");
 await page.screenshot({path:"nebenan/guess/test-artifacts/playing-desktop.png",fullPage:true});
 for(let i=1;i<5;i++){
  await page.locator("#nextRound").click();
  await waitImage(page);
  await selectCorrectFlag(page);
 }
 await page.locator("#nextRound").click();
 assert.equal(await page.locator("#finishView").isVisible(),true);
 assert.equal(await page.locator("#finalCorrect").textContent(),"5 / 5");
 assert.equal(await page.locator("#finalScore").textContent(),"0475");
 await page.screenshot({path:"nebenan/guess/test-artifacts/finish-desktop.png",fullPage:true});
 await page.locator("#editMixButton").click();

 // Custom theme creation and editing.
 await page.locator("#customTitle").fill("Meine Lieblingsdinge");
 await page.locator("#customEntries").fill("Löwe | Lion | https://mixup.mock/image.svg\nTiger | Tiger | https://mixup.mock/image.svg\nPanda | Giant panda | https://mixup.mock/image.svg\nKamel | Camel | https://mixup.mock/image.svg");
 await page.locator("#saveCustom").click();
 assert.equal(await page.locator("#topicGrid .topic-card").count(),16);
 assert.equal(await page.locator(".custom-item").count(),1);
 assert.match(await page.locator("#selectedCount").textContent(),/2 AUSGEWÄHLT/);
 await page.locator(".custom-item button").first().click();
 await page.locator("#customTitle").fill("Mein eigenes Mix-Thema");
 await page.locator("#saveCustom").click();
 assert.match(await page.locator(".custom-item").textContent(),/Mein eigenes Mix-Thema/);
 await page.reload({waitUntil:"domcontentloaded"});
 assert.equal(await page.locator("#topicGrid .topic-card").count(),16);
 assert.match(await page.locator(".custom-item").textContent(),/Mein eigenes Mix-Thema/);

 // Own-topic-only, hidden tiles and typed answers; no Wikipedia needed.
 await page.locator("#clearTopics").click();
 const customBtn=page.locator('[data-topic^="custom-"]').first();
 await customBtn.click();
 await page.locator('[data-mode="type"]').click();
 await page.locator('[data-effect="tiles"]').click();
 await page.locator("#startGame").click();
 await waitImage(page);
 assert.equal(await page.locator("#coverTiles > span").count(),12);
 await page.locator("#hintButton").click();
 assert.equal(await page.locator('#coverTiles > span[style*="opacity: 0"]').count(),4);
 await page.locator("#skipButton").click();
 assert.equal(await page.locator("#feedback").isVisible(),true);
 await page.locator("#nextRound").click();
 await waitImage(page);
 assert.equal(await page.locator("#answerInput").isEnabled(),true);
 // Hidden answer is not accessible from the interface until the reveal.
 await page.locator("#answerInput").fill("absolutely wrong");
 await page.locator("#writeAnswer button").click();
 assert.match(await page.locator("#answerIntro").textContent(),/zweiten Versuch/);
 await page.locator("#answerInput").fill("still wrong");
 await page.locator("#writeAnswer button").click();
 assert.equal(await page.locator("#feedback").isVisible(),true);
 await page.locator("#quitGame").click();

 // Wikipedia source and typed scoring: deterministic answer obtained from the mocked request.
 await page.locator("#clearTopics").click();
 await page.locator('[data-topic="animals"]').click();
 await page.locator('[data-effect="blur"]').click();
 await page.locator("#startGame").click();
 await waitImage(page);
 assert.equal(await page.locator("#imageStage").evaluate(n=>n.classList.contains("mask-blur")),true);
 const firstWiki=latestWiki();
 const answer=CATEGORIES.find(c=>c.id==="animals").items.find(x=>x.page===firstWiki)?.answer;
 assert.ok(answer,"Wikipedia article title must match selected question: "+firstWiki);
 await page.locator("#answerInput").fill(answer);
 await page.locator("#writeAnswer button").click();
 assert.equal(await page.locator("#scoreValue").textContent(),"0150");
 await page.locator("#quitGame").click();

 // Mobile, including editor and active round.
 await page.locator("#clearTopics").click();
 await page.locator('[data-topic="flags"]').click();
 for(const viewport of [{width:390,height:844},{width:360,height:740},{width:768,height:900}]){
  await page.setViewportSize(viewport);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  assert.equal(overflow,false,"No horizontal setup overflow at "+viewport.width);
  if(viewport.width===390)await page.screenshot({path:"nebenan/guess/test-artifacts/setup-mobile.png",fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-mode="choice"]').click();
 await page.locator('[data-effect="shadow"]').click();
 await page.locator("#startGame").click();
 await waitImage(page);
 await page.screenshot({path:"nebenan/guess/test-artifacts/playing-mobile.png",fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
 assert.deepEqual(errors,[],"No unhandled page errors");
 console.log("PASS: MIXUP topics, API images, flags, hints, scoring, 5-round finish, custom create/edit/persist, writing, tiles, mobile");
}finally{
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
