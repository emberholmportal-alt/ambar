/* Age of Ansem · PvP — mini batalla de cartas estilo Clash (versión beta, un jugador vs IA).
   Cartas = unidades propias + enemigos vistos en la beta. Energía, torres, puntos.
   Reusa sprites/animaciones/sonidos del pack. Sin build step (Phaser por CDN). */
const $=id=>document.getElementById(id);
let LANG=(function(){try{return localStorage.getItem('aoa_lang')||'en';}catch(e){return 'en';}})();
const L=(es,en)=>LANG==='en'?en:es;
const TSB='assets/img/ts/';
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

const ARENA_W=720, ARENA_H=1080, MID=ARENA_H/2;
const ENERGY_MAX=10, ENERGY_REGEN=2300;              // +1 de energía cada 2.3s
const MATCH_TIME=150;                                // duración de la partida (s); al terminar gana quien tiró más torres
const VS_TOWER=1.6;                                  // las unidades pegan más fuerte a las torres (asedios más ágiles)

/* archivos de spritesheet -> [ruta, frameW, frameH] */
const FILES={
  pawn_blue:[TSB+'pawn_blue.png',192,192], warrior_blue:['assets/img/warrior_blue.png',110,98],
  archer_blue_i:[TSB+'archer_blue_i.png',192,192], archer_blue_r:[TSB+'archer_blue_r.png',192,192],
  monk_blue_i:[TSB+'monk_blue_i.png',192,192], monk_blue_r:[TSB+'monk_blue_r.png',192,192],
  goblin_torch:[TSB+'goblin_torch.png',192,192], goblin_tnt:[TSB+'goblin_tnt.png',192,192],
  gnoll_idle:[TSB+'gnoll_idle.png',192,192], gnoll_walk:[TSB+'gnoll_walk.png',192,192],
  spider_idle:[TSB+'spider_idle.png',192,192], spider_run:[TSB+'spider_run.png',192,192],
  snake_idle:[TSB+'snake_idle.png',192,192], snake_run:[TSB+'snake_run.png',192,192],
  shaman_idle:[TSB+'shaman_idle.png',192,192], shaman_run:[TSB+'shaman_run.png',192,192],
  spear_idle:[TSB+'spear_idle.png',256,256], spear_run:[TSB+'spear_run.png',256,256],
  pigrider_idle:[TSB+'pigrider_idle.png',256,256], pigrider_run:[TSB+'pigrider_run.png',256,256],
  skull_idle:[TSB+'skull_i.png',192,192], skull_run:[TSB+'skull_r.png',192,192],
  gnome_idle:[TSB+'gnome_i.png',192,192], gnome_run:[TSB+'gnome_r.png',192,192],
};

