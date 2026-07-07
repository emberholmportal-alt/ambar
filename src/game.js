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

/* ===== i18n ===== */
let LANG=(localStorage.getItem('ambar_lang')||'es');
const L=(es,en)=>LANG==='en'?en:es;
const hex=c=>'#'+c.toString(16).padStart(6,'0');

/* ===== datos ===== */
const T=64, COLS=58, ROWS=36, WORLD_W=COLS*T, WORLD_H=ROWS*T;   // reino más grande
// Cada gremio: nombre + lema + lore (para el reino dividido). name/lema/lore son getters bilingües.
const GUILDS=[
  {id:'guardia',tex:'blue',  kind:'humano', color:0x4a90c2, cx:15,      cy:12,
   _n:['Guardia de Hierro','Iron Guard'], _l:['“El muro es la palabra.”','“The wall is the word.”'],
   _lore:['Defienden la muralla norte y desconfían de todo lo que venga del mar.','They hold the north wall and distrust all that comes from the sea.']},
  {id:'yunque', tex:'red',   kind:'humano', color:0xd64545, cx:COLS-16, cy:12,
   _n:['Orden del Yunque','Order of the Anvil'], _l:['“Lo que se forja, manda.”','“What is forged, rules.”'],
   _lore:['Herreros y mercaderes: controlan la forja y el oro de la isla.','Smiths and traders: they command the forge and the isle’s gold.']},
  {id:'sombra', tex:'purple',kind:'humano', color:0x9b6fce, cx:15,      cy:ROWS-11,
   _n:['Los Sin Nombre','The Nameless'], _l:['“Nadie nos vio venir.”','“No one saw us coming.”'],
   _lore:['Contrabandistas de la Necrópolis; juran lealtad sólo a la sombra.','Smugglers of the Necropolis; loyal only to the shadow.']},
  {id:'sol',    tex:'yellow',kind:'humano', color:0xd8b53a, cx:COLS-16, cy:ROWS-11,
   _n:['Casa del Sol','House of the Sun'], _l:['“Ámbar arde al alba.”','“Amber burns at dawn.”'],
   _lore:['Nobles del Jardín Colgante que sueñan con reunir la isla bajo una corona.','Nobles of the Hanging Garden who dream of one crown over the isle.']},
  {id:'goblin', tex:'red',   kind:'goblin', color:0x6fae3a, cx:Math.floor(COLS/2), cy:6,
   _n:['Horda de Colmillo Verde','Greenfang Horde'], _l:['“¡El fuego es ley!”','“Fire is law!”'],
   _lore:['Goblins del bosque negro: incendian, saquean y ríen. No reconocen rey ni muro.','Goblins of the black wood: they burn, loot and cackle. They bow to no king or wall.']},
  {id:'villano', tex:'purple',kind:'villano',color:0x8a3a5f, cx:Math.floor(COLS/2), cy:ROWS-6,
   _n:['Cofradía del Cuervo','The Crow Covenant'], _l:['“Todo tiene un precio en sangre.”','“Everything has a price in blood.”'],
   _lore:['Bandidos, nigromantes y ladrones exiliados; conspiran en las catacumbas del sur.','Bandits, necromancers and exiled thieves; they scheme in the southern catacombs.']},
];
GUILDS.forEach(g=>{Object.defineProperty(g,'name',{get(){return L(g._n[0],g._n[1]);}});
  Object.defineProperty(g,'lema',{get(){return L(g._l[0],g._l[1]);}});
  Object.defineProperty(g,'lore',{get(){return L(g._lore[0],g._lore[1]);}});});
const guildById=Object.fromEntries(GUILDS.map(g=>[g.id,g]));
const RACES=()=>L(['humano','elfo','enano','orco','no-muerto','bestia'],['human','elf','dwarf','orc','undead','beast']);
const CLASSES=()=>L(['guerrera','caballero','pícaro','clériga','bardo','mercenario','cazadora','herrera'],['warrior','knight','rogue','cleric','bard','sellsword','hunter','smith']);
const NAME_A=['Kael','Mirena','Dorn','Sylva','Bram','Ysolde','Korrin','Vael','Thane','Nixa','Ordo','Rhea','Grael','Selka','Auber','Wynn','Tovar','Isha','Draven','Mora','Halin','Perla'];
const NAME_B=()=>L(['','','','el Tuerto','de la Sombra','Manohierro','la Pálida','el Cuervo','de Ámbar','Rompeyunques','la Zurda','Sangrefría','el Descalzo'],
                   ['','','','the One-Eyed','of the Shadow','Ironhand','the Pale','the Crow','of Amber','Anvilbreaker','the Left','Coldblood','the Barefoot']);
const ITEMS=()=>L(['un grimorio prohibido','reliquias de la Vieja Corona','oro maldito','una espada rúnica','un huevo de dragón','barriles de cerveza enana','mapas de las Profundidades','una máscara de hueso'],
                  ['a forbidden grimoire','relics of the Old Crown','cursed gold','a runed sword','a dragon egg','barrels of dwarven ale','maps of the Deep','a bone mask']);
const DISTRICTS=()=>L(['el Barrio de la Forja','el Mercado Alto','los Muelles','la Necrópolis','la Plaza del Rey','el Jardín Colgante'],
                     ['the Forge Quarter','the High Market','the Docks','the Necropolis','the King’s Square','the Hanging Garden']);
// líneas de diálogo: las unidades hablan del reino partido en gremios (burbujas flotantes)
const DIALOGO={
  guardia:[['Mientras el muro aguante, Ámbar respira.','As long as the wall holds, Amber breathes.'],['El Yunque cobra peajes hasta por respirar.','The Anvil taxes even our breathing.'],['Vi luces en la Necrópolis otra vez.','Saw lights in the Necropolis again.']],
  yunque:[['Sin nuestra forja, no habría espadas ni corona.','Without our forge, no swords, no crown.'],['La Guardia se cree dueña del mar.','The Guard thinks it owns the sea.'],['Todo se paga en oro, hasta la paz.','Everything’s paid in gold — even peace.']],
  sombra:[['Cuatro gremios, mil secretos.','Four guilds, a thousand secrets.'],['El Sol sueña con una corona que no existe.','The Sun dreams of a crown that isn’t.'],['Nadie manda sobre la sombra.','No one rules the shadow.']],
  sol:[['Un día Ámbar tendrá un solo estandarte.','One day Amber will fly one banner.'],['La isla está partida y sangra por la grieta.','The isle is split and bleeds at the seam.'],['Al alba se ve mejor quién traiciona.','At dawn you see who betrays.']],
  goblin:[['¡Fuego! ¡Fuego! ¡Más fuego!','Fire! Fire! More fire!'],['Los humanos guardan oro rico y brillante…','The humans hoard shiny rich gold…'],['¡La horda no teme al muro!','The horde fears no wall!']],
  villano:[['El cuervo ve todo, hasta tus deudas.','The crow sees all — even your debts.'],['Un rey muerto vale más que uno vivo.','A dead king is worth more than a live one.'],['Las catacumbas guardan mejores secretos.','The catacombs keep better secrets.']],
  comun:[['Cuatro estandartes, una sola isla. Nunca alcanza.','Four banners, one island. Never enough.'],['Dicen que hubo un rey. Ahora sólo hay gremios.','They say there was a king. Now only guilds.'],['La crónica lo cuenta todo, hasta lo que callamos.','The chronicle tells all — even what we hush.'],['¿Paz? En Ámbar eso dura hasta la próxima campana.','Peace? Here it lasts till the next bell.'],
    ['Juro que ese árbol me miró raro.','I swear that tree looked at me funny.'],['¿Otra vez sopa de nabo? Prefiero al goblin.','Turnip soup again? I’d rather fight the goblin.'],['Si el vigía me está mirando… ¡hola, mamá!','If the Watcher’s Eye is on me… hi, mom!'],['Perdí una oveja. Estaba justo… acá. Creo.','Lost a sheep. It was right… here. I think.'],['Me pagan en “gloria”. La gloria no se come.','They pay me in “glory.” You can’t eat glory.'],['¿Viste al del casco torcido? Ese esconde algo.','See the guy with the crooked helm? He’s hiding something.'],['Un día me voy a los muelles y no vuelvo.','One day I’ll walk to the docks and not come back.'],['El herrero subió el precio del oro. Otra vez.','The smith raised gold prices. Again.']],
};

