/* ÁMBAR · Mi Base v3 — PROTOTIPO (cliente puro, in-memory)
   Isla ORGÁNICA con desniveles + aldeanos estilo Age of Empires + zoom + agua infinita.
   Arrancás con una casita y 3 aldeanos: cada obra la construye un aldeano de verdad. */

const $=id=>document.getElementById(id);
const T=64, GW=22, GH=16, BX=6, BY=5;
const WT=GW+BX*2, HT=GH+BY*2, WORLD_W=WT*T, WORLD_H=HT*T;
const MAR=1400;                                   // agua extra alrededor del mundo (pantalla completa)
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== catálogo ===== */
const CAP=2000;
const MAXLVL={castle:3, def:2};
const CAT={
  castle:    {nom:'Ayuntamiento', fw:5,fh:2, costo:{oro:300,madera:300}, dur:120, req:0, unico:true, skins:true,
              up:[{costo:{oro:500,madera:500},dur:14400},{costo:{oro:1200,madera:1200},dur:28800}]},
  house:     {nom:'Casa',         fw:2,fh:2, costo:{madera:100},        dur:300,  req:0, skins:true, up:[{costo:{madera:200},dur:1800}]},
  mina:      {nom:'Mina',         fw:3,fh:1, costo:{madera:150},        dur:600,  req:0, prod:'oro',    reserva:600,    up:[{costo:{oro:300},dur:3600}]},
  lenador:   {nom:'Leñador',      fw:2,fh:2, costo:{oro:100},           dur:600,  req:0, prod:'madera', reserva:500, up:[{costo:{oro:300},dur:3600}]},
  granja:    {nom:'Granja',       fw:3,fh:2, costo:{madera:120},        dur:600,  req:0, prod:'comida', reserva:400, up:[{costo:{oro:250},dur:3600}]},
  torre:     {nom:'Torre',        fw:2,fh:2, costo:{oro:200,madera:200},dur:1800, req:2, skins:true, up:[{costo:{oro:500},dur:7200}]},
  cuartel:   {nom:'Cuartel',      fw:3,fh:2, costo:{madera:300},        dur:3600, req:2, skins:true, up:[{costo:{oro:600},dur:10800}]},
  arqueria:  {nom:'Arquería',     fw:3,fh:2, costo:{oro:300},           dur:3600, req:2, reqB:'cuartel', skins:true, up:[{costo:{madera:600},dur:10800}]},
  monasterio:{nom:'Monasterio',   fw:3,fh:2, costo:{ambar:40},          dur:3600, req:3, skins:true, premium:true, up:[{costo:{ambar:60},dur:10800}]},
};
const RATE=0.5, BUFFER=b=>120*b.nivel;
const UNIDADES={
  aldeano: {nom:'Aldeano', costo:{comida:50},        de:['castle','house']},
  guerrero:{nom:'Guerrero',costo:{oro:60,comida:20}, de:['cuartel']},
  arquero: {nom:'Arquero', costo:{oro:80,comida:20}, de:['arqueria']},
};
const POPCAP=()=>3+2*S.buildings.filter(b=>b.tipo==='house'&&b.estado==='ok').length;
const popTotal=()=>S.ald.length+S.units.length;
const CARD_IMG={castle:'castle_blue',house:'house1_blue',mina:'goldmine',lenador:'tree_anim',granja:'sheep',
  torre:'tower_blue',cuartel:'barracks_blue',arqueria:'archery_blue',monasterio:'monastery_blue'};
const RES_IMG={oro:'res_gold',madera:'res_wood',comida:'res_meat'};
const OBST=[{tipo:'arbusto',costo:15},{tipo:'roca',costo:25},{tipo:'arbol',costo:20},{tipo:'hongo',costo:10}];

/* ===== misiones ===== */
const QUESTS=[
  {txt:'Mandá un aldeano a construir una Mina',   check:()=>S.buildings.some(b=>b.tipo==='mina'&&b.estado==='ok'), rew:{madera:80,ambar:10}},
  {txt:'Cosechá tu primera producción (tocá la pila)', check:()=>S.stats.cosechas>=1, rew:{ambar:15}},
  {txt:'Construí el AYUNTAMIENTO del pueblo',     check:()=>S.thNivel>=1,          rew:{ambar:25,comida:100}},
  {txt:'Limpiá 3 matorrales de la isla',          check:()=>S.stats.limpiados>=3,  rew:{oro:60,ambar:10}},
  {txt:'Construí otra Casa y CREÁ un aldeano en ella', check:()=>S.stats.aldCreados>=1, rew:{oro:80}},
  {txt:'Tené Leñador y Granja produciendo',       check:()=>['lenador','granja'].every(t=>S.buildings.some(b=>b.tipo===t&&b.estado==='ok')), rew:{oro:120}},
  {txt:'Mejorá el Ayuntamiento a Nivel 2',        check:()=>S.thNivel>=2,          rew:{ambar:35}},
  {txt:'Construí una Torre defensiva',            check:()=>S.buildings.some(b=>b.tipo==='torre'&&b.estado==='ok'), rew:{oro:100,ambar:10}},
  {txt:'Entrená un Guerrero en el Cuartel',       check:()=>S.stats.entrenados>=1, rew:{comida:150,ambar:10}},
  {txt:'Repelé un asalto goblin (¡final!)',       check:()=>S.stats.raids>=1,      rew:{ambar:100}},
];

/* ===== estado ===== */
const S={ oro:450, madera:450, comida:150, ambar:60,
  speed:1, aceleradas:0, ACEL_TOPE:3,
  grid:Array.from({length:GH},()=>Array(GW).fill(null)),
  land:Array.from({length:GH},()=>Array(GW).fill(false)),
  elev:Array.from({length:GH},()=>Array(GW).fill(0)),
  cliff:Array.from({length:GH},()=>Array(GW).fill(false)),
  buildings:[], obst:[], ald:[], units:[], nextId:1, thNivel:0, aldElegido:null,
  colocando:null, selId:null, selObs:null,
  qIx:0, stats:{cosechas:0,limpiados:0,raids:0,skins:0,aldCreados:0,entrenados:0},
  raid:{on:false,gob:[],war:[],t:0,cool:150} };
