const {webkit,chromium}=require('/home/kit/tvp-valet/node_modules/playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
let checks=0;function check(a,b){assert.deepEqual(a,b);checks++;}
const root=path.resolve(__dirname,'../app'),art=path.resolve(__dirname,'../artifacts');
const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://x').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+'/'))return res.end();fs.readFile(file,(e,data)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'text/html');res.end(e?'':data);});}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
const results=[];
for(const engine of [webkit]){
let countBefore=checks;
const browser=await engine.launch(Object.assign({headless:true},engine.name()==='chromium'?{executablePath:'/opt/hako/bin/google-chrome',args:['--no-sandbox']}:{})),page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));let panelStatus='active',p={id:'test1',type:'xtream',server:'https://provider.example',name:'المزوّد التجريبي',username:'mock-user',password:'mock-pass'},playlists=[p];
await page.addInitScript(()=>{window.APForceTouch=true;window.__media=[];HTMLMediaElement.prototype.load=function(){window.__media.push({op:'load',id:this.id,src:this.querySelector('source')?.src});};HTMLMediaElement.prototype.play=function(){window.__media.push({op:'play',id:this.id});return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){window.__media.push({op:'pause',id:this.id});};});
await page.route('https://jytjcdlmygwqizgydeyp.supabase.co/**',async r=>{calls.push({path:new URL(r.request().url()).pathname,body:r.request().postDataJSON()});await r.fulfill({json:r.request().url().includes('register_device')?{status:'registered'}:{status:panelStatus,expires_at:'2028-01-01',playlists}});});
const svg=(shape)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+(shape==='backdrop'?1200:240)+'" height="'+(shape==='backdrop'?500:360)+'"><rect width="100%" height="100%" fill="#27374e"/><rect x="20" y="20" width="80%" height="85%" rx="12" fill="#344862"/><text x="50%" y="48%" text-anchor="middle" fill="#bdc8d8" font-size="30">TEST '+(shape==='backdrop'?'BACKDROP':'POSTER')+'</text><text x="50%" y="60%" text-anchor="middle" fill="#879bb8" font-size="18">PROVIDER FIXTURE</text></svg>';
await page.route('https://images.example/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg(r.request().url().includes('backdrop')?'backdrop':'poster')}));
await page.route('https://provider.example/**',async r=>{const a=new URL(r.request().url()).searchParams.get('action');let data=[];
if(a&&a.endsWith('_categories'))data=[{category_id:'1',category_name:'أخبار'},{category_id:'2',category_name:'ترفيه'},{category_id:'3',category_name:'وثائقي'},{category_id:'4',category_name:'رياضة'}];
else if(a==='get_live_streams')data=Array.from({length:1000},(_,i)=>({quality:i%2?'4K':'HD',stream_id:i+1,name:['القناة الأولى','قناة الأخبار','قناة الثقافة','القناة الرياضية'][i%4]+' '+(i+1),category_id:'1',stream_icon:'https://images.example/logo.svg',program_name:i===0?'عنوان برنامج من المزوّد':undefined}));
else if(a==='get_vod_streams')data=Array.from({length:80},(_,i)=>({stream_id:2001+i,name:'فيلم تجريبي '+(i+1),category_id:'1',stream_icon:'https://images.example/poster.svg',backdrop_path:['https://images.example/backdrop.svg'],added:String(10000-i),plot:'وصف تجريبي يقدّمه مزوّد المحتوى لاختبار عرض التفاصيل.',genre:'دراما',rating:'8.2',year:'2025',quality:'HD',container_extension:'mp4'}));
else if(a==='get_series')data=Array.from({length:36},(_,i)=>({series_id:3001+i,name:'مسلسل تجريبي '+(i+1),category_id:String(i%4+1),cover:'https://images.example/poster.svg',seasons_count:3,last_modified:String(9000-i),rating:'7.8',year:'2024',backdrop_path:['https://images.example/backdrop.svg']}));
else if(a==='get_series_info')data={info:{plot:'ملخص تجريبي من المزوّد عن أحداث المسلسل.',genre:'دراما',status:'مستمر'},episodes:{'1':[{id:4001,episode_num:1,title:'الحلقة الأولى',info:{plot:'وصف الحلقة الأولى كما يقدّمه المزوّد.',duration:'00:43:20',releasedate:'2025-04-10'},container_extension:'mp4'},{id:4002,title:'الحلقة الثانية',container_extension:'mp4'}],'2':[{id:4003,title:'بداية جديدة',container_extension:'mp4'}]}};
await r.fulfill({json:data});});

await page.goto('http://127.0.0.1:'+server.address().port);
await page.waitForFunction(()=>document.querySelector('#count').textContent.includes('قناة')&&document.querySelector('#activation').textContent.includes('تم التفعيل'));
await page.waitForTimeout(1000);
check(await page.evaluate(()=>window.APTouch),true);

for(const size of [{width:844,height:390},{width:932,height:430}]){
await page.setViewportSize(size);
for(const theme of ['apple','navy','red','blue','aya','alaa','harak','muse','velour']){
const shot=async(name)=>{await page.waitForTimeout(120);await page.screenshot({path:'/home/kit/ipa_'+theme+'_'+size.width+'_'+name+'.jpg',type:'jpeg',quality:85});};
await page.locator('#touch-menu').tap();await page.locator('#settings-open').tap();await page.locator('#theme-'+theme).tap();await page.locator('#connection-close').tap();
await page.locator('#touch-menu').tap();await page.locator('#nav-home').tap();
await page.locator('#home').evaluate(e=>e.scrollTop=0);await shot('home');
await page.locator('#home-shelves').scrollIntoViewIfNeeded();await shot('shelves');
await page.locator('#touch-menu').tap();await page.locator('nav [data-kind="live"]').tap();await page.waitForTimeout(200);
await shot('live');
await page.locator('#items button').first().tap();await shot('live-player');
const liveGeometry=await page.evaluate(()=>{const box=id=>document.getElementById(id)?.getBoundingClientRect().toJSON();return {bar:box('live-now'),logo:document.querySelector('.live-brand')?.getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('#live-now .live-transport button')].map(e=>e.getBoundingClientRect().toJSON()),ui:getComputedStyle(document.querySelector('#player-ui')).display};});
check(liveGeometry.buttons.every(b=>Math.abs(b.width-b.height)<1&&b.width>=36&&b.height>=36),true);
check(liveGeometry.logo.width<=48,true);check(liveGeometry.ui,'none');
await page.locator('#live-list').tap();await shot('live-overlay');
check(await page.locator('#quick-list button').first().evaluate(e=>e.getBoundingClientRect().height<=48),true);
await page.locator('#touch-back').tap();await page.locator('#touch-back').tap();
const indices=await page.locator('#items button').evaluateAll(es=>es.map(e=>+e.dataset.index));
check(await page.locator('#items .item-name').allTextContents().then(ns=>ns.every((n,i)=>n.endsWith(' '+(indices[i]+1)))),true);
check(indices.every((v,i)=>!i||v===indices[i-1]+1),true);
const rects=await page.locator('#items button').evaluateAll(es=>es.slice(0,8).map(e=>({y:e.getBoundingClientRect().y,h:e.getBoundingClientRect().height})));
check(rects.every((r,i)=>!i||r.y>=rects[i-1].y+rects[i-1].h),true);
await page.locator('#items').evaluate(e=>e.scrollTop=6800);await page.waitForTimeout(200);await shot('live-scrolled');
await page.locator('#touch-menu').tap();await page.locator('nav [data-kind="movies"]').tap();await page.waitForTimeout(200);await shot('movies');
await page.locator('#items button').first().tap();await shot('movie-detail');
check(await page.locator('#movie-description').evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);
await page.locator('#movie-play').tap();await shot('player');
check(await page.locator('#player-ui .actions').evaluate(e=>e.getBoundingClientRect().height<=50),true);
check(await page.locator('#player-ui').evaluate(e=>e.getBoundingClientRect().height<=210),true);check(await page.locator('#live-now').isVisible(),false);await page.locator('#touch-back').tap();await page.locator('#touch-back').tap();
await page.locator('#touch-menu').tap();await page.locator('nav [data-kind="series"]').tap();await page.waitForTimeout(200);await shot('series');
await page.locator('#items button').first().tap();await page.waitForTimeout(200);await shot('series-detail');
await page.locator('#episode-list button').first().tap();await shot('episode-player');check(await page.locator('body').evaluate(e=>e.classList.contains('episode-fullscreen')),true);await page.locator('#touch-back').tap();
await page.locator('#touch-back').tap();
await page.locator('#touch-menu').tap();await page.locator('#settings-open').tap();await shot('settings');
await page.locator('#connection-close').tap();
}
}
await page.locator('#touch-menu').tap();await page.locator('nav [data-kind="movies"]').tap();await page.locator('#items button').first().tap();await page.locator('#movie-play').tap();
await page.evaluate(()=>{window.__nativeCommands=[];window.webkit={messageHandlers:{nativePlayer:{postMessage:function(o){window.__nativeCommands.push(o);return Promise.resolve({ok:true});}}}};});
await page.evaluate(fs.readFileSync(path.resolve(__dirname,'../ios/native-player.js'),'utf8'));
await page.evaluate(()=>{var p=document.getElementById('player'),v=document.getElementById('video');p.dataset.playbackKind='vod';v.src='https://provider.example/movie/test.mkv';v.load();v.play();window.APNativeMediaUpdate({id:1,time:3,duration:120,width:1920,height:1080,state:'playing'});});
check(await page.evaluate(()=>document.querySelector('#video').currentTime),3);
check(await page.evaluate(()=>document.querySelector('#video').readyState),4);
check(await page.evaluate(()=>document.body.classList.contains('native-media')),true);
await page.evaluate(()=>{var v=document.getElementById('video');v.currentTime=35;v.playbackRate=1.5;v.pause();v.removeAttribute('src');v.replaceChildren();v.load();});
check(await page.evaluate(()=>document.body.classList.contains('native-media')),false);
check(await page.evaluate(()=>window.__nativeCommands.map(x=>x.command)),['open','play','seek','rate','pause','stop']);
check(errors,[]);console.log(JSON.stringify({checks,errors}));await browser.close();}server.close();
})().catch(e=>{console.error(e);process.exit(1)});
