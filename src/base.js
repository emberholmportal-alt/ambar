/* ÁMBAR · Mi Aldea v5 — PROTOTIPO (cliente puro, in-memory)
   Estilo Age of Empires: mapa continental con niebla de guerra, minimapa,
   recursos naturales (árboles / vetas / animales), aldeanos y milicia con vida,
   órdenes por clic derecho. Cada obra la levanta un aldeano de verdad.
   Sin persistencia: recargar reinicia la partida. */

const $=id=>document.getElementById(id);
const T=64, GW=30, GH=22, BX=4, BY=4;
const WT=GW+BX*2, HT=GH+BY*2, WORLD_W=WT*T, WORLD_H=HT*T;
const MAR=1200;                                   // agua extra alrededor del mundo (pantalla completa)
const FOGR=224;                                   // radio del pincel de niebla (px)
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== catálogo de edificios (sin mina/leñador: ahora son nodos naturales) ===== */
const CAP=2000;
const MAXLVL={castle:3, def:2};
const CAT={
  castle:    {nom:'Ayuntamiento', fw:5,fh:2, costo:{oro:300,madera:300}, dur:120, req:0, unico:true, skins:true,
              up:[{costo:{oro:500,madera:500},dur:180},{costo:{oro:1200,madera:1200},dur:300}]},
  house:     {nom:'Casa',         fw:2,fh:2, costo:{madera:100},        dur:180,  req:0, skins:true, up:[{costo:{madera:200},dur:120}]},
  granja:    {nom:'Granja',       fw:3,fh:2, costo:{madera:120},        dur:240,  req:0, prod:'comida', reserva:400, up:[{costo:{oro:250},dur:200}]},
  torre:     {nom:'Torre',        fw:2,fh:2, costo:{oro:200,madera:200},dur:420, req:1, skins:true, up:[{costo:{oro:500},dur:300}]},
  cuartel:   {nom:'Cuartel',      fw:3,fh:2, costo:{madera:300},        dur:600, req:1, skins:true, up:[{costo:{oro:600},dur:360}]},
  arqueria:  {nom:'Arquería',     fw:3,fh:2, costo:{oro:300},           dur:600, req:1, reqB:'cuartel', skins:true, up:[{costo:{madera:600},dur:360}]},
  monasterio:{nom:'Monasterio',   fw:3,fh:2, costo:{ambar:40},          dur:600, req:2, skins:true, premium:true, up:[{costo:{ambar:60},dur:360}]},
};
const RATE=0.6, BUFFER=b=>120*b.nivel;
const UNIDADES={
  aldeano: {nom:'Aldeano', costo:{comida:50},        de:['castle','house']},
  guerrero:{nom:'Guerrero',costo:{oro:60,comida:20}, de:['cuartel']},
  arquero: {nom:'Arquero', costo:{oro:80,comida:20}, de:['arqueria']},
};
const POPCAP=()=>3+2*S.buildings.filter(b=>b.tipo==='house'&&b.estado==='ok').length;
const popTotal=()=>S.ald.length+S.units.length;
const CARD_IMG={castle:'castle_blue',house:'house1_blue',granja:'sheep',
  torre:'tower_blue',cuartel:'barracks_blue',arqueria:'archery_blue',monasterio:'monastery_blue'};
const RES_IMG={oro:'res_gold',madera:'res_wood',comida:'res_meat'};

/* ===== nodos naturales y fauna ===== */
const NODO={
  arbol:{nom:'Árbol',    res:'madera', reserva:120, tool:'waxe',  fw:1,fh:1, verbo:'TALAR'},
  veta: {nom:'Veta de oro',res:'oro',  reserva:350, tool:'wpick', fw:2,fh:1, verbo:'MINAR'},
};
const FAUNA={
  oveja: {nom:'Oveja',   tex:'sheep',    anim:'sheep-a', hp:24, carne:80,  dmg:0, esc:1.0, oy:0.9,  huye:true},
  jabali:{nom:'Jabalí',  tex:'pig_idle', anim:'cerdo-i', hp:44, carne:150, dmg:4, esc:0.55,oy:0.72, huye:false},
};

/* ===== misiones ===== */
const QUESTS=[
  {txt:'Mandá un aldeano a TALAR un árbol (clic der.)',  check:()=>S.stats.talado>=30, rew:{madera:60,ambar:10}},
  {txt:'Cazá un animal para conseguir carne',            check:()=>S.stats.cazado>=1,  rew:{comida:120,ambar:10}},
  {txt:'Construí el AYUNTAMIENTO del pueblo',             check:()=>S.thNivel>=1,       rew:{ambar:25,madera:80}},
  {txt:'Miná 30 de oro de una veta',                     check:()=>S.stats.minado>=30, rew:{oro:60,ambar:10}},
  {txt:'Construí otra Casa y CREÁ un aldeano',            check:()=>S.stats.aldCreados>=1, rew:{oro:80}},
  {txt:'Tené una Granja produciendo comida',             check:()=>S.buildings.some(b=>b.tipo==='granja'&&b.estado==='ok'), rew:{oro:100}},
  {txt:'Mejorá el Ayuntamiento a Nivel 2',               check:()=>S.thNivel>=2,       rew:{ambar:35}},
  {txt:'Construí una Torre y entrená un Guerrero',        check:()=>S.buildings.some(b=>b.tipo==='torre'&&b.estado==='ok')&&S.stats.entrenados>=1, rew:{oro:100,ambar:10}},
  {txt:'Repelé un asalto goblin (¡final!)',              check:()=>S.stats.raids>=1,    rew:{ambar:100}},
];

/* ===== estado ===== */
const S={ oro:220, madera:260, comida:130, ambar:60,
  speed:1, aceleradas:0, ACEL_TOPE:3,
  grid:Array.from({length:GH},()=>Array(GW).fill(null)),
  land:Array.from({length:GH},()=>Array(GW).fill(false)),
  elev:Array.from({length:GH},()=>Array(GW).fill(0)),
  cliff:Array.from({length:GH},()=>Array(GW).fill(false)),
  explored:Array.from({length:GH},()=>Array(GW).fill(false)),
  buildings:[], nodes:[], animals:[], piles:[], ald:[], units:[], nextId:1,
  thNivel:0, aldElegido:null, colocando:null, sel:null,
  qIx:0, stats:{talado:0,minado:0,cazado:0,cosechas:0,raids:0,skins:0,aldCreados:0,entrenados:0},
  raid:{on:false,gob:[],war:[],t:0,cool:180} };
let scene, ghostG, ghostSpr=null, fogRT=null, homePos={x:0,y:0}, overview=false;
let baseZoom=1, mmCtx=null;
function sfx(k,v){ try{ scene&&scene.sound.play('s_'+k,{volume:v||0.5}); }catch(e){} }

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#245063',
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  scene:{preload,create,update}});

