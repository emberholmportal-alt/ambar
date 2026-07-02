/* ÁMBAR · motor del stream (Phaser 3) */
/* ===== assets embebidos ===== */
const A_W={blue:"assets/img/warrior_blue.png",red:"assets/img/warrior_red.png",purple:"assets/img/warrior_purple.png",yellow:"assets/img/warrior_yellow.png"};
// terreno, edificios y naturaleza: Kenney Medieval RTS (CC0, 64×64). Guerreros y ovejas siguen en Tiny Swords (animados).
const A_GRASS="assets/img/kenney_grass.png", A_WATER="assets/img/kenney_water.png";
const A_HOUSE="assets/img/kenney_house.png", A_HOUSE2="assets/img/kenney_house2.png", A_HOUSE3="assets/img/kenney_house3.png";
const A_TOWER="assets/img/kenney_tower.png";
const A_TREE="assets/img/kenney_tree.png", A_GOLD="assets/img/kenney_castle.png";
const A_SHEEP="assets/img/sheep.png";
const A_DECO=["assets/img/kenney_deco1.png","assets/img/kenney_deco2.png","assets/img/kenney_deco3.png","assets/img/kenney_deco4.png","assets/img/kenney_deco5.png","assets/img/kenney_deco6.png"];

/* ===== chrome ===== */
const $=id=>document.getElementById(id); const feedEl=$('feed'),reticleEl=$('reticle');
const nf=n=>Math.round(n).toLocaleString('es-AR'); let clockStr='Día 1 · 06:00';
function pushChronicle(tag,color,text,major){const e=document.createElement('div');e.className='entry'+(major?' major':'');
  e.innerHTML=`<div class="meta"><span class="t">${clockStr}</span><span class="tag" style="color:${color}">[${tag}]</span></div><div class="body">${text}</div>`;
  feedEl.prepend(e); while(feedEl.children.length>70) feedEl.removeChild(feedEl.lastChild);}
function setWatching(t){$('watch').textContent=t} function setViewers(n){$('viewers').textContent=nf(n)}
function reticleLock(on){reticleEl.classList.toggle('lock',on)} function setClock(s){clockStr=s;$('clock').textContent=s}

/* ===== datos ===== */
const T=64, COLS=34, ROWS=22, WORLD_W=COLS*T, WORLD_H=ROWS*T;
const IX0=2, IY0=2, IX1=COLS-3, IY1=ROWS-3;              // isla (tiles)
const WSCALE=0.72;
const BSCALE=1.28;                                      // multiplicador de escala de edificios (assets Kenney 64×64)
const HOUSES=['house','house2','house3','house4','house5','house6','house7'];   // variantes de casa
const TREES=['tree','tree2','tree3','tree4'];                                   // variantes de árbol
const roadSet=new Set(); const rk=(x,y)=>x+','+y;                               // tiles de calle (caminables, no edificables)
const GUILDS=[
  {id:'guardia',name:'Guardia de Hierro',tex:'blue',  color:0x4a90c2, cx:9, cy:7},
  {id:'yunque', name:'Orden del Yunque', tex:'red',   color:0xd64545, cx:COLS-10, cy:7},
  {id:'sombra', name:'Los Sin Nombre',   tex:'purple',color:0x9b6fce, cx:9, cy:ROWS-8},
  {id:'sol',    name:'Casa del Sol',      tex:'yellow',color:0xd8b53a, cx:COLS-10, cy:ROWS-8},
];
const guildById=Object.fromEntries(GUILDS.map(g=>[g.id,g]));
const RACES=['humano','elfo','enano','orco','no-muerto','bestia'];
const CLASSES=['guerrera','caballero','pícaro','clériga','bardo','mercenario','cazadora','herrera'];
const NAME_A=['Kael','Mirena','Dorn','Sylva','Bram','Ysolde','Korrin','Vael','Thane','Nixa','Ordo','Rhea','Grael','Selka','Auber','Wynn','Tovar','Isha','Draven','Mora','Halin','Perla'];
const NAME_B=['','','','el Tuerto','de la Sombra','Manohierro','la Pálida','el Cuervo','de Ámbar','Rompeyunques','la Zurda','Sangrefría','el Descalzo'];
const ITEMS=['un grimorio prohibido','reliquias de la Vieja Corona','oro maldito','una espada rúnica','un huevo de dragón','barriles de cerveza enana','mapas de las Profundidades','una máscara de hueso'];
const DISTRICTS=['el Barrio de la Forja','el Mercado Alto','los Muelles','la Necrópolis','la Plaza del Rey','el Jardín Colgante'];

