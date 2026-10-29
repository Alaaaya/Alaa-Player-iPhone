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
await p.evaluate(()=>window.APEpisodePresentation.fullscreen(true));
await p.waitForFunction(()=>{const v=document.getElementById('video');return v.readyState>=3&&v.currentTime>0.1&&v.duration>0});
const tag=theme+'@'+W;
const S=()=>p.evaluate(()=>{const v=document.getElementById('video'),bar=document.getElementById('progress');const track=getComputedStyle(bar,'::-webkit-slider-runnable-track').backgroundImage;return{t:v.currentTime,d:v.duration,paused:v.paused,val:Number(bar.value),p:bar.style.getPropertyValue('--p'),dis:bar.disabled,label:document.getElementById('time-progress').textContent,track,bar:bar.getBoundingClientRect().toJSON()}});

const code=async n=>p.evaluate(n=>document.dispatchEvent(new KeyboardEvent('keydown',{keyCode:n,which:n,bubbles:true})),n);
const focus=async id=>p.evaluate(id=>{document.getElementById('player-ui').classList.remove('dim');document.getElementById(id).focus({preventScroll:true})},id);
const id=()=>p.evaluate(()=>document.activeElement.id);
await p.evaluate(()=>document.getElementById('video').pause());
for(const kind of ['vod','episode']){
await p.evaluate(kind=>document.getElementById('player').dataset.playbackKind=kind,kind);
const rows=await p.evaluate(()=>{const v=e=>!e.disabled&&!e.hidden&&e.offsetParent!==null;const a=['seek-back','pause','progress','seek-forward'].map(x=>document.getElementById(x)).filter(v);const b=['stop','red-sub','red-audio','red-aspect','red-fs','quick-toggle','retry'].map(x=>document.getElementById(x)).filter(v);Array.from(document.querySelectorAll('#player-ui button')).filter(v).forEach(e=>{if(!a.includes(e)&&!b.includes(e))b.push(e)});return[a.map(e=>e.id),b.map(e=>e.id)]});
for(let row=0;row<2;row++)for(let ix=0;ix<rows[row].length;ix++){
const cur=rows[row][ix];await focus(cur);
const scroll=await p.evaluate(()=>[scrollX,scrollY,document.querySelector('#player-ui').scrollTop]);
for(const dir of [37,39]){await focus(cur);await p.evaluate(()=>document.getElementById('video').currentTime=20);await code(dir);assert.equal(await id(),cur==='progress'?cur:rows[row][Math.max(0,Math.min(rows[row].length-1,ix+(dir===39?1:-1)))],tag+' '+cur+' horizontal '+dir);}
for(const dir of [38,40]){await focus(cur);await code(dir);const to=dir===40?1:0;assert.equal(await id(),rows[to][Math.min(ix,rows[to].length-1)],tag+' '+cur+' vertical '+dir);}
assert.deepEqual(await p.evaluate(()=>[scrollX,scrollY,document.querySelector('#player-ui').scrollTop]),scroll);
}
for(let row=0;row<2;row++){await focus(rows[row][0]);for(let n=0;n<8;n++)await code(37);assert.equal(await id(),rows[row][0]);await focus(rows[row].at(-1));for(let n=0;n<8;n++)await code(39);assert.equal(await id(),rows[row].at(-1));}
await focus('progress');await p.evaluate(()=>document.getElementById('video').currentTime=20);await code(39);assert.ok(Math.abs(await p.evaluate(()=>document.getElementById('video').currentTime)-30)<.2);await code(37);assert.ok(Math.abs(await p.evaluate(()=>document.getElementById('video').currentTime)-20)<.2);
}

for(const target of await p.evaluate(()=>Array.from(document.querySelectorAll('#player-ui button')).filter(e=>!e.hidden&&!e.disabled&&e.offsetParent!==null).map(e=>e.id))){
 await focus(target);
 const st=await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return {id:e.id,outline:s.outlineStyle,shadow:s.boxShadow,radius:s.borderRadius}});
 assert.equal(st.id,target);assert.equal(st.outline,'none');assert.notEqual(st.shadow,'none');assert.ok(['50%','999px'].includes(st.radius));
}
await focus('pause');await code(37);assert.equal(await id(),'seek-back');
await p.screenshot({path:'/home/kit/tmp/focus136/vod-'+theme+'-'+W+'.png'});
await focus('pause');await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').paused),false);await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').paused),true);
await focus('red-sub');await code(13);await p.waitForFunction(()=>!document.getElementById('red-sublist').hidden);await p.keyboard.press('Escape');
if(await p.locator('#red-aspect').isVisible()){await focus('red-aspect');await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').style.objectFit),'cover');}
await focus('stop');await code(13);await p.waitForFunction(()=>document.getElementById('player').hidden);assert.equal(await p.locator('#series-detail').isVisible(),true);
console.log('FOCUS_MAP_PASS',tag);await c.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
