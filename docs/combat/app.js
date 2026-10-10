(() => {
"use strict";
const E=window.CombatEngine;
const get=id=>document.getElementById(id);
const KEY="mechanics-lab-combat-v02";
const keys=E.config.KEYS;
let config=loadConfig();
let editorSelection={team:"party",index:0};
let state=null,feedback="";
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function storage(){try{localStorage.setItem(KEY,JSON.stringify(config));}catch(_e){}}
function loadConfig(){try{const raw=localStorage.getItem(KEY);return raw?E.sanitize(JSON.parse(raw)):E.defaults();}catch(_e){return E.defaults();}}
function selectedActor(){return config[editorSelection.team][editorSelection.index];}
const fmtNum=n=>Number(n).toLocaleString("hu-HU");
function refreshHeader(){
  get("hero-party").textContent=config.partyIds.length;
  get("hero-enemies").textContent=config.enemyCount;
}
function roster(){
  get("party-select").innerHTML=config.party.map((p,i)=>{
    const enabled=config.partyIds.includes(p.id);
    const current=editorSelection.team==="party"&&editorSelection.index===i;
    return '<div class="roster-unit'+(current?' editing':'')+'"><label class="roster-toggle"><input type="checkbox" data-party-include="'+esc(p.id)+'" '+(enabled?'checked':'')+'> HARCBAN</label><button type="button" data-unit-team="party" data-unit-index="'+i+'" class="roster-select">'+esc(p.id)+'<small>'+fmtNum(p.maxHp)+' HP</small></button></div>';
  }).join("");
  get("enemy-select").innerHTML=config.enemies.slice(0,config.enemyCount).map((p,i)=>{
    const current=editorSelection.team==="enemies"&&editorSelection.index===i;
    return '<button type="button" class="enemy-picker'+(current?' editing':'')+'" data-unit-team="enemies" data-unit-index="'+i+'">'+esc(p.id)+'<small>'+fmtNum(p.maxHp)+' HP</small></button>';
  }).join("");
  get("enemy-count").value=String(config.enemyCount);
  refreshHeader();
}
function field(name,value,opts={}){
 const lim=opts.max===undefined?10000:opts.max;
 const p=opts.prop||name;
 const data=opts.group==='attacks'?'data-group="attacks" data-index="'+opts.index+'" data-field="'+p+'"':
 opts.group==='guards'?'data-group="guards" data-index="'+opts.index+'" data-field="'+p+'"':'data-field="'+p+'"';
 return '<label class="edit-field"><span>'+esc(name)+'</span><input type="number" inputmode="numeric" min="0" max="'+lim+'" step="1" value="'+value+'" '+data+'></label>';
}
function selection(name,items,value,group,index,prop){
 const attrs='data-group="'+group+'" data-index="'+index+'" data-field="'+prop+'"';
 return '<label class="edit-field"><span>'+esc(name)+'</span><select '+attrs+'>'+items.map(([key,label])=>'<option value="'+key+'" '+(key===value?'selected':'')+'>'+label+'</option>').join("")+'</select></label>';
}
function renderEditor(){
 const a=selectedActor();
 get("editor-title").textContent=a.id+" paraméterei";
 get("editor-side").textContent=editorSelection.team==="party"?"JÁTÉKOS":"ELLENFÉL";
 get("editor-hint").textContent="Minden numerikus érték külön állítható. A DEF/FOC alapértéke 0–100%, a többi mező legfeljebb 10 000.";
 const basic='<div class="editor-section"><h3>Alapértékek</h3><div class="edit-grid">'+
 field("Max HP",a.maxHp,{prop:"maxHp"})+
 field("Kezdő HP",a.hp,{prop:"hp"})+
 field("DEF (%)",a.def,{prop:"def",max:100})+
 field("FOC (%)",a.foc,{prop:"foc",max:100})+
 field("Max MP",a.maxMp,{prop:"maxMp"})+
 field("Kezdő MP",a.mp,{prop:"mp"})+
 '</div></div>';
 const attacks='<div class="editor-section"><h3>Attack A / B / C</h3><div class="editor-actions">'+
 a.attacks.map((m,i)=>'<div class="editor-action-card"><div class="editor-action-title"><b>ATTACK '+keys[i]+'</b><span>SAJÁT SEBZÉS</span></div>'+
 '<div class="edit-grid">'+
 selection("Támadás típusa",[["physical","Fizikai"],["magical","Mágikus"],["dual","Dual (gyengébb védelem)"]],m.type,"attacks",i,"type")+
 field("HP sebzés",m.hp,{group:"attacks",index:i,prop:"hp"})+
 field("DEF sebzés (százalékpont)",m.def,{group:"attacks",index:i,prop:"def"})+
 field("FOC sebzés (százalékpont)",m.foc,{group:"attacks",index:i,prop:"foc"})+
 field("MP-költség",m.mp,{group:"attacks",index:i,prop:"mp"})+
 '</div></div>').join("")+'</div></div>';
 const guards='<div class="editor-section"><h3>Guard A / B / C</h3><div class="editor-actions">'+
 a.guards.map((g,i)=>'<div class="editor-action-card"><div class="editor-action-title"><b>GUARD '+keys[i]+'</b><span>VISSZATÖLTÉS</span></div>'+
 '<div class="edit-grid">'+
 selection("HP visszatöltés típusa",[["fixed","Fix HP"],["percent","Max HP %-a"]],g.hpMode,"guards",i,"hpMode")+
 field("HP visszatöltés",g.hp,{group:"guards",index:i,prop:"hp",max:g.hpMode==="percent"?100:10000})+
 field("DEF + (százalékpont)",g.def,{group:"guards",index:i,prop:"def"})+
 field("FOC + (százalékpont)",g.foc,{group:"guards",index:i,prop:"foc"})+
 field("MP visszatöltés",g.mp,{group:"guards",index:i,prop:"mp"})+
 '</div></div>').join("")+'</div></div>';
 get("editor-fields").innerHTML=basic+attacks+guards;
}
function showSetup(){
 if(window.CombatPlay)window.CombatPlay.stop();
 get("setup-screen").hidden=false;
 get("battle-screen").hidden=true;
 roster();renderEditor();get("setup-feedback").textContent="";
}
function showBattle(){
 get("setup-screen").hidden=true;
 get("battle-screen").hidden=true;
 window.CombatPlay.start(config,showSetup);
}
function updateInput(el,final){
 if(!el||!el.matches('[data-field]'))return;
 const a=selectedActor();
 const group=el.dataset.group,index=Number(el.dataset.index),key=el.dataset.field;
 const dest=group==="attacks"?a.attacks[index]:group==="guards"?a.guards[index]:a;
 if(el.tagName==="SELECT"){
  dest[key]=el.value;
  if(key==="hpMode"&&dest.hp>100&&el.value==="percent")dest.hp=100;
 } else {
  if(el.value===""&&!final)return;
  const limit=(group===undefined&&(key==="def"||key==="foc"))?100:
    (group==="guards"&&key==="hp"&&dest.hpMode==="percent"?100:10000);
  const n=Number(el.value);
  if(!Number.isFinite(n)||!Number.isInteger(n)){if(!final)return;dest[key]=0;}
  else dest[key]=Math.max(0,Math.min(limit,n));
  if((key==="maxHp"||key==="maxMp")&&!group){
   if(key==="maxHp")a.hp=Math.min(a.hp,a.maxHp);
   if(key==="maxMp")a.mp=Math.min(a.mp,a.maxMp);
  }
  if((key==="hp"||key==="mp")&&!group){
   a[key]=Math.min(a[key],key==="hp"?a.maxHp:a.maxMp);
  }
  if(final)el.value=String(dest[key]);
 }
 storage();
 refreshHeader();
 if(final){roster();renderEditor();}
}
function showError(text){get("setup-feedback").textContent=text;}
get("party-select").addEventListener("change",ev=>{
 const input=ev.target.closest('input[data-party-include]');if(!input)return;
 const id=input.dataset.partyInclude;
 config.partyIds=config.party.map(x=>x.id).filter(key=>key===id?input.checked:config.partyIds.includes(key));
 storage();roster();showError("");
});
function unitClick(ev){
 const btn=ev.target.closest('button[data-unit-team]');if(!btn)return;
 editorSelection={team:btn.dataset.unitTeam,index:Number(btn.dataset.unitIndex)};
 roster();renderEditor();get("editor-title").scrollIntoView({block:"nearest",behavior:"smooth"});
}
get("party-select").addEventListener("click",unitClick);
get("enemy-select").addEventListener("click",unitClick);
get("enemy-count").addEventListener("change",ev=>{
 config.enemyCount=Math.max(1,Math.min(16,Math.round(Number(ev.target.value)||1)));
 if(editorSelection.team==="enemies"&&editorSelection.index>=config.enemyCount)editorSelection.index=config.enemyCount-1;
 storage();roster();renderEditor();showError("");
});
get("enemy-count").addEventListener("input",ev=>{
 const n=Number(ev.target.value);
 if(Number.isInteger(n)&&n>=1&&n<=16){config.enemyCount=n;storage();roster();renderEditor();}
});
get("editor-fields").addEventListener("input",ev=>updateInput(ev.target,false));
get("editor-fields").addEventListener("change",ev=>updateInput(ev.target,true));
get("restore-defaults").addEventListener("click",()=>{
 if(!window.confirm("Minden módosított érték visszaáll az alapértelmezettre. Biztosan folytatod?"))return;
 config=E.defaults();editorSelection={team:"party",index:0};storage();showSetup();
});
get("export-json").addEventListener("click",()=>{
 get("json-data").value=JSON.stringify(config,null,2);
 showError("A JSON megjelent a szövegmezőben. Kimásolhatod vagy fájlba mentheted.");
});
get("download-txt").addEventListener("click",()=>{
 try {
  const file = window.CombatConfigExport.download(config);
  showError("Letöltés elindítva: "+file);
 } catch (error) {
  showError("Nem sikerült elindítani a letöltést: "+error.message);
 }
});
get("import-json").addEventListener("click",()=>{
 try{
  const input=JSON.parse(get("json-data").value);
  if(!input||!Array.isArray(input.party)||!Array.isArray(input.enemies))throw Error("Hibás konfigurációstruktúra.");
  config=E.sanitize(input);
  editorSelection={team:"party",index:0};storage();roster();renderEditor();
  showError("Konfiguráció betöltve. Az érvénytelen / határon túli értékek korlátozva lettek.");
 }catch(e){showError("Nem sikerült betölteni a JSON-t: "+e.message);}
});
get("start-battle").addEventListener("click",()=>{
 try{
  config=E.validate(config);
  storage();state=E.makeBattle(config);feedback="";showBattle();
 }catch(e){showError(e.message);}
});
get("back-to-setup").addEventListener("click",()=>{
 if(state&&!state.winner&&state.log.some(x=>x.kind==="attack"||x.kind==="enemy"||x.kind==="guard")&&!window.confirm("A jelenlegi harc megszakad. Visszalépsz a paraméterekhez?"))return;
 state=null;showSetup();
});
get("restart").addEventListener("click",()=>{state=E.makeBattle(config);feedback="";renderBattle();});
function number(n){return Number(n).toLocaleString("hu-HU");}
function resource(name,v,max,percent=false){
 const p=percent?v:Math.max(0,Math.min(100,Math.round(v*100/Math.max(1,max))));
 const label=percent?number(v)+"%":number(v)+" / "+number(max);
 return '<div class="resource"><div class="resource-title"><span class="label">'+name+'</span><span>'+label+'</span></div><div class="bar '+name.toLowerCase()+'"><i style="--percent:'+p+'%"></i></div></div>';
}
function card(a,ally){
 const live=E.active(state),on=ally&&live&&live.id===a.id,selected=!ally&&a.id===state.target,ko=a.hp===0;
 const cls="unit-card"+(on?" active":"")+(selected?" selected":"")+(ko?" ko":"");
 const label='<div class="unit-top"><span class="unit-name">'+esc(a.id)+'</span><span class="unit-kind">'+(ko?"KO":ally?"CSAPAT":"ELLENFÉL")+'</span></div>';
 const res=resource("HP",a.hp,a.maxHp)+resource("DEF",a.def,100,true)+resource("FOC",a.foc,100,true)+
 ((a.maxMp>0||a.mp>0)?resource("MP",a.mp,a.maxMp):"");
 const foot='<div class="unit-footer">'+(ko?"HARC KÉPTELEN":on?"● AKTÍV":selected?"◉ CÉLPONT":"&nbsp;")+'</div>';
 if(ally)return '<article class="'+cls+'">'+label+res+foot+'</article>';
 return '<button type="button" class="'+cls+'" data-target="'+esc(a.id)+'" '+(ko?"disabled":"")+' aria-pressed="'+(selected?"true":"false")+'">'+label+res+foot+'</button>';
}
const typeLabel={physical:"fizikai",magical:"mágikus",dual:"Dual"};
function btn(kind,id,sub,disabled=false){
 return '<button type="button" class="action-btn '+(kind==="guard"?"guard-btn":"")+'" data-action="'+kind+'" data-id="'+id+'" '+(disabled?"disabled":"")+'><span class="action-badge">'+id+'</span><span class="action-text"><b>'+kind.toUpperCase()+' '+id+'</b><small>'+esc(sub)+'</small></span></button>';
}
function renderActions(){
 const actor=E.active(state);
 if(!actor){
  get("attacks").innerHTML='<p class="end-message">'+(state.winner==="party"?"GYŐZELEM":"VERESÉG")+'</p>';
  get("guards").innerHTML="";
  get("actor-summary").textContent="A harc befejeződött.";
  get("target-summary").textContent="A beállításokból új küzdelmet indíthatsz.";
  return;
 }
 get("actor-summary").textContent="Aktív: "+actor.id+" · HP "+number(actor.hp)+" / "+number(actor.maxHp);
 const t=state.enemies.find(x=>x.id===state.target);
 get("target-summary").textContent=t?"Célpont: "+t.id+" · "+number(t.hp)+" HP":"Válassz élő célpontot";
 get("attacks").innerHTML=actor.attacks.map((m,i)=>btn("attack",keys[i],
  typeLabel[m.type]+" · HP "+m.hp+" · DEF −"+m.def+" · FOC −"+m.foc+" · MP "+m.mp,actor.mp<m.mp)).join("")+
  (actor.id==="I"&&actor.mp===0?btn("fallback","F","fizikai · HP 15 · 0 MP"):"");
 get("guards").innerHTML=actor.guards.map((m,i)=>btn("guard",keys[i],
  "HP +"+m.hp+(m.hpMode==="percent"?"% MaxHP":"")+" · DEF +"+m.def+" · FOC +"+m.foc+" · MP +"+m.mp)).join("");
}
function renderBattle(){
 if(!state)return;
 const remaining=state.enemies.filter(x=>x.hp>0);
 if(remaining.length&&!remaining.some(x=>x.id===state.target))state.target=remaining[0].id;
 get("round").textContent=String(state.round).padStart(2,"0");
 get("phase").textContent=state.winner?(state.winner==="party"?"GYŐZELEM":"VERESÉG"):"JÁTÉKOS";
 get("active-hero").textContent=E.active(state)?.id||"—";
 get("remaining").textContent=remaining.length+" / "+state.enemyCount;
 get("enemy-grid").innerHTML=state.enemies.map(x=>card(x,false)).join("");
 get("party-grid").innerHTML=state.party.map(x=>card(x,true)).join("");
 renderActions();
 get("feedback").textContent=feedback;
 get("battle-log").innerHTML=state.log.slice(-38).reverse().map(x=>'<li class="'+esc(x.kind)+'"><time>K'+String(x.round).padStart(2,"0")+'</time><span class="event">'+esc(x.text)+'</span></li>').join("");
}
get("enemy-grid").addEventListener("click",ev=>{
 const b=ev.target.closest('button[data-target]');if(!b||b.disabled||!state||state.winner)return;
 state.target=b.dataset.target;feedback="";renderBattle();
});
get("battle-screen").addEventListener("click",ev=>{
 const b=ev.target.closest('button[data-action]');if(!b||b.disabled||!state)return;
 try{E.act(state,b.dataset.action,b.dataset.id,state.target);feedback="";}
 catch(e){feedback=e.message;}
 renderBattle();
});
showSetup();
})();
