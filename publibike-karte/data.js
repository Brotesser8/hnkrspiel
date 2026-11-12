/* Live PubliBike / Velospot data adapter. Unknown counts remain null. */
(function(root){
'use strict';
const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&x!=='');
const num=x=>(x!==undefined&&x!==null&&x!==''&&Number.isFinite(Number(x)))?Number(x):null;
const qty=x=>{const n=num(x);return n===null||n<0?null:Math.floor(n)};
const str=x=>x===null||x===undefined?'':String(x);
const prop=(o,keys)=>keys.map(k=>o?.[k]).find(x=>x!==undefined&&x!==null&&x!=='');
function isEBike(v){const type=v?.type||{};const name=[type?.name,typeof type==='string'?type:'',v?.vehicleType,v?.vehicle_type,v?.category].join(' ').toLowerCase();return type?.id===2||/e[\s_-]?bike|electric|elektro|pedelec|e-velo/i.test(name)||v?.ebike_battery_level!=null}
function counts(s){
const a=first(s?.vehicles,s?.availability?.vehicles,s?.availableVehicles);
if(Array.isArray(a)){const v=a.filter(x=>x?.is_available!==false&&x?.isAvailable!==false&&x?.available!==false&&x?.status!=='unavailable');const e=v.filter(isEBike).length;return{total:v.length,regular:v.length-e,ebikes:e}}
const src=s?.availability&&typeof s.availability==='object'?s.availability:s;
const e=qty(first(prop(src,['totalElectricalBike','num_ebikes_available','availableEBikes','availableEbikes','ebikes','eBikes','electricBikes']),s?.counts?.ebikes));
const t=qty(first(prop(src,['totalBike','num_bikes_available','total','availableBikes','bikesAvailable','numberOfAvailableBikes','vehiclesAvailable','totalVehicles']),typeof a==='number'?a:null,s?.counts?.total));
const r=qty(first(prop(src,['totalNonElectricalBike','regularBikes','num_classic_bikes_available','availableNormalBikes','regular_bikes','bikes']),s?.counts?.regular));
return{total:t!==null?t:r!==null&&e!==null?r+e:r,regular:t!==null&&e!==null?Math.max(0,t-e):r,ebikes:e};
}
function coordinate(s){
const l=s?.location||s?.position||s?.coordinate||{};
let lat=num(first(s?.lat,s?.latitude,l?.lat,l?.latitude,l?.y));
let lon=num(first(s?.lng,s?.longitude,s?.lon,l?.lng,l?.longitude,l?.lon,l?.x));
const g=s?.geometry?.coordinates||(Array.isArray(l)?l:null);
if((lat===null||lon===null)&&Array.isArray(g)){const a=num(g[0]),b=num(g[1]);if(a>=5&&a<=12&&b>=45&&b<=49){lon=a;lat=b}else if(a>=45&&a<=49&&b>=5&&b<=12){lat=a;lon=b}}
return lat>=45&&lat<=49&&lon>=5&&lon<=12?{lat,lon}:null;
}
function station(s,network,i){
if(!s||typeof s!=='object')return null;
const o=s?.properties&&typeof s.properties==='object'?{...s.properties,geometry:s.geometry}:s;
const p=coordinate(o);if(!p)return null;
const id=str(first(o.id,o.station_id,o.stationId,o.stationCode,i));
const c=counts(o);
return{id:network+':'+id,name:str(first(o.name,o.station_name,o.stationName,o.title,'Station '+id)),city:str(first(o.city,o.locality,o.municipality,o.place,'')),address:str(first(typeof o.address==='string'?o.address:null,o.station_address,o.address?.street,o.street,'')),postal:str(first(o.zip,o.postalCode,'')),network:network,lat:p.lat,lon:p.lon,total:c.total,regular:c.regular,ebikes:c.ebikes,state:str(first(o.state?.name,o.state,o.status,''))};
}
function unwrap(x,depth=0){if(depth>6||x==null)return[];if(Array.isArray(x))return x;if(typeof x!=='object')return[];for(const key of ['stations','responseData','stationList','station_list','items','results','features','data','result']){if(Object.hasOwn(x,key)){const y=unwrap(x[key],depth+1);if(y.length)return y}}return[]}
function unique(arr){const map=new Map();for(const s of arr){const k=s.name.toLowerCase().trim()+'|'+s.lat.toFixed(5)+'|'+s.lon.toFixed(5);const old=map.get(k);if(!old||(old.total===null&&s.total!==null))map.set(k,s)}return Array.from(map.values())}
function normalizeAll(payload){
if(payload&&(payload.velospot||payload.publibike)){return unique([...unwrap(payload.velospot).map((s,i)=>station(s,'Velospot',i)),...unwrap(payload.publibike).map((s,i)=>station(s,'PubliBike',i))].filter(Boolean))}
return unique(unwrap(payload).map((s,i)=>station(s,'PubliBike',i)).filter(Boolean));
}
function normalizeGbfs(info,status){
const i=info?.data?.stations||info?.stations||[],s=status?.data?.stations||status?.stations||[];
const lookup=new Map(s.map(x=>[String(x.station_id),x]));
return unique(i.map((x,n)=>{const available=lookup.get(String(x.station_id));const t=available?.vehicle_types_available;let ebikes=null;if(Array.isArray(t)){ebikes=t.filter(v=>/ebike|e-bike|electric/i.test(String(v.vehicle_type_id))).reduce((sum,v)=>sum+(qty(v.count)||0),0)}return station({...x,id:x.station_id,availability:{total:available?.num_bikes_available,ebikes}},'GBFS',n)}).filter(Boolean));
}
const humanCount=x=>x===null||x===undefined?'–':new Intl.NumberFormat('de-CH').format(x);
const api={normalizeAll,normalizeGbfs,vehicleCounts:counts,normalizeStation:station,unwrapStations:unwrap,humanCount};
root.PubliBikeData=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);