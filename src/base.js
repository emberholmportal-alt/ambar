/* ÁMBAR · Mi Base — PROTOTIPO desechable (cliente puro, estado in-memory)
   Valida el loop de construcción estilo Clash. Sin backend, sin wallet, sin persistencia. */

const $=id=>document.getElementById(id);
const T=64, GW=14, GH=14;                 // parcela jugable en tiles
const BX=3, BY=3;                         // offset de la parcela dentro del mundo (borde de agua)
const WT=GW+BX*2, HT=GH+BY*2;             // mundo total en tiles
const WORLD_W=WT*T, WORLD_H=HT*T;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== catálogo (huellas del catálogo maestro · costos tabla B.4 del DESIGN) ===== */
const CAP=2000;                            // depósito por recurso
const MAXLVL={castle:3, def:2};
const CAT={
  castle:    {nom:'Ayuntamiento', fw:5,fh:2, costo:{},                 dur:0,    req:1, unico:true, skins:true,
              up:[{costo:{oro:500,madera:500},dur:14400},{costo:{oro:1200,madera:1200},dur:28800}]},
  house:     {nom:'Casa',         fw:2,fh:2, costo:{madera:100},       dur:300,  req:1, skins:true, up:[{costo:{madera:200},dur:1800}]},
  mina:      {nom:'Mina',         fw:3,fh:1, costo:{madera:150},       dur:600,  req:1, prod:{res:'oro'},    up:[{costo:{oro:300},dur:3600}]},
  lenador:   {nom:'Leñador',      fw:2,fh:2, costo:{oro:100},          dur:600,  req:1, prod:{res:'madera'}, up:[{costo:{oro:300},dur:3600}]},
  granja:    {nom:'Granja',       fw:3,fh:2, costo:{madera:120},       dur:600,  req:1, prod:{res:'comida'}, up:[{costo:{oro:250},dur:3600}]},
  torre:     {nom:'Torre',        fw:2,fh:2, costo:{oro:200,madera:200},dur:1800,req:2, skins:true, up:[{costo:{oro:500},dur:7200}]},
  cuartel:   {nom:'Cuartel',      fw:3,fh:2, costo:{madera:300},       dur:3600, req:2, skins:true, up:[{costo:{oro:600},dur:10800}]},
  arqueria:  {nom:'Arquería',     fw:3,fh:2, costo:{oro:300},          dur:3600, req:2, reqB:'cuartel', skins:true, up:[{costo:{madera:600},dur:10800}]},
  monasterio:{nom:'Monasterio',   fw:3,fh:2, costo:{ambar:40},         dur:3600, req:3, skins:true, premium:true, up:[{costo:{ambar:60},dur:10800}]},
};
const RATE=120/3600;                       // producción: 120/h por nivel 1 (proto), +40% por nivel
const CARD_IMG={castle:'castle_blue',house:'house1_blue',mina:'goldmine',lenador:'tree_anim',
  granja:'sheep',torre:'tower_blue',cuartel:'barracks_blue',arqueria:'archery_blue',monasterio:'monastery_blue'};

/* ===== estado (in-memory: se pierde al recargar, a propósito) ===== */
const S={ oro:500, madera:500, comida:200, ambar:100,
  speed:1, aceleradas:0, ACEL_TOPE:3,
  grid:Array.from({length:GH},()=>Array(GW).fill(null)),
  buildings:[], nextId:1, thNivel:1,
  colocando:null,      // {tipo, moverId|null}
  selId:null };
let scene, ghostG, ghostSpr=null, soundOn=true;
function sfx(k,v){ try{ if(soundOn&&scene) scene.sound.play('s_'+k,{volume:v||0.5}); }catch(e){} }

/* ===== Phaser ===== */
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
  for(const c of ['blue','red']){
    this.load.image('castle_'+c,TSB+'castle_'+c+'.png');
    for(const b of ['house1','house2','house3','tower','barracks','archery','monastery'])
      this.load.image(b+'_'+c,TSB+b+'_'+c+'.png');
    this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  }
  this.load.image('goldmine',TSB+'goldmine.png');
  ['res_gold','res_meat','res_wood'].forEach(k=>this.load.image(k,TSB+k+'.png'));
  for(const j of ['waxe','wpick']) for(const s of ['i','r'])
    this.load.spritesheet(j+'_blue_'+s,TSB+j+'_blue_'+s+'.png',{frameWidth:192,frameHeight:192});
  ['door','bong','coins','creak','bell'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}