/* cartas: own=propia (siempre); el resto se desbloquea al verlas en la beta. range>60 = a distancia. */
const CARDS=[
  {key:'pawn',   own:1, es:'Aldeano', en:'Villager', cost:2, hp:70,  dmg:9,  sp:56, range:26, rate:850, si:'pawn_blue', fi:[0,5], sr:'pawn_blue', fr:[6,11], sc:0.52},
  {key:'archer', own:1, es:'Arquera', en:'Archer',   cost:3, hp:55,  dmg:13, sp:50, range:190,rate:1150,si:'archer_blue_i', sr:'archer_blue_r', sc:0.52},
  {key:'monk',   own:1, es:'Monje',   en:'Monk',     cost:4, hp:95,  dmg:12, sp:44, range:26, rate:1000,si:'monk_blue_i', sr:'monk_blue_r', sc:0.52},
  {key:'warrior',own:1, es:'Guerrero',en:'Warrior',  cost:4, hp:160, dmg:16, sp:46, range:28, rate:1000,si:'warrior_blue', fi:[0,5], sr:'warrior_blue', fr:[12,17], sc:0.62},
  {key:'gnoll',  es:'Gnoll',  en:'Gnoll',    cost:3, hp:48,  dmg:9,  sp:78, range:24, rate:700, si:'gnoll_idle', sr:'gnoll_walk', sc:0.52},
  {key:'spider', es:'Araña',  en:'Spider',   cost:2, hp:42,  dmg:8,  sp:82, range:22, rate:650, si:'spider_idle', sr:'spider_run', sc:0.5},
  {key:'gnome',  es:'Gnomo',  en:'Gnome',    cost:2, hp:46,  dmg:10, sp:70, range:24, rate:750, si:'gnome_idle', sr:'gnome_run', sc:0.52},
  {key:'snake',  es:'Víbora', en:'Snake',    cost:3, hp:66,  dmg:12, sp:58, range:24, rate:850, si:'snake_idle', sr:'snake_run', sc:0.5},
  {key:'skull',  es:'No-muerto',en:'Undead', cost:3, hp:72,  dmg:13, sp:52, range:26, rate:900, si:'skull_idle', sr:'skull_run', sc:0.52},
  {key:'torch',  es:'Goblin', en:'Goblin',   cost:3, hp:72,  dmg:13, sp:52, range:26, rate:850, si:'goblin_torch', fi:[0,6], sr:'goblin_torch', fr:[7,12], sc:0.52},
  {key:'spear',  es:'Lancero',en:'Spearman', cost:3, hp:74,  dmg:13, sp:50, range:34, rate:900, si:'spear_idle', sr:'spear_run', sc:0.44},
  {key:'shaman', es:'Chamán', en:'Shaman',   cost:4, hp:70,  dmg:17, sp:40, range:175,rate:1250,si:'shaman_idle', sr:'shaman_run', sc:0.52},
  {key:'tnt',    es:'Goblin TNT',en:'TNT Goblin',cost:4, hp:70, dmg:30, sp:42, range:26, rate:1300, si:'goblin_tnt', fi:[0,6], sr:'goblin_tnt', fr:[7,12], sc:0.52},
  {key:'pigrider',es:'Jinete Cerdo',en:'Pig Rider',cost:5, hp:210, dmg:24, sp:48, range:28, rate:1100, si:'pigrider_idle', sr:'pigrider_run', sc:0.44},
];
const CARD_BY_KEY=Object.fromEntries(CARDS.map(c=>[c.key,c]));
const FOE_POOL=['torch','spear','gnoll','skull','snake','gnome','tnt','pigrider','shaman','warrior','archer'];   // la IA usa todo

function unlockedKeys(){
  let seen=[]; try{ seen=JSON.parse(localStorage.getItem('aoa_cards')||'[]'); }catch(e){}
  const set=new Set(seen);
  return CARDS.filter(c=>c.own||set.has(c.key)).map(c=>c.key);
}

let scene;
const S={ units:[], towers:[], shots:[], enYou:6, enFoe:6, regYou:0, regFoe:0, aiT:0, aiNext:2600,
          deck:[], hand:[], sel:-1, crownsYou:0, crownsFoe:0, over:false, time:MATCH_TIME, timeAcc:0, zoneHi:null };

const config={ type:Phaser.AUTO, parent:'game', backgroundColor:'#0d2417',
  scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH, width:'100%', height:'100%'},
  render:{pixelArt:true, antialias:false}, scene:{preload,create,update} };
new Phaser.Game(config);

function preload(){
  this.load.on('progress',p=>{ const b=$('pvBar'); if(b) b.style.width=Math.round(p*100)+'%'; });
  this.load.on('loaderror',f=>console.warn('pvp asset',f&&f.key));
  for(const k in FILES) this.load.spritesheet(k, FILES[k][0], {frameWidth:FILES[k][1], frameHeight:FILES[k][2]});
  for(const c of ['blue','red']) this.load.image('tower_'+c, TSB+'tower_'+c+'.png');
  this.load.image('castle_black', TSB+'castle_black.png');
  ['clash','fire','bell','coins','bong'].forEach(k=>this.load.audio('s_'+k,'assets/sfx/'+k+'.ogg'));
}

