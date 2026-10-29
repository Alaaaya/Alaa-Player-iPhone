const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const out=path.resolve('artifacts/release134');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const results=[];
try{for(const theme of ['apple','navy','red','blue'])for(const width of [1920,1280]){
const c=await b.newContext({bypassCSP:true,viewport:{width,height:width*9/16}}),p=await c.newPage(),errors=[],calls=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(t=>{localStorage.setItem('ap-theme',t);window.__loads=0;const old=HTMLMediaElement.prototype.load;HTMLMediaElement.prototype.load=function(){window.__loads++;return old.call(this)}},theme);
const video=fs.readFileSync('/home/kit/tmp/ovfix/seek65.webm'),cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();let d=[];
if(u.hostname.includes('supabase'))d=u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'matrix',type:'xtream',server:'https://fixture.example',username:'t',password:'t',name:'Fixture'}]};
else if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');calls.push(a);if(!a){const rg=r.request().headers()['range'],hd={...cors,'content-type':'video/webm','accept-ranges':'bytes'};if(rg){const m=/bytes=(\d+)-(\d*)/.exec(rg),st=+m[1],en=m[2]?+m[2]:video.length-1;return r.fulfill({status:206,headers:{...hd,'content-range':'bytes '+st+'-'+en+'/'+video.length},body:video.subarray(st,en+1)});}return r.fulfill({headers:hd,body:video});}
if(a.endsWith('_categories'))d=Array.from({length:35},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(['get_live_streams','get_vod_streams','get_series'].includes(a))d=Array.from({length:95},(_,i)=>({stream_id:i+1,series_id:i+1,name:(a==='get_series'?'Series ':a==='get_vod_streams'?'Film ':'Channel ')+i,category_id:u.searchParams.get('category_id')||'1',container_extension:'webm'}));
if(a==='get_series_info')d={info:{name:'Series',plot:'Fixture'},episodes:{'1':Array.from({length:65},(_,i)=>({id:i+1,title:'Episode '+i,episode_num:i+1,season:1,container_extension:'webm',info:{duration:'00:01:05'}})),'2':[{id:101,title:'Other season',container_extension:'webm'}]}};
}return r.fulfill({headers:cors,json:d})});
const key=async(n,type='keydown',repeat=false)=>p.evaluate(({n,type,repeat})=>document.activeElement.dispatchEvent(new KeyboardEvent(type,{keyCode:n,which:n,bubbles:true,cancelable:true,repeat})),{n,type,repeat});
const short=async n=>{await key(n);await key(n,'keyup')};
const hold=async loc=>{await loc.focus();await key(13);await p.waitForTimeout(360);await key(13,'keydown',true);await p.waitForTimeout(350);await key(13,'keydown',true);await key(13,'keyup');assert.equal(await p.locator('#organize-panel').isVisible(),true)};
const idOf=loc=>loc.evaluate(e=>e.dataset.organizeChannel||e.dataset.groupName||e.dataset.inlineGroup||e.dataset.orderId||e.dataset.episodeIndex);
const log=[];
async function reorder(label,selector,{dir=39,cross=0}={}){
let loc=p.locator(selector).first();await loc.waitFor();const before=await p.locator(selector).evaluateAll(es=>es.map(e=>e.textContent)),id=await idOf(loc),saved=await p.evaluate(()=>localStorage.getItem('ap-live-order'));
await hold(loc);await p.locator('#organize-move').focus();await short(13);await short(dir);await short(461);
assert.deepEqual(await p.locator(selector).evaluateAll(es=>es.map(e=>e.textContent)),before,label+' cancel');
assert.equal(await p.evaluate(()=>localStorage.getItem('ap-live-order')),saved,label+' cancel persistence');
await hold(p.locator(selector).first());await p.locator('#organize-move').focus();await short(13);for(let j=0;j<Math.max(1,cross);j++)await short(dir);await short(13);
assert.equal(await p.locator('#organize-panel').count(),0);assert.ok(await p.evaluate(()=>localStorage.getItem('ap-live-order')),label+' save');
const after=await p.locator(selector).evaluateAll(es=>es.map(e=>e.textContent));assert.notDeepEqual(after,before,label+' move');
log.push({label,realHeldRepeated13:true,save:true,cancel:true,cross});
}
await p.goto('file://'+path.resolve('dist/index.html'));await p.waitForSelector('#home-movies button');await p.waitForSelector('#home-series button');
await reorder('sidebar','nav button',{dir:40});await reorder('Home tiles','#home-tiles button');
await reorder('Home movie cards','#home-movies button');await reorder('Home series cards','#home-series button');await reorder('Home rows','#home-shelves>section');
for(const kind of ['live','movies','series']){
await p.locator('nav [data-kind="'+kind+'"]').click();await p.waitForSelector('#items button');await p.waitForTimeout(150);
await reorder(kind+' categories','#categories button',{dir:40,cross:24});
await reorder(kind+' items','#items button',{dir:40,cross:kind==='live'?32:7});
await hold(p.locator('#items button').first());await p.locator('#organize-panel button').first().focus();await short(13);
await p.locator('#nav-favorites').click();await p.waitForSelector('#items button');
if(await p.locator('#items button').count()>1)await reorder(kind+' favorites','#items button');
else log.push({label:kind+' favorites',favorite:true,reorderTarget:true,singleItemNoMove:true});
await p.locator('#nav-home').click();await p.locator('#home-tiles [data-home-tile="'+kind+'"]').click();await p.waitForSelector('#home-inline-items [data-inline-index]');
await reorder(kind+' inline categories','#home-inline-categories button');
await reorder(kind+' inline items','#home-inline-items [data-inline-index]',{dir:40,cross:11});
}
await p.locator('nav [data-kind="series"]').click();await p.waitForSelector('#items button');await p.locator('#items button').first().click();await p.waitForSelector('.episode-row');
await reorder('episodes','.episode-row',{dir:40,cross:theme==='red'?32:7});
const ep=p.locator('.episode-row').first();await ep.focus();await short(13);
await p.waitForFunction(()=>document.getElementById('video').currentTime>.1);assert.equal(await p.evaluate(()=>document.body.classList.contains('episode-inline')),true);
await p.evaluate(()=>{window.__v=document.getElementById('video');window.__src=__v.querySelector('source').src;__v.currentTime=15;window.__loadSnapshot=__loads});
await short(13);assert.equal(await p.evaluate(()=>document.body.classList.contains('episode-fullscreen')),true);
console.log('EPSTATE',await p.evaluate(()=>({loads:__loads,snapshot:__loadSnapshot,t:__v.currentTime,src:__v.querySelector('source').src})));assert.equal(await p.evaluate(()=>__loads===__loadSnapshot&&__v===document.getElementById('video')&&__v.currentTime>=14.9),true);
await short(461);assert.equal(await p.evaluate(()=>document.body.classList.contains('episode-inline')),true);
assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('episode-row')),true);
assert.equal(await p.evaluate(()=>__loads===__loadSnapshot&&__v.currentTime>=14.9&&!__v.paused),true);
await hold(p.locator('.episode-row').first());await short(461);assert.equal(await p.evaluate(()=>__loads===__loadSnapshot&&document.body.classList.contains('episode-inline')),true);
await p.locator('.episode-row').nth(1).focus();await short(13);assert.equal(await p.evaluate(()=>document.body.classList.contains('episode-inline')),true);
log.push({label:'episode presentation',firstInline:true,sameFullscreen:true,backPreservesInstanceTimePlaybackFocus:true,differentInline:true,longpressNoActivation:true});
await p.locator('#stop').click({force:true});await p.locator('#nav-home').click();
const persisted=await p.evaluate(()=>localStorage.getItem('ap-live-order'));await p.reload();await p.waitForSelector('#home-movies button');assert.equal(await p.evaluate(()=>localStorage.getItem('ap-live-order')),persisted);log.push({label:'restart',ordersPersist:true});
if(theme==='red'){
await p.screenshot({path:out+'/red-home-'+width+'.png'});
for(const kind of ['live','movies','series']){await p.locator('nav [data-kind="'+kind+'"]').click();await p.waitForSelector('#items button');await p.locator('#items button').first().focus();
const g=await p.evaluate(()=>{const nav=document.querySelector('nav').getBoundingClientRect(),content=document.getElementById('browser').getBoundingClientRect();return{nav:nav.toJSON(),content:content.toJSON(),font:getComputedStyle(document.querySelector('nav button')).fontSize}});
assert.ok(g.content.left>=g.nav.right-1);assert.equal(g.font,'23px');await p.screenshot({path:out+'/red-'+kind+'-'+width+'.png'});
if(kind!=='live'){await p.locator('#items button').first().click();await p.waitForTimeout(150);await p.screenshot({path:out+'/red-'+kind+'-detail-'+width+'.png'});await p.locator('#nav-home').click();}}
await p.locator('#settings-open').click();await p.screenshot({path:out+'/red-settings-'+width+'.png'});
}
assert.deepEqual(errors,[]);results.push({theme,width,log});fs.writeFileSync(out+'/REORDER-MATRIX.json',JSON.stringify(results,null,2));console.log('PASS',theme,width,log.length);await c.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
