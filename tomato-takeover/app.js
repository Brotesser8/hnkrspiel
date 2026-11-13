import * as THREE from "three";
import { createWorld, CAMERA_HEIGHT, WORLD_BOUNDS } from "./world.js";
import { SAVE_KEY, ZONES, MAX_POSTS, USD, compact, restoreSave, tripCost, canTravel,
  estimatePost, returningAudience, canClaimGift, shotToTarget } from "./logic.mjs";

const $ = id => document.getElementById(id);
const ui = Object.fromEntries([
  "gameCanvas","viewport","reticle","filmFrame","recClock","recHits","damageFlash","screenFade",
  "cashValue","followersValue","viewsValue","tomatoCount","mapButton","feedButton","postDot",
  "shopButton","helpButton","districtCode","districtName","districtSubtitle","questCounter",
  "questText","questProgress","targetCard","targetKind","targetName","targetDistance",
  "hitToast","buyQuick","throwButton","recordButton","recordIcon","recordLabel","touchControls",
  "introOverlay","startButton","startText","introStatus","menuOverlay","closeShade","closeMenu",
  "menuTitle","panelIndex","travelView","storeView","socialView","previewView","helpView",
  "destinations","buyPack","giftNote","claimGift","socialFollowers","socialViews","socialEarnings",
  "socialPosts","previewVideo","previewSummary","clipLength","discardClip","postClip",
  "playerOverlay","feedVideo","feedVideoTitle","closePlayer","notification"
].map(id => [id, $(id)]));

const MOBILE = matchMedia("(pointer: coarse)").matches;
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FARE_GIFT_TIME = 60_000, RECORD_LIMIT = 18_000;
const vec3 = () => new THREE.Vector3();
const state = {
  saved:restoreSave(safeStorage(SAVE_KEY)), started:false, menu:null, recording:false,
  world:null, keys:new Set(), touchKeys:new Set(), sessionShots:[], pending:null,
  postsVideo:new Map(), dbPromise:null, playerSpeed:6, yaw:0, pitch:0, lastThrow:0,
  recorder:null, stream:null, recordingChunks:[], recordingStart:0, recordTimer:null,
  hitCount:0, questDone:false, toastTimer:null, sparks:[], projectiles:[], time:0,
  pointerLocked:false, touchLook:null, touches:new Map(), lastReturn:Date.now()
};
function safeStorage(key) { try { return localStorage.getItem(key); } catch { return null; } }
function persist() { try { localStorage.setItem(SAVE_KEY,JSON.stringify(state.saved)); } catch {} }
function formatMoney(n) { return USD(n); }
function announce(text, duration=3500) {
  ui.notification.textContent=text;ui.notification.hidden=false;
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>{ui.notification.hidden=true;},duration);
}
function floatHit(text){
  ui.hitToast.textContent=text;ui.hitToast.classList.remove("show");
  void ui.hitToast.offsetWidth;ui.hitToast.classList.add("show");
  clearTimeout(floatHit.timeout);
  floatHit.timeout=setTimeout(()=>ui.hitToast.classList.remove("show"),1050);
}
function syncHud(){
  ui.cashValue.textContent=formatMoney(state.saved.cash);
  ui.followersValue.textContent=compact(state.saved.followers);
  ui.viewsValue.textContent=compact(state.saved.totalViews);
  ui.tomatoCount.textContent=String(state.saved.tomatoes);
  ui.questCounter.textContent=Math.min(3,state.hitCount)+" / 3";
  ui.questProgress.style.width=(Math.min(3,state.hitCount)/3*100)+"%";
  ui.questText.textContent=state.questDone?"Street-Challenge abgeschlossen. +$30!":
    "Triff 3 Passanten mit Tomaten und verdiene den Bonus.";
  ui.districtCode.textContent={city:"01",festival:"02",summit:"03"}[state.saved.zone];
  ui.districtName.textContent=ZONES[state.saved.zone].name.toUpperCase();
  ui.districtSubtitle.textContent=state.saved.zone==="city"?"STREET LIFE • OPEN WORLD":
    state.saved.zone==="festival"?"MUSIC • STARS • CROWD":"PRESS • SPEECH • VIP";
  ui.postDot.classList.toggle("active",state.saved.posts.length>0);
}

