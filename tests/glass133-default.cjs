// Persistence migration and computed-style contracts in Chromium 87.
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright');
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const entry='file://'+path.resolve('dist/index.html');
const options={executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox'],bypassCSP:true};
const results=[];
async function pageIn(ctx){const p=await ctx.newPage();await p.route('https://**/*',r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:{status:'inactive'}}));await p.goto(entry);await p.waitForSelector('#red-sub',{state:'attached'});return p;}
async function state(p,on,label){const s=await p.evaluate(()=>({off:document.body.classList.contains('no-glass'),pressed:document.querySelector('#glass-toggle').getAttribute('aria-pressed'),text:document.querySelector('#glass-toggle').textContent,choice:localStorage.getItem('ap-glass-choice'),legacy:localStorage.getItem('ap-glass')}));assert.equal(s.off,!on,label);assert.equal(s.pressed,String(on),label);assert.ok(s.text.includes(on?'تشغيل':'إيقاف'));return s;}
async function styles(p,on,label){
 for(const kind of ['movie','episode','live']){
 await p.evaluate(k=>{const pl=document.getElementById('player');pl.hidden=false;pl.dataset.playbackKind=k;document.getElementById('player-ui').classList.remove('dim');document.getElementById('quick-channels').hidden=false;document.getElementById('red-sub').click();document.getElementById('red-sublist').hidden=false;document.getElementById('pause').focus();},kind);
 const r=await p.evaluate(()=>{const css=(e,ps)=>{const c=getComputedStyle(e,ps);return {b:c.backdropFilter||'none',w:c.getPropertyValue('-webkit-backdrop-filter')||'none',bg:c.backgroundColor,img:c.backgroundImage}};const q=document.getElementById('quick-channels'),ui=document.getElementById('player-ui'),sub=document.getElementById('red-sublist');return{q:css(q),ui:css(ui),before:css(ui,':before'),focus:css(document.getElementById('pause')),sub:css(sub),all:[...document.querySelectorAll('#player,#player *')].flatMap(e=>[null,':before',':after'].map(ps=>({id:e.id,ps,...css(e,ps)})))}});
 if(!on){assert.ok(r.all.every(c=>c.b==='none'&&c.w==='none'),label+' OFF has blur '+JSON.stringify(r.all.filter(c=>c.b!=='none'||c.w!=='none')));for(const key of ['q','before','sub']){assert.equal(r[key].img,'none',label+' solid '+key);assert.match(r[key].bg,/rgba?\(/);assert.notEqual(r[key].bg,'rgba(0, 0, 0, 0)',label+' background '+key);}}
 else {assert.match(r.q.b,/blur\(14px\)/,label+' overlay blur');if(kind==='live'){assert.equal(r.before.b,'none');assert.equal(r.focus.b,'none');assert.equal(r.ui.b,'none');}else {assert.match(r.before.b,/blur\(14px\)/,label+' control blur');assert.match(r.focus.b,/blur\(14px\)/,label+' focus blur');}}
 }
}
(async()=>{for(const theme of ['apple','navy','red','blue']){
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'glass-choice-'));let ctx;
try{ctx=await chromium.launchPersistentContext(dir,options);let p=await pageIn(ctx);
for(const [name,legacy,marker,on] of [
 ['fresh',null,null,false],['legacy-no-choice',null,null,false],['legacy-default-true','true',null,false],['legacy-unknown','false',null,false],
 ['explicit-on','1',null,true],['explicit-off','0',null,false],['older-explicit-on','on',null,true],['older-explicit-off','off',null,false],
 ['marker-on-wins','0','1',true],['marker-off-wins','1','0',false]
]){
 await p.evaluate(({theme,legacy,marker})=>{localStorage.clear();localStorage.setItem('ap-theme',theme);if(legacy!==null)localStorage.setItem('ap-glass',legacy);if(marker!==null)localStorage.setItem('ap-glass-choice',marker);},{theme,legacy,marker});
 await p.reload();await p.waitForSelector('#red-sub',{state:'attached'});const label=theme+' '+name;
 const s=await state(p,on,label);if(legacy===null||legacy==='true'||legacy==='false')assert.equal(s.choice,null,label+' must not invent interaction');else assert.equal(s.choice,on?'1':'0');
 await styles(p,on,label);results.push(label);
}
// Actual setting click, then full browser-process restart, in both directions.
for(const target of [true,false]){
 const before=await p.evaluate(()=>document.querySelector('#glass-toggle').getAttribute('aria-pressed')==='true');if(before!==target)await p.evaluate(()=>document.querySelector('#glass-toggle').click());
 const s=await state(p,target,theme+' click');assert.equal(s.choice,target?'1':'0');assert.equal(s.legacy,target?'1':'0');
 await styles(p,target,theme+' click');await ctx.close();ctx=await chromium.launchPersistentContext(dir,options);p=await pageIn(ctx);await state(p,target,theme+' process restart');await styles(p,target,theme+' restart');results.push(theme+' toggle '+target+' restart');
}
}finally{if(ctx)await ctx.close();fs.rmSync(dir,{recursive:true,force:true});}
}
fs.writeFileSync('artifacts/release133/glass-default-results.json',JSON.stringify({checks:results.length,results,engine:'Chromium 87',actualTV:false},null,2));console.log('GLASS_DEFAULT_PASS '+results.length+' cases; all-theme movie/episode/live computed styles; full browser restart ON/OFF');})().catch(e=>{console.error(e);process.exit(1)});