function mkAnim(an,key,sheet,frames,rate,loop){
  if(an.exists(key)) return;
  const f=frames?an.generateFrameNumbers(sheet,{start:frames[0],end:frames[1]}):an.generateFrameNumbers(sheet,{start:0,end:-1});
  an.create({key,frames:f,frameRate:rate||10,repeat:loop===false?0:-1});
}
function makeDot(s){ const g=s.add.graphics({add:false}); g.fillStyle(0xffffff,1); g.fillCircle(5,5,5); g.generateTexture('pdot',10,10); g.destroy(); }

let camFit;
function create(){
  scene=this; const an=this.anims;
  makeDot(this);
  CARDS.forEach(c=>{ mkAnim(an,c.key+'-i',c.si,c.fi,8); mkAnim(an,c.key+'-r',c.sr,c.fr,11); });

  // ---- arena ----
  const g=this.add.graphics().setDepth(-100);
  g.fillStyle(0x3f6b34,1); g.fillRoundedRect(0,0,ARENA_W,ARENA_H,26);
  g.fillStyle(0x37602e,1); g.fillRect(0,0,ARENA_W,MID);                 // mitad enemiga apenas distinta
  g.fillStyle(0x2c5670,1); g.fillRect(0,MID-26,ARENA_W,52);             // río central
  g.lineStyle(3,0x1c3a24,1); g.strokeRoundedRect(2,2,ARENA_W-4,ARENA_H-4,26);
  for(let i=0;i<70;i++){ const gx=rint(10,ARENA_W-10),gy=rint(10,ARENA_H-10); if(Math.abs(gy-MID)<30)continue;
    this.add.circle(gx,gy,rint(2,4),0x2f5327,0.5).setDepth(-99); }
  // puentes sobre el río
  for(const bx of [ARENA_W*0.28, ARENA_W*0.72]){ this.add.rectangle(bx,MID,120,52,0x7a5a34).setDepth(-98); this.add.rectangle(bx,MID,120,52).setStrokeStyle(3,0x5a3f22).setDepth(-98); }

  // ---- torres ----
  const T=(side,x,y,king)=>{
    const img=this.add.image(x,y,king?'castle_black':(side==='you'?'tower_blue':'tower_red')).setOrigin(0.5,0.9).setScale(king?0.62:0.5).setDepth(y);
    if(side==='foe'&&!king) img.setTint(0xffb0b0);
    const hp=king?1000:560;
    const t={side,king,spr:img,x,y:y-30,hp,maxhp:hp,range:king?230:210,rate:king?1100:950,dmg:king?20:16,cd:rint(0,600),dead:false,hpbar:this.add.graphics().setDepth(99000)};
    S.towers.push(t); return t;
  };
  T('foe',ARENA_W*0.5,150,true); T('foe',ARENA_W*0.2,320); T('foe',ARENA_W*0.8,320);
  T('you',ARENA_W*0.5,ARENA_H-150,true); T('you',ARENA_W*0.2,ARENA_H-320); T('you',ARENA_W*0.8,ARENA_H-320);

  // zona de despliegue (tu mitad), se resalta al elegir carta
  S.zoneHi=this.add.graphics().setDepth(-90).setVisible(false);
  S.zoneHi.fillStyle(0x5fa5ff,0.10); S.zoneHi.fillRect(4,MID+26,ARENA_W-8,MID-30-146);
  S.zoneHi.lineStyle(2,0x5fa5ff,0.35); S.zoneHi.strokeRect(4,MID+26,ARENA_W-8,MID-30-146);

  // ---- cámara ----
  const cam=this.cameras.main; cam.setBounds(0,0,ARENA_W,ARENA_H);
  camFit=()=>{ const vw=this.scale.width, vh=this.scale.height; cam.setZoom(Math.min(vw/ARENA_W, vh/ARENA_H)); cam.centerOn(ARENA_W/2,ARENA_H/2); };
  camFit(); this.scale.on('resize',camFit);

  // ---- desplegar tocando tu mitad ----
  this.input.on('pointerdown',p=>{
    if(S.over) return; const wp=cam.getWorldPoint(p.x,p.y);
    if(wp.y<MID+40) return;                                // sólo tu mitad
    if(S.sel<0) { toast(L('Elegí una carta primero.','Pick a card first.')); return; }
    const key=S.hand[S.sel]; const c=CARD_BY_KEY[key]; if(!c) return;
    if(S.enYou<c.cost){ toast(L('Sin energía suficiente.','Not enough energy.')); return; }
    S.enYou-=c.cost; deploy(key,'you', clamp(wp.x,50,ARENA_W-50), clamp(wp.y,MID+70,ARENA_H-190));
    cycleHand(S.sel); S.sel=-1; renderHand();
  });

  buildDeck(); renderHand(); renderLocked(); refreshHUD();
  const sp=$('pvSplash'); if(sp){ sp.classList.add('hide'); setTimeout(()=>{ if(sp) sp.style.display='none'; },600); }
}

