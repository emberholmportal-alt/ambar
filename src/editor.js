/* Age of Fomo · Editor de escenarios (sandbox)
   Paleta con TODO el pack de Tiny Swords, colocación libre, transformar, cámara libre,
   cuadrícula opcional, zonas prearmadas, guardar/exportar. Sin backend: localStorage + JSON. */
(function(){
const $=id=>document.getElementById(id);
let MANIFEST=null, ITEMS=[], BYID={}, CATS=[];
let scene=null, game=null;
let placed=[], selected=null, selSet=[], dragOffs=null, brush=null, tool='select';
let gridOn=false, snapOn=false, GRID=64;
let loadedTex=new Set(), gridG=null, selG=null;
let spaceHeld=false, shiftHeld=false, panning=false, panLast=null, dragging=false, painting=false;
const SAVE_KEY='aoa_editor_scene';

/* ---------- arranque: primero el manifest, después Phaser ---------- */
fetch('assets/editor/manifest.json').then(r=>r.json()).then(m=>{
  MANIFEST=m; ITEMS=m.items; ITEMS.forEach(it=>BYID[it.id]=it);
  CATS=Object.keys(m.cats);
  buildPalette();
  boot();
}).catch(e=>{ toast('No se pudo cargar el catálogo de assets'); console.error(e); });

/* ---------- paleta (DOM, thumbnails animados por CSS) ---------- */
let curCat=null, curSearch='';
function buildPalette(){
  const cw=$('pcats'); cw.innerHTML='';
  const mk=(label,cat)=>{ const b=document.createElement('div'); b.className='pcat'+(cat===curCat?' on':''); b.textContent=label;
    b.onclick=()=>{ curCat=cat; curSearch=''; $('psearch').value=''; renderCats(); renderGrid(); }; return b; };
  cw.appendChild(mk('Todos',null));
  for(const c of CATS) cw.appendChild(mk(c,c));
  $('psearch').oninput=e=>{ curSearch=e.target.value.trim().toLowerCase(); renderGrid(); };
  curCat = CATS.includes('naturaleza')?'naturaleza':(CATS[0]||null);
  renderCats(); renderGrid();
}
function renderCats(){ [...$('pcats').children].forEach((b,i)=>{ const cat=i===0?null:CATS[i-1]; b.classList.toggle('on',cat===curCat); }); }
function renderGrid(){
  const g=$('pgrid'); g.innerHTML='';
  let list=ITEMS.filter(it=>(!curCat||it.cat===curCat)&&(!curSearch||it.id.includes(curSearch)));
  for(const it of list){
    const d=document.createElement('div'); d.className='pitem'+(brush&&brush.id===it.id?' on':''); d.dataset.id=it.id; d.title=it.id;
    if(it.frames>1){
      const a=document.createElement('div'); a.className='anim';
      a.style.backgroundImage='url('+it.file+')';
      a.style.backgroundSize=(it.frames*100)+'% 100%';
      a.style.backgroundPositionX='0%';
      a.style.animation='sheet '+(it.frames*0.13).toFixed(2)+'s steps('+Math.max(1,it.frames-1)+') infinite';
      d.appendChild(a);
    } else { d.style.backgroundImage='url('+it.file+')'; }
    d.onclick=()=>pickBrush(it,d);
    g.appendChild(d);
  }
  $('pcount').textContent=list.length+' assets'+(curCat?' · '+curCat:'');
}
function pickBrush(it,el){
  if(brush&&brush.id===it.id){ brush=null; el.classList.remove('on'); return; }   // click de nuevo = soltar pincel
  brush=it; [...$('pgrid').children].forEach(c=>c.classList.remove('on')); if(el) el.classList.add('on');
  if(scene) ensureTex(it,()=>{});   // precarga para que el primer click sea instantáneo
  setTool('select'); select(null);
}

/* ---------- Phaser ---------- */
function boot(){
  game=new Phaser.Game({ type:Phaser.AUTO, parent:'game', backgroundColor:'#123041',
    scale:{mode:Phaser.Scale.RESIZE,parent:'game',width:'100%',height:'100%'},
    render:{pixelArt:true,antialias:false}, scene:{create:create,update:update} });
}
function create(){
  scene=this;
  gridG=this.add.graphics().setDepth(-10000);
  selG=this.add.graphics().setDepth(100000);
  const cam=this.cameras.main; cam.centerOn(0,0);
  // input
  this.input.on('pointerdown',onDown); this.input.on('pointermove',onMove); this.input.on('pointerup',onUp);
  this.input.on('wheel',(p,o,dx,dy)=>{ const cam=this.cameras.main; const wp=cam.getWorldPoint(p.x,p.y);
    const z=Phaser.Math.Clamp(cam.zoom*(dy>0?0.88:1.14),0.15,4); cam.setZoom(z);
    const wp2=cam.getWorldPoint(p.x,p.y); cam.scrollX+=wp.x-wp2.x; cam.scrollY+=wp.y-wp2.y; updateZoom(); drawGrid(); });
  wireKeys(); wireToolbar(); wireInspector();
  loadScene(); drawGrid(); updateZoom();
  toast('Editor listo · elegí un asset y colocá');
}
function update(){ drawSel(); }

function ensureTex(it,cb){
  if(loadedTex.has(it.id)){ ensureAnim(it); cb(); return; }
  if(it.frames>1) scene.load.spritesheet(it.id,it.file,{frameWidth:it.fw,frameHeight:it.fh});
  else scene.load.image(it.id,it.file);
  scene.load.once('complete',()=>{ loadedTex.add(it.id); ensureAnim(it); cb(); });
  scene.load.start();
}
function ensureAnim(it){ if(it.frames>1 && !scene.anims.exists(it.id+'-a'))
  scene.anims.create({key:it.id+'-a',frames:scene.anims.generateFrameNumbers(it.id,{start:0,end:it.frames-1}),frameRate:it.fps||8,repeat:-1}); }

/* ---------- colocar / crear objeto ---------- */
function addObject(o){   // o: {id,x,y,scale,angle,flip,depth?}
  const it=BYID[o.id]; if(!it) return;
  ensureTex(it,()=>{
    const s = it.frames>1 ? scene.add.sprite(o.x,o.y,it.id) : scene.add.image(o.x,o.y,it.id);
    if(it.frames>1) s.play(it.id+'-a');
    s.setScale(o.scale||1).setAngle(o.angle||0).setFlipX(!!o.flip);
    const obj={spr:s,id:o.id,x:o.x,y:o.y,scale:o.scale||1,angle:o.angle||0,flip:!!o.flip};
    obj.depth = (o.depth!=null)?o.depth:o.y; s.setDepth(obj.depth);
    placed.push(obj);
    if(o._select!==false) select(obj);
  });
}
function placeAt(it,x,y){ if(snapOn){ x=Math.round(x/GRID)*GRID+GRID/2; y=Math.round(y/GRID)*GRID+GRID/2; } addObject({id:it.id,x,y,scale:1,angle:0}); scheduleSave(); }

/* ---------- selección (múltiple) + transform ---------- */
function pickAt(wx,wy){ for(let i=placed.length-1;i>=0;i--){ if(placed[i].floor) continue; const b=placed[i].spr.getBounds(); if(b.contains(wx,wy)) return placed[i]; } return null; }
function select(o,additive){ const insp=$('inspector');
  if(!o){ selSet=[]; selected=null; insp.classList.remove('on'); return; }
  if(additive){ const i=selSet.indexOf(o); if(i>=0) selSet.splice(i,1); else selSet.push(o); } else selSet=[o];
  selected=selSet[selSet.length-1]||null;
  if(!selected){ insp.classList.remove('on'); return; }
  insp.classList.add('on'); $('inScale').value=Math.round(selected.scale*100); $('inScaleV').textContent=Math.round(selected.scale*100)+'%';
  $('inAngle').value=Math.round(selected.angle); $('inAngleV').textContent=Math.round(selected.angle)+'°'; }
function drawSel(){ selG.clear(); const z=scene.cameras.main.zoom;
  selSet.forEach(o=>{ if(!o.spr.active) return; const b=o.spr.getBounds(); selG.lineStyle(2/z,o===selected?0xf0d564:0xc9a227,1).strokeRect(b.x,b.y,b.width,b.height); }); }
function applyScale(v){ selSet.forEach(o=>{ o.scale=v; o.spr.setScale(v); }); $('inScaleV').textContent=Math.round(v*100)+'%'; scheduleSave(); }
function applyAngle(v){ selSet.forEach(o=>{ o.angle=v; o.spr.setAngle(v); }); $('inAngleV').textContent=Math.round(v)+'°'; scheduleSave(); }
function duplicate(){ if(!selSet.length) return; selSet.forEach(o=>addObject({id:o.id,x:o.x+28,y:o.y+28,scale:o.scale,angle:o.angle,flip:o.flip,depth:o.depth,_select:false})); scheduleSave(); }
function delSel(){ if(!selSet.length) return; selSet.forEach(o=>{ const i=placed.indexOf(o); if(i>=0) placed.splice(i,1); o.spr.destroy(); }); select(null); scheduleSave(); }
function flipSel(){ selSet.forEach(o=>{ o.flip=!o.flip; o.spr.setFlipX(o.flip); }); scheduleSave(); }
function depthSel(dz){ selSet.forEach(o=>{ o.depth+=dz; o.spr.setDepth(o.depth); }); scheduleSave(); }

/* ---------- terreno: pasto / arena / meseta sobre el mar (autotile igual que el juego) ---------- */
let terrLoaded=false, terrTiles=new Map(), seaBg=null, terrType='grass', brushSize=3;
const tK=(x,y)=>x+','+y;
function ensureTerrain(cb){
  if(terrLoaded){ cb(); return; }
  scene.load.spritesheet('e_ground','assets/img/ts/ground.png',{frameWidth:64,frameHeight:64});
  scene.load.spritesheet('e_tmg','assets/img/ts/tilemap_grass.png',{frameWidth:64,frameHeight:64});
  scene.load.spritesheet('e_foam','assets/img/ts/foam.png',{frameWidth:192,frameHeight:192});
  scene.load.image('e_water','assets/img/ts/water.png');
  scene.load.once('complete',()=>{ terrLoaded=true;
    seaBg=scene.add.tileSprite(0,0,16000,16000,'e_water').setOrigin(0.5).setDepth(-10000); cb(); });
  scene.load.start();
}
const tget=(x,y)=>terrTiles.get(tK(x,y));
const isLandT=(x,y)=>!!tget(x,y);
const isSand=(x,y)=>{ const c=tget(x,y); return c&&c.t==='sand'; };
const isElev=(x,y)=>{ const c=tget(x,y); return c&&c.t==='elev'; };
function groundIdxE(x,y){ const n=isLandT(x,y-1),s=isLandT(x,y+1),w=isLandT(x-1,y),e=isLandT(x+1,y);
  if(n&&s&&w&&e)return 11; if(!n&&!w&&s&&e)return 0; if(!n&&!e&&s&&w)return 2; if(!s&&!w&&n&&e)return 20; if(!s&&!e&&n&&w)return 22;
  if(!n&&s)return 1; if(!s&&n)return 21; if(!w&&e)return 10; if(!e&&w)return 12; return 11; }
function sandIdxE(x,y){ const n=isSand(x,y-1),s=isSand(x,y+1),w=isSand(x-1,y),e=isSand(x+1,y);   // arena/camino (cols 5-7 de ground)
  if(n&&s&&w&&e)return 16; if(!n&&!w&&s&&e)return 5; if(!n&&!e&&s&&w)return 7; if(!s&&!w&&n&&e)return 25; if(!s&&!e&&n&&w)return 27;
  if(!n&&s)return 6; if(!s&&n)return 26; if(!w&&e)return 15; if(!e&&w)return 17; return 16; }
function geIdxE(x,y){ const n=isElev(x,y-1),s=isElev(x,y+1),w=isElev(x-1,y),e=isElev(x+1,y);   // cima de meseta (tmg)
  if(n&&s&&w&&e)return 15; if(!n&&!w)return 5; if(!n&&!e)return 8; if(!s&&!w)return 32; if(!s&&!e)return 35;
  if(!n)return 6; if(!s)return 33; if(!w)return 14; if(!e)return 17; return 15; }
function gcIdxE(x,cy){ const l=isElev(x-1,cy-1)&&!isElev(x-1,cy), r=isElev(x+1,cy-1)&&!isElev(x+1,cy);   // cara de acantilado (tmg 41-44)
  return l&&r?42:(!l&&r)?41:(l&&!r)?44:43; }
function retileTerr(x,y){ const c=tget(x,y); if(!c)return;
  if(c.t==='elev') c.spr.setTexture('e_tmg').setFrame(geIdxE(x,y)).setDepth(-8850);
  else if(c.t==='sand') c.spr.setTexture('e_ground').setFrame(sandIdxE(x,y)).setDepth(-8950);
  else c.spr.setTexture('e_ground').setFrame(groundIdxE(x,y)).setDepth(-9000);
  // foam: sólo tierra a nivel del mar con vecino agua
  const coast=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!isLandT(x+dx,y+dy));
  if(coast&&!c.foam){ c.foam=scene.add.image(x*64+32,y*64+32,'e_foam').setFrame((x*3+y)%8).setDepth(-9500); }
  else if(!coast&&c.foam){ c.foam.destroy(); c.foam=null; }
  // acantilado: cara de piedra en la fila de abajo de una meseta cuyo sur no es meseta
  const needCliff = c.t==='elev' && !isElev(x,y+1);
  if(needCliff){ if(!c.cliff) c.cliff=scene.add.image(x*64+32,(y+1)*64+32,'e_tmg').setDepth(-8500);
    c.cliff.setFrame(gcIdxE(x,y+1)); }
  else if(c.cliff){ c.cliff.destroy(); c.cliff=null; }
}
function paintTile(x,y,type){
  const k=tK(x,y);
  if(type==='water'){ const c=terrTiles.get(k); if(c){ c.spr.destroy(); if(c.foam)c.foam.destroy(); if(c.cliff)c.cliff.destroy(); terrTiles.delete(k); } }
  else { let c=terrTiles.get(k); if(!c){ c={t:type,spr:scene.add.image(x*64+32,y*64+32,'e_ground',11),foam:null,cliff:null}; terrTiles.set(k,c); } c.t=type; }
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) retileTerr(x+dx,y+dy);   // radio 2: el acantilado depende de la fila de arriba
}
function paintAt(wx,wy){
  const cx=Math.floor(wx/64), cy=Math.floor(wy/64), r=(brushSize-1)/2;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++) paintTile(cx+dx,cy+dy,terrType);
  scheduleSave();
}

