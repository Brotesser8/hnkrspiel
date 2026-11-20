// No-key, browser-side API client; caching, timeouts and in-flight deduplication.
const cache=new Map(),pending=new Map();
export async function request(url,{ttl=900000,force=false,timeout=14000}={}){
 const hit=cache.get(url);
 if(!force&&hit&&Date.now()-hit.t<ttl)return hit.data;
 if(pending.has(url))return pending.get(url);
 const p=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!response.ok)throw Error("Datenquelle HTTP "+response.status);const data=await response.json();cache.set(url,{t:Date.now(),data});return data;}
  finally{clearTimeout(timer);}
 })();
 pending.set(url,p);try{return await p;}finally{if(pending.get(url)===p)pending.delete(url);}
}
const params=o=>new URLSearchParams(o).toString();
export const api={
 weather(c){return request("https://api.open-meteo.com/v1/forecast?"+params({latitude:c.lat,longitude:c.lon,current:"temperature_2m,weather_code,is_day,wind_speed_10m,precipitation",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",timezone:c.timezone||"auto",forecast_days:6}),{ttl:1200000})},
 air(c){return request("https://air-quality-api.open-meteo.com/v1/air-quality?"+params({latitude:c.lat,longitude:c.lon,current:"european_aqi",timezone:c.timezone||"auto"}),{ttl:2100000})},
 geocode(term){const name=String(term).trim();if(name.length<2)throw Error("Bitte mindestens zwei Zeichen eingeben");return request("https://geocoding-api.open-meteo.com/v1/search?"+params({name,count:6,language:"de",format:"json"}),{ttl:86400000})},
 holiday(code){if(!/^[A-Z]{2}$/.test(code))throw Error("Kein gültiger Ländercode");return request("https://date.nager.at/api/v3/NextPublicHolidays/"+code,{ttl:43200000})},
 artworks(q,page=1){return request("https://api.artic.edu/api/v1/artworks/search?"+params({q,"query[term][is_public_domain]":"true",fields:"id,title,artist_display,date_display,image_id,is_public_domain,thumbnail",limit:40,page}),{ttl:2700000})},
 books(q){return request("https://openlibrary.org/search.json?"+params({q:String(q).slice(0,100),fields:"key,title,author_name,first_publish_year,cover_i,edition_count",limit:20}),{ttl:1800000})},
 quakes(force=false){return request("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",{ttl:300000,force})},
 events(force=false){return request("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=40",{ttl:1500000,force})},
 charts(region){if(!/^[a-z]{2}$/.test(region))throw Error("Region ungültig");return request("https://rss.marketingtools.apple.com/api/v2/"+region+"/music/most-played/10/songs.json",{ttl:3600000})},
 pokemon(id){if(!Number.isInteger(id)||id<1||id>1025)throw Error("Pokémon ungültig");return request("https://pokeapi.co/api/v2/pokemon/"+id,{ttl:86400000})},
 dog(){return request("https://dog.ceo/api/breeds/image/random",{ttl:0,force:true})}
};
