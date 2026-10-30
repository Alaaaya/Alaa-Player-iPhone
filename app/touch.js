(function(){
'use strict';
window.APTouch=!!(window.APForceTouch||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
if(!window.APTouch)return;
document.body.classList.add('touch');
var back=document.createElement('button');back.id='touch-back';back.textContent='‹';back.setAttribute('aria-label','Back');back.onclick=function(){if(!document.getElementById('player').hidden){document.getElementById('stop').click();return;}if(window.apTouchBack)window.apTouchBack();};document.body.appendChild(back);
function updateBack(){document.body.classList.toggle('phone-home',!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden);back.hidden=!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden;}
new MutationObserver(updateBack).observe(document.getElementById('screen'),{subtree:true,attributes:true,attributeFilter:['hidden']});updateBack();
var rail=document.createElement('aside');rail.id='phone-home-rail';var logo=document.querySelector('.brand').cloneNode(true);logo.removeAttribute('id');var version=logo.querySelector('#app-display-version');if(version){version.removeAttribute('id');version.textContent='2.6.3';}rail.appendChild(logo);
var targets=['#nav-home','nav [data-kind="live"]','nav [data-kind="movies"]','nav [data-kind="series"]','#nav-favorites','#nav-search','#settings-open'];
targets.forEach(function(selector,index){var original=document.querySelector(selector);if(!original&&index===4)original=document.querySelector('nav button:nth-last-child(2)');if(!original)return;var b=document.createElement('button');b.className=index===0?'selected':'';var icon=original.querySelector('.nav-icon');if(icon)b.appendChild(icon.cloneNode(true));var label=document.createElement('span');label.textContent=['الرئيسية','البث المباشر','الأفلام','المسلسلات','المفضلة','البحث','الإعدادات'][index];b.appendChild(label);b.onclick=function(){original.click();};rail.appendChild(b);});document.body.appendChild(rail);

function playerMode(){var playing=!document.getElementById('player').hidden;document.body.classList.toggle('phone-library',document.getElementById('home').hidden&&!playing&&document.getElementById('connection').hidden);document.body.classList.toggle('phone-playing',playing);document.body.classList.toggle('phone-detail',!document.getElementById('movie-detail').hidden||!document.getElementById('series-detail').hidden);if(playing)document.body.classList.remove('touch-nav-open');}
new MutationObserver(playerMode).observe(document.getElementById('player'),{attributes:true,attributeFilter:['hidden']});playerMode();new MutationObserver(playerMode).observe(document.getElementById("screen"),{subtree:true,attributes:true,attributeFilter:["hidden"]});
document.addEventListener('DOMContentLoaded',function(){
var controls=document.querySelector('#player-ui .actions');
['red-sub','red-audio','red-aspect','red-fs'].forEach(function(id){var b=document.getElementById(id);if(b)controls.appendChild(b);});
var icons={'stop':['‹','رجوع'],'pause':['Ⅱ','تشغيل'],'seek-back':['↶','−30ث'],'seek-forward':['↷','+30ث'],'retry':['↻','إعادة'],'f21-speed':['1×','السرعة'],'red-sub':['CC','الترجمة'],'red-audio':['♫','الصوت'],'red-aspect':['□','المقاس'],'red-fs':['⛶','ملء الشاشة'],'quick-toggle':['▤','مشابه']};
Object.keys(icons).forEach(function(id){var b=document.getElementById(id);if(!b)return;b.dataset.phoneIcon=icons[id][0];b.dataset.phoneLabel=icons[id][1];});
var playerBack=document.createElement('button');playerBack.id='phone-player-back';playerBack.type='button';playerBack.textContent='‹';playerBack.setAttribute('aria-label','رجوع');playerBack.onclick=function(){document.getElementById('stop').click();};document.getElementById('player').appendChild(playerBack);
function syncPlayerBack(){var player=document.getElementById('player'),live=document.getElementById('live-now'),ui=document.getElementById('player-ui');var hide=player.hidden||(player.dataset.playbackKind==='live'?(!live||live.hidden):ui.classList.contains('dim'));if(playerBack.hidden!==hide)playerBack.hidden=hide;}
new MutationObserver(syncPlayerBack).observe(document.getElementById('player'),{subtree:true,attributes:true,attributeFilter:['hidden','class']});syncPlayerBack();
var more=document.createElement('button');more.id='phone-more';more.type='button';more.dataset.phoneIcon='•••';more.dataset.phoneLabel='المزيد';more.setAttribute('aria-label','المزيد');controls.appendChild(more);
var sheet=document.createElement('div');sheet.id='phone-more-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','خيارات المشغّل');
var close=document.createElement('button');close.textContent='إغلاق';close.onclick=function(){sheet.hidden=true;document.dispatchEvent(new Event('ap-vod-controls'));};sheet.appendChild(close);
['f21-speed','red-sub','red-audio','red-aspect','retry','red-fs'].forEach(function(id){var b=document.getElementById(id);if(b)sheet.appendChild(b);});
document.getElementById('player').appendChild(sheet);
more.onclick=function(){sheet.hidden=!sheet.hidden;document.dispatchEvent(new Event('ap-vod-controls'));};
function labelControls(){Object.keys(icons).concat(['phone-more']).forEach(function(id){var b=document.getElementById(id);if(!b)return;var icon=b.querySelector('.phone-control-icon'),label=b.querySelector('.phone-control-label');if(!icon||!label){b.replaceChildren();icon=document.createElement('span');icon.className='phone-control-icon';label=document.createElement('span');label.className='phone-control-label';b.appendChild(icon);b.appendChild(label);}var glyph=id==='pause'?(document.getElementById('video').paused?'▶':'Ⅱ'):b.dataset.phoneIcon;if(icon.textContent!==glyph)icon.textContent=glyph;var caption=id==='pause'?(document.getElementById('video').paused?'تشغيل':'إيقاف'):b.dataset.phoneLabel;if(label.textContent!==caption)label.textContent=caption;});}

function paintDetailButtons(){
[['movie-play','▶','تشغيل'],['movie-resume','↶','متابعة'],['movie-favorite','♡','المفضلة'],['series-continue','▶','متابعة'],['series-start','▶','تشغيل'],['series-favorite','♡','المفضلة'],['series-later','◷','لاحقاً']].forEach(function(row){var b=document.getElementById(row[0]);if(!b)return;if(b.children.length===2&&b.firstChild.className==='detail-icon'&&b.lastChild.textContent===row[2])return;var icon=document.createElement('span');icon.className='detail-icon';icon.textContent=row[1];var label=document.createElement('small');label.textContent=row[2];b.replaceChildren(icon,label);});
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
})();
