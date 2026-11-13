import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = name => readFileSync(new URL("../"+name,import.meta.url),"utf8");
const html=load("index.html"),css=load("style.css"),app=load("app.js"),world=load("world.js");
const refs=app.match(/const ui = Object\.fromEntries\(\[([\s\S]*?)\]\.map\(/);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const requested=[...refs[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);

test("every app UI element exists and IDs are unique", () => {
  assert.ok(refs);
  assert.equal(new Set(ids).size,ids.length);
  const missing=requested.filter(id=>!ids.includes(id));
  assert.deepEqual(missing,[]);
});

test("HTML uses pinned three.js import map and correct assets", () => {
  assert.match(html,/three@0\.160\.1\/build\/three\.module\.js/);
  assert.match(html,/src="\.\/app\.js"/);
  assert.match(html,/href="\.\/style\.css"/);
  assert.match(html,/href="\.\/favicon\.svg"/);
  assert.match(app,/import \* as THREE from "three"/);
  assert.match(world,/import \* as THREE from "three"/);
});

test("controls and mobile interactions are implemented", () => {
  for(const event of ["keydown","keyup","pointerlockchange","pointerdown","pointermove"]){
    assert.ok(app.includes(event),"missing "+event);
  }
  assert.match(html,/data-move="forward"/);
  assert.match(html,/data-move="left"/);
  assert.match(html,/data-move="right"/);
  assert.match(html,/data-move="backward"/);
});

test("recordings contain canvas footage, can be posted and replayed", () => {
  assert.match(app,/captureStream\(24\)/);
  assert.match(app,/new MediaRecorder\(stream,opts\)/);
  assert.match(app,/recorder\.onstop/);
  assert.match(app,/URL\.createObjectURL\(blob\)/);
  assert.match(app,/indexedDB\.open/);
  assert.match(app,/estimatePost\(/);
  assert.match(app,/saveVideo\(/);
  assert.match(app,/openPlayer\(item\)/);
  assert.match(app,/returningAudience\(/);
});

test("3D level has original fully procedural characters and three venue types", () => {
  assert.match(world,/createCity\(/);
  assert.match(world,/createFestival\(/);
  assert.match(world,/createSummit\(/);
  assert.match(world,/createNPC|makeNPC/);
  assert.match(world,/new THREE\.DodecahedronGeometry/);
  assert.match(world,/new THREE\.PointLight/);
  assert.match(world,/npcs\.push/);
});

test("styles respond to screen size and reduced motion", () => {
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
