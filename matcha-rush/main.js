import * as THREE from "three";
import {
  LANES, POWER, POWER_TYPES, SETTINGS, SAVE_KEY,
  newRun, restoreRecords, tickRun, switchLane, jump, slide, activatePower,
  takeMatcha, hitObstacle, generateRow, grade, formatNumber
} from "./logic.mjs";
import { createRunner, matchaPickup, createObstacle, createPowerup } from "./models.js";
import { createEnvironment } from "./world.js";

const $=id=>document.getElementById(id);
const ui=Object.fromEntries([
  "gameCanvas","scoreValue","bestValue","cupValue","distanceValue","soundButton","soundIcon",
  "pauseButton","pauseIcon","powersHud","boostChip","boostBar","jetpackChip","jetpackBar",
  "magnetChip","magnetBar","x2Chip","x2Bar","speedValue","pickupToast","nearNotice",
  "multiLabel","streakText","touchPad","touchLeft","touchRight","touchJump","touchSlide",
  "screen","screenEyebrow","homePanel","pausePanel","gameOverPanel","startButton","startLabel",
  "loadStatus","resumeButton","restartPaused","gameOverReason","finalScore","finalCups",
  "finalDistance","newRecord","restartButton","fallback"
].map(id=>[id,$(id)]));
const mobile=matchMedia("(pointer:coarse)").matches;
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const state={
  run:newRun(),records:restoreRecords(readSave()),mode:"home",
  renderer:null,scene:null,camera:null,environment:null,hero:null,
  items:[],particles:[],spawnIndex:0,nextSpawnZ:0,renderX:LANES[1],
  last:0,hudAccumulator:0,worldTime:0,audio:null,sound:true,
  swipe:null,toastTimeout:null,nearTimeout:null,qa:new URLSearchParams(location.search).has("qa")
};
function readSave(){try{return localStorage.getItem(SAVE_KEY);}catch{return null;}}
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state.records));}catch{}}
const fmt=n=>formatNumber(n);
const sound=(type)=>{
  if(!state.sound)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    state.audio ||= new Audio();
    if(state.audio.state==="suspended")state.audio.resume().catch(()=>{});
    const tones={cup:[600,970],power:[440,1100],boost:[320,730],jump:[490,710],
      slide:[280,220],lane:[340,410],crash:[210,95],start:[460,840],record:[740,1120]};
    const [a,b]=tones[type]||tones.lane;
    const ctx=state.audio,osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    osc.type=type==="crash"?"sawtooth":"triangle";
    osc.frequency.setValueAtTime(a,now);
    osc.frequency.exponentialRampToValueAtTime(b,now+.16);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(type==="crash"?.07:.035,now+.016);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.23);
    osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.24);
  }catch{}
};
function toast(text,color="#f0ffe1"){
  ui.pickupToast.textContent=text;
  ui.pickupToast.style.color=color;
  ui.pickupToast.classList.remove("show");void ui.pickupToast.offsetWidth;
  ui.pickupToast.classList.add("show");
  clearTimeout(state.toastTimeout);
  state.toastTimeout=setTimeout(()=>ui.pickupToast.classList.remove("show"),1150);
}
function showScreen(mode){
  state.mode=mode;
  ui.screen.hidden=mode==="playing";
  ui.homePanel.hidden=mode!=="home";
  ui.pausePanel.hidden=mode!=="pause";
  ui.gameOverPanel.hidden=mode!=="gameover";
  ui.screenEyebrow.textContent=mode==="home"?"THE SWEETEST ENDLESS RUNNER":
    mode==="pause"?"RUN PAUSED // VANILLA BREAK":"THE RUN IS OVER";
  ui.pauseButton.disabled=mode!=="playing"&&mode!=="pause";
  ui.pauseIcon.textContent=mode==="pause"?"▶":"Ⅱ";
  ui.touchPad.hidden=!mobile||mode!=="playing";
}
function hud(){
  const r=state.run;
  ui.scoreValue.textContent=fmt(Math.floor(r.score));
  ui.bestValue.textContent=fmt(Math.max(state.records.best,Math.floor(r.score)));
  ui.cupValue.textContent=fmt(r.matchas);
  ui.distanceValue.textContent=fmt(Math.floor(r.distance));
  ui.speedValue.textContent=Math.floor(r.speed)+" SPEED";
  ui.multiLabel.textContent=r.powers.x2>0?"2× SCORE ACTIVE":"1× SCORE";
  ui.streakText.textContent=r.combo>=25?"MATCHA MANIAC!":r.combo>=10?"SWEET COMBO ×"+r.combo:"KEEP RUNNING!";
  for(const kind of ["boost","jetpack","magnet","x2"]){
    const remaining=r.powers[kind],active=remaining>.001;
    ui[kind+"Chip"].hidden=!active;
    ui[kind+"Bar"].style.width=active?Math.round(remaining/POWER[kind].duration*100)+"%":"0%";
  }
}
function webGLAvailable(){
  try{
    const c=document.createElement("canvas");
    return !!(c.getContext("webgl2")||c.getContext("webgl"));
  }catch{return false;}
}
function init(){
  if(!webGLAvailable()){ui.fallback.hidden=false;ui.loadStatus.textContent="WEBGL NICHT VERFÜGBAR";return;}
  try{
    const renderer=new THREE.WebGLRenderer({canvas:ui.gameCanvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.25:1.6));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color("#9fcdb8");
    scene.fog=new THREE.Fog("#9fcdb8",36,124);
    scene.add(new THREE.HemisphereLight("#fff9e8","#679c87",2.0));
    const sun=new THREE.DirectionalLight("#fff3d9",2.7);
    sun.position.set(-20,35,14);scene.add(sun);
    const bounce=new THREE.DirectionalLight("#baf2d9",.6);bounce.position.set(25,8,-30);scene.add(bounce);
    const camera=new THREE.PerspectiveCamera(mobile?75:68,1,.06,180);
    state.renderer=renderer;state.scene=scene;state.camera=camera;
    state.environment=createEnvironment(scene);
    state.hero=createRunner();scene.add(state.hero.root);
    state.hero.root.position.set(0,0,SETTINGS.playerZ);
    resize();
    addEventListeners();
    state.last=performance.now();
    requestAnimationFrame(loop);
    ui.startButton.disabled=false;
    ui.startLabel.textContent="LET'S MATCHA!";
    ui.loadStatus.textContent="ECHTE 3D-WELT GELADEN • W/A/S/D ODER SWIPE";
    hud();
  }catch(error){
    console.error("MATCHA RUSH init",error);
    ui.fallback.hidden=false;ui.startButton.disabled=true;
    ui.loadStatus.textContent="3D konnte nicht initialisiert werden";
  }
}
function resize(){
  if(!state.renderer)return;
  const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
  state.renderer.setSize(w,h,false);
  state.camera.aspect=w/h;
  state.camera.updateProjectionMatrix();
}
function clearItems(){
  for(const entity of state.items)state.scene.remove(entity.group);
  for(const particle of state.particles){state.scene.remove(particle.mesh);particle.mesh.geometry.dispose();particle.mesh.material.dispose();}
  state.items=[];state.particles=[];
}
function spawnItem(type,z,lane,kind=null,y=0){
  const group=type==="cup"?matchaPickup():type==="power"?createPowerup(kind):createObstacle(kind);
  const entity={type,kind,lane,group,baseY:y,age:0,hasPassed:false,magnetised:false};
  group.position.set(LANES[lane],y,z);
  if(type==="cup")group.rotation.y=Math.random()*6.28;
  state.scene.add(group);state.items.push(entity);
  return entity;
}
function spawnRow(index,z){
  const row=generateRow(index);
  for(const obstacle of row.obstacles)spawnItem("obstacle",z,obstacle.lane,obstacle.kind);
  for(const cup of row.cups){
    const y=cup.high?5.63:.1;
    spawnItem("cup",z+cup.offset,cup.lane,null,y);
  }
  for(const power of row.powers)spawnItem("power",z+power.offset,row.powers[0].lane,power.type, .16);
}
function populate(){
  state.spawnIndex=0;
  for(let i=0;i<12;i++){
    spawnRow(state.spawnIndex++,-17-i*SETTINGS.rowSpacing);
  }
  state.nextSpawnZ=-17-12*SETTINGS.rowSpacing;
}
function resetRun(){
  clearItems();
  state.run=newRun();
  state.run.active=true;
  state.renderX=LANES[1];
  state.worldTime=0;
  state.hero.root.position.set(0,0,SETTINGS.playerZ);
  state.hero.body.scale.set(1,1,1);
  state.hero.body.position.set(0,0,0);
  state.hero.root.rotation.set(0,0,0);
  state.environment.dispose();state.environment=createEnvironment(state.scene);
  populate();
  hud();
}
function begin(){
  if(!state.renderer)return;
  resetRun();
  showScreen("playing");
  sound("start");
  toast("SWEET RUN! 🍵");
  ui.gameCanvas.focus();
}
function pause(){
  if(state.mode!=="playing")return;
  state.run.paused=true;showScreen("pause");sound("lane");
}
function resume(){
  if(state.mode!=="pause")return;
  state.run.paused=false;showScreen("playing");
  state.last=performance.now();ui.gameCanvas.focus();
}
function finish(reason){
  if(state.mode!=="playing"||state.run.ended)return;
  const r=state.run;r.ended=true;r.active=false;
  const points=Math.floor(r.score);
  const isNew=points>state.records.best;
  state.records.best=Math.max(state.records.best,points);
  state.records.bestDistance=Math.max(state.records.bestDistance,Math.floor(r.distance));
  state.records.totalMatchas+=r.matchas;state.records.runs++;
  writeSave();
  ui.finalScore.textContent=fmt(points);
  ui.finalCups.textContent=fmt(r.matchas);
  ui.finalDistance.textContent=fmt(Math.floor(r.distance))+" m";
  ui.gameOverReason.textContent=reason;
  ui.newRecord.hidden=!isNew;
  showScreen("gameover");hud();sound("crash");
}
function action(kind){
  if(state.mode!=="playing")return;
  if(kind==="left"||kind==="right"){
    const before=state.run.lane;
    switchLane(state.run,kind==="left"?-1:1);
    if(before!==state.run.lane)sound("lane");
  }else if(kind==="jump"){
    if(jump(state.run))sound("jump");
  }else if(kind==="slide"){
    if(slide(state.run))sound("slide");
  }
}
function makeBurst(x,y,z,color=0xe1ffd4,count=9){
  for(let i=0;i<count;i++){
    const mesh=new THREE.Mesh(
      new THREE.IcosahedronGeometry(.055+Math.random()*.085,0),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96,depthWrite:false})
    );
    mesh.position.set(x,y,z);state.scene.add(mesh);
    state.particles.push({
      mesh,life:.43+Math.random()*.40,
      velocity:new THREE.Vector3((Math.random()-.5)*5,1+Math.random()*4,(Math.random()-.5)*4)
    });
  }
}
function removeAt(i){
  const e=state.items[i];if(!e)return;
  state.scene.remove(e.group);state.items.splice(i,1);
}
function pickCup(i,e){
  const amount=takeMatcha(state.run,1);
  makeBurst(e.group.position.x,e.group.position.y+1,e.group.position.z,0xdafac7,6);
  removeAt(i);
  sound("cup");
  if(state.run.combo>0 && state.run.combo%20===0)toast("×"+state.run.combo+" MATCHA COMBO!");
  return amount;
}
function createSkyTrail(count=11){
  // Guaranteed collectible chain for the flight/launch state.
  for(let i=0;i<count;i++){
    const lane=state.run.lane;
    spawnItem("cup",SETTINGS.playerZ-9-i*2.55,lane,null,5.70+Math.sin(i*.5)*.18);
  }
}
function pickPower(i,e){
  const type=e.kind,definition=POWER[type];
  removeAt(i);
  if(!activatePower(state.run,type))return;
  makeBurst(LANES[e.lane],1.3,SETTINGS.playerZ,definition.color,21);
  if(type==="jetpack"||type==="pogo")createSkyTrail(type==="pogo"?8:16);
  toast(definition.name.toUpperCase()+"!", "#ffefd0");
  sound("power");
}
function updateObjects(dt,distance){
  const r=state.run;
  const player=new THREE.Vector3(state.renderX,r.y+1.65,SETTINGS.playerZ-.35);
  for(let i=state.items.length-1;i>=0;i--){
    const e=state.items[i],g=e.group;
    e.age+=dt;
    g.position.z+=distance;
    if(e.type==="cup"){
      g.rotation.y+=dt*1.8;
      if(r.powers.magnet>0){
        // Visible magnet: entire 3D latte physically accelerates toward the open mouth.
        const d=g.position.distanceTo(player);
        if(d<SETTINGS.magnetRadius){
          e.magnetised=true;
          const speed=Math.min(1,dt*(6.6+Math.max(0,SETTINGS.magnetRadius-d)*1.3));
          g.position.lerp(player,speed);
        }
      }
      if(!e.magnetised)g.position.y=e.baseY+Math.sin(state.worldTime*4+e.age)*.12;
      const dx=Math.abs(g.position.x-state.renderX),
        dz=Math.abs(g.position.z-SETTINGS.playerZ),
        dy=Math.abs((g.position.y+.83)-(r.y+1.2));
      if((dx<.92&&dz<.98&&dy<1.32)||
        (e.magnetised&&g.position.distanceTo(player)<1.4)){
        pickCup(i,e);continue;
      }
    }else if(e.type==="power"){
      g.rotation.y+=dt*1.3;
      g.position.y=e.baseY+Math.sin(state.worldTime*3+e.age)*.17;
      const dx=Math.abs(g.position.x-state.renderX),dz=Math.abs(g.position.z-SETTINGS.playerZ);
      if(dx<.99&&dz<1.16&&r.y<2.55){
        pickPower(i,e);continue;
      }
    }else{
      if(Math.abs(g.position.x-state.renderX)<1.35){
        const zWindow=e.kind==="train"?4.04:1.13;
        if(Math.abs(g.position.z-SETTINGS.playerZ)<zWindow){
          if(hitObstacle(r,e.kind)){
            finish(e.kind==="train"?"Der Mint Express hat deinen Run beendet!":
              e.kind==="arch"?"Bei diesem Schild wäre eine Rolle hilfreich gewesen!":
              "Das Hindernis war stärker. Nächster Run, nächster Matcha!");
            return;
          }
          if(!e.hasPassed){
            e.hasPassed=true;r.nearMisses++;
          }
        }
      }
    }
    // Destroy old entities only once they are safely behind the camera.
    if(g.position.z>SETTINGS.playerZ+13)removeAt(i);
  }
}
function updateParticles(dt){
  for(let i=state.particles.length-1;i>=0;i--){
    const p=state.particles[i];
    p.life-=dt;p.velocity.y-=7.5*dt;
    p.mesh.position.addScaledVector(p.velocity,dt);
    p.mesh.material.opacity=Math.max(0,Math.min(1,p.life*2));
    if(p.life<=0||p.mesh.position.y<.1){
      state.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();
      state.particles.splice(i,1);
    }
  }
}
function updateHero(dt){
  const target=LANES[state.run.lane];
  state.renderX=THREE.MathUtils.damp(state.renderX,target,13,dt);
  state.hero.update(state.worldTime,state.run,state.renderX);
  const r=state.run;
  // Dynamic, shoulder-height chase camera. Always looks down the real 3D tracks.
  const desiredX=state.renderX*.56,desiredY=5.0+r.y*.38,desiredZ=16.3+r.y*.12;
  const c=state.camera;
  c.position.x=THREE.MathUtils.damp(c.position.x,desiredX,5.0,dt);
  c.position.y=THREE.MathUtils.damp(c.position.y,desiredY,5.0,dt);
  c.position.z=THREE.MathUtils.damp(c.position.z,desiredZ,5.0,dt);
  c.lookAt(state.renderX*.55,1.50+r.y*.46,-11.8);
  state.hero.root.rotation.y=THREE.MathUtils.damp(state.hero.root.rotation.y,
    Math.max(-.18,Math.min(.18,(target-state.renderX)*.17)),9,dt);
}
function simulate(dt){
  const r=state.run;
  if(!r.active||r.paused||r.ended||state.mode!=="playing")return;
  tickRun(r,dt);
  const move=r.speed*dt;
  state.worldTime+=dt;
  state.environment.update(dt,r.speed);
  state.nextSpawnZ+=move;
  while(state.nextSpawnZ>SETTINGS.spawnZ){
    spawnRow(state.spawnIndex++,state.nextSpawnZ);
    state.nextSpawnZ-=SETTINGS.rowSpacing;
  }
  updateHero(dt);
  updateObjects(dt,move);
  updateParticles(dt);
  state.hudAccumulator+=dt;
  if(state.hudAccumulator>.08){state.hudAccumulator=0;hud();}
}
function loop(time){
  requestAnimationFrame(loop);
  if(!state.renderer)return;
  const dt=Math.min(.045,Math.max(0,(time-state.last)/1000));
  state.last=time;
  if(state.mode==="playing"&&!document.hidden)simulate(dt);
  else{
    // Keep a tasteful, non-distracting idle runner in the menu.
    state.worldTime+=dt*.55;
    if(state.hero){
      const fake=state.run;
      state.hero.update(state.worldTime,fake,state.renderX);
      if(state.mode==="home"){
        state.camera.position.set(0,5.3,16.8);
        state.camera.lookAt(0,1.4,-12);
      }
    }
  }
  state.renderer.render(state.scene,state.camera);
}
function addEventListeners(){
  window.addEventListener("resize",resize);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&state.mode==="playing")pause();
  });
  window.addEventListener("keydown",event=>{
    if(event.target instanceof HTMLElement&&["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName))return;
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(event.code))event.preventDefault();
    if(["Escape","KeyP"].includes(event.code)){
      if(state.mode==="playing")pause();
      else if(state.mode==="pause")resume();
      return;
    }
    if(event.repeat)return;
    if(state.mode!=="playing"){
      if(event.code==="Enter"||event.code==="Space"){
        if(state.mode==="home"||state.mode==="gameover")begin();
        else if(state.mode==="pause")resume();
      }
      return;
    }
    const actions={
      ArrowLeft:"left",KeyA:"left",
      ArrowRight:"right",KeyD:"right",
      ArrowUp:"jump",KeyW:"jump",Space:"jump",
      ArrowDown:"slide",KeyS:"slide"
    };
    if(actions[event.code])action(actions[event.code]);
  });
  const touchStart=e=>{
    if(state.mode!=="playing")return;
    const t=e.changedTouches[0];
    if(t)state.swipe={x:t.clientX,y:t.clientY,time:performance.now()};
  };
  const touchEnd=e=>{
    if(state.mode!=="playing"||!state.swipe)return;
    const t=e.changedTouches[0];if(!t)return;
    const dx=t.clientX-state.swipe.x,dy=t.clientY-state.swipe.y;
    state.swipe=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<27)return;
    if(Math.abs(dx)>Math.abs(dy))action(dx>0?"right":"left");
    else action(dy<0?"jump":"slide");
  };
  ui.gameCanvas.addEventListener("touchstart",touchStart,{passive:true});
  ui.gameCanvas.addEventListener("touchend",touchEnd,{passive:true});
  for(const [id,kind] of [["touchLeft","left"],["touchRight","right"],["touchJump","jump"],["touchSlide","slide"]])
    ui[id].addEventListener("click",()=>action(kind));
  ui.startButton.addEventListener("click",begin);
  ui.restartButton.addEventListener("click",begin);
  ui.restartPaused.addEventListener("click",begin);
  ui.resumeButton.addEventListener("click",resume);
  ui.pauseButton.addEventListener("click",()=>{
    if(state.mode==="playing")pause();else if(state.mode==="pause")resume();
  });
  ui.soundButton.addEventListener("click",()=>{
    state.sound=!state.sound;
    ui.soundButton.setAttribute("aria-pressed",String(state.sound));
    ui.soundIcon.textContent=state.sound?"♫":"×";
    if(state.sound)sound("lane");
  });
}
ui.startButton.disabled=true;
showScreen("home");
init();