function preload(){
  const TSB='assets/img/ts/';
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('elev',TSB+'elevation.png',{frameWidth:64,frameHeight:64});
  this.load.image('water',TSB+'water.png');
  this.load.spritesheet('foam',TSB+'foam.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('tree',TSB+'tree_anim.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fence',TSB+'fence.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust1',TSB+'dust1.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust2',TSB+'dust2.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fire',TSB+'fire.png',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('dead',TSB+'dead.png',{frameWidth:128,frameHeight:256});
  for(const c of ['blue','red']){
    this.load.image('castle_'+c,TSB+'castle_'+c+'.png');
    for(const b of ['house1','house2','house3','tower','barracks','archery','monastery'])
      this.load.image(b+'_'+c,TSB+b+'_'+c+'.png');
    this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  }
  this.load.spritesheet('warrior_blue','assets/img/warrior_blue.png',{frameWidth:110,frameHeight:98});
  this.load.spritesheet('archer_blue_i','assets/img/ts/archer_blue_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('archer_blue_r','assets/img/ts/archer_blue_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pig_idle',TSB+'pig_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pig_run',TSB+'pig_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('goblin_torch',TSB+'goblin_torch.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spear_idle',TSB+'spear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('spear_run',TSB+'spear_run.png',{frameWidth:256,frameHeight:256});
  this.load.image('goldmine',TSB+'goldmine.png');
  this.load.image('goldmine_inactive',TSB+'goldmine_inactive.png');
  this.load.image('goldmine_destroyed',TSB+'goldmine_destroyed.png');
  ['res_gold','res_meat','res_wood'].forEach(k=>this.load.image(k,TSB+k+'.png'));
  for(const j of ['waxe','wpick']) for(const s of ['i','r'])
    this.load.spritesheet(j+'_blue_'+s,TSB+j+'_blue_'+s+'.png',{frameWidth:192,frameHeight:192});
  for(let i=1;i<=4;i++){ this.load.image('cloud'+i,TSB+'cloud'+i+'.png');
    this.load.spritesheet('wrock'+i,TSB+'wrock'+i+'.png',{frameWidth:128,frameHeight:128});
    this.load.image('rock'+i,TSB+'rock'+i+'.png');
    this.load.spritesheet('bush'+i,TSB+'bush'+i+'.png',{frameWidth:128,frameHeight:128}); }
  for(let i=1;i<=15;i++) this.load.image('deco'+i,TSB+'deco'+String(i).padStart(2,'0')+'.png');
  this.load.spritesheet('sboat',TSB+'sboat.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shark',TSB+'shark.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('duck',TSB+'duck.png',{frameWidth:32,frameHeight:32});
  ['door','bong','coins','creak','bell','clash','fire','latch'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}
function makeFogBrush(s){
  const d=FOGR*2, tex=s.textures.createCanvas('fogbrush',d,d), ctx=tex.getContext();
  const g=ctx.createRadialGradient(FOGR,FOGR,FOGR*0.35,FOGR,FOGR,FOGR);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.72,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,d,d); tex.refresh();
}

/* ===== mapa continental (tierra grande + costa irregular + mar/lagos + mesetas) ===== */
const isIn=(x,y)=>x>=0&&x<GW&&y>=0&&y<GH;
const isLand=(x,y)=>isIn(x,y)&&S.land[y][x];
const walkable=(x,y)=>isLand(x,y)&&!S.cliff[y][x];
function buildMap(){
  const cx=GW/2-0.5, cy=GH/2-0.5, p1=Math.random()*6.28, p2=Math.random()*6.28, p3=Math.random()*6.28;
  // continente: casi todo tierra, con costa irregular que toca los bordes en partes
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const dx=(x-cx)/(GW*0.52), dy=(y-cy)/(GH*0.52);
    const ang=Math.atan2(dy,dx), r=Math.hypot(dx,dy);
    const wob=0.16*Math.sin(ang*3+p1)+0.11*Math.sin(ang*5+p2)+0.07*Math.sin(ang*8+p3);
    S.land[y][x]= r < 1.16+wob;
  }
  // ensenada de mar entrando desde un lado
  const lado=rint(0,3);
  const iw=rint(3,5);
  for(let d=0;d<Math.floor(GW*0.55);d++){
    const half=Math.max(1,Math.round(iw*(1-d/(GW*0.6))));
    for(let o=-half;o<=half;o++){
      let x,y;
      if(lado===0){ x=d; y=Math.floor(GH*0.5)+o; }
      else if(lado===1){ x=GW-1-d; y=Math.floor(GH*0.35)+o; }
      else if(lado===2){ x=Math.floor(GW*0.5)+o; y=d; }
      else { x=Math.floor(GW*0.7)+o; y=GH-1-d; }
      if(isIn(x,y)) S.land[y][x]=false;
    }
  }
  // 2 lagunas internas (lejos del sur donde arranca el pueblo)
  for(let k=0;k<2;k++){
    const lx=rint(4,GW-5), ly=rint(2,Math.floor(GH*0.55)), lr=rint(2,3);
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
      const dd=Math.hypot(x-lx,y-ly)+0.7*Math.sin((x+y)*0.9);
      if(dd<lr) S.land[y][x]=false;
    }
  }
  // suavizado (autómata celular)
  for(let it=0;it<2;it++)for(let y=1;y<GH-1;y++)for(let x=1;x<GW-1;x++){
    let v=0; for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++) if(!(ox===0&&oy===0)&&S.land[y+oy][x+ox]) v++;
    if(!S.land[y][x]&&v>=6) S.land[y][x]=true; else if(S.land[y][x]&&v<=2) S.land[y][x]=false;
  }
  // garantizar zona de arranque sólida (centro-sur)
  const sx0=Math.floor(GW/2)-3, sy0=GH-6;
  for(let y=sy0;y<GH-1;y++)for(let x=sx0;x<sx0+6;x++) if(isIn(x,y)) S.land[y][x]=true;
  // 2 mesetas con desnivel (pared de acantilado al sur)
  for(let m=0;m<2;m++){
    let mx=0,my=0,tr=0;
    do{ mx=rint(4,GW-5); my=rint(2,Math.floor(GH/2)); tr++; }while(tr<50&&!isLand(mx,my));
    const mr=Phaser.Math.FloatBetween(2.2,3.2);
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
      if(S.land[y][x]&&Math.hypot(x-mx,y-my)<mr&&y<GH-3) S.elev[y][x]=1;
  }
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(S.elev[y][x]&&!isLand(x,y+1)) S.elev[y][x]=0;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(S.elev[y][x]&&isIn(x,y+1)&&!S.elev[y+1][x]) S.cliff[y+1][x]=true;
}
function gIdx(x,y){
  const n=isLand(x,y-1), s=isLand(x,y+1), w=isLand(x-1,y), e=isLand(x+1,y);
  if(n&&s&&w&&e) return 11;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 20; if(!s&&!e) return 22;
  if(!n) return 1; if(!s) return 21; if(!w) return 10; if(!e) return 12; return 11;
}
function eIdx(x,y){
  const inE=(a,b)=>isIn(a,b)&&S.elev[b][a]===1;
  const n=inE(x,y-1), s=inE(x,y+1), w=inE(x-1,y), e=inE(x+1,y);
  if(n&&s&&w&&e) return 5;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 8; if(!s&&!e) return 10;
  if(!n) return 1; if(!s) return 9; if(!w) return 4; if(!e) return 6; return 5;
}

function create(){
  scene=this; makeDot(this); makeFogBrush(this);
  buildMap();
  const an=this.anims;
  an.create({key:'foam-a',frames:an.generateFrameNumbers('foam',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'tree-a',frames:an.generateFrameNumbers('tree',{start:0,end:3}),frameRate:4,repeat:-1});
  an.create({key:'sheep-a',frames:an.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});
  an.create({key:'dust1-a',frames:an.generateFrameNumbers('dust1',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'dust2-a',frames:an.generateFrameNumbers('dust2',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'fire-a',frames:an.generateFrameNumbers('fire',{start:0,end:6}),frameRate:10,repeat:-1});
  an.create({key:'dead-a',frames:an.generateFrameNumbers('dead',{start:0,end:6}),frameRate:9,repeat:0});
  for(const c of ['blue','red']){
    an.create({key:'pawn_'+c+'-i',frames:an.generateFrameNumbers('pawn_'+c,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:'pawn_'+c+'-r',frames:an.generateFrameNumbers('pawn_'+c,{start:6,end:11}),frameRate:10,repeat:-1});
  }
  an.create({key:'war-i',frames:an.generateFrameNumbers('warrior_blue',{start:0,end:5}),frameRate:6,repeat:-1});
  an.create({key:'war-r',frames:an.generateFrameNumbers('warrior_blue',{start:12,end:17}),frameRate:11,repeat:-1});
  an.create({key:'arq-i',frames:an.generateFrameNumbers('archer_blue_i',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'arq-r',frames:an.generateFrameNumbers('archer_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'cerdo-i',frames:an.generateFrameNumbers('pig_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'cerdo-r',frames:an.generateFrameNumbers('pig_run',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'gt-r',frames:an.generateFrameNumbers('goblin_torch',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'gt-i',frames:an.generateFrameNumbers('goblin_torch',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'sp-r',frames:an.generateFrameNumbers('spear_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'sp-i',frames:an.generateFrameNumbers('spear_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  for(const j of ['waxe','wpick']) an.create({key:j+'-r',frames:an.generateFrameNumbers(j+'_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  for(let i=1;i<=4;i++){ an.create({key:'wrock'+i+'-a',frames:an.generateFrameNumbers('wrock'+i,{start:0,end:7}),frameRate:5,repeat:-1});
    an.create({key:'bush'+i+'-a',frames:an.generateFrameNumbers('bush'+i,{start:0,end:7}),frameRate:6,repeat:-1}); }
  an.create({key:'sboat-a',frames:an.generateFrameNumbers('sboat',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'shark-a',frames:an.generateFrameNumbers('shark',{start:0,end:-1}),frameRate:8,repeat:-1});
  an.create({key:'duck-a',frames:an.generateFrameNumbers('duck',{start:0,end:2}),frameRate:4,repeat:-1});

  // AGUA A PANTALLA COMPLETA
  this.add.tileSprite(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2,'water').setOrigin(0,0).setDepth(-30);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(!S.land[y][x]) continue;
    let coast=false;
    for(let oy=-1;oy<=1&&!coast;oy++)for(let ox=-1;ox<=1;ox++) if(!isLand(x+ox,y+oy)){coast=true;break;}
    if(coast) this.add.sprite((BX+x)*T+T/2,(BY+y)*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.land[y][x]) rt.drawFrame('ground',gIdx(x,y),(BX+x)*T,(BY+y)*T);
  // arena en las costas
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(!S.land[y][x]||S.elev[y][x]) continue;
    if(!isLand(x-1,y)||!isLand(x+1,y)||!isLand(x,y-1)||!isLand(x,y+1)) rt.drawFrame('ground',16,(BX+x)*T,(BY+y)*T);
  }
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]) rt.drawFrame('elev',eIdx(x,y),(BX+x)*T,(BY+y)*T);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.cliff[y][x]){
    const l=isIn(x-1,y)&&S.cliff[y][x-1], r=isIn(x+1,y)&&S.cliff[y][x+1];
    rt.drawFrame('elev', l&&r?13 : r?12 : l?14 : 15, (BX+x)*T,(BY+y)*T);
  }

  // mar vivo
  for(let i=0;i<10;i++){
    const x=rint(1,WT-2), y=rint(1,HT-2);
    if(x>=BX&&x<BX+GW&&y>=BY&&y<BY+GH&&isLand(x-BX,y-BY)) continue;
    if(x>=BX&&x<BX+GW&&y>=BY&&y<BY+GH) continue;
    const k='wrock'+rint(1,4);
    this.add.sprite(x*T+T/2,y*T+T/2,k).play({key:k+'-a',startFrame:rint(0,7)}).setDepth(-24).setScale(0.85);
  }
  const shark=this.add.sprite(-MAR/2,2*T,'shark').play('shark-a').setDepth(-23).setScale(0.75);
  this.tweens.add({targets:shark,x:WORLD_W+MAR/2,duration:40000,repeat:-1,repeatDelay:16000,
    onRepeat:()=>{shark.y=pick([rint(1,BY-1),rint(HT-BY+1,HT-1)])*T;}});
  const duck=this.add.sprite(WORLD_W+60,(HT-2)*T,'duck').play('duck-a').setDepth(-23).setScale(1.5);
  this.tweens.add({targets:duck,x:'-=140',y:'-=60',duration:12000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  for(let i=1;i<=4;i++){
    const c=this.add.image(rint(-MAR,WORLD_W+MAR),rint(-200,WORLD_H+200),'cloud'+i).setAlpha(0.30).setDepth(89000).setScale(Phaser.Math.FloatBetween(0.9,1.5));
    this.tweens.add({targets:c,x:'+='+(WORLD_W+MAR),duration:rint(90000,150000),repeat:-1,
      onRepeat:()=>{c.x=-MAR;c.y=rint(-200,WORLD_H+200);}});
  }

  ghostG=this.add.graphics().setDepth(95000);

  // ---- NIEBLA DE GUERRA ----
  fogRT=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(80000);
  fogRT.fill(0x05090c,0.93);

  // ---- recursos naturales dispersos ----
  scatterNodos('arbol',22);
  scatterNodos('veta',4);
  scatterFauna('oveja',6);
  scatterFauna('jabali',4);
  scatterEyeCandy(16);

  // ---- ARRANQUE: una casita al sur + 3 aldeanos ----
  let hx=Math.floor(GW/2)-1, hy=GH-5, tr=0;
  while(tr++<80&&!puedeHuella(hx,hy,2,2)){ hx=rint(3,GW-4); hy=rint(GH-7,GH-3); }
  const home=addBuilding('house',hx,hy,{listo:true});
  homePos={x:(BX+hx+1)*T, y:(BY+hy)*T};
  revelar(homePos.x,homePos.y,6);
  for(let i=0;i<3;i++){ const a=spawnAldeano(home.x+rint(-46,46),home.y+rint(8,26),true); if(a) revelar(a.spr.x,a.spr.y,5); }

  this.input.on('pointermove',p=>{ if(S.colocando) drawGhost(p); });
  this.input.on('pointerdown',(p,over)=>{
    if(S.colocando){ if(p.rightButtonDown()){ cancelPlace(); return; } const t=tileAt(p); if(t) tryPlace(t.x,t.y); return; }
    if(p.rightButtonDown()){ ordenar(p); return; }
    if(!over||over.length===0) deseleccionar();
  });
  this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  this.input.keyboard&&this.input.keyboard.on('keydown-ESC',()=>{ if(S.colocando)cancelPlace(); else deseleccionar(); });

  // ---- cámara: zoom por defecto + rueda + arrastre + doble clic (vista general) ----
  this.input.on('wheel',(p,objs,dx,dy)=>{
    overview=false; const cam=this.cameras.main;
    const z=Phaser.Math.Clamp(cam.zoom*(dy>0?0.88:1.14), baseZoom*0.9, 3.6);
    cam.setZoom(z);
    const wp=cam.getWorldPoint(p.x,p.y);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x,wp.x,0.3), Phaser.Math.Linear(cam.midPoint.y,wp.y,0.3));
  });
  let dragMoved=false;
  this.input.on('pointermove',p=>{
    if(!p.isDown||S.colocando||p.rightButtonDown()) return;
    if(Math.abs(p.x-p.downX)+Math.abs(p.y-p.downY)>8) dragMoved=true;
    if(dragMoved){ const cam=this.cameras.main;
      cam.scrollX-=(p.x-p.prevPosition.x)/cam.zoom; cam.scrollY-=(p.y-p.prevPosition.y)/cam.zoom; }
  });
  this.input.on('pointerup',()=>{ setTimeout(()=>{dragMoved=false;},0); });
  this.game.canvas.addEventListener('dblclick',()=>{ overview=!overview; applyCam(); });

  this.cameras.main.setBounds(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2);
  applyCam(); this.scale.on('resize',applyCam);

  initMinimap();
  refreshHUD(); refreshQuest(); buildGrid(); renderSel();
  scheduleBoat();
  toast('Tu aldea arranca con una casita y 3 aldeanos. Clic izquierdo: seleccionar · clic derecho: ordenar.');
  window.__raid=()=>startRaid();
}

/* ===== cámara ===== */
function applyCam(){ if(!scene) return;
  const cam=scene.cameras.main, vw=scene.scale.width, vh=scene.scale.height;
  const iw=(GW+2)*T, ih=(GH+2)*T;
  baseZoom=Math.min(vw/iw,vh/ih);
  if(overview){ cam.setZoom(baseZoom); cam.centerOn(WORLD_W/2,WORLD_H/2); }
  else { cam.setZoom(Phaser.Math.Clamp(baseZoom*2.1,1,3.6)); cam.centerOn(homePos.x,homePos.y); }
}
function tileAt(p){
  const wp=scene.cameras.main.getWorldPoint(p.x,p.y);
  const tx=Math.floor(wp.x/T)-BX, ty=Math.floor(wp.y/T)-BY;
  return isIn(tx,ty)?{x:tx,y:ty}:null;
}
function flyText(x,y,txt,color){
  const t=scene.add.text(x,y,txt,{fontFamily:'ui-monospace,monospace',fontSize:'15px',fontStyle:'bold',
    color:color||'#ffe9a0',stroke:'#120d09',strokeThickness:4}).setOrigin(0.5,1).setDepth(99990);
  scene.tweens.add({targets:t,y:y-46,alpha:0,duration:1100,ease:'Quad.easeOut',onComplete:()=>t.destroy()});
}
function dustAt(x,y,n){ for(let i=0;i<(n||3);i++){ const k=pick(['dust1','dust2']);
  const d=scene.add.sprite(x+rint(-24,24),y-rint(0,24),k).setDepth(99999).setScale(1.1);
  d.play({key:k+'-a',delay:i*80}); d.once('animationcomplete',()=>d.destroy()); } }
function marcaOrden(x,y){
  const r=scene.add.circle(x,y,6,0xffe9a0,0).setStrokeStyle(2,0xffe9a0,0.95).setDepth(99995);
  scene.tweens.add({targets:r,radius:22,alpha:0,duration:520,ease:'Quad.easeOut',onComplete:()=>r.destroy()});
}
function burstAt(x,y,color){
  for(let i=0;i<10;i++){ const p=scene.add.image(x,y,'dot').setTint(color).setDepth(99999).setScale(Phaser.Math.FloatBetween(0.5,1.2));
    scene.tweens.add({targets:p,x:x+rint(-26,26),y:y-rint(4,30),alpha:0,scale:0.1,duration:rint(400,900),ease:'Quad.easeOut',onComplete:()=>p.destroy()}); }
}

/* ===== niebla ===== */
function revelar(px,py,rTiles){
  if(!fogRT) return;
  fogRT.erase('fogbrush', px-FOGR, py-FOGR);
  const t=tileOfPx(px,py);
  const R=rTiles||3;
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    const x=t.x+dx, y=t.y+dy;
    if(isIn(x,y)&&Math.hypot(dx,dy)<=R) S.explored[y][x]=true;
  }
}

/* ===== pathfinding (BFS) ===== */
function findPath(x0,y0,x1,y1){
  if(!walkable(x1,y1)) return null;
  if(x0===x1&&y0===y1) return [];
  const key=(x,y)=>y*GW+x, prev=new Map([[key(x0,y0),null]]), q=[[x0,y0]];
  while(q.length){
    const [cx,cy]=q.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      if(!isIn(nx,ny)||prev.has(key(nx,ny))||!walkable(nx,ny)) continue;
      prev.set(key(nx,ny),key(cx,cy));
      if(nx===x1&&ny===y1){
        const path=[]; let cur=key(nx,ny);
        while(cur!==null){ path.push({x:(BX+(cur%GW))*T+T/2, y:(BY+Math.floor(cur/GW))*T+T/2}); cur=prev.get(cur); }
        path.reverse(); path.shift(); return path;
      }
      q.push([nx,ny]);
    }
  }
  return null;
}
const tileOfPx=(px,py)=>({x:Phaser.Math.Clamp(Math.floor(px/T)-BX,0,GW-1), y:Phaser.Math.Clamp(Math.floor(py/T)-BY,0,GH-1)});
function adjWalkable(tx,ty){
  for(let r=1;r<=3;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){
    const x=tx+ox, y=ty+oy;
    if(walkable(x,y)&&S.grid[y][x]===null) return {x,y};
  }
  return null;
}

/* ===== ALDEANOS ===== */
function spawnAldeano(x,y,inicial){
  if(!inicial&&popTotal()>=POPCAP()){ toast('🏠 Cupo lleno ('+POPCAP()+'). Construí Casas o despedí unidades.'); sfx('creak',0.4); return null; }
  const s=scene.add.sprite(x,y,'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play('pawn_blue-i');
  const a={id:'a'+S.nextId++, spr:s, estado:'libre', hp:25, maxhp:25, path:null, onArrive:null,
    tx:x, ty:y, wT:rint(2,6), task:null, tarT:0, tool:null, lastTile:'', atkT:0};
  s.setInteractive({useHandCursor:true});
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'aldeano',ref:a}); });
  S.ald.push(a); refreshHUD(); return a;
}
const aldLibre=()=>S.ald.find(a=>a.estado==='libre'||a.estado==='paseo');
function aldLibreCerca(px,py){
  let best=null,bd=1e9;
  for(const a of S.ald){ if(a.estado!=='libre'&&a.estado!=='paseo') continue;
    const d=Phaser.Math.Distance.Between(px,py,a.spr.x,a.spr.y); if(d<bd){bd=d;best=a;} }
  return best;
}
function setTool(a,tool){ a.tool=tool;
  if(tool){ a.spr.setTexture(tool+'_blue_r',0).setScale(0.7); a.spr.play(tool+'-r',true); }
  else { a.spr.setTexture('pawn_blue',0).setScale(0.7); }
}
function moverA(a,tx,ty,cb){
  const cur=tileOfPx(a.spr.x,a.spr.y);
  let dx=tx,dy=ty, path=findPath(cur.x,cur.y,tx,ty);
  if(!path){ const adj=adjWalkable(tx,ty); if(adj){ dx=adj.x; dy=adj.y; path=findPath(cur.x,cur.y,dx,dy); } }
  setTool(a,null);
  if(a.tween){a.tween.remove();a.tween=null;}
  a.estado='yendo'; a.onArrive=cb||null;
  a.path=(path&&path.length)?path:[{x:(BX+dx)*T+T/2,y:(BY+dy)*T+T/2}];
  const p0=a.path.shift(); a.tx=p0.x; a.ty=p0.y;
  a.spr.play('pawn_blue-r',true);
}
function parar(a){
  if(a.dustEv){a.dustEv.remove();a.dustEv=null;}
  if(a.tween){a.tween.remove();a.tween=null;}
  a.estado='libre'; a.task=null; a.path=null; a.onArrive=null; a.objAnimal=null; a.objPile=null; a.bId=null;
  setTool(a,null); a.spr.play('pawn_blue-i',true);
  refreshHUD(); if(S.sel&&S.sel.ref===a) renderSel();
}
function despedir(a){
  if(a.dustEv)a.dustEv.remove(); if(a.tween)a.tween.remove();
  S.ald=S.ald.filter(x=>x!==a);
  scene.tweens.add({targets:a.spr,alpha:0,y:'-=14',duration:600,onComplete:()=>a.spr.destroy()});
  sfx('door',0.4); toast('Aldeano despedido: cupo liberado.');
  if(S.sel&&S.sel.ref===a) deseleccionar(); refreshHUD();
}
function dañarAldeano(a,dmg){
  a.hp-=dmg; flyText(a.spr.x,a.spr.y-30,'-'+dmg,'#ff9a8a');
  a.spr.setTint(0xff6a5a); scene.time.delayedCall(120,()=>a.spr&&a.spr.clearTint&&a.spr.clearTint());
  if(a.hp<=0){
    if(a.dustEv)a.dustEv.remove(); if(a.tween)a.tween.remove();
    S.ald=S.ald.filter(x=>x!==a);
    const d=scene.add.sprite(a.spr.x,a.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(a.spr.y);
    d.once('animationcomplete',()=>scene.tweens.add({targets:d,alpha:0,duration:1500,onComplete:()=>d.destroy()}));
    a.spr.destroy(); sfx('creak',0.5); toast('☠️ Un aldeano cayó. Cuidalos de los jabalíes y goblins.');
    if(S.sel&&S.sel.ref===a) deseleccionar(); refreshHUD();
  }
}

/* ===== tareas de aldeano ===== */
function mandarNodo(a,nd){
  moverA(a,nd.tx,nd.ty,()=>{
    a.estado=nd.kind==='arbol'?'talando':'minando'; a.task=nd.id; a.tarT=0;
    setTool(a,nd.tool);
    if(nd.kind==='veta'&&nd.spr.texture.key==='goldmine_inactive') nd.spr.setTexture('goldmine');
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function mandarConstruir(a,b){
  moverA(a,b.tx,b.ty,()=>{
    a.estado='obrero'; a.bId=b.id;
    if(b.estado==='esperando') b.estado='obra';
    a.dustEv=scene.time.addEvent({delay:900,loop:true,callback:()=>dustAt(b.x,b.y-10,1)});
    a.spr.play('pawn_blue-i',true);
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function mandarTrabajar(a,b){
  moverA(a,b.tx,b.ty,()=>{
    a.estado='peon'; a.bId=b.id;
    a.spr.play('pawn_blue-r',true);
    const x0=b.x-CAT[b.tipo].fw*T*0.35, x1=b.x+CAT[b.tipo].fw*T*0.35;
    a.spr.x=x0; a.spr.y=b.y+10; a.spr.setDepth(a.spr.y);
    a.tween=scene.tweens.add({targets:a.spr,x:x1,duration:2600,yoyo:true,repeat:-1,
      onYoyo:()=>a.spr.setFlipX(true), onRepeat:()=>a.spr.setFlipX(false)});
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function mandarCazar(a,m){
  a.objAnimal=m;
  moverA(a,tileOfPx(m.spr.x,m.spr.y).x,tileOfPx(m.spr.x,m.spr.y).y,null);
  a.estado='cazando'; a.atkT=0;
}
function mandarRecolectar(a,pile){
  a.objPile=pile;
  moverA(a,tileOfPx(pile.x,pile.y).x,tileOfPx(pile.x,pile.y).y,()=>{
    a.estado='recolectando'; a.tarT=0; a.spr.play('pawn_blue-i',true);
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function pedirTrabajador(b){
  const a=aldLibreCerca(b.x,b.y);
  if(a){ mandarTrabajar(a,b); return true; }
  toast('⚠️ '+CAT[b.tipo].nom+' sin aldeano: creá más en las Casas.');
  return false;
}

/* ===== nodos naturales ===== */
function puedeHuella(tx,ty,fw,fh){
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
    if(!isIn(tx+x,ty+y)||!isLand(tx+x,ty+y)||S.cliff[ty+y][tx+x]) return false;
    if(S.grid[ty+y][tx+x]!==null) return false;
    if(S.elev[ty+y][tx+x]!==S.elev[ty][tx]) return false;
  }
  return true;
}
function scatterNodos(kind,n){
  const cfg=NODO[kind]; let puestos=0,tries=0;
  while(puestos<n&&tries++<400){
    const tx=rint(0,GW-cfg.fw), ty=rint(0,GH-cfg.fh);
    if(!puedeHuella(tx,ty,cfg.fw,cfg.fh)) continue;
    const id='n'+S.nextId++;
    const x=(BX+tx)*T + cfg.fw*T/2, y=(BY+ty+cfg.fh)*T;
    let spr;
    if(kind==='arbol') spr=scene.add.sprite(x,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.58);
    else spr=scene.add.image(x,y,'goldmine_inactive').setOrigin(0.5,0.9).setScale(0.9);
    spr.setDepth(y).setInteractive({useHandCursor:true});
    const nd={id,kind,tipo:kind,tx,ty,spr,reserva:cfg.reserva,tool:cfg.tool,res:cfg.res};
    spr.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'nodo',ref:nd}); });
    for(let oy=0;oy<cfg.fh;oy++)for(let ox=0;ox<cfg.fw;ox++) S.grid[ty+oy][tx+ox]=id;
    S.nodes.push(nd); puestos++;
  }
}
function agotarNodo(nd){
  const cfg=NODO[nd.kind];
  const w=S.ald.find(a=>a.task===nd.id); if(w) parar(w);
  if(nd.kind==='arbol'){ nd.spr.anims&&nd.spr.anims.stop(); nd.spr.setTexture('tree',9); }
  else nd.spr.setTexture('goldmine_destroyed');
  for(let oy=0;oy<cfg.fh;oy++)for(let ox=0;ox<cfg.fw;ox++) S.grid[nd.ty+oy][nd.tx+ox]=null;
  S.nodes=S.nodes.filter(x=>x!==nd); nd.agotado=true;
  scene.tweens.add({targets:nd.spr,alpha:0.5,duration:800});
  sfx('creak',0.4);
  if(S.sel&&S.sel.ref===nd) deseleccionar();
}

/* ===== fauna ===== */
function scatterFauna(tipo,n){
  const cfg=FAUNA[tipo];
  for(let i=0;i<n;i++){
    let tx=0,ty=0,tr=0,ok=false;
    do{ tx=rint(1,GW-2); ty=rint(1,GH-2); tr++; ok=walkable(tx,ty)&&S.grid[ty][tx]===null; }while(!ok&&tr<60);
    if(!ok) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T;
    const s=scene.add.sprite(x,y,cfg.tex).setOrigin(0.5,cfg.oy).setScale(cfg.esc).setDepth(y);
    s.play(cfg.anim);
    const m={id:'m'+S.nextId++, tipo, spr:s, hp:cfg.hp, maxhp:cfg.hp, carne:cfg.carne, dmg:cfg.dmg,
      dead:false, homeT:{x:tx,y:ty}, wT:rint(2,7), atkT:0, hunter:null};
    s.setInteractive({useHandCursor:true});
    s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'animal',ref:m}); });
    S.animals.push(m);
  }
}
function matarAnimal(m){
  if(m.dead) return; m.dead=true;
  burstAt(m.spr.x,m.spr.y-14,0xd98a6a); dustAt(m.spr.x,m.spr.y,2);
  S.stats.cazado++;
  const px=m.spr.x, py=m.spr.y;
  m.spr.destroy(); S.animals=S.animals.filter(x=>x!==m);
  const psp=scene.add.image(px,py,'res_meat').setScale(0.55).setDepth(py).setInteractive({useHandCursor:true});
  scene.tweens.add({targets:psp,y:py-6,duration:600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  const pile={id:'p'+S.nextId++, x:px, y:py, carne:m.carne, spr:psp};
  psp.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'pila',ref:pile}); });
  S.piles.push(pile);
  const h=m.hunter&&S.ald.includes(m.hunter)?m.hunter:aldLibreCerca(px,py);
  if(h) mandarRecolectar(h,pile);
  if(S.sel&&S.sel.ref===m) deseleccionar();
  sfx('bong',0.4);
}
function recogerPila(pile){
  S.comida=Math.min(CAP,S.comida+pile.carne);
  flyText(pile.x,pile.y-10,'+'+pile.carne+' 🍖','#ffd9b0');
  pile.spr.destroy(); S.piles=S.piles.filter(x=>x!==pile);
  sfx('coins',0.5); refreshHUD();
  if(S.sel&&S.sel.ref===pile) deseleccionar();
}

/* ===== eye-candy (decos no bloqueantes) ===== */
function scatterEyeCandy(n){
  let puestos=0, tries=0;
  while(puestos<n&&tries++<200){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(!isLand(tx,ty)||S.cliff[ty][tx]||S.grid[ty][tx]!==null) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T-6;
    scene.add.image(x+rint(-14,14),y,'deco'+rint(4,15)).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.6,0.9)).setDepth(y).setAlpha(0.95);
    puestos++;
  }
}

/* ===== edificios ===== */
function setGrid(b,val){ const c=CAT[b.tipo];
  for(let y=0;y<c.fh;y++)for(let x=0;x<c.fw;x++) S.grid[b.ty+y][b.tx+x]=val; }
function texOf(b){
  if(b.tipo==='castle') return 'castle_'+b.skin;
  if(b.tipo==='house')  return 'house'+b.var+'_'+b.skin;
  if(CAT[b.tipo].skins) return {torre:'tower',cuartel:'barracks',arqueria:'archery',monasterio:'monastery'}[b.tipo]+'_'+b.skin;
  return null;
}
function makeSprites(b){
  const c=CAT[b.tipo];
  const x=(BX+b.tx)*T + c.fw*T/2, y=(BY+b.ty+c.fh)*T;
  const sprs=[];
  if(b.tipo==='granja'){
    for(let fx=0;fx<3;fx++){
      sprs.push(scene.add.image((BX+b.tx+fx)*T+T/2,y-4,'fence',fx===0?8:fx===2?11:9).setOrigin(0.5,1).setDepth(y-4));
      sprs.push(scene.add.image((BX+b.tx+fx)*T+T/2,y-4-T,'fence',fx===0?0:fx===2?3:1).setOrigin(0.5,1).setDepth(y-4-T));
    }
    sprs.push(scene.add.sprite(x-14,y-T*0.7,'sheep').play('sheep-a').setOrigin(0.5,0.9).setDepth(y-T*0.7));
    sprs.push(scene.add.sprite(x+20,y-T*0.55,'pig_idle').play('cerdo-i').setOrigin(0.5,0.72).setScale(0.42).setDepth(y-T*0.55));
  } else {
    sprs.push(scene.add.image(x,y,texOf(b)).setOrigin(0.5,1).setDepth(y));
  }
  sprs[0].setInteractive({useHandCursor:true});
  sprs[0].on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) clickBuilding(b); });
  return {sprs,x,y};
}
function clickBuilding(b){
  if(b.estado==='ok'&&CAT[b.tipo].prod&&b.buf>=10){ cosechar(b); return; }
  seleccionar({t:'edificio',ref:b});
}
function cosechar(b){
  const res=CAT[b.tipo].prod, n=Math.floor(b.buf);
  if(n<1) return;
  S[res]=Math.min(CAP,S[res]+n); b.buf-=n; S.stats.cosechas++;
  flyText(b.x,b.y-CAT[b.tipo].fh*T,'+'+n+' '+res);
  if(b.pileSpr){b.pileSpr.destroy();b.pileSpr=null;}
  sfx('coins',0.55); refreshHUD(); if(S.sel&&S.sel.ref===b) renderSel();
}
function limpiarRestos(b){
  if(S.madera<40){ sfx('creak',0.4); toast('Limpiar los restos cuesta 40 madera.'); return; }
  S.madera-=40;
  setGrid(b,null); destroySprites(b);
  S.buildings=S.buildings.filter(x=>x!==b);
  dustAt(b.x,b.y-10,4); sfx('door',0.5); deseleccionar(); refreshHUD(); buildGrid();
}
function addBuilding(tipo,tx,ty,opt){
  opt=opt||{};
  const c=CAT[tipo];
  const b={id:S.nextId++, tipo, nivel:1, tx, ty, skin:'blue', var:tipo==='house'?rint(1,3):0,
    estado:opt.listo?'ok':'esperando', obraT:0, obraDur:c.dur, mejorando:false, hp:100, danado:false,
    buf:0, reserva:c.reserva||0, pileSpr:null, badge:null, barG:null, fireSpr:null};
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  setGrid(b,b.id);
  S.buildings.push(b);
  revelar(b.x,b.y-c.fh*T*0.5,4);
  if(b.estado==='esperando'){
    b.sprs.forEach(s=>s.setAlpha(0.4));
    b.barG=scene.add.graphics().setDepth(96000);
    const a=(S.aldElegido&&S.ald.includes(S.aldElegido)&&(S.aldElegido.estado==='libre'||S.aldElegido.estado==='paseo'))?S.aldElegido:aldLibreCerca(b.x,b.y);
    S.aldElegido=null;
    if(a) mandarConstruir(a,b);
    else toast('⚠️ Sin aldeanos libres: la obra espera. Creá aldeanos en las Casas.');
  }
  if(opt.listo&&c.prod) pedirTrabajador(b);
  return b;
}
function destroySprites(b){
  b.sprs.forEach(s=>s.destroy());
  ['badge','barG','pileSpr','fireSpr'].forEach(k=>{ if(b[k]){ b[k].destroy(); b[k]=null; } });
}
function refreshBuilding(b){
  destroySprites(b);
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  if(b.estado!=='ok'){ b.sprs.forEach(s=>s.setAlpha(b.estado==='esperando'?0.4:0.55)); b.barG=scene.add.graphics().setDepth(96000); }
  else {
    if(b.nivel>1) putBadge(b);
    if(b.danado){ b.sprs.forEach(s=>s.setTint(0x8a6a58));
      b.fireSpr=scene.add.sprite(b.x,b.y-6,'fire').play('fire-a').setOrigin(0.5,1).setScale(0.5).setDepth(b.y+1); }
  }
}
function putBadge(b){
  b.badge=scene.add.text(b.x,b.y-8,'N'+b.nivel,{fontFamily:'ui-monospace,monospace',fontSize:'13px',
    color:'#120d09',backgroundColor:'#c9a227',padding:{x:4,y:1}}).setOrigin(0.5,0).setDepth(97000);
}

/* ===== unidades militares ===== */
function entrenar(tipoU,b){
  const u=UNIDADES[tipoU];
  if(popTotal()>=POPCAP()){ toast('🏠 Cupo lleno ('+POPCAP()+'). Más Casas o despedí unidades.'); sfx('creak',0.4); return; }
  if(!pagar(u.costo)){ toast('No te alcanza: '+costoTxt(u.costo)); sfx('creak',0.4); return; }
  if(tipoU==='aldeano'){ const a=spawnAldeano(b.x+rint(-30,30),b.y+rint(10,26)); if(a){S.stats.aldCreados++; revelar(a.spr.x,a.spr.y,4); dustAt(a.spr.x,a.spr.y,2); sfx('bong',0.5); toast('👤 Aldeano nuevo en el pueblo.');} refreshHUD(); renderSel(); return; }
  const tex=tipoU==='guerrero'?'warrior_blue':'archer_blue_i';
  const s=scene.add.sprite(b.x+rint(-34,34),b.y+rint(10,28),tex).setOrigin(0.5,tipoU==='guerrero'?0.95:0.72).setScale(0.72).setDepth(b.y);
  s.play(tipoU==='guerrero'?'war-i':'arq-i');
  const un={id:'u'+S.nextId++, tipo:tipoU, spr:s, home:{x:s.x,y:s.y}, target:null, cd:0, dead:false, wT:rint(3,8), moveT:null};
  s.setInteractive({useHandCursor:true});
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'militar',ref:un}); });
  S.units.push(un); S.stats.entrenados++;
  dustAt(s.x,s.y,2); sfx('clash',0.4); toast('⚔️ '+u.nom+' entrenado y en guardia.');
  refreshHUD();
}
function moverMilitar(u,wx,wy){
  const t=tileOfPx(wx,wy); const dst=walkable(t.x,t.y)?t:(adjWalkable(t.x,t.y)||t);
  u.home={x:(BX+dst.x)*T+T/2,y:(BY+dst.y)*T+T/2};
  u.moveT=u.home;
  if(!S.raid.on) u.spr.play(u.tipo==='guerrero'?'war-r':'arq-r',true);
}
function despedirMilitar(u){
  u.dead=true; S.units=S.units.filter(x=>x!==u);
  scene.tweens.add({targets:u.spr,alpha:0,y:'-=14',duration:600,onComplete:()=>u.spr.destroy()});
  sfx('door',0.4); toast('Unidad despedida: cupo liberado.');
  if(S.sel&&S.sel.ref===u) deseleccionar(); refreshHUD();
}

