const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',args:['--no-sandbox'],headless:true});try{
const c=await b.newContext({bypassCSP:true,viewport:{width:1920,height:1080}}),p=await c.newPage(),errors=[],calls=[],bindings=[];let hidden=['1'],revision='a',status='active',offline=false,schema=1,configDelay=0;
p.on('pageerror',e=>{console.log(e.stack);errors.push(e.message)});
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();if(r.request().method()==='OPTIONS')return r.fulfill({headers,body:''});
if(u.hostname.includes('supabase')){if(offline)return r.abort();assert(!u.searchParams.has('p_device_token'));const body=r.request().postDataJSON();assert.match(body.p_device_code,/^[A-F0-9]{12}$/);assert.match(body.p_device_token,/^[a-f0-9]{64}$/);bindings.push(body);if(u.pathname.endsWith('/register_device_v2')){assert.equal(body.p_app_type,'alaa_player');return r.fulfill({headers,json:{status:'registered'}});}assert(u.pathname.endsWith('/get_device_config_v2'));if(configDelay)await new Promise(res=>setTimeout(res,configDelay));return r.fulfill({headers,json:{status,playlists:status==='active'?[{id:'playlist-a',name:'Fixture',type:'xtream',server:'http://fixture.example',username:'fixture-u',password:'fixture-p',category_settings_version:schema,category_provider_generation:'11111111-1111-4111-8111-111111111111',category_config_revision:'hc1_'+revision.repeat(64),hidden_category_ids:{live:hidden,vod:hidden,series:hidden}}]:[]}});}
if(u.hostname==='fixture.example'){const a=u.searchParams.get('action'),cat=u.searchParams.get('category_id');calls.push({a,cat});let data=[];if(a.endsWith('_categories'))data=[{category_id:'1',category_name:'HiddenGroup'},{category_id:'2',category_name:'AllowedGroup'}];else if(['get_live_streams','get_vod_streams','get_series'].includes(a)){assert(cat,'unfiltered request');data=[{stream_id:cat+'0',series_id:cat+'0',name:cat==='1'?'SECRET HIDDEN TITLE':'Allowed title',category_id:cat},{stream_id:'999',series_id:'999',name:'SECRET HIDDEN TITLE',category_id:'1'},{stream_id:'998',name:'Unknown Membership'}];}else if(a.endsWith('_info'))data={info:{plot:'Description'},episodes:{'1':[{id:201,title:'Episode'}]}};return r.fulfill({headers,json:data});}
return r.fulfill({headers,body:''});});
await p.goto('file://'+path.resolve('dist/index.html'));
await p.waitForFunction(()=>document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);
assert(!calls.some(x=>x.cat==='1'));assert(calls.filter(x=>x.cat).length>=3);
assert(!(await p.locator('body').innerText()).includes('SECRET HIDDEN TITLE'));
const code=bindings[0].p_device_code,token=bindings[0].p_device_token;
assert(!(await p.evaluate(()=>JSON.stringify(localStorage))).includes(token));
const stored=await p.evaluate(async()=>{const db=await new Promise((res,rej)=>{let q=indexedDB.open('ap-catalog-v1');q.onsuccess=()=>res(q.result);q.onerror=rej;});return new Promise(res=>{const q=db.transaction('catalog').objectStore('catalog').getAll();q.onsuccess=()=>res(q.result.map(x=>({sealed:x.sealed,key:x.key&&x.key.extractable,plain:JSON.stringify(x)})));});});
assert(stored.every(x=>x.sealed===1||x.key===false));assert(!JSON.stringify(stored).includes('fixture-p'));
await p.reload();await p.waitForFunction(()=>document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);
assert.equal(bindings.at(-1).p_device_code,code);assert.equal(bindings.at(-1).p_device_token,token);
configDelay=4000;await p.reload();await p.waitForFunction(()=>document.querySelector('#home-series button'),{},{timeout:2000});assert(await p.locator('#sync').isDisabled(),'cache displays while config still pending');await p.waitForFunction(()=>!document.querySelector('#sync').disabled);configDelay=0;
schema=2;await p.reload();await p.waitForFunction(()=>document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);assert(!calls.some(x=>x.cat==='1'),'malformed boot preserves known hidden policy');await p.waitForFunction(()=>!document.querySelector('#sync').disabled);schema=1;
offline=true;await p.reload();await p.waitForFunction(()=>document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);assert(!(await p.locator('body').innerText()).includes('SECRET HIDDEN TITLE'));offline=false;
await p.waitForFunction(()=>!document.querySelector('#sync').disabled);hidden=[];revision='b';const before=calls.length;await p.locator('#settings-open').click();await p.locator('#sync').click();await p.waitForFunction(()=>!document.querySelector('#sync').disabled);await p.waitForTimeout(900);
assert(!calls.slice(before).some(x=>x.cat==='1'),'unhide is lazy');
hidden=['2'];revision='c';await p.locator('#sync').click();await p.waitForFunction(()=>!document.querySelector('#sync').disabled);await p.waitForTimeout(800);
assert(!(await p.locator('#home-movies').innerText()).includes('Allowed title'));
status='expired';await p.locator('#sync').click();await p.waitForFunction(()=>!document.querySelector('#sync').disabled);
assert(await p.locator('#connection').isVisible());assert.equal(await p.locator('#home-movies button').count(),0);
assert.deepEqual(errors,[]);console.log('PAIRING137_PASS secure identity/encrypted cache, HTTP, category-first filtering, scoped IDs, reload, lazy unhide, purge, expiry');await c.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
