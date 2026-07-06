/* ÁMBAR · Mi Aldea v5 — PROTOTIPO (cliente puro, in-memory)
   Estilo Age of Empires: mapa continental con niebla de guerra, minimapa,
   recursos naturales (árboles / vetas / animales), aldeanos y milicia con vida,
   órdenes por clic derecho. Cada obra la levanta un aldeano de verdad.
   Sin persistencia: recargar reinicia la partida. */

const $=id=>document.getElementById(id);
/* ===== idioma (ES por defecto, se puede cambiar a EN en el menú) ===== */
let LANG = (function(){ try{ return localStorage.getItem('aoa_lang')||'es'; }catch(e){ return 'es'; } })();
const L=(es,en)=>LANG==='en'?en:es;                 // devuelve el texto en el idioma activo
const T=64, GW=30, GH=22, BX=4, BY=4;
const WT=GW+BX*2, HT=GH+BY*2, WORLD_W=WT*T, WORLD_H=HT*T;
const MAR=2600;                                   // mar extra alrededor del mundo (cubre pantallas anchas: nada de vacío negro)
const FOGR=224;                                   // radio del pincel de niebla (px)
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];
const randAv=()=>'av'+String(rint(1,25)).padStart(2,'0');   // avatar humano real del pack (av01..av25)
const EN_AV=[1,6,7,8,9,10,11,12,13];
const randEnAv=()=>'en'+String(pick(EN_AV)).padStart(2,'0');  // avatar de enemigo real (crónica de asaltos)

/* ===== catálogo de edificios (mina/leñador = nodos naturales; castle = Ayuntamiento/TC) ===== */
const CAP=2000;
const MAXLVL={castle:3, def:2};
const CAT={   // reqWave: oleadas que hay que sobrevivir para desbloquear (progresión defensiva)
  castle:    {get nom(){return L('Ayuntamiento','Town Hall');}, fw:5,fh:2, costo:{oro:300,madera:300}, dur:120, unico:true, skins:true, esTC:true, hp:300},
  muralla:   {get nom(){return L('Muralla','Wall');},      fw:1,fh:1, costo:{madera:30},         dur:12,   reqWave:0, muro:true, hp:260, get desc(){return L('Empalizada de madera (260 de resistencia). Barata y rápida: frená la horda desde la primera oleada. Colocá una línea arrastrando.','Wooden palisade (260 HP). Cheap and fast: stop the horde from the first wave. Drag to place a line.');}},
  house:     {get nom(){return L('Casa','House');},         fw:2,fh:2, costo:{madera:100},        dur:120,  reqWave:0, skins:true, up:[{costo:{madera:200},dur:120}]},
  granja:    {get nom(){return L('Granja','Farm');},       fw:3,fh:2, costo:{madera:120},        dur:180,  reqWave:0, prod:'comida', reserva:400, hp:160, up:[{costo:{oro:250},dur:200}]},
  torre:     {get nom(){return L('Torre','Tower');},        fw:2,fh:2, costo:{oro:150,madera:150},dur:240, reqWave:1, skins:true, hp:90, up:[{costo:{oro:500},dur:300}]},
  cuartel:   {get nom(){return L('Cuartel','Barracks');},        fw:3,fh:2, costo:{madera:300},        dur:300, reqWave:1, skins:true, up:[{costo:{oro:600},dur:360}]},
  murallon:  {get nom(){return L('Murallón','Stone Wall');},     fw:1,fh:1, costo:{madera:60,oro:20},  dur:16,   reqWave:2, muro:true, hp:520, get desc(){return L('Muro de piedra reforzado (520 de resistencia: el doble que la Muralla). Cuesta madera + oro y se desbloquea en la oleada 2, para el frente donde más pegan.','Reinforced stone wall (520 HP: double the Wall). Costs wood + gold and unlocks on wave 2, for the front line where they hit hardest.');}},
  arqueria:  {get nom(){return L('Arquería','Archery Range');},     fw:3,fh:2, costo:{oro:300},           dur:360, reqWave:3, reqB:'cuartel', skins:true, up:[{costo:{madera:600},dur:360}]},
  monasterio:{get nom(){return L('Monasterio','Monastery');},   fw:3,fh:2, costo:{ambar:40},          dur:360, reqWave:4, skins:true, premium:true, up:[{costo:{ambar:60},dur:360}]},
};
const RATE=0.6, BUFFER=b=>120*b.nivel;
const UNIDADES={
  aldeano: {get nom(){return L('Aldeano','Villager');}, costo:{comida:50},        de:['castle','house']},
  guerrero:{get nom(){return L('Guerrero','Warrior');},costo:{oro:60,comida:20}, de:['cuartel'],    hp:60},
  arquero: {get nom(){return L('Arquero','Archer');}, costo:{oro:80,comida:20}, de:['arqueria'],   hp:34},
  monje:   {get nom(){return L('Monje','Monk');},   costo:{oro:60,comida:40}, de:['monasterio'], hp:34, sana:true},
};
const POPCAP=()=>5+2*S.buildings.filter(b=>b.tipo==='house'&&b.estado==='ok').length;
const popTotal=()=>S.ald.length+S.units.length;
const CARD_IMG={castle:'castle_blue',house:'house1_blue',granja:'sheep',muralla:'wall',murallon:'wall',
  torre:'tower_blue',cuartel:'barracks_blue',arqueria:'archery_blue',monasterio:'monastery_blue'};
const RES_IMG={oro:'res_gold',madera:'res_wood',comida:'res_meat'};
const SKINS=['blue','red','purple','yellow'];                 // 4 paletas del pack para tus edificios
const SKINNOM={get blue(){return L('azul','blue');},get red(){return L('roja','red');},get purple(){return L('púrpura','purple');},get yellow(){return L('dorada','gold');}};
const resNom=k=>({oro:L('oro','gold'),madera:L('madera','wood'),comida:L('comida','food'),ambar:'◆'}[k]||k);
const SKINCOL={blue:'#f4ecda',red:'#e5533a',purple:'#b06be0',yellow:'#ffd24a'};

/* ===== nodos naturales y fauna ===== */
const NODO={
  arbol:{get nom(){return L('Árbol','Tree');},    res:'madera', reserva:120, tool:'waxe',  fw:1,fh:1, get verbo(){return L('TALAR','CHOP');}},
  veta: {get nom(){return L('Veta de oro','Gold Vein');},res:'oro',  reserva:350, tool:'wpick', fw:2,fh:1, get verbo(){return L('MINAR','MINE');}},
  pepita:{get nom(){return L('Pepita de oro','Gold Nugget');},res:'oro', reserva:36, tool:'wpick', fw:1,fh:1, get verbo(){return L('MINAR','MINE');}},
};
const FAUNA={
  oveja: {get nom(){return L('Oveja','Sheep');},   tex:'sheep',     anim:'sheep-a', hp:24, carne:80,  dmg:0,  esc:1.0, oy:0.9,  huye:true},
  jabali:{get nom(){return L('Jabalí','Boar');},  tex:'pig_idle',  anim:'cerdo-i', hp:44, carne:150, dmg:4,  esc:0.55,oy:0.72, huye:false},
  oso:   {get nom(){return L('Oso','Bear');},     tex:'bear_idle', anim:'bear-i',  hp:90, carne:300, dmg:11, esc:0.6, oy:0.8,  huye:false, run:'bear-r'},
  toro:  {nom:'The Black Bull', tex:'minotaur_idle', anim:'toro-i', hp:170, carne:450, dmg:17, esc:0.6, oy:0.82, huye:false, run:'toro-r', aoa:25, jefe:true},
};
const CRITTER={
  snake: {get nom(){return L('serpiente','snake');},tex:'snake_idle', anim:'snake-i',  esc:0.5, oy:0.75},
  spider:{get nom(){return L('araña','spider');},    tex:'spider_idle',anim:'spider-i', esc:0.42,oy:0.7},
};

/* ===== misiones ===== */
const QUESTS=[
  {get txt(){return L('Mandá un aldeano a TALAR un árbol (clic der.)','Send a villager to CHOP a tree (right-click)');},  check:()=>S.stats.talado>=30, rew:{madera:60,ambar:10}},
  {get txt(){return L('Construí una Casa (más cupo de población)','Build a House (more population cap)');},      check:()=>S.stats.casasBuilt>=1, rew:{madera:80,ambar:10}},
  {get txt(){return L('Construí una Torre defensiva antes de la oleada','Build a defensive Tower before the wave');},check:()=>S.buildings.some(b=>b.tipo==='torre'&&b.estado==='ok'), rew:{oro:80,ambar:10}},
  {get txt(){return L('Resistí la OLEADA 1','Survive WAVE 1');},                            check:()=>S.wave>=1&&S.phase==='prep', rew:{oro:100,ambar:10}},
  {get txt(){return L('Construí un Cuartel y entrená un Guerrero','Build Barracks and train a Warrior');},      check:()=>S.buildings.some(b=>b.tipo==='cuartel'&&b.estado==='ok')&&S.stats.entrenados>=1, rew:{oro:120}},
  {get txt(){return L('Resistí la OLEADA 3 (aparecen piratas por el mar)','Survive WAVE 3 (pirates come by sea)');}, check:()=>S.wave>=3&&S.phase==='prep', rew:{ambar:30,oro:120}},
  {get txt(){return L('Miná 30 de oro y tené una Arquería','Mine 30 gold and have an Archery Range');},             check:()=>S.stats.minado>=30&&S.buildings.some(b=>b.tipo==='arqueria'&&b.estado==='ok'), rew:{ambar:35}},
  {get txt(){return L('Derrotá a THE BLACK BULL en una oleada jefe (Oleada 5)','Defeat THE BLACK BULL in a boss wave (Wave 5)');}, check:()=>S.stats.bull>=1, rew:{ambar:60,oro:200}},
  {get txt(){return L('Llegá a 3000 puntos de asedio','Reach 3000 siege points');},                  check:()=>S.score>=3000||S.best>=3000, rew:{ambar:100}},
];

/* ===== estado ===== */
const S={ oro:220, madera:260, comida:130, ambar:60,
  speed:1, aceleradas:0, ACEL_TOPE:3,
  grid:Array.from({length:GH},()=>Array(GW).fill(null)),
  land:Array.from({length:GH},()=>Array(GW).fill(false)),
  elev:Array.from({length:GH},()=>Array(GW).fill(0)),
  cliff:Array.from({length:GH},()=>Array(GW).fill(false)),
  bridge:Array.from({length:GH},()=>Array(GW).fill(false)),
  bridgeDir:Array.from({length:GH},()=>Array(GW).fill(null)),
  explored:Array.from({length:GH},()=>Array(GW).fill(false)),
  buildings:[], nodes:[], animals:[], critters:[], piles:[], ald:[], units:[], allies:[], dialogOn:true, nextId:1,
  aldElegido:null, colocando:null, sel:null,
  wave:0, phase:'prep', phaseT:120, score:0, best:0, kills:0, over:false,   // EL ASEDIO (primera oleada a los 2 min)
  tSurv:0, recursos:0,                              // récord = tiempo aguantado + recursos obtenidos + enemigos derrotados
  carne:{activo:false, t:0},                        // carnicería: por 100 de oro genera carne hasta 50
  qIx:0, stats:{talado:0,minado:0,cazado:0,cosechas:0,raids:0,skins:0,aldCreados:0,entrenados:0,casasBuilt:0,bull:0},
  raid:{on:false,gob:[],war:[],t:0,cool:180,tLeft:0,dur:0} };
const PREP0=120, PREPW=40;                          // preparación: 2 min la primera, 40s entre oleadas
const DUR_OLEADA=w=>Math.min(90,45+w*4);            // el asedio dura un tiempo fijo (como en otros juegos), no hasta que barran todo
function calcScore(){ return Math.floor(S.tSurv) + Math.floor(S.recursos) + S.kills*15; }  // récord por tiempo, recursos y bajas
let scene, ghostG, ghostSpr=null, fogRT=null, homePos={x:0,y:0}, overview=false;
// cursores REALES del pack (Cursor_01/02 + Icon_05 espada)
const CUR={
  def:"url('assets/img/ui/cur_arrow.png') 1 1, auto",
  hand:"url('assets/img/ui/cur_hand.png') 3 1, pointer",
  sword:"url('assets/img/ui/cur_sword.png') 15 15, auto",
  meat:"url('assets/img/ui/cur_meat.png') 15 12, auto",
  wood:"url('assets/img/ui/cur_wood.png') 15 12, auto"
};
function makeCursors(){ /* los cursores ahora son PNG del pack (ver CUR) */ }
let curCtx=null;   // cursor contextual por hover (pisa al base mientras esté sobre un objetivo)
function applyCursor(){ if(!scene||!scene.game) return;
  const base=(S.sel&&S.sel.t==='militar')?CUR.sword:CUR.def;
  scene.game.canvas.style.cursor=curCtx||base; }
// al pasar el mouse con una unidad seleccionada: carne sobre animal (aldeano), espada sobre animal/enemigo (militar), madera/oro sobre nodo
function hoverCursor(p){
  const sel=S.sel; curCtx=null;
  if(sel&&(sel.t==='aldeano'||sel.t==='militar'||sel.t==='allie')){
    const wp=scene.cameras.main.getWorldPoint(p.x,p.y);
    const enAnimal=S.animals.some(m=>!m.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,m.spr.x,m.spr.y)<40);
    const enEnemigo=S.raid.gob.some(g=>!g.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,g.spr.x,g.spr.y)<40);
    if(sel.t==='militar'||sel.t==='allie'){ if(enAnimal||enEnemigo) curCtx=CUR.sword; }
    else if(sel.t==='aldeano'){
      if(enAnimal) curCtx=CUR.meat;
      else { const t=tileAt(p); if(t){ const occ=S.grid[t.y][t.x];
        if(typeof occ==='string'&&occ[0]==='n'){ const nd=S.nodes.find(n=>n.id===occ); if(nd) curCtx=nd.res==='madera'?CUR.wood:CUR.def; } } }
    }
  }
  applyCursor();
}
let baseZoom=1, mmCtx=null, mmBase=null, mmBlink=false;
function sfx(k,v){ try{ scene&&scene.sound.play('s_'+k,{volume:v||0.5}); }catch(e){} }

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#060a0d',   // oscuro: fuera del mapa se lee como niebla, sin “huecos” claros
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  scene:{preload,create,update}});

