// Natural Earth / world-atlas 110m TopoJSON -> GeoJSON. No extra JS library.
// Country ids in the public topology use ISO 3166-1 numeric codes.
export function topologyFeatures(topology) {
  if (!topology || topology.type !== "Topology" || !Array.isArray(topology.arcs) ||
      !Array.isArray(topology.objects?.countries?.geometries)) throw new TypeError("Ungültige Kartengeometrie");
  const {scale=[1,1],translate=[0,0]}=topology.transform||{};
  const cache=new Map();
  function arc(i){
    const id=i<0?~i:i;
    if(id<0||id>=topology.arcs.length)throw new RangeError("Unbekannter Kartenabschnitt");
    let line=cache.get(id);
    if(!line){
      let x=0,y=0;
      line=topology.arcs[id].map(([dx,dy])=>{
        x+=dx;y+=dy;
        return [x*scale[0]+translate[0],y*scale[1]+translate[1]];
      });
      cache.set(id,line);
    }
    return i<0?[...line].reverse():line;
  }
  function ring(indices){
    const line=[];
    indices.forEach((id,index)=>line.push(...(index?arc(id).slice(1):arc(id))));
    return line;
  }
  return topology.objects.countries.geometries
    .filter(g=>g.type==="Polygon"||g.type==="MultiPolygon")
    .map(g=>({
      type:"Feature",id:String(g.id??""),
      properties:{...(g.properties||{}),numericCode:String(g.id??"").padStart(3,"0")},
      geometry:{type:g.type,coordinates:g.type==="Polygon"
        ?g.arcs.map(ring):g.arcs.map(poly=>poly.map(ring))}
    }));
}
export function countryForFeature(feature,countries){
  const id=String(feature?.properties?.numericCode||feature?.id||"").padStart(3,"0");
  const byCode=countries.find(c=>c.numericCode&&String(c.numericCode).padStart(3,"0")===id);
  if(byCode)return byCode;
  const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return countries.find(c=>norm(c.name)===norm(feature?.properties?.name))||null;
}
export function pointFromEonet(event){
  const list=Array.isArray(event?.geometry)?event.geometry:[];
  for(let i=list.length-1;i>=0;i--){
    const g=list[i],p=g.coordinates;
    if(g.type==="Point"&&Array.isArray(p)&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&
      Math.abs(Number(p[1]))<=90&&Math.abs(Number(p[0]))<=180){
      return {lat:Number(p[1]),lon:Number(p[0])};
    }
  }
  return null;
}
export function earthquakePoints(features,limit=140){
  if(!Array.isArray(features))return [];
  return features.slice(0,limit).map(f=>{
    const p=f?.geometry?.coordinates,lat=Number(p?.[1]),lon=Number(p?.[0]);
    const magnitude=f?.properties?.mag;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {lat,lon,mag:Number.isFinite(magnitude)?magnitude:null,
      name:String(f?.properties?.place||"Erdbeben"),
      when:f?.properties?.time||null,url:f?.properties?.url||null};
  }).filter(Boolean);
}
