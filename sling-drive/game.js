/* SLING DRIVE — original, procedural 3D arcade game. No external assets or server. */
let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
} catch (firstError) {
  try { THREE = await import('https://unpkg.com/three@0.160.1/build/three.module.js'); }
  catch (secondError) {
    document.getElementById('load-error').classList.remove('hidden');
    throw secondError;
  }
}

const $ = id => document.getElementById(id);
const SAVE_KEY = 'sling-drive-save-v1';
const moneyFormat = n => Math.round(n).toLocaleString('de-CH');
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const lerp = (a,b,t) => a + (b-a)*t;
const hash = x => { const s=Math.sin(x*129.17+87.34)*43758.5453;return s-Math.floor(s); };
const defaultSave = () => ({coins:100,level:1,upgrade:{sling:0,car:0,income:0},best:{},sound:true});
function readSave(){try{const raw=JSON.parse(localStorage.getItem(SAVE_KEY));if(!raw || typeof raw!=='object')return defaultSave();return {...defaultSave(),...raw,upgrade:{...defaultSave().upgrade,...(raw.upgrade||{})}}}catch{return defaultSave()}}
let save=readSave();
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}};
const goal = () => 450+(save.level-1)*235;
const costs = {sling:n=>Math.round(140*Math.pow(1.59,n)/5)*5, car:n=>Math.round(155*Math.pow(1.55,n)/5)*5, income:n=>Math.round(110*Math.pow(1.66,n)/5)*5};
const effects = {sling:n=>`SCHUB +${Math.round(n*20)} %`,car:n=>`REICHWEITE +${Math.round(n*11)} %`,income:n=>`MÜNZEN ×${(1+n*.35).toFixed(1)}`};
const UPGRADE_MAX=12;
const game={mode:'ready',distance:0,speed:0,power:.42,charge:false,pointerId:null,pressStart:0,pressY:0,pressX:0,carX:0,targetX:0,steerDir:0,earnedPickup:0,collisions:0,elapsed:0,boost:0,finishTimer:0,noticeTimer:0,shake:0};
let audio=null;
function sound(freq=540,dur=.075,type='sine',vol=.065){if(!save.sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.71),audio.currentTime+dur);gain.gain.setValueAtTime(vol,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+dur);}catch{}}
function notice(message){const el=$('floating-text');el.textContent=message;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa5d2ff);scene.fog=new THREE.Fog(0xb4dcf2,90,240);
const canvas=$('game-canvas');const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.6;
const camera=new THREE.PerspectiveCamera(58,1,.2,290);
scene.add(new THREE.HemisphereLight(0xffffff,0x8abb6d,2.3));const sun=new THREE.DirectionalLight(0xfff4cf,2.7);sun.position.set(-35,65,-15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-40;sun.shadow.camera.right=40;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-20;sun.shadow.camera.near=.5;sun.shadow.camera.far=150;sun.shadow.bias=-.001;scene.add(sun);
const material = hex => new THREE.MeshLambertMaterial({color:hex,flatShading:true});
const grass=material(0x98d744),grass2=material(0x81c83c),roadMat=material(0x838c91),edgeMat=material(0xf6f4e5),lineMat=material(0xffe3a0),soil=material(0x80b93f);
const roadParts=[],SEG=28;
function mesh(geo,mat,x=0,y=0,z=0,shadow=false){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;return o}
const cube=(w,h,d,m,x=0,y=0,z=0,shadow=false)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,shadow);
const cylinder=(r1,r2,h,mat,rad=10)=>mesh(new THREE.CylinderGeometry(r1,r2,h,rad),mat);
const plane=mesh(new THREE.PlaneGeometry(540,540),grass);plane.rotation.x=-Math.PI/2;plane.position.set(0,-.26,56);plane.receiveShadow=true;scene.add(plane);
// Long straight road created from endlessly recycled chunks, keeping mobile GPU work predictable.
function makeRoad(){let g=new THREE.Group();g.add(cube(8.95,.16,SEG+.2,roadMat,0,-.105,0));
  for(const s of [-1,1]){g.add(cube(.25,.025,SEG,edgeMat,s*4.16,.003,0));g.add(cube(.27,.09,SEG,grass2,s*4.65,-.08,0));}
  for(let i=-3;i<=3;i++){g.add(cube(.13,.016,2.4,lineMat,0,.011,i*4.15));}
  scene.add(g);return g;}
