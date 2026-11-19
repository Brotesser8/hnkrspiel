import {topologyFeatures,featuresForLeaflet,countryForFeature,countryFeatureAt,pointFromEonet,earthquakePoints} from "./map-data.mjs?v=worldfix4";

const WORLD_DATA="./data/world-110m.json";
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
  let tileErrors=0,tilesOK=false,timeout=null,lastHover=null,vectorOnly=true;
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
  const regionPalette={Europe:"#bfdbb7",Asia:"#d8e2be",Americas:"#b6d9c9",Africa:"#e9d5b3",Oceania:"#d0dcbf"};
  const countryStyle=(isActive=false,region="")=>({
    color:isActive?"#304b30":"#779684",
    weight:isActive?2.5:.8,
    opacity:isActive?1:.95,
    fillColor:isActive?"#eef56e":regionPalette[region]||"#d3dec5",
    fillOpacity:(vectorOnly||!tilesOK)?(isActive?1:.98):(isActive?.55:.09),
    smoothFactor:.7
  });
  map.createPane("gridPane");map.getPane("gridPane").style.zIndex="300";
  map.getPane("gridPane").style.pointerEvents="none";
  // Use Leaflet's default overlay pane: custom SVG panes can lose alignment
  // after resize, flyToBounds or fullscreen transitions in browsers.
  map.createPane("eventsPane");map.getPane("eventsPane").style.zIndex="480";
  const countryRenderer=L.svg({padding:.35});
  L.control.scale({position:"bottomleft",imperial:false,maxWidth:130}).addTo(map);
  quakes=L.layerGroup();nature=L.layerGroup();
  const graticule=L.layerGroup();
  for(let lon=-150;lon<=150;lon+=30){
    const coords=[];for(let lat=-80;lat<=80;lat+=5)coords.push([lat,lon]);
    graticule.addLayer(L.polyline(coords,{pane:"gridPane",interactive:false,color:"#f3faf5",weight:1,opacity:.55}));
  }
  for(let lat=-60;lat<=60;lat+=30){
    const coords=[];for(let lon=-180;lon<=180;lon+=5)coords.push([lat,lon]);
    graticule.addLayer(L.polyline(coords,{pane:"gridPane",interactive:false,color:"#f3faf5",weight:1,opacity:.55}));
  }
  graticule.addTo(map);
  root.classList.add("vector-only");

  function mapHint(message){
    topStatus.textContent=message;
  }
  function selectedCountryStyle(feature){
    const country=countryForFeature(feature,getCountries());
    return countryStyle(!!selected&&country?.alpha2Code===selected.alpha2Code,country?.region);
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
  const REGIONS={
    world:{center:[22,8],zoom:2},europe:{center:[51,13],zoom:4},
    america:{center:[12,-85],zoom:3},asia:{center:[32,103],zoom:3},
    africa:{center:[2,19],zoom:3},oceania:{center:[-24,145],zoom:4}
  };
  function activeRegion(name){
    for(const button of document.querySelectorAll("[data-map-jump]")){
      const active=button.dataset.mapJump===name;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    }
  }
  function jump(name){
    const target=REGIONS[name];if(!target)return;
    map.stop();
    if(reduced())map.setView(target.center,target.zoom,{animate:false});
    else map.flyTo(target.center,target.zoom,{duration:.65});
    activeRegion(name);
    mapHint(name==="world"?"Weltkarte · ziehe, zoome oder wähle ein Land.":"Region geöffnet · Länder direkt antippen.");
  }
  document.querySelectorAll("[data-map-jump]").forEach(button=>button.addEventListener("click",()=>jump(button.dataset.mapJump)));
  function pan(dx,dy){map.stop();map.panBy([dx,dy],{animate:!reduced(),duration:.3});activeRegion("");}
  $("mapPanNorth").addEventListener("click",()=>pan(0,-150));
  $("mapPanSouth").addEventListener("click",()=>pan(0,150));
  $("mapPanWest").addEventListener("click",()=>pan(-150,0));
  $("mapPanEast").addEventListener("click",()=>pan(150,0));
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
    // Do not block usable vector countries with a modal when raster tiles fail.
    vectorMode(true);
    mapHint("Strassenkarte derzeit nicht erreichbar · klare Länderkarte aktiv.");
  }
  function tileReady(){
    if(vectorOnly)return;
    tilesOK=true;tileErrors=0;
    loading.hidden=true;root.classList.remove("map-has-error");
    clearTimeout(timeout);
    renderSelected();
    mapHint("Strassenkarte vollständig geladen · Länder und Ereignisse anklickbar.");
  }
  function tileError(){
    tileErrors++;
    if(tileErrors>=1&&!vectorOnly)showTileError();
  }
  function vectorMode(enabled){
    vectorOnly=enabled;
    root.classList.toggle("vector-only",enabled);
    $("mapTilesOn").classList.toggle("active",!enabled);
    $("mapTilesOff").classList.toggle("active",enabled);
    $("mapTilesOn").setAttribute("aria-pressed",String(!enabled));
    $("mapTilesOff").setAttribute("aria-pressed",String(enabled));
    if(enabled){
      if(tile&&map.hasLayer(tile))map.removeLayer(tile);
      if(!map.hasLayer(graticule))graticule.addTo(map);
      tilesOK=false;
      loading.hidden=boundariesReady;
      root.classList.remove("map-has-error");
      clearTimeout(timeout);
      mapHint("Vollständige Länderkarte · unabhängig von Kartenkacheln.");
    }else{
      if(map.hasLayer(graticule))map.removeLayer(graticule);
      addTiles();
      mapHint("Optionale Strassenkarte wird geladen …");
    }
    renderSelected();
  }
  $("mapTilesOn").addEventListener("click",()=>{if(!vectorOnly)return;vectorMode(false);});
  $("mapTilesOff").addEventListener("click",()=>vectorMode(true));
  function addTiles(){
    if(tile)map.removeLayer(tile);
    vectorOnly=false;root.classList.remove("vector-only");
    tilesOK=false;tileErrors=0;
    $("mapLoadingTitle").textContent="Weltkarte wird geladen";
    $("mapLoadingText").textContent="OSM-Kartenteile werden geladen …";
    $("mapLoadingRetry").hidden=true;loading.hidden=boundariesReady;
    tile=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>',
      minZoom:2,maxZoom:19,keepBuffer:2,
      updateWhenIdle:true,updateWhenZooming:false
    }).addTo(map);
    tile.once("load",tileReady);
    tile.on("tileerror",tileError);
    renderSelected();
    clearTimeout(timeout);
    timeout=setTimeout(()=>{if(!tilesOK&&!vectorOnly)showTileError();},9500);
  }
  // The locally bundled country map is always the default; raster tiles are opt-in.
  $("mapTilesOff").classList.add("active");
  $("mapTilesOff").setAttribute("aria-pressed","true");
  $("mapTilesOn").classList.remove("active");
  $("mapTilesOn").setAttribute("aria-pressed","false");
  $("mapLoadingTitle").textContent="Länderkarte wird vorbereitet";
  $("mapLoadingText").textContent="Lokale Geodaten werden geladen, ganz ohne Kartendienst.";

  function renderSelected() {
    if(!borders)return;
    borders.eachLayer(layer=>{
      const c=countryForFeature(layer.feature,getCountries());
      const active=!!selected&&c?.alpha2Code===selected.alpha2Code;
      layer.setStyle(countryStyle(active,c?.region));
      if(active)layer.bringToFront();
    });
  }
  async function loadBorders() {
    $("borderStatus").textContent="Grenzen werden geladen …";
    let features=null;
    // Independent mirrors; one failed CDN must not make the atlas unusable.
    for(const url of [WORLD_DATA,"https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json","https://unpkg.com/world-atlas@2.0.2/countries-110m.json"]){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
      try{
        const response=await fetch(url,{signal:controller.signal,cache:"force-cache"});
        if(!response.ok)throw Error("HTTP "+response.status);
        const data=topologyFeatures(await response.json());
        if(data.length<150)throw Error("Boundary dataset incomplete");
        features=data;break;
      }catch{/* Another public mirror can supply the same world-atlas data. */}
      finally{clearTimeout(timer);}
    }
    try{
      if(!features)throw Error("No border data available");
      countryFeatures=features;
      borders=L.geoJSON(featuresForLeaflet(features),{
        renderer:countryRenderer,className:"world-country-shape",style:selectedCountryStyle,
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
      $("borderStatus").textContent=features.length+" Länderflächen · lokal";
      loading.hidden=true;
      renderSelected();
      mapHint("Karte bereit · Länder antippen, heranzoomen oder Ereignisse erkunden.");
    }catch{
      $("borderStatus").textContent="Grenzen derzeit nicht verfügbar";
      loading.hidden=false;
      $("mapLoadingTitle").textContent="Ländergrenzen nicht geladen";
      $("mapLoadingText").textContent="Bitte Seite erneut laden. Die Ländersuche funktioniert trotzdem.";
      $("mapLoadingRetry").hidden=false;
      mapHint("Lokale Kartendaten konnten nicht gelesen werden. Ländersuche bleibt verfügbar.");
    }
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
      map.stop(); // Cancel older movements before navigating to the next country.
      activeRegion("");
      const match=borders?.getLayers().find(l=>countryForFeature(l.feature,getCountries())?.alpha2Code===country.alpha2Code);
      if(match&&match.getBounds().isValid()){
        const options={maxZoom:6,padding:[40,40]};
        if(reduced())map.fitBounds(match.getBounds(),{...options,animate:false});
        else map.flyToBounds(match.getBounds(),{...options,duration:.8});
      }else{
        const targetZoom=Math.min(5,Math.max(3,map.getZoom()));
        if(reduced())map.setView(pos,targetZoom,{animate:false});
        else map.flyTo(pos,targetZoom,{duration:.7});
      }
      mapHint("Land gewählt: "+country.name+" · weitere Informationen neben der Karte.");
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
    map.stop();
    if(reduced())map.setView([lat,lon],Math.max(5,map.getZoom()),{animate:false});
    else map.flyTo([lat,lon],Math.max(5,map.getZoom()),{duration:.8});
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
    setTimeout(()=>map.invalidateSize({pan:false}),90);
  }
  function expand(){
    const active=!root.classList.contains("map-expanded");
    if(!active){closeExpanded();return;}
    root.classList.add("map-expanded");
    document.body.classList.add("map-modal-open");
    $("mapExpand").setAttribute("aria-pressed","true");
    $("mapExpand").textContent="✕ Schliessen";
    setTimeout(()=>map.invalidateSize({pan:false}),90);
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
  $("mapReset").addEventListener("click",()=>jump("world"));
  $("mapExpand").addEventListener("click",expand);
  $("mapContrast").addEventListener("click",()=>{
    const active=root.classList.toggle("map-high-contrast");
    $("mapContrast").setAttribute("aria-pressed",String(active));
    $("mapContrast").textContent=active?"◐ Normal":"◐ Kontrast";
  });
  $("mapHelp").addEventListener("click",()=>toggleHelp());
  $("mapHelpClose").addEventListener("click",()=>toggleHelp(false));
  $("mapLoadingRetry").addEventListener("click",loadBorders);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){toggleHelp(false);if(root.classList.contains("map-expanded"))closeExpanded();}
  });
  const obs=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>map.invalidateSize({pan:false})):null;
  obs?.observe($("worldMap"));
  window.addEventListener("orientationchange",()=>setTimeout(()=>map.invalidateSize({pan:false}),220));
  applyMode("all");
  activeRegion("world");
  updateZoom();
  return {selectCountry,setEarthquakes,setNatureEvents,focusEvent,getMap(){return map;},destroy(){
    clearTimeout(timeout);obs?.disconnect();map.getContainer().removeEventListener("click",onNativeMapClick,true);map.remove();
  }};
}
