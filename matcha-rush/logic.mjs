/**
 * MATCHA RUSH — pure endless runner rules. No DOM or rendering dependencies.
 * Everything here can be tested with Node.
 */
export const LANES = Object.freeze([-2.85, 0, 2.85]);
export const POWER_TYPES = Object.freeze(["boost","jetpack","magnet","x2","pogo"]);
export const POWER = Object.freeze({
  boost: { name:"Vanilla Boost", duration:12, color:0xf0d68b, icon:"↟" },
  jetpack: { name:"Double Matcha Jet", duration:9, color:0xa7f3bd, icon:"✦" },
  magnet: { name:"Matcha Mouth", duration:12, color:0xf5b0a7, icon:"◉" },
  x2: { name:"2× MULTIPLIER", duration:13, color:0xf6e28a, icon:"2×" },
  pogo: { name:"Giant Matcha Launch", duration:0, color:0xbdf7af, icon:"↑" }
});
export const SETTINGS = Object.freeze({
  speed:17, maxSpeed:38, acceleration:.18, gravity:27, jump:11.6,
  boostedJump:16.8, pogoJump:23.8, jetAltitude:5.7,
  playerZ:7, spawnZ:-96, rowSpacing:9.2, cupValue:12,
  magnetRadius:11.5, collectRadius:1.22
});
export const SAVE_KEY="matcha-rush-records-v1";
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const asNumber=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
export function newRun(){
  return {
    active:false, paused:false, ended:false, seconds:0, distance:0, score:0, matchas:0,
    speed:SETTINGS.speed, lane:1, y:0, vy:0, slide:0, jets:0, pogoFlight:false,
    powers:{boost:0,jetpack:0,magnet:0,x2:0}, lastPower:"", combo:0,
    nearMisses:0, deaths:0
  };
}
export function restoreRecords(raw){
  try{
    const p=typeof raw==="string"?JSON.parse(raw):raw;
    if(!p||typeof p!=="object")throw Error("missing");
    const n=v=>clamp(Math.round(asNumber(v)),0,1e12);
    return {best:n(p.best),bestDistance:n(p.bestDistance),totalMatchas:n(p.totalMatchas),runs:n(p.runs)};
  }catch{return {best:0,bestDistance:0,totalMatchas:0,runs:0};}
}
export function tickRun(s,dt){
  if(!s.active||s.paused||s.ended||dt<=0||!Number.isFinite(dt))return s;
  const step=clamp(dt,0,.06);
  s.seconds+=step;
  s.speed=Math.min(SETTINGS.maxSpeed,SETTINGS.speed+s.seconds*SETTINGS.acceleration);
  const advance=s.speed*step;
  s.distance+=advance;
  s.score+=advance*(s.powers.x2>0?2:1);
  s.slide=Math.max(0,s.slide-step);
  for(const kind of ["boost","jetpack","magnet","x2"])s.powers[kind]=Math.max(0,s.powers[kind]-step);
  if(s.powers.jetpack>0){
    s.y=SETTINGS.jetAltitude;s.vy=0;s.pogoFlight=false;
  }else {
    s.vy-=SETTINGS.gravity*step;
    s.y+=s.vy*step;
    if(s.y<=0){s.y=0;s.vy=0;s.pogoFlight=false;}
  }
  return s;
}
export function switchLane(s,delta){
  if(s.ended)return s.lane;
  s.lane=clamp(s.lane+Math.sign(delta),0,2);return s.lane;
}
export function jump(s){
  if(!s.active||s.paused||s.ended||s.powers.jetpack>0||s.y>.04)return false;
  s.vy=s.powers.boost>0?SETTINGS.boostedJump:SETTINGS.jump;
  s.y=.045;s.slide=0;return true;
}
export function slide(s){
  if(!s.active||s.paused||s.ended||s.powers.jetpack>0||s.y>.1)return false;
  s.slide=.95;return true;
}
export function activatePower(s,type){
  if(!POWER_TYPES.includes(type)||s.ended)return false;
  s.lastPower=type;
  if(type==="pogo"){
    s.powers.jetpack=0;
    s.y=Math.max(s.y,.15);
    s.vy=SETTINGS.pogoJump;
    s.slide=0;
    s.pogoFlight=true;
  }else{
    s.powers[type]=POWER[type].duration;
    if(type==="jetpack"){s.y=SETTINGS.jetAltitude;s.vy=0;s.slide=0;}
  }
  return true;
}
export function takeMatcha(s,count=1){
  if(!s.active||s.ended)return 0;
  const c=clamp(Math.floor(asNumber(count)),0,100);
  s.matchas+=c;
  const gain=c*SETTINGS.cupValue*(s.powers.x2>0?2:1);
  s.score+=gain;
  s.combo=Math.min(s.combo+1,999);
  return gain;
}
export function hitObstacle(s,kind){
  if(s.ended||!s.active||s.powers.jetpack>0)return false;
  if(kind==="train")return s.y<3.25;
  if(kind==="arch")return s.y<2.8 && s.slide<=0 && s.y<.25;
  if(kind==="barrier")return s.y<1.14;
  if(kind==="crate")return s.y<1.0;
  return false;
}
/** Deterministic, bounded generator: never obstruct all 3 lanes in the same row. */
export function generateRow(row,rng=Math.random){
  const r=()=>clamp(asNumber(rng(),.5),0,.9999999);
  const obstacles=[],cups=[],powers=[];
  const count=row<3?0:r()<.48?1:r()<.74?2:0;
  const shuffled=[0,1,2].sort(()=>r()-.5);
  for(let i=0;i<count;i++){
    const lane=shuffled[i];
    const kind=r()<.15?"train":r()<.37?"arch":r()<.67?"barrier":"crate";
    obstacles.push({lane,kind});
  }
  const blocked=new Set(obstacles.map(o=>o.lane));
  const safe=[0,1,2].filter(l=>!blocked.has(l));
  const primary=safe[Math.floor(r()*safe.length)];
  const countCups=3+Math.floor(r()*3);
  for(let i=0;i<countCups;i++)cups.push({lane:primary,offset:(i-(countCups-1)/2)*1.47,high:false});
  if(row%5===0 && row>3){
    const skyLane=safe[Math.floor(r()*safe.length)];
    for(let i=0;i<3;i++)cups.push({lane:skyLane,offset:(i-1)*1.4,high:true});
  }
  // Every 9 rows a power-up. Rotate through the five requested types.
  if(row>2 && row%9===0){
    const type=POWER_TYPES[(Math.floor(row/9)-1)%POWER_TYPES.length];
    powers.push({type,lane:primary,offset:0});
  }
  return {obstacles,cups,powers};
}
export function grade(score){
  return score>=30000?"MATCHA LEGEND":score>=13000?"MATCHA MASTER":
    score>=5000?"VANILLA PRO":score>=1500?"FRESH RUNNER":"MATCHA ROOKIE";
}
export function formatTime(t){
  const seconds=Math.floor(Math.max(0,asNumber(t)));
  return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
}
export function formatNumber(n){return Math.floor(Math.max(0,asNumber(n))).toLocaleString("de-CH");}
