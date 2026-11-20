import {CATEGORIES,allQuestions,normalizeAnswer,acceptAnswer,shuffle,createDeck,answersFor,parseCustomLines,customTopic,safeTopics,formatTime,pointsFor} from "./data.mjs";
import {resolveImage,loadPicture,safeHttps} from "./api.mjs";

const $=id=>document.getElementById(id);
const el=(tag,cls="",txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
const put=(id,txt)=>$(id).textContent=String(txt);
const group=(id,attr,value)=>$(id).querySelectorAll("button").forEach(b=>{
 const active=b.dataset[attr]===String(value);
 b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));
});
const MAX_CUSTOM=12;
let rawCustom=[],selected=new Set(["animals","food","flags","places"]);
const settings={mode:"choice",effect:"shadow",rounds:10,timer:0};
let editing=null,game=null,requestId=0,ticker=null,noticeTimer=null;
function toast(msg){const e=$("toast");e.textContent=msg;e.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>e.hidden=true,2800);}
function safeRead(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch{return fallback;}}
function safeWrite(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}}
function customTopics(){return safeTopics(rawCustom);}
function allTopics(){return [...CATEGORIES,...customTopics()];}
function currentTopics(){return allTopics().filter(c=>selected.has(c.id));}
function refreshCounts(){
 const n=currentTopics().length,total=allQuestions(currentTopics()).length;
 put("selectedCount",n+" AUSGEWÄHLT");
 put("questionCount",allQuestions(allTopics()).length+"+");
 put("mixSummary",n+" Themen · "+settings.rounds+" Runden");
 put("pointsSummary",settings.mode==="type"?"150+":"100+");
 const button=$("startGame");button.disabled=n===0||total<4;
 put("startError",n===0?"Wähle mindestens ein Thema.":total<4?"Mindestens vier unterschiedliche Begriffe werden benötigt.":"");
}
function renderTopics(){
 const root=$("topicGrid"),frag=document.createDocumentFragment();
 for(const topic of allTopics()){
  const active=selected.has(topic.id);
  const btn=el("button","topic-card"+(active?" selected":""));btn.type="button";
  btn.dataset.topic=topic.id;btn.setAttribute("aria-pressed",String(active));
  btn.setAttribute("aria-label",topic.name+", "+topic.items.length+" Begriffe"+(active?", ausgewählt":""));
  btn.append(el("span","topic-icon",topic.icon),el("span","topic-check"));
  const txt=el("div");txt.append(el("strong","",topic.name),el("small","",topic.items.length+" Begriffe · "+topic.description));
  btn.append(txt);
  btn.addEventListener("click",()=>{
   if(selected.has(topic.id))selected.delete(topic.id);else selected.add(topic.id);
   savePrefs();renderTopics();
  });
  frag.append(btn);
 }
 root.replaceChildren(frag);
 refreshCounts();
}
function rawFromTopic(topic){return rawCustom.find(t=>"custom-"+t.id===topic.id);}
function renderCustom(){
 const root=$("customList"),frag=document.createDocumentFragment();
 for(const topic of customTopics()){
  const row=el("div","custom-item"),left=el("div");
  left.append(el("strong","","✳ "+topic.name),el("small","",topic.items.length+" eigene Begriffe"));
  const actions=el("div"),edit=el("button","","Bearbeiten"),remove=el("button","","Löschen");
  edit.type="button";remove.type="button";
  edit.addEventListener("click",()=>{
   const raw=rawFromTopic(topic);if(!raw)return;
   editing=raw.id;
   $("customTitle").value=raw.name;
   $("customEntries").value=raw.items.map(x=>[x.answer,x.page,...(x.image?[x.image]:[])].join(" | ")).join("\n");
   put("saveCustom","Änderung speichern");
   $("cancelEdit").hidden=false;
   put("customFormStatus","Du bearbeitest "+raw.name+".");
   $("customTitle").focus();
  });
  remove.addEventListener("click",()=>{
   const raw=rawFromTopic(topic);if(!raw)return;
   rawCustom=rawCustom.filter(t=>t.id!==raw.id);
   selected.delete(topic.id);
   if(editing===raw.id)cancelEdit();
   saveCustomStore();renderCustom();renderTopics();toast("Eigenes Thema gelöscht.");
  });
  actions.append(edit,remove);row.append(left,actions);frag.append(row);
 }
 root.replaceChildren(frag);
}
function cancelEdit(){
 editing=null;$("customForm").reset();put("saveCustom","+ Thema anlegen");
 $("cancelEdit").hidden=true;put("customFormStatus","Lokal gespeichert, ohne Account.");
}
function saveCustomStore(){
 const okay=safeWrite("mixup-custom-v1",rawCustom);
 if(!okay)toast("Dein Browser blockiert lokales Speichern. Die Themen bleiben für diese Sitzung.");
 savePrefs();
}
function makeId(){return Date.now().toString(36)+"-"+Math.floor(Math.random()*10000).toString(36);}
function createOwn(event){
 event.preventDefault();
 const title=$("customTitle").value.trim(),lines=$("customEntries").value;
 try{
  if(rawCustom.length>=MAX_CUSTOM&&!editing)throw Error("Maximal 12 eigene Themen pro Browser.");
  const items=parseCustomLines(lines),id=editing||makeId();
  customTopic(id,title,items);
  const raw={id,name:title,items};
  if(editing)rawCustom=rawCustom.map(x=>x.id===id?raw:x);
  else rawCustom.push(raw);
  selected.add("custom-"+id);
  saveCustomStore();cancelEdit();renderCustom();renderTopics();
  toast("Dein Thema "+title+" ist im Mix dabei ✓");
 }catch(e){put("customFormStatus",e.message||"Bitte Eingaben prüfen.");}
}
function savePrefs(){safeWrite("mixup-settings-v1",{...settings,selected:[...selected]});}
function restore(){
 rawCustom=safeRead("mixup-custom-v1",[]);
 if(!Array.isArray(rawCustom))rawCustom=[];
 rawCustom=rawCustom.slice(0,MAX_CUSTOM).map(x=>({id:String(x.id||"").slice(0,40),name:String(x.name||"").slice(0,42),items:Array.isArray(x.items)?x.items.slice(0,40).map(i=>({answer:String(i.answer||"").slice(0,90),page:String(i.page||"").slice(0,130),image:i.image||null})):[]})).filter(x=>safeTopics([x]).length);
 const saved=safeRead("mixup-settings-v1",{});
 if(saved&&typeof saved==="object"){
  if(["choice","type"].includes(saved.mode))settings.mode=saved.mode;
  if(["shadow","blur","tiles"].includes(saved.effect))settings.effect=saved.effect;
  if([5,10,20].includes(saved.rounds))settings.rounds=saved.rounds;
  if([0,20,40].includes(saved.timer))settings.timer=saved.timer;
  if(Array.isArray(saved.selected)){
   const ids=new Set(allTopics().map(c=>c.id));
   selected=new Set(saved.selected.filter(id=>ids.has(id)));
  }
 }
 for(const [id,attr,val] of [["modeOptions","mode",settings.mode],["effectOptions","effect",settings.effect],["roundOptions","rounds",settings.rounds],["timerOptions","timer",settings.timer]])group(id,attr,val);
 renderTopics();renderCustom();
}
function showView(name){
 for(const part of ["setup","play","finish"])$(part+"View").hidden=part!==name;
 window.scrollTo({top:0,behavior:"instant"});
}
function stopTimer(){if(ticker){clearInterval(ticker);ticker=null;}}
function endSession(){
 requestId++;stopTimer();game=null;showView("setup");renderTopics();
}
function startGame(){
 const topics=currentTopics(),bank=allQuestions(topics);
 if(topics.length===0||bank.length<4){toast("Bitte wähle Themen mit mindestens 4 Begriffen.");return;}
 const deck=createDeck(topics,settings.rounds);
 if(deck.length<4){toast("Nicht genug unterschiedliche Fragen.");return;}
 savePrefs();
 game={deck,bank,index:0,score:0,correct:0,streak:0,maxStreak:0,totalHints:0,history:[],
   status:"loading",current:null,visual:null,hints:0,remaining:settings.timer,wrongAttempts:0,deadline:0,options:[]};
 showView("play");prepareRound();
}
function updateScore(){
 if(!game)return;
 put("scoreValue",String(game.score).padStart(4,"0"));
 put("correctCount",game.correct);put("streakCount",game.streak);put("hintsCount",game.totalHints);
 put("roundBadge","RUNDE "+String(game.index+1).padStart(2,"0")+" / "+game.deck.length);
 put("imageNumber",String(game.index+1).padStart(2,"0")+" / "+game.deck.length);
 $("progressBar").style.width=(game.index/game.deck.length*100)+"%";
}
function loadingState(){
 const area=$("imageStage"),img=$("mysteryImage"),emoji=$("emojiFallback");
 area.className="image-stage mask-"+settings.effect;
 img.hidden=true;img.removeAttribute("src");img.alt="Verdecktes Rätselbild";
 emoji.hidden=true;area.classList.remove("revealed");
 $("imageLoader").hidden=false;
 put("imageSourceName","Bilder werden geladen …");$("imageCredit").hidden=true;
 put("effectLabel",settings.effect==="shadow"?"SILHOUETTE MODE":settings.effect==="blur"?"BLUR MODE":"HIDDEN TILES MODE");
 $("coverTiles").replaceChildren();
 if(settings.effect==="tiles")for(let i=0;i<12;i++)$("coverTiles").append(el("span"));
 put("answerIntro","Wähle eine Antwort. Ein Hinweis kostet 25 Punkte.");
 $("choiceAnswers").replaceChildren();$("writeAnswer").hidden=true;
 $("feedback").hidden=true;$("hintText").hidden=true;
 $("hintButton").disabled=true;$("skipButton").disabled=true;
 $("nextRound").hidden=true;put("hintButton","✳ Hinweis"); // button markup rebuilt when loading
 $("hintButton").append(el("span","","−25 P."));
 $("timerDisplay").hidden=settings.timer===0;
 $("timerDisplay").classList.remove("urgent");
 put("timeValue",formatTime(settings.timer));
}
function renderChoices(){
 if(!game)return;
 const g=game,area=$("choiceAnswers"),frag=document.createDocumentFragment();
 g.options=answersFor(g.current,g.bank);
 if(g.options.length<4){
  // A custom mix may have four questions but duplicate answer text after filtering.
  toast("Zu wenige verschiedene Antworten. Bitte weitere Themen hinzufügen.");
  endSession();return;
 }
 g.options.forEach((answer,i)=>{
  const b=el("button");b.type="button";b.dataset.answer=answer;
  b.append(el("span","",String(i+1).padStart(2,"0")),el("span","",answer));
  b.addEventListener("click",()=>answerChoice(answer));
  frag.append(b);
 });
 area.replaceChildren(frag);
}
function renderAnswer(){
 if(!game)return;
 if(settings.mode==="choice"){renderChoices();$("choiceAnswers").hidden=false;$("writeAnswer").hidden=true;}
 else{
  $("choiceAnswers").hidden=true;$("writeAnswer").hidden=false;
  $("answerInput").disabled=false;
  $("writeAnswer").querySelector("button[type=submit]").disabled=false;
  $("answerInput").value="";
 }
}
async function prepareRound(){
 const g=game;if(!g)return;
 stopTimer();const token=++requestId;
 g.status="loading";g.hints=0;g.remaining=settings.timer;g.wrongAttempts=0;
 g.current=g.deck[g.index];g.visual=null;
 loadingState();updateScore();
 put("questionTopic",(g.current.categoryName||"MIXUP").toUpperCase());
 let found=null;
 // A blocked wiki image should not freeze the entire quiz. Try a few other
 // not-yet-played questions, then display a clearly labeled emoji fallback.
 const max=Math.min(4,g.deck.length-g.index);
 for(let attempt=0;attempt<max;attempt++){
  if(token!==requestId||g!==game)return;
  const q=g.deck[g.index];
  try{
   const info=await resolveImage(q);
   if(!info?.image)throw Error("No photo");
   await loadPicture(info.image,5200);
   if(token!==requestId||g!==game)return;
   g.current=q;found=info;break;
  }catch{
   if(token!==requestId||g!==game)return;
   if(attempt+1<max){
    const replacementIdx=g.index+attempt+1;
    if(replacementIdx<g.deck.length){
      const temp=g.deck[g.index];g.deck[g.index]=g.deck[replacementIdx];g.deck[replacementIdx]=temp;
    }
   }
  }
 }
 if(token!==requestId||g!==game)return;
 g.visual=found;
 $("imageLoader").hidden=true;
 if(found){
  const img=$("mysteryImage");img.src=found.image;img.hidden=false;
  img.alt="Verdecktes Quizbild";
  put("imageSourceName",found.credit);
  const a=$("imageCredit");a.href=safeHttps(found.source)||"https://en.wikipedia.org/";a.hidden=false;
 }else{
  const emoji=$("emojiFallback");emoji.textContent=g.current.emoji||"❔";emoji.hidden=false;
  put("imageSourceName","Symbolische Darstellung: Bildquelle momentan nicht erreichbar");
  put("answerIntro","Ersatzmodus: Ein Symbol statt des Originalbilds. Du kannst ganz normal raten.");
 }
 renderAnswer();
 g.status="asking";
 $("hintButton").disabled=false;$("skipButton").disabled=false;
 if(settings.timer>0)startTimer();
}
function startTimer(){
 if(!game||settings.timer===0)return;
 const g=game;g.deadline=performance.now()+settings.timer*1000;
 $("timerDisplay").hidden=false;
 stopTimer();
 ticker=setInterval(()=>{
  if(g!==game||g.status!=="asking"){stopTimer();return;}
  g.remaining=Math.max(0,(g.deadline-performance.now())/1000);
  put("timeValue",formatTime(g.remaining));
  $("timerDisplay").classList.toggle("urgent",g.remaining<=7);
  if(g.remaining<=0){stopTimer();finalize(false,"Zeit abgelaufen!");}
 },200);
}
function answerChoice(answer){if(!game||game.status!=="asking")return;finalize(acceptAnswer(answer,game.current.answer),null,answer);}
function submitTyped(event){
 event.preventDefault();if(!game||game.status!=="asking"||settings.mode!=="type")return;
 const answer=$("answerInput").value.trim();if(!answer){toast("Gib zuerst deine Antwort ein.");return;}
 if(acceptAnswer(answer,game.current.answer)){
  finalize(true,null,answer);
 }else{
  game.wrongAttempts++;
  if(game.wrongAttempts>=2)finalize(false,"Zwei Versuche verbraucht.",answer);
  else{
   put("answerIntro","Noch nicht. Du hast einen zweiten Versuch.");
   $("answerInput").value="";$("answerInput").focus();
  }
 }
}
function removeCover(count){
 const tiles=[...$("coverTiles").children];
 tiles.slice(0,count).forEach((v,i)=>v.style.opacity="0");
}
function showHint(){
 const g=game;if(!g||g.status!=="asking"||g.hints>=2)return;
 g.hints++;g.totalHints++;
 const ans=g.current.answer,initial=ans.charAt(0).toUpperCase(),n=normalizeAnswer(ans).replaceAll(" ","").length;
 put("hintText",g.hints===1?"Erster Buchstabe: "+initial+" · "+n+" Zeichen":
   "Letzter Buchstabe: "+ans.slice(-1).toUpperCase()+" · "+ans.trim().split(/\s+/).length+" Wort/Wörter");
 $("hintText").hidden=false;
 if(settings.effect==="shadow"){
  $("imageStage").classList.remove("hint-1","hint-2");$("imageStage").classList.add("hint-"+g.hints);
 }else if(settings.effect==="blur"){
  $("imageStage").classList.remove("hint-1","hint-2");$("imageStage").classList.add("hint-"+g.hints);
 }else removeCover(g.hints*4);
 if(g.hints===2)$("hintButton").disabled=true;
 updateScore(); // hint penalty applies when the question is answered
}
function finalize(correct,reason=null,submitted=null){
 const g=game;if(!g||g.status!=="asking")return;
 stopTimer();g.status="answered";
 const earned=pointsFor({correct,hints:g.hints,mode:settings.mode,secondsRemaining:settings.timer>0?g.remaining:null});
 if(correct){g.correct++;g.streak++;g.maxStreak=Math.max(g.maxStreak,g.streak);g.score+=earned;}
 else g.streak=0;
 g.history.push({answer:g.current.answer,topic:g.current.categoryName,correct,earned});
 $("imageStage").classList.add("revealed");
 $("mysteryImage").alt="Auflösung: "+g.current.answer;
 $("hintButton").disabled=true;$("skipButton").disabled=true;
 if(settings.mode==="choice"){
  $("choiceAnswers").querySelectorAll("button").forEach(b=>{
   b.disabled=true;
   if(acceptAnswer(b.dataset.answer,g.current.answer))b.classList.add("is-correct");
   else if(submitted===b.dataset.answer)b.classList.add("is-wrong");
   else b.classList.add("is-rejected");
  });
 }else{
  $("writeAnswer").querySelectorAll("input,button").forEach(x=>x.disabled=true);
 }
 const feedback=$("feedback");feedback.hidden=false;feedback.className="feedback"+(correct?"":" bad");
 feedback.replaceChildren(el("strong","",correct?"Richtig! +"+earned+" Punkte 🎉":"Das war "+g.current.answer+"."),
  el("span","",correct?"Stark erkannt! "+g.current.categoryName+" sitzt.":(reason||"Nächstes Bild, nächste Chance.")));
 updateScore();
 $("nextRound").hidden=false;
 put("nextRound",g.index>=g.deck.length-1?"Ergebnis ansehen ↗":"Nächstes Bild →");
}
function nextRound(){
 const g=game;if(!g||g.status!=="answered")return;
 if(g.index+1>=g.deck.length){finishGame();return;}
 g.index++;prepareRound();
}
function finishGame(){
 const g=game;if(!g)return;
 stopTimer();requestId++;
 const best=Number(safeRead("mixup-best-v1",0))||0;
 if(g.score>best)safeWrite("mixup-best-v1",g.score);
 put("finalScore",String(g.score).padStart(4,"0"));
 put("finalCorrect",g.correct+" / "+g.deck.length);
 put("finalStreak",g.maxStreak);
 put("bestScore",Math.max(g.score,best));
 const frag=document.createDocumentFragment();
 g.history.forEach((h,i)=>{
  const row=el("div","history-row"+(h.correct?"":" missed"));
  row.append(el("span","",h.correct?"✓":"×"));
  const content=el("div");content.append(el("strong","",String(i+1).padStart(2,"0")+". "+h.answer),el("small","",h.topic+" · "+(h.correct?"+"+h.earned+" Punkte":"Nicht erkannt")));
  row.append(content);frag.append(row);
 });
 $("roundHistory").replaceChildren(frag);
 showView("finish");
}
function keyControls(event){
 const t=event.target;
 if(t instanceof Element&&t.closest("input,textarea,[contenteditable]"))return;
 if(!game||$("playView").hidden||game.status!=="asking")return;
 if(settings.mode==="choice"&&/^[1-4]$/.test(event.key)){
  const b=$("choiceAnswers").querySelectorAll("button")[Number(event.key)-1];
  if(b){event.preventDefault();b.click();}
 }
 if(event.key.toLowerCase()==="h"&&!event.ctrlKey&&!event.altKey){event.preventDefault();showHint();}
}
function handlers(){
 $("allTopics").addEventListener("click",()=>{selected=new Set(allTopics().map(t=>t.id));renderTopics();savePrefs();});
 $("clearTopics").addEventListener("click",()=>{selected.clear();renderTopics();savePrefs();});
 $("customForm").addEventListener("submit",createOwn);
 $("cancelEdit").addEventListener("click",cancelEdit);
 for(const [id,attr,setting] of [["modeOptions","mode","mode"],["effectOptions","effect","effect"],["roundOptions","rounds","rounds"],["timerOptions","timer","timer"]]){
  $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
   settings[setting]=["rounds","timer"].includes(setting)?Number(b.dataset[attr]):b.dataset[attr];
   group(id,attr,settings[setting]);savePrefs();refreshCounts();
  }));
 }
 $("startGame").addEventListener("click",startGame);
 $("quitGame").addEventListener("click",endSession);
 $("choiceAnswers").addEventListener("keydown",keyControls);
 $("writeAnswer").addEventListener("submit",submitTyped);
 $("hintButton").addEventListener("click",showHint);
 $("skipButton").addEventListener("click",()=>finalize(false,"Du hast aufgelöst."));
 $("nextRound").addEventListener("click",nextRound);
 $("againButton").addEventListener("click",startGame);
 $("editMixButton").addEventListener("click",endSession);
 document.addEventListener("keydown",keyControls);
}
restore();handlers();
if(new URLSearchParams(location.search).has("quick"))startGame();