/* ===== puntos por gremio (temporada en vivo, en memoria) ===== */
const PUNTOS={}; GUILDS.forEach(g=>PUNTOS[g.id]=45+Math.floor(Math.random()*36));   // rint aún no está definido acá
function sumarPuntos(gid,n){ if(gid==null||PUNTOS[gid]==null) return; PUNTOS[gid]=Math.max(0,PUNTOS[gid]+n); renderMarcador(); }
function renderMarcador(){ const el=$('score'); if(!el) return;
  const ord=[...GUILDS].sort((a,b)=>PUNTOS[b.id]-PUNTOS[a.id]), top=PUNTOS[ord[0].id]||1;
  el.innerHTML=ord.map((g,i)=>`<div class="srow${i===0?' lead':''}"><span class="rk">${i+1}</span><span class="sw" style="background:${hex(g.color)}"></span><span class="gn">${g.name}</span><span class="pbar"><i style="width:${Math.round(100*PUNTOS[g.id]/top)}%;background:${hex(g.color)}"></i></span><span class="pt">${PUNTOS[g.id]}</span></div>`).join('');
}
// deltas de puntos según el evento y el gremio protagonista
function puntuar(tpl,g,a){
  const rivales=GUILDS.filter(x=>x.id!==g.id);
  switch(tpl.tag){
    case 'GUERRA': sumarPuntos(g.id,rint(3,6)); sumarPuntos(pick(rivales).id,-rint(2,5)); break;
    case 'DUELO': case 'MAGNICIDIO': sumarPuntos(g.id,rint(2,4)); break;
    case 'HALLAZGO': sumarPuntos(g.id,rint(4,7)); break;
    case 'FIESTA': GUILDS.forEach(x=>sumarPuntos(x.id,1)); break;
    case 'TRAICIÓN': sumarPuntos(g.id,rint(2,4)); sumarPuntos(pick(rivales).id,-rint(2,4)); break;
    case 'INVASIÓN': sumarPuntos('goblin',rint(3,6)); GUILDS.forEach(x=>{ if(x.kind==='humano') sumarPuntos(x.id,-rint(0,2)); }); break;   // los goblins ganan al invadir
    case 'DRAGÓN': case 'BESTIA': GUILDS.forEach(x=>{ if(x.kind==='humano') sumarPuntos(x.id,-rint(0,2)); }); break;
    case 'LADRÓN': sumarPuntos('villano',rint(2,4)); break;                              // el robo alimenta a la Cofradía
    case 'GREMIO': case 'REFUERZO': sumarPuntos(g.id,1); break;
  }
}

/* ===== diálogo: burbuja flotante con lore del reino dividido ===== */
let dlgAcc=0, dlgNext=5000;
function burbuja(n,txt){
  if(!n||n.dead||!scene) return;
  const w=Math.min(210,44+txt.length*6);
  const box=scene.add.container(n.spr.x,n.spr.y-58).setDepth(100002);
  const bg=scene.add.graphics(); bg.fillStyle(0x14100b,0.92); bg.lineStyle(1.5,0xc9a227,0.7);
  bg.fillRoundedRect(-w/2,-24,w,30,7); bg.strokeRoundedRect(-w/2,-24,w,30,7);
  bg.fillStyle(0x14100b,0.92); bg.fillTriangle(-5,5,5,5,0,13);
  const t=scene.add.text(0,-9,txt,{fontFamily:'"IM Fell English",Georgia,serif',fontStyle:'italic',fontSize:'12px',color:'#ece3d0',align:'center',wordWrap:{width:w-14}}).setOrigin(0.5,0.5).setResolution(2);
  box.add([bg,t]); box.setAlpha(0);
  scene.tweens.add({targets:box,alpha:1,y:box.y-6,duration:260,ease:'Back.easeOut'});
  scene.time.delayedCall(3200,()=>scene.tweens.add({targets:box,alpha:0,y:box.y-8,duration:400,onComplete:()=>box.destroy()}));
  n._bub=box;
}
function decirAlgo(){
  const humanos=livingNpcs().filter(n=>n.spr&&!n._bub);
  const faccion=npcs.filter(n=>n.faccion&&!n.dead&&n.spr&&!n._bub);   // goblins/villanos también hablan
  const pool=humanos.concat(faccion);
  if(!pool.length) return;
  const n=pick(pool); const lines=(DIALOGO[n.guild]||[]).concat(DIALOGO.comun); const line=pick(lines);
  burbuja(n, L(line[0],line[1])); scene.time.delayedCall(3700,()=>{ if(n) n._bub=null; });
}

/* ===== escenas absurdas: discusiones, peleas y chapuzones (vida ambiente del stream) ===== */
let escAcc=0, escNext=8000;
let camAcc=0, camNext=6000;
function ocupar(n,ms){ n.busy=true; n.path=null; if(n.spr.body) n.spr.body.setVelocity(0);
  scene.time.delayedCall(ms,()=>{ if(n) n.busy=false; }); }
function npcCerca(n,r){ return livingNpcs().find(o=>o!==n&&!o.busy&&Math.hypot(o.spr.x-n.spr.x,o.spr.y-n.spr.y)<r); }
function aguaCercaPx(px,py){ const t=tileOf(px,py);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){ const x=t.x+dx,y=t.y+dy;
    if(x>=0&&x<COLS&&y>=0&&y<ROWS&&!isLand(x,y)) return {x:x*T+T/2,y:y*T+T/2}; } return null; }
function splashFx(x,y){ const f=scene.add.sprite(x,y,'foam').play({key:'foam-a'}).setScale(0.7).setDepth(y);
  scene.time.delayedCall(700,()=>f.destroy()); burst(x,y-6,0x9fd3e0,10,8); sfx('door',0.2); }
