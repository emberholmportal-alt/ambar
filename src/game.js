/* ÁMBAR · motor del stream (Phaser 3) — mundo v3: isla orgánica Tiny Swords */

/* ===== chrome ===== */
const $=id=>document.getElementById(id); const feedEl=$('feed'),reticleEl=$('reticle');
const nf=n=>Math.round(n).toLocaleString('es-AR'); let clockStr='Día 1 · 06:00';
function pushChronicle(tag,color,text,major,av){const e=document.createElement('div');e.className='entry'+(major?' major':'');
  const avImg=av?`<img class="av" src="assets/img/ts/av/${av}.png" alt="">`:'';
  e.innerHTML=`${avImg}<div class="meta"><span class="t">${clockStr}</span><span class="tag" style="color:${color}">[${tag}]</span></div><div class="body">${text}</div>`;
  feedEl.prepend(e); while(feedEl.children.length>70) feedEl.removeChild(feedEl.lastChild);}
function setWatching(t){$('watch').textContent=t} function setViewers(n){$('viewers').textContent=nf(n)}
function reticleLock(on){reticleEl.classList.toggle('lock',on)} function setClock(s){clockStr=s;$('clock').textContent=s}

/* ===== datos ===== */
const T=64, COLS=48, ROWS=30, WORLD_W=COLS*T, WORLD_H=ROWS*T;
const GUILDS=[
  {id:'guardia',name:'Guardia de Hierro',tex:'blue',  color:0x4a90c2, cx:13,      cy:10},
  {id:'yunque', name:'Orden del Yunque', tex:'red',   color:0xd64545, cx:COLS-14, cy:10},
  {id:'sombra', name:'Los Sin Nombre',   tex:'purple',color:0x9b6fce, cx:13,      cy:ROWS-11},
  {id:'sol',    name:'Casa del Sol',      tex:'yellow',color:0xd8b53a, cx:COLS-14, cy:ROWS-11},
];
const guildById=Object.fromEntries(GUILDS.map(g=>[g.id,g]));
const RACES=['humano','elfo','enano','orco','no-muerto','bestia'];
const CLASSES=['guerrera','caballero','pícaro','clériga','bardo','mercenario','cazadora','herrera'];
const NAME_A=['Kael','Mirena','Dorn','Sylva','Bram','Ysolde','Korrin','Vael','Thane','Nixa','Ordo','Rhea','Grael','Selka','Auber','Wynn','Tovar','Isha','Draven','Mora','Halin','Perla'];
const NAME_B=['','','','el Tuerto','de la Sombra','Manohierro','la Pálida','el Cuervo','de Ámbar','Rompeyunques','la Zurda','Sangrefría','el Descalzo'];
const ITEMS=['un grimorio prohibido','reliquias de la Vieja Corona','oro maldito','una espada rúnica','un huevo de dragón','barriles de cerveza enana','mapas de las Profundidades','una máscara de hueso'];
const DISTRICTS=['el Barrio de la Forja','el Mercado Alto','los Muelles','la Necrópolis','la Plaza del Rey','el Jardín Colgante'];

let scene, obstacles, npcGroup, npcs=[], buildings=[], walkTiles=[], blocked=[], land=[];
let treeSpots=[], gmPos=null;                 // sitios de trabajo (bosque y mina)
let cameraBusy=false, baseZoom=1, baseCX=WORLD_W/2, baseCY=WORLD_H/2;
let paused=false, speed=1, nightRect=null, soundOn=false, manualView=false;
function sfx(key,vol){ if(soundOn&&scene) scene.sound.play('s_'+key,{volume:vol||0.5}); }
let evAcc=0, evNext=2200, worldMin=6*60, clkAcc=0, viewers=1204, tViewers=1204, vAcc=0;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== parámetros (tuneables) ===== */
const NPC_START=110, NPC_MAX=140;            // pobladores (guerreros+aldeanos) inicial / techo
const N_MONSTERS=8;                          // bichos que merodean de fondo
const WSCALE=0.72, PSCALE=0.62;              // escala guerreros (110×98) y pawns/goblins (frames 192)

/* ===== catálogo de texturas Tiny Swords ===== */
const TSB='assets/img/ts/';
const COLORES=['blue','red','purple','yellow'];
const CASAS=['house1','house2','house3'];
const ESPECIALES=['barracks','archery','monastery'];
// monstruos: tex idle/run separados o mismo sheet; fw = tamaño de frame
const MONDEF={
  torch: {ti:'goblin_torch',ai:'torch-idle', ar:'torch-run',  sc:PSCALE, fw:192, spd:46},
  spear: {ti:'spear_idle',  ai:'spear-idle', ar:'spear-run',  sc:0.52,   fw:256, spd:40},
  shaman:{ti:'shaman_idle', ai:'shaman-idle',ar:'shaman-run', sc:PSCALE, fw:192, spd:36},
  gnoll: {ti:'gnoll_idle',  ai:'gnoll-idle', ar:'gnoll-walk', sc:PSCALE, fw:192, spd:44},
  bear:  {ti:'bear_idle',   ai:'bear-idle',  ar:'bear-run',   sc:0.55,   fw:256, spd:52},
  thief: {ti:'thief_idle',  ai:'thief-idle', ar:'thief-run',  sc:PSCALE, fw:192, spd:56},
  snake: {ti:'snake_idle',  ai:'snake-idle', ar:'snake-run',  sc:PSCALE, fw:192, spd:38},
  spider:{ti:'spider_idle', ai:'spider-idle',ar:'spider-run', sc:PSCALE, fw:192, spd:48},
  pigrider:{ti:'pigrider_idle',ai:'pig-idle',ar:'pig-run',    sc:0.52,   fw:256, spd:58},
  tnt:   {ti:'goblin_tnt',  ai:'tnt-idle',   ar:'tnt-run',    sc:PSCALE, fw:192, spd:44},
};
const ROAMERS=['torch','spear','gnoll','bear','snake','spider'];

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#123041',
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  physics:{default:'arcade',arcade:{debug:false}},
  scene:{preload,create,update}});