let scene, obstacles, npcGroup, npcs=[], buildings=[], walkTiles=[], blocked=[];
let cameraBusy=false, baseZoom=1, baseCX=WORLD_W/2, baseCY=WORLD_H/2;
let paused=false, speed=1, nightRect=null;
let evAcc=0, evNext=2200, worldMin=6*60, clkAcc=0, viewers=1204, tViewers=1204, vAcc=0;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== parámetros de densidad (tuneables) ===== */
const NPC_START=84, NPC_MAX=100;         // pobladores inicial / techo (estable en 24/7)
const N_TREES=22, N_DECO=26, N_SHEEP=8;  // vegetación y rebaño sueltos (la ciudad ya llena buena parte)

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#123041',
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  physics:{default:'arcade',arcade:{debug:false}},
  scene:{preload,create,update}});

function preload(){
  for(const k in A_W) this.load.spritesheet('warrior_'+k, A_W[k], {frameWidth:110,frameHeight:98});
  this.load.image('grass',A_GRASS); this.load.image('water',A_WATER);
  this.load.image('road','assets/img/kenney_road.png'); this.load.image('dirt','assets/img/kenney_dirt.png');
  ['','2','3','4','5','6','7'].forEach(n=>this.load.image('house'+n,'assets/img/kenney_house'+n+'.png'));
  this.load.image('tower',A_TOWER); this.load.image('gold',A_GOLD);
  ['hall','barn','shop','stall1','stall2','tent1','tent2','windmill'].forEach(k=>this.load.image(k,'assets/img/kenney_'+k+'.png'));
  ['tree','tree2','tree3','tree4'].forEach(k=>this.load.image(k,'assets/img/kenney_'+k+'.png'));
  this.load.spritesheet('sheep',A_SHEEP,{frameWidth:64,frameHeight:64});
  A_DECO.forEach((d,i)=>this.load.image('deco'+i,d));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}