function encarar(a,b){ a.spr.setFlipX(b.spr.x<a.spr.x); b.spr.setFlipX(a.spr.x<b.spr.x); }
function verEscena(x,y,txt){ if(cameraBusy||manualView) return; setWatching(txt); tViewers+=rint(60,220); cutToPos(x,y); }   // corte de cámara con zoom a la escena
function escenaAbsurda(){
  const living=livingNpcs().filter(n=>!n.busy&&!n._bub); if(living.length<2) return;
  const r=Math.random();
  if(r<0.4){                                             // discusión: dos vecinos se cruzan de palabras
    const a=pick(living), b=npcCerca(a,130); if(!b) return;
    ocupar(a,1600); ocupar(b,1600); encarar(a,b);
    burst(a.spr.x,a.spr.y-30,0xffcf5a,6,10);
    burbuja(a,L('¡Retirá lo dicho!','Take that back!')); a._bub=b._bub=1;
    scene.time.delayedCall(850,()=>{ if(!b.dead){ burbuja(b,L('¡Obligame!','Make me!')); } });
    scene.time.delayedCall(1700,()=>{ a._bub=null; b._bub=null; });
    if(Math.random()<0.5) verEscena((a.spr.x+b.spr.x)/2,(a.spr.y+b.spr.y)/2-10, L('Discusión en la calle…','A street argument…'));
  } else if(r<0.68){                                     // pelea corta: chispas y polvareda
    const a=pick(living), b=npcCerca(a,120); if(!b) return;
    ocupar(a,1200); ocupar(b,1200); encarar(a,b);
    const mx=(a.spr.x+b.spr.x)/2, my=(a.spr.y+b.spr.y)/2;
    ring(mx,my-8,0xd64545); burst(mx,my-6,0xffffff,12,8); dustPuff(mx,my,2,0); sfx('clash',0.25);
    verEscena(mx,my-10, L('¡Pelea callejera!','A street brawl!'));
  } else {                                               // chapuzón: un aldeano se tira al agua y sale
    const cand=living.filter(n=>n.tipo==='pawn'||n.tipo==='warrior'); const a=pick(cand)||pick(living);
    const wp=aguaCercaPx(a.spr.x,a.spr.y); if(!wp) return;
    const ox=a.spr.x, oy=a.spr.y; ocupar(a,2800);
    verEscena(ox,oy-10, L('¡Alguien se tiró al agua!','Someone jumped in the water!'));
    burbuja(a,L('¡Al agua!','Cannonball!')); a._bub=1; scene.time.delayedCall(2600,()=>{ if(a) a._bub=null; });
    scene.tweens.add({targets:a.spr,x:wp.x,y:wp.y,duration:620,ease:'Sine.easeIn',onComplete:()=>{
      splashFx(wp.x,wp.y); a.spr.setVisible(false);
      scene.time.delayedCall(700,()=>{ if(a.spr){ a.spr.setVisible(true); splashFx(wp.x,wp.y);
        scene.tweens.add({targets:a.spr,x:ox,y:oy,duration:700,ease:'Sine.easeOut'}); } }); }});
  }
}

let scene, obstacles, npcGroup, npcs=[], buildings=[], walkTiles=[], blocked=[], land=[], elev=[], cliff=[];   // elev/cliff = mesetas con acantilados
let treeSpots=[], gmPos=null;                 // sitios de trabajo (bosque y mina)
let cameraBusy=false, baseZoom=1, baseCX=WORLD_W/2, baseCY=WORLD_H/2;
let paused=false, speed=1, nightRect=null, soundOn=false, manualView=false;
const SPDF=0.6;                              // factor global de velocidad: antes iban demasiado rápido
function sfx(key,vol){ if(soundOn&&scene) scene.sound.play('s_'+key,{volume:vol||0.5}); }
let evAcc=0, evNext=2200, worldMin=6*60, clkAcc=0, viewers=1204, tViewers=1204, vAcc=0;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== parámetros (tuneables) ===== */
const NPC_START=95, NPC_MAX=140;             // pobladores: reino poblado pero sin ahogar el arranque en equipos modestos
const N_MONSTERS=10;                         // bichos que merodean de fondo
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
  skull: {ti:'skull_idle',  ai:'skull-idle', ar:'skull-run',  sc:PSCALE, fw:192, spd:40},
  gnome: {ti:'gnome_idle',  ai:'gnome-idle', ar:'gnome-run',  sc:PSCALE, fw:192, spd:52},
};
const ROAMERS=['torch','spear','gnoll','bear','snake','spider'];

new Phaser.Game({type:Phaser.AUTO,backgroundColor:'#123041',
  scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
  render:{pixelArt:true,antialias:false,roundPixels:true},
  physics:{default:'arcade',arcade:{debug:false}},
  scene:{preload,create,update}});