let renderer, scene, camera, sun, clock;
function createEngine(){
  try {
    renderer=new THREE.WebGLRenderer({canvas:ui.gameCanvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.65));
    scene=new THREE.Scene();
    scene.background=new THREE.Color("#92b7b1");
    scene.fog=new THREE.Fog("#92b7b1",48,120);
    camera=new THREE.PerspectiveCamera(77,1,.07,170);
    camera.rotation.order="YXZ";
    scene.add(new THREE.HemisphereLight("#e6fbff","#52756b",2));
    sun=new THREE.DirectionalLight("#ffe7be",3.0);sun.position.set(-23,42,-19);scene.add(sun);
    const ambient=new THREE.AmbientLight("#b4ccd9",.38);scene.add(ambient);
    clock=new THREE.Clock();
    swapWorld(state.saved.zone);
    fit();
    requestAnimationFrame(frame);
    ui.startButton.disabled=false;
    ui.startText.textContent="LET'S GET MESSY";
    ui.introStatus.textContent="3D-Welt bereit · Tastatur/Maus oder Touch";
  }catch(error){
    console.error("TOMATO – 3D init failed",error);
    ui.introStatus.textContent="3D kann nicht gestartet werden. Bitte WebGL im Browser aktivieren und neu laden.";
    ui.startText.textContent="WEBGL NICHT VERFÜGBAR";
    ui.startButton.disabled=true;
  }
}
function fit(){
  if(!renderer)return;
  const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener("resize",fit);
function swapWorld(zone){
  state.world?.dispose();
  state.world=createWorld(scene,zone);
  camera.position.set(state.world.spawn.x,state.world.spawn.y,state.world.spawn.z);
  state.yaw=0;state.pitch=0;camera.rotation.set(0,0,0);
  for(const shot of state.projectiles){scene.remove(shot.mesh);disposeMesh(shot.mesh);}
  state.projectiles=[];
  for(const particle of state.sparks){scene.remove(particle.mesh);disposeMesh(particle.mesh);}
  state.sparks=[];
  const color=zone==="festival"?"#967d9b":zone==="summit"?"#a9c0b7":"#90bdb5";
  scene.background=new THREE.Color(color);
  scene.fog.color.set(color);
  syncHud();
}
function disposeMesh(group){
  group.traverse?.(item=>{
    item.geometry?.dispose();
    if(item.material)for(const m of Array.isArray(item.material)?item.material:[item.material])m.dispose();
  });
}
function forward(){
  const v=new THREE.Vector3();camera.getWorldDirection(v);return v.normalize();
}
function setLook(dx,dy,factor=.00225){
  if(state.menu || !state.started) return;
  state.yaw-=dx*factor;
  state.pitch=Math.max(-1.35,Math.min(1.35,state.pitch-dy*factor));
  camera.rotation.set(state.pitch,state.yaw,0,"YXZ");
}
function movement(dt){
  if(!state.started || state.menu || !ui.playerOverlay.hidden || document.hidden)return;
  const keys=state.keys, touch=state.touchKeys;
  const pressing=k=>keys.has(k)||touch.has(k);
  let f=(pressing("KeyW")?1:0)-(pressing("KeyS")?1:0),
      r=(pressing("KeyD")?1:0)-(pressing("KeyA")?1:0);
  const norm=Math.hypot(f,r);
  if(norm<.01)return;
  f/=norm;r/=norm;
  const spd=(keys.has("ShiftLeft")||keys.has("ShiftRight")?10:6.2)*Math.min(dt,.055);
  const dx=(r*Math.cos(state.yaw)-f*Math.sin(state.y))*spd,
        dz=(-r*Math.sin(state.yaw)-f*Math.cos(state.yaw))*spd;
  const tryX=Math.max(WORLD_BOUNDS.minX,Math.min(WORLD_BOUNDS.maxX,camera.position.x+dx));
  const tryZ=Math.max(WORLD_BOUNDS.minZ,Math.min(WORLD_BOUNDS.maxZ,camera.position.z+dz));
  // Walkable street boundaries. Stop at solid stages, podium and buildings.
  const canStand=(x,z)=>{
    if(state.saved.zone==="city"){
      if(Math.abs(x)>15.3 && z<22 && z>-45)return false;
    }else if(state.saved.zone==="festival"){
      if(z<-25.5 && Math.abs(x)<14.3)return false;
    }else if(state.saved.zone==="summit"){
      if(z<-26.1 && Math.abs(x)<14.3)return false;
      if(Math.abs(x)>25 && z<14 && z>-45)return false;
    }
    // A personal bubble around pedestrians prevents clipping into models.
    for(const npc of state.world.npcs){
      const nx=npc.root.position.x,nz=npc.root.position.z;
      if(Math.hypot(x-nx,z-nz)<.54)return false;
    }
    return true;
  };
  if(canStand(tryX,camera.position.z))camera.position.x=tryX;
  if(canStand(camera.position.x,tryZ))camera.position.z=tryZ;
  camera.position.y=CAMERA_HEIGHT+Math.sin(state.time*12)*.028;
}
function findTarget(){
  if(!state.started || state.menu || !state.world)return null;
  const dir=forward(),pos=camera.position;
  let best=null,bestDistance=Infinity;
  for(const npc of state.world.npcs){
    const p={x:npc.root.position.x,y:npc.root.position.y+1.4,z:npc.root.position.z};
    if(!shotToTarget(pos,dir,p))continue;
    const distance=pos.distanceTo(new THREE.Vector3(p.x,p.y,p.z));
    if(distance<bestDistance){bestDistance=distance;best=npc;}
  }
  return best ? {npc:best,distance:bestDistance}:null;
}
let targetRef=null;
function updateTarget(){
  if(!state.started||state.menu){ui.targetCard.hidden=true;ui.reticle.classList.remove("targeted");return;}
  targetRef=findTarget();
  ui.targetCard.hidden=!targetRef;
  ui.reticle.classList.toggle("targeted",!!targetRef);
  if(targetRef){
    ui.targetKind.textContent=targetRef.npc.celebrity?"★ CELEBRITY SPOTTED":"● PASSANT";
    ui.targetName.textContent=targetRef.npc.name;
    ui.targetDistance.textContent=Math.round(targetRef.distance)+" METER";
  }
}
const sphereGeometry=new THREE.IcosahedronGeometry(.23,1);
const splatGeometry=new THREE.IcosahedronGeometry(.09,0);
function projectileModel(){
  const group=new THREE.Group();
  const tomato=new THREE.Mesh(sphereGeometry,new THREE.MeshStandardMaterial({color:"#f34e3a",roughness:.85,flatShading:true}));
  group.add(tomato);
  const stem=new THREE.Mesh(new THREE.ConeGeometry(.11,.18,5),new THREE.MeshStandardMaterial({color:"#448e48",roughness:1,flatShading:true}));
  stem.position.y=.25;group.add(stem);
  return group;
}
function throwTomato(){
  if(!state.started || state.menu || !ui.playerOverlay.hidden)return;
  const now=performance.now();
  if(now-state.lastThrow<380)return;
  if(state.saved.tomatoes<=0){announce("Keine Tomaten mehr. Öffne den Shop (B)!");return;}
  state.lastThrow=now;
  state.saved.tomatoes--;persist();syncHud();
  const group=projectileModel();
  const dir=forward(),pos=camera.position.clone().addScaledVector(dir,.55);
  group.position.copy(pos).add(new THREE.Vector3(0,-.12,0));
  scene.add(group);
  let velocity=dir.multiplyScalar(27.5);
  const aim=findTarget();
  if(aim) {
    // Ballistic aim correction for targets already under the crosshair.
    const npc=aim.npc;
    const target=new THREE.Vector3(npc.root.position.x,npc.root.position.y+1.42,npc.root.position.z);
    const flightTime=target.distanceTo(pos)/29;
    target.y+=.5*10.5*flightTime*flightTime;
    velocity=target.sub(pos).normalize().multiplyScalar(29);
  }
  state.projectiles.push({mesh:group,velocity,life:2.8,previous:group.position.clone()});
  playBeep("throw");
  if(state.saved.tomatoes===0)announce("Letzte Tomate! Im Shop gibt's Nachschub.",1900);
}
function segmentDistance(a,b,p){
  const ab=b.clone().sub(a);
  const t=THREE.MathUtils.clamp(p.clone().sub(a).dot(ab)/Math.max(1e-8,ab.lengthSq()),0,1);
  return a.clone().addScaledVector(ab,t).distanceTo(p);
}
function spawnSplat(hitPos, npc=null){
  for(let i=0;i<11;i++){
    const v=new THREE.Vector3((Math.random()-.5)*6,1.1+Math.random()*4,(Math.random()-.5)*6);
    const particle=new THREE.Mesh(splatGeometry,new THREE.MeshBasicMaterial({color:i%3?"#f0453e":"#ffc078",transparent:true,opacity:.95}));
    particle.position.copy(hitPos);particle.scale.setScalar(.4+Math.random()*1.6);
    scene.add(particle);
    state.sparks.push({mesh:particle,vel:v,life:.5+Math.random()*.5});
  }
  if(npc){
    const stain=new THREE.Mesh(new THREE.SphereGeometry(.22,6,4),new THREE.MeshStandardMaterial({color:"#ea4439",roughness:.85,transparent:true,opacity:.88}));
    stain.scale.set(1.55,1.1,.35);
    stain.position.set((Math.random()-.5)*.28,1.05,.46);
    npc.body.add(stain);
    setTimeout(()=>{
      if(stain.parent)stain.parent.remove(stain);
      stain.geometry.dispose();stain.material.dispose();
    },3800);
  }
}
function onHit(npc,position){
  npc.stun=.8;npc.hitCount++;
  spawnSplat(position,npc);
  if(state.recording){
    state.sessionShots.push({kind:npc.kind,name:npc.name,time:Date.now()});
    ui.recHits.textContent=state.sessionShots.length+" HITS";
  }
  if(npc.kind==="civilian"){
    if(!state.questDone){
      state.hitCount++;
      if(state.hitCount>=3){
        state.questDone=true;state.saved.cash+=30;persist();
        announce("DAILY HUSTLE COMPLETE! +$30 Bonus 🎉");
      }
    }
  }
  floatHit(npc.celebrity ? "★ VIP SPLAT! 🍅" : ["SPLAT! 🍅","DIRECT HIT!","TOMATO COMBO!"][Math.floor(Math.random()*3)]);
  ui.damageFlash.classList.add("on");
  setTimeout(()=>ui.damageFlash.classList.remove("on"),130);
  syncHud();playBeep("splat");
}
function updateProjectiles(dt){
  for(let i=state.projectiles.length-1;i>=0;i--){
    const s=state.projectiles[i],a=s.mesh.position.clone();
    s.velocity.y-=10.5*dt;
    s.mesh.position.addScaledVector(s.velocity,dt);
    s.mesh.rotation.x+=dt*9;s.mesh.rotation.z+=dt*8;
    s.life-=dt;
    let hit=false;
    for(const npc of state.world.npcs){
      const target=new THREE.Vector3(npc.root.position.x,npc.root.position.y+1.25,npc.root.position.z);
      if(segmentDistance(a,s.mesh.position,target)<.8){
        onHit(npc,s.mesh.position.clone());hit=true;break;
      }
    }
    if(s.mesh.position.y<=.22 || s.life<=0){
      if(!hit)spawnSplat(s.mesh.position.clone());
      hit=true;
    }
    if(hit){
      scene.remove(s.mesh);
      s.mesh.traverse(item=>{if(item.material)item.material.dispose();});
      state.projectiles.splice(i,1);
    }
  }
  for(let i=state.sparks.length-1;i>=0;i--){
    const p=state.sparks[i];p.life-=dt;
    p.vel.y-=13*dt;p.mesh.position.addScaledVector(p.vel,dt);
    p.mesh.material.opacity=Math.min(.95,Math.max(0,p.life*1.6));
    if(p.life<=0||p.mesh.position.y<.04){
      scene.remove(p.mesh);p.mesh.material.dispose();state.sparks.splice(i,1);
    }
  }
}
function frame(){
  requestAnimationFrame(frame);
  if(!renderer || !clock || !state.world)return;
  const dt=Math.min(clock.getDelta(),.065);
  if(!document.hidden){
    state.time+=dt;
    state.world.update(dt,state.time);
    movement(dt);
    updateProjectiles(dt);
    updateTarget();
    if(state.recording)updateRecordClock();
    renderer.render(scene,camera);
  }
}
function start(){
  if(!renderer){announce("WebGL muss verfügbar sein.");return;}
  state.started=true;ui.introOverlay.hidden=true;syncHud();
  if(MOBILE){ui.touchControls.hidden=false;announce("Links bewegen · rechts wischen · WERFEN benutzen",4500);}
  else {announce("Ins Bild klicken für Maussteuerung · WASD bewegen · R filmen",5500);ui.gameCanvas.focus();}
}
function unlockPointer(){if(document.pointerLockElement===ui.gameCanvas)document.exitPointerLock();}
ui.gameCanvas.addEventListener("click",event=>{
  if(!state.started || state.menu||MOBILE)return;
  if(document.pointerLockElement!==ui.gameCanvas) {
    try{ui.gameCanvas.requestPointerLock();}catch{}
  }
});
ui.gameCanvas.addEventListener("mousedown",event=>{
  if(event.button===0 && document.pointerLockElement===ui.gameCanvas)throwTomato();
});
document.addEventListener("pointerlockchange",()=>state.pointerLocked=document.pointerLockElement===ui.gameCanvas);
document.addEventListener("mousemove",event=>{
  if(state.pointerLocked)setLook(event.movementX,event.movementY);
});
ui.gameCanvas.addEventListener("pointerdown",event=>{
  if(!MOBILE||!state.started||state.menu)return;
  if(event.clientX<innerWidth*.32)return;
  ui.gameCanvas.setPointerCapture?.(event.pointerId);
  state.touchLook={id:event.pointerId,x:event.clientX,y:event.clientY};
});
ui.gameCanvas.addEventListener("pointermove",event=>{
  if(!MOBILE||!state.touchLook||event.pointerId!==state.touchLook.id)return;
  const dx=event.clientX-state.touchLook.x,dy=event.clientY-state.touchLook.y;
  state.touchLook.x=event.clientX;state.touchLook.y=event.clientY;
  setLook(dx,dy,.0042);
});
for(const ev of ["pointerup","pointercancel"]){
  ui.gameCanvas.addEventListener(ev,event=>{if(state.touchLook?.id===event.pointerId)state.touchLook=null;});
}
document.querySelectorAll("[data-move]").forEach(button=>{
  const map={forward:"KeyW",backward:"KeyS",left:"KeyA",right:"KeyD"};
  const key=map[button.dataset.move];
  button.addEventListener("pointerdown",event=>{
    event.preventDefault();button.setPointerCapture?.(event.pointerId);
    state.touchKeys.add(key);button.classList.add("pressed");
  });
  const release=()=>{state.touchKeys.delete(key);button.classList.remove("pressed");};
  button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);
});
document.addEventListener("keydown",event=>{
  if(!state.started || event.ctrlKey||event.metaKey||event.altKey)return;
  if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))event.preventDefault();
  if(event.repeat && !["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight"].includes(event.code))return;
  state.keys.add(event.code);
  if(event.code==="Escape") { if(!ui.playerOverlay.hidden)closePlayer();else if(state.menu)closeMenu();return; }
  if(state.menu){if(event.code==="KeyF")openMenu("social");return;}
  if(event.code==="Space"){throwTomato();return;}
  if(event.code==="KeyR"){toggleRecording();return;}
  if(event.code==="KeyF"){openMenu("social");return;}
  if(event.code==="KeyM"){openMenu("travel");return;}
  if(event.code==="KeyB"){openMenu("store");return;}
});
document.addEventListener("keyup",event=>state.keys.delete(event.code));
window.addEventListener("blur",()=>{state.keys.clear();state.touchKeys.clear();});
ui.throwButton.addEventListener("click",throwTomato);
ui.recordButton.addEventListener("click",toggleRecording);
ui.startButton.addEventListener("click",start);

