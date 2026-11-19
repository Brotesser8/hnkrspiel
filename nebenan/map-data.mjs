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


// Browser-independent hit-testing. Keeps country selection usable if Leaflet's Canvas
// rendering or pointer target fails; clicks in the sea do not select a nearby centroid.
function inRing(lng,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if(((a[1]>lat)!==(b[1]>lat)) &&
       lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function inPolygon(lng,lat,coordinates){
  if(!Array.isArray(coordinates)||!coordinates.length||!inRing(lng,lat,coordinates[0]))return false;
  return !coordinates.slice(1).some(hole=>inRing(lng,lat,hole));
}
export function countryFeatureAt(lat,lng,features){
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||!Array.isArray(features))return null;
  // Normalise wrapped longitudes into the GeoJSON reference world.
  const longitude=((lng+180)%360+360)%360-180;
  for(const feature of features){
    const geo=feature?.geometry;
    if(geo?.type==="Polygon" && inPolygon(longitude,lat,geo.coordinates))return feature;
    if(geo?.type==="MultiPolygon" && geo.coordinates.some(poly=>inPolygon(longitude,lat,poly)))return feature;
  }
  return null;
}

/**
 * Return map-only polygons without edges that jump across the 180th meridian.
 * TopoJSON rings are used untouched for country hit testing. At the map layer
 * we unwrap neighboring longitudes to the shortest continuous path, preventing
 * Russia and Fiji from painting false horizontal bands across the whole world.
 */
export function featuresForLeaflet(features){
  if(!Array.isArray(features))return [];
  function unwrapRing(points,anchor){
    if(!Array.isArray(points)||!points.length)return [];
    let offset=0,previous=points[0][0];
    const unwrapped=points.map((p,i)=>{
      const lng=p[0];
      if(i){
        const difference=lng+offset-previous;
        if(difference>180)offset-=360;
        else if(difference< -180)offset+=360;
      }
      previous=lng+offset;
      return [previous,p[1]];
    });
    const lonValues=unwrapped.map(p=>p[0]);
    const middle=(Math.min(...lonValues)+Math.max(...lonValues))/2;
    const translation=360*Math.round((anchor-middle)/360);
    return translation?unwrapped.map(p=>[p[0]+translation,p[1]]):unwrapped;
  }
  return features.map(feature=>{
    const geom=feature.geometry;
    if(!geom||!["Polygon","MultiPolygon"].includes(geom.type))return feature;
    const name=feature.properties?.name;
    const anchor=name==="Russia"?100:name==="Fiji"?179:0;
    const coordinates=geom.type==="Polygon"
      ?geom.coordinates.map(ring=>unwrapRing(ring,anchor))
      :geom.coordinates.map(poly=>poly.map(ring=>unwrapRing(ring,anchor)));
    return {...feature,geometry:{...geom,coordinates}};
  });
}
