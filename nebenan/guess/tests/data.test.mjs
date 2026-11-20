import test from "node:test";
import assert from "node:assert/strict";
import {CATEGORIES,allQuestions,normalizeAnswer,acceptAnswer,shuffle,createDeck,answersFor,parseCustomLines,customTopic,safeTopics,formatTime,pointsFor} from "../data.mjs";
import {parseWikipedia,wikipediaUrl,json,safeHttps} from "../api.mjs";

test("at least fifteen independent themes and 200+ unique examples",()=>{
 assert.equal(CATEGORIES.length,15);
 assert.ok(allQuestions().length>=200);
 assert.equal(new Set(CATEGORIES.map(t=>t.id)).size,15);
 CATEGORIES.forEach(c=>{
  assert.ok(c.items.length>=12);
  c.items.forEach(q=>{
   assert.ok(q.answer.length>1&&q.page.length>0);
   assert.equal(q.category,c.id);
  });
 });
});
test("normalisation tolerates accents but avoids approximate false positives",()=>{
 assert.equal(normalizeAnswer("  Müßli!  "),"mussli");
 assert.ok(acceptAnswer("café","Cafe"));
 assert.equal(acceptAnswer("Titanic","Taj Mahal"),false);
 assert.equal(acceptAnswer("","Taj Mahal"),false);
});
test("random question deck excludes repeat answers and honors round limits",()=>{
 const topics=CATEGORIES.filter(c=>["animals","flags"].includes(c.id));
 const deck=createDeck(topics,20,()=>.1);
 assert.equal(deck.length,20);
 assert.equal(new Set(deck.map(q=>normalizeAnswer(q.answer))).size,20);
 assert.equal(createDeck(topics,5,()=>.5).length,5);
 const answerOptions=answersFor(deck[0],allQuestions(topics),()=>.5);
 assert.equal(answerOptions.length,4);
 assert.ok(answerOptions.includes(deck[0].answer));
 assert.equal(new Set(answerOptions.map(normalizeAnswer)).size,4);
 assert.deepEqual(shuffle([1],()=>.5),[1]);
});
test("own topic editor parses Wikipedia titles and optional HTTPS pictures",()=>{
 const lines=parseCustomLines("Eiffelturm | Eiffel Tower\nRheinfall\nMatterhorn | Matterhorn | https://example.org/mountain.jpg\nFlamingo | Flamingo");
 assert.equal(lines.length,4);
 assert.equal(lines[1].page,"Rheinfall");
 assert.equal(lines[2].image,"https://example.org/mountain.jpg");
 const created=customTopic("sample", "Meine Schweiz",lines);
 assert.equal(created.id,"custom-sample");
 assert.equal(created.items[2].kind,"direct");
 assert.equal(created.items[1].kind,"wiki");
 assert.throws(()=>customTopic("x","a",lines),/Themenname/);
 assert.throws(()=>customTopic("x","Gutes Thema",lines.slice(0,3)),/mindestens 4/);
 assert.throws(()=>parseCustomLines("E | E | javascript:alert(1)"),/https/);
});
test("stored custom topics are validated and malicious entries excluded",()=>{
 const good={id:"m7",name:"Vieles",items:parseCustomLines("Auto\nBahn\nSchiff\nBoot")};
 const unsafe={id:"m9",name:"Schlecht",items:parseCustomLines("Eins\nZwei\nDrei\nVier").map((x,i)=>i===0?{...x,image:"javascript:bad"}:x)};
 const list=safeTopics([good,unsafe,{id:"../../a",name:"Bad",items:good.items}]);
 assert.equal(list.length,1);
 assert.equal(list[0].name,"Vieles");
});
test("point scoring handles hints, typed mode and timer bonus",()=>{
 assert.equal(pointsFor({correct:true,mode:"choice"}),100);
 assert.equal(pointsFor({correct:true,mode:"type",hints:2}),100);
 assert.equal(pointsFor({correct:true,mode:"choice",hints:1,secondsRemaining:30}),90);
 assert.equal(pointsFor({correct:false,hints:0,mode:"choice"}),0);
 assert.equal(formatTime(9.2),"10");
 assert.equal(formatTime(-3),"00");
});
test("MediaWiki API URL includes correct anonymous CORS marker",()=>{
 const url=new URL(wikipediaUrl("Giant panda","en"));
 assert.equal(url.searchParams.get("origin"),"*");
 assert.equal(url.searchParams.get("prop"),"pageimages");
 assert.equal(url.searchParams.get("titles"),"Giant panda");
 assert.equal(url.searchParams.get("formatversion"),"2");
 assert.equal(safeHttps("javascript:bad"),null);
});
test("Wikipedia thumbnail parser links to original image license page",()=>{
 const result=parseWikipedia({query:{pages:[{pageid:9,title:"Taj Mahal",pageimage:"File_name.jpg",thumbnail:{source:"https://upload.wikimedia.org/thumb.jpg"}}]}},"en");
 assert.equal(result.image,"https://upload.wikimedia.org/thumb.jpg");
 assert.ok(result.source.includes("/wiki/File:"));
 assert.equal(parseWikipedia({query:{pages:[{title:"Missing",missing:true}]}}),null);
});
test("request client deduplicates simultaneous fetches and caches responses",async()=>{
 const previous=globalThis.fetch;let count=0;
 globalThis.fetch=async()=>{count++;return {ok:true,json:async()=>({answer:42})};};
 try{
  const url="https://api.example.test/mixup-unique-111";
  const result=await Promise.all([json(url),json(url),json(url)]);
  assert.equal(count,1);assert.equal(result[1].answer,42);
  await json(url);assert.equal(count,1);
 }finally{globalThis.fetch=previous;}
});