/* ---------- puntero: place / select / drag / pan / pintar ---------- */
function onDown(p){
  const cam=scene.cameras.main, wp=cam.getWorldPoint(p.x,p.y);
  if(tool==='pan'||spaceHeld||p.middleButtonDown()){ panning=true; panLast={x:p.x,y:p.y}; return; }
  if(p.rightButtonDown()){ if(brush){brush=null;renderGrid();} else select(null); return; }
  if(tool==='terrain'){ ensureTerrain(()=>paintAt(wp.x,wp.y)); painting=true; return; }
  if(brush){ placeAt(brush,wp.x,wp.y); return; }
  const hit=pickAt(wp.x,wp.y);
  if(hit){
    if(shiftHeld){ select(hit,true); return; }                    // shift-click = sumar/quitar de la selección
    if(selSet.indexOf(hit)<0) select(hit,false);
    dragging=true; dragOffs=selSet.map(o=>({o,dx:o.spr.x-wp.x,dy:o.spr.y-wp.y}));   // arrastra TODO lo seleccionado
  } else { if(!shiftHeld) select(null); panning=true; panLast={x:p.x,y:p.y}; }       // click en vacío arrastra la cámara
}
function onMove(p){
  const cam=scene.cameras.main;
  if(painting&&terrLoaded){ const wp=cam.getWorldPoint(p.x,p.y); paintAt(wp.x,wp.y); return; }
  if(panning&&panLast){ cam.scrollX-=(p.x-panLast.x)/cam.zoom; cam.scrollY-=(p.y-panLast.y)/cam.zoom; panLast={x:p.x,y:p.y}; drawGrid(); return; }
  if(dragging&&dragOffs){ const wp=cam.getWorldPoint(p.x,p.y);
    dragOffs.forEach(({o,dx,dy})=>{ let x=wp.x+dx,y=wp.y+dy; if(snapOn){ x=Math.round(x/GRID)*GRID+GRID/2; y=Math.round(y/GRID)*GRID+GRID/2; }
      o.spr.setPosition(x,y); o.x=x; o.y=y; o.depth=y; o.spr.setDepth(y); }); }
}
function onUp(){ if(dragging||painting) scheduleSave(); panning=false; dragging=false; painting=false; panLast=null; }

