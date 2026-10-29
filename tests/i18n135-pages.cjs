const {chromium}=require('/home/kit/tmp/player124/node_modules/playwright'),fs=require('fs');
const P=JSON.parse(fs.readFileSync('/tmp/.prov133.json'));
const OUT='/home/kit/tmp/player135/shots';fs.mkdirSync(OUT,{recursive:true});
const provider={id:'realtest',type:'xtream',name:'t',server:P.server,username:P.username,password:P.password};
(async()=>{const b=await chromium.launch({executablePath:'/home/kit/tmp/player124/chrome-linux/chrome',headless:true,args:['--no-sandbox','--disable-web-security']});const res={};
for(const lang of ['de','en']){
const c=await b.newContext({viewport:{width:1920,height:1080}}),p=await c.newPage();
await p.addInitScript(l=>{localStorage.setItem('ap-theme','red');localStorage.setItem('ap-lang',l)},lang);
await p.route(/supabase\.co/,r=>r.fulfill({headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},json:r.request().url().includes('register_device')?{}:{status:'active',expires_at:'2028-01-01',playlists:[provider]}}));
await p.goto('file:///home/kit/player135/dist/index.html');await p.waitForTimeout(8000);
const scan=()=>p.evaluate(()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('[hidden]')||e.tagName==='SCRIPT'||e.tagName==='STYLE'||e.closest('#items,#home-movies,#home-series,#home-recent,#movie-related,#episode-list,#movie-shelf,#hero-copy h2,#home-title,#home-description,#home-meta,#movie-title,#movie-description,#series-title,#series-description,#playing-name,#quick-list'))return;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).join(' ');if(/[\u0600-\u06FF]/.test(t))out.push(t.slice(0,60));['aria-label','placeholder','title'].forEach(a=>{const v=e.getAttribute(a);if(v&&/[\u0600-\u06FF]/.test(v))out.push(a+':'+v)})});return [...new Set(out)]});
res[lang]={};
for(const id of [1,2,3,4,5,6,7]){const el=(await p.$$('nav button'))[id];if(!el){res[lang][id]='no nav';continue}await el.click().catch(()=>{});await p.waitForTimeout(3500);await p.screenshot({path:OUT+'/nav'+id+'-'+lang+'.png'});res[lang][id]=await scan()}
await c.close()}
console.log(JSON.stringify(res,null,1));await b.close()})();