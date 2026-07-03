/* ÁMBAR · Mi Base v2 — PROTOTIPO (cliente puro, in-memory)
   Loop Clash + cosecha por click + misiones + asaltos goblin + coin con sentido. */

const $=id=>document.getElementById(id);
const T=64, GW=14, GH=14, BX=3, BY=3;
const WT=GW+BX*2, HT=GH+BY*2, WORLD_W=WT*T, WORLD_H=HT*T;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== catálogo (huellas del catálogo maestro · costos B.4) ===== */
const CAP=2000;
const MAXLVL={castle:3, def:2};
const CAT={
  castle:    {nom:'Ayuntamiento', fw:5,fh:2, costo:{},                 dur:0,    req:1, unico:true, skins:true,
              up:[{costo:{oro:500,madera:500},dur:14400},{costo:{oro:1200,madera:1200},dur:28800}]},
  house:     {nom:'Casa',         fw:2,fh:2, costo:{madera:100},       dur:300,  req:1, skins:true, up:[{costo:{madera:200},dur:1800}]},
  mina:      {nom:'Mina',         fw:3,fh:1, costo:{madera:150},       dur:600,  req:1, prod:'oro',    up:[{costo:{oro:300},dur:3600}]},
  lenador:   {nom:'Leñador',      fw:2,fh:2, costo:{oro:100},          dur:600,  req:1, prod:'madera', up:[{costo:{oro:300},dur:3600}]},
  granja:    {nom:'Granja',       fw:3,fh:2, costo:{madera:120},       dur:600,  req:1, prod:'comida', up:[{costo:{oro:250},dur:3600}]},
  torre:     {nom:'Torre',        fw:2,fh:2, costo:{oro:200,madera:200},dur:1800,req:2, skins:true, up:[{costo:{oro:500},dur:7200}]},
  cuartel:   {nom:'Cuartel',      fw:3,fh:2, costo:{madera:300},       dur:3600, req:2, skins:true, up:[{costo:{oro:600},dur:10800}]},
  arqueria:  {nom:'Arquería',     fw:3,fh:2, costo:{oro:300},          dur:3600, req:2, reqB:'cuartel', skins:true, up:[{costo:{madera:600},dur:10800}]},
  monasterio:{nom:'Monasterio',   fw:3,fh:2, costo:{ambar:40},         dur:3600, req:3, skins:true, premium:true, up:[{costo:{ambar:60},dur:10800}]},
};
const RATE=0.5;                              // prod/seg nivel 1 (proto rápido); +50% por nivel
const BUFFER=b=>120*b.nivel;                 // lo que junta el edificio antes de frenar
const CARD_IMG={house:'house1_blue',mina:'goldmine',lenador:'tree_anim',granja:'sheep',
  torre:'tower_blue',cuartel:'barracks_blue',arqueria:'archery_blue',monasterio:'monastery_blue'};
const RES_IMG={oro:'res_gold',madera:'res_wood',comida:'res_meat'};
const OBST=[ {tipo:'arbusto',costo:15}, {tipo:'roca',costo:25}, {tipo:'arbol',costo:20}, {tipo:'hongo',costo:10} ];

/* ===== misiones (secuenciales, con RECLAMAR) ===== */
const QUESTS=[
  {txt:'Construí una Mina',                 check:()=>S.buildings.some(b=>b.tipo==='mina'&&b.estado==='ok'), rew:{madera:80,ambar:10}},
  {txt:'Cosechá tu primera producción',     check:()=>S.stats.cosechas>=1,  rew:{ambar:15}},
  {txt:'Limpiá 3 matorrales de la parcela', check:()=>S.stats.limpiados>=3, rew:{oro:60,ambar:10}},
  {txt:'Tené Leñador y Granja produciendo', check:()=>['lenador','granja'].every(t=>S.buildings.some(b=>b.tipo===t&&b.estado==='ok')), rew:{oro:120}},
  {txt:'Mejorá el Ayuntamiento a Nivel 2',  check:()=>S.thNivel>=2,         rew:{ambar:35}},
  {txt:'Construí una Torre',                check:()=>S.buildings.some(b=>b.tipo==='torre'&&b.estado==='ok'), rew:{oro:100,ambar:10}},
  {txt:'Repelé un asalto goblin',           check:()=>S.stats.raids>=1,     rew:{ambar:40,madera:150}},
  {txt:'Aplicá una Skin Roja',              check:()=>S.stats.skins>=1,     rew:{comida:200,ambar:20}},
  {txt:'Ayuntamiento a Nivel 3 (¡final!)',  check:()=>S.thNivel>=3,         rew:{ambar:100}},
];

