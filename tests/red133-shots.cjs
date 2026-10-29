const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),path=require('path');
const dist=path.resolve(process.argv[2]||'dist'),out=process.argv[3]||'artifacts/red133';fs.mkdirSync(out,{recursive:true});
const names=['AR-SUBS - The Dog Stars (2026)','AR-SUBS - Queen at Sea (2026)','AR-SUBS - Money Train (1995)','AR-AS - Kubi (2023)','AL - Peaky Blinders: The Real Story (2022)','AL - Nobody Son','AL - Alien in the Heartland','AL - Athiradi (2026)','AL - The Mummy: Resurrection','AL - Surviving Hurricane Otis'];
const cats=['RECENTLY ADDED','RECENTLY WATCHED','أفلام عربية فائقة الوضوح','أفلام أجنبية قديمه','ASIA MOVIES (MULTI-SUBS)','TOP MOVIES BLURAY (MULTI-SUBS)','TOP MOVIES 4K 3840p DOLBY AUDIO','TOP KIDS BLURAY (MULTI-SUBS)','DOCUMENTARY','ACTION'];
const hues=[10,200,35,280,150,320,60,230,0,100];
(async()=>{
const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({bypassCSP:true,viewport:{width:1920,height:1080}});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();
if(u.hostname.includes('supabase'))return r.fulfill({headers:cors,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'bench',type:'xtream',server:'https://fixture.example',username:'test',password:'test',name:'Benchmark'}]}});
if(u.pathname.startsWith('/img/')){const n=+u.pathname.match(/\d+/)[0];return r.fulfill({headers:cors,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl('+hues[n%10]+',60%,35%)"/><stop offset="1" stop-color="hsl('+(hues[n%10]+60)+',50%,12%)"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/><text x="150" y="220" font-size="38" fill="#fff" text-anchor="middle" font-family="sans-serif">POSTER '+n+'</text></svg>'});}
if(u.hostname==='fixture.example'){const a=u.searchParams.get('action');let data=[];
if(a==='get_vod_categories'||a==='get_series_categories')data=cats.map((c,i)=>({category_id:String(i+1),category_name:c}));
if(a==='get_vod_streams'||a==='get_series')data=Array.from({length:120},(_,i)=>({stream_id:i+1,series_id:i+1,name:names[i%10],category_id:String(i%3+1),stream_icon:'https://fixture.example/img/'+i+'.svg',cover:'https://fixture.example/img/'+i+'.svg',rating:String((5+i%5*0.7).toFixed(1)),added:'1700000000'}));
if(a==='get_series_info')data={info:{name:'4K-AR-TR - Arafta (2025)',cover:'https://fixture.example/img/3.svg',plot:'وسط الطبيعة الخلابة في تركيا تدور الحكاية بين الحب والانتقام',genre:'Drama / Family',releaseDate:'2025-11-20',rating:'10'},episodes:{'1':Array.from({length:50},(_,i)=>({id:i+1,title:'S01 - Episode '+(i+1),episode_num:i+1,season:1,container_extension:'mp4',info:{duration:'00:45:00'}})),'2':Array.from({length:28},(_,i)=>({id:100+i,title:'S02 - Episode '+(i+1),episode_num:i+1,season:2,container_extension:'mp4',info:{}}))}};
return r.fulfill({headers:cors,json:data});}
return r.fulfill({headers:cors,body:''});});
for(const [w,hh] of [[1920,1080],[1280,720]]){
await p.setViewportSize({width:w,height:hh});
await p.addInitScript(()=>{try{localStorage.setItem('ap-theme',''+(window.__t||'red')+'')}catch(e){}});
await p.goto('file://'+dist+'/index.html');
await p.evaluate(()=>{localStorage.setItem('ap-theme','red');});await p.reload();
await p.waitForFunction(()=>document.querySelector('#home-tiles button')&&document.querySelector('#connection').hidden);
for(const k of ['movies','series']){await p.evaluate(k=>document.querySelector('nav [data-kind="'+k+'"]').click(),k);
await p.waitForFunction(()=>document.querySelector('#items button .item-name'));await p.waitForTimeout(700);
await p.screenshot({path:out+'/grid-'+k+'-'+w+'.png'});if(w==1920&&k==='series'){console.log('CAT',await p.evaluate(()=>document.querySelector('#categories button').outerHTML));console.log('CATSEL',await p.evaluate(()=>document.querySelector('#categories button.selected').outerHTML));console.log('ITEM',await p.evaluate(()=>document.querySelector('#items button').outerHTML));console.log('HEAD',await p.evaluate(()=>document.querySelector('.section-title').outerHTML))}}
await p.evaluate(()=>document.querySelector('#items button').click());
await p.waitForFunction(()=>document.querySelectorAll('#episode-list button').length>5);await p.waitForTimeout(500);
await p.screenshot({path:out+'/detail-'+w+'.png'});if(w==1920){console.log('EP',await p.evaluate(()=>document.querySelector('#episode-list button').outerHTML));console.log('TAB',await p.evaluate(()=>document.querySelector('#season-tabs').outerHTML))}
await p.evaluate(()=>document.querySelector('#episode-list button').click());await p.waitForTimeout(800);
await p.screenshot({path:out+'/inline-'+w+'.png'});
if(await p.evaluate(()=>!!document.querySelector('#red-sub')))await p.evaluate(()=>document.querySelector('#red-sub').click());
await p.waitForTimeout(400);await p.screenshot({path:out+'/subs-'+w+'.png'});
await p.evaluate(()=>{const f=document.querySelector('#red-fs');if(f)f.click();});await p.waitForTimeout(400);await p.screenshot({path:out+'/player-'+w+'.png'});
}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