function create(){
  scene=this; makeDot(this);
  for(let y=0;y<ROWS;y++){blocked[y]=[];for(let x=0;x<COLS;x++) blocked[y][x]=false;}

  // mar + isla
  this.add.tileSprite(0,0,WORLD_W,WORLD_H,'water').setOrigin(0,0).setDepth(-20);
  const iw=(IX1-IX0+1)*T, ih=(IY1-IY0+1)*T;
  this.add.tileSprite(IX0*T,IY0*T,iw,ih,'grass').setOrigin(0,0).setDepth(-10);

  obstacles=this.physics.add.staticGroup();

  // animaciones por color
  for(const k in A_W){
    const t='warrior_'+k, an=this.anims;
    an.create({key:t+'-idleF',frames:an.generateFrameNumbers(t,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:t+'-idleB',frames:an.generateFrameNumbers(t,{start:6,end:11}),frameRate:6,repeat:-1});
    an.create({key:t+'-runF', frames:an.generateFrameNumbers(t,{start:12,end:17}),frameRate:11,repeat:-1});
    an.create({key:t+'-runB', frames:an.generateFrameNumbers(t,{start:18,end:23}),frameRate:11,repeat:-1});
  }
  this.anims.create({key:'sheep-idle',frames:this.anims.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});

  // marcar agua como bloqueada (fuera de isla)
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(x<IX0||x>IX1||y<IY0||y>IY1) blocked[y][x]=true;

  // ── red de calles empedradas + plaza central ────────────────────────
  const px=Math.floor(COLS/2), py=Math.floor(ROWS/2);
  const AVEN=[9,17,24], CALL=[7,11,15];                   // avenidas (V) y calles (H)
  for(const rx of AVEN) for(let y=IY0;y<=IY1;y++) paveRoad(rx,y);
  for(const ry of CALL) for(let x=IX0;x<=IX1;x++) paveRoad(x,ry);
  for(let y=py-2;y<=py+2;y++)for(let x=px-2;x<=px+2;x++) paveRoad(x,y);   // plaza empedrada

  // ── plaza mayor: palacio + salón + mercado bullicioso ───────────────
  placeBuilding('gold', px, py, 1.05);                    // palacio central (ex-goldmine)
  placeBuilding('hall', px-3, py-1, 0.92);
  placeBuilding('shop', px+3, py-1, 0.92);
  placeDeco('stall1', px-2, py+2, 0.82,false); placeDeco('stall2', px+2, py+2, 0.82,false);
  placeDeco('tent1',  px+3, py+2, 0.82,false); placeDeco('tent2',  px-3, py+2, 0.82,false);
  banner(px, py-2, 0xc9a227);

  // ── cuatro barrios de facción (bloques densos) ──────────────────────
  fillQuarter(3, 3, 15, 9,  6, 5,  guildById.guardia.color);
  fillQuarter(19,3, 30, 9,  28,5,  guildById.yunque.color);
  fillQuarter(3, 13,15,18,  6, 16, guildById.sombra.color);
  fillQuarter(19,13,30,18,  28,16, guildById.sol.color);

  // molinos en las afueras
  placeDeco('windmill', 4, 11, 1.0, false); placeDeco('windmill', 29, 11, 1.0, false);

  // ── naturaleza en los huecos (arboledas mixtas + rebaños) ───────────
  for(let c=0;c<5;c++){ const t=randFree(); if(!t) continue;
    for(let k=rint(2,5);k>0;k--){ const gx=Phaser.Math.Clamp(t.x+rint(-1,1),IX0,IX1), gy=Phaser.Math.Clamp(t.y+rint(-1,1),IY0,IY1);
      if(!blocked[gy][gx]&&!roadSet.has(rk(gx,gy))) placeDeco(pick(TREES),gx,gy,Phaser.Math.FloatBetween(0.78,1.02),true); } }
  for(let i=0;i<N_TREES;i++){const t=randFree(); if(t) placeDeco(pick(TREES),t.x,t.y,Phaser.Math.FloatBetween(0.8,1.05),true);}
  for(let i=0;i<N_DECO;i++){const t=randFree(); if(t) placeDeco('deco'+rint(0,5),t.x,t.y,Phaser.Math.FloatBetween(0.8,1.0),false);}
  const pasto=randFree();
  if(pasto) for(let k=0;k<4;k++){ const gx=Phaser.Math.Clamp(pasto.x+rint(-1,1),IX0,IX1), gy=Phaser.Math.Clamp(pasto.y+rint(-1,1),IY0,IY1); if(!blocked[gy][gx]&&!roadSet.has(rk(gx,gy))) spawnSheep(gx,gy); }
  for(let i=0;i<N_SHEEP;i++){const t=randFree(); if(t) spawnSheep(t.x,t.y);}

  // casillas caminables
  for(let y=IY0;y<=IY1;y++)for(let x=IX0;x<=IX1;x++) if(!blocked[y][x]) walkTiles.push({x:x*T+T/2,y:y*T+T/2});

  npcGroup=this.physics.add.group();
  this.physics.add.collider(npcGroup,obstacles);
  this.physics.world.setBounds(IX0*T,IY0*T,iw,ih);
  for(let i=0;i<NPC_START;i++) spawnNpc();

  // ciclo día/noche (overlay fijo a cámara)
  nightRect=this.add.rectangle(0,0,10,10,0x0a1436,0).setOrigin(0,0).setScrollFactor(0).setDepth(90000);

  this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
  fitCamera(); this.scale.on('resize',fitCamera);
  seedFeed();
}

/* ===== colocación ===== */
function dispSize(key,sc){const s=scene.textures.get(key).getSourceImage();return [s.width*sc,s.height*sc];}
function paveRoad(x,y){ if(x<IX0||x>IX1||y<IY0||y>IY1) return;
  roadSet.add(rk(x,y)); scene.add.image(x*T,y*T,'road').setOrigin(0,0).setDepth(-9); }
function fillQuarter(x0,y0,x1,y1,kx,ky,color){
  placeBuilding('tower', kx, ky, 1.0);                    // fortaleza del barrio
  banner(kx, ky+1, color);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    if((x+y)%2!==0) continue;                             // deja callecitas internas
    if(blocked[y]&&blocked[y][x]) continue;
    if(roadSet.has(rk(x,y))) continue;
    if(Math.random()<0.26) continue;                      // algún vacío
    const r=Math.random();
    const key = r<0.72?pick(HOUSES) : r<0.87?'shop' : 'barn';
    placeBuilding(key, x, y, Phaser.Math.FloatBetween(0.82,0.96));
  }
}
function placeBuilding(key,tx,ty,sc,district){
  const tex = key==='house' ? pick(HOUSES) : key;   // variedad de casas
  const s = sc*BSCALE;
  const x=tx*T+T/2, y=ty*T+T;                     // base sobre el tile
  const spr=scene.add.image(x,y,tex).setOrigin(0.5,1).setScale(s).setDepth(y);
  const [w,h]=dispSize(tex,s);
  const foot=scene.add.rectangle(x,y-10,w*0.55,20).setOrigin(0.5,0.5).setVisible(false);
  scene.physics.add.existing(foot,true); obstacles.add(foot);
  if(blocked[ty]) blocked[ty][tx]=true;                 // huella 1×1 (assets Kenney 64×64, ocupan ~1 tile)
  buildings.push({spr,x,y,tx,ty,district:district||null,ruined:false});
  return spr;
}
function placeDeco(key,tx,ty,sc,block){
  const x=tx*T+T/2, y=ty*T+T;
  scene.add.image(x,y,key).setOrigin(0.5,1).setScale(sc).setDepth(y);
  if(block && blocked[ty]) blocked[ty][tx]=true;
}
function spawnSheep(tx,ty){
  const s=scene.physics.add.sprite(tx*T+T/2,ty*T+T/2,'sheep',0).setOrigin(0.5,0.9).setScale(0.85);
  s.play('sheep-idle'); s.setDepth(s.y);
  npcs.push({spr:s,sheep:true,tx:s.x,ty:s.y,idle:0,stuck:0,lx:s.x,ly:s.y});
}
function banner(tx,ty,color){
  const x=tx*T+T/2, y=ty*T+T/2;
  scene.add.rectangle(x,y-4,3,26,0x4a3d2c).setDepth(y+40);
  const fl=scene.add.triangle(x+2,y-16,0,0,20,6,0,14,color).setOrigin(0,0).setDepth(y+40);
  fl.setStrokeStyle(1,0x120d09,0.6);
}
function randFree(){for(let i=0;i<60;i++){const x=rint(IX0,IX1),y=rint(IY0,IY1); if(!blocked[y][x]&&!roadSet.has(rk(x,y))) return{x,y};}return null;}
function makeName(){const b=pick(NAME_B);return b?`${pick(NAME_A)} ${b}`:pick(NAME_A);}

