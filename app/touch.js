(function(){
'use strict';
window.APTouch=!!(window.APForceTouch||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
if(!window.APTouch)return;
document.body.classList.add('touch');
var back=document.createElement('button');back.id='touch-back';back.textContent='‹';back.setAttribute('aria-label','Back');back.onclick=function(){if(window.apTouchBack)window.apTouchBack();};document.body.appendChild(back);
function updateBack(){document.body.classList.toggle('phone-home',!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden);back.hidden=!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden;}
new MutationObserver(updateBack).observe(document.getElementById('screen'),{subtree:true,attributes:true,attributeFilter:['hidden']});updateBack();
var rail=document.createElement('aside');rail.id='phone-home-rail';var logo=document.querySelector('.brand').cloneNode(true);logo.removeAttribute('id');var version=logo.querySelector('#app-display-version');if(version){version.removeAttribute('id');version.textContent='2.6.1';}rail.appendChild(logo);
var targets=['#nav-home','nav [data-kind="live"]','nav [data-kind="movies"]','nav [data-kind="series"]','#nav-favorites','#nav-search','#settings-open'];
targets.forEach(function(selector,index){var original=document.querySelector(selector);if(!original&&index===4)original=document.querySelector('nav button:nth-last-child(2)');if(!original)return;var b=document.createElement('button');b.className=index===0?'selected':'';var icon=original.querySelector('.nav-icon');if(icon)b.appendChild(icon.cloneNode(true));var label=document.createElement('span');label.textContent=['الرئيسية','البث المباشر','الأفلام','المسلسلات','المفضلة','البحث','الإعدادات'][index];b.appendChild(label);b.onclick=function(){original.click();};rail.appendChild(b);});document.body.appendChild(rail);

function playerMode(){var playing=!document.getElementById('player').hidden;document.body.classList.toggle('phone-playing',playing);if(playing)document.body.classList.remove('touch-nav-open');}
new MutationObserver(playerMode).observe(document.getElementById('player'),{attributes:true,attributeFilter:['hidden']});playerMode();
document.addEventListener('DOMContentLoaded',function(){
var controls=document.querySelector('#player-ui .actions');
['red-sub','red-audio','red-aspect','red-fs'].forEach(function(id){var b=document.getElementById(id);if(b)controls.appendChild(b);});
var icons={'stop':['‹','رجوع'],'pause':['Ⅱ','تشغيل'],'seek-back':['↶','−30ث'],'seek-forward':['↷','+30ث'],'retry':['↻','إعادة'],'f21-speed':['1×','السرعة'],'red-sub':['CC','الترجمة'],'red-audio':['♫','الصوت'],'red-aspect':['□','المقاس'],'red-fs':['⛶','ملء الشاشة'],'quick-toggle':['▤','مشابه']};
Object.keys(icons).forEach(function(id){var b=document.getElementById(id);if(!b)return;b.dataset.phoneIcon=icons[id][0];b.dataset.phoneLabel=icons[id][1];});
});
var menu=document.createElement('button');menu.id='touch-menu';menu.textContent='☰';menu.setAttribute('aria-label','Navigation');menu.onclick=function(){document.body.classList.toggle('touch-nav-open');};document.body.appendChild(menu);
document.querySelector('nav').addEventListener('click',function(e){if(e.target.closest('button'))document.body.classList.remove('touch-nav-open');});
document.addEventListener('click',function(e){var b=e.target.closest('button');if(b){try{b.focus({preventScroll:true});}catch(_){b.focus();}}},true);
// Native scrolling must not be intercepted or converted into a second activation.
document.addEventListener('touchstart',function(e){var el=e.target.closest('button');if(el&&el.parentElement&&['items','episode-list','categories'].indexOf(el.parentElement.id)>=0&&document.activeElement)document.activeElement.blur();},{passive:true});
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
})();
