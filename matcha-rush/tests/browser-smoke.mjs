/**
 * End-to-end 3D browser regression test (Playwright is a CI-only dependency).
 * Start locally: npm install --no-save playwright@1.58.2
 *                npx playwright install chromium
 *                node matcha-rush/tests/browser-smoke.mjs
 */
import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import assert from "node:assert/strict";

const root=resolve(".");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,"http://localhost");
    const pathname=decodeURIComponent(url.pathname);
    const file=resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
    const bytes=await readFile(file);
    res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(bytes);
  }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+"/matcha-rush/?qa=1";
let browser;
const errors=[];
const get=page=>page.evaluate(()=>window.__MATCHA_QA__.snapshot());
async function step(title,fn){await fn();console.log("PASS: "+title);}
try{
  browser=await chromium.launch({headless:true,args:[
    "--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:820},deviceScaleFactor:1,reducedMotion:"reduce"});
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.getElementById("startButton")?.disabled,null,{timeout:45000});
  assert.ok(await page.locator("#gameCanvas").evaluate(c=>c.width>200&&c.height>200));
  await mkdir("matcha-rush/test-artifacts",{recursive:true});
  await step("Three.js WebGL runner and 3D world initialized",async()=>{
    assert.ok((await get(page)).sceneChildren>=5);
    await page.screenshot({path:"matcha-rush/test-artifacts/start-screen.png",fullPage:true});
  });
  await page.locator("#startButton").click();
  await page.locator("#screen").waitFor({state:"hidden"});
  await page.evaluate(()=>window.__MATCHA_QA__.clearObstacles());
  await page.screenshot({path:"matcha-rush/test-artifacts/desktop-run.png",fullPage:true});
  await step("three-lane keyboard movement",async()=>{
    await page.keyboard.press("ArrowRight");assert.equal((await get(page)).lane,2);
    await page.keyboard.press("ArrowLeft");assert.equal((await get(page)).lane,1);
  });
  await step("jump and slide physics",async()=>{
    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().y>.25,null,{timeout:3000});
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().y===0,null,{timeout:5000});
    await page.keyboard.press("ArrowDown");
    assert.ok((await get(page)).slide>0);
  });
  await step("Vanilla booster shoes activate by collecting 3D item",async()=>{
    await page.waitForTimeout(1100);
    await page.evaluate(()=>window.__MATCHA_QA__.grantPower("boost"));
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().powers.boost>0,null,{timeout:3000});
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().boostersVisible,null,{timeout:3000});
    assert.equal(await page.locator("#boostChip").isVisible(),true);
  });
  await step("mouth magnet attracts and collects neighboring 3D matchas",async()=>{
    await page.evaluate(()=>window.__MATCHA_QA__.setPower("magnet"));
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().mouthOpen>.5,null,{timeout:3000});
    const before=(await get(page)).cups;
    await page.evaluate(()=>window.__MATCHA_QA__.spawnMatcha(0));
    await page.waitForFunction(n=>window.__MATCHA_QA__.snapshot().cups>n,before,{timeout:4000});
    await page.locator("#magnetChip").waitFor({state:"visible",timeout:4000});
  });
  await step("2× multiplier doubles matcha score",async()=>{
    await page.evaluate(()=>window.__MATCHA_QA__.setPower("x2"));
    const previous=(await get(page)).score;
    await page.evaluate(()=>window.__MATCHA_QA__.collect());
    const next=(await get(page)).score;
    assert.ok(next-previous>=24);
    await page.locator("#x2Chip").waitFor({state:"visible",timeout:4000});
  });
  await step("double-matcha jetpack creates flight and visible 3D equipment",async()=>{
    await page.evaluate(()=>window.__MATCHA_QA__.setPower("jetpack"));
    await page.waitForFunction(()=>window.__MATCHA_QA__.snapshot().jetsVisible,null,{timeout:3000});
    assert.ok((await get(page)).y>=5);
    await page.screenshot({path:"matcha-rush/test-artifacts/matcha-jetpack.png",fullPage:true});
  });
  await step("giant matcha pogo launches player immediately",async()=>{
    await page.evaluate(()=>window.__MATCHA_QA__.setPower("pogo"));
    const snapshot=await get(page);
    assert.equal(snapshot.powers.jetpack,0);
    assert.ok(snapshot.vy>14);
    assert.ok(snapshot.y>0);
  });
  await step("pause freezes score and resume continues run",async()=>{
    await page.locator("#pauseButton").click();
    const paused=await get(page);
    assert.equal(paused.mode,"pause");
    await page.waitForTimeout(300);
    assert.equal((await get(page)).score,paused.score);
    await page.locator("#resumeButton").click();
    assert.equal((await get(page)).mode,"playing");
  });
  await step("collision → game over → restart and persisted records",async()=>{
    await page.evaluate(()=>window.__MATCHA_QA__.crash());
    assert.equal((await get(page)).mode,"gameover");
    assert.equal(await page.locator("#gameOverPanel").isVisible(),true);
    await page.locator("#restartButton").click();
    assert.equal((await get(page)).mode,"playing");
    assert.equal((await get(page)).lane,1);
    assert.equal((await get(page)).cups,0);
  });
  await step("touch controls on mobile",async()=>{
    const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:"reduce"});
    phone.on("pageerror",e=>errors.push("mobile: "+e.message));
    await phone.goto(base,{waitUntil:"domcontentloaded"});
    await phone.waitForFunction(()=>!document.getElementById("startButton")?.disabled,null,{timeout:45000});
    await phone.locator("#startButton").click();
    await phone.locator("#touchPad").waitFor({state:"visible"});
    await phone.locator("#touchRight").click();
    assert.equal((await get(phone)).lane,2);
    await phone.locator("#touchLeft").click();
    assert.equal((await get(phone)).lane,1);
    await phone.locator("#touchJump").click();
    await phone.waitForFunction(()=>window.__MATCHA_QA__.snapshot().y>0,null,{timeout:2500});
    await phone.screenshot({path:"matcha-rush/test-artifacts/mobile-run.png",fullPage:true});
    await phone.close();
  });
  if(errors.length)throw new Error("Browser JS exceptions: "+errors.join(" | "));
  console.log("ALL MATCHA RUSH 3D BROWSER TESTS PASSED");
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
