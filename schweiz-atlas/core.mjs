// Pure geometry and format helpers shared by the UI and tests.
export const PRESETS = Object.freeze({
  zuerich:{name:"Zürich",lat:47.3769,lng:8.5417,subtitle:"Stadt Zürich"},
  bern:{name:"Bern",lat:46.9480,lng:7.4474,subtitle:"Stadt Bern"},
  basel:{name:"Basel",lat:47.5596,lng:7.5886,subtitle:"Stadt Basel"},
  genf:{name:"Genf",lat:46.2044,lng:6.1432,subtitle:"Stadt Genf"},
  lausanne:{name:"Lausanne",lat:46.5197,lng:6.6323,subtitle:"Stadt Lausanne"},
  luzern:{name:"Luzern",lat:47.0502,lng:8.3093,subtitle:"Stadt Luzern"},
  lugano:{name:"Lugano",lat:46.0037,lng:8.9511,subtitle:"Stadt Lugano"},
  stgallen:{name:"St. Gallen",lat:47.4245,lng:9.3767,subtitle:"Stadt St. Gallen"},
  davos:{name:"Davos",lat:46.8027,lng:9.8360,subtitle:"Graubünden"},
  zermatt:{name:"Zermatt",lat:46.0207,lng:7.7491,subtitle:"Wallis"}
});
export const swissMapBounds = [[45.7,5.8],[47.95,10.65]];
export function insideSwissMapBounds(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=45.7&&lat<=47.95&&lng>=5.8&&lng<=10.65;}
export function toLV95(lat,lng){
  if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new TypeError("Koordinaten fehlen");
  // Swiss federal approximation WGS84 -> CH1903+ (LV95), suitable for map exploration.
  const phi=(lat*3600-169028.66)/10000,lam=(lng*3600-26782.5)/10000;
  const e=2600072.37+211455.93*lam-10938.51*lam*phi-0.36*lam*phi**2-44.54*lam**3;
  const n=1200147.07+308807.95*phi+3745.25*lam**2+76.63*phi**2-194.56*lam**2*phi+119.79*phi**3;
  return {e:Math.round(e),n:Math.round(n)};
}
export function heightUrl(lat,lng){const {e,n}=toLV95(lat,lng);return "https://api3.geo.admin.ch/rest/services/height?"+new URLSearchParams({easting:e,northing:n,sr:2056});}
export function profileUrl(first,second){
  const a=toLV95(first.lat,first.lng),b=toLV95(second.lat,second.lng);
  const geom={type:"LineString",coordinates:[[a.e,a.n],[b.e,b.n]]};
  return "https://api3.geo.admin.ch/rest/services/profile.json?"+new URLSearchParams({geom:JSON.stringify(geom),sr:2056,nb_points:90});
}
export function geoAdminMapUrl(lat,lng,layer=""){
  const {e,n}=toLV95(lat,lng);
  const params=new URLSearchParams({lang:"de",center:e+","+n,z:"8",crosshair:"marker,"+e+","+n});
  if(layer){params.set("layers",layer);params.set("topic",layer.includes("geologie")?"geol":"swisstopo");}
  return "https://map.geo.admin.ch/#/map?"+params.toString();
}
export function fmtDate(iso){return new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso.length===10?iso+"T12:00:00":iso));}
export function fmtNum(num){return new Intl.NumberFormat("de-CH",{maximumFractionDigits:0}).format(num);}
export function cleanLabel(html){return String(html??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}
export function profilePoints(data){
  if(!Array.isArray(data))return [];
  return data.map(item=>({dist:Number(item.dist),height:Number(item.alts?.COMB??item.alts?.DTM2??item.alts?.DTM25)})).filter(p=>Number.isFinite(p.dist)&&Number.isFinite(p.height));
}
export function nextHolidays(items,today=new Date(),limit=3){
  const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
  return items.filter(h=>h?.date&&new Date(h.date+"T12:00:00").getTime()>=start && (!h.holidayTypes||h.holidayTypes.includes("Public"))).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,limit);
}
