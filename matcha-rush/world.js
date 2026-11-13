import * as THREE from "three";
import { LANES } from "./logic.mjs";
import { sign } from "./models.js";

const standard=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.94,metalness:0,flatShading:true,...extra});
const flat=(c)=>new THREE.MeshBasicMaterial({color:c});
const MAT={
  road:standard("#809f94"),rail:standard("#4b7771",{metalness:.22,roughness:.44}),
  sleeper:standard("#52796e"),cream:standard("#e8e5ce"),light:standard("#f6ecd8"),
  paving:standard("#b8c9ae"),soil:standard("#87b58f"),jade:standard("#699a81"),
  dark:standard("#2d5c58"),tree:standard("#7ba981"),tree2:standard("#9fbc7d"),
  bark:standard("#8b8668"),amber:standard("#eacb9b"),accent:standard("#edb9a6"),
  glass:standard("#78b5ac"), mint:standard("#bad9a5")
};
const BUILDINGS=["#e1baa7","#9cc1b5","#e9ceac","#b1c9c0","#d0a8ac","#a8bac3","#e7debc"];
function random(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
const add=(parent,geometry,material,x=0,y=0,z=0)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const box=(p,w,h,d,m,x=0,y=0,z=0)=>add(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(p,a,b,h,n,m,x=0,y=0,z=0)=>add(p,new THREE.CylinderGeometry(a,b,h,n),m,x,y,z);
const orb=(p,r,m,x=0,y=0,z=0)=>add(p,new THREE.IcosahedronGeometry(r,0),m,x,y,z);
function tree(parent,x,z,rng){
  const tall=2+rng()*1.9;
  cyl(parent,.14,.21,tall,6,MAT.bark,x,tall/2,z);
  const leaf=rng()<.52?MAT.tree:MAT.tree2;
  cyl(parent,.08,1.17,2.65,6,leaf,x,tall+1.10,z);
  cyl(parent,.06,.72,1.27,5,MAT.mint,x,tall+2.25,z);
}
function window(parent,x,y,z){
  box(parent,.95,1.07,.07,MAT.glass,x,y,z);
  box(parent,.96,.11,.11,MAT.light,x,y-.57,z+.035);
}
function building(parent,side,z,rng){
  const w=4+rng()*3.7,h=7+rng()*12,d=5+rng()*3.2;
  const x=side*(9.2+w*.5+rng()*2.6);
  const color=standard(BUILDINGS[Math.floor(rng()*BUILDINGS.length)]);
  box(parent,w,h,d,color,x,h/2,z);
  box(parent,w+.4,.27,d+.4,MAT.cream,x,h+.08,z);
  for(let floor=1;floor<Math.floor(h/2.9);floor++)for(let col=0;col<Math.min(3,Math.floor(w/1.5));col++){
    const wx=x-w/2+.9+col*1.62;
    window(parent,wx,floor*2.9+.75,z+d/2+.045);
  }
  box(parent,w+.08,.21,d+.10,MAT.dark,x,.2,z);
  // Occasional branded matcha café sign.
  if(rng()<.23){
    const label=sign(rng()<.5?"MATCHA BAR":"VANILLA",3.3,.69,"#367c62","#f7ffdf");
    label.position.set(x,3.35,z+d/2+.09);parent.add(label);
  }
}
function lamppost(parent,x,z){
  cyl(parent,.075,.09,4.65,6,MAT.dark,x,2.33,z);
  box(parent,.94,.15,.33,MAT.dark,x,4.66,z);
  orb(parent,.25,MAT.light,x,4.49,z);
}
function tile(index,rng){
  const group=new THREE.Group();
  const length=14;
  box(group,10.9,.16,length,MAT.road,0,-.08,0);
  for(const side of [-1,1]){
    box(group,3.18,.21,length,MAT.paving,side*7.02,-.045,0);
    box(group,.12,.27,length,MAT.dark,side*5.52,.015,0);
    if(index%2===0){
      tree(group,side*7.9,-2.8,rng);
      lamppost(group,side*5.95,3.1);
    }
    if(index%2===1) building(group,side,0,rng);
  }
  // Three separate physical rail lanes (not 2D painted road lines).
  for(const lane of LANES){
    for(const offset of [-.96,.96]){
      box(group,.09,.10,length,MAT.rail,lane+offset,.095,0);
      box(group,.15,.055,length,MAT.light,lane+offset,.16,0);
    }
    for(let z=-6.5;z<7;z+=1.85)
      box(group,2.45,.10,.26,MAT.sleeper,lane,.035,z);
  }
  // White cross-markers reinforce movement and perspective.
  if(index%3===0)for(const lane of LANES)
    box(group,.65,.025,.16,MAT.light,lane,.163,-5.0);
  return group;
}
function cloud(parent,x,y,z,scale){
  const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  for(let i=0;i<3;i++)orb(g,2-i*.3,MAT.light,i*1.35,Math.sin(i)*.4,0);
}
export function createEnvironment(scene){
  const rng=random(344728);
  const root=new THREE.Group();scene.add(root);
  const ground=box(root,250,.1,260,MAT.soil,0,-.19,-28);
  const chunks=[];
  for(let i=0;i<12;i++){
    const segment=tile(i,rng);
    segment.position.z=31-i*14;
    root.add(segment);chunks.push(segment);
  }
  // Skyline visible above the forest. This never interferes with lane collisions.
  const skyline=new THREE.Group();root.add(skyline);
  const distant=["#8fb4a6","#97b3ad","#c5c6b0","#9cbaa8"];
  for(let i=0;i<28;i++){
    const s=i%2?-1:1;
    const x=s*(27+rng()*24),z=-35-rng()*95,h=15+rng()*34;
    box(skyline,5+rng()*9,h,7+rng()*9,standard(distant[i%4]),x,h/2-1,z);
  }
  for(let i=0;i<10;i++)
    cloud(root,(rng()-.5)*120,20+rng()*20,-10-rng()*110,.65+rng()*1.3);
  // Starting arch. Side of the path, no blocking geometry across lanes.
  const arch=new THREE.Group();arch.position.set(0,0,19);root.add(arch);
  for(const side of [-1,1])cyl(arch,.22,.27,8,8,MAT.dark,side*5.42,4,0);
  box(arch,11.6,.78,.9,MAT.dark,0,7.74,0);
  const board=sign("MATCHA RUSH",8.4,.92,"#2e7c64","#fffae1");
  board.position.set(0,7.77,.55);arch.add(board);
  for(let i=-3;i<=3;i++)orb(arch,.12,MAT.amber,i*1.45,7.7,1.09);

  return {
    root,chunks,ground,
    update(dt,speed){
      const delta=dt*speed;
      for(const chunk of chunks){
        chunk.position.z+=delta;
        if(chunk.position.z>44){
          const farthest=Math.min(...chunks.map(c=>c.position.z));
          chunk.position.z=farthest-14;
        }
      }
    },
    dispose(){
      scene.remove(root);
      root.traverse(obj=>{
        obj.geometry?.dispose();
        if(obj.material){
          const materials=Array.isArray(obj.material)?obj.material:[obj.material];
          // Shared material instances live at module scope; Three.js can re-upload.
          for(const m of materials){m.map?.dispose();}
        }
      });
    }
  };
}