/* ===== órdenes (clic derecho) ===== */
function ordenar(p){
  const sel=S.sel; if(!sel) return;
  const wp=scene.cameras.main.getWorldPoint(p.x,p.y);
  if(sel.t==='militar'){ moverMilitar(sel.ref,wp.x,wp.y); marcaOrden(wp.x,wp.y); return; }
  if(sel.t!=='aldeano') return;
  const a=sel.ref;
  const an=S.animals.find(m=>!m.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,m.spr.x,m.spr.y)<40);
  if(an){ mandarCazar(a,an); marcaOrden(an.spr.x,an.spr.y); toast('🏹 A cazar el '+FAUNA[an.tipo].nom.toLowerCase()+'.'); return; }
  const pile=S.piles.find(m=>Phaser.Math.Distance.Between(wp.x,wp.y,m.x,m.y)<40);
  if(pile){ mandarRecolectar(a,pile); marcaOrden(pile.x,pile.y); return; }
  const t=tileAt(p); if(!t) return;
  const occ=S.grid[t.y][t.x];
  if(typeof occ==='string'&&occ[0]==='n'){ const nd=S.nodes.find(n=>n.id===occ);
    if(nd){ mandarNodo(a,nd); marcaOrden((BX+t.x)*T+T/2,(BY+t.y)*T+T/2); return; } }
  const b=S.buildings.find(bb=>occ===bb.id);
  if(b){
    if(b.estado==='esperando'||b.estado==='obra'){ mandarConstruir(a,b); marcaOrden(b.x,b.y); return; }
    if(b.tipo==='granja'&&b.estado==='ok'&&!b.danado){ mandarTrabajar(a,b); marcaOrden(b.x,b.y); return; }
  }
  if(walkable(t.x,t.y)){ moverA(a,t.x,t.y,()=>parar(a)); marcaOrden((BX+t.x)*T+T/2,(BY+t.y)*T+T/2); }
  else sfx('creak',0.3);
}

