if(!process.env.CHROMIUM_87)throw Error('Set CHROMIUM_87 to a real Chromium 87 executable');
const {chromium}=require(process.env.PLAYWRIGHT_87 || '/home/kit/tvp-valet/node_modules/playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
let checks=0;function check(a,b){assert.deepEqual(a,b);checks++;}
const root=path.resolve(__dirname,process.env.APP_ROOT||'../dist'),art=path.resolve(__dirname,'../artifacts');
let page;
async function waitFor(fn){const until=Date.now()+30000;while(Date.now()<until){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+fn);}
for(const engine of [chromium]){

const browser=await engine.launch(Object.assign({headless:true},engine.name()==='chromium'?{executablePath:process.env.CHROMIUM_87,args:['--no-sandbox']}:{})),testPage=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],calls=[];testPage.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page=testPage;let failMovies=false;let panelStatus='active',p={id:'test1',type:'xtream',server:'https://provider.example',name:'المزوّد التجريبي',username:'mock-user',password:'mock-pass'},playlists=[p];
await page.addInitScript(()=>{window.__media=[];HTMLMediaElement.prototype.load=function(){window.__media.push({op:'load',id:this.id,src:this.querySelector('source')?.src});};HTMLMediaElement.prototype.play=function(){window.__media.push({op:'play',id:this.id});return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){window.__media.push({op:'pause',id:this.id});};});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'apikey, authorization, content-type'};
await page.route('https://jytjcdlmygwqizgydeyp.supabase.co/**',async r=>{if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:cors,body:''});calls.push({path:new URL(r.request().url()).pathname,body:r.request().postDataJSON()});await r.fulfill({headers:cors,json:r.request().url().includes('register_device')?{}:{status:panelStatus,expires_at:'2028-01-01',playlists}});});
const svg=(shape)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+(shape==='backdrop'?1200:240)+'" height="'+(shape==='backdrop'?500:360)+'"><rect width="100%" height="100%" fill="#27374e"/><rect x="20" y="20" width="80%" height="85%" rx="12" fill="#344862"/><text x="50%" y="48%" text-anchor="middle" fill="#bdc8d8" font-size="30">TEST '+(shape==='backdrop'?'BACKDROP':'POSTER')+'</text><text x="50%" y="60%" text-anchor="middle" fill="#879bb8" font-size="18">PROVIDER FIXTURE</text></svg>';
await page.route('**://images.example/**',r=>r.request().url().includes('broken.svg')?r.fulfill({status:404,body:''}):r.fulfill({headers:cors,contentType:'image/svg+xml',body:svg(r.request().url().includes('backdrop')?'backdrop':'poster')}));
await page.route('https://provider.example/**',async r=>{const a=new URL(r.request().url()).searchParams.get('action');if(a==='get_vod_streams'&&failMovies)return r.fulfill({status:403,headers:cors,body:'blocked'});if(a==='get_vod_categories')return r.fulfill({status:500,headers:cors,body:'category service unavailable'});let data=[];
if(a&&a.endsWith('_categories'))data=[{category_id:'1',category_name:'أخبار'},{category_id:'2',category_name:'ترفيه'},{category_id:'3',category_name:'وثائقي'},{category_id:'4',category_name:'رياضة'}];
else if(a==='get_live_streams')data=Array.from({length:1424},(_,i)=>({quality:i%2?'4K':'HD',stream_id:i+1,name:['القناة الأولى','قناة الأخبار','قناة الثقافة','القناة الرياضية'][i%4]+' '+(i+1),category_id:String(i%4+1),stream_icon:i===120?'http://images.example/logo.svg':i===124?'http://images.example/broken.svg':'https://images.example/logo.svg',program_name:i===0?'عنوان برنامج من المزوّد':undefined}));
else if(a==='get_vod_streams')data=Array.from({length:80},(_,i)=>({stream_id:2001+i,name:'فيلم تجريبي '+(i+1),category_id:String(i%4+1),stream_icon:'https://images.example/poster.svg',backdrop_path:['https://images.example/backdrop.svg'],added:String(10000-i),plot:'وصف تجريبي يقدّمه مزوّد المحتوى لاختبار عرض التفاصيل.',genre:'دراما',rating:'8.2',year:'2025',quality:'HD',container_extension:'mp4'}));
else if(a==='get_series')data=Array.from({length:36},(_,i)=>({series_id:3001+i,name:'مسلسل تجريبي '+(i+1),category_id:String(i%4+1),cover:'https://images.example/poster.svg',seasons_count:3,last_modified:String(9000-i),rating:'7.8',year:'2024',backdrop_path:['https://images.example/backdrop.svg']}));
else if(a==='get_series_info')data={info:{plot:'ملخص تجريبي من المزوّد عن أحداث المسلسل.',genre:'دراما',status:'مستمر'},episodes:{'1':[{id:4001,episode_num:1,title:'الحلقة الأولى',info:{plot:'وصف الحلقة الأولى كما يقدّمه المزوّد.',duration:'00:43:20',releasedate:'2025-04-10'},container_extension:'mp4'},{id:4002,title:'الحلقة الثانية',container_extension:'mp4'}],'2':[{id:4003,title:'بداية جديدة',container_extension:'mp4'}]}};
await r.fulfill({headers:cors,json:data});});
await page.goto(require('url').pathToFileURL(path.join(root,'index.html')).href);check(await page.evaluate(()=>navigator.userAgent.includes('Chrome/87.')),true);await waitFor(()=>document.querySelector('#count').textContent==='1424 قناة');await page.waitForTimeout(100);check(await page.evaluate(()=>getComputedStyle(document.querySelector('#screen')).width),'1920px');check(await page.evaluate(()=>getComputedStyle(document.querySelector('nav')).left),'0px');


