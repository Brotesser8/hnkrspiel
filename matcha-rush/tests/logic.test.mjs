import test from "node:test";
import assert from "node:assert/strict";
import {
 LANES, POWER, POWER_TYPES, SETTINGS, SAVE_KEY, newRun, restoreRecords, tickRun,
 switchLane, jump, slide, activatePower, takeMatcha, hitObstacle, generateRow,
 grade, formatTime, formatNumber
} from "../logic.mjs";

const running=()=>{const s=newRun();s.active=true;return s;};
const fakeRandom=(seed=9)=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};

test("game starts with 3 equally spaced lanes and valid initial state",()=>{
 assert.deepEqual(LANES,[-2.85,0,2.85]);
 const s=newRun();
 assert.equal(s.lane,1);
 assert.equal(s.matchas,0);
 assert.equal(s.active,false);
 assert.equal(s.powers.jetpack,0);
 assert.equal(POWER_TYPES.length,5);
});

test("left/right movement stays inside 3 lanes even with rapid input",()=>{
 const s=running();
 for(let i=0;i<10;i++)switchLane(s,-1);
 assert.equal(s.lane,0);
 for(let i=0;i<10;i++)switchLane(s,1);
 assert.equal(s.lane,2);
 switchLane(s,-1);assert.equal(s.lane,1);
});

test("jump, roll, single jump restriction and landing work",()=>{
 const s=running();
 assert.equal(jump(s),true);
 assert.equal(jump(s),false);
 assert.ok(s.vy>0);
 for(let i=0;i<100;i++)tickRun(s,.04);
 assert.equal(s.y,0);
 assert.equal(slide(s),true);
 assert.ok(s.slide>0);
 assert.equal(jump(s),true);
 assert.equal(s.slide,0);
});

test("boost shoes provide a much higher jump for twelve seconds",()=>{
 const normal=running();jump(normal);
 const boost=running();activatePower(boost,"boost");jump(boost);
 assert.ok(boost.vy>normal.vy*1.3);
 assert.equal(boost.powers.boost,12);
 for(let i=0;i<310;i++)tickRun(boost,.04);
 assert.equal(boost.powers.boost,0);
});

test("double-matcha jet keeps runner aloft, then permits landing",()=>{
 const s=running();activatePower(s,"jetpack");
 assert.equal(s.y,SETTINGS.jetAltitude);
 for(let i=0;i<80;i++)tickRun(s,.04);
 assert.equal(s.y,SETTINGS.jetAltitude);
 assert.equal(jump(s),false);
 for(let i=0;i<200;i++)tickRun(s,.04);
 assert.equal(s.powers.jetpack,0);
 for(let i=0;i<70;i++)tickRun(s,.04);
 assert.equal(s.y,0);
});

test("mouth magnet activates for exactly 12 seconds (physics elsewhere)",()=>{
 const s=running();
 assert.equal(activatePower(s,"magnet"),true);
 assert.equal(s.powers.magnet,12);
 for(let i=0;i<301;i++)tickRun(s,.04);
 assert.equal(s.powers.magnet,0);
});

test("2x score doubles distance points and matcha pickup points",()=>{
 const plain=running(),bonus=running();
 activatePower(bonus,"x2");
 tickRun(plain,.04);tickRun(bonus,.04);
 assert.ok(Math.abs(bonus.score-plain.score*2)<1e-9);
 assert.equal(takeMatcha(plain,1),12);
 assert.equal(takeMatcha(bonus,1),24);
 assert.equal(bonus.matchas,1);
 assert.equal(bonus.powers.x2,13-.04);
});

test("giant pogo matcha launches instantly and is not a timed bonus",()=>{
 const s=running();activatePower(s,"pogo");
 assert.equal(s.pogoFlight,true);
 assert.equal(s.vy,SETTINGS.pogoJump);
 assert.ok(s.y>0);
 for(let i=0;i<130;i++)tickRun(s,.04);
 assert.equal(s.y,0);
 assert.equal(s.pogoFlight,false);
});

test("hazards are avoidable with correct controls; jetpack always protects",()=>{
 const s=running();
 assert.equal(hitObstacle(s,"train"),true);
 assert.equal(hitObstacle(s,"crate"),true);
 assert.equal(hitObstacle(s,"barrier"),true);
 assert.equal(hitObstacle(s,"arch"),true);
 slide(s);
 assert.equal(hitObstacle(s,"arch"),false);
 s.slide=0;s.y=1.3;
 assert.equal(hitObstacle(s,"crate"),false);
 assert.equal(hitObstacle(s,"barrier"),false);
 assert.equal(hitObstacle(s,"train"),true);
 s.y=4;
 assert.equal(hitObstacle(s,"train"),false);
 activatePower(s,"jetpack");
 for(const type of ["train","arch","crate","barrier"])
   assert.equal(hitObstacle(s,type),false);
});

test("row generator never blocks all lanes and emits all 5 power-ups",()=>{
 const rng=fakeRandom(33),seen=new Set();
 for(let i=0;i<450;i++){
   const row=generateRow(i,rng);
   const blocked=new Set(row.obstacles.map(o=>o.lane));
   assert.ok(blocked.size<=2,"blocked 3 lanes");
   assert.ok(row.obstacles.every(o=>o.lane>=0&&o.lane<=2));
   assert.ok(row.cups.some(c=>!blocked.has(c.lane)),"no safe cup lane");
   assert.ok(row.powers.every(p=>!blocked.has(p.lane)));
   row.powers.forEach(p=>seen.add(p.type));
 }
 assert.deepEqual([...seen].sort(),[...POWER_TYPES].sort());
});

test("run speed ramps up but stays limited, score stops when paused",()=>{
 const s=running();
 for(let i=0;i<2000;i++)tickRun(s,.05);
 assert.equal(s.speed,SETTINGS.maxSpeed);
 const score=s.score;
 s.paused=true;tickRun(s,.06);
 assert.equal(s.score,score);
});

test("scores and records handle malformed data safely",()=>{
 const restored=restoreRecords('{"best":1222,"runs":3,"totalMatchas":29}');
 assert.equal(restored.best,1222);
 assert.equal(restoreRecords("{}").best,0);
 assert.equal(restoreRecords("garbage").runs,0);
 assert.equal(restoreRecords({best:-20}).best,0);
 assert.equal(grade(35000),"MATCHA LEGEND");
 assert.equal(formatTime(65),"01:05");
 assert.equal(typeof formatNumber(13337),"string");
 assert.ok(SAVE_KEY.includes("matcha"));
});
