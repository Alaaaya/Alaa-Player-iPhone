const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({bypassCSP:true,viewport:{width:1920,height:1080}}),cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
let offline=false;let requests=[];const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
await p.route('**/*',async r=>{
const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'bench',type:'xtream',server:'https://fixture.example',username:'test',password:'test',name:'Benchmark'}]}});
if(u.hostname==='fixture.example'){if(offline)return r.abort();
const a=u.searchParams.get('action'),cat=u.searchParams.get('category_id');requests.push({a,cat});
let data=[];if(a==='get_vod_categories'||a==='get_series_categories')data=[{category_id:'1',category_name:'Films'},{category_id:'2',category_name:'Other'}];
if(a==='get_vod_streams'||a==='get_series')data=Array.from({length:180},(_,i)=>({stream_id:i+1,series_id:i+1,name:'Title '+i,category_id:'1',stream_icon:'',cover:''}));
if(a==='get_vod_info')data={info:{plot:'قصة تجريبية طويلة لاختبار عرض تفاصيل الفيلم بشكل واضح فوق قائمة الأفلام المشابهة.',genre:'دراما · مغامرة',duration:'01:48:00',rating:'8.7',releasedate:'2025-04-12',movie_image:'https://images.fixture/poster.svg',backdrop_path:['https://images.fixture/backdrop.svg']}};
if(a==='get_series_info')data={info:{name:'Test Series',cover:''},episodes:{'1':Array.from({length:65},(_,i)=>({id:i+1,title:'Episode '+(i+1),episode_num:i+1,container_extension:'mp4',info:{duration:'00:45:00'}}))}};
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
if(u.hostname==='images.fixture')return r.fulfill({headers:cors,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540"><rect width="360" height="540" fill="#27445f"/><text x="40" y="270" fill="white" font-size="32">FILM FIXTURE</text></svg>'});
return r.fulfill({headers:cors,body:''});
});


const assert=require('assert/strict'),result={};
for(const width of [1920,1280]){
await p.setViewportSize({width,height:width===1920?1080:720});
await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#connection').hidden);
await p.evaluate(()=>document.querySelector('nav [data-kind="movies"]').click());
await p.waitForFunction(()=>document.querySelector('#items .item-name')&&document.querySelector('#items .item-name').textContent.startsWith('Title'));
await p.waitForTimeout(400);await p.evaluate(()=>document.querySelector('#items button').click());
await p.waitForFunction(()=>!document.querySelector('#movie-detail').hidden&&document.querySelectorAll('#movie-related button').length>12);
await p.waitForFunction(()=>document.querySelector('#movie-description').textContent.length>20&&document.querySelector('#movie-meta').textContent.includes('8.7'));
await p.waitForTimeout(400);
await p.screenshot({path:'artifacts/release133/movie-rich-'+width+'.png'});
assert.equal(await p.evaluate(()=>document.activeElement.id),'movie-play');
const geometry=await p.evaluate(()=>{let d=document.querySelector('#movie-detail').getBoundingClientRect(),g=document.querySelector('#movie-related').getBoundingClientRect(),b=document.querySelector('#movie-related button').getBoundingClientRect();return {detail:{left:d.left,right:d.right,bottom:d.bottom},grid:{top:g.top,bottom:g.bottom,width:g.width,height:g.height},first:{top:b.top,height:b.height},scale:innerWidth/1920};});
assert(geometry.detail.right<=width+1&&geometry.detail.left>=0);
assert(geometry.grid.height>400*geometry.scale,'Related grid fills remaining viewport');
assert(geometry.grid.width>1500*geometry.scale,'No extra right info pane');
await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'0');
for(let i=0;i<16;i++)await p.keyboard.press('ArrowDown');
assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'96','Cross related virtual windows');
assert(await p.locator('#movie-related button').count()<=24,'Bounded related DOM');
for(let i=0;i<16;i++)await p.keyboard.press('ArrowUp');
assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'0','Return across related windows');
await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'1');
await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'7');
await p.keyboard.press('ArrowUp');assert.equal(await p.evaluate(()=>document.activeElement.dataset.relatedIndex),'1');
await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');assert(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)));
await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>document.activeElement.id),'movie-back');
await p.keyboard.press('ArrowDown');let oldTitle=await p.locator('#movie-title').textContent();await p.keyboard.press('Enter');
await p.waitForFunction(old=>document.querySelector('#movie-title').textContent!==old,oldTitle);
assert(await p.locator('#player').isHidden(),'Related OK opens detail without playback');
await p.waitForTimeout(400);await p.keyboard.press('Enter');assert(await p.locator('#player').isVisible(),'Play OK starts immediately');
await p.keyboard.press('Escape');
await p.evaluate(()=>document.querySelector('#movie-poster').focus());await p.keyboard.press('Enter');assert(await p.locator('#player').isVisible(),'Poster OK starts immediately');
await p.keyboard.press('Escape');
await p.screenshot({path:'artifacts/release133/movie-filled-'+width+'.png'});
result[width]={status:'PASS',geometry,remote:'6-column related grid, sidebar, related opens detail, play and poster direct playback'};
}
fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
