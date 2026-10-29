if(!process.env.CHROMIUM_87)throw Error('Set CHROMIUM_87 to a real Chromium 87 executable');
const {chromium}=require(process.env.PLAYWRIGHT_87 || '/home/kit/tvp-valet/node_modules/playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
let checks=0;function check(a,b){assert.deepEqual(a,b);checks++;}
const root=path.resolve(__dirname,process.env.APP_ROOT||'../dist'),art=path.resolve(__dirname,'../artifacts');
let page;
async function waitFor(fn){const until=Date.now()+30000;while(Date.now()<until){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+fn);}
for(const engine of [chromium]){

const browser=await engine.launch(Object.assign({headless:true},engine.name()==='chromium'?{executablePath:process.env.CHROMIUM_87,args:['--no-sandbox']}:{})),testPage=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],calls=[];testPage.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page=testPage;let panelStatus='active',p={id:'test1',type:'xtream',server:'https://provider.example',name:'المزوّد التجريبي',username:'mock-user',password:'mock-pass'},playlists=[p];
await page.addInitScript(()=>{window.__media=[];HTMLMediaElement.prototype.load=function(){window.__media.push({op:'load',id:this.id,src:this.querySelector('source')?.src});};HTMLMediaElement.prototype.play=function(){window.__media.push({op:'play',id:this.id});return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){window.__media.push({op:'pause',id:this.id});};});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'apikey, authorization, content-type'};
await page.route('https://jytjcdlmygwqizgydeyp.supabase.co/**',async r=>{if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:cors,body:''});calls.push({path:new URL(r.request().url()).pathname,body:r.request().postDataJSON()});await r.fulfill({headers:cors,json:r.request().url().includes('register_device')?{}:{status:panelStatus,expires_at:'2028-01-01',playlists}});});
const svg=(shape)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+(shape==='backdrop'?1200:240)+'" height="'+(shape==='backdrop'?500:360)+'"><rect width="100%" height="100%" fill="#27374e"/><rect x="20" y="20" width="80%" height="85%" rx="12" fill="#344862"/><text x="50%" y="48%" text-anchor="middle" fill="#bdc8d8" font-size="30">TEST '+(shape==='backdrop'?'BACKDROP':'POSTER')+'</text><text x="50%" y="60%" text-anchor="middle" fill="#879bb8" font-size="18">PROVIDER FIXTURE</text></svg>';
await page.route('https://images.example/**',r=>r.fulfill({headers:cors,contentType:'image/svg+xml',body:svg(r.request().url().includes('backdrop')?'backdrop':'poster')}));
await page.route('https://provider.example/**',async r=>{const a=new URL(r.request().url()).searchParams.get('action');let data=[];
if(a&&a.endsWith('_categories'))data=[{category_id:'1',category_name:'أخبار'},{category_id:'2',category_name:'ترفيه'},{category_id:'3',category_name:'وثائقي'},{category_id:'4',category_name:'رياضة'}];
else if(a==='get_live_streams')data=Array.from({length:1000},(_,i)=>({quality:i%2?'4K':'HD',stream_id:i+1,name:['القناة الأولى','قناة الأخبار','قناة الثقافة','القناة الرياضية'][i%4]+' '+(i+1),category_id:String(i%4+1),stream_icon:'https://images.example/logo.svg',program_name:i===0?'عنوان برنامج من المزوّد':undefined}));
else if(a==='get_vod_streams')data=Array.from({length:80},(_,i)=>({stream_id:2001+i,name:'فيلم تجريبي '+(i+1),category_id:String(i%4+1),stream_icon:'https://images.example/poster.svg',backdrop_path:['https://images.example/backdrop.svg'],added:String(10000-i),plot:'وصف تجريبي يقدّمه مزوّد المحتوى لاختبار عرض التفاصيل.',genre:'دراما',rating:'8.2',year:'2025',quality:'HD',container_extension:'mp4'}));
else if(a==='get_series')data=Array.from({length:36},(_,i)=>({series_id:3001+i,name:'مسلسل تجريبي '+(i+1),category_id:String(i%4+1),cover:'https://images.example/poster.svg',seasons_count:3,last_modified:String(9000-i),rating:'7.8',year:'2024',backdrop_path:['https://images.example/backdrop.svg']}));
else if(a==='get_series_info')data={info:{plot:'ملخص تجريبي من المزوّد عن أحداث المسلسل.',genre:'دراما',status:'مستمر'},episodes:{'1':[{id:4001,episode_num:1,title:'الحلقة الأولى',info:{plot:'وصف الحلقة الأولى كما يقدّمه المزوّد.',duration:'00:43:20',releasedate:'2025-04-10'},container_extension:'mp4'},{id:4002,title:'الحلقة الثانية',container_extension:'mp4'}],'2':[{id:4003,title:'بداية جديدة',container_extension:'mp4'}]}};
await r.fulfill({headers:cors,json:data});});
await page.goto(require('url').pathToFileURL(path.join(root,'index.html')).href);check(await page.evaluate(()=>navigator.userAgent.includes('Chrome/87.')),true);await waitFor(()=>document.querySelector('#count').textContent.startsWith('250 قناة'));await page.waitForTimeout(100);check(await page.evaluate(()=>getComputedStyle(document.querySelector('#screen')).width),'1920px');check(await page.evaluate(()=>getComputedStyle(document.querySelector('nav')).left),'0px');

