import test from "node:test";
import assert from "node:assert/strict";
import {topologyFeatures,countryForFeature,earthquakePoints,pointFromEonet} from "../map-data.mjs";
import {COUNTRY_DEFAULTS,normalizeCountries} from "../core.mjs";

const simpleTopology={
 type:"Topology",
 arcs:[
   [[5.5,45.5],[5,0],[0,2.5],[-5,0],[0,-2.5]],
   [[128,30],[18,0],[0,16],[-18,0],[0,-16]]
 ],
 objects:{countries:{type:"GeometryCollection",geometries:[
   {id:"756",type:"Polygon",arcs:[[0]],properties:{name:"Switzerland"}},
   {id:"392",type:"Polygon",arcs:[[1]],properties:{name:"Japan"}}
 ]}}
};
test("TopoJSON produces closed country polygons with stable ISO numeric identifiers",()=>{
  const features=topologyFeatures(simpleTopology);
  assert.equal(features.length,2);
  assert.equal(features[0].properties.numericCode,"756");
  assert.deepEqual(features[0].geometry.coordinates[0][0],[5.5,45.5]);
  assert.deepEqual(features[0].geometry.coordinates[0].at(-1),[5.5,45.5]);
  const countries=normalizeCountries(COUNTRY_DEFAULTS);
  assert.equal(countryForFeature(features[0],countries)?.alpha2Code,"CH");
  assert.equal(countryForFeature(features[1],countries)?.alpha2Code,"JP");
});
test("TopoJSON reversed arcs and transforms decode without another dependency",()=>{
  const raw={type:"Topology",transform:{scale:[.1,.1],translate:[10,20]},
    arcs:[[[0,0],[10,0],[0,10]]],objects:{countries:{geometries:[{
      id:"040",type:"Polygon",arcs:[[-1]],properties:{name:"Austria"}
    }]}}};
  const output=topologyFeatures(raw)[0].geometry.coordinates[0];
  assert.deepEqual(output,[[11,21],[11,20],[10,20]]);
});
test("invalid topology fails explicitly instead of silently selecting a random country",()=>{
  assert.throws(()=>topologyFeatures(null),TypeError);
  assert.throws(()=>topologyFeatures({arcs:[]}),TypeError);
  assert.equal(countryForFeature({id:"999"},normalizeCountries(COUNTRY_DEFAULTS)),null);
});
test("USGS events are validated and capped to protect map responsiveness",()=>{
  const raw=[{geometry:{coordinates:[8,46,10]},properties:{place:"Bei Zürich",mag:2.7,time:123,url:"https://earthquake.usgs.gov/x"}},
   {geometry:{coordinates:[400,45]},properties:{mag:4}},
   {geometry:{coordinates:[4,90]},properties:{mag:3}}];
  const valid=earthquakePoints(raw,2);
  assert.equal(valid.length,1);
  assert.equal(valid[0].mag,2.7);
  assert.equal(valid[0].name,"Bei Zürich");
});
test("NASA EONET picks latest real Point geometry, not an arbitrary polygon",()=>{
  assert.deepEqual(pointFromEonet({geometry:[{type:"Point",coordinates:[8,47]}]}),{lat:47,lon:8});
  assert.equal(pointFromEonet({geometry:[{type:"Polygon",coordinates:[[[8,47]]]}]}),null);
});