function openMenu(name){
  if(!state.started)return;
  if(state.recording){announce("Stoppe zuerst die Aufnahme mit R.");return;}
  if(!["travel","store","social","preview","help"].includes(name))return;
  unlockPointer();state.keys.clear();state.touchKeys.clear();
  state.menu=name;
  ui.menuOverlay.hidden=false;
  const sections={travel:["01 / OPEN WORLD","Wo geht's hin?"],store:["02 / INVENTORY","TOMATO SHOP"],social:["03 / CREATOR ECONOMY","Dein Channel."],preview:["04 / NEW UPLOAD","Dein Meisterwerk."],help:["05 / CONTROLS","So funktioniert's."]};
  ui.panelIndex.textContent=sections[name][0];ui.menuTitle.textContent=sections[name][1];
  for(const [key,view] of Object.entries({
    travel:ui.travelView,store:ui.storeView,social:ui.socialView,
    preview:ui.previewView,help:ui.helpView
  }))view.hidden=key!==name;
  if(name==="travel")renderDestinations();
  else if(name==="store")renderStore();
  else if(name==="social")renderSocial();
  else if(name==="preview")showPreview();
  playBeep("click");
}
function closeMenu(){
  if(state.menu==="preview" && state.pending){
    announce("Poste deinen Clip oder verwirf ihn zuerst.");
    return;
  }
  state.menu=null;ui.menuOverlay.hidden=true;
  ui.previewVideo.pause();
}
ui.closeShade.addEventListener("click",closeMenu);
ui.closeMenu.addEventListener("click",closeMenu);
ui.mapButton.addEventListener("click",()=>openMenu("travel"));
ui.feedButton.addEventListener("click",()=>openMenu("social"));
ui.shopButton.addEventListener("click",()=>openMenu("store"));
ui.helpButton.addEventListener("click",()=>openMenu("help"));

