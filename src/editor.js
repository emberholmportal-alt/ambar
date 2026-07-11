/* Age of Fomo · Editor de escenarios (sandbox)
   Paleta con TODO el pack de Tiny Swords, colocación libre, transformar, cámara libre,
   cuadrícula opcional, zonas prearmadas, guardar/exportar. Sin backend: localStorage + JSON. */
(function(){
const $=id=>document.getElementById(id);
let MANIFEST=null, ITEMS=[], BYID={}, CATS=[];
let scene=null, game=null;
let placed=[], selected=null, brush=null, tool='select';
let gridOn=false, snapOn=false, GRID=64;
let loadedTex=new Set(), gridG=null, selG=null;
let spaceHeld=false, panning=false, panLast=null, dragging=false, dragOff=null;
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

/* ---------- selección + transform ---------- */
function pickAt(wx,wy){ for(let i=placed.length-1;i>=0;i--){ const b=placed[i].spr.getBounds(); if(b.contains(wx,wy)) return placed[i]; } return null; }
function select(o){ selected=o; const insp=$('inspector'); if(!o){ insp.classList.remove('on'); return; }
  insp.classList.add('on'); $('inScale').value=Math.round(o.scale*100); $('inScaleV').textContent=Math.round(o.scale*100)+'%';
  $('inAngle').value=Math.round(o.angle); $('inAngleV').textContent=Math.round(o.angle)+'°'; }
function drawSel(){ selG.clear(); if(!selected||!selected.spr.active) return; const b=selected.spr.getBounds();
  selG.lineStyle(2/scene.cameras.main.zoom,0xf0d564,1).strokeRect(b.x,b.y,b.width,b.height); }
function applyScale(v){ if(!selected) return; selected.scale=v; selected.spr.setScale(v); $('inScaleV').textContent=Math.round(v*100)+'%'; scheduleSave(); }
function applyAngle(v){ if(!selected) return; selected.angle=v; selected.spr.setAngle(v); $('inAngleV').textContent=Math.round(v)+'°'; scheduleSave(); }
function duplicate(){ if(!selected) return; const o=selected; addObject({id:o.id,x:o.x+28,y:o.y+28,scale:o.scale,angle:o.angle,flip:o.flip,depth:o.depth}); scheduleSave(); }
function delSel(){ if(!selected) return; const i=placed.indexOf(selected); if(i>=0) placed.splice(i,1); selected.spr.destroy(); select(null); scheduleSave(); }
function flipSel(){ if(!selected) return; selected.flip=!selected.flip; selected.spr.setFlipX(selected.flip); scheduleSave(); }
function depthSel(dz){ if(!selected) return; selected.depth+=dz; selected.spr.setDepth(selected.depth); scheduleSave(); }

/* ---------- puntero: place / select / drag / pan ---------- */
function onDown(p){
  const cam=scene.cameras.main, wp=cam.getWorldPoint(p.x,p.y);
  if(tool==='pan'||spaceHeld||p.middleButtonDown()){ panning=true; panLast={x:p.x,y:p.y}; return; }
  if(p.rightButtonDown()){ if(brush){brush=null;renderGrid();} else select(null); return; }
  if(brush){ placeAt(brush,wp.x,wp.y); return; }
  const hit=pickAt(wp.x,wp.y);
  if(hit){ select(hit); dragging=true; dragOff={x:hit.spr.x-wp.x,y:hit.spr.y-wp.y}; } else { select(null); panning=true; panLast={x:p.x,y:p.y}; }   // click en vacío arrastra la cámara
}
function onMove(p){
  const cam=scene.cameras.main;
  if(panning&&panLast){ cam.scrollX-=(p.x-panLast.x)/cam.zoom; cam.scrollY-=(p.y-panLast.y)/cam.zoom; panLast={x:p.x,y:p.y}; drawGrid(); return; }
  if(dragging&&selected){ const wp=cam.getWorldPoint(p.x,p.y); let x=wp.x+dragOff.x,y=wp.y+dragOff.y;
    if(snapOn){ x=Math.round(x/GRID)*GRID+GRID/2; y=Math.round(y/GRID)*GRID+GRID/2; }
    selected.spr.setPosition(x,y); selected.x=x; selected.y=y; selected.depth=y; selected.spr.setDepth(y); }
}
function onUp(){ if(dragging) scheduleSave(); panning=false; dragging=false; panLast=null; }

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
function scheduleSave(){ clearTimeout(saveT); saveT=setTimeout(saveScene,400); }
function serialize(){ return placed.filter(o=>!o.floor).map(o=>({id:o.id,x:Math.round(o.x),y:Math.round(o.y),scale:+o.scale.toFixed(3),angle:Math.round(o.angle),flip:o.flip,depth:Math.round(o.depth)})); }
function saveScene(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(serialize())); }catch(e){} }
function loadScene(){ let d=null; try{ d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); }catch(e){}
  if(d&&d.length){ d.forEach(o=>{ o._select=false; addObject(o); }); } }
function clearAll(){ if(!confirm('¿Vaciar todo el escenario?')) return; placed.forEach(o=>o.spr.destroy()); placed=[]; select(null); saveScene(); toast('Escenario vacío'); }
function exportJSON(){ const blob=new Blob([JSON.stringify(serialize(),null,1)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='escenario.json'; a.click(); toast('Exportado'); }
function importJSON(file){ const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result);
  placed.filter(o=>!o.floor).forEach(o=>o.spr.destroy()); placed=placed.filter(o=>o.floor);
  d.forEach(o=>{ o._select=false; addObject(o); }); saveScene(); toast('Importado'); }catch(e){ toast('JSON inválido'); } }; r.readAsText(file); }

/* ---------- UI ---------- */
function setTool(t){ tool=t; $('toolSelect').classList.toggle('on',t==='select'); $('toolPan').classList.toggle('on',t==='pan');
  if(t==='pan'){ brush=null; renderGrid(); } }
function updateZoom(){ $('zoomInfo').textContent=Math.round(scene.cameras.main.zoom*100)+'%'; }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('on'),1800); }
function wireToolbar(){
  $('toolSelect').onclick=()=>setTool('select'); $('toolPan').onclick=()=>setTool('pan');
  $('btnGrid').onclick=()=>{ gridOn=!gridOn; $('btnGrid').classList.toggle('on',gridOn); drawGrid(); };
  $('btnSnap').onclick=()=>{ snapOn=!snapOn; $('btnSnap').classList.toggle('on',snapOn); };
  $('btnZone').onclick=addZone;
  $('btnSave').onclick=()=>{ saveScene(); toast('Guardado'); };
  $('btnExport').onclick=exportJSON; $('btnImport').onclick=()=>$('fileIn').click();
  $('fileIn').onchange=e=>{ if(e.target.files[0]) importJSON(e.target.files[0]); };
  $('btnClear').onclick=clearAll;
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
    if(e.code==='Space'){ spaceHeld=true; e.preventDefault(); }
    else if(e.key==='v'||e.key==='V') setTool('select');
    else if(e.key==='h'||e.key==='H') setTool('pan');
    else if(e.key==='g'||e.key==='G'){ gridOn=!gridOn; $('btnGrid').classList.toggle('on',gridOn); drawGrid(); }
    else if(e.key==='Delete'||e.key==='Backspace'){ delSel(); }
    else if((e.ctrlKey||e.metaKey)&&(e.key==='d')){ e.preventDefault(); duplicate(); }
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
  window.addEventListener('keyup',e=>{ if(e.code==='Space') spaceHeld=false; });
}
})();
