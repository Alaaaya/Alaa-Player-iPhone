const test=require('node:test'),assert=require('node:assert/strict'),F=require('../app/featured.js'),cp=require('node:child_process');
const provider={server:'https://provider.example',username:'secret-user',password:'secret-pass'};
const movie=(i,extra={})=>Object.assign({id:String(i),kind:'movies',name:'فيلم '+i,logo:'https://image.tmdb.org/t/p/w500/a'+i+'.jpg',added:i},extra);
test('bounded exact schema sorted newest first, deduped, Unicode titles',()=>{
const data=F.payload(Array.from({length:50},(_,i)=>movie(i)),provider);
assert.equal(data.items.length,12);assert.deepEqual(data.items.map(i=>i.id),Array.from({length:12},(_,i)=>String(49-i)));
assert.deepEqual(Object.keys(data),['version','items']);assert.deepEqual(Object.keys(data.items[0]),['title','artwork','type','id']);
assert.equal(data.version,1);assert(F.bytes(JSON.stringify(data))<=24576);
assert.equal(F.payload([movie(1),movie(1)],provider).items.length,1);
assert.equal(F.payload([movie(1,{kind:'live'})],provider).items.length,0);
});
test('never export credential/provider URLs, query auth, encoded paths, local or unknown hosts',()=>{
const bad=['https://secret-user:secret-pass@image.tmdb.org/a.jpg','https://provider.example/a.jpg','https://image.tmdb.org/a.jpg?username=u','https://image.tmdb.org/a.jpg?Token=t','https://image.tmdb.org/a.jpg?foo=bar','https://image.tmdb.org/live/secret-user/secret-pass/a.jpg','https://image.tmdb.org/%256cive/u/p/a.jpg','https://image.tmdb.org/t/p/secret-pass/a.jpg','http://image.tmdb.org/a.jpg','https://127.0.0.1/a.jpg','https://10.0.0.1/a.jpg','https://localhost/a.jpg','https://image.tmdb.org.evil.com/a.jpg','data:image/png,test','https://image.tmdb.org/a.m3u8','https://image.tmdb.org/a.jpg#token','https://image.tmdb.org/a.jpg\n','https://image.tmdb.org:8888/a.jpg'];
for(const logo of bad)assert.equal(F.payload([movie(1,{logo})],provider).items.length,0,logo);
assert.equal(F.artwork('https://image.tmdb.org/a.jpg',{server:'https://image.tmdb.org',username:'x',password:'p'}),null);
});
test('IDs cannot inject URL/path/commands and launch ignores no URL fallbacks',()=>{
for(const id of ['https://evil/x','../1','1; rm -rf /','x\n',{},null,'a'.repeat(129)])assert.equal(F.launch({featured:{type:'movies',id}}),null);
for(const f of [{type:'live',id:'1'},{type:'movies',id:'1',url:'https://evil'},{type:'movies',id:'1',provider:'evil'}])assert.equal(F.launch({featured:f}),null);
assert.deepEqual(F.launch('{"featured":{"type":"series","id":42}}'),{type:'series',id:'42'});
assert.equal(F.launch('x'),null);assert.equal(F.launch('x'.repeat(2050)),null);
});
test('shell command transports UTF8 base64 only and parses in POSIX shell',()=>{
const data=F.payload([movie(1,{name:"$(touch /tmp/never-run) ' ; فيلم"})],provider),cmd=F.command(data);
assert(!cmd.includes('touch'));assert(cmd.includes("mktemp /media/developer/.alaa-player-featured.XXXXXX"));
assert.equal(cp.spawnSync('sh',['-n'],{input:cmd}).status,0);
const encoded=cmd.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)[1];
assert.deepEqual(JSON.parse(Buffer.from(encoded,'base64').toString()),data);
assert.throws(()=>F.command({items:['x'.repeat(24576)]}),/size/);
});
test('queue waits for current catalog, last valid request wins, stale/missing cannot resolve',()=>{
const q=F.queue(),catalog={movies:[movie(1)],series:[movie(2,{kind:'series'})]};
q.accept({featured:{type:'movies',id:'1'}});assert.equal(q.take(catalog,false),null);
q.accept({featured:{type:'series',id:'2'}});assert.equal(q.take(catalog,true),catalog.series[0]);assert.equal(q.take(catalog,true),null);
q.accept({featured:{type:'movies',id:'1'}});q.clear();assert.equal(q.take(catalog,true),null);
q.accept({featured:{type:'movies',id:'999'}});assert.equal(q.take(catalog,true),null);
q.accept({featured:{type:'movies',id:'1'}});assert(!q.accept({featured:{type:'live',id:'1'}}));assert.equal(q.take(catalog,true),catalog.movies[0]);
});
test('writer serializes, clear discards older unpublished work and failures degrade',async()=>{
let resolve,calls=[];const w=F.writer(cmd=>{calls.push(cmd);if(calls.length===1)return new Promise(r=>resolve=r);return Promise.resolve(true);});
const first=w.clear();await Promise.resolve();await Promise.resolve();
const stale=w.publish([movie(1)],provider),clear=w.clear(),fresh=w.publish([movie(2)],provider);
resolve(true);await Promise.all([first,stale,clear,fresh]);
assert.equal(calls.length,3);
const decode=c=>JSON.parse(Buffer.from(c.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)[1],'base64'));
assert.equal(decode(calls[1]).items.length,0);assert.equal(decode(calls[2]).items[0].id,'2');
const failing=F.writer(()=>Promise.reject(Error('no root')));assert.equal(await failing.clear(),false);
});
test('mock HBC exec contract successful and error responses, absence safe',async()=>{
assert.equal(await F.exec({},'test'),false);
let captured;
function Bridge(){this.cancel=()=>{};this.call=(uri,body)=>{captured={uri,body:JSON.parse(body)};this.onservicecallback('{"returnValue":true,"stdoutString":""}');};}
assert.equal(await F.exec({PalmServiceBridge:Bridge},'test'),true);assert.equal(captured.uri,'luna://org.webosbrew.hbchannel.service/exec');assert.deepEqual(captured.body,{command:'test'});
function Fail(){this.call=()=>this.onservicecallback('{"error":"Root unavailable"}');this.cancel=()=>{};}
assert.equal(await F.exec({PalmServiceBridge:Fail},'test'),false);
});
test('real shell atomic write round-trips and replaces symlink rather than following it',()=>{
const fs=require('node:fs'),path=require('node:path'),dir=fs.mkdtempSync(path.resolve(__dirname,'../artifacts/featured-shell-'));
try{
const target=path.join(dir,'alaa-player-featured.json'),sentinel=path.join(dir,'sentinel');
fs.writeFileSync(sentinel,'untouched');fs.symlinkSync(sentinel,target);
const data=F.payload([movie(1,{name:"فيلم ' \" ; $(echo no)"})],provider);
const cmd=F.command(data).replaceAll('/media/developer',dir);
const result=cp.spawnSync('sh',['-c',cmd],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(target)),data);
assert.equal(fs.readFileSync(sentinel,'utf8'),'untouched');assert.equal(fs.statSync(target).mode&0o777,0o644);
assert.equal(fs.readdirSync(dir).filter(x=>x.startsWith('.alaa-player-featured.')).length,0);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