function spawnNpc(gid){
  if(livingNpcs().length>=NPC_MAX) return null;   // techo de población (estable en 24/7)
  const g=gid?guildById[gid]:pick(GUILDS);
  // aparecer cerca del distrito
  let sx=g.cx+rint(-3,3), sy=g.cy+rint(-2,3);
  sx=Phaser.Math.Clamp(sx,IX0,IX1); sy=Phaser.Math.Clamp(sy,IY0,IY1);
  const spr=scene.physics.add.sprite(sx*T+T/2,sy*T+T/2,'warrior_'+g.tex,0).setOrigin(0.5,0.95).setScale(WSCALE);
  spr.body.setSize(26,20).setOffset(42,68);
  spr.setCollideWorldBounds(true); npcGroup.add(spr); spr.setDepth(spr.y);
  const n={spr,sheep:false,guild:g.id,tex:g.tex,name:makeName(),race:pick(RACES),cls:pick(CLASSES),
    tx:spr.x,ty:spr.y,faceUp:false,faceLeft:false,idle:0,stuck:0,lx:spr.x,ly:spr.y,label:null,dead:false};
  retarget(n); npcs.push(n); return n;
}
function retarget(n){const w=pick(walkTiles); n.tx=w.x; n.ty=w.y;}

/* ===== cámara ===== */
function fitCamera(){if(!scene)return;const cam=scene.cameras.main,vw=scene.scale.width,vh=scene.scale.height;
  baseZoom=Math.min(vw/WORLD_W,vh/WORLD_H)*0.98;
  if(nightRect) nightRect.setSize(vw,vh);
  if(!cameraBusy){cam.setZoom(baseZoom);cam.centerOn(baseCX,baseCY);}}