/* ===== mazo / mano ===== */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rint(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function buildDeck(){ S.deck=shuffle(unlockedKeys().slice()); S.hand=S.deck.splice(0,Math.min(4,S.deck.length)); }
function cycleHand(slot){ const used=S.hand[slot]; S.deck.push(used); S.hand[slot]=S.deck.shift(); }
function renderHand(){
  const box=$('hand'); if(!box) return; box.innerHTML='';
  S.hand.forEach((key,i)=>{
    const c=CARD_BY_KEY[key]; const el=document.createElement('button'); el.className='card'+(i===S.sel?' sel':'')+(S.enYou<c.cost?' poor':'');
    el.innerHTML='<span class="cthumb" style="background-image:url('+thumb(c)+')"></span><span class="cname">'+L(c.es,c.en)+'</span><span class="ccost">⚡'+c.cost+'</span>';
    el.onclick=()=>{ S.sel=(S.sel===i?-1:i); renderHand(); if(S.zoneHi) S.zoneHi.setVisible(S.sel>=0&&!S.over); };
    box.appendChild(el);
  });
  if(S.zoneHi) S.zoneHi.setVisible(S.sel>=0&&!S.over);
}
const _thumbs={};
function thumb(c){                                   // dibuja el frame 0 del sprite en un dataURL para la carta
  if(_thumbs[c.key]) return _thumbs[c.key];
  try{
    const src=scene.textures.get(c.si).getSourceImage(); const fw=FILES[c.si][1], fh=FILES[c.si][2];
    const cv=document.createElement('canvas'); cv.width=72; cv.height=72; const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
    cx.drawImage(src,0,0,fw,fh,4,4,64,64); const u=cv.toDataURL(); _thumbs[c.key]=u; return u;
  }catch(e){ return ''; }
}
function renderLocked(){
  const all=CARDS.length, un=unlockedKeys().length, locked=all-un; const b=$('lockMsg'); if(!b) return;
  if(locked<=0){ b.style.display='none'; return; }
  b.style.display='block';
  b.innerHTML='🔒 '+L(locked+' personajes bloqueados — ',locked+' characters locked — ')
    +'<a href="/beta">'+L('jugá la beta para desbloquearlos','play the beta to unlock them')+'</a>';
}

/* ===== unidades ===== */
function deploy(key,side,x,y){
  const c=CARD_BY_KEY[key]; if(!c||!scene) return;
  const s=scene.add.sprite(x,y,c.si,0).setOrigin(0.5,0.72).setScale(c.sc).setDepth(y);
  if(side==='foe') s.setTint(0xff9a9a);
  s.play(c.key+'-i');
  puff(x,y,side==='you'?0x8ec8ff:0xff9a9a);
  S.units.push({key,card:c,side,spr:s,hp:c.hp,maxhp:c.hp,dmg:c.dmg,sp:c.sp,range:c.range,rate:c.rate,cd:0,ranged:c.range>60,target:null,dead:false,flip:false,hpbar:scene.add.graphics().setDepth(99001)});
  sfx(side==='you'?'bell':'clash',0.25);
}
function nearestEnemyUnit(e,maxD){ let best=null,bd=maxD; for(const u of S.units){ if(u.dead||u.side===e.side) continue;
  const d=Math.hypot(u.spr.x-e.spr.x,u.spr.y-e.spr.y); if(d<bd){ bd=d; best=u; } } return best; }
function nearestEnemyTower(e){ let best=null,bd=1e9; for(const t of S.towers){ if(t.dead||t.side===e.side) continue;
  const d=Math.hypot(t.spr.x-e.spr.x,(t.y)-e.spr.y); if(d<bd){ bd=d; best=t; } } return best; }
function flashHit(o){                                     // parpadeo blanco + chispa al recibir daño
  if(!o.spr||!o.spr.active) return; spark(o.spr.x, o.spr.y-16);
  try{ o.spr.setTintFill(0xffffff); }catch(e){ return; }
  scene.time.delayedCall(70,()=>{ if(o.spr&&o.spr.active){ if(o.card&&o.side==='foe') o.spr.setTint(0xff9a9a); else o.spr.clearTint(); } });
}
function hurt(o,dmg){ if(o.dead) return; o.hp-=dmg; flashHit(o);
  if(o.hp>0) return; o.hp=0; o.dead=true; if(o.hpbar) o.hpbar.destroy();
  if(o.card){ deathPoof(o.spr, o.side); }                                     // unidad: se desvanece con humo
  else { boom(o.spr.x,o.spr.y-20); o.spr.destroy();                          // torre: explota
    if(o.side==='foe') S.crownsYou++; else S.crownsFoe++; refreshHUD();
    if(o.king) endGame(o.side==='foe'?'win':'lose'); } }
function drawBar(gr,x,y,w,ratio,col){ gr.clear(); if(ratio<=0) return; gr.fillStyle(0x120d09,0.8); gr.fillRect(x-w/2-1,y-1,w+2,6);
  gr.fillStyle(col,1); gr.fillRect(x-w/2,y,w*ratio,4); }

/* ===== disparos (a distancia) ===== */
function shoot(from,target,dmg,col){
  const s=scene.add.image(from.spr.x,from.spr.y-24,'pdot').setTint(col||0xffe08a).setScale(0.9).setDepth(99500);
  S.shots.push({spr:s,target,dmg,sp:520,dead:false});
}

/* ===== bucle ===== */
function update(time,delta){
  if(!scene) return; const dt=delta/1000;
  if(!S.over){
    S.regYou+=delta; if(S.regYou>=ENERGY_REGEN){ S.regYou=0; S.enYou=Math.min(ENERGY_MAX,S.enYou+1); renderHand(); refreshHUD(); }
    S.regFoe+=delta; if(S.regFoe>=ENERGY_REGEN){ S.regFoe=0; S.enFoe=Math.min(ENERGY_MAX,S.enFoe+1); }
    S.aiT+=delta; if(S.aiT>=S.aiNext){ S.aiT=0; S.aiNext=rint(2000,4200); aiPlay(); }
    S.timeAcc+=delta; if(S.timeAcc>=1000){ S.timeAcc-=1000; S.time--; refreshHUD();
      if(S.time<=0) endGame(S.crownsYou>S.crownsFoe?'win':S.crownsYou<S.crownsFoe?'lose':'draw'); }
  }
  // unidades
  for(const u of S.units){ if(u.dead) continue;
    u.cd-=delta;
    let tgt=nearestEnemyUnit(u, Math.max(u.range+50,150)) || nearestEnemyTower(u);
    if(!tgt){ u.spr.play(u.key+'-i',true); continue; }
    const tx=tgt.spr.x, ty=(tgt.card?tgt.spr.y:tgt.y), dx=tx-u.spr.x, dy=ty-u.spr.y, d=Math.hypot(dx,dy)||1;
    if(d<=u.range){                                       // atacar
      u.spr.play(u.key+'-i',true);
      if(u.cd<=0){ u.cd=u.rate; const dmg=tgt.card?u.dmg:Math.round(u.dmg*VS_TOWER);   // más daño a torres
        if(u.ranged) shoot(u,tgt,dmg,u.side==='you'?0x8ec8ff:0xff9a9a);
        else { hurt(tgt,dmg); miniLunge(u,dx,dy); }
      }
    } else {                                              // avanzar
      const sp=u.sp*dt; u.spr.x+=dx/d*sp; u.spr.y+=dy/d*sp;
      u.spr.play(u.key+'-r',true); if(Math.abs(dx)>1){ u.flip=dx<0; u.spr.setFlipX(u.flip); }
    }
    u.spr.setDepth(u.spr.y);
    drawBar(u.hpbar,u.spr.x,u.spr.y-46,34,u.hp/u.maxhp, u.side==='you'?0x5fa5ff:0xe5533a);
  }
  // torres
  for(const t of S.towers){ if(t.dead) continue; t.cd-=delta;
    const e=nearestEnemyUnit(t, t.range);
    if(e && t.cd<=0){ t.cd=t.rate; shoot(t,e,t.dmg, t.side==='you'?0x8ec8ff:0xff9a9a); }
    drawBar(t.hpbar,t.spr.x,t.y-52,t.king?60:44,t.hp/t.maxhp, t.side==='you'?0x5fa5ff:0xe5533a);
  }
  // disparos
  for(const sh of S.shots){ if(sh.dead) continue;
    if(!sh.target||sh.target.dead){ sh.dead=true; sh.spr.destroy(); continue; }
    const tx=sh.target.spr.x, ty=(sh.target.card?sh.target.spr.y-20:sh.target.y-10), dx=tx-sh.spr.x, dy=ty-sh.spr.y, d=Math.hypot(dx,dy)||1;
    if(d<12){ hurt(sh.target,sh.dmg); sh.dead=true; sh.spr.destroy(); }
    else { const sp=sh.sp*dt; sh.spr.x+=dx/d*sp; sh.spr.y+=dy/d*sp; }
  }
  S.units=S.units.filter(u=>!u.dead); S.shots=S.shots.filter(s=>!s.dead);
}
function miniLunge(u,dx,dy){ const d=Math.hypot(dx,dy)||1; scene.tweens.add({targets:u.spr,x:u.spr.x+dx/d*6,y:u.spr.y+dy/d*6,duration:90,yoyo:true}); }
function spark(x,y){ for(let i=0;i<3;i++){ const p=scene.add.circle(x+rint(-6,6),y+rint(-6,6),rint(2,3),0xffe08a,0.9).setDepth(99550);
  scene.tweens.add({targets:p,x:p.x+rint(-14,14),y:p.y-rint(6,18),alpha:0,duration:rint(220,380),onComplete:()=>p.destroy()}); } }
function deathPoof(spr,side){                             // muerte de unidad: humo + desvanecido
  if(!spr||!spr.active){ return; }
  const c=scene.add.circle(spr.x,spr.y-14,10,side==='you'?0x8ec8ff:0xff9a9a,0.5).setDepth(99450);
  scene.tweens.add({targets:c,radius:30,alpha:0,duration:360,onComplete:()=>c.destroy()});
  scene.tweens.add({targets:spr,alpha:0,scaleX:spr.scaleX*0.6,scaleY:spr.scaleY*0.6,y:spr.y+6,duration:340,ease:'Quad.easeIn',onComplete:()=>spr.destroy()});
}
function aiPlay(){                                         // IA: responde a tus avances y aprovecha la energía
  const affordable=FOE_POOL.map(k=>CARD_BY_KEY[k]).filter(c=>c&&c.cost<=S.enFoe);
  if(!affordable.length) return;
  const threats=S.units.filter(u=>u.side==='you'&&u.spr.y<MID+140);   // tropas tuyas cruzando a su terreno
  let x= threats.length ? clamp(pick(threats).spr.x+rint(-40,40),60,ARENA_W-60) : rint(70,ARENA_W-70);
  affordable.sort((a,b)=>b.cost-a.cost);
  const c = Math.random()<0.6 ? affordable[0] : pick(affordable);    // suele usar la carta más cara que puede pagar
  S.enFoe-=c.cost; deploy(c.key,'foe', x, rint(210,MID-70));
}

/* ===== fx / hud ===== */
function puff(x,y,col){ const c=scene.add.circle(x,y,8,col,0.5).setDepth(99400); scene.tweens.add({targets:c,radius:34,alpha:0,duration:400,onComplete:()=>c.destroy()}); }
function boom(x,y){ sfx('fire',0.4); const c=scene.add.circle(x,y,10,0xffb060,0.8).setDepth(99600); scene.tweens.add({targets:c,radius:60,alpha:0,duration:500,onComplete:()=>c.destroy()}); if(scene.cameras&&scene.cameras.main) scene.cameras.main.shake(200,0.006); }
let soundOn=false;
function sfx(k,v){ if(soundOn&&scene) try{ scene.sound.play('s_'+k,{volume:v||0.4}); }catch(e){} }
function refreshHUD(){ const ef=$('energyFill'); if(ef) ef.style.width=Math.round(S.enYou/ENERGY_MAX*100)+'%';
  const en=$('energyNum'); if(en) en.textContent=Math.floor(S.enYou);
  const cy=$('crownsYou'); if(cy) cy.textContent=S.crownsYou; const cf=$('crownsFoe'); if(cf) cf.textContent=S.crownsFoe;
  const tm=$('pvTimer'); if(tm){ const s=Math.max(0,S.time); tm.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); tm.classList.toggle('low',s<=20); } }
