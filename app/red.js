/* Red layouts and shared native subtitle picker. Loaded after app.js. */
(function(){
'use strict';
var body=document.body;
function $(id){return document.getElementById(id);}
var video=$('video'),player=$('player'),detail=$('series-detail'),ui=$('player-ui');
if(!body||!video||!player||!detail||!ui)return;
var fs=false;
function isRed(){return (body.dataset.theme==='red'||(body.dataset.theme==='aya'||body.dataset.theme==='alaa'||body.dataset.theme==='harak'||body.dataset.theme==='muse'||body.dataset.theme==='velour'));}
window.APRed={
 layout:function(){return {grid:body.dataset.theme==='muse'||body.dataset.theme==='velour'?{cols:6,row:310,page:30}:body.dataset.theme==='harak'?{cols:5,row:344,page:30}:body.dataset.theme==='alaa'?{cols:6,row:300,page:30}:(body.dataset.theme==='aya'||body.dataset.theme==='alaa'||body.dataset.theme==='harak'||body.dataset.theme==='muse'||body.dataset.theme==='velour')?{cols:4,row:430,page:24}:{cols:5,row:398,page:25},episodes:(body.dataset.theme==='aya'||body.dataset.theme==='alaa'||body.dataset.theme==='harak'||body.dataset.theme==='muse'||body.dataset.theme==='velour')?{cols:2,size:30,row:112}:{cols:1,size:30,row:64}};},
 episodeMode:function(full){fs=full;sync();paintPills();},
 inlineFree:function(){return body.classList.contains('red-inline')&&!player.contains(document.activeElement);}
};
function el(tag,id,cls,text){var e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
/* header crumb + playlist pills */
var header=document.querySelector('header'),clockbox=$('clockbox');
var crumb=el('div','red-crumb'),crumbMain=el('b'),crumbSub=el('span');crumb.appendChild(crumbMain);crumb.appendChild(crumbSub);
var pills=el('div','red-pills-head'),pl=el('div'),pla=el('div');
var plEm=el('em',null,null,'');pl.appendChild(document.createTextNode(tr('Playlist: ')));pl.appendChild(plEm);var plSmall=el('small',null,null,'Alaa Player');pl.appendChild(plSmall);
pla.appendChild(el('em',null,null,'Alaa Player'));pla.appendChild(el('small',null,null,'webOS'));
pills.appendChild(pl);pills.appendChild(pla);
header.insertBefore(crumb,clockbox);header.insertBefore(pills,clockbox);
/* 1.3.9 home header: wide search pill + small working icons (no page chip) */
var brandStrong=document.querySelector('.brand strong');if(brandStrong){brandStrong.textContent='';brandStrong.appendChild(document.createTextNode('Alaa '));var bi=el('span',null,'brand-accent','Player');brandStrong.appendChild(bi);}
var sp=el('button','red-search','red-search'),spI=el('span',null,'red-search-ic');spI.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/></svg>';sp.type='button';sp.appendChild(spI);sp.appendChild(el('span',null,'red-search-tx',tr('ابحث عن قناة، فيلم أو مسلسل ...')));
sp.onclick=function(){$('nav-search').click();};
var ics=el('div','red-icons');
function ic(id,label,svg,target){var b=el('button',id,'red-ic');b.type='button';b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+svg+'</svg>';b.onclick=function(){$(target).click();};ics.appendChild(b);}
ic('red-ic-fav',tr('المفضلة'),'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>','nav-favorites');
ic('red-ic-recent',tr('المشاهدة الأخيرة'),'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>','nav-recent');
ic('red-ic-set',tr('الإعدادات'),'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>','settings-open');
header.insertBefore(sp,clockbox);header.insertBefore(ics,clockbox);
function txt(n){return (n&&n.textContent||'').replace(/\s+/g,' ').trim();}
function updateCrumb(){
 if(!isRed())return;
 var sel=document.querySelector('nav button.selected'),main=txt(sel)||txt($('heading'));
 var sub='';
 if(!detail.hidden){main=txt($('series-title'))||main;sub=txt($('series-meta'));}
 else if(!$('browser').hidden){var cs=$('categories').querySelector('button.selected .category-label');sub=txt(cs);}
 crumbMain.textContent=main;crumbSub.textContent=sub;crumbSub.hidden=!sub;
 var p=$('providers'),o=p&&p.options&&p.options[p.selectedIndex];plEm.textContent=o?o.text:'—';
}
/* inline / fullscreen state */
function sync(){
 if(!isRed()){body.classList.remove('red-inline','red-fs');return;}
 var inline=!detail.hidden&&!fs;
 body.classList.toggle('red-inline',inline);body.classList.toggle('red-fs',fs&&!player.hidden);
 if(player.hidden&&fs)fs=false;
}
/* player extras */
var meta=el('div','red-meta'),res=el('span','red-res');
ui.insertBefore(meta,ui.firstChild.nextSibling);
var bar=ui.querySelector('#time-progress');ui.insertBefore(res,bar.nextSibling);
var wrap=el('div','red-pills'),bSub=el('button','red-sub'),bAudio=el('button','red-audio',null,tr('الصوت')),bAsp=el('button','red-aspect'),bFs=el('button','red-fs');
bSub.type=bAudio.type=bAsp.type=bFs.type='button';
wrap.appendChild(bSub);wrap.appendChild(bAudio);wrap.appendChild(bAsp);wrap.appendChild(bFs);ui.appendChild(wrap);
var list=el('div','red-sublist');list.hidden=true;
var closeB=el('button','red-sub-close',null,'\u2715');closeB.type='button';closeB.setAttribute('aria-label','close');list.appendChild(closeB);
list.appendChild(el('h3',null,null,'\u0627\u0644\u062a\u0631\u062c\u0645\u0629 / Subtitles'));
var items=el('div','red-sublist-items');list.appendChild(items);player.appendChild(list);
function pill(label,b){b.replaceChildren();var s=el('b',null,null,label[0]);b.appendChild(s);b.appendChild(document.createTextNode(label[1]));}
var trackKind='text',trackOpenedAt=0;
var aspects=[['contain',tr('Original')],['cover',tr('Zoom')],['fill',tr('Stretch')]],ai=0;
function paintPills(){
 var cur='OFF',tracks=video.textTracks||[];
 for(var i=0;i<tracks.length;i++)if(tracks[i].mode==='showing')cur=short(tracks[i],i);
 pill(['TT',cur],bSub);pill(['\u25A2',aspects[ai][1]],bAsp);pill(['\u26F6',tr('Fullscreen')],bFs);
 bFs.lastChild.textContent=fs?tr('Exit'):tr('Fullscreen');
}
function short(t,i){var lang=String(t.language||'').toLowerCase();return /^(ar|ara)$/.test(lang)?tr('العربية'):/^(tr|tur)$/.test(lang)?'Türkçe':String(t.label||t.language||(trackKind==='audio'?tr('الصوت '):tr('ترجمة '))+(i+1));}
/* Experimental commercial-TV adapter. Community Lampa sequence, not a public TV API contract.
 * Never blocks playback, probes indices, reloads, stops or unloads the HTML pipeline. */
var nativeTracks={audio:[],text:[],status:'off'},nativeGeneration=0,nativeHandles=[],nativeTimers=[],nativeSource='',nativeMediaId='',nativeAttempted=false;
function nativeEnabled(){try{return localStorage.getItem('ap-experimental-lg-tracks')==='1';}catch(e){return false;}}
function actualLG(){return /web[o0]s|netcast/i.test(navigator.userAgent)&&!!(window.PalmSystem||window.webOS)&&!!(window.PalmServiceBridge||(window.webOS&&window.webOS.service&&window.webOS.service.request));}
function clearNative(status){nativeGeneration++;nativeTimers.forEach(clearTimeout);nativeTimers=[];nativeHandles.forEach(function(h){try{if(h&&typeof h.cancel==='function')h.cancel();}catch(e){}});nativeHandles=[];nativeTracks={audio:[],text:[],status:status||'unknown'};nativeMediaId='';}
function nativeCurrent(g,id){return g===nativeGeneration&&nativeEnabled()&&actualLG()&&!player.hidden&&String(video.currentSrc||video.src||'')===nativeSource&&String(video.mediaId||'')===id;}
function nativeRequest(method,parameters,success,failure){try{var h;if(window.webOS&&window.webOS.service&&window.webOS.service.request){h=window.webOS.service.request('luna://com.webos.media',{method:method,parameters:parameters,onSuccess:function(r){try{success(r);}catch(e){failure();}},onFailure:failure});}else{h=new window.PalmServiceBridge();h.onservicecallback=function(raw){try{var r=JSON.parse(raw);if(r.returnValue===false||r.errorCode)failure();else success(r);}catch(e){failure();}};h.call('luna://com.webos.media/'+method,JSON.stringify(parameters));}nativeHandles.push(h);return h;}catch(e){failure();return null;}}
function nativeFail(g){if(g!==nativeGeneration)return;clearNative('unavailable');updateTracks();}
function discoverNative(){
 var src=String(video.currentSrc||video.src||'');if(src!==nativeSource){clearNative('unknown');nativeSource=src;nativeAttempted=false;}
 if(!nativeEnabled()||!actualLG()||player.hidden||!src||nativeAttempted)return;
 nativeAttempted=true;nativeTracks.status='loading';var g=nativeGeneration,tries=0;
 function seekId(){if(g!==nativeGeneration||!nativeEnabled()||player.hidden)return;var id=String(video.mediaId||'');if(!id){if(++tries<5)nativeTimers.push(setTimeout(seekId,300));else nativeFail(g);return;}nativeMediaId=id;
 nativeRequest('subscribe',{mediaId:id,subscribe:true},function(r){if(!nativeCurrent(g,id))return;var programs=r&&r.sourceInfo&&r.sourceInfo.programInfo;if(!Array.isArray(programs)||programs.length!==1)return;var program=programs[0];['audio','text'].forEach(function(kind){var entries=program[kind==='audio'?'audioTrackInfo':'subtitleTrackInfo'];if(!Array.isArray(entries))return;nativeTracks[kind]=entries.map(function(t,index){if(!t||typeof t!=='object')return null;return{native:true,nativeIndex:index,mediaId:id,generation:g,language:String(t.language||''),label:'',enabled:kind==='audio'&&index===0,mode:'disabled'};}).filter(Boolean);});nativeTracks.status='ready';updateTracks();},function(){nativeFail(g);});
 nativeTimers.push(setTimeout(function(){if(!nativeCurrent(g,id))return;if(nativeTracks.status!=='ready')nativeFail(g);else{nativeHandles.forEach(function(h){try{if(h&&h.cancel)h.cancel();}catch(e){}});nativeHandles=[];}},4000));
 }seekId();
}
function selectNative(track,off){var id=nativeMediaId,g=nativeGeneration;if(!id||!nativeCurrent(g,id))return;var kind=trackKind;var selected=off?null:track;if(!off&&(!selected||selected.generation!==g||selected.mediaId!==id||nativeTracks[kind].indexOf(selected)<0))return;
 var failed=function(){nativeFail(g);};function commit(){if(!nativeCurrent(g,id))return;nativeTracks[kind].forEach(function(t){if(kind==='audio')t.enabled=t===selected;else t.mode=t===selected?'showing':'disabled';});updateTracks();}
 function choose(){if(!nativeCurrent(g,id))return;nativeRequest('selectTrack',{type:kind==='audio'?'audio':'text',mediaId:id,index:selected.nativeIndex},function(r){if(r&&r.returnValue===false)failed();else commit();},failed);}
 if(kind==='audio'){choose();return;}
 nativeRequest('setSubtitleEnable',{mediaId:id,enable:!off},function(r){if(!nativeCurrent(g,id))return;if(r&&r.returnValue===false){failed();return;}if(off)commit();else nativeTimers.push(setTimeout(choose,500));},failed);
}
var nativeToggle=el('button','experimental-lg-tracks',null),nativeNote=el('p',null,'note',tr('تجريبي على LG فقط. قد لا تعمل المسارات أو قد يتجمّد التشغيل حسب التلفزيون. أوقفه إذا واجهت مشكلة.'));nativeToggle.type='button';
function paintNativeToggle(){var enabled=nativeEnabled();nativeToggle.textContent=tr('مسارات LG التجريبية: ')+(enabled?tr('تشغيل'):tr('إيقاف'));nativeToggle.setAttribute('aria-pressed',String(enabled));}
var settingsRow=$('glass-row');settingsRow.appendChild(nativeToggle);settingsRow.appendChild(nativeNote);paintNativeToggle();
nativeToggle.onclick=function(){var enabled=!nativeEnabled();try{localStorage.setItem('ap-experimental-lg-tracks',enabled?'1':'0');}catch(e){return;}clearNative(enabled?'unknown':'off');nativeAttempted=false;paintNativeToggle();if(enabled)discoverNative();updateTracks();};
['loadedmetadata','loadeddata','canplay'].forEach(function(event){video.addEventListener(event,discoverNative);});
video.addEventListener('emptied',function(){clearNative(nativeEnabled()?'unknown':'off');nativeAttempted=false;nativeSource='';updateTracks();});
video.addEventListener('error',function(){clearNative('unavailable');updateTracks();});
new MutationObserver(function(){if(player.hidden){clearNative(nativeEnabled()?'unknown':'off');nativeAttempted=false;nativeSource='';}else discoverNative();}).observe(player,{attributes:true,attributeFilter:['hidden']});
function trackList(){var dom=trackKind==='audio'?video.audioTracks:video.textTracks;return dom&&dom.length?dom:nativeTracks[trackKind];}
function paintList(){
 var focused=document.activeElement&&document.activeElement.dataset.track;items.replaceChildren();list.querySelector('h3').textContent=trackKind==='audio'?tr('الصوت'):tr('الترجمة / Subtitles');var tracks=trackList()||[],none=true;
 if(trackKind==='text'){var off=el('button',null,'sel','OFF');off.type='button';off.className='selected';items.appendChild(off);}
 for(var i=0;i<tracks.length;i++)(function(t,n){var b=el('button',null,null,short(t,n));b.type='button';b.dataset.track=n;items.appendChild(b);if(trackKind==='audio'?t.enabled:t.mode==='showing'){var off=items.querySelector('.selected');if(off)off.className='';b.className='selected';}none=false;})(tracks[i],i);
 if(none){items.appendChild(el('p',null,null,Date.now()-trackOpenedAt<1800?tr('جارٍ انتظار المسارات من التلفزيون…'):tr('لم يتمكن التلفزيون من إظهار المسارات بعد. قد تكون داخل الملف لكن واجهة التشغيل لا تعرضها.')));}
 if(focused!=null){var target=items.querySelector('[data-track="'+focused+'"]');if(target)target.focus();}
}
function pick(btn){var tracks=trackList()||[],idx=btn.dataset.track==null?null:Number(btn.dataset.track);if(idx!==null&&(!Number.isInteger(idx)||idx<0||idx>=tracks.length))return;
 if((idx!==null&&tracks[idx].native)||(idx===null&&tracks===nativeTracks.text&&tracks.length)){selectNative(idx===null?null:tracks[idx],idx===null);return;}
 try{for(var i=0;i<tracks.length;i++){if(trackKind==='audio')tracks[i].enabled=i===idx;else tracks[i].mode=i===idx?'showing':'disabled';}}catch(e){items.appendChild(el('p',null,null,tr('لم يتمكن التلفزيون من تغيير المسار.')));return;}
 paintList();paintPills();var next=idx===null?items.querySelector('button'):items.querySelector('[data-track="'+idx+'"]');if(next)next.focus();
}
function openList(kind){trackKind=kind||'text';trackOpenedAt=Date.now();paintList();list.hidden=false;var b=items.querySelector('button.selected')||items.querySelector('button')||closeB;b.focus();}
function closeList(){if(list.hidden)return false;list.hidden=true;(trackKind==='audio'?bAudio:bSub).focus();return true;}
bSub.onclick=function(){if(list.hidden||trackKind!=='text')openList('text');else closeList();};
bAudio.onclick=function(){if(list.hidden||trackKind!=='audio')openList('audio');else closeList();};
closeB.onclick=closeList;items.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button');if(b)pick(b);});
function updateTracks(){paintPills();if(!list.hidden)paintList();}
['loadedmetadata','loadeddata','canplay','emptied'].forEach(function(event){video.addEventListener(event,updateTracks);});
[video.audioTracks,video.textTracks].forEach(function(tracks){if(tracks&&tracks.addEventListener)['addtrack','removetrack','change'].forEach(function(event){tracks.addEventListener(event,updateTracks);});});
// No URLs, provider names, media IDs, credentials or raw native payloads.
window.APTrackDiagnostics=function(){var result={htmlAudioExposed:!!video.audioTracks,htmlTextExposed:!!video.textTracks,readyState:video.readyState,errorCode:video.error&&video.error.code||0,nativeRoute:nativeEnabled()?(actualLG()?nativeTracks.status:'not-LG'):'off',nativeAudioCount:nativeTracks.audio.length,nativeTextCount:nativeTracks.text.length};['audio','text'].forEach(function(kind){var list=kind==='audio'?video.audioTracks:video.textTracks;result[kind]=Array.from(list||[]).map(function(t,index){return{index:index,language:String(t.language||'').replace(/[^a-zA-Z-]/g,'').slice(0,12),selected:kind==='audio'?!!t.enabled:t.mode==='showing'};});});return result;};
bAsp.onclick=function(){ai=(ai+1)%aspects.length;video.style.objectFit=aspects[ai][0];paintPills();};
bFs.onclick=function(){if(player.dataset.playbackKind==='episode'&&window.APEpisodePresentation){window.APEpisodePresentation.fullscreen(!body.classList.contains('episode-fullscreen'));return;}fs=!fs;sync();paintPills();bFs.focus();};
if(video.textTracks&&video.textTracks.addEventListener){video.textTracks.addEventListener('addtrack',function(){paintPills();if(!list.hidden)paintList();});video.textTracks.addEventListener('removetrack',paintPills);}
/* metadata line, rating stars (from the series' own rating), resolution */
function updateMeta(){
 var m=txt($('series-meta')).split(' \u00b7 '),genre='',stars='';
 var r=/\u2605\s*([0-9.]+)/.exec(txt($('series-meta')));
 m.forEach(function(x){if(x&&!/\u2605/.test(x)&&!/^\d{4}$/.test(x)&&!genre)genre=x;});
 meta.replaceChildren();
 if(!detail.hidden&&state_ok()){
  meta.appendChild(document.createTextNode(genre));
  if(r){var n=Math.max(0,Math.min(5,Math.round(parseFloat(r[1])/2)));if(n){var i=el('i',null,null,new Array(n+1).join('\u2605'));meta.appendChild(i);}}
 }
}
function state_ok(){return true;}
function updateRes(){res.textContent=video.videoWidth?video.videoWidth+' x '+video.videoHeight:'';}
['loadedmetadata','resize','emptied'].forEach(function(n){video.addEventListener(n,updateRes);});
/* mark the episode that is playing */
function markPlaying(){
 var rows=$('episode-list').querySelectorAll('.episode-row'),name=txt($('playing-name')),on=!player.hidden;
 for(var i=0;i<rows.length;i++){var s=rows[i].querySelector('strong');rows[i].classList.toggle('playing',on&&!!s&&name.indexOf(txt(s))>=0);}
}
/* observers: attribute/child changes only, no layout reads */
function all(){sync();paintPills();if(!isRed())return;updateCrumb();updateMeta();markPlaying();}
var queued=false;
var mo=new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;all();},0);});
mo.observe(detail,{attributes:true,attributeFilter:['hidden']});
mo.observe(player,{attributes:true,attributeFilter:['hidden']});
mo.observe(body,{attributes:true,attributeFilter:['data-theme']});
mo.observe($('playing-name'),{childList:true,characterData:true,subtree:true});
mo.observe($('series-title'),{childList:true,characterData:true,subtree:true});
mo.observe($('series-meta'),{childList:true,characterData:true,subtree:true});
mo.observe($('episode-list'),{childList:true});
mo.observe($('categories'),{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
mo.observe($('heading'),{childList:true,characterData:true,subtree:true});
mo.observe($('providers'),{childList:true,attributes:true,subtree:true});
mo.observe($('browser'),{attributes:true,attributeFilter:['hidden']});
document.querySelector('nav').addEventListener('click',function(){setTimeout(updateCrumb,0);});
/* stopping the inline player returns focus to the selected episode */
var wasHidden=player.hidden;
new MutationObserver(function(){
 if(player.hidden&&!wasHidden)list.hidden=true;
 if(player.hidden&&!wasHidden&&isRed()&&!detail.hidden){
  setTimeout(function(){var ae=document.activeElement;if(ae===document.body||!ae.offsetParent||ae.id==='series-back'){var r=$('episode-list').querySelector('.episode-row.playing')||$('episode-list').querySelector('.episode-row');if(r)r.focus();}},0);}
 wasHidden=player.hidden;
}).observe(player,{attributes:true,attributeFilter:['hidden']});
/* keys (capture phase, red only): flyout, fullscreen exit, episodes to player, bar rows */
function code(e){return ({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter'})[e.keyCode]||e.key;}
function isBack(e){return e.keyCode===461||e.key==='Escape'||e.key==='BrowserBack';}
function visible(b){return !b.disabled&&!b.hidden&&b.offsetParent!==null;}
function rows(){
 var all=Array.prototype.slice.call(ui.querySelectorAll('button')).filter(visible);
 var top=all.filter(function(b){return b.id==='seek-back'||b.id==='pause'||b.id==='seek-forward';});
 var bot=all.filter(function(b){return top.indexOf(b)<0;});
 return [top,bot];
}
// Deterministic VOD focus map shared by every palette. No spatial guessing.
function vodRows(){
 var first=[$('seek-back'),$('pause'),$('progress'),$('seek-forward')].filter(visible);
 var order=['stop','red-sub','red-audio','red-aspect','red-fs','quick-toggle','retry'];
 var second=order.map($).filter(visible);
 Array.prototype.slice.call(ui.querySelectorAll('button')).filter(visible).forEach(function(b){if(first.indexOf(b)<0&&second.indexOf(b)<0)second.push(b);});
 return [first,second];
}
window.addEventListener('keydown',function(e){
 if(window.APOrganizationActive)return;
 if(!detail.hidden&&body.classList.contains('episode-inline'))return;
 if(isBack(e)&&list.hidden&&player.dataset.playbackKind==='episode'&&body.classList.contains('episode-fullscreen'))return;
 if(player.hidden||player.dataset.playbackKind==='live'||!list.hidden||!$('quick-channels').hidden||ui.classList.contains('dim'))return;
 var k=code(e),a=document.activeElement;
 if(!ui.contains(a))return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].indexOf(k)<0)return;
 e.preventDefault();e.stopImmediatePropagation();
 document.dispatchEvent(new Event('ap-vod-controls'));
 if(k==='Enter'){if(!e.repeat&&a.tagName==='BUTTON')a.click();else if(a===$('progress')&&!e.repeat)$('pause').click();return;}
 if(a===$('progress')&&(k==='ArrowLeft'||k==='ArrowRight')){
  if(isFinite(video.duration)&&video.duration>0&&isFinite(video.currentTime))video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+(k==='ArrowRight'?10:-10)));return;
 }
 var r=vodRows(),ri=r[0].indexOf(a)>=0?0:1,ix=r[ri].indexOf(a),target;
 if(k==='ArrowLeft'||k==='ArrowRight')target=r[ri][Math.max(0,Math.min(r[ri].length-1,ix+(k==='ArrowRight'?1:-1)))];
 else{var nr=k==='ArrowDown'?1:0;target=r[nr][Math.max(0,Math.min(r[nr].length-1,ix))];}
 if(target)target.focus({preventScroll:true});
},true);
window.addEventListener('keydown',function(e){
 if(window.APOrganizationActive)return;
 if(!detail.hidden&&body.classList.contains('episode-inline'))return;
 if(isBack(e)&&list.hidden&&player.dataset.playbackKind==='episode'&&body.classList.contains('episode-fullscreen'))return;
 // Live OK belongs to the app's channel overlay, never the focused Stop button.
 // Let its bubbling handler open/select the virtualized channel list in every theme.
 if(!player.hidden&&$('seek-back').hidden&&code(e)==='Enter')return;
 if(!player.hidden&&list.hidden&&document.activeElement===$('progress')){
  var seekKey=code(e);
  if(seekKey==='ArrowDown'||seekKey==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();$('pause').focus();return;}
  if(seekKey==='ArrowLeft'||seekKey==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();if(isFinite(video.duration)&&video.duration>0&&isFinite(video.currentTime))video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+(seekKey==='ArrowRight'?10:-10)));return;}
  if(seekKey==='Enter'){e.preventDefault();e.stopImmediatePropagation();$('pause').click();return;}
 }
 if(!player.hidden&&!isRed()){
  var sharedKey=code(e),sharedActive=document.activeElement;
  if(!list.hidden){
   e.preventDefault();e.stopImmediatePropagation();
   if(isBack(e)){closeList();return;}
   var choices=Array.prototype.slice.call(list.querySelectorAll('button')).filter(visible),at=choices.indexOf(sharedActive);
   if(sharedKey==='ArrowDown'||sharedKey==='ArrowUp'){var next=choices[at+(sharedKey==='ArrowDown'?1:-1)];if(next)next.focus();}
   else if(sharedKey==='Enter'&&!e.repeat&&sharedActive&&list.contains(sharedActive))sharedActive.click();
   return;
  }
  if(ui.contains(sharedActive)&&!ui.classList.contains('dim')){
   if(sharedKey==='Enter'&&sharedActive.tagName==='BUTTON'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)sharedActive.click();return;}
   if(sharedKey==='ArrowDown'||sharedKey==='ArrowUp'){
    e.preventDefault();e.stopImmediatePropagation();
    if(sharedKey==='ArrowDown')bSub.focus();else if(sharedActive===$('pause'))$('progress').focus();else $('pause').focus();
    return;
   }
   if((sharedKey==='ArrowLeft'||sharedKey==='ArrowRight')&&sharedActive===bSub){
    e.preventDefault();e.stopImmediatePropagation();$('pause').focus();return;
   }
  }
 }
 if(!isRed()||player.hidden&&detail.hidden)return;
 var k=code(e),a=document.activeElement;
 if(isBack(e)){
  if(!list.hidden){e.preventDefault();e.stopImmediatePropagation();closeList();return;}
  if(fs&&!player.hidden){e.preventDefault();e.stopImmediatePropagation();fs=false;sync();paintPills();return;}
  return;
 }
 if(!list.hidden&&player.contains(a)){
  var bs=Array.prototype.slice.call(list.querySelectorAll('button')).filter(visible);var i=bs.indexOf(a);
  if(k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();e.stopImmediatePropagation();var n=bs[i+(k==='ArrowDown'?1:-1)];if(n)n.focus();return;}
  if(k==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&a.click)a.click();return;}
  if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();return;}
 }
 if(!player.hidden&&!detail.hidden&&!player.contains(a)&&a.classList&&a.classList.contains('episode-row')&&k==='ArrowRight'&&!fs){
  e.preventDefault();e.stopImmediatePropagation();var p=$('pause');if(p&&visible(p))p.focus();return;
 }
 if(!player.hidden&&ui.contains(a)&&!ui.classList.contains('dim')){
  if(k==='Enter'&&a.tagName==='BUTTON'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)a.click();return;}
  if((k==='ArrowUp'||k==='ArrowDown')&&!$('seek-back').hidden){
   var r=rows(),ri=r[0].indexOf(a)>=0?0:1,to=r[k==='ArrowDown'?1:0];
   if(k==='ArrowUp'&&ri===0){e.preventDefault();e.stopImmediatePropagation();$('progress').focus();return;}
   if(ri===(k==='ArrowDown'?0:1)&&to.length){e.preventDefault();e.stopImmediatePropagation();to[Math.min(to.length-1,r[ri].indexOf(a))].focus();return;}
   e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(k==='ArrowLeft'&&a.id==='seek-back'&&body.classList.contains('red-inline')){
   e.preventDefault();e.stopImmediatePropagation();var er=$('episode-list').querySelector('.episode-row.playing')||$('episode-list').querySelector('.episode-row');if(er)er.focus();return;
  }
 }
},true);
all();
})();