function cutToPos(x,y){if(cameraBusy)return;cameraBusy=true;const cam=scene.cameras.main,z=Math.min(Math.max(baseZoom*3.6,baseZoom+0.9),2.2);
  cam.pan(x,y,650,'Sine.easeInOut'); cam.zoomTo(z,650,'Sine.easeInOut'); reticleLock(true);
  scene.time.delayedCall(3600,()=>{cam.pan(baseCX,baseCY,850,'Sine.easeInOut');cam.zoomTo(baseZoom,850,'Sine.easeInOut');reticleLock(false);hideLabels();
    scene.time.delayedCall(880,()=>{cameraBusy=false;});});}
function showLabel(n){hideLabels(); if(n.dead)return;
  n.label=scene.add.text(n.spr.x,n.spr.y-52,`${n.name}\n${n.cls} · ${n.race}`,
    {fontFamily:'ui-monospace,monospace',fontSize:'11px',color:'#ece3d0',align:'center',stroke:'#120d09',strokeThickness:3,lineSpacing:1}).setOrigin(0.5,1).setDepth(100001).setResolution(2);}
function hideLabels(){npcs.forEach(n=>{if(n.label){n.label.destroy();n.label=null;}});}

/* ===== efectos ===== */
function burst(x,y,color,count,rise,dp){for(let i=0;i<count;i++){const p=scene.add.image(x,y,'dot').setTint(color).setDepth(dp||99999).setScale(Phaser.Math.FloatBetween(0.5,1.4)).setAlpha(0.95);
  scene.tweens.add({targets:p,x:x+rint(-28,28),y:y-rise-rint(0,26),alpha:0,scale:0.1,duration:rint(500,1200),ease:'Quad.easeOut',onComplete:()=>p.destroy()});}}
function ring(x,y,color){const c=scene.add.circle(x,y,6).setStrokeStyle(2,color,1).setDepth(99998);
  scene.tweens.add({targets:c,radius:52,alpha:0,duration:900,ease:'Cubic.easeOut',onUpdate:()=>c.setStrokeStyle(2,color,c.alpha),onComplete:()=>c.destroy()});}
