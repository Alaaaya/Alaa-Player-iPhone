(function(){
'use strict';
window.APTouch=!!(window.APForceTouch||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
if(!window.APTouch)return;
document.body.classList.add('touch');
var back=document.createElement('button');back.id='touch-back';back.textContent='‹';back.setAttribute('aria-label','Back');back.onclick=function(){if(window.apTouchBack)window.apTouchBack();};document.body.appendChild(back);
var menu=document.createElement('button');menu.id='touch-menu';menu.textContent='☰';menu.setAttribute('aria-label','Navigation');menu.onclick=function(){document.body.classList.toggle('touch-nav-open');};document.body.appendChild(menu);
document.querySelector('nav').addEventListener('click',function(e){if(e.target.closest('button'))document.body.classList.remove('touch-nav-open');});
document.addEventListener('click',function(e){var b=e.target.closest('button');if(b){try{b.focus({preventScroll:true});}catch(_){b.focus();}}},true);
// Native scrolling must not be intercepted or converted into a second activation.
document.addEventListener('touchstart',function(e){var el=e.target.closest('button');if(el&&el.parentElement&&['items','episode-list','categories'].indexOf(el.parentElement.id)>=0&&document.activeElement)document.activeElement.blur();},{passive:true});
// Luxury player controls: icon + short localized label, state classes for CSS.
var LUX={"ar": {"stop": "خروج", "seek-back": "رجوع 30", "pause": "إيقاف مؤقت", "play": "تشغيل", "seek-forward": "تقديم 30", "quick-toggle": "القائمة", "f21-speed": "السرعة", "retry": "إعادة", "red-sub": "الترجمة", "red-audio": "الصوت", "red-aspect": "الأبعاد", "red-fs": "ملء الشاشة"}, "de": {"stop": "Zurück", "seek-back": "−30 s", "pause": "Pause", "play": "Abspielen", "seek-forward": "+30 s", "quick-toggle": "Liste", "f21-speed": "Tempo", "retry": "Erneut", "red-sub": "Untertitel", "red-audio": "Audio", "red-aspect": "Format", "red-fs": "Vollbild"}, "en": {"stop": "Exit", "seek-back": "−30 s", "pause": "Pause", "play": "Play", "seek-forward": "+30 s", "quick-toggle": "List", "f21-speed": "Speed", "retry": "Retry", "red-sub": "Subtitles", "red-audio": "Audio", "red-aspect": "Aspect", "red-fs": "Fullscreen"}};
function luxLang(){var l=(document.documentElement.lang||'ar').slice(0,2);return LUX[l]?l:'ar';}
function luxLabels(){var ui=document.getElementById('player-ui');if(!ui)return;var t=LUX[luxLang()],p=document.body.classList.contains('lux-paused');
 ui.querySelectorAll('.actions button,#red-pills button').forEach(function(b){var k=b.id==='pause'?(p?'play':'pause'):b.id,txt=b.id==='quick-toggle'?(b.firstChild&&b.firstChild.nodeType===3?b.firstChild.textContent.trim():''):'';var want=txt||t[k]||'';if(!want)return;
  var s=b.querySelector('.lux-label');if(s&&s.textContent===want)return;if(!s){s=document.createElement('span');s.className='lux-label';b.appendChild(s);}s.textContent=want;if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',want);});}
function luxMovePills(){var r=document.getElementById('red-pills'),a=document.querySelector('#player-ui .actions');if(r&&a&&r.parentNode!==a)a.appendChild(r);}
function luxState(){luxMovePills();var pl=document.getElementById('player'),v=document.getElementById('video'),h=document.getElementById('home');var c=document.body.classList;
 var ln=document.getElementById('live-now');c.toggle('touch-playing',!!pl&&!pl.hidden);c.toggle('touch-live',!!pl&&!pl.hidden&&!!ln&&!ln.hidden);c.toggle('lux-paused',!!v&&!!v.paused&&!!pl&&!pl.hidden);c.toggle('touch-home',!!h&&!h.hidden&&(!pl||pl.hidden));luxLabels();}
var luxBusy=false;new MutationObserver(function(){if(luxBusy)return;luxBusy=true;try{luxState();}finally{luxBusy=false;}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','lang'],characterData:true});
var lv=document.getElementById('video');if(lv)['play','pause','playing','waiting','emptied'].forEach(function(e){lv.addEventListener(e,luxState);});
new MutationObserver(luxState).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
luxState();
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
})();