/* ---------- cuadrícula ---------- */
function drawGrid(){ gridG.clear(); if(!gridOn) return; const cam=scene.cameras.main, v=cam.worldView;
  gridG.lineStyle(1/cam.zoom,0xffffff,0.10);
  const x0=Math.floor(v.x/GRID)*GRID, y0=Math.floor(v.y/GRID)*GRID;
  for(let x=x0;x<v.right+GRID;x+=GRID) gridG.lineBetween(x,v.top,x,v.bottom);
  for(let y=y0;y<v.bottom+GRID;y+=GRID) gridG.lineBetween(v.left,y,v.right,y);
}

/* ---------- zona nueva (suelo + objetos predefinidos) ---------- */
function addZone(){
  const cam=scene.cameras.main, cx=Math.round(cam.midPoint.x), cy=Math.round(cam.midPoint.y);
  // suelo: rectángulo de pasto redondeado, al fondo
  const g=scene.add.graphics().setDepth(-9000);
  g.fillStyle(0x5a9e3f,1).fillRoundedRect(cx-260,cy-180,520,360,40);
  g.fillStyle(0x6bb04a,0.5).fillRoundedRect(cx-240,cy-160,480,320,36);
  placed.push({spr:g,id:'__floor',x:cx,y:cy,scale:1,angle:0,flip:false,depth:-9000,floor:true});
  // objetos predefinidos de la zona: árbol, roca, arbusto (los primeros que existan en el catálogo)
  const pick=(cat)=>ITEMS.find(it=>it.cat===cat);
  const seed=[[pick('naturaleza'),cx-120,cy-60],[pick('naturaleza'),cx+90,cy+40],[pick('rocas'),cx+150,cy-70],[pick('naturaleza'),cx-30,cy+90]];
  for(const [it,x,y] of seed){ if(it) addObject({id:it.id,x,y,scale:1,angle:0,_select:false}); }
  toast('Zona agregada'); scheduleSave();
}

