/* VeloFinder CH • GitHub Pages, no API key. Real availability only. */
'use strict';
const CUSTOM_API_URL = '';
const SOURCES = [
  {url:CUSTOM_API_URL||'https://rest.publibike.ch/v1/public/all/stations',name:'PubliBike / Velospot'},
  {url:'https://api.publibike.ch/v1/public/partner/stations',name:'PubliBike Legacy'}
];
const GBFS='https://api.publibike.ch/v1/gbfs/v2/gbfs.json';
const INTERVAL=120000,MIN_REFRESH=60000,MAX_ITEMS=85;
const BOUNDS=[[45.7,5.86],[47.85,10.61]],D=window.PubliBikeData;
const el=id=>document.getElementById(id);
const E={
  search:el('search-input'),city:el('city-select'),list:el('station-list'),
  count:el('result-count'),note:el('result-note'),stations:el('stat-stations'),
  bikes:el('stat-bikes'),ebikes:el('stat-ebikes'),footer:el('footer-status'),
  updated:el('last-updated'),footDot:el('sidebar-status-dot'),mapDot:el('map-status-dot'),
  live:el('map-live-text'),error:el('map-error'),errorTitle:el('error-title'),
  errorText:el('error-description'),refresh:el('refresh-button'),
  detail:el('detail-card'),name:el('detail-name'),address:el('detail-address'),
  total:el('detail-total'),regular:el('detail-regular'),eCount:el('detail-ebikes'),
  detailStatus:el('detail-status'),directions:el('detail-directions')
};
const S={stations:[],query:'',city:'',filter:'all',selected:null,loading:false,lastAttempt:0,success:false};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=x=>D.humanCount(x);
const has=n=>typeof n==='number'&&Number.isFinite(n);
let map=null,cluster=null,markers=new Map(),locateMarker=null;
function status(text,kind='pending'){
  E.footer.textContent=text;
  E.live.textContent=text;
  for(const dot of [E.footDot,E.mapDot]){
    dot.classList.remove('is-online','is-offline');
    if(kind==='online')dot.classList.add('is-online');
    if(kind==='offline')dot.classList.add('is-offline');
  }
}
function initMap(){
  if(!window.L){status('Kartenbibliothek nicht geladen','offline');showError('Karte nicht verfügbar','Leaflet konnte nicht geladen werden. Bitte Internetverbindung prüfen.');return}
  map=L.map('map',{zoomControl:false,scrollWheelZoom:true,preferCanvas:true}).fitBounds(BOUNDS);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  cluster=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({
    maxClusterRadius:48,showCoverageOnHover:false,spiderfyOnMaxZoom:true,
    iconCreateFunction:g=>{
      const n=g.getChildCount();
      return L.divIcon({html:'<div class="custom-cluster"><span>'+n+'</span></div>',
        className:'',iconSize:[48,48],iconAnchor:[24,24]});
    }
  }):L.layerGroup();
  map.addLayer(cluster);
  window.veloMap=map;
  window.veloClusters=cluster;
  el('map-home').addEventListener('click',()=>map.fitBounds(BOUNDS));
  el('map-zoom-in').addEventListener('click',()=>map.zoomIn());
  el('map-zoom-out').addEventListener('click',()=>map.zoomOut());
  setTimeout(()=>map.invalidateSize(),200);
}
function showError(title,description){
  E.errorTitle.textContent=title;E.errorText.textContent=description;
  E.error.classList.remove('is-hidden');
}
function clearError(){E.error.classList.add('is-hidden')}
function markerColor(n){return n===null?'marker-grey':n===0?'marker-red':n<5?'marker-orange':'marker-green'}
function availableColor(n){return n===null?'available-unknown':n===0?'available-none':n<5?'available-low':'available-yes'}
function iconFor(s){
  const name=markerColor(s.total),chosen=S.selected===s.id?' marker-selected':'';
  const number=s.total===null?'?':s.total>99?'99+':s.total;
  return L.divIcon({html:'<span class="bike-marker '+name+chosen+'">'+number+'</span>',
    iconSize:[39,43],iconAnchor:[19,21],className:''});
}
function visible(){
  const q=S.query.toLocaleLowerCase('de-CH');
  return S.stations.filter(s=>{
    if(S.city&&s.city!==S.city)return false;
    if(S.filter==='available'&&!(s.total>0))return false;
    if(S.filter==='ebike'&&!(s.ebikes>0))return false;
    return !q||[s.name,s.city,s.address,s.postal,s.network].join(' ').toLocaleLowerCase('de-CH').includes(q);
  });
}
function renderMap(items){
  if(!map||!cluster)return;
  cluster.clearLayers();markers.clear();
  for(const s of items){
    const marker=L.marker([s.lat,s.lon],{icon:iconFor(s),title:s.name});
    marker.on('click',()=>selectStation(s.id,false));
    marker.bindTooltip(escapeHTML(s.name)+' · '+count(s.total)+' Velos',{direction:'top',offset:[0,-15]});
    cluster.addLayer(marker);markers.set(s.id,marker);
  }
}
function listItem(s){
  const selected=S.selected===s.id?' is-selected':'';
  return '<button class="station-item'+selected+'" type="button" data-id="'+escapeHTML(s.id)+'">'+
    '<span class="station-left"><span class="station-icon" aria-hidden="true">🚲</span><span class="station-text">'+
    '<span class="station-title">'+escapeHTML(s.name)+'</span><span class="station-subtitle">'+
    escapeHTML([s.city,s.address].filter(Boolean).join(' · ')||s.network)+'</span></span></span>'+
    '<span class="station-availability '+availableColor(s.total)+'">'+count(s.total)+' <small>Velos</small></span></button>';
}
function renderList(items){
  E.count.textContent=count(items.length);
  E.note.textContent=items.length===S.stations.length?'Alle gemeldeten Stationen':items.length+' passende Stationen';
  if(!items.length){E.list.innerHTML='<div class="empty-list">Keine passenden Stationen gefunden. Passe die Suche oder Filter an.</div>';return}
  const sorted=items.slice().sort((a,b)=>a.name.localeCompare(b.name,'de-CH'));
  E.list.innerHTML=sorted.slice(0,MAX_ITEMS).map(listItem).join('')+
    (sorted.length>MAX_ITEMS?'<div class="empty-list">Weitere Stationen findest du über die Suche oder direkt auf der Karte.</div>':'');
  E.list.querySelectorAll('.station-item').forEach(button=>{
    button.addEventListener('click',()=>selectStation(button.dataset.id,true));
  });
}
function renderSummary(){
  E.stations.textContent=count(S.stations.length);
  const totals=S.stations.filter(s=>has(s.total));
  E.bikes.textContent=totals.length?count(totals.reduce((a,s)=>a+s.total,0)):'–';
  const ebikes=S.stations.filter(s=>has(s.ebikes));
  E.ebikes.textContent=ebikes.length?count(ebikes.reduce((a,s)=>a+s.ebikes,0)):'–';
}
function renderCityOptions(){
  const previous=S.city;
  const cities=[...new Set(S.stations.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de-CH'));
  E.city.innerHTML='<option value="">Alle Orte</option>';
  for(const city of cities){const option=document.createElement('option');option.value=city;option.textContent=city;E.city.appendChild(option)}
  if(cities.includes(previous))E.city.value=previous;else{S.city='';E.city.value=''}
}
function renderAll(){
  const items=visible();
  renderList(items);renderMap(items);
  if(S.selected&&!items.some(x=>x.id===S.selected))E.detail.classList.add('is-hidden');
}
function selectStation(id,fly){
  const s=S.stations.find(x=>x.id===id);if(!s)return;
  S.selected=s.id;
  E.name.textContent=s.name;
  E.address.textContent=[s.address,s.postal,s.city,s.network].filter(Boolean).join(' · ')||'Standort in der Schweiz';
  E.total.textContent=count(s.total);E.regular.textContent=count(s.regular);E.eCount.textContent=count(s.ebikes);
  E.detailStatus.textContent=s.total===null?'Verfügbarkeit nicht gemeldet':s.total===0?'Aktuell keine Velos':s.total+' Velos verfügbar';
  E.directions.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(s.lat+','+s.lon);
  E.detail.classList.remove('is-hidden');
  for(const [stationId,marker] of markers){marker.setIcon(iconFor({...S.stations.find(x=>x.id===stationId)}))}
  if(fly&&map){map.flyTo([s.lat,s.lon],Math.max(map.getZoom(),15),{duration:0.65});const m=markers.get(id);if(m&&cluster&&typeof cluster.zoomToShowLayer==='function')cluster.zoomToShowLayer(m)}
  E.list.querySelectorAll('.station-item').forEach(b=>b.classList.toggle('is-selected',b.dataset.id===id));
}
async function getJSON(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),14000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    return await response.json();
  }finally{clearTimeout(timeout)}
}
async function loadGBFS(){
  const response=await getJSON(GBFS);
  const data=response?.data?.en||response?.data?.de||response?.data?.fr||response?.data||{};
  const feeds=data.feeds||[];
  const info=feeds.find(x=>x.name==='station_information')?.url;
  const status=feeds.find(x=>x.name==='station_status')?.url;
  if(!info||!status)throw Error('GBFS Stationsdaten nicht verfügbar');
  const [a,b]=await Promise.all([getJSON(info),getJSON(status)]);
  return D.normalizeGbfs(a,b);
}
async function loadStations(manual=false){
  if(S.loading)return;
  const now=Date.now();
  if(manual&&S.lastAttempt&&now-S.lastAttempt<MIN_REFRESH){status('Erneut laden in '+Math.ceil((MIN_REFRESH-(now-S.lastAttempt))/1000)+' s',S.success?'online':'offline');return}
  S.loading=true;S.lastAttempt=now;E.refresh.classList.add('is-spinning');
  if(!S.success)status('Stationen werden geladen …');
  let stations=null,label='',messages=[];
  try{
    for(const src of SOURCES){
      try{
        const payload=await getJSON(src.url);const converted=D.normalizeAll(payload);
        if(!converted.length)throw Error('Keine gültigen Stationen');
        stations=converted;label=src.name;break;
      }catch(error){messages.push(src.name+': '+error.message)}
    }
    if(!stations){
      try{stations=await loadGBFS();if(!stations.length)throw Error('Keine Stationen');label='GBFS'}
      catch(error){messages.push('GBFS: '+error.message)}
    }
    if(!stations?.length)throw Error(messages.join(' · '));
    S.stations=stations;S.success=true;
    renderSummary();renderCityOptions();renderAll();
    if(S.selected&&S.stations.some(s=>s.id===S.selected))selectStation(S.selected,false);
    else E.detail.classList.add('is-hidden');
    clearError();status('Live · '+label,'online');
    E.updated.textContent='Aktualisiert um '+new Date().toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
  }catch(error){
    console.error('PubliBike API:',error);
    status(S.success?'Letzte Daten · Offline':'Keine Verbindung','offline');
    E.updated.textContent=S.success?'Letzte Daten bleiben sichtbar':'Keine Live-Daten verfügbar';
    showError('Live-Daten momentan nicht verfügbar','Die PubliBike-API ist nicht erreichbar oder erlaubt keine Browseranfragen (CORS). Es werden keine Zahlen erfunden.');
    if(!S.success){E.list.innerHTML='<div class="empty-list">Die API ist momentan nicht erreichbar. Bitte später erneut versuchen.</div>';E.note.textContent='Keine Daten geladen'}
  }finally{S.loading=false;E.refresh.classList.remove('is-spinning')}
}
function init(){
  initMap();
  E.search.addEventListener('input',e=>{S.query=e.target.value.trim();renderAll()});
  E.city.addEventListener('change',e=>{S.city=e.target.value;renderAll();if(S.city){const ss=visible();if(ss.length&&map)map.fitBounds(L.latLngBounds(ss.map(s=>[s.lat,s.lon])).pad(.15),{maxZoom:14})}});
  document.querySelectorAll('.filter-button').forEach(btn=>btn.addEventListener('click',()=>{
    S.filter=btn.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(b=>{const active=b===btn;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});renderAll();
  }));
  E.search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=visible()[0];if(first)selectStation(first.id,true)}});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();E.search.focus()}if(e.key==='Escape'){E.detail.classList.add('is-hidden');E.search.blur()}});
  el('reset-button').addEventListener('click',()=>{
    S.query='';S.city='';S.filter='all';E.search.value='';E.city.value='';
    document.querySelectorAll('.filter-button').forEach(b=>{const active=b.dataset.filter==='all';b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});renderAll();
    map?.fitBounds(BOUNDS);
  });
  el('close-detail').addEventListener('click',()=>{E.detail.classList.add('is-hidden');S.selected=null;renderAll()});
  E.refresh.addEventListener('click',()=>loadStations(true));
  el('retry-button').addEventListener('click',()=>loadStations(true));
  el('locate-button').addEventListener('click',()=>{
    if(!navigator.geolocation){showError('Standort nicht verfügbar','Dein Browser unterstützt keine Standortfreigabe.');return}
    navigator.geolocation.getCurrentPosition(position=>{
      if(!map)return;
      const ll=[position.coords.latitude,position.coords.longitude];
      if(locateMarker)map.removeLayer(locateMarker);
      locateMarker=L.circleMarker(ll,{radius:8,color:'#1c6fe2',fillColor:'#438bf8',fillOpacity:.85,weight:3}).addTo(map);
      map.flyTo(ll,14);
    },()=>showError('Standort nicht verfügbar','Bitte erlaube die Standortfreigabe im Browser.'),{enableHighAccuracy:false,timeout:10000});
  });
  loadStations(false);
  setInterval(()=>loadStations(false),INTERVAL);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();