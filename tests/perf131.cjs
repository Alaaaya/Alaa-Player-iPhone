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
let data=[];if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
return r.fulfill({headers:cors,body:''});
});
let result={cpuThrottle:4,fixtureChannels:56700,networkDelayMs:80,runs:[]};
for(let n=0;n<3;n++){
let t=Date.now();await p.goto('file://'+path.resolve(process.argv[2]||'dist')+'/index.html');await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);let startup=Date.now()-t;
t=Date.now();await p.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());await p.waitForFunction(()=>document.querySelector('#items button'));let liveOpen=Date.now()-t;
let focus=await p.evaluate(async()=>{let nodes=document.querySelectorAll('#items button'),times=[];for(let i=0;i<20;i++){let t=performance.now();if(i===0)nodes[0].focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',keyCode:40,bubbles:true}));await new Promise(requestAnimationFrame);times.push(performance.now()-t);}return times});
t=Date.now();await p.evaluate(()=>{let nodes=document.querySelectorAll('#categories button');nodes[2].click()});await p.waitForFunction(()=>document.querySelector('#categories button.selected')&&document.querySelector('#categories button.selected').textContent.includes('Category 2')&&document.querySelector('#items button'));let category=Date.now()-t;
await p.waitForTimeout(300);result.runs.push({startupMs:startup,liveOpenMs:liveOpen,focusFrameMs:focus.reduce((a,b)=>a+b)/focus.length,categorySwitchMs:category,renderedRows:await p.locator('#items button').count()});
}
if(process.env.VERIFY_CACHE){
const assert=require('assert/strict');
assert(!requests.some(r=>r.a==='get_live_streams'&&!r.cat),'No full live-catalog requests on initial/category loads');
await p.evaluate(()=>{document.querySelector('#items button').focus();window.__firstRow=document.querySelector('#items button');});
await p.keyboard.press('ArrowDown');
assert(await p.evaluate(()=>window.__firstRow.isConnected),'Focus move preserves existing rows');
await p.evaluate(()=>document.querySelector('#categories button').focus());
for(let i=0;i<30;i++)await p.keyboard.press('ArrowDown');
assert(await p.evaluate(()=>Number(document.activeElement.dataset.categoryIndex)>=30),'Remote crosses category window boundary');
assert(await p.locator('#categories button').count()<=20,'Category DOM bounded');
offline=true;await p.reload();await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);
await p.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());
await p.waitForFunction(()=>document.querySelector('#items button'));
assert(await p.locator('#items button').count()>0,'Cached live catalog opens offline');
result.cacheVerification='PASS: provider offline reload, lazy category requests, category window crossing, stable focus nodes';
}
result.requests=requests;fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result.runs));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