function playFx(kind,x,y){const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(kind==='fire'){burst(x,y,0xe5533a,20,14);burst(x,y,0xf2a03a,14,18);if(!rm)scene.cameras.main.shake(340,0.007);}
  else if(kind==='clash'){ring(x,y,0xffffff);burst(x,y,0xd64545,12,8);scene.cameras.main.flash(120,229,220,180);}
  else if(kind==='ring'){ring(x,y,0xc9a227);burst(x,y,0xc9a227,10,6);}
  else if(kind==='confetti'){[0xd64545,0x4a90c2,0x5fa55a,0x9b6fce,0xc9a227].forEach(c=>burst(x,y,c,7,16));}}

/* ===== consecuencias persistentes ===== */
function ruinBuilding(b){
  if(!b||b.ruined)return; b.ruined=true;
  b.spr.setTint(0x3a2418);
  // parche chamuscado en el suelo
  scene.add.ellipse(b.x,b.y-4,dispSize('house',0.95)[0]*0.7,26,0x120b06,0.55).setDepth(b.y-1);
  // humo persistente
  const smoke=scene.time.addEvent({delay:520,loop:true,callback:()=>{
    if(paused)return; const p=scene.add.image(b.x+rint(-8,8),b.y-40,'dot').setTint(0x555049).setAlpha(0.5).setDepth(99990).setScale(1.2);
    scene.tweens.add({targets:p,y:p.y-46,x:p.x+rint(-10,10),alpha:0,scale:2.2,duration:2200,ease:'Sine.easeOut',onComplete:()=>p.destroy()});
  }});
  b.smoke=smoke;
}
function grave(x,y){
  const g=scene.add.graphics().setDepth(y);
  g.fillStyle(0x6b6459,1); g.fillRoundedRect(x-7,y-18,14,18,{tl:7,tr:7,bl:0,br:0});
  g.fillStyle(0x4a4640,1); g.fillRect(x-2,y-14,4,10); g.fillRect(x-6,y-11,12,4);   // cruz
  g.fillStyle(0x2c3320,0.5); g.fillEllipse(x,y,20,6);
}
function killNpc(n){
  if(!n||n.dead||n.sheep)return; n.dead=true;
  npcs=npcs.filter(x=>x!==n);
  const gx=n.spr.x,gy=n.spr.y;
  n.spr.body.setVelocity(0); n.spr.anims.stop();
  scene.tweens.add({targets:n.spr,alpha:0,angle:80,y:n.spr.y+6,duration:700,ease:'Quad.easeIn',
    onComplete:()=>{n.spr.destroy(); grave(gx,gy);}});
}
function defect(n){
  if(!n||n.dead||n.sheep)return;
  const others=GUILDS.filter(g=>g.id!==n.guild); const g=pick(others);
  n.guild=g.id; n.tex=g.tex;
  n.spr.setTexture('warrior_'+g.tex, n.spr.frame.name);
  scene.cameras.main.flash(90,255,255,255);
  burst(n.spr.x,n.spr.y-30,g.color,10,10);
}

