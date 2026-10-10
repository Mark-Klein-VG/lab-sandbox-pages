/* Pre-battle controller focus navigation and on-demand virtual numeric keypad. */
(function(){
"use strict";
let overlay=null,field=null,buffer="0",focusBefore=null,lastKeys=[],lastMove=0;
function get(id){return document.getElementById(id);}
function ensure(){
 if(overlay)return;
 overlay=document.createElement("div");overlay.id="numeric-pad";overlay.hidden=true;
 overlay.innerHTML='<div class="numeric-dialog" role="dialog" aria-modal="true" aria-label="Számbevitel kontrollerrel"><h2>Numeric input</h2><div id="numeric-label"></div><div id="numeric-display" class="numeric-display">0</div><div class="numeric-grid">'+
 ["1","2","3","4","5","6","7","8","9","TÖRLÉS","0","CLEAR","OK","MÉGSE"].map((k,i)=>'<button type="button" data-num="'+i+'">'+k+'</button>').join("")+
 '</div><p id="numeric-hint"></p></div>';
 document.body.appendChild(overlay);
 overlay.addEventListener("click",e=>{const b=e.target.closest("button[data-num]");if(b)choose(+b.dataset.num);});
}
function open(el){
 if(!el||el.type!=="number")return;
 ensure();field=el;focusBefore=el;buffer=String(Math.trunc(Number(el.value)||0));
 const label=el.closest("label")?.querySelector("span")?.textContent||"Érték";
 get("numeric-label").textContent=label;
 const min=Number(el.min||0),max=Number(el.max||10000);
 get("numeric-hint").textContent="Tartomány: "+min+"–"+max+" · OK: mentés · MÉGSE: vissza";
 refresh();overlay.hidden=false;
 overlay.querySelector('button[data-num="0"]').focus();
}
function refresh(){if(overlay)get("numeric-display").textContent=buffer;}
function close(){
 if(!overlay)return;
 overlay.hidden=true;field=null;
 if(focusBefore)focusBefore.focus({preventScroll:true});
}
function choose(i){
 if(!field)return;
 if(i<9)buffer=(buffer==="0"?String(i+1):buffer+String(i+1)).slice(0,6);
 else if(i===10)buffer=(buffer==="0"?"0":buffer+"0").slice(0,6);
 else if(i===9)buffer=buffer.length>1?buffer.slice(0,-1):"0";
 else if(i===11)buffer="0";
 else if(i===12){
  const min=Number(field.min||0),max=Number(field.max||10000);
  const n=Math.max(min,Math.min(max,Math.trunc(Number(buffer)||0)));
  field.value=String(n);
  field.dispatchEvent(new Event("input",{bubbles:true}));
  field.dispatchEvent(new Event("change",{bubbles:true}));
  close();return;
 }else if(i===13){close();return;}
 refresh();
}
function focusables(){
 const root=get("setup-screen");if(!root||root.hidden)return [];
 return [...root.querySelectorAll("button,input:not([type=hidden]),select,textarea,summary")].filter(el=>!el.disabled&&el.getClientRects().length>0);
}
function poll(t){
 requestAnimationFrame(poll);
 if(!get("setup-screen")||get("setup-screen").hidden){lastKeys=[];return;}
 const pads=navigator.getGamepads?.()||[],p=[...pads].find(p=>p&&p.connected);
 if(!p){lastKeys=[];return;}
 const ids=[0,1,12,13,14,15],keys=ids.map(i=>Boolean(p.buttons[i]?.pressed));
 const rise=n=>{const i=ids.indexOf(n);return keys[i]&&!lastKeys[i];};
 const move=(p.buttons[12]?.pressed||p.buttons[14]?.pressed||p.axes[1]<-.6||p.axes[0]<-.6)?-1:
 (p.buttons[13]?.pressed||p.buttons[15]?.pressed||p.axes[1]>.6||p.axes[0]>.6)?1:0;
 if(move&&t-lastMove>170){
  lastMove=t;
  const targets=overlay&&!overlay.hidden?[...overlay.querySelectorAll("button")]:focusables();
  const idx=targets.indexOf(document.activeElement);
  if(targets.length)targets[(idx+move+targets.length)%targets.length].focus({preventScroll:false});
 }
 if(rise(1)){
  if(overlay&&!overlay.hidden)close();
  else document.activeElement?.blur();
 }
 if(rise(0)){
  if(overlay&&!overlay.hidden){
   const btn=overlay.querySelector("button:focus")||overlay.querySelector("button");btn?.click();
  }else{
   let el=document.activeElement;
   if(!focusables().includes(el)){const list=focusables();el=list[0];el?.focus();}
   if(el?.type==="number")open(el);
   else if(el?.tagName==="SELECT"){el.selectedIndex=(el.selectedIndex+1)%el.options.length;el.dispatchEvent(new Event("change",{bubbles:true}));}
   else el?.click();
  }
 }
 lastKeys=keys;
}
requestAnimationFrame(poll);
})();