/* ===== colocación de edificios ===== */
function startPlace(tipo,moverId){
  S.colocando={tipo,moverId:moverId||null};
  if(ghostSpr){ghostSpr.destroy();ghostSpr=null;}
  if(tipo!=='granja'){
    const tex=moverId?texOf(byId(moverId)):CARD_IMG[tipo];
    if(tex&&tex!=='sheep') ghostSpr=scene.add.image(0,0,tex).setOrigin(0.5,1).setAlpha(0.55).setDepth(94000).setVisible(false);
  }
  hint((moverId?'Reubicando ':'Colocando ')+CAT[tipo].nom+' — verde libre · rojo ocupado · ESC cancela');
  buildGrid();
}
function drawGhost(p){
  const c=CAT[S.colocando.tipo];
  ghostG.clear();
  const t=tileAt(p); if(!t){ if(ghostSpr)ghostSpr.setVisible(false); return; }
  const ok=canPlaceB(t.x,t.y,c,S.colocando.moverId);
  ghostG.fillStyle(ok?0x5fa55a:0xc94f45,0.35).fillRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  ghostG.lineStyle(2,ok?0x5fa55a:0xc94f45,0.9).strokeRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  if(ghostSpr) ghostSpr.setVisible(true).setPosition((BX+t.x)*T+c.fw*T/2,(BY+t.y+c.fh)*T);
}
function canPlaceB(tx,ty,c,ignoreId){
  for(let y=0;y<c.fh;y++)for(let x=0;x<c.fw;x++){
    const gx=tx+x, gy=ty+y;
    if(!isIn(gx,gy)||!isLand(gx,gy)||S.cliff[gy][gx]||!S.explored[gy][gx]) return false;
    const occ=S.grid[gy][gx];
    if(occ!==null&&occ!==ignoreId) return false;
    if(S.elev[gy][gx]!==S.elev[ty][tx]) return false;
  }
  return true;
}
function tryPlace(tx,ty){
  const {tipo,moverId}=S.colocando, c=CAT[tipo];
  if(!canPlaceB(tx,ty,c,moverId)){ sfx('creak',0.4); return; }
  if(moverId){
    const b=byId(moverId); setGrid(b,null); b.tx=tx; b.ty=ty; setGrid(b,b.id); refreshBuilding(b);
    sfx('door',0.5); toast(c.nom+' reubicado.');
  } else {
    if(!pagar(c.costo)){ sfx('creak',0.4); toast('No te alcanza para '+c.nom+'.'); return; }
    addBuilding(tipo,tx,ty,{});
    sfx('door',0.55);
  }
  cancelPlace(); refreshHUD();
}
function cancelPlace(){ S.colocando=null; ghostG.clear(); if(ghostSpr){ghostSpr.destroy();ghostSpr=null;} hint(''); buildGrid(); }

