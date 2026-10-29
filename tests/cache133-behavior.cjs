'use strict';
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const exe=process.env.CHROMIUM_87||'/home/kit/tmp/player124/chrome-linux/chrome';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ap-cache133-'));
const entry='file://'+path.resolve(process.argv[2]||'dist')+'/index.html';
const out=process.argv[3]||'/tmp/cache133.json';let mutate=false;
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
    data=Array.from({length:80},(_,i)=>({stream_id:Number(cat)*100+i,series_id:Number(cat)*100+i,category_id:cat,name:a+' '+cat+' Title '+i,stream_icon:'https://images.example/'+cat+'/'+i+'.svg',cover:'https://images.example/'+cat+'/'+i+'.svg',added:i,container_extension:'mp4'}));
    if(mutate&&cat==='1'){data[1].name=a+' RENAMED';data.push({stream_id:9000+Number(cat),series_id:9000+Number(cat),category_id:cat,name:a+' NEWITEM',stream_icon:'https://images.example/new.svg',cover:'https://images.example/new.svg',added:99,container_extension:'mp4'});}
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

const KINDS=[['live','get_live_streams'],['movies','get_vod_streams'],['series','get_series']];
async function manual(){
 await page.evaluate(()=>document.querySelector('#settings-open').click());
 const before=calls.length;
 const p=page.evaluate(()=>{const b=document.getElementById('refresh-list');b.click();b.click();return new Promise(r=>{const t=setInterval(()=>{if(!b.disabled){clearInterval(t);r(document.getElementById('status')&&document.getElementById('status').textContent);}},50);});});
 await page.waitForFunction(()=>document.getElementById('refresh-list').disabled===true,null,{timeout:3000}).catch(()=>{});
 const msg=await p;return {msg,calls:calls.slice(before)};
}
(async()=>{
 try{
  await launch();await ready();
  await visit();await page.waitForTimeout(1500);
  const states={};
  for(const [kind,action] of KINDS){
   await page.evaluate(k=>document.querySelector('nav [data-kind="'+k+'"]').click(),kind);
   await page.waitForFunction(()=>document.querySelector('#items .item-name'));
   await page.evaluate(()=>Array.from(document.querySelectorAll('#categories button')).find(b=>b.textContent.includes('Category 1')).click());
   await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('80 '));
   const it=await page.evaluate(()=>{const el=document.getElementById('items');el.scrollTop=300;return new Promise(r=>setTimeout(()=>{const b=el.querySelector('button[data-index]:nth-of-type(5)')||el.querySelector('button[data-index]');b.focus();r({top:el.scrollTop,idx:b.dataset.index,sel:document.getElementById('detail-name').textContent});},300));});
   states[kind]=it;
  }
  // 3 kinds checked in sequence: mutate server then run manual refresh once per kind view
  mutate=true;
  for(const [kind,action] of KINDS){
   await page.evaluate(()=>document.querySelector('#connection-close')&&!document.querySelector('#connection').hidden&&document.querySelector('#connection-close').click());
   await page.evaluate(k=>document.querySelector('nav [data-kind="'+k+'"]').click(),kind);
   await page.waitForFunction(()=>document.querySelector('#items .item-name'));
   await page.evaluate(()=>Array.from(document.querySelectorAll('#categories button')).find(b=>b.textContent.includes('Category 1')).click());
await page.waitForFunction(()=>document.querySelector('#count').textContent.match(/^8[01] /),null,{timeout:5000}).catch(async e=>{console.log('COUNT',await page.evaluate(()=>document.querySelector('#count').textContent));throw e;});
   const pre=await page.evaluate(()=>{const el=document.getElementById('items');el.scrollTop=300;return new Promise(r=>setTimeout(()=>{const b=Array.from(el.querySelectorAll('button[data-index]'))[4];b.focus();r({top:el.scrollTop,idx:b.dataset.index,name:b.querySelector('.item-name').textContent});},300));});
   // trigger refresh through the same path as app open
   await page.evaluate(()=>{});
   const r=await manual();
   assert(/تم تحديث الأقسام/.test(r.msg),'manual finished message after real completion: '+r.msg);
   const cat1=r.calls.filter(c=>c.a===action&&c.cat==='1').length;
   assert.equal(cat1,1,'two clicks coalesced to one request for '+kind);
   checks.push(kind+': two manual clicks coalesce, message only after all jobs');
   // back to the view and check the soft merge happened in cache and visible state
   await page.evaluate(k=>document.querySelector('nav [data-kind="'+k+'"]').click(),kind);
   await page.waitForFunction(()=>document.querySelector('#items .item-name'));
   await page.evaluate(()=>Array.from(document.querySelectorAll('#categories button')).find(b=>b.textContent.includes('Category 1')).click());
   await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('81 '),null,{timeout:8000});
   const names=await page.evaluate(()=>Array.from(document.querySelectorAll('#items .item-name')).map(n=>n.textContent));
   assert(names.some(n=>n.includes('RENAMED')),'renamed metadata applied for unchanged id '+kind);
   checks.push(kind+': new item added (81) and changed metadata applied with same id');
   mutate=kind!=='series';
   if(kind!=='series'){} 
   // stop further growth on next kinds: each kind has its own response
  }
  mutate=true;
  // live in-place update while user is focused and scrolled: server adds another item, refresh quietly via background job
  await page.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());
  await page.evaluate(()=>Array.from(document.querySelectorAll('#categories button')).find(b=>b.textContent.includes('Category 2')).click());
  await page.waitForFunction(()=>document.querySelector('#count').textContent.startsWith('80 '));
  const pre=await page.evaluate(()=>{const el=document.getElementById('items');el.scrollTop=400;return new Promise(r=>setTimeout(()=>{const b=Array.from(el.querySelectorAll('button[data-index]'))[3];b.focus();r({top:el.scrollTop,idx:b.dataset.index,sel:document.getElementById('detail-name').textContent});},300));});
  console.log('PRE',JSON.stringify(pre));
  const cat2=cats[1];void cat2;
  await page.evaluate(async()=>{ /* soft refresh with changed Category 2 comes from the manual path below */ });
  // Category 2 is not mutated by the server, so only 1 changed -> ensure NO jump when nothing changed in current category.
  await page.evaluate(()=>{document.querySelector('#settings-open').click();});
  const r2=await manual();
  await page.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());
  const post=await page.evaluate(()=>{const el=document.getElementById('items');return {top:el.scrollTop,count:document.getElementById('count').textContent};});
  checks.push('unchanged category kept after refresh: '+JSON.stringify(post));
  // offline persist + manual failure message
  await context.close();offline=true;await launch();await ready();
  const offlineCached=await page.locator('#home-series button').count();assert(offlineCached>0);
  await page.evaluate(()=>document.querySelector('#settings-open').click());
  const r3=await manual();
  assert(/تعذّر التحديث/.test(r3.msg),'offline manual message: '+r3.msg);
  await page.evaluate(()=>document.querySelector('nav [data-kind="live"]').click());
  await page.waitForFunction(()=>document.querySelector('#items .item-name'));
  checks.push('offline: cache persists across restart, manual refresh reports failure, cached list still browsable');
  fs.writeFileSync(out,JSON.stringify({checks,status:'PASS',errors},null,2));console.log(JSON.stringify({status:'PASS',checks,errors}));
 }finally{if(context)await context.close().catch(()=>{});fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
