const{chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),assert=require('assert/strict'),path=require('path');
const DIST='file://'+path.resolve(__dirname,'../dist/index.html');
(async()=>{const video=fs.readFileSync('/home/kit/tmp/ovfix/seek65.webm');
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{for(const theme of ['apple','navy','red','blue'])for(const W of [1920,1280]){const H=W*9/16;const c=await b.newContext({bypassCSP:true,viewport:{width:W,height:H}}),p=await c.newPage();
await p.addInitScript(t=>localStorage.setItem('ap-theme',t),theme);
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'s',type:'xtream',server:'https://fixture.example',username:'t',password:'t',name:'T'}]}});
if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');if(!a){const rg=r.request().headers()['range'],hd={...cors,'content-type':'video/webm','accept-ranges':'bytes'};if(rg){const m=/bytes=(\d+)-(\d*)/.exec(rg),st=+m[1],en=m[2]?+m[2]:video.length-1;return r.fulfill({status:206,headers:{...hd,'content-range':'bytes '+st+'-'+en+'/'+video.length},body:video.subarray(st,en+1)});}return r.fulfill({headers:hd,body:video});}let d=[];
if(a==='get_series_categories')d=[{category_id:'1',category_name:'Drama'}];
if(a==='get_series')d=[{series_id:1,name:'Coastal Journey',category_id:'1',rating:'8.2'}];
if(a==='get_series_info')d={info:{name:'Coastal Journey',plot:'x',genre:'Drama',rating:'8.2'},episodes:{'1':Array.from({length:3},(_,i)=>({id:i+1,title:'Coastal S01 E0'+(i+1),episode_num:i+1,season:1,container_extension:'webm',info:{duration:'00:25:00'}}))}};
return r.fulfill({headers:cors,json:d});}
return r.fulfill({headers:cors,body:''});});
p.on('pageerror',e=>{throw e});await p.goto(DIST);
await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden,null,{timeout:10000});
await p.locator('nav [data-kind="series"]').click();await p.waitForSelector('#items button');await p.locator('#items button').first().click();
await p.waitForSelector('.episode-row');await p.locator('.episode-row').nth(1).click();
await p.waitForFunction(()=>!document.getElementById('player').hidden);
if(theme==='red'){await p.waitForTimeout(100);await p.locator('#red-fs').click().catch(()=>{});}
await p.waitForFunction(()=>{const v=document.getElementById('video');return v.readyState>=3&&v.currentTime>0.1&&v.duration>0});
const tag=theme+'@'+W;
const S=()=>p.evaluate(()=>{const v=document.getElementById('video'),bar=document.getElementById('progress');const track=getComputedStyle(bar,'::-webkit-slider-runnable-track').backgroundImage;return{t:v.currentTime,d:v.duration,paused:v.paused,val:Number(bar.value),p:bar.style.getPropertyValue('--p'),dis:bar.disabled,label:document.getElementById('time-progress').textContent,track,bar:bar.getBoundingClientRect().toJSON()}});
// playing advances
await p.evaluate(()=>{const v=document.getElementById('video');v.loop=true;v.play()});
const a=await S();await p.waitForTimeout(400);const a2=await S();
assert.ok(!a.dis,tag+' enabled');assert.ok(a2.t!==a.t&&a2.val!==a.val,tag+' advances');
const lag=0.35/a2.d;assert.ok(Math.abs(a2.val/100-a2.t/a2.d)<=lag+0.005,tag+' value matches (timeupdate lag)');assert.ok(Math.abs(Number(a2.p)-a2.val/100)<1e-6,tag+' --p equals value');
assert.match(a2.label,/^\d+:\d\d \/ \d+:\d\d$/);
// paused stable
await p.evaluate(()=>document.getElementById('video').pause());await p.waitForTimeout(150);const s1=await S();await p.waitForTimeout(300);const s2=await S();
assert.equal(s1.t,s2.t);assert.equal(s1.val,s2.val);assert.equal(s1.label,s2.label);
// real controls forward/back
const focusId=async id=>p.evaluate(i=>document.getElementById(i).focus(),id);
await p.evaluate(()=>{const v=document.getElementById('video');v.loop=false;v.currentTime=0.2});await p.waitForTimeout(150);
(await p.evaluate(()=>{const v=document.getElementById('video');return JSON.stringify({seekable:v.seekable.length&&[v.seekable.start(0),v.seekable.end(0)],t:v.currentTime,rs:v.readyState,ui:document.getElementById('player-ui').className,hid:document.getElementById('seek-forward').hidden,kind:document.getElementById('player').dataset.playbackKind})}));const before=await S();await focusId('seek-forward');await p.keyboard.press('Enter');await p.waitForTimeout(150);const f=await S();
assert.ok(f.t>before.t,tag+' forward moved '+JSON.stringify([before,f]));assert.ok(Math.abs(f.val-f.t/f.d*100)<0.5,tag+' fwd sync');
await focusId('seek-back');await p.keyboard.press('Enter');await p.waitForTimeout(150);const bk=await S();
assert.ok(bk.t<0.3,tag+' back returns near start');assert.ok(bk.val<1);
await focusId('seek-forward');await p.keyboard.press('Enter');await p.waitForTimeout(150);const e=await S();
assert.ok(e.t>=29.9,tag+' forward 30 seconds');assert.ok(e.t<=e.d+1e-6);assert.ok(e.val<=100.0001);
// scrubber via keyboard
await focusId('progress');await p.keyboard.press('Home');await p.waitForTimeout(100);let h=await S();assert.equal(h.t,0);assert.equal(h.val,0);
await p.keyboard.press('End');await p.waitForTimeout(100);h=await S();assert.ok(Math.abs(h.val-100)<.01);assert.ok(h.t<=h.d&&h.t>=h.d-0.1,tag+' End seeks to end '+h.t+' '+h.d);
// thumb/fill alignment at endpoints and middle
for(const f of [0,0.5,1]){await p.evaluate(f=>{const v=document.getElementById('video');v.currentTime=v.duration*f},f);await p.waitForTimeout(150);
const al=await p.evaluate(()=>{const bar=document.getElementById('progress'),r=bar.getBoundingClientRect(),th=parseFloat(getComputedStyle(bar).getPropertyValue('--thumb'))||0;const probe=document.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;width:clamp(13px,1.35vw,20px)';document.body.appendChild(probe);const thumb=probe.getBoundingClientRect().width;probe.remove();const pv=Number(bar.style.getPropertyValue('--p'));return{w:r.width,thumb,pv,expectedCenter:thumb/2+pv*(r.width-thumb),val:Number(bar.value),max:100}});
assert.ok(Math.abs(al.pv*100-al.val)<0.01,tag+' p vs value '+JSON.stringify(al));
if(f===0)assert.ok(Math.abs(al.expectedCenter-al.thumb/2)<0.01);if(f===1)assert.ok(Math.abs(al.expectedCenter-(al.w-al.thumb/2))<0.6,tag+' end center');}
// focus ring on pills
await p.evaluate(()=>{document.getElementById('player-ui').classList.remove('dim')});
for(const id of ['pause','seek-forward','stop']){await focusId(id);const ring=await p.evaluate(i=>{const el=document.getElementById(i),cs=getComputedStyle(el),r=el.getBoundingClientRect();return{outline:cs.outlineStyle,ow:cs.outlineWidth,shadow:cs.boxShadow,tf:cs.transform,radius:cs.borderTopLeftRadius,x:r.x,y:r.y,w:r.width,h:r.height}},id);
assert.ok(ring.outline==='none'||ring.ow==='0px',tag+id+' no outline');assert.match(ring.shadow,/rgb\(255, 255, 255\) 0px 0px 0px 2px/);assert.doesNotMatch(ring.shadow,/\d+px \d+px 2\dpx/);assert.equal(ring.tf,'none');assert.notEqual(ring.radius,'0px');
await p.evaluate(()=>document.activeElement.blur());const un=await p.evaluate(i=>{const r=document.getElementById(i).getBoundingClientRect();return[r.x,r.y,r.width,r.height]},id);assert.deepEqual(un,[ring.x,ring.y,ring.w,ring.h],tag+id+' no layout shift');}
// Real subtitle picker OFF button, every theme.
await focusId('red-sub');await p.keyboard.press('Enter');
await p.waitForFunction(()=>!document.getElementById('red-sublist').hidden);
const ring=await p.evaluate(()=>{const b=document.activeElement,c=getComputedStyle(b);return{txt:b.textContent,o:c.outlineStyle,s:c.boxShadow,t:c.transform}});
assert.match(ring.txt,/OFF|إيقاف/);assert.equal(ring.o,'none');assert.match(ring.s,/255, 255, 255\) 0px 0px 0px 2px/);assert.equal(ring.t,'none');
await p.keyboard.press('Escape');
// Hidden-controls +/-10s, numeric LG keycodes, held repeats, no focus changes.
for(const playing of [false,true]){
await p.evaluate(playing=>{const v=document.getElementById('video');v.currentTime=20;v.loop=false;if(playing)v.play();else v.pause();document.getElementById('pause').focus();document.getElementById('player-ui').classList.add('dim')},playing);
await p.waitForTimeout(250);await p.evaluate(()=>document.getElementById('player-ui').classList.add('dim'));await p.waitForTimeout(50);const before=await S(),hiddenFocus=await p.evaluate(()=>document.activeElement.id);
await p.evaluate(id=>window.__hiddenFocus=id,hiddenFocus);await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);const right=await S();
assert.ok(right.t-before.t>=9.8&&right.t-before.t<10.6,tag+' right ten '+JSON.stringify({before,right,playing}));
assert.ok(await p.evaluate(()=>document.getElementById('player-ui').classList.contains('dim')&&!document.getElementById('seek-feedback').hidden&&document.activeElement.id===window.__hiddenFocus),tag+' hidden no focus steal');
await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:37,which:37,bubbles:true})));await p.waitForTimeout(100);
assert.ok(Math.abs((await S()).t-before.t)<.8,tag+' numeric left ten');
await p.evaluate(()=>{for(let i=0;i<9;i++)document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:39,which:39,repeat:true,bubbles:true}))});await p.waitForTimeout(120);
assert.ok(Math.abs((await S()).t-(await S()).d)<.2,tag+' repeated right clamps');
await p.evaluate(()=>{for(let i=0;i<9;i++)document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:37,which:37,repeat:true,bubbles:true}))});await p.waitForTimeout(100);
assert.ok((await S()).t<.4,tag+' repeated left clamps');
await p.waitForTimeout(1600);assert.ok(await p.evaluate(()=>document.getElementById('seek-feedback').hidden),tag+' feedback autohide');
assert.equal(await p.evaluate(()=>document.activeElement.id),hiddenFocus);
await p.evaluate(()=>{document.getElementById('video').pause();document.getElementById('player-ui').classList.remove('dim')});
}
await p.evaluate(()=>{const v=document.getElementById('video');v.currentTime=20;document.getElementById('progress').focus()});await p.waitForTimeout(100);
await p.keyboard.press('ArrowRight');await p.waitForTimeout(120);assert.ok(Math.abs((await S()).t-30)<.3,tag+' visible scrubber ten');
await focusId('pause');const navTime=(await S()).t;await p.keyboard.press('ArrowRight');assert.equal((await S()).t,navTime,tag+' visible navigation no seek');
// unknown / NaN / Infinity / zero duration (synthetic: duration property overridden)
for(const dv of [0,NaN,Infinity]){await p.evaluate(dv=>{const v=document.getElementById('video');Object.defineProperty(v,'duration',{configurable:true,get(){return dv}});v.dispatchEvent(new Event('durationchange'))},dv);const u=await S();assert.equal(u.label,'--:-- / --:--',tag+' unknown '+dv);assert.ok(u.dis);assert.equal(u.val,0);
await focusId('seek-forward');const t0=await S();await p.keyboard.press('Enter');assert.equal((await S()).t,t0.t,'no seek on unknown');await p.evaluate(()=>{document.getElementById('pause').focus();document.getElementById('player-ui').classList.add('dim')});for(const k of ['ArrowLeft','ArrowRight']){await p.keyboard.press(k);assert.equal((await S()).t,t0.t,tag+' arrow no seek unknown '+dv);}}
await p.evaluate(()=>{delete document.getElementById('video').duration;document.getElementById('video').dispatchEvent(new Event('durationchange'))});assert.ok(!(await S()).dis);
await c.close();console.log('PASS',tag);}
// live
{const c=await b.newContext({bypassCSP:true,viewport:{width:1920,height:1080}}),p=await c.newPage();await p.addInitScript(()=>localStorage.setItem('ap-theme','apple'));
await p.route('**/*',async r=>{const u=new URL(r.request().url());const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'s',type:'xtream',server:'https://fixture.example',username:'t',password:'t',name:'T'}]}});
if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');if(!a){const rg=r.request().headers()['range'],hd={...cors,'content-type':'video/webm','accept-ranges':'bytes'};if(rg){const m=/bytes=(\d+)-(\d*)/.exec(rg),st=+m[1],en=m[2]?+m[2]:video.length-1;return r.fulfill({status:206,headers:{...hd,'content-range':'bytes '+st+'-'+en+'/'+video.length},body:video.subarray(st,en+1)});}return r.fulfill({headers:hd,body:video});}let d=[];if(a==='get_live_categories')d=[{category_id:'1',category_name:'News'}];if(a==='get_live_streams')d=[{stream_id:1,name:'Chan One',category_id:'1',num:1}];return r.fulfill({headers:cors,json:d});}return r.fulfill({headers:cors,body:''});});
await p.goto(DIST);await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);await p.locator('nav [data-kind="live"]').click();await p.waitForSelector('#items button');await p.locator('#items button').first().click().catch(()=>{});
await p.waitForTimeout(300);for(let n=0;n<3&&await p.evaluate(()=>document.getElementById('player').hidden);n++){await p.locator('#items button').first().click().catch(()=>{});await p.waitForTimeout(300);}if(await p.evaluate(()=>document.getElementById('player').hidden))await p.locator('#play-selected').click().catch(()=>{});
await p.waitForFunction(()=>!document.getElementById('player').hidden,null,{timeout:8000}).catch(async e=>{console.log(await p.evaluate(()=>document.getElementById('items').innerText.slice(0,200)+'|'+document.getElementById('status').textContent));throw e});await p.waitForTimeout(800);
const l=await p.evaluate(()=>({dis:document.getElementById('progress').disabled,label:document.getElementById('time-progress').textContent,kind:document.getElementById('player').dataset.playbackKind}));
assert.equal(l.kind,'live');assert.ok(l.dis);assert.equal(l.label,'بث مباشر');console.log('PASS live');await c.close();}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
