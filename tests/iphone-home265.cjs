const {webkit,chromium}=require('/home/kit/tvp-valet/node_modules/playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
let checks=0;function check(a,b){assert.deepEqual(a,b);checks++;}
const root=process.env.ROOT||'/home/kit/player-ipa/app',art='/home/kit/player-ipa/artifacts';
const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://x').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+'/'))return res.end();fs.readFile(file,(e,data)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'text/html');res.end(e?'':data);});}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
const results=[];
for(const engine of [webkit]){
let countBefore=checks;
const browser=await engine.launch(Object.assign({headless:true},engine.name()==='chromium'?{executablePath:'/opt/hako/bin/google-chrome',args:['--no-sandbox']}:{})),page=await browser.newPage({viewport:{width:932,height:430},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));let panelStatus='active',p={id:'test1',type:'xtream',server:'https://provider.example',name:'المزوّد التجريبي',username:'mock-user',password:'mock-pass'},playlists=[p];
await page.addInitScript(()=>{window.APForceTouch=true;window.__media=[];HTMLMediaElement.prototype.load=function(){window.__media.push({op:'load',id:this.id,src:this.querySelector('source')?.src});};HTMLMediaElement.prototype.play=function(){window.__media.push({op:'play',id:this.id});return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){window.__media.push({op:'pause',id:this.id});};});
await page.route('https://jytjcdlmygwqizgydeyp.supabase.co/**',async r=>{calls.push({path:new URL(r.request().url()).pathname,body:r.request().postDataJSON()});await r.fulfill({json:r.request().url().includes('register_device')?{status:'registered'}:{status:panelStatus,expires_at:'2028-01-01',playlists}});});
const svg=(shape)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+(shape==='backdrop'?1200:240)+'" height="'+(shape==='backdrop'?500:360)+'"><rect width="100%" height="100%" fill="#27374e"/><rect x="20" y="20" width="80%" height="85%" rx="12" fill="#344862"/><text x="50%" y="48%" text-anchor="middle" fill="#bdc8d8" font-size="30">TEST '+(shape==='backdrop'?'BACKDROP':'POSTER')+'</text><text x="50%" y="60%" text-anchor="middle" fill="#879bb8" font-size="18">PROVIDER FIXTURE</text></svg>';
await page.route('https://images.example/**',r=>r.fulfill({contentType:'image/jpeg',body:fs.readFileSync('/tmp/ipa261-art/'+(r.request().url().includes('backdrop')?'backdrop.jpg':'poster'+(Number(new URL(r.request().url()).searchParams.get('n'))||0)+'.jpg'))}));
await page.route('https://provider.example/**',async r=>{const a=new URL(r.request().url()).searchParams.get('action');let data=[];
if(a&&a.endsWith('_categories'))data=[{category_id:'1',category_name:'أخبار'},{category_id:'2',category_name:'ترفيه'},{category_id:'3',category_name:'وثائقي'},{category_id:'4',category_name:'رياضة'}];
else if(a==='get_live_streams')data=Array.from({length:1000},(_,i)=>({quality:i%2?'4K':'HD',stream_id:i+1,name:['القناة الأولى','قناة الأخبار','قناة الثقافة','القناة الرياضية'][i%4]+' '+(i+1),category_id:'1',stream_icon:'https://images.example/logo.svg',program_name:i===0?'عنوان برنامج من المزوّد':undefined}));
else if(a==='get_vod_streams'&&new URL(r.request().url()).searchParams.get('category_id')==='4')data={};
else if(a==='get_vod_streams')data=Array.from({length:80},(_,i)=>({stream_id:2001+i,name:'فيلم تجريبي '+(i+1),category_id:'1',stream_icon:'https://images.example/poster.svg',backdrop_path:['https://images.example/backdrop.svg'],added:String(10000-i),plot:'وصف تجريبي يقدّمه مزوّد المحتوى لاختبار عرض التفاصيل.',genre:'دراما',rating:'8.2',year:'2025',quality:'HD',container_extension:'mp4'}));
else if(a==='get_series')data=Array.from({length:36},(_,i)=>({series_id:3001+i,name:'مسلسل تجريبي '+(i+1),category_id:String(i%4+1),cover:'https://images.example/poster.svg',seasons_count:3,last_modified:String(9000-i),rating:'7.8',year:'2024',backdrop_path:['https://images.example/backdrop.svg']}));
else if(a==='get_series_info')data={info:{plot:'ملخص تجريبي من المزوّد عن أحداث المسلسل.',genre:'دراما',status:'مستمر'},episodes:{'1':[{id:4001,episode_num:1,title:'الحلقة الأولى',info:{plot:'وصف الحلقة الأولى كما يقدّمه المزوّد.',duration:'00:43:20',releasedate:'2025-04-10'},container_extension:'mp4'},{id:4002,title:'الحلقة الثانية',container_extension:'mp4'}],'2':[{id:4003,title:'بداية جديدة',container_extension:'mp4'}]}};
await r.fulfill({json:data});});

await page.goto('http://127.0.0.1:'+server.address().port);
await page.waitForFunction(()=>document.querySelector('#count').textContent.includes('قناة')&&document.querySelector('#activation').textContent.includes('تم التفعيل'));
await page.waitForTimeout(1000);
check(await page.evaluate(()=>window.APTouch),true);


await page.evaluate(()=>{localStorage.setItem('ap-continue',JSON.stringify(['Dune','The Martian','Stranger Things','The Witcher','Inception','Interstellar'].map((name,i)=>({key:'movie-'+(2001+i),provider:'test1',id:2001+i,kind:'movies',name,logo:'https://images.example/poster.svg?n='+i%5,time:1300+i*200,duration:5400}))));});
await page.reload();await page.waitForFunction(()=>document.querySelector('#count').textContent.includes('قناة'));await page.waitForTimeout(1500);
for(const width of [932]){
await page.setViewportSize({width,height:width===932?430:390});
for(const theme of ['velour','apple','navy','red','blue','aya','alaa','harak','muse']){
await page.locator('#phone-home-rail button').last().tap();await page.locator('#theme-'+theme).tap();await page.locator('#connection-close').tap();await page.evaluate(()=>document.getElementById('nav-home').click());await page.waitForTimeout(180);

await page.screenshot({path:'/home/kit/ipa265_'+theme+'_'+width+'.jpg',quality:90});
const g=await page.evaluate(()=>{const home=document.getElementById('home'), hero=document.getElementById('home-hero'),cont=document.getElementById('f21-continue'),box=e=>e.getBoundingClientRect();return {noScroll:home.scrollHeight<=home.clientHeight&&home.scrollWidth<=home.clientWidth,inside:[hero,cont,...document.querySelectorAll('#phone-home-rail button')].every(e=>{let b=box(e);return b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth;}),cards:document.querySelectorAll('.continue-art').length,rail:document.querySelectorAll('#phone-home-rail button').length};});check(g.noScroll,true);check(g.inside,true);check(g.cards,6);check(g.rail,7);
}
}

for(const theme of ['velour','apple','navy','red','blue','aya','alaa','harak','muse']){
await page.evaluate(()=>document.getElementById('nav-home').click());
await page.locator('#phone-home-rail button').last().tap();await page.locator('#theme-'+theme).tap();await page.locator('#connection-close').tap();await page.evaluate(()=>document.getElementById('nav-home').click());
await page.locator('#phone-home-rail button').nth(1).tap();
await page.screenshot({path:'/home/kit/ipa265_live_list_'+theme+'.jpg',quality:90});
await page.locator('#items button').first().tap();
await page.waitForTimeout(300);
if(await page.locator('#live-quality').count()){
await page.locator('#live-quality').tap();
await page.screenshot({path:'/home/kit/ipa265_quality_'+theme+'.jpg',quality:90});
await page.locator('#player').tap({position:{x:410,y:30}});
check(await page.locator('#live-panel').count(),0);
}
await page.locator('#video').tap({position:{x:410,y:30}});

await page.screenshot({path:'/home/kit/ipa265_player_live_'+theme+'.jpg',quality:90});
const playerGeometry=await page.evaluate(()=>{let r=document.getElementById('player').getBoundingClientRect();return {w:r.width,h:r.height,menu:getComputedStyle(document.getElementById('touch-menu')).display};});check(playerGeometry,{w:932,h:430,menu:'none'});
await page.waitForTimeout(theme==='velour'?4300:0);
await page.screenshot({path:'/home/kit/ipa265_player_live_hidden_'+theme+'.jpg',quality:90});
if(theme==='velour')check(await page.locator('#live-now').getAttribute('hidden'),'');
await page.evaluate(()=>document.getElementById('stop').click());
await page.evaluate(()=>document.getElementById('nav-home').click());
await page.locator('#phone-home-rail button').nth(2).tap();
check(await page.locator('#items').evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);
await page.screenshot({path:'/home/kit/ipa265_movies_'+theme+'.jpg',quality:90});
await page.locator('#items button').first().tap();await page.waitForTimeout(100);
if(await page.locator('#movie-detail').isHidden())await page.locator('#items button').first().evaluate(e=>e.click());
await page.screenshot({path:'/home/kit/ipa265_movie_detail_'+theme+'.jpg',quality:90});

await page.locator('#movie-play').tap();
await page.waitForTimeout(250);
check(await page.locator('#player-ui .actions button:visible').count(),7);
await page.evaluate(()=>{let v=document.getElementById('video');Object.defineProperty(v,'paused',{configurable:true,get:()=>false});Object.defineProperty(v,'duration',{configurable:true,get:()=>7175});Object.defineProperty(v,'currentTime',{configurable:true,get:()=>1574});v.dispatchEvent(new Event('play'));v.dispatchEvent(new Event('timeupdate'));});
await page.screenshot({path:'/home/kit/ipa265_player_vod_'+theme+'.jpg',quality:90});
await page.waitForTimeout(4300);
check(await page.locator('#player-ui').evaluate(e=>e.classList.contains('dim')),true);
await page.screenshot({path:'/home/kit/ipa265_player_vod_hidden_'+theme+'.jpg',quality:90});
await page.evaluate(()=>document.getElementById('stop').click());
await page.evaluate(()=>document.getElementById('nav-home').click());
await page.locator('#phone-home-rail button').nth(3).tap();
await page.screenshot({path:'/home/kit/ipa265_series_'+theme+'.jpg',quality:90});
await page.locator('#items button').first().tap();await page.waitForTimeout(150);
if(await page.locator('#series-detail').isHidden())await page.locator('#items button').first().evaluate(e=>e.click());
await page.screenshot({path:'/home/kit/ipa265_series_detail_'+theme+'.jpg',quality:90});
await page.locator('#series-start').tap();await page.waitForTimeout(200);
await page.screenshot({path:'/home/kit/ipa265_series_player_'+theme+'.jpg',quality:90});
check(await page.locator('#series-detail').evaluate(e=>getComputedStyle(e).visibility),'hidden');
await page.evaluate(()=>document.getElementById('stop').click());
}
check(errors,[]);console.log(JSON.stringify({checks,errors}));await browser.close();}server.close();
})().catch(e=>{console.error(e);process.exit(1)});
