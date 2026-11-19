import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import assert from "node:assert/strict";
const root=resolve(".");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,"http://localhost").pathname;
    const file=resolve(root,"."+path+(path.endsWith("/")?"index.html":""));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end("Forbidden");return;}
    const data=await readFile(file);res.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream"});res.end(data);
  }catch{res.writeHead(404);res.end("Not Found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const address="http://127.0.0.1:"+server.address().port+"/schweiz-atlas/";
let browser;
try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1360,height:950},reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://api3.geo.admin.ch/rest/services/height?**",r=>r.fulfill({json:{height:"408.2"}}));
  await page.route("https://api3.geo.admin.ch/rest/services/profile.json?**",r=>r.fulfill({json:[{dist:0,alts:{COMB:450}},{dist:1500,alts:{COMB:650}},{dist:3000,alts:{COMB:510}}]}));
  await page.route("https://api3.geo.admin.ch/rest/services/ech/SearchServer?**",r=>r.fulfill({json:{results:[{attrs:{label:"<b>Luzern</b>",lat:47.0502,lon:8.3093}}]}}));
  await page.route("https://api.gbif.org/v1/occurrence/search?**",r=>r.fulfill({json:{results:[{scientificName:"Rana temporaria",kingdom:"Animalia",eventDate:"2025-05-15"}]}}));
  const wikiMock={query:{pages:{"42":{pageid:42,title:"Zürich",extract:"Zürich ist eine Schweizer Stadt am See."}}}};
  await page.route("https://de.wikipedia.org/w/api.php?**",r=>r.fulfill({json:wikiMock}));
  await page.route("https://earthquake.usgs.gov/fdsnws/event/1/query?**",r=>r.fulfill({json:{features:[{properties:{place:"bei Luzern",mag:1.8,time:Date.now()}}]}}));
  await page.route("https://api.worldbank.org/v2/country/CHE/indicator/SP.POP.TOTL?**",r=>r.fulfill({json:[{page:1},[{value:9000000,date:"2025"}]]}));
  await page.route("https://nagerholidays.com/api/v4/Holidays/CH/**",r=>{
    const year=Number(r.request().url().match(/\/(\d{4})$/)?.[1]||new Date().getFullYear());
    r.fulfill({json:[{date:year+"-12-25",name:"Weihnachten",nationalHoliday:true,holidayTypes:["Public"]},{date:year+"-12-26",name:"Stephanstag",nationalHoliday:false,subdivisionCodes:["CH-ZH"],holidayTypes:["Public"]},{date:year+"-01-01",name:"Neujahr",nationalHoliday:true,holidayTypes:["Public"]}]});
  });
  await page.goto(address,{waitUntil:"domcontentloaded"});
  await page.locator("#heightValue").getByText("408").waitFor({timeout:25000});
  assert.ok(await page.locator("#statsContent").getByText(/9.000.000|9 000 000|9’000’000|9'000'000/).count());
  assert.equal((await page.locator(".source-entry").count()),32);
  await page.locator("#citySelect").selectOption("bern");
  assert.equal(await page.locator("#placeTitle").textContent(),"Bern");
  await page.locator("#placeSearch").fill("Luzern");
  await page.locator(".search-button").click();
  await page.locator("#placeTitle").getByText("Luzern").waitFor();
  await page.locator("[data-filter=excluded]").click();
  assert.ok((await page.locator(".source-entry").count())<32);
  await page.locator("#sourceSearch").fill("MusicBrainz");
  assert.equal((await page.locator(".source-entry").count()),1);
  await page.locator("#sourceSearch").fill("");
  await page.locator("[data-filter=all]").click();
  await page.locator("[data-layer=geology]").click();
  assert.equal(await page.locator("[data-layer=geology]").getAttribute("aria-pressed"),"true");
  await mkdir("schweiz-atlas/test-artifacts",{recursive:true});
  await page.screenshot({path:"schweiz-atlas/test-artifacts/desktop.png",fullPage:true});
  await page.locator("#profileButton").click();
  await page.locator("#map").scrollIntoViewIfNeeded();
  const box=await page.locator("#map").boundingBox();
  if(box){
    await page.mouse.click(box.x+box.width*.45,box.y+box.height*.54);
    await page.mouse.click(box.x+box.width*.57,box.y+box.height*.57);
    await page.locator("#profilePlot svg").waitFor({timeout:20000});
    assert.match(await page.locator("#profileStats").textContent(),/km/);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:"schweiz-atlas/test-artifacts/mobile.png",fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
  assert.equal(overflow,false,"mobile layout should not overflow horizontally");
  assert.deepEqual(errors,[],"No page-level JavaScript exceptions");
  console.log("PASS: atlas interactive desktop / mobile smoke tests");
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