for(let i=0;i<16;i++)roadParts.push(makeRoad());
const branch=material(0x846a3e),leafMats=[material(0x4eaa48),material(0x64b545),material(0x77c353),material(0x9bcd55),material(0x4c9a4c)];
const trunkGeo=new THREE.CylinderGeometry(.19,.27,2.4,7),leafGeo=new THREE.IcosahedronGeometry(1,1);
function makeTree(){const g=new THREE.Group();const t=mesh(trunkGeo,branch,0,1.2,0,true);g.add(t);for(let i=0;i<3;i++){const l=mesh(leafGeo,leafMats[i%leafMats.length],(i-1)*.60,2.7+((i%2)*.43),((i%2)*.4),true);l.scale.set(1.3,1.0,1.2);g.add(l);}scene.add(g);return g;}
const trees=Array.from({length:75},makeTree);
const hillMats=[material(0x9ada48),material(0x80cb3f),material(0xa6df56),material(0x83c54b)];
function makeHill(i){const m=mesh(new THREE.IcosahedronGeometry(1,1),hillMats[i%4]);m.scale.set(1,1,1);m.receiveShadow=true;scene.add(m);return m;}
const hills=Array.from({length:23},(_,i)=>makeHill(i));
const poles=new THREE.Group();scene.add(poles);
const white=material(0xffffff),red=material(0xec4646),leather=material(0xc17e35),metal=material(0x727778);
const slingPosts=[];
for(const s of [-1,1]){
  const pole=new THREE.Group();pole.position.set(s*3.2,0,-5.6);
  const rod=cylinder(.18,.25,3.55,white,12);rod.position.y=1.75;rod.rotation.z=s*.09;rod.castShadow=true;pole.add(rod);
  for(let j=0;j<5;j++){const stripe=cylinder(.196,.212,.29,red,12);stripe.position.set(-s*.09*(j/5),.52+j*.64,0);stripe.rotation.z=s*.09;pole.add(stripe);}
  const cap=cylinder(.27,.27,.24,red,12);cap.position.y=3.53;pole.add(cap);poles.add(pole);slingPosts.push(pole);
}
const cableMat=new THREE.MeshLambertMaterial({color:0xed4647}),cableGeom=new THREE.CylinderGeometry(.077,.077,1,8);const ropes=[];
for(let s of [-1,1]){const o=mesh(cableGeom,cableMat);scene.add(o);ropes.push({side:s,obj:o});}
function moveCable(o,a,b){const delta=b.clone().sub(a),length=delta.length();o.position.copy(a).addScaledVector(delta,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());o.scale.set(1,length,1);}