let scene, ghostG, ghostSpr=null, manualView=false, baseZoom=1, islaCX=0, islaCY=0;
function sfx(k,v){ try{ scene&&scene.sound.play('s_'+k,{volume:v||0.5}); }catch(e){} }

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#47a5b5',
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
  this.load.spritesheet('pig_idle','assets/img/ts/pig_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('goblin_torch',TSB+'goblin_torch.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spear_idle',TSB+'spear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('spear_run',TSB+'spear_run.png',{frameWidth:256,frameHeight:256});
  this.load.image('goldmine',TSB+'goldmine.png');
  this.load.image('goldmine_destroyed',TSB+'goldmine_destroyed.png');
  this.load.spritesheet('turtle_walk',TSB+'turtle_walk.png',{frameWidth:320,frameHeight:320});
  this.load.spritesheet('lizard_idle',TSB+'lizard_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('lizard_run',TSB+'lizard_run.png',{frameWidth:192,frameHeight:192});
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

/* ===== isla orgánica + meseta ===== */
const isIn=(x,y)=>x>=0&&x<GW&&y>=0&&y<GH;
const isLand=(x,y)=>isIn(x,y)&&S.land[y][x];
function buildIsland(){
  const cx=GW/2-0.5, cy=GH/2-0.5, p1=Math.random()*6.28, p2=Math.random()*6.28, p3=Math.random()*6.28;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const dx=(x-cx)/(GW*0.44), dy=(y-cy)/(GH*0.44);
    const ang=Math.atan2(dy,dx), r=Math.hypot(dx,dy);
    const wob=0.13*Math.sin(ang*3+p1)+0.09*Math.sin(ang*5+p2)+0.05*Math.sin(ang*7+p3);
    S.land[y][x]= r < 0.95+wob;
  }
  for(let it=0;it<2;it++)for(let y=1;y<GH-1;y++)for(let x=1;x<GW-1;x++){
    let v=0; for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++) if(!(ox===0&&oy===0)&&S.land[y+oy][x+ox]) v++;
    if(!S.land[y][x]&&v>=6) S.land[y][x]=true; else if(S.land[y][x]&&v<=2) S.land[y][x]=false;
  }
  // meseta (desnivel): un manchón elevado lejos del centro-sur (zona de spawn)
  let mx=0,my=0,tr=0;
  do{ mx=rint(4,GW-5); my=rint(2,Math.floor(GH/2)); tr++; }while(tr<40&&!isLand(mx,my));
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(!S.land[y][x]) continue;
    if(Math.hypot(x-mx,y-my)<2.6&&y<GH-2) S.elev[y][x]=1;
  }
  // limpiar: la meseta necesita que TODA su fila inferior sea tierra (para la pared)
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(S.elev[y][x]&&(!isLand(x,y+1))) S.elev[y][x]=0;
  // celdas de pared de acantilado (bloqueadas): la fila de abajo del borde sur de la meseta
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(S.elev[y][x]&&isIn(x,y+1)&&!S.elev[y+1][x]) S.cliff[y+1][x]=true;
}
function gIdx(x,y){
  const n=isLand(x,y-1), s=isLand(x,y+1), w=isLand(x-1,y), e=isLand(x+1,y);
  if(n&&s&&w&&e) return 11;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 20; if(!s&&!e) return 22;
  if(!n) return 1; if(!s) return 21; if(!w) return 10; if(!e) return 12; return 11;
}
function eIdx(x,y){                                // autotile 4-col de la meseta (superficie rocosa)
  const inE=(a,b)=>isIn(a,b)&&S.elev[b][a]===1;
  const n=inE(x,y-1), s=inE(x,y+1), w=inE(x-1,y), e=inE(x+1,y);
  if(n&&s&&w&&e) return 5;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 8; if(!s&&!e) return 10;
  if(!n) return 1; if(!s) return 9; if(!w) return 4; if(!e) return 6; return 5;
}

