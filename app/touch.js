(function(){
'use strict';
window.APTouch=!!(window.APForceTouch||(navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
if(!window.APTouch)return;
document.body.classList.add('touch');
var back=document.createElement('button');back.id='touch-back';back.textContent='‹';back.setAttribute('aria-label','Back');back.onclick=function(){if(window.apTouchBack)window.apTouchBack();};document.body.appendChild(back);
function updateBack(){back.hidden=!document.getElementById('home').hidden&&document.getElementById('connection').hidden&&document.getElementById('player').hidden;}
new MutationObserver(updateBack).observe(document.getElementById('screen'),{subtree:true,attributes:true,attributeFilter:['hidden']});updateBack();
var menu=document.createElement('button');menu.id='touch-menu';menu.textContent='☰';menu.setAttribute('aria-label','Navigation');menu.onclick=function(){document.body.classList.toggle('touch-nav-open');};document.body.appendChild(menu);
document.querySelector('nav').addEventListener('click',function(e){if(e.target.closest('button'))document.body.classList.remove('touch-nav-open');});
document.addEventListener('click',function(e){var b=e.target.closest('button');if(b){try{b.focus({preventScroll:true});}catch(_){b.focus();}}},true);
// Native scrolling must not be intercepted or converted into a second activation.
document.addEventListener('touchstart',function(e){var el=e.target.closest('button');if(el&&el.parentElement&&['items','episode-list','categories'].indexOf(el.parentElement.id)>=0&&document.activeElement)document.activeElement.blur();},{passive:true});
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
})();