function preload(){
  this.load.on('loaderror',f=>{ console.warn('⚠ asset no cargó:',f&&f.key,f&&f.src); });
  const W={blue:"assets/img/warrior_blue.png",red:"assets/img/warrior_red.png",purple:"assets/img/warrior_purple.png",yellow:"assets/img/warrior_yellow.png"};
  for(const k in W) this.load.spritesheet('warrior_'+k, W[k], {frameWidth:110,frameHeight:98});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  // terreno
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('tmg',TSB+'tilemap_grass.png',{frameWidth:64,frameHeight:64});   // mesetas: cima de pasto + cara de piedra (grass-on-elevation)
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
  for(let i=1;i<=6;i++) this.load.image('goldstone'+i,TSB+'goldstone'+i+'.png');   // piedras de oro sueltas (decoración)
  ['res_gold','res_meat','res_wood'].forEach(k=>this.load.image(k,TSB+k+'.png'));
  // unidades y muerte
  for(const c of COLORES) this.load.spritesheet('pawn_'+c,TSB+'pawn_'+c+'.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('dead',TSB+'dead.png',{frameWidth:128,frameHeight:256});   // 7 frames de 128×256 (896/128)
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
  this.load.spritesheet('skull_idle',TSB+'skull_i.png',{frameWidth:192,frameHeight:192});   // villanos: no-muerto
  this.load.spritesheet('skull_run', TSB+'skull_r.png', {frameWidth:192,frameHeight:192});
  this.load.spritesheet('gnome_idle',TSB+'gnome_i.png',{frameWidth:192,frameHeight:192});   // villanos: gnomo de gorro rojo
  this.load.spritesheet('gnome_run', TSB+'gnome_r.png', {frameWidth:192,frameHeight:192});
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
  this.load.spritesheet('explosion',TSB+'explosion.png',{frameWidth:192,frameHeight:128});   // 6 frames de 192×128
  // partículas Tiny Swords (Particle FX del Free Pack)
  this.load.spritesheet('dust1',TSB+'dust1.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('dust2',TSB+'dust2.png',{frameWidth:64,frameHeight:64});
  ['fire','clash','coins','latch','bell','door','bong','creak'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}
function makeDot(s){const g=s.add.graphics({add:false});g.fillStyle(0xffffff,1);g.fillCircle(4,4,4);g.generateTexture('dot',8,8);g.destroy();}
function makeBird(s){const g=s.add.graphics({add:false});g.lineStyle(2,0x2a2318,1);g.beginPath();g.moveTo(0,4);g.lineTo(5,0);g.lineTo(10,4);g.strokePath();g.generateTexture('bird',12,6);g.destroy();}
function bandada(){                                     // una bandada cruza el cielo de vez en cuando
  if(!scene||paused) return;
  const dir=Math.random()<0.5?1:-1, y0=rint(40,WORLD_H*0.32), n=rint(3,6);
  for(let i=0;i<n;i++){ const b=scene.add.image(dir>0?-40-i*22:WORLD_W+40+i*22, y0+rint(-16,16),'bird').setDepth(89500).setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.8,1.3));
    scene.tweens.add({targets:b,y:'+=6',duration:340,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});   // aleteo
    scene.tweens.add({targets:b,x:dir>0?WORLD_W+80:-80,duration:rint(9000,15000),ease:'Linear',delay:i*160,onComplete:()=>b.destroy()}); }
}

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
const isIn=(x,y)=> x>=0&&x<COLS&&y>=0&&y<ROWS;
// cima de meseta con pasto (Tilemap_color1: grass-on-elevation) — autotile por vecinos de igual o mayor altura
function geIdx(x,y){ const lv=elev[y][x];
  const inE=(a,b)=>isIn(a,b)&&elev[b][a]>=lv;
  const n=inE(x,y-1), s=inE(x,y+1), w=inE(x-1,y), e=inE(x+1,y);
  if(n&&s&&w&&e) return 15;
  if(!n&&!w) return 5; if(!n&&!e) return 8; if(!s&&!w) return 32; if(!s&&!e) return 35;
  if(!n) return 6; if(!s) return 33; if(!w) return 14; if(!e) return 17;
  return 15; }
// cara de acantilado (piedra teal) bajo el borde sur de la meseta
function gcIdx(x,y){ const l=isIn(x-1,y)&&cliff[y][x-1], r=isIn(x+1,y)&&cliff[y][x+1];
  return l&&r?42 : (!l&&r)?41 : (l&&!r)?44 : 43; }
// genera mesetas coherentes (blobs) lejos de plaza/barrios, deriva el acantilado sur y bloquea la cara
function buildMesetas(evitar,esCalle){
  esCalle=esCalle||(()=>false);
  for(let y=0;y<ROWS;y++){ elev[y]=Array(COLS).fill(0); cliff[y]=Array(COLS).fill(false); }
  const lejos=(x,y)=>evitar.every(p=>Math.hypot(x-p.x,y-p.y)>p.r);
  let puestas=0, intentos=0;
  while(puestas<4 && intentos++<60){
    const mx=rint(6,COLS-7), my=rint(4,ROWS-6), mr=rint(2,4), p1=Math.random()*6.28;
    if(!isLand(mx,my)||!lejos(mx,my)||esCalle(mx,my)) continue;
    for(let y=my-mr-1;y<=my+mr+1;y++)for(let x=mx-mr-1;x<=mx+mr+1;x++){
      const ang=Math.atan2(y-my,x-mx), wob=0.9*Math.sin(ang*3+p1);
      if(isIn(x,y)&&isLand(x,y)&&isLand(x,y+1)&&lejos(x,y)&&!esCalle(x,y)&&Math.hypot(x-mx,y-my)<mr+wob) elev[y][x]=1;
    }
    puestas++;
  }
  // erosión: sacar púas sueltas (menos de 2 vecinos altos → baja)
  for(let it=0;it<2;it++){ const snap=elev.map(r=>r.slice());
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(snap[y][x]){ let a=0;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) if(isIn(x+dx,y+dy)&&snap[y+dy][x+dx]) a++;
      if(a<2) elev[y][x]=0; } }
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(elev[y][x]&&!isLand(x,y+1)) elev[y][x]=0;   // no colgar sobre el agua
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){                                                 // acantilado = fila de piedra al sur del escalón
    if(elev[y][x] && isIn(x,y+1) && !elev[y+1][x] && isLand(x,y+1) && !esCalle(x,y+1)) cliff[y+1][x]=true;
  }
}
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
  scene=this; makeDot(this); makeBird(this);
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
  an.create({key:'explosion-a',frames:an.generateFrameNumbers('explosion',{start:0,end:5}),frameRate:14,repeat:0});
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
  an.create({key:'skull-idle',frames:an.generateFrameNumbers('skull_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'skull-run', frames:an.generateFrameNumbers('skull_run',{start:0,end:5}),frameRate:10,repeat:-1});
  an.create({key:'gnome-idle',frames:an.generateFrameNumbers('gnome_idle',{start:0,end:7}),frameRate:8,repeat:-1});
  an.create({key:'gnome-run', frames:an.generateFrameNumbers('gnome_run',{start:0,end:5}),frameRate:12,repeat:-1});
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
  an.create({key:'dust1-a',frames:an.generateFrameNumbers('dust1',{start:0,end:-1}),frameRate:11,repeat:0});
  an.create({key:'dust2-a',frames:an.generateFrameNumbers('dust2',{start:0,end:-1}),frameRate:11,repeat:0});

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

  // ---- campos dorados: parches orgánicos de pasto seco para variar el terreno (verde + dorado) ----
  const dry=new Set();
  for(let b=0;b<6;b++){ const dcx=rint(6,COLS-6), dcy=rint(4,ROWS-4), rr=rint(2,4);
    for(let y=dcy-rr;y<=dcy+rr;y++)for(let x=dcx-rr;x<=dcx+rr;x++)
      if(y>=0&&y<ROWS&&x>=0&&x<COLS&&isLand(x,y)&&!inSand(x,y)&&Math.hypot(x-dcx,y-dcy)<=rr+Math.random()) dry.add(pkey(x,y)); }
  const inDry=(x,y)=>dry.has(pkey(x,y));
  dry.forEach(k=>{const [x,y]=k.split(',').map(Number); rt.drawFrame('ground',sandIdx(x,y,inDry),x*T,y*T);});

  // ---- MESETAS con acantilados (relieve real): cima de pasto + cara de piedra ----
  const evitarMeseta=[{x:px,y:py,r:6}].concat(GUILDS.map(g=>({x:g.cx,y:g.cy,r:6})));
  buildMesetas(evitarMeseta, inSand);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(elev[y][x]) rt.drawFrame('tmg',geIdx(x,y),x*T,y*T);        // cima de pasto elevada
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(cliff[y][x]) rt.drawFrame('tmg',gcIdx(x,y),x*T,y*T);         // cara de acantilado
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(cliff[y][x]){                                                // sombra al pie + colisión de la pared
    blocked[y][x]=true;
    this.add.rectangle(x*T+T/2,y*T+T-1,T,9,0x0a1508,0.20).setOrigin(0.5,1).setDepth(-19);
  }

  npcGroup=this.physics.add.group();
  this.physics.add.collider(npcGroup,obstacles);
  this.physics.world.setBounds(T,T,WORLD_W-2*T,WORLD_H-2*T);

  // ---- castillo real + mercado en la plaza ----
  placeBuilding('castle_black',px,py-2,0.9,{fw:4,fh:2});
  banner(px,py,0xc9a227);
  placeTorch(px-3,py-2); placeTorch(px+3,py-2);
  // mercado 100% Tiny Swords: pilas de recursos + puestos de cosecha
  placeDecoImg('res_gold',px-1,py+2,0.5); placeDecoImg('res_meat',px+1,py+2,0.5); placeDecoImg('res_wood',px,py+2,0.5);
  placeDecoImg('tdeco12',px-2,py+2,0.9);  placeDecoImg('tdeco13',px+2,py+2,0.9);   // zapallos a la venta
  placeDecoImg('tdeco17',px-3,py+1,0.9);  placeDecoImg('tdeco6',px+3,py+1,0.85);   // cartel y piedra
  placeTorch(px-3,py+2); placeTorch(px+3,py+2);

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
    banner(g.cx, g.cy, g.color); placeTorch(g.cx+1, g.cy); placeTorch(g.cx-QRX+1, g.cy-QRY+1);
    const casa=(kx,ky,tex,sc)=>{ if(!isLand(kx,ky)||blocked[ky][kx]||inSand(kx,ky)) return false; placeBuilding(tex,kx,ky,sc,{fw:1,fh:1}); return true; };
    if(g.kind==='goblin'){                                   // aldea goblin: chozas + tótems
      placeBuilding('goblin_house', g.cx, g.cy-1, 0.85, {fw:1,fh:1});
      placeDecoImg('tdeco18',g.cx-1,g.cy+1,0.95); placeDecoImg('tdeco14',g.cx+2,g.cy+2,0.9);
      let p=0,it=0; while(p<7&&it++<90){ if(casa(g.cx+rint(-QRX+1,QRX-1),g.cy+rint(-QRY+1,QRY-1),'goblin_house',Phaser.Math.FloatBetween(0.62,0.8))) p++; }
    } else if(g.kind==='villano'){                            // guarida villana: torre oscura + casas púrpura + huesos
      placeBuilding('tower_purple', g.cx, g.cy-1, 0.85, {fw:1,fh:1});
      placeDecoImg('tdeco15',g.cx-1,g.cy+1,0.9); placeDecoImg('tdeco14',g.cx+2,g.cy+1,0.9);
      let p=0,it=0; while(p<7&&it++<90){ if(casa(g.cx+rint(-QRX+1,QRX-1),g.cy+rint(-QRY+1,QRY-1),pick(CASAS)+'_purple',Phaser.Math.FloatBetween(0.68,0.85))) p++; }
    } else {                                                  // barrio humano (torre + especial + casas del color)
      placeBuilding('tower_'+g.tex, g.cx, g.cy-1, 0.8, {fw:1,fh:1});
      placeBuilding(pick(ESPECIALES)+'_'+g.tex, g.cx+rint(-2,2), g.cy+2, 0.78, {fw:2,fh:1});
      let p=0,it=0; while(p<8&&it++<70){ if(casa(g.cx+rint(-QRX+1,QRX-1),g.cy+rint(-QRY+1,QRY-1),pick(CASAS)+'_'+g.tex,Phaser.Math.FloatBetween(0.72,0.88))) p++; }
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
  // (los murciélagos volaban acá: eran Tiny Dungeon → purgados; "criatura voladora" queda en la lista de huecos de VISUAL.md)

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

  // ---- bosques animados + arbustos + rocas + decos por todos lados (densidad alta) ----
  const bloquear=(x,y)=>{ if(blocked[y]) blocked[y][x]=true; };            // marca colisión en el prop
  for(let c=0;c<13;c++){ const t=randFree(); if(!t) continue;             // más bosques
    for(let k=rint(4,8);k>0;k--){ const gx=Phaser.Math.Clamp(t.x+rint(-2,2),1,COLS-2), gy=Phaser.Math.Clamp(t.y+rint(-2,2),1,ROWS-2);
      if(isLand(gx,gy)&&!blocked[gy][gx]&&!inSand(gx,gy)) placeTree(gx,gy); } }
  for(let i=0;i<30;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)) placeTree(t.x,t.y);}
  for(let i=0;i<34;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)){const b='bush'+rint(1,4);
    scene.add.sprite(t.x*T+T/2,t.y*T+T-4,b).play({key:b+'-a',startFrame:rint(0,7)}).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.5,0.7)).setDepth(t.y*T+T-4);}}
  for(let i=0;i<26;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)){ placeDecoImg('rock'+rint(1,4),t.x,t.y,Phaser.Math.FloatBetween(0.7,1.0)); bloquear(t.x,t.y); }}   // las rocas bloquean
  for(let i=0;i<12;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)){ placeDecoImg('goldstone'+rint(1,6),t.x,t.y,Phaser.Math.FloatBetween(0.5,0.7)); bloquear(t.x,t.y); }}   // piedras de oro sueltas
  for(let i=0;i<60;i++){const t=randFree(); if(t&&!inSand(t.x,t.y)) placeDecoImg('tdeco'+rint(1,18),t.x,t.y,Phaser.Math.FloatBetween(0.65,1));}   // usa TODAS las decos (1-18)
  for(let i=0;i<55;i++){const t=randFree(); if(t&&!inSand(t.x,t.y))                    // matojos de pasto: textura/detalle del suelo
    scene.add.image(t.x*T+T/2+rint(-18,18),t.y*T+T/2+rint(-14,14),'ground',pick([4,14,24])).setOrigin(0.5,0.6).setScale(Phaser.Math.FloatBetween(0.7,1.0)).setDepth(-19);}
  for(let i=0;i<9;i++){const t=randFree(); if(t) spawnSheep(t.x,t.y);}

  // ---- casillas caminables ----
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++) if(isLand(x,y)&&!blocked[y][x]) walkTiles.push({x:x*T+T/2,y:y*T+T/2});

  // ---- población: guerreros, aldeanos, arqueros y monjes ----
  for(let i=0;i<NPC_START;i++) spawnNpc(null, pick(POPMIX));                       // pobladores humanos (spawnNpc(null) ya elige sólo gremios humanos)
  GUILDS.filter(g=>g.kind!=='humano').forEach(g=>{ for(let i=0;i<10;i++) spawnNpc(g.id, null); });   // ciudadanos goblin/villano en su barrio
  const HUM=GUILDS.filter(g=>g.kind==='humano');
  for(const g of HUM){ spawnWorker(g.id,'waxe'); spawnWorker(g.id,'wpick'); }      // leñador y minero por facción humana
  spawnWorker(pick(HUM).id,'wgold'); spawnWorker(pick(HUM).id,'wgold');            // cargadores de oro
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
  renderMarcador();                                  // el marcador ya se sembró; refresca por si la escena tardó
  this.time.addEvent({delay:rint(9000,16000),loop:true,callback:()=>{ if(!paused&&Math.random()<0.7) bandada(); }});   // bandadas cruzando el cielo
}

