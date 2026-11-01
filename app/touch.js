(function(){
'use strict';
window.APTouch=!!(window.APForceTouch||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
if(!window.APTouch)return;
document.body.classList.add('touch');
var back=document.createElement('button');back.id='touch-back';back.textContent='‹';back.setAttribute('aria-label','Back');back.onclick=function(){if(!document.getElementById('player').hidden){document.getElementById('stop').click();return;}if(window.apTouchBack)window.apTouchBack();};document.body.appendChild(back);
function railSelect(i){var r=document.getElementById('phone-home-rail');if(r)r.querySelectorAll('button').forEach(function(x){x.classList.toggle('selected',Number(x.dataset.railIndex)===i);});}
function updateBack(){if(!document.getElementById('home').hidden)railSelect(0);document.body.classList.toggle('phone-home',!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden);back.hidden=!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden;}
new MutationObserver(updateBack).observe(document.getElementById('screen'),{subtree:true,attributes:true,attributeFilter:['hidden']});updateBack();
var rail=document.createElement('aside');rail.id='phone-home-rail';var logo=document.querySelector('.brand').cloneNode(true);logo.removeAttribute('id');var version=logo.querySelector('#app-display-version');if(version){version.removeAttribute('id');}rail.appendChild(logo);
var targets=['#nav-home','nav [data-kind="live"]','nav [data-kind="movies"]','nav [data-kind="series"]','#nav-favorites','#nav-search','#settings-open'];
targets.forEach(function(selector,index){var original=document.querySelector(selector);if(!original&&index===4)original=document.querySelector('nav button:nth-last-child(2)');if(!original)return;var b=document.createElement('button');b.className=index===0?'selected':'';var icon=original.querySelector('.nav-icon');if(icon)b.appendChild(icon.cloneNode(true));var label=document.createElement('span');label.textContent=['الرئيسية','البث المباشر','الأفلام','المسلسلات','المفضلة','البحث','الإعدادات'][index];b.appendChild(label);b.dataset.railIndex=index;b.onclick=function(){original.click();if(index<6)railSelect(index);};rail.appendChild(b);});document.body.appendChild(rail);

function playerMode(){var playing=!document.getElementById('player').hidden;document.body.classList.toggle('phone-live-playing',playing&&document.getElementById('player').dataset.playbackKind==='live');document.body.classList.toggle('phone-library',document.getElementById('home').hidden&&!playing&&document.getElementById('connection').hidden);document.body.classList.toggle('phone-playing',playing);document.body.classList.toggle('phone-detail',!document.getElementById('movie-detail').hidden||!document.getElementById('series-detail').hidden);if(playing)document.body.classList.remove('touch-nav-open');}
new MutationObserver(playerMode).observe(document.getElementById('player'),{attributes:true,attributeFilter:['hidden','data-playback-kind']});playerMode();new MutationObserver(playerMode).observe(document.getElementById("screen"),{subtree:true,attributes:true,attributeFilter:["hidden"]});
document.addEventListener('DOMContentLoaded',function(){
var controls=document.querySelector('#player-ui .actions');
['red-sub','red-audio','red-aspect','red-fs'].forEach(function(id){var b=document.getElementById(id);if(b)controls.appendChild(b);});
var icons={'stop':['‹','خروج'],'pause':['Ⅱ','تشغيل'],'seek-back':['↶','رجوع 30'],'seek-forward':['↷','تقديم 30'],'retry':['↻','إعادة'],'f21-speed':['1×','السرعة'],'red-sub':['CC','الترجمة'],'red-audio':['♫','الصوت'],'red-aspect':['□','المقاس'],'red-fs':['⛶','ملء الشاشة'],'quick-toggle':['▤','مشابه'],'phone-aspect':['▭','المقاس']};
Object.keys(icons).forEach(function(id){var b=document.getElementById(id);if(!b)return;b.dataset.phoneIcon=icons[id][0];b.dataset.phoneLabel=icons[id][1];});
var playerBack=document.createElement('button');playerBack.id='phone-player-back';playerBack.type='button';playerBack.textContent='‹';playerBack.setAttribute('aria-label','رجوع');playerBack.onclick=function(){document.getElementById('stop').click();};document.getElementById('player').appendChild(playerBack);
function syncPlayerBack(){var player=document.getElementById('player'),live=document.getElementById('live-now'),ui=document.getElementById('player-ui');var hide=player.hidden||(player.dataset.playbackKind==='live'?(!live||live.hidden):ui.classList.contains('dim'));if(playerBack.hidden!==hide)playerBack.hidden=hide;}
new MutationObserver(syncPlayerBack).observe(document.getElementById('player'),{subtree:true,attributes:true,attributeFilter:['hidden','class']});syncPlayerBack();
var more=document.createElement('button');more.id='phone-more';more.type='button';more.dataset.phoneIcon='•••';more.dataset.phoneLabel='المزيد';more.setAttribute('aria-label','المزيد');controls.appendChild(more);
var av=document.createElement('button');av.id='phone-av';av.dataset.phoneIcon='▧';av.dataset.phoneLabel='الصوت والترجمة';av.innerHTML='<span class="phone-control-icon">▧</span><span class="phone-control-label">الصوت والترجمة</span>';controls.appendChild(av);av.querySelector('.phone-control-icon').innerHTML='<svg width="25" height="25" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h20M4 14h20M4 21h20"/><circle cx="10" cy="7" r="3" fill="#15151a"/><circle cx="19" cy="14" r="3" fill="#15151a"/><circle cx="11" cy="21" r="3" fill="#15151a"/></svg>';
var aspectBtn=document.createElement('button');aspectBtn.id='phone-aspect';aspectBtn.type='button';aspectBtn.dataset.phoneIcon='▭';aspectBtn.dataset.phoneLabel='المقاس';aspectBtn.setAttribute('aria-label','مقاس الشاشة');controls.insertBefore(aspectBtn,av.nextSibling);aspectBtn.onclick=function(){if(window.APScreen)window.APScreen.cycle();document.dispatchEvent(new Event('ap-vod-controls'));};
var top=document.createElement('div');top.id='phone-cinema-top';top.innerHTML='<div class="cinema-specs"><span>5.1</span><span>HDR</span><span>4K</span></div><div class="cinema-brand"></div><div class="cinema-status"><i></i>قيد التشغيل</div>';document.getElementById('player-ui').appendChild(top);
var info=document.createElement('div');info.id='phone-cinema-info';info.innerHTML='<div class="cinema-kicker"></div><h1></h1><div class="cinema-meta"></div><p></p>';document.getElementById('player-ui').appendChild(info);
var clock=document.createElement('div');clock.id='phone-cinema-clock';clock.innerHTML='<span>00:00</span><span>−00:00</span>';document.getElementById('player-ui').appendChild(clock);
function fmtClock(t){t=Math.max(0,Math.floor(t||0));return (t>=3600?Math.floor(t/3600)+':':'')+String(Math.floor(t/60)%60).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
document.getElementById('video').addEventListener('timeupdate',function(){var v=this;clock.firstChild.textContent=fmtClock(v.currentTime);clock.lastChild.textContent='−'+fmtClock(v.duration-v.currentTime);var pct=v.duration>0?v.currentTime/v.duration*100:0;var buffered=v.buffered.length&&v.duration>0?v.buffered.end(v.buffered.length-1)/v.duration*100:pct;document.getElementById('progress').style.setProperty('--cinema-played',pct+'%');document.getElementById('progress').style.setProperty('--cinema-buffer',buffered+'%');});
function cinemaDuration(){var v=document.getElementById('video'),el=info.querySelector('.cinema-duration');if(el){var d=Number(v.duration);el.textContent=isFinite(d)&&d>0?'• '+Math.floor(d/60)+' د':'';}}
['loadedmetadata','durationchange','timeupdate'].forEach(function(event){document.getElementById('video').addEventListener(event,cinemaDuration);});
function cinemaInfo(){var episode=document.getElementById('player').dataset.playbackKind==='episode';var name=document.getElementById('playing-name').textContent;info.querySelector('h1').textContent=name;info.querySelector('.cinema-kicker').textContent=episode?'مسلسل':'فيلم';var metadata=document.getElementById(episode?'series-meta':'movie-meta').textContent;var rating=metadata.match(/(?:★\s*([0-9.]+)|([0-9.]+)\s*★)/);var meta=info.querySelector('.cinema-meta');meta.replaceChildren();if(rating){var chip=document.createElement('span');chip.className='cinema-rating';chip.textContent=rating[1]||rating[2];meta.appendChild(chip);}var rest=document.createElement('span');rest.textContent=metadata.replace(/★\s*[0-9.]+|[0-9.]+\s*★/,'').replace(/HD\s*[•·]?/,'').replace(/([•·])\s*[•·]/g,'•');meta.appendChild(rest);var duration=document.createElement('span');duration.className='cinema-duration';meta.appendChild(duration);cinemaDuration();info.querySelector('p').textContent=document.getElementById(episode?'series-description':'movie-description').textContent;top.querySelector('.cinema-brand').textContent=({harak:'NOIR · OR',alaa:'NOIR · OR',red:'ROUGE VELOURS'})[document.body.dataset.theme]||'ALAA PLAYER';}
new MutationObserver(cinemaInfo).observe(document.getElementById('playing-name'),{childList:true,subtree:true});cinemaInfo();
var sheet=document.createElement('div');sheet.id='phone-more-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','خيارات المشغّل');
var close=document.createElement('button');close.textContent='إغلاق';close.onclick=function(){sheet.hidden=true;document.dispatchEvent(new Event('ap-vod-controls'));};sheet.appendChild(close);
['f21-speed','red-sub','red-audio','red-aspect','retry','red-fs'].forEach(function(id){var b=document.getElementById(id);if(b)sheet.appendChild(b);});
document.getElementById('player').appendChild(sheet);
av.onclick=function(){sheet.hidden=true;if(window.APTracks)window.APTracks.toggle();document.dispatchEvent(new Event('ap-vod-controls'));};
more.onclick=function(){if(window.APTracks)window.APTracks.close();sheet.hidden=!sheet.hidden;document.dispatchEvent(new Event('ap-vod-controls'));};
window.APLabelControls=function(){labelControls();};function labelControls(){Object.keys(icons).concat(['phone-more']).forEach(function(id){var b=document.getElementById(id);if(!b)return;var icon=b.querySelector('.phone-control-icon'),label=b.querySelector('.phone-control-label');if(!icon||!label){b.replaceChildren();icon=document.createElement('span');icon.className='phone-control-icon';label=document.createElement('span');label.className='phone-control-label';b.appendChild(icon);b.appendChild(label);}var glyph=id==='quick-toggle'?'⊞':id==='pause'?(document.getElementById('video').paused?'▶':'Ⅱ'):b.dataset.phoneIcon;var art=null;
if(id==='quick-toggle')art='<svg viewBox="0 0 28 28" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="8" height="8" rx="1.5"/><rect x="16" y="4" width="8" height="8" rx="1.5"/><rect x="4" y="16" width="8" height="8" rx="1.5"/><rect x="16" y="16" width="8" height="8" rx="1.5"/></svg>';
// Separate paths: a CSS flip on the <svg> was overridden by the bar's transform reset, so both read counter-clockwise.
if(id==='seek-back')art='<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8a11 11 0 1 1-3 10M8 3v6H2"/><text x="16" y="21" text-anchor="middle" fill="currentColor" stroke="none" font-family="Arial" font-size="11" font-weight="600">30</text></svg>';
if(id==='seek-forward')art='<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8a11 11 0 1 0 3 10M24 3v6h6"/><text x="16" y="21" text-anchor="middle" fill="currentColor" stroke="none" font-family="Arial" font-size="11" font-weight="600">30</text></svg>';
if(id==='phone-aspect')art='<svg viewBox="0 0 28 28" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="21" height="15" rx="2"/><path d="M8 10.5H6.5v3M20 10.5h1.5v3M8 17.5H6.5v-3M20 17.5h1.5v-3"/></svg>';
if(art){if(icon.dataset.art!==id){icon.innerHTML=art;icon.dataset.art=id;}}else if(icon.textContent!==glyph)icon.textContent=glyph;var caption=id==='pause'?(document.getElementById('video').paused?'تشغيل':'إيقاف مؤقت'):id==='phone-aspect'&&window.APScreen?window.APScreen.label():b.dataset.phoneLabel;if(label.textContent!==caption)label.textContent=caption;});}

function paintDetailButtons(){
[['movie-play','▶','تشغيل'],['movie-resume','↶','متابعة'],['movie-favorite','♡','المفضلة'],['series-continue','▶','متابعة'],['series-start','▶','تشغيل'],['series-favorite','♡','المفضلة'],['series-later','◷','لاحقاً'],['series-info','ⓘ','المزيد']].forEach(function(row){var b=document.getElementById(row[0]);if(!b)return;if(b.children.length===2&&b.firstChild.className==='detail-icon'&&b.lastChild.textContent===row[2])return;var icon=document.createElement('span');icon.className='detail-icon';icon.textContent=row[1];var label=document.createElement('small');label.textContent=row[2];b.replaceChildren(icon,label);});
}
paintDetailButtons();
new MutationObserver(paintDetailButtons).observe(document.getElementById('series-copy'),{subtree:true,childList:true});
new MutationObserver(paintDetailButtons).observe(document.querySelector('.movie-copy'),{subtree:true,childList:true});

labelControls();

new MutationObserver(labelControls).observe(document.getElementById('red-sub'),{childList:true});
document.getElementById('video').addEventListener('play',labelControls);document.getElementById('video').addEventListener('pause',labelControls);
var playerObserver=new MutationObserver(function(){if(document.getElementById('player').hidden)sheet.hidden=true;});playerObserver.observe(document.getElementById('player'),{attributes:true,attributeFilter:['hidden']});

});
var menu=document.createElement('button');menu.id='touch-menu';menu.textContent='☰';menu.setAttribute('aria-label','Navigation');menu.onclick=function(){document.body.classList.toggle('touch-nav-open');};document.body.appendChild(menu);
document.querySelector('nav').addEventListener('click',function(e){if(e.target.closest('button'))document.body.classList.remove('touch-nav-open');});
document.addEventListener('click',function(e){var b=e.target.closest('button');if(b){try{b.focus({preventScroll:true});}catch(_){b.focus();}}},true);
// Native scrolling must not be intercepted or converted into a second activation.
document.addEventListener('touchstart',function(e){var el=e.target.closest('button');if(el&&el.parentElement&&['items','episode-list','categories'].indexOf(el.parentElement.id)>=0&&document.activeElement)document.activeElement.blur();},{passive:true});
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
/* 2.8 touch player tools: screen size, audio/subtitles, AirPlay, Chromecast, long-press reorder.
   Shared by every theme and every player (live, movies, episodes). */
document.addEventListener('DOMContentLoaded',function(){
var player=document.getElementById('player'),video=document.getElementById('video'),ui=document.getElementById('player-ui');
if(!player||!video||!ui)return;
video.setAttribute('x-webkit-airplay','allow');
var NP=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.nativePlayer;
function nativeCall(command,extra){if(!NP)return Promise.reject(new Error('no bridge'));try{return Promise.resolve(NP.postMessage(Object.assign({command:command,id:0},extra||{})));}catch(e){return Promise.reject(e);}}
function nativeVOD(){return !!(window.APNativePlayback&&window.APNativePlayback.active);}
function isLive(){return player.dataset.playbackKind==='live';}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function el(tag,id,cls,text){var e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
var SVG={
 aspect:'<svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="21" height="15" rx="2"/><path d="M8 10.5H6.5v3M20 10.5h1.5v3M8 17.5H6.5v-3M20 17.5h1.5v-3"/></svg>',
 av:'<svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="6" width="21" height="16" rx="2.5"/><path d="M7.5 14h4M14 14h6.5M7.5 18h8M18 18h2.5"/></svg>',
 airplay:'<svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/><path d="M14 16l6 8H8z" fill="currentColor" stroke="none"/></svg>',
 cast:'<svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V7a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/><path d="M3 13a10 10 0 0 1 10 10M3 17.5a5.5 5.5 0 0 1 5.5 5.5"/><circle cx="3.6" cy="22.4" r="1.1" fill="currentColor" stroke="none"/></svg>'
};

/* toast */
var toast=el('div','ap-toast');toast.hidden=true;toast.setAttribute('role','status');player.appendChild(toast);var toastTimer=0;
function say(text,ms){toast.textContent=text;toast.hidden=false;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.hidden=true;},ms||1800);}
window.APToast=say;

/* ---------- screen size ---------- */
var MODES=[['fit','ملائم'],['fill','ملء الشاشة'],['stretch','تمدد'],['16:9','16:9'],['4:3','4:3']];
var mode=store('ap-aspect')||'fit';if(!MODES.some(function(m){return m[0]===mode;}))mode='fit';
function modeLabel(){var m=MODES.find(function(x){return x[0]===mode;});return m?m[1]:'ملائم';}
var CSSKEYS=['object-fit','position','width','height','left','top','right','bottom','inset','max-width','max-height','transform'];
function clearWebAspect(){CSSKEYS.forEach(function(k){video.style.removeProperty(k);});}
function webAspect(){
 clearWebAspect();if(mode==='fit'){video.style.setProperty('object-fit','contain','important');return;}
 if(mode==='fill'){video.style.setProperty('object-fit','cover','important');return;}
 if(mode==='stretch'){video.style.setProperty('object-fit','fill','important');return;}
 var r=mode.split(':'),ratio=Number(r[0])/Number(r[1]),W=player.clientWidth||innerWidth,H=player.clientHeight||innerHeight,w=W,h=W/ratio;if(h>H){h=H;w=H*ratio;}
 [['object-fit','fill'],['position','absolute'],['inset','auto'],['right','auto'],['bottom','auto'],['transform','none'],['max-width','none'],['max-height','none'],['width',w+'px'],['height',h+'px'],['left',((W-w)/2)+'px'],['top',((H-h)/2)+'px']].forEach(function(x){video.style.setProperty(x[0],x[1],'important');});
}
function applyAspect(announce){
 if(nativeVOD()){clearWebAspect();nativeCall('aspect',{value:mode}).then(function(){if(announce)say('مقاس الشاشة: '+modeLabel());},function(){if(announce)say('تغيير المقاس للأفلام يحتاج تحديث التطبيق');});}
 else{webAspect();if(announce)say('مقاس الشاشة: '+modeLabel());}
 paintAspectLabels();
}
function paintAspectLabels(){var b=document.getElementById('live-aspect');if(b){var l=b.querySelector('.aya-live-label');if(l)l.textContent=modeLabel();b.setAttribute('aria-label','مقاس الشاشة: '+modeLabel());}if(window.APLabelControls)window.APLabelControls();}
window.APScreen={cycle:function(){var i=MODES.findIndex(function(m){return m[0]===mode;});mode=MODES[(i+1)%MODES.length][0];store('ap-aspect',mode);applyAspect(true);},label:modeLabel,apply:function(){applyAspect(false);}};
['loadedmetadata','playing'].forEach(function(n){video.addEventListener(n,function(){if(!player.hidden)applyAspect(false);});});
addEventListener('resize',function(){if(!player.hidden&&!nativeVOD()&&/:/.test(mode))webAspect();});
new MutationObserver(function(){if(player.hidden)clearWebAspect();else applyAspect(false);}).observe(player,{attributes:true,attributeFilter:['hidden']});

/* ---------- audio & subtitles ---------- */
var panel=el('div','ap-av-panel');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','الصوت والترجمة');
var head=el('div',null,'ap-av-head');head.appendChild(el('h3',null,null,'الصوت والترجمة'));var x=el('button','ap-av-close',null,'✕');x.type='button';x.setAttribute('aria-label','إغلاق');head.appendChild(x);panel.appendChild(head);
var cols=el('div',null,'ap-av-cols'),audioCol=el('section',null,'ap-av-col'),textCol=el('section',null,'ap-av-col');cols.appendChild(audioCol);cols.appendChild(textCol);panel.appendChild(cols);player.appendChild(panel);
var tracksGen=0;
function trackName(t,n,kind){var lang=String(t.language||'').toLowerCase(),name=String(t.name||t.label||'').trim();
 var known={ar:'العربية',ara:'العربية',en:'English',eng:'English',fr:'Français',fre:'Français',fra:'Français',de:'Deutsch',ger:'Deutsch',deu:'Deutsch',tr:'Türkçe',tur:'Türkçe',es:'Español',spa:'Español'};
 if(name&&!/^track\s*\d+$/i.test(name))return name;return known[lang]||(lang?lang.toUpperCase():(kind==='audio'?'الصوت ':'ترجمة ')+(n+1));}
function column(col,title,list,kind,offOption){
 col.replaceChildren();col.appendChild(el('h4',null,null,title));var box=el('div',null,'ap-av-list');col.appendChild(box);
 var anySelected=list.some(function(t){return t.selected;});
 if(offOption){var off=el('button',null,'ap-av-item'+(anySelected?'':' selected'),'إيقاف');off.type='button';off.onclick=function(){pick(kind,-1);};box.appendChild(off);}
 list.forEach(function(t,n){var b=el('button',null,'ap-av-item'+(t.selected?' selected':''),trackName(t,n,kind));b.type='button';b.onclick=function(){pick(kind,t.index);};box.appendChild(b);});
 if(!list.length)box.appendChild(el('p',null,'ap-av-empty',kind==='audio'?'لا توجد مسارات صوت إضافية':'لا توجد ترجمات في هذا الملف'));
}
function webTracks(){var a=video.audioTracks||[],s=video.textTracks||[],audio=[],text=[];
 for(var i=0;i<a.length;i++)audio.push({index:i,name:a[i].label,language:a[i].language,selected:!!a[i].enabled});
 for(var j=0;j<s.length;j++)if(s[j].kind!=='metadata')text.push({index:j,name:s[j].label,language:s[j].language,selected:s[j].mode==='showing'});
 return {audio:audio,text:text};}
function load(){var g=++tracksGen;
 if(nativeVOD()){column(audioCol,'الصوت',[],'audio',false);audioCol.querySelector('.ap-av-empty').textContent='جارٍ قراءة المسارات…';textCol.replaceChildren();
  nativeCall('tracks').then(function(r){if(g!==tracksGen)return;r=r||{};column(audioCol,'الصوت',r.audio||[],'audio',false);column(textCol,'الترجمة',r.text||[],'text',true);},function(){if(g!==tracksGen)return;column(audioCol,'الصوت',[],'audio',false);column(textCol,'الترجمة',[],'text',true);audioCol.querySelector('.ap-av-empty').textContent='اختيار المسارات يحتاج تحديث التطبيق (2.8)';});
 }else{var w=webTracks();column(audioCol,'الصوت',w.audio,'audio',false);column(textCol,'الترجمة',w.text,'text',true);}
}
function pick(kind,index){
 if(nativeVOD()){nativeCall(kind==='audio'?'audioTrack':'textTrack',{value:index}).then(function(){say(kind==='audio'?'تم تغيير الصوت':index<0?'تم إيقاف الترجمة':'تم تفعيل الترجمة');setTimeout(function(){if(!panel.hidden)load();},450);},function(){say('تعذّر تغيير المسار');});return;}
 try{if(kind==='audio'){var a=video.audioTracks||[];for(var i=0;i<a.length;i++)a[i].enabled=i===index;}else{var s=video.textTracks||[];for(var j=0;j<s.length;j++)if(s[j].kind!=='metadata')s[j].mode=j===index?'showing':'disabled';}}catch(e){say('تعذّر تغيير المسار');return;}
 load();
}
function openPanel(){var sheet=document.getElementById('phone-more-sheet');if(sheet)sheet.hidden=true;panel.hidden=false;load();}
function closePanel(){if(panel.hidden)return;panel.hidden=true;tracksGen++;}
x.onclick=function(e){e.stopPropagation();closePanel();};
window.APTracks={toggle:function(){if(panel.hidden)openPanel();else closePanel();},open:openPanel,close:closePanel};
// Tap outside closes the panel without swallowing the tap: the button underneath still works.
document.addEventListener('pointerdown',function(e){if(panel.hidden)return;if(panel.contains(e.target)||e.target.closest('#phone-av,#live-av'))return;closePanel();},true);
new MutationObserver(function(){if(player.hidden)closePanel();}).observe(player,{attributes:true,attributeFilter:['hidden']});

/* ---------- AirPlay & Chromecast ---------- */
var cluster=el('div','ap-cast-cluster');
var airBtn=el('button','ap-airplay','ap-round');airBtn.type='button';airBtn.innerHTML=SVG.airplay;airBtn.setAttribute('aria-label','AirPlay');
var castBtn=el('button','ap-cast','ap-round');castBtn.type='button';castBtn.innerHTML=SVG.cast;castBtn.setAttribute('aria-label','Chromecast');
cluster.appendChild(airBtn);cluster.appendChild(castBtn);player.appendChild(cluster);
var airHint=false,casting={active:false,name:'',live:false};
airBtn.onclick=function(e){e.stopPropagation();
 if(!nativeVOD()&&typeof video.webkitShowPlaybackTargetPicker==='function'){try{video.webkitShowPlaybackTargetPicker();return;}catch(err){}}
 nativeCall('airplay').then(function(){if(nativeVOD()&&!airHint){airHint=true;say('AirPlay يرسل الصوت. للصورة على التلفاز: مركز التحكم ← انعكاس الشاشة',4200);}},function(){say('افتح مركز التحكم ← انعكاس الشاشة لعرض التطبيق على Apple TV',4200);});
};
var castSheet=el('div','ap-cast-sheet');castSheet.hidden=true;castSheet.setAttribute('role','dialog');player.appendChild(castSheet);
function castFallback(){castSheet.replaceChildren();castSheet.appendChild(el('h3',null,null,'Chromecast'));
 castSheet.appendChild(el('p',null,null,'البث إلى Chromecast متاح في نسخة التطبيق 2.8 المبنية من Xcode. هذه النسخة لا تحتوي عليه بعد. يمكنك استخدام AirPlay، أو نسخ رابط البث وفتحه في تطبيق على التلفاز.'));
 var copy=el('button',null,'ap-av-item','نسخ رابط البث');copy.type='button';copy.onclick=function(){var u=nativeVOD()?window.APNativePlayback.url:(video.currentSrc||video.src||'');if(!u){say('لا يوجد رابط');return;}copyText(u);castSheet.hidden=true;};castSheet.appendChild(copy);
 var c=el('button',null,'ap-av-item','إغلاق');c.type='button';c.onclick=function(){castSheet.hidden=true;};castSheet.appendChild(c);castSheet.hidden=false;}
function copyText(u){function legacy(){var t=document.createElement('textarea');t.value=u;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}t.remove();say(ok?'تم نسخ الرابط':'تعذّر النسخ');}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(function(){say('تم نسخ الرابط');},legacy);else legacy();}
castBtn.onclick=function(e){e.stopPropagation();
 var live=isLive(),url=live?(video.currentSrc||video.src||''):'';
 nativeCall('cast',{url:url,live:live,time:nativeVOD()?Number(video.currentTime)||0:0}).then(function(){if(!casting.active)say('جارٍ البحث عن أجهزة Chromecast…',2600);},castFallback);
};
document.addEventListener('pointerdown',function(e){if(!castSheet.hidden&&!castSheet.contains(e.target)&&e.target!==castBtn&&!castBtn.contains(e.target))castSheet.hidden=true;},true);
window.APNativeCastState=function(s){var was=casting.active;casting=s||{active:false};castBtn.classList.toggle('casting',!!casting.active);
 if(casting.active){say('يُعرض الآن على '+(casting.name||'Chromecast'),2600);if(casting.live&&isLive()&&!video.paused)video.pause();}
 else if(was){say('تم إيقاف البث على التلفاز');if(isLive()&&!player.hidden&&video.paused)video.play().catch(function(){});}};
new MutationObserver(function(){if(player.hidden){castSheet.hidden=true;if(casting.active&&casting.live)nativeCall('castStop').catch(function(){});}}).observe(player,{attributes:true,attributeFilter:['hidden']});
function syncCluster(){var live=document.getElementById('live-now');var hide=player.hidden||(isLive()?(!live||live.hidden):ui.classList.contains('dim'));if(cluster.hidden!==hide)cluster.hidden=hide;cluster.classList.toggle('live',isLive());}
new MutationObserver(syncCluster).observe(player,{subtree:true,attributes:true,attributeFilter:['hidden','class']});syncCluster();

/* ---------- live bar: screen size + audio/subtitles in every theme ---------- */
function liveButton(id,label,svg,fn,labelled){var b=el('button',id);b.type='button';b.innerHTML=svg;b.setAttribute('aria-label',label);b.title=label;if(labelled){var t=el('span',null,'aya-live-label',label);b.appendChild(t);}b.onclick=function(e){e.stopPropagation();fn();};return b;}
function ensureLive(){var bar=document.getElementById('live-now');if(!bar)return;var row=bar.querySelector('.live-transport');if(!row||document.getElementById('live-aspect'))return;
 var labelled=!!row.querySelector('.aya-live-label');
 row.appendChild(liveButton('live-av','صوت وترجمة',SVG.av,function(){window.APTracks.toggle();},labelled));
 row.appendChild(liveButton('live-aspect',modeLabel(),SVG.aspect,function(){window.APScreen.cycle();},labelled));
}
new MutationObserver(ensureLive).observe(player,{childList:true,subtree:true});ensureLive();

/* ---------- long-press reorder (categories + channels, every section) ---------- */
var press=null,suppressUntil=0;
function haptic(){nativeCall('haptic').catch(function(){});}
function cancelPress(){if(press){clearTimeout(press.timer);press=null;}}
document.addEventListener('touchstart',function(e){
 if(e.touches.length!==1||!player.hidden||!reorder.hidden){cancelPress();return;}
 var b=e.target.closest&&e.target.closest('#categories [data-organize-group],#items [data-organize-channel]');if(!b){cancelPress();return;}
 var t=e.touches[0],box=b.closest('#categories,#items');cancelPress();press={el:b,box:box,top:box.scrollTop,key:b.dataset.organizeGroup!=null?['organizeGroup',b.dataset.organizeGroup]:['organizeChannel',b.dataset.organizeChannel],x:t.clientX,y:t.clientY,timer:setTimeout(function(){var p=press;press=null;if(!p||!window.APReorder)return;var node=p.el;
 // A data refresh may re-render the list mid-press; follow the same item.
 if(!node.isConnected)node=Array.prototype.find.call(p.box.querySelectorAll('button'),function(x){return x.dataset[p.key[0]]===p.key[1];});if(!node)return;var target=window.APReorder.target(node);if(!target)return;suppressUntil=Date.now()+900;haptic();openReorder(target);},500)};
},{passive:true});
document.addEventListener('touchmove',function(e){if(!press)return;var t=e.touches[0];if(Math.abs(t.clientX-press.x)>8||Math.abs(t.clientY-press.y)>8)cancelPress();},{passive:true});
['touchend','touchcancel'].forEach(function(n){document.addEventListener(n,cancelPress,{passive:true});});
document.addEventListener('scroll',function(){if(press&&Math.abs(press.box.scrollTop-press.top)>6)cancelPress();},{capture:true,passive:true});
document.addEventListener('click',function(e){if(Date.now()<suppressUntil&&e.target.closest&&e.target.closest('#categories,#items')){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
document.addEventListener('contextmenu',function(e){if(e.target.closest&&e.target.closest('#categories,#items'))e.preventDefault();});

var ROW=52,reorder=el('div','ap-reorder');reorder.hidden=true;reorder.setAttribute('role','dialog');reorder.setAttribute('aria-modal','true');
var rSheet=el('div',null,'ap-reorder-sheet'),rHead=el('div',null,'ap-reorder-head'),rTitle=el('h3'),rHint=el('p',null,null,'اسحب ⠿ لتحريك العنصر للأعلى أو للأسفل');
var rTools=el('div',null,'ap-reorder-tools'),rDone=el('button','ap-reorder-done',null,'تم'),rReset=el('button','ap-reorder-reset',null,'إعادة الترتيب الافتراضي'),rCancel=el('button','ap-reorder-cancel',null,'إلغاء');
[rDone,rReset,rCancel].forEach(function(b){b.type='button';rTools.appendChild(b);});
var rTitleBox=el('div');rTitleBox.appendChild(rTitle);rTitleBox.appendChild(rHint);rHead.appendChild(rTitleBox);rHead.appendChild(rTools);
var rList=el('div',null,'ap-reorder-list'),rInner=el('div',null,'ap-reorder-inner');rList.appendChild(rInner);
rSheet.appendChild(rHead);rSheet.appendChild(rList);reorder.appendChild(rSheet);document.body.appendChild(reorder);
var R={target:null,order:[],rows:new Map(),nodes:new Map(),drag:null,frame:0};
function openReorder(t){R.target=t;var rows=window.APReorder.rows(t);R.order=rows.map(function(r){return r.id;});R.rows=new Map(rows.map(function(r){return [r.id,r];}));R.nodes.forEach(function(n){n.remove();});R.nodes=new Map();R.original=R.order.slice();
 rTitle.textContent='ترتيب · '+(t.title||'');rInner.style.height=(R.order.length*ROW)+'px';reorder.hidden=false;document.body.classList.add('ap-reordering');
 var at=R.order.indexOf(t.id);rList.scrollTop=Math.max(0,at*ROW-rList.clientHeight/2+ROW/2);paint();
 var n=R.nodes.get(t.id);if(n){n.classList.add('flash');setTimeout(function(){n.classList.remove('flash');},900);}}
function closeReorder(){reorder.hidden=true;document.body.classList.remove('ap-reordering');endDrag();R.target=null;}
function rowNode(id){var n=R.nodes.get(id);if(n)return n;var r=R.rows.get(id)||{label:id};n=el('div',null,'ap-reorder-row');n.dataset.id=id;var num=el('span',null,'ap-reorder-num');n.appendChild(num);
 if(r.logo){var img=document.createElement('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=r.logo;img.onerror=function(){img.remove();};n.appendChild(img);}
 n.appendChild(el('span',null,'ap-reorder-label',r.label));var h=el('span',null,'ap-reorder-handle','⠿');h.setAttribute('aria-hidden','true');n.appendChild(h);rInner.appendChild(n);R.nodes.set(id,n);return n;}
function paint(){var top=rList.scrollTop,h=rList.clientHeight||400,first=Math.max(0,Math.floor(top/ROW)-6),last=Math.min(R.order.length,Math.ceil((top+h)/ROW)+6),keep=new Set();
 for(var i=first;i<last;i++){var id=R.order[i];keep.add(id);var n=rowNode(id);n.firstChild.textContent=String(i+1);if(!R.drag||R.drag.id!==id)n.style.transform='translate3d(0,'+(i*ROW)+'px,0)';}
 if(R.drag)keep.add(R.drag.id);
 R.nodes.forEach(function(n,id){if(!keep.has(id)){n.remove();R.nodes.delete(id);}});}
rList.addEventListener('scroll',function(){if(!R.frame)R.frame=requestAnimationFrame(function(){R.frame=0;paint();if(R.drag)dragMove();});},{passive:true});
function startDrag(row,touch){var id=row.dataset.id;R.drag={id:id,node:row,y:touch.clientY,index:R.order.indexOf(id),identifier:touch.identifier};row.classList.add('dragging');haptic();dragMove();autoScroll();}
function dragMove(){var d=R.drag;if(!d)return;var rect=rList.getBoundingClientRect(),y=d.y-rect.top+rList.scrollTop-ROW/2,to=Math.max(0,Math.min(R.order.length-1,Math.round(y/ROW)));
 d.node.style.transform='translate3d(0,'+Math.max(0,Math.min((R.order.length-1)*ROW,y))+'px,0) scale(1.02)';
 if(to!==d.index){R.order.splice(d.index,1);R.order.splice(to,0,d.id);d.index=to;paint();}}
function autoScroll(){var d=R.drag;if(!d)return;var rect=rList.getBoundingClientRect(),edge=64,speed=0;if(d.y<rect.top+edge)speed=-Math.ceil((rect.top+edge-d.y)/4);else if(d.y>rect.bottom-edge)speed=Math.ceil((d.y-(rect.bottom-edge))/4);
 if(speed){var before=rList.scrollTop;rList.scrollTop=before+Math.max(-24,Math.min(24,speed));if(rList.scrollTop!==before){paint();dragMove();}}d.raf=requestAnimationFrame(autoScroll);}
function endDrag(){var d=R.drag;if(!d)return;cancelAnimationFrame(d.raf);R.drag=null;d.node.classList.remove('dragging');paint();}
var holdRow=null;
rList.addEventListener('touchstart',function(e){var row=e.target.closest('.ap-reorder-row');if(!row||e.touches.length!==1)return;var t=e.touches[0];
 if(e.target.closest('.ap-reorder-handle')){startDrag(row,t);return;}
 holdRow={row:row,x:t.clientX,y:t.clientY,timer:setTimeout(function(){if(holdRow){var h=holdRow;holdRow=null;startDrag(h.row,{clientY:h.y,identifier:t.identifier});}},300)};},{passive:true});
rList.addEventListener('touchmove',function(e){var t=e.touches[0];if(holdRow&&(Math.abs(t.clientY-holdRow.y)>8||Math.abs(t.clientX-holdRow.x)>8)){clearTimeout(holdRow.timer);holdRow=null;}
 if(!R.drag)return;e.preventDefault();R.drag.y=t.clientY;dragMove();},{passive:false});
['touchend','touchcancel'].forEach(function(n){rList.addEventListener(n,function(){if(holdRow){clearTimeout(holdRow.timer);holdRow=null;}endDrag();},{passive:true});});
rDone.onclick=function(){var t=R.target;if(t){var changed=R.order.some(function(id,i){return id!==R.original[i];});if(changed){window.APReorder.save(t,R.order.slice());say('تم حفظ الترتيب');}}closeReorder();};
rReset.onclick=function(){var t=R.target;if(t){window.APReorder.reset(t,R.original.slice());say('تمت إعادة الترتيب الافتراضي');}closeReorder();};
rCancel.onclick=closeReorder;
reorder.addEventListener('click',function(e){if(e.target===reorder)closeReorder();});
// The toast lives in the player; outside it, reuse the app toast element if present.
var baseSay=say;say=function(text,ms){if(player.hidden){var t=document.getElementById('f21-toast');if(t){t.textContent=text;t.hidden=false;clearTimeout(t._timer);t._timer=setTimeout(function(){t.hidden=true;},ms||2200);return;}}baseSay(text,ms);};
});
})();
