const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs'),assert=require('assert/strict');
const EXE=process.env.CHROMIUM_87||'/home/kit/tmp/player124/chrome-linux/chrome';
(async()=>{const video=fs.readFileSync('/home/kit/tmp/ovfix/clip4.webm');const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const res=[];
const m3u=(g1,g2,g3)=>'#EXTM3U\n#EXTINF:-1 group-title="'+g1+'",Alpha News\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="'+g2+'",Beta Sport\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="'+g3+'",Gamma Docs\nhttps://f.example/c.webm\n#EXTINF:-1 group-title="Other",Delta Mix\nhttps://f.example/c.webm\n';
const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
for(const lang of ['ar','de','en'])for(const theme of ['apple','navy','red','blue']){
 const c=await b.newContext({viewport:{width:1920,height:1080}}),p=await c.newPage();
 await p.addInitScript(([t,l])=>{localStorage.setItem('ap-theme',t);if(l!=='ar')localStorage.setItem('ap-lang',l)},[theme,lang]);
 await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.protocol==='file:')return r.continue();if(u.hostname.includes('supabase'))return r.fulfill({headers:h,json:u.pathname.includes('register_device')?{}:{status:'active',playlists:[{id:'lf',type:'m3u',url:'https://f.example/l.m3u',name:'L'}]}});if(u.pathname==='/l.m3u')return r.fulfill({headers:h,body:m3u('  alpha   NEWS ','','Documentary')});if(u.pathname==='/c.webm')return r.fulfill({headers:{...h,'content-type':'video/webm'},body:video});return r.fulfill({headers:h,body:''})});
 await p.goto('file:///home/kit/player135/dist/index.html');await p.waitForSelector('#home-tiles button',{timeout:15000});
 await p.locator('nav [data-kind=live]').click();await p.waitForSelector('#items button');
 const out={lang,theme,cases:[]};
 for(const [i,name,want] of [[0,'equal(case/space)',false],[1,'empty',false],[2,'distinct',true],[3,'legit Other',true]]){
  await p.locator('#items button').nth(i).click();await p.waitForFunction(()=>!document.getElementById('player').hidden);await p.waitForSelector('#live-now',{timeout:5000}).catch(()=>{});
  await p.waitForTimeout(400);
  const s=await p.evaluate(()=>{const v=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;const sub=document.querySelector('.live-channel-name'),el=document.getElementById('live-elapsed');return {sub:v(sub),subText:sub&&sub.textContent,el0:v(el),elText:el&&el.textContent,title:document.querySelector('.live-channel-text strong')?.textContent,badge:document.querySelector('.live-badge')?.textContent}});
  assert.equal(s.sub,want,name+' '+theme+' '+JSON.stringify(s));assert.equal(s.el0,false,'zero timer visible '+JSON.stringify(s));
  if(i===2){await p.waitForTimeout(1600);const e2=await p.evaluate(()=>{const el=document.getElementById('live-elapsed');return {v:!el.hidden&&getComputedStyle(el).display!=='none',t:el.textContent}});assert.equal(e2.v,true);assert.notEqual(e2.t,'00:00:00');s.elAfter=e2.t;await p.screenshot({path:'/home/kit/tmp/player135/live135-'+lang+'-'+theme+'.png'})}
  out.cases.push({name,...s});await p.keyboard.press('Escape');await p.waitForTimeout(300);}
 res.push(out);console.log(lang,theme,'ok');await c.close()}
fs.writeFileSync('/home/kit/tmp/player135/live135.json',JSON.stringify(res,null,1));await b.close()})().catch(e=>{console.log('FAIL',e.message.slice(0,600));process.exit(1)});