/* ---------- guardar / cargar / exportar ---------- */
let saveT=null;
function scheduleSave(){ clearTimeout(saveT); saveT=setTimeout(()=>{ snapshot(); saveScene(); },350); }

/* ---------- deshacer / rehacer (snapshots del escenario) ---------- */
let undoStack=[], redoStack=[], lastSnap=null, restoring=false;
function curState(){ return JSON.stringify(sceneData()); }
function snapshot(){ if(restoring) return; const s=curState(); if(s===lastSnap) return;
  if(lastSnap!==null){ undoStack.push(lastSnap); if(undoStack.length>80) undoStack.shift(); redoStack=[]; } lastSnap=s; }
function restore(s){ restoring=true; placed.filter(o=>!o.floor).forEach(o=>o.spr.destroy()); placed=placed.filter(o=>o.floor); clearTerr(); select(null);
  loadSceneData(JSON.parse(s)); lastSnap=s; restoring=false; try{ localStorage.setItem(SAVE_KEY,s); }catch(e){} }
function undo(){ if(!undoStack.length){ toast('Nada que deshacer'); return; } redoStack.push(curState()); restore(undoStack.pop()); toast('Deshacer'); }
function redo(){ if(!redoStack.length){ toast('Nada que rehacer'); return; } undoStack.push(curState()); restore(redoStack.pop()); toast('Rehacer'); }
function serialize(){ return placed.filter(o=>!o.floor).map(o=>({id:o.id,x:Math.round(o.x),y:Math.round(o.y),scale:+o.scale.toFixed(3),angle:Math.round(o.angle),flip:o.flip,depth:Math.round(o.depth)})); }
function serializeTerr(){ const a=[]; for(const [k,c] of terrTiles) a.push(c.t==='grass'?k:k+':'+c.t); return a; }   // "x,y" (pasto) o "x,y:sand" / ":elev"
function sceneData(){ return {objs:serialize(), terr:serializeTerr()}; }
function saveScene(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(sceneData())); }catch(e){} }
function loadSceneData(d){
  const objs = Array.isArray(d)?d:(d&&d.objs)||[];   // compat: formato viejo = array de objetos
  const terr = (d&&d.terr)||[];
  objs.forEach(o=>{ o._select=false; addObject(o); });
  if(terr.length) ensureTerrain(()=>{
    terr.forEach(s=>{ const i=s.indexOf(':'), k=i<0?s:s.slice(0,i), t=i<0?'grass':s.slice(i+1); const [x,y]=k.split(',').map(Number);
      if(!terrTiles.get(k)) terrTiles.set(k,{t,spr:scene.add.image(x*64+32,y*64+32,'e_ground',11),foam:null,cliff:null}); else terrTiles.get(k).t=t; });
    for(const s of terr){ const i=s.indexOf(':'), k=i<0?s:s.slice(0,i); const [x,y]=k.split(',').map(Number); retileTerr(x,y); retileTerr(x,y+1); }
  });
}
function loadScene(){ let d=null; try{ d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); }catch(e){} if(d) loadSceneData(d); }
function clearTerr(){ for(const c of terrTiles.values()){ c.spr.destroy(); if(c.foam)c.foam.destroy(); } terrTiles.clear(); }
function clearAll(){ if(!confirm('¿Vaciar todo el escenario?')) return; placed.forEach(o=>o.spr.destroy()); placed=[]; clearTerr(); select(null); saveScene(); toast('Escenario vacío'); }
function exportJSON(){ const blob=new Blob([JSON.stringify(sceneData(),null,1)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='escenario.json'; a.click(); toast('Exportado'); }
function importJSON(file){ const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result);
  placed.filter(o=>!o.floor).forEach(o=>o.spr.destroy()); placed=placed.filter(o=>o.floor); clearTerr();
  loadSceneData(d); saveScene(); toast('Importado'); }catch(e){ toast('JSON inválido'); } }; r.readAsText(file); }

