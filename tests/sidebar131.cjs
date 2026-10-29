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


const assert=require('assert/strict'),result={pages:[]};
for(const width of [1920,1280]){
await p.setViewportSize({width,height:width*9/16});
await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');
await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);
// Reach sidebar through remote navigation, never click or focus a page in the walk.
await p.keyboard.press('ArrowLeft');
await p.waitForTimeout(150);
assert(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)));
const total=await p.locator('nav button').count();
for(let n=0;n<total;n++){
const id=await p.evaluate(()=>document.activeElement.id||document.activeElement.dataset.kind);
await p.keyboard.press('Enter');await p.waitForTimeout(350);
for(let k=0;k<12;k++){if(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)))break;await p.keyboard.press('ArrowLeft');}
await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
console.log(id,await p.evaluate(()=>({active:document.activeElement.outerHTML.slice(0,160),connection:document.querySelector('#connection').hidden,home:document.querySelector('#home').hidden}))); 
assert(await p.evaluate(()=>!document.querySelector('nav').contains(document.activeElement)),'Sidebar enters content '+id);
for(let k=0;k<12;k++){if(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)))break;await p.keyboard.press('ArrowLeft');}
assert(await p.evaluate(()=>document.querySelector('nav').contains(document.activeElement)),'Sidebar reachable '+id);
assert.equal(await p.locator('nav button.selected').count(),1,'Exactly one selected page '+id);
if(id==='settings-open')await p.screenshot({path:'artifacts/release132/sidebar-settings-'+width+'.png'});
result.pages.push({width,id,sidebarReturn:'PASS',singleSelected:'PASS'});
await p.keyboard.press('ArrowDown');
}
assert.equal(await p.locator('#theme-picker button').count(),4);
}
result.requests=requests;fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result.runs));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
