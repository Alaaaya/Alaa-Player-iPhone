const{chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const results=[];
try{for(const theme of ['apple','navy','red','blue'])for(const width of [1920,1280]){
const c=await b.newContext({bypassCSP:true,viewport:{width,height:width===1920?1080:720}}),p=await c.newPage();await p.addInitScript(t=>localStorage.setItem('ap-theme',t),theme);
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};const video=fs.readFileSync('/home/kit/tmp/ovfix/broadcast.webm');
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();let data=[];
if(u.hostname.includes('supabase'))data=u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'test',type:'xtream',server:'https://fixture.example',username:'test',password:'test',name:'Live'}]};
else if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');if(u.pathname==='/logo.svg')return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="70"><rect width="100" height="70" fill="red"/><text x="8" y="40" fill="white">SPORT</text></svg>'});if(u.pathname==='/broken.svg')return r.fulfill({status:404,body:''});if(!a)return r.fulfill({headers:{...cors,'content-type':'video/webm'},body:video});if(a==='get_live_categories')data=[{category_id:'1',category_name:'SPORTS'}];if(a==='get_live_streams')data=Array.from({length:600},(_,i)=>({stream_id:i+1,name:(i+1)+' - '+(i===1?'SPORT TWO':'SPORT HD'),category_id:'1',stream_type:'live',stream_icon:i%2===0?'https://fixture.example/logo.svg':'https://fixture.example/broken.svg',container_extension:'webm'}));}
return r.fulfill({headers:cors,json:data});});
await p.goto('file:///home/kit/alaa-player-webos/dist/index.html');await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.getElementById('connection').hidden);
await p.locator('nav [data-kind="live"]').click();await p.waitForSelector('#items button');await p.locator('#items button').first().click();await p.waitForFunction(()=>!document.getElementById('player').hidden);
await p.evaluate(()=>{const v=document.getElementById('video');v.querySelector('source').removeAttribute('type');v.load();v.play();});await p.waitForFunction(()=>document.getElementById('video').currentTime>0.1);await p.evaluate(()=>document.getElementById('video').loop=true);
assert.equal(await p.evaluate(()=>document.getElementById('player').dataset.playbackKind),'live');
assert.equal(await p.evaluate(()=>getComputedStyle(document.getElementById('live-now')).backdropFilter),'none');
assert.equal(await p.evaluate(()=>getComputedStyle(document.getElementById('player-ui')).display),'none');
assert.equal(await p.locator('#live-now strong').innerText(),'SPORT HD');
await p.waitForFunction(()=>document.querySelector('#live-now img')&&document.querySelector('#live-now img').complete&&document.querySelector('#live-now img').naturalWidth>0);
if(width===1920){await p.screenshot({path:'/home/kit/tmp/live-'+theme+'.png'});if(theme==='apple')await p.screenshot({path:'/home/kit/tmp/live-fullscreen.png'});}
const geometry=await p.evaluate(()=>{const e=document.getElementById('live-now'),r=e.getBoundingClientRect(),t=document.querySelector('.live-channel-text').getBoundingClientRect(),i=document.querySelector('.live-broadcast-info').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,screenH:innerHeight,screenW:innerWidth,fit:t.right<=i.left,clock:document.querySelector('.live-clock').textContent,number:document.querySelector('.live-channel-number').textContent,quality:document.querySelector('.live-quality').textContent}});
console.log(theme,width,geometry);assert.equal(geometry.x,0);assert.equal(geometry.w,width);assert.ok(Math.abs(geometry.h/geometry.screenH-.14)<.005);assert.ok(geometry.fit);assert.match(geometry.clock,/\d{2}:\d{2}/);assert.equal(geometry.number,'1');assert.equal(geometry.quality,'HD');
await p.waitForTimeout(4250);assert.equal(await p.locator('#live-now').isVisible(),false,'four-second hide');
await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#live-now').isVisible(),true,'non-OK reveal');
await p.waitForTimeout(2500);await p.keyboard.press('ArrowDown');await p.waitForTimeout(1800);assert.equal(await p.locator('#live-now').isVisible(),true,'zap resets timer');await p.waitForTimeout(2450);assert.equal(await p.locator('#live-now').isVisible(),false,'zap renewed timer hides');await p.keyboard.press('ArrowUp');

for(const k of ['ArrowDown','ArrowUp']){await p.keyboard.press(k);await p.waitForTimeout(30);}
assert.equal(await p.locator('#zap-banner').isVisible(),false);await p.keyboard.press('ArrowDown');await p.waitForFunction(()=>!document.querySelector('#live-now img'));assert.equal(await p.locator('#live-now strong').innerText(),'SPORT TWO');assert.equal(await p.locator('#live-now .live-quality').count(),0,'unknown quality omitted');assert.equal(await p.locator('#live-now .live-channel-number').innerText(),'2');assert.ok(await p.locator('#live-now .logo-initials').isVisible());
await p.keyboard.press('ArrowUp');await p.waitForFunction(()=>document.querySelector('#live-now img')&&document.querySelector('#live-now img').naturalWidth>0);
for(const keyCode of [427,428])await p.evaluate(keyCode=>document.dispatchEvent(new KeyboardEvent('keydown',{keyCode,bubbles:true})),keyCode);

await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.getElementById('quick-channels').hidden);assert.equal(await p.locator('#live-now').isVisible(),false);
assert.equal(await p.evaluate(()=>document.getElementById('player').hidden),false);
assert.equal(await p.evaluate(()=>getComputedStyle(document.getElementById('player-ui')).visibility),'hidden');
const t=await p.evaluate(()=>document.getElementById('video').currentTime);
for(let i=0;i<400;i++)await p.keyboard.press('ArrowDown');
assert.equal(await p.evaluate(()=>document.activeElement.dataset.quickIndex),'400');
assert.ok(await p.locator('#quick-list button').count()<30);
await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.getElementById('player').hidden),false);
await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.getElementById('quick-channels').hidden);
await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.getElementById('quick-channels').hidden),true);
assert.equal(await p.evaluate(()=>document.getElementById('player').hidden),false);
assert.notEqual(await p.evaluate(()=>getComputedStyle(document.getElementById('player-ui')).visibility),'hidden');
await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.getElementById('quick-channels').hidden);
await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.getElementById('player').hidden);
results.push({geometry,theme,width,liveOKOverlay:true,scroll400:true,selectContinuesPlayback:true,backRestores:true});await c.close();
}fs.writeFileSync('/home/kit/tmp/live-banner133.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