/* ===== colocación ===== */
function humoCasa(spr){                                 // chimenea: chispas de fuego + humo saliendo del techo
  const cx2=spr.x+spr.displayWidth*0.16, cy2=spr.y-spr.displayHeight*0.80;
  scene.time.addEvent({delay:rint(1100,2000),loop:true,callback:()=>{ if(paused||!spr.active) return;
    if(Math.random()<0.75){ const e=scene.add.image(cx2+rint(-3,3),cy2,'dot').setTint(pick([0xffb347,0xff7a3a,0xffd36b])).setDepth(99998).setScale(Phaser.Math.FloatBetween(0.35,0.7)).setAlpha(0.9);   // brasa/fuego
      scene.tweens.add({targets:e,y:cy2-rint(16,32),x:e.x+rint(-6,6),alpha:0,scale:0.1,duration:rint(900,1500),ease:'Sine.easeOut',onComplete:()=>e.destroy()}); }
    const s=scene.add.image(cx2+rint(-3,3),cy2-4,'dot').setTint(0x9a9088).setDepth(99997).setScale(Phaser.Math.FloatBetween(0.6,1.1)).setAlpha(0.42);   // humo
    scene.tweens.add({targets:s,y:cy2-rint(30,52),x:s.x+rint(-10,10),alpha:0,scale:0.2,duration:rint(1800,2800),ease:'Sine.easeOut',onComplete:()=>s.destroy()});
  }});
}
function placeBuilding(key,tx,ty,sc,opt){
  opt=opt||{fw:1,fh:1};
  const x=tx*T+T/2, y=ty*T+T;
  const spr=scene.add.image(x,y,key).setOrigin(0.5,1).setScale(sc).setDepth(y);
  if(/house/.test(key)) humoCasa(spr);                    // casas y chozas: humo+fuego en la chimenea
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
function placeTorch(tx,ty){                            // brasero: llama animada de Tiny Swords + glow
  const x=tx*T+T/2, y=ty*T+T-4;
  const glow=scene.add.circle(x,y-20,22,0xffb060,0.26).setDepth(y-1);
  scene.add.sprite(x,y,'fire').play({key:'fire-a',startFrame:rint(0,6)}).setOrigin(0.5,1).setScale(0.34).setDepth(y);
  scene.tweens.add({targets:glow,alpha:{from:0.16,to:0.34},scaleX:{from:0.9,to:1.2},scaleY:{from:0.9,to:1.2},duration:560,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
}
function makeName(){const b=pick(NAME_B());return b?`${pick(NAME_A)} ${b}`:pick(NAME_A);}

/* ===== spawns ===== */
function spawnNpc(gid,tipo){
  if(livingNpcs().length>=NPC_MAX) return null;
  const g=gid?guildById[gid]:pick(GUILDS.filter(x=>x.kind==='humano'));
  if(g.kind==='goblin'||g.kind==='villano'){                 // ciudadanos hostiles: merodean su barrio (usan el sistema de monstruos)
    const kinds = g.kind==='goblin' ? ['torch','spear','gnoll','tnt','shaman'] : ['thief','skull','gnome','snake','spider'];
    const m=spawnMonster(pick(kinds), Phaser.Math.Clamp(g.cx+rint(-4,4),1,COLS-2), Phaser.Math.Clamp(g.cy+rint(-3,3),1,ROWS-2), {tx:g.cx,ty:g.cy,r:5});
    if(m){ m.guild=g.id; m.faccion=true; } return m;
  }
  tipo=tipo||'warrior';
  const sp0=nearWalkable(Phaser.Math.Clamp(g.cx+rint(-3,3),1,COLS-2), Phaser.Math.Clamp(g.cy+rint(-2,3),1,ROWS-2));
  const sx=sp0.x, sy=sp0.y;
  const n={sheep:false,monster:false,guild:g.id,tex:g.tex,tipo,name:makeName(),race:pick(RACES()),cls:pick(CLASSES()),
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
function walkableAtPx(px,py){ const t=tileOf(px,py); return walkable(t.x,t.y); }   // ¿el píxel cae en tierra caminable?
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
function cutToPos(x,y,hold){if(cameraBusy||manualView)return;cameraBusy=true;const cam=scene.cameras.main,z=Math.min(Math.max(baseZoom*4.2,baseZoom+1.1),2.9);   // zoom más dramático
  cam.pan(x,y,600,'Sine.easeInOut'); cam.zoomTo(z,600,'Cubic.easeInOut'); reticleLock(true);
  scene.time.delayedCall(hold||3400,()=>{cam.pan(baseCX,baseCY,850,'Sine.easeInOut');cam.zoomTo(baseZoom,850,'Sine.easeInOut');reticleLock(false);hideLabels();
    scene.time.delayedCall(880,()=>{cameraBusy=false;});});}
// director de cámara: el Ojo del Vigía recorre la isla con zoom aunque no haya evento (para que siempre pase algo)
function directorCamara(){
  if(cameraBusy||manualView) return;
  const living=livingNpcs(); if(!living.length) return;
  const r=Math.random();
  if(r<0.55){ const n=pick(living); setWatching(L('Siguiendo a ','Following ')+n.name+' · '+n.cls); showLabel(n); tViewers+=rint(40,140); cutToPos(n.spr.x,n.spr.y-18,2600); }
  else if(r<0.8){ const g=pick(GUILDS); setWatching(L('Recorriendo ','Touring ')+g.name); tViewers+=rint(40,120); cutToPos(g.cx*T+T/2,g.cy*T+T/2,2600); }
  else { const m=npcs.filter(n=>n.monster&&!n.dead); if(m.length){ const b=pick(m); setWatching(L('Vigilando a las fieras…','Watching the beasts…')); cutToPos(b.spr.x,b.spr.y-14,2400); } }
}
function showLabel(n){hideLabels(); if(n.dead)return;
  n.label=scene.add.text(n.spr.x,n.spr.y-52,`${n.name}\n${n.cls} · ${n.race}`,
    {fontFamily:'ui-monospace,monospace',fontSize:'11px',color:'#ece3d0',align:'center',stroke:'#120d09',strokeThickness:3,lineSpacing:1}).setOrigin(0.5,1).setDepth(100001).setResolution(2);}
function hideLabels(){npcs.forEach(n=>{if(n.label){n.label.destroy();n.label=null;}});}

/* ===== efectos ===== */
function burst(x,y,color,count,rise,dp){for(let i=0;i<count;i++){const p=scene.add.image(x,y,'dot').setTint(color).setDepth(dp||99999).setScale(Phaser.Math.FloatBetween(0.5,1.4)).setAlpha(0.95);
  scene.tweens.add({targets:p,x:x+rint(-28,28),y:y-rise-rint(0,26),alpha:0,scale:0.1,duration:rint(500,1200),ease:'Quad.easeOut',onComplete:()=>p.destroy()});}}
function ring(x,y,color){const c=scene.add.circle(x,y,6).setStrokeStyle(2,color,1).setDepth(99998);
  scene.tweens.add({targets:c,radius:52,alpha:0,duration:900,ease:'Cubic.easeOut',onUpdate:()=>c.setStrokeStyle(2,color,c.alpha),onComplete:()=>c.destroy()});}
function dustPuff(x,y,count,tint){                    // humo/polvo Tiny Swords (Particle FX)
  for(let i=0;i<count;i++){
    const k=pick(['dust1','dust2']);
    const p=scene.add.sprite(x+rint(-14,14),y+rint(-8,4),k).setDepth(99999)
      .setScale(Phaser.Math.FloatBetween(0.8,1.4)).setAlpha(0.85);
    if(tint) p.setTint(tint);
    p.play({key:k+'-a',delay:i*90});
    scene.tweens.add({targets:p,y:p.y-rint(16,40),duration:800,ease:'Sine.easeOut'});
    p.once('animationcomplete',()=>p.destroy());
  }
}
function boom(x,y){ const e=scene.add.sprite(x,y,'explosion').setDepth(99999).setScale(0.9);
  e.play('explosion-a'); e.once('animationcomplete',()=>e.destroy()); }
function playFx(kind,x,y){const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(kind==='fire'){ boom(x,y); dustPuff(x,y-18,4,0x8a8078); if(!rm)scene.cameras.main.shake(340,0.007); }
  else if(kind==='clash'){ ring(x,y,0xffffff); dustPuff(x,y-6,2,0); burst(x,y,0xd64545,10,8); scene.cameras.main.flash(120,229,220,180); }
  else if(kind==='ring'){ ring(x,y,0xc9a227); burst(x,y-6,0xc9a227,12,12); }
  else if(kind==='confetti'){ [0xd64545,0x4a90c2,0x5fa55a,0x9b6fce,0xc9a227].forEach(c=>burst(x,y-6,c,6,16)); }}

/* ===== consecuencias persistentes ===== */
function ruinBuilding(b){
  if(!b||b.ruined)return; b.ruined=true;
  b.spr.setTint(0x5a4438);
  scene.add.ellipse(b.x,b.y-4,b.spr.displayWidth*0.6,24,0x120b06,0.5).setDepth(b.y-1);
  const f=scene.add.sprite(b.x,b.y-8,'fire').play('fire-a').setOrigin(0.5,1).setScale(0.85).setDepth(b.y+1);   // fuego animado persistente
  const smoke=scene.time.addEvent({delay:900,loop:true,callback:()=>{
    if(paused)return; dustPuff(b.x+rint(-8,8), b.y-44, 1, 0x6e6660);
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
  // "una sombra alada" que barre el suelo (sin sprite: no hay dragón en el pack — hueco documentado en VISUAL.md)
  const sh=scene.add.ellipse(x-320,y,130,40,0x0a0a14,0.42).setDepth(y-1);
  scene.tweens.add({targets:sh,x:x+320,scaleX:{from:0.5,to:1.7},alpha:{from:0.42,to:0},duration:1500,ease:'Sine.easeIn',onComplete:()=>sh.destroy()});
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
function dropTreasure(x,y){                            // pila de oro Tiny Swords que brota del suelo
  const c=scene.add.image(x,y,'res_gold').setOrigin(0.5,0.85).setScale(0.08).setDepth(y);
  scene.tweens.add({targets:c,scale:0.55,duration:420,ease:'Back.easeOut'});
  ring(x,y-8,0xc9a227); burst(x,y-8,0xc9a227,10,8);
}

/* ===== motor narrativo (crónica bilingüe) ===== */
const TPL=[
  {tag:'MISIÓN',tagE:'QUEST',c:'#c9a227',major:false,t:x=>L(`${x.a}, ${x.cls} ${x.race}, acepta un contrato para limpiar las alcantarillas de ${x.d}.`,`${x.a}, ${x.cls} ${x.race}, takes a contract to clear the sewers of ${x.d}.`)},
  {tag:'MERCADO',tagE:'MARKET',c:'#e2a24a',major:false,t:x=>L(`Una caravana entra por la Puerta Sur cargada de ${x.i}. Los precios tiemblan.`,`A caravan rolls through the South Gate laden with ${x.i}. Prices tremble.`)},
  {tag:'TABERNA',tagE:'TAVERN',c:'#d99a5a',major:false,t:x=>L(`${x.a} y ${x.b} se van a los gritos en la taberna de ${x.d}. Corre la cerveza, no la sangre… todavía.`,`${x.a} and ${x.b} come to blows in a tavern in ${x.d}. Ale flows, not blood… yet.`)},
  {tag:'GREMIO',tagE:'GUILD',c:'#8fb4d6',major:false,t:x=>L(`El ${x.g} recluta a ${x.a}. Juramento sellado con hierro y silencio.`,`The ${x.g} recruits ${x.a}. An oath sealed in iron and silence.`)},
  {tag:'RUMOR',tagE:'RUMOR',c:'#a99a7a',major:false,t:x=>L(`Corre el rumor: ${x.a} le debe ${x.i} al ${x.g} y ya no responde a nadie.`,`Word spreads: ${x.a} owes ${x.i} to the ${x.g} and answers to no one now.`)},
  {tag:'NOCHE',tagE:'NIGHT',c:'#8c7f68',major:false,snd:'bell',t:x=>L(`Repican las campanas: la vigilia cambia de guardia en ${x.d}.`,`Bells toll: the watch changes over in ${x.d}.`)},
  {tag:'REFUERZO',tagE:'REINFORCEMENT',c:'#8fb4d6',major:false,spawn:true,snd:'door',t:x=>L(`Un barco atraca en los muelles: nuevos brazos para el ${x.g}.`,`A ship docks at the quays: fresh arms for the ${x.g}.`)},
  {tag:'PASTOR',tagE:'SHEPHERD',c:'#9fb06a',major:false,t:x=>L(`Las ovejas de ${x.d} escapan del corral. Alguien maldice en voz alta.`,`The sheep of ${x.d} break the pen. Someone curses out loud.`)},
  {tag:'LADRÓN',tagE:'THIEF',c:'#b8b8b8',major:false,thief:true,snd:'coins',t:x=>L(`Un ladrón se escurre entre los puestos de ${x.d}. Faltan monedas, sobran sospechas.`,`A thief slips between the stalls of ${x.d}. Coins missing, suspicion plenty.`)},
  {tag:'FAUNA',tagE:'WILDLIFE',c:'#c97b4a',major:false,fauna:true,t:x=>L(`¡Un oso bajó del monte! El rebaño corre en círculos y el pastor pide ayuda a gritos.`,`A bear came down from the hills! The flock scatters and the shepherd screams for help.`)},
  {tag:'GUERRA',tagE:'WAR',c:'#e5533a',major:true,fx:'fire',kind:'ruin',snd:'fire',t:x=>L(`GUERRA DE GREMIOS. El ${x.g} asalta ${x.d}. El acero canta y las puertas arden.`,`GUILD WAR. The ${x.g} storms ${x.d}. Steel sings and gates burn.`)},
  {tag:'DRAGÓN',tagE:'DRAGON',c:'#f2703a',major:true,fx:'fire',kind:'ruin',dragon:true,snd:'fire',t:x=>L(`¡DRAGÓN! Una sombra alada cae sobre ${x.d}. Fuego, ceniza y gritos.`,`DRAGON! A winged shadow falls on ${x.d}. Fire, ash and screams.`)},
  {tag:'INVASIÓN',tagE:'INVASION',c:'#7fbf5a',major:true,fx:'clash',kind:'raid',snd:'latch',t:x=>L(`¡INVASIÓN! Una horda goblin sale de las Profundidades y cae sobre ${x.d}. ¡A las armas!`,`INVASION! A goblin horde pours from the Deep onto ${x.d}. To arms!`)},
  {tag:'BESTIA',tagE:'BEAST',c:'#c97b4a',major:true,fx:'clash',kind:'beast',snd:'latch',t:x=>L(`UNA BESTIA ancestral cruza la isla. El suelo tiembla bajo sus pezuñas.`,`AN ANCIENT BEAST crosses the isle. The ground shakes under its hooves.`)},
  {tag:'DUELO',tagE:'DUEL',c:'#ff6b6b',major:true,fx:'clash',kind:'kill',snd:'clash',t:x=>L(`DUELO A MUERTE: ${x.a} contra ${x.b}. Solo uno queda en pie sobre la hierba.`,`DUEL TO THE DEATH: ${x.a} against ${x.b}. Only one is left standing on the grass.`)},
  {tag:'MAGNICIDIO',tagE:'ASSASSINATION',c:'#9aa0a6',major:true,fx:'clash',kind:'kill',snd:'clash',t:x=>L(`MAGNICIDIO. ${x.a} cae sin vida en ${x.d}. El ${x.g} lo niega todo.`,`ASSASSINATION. ${x.a} falls lifeless in ${x.d}. The ${x.g} denies everything.`)},
  {tag:'HALLAZGO',tagE:'DISCOVERY',c:'#c9a227',major:true,fx:'ring',kind:'none',treasure:true,snd:'coins',t:x=>L(`HALLAZGO. ${x.a} desentierra ${x.i} en las ruinas bajo ${x.d}. Todos lo quieren.`,`DISCOVERY. ${x.a} unearths ${x.i} in the ruins beneath ${x.d}. Everyone wants it.`)},
  {tag:'FIESTA',tagE:'FEAST',c:'#c9a227',major:true,fx:'confetti',kind:'none',snd:'bong',t:x=>L(`FESTÍN en ${x.d}: música, antorchas y vino. Hasta el ${x.g} baja las armas.`,`FEAST in ${x.d}: music, torches and wine. Even the ${x.g} lowers its arms.`)},
  {tag:'TRAICIÓN',tagE:'BETRAYAL',c:'#9b6fce',major:true,fx:'clash',kind:'defect',snd:'clash',t:x=>L(`TRAICIÓN. ${x.a} abandona el ${x.g} y jura lealtad a otro estandarte.`,`BETRAYAL. ${x.a} abandons the ${x.g} and swears to another banner.`)},
];
const tagL=tpl=>L(tpl.tag,tpl.tagE||tpl.tag);
function livingNpcs(){return npcs.filter(n=>!n.sheep&&!n.monster&&!n.dead);}
// pool automático del stream: como el espectador no tiene director, los eventos grandes
// (GUERRA/DUELO/MAGNICIDIO/TRAICIÓN/DRAGÓN + invasión/bestia) también salen solos y disparan
// el corte de cámara con zoom. La vida ambiente pesa el doble para que no sea todo drama.
const _AMB=TPL.filter(t=>!t.major), _MAJ=TPL.filter(t=>t.major);
const AUTO_POOL=[..._AMB,..._AMB,..._MAJ];
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
  const gsel=guildById[a.guild]||pick(GUILDS);
  const ctx={a:a.name,b:b.name,cls:a.cls,race:a.race,g:gsel.name,d:pick(DISTRICTS()),i:pick(ITEMS())};
  const enemyEv=tpl.kind==='raid'||tpl.kind==='beast'||tpl.thief;
  const av=enemyEv?'e'+String(rint(1,18)).padStart(2,'0'):(tpl.major?a.av:null);
  const text=tpl.t(ctx); pushChronicle(tagL(tpl),tpl.c,text,tpl.major,av);
  puntuar(tpl,gsel,a);                                   // el evento mueve el marcador de gremios
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
    if(n.busy){ if(n.spr.body) n.spr.body.setVelocity(0); n.spr.setDepth(n.spr.y);   // en una escena (discusión/pelea/chapuzón)
      if(n.label){ n.label.x=n.spr.x; n.label.y=n.spr.y-52; } continue; }
    const spd=n.spd*m*SPDF;
    const dx=n.tx-n.spr.x, dy=n.ty-n.spr.y, d=Math.hypot(dx,dy);
    if(Math.hypot(n.spr.x-n.lx,n.spr.y-n.ly)<0.25) n.stuck+=delta; else n.stuck=0;
    n.lx=n.spr.x; n.ly=n.spr.y;
    if(d<6&&n.path&&n.path.length){                        // siguiente waypoint de la ruta (con jitter que no caiga en agua)
      const p=n.path.shift(); let jx=p.x+rint(-6,6), jy=p.y+rint(-6,6);
      if(!walkableAtPx(jx,jy)){ jx=p.x; jy=p.y; } n.tx=jx; n.ty=jy;
    } else if(d<6||n.stuck>700){
      n.stuck=0; n.spr.body.setVelocity(0); n.path=null;
      if(n.idle<=0){ n.idle=rint(400,1800);
        n.spr.play((n.faceUp&&n.animIB)?n.animIB:n.animI,true); n.spr.setFlipX(!!n.faceLeft); }
      else { n.idle-=delta*m; if(n.idle<=0) retarget(n); }
    } else {
      // guardia de colisión: no pisar agua ni muros/edificios. Si el paso siguiente no es tierra, frena y replanea.
      const ax=n.spr.x+dx/d*12, ay=n.spr.y+dy/d*12;
      if(walkableAtPx(ax,ay)||d<T*0.6){
        const inv=spd/d; n.spr.body.setVelocity(dx*inv,dy*inv);
        n.faceLeft=dx<0; n.faceUp=(Math.abs(dy)>Math.abs(dx))&&dy<0;
        if(n.animR){ n.spr.play((n.faceUp&&n.animRB)?n.animRB:n.animR,true); n.spr.setFlipX(n.faceLeft); }
      } else { n.spr.body.setVelocity(0); n.stuck=999; }   // frena antes del agua/muro → retarget
    }
    n.spr.setDepth(n.spr.y);
    if(n.label){ n.label.x=n.spr.x; n.label.y=n.spr.y-52; }
  }
  if(paused) return;

  clkAcc+=delta*m;
  if(clkAcc>800){ worldMin+=6*(clkAcc/1000); clkAcc=0;
    const d=Math.floor(worldMin/1440)+1, mm=Math.floor(worldMin%1440);
    setClock(`${L('Día','Day')} ${d} · ${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`);
    const [col,al]=timeTint(worldMin); if(nightRect) nightRect.setFillStyle(col,al);
  }
  vAcc+=delta;
  if(vAcc>1500){ vAcc=0; tViewers+=rint(-40,55); tViewers+=(1180-tViewers)*0.04; tViewers=Math.max(600,tViewers); }
  viewers+=(tViewers-viewers)*0.08; setViewers(viewers);

  evAcc+=delta*m;
  if(evAcc>=evNext){ evAcc=0; evNext=rint(2400,4200); fireEvent(); }

  dlgAcc+=delta*m;                                        // burbujas de diálogo (más seguido y con humor)
  if(dlgAcc>=dlgNext){ dlgAcc=0; dlgNext=rint(2200,4600); decirAlgo(); }

  escAcc+=delta*m;                                        // escenas absurdas: discusiones, peleas, chapuzones
  if(escAcc>=escNext){ escAcc=0; escNext=rint(5000,10000); escenaAbsurda(); }

  camAcc+=delta*m;                                        // director de cámara: cortes con zoom aunque no haya evento
  if(camAcc>=camNext){ camAcc=0; camNext=rint(7000,12000); directorCamara(); }
}

function seedFeed(){
  renderMarcador();
  pushChronicle(tagL(TPL_BY_TAG['NOCHE']),'#8c7f68',L('Amanece sobre Ámbar, la isla partida en cuatro gremios. El Ojo del Vigía abre la transmisión.','Dawn over Amber, the isle split among four guilds. The Watcher’s Eye opens the broadcast.'),false);
  pushChronicle(tagL(TPL_BY_TAG['MERCADO']),'#e2a24a',L('El Mercado Alto enciende sus braseros; los muelles crujen con la marea.','The High Market lights its braziers; the docks creak with the tide.'),false);
  pushChronicle(tagL(TPL_BY_TAG['GREMIO']),'#8fb4d6',L('Los cuatro gremios izan sus estandartes. Ninguno reconoce a otro rey.','The four guilds raise their banners. None bows to another’s king.'),false);
}

/* ===== controles: el espectador sólo cambia sonido e idioma. El resto es del dueño (?admin=1) ===== */
const ADMIN=/[?&]admin=1/.test(location.search);
function bind(id,fn){ const el=$(id); if(el) el.addEventListener('click',fn); }
bind('btnSound',()=>{
  soundOn=!soundOn; $('btnSound').textContent=soundOn?L('SONIDO ✓','SOUND ✓'):L('SONIDO','SOUND');
  if(soundOn&&scene){ const c=scene.sound.context; if(c&&c.state==='suspended') c.resume(); sfx('bell',0.3); }
});
bind('btnLang',()=>{ LANG=LANG==='en'?'es':'en'; localStorage.setItem('ambar_lang',LANG); aplicarIdioma(); });

// re-aplica el idioma a todo el chrome estático + dinámico
function aplicarIdioma(){
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-es]').forEach(el=>{ el.textContent = LANG==='en'? (el.getAttribute('data-en')||el.textContent) : el.getAttribute('data-es'); });
  const bl=$('btnLang'); if(bl) bl.textContent = LANG==='en'?'ESPAÑOL':'ENGLISH';
  const bs=$('btnSound'); if(bs) bs.textContent = soundOn?L('SONIDO ✓','SOUND ✓'):L('SONIDO','SOUND');
  const bp=$('btnPause'); if(bp) bp.textContent = paused?L('SEGUIR','RESUME'):L('PAUSA','PAUSE');
  renderMarcador();
  if(typeof feedEl!=='undefined'&&feedEl) feedEl.innerHTML='';                 // reinicia la crónica en el nuevo idioma
  seedFeed();
}

// panel de dueño (pausa, velocidad y director de eventos): sólo visible con ?admin=1
if(ADMIN){
  const bar=document.querySelector('.ctrls');
  if(bar){
    const mk=(id,txt)=>{ const b=document.createElement('button'); b.className='ghost'; b.id=id; b.textContent=txt; return b; };
    const sel=document.createElement('select'); sel.className='evsel'; sel.id='evSel';
    TPL.forEach(t=>{ const o=document.createElement('option'); o.value=t.tag; o.textContent=(t.major?'★ ':'')+tagL(t); sel.appendChild(o); });
    const bEv=mk('btnEvent',L('LANZAR','FIRE')), bPa=mk('btnPause',L('PAUSA','PAUSE')), bSp=mk('btnSpeed','1×');
    bar.append(sel,bEv,bPa,bSp);
    bEv.addEventListener('click',()=>{ const t=TPL_BY_TAG[sel.value]; if(t&&scene) fireEvent(t); });
    bPa.addEventListener('click',()=>{ paused=!paused; bPa.textContent=paused?L('SEGUIR','RESUME'):L('PAUSA','PAUSE'); });
    bSp.addEventListener('click',()=>{ speed=speed===1?2:speed===2?4:1; bSp.textContent=speed+'×'; });
  }
}
aplicarIdioma();
