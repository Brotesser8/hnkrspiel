/**
 * End-to-end smoke test for the actual 3D browser runtime.
 * Run separately with Playwright installed:
 *   npm install --no-save playwright@1.58.2
 *   npx playwright install chromium
 *   node tomato-takeover/tests/browser-smoke.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";

const root=resolve(".");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,"http://localhost");
    const pathname=decodeURIComponent(url.pathname);
    let file=resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
    const data=await readFile(file);
    res.writeHead(200,{"Content-Type":MIME[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
let browser;
const errors=[];
try{
  browser=await chromium.launch({headless:true,args:[
    "--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle",
    "--use-angle=swiftshader","--disable-gpu-sandbox"
  ]});
  const page=await browser.newPage({
    viewport:{width:1440,height:900},deviceScaleFactor:1,
    permissions:[],reducedMotion:"reduce"
  });
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(["error","warning"].includes(message.type()))console.log("BROWSER "+message.type()+": "+message.text().slice(0,400));});
  await page.goto("http://127.0.0.1:"+port+"/tomato-takeover/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.querySelector("#startButton")?.disabled,null,{timeout:55000});
  assert.match(await page.locator("#introStatus").innerText(),/bereit/);
  await page.locator("#startButton").click();
  await page.locator("#introOverlay").waitFor({state:"hidden"});
  const canvas=page.locator("#gameCanvas");
  assert.ok(await canvas.evaluate(el=>el.width>0&&el.height>0),"3D canvas has dimensions");
  console.log("PASS: WebGL initialized, first-person game started");
  await page.keyboard.down("w");
  await page.waitForTimeout(450);
  await page.keyboard.up("w");
  await page.keyboard.press("Space");
  await page.waitForFunction(()=>document.querySelector("#tomatoCount")?.textContent==="17");
  console.log("PASS: movement and first-person tomato throw");
  await mkdir("tomato-takeover/test-artifacts",{recursive:true});
  await page.screenshot({path:"tomato-takeover/test-artifacts/world-start.png",fullPage:true});
  await page.locator("#recordButton").click();
  await page.waitForSelector("#filmFrame:not([hidden])");
  await page.waitForTimeout(1600);
  await page.locator("#recordButton").click();
  try{await page.waitForSelector("#previewView:not([hidden])",{timeout:15000});}
  catch(error){console.error("REC DIAGNOSTIC:",await page.evaluate(()=>({notice:document.querySelector("#notification")?.textContent,recLabel:document.querySelector("#recordLabel")?.textContent,frameHidden:document.querySelector("#filmFrame")?.hidden,menuHidden:document.querySelector("#menuOverlay")?.hidden,previewHidden:document.querySelector("#previewView")?.hidden})));throw error;}
  assert.ok((await page.locator("#previewVideo").getAttribute("src"))?.startsWith("blob:"));
  console.log("PASS: real canvas.captureStream & MediaRecorder footage preview");
  await page.locator("#postClip").click();
  await page.waitForSelector("#socialView:not([hidden])");
  await page.waitForSelector(".post");
  const postCount=await page.locator(".post").count();
  assert.equal(postCount,1);
  const cash=await page.locator("#cashValue").innerText();
  console.log("PASS: in-game SplatStream post published; cash="+cash);
  await page.locator(".post-media").first().click();
  await page.waitForSelector("#playerOverlay:not([hidden])");
  assert.ok((await page.locator("#feedVideo").getAttribute("src"))?.startsWith("blob:"));
  await page.locator("#closePlayer").click();
  console.log("PASS: posted video playable from simulated social feed");
  await page.locator("#closeMenu").click();
  await page.locator("#mapButton").click();
  await page.waitForSelector("#travelView:not([hidden])");
  await page.locator(".destination-card").nth(1).locator("button").click();
  await page.waitForFunction(()=>document.querySelector("#districtName")?.textContent==="PIXELFEST");
  console.log("PASS: travel costs & distinct 3D concert level");
  await mkdir("tomato-takeover/test-artifacts",{recursive:true});
  await page.screenshot({path:"tomato-takeover/test-artifacts/browser-smoke.png",fullPage:true});
  // Also cover touch-sized layouts and the on-screen throw/travel controls.
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:"reduce"});
  phone.on("pageerror",error=>errors.push("mobile: "+error.message));
  await phone.goto("http://127.0.0.1:"+port+"/tomato-takeover/",{waitUntil:"domcontentloaded"});
  await phone.waitForFunction(()=>!document.querySelector("#startButton")?.disabled,null,{timeout:55000});
  await phone.locator("#startButton").click();
  await phone.locator("#touchControls").waitFor({state:"visible"});
  await phone.locator("#throwButton").click();
  await phone.waitForFunction(()=>document.querySelector("#tomatoCount")?.textContent==="17");
  await phone.locator("#mapButton").click();
  await phone.waitForSelector("#travelView:not([hidden])");
  await phone.screenshot({path:"tomato-takeover/test-artifacts/mobile-smoke.png",fullPage:true});
  await phone.close();
  console.log("PASS: mobile touch HUD, throw button and travel menu");
  if(errors.length)throw Error("Browser JavaScript errors: "+errors.join(" | "));
  console.log("ALL END-TO-END SMOKE TESTS PASSED");
}catch(error){
  console.error("BROWSER SMOKE FAILURE:",error);
  throw error;
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