function create(){
  scene=this; makeDot(this);
  buildIsland();
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
  an.create({key:'arq-i',frames:an.generateFrameNumbers('archer_blue_i',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'arq-r',frames:an.generateFrameNumbers('archer_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'cerdo-i',frames:an.generateFrameNumbers('pig_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'war-r',frames:an.generateFrameNumbers('warrior_blue',{start:12,end:17}),frameRate:11,repeat:-1});
  an.create({key:'gt-r',frames:an.generateFrameNumbers('goblin_torch',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'gt-i',frames:an.generateFrameNumbers('goblin_torch',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'sp-r',frames:an.generateFrameNumbers('spear_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'sp-i',frames:an.generateFrameNumbers('spear_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  for(const j of ['waxe','wpick']) an.create({key:j+'-r',frames:an.generateFrameNumbers(j+'_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  for(let i=1;i<=4;i++){ an.create({key:'wrock'+i+'-a',frames:an.generateFrameNumbers('wrock'+i,{start:0,end:7}),frameRate:5,repeat:-1});
    an.create({key:'bush'+i+'-a',frames:an.generateFrameNumbers('bush'+i,{start:0,end:7}),frameRate:6,repeat:-1}); }
  an.create({key:'sboat-a',frames:an.generateFrameNumbers('sboat',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'turtle-w',frames:an.generateFrameNumbers('turtle_walk',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'lizard-i',frames:an.generateFrameNumbers('lizard_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'lizard-r',frames:an.generateFrameNumbers('lizard_run',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'shark-a',frames:an.generateFrameNumbers('shark',{start:0,end:-1}),frameRate:8,repeat:-1});
  an.create({key:'duck-a',frames:an.generateFrameNumbers('duck',{start:0,end:2}),frameRate:4,repeat:-1});

  // AGUA A PANTALLA COMPLETA: cubre mundo + margen enorme (nunca se corta)
  this.add.tileSprite(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2,'water').setOrigin(0,0).setDepth(-30);
  // espuma en toda la costa orgánica
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(!S.land[y][x]) continue;
    let coast=false;
    for(let oy=-1;oy<=1&&!coast;oy++)for(let ox=-1;ox<=1;ox++) if(!isLand(x+ox,y+oy)){coast=true;break;}
    if(coast) this.add.sprite((BX+x)*T+T/2,(BY+y)*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.land[y][x]) rt.drawFrame('ground',gIdx(x,y),(BX+x)*T,(BY+y)*T);
  for(let p=0;p<2;p++){ const sx=rint(2,GW-5), sy=rint(GH-8,GH-4);       // playitas de arena al sur
    for(let y=0;y<2;y++)for(let x=0;x<3;x++) if(isLand(sx+x,sy+y)&&!S.elev[sy+y][sx+x]) rt.drawFrame('ground',16,(BX+sx+x)*T,(BY+sy+y)*T); }
  // meseta elevada + paredes de acantilado
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]) rt.drawFrame('elev',eIdx(x,y),(BX+x)*T,(BY+y)*T);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.cliff[y][x]){
    const l=isIn(x-1,y)&&S.cliff[y][x-1], r=isIn(x+1,y)&&S.cliff[y][x+1];
    rt.drawFrame('elev', l&&r?13 : r?12 : l?14 : 15, (BX+x)*T,(BY+y)*T);
  }

  // mar vivo: rocas, tiburón, patito, bote fondeado, nubes grandes
  for(let i=0;i<8;i++){
    const x=rint(1,WT-2), y=rint(1,HT-2);
    if(x>=BX-1&&x<=BX+GW&&y>=BY-1&&y<=BY+GH&&isLand(x-BX,y-BY)) continue;
    if(x>=BX&&x<BX+GW&&y>=BY&&y<BY+GH) continue;
    const k='wrock'+rint(1,4);
    this.add.sprite(x*T+T/2,y*T+T/2,k).play({key:k+'-a',startFrame:rint(0,7)}).setDepth(-24).setScale(0.85);
  }
  const shark=this.add.sprite(-MAR/2,2*T,'shark').play('shark-a').setDepth(-23).setScale(0.75);
  this.tweens.add({targets:shark,x:WORLD_W+MAR/2,duration:36000,repeat:-1,repeatDelay:18000,
    onRepeat:()=>{shark.y=pick([rint(1,BY-1),rint(HT-BY+1,HT-1)])*T;}});
  const duck=this.add.sprite(WORLD_W+60,(HT-2)*T,'duck').play('duck-a').setDepth(-23).setScale(1.5);
  this.tweens.add({targets:duck,x:'-=140',y:'-=60',duration:12000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  for(let i=1;i<=4;i++){
    const c=this.add.image(rint(-MAR,WORLD_W+MAR),rint(-200,WORLD_H+200),'cloud'+i).setAlpha(0.38).setDepth(89000).setScale(Phaser.Math.FloatBetween(0.8,1.3));
    this.tweens.add({targets:c,x:'+='+(WORLD_W+MAR),duration:rint(80000,140000),repeat:-1,
      onRepeat:()=>{c.x=-MAR;c.y=rint(-200,WORLD_H+200);}});
  }

  // fauna ambiente: tortuga costera + lagarto de la meseta (no bloquean nada)
  { const ty=(BY+GH-1)*T;
    const tu=this.add.sprite((BX+2)*T,ty,'turtle_walk').play('turtle-w').setOrigin(0.5,0.8).setScale(0.35).setDepth(ty);
    this.tweens.add({targets:tu,x:(BX+GW-2)*T,duration:42000,yoyo:true,repeat:-1,
      onYoyo:()=>tu.setFlipX(true), onRepeat:()=>tu.setFlipX(false)}); }
  { let lx=0,ly=0,ok=false;
    for(let y=0;y<GH&&!ok;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]){lx=x;ly=y;ok=true;break;}
    if(ok){ const px2=(BX+lx)*T+T/2, py2=(BY+ly+1)*T;
      const li=this.add.sprite(px2,py2,'lizard_idle').play('lizard-i').setOrigin(0.5,0.72).setScale(0.5).setDepth(py2);
      this.tweens.add({targets:li,x:px2+rint(60,120),duration:6000,yoyo:true,repeat:-1,repeatDelay:3000,
        onYoyo:()=>{li.setFlipX(true);li.play('lizard-r',true);}, onRepeat:()=>{li.setFlipX(false);li.play('lizard-i',true);}}); } }

  ghostG=this.add.graphics().setDepth(95000);

  // ---- ARRANQUE HUMILDE: una casita al sur + 3 aldeanos. El castillo se construye. ----
  let hx=Math.floor(GW/2)-1, hy=GH-4, tr=0;
  while(tr++<60&&!(puedeHuella(hx,hy,2,2))){ hx=rint(2,GW-4); hy=rint(Math.floor(GH/2),GH-3); }
  const home=addBuilding('house',hx,hy,{listo:true});
  islaCX=(BX+hx+1)*T; islaCY=(BY+hy)*T;
  for(let i=0;i<3;i++) spawnAldeano(home.x+rint(-50,50), home.y+rint(6,26), true);
  scatterObstacles(12);
  scatterEyeCandy(14);

  this.input.on('pointermove',p=>{ if(S.colocando) drawGhost(p); });
  this.input.on('pointerdown',p=>{ if(S.colocando){ const t=tileAt(p); if(t) tryPlace(t.x,t.y); } });
  this.input.keyboard&&this.input.keyboard.on('keydown-ESC',cancelPlace);

  // ---- LUPA: rueda = zoom al puntero · arrastrar = pan · doble click = vista general ----
  this.input.on('wheel',(p,objs,dx,dy)=>{
    const cam=this.cameras.main; manualView=true;
    const z=Phaser.Math.Clamp(cam.zoom*(dy>0?0.88:1.14), baseZoom*0.75, 3.2);
    cam.setZoom(z);
    const wp=cam.getWorldPoint(p.x,p.y);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x,wp.x,0.3), Phaser.Math.Linear(cam.midPoint.y,wp.y,0.3));
  });
  let dragMoved=false;
  this.input.on('pointermove',p=>{
    if(!p.isDown||S.colocando) return;
    if(Math.abs(p.x-p.downX)+Math.abs(p.y-p.downY)>8) dragMoved=true;
    if(dragMoved){ manualView=true; const cam=this.cameras.main;
      cam.scrollX-=(p.x-p.prevPosition.x)/cam.zoom; cam.scrollY-=(p.y-p.prevPosition.y)/cam.zoom; }
  });
  this.input.on('pointerup',()=>{ setTimeout(()=>{dragMoved=false;},0); });
  this.game.canvas.addEventListener('dblclick',()=>{ manualView=false; fitCamera(); });

  this.cameras.main.setBounds(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2);
  fitCamera(); this.scale.on('resize',fitCamera);
  buildBar(); refreshHUD(); refreshQuest();
  scheduleBoat();
  toast('Tu aldea arranca con una casita y 3 aldeanos. Ellos construyen todo: dales trabajo.');
  window.__raid=()=>startRaid();
}

function fitCamera(){ if(!scene) return;
  const cam=scene.cameras.main, vw=scene.scale.width, vh=scene.scale.height;
  const iw=(GW+3)*T, ih=(GH+3)*T;
  baseZoom=Math.min(vw/iw,vh/ih);
  if(manualView) return;
  cam.setZoom(baseZoom); cam.centerOn(WORLD_W/2,WORLD_H/2);
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

/* ===== pathfinding chico (los aldeanos no pisan agua ni acantilados) ===== */
const walkable=(x,y)=>isLand(x,y)&&!S.cliff[y][x];
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

/* ===== ALDEANOS (Age of Empires style) ===== */
function spawnAldeano(x,y,inicial){
  if(!inicial&&popTotal()>=POPCAP()){ toast('🏠 Cupo lleno ('+POPCAP()+'). Construí Casas o despedí unidades.'); sfx('creak',0.4); return null; }
  const s=scene.add.sprite(x,y,'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play('pawn_blue-i');
  const a={id:'a'+S.nextId++, spr:s, estado:'libre', bId:null, path:null, tx:x, ty:y, wT:rint(2,6)};
  s.setInteractive({useHandCursor:true});
  s.on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ selectUnidad(a,'aldeano'); ev.stopPropagation(); } });
  S.ald.push(a); refreshHUD(); return a;
}
const aldLibre=()=>S.ald.find(a=>a.estado==='libre'||a.estado==='paseo');
function mandarAldeano(a,b,rol){                    // rol: 'construir' | 'trabajar'
  const cur=tileOfPx(a.spr.x,a.spr.y);
  const dest=puntoJuntoA(b);
  const path=findPath(cur.x,cur.y,dest.x,dest.y);
  a.estado='yendo'; a.bId=b.id; a.rol=rol;
  a.path=path&&path.length?path:[{x:(BX+dest.x)*T+T/2,y:(BY+dest.y)*T+T/2}];
  const p0=a.path.shift(); a.tx=p0.x; a.ty=p0.y;
  a.spr.play('pawn_blue-r',true);
}
function puntoJuntoA(b){                            // tile caminable pegado al edificio
  const c=CAT[b.tipo];
  for(let oy=c.fh;oy>=-1;oy--)for(let ox=-1;ox<=c.fw;ox++){
    const x=b.tx+ox, y=b.ty+oy;
    if(walkable(x,y)&&S.grid[y][x]===null) return {x,y};
  }
  return tileOfPx(b.x,b.y+T);
}
function llegoAldeano(a){
  const b=byId(a.bId);
  if(!b){ liberar(a); return; }
  if(a.rol==='construir'){
    a.estado='obrero';
    b.estado='obra';
    a.dustEv=scene.time.addEvent({delay:900,loop:true,callback:()=>dustAt(b.x,b.y-10,1)});
    a.spr.play('pawn_blue-i',true);
  } else {
    a.estado='peon';
    const useTool=b.tipo==='mina'||b.tipo==='lenador';
    const key=b.tipo==='mina'?'wpick':'waxe';
    if(useTool){ a.spr.setTexture(key+'_blue_r',0); a.spr.play(key+'-r'); } else a.spr.play('pawn_blue-r',true);
    const x0=b.x-CAT[b.tipo].fw*T*0.4, x1=b.x+CAT[b.tipo].fw*T*0.4;
    a.spr.x=x0; a.spr.y=b.y+10; a.spr.setDepth(a.spr.y);
    a.tween=scene.tweens.add({targets:a.spr,x:x1,duration:2600,yoyo:true,repeat:-1,
      onYoyo:()=>a.spr.setFlipX(true), onRepeat:()=>a.spr.setFlipX(false)});
  }
}
function liberar(a){
  if(a.dustEv){a.dustEv.remove();a.dustEv=null;}
  if(a.tween){a.tween.remove();a.tween=null;}
  a.estado='libre'; a.bId=null; a.rol=null; a.path=null;
  a.spr.setTexture('pawn_blue',0); a.spr.play('pawn_blue-i',true);
  refreshHUD();
}
function pedirTrabajador(b){                        // productor terminado busca aldeano
  const a=aldLibre();
  if(a){ mandarAldeano(a,b,'trabajar'); return true; }
  toast('⚠️ '+CAT[b.tipo].nom+' sin aldeano: construí una Casa para sumar manos.');
  return false;
}

/* ===== obstáculos y eye-candy ===== */
function puedeHuella(tx,ty,fw,fh){
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
    if(!isIn(tx+x,ty+y)||!isLand(tx+x,ty+y)||S.cliff[ty+y][tx+x]) return false;
    if(S.grid[ty+y][tx+x]!==null) return false;
    if(S.elev[ty+y][tx+x]!==S.elev[ty][tx]) return false;       // no a caballo del desnivel
  }
  return true;
}
function scatterObstacles(n){
  let puestos=0, tries=0;
  while(puestos<n&&tries++<200){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(!puedeHuella(tx,ty,1,1)) continue;
    const o=pick(OBST), id='o'+S.nextId++;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T;
    let spr;
    if(o.tipo==='arbol') spr=scene.add.sprite(x,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.55);
    else if(o.tipo==='arbusto'){ const k='bush'+rint(1,4); spr=scene.add.sprite(x,y-4,k).play({key:k+'-a',startFrame:rint(0,7)}).setOrigin(0.5,1).setScale(0.6); }
    else if(o.tipo==='roca') spr=scene.add.image(x,y-4,'rock'+rint(1,4)).setOrigin(0.5,1).setScale(0.9);
    else spr=scene.add.image(x,y-4,'deco'+rint(1,3)).setOrigin(0.5,1).setScale(0.9);
    spr.setDepth(y).setInteractive({useHandCursor:true});
    const ob={id,tipo:o.tipo,costo:o.costo,tx,ty,spr};
    spr.on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ selectObs(ob); ev.stopPropagation(); } });
    S.grid[ty][tx]=id; S.obst.push(ob); puestos++;
  }
}
function scatterEyeCandy(n){                         // decos chicos que NO bloquean (flores, hongos, piedritas)
  let puestos=0, tries=0;
  while(puestos<n&&tries++<160){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(!isLand(tx,ty)||S.cliff[ty][tx]||S.grid[ty][tx]!==null) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T-6;
    scene.add.image(x+rint(-14,14),y,'deco'+rint(4,15)).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.6,0.9)).setDepth(y).setAlpha(0.95);
    puestos++;
  }
}
function selectObs(ob){
  S.selObs=ob; S.selId=null;
  $('selNom').textContent={arbusto:'Matorral',roca:'Roca',arbol:'Árbol viejo',hongo:'Hongos'}[ob.tipo];
  $('selLvl').textContent='Ocupa lugar en tu isla';
  ['btnMover','btnMejorar','btnAcelerar','btnSkin','btnReparar','btnCosechar','btnRestos','btnCrear','btnConstruirCon','btnDespedir'].forEach(i=>$(i).style.display='none');
  $('btnLimpiar').style.display='block';
  $('btnLimpiar').textContent='LIMPIAR ('+ob.costo+' madera)';
  $('btnLimpiar').disabled=S.madera<ob.costo;
  $('selpanel').classList.add('on');
}
$('btnLimpiar').onclick=()=>{
  const ob=S.selObs; if(!ob||S.madera<ob.costo) return;
  S.madera-=ob.costo; S.grid[ob.ty][ob.tx]=null; ob.spr.destroy();
  S.obst=S.obst.filter(x=>x!==ob); S.stats.limpiados++;
  dustAt((BX+ob.tx)*T+T/2,(BY+ob.ty+1)*T,3);
  const botin=pick([{oro:rint(10,40)},{madera:rint(10,30)},{ambar:5},{}]);
  for(const k in botin){ if(k==='ambar')S.ambar+=botin[k]; else S[k]+=botin[k];
    flyText((BX+ob.tx)*T+T/2,(BY+ob.ty)*T,'+'+botin[k]+' '+(k==='ambar'?'◆':k)); }
  sfx('door',0.5); hidePanel(); refreshHUD();
};

/* ===== edificios ===== */
function setGrid(b,val){ const c=CAT[b.tipo];
  for(let y=0;y<c.fh;y++)for(let x=0;x<c.fw;x++) S.grid[b.ty+y][b.tx+x]=val; }
function texOf(b){
  if(b.tipo==='castle') return 'castle_'+b.skin;
  if(b.tipo==='house')  return 'house'+b.var+'_'+b.skin;
  if(b.tipo==='mina')   return 'goldmine';
  if(CAT[b.tipo].skins) return {torre:'tower',cuartel:'barracks',arqueria:'archery',monasterio:'monastery'}[b.tipo]+'_'+b.skin;
  return null;
}
function makeSprites(b){
  const c=CAT[b.tipo];
  const x=(BX+b.tx)*T + c.fw*T/2, y=(BY+b.ty+c.fh)*T;
  const sprs=[];
  if(b.tipo==='lenador'){
    sprs.push(scene.add.sprite(x-T*0.45,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.62).setDepth(y));
    sprs.push(scene.add.sprite(x+T*0.45,y-T*0.4,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.55).setDepth(y-T*0.4));
  } else if(b.tipo==='granja'){
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
  sprs[0].on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ clickBuilding(b); ev.stopPropagation(); } });
  return {sprs,x,y};
}
function clickBuilding(b){
  if(b.estado==='ok'&&CAT[b.tipo].prod&&b.buf>=10){ cosechar(b); return; }
  select(b.id);
}
function cosechar(b){
  const res=CAT[b.tipo].prod, n=Math.floor(b.buf);
  S[res]=Math.min(CAP,S[res]+n); b.buf-=n; S.stats.cosechas++;
  flyText(b.x,b.y-CAT[b.tipo].fh*T,'+'+n+' '+res);
  if(b.pileSpr){b.pileSpr.destroy();b.pileSpr=null;}
  sfx('coins',0.55); refreshHUD();
}
function agotar(b){
  b.estado='agotado';
  const w=S.ald.find(a=>a.bId===b.id); if(w) liberar(w);
  if(b.tipo==='mina'){ b.sprs[0].setTexture('goldmine_destroyed'); }
  else if(b.tipo==='lenador'){ b.sprs.forEach(s=>{ if(s.anims){s.anims.stop();} if(s.texture&&s.texture.key==='tree'){ s.setTexture('tree',9); } }); }
  else if(b.tipo==='granja'){ const ov=b.sprs.find(s=>s.texture&&s.texture.key==='sheep');
    if(ov) scene.tweens.add({targets:ov,alpha:0,x:ov.x+60,duration:1600,onComplete:()=>ov.setVisible(false)});
    const ce=b.sprs.find(s=>s.texture&&s.texture.key==='pig_idle');
    if(ce) scene.tweens.add({targets:ce,alpha:0,x:ce.x-60,duration:1600,onComplete:()=>ce.setVisible(false)}); }
  toast('⛏️ '+CAT[b.tipo].nom+' AGOTADO. Cosechá lo que quede y limpiá los restos para recuperar el lugar.');
  sfx('creak',0.5);
  if(S.selId===b.id) select(b.id);
}
function limpiarRestos(b){
  if(S.madera<40){ sfx('creak',0.4); toast('Limpiar los restos cuesta 40 madera.'); return; }
  S.madera-=40;
  setGrid(b,null); destroySprites(b);
  S.buildings=S.buildings.filter(x=>x!==b);
  dustAt(b.x,b.y-10,4); sfx('door',0.5); hidePanel(); refreshHUD(); buildBar();
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
  if(b.estado==='esperando'){
    b.sprs.forEach(s=>s.setAlpha(0.4));
    b.barG=scene.add.graphics().setDepth(96000);
    const a=(S.aldElegido&&(S.aldElegido.estado==='libre'||S.aldElegido.estado==='paseo'))?S.aldElegido:aldLibre();
    S.aldElegido=null;
    if(a) mandarAldeano(a,b,'construir');
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
  if(tipoU==='aldeano'){ const a=spawnAldeano(b.x+rint(-30,30),b.y+rint(10,26)); if(a){S.stats.aldCreados++; dustAt(a.spr.x,a.spr.y,2); sfx('bong',0.5); toast('👤 Aldeano nuevo en el pueblo.');} refreshHUD(); return; }
  const tex=tipoU==='guerrero'?'warrior_blue':'archer_blue_i';
  const s=scene.add.sprite(b.x+rint(-34,34),b.y+rint(10,28),tex).setOrigin(0.5,tipoU==='guerrero'?0.95:0.72).setScale(0.72).setDepth(b.y);
  s.play(tipoU==='guerrero'?'war-i':'arq-i');
  const un={id:'u'+S.nextId++, tipo:tipoU, spr:s, home:{x:s.x,y:s.y}, target:null, cd:0, dead:false, wT:rint(3,8)};
  s.setInteractive({useHandCursor:true});
  s.on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ selectUnidad(un,tipoU); ev.stopPropagation(); } });
  S.units.push(un); S.stats.entrenados++;
  dustAt(s.x,s.y,2); sfx('clash',0.4); toast('⚔️ '+u.nom+' entrenado y en guardia.');
  refreshHUD();
}
let selU=null;
function selectUnidad(u,tipo){
  selU={u,tipo}; S.selId=null; S.selObs=null;
  $('selNom').textContent=UNIDADES[tipo]?UNIDADES[tipo].nom:'Unidad';
  $('selLvl').textContent=tipo==='aldeano'?({libre:'Libre',paseo:'Paseando',yendo:'Yendo al trabajo',obrero:'Construyendo',peon:'Trabajando'})[u.estado]||u.estado:'En guardia';
  ['btnMover','btnMejorar','btnAcelerar','btnSkin','btnReparar','btnCosechar','btnLimpiar','btnRestos','btnCrear'].forEach(i=>$(i).style.display='none');
  $('btnConstruirCon').style.display=(tipo==='aldeano'&&(u.estado==='libre'||u.estado==='paseo'))?'block':'none';
  $('btnDespedir').style.display='block';
  $('selpanel').classList.add('on');
}
$('btnConstruirCon').onclick=()=>{
  if(!selU||selU.tipo!=='aldeano') return;
  S.aldElegido=selU.u; hidePanel();
  toast('👉 Elegí un edificio de la barra: lo construye ESTE aldeano.');
};
$('btnDespedir').onclick=()=>{
  if(!selU) return;
  const {u,tipo}=selU;
  if(tipo==='aldeano'){
    if(u.dustEv)u.dustEv.remove(); if(u.tween)u.tween.remove();
    S.ald=S.ald.filter(x=>x!==u);
  } else { u.dead=true; S.units=S.units.filter(x=>x!==u); }
  scene.tweens.add({targets:u.spr,alpha:0,y:'-=14',duration:600,onComplete:()=>u.spr.destroy()});
  sfx('door',0.4); toast('Unidad despedida: cupo liberado.');
  hidePanel(); refreshHUD();
};

