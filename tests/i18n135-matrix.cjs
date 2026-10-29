// Full ar/de/en x 4 themes x 2 sizes UI matrix against a real provider. Needs /tmp/.prov133.json and CHROMIUM_87 (defaults to known binary).
const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs');
const EXE=process.env.CHROMIUM_87||'/home/kit/tmp/player124/chrome-linux/chrome';
const P=JSON.parse(fs.readFileSync('/tmp/.prov133.json'));
const OUT='/home/kit/tmp/player135/matrix';fs.mkdirSync(OUT,{recursive:true});
const provider={id:'realtest',type:'xtream',name:'t',server:P.server,username:P.username,password:P.password};
const only=process.argv[2]?process.argv[2].split(','):null;
const AR=/[\u0600-\u06FF]/;
(async()=>{const b=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox']});const rows=[];
for(const lang of ['ar','de','en'])for(const theme of ['apple','navy','red','blue'])for(const width of [1920,1280]){
 if(only&&!only.includes(lang+'-'+theme+'-'+width))continue;
 const c=await b.newContext({viewport:{width,height:Math.round(width*9/16)}}),p=await c.newPage();const prov=new Set(),errs=[];
 await p.addInitScript(t=>{localStorage.setItem('ap-theme',t)},theme);
 await p.route(/supabase\.co/,r=>r.fulfill({headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},json:r.request().url().includes('register_device')?{}:{status:'active',expires_at:'2028-01-01',playlists:[provider]}}));
 p.on('response',async r=>{try{if((r.headers()['content-type']||'').includes('json')&&r.url().includes('player_api')){const j=await r.json();(function w(o){if(typeof o==='string')prov.add(o);else if(o&&typeof o==='object')for(const k in o)w(o[k])})(j)}}catch(e){}});
 p.on('pageerror',e=>errs.push(String(e.message).slice(0,100)));
 await p.goto('file:///home/kit/player135/dist/index.html');await p.waitForSelector('#home-movies button',{timeout:40000}).catch(()=>{});await p.waitForTimeout(3000);
 // choose language via the picker, test persistence by reload
 await p.keyboard.press('Escape');
 await p.click('#settings-open').catch(()=>{});await p.waitForTimeout(500);
 if(lang!=='ar'){await Promise.all([p.waitForNavigation({timeout:20000}).catch(()=>{}),p.click('#lang-'+lang)]);await p.waitForSelector('#home-movies button',{timeout:40000}).catch(()=>{});await p.waitForTimeout(2500)}
 const st=await p.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,saved:localStorage.getItem('ap-lang')}));
 await p.reload();await p.waitForSelector('#home-movies button',{timeout:40000}).catch(()=>{});await p.waitForTimeout(2000);
 const st2=await p.evaluate(()=>({lang:document.documentElement.lang,theme:localStorage.getItem('ap-theme')}));
 const provArr=[...prov];
 const scan=async name=>{const left=await p.evaluate(({provArr,ar})=>{const re=new RegExp(ar);const pv=new Set(provArr);const words=new Set();provArr.forEach(s=>s.split(/[\s|()\-·:,.؟!/]+/).forEach(w=>w&&words.add(w)));const inProv=t=>pv.has(t)||provArr.some(s=>s.length>=t.length&&s.includes(t))||(()=>{const ws=t.split(/[\s|()\-·:,.؟!/]+/).filter(w=>w&&/[\u0600-\u06FF]/.test(w));return ws.length>0&&ws.every(w=>words.has(w))})();const out=[],ovf=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('[hidden]')||/^(SCRIPT|STYLE)$/.test(e.tagName)||e.closest('#lang-picker'))return;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).join(' ').trim();if(t&&re.test(t)&&!inProv(t)&&!(t.split(/ [·|] /).every(x=>inProv(x.trim()))))out.push(t.slice(0,50));['aria-label','placeholder','title'].forEach(a=>{const v=e.getAttribute(a);if(v&&re.test(v)&&!inProv(v))out.push(a+':'+v)});if(t&&e.children.length===0&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).textOverflow!=='ellipsis'&&getComputedStyle(e).overflow==='visible'&&e.clientWidth>0)ovf.push(t.slice(0,30))});return {out:[...new Set(out)],ovf:[...new Set(ovf)].slice(0,5)}},{provArr,ar:AR.source});
  await p.screenshot({path:OUT+'/'+lang+'-'+theme+'-'+width+'-'+name+'.png'});return {screen:name,arabic:lang==='ar'?undefined:left.out,ovf:left.ovf}};
 const shots=[];
 shots.push(await scan('home'));
 for(const [name,sel] of [['live','nav button[data-kind=live]'],['movies','nav button[data-kind=movies]'],['series','nav button[data-kind=series]'],['favorites','#nav-favorites'],['recent','#nav-recent'],['search','#nav-search']]){await p.click(sel).catch(()=>{});await p.waitForTimeout(3500);shots.push(await scan(name))}
 // movie detail
 await p.click('nav button[data-kind=movies]').catch(()=>{});await p.waitForTimeout(3500);await p.click('#items button, #movie-shelf button').catch(()=>{});await p.waitForTimeout(3000);
 shots.push(await scan(await p.evaluate(()=>document.getElementById('movie-detail').hidden?'movie-detail(not-open)':'movie-detail')));
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 await p.click('nav button[data-kind=series]').catch(()=>{});await p.waitForTimeout(3500);await p.click('#items button').catch(()=>{});await p.waitForTimeout(4500);
 shots.push(await scan(await p.evaluate(()=>document.getElementById('series-detail').hidden?'series-detail(not-open)':'series-detail')));
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 // live player + error state
 await p.click('nav button[data-kind=live]').catch(()=>{});await p.waitForTimeout(3500);await p.click('#items button').catch(()=>{});await p.waitForTimeout(800);await p.keyboard.press('Enter');await p.waitForTimeout(9000);
 shots.push(await scan(await p.evaluate(()=>document.getElementById('player').hidden?'player(not-open)':'player')));
 await p.keyboard.press('Enter').catch(()=>{});await p.waitForTimeout(800);shots.push(await scan('player-ui'));
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 // settings
 await p.click('#settings-open').catch(()=>{});await p.waitForTimeout(800);await p.click('#manual-toggle').catch(()=>{});await p.waitForTimeout(500);shots.push(await scan('settings'));
 rows.push({lang,theme,width,persist:st,after:st2,errs,provCount:prov.size,shots:shots.map(s=>({s:s.screen,ar:s.arabic,ovf:s.ovf}))});
 fs.writeFileSync(OUT+'/matrix.json',JSON.stringify(rows,null,1));console.log(lang,theme,width,'done');
 await c.close()}
await b.close()})();