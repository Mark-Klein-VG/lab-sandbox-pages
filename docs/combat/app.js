(() => {
"use strict";
const E=window.CombatEngine;
let state=E.makeBattle();
let feedback="";
const get=id=>document.getElementById(id);
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const pct=(v,max)=>Math.max(0,Math.min(100,Math.round(100*v/Math.max(1,max))));
function resource(name,value,max){
const p=pct(value,max);
return '<div class="resource"><div class="resource-title"><span class="label">'+name+'</span><span>'+value+' / '+max+'</span></div><div class="bar '+name.toLowerCase()+'"><i style="--percent:'+p+'%"></i></div></div>';
}
function card(entity,ally){
const active=E.active(state);
const isActive=ally&&active&&entity.id===active.id;
const selected=!ally&&entity.id===state.target;
const ko=entity.hp===0;
const kind=ally?(entity.id==="I"?"MÁGUS":"FIZIKAI"):(entity.type==="physical"?"FIZIKAI":"MÁGIKUS");
const top='<div class="unit-top"><span class="unit-name">'+esc(entity.id)+'</span><span class="unit-kind">'+(ko?"KO":kind)+'</span></div>';
const bars=resource("HP",entity.hp,entity.maxHp)+resource("DEF",entity.def,100)+resource("FOC",entity.foc,100)+(entity.id==="I"&&ally?resource("MP",entity.mp,entity.maxMp):"");
const footer='<div class="unit-footer">'+(ko?"HARC KÉPTELEN":isActive?"● AKTÍV":selected?"◉ CÉLPONT":"&nbsp;")+'</div>';
const cls='unit-card'+(isActive?' active':'')+(selected?' selected':'')+(ko?' ko':'');
if(ally)return '<article class="'+cls+'" aria-label="'+esc(entity.id)+' csapattag">'+top+bars+footer+'</article>';
return '<button type="button" class="'+cls+'" data-target="'+esc(entity.id)+'" '+(ko?'disabled':'')+' aria-pressed="'+(selected?'true':'false')+'" aria-label="'+esc(entity.id)+', '+kind+', '+entity.hp+' HP">'+top+bars+footer+'</button>';
}
function formatMove(v){return 'HP '+v[0]+' · DEF −'+v[1]+' · FOC −'+v[2];}
function actionButton(kind,id,title,sub,disabled=false,extra=""){
return '<button type="button" class="action-btn '+(kind==='guard'?'guard-btn ':'')+extra+'" data-action="'+kind+'" data-id="'+id+'" '+(disabled?'disabled':'')+'><span class="action-badge">'+id+'</span><span class="action-text"><b>'+title+'</b><small>'+sub+'</small></span></button>';
}
function renderActions(){
const actor=E.active(state), attacks=get("attacks"),guards=get("guards");
if(!actor){attacks.innerHTML='<p class="end-message">'+(state.winner==='party'?'GYŐZELEM':'VERESÉG')+'</p>';guards.innerHTML='';get("actor-summary").textContent='A harc véget ért.';get("target-summary").textContent='Indíts új küzdelmet.';return;}
get("actor-summary").textContent='Aktív karakter: '+actor.id+' · '+actor.hp+' / '+actor.maxHp+' HP';
const targ=state.enemies.find(x=>x.id===state.target);
get("target-summary").textContent='Célpont: '+(targ?targ.id+' · '+targ.hp+' / 500 HP':'válassz ellenfelet');
const noMp=actor.id==='I'&&actor.mp===0;
const type=actor.type==='magical'?'mágikus':'fizikai';
const arr=actor.attacks.map((v,i)=>actionButton('attack',E.config.ids[i],'Attack '+E.config.ids[i],formatMove(v)+' · '+type+(actor.id==='I'?' · 1 MP':''),noMp));
if(noMp)arr.push(actionButton('fallback','F','Fizikai póttámadás','HP 15 · DEF 0 · FOC 0 · 0 MP',false,'fallback-btn'));
attacks.innerHTML=arr.join('');
const a=Math.round(actor.maxHp*.10);
guards.innerHTML=actionButton('guard','A','Guard A · HP','+'+a+' HP (MaxHP 10%), más nem')+
actionButton('guard','B','Guard B · DEF','+'+actor.gB+' DEF (max. 100)')+
actionButton('guard','C','Guard C · FOC','+'+actor.gC+' FOC (max. 100)'+(actor.id==='I'?' · +2 MP':''));
}
function render(){
const alive=state.enemies.filter(e=>e.hp>0);
if(alive.length&&!alive.some(e=>e.id===state.target))state.target=alive[0].id;
get("round").textContent=String(state.round).padStart(2,'0');
get("phase").textContent=state.phase==='end'?(state.winner==='party'?'GYŐZELEM':'VERESÉG'):state.phase==='player'?'JÁTÉKOS':'ELLENFÉL';
get("active-hero").textContent=E.active(state)?.id||'—';
get("remaining").textContent=alive.length+' / 8';
get("enemy-grid").innerHTML=state.enemies.map(e=>card(e,false)).join('');
get("party-grid").innerHTML=state.party.map(e=>card(e,true)).join('');
renderActions();
get("feedback").textContent=feedback;
get("battle-log").innerHTML=state.log.slice(-26).reverse().map(l=>'<li class="'+esc(l.kind)+'"><time>K'+String(l.round).padStart(2,'0')+'</time><span class="event">'+esc(l.text)+'</span></li>').join('');
}
get("enemy-grid").addEventListener('click',e=>{const b=e.target.closest('button[data-target]');if(!b||b.disabled||state.winner)return;state.target=b.dataset.target;feedback='';render();});
document.querySelector('.commands').addEventListener('click',e=>{
const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;
try{E.act(state,b.dataset.action,b.dataset.id,state.target);feedback='';}
catch(err){feedback=err.message||'Nem sikerült végrehajtani az akciót.';}
render();
});
get("restart").addEventListener('click',()=>{state=E.makeBattle();feedback='';render();});
render();
})();
