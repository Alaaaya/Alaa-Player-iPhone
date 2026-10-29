const {webkit,chromium}=require(process.env.PLAYWRIGHT_87||'/home/kit/tvp-valet/node_modules/playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
const root=path.resolve(__dirname,'../app'),server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://x').pathname));if(!file.startsWith(root+'/')){res.statusCode=404;return res.end();}fs.readFile(file,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(e?'':b);});}).listen(0,'127.0.0.1');
await new Promise(r=>server.on('listening',r));let checks=0;const results=[];
function check(a,b){assert.deepEqual(a,b);checks++;}
for(const engine of (process.env.CHROMIUM_87?[chromium]:[webkit,chromium])){
const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:process.env.CHROMIUM_87||'/opt/hako/bin/google-chrome',args:['--no-sandbox']}:{})});
try{
const page=await browser.newPage({viewport:{width:1920,height:1080},bypassCSP:!!process.env.CHROMIUM_87}),errors=[];page.on('pageerror',e=>errors.push(e.message));
let panelStatus='active',holdSeries=true,held=[],calls=[];
const p1={id:'one',type:'xtream',server:'https://first.example',username:'private-user',password:'private-password'},p2={...p1,id:'two',server:'https://second.example'};
await page.addInitScript(()=>{
window.__exports=[];window.__trace=[];window.PalmSystem={launchParams:JSON.stringify({featured:{type:'movies',id:'11'}})};
window.PalmServiceBridge=function(){this.cancel=()=>{};this.call=(uri,raw)=>{const cmd=JSON.parse(raw).command,b64=cmd.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)[1];window.__exports.push(JSON.parse(decodeURIComponent(escape(atob(b64)))));window.__trace.push('export');this.onservicecallback(JSON.stringify({returnValue:true,stdoutString:''}));};};
HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.play=function(){throw Error('Deep link must not autoplay');};HTMLMediaElement.prototype.pause=function(){};
});
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'apikey, authorization, content-type'};
await page.route('https://jytjcdlmygwqizgydeyp.supabase.co/**',r=>r.request().method()==='OPTIONS'?r.fulfill({status:204,headers:cors,body:''}):r.fulfill({headers:cors,json:r.request().url().includes('register_device')?{}:{status:panelStatus,playlists:[p1,p2]}}));
await page.route('https://image.tmdb.org/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
async function provider(r){const u=new URL(r.request().url()),a=u.searchParams.get('action');if(!a)return r.fulfill({body:''});calls.push(u.href);
if(holdSeries&&u.hostname==='first.example'&&a==='get_series'){held.push(r);return;}
let json=[];if(a.endsWith('_categories'))json=[{category_id:'1',category_name:'Test'}];
else if(a==='get_live_streams')json=[{stream_id:1,name:'Live',category_id:'1'}];
else if(a==='get_vod_streams')json=[{stream_id:11,name:u.hostname+' Movie',category_id:'1',stream_icon:'https://image.tmdb.org/t/p/w500/movie.jpg',added:100},{stream_id:12,name:'Unsafe',stream_icon:'https://first.example/movie/private-user/private-password/12.jpg',added:200}];
else if(a==='get_series')json=[{series_id:22,name:u.hostname+' Series',category_id:'1',cover:'https://image.tmdb.org/t/p/w500/series.jpg',last_modified:300}];
else if(a==='get_vod_info')json={info:{plot:'Movie detail'}};
else if(a==='get_series_info')json={info:{plot:'Series detail'},episodes:{'1':[{id:99,title:'Episode',container_extension:'mp4'}]}};
await r.fulfill({json});}
await page.route('https://first.example/**',provider);await page.route('https://second.example/**',provider);
await page.goto('http://127.0.0.1:'+server.address().port);
await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('1 قناة'));
await page.waitForFunction(()=>window.__exports.length>=2);check(await page.locator('#movie-detail').isVisible(),false);
check(await page.evaluate(()=>window.__exports.every(e=>e.items.length===0)),true);
holdSeries=false;for(const r of held.splice(0))await r.fulfill({json:[{series_id:22,name:'first.example Series',category_id:'1',cover:'https://image.tmdb.org/t/p/w500/series.jpg',last_modified:300}]});
await page.waitForFunction(()=>!document.querySelector('#movie-detail').hidden);
check(await page.locator('#movie-title').textContent(),'first.example Movie');
check(await page.locator('#player').isVisible(),false);
await page.waitForFunction(()=>window.__exports.slice(-1)[0].items.length===2);
const exported=await page.evaluate(()=>window.__exports.slice(-1)[0]);
check(exported.items.map(i=>i.type),['series','movies']);check(exported.items.length,2);
check(JSON.stringify(exported).includes('private-'),false);check(exported.items.some(i=>i.artwork.includes('first.example')),false);
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:{featured:{type:'series',id:'22'}}})));
await page.waitForFunction(()=>!document.querySelector('#series-detail').hidden);
check(await page.locator('#series-title').textContent(),'first.example Series');check(await page.locator('#movie-detail').isVisible(),false);
const before=calls.length;
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:{featured:{type:'movies',id:'https://evil.example/a'}}})));
check(calls.length,before);check(await page.locator('#series-detail').isVisible(),true);
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:{featured:{type:'movies',id:'999'}}})));
check(calls.length,before);
await page.locator('#series-back').click();
await page.locator('#providers').selectOption('two');
await page.waitForFunction(()=>window.__exports.slice(-1)[0].items[0]?.title==='second.example Series');
check(await page.evaluate(()=>window.__exports.slice(-2)[0].items.length),0);
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('webOSLaunch',{detail:{featured:{type:'movies',id:'11'}}})));
await page.waitForFunction(()=>document.querySelector('#movie-title').textContent==='second.example Movie');
check(calls.slice(-1)[0].startsWith('https://second.example/'),true);
await page.locator('#movie-back').click();await page.locator('#settings-open').click();panelStatus='expired';await page.locator('#sync').click();
await page.waitForFunction(()=>document.querySelector('#providers').options.length===0);
await page.waitForFunction(()=>window.__exports.slice(-1)[0].items.length===0);
check(await page.locator('#items button').count(),0);check(await page.locator('#home-movies button').count(),0);
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:{featured:{type:'movies',id:'11'}}})));
check(await page.locator('#movie-detail').isVisible(),false);
panelStatus='active';holdSeries=true;await page.reload();
await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('1 قناة'));
while(!held.length)await new Promise(r=>setTimeout(r,5));
await page.evaluate(()=>{
document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:{featured:{type:'series',id:'22'}}}));
const select=document.querySelector('#providers');select.value='two';select.dispatchEvent(new Event('change'));
});
await page.waitForFunction(()=>window.__exports.slice(-1)[0].items[0]?.title==='second.example Series');
holdSeries=false;for(const r of held.splice(0))await r.fulfill({json:[{series_id:22,name:'STALE first series',cover:'https://image.tmdb.org/t/p/w500/old.jpg'}]});
await page.waitForTimeout(100);
check(await page.evaluate(()=>window.__exports.slice(-1)[0].items[0].title),'second.example Series');
check(await page.locator('#series-detail').isVisible(),false);
check(await page.locator('#movie-detail').isVisible(),false);
check(await page.locator('#home-series').textContent().then(s=>s.includes('STALE')),false);
check(errors,[]);results.push({engine:engine.name(),errors:errors,exported:exported.items.length});
}finally{await browser.close();}
}
server.close();fs.writeFileSync(path.resolve(__dirname,'../artifacts/featured-results.json'),JSON.stringify({checks,results,mocked:true,hardware:false},null,2));console.log(checks+' featured integration assertions PASS');
})().catch(e=>{console.error(e);process.exit(1);});