await waitFor(()=>document.querySelectorAll('#home-movies button').length===6);
await page.locator('#settings-open').click();await page.locator('#theme-red').click();await page.locator('#connection-close').click();await page.locator('#nav-home').click();
await page.screenshot({path:art+'/home-1.2.4-file87.png'});await page.locator('nav [data-kind="live"]').click();await page.waitForTimeout(200);await page.screenshot({path:art+'/live-1.2.4-file87.png'});

async function holdOK(locator){await locator.focus();await page.keyboard.down('Enter');await page.waitForTimeout(750);await page.keyboard.up('Enter');check(await page.locator('#organize-panel').isVisible(),true);check(await page.locator('#player').isVisible(),false);}
async function menuMove(){await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');check(await page.locator('#organize-panel').getAttribute('class'),'move-hint');}
const firstName=()=>page.locator('#items .item-name').first().textContent();
const first=await firstName();
await holdOK(page.locator('#items button').first());
await page.screenshot({path:art+'/live-menu-1.2.4-file87-'+engine.name()+'.png'});
await page.keyboard.press('Enter');
check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-favorites'))).length,1);
await page.locator('#categories button').filter({hasText:'المفضلة'}).click();check(await page.locator('#items button').count(),1);
await page.locator('#categories button').first().click();
await holdOK(page.locator('#items button').first());await menuMove();await page.keyboard.press('ArrowDown');
check(await firstName()===first,false);
await page.screenshot({path:art+'/live-move-1.2.4-file87-'+engine.name()+'.png'});
await page.keyboard.press('Escape');check(await firstName(),first);check(await page.evaluate(()=>localStorage.getItem('ap-live-order')),null);
await holdOK(page.locator('#items button').first());await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
await holdOK(page.locator('#items button').first());await menuMove();for(let j=0;j<30;j++)await page.keyboard.press('ArrowDown');check(await page.locator('.moving-item').getAttribute('data-index'),'30');await page.keyboard.press('Escape');
const newFirst=await firstName();check(newFirst===first,false);
await page.reload();await waitFor(()=>document.querySelector('#count').textContent.startsWith('250 قناة'));await page.locator('nav [data-kind="live"]').click();await page.locator('#categories button').first().click();await page.waitForTimeout(500);check(await firstName(),newFirst);
await holdOK(page.locator('#items button').nth(1));await page.keyboard.press('Enter');check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-favorites'))).length,0);
const cat=page.locator('#categories button').nth(1);const categoryName=(await cat.textContent());
await holdOK(cat);await page.keyboard.press('Enter');
check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-category-favorites'))).length,1);
await page.locator('#categories button').filter({hasText:'المفضلة'}).click();check(await page.locator('#count').textContent(),'250 قناة · المفضلة');
await page.locator('#categories button').first().click();
await holdOK(page.locator('#categories button').nth(1));await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');check(await page.locator('#categories button').nth(1).textContent(),categoryName);
await holdOK(page.locator('#categories button').nth(1));await menuMove();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');check((await page.locator('#categories button').nth(2).textContent()),categoryName);
await page.reload();await waitFor(()=>document.querySelector('#count').textContent.startsWith('250 قناة'));await page.locator('nav [data-kind="live"]').click();check(await page.locator('#categories button').nth(2).textContent(),categoryName);
await holdOK(page.locator('#categories button').nth(2));await page.keyboard.press('Enter');check(JSON.parse(await page.evaluate(()=>localStorage.getItem('ap-category-favorites'))).length,0);
await page.locator('#items button').first().focus();await page.keyboard.press('Enter');check(await page.locator('#player').isVisible(),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#player').hidden);
check(errors,[]);await browser.close();
}
console.log(checks+' Chrome 87 file-origin organization and styling assertions PASS');
})().catch(e=>{console.error(e);process.exit(1);});
