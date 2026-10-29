const{chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),assert=require('assert/strict'),path=require('path');
const DIST='file://'+path.resolve(__dirname,'../dist/index.html');
(async()=>{const video=fs.readFileSync('/home/kit/tmp/ovfix/seek65.webm');
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{for(const theme of ['apple','navy','red','blue'])for(const W of [1920,1280]){const H=W*9/16;const c=await b.newContext({bypassCSP:true,viewport:{width:W,height:H}}),p=await c.newPage();
await p.addInitScript(t=>{
localStorage.setItem('ap-theme',t);window.__calls=[];window.__cancel=0;window.__late=[];window.PalmSystem={};Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/87.0 webOS.TV'});
window.webOS={service:{request:(url,options)=>{__calls.push({method:options.method,parameters:options.parameters});if(options.method==='subscribe'){__late.push(options);if(window.__nativeMode==='timeout')return{cancel:()=>__cancel++};if(window.__nativeMode==='error'){setTimeout(()=>options.onFailure({errorCode:1}),10);return{cancel:()=>__cancel++};}setTimeout(()=>options.onSuccess({sourceInfo:{programInfo:[{audioTrackInfo:[{language:'tr'},{language:'ar'}],subtitleTrackInfo:[{language:'ar'}]}]}}),20);}else setTimeout(()=>options.onSuccess({returnValue:true}),10);return{cancel:()=>__cancel++};}}};
},theme);
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
await focus('pause');await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').paused),false);await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').paused),true);
assert.equal(await p.evaluate(()=>__calls.length),0,'OFF default ZERO native calls');
await p.evaluate(()=>{Object.defineProperty(document.getElementById('video'),'mediaId',{configurable:true,value:'actual-pipeline-7'});document.getElementById('experimental-lg-tracks').click();});
await p.waitForFunction(()=>APTrackDiagnostics().nativeAudioCount===2);
await focus('red-audio');await code(13);await p.locator('#red-sublist [data-track="1"]').click();await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>__calls.some(x=>x.method==='selectTrack'&&x.parameters.mediaId==='actual-pipeline-7'&&x.parameters.index===1&&x.parameters.type==='audio')),true);await p.keyboard.press('Escape');
await focus('red-sub');await code(13);await p.locator('#red-sublist [data-track="0"]').click();await p.waitForTimeout(560);assert.equal(await p.evaluate(()=>__calls.some(x=>x.method==='setSubtitleEnable'&&x.parameters.enable)&&__calls.some(x=>x.method==='selectTrack'&&x.parameters.type==='text')),true);await p.keyboard.press('Escape');
const beforeNative=await p.evaluate(()=>{const v=document.getElementById('video');window.__savedURL=v.currentSrc;window.__savedTime=v.currentTime;window.__stale=__late[0];document.getElementById('experimental-lg-tracks').click();return v.currentTime;});
await p.evaluate(()=>__stale.onSuccess({sourceInfo:{programInfo:[{audioTrackInfo:[{language:'de'}]}]}}));assert.equal(await p.evaluate(()=>APTrackDiagnostics().nativeAudioCount),0);assert.equal(await p.evaluate(()=>document.getElementById('video').currentSrc===__savedURL),true);assert.ok((await p.evaluate(()=>document.getElementById('video').currentTime))>=beforeNative);
for(const mode of ['error','timeout']){await p.evaluate(mode=>{window.__nativeMode=mode;document.getElementById('experimental-lg-tracks').click();},mode);await p.waitForTimeout(mode==='timeout'?4200:60);assert.equal(await p.evaluate(()=>APTrackDiagnostics().nativeRoute),'unavailable');assert.equal(await p.evaluate(()=>document.getElementById('video').currentSrc===__savedURL),true);await p.evaluate(()=>document.getElementById('experimental-lg-tracks').click());}
await p.evaluate(()=>{window.__nativeMode='timeout';document.getElementById('experimental-lg-tracks').click();Object.defineProperty(document.getElementById('video'),'mediaId',{configurable:true,value:'replacement-id'});__late[__late.length-1].onSuccess({sourceInfo:{programInfo:[{audioTrackInfo:[{language:'de'}]}]}});document.getElementById('experimental-lg-tracks').click();});assert.equal(await p.evaluate(()=>APTrackDiagnostics().nativeAudioCount),0);
await p.evaluate(()=>{const v=document.getElementById('video');const t=v.addTextTrack('subtitles','Arabic fixture','ar');t.addCue(new VTTCue(0,60,'اختبار الترجمة'));t.mode='disabled';window.__audioFixture=new EventTarget();__audioFixture[0]={language:'tr',enabled:true};__audioFixture[1]={language:'ar',enabled:false};__audioFixture.length=2;Object.defineProperty(v,'audioTracks',{configurable:true,get:()=>__audioFixture});});
await focus('red-sub');await code(13);await p.locator('#red-sublist [data-track="0"]').click();assert.equal(await p.evaluate(()=>document.getElementById('video').textTracks[0].mode),'showing');await p.keyboard.press('Escape');
await focus('red-audio');await code(13);assert.equal(await p.locator('#red-sublist [data-track="0"]').textContent(),'Türkçe');await p.locator('#red-sublist [data-track="1"]').click();assert.equal(await p.evaluate(()=>__audioFixture[1].enabled&&!__audioFixture[0].enabled),true);await p.keyboard.press('Escape');assert.equal(await id(),'red-audio');
const diagnostics=await p.evaluate(()=>window.APTrackDiagnostics());assert.equal(diagnostics.audio.length,2);assert.ok(!JSON.stringify(diagnostics).includes('fixture.example'));
await focus('red-sub');await code(13);await p.waitForFunction(()=>!document.getElementById('red-sublist').hidden);await p.keyboard.press('Escape');
if(await p.locator('#red-aspect').isVisible()){await focus('red-aspect');await code(13);assert.equal(await p.evaluate(()=>document.getElementById('video').style.objectFit),'cover');}
await focus('stop');await code(13);await p.waitForFunction(()=>document.getElementById('player').hidden);assert.equal(await p.locator('#series-detail').isVisible(),true);
console.log('NATIVE_TRACKS_MOCK_PASS',tag);await c.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
