const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),assert=require('assert/strict');
const path=require('path');
const EXE=process.env.CHROMIUM_87||'/home/kit/tmp/player124/chrome-linux/chrome';
(async()=>{const video=fs.readFileSync('/home/kit/tmp/ovfix/clip4.webm');const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const res=[];
const m3u=(g1,g2,g3)=>'#EXTM3U\n#EXTINF:-1 group-title="'+g1+'",Alpha News\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="'+g2+'",Beta Sport\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="'+g3+'",Gamma Docs\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="Other",Delta Mix\nhttps://f.example/c.webm\n';
const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
for(const lang of ['en'])for(const theme of ['apple','navy','red','blue'])for(const W of [1920,1280]){
 const c=await b.newContext({viewport:{width:W,height:W*9/16}}),p=await c.newPage();
 await p.addInitScript(([t,l])=>{localStorage.setItem('ap-theme',t);if(l!=='ar')localStorage.setItem('ap-lang',l)},[theme,lang]);
 await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();if(u.hostname.includes('supabase'))return r.fulfill({headers:h,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'lf',type:'m3u',url:'https://f.example/l.m3u',name:'L'}]}});if(u.pathname==='/l.m3u')return r.fulfill({headers:h,body:m3u('  alpha   NEWS ','','Documentary')});if(u.pathname==='/c.webm')return r.fulfill({headers:{...h,'content-type':'video/webm'},body:video});return r.fulfill({headers:h,body:''})});
 await p.goto('file://'+path.resolve(__dirname,'../dist/index.html'));await p.waitForSelector('#home-tiles button',{timeout:15000});
 await p.locator('nav [data-kind=live]').click();await p.waitForSelector('#items button');

 const out={lang,theme,W,cases:[]};
 await p.locator('#items button').first().click();
 await p.waitForSelector('#live-pause');
 await p.waitForTimeout(600);
 await p.keyboard.press('ArrowUp');
 await p.keyboard.press('ArrowUp');
 await p.keyboard.press('ArrowLeft');
 await p.keyboard.press('ArrowLeft');
 for(const target of ['live-prev','live-pause','live-next','live-sub','live-favorite','live-settings']){
  assert.equal(await p.evaluate(()=>document.activeElement.id),target);
  const state=await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return {id:e.id,outline:s.outlineStyle,shadow:s.boxShadow,radius:s.borderRadius,w:r.width,h:r.height,before:getComputedStyle(e,':before').outlineStyle,after:getComputedStyle(e,':after').outlineStyle}});
  assert.equal(state.outline,'none'); assert.notEqual(state.shadow,'none');assert.equal(state.radius,'50%');assert.ok(Math.abs(state.w-state.h)<1);
  out.cases.push(state);
  if(target==='live-pause')await p.screenshot({path:'/home/kit/tmp/focus136/live-'+theme+'-'+W+'.png'});
  await p.keyboard.press('ArrowRight');
 }
 await p.keyboard.press('ArrowDown'); assert.equal(await p.evaluate(()=>document.activeElement.id),'live-list');
 res.push(out);console.log(lang,theme,'ok');await c.close()}
fs.writeFileSync('/home/kit/tmp/focus136/live.json',JSON.stringify(res,null,1));await b.close()})().catch(e=>{console.log('FAIL',e.message.slice(0,600));process.exit(1)});