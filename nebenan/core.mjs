export const CITIES=Object.freeze({
  zurich:{name:"Zürich",lat:47.3769,lon:8.5417},
  bern:{name:"Bern",lat:46.948,lon:7.4474},
  geneva:{name:"Genf",lat:46.2044,lon:6.1432},
  basel:{name:"Basel",lat:47.5596,lon:7.5886},
  lucerne:{name:"Luzern",lat:47.0502,lon:8.3093},
  lausanne:{name:"Lausanne",lat:46.5197,lon:6.6323},
  london:{name:"London",lat:51.5074,lon:-.1278},
  paris:{name:"Paris",lat:48.8566,lon:2.3522},
  berlin:{name:"Berlin",lat:52.52,lon:13.405},
  vienna:{name:"Wien",lat:48.2082,lon:16.3738},
  amsterdam:{name:"Amsterdam",lat:52.3676,lon:4.9041},
  rome:{name:"Rom",lat:41.9028,lon:12.4964},
  madrid:{name:"Madrid",lat:40.4168,lon:-3.7038},
  copenhagen:{name:"Kopenhagen",lat:55.6761,lon:12.5683},
  oslo:{name:"Oslo",lat:59.9139,lon:10.7522},
  tokyo:{name:"Tokio",lat:35.6762,lon:139.6503},
  newyork:{name:"New York",lat:40.7128,lon:-74.006},
  sydney:{name:"Sydney",lat:-33.8688,lon:151.2093}
});
export const COUNTRY_DEFAULTS=[
 {name:"Schweiz",alpha2Code:"CH",alpha3Code:"CHE",capital:"Bern",population:8990000,region:"Europe",latlng:[46.8182,8.2275],currencies:[{code:"CHF"}],languages:[{name:"Deutsch"}],timezones:["UTC+01:00"],flag:"🇨🇭",area:41285},
 {name:"Japan",alpha2Code:"JP",alpha3Code:"JPN",capital:"Tokyo",region:"Asia",latlng:[36,138],currencies:[{code:"JPY"}],timezones:["UTC+09:00"],flag:"🇯🇵"},
 {name:"Brasilien",alpha2Code:"BR",alpha3Code:"BRA",capital:"Brasília",region:"Americas",latlng:[-10,-55],currencies:[{code:"BRL"}],timezones:["UTC-03:00"],flag:"🇧🇷"},
 {name:"Island",alpha2Code:"IS",alpha3Code:"ISL",capital:"Reykjavík",region:"Europe",latlng:[65,-18],currencies:[{code:"ISK"}],timezones:["UTC+00:00"],flag:"🇮🇸"},
 {name:"Südafrika",alpha2Code:"ZA",alpha3Code:"ZAF",capital:"Pretoria",region:"Africa",latlng:[-29,24],currencies:[{code:"ZAR"}],timezones:["UTC+02:00"],flag:"🇿🇦"},
 {name:"Neuseeland",alpha2Code:"NZ",alpha3Code:"NZL",capital:"Wellington",region:"Oceania",latlng:[-41,174],currencies:[{code:"NZD"}],timezones:["UTC+12:00"],flag:"🇳🇿"},
 {name:"Südkorea",alpha2Code:"KR",alpha3Code:"KOR",capital:"Seoul",region:"Asia",latlng:[37,127.5],currencies:[{code:"KRW"}],timezones:["UTC+09:00"],flag:"🇰🇷"}
];
export const SOURCES=[
 {name:"countries.dev",topic:"Länder und Geografie",url:"https://countries.dev/docs",note:"Länderdaten, Flaggen, Sprachen, Zeitzonen und Länderzentrum.",mode:"online"},
 {name:"Apple Marketing Tools RSS",topic:"Musikcharts",url:"https://performance-partners.apple.com/tools",note:"Öffentliches Top-Songs-Ranking, wenn für die Region verfügbar.",mode:"online"},
 {name:"Frankfurter",topic:"Wechselkurse",url:"https://frankfurter.dev/",note:"Tägliche Referenzkurse; keine täglichen oder monatlichen Kontingente.",mode:"online"},
 {name:"Nager.Date",topic:"Feiertage",url:"https://nagerholidays.com/",note:"Öffentlicher Community-Feed für viele Länder.",mode:"online"},
 {name:"World Bank Indicators",topic:"Statistik",url:"https://data.worldbank.org/",note:"Bevölkerung und Internetnutzung mit Datenjahr.",mode:"online"},
 {name:"USGS Earthquake",topic:"Erdbeben",url:"https://earthquake.usgs.gov/earthquakes/feed/",note:"Weltweite Messereignisse aus dem USGS-Feed.",mode:"online"},
 {name:"NASA EONET",topic:"Naturereignisse",url:"https://eonet.gsfc.nasa.gov/",note:"Von NASA kuratierte beobachtete Naturereignisse.",mode:"online"},
 {name:"NASA JPL / CNEOS",topic:"Asteroiden",url:"https://ssd-api.jpl.nasa.gov/doc/cad.html",note:"Erdnahe Vorbeiflüge, Annäherung ≠ Einschlag.",mode:"online"},
 {name:"Transitous",topic:"ÖV-Verbindungen",url:"https://transitous.org/api/",note:"Open-Source-Routing auf Knopfdruck, nur nichtkommerziell.",mode:"ondemand"},
 {name:"PokéAPI",topic:"Pokémon-Rätsel",url:"https://pokeapi.co/docs/v2",note:"Öffentliche Pokémon-Daten ohne API-Key und ohne Ratenlimit.",mode:"ondemand"},
 {name:"Dog CEO",topic:"Zufällige Hunde",url:"https://dog.ceo/dog-api/",note:"Zufälliges Foto auf Knopfdruck.",mode:"ondemand"},
 {name:"OpenStreetMap",topic:"Karte",url:"https://www.openstreetmap.org/copyright",note:"Kartendaten mit Attribution und öffentlicher Tile-Usage-Policy.",mode:"online"}
];
export const fmtNumber=(n,decimals=0)=>Number.isFinite(Number(n))?new Intl.NumberFormat("de-CH",{maximumFractionDigits:decimals}).format(Number(n)):"—";
export const fmtDate=(date)=>new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(date));
export const normalizedName=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export function normalizeCountries(raw){
  if(!Array.isArray(raw))return [];
  const result=new Map();
  for(const source of raw){
    const alpha2Code=String(source?.alpha2Code||source?.cca2||"").toUpperCase();
    if(!/^[A-Z]{2}$/.test(alpha2Code))continue;
    const coordinates=source.latlng||source.latLng||[];
    const lat=Number(coordinates[0]),lon=Number(coordinates[1]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    const name=typeof source.name==="string"?source.name:source.name?.common||alpha2Code;
    const curr=Array.isArray(source.currencies)?source.currencies:Object.entries(source.currencies||{}).map(([code,v])=>({code,name:v?.name,symbol:v?.symbol}));
    const langs=Array.isArray(source.languages)?source.languages:Object.values(source.languages||{}).map(name=>({name}));
    const capital=Array.isArray(source.capital)?source.capital[0]:source.capital;
    const flag=typeof source.flag==="string"&&source.flag.length<=7?source.flag:(typeof source.flags?.emoji==="string"?source.flags.emoji:"🌐");
    result.set(alpha2Code,{
      name:String(name),alpha2Code,alpha3Code:String(source.alpha3Code||source.cca3||""),
      capital:String(capital||"—"),population:Number(source.population)||null,area:Number(source.area)||null,
      region:String(source.region||"Andere"),subregion:String(source.subregion||""),
      lat,lon,currencies:curr.filter(c=>c?.code),languages:langs,timezones:Array.isArray(source.timezones)?source.timezones:[],flag
    });
  }
  return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
export function nearestCountry(countries,lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!countries.length)return null;
  const rad=Math.PI/180;
  const dist=c=>{const p1=lat*rad,p2=c.lat*rad,dlat=(c.lat-lat)*rad,dlon=(c.lon-lon)*rad;
    const q=Math.sin(dlat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dlon/2)**2;return 2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));};
  return countries.reduce((a,b)=>dist(a)<=dist(b)?a:b);
}
export function localOffsetTime(now,zone){
  const found=/UTC([+-])(\d{1,2}):(\d{2})/.exec(zone||"");
  if(!found)return "—:—";
  const minutes=(Number(found[2])*60+Number(found[3]))*(found[1]==="-"?-1:1);
  const adjusted=new Date(now.getTime()+minutes*60000);
  return String(adjusted.getUTCHours()).padStart(2,"0")+":"+String(adjusted.getUTCMinutes()).padStart(2,"0");
}
export function randomInt(max,random=Math.random){return Math.min(max-1,Math.floor(random()*max));}
export function chooseQuiz(countries,random=Math.random){
  const valid=countries.filter(c=>c.capital&&c.capital!=="—"&&c.name);
  if(valid.length<4)return null;
  const correct=valid[randomInt(valid.length,random)];
  const shuffled=[correct,...valid.filter(c=>c.alpha2Code!==correct.alpha2Code).sort(()=>random()-.5).slice(0,3)];
  const options=shuffled.map(c=>c.name);
  for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  return {capital:correct.capital,answer:correct.name,options};
}
export function currencyCode(country){return country?.currencies?.[0]?.code||"CHF";}
export function countryByCode(countries,code){return countries.find(c=>c.alpha2Code===String(code).toUpperCase());}
export function upcomingHolidays(raw,now=new Date(),n=3){
  if(!Array.isArray(raw))return [];
  const current=now.toISOString().slice(0,10);
  return raw.filter(h=>h?.date>=current&&(!h.types&&!h.holidayTypes||h.types?.includes("Public")||h.holidayTypes?.includes("Public")))
   .sort((a,b)=>a.date.localeCompare(b.date)).slice(0,n);
}
export function parseJpl(raw){
  if(!Array.isArray(raw?.fields)||!Array.isArray(raw?.data))return [];
  const index=name=>raw.fields.indexOf(name),get=(arr,key)=>arr[index(key)];
  return raw.data.map(arr=>({name:String(get(arr,"des")||"Unbekannt"),date:String(get(arr,"cd")||""),au:Number(get(arr,"dist")),speed:Number(get(arr,"v_rel"))})).filter(a=>Number.isFinite(a.au)).slice(0,5);
}
export function parseJourney(raw){
  if(!Array.isArray(raw?.itineraries))return [];
  return raw.itineraries.filter(t=>t?.startTime&&t?.endTime).slice(0,3).map(t=>({
    start:t.startTime,end:t.endTime,
    durationMinutes:Math.round((Number(t.duration)|| (new Date(t.endTime)-new Date(t.startTime))/1000)/60),
    transfers:Number.isFinite(t.transfers)?t.transfers:null,
    legs:(t.legs||[]).map(l=>({mode:l.mode||"",name:l.routeShortName||l.route?.shortName||l.route?.name||"",from:l.from?.name||"",to:l.to?.name||""}))
  }));
}
export function formatClock(iso){return new Intl.DateTimeFormat("de-CH",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));}
export const musicUrl=code=>"https://rss.marketingtools.apple.com/api/v2/"+String(code).toLowerCase()+"/music/most-played/10/songs.json";
export function travelUrl(from,to){
  if(!from||!to)throw new Error("Start und Ziel fehlen");
  return "https://api.transitous.org/api/v6/plan?"+new URLSearchParams({fromPlace:from.lat+","+from.lon,toPlace:to.lat+","+to.lon,radius:"1000",numItineraries:"3"});
}
export function escapeLink(value){
  try{const u=new URL(value);return u.protocol==="https:"?u.href:null;}catch{return null;}
}
