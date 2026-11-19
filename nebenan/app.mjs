import {createWorldExplorer} from "./map-ui.mjs";
import {CITIES,COUNTRY_DEFAULTS,SOURCES,fmtNumber,fmtDate,normalizedName,normalizeCountries,nearestCountry,localOffsetTime,randomInt,chooseQuiz,currencyCode,countryByCode,upcomingHolidays,parseJpl,parseJourney,formatClock,escapeLink} from "./core.mjs";
import * as API from "./api.mjs";

const $=id=>document.getElementById(id);
const el=(tag,cls="",value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
const link=(url,title,cls="")=>{const a=el("a",cls,title);a.href=escapeLink(url)||"https://www.wikipedia.org/";a.target="_blank";a.rel="noopener noreferrer";return a;};
const note=(id,txt,cls="empty-text")=>$(id).replaceChildren(el("p",cls,txt));
const load=id=>note(id,"Daten werden geladen …","loading");
const state={countries:normalizeCountries(COUNTRY_DEFAULTS),country:null,token:0,explorer:null,quiz:null,score:0,answered:false,pokemon:null,shown:false,lastAsteroid:0};
const title=c=>{try{return new Intl.DisplayNames(["de"],{type:"region"}).of(c.alpha2Code)||c.name;}catch{return c.name;}};
function addList(id,rows){
  const ul=el("ul","data-list");
  for(const r of rows){
    const li=el("li"),left=r.action?el("button"):el("div");
    left.append(el("strong","",r.title),el("span","",r.sub||""));
    if(r.action)left.addEventListener("click",r.action);
    li.append(left,el("span","amount",r.right||""));ul.append(li);
  }
  $(id).replaceChildren(ul);
}
function status(text){$("countryStatus").textContent=text;}
function clock(){
  const c=state.country;if(!c)return;
  const zone=c.timezones?.[0]||"UTC+00:00";
  $("localClock").textContent=localOffsetTime(new Date(),zone);
  $("timeZone").textContent=zone;
  $("timeZone").title="UTC-Offset aus den Länderdaten, ohne automatische Sommerzeitumstellung.";
}
function ensureCurrency(code){
  const from=$("currencyFrom"),to=$("currencyTo");
  if(!Array.from(from.options).some(o=>o.value===code))from.add(new Option(code,code));
  from.value=code;
  if(from.value===to.value)to.value=code==="CHF"?"EUR":"CHF";
}
function pickCountry(c,{fly=true,reason="Land ausgewählt"}={}){
  if(!c)return;state.country=c;const token=++state.token;
  $("countryCode").textContent=c.alpha2Code+" / "+(c.alpha3Code||"—");
  $("countryFlag").textContent=c.flag||"🌎";
  $("countryName").textContent=title(c);
  $("countryRegion").textContent=[c.region,c.subregion].filter(Boolean).join(" · ");
  $("capitalField").textContent=c.capital||"—";
  $("populationField").textContent=c.population?fmtNumber(c.population):"—";
  $("areaField").textContent=c.area?fmtNumber(c.area)+" km²":"—";
  $("currencyField").textContent=currencyCode(c);
  $("languageField").textContent="Sprachen: "+(c.languages?.slice(0,2).map(l=>l.name).join(", ")||"—");
  $("countryInput").value=title(c);
  $("countryWiki").href="https://de.wikipedia.org/wiki/Spezial:Suche?"+new URLSearchParams({search:c.name});
  status(reason+" · "+title(c));
  clock();
  state.explorer?.selectCountry(c,{fly});
  if($("regionSelect").value!=="all"&&$("regionSelect").value!==c.region)$("regionSelect").value="all";
  ensureCurrency(currencyCode(c));
  load("musicContent");load("holidayContent");load("worldBankContent");
  music(c,token);holidays(c,token);bank(c,token);exchange(token);
}
function findCountry(query){
  const q=normalizedName(query),code=String(query).trim().toUpperCase();
  return state.countries.find(c=>c.alpha2Code===code||c.alpha3Code===code)
    ||state.countries.find(c=>normalizedName(c.name)===q||normalizedName(title(c))===q)
    ||state.countries.find(c=>normalizedName(c.name).startsWith(q)||normalizedName(title(c)).startsWith(q));
}
function randomCountry(scroll=true){
  const filter=$("regionSelect").value;
  const list=state.countries.filter(c=>(filter==="all"||c.region===filter)&&c.alpha2Code!==state.country?.alpha2Code);
  if(!list.length){status("Keine weiteren Länder in diesem Kontinent gefunden.");return;}
  pickCountry(list[randomInt(list.length)],{reason:"Der Zufall hat entschieden"});
  if(scroll)$("atlas").scrollIntoView({behavior:"smooth",block:"start"});
}
function fillCountries(){
  const datalist=$("countrySuggestions"),frag=document.createDocumentFragment();
  state.countries.forEach(c=>{const item=document.createElement("option");item.value=title(c);frag.append(item);});
  datalist.replaceChildren(frag);
}
async function countries(){
  try{
    const list=normalizeCountries(await API.countries());
    if(list.length<100)throw Error("Country list incomplete");
    state.countries=list;
    pickCountry(countryByCode(list,state.country?.alpha2Code||"CH")||list[0],{fly:false,reason:"Länderverzeichnis geladen"});
  }catch{status("Länderverzeichnis momentan nicht erreichbar – einige Länder stehen trotzdem bereit.");}
  fillCountries();quiz();
}
function mapInit(){
  state.explorer=createWorldExplorer({
    getCountries:()=>state.countries,
    onChooseCountry:country=>pickCountry(country,{fly:false,reason:"Auf der Karte ausgewählt"})
  });
  state.explorer?.selectCountry(state.country,{fly:false});
}
function focus(lat,lon,name,isQuake=false){
  state.explorer?.focusEvent(lat,lon,name,isQuake?"quake":"nature");
}

async function music(c,token){
  try{
    const tracks=await API.music(c.alpha2Code);if(token!==state.token)return;
    if(!tracks.length){note("musicContent","Für dieses Land sind gerade keine Musikcharts vorhanden.");return;}
    const panel=el("div","track-list");
    tracks.forEach((t,i)=>{
      const row=link(t.url||"https://music.apple.com/","","track"),url=escapeLink(t.artworkUrl100);
      if(url){const image=el("img");image.src=url;image.alt="";image.loading="lazy";row.append(image);}
      else row.append(el("span","track-art","♫"));
      row.append(el("span","track-number",String(i+1).padStart(2,"0")));
      const info=el("span","track-info");info.append(el("strong","",t.name||"Song ohne Titel"),el("span","",t.artistName||"Unbekannt"));
      row.append(info);panel.append(row);
    });
    $("musicContent").replaceChildren(panel);
    $("musicLabel").textContent="APPLE MUSIC · "+c.alpha2Code+" · MOST PLAYED";
  }catch{
    if(token!==state.token)return;
    const root=$("musicContent");
    root.replaceChildren(el("p","error-text","Der Chart-Feed dieser Region ist momentan nicht erreichbar."));
    root.append(link("https://music.apple.com/"+c.alpha2Code.toLowerCase()+"/browse","Regionale Charts bei Apple öffnen ↗","inline-action"));
  }
}
async function exchange(token=state.token){
  const a=$("currencyFrom").value,b=$("currencyTo").value,money=Number($("amountInput").value);
  if(!Number.isFinite(money)||money<0||money>1e9){note("currencyContent","Bitte einen Betrag von 0 bis 1 Milliarde eingeben.","error-text");return;}
  load("currencyContent");
  try{
    const rate=await API.exchange(a,b);
    if(token!==state.token)return;
    $("currencyContent").replaceChildren(
      el("strong","",fmtNumber(money*rate.rate,2)+" "+b),
      el("small","","1 "+a+" = "+fmtNumber(rate.rate,5)+" "+b+" · Kursdatum "+(rate.date||"unbekannt"))
    );
  }catch{if(token===state.token)note("currencyContent","Referenzkurs gerade nicht abrufbar.","error-text");}
}
async function holidays(c,token){
  try{
    const rows=upcomingHolidays(await API.holidays(c.alpha2Code),new Date(),3);
    if(token!==state.token)return;
    if(!rows.length){note("holidayContent","Keine weiteren Feiertage in den verfügbaren Daten.");return;}
    addList("holidayContent",rows.map(x=>({
      title:x.localName||x.name||"Feiertag",
      sub:x.nationalHoliday===true||x.global===true?"Landesweit":"Regional · Gültigkeit prüfen",
      right:fmtDate(x.date).slice(0,6)
    })));
  }catch{if(token===state.token)note("holidayContent","Für dieses Land keine Feiertagsdaten verfügbar.","error-text");}
}
async function bank(c,token){
  if(!/^[A-Z]{3}$/.test(c.alpha3Code)){note("worldBankContent","Kein Statistik-Ländercode verfügbar.");return;}
  const all=await Promise.allSettled([API.worldBank(c.alpha3Code,"SP.POP.TOTL"),API.worldBank(c.alpha3Code,"IT.NET.USER.ZS")]);
  if(token!==state.token)return;
  const pop=all[0].status==="fulfilled"?all[0].value:null;
  const net=all[1].status==="fulfilled"?all[1].value:null;
  const out=$("worldBankContent");out.replaceChildren();
  if(pop)out.append(el("strong","fact-number",fmtNumber(pop.value)),el("span","fact-label","BEVÖLKERUNG · DATENJAHR "+pop.year));
  if(net)out.append(el("strong","fact-number",fmtNumber(net.value,1)+" %"),el("span","fact-label","INTERNETNUTZUNG · DATENJAHR "+net.year));
  if(!pop&&!net)out.append(el("p","error-text","Für das Land liegen keine Werte vor."));
}
async function quakes(){
  const range=$("quakeRange").value;load("quakeContent");
  try{
    const features=await API.quakes(range);if(range!==$("quakeRange").value)return;
    state.explorer?.setEarthquakes(features);
    const base=$("quakeContent");base.replaceChildren(el("p","quakes-summary",fmtNumber(features.length)+" Beben mit M ≥ 2,5 im Feed."));
    const ul=el("ul","data-list");
    for(const q of features.slice(0,4)){
      const props=q.properties||{},c=q.geometry?.coordinates||[];
      const li=el("li"),b=el("button");
      b.append(el("strong","",props.place||"Ohne Ortsangabe"),el("span","",props.time?fmtDate(props.time):"—"));
      b.addEventListener("click",()=>focus(Number(c[1]),Number(c[0]),props.place||"Erdbeben",true));
      li.append(b,el("span","amount","M "+(Number.isFinite(props.mag)?props.mag.toFixed(1):"—")));ul.append(li);
    }
    base.append(ul);
  }catch{note("quakeContent","USGS derzeit nicht erreichbar.","error-text");}
}
function eventLocation(event){
  const items=Array.isArray(event.geometry)?event.geometry:[];
  for(let i=items.length-1;i>=0;i--){const c=items[i].coordinates;if(items[i].type==="Point"&&Array.isArray(c)&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1])))return [Number(c[1]),Number(c[0])];}
  return null;
}
async function nasa(){
  load("nasaContent");
  try{
    const all=await API.nasaEvents();
    state.explorer?.setNatureEvents(all);
    const events=all.map(x=>({data:x,at:eventLocation(x)})).filter(x=>x.at).slice(0,4);
    if(!events.length){note("nasaContent","Keine Naturereignisse mit Punkt-Koordinaten gefunden.");return;}
    const ul=el("ul","data-list");
    for(const event of events){
      const row=el("li"),b=el("button"),d=event.data;
      b.append(el("strong","",d.title||"Naturereignis"),el("span","",(d.categories||[]).map(c=>c.title).join(", ")||"NASA EONET"));
      b.addEventListener("click",()=>focus(event.at[0],event.at[1],d.title||"NASA Naturereignis"));
      row.append(b,el("span","amount","Karte ↗"));ul.append(row);
    }
    $("nasaContent").replaceChildren(ul);
  }catch{note("nasaContent","NASA-Ereignisfeed derzeit nicht erreichbar.","error-text");}
}
async function asteroids(force=false){
  if(force&&Date.now()-state.lastAsteroid<60000){note("asteroidContent","Bitte nach einer Minute erneut versuchen.");return;}
  state.lastAsteroid=Date.now();load("asteroidContent");
  try{
    const objects=parseJpl(await API.asteroids());
    if(!objects.length){note("asteroidContent","Keine passenden Annäherungen im aktuellen Zeitraum.");return;}
    const ul=el("ul","data-list");
    for(const o of objects.slice(0,3)){
      const li=el("li"),left=el("div");
      left.append(el("strong","",o.name),el("span","",o.date||"Datum unbekannt"));
      li.append(left,el("span","amount",fmtNumber(o.au*149597870.7)+" km"));ul.append(li);
    }
    $("asteroidContent").replaceChildren(el("p","quakes-summary","Erdannäherungen innerhalb von 7 Tagen"),ul);
  }catch{note("asteroidContent","NASA/JPL derzeit nicht erreichbar.","error-text");}
}
async function dog(){
  const button=$("dogButton");button.disabled=true;
  $("dogContent").replaceChildren(el("span","dog-placeholder","🐾"),el("span","","Ein Hund wird gesucht …"));
  try{
    const url=await API.dog(),image=el("img");image.src=url;image.alt="Ein zufälliger Hund aus dem Dog CEO Bildarchiv";
    image.addEventListener("error",()=>{$("dogContent").replaceChildren(el("span","","Bild nicht verfügbar."));});
    $("dogContent").replaceChildren(image);
  }catch{$("dogContent").replaceChildren(el("span","dog-placeholder","🐕"),el("span","","Heute kein Hund. Versuch es später."));}
  finally{button.disabled=false;}
}
function cityOptions(){
  for(const [code,city] of Object.entries(CITIES)){
    $("journeyFrom").add(new Option(city.name,code));$("journeyTo").add(new Option(city.name,code));
  }
  $("journeyFrom").value="zurich";$("journeyTo").value="bern";
}
async function travel(event){
  event.preventDefault();
  const from=CITIES[$("journeyFrom").value],to=CITIES[$("journeyTo").value],button=$("journeyButton");
  if(!from||!to||from===to){note("journeyContent","Start und Ziel müssen verschieden sein.");return;}
  button.disabled=true;button.textContent="Suche Verbindungen …";load("journeyContent");
  try{
    const trips=parseJourney(await API.journey(from,to));
    if(!trips.length){note("journeyContent","Keine Verbindung gefunden. Die Route ist womöglich nicht abgedeckt.");return;}
    const frag=document.createDocumentFragment();
    for(const trip of trips){
      const card=el("div","journey-result");
      card.append(el("strong","",formatClock(trip.start)+" → "+formatClock(trip.end)));
      card.append(el("p","",fmtNumber(trip.durationMinutes)+" Minuten · "+(trip.transfers===null?"Umstiege unbekannt":trip.transfers+" Umstiege")));
      card.append(el("div","legrow",[...new Set(trip.legs.map(l=>l.name||l.mode).filter(Boolean))].slice(0,6).join(" → ")||"ÖV-Auskunft"));
      frag.append(card);
    }
    $("journeyContent").replaceChildren(frag,el("p","","Fahrplanbasierte Angaben; Abweichungen möglich."));
  }catch{
    $("journeyContent").replaceChildren(el("p","error-text","Transitous ist gerade nicht erreichbar oder hat keine Verbindung gefunden."),link("https://transitous.org/","Im Transitous-Reiseplaner öffnen ↗","inline-action"));
  }finally{button.disabled=false;button.textContent="Verbindungen suchen ↗";}
}
function quiz(){
  state.quiz=chooseQuiz(state.countries);state.answered=false;
  $("quizScore").textContent=state.score+" RICHTIG";
  const list=$("quizOptions");list.replaceChildren();
  if(!state.quiz){$("quizQuestion").textContent="Das Länderquiz lädt …";return;}
  $("quizQuestion").textContent="Zu welchem Land gehört "+state.quiz.capital+"?";
  for(const option of state.quiz.options){
    const b=el("button","",option);b.type="button";
    b.addEventListener("click",()=>{
      if(state.answered)return;state.answered=true;
      const correct=option===state.quiz.answer;
      if(correct)state.score++;
      $("quizScore").textContent=state.score+" RICHTIG";
      for(const item of list.querySelectorAll("button")){
        item.disabled=true;
        if(item.textContent===state.quiz.answer)item.classList.add("correct");
        else if(item===b)item.classList.add("wrong");
      }
      $("quizFeedback").textContent=(correct?"Treffer! ":"Knapp daneben. ")+state.quiz.capital+" gehört zu "+state.quiz.answer+".";
    });
    list.append(b);
  }
  $("quizFeedback").textContent="Ein Land, vier Möglichkeiten. Du bist dran.";
}
async function pokemon(){
  const btn=$("pokemonNext");btn.disabled=true;$("pokemonReveal").disabled=true;
  state.pokemon=null;state.shown=false;$("pokemonNumber").textContent="# ???";
  $("pokemonArt").classList.remove("revealed");
  $("pokemonArt").replaceChildren(el("span","","◌"));
  $("pokemonAnswer").textContent="Ein Pokémon taucht auf …";
  try{
    const data=await API.pokemon(randomInt(1025)+1);
    state.pokemon=data;$("pokemonNumber").textContent="# "+String(data.id).padStart(4,"0");
    if(data.image){const image=el("img");image.src=data.image;image.alt="Verdeckte Pokémon-Silhouette";image.addEventListener("error",()=>{$("pokemonArt").replaceChildren(el("span","","?"));});$("pokemonArt").replaceChildren(image);}
    $("pokemonAnswer").textContent="Weisst du, wer es ist?";$("pokemonReveal").disabled=false;
  }catch{$("pokemonAnswer").textContent="PokéAPI gerade nicht erreichbar.";}
  finally{btn.disabled=false;}
}
function reveal(){
  if(!state.pokemon||state.shown)return;
  state.shown=true;$("pokemonArt").classList.add("revealed");
  $("pokemonAnswer").textContent=state.pokemon.name.toUpperCase().replace(/-/g," ")+" · "+state.pokemon.types.join(" / ");
  $("pokemonReveal").disabled=true;
}
function sources(){
  const frag=document.createDocumentFragment();
  for(const s of SOURCES){const a=link(s.url,"","source-item");
    a.append(el("span","source-type",s.topic.toUpperCase()),el("strong","",s.name),el("p","",s.note));frag.append(a);}
  $("sourceGrid").replaceChildren(frag);
}
function init(){
  state.country=countryByCode(state.countries,"CH");
  pickCountry(state.country,{fly:false});
  mapInit();cityOptions();fillCountries();sources();quiz();
  if(new URLSearchParams(location.search).has("qa"))window.__NEBENAN_QA__={
    map:()=>state.explorer?.getMap(),selected:()=>state.country?.alpha2Code
  };
  $("countryForm").addEventListener("submit",e=>{e.preventDefault();const c=findCountry($("countryInput").value);if(c)pickCountry(c,{reason:"Über die Suche ausgewählt"});else status("Kein passendes Land. Probiere Name oder ISO-Code.");});
  $("regionSelect").addEventListener("change",()=>{if($("regionSelect").value!=="all")randomCountry(false);});
  $("heroRandom").addEventListener("click",()=>randomCountry());
  $("countryRandom").addEventListener("click",()=>randomCountry(false));
  document.querySelectorAll("[data-country]").forEach(b=>b.addEventListener("click",()=>pickCountry(countryByCode(state.countries,b.dataset.country),{reason:"Spontanziel"})));
  $("exchangeForm").addEventListener("submit",e=>{e.preventDefault();exchange();});
  $("currencySwap").addEventListener("click",()=>{const a=$("currencyFrom"),b=$("currencyTo");[a.value,b.value]=[b.value,a.value];exchange();});
  $("quakeRange").addEventListener("change",quakes);
  $("asteroidRefresh").addEventListener("click",()=>asteroids(true));
  $("dogButton").addEventListener("click",dog);
  $("journeyForm").addEventListener("submit",travel);
  $("nextQuiz").addEventListener("click",quiz);
  $("pokemonReveal").addEventListener("click",reveal);
  $("pokemonNext").addEventListener("click",pokemon);
  clock();setInterval(clock,30000);
  countries();quakes();nasa();asteroids();pokemon();
}
init();