/* ===== estado (in-memory) ===== */
const S={ oro:400, madera:400, comida:150, ambar:60,
  speed:1, aceleradas:0, ACEL_TOPE:3,
  grid:Array.from({length:GH},()=>Array(GW).fill(null)),
  buildings:[], obst:[], nextId:1, thNivel:1,
  colocando:null, selId:null, selObs:null,
  qIx:0, stats:{cosechas:0,limpiados:0,raids:0,skins:0},
  raid:{on:false,gob:[],war:[],t:0,cool:110} };     // primer asalto ~110 s reales
let scene, ghostG, ghostSpr=null;
function sfx(k,v){ try{ scene&&scene.sound.play('s_'+k,{volume:v||0.5}); }catch(e){} }

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#3a6a8a',
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  scene:{preload,create,update}});

function preload(){
  const TSB='assets/img/ts/';
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.image('water',TSB+'water.png');
  this.load.spritesheet('foam',TSB+'foam.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('tree',TSB+'tree_anim.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fence',TSB+'fence.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust1',TSB+'dust1.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust2',TSB+'dust2.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fire',TSB+'fire.png',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('explosion',TSB+'explosion.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('dead',TSB+'dead.png',{frameWidth:128,frameHeight:256});
  for(const c of ['blue','red']){
    this.load.image('castle_'+c,TSB+'castle_'+c+'.png');
    for(const b of ['house1','house2','house3','tower','barracks','archery','monastery'])
      this.load.image(b+'_'+c,TSB+b+'_'+c+'.png');
    this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  }
  this.load.spritesheet('warrior_blue','assets/img/warrior_blue.png',{frameWidth:110,frameHeight:98});
  this.load.spritesheet('goblin_torch',TSB+'goblin_torch.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spear_idle',TSB+'spear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('spear_run',TSB+'spear_run.png',{frameWidth:256,frameHeight:256});
  this.load.image('goldmine',TSB+'goldmine.png');
  ['res_gold','res_meat','res_wood'].forEach(k=>this.load.image(k,TSB+k+'.png'));
  for(const j of ['waxe','wpick']) for(const s of ['i','r'])
    this.load.spritesheet(j+'_blue_'+s,TSB+j+'_blue_'+s+'.png',{frameWidth:192,frameHeight:192});
  for(let i=1;i<=4;i++){ this.load.image('cloud'+i,TSB+'cloud'+i+'.png');
    this.load.spritesheet('wrock'+i,TSB+'wrock'+i+'.png',{frameWidth:128,frameHeight:128});
    this.load.image('rock'+i,TSB+'rock'+i+'.png');
    this.load.spritesheet('bush'+i,TSB+'bush'+i+'.png',{frameWidth:128,frameHeight:128}); }
  for(const d of ['01','02','03']) this.load.image('deco'+d,TSB+'deco'+d+'.png');
  this.load.spritesheet('sboat',TSB+'sboat.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shark',TSB+'shark.png',{frameWidth:192,frameHeight:192});
  ['door','bong','coins','creak','bell','clash','fire','latch'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}

const isIn=(tx,ty)=>tx>=0&&tx<GW&&ty>=0&&ty<GH;
function gIdx(x,y){
  const n=y>0, s=y<GH-1, w=x>0, e=x<GW-1;
  if(n&&s&&w&&e) return 11;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 20; if(!s&&!e) return 22;
  if(!n) return 1; if(!s) return 21; if(!w) return 10; return 12;
}

function create(){
  scene=this; makeDot(this);
  const an=this.anims;
  an.create({key:'foam-a',frames:an.generateFrameNumbers('foam',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'tree-a',frames:an.generateFrameNumbers('tree',{start:0,end:3}),frameRate:4,repeat:-1});
  an.create({key:'sheep-a',frames:an.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});
  an.create({key:'dust1-a',frames:an.generateFrameNumbers('dust1',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'dust2-a',frames:an.generateFrameNumbers('dust2',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'fire-a',frames:an.generateFrameNumbers('fire',{start:0,end:6}),frameRate:10,repeat:-1});
  an.create({key:'explo-a',frames:an.generateFrameNumbers('explosion',{start:0,end:8}),frameRate:14,repeat:0});
  an.create({key:'dead-a',frames:an.generateFrameNumbers('dead',{start:0,end:6}),frameRate:9,repeat:0});
  for(const c of ['blue','red']){
    an.create({key:'pawn_'+c+'-i',frames:an.generateFrameNumbers('pawn_'+c,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:'pawn_'+c+'-r',frames:an.generateFrameNumbers('pawn_'+c,{start:6,end:11}),frameRate:10,repeat:-1});
  }
  an.create({key:'war-i',frames:an.generateFrameNumbers('warrior_blue',{start:0,end:5}),frameRate:6,repeat:-1});
  an.create({key:'war-r',frames:an.generateFrameNumbers('warrior_blue',{start:12,end:17}),frameRate:11,repeat:-1});
  an.create({key:'gt-r',frames:an.generateFrameNumbers('goblin_torch',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'gt-i',frames:an.generateFrameNumbers('goblin_torch',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'sp-r',frames:an.generateFrameNumbers('spear_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'sp-i',frames:an.generateFrameNumbers('spear_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  for(const j of ['waxe','wpick']){
    an.create({key:j+'-r',frames:an.generateFrameNumbers(j+'_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  }
  for(let i=1;i<=4;i++){ an.create({key:'wrock'+i+'-a',frames:an.generateFrameNumbers('wrock'+i,{start:0,end:7}),frameRate:5,repeat:-1});
    an.create({key:'bush'+i+'-a',frames:an.generateFrameNumbers('bush'+i,{start:0,end:7}),frameRate:6,repeat:-1}); }
  an.create({key:'sboat-a',frames:an.generateFrameNumbers('sboat',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'shark-a',frames:an.generateFrameNumbers('shark',{start:0,end:-1}),frameRate:8,repeat:-1});

  // mar + espuma + parcela (con parches de arena para variedad)
  this.add.tileSprite(0,0,WORLD_W,WORLD_H,'water').setOrigin(0,0).setDepth(-30);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(x===0||y===0||x===GW-1||y===GH-1)
      this.add.sprite((BX+x)*T+T/2,(BY+y)*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) rt.drawFrame('ground',gIdx(x,y),(BX+x)*T,(BY+y)*T);
  for(let p=0;p<2;p++){ const sx=rint(1,GW-4), sy=rint(1,GH-4);       // parches de arena (visual)
    for(let y=0;y<2;y++)for(let x=0;x<3;x++) rt.drawFrame('ground',16,(BX+sx+x)*T,(BY+sy+y)*T); }

  // mar vivo: rocas animadas + tiburón + nubes
  for(let i=0;i<5;i++){
    const lado=pick(['n','s','e','o']);
    const x=lado==='o'?rint(0,BX-1):lado==='e'?rint(WT-BX,WT-1):rint(0,WT-1);
    const y=lado==='n'?rint(0,BY-1):lado==='s'?rint(HT-BY,HT-1):rint(0,HT-1);
    if(x>=BX&&x<BX+GW&&y>=BY&&y<BY+GH) continue;
    const k='wrock'+rint(1,4);
    this.add.sprite(x*T+T/2,y*T+T/2,k).play({key:k+'-a',startFrame:rint(0,7)}).setDepth(-24).setScale(0.8);
  }
  const shark=this.add.sprite(-80,rint(1,2)*T,'shark').play('shark-a').setDepth(-23).setScale(0.7);
  this.tweens.add({targets:shark,x:WORLD_W+80,duration:34000,repeat:-1,repeatDelay:22000,
    onRepeat:()=>{shark.y=pick([rint(0,BY-1),rint(HT-BY,HT-1)])*T+T/2;}});
  for(let i=1;i<=3;i++){
    const c=this.add.image(rint(0,WORLD_W),rint(40,WORLD_H-40),'cloud'+i).setAlpha(0.35).setDepth(89000).setScale(0.8);
    this.tweens.add({targets:c,x:'+='+WORLD_W,duration:rint(70000,120000),repeat:-1,
      onRepeat:()=>{c.x=-200;c.y=rint(40,WORLD_H-40);}});
  }

  ghostG=this.add.graphics().setDepth(95000);

  // arranque: Ayuntamiento + UNA CASA ya construidos + matorrales para limpiar
  addBuilding('castle', Math.floor(GW/2)-2, 1, {listo:true});
  addBuilding('house', 2, 4, {listo:true});
  scatterObstacles(9);

  this.input.on('pointermove',p=>{ if(S.colocando) drawGhost(p); });
  this.input.on('pointerdown',p=>{ if(S.colocando){ const t=tileAt(p); if(t) tryPlace(t.x,t.y); } });
  this.input.keyboard&&this.input.keyboard.on('keydown-ESC',cancelPlace);

  fitCamera(); this.scale.on('resize',fitCamera);
  buildBar(); refreshHUD(); refreshQuest();
  scheduleBoat();
  toast('Tu parcela te espera. Limpiá matorrales, construí y prepará la defensa: los goblins van a venir.');
  window.__raid=()=>startRaid();          // gatillo de test/debug
}

function fitCamera(){ if(!scene) return;
  const cam=scene.cameras.main, vw=scene.scale.width, vh=scene.scale.height;
  cam.setZoom(Math.min(vw/WORLD_W,vh/WORLD_H)*0.99); cam.centerOn(WORLD_W/2,WORLD_H/2);
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

/* ===== obstáculos (limpiar = espacio + botín) ===== */
function scatterObstacles(n){
  let puestos=0, tries=0;
  while(puestos<n&&tries++<120){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(S.grid[ty][tx]!==null) continue;
    const o=pick(OBST), id='o'+S.nextId++;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T;
    let spr;
    if(o.tipo==='arbol') spr=scene.add.sprite(x,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.55);
    else if(o.tipo==='arbusto'){ const k='bush'+rint(1,4); spr=scene.add.sprite(x,y-4,k).play({key:k+'-a',startFrame:rint(0,7)}).setOrigin(0.5,1).setScale(0.6); }
    else if(o.tipo==='roca') spr=scene.add.image(x,y-4,'rock'+rint(1,4)).setOrigin(0.5,1).setScale(0.9);
    else spr=scene.add.image(x,y-4,'deco0'+rint(1,3)).setOrigin(0.5,1).setScale(0.9);
    spr.setDepth(y).setInteractive({useHandCursor:true});
    const ob={id,tipo:o.tipo,costo:o.costo,tx,ty,spr};
    spr.on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ selectObs(ob); ev.stopPropagation(); } });
    S.grid[ty][tx]=id; S.obst.push(ob); puestos++;
  }
}
function selectObs(ob){
  S.selObs=ob; S.selId=null;
  $('selNom').textContent={arbusto:'Matorral',roca:'Roca',arbol:'Árbol viejo',hongo:'Hongos'}[ob.tipo];
  $('selLvl').textContent='Ocupa lugar en tu parcela';
  ['btnMover','btnMejorar','btnAcelerar','btnSkin','btnReparar','btnCosechar'].forEach(i=>$(i).style.display='none');
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
function canPlace(tx,ty,fw,fh,ignoreId){
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
    const gx=tx+x, gy=ty+y;
    if(!isIn(gx,gy)) return false;
    const occ=S.grid[gy][gx];
    if(occ!==null&&occ!==ignoreId) return false;
  }
  return true;
}
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
    sprs.push(scene.add.sprite(x,y-T*0.7,'sheep').play('sheep-a').setOrigin(0.5,0.9).setDepth(y-T*0.7));
  } else {
    sprs.push(scene.add.image(x,y,texOf(b)).setOrigin(0.5,1).setDepth(y));
  }
  sprs[0].setInteractive({useHandCursor:true});
  sprs[0].on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ clickBuilding(b); ev.stopPropagation(); } });
  return {sprs,x,y};
}
function clickBuilding(b){
  if(b.estado==='ok'&&CAT[b.tipo].prod&&b.buf>=10){ cosechar(b); return; }   // click = cosecha directa
  select(b.id);
}
function cosechar(b){
  const res=CAT[b.tipo].prod, n=Math.floor(b.buf);
  S[res]=Math.min(CAP,S[res]+n); b.buf-=n; S.stats.cosechas++;
  flyText(b.x,b.y-CAT[b.tipo].fh*T,'+'+n+' '+res);
  if(b.pileSpr){b.pileSpr.destroy();b.pileSpr=null;}
  sfx('coins',0.55); refreshHUD();
}
function addBuilding(tipo,tx,ty,opt){
  opt=opt||{};
  const c=CAT[tipo];
  const b={id:S.nextId++, tipo, nivel:1, tx, ty, skin:'blue', var:tipo==='house'?rint(1,3):0,
    estado:opt.listo?'ok':'obra', obraT:0, obraDur:c.dur, mejorando:false, hp:100, danado:false,
    buf:0, pileSpr:null, pawn:null, badge:null, barG:null, fireSpr:null};
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  setGrid(b,b.id);
  if(b.estado==='obra'){ b.sprs.forEach(s=>s.setAlpha(0.5)); b.barG=scene.add.graphics().setDepth(96000);
    b.builder=spawnBuilderPawn(b); }
  else if(c.prod) b.pawn=spawnWorker(b);
  S.buildings.push(b);
  return b;
}
function spawnBuilderPawn(b){
  const x=b.x+CAT[b.tipo].fw*T*0.42, y=b.y-8;
  const s=scene.add.sprite(x,y,'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play('pawn_blue-i');
  s.dustEv=scene.time.addEvent({delay:900,loop:true,callback:()=>dustAt(b.x,b.y-10,1)});
  return s;
}
function spawnWorker(b){
  const useTool=b.tipo==='mina'||b.tipo==='lenador';
  const key=b.tipo==='mina'?'wpick':'waxe';
  const x0=b.x-CAT[b.tipo].fw*T*0.45, x1=b.x+CAT[b.tipo].fw*T*0.45, y=b.y+10;
  const s=scene.add.sprite(x0,y,useTool?key+'_blue_r':'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play(useTool?key+'-r':'pawn_blue-r');
  scene.tweens.add({targets:s,x:x1,duration:2600,yoyo:true,repeat:-1,
    onYoyo:()=>s.setFlipX(true), onRepeat:()=>s.setFlipX(false)});
  return s;
}
function destroySprites(b){
  b.sprs.forEach(s=>s.destroy());
  ['builder','pawn','badge','barG','pileSpr','fireSpr'].forEach(k=>{ if(b[k]){ b[k].dustEv&&b[k].dustEv.remove(); b[k].destroy(); b[k]=null; } });
}
function refreshBuilding(b){
  destroySprites(b);
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  if(b.estado==='obra'){ b.sprs.forEach(s=>s.setAlpha(0.5)); b.barG=scene.add.graphics().setDepth(96000); b.builder=spawnBuilderPawn(b); }
  else {
    if(CAT[b.tipo].prod&&!b.danado) b.pawn=spawnWorker(b);
    if(b.nivel>1) putBadge(b);
    if(b.danado){ b.sprs.forEach(s=>s.setTint(0x8a6a58));
      b.fireSpr=scene.add.sprite(b.x,b.y-6,'fire').play('fire-a').setOrigin(0.5,1).setScale(0.5).setDepth(b.y+1); }
  }
}
function putBadge(b){
  b.badge=scene.add.text(b.x,b.y-8,'N'+b.nivel,{fontFamily:'ui-monospace,monospace',fontSize:'13px',
    color:'#120d09',backgroundColor:'#c9a227',padding:{x:4,y:1}}).setOrigin(0.5,0).setDepth(97000);
}

/* ===== colocación ===== */
function startPlace(tipo,moverId){
  S.colocando={tipo,moverId:moverId||null};
  hidePanel();
  const c=CAT[tipo];
  if(ghostSpr){ghostSpr.destroy();ghostSpr=null;}
  if(tipo!=='lenador'&&tipo!=='granja'){
    const tex=moverId?texOf(byId(moverId)):CARD_IMG[tipo];
    if(tex&&tex!=='tree_anim'&&tex!=='sheep') ghostSpr=scene.add.image(0,0,tex).setOrigin(0.5,1).setAlpha(0.55).setDepth(94000).setVisible(false);
  }
  hint((moverId?'Reubicando ':'Colocando ')+c.nom+' — verde libre · rojo ocupado · ESC cancela');
}
function drawGhost(p){
  const c=CAT[S.colocando.tipo];
  ghostG.clear();
  const t=tileAt(p); if(!t){ if(ghostSpr)ghostSpr.setVisible(false); return; }
  const ok=canPlace(t.x,t.y,c.fw,c.fh,S.colocando.moverId);
  ghostG.fillStyle(ok?0x5fa55a:0xc94f45,0.35).fillRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  ghostG.lineStyle(2,ok?0x5fa55a:0xc94f45,0.9).strokeRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  if(ghostSpr) ghostSpr.setVisible(true).setPosition((BX+t.x)*T+c.fw*T/2,(BY+t.y+c.fh)*T);
}
function tryPlace(tx,ty){
  const {tipo,moverId}=S.colocando, c=CAT[tipo];
  if(!canPlace(tx,ty,c.fw,c.fh,moverId)){ sfx('creak',0.4); return; }
  if(moverId){
    const b=byId(moverId); setGrid(b,null); b.tx=tx; b.ty=ty; setGrid(b,b.id); refreshBuilding(b);
    sfx('door',0.5); toast(c.nom+' reubicado.');
  } else {
    if(!pagar(c.costo)){ sfx('creak',0.4); toast('No te alcanza para '+c.nom+'.'); return; }
    addBuilding(tipo,tx,ty,{listo:c.dur===0});
    sfx('door',0.55); toast(c.nom+' en obra.');
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

/* ===== selección de edificios ===== */
const byId=id=>S.buildings.find(b=>b.id===id);
function select(id){
  S.selId=id; S.selObs=null; const b=byId(id), c=CAT[b.tipo];
  $('selNom').textContent=c.nom;
  $('selLvl').textContent='Nivel '+b.nivel+(b.estado==='obra'?' · EN OBRA':'')+(b.danado?' · 🔥 DAÑADO':'')+(b.skin==='red'?' · roja':'');
  ['btnMover','btnMejorar','btnAcelerar','btnSkin','btnReparar','btnCosechar','btnLimpiar'].forEach(i=>$(i).style.display='none');
  $('btnMover').style.display='block'; $('btnMover').disabled=b.estado==='obra';
  if(b.danado){ $('btnReparar').style.display='block'; $('btnReparar').textContent='REPARAR (60 oro)'; $('btnReparar').disabled=S.oro<60; }
  else {
    const max=b.tipo==='castle'?MAXLVL.castle:MAXLVL.def;
    $('btnMejorar').style.display='block';
    $('btnMejorar').disabled=!(b.estado==='ok'&&b.nivel<max&&c.up&&c.up[b.nivel-1]);
    $('btnMejorar').textContent=(b.nivel<max&&c.up&&c.up[b.nivel-1])?'MEJORAR ('+costoTxt(c.up[b.nivel-1].costo)+')':'NIVEL MÁX';
    if(c.prod){ $('btnCosechar').style.display='block';
      $('btnCosechar').textContent='COSECHAR ('+Math.floor(b.buf)+' '+c.prod+')'; $('btnCosechar').disabled=b.buf<1; }
  }
  if(b.estado==='obra'){ $('btnAcelerar').style.display='block';
    $('btnAcelerar').disabled=!(S.aceleradas<S.ACEL_TOPE&&S.ambar>=10);
    $('btnAcelerar').textContent='◆ ACELERAR ('+(S.ACEL_TOPE-S.aceleradas)+' rest. · 10)'; }
  if(c.skins){ $('btnSkin').style.display='block';
    $('btnSkin').disabled=!(b.skin==='blue'&&S.ambar>=25);
    $('btnSkin').textContent=b.skin==='red'?'SKIN ROJA ✓':'◆ SKIN ROJA (25)'; }
  $('selpanel').classList.add('on');
}
function hidePanel(){ $('selpanel').classList.remove('on'); S.selId=null; S.selObs=null; }
$('btnCerrar').onclick=hidePanel;
$('btnMover').onclick=()=>{ const b=byId(S.selId); if(b) startPlace(b.tipo,b.id); };
$('btnCosechar').onclick=()=>{ const b=byId(S.selId); if(b) { cosechar(b); select(b.id);} };
$('btnReparar').onclick=()=>{
  const b=byId(S.selId); if(!b||!b.danado||S.oro<60) return;
  S.oro-=60; b.danado=false; b.hp=100; refreshBuilding(b);
  sfx('bong',0.5); toast(CAT[b.tipo].nom+' reparado.'); refreshHUD(); select(b.id);
};
$('btnMejorar').onclick=()=>{
  const b=byId(S.selId); if(!b) return; const up=CAT[b.tipo].up[b.nivel-1];
  if(!pagar(up.costo)){ sfx('creak',0.4); toast('No te alcanza para la mejora.'); return; }
  b.estado='obra'; b.obraT=0; b.obraDur=up.dur; b.mejorando=true; refreshBuilding(b);
  sfx('door',0.5); toast('Mejorando '+CAT[b.tipo].nom+' a nivel '+(b.nivel+1)+'.');
  select(b.id); refreshHUD();
};
$('btnAcelerar').onclick=()=>{
  const b=byId(S.selId); if(!b||b.estado!=='obra'||S.aceleradas>=S.ACEL_TOPE||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; S.aceleradas++; b.obraT=b.obraDur;
  sfx('coins',0.6); toast('Obra acelerada (◆ simulado — sink real en F4).'); refreshHUD(); select(b.id);
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
  for(let i=0;i<3;i++) spawnDefensor((BX+GW/2)*T+rint(-60,60),(BY+GH/2)*T+rint(-40,40));
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

/* ===== bote misterioso (botín en la orilla) ===== */
function scheduleBoat(){ scene.time.delayedCall(rint(70000,120000),spawnBoat); }
function spawnBoat(){
  const y=(BY+rint(2,GH-3))*T;
  const boat=scene.add.sprite(-80,y,'sboat').play('sboat-a').setDepth(-22).setScale(0.8);
  scene.tweens.add({targets:boat,x:(BX-1)*T+20,duration:6000,ease:'Sine.easeOut',onComplete:()=>{
    boat.setInteractive({useHandCursor:true});
    const glow=scene.add.circle(boat.x,y-30,16,0xc9a227,0.4).setDepth(-21);
    scene.tweens.add({targets:glow,alpha:0.1,scale:1.4,duration:600,yoyo:true,repeat:-1});
    toast('⚓ Un bote misterioso llegó a tu orilla — tocalo antes de que se vaya.');
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
  scene.tweens.add({targets:boat,x:-100,duration:5000,ease:'Sine.easeIn',onComplete:()=>boat.destroy()});
  if(!ok) toast('El bote se fue sin que lo revises…');
  scheduleBoat();
}

/* ===== ASALTO GOBLIN ===== */
function startRaid(){
  if(S.raid.on) return;
  S.raid.on=true; S.raid.t=0; S.raid.gob=[]; S.raid.war=[];
  const n=2+S.thNivel+rint(0,1);
  sfx('latch',0.6); scene.cameras.main.shake(260,0.006);
  $('raidbanner').classList.add('on'); $('btnMercen').style.display='inline-block';
  toast('⚔️ ¡ASALTO GOBLIN! '+n+' invasores desembarcan. Torres y guerreros a defender.');
  for(let i=0;i<n;i++){
    const lado=pick(['o','e','s']);
    const gx=lado==='o'?(BX-1)*T:lado==='e'?(BX+GW+1)*T:(BX+rint(1,GW-1))*T;
    const gy=lado==='s'?(BY+GH+1)*T:(BY+rint(1,GH-1))*T;
    const tipo=Math.random()<0.6?'torch':'spear';
    const s=scene.add.sprite(gx,gy,tipo==='torch'?'goblin_torch':'spear_run').setOrigin(0.5,0.72)
      .setScale(tipo==='torch'?0.62:0.52).setDepth(gy);
    s.play(tipo==='torch'?'gt-r':'sp-r');
    S.raid.gob.push({spr:s,tipo,target:null,atkT:0,dead:false});
  }
  // defensores del cuartel
  const cu=S.buildings.find(b=>b.tipo==='cuartel'&&b.estado==='ok'&&!b.danado);
  if(cu) for(let i=0;i<cu.nivel+1;i++) spawnDefensor(cu.x+rint(-30,30),cu.y+rint(0,30));
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
  S.raid.cool=rint(160,240);
  if(win){ S.stats.raids++;
    const oro=rint(50,120), amb=rint(10,25);
    S.oro=Math.min(CAP,S.oro+oro); S.ambar+=amb;
    sfx('bong',0.7); toast('🛡️ ¡Asalto repelido! Botín: +'+oro+' oro · +'+amb+' ◆');
  } else { sfx('creak',0.5); toast('Los goblins se retiraron… dejaron destrozos. Repará y reforzá la defensa.'); }
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
  if(R.t>55){ endRaid(R.gob.some(g=>g.dead)&&R.gob.every(g=>g.dead)); return; }   // timeout: se retiran
  const vivos=R.gob.filter(g=>!g.dead);
  if(!vivos.length) return;
  // goblins: buscar edificio y atacar
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
        if(g.target.hp<=0){ g.target.danado=true; refreshBuilding(g.target); sfx('fire',0.4);
          toast('🔥 ¡'+CAT[g.target.tipo].nom+' dañado! Seleccionalo para REPARAR.'); g.target=null; }
      }
    }
  }
  // torres disparan
  for(const t of S.buildings.filter(b=>b.tipo==='torre'&&b.estado==='ok'&&!b.danado)){
    t.cd=(t.cd||0)-dtReal;
    if(t.cd<=0){
      const g=vivos.filter(g2=>!g2.dead).sort((a,b2)=>Phaser.Math.Distance.Between(t.x,t.y,a.spr.x,a.spr.y)-Phaser.Math.Distance.Between(t.x,t.y,b2.spr.x,b2.spr.y))[0];
      if(g&&Phaser.Math.Distance.Between(t.x,t.y,g.spr.x,g.spr.y)<T*6){
        t.cd=1.5+ (t.nivel>1?-0.4:0);
        const p=scene.add.image(t.x,t.y-CAT.torre.fh*T,'dot').setTint(0xffe9a0).setDepth(99998).setScale(1.1);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-16,duration:220,ease:'Linear',
          onComplete:()=>{p.destroy(); killGoblin(g);}});
        sfx('clash',0.25);
      }
    }
  }
  // guerreros persiguen
  for(const w of R.war.filter(w2=>!w2.dead)){
    if(!w.target||w.target.dead){ w.target=vivos.find(g=>!g.dead)||null; }
    if(!w.target){ continue; }
    const d=Phaser.Math.Distance.Between(w.spr.x,w.spr.y,w.target.spr.x,w.target.spr.y);
    if(d>26){
      const sp=58*dtReal, ang=Math.atan2(w.target.spr.y-w.spr.y,w.target.spr.x-w.spr.x);
      w.spr.x+=Math.cos(ang)*sp; w.spr.y+=Math.sin(ang)*sp;
      w.spr.setFlipX(Math.cos(ang)<0); w.spr.setDepth(w.spr.y);
    } else {
      sfx('clash',0.3); burstAt(w.spr.x,w.spr.y-16,0xffffff);
      killGoblin(w.target); w.target=null;
      if(Math.random()<0.25){ w.dead=true;                       // a veces cae un defensor
        const d2=scene.add.sprite(w.spr.x,w.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(w.spr.y);
        d2.once('animationcomplete',()=>scene.tweens.add({targets:d2,alpha:0,duration:1500,onComplete:()=>d2.destroy()}));
        w.spr.destroy(); }
    }
  }
}

/* ===== barra de construcción ===== */
function gateMsg(c){
  if(S.thNivel<c.req) return 'Ayunt. N'+c.req;
  if(c.reqB&&!S.buildings.some(b=>b.tipo===c.reqB&&b.estado==='ok')) return 'requiere '+CAT[c.reqB].nom;
  if(c.unico&&S.buildings.some(b=>b.tipo==='castle')) return 'único';
  return null;
}
function buildBar(){
  const bar=$('buildbar'); bar.innerHTML='';
  for(const tipo in CAT){
    const c=CAT[tipo]; if(c.unico) continue;
    const lock=gateMsg(c);
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
  const dt=delta/1000*S.speed;       // tiempo de juego (obras y producción)
  const dtReal=delta/1000;           // tiempo real (asaltos y ambiente)
  for(const b of S.buildings){
    const c=CAT[b.tipo];
    if(b.estado==='obra'){
      b.obraT+=dt;
      const p=Math.min(1,b.obraT/b.obraDur);
      if(b.barG){ b.barG.clear();
        const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0xc9a227,1).fillRect(bx,by,bw*p,6);
      }
      if(b.obraT>=b.obraDur){
        b.estado='ok'; b.hp=100;
        if(b.mejorando){ b.nivel++; b.mejorando=false;
          if(b.tipo==='castle'){ S.thNivel=b.nivel; buildBar(); toast('¡Ayuntamiento nivel '+b.nivel+'! Nuevos edificios desbloqueados.'); } }
        refreshBuilding(b); dustAt(b.x,b.y-20,4); sfx('bong',0.6);
        if(S.selId===b.id) select(b.id);
      }
    } else if(c.prod&&!b.danado){
      const rate=RATE*(1+0.5*(b.nivel-1));
      b.buf=Math.min(BUFFER(b),b.buf+rate*dt);
      if(b.buf>=25&&!b.pileSpr){                           // pila cosechable rebotando
        b.pileSpr=scene.add.image(b.x,b.y-c.fh*T-6,RES_IMG[c.prod]).setScale(0.42).setDepth(97000);
        scene.tweens.add({targets:b.pileSpr,y:'-=7',duration:520,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        b.pileSpr.setInteractive({useHandCursor:true});
        b.pileSpr.on('pointerdown',(p,lx,ly,ev)=>{ cosechar(b); ev.stopPropagation(); });
      }
      if(b.buf<25&&b.pileSpr){ b.pileSpr.destroy(); b.pileSpr=null; }
    }
  }
  // asaltos en tiempo REAL (para que ×60 no los spamee)
  if(S.raid.on) raidTick(dtReal);
  else { S.raid.cool-=dtReal; if(S.raid.cool<=0&&S.buildings.some(b=>b.estado==='ok')) startRaid(); }

  hudAcc+=delta; if(hudAcc>250){ hudAcc=0; refreshHUD(); }
  qAcc+=delta;   if(qAcc>600){ qAcc=0; refreshQuest(); }
}
