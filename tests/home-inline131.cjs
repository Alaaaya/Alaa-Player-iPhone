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
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:['News','Kids','Sports','General'][i%4]+' '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
return r.fulfill({headers:cors,body:''});
});


const assert=require('assert/strict'),result={};
const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const width of [1920,1280]){
await p.setViewportSize({width,height:width===1920?1080:720});await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);
await p.waitForTimeout(500);
for(const tile of ['live','movies','series']){
await p.evaluate(()=>document.querySelector('#nav-home').click());
await p.locator('[data-home-tile="'+tile+'"]').focus();await p.keyboard.press('Enter');
await p.waitForFunction(()=>document.querySelector('#home-inline-items button'));
assert(await p.locator('#home').isVisible());assert(await p.locator('#home-hero').isVisible());assert(await p.locator('#browser').isHidden());
assert.equal(await p.locator('#home-tiles button.selected').getAttribute('data-home-tile'),tile);
await p.keyboard.press('ArrowDown');assert(await p.evaluate(()=>document.querySelector('#home-inline-categories').contains(document.activeElement)));
await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await p.waitForTimeout(400);
if(['kids','news','sports'].includes(tile)){const labels=await p.locator('#home-inline-categories button').allTextContents();assert(labels.slice(1).every(t=>t.toLowerCase().includes(tile)));}
await p.keyboard.press('ArrowDown');assert(await p.evaluate(()=>document.activeElement.dataset.inlineIndex==='0'));
await p.keyboard.press('ArrowDown');assert(await p.evaluate(()=>document.activeElement.dataset.inlineIndex===String(['movies','series'].includes(document.querySelector('#home-tiles button.selected').dataset.homeTile)?6:1)));
await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.dataset.homeTile),tile);assert(await p.locator('#home').isVisible());
await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');
if(['movies','series'].includes(tile)){
await p.waitForFunction(()=>!document.querySelector('#movie-detail').hidden||!document.querySelector('#series-detail').hidden);
await p.keyboard.press('Escape');assert(await p.locator('#home').isVisible());assert.equal(await p.evaluate(()=>document.activeElement.dataset.homeTile),tile);
}else{assert(await p.locator('#player').isVisible());await p.keyboard.press('Escape');assert(await p.locator('#home').isVisible());}
}
await p.evaluate(()=>document.querySelector('nav [data-kind="movies"]').click());await p.waitForFunction(()=>!document.querySelector('#browser').hidden);assert(await p.locator('#home').isHidden());
await p.evaluate(()=>document.querySelector('#nav-home').click());
offline=true;await p.locator('[data-home-tile="movies"]').click();await p.waitForFunction(()=>document.querySelector('#home-inline-items button'));assert(await p.locator('#home').isVisible());offline=false;
const boxes=await p.evaluate(()=>[...document.querySelectorAll('#home-tiles button'),...document.querySelectorAll('#home-inline-items button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};}));assert(boxes.every(r=>r.left>=0&&r.right<=width+1),'Home tiles and inline columns stay inside viewport');
await p.screenshot({path:'artifacts/cache131/home-inline-'+width+'.png'});
result[width]='PASS live/movie/series inline tiles, category/content Dpad, Back focus, movie/series return, live playback, hero/Home route, selected Apple tile, sidebar separate, cached offline inline';
}
assert.deepEqual(errors,[]);fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(result);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