/* ===== motor narrativo ===== */
const TPL=[
  {tag:'MISIÓN',c:'#c9a227',major:false,t:x=>`${x.a}, ${x.cls} ${x.race}, acepta un contrato para limpiar las alcantarillas de ${x.d}.`},
  {tag:'MERCADO',c:'#e2a24a',major:false,t:x=>`Una caravana entra por la Puerta Sur cargada de ${x.i}. Los precios tiemblan.`},
  {tag:'TABERNA',c:'#d99a5a',major:false,t:x=>`${x.a} y ${x.b} se van a los gritos en la taberna de ${x.d}. Corre la cerveza, no la sangre… todavía.`},
  {tag:'GREMIO',c:'#8fb4d6',major:false,t:x=>`El ${x.g} recluta a ${x.a}. Juramento sellado con hierro y silencio.`},
  {tag:'RUMOR',c:'#a99a7a',major:false,t:x=>`Corre el rumor: ${x.a} le debe ${x.i} al ${x.g} y ya no responde a nadie.`},
  {tag:'NOCHE',c:'#8c7f68',major:false,t:x=>`Repican las campanas: la vigilia cambia de guardia en ${x.d}.`},
  {tag:'REFUERZO',c:'#8fb4d6',major:false,spawn:true,t:x=>`Un barco atraca en los muelles: nuevos brazos para el ${x.g}.`},
  {tag:'PASTOR',c:'#9fb06a',major:false,t:x=>`Las ovejas de ${x.d} escapan del corral. Alguien maldice en voz alta.`},
  {tag:'GUERRA',c:'#e5533a',major:true,fx:'fire',kind:'ruin',t:x=>`GUERRA DE FACCIONES. El ${x.g} asalta ${x.d}. El acero canta y las puertas arden.`},
  {tag:'DRAGÓN',c:'#f2703a',major:true,fx:'fire',kind:'ruin',t:x=>`¡DRAGÓN! Una sombra alada cae sobre ${x.d}. Fuego, ceniza y gritos.`},
  {tag:'DUELO',c:'#ff6b6b',major:true,fx:'clash',kind:'kill',t:x=>`DUELO A MUERTE: ${x.a} contra ${x.b}. Solo uno queda en pie sobre la hierba.`},
  {tag:'MAGNICIDIO',c:'#9aa0a6',major:true,fx:'clash',kind:'kill',t:x=>`MAGNICIDIO. ${x.a} cae sin vida en ${x.d}. El ${x.g} lo niega todo.`},
  {tag:'HALLAZGO',c:'#c9a227',major:true,fx:'ring',kind:'none',t:x=>`HALLAZGO. ${x.a} desentierra ${x.i} en las ruinas bajo ${x.d}. Todos lo quieren.`},
  {tag:'FIESTA',c:'#c9a227',major:true,fx:'confetti',kind:'none',t:x=>`FESTÍN en ${x.d}: música, antorchas y vino. Hasta el ${x.g} baja las armas.`},
  {tag:'TRAICIÓN',c:'#9b6fce',major:true,fx:'clash',kind:'defect',t:x=>`TRAICIÓN. ${x.a} abandona el ${x.g} y jura lealtad a otro estandarte.`},
];
function livingNpcs(){return npcs.filter(n=>!n.sheep&&!n.dead);}

// Ejecuta SOLO la consecuencia de un evento major + su FX en el lugar.
// Corre SIEMPRE (haya o no corte de cámara) para que el mundo quede
// consistente con lo que narra la crónica. Los guards de idempotencia
// viven en ruinBuilding/killNpc/defect.
function applyConsequence(tpl,a,b,focus){
  if(focus){ playFx(tpl.fx,focus.x,focus.y-30); ruinBuilding(focus); return; }
  playFx(tpl.fx,a.spr.x,a.spr.y);
  if(tpl.kind==='kill')        killNpc(Math.random()<0.5?a:b);
  else if(tpl.kind==='defect') defect(a);
}

function fireEvent(){
  const tpl=pick(TPL), living=livingNpcs(); if(!living.length)return;
  const a=pick(living); let b=pick(living),gd=0; while(b===a&&gd++<6) b=pick(living);
  const gsel=pick(GUILDS);
  const ctx={a:a.name,b:b.name,cls:a.cls,race:a.race,g:gsel.name,d:pick(DISTRICTS),i:pick(ITEMS)};
  const text=tpl.t(ctx); pushChronicle(tpl.tag,tpl.c,text,tpl.major);

  if(tpl.spawn){ spawnNpc(gsel.id); return; }
  if(!tpl.major) return;

  // foco del evento: para 'ruin' un edificio en pie; si no, el NPC protagonista
  const focus = tpl.kind==='ruin' ? (pick(buildings.filter(x=>!x.ruined))||pick(buildings)) : null;

  if(!cameraBusy){
    // cámara libre: corte cinematográfico + consecuencia sincronizada con la llegada
    setWatching(text); tViewers+=rint(150,480);
    cutToPos(focus?focus.x:a.spr.x, focus?focus.y-20:a.spr.y-30);
    if(!focus) showLabel(a);
    scene.time.delayedCall(700,()=>applyConsequence(tpl,a,b,focus));
  } else {
    // cámara ocupada: el evento pasa igual, fuera de cámara, ya mismo
    applyConsequence(tpl,a,b,focus);
  }
}