/* ===== colocación ===== */
function startPlace(tipo,moverId){
  S.colocando={tipo,moverId:moverId||null};
  hidePanel();
  if(ghostSpr){ghostSpr.destroy();ghostSpr=null;}
  if(tipo!=='lenador'&&tipo!=='granja'){
    const tex=moverId?texOf(byId(moverId)):CARD_IMG[tipo];
    if(tex&&tex!=='tree_anim'&&tex!=='sheep') ghostSpr=scene.add.image(0,0,tex).setOrigin(0.5,1).setAlpha(0.55).setDepth(94000).setVisible(false);
  }
  hint((moverId?'Reubicando ':'Colocando ')+CAT[tipo].nom+' — verde libre · rojo ocupado · ESC cancela');
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
    if(!isIn(gx,gy)||!isLand(gx,gy)||S.cliff[gy][gx]) return false;
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
  cancelPlace(); buildBar(); refreshHUD();
}
function cancelPlace(){ S.colocando=null; ghostG.clear(); if(ghostSpr){ghostSpr.destroy();ghostSpr=null;} hint(''); buildBar(); }

/* ===== economía ===== */
function pagar(costo){
  for(const k in costo){ const cur=k==='ambar'?S.ambar:S[k]; if(cur<costo[k]) return false; }
  for(const k in costo){ if(k==='ambar') S.ambar-=costo[k]; else S[k]-=costo[k]; }
  return true;
}
const costoTxt=c=>Object.entries(c).map(([k,v])=>`${v} ${k==='ambar'?'◆':k}`).join(' · ')||'gratis';

