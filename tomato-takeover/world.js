import * as THREE from "three";

const MAT = color => new THREE.MeshStandardMaterial({ color, roughness:.94, metalness:.02, flatShading:true });
const seedRandom = seed => () => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const palette = {
  city:["#d8a37b","#f7cbb0","#6f9ca9","#efbc78","#a6b4a2","#c58b8a","#a8b3d4"],
  festival:["#eea1ae","#f3bc79","#a5c5e0","#c4a2da","#70adb8"],
  summit:["#aabec3","#d6c3b6","#a7b1bb","#a2bfc1","#e7ccb8"]
};
export const CAMERA_HEIGHT = 1.7;
export const WORLD_BOUNDS = { minX:-32, maxX:32, minZ:-46, maxZ:22 };

function mesh(group, geo, color, x=0, y=0, z=0, rotationY=0) {
  const m = new THREE.Mesh(geo, typeof color === "string" ? MAT(color) : color);
  m.position.set(x,y,z);
  m.rotation.y = rotationY;
  m.castShadow = false;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
function box(parent, w,h,d,c,x=0,y=0,z=0) {
  return mesh(parent,new THREE.BoxGeometry(w,h,d),c,x,y,z);
}
function cylinder(parent,rTop,rBottom,height,sides,c,x=0,y=0,z=0) {
  return mesh(parent,new THREE.CylinderGeometry(rTop,rBottom,height,sides),c,x,y,z);
}
function plane(parent,w,h,c,x,y,z,rx=0) {
  const obj = mesh(parent,new THREE.PlaneGeometry(w,h),c,x,y,z);
  obj.rotation.x=rx;return obj;
}
function ball(parent,r,c,x=0,y=0,z=0,detail=0) {
  return mesh(parent,new THREE.DodecahedronGeometry(r,detail),c,x,y,z);
}
function shadow(parent,r=1.1) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r,16),new THREE.MeshBasicMaterial({color:"#132421",transparent:true,opacity:.2,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=.027;parent.add(m);return m;
}
function labelTexture(text, main="#ffffff", back="#182f36") {
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext("2d");
  if(!ctx)return null;
  ctx.fillStyle=back;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle="#ffffff40";ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);
  ctx.fillStyle=main;ctx.font="900 50px system-ui, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(text,256,66,480);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function sign(parent,text,x,y,z,w=6,h=1.45,color="#ffffff",background="#193c44") {
  const tex=labelTexture(text,color,background);
  if(!tex)return null;
  const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const board=mesh(parent,new THREE.PlaneGeometry(w,h),material,x,y,z);
  return board;
}
function tree(group,x,z,rng,night=false) {
  const height=2.15+rng()*1.6;
  cylinder(group,.17,.24,height,6,"#786453",x,height/2,z);
  const leaf=night?"#5b9d9a":(["#75ae7d","#5c9b7c","#8fb977","#548b82"][Math.floor(rng()*4)]);
  cylinder(group,.12,1.08,2.3,6,leaf,x,height+1,z);
  cylinder(group,.07,.75,1.2,5,"#98c28c",x,height+2.02,z);
  shadow(group,.9).position.set(x,.031,z);
}
function lamp(group,x,z,orange=false) {
  cylinder(group,.06,.09,4.6,6,"#425969",x,2.3,z);
  box(group,.7,.18,.3,"#293f48",x,4.6,z);
  const orb=ball(group,.23,orange?"#ffdda2":"#e3f8ca",x,4.47,z+.08);
  const glow=new THREE.PointLight(orange?0xffbd89:0xcaf6de,.42,8,2);
  glow.position.copy(orb.position);group.add(glow);
}
function windowGrid(group, x,y,z,w,h, rows,cols) {
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++) {
    const wx=x-w/2+(i+.5)*w/cols, wy=y-h/2+(j+.5)*h/rows;
    box(group,w/cols*.43,h/rows*.47,.06, (i+j)%3===0?"#ffe4a1":"#80bdc3",wx,wy,z);
  }
}
function building(group,x,z,w,d,h,color,rng) {
  const structure=box(group,w,h,d,color,x,h/2,z);
  box(group,w+.32,.3,d+.32,"#e9d2b0",x,h+.06,z);
  for(let floor=1;floor<Math.floor(h/3);floor++){
    for(let i=0;i<Math.min(4,Math.floor(w/2));i++){
      const pos=x-w/2+(i+.5)*w/Math.min(4,Math.floor(w/2));
      box(group,1.03,1.32,.06,"#467b88",pos,floor*3+1,z+d/2+.04);
      box(group,.94,.13,.085,"#e7c99b",pos,floor*3+1.7,z+d/2+.09);
    }
  }
  box(group,w+.45,.26,d+.4,["#315b66","#e8ac86","#314f57"][Math.floor(rng()*3)],x,1,z+d/2);
  shadow(group,Math.min(6,w*.5)).position.set(x,.03,z);
  return structure;
}
function car(group,x,z,color,rng) {
  const root=new THREE.Group();root.position.set(x,0,z);group.add(root);
  box(root,2.65,.73,1.35,color,0,.71,0);
  box(root,1.4,.7,1.2,"#99c6c9",-.14,1.28,0);
  for(const zOff of [-.7,.7])for(const xOff of [-.85,.9]){
    const wheel=cylinder(root,.3,.3,.13,8,"#30434a",xOff,.36,zOff);
    wheel.rotation.x=Math.PI/2;
  }
  box(root,.08,.28,.33,"#f7f0b0",1.36,.72,-.42);
  return root;
}
function makeNPC(group, x,z, options={}, rng=Math.random) {
  const c=options.color||["#ffad80","#81b1bc","#dda5ba","#b4c2a4","#f1c78d"][Math.floor(rng()*5)];
  const skin=options.skin||["#f1c29b","#c58163","#e4a67e","#f3d4ac","#9c6352"][Math.floor(rng()*5)];
  const hairColor=options.hair||["#2e3841","#6d3f32","#b58854","#45363c"][Math.floor(rng()*4)];
  const root=new THREE.Group();root.position.set(x,options.y||0,z);group.add(root);
  const body=new THREE.Group();root.add(body);
  const torso=cylinder(body,.39,.49,.78,5,c,0,1.1,0);
  box(body,.42,.08,.15,"#324148",0,.73,0);
  // Face and hair are placed on the +Z side (facing the player's spawn).
  const head=ball(body,.36,skin,0,1.76,0,1);
  const hair=cylinder(body,.35,.27,.17,7,hairColor,0,2.11,-.035);
  const hairFringe=box(body,.4,.1,.16,hairColor,-.015,2.04,.23);
  for(const side of [-1,1]) {
    ball(body,.036,"#243540",side*.128,1.795,.332);
  }
  box(body,.16,.03,.04,"#8f4c4d",0,1.625,.349);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.5,1.41,0);body.add(arm);
    cylinder(arm,.115,.11,.61,5,skin,side*.035,-.31,0);
    ball(arm,.13,skin,side*.04,-.64,.02);
    arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.23,.72,0);body.add(leg);
    cylinder(leg,.16,.14,.66,5,options.pants||"#344b65",0,-.33,0);
    box(leg,.27,.17,.39,"#334248",0,-.69,.11);
    legs.push(leg);
  }
  if(options.kind==="streamer"){
    const headphones=cylinder(body,.39,.39,.13,8,"#e2ff8c",0,1.94,0);
    ball(body,.13,"#b6f5e2",-.35,1.81,0);
  }
  if(options.kind==="singer") {
    cylinder(body,.4,.4,.08,7,"#f9db8e",0,2.22,0);
    box(body,.35,.65,.06,"#ffd8e7",0,1.15,.46);
    const mic=cylinder(body,.046,.05,.54,6,"#2d4450",.44,1.4,.34);mic.rotation.z=.32;
    ball(body,.1,"#c8dfe1",.55,1.69,.34);
  }
  if(options.kind==="president"){
    box(body,.12,.29,.1,"#cb4d62",0,1.3,.44);
    box(body,.14,.4,.12,"#dfe6ea",0,1.24,.35);
    box(body,.46,.07,.19,"#263947",0,2.13,0);
  }
  if(options.kind !== "civilian"){
    const label = options.kind==="singer"?"★ POP STAR":
      options.kind==="president"?"★ PRESIDENT":"★ STREAMER";
    sign(root,label,0,2.82,0,2.55,.62,"#152f35","#ffdf9a");
  }
  const s=shadow(root,.53);s.position.y=.02;
  const npc={
    root,body,arms,legs,x,z,baseX:x,baseZ:z,
    kind:options.kind||"civilian",
    name:options.name||["Alex","Sam","Jules","Robin","Kai","Toni","Mika","Noa","Luca"][Math.floor(rng()*9)],
    celebrity:options.kind && options.kind!=="civilian",
    color:c, phase:rng()*Math.PI*2, speed:options.static ? 0 : .9+rng()*.45,
    roam:options.static ? 0 : .6+rng()*2,
    stun:0, hitCount:0, y:options.y||0,
    isStationary:!!options.static
  };
  return npc;
}
function decorateSky(group, rng) {
  // Low-poly clouds as bright floating clusters; fixed world geometry.
  const cloudMat=MAT("#fff5df");
  for(let i=0;i<13;i++) {
    const x=(rng()-.5)*100, y=22+rng()*17,z=-25-rng()*60;
    const root=new THREE.Group();root.position.set(x,y,z);group.add(root);
    for(let j=0;j<3;j++) {
      const r=.9+rng()*2.1;
      ball(root,r,cloudMat,j*1.9,Math.sin(j)*.55,0,0);
    }
  }
}
function streetFurniture(group,rng){
  for(let z=-32;z<=14;z+=12){
    lamp(group,6.9,z);lamp(group,-6.9,z);
    tree(group,11.5,z+4,rng);tree(group,-11.5,z-4,rng);
  }
  for(let i=0;i<9;i++){
    box(group,1.3,.08,3.4,"#f5dfba",0,.09,-32+i*7);
  }
}
function createCity(group,rng,npcs,decor) {
  const road=box(group,12,.12,92,"#586d72",0,.03,-10);
  box(group,2.3,.18,92,"#b1b9aa",-7.05,.08,-10);
  box(group,2.3,.18,92,"#b1b9aa",7.05,.08,-10);
  box(group,.13,.11,92,"#e5caa1",-5.85,.14,-10);box(group,.13,.11,92,"#e5caa1",5.85,.14,-10);
  streetFurniture(group,rng);
  for(let s of [-1,1]){
    for(let i=0;i<6;i++){
      const z=-39+i*13, x=s*(19+rng()*4), height=8+rng()*10;
      building(group,x,z,9+rng()*4,9+rng()*2,height,palette.city[Math.floor(rng()*palette.city.length)],rng);
    }
  }
  sign(group,"SPLATSTREAM",14.6,7.2,-12,6,1.2,"#ffffff","#fd7290");
  sign(group,"TOMATO MARKET",-14.3,4.8,-11,5.2,1.1,"#163f3d","#e3f6a3");
  // News kiosk, tomato cart and metro stop
  box(group,4,.25,3,"#f4c182",-13.2,1.4,-10);box(group,3.7,2.25,2.8,"#5b9b93",-13.2,2.65,-10);
  for(let i=0;i<9;i++)ball(group,.22,"#fa654e",-14.2+(i%3)*.5,1.7,-8.8+Math.floor(i/3)*.4);
  box(group,4.5,.2,2.5,"#294d60",13.7,3.2,-16);
  for(const side of [-1,1])cylinder(group,.065,.065,3.1,6,"#536e7b",13.7+side*2,1.7,-16);
  sign(group,"M E T R O",13.7,3.17,-14.7,3.5,.65,"#e2fbdf","#225563");
  for(let i=0;i<19;i++){
    const side=i%2===0?-1:1;
    const x=side*(7.3+rng()*5.2), z=-30+rng()*42;
    npcs.push(makeNPC(group,x,z,{color:palette.city[i%palette.city.length]},rng));
  }
  npcs.push(makeNPC(group,9,-14,{kind:"streamer",name:"NOVA BYTE",color:"#bce673",pants:"#334650",hair:"#3b5161",static:true},rng));
  const vehicles=[];
  for(let i=0;i<3;i++){const vehicle=car(group,(-1+i)*2.1,(-22+i*19),["#edb486","#80b7c2","#e38f95"][i],rng);vehicles.push({root:vehicle,lane:i%2===0?2.2:-2.2,z:-22+i*19,speed:i%2===0?3.1:-2.4});}
  decor.vehicles=vehicles;
  sign(group,"NEON DISTRICT",0,14,-54,13,1.55,"#caf4e3","#36626b");
}
function createFestival(group,rng,npcs,decor) {
  box(group,42,.15,93,"#b7a3a5",0,.04,-10);
  for(let x=-17;x<=17;x+=8)for(let z=-3;z>=-25;z-=11) {
    if(Math.abs(x)>9)lamp(group,x,z,true);
  }
  for(let i=0;i<14;i++){
    const x=i%2===0?-21:21,z=-40+(i%7)*11;
    tree(group,x,z,rng,true);
  }
  // Large outdoor festival stage, elevated singer, glowing low-poly light truss.
  box(group,26,2.7,13,"#303c4f",0,1.4,-33);
  box(group,27,1.2,15,"#262e44",0,5.5,-33);
  box(group,27,.55,16,"#a54b80",0,6.2,-33);
  for(const x of [-12.5,12.5]){
    cylinder(group,.2,.2,8,6,"#32384e",x,4,-27);
    for(let i=0;i<4;i++){
      box(group,2.4,1.45,1.45,"#27333d",x,1.5+i*1.5,-25.2);
      cylinder(group,.46,.46,.07,14,"#101c2e",x,1.5+i*1.5,-24.4).rotation.x=Math.PI/2;
    }
  }
  sign(group,"PIXELFEST  ★  LIVE",0,7.65,-26.9,14,1.55,"#e9f1c0","#da5e94");
  for(const x of [-9,-5,5,9]){
    const light=ball(group,.36,x%2?"#fff0ad":"#ed82d0",x,5.7,-26);
    const bulb=new THREE.PointLight(x<0?0xff9dd4:0xb1f8ff,.9,13,2);
    bulb.position.copy(light.position);group.add(bulb);
  }
  npcs.push(makeNPC(group,0,-28.2,{kind:"singer",name:"LUNA LOOPS",color:"#e77ca8",pants:"#b5bbd9",skin:"#eec9a5",static:true,y:2.83},rng));
  npcs.push(makeNPC(group,-5,-30,{kind:"civilian",name:"BANDMATE",color:"#a7c9d1",static:true,y:2.83},rng));
  npcs.push(makeNPC(group,6,-30,{kind:"civilian",name:"BANDMATE",color:"#f0ae8c",static:true,y:2.83},rng));
  for(let i=0;i<28;i++){
    const x=-14+(i%8)*4.0+(rng()-.5), z=-7-Math.floor(i/8)*4.8+(rng()-.5);
    npcs.push(makeNPC(group,x,z,{color:palette.festival[i%palette.festival.length],static:true},rng));
  }
  for(let x of [-29,29])for(let z of [-28,0,18]) {
    box(group,4,12,5,"#4a576d",x,6,z);
    sign(group,"★",x,7,z+2.55,2.5,2.5,"#faf0cf","#8a4572");
  }
  decor.disco=true;
}
function createSummit(group,rng,npcs,decor) {
  box(group,56,.15,95,"#c8c3b8",0,.04,-10);
  for(let i=-3;i<=3;i++){
    box(group,2,.08,75,"#a9b2ad",i*7,.15,-10);
  }
  box(group,25,2,13,"#b7a99e",0,1,-34);
  box(group,26,.4,14,"#e6d8b9",0,2.08,-34);
  for(let x of [-11,11]){
    cylinder(group,.55,.7,8,8,"#ecdfc6",x,6,-39);
    cylinder(group,1.2,1.1,.6,8,"#f2ead7",x,10.3,-39);
    cylinder(group,.9,1.1,.55,8,"#cadbcf",x,2.5,-39);
  }
  box(group,28,1.15,8,"#456b73",0,8.6,-39);
  box(group,28,.4,10,"#3a515d",0,9.4,-39);
  sign(group,"STATE OF THE PIXELS",0,6,-27.42,12,1.42,"#edfbf5","#285d62");
  const flagColors=["#eb746b","#fff3dd","#9cc9bf"];
  for(const s of [-1,1])for(let i=0;i<3;i++){
    cylinder(group,.05,.05,5,6,"#586d72",s*(6+i*2),5,-28);
    box(group,.7,.27,.1,flagColors[i],s*(6+i*2)+.4,7-i*.27,-28);
  }
  box(group,2.4,1.6,1.65,"#6e564c",0,3.0,-28.3);
  sign(group,"PRESS",0,3.25,-27.38,1.7,.45,"#f8f5dd","#2a6063");
  npcs.push(makeNPC(group,0,-30.2,{kind:"president",name:"PRESIDENT PIXEL",color:"#3f586f",pants:"#263d51",skin:"#e8c49c",hair:"#e0e1d4",static:true,y:2.18},rng));
  for(let s of [-1,1]){
    npcs.push(makeNPC(group,s*6,-27.6,{kind:"civilian",name:"SECURITY",color:"#273f50",pants:"#273d4c",static:true,y:2.18},rng));
    npcs.push(makeNPC(group,s*9,-24,{kind:"civilian",name:"SECURITY",color:"#273f50",pants:"#273d4c",static:true},rng));
  }
  for(let i=0;i<18;i++){
    const x=-12+(i%7)*3.7,z=-8-Math.floor(i/7)*5;
    npcs.push(makeNPC(group,x,z,{static:true,color:palette.summit[i%palette.summit.length]},rng));
  }
  for(let z=-25;z<20;z+=13)for(let s of [-1,1]){
    tree(group,s*23,z,rng);
    lamp(group,s*17,z);
  }
  for(let s of [-1,1])for(let i=0;i<3;i++){
    building(group,s*31,-32+i*22,6,10,14-i*2,"#a8b5bb",rng);
  }
}
export function createWorld(scene, zoneId="city") {
  const rng=seedRandom(zoneId==="city"?34144:zoneId==="festival"?7921:15023);
  const group=new THREE.Group();group.name="level-"+zoneId;scene.add(group);
  const npcs=[],decor={};
  // A large flat play area allows continuous first-person movement.
  box(group,155,.13,155,zoneId==="festival"?"#879c86":zoneId==="summit"?"#a5b3a1":"#73aa8d",0,-.12,-12);
  decorateSky(group,rng);
  if(zoneId==="festival")createFestival(group,rng,npcs,decor);
  else if(zoneId==="summit")createSummit(group,rng,npcs,decor);
  else createCity(group,rng,npcs,decor);
  // Boundaries are visually softened by distant silhouettes.
  for(let i=0;i<21;i++){
    const x=(rng()-.5)*105,z=-56-rng()*28;
    const h=6+rng()*22;
    box(group,4+rng()*7,h,4+rng()*5,zoneId==="festival"?"#65787a":"#74949a",x,h/2,z);
  }
  return {
    group, npcs, decor, zone:zoneId,
    spawn:{x:0,y:CAMERA_HEIGHT,z:15},
    update(dt,now) {
      for(const n of npcs) {
        const t=now*n.speed+n.phase;
        if(n.roam && n.stun<=0){
          n.root.position.x=n.baseX+Math.sin(t*.55)*n.roam;
          n.root.position.z=n.baseZ+Math.cos(t*.42)*n.roam*.7;
          const dx=Math.cos(t*.55),dz=-Math.sin(t*.42);
          n.root.rotation.y=Math.atan2(dx,dz);
        }else if(n.isStationary) {
          n.root.rotation.y=0;
        }
        const movement=n.roam && n.stun<=0 ? .65: n.kind==="singer"?.7:.18;
        const sway=Math.sin(t*8)*movement;
        n.legs[0].rotation.x=sway*.53;n.legs[1].rotation.x=-sway*.53;
        n.arms[0].rotation.x=-sway*.46;n.arms[1].rotation.x=sway*.46;
        n.body.rotation.z=n.stun>0 ? Math.sin(now*23)*.18 : Math.sin(now*2+n.phase)*.026;
        if(n.stun>0) {
          n.stun=Math.max(0,n.stun-dt);
          n.body.position.y=Math.abs(Math.sin(now*13))*.1;
        } else {
          n.body.position.y=n.isStationary ? Math.sin(now*2+n.phase)*.04 : 0;
        }
      }
      if(decor.vehicles)for(const [i,v] of decor.vehicles.entries()){
        v.root.position.z+=v.speed*dt;
        if(v.root.position.z>28)v.root.position.z=-46;
        if(v.root.position.z<-46)v.root.position.z=28;
        v.root.position.x=v.lane;
        v.root.rotation.y=v.speed>0?0:Math.PI;
      }
    },
    dispose() {
      scene.remove(group);
      group.traverse(object=>{
        object.geometry?.dispose();
        if(object.material) {
          for(const m of Array.isArray(object.material)?object.material:[object.material]){
            m.map?.dispose();m.dispose();
          }
        }
      });
    }
  };
}