/* ===== economía ===== */
function pagar(costo){
  for(const k in costo){ const cur=k==='ambar'?S.ambar:S[k]; if(cur<costo[k]) return false; }
  for(const k in costo){ if(k==='ambar') S.ambar-=costo[k]; else S[k]-=costo[k]; }
  return true;
}
const costoTxt=c=>Object.entries(c).map(([k,v])=>`${v} ${k==='ambar'?'◆':k}`).join(' · ')||'gratis';
const byId=id=>S.buildings.find(b=>b.id===id);

/* ===== SELECCIÓN + panel inferior ===== */
function seleccionar(sel){ S.sel=sel; renderSel(); buildGrid(); }
function deseleccionar(){ S.sel=null; renderSel(); buildGrid(); }
function accion(label,fn,disabled){
  const b=document.createElement('button'); b.className='ghost'; b.textContent=label; b.disabled=!!disabled;
  if(fn&&!disabled) b.onclick=fn;
  $('selActions').appendChild(b);
}
function setHp(cur,max){
  const w=$('selHpWrap');
  if(cur==null){ w.style.display='none'; return; }
  w.style.display='block';
  const p=Math.max(0,Math.min(1,cur/max));
  const i=$('selHp'); i.style.width=(p*100)+'%';
  i.style.background=p>0.5?'#5fa55a':p>0.25?'#c9a227':'#c94f45';
}
const ESTLBL={libre:'Libre',paseo:'Paseando',yendo:'En camino',obrero:'Construyendo',peon:'En la granja',
  talando:'Talando 🪓',minando:'Minando ⛏️',cazando:'Cazando 🏹',recolectando:'Recogiendo carne'};
