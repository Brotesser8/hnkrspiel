import {topologyFeatures,countryForFeature,countryFeatureAt,pointFromEonet,earthquakePoints} from "./map-data.mjs";

const WORLD_DATA="https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
const $=id=>document.getElementById(id);
const reduced=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
const safeURL=url=>{try{const u=new URL(url);return u.protocol==="https:"?u.href:null;}catch{return null;}};
const child=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
};

export function createWorldExplorer({getCountries,onChooseCountry}) {
  const L=window.L;
  const root=$("mapShell");
  const loading=$("mapLoading");
  const topStatus=$("mapMessage");
  let map=null,tile=null,borders=null,selected=null,selectedMarker=null,quakes=null,nature=null;
  let visibleMode="all",points={quakes:[],nature:[]},countryFeatures=[],boundariesReady=false;
  let tileErrors=0,tilesOK=false,timeout=null,lastHover=null;
  if(!L){
    loading.hidden=false;
    $("mapLoadingTitle").textContent="Kartenbibliothek nicht verfügbar";
    $("mapLoadingText").textContent="Kartensteuerung benötigt Leaflet. Die Landessuche funktioniert unabhängig.";
    $("mapLoadingRetry").hidden=true;
    return {
      selectCountry(){},setEarthquakes(){},setNatureEvents(){},
      focusEvent(){},destroy(){},getMap(){return null;}
    };
  }

  map=L.map("worldMap",{
    zoomControl:false,scrollWheelZoom:true,wheelDebounceTime:95,
    wheelPxPerZoomLevel:120,worldCopyJump:true,zoomSnap:.5,
    minZoom:2,maxZoom:15,preferCanvas:true,
    keyboard:true,attributionControl:true,
    fadeAnimation:!reduced(),zoomAnimation:!reduced(),markerZoomAnimation:!reduced()
  }).setView([22,8],2);
  map.getContainer().setAttribute("aria-label","Interaktive Weltkarte: ziehen, scrollen, mit Plus und Minus zoomen. Länderflächen und Ereignis-Punkte sind anklickbar.");
  const countryStyle=(isActive=false)=>({
    color:isActive?"#516632":"#587966",
    weight:isActive?2.4:1.1,
    opacity:isActive?1:.84,
    fillColor:isActive?"#e4f073":"#ede5ba",
    fillOpacity:isActive?.66:.42,
    smoothFactor:1
  });
  map.createPane("countryPane");map.getPane("countryPane").style.zIndex="350";
  map.createPane("eventsPane");map.getPane("eventsPane").style.zIndex="480";
  const countryRenderer=L.svg({pane:"countryPane",padding:.35});
  L.control.scale({position:"bottomleft",imperial:false,maxWidth:130}).addTo(map);
  quakes=L.layerGroup();nature=L.layerGroup();

  function mapHint(message){
    topStatus.textContent=message;
  }
  function selectedCountryStyle(feature){
    return countryStyle(!!selected&&countryForFeature(feature,getCountries())?.alpha2Code===selected.alpha2Code);
  }
  function setCoordinates(lat,lon){
    $("mapCoordinates").textContent=Number(lat).toFixed(2)+"° / "+Number(lon).toFixed(2)+"°";
  }
  function updateZoom(){
    $("mapZoomLevel").textContent="ZOOM "+map.getZoom().toFixed(1).replace(/\.0$/,"");
    const center=map.getCenter();
    setCoordinates(center.lat,center.lng);
  }
  map.on("zoomend moveend",updateZoom);
  map.on("mousemove",e=>{
    if(!Number.isFinite(e.latlng.lat)||!Number.isFinite(e.latlng.lng))return;
    setCoordinates(e.latlng.lat,e.latlng.lng);
  });
  map.on("mouseout",updateZoom);
  // Capture the native DOM click before Leaflet's Canvas renderer can consume it.
  // Ignore map popups/controls and real event markers, so their links remain usable.
  function clickedDataPoint(clickPoint){
    const groups=[];
    if(visibleMode==="all"||visibleMode==="quakes")groups.push(...points.quakes);
    if(visibleMode==="all"||visibleMode==="nature"){
      groups.push(...points.nature.map(pointFromEonet).filter(Boolean));
    }
    return groups.some(p=>{
      const m=map.latLngToContainerPoint([p.lat,p.lon]);
      const dx=m.x-clickPoint.x,dy=m.y-clickPoint.y;
      return dx*dx+dy*dy<17*17;
    });
  }
  function onNativeMapClick(e){
    if(e.target.closest?.(".leaflet-popup,.leaflet-tooltip,.leaflet-control"))return;
    if(!boundariesReady){
      mapHint("Die Ländergrenzen werden geladen. Suche oder wähle ein Land oben.");
      return;
    }
    const pixel=map.mouseEventToContainerPoint(e);
    if(clickedDataPoint(pixel))return;
    const latlng=map.containerPointToLatLng(pixel);
    const feature=countryFeatureAt(latlng.lat,latlng.lng,countryFeatures);
    const country=feature&&countryForFeature(feature,getCountries());
    if(country){
      onChooseCountry(country);
      mapHint("Ausgewählt: "+country.name+" · Daten rechts und weiter unten.");
    }else mapHint(feature
      ?"Diese Länderfläche hat keinen verfügbaren Länder-Datensatz."
      :"Meer oder nicht abgedecktes Gebiet · bitte eine Länderfläche wählen.");
  }
  map.getContainer().addEventListener("click",onNativeMapClick,true);
  updateZoom();

  function showTileError(){
    loading.hidden=false;
    root.classList.add("map-has-error");
    $("mapLoadingTitle").textContent="Kartenhintergrund nicht erreichbar";
    $("mapLoadingText").textContent="Ländergrenzen und Ereignisse bleiben nutzbar. Du kannst die Karte erneut laden.";
    $("mapLoadingRetry").hidden=false;
    mapHint("Hintergrundkarte zurzeit eingeschränkt · Länder und Marker bleiben aktiv");
  }
  function tileReady(){
    tilesOK=true;tileErrors=0;
    loading.hidden=true;root.classList.remove("map-has-error");
    clearTimeout(timeout);
    mapHint("Länderflächen antippen oder einen Ereignis-Layer wählen.");
  }
  function tileError(){
    tileErrors++;
    if(tileErrors>=5&&!tilesOK)showTileError();
  }
  function addTiles(){
    if(tile)map.removeLayer(tile);
    tilesOK=false;tileErrors=0;
    $("mapLoadingTitle").textContent="Weltkarte wird geladen";
    $("mapLoadingText").textContent="OSM-Kartenteile werden geladen …";
    $("mapLoadingRetry").hidden=true;loading.hidden=false;
    tile=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>',
      minZoom:2,maxZoom:19,keepBuffer:2,
      updateWhenIdle:true,updateWhenZooming:false
    }).addTo(map);
    tile.once("tileload",tileReady);
    tile.on("tileerror",tileError);
    clearTimeout(timeout);
    timeout=setTimeout(()=>{if(!tilesOK)showTileError();},14000);
  }
  addTiles();

  function renderSelected() {
    if(!borders)return;
    borders.eachLayer(layer=>{
      const c=countryForFeature(layer.feature,getCountries());
      const active=!!selected&&c?.alpha2Code===selected.alpha2Code;
      layer.setStyle(countryStyle(active));
      if(active)layer.bringToFront();
    });
  }
  async function loadBorders() {
    $("borderStatus").textContent="Grenzen werden geladen …";
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),16000);
    try{
      const response=await fetch(WORLD_DATA,{signal:controller.signal,cache:"force-cache"});
      if(!response.ok)throw Error("HTTP "+response.status);
      const features=topologyFeatures(await response.json());
      countryFeatures=features;
      borders=L.geoJSON(features,{
        pane:"countryPane",renderer:countryRenderer,style:selectedCountryStyle,
        interactive:true,
        onEachFeature(feature,layer){
          const name=String(feature.properties?.name||"Land");
          layer.bindTooltip(name,{sticky:true,direction:"top",opacity:.96,className:"map-country-tooltip"});
          layer.on("mouseover",()=>{
            lastHover=layer;
            const country=countryForFeature(feature,getCountries());
            layer.setStyle({weight:2,color:"#294b3f",fillOpacity:.62});
            $("mapHoverLabel").textContent="LAND / "+(country?country.name:name);
          });
          layer.on("mouseout",()=>{
            lastHover=null;
            layer.setStyle(selectedCountryStyle(feature));
            $("mapHoverLabel").textContent="LAND ANKLICKEN";
          });
          // Map-wide hit-testing handles clicks consistently in SVG and Canvas renderers.
          // Do not stop propagation here: the map needs the event to select the polygon.

        }
      }).addTo(map);
      boundariesReady=true;
      $("borderStatus").textContent=features.length+" Länderflächen";
      renderSelected();
    }catch{
      $("borderStatus").textContent="Grenzen nicht verfügbar";
      mapHint("Ländergrenzen sind nicht geladen. Länder weiterhin über das Suchfeld auswählen.");
    }finally{clearTimeout(timer);}
  }
  loadBorders();

  function selectCountry(country,{fly=true}={}){
    if(!country)return;
    selected=country;
    const pos=[country.lat,country.lon];
    if(!selectedMarker){
      const icon=L.divIcon({
        className:"selected-country-icon",
        html:'<span class="pin-halo"><span class="pin-core"></span></span>',
        iconSize:[36,36],iconAnchor:[18,18]
      });
      selectedMarker=L.marker(pos,{icon,keyboard:false,interactive:false,zIndexOffset:900}).addTo(map);
    }else selectedMarker.setLatLng(pos);
    selectedMarker.bindTooltip(country.name,{direction:"top",offset:[0,-19],className:"map-country-tooltip"});
    renderSelected();
    $("mapSelectedLabel").textContent=country.name;
    if(fly) {
      const match=borders?.getLayers().find(l=>countryForFeature(l.feature,getCountries())?.alpha2Code===country.alpha2Code);
      if(match&&match.getBounds().isValid()){
        map.flyToBounds(match.getBounds(),{maxZoom:6,padding:[30,30],duration:reduced()?0:.85});
      }else map.flyTo(pos,Math.min(5,Math.max(3,map.getZoom())),{duration:reduced()?0:.7});
    }
  }
  function popup(title,meta,url){
    const card=child("div","map-popup-inner");
    card.append(child("strong","",title),child("span","",meta));
    const safe=safeURL(url);
    if(safe){
      const a=child("a","","Quelle ansehen ↗");
      a.href=safe;a.target="_blank";a.rel="noopener noreferrer";card.append(a);
    }
    return card;
  }
  function createQuake(entry){
    const m=L.circleMarker([entry.lat,entry.lon],{
      className:"map-quake-point",pane:"eventsPane",
      radius:Math.max(5,Math.min(12,3+(entry.mag||2)*1.4)),
      color:"#fffaf0",weight:1.6,fillColor:"#e77f5e",fillOpacity:.87
    });
    const mag=entry.mag!==null?"Magnitude "+entry.mag.toFixed(1):"Magnitude unbekannt";
    m.bindTooltip(mag+" · "+entry.name,{direction:"top",opacity:.94});
    m.bindPopup(popup(entry.name,mag,entry.url));
    return m;
  }
  function createNature(event){
    const p=pointFromEonet(event);
    if(!p)return null;
    const m=L.circleMarker([p.lat,p.lon],{
      className:"map-nature-point",pane:"eventsPane",radius:7,
      color:"#fffaf0",weight:1.6,fillColor:"#a1b648",fillOpacity:.92
    });
    const category=(event.categories||[]).map(c=>c.title).filter(Boolean).join(", ")||"NASA EONET";
    m.bindTooltip(event.title||"Naturereignis",{direction:"top",opacity:.94});
    const sourceURL=event.sources?.find(s=>safeURL(s.url))?.url;
    m.bindPopup(popup(event.title||"Naturereignis",category,sourceURL));
    return m;
  }
  function addLayer(group,shouldShow){
    if(shouldShow&&!map.hasLayer(group))group.addTo(map);
    else if(!shouldShow&&map.hasLayer(group))map.removeLayer(group);
  }
  function applyMode(mode){
    visibleMode=mode;
    addLayer(quakes,mode==="all"||mode==="quakes");
    addLayer(nature,mode==="all"||mode==="nature");
    for(const button of document.querySelectorAll("[data-map-mode]")){
      const active=button.dataset.mapMode===mode;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    }
    $("mapLegend").hidden=mode==="countries";
    $("mapLegendQuakes").hidden=mode==="nature";
    $("mapLegendNature").hidden=mode==="quakes";
    mapHint({
      all:"Alle Ereignisebenen aktiv · farbige Punkte öffnen Details.",
      quakes:"Erdbeben eingeblendet · orange Punkte öffnen USGS-Details.",
      nature:"Naturereignisse eingeblendet · grüne Punkte öffnen NASA-Details.",
      countries:"Nur Länderflächen · Land direkt auf der Karte wählen."
    }[mode]||"Kartenebene gewählt.");
  }
  function setEarthquakes(features){
    points.quakes=earthquakePoints(features);
    quakes.clearLayers();
    points.quakes.forEach(point=>quakes.addLayer(createQuake(point)));
    $("mapQuakeCount").textContent=String(points.quakes.length);
    $("mapQuakeLegendCount").textContent=String(points.quakes.length);
    applyMode(visibleMode);
  }
  function setNatureEvents(events){
    points.nature=Array.isArray(events)?events.filter(e=>pointFromEonet(e)).slice(0,70):[];
    nature.clearLayers();
    points.nature.forEach(event=>{const marker=createNature(event);if(marker)nature.addLayer(marker);});
    $("mapNatureCount").textContent=String(points.nature.length);
    $("mapNatureLegendCount").textContent=String(points.nature.length);
    applyMode(visibleMode);
  }
  function focusEvent(lat,lon,name,kind="quake"){
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
    const group=kind==="quake"?quakes:nature;
    applyMode(kind==="quake"?"quakes":"nature");
    const markers=group.getLayers();
    const found=markers.find(m=>Math.abs(m.getLatLng().lat-lat)<.0001&&Math.abs(m.getLatLng().lng-lon)<.0001);
    map.flyTo([lat,lon],Math.max(5,map.getZoom()),{duration:reduced()?0:.8});
    if(found)map.once("moveend",()=>found.openPopup());
    else{
      const m=L.circleMarker([lat,lon],{pane:"eventsPane",radius:10,color:"#fff",fillColor:kind==="quake"?"#e77f5e":"#a1b648",fillOpacity:1}).addTo(group);
      m.bindPopup(popup(name,kind==="quake"?"USGS · Erdbeben":"NASA · Naturereignis"));
      map.once("moveend",()=>m.openPopup());
    }
    root.scrollIntoView({behavior:reduced()?"instant":"smooth",block:"center"});
  }
  function closeExpanded(){
    root.classList.remove("map-expanded");
    document.body.classList.remove("map-modal-open");
    $("mapExpand").setAttribute("aria-pressed","false");
    $("mapExpand").textContent="⛶ Grossansicht";
    setTimeout(()=>map.invalidateSize(),90);
  }
  function expand(){
    const active=!root.classList.contains("map-expanded");
    if(!active){closeExpanded();return;}
    root.classList.add("map-expanded");
    document.body.classList.add("map-modal-open");
    $("mapExpand").setAttribute("aria-pressed","true");
    $("mapExpand").textContent="✕ Schliessen";
    setTimeout(()=>map.invalidateSize(),90);
  }
  function toggleHelp(force){
    const panel=$("mapHelpPanel");
    const next=typeof force==="boolean"?force:panel.hidden;
    panel.hidden=!next;
    $("mapHelp").setAttribute("aria-expanded",String(next));
  }
  document.querySelectorAll("[data-map-mode]").forEach(button=>
    button.addEventListener("click",()=>applyMode(button.dataset.mapMode))
  );
  $("mapZoomIn").addEventListener("click",()=>map.zoomIn());
  $("mapZoomOut").addEventListener("click",()=>map.zoomOut());
  $("mapReset").addEventListener("click",()=>map.flyTo([22,8],2,{duration:reduced()?0:.65}));
  $("mapExpand").addEventListener("click",expand);
  $("mapContrast").addEventListener("click",()=>{
    const active=root.classList.toggle("map-high-contrast");
    $("mapContrast").setAttribute("aria-pressed",String(active));
    $("mapContrast").textContent=active?"◐ Normal":"◐ Kontrast";
  });
  $("mapHelp").addEventListener("click",()=>toggleHelp());
  $("mapHelpClose").addEventListener("click",()=>toggleHelp(false));
  $("mapLoadingRetry").addEventListener("click",addTiles);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){toggleHelp(false);if(root.classList.contains("map-expanded"))closeExpanded();}
  });
  const obs=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>map.invalidateSize()):null;
  obs?.observe($("worldMap"));
  window.addEventListener("orientationchange",()=>setTimeout(()=>map.invalidateSize(),220));
  applyMode("all");
  return {selectCountry,setEarthquakes,setNatureEvents,focusEvent,getMap(){return map;},destroy(){
    clearTimeout(timeout);obs?.disconnect();map.getContainer().removeEventListener("click",onNativeMapClick,true);map.remove();
  }};
}
