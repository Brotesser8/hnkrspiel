import {toLV95,heightUrl,profileUrl} from "./core.mjs";
const CACHE=new Map();
const FRESH_MS=12*60*1000;
export async function json(url,{refresh=false}={}){
  const old=CACHE.get(url);
  if(!refresh&&old&&Date.now()-old.time<FRESH_MS)return old.data;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),11500);
  try{
    const response=await fetch(url,{headers:{Accept:"application/json"},signal:controller.signal});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const result=await response.json();
    CACHE.set(url,{data:result,time:Date.now()});
    return result;
  } finally {clearTimeout(timer);}
}
export async function getHeight(lat,lng,refresh=false){
  const raw=await json(heightUrl(lat,lng),{refresh});
  const value=Number(raw?.height);
  if(!Number.isFinite(value))throw new Error("Keine Höhenangabe");
  return value;
}
export async function getProfile(a,b){return json(profileUrl(a,b),{refresh:true});}
export async function findPlace(query){
  const text=query.trim().split(/\s+/).slice(0,10).join(" ");
  if(text.length<2)throw new Error("Bitte mindestens zwei Zeichen eingeben.");
  const params=new URLSearchParams({searchText:text,type:"locations",origins:"gg25,zipcode,gazetteer,address",limit:"8"});
  const data=await json("https://api3.geo.admin.ch/rest/services/ech/SearchServer?"+params,{refresh:true});
  const found=(data.results||[]).find(i=>Number.isFinite(Number(i.attrs?.lat))&&Number.isFinite(Number(i.attrs?.lon)));
  if(!found)throw new Error("Kein Schweizer Ort gefunden.");
  return found.attrs;
}
export async function getQuakes(refresh=false){
  const today=new Date(),begin=new Date(today.getTime()-365*24*60*60*1000);
  const query=new URLSearchParams({format:"geojson",starttime:begin.toISOString().slice(0,10),minlatitude:"45.7",maxlatitude:"48.1",minlongitude:"5.7",maxlongitude:"10.8",orderby:"time",limit:"35"});
  const data=await json("https://earthquake.usgs.gov/fdsnws/event/1/query?"+query,{refresh});
  if(!Array.isArray(data?.features))throw new Error("Erdbebenantwort unvollständig");
  return data.features;
}
export async function getNature(lat,lng,refresh=false){
  const params=new URLSearchParams({country:"CH",hasCoordinate:"true",occurrenceStatus:"PRESENT",decimalLatitude:(lat-.14).toFixed(4)+","+(lat+.14).toFixed(4),decimalLongitude:(lng-.19).toFixed(4)+","+(lng+.19).toFixed(4),limit:"8"});
  const data=await json("https://api.gbif.org/v1/occurrence/search?"+params,{refresh});
  if(!Array.isArray(data?.results))throw new Error("Beobachtungsantwort unvollständig");
  return data.results;
}
export async function getWiki(lat,lng,refresh=false){
  const params=new URLSearchParams({action:"query",generator:"geosearch",ggscoord:lat.toFixed(5)+"|"+lng.toFixed(5),ggsradius:"10000",ggslimit:"1",ggsnamespace:"0",prop:"extracts|info",inprop:"url",exintro:"1",explaintext:"1",exchars:"700",format:"json",origin:"*"});
  const result=await json("https://de.wikipedia.org/w/api.php?"+params,{refresh});
  return Object.values(result?.query?.pages||{})[0]||null;
}
export async function getPopulation(refresh=false){
  const year=new Date().getFullYear();
  const params=new URLSearchParams({format:"json",date:(year-8)+":"+year,per_page:"12"});
  const raw=await json("https://api.worldbank.org/v2/country/CHE/indicator/SP.POP.TOTL?"+params,{refresh});
  if(!Array.isArray(raw)||!Array.isArray(raw[1]))throw new Error("Statistikantwort unvollständig");
  const valid=raw[1].find(item=>typeof item.value==="number"&&item.value>0);
  if(!valid)throw new Error("Kein veröffentlichter Messwert");
  return {year:valid.date,value:valid.value};
}
export async function getHolidays(refresh=false){
  const year=new Date().getFullYear();
  const a=await json("https://nagerholidays.com/api/v4/Holidays/CH/"+year,{refresh});
  if(!Array.isArray(a))throw new Error("Feiertagsantwort unvollständig");
  const upcoming=a.filter(h=>h.date>=new Date().toISOString().slice(0,10));
  if(upcoming.length>=3)return a;
  const b=await json("https://nagerholidays.com/api/v4/Holidays/CH/"+(year+1),{refresh});
  return a.concat(Array.isArray(b)?b:[]);
}
// Layer URLs and licenses follow the Swiss federal GeoAdmin service documentation.
export const SWISS_TILES={
 map:"https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
 aerial:"https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"
};
export const WMS_LAYERS={
 geology:"ch.swisstopo.geologie-generalkarte-ggk200",
 landscape:"ch.bafu.bundesinventare-bln"
};
export function makeSolarLink(lat,lng){
  const {e,n}=toLV95(lat,lng);
  const q=new URLSearchParams({lang:"de",center:e+","+n,z:"9",layers:"ch.bfe.solarenergie-eignung-daecher"});
  return "https://map.geo.admin.ch/#/map?"+q;
}
