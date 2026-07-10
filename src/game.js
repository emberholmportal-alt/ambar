/* ÁMBAR · motor del stream (Phaser 3) — mundo v3: isla orgánica Tiny Swords */

/* ===== chrome ===== */
const $=id=>document.getElementById(id); const feedEl=$('feed'),reticleEl=$('reticle');
const KINGDOM=(typeof window!=='undefined'&&window.AOA_MODE==='kingdom');   // modo "visitar el reino": el usuario controla una unidad
const nf=n=>Math.round(n).toLocaleString(LANG==='en'?'en-US':'es-AR'); let clockStr='Día 1 · 06:00';
function pushChronicle(tag,color,text,major,av){if(!feedEl)return;const e=document.createElement('div');e.className='entry'+(major?' major':'');
  const avImg=av?`<img class="av" src="assets/img/ts/av/${av}.png" alt="">`:'';
  e.innerHTML=`${avImg}<div class="meta"><span class="t">${clockStr}</span><span class="tag" style="color:${color}">[${tag}]</span></div><div class="body">${text}</div>`;
  feedEl.prepend(e); while(feedEl.children.length>70) feedEl.removeChild(feedEl.lastChild);}
function setWatching(t){const e=$('watch');if(e)e.textContent=t} function setViewers(n){const e=$('viewers');if(e)e.textContent=nf(n)}
function reticleLock(on){if(reticleEl)reticleEl.classList.toggle('lock',on)} function setClock(s){clockStr=s;const e=$('clock');if(e)e.textContent=s}

/* ===== i18n ===== */
let LANG=(localStorage.getItem('ambar_lang')||'en');   // el live arranca en inglés por defecto
const L=(es,en)=>LANG==='en'?en:es;
const hex=c=>'#'+c.toString(16).padStart(6,'0');

/* ===== datos ===== */
const T=64, COLS=58, ROWS=36, WORLD_W=COLS*T, WORLD_H=ROWS*T;   // reino más grande
const MAR=2600;                                   // mar extra alrededor del mundo: cubre el letterbox (nada de sombra negra)
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
function lineaDe(n){ const lines=(DIALOGO[n&&n.guild]||[]).concat(DIALOGO.comun); const l=pick(lines); return L(l[0],l[1]); }

/* ===== diálogo GRANDE en primer plano (igual que el juego principal): acompaña el corte de cámara ===== */
let dlgHideEv=null;
function retratoNpc(n,size){                          // recorta el frame actual del sprite a dataURL (bichos sin avatar)
  try{ const fr=n.spr.frame, src=fr.texture.getSourceImage();
    const c=document.createElement('canvas'); c.width=size; c.height=size; const cx=c.getContext('2d'); cx.imageSmoothingEnabled=false;
    cx.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0,0,size,size); return c.toDataURL('image/png');
  }catch(e){ return null; } }
function quienDe(n){ const g=guildById[n&&n.guild];
  if(n&&n.name) return n.name + (g?' · '+g.name:'');
  return g? g.name : L('Isla de Ámbar','Isle of Amber'); }
function mostrarDialogoGrande(n,txt,quien){
  const box=$('dialog'); if(!box||!n||!n.spr||n.dead) return;
  const img=$('dlgImg'); const src=n.av?('assets/img/ts/av/'+n.av+'.png'):retratoNpc(n,96);
  if(src){ img.src=src; img.style.display='block'; } else img.style.display='none';
  $('dlgWho').textContent=quien||quienDe(n); $('dlgTxt').textContent=txt;
  box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
  if(dlgHideEv) dlgHideEv.remove(false);
  dlgHideEv=scene.time.delayedCall(4200,ocultarDialogoGrande);
}
function ocultarDialogoGrande(){ const b=$('dialog'); if(b) b.classList.remove('on'); }

/* ===== escenas absurdas: discusiones, peleas y chapuzones (vida ambiente del stream) ===== */
let escAcc=0, escNext=8000;
let camAcc=0, camNext=6000;
let carAcc=0, carNext=14000;
let usrAcc=0, usrNext=6000;
let rosAcc=0, rosNext=25000;
function ocupar(n,ms){ n.busy=true; n.path=null; if(n.spr.body) n.spr.body.setVelocity(0);
  scene.time.delayedCall(ms,()=>{ if(n) n.busy=false; }); }
function npcCerca(n,r){ return livingNpcs().find(o=>o!==n&&!o.busy&&Math.hypot(o.spr.x-n.spr.x,o.spr.y-n.spr.y)<r); }
function aguaCercaPx(px,py){ const t=tileOf(px,py);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){ const x=t.x+dx,y=t.y+dy;
    if(x>=0&&x<COLS&&y>=0&&y<ROWS&&!isLand(x,y)) return {x:x*T+T/2,y:y*T+T/2}; } return null; }
function splashFx(x,y){ const f=scene.add.sprite(x,y,'pfx_splash').setDepth(y+2).setScale(0.75).play('pfxsplash');   // salpicadura real (pfx_splash)
  f.once('animationcomplete',()=>f.destroy()); burst(x,y-6,0x9fd3e0,8,8); sfx('door',0.2); }
function encarar(a,b){ a.spr.setFlipX(b.spr.x<a.spr.x); b.spr.setFlipX(a.spr.x<b.spr.x); }
function verEscena(x,y,txt){ if(KINGDOM||cameraBusy||manualView) return false; setWatching(txt); tViewers+=rint(60,220); cutToPos(x,y); return true; }   // corte de cámara con zoom a la escena (true si cortó)
function escenaAbsurda(){
  const living=livingNpcs().filter(n=>!n.busy&&!n._bub); if(living.length<2) return;
  const r=Math.random();
  if(r<0.4){                                             // discusión: dos vecinos se cruzan de palabras
    const a=pick(living), b=npcCerca(a,130); if(!b) return;
    ocupar(a,1600); ocupar(b,1600); encarar(a,b);
    burst(a.spr.x,a.spr.y-30,0xffcf5a,6,10);
    const la=L('¡Retirá lo dicho!','Take that back!'), lb=L('¡Obligame!','Make me!');
    burbuja(a,la); a._bub=b._bub=1;
    scene.time.delayedCall(850,()=>{ if(!b.dead){ burbuja(b,lb); } });
    scene.time.delayedCall(1700,()=>{ a._bub=null; b._bub=null; });
    if(Math.random()<0.5 && verEscena((a.spr.x+b.spr.x)/2,(a.spr.y+b.spr.y)/2-10, L('Discusión en la calle…','A street argument…'))){
      mostrarDialogoGrande(a,la); scene.time.delayedCall(1000,()=>mostrarDialogoGrande(b,lb));
    }
  } else if(r<0.68){                                     // pelea corta: chispas y polvareda
    const a=pick(living), b=npcCerca(a,120); if(!b) return;
    ocupar(a,1200); ocupar(b,1200); encarar(a,b);
    const mx=(a.spr.x+b.spr.x)/2, my=(a.spr.y+b.spr.y)/2;
    ring(mx,my-8,0xd64545); burst(mx,my-6,0xffffff,12,8); dustPuff(mx,my,2,0); sfx('clash',0.25);
    if(verEscena(mx,my-10, L('¡Pelea callejera!','A street brawl!'))){ mostrarDialogoGrande(a,lineaDe(a)); scene.time.delayedCall(1100,()=>mostrarDialogoGrande(b,lineaDe(b))); }
  } else {                                               // chapuzón: un aldeano se tira al agua y sale
    const cand=living.filter(n=>n.tipo==='pawn'||n.tipo==='warrior'); const a=pick(cand)||pick(living);
    const wp=aguaCercaPx(a.spr.x,a.spr.y); if(!wp) return;
    const ox=a.spr.x, oy=a.spr.y; ocupar(a,2800);
    const laq=L('¡Al agua!','Cannonball!');
    if(verEscena(ox,oy-10, L('¡Alguien se tiró al agua!','Someone jumped in the water!'))) mostrarDialogoGrande(a,laq);
    burbuja(a,laq); a._bub=1; scene.time.delayedCall(2600,()=>{ if(a) a._bub=null; });
    scene.tweens.add({targets:a.spr,x:wp.x,y:wp.y,duration:620,ease:'Sine.easeIn',onComplete:()=>{
      splashFx(wp.x,wp.y); a.spr.setVisible(false);
      scene.time.delayedCall(700,()=>{ if(a.spr){ a.spr.setVisible(true); splashFx(wp.x,wp.y);
        scene.tweens.add({targets:a.spr,x:ox,y:oy,duration:700,ease:'Sine.easeOut'}); } }); }});
  }
}

/* ===== carrera: unos aldeanos corren una picada por la calle (con ganador y festejo) ===== */
function carreraNpcs(){
  if(cameraBusy||manualView) return;
  const pool=livingNpcs().filter(n=>!n.busy&&!n._bub&&n.spr&&n.spr.body);
  if(pool.length<3) return;
  const a=pick(pool);
  const near=pool.filter(n=>n!==a && Math.hypot(n.spr.x-a.spr.x,n.spr.y-a.spr.y)<T*3.2).slice(0,3);
  if(near.length<2) return;                                  // hacen falta al menos 3 corredores juntos
  const racers=[a].concat(near);
  const dir=a.spr.x<WORLD_W/2?1:-1, len=T*4.5, midY=a.spr.y, startX=a.spr.x, finX=startX+dir*len;
  if(!walkableAtPx(finX,midY)||!walkableAtPx(startX+dir*len*0.5,midY)) return;   // pista despejada (tierra)
  const win=rint(0,racers.length-1);
  racers.forEach((n,i)=>{
    ocupar(n,4800); n.spr.x=startX; n.spr.y=midY-18+i*13; n.spr.setFlipX(dir<0); n.spr.setDepth(n.spr.y);
    if(n.animR) n.spr.play(n.animR,true);
    dustPuff(n.spr.x,n.spr.y+8,1,0xcaa46a);
    const dur=i===win?2500:rint(2700,3500);
    scene.tweens.add({targets:n.spr,x:finX+rint(-6,6),duration:dur,ease:'Sine.easeInOut',delay:280,
      onUpdate:()=>n.spr.setDepth(n.spr.y),
      onComplete:()=>{ if(n.animI) n.spr.play(n.animI,true);
        if(i===win){ burst(n.spr.x,n.spr.y-24,0xf0d564,14,14); ring(n.spr.x,n.spr.y-10,0xf0d564);
          burbuja(n,L('¡Gané la carrera!','I won the race!')); n._bub=1; scene.time.delayedCall(3400,()=>{ if(n) n._bub=null; }); } }});
  });
  if(verEscena(startX+dir*len*0.5, midY, L('¡Carrera por las calles de Ámbar!','A street race across Amber!')))
    mostrarDialogoGrande(a, L('¡El último invita la cerveza!','Last one buys the ale!'));
}

let scene, obstacles, npcGroup, npcs=[], buildings=[], walkTiles=[], blocked=[], land=[], elev=[], cliff=[];   // elev/cliff = mesetas con acantilados
let treeSpots=[], gmPos=null, meatSpots=[];   // sitios de trabajo (bosque, mina y pastura)
let cameraBusy=false, baseZoom=1, baseCX=WORLD_W/2, baseCY=WORLD_H/2;
let paused=false, speed=1, nightRect=null, soundOn=false, manualView=false;
const SPDF=0.6;                              // factor global de velocidad: antes iban demasiado rápido
function sfx(key,vol){ if(soundOn&&scene) scene.sound.play('s_'+key,{volume:vol||0.5}); }
let evAcc=0, evNext=2200, worldMin=6*60, clkAcc=0, viewers=1204, tViewers=1204, vAcc=0;
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];

/* ===== espectadores reales: presencia por heartbeat contra el backend ===== */
let pAcc=0, viewersReal=null, _cid=null;
function cid(){ if(_cid) return _cid; try{ _cid=sessionStorage.getItem('aoa_cid'); }catch(e){}
  if(!_cid){ _cid='c'+Math.random().toString(36).slice(2)+Date.now().toString(36); try{ sessionStorage.setItem('aoa_cid',_cid); }catch(e){} } return _cid; }