/* ===== día/noche ===== */
function timeTint(min){
  const h=(min/60)%24;
  if(h>=7&&h<18) return [0x0a1436,0];                         // día
  if(h>=5&&h<7)  return [0xe08a3c,0.16*(1-(h-5)/2)+0.04];     // amanecer
  if(h>=18&&h<20)return [0xe0662c,0.06+0.20*((h-18)/2)];      // atardecer
  return [0x0a1436, 0.52];                                    // noche
}

/* ===== loop ===== */
function update(time,delta){
  const m=speed;
  for(const n of npcs){
    if(n.dead) continue;
    if(paused){ n.spr.body&&n.spr.body.setVelocity(0); n.spr.anims&&n.spr.anims.stop(); continue; }
    const spd=(n.sheep?14:40)*m;
    const dx=n.tx-n.spr.x, dy=n.ty-n.spr.y, d=Math.hypot(dx,dy);
    if(Math.hypot(n.spr.x-n.lx,n.spr.y-n.ly)<0.25) n.stuck+=delta; else n.stuck=0;
    n.lx=n.spr.x; n.ly=n.spr.y;
    if(d<4||n.stuck>600){
      n.stuck=0; n.spr.body.setVelocity(0);
      if(n.idle<=0){ n.idle=rint(400,1800);
        if(!n.sheep){ n.spr.anims.stop(); n.spr.setFrame(n.faceUp?6:0); n.spr.setFlipX(n.faceLeft); } }
      else { n.idle-=delta*m; if(n.idle<=0) retarget(n); }
    } else {
      const inv=spd/d; n.spr.body.setVelocity(dx*inv,dy*inv);
      if(!n.sheep){ n.faceLeft=dx<0; n.faceUp=(Math.abs(dy)>Math.abs(dx))&&dy<0;
        n.spr.play('warrior_'+n.tex+(n.faceUp?'-runB':'-runF'),true); n.spr.setFlipX(n.faceLeft); }
    }
    n.spr.setDepth(n.spr.y);
    if(n.label){ n.label.x=n.spr.x; n.label.y=n.spr.y-52; }
  }
  if(paused) return;

  clkAcc+=delta*m;
  if(clkAcc>800){ worldMin+=6*(clkAcc/1000); clkAcc=0;
    const d=Math.floor(worldMin/1440)+1, mm=Math.floor(worldMin%1440);
    setClock(`Día ${d} · ${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`);
    const [col,al]=timeTint(worldMin); if(nightRect) nightRect.setFillStyle(col,al);
  }
  vAcc+=delta;
  if(vAcc>1500){ vAcc=0; tViewers+=rint(-40,55); tViewers+=(1180-tViewers)*0.04; tViewers=Math.max(600,tViewers); }
  viewers+=(tViewers-viewers)*0.08; setViewers(viewers);

  evAcc+=delta*m;
  if(evAcc>=evNext){ evAcc=0; evNext=rint(2400,4200); fireEvent(); }
}

function seedFeed(){
  pushChronicle('NOCHE','#8c7f68','Amanece sobre la isla de Ámbar. El Ojo del Vigía abre la transmisión.',false);
  pushChronicle('MERCADO','#e2a24a','El Mercado Alto enciende sus braseros; los muelles crujen con la marea.',false);
  pushChronicle('GREMIO','#8fb4d6','Las cuatro facciones izan sus estandartes sobre las torres.',false);
}
$('btnPause').addEventListener('click',()=>{paused=!paused;$('btnPause').textContent=paused?'SEGUIR':'PAUSA';});
$('btnSpeed').addEventListener('click',()=>{speed=speed===1?2:speed===2?4:1;$('btnSpeed').textContent=speed+'×';});
