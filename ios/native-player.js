/* The media facade keeps the existing nine themed controls; decoding is native VLC.
   Live stays in WebKit. Only the bundled main-frame bridge can issue commands. */
(function(){
'use strict';
var v=document.getElementById('video'),handler=window.webkit&&window.webkit.messageHandlers.nativePlayer;
if(!v||!handler)return;
var active=false,id=0,info={},prior='',loaded=false;
function send(command,extra){return handler.postMessage(Object.assign({command:command,id:id},extra||{}));}
var original={load:v.load.bind(v),play:v.play.bind(v),pause:v.pause.bind(v)};
function emit(name){v.dispatchEvent(new Event(name));}
['currentTime','duration','paused','readyState','videoWidth','videoHeight','playbackRate','error','ended'].forEach(function(key){
 var descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,key)||Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype,key);
 Object.defineProperty(v,key,{configurable:true,get:function(){if(!active)return descriptor&&descriptor.get?descriptor.get.call(v):undefined;
 return key==='currentTime'?info.time||0:key==='duration'?info.duration||NaN:key==='paused'?info.state==='pause':key==='readyState'?loaded?4:1:key==='videoWidth'?info.width||0:key==='videoHeight'?info.height||0:key==='playbackRate'?info.rate||1:key==='ended'?info.state==='ended':key==='error'?info.state==='error'?{code:3,message:'Native media decoder could not open this stream'}:null:undefined;
 },set:function(value){if(!active){if(descriptor&&descriptor.set)descriptor.set.call(v,value);return;}if(key==='currentTime')send('seek',{value:Number(value)});if(key==='playbackRate'){info.rate=Number(value);send('rate',{value:info.rate});}}});
});
v.load=function(){
 var source=v.querySelector('source'),url=v.getAttribute('src')||source&&source.src;
 if(active){send('stop').catch(function(){});active=false;document.body.classList.remove('native-media');document.documentElement.style.background='';}
 if(!url||document.getElementById('player').dataset.playbackKind==='live'){original.load();return;}
 original.pause();active=true;id++;info={state:'waiting'};loaded=false;prior='';document.body.classList.add('native-media');document.documentElement.style.background='transparent';
 send('open',{url:url}).catch(function(){info.state='error';emit('error');});
};
v.play=function(){return active?send('play').then(function(){}):original.play();};
v.pause=function(){if(active)send('pause').catch(function(){});else original.pause();};
window.APNativeMediaUpdate=function(data){if(!active||data.id!==id)return;var previousTime=info.time||0;if(data.state==='ended'&&!loaded)data.state='waiting';info=Object.assign(info,data);
 if(!loaded&&data.width>0&&data.time>0){loaded=true;emit('loadedmetadata');emit('canplay');}
 if(data.state!==prior){prior=data.state;emit(data.state);}
 if(data.time!==previousTime)emit('timeupdate');
};
window.APNativePlayback={get active(){return active;},get info(){return Object.assign({},info);}};
})();