// Original low-poly sports car built from geometric primitives.
const car=new THREE.Group();scene.add(car);
const carPivot=new THREE.Group();car.add(carPivot);
const yellow=new THREE.MeshStandardMaterial({color:0xffbc1d,roughness:.47,metalness:.12,flatShading:true});
const dark=material(0x292d34),windowMat=new THREE.MeshStandardMaterial({color:0x395b68,roughness:.19,metalness:.1}),tire=material(0x2f3034),goldHub=material(0xffb816),lightMat=new THREE.MeshBasicMaterial({color:0xfff6bf}),tailMat=new THREE.MeshBasicMaterial({color:0xe43b3d});
const body=cube(2.31,.62,4.35,yellow,0,.92,0,true);carPivot.add(body);
const hood=cube(2.2,.17,1.49,yellow,0,1.27,1.32,true);carPivot.add(hood);
const cabin=cube(1.83,.77,2.02,yellow,0,1.66,-.43,true);carPivot.add(cabin);
const roof=cube(1.65,.13,1.50,yellow,0,2.105,-.52,true);carPivot.add(roof);
const windshield=cube(1.68,.64,.055,windowMat,0,1.72,.595);windshield.rotation.x=-.21;carPivot.add(windshield);
const rearWindow=cube(1.67,.63,.054,windowMat,0,1.70,-1.43);rearWindow.rotation.x=.21;carPivot.add(rearWindow);
for(let s of [-1,1]){
  const sideWin=cube(.035,.48,1.28,windowMat,s*.936,1.77,-.45);carPivot.add(sideWin);
  carPivot.add(cube(.2,.09,1.55,dark,s*.30,1.362,1.29));
  carPivot.add(cube(.17,.08,1.5,dark,s*.28,2.19,-.53));
  carPivot.add(cube(.29,.2,.09,lightMat,s*.87,1.14,2.202));
  carPivot.add(cube(.29,.16,.09,tailMat,s*.87,1.14,-2.20));
  const mirror=cube(.3,.20,.28,dark,s*1.05,1.54,.32,true);carPivot.add(mirror);
}
carPivot.add(cube(1.08,.17,.08,dark,0,.92,2.226));
const wheels=[];
for(const s of [-1,1])for(const z of [-1.43,1.48]){
  const tireMesh=cylinder(.53,.53,.33,tire,14);tireMesh.rotation.z=Math.PI/2;tireMesh.position.set(s*1.2,.58,z);tireMesh.castShadow=true;carPivot.add(tireMesh);
  const hub=cylinder(.31,.31,.351,goldHub,12);hub.rotation.z=Math.PI/2;hub.position.set(s*1.21,.58,z);carPivot.add(hub);wheels.push(tireMesh);
}
const spoiler=new THREE.Group();spoiler.add(cube(2.45,.16,.42,dark,0,2.22,-2.06,true));for(let s of [-1,1])spoiler.add(cube(.13,.64,.14,metal,s*.82,1.92,-2.06,true));carPivot.add(spoiler);
const rearFlame=mesh(new THREE.ConeGeometry(.42,1.15,8),new THREE.MeshBasicMaterial({color:0xffb12b,transparent:true,opacity:.8}));rearFlame.rotation.x=Math.PI/2;rearFlame.position.set(0,.88,-2.7);carPivot.add(rearFlame);rearFlame.visible=false;

// Procedural coins, crates, boost gates, collected and collided with only once per run.
const objects=[];const coinGold=new THREE.MeshStandardMaterial({color:0xffc526,metalness:.52,roughness:.28}),coinEdge=new THREE.MeshStandardMaterial({color:0xffed72,metalness:.39,roughness:.32});
function makeCoin(){const g=new THREE.Group();const disk=cylinder(.63,.63,.16,coinGold,16);disk.rotation.x=Math.PI/2;g.add(disk);const ring=mesh(new THREE.TorusGeometry(.47,.087,8,18),coinEdge);g.add(ring);const mark=cube(.105,.60,.035,coinEdge,0,0,.1);g.add(mark);scene.add(g);return g;}
const crateMat=material(0xd35c4a),crateStripe=material(0xffe8bb);
function makeCrate(){const g=new THREE.Group();g.add(cube(1.6,1.45,1.55,crateMat,0,.725,0,true));g.add(cube(1.65,.18,1.6,crateStripe,0,1.20,0));const band=cube(.22,1.44,1.63,crateStripe);g.add(band);scene.add(g);return g;}
function clearObjects(){for(const o of objects)scene.remove(o.obj);objects.length=0;}
function createObjects(){clearObjects();let s=42;let k=0;const end=Math.min(6000,goal()+100);while(s<end){
  const lane=Math.floor(hash(k*2.3+save.level*12)*3)-1;const x=lane*2.65;
  for(let j=0;j<2;j++){const c={type:'coin',x,worldZ:s+j*4.6,obj:makeCoin(),taken:false};objects.push(c);}
  if(k>1 && hash(k*4.69+save.level*8)>.51){const otherLane=((lane+1+Math.floor(hash(k*7.3)*2))%3)-1;const b={type:'crate',x:otherLane*2.65,worldZ:s+21,obj:makeCrate(),taken:false};objects.push(b);}
  k++;s+=36+hash(k*8.13)*9;
}}