function preload(){
  // barra de carga del splash: avanza con el progreso real del preload
  this.load.on('progress',p=>{ const b=document.getElementById('splashBar'); if(b) b.style.width=Math.round(p*100)+'%';
    const r=document.getElementById('splashRunner'); if(r) r.style.left=Math.round(p*100)+'%'; });   // el jinete avanza con la barra
  const TSB='assets/img/ts/';
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('elev',TSB+'elevation.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('tmg',TSB+'tilemap_grass.png',{frameWidth:64,frameHeight:64});   // Tilemap_color1 del pack: grass-on-elevation real (cima verde + cara de piedra)
  this.load.spritesheet('bridge',TSB+'bridge.png',{frameWidth:64,frameHeight:64});        // puente para cruzar el agua
  this.load.image('water',TSB+'water.png');
  this.load.spritesheet('foam',TSB+'foam.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('tree',TSB+'tree_anim.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fence',TSB+'fence.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('wall',TSB+'wall.png',{frameWidth:64,frameHeight:64});   // muralla de madera
  this.load.spritesheet('dust1',TSB+'dust1.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust2',TSB+'dust2.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('fire',TSB+'fire.png',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('dead',TSB+'dead.png',{frameWidth:128,frameHeight:256});
  this.load.image('castle_blue',TSB+'castle_blue.png');      // el castillo sólo tiene azul/rojo en el pack
  this.load.image('castle_red',TSB+'castle_red.png');
  for(const c of ['blue','red','purple','yellow']){          // 4 paletas: skins de tus edificios (casas/torre/cuartel/arquería/monasterio)
    for(const b of ['house1','house2','house3','tower','barracks','archery','monastery'])
      this.load.image(b+'_'+c,TSB+b+'_'+c+'.png');
    this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  }
  // reino rival: leva humana enemiga (peón + arquero púrpura)
  this.load.spritesheet('archer_purple_i',TSB+'archer_purple_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('archer_purple_r',TSB+'archer_purple_r.png',{frameWidth:192,frameHeight:192});
  // aldeano cargando oro (vuelta de la mina)
  this.load.spritesheet('wgold_blue_i',TSB+'wgold_blue_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('wgold_blue_r',TSB+'wgold_blue_r.png',{frameWidth:192,frameHeight:192});
  // animaciones de ataque de gnomo y esqueleto
  this.load.spritesheet('gnome_a',TSB+'gnome_a.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('skull_a',TSB+'skull_a.png',{frameWidth:192,frameHeight:192});
  this.load.image('castle_black',TSB+'castle_black.png');   // Ayuntamiento Edad III (Imperio)
  this.load.spritesheet('warrior_i','assets/img/ts/warrior_i.png',{frameWidth:192,frameHeight:192}); // guerrero moderno (192px)
  this.load.spritesheet('warrior_r','assets/img/ts/warrior_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('warrior_a','assets/img/ts/warrior_a.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('archer_blue_i','assets/img/ts/archer_blue_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('archer_blue_r','assets/img/ts/archer_blue_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('monk_i','assets/img/ts/monk_blue_i.png',{frameWidth:192,frameHeight:192});   // monje sanador
  this.load.spritesheet('monk_r','assets/img/ts/monk_blue_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('explosion',TSB+'explosion.png',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('bomb',TSB+'bomb.png',{frameWidth:128,frameHeight:128});
  this.load.image('cannonball',TSB+'cannonball.png');
  this.load.spritesheet('pawn_hammer',TSB+'pawn_hammer.png',{frameWidth:192,frameHeight:192});        // aldeano construyendo
  this.load.spritesheet('pig_idle',TSB+'pig_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pig_run',TSB+'pig_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('bear_idle',TSB+'bear_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('bear_run',TSB+'bear_run.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('snake_idle',TSB+'snake_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('snake_run',TSB+'snake_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spider_idle',TSB+'spider_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('spider_run',TSB+'spider_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('lizard_idle',TSB+'lizard_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('lizard_run',TSB+'lizard_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('turtle_walk',TSB+'turtle_walk.png',{frameWidth:320,frameHeight:320});
  this.load.spritesheet('minotaur_idle',TSB+'minotaur_idle.png',{frameWidth:320,frameHeight:320});
  this.load.spritesheet('minotaur_walk',TSB+'minotaur_walk.png',{frameWidth:320,frameHeight:320});
  this.load.spritesheet('cave',TSB+'cave.png',{frameWidth:192,frameHeight:192});
  this.load.image('goblin_house',TSB+'goblin_house.png');
  this.load.spritesheet('goblin_tnt',TSB+'goblin_tnt.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('goblin_torch',TSB+'goblin_torch.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('gnoll_idle',TSB+'gnoll_idle.png',{frameWidth:192,frameHeight:192});     // enemigos variados
  this.load.spritesheet('gnoll_walk',TSB+'gnoll_walk.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shaman_idle',TSB+'shaman_idle.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('shaman_run',TSB+'shaman_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pigrider_idle',TSB+'pigrider_idle.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('pigrider_run',TSB+'pigrider_run.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('thief_idle',TSB+'thief_idle.png',{frameWidth:192,frameHeight:192});     // ladrón (roba recursos)
  this.load.spritesheet('thief_run',TSB+'thief_run.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('troll_i',TSB+'troll_i.png',{frameWidth:384,frameHeight:384});           // troll pesado
  this.load.spritesheet('troll_r',TSB+'troll_r.png',{frameWidth:384,frameHeight:384});
  this.load.spritesheet('troll_a',TSB+'troll_a.png',{frameWidth:384,frameHeight:384});
  this.load.spritesheet('bfish_i',TSB+'bfish_i.png',{frameWidth:192,frameHeight:192});           // pez bomba (naval)
  this.load.spritesheet('bfish_r',TSB+'bfish_r.png',{frameWidth:192,frameHeight:192});
  // ---- assets REALES del pack: partículas, íconos, enemigos nuevos, deco ----
  this.load.spritesheet('pfx_dust',TSB+'pfx_dust.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('pfx_boom',TSB+'pfx_boom.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pfx_fire',TSB+'pfx_fire.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('pfx_splash',TSB+'pfx_splash.png',{frameWidth:192,frameHeight:192});
  for(let i=1;i<=12;i++) this.load.image('ic'+i,'assets/img/ui/ic'+String(i).padStart(2,'0')+'.png');
  this.load.spritesheet('gnome_i',TSB+'gnome_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('gnome_r',TSB+'gnome_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('skull_i',TSB+'skull_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('skull_r',TSB+'skull_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('panda_i',TSB+'panda_i.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('panda_r',TSB+'panda_r.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('hshark_i',TSB+'hshark_i.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('hshark_r',TSB+'hshark_r.png',{frameWidth:192,frameHeight:192});
  this.load.image('dead_tree',TSB+'dead_tree.png');
  this.load.image('skull_spike',TSB+'skull_spike.png');
  this.load.image('bones1',TSB+'bones1.png');
  this.load.spritesheet('seahorse',TSB+'seahorse.png',{frameWidth:192,frameHeight:192});   // barco caballito de mar (transporte pirata)
  this.load.spritesheet('ptower',TSB+'pirate_tower.png',{frameWidth:128,frameHeight:192});  // torre pirata flotante (bombardea)
  for(let i=1;i<=6;i++) this.load.image('goldstone'+i,TSB+'goldstone'+i+'.png');            // pepitas de oro (deco)
  this.load.image('banner_h',TSB+'banner_h.png');                                                // estandartes decorativos
  this.load.image('banner_v',TSB+'banner_v.png');
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
  for(let i=1;i<=18;i++) this.load.image('deco'+i,TSB+'deco'+String(i).padStart(2,'0')+'.png');
  this.load.spritesheet('sboat',TSB+'sboat.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('boat',TSB+'boat.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('shark',TSB+'shark.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pshark_i',TSB+'pshark_i.png',{frameWidth:192,frameHeight:192});   // pirata: tiburón remero
  this.load.spritesheet('pshark_r',TSB+'pshark_r.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pshark_a',TSB+'pshark_a.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pboat',TSB+'pboat.png',{frameWidth:192,frameHeight:192});         // barco pirata (caballito de mar)
  this.load.spritesheet('duck',TSB+'duck.png',{frameWidth:32,frameHeight:32});
  ['door','bong','coins','creak','bell','clash','fire','latch','chop','sword','arrow','explode','block'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}
function makeTri(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.beginPath();g.moveTo(0,0);g.lineTo(12,0);g.lineTo(6,9);g.closePath();g.fillPath();g.generateTexture('tri',12,9);g.destroy();}
function makeBird(s){const g=s.add.graphics({add:false});g.lineStyle(2,0x22222c,1);g.beginPath();g.moveTo(0,5);g.lineTo(6,0);g.lineTo(12,5);g.strokePath();g.generateTexture('bird',13,7);g.destroy();}
function makeSword(s){const g=s.add.graphics({add:false});
  g.fillStyle(0x120d09,1);g.fillRect(7,1,6,26);g.fillRect(2,23,16,5);g.fillRect(7,27,6,11);      // contorno
  g.fillStyle(0xd8dde6,1);g.fillRect(8,2,4,22);g.fillStyle(0xf2f5fa,1);g.fillRect(9,2,1,22);       // hoja + brillo
  g.fillStyle(0xc9a227,1);g.fillRect(3,24,14,3);                                                    // guarda
  g.fillStyle(0x7a5a34,1);g.fillRect(8,28,4,8);g.fillStyle(0xc9a227,1);g.fillRect(7,35,6,3);        // mango + pomo
  g.generateTexture('sword',20,40);g.destroy();}
function makeFogBrush(s){
  const d=FOGR*2, tex=s.textures.createCanvas('fogbrush',d,d), ctx=tex.getContext();
  const g=ctx.createRadialGradient(FOGR,FOGR,FOGR*0.35,FOGR,FOGR,FOGR);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.72,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,d,d); tex.refresh();
}
function makeGrassBrush(s){
  const d=128, tex=s.textures.createCanvas('gbrush',d,d), ctx=tex.getContext();
  const g=ctx.createRadialGradient(d/2,d/2,0,d/2,d/2,d/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,d,d); tex.refresh();
}
// manchas de pasto de distinto tono para que el suelo no sea un verde plano
function paintGrassPatches(rt){
  const brush=scene.add.image(0,0,'gbrush').setVisible(false);
  const claros=[0x6fa04a,0x7fae52,0x8dbb5e], oscuros=[0x2f5730,0x244a28,0x39623a];
  for(let i=0;i<90;i++){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(!S.land[ty][tx]) continue;
    const claro=Math.random()<0.5;
    brush.setPosition((BX+tx)*T+rint(-20,20)+T/2,(BY+ty)*T+rint(-20,20)+T/2)
         .setTint(pick(claro?claros:oscuros))
         .setAlpha(Phaser.Math.FloatBetween(0.05,claro?0.13:0.18))
         .setScale(Phaser.Math.FloatBetween(0.7,1.9));
    rt.draw(brush);
  }
  // pasto de la MESETA con tono más frío/oscuro por nivel: el desnivel se lee de un vistazo
  const alto1=[0x3d6a5a,0x2e5748,0x4a7560], alto2=[0x27443a,0x1e3830,0x315a4a];
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]){
    const lv=S.elev[y][x];
    brush.setPosition((BX+x)*T+T/2,(BY+y)*T+T/2).setTint(pick(lv===2?alto2:alto1))
         .setAlpha(Phaser.Math.FloatBetween(lv===2?0.22:0.14, lv===2?0.34:0.24)).setScale(1.25);
    rt.draw(brush);
  }
  // sombra suave al pie de cada acantilado, para dar volumen a la altura
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.cliff[y][x]){
    brush.setPosition((BX+x)*T+T/2,(BY+y)*T+T*0.9).setTint(0x000000)
         .setAlpha(0.14).setScale(1.0);
    rt.draw(brush);
  }
  brush.destroy();
}

/* ===== mapa continental (tierra grande + costa irregular + mar/lagos + mesetas) ===== */
const isIn=(x,y)=>x>=0&&x<GW&&y>=0&&y<GH;
const isLand=(x,y)=>isIn(x,y)&&S.land[y][x];
const ocupado=(x,y)=>isIn(x,y)&&S.grid[y][x]!==null;         // edificio / nodo / escenario ocupan la celda
const esPuente=(x,y)=>isIn(x,y)&&S.bridge[y][x];
const walkable=(x,y)=>(isLand(x,y)||esPuente(x,y))&&!(isIn(x,y)&&S.cliff[y][x])&&!ocupado(x,y);   // el puente cruza el agua; no se atraviesan edificios
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
  // mesetas de DOS niveles: bloques COHERENTES (pocas, sólidas, borde suave)
  const nMes=rint(2,3);
  for(let m=0;m<nMes;m++){
    let mx=0,my=0,tr=0;
    do{ mx=rint(5,GW-6); my=rint(3,Math.floor(GH*0.5)); tr++; }while(tr<50&&!isLand(mx,my));
    const mr=Phaser.Math.FloatBetween(2.6,3.6), ph=Math.random()*6.28;
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
      const wob=0.28*Math.sin(Math.atan2(y-my,x-mx)*2+ph);   // borde apenas orgánico, sin púas
      if(S.land[y][x]&&Math.hypot(x-mx,y-my)<mr+wob&&y<GH-3) S.elev[y][x]=1;
    }
  }
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(S.elev[y][x]&&!isLand(x,y+1)) S.elev[y][x]=0;
  // SEGUNDO nivel: una cima elevada dentro de las mesetas grandes
  for(let k=0;k<3;k++){
    let bx=0,by=0,tr=0,ok=false;
    do{ bx=rint(3,GW-4); by=rint(2,Math.floor(GH*0.55)); tr++; ok=S.elev[by][bx]===1; }while(tr<60&&!ok);
    if(!ok) continue;
    const br=Phaser.Math.FloatBetween(1.1,2.0), ph2=Math.random()*6.28;
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
      const wob=0.35*Math.sin(Math.atan2(y-by,x-bx)*3+ph2);
      if(S.elev[y][x]===1 && Math.hypot(x-bx,y-by)<br+wob) S.elev[y][x]=2;
    }
  }
  // erosión: sacar protrusiones finas/aisladas para que las mesetas sean BLOQUES coherentes (nada de púas sueltas)
  for(let it=0;it<3;it++){
    const snap=S.elev.map(r=>r.slice());
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){ if(!snap[y][x]) continue;
      let altos=0; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(isIn(x+dx,y+dy)&&snap[y+dy][x+dx]>=snap[y][x]) altos++;
      if(altos<2) S.elev[y][x]=snap[y][x]-1;   // menos de 2 vecinos del mismo nivel → baja un escalón
    }
  }
  // el nivel-2 nunca toca el borde directo: siempre queda un escalón de nivel-1 alrededor
  for(let it=0;it<2;it++)for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]===2){
    let expuesto=false;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(!(isIn(x+dx,y+dy)&&S.elev[y+dy][x+dx]>=1)) expuesto=true;
    if(expuesto) S.elev[y][x]=1;
  }
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]&&!isLand(x,y+1)) S.elev[y][x]=0;   // no colgar sobre el agua
  // acantilado: una fila de piedra por cada escalón que baja hacia el sur
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const aca=S.elev[y][x], deb=isIn(x,y+1)?S.elev[y+1][x]:0;
    if(aca>deb && isIn(x,y+1)) S.cliff[y+1][x]=true;
  }
  buildBridges();
}
// puentes: cruzan canales angostos de agua entre dos porciones de tierra (los hace transitables)
function buildBridges(){
  let puestos=0;
  for(let y=2;y<GH-2 && puestos<2;y++)for(let x=1;x<GW-4;x++){           // horizontales
    if(S.land[y][x]||!S.land[y][x-1]||S.elev[y][x-1]) continue;
    let k=0; while(x+k<GW && !S.land[y][x+k]) k++;
    if(k>=1 && k<=4 && x+k<GW && S.land[y][x+k] && !S.elev[y][x+k]){
      for(let i=0;i<k;i++){ S.bridge[y][x+i]=true; S.bridgeDir[y][x+i]='h'; }
      puestos++; x+=k+2; if(puestos>=2)break;
    }
  }
  for(let x=2;x<GW-2 && puestos<2;x++)for(let y=1;y<GH-4;y++){            // verticales
    if(S.land[y][x]||!S.land[y-1][x]||S.elev[y-1][x]) continue;
    let k=0; while(y+k<GH && !S.land[y+k][x]) k++;
    if(k>=1 && k<=4 && y+k<GH && S.land[y+k][x] && !S.elev[y+k][x]){
      for(let i=0;i<k;i++){ S.bridge[y+i][x]=true; S.bridgeDir[y+i][x]='v'; }
      puestos++; y+=k+2; if(puestos>=2)break;
    }
  }
}
function gIdx(x,y){
  const n=isLand(x,y-1), s=isLand(x,y+1), w=isLand(x-1,y), e=isLand(x+1,y);
  if(n&&s&&w&&e) return 11;
  if(!n&&!w) return 0; if(!n&&!e) return 2; if(!s&&!w) return 20; if(!s&&!e) return 22;
  if(!n) return 1; if(!s) return 21; if(!w) return 10; if(!e) return 12; return 11;
}
// cima de meseta con pasto: autotile del Tilemap_color1 (frames 5-35 = grass-on-elevation)
function geIdx(x,y){
  const lv=S.elev[y][x];
  const inE=(a,b)=>isIn(a,b)&&S.elev[b][a]>=lv;
  const n=inE(x,y-1), s=inE(x,y+1), w=inE(x-1,y), e=inE(x+1,y);
  if(n&&s&&w&&e) return 15;                          // interior (pasto lleno)
  if(!n&&!w) return 5; if(!n&&!e) return 8; if(!s&&!w) return 32; if(!s&&!e) return 35;   // esquinas
  if(!n) return 6; if(!s) return 33; if(!w) return 14; if(!e) return 17;                  // bordes
  return 15;
}
// cara de acantilado (frames 41-44): piedra teal bajo el borde sur de la meseta
function gcIdx(x,y){
  const l=isIn(x-1,y)&&S.cliff[y][x-1], r=isIn(x+1,y)&&S.cliff[y][x+1];
  return l&&r?42 : (!l&&r)?41 : (l&&!r)?44 : 43;
}

function create(){
  scene=this; makeDot(this); makeTri(this); makeBird(this); makeFogBrush(this); makeGrassBrush(this); makeSword(this); makeCursors(); applyCursor();
  buildMap();
  const an=this.anims;
  an.create({key:'foam-a',frames:an.generateFrameNumbers('foam',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'tree-a',frames:an.generateFrameNumbers('tree',{start:0,end:3}),frameRate:4,repeat:-1});
  an.create({key:'sheep-a',frames:an.generateFrameNumbers('sheep',{start:0,end:1}),frameRate:3,repeat:-1});
  an.create({key:'dust1-a',frames:an.generateFrameNumbers('dust1',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'dust2-a',frames:an.generateFrameNumbers('dust2',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'fire-a',frames:an.generateFrameNumbers('fire',{start:0,end:6}),frameRate:10,repeat:-1});
  an.create({key:'dead-a',frames:an.generateFrameNumbers('dead',{start:0,end:6}),frameRate:9,repeat:0});
  for(const c of ['blue','red','purple','yellow']){
    an.create({key:'pawn_'+c+'-i',frames:an.generateFrameNumbers('pawn_'+c,{start:0,end:5}),frameRate:6,repeat:-1});
    an.create({key:'pawn_'+c+'-r',frames:an.generateFrameNumbers('pawn_'+c,{start:6,end:11}),frameRate:10,repeat:-1});
  }
  // reino rival: arquero púrpura enemigo
  an.create({key:'rarq-i',frames:an.generateFrameNumbers('archer_purple_i',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'rarq-r',frames:an.generateFrameNumbers('archer_purple_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  // aldeano cargando oro
  an.create({key:'wgold-i',frames:an.generateFrameNumbers('wgold_blue_i',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'wgold-r',frames:an.generateFrameNumbers('wgold_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  // ataques de gnomo y esqueleto
  an.create({key:'gnome-a',frames:an.generateFrameNumbers('gnome_a',{start:0,end:-1}),frameRate:12,repeat:0});
  an.create({key:'skull-a',frames:an.generateFrameNumbers('skull_a',{start:0,end:-1}),frameRate:12,repeat:0});
  an.create({key:'war-i',frames:an.generateFrameNumbers('warrior_i',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'war-r',frames:an.generateFrameNumbers('warrior_r',{start:0,end:5}),frameRate:11,repeat:-1});
  an.create({key:'war-a',frames:an.generateFrameNumbers('warrior_a',{start:0,end:3}),frameRate:14,repeat:0});
  an.create({key:'monk-i',frames:an.generateFrameNumbers('monk_i',{start:0,end:5}),frameRate:7,repeat:-1});
  an.create({key:'monk-r',frames:an.generateFrameNumbers('monk_r',{start:0,end:3}),frameRate:9,repeat:-1});
  an.create({key:'boom',frames:an.generateFrameNumbers('explosion',{start:0,end:8}),frameRate:16,repeat:0});
  an.create({key:'bomb-a',frames:an.generateFrameNumbers('bomb',{start:0,end:3}),frameRate:12,repeat:-1});
  an.create({key:'phammer',frames:an.generateFrameNumbers('pawn_hammer',{start:0,end:2}),frameRate:8,repeat:-1});
  an.create({key:'arq-i',frames:an.generateFrameNumbers('archer_blue_i',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'arq-r',frames:an.generateFrameNumbers('archer_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'cerdo-i',frames:an.generateFrameNumbers('pig_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'cerdo-r',frames:an.generateFrameNumbers('pig_run',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'bear-i',frames:an.generateFrameNumbers('bear_idle',{start:0,end:7}),frameRate:7,repeat:-1});
  an.create({key:'bear-r',frames:an.generateFrameNumbers('bear_run',{start:0,end:4}),frameRate:9,repeat:-1});
  an.create({key:'snake-i',frames:an.generateFrameNumbers('snake_idle',{start:0,end:7}),frameRate:6,repeat:-1});
  an.create({key:'snake-r',frames:an.generateFrameNumbers('snake_run',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'spider-i',frames:an.generateFrameNumbers('spider_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'spider-r',frames:an.generateFrameNumbers('spider_run',{start:0,end:-1}),frameRate:11,repeat:-1});
  an.create({key:'lizard-i',frames:an.generateFrameNumbers('lizard_idle',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'lizard-r',frames:an.generateFrameNumbers('lizard_run',{start:0,end:-1}),frameRate:12,repeat:-1});
  an.create({key:'turtle-w',frames:an.generateFrameNumbers('turtle_walk',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'toro-i',frames:an.generateFrameNumbers('minotaur_idle',{start:0,end:15}),frameRate:8,repeat:-1});
  an.create({key:'toro-r',frames:an.generateFrameNumbers('minotaur_walk',{start:0,end:7}),frameRate:10,repeat:-1});
  an.create({key:'pshark-i',frames:an.generateFrameNumbers('pshark_i',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'pshark-r',frames:an.generateFrameNumbers('pshark_r',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'pshark-a',frames:an.generateFrameNumbers('pshark_a',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'pboat-a',frames:an.generateFrameNumbers('pboat',{start:0,end:7}),frameRate:6,repeat:-1});
  an.create({key:'gtnt-i',frames:an.generateFrameNumbers('goblin_tnt',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'gtnt-r',frames:an.generateFrameNumbers('goblin_tnt',{start:7,end:13}),frameRate:10,repeat:-1});
  an.create({key:'gt-r',frames:an.generateFrameNumbers('goblin_torch',{start:7,end:12}),frameRate:10,repeat:-1});
  an.create({key:'gt-i',frames:an.generateFrameNumbers('goblin_torch',{start:0,end:6}),frameRate:8,repeat:-1});
  an.create({key:'sp-r',frames:an.generateFrameNumbers('spear_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'sp-i',frames:an.generateFrameNumbers('spear_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'gnoll-r',frames:an.generateFrameNumbers('gnoll_walk',{start:0,end:7}),frameRate:12,repeat:-1});
  an.create({key:'gnoll-i',frames:an.generateFrameNumbers('gnoll_idle',{start:0,end:5}),frameRate:8,repeat:-1});
  an.create({key:'sham-r',frames:an.generateFrameNumbers('shaman_run',{start:0,end:3}),frameRate:9,repeat:-1});
  an.create({key:'sham-i',frames:an.generateFrameNumbers('shaman_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'prid-r',frames:an.generateFrameNumbers('pigrider_run',{start:0,end:3}),frameRate:10,repeat:-1});
  an.create({key:'prid-i',frames:an.generateFrameNumbers('pigrider_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'thief-r',frames:an.generateFrameNumbers('thief_run',{start:0,end:5}),frameRate:13,repeat:-1});
  an.create({key:'thief-i',frames:an.generateFrameNumbers('thief_idle',{start:0,end:5}),frameRate:8,repeat:-1});
  an.create({key:'troll-r',frames:an.generateFrameNumbers('troll_r',{start:0,end:9}),frameRate:9,repeat:-1});
  an.create({key:'troll-i',frames:an.generateFrameNumbers('troll_i',{start:0,end:11}),frameRate:8,repeat:-1});
  an.create({key:'troll-a',frames:an.generateFrameNumbers('troll_a',{start:0,end:5}),frameRate:10,repeat:0});
  an.create({key:'bfish-r',frames:an.generateFrameNumbers('bfish_r',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'bfish-i',frames:an.generateFrameNumbers('bfish_i',{start:0,end:7}),frameRate:8,repeat:-1});
  // ---- partículas reales + enemigos nuevos ----
  an.create({key:'pfxdust',frames:an.generateFrameNumbers('pfx_dust',{start:0,end:-1}),frameRate:14,repeat:0});
  an.create({key:'pfxboom',frames:an.generateFrameNumbers('pfx_boom',{start:0,end:-1}),frameRate:16,repeat:0});
  an.create({key:'pfxfire',frames:an.generateFrameNumbers('pfx_fire',{start:0,end:-1}),frameRate:12,repeat:-1});
  an.create({key:'pfxsplash',frames:an.generateFrameNumbers('pfx_splash',{start:0,end:-1}),frameRate:14,repeat:0});
  an.create({key:'gnome-i',frames:an.generateFrameNumbers('gnome_i',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'gnome-r',frames:an.generateFrameNumbers('gnome_r',{start:0,end:5}),frameRate:12,repeat:-1});
  an.create({key:'skull-i',frames:an.generateFrameNumbers('skull_i',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'skull-r',frames:an.generateFrameNumbers('skull_r',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'panda-i',frames:an.generateFrameNumbers('panda_i',{start:0,end:-1}),frameRate:8,repeat:-1});
  an.create({key:'panda-r',frames:an.generateFrameNumbers('panda_r',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'hshark-i',frames:an.generateFrameNumbers('hshark_i',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'hshark-r',frames:an.generateFrameNumbers('hshark_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  an.create({key:'seahorse-a',frames:an.generateFrameNumbers('seahorse',{start:0,end:-1}),frameRate:7,repeat:-1});
  an.create({key:'ptower-a',frames:an.generateFrameNumbers('ptower',{start:0,end:-1}),frameRate:6,repeat:-1});
  for(const j of ['waxe','wpick']) an.create({key:j+'-r',frames:an.generateFrameNumbers(j+'_blue_r',{start:0,end:-1}),frameRate:10,repeat:-1});
  for(let i=1;i<=4;i++){ an.create({key:'wrock'+i+'-a',frames:an.generateFrameNumbers('wrock'+i,{start:0,end:7}),frameRate:5,repeat:-1});
    an.create({key:'bush'+i+'-a',frames:an.generateFrameNumbers('bush'+i,{start:0,end:7}),frameRate:6,repeat:-1}); }
  an.create({key:'sboat-a',frames:an.generateFrameNumbers('sboat',{start:0,end:-1}),frameRate:6,repeat:-1});
  an.create({key:'boat-a',frames:an.generateFrameNumbers('boat',{start:0,end:-1}),frameRate:6,repeat:-1});
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
  // meseta con cima de PASTO verde + cara de piedra (Tilemap_color1 real del pack: grass-on-elevation)
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.elev[y][x]) rt.drawFrame('tmg',geIdx(x,y),(BX+x)*T,(BY+y)*T);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.cliff[y][x]) rt.drawFrame('tmg',gcIdx(x,y),(BX+x)*T,(BY+y)*T);
  // puentes sobre el agua
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(S.bridge[y][x]){
    let fr; if(S.bridgeDir[y][x]==='h') fr = S.land[y][x-1]?0 : (isIn(x+1,y)&&S.land[y][x+1])?2 : 1;
    else fr = S.land[y-1][x]?3 : (isIn(x,y+1)&&S.land[y+1][x])?9 : 6;
    rt.drawFrame('bridge',fr,(BX+x)*T,(BY+y)*T);
  }
  paintGrassPatches(rt);   // variación de tono sobre el pasto (menos chato)
  // snapshot del terreno real → base del minimapa (no procedural)
  try{ rt.snapshotArea(BX*T,BY*T,GW*T,GH*T,img=>{ mmBase=img; }); }catch(e){}

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
  // nubes: más densidad y variedad (dos capas — altas tenues y bajas más marcadas, tamaños/velocidades variados)
  for(let i=0;i<22;i++){
    const alta=i%3===0;                                  // algunas más altas y tenues (parallax)
    const esc=alta?Phaser.Math.FloatBetween(1.4,2.4):Phaser.Math.FloatBetween(0.6,1.5);
    const c=this.add.image(rint(-MAR,WORLD_W+MAR),rint(-260,WORLD_H+220),'cloud'+rint(1,4))
      .setAlpha(Phaser.Math.FloatBetween(alta?0.12:0.22, alta?0.22:0.42)).setDepth(alta?88500:89200)
      .setScale(esc).setFlipX(Math.random()<0.5);
    this.tweens.add({targets:c,x:'+='+(WORLD_W+MAR*2),duration:rint(alta?130000:70000, alta?220000:150000),repeat:-1,
      onRepeat:()=>{c.x=-MAR;c.y=rint(-260,WORLD_H+220);c.setScale(esc*Phaser.Math.FloatBetween(0.85,1.15));}});
    this.tweens.add({targets:c,y:'+='+rint(-24,24),duration:rint(9000,16000),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }

  ghostG=this.add.graphics().setDepth(95000);

  // ---- NIEBLA DE GUERRA (cubre TODO el mapa, incluido el mar) ----
  fogRT=this.add.renderTexture(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2).setOrigin(0,0).setDepth(80000);
  fogRT.fill(0x08131c,0.9);   // azulado y algo menos denso: lo no explorado se lee como mar oscuro, no vacío

  // ---- recursos naturales dispersos ----
  scatterNodos('arbol',26);
  scatterNodos('veta',4);
  scatterFauna('oveja',7);
  scatterFauna('jabali',4);
  scatterFauna('oso',2);
  scatterFauna('toro',1);            // El Toro Negro — bestia rara, peligrosa y jugosa
  scatterCritter('snake',3);
  scatterCritter('spider',2);
  scatterEyeCandy(50);

  // ---- ARRANQUE: un AYUNTAMIENTO ya en pie (Edad I) + 3 aldeanos ----
  let hx=Math.floor(GW/2)-2, hy=GH-4, tr=0;
  while(tr++<120&&!puedeHuella(hx,hy,5,2)){ hx=rint(2,GW-7); hy=rint(GH-6,GH-3); }
  const home=addBuilding('castle',hx,hy,{listo:true});
  homePos={x:(BX+hx+2.5)*T, y:(BY+hy)*T};
  revelar(homePos.x,homePos.y,7);
  for(let i=0;i<3;i++){ const a=spawnAldeano(home.x+rint(-60,60),home.y+rint(10,30),true); if(a) revelar(a.spr.x,a.spr.y,5); }
  scatterScenery();
  scatterLandmarks();

  this.input.on('pointermove',p=>{ if(!S.colocando) return; drawGhost(p);
    // arrastrar para colocar una LÍNEA de murallas
    if(CAT[S.colocando.tipo].muro && p.isDown && !p.rightButtonDown()){
      const t=tileAt(p); if(t){ const key=t.x+','+t.y; if(key!==S.colocando.lastTile){ S.colocando.lastTile=key; tryPlace(t.x,t.y); } }
    }
  });
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
    if(!S.colocando && !(p.isDown&&!p.rightButtonDown())) hoverCursor(p);   // cursor contextual (carne/espada/madera)
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
  updateBanner();
  refreshHUD(); refreshQuest(); buildGrid(); renderSel();
  scheduleBoat(); scheduleShip(); scheduleBirds(); scatterCampfires(2); scatterBanners(); scatterAmbientLife();
  // menú desplegable (todos los controles escondidos arriba-derecha)
  $('btnMenu').onclick=()=>$('menu').classList.toggle('open');
  $('cronToggle')&&($('cronToggle').onclick=()=>{ const c=$('cronica'), min=c.classList.toggle('min'); $('cronToggle').textContent=min?'+':'–'; });
  $('btnDialog')&&($('btnDialog').onclick=()=>{ S.dialogOn=!S.dialogOn; $('btnDialog').textContent=(S.dialogOn?'💬':'🚫')+' '+L('DIÁLOGOS','DIALOGUES'); if(!S.dialogOn) ocultarDialogo(); });
  $('btnIdioma')&&($('btnIdioma').onclick=()=>{ LANG=LANG==='es'?'en':'es'; try{localStorage.setItem('aoa_lang',LANG);}catch(e){} aplicarIdioma(); });
  aplicarIdioma();
  toast(L('EL ASEDIO · Preparate: construí defensas y entrená tropas. La primera oleada llega en ','THE SIEGE · Get ready: build defenses and train troops. The first wave arrives in ')+PREP0+'s.');
  cronica(L('Fundás tu pueblo. Que empiece el asedio.','You found your town. Let the siege begin.'),randAv());
  cronica(L('Tip: construí Murallas y Torres antes de la 1ª oleada.','Tip: build Walls and Towers before the 1st wave.'),randAv());
  window.__raid=()=>lanzarOleada();
  window.__over=()=>gameOver();
  // el mundo ya está armado: completá la barra y disolvé el splash (timer del DOM, siempre corre)
  const sb=document.getElementById('splashBar'); if(sb) sb.style.width='100%';
  const sr=document.getElementById('splashRunner'); if(sr) sr.style.left='100%';   // el jinete llega al final
  const sp=document.getElementById('splash');
  if(sp) setTimeout(()=>{ sp.classList.add('hide'); setTimeout(()=>sp.remove(),700); },380);
}
const byTC=()=>S.buildings.find(b=>b.tipo==='castle');
/* ===== BANNER de asedio (oleada / puntaje) ===== */
function updateBanner(){
  const t=$('waveBar'); if(!t) return;
  t.classList.toggle('enwave', S.phase==='wave'&&!S.over);
  if(S.over){ t.innerHTML=L('☠️ Derrota · <span class="pts">','☠️ Defeat · <span class="pts">')+S.score+L('</span> pts (récord ','</span> pts (record ')+S.best+')'; return; }
  if(S.phase==='wave'){ const v=S.raid.gob.filter(g=>!g.dead).length;
    t.innerHTML=L('⚔️ <b>OLEADA ','⚔️ <b>WAVE ')+S.wave+L('</b> · resiste <b>','</b> · hold <b>')+Math.max(0,Math.ceil(S.raid.tLeft))+L('s</b> · enemigos ','s</b> · enemies ')+v+' · <span class="pts">'+S.score+'</span> pts'; }
  else { t.innerHTML=L('🛡️ Oleada <b>','🛡️ Wave <b>')+(S.wave+1)+L('</b> en <b>','</b> in <b>')+Math.max(0,Math.ceil(S.phaseT))+'s</b> · <span class="pts">'+S.score+'</span> pts'; }
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
function marcaMover(x,y){                              // una X en el punto al que mandás mover la unidad
  const s=11, g=scene.add.graphics({x,y}).setDepth(99995);
  g.lineStyle(3,0xffe9a0,0.98);
  g.beginPath(); g.moveTo(-s,-s); g.lineTo(s,s); g.moveTo(s,-s); g.lineTo(-s,s); g.strokePath();
  scene.tweens.add({targets:g,alpha:0,scaleX:1.4,scaleY:1.4,duration:700,ease:'Quad.easeOut',onComplete:()=>g.destroy()});
}
/* ===== bocadillos de diálogo (sátira / miedo / aburrimiento / onomatopeyas) ===== */
const DIALOGO={
  aldeano:{ get ocio(){return L(['¿Otra muralla? Me duele la espalda.','El rey no paga las horas extra.','Extraño mi granja.','¿Cuándo es el almuerzo?','Trabajar, siempre trabajar.','Necesito un descanso.','¿Fue un goblin o una oveja?'],['Another wall? My back hurts.','The king does not pay overtime.','I miss my farm.','When is lunch?','Work, always work.','I need a break.','Was that a goblin or a sheep?']);},
            get asedio(){return L(['¡Goblins! ¡Corran!','¡No me pagan para esto!','¡Cierren el portón!','¡Socorro!','¡Soy aldeano, no soldado!'],['Goblins! Run!','I am not paid for this!','Close the gate!','Help!','I am a villager, not a soldier!']);} },
  militar:{ get ocio(){return L(['Afilando el acero.','Todo tranquilo… demasiado tranquilo.','Algún día seré granjero.','Extraño la taberna.','¿Guardia otra vez?'],['Sharpening my steel.','All quiet… too quiet.','Someday I will be a farmer.','I miss the tavern.','Guard duty again?']);},
            get asedio(){return L(['¡Por el Toro Negro!','¡A las armas!','¡Ni un paso atrás!','¡Sangre y honor!','¡Que vengan!'],['For the Black Bull!','To arms!','Not one step back!','Blood and honor!','Let them come!']);} },
};
const ONOMA={ oveja:['¡Beee!','¡Bêê!','Meeeh…'], jabali:['¡Oink!','¡Grññ!','*hozando*'], oso:['¡GROAAR!','¡Rrraw!','*gruñe*'],
  toro:['¡MUUU!','¡MUUUH!','*resopla furioso*'], snake:['¡Ssss!','¡Ssssh!'], spider:['*click click*','…'], get bestia(){return L(['¡Por el Rey!','¡GROAR! (leal)','*ruge a tu favor*'],['For the King!','GROAR! (loyal)','*roars for you*']);} };
const NOMBRE_BICHO={get oveja(){return L('Oveja','Sheep');},get jabali(){return L('Jabalí','Boar');},get oso(){return L('Oso','Bear');},toro:'The Black Bull',get snake(){return L('Víbora','Viper');},get spider(){return L('Araña','Spider');}};
let dlgT=0;
function retratoSprite(spr,size){                      // recorta el frame actual del sprite a un dataURL (para bichos sin avatar)
  try{ const fr=spr.frame, src=fr.texture.getSourceImage();
    const c=document.createElement('canvas'); c.width=size; c.height=size; const cx=c.getContext('2d'); cx.imageSmoothingEnabled=false;
    cx.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0,0,size,size); return c.toDataURL('image/png');
  }catch(e){ return null; }
}
// diálogo GRANDE en primer plano, con la imagen de la unidad al lado (desactivable en el menú)
function mostrarDialogo(ent,txt,quien){
  if(!S.dialogOn) return;
  const box=$('dialog'); if(!box) return;
  const img=$('dlgImg'); let src=ent.av?('assets/img/av/'+ent.av+'.png'):retratoSprite(ent.spr,120);
  if(src){ img.src=src; img.style.display='block'; } else img.style.display='none';
  $('dlgWho').textContent=quien||''; $('dlgTxt').textContent=txt;
  box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');   // reinicia la animación
  dlgT=3.8;
}
function ocultarDialogo(){ const box=$('dialog'); if(box) box.classList.remove('on'); }
function soltarBocadillo(){
  if(!S.dialogOn) return;
  const wv=scene.cameras.main.worldView, dentro=e=>e.spr&&e.spr.active&&wv.contains(e.spr.x,e.spr.y);
  const gente=[...S.ald.filter(a=>a.estado!=='refugiado'), ...S.units.filter(u=>!u.dead)].filter(dentro);
  const bichos=[...S.animals.filter(m=>!m.dead), ...S.allies.filter(u=>!u.dead)].filter(dentro);
  const pool=[]; gente.forEach(e=>pool.push({e,g:true})); bichos.forEach(e=>pool.push({e,g:false}));
  if(!pool.length) return;
  const {e,g}=pick(pool);
  if(g){ const mil=S.units.includes(e), kind=mil?'militar':'aldeano';
    const set=S.raid.on?DIALOGO[kind].asedio:DIALOGO[kind].ocio;
    mostrarDialogo(e,pick(set), mil?(UNIDADES[e.tipo]?UNIDADES[e.tipo].nom:'Guerrero'):'Aldeano'); }
  else { const key=e.beast||e.tipo; const leal=S.allies.includes(e);
    mostrarDialogo(e, pick(leal?ONOMA.bestia:(ONOMA[key]||ONOMA.snake)), (NOMBRE_BICHO[key]||'Bestia')+(leal?' (leal)':'')); }
}
// feedback de orden con ícono (espada al atacar, madera al talar, oro al minar, carne al cazar) + texto
function ordenIcono(x,y,tex,txt,color,esc){
  marcaOrden(x,y);
  const ic=scene.add.image(x,y-26,tex).setDepth(99993).setScale(esc||0.55);
  scene.tweens.add({targets:ic,y:y-54,duration:900,ease:'Quad.easeOut'});
  scene.tweens.add({targets:ic,alpha:0,delay:520,duration:400,onComplete:()=>ic.destroy()});
  if(txt) flyText(x,y-6,txt,color);
}
// ubicar al aldeano justo al lado del objetivo, mirándolo (no encima)
function pegarJunto(a,cx,cy,rad){
  const ang=Math.atan2(a.spr.y-cy,a.spr.x-cx)||0, r=rad||T*0.6;
  a.spr.x=cx+Math.cos(ang)*r; a.spr.y=cy+Math.sin(ang)*r*0.7;
  a.spr.setFlipX(a.spr.x>cx); a.spr.setDepth(a.spr.y);
}
function pegarAEdificio(a,b){                          // pega al aldeano contra la pared del edificio, del lado por el que llegó
  const c=CAT[b.tipo];
  const Lx=(BX+b.tx)*T, Tp=(BY+b.ty)*T, Rx=(BX+b.tx+c.fw)*T, Bt=(BY+b.ty+c.fh)*T;
  const cx=Phaser.Math.Clamp(a.spr.x,Lx,Rx), cy=Phaser.Math.Clamp(a.spr.y,Tp,Bt);   // punto más cercano del footprint
  const dx=a.spr.x-cx, dy=a.spr.y-cy, d=Math.hypot(dx,dy)||1;
  a.spr.x=cx+dx/d*16; a.spr.y=cy+dy/d*16;             // 16px afuera del borde = pegado a la obra
  a.spr.setFlipX(a.spr.x>b.x); a.spr.setDepth(a.spr.y);
}
// sonido posicional: el volumen y el paneo dependen de qué parte del mapa estás mirando
function sfxAt(k,base,x,y){ try{
  if(!scene) return; const wv=scene.cameras.main.worldView;
  const cx=wv.centerX, cy=wv.centerY, R=Math.max(wv.width,wv.height);
  const vol=(base||0.5)*Phaser.Math.Clamp(1-Phaser.Math.Distance.Between(x,y,cx,cy)/(R*0.72),0.05,1);
  if(vol<0.03) return;
  const pan=Phaser.Math.Clamp((x-cx)/(wv.width*0.55),-1,1);
  scene.sound.play('s_'+k,{volume:vol,pan});
}catch(e){} }
// barrita de vida flotante para edificios
function drawBuildHp(b,frac){
  if(!b.hpBar) b.hpBar=scene.add.graphics().setDepth(97500);
  const c=CAT[b.tipo], bw=Math.round(c.fw*T*0.72), x=Math.round(b.x-bw/2), y=Math.round(b.y-c.fh*T-6);
  const g=b.hpBar; g.clear();
  g.fillStyle(0x120d09,0.85).fillRect(x-2,y-2,bw+4,7);
  g.fillStyle(0x3a2f22,1).fillRect(x,y,bw,4);
  g.fillStyle(frac>0.5?0x5fa55a:frac>0.25?0xc9a227:0xc94f45,1).fillRect(x,y,Math.max(0,Math.round(bw*frac)),4);
}
function addMark(ent,color,off){        // triangulito titilante sobre la cabeza
  ent.markOff=off; ent._markCol=color;
  ent.markBg=scene.add.image(ent.spr.x,ent.spr.y-off,'tri').setTint(0x120d09).setDepth(98499).setScale(1.55); // contorno
  ent.mark=scene.add.image(ent.spr.x,ent.spr.y-off,'tri').setTint(color).setDepth(98500).setScale(1.3);
  ent.markTw=scene.tweens.add({targets:[ent.mark,ent.markBg],alpha:0.4,duration:480,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
}
let selMarcado=null;
function marcarSeleccion(){             // el triángulo del seleccionado se pone VERDE
  if(selMarcado&&selMarcado.mark&&selMarcado.mark.active) selMarcado.mark.setTint(selMarcado._markCol||0xffffff);
  selMarcado=null;
  const r=S.sel&&S.sel.ref;
  if(r&&r.mark&&r.mark.active){ r.mark.setTint(0x5fe08a); selMarcado=r; }
}
function killMark(ent){ if(ent.markTw){ent.markTw.remove();ent.markTw=null;} if(ent.mark){ent.mark.destroy();ent.mark=null;} if(ent.markBg){ent.markBg.destroy();ent.markBg=null;} }
function moveMark(ent){ if(ent.mark){ const y=ent.spr.y-ent.markOff;
  ent.mark.x=ent.spr.x; ent.mark.y=y; ent.mark.setDepth(ent.spr.y+3);
  ent.markBg.x=ent.spr.x; ent.markBg.y=y+1; ent.markBg.setDepth(ent.spr.y+2); } }
function drawHp(ent,frac,w,topY){        // barrita de vida flotante (aldeanos/animales)
  if(!ent.hpG) ent.hpG=scene.add.graphics();
  const g=ent.hpG; g.clear();
  const x=Math.round(ent.spr.x-w/2), y=Math.round(topY);
  g.fillStyle(0x120d09,0.9).fillRect(x-1,y-1,w+2,5);
  g.fillStyle(0x3a2f22,1).fillRect(x,y,w,3);
  g.fillStyle(frac>0.5?0x5fa55a:frac>0.25?0xc9a227:0xc94f45,1).fillRect(x,y,Math.max(0,Math.round(w*frac)),3);
  g.setDepth(ent.spr.y+2);
}
function hideBar(ent){ if(ent.hpG) ent.hpG.clear(); }
function killBar(ent){ if(ent.hpG){ent.hpG.destroy();ent.hpG=null;} }
function burstAt(x,y,color){
  for(let i=0;i<10;i++){ const p=scene.add.image(x,y,'dot').setTint(color).setDepth(99999).setScale(Phaser.Math.FloatBetween(0.5,1.2));
    scene.tweens.add({targets:p,x:x+rint(-26,26),y:y-rint(4,30),alpha:0,scale:0.1,duration:rint(400,900),ease:'Quad.easeOut',onComplete:()=>p.destroy()}); }
}
function explosionAt(x,y,esc){                        // explosión real del pack (pfx_boom)
  const e=scene.add.sprite(x,y,'pfx_boom').setDepth(99997).setScale((esc||1.1)*0.9).play('pfxboom');
  e.once('animationcomplete',()=>e.destroy()); sfx('explode',0.5);
}
function embestida(spr,tx,ty){                        // El Toro Negro no tiene anim de ataque: hace una EMBESTIDA (lunge + impacto)
  if(!spr||spr._lunge) return; spr._lunge=true;
  const ox=spr.x, oy=spr.y, ang=Math.atan2(ty-oy,tx-ox);
  spr.setFlipX(Math.cos(ang)<0);
  scene.tweens.add({targets:spr,x:ox+Math.cos(ang)*24,y:oy+Math.sin(ang)*24,duration:130,yoyo:true,ease:'Quad.easeOut',
    onComplete:()=>{ spr.x=ox; spr.y=oy; spr._lunge=false; }});
  dustAt(tx,ty,3); burstAt(tx,ty-10,0xd0b0ff); scene.cameras.main.shake(140,0.006);
}
function splashAt(x,y,esc){                           // salpicadura de agua real del pack (pfx_splash)
  const s=scene.add.sprite(x,y,'pfx_splash').setDepth(-19).setScale(esc||0.8).play('pfxsplash');
  s.once('animationcomplete',()=>s.destroy());
}

/* ===== niebla ===== */
// cualquier unidad propia que camine despeja la niebla, haga lo que haga (sólo al cambiar de tile)
function nieblaAlMover(ent,r){ if(!ent||!ent.spr) return; const tk=Math.floor(ent.spr.x/T)+','+Math.floor(ent.spr.y/T);
  if(tk!==ent._ftile){ ent._ftile=tk; revelar(ent.spr.x,ent.spr.y,r||4); } }
function revelar(px,py,rTiles){
  if(!fogRT) return;
  fogRT.erase('fogbrush', px+MAR-FOGR, py+MAR-FOGR);   // RT arranca en (-MAR,-MAR)
  const t=tileOfPx(px,py);
  const R=rTiles||3;
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    const x=t.x+dx, y=t.y+dy;
    if(isIn(x,y)&&Math.hypot(dx,dy)<=R) S.explored[y][x]=true;
  }
}

/* ===== pathfinding (BFS) ===== */
// terreno puro: tierra o puente sin acantilado. Ignora edificios/nodos: sólo el agua/acantilado es infranqueable.
function terrenoLibre(px,py){ const t=tileOfPx(px,py); return isIn(t.x,t.y)&&(S.land[t.y][t.x]||S.bridge[t.y][t.x])&&!S.cliff[t.y][t.x]; }
const terrenoTile=(x,y)=>isIn(x,y)&&(isLand(x,y)||esPuente(x,y))&&!S.cliff[y][x];
function findPath(x0,y0,x1,y1,relax){
  const ok = relax ? terrenoTile : walkable;               // relax: rutea atravesando edificios propios (para salir de un bolsillo aislado)
  if(!ok(x1,y1)) return null;
  if(x0===x1&&y0===y1) return [];
  const key=(x,y)=>y*GW+x, prev=new Map([[key(x0,y0),null]]), q=[[x0,y0]];
  while(q.length){
    const [cx,cy]=q.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      if(!isIn(nx,ny)||prev.has(key(nx,ny))||!ok(nx,ny)) continue;
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
const landAtPx=(px,py)=>{ const tx=Math.floor(px/T)-BX, ty=Math.floor(py/T)-BY; return walkable(tx,ty); };  // estricto: nada de agua/afuera
function adjWalkable(tx,ty){
  for(let r=1;r<=3;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){
    const x=tx+ox, y=ty+oy;
    if(walkable(x,y)&&S.grid[y][x]===null) return {x,y};
  }
  return null;
}

/* ===== ALDEANOS ===== */
/* ===== áreas de click precisas: cada entidad sólo se clickea sobre su CUERPO visible,
   nunca sobre el marco transparente. Así unidades y edificios no cruzan sus radios de click. ===== */
function hitCuerpo(spr,cx,cy,r){ spr.setInteractive({hitArea:new Phaser.Geom.Circle(cx,cy,r), hitAreaCallback:Phaser.Geom.Circle.Contains, useHandCursor:true}); return spr; }
function hitPersonaje(spr){ return hitCuerpo(spr, spr.width/2, spr.height*0.56, Math.min(spr.width,spr.height)*0.24); }
function hitBicho(spr){ return hitCuerpo(spr, spr.width/2, spr.height*0.6, Math.min(spr.width,spr.height)*0.3); }
function hitEdificio(spr){ const W=spr.width,H=spr.height;   // sólo el cuerpo bajo del edificio (no el marco ni el techo alto)
  spr.setInteractive({hitArea:new Phaser.Geom.Rectangle(W*0.14,H*0.42,W*0.72,H*0.56), hitAreaCallback:Phaser.Geom.Rectangle.Contains, useHandCursor:true}); return spr; }
function spawnAldeano(x,y,inicial){
  if(!inicial&&popTotal()>=POPCAP()){ toast(L('🏠 Cupo lleno (','🏠 Cap full (')+POPCAP()+L('). Construí Casas o despedí unidades.','). Build Houses or dismiss units.')); sfx('creak',0.4); return null; }
  const s=scene.add.sprite(x,y,'pawn_blue').setOrigin(0.5,0.72).setScale(0.7).setDepth(y);
  s.play('pawn_blue-i');
  const a={id:'a'+S.nextId++, spr:s, estado:'libre', hp:25, maxhp:25, path:null, onArrive:null,
    tx:x, ty:y, wT:rint(2,6), task:null, tarT:0, tool:null, lastTile:'', atkT:0, av:randAv()};
  hitPersonaje(s);
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'aldeano',ref:a}); });
  addMark(a,0xffe36b,64);
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
/* ===== economía: el aldeano CARGA poco y el recurso suma recién al depositarlo en el Ayuntamiento ===== */
const CARRYCAP=12;                                    // cuánto puede cargar antes de tener que ir a dejar
function setCarga(a){                                 // sprite del aldeano cargando el recurso (Pawn & Resources: el pawn lleva el fardo al hombro)
  if(!a.carga){ setTool(a,null); return; }
  // wgold_*_r es la ÚNICA animación de "pawn cargando" del pack (fardo/saco al hombro); sirve genérica para oro, madera y carne.
  // (antes la madera/carne usaba wrock1, que es una ROCA de mar animada — se veía como una piedra flotando)
  a.spr.setTexture('wgold_blue_r',0).setScale(0.7); a.spr.play('wgold-r',true);
  a.tool='carga';
}
function depositar(a){                                // deja la carga en el Ayuntamiento: recién ahí suma
  if(!a.carga||a.carga.n<=0){ a.carga=null; return; }
  const res=a.carga.res, n=a.carga.n;
  S[res]=Math.min(CAP,S[res]+n); S.recursos+=n;
  if(res==='madera') S.stats.talado+=n; else if(res==='oro') S.stats.minado+=n;
  flyText(a.spr.x,a.spr.y-30,'+'+n+' '+resNom(res)); sfx('coins',0.35);
  a.carga=null; refreshHUD();
}
function irADepositar(a){                             // camina al Ayuntamiento con la carga; al llegar deposita y vuelve a la fuente
  const tc=byTC(); if(!tc){ a.carga=null; parar(a); return; }
  const cur=tileOfPx(a.spr.x,a.spr.y);
  // apuntar a la puerta de en medio: columna central del Ayuntamiento, en la fila de adelante (al sur del edificio)
  const cc=CAT.castle, dc=tc.tx+Math.floor(cc.fw/2), dr=tc.ty+cc.fh, t=tileOfPx(tc.x,tc.y);
  const dst=(walkable(dc,dr)&&S.grid[dr]&&S.grid[dr][dc]===null)?{x:dc,y:dr}:(adjWalkable(dc,dr)||adjWalkable(t.x,t.y)||t);
  let path=findPath(cur.x,cur.y,dst.x,dst.y); a.cruza=false;
  if(!path||!path.length){ const relax=findPath(cur.x,cur.y,dst.x,dst.y,true); if(relax&&relax.length){path=relax;a.cruza=true;} }
  a.path=(path&&path.length)?path:[{x:(BX+dst.x)*T+T/2,y:(BY+dst.y)*T+T/2}];
  const p0=a.path.shift(); a.tx=p0.x; a.ty=p0.y;
  a.estado='cargando'; setCarga(a);
  if(S.sel&&S.sel.ref===a) renderSel();
}
function volverAFuente(a){                            // tras depositar: vuelve a la misma fuente si aún tiene reserva; si no, queda libre
  a.cruza=false;
  const src=a.fuente;
  if(src&&src.tipo==='nodo'){ const nd=S.nodes.find(n=>n.id===src.id); if(nd&&nd.reserva>0){ mandarNodo(a,nd); return; } }
  else if(src&&src.tipo==='granja'){ const b=byId(src.id); if(b&&b.estado==='ok'&&!b.agotada&&b.reserva>0){ mandarGranja(a,b); return; } }
  a.fuente=null; parar(a);
}
function moverA(a,tx,ty,cb){
  // soltar la tarea anterior (interrumpir orden en curso)
  if(a.dustEv){a.dustEv.remove();a.dustEv=null;}
  if(a.tween){a.tween.remove();a.tween=null;}
  a.bId=null; a.task=null; a.objAnimal=null; a.objPile=null;
  const cur=tileOfPx(a.spr.x,a.spr.y);
  let dx=tx,dy=ty, path=findPath(cur.x,cur.y,tx,ty);
  if(!path){ const adj=adjWalkable(tx,ty); if(adj){ dx=adj.x; dy=adj.y; path=findPath(cur.x,cur.y,dx,dy); } }
  a.cruza=false;
  if(!path||!path.length){                                // sin ruta normal: el aldeano cruza su propio edificio para salir del bolsillo
    const relax=findPath(cur.x,cur.y,dx,dy,true); if(relax&&relax.length){ path=relax; a.cruza=true; } }
  setTool(a,null);
  a.estado='yendo'; a.onArrive=cb||null;
  a.path=(path&&path.length)?path:[{x:(BX+dx)*T+T/2,y:(BY+dy)*T+T/2}];
  const p0=a.path.shift(); a.tx=p0.x; a.ty=p0.y;
  a.spr.play('pawn_blue-r',true);
}
function parar(a){
  if(a.dustEv){a.dustEv.remove();a.dustEv=null;}
  if(a.tween){a.tween.remove();a.tween=null;}
  a.estado='libre'; a.task=null; a.path=null; a.onArrive=null; a.objAnimal=null; a.objPile=null; a.bId=null; a.carga=null; a.fuente=null; a.cruza=false;
  setTool(a,null); a.spr.play('pawn_blue-i',true);
  refreshHUD(); if(S.sel&&S.sel.ref===a) renderSel();
}
function aguaCerca(tx,ty){ for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(isIn(tx+dx,ty+dy)&&!S.land[ty+dy][tx+dx]) return {x:tx+dx,y:ty+dy}; return null; }
// el aldeano ocioso se pega un chapuzón: salta al agua, se zambulle y sale (aprovecha el splash)
function chapuzon(a,cur){
  const w=aguaCerca(cur.x,cur.y); if(!w) return;
  a.estado='chapuzon'; a.path=null; a.spr.play('pawn_blue-r',true);
  const wx=(BX+w.x)*T+T/2, wy=(BY+w.y)*T+T/2, sx=a.spr.x, sy=a.spr.y;
  scene.tweens.add({targets:a.spr,x:wx,y:wy-6,duration:520,ease:'Sine.easeIn',onComplete:()=>{
    if(a.dead||!a.spr.active){ return; }
    splashAt(wx,wy,0.7); sfxAt('door',0.3,wx,wy);
    a.spr.play('pawn_blue-i',true);
    scene.tweens.add({targets:a.spr,y:wy+8,scaleX:0.7,scaleY:0.5,alpha:0.6,duration:300,ease:'Sine.easeIn',onComplete:()=>{  // se zambulle
      scene.time.delayedCall(rint(500,1100),()=>{
        if(a.dead||!a.spr.active){ return; }
        splashAt(wx,wy,0.7);
        a.spr.setScale(0.7).setAlpha(1);
        scene.tweens.add({targets:a.spr,x:sx,y:sy,duration:600,ease:'Sine.easeOut',onComplete:()=>{ if(!a.dead&&a.spr.active){ a.estado='libre'; a.spr.play('pawn_blue-i',true); } }});
      });
    }});
  }});
}
function despedir(a){
  if(a.dustEv)a.dustEv.remove(); if(a.tween)a.tween.remove();
  killMark(a); killBar(a);
  S.ald=S.ald.filter(x=>x!==a);
  scene.tweens.add({targets:a.spr,alpha:0,y:'-=14',duration:600,onComplete:()=>a.spr.destroy()});
  sfx('door',0.4); toast(L('Aldeano despedido: cupo liberado.','Villager dismissed: cap freed.'));
  if(S.sel&&S.sel.ref===a) deseleccionar(); refreshHUD();
}
function dañarDefensor(u,dmg){                        // el enemigo pega a una unidad defensora (militar, mercenario, aldeano o bestia leal)
  if(!u||u.dead) return;
  if(S.ald.includes(u)){ dañarAldeano(u,dmg); return; }
  const esBestia=S.allies.includes(u);
  u.hp=(u.hp!=null?u.hp:(u.maxhp||40))-dmg; flyText(u.spr.x,u.spr.y-30,'-'+dmg,'#ff9a8a');
  u.spr.setTint(0xff6a5a); scene.time.delayedCall(120,()=>{ if(u.spr&&u.spr.active){ if(esBestia) u.spr.setTint(0x9fd2ff); else u.spr.clearTint(); } });
  if(u.hp<=0) muereUnidad(u, S.units.includes(u));
}
function dañarAldeano(a,dmg){
  a.hp-=dmg; flyText(a.spr.x,a.spr.y-30,'-'+dmg,'#ff9a8a');
  a.spr.setTint(0xff6a5a); scene.time.delayedCall(120,()=>a.spr&&a.spr.clearTint&&a.spr.clearTint());
  if(a.hp<=0){
    if(a.dustEv)a.dustEv.remove(); if(a.tween)a.tween.remove();
    killMark(a); killBar(a);
    S.ald=S.ald.filter(x=>x!==a);
    const d=scene.add.sprite(a.spr.x,a.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(a.spr.y);
    d.once('animationcomplete',()=>scene.tweens.add({targets:d,alpha:0,duration:1500,onComplete:()=>d.destroy()}));
    a.spr.destroy(); sfx('creak',0.5); toast(L('☠️ Un aldeano cayó. Cuidalos de los jabalíes y goblins.','☠️ A villager fell. Keep them safe from boars and goblins.'));
    if(S.sel&&S.sel.ref===a) deseleccionar(); refreshHUD();
  }
}

/* ===== tareas de aldeano ===== */
function mandarNodo(a,nd){
  moverA(a,nd.tx,nd.ty,()=>{
    a.estado=nd.kind==='arbol'?'talando':'minando'; a.task=nd.id; a.tarT=0;
    a.fuente={tipo:'nodo', id:nd.id};                  // recordar la fuente para volver tras depositar
    pegarJunto(a,nd.spr.x,nd.spr.y-8,T*0.55);   // se planta al lado del árbol/veta/pepita, mirándolo
    setTool(a,nd.tool);
    if(nd.kind==='veta'&&nd.spr.texture.key==='goldmine_inactive') nd.spr.setTexture('goldmine');
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function mandarConstruir(a,b){
  // repartir a los obreros en tiles distintos del borde, así construyen a la par y no se amontonan
  const bs=bordesEdificio(b);
  const cnt=S.ald.filter(o=>o!==a&&o.bId===b.id&&(o.estado==='obrero'||o.estado==='yendo')).length;
  const slot=bs.length?bs[cnt%bs.length]:{x:b.tx,y:b.ty};
  moverA(a,slot.x,slot.y,()=>{
    a.estado='obrero'; a.bId=b.id; pegarAEdificio(a,b);   // pegado a la pared del edificio (no a un tile de distancia) y separado de los otros
    if(b.estado==='esperando') b.estado='obra';
    a.dustEv=scene.time.addEvent({delay:900,loop:true,callback:()=>{ dustAt(a.spr.x,a.spr.y-10,1); chispasObra(a.spr.x,a.spr.y-16); sfxAt('chop',0.22,a.spr.x,a.spr.y); }});   // martilleo + chispas EN el obrero
    a.tool='hammer'; a.spr.setTexture('pawn_hammer',0).setScale(0.7); a.spr.play('phammer',true);  // martillando
    a.spr.setFlipX(a.spr.x>b.x); a.spr.setDepth(a.spr.y);
    if(S.sel&&S.sel.ref===a) renderSel();
  });
}
function mandarGranja(a,b){                            // el aldeano saca CARNE de la granja (fuente que se gasta)
  const bs=bordesEdificio(b);
  const cnt=S.ald.filter(o=>o!==a&&o.bId===b.id&&(o.estado==='peon'||o.estado==='yendo')).length;
  const slot=bs.length?bs[cnt%bs.length]:{x:b.tx,y:b.ty};
  moverA(a,slot.x,slot.y,()=>{
    a.estado='peon'; a.bId=b.id; a.task=b.id; a.tarT=0; a.fuente={tipo:'granja', id:b.id};
    pegarAEdificio(a,b);                                // dedicado visualmente a la granja
    setTool(a,'waxe');                                  // faena la carne (hacha)
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
  if(a){ mandarGranja(a,b); return true; }
  toast('⚠️ '+CAT[b.tipo].nom+L(' sin aldeano: creá más en las Casas.',' has no villager: create more in the Houses.'));
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
    // los árboles prefieren la altura: bosque en las mesetas (aprovecha el desnivel)
    if(kind==='arbol'&&puestos<n*0.45&&tries<300&&!S.elev[ty][tx]) continue;
    if(!puedeHuella(tx,ty,cfg.fw,cfg.fh)) continue;
    const id='n'+S.nextId++;
    const x=(BX+tx)*T + cfg.fw*T/2, y=(BY+ty+cfg.fh)*T;
    let spr;
    if(kind==='arbol') spr=scene.add.sprite(x,y,'tree').play({key:'tree-a',startFrame:rint(0,3)}).setOrigin(0.5,0.92).setScale(0.58);
    else spr=scene.add.image(x,y,'goldmine_inactive').setOrigin(0.5,0.9).setScale(0.9);
    spr.setDepth(y); hitBicho(spr);
    const nd={id,kind,tipo:kind,tx,ty,spr,reserva:cfg.reserva,tool:cfg.tool,res:cfg.res};
    spr.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'nodo',ref:nd}); });
    for(let oy=0;oy<cfg.fh;oy++)for(let ox=0;ox<cfg.fw;ox++) S.grid[ty+oy][tx+ox]=id;
    S.nodes.push(nd); puestos++;
  }
}
function agotarNodo(nd){
  const cfg=NODO[nd.kind];
  if(nd.kind==='arbol'){ nd.spr.anims&&nd.spr.anims.stop(); nd.spr.setTexture('tree',9); }
  else if(nd.kind==='veta') nd.spr.setTexture('goldmine_destroyed');
  else scene.tweens.add({targets:nd.spr,alpha:0,scale:0,duration:600,onComplete:()=>nd.spr.destroy()});   // la pepita se agota y desaparece
  for(let oy=0;oy<cfg.fh;oy++)for(let ox=0;ox<cfg.fw;ox++) S.grid[nd.ty+oy][nd.tx+ox]=null;
  S.nodes=S.nodes.filter(x=>x!==nd); nd.agotado=true;
  if(nd.kind!=='pepita') scene.tweens.add({targets:nd.spr,alpha:0.5,duration:800});
  sfx('creak',0.4);
  if(S.sel&&S.sel.ref===nd) deseleccionar();
}
function agotarGranja(b){                             // la granja se gastó: queda en gris, con opción de reponer o limpiar
  if(b.agotada) return; b.agotada=true;
  b.sprs.forEach(s=>s.setTint(0x8a8f96));
  S.ald.filter(a=>a.bId===b.id&&a.estado==='peon').forEach(w=>{ if(w.carga&&w.carga.n>0) irADepositar(w); else parar(w); });
  toast(L('🌾 La granja se agotó. Reponela o limpiá los restos.','🌾 The farm is depleted. Refill it or clear the rubble.'));
  if(S.sel&&S.sel.ref===b) renderSel();
}
function reponerGranja(b){                             // vuelve a llenar la reserva (re-colocar la granja)
  const cost={madera:60};
  if(!pagar(cost)){ sfx('creak',0.4); toast(L('No te alcanza: ','Not enough: ')+costoTxt(cost)); return; }
  b.agotada=false; b.reserva=CAT.granja.reserva; b.sprs.forEach(s=>s.clearTint());
  sfx('bong',0.5); toast(L('🌾 Granja repuesta.','🌾 Farm refilled.')); refreshHUD(); renderSel();
}

/* ===== el monarca doblega una bestia salvaje → aliado que pelea por vos ===== */
function convertirBestia(m,costo){
  const cfg=FAUNA[m.tipo];
  if(S.ambar<costo){ sfx('creak',0.4); toast(L('Convertir cuesta ◆ ','Converting costs ◆ ')+costo+'.'); return; }
  S.ambar-=costo; m.hunter=null; killBar(m);
  S.animals=S.animals.filter(x=>x!==m);
  m.spr.setTint(0x9fd2ff);          // aura leal
  const perHit=cfg.jefe?8:cfg.dmg>=10?5:3;
  const ally={spr:m.spr, tipo:'bestia', beast:m.tipo, nom:cfg.nom, hp:m.hp, maxhp:m.maxhp, dmg:perHit,
              dead:false, atkCd:0, target:null, forced:null, moveT:null, wT:rint(3,7), run:cfg.run, idle:cfg.anim};
  m.spr.removeAllListeners('pointerdown'); hitBicho(m.spr);   // ahora es una unidad tuya: seleccionable
  m.spr.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'allie',ref:ally}); });
  addMark(ally,0x8ad0ff, m.spr.displayHeight*m.spr.originY+10);   // marcador celeste = tuyo
  S.allies.push(ally);
  burstAt(m.spr.x,m.spr.y-20,0x8ad0ff); sfx('bell',0.5);
  flyText(m.spr.x,m.spr.y-34,L('¡Leal al Rey!','Loyal to the King!'),'#8ad0ff');
  cronica(L('👑 El monarca doblegó a ','👑 The monarch tamed ')+cfg.nom+L('. Ahora lucha por vos.','. Now it fights for you.'),randAv());
  refreshHUD(); deseleccionar();
}
function updateAllies(dtReal){
  const vivos=(S.raid.on?S.raid.gob.filter(g=>!g.dead):[]);
  for(const u of S.allies){ if(u.dead) continue;
    nieblaAlMover(u,4);                                    // bestia leal también despeja niebla al caminar
    if(escaparSiAtascado(u,54*dtReal)){ moveMark(u); continue; }   // bestia leal atrapada: sale
    depthSobreEdificios(u.spr);
    moveMark(u);
    if(u.hp<u.maxhp) drawHp(u,u.hp/u.maxhp,30,u.spr.y-u.spr.originY*u.spr.displayHeight*0.8); else hideBar(u);
    // objetivo: 1) ataque forzado por vos  2) durante oleada, el más cercano  3) nada
    if(u.forced&&!u.forced.dead) u.target=u.forced;
    else { if(u.forced&&u.forced.dead) u.forced=null;
      if((!u.target||u.target.dead)&&vivos.length) u.target=vivos.reduce((a,g)=>Phaser.Math.Distance.Between(u.spr.x,u.spr.y,g.spr.x,g.spr.y)<Phaser.Math.Distance.Between(u.spr.x,u.spr.y,a.spr.x,a.spr.y)?g:a,vivos[0]);
      if(u.target&&u.target.dead) u.target=null; }
    if(u.target){
      const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,u.target.spr.x,u.target.spr.y);
      if(d>30){ avanzarHacia(u,u.target.spr.x,u.target.spr.y,54*dtReal);
        if(u.run&&u.spr.anims.currentAnim&&u.spr.anims.currentAnim.key!==u.run) u.spr.play(u.run,true);
      } else { u.moveT=null; u.atkCd-=dtReal; if(u.atkCd<=0){ u.atkCd=1.0;
        if(u.beast==='toro'){ if(u.run)u.spr.play(u.run,true); embestida(u.spr,u.target.spr.x,u.target.spr.y); } else if(u.idle)u.spr.play(u.idle,true);   // el Toro leal embiste
        dañarObjetivo(u.target,u.dmg,0x8ad0ff); burstAt(u.target.spr.x,u.target.spr.y-14,0x8ad0ff); sfxAt('clash',0.3,u.spr.x,u.spr.y);
        if(u.target.dead){ u.target=null; u.forced=null; } } }
    } else if(u.path&&u.path.length){                 // ruta para salir de un bolsillo (puede cruzar el propio edificio)
      const wp=u.path[0];
      if(Phaser.Math.Distance.Between(u.spr.x,u.spr.y,wp.x,wp.y)<10) u.path.shift();
      if(!u.path.length){ u.cruza=false; if(u.idle)u.spr.play(u.idle,true); }
      else { avanzarHacia(u,u.path[0].x,u.path[0].y,54*dtReal,u.cruza); if(u.run&&u.spr.anims.currentAnim&&u.spr.anims.currentAnim.key!==u.run) u.spr.play(u.run,true); }
    } else if(u.moveT){                               // orden de moverse a un punto
      const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,u.moveT.x,u.moveT.y);
      if(d<8){ u.moveT=null; if(u.idle)u.spr.play(u.idle,true); }
      else { avanzarHacia(u,u.moveT.x,u.moveT.y,54*dtReal); if(u.run&&u.spr.anims.currentAnim&&u.spr.anims.currentAnim.key!==u.run) u.spr.play(u.run,true); }
    } else if(u.idle&&(!u.spr.anims.currentAnim||u.spr.anims.currentAnim.key!==u.idle)) u.spr.play(u.idle,true);
  }
  if(S.allies.some(u=>u.dead)) S.allies=S.allies.filter(u=>!u.dead);
}

/* ===== fauna ===== */
function scatterFauna(tipo,n){
  const cfg=FAUNA[tipo];
  for(let i=0;i<n;i++){
    let tx=0,ty=0,tr=0,ok=false;
    do{ tx=rint(1,GW-2); ty=rint(1,GH-2); tr++; ok=walkable(tx,ty)&&S.grid[ty][tx]===null; }while(!ok&&tr<60);
    if(!ok) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T-12;   // pies dentro del tile (no en el borde con agua)
    const s=scene.add.sprite(x,y,cfg.tex).setOrigin(0.5,cfg.oy).setScale(cfg.esc).setDepth(y);
    if(cfg.tint) s.setTint(cfg.tint);
    s.play(cfg.anim);
    const m={id:'m'+S.nextId++, tipo, spr:s, hp:cfg.hp, maxhp:cfg.hp, carne:cfg.carne, dmg:cfg.dmg, aoa:cfg.aoa||0,
      dead:false, homeT:{x:tx,y:ty}, wT:rint(2,7), atkT:0, hunter:null};
    hitBicho(s);
    s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'animal',ref:m}); });
    S.animals.push(m);
  }
}
function scatterCritter(tipo,n){
  const cfg=CRITTER[tipo];
  for(let i=0;i<n;i++){
    let tx=0,ty=0,tr=0,ok=false;
    do{ tx=rint(1,GW-2); ty=rint(1,GH-2); tr++; ok=walkable(tx,ty)&&S.grid[ty][tx]===null; }while(!ok&&tr<60);
    if(!ok) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T-14;
    const s=scene.add.sprite(x,y,cfg.tex).setOrigin(0.5,cfg.oy).setScale(cfg.esc).setDepth(y).play(cfg.anim);
    S.critters.push({spr:s, dir:Math.random()*6.28, wT:rint(2,6), mv:false, esc:cfg.esc});
  }
}
function scatterScenery(){                 // cueva + choza goblin como paisaje (bloquean su tile)
  const poner=(tex,frame,esc,oy)=>{
    for(let tr=0;tr<80;tr++){ const tx=rint(1,GW-2), ty=rint(1,GH-2);
      if(!walkable(tx,ty)||S.grid[ty][tx]!==null||Math.hypot((BX+tx)*T-homePos.x/1,(BY+ty)*T-homePos.y)<T*4) continue;
      const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T;
      const spr=frame==null?scene.add.image(x,y,tex):scene.add.sprite(x,y,tex,frame);
      spr.setOrigin(0.5,oy).setScale(esc).setDepth(y);
      S.grid[ty][tx]='s'+S.nextId++;
      return; }
  };
  poner('cave',0,0.8,0.85);
  poner('goblin_house',null,0.7,0.92);
}
function matarAnimal(m){
  if(m.dead) return; m.dead=true;
  killBar(m);
  burstAt(m.spr.x,m.spr.y-14,0xd98a6a); dustAt(m.spr.x,m.spr.y,2);
  S.stats.cazado++;
  if(m.aoa){ S.ambar+=m.aoa; flyText(m.spr.x,m.spr.y-30,'+'+m.aoa+' ◆','#ffe36b'); }
  if(FAUNA[m.tipo]&&FAUNA[m.tipo].jefe){ S.stats.bull++; sfx('bong',0.8); toast(L('🐂 ¡Cazaste a THE BLACK BULL! Botín enorme de carne y ◆ $AOA.','🐂 You hunted THE BLACK BULL! Huge haul of meat and ◆ $AOA.')); }
  const px=m.spr.x, py=m.spr.y;
  m.spr.destroy(); S.animals=S.animals.filter(x=>x!==m);
  const psp=hitBicho(scene.add.image(px,py,'res_meat').setScale(0.55).setDepth(py));
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
  S.comida=Math.min(CAP,S.comida+pile.carne); S.recursos+=pile.carne;
  flyText(pile.x,pile.y-10,'+'+pile.carne+' 🍖','#ffd9b0');
  pile.spr.destroy(); S.piles=S.piles.filter(x=>x!==pile);
  sfx('coins',0.5); refreshHUD();
  if(S.sel&&S.sel.ref===pile) deseleccionar();
}

/* ===== eye-candy (decos no bloqueantes) ===== */
// hongos, cristales, arbustos, pasto, calabazas, huesos, rocas — con sombrita al pie
function scatterEyeCandy(n){
  let puestos=0, tries=0;
  while(puestos<n&&tries++<400){
    const tx=rint(0,GW-1), ty=rint(0,GH-1);
    if(!isLand(tx,ty)||S.cliff[ty][tx]||S.grid[ty][tx]!==null) continue;
    const x=(BX+tx)*T+T/2+rint(-14,14), y=(BY+ty+1)*T-6;
    const r=Math.random();
    if(r<0.1){  // pepita de oro: NODO recolectable (además de la veta), el aldeano la mina con el pico
      scene.add.ellipse(x,y,26,10,0x000000,0.18).setDepth(y-1);
      const id='n'+S.nextId++;
      const spr=scene.add.image(x,y,'goldstone'+rint(1,6)).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.5,0.62)).setDepth(y);
      hitBicho(spr);
      const nd={id,kind:'pepita',tipo:'pepita',tx,ty,spr,reserva:NODO.pepita.reserva,tool:NODO.pepita.tool,res:NODO.pepita.res};
      spr.on('pointerdown',pp=>{ if(!S.colocando&&!pp.rightButtonDown()) seleccionar({t:'nodo',ref:nd}); });
      S.grid[ty][tx]=id; S.nodes.push(nd);
    } else if(r<0.24){ // roca (estática) con sombra — bloquea el paso
      scene.add.ellipse(x,y,26,10,0x000000,0.18).setDepth(y-1);
      scene.add.image(x,y,'rock'+rint(1,4)).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.7,1.05)).setDepth(y);
      S.grid[ty][tx]='s'+S.nextId++;
    } else {    // deco 1..15 (traen sombra pintada): hongos, cristales, arbustos, pasto, calabaza, huesos (no bloquean)
      scene.add.image(x,y,'deco'+rint(1,15))
        .setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.65,1.0)).setDepth(y).setAlpha(0.96);
    }
    puestos++;
  }
}
// hitos más grandes y variados: espantapájaros, cartel, calavera en cruz
function scatterLandmarks(){
  // hitos + deco real del pack (árbol muerto, pica con calavera, huesos)
  const props=[['deco18',0.7],['deco17',0.85],['deco16',0.85],['dead_tree',0.42],['skull_spike',0.5],['bones1',0.6],['deco13',1.0]];
  for(const [tex,esc] of props){
    for(let tr=0;tr<60;tr++){ const tx=rint(1,GW-2), ty=rint(1,GH-2);
      if(!isLand(tx,ty)||S.cliff[ty][tx]||S.grid[ty][tx]!==null) continue;
      if(Math.hypot((BX+tx)*T-homePos.x,(BY+ty)*T-homePos.y)<T*4) continue;
      const x=(BX+tx)*T+T/2, y=(BY+ty+1)*T-4;
      scene.add.ellipse(x,y,30,11,0x000000,0.16).setDepth(y-1);
      scene.add.image(x,y,tex).setOrigin(0.5,1).setScale(esc).setDepth(y);
      break;
    }
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
// ¿hay una muralla (o murallón) en esta celda? — para autotilear la línea
function wallAt(tx,ty){ return S.buildings.some(b=>CAT[b.tipo].muro&&b.tx===tx&&b.ty===ty); }
// wall.png es una empalizada 4×3: elijo el frame según los vecinos para que la línea conecte
function wallFrame(b){
  const L=wallAt(b.tx-1,b.ty), R=wallAt(b.tx+1,b.ty), U=wallAt(b.tx,b.ty-1), D=wallAt(b.tx,b.ty+1);
  if(R&&D) return 0; if(L&&D) return 3; if(R&&U) return 8; if(L&&U) return 11;  // esquinas
  if(L||R) return 9;   // tramo/extremo horizontal (tronco grueso)
  if(U||D) return 4;   // tramo/extremo vertical (poste)
  return 1;            // poste suelto con travesaño (siempre visible)
}
// re-frame de la muralla nueva y sus vecinas al colocar/quitar
function refreshWallsAround(tx,ty){
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
    const w=S.buildings.find(b=>CAT[b.tipo].muro&&b.tx===tx+dx&&b.ty===ty+dy);
    if(w&&w.wallSpr) w.wallSpr.setFrame(wallFrame(w));
  }
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
  } else if(CAT[b.tipo].muro){
    const w=scene.add.image(x,y+6,'wall',wallFrame(b)).setOrigin(0.5,1).setDepth(y);
    if(b.tipo==='murallon'){ w.setScale(1.16).setTint(0xc2cbd6); } else w.setScale(1.06);  // murallón = piedra reforzada
    b.wallSpr=w; sprs.push(w);
  } else {
    sprs.push(scene.add.image(x,y,texOf(b)).setOrigin(0.5,1).setDepth(y));
  }
  return {sprs,x,y};
}
function setBuildingZone(b){                           // zona de click que cubre TODO el edificio (footprint + cuerpo), no un solo sprite
  if(b.zone){ b.zone.destroy(); b.zone=null; }
  const c=CAT[b.tipo], s0=b.sprs&&b.sprs[0];
  const cx=(BX+b.tx)*T + c.fw*T/2, base=(BY+b.ty+c.fh)*T;
  const zw=Math.max(c.fw*T, (b.tipo!=='granja'&&s0)?s0.displayWidth:0);
  const zh=Math.max(c.fh*T, (b.tipo!=='granja'&&s0)?s0.displayHeight:0);
  const z=scene.add.zone(cx, base - zh/2, zw, zh).setInteractive({useHandCursor:true});
  z.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) clickBuilding(b); });
  b.zone=z;
}
// que ninguna unidad propia quede tapada por un edificio: si pisa su cuerpo visible, la subimos por encima (no la perdemos)
function depthSobreEdificios(spr){
  // orden por posición de los pies: la unidad tapa al edificio sólo si está por delante (más al sur).
  // Si pasa por detrás/al costado, el techo la tapa como corresponde y no parece caminar sobre los techos.
  spr.setDepth(spr.y);
}
function clickBuilding(b){
  seleccionar({t:'edificio',ref:b});
}
function limpiarRestos(b){
  if(S.madera<40){ sfx('creak',0.4); toast(L('Limpiar los restos cuesta 40 madera.','Clearing the rubble costs 40 wood.')); return; }
  S.madera-=40;
  setGrid(b,null); destroySprites(b);
  S.buildings=S.buildings.filter(x=>x!==b);
  if(CAT[b.tipo].muro) refreshWallsAround(b.tx,b.ty);   // las vecinas re-conectan
  dustAt(b.x,b.y-10,4); sfx('door',0.5); deseleccionar(); refreshHUD(); buildGrid();
}
function addBuilding(tipo,tx,ty,opt){
  opt=opt||{};
  const c=CAT[tipo];
  const b={id:S.nextId++, tipo, nivel:1, tx, ty, skin:'blue', var:tipo==='house'?rint(1,3):0,
    estado:opt.listo?'ok':'esperando', obraT:0, obraDur:c.dur, mejorando:false, hp:c.hp||100, maxhp:c.hp||100, danado:false,
    buf:0, reserva:c.reserva||0, pileSpr:null, badge:null, barG:null, fireSpr:null};
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y;
  setGrid(b,b.id); setBuildingZone(b);
  if(scene&&scene.sys) desalojarZona(b);              // si construyeron encima de una unidad/animal, lo sacamos (no queda atrapado)
  S.buildings.push(b);
  revelar(b.x,b.y-c.fh*T*0.5,4);
  if(b.estado==='esperando'){
    b.sprs.forEach(s=>s.setAlpha(0.4));
    b.barG=scene.add.graphics().setDepth(96000);
    // SÓLO el aldeano elegido va a construir, y sólo si está libre (no se manda a todos)
    const a=(S.aldElegido&&S.ald.includes(S.aldElegido)&&(S.aldElegido.estado==='libre'||S.aldElegido.estado==='paseo'))?S.aldElegido:null;
    if(a) mandarConstruir(a,b);
    else if(!c.muro) toast(L('🔨 Obra en cola. Mandá un aldeano con CLIC DERECHO para que la construya.','🔨 Build queued. RIGHT-CLICK a villager to build it.'));
  }
  if(opt.listo&&c.prod) pedirTrabajador(b);
  return b;
}
function destroySprites(b){
  b.sprs.forEach(s=>s.destroy());
  ['badge','barG','pileSpr','fireSpr','hpBar','dmgFire','zone'].forEach(k=>{ if(b[k]){ b[k].destroy(); b[k]=null; } });
  if(b._chimEv){ b._chimEv.remove(); b._chimEv=null; }
  if(b._orbs){ b._orbs.forEach(o=>o.destroy()); b._orbs=null; }
}
function refreshBuilding(b){
  destroySprites(b);
  const m=makeSprites(b); b.sprs=m.sprs; b.x=m.x; b.y=m.y; setBuildingZone(b);
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
  if(popTotal()>=POPCAP()){ toast(L('🏠 Cupo lleno (','🏠 Cap full (')+POPCAP()+L('). Más Casas o despedí unidades.','). More Houses or dismiss units.')); sfx('creak',0.4); return; }
  // sin carne para el aldeano: por 100 de oro, la carnicería genera carne (1 cada 2s) hasta llegar a 50
  if(tipoU==='aldeano' && S.comida<50){
    if(S.carne.activo){ toast(L('🍖 La carnicería ya trabaja: ','🍖 The butchery is already working: ')+Math.floor(S.comida)+L('/50 carne. Esperá.','/50 meat. Wait.')); sfx('creak',0.3); return; }
    if(S.oro>=100){ S.oro-=100; S.carne.activo=true; S.carne.t=0; sfx('coins',0.6);
      toast(L('🥩 Carnicería abierta (−100 oro): +1 carne cada 2s hasta 50. Después creás el aldeano.','🥩 Butchery open (−100 gold): +1 meat every 2s up to 50. Then create the villager.')); refreshHUD(); return; }
    toast(L('Sin carne (necesitás 50) y sin 100 de oro para la carnicería.','No meat (you need 50) and no 100 gold for the butchery.')); sfx('creak',0.4); return;
  }
  if(!pagar(u.costo)){ toast(L('No te alcanza: ','Not enough: ')+costoTxt(u.costo)); sfx('creak',0.4); return; }
  if(tipoU==='aldeano'){ const a=spawnAldeano(b.x+rint(-30,30),b.y+rint(10,26)); if(a){S.stats.aldCreados++; revelar(a.spr.x,a.spr.y,4); dustAt(a.spr.x,a.spr.y,2); sfx('bong',0.5); toast(L('👤 Aldeano nuevo en el pueblo.','👤 New villager in town.'));} refreshHUD(); renderSel(); return; }
  const idle=uAnim(tipoU,'i'), tex={guerrero:'warrior_i',arquero:'archer_blue_i',monje:'monk_i'}[tipoU];
  const s=scene.add.sprite(b.x+rint(-34,34),b.y+rint(10,28),tex).setOrigin(0.5,0.72).setScale(0.72).setDepth(b.y);
  s.play(idle);
  const un={id:'u'+S.nextId++, tipo:tipoU, spr:s, home:{x:s.x,y:s.y}, target:null, cd:0, dead:false, wT:rint(3,8), moveT:null,
    hp:u.hp, maxhp:u.hp, atkCd:0, healCd:0, av:randAv()};
  hitPersonaje(s);
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'militar',ref:un}); });
  addMark(un,tipoU==='monje'?0x8ee0a0:0x8ec8ff,66);
  S.units.push(un); S.stats.entrenados++;
  dustAt(s.x,s.y,2); sfx(tipoU==='monje'?'bell':'clash',0.4);
  toast((tipoU==='monje'?'✝️ ':'⚔️ ')+u.nom+L(' listo',' ready')+(u.sana?L(' — sanará a tus tropas en la oleada.',' — will heal your troops during the wave.'):L(' y en guardia.',' and on guard.')));
  cronica((tipoU==='monje'?'✝️':'⚔️')+' '+u.nom+L(' entrenado',' trained'), un.av);
  refreshHUD();
}
const uAnim=(tipo,m)=>tipo==='guerrero'?'war-'+m:tipo==='monje'?'monk-'+m:'arq-'+m;
function moverMilitar(u,wx,wy){
  u.forced=null;
  const t=tileOfPx(wx,wy), cur=tileOfPx(u.spr.x,u.spr.y);
  const dst=walkable(t.x,t.y)?t:(adjWalkable(t.x,t.y)||t);
  let path=findPath(cur.x,cur.y,dst.x,dst.y);             // rodear edificios/objetos
  u.cruza=false;
  if(!path||!path.length){                                // sin ruta normal (bolsillo aislado): dejá cruzar el propio edificio
    const relax=findPath(cur.x,cur.y,dst.x,dst.y,true);
    if(relax&&relax.length){ path=relax; u.cruza=true; } }
  u.path=(path&&path.length)?path:[{x:(BX+dst.x)*T+T/2,y:(BY+dst.y)*T+T/2}];
  u.home={x:(BX+dst.x)*T+T/2,y:(BY+dst.y)*T+T/2}; u.moveT=null;
  if(!S.raid.on) u.spr.play(uAnim(u.tipo,'r'),true);
}
function despedirMilitar(u){
  u.dead=true; killMark(u); killBar(u); S.units=S.units.filter(x=>x!==u);
  scene.tweens.add({targets:u.spr,alpha:0,y:'-=14',duration:600,onComplete:()=>u.spr.destroy()});
  sfx('door',0.4); toast(L('Unidad despedida: cupo liberado.','Unit dismissed: cap freed.'));
  if(S.sel&&S.sel.ref===u) deseleccionar(); refreshHUD();
}

/* ===== órdenes (clic derecho) ===== */
function ordenar(p){
  const sel=S.sel; if(!sel) return;
  const wp=scene.cameras.main.getWorldPoint(p.x,p.y);
  if(sel.t==='techo'){                                 // arquero de techo: sólo se mueve DENTRO del techo
    const arc=sel.ref, r=techoRect(arc.cas);
    arc.roofT={x:Phaser.Math.Clamp(wp.x,r.x0,r.x1), y:Phaser.Math.Clamp(wp.y,r.y0,r.y1)};
    marcaMover(arc.roofT.x,arc.roofT.y); return;
  }
  if(sel.t==='militar'){
    const u=sel.ref;
    const en=S.raid.gob.find(g=>!g.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,g.spr.x,g.spr.y)<44)
          || S.animals.find(m=>!m.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,m.spr.x,m.spr.y)<44);
    if(en){ u.forced=en; u.target=en; u.moveT=null; u.path=null; ordenIcono(en.spr.x,en.spr.y,'ic5',L('¡Ataque!','Attack!'),'#ff9a6a',0.6); }
    else { moverMilitar(u,wp.x,wp.y); marcaMover(wp.x,wp.y); }
    return;
  }
  if(sel.t==='allie'){
    const u=sel.ref;  // bestia convertida: obedece como una unidad propia
    const en=S.raid.gob.find(g=>!g.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,g.spr.x,g.spr.y)<44)
          || S.animals.find(m=>!m.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,m.spr.x,m.spr.y)<44);
    if(en){ u.forced=en; u.target=en; u.moveT=null; u.path=null; ordenIcono(en.spr.x,en.spr.y,'ic5',L('¡Ataque!','Attack!'),'#ff9a6a',0.6); }
    else { u.forced=null; u.target=null;
      const cur=tileOfPx(u.spr.x,u.spr.y), t=tileOfPx(wp.x,wp.y);
      const dst=walkable(t.x,t.y)?t:(adjWalkable(t.x,t.y)||t);
      let path=findPath(cur.x,cur.y,dst.x,dst.y); u.cruza=false;
      if(!path||!path.length){ const relax=findPath(cur.x,cur.y,dst.x,dst.y,true); if(relax&&relax.length){ path=relax; u.cruza=true; } }
      if(path&&path.length){ u.path=path; u.moveT=null; } else { u.path=null; u.moveT={x:wp.x,y:wp.y}; }
      marcaMover(wp.x,wp.y); }
    return;
  }
  if(sel.t!=='aldeano') return;
  const a=sel.ref;
  const an=S.animals.find(m=>!m.dead&&Phaser.Math.Distance.Between(wp.x,wp.y,m.spr.x,m.spr.y)<40);
  if(an){ mandarCazar(a,an); ordenIcono(an.spr.x,an.spr.y,'res_meat',L('Cazar ','Hunt ')+FAUNA[an.tipo].nom.toLowerCase(),'#ffd9b0'); return; }
  const pile=S.piles.find(m=>Phaser.Math.Distance.Between(wp.x,wp.y,m.x,m.y)<40);
  if(pile){ mandarRecolectar(a,pile); ordenIcono(pile.x,pile.y,'res_meat',L('Recoger','Gather'),'#ffd9b0'); return; }
  const t=tileAt(p); if(!t) return;
  const occ=S.grid[t.y][t.x];
  if(typeof occ==='string'&&occ[0]==='n'){ const nd=S.nodes.find(n=>n.id===occ);
    if(nd){ mandarNodo(a,nd);
      if(nd.res==='madera') ordenIcono(nd.spr.x,nd.spr.y-8,'res_wood',L('Talar','Chop'),'#e8c07a');
      else ordenIcono(nd.spr.x,nd.spr.y-8,'res_gold',L('Minar','Mine'),'#ffe36b');
      return; } }
  const b=S.buildings.find(bb=>occ===bb.id);
  if(b){
    if(b.estado==='esperando'||b.estado==='obra'){ mandarConstruir(a,b); ordenIcono(b.x,b.y,'ic1',L('Construir','Build'),'#e8c07a',0.6); return; }
    if(b.tipo==='granja'&&b.estado==='ok'&&!b.danado&&!b.agotada){ mandarGranja(a,b); marcaOrden(b.x,b.y); return; }
  }
  if(walkable(t.x,t.y)){ moverA(a,t.x,t.y,()=>parar(a)); marcaMover((BX+t.x)*T+T/2,(BY+t.y)*T+T/2); }
  else sfx('creak',0.3);
}

/* ===== colocación de edificios ===== */
function startPlace(tipo,moverId){
  S.colocando={tipo,moverId:moverId||null,lastTile:''};
  if(ghostSpr){ghostSpr.destroy();ghostSpr=null;}
  if(tipo!=='granja'){
    if(CAT[tipo].muro){ ghostSpr=scene.add.image(0,0,'wall',1).setOrigin(0.5,1).setAlpha(0.6).setScale(tipo==='murallon'?1.16:1.06).setTint(tipo==='murallon'?0xc2cbd6:0xffffff).setDepth(94000).setVisible(false); }
    else { const tex=moverId?texOf(byId(moverId)):CARD_IMG[tipo];
      if(tex&&tex!=='sheep') ghostSpr=scene.add.image(0,0,tex).setOrigin(0.5,1).setAlpha(0.55).setDepth(94000).setVisible(false); }
  }
  hint((moverId?L('Reubicando ','Relocating '):L('Colocando ','Placing '))+CAT[tipo].nom+(CAT[tipo].muro?L(' — arrastrá para una LÍNEA · clic der. termina',' — drag for a LINE · right-click to finish'):L(' — verde libre · rojo ocupado · ESC cancela',' — green free · red occupied · ESC cancels')));
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
    const b=byId(moverId); setGrid(b,null); b.tx=tx; b.ty=ty; setGrid(b,b.id); desalojarZona(b); refreshBuilding(b);
    sfx('door',0.5); toast(c.nom+L(' reubicado.',' relocated.')); cancelPlace(); refreshHUD(); return;
  }
  if(!pagar(c.costo)){ sfx('creak',0.4); if(!c.muro) toast(L('No te alcanza para ','Not enough for ')+c.nom+'.'); return; }
  addBuilding(tipo,tx,ty,{});
  sfx(c.muro?'chop':'door',0.5);
  if(c.muro){ refreshWallsAround(tx,ty); S.colocando.lastTile=tx+','+ty; refreshHUD(); buildGrid(); }   // muro: seguís colocando una línea
  else { cancelPlace(); refreshHUD(); }
}
function cancelPlace(){ S.colocando=null; S.aldElegido=null; ghostG.clear(); if(ghostSpr){ghostSpr.destroy();ghostSpr=null;} hint(''); buildGrid(); }

/* ===== economía ===== */
function pagar(costo){
  for(const k in costo){ const cur=k==='ambar'?S.ambar:S[k]; if(cur<costo[k]) return false; }
  for(const k in costo){ if(k==='ambar') S.ambar-=costo[k]; else S[k]-=costo[k]; }
  return true;
}
const costoTxt=c=>Object.entries(c).map(([k,v])=>`${v} ${resNom(k)}`).join(' · ')||L('gratis','free');
const byId=id=>S.buildings.find(b=>b.id===id);

/* ===== SELECCIÓN + panel inferior ===== */
function seleccionar(sel){ S.sel=sel; renderSel(); buildGrid(); applyCursor(); marcarSeleccion(); }
function deseleccionar(){ S.sel=null; renderSel(); buildGrid(); applyCursor(); marcarSeleccion(); }
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
const ESTLBL={get libre(){return L('Libre','Idle');},get paseo(){return L('Paseando','Wandering');},get yendo(){return L('En camino','On the way');},get obrero(){return L('Construyendo','Building');},get peon(){return L('En la granja','At the farm');},
  get talando(){return L('Talando 🪓','Chopping 🪓');},get minando(){return L('Minando ⛏️','Mining ⛏️');},get cazando(){return L('Cazando 🏹','Hunting 🏹');},get recolectando(){return L('Recogiendo carne','Gathering meat');}};
function setAv(av){ const e=$('selAv'); if(!e) return; if(av){ e.src='assets/img/av/'+av+'.png'; e.style.display='block'; } else e.style.display='none'; }
function renderSel(){
  const act=$('selActions'); act.innerHTML='';
  const sel=S.sel;
  if(!sel){ $('selNom').textContent='—'; $('selLvl').textContent=''; setHp(null); setAv(null); $('selVacio').style.display='block'; return; }
  $('selVacio').style.display='none'; setAv(null);

  if(sel.t==='aldeano'){
    const a=sel.ref;
    $('selNom').textContent=L('Aldeano','Villager'); $('selLvl').textContent=ESTLBL[a.estado]||a.estado; setHp(a.hp,a.maxhp); setAv(a.av);
    const ocupado=a.estado!=='libre'&&a.estado!=='paseo';
    accion(L('DETENER','STOP'),()=>parar(a),!ocupado);
    accion(L('DESPEDIR','DISMISS'),()=>despedir(a),false);
    const t=$('selVacio'); t.style.display='block';
    t.innerHTML=L('Clic der.: ir · talar · minar · cazar.<br>Elegí un edificio → lo construye este aldeano.','Right-click: move · chop · mine · hunt.<br>Pick a building → this villager builds it.');
  } else if(sel.t==='militar'){
    const u=sel.ref;
    $('selNom').textContent=UNIDADES[u.tipo].nom; $('selLvl').textContent=UNIDADES[u.tipo].sana?L('Sanador · en la retaguardia','Healer · in the rear'):L('En guardia','On guard'); setHp(u.hp,u.maxhp); setAv(u.av);
    accion(L('DESPEDIR','DISMISS'),()=>despedirMilitar(u),false);
    const t=$('selVacio'); t.style.display='block'; t.innerHTML=L('Clic derecho: reposicionar la unidad.','Right-click: reposition the unit.');
  } else if(sel.t==='allie'){
    const u=sel.ref;
    $('selNom').textContent=u.nom+L(' (leal)',' (loyal)'); $('selLvl').textContent=L('Bestia doblegada por el monarca','Beast tamed by the monarch'); setHp(u.hp,u.maxhp);
    const t=$('selVacio'); t.style.display='block'; t.innerHTML=L('Clic derecho: moverla o mandarla a atacar.<br>Lucha por vos en las oleadas.','Right-click: move it or send it to attack.<br>It fights for you in the waves.');
  } else if(sel.t==='techo'){
    const u=sel.ref;
    $('selNom').textContent=L('Arquero de techo','Roof Archer'); $('selLvl').textContent=L('Fijo al Ayuntamiento · recibe el daño primero','Fixed to the Town Hall · takes damage first'); setHp(u.hp,u.maxhp); setAv(u.av);
    const t=$('selVacio'); t.style.display='block'; t.innerHTML=L('Clic derecho: moverlo SOBRE el techo (no puede bajar).<br>Dispara a los enemigos en la oleada.','Right-click: move it ON the roof (it cannot come down).<br>Shoots enemies during the wave.');
  } else if(sel.t==='nodo'){
    const nd=sel.ref, cfg=NODO[nd.kind];
    $('selNom').textContent=cfg.nom; $('selLvl').textContent=L('Reserva: ','Reserve: ')+Math.ceil(nd.reserva)+' '+resNom(cfg.res); setHp(nd.reserva,cfg.reserva);
    accion(cfg.verbo,()=>{ const a=aldLibreCerca(nd.spr.x,nd.spr.y); if(a){mandarNodo(a,nd); toast(L('Aldeano en camino a ','Villager on the way to ')+cfg.verbo.toLowerCase()+'.');} else toast(L('No hay aldeanos libres.','No free villagers.')); },false);
  } else if(sel.t==='animal'){
    const m=sel.ref, cfg=FAUNA[m.tipo];
    $('selNom').textContent=cfg.nom; $('selLvl').textContent=L('Carne: ','Meat: ')+cfg.carne+(cfg.dmg?L(' · ⚠️ contraataca',' · ⚠️ fights back'):L(' · pacífico',' · peaceful')); setHp(m.hp,m.maxhp);
    accion('CAZAR',()=>{ const a=aldLibreCerca(m.spr.x,m.spr.y); if(a){mandarCazar(a,m); toast(L('🏹 A cazar.','🏹 Off to hunt.'));} else toast(L('No hay aldeanos libres.','No free villagers.')); },false);
    const costo=cfg.jefe?20:cfg.dmg>=10?10:6;         // el monarca doblega CUALQUIER bestia a su bando
    accion(L('👑 CONVERTIR (◆ ','👑 CONVERT (◆ ')+costo+')',()=>convertirBestia(m,costo),S.ambar<costo);
  } else if(sel.t==='pila'){
    const pile=sel.ref;
    $('selNom').textContent=L('Carne','Meat'); $('selLvl').textContent='+'+pile.carne+L(' comida al recogerla',' food when gathered'); setHp(null);
    accion(L('RECOGER','GATHER'),()=>{ const a=aldLibreCerca(pile.x,pile.y); if(a){mandarRecolectar(a,pile);} else toast(L('No hay aldeanos libres.','No free villagers.')); },false);
  } else if(sel.t==='edificio'){
    renderSelEdificio(sel.ref);
  }
}
function renderSelEdificio(b){
  const c=CAT[b.tipo];
  $('selNom').textContent=c.nom;
  if(c.esTC) $('selLvl').textContent=L('Corazón del pueblo · si cae, perdés el asedio','Heart of the town · if it falls, you lose the siege')+(b.danado?L(' · 🔥 DAÑADO',' · 🔥 DAMAGED'):'');
  else $('selLvl').textContent=L('Nivel ','Level ')+b.nivel+(b.tipo==='granja'?(b.agotada?L(' · 🌾 AGOTADA',' · 🌾 DEPLETED'):L(' · 🍖 carne: ',' · 🍖 meat: ')+Math.ceil(b.reserva)):'')+(b.estado==='esperando'?L(' · ESPERANDO ALDEANO',' · AWAITING VILLAGER'):'')+(b.estado==='obra'?L(' · EN OBRA',' · UNDER CONSTRUCTION'):'')+(b.danado?L(' · 🔥 DAÑADO',' · 🔥 DAMAGED'):'')+(b.skin!=='blue'?' · '+SKINNOM[b.skin]:'');
  setHp(b.hp,b.maxhp||100);
  if(b.danado||(b.estado==='ok'&&b.hp<(b.maxhp||100))){ accion(b.reparando?L('REPARANDO…','REPAIRING…'):L('REPARAR (60 oro)','REPAIR (60 gold)'),()=>repararB(b),S.oro<60||b.reparando); }
  else {
    const uCrear=Object.keys(UNIDADES).find(k=>UNIDADES[k].de.includes(b.tipo));
    if(uCrear&&b.estado==='ok') accion(L('CREAR ','CREATE ')+UNIDADES[uCrear].nom.toUpperCase()+' ('+costoTxt(UNIDADES[uCrear].costo)+')',()=>entrenar(uCrear,b),popTotal()>=POPCAP());
    if(!c.esTC){ const up=c.up&&c.up[b.nivel-1];
      if(up&&b.nivel<MAXLVL.def) accion(L('MEJORAR (','UPGRADE (')+costoTxt(up.costo)+')',()=>mejorarB(b),b.estado!=='ok'); }
    if(b.tipo==='granja'&&b.estado==='ok'){            // granja: sacar carne (se gasta) o reponer cuando está agotada
      if(b.agotada) accion(L('🌾 REPONER (60 madera)','🌾 REFILL (60 wood)'),()=>reponerGranja(b),S.madera<60);
      else accion(L('🍖 SACAR CARNE','🍖 GATHER MEAT'),()=>{ const a=aldLibreCerca(b.x,b.y); if(a){ mandarGranja(a,b); toast(L('Aldeano a sacar carne.','Villager gathering meat.')); } else toast(L('No hay aldeanos libres.','No free villagers.')); },false);
    }
  }
  if(c.esTC){                                    // Ayuntamiento: arquero de techo + refugiar / liberar aldeanos
    const narq=(b.archers||[]).filter(a=>!a.dead).length;
    accion(L('🏹 ARQUERO TECHO (','🏹 ROOF ARCHER (')+narq+'/2 · '+costoTxt(UNIDADES.arquero.costo)+')',()=>{ crearArqueroTecho(b); renderSel(); },narq>=2);
    const dentro=S.ald.filter(a=>a.estado==='refugiado').length;
    const idle=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo').length;
    if(dentro>0) accion(L('🚪 SACAR ALDEANOS (','🚪 RELEASE VILLAGERS (')+dentro+')',()=>liberarAldeanos(),false);
    accion(L('🛡️ REFUGIAR OCIOSOS (','🛡️ SHELTER IDLE (')+idle+')',()=>refugiarAldeanos(),idle===0);
  }
  if(b.estado==='obra') accion(L('◆ ACELERAR (','◆ RUSH (')+(S.ACEL_TOPE-S.aceleradas)+' · 10)',()=>acelerarB(b),!(S.aceleradas<S.ACEL_TOPE&&S.ambar>=10));
  if(c.skins&&!c.esTC&&b.estado==='ok'&&!b.danado) accion(L('◆ COLOR: ','◆ COLOR: ')+SKINNOM[b.skin].toUpperCase()+' (15)',()=>skinB(b),S.ambar<15);
  if(b.estado==='ok'&&!c.esTC) accion(L('MOVER','MOVE'),()=>startPlace(b.tipo,b.id),false);
  if(!c.esTC) accion(L('DEMOLER (40 mad.)','DEMOLISH (40 wood)'),()=>limpiarRestos(b),S.madera<40);
}
function repararB(b){
  const herido = b.danado || (b.estado==='ok'&&b.hp<(b.maxhp||100));
  if(!herido||b.reparando) return;
  if(S.oro<60){ sfx('creak',0.4); toast(L('Reparar cuesta 60 oro.','Repair costs 60 gold.')); return; }
  S.oro-=60;
  const eraRuina=b.danado; b.danado=false; if(b.estado!=='ok') b.estado='ok';
  if(eraRuina){ b.hp=Math.max(1,b.hp); refreshBuilding(b); }   // saca el tinte de ruina y el fuego total
  b.reparando=true;                                            // la vida sube de a poco (se ve la barra llenarse)
  sfx('bong',0.5); toast('🔧 '+CAT[b.tipo].nom+L(' en reparación…',' under repair…')); refreshHUD(); renderSel(); }
function refugiarAldeanos(){                                    // los ociosos entran al Ayuntamiento (a salvo de la horda)
  const idle=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo');
  if(!idle.length){ toast(L('No hay aldeanos ociosos para refugiar.','No idle villagers to shelter.')); sfx('creak',0.3); return; }
  idle.forEach(a=>{ if(a.dustEv){a.dustEv.remove();a.dustEv=null;} if(a.tween){a.tween.remove();a.tween=null;}
    a.estado='refugiado'; a.path=null; a.spr.setVisible(false); if(a.mark){a.mark.setVisible(false);a.markBg.setVisible(false);} hideBar(a);
    if(S.sel&&S.sel.ref===a) deseleccionar(); });
  sfx('door',0.5); toast('🛡️ '+idle.length+L(' aldeanos a resguardo en el Ayuntamiento.',' villagers sheltered in the Town Hall.')); refreshHUD(); if(S.sel) renderSel();
}
function liberarAldeanos(){
  const dentro=S.ald.filter(a=>a.estado==='refugiado'); if(!dentro.length) return;
  dentro.forEach(a=>{ a.estado='libre'; a.spr.setVisible(true).setPosition(homePos.x+rint(-42,42),homePos.y+rint(12,34)); a.spr.setDepth(a.spr.y).play('pawn_blue-i',true);
    if(a.mark){a.mark.setVisible(true);a.markBg.setVisible(true);} });
  sfx('door',0.5); toast('🚪 '+dentro.length+L(' aldeanos vuelven al pueblo.',' villagers return to town.')); refreshHUD(); if(S.sel) renderSel();
}
function mejorarB(b){ const up=CAT[b.tipo].up[b.nivel-1];
  if(!pagar(up.costo)){ sfx('creak',0.4); toast(L('No te alcanza para la mejora.','Not enough for the upgrade.')); return; }
  b.estado='esperando'; b.obraT=0; b.obraDur=up.dur; b.mejorando=true; refreshBuilding(b);
  const a=aldLibreCerca(b.x,b.y); if(a) mandarConstruir(a,b); else toast(L('⚠️ La mejora espera un aldeano libre.','⚠️ The upgrade is waiting for a free villager.'));
  sfx('door',0.5); renderSel(); refreshHUD(); }
function acelerarB(b){ if(b.estado!=='obra'||S.aceleradas>=S.ACEL_TOPE||S.ambar<10){ sfx('creak',0.4); return; }
  S.ambar-=10; S.aceleradas++; b.obraT=b.obraDur; sfx('coins',0.6); toast(L('Obra acelerada (◆ simulado).','Construction rushed (◆ simulated).')); refreshHUD(); renderSel(); }
function skinB(b){ if(!CAT[b.tipo].skins||S.ambar<15){ sfx('creak',0.4); return; }
  S.ambar-=15; b.skin=SKINS[(SKINS.indexOf(b.skin)+1)%SKINS.length]; S.stats.skins++;   // cicla azul→roja→púrpura→dorada
  refreshBuilding(b); sfx('coins',0.6); toast(L('Color ','Color ')+SKINNOM[b.skin]+L(' — cosmético puro.',' — purely cosmetic.')); refreshHUD(); renderSel(); }

/* ===== barra contextual de construcción ===== */
function gateMsg(c,tipo){
  if((c.reqWave||0)>S.wave) return L('Oleada ','Wave ')+c.reqWave;      // se desbloquea al sobrevivir esa oleada
  if(c.reqB&&!S.buildings.some(b=>b.tipo===c.reqB&&b.estado==='ok')) return L('requiere ','requires ')+CAT[c.reqB].nom;
  if(c.unico&&S.buildings.some(b=>b.tipo===tipo)) return L('único','unique');
  return null;
}
function buildGrid(){
  const grid=$('buildgrid'); grid.innerHTML='';
  const hayAld=S.sel&&S.sel.t==='aldeano';
  $('gridTitle').textContent=hayAld?L('CONSTRUIR','BUILD'):'—';
  if(!hayAld){
    const m=document.createElement('div');
    m.style.cssText='align-self:center;color:var(--muted);font-size:11px;line-height:1.6;padding:6px 10px;max-width:360px';
    m.innerHTML=L('Seleccioná un <b>aldeano</b> (clic izquierdo) para ver qué puede construir.<br>Los recursos del mapa —árboles, vetas, animales— se explotan con clic derecho.','Select a <b>villager</b> (left-click) to see what it can build.<br>Map resources —trees, veins, animals— are gathered with right-click.');
    grid.appendChild(m); return;
  }
  for(const tipo in CAT){
    const c=CAT[tipo];
    if(c.esTC) continue;                          // el Ayuntamiento ya existe (no se construye)
    const lock=gateMsg(c,tipo);
    const noPlata=!lock&&!Object.entries(c.costo).every(([k,v])=>(k==='ambar'?S.ambar:S[k])>=v);
    const el=document.createElement('div');
    el.className='card'+(lock?' lock':'')+(S.colocando&&S.colocando.tipo===tipo?' sel':'');
    if(c.desc) el.title=c.desc;
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
  if(!q){ $('qTxt').textContent=L('¡Completaste todas las misiones! 👑','All quests complete! 👑'); $('btnQuest').style.display='none'; $('qBox').classList.remove('done'); return; }
  $('qTxt').textContent=(S.qIx+1)+'/'+QUESTS.length+' · '+q.txt;
  const done=q.check();
  $('btnQuest').style.display='block'; $('btnQuest').disabled=!done;
  $('btnQuest').textContent=done?L('RECLAMAR ','CLAIM ')+costoTxt(q.rew):'···';
  $('qBox').classList.toggle('done',done);
}
$('btnQuest').onclick=()=>{
  const q=QUESTS[S.qIx]; if(!q||!q.check()) return;
  for(const k in q.rew){ if(k==='ambar')S.ambar+=q.rew[k]; else S[k]=Math.min(CAP,S[k]+q.rew[k]); }
  sfx('bong',0.65); toast(L('Misión cumplida: ','Quest complete: ')+costoTxt(q.rew));
  S.qIx++; refreshQuest(); refreshHUD();
};

/* ===== bote misterioso ===== */
function scheduleBoat(){ scene.time.delayedCall(rint(70000,120000),spawnBoat); }
function spawnBoat(){
  const y=(BY+rint(2,GH-3))*T;
  const boat=scene.add.sprite(-MAR/2,y,'sboat').play('sboat-a').setDepth(-22).setScale(0.8);
  scene.tweens.add({targets:boat,x:(BX-2)*T,duration:7000,ease:'Sine.easeOut',onComplete:()=>{
    boat.setInteractive({useHandCursor:true}); S.bote=boat;   // señalizado en el minimapa
    const glow=scene.add.circle(boat.x,y-30,16,0xc9a227,0.4).setDepth(-21);
    scene.tweens.add({targets:glow,alpha:0.1,scale:1.4,duration:600,yoyo:true,repeat:-1});
    toast(L('⚓ Un bote misterioso llegó — tocalo antes de que se vaya.','⚓ A mysterious boat arrived — tap it before it leaves.')); sfx('bell',0.4);
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
  S.bote=null;
  scene.tweens.add({targets:boat,x:-MAR/2,duration:6000,ease:'Sine.easeIn',onComplete:()=>boat.destroy()});
  if(!ok) toast(L('El bote se fue sin que lo revises…','The boat left before you checked it…'));
  scheduleBoat();
}
/* bandadas de aves cruzando el cielo (procedural, sin assets) */
function scheduleBirds(){ scene.time.delayedCall(rint(9000,20000),spawnFlock); }
function spawnFlock(){
  const n=rint(3,6), dir=Math.random()<0.5?1:-1, y0=rint(30,WORLD_H*0.28);
  const fromX=dir>0?-120:WORLD_W+120, toX=dir>0?WORLD_W+120:-120;
  for(let i=0;i<n;i++){
    const off=Math.abs(i-(n-1)/2);
    const b=scene.add.image(fromX-dir*i*22, y0+off*11, 'bird').setDepth(90500).setAlpha(0.72).setScale(Phaser.Math.FloatBetween(0.9,1.3)).setFlipX(dir<0);
    scene.tweens.add({targets:b,scaleY:0.4,duration:rint(220,300),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    scene.tweens.add({targets:b,x:toX-dir*i*22,y:'+='+rint(-30,30),duration:rint(15000,24000),ease:'Sine.easeInOut',onComplete:()=>b.destroy()});
  }
  scheduleBirds();
}
/* ===== partículas de edificios (humo de chimenea, orbes de torre, chispas de obra) ===== */
function humoChimenea(b){
  if(b._chimEv) return;
  const c=CAT[b.tipo];
  b._chimEv=scene.time.addEvent({delay:1300,loop:true,callback:()=>{
    if(!b.sprs||b.estado!=='ok') return;
    const x=b.x+rint(-10,c.fw*T*0.2), y=b.y-c.fh*T*0.82;
    const p=scene.add.image(x,y,'dot').setTint(0xd9d3c6).setAlpha(0.5).setScale(1.4).setDepth(b.y+2);
    scene.tweens.add({targets:p,y:y-36,x:x+rint(-12,16),scaleX:3.4,scaleY:3.4,alpha:0,duration:2300,ease:'Sine.easeOut',onComplete:()=>p.destroy()});
  }});
}
function orbesTorre(b){
  if(b._orbs) return; b._orbs=[];
  const cx=b.x, cy=b.y-CAT.torre.fh*T*0.72;
  for(let k=0;k<3;k++){
    const o=scene.add.image(cx,cy,'dot').setTint(0xffe36b).setBlendMode(Phaser.BlendModes.ADD).setScale(1.7).setDepth(99000);
    const rad=13+k*5;
    scene.tweens.add({targets:o,alpha:0.3,duration:640+k*130,yoyo:true,repeat:-1});
    scene.tweens.add({targets:o,x:cx+rad,duration:1500+k*220,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:k*140});
    scene.tweens.add({targets:o,y:cy-rad*0.7,duration:1250+k*180,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:k*90});
    b._orbs.push(o);
  }
}
function chispasObra(x,y){                              // chispas doradas al construir
  for(let i=0;i<3;i++){ const s=scene.add.image(x+rint(-16,16),y-rint(0,20),'dot').setTint(0xffe36b).setBlendMode(Phaser.BlendModes.ADD).setDepth(99998).setScale(0.8);
    scene.tweens.add({targets:s,y:s.y-rint(10,26),alpha:0,scale:0.1,duration:rint(400,700),ease:'Quad.easeOut',onComplete:()=>s.destroy()}); }
}
/* fogatas de ambiente (fuego + resplandor cálido) */
function campfireAt(x,y){                               // fogata con base de piedras (no una llama suelta)
  const glow=scene.add.circle(x,y-10,22,0xff8a3a,0.14).setDepth(y-1);
  scene.tweens.add({targets:glow,scale:1.2,alpha:0.24,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  scene.add.image(x,y,'rock'+rint(1,4)).setOrigin(0.5,1).setScale(0.55).setDepth(y-0.2);
  scene.add.sprite(x,y-6,'fire').play({key:'fire-a',startFrame:rint(0,6)}).setOrigin(0.5,1).setScale(0.34).setDepth(y);
}
function scatterCampfires(n){
  for(let k=0;k<n;k++){ let tx,ty,tr=0,ok=false;
    do{ tx=rint(1,GW-2); ty=rint(1,GH-2); tr++; ok=walkable(tx,ty)&&S.grid[ty][tx]===null&&Math.hypot((BX+tx)*T-homePos.x,(BY+ty)*T-homePos.y)>T*5; }while(!ok&&tr<60);
    if(!ok) continue;
    S.grid[ty][tx]='s'+S.nextId++;                                   // la fogata ocupa su tile (no la pisan)
    campfireAt((BX+tx)*T+T/2, (BY+ty+1)*T-6);
  }
}
// guerrero real (seleccionable/comandable), sin costo — para la guardia inicial
function crearGuerrero(x,y){
  const HP=45;    // la guardia inicial aguanta un poco (más que un goblin) pero NO sola un asedio
  const s=scene.add.sprite(x,y,'warrior_i').setOrigin(0.5,0.72).setScale(0.72).setDepth(y).play('war-i');
  const un={id:'u'+S.nextId++, tipo:'guerrero', spr:s, home:{x,y}, target:null, cd:0, dead:false, wT:rint(3,8), moveT:null,
    hp:HP, maxhp:HP, atkCd:0, healCd:0, av:randAv()};
  hitPersonaje(s);
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'militar',ref:un}); });
  addMark(un,0x8ec8ff,66); S.units.push(un); return un;
}
/* ===== arqueros de TECHO: fijos al Ayuntamiento, se mueven sobre el techo y reciben el daño antes que el castillo ===== */
function techoRect(cas){                                // zona del techo (en px) donde se paran/mueven los arqueros
  return { x0:cas.x-90, x1:cas.x+90, y0:cas.y-CAT.castle.fh*T-24, y1:cas.y-CAT.castle.fh*T+40 };
}
function crearArqueroTecho(cas, gratis){
  if(!cas) return null; cas.archers=cas.archers||[];
  if(cas.archers.filter(a=>!a.dead).length>=2){ toast(L('Máximo 2 arqueros en el techo.','Max 2 roof archers.')); sfx('creak',0.3); return null; }
  const u=UNIDADES.arquero;
  if(!gratis && !pagar(u.costo)){ toast(L('No te alcanza: ','Not enough: ')+costoTxt(u.costo)); sfx('creak',0.4); return null; }
  const r=techoRect(cas), n=cas.archers.filter(a=>!a.dead).length;
  const x=(r.x0+r.x1)/2+(n===0?-32:32), y=(r.y0+r.y1)/2;
  const s=scene.add.sprite(x,y,'archer_blue_i').setOrigin(0.5,0.72).setScale(0.62).setDepth(cas.y+60).play('arq-i');
  const arc={spr:s, cas, tipo:'arqtecho', hp:u.hp, maxhp:u.hp, cd:0, dead:false, roofT:null, av:randAv()};
  hitPersonaje(s);
  s.on('pointerdown',p=>{ if(!S.colocando&&!p.rightButtonDown()) seleccionar({t:'techo',ref:arc}); });
  cas.archers.push(arc);
  if(!gratis){ sfx('bong',0.5); toast(L('🏹 Arquero en el techo.','🏹 Archer on the roof.')); }
  return arc;
}
function matarArqueroTecho(arc){
  if(arc.dead) return; arc.dead=true; killBar(arc);
  const d=scene.add.sprite(arc.spr.x,arc.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(arc.spr.y);
  d.once('animationcomplete',()=>scene.tweens.add({targets:d,alpha:0,duration:1500,onComplete:()=>d.destroy()}));
  arc.spr.destroy(); sfx('creak',0.5);
  if(arc.cas&&arc.cas.archers) arc.cas.archers=arc.cas.archers.filter(a=>a!==arc);
  cronica(L('🏹 Un arquero del techo cayó.','🏹 A roof archer fell.'),randAv());
  if(S.sel&&S.sel.ref===arc) deseleccionar(); refreshHUD();
}
function updateArquerosTecho(dtReal){
  const vivos=S.raid.on?S.raid.gob.filter(g=>!g.dead):[];
  for(const cas of S.buildings){ if(cas.tipo!=='castle'||!cas.archers) continue;
    const r=techoRect(cas);
    for(const arc of cas.archers){ if(arc.dead) continue;
      arc.spr.setDepth(cas.y+60);
      if(arc.roofT){                                    // orden del jugador: moverse SOBRE el techo (no puede salir)
        const tx=Phaser.Math.Clamp(arc.roofT.x,r.x0,r.x1), ty=Phaser.Math.Clamp(arc.roofT.y,r.y0,r.y1);
        const d=Phaser.Math.Distance.Between(arc.spr.x,arc.spr.y,tx,ty);
        if(d<3){ arc.roofT=null; arc.spr.play('arq-i',true); }
        else { const sp=40*dtReal, ang=Math.atan2(ty-arc.spr.y,tx-arc.spr.x);
          arc.spr.x+=Math.cos(ang)*sp; arc.spr.y+=Math.sin(ang)*sp; arc.spr.setFlipX(Math.cos(ang)<0);
          if(arc.spr.anims.currentAnim&&arc.spr.anims.currentAnim.key!=='arq-r') arc.spr.play('arq-r',true); }
      } else if(vivos.length){                          // en oleada: dispara al enemigo más cercano en rango
        arc.cd-=dtReal;
        const g=vivos.reduce((m,e)=>Phaser.Math.Distance.Between(arc.spr.x,arc.spr.y,e.spr.x,e.spr.y)<Phaser.Math.Distance.Between(arc.spr.x,arc.spr.y,m.spr.x,m.spr.y)?e:m,vivos[0]);
        if(g&&Phaser.Math.Distance.Between(arc.spr.x,arc.spr.y,g.spr.x,g.spr.y)<T*6){
          arc.spr.setFlipX(g.spr.x<arc.spr.x);
          if(arc.cd<=0){ arc.cd=1.6;
            const p=scene.add.image(arc.spr.x,arc.spr.y-16,'dot').setTint(0xd9c9a0).setDepth(99998);
            scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-14,duration:220,ease:'Linear',onComplete:()=>{p.destroy(); if(!g.dead) golpearEnemigo(g,1,0xd9c9a0);}});
            sfxAt('arrow',0.4,arc.spr.x,arc.spr.y); }
        }
      }
      if(arc.hp<arc.maxhp) drawHp(arc, arc.hp/arc.maxhp, 26, arc.spr.y-30); else hideBar(arc);
    }
  }
}
/* guardia inicial: 1 arquero en el techo + 1 soldado a un costado + fogata al otro */
function scatterBanners(){
  const tc=byTC(); if(!tc) return;
  tc.archers=[]; crearArqueroTecho(tc, true);                          // arquero fijo del techo (gratis)
  const y=(BY+tc.ty+CAT.castle.fh)*T+16;
  const sold=crearGuerrero((BX+tc.tx+0.6)*T+T/2, y); if(sold) sold.spr.setFlipX(false);   // soldado a la izquierda (puede salir)
  campfireAt((BX+tc.tx+CAT.castle.fw-0.6)*T+T/2, y+10);                // fogata al otro costado
}
/* mariposas (día) y luciérnagas (glow) — vida ambiente */
function scatterAmbientLife(){
  for(let i=0;i<9;i++){ let tx=rint(1,GW-2),ty=rint(1,GH-2); if(!walkable(tx,ty)) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty)*T+rint(-6,22), col=pick([0xff7ab0,0xffd24a,0x8ad0ff,0xb0ff8a,0xff9a5a]);
    const m=scene.add.image(x,y,'dot').setTint(col).setScale(0.7).setAlpha(0.92).setDepth(y);
    scene.tweens.add({targets:m,x:x+rint(-70,70),y:y+rint(-40,30),duration:rint(2200,4200),yoyo:true,repeat:-1,ease:'Sine.easeInOut',onUpdate:()=>m.setDepth(m.y)});
    scene.tweens.add({targets:m,scaleX:0.25,duration:160,yoyo:true,repeat:-1}); }
  for(let i=0;i<12;i++){ let tx=rint(1,GW-2),ty=rint(1,GH-2); if(!walkable(tx,ty)) continue;
    const x=(BX+tx)*T+T/2, y=(BY+ty)*T;
    const f=scene.add.image(x,y,'dot').setTint(0xfff29a).setScale(0.55).setDepth(97000).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({targets:f,alpha:0.12,duration:rint(700,1500),yoyo:true,repeat:-1});
    scene.tweens.add({targets:f,x:x+rint(-55,55),y:y+rint(-45,10),duration:rint(3200,6200),yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); }
}
/* barco grande de ambiente que cruza el mar (decorativo) */
function scheduleShip(){ scene.time.delayedCall(rint(30000,60000),spawnShip); }
function spawnShip(){
  const norte=Math.random()<0.5;
  const y=norte?rint(1,BY-1)*T:(HT-rint(1,BY-1))*T;
  const dir=Math.random()<0.5?1:-1;
  const sh=scene.add.sprite(dir>0?-MAR*0.4:WORLD_W+MAR*0.4,y,'boat').play('boat-a').setDepth(-22).setScale(0.8).setFlipX(dir<0);
  scene.tweens.add({targets:sh,x:dir>0?WORLD_W+MAR*0.4:-MAR*0.4,duration:rint(45000,70000),ease:'Linear',onComplete:()=>sh.destroy()});
  scheduleShip();
}

/* ===== EL ASEDIO — oleadas, piratas navales, jefe y puntaje ===== */
const ENEMY={
  torch: {tex:'goblin_torch',ai:'gt-i',  ar:'gt-r',  hp:1, dmg:11, esc:0.62, sp:46},
  spear: {tex:'spear_run',   ai:'sp-i',  ar:'sp-r',  hp:1, dmg:11, esc:0.52, sp:46},
  tnt:   {tex:'goblin_tnt',  ai:'gtnt-i',ar:'gtnt-r',hp:2, dmg:20, esc:0.62, sp:40},
  gnoll: {tex:'gnoll_walk',  ai:'gnoll-i',ar:'gnoll-r',hp:1,dmg:9, esc:0.6,  sp:66},         // rápido y débil (horda)
  pigrider:{tex:'pigrider_idle',ai:'prid-i',ar:'prid-r',hp:5,dmg:22,esc:0.5, sp:52},         // montado, tanque
  shaman:{tex:'shaman_idle', ai:'sham-i',ar:'sham-r',hp:2,dmg:16, esc:0.58, sp:40, ranged:true}, // lanza rayos a distancia
  thief: {tex:'thief_idle',  ai:'thief-i',ar:'thief-r',hp:1,dmg:0, esc:0.58, sp:78, ladron:true}, // roba recursos y huye
  troll: {tex:'troll_i',     ai:'troll-i',ar:'troll-r',aa:'troll-a',hp:11,dmg:28,esc:0.42, sp:30},            // tanque pesado y lento
  pshark:{tex:'pshark_i',    ai:'pshark-i',ar:'pshark-r',aa:'pshark-a',hp:3,dmg:15,esc:0.62, sp:48},       // pirata (llega por mar)
  bfish: {tex:'bfish_i',     ai:'bfish-i',ar:'bfish-r',hp:2,dmg:34,esc:0.6,  sp:44, ranged:true, bomba:true}, // pez bomba naval
  toro:  {tex:'minotaur_idle',ai:'toro-i',ar:'toro-r',hp:16,dmg:30,esc:0.62,boss:true, sp:38},
  lizard:{tex:'lizard_run',  ai:'lizard-i',ar:'lizard-r',hp:1,dmg:8, esc:0.7,  sp:74},        // lagarto veloz (enjambre)
  spider:{tex:'spider_run',  ai:'spider-i',ar:'spider-r',hp:1,dmg:7, esc:0.55, sp:78},        // araña rapidísima
  snake: {tex:'snake_run',   ai:'snake-i',ar:'snake-r',hp:2,dmg:12, esc:0.5,  sp:58},         // víbora
  turtle:{tex:'turtle_walk', ai:'turtle-w',ar:'turtle-w',hp:9,dmg:14, esc:0.5,  sp:24},        // tortuga acorazada (tanque lento)
  gnome: {tex:'gnome_r',     ai:'gnome-i',ar:'gnome-r',aa:'gnome-a',hp:1,dmg:10, esc:0.6,  sp:68},          // gnomo de gorro rojo (enjambre)
  skull: {tex:'skull_r',     ai:'skull-i',ar:'skull-r',aa:'skull-a',hp:2,dmg:13, esc:0.6,  sp:52},          // no-muerto
  panda: {tex:'panda_r',     ai:'panda-i',ar:'panda-r',hp:6,dmg:18, esc:0.55, sp:44},          // luchador pesado
  hshark:{tex:'hshark_r',    ai:'hshark-i',ar:'hshark-r',hp:3,dmg:20, esc:0.62, sp:46, ranged:true}, // arponero (naval, tira a distancia)
  // reino rival: leva humana enemiga (púrpura)
  rpawn: {tex:'pawn_purple', ai:'pawn_purple-i',ar:'pawn_purple-r',hp:4,dmg:13, esc:0.5,  sp:52},           // campesino rival con garrote
  rarcher:{tex:'archer_purple_i',ai:'rarq-i',ar:'rarq-r',hp:3,dmg:14, esc:0.5,  sp:46, ranged:true},        // arquero rival (tira flechas)
};
function costaTiles(){                             // tiles de tierra pegados al agua (borde de la isla)
  const out=[];
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    if(!walkable(x,y)||S.grid[y][x]!==null) continue;
    if(!isLand(x-1,y)||!isLand(x+1,y)||!isLand(x,y-1)||!isLand(x,y+1)) out.push({x,y});
  }
  return out;
}
function spawnEnemy(kind,tx,ty){
  const e=ENEMY[kind];
  const gx=(BX+tx)*T+T/2, gy=(BY+ty+1)*T-(e.boss?18:12);   // pies dentro del tile, no sobre el agua
  const s=scene.add.sprite(gx,gy,e.tex).setOrigin(0.5,0.72).setScale(e.esc).setDepth(gy);
  if(e.tint) s.setTint(e.tint);
  s.play(e.ar); revelar(gx,gy,3);
  const boostHp=e.hp + (e.boss?Math.floor(S.wave/5)*6:Math.floor(S.wave/4));   // más vida en oleadas altas
  const boostDmg=Math.round(e.dmg*(1+S.wave*0.05));                            // más daño con el tiempo
  const g={spr:s,kind,ai:e.ai,ar:e.ar,hp:boostHp,maxhp:boostHp,dmg:boostDmg,sp:e.sp||46,ranged:!!e.ranged,bomba:!!e.bomba,ladron:!!e.ladron,boss:!!e.boss,target:null,atkT:0,dead:false};
  if(e.boss){ g.glow=scene.add.image(gx,gy-6,'dot').setTint(0xff3a2a).setScale(6).setAlpha(0.28).setDepth(gy-1);
    scene.tweens.add({targets:g.glow,scale:8,alpha:0.14,duration:700,yoyo:true,repeat:-1}); }
  S.raid.gob.push(g);
}
function spawnTorrePirata(t){                      // torre pirata flotante que bombardea desde el mar
  const bx=(BX+t.x)*T+T/2, by=(BY+t.y)*T - T*1.6;  // mar afuera del borde
  const tw=scene.add.sprite(bx,by,'ptower').play('ptower-a').setDepth(by).setScale(0.85);
  let disparos=6;
  const ev=scene.time.addEvent({delay:1600,loop:true,callback:()=>{
    if(S.over||S.phase!=='wave'||disparos<=0){ ev.remove();
      scene.tweens.add({targets:tw,y:by+20,alpha:0,duration:1500,onComplete:()=>tw.destroy()}); return; }
    disparos--; cañonazo(tw.x,tw.y-10);
  }});
  scene.tweens.add({targets:tw,y:by-5,duration:1400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});   // flota
}
function oleadaNaval(cnt,costa){                   // piratas que desembarcan desde el mar en un barco caballito
  if(!costa.length) return;
  const t=pick(costa), cx=(BX+t.x)*T+T/2, cy=(BY+t.y+1)*T-8;
  const desdeIzq=t.x<GW/2, fromX=desdeIzq?-MAR*0.3:WORLD_W+MAR*0.3;
  const boat=scene.add.sprite(fromX,cy,'seahorse').play('seahorse-a').setDepth(cy-2).setScale(0.95).setFlipX(!desdeIzq);
  if(S.wave>=5) spawnTorrePirata(pick(costa));     // torre pirata bombardea desde la 5
  scene.tweens.add({targets:boat,x:cx+(desdeIzq?-30:30),duration:3500,ease:'Sine.easeIn',onComplete:()=>{
    if(!S.over){ cañonazo(boat.x,boat.y-20); scene.time.delayedCall(1400,()=>{ if(boat.active&&!S.over) cañonazo(boat.x,boat.y-20); }); }  // bombardeo naval
    scene.tweens.add({targets:boat,x:fromX,alpha:0,delay:2600,duration:4500,onComplete:()=>boat.destroy()});
  }});
  for(let i=0;i<cnt;i++){ const tt=pick(costa);
    const k=S.wave>=6&&Math.random()<0.35?'bfish':(S.wave>=4&&Math.random()<0.35?'hshark':'pshark');   // arponero desde la 4
    splashAt((BX+tt.x)*T+T/2,(BY+tt.y+1)*T,0.9);      // salpicadura al desembarcar
    spawnEnemy(k,tt.x,tt.y); }
}
function cañonazo(fx,fy){                            // el barco pirata dispara una bomba a un edificio
  const cand=S.buildings.filter(b=>b.estado==='ok'&&!b.danado);
  if(!cand.length) return;
  const b=cand.reduce((m,x)=>Phaser.Math.Distance.Between(fx,fy,x.x,x.y)<Phaser.Math.Distance.Between(fx,fy,m.x,m.y)?x:m,cand[0]);
  const bomb=scene.add.sprite(fx,fy,'bomb').play('bomb-a').setDepth(99990).setScale(0.7);
  sfx('latch',0.4);
  scene.tweens.add({targets:bomb,x:b.x,y:b.y-20,duration:900,ease:'Quad.easeIn',
    onUpdate:()=>bomb.setDepth(99990), onComplete:()=>{ bomb.destroy(); explosionAt(b.x,b.y-14,1.3);
      scene.cameras.main.shake(180,0.006);
      if(b.estado==='ok'&&!b.danado){ b.hp-=45;
        scene.tweens.add({targets:b.sprs[0],x:'+=4',duration:50,yoyo:true,repeat:2});
        if(b.hp<=0){ if(b.tipo==='castle'){ gameOver(); return; }
          b.danado=true; const w=S.ald.find(a=>a.bId===b.id&&a.estado==='peon'); if(w) parar(w);
          refreshBuilding(b); toast(L('💣 ¡','💣 ')+CAT[b.tipo].nom+L(' bombardeado por los piratas!',' bombarded by pirates!')); } } } });
}
// arquetipos de oleada: cada una se siente distinta (mezcla de enemigos variable)
const FLAVORS=['goblins','horda','bestias','piratas','mixta','reino'];
function componerOleada(w){                          // devuelve {flavor, spawns:[kind...], naval, bossCount, msg}
  const costaN=2+Math.ceil(w*1.4);
  let flavor;
  if(w%5===0) flavor='jefe';
  else if(w%3===0) flavor='piratas';
  else flavor=pick(FLAVORS.filter(f=> (f!=='bestias'||w>=4) && (f!=='horda'||w>=2) && (f!=='reino'||w>=4) ));
  const spawns=[];
  const add=(k,n)=>{ for(let i=0;i<n;i++) spawns.push(k); };
  const canTnt=w>=3, canGnoll=w>=2, canRider=w>=4, canSham=w>=5, canThief=w>=3, canTroll=w>=6;
  const canLiz=w>=2, canSpider=w>=4, canSnake=w>=3, canTurtle=w>=5;
  const canGnome=w>=2, canSkull=w>=4, canPanda=w>=6;
  if(flavor==='horda'){ add('gnoll',Math.ceil(costaN*0.9)); if(canGnome)add('gnome',Math.ceil(costaN*0.4)); if(canLiz)add('lizard',2); if(canSpider)add('spider',2); if(canTnt)add('tnt',1); if(canThief)add('thief',1); }
  else if(flavor==='bestias'){ add(canRider?'pigrider':'spear',Math.ceil(costaN*0.4)); if(canSnake)add('snake',2); if(canSpider)add('spider',2); if(canLiz)add('lizard',2); if(canTurtle)add('turtle',1); if(canPanda)add('panda',1); if(canSham)add('shaman',1); if(canTroll)add('troll',1); }
  else if(flavor==='piratas'||flavor==='jefe'){ add(pick(['torch','spear']),Math.ceil(costaN*0.7)); if(canGnoll)add('gnoll',2); if(canSkull)add('skull',2); if(flavor==='jefe'&&canTroll)add('troll',1); if(flavor==='jefe'&&canTurtle)add('turtle',1); if(flavor==='jefe'&&canPanda)add('panda',1); }
  else if(flavor==='mixta'){ add('torch',2); add('spear',2); if(canGnome)add('gnome',2); if(canSkull)add('skull',2); if(canLiz)add('lizard',2); if(canTnt)add('tnt',1); if(canRider)add('pigrider',1); if(canSham)add('shaman',1); if(canThief&&Math.random()<0.5)add('thief',1); }
  else if(flavor==='reino'){ // leva humana rival: campesinos con garrote + arqueros
    add('rpawn',Math.ceil(costaN*0.7)); add('rarcher',Math.max(2,Math.ceil(costaN*0.35)));
    if(canThief)add('thief',1); if(canTroll)add('troll',1); }
  else { // goblins clásicos
    for(let i=0;i<costaN;i++) add(canTnt&&Math.random()<Math.min(0.5,0.08*w)?'tnt':pick(['torch','torch','spear']),1);
    if(canThief&&Math.random()<0.4)add('thief',1); }
  const naval = flavor==='piratas' || (w>=3 && Math.random()<0.25);
  // El Black Bull: seguro en oleadas jefe (5,10,...) y con chance en otras (desde la 4)
  let bossCount = flavor==='jefe' ? 1+Math.floor(w/10) : (w>=4 && Math.random()<0.16 ? 1 : 0);
  return {flavor,spawns,naval,bossCount};
}
function lanzarOleada(){
  if(S.phase==='wave'||S.over) return;
  S.wave++; S.raid.on=true; S.raid.t=0; S.raid.gob=[]; S.phase='wave';
  S.raid.dur=DUR_OLEADA(S.wave); S.raid.tLeft=S.raid.dur;   // el asedio dura un tiempo fijo
  sfx('latch',0.65); scene.cameras.main.shake(240,0.005);
  $('raidbanner').classList.add('on'); { const bm=$('btnMercen'); if(bm) bm.style.display='inline-block'; }
  const costa=costaTiles(), comp=componerOleada(S.wave);
  for(const k of comp.spawns){ const t=costa.length?pick(costa):{x:rint(2,GW-3),y:2}; spawnEnemy(k,t.x,t.y); }
  if(comp.naval) oleadaNaval(1+Math.floor(S.wave/3),costa);
  for(let i=0;i<comp.bossCount;i++){ const t=costa.length?pick(costa):{x:Math.floor(GW/2),y:2}; spawnEnemy('toro',t.x,t.y); }
  S.units.forEach(u=>{ if(!u.dead) u.spr.play(uAnim(u.tipo,'r'),true); });
  const FL={goblins:L('⚔️ Goblins por la costa.','⚔️ Goblins along the coast.'),horda:L('🐺 ¡HORDA de gnolls!','🐺 GNOLL horde!'),bestias:L('🐗 Bestias y jinetes de jabalí.','🐗 Beasts and boar riders.'),
    piratas:L('🏴‍☠️ Piratas desembarcan por el mar.','🏴‍☠️ Pirates land from the sea.'),mixta:L('⚔️ Asalto combinado.','⚔️ Combined assault.'),jefe:L('🐂 ¡JEFE! THE BLACK BULL lidera.','🐂 BOSS! THE BLACK BULL leads.'),
    reino:L('🏰 ¡Un REINO RIVAL manda su leva: campesinos y arqueros púrpura!','🏰 A RIVAL KINGDOM sends its levy: purple peasants and archers!')};
  let m=FL[comp.flavor]; if(comp.bossCount&&comp.flavor!=='jefe') m+=L(' Y aparece THE BLACK BULL…',' And THE BLACK BULL appears…');
  const msg=L('¡OLEADA ','WAVE ')+S.wave+'! '+m;
  toast(msg); cronica(m, randAv());
  updateBanner();
}
function finOleadaPorTiempo(){                        // se acabó el tiempo del asedio: los sobrevivientes se retiran
  if(S.phase!=='wave'||S.over) return;
  S.raid.gob.filter(g=>!g.dead).forEach(g=>{ g.dead=true; killBar(g); if(g.glow){g.glow.destroy();g.glow=null;}
    scene.tweens.add({targets:g.spr,alpha:0,y:'-=12',duration:900,onComplete:()=>g.spr.destroy()}); });
  toast(L('⏳ ¡Aguantaste el asedio! Los enemigos se retiran.','⏳ You held the siege! The enemies retreat.'));
  finOleada();
}
function finOleada(){
  if(S.phase!=='wave') return;                       // evitá doble cierre (tiempo + última baja a la vez)
  S.raid.on=false; S.phase='prep'; S.phaseT=PREPW;
  $('raidbanner').classList.remove('on'); { const bm=$('btnMercen'); if(bm) bm.style.display='none'; }
  S.raid.war.forEach(w=>{ if(!w.dead){ scene.tweens.add({targets:w.spr,alpha:0,duration:1200,onComplete:()=>w.spr.destroy()}); } });
  S.raid.war=[];
  S.units.forEach(u=>{ if(!u.dead){ u.spr.play(uAnim(u.tipo,'i'),true); u.target=null; u.moveT=null; } });
  S.stats.raids++;
  const oro=40+10*S.wave; S.oro=Math.min(CAP,S.oro+oro); S.ambar+=5; S.recursos+=oro;
  S.score=calcScore(); if(S.score>S.best) S.best=S.score;
  sfx('bong',0.7); toast(L('🛡️ ¡Oleada ','🛡️ Wave ')+S.wave+L(' resistida! +',' held! +')+oro+L(' oro. Reforzá para la próxima.',' gold. Reinforce for the next one.'));
  cronica(L('🛡️ Oleada ','🛡️ Wave ')+S.wave+L(' resistida · ',' held · ')+S.score+' pts',randAv());
  // avisar desbloqueos de defensa nuevos
  const nuevos=Object.entries(CAT).filter(([k,c])=>c.reqWave===S.wave).map(([k,c])=>c.nom);
  if(nuevos.length){ toast(L('🔓 ¡Desbloqueaste: ','🔓 Unlocked: ')+nuevos.join(' · ')+'!'); cronica(L('🔓 Nuevo: ','🔓 New: ')+nuevos.join(', '),randAv()); }
  buildGrid();
  updateBanner(); refreshHUD(); refreshQuest();
}
function gameOver(){
  if(S.over) return; S.over=true; S.phase='over'; S.raid.on=false;
  S.score=calcScore(); if(S.score>S.best) S.best=S.score; guardarRecord();   // suma este puntaje al listado de récords
  sfx('creak',0.7); scene.cameras.main.shake(500,0.01);
  $('raidbanner').classList.remove('on'); { const bm=$('btnMercen'); if(bm) bm.style.display='none'; }
  updateBanner(); showGameOver();
}
function showGameOver(){
  let el=$('gameover');
  if(!el){ el=document.createElement('div'); el.id='gameover'; el.className='gameover';
    document.querySelector('.stage').appendChild(el); }
  const mins=Math.floor(S.tSurv/60), segs=Math.floor(S.tSurv%60);
  el.innerHTML='<div class="gtitle">'+L('EL ASEDIO TERMINÓ','THE SIEGE IS OVER')+'</div>'+
    '<div class="gstat">'+L('Oleadas resistidas: <b>','Waves survived: <b>')+S.wave+'</b></div>'+
    '<div class="gstat">'+L('Tiempo aguantado: <b>','Time survived: <b>')+mins+'m '+segs+'s</b> (+'+Math.floor(S.tSurv)+')</div>'+
    '<div class="gstat">'+L('Recursos obtenidos: <b>','Resources gathered: <b>')+Math.floor(S.recursos)+'</b> (+'+Math.floor(S.recursos)+')</div>'+
    '<div class="gstat">'+L('Enemigos derrotados: <b>','Enemies defeated: <b>')+S.kills+'</b> (+'+(S.kills*15)+')</div>'+
    '<div class="gstat">'+L('Puntaje: <b>','Score: <b>')+S.score+L('</b> · Récord: <b>','</b> · Record: <b>')+S.best+'</b></div>'+
    '<button class="ghost" id="btnRetry">'+L('JUGAR DE NUEVO','PLAY AGAIN')+'</button>';
  el.classList.add('on');
  $('btnRetry').onclick=()=>location.reload();
}
function spawnDefensor(x,y){
  const s=scene.add.sprite(x,y,'warrior_i').setOrigin(0.5,0.72).setScale(0.72).setDepth(y);
  s.play('war-r'); S.raid.war.push({spr:s,tipo:'guerrero',target:null,dead:false,hp:40,maxhp:40,atkCd:0});
}
function golpearEnemigo(g,dmg,color){              // daño con vida: bosses aguantan varios golpes
  g.hp-=dmg; burstAt(g.spr.x,g.spr.y-16,color||0xffffff);
  if(g.hp<=0) killGoblin(g);
  else { g.spr.setTint(0xffffff); scene.time.delayedCall(80,()=>{ if(g.spr&&g.spr.active){ if(ENEMY[g.kind].tint) g.spr.setTint(ENEMY[g.kind].tint); else g.spr.clearTint(); } }); }
}
function golpearAnimal(m,dmg,color){                // fauna recibe daño de una unidad militar
  if(m.dead) return; m.hp-=dmg; burstAt(m.spr.x,m.spr.y-14,color||0xffffff);
  if(m.hp<=0) matarAnimal(m);
}
function dañarObjetivo(t,dmg,color){                // despacha: enemigo de oleada o animal
  if(t&&t.kind!==undefined&&ENEMY[t.kind]) golpearEnemigo(t,dmg,color);
  else golpearAnimal(t,dmg,color);
}
function killGoblin(g){
  if(g.dead) return; g.dead=true;
  killBar(g);
  if(g.glow){ g.glow.destroy(); g.glow=null; }
  burstAt(g.spr.x,g.spr.y-14, g.kind==='pshark'?0x6ac0e0 : g.boss?0xc060ff : 0x7fbf5a); dustAt(g.spr.x,g.spr.y,2);
  if(g.kind==='tnt'||g.boss) explosionAt(g.spr.x,g.spr.y-10,g.boss?1.6:1.1);   // TNT/jefe estallan
  if(g.boss){ scene.cameras.main.flash(300,120,60,140); S.stats.bull++; cronica(L('🐂 ¡THE BLACK BULL derrotado!','🐂 THE BLACK BULL defeated!'),randEnAv()); }
  g.spr.destroy(); S.kills++; if(g.boss) S.recursos+=200;   // el jefe deja un botín que suma al récord
  if(S.raid.gob.length&&S.raid.gob.every(x=>x.dead)) finOleada();
}
function dañarEdificio(b,dmg,color){                 // aplica daño a un edificio; devuelve true si cae el Ayuntamiento
  if(!b||b.estado!=='ok'||b.danado) return false;
  if(b.tipo==='castle'&&b.archers){                  // el arquero del techo recibe el golpe antes que el castillo
    const arc=b.archers.find(a=>!a.dead);
    if(arc){ arc.hp-=dmg; flyText(arc.spr.x,arc.spr.y-24,'-'+dmg,'#ff9a8a');
      arc.spr.setTint(0xff6a5a); scene.time.delayedCall(120,()=>{ if(arc.spr&&arc.spr.active) arc.spr.clearTint(); });
      if(arc.hp<=0) matarArqueroTecho(arc);
      if(S.sel&&S.sel.ref===arc) renderSel();
      return false; }
  }
  b.hp-=dmg;
  scene.tweens.add({targets:b.sprs[0],x:'+=3',duration:50,yoyo:true,repeat:1});
  burstAt(b.x,b.y-24,color||0xe5533a);
  if(b.hp<=0){
    if(b.tipo==='castle'){ gameOver(); return true; }
    b.danado=true; const w=S.ald.find(a=>a.bId===b.id&&a.estado==='peon'); if(w) parar(w);
    refreshBuilding(b); sfx('fire',0.4);
    toast(L('🔥 ¡','🔥 ')+CAT[b.tipo].nom+L(' dañado! Reparalo entre oleadas.',' damaged! Repair it between waves.'));
  }
  return false;
}
function escapaLadron(g){                            // el ladrón se va del mapa (sin puntos ni explosión)
  if(g.dead) return; g.dead=true; g.spr.destroy();
  if(S.raid.gob.length&&S.raid.gob.every(x=>x.dead)) finOleada();
}
function tickLadron(g,dtReal){
  if(g.huyendo){
    const ex=g.spr.x<WORLD_W/2?-100:WORLD_W+100, ang=Math.atan2(0,ex-g.spr.x);
    g.spr.x+=Math.cos(ang)*g.sp*1.25*dtReal; g.spr.setFlipX(Math.cos(ang)<0); g.spr.setDepth(g.spr.y);
    if(g.spr.x<-60||g.spr.x>WORLD_W+60) escapaLadron(g);
    return;
  }
  if(!g.target||g.target.estado!=='ok'){ const cands=S.buildings.filter(b=>b.estado==='ok');
    g.target=cands.length?cands.reduce((m,b)=>Phaser.Math.Distance.Between(g.spr.x,g.spr.y,b.x,b.y)<Phaser.Math.Distance.Between(g.spr.x,g.spr.y,m.x,m.y)?b:m,cands[0]):null;
    if(!g.target){ g.huyendo=true; return; } }
  const d=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,g.target.x,g.target.y-20);
  if(d>34){ const sp=g.sp*dtReal, ang=Math.atan2(g.target.y-20-g.spr.y,g.target.x-g.spr.x);
    g.spr.x+=Math.cos(ang)*sp; g.spr.y+=Math.sin(ang)*sp; g.spr.setFlipX(Math.cos(ang)<0); g.spr.setDepth(g.spr.y);
    if(g.spr.anims.currentAnim&&g.spr.anims.currentAnim.key!==g.ar) g.spr.play(g.ar,true);
  } else {
    const ro=Math.min(S.oro,rint(25,60)), rm=Math.min(S.madera,rint(25,60));
    S.oro-=ro; S.madera-=rm; g.huyendo=true;
    flyText(g.spr.x,g.spr.y-30,'-'+(ro+rm)+'💰','#ff9a8a'); sfx('coins',0.5);
    toast(L('🦝 ¡Un ladrón te robó ','🦝 A thief stole ')+ro+L(' oro y ',' gold and ')+rm+L(' madera! Cazalo antes de que escape.',' wood! Hunt it before it escapes.'));
    cronica(L('🦝 Robo: -','🦝 Theft: -')+ro+L(' oro · -',' gold · -')+rm+L(' madera',' wood'),randEnAv()); refreshHUD();
  }
}
const esBloqueante=gv=>typeof gv==='number'||(typeof gv==='string'&&(gv[0]==='s'||gv[0]==='n'));   // edificios, escenario Y nodos (árbol/oro) cortan el paso
// pisar bien: tierra o puente, sin acantilado, sin edificio/nodo/escenario. Los de tierra no cruzan agua.
function pisoLibre(px,py){ const t=tileOfPx(px,py); if(!isIn(t.x,t.y)) return false;
  return (S.land[t.y][t.x]||S.bridge[t.y][t.x]) && !S.cliff[t.y][t.x] && !esBloqueante(S.grid[t.y][t.x]); }
function avanzarHacia(ent,tx,ty,sp,cruza){            // mueve hacia (tx,ty) deslizando; no cruza agua/acantilado ni atraviesa edificios/nodos (salvo cruza=salir de bolsillo)
  const piso = cruza ? terrenoLibre : pisoLibre;
  const ang=Math.atan2(ty-ent.spr.y,tx-ent.spr.x), dx=Math.cos(ang)*sp, dy=Math.sin(ang)*sp;
  let moved=true;
  if(piso(ent.spr.x+dx,ent.spr.y+dy)){ ent.spr.x+=dx; ent.spr.y+=dy; }
  else if(piso(ent.spr.x+dx,ent.spr.y)){ ent.spr.x+=dx; }
  else if(piso(ent.spr.x,ent.spr.y+dy)){ ent.spr.y+=dy; }
  else { const px=Math.cos(ang+Math.PI/2)*sp, py=Math.sin(ang+Math.PI/2)*sp;   // bordear
    if(piso(ent.spr.x+px,ent.spr.y+py)){ ent.spr.x+=px; ent.spr.y+=py; }
    else if(piso(ent.spr.x-px,ent.spr.y-py)){ ent.spr.x-=px; ent.spr.y-=py; }
    else moved=false; }
  ent.spr.setFlipX(dx<0); ent.spr.setDepth(ent.spr.y);
  return moved;
}
const ESDEFENSA=t=>['torre','muralla','murallon','cuartel','arqueria','monasterio'].includes(t);
function objsEnemigo(){                               // prioridad del asedio: defensa → Ayuntamiento → proveedores de recursos → el resto
  const ok=S.buildings.filter(b=>b.estado==='ok'&&!b.danado);
  const def=ok.filter(b=>ESDEFENSA(b.tipo));
  if(def.length) return def;
  const cas=ok.filter(b=>b.tipo==='castle');
  if(cas.length) return cas;
  const rec=ok.filter(b=>CAT[b.tipo].prod);          // granja u otros proveedores de recursos
  if(rec.length) return rec;
  return ok;                                          // por último, casas y demás
}
function hayObjetivoPrioritario(){                    // ¿quedan edificios de defensa / Ayuntamiento / recursos?
  return S.buildings.some(b=>b.estado==='ok'&&!b.danado&&(ESDEFENSA(b.tipo)||b.tipo==='castle'||CAT[b.tipo].prod));
}
/* ===== anti-traba: nadie queda encerrado ===== */
function tileLibreCercaDe(px,py){                     // centro (en px) del tile transitable más cercano a (px,py)
  const t=tileOfPx(px,py);
  if(walkable(t.x,t.y)) return {x:(BX+t.x)*T+T/2, y:(BY+t.y)*T+T/2};
  for(let r=1;r<=8;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){
    if(Math.max(Math.abs(ox),Math.abs(oy))!==r) continue;             // sólo el anillo exterior
    const x=t.x+ox, y=t.y+oy;
    if(walkable(x,y)) return {x:(BX+x)*T+T/2, y:(BY+y)*T+T/2};
  }
  return null;
}
function escaparSiAtascado(ent,sp){                   // si quedó sobre un tile NO transitable (edificio/agua/nodo), lo empuja al más cercano libre
  if(ent.cruza) return false;                          // está cruzando su propio edificio a propósito (saliendo de un bolsillo): no lo saques
  if(landAtPx(ent.spr.x,ent.spr.y)) return false;
  const dst=tileLibreCercaDe(ent.spr.x,ent.spr.y); if(!dst) return false;
  const d=Phaser.Math.Distance.Between(ent.spr.x,ent.spr.y,dst.x,dst.y);
  if(d<4){ ent.spr.x=dst.x; ent.spr.y=dst.y; }
  else { const ang=Math.atan2(dst.y-ent.spr.y,dst.x-ent.spr.x); ent.spr.x+=Math.cos(ang)*Math.max(sp,2.4); ent.spr.y+=Math.sin(ang)*Math.max(sp,2.4); }
  ent.spr.setDepth(ent.spr.y); if(ent.path)ent.path=null;
  return true;
}
function tileBordeEdificio(b,fromX,fromY){            // tile transitable pegado al footprint, el más cercano a (fromX,fromY)
  const c=CAT[b.tipo]; let best=null,bd=1e9;
  for(let y=b.ty-1;y<=b.ty+c.fh;y++)for(let x=b.tx-1;x<=b.tx+c.fw;x++){
    const borde=(x<b.tx||x>=b.tx+c.fw||y<b.ty||y>=b.ty+c.fh);
    if(!borde||!walkable(x,y)) continue;
    const px=(BX+x)*T+T/2, py=(BY+y)*T+T/2, dd=Phaser.Math.Distance.Between(fromX,fromY,px,py);
    if(dd<bd){bd=dd;best={x,y};}
  }
  return best;
}
function bordesEdificio(b){                            // TODOS los tiles transitables pegados al footprint (frente/costados primero)
  const c=CAT[b.tipo], out=[];
  for(let y=b.ty-1;y<=b.ty+c.fh;y++)for(let x=b.tx-1;x<=b.tx+c.fw;x++){
    const borde=(x<b.tx||x>=b.tx+c.fw||y<b.ty||y>=b.ty+c.fh);
    if(borde&&walkable(x,y)) out.push({x,y, frente:(y>=b.ty+c.fh)});
  }
  out.sort((p,q)=>(q.frente-p.frente));                // el frente (sur) primero: se ve la obra
  return out;
}
function desalojarZona(b){                            // saca del footprint de un edificio nuevo a cualquier entidad viva atrapada
  const c=CAT[b.tipo];
  const dentro=s=>{ const t=tileOfPx(s.x,s.y); return t.x>=b.tx&&t.x<b.tx+c.fw&&t.y>=b.ty&&t.y<b.ty+c.fh; };
  for(const L of [S.units,S.ald,S.allies,S.raid.gob,S.animals]) for(const e of L){
    if(!e||e.dead||!e.spr) continue;
    if(dentro(e.spr)){ const dst=tileLibreCercaDe(e.spr.x,e.spr.y);
      if(dst){ e.spr.x=dst.x; e.spr.y=dst.y; e.spr.setDepth(e.spr.y); e.path=null; e.moveT=null; if(e.tx!=null){e.tx=dst.x;e.ty=dst.y;} } } }
}
function raidTick(dtReal){
  const R=S.raid;
  const vivos=R.gob.filter(g=>!g.dead);
  if(!vivos.length){ return; }
  const tc=byTC();
  const hayPrio=hayObjetivoPrioritario();              // ¿quedan defensa/Ayuntamiento/recursos? entonces las unidades van al final
  for(const g of vivos){
    g.spr.setDepth(g.spr.y);                          // profundidad siempre al día: nunca detrás del edificio si está adelante
    if(g.glow){ g.glow.x=g.spr.x; g.glow.y=g.spr.y-6; g.glow.setDepth(g.spr.y-1); }
    if(g.hp<g.maxhp) drawHp(g, g.hp/g.maxhp, g.boss?46:24, g.spr.y-g.spr.originY*g.spr.displayHeight*0.82); else hideBar(g);
    if(g.ladron){ tickLadron(g,dtReal); continue; }
    if(hayPrio && g.esUnidad){ g.target=null; g.esUnidad=false; g.path=null; g.bestD=null; }   // hay edificios prioritarios: soltá la unidad y andá por ellos
    // el asedio prioriza EDIFICIOS (defensa→Ayuntamiento→recursos); sólo va por unidades cuando ya no quedan objetivos prioritarios
    if(!g.ranged && !hayPrio){
      let uNear=null, best=T*3.6;
      for(const u of S.units) if(!u.dead){ const dd=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,u.spr.x,u.spr.y); if(dd<best){best=dd;uNear=u;} }
      for(const u of S.raid.war) if(!u.dead){ const dd=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,u.spr.x,u.spr.y); if(dd<best){best=dd;uNear=u;} }
      for(const u of S.allies) if(!u.dead){ const dd=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,u.spr.x,u.spr.y); if(dd<best){best=dd;uNear=u;} }
      for(const a of S.ald){ if(a.estado==='refugiado') continue; const dd=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,a.spr.x,a.spr.y); if(dd<best){best=dd;uNear=a;} }
      if(uNear){ if(g.target!==uNear){ g.path=null; g.bestD=null; g.noProg=0; } g.target=uNear; g.esUnidad=true; }
      else if(g.esUnidad){ g.target=null; g.esUnidad=false; g.path=null; g.bestD=null; }
    }
    if(!g.target||(g.esUnidad&&g.target.dead)||(!g.esUnidad&&(g.target.danado||g.target.estado!=='ok'))){
      const cands=objsEnemigo();   // primero las torres: el enemigo va directo a ellas
      const nuevo = cands.length ? cands.reduce((m,b)=>Phaser.Math.Distance.Between(g.spr.x,g.spr.y,b.x,b.y)<Phaser.Math.Distance.Between(g.spr.x,g.spr.y,m.x,m.y)?b:m,cands[0])
                              : (tc||null);
      if(nuevo!==g.target){ g.path=null; g.bestD=null; g.noProg=0; }
      g.target=nuevo; g.esUnidad=false;
      if(!g.target){ continue; }
    }
    const txp=g.esUnidad?g.target.spr.x:g.target.x, typ=g.esUnidad?g.target.spr.y:g.target.y-2;   // apunta a la BASE del edificio (profundidad correcta)
    let d, rango;
    if(!g.esUnidad&&g.target.tipo&&CAT[g.target.tipo]){   // edificio: distancia al BORDE del footprint (así pega desde cualquier lado, no se traba)
      const b=g.target, c=CAT[b.tipo];
      const L=(BX+b.tx)*T, Tp=(BY+b.ty)*T, R=(BX+b.tx+c.fw)*T, B=(BY+b.ty+c.fh)*T;
      const dx=Math.max(L-g.spr.x,0,g.spr.x-R), dy=Math.max(Tp-g.spr.y,0,g.spr.y-B);
      d=Math.hypot(dx,dy); rango=g.ranged?T*3.6:T*0.75;
    } else { d=Phaser.Math.Distance.Between(g.spr.x,g.spr.y,txp,typ); rango=g.ranged?T*3.6:34; }
    if(d>rango){
      const sp=(g.sp||46)*dtReal;
      if(g.spr.anims.currentAnim&&g.spr.anims.currentAnim.key!==g.ar) g.spr.play(g.ar,true);
      if(escaparSiAtascado(g,sp)){ g.stuck=0; g.noProg=0; }   // quedó SOBRE un tile bloqueado (ej: construyeron encima): sale al más cercano
      else {
        let following = !!(g.path&&g.path.length);
        let aimX=txp, aimY=typ;                                // apuntá al próximo waypoint de la ruta BFS si la hay; si no, directo (voraz)
        if(following){ const wp=g.path[0];
          if(Phaser.Math.Distance.Between(g.spr.x,g.spr.y,wp.x,wp.y)<12) g.path.shift();
          if(g.path.length){ aimX=g.path[0].x; aimY=g.path[0].y; } else { g.path=null; following=false; } }
        const moved=avanzarHacia(g,aimX,aimY,sp);
        // progreso REAL: si la distancia al objetivo no baja, está deslizando contra un muro sin avanzar (aunque "se mueva")
        if(g.bestD==null||d<g.bestD-3){ g.bestD=d; g.noProg=0; }
        else g.noProg=(g.noProg||0)+dtReal;
        if(!moved || (!following && g.noProg>0.5)){        // trabado (o deslizando sin progresar): pedí ruta BFS que rodee el obstáculo
          g.noProg=0; g.bestD=d; g.path=null;
          const et=tileOfPx(g.spr.x,g.spr.y);
          let dst=null;
          if(g.esUnidad){ const tt=tileOfPx(g.target.spr.x,g.target.spr.y); dst=walkable(tt.x,tt.y)?tt:adjWalkable(tt.x,tt.y); }
          else if(g.target.tipo&&CAT[g.target.tipo]) dst=tileBordeEdificio(g.target,g.spr.x,g.spr.y);
          else { const tt=tileOfPx(txp,typ); dst=walkable(tt.x,tt.y)?tt:adjWalkable(tt.x,tt.y); }
          g.path = dst ? findPath(et.x,et.y,dst.x,dst.y) : null;
          if(!g.path){ g.target=null; g.esUnidad=false; g.bestD=null; }   // realmente sin ruta: reevaluá objetivo el próximo tick
        }
      }
    } else {
      g.path=null; g.bestD=null; g.noProg=0;                  // en rango: a pegar, ruta consumida
      g.atkT+=dtReal;
      if(g.atkT>(g.ranged?2.0:1.1)){ g.atkT=0;
        if(g.kind==='toro'){ g.spr.play(g.ar,true); embestida(g.spr, g.esUnidad?g.target.spr.x:g.target.x, g.esUnidad?g.target.spr.y:g.target.y-2); }   // el Toro embiste
        else g.spr.play(g.aa||g.ai,true);   // anim de ataque si el enemigo la tiene (gnomo/esqueleto/troll/pirata), si no la de idle
        if(g.esUnidad){                               // pega a la unidad defensora
          dañarDefensor(g.target,g.dmg); if(g.target.dead){ g.target=null; g.esUnidad=false; }
        } else if(g.bomba){                           // pez bomba: lanza una bomba que estalla
          const tgt=g.target, p=scene.add.sprite(g.spr.x,g.spr.y-20,'bomb').play('bomb-a').setDepth(99990).setScale(0.6);
          sfx('latch',0.35);
          scene.tweens.add({targets:p,x:tgt.x,y:tgt.y-16,duration:520,ease:'Quad.easeIn',onComplete:()=>{p.destroy(); explosionAt(tgt.x,tgt.y-12,1.1); dañarEdificio(tgt,g.dmg,0xffb03a);}});
        } else if(g.ranged){                          // rayo mágico a distancia (shaman)
          const p=scene.add.image(g.spr.x,g.spr.y-20,'dot').setTint(0xb060ff).setDepth(99998).setScale(1.4);
          const tgt=g.target; sfx('bell',0.3);
          scene.tweens.add({targets:p,x:tgt.x,y:tgt.y-16,duration:280,onComplete:()=>{p.destroy(); dañarEdificio(tgt,g.dmg,0xb060ff);}});
        } else {
          if(dañarEdificio(g.target,g.dmg,g.kind==='tnt'?0xffb03a:0xe5533a)) return;
          if(g.target.danado) g.target=null;
        }
      }
    }
  }
  // La torre es APOYO: SIEMPRE dispara (aunque esté sola) pero lento, y el enemigo la ataca como primer objetivo, así la desborda sin tropas que la cubran.
  for(const t of S.buildings.filter(b=>b.tipo==='torre'&&b.estado==='ok'&&!b.danado)){
    t.cd=(t.cd||0)-dtReal;
    if(t.cd<=0){
      const g=vivos.filter(g2=>!g2.dead).sort((a,b2)=>Phaser.Math.Distance.Between(t.x,t.y,a.spr.x,a.spr.y)-Phaser.Math.Distance.Between(t.x,t.y,b2.spr.x,b2.spr.y))[0];
      if(g&&Phaser.Math.Distance.Between(t.x,t.y,g.spr.x,g.spr.y)<T*4){
        t.cd=3.2+(t.nivel>1?-0.6:0);   // cadencia lenta
        const p=scene.add.image(t.x,t.y-CAT.torre.fh*T,'dot').setTint(0xffe9a0).setDepth(99998).setScale(1.1);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-16,duration:220,ease:'Linear',onComplete:()=>{p.destroy(); if(!g.dead) golpearEnemigo(g,1,0xffe9a0);}});
        sfxAt('clash',0.3,t.x,t.y);
      }
    }
  }
  pelear(S.units,vivos,dtReal,true);
  pelear(R.war,vivos,dtReal,false);
}
function seguirRuta(u,dtReal){                        // seguir la ruta (rodeando edificios) o el punto destino
  let pt=null;
  if(u.path&&u.path.length){ pt=u.path[0]; if(Phaser.Math.Distance.Between(u.spr.x,u.spr.y,pt.x,pt.y)<6){ u.path.shift(); pt=u.path[0]||null; } }
  else if(u.moveT){ pt=u.moveT; if(Phaser.Math.Distance.Between(u.spr.x,u.spr.y,pt.x,pt.y)<6){ u.moveT=null; pt=null; } }
  if(!pt){ u.cruza=false; return; }                              // ruta consumida: vuelve a colisionar normal
  const piso = u.cruza ? terrenoLibre : landAtPx;                // si viene cruzando un bolsillo, sólo respeta agua/acantilado
  const sp=58*dtReal, ang=Math.atan2(pt.y-u.spr.y,pt.x-u.spr.x);
  const nx=u.spr.x+Math.cos(ang)*sp, ny=u.spr.y+Math.sin(ang)*sp;   // nunca pisar agua ni acantilado (desliza contra el borde)
  if(piso(nx,ny)){ u.spr.x=nx; u.spr.y=ny; }
  else if(piso(nx,u.spr.y)){ u.spr.x=nx; }
  else if(piso(u.spr.x,ny)){ u.spr.y=ny; }
  else { u.path=null; u.moveT=null; u.cruza=false; }              // atascado: soltar la orden en vez de trabarse
  u.spr.setFlipX(Math.cos(ang)<0); u.spr.setDepth(u.spr.y);
}
function muereUnidad(u,esUnidad){
  u.dead=true; killMark(u); killBar(u); if(esUnidad) S.units=S.units.filter(x=>x!==u);
  const d2=scene.add.sprite(u.spr.x,u.spr.y,'dead').play('dead-a').setOrigin(0.5,0.72).setScale(0.5).setDepth(u.spr.y);
  d2.once('animationcomplete',()=>scene.tweens.add({targets:d2,alpha:0,duration:1500,onComplete:()=>d2.destroy()}));
  u.spr.destroy(); if(esUnidad){ cronica('☠️ '+(UNIDADES[u.tipo]?UNIDADES[u.tipo].nom:L('Unidad','Unit'))+L(' caído',' fallen'), u.av); refreshHUD(); }
}
function pelear(lista,vivos,dtReal,esUnidad){
  for(const u of lista.filter(u2=>!u2.dead)){
    if(escaparSiAtascado(u,58*dtReal)){ moveMark(u); continue; }   // si quedó atrapado (construyeron encima), sale
    if(u.tipo==='monje'){ curarCerca(u,dtReal); continue; }   // el monje no pelea: sana
    const arquero=u.tipo==='arquero';
    const alcance=arquero?T*4.5:26, react=arquero?T*3.4:T*1.3;   // react = burbuja de defensa (no persigue más allá)
    const dist=x=>Phaser.Math.Distance.Between(u.spr.x,u.spr.y,x.spr.x,x.spr.y);

    // (1) LA ORDEN DEL JUGADOR SIEMPRE MANDA y nunca queda bloqueada: si hay orden de MOVER,
    // sigue la ruta y suelta cualquier combate. Así puedo reposicionarlas en plena oleada.
    if((u.path&&u.path.length)||u.moveT){
      u.target=null; u.cpath=null; u.cbestD=null;
      u.spr.play(uAnim(u.tipo,'r'),true); seguirRuta(u,dtReal); continue;
    }

    // (2) Objetivo: orden FORZADA de atacar (persigue), o DEFENSA propia: sólo reacciona al enemigo
    // que se le vino ENCIMA (dentro de su alcance de reacción). No sale a perseguir por el mapa.
    let persigue=false;
    if(u.forced&&!u.forced.dead){ u.target=u.forced; persigue=true; }
    else{
      if(u.forced&&u.forced.dead) u.forced=null;
      if(!u.target||u.target.dead||dist(u.target)>react){
        const prev=u.target;
        u.target=vivos.reduce((m,g)=>{ if(g.dead) return m; const dd=dist(g);
          return dd<react&&(!m||dd<dist(m))?g:m; }, null);
        if(u.target!==prev){ u.cpath=null; u.cbestD=null; u.cnoProg=0; }
      }
    }

    if(!u.target){ u.cpath=null; u.cbestD=null;                // en guardia: sin orden ni amenaza cerca, queda quieto
      u.spr.play(uAnim(u.tipo,'i'),true); continue; }

    const d=dist(u.target);
    if(d>alcance){
      if(!persigue){                                          // reacción defensiva: cierra la distancia al que la ataca, pero NO persigue lejos
        if(d<=react){ avanzarHacia(u,u.target.spr.x,u.target.spr.y,58*dtReal); u.spr.play(uAnim(u.tipo,'r'),true); }
        else { u.target=null; u.cpath=null; u.cbestD=null; u.spr.play(uAnim(u.tipo,'i'),true); }
        continue;
      }
      // persigue rodeando obstáculos: si no progresa (desliza contra un muro/edificio), pide ruta BFS y no se traba
      const sp=(arquero?50:58)*dtReal;
      let following=!!(u.cpath&&u.cpath.length), aimX=u.target.spr.x, aimY=u.target.spr.y;
      if(following){ const wp=u.cpath[0]; if(Phaser.Math.Distance.Between(u.spr.x,u.spr.y,wp.x,wp.y)<12) u.cpath.shift();
        if(u.cpath.length){ aimX=u.cpath[0].x; aimY=u.cpath[0].y; } else { u.cpath=null; following=false; } }
      const moved=avanzarHacia(u,aimX,aimY,sp);
      if(u.cbestD==null||d<u.cbestD-3){ u.cbestD=d; u.cnoProg=0; } else u.cnoProg=(u.cnoProg||0)+dtReal;
      if(!moved || (!following && u.cnoProg>0.5)){ u.cnoProg=0; u.cbestD=d; u.cpath=null;
        const et=tileOfPx(u.spr.x,u.spr.y), tt=tileOfPx(u.target.spr.x,u.target.spr.y);
        const dst=walkable(tt.x,tt.y)?tt:adjWalkable(tt.x,tt.y);
        u.cpath = dst ? findPath(et.x,et.y,dst.x,dst.y) : null; }
    } else if((u.cpath=null, u.cbestD=null, u.cnoProg=0, arquero)){   // en rango: a pegar, ruta de combate consumida
      u.cd-=dtReal;
      if(u.cd<=0){ u.cd=1.8; const g=u.target, p=scene.add.image(u.spr.x,u.spr.y-20,'dot').setTint(0xd9c9a0).setDepth(99998);
        scene.tweens.add({targets:p,x:g.spr.x,y:g.spr.y-14,duration:200,ease:'Linear',onComplete:()=>{p.destroy(); if(!g.dead) dañarObjetivo(g,1,0xd9c9a0);}});
        sfxAt('arrow',0.5,u.spr.x,u.spr.y); u.target=null; }
    } else {
      u.atkCd=(u.atkCd||0)-dtReal;
      if(u.atkCd<=0){ u.atkCd=0.85; sfxAt('sword',0.5,u.spr.x,u.spr.y);
        if(u.tipo==='guerrero'){ u.spr.play('war-a',true); u.spr.once('animationcomplete',()=>{ if(u.spr&&u.spr.active&&!u.dead) u.spr.play('war-r',true); }); }
        dañarObjetivo(u.target,2,0xffffff);
        // el enemigo devuelve daño al cuerpo a cuerpo
        if(u.target&&!u.target.dead){ u.hp=(u.hp||40)-(u.target.dmg||0)*0.35;
          if(u.hp<=0){ muereUnidad(u,esUnidad); continue; } }
        if(u.target&&u.target.dead) u.target=null; }
    }
  }
}
function curarCerca(u,dtReal){                      // monje: sana la unidad/aldeano más herido cerca
  seguirRuta(u,dtReal);
  u.healCd=(u.healCd||0)-dtReal; if(u.healCd>0) return;
  const cerca=[...S.units.filter(x=>!x.dead&&x!==u&&x.hp<x.maxhp), ...S.ald.filter(a=>a.hp<a.maxhp)]
    .filter(t=>Phaser.Math.Distance.Between(u.spr.x,u.spr.y,t.spr.x,t.spr.y)<T*4)
    .sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp))[0];
  if(!cerca) return;
  u.healCd=1.4; cerca.hp=Math.min(cerca.maxhp,cerca.hp+12);
  flyText(cerca.spr.x,cerca.spr.y-30,'+12','#8ee0a0'); sfx('bell',0.25);
  const ray=scene.add.line(0,0,u.spr.x,u.spr.y-20,cerca.spr.x,cerca.spr.y-20,0x8ee0a0,0.7).setLineWidth(2).setDepth(99996);
  scene.tweens.add({targets:ray,alpha:0,duration:300,onComplete:()=>ray.destroy()});
}

/* ===== HUD ===== */
function refreshHUD(){
  $('vOro').textContent=Math.floor(S.oro); $('vMad').textContent=Math.floor(S.madera); $('vCom').textContent=Math.floor(S.comida);
  $('vAmbar').textContent=S.ambar;
  const libres=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo').length;
  $('vAld').textContent=libres+L(' libres · ',' idle · ')+popTotal()+'/'+POPCAP();
  const bi=$('btnIdle'); if(bi){ bi.textContent='💤 IDLE ('+libres+')'; bi.disabled=libres===0; }
  const iN=$('idleN'); if(iN) iN.textContent=libres; const bmm=$('btnIdleMM'); if(bmm) bmm.disabled=libres===0;
  $('cOro').textContent='/'+CAP; $('cMad').textContent='/'+CAP; $('cCom').textContent='/'+CAP;
  $('rOro').classList.toggle('lleno',S.oro>=CAP); $('rMad').classList.toggle('lleno',S.madera>=CAP); $('rCom').classList.toggle('lleno',S.comida>=CAP);
}
let toastT=null;
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3600); }
/* ===== crónica (feed de eventos con avatar humano) ===== */
function cronica(txt,av){
  const box=$('cronicaList'); if(!box) return;
  const row=document.createElement('div'); row.className='crow';
  row.innerHTML='<img src="assets/img/av/'+(av||randAv())+'.png" alt="">'+'<span>'+txt+'</span>';
  box.insertBefore(row,box.firstChild);
  while(box.children.length>7) box.removeChild(box.lastChild);
  row.animate?row.animate([{opacity:0,transform:'translateX(-8px)'},{opacity:1,transform:'none'}],{duration:220}):0;
}
function hint(msg){ const h=$('hint'); h.textContent=msg; h.classList.toggle('on',!!msg); }
let idleCursor=0;
function irIdle(){                               // buscador de aldeanos ociosos (clásico de Age)
  const idle=S.ald.filter(a=>a.estado==='libre'||a.estado==='paseo');
  if(!idle.length){ toast(L('No hay aldeanos ociosos: están todos trabajando.','No idle villagers: they are all working.')); sfx('creak',0.3); return; }
  const a=idle[idleCursor%idle.length]; idleCursor++;
  seleccionar({t:'aldeano',ref:a}); overview=false;
  scene.cameras.main.setZoom(Phaser.Math.Clamp(baseZoom*2.4,1,3.6));
  scene.cameras.main.centerOn(a.spr.x,a.spr.y); marcaOrden(a.spr.x,a.spr.y-20);
}
$('btnIdleMM')&&($('btnIdleMM').onclick=irIdle);
/* ===== ambiente sonoro (WebAudio, sin assets) ===== */
let actx=null, ambGain=null, ambOn=true;
function startAmbient(){
  if(actx) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    actx=new AC(); ambGain=actx.createGain(); ambGain.gain.value=ambOn?0.05:0; ambGain.connect(actx.destination);
    [110,164.81,220].forEach((f,i)=>{ const o=actx.createOscillator(); o.type=i===0?'triangle':'sine'; o.frequency.value=f;
      const g=actx.createGain(); g.gain.value=0.5/3; o.connect(g); g.connect(ambGain); o.start(); });
    const n=actx.sampleRate*2, buf=actx.createBuffer(1,n,actx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*0.5;
    const noise=actx.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=380;
    const ng=actx.createGain(); ng.gain.value=0.22; noise.connect(lp); lp.connect(ng); ng.connect(ambGain); noise.start();
  }catch(e){}
}
$('btnAudio').onclick=()=>{ startAmbient(); ambOn=!ambOn; if(ambGain) ambGain.gain.value=ambOn?0.05:0;
  $('btnAudio').textContent=(ambOn?'🔊':'🔇')+' '+L('SONIDO','SOUND'); };
document.addEventListener('pointerdown',startAmbient,{once:true});
/* ===== idioma: aplica ES/EN a toda la UI (estática + dinámica) ===== */
function aplicarIdioma(){
  const set=(id,txt)=>{ const e=$(id); if(e) e.textContent=txt; };
  const setHTML=(id,html)=>{ const e=$(id); if(e) e.innerHTML=html; };
  const setTitle=(id,txt)=>{ const e=$(id); if(e) e.title=txt; };
  document.documentElement.lang=LANG;
  // menú
  set('btnMenu','☰'); setTitle('btnMenu',L('Menú','Menu'));
  set('btnDialog',(S.dialogOn?'💬':'🚫')+' '+L('DIÁLOGOS','DIALOGUES'));
  set('btnAudio',(ambOn?'🔊':'🔇')+' '+L('SONIDO','SOUND'));
  set('btnIdioma','🌐 '+(LANG==='es'?'ENGLISH':'ESPAÑOL'));
  set('btnRecords','🏆 '+L('RÉCORDS','RECORDS'));
  set('btnRecordsCerrar',L('CERRAR','CLOSE'));
  set('recordsH','🏆 '+L('RÉCORDS','RECORDS'));   // el <div class=recordsH> no tiene id; se setea abajo si existe
  // encabezados / paneles
  const rh=document.querySelector('.recordsH'); if(rh) rh.textContent='🏆 '+L('RÉCORDS','RECORDS');
  const qh=document.querySelector('.qh'); if(qh) qh.textContent='⚑ '+L('MISIÓN','QUEST');
  set('cronTitle','⚜ '+L('CRÓNICA','CHRONICLE'));
  setHTML('raidbanner','⚔️ '+L('¡ASALTO GOBLIN EN CURSO!','GOBLIN ASSAULT UNDERWAY!'));
  set('agePop1',L('NUEVA EDAD','NEW AGE'));
  setHTML('splashSub','The Black Bull');
  const mm=$('btnIdleMM'); if(mm){ const n=$('idleN')?$('idleN').textContent:'0'; mm.innerHTML='💤 '+L('Ociosos','Idle')+' (<span id="idleN">'+n+'</span>)'; setTitle('btnIdleMM',L('Ir marcando aldeanos ociosos','Cycle idle villagers')); }
  setHTML('selVacio',L('Clic izquierdo: seleccionar aldeano, edificio, árbol, veta o animal.<br>Clic derecho con aldeano: ir / talar / minar / cazar.','Left-click: select villager, building, tree, vein or animal.<br>Right-click with a villager: move / chop / mine / hunt.'));
  // tooltips de recursos
  const rt=document.querySelectorAll('.hud .res');
  const tips=L(['Oro','Madera','Comida','Población / cupo','Moneda del juego (simulada · placeholder F4)'],['Gold','Wood','Food','Population / cap','Game currency (simulated · placeholder F4)']);
  rt.forEach((e,i)=>{ if(tips[i]) e.title=tips[i]; });
  // re-render de lo dinámico
  if(typeof refreshHUD==='function') refreshHUD();
  if(typeof refreshQuest==='function') refreshQuest();
  if(typeof updateBanner==='function') updateBanner();
  if(typeof buildGrid==='function') buildGrid();
  if(typeof renderSel==='function' && S.sel) renderSel();
}
/* ===== récords (persistidos localmente: sólo el listado de puntajes) ===== */
function cargarRecords(){ try{ return JSON.parse(localStorage.getItem('aoa_records')||'[]'); }catch(e){ return []; } }
function guardarRecord(){
  const recs=cargarRecords();
  recs.push({score:S.score, wave:S.wave, tSurv:Math.floor(S.tSurv), recursos:Math.floor(S.recursos), kills:S.kills, fecha:new Date().toLocaleDateString()});
  recs.sort((a,b2)=>b2.score-a.score);
  try{ localStorage.setItem('aoa_records', JSON.stringify(recs.slice(0,10))); }catch(e){}
}
function mostrarRecords(){
  const ov=$('recordsOv'), ul=$('recordsList'); if(!ov||!ul) return;
  const recs=cargarRecords();
  ul.innerHTML = recs.length ? recs.map(r=>{
    const m=Math.floor(r.tSurv/60), s=r.tSurv%60;
    return '<li><b>'+r.score+' pts</b> · '+L('Oleada ','Wave ')+r.wave+' · '+m+'m '+s+'s · '+r.recursos+L(' rec. · ',' res. · ')+r.kills+L(' bajas ',' kills ')+'<span style="color:#9a8f79">('+r.fecha+')</span></li>';
  }).join('') : '<li class="vacio">'+L('Todavía no hay récords. ¡Jugá una partida!','No records yet. Play a game!')+'</li>';
  ov.classList.add('open');
}
$('btnRecords')&&($('btnRecords').onclick=()=>{ $('menu').classList.remove('open'); mostrarRecords(); });
$('btnRecordsCerrar')&&($('btnRecordsCerrar').onclick=()=>$('recordsOv').classList.remove('open'));
$('recordsOv')&&($('recordsOv').onclick=e=>{ if(e.target===$('recordsOv')) $('recordsOv').classList.remove('open'); });

/* ===== minimapa ===== */
let mmW=220, mmH=132;
function initMinimap(){
  const cv=$('minimap'); mmCtx=cv.getContext('2d'); mmW=cv.width; mmH=cv.height;
  cv.addEventListener('pointerdown',e=>{
    const r=cv.getBoundingClientRect();
    const fx=(e.clientX-r.left)/r.width, fy=(e.clientY-r.top)/r.height;
    const wx=BX*T+fx*GW*T, wy=BY*T+fy*GH*T;
    overview=false; scene.cameras.main.centerOn(wx,wy);
  });
}
function drawMinimap(){
  if(!mmCtx) return;
  const cw=mmW/GW, ch=mmH/GH;
  mmCtx.clearRect(0,0,mmW,mmH);
  mmCtx.fillStyle='#0e2731'; mmCtx.fillRect(0,0,mmW,mmH);            // mar de fondo
  if(mmBase){ try{ mmCtx.drawImage(mmBase,0,0,mmW,mmH); }catch(e){} } // terreno REAL (snapshot)
  mmCtx.fillStyle='rgba(6,11,16,0.88)';                             // sombra sobre lo no explorado
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)
    if(!S.explored[y][x]) mmCtx.fillRect(x*cw,y*ch,cw+0.7,ch+0.7);
  const dot=(wx,wy,col,sz)=>{ mmCtx.fillStyle=col;
    mmCtx.fillRect((wx-BX*T)/(GW*T)*mmW-sz/2,(wy-BY*T)/(GH*T)*mmH-sz/2,sz,sz); };
  for(const n of S.nodes){ if(S.explored[n.ty][n.tx]) dot(n.spr.x,n.spr.y,n.kind==='arbol'?'#1e4d28':'#e5c542',2.4); }
  for(const m of S.animals){ if(!m.dead){ const t=tileOfPx(m.spr.x,m.spr.y); if(S.explored[t.y][t.x]) dot(m.spr.x,m.spr.y,m.tipo==='toro'?'#c060ff':'#e598b0',m.tipo==='toro'?3:2.2); } }
  for(const b of S.buildings){ dot(b.x,b.y,b.tipo==='castle'?'#ffe36b':(SKINCOL[b.skin]||'#f4ecda'),b.tipo==='castle'?4:3); }
  for(const a of S.ald) dot(a.spr.x,a.spr.y,'#ffe9a0',2.4);
  for(const u of S.units) dot(u.spr.x,u.spr.y,'#4a90c2',2.4);
  if(S.raid.on) for(const g of S.raid.gob){ if(!g.dead) dot(g.spr.x,g.spr.y,'#ff3a2a',2.8); }
  // bote misterioso: marcador dorado titilante (clampeado al borde del minimapa)
  if(S.bote&&S.bote.active){ mmBlink=!mmBlink;
    let bx=Phaser.Math.Clamp((S.bote.x-BX*T)/(GW*T)*mmW,4,mmW-4), by=Phaser.Math.Clamp((S.bote.y-BY*T)/(GH*T)*mmH,4,mmH-4);
    mmCtx.beginPath(); mmCtx.arc(bx,by,mmBlink?4.4:3.2,0,6.28);
    mmCtx.fillStyle=mmBlink?'#ffe36b':'#c9a227'; mmCtx.fill();
    mmCtx.lineWidth=1.2; mmCtx.strokeStyle='#3a2a12'; mmCtx.stroke();
    mmCtx.fillStyle='#3a2a12'; mmCtx.font='6px monospace'; mmCtx.fillText('⚓',bx-3,by+2.5); }
  const v=scene.cameras.main.worldView;
  const rx=(v.x-BX*T)/(GW*T)*mmW, ry=(v.y-BY*T)/(GH*T)*mmH, rw=v.width/(GW*T)*mmW, rh=v.height/(GH*T)*mmH;
  mmCtx.strokeStyle='rgba(255,233,160,.9)'; mmCtx.lineWidth=1.2; mmCtx.strokeRect(rx,ry,rw,rh);
}

/* ===== loop ===== */
let hudAcc=0, qAcc=0, mmAcc=0, chatT=6;
function update(time,delta){
  const dt=delta/1000*S.speed, dtReal=delta/1000;
  if(!S.over){ S.tSurv+=dtReal; S.score=calcScore(); if(S.score>S.best) S.best=S.score;   // récord vivo: tiempo + recursos + bajas
    if(S.carne.activo){ S.carne.t+=dtReal;                                                 // carnicería: +1 carne cada 2s hasta 50
      if(S.carne.t>=2){ S.carne.t=0; S.comida=Math.min(CAP,S.comida+1); S.recursos+=1;
        if(S.comida>=50){ S.carne.activo=false; toast(L('🍖 Ya hay carne para un aldeano.','🍖 Enough meat for a villager now.')); refreshHUD(); } } } }

  for(const a of S.ald){
    if(a.estado==='refugiado') continue;                 // a resguardo dentro del Ayuntamiento
    nieblaAlMover(a,4);                                   // caminar despeja niebla, en cualquier tarea
    if(escaparSiAtascado(a,64*dtReal)){ moveMark(a); continue; }   // aldeano atrapado sobre un edificio: sale
    if(a.estado==='yendo'){
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<5){
        if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { a.cruza=false; const cb=a.onArrive; a.onArrive=null; if(cb) cb(a); else if(a.estado==='yendo') a.spr.play('pawn_blue-i',true); }
      } else { const sp=72*dtReal, nx=a.spr.x+dx/d*sp, ny=a.spr.y+dy/d*sp;   // no atravesar edificios (rodean), salvo que salga de un bolsillo (a.cruza)
        const piso=a.cruza?terrenoLibre:landAtPx;
        if(piso(nx,ny)||d<T){ a.spr.x=nx; a.spr.y=ny; } a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    } else if(a.estado==='cazando'){
      const m=a.objAnimal;
      if(!m||m.dead){ if(!a.objPile) parar(a); }
      else {
        const d=Phaser.Math.Distance.Between(a.spr.x,a.spr.y,m.spr.x,m.spr.y);
        if(d>34){ const sp=70*dtReal, ang=Math.atan2(m.spr.y-a.spr.y,m.spr.x-a.spr.x);
          const nx=a.spr.x+Math.cos(ang)*sp, ny=a.spr.y+Math.sin(ang)*sp;
          if(landAtPx(nx,ny)){ a.spr.x=nx; a.spr.y=ny; }              // el aldeano no pisa agua
          a.spr.setFlipX(Math.cos(ang)<0); a.spr.setDepth(a.spr.y);
          if(a.spr.anims.currentAnim&&a.spr.anims.currentAnim.key!=='pawn_blue-r') a.spr.play('pawn_blue-r',true);
        } else {
          m.hunter=a; a.atkT+=dtReal;
          if(a.atkT>0.9){ a.atkT=0; m.hp-=8; flyText(m.spr.x,m.spr.y-24,'-8','#fff');
            m.spr.setTint(0xffaaaa); const bt=FAUNA[m.tipo].tint;
            scene.time.delayedCall(100,()=>{ if(m.spr&&m.spr.active){ if(bt) m.spr.setTint(bt); else m.spr.clearTint(); } });
            burstAt(m.spr.x,m.spr.y-14,0xffffff); sfxAt('clash',0.32,m.spr.x,m.spr.y);
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
      if(!nd){ if(a.carga&&a.carga.n>0) irADepositar(a); else parar(a); }   // nodo agotado: si carga algo, va a dejarlo
      else { a.tarT+=dt;
        if(a.tarT>=1.1){ a.tarT=0;
          a.carga=a.carga||{res:nd.res,n:0};
          const gan=Math.min(4, nd.reserva, CARRYCAP-a.carga.n); nd.reserva-=gan; a.carga.n+=gan;   // junta en su carga; NO suma al depósito todavía
          flyText(nd.spr.x,nd.spr.y-40,'+'+gan,'#e8c07a'); sfxAt('chop',0.42,nd.spr.x,nd.spr.y);
          if(S.sel&&S.sel.ref===nd) renderSel();
          if(nd.reserva<=0) agotarNodo(nd);
          if(a.carga.n>=CARRYCAP || !S.nodes.includes(nd)) irADepositar(a);   // lleno o nodo agotado → a dejarlo al Ayuntamiento
        }
      }
    } else if(a.estado==='peon'){                        // saca CARNE de la granja hacia su carga
      const b=byId(a.task);
      if(!b||b.estado!=='ok'||b.agotada||b.reserva<=0){ if(a.carga&&a.carga.n>0) irADepositar(a); else parar(a); }
      else { a.tarT+=dt;
        if(a.tarT>=1.3){ a.tarT=0;
          a.carga=a.carga||{res:'comida',n:0};
          const gan=Math.min(4, b.reserva, CARRYCAP-a.carga.n); b.reserva-=gan; a.carga.n+=gan;
          flyText(b.x,b.y-20,'+'+gan+' 🍖','#ffd9b0'); sfxAt('chop',0.3,b.x,b.y);
          if(S.sel&&S.sel.ref===b) renderSel();
          if(b.reserva<=0) agotarGranja(b);
          if(a.carga.n>=CARRYCAP || b.reserva<=0) irADepositar(a);
        }
      }
    } else if(a.estado==='cargando'){                    // vuelve al Ayuntamiento con la carga; al llegar deposita
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<6){ if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { depositar(a); volverAFuente(a); } }
      else { const sp=72*dtReal, nx=a.spr.x+dx/d*sp, ny=a.spr.y+dy/d*sp;
        const piso=a.cruza?terrenoLibre:landAtPx;
        if(piso(nx,ny)||d<T){ a.spr.x=nx; a.spr.y=ny; } a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    } else if(a.estado==='libre'){
      a.wT-=dtReal;
      if(a.wT<=0){ a.wT=rint(4,9);
        const cur=tileOfPx(a.spr.x,a.spr.y);
        if(Math.random()<0.12 && aguaCerca(cur.x,cur.y)){ chapuzon(a,cur); }   // de vez en cuando: se tira al agua
        else for(let i=0;i<8;i++){ const nx=Phaser.Math.Clamp(cur.x+rint(-3,3),0,GW-1), ny=Phaser.Math.Clamp(cur.y+rint(-3,3),0,GH-1);
          if(walkable(nx,ny)&&S.grid[ny][nx]===null){
            const path=findPath(cur.x,cur.y,nx,ny);
            if(path){ a.estado='paseo'; a.path=path; if(path.length){const p=a.path.shift(); a.tx=p.x; a.ty=p.y;} a.spr.play('pawn_blue-r',true); }
            break; } }
      }
    } else if(a.estado==='chapuzon'){
      /* la secuencia la maneja chapuzon() con tweens/timers; acá no se mueve */
    } else if(a.estado==='paseo'){
      const dx=a.tx-a.spr.x, dy=a.ty-a.spr.y, d=Math.hypot(dx,dy);
      if(d<5){ if(a.path&&a.path.length){ const p=a.path.shift(); a.tx=p.x; a.ty=p.y; }
        else { a.estado='libre'; a.spr.play('pawn_blue-i',true); } }
      else { const sp=46*dtReal, nx=a.spr.x+dx/d*sp, ny=a.spr.y+dy/d*sp;
        if(landAtPx(nx,ny)||d<T){ a.spr.x=nx; a.spr.y=ny; } else { a.estado='libre'; a.path=null; }
        a.spr.setFlipX(dx<0); a.spr.setDepth(a.spr.y); }
    }
    // niebla: revelar al moverse
    const tk=Math.floor(a.spr.x/T)+','+Math.floor(a.spr.y/T);
    if(tk!==a.lastTile){ a.lastTile=tk; revelar(a.spr.x,a.spr.y,4); }
    depthSobreEdificios(a.spr);
    moveMark(a);
    if(a.hp<a.maxhp||(S.sel&&S.sel.ref===a)) drawHp(a,a.hp/a.maxhp,32,a.spr.y-a.markOff+12); else hideBar(a);
  }
  for(const u of S.units){
    if(!u.dead) nieblaAlMover(u,4);                        // toda unidad militar despeja niebla al moverse (en guardia o peleando)
    if(!u.dead&&!S.raid.on){                              // fuera de oleada las unidades SÍ obedecen órdenes de movimiento
      if(escaparSiAtascado(u,58*dtReal)){ moveMark(u); continue; }   // unidad atrapada sobre un edificio: sale
      if(u.forced&&u.forced.dead) u.forced=null;
      if(u.forced&&u.tipo!=='monje'){                      // orden de atacar (típicamente un animal, sin oleada)
        const tg=u.forced, arquero=u.tipo==='arquero', alcance=arquero?T*4.5:26;
        const d=Phaser.Math.Distance.Between(u.spr.x,u.spr.y,tg.spr.x,tg.spr.y);
        if(d>alcance){ u.moveT={x:tg.spr.x,y:tg.spr.y}; seguirRuta(u,dtReal);
          const key=u.spr.anims.currentAnim&&u.spr.anims.currentAnim.key; if(key!==uAnim(u.tipo,'r')) u.spr.play(uAnim(u.tipo,'r'),true); }
        else { u.moveT=null; u.atkCd=(u.atkCd||0)-dtReal;
          if(u.atkCd<=0){ u.atkCd=0.85; sfxAt('sword',0.5,u.spr.x,u.spr.y);
            if(u.tipo==='guerrero'){ u.spr.play('war-a',true); u.spr.once('animationcomplete',()=>{ if(u.spr&&u.spr.active&&!u.dead) u.spr.play('war-r',true); }); }
            dañarObjetivo(tg,2,0xffffff);
            if(tg.dead){ u.forced=null; u.spr.play(uAnim(u.tipo,'i'),true); } } }
      } else {
        seguirRuta(u,dtReal);
        const moving=(u.path&&u.path.length)||u.moveT, key=u.spr.anims.currentAnim&&u.spr.anims.currentAnim.key;
        if(moving){ if(key!==uAnim(u.tipo,'r')) u.spr.play(uAnim(u.tipo,'r'),true);
          const tk=Math.floor(u.spr.x/T)+','+Math.floor(u.spr.y/T); if(tk!==u.lastTile){ u.lastTile=tk; revelar(u.spr.x,u.spr.y,4); } }
        else if(key===uAnim(u.tipo,'r')) u.spr.play(uAnim(u.tipo,'i'),true);
      }
    }
    depthSobreEdificios(u.spr);                          // nunca tapada por un edificio
    moveMark(u);
    if(u.hp!=null&&(u.hp<u.maxhp||(S.sel&&S.sel.ref===u))) drawHp(u,u.hp/u.maxhp,30,u.spr.y-58); else hideBar(u); }

  updateAnimals(dtReal,dt);
  updateAllies(dtReal);
  updateArquerosTecho(dtReal);
  if(dlgT>0){ dlgT-=dtReal; if(dlgT<=0) ocultarDialogo(); }
  chatT-=dtReal; if(chatT<=0){ chatT=Phaser.Math.FloatBetween(70,130); soltarBocadillo(); }

  for(const b of S.buildings){
    const c=CAT[b.tipo];
    if(b.estado==='esperando'){
      // NO se auto-asigna: la obra espera al aldeano que vos mandes (clic derecho)
      if(b.barG){ b.barG.clear(); const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(0x6a6154,1).fillRect(bx,by,bw*0.04,6); }
    }
    else if(b.estado==='obra'){
      const obreros=S.ald.filter(a=>a.bId===b.id&&a.estado==='obrero').length;   // más obreros = más rápido
      if(obreros>0) b.obraT+=dt*obreros;                                          // sin obreros la obra se pausa
      const p=Math.min(1,b.obraT/b.obraDur);
      if(b.barG){ b.barG.clear(); const bx=b.x-c.fw*T*0.4, by=b.y-c.fh*T-14, bw=c.fw*T*0.8;
        b.barG.fillStyle(0x120d09,0.85).fillRect(bx-2,by-2,bw+4,10);
        b.barG.fillStyle(obreros>1?0x6fd06f:0xc9a227,1).fillRect(bx,by,bw*p,6); }
      if(b.obraT>=b.obraDur){
        b.estado='ok'; b.hp=b.maxhp||100;
        const obreros=S.ald.filter(a=>a.bId===b.id&&(a.estado==='obrero'||a.estado==='yendo'));
        obreros.forEach(o=>parar(o));
        if(b.mejorando){ b.nivel++; b.mejorando=false; }
        if(b.tipo==='house'){ S.stats.casasBuilt++; toast(L('🏠 Casa lista: +2 de cupo. Seleccioná el Ayuntamiento o la Casa para CREAR aldeanos.','🏠 House ready: +2 cap. Select the Town Hall or House to CREATE villagers.')); }
        else if(!c.muro&&['cuartel','arqueria','torre','monasterio','granja'].includes(b.tipo)) toast('✔️ '+CAT[b.tipo].nom+L(' en pie.',' built.'));
        buildGrid();
        refreshBuilding(b); dustAt(b.x,b.y-20,4); sfx(c.muro?'chop':'bong',0.6);
        if(c.prod) pedirTrabajador(b);
        // muro terminado: el obrero sigue con la próxima muralla de la línea (si hay)
        if(c.muro && obreros[0]){ const sig=S.buildings.filter(z=>z.estado==='esperando'&&CAT[z.tipo].muro&&!S.ald.some(a=>a.bId===z.id))
            .sort((p,q)=>Phaser.Math.Distance.Between(b.x,b.y,p.x,p.y)-Phaser.Math.Distance.Between(b.x,b.y,q.x,q.y))[0];
          if(sig) mandarConstruir(obreros[0],sig); }
        if(S.sel&&S.sel.ref===b) renderSel();
      }
    }
    // ---- vida del edificio: barra + fuego de daño + reparación gradual ----
    if(b.estado==='ok'&&!b.danado){
      if(b.tipo==='house'||b.tipo==='castle') humoChimenea(b);   // humo de chimenea
      else if(b.tipo==='torre') orbesTorre(b);                   // orbes mágicos en la torre
      const mx=b.maxhp||100;
      if(b.reparando){
        b.hp=Math.min(mx, b.hp + mx*dt/3.2);                          // se recupera en ~3s
        if(Math.random()<0.14) burstAt(b.x+rint(-18,18), b.y-rint(6,30), 0x9fe0b0);   // chispas de reparación
        if(b.hp>=mx){ b.hp=mx; b.reparando=false; dustAt(b.x,b.y-16,3); sfxAt('bong',0.5,b.x,b.y);
          if(b.dmgFire){ b.dmgFire.destroy(); b.dmgFire=null; }
          if(b.hpBar){ b.hpBar.clear(); } toast('✔️ '+CAT[b.tipo].nom+L(' reparado.',' repaired.')); if(S.sel&&S.sel.ref===b) renderSel(); }
      }
      const frac=b.hp/mx;
      // fuego proporcional al daño (las casas se incendian al recibir golpes)
      if(frac<0.6&&!b.dmgFire){ b.dmgFire=scene.add.sprite(b.x,b.y-4,'fire').play({key:'fire-a',startFrame:rint(0,6)}).setOrigin(0.5,1).setScale(0.3).setDepth(b.y+1); }
      if(frac>=0.6&&b.dmgFire&&!b.reparando){ b.dmgFire.destroy(); b.dmgFire=null; }
      if(b.dmgFire) b.dmgFire.setScale(0.26+(0.6-Math.min(0.6,frac))*0.7);
      // barra de vida cuando está herido, reparándose o seleccionado
      if(frac<1||b.reparando||(S.sel&&S.sel.ref===b)) drawBuildHp(b,frac); else if(b.hpBar) b.hpBar.clear();
    }
  }

  // EL ASEDIO: preparación → oleada → preparación…
  if(!S.over){
    if(S.phase==='wave'){ S.raid.tLeft-=dtReal; if(S.raid.tLeft<=0) finOleadaPorTiempo(); else raidTick(dtReal); }
    else { S.phaseT-=dtReal; if(S.phaseT<=0) lanzarOleada(); }
  }

  hudAcc+=delta; if(hudAcc>250){ hudAcc=0; refreshHUD(); updateBanner(); }
  qAcc+=delta;   if(qAcc>600){ qAcc=0; refreshQuest(); }
  mmAcc+=delta;  if(mmAcc>220){ mmAcc=0; drawMinimap(); }
}
function updateAnimals(dtReal,dt){
  for(const m of S.animals){
    if(m.dead) continue;
    m.spr.setDepth(m.spr.y);                          // profundidad al día: no detrás de edificios
    const cfg=FAUNA[m.tipo];
    drawHp(m, m.hp/m.maxhp, m.tipo==='toro'?42:m.tipo==='oso'?36:26, m.spr.y-m.spr.originY*m.spr.displayHeight*0.82);
    const cazador=m.hunter&&S.ald.includes(m.hunter)&&m.hunter.estado==='cazando'?m.hunter:null;
    if(cazador){
      const d=Phaser.Math.Distance.Between(m.spr.x,m.spr.y,cazador.spr.x,cazador.spr.y);
      if(cfg.huye){ // oveja: escapa (nunca al agua)
        if(d<120){ const ang=Math.atan2(m.spr.y-cazador.spr.y,m.spr.x-cazador.spr.x);
          const nx=m.spr.x+Math.cos(ang)*40*dtReal, ny=m.spr.y+Math.sin(ang)*40*dtReal;
          if(landAtPx(nx,ny)){ m.spr.x=nx; m.spr.y=ny; m.spr.setFlipX(Math.cos(ang)<0); m.spr.setDepth(m.spr.y); } }
      } else if(cfg.dmg){ // jabalí/oso/Toro: contraatacan
        if(d<38){ m.atkT+=dtReal; if(m.atkT>1.1){ m.atkT=0; dañarAldeano(cazador,cfg.dmg);
          if(m.tipo==='toro'){ m.spr.play(cfg.run,true); embestida(m.spr,cazador.spr.x,cazador.spr.y); } else m.spr.play(cfg.anim,true); } }
      }
      continue;
    }
    // deambular tranquilo (estrictamente en tierra)
    m.wT-=dtReal;
    if(m.wT<=0){ m.wT=rint(3,8); m.dir=Math.random()*6.28; m.mv=Math.random()<0.55;
      if(cfg.run&&m.spr.play) m.spr.play(m.mv?cfg.run:cfg.anim,true); }
    if(m.mv){ const sp=(cfg.huye?18:13)*dtReal, nx=m.spr.x+Math.cos(m.dir)*sp, ny=m.spr.y+Math.sin(m.dir)*sp;
      const t={x:Math.floor(nx/T)-BX,y:Math.floor(ny/T)-BY};
      if(landAtPx(nx,ny)&&Math.hypot(t.x-m.homeT.x,t.y-m.homeT.y)<4){ m.spr.x=nx; m.spr.y=ny; m.spr.setFlipX(Math.cos(m.dir)<0); m.spr.setDepth(m.spr.y); }
      else { m.dir+=1.7; m.mv=Math.random()<0.6; } }
  }
  for(const c of S.critters){
    c.wT-=dtReal;
    if(c.wT<=0){ c.wT=rint(2,6); c.dir=Math.random()*6.28; c.mv=Math.random()<0.6; }
    if(c.mv){ const sp=20*dtReal, nx=c.spr.x+Math.cos(c.dir)*sp, ny=c.spr.y+Math.sin(c.dir)*sp;
      if(landAtPx(nx,ny)){ c.spr.x=nx; c.spr.y=ny; c.spr.setFlipX(Math.cos(c.dir)<0); c.spr.setDepth(c.spr.y); } else c.dir+=1.9; }
  }
}
