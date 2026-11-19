import {PRESETS,insideSwissMapBounds,toLV95,geoAdminMapUrl,fmtNum,fmtDate,cleanLabel,profilePoints,nextHolidays} from "./core.mjs";
import {getHeight,getProfile,findPlace,getQuakes,getNature,getWiki,getPopulation,getHolidays,SWISS_TILES,WMS_LAYERS,makeSolarLink} from "./services.mjs";
import {SOURCES,STATUS_NAMES,matchingSources} from "./catalogue.mjs";

const $=id=>document.getElementById(id);
const state={place:{...PRESETS.zuerich},map:null,base:null,overlay:null,marker:null,route:null,routeMarkers:[],mode:"map",drawing:false,routePoints:[],pointRequest:0,refreshAt:0,quakeRequest:0};
function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
function externalLink(text,url,cls){
  const a=element("a",cls,text);
  a.href=url;a.target="_blank";a.rel="noopener noreferrer";
  return a;
}
function message(id,txt,kind=""){
  const container=$(id);
  container.replaceChildren(element("p",kind?"notice "+kind:"notice",txt));
}
function renderSources(){
  const filter=document.querySelector(".filter.active")?.dataset.filter||"all";
  const list=matchingSources(SOURCES,{filter,query:$("sourceSearch").value});
  $("sourceCount").textContent=String(SOURCES.length);
  const frag=document.createDocumentFragment();
  for(const s of list){
    const row=externalLink("",s.url,"source-entry");
    const left=element("div");
    left.append(element("small","",s.category),element("h3","",s.title),element("p","",s.detail));
    const right=element("div","source-meta");
    right.append(element("span","source-status "+(s.status==="live"?"":s.status),STATUS_NAMES[s.status]),element("span","source-arrow","↗"));
    row.append(left,right);frag.append(row);
  }
  $("sourceList").replaceChildren(frag);
  $("sourceEmpty").hidden=list.length!==0;
}
function showSearch(text){
  const status=$("searchMessage");status.hidden=false;status.textContent=text;
}
function setMapLinks(){
  const {lat,lng}=state.place;
  $("officialMap").href=geoAdminMapUrl(lat,lng);
  $("geoDeepLink").href=geoAdminMapUrl(lat,lng,WMS_LAYERS.geology);
  $("solarDeepLink").href=makeSolarLink(lat,lng);
  $("landscapeDeepLink").href=geoAdminMapUrl(lat,lng,WMS_LAYERS.landscape);
}
function setPlace(place,{fly=true,refresh=false}={}){
  if(!insideSwissMapBounds(place.lat,place.lng)){showSearch("Der Punkt liegt ausserhalb des Schweizer Kartenbereichs.");return;}
  state.place={name:place.name||"Ausgewählter Punkt",subtitle:place.subtitle||"Schweizer Kartenbereich",lat:place.lat,lng:place.lng};
  $("placeTitle").textContent=state.place.name;
  $("placeSubtitle").textContent=state.place.subtitle+" · Schweiz";
  $("latValue").textContent=place.lat.toFixed(5)+"° N";
  $("lngValue").textContent=place.lng.toFixed(5)+"° E";
  const lv=toLV95(place.lat,place.lng);
  $("lv95Value").textContent=fmtNum(lv.e)+" / "+fmtNum(lv.n);
  $("heightValue").textContent="—";
  $("heightState").textContent="Amtlicher Messwert wird geladen …";
  setMapLinks();
  if(state.map){
    if(!state.marker){
      state.marker=window.L.marker([place.lat,place.lng],{icon:window.L.divIcon({className:"",html:'<span class="marker-pin" aria-hidden="true"></span>',iconSize:[19,19],iconAnchor:[9,9]})}).addTo(state.map);
    }else state.marker.setLatLng([place.lat,place.lng]);
    if(fly)state.map.flyTo([place.lat,place.lng],Math.max(state.map.getZoom(),10),{duration:.65});
  }
  const thisRequest=++state.pointRequest;
  getHeight(place.lat,place.lng,refresh).then(value=>{
    if(thisRequest!==state.pointRequest)return;
    $("heightValue").textContent=fmtNum(Math.round(value));
    $("heightState").textContent="Quelle: swisstopo · Höhenmodell";
  }).catch(()=>{
    if(thisRequest!==state.pointRequest)return;
    $("heightState").textContent="Höhe momentan nicht abrufbar.";
  });
  loadNature(place.lat,place.lng,refresh,thisRequest);
  loadWiki(place.lat,place.lng,refresh,thisRequest);
}
function leafletMap(){
  if(!window.L){
    $("mapFallback").querySelector("strong").textContent="Kartenbibliothek nicht verfügbar.";
    $("mapHint").textContent="Karte konnte nicht geladen werden";
    return;
  }
  const L=window.L;
  try{
    state.map=L.map("map",{zoomControl:false,scrollWheelZoom:false,preferCanvas:true});
    state.map.setView([PRESETS.zuerich.lat,PRESETS.zuerich.lng],9);
    L.control.zoom({position:"bottomright"}).addTo(state.map);
    state.map.on("click",ev=>{
      const {lat,lng}=ev.latlng;
      if(!insideSwissMapBounds(lat,lng)){showSearch("Bitte einen Punkt im Schweizer Kartenbereich wählen.");return;}
      if(state.drawing){addRoutePoint({lat,lng});return;}
      $("citySelect").value="";
      $("searchMessage").hidden=true;
      setPlace({lat,lng,name:"Ausgewählter Punkt",subtitle:"Direkt auf der Karte markiert"},{fly:false});
    });
    state.map.on("tileerror",()=>{$("mapHint").textContent="Einige Kartenteile sind momentan nicht erreichbar.";});
    switchLayer("map");
    setPlace(state.place,{fly:false});
    setTimeout(()=>state.map.invalidateSize(),150);
  }catch(error){
    $("mapFallback").querySelector("strong").textContent="Kartendarstellung derzeit nicht verfügbar.";
    $("mapHint").textContent="Bitte die offizielle Landeskarte öffnen.";
  }
}
function switchLayer(mode){
  if(!state.map)return;
  const L=window.L;
  if(state.base)state.map.removeLayer(state.base);
  if(state.overlay)state.map.removeLayer(state.overlay);
  state.mode=mode;
  const bg=mode==="aerial"?"aerial":"map";
  state.base=L.tileLayer(SWISS_TILES[bg],{attribution:'&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">swisstopo</a>',maxZoom:18,minZoom:5,detectRetina:false}).addTo(state.map);
  state.overlay=null;
  if(mode==="geology"||mode==="landscape"){
    state.overlay=L.tileLayer.wms("https://wms.geo.admin.ch/",{layers:WMS_LAYERS[mode],transparent:true,format:"image/png",version:"1.3.0",opacity:.76,attribution:"swisstopo / GeoAdmin"}).addTo(state.map);
  }
  for(const button of document.querySelectorAll(".layer-tab")){
    const active=button.dataset.layer===mode;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  }
}
function clearRoute(){
  if(state.route&&state.map)state.map.removeLayer(state.route);
  for(const m of state.routeMarkers)if(state.map)state.map.removeLayer(m);
  state.route=null;state.routeMarkers=[];state.routePoints=[];
}
function startRoute(){
  if(!state.map){showSearch("Für ein Höhenprofil muss zuerst die Karte geladen sein.");return;}
  clearRoute();
  state.drawing=true;
  $("profileCard").hidden=false;
  $("profilePlot").replaceChildren(element("p","","Startpunkt und Ziel auf der Karte anklicken."));
  $("profileStats").textContent="Zwei Punkte auswählen";
  $("profileState").textContent="";
  $("profileButton").textContent="Profil auswählen …";
  $("cancelProfile").hidden=false;
  $("mapHint").textContent="1 / 2 — Startpunkt für das Höhenprofil setzen";
}
function endRoute(){
  state.drawing=false;
  clearRoute();
  $("cancelProfile").hidden=true;
  $("profileButton").textContent="Höhenprofil zeichnen ↗";
  $("mapHint").textContent="Karte anklicken, um einen Punkt zu untersuchen";
  $("profileCard").hidden=true;
}
async function addRoutePoint(point){
  state.routePoints.push(point);
  const L=window.L;
  const mark=L.circleMarker([point.lat,point.lng],{radius:6,fillColor:"#e1a45e",fillOpacity:1,color:"#174d3c",weight:2}).addTo(state.map);
  state.routeMarkers.push(mark);
  if(state.routePoints.length===1){
    $("mapHint").textContent="2 / 2 — Zielpunkt für das Höhenprofil setzen";
    $("profilePlot").replaceChildren(element("p","","Jetzt den zweiten Punkt auf der Karte wählen."));
    return;
  }
  state.drawing=false;
  $("cancelProfile").hidden=false;
  $("profileButton").textContent="Neues Profil zeichnen ↗";
  $("mapHint").textContent="Profil fertig — für ein neues Profil erneut starten";
  const [a,b]=state.routePoints;
  state.route=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color:"#df9854",weight:4,dashArray:"8 6"}).addTo(state.map);
  $("profilePlot").replaceChildren(element("p","","Geländeprofil wird berechnet …"));
  $("profileState").textContent="Quelle: swisstopo · Digitales Höhenmodell";
  try{
    const points=profilePoints(await getProfile(a,b));
    if(points.length<2)throw new Error("Weniger als zwei Höhenwerte");
    drawProfile(points);
  }catch{
    $("profilePlot").replaceChildren(element("p","","Das Profil ist momentan nicht verfügbar."));
    $("profileStats").textContent="Keine Messwerte";
    $("profileState").textContent="Der amtliche Höhendienst antwortet derzeit nicht.";
  }
}
function drawProfile(points){
  const width=760,height=230,padLeft=52,padRight=20,padTop=23,padBottom=39;
  const xs=points.map(p=>p.dist),ys=points.map(p=>p.height);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const minH=Math.max(0,Math.floor((minY-20)/20)*20),maxH=Math.ceil((maxY+20)/20)*20;
  const dx=Math.max(1,maxX-minX),dy=Math.max(1,maxH-minH);
  const x=v=>padLeft+(v-minX)/dx*(width-padLeft-padRight);
  const y=v=>height-padBottom-(v-minH)/dy*(height-padTop-padBottom);
  const line=points.map((p,i)=>(i?"L":"M")+x(p.dist).toFixed(2)+","+y(p.height).toFixed(2)).join(" ");
  const area=line+" L "+x(maxX).toFixed(2)+","+(height-padBottom)+" L "+x(minX).toFixed(2)+","+(height-padBottom)+" Z";
  const ticks=[0,.5,1].map(r=>{
    const v=minH+(maxH-minH)*r,yy=y(v).toFixed(2);
    return '<line x1="'+padLeft+'" x2="'+(width-padRight)+'" y1="'+yy+'" y2="'+yy+'" stroke="#dce5dc" stroke-dasharray="4 5"/><text x="8" y="'+(Number(yy)+4)+'" font-size="12" fill="#758578">'+Math.round(v)+' m</text>';
  }).join("");
  $("profilePlot").innerHTML='<svg viewBox="0 0 '+width+' '+height+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Höhenprofil der Strecke">'+ticks+'<path d="'+area+'" fill="#dcebe0"/><path d="'+line+'" fill="none" stroke="#286448" stroke-width="2.7" stroke-linejoin="round"/><text x="'+padLeft+'" y="'+(height-12)+'" fill="#758578" font-size="12">Start</text><text x="'+(width-padRight)+'" y="'+(height-12)+'" text-anchor="end" fill="#758578" font-size="12">Ziel</text></svg>';
  $("profileStats").textContent=(maxX/1000).toFixed(1).replace(".",",")+" km · "+fmtNum(Math.round(minY))+"–"+fmtNum(Math.round(maxY))+" m ü. M.";
  $("profileState").textContent=points.length+" gemessene Punkte · Quelle: swisstopo";
}
function asList(items){
  const ul=element("ul","mini-list");
  for(const item of items){
    const li=element("li");
    const left=element("div");
    left.append(element("strong","",item.label));
    if(item.sub)left.append(element("small","",item.sub));
    li.append(left,element("span","right",item.right||""));
    ul.append(li);
  }
  return ul;
}
async function loadQuakes(refresh=false){
  const request=++state.quakeRequest;
  try{
    const events=await getQuakes(refresh);
    if(request!==state.quakeRequest)return;
    const card=$("quakeContent");card.replaceChildren();
    if(!events.length){message("quakeContent","Im USGS-Katalog wurden für den Zeitraum keine Ereignisse gefunden.");return;}
    const heading=element("div","big-stat",String(events.length));
    card.append(heading,element("p","small-stat","Neueste Ereignisse im abgefragten Schweizer Kartenausschnitt (max. 35)."));
    const items=events.slice(0,3).map(event=>({
      label:String(event.properties?.place||"Ort nicht angegeben").replace(/\s+of\s+/g," bei ").slice(0,57),
      sub:event.properties?.time?fmtDate(new Date(event.properties.time).toISOString()):"",
      right:"M "+(Number.isFinite(event.properties?.mag)?event.properties.mag.toFixed(1):"–")
    }));
    card.append(asList(items));
  }catch{if(request===state.quakeRequest)message("quakeContent","Der USGS-Dienst ist im Moment nicht erreichbar.","error");}
}
async function loadNature(lat,lng,refresh,request){
  $("natureContent").replaceChildren(element("p","loading","Beobachtungen werden gesucht …"));
  try{
    const data=await getNature(lat,lng,refresh);
    if(request!==state.pointRequest)return;
    const out=$("natureContent");out.replaceChildren();
    const seen=new Set(),unique=[];
    for(const item of data){
      const name=item.vernacularName||item.species||item.scientificName;
      if(!name||seen.has(name.toLowerCase()))continue;
      seen.add(name.toLowerCase());unique.push({label:name.slice(0,60),sub:item.eventDate?fmtDate(item.eventDate):"Erfassungsdatum unbekannt",right:item.kingdom==="Plantae"?"Pflanze":item.kingdom==="Animalia"?"Tier":"Art"});
      if(unique.length===4)break;
    }
    if(unique.length)out.append(asList(unique));
    else message("natureContent","Für diesen Kartenausschnitt wurden keine passenden Beobachtungen gefunden.");
  }catch{if(request===state.pointRequest)message("natureContent","GBIF-Daten derzeit nicht erreichbar.","error");}
}
async function loadWiki(lat,lng,refresh,request){
  $("wikiContent").replaceChildren(element("p","loading","Wissensartikel wird gesucht …"));
  try{
    const page=await getWiki(lat,lng,refresh);
    if(request!==state.pointRequest)return;
    const card=$("wikiContent");card.replaceChildren();
    if(!page||!page.title){message("wikiContent","In der unmittelbaren Umgebung wurde kein Artikel gefunden.");return;}
    card.append(element("strong","",page.title));
    if(page.extract){
      const text=page.extract.length>370?page.extract.slice(0,370).replace(/\s+\S*$/,"")+" …":page.extract;
      card.append(element("p","wiki-extract",text));
    }else card.append(element("p","wiki-extract","Zurzeit keine Kurzbeschreibung verfügbar."));
    if(Number.isInteger(page.pageid))card.append(externalLink("Artikel lesen ↗","https://de.wikipedia.org/?curid="+page.pageid,"wiki-link"));
  }catch{if(request===state.pointRequest)message("wikiContent","Wikimedia ist gerade nicht erreichbar.","error");}
}
async function loadPopulation(refresh=false){
  try{
    const stat=await getPopulation(refresh),out=$("statsContent");out.replaceChildren();
    out.append(element("div","big-stat",fmtNum(stat.value)),element("p","small-stat","Einwohnerinnen und Einwohner · Datenjahr "+stat.year));
    out.append(element("p","wiki-extract","Schweizweit veröffentlichter Bevölkerungswert; keine Hochrechnung und kein Echtzeitwert."));
  }catch{message("statsContent","Bevölkerungswert derzeit nicht verfügbar.","error");}
}
async function loadHolidays(refresh=false){
  try{
    const holidays=nextHolidays(await getHolidays(refresh),new Date(),3);
    const out=$("holidaysContent");out.replaceChildren();
    if(!holidays.length){message("holidaysContent","Zurzeit keine weiteren Feiertage im abgefragten Zeitraum.");return;}
    out.append(asList(holidays.map(h=>({
      label:h.name||"Feiertag",
      sub:h.nationalHoliday===true?"Ganze Schweiz":(h.subdivisionCodes?.join(", ")||"Kantonale Gültigkeit prüfen"),
      right:fmtDate(h.date).replace(/ \d{4}$/,"")
    }))));
  }catch{message("holidaysContent","Feiertage können aktuell nicht abgerufen werden.","error");}
}
async function searchPlace(event){
  event.preventDefault();
  const input=$("placeSearch"),query=input.value.trim();
  if(query.length<2){showSearch("Bitte mindestens zwei Zeichen eingeben.");return;}
  const button=document.querySelector(".search-button");button.disabled=true;button.textContent="Suche …";
  showSearch("Schweizer Ortsverzeichnis wird durchsucht …");
  try{
    const attrs=await findPlace(query);
    const lat=Number(attrs.lat),lng=Number(attrs.lon);
    if(!insideSwissMapBounds(lat,lng))throw new Error("Der Fund liegt ausserhalb des Kartenbereichs.");
    $("citySelect").value="";
    setPlace({name:query,subtitle:cleanLabel(attrs.label)||"Schweizer Ortsverzeichnis",lat,lng});
    showSearch("Ort gefunden · Quelle: swisstopo GeoAdmin.");
  }catch(error){showSearch(error.message==="Kein Schweizer Ort gefunden."?error.message:"Suche nicht verfügbar oder kein passender Ort gefunden.");}
  finally{button.disabled=false;button.innerHTML='Suchen <span aria-hidden="true">↗</span>';}
}
function init(){
  document.querySelectorAll(".layer-tab").forEach(b=>b.addEventListener("click",()=>switchLayer(b.dataset.layer)));
  document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".filter").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active));});renderSources();
  }));
  $("sourceSearch").addEventListener("input",renderSources);
  $("searchForm").addEventListener("submit",searchPlace);
  $("citySelect").addEventListener("change",e=>{
    if(!e.target.value)return;
    $("searchMessage").hidden=true;
    $("placeSearch").value="";
    if(state.drawing)endRoute();
    setPlace(PRESETS[e.target.value]);
  });
  $("profileButton").addEventListener("click",startRoute);
  $("cancelProfile").addEventListener("click",endRoute);
  $("refreshButton").addEventListener("click",()=>{
    if(Date.now()-state.refreshAt<60000){showSearch("Gerade aktualisiert – bitte frühestens nach einer Minute erneut abrufen.");return;}
    state.refreshAt=Date.now();
    $("quakeContent").replaceChildren(element("p","loading","Aktualisiere …"));
    $("statsContent").replaceChildren(element("p","loading","Aktualisiere …"));
    $("holidaysContent").replaceChildren(element("p","loading","Aktualisiere …"));
    loadQuakes(true);loadPopulation(true);loadHolidays(true);setPlace(state.place,{fly:false,refresh:true});
    showSearch("Aktuelle Daten werden neu geladen.");
  });
  renderSources();
  leafletMap();
  // Even if the map library is blocked, the panels and selected location remain usable.
  if(!state.map)setPlace(state.place,{fly:false});
  loadQuakes();loadPopulation();loadHolidays();
}
init();
