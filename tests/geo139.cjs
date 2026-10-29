// 1.3.8 renders+assertions on Chromium 87. usage: node tests/r138.cjs [theme] [outprefix]
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path');
const theme=process.argv[2]||'red',pre=process.argv[3]||'/home/kit/tmp/r138/'+theme+'-';
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
if(a==='get_series')d=RS.series.map((e,i)=>({series_id:+e.id,name:e.name,category_id:e.categoryId,cover:e.icon,last_modified:String(9000-i),plot:e.plot}));
return r.fulfill({headers:cors,json:d});}
if(u.hostname==='images.fixture'){const i=+u.pathname.match(/p(\d)/)[1];return r.fulfill({headers:cors,contentType:'image/jpeg',body:fs.readFileSync('/home/kit/tv13-real/'+shows[i].id+'.jpg')});}
if(/tmdb|photo|image|jpg|jpeg|png|webp/i.test(u.href)){try{const resp=await r.fetch({timeout:12000});return r.fulfill({response:resp,headers:{...resp.headers(),...cors}});}catch(e){return r.fulfill({headers:cors,body:''});}}
return r.fulfill({headers:cors,body:''});});
await p.goto('file://'+path.resolve(__dirname,'../dist/index.html'));
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#connection').hidden);await p.waitForTimeout(800);
await p.screenshot({path:pre+'home.png'});
const out={};
const G=()=>p.evaluate(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};return {cat:g('#categories'),items:g('#items'),detail:g('#detail'),library:g('.library')}});
for(const k of ['live','movies','series']){await p.evaluate(k=>{(document.querySelector('nav [data-kind="'+k+'"]')||document.getElementById(k)).click();},k);await p.waitForFunction(()=>document.querySelector('#items button'));await p.waitForTimeout(900);out[k]=await G();if(k==='live'&&process.env.SHOT)await p.screenshot({path:process.env.SHOT});}
console.log(JSON.stringify(out));await b.close();})();