function renderSel(){
  const act=$('selActions'); act.innerHTML='';
  const sel=S.sel;
  if(!sel){ $('selNom').textContent='—'; $('selLvl').textContent=''; setHp(null); $('selVacio').style.display='block'; return; }
  $('selVacio').style.display='none';

  if(sel.t==='aldeano'){
    const a=sel.ref;
    $('selNom').textContent='Aldeano'; $('selLvl').textContent=ESTLBL[a.estado]||a.estado; setHp(a.hp,a.maxhp);
    const ocupado=a.estado!=='libre'&&a.estado!=='paseo';
    accion('DETENER',()=>parar(a),!ocupado);
    accion('DESPEDIR',()=>despedir(a),false);
    const t=$('selVacio'); t.style.display='block';
    t.innerHTML='Clic derecho para ordenar: <b>ir</b>, <b>talar</b> árbol, <b>minar</b> veta o <b>cazar</b> animal.<br>Elegí un edificio de la derecha para que <b>este</b> aldeano lo construya.';
  } else if(sel.t==='militar'){
    const u=sel.ref;
    $('selNom').textContent=UNIDADES[u.tipo].nom; $('selLvl').textContent='En guardia'; setHp(null);
    accion('DESPEDIR',()=>despedirMilitar(u),false);
    const t=$('selVacio'); t.style.display='block'; t.innerHTML='Clic derecho: reposicionar la unidad.';
  } else if(sel.t==='nodo'){
    const nd=sel.ref, cfg=NODO[nd.kind];
    $('selNom').textContent=cfg.nom; $('selLvl').textContent='Reserva: '+Math.ceil(nd.reserva)+' '+cfg.res; setHp(nd.reserva,cfg.reserva);
    accion(cfg.verbo,()=>{ const a=aldLibreCerca(nd.spr.x,nd.spr.y); if(a){mandarNodo(a,nd); toast('Aldeano en camino a '+cfg.verbo.toLowerCase()+'.');} else toast('No hay aldeanos libres.'); },false);
  } else if(sel.t==='animal'){
    const m=sel.ref, cfg=FAUNA[m.tipo];
    $('selNom').textContent=cfg.nom; $('selLvl').textContent='Carne: '+cfg.carne+(cfg.dmg?' · ⚠️ contraataca':' · pacífico'); setHp(m.hp,m.maxhp);
    accion('CAZAR',()=>{ const a=aldLibreCerca(m.spr.x,m.spr.y); if(a){mandarCazar(a,m); toast('🏹 A cazar.');} else toast('No hay aldeanos libres.'); },false);
  } else if(sel.t==='pila'){
    const pile=sel.ref;
    $('selNom').textContent='Carne'; $('selLvl').textContent='+'+pile.carne+' comida al recogerla'; setHp(null);
    accion('RECOGER',()=>{ const a=aldLibreCerca(pile.x,pile.y); if(a){mandarRecolectar(a,pile);} else toast('No hay aldeanos libres.'); },false);
  } else if(sel.t==='edificio'){
    renderSelEdificio(sel.ref);
  }
}
function renderSelEdificio(b){
  const c=CAT[b.tipo];
  $('selNom').textContent=c.nom;
  $('selLvl').textContent='Nivel '+b.nivel+(b.estado==='esperando'?' · ESPERANDO ALDEANO':'')+(b.estado==='obra'?' · EN OBRA':'')+(b.danado?' · 🔥 DAÑADO':'')+(b.skin==='red'?' · roja':'');
  setHp(b.hp,100);
  if(b.danado){ accion('REPARAR (60 oro)',()=>repararB(b),S.oro<60); }
  else {
    const max=b.tipo==='castle'?MAXLVL.castle:MAXLVL.def;
    const up=c.up&&c.up[b.nivel-1];
    if(up&&b.nivel<max) accion('MEJORAR ('+costoTxt(up.costo)+')',()=>mejorarB(b),b.estado!=='ok');
    if(c.prod&&b.estado==='ok') accion('COSECHAR ('+Math.floor(b.buf)+' '+c.prod+')',()=>cosechar(b),b.buf<1);
    const uCrear=Object.keys(UNIDADES).find(k=>UNIDADES[k].de.includes(b.tipo));
    if(uCrear&&b.estado==='ok') accion('CREAR '+UNIDADES[uCrear].nom.toUpperCase()+' ('+costoTxt(UNIDADES[uCrear].costo)+')',()=>entrenar(uCrear,b),popTotal()>=POPCAP());
  }
  if(b.estado==='obra') accion('◆ ACELERAR ('+(S.ACEL_TOPE-S.aceleradas)+' · 10)',()=>acelerarB(b),!(S.aceleradas<S.ACEL_TOPE&&S.ambar>=10));
  if(c.skins&&b.estado==='ok'&&!b.danado) accion(b.skin==='red'?'SKIN ROJA ✓':'◆ SKIN ROJA (25)',()=>skinB(b),b.skin==='red'||S.ambar<25);
  if(b.estado==='ok') accion('MOVER',()=>startPlace(b.tipo,b.id),false);
  accion('DEMOLER (40 mad.)',()=>limpiarRestos(b),S.madera<40);
}
function repararB(b){ if(!b.danado||S.oro<60) return;
  S.oro-=60; b.danado=false; b.hp=100; refreshBuilding(b); sfx('bong',0.5); toast(CAT[b.tipo].nom+' reparado.'); refreshHUD(); renderSel(); }
function mejorarB(b){ const up=CAT[b.tipo].up[b.nivel-1];
  if(!pagar(up.costo)){ sfx('creak',0.4); toast('No te alcanza para la mejora.'); return; }
  b.estado='esperando'; b.obraT=0; b.obraDur=up.dur; b.mejorando=true; refreshBuilding(b);
  const a=aldLibreCerca(b.x,b.y); if(a) mandarConstruir(a,b); else toast('⚠️ La mejora espera un aldeano libre.');
  sfx('door',0.5); renderSel(); refreshHUD(); }
