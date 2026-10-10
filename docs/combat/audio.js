/* CC0 JRPG battle loop by HydroGene (OpenGameArt) + original procedural sound effects. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.CombatAudio=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
let context,sfxGain,enabled=true,track="battle",music=null;
const MUSIC_URL="./assets/jrpg_battle_loop.mp3";
const voices=new Set();
let musicVolume=.4,sfxVolume=.65;
function ensure(){
 if(context)return context;
 const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!AudioContext)return null;
 context=new AudioContext();
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
 osc.connect(gain);gain.connect(sfxGain);
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
/* Intro is optional; this supplied CC0 file is the author's seamless loop segment. */
function getMusic(){
 if(music)return music;
 const Audio=globalThis.Audio;
 if(typeof Audio!=="function")return null;
 music=new Audio(MUSIC_URL);
 music.loop=true;music.preload="auto";
 music.volume=enabled?musicVolume:0;
 return music;
}
function playMusic(){
 const song=getMusic();
 if(!song||!enabled)return;
 song.volume=musicVolume;
 const promise=song.play();
 if(promise&&typeof promise.catch==="function")promise.catch(()=>{ /* Offline/blocked hosting: leave music silent, no synthetic fallback. */ });
}
function start(){
 track="battle";
 const song=getMusic();
 if(song&&song.ended)song.currentTime=0;
 playMusic();
}
function pause(){
 track="silent";
 if(music)music.pause();
}
function resume(){
 track="battle";
 playMusic();
}
function stop(){
 track="silent";
 if(music){music.pause();try{music.currentTime=0;}catch(_){}}
 for(const osc of voices){try{osc.stop(0);}catch(_){}}
 voices.clear();
}

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
function volumes(musicLevel,effectsLevel){
 musicVolume=Math.min(1,Math.max(0,musicLevel));
 sfxVolume=Math.min(1,Math.max(0,effectsLevel));
 if(music)music.volume=enabled?musicVolume:0;
 if(sfxGain)sfxGain.gain.value=sfxVolume*.40;
}
function mute(value){enabled=!value;if(value)pause();else if(track==="battle")playMusic();}
return {start,stop,pause,resume,sfx,fanfare,volumes,mute,MUSIC_URL};
});