/* ===== selección ===== */
const byId=id=>S.buildings.find(b=>b.id===id);
function select(id){
  S.selId=id; S.selObs=null; const b=byId(id), c=CAT[b.tipo];
  $('selNom').textContent=c.nom;
  $('selLvl').textContent='Nivel '+b.nivel+(b.estado==='esperando'?' · ESPERANDO ALDEANO':'')+(b.estado==='obra'?' · EN OBRA':'')+(b.danado?' · 🔥 DAÑADO':'')+(b.skin==='red'?' · roja':'');
  ['btnMover','btnMejorar','btnAcelerar','btnSkin','btnReparar','btnCosechar','btnLimpiar','btnRestos','btnCrear','btnConstruirCon','btnDespedir'].forEach(i=>$(i).style.display='none');
  if(b.estado==='agotado'){
    $('selLvl').textContent='AGOTADO — sin '+(CAT[b.tipo].prod||'recurso');
    if(b.buf>=1){ $('btnCosechar').style.display='block';
      $('btnCosechar').textContent='COSECHAR RESTOS ('+Math.floor(b.buf)+')'; $('btnCosechar').disabled=false; }
    $('btnRestos').style.display='block'; $('btnRestos').disabled=S.madera<40;
    $('selpanel').classList.add('on'); return;
  }
  const uCrear=Object.keys(UNIDADES).find(k=>UNIDADES[k].de.includes(b.tipo));
  if(uCrear&&b.estado==='ok'&&!b.danado){
    $('btnCrear').style.display='block';
    $('btnCrear').textContent='CREAR '+UNIDADES[uCrear].nom.toUpperCase()+' ('+costoTxt(UNIDADES[uCrear].costo)+')';
    $('btnCrear').disabled=popTotal()>=POPCAP();
    $('btnCrear').onclick=()=>entrenar(uCrear,b);
  }
  $('btnMover').style.display='block'; $('btnMover').disabled=b.estado!=='ok';
  if(b.danado){ $('btnReparar').style.display='block'; $('btnReparar').textContent='REPARAR (60 oro)'; $('btnReparar').disabled=S.oro<60; }
  else {
    const max=b.tipo==='castle'?MAXLVL.castle:MAXLVL.def;
    $('btnMejorar').style.display='block';
    $('btnMejorar').disabled=!(b.estado==='ok'&&b.nivel<max&&c.up&&c.up[b.nivel-1]);
    $('btnMejorar').textContent=(b.nivel<max&&c.up&&c.up[b.nivel-1])?'MEJORAR ('+costoTxt(c.up[b.nivel-1].costo)+')':'NIVEL MÁX';
    if(c.prod){ $('btnCosechar').style.display='block';
      $('btnCosechar').textContent='COSECHAR ('+Math.floor(b.buf)+' '+c.prod+')'; $('btnCosechar').disabled=b.buf<1; }
  }
  if(b.estado==='obra'||b.estado==='esperando'){ $('btnAcelerar').style.display='block';
    $('btnAcelerar').disabled=!(b.estado==='obra'&&S.aceleradas<S.ACEL_TOPE&&S.ambar>=10);
    $('btnAcelerar').textContent='◆ ACELERAR ('+(S.ACEL_TOPE-S.aceleradas)+' rest. · 10)'; }
  if(c.skins){ $('btnSkin').style.display='block';
    $('btnSkin').disabled=!(b.skin==='blue'&&S.ambar>=25);
    $('btnSkin').textContent=b.skin==='red'?'SKIN ROJA ✓':'◆ SKIN ROJA (25)'; }
  $('selpanel').classList.add('on');
}
function hidePanel(){ $('selpanel').classList.remove('on'); S.selId=null; S.selObs=null; }
$('btnCerrar').onclick=hidePanel;
$('btnRestos').onclick=()=>{ const b=byId(S.selId); if(b&&b.estado==='agotado') limpiarRestos(b); };
$('btnMover').onclick=()=>{ const b=byId(S.selId); if(b) startPlace(b.tipo,b.id); };
$('btnCosechar').onclick=()=>{ const b=byId(S.selId); if(b){ cosechar(b); select(b.id);} };
$('btnReparar').onclick=()=>{
  const b=byId(S.selId); if(!b||!b.danado||S.oro<60) return;
  S.oro-=60; b.danado=false; b.hp=100; refreshBuilding(b);
  sfx('bong',0.5); toast(CAT[b.tipo].nom+' reparado.'); refreshHUD(); select(b.id);
};
$('btnMejorar').onclick=()=>{
  const b=byId(S.selId); if(!b) return; const up=CAT[b.tipo].up[b.nivel-1];
  if(!pagar(up.costo)){ sfx('creak',0.4); toast('No te alcanza para la mejora.'); return; }
  b.estado='esperando'; b.obraT=0; b.obraDur=up.dur; b.mejorando=true; refreshBuilding(b);
  const a=aldLibre();
  if(a) mandarAldeano(a,b,'construir'); else toast('⚠️ La mejora espera un aldeano libre.');
  sfx('door',0.5); select(b.id); refreshHUD();
};
$('btnAcelerar').onclick=()=>{
  const b=byId(S.selId); if(!b||b.estado!=='obra'||S.aceleradas>=S.ACEL_TOPE||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; S.aceleradas++; b.obraT=b.obraDur;
  sfx('coins',0.6); toast('Obra acelerada (◆ simulado).'); refreshHUD(); select(b.id);
};
$('btnSkin').onclick=()=>{
  const b=byId(S.selId); if(!b||!CAT[b.tipo].skins||b.skin==='red'||S.ambar<25){ sfx('creak',0.4); return; }
  S.ambar-=25; b.skin='red'; S.stats.skins++; refreshBuilding(b);
  sfx('coins',0.6); toast('Skin roja — cosmético puro.'); refreshHUD(); select(b.id);
};
$('btnTiempo').onclick=()=>{ S.speed=S.speed===1?60:1; $('btnTiempo').textContent='⏱ ×'+S.speed; };
$('btnCaravana').onclick=()=>{
  if(S.ambar<8){ sfx('creak',0.4); toast('La caravana cuesta 8 ◆.'); return; }
  S.ambar-=8;
  const menor=['oro','madera','comida'].sort((a,b2)=>S[a]-S[b2])[0];
  S[menor]=Math.min(CAP,S[menor]+250);
  sfx('coins',0.6); toast('Caravana: +250 de '+menor+'.'); refreshHUD();
};
$('btnMercen').onclick=()=>{
  if(!S.raid.on||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10;
  for(let i=0;i<3;i++) spawnDefensor(islaCX+rint(-60,60),islaCY+rint(-40,40));
  sfx('clash',0.5); toast('¡3 mercenarios al campo!'); refreshHUD();
};

/* ===== misiones ===== */
function refreshQuest(){
  const q=QUESTS[S.qIx];
  if(!q){ $('qTxt').textContent='¡Completaste todas las misiones! 👑'; $('btnQuest').style.display='none'; return; }
  $('qTxt').textContent=(S.qIx+1)+'/'+QUESTS.length+' · '+q.txt;
  const done=q.check();
  $('btnQuest').style.display='block';
  $('btnQuest').disabled=!done;
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
    toast('⚓ Un bote misterioso llegó — tocalo antes de que se vaya.');
    sfx('bell',0.4);
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
  s.play('war-r');
  S.raid.war.push({spr:s,target:null,dead:false});
}
function endRaid(win){
  S.raid.on=false;
  $('raidbanner').classList.remove('on'); $('btnMercen').style.display='none';
  S.raid.gob.forEach(g=>{ if(!g.dead){ scene.tweens.add({targets:g.spr,alpha:0,x:g.spr.x+rint(-120,120),duration:900,onComplete:()=>g.spr.destroy()}); } });
  S.raid.war.forEach(w=>{ if(!w.dead){ scene.tweens.add({targets:w.spr,alpha:0,duration:1200,onComplete:()=>w.spr.destroy()}); } });
  S.units.forEach(u=>{ if(!u.dead){ u.spr.play(u.tipo==='guerrero'?'war-i':'arq-i',true); u.target=null; } });
  S.raid.cool=rint(170,260);
  if(win){ S.stats.raids++;
    const oro=rint(50,120), amb=rint(10,25);
    S.oro=Math.min(CAP,S.oro+oro); S.ambar+=amb;
    sfx('bong',0.7); toast('🛡️ ¡Asalto repelido! Botín: +'+oro+' oro · +'+amb+' ◆');
  } else { sfx('creak',0.5); toast('Los goblins se retiraron dejando destrozos. Repará y reforzá.'); }
  refreshHUD(); refreshQuest();
}
function killGoblin(g){
  if(g.dead) return; g.dead=true;
  burstAt(g.spr.x,g.spr.y-14,0x7fbf5a); dustAt(g.spr.x,g.spr.y,2);
  g.spr.destroy();
  if(S.raid.gob.every(x=>x.dead)) endRaid(true);
}
function burstAt(x,y,color){
  for(let i=0;i<10;i++){ const p=scene.add.image(x,y,'dot').setTint(color).setDepth(99999).setScale(Phaser.Math.FloatBetween(0.5,1.2));
    scene.tweens.add({targets:p,x:x+rint(-26,26),y:y-rint(4,30),alpha:0,scale:0.1,duration:rint(400,900),ease:'Quad.easeOut',onComplete:()=>p.destroy()}); }
}
function raidTick(dtReal){
  const R=S.raid;
  R.t+=dtReal;
  if(R.t>55){ endRaid(R.gob.length>0&&R.gob.every(g=>g.dead)); return; }
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
      g.spr.x+=Math.cos(ang)*sp; g.spr.y+=Math.sin(ang)*sp;
      g.spr.setFlipX(Math.cos(ang)<0); g.spr.setDepth(g.spr.y);
    } else {
      g.atkT+=dtReal;
      if(g.atkT>1.1){ g.atkT=0; g.target.hp-=12;
        g.spr.play(g.tipo==='torch'?'gt-i':'sp-i',true);
        scene.tweens.add({targets:g.target.sprs[0],x:'+=3',duration:50,yoyo:true,repeat:1});
        burstAt(g.target.x,g.target.y-24,0xe5533a);
        if(g.target.hp<=0){ g.target.danado=true;
          const w=S.ald.find(a=>a.bId===g.target.id&&a.estado==='peon'); if(w) liberar(w);
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
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-16,duration:220,ease:'Linear',
          onComplete:()=>{p.destroy(); killGoblin(g);}});
        sfx('clash',0.25);
      }
    }
  }
  for(const u of S.units.filter(u2=>!u2.dead)){
    const alcance=u.tipo==='arquero'?T*4.5:26;
    if(!u.target||u.target.dead) u.target=vivos.find(g=>!g.dead)||null;
    if(!u.target) continue;
    const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,u.target.spr.x,u.target.spr.y);
    if(d>alcance){
      const sp=(u.tipo==='arquero'?50:58)*dtReal, ang=Math.atan2(u.target.spr.y-u.spr.y,u.target.spr.x-u.spr.x);
      u.spr.x+=Math.cos(ang)*sp; u.spr.y+=Math.sin(ang)*sp;
      u.spr.setFlipX(Math.cos(ang)<0); u.spr.setDepth(u.spr.y);
    } else if(u.tipo==='arquero'){
      u.cd-=dtReal;
      if(u.cd<=0){ u.cd=1.8;
        const g=u.target, p=scene.add.image(u.spr.x,u.spr.y-20,'dot').setTint(0xd9c9a0).setDepth(99998);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-14,duration:200,ease:'Linear',onComplete:()=>{p.destroy(); killGoblin(g);}});
        sfx('clash',0.2); u.target=null; }
    } else {
      sfx('clash',0.3); burstAt(u.spr.x,u.spr.y-16,0xffffff);
      killGoblin(u.target); u.target=null;
      if(Math.random()<0.2){ u.dead=true; S.units=S.units.filter(x=>x!==u);
        const d2=scene.add.sprite(u.spr.x,u.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(u.spr.y);
        d2.once('animationcomplete',()=>scene.tweens.add({targets:d2,alpha:0,duration:1500,onComplete:()=>d2.destroy()}));
        u.spr.destroy(); refreshHUD(); }
    }
  }
  for(const w of R.war.filter(w2=>!w2.dead)){
    if(!w.target||w.target.dead) w.target=vivos.find(g=>!g.dead)||null;
    if(!w.target) continue;
    const d=Phaser.Math.Distance.Between(w.spr.x,w.spr.y,w.target.spr.x,w.target.spr.y);
    if(d>26){
      const sp=58*dtReal, ang=Math.atan2(w.target.spr.y-w.spr.y,w.target.spr.x-w.spr.x);
      w.spr.x+=Math.cos(ang)*sp; w.spr.y+=Math.sin(ang)*sp;
      w.spr.setFlipX(Math.cos(ang)<0); w.spr.setDepth(w.spr.y);
    } else {
      sfx('clash',0.3); burstAt(w.spr.x,w.spr.y-16,0xffffff);
      killGoblin(w.target); w.target=null;
      if(Math.random()<0.25){ w.dead=true;
        const d2=scene.add.sprite(w.spr.x,w.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(w.spr.y);
        d2.once('animationcomplete',()=>scene.tweens.add({targets:d2,alpha:0,duration:1500,onComplete:()=>d2.destroy()}));
        w.spr.destroy(); }
    }
  }
}