function acelerarB(b){ if(b.estado!=='obra'||S.aceleradas>=S.ACEL_TOPE||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; S.aceleradas++; b.obraT=b.obraDur; sfx('coins',0.6); toast('Obra acelerada (◆ simulado).'); refreshHUD(); renderSel(); }
function skinB(b){ if(!CAT[b.tipo].skins||b.skin==='red'||S.ambar<25){ sfx('creak',0.4); return; }
  S.ambar-=25; b.skin='red'; S.stats.skins++; refreshBuilding(b); sfx('coins',0.6); toast('Skin roja — cosmético puro.'); refreshHUD(); renderSel(); }

/* ===== barra contextual de construcción ===== */
function gateMsg(c,tipo){
  if(S.thNivel<c.req) return c.req===1?'Ayuntamiento':'Ayunt. N'+c.req;
  if(c.reqB&&!S.buildings.some(b=>b.tipo===c.reqB&&b.estado==='ok')) return 'requiere '+CAT[c.reqB].nom;
  if(c.unico&&S.buildings.some(b=>b.tipo===tipo)) return 'único';
  return null;
}
function buildGrid(){
  const grid=$('buildgrid'); grid.innerHTML='';
  const hayAld=S.sel&&S.sel.t==='aldeano';
  $('gridTitle').textContent=hayAld?'CONSTRUIR':'—';
  if(!hayAld){
    const m=document.createElement('div');
    m.style.cssText='align-self:center;color:var(--muted);font-size:11px;line-height:1.6;padding:6px 10px;max-width:360px';
    m.innerHTML='Seleccioná un <b>aldeano</b> (clic izquierdo) para ver qué puede construir.<br>Los recursos del mapa —árboles, vetas, animales— se explotan con clic derecho.';
    grid.appendChild(m); return;
  }
  for(const tipo in CAT){
    const c=CAT[tipo];
    const lock=gateMsg(c,tipo);
    const noPlata=!lock&&!Object.entries(c.costo).every(([k,v])=>(k==='ambar'?S.ambar:S[k])>=v);
    const el=document.createElement('div');
    el.className='card'+(lock?' lock':'')+(S.colocando&&S.colocando.tipo===tipo?' sel':'');
    const img=CARD_IMG[tipo], isSheet=img==='sheep';
    el.innerHTML=`${isSheet
      ?`<div style="width:64px;height:44px;margin:2px auto;background:url('assets/img/sheep.png') no-repeat 0 0;background-size:200%;image-rendering:pixelated"></div>`
      :`<img src="assets/img/ts/${img}.png" alt="">`}
      <div class="nom">${c.nom}${c.premium?' ◆':''}</div>
      <div class="costo"><b>${costoTxt(c.costo)}</b><br>${c.dur>=60?(c.dur/60).toFixed(c.dur%60?1:0)+' min':c.dur+' s'}</div>
      ${lock?`<div class="req">🔒 ${lock}</div>`:noPlata?`<div class="req">sin recursos</div>`:''}`;
    if(!lock) el.onclick=()=>{
      if(S.colocando&&S.colocando.tipo===tipo){ cancelPlace(); return; }
      S.aldElegido=S.sel&&S.sel.t==='aldeano'?S.sel.ref:null;
      startPlace(tipo,null);
    };
    grid.appendChild(el);
  }
}

/* ===== misiones ===== */
function refreshQuest(){
  const q=QUESTS[S.qIx];
  if(!q){ $('qTxt').textContent='¡Completaste todas las misiones! 👑'; $('btnQuest').style.display='none'; $('qBox').classList.remove('done'); return; }
  $('qTxt').textContent=(S.qIx+1)+'/'+QUESTS.length+' · '+q.txt;
  const done=q.check();
  $('btnQuest').style.display='block'; $('btnQuest').disabled=!done;
  $('btnQuest').textContent=done?'RECLAMAR '+costoTxt(q.rew):'···';
  $('qBox').classList.toggle('done',done);
}
$('btnQuest').onclick=()=>{
  const q=QUESTS[S.qIx]; if(!q||!q.check()) return;
  for(const k in q.rew){ if(k==='ambar')S.ambar+=q.rew[k]; else S[k]=Math.min(CAP,S[k]+q.rew[k]); }
  sfx('bong',0.65); toast('Misión cumplida: '+costoTxt(q.rew));
  S.qIx++; refreshQuest(); refreshHUD();
};

/* ===== bote misterioso ===== */
function scheduleBoat(){ scene.time.delayedCall(rint(70000,120000),spawnBoat); }
function spawnBoat(){
  const y=(BY+rint(2,GH-3))*T;
  const boat=scene.add.sprite(-MAR/2,y,'sboat').play('sboat-a').setDepth(-22).setScale(0.8);
  scene.tweens.add({targets:boat,x:(BX-2)*T,duration:7000,ease:'Sine.easeOut',onComplete:()=>{
    boat.setInteractive({useHandCursor:true});
    const glow=scene.add.circle(boat.x,y-30,16,0xc9a227,0.4).setDepth(-21);
    scene.tweens.add({targets:glow,alpha:0.1,scale:1.4,duration:600,yoyo:true,repeat:-1});
    toast('⚓ Un bote misterioso llegó — tocalo antes de que se vaya.'); sfx('bell',0.4);
    const irse=scene.time.delayedCall(25000,()=>{ glow.destroy(); despacharBote(boat,false); });
    boat.once('pointerdown',()=>{ irse.remove(); glow.destroy();
      const botin=pick([{oro:rint(60,150)},{madera:rint(60,150)},{comida:rint(60,120)},{ambar:rint(8,20)}]);
      for(const k in botin){ if(k==='ambar')S.ambar+=botin[k]; else S[k]=Math.min(CAP,S[k]+botin[k]);
        flyText(boat.x+40,y-20,'+'+botin[k]+' '+(k==='ambar'?'◆':k)); }
      sfx('coins',0.7); refreshHUD(); despacharBote(boat,true);
    });
  }});
}
function despacharBote(boat,ok){
  scene.tweens.add({targets:boat,x:-MAR/2,duration:6000,ease:'Sine.easeIn',onComplete:()=>boat.destroy()});
  if(!ok) toast('El bote se fue sin que lo revises…');
  scheduleBoat();
}

/* ===== asalto goblin ===== */
function startRaid(){
  if(S.raid.on) return;
  S.raid.on=true; S.raid.t=0; S.raid.gob=[]; S.raid.war=[];
  const n=2+Math.max(1,S.thNivel)+rint(0,1);
  sfx('latch',0.6); scene.cameras.main.shake(260,0.006);
  $('raidbanner').classList.add('on'); $('btnMercen').style.display='inline-block';
  toast('⚔️ ¡ASALTO GOBLIN! '+n+' invasores desembarcan.');
  for(let i=0;i<n;i++){
    const lado=pick(['o','e','s']);
    const gx=lado==='o'?(BX-2)*T:lado==='e'?(BX+GW+2)*T:(BX+rint(1,GW-1))*T;
    const gy=lado==='s'?(BY+GH+2)*T:(BY+rint(1,GH-1))*T;
    const tipo=Math.random()<0.6?'torch':'spear';
    const s=scene.add.sprite(gx,gy,tipo==='torch'?'goblin_torch':'spear_run').setOrigin(0.5,0.72)
      .setScale(tipo==='torch'?0.62:0.52).setDepth(gy);
    s.play(tipo==='torch'?'gt-r':'sp-r');
    S.raid.gob.push({spr:s,tipo,target:null,atkT:0,dead:false});
  }
  S.units.forEach(u=>{ u.spr.play(u.tipo==='guerrero'?'war-r':'arq-r',true); });
}
function spawnDefensor(x,y){
  const s=scene.add.sprite(x,y,'warrior_blue').setOrigin(0.5,0.95).setScale(0.72).setDepth(y);
  s.play('war-r'); S.raid.war.push({spr:s,target:null,dead:false});
}
function endRaid(win){
  S.raid.on=false;
  $('raidbanner').classList.remove('on'); $('btnMercen').style.display='none';
  S.raid.gob.forEach(g=>{ if(!g.dead){ scene.tweens.add({targets:g.spr,alpha:0,x:g.spr.x+rint(-120,120),duration:900,onComplete:()=>g.spr.destroy()}); } });
  S.raid.war.forEach(w=>{ if(!w.dead){ scene.tweens.add({targets:w.spr,alpha:0,duration:1200,onComplete:()=>w.spr.destroy()}); } });
  S.units.forEach(u=>{ if(!u.dead){ u.spr.play(u.tipo==='guerrero'?'war-i':'arq-i',true); u.target=null; } });
  S.raid.cool=rint(200,300);
  if(win){ S.stats.raids++;
    const oro=rint(50,120), amb=rint(10,25);
    S.oro=Math.min(CAP,S.oro+oro); S.ambar+=amb;
    sfx('bong',0.7); toast('🛡️ ¡Asalto repelido! Botín: +'+oro+' oro · +'+amb+' ◆');
  } else { sfx('creak',0.5); toast('Los goblins se retiraron dejando destrozos. Repará y reforzá.'); }
  refreshHUD(); refreshQuest();
}
function killGoblin(g){
  if(g.dead) return; g.dead=true;
  burstAt(g.spr.x,g.spr.y-14,0x7fbf5a); dustAt(g.spr.x,g.spr.y,2); g.spr.destroy();
  if(S.raid.gob.every(x=>x.dead)) endRaid(true);
}
function raidTick(dtReal){
  const R=S.raid; R.t+=dtReal;
  if(R.t>60){ endRaid(R.gob.length>0&&R.gob.every(g=>g.dead)); return; }
  const vivos=R.gob.filter(g=>!g.dead);
  if(!vivos.length) return;
  for(const g of vivos){
    if(!g.target||g.target.danado||g.target.estado!=='ok'){
      const cands=S.buildings.filter(b=>b.estado==='ok'&&!b.danado);
      if(!cands.length){ endRaid(false); return; }
      g.target=cands.reduce((m,b)=>Phaser.Math.Distance.Between(g.spr.x,g.spr.y,b.x,b.y)<Phaser.Math.Distance.Between(g.spr.x,g.spr.y,m.x,m.y)?b:m,cands[0]);
    }
    const d=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,g.target.x,g.target.y-20);
    if(d>34){
      const sp=44*dtReal, ang=Math.atan2(g.target.y-20-g.spr.y,g.target.x-g.spr.x);
      g.spr.x+=Math.cos(ang)*sp; g.spr.y+=Math.sin(ang)*sp; g.spr.setFlipX(Math.cos(ang)<0); g.spr.setDepth(g.spr.y);
    } else {
      g.atkT+=dtReal;
      if(g.atkT>1.1){ g.atkT=0; g.target.hp-=12;
        g.spr.play(g.tipo==='torch'?'gt-i':'sp-i',true);
        scene.tweens.add({targets:g.target.sprs[0],x:'+=3',duration:50,yoyo:true,repeat:1});
        burstAt(g.target.x,g.target.y-24,0xe5533a);
        if(g.target.hp<=0){ g.target.danado=true;
          const w=S.ald.find(a=>a.bId===g.target.id&&a.estado==='peon'); if(w) parar(w);
          refreshBuilding(g.target); sfx('fire',0.4);
          toast('🔥 ¡'+CAT[g.target.tipo].nom+' dañado! Seleccionalo para REPARAR.'); g.target=null; }
      }
    }
  }
  for(const t of S.buildings.filter(b=>b.tipo==='torre'&&b.estado==='ok'&&!b.danado)){
    t.cd=(t.cd||0)-dtReal;
    if(t.cd<=0){
      const g=vivos.filter(g2=>!g2.dead).sort((a,b2)=>Phaser.Math.Distance.Between(t.x,t.y,a.spr.x,a.spr.y)-Phaser.Math.Distance.Between(t.x,t.y,b2.spr.x,b2.spr.y))[0];
      if(g&&Phaser.Math.Distance.Between(t.x,t.y,g.spr.x,g.spr.y)<T*6){
        t.cd=1.5+(t.nivel>1?-0.4:0);
        const p=scene.add.image(t.x,t.y-CAT.torre.fh*T,'dot').setTint(0xffe9a0).setDepth(99998).setScale(1.1);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-16,duration:220,ease:'Linear',onComplete:()=>{p.destroy(); killGoblin(g);}});
        sfx('clash',0.25);
      }
    }
  }
  pelear(S.units,vivos,dtReal,true);
  pelear(R.war,vivos,dtReal,false);
}
function pelear(lista,vivos,dtReal,esUnidad){
  for(const u of lista.filter(u2=>!u2.dead)){
    const arquero=esUnidad&&u.tipo==='arquero';
    const alcance=arquero?T*4.5:26;
    if(!u.target||u.target.dead) u.target=vivos.find(g=>!g.dead)||null;
    if(!u.target){ if(u.moveT){ const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,u.moveT.x,u.moveT.y);
        if(d>6){ const sp=58*dtReal, ang=Math.atan2(u.moveT.y-u.spr.y,u.moveT.x-u.spr.x); u.spr.x+=Math.cos(ang)*sp; u.spr.y+=Math.sin(ang)*sp; u.spr.setFlipX(Math.cos(ang)<0); u.spr.setDepth(u.spr.y);} else u.moveT=null; }
      continue; }
    const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,u.target.spr.x,u.target.spr.y);
    if(d>alcance){
      const sp=(arquero?50:58)*dtReal, ang=Math.atan2(u.target.spr.y-u.spr.y,u.target.spr.x-u.spr.x);
      u.spr.x+=Math.cos(ang)*sp; u.spr.y+=Math.sin(ang)*sp; u.spr.setFlipX(Math.cos(ang)<0); u.spr.setDepth(u.spr.y);
    } else if(arquero){
      u.cd-=dtReal;
      if(u.cd<=0){ u.cd=1.8; const g=u.target, p=scene.add.image(u.spr.x,u.spr.y-20,'dot').setTint(0xd9c9a0).setDepth(99998);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-14,duration:200,ease:'Linear',onComplete:()=>{p.destroy(); killGoblin(g);}});
        sfx('clash',0.2); u.target=null; }
    } else {
      sfx('clash',0.3); burstAt(u.spr.x,u.spr.y-16,0xffffff); killGoblin(u.target); u.target=null;
      if(Math.random()<(esUnidad?0.2:0.25)){ u.dead=true; if(esUnidad) S.units=S.units.filter(x=>x!==u);
        const d2=scene.add.sprite(u.spr.x,u.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(u.spr.y);
        d2.once('animationcomplete',()=>scene.tweens.add({targets:d2,alpha:0,duration:1500,onComplete:()=>d2.destroy()}));
        u.spr.destroy(); refreshHUD(); }
    }
  }
}

/* ===== HUD ===== */
function refreshHUD(){
  $('vOro').textContent=Math.floor(S.oro); $('vMad').textContent=Math.floor(S.madera); $('vCom').textContent=Math.floor(S.comida);
  $('vAmbar').textContent=S.ambar;
  const libres=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo').length;
  $('vAld').textContent=libres+' libres · '+popTotal()+'/'+POPCAP();
  $('cOro').textContent='/'+CAP; $('cMad').textContent='/'+CAP; $('cCom').textContent='/'+CAP;
  $('rOro').classList.toggle('lleno',S.oro>=CAP); $('rMad').classList.toggle('lleno',S.madera>=CAP); $('rCom').classList.toggle('lleno',S.comida>=CAP);
}
let toastT=null;
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3600); }
function hint(msg){ const h=$('hint'); h.textContent=msg; h.classList.toggle('on',!!msg); }
$('btnTiempo').onclick=()=>{ S.speed=S.speed===1?4:1; $('btnTiempo').textContent='⏱ ×'+S.speed; };
$('btnCaravana').onclick=()=>{
  if(S.ambar<8){ sfx('creak',0.4); toast('La caravana cuesta 8 ◆.'); return; }
  S.ambar-=8; const menor=['oro','madera','comida'].sort((a,b2)=>S[a]-S[b2])[0];
  S[menor]=Math.min(CAP,S[menor]+250); sfx('coins',0.6); toast('Caravana: +250 de '+menor+'.'); refreshHUD();
};
$('btnMercen').onclick=()=>{
  if(!S.raid.on||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; for(let i=0;i<3;i++) spawnDefensor(homePos.x+rint(-60,60),homePos.y+rint(-40,40));
  sfx('clash',0.5); toast('¡3 mercenarios al campo!'); refreshHUD();
};

/* ===== minimapa ===== */
function initMinimap(){
  const cv=$('minimap'); mmCtx=cv.getContext('2d');
  cv.addEventListener('pointerdown',e=>{
    const r=cv.getBoundingClientRect();
    const fx=(e.clientX-r.left)/r.width, fy=(e.clientY-r.top)/r.height;
    const wx=BX*T+fx*GW*T, wy=BY*T+fy*GH*T;
    overview=false; scene.cameras.main.centerOn(wx,wy);
  });
}
function drawMinimap(){
  if(!mmCtx) return;
  const cw=220/GW, ch=150/GH;
  mmCtx.clearRect(0,0,220,150);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    let col;
    if(!S.explored[y][x]) col='#05090c';
    else if(!S.land[y][x]) col='#1c4a5a';
    else if(S.elev[y][x]) col='#7a6a4a';
    else col='#3f6b3a';
    mmCtx.fillStyle=col; mmCtx.fillRect(x*cw,y*ch,cw+0.6,ch+0.6);
  }
  const dot=(wx,wy,col,sz)=>{ mmCtx.fillStyle=col;
    mmCtx.fillRect((wx-BX*T)/(GW*T)*220-sz/2,(wy-BY*T)/(GH*T)*150-sz/2,sz,sz); };
  for(const n of S.nodes){ if(S.explored[n.ty][n.tx]) dot(n.spr.x,n.spr.y,n.kind==='arbol'?'#1e4d28':'#e5c542',2.4); }
  for(const m of S.animals){ if(!m.dead){ const t=tileOfPx(m.spr.x,m.spr.y); if(S.explored[t.y][t.x]) dot(m.spr.x,m.spr.y,'#e598b0',2.2); } }
  for(const b of S.buildings){ dot(b.x,b.y,b.skin==='red'?'#e5533a':'#f4ecda',3); }
  for(const a of S.ald) dot(a.spr.x,a.spr.y,'#ffe9a0',2.4);
  for(const u of S.units) dot(u.spr.x,u.spr.y,'#4a90c2',2.4);
  if(S.raid.on) for(const g of S.raid.gob){ if(!g.dead) dot(g.spr.x,g.spr.y,'#ff3a2a',2.6); }
  const v=scene.cameras.main.worldView;
  const rx=(v.x-BX*T)/(GW*T)*220, ry=(v.y-BY*T)/(GH*T)*150, rw=v.width/(GW*T)*220, rh=v.height/(GH*T)*150;
  mmCtx.strokeStyle='rgba(255,233,160,.9)'; mmCtx.lineWidth=1.2; mmCtx.strokeRect(rx,ry,rw,rh);
}

