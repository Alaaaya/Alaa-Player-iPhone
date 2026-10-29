const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path');
(async()=>{
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({bypassCSP:true,viewport:{width:1920,height:1080}}),cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
let offline=false;let requests=[];const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
await p.route('**/*',async r=>{
const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'bench',type:'xtream',server:'https://fixture.example',username:'test',password:'test',name:'Benchmark'}]}});
if(u.hostname==='fixture.example'){if(offline)return r.abort();
const a=u.searchParams.get('action'),cat=u.searchParams.get('category_id');requests.push({a,cat});
let data=[];if(a==='get_vod_categories'||a==='get_series_categories')data=[{category_id:'1',category_name:'Films'},{category_id:'2',category_name:'Other'}];
if(a==='get_vod_streams'||a==='get_series')data=Array.from({length:180},(_,i)=>({stream_id:i+1,series_id:i+1,name:'Title '+i,category_id:'1',stream_icon:'https://images.fixture/poster.svg',cover:'https://images.fixture/poster.svg'}));
if(a==='get_series_info')data={info:{name:'Test Series',cover:''},episodes:{'1':Array.from({length:65},(_,i)=>({id:i+1,title:'Episode '+(i+1),episode_num:i+1,container_extension:'mp4',info:{duration:'00:45:00'}}))}};
if(a==='get_live_categories')data=Array.from({length:100},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
if(a==='get_live_streams')data=Array.from({length:cat?567:56700},(_,i)=>({stream_id:(cat?Number(cat)*1000:0)+i+1,name:'Channel '+i,category_id:cat||String(Math.floor(i/567)+1),stream_icon:''}));
await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({headers:cors,json:data});}
if(u.hostname==='images.fixture')return r.fulfill({headers:cors,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400"><rect width="720" height="400" fill="#253f5b"/><text x="80" y="200" fill="#fff" font-size="44">PROVIDER FIXTURE</text></svg>'});return r.fulfill({headers:cors,body:''});
});


const assert=require('assert/strict'),result={checks:[]},errors=[];p.on('pageerror',e=>errors.push(e.message));
const colors={apple:{bg:'rgb(21, 21, 23)',panel:'rgb(36, 36, 38)',accent:'rgb(238, 238, 240)'},navy:{bg:'rgb(11, 19, 32)',panel:'rgb(17, 27, 45)',accent:'rgb(237, 53, 73)'},red:{bg:'rgb(16, 16, 16)',panel:'rgb(30, 30, 30)',movieCard:'rgb(26, 26, 26)',catBg:'rgba(0, 0, 0, 0)',episode:'rgb(21, 21, 21)',accent:'rgb(237, 53, 73)'},blue:{bg:'rgb(10, 21, 38)',panel:'rgb(17, 36, 61)',accent:'rgb(49, 139, 234)'}};
const entry='file://'+path.resolve(process.argv[2]||'dist')+'/index.html';
async function ready(){await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#home-series button')&&document.querySelector('#connection').hidden);await p.waitForTimeout(350);}
async function bg(){} 
async function shot(label){
 await p.waitForTimeout(90);
 const state=await p.evaluate(()=>{
 const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();
 return {tag:e.tagName,id:e.id,cls:e.className,outline:s.outlineStyle,shadow:s.boxShadow,radii:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius],rect:{x:r.x,y:r.y,w:r.width,h:r.height},pseudo:[':before',':after'].map(x=>({outline:getComputedStyle(e,x).outlineStyle,shadow:getComputedStyle(e,x).boxShadow})),focused:document.querySelectorAll(':focus').length};
 });
 assert.notEqual(state.tag,'BODY',label+' no focus');assert.equal(state.outline,'none',label+JSON.stringify(state));assert.ok(state.shadow.includes('inset'),label+JSON.stringify(state));assert.equal(state.focused,1);assert(state.rect.w>0&&state.rect.h>0);assert(state.rect.x>=-1&&state.rect.y>=-1&&state.rect.x+state.rect.w<=width+1&&state.rect.y+state.rect.h<=width*9/16+1,label+' offscreen '+JSON.stringify(state));
 result.checks.push({theme,width,label,...state});
 await p.screenshot({path:'/home/kit/tmp/focus136/app-'+theme+'-'+width+'-'+label+'.png'});
}
async function keyshot(selector,key,label){
 await p.locator(selector).first().focus();await p.keyboard.press(key);await shot(label);
}
let theme,width;
async function route(id){await p.evaluate(id=>{var el=document.getElementById(id)||document.querySelector('nav [data-kind="'+id+'"]');el.click();},id);await p.waitForTimeout(300);}
await p.goto(entry);await ready();assert.equal(await p.evaluate(()=>document.body.dataset.theme),'apple','Unset preference defaults Apple');
assert.equal(await p.evaluate(()=>localStorage.getItem('ap-theme')),null,'Startup does not migrate preference');
for(width of [1920,1280]){
await p.setViewportSize({width,height:width===1920?1080:720});
for(theme of ['apple','navy','red','blue']){
const c=colors[theme];await route('settings-open');assert(await p.locator('#theme-picker').isVisible());
await p.locator('#theme-'+theme).focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.body.dataset.theme),theme);
assert.equal(await p.evaluate(()=>localStorage.getItem('ap-theme')),theme);
assert.equal(await p.locator('#theme-picker button.selected').count(),1);await bg('#connection',c.bg,'Settings surface');await keyshot('#theme-'+theme,'ArrowRight','settings');
await p.reload();await ready();assert.equal(await p.evaluate(()=>document.body.dataset.theme),theme,'Valid preference persists on reload');
await bg('#screen',c.bg,'Home');await keyshot('#nav-home','ArrowDown','sidebar');await route('nav-home');await keyshot('#home-tiles button','ArrowRight','home-tiles');await route('nav-home');await keyshot('#home-movies button','ArrowRight','home-posters');await route('nav-home');await bg('#home-play',c.accent,'Home primary CTA follows theme');await bg('#hero-dots button.selected',c.accent,'Hero selected indicator follows theme');await bg('nav button.selected',c.accent,'Home sidebar');
await p.locator('[data-home-tile="movies"]').click();await p.waitForFunction(()=>document.querySelector('#home-inline-items button'));await bg('#home-tiles button.selected',c.accent,'Inline selected tile');await bg('#home-inline-items button',c.panel,'Inline card');
await route('movies');await p.waitForFunction(()=>document.querySelector('#items button .item-name')&&document.querySelector('#items button .item-name').textContent.startsWith('Title'));
await keyshot('#items button','ArrowRight','movies-posters');await keyshot('#categories button','ArrowDown','categories');await bg('#items button:nth-of-type(2)',c.movieCard||c.panel,'Movies');await bg('#categories',c.catBg||c.bg,'Movie categories');
await p.locator('#items button').first().click();await p.waitForFunction(()=>!document.querySelector('#movie-detail').hidden&&document.querySelector('#movie-related button'));
await keyshot('#movie-play','ArrowRight','movie-detail');await bg('#movie-detail',c.bg,'Movie detail');await bg('#movie-related button',c.panel,'Related movies');
const rect=await p.locator('#movie-detail').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1,'Movie layout preserved');
await route('series');await p.waitForFunction(()=>document.querySelector('#items button .item-name')&&document.querySelector('#items button .item-name').textContent.startsWith('Title'));
await p.locator('#items button').first().click();await p.waitForFunction(()=>document.querySelector('#episode-list button'));
await keyshot('#episode-list button','ArrowDown','episode-rows');await keyshot('#season-tabs button','Enter','season-chips');assert(await p.evaluate(()=>document.querySelector('#season-tabs').contains(document.activeElement)));await bg('#series-detail',c.bg,'Series detail');await bg('#episode-list button',c.episode||c.panel,'Episode grid');
await p.locator('#episode-list button').first().focus();await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.dataset.episodeIndex),c===colors.red?'1':'5');await p.keyboard.press('Enter');assert(await p.locator('#player').isVisible());await p.keyboard.press('Escape');
for(const id of ['nav-favorites','nav-recent','nav-search','settings-open']){await route(id);if(id==='settings-open')await keyshot('#theme-picker button','ArrowRight',id);else {await keyshot('#items button, #search, #top-search','ArrowRight',id);}await bg('#screen',c.bg,id);assert.equal(await p.locator('nav button.selected').count(),1);}
await route('live');await p.waitForFunction(()=>document.querySelector('#items .item-name')&&document.querySelector('#items .item-name').textContent.startsWith('Channel'));
await keyshot('#items button','ArrowDown','live-rows');await p.keyboard.down('Enter');await p.waitForTimeout(800);await p.keyboard.up('Enter');await p.waitForSelector('#organize-panel');await p.keyboard.press('ArrowDown');await shot('organize-dialog');await p.keyboard.press('Escape');await bg('#detail',c.panel,'Live preview');await p.locator('#items button').first().click();await p.waitForTimeout(600);assert.equal(await p.locator('#player').getAttribute('data-playback-kind'),'live');assert.equal(await p.locator('#player-ui').isVisible(),false,'Live hides VOD controls');assert(await p.locator('#live-now').isVisible(),'Live info bar');assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('#live-now')).backdropFilter||'none'),'none');assert(!/^\s*\d+\s*$/.test(await p.locator('#live-now strong').textContent()),'channel name distinct from ordinal');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowUp');assert.equal(await p.evaluate(()=>{var z=document.querySelector('#zap-banner');return z.hidden||!/\d/.test(z.textContent);}),true,'obsolete zap element stays hidden');await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.querySelector('#quick-channels').hidden);await p.waitForTimeout(700);assert(await p.locator('#quick-channels').isVisible());await bg('#quick-channels','rgba(24, 26, 32, 0.96)','Default OFF channel overlay');assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('#quick-channels')).backdropFilter||'none'),'none','Default OFF overlay has no blur');await p.keyboard.press('ArrowDown');await shot('channel-overlay');await bg('#quick-list button:focus','rgba(255, 255, 255, 0.97)','Overlay focus');await p.keyboard.press('Escape');await p.keyboard.press('Escape');
await route('nav-home');await p.screenshot({path:'/home/kit/tmp/focus136/app-'+theme+'-'+width+'-home.png'});
result.checks.push({width,theme,status:'PASS',routes:'Home,inline,live,movies,movie detail,series episode grid,favorites,recent,search,settings,player OK overlay',persistence:true});
}
}
assert.deepEqual(errors,[]);result.defaultApple=true;result.noPreferenceMigration=true;fs.writeFileSync(process.argv[3]||'/home/kit/tmp/focus136/app.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
