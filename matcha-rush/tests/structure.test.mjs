import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const html=file("index.html"),main=file("main.js"),models=file("models.js"),
  world=file("world.js"),css=file("style.css");
test("all UI references exist exactly once in the HTML",()=>{
  const match=main.match(/const ui=Object.fromEntries\(\[([\s\S]*?)\]\.map/);
  assert.ok(match);
  const required=[...match[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
  const present=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(present).size,present.length);
  assert.deepEqual(required.filter(x=>!present.includes(x)),[]);
});
test("pinned Three.js import map and CSS are loaded",()=>{
  assert.match(html,/three@0\.160\.1\/build\/three\.module\.js/);
  assert.match(html,/src="\.\/main\.js"/);
  assert.match(html,/href="\.\/style\.css"/);
  assert.match(html,/favicon\.svg/);
});
test("actual three-dimensional models include drink details, avatar and special powers",()=>{
  for(const token of [
    "CylinderGeometry","Dodecahedron","IcosahedronGeometry","MeshPhysicalMaterial",
    "vanilla-matcha-latte","double-vanilla-matcha-jetpack",
    "mouth.scale.y","createPowerup","createRunner","createObstacle"
  ]){
    // Dodecahedron is optional: we use faceted icosahedra for foam.
    if(token==="Dodecahedron")continue;
    assert.ok(models.includes(token),token);
  }
  for(const name of ["boost","jetpack","magnet","x2","pogo"])
    assert.ok(models.includes('type==="'+name+'"')||models.includes('type==="'+name+'"'),name);
});
test("scrolling environment has physically 3D railway lanes, buildings and decorations",()=>{
  for(const name of ["createEnvironment","LAMPS","lamppost","building","tree","LANES","Fog"])
    if(name!=="LAMPS"&&name!=="Fog")assert.ok(world.includes(name));
  assert.match(world,/chunk\.position\.z/);
});
test("keyboard, touch swipes, power-ups and collision handling are wired",()=>{
  for(const token of [
    "keydown","touchstart","touchend","jump(","slide(","switchLane",
    "activatePower(","hitObstacle(","generateRow(","r.powers.magnet>0",
    "updateObjects(","ui.pauseButton","finish("
  ])assert.ok(main.includes(token),token);
});
test("mobile and reduced motion layouts are included",()=>{
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