/* ===== loop ===== */
let hudAcc=0, qAcc=0, mmAcc=0;
function update(time,delta){
  const dt=delta/1000*S.speed, dtReal=delta/1000;

  for(const a of S.ald){
    if(a.estado==='yendo'){
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<5){
        if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { const cb=a.onArrive; a.onArrive=null; if(cb) cb(a); else if(a.estado==='yendo') a.spr.play('pawn_blue-i',true); }
      } else { const sp=72*dtReal; a.spr.x+=dx/d*sp; a.spr.y+=dy/d*sp; a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    } else if(a.estado==='cazando'){
      const m=a.objAnimal;
      if(!m||m.dead){ if(!a.objPile) parar(a); }
      else {
        const d=Phaser.Math.Distance.Between(a.spr.x,a.spr.y,m.spr.x,m.spr.y);
        if(d>34){ const sp=70*dtReal, ang=Math.atan2(m.spr.y-a.spr.y,m.spr.x-a.spr.x);
          a.spr.x+=Math.cos(ang)*sp; a.spr.y+=Math.sin(ang)*sp; a.spr.setFlipX(Math.cos(ang)<0); a.spr.setDepth(a.spr.y);
          if(a.spr.anims.currentAnim&&a.spr.anims.currentAnim.key!=='pawn_blue-r') a.spr.play('pawn_blue-r',true);
        } else {
          m.hunter=a; a.atkT+=dtReal;
          if(a.atkT>0.9){ a.atkT=0; m.hp-=8; flyText(m.spr.x,m.spr.y-24,'-8','#fff');
            m.spr.setTint(0xffaaaa); scene.time.delayedCall(100,()=>m.spr&&m.spr.active&&m.spr.clearTint());
            burstAt(m.spr.x,m.spr.y-14,0xffffff); sfx('clash',0.25);
            if(m.hp<=0){ matarAnimal(m); }
          }
        }
      }
    } else if(a.estado==='recolectando'){
      const p=a.objPile;
      if(!p||!S.piles.includes(p)){ parar(a); }
      else { a.tarT+=dtReal; if(a.tarT>1.5){ recogerPila(p); parar(a); } }
    } else if(a.estado==='talando'||a.estado==='minando'){
      const nd=S.nodes.find(n=>n.id===a.task);
      if(!nd){ parar(a); }
      else { a.tarT+=dt;
        if(a.tarT>=1.5){ a.tarT=0;
          const gan=Math.min(6,nd.reserva); nd.reserva-=gan;
          if(nd.res==='madera'){ S.madera=Math.min(CAP,S.madera+gan); S.stats.talado+=gan; }
          else { S.oro=Math.min(CAP,S.oro+gan); S.stats.minado+=gan; }
          flyText(nd.spr.x,nd.spr.y-40,'+'+gan+' '+nd.res); sfx('coins',0.3);
          if(S.sel&&S.sel.ref===nd) renderSel();
          if(nd.reserva<=0){ agotarNodo(nd); parar(a); }
          else if((nd.res==='madera'?S.madera:S.oro)>=CAP){ toast('Depósito lleno de '+nd.res+'.'); parar(a); }
        }
      }
    } else if(a.estado==='libre'){
      a.wT-=dtReal;
      if(a.wT<=0){ a.wT=rint(4,9);
        const cur=tileOfPx(a.spr.x,a.spr.y);
        for(let i=0;i<8;i++){ const nx=Phaser.Math.Clamp(cur.x+rint(-3,3),0,GW-1), ny=Phaser.Math.Clamp(cur.y+rint(-3,3),0,GH-1);
          if(walkable(nx,ny)&&S.grid[ny][nx]===null){
            const path=findPath(cur.x,cur.y,nx,ny);
            if(path){ a.estado='paseo'; a.path=path; if(path.length){const p=a.path.shift(); a.tx=p.x; a.ty=p.y;} a.spr.play('pawn_blue-r',true); }
            break; } }
      }
    } else if(a.estado==='paseo'){
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<5){ if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { a.estado='libre'; a.spr.play('pawn_blue-i',true); } }
      else { const sp=46*dtReal; a.spr.x+=dx/d*sp; a.spr.y+=dy/d*sp; a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    }
    // niebla: revelar al moverse
    const tk=Math.floor(a.spr.x/T)+','+Math.floor(a.spr.y/T);
    if(tk!==a.lastTile){ a.lastTile=tk; revelar(a.spr.x,a.spr.y,4); }
  }

  updateAnimals(dtReal,dt);

  for(const b of S.buildings){
    const c=CAT[b.tipo];
    if(b.estado==='esperando'){
      if(!S.ald.some(a=>a.bId===b.id)){ const a=aldLibreCerca(b.x,b.y); if(a) mandarConstruir(a,b); }
      if(b.barG){ b.barG.clear(); const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0x6a6154,1).fillRect(bx,by,bw*0.04,6); }
    }
    else if(b.estado==='obra'){
      b.obraT+=dt; const p=Math.min(1,b.obraT/b.obraDur);
      if(b.barG){ b.barG.clear(); const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0xc9a227,1).fillRect(bx,by,bw*p,6); }
      if(b.obraT>=b.obraDur){
        b.estado='ok'; b.hp=100;
        const obrero=S.ald.find(a=>a.bId===b.id&&(a.estado==='obrero'||a.estado==='yendo'));
        if(obrero) parar(obrero);
        if(b.mejorando){ b.nivel++; b.mejorando=false; }
        if(b.tipo==='castle'){ S.thNivel=Math.max(S.thNivel,b.nivel); buildGrid();
          toast(b.nivel===1?'🏰 ¡El Ayuntamiento está en pie! Nuevos edificios disponibles.':'¡Ayuntamiento nivel '+b.nivel+'!'); }
        if(b.tipo==='house') toast('🏠 Casa lista: +2 de cupo. Seleccionala para CREAR un aldeano.');
        refreshBuilding(b); dustAt(b.x,b.y-20,4); sfx('bong',0.6);
        if(c.prod) pedirTrabajador(b);
        if(S.sel&&S.sel.ref===b) renderSel();
      }
    } else if(b.estado==='ok'&&c.prod&&!b.danado){
      const conPeon=S.ald.some(a=>a.bId===b.id&&a.estado==='peon');
      if(conPeon){ const rate=RATE*(1+0.5*(b.nivel-1));
        const gan=Math.min(rate*dt, b.reserva, BUFFER(b)-b.buf); b.buf+=gan; b.reserva-=gan;
        if(b.reserva<=0){ b.reserva=CAT[b.tipo].reserva; } }   // granja: reserva se repone (rebaño)
      if(b.buf>=25&&!b.pileSpr){
        b.pileSpr=scene.add.image(b.x,b.y-c.fh*T-6,RES_IMG[c.prod]).setScale(0.42).setDepth(97000);
        scene.tweens.add({targets:b.pileSpr,y:'-=7',duration:520,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        b.pileSpr.setInteractive({useHandCursor:true});
        b.pileSpr.on('pointerdown',p=>{ if(!p.rightButtonDown()) cosechar(b); });
      }
      if(b.buf<25&&b.pileSpr){ b.pileSpr.destroy(); b.pileSpr=null; }
    }
  }

  if(S.raid.on) raidTick(dtReal);
  else { S.raid.cool-=dtReal; if(S.raid.cool<=0&&S.buildings.some(b=>b.estado==='ok')) startRaid(); }

  hudAcc+=delta; if(hudAcc>250){ hudAcc=0; refreshHUD(); }
  qAcc+=delta;   if(qAcc>600){ qAcc=0; refreshQuest(); }
  mmAcc+=delta;  if(mmAcc>220){ mmAcc=0; drawMinimap(); }
}
function updateAnimals(dtReal,dt){
  for(const m of S.animals){
    if(m.dead) continue;
    const cfg=FAUNA[m.tipo];
    const cazador=m.hunter&&S.ald.includes(m.hunter)&&m.hunter.estado==='cazando'?m.hunter:null;
    if(cazador){
      const d=Phaser.Math.Distance.Between(m.spr.x,m.spr.y,cazador.spr.x,cazador.spr.y);
      if(cfg.huye){ // oveja: escapa
        if(d<120){ const ang=Math.atan2(m.spr.y-cazador.spr.y,m.spr.x-cazador.spr.x);
          const nx=m.spr.x+Math.cos(ang)*40*dtReal, ny=m.spr.y+Math.sin(ang)*40*dtReal;
          const t=tileOfPx(nx,ny); if(walkable(t.x,t.y)){ m.spr.x=nx; m.spr.y=ny; m.spr.setFlipX(Math.cos(ang)<0); m.spr.setDepth(m.spr.y); } }
      } else if(cfg.dmg){ // jabalí: contraataca
        if(d<34){ m.atkT+=dtReal; if(m.atkT>1.1){ m.atkT=0; dañarAldeano(cazador,cfg.dmg); m.spr.play('cerdo-i',true); } }
      }
      continue;
    }
    // deambular tranquilo
    m.wT-=dtReal;
    if(m.wT<=0){ m.wT=rint(3,8); m.dir=Math.random()*6.28; m.mv=Math.random()<0.6; if(m.spr.play) m.spr.play(m.mv?cfg.anim:cfg.anim,true); }
    if(m.mv){ const sp=(cfg.huye?18:14)*dtReal, nx=m.spr.x+Math.cos(m.dir)*sp, ny=m.spr.y+Math.sin(m.dir)*sp;
      const t=tileOfPx(nx,ny);
      if(walkable(t.x,t.y)&&Math.hypot(t.x-m.homeT.x,t.y-m.homeT.y)<4){ m.spr.x=nx; m.spr.y=ny; m.spr.setFlipX(Math.cos(m.dir)<0); m.spr.setDepth(m.spr.y); }
      else m.dir+=1.6; }
  }
}
