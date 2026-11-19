import {musicUrl,travelUrl} from "./core.mjs";
const cache=new Map();
export async function request(url,{ttl=10*60*1000,force=false,timeout=13000}={}){
  const previous=cache.get(url);
  if(!force&&previous&&Date.now()-previous.at<ttl)return previous.data;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const resp=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});
    if(!resp.ok)throw new Error("HTTP "+resp.status);
    const data=await resp.json();
    cache.set(url,{at:Date.now(),data});
    return data;
  }finally{clearTimeout(timer);}
}
export async function countries(){
  const data=await request("https://countries.dev/countries",{ttl:24*60*60*1000,timeout:18000});
  if(!Array.isArray(data))throw new Error("Ungültige Länderdaten");
  return data;
}
export async function music(code){const data=await request(musicUrl(code),{ttl:60*60*1000});
  if(!Array.isArray(data?.feed?.results))throw new Error("Für dieses Land kein Musikfeed verfügbar");
  return data.feed.results.slice(0,6);
}
export async function holidays(code){
  const y=new Date().getFullYear();
  const a=await request("https://nagerholidays.com/api/v4/Holidays/"+code+"/"+y,{ttl:24*60*60*1000});
  if(!Array.isArray(a))throw new Error("Feiertagsdaten fehlen");
  const future=a.filter(h=>h.date>=new Date().toISOString().slice(0,10));
  if(future.length>=3)return a;
  const b=await request("https://nagerholidays.com/api/v4/Holidays/"+code+"/"+(y+1),{ttl:24*60*60*1000});
  return a.concat(Array.isArray(b)?b:[]);
}
export async function worldBank(iso3,indicator){
  if(!/^[A-Z]{3}$/.test(iso3))throw new Error("Kein ISO3 Code");
  const y=new Date().getFullYear();
  const data=await request("https://api.worldbank.org/v2/country/"+iso3+"/indicator/"+indicator+"?"+new URLSearchParams({format:"json",date:(y-7)+":"+y,per_page:"10"}),{ttl:24*60*60*1000});
  const good=Array.isArray(data?.[1])?data[1].find(v=>typeof v.value==="number"&&Number.isFinite(v.value)):null;
  return good?{value:good.value,year:good.date}:null;
}
export async function exchange(from,to){
  if(from===to)return {rate:1,date:new Date().toISOString().slice(0,10)};
  const data=await request("https://api.frankfurter.dev/v2/rate/"+encodeURIComponent(from)+"/"+encodeURIComponent(to),{ttl:60*60*1000});
  if(!Number.isFinite(data?.rate))throw new Error("Kein Referenzkurs");
  return data;
}
export async function quakes(range){
  const url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_"+(range==="week"?"week":"day")+".geojson";
  const data=await request(url,{ttl:5*60*1000});
  if(!Array.isArray(data?.features))throw new Error("Keine Erdbeben-Features");
  return data.features;
}
export async function nasaEvents(){
  const data=await request("https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30&limit=40",{ttl:30*60*1000});
  if(!Array.isArray(data?.events))throw new Error("Keine NASA Ereignisse");
  return data.events;
}
export async function asteroids(){
  const from=new Date(),to=new Date(from.getTime()+7*86400000);
  const params=new URLSearchParams({body:"Earth","date-min":from.toISOString().slice(0,10),"date-max":to.toISOString().slice(0,10),sort:"date",limit:"7"});
  return request("https://ssd-api.jpl.nasa.gov/cad.api?"+params,{ttl:6*60*60*1000});
}
export async function dog(){
  const data=await request("https://dog.ceo/api/breeds/image/random",{ttl:0,force:true});
  if(data?.status!=="success"||!/^https:\/\//.test(data.message))throw new Error("Kein Hundebild");
  return data.message;
}
export async function pokemon(index){
  const data=await request("https://pokeapi.co/api/v2/pokemon/"+index,{ttl:24*60*60*1000});
  if(!data?.name)throw new Error("Pokémon nicht gefunden");
  return {id:data.id,name:data.name,types:(data.types||[]).map(t=>t.type?.name).filter(Boolean),image:data.sprites?.other?.["official-artwork"]?.front_default||data.sprites?.front_default};
}
export async function journey(from,to){return request(travelUrl(from,to),{ttl:2*60*1000,timeout:23000});}