/* ---------- UI ---------- */
function setTool(t){ tool=t; $('toolSelect').classList.toggle('on',t==='select'); $('toolPan').classList.toggle('on',t==='pan');
  ['grass','sand','elev','water'].forEach(tt=>{ const b=$('br'+tt[0].toUpperCase()+tt.slice(1)); if(b) b.classList.toggle('on',t==='terrain'&&terrType===tt); });
  if(t!=='select'){ brush=null; renderGrid(); } if(t==='terrain') select(null); }
function updateZoom(){ $('zoomInfo').textContent=Math.round(scene.cameras.main.zoom*100)+'%'; }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('on'),1800); }
function wireToolbar(){
  $('toolSelect').onclick=()=>setTool('select'); $('toolPan').onclick=()=>setTool('pan');
  $('btnGrid').onclick=()=>{ gridOn=!gridOn; $('btnGrid').classList.toggle('on',gridOn); drawGrid(); };
  $('btnSnap').onclick=()=>{ snapOn=!snapOn; $('btnSnap').classList.toggle('on',snapOn); };
  $('btnZone').onclick=addZone;
  $('brGrass').onclick=()=>{ terrType='grass'; setTool('terrain'); };
  $('brSand').onclick=()=>{ terrType='sand'; setTool('terrain'); };
  $('brElev').onclick=()=>{ terrType='elev'; setTool('terrain'); };
  $('brWater').onclick=()=>{ terrType='water'; setTool('terrain'); };
  $('brSize').onchange=e=>{ brushSize=+e.target.value; };
  $('btnSave').onclick=()=>{ saveScene(); toast('Guardado'); };
  $('btnExport').onclick=exportJSON; $('btnImport').onclick=()=>$('fileIn').click();
  $('fileIn').onchange=e=>{ if(e.target.files[0]) importJSON(e.target.files[0]); };
  $('btnClear').onclick=clearAll;
  $('btnUndo').onclick=undo; $('btnRedo').onclick=redo;
  $('btnPalette').onclick=()=>$('palette').classList.toggle('hide');
}
function wireInspector(){
  $('inScale').oninput=e=>applyScale(+e.target.value/100);
  $('inAngle').oninput=e=>applyAngle(+e.target.value);
  $('inDup').onclick=duplicate; $('inFlip').onclick=flipSel; $('inDel').onclick=delSel;
  $('inFront').onclick=()=>depthSel(500); $('inBack').onclick=()=>depthSel(-500);
}
function wireKeys(){
  window.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT') return;
    if(e.key==='Shift') shiftHeld=true;
    if(e.code==='Space'){ spaceHeld=true; e.preventDefault(); }
    else if(e.key==='v'||e.key==='V') setTool('select');
    else if(e.key==='h'||e.key==='H') setTool('pan');
    else if(e.key==='g'||e.key==='G'){ gridOn=!gridOn; $('btnGrid').classList.toggle('on',gridOn); drawGrid(); }
    else if(e.key==='Delete'||e.key==='Backspace'){ delSel(); }
    else if((e.ctrlKey||e.metaKey)&&(e.key==='d')){ e.preventDefault(); duplicate(); }
    else if((e.ctrlKey||e.metaKey)&&(e.key==='z')){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); }
    else if((e.ctrlKey||e.metaKey)&&(e.key==='y')){ e.preventDefault(); redo(); }
    else if((e.ctrlKey||e.metaKey)&&(e.key==='s')){ e.preventDefault(); saveScene(); toast('Guardado'); }
    else if(e.key==='f'||e.key==='F') flipSel();
    else if(e.key==='Escape'){ brush=null; renderGrid(); select(null); }
    else if(selected){
      if(e.key==='[') applyScale(Math.max(0.1,selected.scale*0.9));
      else if(e.key===']') applyScale(Math.min(4,selected.scale*1.1));
      else if(e.key===',') applyAngle(((selected.angle-15+540)%360)-180);
      else if(e.key==='.') applyAngle(((selected.angle+15+540)%360)-180);
    }
  });
  window.addEventListener('keyup',e=>{ if(e.code==='Space') spaceHeld=false; if(e.key==='Shift') shiftHeld=false; });
}
})();
