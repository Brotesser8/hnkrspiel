/* ROAD EVOLVE — 100% original, dependency-free WebGL 3D arcade game.
   Perspective, vertex-lit meshes, spatial terrain, 3D car, trees and bridges.
   All content is generated at runtime; no external SDK or downloaded models. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('world');
let gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});
if(!gl){$('gl-fallback').classList.remove('hidden');return;}
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const hash=(v)=>{let x=Math.sin(v*127.14+33.25)*43758.5453;return x-Math.floor(x)};
const fmt=n=>Math.floor(n).toLocaleString('de-CH');
const key='road-evolve-v2';const defaults=()=>({coins:150,level:1,upgrade:{sling:0,car:0,income:0},best:{},sound:true,camera:20});
function load(){try{let d=JSON.parse(localStorage.getItem(key));if(!d)return defaults();return {...defaults(),...d,upgrade:{...defaults().upgrade,...d.upgrade}}}catch{return defaults()}}
let save=load();const persist=()=>{try{localStorage.setItem(key,JSON.stringify(save))}catch{}};
const cost={sling:n=>Math.round(120*Math.pow(1.42,n)/10)*10,car:n=>Math.round(150*Math.pow(1.48,n)/10)*10,income:n=>Math.round(90*Math.pow(1.46,n)/10)*10};
const goal=()=>360+(save.level-1)*175;
const maxUp=24;
const $m=$('money'),$level=$('level'),$distance=$('distance'),$target=$('target'),$progress=$('progress'),$speed=$('speed'),$carName=$('car-name'),$power=$('power-fill');
let audioCtx=null;
function beep(h=500,d=.09){if(!save.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();let osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.setValueAtTime(h,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(h*.7,audioCtx.currentTime+d);gain.gain.setValueAtTime(.06,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);osc.connect(gain).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+d)}catch{}}
let toastTimeout=null;function toast(msg){const e=$('toast');e.textContent=msg;e.classList.remove('show');void e.offsetWidth;e.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>e.classList.remove('show'),1070)}
function refreshShop(){let upd=save.upgrade;$m.textContent=fmt(save.coins);$level.textContent='LEVEL '+save.level;$target.textContent=fmt(goal())+' m 🏁';$carName.textContent=upd.car<3?'SPORT CAR':upd.car<7?'GT RACER':upd.car<12?'SUPER GT':'HYPER CAR';for(let type of ['sling','car','income']){let n=upd[type],c=cost[type](n),b=document.querySelector('.upgrade[data-type="'+type+'"]');$('level-'+type).textContent=n+1;$('price-'+type).textContent=n>=maxUp?'MAX':fmt(c);b.disabled=n>=maxUp;b.classList.toggle('canbuy',save.coins>=c && n<maxUp);let p=$('pips-'+type);p.innerHTML='';for(let i=0;i<5;i++){let s=document.createElement('i');if(i<Math.min(5,1+n%5))s.className='active';p.appendChild(s);}let effect=type==='sling'?`POWER +${Math.round(n*17)}%`:type==='car'?`MOTOR +${Math.round(n*14)}%`:`GELD ×${(1+n*.38).toFixed(1)}`;$('value-'+type).textContent=effect;}}
function buy(type){if(state.mode!=='ready')return;let n=save.upgrade[type],c=cost[type](n);if(n>=maxUp)return;if(save.coins<c){toast('ZU WENIG MÜNZEN');beep(170,.1);return;}save.coins-=c;save.upgrade[type]++;persist();refreshShop();if(type==='car')makeCar();const b=document.querySelector('.upgrade[data-type="'+type+'"]');b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');beep(720,.09);toast('UPGRADE! +1 ⭐');}
for(let b of document.querySelectorAll('.upgrade'))b.addEventListener('click',()=>buy(b.dataset.type));
const col={grass:[.55,.83,.22],grass2:[.47,.74,.19],grass3:[.62,.88,.31],road:[.54,.57,.58],road2:[.58,.61,.63],line:[.97,.93,.72],dirt:[.67,.65,.40],wood:[.43,.31,.16],leaf:[.26,.65,.26],leaf2:[.35,.74,.30],leaf3:[.44,.79,.32],rock:[.52,.55,.51],water:[.20,.61,.80],white:[.95,.97,.97],red:[.98,.25,.24],yellow:[1,.72,.025],gold:[1,.75,.09],black:[.08,.10,.13],glass:[.18,.30,.39],silver:[.73,.79,.84],wheel:[.10,.12,.16],blue:[.17,.67,.99],stripe:[.14,.15,.20]};
const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uViewProjection;uniform mat4 uModel;uniform vec3 uEye;varying vec3 vColor;varying float vFog;void main(){vec4 world=uModel*vec4(aPosition,1.0);vec3 normal=normalize(mat3(uModel)*aNormal);float sunshine=max(0.0,dot(normal,normalize(vec3(-0.48,0.88,-0.23))));float diffuse=0.70+0.30*sunshine;vColor=aColor*diffuse;vFog=clamp((distance(world.xyz,uEye)-100.0)/175.0,0.0,1.0);gl_Position=uViewProjection*world;}`;
const fs=`precision mediump float;varying vec3 vColor;varying float vFog;uniform float uAlpha;void main(){vec3 fog=vec3(0.72,0.85,0.80);gl_FragColor=vec4(mix(vColor,fog,vFog),uAlpha);}`;
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader: '+gl.getShaderInfoLog(s));return s}
let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}catch(e){console.error(e);$('gl-fallback').textContent='3D konnte nicht gestartet werden: '+e.message;$('gl-fallback').classList.remove('hidden');return}
gl.useProgram(program);
const attrs={pos:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),color:gl.getAttribLocation(program,'aColor')};const uniforms={vp:gl.getUniformLocation(program,'uViewProjection'),model:gl.getUniformLocation(program,'uModel'),eye:gl.getUniformLocation(program,'uEye'),alpha:gl.getUniformLocation(program,'uAlpha')};
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.61,.80,1,1);gl.disable(gl.CULL_FACE);
const id=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function model(x=0,y=0,z=0,ry=0,sx=1,sy=1,sz=1){let c=Math.cos(ry),s=Math.sin(ry);return new Float32Array([c*sx,0,-s*sx,0, 0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(e,t){let z=[e[0]-t[0],e[1]-t[1],e[2]-t[2]],len=Math.hypot(...z);z=z.map(v=>v/len);let x=[z[2],0,-z[0]];len=Math.hypot(...x);x=x.map(v=>v/(len||1));let y=[z[1]*x[2]*-1+z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]]; // cross(z,x)
// re-evaluate with orthodox cross product
 y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1])}
function mul(a,b){let o=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[4*j+i]+=a[4*k+i]*b[4*j+k];return o}
class Builder{constructor(){this.v=[];}tri(a,b,c,color){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;let l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;for(const p of [a,b,c])this.v.push(p[0],p[1],p[2],nx,ny,nz,...color);return this;}
quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);return this}
box(x,y,z,w,h,d,color,yaw=0){let rx=w/2,ry=h/2,rz=d/2,co=Math.cos(yaw),si=Math.sin(yaw);const cv=(xx,yy,zz)=>[x+xx*co+zz*si,y+yy,z+zz*co-xx*si];const p=[cv(-rx,-ry,-rz),cv(rx,-ry,-rz),cv(rx,ry,-rz),cv(-rx,ry,-rz),cv(-rx,-ry,rz),cv(rx,-ry,rz),cv(rx,ry,rz),cv(-rx,ry,rz)];for(let q of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])this.quad(...q.map(i=>p[i]),color);return this}
prism(x,y,z,w1,w2,h,d,color){let p=[[x-w1/2,y,z-d/2],[x+w1/2,y,z-d/2],[x+w1/2,y,z+d/2],[x-w1/2,y,z+d/2],[x-w2/2,y+h,z-d/2],[x+w2/2,y+h,z-d/2],[x+w2/2,y+h,z+d/2],[x-w2/2,y+h,z+d/2]];for(let a of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])this.quad(...a.map(j=>p[j]),color);return this}
cylinder(x,y,z,r,h,color,n=8,axis='y'){let a0=-h/2,a1=h/2;const pt=(a,ang)=>{let co=Math.cos(ang),si=Math.sin(ang);return axis==='x'?[x+a,y+r*co,z+r*si]:axis==='z'?[x+r*co,y+r*si,z+a]:[x+r*co,y+a,z+r*si]};for(let j=0;j<n;j++){let a=j*2*Math.PI/n,b=(j+1)*2*Math.PI/n;this.quad(pt(a0,a),pt(a0,b),pt(a1,b),pt(a1,a),color);let center0=axis==='x'?[x+a0,y,z]:axis==='z'?[x,y,z+a0]:[x,y+a0,z];let center1=axis==='x'?[x+a1,y,z]:axis==='z'?[x,y,z+a1]:[x,y+a1,z];this.tri(center0,pt(a0,b),pt(a0,a),color);this.tri(center1,pt(a1,a),pt(a1,b),color)}return this}
sphere(x,y,z,sx,sy,sz,color,n=7,m=5){let p=(u,v)=>[x+sx*Math.sin(v)*Math.cos(u),y+sy*Math.cos(v),z+sz*Math.sin(v)*Math.sin(u)];for(let j=0;j<m;j++)for(let i=0;i<n;i++){let a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,v0=j*Math.PI/m,v1=(j+1)*Math.PI/m;this.quad(p(a,v0),p(a,v1),p(b,v1),p(b,v0),color)}return this}
finish(){let arr=new Float32Array(this.v),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return {buffer,count:arr.length/9}}}
function destroy(mesh){if(mesh)gl.deleteBuffer(mesh.buffer)}
function draw(mesh,m=id(),alpha=1){if(!mesh || !mesh.count)return;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.enableVertexAttribArray(attrs.pos);gl.vertexAttribPointer(attrs.pos,3,gl.FLOAT,false,36,0);gl.enableVertexAttribArray(attrs.normal);gl.vertexAttribPointer(attrs.normal,3,gl.FLOAT,false,36,12);gl.enableVertexAttribArray(attrs.color);gl.vertexAttribPointer(attrs.color,3,gl.FLOAT,false,36,24);gl.uniformMatrix4fv(uniforms.model,false,m);gl.uniform1f(uniforms.alpha,alpha);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
function roadX(z){return 5*Math.sin(z*.0045)+2.1*Math.sin(z*.012)}
function roadY(z){return 1.0+2.1*Math.sin(z*.014)+1.15*Math.sin(z*.031)+.007*Math.max(z,0)}
function landscape(x,z){let d=Math.abs(x-roadX(z)),blend=smooth(6,20,d);let hills=2.7*Math.sin(x*.046+z*.018)+1.9*Math.sin(x*.069-z*.029)+2.0*Math.sin(x*.027+z*.010)+.045*Math.max(0,d-23);let river=(z%580+580)%580;let watercut=(river>184 && river<207 && d>9)?-1.5:0;return roadY(z)-.09+blend*(hills+watercut)}
const chunkSize=70;let chunks=new Map(),collected=new Set();
function roadBox(b,z,w,h,color,angle=0){const x=roadX(z),y=roadY(z);b.box(x,y,z,w,h,.22,color,angle)}
function tree(b,x,z,seed){let y=landscape(x,z),height=2.2+2.4*hash(seed+3);b.cylinder(x,y+height*.45,z,.18+height*.022,height*.9,col.wood,6);const variants=[col.leaf,col.leaf2,col.leaf3];b.sphere(x,y+height+.35,z,height*.43,height*.35,height*.46,variants[Math.floor(hash(seed+9)*3)],7,5);for(let j=0;j<2;j++){let ang=(seed+j*2.5)%6.28;b.sphere(x+Math.sin(ang)*.7,y+height*.76+j*.16,z+Math.cos(ang)*.55,height*.38,height*.31,height*.39,variants[((j+Math.floor(seed))%3+3)%3],7,5)}}
function makeChunk(n){const start=n*chunkSize,b=new Builder(),items=[];
// Extended traversable terrain on both sides of the road, not a lane-only backdrop.
const dx=8,dz=5;for(let z=start;z<start+chunkSize;z+=dz){for(let x=-120;x<120;x+=dx){const pts=[[x,landscape(x,z),z],[x+dx,landscape(x+dx,z),z],[x+dx,landscape(x+dx,z+dz),z+dz],[x,landscape(x,z+dz),z+dz]];let variation=hash(x*3.1+z*.19),color=variation>.8?col.grass3:variation>.3?col.grass:col.grass2;b.quad(...pts,color)}}
// Smooth winding road with shoulders, painted edges and centre stripes.
for(let z=start;z<start+chunkSize;z+=2){let z1=z+2,x0=roadX(z),x1=roadX(z1),y0=roadY(z),y1=roadY(z1);const quad=(a,bx,cy,d,c)=>b.quad(a,bx,cy,d,c);for(let side of [-1,1]){let aa=side*5.8,bb=side*5.0;quad([x0+aa,y0+.04,z],[x0+bb,y0+.065,z],[x1+bb,y1+.065,z1],[x1+aa,y1+.04,z1],col.dirt)}quad([x0-5,y0+.075,z],[x0+5,y0+.075,z],[x1+5,y1+.075,z1],[x1-5,y1+.075,z1],n%3?col.road:col.road2);for(let side of [-1,1])quad([x0+side*4.78,y0+.085,z],[x0+side*4.94,y0+.085,z],[x1+side*4.94,y1+.085,z1],[x1+side*4.78,y1+.085,z1],col.white);if(Math.floor(z/5)%3===0)quad([x0-.065,y0+.091,z],[x0+.065,y0+.091,z],[x1+.065,y1+.091,z1],[x1-.065,y1+.091,z1],col.line)}
// Low-poly trees, bushes, stones, road-side objects; no copied assets.
for(let j=0;j<36;j++){const s=n*121+j*13.37,zz=start+hash(s+42)*chunkSize,side=hash(s+5)<.5?-1:1,off=7+Math.pow(hash(s+12),.57)*89,xx=roadX(zz)+side*off;if(hash(s+2)>.14){tree(b,xx,zz,s)}else{const yy=landscape(xx,zz);b.sphere(xx,yy+.35,zz,.7, .35,.75,col.rock,6,4)}}
for(let j=0;j<23;j++){let s=n*83+j*4.23,zz=start+hash(s+17)*chunkSize,xx=roadX(zz)+(hash(s+22)<.5?-1:1)*(7+14*hash(s+19));let yy=landscape(xx,zz);b.sphere(xx,yy+.32,zz,.4,.42,.5,col.leaf2,6,4)}
// Special world props - bridges, striped posts and finish arch.
for(let z=Math.floor(start/110)*110;z<start+chunkSize;z+=110){if(z<0)continue;for(let side of [-1,1]){const xx=roadX(z)+side*7,yy=landscape(xx,z);b.cylinder(xx,yy+.85,z,.18,1.7,col.white,8);b.cylinder(xx,yy+1.25,z,.195,.28,col.red,8);b.sphere(xx,yy+1.72,z,.36,.24,.36,col.gold,8,5)}}
for(let z=Math.ceil(start/135)*135;z<start+chunkSize;z+=135){if(z<=30)continue;const x=roadX(z),y=roadY(z);b.box(x,y+.18,z,9.7,.25,4,col.dirt);for(let j=0;j<3;j++)b.box(x,y+.3+j*.07,z-1.4+j*1.4,9.6,.05,.22,col.yellow)}
if(start<=goal() && goal()<start+chunkSize){let zz=goal(),xx=roadX(zz),yy=roadY(zz);for(let sx of [-5.6,5.6])b.box(xx+sx,yy+3.0,zz,.5,6,.5,col.white);for(let k=0;k<10;k++)b.box(xx-4.8+k*1.07,yy+6.1,zz,1.07,.7,.5,k%2?col.white:col.black)}
// World collectibles and obstacles. Reproducible per run and per sector.
for(let j=0;j<3;j++){let s=n*301+j*119,zz=start+9+hash(s+7)*(chunkSize-15);if(zz<16 ||zz>goal()+35)continue;let xx=roadX(zz)+(hash(s+17)-.5)*8;items.push({id:n+':'+j,x:xx,z:zz,type:hash(s+12)<.21?'rock':'coin'});}
return {mesh:b.finish(),items};}
function refreshChunks(){let min=Math.floor((state.z-100)/chunkSize),max=Math.floor((state.z+390)/chunkSize);for(let i=min;i<=max;i++)if(!chunks.has(i))chunks.set(i,makeChunk(i));for(let [i,c] of chunks)if(i<min-1 || i>max+1){destroy(c.mesh);chunks.delete(i)}}
// Individual separate car mesh is rebuilt when an upgrade changes the visual model.
let carMesh=null,carShadow=null,coinMesh=null,rockMesh=null,slingshotMesh=null,slingshotBands=null;
function makeCar(){const b=new Builder(),v=save.upgrade.car,C= v>=15?[.94,.33,.04]:v>=9?[.96,.54,.06]:col.yellow;
// Underside and body. Forward direction points to positive Z.
b.box(0,.72,0,2.16,.57,4.05,C);b.box(0,.93,1.22,2.07,.23,1.85,C);b.box(0,.97,-1.41,2.14,.22,1.20,C);
// Windshield and sloping cabin sides with distinct actual depth.
const p={fl:[-.85,1.04,1.02],fr:[.85,1.04,1.02],bl:[-.86,1.04,-1.18],br:[.86,1.04,-1.18],tl:[-.69,1.71,.53],tr:[.69,1.71,.53],rl:[-.72,1.67,-.86],rr:[.72,1.67,-.86]};
b.quad(p.fl,p.fr,p.tr,p.tl,col.glass);b.quad(p.bl,p.rl,p.rr,p.br,col.glass);b.quad(p.fr,p.br,p.rr,p.tr,col.glass);b.quad(p.bl,p.fl,p.tl,p.rl,col.glass);b.quad(p.tl,p.tr,p.rr,p.rl,C);
// The characteristic black GT stripes run over the full bonnet and roof.
for(let x of [-.22,.22]){b.box(x,1.069,1.37,.20,.021,1.51,col.black);b.box(x,1.726,-.10,.18,.016,1.25,col.black);b.box(x,1.098,-1.56,.20,.018,.93,col.black)}
for(let x of [-.79,.79]){b.box(x,.99,2.045,.36,.22,.08,col.white);b.box(x,.89,-2.035,.38,.17,.07,col.red)}
b.box(0,.57,2.08,1.88,.2,.14,col.black);b.box(0,.56,-2.1,1.88,.2,.14,col.black);
// Four genuinely volumetric wheels with metal hubs.
for(let x of [-1.13,1.13])for(let z of [-1.23,1.28]){let r=.52+(Math.min(v,12)*.009);b.cylinder(x,.42,z,r,.36,col.wheel,12,'x');b.cylinder(x+(x>0?.19:-.19),.42,z,r*.63,.035,col.silver,12,'x');b.cylinder(x+(x>0?.22:-.22),.42,z,.10,.05,col.black,12,'x')}
if(v>=3){b.box(0,1.23,-2.03,2.12,.14,.43,col.black);b.box(-.83,1.02,-2.03,.13,.42,.14,col.black);b.box(.83,1.02,-2.03,.13,.42,.14,col.black)}
if(v>=6){b.box(-1.02,.87,1.35,.15,.22,1.2,col.black);b.box(1.02,.87,1.35,.15,.22,1.2,col.black);b.box(0,.78,2.18,1.4,.08,.18,col.silver)}
if(v>=10){b.box(0,.40,-1.99,1.3,.20,.12,col.silver);}
if(carMesh)destroy(carMesh);carMesh=b.finish();}
function makeMiniMeshes(){let b=new Builder();b.cylinder(0,0,0,.73,.15,col.gold,12,'z');b.cylinder(0,0,.08,.56,.012,col.yellow,12,'z');b.box(0,0,.11,.18,.72,.04,col.gold);b.box(0,0,.11,.72,.18,.04,col.gold);coinMesh=b.finish();b=new Builder();b.sphere(0,.52,0,.85,.70,.92,col.rock,8,5);rockMesh=b.finish();b=new Builder();for(let s of [-1,1]){b.cylinder(s*2.8,2.0,0,.18,4,col.red,9);b.cylinder(s*2.8,1.35,0,.205,.65,col.white,9);b.sphere(s*2.8,4.12,0,.28,.28,.28,col.wood,8,5)}slingshotMesh=b.finish();b=new Builder();for(let side of [-1,1]){b.box(side*1.42,2.55,-1.65,2.99,.09,.1,col.red,Math.PI*.0)}slingshotBands=b.finish()}
makeCar();makeMiniMeshes();
const state={mode:'ready',z:0,x:roadX(0),y:roadY(0),speed:0,vy:0,yaw:0,steer:0,steerKey:0,power:.45,chargeAt:0,pressX:0,pointerId:null,pickup:0,hit:0,time:0,stalled:0,earned:0,maxDistance:0,launchTime:0};
const resetCar=()=>{Object.assign(state,{mode:'ready',z:0,x:roadX(0),y:roadY(0),speed:0,vy:0,yaw:0,steer:0,steerKey:0,power:.45,chargeAt:0,pressX:0,pointerId:null,pickup:0,hit:0,time:0,stalled:0,earned:0,maxDistance:0,launchTime:0});collected.clear();for(const [i,c]of chunks){destroy(c.mesh);chunks.delete(i)}refreshChunks();refreshShop();$('progress').style.width='0%';$distance.textContent='0 m';$speed.textContent='0';$('power-fill').style.width='45%';document.body.classList.remove('playing');$('intro').classList.remove('hidden');$('shop').classList.remove('hidden');$('running-info').classList.add('hidden');$('steering').classList.add('hidden');$('result').classList.add('hidden');};
function startCharge(x){if(state.mode!=='ready')return;state.mode='charging';state.chargeAt=performance.now();state.power=.2;state.pressX=x;beep(370,.08)}
function release(){if(state.mode!=='charging')return;let hold=(performance.now()-state.chargeAt)/1000;let power=clamp(.37+hold*.48,.4,1.0);state.power=power;state.speed=(16+power*18)*(1+save.upgrade.sling*.13)+save.upgrade.car*1.5;state.vy=0;state.mode='run';state.launchTime=performance.now();document.body.classList.add('playing');$('intro').classList.add('hidden');$('shop').classList.add('hidden');$('running-info').classList.remove('hidden');$('steering').classList.remove('hidden');toast('🚀 GO!');beep(680,.14)}
function finish(won=false){if(state.mode!=='run')return;state.mode='result';document.body.classList.remove('playing');$('running-info').classList.add('hidden');$('steering').classList.add('hidden');let dist=Math.max(0,Math.round(state.maxDistance)),earned=Math.round((45+dist*.42+state.pickup*35)*(1+save.upgrade.income*.4));save.coins+=earned;save.best[save.level]=Math.max(dist,save.best[save.level]||0);if(won)save.level++;persist();refreshShop();$('result-emoji').textContent=won?'🏆':'🚗';$('result-overline').textContent=won?'LEVEL GESCHAFFT!':'VERSUCH BEENDET';$('result-title').textContent=won?'SUPER GEFAHREN!':'NOCH EIN VERSUCH!';$('result-copy').textContent=won?'Neues Gebiet freigeschaltet. Noch eine Runde!':'Sammle Münzen, verbessere deinen Wagen und fahr weiter.';$('result-distance').textContent=fmt(dist)+' m';$('result-money').textContent='+'+fmt(earned)+' ●';$('result-bar').style.width=clamp(dist/goal()*100,0,100)+'%';$('result').classList.remove('hidden');beep(won?900:410,.22)}
function update(dt){state.time+=dt;if(state.mode==='charging'){let hold=(performance.now()-state.chargeAt)/1000;state.power=clamp(.37+hold*.48,.4,1);$power.style.width=Math.round(state.power*100)+'%';}
if(state.mode!=='run')return;
let oldz=state.z,oldx=state.x;
const terrain=landscape(state.x,state.z),roadCenter=roadX(state.z),offRoad=Math.abs(state.x-roadCenter)>5.8;
// Actual momentum and gravity; road roughness/upgrade affect glide range.
const engine=(1+save.upgrade.car*.075),friction=offRoad?3.3/engine:1.12/engine;
const slope=(roadY(state.z+2)-roadY(state.z-2))*.25;
state.speed+=(-friction -slope*4.8)*dt;
state.speed=clamp(state.speed,0,122);state.speed=Math.max(0,state.speed);
let control=clamp(state.steer+state.steerKey,-1,1);state.yaw=lerp(state.yaw,clamp(control*.43,-.45,.45),Math.min(1,dt*2.7));
const direction=roadX(state.z+.6)-roadX(state.z-.6); // free steering plus road's gentle natural curve
state.z+=Math.cos(state.yaw)*state.speed*dt;
state.x+=Math.sin(state.yaw)*state.speed*dt*.78+direction*state.speed*dt*.42;
if(state.x>105)state.x=105;if(state.x<-105)state.x=-105;
// Launch from road ramps, and make jumps on the undulating terrain.
for(let r of [132,275,495,710,970,1250])if(oldz<r && state.z>=r && Math.abs(state.x-roadX(r))<7 && state.vy<=1){state.vy=4.2+Math.min(8,state.speed*.12);toast('BIG JUMP!');beep(810,.12)}
const newGround=landscape(state.x,state.z)+.06;
state.vy-=17*dt;state.y+=state.vy*dt;
if(state.y<newGround){state.y=newGround;if(state.vy<-.8 && state.speed>7)state.speed=Math.max(0,state.speed-Math.abs(state.vy)*.18);state.vy=0}
state.maxDistance=Math.max(state.maxDistance,state.z);
if(Math.floor(oldz/chunkSize)!==Math.floor(state.z/chunkSize))refreshChunks();
for(let c of chunks.values())for(let it of c.items){if(collected.has(it.id)||Math.abs(it.z-state.z)>2.1||Math.abs(it.x-state.x)>2.05||state.y>landscape(state.x,state.z)+3)continue;collected.add(it.id);if(it.type==='coin'){state.pickup++;toast('+35 🟡');beep(1100,.07)}else{state.hit++;state.speed*=.66;toast('💥 CRASH!');beep(160,.16)}}
if(state.z>=goal()){finish(true);return}
if(state.speed<1.7)state.stalled+=dt;else state.stalled=0;if(state.stalled>2.6 || state.z< -25 || state.time>125){finish(false);return}
}
let cameraEye=[7,12,-22],cameraTarget=[0,1,12],last=performance.now(),frame=0,uiTime=0;
function resize(){let dpr=Math.min(1.7,window.devicePixelRatio||1),w=Math.max(240,Math.floor(canvas.clientWidth*dpr)),h=Math.max(300,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}return w/h}
function drawScene(now){let aspect=resize(),running=state.mode==='run'||state.mode==='result';let cameraDist=save.camera||20;
let behind=running?cameraDist:cameraDist*.72,tilt=running?9:9.6,side=running?0:6.5;
const target=[state.x+Math.sin(state.yaw)*8*.35,state.y+2.1,state.z+10];
const want=[state.x + side-Math.sin(state.yaw)*behind,state.y+tilt,state.z - Math.cos(state.yaw)*behind];
let k=running?.10:.06;for(let i=0;i<3;i++){cameraEye[i]=lerp(cameraEye[i],want[i],k);cameraTarget[i]=lerp(cameraTarget[i],target[i],k)}
let vp=mul(perspective((running?68:61)*Math.PI/180,aspect,.15,800),lookAt(cameraEye,cameraTarget));
gl.uniformMatrix4fv(uniforms.vp,false,vp);gl.uniform3fv(uniforms.eye,new Float32Array(cameraEye));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
for(const c of chunks.values())draw(c.mesh);
// Gold coins and rocks are individual world objects, with rotation and depth.
for(const c of chunks.values())for(let item of c.items){if(collected.has(item.id))continue;let dz=item.z-state.z;if(dz<-20||dz>115)continue;let y=landscape(item.x,item.z);if(item.type==='coin'){draw(coinMesh,model(item.x,y+1.25+Math.sin(now*.002+item.z)*.13,item.z,now*.0018,1,1,1))}else draw(rockMesh,model(item.x,y,item.z,0,1,1,1));}
// Slingshot on real world coordinates; hides after launch as you drive away.
if(state.z<25){const ox=roadX(0),oy=roadY(0);draw(slingshotMesh,model(ox,oy,0,0,1,1,1));if(state.mode==='ready'||state.mode==='charging')draw(slingshotBands,model(ox,oy,0));}
// Low-poly car with all 4 actual 3D wheels and cast-like contact shadow.
const bodyY=state.y+(state.mode==='charging'?-clamp(state.power*.15,0,.18):0);
if(!carShadow){const b=new Builder();b.box(0,.018,0,2.9,.008,5.05,[.25,.28,.23]);carShadow=b.finish()}
draw(carShadow,model(state.x,landscape(state.x,state.z)+.04,state.z,state.yaw,1,1,1));
const lean=(state.mode==='run'?Math.sin(state.time*18)*.006:0);draw(carMesh,model(state.x,bodyY+lean,state.z,state.yaw));
// Screen UI drawn at a limited frequency, independent of 3D frame rate.
if(now-uiTime>100){$distance.textContent=fmt(Math.max(0,Math.round(state.maxDistance)))+' m';$progress.style.width=clamp(state.maxDistance/goal()*100,0,100)+'%';$speed.textContent=fmt(state.speed*3.6);uiTime=now;}
}
function loop(now){let dt=Math.min(.05,(now-last)/1000||.016);last=now;update(dt);drawScene(now);requestAnimationFrame(loop)}
function steerFromPointer(x){const width=Math.max(240,canvas.clientWidth);state.steer=clamp((x-state.pressX)/(width*.25),-1,1)}
let drag=false;canvas.addEventListener('pointerdown',ev=>{ev.preventDefault();canvas.setPointerCapture(ev.pointerId);state.pointerId=ev.pointerId;state.pressX=ev.clientX;drag=true;if(state.mode==='ready')startCharge(ev.clientX);else if(state.mode==='run')state.steer=0});
canvas.addEventListener('pointermove',ev=>{if(!drag||ev.pointerId!==state.pointerId)return;ev.preventDefault();if(state.mode==='run')steerFromPointer(ev.clientX)});
function pointerUp(ev){if(ev.pointerId!==state.pointerId)return;drag=false;state.pointerId=null;if(state.mode==='charging')release();state.steer=0}
canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
window.addEventListener('keydown',ev=>{if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD'].includes(ev.code))ev.preventDefault();if(ev.code==='Space'){if(!ev.repeat&&state.mode==='ready'){startCharge(0)}else if(state.mode==='charging'&&ev.repeat)state.power=1}if(ev.code==='ArrowLeft'||ev.code==='KeyA')state.steerKey=-1;if(ev.code==='ArrowRight'||ev.code==='KeyD')state.steerKey=1});
window.addEventListener('keyup',ev=>{if(ev.code==='Space'&&state.mode==='charging')release();if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(ev.code))state.steerKey=0});
for(let type of ['left','right']){let el=$(type),value=type==='left'?-1:1;el.addEventListener('pointerdown',ev=>{ev.preventDefault();state.steerKey=value;el.setPointerCapture(ev.pointerId)});for(let evName of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(evName,()=>state.steerKey=0)}
$('continue').addEventListener('click',()=>{resetCar();beep(520,.1)});
$('settings-open').addEventListener('click',()=>{$('settings').classList.remove('hidden')});$('settings-close').addEventListener('click',()=>{$('settings').classList.add('hidden')});
$('sound').checked=save.sound;$('sound').addEventListener('change',e=>{save.sound=e.target.checked;persist()});$('cam-distance').value=save.camera||20;$('cam-distance').addEventListener('input',e=>{save.camera=+e.target.value;persist()});
$('reset').addEventListener('click',()=>{if(!confirm('Münzen, Level und Upgrades wirklich zurücksetzen?'))return;save=defaults();persist();makeCar();resetCar();$('settings').classList.add('hidden')});
window.addEventListener('resize',resize);window.addEventListener('blur',()=>{state.steerKey=0;state.steer=0;if(state.mode==='charging')release()});
resetCar();requestAnimationFrame(loop);
})();