function renderDestinations(){
  ui.destinations.replaceChildren();
  const cards=[
    {id:"city",icon:"🏙️",subtitle:"Passanten, Strassenkünstler, Streamer und der Tomatenmarkt.",title:"NEON DISTRICT",tag:"OPEN WORLD"},
    {id:"festival",icon:"🎸",subtitle:"Besuche LUNA LOOPS beim fiktiven PixelFest. Auftritt, Publikum, Bühne!",title:"PIXELFEST",tag:"CONCERT • STAR"},
    {id:"summit",icon:"🎙️",subtitle:"Ein satirischer Rednerauftritt mit PRESIDENT PIXEL und Pressepublikum.",title:"CAPITOL PLAZA",tag:"VIP • SPEECH"}
  ];
  for(const info of cards){
    const zone=ZONES[info.id], cost=tripCost(zone.id,state.saved.passes);
    const current=state.saved.zone===zone.id;
    const card=document.createElement("div");card.className="destination-card";
    const symbol=document.createElement("div");symbol.className="destination-icon";symbol.textContent=info.icon;
    const body=document.createElement("div");body.className="destination-text";
    const tag=document.createElement("span");tag.textContent=info.tag;
    const title=document.createElement("h3");title.textContent=info.title;
    const description=document.createElement("p");description.textContent=info.subtitle;
    const costs=document.createElement("div");costs.className="destination-cost";
    const costText=document.createElement("strong");
    costText.textContent=zone.id==="city"?"RÜCKFAHRT KOSTENLOS":
      "METRO "+USD(cost.fare)+" + "+(cost.ticket?"TICKET "+USD(cost.ticket):"TICKET VORHANDEN");
    const total=document.createElement("small");total.textContent=zone.id==="city"?"CITY HUB":"TOTAL: "+USD(cost.total);
    costs.append(costText,total);
    const button=document.createElement("button");button.type="button";
    button.className=current?"current":"";
    button.disabled=current;
    button.textContent=current?"DU BIST BEREITS HIER": !canTravel(state.saved.cash,zone.id,state.saved.passes) ?
      "ZU WENIG GELD · "+USD(cost.total) : "HIERHIN REISEN ↗";
    button.addEventListener("click",()=>travel(zone.id));
    body.append(tag,title,description,costs,button);
    card.append(symbol,body);ui.destinations.append(card);
  }
}
function travel(zoneId){
  if(!ZONES[zoneId]||zoneId===state.saved.zone)return;
  if(state.recording){announce("Aufnahme zuerst stoppen.");return;}
  const cost=tripCost(zoneId,state.saved.passes);
  if(!cost||!canTravel(state.saved.cash,zoneId,state.saved.passes)){announce("Nicht genug Cash für Metro und Ticket.");return;}
  state.saved.cash-=cost.total;
  if(cost.ticket)state.saved.passes.push(zoneId);
  state.saved.zone=zoneId;persist();
  state.menu=null;ui.menuOverlay.hidden=true;
  ui.screenFade.classList.add("active");
  setTimeout(()=>{
    swapWorld(zoneId);
    ui.screenFade.classList.remove("active");
    announce("WILLKOMMEN IN "+ZONES[zoneId].name.toUpperCase()+" · "+(cost.total?USD(cost.total)+" bezahlt":"Freie Rückfahrt"),4100);
  },380);
  playBeep("travel");
}
function buyTomatoes(){
  if(state.saved.cash<18){announce("Du brauchst $18 für 6 neue Tomaten.");return;}
  if(state.saved.tomatoes>=96){announce("Dein Rucksack ist voll!");return;}
  state.saved.cash-=18;state.saved.tomatoes=Math.min(100,state.saved.tomatoes+6);
  persist();syncHud();renderStore();announce("+6 TOMATEN im Rucksack!");playBeep("buy");
}
function renderStore(){
  ui.buyPack.disabled=state.saved.cash<18||state.saved.tomatoes>=96;
  const gift=canClaimGift(state.saved);
  ui.claimGift.hidden=!gift;
  ui.giftNote.replaceChildren();
  const icon=document.createElement("span");icon.textContent="💡";
  const message=document.createTextNode(gift?"Kein Cash und keine Tomaten? Hol dir 3 kostenlose Startertomaten.":
    "Spielhilfe: Wenn du komplett pleite bist, bekommst du nach einer Minute wieder 3 Startertomaten.");
  ui.giftNote.append(icon,message);
}
function claimGift(){
  if(!canClaimGift(state.saved))return;
  state.saved.tomatoes+=3;state.saved.lastGift=Date.now();
  persist();syncHud();renderStore();announce("3 kostenlose Startertomaten erhalten!");
}
ui.buyPack.addEventListener("click",buyTomatoes);
ui.buyQuick.addEventListener("click",()=>{if(state.saved.cash>=18)buyTomatoes();else openMenu("store");});
ui.claimGift.addEventListener("click",claimGift);

