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
if(a&&a.endsWith('_categories'))d=cats;
if(a==='get_live_streams')d=Array.from({length:300},(_,i)=>({stream_id:i+1,name:'AR: ALFAJER '+(i+1)+(i%3?' HD':' RAW')+(i%7==0?' VERY LONG CHANNEL NAME THAT NEEDS TWO LINES TO FIT':''),category_id:String(i%8+1),stream_icon:i%5?'https://images.fixture/p'+(i%5)+'.jpg':'',program_name:'Program '+i}));
if(a==='get_vod_streams')d=Array.from({length:114},(_,i)=>({stream_id:2000+i,name:shows[i%5].title+' '+(i<5?'':i),category_id:String(i%8+1),stream_icon:'https://images.fixture/p'+(i%5)+'.jpg',backdrop_path:['https://images.fixture/p'+(i%5)+'.jpg'],added:String(9999-i),year:'2025',quality:'HD',rating:'7.5',container_extension:'mp4'}));
if(a==='get_series')d=Array.from({length:60},(_,i)=>({series_id:3000+i,name:shows[(i+2)%5].title+' '+(i<5?'':i),category_id:String(i%8+1),cover:'https://images.fixture/p'+(i%5)+'.jpg',backdrop_path:['https://images.fixture/p'+(i%5)+'.jpg'],last_modified:String(9000-i),year:'2024',seasons_count:3}));
return r.fulfill({headers:cors,json:d});}
if(u.hostname==='images.fixture'){const i=+u.pathname.match(/p(\d)/)[1];return r.fulfill({headers:cors,contentType:'image/jpeg',body:fs.readFileSync('/home/kit/tv13-real/'+shows[i].id+'.jpg')});}
return r.fulfill({headers:cors,body:''});});
await p.goto('file://'+path.resolve(__dirname,'../dist/index.html'));
await p.waitForFunction(()=>document.querySelector('#home-movies button')&&document.querySelector('#connection').hidden);await p.waitForTimeout(800);
await p.screenshot({path:pre+'home.png'});
const out={};
for(const k of ['live','movies','series']){
await p.evaluate(k=>{(document.querySelector('nav [data-kind="'+k+'"]')||document.getElementById(k)).click();},k);
await p.waitForFunction(()=>document.querySelector('#items button'));await p.waitForTimeout(900);
out[k]=await p.evaluate(()=>{const it=document.getElementById('items'),f=it.querySelector('button'),ir=it.getBoundingClientRect(),fr=f.getBoundingClientRect();return {itemsTop:Math.round(ir.top),firstTop:Math.round(fr.top),gap:Math.round(fr.top-ir.top),scrollTop:it.scrollTop,emptyCounts:[...document.querySelectorAll('#categories small')].filter(s=>!s.textContent.trim()&&getComputedStyle(s).display!=='none').length,activeFocus:document.activeElement.id||document.activeElement.tagName};});
await p.screenshot({path:pre+k+'.png'});}
console.log(JSON.stringify({theme,out,errors},null,1));await b.close();})();
