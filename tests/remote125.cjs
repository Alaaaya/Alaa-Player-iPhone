if(!process.env.CHROMIUM_87)throw Error('Set CHROMIUM_87 to a real Chromium 87 executable');
const {chromium}=require(process.env.PLAYWRIGHT_87 || '/home/kit/tvp-valet/node_modules/playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
let checks=0;function check(a,b){assert.deepEqual(a,b);checks++;}
const root=path.resolve(__dirname,process.env.APP_ROOT||'../dist'),art=path.resolve(__dirname,'../artifacts');
let page;
async function waitFor(fn){const until=Date.now()+30000;while(Date.now()<until){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+fn);}
for(const engine of [chromium]){

const browser=await engine.launch(Object.assign({headless:true},engine.name()==='chromium'?{executablePath:process.env.CHROMIUM_87,args:['--no-sandbox']}:{})),testPage=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],calls=[];testPage.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page=testPage;let failMovies=true;let panelStatus='active',p={id:'test1',type:'xtream',server:'https://provider.example',name:'المزوّد التجريبي',username:'mock-user',password:'mock-pass'},playlists=[p];
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

await waitFor(()=>document.querySelectorAll('#home-series button').length===5);
await waitFor(()=>!!document.querySelector('#home-movies .catalog-retry'));
check(await page.evaluate(()=>document.querySelector('#home-tiles button:nth-child(2) small').textContent),'تعذّر التحميل');
check(await page.evaluate(()=>document.querySelector('#home-movies .note').textContent.includes('تعذّر')),true);
await page.screenshot({path:art+'/vod-error-1.2.5.png'});
failMovies=false;await page.locator('#home-movies .catalog-retry').click();
await waitFor(()=>document.querySelectorAll('#home-movies button').length===6);

await page.locator('#settings-open').click();await page.locator('#theme-red').click();await page.locator('#connection-close').click();await page.locator('#nav-home').click();

async function remote(code){await page.evaluate(code=>{document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Unidentified',keyCode:code,which:code}));document.activeElement.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'Unidentified',keyCode:code,which:code}));},code);await page.waitForTimeout(100);}
await page.locator('#nav-home').focus();
check(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
check(await page.evaluate(()=>getComputedStyle(document.querySelector('nav')).backgroundImage),'none');
await page.screenshot({path:art+'/focus-home-1.2.5.png'});
await remote(40);check(await page.evaluate(()=>document.activeElement.dataset.kind),'live');
await page.screenshot({path:art+'/focus-live-sidebar-1.2.5.png'});
await remote(13);check(await page.evaluate(()=>document.querySelector('#home').hidden),true);
check(await page.evaluate(()=>document.querySelector('#items').contains(document.activeElement)),true);
await remote(37);check(await page.evaluate(()=>document.querySelector('#subcategories').contains(document.activeElement)),true);
await remote(37);check(await page.evaluate(()=>document.querySelector('#categories').contains(document.activeElement)),true);
await remote(40);await remote(13);
check(await page.evaluate(()=>document.querySelector('#categories').contains(document.activeElement)),true);
await remote(37);check(await page.evaluate(()=>document.activeElement.dataset.kind),'live');
await remote(39);check(await page.evaluate(()=>document.querySelector('#categories').contains(document.activeElement)),true);
await remote(39);await remote(39);
check(await page.evaluate(()=>document.querySelector('#items').contains(document.activeElement)),true);
for(let i=0;i<30;i++)await remote(40);
check(await page.evaluate(()=>Number(document.activeElement.dataset.index)>=30),true);

check(await page.evaluate(()=>getComputedStyle(document.querySelector('#pagination')).display),'none');
check(await page.evaluate(()=>document.querySelector('#count').textContent.includes('356')),true);
await page.evaluate(async()=>{for(let i=0;i<356;i++){document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,keyCode:40,key:'Unidentified'}));await new Promise(r=>requestAnimationFrame(r));}});
check(await page.evaluate(()=>Number(document.activeElement.dataset.index)),30);
check(await page.evaluate(()=>document.querySelectorAll('#items button').length<=24),true);
check(await page.evaluate(()=>{const row=document.activeElement.getBoundingClientRect(),box=document.querySelector('#items').getBoundingClientRect();return row.top>=box.top-1&&row.bottom<=box.bottom+1;}),true);
check(await page.evaluate(()=>{const row=document.activeElement,img=row.querySelector('img'),name=row.querySelector('.item-name');return img.complete&&img.naturalWidth>0&&img.referrerPolicy==='no-referrer'&&img.loading==='eager'&&img.getBoundingClientRect().left<name.getBoundingClientRect().left;}),true);
await remote(40);
check(await page.evaluate(()=>{var el=document.activeElement.querySelector('.logo-initials');return el&&!el.hidden&&!!el.textContent;}),true);
await remote(38);
await page.screenshot({path:art+'/continuous-scroll-logos-1.2.5.png'});
await remote(39);check(await page.evaluate(()=>document.activeElement.id),'play-selected');
await remote(40);check(await page.evaluate(()=>document.activeElement.id),'preview-selected');
await remote(13);check(await page.evaluate(()=>document.querySelector('#preview').hidden),false);
await page.screenshot({path:art+'/live-preview-focus-1.2.5.png'});
await remote(38);await remote(13);
check(await page.evaluate(()=>document.querySelector('#player').hidden),false);
const beforeZap=await page.locator('#playing-name').textContent();
await remote(40);check(await page.locator('#playing-name').textContent()!==beforeZap,true);
check(await page.evaluate(()=>document.querySelector('#player-ui').classList.contains('dim')),true);
check(await page.evaluate(()=>document.querySelector('#zap-banner').hidden),false);
await remote(38);check(await page.locator('#playing-name').textContent(),beforeZap);
for(const pair of [[33,34],[427,428]]){await remote(pair[0]);check(await page.locator('#playing-name').textContent()!==beforeZap,true);await remote(pair[1]);check(await page.locator('#playing-name').textContent(),beforeZap);}
await page.screenshot({path:art+'/zap-banner-1.2.5.png'});

await remote(13);
check(await page.evaluate(()=>document.querySelector('#quick-channels').hidden),false);
check(await page.evaluate(()=>document.activeElement.classList.contains('selected')),true);
check(await page.evaluate(()=>document.querySelector('#player-ui').classList.contains('dim')),true);
const qIndex=await page.evaluate(()=>Number(document.activeElement.dataset.quickIndex));
await page.evaluate(async()=>{for(let i=0;i<356;i++){document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,keyCode:40,key:'Unidentified'}));await new Promise(r=>requestAnimationFrame(r));}});
check(await page.evaluate(()=>Number(document.activeElement.dataset.quickIndex)),qIndex);
check(await page.evaluate(()=>document.querySelectorAll('#quick-list button').length<=24),true);
const selectedText=await page.evaluate(()=>document.activeElement.textContent);
await remote(40);check(await page.evaluate(()=>document.activeElement.textContent)!==selectedText,true);
check(await page.locator('#playing-name').textContent(),beforeZap);
await page.screenshot({path:art+'/channel-overlay-1.2.5.png'});
await remote(13);check(await page.evaluate(()=>document.querySelector('#quick-channels').hidden),true);
check(await page.locator('#playing-name').textContent()!==beforeZap,true);
await remote(13);check(await page.evaluate(()=>document.activeElement.classList.contains('selected')),true);
await remote(461);check(await page.evaluate(()=>document.querySelector('#quick-channels').hidden),true);
check(await page.evaluate(()=>document.querySelector('#player').hidden),false);
await remote(39);check(await page.evaluate(()=>document.querySelector('#player-ui').classList.contains('dim')),false);
const focused=await page.evaluate(()=>document.activeElement.id);await remote(39);
check(await page.evaluate(()=>document.activeElement.id)!==focused,true);
await page.screenshot({path:art+'/player-controls-1.2.5.png'});
await remote(461);check(await page.evaluate(()=>document.querySelector('#player').hidden),true);