function chooseMime(){
  if(typeof MediaRecorder==="undefined")return null;
  for(const mime of ["video/webm;codecs=vp8","video/webm","video/mp4"]){
    if(MediaRecorder.isTypeSupported?.(mime))return mime;
  }
  return "";
}
function cleanRecordingStream(){
  if(state.stream){for(const track of state.stream.getTracks())track.stop();state.stream=null;}
  clearTimeout(state.recordTimer);state.recordTimer=null;
}
function updateRecordClock(){
  const elapsed=Math.min(RECORD_LIMIT,Date.now()-state.recordingStart);
  ui.recClock.textContent="00:"+String(Math.floor(elapsed/1000)).padStart(2,"0");
  if(elapsed>=RECORD_LIMIT && state.recording)stopRecording();
}
function startRecording(){
  if(state.recording||state.menu||!renderer)return;
  if(!ui.gameCanvas.captureStream || typeof MediaRecorder==="undefined"){
    announce("Dein Browser unterstützt Canvas-Videoaufnahmen nicht. Verwende Chrome, Firefox oder Safari in aktueller Version.",6200);return;
  }
  let stream=null;
  try{
    stream=ui.gameCanvas.captureStream(24);
    const mime=chooseMime();
    const opts=mime?{mimeType:mime,videoBitsPerSecond:1_350_000}:{videoBitsPerSecond:1_350_000};
    const recorder=new MediaRecorder(stream,opts);
    state.stream=stream;state.recorder=recorder;
    state.recordingChunks=[];state.sessionShots=[];
    state.recording=true;state.recordingStart=Date.now();
    recorder.ondataavailable=event=>{if(event.data && event.data.size)state.recordingChunks.push(event.data);};
    recorder.onerror=event=>{
      console.warn("MediaRecorder failed",event);
      if(state.recording){state.recording=false;resetRecordingUI();cleanRecordingStream();}
      announce("Aufnahme fehlgeschlagen. Prüfe die Browserberechtigung.");
    };
    recorder.onstop=()=>{
      cleanRecordingStream();
      const parts=state.recordingChunks;
      const blob=new Blob(parts,{type:recorder.mimeType||mime||"video/webm"});
      state.recordingChunks=[];state.recorder=null;
      if(blob.size<500){announce("Der Clip konnte nicht gespeichert werden. Bitte erneut versuchen.");return;}
      const url=URL.createObjectURL(blob);
      state.pending={blob,url,shots:[...state.sessionShots],duration:Math.min(18,Math.max(1,Math.round((Date.now()-state.recordingStart)/1000))),zone:state.saved.zone};
      openMenu("preview");
    };
    recorder.start(500);
    ui.filmFrame.hidden=false;
    ui.recHits.textContent="0 HITS";
    ui.recClock.textContent="00:00";
    ui.recordButton.classList.add("recording");
    ui.recordLabel.textContent="STOPPEN";
    ui.recordIcon.textContent="■";
    state.recordTimer=setTimeout(stopRecording,RECORD_LIMIT);
    playBeep("rec");
    announce("● AUFNAHME LÄUFT – Wirf Tomaten während du filmst!",3000);
  }catch(error){
    console.warn("Recording error",error);
    state.recording=false;state.recorder=null;state.stream=stream;
    cleanRecordingStream();resetRecordingUI();
    announce("Aufnahme konnte nicht starten. Videoaufnahme wird von diesem Browser nicht unterstützt.",5500);
  }
}
function resetRecordingUI(){
  ui.filmFrame.hidden=true;
  ui.recordButton.classList.remove("recording");
  ui.recordLabel.textContent="AUFNAHME";
  ui.recordIcon.textContent="◉";
}
function stopRecording(){
  if(!state.recording)return;
  state.recording=false;
  resetRecordingUI();
  clearTimeout(state.recordTimer);
  try{if(state.recorder && state.recorder.state!=="inactive")state.recorder.stop();else cleanRecordingStream();}
  catch(e){console.warn(e);cleanRecordingStream();announce("Aufnahme konnte nicht abgeschlossen werden.");}
  playBeep("rec");
}
function toggleRecording(){if(state.recording)stopRecording();else startRecording();}
function showPreview(){
  if(!state.pending)return;
  ui.previewVideo.src=state.pending.url;
  ui.previewVideo.load();
  ui.clipLength.textContent=state.pending.duration+" SEK.";
  const count=state.pending.shots.length;
  const famous=state.pending.shots.filter(s=>s.kind!=="civilian");
  ui.previewSummary.textContent=count?
    count+" erfolgreiche Tomaten-Treffer aufgenommen · "+(famous.length?famous.map(x=>x.name).join(", ")+" im Video!":"Nur Passanten – 5 % Chance auf extrem viral!"):
    "Schönes Stadtvideo – ohne Tomatentreffer gibt es kaum Aufrufe. Du kannst es trotzdem posten.";
  ui.postClip.disabled=false;
}
function discard(){
  if(!state.pending)return;
  ui.previewVideo.pause();ui.previewVideo.removeAttribute("src");ui.previewVideo.load();
  URL.revokeObjectURL(state.pending.url);state.pending=null;
  state.menu=null;ui.menuOverlay.hidden=true;announce("Clip verworfen.");
}
async function post(){
  if(!state.pending)return;
  ui.postClip.disabled=true;ui.previewVideo.pause();
  const clip=state.pending;
  const analytics=estimatePost({shots:clip.shots,followers:state.saved.followers,duration:clip.duration});
  const id="p_"+Date.now()+"_"+Math.random().toString(36).slice(2,9);
  const item={...analytics,id,zone:clip.zone,postedAt:Date.now()};
  state.saved.posts.unshift(item);
  state.saved.posts=state.saved.posts.slice(0,MAX_POSTS);
  state.saved.cash+=item.earned;
  state.saved.followers+=item.newFollowers;
  state.saved.totalViews+=item.views;state.saved.totalLikes+=item.likes;
  state.saved.totalEarnings+=item.earned;
  state.postsVideo.set(item.id,clip.url);
  persist();syncHud();
  state.pending=null;
  ui.previewVideo.removeAttribute("src");ui.previewVideo.load();
  saveVideo(item.id,clip.blob).catch(()=>{});
  playBeep(item.viral?"viral":"buy");
  openMenu("social");
  announce(item.viral?"🔥 EXTREM VIRAL! +"+compact(item.views)+" AUFRUFE · "+USD(item.earned)+" VERDIENT!":
    "VIDEO GEPOSTET! +"+compact(item.views)+" Views · "+compact(item.newFollowers)+" Follower · "+USD(item.earned),6500);
}
ui.discardClip.addEventListener("click",discard);
ui.postClip.addEventListener("click",post);
function sumEarned(){return state.saved.totalEarnings;}
function renderSocial(){
  ui.socialFollowers.textContent=compact(state.saved.followers);
  ui.socialViews.textContent=compact(state.saved.totalViews);
  ui.socialEarnings.textContent=formatMoney(sumEarned());
  const list=ui.socialPosts;list.replaceChildren();
  if(!state.saved.posts.length){
    const empty=document.createElement("div");empty.className="social-empty";
    const symbol=document.createElement("span");symbol.textContent="🎬";
    const title=document.createElement("h3");title.textContent="Noch keine Videos.";
    const hint=document.createElement("p");hint.textContent="Drücke R, wirf während der Aufnahme Tomaten und poste deinen Clip. Jeder Upload kann Geld und Follower bringen.";
    empty.append(symbol,title,hint);list.append(empty);return;
  }
  for(const item of state.saved.posts){
    const card=document.createElement("article");card.className="post";
    const head=document.createElement("div");head.className="post-head";
    const icon=document.createElement("span");icon.className="post-avatar";icon.textContent="🍅";
    const identity=document.createElement("div");
    const handle=document.createElement("strong");handle.textContent="@tomato.takeover";
    const note=document.createElement("small");note.textContent=ZONES[item.zone].name.toUpperCase()+" · "+new Date(item.postedAt||Date.now()).toLocaleDateString("de-CH");
    identity.append(handle,note);head.append(icon,identity);
    if(item.viral){const badge=document.createElement("span");badge.className="viral-badge";badge.textContent="🔥 VIRAL";head.append(badge);}
    const video=document.createElement("button");video.type="button";video.className="post-media";
    const play=document.createElement("span");play.textContent="▶";
    video.append(play,document.createTextNode(" VIDEO ANSEHEN ("+item.duration+" S)"));
    video.addEventListener("click",()=>openPlayer(item));
    const title=document.createElement("h3");title.textContent=item.headline;
    const stats=document.createElement("div");stats.className="post-numbers";
    for(const text of ["▶ "+compact(item.views)+" VIEWS","♥ "+compact(item.likes)+" LIKES","↑ "+compact(item.newFollowers),"+"+USD(item.earned)]){
      const metric=document.createElement("span");metric.textContent=text;stats.append(metric);
    }
    card.append(head,video,title,stats);list.append(card);
  }
}
function openPlayer(item){
  loadVideoURL(item.id).then(url=>{
    if(!url){announce("Dieses Video ist auf diesem Gerät nicht mehr verfügbar.");return;}
    ui.playerOverlay.hidden=false;ui.feedVideo.src=url;ui.feedVideoTitle.textContent=item.headline;
    ui.feedVideo.play().catch(()=>{});
  }).catch(()=>announce("Videodatei kann nicht geöffnet werden."));
}
function closePlayer(){
  ui.feedVideo.pause();ui.feedVideo.removeAttribute("src");ui.feedVideo.load();
  ui.playerOverlay.hidden=true;
}
ui.closePlayer.addEventListener("click",closePlayer);
ui.playerOverlay.addEventListener("click",e=>{if(e.target===ui.playerOverlay)closePlayer();});
function openVideoDB(){
  if(state.dbPromise)return state.dbPromise;
  state.dbPromise=new Promise(resolve=>{
    if(!("indexedDB" in window)){resolve(null);return;}
    try{
      const request=indexedDB.open("tomato-takeover-videos",1);
      request.onupgradeneeded=()=>request.result.createObjectStore("videos");
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>resolve(null);
      request.onblocked=()=>resolve(null);
    }catch{resolve(null);}
  });
  return state.dbPromise;
}
async function saveVideo(id,blob){
  const db=await openVideoDB();if(!db)return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction("videos","readwrite");
      tx.objectStore("videos").put(blob,id);
      tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);
    }catch{resolve(false);}
  });
}
async function loadVideoURL(id){
  if(state.postsVideo.has(id))return state.postsVideo.get(id);
  const db=await openVideoDB();if(!db)return null;
  const blob=await new Promise(resolve=>{
    try{
      const req=db.transaction("videos","readonly").objectStore("videos").get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    }catch{resolve(null);}
  });
  if(!blob)return null;
  const url=URL.createObjectURL(blob);
  state.postsVideo.set(id,url);
  return url;
}
function returningViews(){
  if(!state.started||document.hidden||!state.saved.posts.length)return;
  const update=returningAudience(state.saved.posts,state.saved.followers);
  state.saved.posts=update.posts;
  state.saved.cash+=update.earned;
  state.saved.totalViews+=update.totalViews;
  state.saved.totalLikes+=update.totalLikes;
  state.saved.totalEarnings+=update.earned;
  persist();syncHud();
  if(state.menu==="social")renderSocial();
  if(update.totalViews>0)announce("Deine Follower schauen ältere Videos erneut · +"+compact(update.totalViews)+" Views",2200);
}
setInterval(returningViews,45_000);

let audio;
function playBeep(name){
  try{
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==="suspended")audio.resume().catch(()=>{});
    const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type="triangle";
    const tones={throw:[380,175],splat:[160,95],rec:[650,830],buy:[490,680],viral:[500,1200],click:[340,390],travel:[230,520]};
    const [a,b]=tones[name]||tones.click;
    osc.frequency.setValueAtTime(a,t);osc.frequency.exponentialRampToValueAtTime(b,t+.16);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(.045,t+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,t+.23);
    osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.25);
  }catch{}
}
// Guard against a blank loading experience if the 3D module loaded but WebGL failed.
syncHud();
createEngine();