/* ===== barra de construcción ===== */
function gateMsg(c,tipo){
  if(S.thNivel<c.req) return c.req===1?'Ayuntamiento':'Ayunt. N'+c.req;
  if(c.reqB&&!S.buildings.some(b=>b.tipo===c.reqB&&b.estado==='ok')) return 'requiere '+CAT[c.reqB].nom;
  if(c.unico&&S.buildings.some(b=>b.tipo===tipo)) return 'único';
  return null;
}
function buildBar(){
  const bar=$('buildbar'); bar.innerHTML='';
  for(const tipo in CAT){
    const c=CAT[tipo];
    const lock=gateMsg(c,tipo);
    const el=document.createElement('div');
    el.className='card'+(lock?' lock':'')+(S.colocando&&S.colocando.tipo===tipo?' sel':'');
    const img=CARD_IMG[tipo], isSheet=img==='tree_anim'||img==='sheep';
    el.innerHTML=`${isSheet
      ?`<div style="width:64px;height:52px;margin:2px auto;background:url('assets/img/${img==='sheep'?'sheep':'ts/'+img}.png') no-repeat 0 0;background-size:${img==='sheep'?'200%':'400%'};image-rendering:pixelated"></div>`
      :`<img src="assets/img/ts/${img}.png" alt="">`}
      <div class="nom">${c.nom}${c.premium?' ◆':''}</div>
      <div class="costo"><b>${costoTxt(c.costo)}</b><br>${c.dur>=3600?(c.dur/3600)+' h':(c.dur/60)+' min'}</div>
      ${lock?`<div class="req">🔒 ${lock}</div>`:''}`;
    if(!lock) el.onclick=()=>{ if(S.colocando&&S.colocando.tipo===tipo){cancelPlace();return;} startPlace(tipo,null); buildBar(); };
    bar.appendChild(el);
  }
}