check(await page.evaluate(()=>document.querySelector('#items').contains(document.activeElement)),true);
await remote(461);await remote(461);await remote(461);

await page.screenshot({path:art+'/focus-live-content-1.2.5.png'});
await remote(461);check(await page.evaluate(()=>document.querySelector('#home').hidden),false);
await page.locator('#nav-home').focus();await remote(40);await remote(40);await remote(13);
await waitFor(()=>document.querySelector('#count').textContent.includes('80'));
check(await page.evaluate(()=>document.querySelector('#items').contains(document.activeElement)),true);
await page.screenshot({path:art+'/focus-movies-content-1.2.5.png'});
await remote(461);
check(await page.evaluate(()=>document.querySelector('#home-movies').querySelectorAll('button').length),6);
check(await page.evaluate(()=>document.querySelector('#home-series').querySelectorAll('button').length),5);
check(await page.evaluate(()=>Array.from(document.querySelectorAll('#home-tiles button')).every(b=>b.querySelector('.tile-art').getBoundingClientRect().bottom<=b.querySelector('small').getBoundingClientRect().top)),true);

await page.locator('#nav-home').focus();await remote(40);await remote(40);await remote(40);await remote(13);
await waitFor(()=>document.querySelector('#count').textContent.includes('36'));
await remote(40);check(await page.evaluate(()=>document.querySelector('#items').contains(document.activeElement)),true);
await remote(13);check(await page.evaluate(()=>document.querySelector('#series-detail').hidden),false);
await page.screenshot({path:art+'/series-remote-1.2.5.png'});
await remote(461);await remote(461);
await page.locator('#settings-open').focus();await remote(13);
check(await page.evaluate(()=>document.querySelector('#connection').hidden),false);
await remote(40);await remote(38);await remote(461);
check(await page.evaluate(()=>document.querySelector('#connection').hidden),true);
check(await page.evaluate(()=>document.body.className.includes('apple')),false);
check(await page.evaluate(()=>document.querySelectorAll('#header-tools button svg').length),0);
await page.screenshot({path:art+'/home-categories-1.2.5.png'});
await page.screenshot({path:art+'/home-1.2.5-file87.png'});await page.locator('nav [data-kind="live"]').click();await page.waitForTimeout(200);await page.screenshot({path:art+'/live-1.2.5-file87.png'});