function preload(){
  const W={blue:"assets/img/warrior_blue.png",red:"assets/img/warrior_red.png",purple:"assets/img/warrior_purple.png",yellow:"assets/img/warrior_yellow.png"};
  for(const k in W) this.load.spritesheet('warrior_'+k, W[k], {frameWidth:110,frameHeight:98});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  // terreno
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.image('water',TSB+'water.png');
  this.load.spritesheet('foam',TSB+'foam.png',{frameWidth:192,frameHeight:192});
  // edificios por facción + castillo real
  for(const c of COLORES) for(const b of [...CASAS,'tower',...ESPECIALES]) this.load.image(b+'_'+c,TSB+b+'_'+c+'.png');
  this.load.image('castle_black',TSB+'castle_black.png');
  this.load.image('goldmine',TSB+'goldmine.png');
  this.load.image('goblin_house',TSB+'goblin_house.png');
  this.load.spritesheet('fence',TSB+'fence.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('cave',TSB+'cave.png',{frameWidth:192,frameHeight:192});
  // naturaleza y props
  this.load.spritesheet('tree',TSB+'tree_anim.png',{frameWidth:192,frameHeight:192});
  for(let i=1;i<=4;i++){ this.load.spritesheet('bush'+i,TSB+'bush'+i+'.png',{frameWidth:128,frameHeight:128}); this.load.image('rock'+i,TSB+'rock'+i+'.png'); }
  for(let i=1;i<=18;i++) this.load.image('tdeco'+i,TSB+'deco'+String(i).padStart(2,'0')+'.png');
  ['res_gold','res_meat','res_wood'].forEach(k=>this.load.image(k,TSB+k+'.png'));
  // unidades y muerte
  for(const c of COLORES) this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('dead',TSB+'dead.png',{frameWidth:256,frameHeight:256});
  // enemigos
  this.load.spritesheet('goblin_torch',TSB+'goblin_torch.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spear_idle',TSB+'spear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('spear_run', TSB+'spear_run.png', {frameWidth:256,frameHeight:256});
  this.load.spritesheet('shaman_idle',TSB+'shaman_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shaman_run', TSB+'shaman_run.png', {frameWidth:192,frameHeight:192});
  this.load.spritesheet('gnoll_idle',TSB+'gnoll_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('gnoll_walk',TSB+'gnoll_walk.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('bear_idle',TSB+'bear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('bear_run', TSB+'bear_run.png', {frameWidth:256,frameHeight:256});
  this.load.spritesheet('minotaur_walk',TSB+'minotaur_walk.png',{frameWidth:320,frameHeight:320});
  this.load.spritesheet('thief_idle',TSB+'thief_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('thief_run', TSB+'thief_run.png', {frameWidth:192,frameHeight:192});
  this.load.spritesheet('snake_idle',TSB+'snake_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('snake_run', TSB+'snake_run.png', {frameWidth:192,frameHeight:192});
  this.load.spritesheet('spider_idle',TSB+'spider_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spider_run', TSB+'spider_run.png', {frameWidth:192,frameHeight:192});
  this.load.spritesheet('pigrider_idle',TSB+'pigrider_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('pigrider_run', TSB+'pigrider_run.png', {frameWidth:256,frameHeight:256});
  for(let i=1;i<=4;i++){ this.load.image('cloud'+i,TSB+'cloud'+i+'.png'); this.load.spritesheet('wrock'+i,TSB+'wrock'+i+'.png',{frameWidth:128,frameHeight:128}); }
  this.load.spritesheet('duck',TSB+'duck.png',{frameWidth:32,frameHeight:32});
  // trabajadores (leñador/minero/cargador), arqueros y monjes por color
  for(const c of COLORES){
    for(const j of ['waxe','wpick','wgold']){
      this.load.spritesheet(j+'_'+c+'_i',TSB+j+'_'+c+'_i.png',{frameWidth:192,frameHeight:192});
      this.load.spritesheet(j+'_'+c+'_r',TSB+j+'_'+c+'_r.png',{frameWidth:192,frameHeight:192});
    }
    this.load.spritesheet('archer_'+c+'_i',TSB+'archer_'+c+'_i.png',{frameWidth:192,frameHeight:192});
    this.load.spritesheet('archer_'+c+'_r',TSB+'archer_'+c+'_r.png',{frameWidth:192,frameHeight:192});
    this.load.spritesheet('monk_'+c+'_i',TSB+'monk_'+c+'_i.png',{frameWidth:192,frameHeight:192});
    this.load.spritesheet('monk_'+c+'_r',TSB+'monk_'+c+'_r.png',{frameWidth:192,frameHeight:192});
  }
  this.load.spritesheet('boat',TSB+'boat.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('sboat',TSB+'sboat.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shark',TSB+'shark.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('goblin_tnt',TSB+'goblin_tnt.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pig_idle',TSB+'pig_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pig_run', TSB+'pig_run.png', {frameWidth:192,frameHeight:192});
  // efectos
  this.load.spritesheet('fire',TSB+'fire.png',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('explosion',TSB+'explosion.png',{frameWidth:192,frameHeight:192});
  // mercado (Kenney, se mezclan bien) + tesoros/antorcha (Tiny Dungeon) + dragón + partículas
  ['stall1','stall2','tent1','tent2'].forEach(k=>this.load.image(k,'assets/img/kenney_'+k+'.png'));
  ['chest','mimic','torch','demon','bat'].forEach(k=>this.load.image('td_'+k,'assets/img/td_'+k+'.png'));
  ['flame','smoke','magic','star'].forEach(k=>this.load.image('p_'+k,'assets/img/p_'+k+'.png'));
  ['fire','clash','coins','latch','bell','door','bong','creak'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}

/* ===== isla orgánica ===== */
function buildIsland(){
  const cx=COLS/2-0.5, cy=ROWS/2-0.5, p1=Math.random()*6.28, p2=Math.random()*6.28, p3=Math.random()*6.28;
  for(let y=0;y<ROWS;y++){ land[y]=[]; blocked[y]=[];
    for(let x=0;x<COLS;x++){
      const dx=(x-cx)/(COLS*0.435), dy=(y-cy)/(ROWS*0.415);
      const ang=Math.atan2(dy,dx), r=Math.hypot(dx,dy);
      const wob=0.10*Math.sin(ang*3+p1)+0.07*Math.sin(ang*5+p2)+0.05*Math.sin(ang*7+p3);
      land[y][x] = r < 0.97+wob;
    }
  }
  for(let it=0;it<2;it++){                              // suavizado: sin lagunitas ni penínsulas de 1 tile
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
      let v=0; for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++) if(!(ox===0&&oy===0)&&land[y+oy][x+ox]) v++;
      if(!land[y][x]&&v>=6) land[y][x]=true;
      else if(land[y][x]&&v<=2) land[y][x]=false;
    }
  }
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) blocked[y][x]=!land[y][x];
}
const isLand=(x,y)=> y>=0&&y<ROWS&&x>=0&&x<COLS&&land[y][x];
// autotile 3×3 del bloque de pasto (cols 0-2; col 3 y fila 3 son variantes aisladas) — índice = fila*10+col
function groundIdx(x,y){
  const n=isLand(x,y-1), s=isLand(x,y+1), w=isLand(x-1,y), e=isLand(x+1,y);
  if(n&&s&&w&&e) return 11;                       // centro pleno
  if(!n&&!w&&s&&e) return 0;  if(!n&&!e&&s&&w) return 2;
  if(!s&&!w&&n&&e) return 20; if(!s&&!e&&n&&w) return 22;
  if(!n&&s) return 1; if(!s&&n) return 21;
  if(!w&&e) return 10; if(!e&&w) return 12;
  return 11;
}
function sandIdx(x,y,inZone){ // autotile 3×3 del bloque de arena (cols 5-7)
  const n=inZone(x,y-1), s=inZone(x,y+1), w=inZone(x-1,y), e=inZone(x+1,y);
  if(n&&s&&w&&e) return 16;
  if(!n&&!w&&s&&e) return 5;  if(!n&&!e&&s&&w) return 7;
  if(!s&&!w&&n&&e) return 25; if(!s&&!e&&n&&w) return 27;
  if(!n&&s) return 6; if(!s&&n) return 26;
  if(!w&&e) return 15; if(!e&&w) return 17;
  return 16;
}
function nudgeToLand(x,y){ let gx=x,gy=y,tr=0;
  while(tr++<20 && !isLand(gx,gy)){ gx+=Math.sign(COLS/2-gx)||0; gy+=Math.sign(ROWS/2-gy)||0; }
  return {x:gx,y:gy};
}
function randFree(){for(let i=0;i<80;i++){const x=rint(1,COLS-2),y=rint(1,ROWS-2); if(isLand(x,y)&&!blocked[y][x]) return{x,y};}return null;}

function create(){
  scene=this; makeDot(this);
  buildIsland();
  obstacles=this.physics.add.staticGroup();

  // ---- animaciones ----
  const an=this.anims;
  for(const k of COLORES){
    const t='warrior_'+k;
    an.create({key:t+'-idleF',frames:an.generateFrameNumbers(t,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:t+'-idleB',frames:an.generateFrameNumbers(t,{start:6,end:11}),frameRate:6,repeat:-1});
    an.create({key:t+'-runF', frames:an.generateFrameNumbers(t,{start:12,end:17}),frameRate:11,repeat:-1});
    an.create({key:t+'-runB', frames:an.generateFrameNumbers(t,{start:18,end:23}),frameRate:11,repeat:-1});
    const p='pawn_'+k;
    an.create({key:p+'-idle',frames:an.generateFrameNumbers(p,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:p+'-run', frames:an.generateFrameNumbers(p,{start:6,end:11}),frameRate:10,repeat:-1});
  }
  an.create({key:'sheep-idle',frames:an.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});
  an.create({key:'foam-a',frames:an.generateFrameNumbers('foam',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'tree-a',frames:an.generateFrameNumbers('tree',{start:0,end:3}),frameRate:4,repeat:-1});
  for(let i=1;i<=4;i++) an.create({key:'bush'+i+'-a',frames:an.generateFrameNumbers('bush'+i,{start:0,end:7}),frameRate:6,repeat:-1});
  an.create({key:'cave-a',frames:an.generateFrameNumbers('cave',{start:0,end:7}),frameRate:6,repeat:-1});
  an.create({key:'fire-a',frames:an.generateFrameNumbers('fire',{start:0,end:6}),frameRate:10,repeat:-1});
  an.create({key:'explosion-a',frames:an.generateFrameNumbers('explosion',{start:0,end:8}),frameRate:14,repeat:0});
  an.create({key:'dead-a',frames:an.generateFrameNumbers('dead',{start:0,end:6}),frameRate:9,repeat:0});
  an.create({key:'torch-idle',frames:an.generateFrameNumbers('goblin_torch',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'torch-run', frames:an.generateFrameNumbers('goblin_torch',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'spear-idle',frames:an.generateFrameNumbers('spear_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'spear-run', frames:an.generateFrameNumbers('spear_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'shaman-idle',frames:an.generateFrameNumbers('shaman_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'shaman-run', frames:an.generateFrameNumbers('shaman_run',{start:0,end:3}),frameRate:8,repeat:-1});
  an.create({key:'gnoll-idle',frames:an.generateFrameNumbers('gnoll_idle',{start:0,end:5}),frameRate:8,repeat:-1});
  an.create({key:'gnoll-walk',frames:an.generateFrameNumbers('gnoll_walk',{start:0,end:7}),frameRate:10,repeat:-1});
  an.create({key:'bear-idle',frames:an.generateFrameNumbers('bear_idle',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'bear-run', frames:an.generateFrameNumbers('bear_run',{start:0,end:4}),frameRate:10,repeat:-1});
  an.create({key:'mino-walk',frames:an.generateFrameNumbers('minotaur_walk',{start:0,end:7}),frameRate:9,repeat:-1});
  an.create({key:'thief-idle',frames:an.generateFrameNumbers('thief_idle',{start:0,end:5}),frameRate:8,repeat:-1});
  an.create({key:'thief-run', frames:an.generateFrameNumbers('thief_run',{start:0,end:5}),frameRate:11,repeat:-1});
  an.create({key:'snake-idle',frames:an.generateFrameNumbers('snake_idle',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'snake-run', frames:an.generateFrameNumbers('snake_run',{start:0,end:7}),frameRate:10,repeat:-1});
  an.create({key:'spider-idle',frames:an.generateFrameNumbers('spider_idle',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'spider-run', frames:an.generateFrameNumbers('spider_run',{start:0,end:4}),frameRate:10,repeat:-1});
  an.create({key:'pig-idle',frames:an.generateFrameNumbers('pigrider_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'pig-run', frames:an.generateFrameNumbers('pigrider_run',{start:0,end:3}),frameRate:10,repeat:-1});
  for(let i=1;i<=4;i++) an.create({key:'wrock'+i+'-a',frames:an.generateFrameNumbers('wrock'+i,{start:0,end:7}),frameRate:5,repeat:-1});
  an.create({key:'duck-a',frames:an.generateFrameNumbers('duck',{start:0,end:2}),frameRate:4,repeat:-1});
  for(const c of COLORES){                                       // end:-1 = todos los frames de la tira
    for(const j of ['waxe','wpick','wgold','archer','monk']){
      an.create({key:j+'_'+c+'-i',frames:an.generateFrameNumbers(j+'_'+c+'_i',{start:0,end:-1}),frameRate:7,repeat:-1});
      an.create({key:j+'_'+c+'-r',frames:an.generateFrameNumbers(j+'_'+c+'_r',{start:0,end:-1}),frameRate:10,repeat:-1});
    }
  }
  an.create({key:'boat-a', frames:an.generateFrameNumbers('boat', {start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'sboat-a',frames:an.generateFrameNumbers('sboat',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'shark-a',frames:an.generateFrameNumbers('shark',{start:0,end:-1}),frameRate:8,repeat:-1});
  an.create({key:'tnt-idle',frames:an.generateFrameNumbers('goblin_tnt',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'tnt-run', frames:an.generateFrameNumbers('goblin_tnt',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'cerdo-idle',frames:an.generateFrameNumbers('pig_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'cerdo-run', frames:an.generateFrameNumbers('pig_run', {start:0,end:-1}),frameRate:10,repeat:-1});

  // ---- mar + foam + suelo (RenderTexture: 1 draw call para todo el piso) ----
  this.add.tileSprite(0,0,WORLD_W,WORLD_H,'water').setOrigin(0,0).setDepth(-30);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(!land[y][x]) continue;
    let coast=false;
    for(let oy=-1;oy<=1&&!coast;oy++)for(let ox=-1;ox<=1;ox++) if(!isLand(x+ox,y+oy)){coast=true;break;}
    if(coast) this.add.sprite(x*T+T/2,y*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(land[y][x]) rt.drawFrame('ground',groundIdx(x,y),x*T,y*T);

  // ---- plaza real + CALLES de arena (autotile) barrio→plaza ----
  const px=Math.floor(COLS/2), py=Math.floor(ROWS/2);
  const pkey=(x,y)=>x+','+y;
  const sand=new Set();                                     // plaza ∪ calles (una sola zona para que empalmen)
  for(let y=py-1;y<=py+2;y++)for(let x=px-3;x<=px+3;x++) if(isLand(x,y)) sand.add(pkey(x,y));
  const plazaOnly=new Set(sand);
  const inPlaza=(x,y)=>plazaOnly.has(pkey(x,y));
  for(const g of GUILDS){                                   // calle en L con serpenteo, 1-2 tiles de ancho
    let sx=g.cx, sy=g.cy, guard=0;
    while((sx!==px||sy!==py)&&guard++<120){
      if(Math.abs(sx-px)>Math.abs(sy-py)) sx+=Math.sign(px-sx);
      else sy+=Math.sign(py-sy);
      if(Math.random()<0.22){ const jy=sy+pick([-1,1]); if(isLand(sx,jy)) sand.add(pkey(sx,jy)); }
      if(isLand(sx,sy)) sand.add(pkey(sx,sy));
    }
  }
  const inSand=(x,y)=>sand.has(pkey(x,y));
  sand.forEach(k=>{const [x,y]=k.split(',').map(Number); rt.drawFrame('ground',sandIdx(x,y,inSand),x*T,y*T);});

  npcGroup=this.physics.add.group();
  this.physics.add.collider(npcGroup,obstacles);
  this.physics.world.setBounds(T,T,WORLD_W-2*T,WORLD_H-2*T);

  // ---- castillo real + mercado en la plaza ----
  placeBuilding('castle_black',px,py-2,0.9,{fw:4,fh:2});
  banner(px,py,0xc9a227);
  placeTorch(px-3,py-2); placeTorch(px+3,py-2);
  placeDecoImg('stall1',px-2,py+2,0.85); placeDecoImg('stall2',px+2,py+2,0.85);
  placeDecoImg('tent1',px+3,py+1,0.85);  placeDecoImg('tent2',px-3,py+1,0.85);
  placeDecoImg('res_gold',px-1,py+2,0.5); placeDecoImg('res_meat',px+1,py+2,0.5); placeDecoImg('res_wood',px,py+2,0.5);
  placeTorch(px-3,py+2); placeTorch(px+3,py+2);
  const ch=scene.add.image(px*T+T/2+40,py*T+T/2,'td_chest').setOrigin(0.5,0.9).setScale(2.4); ch.setDepth(ch.y);

  // ---- barrios de facción AMURALLADOS: cerca perimetral con puertas donde pasa la calle ----
  const QRX=5, QRY=4;                                       // radio del barrio en tiles
  for(const g of GUILDS){
    const q=nudgeToLand(g.cx,g.cy); g.cx=q.x; g.cy=q.y;
    for(let y=g.cy-QRY;y<=g.cy+QRY;y++)for(let x=g.cx-QRX;x<=g.cx+QRX;x++){   // muralla (autotile del cerco)
      const t=y===g.cy-QRY, b=y===g.cy+QRY, l=x===g.cx-QRX, r=x===g.cx+QRX;
      if(!(t||b||l||r)||!isLand(x,y)||inSand(x,y)||blocked[y][x]) continue;   // puertas = tiles de calle
      const fr = t&&l?0 : t&&r?3 : b&&l?8 : b&&r?11 : t?pick([1,2]) : b?pick([9,10]) : l?4 : 7;
      scene.add.image(x*T+T/2,y*T+T-6,'fence',fr).setOrigin(0.5,1).setDepth(y*T+T-6);
      blocked[y][x]=true;
    }
    placeBuilding('tower_'+g.tex, g.cx, g.cy-1, 0.8, {fw:1,fh:1});
    banner(g.cx, g.cy, g.color); placeTorch(g.cx+1, g.cy); placeTorch(g.cx-QRX+1, g.cy-QRY+1);
    placeBuilding(pick(ESPECIALES)+'_'+g.tex, g.cx+rint(-2,2), g.cy+2, 0.78, {fw:2,fh:1});
    let puestas=0, intentos=0;
    while(puestas<8&&intentos++<70){
      const hx=g.cx+rint(-QRX+1,QRX-1), hy=g.cy+rint(-QRY+1,QRY-1);
      if(!isLand(hx,hy)||blocked[hy][hx]||inSand(hx,hy)) continue;
      placeBuilding(pick(CASAS)+'_'+g.tex, hx, hy, Phaser.Math.FloatBetween(0.72,0.88), {fw:1,fh:1});
      puestas++;
    }
  }

  // ---- ZONA GOBLIN (NE): bosque oscuro y denso, su hábitat natural ----
  const gc=nudgeToLand(COLS-7,4);
  for(let i=0;i<14;i++){ const tx=Phaser.Math.Clamp(gc.x+rint(-4,3),1,COLS-2), ty=Phaser.Math.Clamp(gc.y+rint(-2,5),1,ROWS-2);
    if(isLand(tx,ty)&&!blocked[ty][tx]&&!inSand(tx,ty)) placeTree(tx,ty); }
  placeBuilding('goblin_house',gc.x,gc.y,0.8,{fw:1,fh:1}); placeBuilding('goblin_house',gc.x-2,gc.y+2,0.72,{fw:1,fh:1});
  placeDecoImg('tdeco18',gc.x+1,gc.y+1,0.95); placeDecoImg('tdeco14',gc.x-1,gc.y+1,0.9);   // tótem y huesos
  for(let i=0;i<6;i++){const fx=gc.x+rint(-3,2),fy=gc.y+rint(-1,3);
    if(isLand(fx,fy)&&!blocked[fy][fx]&&!inSand(fx,fy)&&Math.random()<0.7){scene.add.image(fx*T+T/2,fy*T+T-6,'fence',pick([1,2,9,10])).setOrigin(0.5,1).setDepth(fy*T+T-6); blocked[fy][fx]=true;}}
  for(let i=0;i<4;i++) spawnMonster(pick(['torch','spear','shaman','tnt']), gc.x+rint(-3,2), gc.y+rint(-1,3), {tx:gc.x,ty:gc.y,r:4});

  // ---- ZONA SALVAJE (O): cueva, fieras y carroña ----
  const cv=nudgeToLand(4,py-2);
  scene.add.sprite(cv.x*T+T/2,cv.y*T+T,'cave').play('cave-a').setOrigin(0.5,1).setScale(0.9).setDepth(cv.y*T+T);
  if(blocked[cv.y]) blocked[cv.y][cv.x]=true;
  placeDecoImg('tdeco14',cv.x+1,cv.y+1,0.9); placeDecoImg('tdeco15',cv.x-1,cv.y,0.9);
  spawnMonster('bear',cv.x+2,cv.y+1,{tx:cv.x,ty:cv.y,r:5}); spawnMonster('snake',cv.x+1,cv.y+2,{tx:cv.x,ty:cv.y,r:4}); spawnMonster('spider',cv.x+3,cv.y,{tx:cv.x,ty:cv.y,r:4});
  for(let i=0;i<3;i++){ const b=scene.add.image(cv.x*T+rint(-40,220), cv.y*T+rint(-60,60),'td_bat').setScale(2.2).setDepth(88000).setAlpha(0.9);   // murciélagos volando
    const cxb=b.x, cyb=b.y, rad=rint(50,110); let a0=Math.random()*6.28;
    scene.tweens.add({targets:{v:0},v:6.28,duration:rint(5000,9000),repeat:-1,
      onUpdate:(tw)=>{const a=a0+tw.getValue(); b.x=cxb+Math.cos(a)*rad; b.y=cyb+Math.sin(a)*rad*0.5; b.setFlipX(Math.cos(a)<0);}}); }

  // ---- mina (S-O) ----
  const gm=nudgeToLand(px-8,ROWS-6);
  placeBuilding('goldmine',gm.x,gm.y,0.8,{fw:2,fh:1}); placeDecoImg('res_gold',gm.x+1,gm.y+1,0.5); placeDecoImg('rock2',gm.x-1,gm.y+1,0.85);
  gmPos={x:gm.x*T+T/2, y:(gm.y+1)*T+T/2};

  // ---- ZONA GRANJA (S-E): cultivos en filas + corral con cerdos y ovejas ----
  const fa=nudgeToLand(px+8,ROWS-7);
  placeDecoImg('tdeco16',fa.x,fa.y-1,1);                                     // espantapájaros
  for(let ry=0;ry<2;ry++)for(let rx=0;rx<4;rx++){                            // filas de zapallos
    const zx=fa.x-1+rx, zy=fa.y+ry;
    if(isLand(zx,zy)&&!blocked[zy][zx]&&!inSand(zx,zy)){ placeDecoImg(pick(['tdeco12','tdeco13']),zx,zy,0.85); blocked[zy][zx]=true; } }
  for(let y=fa.y+2;y<=fa.y+4;y++)for(let x=fa.x-2;x<=fa.x+2;x++){            // corral (autotile, con puerta)
    const t=y===fa.y+2, b=y===fa.y+4, l=x===fa.x-2, r=x===fa.x+2;
    if(!(t||b||l||r)||!isLand(x,y)||blocked[y][x]||(x===fa.x&&t)) continue;
    const fr = t&&l?0 : t&&r?3 : b&&l?8 : b&&r?11 : t?pick([1,2]) : b?pick([9,10]) : l?4 : 7;
    scene.add.image(x*T+T/2,y*T+T-6,'fence',fr).setOrigin(0.5,1).setDepth(y*T+T-6); blocked[y][x]=true; }
  const pen={tx:fa.x,ty:fa.y+3,r:1};
  spawnSheep(fa.x-1,fa.y+3,pen); spawnSheep(fa.x+1,fa.y+3,pen);
  spawnPig(fa.x,fa.y+3,pen); spawnPig(fa.x+1,fa.y+4,pen);
  spawnPig(fa.x-4,fa.y,null); // un cerdo suelto

  // ---- bosques animados + arbustos + rocas + decos por todos lados ----
  for(let c=0;c<8;c++){ const t=randFree(); if(!t) continue;
    for(let k=rint(3,7);k>0;k--){ const gx=Phaser.Math.Clamp(t.x+rint(-2,2),1,COLS-2), gy=Phaser.Math.Clamp(t.y+rint(-2,2),1,ROWS-2);
      if(isLand(gx,gy)&&!blocked[gy][gx]&&!inSand(gx,gy)) placeTree(gx,gy); } }
  for(let i=0;i<16;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)) placeTree(t.x,t.y);}
  for(let i=0;i<18;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)){const b='bush'+rint(1,4);
    scene.add.sprite(t.x*T+T/2,t.y*T+T-4,b).play({key:b+'-a',startFrame:rint(0,7)}).setOrigin(0.5,1).setScale(0.6).setDepth(t.y*T+T-4);}}
  for(let i=0;i<14;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)) placeDecoImg('rock'+rint(1,4),t.x,t.y,0.8);}
  for(let i=0;i<40;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)) placeDecoImg('tdeco'+rint(1,11),t.x,t.y,Phaser.Math.FloatBetween(0.7,1));}
  for(let i=0;i<5;i++){const t=randFree(); if(t) spawnSheep(t.x,t.y);}

  // ---- casillas caminables ----
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++) if(isLand(x,y)&&!blocked[y][x]) walkTiles.push({x:x*T+T/2,y:y*T+T/2});

  // ---- población: guerreros, aldeanos, arqueros y monjes ----
  for(let i=0;i<NPC_START;i++) spawnNpc(null, pick(POPMIX));
  for(const g of GUILDS){ spawnWorker(g.id,'waxe'); spawnWorker(g.id,'wpick'); }   // leñador y minero por facción
  spawnWorker(pick(GUILDS).id,'wgold'); spawnWorker(pick(GUILDS).id,'wgold');      // cargadores de oro
  for(let i=0;i<N_MONSTERS;i++){ const t=randFree(); if(t) spawnMonster(pick(ROAMERS),t.x,t.y); }

  // ---- barcos y tiburón navegando el mar abierto ----
  const openSea=[];
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
    if(land[y][x]) continue;
    let near=false;
    for(let oy=-1;oy<=1&&!near;oy++)for(let ox=-1;ox<=1;ox++) if(isLand(x+ox,y+oy)){near=true;break;}
    if(!near) openSea.push({x:x*T+T/2,y:y*T+T/2});
  }
  function cruise(key,anim,sc,spdPx){
    if(openSea.length<4) return;
    const s=scene.add.sprite(pick(openSea).x,pick(openSea).y,key).play(anim).setScale(sc).setDepth(-23);
    (function leg(){
      const to=pick(openSea);
      const d=Math.hypot(to.x-s.x,to.y-s.y), dur=Math.max(2000,d/spdPx*1000);
      s.setFlipX(to.x<s.x);
      scene.tweens.add({targets:s,x:to.x,y:to.y,duration:dur,ease:'Sine.easeInOut',onComplete:leg});
    })();
  }
  cruise('boat','boat-a',0.7,26);
  cruise('sboat','sboat-a',0.75,20);
  cruise('shark','shark-a',0.7,34);

  // ---- mar vivo: rocas animadas + patito · cielo: nubes a la deriva ----
  let puestasW=0, intW=0;
  while(puestasW<7&&intW++<80){
    const x=rint(0,COLS-1), y=rint(0,ROWS-1);
    if(land[y][x]||isLand(x-1,y)||isLand(x+1,y)||isLand(x,y-1)||isLand(x,y+1)) continue;
    const k='wrock'+rint(1,4);
    this.add.sprite(x*T+T/2,y*T+T/2,k).play({key:k+'-a',startFrame:rint(0,7)}).setDepth(-24).setScale(0.8);
    puestasW++;
  }
  { let dx0=-1,dy0=-1,intD=0;
    while(intD++<80){ const x=rint(0,COLS-1), y=rint(0,ROWS-1);
      if(!land[y][x]&&!isLand(x-1,y)&&!isLand(x+1,y)&&!isLand(x,y-1)&&!isLand(x,y+1)){dx0=x;dy0=y;break;} }
    if(dx0>=0){ const d=this.add.sprite(dx0*T+T/2,dy0*T+T/2,'duck').play('duck-a').setDepth(-24).setScale(1.4);
      this.tweens.add({targets:d,x:d.x+rint(-60,60),y:d.y+rint(-40,40),duration:9000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); } }
  for(let i=1;i<=4;i++){
    const c=this.add.image(rint(0,WORLD_W),rint(60,WORLD_H-60),'cloud'+i).setAlpha(0.4).setDepth(89000).setScale(Phaser.Math.FloatBetween(0.7,1.1));
    const dur=rint(60000,120000);
    this.tweens.add({targets:c,x:WORLD_W+340,duration:dur*(WORLD_W+340-c.x)/(WORLD_W+680),ease:'Linear',
      onComplete:function rep(tw,targets){const cl=targets[0]; cl.x=-340; cl.y=rint(60,WORLD_H-60);
        scene.tweens.add({targets:cl,x:WORLD_W+340,duration:dur,ease:'Linear',onComplete:rep});}});
  }

  nightRect=this.add.rectangle(0,0,10,10,0x0a1436,0).setOrigin(0,0).setScrollFactor(0).setDepth(90000);
  this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
  fitCamera(); this.scale.on('resize',fitCamera);

  // ---- lupa: rueda = zoom hacia el puntero · arrastrar = mover · doble click = vista general ----
  this.input.on('wheel',(p,objs,dx,dy)=>{
    const cam=this.cameras.main;
    manualView=true; reticleLock(false);
    const z=Phaser.Math.Clamp(cam.zoom*(dy>0?0.87:1.15), baseZoom*0.85, 3.4);
    cam.setZoom(z);
    const wp=cam.getWorldPoint(p.x,p.y);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x,wp.x,0.3), Phaser.Math.Linear(cam.midPoint.y,wp.y,0.3));
  });
  this.input.on('pointermove',p=>{
    if(!manualView||!p.isDown) return;
    const cam=this.cameras.main;
    cam.scrollX-=(p.x-p.prevPosition.x)/cam.zoom;
    cam.scrollY-=(p.y-p.prevPosition.y)/cam.zoom;
  });
  this.game.canvas.addEventListener('dblclick',()=>{ manualView=false; cameraBusy=false; fitCamera(); });
  seedFeed();
}

/* ===== colocación ===== */
function placeBuilding(key,tx,ty,sc,opt){
  opt=opt||{fw:1,fh:1};
  const x=tx*T+T/2, y=ty*T+T;
  const spr=scene.add.image(x,y,key).setOrigin(0.5,1).setScale(sc).setDepth(y);
  const src=scene.textures.get(key).getSourceImage();
  const foot=scene.add.rectangle(x,y-12,src.width*sc*0.5,22).setOrigin(0.5,0.5).setVisible(false);
  scene.physics.add.existing(foot,true); obstacles.add(foot);
  for(let ox=0;ox<opt.fw;ox++)for(let oy=0;oy<opt.fh;oy++){
    const gx=tx-Math.floor(opt.fw/2)+ox, gy=ty-oy;
    if(blocked[gy]&&gx>=0&&gx<COLS) blocked[gy][gx]=true;
  }
  buildings.push({spr,x,y,tx,ty,ruined:false});
  return spr;
}
function placeDecoImg(key,tx,ty,sc){
  const x=tx*T+T/2, y=ty*T+T-4;
  scene.add.image(x,y,key).setOrigin(0.5,1).setScale(sc).setDepth(y);
}
function placeTree(tx,ty){
  const x=tx*T+T/2, y=ty*T+T;
  scene.add.sprite(x,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(Phaser.Math.FloatBetween(0.55,0.72)).setDepth(y);
  if(blocked[ty]) blocked[ty][tx]=true;
  treeSpots.push({x:x, y:y+T*0.6});
}
function banner(tx,ty,color){
  const x=tx*T+T/2, y=ty*T+T/2;
  scene.add.rectangle(x,y-4,3,26,0x4a3d2c).setDepth(y+40);
  const fl=scene.add.triangle(x+2,y-16,0,0,20,6,0,14,color).setOrigin(0,0).setDepth(y+40);
  fl.setStrokeStyle(1,0x120d09,0.6);
}
function placeTorch(tx,ty){
  const x=tx*T+T/2, y=ty*T+T-4;
  const glow=scene.add.circle(x,y-26,22,0xffb060,0.26).setDepth(y-1);
  scene.add.image(x,y,'td_torch').setOrigin(0.5,1).setScale(2.4).setDepth(y);
  scene.tweens.add({targets:glow,alpha:{from:0.16,to:0.34},scaleX:{from:0.9,to:1.2},scaleY:{from:0.9,to:1.2},duration:560,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
}
function makeName(){const b=pick(NAME_B);return b?`${pick(NAME_A)} ${b}`:pick(NAME_A);}

/* ===== spawns ===== */
function spawnNpc(gid,tipo){
  if(livingNpcs().length>=NPC_MAX) return null;
  const g=gid?guildById[gid]:pick(GUILDS);
  tipo=tipo||'warrior';
  const sp0=nearWalkable(Phaser.Math.Clamp(g.cx+rint(-3,3),1,COLS-2), Phaser.Math.Clamp(g.cy+rint(-2,3),1,ROWS-2));
  const sx=sp0.x, sy=sp0.y;
  const n={sheep:false,monster:false,guild:g.id,tex:g.tex,tipo,name:makeName(),race:pick(RACES),cls:pick(CLASSES),
    av:'h'+String(rint(1,25)).padStart(2,'0'),
    faceUp:false,faceLeft:false,idle:0,stuck:0,label:null,dead:false};
  if(tipo==='warrior'){
    n.spr=scene.physics.add.sprite(sx*T+T/2,sy*T+T/2,'warrior_'+g.tex,0).setOrigin(0.5,0.95).setScale(WSCALE);
    n.spr.body.setSize(26,20).setOffset(42,68);
    n.animI='warrior_'+g.tex+'-idleF'; n.animR='warrior_'+g.tex+'-runF'; n.animRB='warrior_'+g.tex+'-runB'; n.animIB='warrior_'+g.tex+'-idleB';
    n.spd=40;
  } else {
    // unidades con frame 192: aldeano, arquero, monje
    const texKey = tipo==='archer'?'archer_'+g.tex+'_i' : tipo==='monk'?'monk_'+g.tex+'_i' : 'pawn_'+g.tex;
    n.spr=scene.physics.add.sprite(sx*T+T/2,sy*T+T/2,texKey,0).setOrigin(0.5,0.72).setScale(PSCALE);
    n.spr.body.setSize(30,20).setOffset(81,118);
    if(tipo==='archer'){ n.animI='archer_'+g.tex+'-i'; n.animR='archer_'+g.tex+'-r'; n.spd=44; }
    else if(tipo==='monk'){ n.animI='monk_'+g.tex+'-i'; n.animR='monk_'+g.tex+'-r'; n.spd=30; }
    else { n.animI='pawn_'+g.tex+'-idle'; n.animR='pawn_'+g.tex+'-run'; n.spd=34; }
  }
  n.spr.setCollideWorldBounds(true); npcGroup.add(n.spr); n.spr.setDepth(n.spr.y);
  n.spr.play(n.animI);
  n.lx=n.spr.x; n.ly=n.spr.y; retarget(n); npcs.push(n); return n;
}
const POPMIX=['warrior','warrior','warrior','pawn','pawn','pawn','archer','monk'];
function spawnWorker(gid,job){                       // leñador/minero/cargador que patrulla sitio ↔ barrio
  const g=guildById[gid]||pick(GUILDS);
  const site = job==='waxe' ? (pick(treeSpots)||gmPos) : gmPos;
  if(!site) return null;
  const home={x:g.cx*T+T/2, y:g.cy*T+T/2};
  const n=spawnNpc(g.id,'pawn'); if(!n) return null;
  n.tipo=job; n.animI=job+'_'+g.tex+'-i'; n.animR=job+'_'+g.tex+'-r';
  n.spr.setTexture(job+'_'+g.tex+'_i',0); n.spr.play(n.animI);
  n.patrol=[site,home]; n.pIx=0; n.tx=site.x; n.ty=site.y;
  return n;
}
function spawnSheep(tx,ty,home){
  const sp0=nearWalkable(tx,ty); tx=sp0.x; ty=sp0.y;
  const s=scene.physics.add.sprite(tx*T+T/2,ty*T+T/2,'sheep',0).setOrigin(0.5,0.9).setScale(0.85);
  s.play('sheep-idle'); s.setDepth(s.y); npcGroup.add(s);
  npcs.push({spr:s,sheep:true,monster:false,tipo:'sheep',spd:14,animI:'sheep-idle',home:home||null,tx:s.x,ty:s.y,idle:0,stuck:0,lx:s.x,ly:s.y,dead:false});
}
function spawnPig(tx,ty,home){
  const sp0=nearWalkable(tx,ty); tx=sp0.x; ty=sp0.y;
  const s=scene.physics.add.sprite(tx*T+T/2,ty*T+T/2,'pig_idle',0).setOrigin(0.5,0.72).setScale(0.55);
  s.play('cerdo-idle'); s.setDepth(s.y); npcGroup.add(s);
  npcs.push({spr:s,sheep:true,monster:false,tipo:'pig',spd:18,animI:'cerdo-idle',animR:'cerdo-run',home:home||null,tx:s.x,ty:s.y,idle:0,stuck:0,lx:s.x,ly:s.y,dead:false});
}
function spawnMonster(kind,tx,ty,home){
  const d=MONDEF[kind]; if(!d) return null;
  const sp0=nearWalkable(Phaser.Math.Clamp(tx,1,COLS-2), Phaser.Math.Clamp(ty,1,ROWS-2));
  tx=sp0.x; ty=sp0.y;
  const s=scene.physics.add.sprite(tx*T+T/2,ty*T+T/2,d.ti,0).setOrigin(0.5,0.72).setScale(d.sc);
  const bw=d.fw===256?36:30;
  s.body.setSize(bw,22).setOffset((d.fw-bw)/2, d.fw*0.72-24);
  s.setCollideWorldBounds(true); npcGroup.add(s); s.setDepth(s.y); s.play(d.ai);
  const n={spr:s,sheep:false,monster:true,tipo:kind,kind,spd:d.spd,animI:d.ai,animR:d.ar,home:home||null,tx:s.x,ty:s.y,idle:0,stuck:0,lx:s.x,ly:s.y,dead:false};
  retarget(n); npcs.push(n); return n;
}
/* ===== pathfinding (BFS por tiles): nadie camina por el agua ===== */
const walkable=(x,y)=>x>=1&&x<COLS-1&&y>=1&&y<ROWS-1&&isLand(x,y)&&!blocked[y][x];
function findPath(x0,y0,x1,y1){
  if(!walkable(x1,y1)||(!walkable(x0,y0))) return null;
  if(x0===x1&&y0===y1) return [];
  const prev=new Map(), key=(x,y)=>y*COLS+x, q=[[x0,y0]]; prev.set(key(x0,y0),null);
  while(q.length){
    const [cx,cy]=q.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy, k=key(nx,ny);
      if(prev.has(k)||!walkable(nx,ny)) continue;
      prev.set(k,key(cx,cy));
      if(nx===x1&&ny===y1){                                  // reconstruir
        const path=[]; let cur=k;
        while(cur!==null){ path.push({x:(cur%COLS)*T+T/2, y:Math.floor(cur/COLS)*T+T/2}); cur=prev.get(cur); }
        path.reverse(); path.shift(); return path;
      }
      q.push([nx,ny]);
    }
  }
  return null;
}
function tileOf(px_,py_){ return {x:Phaser.Math.Clamp(Math.floor(px_/T),0,COLS-1), y:Phaser.Math.Clamp(Math.floor(py_/T),0,ROWS-1)}; }
function nearWalkable(tx,ty){                       // tile caminable más cercano (espiral) — nadie nace en el agua
  if(walkable(tx,ty)) return {x:tx,y:ty};
  for(let r=1;r<=6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
    if(walkable(tx+dx,ty+dy)) return {x:tx+dx,y:ty+dy};
  }
  const w=pick(walkTiles); return w?tileOf(w.x,w.y):{x:tx,y:ty};
}
function retarget(n){
  const cur=tileOf(n.spr.x,n.spr.y);
  let dest=null;
  if(n.patrol){ n.pIx=1-n.pIx; const p=n.patrol[n.pIx]; dest=tileOf(p.x,p.y); }
  else if(n.home){ for(let i=0;i<12&&!dest;i++){ const dx=n.home.tx+rint(-n.home.r,n.home.r), dy=n.home.ty+rint(-n.home.r,n.home.r); if(walkable(dx,dy)) dest={x:dx,y:dy}; } }
  if(!dest){ const w=pick(walkTiles); if(!w) return; dest=tileOf(w.x,w.y); }
  const path=findPath(cur.x,cur.y,dest.x,dest.y);
  if(path&&path.length){ n.path=path; const p=n.path.shift(); n.tx=p.x+rint(-10,10); n.ty=p.y+rint(-10,10); }
  else { n.path=null; n.tx=n.spr.x; n.ty=n.spr.y; }
}

/* ===== cámara ===== */
function fitCamera(){if(!scene)return;const cam=scene.cameras.main,vw=scene.scale.width,vh=scene.scale.height;
  baseZoom=Math.min(vw/WORLD_W,vh/WORLD_H)*0.98;
  if(nightRect) nightRect.setSize(vw,vh);
  if(manualView) return;                                    // lupa activa: no recentrar
  if(!cameraBusy){cam.setZoom(baseZoom);cam.centerOn(baseCX,baseCY);}}
function cutToPos(x,y){if(cameraBusy||manualView)return;cameraBusy=true;const cam=scene.cameras.main,z=Math.min(Math.max(baseZoom*3.6,baseZoom+0.9),2.2);
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
function puff(key,x,y,tint,count,scMax,rise,dur){
  for(let i=0;i<count;i++){
    const p=scene.add.image(x+rint(-10,10),y+rint(-6,6),key).setDepth(99999)
      .setScale(Phaser.Math.FloatBetween(0.03,scMax)).setAlpha(0.9).setAngle(rint(0,359));
    if(tint) p.setTint(tint);
    scene.tweens.add({targets:p,x:p.x+rint(-24,24),y:p.y-rise-rint(0,28),alpha:0,
      scale:p.scale*Phaser.Math.FloatBetween(1.6,2.4),angle:p.angle+rint(-40,40),
      duration:dur+rint(-150,250),ease:'Quad.easeOut',onComplete:()=>p.destroy()});
  }
}
function boom(x,y){ const e=scene.add.sprite(x,y,'explosion').setDepth(99999).setScale(0.9);
  e.play('explosion-a'); e.once('animationcomplete',()=>e.destroy()); }
function playFx(kind,x,y){const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(kind==='fire'){ boom(x,y); puff('p_smoke',x,y-18,0x554f48,5,0.11,42,1400); if(!rm)scene.cameras.main.shake(340,0.007); }
  else if(kind==='clash'){ ring(x,y,0xffffff); puff('p_star',x,y-8,0xffe9b0,5,0.07,14,520);
    burst(x,y,0xd64545,8,8); scene.cameras.main.flash(120,229,220,180); }
  else if(kind==='ring'){ ring(x,y,0xc9a227); puff('p_magic',x,y-8,0xc9a227,6,0.07,16,800); }
  else if(kind==='confetti'){ [0xd64545,0x4a90c2,0x5fa55a,0x9b6fce,0xc9a227].forEach(c=>puff('p_star',x,y-6,c,3,0.05,20,900)); }}

/* ===== consecuencias persistentes ===== */
function ruinBuilding(b){
  if(!b||b.ruined)return; b.ruined=true;
  b.spr.setTint(0x5a4438);
  scene.add.ellipse(b.x,b.y-4,b.spr.displayWidth*0.6,24,0x120b06,0.5).setDepth(b.y-1);
  const f=scene.add.sprite(b.x,b.y-8,'fire').play('fire-a').setOrigin(0.5,1).setScale(0.85).setDepth(b.y+1);   // fuego animado persistente
  const smoke=scene.time.addEvent({delay:640,loop:true,callback:()=>{
    if(paused)return; const p=scene.add.image(b.x+rint(-8,8),b.y-46,'p_smoke').setTint(0x555049).setAlpha(0.42).setDepth(99990).setScale(0.06).setAngle(rint(0,359));
    scene.tweens.add({targets:p,y:p.y-52,x:p.x+rint(-12,12),alpha:0,scale:0.15,angle:p.angle+rint(-30,30),duration:2400,ease:'Sine.easeOut',onComplete:()=>p.destroy()});
  }});
  b.smoke=smoke; b.fireSpr=f;
}
function grave(x,y){
  const g=scene.add.graphics().setDepth(y);
  g.fillStyle(0x6b6459,1); g.fillRoundedRect(x-7,y-18,14,18,{tl:7,tr:7,bl:0,br:0});
  g.fillStyle(0x4a4640,1); g.fillRect(x-2,y-14,4,10); g.fillRect(x-6,y-11,12,4);
  g.fillStyle(0x2c3320,0.5); g.fillEllipse(x,y,20,6);
}
function killNpc(n){
  if(!n||n.dead||n.sheep||n.monster)return; n.dead=true;
  npcs=npcs.filter(x=>x!==n);
  const gx=n.spr.x,gy=n.spr.y;
  n.spr.body.setVelocity(0); n.spr.destroy();
  const d=scene.add.sprite(gx,gy,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.55).setDepth(gy);   // animación de muerte
  d.once('animationcomplete',()=>{d.destroy(); grave(gx,gy);});
}
function defect(n){
  if(!n||n.dead||n.sheep||n.monster)return;
  const others=GUILDS.filter(g=>g.id!==n.guild); const g=pick(others);
  n.guild=g.id; n.tex=g.tex;
  if(n.tipo==='warrior'){ n.spr.setTexture('warrior_'+g.tex, n.spr.frame.name);
    n.animI='warrior_'+g.tex+'-idleF'; n.animR='warrior_'+g.tex+'-runF'; n.animRB='warrior_'+g.tex+'-runB'; n.animIB='warrior_'+g.tex+'-idleB'; }
  else { n.spr.setTexture('pawn_'+g.tex, n.spr.frame.name); n.animI='pawn_'+g.tex+'-idle'; n.animR='pawn_'+g.tex+'-run'; }
  scene.cameras.main.flash(90,255,255,255);
  burst(n.spr.x,n.spr.y-30,g.color,10,10);
}
function poofMonster(n){
  if(!n||n.dead)return; n.dead=true; npcs=npcs.filter(x=>x!==n);
  ring(n.spr.x,n.spr.y-12,0xb060d0); burst(n.spr.x,n.spr.y-14,0x9b6fce,10,10);
  n.spr.destroy();
}
function spawnRaid(){
  const g=pick(GUILDS), mm=[];
  for(let i=rint(3,5);i>0;i--){
    const m=spawnMonster(pick(['torch','torch','spear','shaman','pigrider','tnt']), g.cx+rint(-3,3), g.cy+rint(-3,3));
    if(m) mm.push(m);
  }
  return {cx:g.cx*T+T/2, cy:g.cy*T+T/2, mm};
}
function spawnDragon(x,y){
  // "una sombra alada": silueta oscura que cruza en picada + sombra en el suelo
  const sh=scene.add.ellipse(x-260,y,90,28,0x0a0a14,0.35).setDepth(y-1);
  const d=scene.add.image(x-260,y-150,'td_bat').setOrigin(0.5,0.5).setScale(7).setTint(0x141024).setAlpha(0.92).setDepth(99995);
  scene.tweens.add({targets:d,x:x,y:y-60,duration:700,ease:'Quad.easeIn',onComplete:()=>{
    scene.tweens.add({targets:d,x:x+300,y:y-190,alpha:0,duration:900,ease:'Quad.easeOut',onComplete:()=>d.destroy()});
  }});
  scene.tweens.add({targets:sh,x:x+300,scaleX:{from:0.6,to:1.4},alpha:{from:0.35,to:0},duration:1600,ease:'Sine.easeIn',onComplete:()=>sh.destroy()});
}
function spawnBeast(){                          // el minotauro cruza la isla
  const fromLeft=Math.random()<0.5;
  const sy=rint(6,ROWS-7)*T;
  const m=scene.add.sprite(fromLeft?-100:WORLD_W+100, sy,'minotaur_walk').play('mino-walk').setOrigin(0.5,0.72).setScale(0.75).setDepth(sy);
  m.setFlipX(!fromLeft);
  scene.tweens.add({targets:m,x:fromLeft?WORLD_W+120:-120,duration:14000,ease:'Linear',
    onUpdate:()=>m.setDepth(m.y),onComplete:()=>m.destroy()});
  return {x:fromLeft?T*6:WORLD_W-T*6, y:sy};
}
function dropTreasure(x,y){
  const kind=Math.random()<0.25?'mimic':'chest';
  const c=scene.add.image(x,y,'td_'+kind).setOrigin(0.5,0.9).setScale(0.1).setDepth(y);
  scene.tweens.add({targets:c,scale:2.8,duration:420,ease:'Back.easeOut'});
  ring(x,y-8,0xc9a227); burst(x,y-8,0xc9a227,10,8);
}

/* ===== motor narrativo ===== */
const TPL=[
  {tag:'MISIÓN',c:'#c9a227',major:false,t:x=>`${x.a}, ${x.cls} ${x.race}, acepta un contrato para limpiar las alcantarillas de ${x.d}.`},
  {tag:'MERCADO',c:'#e2a24a',major:false,t:x=>`Una caravana entra por la Puerta Sur cargada de ${x.i}. Los precios tiemblan.`},
  {tag:'TABERNA',c:'#d99a5a',major:false,t:x=>`${x.a} y ${x.b} se van a los gritos en la taberna de ${x.d}. Corre la cerveza, no la sangre… todavía.`},
  {tag:'GREMIO',c:'#8fb4d6',major:false,t:x=>`El ${x.g} recluta a ${x.a}. Juramento sellado con hierro y silencio.`},
  {tag:'RUMOR',c:'#a99a7a',major:false,t:x=>`Corre el rumor: ${x.a} le debe ${x.i} al ${x.g} y ya no responde a nadie.`},
  {tag:'NOCHE',c:'#8c7f68',major:false,snd:'bell',t:x=>`Repican las campanas: la vigilia cambia de guardia en ${x.d}.`},
  {tag:'REFUERZO',c:'#8fb4d6',major:false,spawn:true,snd:'door',t:x=>`Un barco atraca en los muelles: nuevos brazos para el ${x.g}.`},
  {tag:'PASTOR',c:'#9fb06a',major:false,t:x=>`Las ovejas de ${x.d} escapan del corral. Alguien maldice en voz alta.`},
  {tag:'LADRÓN',c:'#b8b8b8',major:false,thief:true,snd:'coins',t:x=>`Un ladrón se escurre entre los puestos de ${x.d}. Faltan monedas, sobran sospechas.`},
  {tag:'FAUNA',c:'#c97b4a',major:false,fauna:true,t:x=>`¡Un oso bajó del monte! El rebaño corre en círculos y el pastor pide ayuda a gritos.`},
  {tag:'GUERRA',c:'#e5533a',major:true,fx:'fire',kind:'ruin',snd:'fire',t:x=>`GUERRA DE FACCIONES. El ${x.g} asalta ${x.d}. El acero canta y las puertas arden.`},
  {tag:'DRAGÓN',c:'#f2703a',major:true,fx:'fire',kind:'ruin',dragon:true,snd:'fire',t:x=>`¡DRAGÓN! Una sombra alada cae sobre ${x.d}. Fuego, ceniza y gritos.`},
  {tag:'INVASIÓN',c:'#7fbf5a',major:true,fx:'clash',kind:'raid',snd:'latch',t:x=>`¡INVASIÓN! Una horda goblin sale de las Profundidades y cae sobre ${x.d}. ¡A las armas!`},
  {tag:'BESTIA',c:'#c97b4a',major:true,fx:'clash',kind:'beast',snd:'latch',t:x=>`UNA BESTIA ancestral cruza la isla. El suelo tiembla bajo sus pezuñas.`},
  {tag:'DUELO',c:'#ff6b6b',major:true,fx:'clash',kind:'kill',snd:'clash',t:x=>`DUELO A MUERTE: ${x.a} contra ${x.b}. Solo uno queda en pie sobre la hierba.`},
  {tag:'MAGNICIDIO',c:'#9aa0a6',major:true,fx:'clash',kind:'kill',snd:'clash',t:x=>`MAGNICIDIO. ${x.a} cae sin vida en ${x.d}. El ${x.g} lo niega todo.`},
  {tag:'HALLAZGO',c:'#c9a227',major:true,fx:'ring',kind:'none',treasure:true,snd:'coins',t:x=>`HALLAZGO. ${x.a} desentierra ${x.i} en las ruinas bajo ${x.d}. Todos lo quieren.`},
  {tag:'FIESTA',c:'#c9a227',major:true,fx:'confetti',kind:'none',snd:'bong',t:x=>`FESTÍN en ${x.d}: música, antorchas y vino. Hasta el ${x.g} baja las armas.`},
  {tag:'TRAICIÓN',c:'#9b6fce',major:true,fx:'clash',kind:'defect',snd:'clash',t:x=>`TRAICIÓN. ${x.a} abandona el ${x.g} y jura lealtad a otro estandarte.`},
];
function livingNpcs(){return npcs.filter(n=>!n.sheep&&!n.monster&&!n.dead);}
// pool automático: solo vida ambiente + hallazgos/fiestas/bichos. Los eventos destructivos
// entre gremios (GUERRA/DUELO/MAGNICIDIO/TRAICIÓN/DRAGÓN) se lanzan a mano desde el director.
const AUTO_POOL=TPL.filter(t=>!t.major).concat(TPL.filter(t=>['HALLAZGO','FIESTA','INVASIÓN','BESTIA'].includes(t.tag)));
const TPL_BY_TAG=Object.fromEntries(TPL.map(t=>[t.tag,t]));

// La CONSECUENCIA corre SIEMPRE para eventos major (con o sin corte de cámara),
// así el mundo queda consistente con la crónica. Guards en ruinBuilding/killNpc/defect.
function applyConsequence(tpl,a,b,focus){
  if(focus){ playFx(tpl.fx,focus.x,focus.y-30); if(tpl.dragon) spawnDragon(focus.x,focus.y-30); ruinBuilding(focus); return; }
  playFx(tpl.fx,a.spr.x,a.spr.y);
  if(tpl.kind==='kill')        killNpc(Math.random()<0.5?a:b);
  else if(tpl.kind==='defect') defect(a);
  else if(tpl.treasure)        dropTreasure(a.spr.x,a.spr.y);
}

function fireEvent(force){
  const tpl=force||pick(AUTO_POOL), living=livingNpcs(); if(!living.length)return;
  const a=pick(living); let b=pick(living),gd=0; while(b===a&&gd++<6) b=pick(living);
  const gsel=pick(GUILDS);
  const ctx={a:a.name,b:b.name,cls:a.cls,race:a.race,g:gsel.name,d:pick(DISTRICTS),i:pick(ITEMS)};
  const enemyEv=tpl.kind==='raid'||tpl.kind==='beast'||tpl.thief;
  const av=enemyEv?'e'+String(rint(1,18)).padStart(2,'0'):(tpl.major?a.av:null);
  const text=tpl.t(ctx); pushChronicle(tpl.tag,tpl.c,text,tpl.major,av);
  if(tpl.snd) sfx(tpl.snd, tpl.major?0.55:0.35);

  if(tpl.spawn){ spawnNpc(gsel.id, pick(POPMIX)); return; }
  if(tpl.thief){ const t=randFree(); if(t){ const m=spawnMonster('thief',t.x,t.y); if(m) scene.time.delayedCall(20000,()=>poofMonster(m)); } return; }
  if(tpl.fauna){                                            // ataque de fauna: un oso corre al rebaño
    const bears=npcs.filter(n=>n.monster&&n.kind==='bear'&&!n.dead);
    const flock=npcs.filter(n=>n.sheep&&!n.dead);
    if(bears.length&&flock.length){ const b2=pick(bears), v=pick(flock);
      b2.path=null; b2.home=null; b2.tx=v.spr.x; b2.ty=v.spr.y;
      scene.time.delayedCall(2200,()=>{ if(!v.dead){ v.dead=true; npcs=npcs.filter(x=>x!==v);
        burst(v.spr.x,v.spr.y-10,0xffffff,12,10); v.spr.destroy(); } });
    }
    return;
  }

  if(tpl.kind==='raid'){
    const r=spawnRaid();
    if(!cameraBusy){ setWatching(text); tViewers+=rint(150,480); cutToPos(r.cx,r.cy); }
    scene.time.delayedCall(700,()=>playFx('clash',r.cx,r.cy));
    if(Math.random()<0.5) scene.time.delayedCall(1800,()=>{ const v=pick(livingNpcs()); if(v) killNpc(v); });
    scene.time.delayedCall(6500,()=>r.mm.forEach(poofMonster));
    return;
  }
  if(tpl.kind==='beast'){
    const p=spawnBeast();
    if(!cameraBusy){ setWatching(text); tViewers+=rint(200,560); cutToPos(p.x,p.y); }
    return;
  }
  if(!tpl.major) return;

  const focus = tpl.kind==='ruin' ? (pick(buildings.filter(x=>!x.ruined))||pick(buildings)) : null;
  if(!cameraBusy){
    setWatching(text); tViewers+=rint(150,480);
    cutToPos(focus?focus.x:a.spr.x, focus?focus.y-20:a.spr.y-30);
    if(!focus) showLabel(a);
    scene.time.delayedCall(700,()=>applyConsequence(tpl,a,b,focus));
  } else {
    applyConsequence(tpl,a,b,focus);
  }
}

/* ===== día/noche ===== */
function timeTint(min){
  const h=(min/60)%24;
  if(h>=7&&h<18) return [0x0a1436,0];
  if(h>=5&&h<7)  return [0xe08a3c,0.16*(1-(h-5)/2)+0.04];
  if(h>=18&&h<20)return [0xe0662c,0.06+0.20*((h-18)/2)];
  return [0x0a1436, 0.52];
}

/* ===== loop ===== */
function update(time,delta){
  const m=speed;
  for(const n of npcs){
    if(n.dead) continue;
    if(paused){ n.spr.body&&n.spr.body.setVelocity(0); n.spr.anims&&n.spr.anims.pause(); continue; }
    if(n.spr.anims&&n.spr.anims.isPaused) n.spr.anims.resume();
    const spd=n.spd*m;
    const dx=n.tx-n.spr.x, dy=n.ty-n.spr.y, d=Math.hypot(dx,dy);
    if(Math.hypot(n.spr.x-n.lx,n.spr.y-n.ly)<0.25) n.stuck+=delta; else n.stuck=0;
    n.lx=n.spr.x; n.ly=n.spr.y;
    if(d<6&&n.path&&n.path.length){                        // siguiente waypoint de la ruta
      const p=n.path.shift(); n.tx=p.x+rint(-10,10); n.ty=p.y+rint(-10,10);
    } else if(d<6||n.stuck>700){
      n.stuck=0; n.spr.body.setVelocity(0); n.path=null;
      if(n.idle<=0){ n.idle=rint(400,1800);
        n.spr.play((n.faceUp&&n.animIB)?n.animIB:n.animI,true); n.spr.setFlipX(!!n.faceLeft); }
      else { n.idle-=delta*m; if(n.idle<=0) retarget(n); }
    } else {
      const inv=spd/d; n.spr.body.setVelocity(dx*inv,dy*inv);
      n.faceLeft=dx<0; n.faceUp=(Math.abs(dy)>Math.abs(dx))&&dy<0;
      if(n.animR){ n.spr.play((n.faceUp&&n.animRB)?n.animRB:n.animR,true); n.spr.setFlipX(n.faceLeft); }
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
$('btnSound').addEventListener('click',()=>{
  soundOn=!soundOn; $('btnSound').textContent=soundOn?'SONIDO ✓':'SONIDO';
  if(soundOn&&scene){ const c=scene.sound.context; if(c&&c.state==='suspended') c.resume(); sfx('bell',0.3); }
});
// director de eventos: elegí y lanzá cualquier evento a mano
TPL.forEach(t=>{ const o=document.createElement('option'); o.value=t.tag; o.textContent=(t.major?'★ ':'')+t.tag; $('evSel').appendChild(o); });
$('btnEvent').addEventListener('click',()=>{ const t=TPL_BY_TAG[$('evSel').value]; if(t&&scene) fireEvent(t); });
