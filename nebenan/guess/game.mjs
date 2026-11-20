import {MODES,OBJECTS,BANK,SCALE_ROUNDS,DISTANCE_ROUNDS,TIME_ROUNDS,LIVE_CITIES,buildDeck,shuffle,sliderToValue,valueToSlider,pointsFor,formatNumber,formatValue,nextRange,normaliseModes,safeModeSettings} from "./data.mjs";

const $=id=>document.getElementById(id);
const create=(tag,cls="",text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const put=(id,text)=>{$(id).textContent=String(text);};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const state={settings:{modes:["scale","distance","time"],rounds:8},custom:[],deck:[],index:0,score:0,results:[],
  current:null,guess:null,status:"setup",hinted:false,loadingToken:0,weatherPromise:null,liveError:false};
const SOURCE_WEATHER="https://open-meteo.com/en/docs";
let weatherCache=new Map();
let toastTimeout;
function toast(message){const n=$("toast");n.hidden=false;n.textContent=message;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>n.hidden=true,2500);}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function allCustom(){return state.custom.map((c,i)=>{
 const reference={name:c.ref,height:c.refHeight,art:"tower",source:c.source||null,note:"Von dir angelegtes Referenzobjekt."};
 const target={name:c.target,height:c.targetHeight,art:"skyscraper",source:c.source||null,note:"Von dir angelegter Vergleich."};
 return {id:"c-"+c.id,mode:"scale",reference,target,truth:target.height/reference.height,custom:true};
});}
function renderModes(){
 const root=$("modeGrid"),frag=document.createDocumentFragment();
 MODES.forEach(m=>{
  const active=state.settings.modes.includes(m.id),b=create("button","mode-card "+m.tone+(active?" selected":""));b.type="button";b.dataset.mode=m.id;
  b.setAttribute("aria-pressed",String(active));b.setAttribute("aria-label",m.name+" – "+m.desc+(active?", aktiviert":""));
  const top=create("div","mode-top");top.append(create("span","mode-number",m.num+" / "+m.subtitle));
  const indicator=create("span","mode-indicator");indicator.append(create("span","","+"));top.append(indicator);
  const icon=create("div","mode-icon",m.mark);
  b.append(top,icon,create("h3","",m.name),create("p","",m.desc));
  b.addEventListener("click",()=>{
   const set=new Set(state.settings.modes);if(set.has(m.id))set.delete(m.id);else set.add(m.id);
   state.settings.modes=MODES.map(v=>v.id).filter(id=>set.has(id));
   saveSettings();renderModes();
  });
  frag.append(b);
 });root.replaceChildren(frag);
 const n=state.settings.modes.length;
 put("mixSummary",n+" Spielart"+(n===1?"":"en"));
 put("poolSummary",state.settings.modes.reduce((a,id)=>a+BANK[id].length,0)+(state.settings.modes.includes("scale")?state.custom.length:0));
 $("startButton").disabled=n===0;put("setupError",n===0?"Wähle mindestens eine Spielart.":"");
}
function renderRounds(){
 document.querySelectorAll("#roundPicker button").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.rounds)===state.settings.rounds)));
}
function saveSettings(){store("almost-settings-v1",state.settings);}
function restore(){
 state.settings=safeModeSettings(read("almost-settings-v1",{}));
 const raw=read("almost-custom-v1",[]);
 if(Array.isArray(raw))state.custom=raw.slice(0,20).filter(validCustom);
 renderModes();renderRounds();renderCustom();
}
function validCustom(c){
 if(!c||typeof c!=="object")return false;
 return typeof c.ref==="string"&&c.ref.length>=2&&c.ref.length<=45&&
  typeof c.target==="string"&&c.target.length>=2&&c.target.length<=45&&
  Number.isFinite(c.refHeight)&&Number.isFinite(c.targetHeight)&&
  c.refHeight>=1&&c.targetHeight>=1&&c.refHeight<=20000&&c.targetHeight<=20000&&
  c.targetHeight/c.refHeight>=.25&&c.targetHeight/c.refHeight<=3.3&&
  (!c.source||(typeof c.source==="string"&&c.source.startsWith("https://")&&c.source.length<=350));
}
function renderCustom(){
 const root=$("customList"),frag=document.createDocumentFragment();
 state.custom.forEach(c=>{
  const row=create("div","custom-row"),left=create("div");
  left.append(create("strong","",c.ref+" ↔ "+c.target),create("br"),create("span","",formatNumber(c.refHeight,1)+" m / ???"));
  const btn=create("button","","Entfernen");btn.type="button";btn.addEventListener("click",()=>{
   state.custom=state.custom.filter(x=>x.id!==c.id);store("almost-custom-v1",state.custom);renderCustom();renderModes();
  });
  row.append(left,btn);frag.append(row);
 });root.replaceChildren(frag);
}
function addCustom(e){
 e.preventDefault();
 const c={id:Date.now().toString(36)+"-"+Math.floor(Math.random()*999),ref:$("customRef").value.trim(),
  refHeight:Number($("customRefHeight").value),target:$("customTarget").value.trim(),
  targetHeight:Number($("customTargetHeight").value),source:$("customSource").value.trim()};
 if(state.custom.length>=20){put("customHelp","Maximal 20 eigene Duelle.");return;}
 if(!validCustom(c)){put("customHelp","Namen: 2–45 Zeichen, Höhen 1–20'000 m, Verhältnis 0,25× bis 3,3×. Quelle nur HTTPS.");return;}
 state.custom.unshift(c);
 const saved=store("almost-custom-v1",state.custom);
 if(!state.settings.modes.includes("scale"))state.settings.modes.push("scale");
 state.settings.modes=MODES.map(m=>m.id).filter(id=>state.settings.modes.includes(id));saveSettings();
 $("customForm").reset();put("customHelp",saved?"Duell gespeichert und in die Grössenrunden aufgenommen.":"Für diese Sitzung gespeichert.");
 renderCustom();renderModes();toast("Dein Vergleich ist im Mix ✳");
}
function show(name){
 for(const id of ["setupView","playView","finalView"])$(id).hidden=id!==name+"View";
 window.scrollTo({top:0,behavior:"instant"});
}
function start(){
 if(!state.settings.modes.length){toast("Mindestens eine Spielart auswählen.");return;}
 let deck=buildDeck(state.settings.modes,state.settings.rounds);
 if(state.settings.modes.includes("scale")&&state.custom.length){
  const self=shuffle(allCustom());
  const spots=deck.flatMap((r,i)=>r.mode==="scale"?[i]:[]);
  self.slice(0,spots.length).forEach((q,i)=>{deck[spots[i]]=q;});
 }
 state.deck=deck;state.index=0;state.score=0;state.results=[];state.current=null;
 show("play");nextQuestion();
}
function titleFor(q){
 if(q.mode==="scale")return ["Wie viel","höher?","Stell "+q.target.name+" im Verhältnis zu "+q.reference.name+" auf die richtige Höhe.","Wie hoch ist "+q.target.name+" im Vergleich?"];
 if(q.mode==="distance")return ["Wie weit","weg?","Es geht um Luftlinie, nicht um die Strasse.","Wie viele Kilometer liegen zwischen "+q.from.name+" und "+q.to.name+"?"];
 if(q.mode==="time")return ["Wann war","das?","Zieh den Marker ins richtige Jahr.","In welchem Jahr passierte das?"];
 return ["Wie warm","wohl?","Live-Daten aus einem Wettermodell – keine Messstation.","Wie warm ist es gerade in "+q.city.name+"?"];
}
function resetControls(){
 $("revealPanel").hidden=true;$("answerMark").hidden=true;
 $("lockButton").hidden=false;$("lockButton").disabled=true;
 put("lockButton","Schätzung einloggen ↗");
 $("guessSlider").disabled=true;$("nudgeMinus").disabled=true;$("nudgePlus").disabled=true;
 $("hintButton").disabled=true;$("hintMessage").hidden=true;
}
function prepareDeckDot(){
 const frag=document.createDocumentFragment();
 state.deck.forEach((q,i)=>{const dot=create("i",i<state.index?"passed":i===state.index?"now":"");dot.title="Runde "+(i+1);frag.append(dot);});
 $("roundDots").replaceChildren(frag);
}
async function nextQuestion(){
 state.status="loading";state.hinted=false;state.liveError=false;
 const token=++state.loadingToken;
 const q=state.deck[state.index];state.current=q;
 if(!q){end();return;}
 const meta=MODES.find(m=>m.id===q.mode),heading=titleFor(q);
 put("roundInfo","RUNDE "+String(state.index+1).padStart(2,"0")+" / "+String(state.deck.length).padStart(2,"0"));
 $("progressFill").style.width=(state.index/state.deck.length*100)+"%";
 put("scoreTotal",String(state.score).padStart(4,"0"));prepareDeckDot();
 put("questionMode",meta.num+" / "+meta.name.toUpperCase()+(q.custom?" · YOUR LAB":""));
 const h2=$("questionTitle");h2.replaceChildren(document.createTextNode(heading[0]+" "),create("em","",heading[1]));
 put("questionDescription",heading[2]);put("questionSymbol",meta.mark);
 put("dialQuestion",heading[3]);put("dialInstruction","Zieh den Regler – oder nutze die Pfeiltasten für kleine Schritte.");
 put("stageCaption",q.mode==="scale"?"Schematische Silhouetten · gleicher Massstab":q.mode==="distance"?"Luftlinie anhand von Stadtkoordinaten":q.mode==="time"?"Die Zeitachse reagiert auf deine Eingabe":"Temperaturwert der letzten Modellabfrage");
 put("stageCorner",q.mode==="scale"?"VISUAL COMPARISON / NOT A PHOTO":q.mode==="distance"?"SCHEMATIC / NOT A MAP":q.mode==="time"?"A LITTLE TRIP THROUGH HISTORY":"MODELLED WEATHER / LIVE DATA");
 put("dataProvenance",q.mode==="weather"?"OPEN-METEO / NONCOMMERCIAL FREE TIER":"CURATED SOURCES / FACTS REVEALED AFTER ANSWER");
 $("visualStage").className="visual-stage stage-"+q.mode;
 resetControls();
 const control=$("guessSlider");
 const range=nextRange(q.mode);
 control.min=0;control.max=1000;control.step=1;
 const initial=q.mode==="scale"?1:q.mode==="distance"?650:q.mode==="time"?1950:12;
 const position=(q.mode==="scale"||q.mode==="distance")?valueToSlider(initial,range.min,range.max):(initial-range.min)/(range.max-range.min)*1000;
 control.value=String(Math.round(position));
 put("rangeStart",formatValue(q.mode,range.min));put("rangeEnd",formatValue(q.mode,range.max));
 state.guess=initial;
 draw(q);updateGuess();
 if(q.mode==="weather"){
  put("dialInstruction","Live-Wetter wird abgefragt …");
  try{
   q.truth=await getLiveTemperature(q.city);
   if(token!==state.loadingToken)return;
   state.status="estimating";
   put("dialInstruction","Open-Meteo hat einen Modellwert geliefert. Schätz die Temperatur.");
  }catch{
   if(token!==state.loadingToken)return;
   state.status="unavailable";state.liveError=true;
   put("dialInstruction","Der Live-Dienst antwortet nicht. Für diese Runde werden keine Werte erfunden.");
   put("dialQuestion","Live-Wetter momentan nicht erreichbar");
   $("lockButton").hidden=true;
   $("revealPanel").hidden=false;
   put("revealStatus","SIGNAL LOST");
   put("revealPoints","+0 P.");
   put("revealedGuess","—");put("revealedTruth","Keine Daten");
   put("revealFact","Keine Schätzung bewertet. Du kannst die Runde überspringen.");
   $("revealSource").href=SOURCE_WEATHER;
   put("revealSource","Open-Meteo ansehen ↗");
   put("nextButton","Runde überspringen →");
   $("nextButton").disabled=false;
   return;
  }
 }else state.status="estimating";
 control.disabled=false;$("nudgeMinus").disabled=false;$("nudgePlus").disabled=false;
 $("hintButton").disabled=false;$("lockButton").disabled=false;
}
async function getLiveTemperature(city){
 const key=city.name,hit=weatherCache.get(key);
 if(hit&&Date.now()-hit.at<10*60*1000)return hit.temp;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const url="https://api.open-meteo.com/v1/forecast?"+new URLSearchParams({
   latitude:city.lat,longitude:city.lon,current:"temperature_2m",timezone:city.zone,forecast_days:1
  });
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw Error("Weather HTTP "+response.status);
  const data=await response.json(),temp=data?.current?.temperature_2m;
  if(!Number.isFinite(temp))throw Error("Temperature missing");
  weatherCache.set(key,{at:Date.now(),temp});return temp;
 }finally{clearTimeout(timer);}
}
// Illustrations are original schematic SVG primitives; no sourced photography or silhouette textures.
const SHAPES={
 eiffel:'<path d="M60 8 18 219 M60 8 102 219" fill="none" stroke="currentColor" stroke-width="8"/><path d="M25 197H95M38 131H82M46 94H74M30 184 77 129 M90 184 43 129" fill="none" stroke="currentColor" stroke-width="6"/><path d="M38 219 Q60 183 82 219" fill="none" stroke="currentColor" stroke-width="8"/>',
 skyscraper:'<path d="M46 8H75L82 28L91 217H28L36 28Z" fill="currentColor"/><path d="M58 0V10M42 36H78M43 54H79M42 73H80M40 92H81M38 114H83M36 135H85M34 158H87M32 181H89" stroke="#e5efe3" stroke-width="3" opacity=".65"/>',
 skytree:'<path d="M60 5V225M49 70L60 10L72 70M49 70L33 217M72 70L89 217" fill="none" stroke="currentColor" stroke-width="8"/><path d="M37 92H84L92 114H27Z" fill="currentColor"/><path d="M33 129H88M40 155H80M34 178H86M32 207H89" stroke="currentColor" stroke-width="7"/>',
 clock:'<path d="M29 36H91V218H29Z" fill="currentColor"/><path d="M22 37 60 8 98 37Z" fill="currentColor"/><circle cx="60" cy="78" r="22" fill="#ecf5e7"/><path d="M60 65V78L71 85" fill="none" stroke="#58665b" stroke-width="4"/><path d="M41 116H79M41 140H79M41 164H79M40 189H80" stroke="#e5efe3" stroke-width="7"/>',
 shard:'<path d="M47 218 79 7 92 218Z" fill="currentColor"/><path d="M80 14 36 218" fill="none" stroke="currentColor" stroke-width="6" opacity=".5"/><path d="M54 158 84 173M62 107 83 120" stroke="#d9e7dc" stroke-width="3"/>',
 tower:'<path d="M59 0V218" stroke="currentColor" stroke-width="9"/><path d="M48 26H72M34 63H86L92 86H28Z" fill="currentColor"/><path d="M40 83 21 219M79 83 99 219" fill="none" stroke="currentColor" stroke-width="9"/><path d="M30 193H91M34 151H86" stroke="currentColor" stroke-width="6"/>',
 pagoda:'<path d="M27 214H94V218H27Z" fill="currentColor"/><path d="M33 40 60 8 87 40V204H33Z" fill="currentColor"/><path d="M24 56H96M22 79H98M22 103H98M21 127H99M20 151H100M20 175H100" stroke="#e7efe5" stroke-width="7"/><path d="M60 0V15" stroke="currentColor" stroke-width="5"/>',
 spire:'<path d="M60 2V68M30 219H90L79 68H41Z" fill="currentColor"/><path d="M33 95H87M32 121H88M31 149H89M31 176H89" stroke="#e9f3e8" stroke-width="4"/>',
 pyramid:'<path d="M60 25 112 219H8Z" fill="currentColor"/><path d="M60 25 60 219" stroke="#c1d3c0" stroke-width="3"/><path d="M35 120H84M25 159H94" stroke="#e8efe3" stroke-width="3" opacity=".65"/>',
 arch:'<path d="M20 219 C21 115 28 35 60 10 C92 35 99 115 100 219" fill="none" stroke="currentColor" stroke-width="15"/>',
 needle:'<path d="M60 0V218M50 66 36 217M70 66 84 217" fill="none" stroke="currentColor" stroke-width="9"/><path d="M22 56H98L82 85H38Z" fill="currentColor"/><path d="M52 12H68" stroke="currentColor" stroke-width="5"/>'
};
function shape(type){const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 120 230");s.setAttribute("aria-hidden","true");s.innerHTML=SHAPES[type]||SHAPES.tower;return s;}
function specimen(cls,art){
 const root=create("div","scale-specimen "+cls),wrap=create("div","scale-svg-wrap");
 wrap.append(shape(art));root.append(wrap);return {root,wrap};
}
function draw(q){
 const stage=$("stageContent");stage.replaceChildren();
 if(q.mode==="scale"){
  const lines=create("div","scale-lines"),ground=create("div","scale-ground");
  const ref=specimen("scale-ref",q.reference.art),target=specimen("scale-target",q.target.art);
  target.root.id="targetSpecimen";target.root.tabIndex=-1;
  target.root.append(create("span","scale-target-handle","↕ DRAG"));
  ref.root.id="referenceSpecimen";ref.wrap.id="referenceArt";target.wrap.id="targetArt";
  const labels=create("div","scale-labels");
  const a=create("div");a.append(create("strong","",q.reference.name),create("span","",formatNumber(q.reference.height,1)+" M / REFERENZ"));
  const b=create("div");b.append(create("strong","",q.target.name),create("span","","DEINE SCHÄTZUNG"));
  labels.append(a,b);
  stage.append(lines,ground,ref.root,target.root,labels);
  installScaleDrag(target.root);
 }else if(q.mode==="distance"){
  const outer=create("div","distance-globe"),stops=create("div","distance-stops");
  for(const [name,index] of [[q.from.name,0],[q.to.name,1]]){
   const card=create("div","place-pin");card.append(create("div","place-symbol",index?"⌖":"◉"),create("strong","",name),create("small","",index?"DESTINATION / 02":"ORIGIN / 01"));stops.append(card);
  }
  const wire=create("div","distance-wire");
  wire.innerHTML='<svg viewBox="0 0 440 170" preserveAspectRatio="none" aria-hidden="true"><path d="M0 115 Q220 -80 440 115" /><path class="distance-pulse" id="distancePulse" d="M0 115 Q220 -80 440 115" /></svg>';
  const legend=create("div","distance-caption","LUFTLINIE / KEINE ROUTENBERECHNUNG");
  const bar=create("div","distance-guess-line"),fill=create("div");fill.id="distanceFill";bar.append(fill);
  outer.append(stops,wire,bar,legend);stage.append(outer);
 }else if(q.mode==="time"){
  const outer=create("div","time-visual");
  outer.append(create("div","time-event-tag","A MOMENT IN HISTORY / GUESS THE YEAR"));
  outer.append(create("div","time-event-card",q.label));
  const area=create("div","timeline-area"),stem=create("div","timeline-stem"),pin=create("div","timeline-pin");
  pin.id="timelinePin";pin.append(create("strong","","1950"));
  stem.append(pin);area.append(stem);
  const ticks=create("div","timeline-ticks");
  [1800,1850,1900,1950,2000,2026].forEach(y=>ticks.append(create("span","",y)));
  area.append(ticks);outer.append(area,create("div","timeline-title-label","MOVE THE MARKER / 1800 – 2026"));stage.append(outer);
 }else{
  const outer=create("div","weather-visual"),c=create("div","weather-city-card");
  c.append(create("span","","LOCATION / "+q.city.country),create("strong","",q.city.name),create("p","","Momentane Temperatur laut Open-Meteo · es wird nur der Wert nach der Abgabe gezeigt."));
  const thermometer=create("div","thermo"),outline=create("div","thermo-outline"),fill=create("div","thermo-fill");
  fill.id="thermoFill";outline.append(fill);
  const ticks=create("div","thermo-mark");["+40°","+20°","0°","−20°"].forEach(s=>ticks.append(create("span","",s)));
  thermometer.append(outline,create("div","thermo-bulb"),ticks);
  outer.append(c,thermometer);stage.append(create("div","weather-cloud","☼"),outer);
 }
}
function installScaleDrag(node){
 let engaged=false;
 const setFromPointer=ev=>{
  if(!engaged||state.status!=="estimating")return;
  ev.preventDefault();
  const scene=$("visualStage").getBoundingClientRect();
  const refHeight=referencePixels();
  const bottom=scene.bottom-69;
  const px=bottom-ev.clientY;
  const range=nextRange("scale"),ratio=clamp(px/refHeight,range.min,range.max);
  $("guessSlider").value=Math.round(valueToSlider(ratio,range.min,range.max));
  updateGuess();
 };
 node.addEventListener("pointerdown",ev=>{if(state.status!=="estimating")return;engaged=true;node.setPointerCapture(ev.pointerId);setFromPointer(ev);});
 node.addEventListener("pointermove",setFromPointer);
 const done=()=>{engaged=false;};
 node.addEventListener("pointerup",done);node.addEventListener("pointercancel",done);
}
function referencePixels(){return clamp(($("visualStage").clientHeight-101)/3.3,66,108);}
function valueFromSlider(mode){
 const q=state.current,pos=Number($("guessSlider").value),r=nextRange(mode);
 return mode==="scale"||mode==="distance"?sliderToValue(pos,r.min,r.max):r.min+(r.max-r.min)*pos/1000;
}
function positionForValue(mode,value){
 const r=nextRange(mode);
 return mode==="scale"||mode==="distance"?valueToSlider(value,r.min,r.max)/10:(value-r.min)/(r.max-r.min)*100;
}
function updateGuess(){
 const q=state.current;if(!q)return;
 let value=valueFromSlider(q.mode);
 if(q.mode==="time")value=Math.round(value);
 if(q.mode==="weather")value=Math.round(value*2)/2;
 state.guess=value;
 put("estimateReadout",formatValue(q.mode,value));
 const percent=Number($("guessSlider").value)/1000;
 if(q.mode==="scale"){
  const px=referencePixels();
  const ref=$("referenceArt"),target=$("targetArt");
  if(ref&&target){
   ref.style.setProperty("--h",px+"px");
   target.style.setProperty("--h",(px*value)+"px");
  }
 }else if(q.mode==="distance"){
  const fill=$("distanceFill");if(fill)fill.style.width=(percent*100)+"%";
  const pulse=$("distancePulse");if(pulse)pulse.style.strokeDasharray=(Math.max(2,percent*520))+" 650";
 }else if(q.mode==="time"){
  const pin=$("timelinePin");if(pin){pin.style.left=(percent*100)+"%";pin.querySelector("strong").textContent=String(value);}
 }else{
  const fill=$("thermoFill");if(fill)fill.style.height=clamp(percent*100,0,100)+"%";
 }
}
function showHint(){
 if(state.status!=="estimating"||state.hinted)return;
 const q=state.current;state.hinted=true;
 $("hintButton").disabled=true;$("hintMessage").hidden=false;
 let text="";
 if(q.mode==="scale")text=q.truth>1?"Das gesuchte Objekt ist höher als die Referenz.":"Das gesuchte Objekt ist niedriger als die Referenz.";
 else if(q.mode==="distance")text=q.truth<1000?"Es sind weniger als 1'000 Kilometer Luftlinie.":"Es sind mindestens 1'000 Kilometer Luftlinie.";
 else if(q.mode==="time")text=q.truth<1950?"Dieses Ereignis liegt vor 1950.":"Dieses Ereignis liegt 1950 oder später.";
 else text=q.truth<10?"Die Temperatur liegt unter 10 °C.":"Die Temperatur liegt bei mindestens 10 °C.";
 put("hintMessage",text+" · Für diese Runde maximal 700 statt 1'000 Punkte.");
}
function validateSource(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:"https://www.wikipedia.org/";}catch{return "https://www.wikipedia.org/";}}
function reveal(){
 const q=state.current;
 if(state.status!=="estimating"||!q||!Number.isFinite(q.truth))return;
 const guess=state.guess,truth=q.truth;
 state.status="revealed";
 const scored=pointsFor(q.mode,guess,truth,state.hinted);
 state.score+=scored;
 const difference=q.mode==="time"?Math.abs(Math.round(guess)-Math.round(truth))+" Jahre":
  q.mode==="weather"?formatNumber(Math.abs(guess-truth),1)+" °C":
  q.mode==="scale"?formatNumber(Math.abs(guess-truth),2)+"×":
  formatNumber(Math.abs(guess-truth),0)+" km";
 const name=q.mode==="scale"?q.target.name:q.mode==="distance"?q.from.name+" – "+q.to.name:
  q.mode==="time"?q.label:q.city.name;
 state.results.push({name,mode:q.mode,score:scored,guess,truth});
 $("guessSlider").disabled=true;$("nudgeMinus").disabled=true;$("nudgePlus").disabled=true;$("hintButton").disabled=true;
 $("lockButton").hidden=true;$("revealPanel").hidden=false;
 const grade=scored>=900?"BULLSEYE!":scored>=700?"VERY CLOSE!":scored>=400?"NOT BAD.":"ROOM TO GROW.";
 put("revealStatus",grade+" / "+difference+" DANEBEN");
 put("revealPoints","+"+scored+" P.");
 put("revealedGuess",formatValue(q.mode,guess));put("revealedTruth",formatValue(q.mode,truth));
 let fact,source;
 if(q.mode==="scale"){
  fact=q.reference.name+" ist "+formatNumber(q.reference.height,1)+" m hoch. "+q.target.name+" misst "+formatNumber(q.target.height,1)+" m. "+q.target.note;
  source=q.target.source;
 }else if(q.mode==="distance"){
  fact="Luftlinie von "+q.from.name+" nach "+q.to.name+": "+formatNumber(truth,0)+" km. Berechnet mit dem Haversine-Verfahren aus Stadtkern-Koordinaten; kein Strassenweg.";
  source=q.source;
 }else if(q.mode==="time"){
  fact=q.label+" – das korrekte Jahr ist "+truth+".";
  source=q.source;
 }else{
  fact="Open-Meteo meldet für "+q.city.name+" einen aktuellen Modellwert von "+formatNumber(truth,1)+" °C. Keine lokale Stationsmessung; die Werte werden ca. 10 Minuten gecacht.";
  source=SOURCE_WEATHER;
 }
 put("revealFact",fact);
 const sourceLink=$("revealSource");
 sourceLink.hidden=!source;
 if(source){sourceLink.href=validateSource(source);put("revealSource","Zur Faktenquelle ↗");}
 put("nextButton",state.index===state.deck.length-1?"Zur Auswertung →":"Nächste Runde →");
 const marker=$("answerMark");marker.hidden=false;marker.style.left=positionForValue(q.mode,truth)+"%";
 if(q.mode==="scale"){
  const line=create("div","scale-reveal-line");
  line.style.bottom=(69+referencePixels()*truth)+"px";
  $("stageContent").append(line);
 }else if(q.mode==="time"){
  const pin=$("timelinePin"),marker=create("div","timeline-pin-actual");
  marker.style.left=positionForValue("time",truth)+"%";
  pin?.parentElement?.append(marker);
 }
 put("scoreTotal",String(state.score).padStart(4,"0"));
 $("progressFill").style.width=((state.index+1)/state.deck.length*100)+"%";
}
function advance(){
 if(!["revealed","unavailable"].includes(state.status))return;
 if(state.status==="unavailable")state.results.push({name:state.current.city.name+" (offline)",mode:"weather",score:0,guess:null,truth:null});
 state.index++;
 if(state.index>=state.deck.length){end();return;}
 nextQuestion();
}
function end(){
 ++state.loadingToken;state.status="finished";
 const points=state.results.reduce((s,r)=>s+r.score,0),average=state.results.length?Math.round(points/state.results.length):0;
 const bestSingle=state.results.length?Math.max(...state.results.map(x=>x.score)):0;
 const key="almost-record-v1",best=Math.max(Number(read(key,0))||0,points);
 store(key,best);
 put("finalScore",String(points).padStart(4,"0"));
 put("finalAverage",average+" / 1000");put("finalBest",bestSingle+" P.");put("finalRecord",String(best).padStart(4,"0"));
 put("finalSubtitle",average>=850?"Dein Gefühl für Zahlen ist verblüffend gut.":average>=600?"Überraschend nah. Da ist ein gutes Bauchgefühl.":"Die Wirklichkeit ist manchmal ziemlich wild. Noch ein Versuch?");
 const rows=document.createDocumentFragment();
 state.results.forEach((x,i)=>{
  const row=create("div","history-row"),badge=create("span","history-rank",String(i+1).padStart(2,"0"));
  const copy=create("div","history-detail");
  copy.append(create("strong","",x.name),create("small","",x.truth===null?"Live-Dienst offline":formatValue(x.mode,x.guess)+" → "+formatValue(x.mode,x.truth)));
  row.append(badge,copy,create("span","history-points","+"+x.score));rows.append(row);
 });
 $("historyList").replaceChildren(rows);show("final");
}
function reset(){++state.loadingToken;state.status="setup";state.current=null;state.deck=[];show("setup");}
function bind(){
 $("toggleCustom").addEventListener("click",()=>{
  const open=$("customEditor").hidden;
  $("customEditor").hidden=!open;$("toggleCustom").setAttribute("aria-expanded",String(open));
 });
 $("customForm").addEventListener("submit",addCustom);
 document.querySelectorAll("#roundPicker button").forEach(b=>b.addEventListener("click",()=>{
  state.settings.rounds=Number(b.dataset.rounds);renderRounds();saveSettings();
 }));
 $("startButton").addEventListener("click",start);
 $("backButton").addEventListener("click",reset);
 $("guessSlider").addEventListener("input",updateGuess);
 $("nudgeMinus").addEventListener("click",()=>{const s=$("guessSlider");s.value=String(clamp(Number(s.value)-5,0,1000));updateGuess();});
 $("nudgePlus").addEventListener("click",()=>{const s=$("guessSlider");s.value=String(clamp(Number(s.value)+5,0,1000));updateGuess();});
 $("hintButton").addEventListener("click",showHint);
 $("lockButton").addEventListener("click",reveal);
 $("nextButton").addEventListener("click",advance);
 $("restartButton").addEventListener("click",start);
 $("reconfigureButton").addEventListener("click",reset);
 window.addEventListener("resize",()=>{if(state.status==="estimating"||state.status==="revealed")updateGuess();});
}
restore();bind();
if(new URLSearchParams(location.search).has("quick"))start();
