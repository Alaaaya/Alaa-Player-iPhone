// Aya real-snapshot render harness, Chromium 87. No live credentials used.
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path');
const theme='aya',pre='/home/kit/aya_';
const shows=JSON.parse(fs.readFileSync('/home/kit/tv13-real/shows.json','utf8'));
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
(async()=>{
fs.mkdirSync(path.dirname(pre),{recursive:true});
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({bypassCSP:true,viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(t=>{localStorage.setItem('ap-theme',t);},theme);
const catNames=['AR| EGYPT 4K','AR| MOROCCO 24/7 RAW','AR| ROTANA & ART 4K ► نا','AR| STARZ PLAY 4K ► بلاي ستارز','4K 3840P DOLBY AUDIO ARABIC','أفلام أجنبية قديمة','NETFLIX DOCU-MOVIES','TOP KIDS BLURAY (MULTI-SUB)'];
const cats=catNames.map((n,i)=>({category_id:String(i+1),category_name:n}));
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{status:'registered'}:{status:'active',playlists:[{id:'t',type:'xtream',server:'http://fixture.example',username:'u',password:'p',name:'Provider'}]}});
if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');let d=[];
const RS=JSON.parse(fs.readFileSync('/home/kit/tmp/r138/realsub.json','utf8'));const ck=a&&(a.includes('live')?'live':a.includes('vod')?'movie':'series');if(a&&a.endsWith('_categories'))d=RS.cats[ck].map(c=>({category_id:c.id,category_name:c.name}));
if(a==='get_live_streams')d=RS.live.map(e=>({stream_id:+e.id,name:e.name,category_id:e.categoryId,stream_icon:e.icon,program_name:''}));
if(a==='get_vod_streams')d=RS.movie.map((e,i)=>({stream_id:+e.id,name:e.name,category_id:e.categoryId,stream_icon:e.icon,added:String(9999-i),container_extension:'mp4'}));
if(a==='get_series_info'){
d=JSON.parse(fs.readFileSync('/home/kit/tmp/aya-series-subtitled-real.json'));
}
if(a==='get_vod_info'){const e=RS.movie.find(e=>e.id===u.searchParams.get('vod_id'))||RS.movie[0];d={info:{name:e.name,plot:e.plot,movie_image:e.icon}};}
if(a==='get_series')d=[JSON.parse(fs.readFileSync('/home/kit/tmp/ua/private/snapshot.json')).entries.find(e=>e.kind==='series'&&e.id==='38112')].concat(RS.series).map((e,i)=>({series_id:+e.id,name:e.name,category_id:e.categoryId,cover:e.icon,last_modified:String(9000-i),plot:e.plot}));
return r.fulfill({headers:cors,json:d});}
if(u.hostname==='images.fixture'){const i=+u.pathname.match(/p(\d)/)[1];return r.fulfill({headers:cors,contentType:'image/jpeg',body:fs.readFileSync('/home/kit/tv13-real/'+shows[i].id+'.jpg')});}
if(/tmdb|photo|image|jpg|jpeg|png|webp/i.test(u.href)){try{const resp=await r.fetch({timeout:12000});return r.fulfill({response:resp,headers:{...resp.headers(),...cors}});}catch(e){return r.fulfill({headers:cors,body:''});}}
return r.fulfill({headers:cors,body:''});});
await p.goto('file://'+path.resolve(__dirname,'../dist/index.html'));
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#connection').hidden);await p.waitForTimeout(5000);
const ayaHome=await p.evaluate(()=>({counts:[...document.querySelectorAll('#home-shelves .home-posters')].map(e=>e.querySelectorAll('button').length),tag:document.getElementById('home-meta').textContent,title:document.getElementById('home-title').textContent,poster:!!document.getElementById('aya-hero-card'),play:document.getElementById('home-play').getBoundingClientRect().bottom,hero:document.getElementById('home-hero').getBoundingClientRect().bottom}));
require('assert').deepStrictEqual(ayaHome.counts,[4,4]);require('assert')(ayaHome.poster);require('assert')(!/^AR-TR-/.test(ayaHome.title));require('assert')(ayaHome.play<=ayaHome.hero);console.log('Aya140 home',ayaHome);
await p.screenshot({path:pre+'home.png'});
const out={};
for(const k of ['live','movies','series']){
await p.evaluate(k=>{(document.querySelector('nav [data-kind="'+k+'"]')||document.getElementById(k)).click();},k);
await p.waitForFunction(()=>document.querySelector('#items button'));await p.waitForTimeout(900);
out[k]=await p.evaluate(()=>{const it=document.getElementById('items'),f=it.querySelector('button'),ir=it.getBoundingClientRect(),fr=f.getBoundingClientRect();return {itemsTop:Math.round(ir.top),firstTop:Math.round(fr.top),gap:Math.round(fr.top-ir.top),scrollTop:it.scrollTop,emptyCounts:[...document.querySelectorAll('#categories small')].filter(s=>!s.textContent.trim()&&getComputedStyle(s).display!=='none').length,activeFocus:document.activeElement.id||document.activeElement.tagName};});
await p.locator('#items button').first().focus();
await p.screenshot({path:pre+k+'.png'});
if(k==='movies'||k==='series'){
await p.locator('#items button').first().click();
await p.waitForFunction(k=>!document.getElementById(k==='movies'?'movie-detail':'series-detail').hidden,k);
await p.waitForTimeout(1800);
if(k==='series'){
const tabs=await p.locator('#season-tabs button').allTextContents();
require('assert/strict').equal(tabs.length,2);
await p.locator('#season-tabs button').nth(1).click();
await p.waitForTimeout(300);
require('assert/strict').equal(await p.locator('#episode-list button').count(),4);
out.subtitledSeries={id:'38112',tabs,selectedSeason:'2',episodes:4};
}
await p.screenshot({path:pre+(k==='movies'?'movie-detail':'series-detail')+'.png'});
}
}
await p.evaluate(()=>document.getElementById('nav-home').click());
await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('settings-open').click());
await p.waitForTimeout(400);
await p.waitForTimeout(7200);
await p.locator('#theme-aya').focus();
await p.screenshot({path:pre+'settings.png'});
out.themeChoices=await p.locator('#theme-picker button').count();
out.saved=await p.evaluate(()=>localStorage.getItem('ap-theme'));
out.focus=await p.locator('#theme-aya').evaluate(e=>getComputedStyle(e).boxShadow);

const assert=require('assert/strict');assert.equal(out.themeChoices,5);assert.equal(out.saved,'aya');assert.equal(errors.length,0);assert(out.focus.includes('194, 48, 111'));for(const k of ['movies','series'])assert.equal(out[k].gap,0);
console.log(JSON.stringify({theme,out,errors},null,1));await b.close();})();
