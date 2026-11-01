/* The media facade keeps the existing themed controls; decoding is native VLC.
   Live stays in WebKit. Only the bundled main-frame bridge can issue commands.
   2.8: the WebKit element no longer downloads the VOD stream in parallel with VLC,
   seeks are optimistic and coalesced, and every bridge promise is caught so a refused
   command can never leave an unhandled rejection or a stuck control. */
(function(){
'use strict';
var v=document.getElementById('video'),handler=window.webkit&&window.webkit.messageHandlers.nativePlayer;
if(!v||!handler)return;
var active=false,id=0,info={},prior='',loaded=false,url='',seekTarget=null,seekUntil=0,hold=null;
function send(command,extra){try{return Promise.resolve(handler.postMessage(Object.assign({command:command,id:id},extra||{})));}catch(e){return Promise.reject(e);}}
function quiet(p){p.catch(function(){});return p;}
var original={load:v.load.bind(v),play:v.play.bind(v),pause:v.pause.bind(v)};
function emit(name){try{v.dispatchEvent(new Event(name));}catch(e){}}
function seekTo(value){
 var d=Number(info.duration)||0,t=Math.max(0,Number(value)||0);if(d>0)t=Math.min(t,Math.max(0,d-1));
 info.time=t;seekTarget=t;seekUntil=Date.now()+2500;
 quiet(send('seek',{value:t}));emit('seeking');emit('timeupdate');
}
['currentTime','duration','paused','readyState','videoWidth','videoHeight','playbackRate','error','ended','src','currentSrc'].forEach(function(key){
 var descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,key)||Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype,key);
 Object.defineProperty(v,key,{configurable:true,get:function(){if(!active)return descriptor&&descriptor.get?descriptor.get.call(v):undefined;
 return key==='src'||key==='currentSrc'?url:key==='currentTime'?info.time||0:key==='duration'?info.duration||NaN:key==='paused'?info.state==='pause':key==='readyState'?loaded?4:1:key==='videoWidth'?info.width||0:key==='videoHeight'?info.height||0:key==='playbackRate'?info.rate||1:key==='ended'?info.state==='ended':key==='error'?info.state==='error'?{code:3,message:'Native media decoder could not open this stream'}:null:undefined;
 },set:function(value){
  if(!active||key==='src'){if(descriptor&&descriptor.set)descriptor.set.call(v,value);return;}
  if(key==='currentTime')seekTo(value);
  if(key==='playbackRate'){info.rate=Number(value);quiet(send('rate',{value:info.rate}));}
 }});
});
v.load=function(){
 var source=v.querySelector('source'),next=v.getAttribute('src')||source&&source.src;
 if(active){quiet(send('stop'));active=false;url='';document.body.classList.remove('native-media');document.documentElement.style.background='';}
 if(!next||document.getElementById('player').dataset.playbackKind==='live'){original.load();return;}
 // VLC owns this stream: stop WebKit fetching the same URL (a second connection that
 // single-connection IPTV accounts reject, which stalled VLC mid-film).
 v.removeAttribute('src');if(source)source.remove();original.pause();original.load();
 active=true;id++;url=next;info={state:'waiting'};loaded=false;prior='';seekTarget=null;hold=null;
 document.body.classList.add('native-media');document.documentElement.style.background='transparent';
 send('open',{url:next}).catch(function(){info.state='error';emit('error');});
};
function optimistic(state){info.state=state;prior=state;hold={state:state,until:Date.now()+1500};if(state==='pause')emit('pause');else{emit('play');emit('playing');}}
v.play=function(){if(!active)return original.play();if(loaded)optimistic('playing');return send('play').then(function(){});};
v.pause=function(){if(active){if(loaded)optimistic('pause');quiet(send('pause'));}else original.pause();};
window.APNativeMediaUpdate=function(data){if(!active||data.id!==id)return;var previousTime=info.time||0;if(data.state==='ended'&&!loaded)data.state='waiting';
 // Ignore stale positions while VLC is still applying the newest seek target.
 if(seekTarget!==null){if(Math.abs(Number(data.time)-seekTarget)<3||Date.now()>seekUntil){seekTarget=null;emit('seeked');}else data.time=info.time;}
 if(hold){if(data.state===hold.state||Date.now()>hold.until)hold=null;else data.state=hold.state;}
 info=Object.assign(info,data);
 if(!loaded&&data.width>0&&data.time>0){loaded=true;emit('loadedmetadata');emit('canplay');}
 if(data.state!==prior){prior=data.state;emit(data.state);}
 if(data.time!==previousTime)emit('timeupdate');
};
window.APNativePlayback={get active(){return active;},get info(){return Object.assign({},info);},get url(){return url;},
 call:function(command,extra){return send(command,extra);}};
})();
