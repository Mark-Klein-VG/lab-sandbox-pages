/* Combat Lab v0.3 — pixel-art battle presentation, non-canon mechanics sandbox. */
(function(){
"use strict";
const E=window.CombatEngine, M=window.CombatMetrics, A=window.CombatAudio, Export=window.CombatConfigExport;
const W=640,H=360,KEYS=["A","B","C"],STAGE_H=256;
const HERO_IDS=["Á","L","T","I"], ENEMY_X=[46,111,176,241], ROW_Y=[47,97,147,197];
const HERO_X=530,heroY={Á:47,L:97,T:147,I:197};
let config=null,state=null,events=[],popups=[],view=null,canvas=null,ctx=null,image=null;
let stage="root",category="attack",mainChoice=0,subChoice=0,enemyIndex=0;
let pending=null,closing=null,paused=false,pauseStart=0,modal=null,gamepadBefore=[],lastStick=0,raf=0;
let animationSpeed="normal",musicLevel=45,sfxLevel=65,frameClock=0;
const get=id=>document.getElementById(id);
const num=v=>String(v),pad=n=>String(n).padStart(2,"0");
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const colors={hp:"#bce8ad",def:"#c3d4e7",foc:"#7fd0ff",mp:"#ddaaeb"};
function ensureView(){
 if(view)return;
 view=document.createElement("section");view.id="pixel-play";
 view.innerHTML='<div class="pixel-topbar"><div><b>AMÁLIAVÁROS / COMBAT LAB</b> <span id="pixel-subtitle">SNES TEST BUILD · NON-CANON</span></div><button id="pixel-pause-button" type="button">☰ Pause / Options</button></div>'+
 '<div class="pixel-frame"><canvas id="pixel-canvas" width="640" height="360" tabindex="0" role="application" aria-label="Final Fantasy stílusú harci képernyő. Nyilak: navigáció, Enter: megerősítés, Backspace: vissza, Esc: szünet"></canvas>'+
 '<div id="pixel-overlay" class="pixel-overlay" hidden></div></div>'+
 '<p class="pixel-help">Egér: kattintás az ellenfélre vagy menüpontra · D-pad / bal analóg: navigáció · A / ✕: OK · B / ○: Vissza · LB/RB: célpont · Options: Pause · Enter / Backspace / Esc</p>'+
 '<p class="pixel-music-credit">Harci zene: <a href="https://opengameart.org/content/jrpg-epic-rock-battle-theme-1" target="_blank" rel="noopener noreferrer">HydroGene — JRPG Epic Rock Battle Theme #1 (CC0)</a></p>'+
 '<div id="pixel-result" class="pixel-result" hidden></div>';
 const old=get("battle-screen");old.after(view);
 canvas=get("pixel-canvas");ctx=canvas.getContext("2d",{alpha:false});ctx.imageSmoothingEnabled=false;
 image=new Image();image.src="./assets/first-batch-party.png";image.onload=()=>draw();
 canvas.addEventListener("click",clickCanvas);
 canvas.addEventListener("mousemove",moveCanvas);
 get("pixel-pause-button").addEventListener("click",()=>{A.sfx("confirm");togglePause();});
 get("pixel-overlay").addEventListener("click",overlayClick);
 get("pixel-overlay").addEventListener("input",overlayInput);
 get("pixel-result").addEventListener("click",resultClick);
}
function storePrefs(){
 try{localStorage.setItem("mechanics-lab-presentation-v03",JSON.stringify({animationSpeed,musicLevel,sfxLevel}));}catch(_){}
}
function restorePrefs(){
 try{
  const p=JSON.parse(localStorage.getItem("mechanics-lab-presentation-v03")||"{}");
  if(["normal","fast","instant"].includes(p.animationSpeed))animationSpeed=p.animationSpeed;
  if(Number.isFinite(p.musicLevel))musicLevel=Math.min(100,Math.max(0,p.musicLevel));
  if(Number.isFinite(p.sfxLevel))sfxLevel=Math.min(100,Math.max(0,p.sfxLevel));
 }catch(_){}
 A.volumes(musicLevel/100,sfxLevel/100);
}
function start(input,exit){
 ensureView();config=E.validate(input);state=E.makeBattle(config);events=[];popups=[];view.hidden=false;
 view.dataset.phase="combat";view.onExit=exit;stage="root";category="attack";mainChoice=0;subChoice=0;enemyIndex=0;
 pending=null;closing=null;paused=false;modal=null;get("pixel-overlay").hidden=true;get("pixel-result").hidden=true;
 document.querySelector(".combat-shell")?.classList.add("battle-active");
 restorePrefs();A.start();frameClock=performance.now();
 if(!raf)raf=requestAnimationFrame(tick);
 draw();
 requestAnimationFrame(()=>{if(view&&!view.hidden){view.scrollIntoView({block:"start",behavior:"auto"});canvas.focus({preventScroll:true});}});
}
function stop(){
 if(view)view.hidden=true;
 document.querySelector(".combat-shell")?.classList.remove("battle-active");
 A.stop();state=null;pending=null;closing=null;popups=[];paused=false;modal=null;
}
function newMatch(){
 if(!config)return;
 state=E.makeBattle(config);events=[];popups=[];pending=null;closing=null;paused=false;modal=null;
 stage="root";category="attack";mainChoice=0;subChoice=0;enemyIndex=0;
 get("pixel-overlay").hidden=true;get("pixel-result").hidden=true;
 view.dataset.phase="combat";A.start();
}
function liveEnemies(){return state?state.enemies.filter(x=>x.hp>0):[];}
function focusTarget(id){
 const list=liveEnemies(),idx=list.findIndex(x=>x.id===id);
 enemyIndex=Math.max(0,idx);
 if(list[enemyIndex])state.target=list[enemyIndex].id;
}
function cycleTarget(dir){
 const list=liveEnemies();
 if(!list.length)return;
 enemyIndex=(enemyIndex+dir+list.length)%list.length;
 state.target=list[enemyIndex].id;A.sfx("cursor");
}
function moveTargetSpatial(direction){
 if(!state||stage!=="target"||!liveEnemies().length)return;
 const id=window.CombatTargetGrid.select(state.enemies,state.target,direction,ENEMY_X.length);
 if(id&&id!==state.target){focusTarget(id);A.sfx("cursor");}
}
function unitPos(id){
 const h=HERO_IDS.indexOf(id);
 if(h>=0)return {x:HERO_X,y:heroY[id]};
 const n=state.enemies.findIndex(x=>x.id===id);
 return n>=0?{x:ENEMY_X[n%4],y:ROW_Y[Math.floor(n/4)]}:{x:0,y:0};
}
function doAction(kind,key,target){
 if(!state||state.winner||pending||closing||paused)return;
 const actor=E.active(state);
 if(!actor)return;
 const before=M.snapshot(state),round=state.round,side="party";
 const type=kind==="attack"?actor.attacks[KEYS.indexOf(key)].type:kind==="fallback"?"physical":null;
 try{E.act(state,kind,key,target,{deferEnemy:true});}
 catch(err){notify(err.message);A.sfx("back");return;}
 const event=M.makeEvent(before,M.snapshot(state),{round,side,actor:actor.id,kind,key,target:target||null,type});
 events.push(event);stage="root";mainChoice=0;subChoice=0;
 registerPopup(event);
 A.sfx(kind==="guard"?"guard":"attack",type||"physical",Math.max(0,KEYS.indexOf(key)));
 pending={event,start:performance.now(),duration:duration(),side,kind};
 if(animationSpeed==="instant"){pending=null;afterAction();}
}
function duration(){return animationSpeed==="instant"?0:animationSpeed==="fast"?295:600;}
function registerPopup(event){
 if(animationSpeed==="instant")return;
 const target=event.target||event.actor;
 popups=popups.filter(p=>(p.event.target||p.event.actor)!==target);
 popups.push({event,start:performance.now(),base:duration()});
}
function afterAction(){
 if(state.winner){finishAnimation();return;}
 if(state.phase==="enemy"){setTimeout(()=>{if(!paused&&state&&state.phase==="enemy"&&!pending)stepEnemy();},animationSpeed==="instant"?0:135);}
 else {const list=liveEnemies();if(list.length&&!list.some(x=>x.id===state.target))focusTarget(list[0].id);}
}
function stepEnemy(){
 if(!state||paused||pending||closing||state.phase!=="enemy")return;
 const before=M.snapshot(state),step=E.stepEnemy(state);
 if(!step){if(state.winner)finishAnimation();return;}
 const ev=M.makeEvent(before,M.snapshot(state),{...step,side:"enemies"});
 events.push(ev);
 registerPopup(ev);
 A.sfx(step.kind==="guard"?"guard":"attack",step.type||"physical",Math.max(0,KEYS.indexOf(step.key)));
 pending={event:ev,start:performance.now(),duration:duration(),side:"enemies",kind:step.kind};
 if(animationSpeed==="instant"){pending=null;afterAction();}
}
function finishAnimation(){
 if(!state||!state.winner||closing)return;
 stage="done";A.stop();
 const wait=animationSpeed==="instant"?0:animationSpeed==="fast"?1150:2300;
 closing={start:performance.now(),duration:wait};
 if(wait===0){showResults();return;}
 A.fanfare(state.winner==="party",animationSpeed==="fast"?2:1);
}
function skipEnd(){if(closing&&!get("pixel-result").hidden)return; if(closing){A.stop();showResults();}}
function showResults(){
 if(!state||!state.winner)return;
 closing=null;pending=null;A.stop();stage="done";
 view.dataset.phase="results";
 const report=M.buildReport(config,state,events);
 view.report=report;
 const summary=report.participants.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+ (r.side==="party"?"Csapat":"Ellenfél")+'</td><td>'+r.actions+'</td><td>'+r.dealt.hp+'</td><td>'+r.dealt.def+'</td><td>'+r.dealt.foc+'</td><td>'+r.received.hp+'</td><td>'+r.received.def+'</td><td>'+r.received.foc+'</td><td>'+r.recovered.hp+'</td><td>'+r.recovered.def+'</td><td>'+r.recovered.foc+'</td><td>'+r.recovered.mp+'</td><td>'+r.mpSpent+'</td><td>'+r.kos+'</td></tr>').join("");
 const details=report.participants.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+(["A","B","C","F"].map(k=>k+":"+r.attacks[k]).join(" "))+'</td><td>'+["A","B","C"].map(k=>k+":"+r.guards[k]).join(" ")+'</td><td>'+r.timesKo+'</td></tr>').join("");
 get("pixel-result").innerHTML='<h2>'+(state.winner==="party"?"GYŐZELEM":"VERESÉG")+' — RÉSZLETES TESZTÖSSZESÍTŐ</h2><p>'+state.round+'. kör · '+events.length+' akció · '+state.party.length+' játékos vs. '+state.enemyCount+' ellenfél</p>'+
 '<div class="result-actions"><button data-result="rematch">Rematch</button><button data-result="edit">Edit Configuration</button><button data-result="export">Export Results (TXT / JSON)</button></div>'+
 '<div class="result-scroller"><table class="result-table"><thead><tr><th>Kar.</th><th>Oldal</th><th>Akciók</th><th>HP →</th><th>DEF →</th><th>FOC →</th><th>HP ←</th><th>DEF ←</th><th>FOC ←</th><th>HP +</th><th>DEF +</th><th>FOC +</th><th>MP +</th><th>MP −</th><th>KO</th></tr></thead><tbody>'+summary+'</tbody></table></div>'+
 '<h3>Parancshasználat</h3><div class="result-scroller"><table class="result-table"><thead><tr><th>Karakter</th><th>Attack A/B/C/F</th><th>Guard A/B/C</th><th>Elszenvedett KO</th></tr></thead><tbody>'+details+'</tbody></table></div>';
 get("pixel-result").hidden=false;
 requestAnimationFrame(()=>get("pixel-result").scrollIntoView({block:"start",behavior:"auto"}));
 A.stop();draw();
}
function exportResult(){
 if(!view.report)return;
 const text=JSON.stringify(view.report,null,2);
 const name=Export.filename(new Date()).replace("Combat-config-","Combat-results-");
 const blob=new Blob([text],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resultClick(e){
 const b=e.target.closest("button[data-result]");if(!b)return;
 A.sfx("confirm");
 if(b.dataset.result==="rematch")newMatch();
 if(b.dataset.result==="edit")leaveBattle();
 if(b.dataset.result==="export")exportResult();
}
function notify(text){
 get("pixel-subtitle").textContent=text;
 clearTimeout(view.noticeTimer);
 view.noticeTimer=setTimeout(()=>{if(view)get("pixel-subtitle").textContent="SNES TEST BUILD · NON-CANON";},2800);
}
function pause(){
 if(!state||paused||closing||view.dataset.phase==="results")return;
 paused=true;pauseStart=performance.now();modal="pause";A.pause();drawOverlay();
}
function unpause(){
 if(!paused)return;
 const elapsed=performance.now()-pauseStart;
 if(pending)pending.start+=elapsed;
 if(closing)closing.start+=elapsed;
 for(const popup of popups)popup.start+=elapsed;
 paused=false;modal=null;get("pixel-overlay").hidden=true;A.resume();
 if(state&&state.phase==="enemy"&&!pending)stepEnemy();
}
function togglePause(){if(paused)unpause();else pause();}
function drawOverlay(){
 const overlay=get("pixel-overlay");overlay.hidden=false;
 const history=(state?state.log:[]).slice().reverse().map(l=>'<li>'+esc(l.round+". kör · "+l.text)+'</li>').join("");
 if(modal==="log"){
  overlay.innerHTML='<div class="modal-panel"><div class="modal-bar"><h2>Battle Log</h2><button data-modal="pause">← Vissza</button></div><ol class="modal-log">'+history+'</ol></div>';return;
 }
 if(modal==="settings"){
  overlay.innerHTML='<div class="modal-panel"><div class="modal-bar"><h2>Audio / Speed</h2><button data-modal="pause">← Vissza</button></div>'+
  '<label class="pixel-setting">Animation Speed <select id="pixel-speed"><option value="normal">Normal 1×</option><option value="fast">Fast 2×</option><option value="instant">Instant</option></select></label>'+
  '<label class="pixel-setting">Music <input id="pixel-music" type="range" min="0" max="100" value="'+musicLevel+'"><span id="music-value">'+musicLevel+'%</span></label>'+
  '<label class="pixel-setting">SFX <input id="pixel-sfx" type="range" min="0" max="100" value="'+sfxLevel+'"><span id="sfx-value">'+sfxLevel+'%</span></label></div>';
  get("pixel-speed").value=animationSpeed;return;
 }
 modal="pause";
 overlay.innerHTML='<div class="modal-panel modal-menu"><h2>PAUSE</h2>'+
 '<button data-modal="resume">Resume</button>'+
 '<button data-modal="log">Battle Log</button>'+
 '<button data-modal="settings">Animation Speed / Audio Settings</button>'+
 '<button data-modal="rematch">Restart Battle</button>'+
 '<button data-modal="edit">Edit Configuration</button></div>';
}
function overlayClick(e){
 const b=e.target.closest("[data-modal]");if(!b)return;
 A.sfx("confirm");
 const choice=b.dataset.modal;
 if(choice==="resume")unpause();
 else if(choice==="log"){modal="log";drawOverlay();}
 else if(choice==="settings"){modal="settings";drawOverlay();}
 else if(choice==="pause"){modal="pause";drawOverlay();}
 else if(choice==="rematch")newMatch();
 else if(choice==="edit")leaveBattle();
}
function overlayInput(e){
 const el=e.target;
 if(el.id==="pixel-speed")animationSpeed=el.value;
 if(el.id==="pixel-music"){musicLevel=Number(el.value);get("music-value").textContent=musicLevel+"%";}
 if(el.id==="pixel-sfx"){sfxLevel=Number(el.value);get("sfx-value").textContent=sfxLevel+"%";}
 A.volumes(musicLevel/100,sfxLevel/100);storePrefs();
}
function leaveBattle(){
 A.stop();paused=false;get("pixel-overlay").hidden=true;
 view.hidden=true;state=null;view.dataset.phase="setup";
 document.querySelector(".combat-shell")?.classList.remove("battle-active");
 if(typeof view.onExit==="function")view.onExit();
}
function chooseMain(index){mainChoice=Math.max(0,Math.min(1,index));A.sfx("cursor");}
function chooseSub(index){subChoice=Math.max(0,Math.min(2,index));A.sfx("cursor");}
function optionSelected(){
 if(stage==="root"){category=mainChoice===0?"attack":"guard";subChoice=0;stage="sub";A.sfx("confirm");return;}
 if(stage==="sub"){
  const actor=E.active(state);
  if(!actor)return;
  if(category==="guard"){A.sfx("confirm");doAction("guard",KEYS[subChoice]);return;}
  if(actor.id==="I"&&actor.mp===0&&actor.attacks.every(a=>a.mp>0)){category="fallback";focusTarget(state.target);stage="target";return;}
  const item=actor.attacks[subChoice];
  if(actor.mp<item.mp){notify("Nincs elegendő MP!");A.sfx("back");return;}
  category="attack";stage="target";focusTarget(state.target);A.sfx("confirm");return;
 }
 if(stage==="target"){
  const actor=E.active(state);if(!actor)return;
  const target=liveEnemies()[enemyIndex];
  if(!target)return;
  if(category==="fallback")doAction("fallback","F",target.id);
  else doAction("attack",KEYS[subChoice],target.id);
 }
}
function navigate(direction){
 if(pending||closing||paused||!state||state.winner)return;
 if(stage==="target"){moveTargetSpatial(direction);return;}
 const delta=direction==="up"||direction==="left"?-1:1;
 if(stage==="root")chooseMain((mainChoice+delta+2)%2);
 else if(stage==="sub")chooseSub((subChoice+delta+3)%3);
}
function back(){
 if(closing){skipEnd();return;}
 if(paused){if(modal!=="pause"){modal="pause";drawOverlay();}else unpause();return;}
 if(stage==="target"){stage="sub";category="attack";}
 else if(stage==="sub")stage="root";
 A.sfx("back");
}
function keyboard(e){
 if(!view||view.hidden||!state)return;
 const el=e.target,tag=el&&el.tagName;
 if(["INPUT","SELECT","TEXTAREA"].includes(tag))return;
 if(e.key==="Escape"){e.preventDefault();togglePause();return;}
 if(e.key==="Backspace"){e.preventDefault();back();return;}
 if(["Enter"," ","Spacebar"].includes(e.key)){
  if(e.repeat)return;e.preventDefault();
  if(closing){skipEnd();return;}
  if(paused){const btn=get("pixel-overlay").querySelector("button:focus")||get("pixel-overlay").querySelector("button");if(btn)btn.click();return;}
  if(view.dataset.phase==="results"){const b=get("pixel-result").querySelector("button:focus")||get("pixel-result").querySelector("button");if(b)b.click();return;}
  optionSelected();return;
 }
 const directions={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",W:"up",s:"down",S:"down",a:"left",A:"left",d:"right",D:"right"};
 if(Object.prototype.hasOwnProperty.call(directions,e.key)){e.preventDefault();navigate(directions[e.key]);}
}
document.addEventListener("keydown",keyboard);
function pointerPos(event){
 const r=canvas.getBoundingClientRect();
 return {x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};
}
function spriteAt(x,y){
 if(!state)return null;
 for(let i=state.enemies.length-1;i>=0;i--){
  const a=state.enemies[i],p=unitPos(a.id);
  if(a.hp>0&&x>=p.x-4&&x<p.x+38&&y>=p.y-5&&y<p.y+49)return a;
 }
 return null;
}
function moveCanvas(e){
 if(!state||state.winner||stage!=="target"||pending||paused)return;
 const {x,y}=pointerPos(e),target=spriteAt(x,y);
 if(target&&state.target!==target.id){focusTarget(target.id);draw();}
}
function clickCanvas(e){
 if(closing){skipEnd();return;}
 if(paused||!state||pending||state.winner)return;
 const {x,y}=pointerPos(e);
 if(y<STAGE_H){
  const target=spriteAt(x,y);
  if(stage==="target"&&target){focusTarget(target.id);optionSelected();}return;
 }
 if(x>=4&&x<111&&y>=278&&y<349){chooseMain(y<314?0:1);category=mainChoice===0?"attack":"guard";stage="sub";return;}
 if(x>=111&&x<215&&y>=278&&y<347&&stage!=="root"){
  chooseSub(Math.min(2,Math.floor((y-278)/23)));
  if(category==="guard"){optionSelected();return;}
  optionSelected();return;
 }
 if(x>=215&&x<344&&stage==="target"&&y>=260){optionSelected();}
}
function text(x,y,value,color="#f5f7ff",size=10){
 return window.CombatPixelFont.draw(ctx,x,y,value,color,size);
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function panel(x,y,w,h){
 // FFVII-inspired royal-blue gradients, precise silvery border and pixel-stepped corners.
 rect(x+2,y+2,w-1,h-1,"#04091c");
 rect(x,y,w-2,h-2,"#03091d");
 rect(x+2,y+1,w-6,h-4,"#f3f5fb");
 rect(x+3,y+3,w-8,h-8,"#12235b");
 const gradient=ctx.createLinearGradient(x+5,y+5,x+w-6,y+h-6);
 gradient.addColorStop(0,"#07135b");
 gradient.addColorStop(.46,"#2142b3");
 gradient.addColorStop(.76,"#182a87");
 gradient.addColorStop(1,"#070d3a");
 rect(x+5,y+5,w-12,h-12,gradient);
 rect(x+3,y+3,2,2,"#cdd8ec");
 rect(x+w-8,y+3,3,2,"#cdd8ec");
}
function backScene(){
 // A neutral dark void replaces the previous street scenery.
 rect(0,0,W,STAGE_H,"#090b15");
 rect(0,0,W,19,"#070915");
 text(13,5,"AMÁLIAVÁROS / COMBAT LAB","#cfcee1",9);
 text(571,5,state.party.length+" VS "+state.enemyCount,"#d9be86",9);
}

function enemySprite(kind,x,y,ko,attack,guard,flash){
 if(ko){ctx.globalAlpha=.5;rect(x+1,y+44,30,3,"#c15b53");ctx.globalAlpha=1;return;}
 ctx.save();ctx.translate(x+(attack?3:0),y);
 const skin=["#d6a079","#bd8a6a","#e0a477","#dca78d"][kind];
 const coat=["#2d4964","#825b43","#38614b","#302e3f"][kind];
 const pants=["#364a66","#31343c","#4c5053","#363e48"][kind];
 rect(10,31,6,11,pants);rect(19,31,6,11,pants);
 rect(8,43,9,3,"#141923");rect(18,43,9,3,"#181b21");
 rect(7,15,20,17,coat);rect(14,16,5,16,"#192733");
 rect(3,19,5,11,coat);rect(26,19,5,11,coat);rect(3,28,5,4,skin);rect(26,28,5,4,skin);
 rect(11,5,13,12,skin);rect(21,11,2,2,"#13151a");
 if(kind===0){rect(9,4,16,6,"#243747");rect(8,10,3,9,"#1d2e40");}
 if(kind===1){rect(10,4,15,4,"#292526");rect(7,16,20,4,"#704537");}
 if(kind===2){rect(9,5,15,5,"#254638");rect(22,8,5,2,"#3e6754");rect(9,17,2,13,"#8ca27c");}
 if(kind===3){rect(11,4,13,5,skin);rect(7,15,20,3,"#5d5260");}
 if(guard){ctx.strokeStyle="#99c7f5";ctx.lineWidth=2;ctx.strokeRect(1,2,30,44);}
 if(flash)rect(3,4,27,42,"rgba(255,255,245,.55)");
 ctx.restore();
}
function partySprite(index,x,y,ko,attack,guard,flash){
 if(ko){ctx.globalAlpha=.6;ctx.save();ctx.translate(x+32,y+44);ctx.rotate(-Math.PI/2);if(image&&image.complete&&image.naturalWidth)ctx.drawImage(image,index*32,0,32,48,-14,-30,32,48);ctx.restore();ctx.globalAlpha=1;return;}
 if(image&&image.complete&&image.naturalWidth)ctx.drawImage(image,index*32,0,32,48,x+(attack?-7:0),y,32,48);
 else {rect(x+10,y+5,13,12,["#e8ad82","#b69071","#a4725c","#d0a58b"][index]);rect(x+6,y+19,23,21,["#ae3836","#507b4a","#9e323f","#3c6996"][index]);}
 if(guard){ctx.strokeStyle="#a6d2fa";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,30,47);}
 if(flash)rect(x+3,y+4,27,42,"rgba(255,255,247,.65)");
}
function popupAt(event,progress){
 if(!event||progress<.30)return;
 const targetId=event.target||event.actor;
 const p=unitPos(targetId);
 const entry=event.changes.find(x=>x.id===targetId);
 const isAttack=event.kind==="attack"||event.kind==="fallback";
 const val=entry?entry.delta:{hp:0,def:0,foc:0,mp:0};
 if(!entry&&!isAttack)return;
 const floating=Math.floor(Math.max(0,Math.min(1,progress)-.3)*14);
 const parts=[];
 if(isAttack){
  parts.push([""+Math.max(0,-val.hp),"#fff3be"]);
  if(val.def<0)parts.push(["DEF −"+(-val.def)+"%","#d1dfec"]);
  if(val.foc<0)parts.push(["FOC −"+(-val.foc)+"%","#87d2ff"]);
 }else{
  for(const k of ["hp","def","foc","mp"])if(val[k]>0)parts.push(["+"+val[k]+(k==="def"||k==="foc"?"%":"")+" "+k.toUpperCase(),colors[k]]);
 }
 const visible=isAttack?parts:parts.length?[parts[Math.min(parts.length-1,Math.floor(Math.max(0,Math.min(1,progress)-.3)/.7*parts.length))]]:[];
 visible.forEach((item,i)=>{
  const fontSize=12, width=window.CombatPixelFont.measure(item[0],fontSize);
  const x=Math.max(5,Math.min(W-width-8,p.x+(event.side==="party"?-12:16)));
  const y=Math.max(22,p.y-14-floating+i*18);
  rect(x-3,y-3,width+7,23,"rgba(3,8,29,.91)");
  text(x,y,item[0],item[1],fontSize);
 });
}
function actionEffects(event,progress){
 if(!event||progress<.22||progress>.91)return;
 const pos=unitPos(event.target||event.actor);
 const cx=pos.x+16,cy=pos.y+22;
 const strength=Math.sin(Math.PI*Math.min(1,(progress-.22)/.69));
 ctx.save();ctx.globalAlpha=Math.max(0,strength);ctx.lineWidth=2;
 if(event.kind==="attack"||event.kind==="fallback"){
  const physical=event.type==="physical"||event.type==="dual"||event.kind==="fallback";
  const magical=event.type==="magical"||event.type==="dual";
  if(physical){
   ctx.strokeStyle="#ffdf91";
   ctx.beginPath();ctx.moveTo(cx-11,cy+10);ctx.lineTo(cx+12,cy-11);ctx.stroke();
   ctx.strokeStyle="#ffffff";ctx.beginPath();ctx.moveTo(cx-6,cy+11);ctx.lineTo(cx+14,cy-6);ctx.stroke();
  }
  if(magical){
   ctx.strokeStyle="#b8a4ff";ctx.beginPath();ctx.arc(cx,cy,12+Math.floor(progress*6),0,Math.PI*1.75);ctx.stroke();
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3+progress*3;
    rect(Math.round(cx+Math.cos(angle)*19),Math.round(cy+Math.sin(angle)*16),3,3,i%2?"#a3e0ff":"#d8afff");
   }
  }
 }else if(event.kind==="guard"){
  const entry=event.changes.find(x=>x.id===event.actor);
  if(entry){
   const resources=["hp","def","foc","mp"].filter(k=>entry.delta[k]>0);
   if(resources.length){
    const chosen=resources[Math.min(resources.length-1,Math.floor(Math.max(0,progress-.22)/.69*resources.length))];
    ctx.strokeStyle=colors[chosen];ctx.beginPath();ctx.arc(cx,cy,11+Math.floor(progress*10),0,Math.PI*2);ctx.stroke();
    for(let i=0;i<5;i++){
     const angle=i*Math.PI*2/5+progress*4;
     rect(Math.round(cx+Math.cos(angle)*18),Math.round(cy+Math.sin(angle)*14),3,3,colors[chosen]);
    }
   }
  }
 }
 ctx.restore();
}
function scene(){
 backScene();
 const animated=pending?.event||null;
 const progress=pending?Math.min(1,((paused?pauseStart:performance.now())-pending.start)/Math.max(1,pending.duration)):0;
 for(let i=0;i<state.enemies.length;i++){
  const e=state.enemies[i],p=unitPos(e.id);
  rect(p.x-3,p.y+46,37,2,"rgba(7,12,17,.45)");
  const isActor=animated?.actor===e.id,hit=animated?.target===e.id;
  enemySprite(i%4,p.x,p.y,e.hp<=0,isActor&&(animated.kind==="attack")&&progress<.52,isActor&&animated.kind==="guard",hit&&progress>.3&&progress<.7);
  if(stage==="target"&&state.target===e.id&&!pending){
   rect(p.x-6,p.y+24,4,3,"#fce5a0");rect(p.x-10,p.y+21,4,9,"#fce5a0");
   ctx.strokeStyle="#f5dd9e";ctx.strokeRect(p.x-2.5,p.y+0.5,36,47);
  }
 }
 for(let i=0;i<4;i++){
  const id=HERO_IDS[i],actor=state.party.find(x=>x.id===id);
  if(!actor)continue;
  const p=unitPos(id),isActor=animated?.actor===id,hit=animated?.target===id;
  rect(p.x-3,p.y+45,38,3,"rgba(3,8,15,.6)");
  const victoryBob=closing&&state.winner==="party"&&actor.hp>0?Math.round(Math.abs(Math.sin((performance.now()-closing.start)/175+i))*4):0;
  partySprite(i,p.x,p.y-victoryBob,actor.hp<=0,isActor&&animated.kind!=="guard"&&progress<.5,isActor&&animated.kind==="guard",hit&&progress>.35&&progress<.75);
 }
 popups=popups.filter(p=>((paused?pauseStart:performance.now())-p.start)<p.base*2.4);
 for(const p of popups)popupAt(p.event,((paused?pauseStart:performance.now())-p.start)/p.base);
 if(animated)actionEffects(animated,progress);
 if(closing){
  const t=(performance.now()-closing.start)/Math.max(1,closing.duration);
  const blink=Math.floor(t*10)%2===0;
  if(state.winner==="enemy")rect(0,0,640,STAGE_H,"rgba(14,7,20,"+(0.17+t*.35)+")");
  rect(110,77,410,74,"rgba(7,13,27,.92)");ctx.strokeStyle=blink?"#ffdf9c":"#a7c5e2";ctx.strokeRect(112.5,79.5,405,69);
  text(186,96,state.winner==="party"?"VICTORY!":"DEFEAT",blink?"#ffe8ab":"#c6c7e9",29);
  text(169,134,"OK / ✕ / KATTINTÁS: ÁTUGRÁS","#dbe8fb",10);
 }
}
function fitActionName(label,maxWidth,fontSize=10){
 let shown="";
 for(const char of String(label)){
  if(window.CombatPixelFont.measure(shown+char,fontSize)>maxWidth)break;
  shown+=char;
 }
 return shown;
}
function menuUI(){
 rect(0,STAGE_H,W,H-STAGE_H,"#0d1736");
 panel(3,260,108,96);
 panel(113,260,100,96);
 panel(215,260,128,96);
 panel(345,260,292,96);
 text(22,285,"Attack",mainChoice===0?"#fff3ba":"#a9b9d5",12);
 text(22,322,"Guard",mainChoice===1?"#fff3ba":"#a9b9d5",12);
 if(stage==="root"||stage==="sub")text(9,mainChoice===0?285:322,"▶","#ffe6a1",10);
 const actor=E.active(state);
 if(actor&&(stage==="sub"||stage==="target")){
  const list=category==="guard"?actor.guards:actor.attacks;
  const onlyFallback=category!=="guard"&&actor.id==="I"&&actor.mp===0&&actor.attacks.every(a=>a.mp>0);
  if(onlyFallback){
   text(118,282,"▶","#ffe3a1",9);
   text(129,282,"UNARMED","#fff0bc",10);
   text(123,313,"HP 15 / 0 MP","#fac18d",8);
  }else{
   for(let j=0;j<3;j++){
    const disabled=category==="attack"&&actor.mp<list[j].mp;
    const rawName=list[j].name||(category==="guard"?"Guard ":"Attack ")+KEYS[j];
    const label=fitActionName(rawName,76,10);
    text(129,283+j*23,label,disabled?"#5c7094":j===subChoice?"#fdf0bc":"#c5dbf2",10);
    if(subChoice===j)text(118,284+j*23,"▶","#ffe3a1",9);
   }
  }
 }
 const target=state.enemies.find(x=>x.id===state.target&&x.hp>0)||liveEnemies()[0];
 if(target){
  text(224,281,"HULIGÁN "+target.id,"#f1ecdc",9);
  text(224,295,"HP "+target.hp+"/"+target.maxHp,"#dbe5ff",9);
  text(224,308,"DEF "+target.def+"%","#d2d8e8",9);
  text(224,321,"FOC "+target.foc+"%","#99d2f7",9);
  text(224,334,"MP "+target.mp+"/"+target.maxMp,"#dcaef0",9);
 }
 text(385,273,"HP","#aac5e7",8);
 text(464,273,"DEF","#aac5e7",8);
 text(518,273,"FOC","#aac5e7",8);
 text(577,273,"MP","#aac5e7",8);
 state.party.forEach((a,i)=>{
  const y=288+i*17;
  if(E.active(state)?.id===a.id&&!pending){ctx.strokeStyle="#c9dbf0";ctx.strokeRect(350.5,y-3.5,279,16);}
  text(354,y,a.id,"#e8e8ce",9);
  text(380,y,a.hp+"/"+a.maxHp,"#ecf0e2",9);
  text(461,y,a.def+"%","#c7d9ec",9);
  text(519,y,a.foc+"%","#9bcff3",9);
  text(574,y,a.mp+"/"+a.maxMp,"#dfbce9",9);
 });
 if(!state.winner&&state.phase==="enemy")text(116,347,"ELLENFÉL KÖRE","#e4c086",7);

}

function draw(){
 if(!ctx||!state||view.hidden)return;
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
 scene();menuUI();
}
function tick(now){
 raf=requestAnimationFrame(tick);
 if(!view||view.hidden||!state)return;
 frameClock=now;
 pollGamepad(now);
 if(!paused){
  if(pending&&now-pending.start>=pending.duration){pending=null;afterAction();}
  if(closing&&now-closing.start>=closing.duration)showResults();
 }
 draw();
}
/* Gamepad: D-pad / analog, A confirm, B back, shoulders cycle target, Menu pause. */
function pollGamepad(now){
 const pads=typeof navigator.getGamepads==="function"?navigator.getGamepads():[];
 const pad=[...pads].find(p=>p&&p.connected);if(!pad){gamepadBefore=[];return;}
 const b=n=>Boolean(pad.buttons[n]?.pressed);
 const current=[0,1,4,5,9,12,13,14,15].map(n=>b(n));
 const rising=n=>{const i=[0,1,4,5,9,12,13,14,15].indexOf(n);return current[i]&&!gamepadBefore[i];};
 const left=b(14)||pad.axes[0]<-.6, right=b(15)||pad.axes[0]>.6;
 const up=b(12)||pad.axes[1]<-.6,down=b(13)||pad.axes[1]>.6;
 if(rising(9)){togglePause();}
 else if(rising(1))back();
 else if(rising(0)){
  if(closing)skipEnd();
  else if(paused){const btn=get("pixel-overlay").querySelector("button:focus")||get("pixel-overlay").querySelector("button");if(btn)btn.click();}
  else if(view.dataset.phase==="results"){const btn=get("pixel-result").querySelector("button:focus")||get("pixel-result").querySelector("button");if(btn)btn.click();}
  else optionSelected();
 }
 if(!paused&&!closing&&view.dataset.phase!=="results"){
  if(rising(4))cycleTarget(-1);
  if(rising(5))cycleTarget(1);
 }
 const direction=up?"up":down?"down":left?"left":right?"right":null;
 if(direction&&now-lastStick>180){
  lastStick=now;
  if(paused||view.dataset.phase==="results"){
   const scope=paused?get("pixel-overlay"):get("pixel-result");
   const buttons=[...scope.querySelectorAll("button,select,input")].filter(x=>!x.disabled);
   const movement=direction==="up"||direction==="left"?-1:1;
   if(buttons.length){const idx=buttons.indexOf(document.activeElement);buttons[(idx+movement+buttons.length)%buttons.length].focus();}
  }else navigate(direction);
 }
 gamepadBefore=current;
}
window.CombatPlay={start,stop};
})();