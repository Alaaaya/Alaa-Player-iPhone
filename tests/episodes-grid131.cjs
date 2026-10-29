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
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
return r.fulfill({headers:cors,body:''});
});


const assert=require('assert/strict'),result={};
for(const width of [1920,1280]){
await p.setViewportSize({width,height:width===1920?1080:720});
await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);
await p.evaluate(()=>document.querySelector('nav [data-kind="series"]').click());
await p.waitForFunction(()=>document.querySelector('#items button .item-name')&&document.querySelector('#items button .item-name').textContent.startsWith('Title'));
await p.waitForTimeout(400);await p.evaluate(()=>document.querySelector('#items button').click());
await p.waitForFunction(()=>document.querySelectorAll('#episode-list button').length>10);
assert.equal(await p.locator('#episode-detail').count(),0);
await p.evaluate(()=>document.querySelector('#episode-list button').focus());
await p.keyboard.press('ArrowUp');assert(await p.evaluate(()=>document.querySelector('#season-tabs').contains(document.activeElement)));
await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowLeft');assert(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)));
await p.keyboard.press('ArrowRight');await p.evaluate(()=>document.querySelector('#episode-list button').focus());
for(let n=0;n<8;n++)await p.keyboard.press('ArrowDown');
assert(await p.evaluate(()=>Number(document.activeElement.dataset.episodeIndex)>=40));
await p.screenshot({path:'artifacts/final131/episodes-grid-'+width+'.png'});
await p.keyboard.press('Enter');assert(await p.evaluate(()=>!document.querySelector('#player').hidden));
result[width]='PASS 5-column grid, season/sidebar navigation, virtualization crossing, OK immediate playback';
}
result.requests=requests;fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result.runs));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
