import test from "node:test";
import assert from "node:assert/strict";
import {
  SAVE_KEY, START, freshSave, restoreSave, tripCost, canTravel,
  estimatePost, returningAudience, canClaimGift, shotToTarget, USD, compact
} from "../logic.mjs";

test("new game is solvent and previous saved games restore safely", () => {
  const save = freshSave();
  assert.equal(save.cash, 145);
  assert.equal(save.tomatoes, 18);
  assert.equal(save.followers, 180);
  assert.equal(save.zone, "city");
  assert.notStrictEqual(freshSave().posts, freshSave().posts);
  assert.equal(restoreSave("bad JSON").cash, 145);
  const restored=restoreSave(JSON.stringify({
    cash:-999, followers: 250, tomatoes:500, zone:"moon",
    passes:["festival","festival","hacker"], posts:[{id:"p1",views:-7,likes:55,headline:"Hello"}]
  }));
  assert.equal(restored.cash, 0);
  assert.equal(restored.tomatoes, 100);
  assert.equal(restored.zone, "city");
  assert.deepEqual(restored.passes, ["festival"]);
  assert.equal(restored.posts.length, 1);
  assert.equal(restored.posts[0].views, 0);
});

test("concert and VIP cost travel plus one-time admission; return is free", () => {
  assert.deepEqual(tripCost("festival",[]), {fare:24,ticket:95,total:119});
  assert.deepEqual(tripCost("festival",["festival"]), {fare:24,ticket:0,total:24});
  assert.deepEqual(tripCost("summit",[]), {fare:32,ticket:180,total:212});
  assert.deepEqual(tripCost("city",[]), {fare:0,ticket:0,total:0});
  assert.equal(canTravel(145,"festival",[]),true);
  assert.equal(canTravel(145,"summit",[]),false);
  assert.equal(canTravel(0,"city",[]),true);
  assert.equal(canTravel(100,"unknown",[]),false);
});

test("normal filmed hit earns views, likes, followers, money", () => {
  const rng=()=>.5;
  const post=estimatePost({shots:[{kind:"civilian"}],followers:180,duration:6,rng});
  assert.ok(post.views>300);
  assert.ok(post.likes>0 && post.likes<post.views);
  assert.ok(post.newFollowers>0);
  assert.equal(post.earned,Math.round(post.views*.008));
  assert.equal(post.duration,6);
  assert.equal(post.viral,false);
  assert.equal(post.celebrity,false);
});

test("exactly 5% of civilian-only clips go extreme viral", () => {
  let viral=0;
  for(let i=0;i<1000;i++){
    let call=0;
    const rng=()=>{call++;return call===2 ? i/1000 : .5;};
    const post=estimatePost({shots:[{kind:"civilian"}],followers:500,rng});
    if(post.viral)viral++;
  }
  assert.equal(viral,50);
});

test("viral videos produce huge audiences, not just a small bump", () => {
  let c=0;
  const viral=estimatePost({shots:[{kind:"civilian"}],followers:120,rng:()=>++c===2?.01:.5});
  const ordinary=estimatePost({shots:[{kind:"civilian"}],followers:120,rng:()=>.5});
  assert.ok(viral.viral);
  assert.ok(viral.views>ordinary.views*100);
  assert.ok(viral.newFollowers>ordinary.newFollowers*10);
  assert.ok(viral.earned>ordinary.earned*100);
});

test("celebrity videos are significantly more popular but do not roll normal virality", () => {
  const base=estimatePost({shots:[{kind:"civilian"}],followers:400,rng:()=>.5});
  const streamer=estimatePost({shots:[{kind:"streamer"}],followers:400,rng:()=>.5});
  const singer=estimatePost({shots:[{kind:"singer"}],followers:400,rng:()=>.5});
  const president=estimatePost({shots:[{kind:"president"}],followers:400,rng:()=>.5});
  assert.ok(streamer.views>base.views*5);
  assert.ok(singer.views>streamer.views);
  assert.ok(president.views>singer.views);
  assert.equal(estimatePost({shots:[{kind:"president"}],rng:()=>0}).viral,false);
});

test("no-hit videos earn almost nothing and cannot become extreme viral", () => {
  const empty=estimatePost({shots:[],followers:200,rng:()=>0});
  const hit=estimatePost({shots:[{kind:"civilian"}],followers:200,rng:()=>.5});
  assert.equal(empty.viral,false);
  assert.ok(empty.views < hit.views);
  assert.equal(empty.hits,0);
});

test("repeat fans revisit every older post without mutation", () => {
  const posts=[{id:"a",views:1000,likes:200,earned:8},{id:"b",views:200,likes:20,earned:2}];
  const result=returningAudience(posts,2000,()=>.5);
  assert.equal(result.posts.length,2);
  assert.ok(result.totalViews>0);
  assert.ok(result.earned>0);
  assert.equal(posts[0].views,1000);
  assert.ok(result.posts[0].views>1000);
  assert.equal(result.totalViews,result.posts[0].views-1000+result.posts[1].views-200);
});

test("emergency starter pack prevents insolvency softlock", () => {
  const broke={cash:0,tomatoes:0,lastGift:100000};
  assert.equal(canClaimGift(broke,161000),true);
  assert.equal(canClaimGift(broke,159000),false);
  assert.equal(canClaimGift({cash:18,tomatoes:0,lastGift:0},200000),false);
  assert.equal(canClaimGift({cash:0,tomatoes:1,lastGift:0},200000),false);
});

test("aim assist requires realistic range and cone", () => {
  const player={x:0,y:1.7,z:0},straight={x:0,y:0,z:-1};
  assert.equal(shotToTarget(player,straight,{x:0,y:1.7,z:-15}),true);
  assert.equal(shotToTarget(player,straight,{x:5,y:1.7,z:-15}),false);
  assert.equal(shotToTarget(player,straight,{x:0,y:1.7,z:-45}),false);
  assert.equal(shotToTarget(player,straight,{x:0,y:1.7,z:15}),false);
});

test("formatted money and follower counts don't display invalid data", () => {
  assert.equal(USD(14.9),"$14");
  assert.equal(USD(-5),"$0");
  assert.equal(typeof compact(12_300),"string");
  assert.ok(SAVE_KEY.includes("tomato"));
  assert.equal(START.posts.length,0);
});
