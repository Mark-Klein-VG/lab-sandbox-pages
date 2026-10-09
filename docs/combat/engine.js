/* Mechanics Lab 4v8 — experimental balance, NOT canonical design. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.CombatEngine=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const MAX_RESOURCE=100,MAX_MITIGATION=.75;
const specs=[
{id:"Á",hp:1000,def:55,foc:45,mp:0,type:"physical",gB:45,gC:45,attacks:[[200,5,0],[50,20,0],[50,0,15]]},
{id:"L",hp:1200,def:68,foc:35,mp:0,type:"physical",gB:60,gC:35,attacks:[[333,3,0],[83,13,0],[83,0,8]]},
{id:"T",hp:800,def:50,foc:58,mp:0,type:"physical",gB:55,gC:45,attacks:[[133,7,0],[33,27,0],[33,0,15]]},
{id:"I",hp:700,def:38,foc:70,mp:12,type:"magical",gB:35,gC:60,attacks:[[133,3,0],[33,13,0],[33,0,30]]}
];
const ids=["A","B","C"];
function log(s,text,kind="info"){s.log.push({round:s.round,kind,text});if(s.log.length>170)s.log.splice(0,s.log.length-170);}
function makeBattle(){
const s={round:1,phase:"player",turnIndex:0,target:"P1",winner:null,log:[],
party:specs.map(v=>({id:v.id,hp:v.hp,maxHp:v.hp,def:v.def,foc:v.foc,mp:v.mp,maxMp:v.mp,type:v.type,gB:v.gB,gC:v.gC,attacks:v.attacks.map(a=>a.slice())})),
enemies:Array.from({length:8},(_,i)=>({id:(i<4?"P":"M")+(i%4+1),hp:500,maxHp:500,def:i<4?40:20,foc:i<4?20:40,type:i<4?"physical":"magical",mp:i<4?0:99}))};
log(s,"Prototype ready · 4 allies, 4 physical enemies, 4 magical enemies.");return s;
}
function active(s){return s.phase==="player"&&!s.winner?s.party[s.turnIndex]||null:null;}
function rawToHp(raw,defense){return Math.max(0,Math.round(Math.max(0,raw)*(1-Math.min(MAX_MITIGATION,Math.max(0,Math.min(MAX_RESOURCE,defense))/100))));}
function hit(source,target,values,type){
if(source.hp<=0||target.hp<=0)throw Error("A KO character cannot attack or be targeted.");
const shield=type==="magical"?"foc":"def";
const dealt=Math.min(target.hp,rawToHp(values[0],target[shield]));
const d=Math.min(target.def,Math.max(0,values[1])),f=Math.min(target.foc,Math.max(0,values[2]));
target.hp-=dealt;target.def-=d;target.foc-=f;
return {hp:dealt,def:d,foc:f,ko:target.hp===0};
}
function finish(s){
if(s.enemies.every(x=>x.hp===0)){s.winner="party";s.phase="end";log(s,"Victory · all 8 enemies defeated.","win");return true;}
if(s.party.every(x=>x.hp===0)){s.winner="enemy";s.phase="end";log(s,"Defeat · all 4 allies knocked out.","lose");return true;}
return false;
}
function enemiesAct(s){
if(s.winner)return s;
s.phase="enemy";log(s,"Round "+s.round+" · enemy phase","phase");
for(let i=0;i<s.enemies.length;i++){
const e=s.enemies[i];if(e.hp<=0)continue;
const alive=s.party.filter(p=>p.hp>0);if(!alive.length)break;
const target=alive[(i+s.round-1)%alive.length];
if(e.type==="magical"&&e.mp>0)e.mp--;
const result=hit(e,target,e.type==="physical"?[52,5,0]:[48,0,5],e.type);
log(s,e.id+" → "+target.id+": −"+result.hp+" HP, −"+result.def+" DEF, −"+result.foc+" FOC"+(result.ko?" [KO]":""),"enemy");
}
if(finish(s))return s;
s.round++;s.phase="player";s.turnIndex=s.party.findIndex(p=>p.hp>0);
log(s,"Round "+s.round+" · player phase","phase");return s;
}
function next(s){
if(finish(s))return s;
for(let i=s.turnIndex+1;i<s.party.length;i++)if(s.party[i].hp>0){s.turnIndex=i;return s;}
return enemiesAct(s);
}
function guard(s,key){
const hero=active(s);if(!hero||hero.hp<=0)throw Error("No living ally may act.");
if(!ids.includes(key))throw Error("Invalid guard.");
let details="";
if(key==="A"){const gain=Math.min(hero.maxHp-hero.hp,Math.round(hero.maxHp*.10));hero.hp+=gain;details="+"+gain+" HP";}
else if(key==="B"){const gain=Math.min(MAX_RESOURCE-hero.def,hero.gB);hero.def+=gain;details="+"+gain+" DEF";}
else{const gain=Math.min(MAX_RESOURCE-hero.foc,hero.gC);hero.foc+=gain;details="+"+gain+" FOC";
if(hero.id==="I"){const regen=Math.min(hero.maxMp-hero.mp,2);hero.mp+=regen;details+=", +"+regen+" MP";}}
log(s,hero.id+" · Guard "+key+" → "+details,"guard");return next(s);
}
function target(s,id){const e=s.enemies.find(x=>x.id===id&&x.hp>0);if(!e)throw Error("Choose a living enemy.");return e;}
function attack(s,key,id){
const hero=active(s);if(!hero||hero.hp<=0)throw Error("No living ally may act.");
if(!ids.includes(key))throw Error("Invalid attack.");
const enemy=target(s,id);
if(hero.type==="magical"){if(hero.mp<1)throw Error("No MP: use the fallback or Guard C.");hero.mp--;}
const v=hero.attacks[ids.indexOf(key)],r=hit(hero,enemy,v,hero.type);
log(s,hero.id+" · Attack "+key+" → "+enemy.id+": −"+r.hp+" HP, −"+r.def+" DEF, −"+r.foc+" FOC"+(r.ko?" [KO]":""),"attack");
return next(s);
}
function fallback(s,id){
const hero=active(s);if(!hero||hero.id!=="I"||hero.mp!==0)throw Error("Fallback is available to I only at 0 MP.");
const enemy=target(s,id),r=hit(hero,enemy,[15,0,0],"physical");
log(s,"I · Unarmed fallback → "+enemy.id+": −"+r.hp+" HP"+(r.ko?" [KO]":""),"attack");return next(s);
}
function act(s,kind,key,targetId){
if(s.phase!=="player"||s.winner)throw Error("Not the player phase.");
if(kind==="attack")return attack(s,key,targetId);
if(kind==="guard")return guard(s,key);
if(kind==="fallback")return fallback(s,targetId);
throw Error("Unknown action.");
}
return {makeBattle,active,rawToHp,hit,act,attack,guard,fallback,enemiesAct,config:{specs,ids,MAX_RESOURCE,MAX_MITIGATION}};
});