const motes=[];const particleMat=new THREE.MeshBasicMaterial({color:0xf4f7d0,transparent:true,opacity:.8,depthWrite:false});const moteGeo=new THREE.SphereGeometry(.09,5,4);
for(let i=0;i<18;i++){const m=mesh(moteGeo,particleMat);m.visible=false;scene.add(m);motes.push({obj:m,life:0,x:0,y:0,z:0,vy:0});}
function burst(x,y,z){for(let i=0;i<7;i++){const p=motes.find(q=>q.life<=0);if(!p)break;p.life=.45+Math.random()*.35;p.x=x;p.y=y;p.z=z;p.vy=1+Math.random()*2;p.obj.visible=true;}}

function putWorld(){const d=game.distance;
  for(let i=0;i<roadParts.length;i++){
    const idx=Math.floor((d-95)/SEG)+i;
    roadParts[i].position.z=idx*SEG+SEG/2-d;
  }
  for(let i=0;i<trees.length;i++){
    const idx=Math.floor((d-75)/7)+i;const q=hash(idx*7.41),r=hash(idx*2.71+30),side=(idx%2===0?-1:1);
    const x=side*(6.1+Math.pow(q,.65)*25);
    const tree=trees[i];tree.position.set(x,-.04,idx*7+r*5-d);const scale=.72+r*.63;tree.scale.setScalar(scale);tree.rotation.y=hash(idx*9.97)*Math.PI*2;
  }
  for(let i=0;i<hills.length;i++){
    const idx=Math.floor((d-110)/32)+i, r=hash(idx*2.2+2),q=hash(idx*10.1+12),side=idx%2?1:-1;
    const h=hills[i];const scale=11+r*15;h.position.set(side*(20+q*30),scale*.36-2,idx*32-d+q*13);h.scale.set(scale,scale*(.43+q*.24),scale*(.9+r*.4));
  }
  poles.position.z=-d;
  for(const o of objects){const z=o.worldZ-d;o.obj.visible=!o.taken && z>-20 && z<175;o.obj.position.set(o.x,o.type==='coin'?2.05+Math.sin(THREE.MathUtils.degToRad(o.worldZ)+performance.now()*.003)*.12:0,z);if(o.type==='coin')o.obj.rotation.y=performance.now()*.0019;}
  // Pull the flexible slingshot cables onto the car while it is charging.
  for(const {side,obj} of ropes){obj.visible=game.mode==='ready'&&d===0;const a=new THREE.Vector3(side*3.2,3.4,-5.6-d);const b=new THREE.Vector3(game.carX+side*.65,1.42,car.position.z-2.0);moveCable(obj,a,b);}
}
function updateShop(){
  $('coins').textContent=moneyFormat(save.coins);
  $('level-label').textContent=`LEVEL ${String(save.level).padStart(2,'0')}`;
  $('goal-label').textContent=moneyFormat(goal())+' m';
  $('effect-income').textContent=effects.income(save.upgrade.income);
  $('effect-sling').textContent=effects.sling(save.upgrade.sling);
  $('effect-car').textContent=effects.car(save.upgrade.car);
  spoiler.visible=save.upgrade.car>=2;
  for(const key of ['sling','car','income']){
    const value=save.upgrade[key];$('level-'+key).textContent='LV '+(value+1);
    $('cost-'+key).textContent=value>=UPGRADE_MAX?'MAX':moneyFormat(costs[key](value));
    const pips=$('pips-'+key);pips.replaceChildren();for(let j=0;j<5;j++){let p=document.createElement('i');if(j<(value%5)||value>=UPGRADE_MAX)p.className='active';pips.append(p);}
    const btn=document.querySelector(`[data-upgrade="${key}"]`);btn.classList.toggle('cant-afford',save.coins<costs[key](value)||value>=UPGRADE_MAX);
  }
}
function buy(key){if(game.mode!=='ready')return;const n=save.upgrade[key],cost=costs[key](n);const btn=document.querySelector(`[data-upgrade="${key}"]`);
  if(n>=UPGRADE_MAX){notice('MAX LEVEL!');sound(240,.12);return;}
  if(save.coins<cost){notice('ZU WENIG MÜNZEN!');sound(185,.12,'triangle');btn.classList.remove('just-bought');void btn.offsetWidth;btn.classList.add('just-bought');return;}
  save.coins-=cost;save.upgrade[key]++;persist();updateShop();sound(740,.08);setTimeout(()=>sound(1050,.09),75);notice('UPGRADE! ✦');btn.classList.remove('just-bought');void btn.offsetWidth;btn.classList.add('just-bought');
}
for(const btn of document.querySelectorAll('[data-upgrade]'))btn.addEventListener('click',()=>buy(btn.dataset.upgrade));
function updateHUD(){
  $('distance-label').textContent=`${moneyFormat(game.distance)} m`;
  $('progress-fill').style.width=`${clamp(game.distance/goal()*100,0,100)}%`;
  $('speed-label').textContent=String(Math.round(game.speed*3.6));
  $('speed-live').textContent=`${Math.round(game.speed*3.6)} km/h`;
  $('power-fill').style.width=Math.round(game.power*100)+'%';
}
function setMode(mode){game.mode=mode;$('shop').classList.toggle('is-hidden',mode!=='ready');$('intro-prompt').classList.toggle('hidden',mode!=='ready');$('run-controls').classList.toggle('hidden',mode!=='run');$('run-hint').classList.toggle('hidden',mode!=='run');$('car-tag').style.opacity=mode==='run'?'0':'1';}
function resetRun(){game.distance=0;game.speed=0;game.power=.40;game.charge=false;game.pointerId=null;game.carX=0;game.targetX=0;game.steerDir=0;game.earnedPickup=0;game.collisions=0;game.elapsed=0;game.boost=0;game.shake=0;car.position.set(0,0,0);carPivot.rotation.set(0,0,0);createObjects();setMode('ready');updateHUD();updateShop();putWorld();}
function launch(){if(game.mode!=='ready')return;game.charge=false;game.power=clamp(game.power,.25,1);game.speed=(43+save.upgrade.sling*7.3)*(.69+game.power*.44);game.elapsed=0;game.distance=0;setMode('run');sound(180,.25,'sawtooth',.07);setTimeout(()=>sound(110,.21,'sawtooth',.055),70);notice('LOS GEHT’S!');}
function finish(win){if(game.mode!=='run')return;game.mode='finished';game.speed=0;game.steerDir=0;const prevLevel=save.level;
  const multiplier=1+save.upgrade.income*.35;
  const earned=Math.round((game.distance*.53+game.earnedPickup+(win?165+prevLevel*25:0))*multiplier);
  save.coins+=earned;
  save.best[prevLevel]=Math.max(save.best[prevLevel]||0,Math.round(game.distance));
  if(win)save.level++;persist();updateShop();updateHUD();
  $('result-stars').textContent=win?'⭐ ⭐ ⭐':'⭐ ⭐ ☆';
  $('result-eyebrow').textContent=win?'LEVEL GESCHAFFT!':'VERSUCH BEENDET';
  $('result-title').textContent=win?'UNGLAUBLICH!':'GUTER VERSUCH!';
  $('result-copy').textContent=win?'Neue Strecke freigeschaltet!':'Upgrade dein Auto, um noch weiter zu kommen!';
  $('result-distance').textContent=moneyFormat(game.distance)+' m';
  $('result-coins').textContent='+'+moneyFormat(earned)+' ●';
  $('result-progress').style.width=(clamp(game.distance/(win?450+(prevLevel-1)*235:goal())*100,0,100))+'%';
  $('result-next').textContent=win?`NÄCHSTES ZIEL: ${moneyFormat(goal())} m`:`ZIEL: ${moneyFormat(goal())} m · BESTE DISTANZ: ${moneyFormat(save.best[prevLevel]||0)} m`;
  $('result-button').innerHTML=win?'NÄCHSTES LEVEL <span>➜</span>':'UPGRADEN & WEITER <span>➜</span>';
  $('result').classList.remove('hidden');$('run-controls').classList.add('hidden');$('run-hint').classList.add('hidden');sound(win?880:370,.26,'triangle',.07);if(win)setTimeout(()=>sound(1100,.25,'triangle',.07),210);
}
$('result-button').addEventListener('click',()=>{$('result').classList.add('hidden');resetRun();sound(580,.08);});
$('settings-btn').addEventListener('click',()=>{$('settings').classList.remove('hidden');sound(490,.065)});
$('settings-close').addEventListener('click',()=>$('settings').classList.add('hidden'));
$('settings').addEventListener('click',e=>{if(e.target===$('settings'))$('settings').classList.add('hidden')});
$('sound-toggle').checked=!!save.sound;
$('sound-toggle').addEventListener('change',e=>{save.sound=e.target.checked;persist();if(save.sound)sound(660,.09)});
$('reset-button').addEventListener('click',()=>{if(!window.confirm('Möchtest du alle Münzen, Upgrades und Level wirklich zurücksetzen?'))return;save=defaultSave();persist();$('sound-toggle').checked=true;$('settings').classList.add('hidden');$('result').classList.add('hidden');resetRun();});