async function pingViewers(){                       // avisa "estoy mirando" y recibe el conteo real
  const API=(window.AOA_API||'').replace(/\/$/,''); if(!API) return;
  try{ const r=await fetch(API+'/api/live/ping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cid:cid()})});
    if(r.ok){ const j=await r.json(); if(typeof j.viewers==='number') viewersReal=j.viewers; } }catch(e){}
}

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
  // barra de carga del splash: avanza con el progreso real del preload (mismo look que la beta)
  this.load.on('progress',p=>{ const b=$('liveBar'); if(b) b.style.width=Math.round(p*100)+'%';
    const r=$('liveRunner'); if(r) r.style.left=Math.round(p*100)+'%'; });   // el guerrero corre con la barra
  const W={blue:"assets/img/warrior_blue.png",red:"assets/img/warrior_red.png",purple:"assets/img/warrior_purple.png",yellow:"assets/img/warrior_yellow.png"};
  for(const k in W) this.load.spritesheet('warrior_'+k, W[k], {frameWidth:110,frameHeight:98});
  this.load.spritesheet('sheep','assets/img/sheep.png',{frameWidth:64,frameHeight:64});
  // terreno
  this.load.spritesheet('ground',TSB+'ground.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('tmg',TSB+'tilemap_grass.png',{frameWidth:64,frameHeight:64});   // mesetas: cima de pasto + cara de piedra (grass-on-elevation)
  this.load.image('water',TSB+'water.png');
  this.load.spritesheet('foam',TSB+'foam.png',{frameWidth:192,frameHeight:192});
  if(KINGDOM){ this.load.spritesheet('boat',TSB+'boat.png',{frameWidth:256,frameHeight:256}); this.load.image('bridge',TSB+'bridge_v.png');   // barcos + muelle del reino
    for(const c of COLORES) for(const u of ['warrior','archer','monk','pawn'])   // hojas de ataque reales (espada/arco/báculo/pico) por unidad y color
      this.load.spritesheet('atk_'+u+'_'+c, TSB+'atk_'+u+'_'+c+'.png',{frameWidth:192,frameHeight:192});
    this.load.image('bones1',TSB+'bones1.png');   // marca donde cae el enemigo
    for(const e of KENEMY_DEF){ this.load.spritesheet('ke_'+e.key+'_i',TSB+e.key+'_idle.png',{frameWidth:e.fw,frameHeight:e.fw});   // enemigos salvajes del Enemy Pack
      this.load.spritesheet('ke_'+e.key+'_r',TSB+e.key+'_run.png',{frameWidth:e.fw,frameHeight:e.fw}); }
    for(const c of COLORES) for(const res of ['wood','gold','food']){   // aldeano cargando recurso (pose con la madera/oro/comida en las manos)
      this.load.spritesheet('pc_'+c+'_'+res+'_i',TSB+'pc_'+c+'_'+res+'_i.png',{frameWidth:192,frameHeight:192});
      this.load.spritesheet('pc_'+c+'_'+res+'_r',TSB+'pc_'+c+'_'+res+'_r.png',{frameWidth:192,frameHeight:192}); }
    for(const c of COLORES) this.load.spritesheet('chop_'+c,TSB+'chop_'+c+'.png',{frameWidth:192,frameHeight:192}); }   // aldeano cortando (hacha)
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
  // Particle FX del pack (los que faltaban): nube de polvo, explosión, fuego y salpicadura reales
  this.load.spritesheet('pfx_dust',TSB+'pfx_dust.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('pfx_boom',TSB+'pfx_boom.png',{frameWidth:192,frameHeight:192});
  this.load.spritesheet('pfx_fire',TSB+'pfx_fire.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('pfx_splash',TSB+'pfx_splash.png',{frameWidth:192,frameHeight:192});
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
// escalera de piedra (no hay asset): escalones stackeados en el tono teal del acantilado
function makeStairsTex(s){ if(s.textures.exists('stairs')) return;
  const g=s.add.graphics({add:false}), W=54, H=64, steps=4, sh=Math.floor(H/steps), x=(64-W)/2;
  for(let i=0;i<steps;i++){ const y=i*sh;
    g.fillStyle(0x22403a,1); g.fillRect(x-2,y,W+4,sh);          // marco/sombra
    g.fillStyle(0x6f9a90,1); g.fillRect(x,y+2,W,sh-2);          // cara de piedra
    g.fillStyle(0xaccec4,1); g.fillRect(x,y+2,W,3); }           // brillo del borde del escalón
  g.generateTexture('stairs',64,H); g.destroy(); }
// genera mesetas coherentes (blobs) lejos de plaza/barrios, deriva el acantilado sur y bloquea la cara
function buildMesetas(evitar,esCalle){
  esCalle=esCalle||(()=>false);
  for(let y=0;y<ROWS;y++){ elev[y]=Array(COLS).fill(0); cliff[y]=Array(COLS).fill(false); }
  const lejos=(x,y)=>evitar.every(p=>Math.hypot(x-p.x,y-p.y)>p.r);
  // sella una meseta elíptica/orgánica (sx>1 = estirada a lo ancho → cara de acantilado que se lee como muro)
  const stamp=(mx,my,mr,sx,ph)=>{
    for(let y=Math.floor(my-mr-1);y<=my+mr+1;y++)for(let x=Math.floor(mx-mr*sx-1);x<=mx+mr*sx+1;x++){
      if(!isIn(x,y)) continue;
      const nx=(x-mx)/sx, ny=y-my, ang=Math.atan2(ny,nx), wob=0.8*Math.sin(ang*3+ph)+0.4*Math.sin(ang*5+ph*1.6);
      if(isLand(x,y)&&isLand(x,y+1)&&lejos(x,y)&&!esCalle(x,y)&&Math.hypot(nx,ny)<mr+wob) elev[y][x]=1;
    }
  };
  // CORDILLERA principal (el relieve protagonista): cadena de mesetas que serpentea a lo ancho del mapa.
  { let cx=rint(9,COLS-10), cy=rint(4,Math.floor(ROWS*0.5)), dir=Math.random()<0.5?1:-1, ph=Math.random()*6.28;
    for(let seg=0, segs=rint(4,6); seg<segs; seg++){
      stamp(cx,cy,rint(3,5),1.7,ph+seg*0.8);              // estirada horizontal → cordillera continua, no montículos
      cx=Phaser.Math.Clamp(cx+dir*rint(3,4),7,COLS-8);
      cy=Phaser.Math.Clamp(cy+pick([-1,0,0,1]),3,ROWS-6); // deriva suave: casi horizontal
    }
  }
  // 2 mesetas secundarias (más chicas) para dar regiones altas/bajas, no un solo bloque
  let sec=0, it=0;
  while(sec<2 && it++<80){ const mx=rint(6,COLS-7), my=rint(4,ROWS-6);
    if(!isLand(mx,my)||!lejos(mx,my)||esCalle(mx,my)) continue;
    stamp(mx,my,rint(2,3),Phaser.Math.FloatBetween(1.1,1.4),Math.random()*6.28); sec++;
  }
  // erosión: sacar púas sueltas (menos de 2 vecinos altos → baja)
  for(let it=0;it<2;it++){ const snap=elev.map(r=>r.slice());
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(snap[y][x]){ let a=0;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) if(isIn(x+dx,y+dy)&&snap[y+dy][x+dx]) a++;
      if(a<2) elev[y][x]=0; } }
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(elev[y][x]&&!isLand(x,y+1)) elev[y][x]=0;   // no colgar sobre el agua
  // SEGUNDO NIVEL: cimas más altas apiladas sobre la cordillera. Sólo en el interior (nunca colgando sobre el escalón inferior).
  const interior=[];
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){ if(elev[y][x]!==1) continue;
    let dentro=true; for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[0,2]]) if(!(elev[y+dy]&&elev[y+dy][x+dx]===1)){ dentro=false; break; }
    if(dentro) interior.push({x,y}); }
  Phaser.Utils.Array.Shuffle(interior);
  let hi=0;
  for(let i=0;i<interior.length && hi<2; i++){ const c=interior[i], mr=rint(1,2), ph=Math.random()*6.28, sube=[];
    for(let y=c.y-mr-1;y<=c.y+mr+1;y++)for(let x=c.x-mr-1;x<=c.x+mr+1;x++){ if(!isIn(x,y)) continue;
      const ang=Math.atan2(y-c.y,x-c.x), wob=0.7*Math.sin(ang*3+ph);
      if(elev[y]&&elev[y][x]===1 && elev[y+1]&&elev[y+1][x]>=1 && Math.hypot(x-c.x,y-c.y)<mr+wob) sube.push({x,y}); }
    if(sube.length>=4){ for(const t of sube) elev[t.y][t.x]=2; hi++; }
  }
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){                                                 // acantilado = fila de piedra al sur de CUALQUIER escalón (2→1 y 1→0)
    const below = isIn(x,y+1) ? (elev[y+1][x]||0) : 0;
    if(elev[y][x] && isIn(x,y+1) && below < elev[y][x] && isLand(x,y+1) && !esCalle(x,y+1)) cliff[y+1][x]=true;
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
// Cerca autotileada por VECINOS reales (no por la forma ideal): si la costa/arena se come un tramo,
// las esquinas y puntas se eligen según qué tiles adyacentes tienen cerca → nunca quedan postes sueltos ni tramos huérfanos.
// Frames del pack (4×3): 0=esq.sup-izq 3=esq.sup-der 8=esq.inf-izq 11=esq.inf-der · 1/2=borde sup · 9/10=borde inf · 4=lateral izq · 7=lateral der
function buildWall(cells){
  const S=new Set(cells.map(c=>c.x+','+c.y)), has=(x,y)=>S.has(x+','+y);
  for(const c of cells){
    const nl=has(c.x-1,c.y), nr=has(c.x+1,c.y), nu=has(c.x,c.y-1), nd=has(c.x,c.y+1);
    let fr;
    if(nr&&nd) fr=0; else if(nl&&nd) fr=3; else if(nr&&nu) fr=8; else if(nl&&nu) fr=11;   // esquinas: dos brazos perpendiculares
    else if(nl||nr) fr = c.b?pick([9,10]):pick([1,2]);                                    // tramo horizontal (arriba/abajo según su fila)
    else if(nu||nd) fr = c.r?7:4;                                                         // tramo vertical (izq/der según su columna)
    else fr = c.t?pick([1,2]):c.b?pick([9,10]):(c.r?7:4);                                 // poste suelto: al menos coherente con su lado
    scene.add.image(c.x*T+T/2,c.y*T+T-6,'fence',fr).setOrigin(0.5,1).setDepth(c.y*T+T-6);
    blocked[c.y][c.x]=true;
  }
}

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
  if(KINGDOM&&this.textures.exists('boat')) an.create({key:'boat-a',frames:an.generateFrameNumbers('boat',{start:0,end:7}),frameRate:6,repeat:-1});
  if(KINGDOM){ const ATKF={warrior:4,archer:8,monk:11,pawn:6};                    // ataque real por unidad/color (una pasada)
    for(const c of COLORES) for(const u in ATKF){ const k='atk_'+u+'_'+c; if(this.textures.exists(k))
      an.create({key:k+'-a',frames:an.generateFrameNumbers(k,{start:0,end:ATKF[u]-1}),frameRate:14,repeat:0}); }
    for(const e of KENEMY_DEF){ if(this.textures.exists('ke_'+e.key+'_i')){                // enemigos salvajes: idle + run
      an.create({key:'ke_'+e.key+'-i',frames:an.generateFrameNumbers('ke_'+e.key+'_i',{start:0,end:e.idle-1}),frameRate:6,repeat:-1});
      an.create({key:'ke_'+e.key+'-r',frames:an.generateFrameNumbers('ke_'+e.key+'_r',{start:0,end:e.run-1}),frameRate:9,repeat:-1}); } }
    for(const c of COLORES){ if(this.textures.exists('chop_'+c)) an.create({key:'chop_'+c+'-a',frames:an.generateFrameNumbers('chop_'+c,{start:0,end:5}),frameRate:13,repeat:0}); }   // cortar
    for(const c of COLORES) for(const res of ['wood','gold','food']){ const k='pc_'+c+'_'+res; if(this.textures.exists(k+'_i')){   // aldeano cargando
      an.create({key:k+'-i',frames:an.generateFrameNumbers(k+'_i',{start:0,end:7}),frameRate:6,repeat:-1});
      an.create({key:k+'-r',frames:an.generateFrameNumbers(k+'_r',{start:0,end:5}),frameRate:10,repeat:-1}); } } }
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
  an.create({key:'pfxdust',frames:an.generateFrameNumbers('pfx_dust',{start:0,end:-1}),frameRate:14,repeat:0});
  an.create({key:'pfxboom',frames:an.generateFrameNumbers('pfx_boom',{start:0,end:-1}),frameRate:16,repeat:0});
  an.create({key:'pfxfire',frames:an.generateFrameNumbers('pfx_fire',{start:0,end:-1}),frameRate:12,repeat:-1});
  an.create({key:'pfxsplash',frames:an.generateFrameNumbers('pfx_splash',{start:0,end:-1}),frameRate:14,repeat:0});

  // ---- mar + foam + suelo (RenderTexture: 1 draw call para todo el piso) ----
  this.add.tileSprite(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2,'water').setOrigin(0,0).setDepth(-30);   // el mar desborda el mundo → sin franja negra
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(!land[y][x]) continue;
    let coast=false;
    for(let oy=-1;oy<=1&&!coast;oy++)for(let ox=-1;ox<=1;ox++) if(!isLand(x+ox,y+oy)){coast=true;break;}
    if(coast) this.add.sprite(x*T+T/2,y*T+T/2,'foam').play({key:'foam-a',startFrame:rint(0,7)}).setDepth(-25);
  }
  const rt=this.add.renderTexture(0,0,WORLD_W,WORLD_H).setOrigin(0,0).setDepth(-20);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(land[y][x]) rt.drawFrame('ground',groundIdx(x,y),x*T,y*T);
  if(KINGDOM){                                                  // barcos en mar abierto + un muelle de tablones en la costa
    const openSea=(x,y)=>{ if(isLand(x,y))return false; for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++) if(isLand(x+ox,y+oy))return false; return true; };
    let boats=0, it=0;
    while(boats<4 && it++<400){ const x=rint(2,COLS-3), y=rint(2,ROWS-3); if(!openSea(x,y)) continue;
      const bx=x*T+T/2, by=y*T+T/2, bt=this.add.sprite(bx,by,'boat').play({key:'boat-a',startFrame:rint(0,7)}).setScale(0.5).setDepth(by).setFlipX(Math.random()<0.5);
      this.tweens.add({targets:bt, y:by+7, duration:rint(1700,2400), yoyo:true, repeat:-1, ease:'Sine.easeInOut'});      // cabeceo
      this.tweens.add({targets:bt, x:bx+rint(-30,30), duration:rint(6000,9000), yoyo:true, repeat:-1, ease:'Sine.easeInOut'}); // deriva
      boats++;
    }
    // muelle: busca una costa con agua al sur y tiende 3 tablones hacia el mar
    for(let tries=0, done=false; tries<300 && !done; tries++){ const x=rint(4,COLS-5), y=rint(4,ROWS-5);
      if(isLand(x,y) && !isLand(x,y+1) && !isLand(x,y+2)){
        for(let k=0;k<3;k++) this.add.image(x*T+T/2,(y+1+k)*T+T/2,'bridge').setOrigin(0.5,0.5).setScale(0.5,0.62).setDepth((y+1+k)*T);
        done=true;
      }
    }
  }

  // ---- plaza real + CALLES de arena (autotile) barrio→plaza ----
  const px=Math.floor(COLS/2), py=Math.floor(ROWS/2);
  const pkey=(x,y)=>x+','+y;
  const sand=new Set();                                     // plaza ∪ calles (una sola zona para que empalmen)
  const prx=4.0, pry=2.8, pph=Math.random()*6.28;           // plaza ORGÁNICA: elipse con borde ondulado, no un rectángulo
  for(let y=py-4;y<=py+4;y++)for(let x=px-6;x<=px+6;x++){ if(!isLand(x,y)) continue;
    const nx=(x-px)/prx, ny=(y-py)/pry, ang=Math.atan2(ny,nx), wob=0.16*Math.sin(ang*4+pph)+0.08*Math.sin(ang*3-pph);
    if(Math.hypot(nx,ny) < 1+wob) sand.add(pkey(x,y)); }
  const plazaOnly=new Set(sand);
  const inPlaza=(x,y)=>plazaOnly.has(pkey(x,y));
  // calles con CURVA suave (Bézier cuadrática), ~2 tiles de ancho — nada de ángulos de 90°
  for(const g of GUILDS){
    const ax=g.cx, ay=g.cy, bx=px, by=py, mx=(ax+bx)/2, my=(ay+by)/2;
    const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1;
    const bend=len*Phaser.Math.FloatBetween(0.12,0.28)*(Math.random()<0.5?1:-1);   // control perpendicular → arco
    const cx2=mx-dy/len*bend, cy2=my+dx/len*bend, wseed=Math.random()*6.28;
    const steps=Math.ceil(len*3);
    for(let i=0;i<=steps;i++){ const t=i/steps, it=1-t;
      const X=it*it*ax+2*it*t*cx2+t*t*bx, Y=it*it*ay+2*it*t*cy2+t*t*by;
      const dX=2*it*(cx2-ax)+2*t*(bx-cx2), dY=2*it*(cy2-ay)+2*t*(by-cy2), dl=Math.hypot(dX,dY)||1;
      const nx=-dY/dl, ny=dX/dl;                                                     // perpendicular local → ancho
      const width=0.5 + t*t*1.4 + 0.22*Math.sin(t*7+wseed);                          // se abre hacia la plaza + varía un poco (avenida)
      for(let w=-width; w<=width+1e-6; w+=0.5){ const x=Math.round(X+nx*w), y=Math.round(Y+ny*w); if(isLand(x,y)) sand.add(pkey(x,y)); }
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
  const stairSet=new Set();                                                                                     // una escalera transitable por cada tramo de acantilado
  for(let y=0;y<ROWS;y++){ let x=0; while(x<COLS){ if(cliff[y][x]){ let x2=x; while(x2<COLS&&cliff[y][x2]) x2++; stairSet.add(y*COLS+((x+x2-1)>>1)); x=x2; } else x++; } }
  makeStairsTex(this);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(elev[y][x]) rt.drawFrame('tmg',geIdx(x,y),x*T,y*T);        // cima de pasto elevada
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(cliff[y][x]&&!stairSet.has(y*COLS+x)) rt.drawFrame('tmg',gcIdx(x,y),x*T,y*T);   // cara de acantilado (salvo donde va la escalera)
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(cliff[y][x]){
    if(stairSet.has(y*COLS+x)){ this.add.image(x*T+T/2,y*T+T,'stairs').setOrigin(0.5,1).setDepth(y*T+2); }      // escalera: se puede subir por acá
    else { blocked[y][x]=true; this.add.rectangle(x*T+T/2,y*T+T-1,T,9,0x0a1508,0.20).setOrigin(0.5,1).setDepth(-19); }   // pared: colisión + sombra
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
    const wall=[];
    for(let y=g.cy-QRY;y<=g.cy+QRY;y++)for(let x=g.cx-QRX;x<=g.cx+QRX;x++){   // muralla (autotile por vecinos)
      const t=y===g.cy-QRY, b=y===g.cy+QRY, l=x===g.cx-QRX, r=x===g.cx+QRX;
      if(!(t||b||l||r)||!isLand(x,y)||inSand(x,y)||blocked[y][x]) continue;   // agua/arena/edificios = huecos (puertas)
      wall.push({x,y,t,b,l,r});
    }
    buildWall(wall);
    banner(g.cx, g.cy, g.color); placeTorch(g.cx+1, g.cy); placeTorch(g.cx-QRX+1, g.cy-QRY+1);
    // casa con AIRE alrededor: no se pegan entre sí ni contra la muralla (regla de espaciado del manifiesto)
    const casa=(kx,ky,tex,sc)=>{ if(!isLand(kx,ky)||blocked[ky][kx]||inSand(kx,ky)) return false;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) if(blocked[ky+dy]&&blocked[ky+dy][kx+dx]) return false;
      placeBuilding(tex,kx,ky,sc,{fw:1,fh:1}); return true; };
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
  for(let s=0;s<2;s++){                                    // palizada goblin: tramos cortos y rotos (no postes sueltos flotando)
    const horiz=Math.random()<0.5, len=rint(2,4), sx=gc.x+rint(-3,1), sy=gc.y+rint(-1,3), seg=[];
    for(let k=0;k<len;k++){ const x=sx+(horiz?k:0), y=sy+(horiz?0:k);
      if(isLand(x,y)&&!blocked[y][x]&&!inSand(x,y)) seg.push({x,y,t:false,b:false,l:false,r:false}); }
    if(seg.length>=2) buildWall(seg);
  }
  if(!KINGDOM) for(let i=0;i<4;i++) spawnMonster(pick(['torch','spear','shaman','tnt']), gc.x+rint(-3,2), gc.y+rint(-1,3), {tx:gc.x,ty:gc.y,r:4});

  // ---- ZONA SALVAJE (O): cueva, fieras y carroña ----
  const cv=nudgeToLand(4,py-2);
  scene.add.sprite(cv.x*T+T/2,cv.y*T+T,'cave').play('cave-a').setOrigin(0.5,1).setScale(0.9).setDepth(cv.y*T+T);
  if(blocked[cv.y]) blocked[cv.y][cv.x]=true;
  placeDecoImg('tdeco14',cv.x+1,cv.y+1,0.9); placeDecoImg('tdeco15',cv.x-1,cv.y,0.9);
  if(!KINGDOM){ spawnMonster('bear',cv.x+2,cv.y+1,{tx:cv.x,ty:cv.y,r:5}); spawnMonster('snake',cv.x+1,cv.y+2,{tx:cv.x,ty:cv.y,r:4}); spawnMonster('spider',cv.x+3,cv.y,{tx:cv.x,ty:cv.y,r:4}); }
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
  const corral=[];
  for(let y=fa.y+2;y<=fa.y+4;y++)for(let x=fa.x-2;x<=fa.x+2;x++){            // corral (autotile por vecinos, con puerta)
    const t=y===fa.y+2, b=y===fa.y+4, l=x===fa.x-2, r=x===fa.x+2;
    if(!(t||b||l||r)||!isLand(x,y)||blocked[y][x]||(x===fa.x&&t)) continue;
    corral.push({x,y,t,b,l,r}); }
  buildWall(corral);
  const pen={tx:fa.x,ty:fa.y+3,r:1};
  spawnSheep(fa.x-1,fa.y+3,pen); spawnSheep(fa.x+1,fa.y+3,pen);
  spawnPig(fa.x,fa.y+3,pen); spawnPig(fa.x+1,fa.y+4,pen);
  spawnPig(fa.x-4,fa.y,null); // un cerdo suelto

  // ================= ESCENARIO: composición de level-designer (no scatter aleatorio) =================
  // Orden del manifiesto: bosques como MASAS → afloramientos rocosos → recursos con lógica → deco de contexto.
  // Regla 70/30: se dejan praderas abiertas (descanso visual). El punto focal es la plaza; los barrios, focos secundarios.
  const bloquear=(x,y)=>{ if(blocked[y]) blocked[y][x]=true; };
  const treeCells=new Set(), treeKey=(x,y)=>x+','+y;
  const libre=(x,y)=>isLand(x,y)&&!blocked[y][x]&&!inSand(x,y);
  const lejosPlaza=(x,y)=>Math.hypot(x-px,y-py)>6;                              // no invadir el asentamiento principal
  const lejosBarrios=(x,y)=>GUILDS.every(g=>Math.hypot(x-g.cx,y-g.cy)>5);       // ni los barrios/gremios
  const canTree=(x,y)=>{ if(!libre(x,y)||treeCells.has(treeKey(x,y))) return false;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) if(treeCells.has(treeKey(x+dx,y+dy))) return false;   // sep. mínima: nunca copas pegadas ni filas
    return true; };
  const addTree=(x,y)=>{ placeTree(x,y); treeCells.add(treeKey(x,y)); };
  const decoAt=(k,x,y,sc)=>{ placeDecoImg(k,x,y,sc); };

  // 1) BOSQUES como masas: borde orgánico (ruido angular) + claro interno + variación de escala. Nada de árboles sueltos uniformes.
  const forestMass=(cx,cy,rad,dens)=>{
    const ph=Math.random()*6.28, clx=cx+rint(-1,1), cly=cy+rint(-1,1), clr=Math.max(0,rad-2.2);   // claro
    for(let y=Math.floor(cy-rad-1);y<=cy+rad+1;y++)for(let x=Math.floor(cx-rad-1);x<=cx+rad+1;x++){
      const ang=Math.atan2(y-cy,x-cx), edge=rad+0.9*Math.sin(ang*3+ph)+0.5*Math.sin(ang*6+ph*1.7);  // borde irregular
      const d=Math.hypot(x-cx,y-cy);
      if(d>edge || Math.hypot(x-clx,y-cly)<clr*(0.4+Math.random()*0.6)) continue;                    // fuera del blob o dentro del claro
      if(Math.random()>dens) continue;
      if(canTree(x,y)) addTree(x,y);
    }
  };
  const massAnchors=[]; let mtry=0;
  while(massAnchors.length<5 && mtry++<260){ const t=randFree(); if(!t) continue;
    if(!lejosPlaza(t.x,t.y)||!lejosBarrios(t.x,t.y)) continue;
    if(massAnchors.some(a=>Math.hypot(a.x-t.x,a.y-t.y)<7)) continue;            // masas separadas → praderas entre ellas
    massAnchors.push(t);
  }
  for(const a of massAnchors) forestMass(a.x,a.y,Phaser.Math.FloatBetween(3,4.6),0.66);
  for(let e=0;e<7;e++){ const t=randFree(); if(!t) continue;                    // cinturón de bosque que oculta el borde del mapa
    let costa=false; for(const[dx,dy]of[[2,0],[-2,0],[0,2],[0,-2]]) if(!isLand(t.x+dx,t.y+dy)) costa=true;
    if(costa&&lejosPlaza(t.x,t.y)&&lejosBarrios(t.x,t.y)) forestMass(t.x,t.y,Phaser.Math.FloatBetween(2,3),0.6);
  }

  // 2) AFLORAMIENTOS rocosos: roca grande + satélites, agrupados al pie de acantilados y en la mina (piedra junto a la piedra).
  const rockCluster=(cx,cy,n)=>{ let p=0,it=0;
    while(p<n && it++<n*7){ const x=cx+rint(-1,1), y=cy+rint(-1,1);
      if(!libre(x,y)) continue;
      decoAt('rock'+rint(1,4), x, y, p===0?Phaser.Math.FloatBetween(0.95,1.15):Phaser.Math.FloatBetween(0.55,0.82));
      bloquear(x,y); if(Math.random()<0.7) decoAt('tdeco'+pick([4,5,6]), x, y, Phaser.Math.FloatBetween(0.6,0.9)); p++;   // grava alrededor
    } };
  const cliffBases=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(cliff[y][x]&&libre(x,y+1)) cliffBases.push({x,y:y+1});
  Phaser.Utils.Array.Shuffle(cliffBases);
  for(let i=0;i<Math.min(5,cliffBases.length);i++) rockCluster(cliffBases[i].x,cliffBases[i].y,rint(3,5));
  let extraRock=0, rtry=0;                                                      // 2-3 afloramientos sueltos más (agrupados, nunca una roca sola)
  while(extraRock<3 && rtry++<80){ const t=randFree(); if(t&&lejosPlaza(t.x,t.y)){ rockCluster(t.x,t.y,rint(3,4)); extraRock++; } }
  // cimas rocosas: grava y algún peñasco sobre las mesetas → el relieve se lee como montaña, no como escalón pelado
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){ if(!elev[y][x]||blocked[y][x]||inSand(x,y)) continue;
    if(Math.random()<0.16){ decoAt('tdeco'+pick([4,5,6]),x,y,Phaser.Math.FloatBetween(0.6,0.95)); }
    else if(Math.random()<0.05){ decoAt('rock'+rint(1,4),x,y,Phaser.Math.FloatBetween(0.55,0.8)); bloquear(x,y); } }

  // 3) RECURSOS con lógica: el oro sólo junto a la mina (montaña); la madera vive en el bosque; la carne en las pasturas.
  for(let i=0;i<7;i++){ const x=gm.x+rint(-2,2), y=gm.y+rint(-1,2);
    if(libre(x,y)){ decoAt('goldstone'+rint(1,6),x,y,Phaser.Math.FloatBetween(0.5,0.7)); bloquear(x,y); } }

  // 4) DECO de CONTEXTO (refuerza el entorno, no lo satura): hongos/arbustos en el bosque, grava en la piedra, pasto en la pradera.
  const decoNear=(cells,opts,chance)=>{ for(const c of cells){ if(Math.random()>chance) continue;
    const x=c.x+pick([-1,0,1]), y=c.y+pick([-1,0,1]);
    if(libre(x,y)&&!treeCells.has(treeKey(x,y))) decoAt('tdeco'+pick(opts),x,y,Phaser.Math.FloatBetween(0.65,0.95)); } };
  const forestCells=[...treeCells].map(k=>{const[x,y]=k.split(',').map(Number);return {x,y};});
  decoNear(forestCells,[1,2,3],0.10);              // hongos entre los árboles
  decoNear(forestCells,[7,8,9],0.12);              // arbustos en el sotobosque
  // arbustos animados agrupados en los bordes del bosque (bultos, no filas)
  let clumps=0, ctry=0;
  while(clumps<6 && ctry++<120){ const seed=pick(forestCells); if(!seed) break;
    const bx=seed.x+rint(-2,2), by=seed.y+rint(-2,2);
    if(!libre(bx,by)||treeCells.has(treeKey(bx,by))) continue;
    const b='bush'+rint(1,4);
    scene.add.sprite(bx*T+T/2,by*T+T-4,b).play({key:b+'-a',startFrame:rint(0,7)}).setOrigin(0.5,1).setScale(Phaser.Math.FloatBetween(0.5,0.72)).setDepth(by*T+T-4);
    clumps++;
  }
  // pradera abierta: unas pocas matas de pasto y algún arbusto chico, esparcidas y sin repetir seguido
  let last=-1;
  for(let i=0;i<22;i++){ const t=randFree(); if(!t||!lejosPlaza(t.x,t.y)||treeCells.has(treeKey(t.x,t.y))) continue;
    let d; do{ d=pick([10,11,7,8]); }while(d===last); last=d;
    decoAt('tdeco'+d,t.x,t.y,Phaser.Math.FloatBetween(0.7,1)); }
  for(let i=0;i<20;i++){const t=randFree(); if(t&&libre(t.x,t.y))               // matojos sutiles del suelo (detalle, no bloquean)
    scene.add.image(t.x*T+T/2+rint(-18,18),t.y*T+T/2+rint(-14,14),'ground',pick([4,14,24])).setOrigin(0.5,0.6).setScale(Phaser.Math.FloatBetween(0.7,1.0)).setDepth(-19);}

  // 5) PASTURAS: rebaños agrupados en claros de pradera (no ovejas sueltas por todo el mapa) = sitios de carne.
  let flocks=0, ftry=0;
  while(flocks<3 && ftry++<120){ const t=randFree(); if(!t||!lejosPlaza(t.x,t.y)||treeCells.has(treeKey(t.x,t.y))) continue;
    for(let s=rint(2,3);s>0;s--){ const sx=t.x+rint(-1,1), sy=t.y+rint(-1,1);
      if(libre(sx,sy)){ spawnSheep(sx,sy); meatSpots.push({x:sx*T+T/2,y:sy*T+T/2}); } }
    flocks++;
  }

  // ---- casillas caminables ----
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++) if(isLand(x,y)&&!blocked[y][x]) walkTiles.push({x:x*T+T/2,y:y*T+T/2});

  // ---- población: guerreros, aldeanos, arqueros y monjes (en el reino no hay NPCs: sólo usuarios reales) ----
  if(!KINGDOM){
    for(let i=0;i<NPC_START;i++) spawnNpc(null, pick(POPMIX));                       // pobladores humanos (spawnNpc(null) ya elige sólo gremios humanos)
    GUILDS.filter(g=>g.kind!=='humano').forEach(g=>{ for(let i=0;i<10;i++) spawnNpc(g.id, null); });   // ciudadanos goblin/villano en su barrio
    const HUM=GUILDS.filter(g=>g.kind==='humano');
    for(const g of HUM){ spawnWorker(g.id,'waxe'); spawnWorker(g.id,'wpick'); }      // leñador y minero por facción humana
    spawnWorker(pick(HUM).id,'wgold'); spawnWorker(pick(HUM).id,'wgold');            // cargadores de oro
    spawnWorker(pick(HUM).id,'wmeat'); spawnWorker(pick(HUM).id,'wmeat');            // recolectores de carne (van a la pastura)
    refreshRoster(); poblarUsuarios();                                               // etiqueta unidades con nombres del roster (usuarios reales)
    for(let i=0;i<N_MONSTERS;i++){ const t=randFree(); if(t) spawnMonster(pick(ROAMERS),t.x,t.y); }
  }

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
  this.cameras.main.setBounds(-MAR,-MAR,WORLD_W+MAR*2,WORLD_H+MAR*2);   // deja ver el mar de relleno en pantallas anchas
  fitCamera(); this.scale.on('resize',fitCamera);

  // ---- lupa: rueda / pinch = zoom · arrastrar = mover · doble click = vista general (solo live) ----
  this.input.addPointer(1);   // 2º puntero para el pinch (mobile)
  if(!KINGDOM){
  this.input.on('wheel',(p,objs,dx,dy)=>{
    const cam=this.cameras.main;
    manualView=true; reticleLock(false);
    const z=Phaser.Math.Clamp(cam.zoom*(dy>0?0.87:1.15), baseZoom*0.85, 3.4);
    cam.setZoom(z);
    const wp=cam.getWorldPoint(p.x,p.y);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x,wp.x,0.3), Phaser.Math.Linear(cam.midPoint.y,wp.y,0.3));
  });
  let livePinch=0;
  this.input.on('pointermove',p=>{
    const cam=this.cameras.main, p1=this.input.pointer1, p2=this.input.pointer2;
    if(p1&&p2&&p1.isDown&&p2.isDown){                       // pinch: dos dedos = zoom, anclado al punto medio
      manualView=true; reticleLock(false);
      const d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y);
      if(livePinch>0 && d>0){
        const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2, before=cam.getWorldPoint(mx,my);
        cam.setZoom(Phaser.Math.Clamp(cam.zoom*(d/livePinch), baseZoom*0.85, 3.4));
        const after=cam.getWorldPoint(mx,my);
        cam.scrollX+=before.x-after.x; cam.scrollY+=before.y-after.y;
      }
      livePinch=d; return;
    }
    livePinch=0;
    if(!manualView||!p.isDown) return;
    cam.scrollX-=(p.x-p.prevPosition.x)/cam.zoom;
    cam.scrollY-=(p.y-p.prevPosition.y)/cam.zoom;
  });
  this.game.canvas.addEventListener('dblclick',()=>{ manualView=false; cameraBusy=false; fitCamera(); });
  }
  renderMarcador();                                  // el marcador ya se sembró; refresca por si la escena tardó
  this.time.addEvent({delay:rint(9000,16000),loop:true,callback:()=>{ if(!paused&&Math.random()<0.7) bandada(); }});   // bandadas cruzando el cielo
  if(KINGDOM){                                       // paredes físicas: cercas, acantilados, rocas y props no se pueden atravesar (hay que rodearlos)
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(blocked[y]&&blocked[y][x]){ const r=this.add.rectangle(x*T+T/2,y*T+T/2,T-6,T-6).setVisible(false);
        this.physics.add.existing(r,true); obstacles.add(r); }
    }
  }
  if(KINGDOM) startKingdom(this);                    // modo reino: crea el jugador, cámara que sigue, controles y selector
  else { kMM=$('kMinimap'); if(kMM&&kMM.getContext){ kMMx=kMM.getContext('2d'); kMM.classList.add('on'); } }   // live: minimapa igual que en el reino (facciones)
  { const b=$('liveBar'); if(b) b.style.width='100%'; const r=$('liveRunner'); if(r) r.style.left='100%'; }   // mapa listo: completa la barra
  const sp=$('liveSplash'); if(sp){ sp.classList.add('hide'); setTimeout(()=>{ if(sp) sp.style.display='none'; },700); }   // y oculta la pantalla de carga
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
  if(KINGDOM && obstacles){ const foot=scene.add.rectangle(x, y-12, 18, 14).setVisible(false);   // tronco sólido: en el reino el jugador lo rodea
    scene.physics.add.existing(foot,true); obstacles.add(foot); }
  treeSpots.push({x:x, y:y+T*0.6});
}
function banner(tx,ty,color){
  const x=tx*T+T/2, y=ty*T+T/2;
  scene.add.rectangle(x,y-4,3,26,0x4a3d2c).setDepth(y+40);
  const fl=scene.add.triangle(x+2,y-16,0,0,20,6,0,14,color).setOrigin(0,0).setDepth(y+40);
  fl.setStrokeStyle(1,0x120d09,0.6);
}
function placeTorch(tx,ty){                            // fogata: anillo de piedras + llama animada de Tiny Swords + glow
  const x=tx*T+T/2, y=ty*T+T-4;
  // anillo de piedritas alrededor del fuego para que se lea como fogata de verdad
  for(const[dx,dy]of [[-15,-1],[15,-2],[-9,5],[10,5],[0,7]]){
    if(Math.random()<0.22) continue;
    scene.add.image(x+dx,y+dy,'rock'+rint(1,4)).setOrigin(0.5,0.9).setScale(0.3+Math.random()*0.09).setDepth(y+dy-2).setFlipX(Math.random()<0.5);
  }
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
function spawnWorker(gid,job){                       // leñador/minero/cargador/cazador que patrulla sitio ↔ barrio
  const g=guildById[gid]||pick(GUILDS);
  const site = job==='waxe'  ? (pick(treeSpots)||gmPos)
             : job==='wmeat' ? (pick(meatSpots)||pick(treeSpots)||gmPos)
             :                  gmPos;
  if(!site) return null;
  const home={x:g.cx*T+T/2, y:g.cy*T+T/2};
  const n=spawnNpc(g.id,'pawn'); if(!n) return null;
  if(job==='wmeat'){ n.tipo='wmeat'; }              // cazador: usa el sprite de aldeano (no hay hoja propia de carne)
  else { n.tipo=job; n.animI=job+'_'+g.tex+'-i'; n.animR=job+'_'+g.tex+'-r';
    n.spr.setTexture(job+'_'+g.tex+'_i',0); n.spr.play(n.animI); }
  n.patrol=[site,home]; n.pIx=0; n.tx=site.x; n.ty=site.y;
  return n;
}
/* ===== trabajo visible: el aldeano llega al recurso, lo golpea y salen íconos de recurso ===== */
const WJOBS={ waxe:{icon:'res_wood',col:0xb5793a}, wpick:{icon:'res_gold',col:0xf0d564},
              wgold:{icon:'res_gold',col:0xf0d564}, wmeat:{icon:'res_meat',col:0xd06a52} };
function esTrabajador(n){ return !!(n && WJOBS[n.tipo]); }
function popRecurso(x,y,key,col){                     // ícono de recurso que flota hacia arriba (feedback de cosecha)
  const ic=scene.add.image(x,y,key).setDepth(99994).setScale(0.42).setAlpha(0);
  scene.tweens.add({targets:ic,alpha:1,y:y-8,duration:220,ease:'Back.easeOut'});
  scene.tweens.add({targets:ic,alpha:0,y:y-36,delay:520,duration:560,ease:'Quad.easeOut',onComplete:()=>ic.destroy()});
  if(col) burst(x,y,col,4,8);
}
function trabajarEnSitio(n){                          // golpes de trabajo con polvo + recurso; al terminar vuelve al barrio
  const w=WJOBS[n.tipo]; if(!w||n.dead) return;
  n.working=true; n.busy=true; if(n.spr.body) n.spr.body.setVelocity(0);
  if(n.animR) n.spr.play(n.animR,true);              // hoja de acción (hacha/pico/cosecha)
  let hits=rint(3,5);
  const golpe=()=>{ if(!n||n.dead||!n.working) return;
    dustPuff(n.spr.x, n.spr.y+6, 1, 0x8a6b45);
    popRecurso(n.spr.x+rint(-6,6), n.spr.y-24, w.icon, w.col);
    sfx('clash',0.10);
    if(--hits>0) scene.time.delayedCall(rint(520,780), golpe);
    else { n.working=false; n.busy=false; retarget(n); }   // carga lista → vuelve al barrio
  };
  scene.time.delayedCall(320, golpe);
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
function landAtPx(px,py){ const t=tileOf(px,py); return isIn(t.x,t.y)&&isLand(t.x,t.y); }   // sólo tierra (ignora props: los árboles se rodean por física)
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
  if(KINGDOM){ cam.setZoom(Phaser.Math.Clamp(Math.min(vw/1000,vh/560),0.85,1.5)); return; }   // reino: zoom fijo de paseo, la cámara sigue al jugador
  if(manualView) return;                                    // lupa activa: no recentrar
  if(!cameraBusy){cam.setZoom(baseZoom);cam.centerOn(baseCX,baseCY);}}
function cutToPos(x,y,hold){if(KINGDOM||cameraBusy||manualView)return;cameraBusy=true;const cam=scene.cameras.main,z=Math.min(Math.max(baseZoom*4.2,baseZoom+1.1),2.9);   // zoom más dramático
  cam.pan(x,y,600,'Sine.easeInOut'); cam.zoomTo(z,600,'Cubic.easeInOut'); reticleLock(true);
  scene.time.delayedCall(hold||3400,()=>{cam.pan(baseCX,baseCY,850,'Sine.easeInOut');cam.zoomTo(baseZoom,850,'Sine.easeInOut');reticleLock(false);hideLabels();ocultarDialogoGrande();
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

/* ===== nameplates de usuarios reales (roster): etiqueta persistente sobre la unidad ===== */
// Semilla para que la ciudad no se vea vacía al principio. Se reemplaza por el ranking real del backend (Render).
const SEED_USERS=['Rocky','BlackDuval','Aragorn','Creed','Pex','gamonoy','Kurt','Endless','Wilton-C','Bastianvoid','Heavenscape','Bonecrew'];
function localUser(){ try{ const s=JSON.parse(localStorage.getItem('aoa_session')||'null'); return s&&s.username; }catch(e){ return null; } }
let _rosterCache=null;                                  // roster traído del backend (si hay)
async function refreshRoster(){                         // COSTURA: si hay backend, trae el ranking real; si no, no hace nada
  const API=(window.AOA_API||'').replace(/\/$/,'');
  if(!API) return;
  try{ const r=await fetch(API+'/api/roster?limit=48');
    if(r.ok){ const j=await r.json(); if(Array.isArray(j)&&j.length) _rosterCache=j.map(e=>({name:e.name, rank:e.rank})); }
  }catch(e){}
}
function getRoster(){                                   // usuario local (destacado) + usuarios reales del backend + semilla de relleno
  const me=localUser(), out=[], seen=new Set();
  if(me){ out.push({name:me, me:true, rank:1}); seen.add(me); }
  if(_rosterCache) _rosterCache.forEach(e=>{ if(!seen.has(e.name)){ out.push(e); seen.add(e.name); } });   // reales primero
  SEED_USERS.forEach(n=>{ if(!seen.has(n)){ out.push({name:n, rank:out.length+1, seed:true}); seen.add(n); } });   // relleno: que no se vea vacía
  return out;
}
function nameplate(n,entry){
  if(!n||n.dead||!n.spr||n._plate) return;
  n.user=entry.name;
  const crown = entry.rank===1 ? ' 👑' : '';
  const box=scene.add.container(n.spr.x,n.spr.y-44).setDepth(100000);
  const t=scene.add.text(5,0,entry.name+crown,{fontFamily:'"Cinzel",Georgia,serif',fontStyle:'700',fontSize:'13px',
    color: entry.me?'#f0d564':'#f4ecd6', stroke:'#120d09',strokeThickness:3.5}).setOrigin(0.5,0.5).setResolution(3);
  const w=Math.ceil(t.width)+22;
  const bg=scene.add.graphics();
  bg.fillStyle(0x140f0a,0.82); bg.lineStyle(1, entry.me?0xf0d564:0xc9a227, 0.7);
  bg.fillRoundedRect(-w/2,-10,w,20,6); bg.strokeRoundedRect(-w/2,-10,w,20,6);
  const dotCol=(guildById[n.guild]&&guildById[n.guild].color)||0xc9a227;
  const dot=scene.add.circle(-w/2+9,0,3.2,dotCol);
  box.add([bg,dot,t]); n._plate=box; box._pw=w;   // ancho para el de-clutter
}
function killPlate(n){ if(n&&n._plate){ n._plate.destroy(); n._plate=null; n.user=null; } }
// de-clutter: cuando dos nameplates se pisan, se muestra sólo el de adelante (unidad más al frente). Evita el amontonamiento ilegible.
function declutterPlates(){
  if(!scene||!npcs.length) return;
  const cam=scene.cameras.main, wv=cam.worldView, z=cam.zoom, vis=[];
  for(const n of npcs){ if(n.dead||!n.spr||!n._plate||!n._plate.visible) continue;
    vis.push({p:n._plate, sx:(n.spr.x-wv.x)*z, sy:(n.spr.y-44-wv.y)*z, w:(n._plate._pw||60), y:n.spr.y}); }
  if(vis.length<2) return;
  vis.sort((a,b)=>b.y-a.y);                                   // la de adelante (mayor y) tiene prioridad
  const kept=[];
  for(const it of vis){
    let tapa=false;
    for(const k of kept){ if(Math.abs(it.sx-k.sx) < (it.w+k.w)/2*0.9 && Math.abs(it.sy-k.sy) < 19){ tapa=true; break; } }
    if(tapa) it.p.setVisible(false); else kept.push(it);
  }
}
function poblarUsuarios(){                              // reclama unidades con nombres del roster (idempotente: la ciudad se va llenando)
  if(!scene) return;
  const roster=getRoster(); if(!roster.length) return;
  const claimed=new Set(npcs.filter(n=>n.user).map(n=>n.user));
  const libres=livingNpcs().filter(n=>!n.user&&n.spr);          // unidades sin nombre = candidatas a reclamar
  for(const e of roster){
    if(claimed.has(e.name)) continue;
    const n=libres.pop(); if(!n) break;
    nameplate(n,e); claimed.add(e.name);
  }
}

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
function boom(x,y,esc){ const e=scene.add.sprite(x,y,'pfx_boom').setDepth(99999).setScale((esc||1)*1.0);   // explosión real (pfx_boom)
  e.play('pfxboom'); e.once('animationcomplete',()=>e.destroy()); }
function pfxDust(x,y,esc){ const d=scene.add.sprite(x,y,'pfx_dust').setDepth(99998).setScale((esc||1)*1.1).play('pfxdust');   // nube de polvo real
  d.once('animationcomplete',()=>d.destroy()); }
function fuegoFx(x,y,ms){ const fr=scene.add.sprite(x,y,'pfx_fire').setOrigin(0.5,0.9).setDepth(99997).setScale(1.0).play('pfxfire');   // ráfaga de fuego (loop corto)
  scene.time.delayedCall(ms||900,()=>scene.tweens.add({targets:fr,alpha:0,duration:300,onComplete:()=>fr.destroy()})); return fr; }
function playFx(kind,x,y){const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(kind==='fire'){ boom(x,y,1.2); fuegoFx(x,y-6,1100); pfxDust(x,y-14,1.1); if(!rm)scene.cameras.main.shake(340,0.007); }
  else if(kind==='clash'){ ring(x,y,0xffffff); pfxDust(x,y-4,0.9); burst(x,y,0xd64545,10,8); scene.cameras.main.flash(120,229,220,180); }
  else if(kind==='ring'){ ring(x,y,0xc9a227); burst(x,y-6,0xc9a227,12,12); }
  else if(kind==='confetti'){ [0xd64545,0x4a90c2,0x5fa55a,0x9b6fce,0xc9a227].forEach(c=>burst(x,y-6,c,6,16)); }}

/* ===== consecuencias persistentes ===== */
function ruinBuilding(b){
  if(!b||b.ruined)return; b.ruined=true;
  b.spr.setTint(0x5a4438);
  scene.add.ellipse(b.x,b.y-4,b.spr.displayWidth*0.6,24,0x120b06,0.5).setDepth(b.y-1);
  const f=scene.add.sprite(b.x,b.y-8,'pfx_fire').play('pfxfire').setOrigin(0.5,0.9).setScale(1.25).setDepth(b.y+1);   // fuego real persistente (pfx_fire)
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
  if(!n||n.dead||n.sheep||n.monster)return; n.dead=true; killPlate(n);
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
  if(!n||n.dead)return; n.dead=true; killPlate(n); npcs=npcs.filter(x=>x!==n);
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
    if(!focus){ showLabel(a); scene.time.delayedCall(650,()=>mostrarDialogoGrande(a,lineaDe(a))); }
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
      if(esTrabajador(n) && !n.working && n.pIx===0){ trabajarEnSitio(n); continue; }   // llegó al recurso: lo trabaja a la vista
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
    if(n._plate){ const cam=scene.cameras.main, wv=cam.worldView;   // nameplate persistente: sigue a la unidad, tamaño constante en pantalla
      const vis=wv.contains(n.spr.x,n.spr.y); n._plate.setVisible(vis);
      if(vis){ n._plate.x=n.spr.x; n._plate.y=n.spr.y-44; n._plate.setScale(1/cam.zoom); n._plate.setDepth(n.spr.y+40); } }
  }
  declutterPlates();
  if(KINGDOM){ movePlayer(delta); kUpdateOthers(); kEnemyUpdate(delta); kCarryUpdate();   // reino: usuario + otros + enemigos + acarreo de recursos
    if(atkCd>0) atkCd-=delta;
    if(player&&player._workT>0) player._workT-=delta;
    if(kReady&&kSpaceKey&&Phaser.Input.Keyboard.JustDown(kSpaceKey)) playerJump();   // Espacio = salto
    if(kReady){ kMMacc+=delta; if(kMMacc>=90){ kMMacc=0; try{ kMinimap(); }catch(e){} }
      kXpAccrue(delta); }                                  // acumula tiempo de juego → XP/nivel
  } else if(kMMx){ kMMacc+=delta; if(kMMacc>=110){ kMMacc=0; try{ kMinimap(); }catch(e){} } }   // live: minimapa de facciones
  if(paused) return;

  clkAcc+=delta*m;
  if(clkAcc>800){ worldMin+=6*(clkAcc/1000); clkAcc=0;
    const d=Math.floor(worldMin/1440)+1, mm=Math.floor(worldMin%1440);
    setClock(`${L('Día','Day')} ${d} · ${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`);
    const [col,al]=timeTint(worldMin); if(nightRect) nightRect.setFillStyle(col,al);
  }

  evAcc+=delta*m;                                         // eventos: la isla sigue viva (en el reino, sin crónica ni corte de cámara)
  if(evAcc>=evNext){ evAcc=0; evNext=rint(2400,4200); fireEvent(); }

  dlgAcc+=delta*m;                                        // burbujas de diálogo (más seguido y con humor)
  if(dlgAcc>=dlgNext){ dlgAcc=0; dlgNext=rint(2200,4600); decirAlgo(); }

  escAcc+=delta*m;                                        // escenas absurdas: discusiones, peleas, chapuzones
  if(escAcc>=escNext){ escAcc=0; escNext=rint(5000,10000); escenaAbsurda(); }

  if(KINGDOM) return;                                     // el reino no tiene espectadores, director de cámara, carreras ni roster

  pAcc+=delta; if(pAcc>=8000){ pAcc=0; pingViewers(); }                   // heartbeat de presencia
  vAcc+=delta;
  if(viewersReal!=null){ setViewers(viewersReal); }                       // espectadores reales del backend
  else { if(vAcc>1500){ vAcc=0; tViewers+=rint(-40,55); tViewers+=(1180-tViewers)*0.04; tViewers=Math.max(600,tViewers); }
    viewers+=(tViewers-viewers)*0.08; setViewers(viewers); }              // sin backend: simulado

  camAcc+=delta*m;                                        // director de cámara: cortes con zoom aunque no haya evento
  if(camAcc>=camNext){ camAcc=0; camNext=rint(7000,12000); directorCamara(); }

  carAcc+=delta*m;                                        // carrera de aldeanos (con zoom y festejo del ganador)
  if(carAcc>=carNext){ carAcc=0; carNext=rint(16000,28000); carreraNpcs(); }

  usrAcc+=delta*m;                                        // roster: la ciudad se va llenando de usuarios reales
  if(usrAcc>=usrNext){ usrAcc=0; usrNext=8000; poblarUsuarios(); }

  rosAcc+=delta*m;                                        // refresca el ranking del backend (si está configurado)
  if(rosAcc>=rosNext){ rosAcc=0; refreshRoster(); }
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
bind('btnMenu',e=>{ if(e) e.stopPropagation(); const m=$('liveMenu'); if(m) m.classList.toggle('on'); });
document.addEventListener('click',e=>{ const m=$('liveMenu'), b=$('btnMenu'); if(m&&m.classList.contains('on')&&!m.contains(e.target)&&(!b||!b.contains(e.target))) m.classList.remove('on'); });
if(!KINGDOM) pingViewers();   // primer heartbeat al entrar (el reino no cuenta como espectador)

// re-aplica el idioma a todo el chrome estático + dinámico
function aplicarIdioma(){
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-es]').forEach(el=>{ el.textContent = LANG==='en'? (el.getAttribute('data-en')||el.textContent) : el.getAttribute('data-es'); });
  const bl=$('btnLang'); if(bl) bl.textContent = LANG==='en'?'ESPAÑOL':'ENGLISH';
  const bs=$('btnSound'); if(bs) bs.textContent = soundOn?L('SONIDO ✓','SOUND ✓'):L('SONIDO','SOUND');
  const bp=$('btnPause'); if(bp) bp.textContent = paused?L('SEGUIR','RESUME'):L('PAUSA','PAUSE');
  { const d=Math.floor(worldMin/1440)+1, mm=Math.floor(worldMin%1440);   // reloj en el idioma actual
    setClock(`${L('Día','Day')} ${d} · ${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`); }
  renderMarcador();
  if(typeof feedEl!=='undefined'&&feedEl) feedEl.innerHTML='';                 // reinicia la crónica en el nuevo idioma
  seedFeed();
  if(devEstado) devRender();                                                   // el cartel del dev también cambia de idioma
}

/* ===== comando de consola: cartel de estado del dev (siempre con el link de la beta) ===== */
const DEV_PRESETS={
  durmiendo:  ['🌙 El dev está durmiendo',   '🌙 The dev is sleeping'],
  trabajando: ['⚒️ El dev está trabajando',  '⚒️ The dev is working'],
  programando:['💻 El dev está programando', '💻 The dev is coding'],
  comiendo:   ['🍖 El dev está comiendo',    '🍖 The dev is eating'],
  stream:     ['🎥 El dev está transmitiendo','🎥 The dev is live'],
  ausente:    ['🚪 El dev vuelve en un rato', '🚪 The dev is away, back soon'],
};
let devEstado=null, devCycle=null, devOnceT=null;
function devRender(){
  if(!devEstado) return;
  const p=DEV_PRESETS[devEstado], msg = p ? L(p[0],p[1]) : ('📣 '+devEstado);
  const ds=$('devStatus'), db=$('devBeta');
  if(ds) ds.textContent=msg;
  if(db) db.innerHTML=L('🎮 Los holders pueden probar la beta en ','🎮 Holders can test the beta at ')+'<b>ageoffomo.xyz</b>';
}
function devStop(){ if(devCycle){ clearInterval(devCycle); devCycle=null; } if(devOnceT){ clearTimeout(devOnceT); devOnceT=null; } }
function devMsg(key){ return 'dev: '+(($('devStatus')&&$('devStatus').textContent)||key); }
window.dev=function(estado, opts){
  const bar=$('devbar'); if(!bar) return 'sin cartel';
  const key=(estado==null?'':String(estado)).toLowerCase().trim();
  devStop();
  if(key===''||key==='off'||key==='ocultar'||key==='hide'){ devEstado=null; bar.classList.remove('on'); return 'cartel oculto'; }
  devEstado = DEV_PRESETS[key] ? key : estado;                                 // preset conocido o texto libre
  devRender();
  // opts: número = mostrar UNA vez ese tiempo · {steady:true} = fijo · {show,hide} = ciclo a medida · sin opts = INTERMITENTE (aparece por momentos)
  if(typeof opts==='number' && opts>0){ bar.classList.add('on'); devOnceT=setTimeout(()=>{ bar.classList.remove('on'); devEstado=null; }, opts); return devMsg(key); }
  if(opts && opts.steady){ bar.classList.add('on'); return devMsg(key); }
  const showMs=(opts&&opts.show)||16000, hideMs=(opts&&opts.hide)||5000;      // por defecto: 16s visible / 5s oculto, en loop (aparece más tiempo, sale unos segundos)
  const tick=()=>{ if(!devEstado) return; bar.classList.add('on'); setTimeout(()=>{ if(devEstado&&devCycle) bar.classList.remove('on'); }, showMs); };
  tick(); devCycle=setInterval(tick, showMs+hideMs);
  return devMsg(key);
};
dev.durmiendo=()=>dev('durmiendo'); dev.trabajando=()=>dev('trabajando'); dev.off=()=>dev('off');
dev.fijo=(e)=>dev(e,{steady:true});                                           // deja el cartel fijo (no intermitente)
dev.help=function(){
  console.log('%c⚙ ESTADO DEL DEV — cartel del stream','color:#f0d564;font-weight:bold;font-size:13px');
  console.log("dev('durmiendo' | 'trabajando' | 'programando' | 'comiendo' | 'stream' | 'ausente')   // aparece por momentos");
  console.log("dev('texto libre')                     // cualquier mensaje");
  console.log("dev('trabajando', 8000)                // lo muestra UNA vez, 8s");
  console.log("dev('trabajando', {show:6000,hide:20000})  // ciclo a medida (ms)");
  console.log("dev.fijo('trabajando')                 // fijo, sin parpadear");
  console.log("dev.off()                              // apaga el cartel");
  console.log('Siempre acompaña con: 🎮 los holders pueden probar la beta en ageoffomo.xyz');
  return Object.keys(DEV_PRESETS);
};
try{ console.log('%c⚙ Comando disponible: %cdev.help()','color:#c9a227','color:#f0d564;font-weight:bold'); }catch(e){}

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

/* ===== MODO REINO: el usuario elige nombre + unidad y camina por la isla ===== */
let player=null, kReady=false, kUnitList=null, kSel=null, kCursors=null, kKeys=null, kNear=null, kSpaceKey=null, kTestNpc=null;
// enemigos salvajes del reino: al derrotarlos se desbloquea su carta en el PvP
const KENEMY_DEF=[
  {key:'lizard', card:'lizard', es:'Lagarto', en:'Lizard', fw:192, idle:7, run:6, sc:0.55, hp:3},
  {key:'panda',  card:'panda',  es:'Panda',   en:'Panda',  fw:256, idle:10, run:6, sc:0.5,  hp:5},
  {key:'turtle', card:'turtle', es:'Tortuga', en:'Turtle', fw:320, idle:10, run:7, sc:0.42, hp:6},
];
let kEnemies=[];
const KSPEED=115;                                        // velocidad de paseo del jugador (px/s)
const MSG_MAX=60;                                        // límite de caracteres del mensaje sobre la cabeza
const KCOLLAB={blue:'Blue',red:'Red',purple:'Purple',yellow:'Yellow'};
function kingdomUnits(){                                 // todas las unidades con animación de caminar
  const U=[];
  for(const c of COLORES) U.push({key:'pawn_'+c,cat:L('Aldeanos','Villagers'),label:L('Aldeano','Villager')+' '+KCOLLAB[c],tex:'pawn_'+c,idle:'pawn_'+c+'-idle',run:'pawn_'+c+'-run',scale:PSCALE,oy:0.72,body:{w:30,h:20,ox:81,oy:118}});
  for(const c of COLORES) U.push({key:'warrior_'+c,cat:L('Guerreros','Warriors'),label:L('Guerrero','Warrior')+' '+KCOLLAB[c],tex:'warrior_'+c,idle:'warrior_'+c+'-idleF',run:'warrior_'+c+'-runF',runB:'warrior_'+c+'-runB',idleB:'warrior_'+c+'-idleB',scale:WSCALE,oy:0.95,body:{w:26,h:20,ox:42,oy:68}});
  for(const c of COLORES) U.push({key:'archer_'+c,cat:L('Arqueros','Archers'),label:L('Arquero','Archer')+' '+KCOLLAB[c],tex:'archer_'+c+'_i',idle:'archer_'+c+'-i',run:'archer_'+c+'-r',scale:PSCALE,oy:0.72,body:{w:30,h:20,ox:81,oy:118}});
  for(const c of COLORES) U.push({key:'monk_'+c,cat:L('Monjes','Monks'),label:L('Monje','Monk')+' '+KCOLLAB[c],tex:'monk_'+c+'_i',idle:'monk_'+c+'-i',run:'monk_'+c+'-r',scale:PSCALE,oy:0.72,body:{w:30,h:20,ox:81,oy:118}});
  const creES={bear:'Oso',gnoll:'Gnoll',thief:'Ladrón',snake:'Víbora',spider:'Araña',skull:'No-muerto',gnome:'Gnomo',torch:'Goblin',spear:'Lancero',shaman:'Chamán',tnt:'Goblin TNT',pigrider:'Jinete Cerdo'};
  const creEN={bear:'Bear',gnoll:'Gnoll',thief:'Thief',snake:'Snake',spider:'Spider',skull:'Undead',gnome:'Gnome',torch:'Goblin',spear:'Spearman',shaman:'Shaman',tnt:'TNT Goblin',pigrider:'Pig Rider'};
  for(const k in creEN){ const d=MONDEF[k]; if(!d) continue; const bw=d.fw===256?36:30;
    U.push({key:k,cat:L('Criaturas','Creatures'),label:L(creES[k],creEN[k]),tex:d.ti,idle:d.ai,run:d.ar,scale:d.sc,oy:0.72,body:{w:bw,h:22,ox:(d.fw-bw)/2,oy:d.fw*0.72-24}}); }
  U.push({key:'mino',cat:L('Criaturas','Creatures'),label:L('Minotauro','Minotaur'),tex:'minotaur_walk',idle:'mino-walk',run:'mino-walk',scale:0.5,oy:0.72,body:{w:40,h:24,ox:140,oy:320*0.72-28}});
  U.push({key:'pig',cat:L('Criaturas','Creatures'),label:L('Cerdo','Pig'),tex:'pig_idle',idle:'cerdo-idle',run:'cerdo-run',scale:0.55,oy:0.72,body:{w:30,h:20,ox:81,oy:118}});
  return U;
}
function makePlayerSprite(u){
  let px,py,plate=null,nm='';
  if(player&&player.spr){ px=player.spr.x; py=player.spr.y; plate=player._plate; nm=player.name||''; player.spr.destroy(); }
  else { const sp0=nearWalkable(Math.floor(COLS/2),Math.floor(ROWS/2)); px=sp0.x*T+T/2; py=sp0.y*T+T/2; }
  const s=scene.physics.add.sprite(px,py,u.tex,0).setOrigin(0.5,u.oy).setScale(u.scale);
  s.body.setSize(u.body.w,u.body.h).setOffset(u.body.ox,u.body.oy);
  s.setCollideWorldBounds(true); npcGroup.add(s); s.setDepth(s.y); s.play(u.idle);
  player={spr:s,animI:u.idle,animR:u.run,animRB:u.runB||null,animIB:u.idleB||null,faceUp:false,faceLeft:false,path:null,spd:KSPEED,_plate:plate,guild:null,name:nm};
  scene.cameras.main.startFollow(s,true,0.12,0.12);
  scene.cameras.main.setFollowOffset(0, kReady?0:130);   // mientras elige, corre la vista para que la unidad se vea arriba del panel
}
function syncPlate(){ if(!player||!scene) return; const iz=1/scene.cameras.main.zoom;
  if(player._plate){ player._plate.x=player.spr.x; player._plate.y=player.spr.y-46; player._plate.setScale(iz); player._plate.setDepth(player.spr.y+60); }
  if(player._say){ player._say.x=player.spr.x; player._say.y=player.spr.y-(player._plate?66:48); player._say.setScale(iz); player._say.setDepth(player.spr.y+70); } }
function showSay(obj,txt){                                // globo de mensaje sobre la cabeza (jugador o usuario remoto)
  if(!obj||!obj.spr||!scene) return;
  txt=(''+txt).trim().slice(0,MSG_MAX); if(!txt) return;
  if(obj._sayEv){ obj._sayEv.remove(false); obj._sayEv=null; }
  if(obj._say){ obj._say.destroy(); obj._say=null; }
  const w=Math.min(250,46+txt.length*6.4);
  const box=scene.add.container(obj.spr.x,obj.spr.y-66).setDepth(100003);
  const bg=scene.add.graphics(); bg.fillStyle(0x14100b,0.95); bg.lineStyle(1.5,0xf0d564,0.9);
  bg.fillRoundedRect(-w/2,-26,w,32,7); bg.strokeRoundedRect(-w/2,-26,w,32,7);
  bg.fillStyle(0x14100b,0.95); bg.fillTriangle(-5,5,5,5,0,13);
  const t=scene.add.text(0,-10,txt,{fontFamily:'"Cinzel",Georgia,serif',fontStyle:'600',fontSize:'13.5px',color:'#f6efdd',align:'center',wordWrap:{width:w-14}}).setOrigin(0.5,0.5).setResolution(3);
  box.add([bg,t]); box.setScale(1/scene.cameras.main.zoom); obj._say=box;
  obj._sayEv=scene.time.delayedCall(6000,()=>{ if(obj._say){ scene.tweens.add({targets:obj._say,alpha:0,duration:400,onComplete:()=>{ if(obj._say){obj._say.destroy();obj._say=null;} }}); } });
}
function playerSay(txt){                                  // el jugador escribe: se muestra local y se envía a los demás
  txt=(''+txt).trim().slice(0,MSG_MAX); if(!txt||!player) return;
  showSay(player,txt); syncPlate();
  if(ws&&ws.readyState===1){ try{ ws.send(JSON.stringify({t:'say',msg:txt})); }catch(e){} }
}
function kUpdateNear(){                                   // ¿el jugador está cerca de OTRO usuario real (o del NPC de práctica)? habilita PvP
  kNear=null;
  if(player&&player.spr){ let bd=80; for(const id in kOthers){ const o=kOthers[id]; if(!o.spr) continue;
      const d=Math.hypot(o.spr.x-player.spr.x,o.spr.y-player.spr.y); if(d<bd){ bd=d; kNear=o; } }
    if(kTestNpc&&kTestNpc.spr){ const d=Math.hypot(kTestNpc.spr.x-player.spr.x,kTestNpc.spr.y-player.spr.y); if(d<bd){ bd=d; kNear=kTestNpc; } } }
  const pv=$('kPvpBtn'); if(pv){ pv.style.display=(kReady&&kNear)?'inline-flex':'none';
    if(kNear){ const nm=$('kPvpName'); if(nm) nm.textContent=kNear.name||''; } }
}
/* --- presencia en tiempo real: otros usuarios (WebSocket) --- */
let ws=null, myId=null, wsPosAcc=0; const kOthers={};
function kWsUrl(){ const api=(window.AOA_API||'').replace(/\/$/,''); return api?api.replace(/^http/,'ws')+'/ws/kingdom':null; }
function kUnitByKey(key){ const l=kUnitList||kingdomUnits(); return l.find(u=>u.key===key)||l[0]; }
function kSpawnOther(id,name,unit,x,y){
  if(!scene||kOthers[id]) return; const u=kUnitByKey(unit);
  const s=scene.physics.add.sprite(x,y,u.tex,0).setOrigin(0.5,u.oy).setScale(u.scale).setDepth(y); s.play(u.idle);
  const o={id,spr:s,u,tx:x,ty:y,name:name||'',flip:false,moving:false,_plate:null,_say:null,_sayEv:null,guild:null};
  kOthers[id]=o; nameplate(o,{name:o.name,me:false,rank:0});
}
function kRemoveOther(id){ const o=kOthers[id]; if(!o) return;
  if(o._sayEv) o._sayEv.remove(false); if(o._say) o._say.destroy(); if(o._plate) o._plate.destroy(); if(o.spr) o.spr.destroy(); delete kOthers[id]; }
function kUpdateOthers(){
  if(!scene) return; const iz=1/scene.cameras.main.zoom;
  for(const id in kOthers){ const o=kOthers[id]; if(!o.spr) continue;
    o.spr.x+=(o.tx-o.spr.x)*0.25; o.spr.y+=(o.ty-o.spr.y)*0.25;
    o.spr.play(o.moving?o.u.run:o.u.idle,true); o.spr.setFlipX(!!o.flip); o.spr.setDepth(o.spr.y);
    if(o._plate){ o._plate.x=o.spr.x; o._plate.y=o.spr.y-46; o._plate.setScale(iz); o._plate.setDepth(o.spr.y+60); }
    if(o._say){ o._say.x=o.spr.x; o._say.y=o.spr.y-(o._plate?66:48); o._say.setScale(iz); o._say.setDepth(o.spr.y+70); }
  }
}
function kOnMsg(d){
  if(!d||!d.t) return;
  if(d.t==='welcome'){ myId=d.id; (d.players||[]).forEach(p=>{ if(p.id!==myId) kSpawnOther(p.id,p.name,p.unit,p.x,p.y); }); }
  else if(d.t==='join'){ if(d.id!==myId) kSpawnOther(d.id,d.name,d.unit,d.x,d.y); }
  else if(d.t==='pos'){ const o=kOthers[d.id]; if(o){ o.tx=d.x; o.ty=d.y; o.flip=!!d.f; o.moving=!!d.m; } }
  else if(d.t==='say'){ const o=kOthers[d.id]; if(o) showSay(o,d.msg); }
  else if(d.t==='leave'){ kRemoveOther(d.id); }
  else if(d.t==='chal'){ kChalPrompt(d.from, d.name); }                          // te desafían a un duelo
  else if(d.t==='chalno'){ toast((d.name||'?')+L(' rechazó el duelo.',' declined the duel.')); }
  else if(d.t==='duel'){ location.href='/pvp?duel='+encodeURIComponent(d.room)+'&role='+d.role+'&foe='+encodeURIComponent(d.foe||''); }
}
function kConnect(){                                      // conecta al reino en vivo (si hay backend); sin backend, jugás solo
  const url=kWsUrl(); if(!url||!('WebSocket'in window)) return;
  try{ ws=new WebSocket(url); }catch(e){ ws=null; return; }
  ws.onopen=()=>{ try{ ws.send(JSON.stringify({t:'join',name:player.name,unit:kSel.key,x:Math.round(player.spr.x),y:Math.round(player.spr.y)})); }catch(e){} };
  ws.onmessage=ev=>{ let d; try{ d=JSON.parse(ev.data); }catch(e){ return; } kOnMsg(d); };
  ws.onclose=()=>{ ws=null; for(const id in kOthers) kRemoveOther(id); };
  ws.onerror=()=>{};
}
function movePlayer(delta){
  if(!player||!player.spr||!player.spr.body) return;
  const b=player.spr.body, spd=player.spd;
  if(!kReady||paused){ b.setVelocity(0); syncPlate(); return; }
  if(player._jumping){ if(b.enable) b.setVelocity(0); syncPlate(); kUpdateNear(); return; }   // durante el salto la unidad queda quieta
  if(player._workT>0){ b.setVelocity(0); syncPlate(); kUpdateNear(); return; }               // mientras pica/corta queda quieto (sin pisar la anim de trabajo)
  const typing=document.activeElement&&/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);   // no mover mientras se escribe
  let ix=0,iy=0;
  if(!typing&&kCursors){ if(kCursors.left.isDown)ix--; if(kCursors.right.isDown)ix++; if(kCursors.up.isDown)iy--; if(kCursors.down.isDown)iy++; }
  if(!typing&&kKeys){ if(kKeys.A.isDown)ix--; if(kKeys.D.isDown)ix++; if(kKeys.W.isDown)iy--; if(kKeys.S.isDown)iy++; }
  let vx=0,vy=0;
  if(ix||iy){                                            // teclado / WASD: control directo
    player.path=null; const mag=Math.hypot(ix,iy)||1; vx=ix/mag*spd; vy=iy/mag*spd;
    if(vx&&!landAtPx(player.spr.x+Math.sign(vx)*18, player.spr.y+10)) vx=0;   // no pisar agua (los árboles se rodean por colisión física)
    if(vy&&!landAtPx(player.spr.x, player.spr.y+10+Math.sign(vy)*18)) vy=0;
  } else if(player.path&&player.path.length){             // tap / click: seguir la ruta (BFS)
    const p=player.path[0], dx=p.x-player.spr.x, dy=p.y-player.spr.y, d=Math.hypot(dx,dy);
    if(d<8){ player.path.shift(); } else { vx=dx/d*spd; vy=dy/d*spd; }
  }
  b.setVelocity(vx,vy);
  const moving=Math.abs(vx)>2||Math.abs(vy)>2, ca=kCarryAnim();   // si el aldeano carga, usa la pose con el recurso en las manos
  if(moving){
    player.faceUp=(Math.abs(vy)>Math.abs(vx))&&vy<0;
    player.spr.play(ca?ca.r:((player.faceUp&&player.animRB)?player.animRB:player.animR),true);
    if(Math.abs(vx)>2){ player.faceLeft=vx<0; player.spr.setFlipX(player.faceLeft); }
  } else {
    player.spr.play(ca?ca.i:((player.faceUp&&player.animIB)?player.animIB:player.animI),true);
    player.spr.setFlipX(!!player.faceLeft);
  }
  player.spr.setDepth(player.spr.y); syncPlate(); kUpdateNear();
  wsPosAcc+=delta;                                        // avisa la posición a los demás ~8/s
  if(ws&&ws.readyState===1&&wsPosAcc>120){ wsPosAcc=0; try{ ws.send(JSON.stringify({t:'pos',x:Math.round(player.spr.x),y:Math.round(player.spr.y),f:player.faceLeft,m:moving})); }catch(e){} }
}
/* --- golpe (click) y salto (Espacio): sin sheets de ataque, se fingen con un tween + arco de tajo --- */
let atkCd=0;
function playerAttack(){
  if(!kReady||!player||!player.spr||atkCd>0||player._jumping||player._workT>0) return;
  const s=player.spr, dir=player.faceLeft?-1:1; s.setFlipX(player.faceLeft);
  const m=(kSel&&kSel.key||'').match(/^(warrior|archer|monk|pawn)_(blue|red|purple|yellow)$/);
  if(m && m[1]==='pawn'){                                        // ALDEANO: trabaja (pica/corta) a su tamaño, no pelea con el pico en el aire
    const c=m[2]; if(player.carry) return;                       // si ya carga algo, no trabaja
    const nearTree=treeSpots.some(t=>Math.hypot(t.x-s.x,(t.y-T*0.6)-s.y)<74);
    const tool=(nearTree&&scene.anims.exists('chop_'+c+'-a'))?('chop_'+c):('atk_pawn_'+c);   // hacha cerca de árbol, si no pico
    if(scene.anims.exists(tool+'-a')){ atkCd=580; player._workT=580; s.play(tool+'-a',true); sfx('door',0.28); }
    scene.time.delayedCall(300,()=>{ kHitEnemies(); kPickResource(); });   // el golpe/recolección conecta a mitad del gesto
    return;
  }
  scene.time.delayedCall(120, kHitEnemies);               // el golpe daña a los enemigos cercanos al frente
  const akey=m?('atk_'+m[1]+'_'+m[2]):null;
  if(akey && scene.anims.exists(akey+'-a')){                     // ANIMACIÓN DE ATAQUE REAL (espada/arco/báculo)
    atkCd = m[1]==='monk'?820:(m[1]==='archer'?560:460);
    const asp=scene.add.sprite(s.x, s.y, akey, 0).setOrigin(0.5,0.72).setDepth(s.y+1).setFlipX(player.faceLeft);
    asp.setScale(s.displayHeight/192*1.18);                      // a la altura de la unidad (sin agrandar)
    s.setVisible(false);
    asp.play(akey+'-a');
    const restore=()=>{ if(asp&&asp.active) asp.destroy(); if(player&&player.spr){ player.spr.setVisible(true); player.spr.setFlipX(player.faceLeft); } };
    asp.once('animationcomplete',restore);
    scene.time.delayedCall(atkCd+140, restore);                 // red de seguridad: la unidad siempre vuelve a mostrarse
    if(m[1]==='archer') shootArrow(s.x+dir*10, s.y-18, dir);     // el arquero dispara una flecha
    sfx(m[1]==='monk'?'bell':(m[1]==='archer'?'creak':'clash'), 0.4);
  } else {                                                       // criaturas/animales sin hoja: gesto del cuerpo + tajo
    atkCd=360;
    scene.tweens.add({targets:s, angle:dir*17, duration:75, yoyo:true, ease:'Quad.easeOut', onComplete:()=>s.setAngle(0)});
    const cx=s.x+dir*22, cy=s.y-14;
    const g=scene.add.graphics().setDepth(s.y+80); g.lineStyle(5,0xffffff,0.95);
    g.beginPath(); g.arc(cx,cy,22, dir>0?-1.0:Math.PI+1.0, dir>0?1.0:Math.PI-1.0, false); g.strokePath();
    scene.tweens.add({targets:g, alpha:0, scaleX:1.3, scaleY:1.3, duration:230, ease:'Quad.easeOut', onComplete:()=>g.destroy()});
    burst(cx,cy,0xffffff,6,8); sfx('clash',0.4);
  }
}
function shootArrow(x,y,dir){                                    // flecha simple del arquero
  const a=scene.add.rectangle(x,y,14,3,0x6b4a2a).setDepth(y+2);
  scene.tweens.add({targets:a, x:x+dir*220, duration:420, ease:'Quad.easeIn', onComplete:()=>a.destroy()});
}
function playerJump(){
  if(!kReady||!player||!player.spr||player._jumping) return; const s=player.spr, b=s.body; if(!b) return;
  player._jumping=true; b.setVelocity(0,0); b.enable=false; const y0=s.y;                     // desactiva la física para que el tween mueva la Y
  s.play(player.animR,true);                                                                  // reutiliza la animación de correr → mueve las piernas en el aire
  const sh=scene.add.ellipse(s.x, y0+2, 26,10, 0x000000, 0.28).setDepth(y0-1);                // sombra en el piso
  scene.tweens.add({targets:s, y:y0-26, duration:180, yoyo:true, ease:'Quad.easeOut',
    onComplete:()=>{ s.y=y0; if(s.body) s.body.enable=true; player._jumping=false; sh.destroy(); } });
  scene.tweens.add({targets:sh, scaleX:0.7, scaleY:0.7, alpha:0.15, duration:180, yoyo:true });
  sfx('latch',0.25);
}
/* ===== nivel del usuario =====
   XP = tiempo jugado en el reino (+1 cada 20 s) + criaturas desbloqueadas en la beta (+30 c/u).
   Nivel N necesita 40·(N-1)² de XP. Las unidades más poderosas piden nivel además de estar desbloqueadas. */
function loadLevel(){ try{ return JSON.parse(localStorage.getItem('aoa_level')||'null')||{xp:0}; }catch(e){ return {xp:0}; } }
let PLV=loadLevel(), _xpAcc=0;
function saveLevel(){ try{ localStorage.setItem('aoa_level',JSON.stringify(PLV)); }catch(e){} }
function unlockedSet(){ try{ return new Set(JSON.parse(localStorage.getItem('aoa_cards')||'[]')); }catch(e){ return new Set(); } }
function totalXp(){ return (PLV.xp||0) + unlockedSet().size*30; }
function userLevel(){ return 1 + Math.floor(Math.sqrt(totalXp()/40)); }
function xpForLevel(L){ return 40*(L-1)*(L-1); }
function addXp(n){ PLV.xp=(PLV.xp||0)+n; saveLevel(); kLevelPaint(); }
function kXpAccrue(delta){ _xpAcc+=delta; if(_xpAcc>=20000){ _xpAcc-=20000; addXp(1); } }   // +1 XP cada 20 s de juego
const KREQ={gnoll:2,thief:2,snake:2,spider:2, skull:3,gnome:3,torch:3,spear:3, shaman:4,tnt:4,pigrider:4, mino:5};   // nivel requerido
function reqLevel(u){ return KREQ[u.key]||1; }
/* desbloqueo: básicos siempre; criaturas al verlas en la beta (aoa_cards) Y con nivel suficiente */
const KBETA={torch:'torch',spear:'spear',gnoll:'gnoll',tnt:'tnt',pigrider:'pigrider',shaman:'shaman',skull:'skull',gnome:'gnome',snake:'snake',spider:'spider',thief:'thief',mino:'toro'};
function kLockReason(u){                                         // null = disponible; 'beta' = falta jugarla; 'level' = falta nivel
  const basic=/^(pawn|warrior|archer|monk)_/.test(u.key)||u.key==='pig'||u.key==='bear';
  if(!basic){ const bk=KBETA[u.key]; if(bk && !unlockedSet().has(bk)) return 'beta'; }
  if(userLevel()<reqLevel(u)) return 'level';
  return null;
}
function kUnlocked(u){ return kLockReason(u)===null; }
function kLevelPaint(){                                          // pinta el nivel/XP en el login
  const el=$('kLevel'); if(!el) return; const lv=userLevel(), cur=totalXp(), base=xpForLevel(lv), next=xpForLevel(lv+1);
  el.innerHTML='<b>'+L('Nivel ','Level ')+lv+'</b> · '+(cur-base)+'/'+(next-base)+' XP';
}
/* carrusel de unidades GRANDE y ANIMADO: cada carta reproduce la animación idle del personaje */
function kFrames(u){ try{ const a=scene.anims.get(u.idle); return (a&&a.frames.length)?a.frames.map(f=>f.frame):[scene.textures.getFrame(u.tex,0)]; }catch(e){ return []; } }
function kDrawCard(cv,u,fi){
  const frames=cv._frames||(cv._frames=kFrames(u)); if(!frames.length) return;
  const fr=frames[fi%frames.length]; if(!fr) return; let src; try{ src=fr.texture.getSourceImage(); }catch(e){ return; }
  const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,cv.width,cv.height);
  const fw=fr.cutWidth, fh=fr.cutHeight, s=Math.min((cv.width-8)/fw,(cv.height-8)/fh), dw=fw*s, dh=fh*s;
  cx.drawImage(src, fr.cutX,fr.cutY,fw,fh, (cv.width-dw)/2,(cv.height-dh)/2, dw,dh);
}
let kPickTimer=null, kPickF=0;
function kPickStart(){ if(kPickTimer) return; kPickTimer=setInterval(()=>{ kPickF++; const box=$('kUnits'); if(!box) return;
  box.querySelectorAll('canvas.kanim').forEach(cv=>{ if(cv._u) kDrawCard(cv,cv._u,kPickF); }); },140); }
function kPickStop(){ if(kPickTimer){ clearInterval(kPickTimer); kPickTimer=null; } }
function kSelectIdx(i){                                // selecciona una carta del carrusel (si está disponible) → se ve en grande en el mundo
  if(i<0||i>=kUnitList.length) return; const u=kUnitList[i]; if(!kUnlocked(u)) return;
  kSel=u; makePlayerSprite(u);
  const box=$('kUnits'); if(box){ box.querySelectorAll('.kunit').forEach((el,j)=>el.classList.toggle('sel', j===i));
    const cur=box.children[i]; if(cur&&cur.scrollIntoView) cur.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}); }
}
function kStep(dir){                                    // flechas ‹ ›: salta a la próxima carta DISPONIBLE
  let i=kUnitList.indexOf(kSel); if(i<0)i=0;
  for(let n=0;n<kUnitList.length;n++){ i=(i+dir+kUnitList.length)%kUnitList.length; if(kUnlocked(kUnitList[i])){ kSelectIdx(i); return; } }
}
function kBuildPicker(){
  const box=$('kUnits'); if(!box) return; box.innerHTML='';
  kUnitList.forEach((u,i)=>{
    const reason=kLockReason(u), on=!reason;
    const b=document.createElement('button'); b.type='button'; b.className='kunit'+(u===kSel?' sel':'')+(on?'':' locked');
    const cv=document.createElement('canvas'); cv.width=112; cv.height=104; cv.className='kanim'; cv._u=u; kDrawCard(cv,u,0); b.appendChild(cv);
    const nm=document.createElement('span'); nm.className='kuname'; nm.textContent=u.label; b.appendChild(nm);
    if(reason==='beta'){ const l=document.createElement('span'); l.className='klock'; l.textContent='🔒'; b.appendChild(l); b.title=L('Jugá la beta para desbloquearla','Play the beta to unlock'); }
    else if(reason==='level'){ const l=document.createElement('span'); l.className='klock lvl'; l.textContent=L('Nv ','Lv ')+reqLevel(u); b.appendChild(l); b.title=L('Necesitás nivel ','Requires level ')+reqLevel(u); }
    if(on) b.onclick=()=>kSelectIdx(i);
    box.appendChild(b);
  });
  const pv=$('kPrev'), nx=$('kNext'); if(pv) pv.onclick=()=>kStep(-1); if(nx) nx.onclick=()=>kStep(1);
  const cur=kUnitList.indexOf(kSel); if(cur>=0){ const el=box.children[cur]; if(el&&el.scrollIntoView) el.scrollIntoView({inline:'center',block:'nearest'}); }
  kPickStart();
}
function startKingdom(sc){
  kUnitList=kingdomUnits();
  let saved=null; try{ saved=JSON.parse(localStorage.getItem('aoa_kingdom')||'null'); }catch(e){}
  const savedU=saved&&kUnitList.find(u=>u.key===saved.unit&&kUnlocked(u));
  kSel=savedU || kUnitList.find(kUnlocked) || kUnitList[0];   // por defecto, la primera desbloqueada
  makePlayerSprite(kSel);
  kCursors=sc.input.keyboard.createCursorKeys();
  kKeys=sc.input.keyboard.addKeys({W:Phaser.Input.Keyboard.KeyCodes.W,A:Phaser.Input.Keyboard.KeyCodes.A,S:Phaser.Input.Keyboard.KeyCodes.S,D:Phaser.Input.Keyboard.KeyCodes.D});
  kSpaceKey=sc.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  sc.input.keyboard.clearCaptures();                      // no capturar teclas hasta entrar: así se pueden escribir a/s/w/d en el nombre
  sc.input.on('pointerdown',p=>{                          // click en el mundo: golpe según la unidad (te movés con WASD/flechas, saltás con Espacio)
    if(!kReady||!player||p.y<60) return;                  // ignora clicks sobre la barra superior
    playerAttack();
  });
  kBuildPicker();
  const nameEl=$('kName'); if(nameEl&&saved&&saved.name) nameEl.value=saved.name;
  const btn=$('kEnter'); if(btn) btn.onclick=kingdomEnter;
  if(nameEl) nameEl.addEventListener('keydown',e=>{ if(e.key==='Enter') kingdomEnter(); });
  kWireChat();
  kWalletPaint();                                          // estado de la billetera en el login
  kLevelPaint();                                           // nivel/XP del usuario
  kMM=$('kMinimap'); if(kMM&&kMM.getContext) kMMx=kMM.getContext('2d');   // minimapa
}
// ===== NPC de práctica: un maestro de armas en el centro para probar el PvP =====
function spawnTestNpc(){
  if(kTestNpc||!scene) return;
  const c=nearWalkable(Math.floor(COLS/2)+3, Math.floor(ROWS/2)); const x=c.x*T+T/2, y=c.y*T+T/2;
  const u=kUnitByKey('warrior_red');
  const s=scene.physics.add.sprite(x,y,u.tex,0).setOrigin(0.5,u.oy).setScale(u.scale).setDepth(y); s.play(u.idle);
  if(s.body){ s.body.setImmovable(true); s.body.moves=false; s.body.setSize(24,18); }
  kTestNpc={spr:s, name:L('Maestro de armas','Sparring Master'), isTest:true, _plate:null};
  nameplate(kTestNpc,{name:kTestNpc.name,me:false,rank:0});
  if(player&&player.spr) scene.physics.add.collider(player.spr, s);   // no lo atravesás
}
// ===== enemigos salvajes: deambulan por el bosque; al derrotarlos se desbloquea su carta en el PvP =====
function kSpawnEnemies(){
  if(kEnemies.length||!scene) return;
  let placed=0, it=0;
  while(placed<6 && it++<400){ const d=KENEMY_DEF[rint(0,KENEMY_DEF.length-1)];
    const tx=rint(2,COLS-3), ty=rint(2,ROWS-3);
    if(!isLand(tx,ty)||(blocked[ty]&&blocked[ty][tx])) continue;
    const cx=Math.floor(COLS/2), cy=Math.floor(ROWS/2); if(Math.hypot(tx-cx,ty-cy)<7) continue;   // lejos de la plaza
    const x=tx*T+T/2, y=ty*T+T/2;
    const s=scene.physics.add.sprite(x,y,'ke_'+d.key+'_i',0).setOrigin(0.5,0.72).setScale(d.sc).setDepth(y); s.play('ke_'+d.key+'-i');
    if(s.body){ s.body.setSize(26,20); }
    const e={def:d,spr:s,hp:d.hp,maxhp:d.hp,dead:false,hx:x,hy:y,tx:x,ty:y,moveT:rint(600,2200),moving:false,flip:false};
    scene.physics.add.collider(s,obstacles); if(player&&player.spr) scene.physics.add.collider(player.spr,s);
    kEnemies.push(e); placed++;
  }
}
function kEnemyUpdate(delta){
  const pOK=kReady&&player&&player.spr;
  for(const e of kEnemies){ if(e.dead||!e.spr) continue; const s=e.spr;
    let sp=46, aggro=false;
    if(pOK){ const pdx=player.spr.x-s.x, pdy=player.spr.y-s.y, pd=Math.hypot(pdx,pdy);   // contraataque: persigue al jugador si está cerca
      if(pd<160){ aggro=true; sp=64; e.tx=player.spr.x; e.ty=player.spr.y; e.moving=pd>40;
        if(pd<=40){ s.body.setVelocity(0,0); e.atkCd=(e.atkCd||0)-delta; if(e.atkCd<=0){ e.atkCd=1200; kEnemyStrike(e,pdx); } } } }
    if(!aggro){ e.moveT-=delta;
      if(e.moveT<=0){ e.moveT=rint(1200,3200);                                   // deambula cerca del hogar
        if(Math.random()<0.55){ const a=Math.random()*6.28, r=rint(24,120); e.tx=Phaser.Math.Clamp(e.hx+Math.cos(a)*r,T,WORLD_W-T); e.ty=Phaser.Math.Clamp(e.hy+Math.sin(a)*r,T,WORLD_H-T); e.moving=true; }
        else e.moving=false; } }
    if(e.moving){ const dx=e.tx-s.x, dy=e.ty-s.y, dd=Math.hypot(dx,dy);
      if(dd<6||(!aggro&&!landAtPx(s.x+Math.sign(dx)*14,s.y+10))){ e.moving=false; s.body.setVelocity(0,0); }
      else { s.body.setVelocity(dx/dd*sp,dy/dd*sp); s.play('ke_'+e.def.key+'-r',true); if(Math.abs(dx)>1){ e.flip=dx<0; s.setFlipX(e.flip); } } }
    else { s.body.setVelocity(0,0); s.play('ke_'+e.def.key+'-i',true); }
    s.setDepth(s.y);
  }
}
function kEnemyStrike(e,dx){                               // el enemigo golpea al jugador: sacudida + soltás lo que llevás
  if(!player||!player.spr) return; const s=e.spr; s.setFlipX(dx<0);
  scene.tweens.add({targets:s, x:s.x+Math.sign(dx)*8, duration:90, yoyo:true});
  player.spr.setTintFill(0xff5040); scene.time.delayedCall(110,()=>{ if(player&&player.spr) player.spr.clearTint(); });
  if(scene.cameras&&scene.cameras.main) scene.cameras.main.shake(140,0.006);
  burst(player.spr.x,player.spr.y-16,0xff8060,5,7); sfx('clash',0.3);
  if(player.carry){ toast(L('¡Te golpearon! Soltaste la carga.','You got hit! Dropped your load.')); kClearCarry(); }
}
function kHitEnemies(){                                    // el golpe del jugador daña a los enemigos cercanos al frente
  if(!player||!player.spr) return; const px=player.spr.x, py=player.spr.y, dir=player.faceLeft?-1:1;
  for(const e of kEnemies){ if(e.dead||!e.spr) continue;
    const dx=e.spr.x-px, dy=e.spr.y-py; if(Math.hypot(dx,dy)>74) continue; if(Math.sign(dx)!==dir&&Math.abs(dx)>20) continue;
    e.hp--; e.spr.setTintFill(0xffffff); scene.time.delayedCall(90,()=>{ if(e.spr&&e.spr.active) e.spr.clearTint(); });
    burst(e.spr.x,e.spr.y-14,0xffd0a0,5,7);
    if(e.hp<=0){ e.dead=true; const ex=e.spr.x, ey=e.spr.y; e.spr.destroy();
      const b=scene.add.image(ex,ey+4,'bones1').setOrigin(0.5,0.9).setScale(0).setDepth(ey);
      scene.tweens.add({targets:b,scaleX:0.8,scaleY:0.8,duration:220,ease:'Back.easeOut'});
      kUnlockCard(e.def);
    }
  }
}
function kUnlockCard(def){                                 // suma la carta a aoa_cards → disponible en el PvP
  let s=[]; try{ s=JSON.parse(localStorage.getItem('aoa_cards')||'[]'); }catch(e){}
  if(!s.includes(def.card)){ s.push(def.card); try{ localStorage.setItem('aoa_cards',JSON.stringify(s)); }catch(e){}
    toast(L('¡Derrotaste al '+def.es+'! Desbloqueada para el PvP.','Defeated the '+def.en+'! Unlocked for PvP.')); sfx('coins',0.4); addXp(20); }
  else toast(L('Derrotaste a un '+def.es+'.','Defeated a '+def.en+'.'));
  if(player&&!player.carry) kSetCarry('res_gold','oro','gold');   // el enemigo suelta botín de oro para llevar
}
// ===== llevar recursos: recolectás en el bosque/pastura/mina y depositás en el castillo (base para misiones diarias) =====
let kCarryIcon=null, kRes=null;
function loadKRes(){ try{ return JSON.parse(localStorage.getItem('aoa_kres')||'null')||{wood:0,gold:0,food:0}; }catch(e){ return {wood:0,gold:0,food:0}; } }
function kCarryAnim(){                                     // pose de aldeano cargando (pc_color_recurso) si corresponde
  if(!player||!player.carry||!scene) return null;
  const m=(kSel&&kSel.key||'').match(/^pawn_(blue|red|purple|yellow)$/); if(!m) return null;
  const res=player.carry==='res_wood'?'wood':player.carry==='res_gold'?'gold':'food', base='pc_'+m[1]+'_'+res;
  return scene.anims.exists(base+'-i') ? {i:base+'-i',r:base+'-r'} : null;
}
function kSetCarry(tex,es,en){
  if(!player||!scene) return; player.carry=tex; player.carryName={es,en};
  if(kCarryIcon){ kCarryIcon.destroy(); kCarryIcon=null; }
  if(!kCarryAnim()){                                       // sólo ícono flotante si la unidad NO tiene pose de carga (la pose ya muestra el recurso)
    kCarryIcon=scene.add.image(player.spr.x,player.spr.y-52,tex).setScale(0.55).setDepth(player.spr.y+80);
    scene.tweens.add({targets:kCarryIcon,y:kCarryIcon.y-5,duration:600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }
}
function kClearCarry(){ if(player) player.carry=null; if(kCarryIcon){ kCarryIcon.destroy(); kCarryIcon=null; } }
function kPickResource(){                                  // toma el recurso del nodo más cercano si no lleva nada
  if(!player||player.carry) return; let best=null,bd=70;
  for(const t of treeSpots){ const d=Math.hypot(t.x-player.spr.x,(t.y-T*0.6)-player.spr.y); if(d<bd){bd=d;best={t:'res_wood',es:'madera',en:'wood'};} }
  for(const m of meatSpots){ const d=Math.hypot(m.x-player.spr.x,m.y-player.spr.y); if(d<bd){bd=d;best={t:'res_meat',es:'comida',en:'food'};} }
  if(gmPos){ const d=Math.hypot(gmPos.x-player.spr.x,gmPos.y-player.spr.y); if(d<bd){bd=d;best={t:'res_gold',es:'oro',en:'gold'};} }
  if(!best) return;
  kSetCarry(best.t,best.es,best.en); toast(L('Recogiste '+best.es+'. Llevalo al castillo.','Picked up '+best.en+'. Take it to the castle.')); sfx('door',0.2);
}
function kCarryUpdate(){                                   // sigue la cabeza + deposita cerca del castillo
  if(!player||!player.spr) return;
  if(kCarryIcon){ kCarryIcon.x=player.spr.x; kCarryIcon.y=player.spr.y-52; kCarryIcon.setDepth(player.spr.y+80); }
  if(player.carry && Math.hypot(player.spr.x-WORLD_W/2,player.spr.y-WORLD_H/2)<150){
    const key=player.carry==='res_wood'?'wood':player.carry==='res_gold'?'gold':'food';
    kRes[key]=(kRes[key]||0)+1; try{ localStorage.setItem('aoa_kres',JSON.stringify(kRes)); }catch(e){}
    const nm=player.carryName?L(player.carryName.es,player.carryName.en):key;
    toast(L('Depositaste '+nm+' · total '+kRes[key],'Deposited '+nm+' · total '+kRes[key])); addXp(6); sfx('coins',0.3);
    kClearCarry();
  }
}
// ===== minimapa: dónde están los otros jugadores reales =====
let kMM=null, kMMx=null, kMMacc=0;
const GCOL={}; for(const g of GUILDS){ GCOL[g.id]='#'+g.color.toString(16).padStart(6,'0'); }   // color de facción para el minimapa
function kMinimap(){
  if(!kMMx||!kMM) return; const W=kMM.width, H=kMM.height, sx=W/WORLD_W, sy=H/WORLD_H;
  kMMx.clearRect(0,0,W,H);
  kMMx.fillStyle='#0e2a38'; kMMx.fillRect(0,0,W,H);                                   // mar
  kMMx.fillStyle='#3f7a3a';                                                            // isla (elipse aprox del terreno)
  kMMx.beginPath(); kMMx.ellipse((COLS/2)*T*sx,(ROWS/2)*T*sy, COLS*0.435*T*sx, ROWS*0.415*T*sy, 0,0,Math.PI*2); kMMx.fill();
  for(const n of npcs){                                                                // NPCs por facción (guardia/yunque/sombra/sol/goblin)
    if(n.dead||!n.spr) continue; if(n.sheep) continue;
    kMMx.fillStyle=GCOL[n.guild]||'#c9c1ad';
    kMMx.fillRect(n.spr.x*sx-1.1,n.spr.y*sy-1.1,2.2,2.2);
  }
  kMMx.fillStyle='#f2e8cf';                                                            // otros usuarios reales (reino)
  for(const id in kOthers){ const o=kOthers[id]; if(!o.spr) continue; kMMx.fillRect(o.spr.x*sx-1.6,o.spr.y*sy-1.6,3.2,3.2); }
  if(player&&player.spr){                                                              // yo (punto dorado)
    kMMx.fillStyle='#f0d564'; kMMx.beginPath(); kMMx.arc(player.spr.x*sx,player.spr.y*sy,2.8,0,Math.PI*2); kMMx.fill();
    kMMx.lineWidth=1; kMMx.strokeStyle='#120d09'; kMMx.stroke();
  }
}
function kWireChat(){                                     // botón de mensaje (siempre) + PvP (contextual, desactivado) + compositor
  const open=$('kMsgBtn'), comp=$('kCompose'), input=$('kMsgInput'), count=$('kMsgCount'), send=$('kMsgSend'), cancel=$('kMsgCancel');
  const refresh=()=>{ if(count&&input) count.textContent=(input.value.length)+'/'+MSG_MAX; };
  const show=on=>{ if(comp) comp.classList.toggle('on',on); if(on&&input){ input.value=''; refresh(); setTimeout(()=>input.focus(),30); } };
  const fire=()=>{ if(!input) return; const v=input.value.trim().slice(0,MSG_MAX); if(v){ playerSay(v); sfx('latch',0.3); } show(false); };
  if(input){ input.maxLength=MSG_MAX; input.placeholder=L('¡Hola, reino!','Hi, kingdom!'); input.addEventListener('input',refresh);
    input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); fire(); } else if(e.key==='Escape'){ show(false); } }); }
  { const ne=$('kName'); if(ne) ne.placeholder=L('Tu nombre','Your name'); }   // el placeholder del nombre también en el idioma
  if(open) open.onclick=()=>show(true);
  if(send) send.onclick=fire;
  if(cancel) cancel.onclick=()=>show(false);
  const pv=$('kPvpBtn'); if(pv){ pv.disabled=false; pv.title=L('Desafiar a un duelo PvP','Challenge to a PvP duel');
    const soon=pv.querySelector('.soon'); if(soon) soon.style.display='none';
    pv.onclick=()=>{ kChallenge(); }; }
}
function kChallenge(){                                    // desafía al usuario cercano a un duelo en vivo
  if(!kNear || kNear.isTest){ location.href='/pvp'; return; }   // NPC de práctica o nadie cerca: batalla vs IA para probar el PvP
  if(ws&&ws.readyState===1){ try{ ws.send(JSON.stringify({t:'chal', to:kNear.id})); }catch(e){} }
  toast(L('Desafío enviado a ','Challenge sent to ')+(kNear.name||'?')+'…');
}
function toast(t){ const el=$('kToast'); if(!el){ console.log(t); return; } el.textContent=t; el.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('on'),2200); }
function kChalPrompt(fromId,name){                        // llega un desafío: aceptar / rechazar
  const ov=$('kChal'); if(!ov){ if(ws) ws.send(JSON.stringify({t:'chalyes',to:fromId})); return; }
  const who=$('kChalWho'); if(who) who.textContent=(name||'?');
  ov.classList.add('on'); sfx('bell',0.4);
  $('kChalYes').onclick=()=>{ ov.classList.remove('on'); if(ws&&ws.readyState===1) ws.send(JSON.stringify({t:'chalyes',to:fromId})); };
  $('kChalNo').onclick=()=>{ ov.classList.remove('on'); if(ws&&ws.readyState===1) ws.send(JSON.stringify({t:'chalno',to:fromId})); };
}
function kSession(){ const A=window.AOA_AUTH; return (A&&A.getSession&&A.getSession())||null; }
function kWalletPaint(){                                   // muestra el estado de la billetera en el login
  const el=$('kWallet'); if(!el) return; const s=kSession();
  if(s&&s.pubkey){ const pk=s.pubkey; el.innerHTML='🔗 '+L('Billetera: ','Wallet: ')+'<b>'+pk.slice(0,4)+'…'+pk.slice(-4)+'</b>'; el.className='kwallet ok'; }
  else{ el.textContent=L('Conectá tu billetera para entrar y guardar tu nombre.','Connect your wallet to enter and save your name.'); el.className='kwallet'; }
}
async function kWalletConnect(nm){                         // conecta la billetera, verifica holder y registra el nombre
  const A=window.AOA_AUTH, hint=$('kHint');
  if(!A){ if(hint){ hint.textContent=L('Billetera no disponible.','Wallet unavailable.'); hint.className='khint bad'; } return null; }
  if(!A.hasWallet||!A.hasWallet()){ if(hint){ hint.innerHTML=L('No detectamos ninguna billetera de Solana. Instalá ','No Solana wallet detected. Install ')+'<a href="https://phantom.app" target="_blank" style="color:var(--brass-hi)">Phantom</a>.'; hint.className='khint bad'; } return null; }
  try{
    if(hint){ hint.textContent=L('Conectando billetera…','Connecting wallet…'); hint.className='khint'; }
    const pk=await A.connect();
    const h=await A.isHolder(pk);
    if(!h||!h.holder){ if(hint){ hint.textContent=L('Esta billetera no holdea $AOA.','This wallet doesn’t hold $AOA.'); hint.className='khint bad'; } return null; }
    const proof=await A.signProof(pk);
    try{ if(A.register) await A.register(pk, nm, proof); }catch(e){}   // asocia nombre ↔ billetera (best-effort)
    if(A.saveSession) A.saveSession({pubkey:pk, username:nm, proof, stub:!!h.stub});
    kWalletPaint(); if(hint){ hint.textContent=''; hint.className='khint'; }
    return pk;
  }catch(e){ if(hint){ hint.textContent=L('No se pudo conectar la billetera.','Couldn’t connect the wallet.'); hint.className='khint bad'; } return null; }
}
async function kingdomEnter(){
  const nameEl=$('kName'), hint=$('kHint'); let nm=((nameEl&&nameEl.value)||'').trim().slice(0,16);
  if(!/^[\w .\-]{2,16}$/.test(nm)){ if(hint){ hint.textContent=L('Elegí un nombre válido (2 a 16 caracteres).','Choose a valid name (2 to 16 chars).'); hint.className='khint bad'; } return; }
  if(!player){ if(hint){ hint.textContent=L('El reino todavía está cargando…','The kingdom is still loading…'); hint.className='khint'; } return; }   // la escena aún no creó la unidad
  const A=window.AOA_AUTH; let s=kSession(); let wallet=s&&s.pubkey||null;
  if(!wallet){ wallet=await kWalletConnect(nm); if(!wallet) return; }   // requiere billetera para entrar
  else{ try{ if(A&&A.register) await A.register(wallet, nm, s.proof||null); }catch(e){}   // ya conectado: asocia el nombre elegido
        if(A&&A.saveSession) A.saveSession(Object.assign({},s,{username:nm})); }
  player.name=nm;
  try{ localStorage.setItem('aoa_kingdom',JSON.stringify({name:nm,unit:kSel.key,wallet:wallet})); }catch(e){}
  if(player._plate){ player._plate.destroy(); player._plate=null; }
  nameplate(player,{name:nm,me:true,rank:0});
  kReady=true;
  kPickStop();                                            // frena la animación del carrusel de selección
  if(scene) scene.cameras.main.setFollowOffset(0,0);      // centra la cámara en la unidad al entrar
  const bar=$('kBar'); if(bar) bar.classList.add('on');   // barra de acciones (mensaje siempre; PvP al cruzarse)
  if(kMM) kMM.classList.add('on');                        // minimapa
  spawnTestNpc();                                         // maestro de armas en el centro para probar el PvP
  kSpawnEnemies();                                         // enemigos salvajes en el bosque (derrotalos → desbloqueás su carta)
  kRes=loadKRes();                                         // recursos guardados (para misiones diarias)
  sfx('door',0.3);
  kConnect();                                             // entra al reino en vivo: se ve con los demás usuarios reales
  const lg=$('kLogin'); if(lg){ lg.classList.add('hide'); setTimeout(()=>{ if(lg) lg.style.display='none'; },400); }
  const hc=$('kControls'); if(hc){ hc.classList.add('on'); setTimeout(()=>hc.classList.remove('on'),6500); }
}
window.kingdomEnter=kingdomEnter;

aplicarIdioma();
