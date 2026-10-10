/* Combat Lab: spatial, visual D-pad target selection for a fixed-column sprite grid. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.CombatTargetGrid=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const DIRECTIONS=new Set(["up","down","left","right"]);
function select(enemies,currentId,direction,columns=4){
 if(!DIRECTIONS.has(direction))throw Error("Invalid targeting direction");
 if(!Number.isInteger(columns)||columns<1)throw Error("Invalid grid width");
 const alive=enemies.map((unit,index)=>({unit,index,row:Math.floor(index/columns),col:index%columns}))
  .filter(x=>x.unit&&x.unit.hp>0);
 if(!alive.length)return null;
 const current=alive.find(x=>x.unit.id===currentId)||alive[0];
 const moves=alive.filter(x=>{
  if(x.index===current.index)return false;
  if(direction==="up")return x.row<current.row;
  if(direction==="down")return x.row>current.row;
  if(direction==="left")return x.row===current.row&&x.col<current.col;
  return x.row===current.row&&x.col>current.col;
 });
 if(!moves.length)return current.unit.id;
 const vertical=direction==="up"||direction==="down";
 const perpendicular=x=>vertical?Math.abs(x.col-current.col):Math.abs(x.row-current.row);
 const forward=x=>vertical?Math.abs(x.row-current.row):Math.abs(x.col-current.col);
 moves.sort((a,b)=>perpendicular(a)-perpendicular(b)||forward(a)-forward(b)||a.index-b.index);
 return moves[0].unit.id;
}
return {select};
});