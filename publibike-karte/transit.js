/* VeloFinder CH: Swiss public transport overlay (no API key)
 * Data: transport.opendata.ch. Markers = approximations between stops,
 * NOT measured vehicle GPS locations. Only a sampled viewport subset appears.
 */
(function(){
'use strict';
var API='https://transport.opendata.ch/v1', REFRESH=180000, MIN_REFRESH=120000;
var hubs=[
['Zürich HB',47.3778,8.5402],['Zürich Oerlikon',47.4115,8.5445],['Zürich Stadelhofen',47.3665,8.5483],['Zürich Altstetten',47.392,8.489],
['Bern',46.9488,7.4391],['Bümpliz Nord',46.942,7.392],['Worb Dorf',46.928,7.566],['Thun',46.754,7.63],['Burgdorf',47.06,7.621],
['Basel SBB',47.5474,7.5895],['Basel Bad Bf',47.568,7.607],['Olten',47.350,7.908],['Aarau',47.392,8.052],['Baden',47.475,8.308],
['Luzern',47.05,8.31],['Zug',47.175,8.516],['Sursee',47.171,8.11],['Stans',46.958,8.366],['Sarnen',46.898,8.246],['Altdorf',46.881,8.644],
['St. Gallen',47.422,9.371],['Winterthur',47.5,8.724],['Frauenfeld',47.558,8.898],['Wil SG',47.461,9.044],['Kreuzlingen',47.65,9.17],
['Schaffhausen',47.697,8.634],['Romanshorn',47.566,9.378],['Rapperswil SG',47.224,8.815],['Uster',47.348,8.719],['Wetzikon ZH',47.324,8.797],
['Chur',46.853,9.531],['Landquart',46.968,9.554],['Davos Platz',46.792,9.82],['St. Moritz',46.498,9.844],['Buchs SG',47.167,9.477],
['Glarus',47.041,9.067],['Schwyz',47.027,8.631],['Appenzell',47.331,9.411],['Herisau',47.387,9.279],
['Lausanne',46.5168,6.6291],['Renens VD',46.538,6.589],['Morges',46.511,6.496],['Nyon',46.384,6.236],['Yverdon-les-Bains',46.781,6.641],
['Genève',46.21,6.143],['Genève-Aéroport',46.232,6.109],['Lancy-Pont-Rouge',46.187,6.124],['Montreux',46.436,6.91],['Vevey',46.463,6.843],
['Fribourg/Freiburg',46.804,7.151],['Bulle',46.619,7.057],['Payerne',46.82,6.939],['Neuchâtel',46.996,6.936],['La Chaux-de-Fonds',47.099,6.826],
['Biel/Bienne',47.133,7.243],['Delémont',47.362,7.35],['Porrentruy',47.418,7.075],['Sion',46.227,7.36],['Sierre/Siders',46.291,7.532],
['Martigny',46.102,7.073],['Brig',46.316,7.988],['Visp',46.293,7.882],['Interlaken Ost',46.691,7.869],['Spiez',46.686,7.68],
['Bellinzona',46.196,9.029],['Lugano',46.005,8.947],['Locarno',46.169,8.799],['Chiasso',45.832,9.032],['Solothurn',47.207,7.538],['Langenthal',47.213,7.784]
];
var types=['train','bus','tram','ship','cableway','other'],active=new Set(types),enabled=true;
var map,layer,routeLayer,runs=[],markers=new Map(),cache=new Map(),pending=false,lastFetch=0,lastUpdated=0,lastArea='',selection=null,moveTimer=null;
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function swissDate(d){var p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d),a={};p.forEach(function(x){a[x.type]=x.value;});return a.year+'-'+a.month+'-'+a.day+' '+a.hour+':'+a.minute;}
function shortTime(t){return t?new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'–';}
function timestamp(x){if(x==null||x==='')return null;if(typeof x==='number')return x>100000000000?x:x*1000;var t=Date.parse(String(x));return Number.isFinite(t)?t:null;}
function coordinates(s){var l=s&&(s.station||s.location||s),c=l&&(l.coordinate||l.coordinates||l),lat=Number(c&&(c.x==null?c.latitude:c.x)),lon=Number(c&&(c.y==null?c.longitude:c.y));if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<45.4||lat>48.6||lon<5.4||lon>11.4)return null;return {lat:lat,lon:lon,name:String(l.name||'Haltestelle'),id:String(l.id||'')};}
function timedStop(s,kind){var p=s.prognosis||{},forecast=timestamp(p[kind]);if(forecast!=null)return {t:forecast,realtime:true};var planned=timestamp(s[kind+'Timestamp']);if(planned==null)planned=timestamp(s[kind]);if(planned==null)return {t:null,realtime:false};var delay=Number(s.delay),hasDelay=s.delay!=null&&Number.isFinite(delay);return {t:planned+(hasDelay?delay*60000:0),realtime:hasDelay};}
function category(j){var raw=String(j.category||j.name||'').toLowerCase();if(/tram|strassenbahn|trolley/.test(raw))return 'tram';if(/schiff|ship|bateau|boat|ferry|faehre|fähre|^bat/.test(raw))return 'ship';if(/seil|cable|gondel|funic|^gb|^pb|^sl|^cc|^fun/.test(raw))return 'cableway';if(/bus|^b\b|^nfb/.test(raw))return 'bus';if(/^(ic|ir|re|s\d*\b|sn\b|r\b|ec|ice|tgv|rj|rex|ter|rb|train|zug|ext|en|nj)/.test(raw))return 'train';return 'other';}
function normalize(j,source){
 if(!j||!j.stop)return null;
 var points=[j.stop].concat(Array.isArray(j.passList)?j.passList:[]),list=[],seen=new Set();
 points.forEach(function(p){var c=coordinates(p);if(!c)return;var d=timedStop(p,'departure'),a=timedStop(p,'arrival'),t=d.t==null?a.t:d.t;if(t==null)return;
 var key=(c.id||c.name)+'|'+Math.floor(t/60000);if(seen.has(key))return;seen.add(key);
 list.push({lat:c.lat,lon:c.lon,name:c.name,id:c.id,at:t,dep:d.t,arr:a.t,realtime:d.realtime||a.realtime});});
 list.sort(function(a,b){return a.at-b.at;});if(!list.length)return null;
 var name=String(j.name||((j.category||'ÖV')+' '+(j.number||''))).trim(),to=String(j.to||''),cat=category(j);
 var id=String(j.journeyId||j.id||'')||cat+'|'+name+'|'+to+'|'+Math.round(list[0].at/180000);
 return {id:id,name:name,to:to,operator:String(j.operator||''),type:cat,stops:list,realtime:list.some(function(s){return s.realtime;}),source:source};
}
function position(run,now){
 var s=run.stops;
 for(var i=0;i<s.length-1;i++){var a=s[i],b=s[i+1],dep=a.dep==null?a.at:a.dep,arr=b.arr==null?b.at:b.arr;
 if(now>=a.at-20000&&now<dep&&dep>=a.at)return {lat:a.lat,lon:a.lon,from:a,to:b,atStop:true};
 if(arr<=dep||arr-dep>14400000)continue;
 if(now>=dep&&now<=arr){var f=Math.min(1,Math.max(0,(now-dep)/(arr-dep)));return {lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f,from:a,to:b,atStop:false};}
 }
 for(var k=0;k<s.length;k++)if(Math.abs(now-s[k].at)<45000)return {lat:s[k].lat,lon:s[k].lon,from:s[k],to:null,atStop:true};
 return null;
}
function symbol(t){return {train:'🚆',bus:'🚌',tram:'🚋',ship:'⛴️',cableway:'🚠',other:'🚍'}[t]||'🚍';}
function markerIcon(r){return L.divIcon({className:'transit-div-icon',html:'<div class="transit-pin transit-'+r.type+'">'+symbol(r.type)+'</div>',iconSize:[37,37],iconAnchor:[18,18],popupAnchor:[0,-20]});}
function detail(r,p){
 var next=p.to?p.to.name:(p.from?p.from.name:'–');
 var stops=r.stops.filter(function(s){return s.at>Date.now()-60000;}).slice(0,6).map(function(s){return '<li><time>'+esc(shortTime(s.at))+'</time><span>'+esc(s.name)+'</span></li>';}).join('');
 return '<div class="transit-popup"><div class="transit-popup-top"><span class="transit-popup-symbol">'+symbol(r.type)+'</span><div><b>'+esc(r.name)+'</b><small>'+esc(r.operator)+'</small></div></div>'+
 '<p class="transit-destination">Richtung <strong>'+esc(r.to||'Unbekannt')+'</strong></p><p><span class="transit-status-label">'+(r.realtime?'Mit Echtzeitprognose':'Nach Fahrplan geschätzt')+'</span></p>'+
 '<p class="transit-next">'+(p.atStop?'Bei Haltestelle: ':'Nächster Halt: ')+'<strong>'+esc(next)+'</strong></p>'+
 (stops?'<div class="transit-stop-title">Nächste Halte</div><ol class="transit-stop-list">'+stops+'</ol>':'')+
 '<p class="transit-fineprint">Kein GPS: zwischen Haltestellen geradlinig geschätzt. Echtzeit bezieht sich nur auf Abfahrts- und Ankunftsprognosen.</p></div>';
}
function drawRoute(r){routeLayer.clearLayers();if(r.stops.length<2)return;L.polyline(r.stops.map(function(s){return [s.lat,s.lon];}),{color:'#1a6dba',weight:4,opacity:.82,dashArray:'8 6',interactive:false}).addTo(routeLayer);r.stops.forEach(function(s){L.circleMarker([s.lat,s.lon],{radius:3,color:'#1a6dba',fillColor:'#fff',fillOpacity:1,weight:2,interactive:false}).addTo(routeLayer);});}
function paint(){
 if(!enabled||!map||!layer)return;
 var now=Date.now(),ids=new Set(),total=0;
 runs.forEach(function(r){if(!active.has(r.type))return;var p=position(r,now);if(!p)return;if(!map.getBounds().pad(.3).contains([p.lat,p.lon]))return;
 total++;ids.add(r.id);var marker=markers.get(r.id);
 if(!marker){marker=L.marker([p.lat,p.lon],{icon:markerIcon(r),zIndexOffset:600,title:r.name+' – geschätzte Position'}).addTo(layer);
 marker.bindPopup(detail(r,p),{maxWidth:320,autoPan:true});
 marker.on('click',function(){selection=r.id;drawRoute(r);marker.setPopupContent(detail(r,position(r,Date.now())||p));marker.openPopup();});
 marker.on('popupclose',function(){if(selection===r.id){selection=null;routeLayer.clearLayers();}});
 markers.set(r.id,marker);
 }else{marker.setLatLng([p.lat,p.lon]);if(selection===r.id&&marker.isPopupOpen())marker.setPopupContent(detail(r,p));}});
 markers.forEach(function(m,id){if(!ids.has(id)){layer.removeLayer(m);markers.delete(id);}});
 $('transit-count').textContent=total;
 $('transit-status').textContent=lastUpdated?total+' geschätzte Fahrzeugpositionen im Kartenausschnitt':'ÖV-Daten werden geladen …';
}
function dist(a,b){var dy=(a[1]-b[1])*Math.cos(a[0]*Math.PI/180),dx=a[0]-b[0];return Math.sqrt(dx*dx+dy*dy)*111.2;}
function nearbyHubs(){
 var b=map.getBounds(),pad=b.pad(.5),c=map.getCenter(),z=map.getZoom();
 var found=hubs.filter(function(h){return pad.contains([h[1],h[2]]);}).sort(function(a,b){return dist([a[1],a[2]],[c.lat,c.lng])-dist([b[1],b[2]],[c.lat,c.lng]);});
 if(z<=8){var names=['Zürich HB','Bern','Basel SBB','Lausanne','Genève','Luzern','St. Gallen','Chur','Lugano','Biel/Bienne','Sion','Neuchâtel','Winterthur'];
 return hubs.filter(function(h){return names.includes(h[0]);});}
 if(found.length<3){hubs.slice().sort(function(a,b){return dist([a[1],a[2]],[c.lat,c.lng])-dist([b[1],b[2]],[c.lat,c.lng]);}).forEach(function(h){if(found.length<4&&!found.includes(h))found.push(h);});}
 return found.slice(0,z>=12?6:9);
}
async function getJson(url){var abort=new AbortController(),tid=setTimeout(function(){abort.abort();},13000);try{var r=await fetch(url,{signal:abort.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(tid);}}
async function localStops(){
 if(map.getZoom()<10)return [];
 var b=map.getBounds(),c=map.getCenter(),points=[[c.lat,c.lng],[(b.getNorth()+c.lat)/2,(b.getWest()+c.lng)/2],[(b.getSouth()+c.lat)/2,(b.getEast()+c.lng)/2]];
 return (await Promise.all(points.map(async function(pt){var key='xy|'+pt[0].toFixed(3)+'|'+pt[1].toFixed(3),old=cache.get(key);if(old&&Date.now()-old.at<600000)return old.data;
 try{var json=await getJson(API+'/locations?x='+encodeURIComponent(pt[0].toFixed(5))+'&y='+encodeURIComponent(pt[1].toFixed(5))),arr=Array.isArray(json.stations)?json.stations:[],first=arr.find(function(s){return s.id&&coordinates(s);}),data=first?[first.name]:[];cache.set(key,{data:data,at:Date.now()});return data;}catch(e){return [];}}))).flat();
}
async function board(name,when){var key='board|'+name+'|'+when,old=cache.get(key);if(old&&Date.now()-old.at<REFRESH)return old.data;var j=await getJson(API+'/stationboard?station='+encodeURIComponent(name)+'&datetime='+encodeURIComponent(when)+'&limit=70');if(!Array.isArray(j.stationboard))throw new Error('Ungültige Fahrplandaten');cache.set(key,{data:j.stationboard,at:Date.now()});return j.stationboard;}
async function refresh(force){
 if(!enabled||pending||!map)return;
 var c=map.getCenter(),area=[Math.round(c.lat*18),Math.round(c.lng*18),map.getZoom()>=12?12:map.getZoom()>=10?10:8].join('/');
 if(!force&&Date.now()-lastFetch<MIN_REFRESH&&(lastArea===area||Date.now()-lastFetch<22000))return;
 lastArea=area;
 pending=true;lastFetch=Date.now();$('transit-status').textContent='Lade ÖV-Fahrten für den Kartenausschnitt …';
 try{
 var discovered=await localStops(),stations=Array.from(new Set(discovered.concat(nearbyHubs().map(function(h){return h[0];})))).slice(0,14);
 var when=swissDate(new Date(Date.now()-32*60000)),all=[],ok=0;
 for(var i=0;i<stations.length;i+=3){var batch=stations.slice(i,i+3);var results=await Promise.allSettled(batch.map(function(name){return board(name,when);}));
 results.forEach(function(res,n){if(res.status==='fulfilled'){ok++;res.value.forEach(function(j){var run=normalize(j,batch[n]);if(run)all.push(run);});}});}
 if(!ok)throw new Error('Keine Fahrplandaten erreichbar');
 var unique=new Map();
 all.forEach(function(r){var old=unique.get(r.id);if(!old||r.stops.length>old.stops.length)unique.set(r.id,r);});
 runs=Array.from(unique.values());lastUpdated=Date.now();$('transit-updated').textContent='Stand '+shortTime(lastUpdated)+' · '+ok+'/'+stations.length+' Haltestellen';
 $('transit-error').hidden=true;paint();
 if(!runs.length)$('transit-status').textContent='Keine Fahrten im untersuchten Bereich';
 else if(!markers.size)$('transit-status').textContent='Keine interpolierbaren Fahrzeuge – Kartenausschnitt ändern';
 }catch(e){$('transit-status').textContent='ÖV-API derzeit nicht erreichbar';$('transit-error').hidden=false;$('transit-error').textContent='ÖV-Daten konnten nicht geladen werden: '+String(e.message||e);}
 finally{pending=false;}
}
function start(){
 if(!window.veloMap||!window.L){if($('transit-status'))$('transit-status').textContent='Karte nicht bereit';return;}
 map=window.veloMap;layer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);
 $('show-transport').addEventListener('change',function(e){enabled=e.target.checked;if(enabled){map.addLayer(layer);map.addLayer(routeLayer);refresh(true);}else{map.removeLayer(layer);map.removeLayer(routeLayer);selection=null;routeLayer.clearLayers();$('transit-status').textContent='ÖV ausgeblendet';}});
 $('show-bikes').addEventListener('change',function(e){if(window.veloClusters){if(e.target.checked)map.addLayer(window.veloClusters);else map.removeLayer(window.veloClusters);}if(!e.target.checked&&$('detail-card'))$('detail-card').classList.add('is-hidden');});
 document.querySelectorAll('[data-transit-type]').forEach(function(btn){btn.addEventListener('click',function(){var type=btn.dataset.transitType;if(type==='all'||(active.size===1&&active.has(type)))active=new Set(types);else active=new Set([type]);
 document.querySelectorAll('[data-transit-type]').forEach(function(b){var on=b.dataset.transitType==='all'?active.size===types.length:active.size===1&&active.has(b.dataset.transitType);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});paint();});});
 $('transit-refresh').addEventListener('click',function(){refresh(true);});
 map.on('moveend',function(){if(!enabled)return;clearTimeout(moveTimer);var delay=Math.max(750,22000-(Date.now()-lastFetch));moveTimer=setTimeout(function(){paint();refresh(false);},delay);});
 document.addEventListener('visibilitychange',function(){if(!document.hidden){paint();refresh(false);}});
 setInterval(function(){if(!document.hidden)paint();},6000);
 setInterval(function(){if(!document.hidden)refresh(false);},REFRESH);
 refresh(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.OeVTest={coordinates:coordinates,timedStop:timedStop,normalize:normalize,position:position,category:category};
})();