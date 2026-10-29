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
if(a==='get_series_info')data={info:{name:'Test Series',cover:''},episodes:{'1':Array.from({length:65},(_,i)=>({id:i+1,title:'Episode '+(i+1),episode_num:i+1,container_extension:'mp4',info:{duration:'00:45:00'}}))}};
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:i===0?'ᴬᴿ | الأخبار العربية الرياضية بدون التفاف':('Category '+(i+1)),category_icon:i===0?'https://images.fixture/icon.svg':undefined}));
if(a==='get_live_streams')data=Array.from({length:cat?30:300},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/30)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
if(u.hostname==='images.fixture')return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#29b"/><text x="4" y="30" fill="white">TV</text></svg>'});return r.fulfill({headers:cors,body:''});
});



const assert=require('assert/strict'),result=[],errors=[];const shotDir=process.argv[4]||'artifacts/release133/columns';fs.mkdirSync(shotDir,{recursive:true});p.on('pageerror',e=>errors.push(e.message));
for(const width of [1920,1280]){
await p.setViewportSize({width,height:width*9/16});
await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#connection').hidden);
await p.locator('nav [data-kind="live"]').click();
await p.waitForFunction(()=>document.querySelector('#items button'));
await p.waitForTimeout(500);
const geo=await p.evaluate(()=>{
 const rect=id=>{let r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 const main=document.querySelector('#browser'),cs=getComputedStyle(main),scale=innerWidth/1920;
 const usable=main.getBoundingClientRect().width-(parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight))*scale;
 return {usable,detail:rect('#detail'),cover:rect('#cover'),list:rect('.library'),categories:rect('#categories'),viewport:innerWidth,ratio:document.querySelector('#detail').getBoundingClientRect().width/usable};
});
assert(Math.abs(geo.ratio-.30)<.015,JSON.stringify(geo));
assert(Math.abs(geo.cover.w/geo.cover.h-16/9)<.02,JSON.stringify(geo.cover));
assert(geo.list.w>400*width/1920);assert(geo.detail.right<=width+1);
assert.equal(await p.locator('#play-selected,#preview-selected,#favorite-selected').count(),0);
const label=p.locator('#categories .category-label').nth(1);
assert((await label.textContent()).startsWith('AR |'),'NFKC display label');
assert.equal(await label.evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
const legibility=await label.evaluate(e=>({text:e.textContent,client:e.clientWidth,scroll:e.scrollWidth,font:getComputedStyle(e).fontSize}));
const aside=await p.locator('#browser>aside').boundingBox();
if(!process.env.BASELINE){assert(legibility.scroll<=legibility.client+1,'Long Arabic category fully visible '+JSON.stringify(legibility));assert(Math.abs(aside.width-420*width/1920)<1,'Wider categories');}
await p.screenshot({path:shotDir+'/live-'+width+'.png'});
assert(await p.locator('#categories .category-symbol img').count()>0);
await p.locator('#items button').first().focus();
for(let i=0;i<15;i++)await p.keyboard.press('ArrowDown');
await p.waitForTimeout(400);
assert.equal(await p.locator('#detail-name').textContent(),'Channel 15','Settled remote selection paints correct details');
await p.keyboard.press('Enter');assert(await p.locator('#player').isVisible(),'Immediate OK opens focused item');
assert.equal(await p.locator('#playing-name').textContent(),'Channel 15');await p.keyboard.press('Escape');
await p.locator('#items button').first().focus();
await p.keyboard.down('Enter');await p.waitForTimeout(800);await p.keyboard.up('Enter');
assert(await p.locator('#organize-panel').isVisible());assert(await p.locator('#player').isHidden());
await p.keyboard.press('Enter');assert(await p.locator('#player').isHidden());
assert.equal(JSON.parse(await p.evaluate(()=>localStorage.getItem('ap-favorites'))).length,1);
await p.screenshot({path:shotDir+'/live-organized-'+width+'.png'});
await p.locator('#items button').first().focus();await p.keyboard.press('Enter');
assert(await p.locator('#player').isVisible());
await p.keyboard.press('Enter');assert(await p.locator('#quick-channels').isVisible());
await p.screenshot({path:shotDir+'/overlay-'+width+'.png'});
await p.keyboard.press('Escape');await p.keyboard.press('Escape');
await p.evaluate(()=>localStorage.removeItem('ap-favorites'));
result.push({width,status:'PASS',geometry:geo,legibility,aside,longPressFavoriteNoPlayback:true,shortOKPlays:true,categoryProviderIcon:true,nfkcDisplayOnly:true});
}
assert.deepEqual(errors,[]);fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
