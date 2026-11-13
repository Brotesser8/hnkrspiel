import * as THREE from "three";

const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.77,metalness:.04,flatShading:true,...extra});
const basic=(c,opacity=1)=>new THREE.MeshBasicMaterial({color:c,transparent:opacity<1,opacity,depthWrite:opacity>=1});
const C={
  cream:mat("#ffebcf"),vanilla:mat("#fff8e6"),jade:mat("#86cf8f"),darkJade:mat("#32785e"),
  pale:mat("#c8f3c3"),matcha:mat("#5cae7e"),glass:new THREE.MeshPhysicalMaterial({
    color:"#e6fff2",transparent:true,opacity:.38,roughness:.15,metalness:0,
    clearcoat:1,clearcoatRoughness:.1,depthWrite:false,side:THREE.DoubleSide
  }),
  amber:mat("#f6ce95"),red:mat("#f38d81"),white:mat("#ffffff"),ink:mat("#213e3d"),
  stripe:mat("#f9ac9e"),greenGlow:new THREE.MeshBasicMaterial({color:"#c9fdb9",transparent:true,opacity:.75,depthWrite:false}),
  cupLiquid:mat("#78bf8c", { roughness:.34 }), ice:mat("#d4f6d6",{transparent:true,opacity:.74,depthWrite:false}),
  skin:mat("#e7ab83"),hoodie:mat("#73c3ac"),hoodieLight:mat("#b2efc8"),
  pants:mat("#344960"),shoes:mat("#f1e8d0"),hair:mat("#384a4c")
};
function add(g,geometry,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);g.add(m);return m;
}
const cyl=(g,rt,rb,h,n,m,x=0,y=0,z=0)=>add(g,new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
const box=(g,w,h,d,m,x=0,y=0,z=0)=>add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const orb=(g,r,m,x=0,y=0,z=0,detail=0)=>add(g,new THREE.IcosahedronGeometry(r,detail),m,x,y,z);
const torus=(g,r,t,m,x=0,y=0,z=0)=>add(g,new THREE.TorusGeometry(r,t,6,22),m,x,y,z);

function textTexture(text,bg="#2c7159",fg="#f8ffed"){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=148;
  const ctx=canvas.getContext("2d");
  if(!ctx)return null;
  ctx.fillStyle=bg;ctx.fillRect(0,0,512,148);
  ctx.strokeStyle="#ffffff55";ctx.lineWidth=7;ctx.strokeRect(9,9,494,130);
  ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="900 61px Arial, sans-serif";ctx.fillText(text,256,80,470);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export function sign(text,w=3,h=.75,bg="#2c7159",fg="#f8ffed"){
  const geo=new THREE.PlaneGeometry(w,h),tex=textTexture(text,bg,fg);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  return mesh;
}
/**
 * Real 3D vanilla matcha latte: transparent faceted cup, layers of milk + jade tea,
 * glistening rim, ice facets, vanilla whipped topping, spiral drizzle and straw.
 * No sprites, 2D stickers or remote 3D assets.
 */
export function createMatcha(){
  const g=new THREE.Group();g.name="vanilla-matcha-latte";
  // Cup body has an inner opaque drink, framed by a translucent plastic shell.
  cyl(g,.34,.27,.63,12,C.cream,0,.36,0);
  cyl(g,.365,.33,.39,12,C.cupLiquid,0,.68,0);
  cyl(g,.397,.295,.92,12,C.glass,0,.48,0);
  cyl(g,.35,.35,.055,14,C.darkJade,0,.885,0);
  const rim=torus(g,.401,.043,C.vanilla,0,.955,0);rim.rotation.x=Math.PI/2;
  // Vanilla cold foam dome plus discrete creamy tufts.
  orb(g,.342,C.vanilla,0,1.01,0,1);
  orb(g,.22,C.cream,-.145,1.14,-.06,1);
  orb(g,.19,C.vanilla,.14,1.15,.07,1);
  orb(g,.15,C.cream,.005,1.27,0,1);
  // Specks / drizzle atop the foam.
  const swirl=torus(g,.155,.023,C.jade,0,1.25,0);swirl.rotation.x=Math.PI/2;
  const straw=cyl(g,.055,.055,1.12,7,C.darkJade,.26,1.25,-.06);
  straw.rotation.z=-.22;
  cyl(g,.072,.072,.085,7,C.vanilla,.38,1.78,-.06).rotation.z=-.22;
  // Floating faceted ice: frozen pale cubes visible on the sides.
  box(g,.15,.12,.15,C.ice,-.12,.57,.26).rotation.z=.27;
  box(g,.13,.16,.13,C.ice,.13,.73,.25).rotation.z=-.22;
  // Small handcrafted matcha/vanilla label, rim detail.
  const badge=cyl(g,.17,.17,.025,18,C.vanilla,0,.42,.365);badge.rotation.x=Math.PI/2;
  const leaf=orb(g,.087,C.jade,-.035,.45,.385);leaf.scale.set(.7,1.24,.3);leaf.rotation.z=.36;
  const leaf2=orb(g,.07,C.darkJade,.055,.46,.395);leaf2.scale.set(.6,1,.32);leaf2.rotation.z=-.45;
  // Under-cup mint disk gives contrast even against the pale track.
  const foot=cyl(g,.34,.36,.07,14,C.pale,0,.04,0);
  // Soft luminous ground-level ring makes the drink readable from far away,
  // while all of the cup, straw and whipped vanilla remain real 3D geometry.
  const ring=torus(g,.53,.031,C.greenGlow,0,.10,0);
  ring.rotation.x=Math.PI/2;
  return g;
}
const lattePrototype=typeof document!=="undefined"?createMatcha():null;
export function matchaPickup(){
  const group=lattePrototype.clone(true);
  group.scale.setScalar(1.05);group.name="COLLECTIBLE_MATCHA";return group;
}
export function createRunner(){
  const root=new THREE.Group();root.name="matcha-hero";
  const body=new THREE.Group();root.add(body);
  const torso=box(body,.93,1.05,.61,C.hoodie,0,1.33,0);
  box(body,.72,.24,.08,C.hoodieLight,0,1.72,-.33);
  box(body,.43,.46,.07,C.pale,0,1.27,-.326);
  const zipper=box(body,.044,.51,.078,C.darkJade,0,1.26,-.367);
  const head=orb(body,.48,C.skin,0,2.18,-.03,1);
  // Detailed expressive face oriented toward -Z (direction of travel).
  for(const side of [-1,1]){
    orb(body,.067,C.ink,side*.175,2.26,-.47,1);
    orb(body,.025,C.white,side*.185,2.29,-.518);
    orb(body,.105,C.stripe,side*.31,2.08,-.356);
  }
  const mouth=orb(body,.14,C.ink,0,1.985,-.485,1);
  mouth.scale.set(1,.24,.22);
  const tooth=box(body,.14,.043,.03,C.vanilla,0,2.03,-.542);
  // Hair, folded cap, little 3D leaf badge.
  orb(body,.45,C.hair,0,2.5,.07,0).scale.set(1,.6,1);
  const cap=cyl(body,.43,.42,.22,9,C.darkJade,0,2.60,-.02);
  const brim=box(body,.61,.08,.45,C.pale,0,2.55,-.41);
  brim.rotation.x=-.12;
  orb(body,.1,C.cream,0,2.76,-.14);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const a=new THREE.Group();a.position.set(side*.6,1.74,0);body.add(a);
    cyl(a,.155,.14,.73,7,C.hoodie,side*.025,-.37,0);
    orb(a,.16,C.skin,side*.04,-.76,-.03);
    const cuff=cyl(a,.17,.16,.10,7,C.hoodieLight,side*.03,-.68,-.03);
    arms.push(a);
    const l=new THREE.Group();l.position.set(side*.23,.86,.03);body.add(l);
    cyl(l,.196,.18,.72,7,C.pants,0,-.37,0);
    const shoe=box(l,.39,.24,.73,C.shoes,0,-.80,-.16);
    box(l,.40,.08,.73,C.darkJade,0,-.92,-.16);
    legs.push(l);
  }
  const bag=box(body,.68,.74,.27,C.darkJade,0,1.25,.48);
  box(body,.5,.1,.06,C.pale,0,1.48,.65);
  // Booster shoes: oversized matcha sneakers with vanilla-white soles.
  const boosted=new THREE.Group();boosted.visible=false;body.add(boosted);
  for(const side of [-1,1]){
    box(boosted,.55,.41,.9,C.jade,side*.23,.12,-.15);
    box(boosted,.62,.12,.98,C.vanilla,side*.23,-.11,-.15);
    for(let k=0;k<3;k++)box(boosted,.26,.035,.075,C.cream,side*.23,.37,-.42+k*.19);
    orb(boosted,.18,C.pale,side*.23,.34,.13);
  }
  // Jetpack made from TWO enormous actual Vanilla-Matcha cups.
  const jets=new THREE.Group();jets.name="double-vanilla-matcha-jetpack";jets.visible=false;body.add(jets);
  for(const side of [-1,1]){
    const cup=matchaPickup();cup.position.set(side*.46,.78,.76);cup.scale.setScalar(.88);
    cup.rotation.z=side*.20;jets.add(cup);
    cyl(jets,.19,.12,.24,9,C.darkJade,side*.47,.74,.76);
    // Propulsion trails stream BACKWARD (+Z) from both Vanilla-Matcha cups.
    const flame=add(jets,new THREE.ConeGeometry(.20,1.15,7),
      new THREE.MeshBasicMaterial({color:0xb6ffb7,transparent:true,opacity:.88,depthWrite:false}),
      side*.47,.73,1.33);
    flame.rotation.x=-Math.PI/2;
    flame.userData.flame=true;
    const vapor=orb(jets,.17,C.pale,side*.47,.74,2.05);
    vapor.userData.flameParticle=true;
  }
  const halo=torus(body,.64,.047,C.greenGlow,0,2.17,0);
  halo.rotation.x=Math.PI/2;halo.visible=false;
  const mouthBeam=torus(body,.26,.036,C.greenGlow,0,2.0,-.62);mouthBeam.visible=false;
  return {
    root,body,head,mouth,tooth,arms,legs,boosted,jets,halo,mouthBeam,
    update(time,run,worldX){
      const runFreq=run.active&&!run.paused&&!run.ended?Math.sin(time*14):0;
      const airborne=run.y>.18;
      this.body.position.y=airborne ? .08 : Math.abs(runFreq)*.035;
      this.body.rotation.z=THREE.MathUtils.lerp(this.body.rotation.z,
        (run.active&&!run.paused? Math.sin(time*6)*.025:0),.12);
      this.arms[0].rotation.x=airborne?-.45:runFreq*.58;
      this.arms[1].rotation.x=airborne?-.45:-runFreq*.58;
      this.legs[0].rotation.x=airborne?-.19:-runFreq*.67;
      this.legs[1].rotation.x=airborne?.23:runFreq*.67;
      const crouch=run.slide>0&&run.y<.2;
      this.body.scale.y=THREE.MathUtils.lerp(this.body.scale.y,crouch?.57:1,.25);
      this.body.position.y+=crouch?-.30:0;
      this.boosted.visible=run.powers.boost>0;
      this.jets.visible=run.powers.jetpack>0;
      if(this.jets.visible){
        for(const flame of this.jets.children){
          if(flame.userData.flame)flame.scale.y=.8+Math.sin(time*31)*.23;
          if(flame.userData.flameParticle){
            flame.position.z=1.92+Math.sin(time*18)*.32;
            flame.scale.setScalar(.65+Math.abs(Math.sin(time*16))*.65);
          }
        }
      }
      const magnet=run.powers.magnet>0;
      this.halo.visible=magnet;this.mouthBeam.visible=magnet;
      this.mouth.scale.y=THREE.MathUtils.lerp(this.mouth.scale.y,magnet?1.3:.24,.15);
      this.mouth.scale.x=THREE.MathUtils.lerp(this.mouth.scale.x,magnet?1.2:1,.15);
      this.tooth.visible=!magnet;
      if(magnet){this.halo.rotation.z=time*1.5;this.mouthBeam.scale.setScalar(.8+Math.sin(time*11)*.16);}
      this.root.position.x=worldX;
      this.root.position.y=run.y;
    }
  };
}
const HAZARD_COLORS={barrier:mat("#fb9a85"),crate:mat("#daaa81"),arch:mat("#f4e8af"),train:mat("#a4bfc2")};
export function createObstacle(kind){
  const g=new THREE.Group();g.name="obstacle-"+kind;
  if(kind==="crate"){
    box(g,1.8,1.45,1.3,HAZARD_COLORS.crate,0,.76,0);
    box(g,1.88,.15,1.4,C.cream,0,1.47,0);
    box(g,.12,1.45,1.43,C.darkJade,-.56,.76,0);
    box(g,.12,1.45,1.43,C.darkJade,.56,.76,0);
    box(g,1.88,.14,1.45,C.darkJade,0,.85,0);
    const sticker=sign("FRAGILE",1.33,.41,"#fbf7e7","#6a7769");
    sticker.position.set(0,.91,.674);g.add(sticker);
  }else if(kind==="barrier"){
    box(g,2.6,.23,.34,C.cream,0,.3,0);
    box(g,2.45,1.10,.31,HAZARD_COLORS.barrier,0,1.01,0);
    for(let i=-1;i<=1;i++){
      const stripe=box(g,.4,1.19,.35,C.white,i*.72,1.02,0);
      stripe.rotation.z=.44;
    }
    for(const x of [-1.15,1.15])cyl(g,.07,.08,1.55,6,C.ink,x,.75,0);
    box(g,2.8,.12,.55,C.ink,0,.08,0);
  }else if(kind==="arch"){
    for(const side of [-1,1]){
      box(g,.22,2.9,.38,C.darkJade,side*1.30,1.46,0);
      box(g,.65,.14,.65,C.pale,side*1.3,.12,0);
    }
    box(g,2.95,.85,.44,HAZARD_COLORS.arch,0,2.68,0);
    const signBoard=sign("SLIDE ↓",2.5,.61,"#2c6757","#fff6cd");
    signBoard.position.set(0,2.68,.25);g.add(signBoard);
  }else{
    // Multi-faceted train carriage: opaque solid, readable hazards & glowing windows.
    box(g,2.59,3.38,7.8,HAZARD_COLORS.train,0,1.75,0);
    box(g,2.6,.43,8.1,C.darkJade,0,3.57,0);
    box(g,2.68,.21,8,C.cream,0,1.08,0);
    box(g,2.65,.19,8,C.darkJade,0,.21,0);
    for(let i=0;i<5;i++){
      box(g,2.1,.83,.07,C.darkJade,0,2.5,-3.1+i*1.49);
      box(g,1.82,.61,.09,C.pale,0,2.48,-3.1+i*1.49);
    }
    box(g,1.98,.98,.06,C.darkJade,0,2.62,3.93);
    box(g,1.7,.7,.07,C.pale,0,2.63,3.976);
    for(const x of [-.74,.74]){
      orb(g,.14,C.amber,x,.95,3.97);
    }
    const front=sign("MINT EXPRESS",2.15,.39,"#2c6757","#ffedcd");
    front.position.set(0,1.45,4);g.add(front);
  }
  return g;
}
export function createPowerup(type){
  const g=new THREE.Group();g.name="powerup-"+type;
  const halo=torus(g,.88,.065,C.greenGlow,0,1.12,0);
  halo.rotation.x=Math.PI/2;
  if(type==="pogo"){
    const huge=matchaPickup();huge.scale.setScalar(2.2);huge.position.y=.02;g.add(huge);
    const launch=torus(g,1.16,.08,C.greenGlow,0,.23,0);launch.rotation.x=Math.PI/2;
  }else if(type==="jetpack"){
    for(const side of [-1,1]){
      const cup=matchaPickup();cup.position.set(side*.53,.41,0);
      cup.rotation.z=side*.3;cup.scale.setScalar(.86);g.add(cup);
      const thruster=add(g,new THREE.ConeGeometry(.22,.55,7),
        new THREE.MeshBasicMaterial({color:0xcaffba}),side*.53,.03,0);
      thruster.rotation.z=Math.PI;
    }
  }else if(type==="magnet"){
    const face=orb(g,.72,C.cream,0,1.13,0,1);
    for(const side of [-1,1])orb(g,.10,C.ink,side*.22,1.30,.68,1);
    const mouth=orb(g,.32,C.ink,0,.93,.71,1);mouth.scale.set(1,1,.25);
    const border=torus(g,.35,.045,C.pale,0,.91,.75);
  }else if(type==="boost"){
    for(const side of [-1,1]){
      box(g,.65,.39,.90,C.jade,side*.4,.90,-.1);
      box(g,.72,.11,1.0,C.cream,side*.4,.67,-.1);
      orb(g,.24,C.vanilla,side*.4,1.19,.19);
    }
  }else if(type==="x2"){
    const disk=cyl(g,.77,.77,.22,12,C.darkJade,0,1.13,0);
    disk.rotation.x=Math.PI/2;
    const label=sign("×2",1.32,.95,"#b1e9b0","#235447");label.position.set(0,1.13,.18);g.add(label);
    const ring=torus(g,.88,.09,C.amber,0,1.13,0);
  }
  return g;
}