await waitFor(()=>document.querySelector('#connection').hidden);
const auditDir=art+'/audit125';fs.mkdirSync(auditDir,{recursive:true});
async function press(key,n=1){for(let i=0;i<n;i++){await page.keyboard.press(key);await page.waitForTimeout(60);}}
async function shot(name){await page.screenshot({path:auditDir+'/'+name+'.png'});check(await page.evaluate(()=>{var e=document.activeElement,r=e.getBoundingClientRect();return e.tagName!=='BODY'&&r.width>0&&r.height>0;}),true);}
async function home(){for(let i=0;i<8;i++){if(await page.evaluate(()=>!document.querySelector('#home').hidden&&document.querySelector('#connection').hidden&&document.querySelector('#player').hidden))break;await press('Escape');}await press('ArrowLeft');}
async function nav(n){await home();await press('ArrowUp',8);await press('ArrowDown',n);await press('Enter');await page.waitForTimeout(350);}
await shot('home-focus');
await nav(1);await shot('live-focus');
await press('ArrowRight');await shot('live-preview-focus');await press('Enter');await shot('player');
await press('Enter');await shot('player-channel-overlay');await press('Escape');await press('Escape');
await nav(2);await shot('movies-focus');await press('Enter');check(await page.evaluate(()=>document.querySelector('#movie-detail').hidden),false);await shot('movie-detail-focus');
await nav(3);await shot('series-focus');await press('Enter');check(await page.evaluate(()=>document.querySelector('#series-detail').hidden),false);await shot('series-detail-focus');
await nav(4);await shot('favorites-empty-focus');
await nav(5);await shot('recent-focus');
await nav(6);await shot('search-focus');await page.keyboard.type('zzzz-no-match');await shot('search-empty');
await nav(7);await shot('settings-activation-focus');await press('ArrowDown');await shot('settings-next-focus');await press('Escape');
check(errors,[]);
fs.writeFileSync(auditDir+'/result.json',JSON.stringify({checks,engine:await browser.version(),input:'keyboard only after launch',errors},null,2));
await browser.close();
}
console.log(checks+' audit checks PASS');
})().catch(e=>{console.error(e);process.exit(1);});
