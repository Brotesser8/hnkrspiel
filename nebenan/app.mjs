import {CHANNELS,CITIES,ART_TOPICS,BOOK_TOPICS,SOUND_REGIONS,SOURCES,number,dateLabel,localClock,weekday,wmoWeather,aqiDescription,parseForecast,normalizeCity,safeHttps,parseArtworks,normalizeBooks,parseQuakes,parseEonet,parseCharts,upcomingHoliday,safePocket,randomIndex} from "./core.mjs";
import {api} from "./api.mjs";

const $=id=>document.getElementById(id);
const elem=(tag,cls="",text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const put=(id,text)=>{const e=$(id);if(e)e.textContent=String(text);};
const link=(url,label,cls="")=>{const a=elem("a",cls,label);a.href=safeHttps(url)||"https://www.wikipedia.org/";a.target="_blank";a.rel="noopener noreferrer";return a;};
const showError=(id,message,help)=>{const root=$(id);if(!root)return;const block=elem("div","empty-state");block.append(elem("p","",message));if(help)block.append(link(help,"Datenanbieter öffnen ↗","inline-link"));root.replaceChildren(block);};
const state={
 channel:"world",loaded:new Set(),city:CITIES[0],token:{world:0,art:0,books:0,earth:0,sound:0,play:0},
 artTopic:ART_TOPICS[0],artPage:1,artWorks:[],selectedArt:null,
 bookTopic:BOOK_TOPICS[0],books:[],selectedBook:null,
 earthMode:"quakes",earthItems:[],selectedEvent:null,soundRegion:"ch",tracks:[],
 pokemon:null,pokemonRevealed:false,streak:0,found:0,pocket:[]
};
let toastTimer=0,drawerFocus=null;
function notify(text){
 const node=$("toast");node.textContent=text;node.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,2600);
}
function setButtonActive(parent,selector,attribute,value){
 parent.querySelectorAll(selector).forEach(b=>{
  const active=b.getAttribute(attribute)===value;
  b.classList.toggle("active",active);
  b.setAttribute("aria-pressed",String(active));
 });
}
function options(container,items,{value,key="id",title="name",onSelect}){
 const node=$(container),frag=document.createDocumentFragment();
 for(const item of items){
  const b=elem("button","",item[title]);b.type="button";b.dataset.id=item[key];
  b.setAttribute("aria-pressed",String(item[key]===value));
  if(item[key]===value)b.classList.add("active");
  b.addEventListener("click",()=>onSelect(item));frag.append(b);
 }
 node.replaceChildren(frag);
}
function choose(channel,{scroll=false,focus=false}={}){
 if(!CHANNELS.some(c=>c.id===channel))return;
 state.channel=channel;
 for(const button of document.querySelectorAll(".station")){
  const active=button.dataset.channel===channel;
  button.classList.toggle("active",active);
  button.setAttribute("aria-selected",String(active));
  button.tabIndex=active?0:-1;
  if(active&&focus)button.focus();
 }
 for(const c of CHANNELS)$("panel-"+c.id).hidden=c.id!==channel;
 const meta=CHANNELS.find(c=>c.id===channel);
 put("stageLabel","CHANNEL "+meta.number+" / "+meta.name.toUpperCase());
 if(scroll)$("studio").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
 if(!state.loaded.has(channel)){state.loaded.add(channel);loadChannel(channel);}
}
function loadChannel(channel){
 if(channel==="world")loadWorld();
 if(channel==="art")loadArt();
 if(channel==="books")loadBooks();
 if(channel==="earth")loadEarth();
 if(channel==="sound")loadSound();
 if(channel==="play")newPokemon();
}
function randomChannel(){
 const possibilities=CHANNELS.filter(c=>c.id!==state.channel);
 const next=possibilities[randomIndex(possibilities.length)];
 choose(next.id,{scroll:true});
}
function drawSources(){
 const root=$("sourcesList"),frag=document.createDocumentFragment();
 SOURCES.forEach(s=>{const a=link(s.url,"","source-link");a.append(elem("span","",s.name),elem("span","","↗"));a.title=s.detail;frag.append(a);});
 root.replaceChildren(frag);
}
function cityChips(){
 options("cityPresets",CITIES.slice(0,6),{value:state.city.id,onSelect:c=>selectCity(c)});
}
function selectCity(city){
 state.city=city;cityChips();$("citySearchResults").hidden=true;
 put("weatherCity",city.name);put("weatherCountry",[(city.country||"").toUpperCase(),(city.region||"").toUpperCase()].filter(Boolean).join(" / "));
 put("weatherLocalTime",localClock(city.timezone)+" Uhr · lokale Zeit");
 state.token.world++;
 loadWorld();
}
async function searchCity(event){
 event.preventDefault();
 const term=$("citySearch").value.trim();
 if(term.length<2){notify("Bitte mindestens zwei Zeichen eingeben.");return;}
 const btn=$("cityGo");btn.disabled=true;put("cityGo","Suche …");
 $("citySearchResults").hidden=false;
 $("citySearchResults").replaceChildren(elem("p","empty-state","Suche nach "+term+" …"));
 try{
  const raw=await api.geocode(term);
  const places=(raw?.results||[]).map(normalizeCity).filter(Boolean);
  if(!places.length)throw Error("Kein passender Ort gefunden.");
  const root=$("citySearchResults"),frag=document.createDocumentFragment();
  places.forEach(city=>{
    const b=elem("button");b.type="button";
    b.append(elem("strong","",city.name),elem("small","",[(city.region||""),city.country].filter(Boolean).join(" · ")));
    b.addEventListener("click",()=>{selectCity(city);$("citySearch").value="";});
    frag.append(b);
  });root.replaceChildren(frag);
 }catch(error){showError("citySearchResults",error.message||"Stadtsuche derzeit nicht erreichbar.");}
 finally{btn.disabled=false;put("cityGo","Ort finden ↗");}
}
function updateClock(){
 if(state.city&&state.channel==="world")put("weatherLocalTime",localClock(state.city.timezone)+" Uhr · lokale Zeit");
}
async function loadWorld(){
 const c=state.city,token=++state.token.world;
 put("weatherCity",c.name);put("weatherCountry",[(c.country||"").toUpperCase(),(c.region||"").toUpperCase()].filter(Boolean).join(" / "));
 put("weatherTemp","—");put("weatherCondition","WIRD GELADEN");put("weatherWind","Wind —");put("weatherRain","Regen —");put("weatherUpdate","Aktualisiere …");put("weatherGlyph","◌");
 $("weatherHero").className="weather-hero";
 $("forecastDays").replaceChildren(elem("div","empty-state","Wettervorhersage wird geladen …"));
 put("airNumber","—");put("airLabel","Luftqualität wird geladen …");$("airMeterBar").style.left="0%";
 put("holidayName","—");put("holidayDate","Feiertage werden geladen …");
 updateClock();
 const work=[
  api.weather(c).then(raw=>{
   if(token!==state.token.world)return;
   const w=raw?.current;
   if(!w||!Number.isFinite(w.temperature_2m))throw Error("Keine aktuellen Messwerte");
   const detail=wmoWeather(w.weather_code),hero=$("weatherHero");
   hero.className="weather-hero "+detail.tone+(w.is_day===0?" night":"");
   put("weatherCondition",detail.name.toUpperCase());
   put("weatherGlyph",detail.glyph);
   put("weatherTemp",number(Math.round(w.temperature_2m)));
   put("weatherWind",Number.isFinite(w.wind_speed_10m)?"Wind "+number(w.wind_speed_10m)+" km/h":"Wind —");
   put("weatherRain",Number.isFinite(w.precipitation)?"Regen "+number(w.precipitation,1)+" mm":"Regen —");
   put("weatherUpdate","Open-Meteo");
   const days=parseForecast(raw),frag=document.createDocumentFragment();
   days.forEach(d=>{
    const card=elem("div","forecast-day"),wc=wmoWeather(d.code);
    card.append(elem("span","",weekday(d.date)),elem("div","forecast-glyph",wc.glyph),elem("strong","",number(Math.round(d.high))+"° / "+number(Math.round(d.low))+"°"),elem("small","",d.rain===null||d.rain===undefined?"Regen —":number(d.rain)+" %"));
    card.title=wc.name;frag.append(card);
   });
   $("forecastDays").replaceChildren(frag);
  }).catch(()=>{if(token!==state.token.world)return;put("weatherCondition","NICHT VERFÜGBAR");put("weatherUpdate","Open-Meteo momentan offline");showError("forecastDays","Wetterdienst gerade nicht erreichbar.","https://open-meteo.com/");}),
  api.air(c).then(raw=>{
   if(token!==state.token.world)return;
   const a=raw?.current?.european_aqi;
   if(!Number.isFinite(a))throw Error("Kein AQI");
   const quality=aqiDescription(a);
   put("airNumber",number(a));put("airLabel",quality.name);$("airMeterBar").style.left=Math.min(98,quality.pct)+"%";
  }).catch(()=>{if(token!==state.token.world)return;put("airLabel","Aktuell keine Luftdaten.");}),
  c.countryCode?api.holiday(c.countryCode).then(raw=>{
   if(token!==state.token.world)return;
   const next=upcomingHoliday(raw);
   if(!next){put("holidayName","Nicht verfügbar");put("holidayDate","Keine kommenden Feiertage im Dienst");return;}
   put("holidayName",next.localName||next.name||"Feiertag");
   put("holidayDate",dateLabel(next.date,c.timezone));
   put("holidayRegion",next.global?"Landesweit":"Regional · Gültigkeit prüfen");
  }).catch(()=>{if(token!==state.token.world)return;put("holidayName","Nicht verfügbar");put("holidayDate","Keine Daten für dieses Land");}):Promise.resolve()
 ];
 await Promise.allSettled(work);
}
function artChips(){
 options("artTopics",ART_TOPICS,{value:state.artTopic.id,onSelect:t=>{
  state.artTopic=t;state.artPage=1;artChips();loadArt();
 }});
}
async function loadArt(){
 const topic=state.artTopic,page=state.artPage,token=++state.token.art;
 $("artFeature").replaceChildren(elem("div","art-skeleton"),elem("div","art-copy","Gemeinfreie Kunstwerke werden gesucht …"));
 $("artGallery").replaceChildren();state.selectedArt=null;
 try{
  const raw=await api.artworks(topic.q,page);
  if(token!==state.token.art)return;
  const works=parseArtworks(raw);
  if(!works.length)throw Error("Für dieses Thema sind gerade keine Bildwerke verfügbar.");
  state.artWorks=works;
  selectArtwork(works[0]);
 }catch(error){
  if(token!==state.token.art)return;
  showError("artFeature",error.message||"Kunstsammlung aktuell nicht verfügbar.","https://www.artic.edu/collection");
 }
}
function selectArtwork(art){
 state.selectedArt=art;
 const feature=$("artFeature"),imgWrap=elem("div","art-visual"),img=elem("img");img.src=art.image;img.alt=art.alt;img.loading="lazy";
 img.addEventListener("error",()=>{imgWrap.replaceChildren(elem("div","art-skeleton"));});
 imgWrap.append(img,elem("span","art-visual-label","PUBLIC DOMAIN · AIC"));
 const copy=elem("div","art-copy");
 copy.append(elem("span","label-mini","FROM THE COLLECTION / "+art.id),elem("h4","",art.title),elem("p","",art.artist));
 copy.append(elem("div","art-meta","Datierung: "+(art.year||"unbekannt")+" · Art Institute of Chicago"));
 copy.append(link(art.link,"Originalwerk ansehen ↗"));
 feature.replaceChildren(imgWrap,copy);
 const frag=document.createDocumentFragment();
 state.artWorks.slice(0,5).forEach(w=>{
  const b=elem("button","art-thumb"+(w.id===art.id?" active":""));b.type="button";b.setAttribute("aria-label","Kunstwerk auswählen: "+w.title);
  const p=elem("span","art-thumb-img"),thumb=elem("img");thumb.src=w.thumb;thumb.alt="";thumb.loading="lazy";
  thumb.addEventListener("error",()=>p.replaceChildren(elem("span","","◈")));
  p.append(thumb);b.append(p,elem("strong","",w.title),elem("small","",w.year||"Unbekannt"));
  b.addEventListener("click",()=>selectArtwork(w));frag.append(b);
 });
 $("artGallery").replaceChildren(frag);
}
function bookChips(){
 options("bookTopics",BOOK_TOPICS,{value:state.bookTopic.id,onSelect:t=>{state.bookTopic=t;bookChips();$("bookSearch").value="";loadBooks(t.q);}});
}
async function loadBooks(query=state.bookTopic.q){
 const token=++state.token.books;
 $("bookLead").replaceChildren(elem("div","book-placeholder","OPEN BOOK"),elem("div","","Ein neues Buchregal wird gesucht …"));
 $("bookResults").replaceChildren();put("bookResultCount","SUCHE …");state.selectedBook=null;
 try{
  const raw=await api.books(query);
  if(token!==state.token.books)return;
  const books=normalizeBooks(raw);if(!books.length)throw Error("Keine passenden Bücher gefunden.");
  state.books=books;put("bookResultCount",books.length+" VORSCHLÄGE");
  selectBook(books[0]);
 }catch(error){
  if(token!==state.token.books)return;showError("bookLead",error.message||"Open Library derzeit nicht erreichbar.","https://openlibrary.org/");
  put("bookResultCount","KEINE ERGEBNISSE");
 }
}
function coverFor(book,cls="book-visual"){
 const wrap=elem("div",cls);
 if(book.cover){
  const img=elem("img");img.src=book.cover;img.alt="";img.loading="lazy";
  img.addEventListener("error",()=>wrap.replaceChildren(elem("div","book-cover-fallback","✦")));
  wrap.append(img);
 }else wrap.append(elem("div","book-cover-fallback","✦"));
 return wrap;
}
function selectBook(book){
 state.selectedBook=book;
 const lead=$("bookLead"),content=elem("div");
 content.append(elem("span","label-mini","OPEN LIBRARY / BOOK PICK"),elem("h4","",book.title),elem("p","book-by",book.author));
 content.append(elem("p","",book.year?"Erstausgabe: "+book.year:"Erstausgabe nicht angegeben"));
 content.append(link(book.link,"Im Katalog ansehen ↗"));
 lead.replaceChildren(coverFor(book),content);
 const frag=document.createDocumentFragment();
 state.books.forEach(b=>{
  const btn=elem("button","book-card"+(b.id===book.id?" active":""));btn.type="button";
  const cover=b.cover?elem("img"):elem("div","book-cover-fallback","✦");
  if(b.cover){cover.src=b.cover;cover.alt="";cover.loading="lazy";cover.addEventListener("error",()=>cover.replaceWith(elem("div","book-cover-fallback","✦")));}
  btn.append(cover,elem("strong","",b.title),elem("small","",b.author));
  btn.addEventListener("click",()=>selectBook(b));frag.append(btn);
 });
 $("bookResults").replaceChildren(frag);
}
async function loadEarth(force=false){
 const mode=state.earthMode,token=++state.token.earth;
 put("earthStatLabel",mode==="quakes"?"LAST 24 HOURS":"ACTIVE NASA EVENTS");
 put("earthStatSub",mode==="quakes"?"Erdbeben ab Magnitude 2,5":"Aktive Naturereignisse aus dem NASA-Katalog");
 put("earthListTitle",mode==="quakes"?"LETZTE ERDBEBEN":"AKTIVE NATUREREIGNISSE");
 put("earthStat","—");$("radarDots").replaceChildren();$("earthResults").replaceChildren(elem("div","empty-state","Signale werden empfangen …"));
 const prev=$("selectedEvent");if(prev)prev.remove();
 try{
  const raw=mode==="quakes"?await api.quakes(force):await api.events(force);
  if(token!==state.token.earth)return;
  const items=mode==="quakes"?parseQuakes(raw):parseEonet(raw);
  state.earthItems=items;state.selectedEvent=null;
  put("earthStat",items.length===28?"28+ (AUSWAHL)":number(items.length));
  if(!items.length){showError("earthResults","Im abgefragten Zeitraum wurden keine passenden Ereignisse gefunden.");return;}
  const fragment=document.createDocumentFragment(),dots=document.createDocumentFragment();
  items.slice(0,10).forEach((e,i)=>{
   const b=elem("button","event-item");b.type="button";
   const dot=elem("span","event-marker"+(mode==="events"?" nasa":"")),copy=elem("span","event-copy");
   copy.append(elem("strong","",e.title),elem("small","",e.label),elem("span","event-date",e.detail));
   b.append(dot,copy,elem("span","event-arrow","↗"));
   b.addEventListener("click",()=>showEvent(e));
   fragment.append(b);
  });
  items.slice(0,28).forEach(e=>{
   const b=elem("button","radar-point"+(mode==="events"?" nasa":""));b.type="button";
   b.style.left=Math.max(0,Math.min(100,((e.lon+180)/360)*100))+"%";
   b.style.top=Math.max(0,Math.min(100,((90-e.lat)/180)*100))+"%";
   b.title=e.title;b.setAttribute("aria-label",e.title+" anzeigen");
   b.addEventListener("click",()=>showEvent(e));
   dots.append(b);
  });
  $("earthResults").replaceChildren(fragment);$("radarDots").replaceChildren(dots);
 }catch{
  if(token!==state.token.earth)return;put("earthStat","—");
  showError("earthResults","Der Ereignisdienst ist gerade nicht erreichbar.",mode==="quakes"?"https://earthquake.usgs.gov/earthquakes/":"https://eonet.gsfc.nasa.gov/");
 }
}
function showEvent(item){
 state.selectedEvent=item;
 const old=$("selectedEvent");if(old)old.remove();
 const detail=elem("div","event-detail");detail.id="selectedEvent";
 const left=elem("div");left.append(elem("span","label-mini",item.label),elem("h4","",item.title),elem("p","","Position: "+number(item.lat,2)+"° N / "+number(item.lon,2)+"° E · "+item.detail));
 detail.append(left,link(item.url,"Originalmeldung ↗"));
 $("earthResults").before(detail);
}
async function loadSound(){
 const region=state.soundRegion,token=++state.token.sound;
 const name=SOUND_REGIONS.find(s=>s.code===region)?.name||region;
 put("soundListTitle","TOP SONGS / "+name.toUpperCase());
 $("soundResults").replaceChildren(elem("div","empty-state","Regionale Musikcharts werden geladen …"));
 try{
  const charts=parseCharts(await api.charts(region));
  if(token!==state.token.sound)return;
  if(!charts.length)throw Error("Für diese Region gibt es keine Chart-Einträge.");
  state.tracks=charts;
  const frag=document.createDocumentFragment();
  charts.forEach(track=>{
   const row=link(track.url,"","track-row");
   row.append(elem("span","track-rank",String(track.rank).padStart(2,"0")));
   if(track.image){const img=elem("img","track-cover");img.src=track.image;img.alt="";img.loading="lazy";img.addEventListener("error",()=>img.replaceWith(elem("span","track-cover track-placeholder","♫")));row.append(img);}
   else row.append(elem("span","track-cover track-placeholder","♫"));
   const copy=elem("span","track-name");copy.append(elem("strong","",track.title),elem("small","",track.artist));
   row.append(copy,elem("span","track-arrow","↗"));frag.append(row);
  });
  $("soundResults").replaceChildren(frag);
 }catch{
  if(token!==state.token.sound)return;
  showError("soundResults","Das regionale Ranking ist gerade nicht abrufbar. Du kannst direkt bei Apple Music weiterstöbern.","https://music.apple.com/"+region+"/browse");
 }
}
async function newPokemon(){
 const token=++state.token.play;
 state.pokemon=null;state.pokemonRevealed=false;
 const imageRoot=$("guessFrame");imageRoot.classList.remove("revealed");imageRoot.replaceChildren(elem("span","guess-empty","?"));
 put("guessAnswer","Ein neues Pokémon wird gesucht …");put("guessNumber","#????");
 put("guessHint","POKÉMON API");$("guessReveal").disabled=true;$("guessNext").disabled=true;
 const form=$("guessForm");if(form)form.remove();
 try{
  const id=1+randomIndex(1025),raw=await api.pokemon(id);
  if(token!==state.token.play)return;
  const name=String(raw?.name||"").trim(),url=safeHttps(raw.sprites?.other?.["official-artwork"]?.front_default)||safeHttps(raw.sprites?.front_default);
  if(!name||!url)throw Error("Keine Abbildung");
  state.pokemon={id:raw.id,name,image:url,types:(raw.types||[]).map(t=>t.type?.name).filter(Boolean)};
  const img=elem("img");img.src=url;img.alt="Noch unbekanntes Pokémon";img.loading="lazy";
  img.addEventListener("error",()=>imageRoot.replaceChildren(elem("span","guess-empty","?")));
  imageRoot.replaceChildren(img);put("guessNumber","#"+String(raw.id).padStart(4,"0"));
  put("guessAnswer","Welches Pokémon ist das?");
  $("guessReveal").disabled=false;
  const input=elem("input");input.id="guessInput";input.type="text";input.placeholder="Deine Vermutung …";input.maxLength=80;input.setAttribute("aria-label","Pokémon-Namen raten");
  const check=elem("button","light-button","Prüfen ↗");check.type="submit";
  const form=elem("form","search-field");form.id="guessForm";form.append(input,check);
  form.addEventListener("submit",e=>{
   e.preventDefault();if(state.pokemonRevealed)return;
   const ans=input.value.trim().toLowerCase().replace(/\s+/g,"-");
   if(ans===state.pokemon.name){
    state.streak++;state.found++;
    revealPokemon(true);notify("Richtig geraten! Sehr gut.");
   }else{state.streak=0;put("guessAnswer","Noch nicht. Versuch es nochmals.");put("guessStreak","STREAK 00");}
  });
  $("guessFrame").after(form);
 }catch{
  if(token!==state.token.play)return;
  put("guessAnswer","PokéAPI gerade nicht erreichbar. Versuch es erneut.");
 }finally{if(token===state.token.play)$("guessNext").disabled=false;}
}
function revealPokemon(correct=false){
 if(!state.pokemon||state.pokemonRevealed)return;
 state.pokemonRevealed=true;
 if(!correct)state.streak=0;
 $("guessFrame").classList.add("revealed");put("guessAnswer",state.pokemon.name.toUpperCase().replace(/-/g," ")+" · "+state.pokemon.types.join(" / "));
 put("guessStreak","STREAK "+String(state.streak).padStart(2,"0"));
 put("guessHint","FOUND "+String(state.found).padStart(2,"0"));
 $("guessReveal").disabled=true;
 const form=$("guessForm");if(form)form.remove();
}
async function showDog(){
 const btn=$("dogNext");btn.disabled=true;put("dogNext","Suche …");
 try{
  const raw=await api.dog(),url=safeHttps(raw?.message);
  if(raw?.status!=="success"||!url)throw Error("Kein Bild");
  const img=elem("img");img.src=url;img.alt="Zufälliges Hundefoto vom Dog CEO Bildarchiv";img.loading="lazy";
  img.addEventListener("error",()=>$("dogFrame").replaceChildren(elem("div","empty-state","Bild konnte nicht geladen werden.")));
  $("dogFrame").replaceChildren(img);
 }catch{showError("dogFrame","Gerade kein Hundebild verfügbar.","https://dog.ceo/");}
 finally{btn.disabled=false;put("dogNext","Nächster Hund ↗");}
}
function loadPocket(){
 try{state.pocket=safePocket(JSON.parse(localStorage.getItem("fq-pockets-v1")||"[]"));}catch{state.pocket=[];}
 renderPocket();
}
function storePocket(){
 try{localStorage.setItem("fq-pockets-v1",JSON.stringify(state.pocket));}catch{notify("Dein Browser blockiert das Speichern.");}
 renderPocket();
}
function addPocket(entry){
 const existing=state.pocket.some(v=>v.id===entry.id);
 if(existing){notify("Schon auf deiner Merkliste.");return;}
 state.pocket=[entry,...state.pocket].slice(0,30);storePocket();notify("Für später gemerkt ✓");
}
function renderPocket(){
 put("pocketCount",state.pocket.length);
 const root=$("pocketItems"),frag=document.createDocumentFragment();
 if(!state.pocket.length){root.replaceChildren(elem("div","empty-state","Noch nichts gespeichert. Ein guter Fund ist nur einen Klick entfernt."));return;}
 state.pocket.forEach(p=>{
  const entry=elem("div","pocket-entry"),text=elem("div");
  text.append(elem("span","",p.type.toUpperCase()),elem("strong","",p.title),elem("p","",p.meta));
  if(p.url)text.append(link(p.url,"Ansehen ↗"));
  const remove=elem("button","","×");remove.type="button";remove.title="Fundstück entfernen";remove.setAttribute("aria-label",p.title+" entfernen");
  remove.addEventListener("click",()=>{state.pocket=state.pocket.filter(x=>x.id!==p.id);storePocket();});
  entry.append(text,remove);frag.append(entry);
 });root.replaceChildren(frag);
}
function pocketOpen(){
 drawerFocus=document.activeElement;$("pocketBackdrop").hidden=false;$("pocketDrawer").hidden=false;document.body.style.overflow="hidden";$("closePocket").focus();
}
function pocketClose(){
 $("pocketBackdrop").hidden=true;$("pocketDrawer").hidden=true;document.body.style.overflow="";drawerFocus?.focus?.();
}
function attach(){
 document.querySelectorAll(".station").forEach(btn=>btn.addEventListener("click",()=>choose(btn.dataset.channel)));
 const nav=document.querySelector(".station-buttons");
 nav.addEventListener("keydown",e=>{
  if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
  e.preventDefault();const i=CHANNELS.findIndex(c=>c.id===state.channel);
  const idx=e.key==="Home"?0:e.key==="End"?CHANNELS.length-1:(i+(["ArrowDown","ArrowRight"].includes(e.key)?1:-1)+CHANNELS.length)%CHANNELS.length;
  choose(CHANNELS[idx].id,{focus:true});
 });
 $("surprise").addEventListener("click",randomChannel);
 $("shuffleChannel").addEventListener("click",randomChannel);
 $("cityForm").addEventListener("submit",searchCity);
 $("artShuffle").addEventListener("click",()=>{state.artPage=state.artPage%5+1;loadArt();});
 $("bookForm").addEventListener("submit",e=>{e.preventDefault();const q=$("bookSearch").value.trim();if(q.length<2){notify("Bitte mindestens zwei Zeichen eingeben.");return;}loadBooks(q);});
 document.querySelectorAll("[data-earth]").forEach(b=>b.addEventListener("click",()=>{
  state.earthMode=b.dataset.earth;setButtonActive($("earthSwitch"),"button","data-earth",state.earthMode);loadEarth();
 }));
 $("earthReload").addEventListener("click",()=>{
  if($("earthReload").disabled)return;
  $("earthReload").disabled=true;loadEarth(true).finally(()=>{$("earthReload").disabled=false;});
 });
 $("guessNext").addEventListener("click",newPokemon);
 $("guessReveal").addEventListener("click",()=>revealPokemon(false));
 $("dogNext").addEventListener("click",showDog);
 $("saveCity").addEventListener("click",()=>{
  const c=state.city;
  addPocket({id:"city-"+c.id,type:"Ort",title:c.name+", "+c.country,meta:c.region,url:"https://www.openstreetmap.org/?mlat="+c.lat+"&mlon="+c.lon+"#map=10/"+c.lat+"/"+c.lon});
 });
 $("saveArt").addEventListener("click",()=>{
  const a=state.selectedArt;if(!a){notify("Wähle zuerst ein Kunstwerk.");return;}
  addPocket({id:"art-"+a.id,type:"Kunst",title:a.title,meta:a.artist,url:a.link});
 });
 $("saveBook").addEventListener("click",()=>{
  const b=state.selectedBook;if(!b){notify("Wähle zuerst ein Buch.");return;}
  addPocket({id:"book-"+b.id,type:"Buch",title:b.title,meta:b.author,url:b.link});
 });
 $("openPocket").addEventListener("click",pocketOpen);
 $("closePocket").addEventListener("click",pocketClose);
 $("pocketBackdrop").addEventListener("click",pocketClose);
 $("clearPocket").addEventListener("click",()=>{state.pocket=[];storePocket();notify("Merkliste geleert.");});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("pocketDrawer").hidden)pocketClose();});
 window.setInterval(updateClock,30000);
}
function init(){
 attach();cityChips();artChips();bookChips();
 options("soundCountries",SOUND_REGIONS,{value:state.soundRegion,key:"code",onSelect:region=>{state.soundRegion=region.code;initSounds();loadSound();}});
 drawSources();loadPocket();choose("world");updateClock();
}
function initSounds(){options("soundCountries",SOUND_REGIONS,{value:state.soundRegion,key:"code",onSelect:r=>{state.soundRegion=r.code;initSounds();loadSound();}});}
init();