async function holdOK(locator){await locator.focus();await page.keyboard.down('Enter');await page.waitForTimeout(750);await page.keyboard.up('Enter');check(await page.locator('#organize-panel').isVisible(),true);check(await page.locator('#player').isVisible(),false);}
async function menuMove(){await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');check(await page.locator('#organize-panel').getAttribute('class'),'move-hint');}
const firstName=()=>page.locator('#items .item-name').first().textContent();
const first=await firstName();
await holdOK(page.locator('#items button').first());
await page.screenshot({path:art+'/live-menu-1.2.5-file87-'+engine.name()+'.png'});
await page.keyboard.press('Enter');
check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-favorites'))).length,1);
await page.locator('#categories button').filter({hasText:'المفضلة'}).click();check(await page.locator('#items button').count(),1);
await page.locator('#categories button').first().click();
await holdOK(page.locator('#items button').first());await menuMove();await page.keyboard.press('ArrowDown');
check(await firstName()===first,false);
await page.screenshot({path:art+'/live-move-1.2.5-file87-'+engine.name()+'.png'});
await page.keyboard.press('Escape');check(await firstName(),first);check(await page.evaluate(()=>localStorage.getItem('ap-live-order')),null);
await holdOK(page.locator('#items button').first());await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
await holdOK(page.locator('#items button').first());await menuMove();for(let j=0;j<30;j++)await page.keyboard.press('ArrowDown');check(await page.locator('.moving-item').getAttribute('data-index'),'30');await page.keyboard.press('Escape');
const newFirst=await firstName();check(newFirst===first,false);
await page.reload();await waitFor(()=>document.querySelector('#count').textContent==='1424 قناة');await page.locator('nav [data-kind="live"]').click();check(await firstName(),newFirst);
await holdOK(page.locator('#items button').nth(1));await page.keyboard.press('Enter');check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-favorites'))).length,0);
const cat=page.locator('#categories button').nth(1);const categoryName=(await cat.textContent());
await holdOK(cat);await page.keyboard.press('Enter');
check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-category-favorites'))).length,1);
await page.locator('#categories button').filter({hasText:'المفضلة'}).click();check(await page.locator('#count').textContent(),'356 قناة · المفضلة');
await page.locator('#categories button').first().click();
await holdOK(page.locator('#categories button').nth(1));await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');check(await page.locator('#categories button').nth(1).textContent(),categoryName);
await holdOK(page.locator('#categories button').nth(1));await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');check((await page.locator('#categories button').nth(2).textContent()),categoryName);
await page.reload();await waitFor(()=>document.querySelector('#count').textContent==='1424 قناة');await page.locator('nav [data-kind="live"]').click();check(await page.locator('#categories button').nth(2).textContent(),categoryName);
await holdOK(page.locator('#categories button').nth(2));await page.keyboard.press('Enter');check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-category-favorites'))).length,0);
await page.locator('#items button').first().focus();await page.keyboard.press('Enter');check(await page.locator('#player').isVisible(),true);await page.locator('#stop').click();
check(errors,[]);await browser.close();
}
console.log(checks+' Chrome 87 file-origin organization and styling assertions PASS');
})().catch(e=>{console.error(e);process.exit(1);});
