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
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
return r.fulfill({headers:cors,body:''});
});

const assert=require('assert/strict'),result={checks:[]};
for(const viewport of [{width:1920,height:1080},{width:1280,height:720}]){
await p.setViewportSize(viewport);await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);
for(const kind of ['movies','series']){
await p.evaluate(k=>document.querySelector('nav [data-kind="'+k+'"]').click(),kind);
await p.waitForFunction(()=>document.querySelector('#browser').classList.contains('poster-view')&&document.querySelector('#items button .item-name')&&document.querySelector('#items button .item-name').textContent.startsWith('Title'));
// Cached posters can precede completion of the route load, which rebuilds the nodes.
await p.waitForFunction(()=>!document.querySelector('#status').textContent.startsWith('جارٍ تحميل'));
await p.waitForTimeout(350);
await p.evaluate(()=>document.querySelector('#items button').focus());
await p.keyboard.press('ArrowLeft');
assert(await p.evaluate(()=>document.querySelector('#categories').contains(document.activeElement)));
await p.keyboard.press('ArrowLeft');
assert(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)));
await p.keyboard.press('ArrowRight');
assert(await p.evaluate(()=>document.querySelector('#categories').contains(document.activeElement)));
await p.keyboard.press('ArrowRight');
assert(await p.evaluate(()=>document.querySelector('#items').contains(document.activeElement)));
await p.waitForTimeout(350);
const geometry=await p.evaluate(()=>{const box=document.querySelector('#items').getBoundingClientRect();const rows=[...document.querySelectorAll('#items button')].map(e=>e.getBoundingClientRect());return {box:{top:box.top,bottom:box.bottom,height:box.height},visible:rows.filter(r=>r.top>=box.top&&r.bottom<=box.bottom).length,firstHeight:rows[0].height};});
console.log(viewport.width,kind,geometry);assert(geometry.visible>=18,'At least three complete poster rows visible');
assert(geometry.box.bottom<=viewport.height,'Grid stays within viewport');
await p.screenshot({path:'artifacts/perf131/'+kind+'-'+viewport.width+'-initial.png'});
for(let i=0;i<24;i++)await p.keyboard.press('ArrowDown');
assert(await p.evaluate(()=>Number(document.activeElement.dataset.index)>=100),'Cross virtual grid boundaries');
await p.screenshot({path:'artifacts/perf131/'+kind+'-'+viewport.width+'.png'});
result.checks.push({viewport,kind,geometry,navigation:'PASS',virtualScroll:'PASS'});
}
}
result.requests=requests;fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result.runs));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
