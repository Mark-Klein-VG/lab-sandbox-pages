/* Combat Lab v0.2 — editable, non-canonical battle parameters. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.CombatEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const KEYS=["A","B","C"], MIN=0,MAX=10000, PERCENT_MAX=100;
const TYPES=["physical","magical","dual"];
const clone=value=>JSON.parse(JSON.stringify(value));
const cap=(n,min,max)=>Math.min(max,Math.max(min,n));
const int=(n,fallback=0,max=MAX)=>Number.isFinite(Number(n))&&String(n).trim()!==""?cap(Math.round(Number(n)),0,max):fallback;
function move(type,hp,def,foc,mp=0){return {type,hp,def,foc,mp};}
function guard(hp=0,def=0,foc=0,mp=0,hpMode="fixed"){return {hp,hpMode,def,foc,mp};}
const heroSpecs=[
 {id:"Á",maxHp:1000,def:55,foc:45,maxMp:0,guardB:45,guardC:45,attacks:[[200,5,0],[50,20,0],[50,0,15]],channel:"physical"},
 {id:"L",maxHp:1200,def:68,foc:35,maxMp:0,guardB:60,guardC:35,attacks:[[333,3,0],[83,13,0],[83,0,8]],channel:"physical"},
 {id:"T",maxHp:800,def:50,foc:58,maxMp:0,guardB:55,guardC:45,attacks:[[133,7,0],[33,27,0],[33,0,15]],channel:"physical"},
 {id:"I",maxHp:700,def:38,foc:70,maxMp:12,guardB:35,guardC:60,attacks:[[133,3,0],[33,13,0],[33,0,30]],channel:"magical"}
];
function defaultHero(h){
 return {id:h.id,maxHp:h.maxHp,hp:h.maxHp,def:h.def,foc:h.foc,maxMp:h.maxMp,mp:h.maxMp,
 attacks:h.attacks.map(a=>move(h.channel,a[0],a[1],a[2],h.channel==="magical"?1:0)),
 guards:[guard(10,0,0,0,"percent"),guard(0,h.guardB),guard(0,0,h.guardC,h.id==="I"?2:0)]};
}
function defaultEnemy(i){
 const physical=i%8<4, index=i%4+1+4*Math.floor(i/8);
 const type=physical?"physical":"magical";
 return {id:(physical?"P":"M")+index,maxHp:500,hp:500,def:physical?40:20,foc:physical?20:40,
 maxMp:physical?0:99,mp:physical?0:99,
 attacks:physical?[move(type,52,5,0),move(type,38,12,0),move(type,38,0,10)]:
 [move(type,48,0,5,1),move(type,35,10,0,1),move(type,35,0,12,1)],
 guards:[guard(45),guard(0,35),guard(0,0,35,physical?0:2)]};
}
function defaults(){
 return {partyIds:["Á","L","T","I"],enemyCount:8,
 party:heroSpecs.map(defaultHero),enemies:Array.from({length:16},(_,i)=>defaultEnemy(i))};
}
function sanitizeActor(input,base){
 const src=input&&typeof input==="object"?input:{};
 const result={id:base.id,maxHp:int(src.maxHp,base.maxHp),hp:0,def:int(src.def,base.def,PERCENT_MAX),
 foc:int(src.foc,base.foc,PERCENT_MAX),maxMp:int(src.maxMp,base.maxMp),mp:0,attacks:[],guards:[]};
 result.hp=Math.min(result.maxHp,int(src.hp,base.hp));
 result.mp=Math.min(result.maxMp,int(src.mp,base.mp));
 for(let i=0;i<3;i++){
  const b=base.attacks[i],a=Array.isArray(src.attacks)&&src.attacks[i]||{};
  result.attacks.push({type:TYPES.includes(a.type)?a.type:b.type,hp:int(a.hp,b.hp),
   def:int(a.def,b.def),foc:int(a.foc,b.foc),mp:int(a.mp,b.mp)});
  const g=Array.isArray(src.guards)&&src.guards[i]||{},bg=base.guards[i];
  const hpMode=g.hpMode==="percent"||g.hpMode==="fixed"?g.hpMode:bg.hpMode;
  result.guards.push({hpMode,hp:int(g.hp,bg.hp,hpMode==="percent"?PERCENT_MAX:MAX),
   def:int(g.def,bg.def),foc:int(g.foc,bg.foc),mp:int(g.mp,bg.mp)});
 }
 return result;
}
function sanitize(input){
 const base=defaults(),src=input&&typeof input==="object"?input:{};
 const ids=Array.isArray(src.partyIds)?src.partyIds.filter(x=>base.partyIds.includes(x)) :base.partyIds;
 return {partyIds:base.partyIds.filter(x=>ids.includes(x)),
 enemyCount:cap(int(src.enemyCount,8),1,16),
 party:base.party.map((a,i)=>sanitizeActor(Array.isArray(src.party)?src.party[i]:null,a)),
 enemies:base.enemies.map((a,i)=>sanitizeActor(Array.isArray(src.enemies)?src.enemies[i]:null,a))};
}
function validate(config){
 const c=sanitize(config);
 if(!c.partyIds.length)throw Error("Válassz legalább egy csapattagot.");
 if(!c.party.some(a=>c.partyIds.includes(a.id)&&a.hp>0))throw Error("Legalább egy kiválasztott csapattagnak legyen 1 vagy több HP-ja.");
 if(!c.enemies.slice(0,c.enemyCount).some(a=>a.hp>0))throw Error("Legalább egy ellenfélnek legyen 1 vagy több HP-ja.");
 return c;
}
function log(s,text,kind="info"){s.log.push({round:s.round,text,kind});if(s.log.length>300)s.log.splice(0,s.log.length-300);}
function makeBattle(input){
 const c=validate(input||defaults()),party=c.party.filter(a=>c.partyIds.includes(a.id)).map(clone),
 enemies=c.enemies.slice(0,c.enemyCount).map(clone);
 const s={round:1,phase:"player",turnIndex:party.findIndex(a=>a.hp>0),party,enemies,enemyCount:c.enemyCount,
 target:enemies.find(x=>x.hp>0).id,log:[],winner:null};
 log(s,"Új próbaharc: "+party.length+" szövetséges · "+enemies.length+" ellenfél.","phase");
 return s;
}
function active(s){return s.phase==="player"&&!s.winner?s.party[s.turnIndex]||null:null;}
function protection(defender,type){
 if(type==="physical")return defender.def;
 if(type==="magical")return defender.foc;
 if(type==="dual")return Math.min(defender.def,defender.foc);
 throw Error("Ismeretlen támadástípus.");
}
function rawToHp(raw,defense){return Math.round(int(raw)*(1-int(defense,0,PERCENT_MAX)/100));}
function hit(source,target,attack){
 if(source.hp<=0||target.hp<=0)throw Error("KO karakter nem támadhat és nem célozható.");
 const hp=Math.min(target.hp,rawToHp(attack.hp,protection(target,attack.type)));
 const def=Math.min(target.def,int(attack.def)),foc=Math.min(target.foc,int(attack.foc));
 target.hp-=hp;target.def-=def;target.foc-=foc;
 return {hp,def,foc,ko:target.hp===0};
}
function guardEffect(actor,g){
 const amount=g.hpMode==="percent"?Math.round(actor.maxHp*int(g.hp,0,100)/100):int(g.hp);
 const gains={hp:Math.min(Math.max(0,actor.maxHp-actor.hp),amount),
 def:Math.min(100-actor.def,int(g.def)),foc:Math.min(100-actor.foc,int(g.foc)),
 mp:Math.min(actor.maxMp-actor.mp,int(g.mp))};
 for(const k of ["hp","def","foc","mp"])actor[k]+=gains[k];
 return gains;
}
function fmt(r){return "−"+r.hp+" HP · −"+r.def+" DEF%p · −"+r.foc+" FOC%p"+(r.ko?" [KO]":"");}
function gains(r){return "+"+r.hp+" HP · +"+r.def+" DEF%p · +"+r.foc+" FOC%p · +"+r.mp+" MP";}
function finish(s){
 if(s.enemies.every(a=>a.hp===0)){s.phase="end";s.winner="party";log(s,"Győzelem: minden ellenfél legyőzve.","win");return true;}
 if(s.party.every(a=>a.hp===0)){s.phase="end";s.winner="enemy";log(s,"Vereség: a teljes csapat harcképtelen.","lose");return true;}
 return false;
}
function finishEnemyPhase(s){
 if(finish(s))return s;
 s.round++;s.phase="player";s.turnIndex=s.party.findIndex(a=>a.hp>0);
 log(s,s.round+". kör · csapat következik","phase");return s;
}
function beginEnemyPhase(s){
 s.phase="enemy";s.enemyIndex=0;
 log(s,"— "+s.round+". kör: ellenfelek —","phase");
 return s;
}
/* Animate one enemy action at a time; legacy automatic turns still use this. */
function stepEnemy(s){
 if(s.phase!=="enemy"||s.winner)return null;
 while(s.enemyIndex<s.enemies.length){
  const i=s.enemyIndex++, actor=s.enemies[i];
  if(actor.hp<=0)continue;
  const alive=s.party.filter(a=>a.hp>0);
  if(!alive.length){finish(s);return null;}
  const action={actor:actor.id,kind:"attack",target:null,key:null,round:s.round};
  const guardIndex=s.round%5===0?(actor.hp<actor.maxHp*.55?0:
    actor.def<25?1:actor.foc<25?2:-1):-1;
  if(guardIndex>=0){
   const result=guardEffect(actor,actor.guards[guardIndex]);
   log(s,actor.id+" · Guard "+KEYS[guardIndex]+" → "+gains(result),"enemy");
   action.kind="guard";action.key=KEYS[guardIndex];
  }else{
   let idx=(s.round-1)%3;
   if(actor.mp<actor.attacks[idx].mp){
    idx=actor.attacks.findIndex(a=>a.mp<=actor.mp);
    if(idx<0){
     const regenIdx=actor.guards.findIndex(g=>g.mp>0);
     if(regenIdx>=0){
      const result=guardEffect(actor,actor.guards[regenIdx]);
      log(s,actor.id+" · Guard "+KEYS[regenIdx]+" → "+gains(result),"enemy");
      action.kind="guard";action.key=KEYS[regenIdx];
     }else{
      log(s,actor.id+" nincs elegendő MP-je, kimarad a körből.","enemy");
      action.kind="skip";
     }
    }
   }
   if(idx>=0){
    const move=actor.attacks[idx],target=alive[(i+s.round-1)%alive.length];
    actor.mp-=move.mp;
    const result=hit(actor,target,move);
    log(s,actor.id+" · Attack "+KEYS[idx]+" ("+move.type+") → "+target.id+": "+fmt(result),"enemy");
    action.key=KEYS[idx];action.target=target.id;action.type=move.type;
   }
  }
  if(finish(s))return action;
  if(s.enemyIndex>=s.enemies.length)finishEnemyPhase(s);
  return action;
 }
 finishEnemyPhase(s);return null;
}
function enemyTurn(s){
 beginEnemyPhase(s);
 while(s.phase==="enemy"&&!s.winner)stepEnemy(s);
 return s;
}
function next(s,deferEnemy=false){
 if(finish(s))return s;
 for(let i=s.turnIndex+1;i<s.party.length;i++)if(s.party[i].hp>0){s.turnIndex=i;return s;}
 return deferEnemy?beginEnemyPhase(s):enemyTurn(s);
}
function enemyTarget(s,id){const e=s.enemies.find(x=>x.id===id&&x.hp>0);if(!e)throw Error("Válassz élő ellenfelet.");return e;}
function act(s,kind,key,targetId,options){
 const deferEnemy=Boolean(options&&options.deferEnemy);
 const hero=active(s);
 if(!hero||hero.hp<=0)throw Error("Nincs aktív, élő csapattag.");
 if(kind==="fallback"){
  if(hero.id!=="I"||hero.mp!==0)throw Error("A póttámadás kizárólag I számára, 0 MP-nél használható.");
  const t=enemyTarget(s,targetId),r=hit(hero,t,move("physical",15,0,0));
  log(s,"I · Póttámadás → "+t.id+": "+fmt(r),"attack");return next(s,deferEnemy);
 }
 const idx=KEYS.indexOf(key);if(idx<0)throw Error("Érvénytelen akció.");
 if(kind==="guard"){
  const r=guardEffect(hero,hero.guards[idx]);
  log(s,hero.id+" · Guard "+key+" → "+gains(r),"guard");return next(s,deferEnemy);
 }
 if(kind!=="attack")throw Error("Érvénytelen akció.");
 const target=enemyTarget(s,targetId),v=hero.attacks[idx];
 if(hero.mp<v.mp)throw Error("Nincs elegendő MP ehhez a támadáshoz.");
 hero.mp-=v.mp;
 const r=hit(hero,target,v);
 log(s,hero.id+" · Attack "+key+" ("+v.type+") → "+target.id+": "+fmt(r),"attack");
 return next(s,deferEnemy);
}
return {defaults,sanitize,validate,makeBattle,active,act,stepEnemy,beginEnemyPhase,rawToHp,protection,hit,guardEffect,
 config:{TYPES,KEYS,MAX,MAX_PERCENT:PERCENT_MAX}};
});
