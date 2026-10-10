/* Original synthesized Combat Lab music and effects; no third-party recordings. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.CombatAudio=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
let context,musicGain,sfxGain,timer=null,step=0,enabled=true,track="battle";
const voices=new Set();
let musicVolume=.4,sfxVolume=.65;
function ensure(){
 if(context)return context;
 const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!AudioContext)return null;
 context=new AudioContext();
 musicGain=context.createGain();musicGain.gain.value=musicVolume*.30;musicGain.connect(context.destination);
 sfxGain=context.createGain();sfxGain.gain.value=sfxVolume*.40;sfxGain.connect(context.destination);
 return context;
}
function tone(freq,duration=.12,volume=.18,wave="square",channel="sfx",delay=0){
 if(!enabled||!ensure())return;
 const now=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(freq,now);
 gain.gain.setValueAtTime(.001,now);
 gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume),now+.01);
 gain.gain.exponentialRampToValueAtTime(.001,now+duration);
 osc.connect(gain);gain.connect(channel==="music"?musicGain:sfxGain);
 voices.add(osc);osc.addEventListener("ended",()=>voices.delete(osc));
 osc.start(now);osc.stop(now+duration+.02);
}
function noise(duration=.11,volume=.16){
 if(!enabled||!ensure())return;
 const size=Math.max(256,Math.floor(context.sampleRate*duration)),buffer=context.createBuffer(1,size,context.sampleRate);
 const data=buffer.getChannelData(0);
 for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size);
 const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
 filter.type="lowpass";filter.frequency.value=730;
 gain.gain.value=volume;
 source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(sfxGain);source.start();
}
const notes=[110,165,174.61,146.83,110,196,174.61,146.83,130.81,196,220,174.61,130.81,146.83,123.47,164.81];
function beat(){
 if(!enabled||!context||context.state==="suspended")return;
 if(track!=="battle")return;
 const n=notes[step%16],oct=step%4===0;
 if(step%2===0)tone(n,.21,.29,"triangle","music");
 if(step%4===2)tone(n*2,.105,.06,"sawtooth","music");
 if(step%4===0)tone(n/2,.32,.19,"triangle","music");
 if(step%8===4)tone(75,.065,.08,"sine","music");
 step++;
}
function start(){
 if(!ensure())return;
 context.resume().catch(()=>{});
 if(timer===null)timer=setInterval(beat,215);
 track="battle";
}
function pause(){track="silent";}
function resume(){track="battle";}
function stop(){track="silent";if(timer!==null){clearInterval(timer);timer=null;}
 for(const osc of voices){try{osc.stop(0);}catch(_){}}voices.clear();}
function sfx(name,type="physical",variant=0){
 if(!enabled||!ensure())return;
 context.resume().catch(()=>{});
 const mod=variant*34;
 if(name==="cursor")tone(620,.038,.09,"square");
 else if(name==="confirm"){tone(700,.06,.13);tone(935,.075,.10,"triangle","sfx",.065);}
 else if(name==="back")tone(380,.08,.09,"square");
 else if(name==="hit"||name==="attack"){
  if(type==="physical"){noise(.11,.19+variant*.02);tone(115+mod,.085,.12,"sawtooth");}
  else if(type==="magical"){tone(430+mod,.21,.17,"sine");tone(640+mod,.18,.13,"triangle","sfx",.065);}
  else{noise(.12,.12);tone(490+mod,.2,.15,"sawtooth");tone(690+mod,.15,.1,"sine","sfx",.075);}
 }else if(name==="guard"){tone(415+mod,.16,.14,"sine");tone(625+mod,.19,.09,"triangle","sfx",.07);}
 else if(name==="ko"){tone(235,.18,.15,"sawtooth");tone(155,.22,.13,"sawtooth","sfx",.17);}
}
function fanfare(won,speed=1){
 pause();
 if(!ensure())return;
 context.resume().catch(()=>{});
 const seq=won?[523,659,784,1047]:[440,370,330,220];
 seq.forEach((freq,i)=>tone(freq,(i===3?.65:.24)/speed,.28,won?"square":"triangle","sfx",i*.18/speed));
}
function volumes(music,effects){
 musicVolume=Math.min(1,Math.max(0,music));sfxVolume=Math.min(1,Math.max(0,effects));
 if(musicGain)musicGain.gain.value=musicVolume*.30;
 if(sfxGain)sfxGain.gain.value=sfxVolume*.40;
}
function mute(value){enabled=!value;if(value)pause();}
return {start,stop,pause,resume,sfx,fanfare,volumes,mute};
});