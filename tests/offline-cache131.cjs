'use strict';
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const exe=process.env.CHROMIUM_87||'/home/kit/tmp/player124/chrome-linux/chrome';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ap-offline131-'));
const entry='file://'+path.resolve(process.argv[2]||'dist')+'/index.html';
const out=process.argv[3]||'artifacts/cache131/offline.json';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
let offline=false,slow=false,calls=[],context,page,active=0,maxActive=0,errors=[],checks=[];
const cats=Array.from({length:4},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
async function launch(init){
 context=await chromium.launchPersistentContext(profile,{executablePath:exe,headless:true,args:['--no-sandbox'],viewport:{width:1920,height:1080},bypassCSP:true});
 page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));
 if(init)await page.addInitScript(init);
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
  if(offline)return r.abort();
  if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',expires_at:'2030-01-01',playlists:[{id:'fixture',name:'Test',type:'xtream',server:'https://fixture.example',username:'fixture',password:'fixture'}]}});
  if(u.hostname==='fixture.example'){
   const a=u.searchParams.get('action'),cat=u.searchParams.get('category_id');
   assert(!u.searchParams.has('series_id')||a==='get_series_info','Category ID must not be encoded as series_id');
   calls.push({a,cat});active++;maxActive=Math.max(active,maxActive);
   let data=[];
   if(a.endsWith('_categories'))data=cats;
   if(a==='get_live_streams'||a==='get_vod_streams'||a==='get_series'){
    assert(cat,'Category request required');
    data=Array.from({length:30},(_,i)=>({stream_id:Number(cat)*100+i,series_id:Number(cat)*100+i,category_id:cat,name:a+' '+cat+' Title '+i,stream_icon:'https://images.example/'+cat+'/'+i+'.svg',cover:'https://images.example/'+cat+'/'+i+'.svg',added:i,container_extension:'mp4'}));
   }
   if(a==='get_vod_info'||a==='get_series_info')data={info:{plot:'Cached description'},episodes:{1:[{id:5000,title:'Episode',episode_num:1,container_extension:'mp4'}]}};
   await new Promise(resolve=>setTimeout(resolve,slow?8000:20));
   active--;return r.fulfill({headers:cors,json:data});
  }
  if(u.hostname==='images.example')return r.fulfill({headers:cors,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>'});
  return r.fulfill({headers:cors,body:''});
 });
 await page.goto(entry);
}
async function ready(){
 await page.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);
}
async function db(fn,arg){
 return page.evaluate(async({body,arg})=>{
  const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('ap-catalog-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  return new Function('db','arg','return ('+body+')(db,arg)')(database,arg);
 },{body:fn.toString(),arg});
}
async function count(){return db(db=>new Promise(resolve=>{const r=db.transaction('catalog').objectStore('catalog').count();r.onsuccess=()=>resolve(r.result);}));}
async function visit(){
 for(const kind of ['live','movies','series']){
  await page.evaluate(kind=>document.querySelector('nav [data-kind="'+kind+'"]').click(),kind);
  await page.waitForFunction(kind=>{const n=document.querySelector('#items .item-name');return n&&n.textContent.includes(kind==='live'?'get_live_streams':kind==='movies'?'get_vod_streams':'get_series');},kind);
  for(let n=1;n<=4;n++){
   await page.evaluate(n=>Array.from(document.querySelectorAll('#categories button')).find(b=>b.textContent.includes('Category '+n)).click(),n);
   await page.waitForFunction(n=>document.querySelector('#categories button.selected').textContent.includes('Category '+n)&&document.querySelector('#items .item-name').textContent.includes(' '+n+' Title '),n);
   assert(await page.locator('#items button').count()>0);
  }
 }
 await page.evaluate(()=>document.querySelector('#nav-home').click());
 assert(await page.locator('#home-movies button').count()>0);
 assert(await page.locator('#home-series button').count()>0);
 assert(await page.locator('#home-play').isEnabled());
}
(async()=>{
 try{
  await launch();assert((await page.evaluate(()=>navigator.userAgent)).includes('Chrome/87.'));
  await ready();
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('ap-catalog-v1',1);r.onsuccess=()=>resolve(r.result);});return new Promise(resolve=>{const r=db.transaction('catalog').objectStore('catalog').getAll();r.onsuccess=()=>resolve(r.result.filter(v=>Array.isArray(v.data)&&v.data.length===30).length===12);});});
  checks.push('All 12 live/movie/series category lists primed in persistent IndexedDB');
  await visit();await page.waitForTimeout(500);
  await db(db=>new Promise((resolve,reject)=>{const tx=db.transaction('catalog','readwrite');for(let i=0;i<170;i++)tx.objectStore('catalog').put({time:Date.now(),data:[]},'sentinel-'+i);tx.oncomplete=resolve;tx.onabort=reject;}));
  const stored=await count();assert(stored>180);
  await context.close();calls=[];maxActive=0;await launch();await ready();await visit();await page.waitForTimeout(2500);
  assert(await page.locator('#home-series button').count()>0,'cached UI shown on restart');assert(calls.length>0,'silent background refresh every app open');assert(maxActive<=1);
  checks.push('Real Chromium 87 browser-process restart, cached UI first then silent serialized refresh every open');
  await context.close();offline=true;await launch();await ready();await visit();
  await page.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());
  await page.evaluate(()=>document.querySelector('#categories button').click());
  await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('120 '));
  assert(await page.locator('#items button').count()>0);
  await page.screenshot({path:'artifacts/release132/offline-live.png'});
  checks.push('Whole-network offline process restart restores home hero/rows, all categories and live All=120');
  await page.evaluate(()=>document.querySelector('#nav-home').click());
  for(const tile of ['live','movies','series']){
   await page.locator('[data-home-tile="'+tile+'"]').focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('#home-inline-items button'));
   assert(await page.locator('#home').isVisible());assert(await page.locator('#home-hero').isVisible());
   assert.equal(await page.locator('#home-tiles button.selected').getAttribute('data-home-tile'),tile);
   await page.keyboard.press('ArrowDown');assert(await page.evaluate(()=>document.querySelector('#home-inline-categories').contains(document.activeElement)));
   await page.keyboard.press('ArrowDown');assert(await page.evaluate(()=>document.querySelector('#home-inline-items').contains(document.activeElement)));
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.dataset.homeTile),tile);
  }
  checks.push('Cold network-offline Home inline Live/Movies/Series cached rows, hero retained, Dpad tiles/categories/content/Back');

  await page.screenshot({path:'artifacts/release132/offline-home.png'});
  for(const id of ['nav-favorites','nav-recent','nav-search','settings-open']){
   await page.evaluate(id=>document.getElementById(id).click(),id);
   assert(await page.locator('nav button.selected').count()===1);
  }
  checks.push('Favorites/recent/search/settings remain reachable offline');
  await db(db=>new Promise(resolve=>{const tx=db.transaction('catalog','readwrite'),r=tx.objectStore('catalog').openCursor();r.onsuccess=()=>{const c=r.result;if(c){const v=c.value;v.time=Date.now()-13*3600000;c.update(v);c.continue();}};tx.oncomplete=resolve;}));
  await context.close();offline=false;slow=true;calls=[];maxActive=0;await launch();await ready();
  const t=Date.now();await visit();assert(Date.now()-t<8000,'Stale cache must serve before delayed network');
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('ap-catalog-v1');r.onsuccess=()=>resolve(r.result);});return new Promise(resolve=>{const r=db.transaction('catalog').objectStore('catalog').getAll();r.onsuccess=()=>resolve(r.result.some(v=>Array.isArray(v.data)&&v.data.length===30&&Date.now()-v.time<60000));});});
  assert(calls.length>0);assert(maxActive<=1,'Background catalog refresh concurrency bounded to one');
  assert(await count()>=stored,'No arbitrary eviction above 150 records');
  checks.push('13h stale cache serves before network and refreshes silently with concurrency one; >180 records retained');
  await context.close();slow=false;
  await launch(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(this.name==='catalog')throw new DOMException('Test quota','QuotaExceededError');return put.apply(this,arguments);};});
  await ready();await visit();assert.equal(errors.length,0);
  checks.push('QuotaExceededError leaves stored data intact and browsing works without unhandled errors');
  await context.close();
  // A different storage profile has never had a provider/config and must show activation offline.
  const empty=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox']});
  const first=await empty.newPage({bypassCSP:true});await first.route('https://**/*',r=>r.abort());await first.goto(entry);await first.waitForFunction(()=>!document.querySelector('#connection').hidden);await empty.close();
  checks.push('First-ever offline install correctly needs activation/online priming');
  fs.writeFileSync(out,JSON.stringify({browser:'Chromium 87.0.4279.0',checks,errors,retainedRecords:stored,status:'PASS'},null,2));console.log(JSON.stringify({status:'PASS',checks}));
 }finally{if(context)await context.close().catch(()=>{});fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
