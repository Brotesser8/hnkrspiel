// FREQUENCY: immutable metadata and pure response adapters.
export const CHANNELS=[
 {id:"world",name:"Elsewhere",number:"01"}, {id:"art",name:"Art room",number:"02"},
 {id:"books",name:"Page turner",number:"03"}, {id:"earth",name:"Planet pulse",number:"04"},
 {id:"sound",name:"Now playing",number:"05"}, {id:"play",name:"Side quest",number:"06"}
];
export const CITIES=[
 {id:"zurich",name:"Zürich",country:"Schweiz",countryCode:"CH",lat:47.3769,lon:8.5417,timezone:"Europe/Zurich",region:"Europa"},
 {id:"tokyo",name:"Tokio",country:"Japan",countryCode:"JP",lat:35.6762,lon:139.6503,timezone:"Asia/Tokyo",region:"Asien"},
 {id:"reykjavik",name:"Reykjavík",country:"Island",countryCode:"IS",lat:64.1466,lon:-21.9426,timezone:"Atlantic/Reykjavik",region:"Europa"},
 {id:"newyork",name:"New York",country:"USA",countryCode:"US",lat:40.7128,lon:-74.006,timezone:"America/New_York",region:"Nordamerika"},
 {id:"lisbon",name:"Lissabon",country:"Portugal",countryCode:"PT",lat:38.7223,lon:-9.1393,timezone:"Europe/Lisbon",region:"Europa"},
 {id:"seoul",name:"Seoul",country:"Südkorea",countryCode:"KR",lat:37.5665,lon:126.9780,timezone:"Asia/Seoul",region:"Asien"},
 {id:"sydney",name:"Sydney",country:"Australien",countryCode:"AU",lat:-33.8688,lon:151.2093,timezone:"Australia/Sydney",region:"Ozeanien"},
 {id:"cape",name:"Kapstadt",country:"Südafrika",countryCode:"ZA",lat:-33.9249,lon:18.4241,timezone:"Africa/Johannesburg",region:"Afrika"},
 {id:"rio",name:"Rio de Janeiro",country:"Brasilien",countryCode:"BR",lat:-22.9068,lon:-43.1729,timezone:"America/Sao_Paulo",region:"Südamerika"},
 {id:"paris",name:"Paris",country:"Frankreich",countryCode:"FR",lat:48.8566,lon:2.3522,timezone:"Europe/Paris",region:"Europa"}
];
export const ART_TOPICS=[{id:"nature",name:"Natur",q:"landscape"},{id:"color",name:"Farbe",q:"colorful"},{id:"portrait",name:"Porträts",q:"portrait"},{id:"night",name:"Nacht",q:"night"},{id:"flowers",name:"Blumen",q:"flowers"},{id:"sea",name:"Meer",q:"sea"}];
export const BOOK_TOPICS=[{id:"curious",name:"Neugier",q:"curiosity science"},{id:"journeys",name:"Reisen",q:"journey travel"},{id:"design",name:"Design",q:"graphic design"},{id:"mystery",name:"Mystery",q:"mystery novel"},{id:"nature",name:"Natur",q:"nature ecology"},{id:"space",name:"Kosmos",q:"space astronomy"}];
export const SOUND_REGIONS=[{code:"ch",name:"Schweiz"},{code:"de",name:"Deutschland"},{code:"us",name:"USA"},{code:"jp",name:"Japan"},{code:"gb",name:"UK"},{code:"fr",name:"Frankreich"},{code:"br",name:"Brasilien"}];
export const SOURCES=[
 {name:"Open-Meteo",detail:"Wetter und Stadtsuche",url:"https://open-meteo.com/"},
 {name:"Open-Meteo Air Quality",detail:"Modellierter Luftqualitätsindex",url:"https://open-meteo.com/en/docs/air-quality-api"},
 {name:"Nager.Date",detail:"Öffentliche Feiertage",url:"https://date.nager.at/"},
 {name:"Art Institute of Chicago",detail:"Gemeinfreie Kunst",url:"https://api.artic.edu/docs/"},
 {name:"Open Library",detail:"Bücher und Katalogdaten",url:"https://openlibrary.org/developers/api"},
 {name:"USGS",detail:"Erdbeben-Messdaten",url:"https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"},
 {name:"NASA EONET",detail:"Naturereignisse",url:"https://eonet.gsfc.nasa.gov/docs/v3"},
 {name:"Apple Music RSS",detail:"Regionale Charts",url:"https://performance-partners.apple.com/tools"},
 {name:"Wikimedia",detail:"Freie Enzyklopädie-Bilder für MIXUP",url:"https://www.mediawiki.org/wiki/API:Pageimages"},
 {name:"FlagCDN",detail:"Länderflaggen für MIXUP",url:"https://flagcdn.com/"}
];
export const number=(val,maxDigits=0)=>Number.isFinite(Number(val))?new Intl.NumberFormat("de-CH",{maximumFractionDigits:maxDigits}).format(Number(val)):"—";
export function dateLabel(iso,zone="Europe/Zurich"){try{return new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"short",year:"numeric",timeZone:zone}).format(new Date(/^\d{4}-\d\d-\d\d$/.test(iso)?iso+"T12:00:00Z":iso))}catch{return String(iso||"—")}}
export function localClock(zone="UTC",now=new Date()){try{return new Intl.DateTimeFormat("de-CH",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:zone}).format(now)}catch{return "—:—"}}
export function weekday(iso){try{return new Intl.DateTimeFormat("de-CH",{weekday:"short",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"))}catch{return iso}}
export function wmoWeather(code){
 const c=Number(code);
 if(c===0)return {name:"Sonnig",glyph:"☼",tone:"clear"};
 if([1,2].includes(c))return {name:"Heiter",glyph:"◒",tone:"clear"};
 if(c===3)return {name:"Bewölkt",glyph:"☁",tone:"cloud"};
 if([45,48].includes(c))return {name:"Nebel",glyph:"≋",tone:"cloud"};
 if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c))return {name:"Regen",glyph:"☂",tone:"rain"};
 if([71,73,75,77,85,86].includes(c))return {name:"Schnee",glyph:"❄",tone:"snow"};
 if([95,96,99].includes(c))return {name:"Gewitter",glyph:"ϟ",tone:"rain"};
 return {name:"Wetter",glyph:"◌",tone:"cloud"};
}
export function aqiDescription(value){if(value===null||value===undefined)return {name:"Nicht verfügbar",pct:0};const a=Number(value);if(!Number.isFinite(a)||a<0)return {name:"Nicht verfügbar",pct:0};return {name:a<=20?"Sehr gut":a<=40?"Gut":a<=60?"Mässig":a<=80?"Schlecht":a<=100?"Sehr schlecht":"Extrem schlecht",pct:Math.min(100,a)}}
export function parseForecast(raw){if(!Array.isArray(raw?.daily?.time))throw Error("Keine Prognose");const d=raw.daily;return d.time.slice(0,6).map((date,i)=>({date,high:Number(d.temperature_2m_max?.[i]),low:Number(d.temperature_2m_min?.[i]),code:Number(d.weather_code?.[i]),rain:d.precipitation_probability_max?.[i]})).filter(x=>Number.isFinite(x.high)&&Number.isFinite(x.low))}
export function normalizeCity(raw){const lat=Number(raw.latitude),lon=Number(raw.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;const code=String(raw.country_code||"").toUpperCase();return {id:"geo-"+String(raw.id||Math.round(lat*1000)+"-"+Math.round(lon*1000)),name:String(raw.name||"Unbekannt"),country:String(raw.country||""),countryCode:/^[A-Z]{2}$/.test(code)?code:"",lat,lon,timezone:String(raw.timezone||"UTC"),region:String(raw.admin1||raw.country||"")}}
export function safeHttps(value){if(typeof value!=="string")return null;try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
export function parseArtworks(raw){if(!Array.isArray(raw?.data))throw Error("Museum-Antwort unvollständig");return raw.data.filter(a=>Number.isInteger(a.id)&&typeof a.title==="string"&&typeof a.image_id==="string"&&a.is_public_domain===true).slice(0,10).map(a=>({id:a.id,title:a.title,artist:String(a.artist_display||"Unbekannt"),year:String(a.date_display||""),image:"https://www.artic.edu/iiif/2/"+encodeURIComponent(a.image_id)+"/full/843,/0/default.jpg",thumb:"https://www.artic.edu/iiif/2/"+encodeURIComponent(a.image_id)+"/full/220,/0/default.jpg",link:"https://www.artic.edu/artworks/"+a.id,alt:String(a.thumbnail?.alt_text||a.title)}))}
export function normalizeBooks(raw){if(!Array.isArray(raw?.docs))throw Error("Bücher-Antwort unvollständig");const seen=new Set();return raw.docs.filter(b=>{if(typeof b.title!=="string"||!String(b.key||"").startsWith("/works/")||seen.has(b.key))return false;seen.add(b.key);return true}).slice(0,8).map(b=>({id:b.key,title:b.title,author:Array.isArray(b.author_name)?b.author_name.slice(0,2).join(", "):"Unbekannt",year:Number.isFinite(b.first_publish_year)?b.first_publish_year:null,cover:Number.isFinite(b.cover_i)?"https://covers.openlibrary.org/b/id/"+b.cover_i+"-M.jpg":null,link:"https://openlibrary.org"+b.key}))}
export function parseQuakes(raw){if(!Array.isArray(raw?.features))throw Error("Erdbebendaten fehlen");return raw.features.filter(x=>Array.isArray(x.geometry?.coordinates)&&Number.isFinite(Number(x.geometry.coordinates[0]))&&Number.isFinite(Number(x.geometry.coordinates[1]))).slice(0,28).map(x=>({id:String(x.id||""),title:String(x.properties?.place||"Ort unbekannt"),label:"M "+(Number.isFinite(x.properties?.mag)?Number(x.properties.mag).toFixed(1):"—"),detail:Number.isFinite(x.properties?.time)?dateLabel(x.properties.time,"UTC"):"Datum unbekannt",lat:Number(x.geometry.coordinates[1]),lon:Number(x.geometry.coordinates[0]),url:safeHttps(x.properties?.url)||"https://earthquake.usgs.gov/",type:"quake"}))}
export function parseEonet(raw){if(!Array.isArray(raw?.events))throw Error("NASA-Daten fehlen");return raw.events.map(e=>{const geo=[...(e.geometry||[])].reverse().find(g=>g.type==="Point"&&Array.isArray(g.coordinates)&&Number.isFinite(Number(g.coordinates[0]))&&Number.isFinite(Number(g.coordinates[1])));if(!geo)return null;return {id:String(e.id||""),title:String(e.title||"Naturereignis"),label:String(e.categories?.[0]?.title||"Naturereignis"),detail:geo.date?dateLabel(geo.date,"UTC"):"Beobachtung",lat:Number(geo.coordinates[1]),lon:Number(geo.coordinates[0]),url:safeHttps(e.sources?.find(s=>safeHttps(s.url))?.url)||"https://eonet.gsfc.nasa.gov/",type:"event"}}).filter(Boolean).slice(0,28)}
export function parseCharts(raw){if(!Array.isArray(raw?.feed?.results))throw Error("Kein Musikfeed für diese Region");return raw.feed.results.filter(x=>typeof x.name==="string").slice(0,10).map((x,i)=>({title:x.name,artist:String(x.artistName||"Unbekannt"),rank:i+1,image:safeHttps(x.artworkUrl100),url:safeHttps(x.url)||"https://music.apple.com/"}))}
export function upcomingHoliday(raw,today=new Date()){if(!Array.isArray(raw))return null;const cutoff=today.toISOString().slice(0,10);return raw.filter(h=>h?.date>=cutoff&&(!h.types||h.types.includes("Public"))).sort((a,b)=>a.date.localeCompare(b.date))[0]||null}
export function safePocket(raw){if(!Array.isArray(raw))return [];return raw.filter(x=>x&&typeof x.title==="string"&&x.title.length<240&&typeof x.type==="string"&&x.type.length<30&&typeof x.id==="string"&&x.id.length<160&&(!x.url||safeHttps(x.url))).slice(0,30).map(x=>({id:x.id,type:x.type,title:x.title,url:x.url||null,meta:String(x.meta||"").slice(0,180)}))}
export function randomIndex(length,random=Math.random){if(!Number.isSafeInteger(length)||length<=0)return -1;return Math.min(length-1,Math.floor(random()*length))}