/* ===== HUD ===== */
function refreshHUD(){
  $('vOro').textContent=Math.floor(S.oro); $('vMad').textContent=Math.floor(S.madera); $('vCom').textContent=Math.floor(S.comida);
  $('vAmbar').textContent=S.ambar;
  $('vAld').textContent=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo').length+' libres · '+popTotal()+'/'+POPCAP();
  $('cOro').textContent='/'+CAP; $('cMad').textContent='/'+CAP; $('cCom').textContent='/'+CAP;
  $('rOro').classList.toggle('lleno',S.oro>=CAP); $('rMad').classList.toggle('lleno',S.madera>=CAP); $('rCom').classList.toggle('lleno',S.comida>=CAP);
}
let toastT=null;
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3600); }
function hint(msg){ const h=$('hint'); h.textContent=msg; h.classList.toggle('on',!!msg); }

/* ===== loop ===== */
let hudAcc=0, qAcc=0;
function update(time,delta){
  const dt=delta/1000*S.speed, dtReal=delta/1000;

  // aldeanos: movimiento por ruta + deambular cuando están libres
  for(const a of S.ald){
    if(a.estado==='yendo'){
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<5){
        if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else llegoAldeano(a);
      } else {
        const sp=70*dtReal;
        a.spr.x+=dx/d*sp; a.spr.y+=dy/d*sp;
        a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y);
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
      if(d<5){
        if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { a.estado='libre'; a.spr.play('pawn_blue-i',true); }
      } else { const sp=46*dtReal; a.spr.x+=dx/d*sp; a.spr.y+=dy/d*sp; a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    }
  }

  for(const b of S.buildings){
    const c=CAT[b.tipo];
    if(b.estado==='esperando'){
      if(!S.ald.some(a=>a.bId===b.id)){ const a=aldLibre(); if(a) mandarAldeano(a,b,'construir'); }
      if(b.barG){ b.barG.clear();
        const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0x6a6154,1).fillRect(bx,by,bw*0.04,6); }
    }
    else if(b.estado==='obra'){
      b.obraT+=dt;
      const p=Math.min(1,b.obraT/b.obraDur);
      if(b.barG){ b.barG.clear();
        const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0xc9a227,1).fillRect(bx,by,bw*p,6); }
      if(b.obraT>=b.obraDur){
        b.estado='ok'; b.hp=100;
        const obrero=S.ald.find(a=>a.bId===b.id&&(a.estado==='obrero'||a.estado==='yendo'));
        if(obrero) liberar(obrero);
        if(b.mejorando){ b.nivel++; b.mejorando=false; }
        if(b.tipo==='castle'){ S.thNivel=Math.max(S.thNivel,b.nivel); buildBar();
          toast(b.nivel===1?'🏰 ¡El Ayuntamiento está en pie! Nuevos edificios disponibles.':'¡Ayuntamiento nivel '+b.nivel+'!'); }
        if(b.tipo==='house'){ toast('🏠 Casa lista: +2 de cupo. Seleccionala para CREAR un aldeano.'); }
        refreshBuilding(b); dustAt(b.x,b.y-20,4); sfx('bong',0.6);
        if(c.prod) pedirTrabajador(b);
        if(S.selId===b.id) select(b.id);
      }
    } else if(b.estado==='ok'&&c.prod&&!b.danado){
      const conPeon=S.ald.some(a=>a.bId===b.id&&a.estado==='peon');
      if(conPeon){
        const rate=RATE*(1+0.5*(b.nivel-1));
        const gan=Math.min(rate*dt, b.reserva, BUFFER(b)-b.buf);
        b.buf+=gan; b.reserva-=gan;
        if(b.reserva<=0) agotar(b);
      } else if(!S.ald.some(a=>a.bId===b.id)) { const a=aldLibre(); if(a) mandarAldeano(a,b,'trabajar'); }
      if(b.buf>=25&&!b.pileSpr){
        b.pileSpr=scene.add.image(b.x,b.y-c.fh*T-6,RES_IMG[c.prod]).setScale(0.42).setDepth(97000);
        scene.tweens.add({targets:b.pileSpr,y:'-=7',duration:520,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        b.pileSpr.setInteractive({useHandCursor:true});
        b.pileSpr.on('pointerdown',(p,lx,ly,ev)=>{ cosechar(b); ev.stopPropagation(); });
      }
      if(b.buf<25&&b.pileSpr){ b.pileSpr.destroy(); b.pileSpr=null; }
    }
  }

  if(S.raid.on) raidTick(dtReal);
  else { S.raid.cool-=dtReal; if(S.raid.cool<=0&&S.buildings.some(b=>b.estado==='ok')) startRaid(); }

  hudAcc+=delta; if(hudAcc>250){ hudAcc=0; refreshHUD(); }
  qAcc+=delta;   if(qAcc>600){ qAcc=0; refreshQuest(); }
}