const isIn=(tx,ty)=>tx>=0&&tx<GW&&ty>=0&&ty<GH;
function gIdx(x,y){ // autotile 3×3 del pasto para el rectángulo de la parcela
  const n=y>0, s=y<GH-1, w=x>0, e=x<GW-1;
  if(n&&s&&w&&e) return 11;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 20; if(!s&&!e) return 22;
  if(!n) return 1; if(!s) return 21; if(!w) return 10; return 12;
}

function create(){
  scene=this;
  const an=this.anims;
  an.create({key:'foam-a',frames:an.generateFrameNumbers('foam',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'tree-a',frames:an.generateFrameNumbers('tree',{start:0,end:3}),frameRate:4,repeat:-1});
  an.create({key:'sheep-a',frames:an.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});
  an.create({key:'dust1-a',frames:an.generateFrameNumbers('dust1',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'dust2-a',frames:an.generateFrameNumbers('dust2',{start:0,end:-1}),frameRate:11,repeat:0});
  for(const c of ['blue','red']){
    an.create({key:'pawn_'+c+'-i',frames:an.generateFrameNumbers('pawn_'+c,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:'pawn_'+c+'-r',frames:an.generateFrameNumbers('pawn_'+c,{start:6,end:11}),frameRate:10,repeat:-1});
  }
  for(const j of ['waxe','wpick']){
    an.create({key:j+'-i',frames:an.generateFrameNumbers(j+'_blue_i',{start:0,end:-1}),frameRate:7,repeat:-1});
    an.create({key:j+'-r',frames:an.generateFrameNumbers(j+'_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  }

  // mar + espuma + isla-parcela
  this.add.tileSprite(0,0,WORLD_W,WORLD_H,'water').setOrigin(0,0).setDepth(-30);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(x===0||y===0||x===GW-1||y===GH-1)
      this.add.sprite((BX+x)*T+T/2,(BY+y)*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) rt.drawFrame('ground',gIdx(x,y),(BX+x)*T,(BY+y)*T);

  ghostG=this.add.graphics().setDepth(95000);

  // Ayuntamiento inicial (gratis, ya construido)
  addBuilding('castle', Math.floor(GW/2)-2, 1, {listo:true});

  // input de colocación / selección
  this.input.on('pointermove',p=>{ if(S.colocando) drawGhost(p); });
  this.input.on('pointerdown',p=>{
    if(!S.colocando) return;
    const t=tileAt(p); if(!t) return;
    tryPlace(t.x,t.y);
  });
  this.input.keyboard&&this.input.keyboard.on('keydown-ESC',cancelPlace);

  fitCamera(); this.scale.on('resize',fitCamera);
  buildBar(); refreshHUD();
  toast('Bienvenido a tu parcela. Elegí un edificio abajo para construir.');
}

function fitCamera(){ if(!scene) return;
  const cam=scene.cameras.main, vw=scene.scale.width, vh=scene.scale.height;
  cam.setZoom(Math.min(vw/WORLD_W,vh/WORLD_H)*0.99);
  cam.centerOn(WORLD_W/2,WORLD_H/2);
}
function tileAt(p){
  const wp=scene.cameras.main.getWorldPoint(p.x,p.y);
  const tx=Math.floor(wp.x/T)-BX, ty=Math.floor(wp.y/T)-BY;
  return isIn(tx,ty)?{x:tx,y:ty}:null;
}

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
  const c=CAT[b.tipo];
  if(b.tipo==='castle') return 'castle_'+b.skin;
  if(b.tipo==='house')  return 'house'+b.var+'_'+b.skin;
  if(b.tipo==='mina')   return 'goldmine';
  if(c.skins)           return {torre:'tower',cuartel:'barracks',arqueria:'archery',monasterio:'monastery'}[b.tipo]+'_'+b.skin;
  return null;
}
function makeSprites(b){                                   // crea los sprites del edificio en su huella
  const c=CAT[b.tipo];
  const x=(BX+b.tx)*T + c.fw*T/2, y=(BY+b.ty+c.fh)*T;      // base centrada en la huella
  const sprs=[];
  if(b.tipo==='lenador'){
    sprs.push(scene.add.sprite(x-T*0.45,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.62).setDepth(y));
    sprs.push(scene.add.sprite(x+T*0.45,y-T*0.4,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.55).setDepth(y-T*0.4));
  } else if(b.tipo==='granja'){
    for(let fx=0;fx<3;fx++){                               // cerquito frontal + oveja
      sprs.push(scene.add.image((BX+b.tx+fx)*T+T/2,y-4,'fence',fx===0?8:fx===2?11:9).setOrigin(0.5,1).setDepth(y-4));
      sprs.push(scene.add.image((BX+b.tx+fx)*T+T/2,y-4-T,'fence',fx===0?0:fx===2?3:1).setOrigin(0.5,1).setDepth(y-4-T));
    }
    sprs.push(scene.add.sprite(x,y-T*0.7,'sheep').play('sheep-a').setOrigin(0.5,0.9).setDepth(y-T*0.7));
  } else {
    sprs.push(scene.add.image(x,y,texOf(b)).setOrigin(0.5,1).setDepth(y));
  }
  sprs[0].setInteractive({useHandCursor:true});
  sprs[0].on('pointerdown',(p,lx,ly,ev)=>{ if(!S.colocando){ select(b.id); ev.stopPropagation(); } });
  return {sprs,x,y};
}
function addBuilding(tipo,tx,ty,opt){
  opt=opt||{};
  const c=CAT[tipo];
  const b={id:S.nextId++, tipo, nivel:1, tx, ty, skin:'blue', var:tipo==='house'?rint(1,3):0,
    estado:opt.listo?'ok':'obra', obraT:0, obraDur:c.dur, mejorando:false, pawn:null, badge:null, barG:null};
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  setGrid(b,b.id);
  if(b.estado==='obra'){ b.sprs.forEach(s=>s.setAlpha(0.5)); b.barG=scene.add.graphics().setDepth(96000);
    b.builder=spawnPawn('pawn_blue', b.x+c.fw*T*0.42, b.y-8, true); }
  else if(c.prod) b.pawn=spawnWorker(b);
  S.buildings.push(b);
  return b;
}
function spawnPawn(tex,x,y,builder){
  const s=scene.add.sprite(x,y,tex).setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play(tex+'-i');
  if(builder){ s.dustEv=scene.time.addEvent({delay:900,loop:true,callback:()=>{
    const k=pick(['dust1','dust2']);
    const d=scene.add.sprite(x-T*0.6+rint(-10,10),y-20+rint(-8,8),k).setDepth(99999).setScale(0.9);
    d.play(k+'-a'); d.once('animationcomplete',()=>d.destroy());
  }}); }
  return s;
}
function spawnWorker(b){                                    // pawn productor con ida y vuelta
  const tex=b.tipo==='mina'?'wpick':'waxe';
  const useTool=b.tipo==='mina'||b.tipo==='lenador';
  const key=useTool?tex:'pawn_blue';
  const x0=b.x-CAT[b.tipo].fw*T*0.45, x1=b.x+CAT[b.tipo].fw*T*0.45, y=b.y+10;
  const s=scene.add.sprite(x0,y,useTool?key+'_blue_r':'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play(useTool?key+'-r':'pawn_blue-r');
  scene.tweens.add({targets:s,x:x1,duration:2600,yoyo:true,repeat:-1,
    onYoyo:()=>s.setFlipX(true), onRepeat:()=>s.setFlipX(false)});
  return s;
}
function destroySprites(b){
  b.sprs.forEach(s=>s.destroy());
  if(b.builder){ b.builder.dustEv&&b.builder.dustEv.remove(); b.builder.destroy(); b.builder=null; }
  if(b.pawn){ b.pawn.destroy(); b.pawn=null; }
  if(b.badge){ b.badge.destroy(); b.badge=null; }
  if(b.barG){ b.barG.destroy(); b.barG=null; }
}
function refreshBuilding(b){                                // re-render (skin/nivel/mover)
  destroySprites(b);
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  if(b.estado==='obra'){ b.sprs.forEach(s=>s.setAlpha(0.5)); b.barG=scene.add.graphics().setDepth(96000);
    b.builder=spawnPawn('pawn_blue', b.x+CAT[b.tipo].fw*T*0.42, b.y-8, true); }
  else { if(CAT[b.tipo].prod) b.pawn=spawnWorker(b); if(b.nivel>1) putBadge(b); }
}
function putBadge(b){
  b.badge=scene.add.text(b.x, b.y-8, 'N'+b.nivel, {fontFamily:'ui-monospace,monospace',fontSize:'13px',
    color:'#120d09', backgroundColor:'#c9a227', padding:{x:4,y:1}}).setOrigin(0.5,0).setDepth(97000);
}

/* ===== colocación ===== */
function startPlace(tipo,moverId){
  S.colocando={tipo,moverId:moverId||null};
  hidePanel();
  const c=CAT[tipo];
  if(ghostSpr){ghostSpr.destroy();ghostSpr=null;}
  const tex=CARD_IMG[tipo];
  if(tipo!=='lenador'&&tipo!=='granja'){
    ghostSpr=scene.add.image(0,0,moverId?texOf(byId(moverId)):(tex==='tree_anim'?null:tex)).setOrigin(0.5,1).setAlpha(0.55).setDepth(94000).setVisible(false);
  }
  hint((moverId?'Reubicando ':'Colocando ')+c.nom+' — verde = libre, rojo = ocupado. ESC para cancelar.');
}
function drawGhost(p){
  const c=CAT[S.colocando.tipo];
  ghostG.clear();
  const t=tileAt(p); if(!t){ if(ghostSpr)ghostSpr.setVisible(false); return; }
  const ok=canPlace(t.x,t.y,c.fw,c.fh,S.colocando.moverId);
  ghostG.fillStyle(ok?0x5fa55a:0xc94f45, 0.35).fillRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  ghostG.lineStyle(2, ok?0x5fa55a:0xc94f45, 0.9).strokeRect((BX+t.x)*T,(BY+t.y)*T,c.fw*T,c.fh*T);
  if(ghostSpr){ ghostSpr.setVisible(true).setPosition((BX+t.x)*T+c.fw*T/2,(BY+t.y+c.fh)*T); }
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
    sfx('door',0.55); toast(c.nom+' en obra. Un pawn ya está martillando.');
  }
  cancelPlace(); buildBar(); refreshHUD();
}
function cancelPlace(){ S.colocando=null; ghostG.clear(); if(ghostSpr){ghostSpr.destroy();ghostSpr=null;} hint(''); }

/* ===== economía ===== */
function pagar(costo){
  for(const k in costo){ const cur=k==='ambar'?S.ambar:S[k]; if(cur<costo[k]) return false; }
  for(const k in costo){ if(k==='ambar') S.ambar-=costo[k]; else S[k]-=costo[k]; }
  return true;
}
const costoTxt=c=>Object.entries(c).map(([k,v])=>`${v} ${k==='ambar'?'◆':k}`).join(' · ')||'gratis';

/* ===== selección y acciones ===== */
const byId=id=>S.buildings.find(b=>b.id===id);
function select(id){
  S.selId=id; const b=byId(id), c=CAT[b.tipo];
  $('selNom').textContent=c.nom+(b.tipo==='house'?' (estilo '+b.var+')':'');
  $('selLvl').textContent='Nivel '+b.nivel+(b.estado==='obra'?' · EN OBRA':'')+(b.skin==='red'?' · skin roja':'');
  const max=b.tipo==='castle'?MAXLVL.castle:MAXLVL.def;
  $('btnMejorar').disabled=!(b.estado==='ok'&&b.nivel<max&&c.up&&c.up[b.nivel-1]);
  $('btnMejorar').textContent=b.nivel<max&&c.up&&c.up[b.nivel-1]?'MEJORAR ('+costoTxt(c.up[b.nivel-1].costo)+')':'NIVEL MÁX';
  $('btnAcelerar').disabled=!(b.estado==='obra'&&S.aceleradas<S.ACEL_TOPE&&S.ambar>=10);
  $('btnAcelerar').textContent='◆ ACELERAR ('+(S.ACEL_TOPE-S.aceleradas)+' restantes · 10)';
  $('btnSkin').disabled=!(c.skins&&b.skin==='blue'&&S.ambar>=25);
  $('btnSkin').textContent=c.skins?(b.skin==='red'?'SKIN ROJA ✓':'◆ SKIN ROJA (25)'):'SIN SKIN';
  $('btnMover').disabled=b.estado==='obra';
  $('selpanel').classList.add('on');
}
function hidePanel(){ $('selpanel').classList.remove('on'); S.selId=null; }
$('btnCerrar').onclick=hidePanel;
$('btnMover').onclick=()=>{ const b=byId(S.selId); if(b) startPlace(b.tipo,b.id); };
$('btnMejorar').onclick=()=>{
  const b=byId(S.selId); if(!b) return; const up=CAT[b.tipo].up[b.nivel-1];
  if(!pagar(up.costo)){ sfx('creak',0.4); toast('No te alcanza para la mejora.'); return; }
  b.estado='obra'; b.obraT=0; b.obraDur=up.dur; b.mejorando=true; refreshBuilding(b);
  sfx('door',0.5); toast('Mejorando '+CAT[b.tipo].nom+' a nivel '+(b.nivel+1)+'.');
  select(b.id); refreshHUD();
};
$('btnAcelerar').onclick=()=>{
  const b=byId(S.selId); if(!b||b.estado!=='obra') return;
  if(S.aceleradas>=S.ACEL_TOPE||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; S.aceleradas++; b.obraT=b.obraDur;         // completa en el próximo tick
  sfx('coins',0.6); toast('Obra acelerada con $AMBAR (simulado — sink de F4).');
  refreshHUD(); select(b.id);
};
$('btnSkin').onclick=()=>{
  const b=byId(S.selId); if(!b||!CAT[b.tipo].skins||b.skin==='red') return;
  if(S.ambar<25){ sfx('creak',0.4); return; }
  S.ambar-=25; b.skin='red'; refreshBuilding(b);
  sfx('coins',0.6); toast('Skin roja aplicada — cosmético puro, cero ventaja.');
  refreshHUD(); select(b.id);
};
$('btnTiempo').onclick=()=>{ S.speed=S.speed===1?60:1; $('btnTiempo').textContent='⏱ ×'+S.speed; };

/* ===== barra de construcción (HTML) ===== */
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
      ?`<div style="width:64px;height:52px;margin:2px auto;background:url('assets/img/ts/${img==='sheep'?'../sheep':img}.png') no-repeat 0 0;background-size:${img==='sheep'?'200%':'400%'};image-rendering:pixelated"></div>`
      :`<img src="assets/img/ts/${img}.png" alt="">`}
      <div class="nom">${c.nom}${c.premium?' ◆':''}</div>
      <div class="costo"><b>${costoTxt(c.costo)}</b><br>${c.dur>=3600?(c.dur/3600)+' h':(c.dur/60)+' min'}</div>
      ${lock?`<div class="req">🔒 ${lock}</div>`:''}`;
    if(!lock) el.onclick=()=>{ if(S.colocando&&S.colocando.tipo===tipo){cancelPlace();buildBar();return;} startPlace(tipo,null); buildBar(); };
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
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3200); }
function hint(msg){ const h=$('hint'); h.textContent=msg; h.classList.toggle('on',!!msg); }

/* ===== loop ===== */
let hudAcc=0;
function update(time,delta){
  const dt=delta/1000*S.speed;
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
        b.estado='ok';
        if(b.mejorando){ b.nivel++; b.mejorando=false;
          if(b.tipo==='castle'){ S.thNivel=b.nivel; buildBar(); toast('¡Ayuntamiento nivel '+b.nivel+'! Se desbloquearon edificios.'); } }
        refreshBuilding(b);
        for(let i=0;i<4;i++){ const k=pick(['dust1','dust2']);
          const d=scene.add.sprite(b.x+rint(-30,30),b.y-rint(0,30),k).setDepth(99999).setScale(1.2);
          d.play({key:k+'-a',delay:i*70}); d.once('animationcomplete',()=>d.destroy()); }
        sfx('bong',0.6);
        if(!b.mejorando&&S.selId===b.id) select(b.id);
      }
    } else if(c.prod){
      const rate=RATE*(1+0.4*(b.nivel-1));
      const k=c.prod.res==='oro'?'oro':c.prod.res==='madera'?'madera':'comida';
      if(S[k]<CAP) S[k]=Math.min(CAP,S[k]+rate*dt);
    }
  }
  hudAcc+=delta;
  if(hudAcc>250){ hudAcc=0; refreshHUD(); }
}