let inputDown=false,inputPointer=-1;
canvas.addEventListener('pointerdown',e=>{
  if(game.mode==='ready'){
    inputDown=true;inputPointer=e.pointerId;game.pressStart=performance.now();game.pressY=e.clientY;game.pressX=e.clientX;game.charge=true;game.power=.36;canvas.setPointerCapture(e.pointerId);e.preventDefault();
  }else if(game.mode==='run'){
    inputDown=true;inputPointer=e.pointerId;game.pressX=e.clientX;canvas.setPointerCapture(e.pointerId);e.preventDefault();
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!inputDown||e.pointerId!==inputPointer)return;
  if(game.mode==='ready'&&game.charge){let elapsed=(performance.now()-game.pressStart)/1300;let drag=(e.clientY-game.pressY)/Math.max(180,innerHeight*.33);game.power=clamp(.36+elapsed*.64+drag*.7,.3,1);updateHUD();}
  if(game.mode==='run'){const delta=(e.clientX-game.pressX)/Math.max(60,window.innerWidth);game.targetX=clamp(game.targetX+delta*11,-3.13,3.13);game.pressX=e.clientX;}
});
function release(e){if(!inputDown || e.pointerId!==inputPointer)return;inputDown=false;inputPointer=-1;
  if(game.mode==='ready'&&game.charge){game.power=clamp(game.power+(performance.now()-game.pressStart)/2500,.38,1);launch();}
}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
for(const btn of document.querySelectorAll('.steer-button')){
  const dir=Number(btn.dataset.dir);
  btn.addEventListener('pointerdown',e=>{e.preventDefault();game.steerDir=dir;btn.setPointerCapture(e.pointerId)});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(name,()=>{if(game.steerDir===dir)game.steerDir=0;});
}
const keys=new Set();
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','Space'].includes(e.key))e.preventDefault();keys.add(e.key);
  if((e.key===' '||e.key==='Enter')&&game.mode==='ready'&&$('settings').classList.contains('hidden')){game.power=.84;launch();}
});window.addEventListener('keyup',e=>keys.delete(e.key));

