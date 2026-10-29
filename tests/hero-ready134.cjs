const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('app/app.js','utf8'),start=source.indexOf('var wide=item&&heroBackdrop(item.backdrop),poster=item&&A.safeURL(item.logo),heroHost='),end=source.indexOf("\n$('home-title')",start),snippet=source.slice(start,end);
(async()=>{
let old={remove(){this.removed=true}},children=[old],classes={},created=[];
const host={_artRequest:0,classList:{toggle(k,v){classes[k]=v}},querySelectorAll(){return children.slice()},prepend(im){children.unshift(im)}};
const ctx={item:{name:'4K - AR - Name',backdrop:'wide',logo:'poster'},heroBackdrop:x=>x,A:{safeURL:x=>x},posterTitle:x=>x,$:()=>host,document:{createElement(){let im={naturalWidth:600,naturalHeight:900,decode:()=>Promise.resolve()};created.push(im);return im}}};
vm.createContext(ctx);vm.runInContext('(function(){'+snippet+'})()',ctx);assert.equal(old.removed,undefined,'old remains during load');assert.equal(created[0].src,'wide');created[0].onerror();assert.equal(created[0].src,'poster');created[0].onload();await Promise.resolve();assert.equal(old.removed,true);assert.equal(classes['hero-poster-fallback'],true);
old={remove(){this.removed=true}};children=[old];vm.runInContext('(function(){'+snippet+'})()',ctx);let stale=created.at(-1);vm.runInContext('(function(){'+snippet+'})()',ctx);stale.onload();await Promise.resolve();assert.equal(old.removed,undefined,'stale decode does not replace current');let latest=created.at(-1);latest.onerror();latest.onerror();assert.equal(old.removed,undefined,'failed sources preserve loaded image');
console.log('HERO_READY134_PASS 7 assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
