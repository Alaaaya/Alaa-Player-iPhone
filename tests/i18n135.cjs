const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs');
const P=JSON.parse(fs.readFileSync('/tmp/.prov133.json'));
const OUT='/home/kit/tmp/player135/shots';fs.mkdirSync(OUT,{recursive:true});
const provider={id:'realtest',type:'xtream',name:'t',server:P.server,username:P.username,password:P.password};
(async()=>{const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--disable-web-security']});const res=[];
for(const lang of ['ar','de','en'])for(const theme of ['apple','red']){
const c=await b.newContext({viewport:{width:1920,height:1080}}),p=await c.newPage();
await p.addInitScript(([l,t])=>{localStorage.setItem('ap-theme',t);localStorage.setItem('ap-lang',l)},[lang,theme]);
await p.route(/supabase\.co/,r=>r.fulfill({headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},json:r.request().url().includes('register_device')?{}:{status:'active',expires_at:'2028-01-01',playlists:[provider]}}));
await p.goto('file:///home/kit/player135/dist/index.html');await p.waitForTimeout(9000);
const scan=()=>p.evaluate(()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('[hidden]')||e.closest('#home-movies,#home-series,#home-recent,#items,#hero-copy h2,#home-title,#home-description,#home-meta'))return;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).join(' ');if(/[\u0600-\u06FF]/.test(t))out.push(t.slice(0,60))});return out});
await p.screenshot({path:OUT+'/home-'+lang+'-'+theme+'.png'});
res.push({lang,theme,arabicLeft:await scan(),langAttr:await p.evaluate(()=>document.documentElement.lang+document.documentElement.dir)});
await c.close()}
console.log(JSON.stringify(res,null,1));await b.close()})();