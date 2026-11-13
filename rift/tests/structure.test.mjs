import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const html = read("index.html");
const app = read("app.js");
const css = read("style.css");

test("all DOM IDs referenced by the JS exist exactly once in HTML", () => {
  const expected = app.match(/const dom = Object.fromEntries\(\[([\s\S]*?)\]\.map\(/);
  assert.ok(expected, "DOM registry missing");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, "Duplicate IDs in markup");
  for (const [, id] of expected[1].matchAll(/"([^"]+)"/g)) {
    assert.ok(ids.includes(id), "Missing DOM element: " + id);
  }
});

test("the 3D dependency, CSS, favicon and app code are linked", () => {
  assert.match(html, /globe\.gl@2\.46\.2/);
  assert.match(html, /href="\.\/style\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /href="\.\/favicon\.svg"/);
});

test("the UI has accessible labels for its game actions", () => {
  assert.match(html, /aria-label="Ansicht wählen"/);
  assert.match(html, /aria-label="Ereignisse filtern"/);
  assert.match(html, /aria-label="Interaktiver, drehbarer Erdglobus/);
  assert.match(html, /id="lockGuess"/);
  assert.match(html, /id="hintButton"/);
});

test("styles define responsive and reduced motion variants", () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