let toastT=null;
function toast(t){ const el=$('pvToast'); if(!el) return; el.textContent=t; el.classList.add('on'); if(toastT) clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('on'),1600); }
function endGame(result){ if(S.over) return; S.over=true; if(S.zoneHi) S.zoneHi.setVisible(false);
  sfx(result==='win'?'coins':'bong',0.6);
  const ov=$('pvEnd'), t=$('pvEndT'); if(!ov||!t) return;
  if(result==='win'){ t.textContent=L('¡VICTORIA!','VICTORY!'); t.style.color='#8fe08a'; }
  else if(result==='lose'){ t.textContent=L('DERROTA','DEFEAT'); t.style.color='#e5533a'; }
  else { t.textContent=L('EMPATE','DRAW'); t.style.color='#e9b04a'; }
  const sub=$('pvEndSub'); if(sub) sub.textContent='👑 '+S.crownsYou+' – '+S.crownsFoe+' 👑';
  ov.classList.add('on'); }

/* ===== controles del chrome ===== */
window.pvpStart=function(){ if(scene){ S.units.forEach(u=>{u.spr.destroy(); if(u.hpbar)u.hpbar.destroy();}); }
  location.reload(); };
window.addEventListener('DOMContentLoaded',()=>{
  const bs=$('btnSound'); if(bs) bs.onclick=()=>{ soundOn=!soundOn; bs.textContent=soundOn?L('SONIDO ✓','SOUND ✓'):L('SONIDO','SOUND');
    if(soundOn&&scene){ const c=scene.sound.context; if(c&&c.state==='suspended') c.resume(); } };
});