// Local-only hooks for automated browser assertions. Never enabled on GitHub Pages.
if(state.qa && ["localhost","127.0.0.1"].includes(location.hostname)){
  window.__MATCHA_QA__={
    snapshot:()=>({
      mode:state.mode,score:Math.floor(state.run.score),cups:state.run.matchas,
      lane:state.run.lane,y:state.run.y,slide:state.run.slide,
      powers:{...state.run.powers},jetsVisible:state.hero?.jets.visible,
      boostersVisible:state.hero?.boosted.visible,mouthOpen:state.hero?.mouth.scale.y,
      items:state.items.length,record:state.records.best,
      sceneChildren:state.scene?.children.length
    }),
    grantPower:type=>{
      if(!POWER_TYPES.includes(type))return false;
      const e=spawnItem("power",SETTINGS.playerZ,state.run.lane,type,.16);
      e.group.position.x=state.renderX;
      return true;
    },
    spawnHazard:kind=>{
      if(!["train","crate","barrier","arch"].includes(kind))return false;
      const e=spawnItem("obstacle",SETTINGS.playerZ-1.5,state.run.lane,kind);
      e.group.position.x=state.renderX;return true;
    },
    spawnMatcha:(lane=state.run.lane)=>{
      spawnItem("cup",SETTINGS.playerZ-.5,lane,null,state.run.y<1?.12:state.run.y);
    },
    setPower:type=>activatePower(state.run,type),
    collect:()=>takeMatcha(state.run,1),
    crash:()=>finish("Testlauf beendet")
  };
}
