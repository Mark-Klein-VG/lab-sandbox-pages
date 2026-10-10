/* Combat Lab stats collector — read-only snapshots and per-action audit. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.CombatMetrics=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function snapshot(state){
 return {
  party:state.party.map(p=>({id:p.id,hp:p.hp,def:p.def,foc:p.foc,mp:p.mp})),
  enemies:state.enemies.map(p=>({id:p.id,hp:p.hp,def:p.def,foc:p.foc,mp:p.mp}))
 };
}
function makeEvent(before,after,action){
 const changes=[];
 for(const side of ["party","enemies"]){
  const previous=before[side],current=after[side];
  for(const a of current){
   const b=previous.find(x=>x.id===a.id);
   const delta={hp:a.hp-b.hp,def:a.def-b.def,foc:a.foc-b.foc,mp:a.mp-b.mp};
   if(Object.values(delta).some(n=>n!==0))changes.push({side,id:a.id,delta,ko:b.hp>0&&a.hp===0});
  }
 }
 return {...action,changes};
}
function buildReport(config,state,events){
 const scores={},party=state.party.map(x=>x.id),enemies=state.enemies.map(x=>x.id);
 for(const id of party) scores["party:"+id]=createRow(id,"party");
 for(const id of enemies) scores["enemies:"+id]=createRow(id,"enemies");
 for(const event of events){
  const side=event.side,actor=scores[side+":"+event.actor];
  if(!actor)continue;
  actor.actions++;
  if(event.kind==="attack"||event.kind==="fallback"){
   actor.attacks[event.kind==="fallback"?"F":event.key]=(actor.attacks[event.kind==="fallback"?"F":event.key]||0)+1;
  }else if(event.kind==="guard"&&event.key)actor.guards[event.key]++;
  for(const item of event.changes){
   const s=scores[item.side+":"+item.id];
   if(!s)continue;
   if(item.side!==side){
    for(const k of ["hp","def","foc"]){
     if(item.delta[k]<0){const amount=-item.delta[k];actor.dealt[k]+=amount;s.received[k]+=amount;}
    }
    if(item.ko){actor.kos++;s.timesKo++;}
   }else if(item.id===actor.id){
    for(const k of ["hp","def","foc","mp"]){
     if(item.delta[k]>0)actor.recovered[k]+=item.delta[k];
     if(k==="mp"&&item.delta[k]<0)actor.mpSpent+=-item.delta[k];
    }
   }
  }
 }
 return {version:1,exportedAt:new Date().toISOString(),configuration:JSON.parse(JSON.stringify(config)),
  outcome:{winner:state.winner,rounds:state.round,partyCount:party.length,enemyCount:enemies.length},
  participants:[...Object.values(scores)],events:events.map(x=>JSON.parse(JSON.stringify(x))),
  battleLog:state.log.map(x=>({...x}))};
}
function createRow(id,side){
 return {id,side,actions:0,attacks:{A:0,B:0,C:0,F:0},guards:{A:0,B:0,C:0},
 dealt:{hp:0,def:0,foc:0},received:{hp:0,def:0,foc:0},
 recovered:{hp:0,def:0,foc:0,mp:0},mpSpent:0,kos:0,timesKo:0};
}
return {snapshot,makeEvent,buildReport};
});