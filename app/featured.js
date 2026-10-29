/* Bounded, credential-free launcher exchange. No provider URLs cross this boundary. */
(function(root){
'use strict';
var PATH='/media/developer/alaa-player-featured.json',LIMIT=24576;
function id(value){return (typeof value==='string'||typeof value==='number')&&/^[A-Za-z0-9_-]{1,128}$/.test(String(value))?String(value):null;}
function launch(raw){try{if(typeof raw==='string'){if(raw.length>2048)return null;raw=JSON.parse(raw);}var f=raw&&raw.featured;if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(function(k){return k!=='type'&&k!=='id';})||!['movies','series'].includes(f.type))return null;var key=id(f.id);return key?{type:f.type,id:key}:null;}catch(e){return null;}}
function artwork(raw,p){
try{if(typeof raw!=='string'||raw.length>1536||/[\s\\\x00-\x1f]/.test(raw))return null;
var u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return null;
/* Only unauthenticated public artwork CDNs. Never provider-hosted/unknown URLs. */
if(!/^(image\.tmdb\.org|images\.metahub\.space|assets\.fanart\.tv|m\.media-amazon\.com|ia\.media-imdb\.com)$/.test(u.hostname))return null;
if(p&&p.server&&new URL(p.server).hostname===u.hostname)return null;
var path=decodeURIComponent(decodeURIComponent(u.pathname));
if(/(?:^|\/)(?:live|movie|series|player_api\.php|get\.php|auth|user|username|pass|password|token)(?:\/|$)/i.test(path)||!(/\.(?:jpe?g|png|webp)$/i.test(path)))return null;
if(p&&[p.username,p.password].some(function(s){return s&&path.split('/').includes(String(s));}))return null;
return u.href;}catch(e){return null;}}
function text(value){return String(value||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/[\ud800-\udfff]/g,'').slice(0,240).trim();}
function payload(items,p){var out=[],seen={};(items||[]).slice().sort(function(a,b){return (Number(b.added)||0)-(Number(a.added)||0);}).some(function(i){
var key=id(i.id),art=artwork(i.logo,p),title=text(i.name),type=i.kind;
if(!key||!art||!title||/https?:\/\//i.test(title)||!['movies','series'].includes(type)||seen[type+':'+key])return false;
var item={title:title,artwork:art,type:type,id:key};out.push(item);if(bytes(JSON.stringify({version:1,items:out}))>LIMIT)out.pop();else seen[type+':'+key]=true;return out.length===12;
});return {version:1,items:out};}
function bytes(s){return encodeURIComponent(s).replace(/%[A-F\d]{2}/gi,'x').length;}
function command(data){var json=JSON.stringify(data);if(bytes(json)>LIMIT)throw Error('Featured size');var encoded=typeof Buffer!=='undefined'?Buffer.from(json,'utf8').toString('base64'):root.btoa(unescape(encodeURIComponent(json)));
return "umask 077; tmp=$(mktemp /media/developer/.alaa-player-featured.XXXXXX) || exit 1; trap 'rm -f \"$tmp\"' EXIT HUP INT TERM; printf '%s' '"+encoded+"' | base64 -d > \"$tmp\" && chmod 0644 \"$tmp\" && mv -f \"$tmp\" '"+PATH+"'";}
function exec(win,cmd){return new Promise(function(resolve){if(typeof win.PalmServiceBridge!=='function')return resolve(false);var bridge,done=false,timer=setTimeout(function(){finish(false);},5000);function finish(ok){if(done)return;done=true;clearTimeout(timer);if(bridge){try{bridge.cancel();}catch(e){}bridge.onservicecallback=null;}resolve(ok);}
try{bridge=new win.PalmServiceBridge();bridge.onservicecallback=function(raw){try{var r=JSON.parse(raw);finish(r.returnValue!==false&&!r.error&&!r.errorText&&!r.stderrString);}catch(e){finish(false);}};bridge.call('luna://org.webosbrew.hbchannel.service/exec',JSON.stringify({command:cmd}));}catch(e){finish(false);}});}
function writer(run){var chain=Promise.resolve(),generation=0;function enqueue(data,g){chain=chain.catch(function(){}).then(function(){return g===generation?run(command(data)):false;}).catch(function(){return false;});return chain;}return {clear:function(){generation++;return enqueue({version:1,items:[]},generation);},publish:function(items,p){return enqueue(payload(items,p),generation);}};}
function queue(){var pending=null;return {accept:function(raw){var next=launch(raw);if(!next)return false;pending=next;return true;},clear:function(){pending=null;},take:function(catalog,ready){if(!pending||!ready)return null;var f=pending;pending=null;return (catalog[f.type]||[]).find(function(i){return i.kind===f.type&&String(i.id)===f.id;})||null;}};}
var api={path:PATH,limit:LIMIT,id:id,launch:launch,artwork:artwork,payload:payload,bytes:bytes,command:command,exec:exec,writer:writer,queue:queue};
if(typeof module!=='undefined')module.exports=api;else root.APFeatured=api;
})(typeof window!=='undefined'?window:this);