function onCoin(o){o.taken=true;o.obj.visible=false;game.earnedPickup+=24+save.level*2;burst(o.x,2,o.obj.position.z);notice('+ '+(24+save.level*2)+' ●');sound(920,.09,'triangle',.045);}
function onCrate(o){o.taken=true;o.obj.visible=false;game.speed=Math.max(game.speed*.66,game.speed-15);game.collisions++;game.shake=.42;burst(o.x,1,o.obj.position.z);notice('CRASH!');sound(120,.21,'square',.07);}
function animate(dt,time){const d=game.distance;
  if(game.mode==='ready'){
    if(game.charge){let extra=(performance.now()-game.pressStart)/1400;game.power=clamp(Math.max(game.power,.36+extra*.42),.3,1);}else game.power=.44+Math.sin(time*1.4)*.03;
    car.position.z=-game.power*2.2;car.position.y=Math.sin(time*2.3)*.035;
    carPivot.rotation.z=Math.sin(time*1.2)*.025;
  }else if(game.mode==='run'){
    game.elapsed+=dt;
    game.speed=Math.max(0,game.speed-(3.8/(1+save.upgrade.car*.115))*dt);
    if(game.steerDir!==0)game.targetX+=game.steerDir*5.3*dt;
    if(keys.has('ArrowLeft')||keys.has('a'))game.targetX-=5.3*dt;
    if(keys.has('ArrowRight')||keys.has('d'))game.targetX+=5.3*dt;
    game.targetX=clamp(game.targetX,-3.25,3.25);
    game.carX=lerp(game.carX,game.targetX,Math.min(1,dt*7));
    game.distance+=game.speed*dt;
    car.position.z=0;
    car.position.x=game.carX;
    car.position.y=.015+Math.sin(time*19)*Math.min(.05,game.speed*.0012);
    carPivot.rotation.z=lerp(carPivot.rotation.z,(game.targetX-game.carX)*-.045,Math.min(1,dt*5));
    carPivot.rotation.x=Math.sin(time*16)*.012;
    wheels.forEach(w=>w.rotation.x-=game.speed*dt*.28);
    rearFlame.visible=game.speed>34;rearFlame.scale.setScalar(.8+Math.random()*.4);
    for(const o of objects){if(o.taken)continue;if(Math.abs(o.worldZ-game.distance)<2.5&&Math.abs(o.x-game.carX)<(o.type==='coin'?1.45:1.48)){
      if(o.type==='coin')onCoin(o);else onCrate(o);
    }}
    if(game.distance>=goal())finish(true);
    else if(game.speed<.2)finish(false);
  }else{rearFlame.visible=false;carPivot.rotation.z=lerp(carPivot.rotation.z,0,dt*5);}
  if(game.shake>0)game.shake-=dt;
  for(const p of motes){if(p.life>0){p.life-=dt;p.y+=p.vy*dt;p.z-=dt*9;p.obj.position.set(p.x,p.y,p.z);if(p.life<=0)p.obj.visible=false;}}
  putWorld();
  updateHUD();
  camera.position.set(7.2+game.carX*.14+(game.shake>0?(Math.random()-.5)*.4:0),7.3+(game.mode==='run'?Math.sin(time*13)*.07:0),-18.8);
  const aimX=game.carX*.24;
  camera.lookAt(aimX,1.5,10.5);
}
function resize(){let w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?58:52;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
let last=performance.now();
function frame(now){let dt=Math.min(.045,Math.max(.001,(now-last)/1000));last=now;animate(dt,now/1000);renderer.render(scene,camera);requestAnimationFrame(frame);}
resetRun();resize();requestAnimationFrame(frame);