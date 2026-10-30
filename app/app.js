(function(){
'use strict';
var $=function(id){return document.getElementById(id);},A=window.AP,P=window.PANEL_PUBLIC;
var featured=window.APFeatured,featuredWriter=featured.writer(function(cmd){return featured.exec(window,cmd);}),featuredQueue=featured.queue(),catalogEpoch=0,catalogReady=false,homeLoadTask=null;
function resetFeatured(){
catalogEpoch++;catalogReady=false;homeLoadTask=null;
homeCatalog={live:[],movies:[],series:[]};homeLoadState={movies:'idle',series:'idle'};heroIndex=0;
return featuredWriter.clear();
}
function clearHomeUI(){lastHomePaint=null;['home-movies','home-series'].forEach(function(id){var el=$(id);if(el)el.replaceChildren();});}
function receiveFeatured(params){
if(!featuredQueue.accept(params))return;
flushFeatured();
}
function flushFeatured(){
if(!state||!state.provider)return;
var item=featuredQueue.take(homeCatalog,catalogReady);
if(!item)return;
stop(false);stopPreview();connection(false);
state.kind=item.kind;state.view='catalog';state.filter='all';state.episodes=null;state.items=homeCatalog[item.kind];state.group='All';$('search').value='';
render();open(item);
}
document.addEventListener('webOSLaunch',function(e){receiveFeatured(e.detail);});
document.addEventListener('webOSRelaunch',function(e){receiveFeatured(e.detail);});
try{if(window.PalmSystem)featuredQueue.accept(window.PalmSystem.launchParams);}catch(e){}
var state={kind:'live',group:'All',items:[],filtered:[],providers:[],provider:null,page:0,selected:null,playing:null,request:0,status:null,panelBusy:false,episodes:null,expires:null,view:'home',filter:'all',virtualStart:0},pageSize=24,hideTimer;
var statusTimer;
function status(s){
var el=$('status');clearTimeout(statusTimer);el.textContent=s;
el.hidden=!s||/^(تم تحميل|متصل بلوحة التحكم)/.test(s);
if(!el.hidden)statusTimer=setTimeout(function(){el.hidden=true;},7000);
}
function resize(){if(window.APTouch){$('screen').style.transform='none';return;}var scale=Math.min(innerWidth/1920,innerHeight/1080);$('screen').style.transform='scale('+scale+')';}
addEventListener('resize',resize);resize();
function clock(){$('clock').textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});$('date').textContent=new Date().toLocaleDateString(window.APLang?APLang.locale():'ar',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}clock();setInterval(clock,60000);
function storeRead(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function storeWrite(k,v){try{localStorage.setItem(k,v);}catch(e){}}
var code=null,deviceIdentity=null,secureKey=null,providerRequests=new Set(),activeArtwork=new Set(),providerGeneration=0,panelRetryAt=0;
function randomHex(n){var bytes=new Uint8Array(n);crypto.getRandomValues(bytes);return Array.from(bytes).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}
async function seal(value){var iv=crypto.getRandomValues(new Uint8Array(12));return {sealed:1,iv:iv,body:await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},secureKey,new TextEncoder().encode(JSON.stringify(value)))};}
async function unseal(value){if(!value||value.sealed!==1)return null;try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:value.iv},secureKey,value.body)));}catch(e){return null;}}
async function initIdentity(){
if(!window.crypto||!crypto.subtle)throw Error('Secure storage unavailable');
var db=await openCatalogDB();if(!db)throw Error('Secure storage unavailable');
var record=await new Promise(function(resolve,reject){var q=db.transaction('catalog').objectStore('catalog').get('secure-identity');q.onsuccess=function(){resolve(q.result);};q.onerror=reject;});
if(record){secureKey=record.key;deviceIdentity=await unseal(record.identity);if(!deviceIdentity)throw Error('Secure identity unavailable');}
else{
secureKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
deviceIdentity={code:randomHex(6).toUpperCase(),token:randomHex(32)};
var sealed=await seal(deviceIdentity);
await new Promise(function(resolve,reject){var tx=db.transaction('catalog','readwrite'),st=tx.objectStore('catalog');st.clear();st.put({key:secureKey,identity:sealed},'secure-identity');tx.oncomplete=resolve;tx.onerror=tx.onabort=reject;});
}
code=deviceIdentity.code;$('device-code').textContent=code.match(/.{1,4}/g).join('-');
}
async function purgeCatalog(){var db=await openCatalogDB();if(!db)return;await new Promise(function(resolve,reject){var tx=db.transaction('catalog','readwrite'),st=tx.objectStore('catalog'),q=st.openCursor();q.onsuccess=function(){var c=q.result;if(c){if(c.key!=='secure-identity'&&c.key!=='device-config')c.delete();c.continue();}};tx.oncomplete=resolve;tx.onerror=tx.onabort=reject;});}
function cancelProviderWork(){providerGeneration++;providerRequests.forEach(function(c){c.abort();});providerRequests.clear();activeArtwork.forEach(function(im){im.onload=im.onerror=null;im.removeAttribute('src');});activeArtwork.clear();prefetchEpoch++;refreshQueue=[];freshKinds={};clearTimeout(freshTimer);imageWarmQueue=[];warmedImages.clear();heroMetadataBusy={};heroMetadataDone={};}
async function request(url,options,limit){
url=A.safeURL(url);if(!url)throw Error('Invalid URL');
var abort=new AbortController(),isProvider=url.indexOf(P.base+'/rest/v1/rpc/')!==0;if(isProvider)providerRequests.add(abort);var timer=setTimeout(function(){abort.abort();},25000);
try{var r=await fetch(url,Object.assign({signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'},options||{}));if(!r.ok)throw Error('Server HTTP '+r.status);
if(Number(r.headers.get('content-length'))>limit)throw Error('Response too large');
var text='';if(r.body&&r.body.getReader){var reader=r.body.getReader(),size=0,decoder=new TextDecoder();while(true){var part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('Response too large');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}else{text=await r.text();if(text.length>limit)throw Error('Response too large');}return text;
}catch(e){if(e.name==='AbortError')throw Error('Connection timed out');if(e instanceof TypeError)throw Error('Network or browser access (CORS) blocked');throw e;}finally{clearTimeout(timer);providerRequests.delete(abort);}}
async function rpc(name,body){return JSON.parse(await request(P.base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:P.anon,Authorization:'Bearer '+P.anon,'Content-Type':'application/json'},body:JSON.stringify(body)},524288));}
function errorMessage(e){
if(/^Server HTTP/.test(e.message))return tr('تعذّر الاتصال بالمزوّد. حاول مجدداً أو تحقّق من الاشتراك.');
if(e.message==='Connection timed out')return tr('انتهت مهلة الاتصال. حاول مجدداً.');
if(e.message==='Response too large')return tr('قائمة المزوّد أكبر من الحد المسموح.');
if(e.message==='Network or browser access (CORS) blocked')return tr('تعذّر الوصول للمزوّد. تحقّق من الاتصال وإعدادات الوصول.');
return tr('تعذّر قراءة القائمة. تحقّق من بيانات المزوّد والاتصال.');
}
function connection(show){if(show)stopDetailPlayback();
if(show){stopPreview();document.querySelectorAll('nav button').forEach(function(b){b.classList.remove('selected');});$('settings-open').classList.add('selected');}
$('connection').hidden=!show;
if(show)$('sync').focus();else{render();focusFirst();}
}
function focusFirst(force){
if(!force&&document.querySelector('nav').contains(document.activeElement))return;if(!$('movie-detail').hidden){$('movie-back').focus();return;}if(!$('series-detail').hidden){$('series-back').focus();return;}if(state.view==='home'&&$('connection').hidden){$('home-play').focus();return;}var el=$('items').querySelector('button')||document.querySelector('nav button.selected');if(el)el.focus();}
function clearProjections(){
clearTimeout(selectionArtTimer);homeInline.items=[];homeInline.request++;homeInline.origin=false;movieItem=null;movieRelated=[];movieRelatedEpoch++;seriesEpisodes=[];seriesItem=null;state.selected=null;
['home-inline-items','home-inline-categories','movie-related','episode-list','items'].forEach(function(id){var el=$(id);if(el)el.replaceChildren();});
$('cover').querySelectorAll('img').forEach(function(im){im.remove();});
$('home-inline').hidden=true;$('home-shelves').hidden=false;$('hero').hidden=true;
$('movie-detail').hidden=true;$('series-detail').hidden=true;
var host=$('home-hero');host._artRequest=(host._artRequest||0)+1;host.querySelectorAll('img').forEach(function(im){im.removeAttribute('src');im.remove();});
$('detail-name').textContent='Alaa IPTV';$('detail-group').textContent='';$('detail-kind').textContent='';
}
async function sync(){
if(state.panelBusy||Date.now()<panelRetryAt)return;state.panelBusy=true;$('sync').disabled=true;$('activation').textContent=tr('جارٍ التحقق من التفعيل…');
try{
var binding={p_device_code:code,p_device_token:deviceIdentity.token};
var registration=await rpc('register_device_v2',Object.assign({p_app_type:'alaa_player',p_model:window.APTouch?'iPhone · Alaa Player 2.6':'LG webOS · Alaa Player 2.6'},binding));
if(registration.status==='rate_limited'){panelRetryAt=Date.now()+Math.max(60,Number(registration.retry_after)||3600)*1000+Math.random()*3000;return;}
if(['registered','unavailable'].indexOf(registration.status)<0)throw Error('Pairing unavailable');
var raw=await rpc('get_device_config_v2',binding);
if(raw.status==='rate_limited'){panelRetryAt=Date.now()+Math.max(60,Number(raw.retry_after)||60)*1000+Math.random()*3000;return;}
var c=A.config(raw);c.playlists=c.playlists.map(function(p){var old=state.providers.find(function(x){return x.id===p.id&&x.server===p.server&&x.username===p.username&&x.password===p.password;});p._policy=A.categoryPolicy(p,old&&old._policy);return p;});
state.status=c.status;state.expires=c.expires_at;storeWrite('ap-config-disabled',c.status==='active'?'0':'1');
var previous=state.provider,updatedPolicy=previous&&c.playlists.find(function(p){return p.id===previous.id;});
if(previous&&!previous.manual&&JSON.stringify(updatedPolicy)!==JSON.stringify(previous)){
cancelProviderWork();state.request++;stop(false);stopPreview();$('movie-detail').hidden=true;$('series-detail').hidden=true;seriesEpisodes=[];seriesItem=null;state.selected=null;state.episodes=null;clearProjections();
await purgeCatalog();
}
state.providers=state.providers.filter(function(p){return p.manual;}).concat(c.playlists);
$('activation').textContent=c.status==='active'?tr('تم التفعيل')+(c.expires_at?tr(' · ينتهي ')+new Date(c.expires_at).toLocaleDateString():'')+' · '+c.playlists.length+tr(' قوائم'):c.status==='expired'?tr('انتهى التفعيل. جدّد الجهاز من لوحة التحكم.'):tr('بانتظار تفعيل الجهاز من لوحة التحكم.');
if(c.status!=='active'){cancelProviderWork();clearProjections();await purgeCatalog();}
if(c.status!=='active'&&state.provider&&!state.provider.manual){stop();featuredQueue.clear();resetFeatured();clearHomeUI();state.items=[];state.provider=null;state.request++;render();}
if(state.provider&&!state.provider.manual){var updated=state.providers.find(function(p){return p.id===state.provider.id;});if(!updated){stop();featuredQueue.clear();resetFeatured();clearHomeUI();state.provider=null;state.items=[];state.request++;render();}else if(JSON.stringify(updated)!==JSON.stringify(state.provider)){
var sameProvider=updated.server===previous.server&&updated.username===previous.username&&updated.password===previous.password&&updated.url===previous.url;
stop();featuredQueue.clear();var keep=homeCatalog,keepCats={live:liveCategories,movies:vodCategories.movies,series:vodCategories.series};var cleared=resetFeatured();state.provider=updated;await cleared;
if(sameProvider){['live','movies','series'].forEach(function(kind){homeCatalog[kind]=(keep[kind]||[]).filter(function(i){return itemAllowed(i,updated);}).map(function(i){i.provider=updated;return i;});});liveCategories=(keepCats.live||[]).filter(function(x){return A.categoryAllowed(updated,'live',x.category_id);});vodCategories={movies:(keepCats.movies||[]).filter(function(x){return A.categoryAllowed(updated,'movies',x.category_id);}),series:(keepCats.series||[]).filter(function(x){return A.categoryAllowed(updated,'series',x.category_id);})};state.items=homeCatalog[state.kind]||[];state.filtered=[];state.group='All';clearHomeUI();render();homeContent();saveHomeSnapshot(updated);prefetchCatalog(updated,{listsOnly:true});}
else await load();} }
await rememberConfig();providers();
if(c.status==='active'&&c.playlists.length&&!state.provider){await selectProvider(c.playlists[0].id);connection(false);}
else if(!state.provider){connection(true);}
if(!state.provider)status(c.status==='active'?tr('متصل بلوحة التحكم'):tr('Device ')+code+' · '+c.status);
}catch(e){$('activation').textContent=errorMessage(e);if(!state.provider)status(tr('لوحة التحكم غير متاحة')+' · '+errorMessage(e));if(!state.provider)connection(true);}
finally{state.panelBusy=false;$('sync').disabled=false;}}
function providers(){var select=$('providers'),old=state.provider&&state.provider.id;select.replaceChildren();state.providers.forEach(function(p){var o=document.createElement('option');o.value=p.id;o.textContent=p.name||tr('Playlist');select.appendChild(o);});if(old&&state.providers.some(function(p){return p.id===old;}))select.value=old;}

// IndexedDB keeps large catalogs off the synchronous localStorage path.
// Provider-scoped keys contain a SHA-256 digest, never plaintext credentials.
var softKeep=null,cacheDB=null,cacheJobs={},cacheStorageFull=false,prefetchEpoch=0,backgroundJobs={},refreshQueue=[],refreshBusy=false,sessionRefreshed={},lastInputAt=0,refreshStats={ok:0,fail:0},manualRefresh=null,freshTimer=null,freshKinds={};
document.addEventListener('keydown',function(){lastInputAt=Date.now();},true);
function openCatalogDB(){
if(!window.indexedDB)return Promise.resolve(null);
if(!cacheDB)cacheDB=new Promise(function(resolve){var r=indexedDB.open('ap-catalog-v1',1);
r.onupgradeneeded=function(){r.result.createObjectStore('catalog');};
r.onsuccess=function(){resolve(r.result);};r.onerror=function(){resolve(null);};r.onblocked=function(){resolve(null);};});
return cacheDB;
}
async function catalogKey(p,action,id){
var text=[code,p.id,p._policy&&p._policy.revision,p.server||p.url,p.username,p.password,action,id==null?'':id].join('|');
if(!window.crypto||!crypto.subtle)return null;
var bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
return Array.from(new Uint8Array(bytes)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}
async function cacheRead(k){if(!k)return null;var db=await openCatalogDB();if(!db)return null;
return new Promise(function(resolve){try{var r=db.transaction('catalog').objectStore('catalog').get(k);r.onsuccess=function(){(async function(){var v=r.result;if(v){v=await unseal(v); }resolve(v||null);})();};r.onerror=function(){resolve(null);};}catch(e){resolve(null);}});}
async function cacheWrite(k,data,time){if(!k||cacheStorageFull&&k!=='device-config')return false;var generation=providerGeneration,db=await openCatalogDB();if(!db)return false;
var encrypted=await seal({time:time||Date.now(),data:data});if(generation!==providerGeneration)return false;
return new Promise(function(resolve){
try{var tx=db.transaction('catalog','readwrite');
tx.oncomplete=function(){resolve(true);};
tx.onabort=tx.onerror=function(){if(tx.error&&tx.error.name==='QuotaExceededError')cacheStorageFull=true;resolve(false);};
tx.objectStore('catalog').put(encrypted,k);
}catch(e){if(e.name==='QuotaExceededError')cacheStorageFull=true;resolve(false);}
});
}
function catalogURL(p,action,id){
var category=/^(get_live_streams|get_vod_streams|get_series)$/.test(action);
var u=new URL(A.xcAPI(p,action,category?null:id));
if(category&&id!=null)u.searchParams.set('category_id',id);
return u.href;
}
function compactRows(action,data){
if(action!=='get_live_streams'||!Array.isArray(data))return data;
return data.map(function(x){return {stream_id:x.stream_id,name:x.name,stream_icon:x.stream_icon,category_id:x.category_id,category_ids:x.category_ids,num:x.num};});
}
function rowsSignature(data){try{var s=JSON.stringify(data),h=2166136261,h2=5381;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);h=Math.imul(h^c,16777619);h2=(Math.imul(h2,33)+c)|0;}return (Array.isArray(data)?data.length:'o')+':'+s.length+':'+(h>>>0)+':'+(h2>>>0);}catch(e){return '';}}
function refreshPump(){
if(refreshBusy)return;
if(!refreshQueue.length)return;
refreshBusy=true;
(async function(){
await idleCatalogTurn();
while(document.hidden||!$('player').hidden||Date.now()-lastInputAt<700)await new Promise(function(r){setTimeout(r,document.hidden||!$('player').hidden?2000:400);});
// Current visible category first, then the rest in arrival order.
var cur=refreshQueue.findIndex(function(j){return j.urgent;});var job=refreshQueue.splice(cur>0?cur:0,1)[0];
try{await job.run();refreshStats.ok++;}catch(err){refreshStats.fail++;}
})().then(function(){refreshBusy=false;refreshPump();},function(){refreshBusy=false;refreshPump();});
}
function scheduleFresh(p,action,id,data){
freshKinds[action+'|'+(id==null?'':id)]={action:action,id:id,data:data};clearTimeout(freshTimer);
freshTimer=setTimeout(function(){applyFresh(p).catch(function(){});},500);
}
var MERGE_FIELDS=['category_id','category_ids','name','group','logo','rating','year','description','genre','seasons','episodeCount','added','quality','program','backdrop','url'];
// Stable-id merge: existing objects are kept (identity, selection, favorites), fields update in place.
function mergeItems(oldList,newList){
var byId=new Map(oldList.map(function(i){return [i.id,i];})),changed=oldList.length!==newList.length,out=[];
newList.forEach(function(n,idx){var o=byId.get(n.id);
if(!o){changed=true;out.push(n);return;}
MERGE_FIELDS.forEach(function(f){if(o[f]!==n[f]){o[f]=n[f];changed=true;}});
if(oldList[idx]!==o)changed=true;out.push(o);});
return {list:out,changed:changed};
}
async function applyFresh(p,force){
if(state.provider!==p)return;
if(!force&&(!$('player').hidden||document.hidden||Date.now()-lastInputAt<700)){clearTimeout(freshTimer);freshTimer=setTimeout(function(){applyFresh(p).catch(function(){});},1500);return;}
var jobs=freshKinds;freshKinds={};var changed=false,viewChanged=false,CATS={get_live_categories:'live',get_vod_categories:'movies',get_series_categories:'series'},STREAMS={get_live_streams:'live',get_vod_streams:'movies',get_series:'series'};
var keys=Object.keys(jobs).sort(function(x,y){return (CATS[jobs[y].action]?1:0)-(CATS[jobs[x].action]?1:0);});
for(var n=0;n<keys.length;n++){
var j=jobs[keys[n]];
if(CATS[j.action]){
var ck=CATS[j.action];if(!Array.isArray(j.data))continue;
var oc=ck==='live'?liveCategories:vodCategories[ck];
if(rowsSignature(j.data)!==rowsSignature(oc)){if(ck==='live')liveCategories=j.data;else vodCategories[ck]=j.data;changed=true;if(state.kind===ck&&state.view!=='home')viewChanged=true;}
continue;}
var kind=STREAMS[j.action];if(!kind||!Array.isArray(j.data))continue;
var cl=kind==='live'?liveCategories:vodCategories[kind],cat=(cl||[]).find(function(c){return String(c.category_id)===String(j.id);});
if(!cat)continue;
var fresh=uniqueTitles(A.xcItems(j.data,cl,p,kind)),cur=homeCatalog[kind]||[];
var inCat=cur.filter(function(i){return i.group===cat.category_name;});
if(!inCat.length&&!(state.kind===kind&&state.group===cat.category_name))continue;
var m=mergeItems(inCat,fresh);
if(!m.changed)continue;
var shown=state.items===cur,placed=false,out=[];
cur.forEach(function(i){if(i.group!==cat.category_name)out.push(i);else if(!placed){placed=true;out=out.concat(m.list);}});
if(!placed)out=out.concat(m.list);
out=uniqueTitles(out);homeCatalog[kind]=out;
if(shown){state.items=out;}
if(shown&&state.kind===kind&&state.view!=='home'&&(state.group==='All'||state.group===cat.category_name||state.group==='@favorites'))viewChanged=true;
changed=true;
}
if(!changed)return;
if(viewChanged&&$('connection').hidden&&$('movie-detail').hidden&&$('series-detail').hidden){
var it=$('items'),f=document.activeElement,fi=f&&f.dataset&&f.dataset.index!=null&&it.contains(f)?Number(f.dataset.index):-1;
var fItem=fi>=0?state.filtered[fi]:null;
softKeep={virtualStart:state.virtualStart||0,scrollTop:it.scrollTop,focusId:fItem?fItem.id:null,focusOffset:fi>=0?f.offsetTop-it.scrollTop:0,hadFocus:fi>=0,focusIndex:fi,selectedId:state.selected?state.selected.id:null};
render();
}
try{homeContent();}catch(e){}
saveHomeSnapshot(p);
}
function itemAllowed(item,p){if(!p||p.type!=='xtream')return true;var kind=item.kind==='episodes'?'series':item.kind,ids=item.category_ids||[item.category_id];return ids.length&&ids.every(function(id){return A.categoryAllowed(p,kind,id);});}
async function xc(p,action,id,prefetch,forceJob){
var generation=providerGeneration,media=/live/.test(action)?'live':/vod/.test(action)?'movies':'series',isCategories=/_categories$/.test(action),isList=/^(get_live_streams|get_vod_streams|get_series)$/.test(action);
function check(){if(generation!==providerGeneration||state.provider!==p)throw Error('Stale catalog');if(p.type==='xtream'&&!p.manual&&!p._policy)throw Error('Unsupported category policy');if(isList&&!A.categoryAllowed(p,media,id))throw Error('Hidden category');if(/_info$/.test(action)){var item=(homeCatalog[media]||[]).concat(homeInline.items||[],movieRelated||[],state.items||[]).find(function(i){return String(i.id)===String(id);});if(!item||!itemAllowed(item,p))throw Error('Hidden item');}}
function filtered(data){check();if((isCategories||isList)&&data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length===0)data=[];if((isCategories||isList)&&!Array.isArray(data))throw Error('Invalid catalogue');if(isCategories)return data.filter(function(x){return A.categoryAllowed(p,media,x.category_id);});if(isList)return A.visibleRows(p,media,data);return data;}
check();var k=await catalogKey(p,action,id),cached=await cacheRead(k);
function refresh(){if(k&&cacheJobs[k])return cacheJobs[k];
var task=(async function(){check();var data=JSON.parse(await request(catalogURL(p,action,id),null,24*1024*1024));
var compact=compactRows(action,filtered(data));
check();await cacheWrite(k,compact);if(k)sessionRefreshed[k]=1;check();return compact;})();
if(k){cacheJobs[k]=task;task.then(function(){delete cacheJobs[k];},function(){delete cacheJobs[k];});}return task;}
function background(urgent){
if(k&&backgroundJobs[k]){if(urgent)refreshQueue.forEach(function(j){if(j.k===k)j.urgent=true;});return backgroundJobs[k];}
var task=new Promise(function(resolve,reject){
refreshQueue.push({k:k,urgent:!!urgent,run:async function(){
if(state.provider!==p||cacheStorageFull){resolve(cached&&cached.data);return;}
try{var before=cached?rowsSignature(cached.data):'',data=await refresh();sessionRefreshed[k]=1;resolve(data);
if(cached&&rowsSignature(data)!==before&&state.provider===p)scheduleFresh(p,action,id,data);}catch(e){reject(e);throw e;}
}});refreshPump();});
if(k){backgroundJobs[k]=task;task.then(function(){delete backgroundJobs[k];},function(){delete backgroundJobs[k];});}
return task;
}
if(forceJob){if(k)delete sessionRefreshed[k];return background(true);}
if(cached){cached.data=filtered(cached.data);
// Show cache immediately; refresh silently once per app open. Visible category goes first.
if(k&&!sessionRefreshed[k]){background(!prefetch).catch(function(){});}
check();return cached.data;}
return prefetch?background():refresh();
}
// Save presentation separately, so startup never empties a populated home while syncing.
// Stream/image URLs live inside the provider-scoped records, not synchronous localStorage.
async function saveHomeSnapshot(p){
if(!p||state.provider!==p)return;
var epoch=catalogEpoch, k=await catalogKey(p,'home-snapshot');
if(epoch!==catalogEpoch||state.provider!==p)return;
function slim(list,live){return list.map(function(i){var o={};for(var f in i){if(f==='provider'||(live&&(f==='url'||f==='kind')))continue;if(i[f]===''||i[f]===0||i[f]==null)continue;o[f]=i[f];}return o;});}
await cacheWrite(k,{v:2,catalog:{live:slim(homeCatalog.live,true),movies:slim(homeCatalog.movies),series:slim(homeCatalog.series)},categories:{live:liveCategories,movies:vodCategories.movies,series:vodCategories.series},loadState:homeLoadState});
}
async function hydrateProvider(p){
var generation=providerGeneration;var cached=await cacheRead(await catalogKey(p,'home-snapshot'));
if(state.provider!==p||generation!==providerGeneration)return false;
if(!cached||!cached.data||!cached.data.catalog)return false;
var d=cached.data;
function fat(list,kind){return (list||[]).map(function(i){var o=Object.assign({name:'Untitled',group:'Other',logo:null,rating:'',year:'',description:'',genre:'',seasons:'',episodeCount:'',added:0,quality:'',program:'',backdrop:null},i);o.kind=kind;o.provider=p;if(kind==='live'&&p.type==='xtream')o.url=A.xcStream(p,'live',o.id,'m3u8');return o;}).filter(function(i){return itemAllowed(i,p);});}
homeCatalog={live:fat(d.catalog.live,'live'),movies:fat(d.catalog.movies,'movies'),series:fat(d.catalog.series,'series')};liveCategories=d.categories.live||[];vodCategories={movies:d.categories.movies||[],series:d.categories.series||[]};
homeLoadState={movies:d.loadState.movies==='ready'?'ready':'idle',series:d.loadState.series==='ready'?'ready':'idle'};
state.items=homeCatalog[state.kind]||[];state.group=state.items.length&&state.kind==='live'?state.items[0].group:'All';
catalogReady=homeLoadState.movies==='ready'&&homeLoadState.series==='ready';
return true;
}
function idleCatalogTurn(){return new Promise(function(resolve){setTimeout(function(){if(window.requestIdleCallback)requestIdleCallback(resolve,{timeout:1000});else resolve();},150);});}
// One category request at a time; no all-provider response or arbitrary record eviction.
function prefetchCatalog(p,opts){
var listsOnly=true; // Content is lazy; unhiding never downloads entire categories in background.
var epoch=++prefetchEpoch,providerEpoch=catalogEpoch;
return (async function(){
var plans=[['live','get_live_categories','get_live_streams'],['movies','get_vod_categories','get_vod_streams'],['series','get_series_categories','get_series']];
var lists=[];
for(var n=0;n<plans.length;n++){
if(epoch!==prefetchEpoch||state.provider!==p)return;
lists[n]=await xc(p,plans[n][1],null,true).catch(function(){return [];});
if(providerEpoch!==catalogEpoch||state.provider!==p)return;
if(n===0)liveCategories=lists[n];else vodCategories[plans[n][0]]=lists[n];
}
await saveHomeSnapshot(p);
if(listsOnly)return;
for(var i=0;i<Math.max(lists[0].length,lists[1].length,lists[2].length);i++){
for(var n=0;n<plans.length;n++){
if(!lists[n][i])continue;
await idleCatalogTurn();
if(epoch!==prefetchEpoch||state.provider!==p||cacheStorageFull)return;
if(document.hidden||!$('player').hidden){i--;break;}
try{
var data=await xc(p,plans[n][2],lists[n][i].category_id,true);
if(providerEpoch===catalogEpoch&&state.provider===p)warmCatalogImages(data);
}catch(e){/* A failed category must not prevent the remaining categories being saved. */}
}
}
})().catch(function(){});
}
var warmedImages=new Set(),imageWarmQueue=[],imageWarmBusy=false;
function warmCatalogImages(rows){return; // Artwork is requested only by visible UI.

rows=(rows||[]).filter(function(i){return !i.kind||itemAllowed(i,state.provider);});
if(!Array.isArray(rows)||warmedImages.size>=120)return;
for(var i=0;i<rows.length&&warmedImages.size<120;i++){
var url=A.safeURL(rows[i].stream_icon||rows[i].cover||rows[i].logo);
if(url&&!warmedImages.has(url)){warmedImages.add(url);imageWarmQueue.push(url);}
}
if(imageWarmBusy)return;imageWarmBusy=true;
(async function(){while(imageWarmQueue.length){
await idleCatalogTurn();
if(document.hidden||!$('player').hidden){imageWarmQueue=[];break;}
await new Promise(function(resolve){var im=new Image(),timer=setTimeout(done,4000);
function done(){clearTimeout(timer);im.onload=im.onerror=null;resolve();}
im.onload=im.onerror=done;im.referrerPolicy='no-referrer';im.src=imageWarmQueue.shift();});
}imageWarmBusy=false;})().catch(function(){imageWarmBusy=false;});
}
async function rememberConfig(){
await cacheWrite('device-config',{providers:state.providers,status:state.status,expires:state.expires,selected:state.provider&&state.provider.id});
}
async function bootCatalog(){
try{await initIdentity();}catch(e){$('activation').textContent='Secure storage unavailable';connection(true);return;}
var saved=await cacheRead('device-config'),c=saved&&saved.data;
if(c&&storeRead('ap-config-disabled')!=='1'&&(!c.expires||Date.parse(c.expires)>Date.now()))state.providers=(c.providers||[]).filter(function(p){return p.manual||c.status==='active';});
var p=c&&(state.providers.find(function(p){return p.id===c.selected;})||state.providers[0]);
if(p){state.provider=p;state.status=c.status;state.expires=c.expires;providers();}
var generation=providerGeneration,hydrated=false,syncing=sync();
if(p){hydrated=await hydrateProvider(p);if(hydrated&&generation===providerGeneration&&state.provider===p){render();homeContent();connection(false);}}
await syncing;
if(state.provider===p&&p&&generation===providerGeneration){if(hydrated)loadHomeCatalog(p);else await load();}
}
function preconnectProvider(p){try{var origin=new URL(p.server||p.url).origin;if(!document.querySelector('link[data-provider-connect]')){var link=document.createElement('link');link.rel='preconnect';link.href=origin;link.dataset.providerConnect='1';document.head.appendChild(link);}}catch(e){}}
var liveCategories=[];
var vodCategories={movies:[],series:[]};
function uniqueTitles(items){
var seen=new Set();
return items.filter(function(i){var id=i.kind+':'+i.id;if(seen.has(id))return false;seen.add(id);return true;});
}
async function xcCatalog(p,kind,category){
var mode=kind==='movies'?'vod':kind==='live'?'live':'series';
if(kind==='live'){
var cats=await xc(p,'get_live_categories').catch(function(){return [];});
var firstCategories=!liveCategories.length;liveCategories=cats;
if(firstCategories&&state.provider===p&&state.kind==='live')render();
if(!category)category=cats.length?cats[0].category_id:null;
if(!category)return [];
if(category==='All'){
var all=[],complete=true;
for(var n=0;n<cats.length;n++){var record=await cacheRead(await catalogKey(p,'get_live_streams',cats[n].category_id));if(!record){complete=false;break;}all=all.concat(A.visibleRows(p,'live',record.data));}
if(complete&&cats.length)return A.xcItems(all,cats,p,kind);
}
if(category==='All'){var rows=[];for(var j=0;j<cats.length;j++)rows=rows.concat(await xc(p,'get_live_streams',cats[j].category_id));return A.xcItems(rows,cats,p,kind);}
return A.xcItems(await xc(p,'get_live_streams',category),cats,p,kind);
}
var cats=vodCategories[kind];
if(!cats.length){cats=await xc(p,'get_'+mode+'_categories');vodCategories[kind]=cats;}
if(!cats.length)return [];
var chosen=category||cats[0].category_id;
var choices=category?[{category_id:category}]:cats;
for(var c=0;c<choices.length;c++){
var rows=await xc(p,kind==='series'?'get_series':'get_vod_streams',choices[c].category_id);
if(!Array.isArray(rows))throw Error('Invalid catalogue');
if(rows.length||category)return A.xcItems(rows,cats,p,kind);
}
return [];
}
async function loadVodCategory(name){
var cat=(state.kind==='live'?liveCategories:vodCategories[state.kind]).find(function(c){return c.category_name===name;});
if(!cat&&!(state.kind==='live'&&name==='All'))return;
var kind=state.kind,token=++state.request;status(tr('جارٍ تحميل القسم…'));
try{var rows=await xcCatalog(state.provider,kind,cat?cat.category_id:'All');
if(token!==state.request)return;state.items=uniqueTitles(rows);homeCatalog[kind]=state.items;state.group=name;render();focusFirst();status('');
}catch(e){if(token===state.request)status(errorMessage(e));}
}
async function selectProvider(id){
liveCategories=[];vodCategories={movies:[],series:[]};if(state.provider)featuredQueue.clear();
var cleared=resetFeatured(),epoch=catalogEpoch;prefetchEpoch++;stopPreview();
state.request++;state.items=[];state.selected=null;
state.provider=state.providers.find(function(p){return p.id===id;})||null;state.episodes=null;
preconnectProvider(state.provider);await cleared;if(epoch!==catalogEpoch)return;
if(state.provider)await hydrateProvider(state.provider);
if(epoch!==catalogEpoch)return;
await rememberConfig();if(state.items.length){render();focusFirst();loadHomeCatalog(state.provider);}else await load();
}
async function load(){
var p=state.provider,version=++state.request;state.selected=null;state.group='All';state.page=0;$('search').value='';state.items=homeCatalog[state.kind]||[];render();if(!p)return;status(tr('جارٍ تحميل ')+(p.name||tr('القائمة'))+'…');
try{var list=[];if(p.type==='m3u'){list=A.parseM3U(await request(p.url,null,24*1024*1024),p.url).filter(function(i){return i.kind===state.kind;});}
else{list=await xcCatalog(p,state.kind);}
if(version!==state.request)return;list=uniqueTitles(list);if(state.kind==='live'&&p.type==='xtream'&&list.length)state.group=list[0].group;state.items=list;homeCatalog[state.kind]=list;if(state.kind!=='live')homeLoadState[state.kind]='ready';render();saveHomeSnapshot(p);loadHomeCatalog(p);status(tr('تم تحميل ')+list.length+tr(' عنوان')+(p.type==='m3u'&&state.kind!=='live'?tr(' · عناصر M3U متاحة ضمن البث المباشر'):''));focusFirst();flushFeatured();
}catch(e){if(version!==state.request)return;if(!state.items.length&&state.kind!=='live')homeLoadState[state.kind]='error';render();status(errorMessage(e));}}
function button(text,fn){var b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
function displayLabel(name){return String(name||'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function categoryIcon(name){
name=displayLabel(name);
var type=name==='All'?'grid':/^(?:@favorites|المفضلة)$/.test(name)?'heart':
/المشاهدة|مؤخرا|recent/i.test(name)?'recent':
/بحث|search/i.test(name)?'search':
/أخبار|اخبار|news|nachricht/i.test(name)?'news':
/رياض|sport|football|كرة/i.test(name)?'sports':
/موسيق|اغاني|أغاني|music|hits/i.test(name)?'music':
/دين|اسلام|إسلام|قرآن|قران|religio|islam|quran/i.test(name)?'religion':
/أفلام|افلام|سينما|movie|film|cinema/i.test(name)?'movies':
/طفل|اطفال|أطفال|kids|child|cartoon/i.test(name)?'kids':
/وثائق|document|nature|طبيع/i.test(name)?'documentary':
/تعليم|مدرس|education|learn|school/i.test(name)?'education':
/اقتصاد|اعمال|أعمال|business|finance/i.test(name)?'business':'tv';
var shapes={
recent:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
search:'<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 8h12M6 12h5M6 16h5M15 12h3M15 16h3"/>',
sports:'<circle cx="12" cy="12" r="9"/><path d="M12 7l5 4-2 6H9l-2-6zM12 3v4M21 10l-4 1M18 20l-3-3M6 20l3-3M3 10l4 1"/>',
music:'<path d="M10 17V5l10-2v12M10 8l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
religion:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12z"/><path d="M17 3v5M14.5 5.5h5"/>',
movies:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M10 8l5 4-5 4z"/>',
kids:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M8 8v2M16 8v2"/>',
documentary:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
education:'<path d="M12 5Q7 2 2 5v15q5-3 10 0q5-3 10 0V5q-5-3-10 0v15"/>',
business:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12q9 6 18 0M12 12v5"/>',
heart:'<path d="M12 20L4 12C-2 5 7 0 12 6C17 0 26 5 20 12z"/>',
tv:'<rect x="2" y="6" width="20" height="15" rx="3"/><path d="M7 2l5 4 5-4M8 17h8"/>'};
var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('data-icon',type);svg.innerHTML=shapes[type];return svg;
}
var lastCategorySignature='';
function render(){
var search=$('search');
if(state.view==='home'){$('home').insertBefore(search,$('home-hero'));search.placeholder=tr('ابحث في القنوات');}
else{document.querySelector('.section-title').appendChild(search);}

$('screen').classList.toggle('home-reference',state.view==='home');
$('nav-home').classList.toggle('selected',state.view==='home');
var movieNav=document.querySelector('nav [data-kind="movies"]');movieNav.lastChild.textContent=tr('الأفلام');
$('series-detail').hidden=true;$('movie-detail').hidden=true;
$('home').hidden=state.view!=='home';$('browser').hidden=state.view==='home';$('browser').className=state.kind==='live'?'live-view':state.episodes?'vod-view episodes-view':'vod-view poster-view';
$('categories').setAttribute('aria-label',state.episodes?tr('المواسم'):tr('التصنيفات'));
$('heading').textContent=state.episodes?tr('الحلقات'):({live:tr('البث المباشر'),movies:tr('الأفلام'),series:tr('المسلسلات')})[state.kind];
$('search').placeholder=tr('ابحث في ')+(state.episodes?tr('الحلقات'):state.kind==='live'?tr('القنوات'):state.kind==='movies'?tr('الأفلام'):tr('المسلسلات'));
document.querySelectorAll('[data-kind]').forEach(function(b){b.classList.toggle('selected',state.view!=='home'&&state.filter==='all'&&b.dataset.kind===state.kind);});
$('nav-favorites').classList.toggle('selected',state.view!=='home'&&state.filter==='favorites');$('nav-recent').classList.toggle('selected',state.view!=='home'&&state.filter==='recent');
var groups={All:state.items.length};if(state.provider&&state.provider.type==='xtream')(state.kind==='live'?liveCategories:vodCategories[state.kind]).forEach(function(c){groups[c.category_name]='';});state.items.forEach(function(i){groups[i.group]=(Number(groups[i.group])||0)+1;});var cat=$('categories');
var groupNames=orderedGroups(Object.keys(groups)),categorySignature=JSON.stringify([state.kind,!!state.episodes,state.provider&&state.provider.id,groupNames,groupNames.map(function(g){return g==='@favorites'?state.items.filter(isFavorite).length:groups[g];})]);
if(categorySignature===lastCategorySignature){categoryWindow.nodes.forEach(function(b){b.classList.toggle('selected',b.dataset.groupName===state.group);});var selectedCategory=categoryWindow.nodes.findIndex(function(b){return b.classList.contains('selected');});paintCategoryWindow(Math.max(0,selectedCategory-3));}
else{lastCategorySignature=categorySignature;var providerCategories=new Map((state.kind==='live'?liveCategories:vodCategories[state.kind]).map(function(c){return [c.category_name,c];}));
var categoryNodes=[];groupNames.forEach(function(g){var b=button((g==='All'?(state.episodes?tr('كل المواسم'):tr('جميع التصنيفات')):g==='@favorites'?tr('المفضلة'):g.replace(/^Season /,tr('الموسم '))),function(){if(state.provider&&state.provider.type==='xtream'&&(state.kind==='live'||g!=='All')&&g!=='@favorites'){loadVodCategory(g);return;}state.group=g;state.page=0;render();if(state.kind==='live'){var chosen=$('categories').querySelector('button.selected');if(chosen)chosen.focus();}else focusFirst();});var label=document.createElement('span');label.className='category-label';label.textContent=displayLabel(b.textContent);b.textContent='';b.appendChild(label);b.dataset.organizeGroup=g;var n=document.createElement('small');var cnt=g==='@favorites'?state.items.filter(isFavorite).length:groups[g];if(typeof cnt==='number'&&isFinite(cnt)&&cnt>0){n.textContent=cnt;}else{n.hidden=true;n.className='no-count';}b.appendChild(n);b.classList.toggle('selected',g===state.group);var icon=document.createElement('span');icon.className='category-symbol';icon.appendChild(categoryIcon(g));b.dataset.groupName=g;var providerCategory=providerCategories.get(g);var providerIcon=providerCategory&&(providerCategory.category_icon||providerCategory.icon||providerCategory.image||providerCategory.stream_icon);if(providerIcon&&A.safeURL(providerIcon)){var im=document.createElement('img');im.src=providerIcon;im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';im.onload=function(){icon.querySelector('svg').style.display='none';};im.onerror=function(){im.remove();};icon.appendChild(im);}b.prepend(icon);categoryNodes.push(b);});
installCategoryWindow(categoryNodes);}
renderItems();if(state.view==='home')homeContent();}

function safeList(k){try{var list=JSON.parse(storeRead(k)||'[]');return Array.isArray(list)?list.filter(function(x){return typeof x==='string';}).slice(0,300):[];}catch(e){return [];}}
var favorites=safeList('ap-favorites'),recent=safeList('ap-recent');
/* Remote organization is scoped to the current provider, and never changes provider data. */
var categoryFavorites=safeList('ap-category-favorites'),organizeOrders=readOrders(),organize=null,hold=null;
function readOrders(){try{var o=JSON.parse(storeRead('ap-live-order')||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}}
function orderScope(type){return JSON.stringify([state.provider&&state.provider.id||'',type]);}
function itemOrderType(){return 'items:'+state.kind+':'+state.filter+':'+(state.episodes?'episodes':'catalog');}
function categoryID(g,kind){var cs=kind==='live'?liveCategories:vodCategories[kind]||[];var c=cs.find(function(c){return c.category_name===g;});return c?'id:'+c.category_id:'special:'+g;}
function categoryOrder(gs,kind){return applyOrder(gs,function(g){return categoryID(g,kind);},'categories:'+kind);}
function groupKey(g){return JSON.stringify([state.provider&&state.provider.id||'',g]);}
function isFavorite(i){return saved(favorites,i)||(i.kind==='live'&&(categoryFavorites.indexOf(groupKey(i.group))>=0||categoryFavorites.indexOf(groupKey('All'))>=0));}
function applyOrder(values,ids,type){
 var list=organizeOrders[orderScope(type)];if(!Array.isArray(list))return values;
 var ranks=new Map();list.forEach(function(id,n){if(typeof id==='string')ranks.set(id,n);});
 return values.map(function(v,n){return {v:v,n:n,r:ranks.has(ids(v))?ranks.get(ids(v)):list.length+n};}).sort(function(a,b){return a.r-b.r||a.n-b.n;}).map(function(x){return x.v;});
}
function orderedGroups(groups){var out=categoryOrder(groups,state.kind);return state.kind==='live'?out.concat('@favorites'):out;}
function orderedChannels(items){return applyOrder(items,key,itemOrderType());}
function organizationTarget(el){if(!el||(!$('player').hidden&&!document.body.classList.contains('episode-inline')&&$('quick-channels').hidden)||!$('connection').hidden)return null;
 if(el.dataset.episodeIndex!==undefined){var ep=episodeWindow.items[Number(el.dataset.episodeIndex)];return ep&&{type:'episodes',scope:'episodes:'+key(seriesItem)+':'+seriesSeason,id:key(ep),item:ep,label:ep.name};}
 if(el.dataset.organizeChannel)return {type:'items',scope:itemOrderType(),id:el.dataset.organizeChannel,label:el.textContent,item:state.filtered.find(function(i){return key(i)===el.dataset.organizeChannel;})};
 if(el.dataset.organizeGroup)return {type:'categories',scope:'categories:'+state.kind,id:categoryID(el.dataset.organizeGroup,state.kind),label:el.textContent,group:el.dataset.organizeGroup};
 if(el.dataset.inlineGroup!==undefined)return {type:'inlineCategories',scope:'categories:'+homeInline.kind,id:categoryID(el.dataset.inlineGroup||'All',homeInline.kind),label:el.textContent};
 if(el.dataset.inlineIndex!==undefined){var i=homeInline.items[homeInline.page*60+Number(el.dataset.inlineIndex)];return i&&{type:'inlineItems',scope:'home-inline:'+homeInline.kind+':'+(homeInline.group||'All'),id:key(i),item:i,label:i.name};}
 if(el.dataset.orderId)return {type:'dom',scope:el.dataset.orderList,id:el.dataset.orderId,label:el.textContent,item:el._orderItem};
 return null;
}
function organizationValues(t){
 if(t.type==='episodes')return episodeWindow.items.map(key);
 if(t.type==='dom'&&/^related:/.test(t.scope))return movieRelated.map(key);
 if(t.type==='dom'&&(/^quick:/.test(t.scope)||/^episodes:/.test(t.scope)))return quickItems.map(key);
 if(t.type==='items')return state.filtered.map(key);
 if(t.type==='categories')return categoryWindow.nodes.map(function(b){return categoryID(b.dataset.groupName,state.kind);});
 if(t.type==='inlineCategories')return Array.from($('home-inline-categories').children).map(function(b){return categoryID(b.dataset.inlineGroup||'All',homeInline.kind);});
 if(t.type==='inlineItems')return homeInline.items.map(key);
 return Array.from(document.querySelectorAll('[data-order-list]')).filter(function(b){return b.dataset.orderList===t.scope;}).map(function(b){return b.dataset.orderId;});
}
function findOrganizationTarget(t){
 if(t.type==='episodes')return Array.from($('episode-list').querySelectorAll('[data-episode-index]')).find(function(b){return key(episodeWindow.items[Number(b.dataset.episodeIndex)])===t.id;});
 if(t.type==='items')return Array.from($('items').querySelectorAll('button')).find(function(b){return b.dataset.organizeChannel===t.id;});
 if(t.type==='categories')return categoryWindow.nodes.find(function(b){return categoryID(b.dataset.groupName,state.kind)===t.id;});
 if(t.type==='inlineCategories')return Array.from($('home-inline-categories').children).find(function(b){return categoryID(b.dataset.inlineGroup||'All',homeInline.kind)===t.id;});
 if(t.type==='inlineItems')return Array.from($('home-inline-items').querySelectorAll('[data-inline-index]')).find(function(b){var i=homeInline.items[homeInline.page*60+Number(b.dataset.inlineIndex)];return i&&key(i)===t.id;});
 return Array.from(document.querySelectorAll('[data-order-list]')).find(function(b){return b.dataset.orderList===t.scope&&b.dataset.orderId===t.id;});
}
function focusOrganization(t){
 if(t.type==='episodes'){var n=episodeWindow.items.findIndex(function(e){return key(e)===t.id;});if(n>=0)paintEpisodes(Math.max(0,n-epLayout().cols));}
 if(t.type==='items'){var n=state.filtered.findIndex(function(i){return key(i)===t.id;});if(n>=0)renderWindow(Math.max(0,n-gridSpec().cols));}
 if(t.type==='categories'){var n=categoryWindow.nodes.findIndex(function(b){return categoryID(b.dataset.groupName,state.kind)===t.id;});if(n>=0)paintCategoryWindow(Math.max(0,n-3));}
 if(t.type==='inlineItems'){var n=homeInline.items.findIndex(function(i){return key(i)===t.id;});if(n>=0){homeInline.page=Math.floor(n/60);paintHomeInlineItems();}}
 if(t.type==='dom'&&(/^quick:/.test(t.scope)||/^episodes:/.test(t.scope))){var qn=quickItems.findIndex(function(i){return key(i)===t.id;});if(qn>=0)renderQuick(qn);}
 if(t.type==='dom'&&/^related:/.test(t.scope)){var rn=movieRelated.findIndex(function(i){return key(i)===t.id;});if(rn>=0)paintRelatedMovies(Math.max(0,rn-6));}
 var el=findOrganizationTarget(t);if(el){el.classList.toggle('moving-item',!!(organize&&organize.mode==='move'));el.focus();el.scrollIntoView({block:'nearest'});}
}
function repaintOrganization(t){
 if(t.type==='episodes'){episodeWindow.items=applyOrder(episodeWindow.items,key,t.scope);paintEpisodes(episodeWindow.start);return;}
 if(t.type==='items'||t.type==='categories'){lastCategorySignature='';render();}
 else if(t.type==='inlineItems'){homeInline.items=applyOrder(homeInline.items,key,t.scope);paintHomeInlineItems();}
 else if(t.type==='inlineCategories'){var parent=$('home-inline-categories');applyOrder(Array.from(parent.children),function(b){return categoryID(b.dataset.inlineGroup||'All',homeInline.kind);},t.scope).forEach(function(b){parent.appendChild(b);});}
 else if(t.type==='dom'&&(/^quick:/.test(t.scope)||/^episodes:/.test(t.scope))){quickItems=applyOrder(quickItems,key,t.scope);renderQuick(quickIndex);}
 else if(t.type==='dom'&&/^related:/.test(t.scope)){movieRelated=applyOrder(movieRelated,key,t.scope);paintRelatedMovies(relatedStart);}
 else paintDOMOrders();
}
function markOrder(el,id,list,item){el.dataset.orderId=id;el.dataset.orderList=list;if(item)el._orderItem=item;}
function paintDOMOrders(){
 var lists={};document.querySelectorAll('[data-order-list]').forEach(function(b){(lists[b.dataset.orderList]||(lists[b.dataset.orderList]=[])).push(b);});
 Object.keys(lists).forEach(function(list){var nodes=lists[list],ordered=applyOrder(nodes,function(b){return b.dataset.orderId;},list);if(ordered.some(function(b,n){return nodes[n]!==b;}))ordered.forEach(function(b){b.parentNode.appendChild(b);});});
 // Settings stays bottom by default; an explicit sidebar move removes the pin.
 document.querySelector('nav').classList.toggle('custom-order',!!organizeOrders[orderScope('sidebar')]);
}
function beginOrganization(t,panel){
 organize.mode='move';organize.scope=orderScope(t.scope);organize.before=organizeOrders[organize.scope]&&organizeOrders[organize.scope].slice();organize.draft=organizationValues(t);organize.original=organize.draft.slice();
 panel.replaceChildren();var note=document.createElement('p');note.textContent=tr('ترتيب · الأسهم للتحريك · OK للتثبيت · رجوع للإلغاء');panel.appendChild(note);panel.classList.add('move-hint');focusOrganization(t);
}
function closeOrganization(){window.APOrganizationActive=false;var old=organize;organize=null;var panel=$('organize-panel');if(panel)panel.remove();document.querySelectorAll('.moving-item').forEach(function(b){b.classList.remove('moving-item');});if(old)focusOrganization(old.target);}
function showOrganization(t){
 window.APOrganizationActive=true;
 stopPreview();organize={mode:'menu',target:t};var panel=document.createElement('div');panel.id='organize-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',tr('خيارات العنصر'));
 var title=document.createElement('p');title.textContent=t.label;panel.appendChild(title);
 var canFavorite=!!t.item||t.type==='categories'||t.type==='inlineCategories';
 var favKey=t.item?key(t.item):groupKey(t.group||t.id),yes=(t.item?favorites:categoryFavorites).indexOf(favKey)>=0;
 if(canFavorite)panel.appendChild(button(yes?tr('إزالة من المفضلة'):tr('إضافة للمفضلة'),function(){
 if(t.item){favorites=yes?favorites.filter(function(k){return k!==favKey;}):favorites.concat(favKey);setSaved('ap-favorites',favorites);}
 else{categoryFavorites=yes?categoryFavorites.filter(function(k){return k!==favKey;}):categoryFavorites.concat(favKey);setSaved('ap-category-favorites',categoryFavorites);}
 closeOrganization();if(t.type==='items'||t.type==='categories')render();focusOrganization(t);
 }));
 // On Home shelves the row itself has its own stable order, distinct from its cards.
 if(t.type==='dom'&&/^home-(movies|series)$/.test(t.scope))panel.appendChild(button(tr('ترتيب الصف'),function(){var row=$(t.scope).parentNode;organize.target={type:'dom',scope:'home-rows',id:row.dataset.orderId,label:t.label};beginOrganization(organize.target,panel);}));
 var reorder=button(tr('ترتيب'),function(){beginOrganization(t,panel);
 });reorder.id='organize-move';panel.appendChild(reorder);$('screen').appendChild(panel);panel.querySelector('button').focus();
}
function reorderStep(delta){
 var t=organize.target,visible=organize.draft,n=visible.indexOf(t.id),other=visible[n+delta];if(!other)return;
 var a=organize.draft.indexOf(t.id),b=organize.draft.indexOf(other);organize.draft[a]=other;organize.draft[b]=t.id;organizeOrders[organize.scope]=organize.draft.slice();
 repaintOrganization(t);focusOrganization(t);
}
function finishOrganization(cancel){
 var t=organize.target;if(cancel){organizeOrders[organize.scope]=organize.original.slice();repaintOrganization(t);if(organize.before===undefined)delete organizeOrders[organize.scope];else organizeOrders[organize.scope]=organize.before;}else storeWrite('ap-live-order',JSON.stringify(organizeOrders));
 closeOrganization();repaintOrganization(t);focusOrganization(t);
}
document.addEventListener('keydown',function(e){
 var k=({13:'Enter',37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',27:'Escape',461:'BrowserBack'})[e.keyCode]||e.key,back=e.keyCode===461||k==='Escape'||k==='BrowserBack';
 if(organize){e.preventDefault();e.stopImmediatePropagation();if(k==='Enter'&&hold&&hold.opened)return;
 if(organize.mode==='move'){if(back)finishOrganization(true);else if(k==='Enter'&&!e.repeat)finishOrganization(false);else if(/^Arrow/.test(k)){var cols=organize.target.type==='items'&&state.kind!=='live'?gridSpec().cols:organize.target.type==='inlineItems'?6:1;reorderStep(k==='ArrowUp'?-cols:k==='ArrowDown'?cols:k==='ArrowLeft'?-1:1);}}
 else if(back)closeOrganization();else if(k==='ArrowUp'||k==='ArrowDown'){var bs=$('organize-panel').querySelectorAll('button');var idx=Array.from(bs).indexOf(document.activeElement);bs[(idx+(k==='ArrowUp'?-1:1)+bs.length)%bs.length].focus();}else if(k==='Enter'&&!e.repeat)document.activeElement.click();
 return;}
 if(k!=='Enter')return;var t=organizationTarget(document.activeElement);if(!t)return;
 e.preventDefault();e.stopImmediatePropagation();if(hold)return;
 hold={el:document.activeElement,target:t,opened:false};hold.timer=setTimeout(function(){if(hold){hold.opened=true;showOrganization(hold.target);}},650);
},true);
document.addEventListener('keyup',function(e){if((e.key!=='Enter'&&e.keyCode!==13)||!hold)return;e.preventDefault();e.stopImmediatePropagation();var h=hold;hold=null;clearTimeout(h.timer);if(!h.opened&&h.el.isConnected)h.el.click();},true);
addEventListener('blur',function(){if(hold){clearTimeout(hold.timer);hold=null;}if(organize){if(organize.mode==='move')finishOrganization(true);else closeOrganization();}});

function key(item){return (state.provider?state.provider.id:'')+':'+item.kind+':'+item.id;}
function saved(list,item){return list.indexOf(key(item))>=0;}
function setSaved(name,list){storeWrite(name,JSON.stringify(list.slice(0,300)));lastHomePaint=null;}
function channelLogo(item){
var box=document.createElement('span');box.className='channel-logo';
var initials=document.createElement('span');initials.className='logo-initials';initials.textContent=(item.name||'?').trim().split(/\s+/).slice(0,2).map(function(x){return Array.from(x)[0];}).join('').toUpperCase();box.appendChild(initials);
if(item.logo){var img=image(item.logo);img.loading='eager';img.onload=function(){initials.hidden=true;};img.onerror=function(){img.remove();initials.hidden=false;};box.appendChild(img);}
return box;
}
function fallbackArt(title){
var clean=String(title||'Alaa IPTV').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];}).slice(0,140);
return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#414145"/><stop offset=".52" stop-color="#2b2b2f"/><stop offset="1" stop-color="#1c1c20"/></linearGradient></defs><rect width="600" height="800" fill="url(#g)"/><circle cx="530" cy="100" r="260" fill="#ffffff" opacity=".04"/><path d="M265 290l95 55-95 55z" fill="#ffffff" opacity=".45"/><text x="300" y="480" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="27" textLength="'+Math.min(500,maxWidth(clean))+'" lengthAdjust="spacingAndGlyphs">'+clean+'</text><text x="300" y="740" text-anchor="middle" fill="#b6c3d4" font-family="Arial" font-size="20">ALAA PLAYER</text></svg>');
}
function maxWidth(text){return Math.max(100,text.length*16);}
// Browser native lazy decoding avoids one observer and two timers per poster.
function image(src,cls,title){
var img=document.createElement('img');activeArtwork.add(img);img.onload=function(){activeArtwork.delete(img);};img.alt=title||'';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
if(cls)img.className=cls;
img.onerror=function(){img.onerror=null;img.dataset.fallback='true';img.src=fallbackArt(title);};
if(src)img.src=src;else img.onerror();
return img;
}
// Display-only provider decoration cleanup; IDs, provider names and search remain untouched.
function posterTitle(name){if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour'))name=String(name||'').replace(/^\s*(?:(?:AR|AS|EN|FR|TR)(?:[- ](?:TR|SUBS?|S|D|DO))*(?:\s*[-:|]\s*)|TOP\s*[-:|]\s*)/i,'');return String(name||'').replace(/^\s*(?:(?:4K|8K|FHD|UHD|HD)\s*-\s*(?:SH|AR\s*-\s*TR\s*-\s*D|AR\s*-\s*DO|AR\s*-\s*D|AR)\s*[-:|]\s*|SH[- ](?:4K|8K|FHD|UHD|HD)\s*[-:|]\s*)/i,'').trim();}
function posterMetadata(i){return [i.year&&/^\d{4}$/.test(String(i.year))?i.year:'',i.rating&&isFinite(Number(i.rating))&&Number(i.rating)>0?'★ '+i.rating:''].filter(Boolean).join(' · ');}
window.APPosterDisplay={title:posterTitle,metadata:posterMetadata};
function metadata(item){return [item.year,item.seasons?item.seasons+tr(' مواسم'):'',item.episodeCount?item.episodeCount+tr(' حلقات'):'',item.rating?'★ '+item.rating:'',item.quality].filter(Boolean).join('  ·  ');}

var categoryWindow={nodes:[],start:0};
function paintCategoryWindow(start){
var cat=$('categories'),nodes=categoryWindow.nodes;
start=Math.max(0,Math.min(start,Math.max(0,nodes.length-20)));categoryWindow.start=start;
var top=cat.scrollTop;cat.replaceChildren();
function pad(h){var d=document.createElement('div');d.style.height=h+'px';d.className='category-space';cat.appendChild(d);}
pad(start*66);nodes.slice(start,start+20).forEach(function(b){cat.appendChild(b);});pad(Math.max(0,nodes.length-start-20)*66);cat.scrollTop=top;
}
function installCategoryWindow(nodes){categoryWindow.nodes=nodes;nodes.forEach(function(b,i){b.dataset.categoryIndex=i;});
var selected=nodes.findIndex(function(b){return b.classList.contains('selected');});paintCategoryWindow(Math.max(0,selected-3));}
$('categories').addEventListener('scroll',function(){
if($('categories').contains(document.activeElement))return;
var start=Math.max(0,Math.floor($('categories').scrollTop/66)-2);if(start!==categoryWindow.start)paintCategoryWindow(start);
});
function renderItems(){
fPaintNew();
clearTimeout(focusDetailTimer);
['hd','4k'].forEach(function(f){$('filter-'+f).hidden=!state.items.some(function(i){return (f==='hd'?/\bHD\b|FHD|1080|720/i:/4K|UHD|2160/i).test(i.quality||i.name);});});

['all','favorites','hd','4k'].forEach(function(f){$('filter-'+f).classList.toggle('selected',state.filter===f);});

var q=$('search').value.trim().toLocaleLowerCase();
var live=state.kind==='live';if(live){$('browser').appendChild($('detail'));document.querySelector('.library').insertBefore($('subcategories'),$('hero'));}else if($('detail').parentNode!==$('browser')){$('browser').appendChild($('detail'));}
$('browser').classList.toggle('movie-view',state.kind==='movies'&&!state.episodes);state.filtered=state.items.filter(function(i){return (state.group==='All'||(state.group==='@favorites'?isFavorite(i):i.group===state.group))&&(!q||i.name.toLocaleLowerCase().indexOf(q)!==-1)&&(state.filter!=='favorites'||isFavorite(i))&&(state.filter!=='recent'||saved(recent,i))&&(state.filter!=='hd'||/\bHD\b|FHD|1080|720/i.test(i.quality||i.name))&&(state.filter!=='4k'||/4K|UHD|2160/i.test(i.quality||i.name));});
state.filtered=orderedChannels(state.filtered);
$('count').textContent=state.filtered.length+' '+(state.kind==='live'?tr('قناة'):tr('عنوان'))+(state.group==='All'?'':' · '+(state.group==='@favorites'?tr('المفضلة'):state.group));
movieDiscovery(q);
seriesControls();
var keep=softKeep;softKeep=null;
if(keep){var ni=keep.focusId==null?-1:state.filtered.findIndex(function(x){return x.id===keep.focusId;});
if(ni<0&&keep.hadFocus&&keep.focusIndex>=0&&state.filtered.length)ni=Math.min(keep.focusIndex,state.filtered.length-1);
var cols=state.kind!=='live'&&!state.episodes?(document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour'?6:document.body.dataset.theme==='harak'?5:document.body.dataset.theme==='alaa'?6:(((document.body.dataset.theme==='red'||document.body.dataset.theme==='aya')&&window.APRed)?5:6)):1;
var ws=ni>=0?Math.max(0,Math.floor(ni/cols)*cols-cols*2):keep.virtualStart;
if(ni<0&&keep.virtualStart>=state.filtered.length)ws=0;
if(state.view!=='home')renderWindow(ws);else $('items').replaceChildren();
var fb=ni>=0&&$('items').querySelector('button[data-index="'+ni+'"]');
if(fb&&keep.hadFocus){try{fb.focus({preventScroll:true});}catch(e){}$('items').scrollTop=Math.max(0,fb.offsetTop-keep.focusOffset);}
else $('items').scrollTop=keep.scrollTop;}
else{state.virtualStart=0;$('items').scrollTop=0;if(state.view!=='home')renderWindow(0);else $('items').replaceChildren();}
livePages();
if(keep&&keep.selectedId!=null&&state.filtered.some(function(x){return x.id===keep.selectedId;})){var cur=state.filtered.find(function(x){return x.id===keep.selectedId;});state.selected=null;select(cur);}
else if(state.filtered.length)select(keep&&ni>=0?state.filtered[ni]:state.filtered[0]);else select(null);
if(state.view!=='home'&&state.kind!=='live'&&state.filtered.length)hero(state.filtered[0]);else $('hero').hidden=true;
}
function movieDiscovery(query){
var show=false;
$('movie-discovery').hidden=!show;
var genres=$('genre-cards'),shelf=$('movie-shelf');genres.replaceChildren();shelf.replaceChildren();
if(!show)return;
var groups={};state.items.forEach(function(i){if(!groups[i.group])groups[i.group]={count:0,item:i};groups[i.group].count++;});
Object.keys(groups).slice(0,16).forEach(function(g){
var b=button('',function(){state.group=g;render();focusFirst();});
var item=groups[g].item;if(item.backdrop)b.appendChild(image(item.backdrop));
var t=document.createElement('span');t.textContent=g;var n=document.createElement('small');n.textContent=groups[g].count+tr(' فيلم');b.appendChild(t);b.appendChild(n);b.classList.toggle('selected',state.group===g);genres.appendChild(b);
});
shelf.hidden=true;
$('latest-heading').textContent=tr('جميع الأفلام')+(state.group==='All'?'':' · '+(state.group==='@favorites'?tr('المفضلة'):state.group));
}
var focusDetailTimer;
function redLayout(){return (document.body.dataset.theme==='red'||(document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour'))&&window.APRed?window.APRed.layout():null;}
function gridSpec(){if(window.APTouch)return {cols:innerWidth<600?2:4,row:260,page:32};var L=state.kind!=='live'&&!state.episodes?redLayout():null;return L?L.grid:{cols:6,row:350,page:24};}
function episodeCols(){var L=redLayout();return L?L.episodes.cols:5;}
function renderWindow(start){
var el=$('items'),rowHeight=window.APTouch&&state.kind==='live'?68:state.kind==='live'?(document.body.dataset.theme==='velour'?(document.body.dataset.channelSize==='large'?138:document.body.dataset.channelSize==='medium'?118:98):93):158;var G=state.kind!=='live'&&!state.episodes?gridSpec():null,cols=G?G.cols:1;start=Math.floor(start/cols)*cols;var ps=G?G.page:pageSize;rowHeight=G?G.row:rowHeight;state.virtualStart=start;el.replaceChildren();
function spacer(height){var d=document.createElement('div');d.className='virtual-space';d.style.height=height+'px';el.appendChild(d);}
if(G){el.style.paddingTop=(start/cols*rowHeight)+'px';}else{el.style.paddingTop='';el.style.paddingBottom='';spacer(start/cols*rowHeight);}
state.filtered.slice(start,start+ps).forEach(function(item,index){
var b=button('',function(){select(item);open(item);});b.dataset.index=start+index;b.dataset.organizeChannel=key(item);b.setAttribute('role','listitem');
var num=document.createElement('span');num.className='number';num.textContent=String(start+index+1).padStart(2,'0');b.appendChild(num);
if(item.kind==='live')b.appendChild(channelLogo(item));else b.appendChild(image(item.logo,null,item.name));
var stack=document.createElement('div');stack.className='title-stack';var text=document.createElement('div');text.className='item-name';text.textContent=item.kind==='live'?displayLabel(item.name):posterTitle(item.name);stack.appendChild(text);
if(item.program){var program=document.createElement('small');program.textContent=item.program;stack.appendChild(program);}
b.appendChild(stack);

var meta=document.createElement('span');meta.className=item.kind==='live'?'live':'metadata';meta.textContent=item.kind==='live'?tr('مباشر'):posterMetadata(item);b.appendChild(meta);
if(item.kind==='live'||(document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')){var heart=document.createElement('span');heart.className='row-heart';heart.textContent=saved(favorites,item)?'♥':'♡';heart.setAttribute('aria-label',tr('المفضلة'));heart.onclick=function(e){e.stopPropagation();var k=key(item);if(saved(favorites,item))favorites=favorites.filter(function(x){return x!==k;});else favorites.push(k);setSaved('ap-favorites',favorites);heart.textContent=saved(favorites,item)?'♥':'♡';select(item);};b.appendChild(heart);}
b.onfocus=function(){clearTimeout(focusDetailTimer);focusDetailTimer=setTimeout(function(){select(item);},120);};el.appendChild(b);if(organize&&organize.mode==='move'&&organize.target.type==='channels'&&key(item)===organize.target.id){b.classList.add('moving-item');b.focus();}
});
if(G){el.style.paddingBottom=(Math.ceil(Math.max(0,state.filtered.length-start-ps)/cols)*rowHeight)+'px';}else spacer(Math.ceil(Math.max(0,state.filtered.length-start-ps)/cols)*rowHeight);
if(!state.filtered.length){var empty=document.createElement('p');empty.className='catalog-empty';empty.textContent=!state.provider?tr('اربط جهازك أو أضف قائمة من الإعدادات'):state.provider.type==='m3u'&&state.kind!=='live'?tr('تظهر عناصر M3U ضمن البث المباشر. استخدم Xtream للأفلام والمسلسلات.'):state.filter==='favorites'?tr('لم تضف عناصر للمفضلة بعد'):state.filter==='recent'?tr('لم تشاهد أي عناصر بعد'):$('search').value?tr('لا توجد نتائج مطابقة للبحث'):tr('لا توجد عناصر في هذه القائمة');el.appendChild(empty);}
}
var scrollFrame=false;
$('items').addEventListener('scroll',function(){if(scrollFrame)return;scrollFrame=true;requestAnimationFrame(function(){scrollFrame=false;var G=state.kind!=='live'&&!state.episodes?gridSpec():null,cols=G?G.cols:1;var rowHeight=G?G.row:window.APTouch&&state.kind==='live'?68:state.kind==='live'?(document.body.dataset.theme==='velour'?(document.body.dataset.channelSize==='large'?138:document.body.dataset.channelSize==='medium'?118:98):93):158,start=Math.max(0,Math.floor($('items').scrollTop/rowHeight)-1)*cols;if(start!==state.virtualStart){var focused=$('items').contains(document.activeElement)?document.activeElement.dataset.index:null;if(!window.APTouch&&focused!=null&&Number(focused)>=state.virtualStart&&Number(focused)<state.virtualStart+(G?G.page:pageSize))return;renderWindow(start);}});});
function livePages(){$('pagination').replaceChildren();}
function hero(item){
$('hero').hidden=false;$('hero-name').textContent=item.name;$('hero-meta').textContent=metadata(item)||item.group;
var previous=$('hero').querySelector('img');if(previous)previous.remove();if(item.backdrop)$('hero').prepend(image(item.backdrop));
$('hero-play').onclick=function(){open(item);};
}
function select(item){
if(state.selected===item)return;stopPreview();state.selected=item;$('detail-quality').textContent=item?item.quality||'':'';$('detail-quality').hidden=!(item&&item.quality);$('detail-name').textContent=item?displayLabel(item.name):'Alaa IPTV';$('detail-group').textContent=item?displayLabel(item.group):tr('اختر قناة للمشاهدة');
$('detail-kind').textContent=item?(item.program||''):'';
// Remote focus paints text immediately; only the settled item decodes artwork.
clearTimeout(selectionArtTimer);var selected=item;
selectionArtTimer=setTimeout(function(){if(state.selected!==selected)return;
var cover=$('cover'),old=cover.querySelector('img'),src=selected&&selected.logo||'';
if(old&&old.getAttribute('data-cover-source')!==src){old.remove();old=null;}
var cs=cover.querySelector('span');cs.hidden=!!src;cs.textContent=(!src&&selected&&selected.kind==='live')?(displayLabel(selected.name).replace(/^[A-Za-z]{2}\s*[:|]\s*/,'').replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('').toUpperCase()||'TV'):'\u25B6';cs.classList.toggle('cover-initials',!src&&!!selected&&selected.kind==='live');
if(src&&!old){var art=image(src);art.setAttribute('data-cover-source',src);cover.prepend(art);}
},100);
}
var selectionArtTimer;
var homeCatalog={live:[],movies:[],series:[]},homeLoadState={movies:'idle',series:'idle'},heroIndex=0;
async function loadHomeCatalog(p){
if(p.type!=='xtream'){homeLoadState={movies:'unsupported',series:'unsupported'};catalogReady=true;homeContent();flushFeatured();return;}
if(homeLoadTask)return homeLoadTask;
var epoch=catalogEpoch;
var task=(async function(){
for(var kind of ['movies','series']){await (async function(kind){
if(homeLoadState[kind]==='ready')return;
homeLoadState[kind]='loading';homeContent();
try{
var list=await xcCatalog(p,kind);
if(state.provider!==p||epoch!==catalogEpoch)return;
homeCatalog[kind]=uniqueTitles(list);homeLoadState[kind]='ready';
}catch(e){
if(state.provider!==p||epoch!==catalogEpoch)return;
homeLoadState[kind]='error';
}
if(state.provider===p&&epoch===catalogEpoch)homeContent();
})(kind);}
if(state.provider!==p||epoch!==catalogEpoch)return;
catalogReady=true;
await saveHomeSnapshot(p);warmCatalogImages(homeCatalog.movies.concat(homeCatalog.series,homeCatalog.live));prefetchCatalog(p);featuredWriter.publish(homeCatalog.movies.concat(homeCatalog.series),p);flushFeatured();
})().finally(function(){if(epoch===catalogEpoch)homeLoadTask=null;});
homeLoadTask=task;return task;
}
var heroMetadataBusy={},heroMetadataDone={};
function heroBackdrop(value){var values=Array.isArray(value)?value:[value];for(var n=0;n<values.length;n++){var url=A.safeURL(values[n]);if(url)return url;}return ''; }
function enrichHero(item){
if(!item||!item.provider||heroMetadataBusy[key(item)]||heroMetadataDone[key(item)])return;
var id=key(item),provider=state.provider;
heroMetadataBusy[id]=true;
xc(item.provider,item.kind==='series'?'get_series_info':'get_vod_info',item.id).then(function(data){
if(provider!==state.provider||!itemAllowed(item,provider))return;
var info=data.info||{};
item.description=info.plot||info.description||'';
item.backdrop=heroBackdrop(info.backdrop_path)||heroBackdrop(item.backdrop);item.genre=info.genre||item.genre;item.year=/^\d{4}/.test(String(info.releaseDate||info.releasedate||''))?String(info.releaseDate||info.releasedate).slice(0,4):item.year;item.rating=info.rating||item.rating;
heroMetadataDone[id]=true;saveHomeSnapshot(provider);lastHomePaint=null;if(state.view==='home')homeContent();
}).catch(function(){heroMetadataDone[id]=true;}).finally(function(){delete heroMetadataBusy[id];});
}
setInterval(function(){
if(state.view==='home'&&$('player').hidden&&$('connection').hidden&&!$('home-details').open&&document.activeElement!==$('home-play')&&document.activeElement!==$('home-info')&&!$('hero-dots').contains(document.activeElement)){
heroIndex++;homeContent();
}
},9000);
var lastHomePaint=null;
function homeContent(){
fPaintContinue();
if(!homeCatalog||state.view!=='home'||!$('movie-detail').hidden||!$('series-detail').hidden)return;
var pool=[],movies=homeCatalog.movies,series=homeCatalog.series;
for(var h=0;h<Math.max(movies.length,series.length)&&pool.length<5;h++){
if(series[h]&&(series[h].backdrop||series[h].logo))pool.push(series[h]);
if(pool.length<5&&movies[h]&&(movies[h].backdrop||movies[h].logo))pool.push(movies[h]);
}
var candidates=pool;
var paintKey=[heroIndex,homeLoadState.movies,homeLoadState.series,movies,series,homeCatalog.live];
if(lastHomePaint&&paintKey.every(function(v,i){return v===lastHomePaint[i];}))return;lastHomePaint=paintKey;
var item=candidates[heroIndex%candidates.length];enrichHero(item);
$('home-hero').classList.toggle('provider-hero',!!item);$('home-hero').classList.toggle('reference-fallback',!item);
var wide=item&&heroBackdrop(item.backdrop),poster=item&&A.safeURL(item.logo),heroHost=$('home-hero');
if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')){if(document.body.dataset.theme==='aya')wide=null;var ac=$('aya-hero-card');if(!ac){ac=document.createElement('div');ac.id='aya-hero-card';heroHost.appendChild(ac);}ac.textContent=item?posterTitle(item.name):'';}
var artRequest=(heroHost._artRequest||0)+1;heroHost._artRequest=artRequest;
if(wide||poster){
var ref=document.createElement('img');activeArtwork.add(ref);ref.alt=item?posterTitle(item.name):'';ref.className='reference-hero-art';ref.decoding='async';ref.referrerPolicy='no-referrer';
var triedPoster=!wide;
ref.onload=function(){
var paint=function(){activeArtwork.delete(ref);if(heroHost._artRequest!==artRequest)return;
var previous=Array.from(heroHost.querySelectorAll(':scope > img'));
heroHost.classList.toggle('hero-poster-fallback',triedPoster||ref.naturalWidth/ref.naturalHeight<1.5);
heroHost.prepend(ref);previous.forEach(function(old){old.remove();});
};
if(ref.decode)ref.decode().then(paint,paint);else paint();
};
ref.onerror=function(){if(!triedPoster&&poster){triedPoster=true;ref.src=poster;}else{ref.onload=null;ref.onerror=null;}};
ref.src=document.body.dataset.theme==='harak'?(poster||wide):(wide||poster);
}else if(!item){heroHost.querySelectorAll(':scope > img').forEach(function(old){old.remove();});}

$('home-title').textContent=item?posterTitle(item.name):tr('مكتبتك، على شاشتك');
$('home-meta').textContent=item?[posterMetadata(item),item.genre||''].filter(Boolean).join(' · '):'';$('home-meta').hidden=!$('home-meta').textContent;if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')){$('home-meta').textContent=item&&item.kind==='series'?tr('مسلسل مميز'):tr('فيلم مميز');$('home-meta').hidden=false;}
$('home-description').textContent=item?(item.description||'').slice(0,240):tr('أضف قائمة تشغيل لتظهر مكتبتك هنا');$('home-description').hidden=!$('home-description').textContent;
$('home-play').disabled=!item;$('home-play').setAttribute('aria-label',item?tr('شاهد ')+posterTitle(item.name):tr('شاهد الآن'));
$('home-play').onclick=function(){if(item)open(item);};
$('home-info').disabled=!item;
$('home-info').onclick=function(){if(!item)return;$('home-detail-title').textContent=item.name;$('home-detail-description').textContent=item.description||tr('لا يوفّر المزوّد وصفاً إضافياً');$('home-details').showModal();$('home-detail-close').focus();};
var dots=$('hero-dots');dots.replaceChildren();candidates.forEach(function(i,n){var d=button('',function(){heroIndex=n;homeContent();var d=$('hero-dots').children[n];if(d)d.focus();});d.setAttribute('aria-label',tr('العرض ')+(n+1));d.className=n===heroIndex%candidates.length?'selected':'';dots.appendChild(d);});
$('hero-prev').onclick=function(){heroIndex=(heroIndex+candidates.length-1)%Math.max(1,candidates.length);homeContent();};
$('hero-next').onclick=function(){heroIndex=(heroIndex+1)%Math.max(1,candidates.length);homeContent();};
var tiles=$('home-tiles'),focusedTile=tiles.contains(document.activeElement)&&document.activeElement.dataset.homeTile;tiles.replaceChildren();
[['live',tr('البث المباشر'),'▣'],['movies',tr('الأفلام'),'▤'],['series',tr('المسلسلات'),'▦'],['favorites',tr('المفضلة'),'♡'],['recent',tr('المشاهدة مؤخراً'),'◷'],['search',tr('البحث'),'⌕']].forEach(function(t,n){
var list=homeCatalog[t[0]]||[],savedKeys=t[0]==='favorites'?favorites:t[0]==='recent'?recent:null;
if(savedKeys)list=savedKeys.filter(function(id){return state.provider&&id.indexOf(state.provider.id+':')===0;});
var tile=button('',function(){selectHomeTile(t[0]);});tile.dataset.homeTile=t[0];markOrder(tile,t[0],'home-tiles');tile.classList.toggle('selected',homeInline.tile===t[0]);tile.setAttribute('aria-pressed',homeInline.tile===t[0]?'true':'false');
var art=document.createElement('span');art.className='tile-art';art.appendChild(categoryIcon(t[1]));tile.appendChild(art);var label=document.createElement('strong');label.textContent=t[1];tile.appendChild(label);var count=document.createElement('small');count.dataset.countCoverage=savedKeys?'saved-current-provider':t[0]==='search'?'action':'loaded-only';count.textContent=t[0]==='search'?tr('ابحث في مكتبتك'):savedKeys?list.length+tr(' عنصر محفوظ'):homeLoadState[t[0]]==='loading'?tr('جارٍ التحميل…'):homeLoadState[t[0]]==='error'?tr('تعذّر التحميل'):homeLoadState[t[0]]==='unsupported'?tr('غير متاح لقائمة M3U'):list.length+' '+(t[0]==='movies'?tr('فيلم محمّل'):t[0]==='series'?tr('مسلسل محمّل'):tr('قناة محمّلة'));tile.appendChild(count);tiles.appendChild(tile);
});
if(focusedTile){var restoreTile=tiles.querySelector('[data-home-tile="'+focusedTile+'"]');if(restoreTile)restoreTile.focus();}
['movies','series'].forEach(function(kind){var el=$('home-'+kind);var keepImg={};el.querySelectorAll('img[data-art]').forEach(function(im){if(im.complete&&im.naturalWidth>0)keepImg[im.dataset.art]=im;});el.replaceChildren();var list=uniqueTitles(homeCatalog[kind]).slice().sort(function(a,b){return b.added-a.added;}).slice(0,document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour'?7:document.body.dataset.theme==='harak'?7:(document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa')?4:kind==='movies'?6:5);
list.forEach(function(i){var card=button('',function(){open(i);});markOrder(card,key(i),'home-'+kind,i);var artKey=key(i)+'|'+(i.logo||''),kept=keepImg[artKey];if(kept){card.appendChild(kept);}else{var fresh=image(i.logo,null,i.name);if(fresh&&fresh.tagName==='IMG')fresh.dataset.art=artKey;card.appendChild(fresh);}
var q=String(i.quality||''),hq=/\b(4K|UHD|2160)\b/i.test(q)?'4K':/\b(FHD|HD|1080|720)\b/i.test(q)?'HD':'';if(hq){var hb=document.createElement('i');hb.className='hd-badge';hb.textContent=hq;card.appendChild(hb);}
var title=document.createElement('span');title.textContent=posterTitle(i.name);card.appendChild(title);
var meta=document.createElement('small');meta.textContent=posterMetadata(i);card.appendChild(meta);
el.appendChild(card);
});if(!list.length){var empty=document.createElement('p');empty.className='note';empty.textContent=homeLoadState[kind]==='error'?tr('تعذّر تحميل العناوين. تحقّق من اتصال المزوّد وصلاحية الاشتراك.'):homeLoadState[kind]==='unsupported'?tr('هذه قائمة M3U للبث المباشر. أضف حساب Xtream لعرض مكتبة الأفلام والمسلسلات.'):homeLoadState[kind]==='ready'?tr('لم يُرجع المزوّد عناوين لهذا القسم.'):tr('جارٍ تحميل العناوين…');el.appendChild(empty);
if(homeLoadState[kind]==='error'){var retry=button(tr('إعادة المحاولة'),function(){loadHomeCatalog(state.provider);});retry.className='catalog-retry';el.appendChild(retry);}}});
paintDOMOrders();
}
$('home-detail-close').onclick=function(){$('home-details').close();$('home-info').focus();};

document.querySelectorAll('nav button').forEach(function(b){markOrder(b,b.id||b.dataset.kind,'sidebar');});
Array.from($('home-shelves').children).forEach(function(row){row.tabIndex=0;markOrder(row,row.querySelector('.home-posters').id,'home-rows');});
paintDOMOrders();
var homeInline={tile:null,kind:'live',group:null,items:[],request:0,page:0,origin:false};
function homeTileFocus(){var tile=$('home-tiles').querySelector('[data-home-tile="'+homeInline.tile+'"]')||$('home-tiles').querySelector('button');if(tile){tile.focus();tile.scrollIntoView({block:'nearest'});}}
function inlinePattern(){return {kids:/kids|child|أطفال|اطفال/i,news:/news|أخبار|اخبار/i,sports:/sport|رياض/i}[homeInline.tile];}
function paintHomeInlineItems(){
homeInline.items=applyOrder(homeInline.items,key,'home-inline:'+homeInline.kind+':'+(homeInline.group||'All'));
var grid=$('home-inline-items');grid.replaceChildren();grid.scrollTop=0;
var live=homeInline.kind==='live';grid.classList.toggle('inline-live',live);
var start=homeInline.page*60,list=homeInline.items.slice(start,start+60);
list.forEach(function(item,n){
var card=button('',function(){homeInline.origin=true;open(item);});
card.dataset.inlineIndex=n;card.setAttribute('role','listitem');card.appendChild(image(item.logo,null,item.name));
var label=document.createElement('strong');label.textContent=homeInline.kind==='live'?item.name:posterTitle(item.name);card.appendChild(label);if(homeInline.kind!=='live'){var m=document.createElement('small');m.textContent=posterMetadata(item);card.appendChild(m);}
grid.appendChild(card);
});
if(!list.length){var empty=document.createElement('p');empty.className='note';empty.textContent=tr('لا يوجد محتوى متاح لهذا التصنيف.');grid.appendChild(empty);}
if(start>0){var prev=button(tr('‹ السابق'),function(){homeInline.page--;paintHomeInlineItems();$('home-inline-items button').focus();});prev.dataset.inlinePager='prev';grid.appendChild(prev);}
if(start+60<homeInline.items.length){var next=button(tr('التالي ›'),function(){homeInline.page++;paintHomeInlineItems();$('home-inline-items button').focus();});next.dataset.inlinePager='next';grid.appendChild(next);}
}
async function selectHomeInlineCategory(group){
homeInline.group=group;homeInline.page=0;var request=++homeInline.request,p=state.provider,kind=homeInline.kind;
var pattern=inlinePattern(),cached=homeCatalog[kind]||[];
homeInline.items=cached.filter(function(i){return (!pattern||pattern.test(i.group))&&(!group||i.group===group);});
$('home-inline-categories').querySelectorAll('button').forEach(function(b){b.classList.toggle('selected',b.dataset.inlineGroup===(group||''));});
paintHomeInlineItems();
if(!p||p.type!=='xtream')return;
var categories=kind==='live'?liveCategories:vodCategories[kind];
var wanted=categories.filter(function(c){return (!pattern||pattern.test(c.category_name))&&(!group||c.category_name===group);});
if(!group&&!pattern)wanted=wanted.slice(0,1);
try{
var rows=[];
for(var n=0;n<wanted.length;n++){
var items=await xcCatalog(p,kind,wanted[n].category_id);
if(request!==homeInline.request||state.provider!==p)return;
rows=rows.concat(items);
}
if(request!==homeInline.request||!wanted.length)return;
homeInline.items=uniqueTitles(rows);
if(!$('home-inline-items').contains(document.activeElement))paintHomeInlineItems();
}catch(e){/* Keep immediately hydrated rows when provider is offline. */}
}
function selectHomeTile(tile){
if(tile==='search'){$('nav-search').click();return;}
if(tile==='favorites'||tile==='recent'){
homeInline.request++;homeInline.tile=tile;homeInline.kind=tile;homeInline.group=null;homeInline.page=0;
$('home-inline').hidden=false;$('home-shelves').hidden=true;
$('home-inline-title').textContent=tile==='favorites'?tr('المفضلة'):tr('المشاهدة مؤخراً');
$('home-tiles').querySelectorAll('button').forEach(function(b){b.classList.toggle('selected',b.dataset.homeTile===tile);b.setAttribute('aria-pressed',b.dataset.homeTile===tile?'true':'false');});
var selectedKeys=tile==='favorites'?favorites:recent,available=homeCatalog.live.concat(homeCatalog.movies,homeCatalog.series,state.items||[]),byKey={};
available.forEach(function(i){byKey[key(i)]=i;});
homeInline.items=selectedKeys.map(function(id){return byKey[id];}).filter(Boolean);
$('home-inline-categories').replaceChildren();paintHomeInlineItems();return;
}
homeInline.tile=tile;homeInline.kind=/^(movies|series)$/.test(tile)?tile:'live';homeInline.group=null;homeInline.page=0;
$('home-inline').hidden=false;$('home-shelves').hidden=true;
$('home-inline-title').textContent={live:tr('البث المباشر'),movies:tr('الأفلام'),series:tr('المسلسلات'),kids:tr('الأطفال'),news:tr('الأخبار'),sports:tr('الرياضة')}[tile];
$('home-tiles').querySelectorAll('button').forEach(function(b){var selected=b.dataset.homeTile===tile;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected?'true':'false');});
var pattern=inlinePattern(),kind=homeInline.kind,groups=(kind==='live'?liveCategories:vodCategories[kind]).map(function(c){return c.category_name;});
(homeCatalog[kind]||[]).forEach(function(i){if(groups.indexOf(i.group)<0)groups.push(i.group);});
groups=groups.filter(function(g){return !pattern||pattern.test(g);});
var el=$('home-inline-categories');el.replaceChildren();
categoryOrder(['All'].concat(groups),kind).map(function(g){return g==='All'?null:g;}).forEach(function(g){var b=button(g||tr('جميع التصنيفات'),function(){selectHomeInlineCategory(g);});b.dataset.inlineGroup=g||'';el.appendChild(b);});
selectHomeInlineCategory(null);
}
function returnHomeInline(){
homeInline.origin=false;$('movie-detail').hidden=true;$('series-detail').hidden=true;state.view='home';
$('home').hidden=false;$('browser').hidden=true;
$('screen').classList.add('home-reference');document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('selected',b.id==='nav-home');});
homeTileFocus();
}
function stopDetailPlayback(){if(episodePresentation&&!episodePresentation.full){stop(false);if(video.parentNode)video.parentNode.removeChild(video);var slot=$('episode-mini-slot');if(slot)slot.remove();}}
function dismissPanels(){stopDetailPlayback();$('connection').hidden=true;$('movie-detail').hidden=true;$('series-detail').hidden=true;$('settings-open').classList.remove('selected');}
function navigate(kind,filter){stopDetailPlayback();
homeInline.origin=false;dismissPanels();
stopPreview();state.view='catalog';state.filter=filter||'all';state.episodes=null;$('search').value='';
document.querySelectorAll('nav button').forEach(function(b){b.classList.remove('selected');});
if(kind===state.kind){render();focusFirst();}else{state.kind=kind;load();}
}
function stopPreview(){var v=$('preview');if(v.hidden&&!v.childNodes.length)return;v.pause();v.removeAttribute('src');v.replaceChildren();v.load();v.hidden=true;}
var movieItem=null,movieRelated=[],movieRelatedEpoch=0;
function renderRelatedMovies(item,related){
var source=uniqueTitles((related|| (state.kind==='movies'?state.items:[])).concat(homeCatalog.movies));
movieRelated=source.filter(function(i){return i.kind==='movies'&&i.id!==item.id&&i.group===item.group;}).slice(0,120);
var grid=$('movie-related');grid.replaceChildren();grid.scrollTop=0;
paintRelatedMovies(0);
}
var relatedStart=0;
function paintRelatedMovies(start){
var grid=$('movie-related'),top=grid.scrollTop;relatedStart=Math.max(0,Math.floor(start/6)*6);grid.replaceChildren();
function pad(n){if(!n)return;var d=document.createElement('div');d.className='related-spacer';d.style.height=Math.max(0,n-12)+'px';grid.appendChild(d);}
pad(relatedStart/6*374);
applyOrder(movieRelated,key,'related:'+key(movieItem)).slice(relatedStart,relatedStart+24).forEach(function(i,offset){var n=relatedStart+offset;
var card=button('',function(){open(i);});card.dataset.relatedIndex=n;markOrder(card,key(i),'related:'+key(movieItem),i);card.setAttribute('role','listitem');
card.appendChild(image(i.logo,null,i.name));
var title=document.createElement('strong');title.textContent=posterTitle(i.name);card.appendChild(title);
var meta=document.createElement('small');meta.textContent=posterMetadata(i);card.appendChild(meta);grid.appendChild(card);
});
pad(Math.ceil(Math.max(0,movieRelated.length-relatedStart-24)/6)*374);grid.scrollTop=top;
if(!movieRelated.length){var note=document.createElement('p');note.className='note';note.textContent=tr('لا توجد أفلام أخرى في هذا التصنيف.');grid.appendChild(note);}
}
$('movie-related').addEventListener('scroll',function(){if(!window.APTouch&&this.contains(document.activeElement))return;var start=Math.max(0,(Math.floor(this.scrollTop/374)-1)*6);if(start!==relatedStart)paintRelatedMovies(start);});
async function loadRelatedMovies(item,epoch){
if(!item.provider)return;
var cat=vodCategories.movies.find(function(c){return c.category_name===item.group;});
if(!cat)return;
try{var list=await xcCatalog(item.provider,'movies',cat.category_id);
if(epoch!==movieRelatedEpoch||!movieItem||movieItem.id!==item.id||$('movie-detail').hidden)return;
if(!$('movie-related').contains(document.activeElement))renderRelatedMovies(item,list);
}catch(e){/* Keep the cached same-category titles if this optional list is unavailable. */}
}
function showMovie(item){
var first=!movieItem||movieItem.id!==item.id||$('movie-detail').hidden;movieItem=item;stopPreview();$('home').hidden=true;$('browser').hidden=true;$('series-detail').hidden=true;$('movie-detail').hidden=false;
$('movie-title').textContent=item.name;$('movie-meta').textContent=[metadata(item),item.genre,item.duration].filter(Boolean).join(' · ');
$('movie-description').textContent=item.description||'';
['movie-poster','movie-backdrop'].forEach(function(id){$(id).replaceChildren();});
$('movie-poster').appendChild(image(item.logo,null,item.name));
$('movie-backdrop').appendChild(image(item.backdrop,null,item.name));
var pr=progressFor(item);$('movie-resume').hidden=!(pr&&pr.time>10&&pr.duration-pr.time>10);
$('movie-play').onclick=function(){storeWrite('ap-progress-'+key(item),'null');play(movieItem);};$('movie-poster').onclick=$('movie-play').onclick;
$('movie-resume').onclick=function(){play(item);};
$('movie-favorite').textContent=saved(favorites,item)?tr('♥ المفضلة'):tr('♡ المفضلة');
$('movie-favorite').onclick=function(){var k=key(item);favorites=saved(favorites,item)?favorites.filter(function(x){return x!==k;}):favorites.concat(k);setSaved('ap-favorites',favorites);showMovie(item);};
if(first){var relatedEpoch=++movieRelatedEpoch;renderRelatedMovies(item);loadRelatedMovies(item,relatedEpoch);$('movie-play').focus();}
}
$('movie-back').onclick=function(){stopDetailPlayback();if(homeInline.origin){returnHomeInline();return;}$('movie-detail').hidden=true;navigate('movies');};
async function open(item){
if(fLocked(item)){fAuthorize(item,function(){open(item);});return;}
if(!itemAllowed(item,state.provider))return;
if(item.kind==='movies'){
var token=++state.request;showMovie(Object.assign({},item));
if(item.provider){try{var result=await xc(item.provider,'get_vod_info',item.id);if(token!==state.request||$('movie-detail').hidden)return;var info=result.info||{};var detail=Object.assign({},item);detail.description=info.plot||item.description;detail.genre=info.genre||item.genre;detail.duration=info.duration||'';detail.rating=info.rating||item.rating;detail.year=info.releasedate&&String(info.releasedate).slice(0,4)||item.year;detail.logo=A.safeURL(info.movie_image)||item.logo;detail.backdrop=A.safeURL(Array.isArray(info.backdrop_path)?info.backdrop_path[0]:info.backdrop_path)||item.backdrop;showMovie(detail);}catch(e){/* Catalogue metadata remains usable if optional detail endpoint is unavailable. */}}
return;
}

if(item.kind==='series'){
var version=++state.request;seriesGridReturn={group:state.group,scroll:$('items').scrollTop,start:state.virtualStart,id:key(item)};seriesRegionMemory={};status(tr('جارٍ تحميل الحلقات…'));
try{var json=await xc(item.provider,'get_series_info',item.id);if(version!==state.request)return;
state.view='catalog';state.kind='series';seriesItem=Object.assign({},item);var info=json.info||{};
seriesItem.description=info.plot||item.description;seriesItem.genre=info.genre||item.genre;seriesItem.rating=info.rating||item.rating;
seriesItem.status=info.status||'';seriesItem.backdrop=A.safeURL(Array.isArray(info.backdrop_path)?info.backdrop_path[0]:info.backdrop_path)||item.backdrop;
seriesSeasons=A.seasons(json);seriesEpisodes=A.episodes(json,item.provider).map(function(e){e.category_id=item.category_id;e.category_ids=item.category_ids;return e;});seriesSeason=seriesSeasons.length?seriesSeasons[0].number:null;seriesSelected=null;
$('heading').textContent=tr('الحلقات');showSeries();status(tr('تم تحميل ')+seriesEpisodes.length+tr(' حلقة'));
}catch(e){status(errorMessage(e));}return;}

play(item);}
var seriesItem=null,seriesEpisodes=[],seriesSeason=null,seriesSelected=null;
function seriesControls(){
var show=state.kind!=='live'&&!state.episodes;
if($('f21-random'))$('f21-random').hidden=!show;
$('series-sort').hidden=!show;$('series-chips').hidden=!show;
var chips=$('series-chips');chips.replaceChildren();
if(!show)return;
var mode=$('series-sort').value;
if(mode==='year')state.filtered.sort(function(a,b){return Number(b.year||0)-Number(a.year||0);});
if(mode==='latest')state.filtered.sort(function(a,b){return b.added-a.added;});
if(mode==='rating')state.filtered.sort(function(a,b){return Number(b.rating||0)-Number(a.rating||0);});
if(mode==='name')state.filtered.sort(function(a,b){return a.name.localeCompare(b.name,'ar');});
['All'].concat(Array.from(new Set(state.items.map(function(i){return i.group;})))).slice(0,20).forEach(function(g){var b=button(g==='All'?tr('الكل'):g,function(){state.group=g;renderItems();});b.classList.toggle('selected',state.group===g);chips.appendChild(b);});
}
$('series-sort').onchange=renderItems;
function progressFor(ep){try{return JSON.parse(storeRead('ap-progress-'+key(ep))||'null');}catch(e){return null;}}
var seriesSeasons=[];
function showSeries(){
var restoreRegion=seriesRegion(document.activeElement),restoreId=document.activeElement.id,restoreSeason=document.activeElement.dataset.seasonNumber;
stopPreview();$('home').hidden=true;$('browser').hidden=true;$('series-detail').hidden=false;
$('series-title').textContent=(document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')?posterTitle(seriesItem.name):seriesItem.name;
$('series-meta').textContent=[metadata(seriesItem),seriesItem.genre,seriesItem.status].filter(Boolean).join(' · ');
$('series-description').textContent=seriesItem.description||'';
['series-poster','series-backdrop'].forEach(function(id){$(id).replaceChildren();});
$('series-poster').appendChild(image(seriesItem.logo,null,seriesItem.name));
$('series-backdrop').appendChild(image(seriesItem.backdrop,null,seriesItem.name));
var tabs=$('season-tabs');tabs.replaceChildren();seriesSeasons.forEach(function(meta){var season=meta.number;var b=button(meta.name||tr('الموسم ')+season,function(){seriesSeason=season;seriesRegionMemory.episodes=null;showSeries();var selected=Array.from(tabs.querySelectorAll('button')).find(function(el){return el.dataset.seasonNumber===season;});if(selected)selected.focus();});b.dataset.seasonNumber=season;b.dataset.seriesFocusId='season-'+season;b.classList.toggle('selected',season===seriesSeason);tabs.appendChild(b);});
var list=$('episode-list');list.replaceChildren();
episodeWindow.items=applyOrder(seriesEpisodes.filter(function(e){return e.season===seriesSeason;}),key,'episodes:'+key(seriesItem)+':'+seriesSeason);paintEpisodes(0);

selectEpisode(seriesEpisodes.find(function(e){return e.season===seriesSeason;})||null);
var resume=seriesEpisodes.find(function(e){var pr=progressFor(e);return pr&&pr.time>10&&pr.duration-pr.time>10;});
$('series-continue').hidden=!resume;$('series-continue').textContent=resume?tr('متابعة S')+resume.season+' E'+resume.episode:'';
$('series-continue').onclick=function(){if(resume)play(resume);};
$('series-start').disabled=!seriesEpisodes.length;$('series-start').onclick=function(){if(seriesEpisodes[0]){storeWrite('ap-progress-'+key(seriesEpisodes[0]),'null');play(seriesEpisodes[0]);}};
$('series-favorite').textContent=saved(favorites,seriesItem)?tr('♥ المفضلة'):tr('♡ المفضلة');
$('series-favorite').onclick=function(){var k=key(seriesItem);favorites=saved(favorites,seriesItem)?favorites.filter(function(x){return x!==k;}):favorites.concat(k);setSaved('ap-favorites',favorites);showSeries();};
var later=safeList('ap-later');$('series-later').textContent=saved(later,seriesItem)?tr('✓ محفوظة للاحق'):tr('◷ لاحقاً');
$('series-later').onclick=function(){var k=key(seriesItem),l=safeList('ap-later');setSaved('ap-later',saved(l,seriesItem)?l.filter(function(x){return x!==k;}):l.concat(k));showSeries();};
$('series-info').onclick=function(){$('series-description').classList.toggle('expanded');};
if(restoreSeason!=null){var seasonButton=Array.from(tabs.querySelectorAll('button')).find(function(el){return el.dataset.seasonNumber===restoreSeason;});if(seasonButton)seasonButton.focus();}
else if(restoreRegion==='episodes')focusSeriesRegion('episodes');else if(restoreId&&restoreRegion&&$(restoreId))$(restoreId).focus();else $('series-back').focus();
}
var episodeWindow={items:[],start:0};
function epLayout(){if(window.APTouch)return {cols:1,size:30,row:112};var L=redLayout();return L?L.episodes:{cols:5,size:30,row:220};}
function paintEpisodes(start){
var list=$('episode-list'),focused=list.contains(document.activeElement)?document.activeElement.dataset.episodeId:null,top=list.scrollTop,EL=epLayout(),cols=EL.cols,size=EL.size,row=EL.row;
start=Math.max(0,Math.floor(Math.min(start,Math.max(0,episodeWindow.items.length-size))/cols)*cols);episodeWindow.start=start;list.replaceChildren();
function pad(height){var d=document.createElement('div');d.className='episode-spacer';d.style.height=height+'px';list.appendChild(d);}
pad(start/cols*row);
episodeWindow.items.slice(start,start+size).forEach(function(e,i){
var b=button('',function(){activateEpisode(e);});b.className='episode-row';b.appendChild(image(e.logo,'episode-art',e.name));
var code=document.createElement('span');code.className='episode-code';code.textContent='S'+String(e.season||1).padStart(2,'0')+'E'+String(e.episode||start+i+1).padStart(2,'0');b.appendChild(code);
var title=document.createElement('strong');title.textContent=e.name;b.appendChild(title);
var meta=document.createElement('small');meta.textContent=e.duration||'';b.appendChild(meta);
var pr=progressFor(e),bar=document.createElement('progress');bar.max=pr&&pr.duration||100;bar.value=pr&&pr.time||0;b.appendChild(bar);
b.onfocus=function(){seriesSelected=e;};b.dataset.episodeIndex=start+i;b.dataset.episodeId=key(e);list.appendChild(b);
});
pad(Math.ceil(Math.max(0,episodeWindow.items.length-start-size)/cols)*row);list.scrollTop=top;if(focused)focusSeriesEpisode(focused);
}
$('episode-list').addEventListener('scroll',function(){if(!window.APTouch&&this.contains(document.activeElement))return;var EL=epLayout(),start=Math.max(0,(Math.floor(this.scrollTop/EL.row)-1)*EL.cols);if(start!==episodeWindow.start)paintEpisodes(start);});
function selectEpisode(e){seriesSelected=e;}
$('series-back').onclick=closeSeriesDetail;
var video=$('video'),playTimeout,episodePresentation=null;
var seriesGridReturn=null,seriesRegionMemory={};
function episodeFocus(){if(!episodePresentation)return;var ep=episodePresentation.id,n=episodeWindow.items.findIndex(function(e){return key(e)===ep;});if(n>=0){paintEpisodes(Math.max(0,n-epLayout().cols));var b=$('episode-list').querySelector('[data-episode-index="'+n+'"]');if(b)b.focus();$('episode-list').scrollTop=episodePresentation.scroll;}}
function fitEpisodeMini(){if(!episodePresentation||episodePresentation.full)return;var anchor=$('episode-mini-slot');if(!anchor){anchor=document.createElement('div');anchor.id='episode-mini-slot';$('season-tabs').parentNode.insertBefore(anchor,$('season-tabs'));}var screen=$('screen'),r=anchor.getBoundingClientRect(),base=document.body.getBoundingClientRect(),scale=base.width/1920;if(window.APTouch)scale=1;if(!scale||r.width<1)return;var player=$('player'),w=r.width/scale,h=Math.min(r.height/scale,w*9/16);[['left',(r.left-base.left)/scale],['top',(r.top-base.top)/scale],['width',w],['height',h]].forEach(function(row){player.style.setProperty(row[0],row[1]+'px','important');});}
window.addEventListener('resize',fitEpisodeMini);$('series-detail').addEventListener('scroll',fitEpisodeMini);
function setEpisodeFullscreen(full){if(!episodePresentation)return;episodePresentation.full=full;document.body.classList.toggle('episode-inline',!full);document.body.classList.toggle('episode-fullscreen',full);if(window.APRed&&window.APRed.episodeMode)window.APRed.episodeMode(full);if(full){['left','top','width','height'].forEach(function(prop){$('player').style.removeProperty(prop);});showControls();$('pause').focus();}else{episodeFocus();fitEpisodeMini();}}
function activateEpisode(e){
 var id=key(e);seriesSelected=e;
 if(episodePresentation&&state.playing&&key(state.playing)===id&&$('player').dataset.playbackKind==='episode'){
  episodePresentation.scroll=$('episode-list').scrollTop;setEpisodeFullscreen(true);return;
 }
 var scroll=$('episode-list').scrollTop;play(e);episodePresentation={id:id,full:false,scroll:scroll,season:seriesSeason};$('player').dataset.playbackKind='episode';setEpisodeFullscreen(!!window.APTouch);
}
function focusSeriesEpisode(id){
 var n=episodeWindow.items.findIndex(function(ep){return key(ep)===id;});
 if(n<0)n=0;var b=$('episode-list').querySelector('[data-episode-index="'+n+'"]');
 if(!b&&episodeWindow.items.length){paintEpisodes(Math.max(0,n-epLayout().cols));b=$('episode-list').querySelector('[data-episode-index="'+n+'"]');}
 if(b){b.focus();b.scrollIntoView({block:'nearest'});}return b;
}
function closeSeriesDetail(){
 ++state.request;stopDetailPlayback();if(episodePresentation)stop(false);if(homeInline.origin){returnHomeInline();return;}
 $('series-detail').hidden=true;if(seriesGridReturn)state.group=seriesGridReturn.group;render();
 if(seriesGridReturn){renderWindow(seriesGridReturn.start||0);$('items').scrollTop=seriesGridReturn.scroll;
 var b=Array.from($('items').querySelectorAll('button')).find(function(el){var item=state.filtered[Number(el.dataset.index)];return item&&key(item)===seriesGridReturn.id;});if(b){b.focus({preventScroll:true});return;}}
 focusFirst();
}
function seriesRegion(el){if(!el)return null;if(el.closest('nav'))return 'sidebar';if($('episode-list').contains(el))return 'episodes';if($('player').contains(el))return 'controls';if($('series-copy').contains(el))return 'info';if($('series-detail').contains(el))return 'poster';return null;}
function seriesRegionButtons(region){
 var list=region==='sidebar'?Array.from(document.querySelectorAll('nav button')):region==='episodes'?Array.from($('episode-list').querySelectorAll('button')):region==='poster'?[$('series-back'),$('series-poster')].concat(Array.from($('season-tabs').querySelectorAll('button'))):region==='info'?Array.from($('series-copy').querySelectorAll('button')):Array.from($('player').querySelectorAll('button,input'));
 return list.filter(function(el){return !el.disabled&&el.getBoundingClientRect().height&&getComputedStyle(el).visibility!=='hidden';});
}
function focusSeriesRegion(region){if(region==='controls'&&(!episodePresentation||episodePresentation.full)){return;}if(region==='controls')showControls();if(region==='episodes'){focusSeriesEpisode(seriesRegionMemory.episodes||seriesSelected&&key(seriesSelected));return;}var list=seriesRegionButtons(region),saved=seriesRegionMemory[region],b=list.find(function(el){return (el.id||el.dataset.seriesFocusId)===saved;})||list[0];if(b)b.focus();}
$('series-poster').tabIndex=0;
document.addEventListener('focusin',function(e){if($('series-detail').hidden)return;var r=seriesRegion(e.target);if(!r)return;if(r==='episodes')seriesRegionMemory[r]=e.target.dataset.episodeId;else{if(!e.target.id&&!e.target.dataset.seriesFocusId)e.target.dataset.seriesFocusId=r+'-'+seriesRegionButtons(r).indexOf(e.target);seriesRegionMemory[r]=e.target.id||e.target.dataset.seriesFocusId;}},true);
// Capture before any player/Red geometric navigation. Each transition is declared.
document.addEventListener('keydown',function(e){
 if(!$('quick-channels').hidden)return;
 if($('series-detail').hidden||organize||hold||episodePresentation&&episodePresentation.full||!$('connection').hidden)return;
 var n=e.keyCode||({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27})[e.key],a=document.activeElement,r=seriesRegion(a);if(!r)return;
 if(n===461||n===27){e.preventDefault();e.stopImmediatePropagation();closeSeriesDetail();return;}
 if(n===13&&r==='controls'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(a.tagName==='BUTTON')a.click();else if(a===$('progress'))$('pause').click();}return;}
 if([37,38,39,40].indexOf(n)<0)return;e.preventDefault();e.stopImmediatePropagation();
 if(r==='episodes'){
 var ix=Number(a.dataset.episodeIndex),cols=epLayout().cols;
 if(n===37&&ix%cols===0){focusSeriesRegion('poster');return;}
 if(n===39&&(cols===1||ix%cols===cols-1||ix===episodeWindow.items.length-1)){focusSeriesRegion('controls');return;}
 var next=ix+(n===38?-cols:n===40?cols:n===39?1:-1);if(next<0){focusSeriesRegion('poster');return;}if(next<episodeWindow.items.length)focusSeriesEpisode(key(episodeWindow.items[next]));return;
 }
 if(r==='sidebar'&&n===39){focusSeriesRegion('poster');return;}
 if(r==='poster'&&n===37){focusSeriesRegion('sidebar');return;}
 if(r==='poster'&&n===39){focusSeriesRegion('episodes');return;}
 if(r==='controls'&&n===37&&seriesRegionButtons('controls').indexOf(a)===0){focusSeriesRegion('episodes');return;}
 if(r==='controls'&&n===40){focusSeriesRegion('info');return;}
 if(r==='info'&&n===38){focusSeriesRegion('controls');return;}
 if(r==='info'&&n===37){focusSeriesRegion('episodes');return;}
 var bs=seriesRegionButtons(r),at=bs.indexOf(a),step=n===38||n===37?-1:1;if(bs[at+step])bs[at+step].focus();
},true);
new MutationObserver(function(){if(episodePresentation&&!episodePresentation.full&&($('series-detail').hidden||!$('connection').hidden||!$('movie-detail').hidden))stopDetailPlayback();}).observe($('screen'),{attributes:true,subtree:true,attributeFilter:['hidden']});
window.APEpisodePresentation={fullscreen:function(full){setEpisodeFullscreen(full);}};
document.addEventListener('keydown',function(e){
 if(organize||hold||!episodePresentation||$('player').hidden)return;
 var back=e.keyCode===461||e.keyCode===27||e.key==='Escape'||e.key==='BrowserBack';
 if(back&&episodePresentation.full&&$('quick-channels').hidden){e.preventDefault();e.stopImmediatePropagation();setEpisodeFullscreen(false);}
},true);

function play(item){if(!video.parentNode)$('player').insertBefore(video,$('player').firstChild);
if(fLocked(item)){fAuthorize(item,function(){play(item);});return;}
if(item.kind==='live'&&f21.last&&key(f21.last.item)!==key(item))f21.previous=f21.last;
if(item.kind==='live')f21.last={item:item,providerId:String(state.provider&&state.provider.id)};
f21.retries=0;video.playbackRate=1;
if(!itemAllowed(item,state.provider))return;stopPreview();var id=key(item);recent=recent.filter(function(k){return k!==id;});recent.unshift(id);setSaved('ap-recent',recent);var url=A.safeURL(item.url);if(!url){status(tr('رابط البث غير مدعوم'));return;}stop(false);state.playing=item;liveStarted=Date.now();if(item.kind==='live')setTimeout(loadLiveWeather,0);$('player').dataset.playbackKind=item.kind==='live'?'live':'vod';
$('player').hidden=false;$('quick-channels').hidden=true;quickList();$('playing-name').textContent=item.name;updateContextList();$('play-state').textContent=tr('جارٍ فتح البث…');var source=document.createElement('source');source.src=url;
if(/\.m3u8(?:$|\?)/i.test(url))source.type='application/vnd.apple.mpegurl';else if(/\.ts(?:$|\?)/i.test(url))source.type='video/mp2t';
video.appendChild(source);video.load();video.play().catch(function(){$('play-state').textContent=tr('اضغط تشغيل للمحاولة مجدداً أو جرّب قناة أخرى.');});showControls();fSkipState();$('stop').focus();
playTimeout=setTimeout(function(){if(video.readyState<3)$('play-state').textContent=tr('البث ما زال قيد التحميل. تحقّق من المزوّد أو جرّب قناة أخرى.');},20000);
$('seek-back').hidden=$('seek-forward').hidden=item.kind==='live';updateProgress();}
function stop(focus){fSaveProgress();fCancelRetry();if(fNextBox)fCancelNext();if(fSkip)fSkip.hidden=true;episodePresentation=null;['left','top','width','height'].forEach(function(prop){$('player').style.removeProperty(prop);});document.body.classList.remove('episode-inline','episode-fullscreen');if(livePanel){livePanel.remove();livePanel=null;}var lb=$('live-now');if(lb)lb.dataset.channel='';hideLiveBar();clearSeekFeedback();clearTimeout(zapTimer);$('zap-banner').hidden=true;clearTimeout(playTimeout);clearTimeout(hideTimer);video.pause();video.removeAttribute('src');video.replaceChildren();video.load();state.playing=null;$('player').removeAttribute('data-playback-kind');$('player').hidden=true;if(focus!==false)focusFirst();}
var zapTimer,liveClockTimer,liveStarted=0,livePanel=null,liveWeather=null,liveWeatherRequested=false;
function hideLiveBar(){clearTimeout(zapTimer);clearInterval(liveClockTimer);var b=$('live-now');if(b)b.hidden=true;}
function liveTimer(){armControlsHide();}
function weatherValue(){try{var w=JSON.parse(storeRead('ap-live-weather')||'null');return w&&Date.now()-w.at<1800000&&isFinite(w.temp)?w:null;}catch(e){return null;}}
function loadLiveWeather(){
if(liveWeatherRequested)return;liveWeatherRequested=true;
liveWeather=weatherValue();if(liveWeather)return;
var x=new XMLHttpRequest();x.open('GET','https://api.open-meteo.com/v1/forecast?latitude=51.4287788&longitude=6.8778347&current=temperature_2m,weather_code&timezone=Europe%2FBerlin');x.timeout=3500;
x.onload=function(){try{if(x.status!==200)return;var c=JSON.parse(x.responseText).current;if(!c||typeof c.temperature_2m!=='number'||typeof c.weather_code!=='number')return;liveWeather={at:Date.now(),temp:c.temperature_2m,code:c.weather_code};storeWrite('ap-live-weather',JSON.stringify(liveWeather));paintLiveTick();}catch(e){}};x.onerror=x.ontimeout=function(){};x.send();
}
function liveIcon(name){var paths={
prev:'<path d="M6 5v14M19 5 8 12l11 7z"/>',next:'<path d="M18 5v14M5 5l11 7-11 7z"/>',
pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 5 11 7-11 7z"/>',
down:'<path d="m5 9 7 7 7-7"/>',
sub:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 12h4m4 0h4M6 15h12"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
audio:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
aspect:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M7 8H5v3m12 5h2v-3"/>',
star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3 3-1 3 1 1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3-3 1z"/><circle cx="12" cy="12" r="3"/>',
cloud:'<path d="M6 18a4 4 0 0 1-1-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
rain:'<path d="M6 15a4 4 0 0 1-1-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10M8 19l-1 3m6-3-1 3m6-3-1 3"/>'};
return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.settings)+'</svg>';}
function liveButton(id,label,icon,fn){var b=button('',fn);b.id=id;b.setAttribute('aria-label',label);b.title=label;b.innerHTML=liveIcon(icon);return b;}
function paintLiveTick(){
var clock=$('live-clock');if(clock)clock.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
var elapsed=$('live-elapsed');if(elapsed){var n=Math.floor((Date.now()-liveStarted)/1000);elapsed.textContent=[Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(function(v){return String(v).padStart(2,'0');}).join(':');elapsed.hidden=n<1;}
var weather=$('live-weather'),w=liveWeather&&Date.now()-liveWeather.at<1800000?liveWeather:null;if(weather){weather.hidden=!w;if(w){weather.innerHTML=liveIcon(w.code===0?'sun':w.code>=51?'rain':'cloud');weather.appendChild(document.createTextNode(Math.round(w.temp)+'°'));weather.title='Mülheim · Open-Meteo';}}
var pause=$('live-pause');if(pause){pause.innerHTML=liveIcon(video.paused?'play':'pause');pause.setAttribute('aria-label',video.paused?tr('تشغيل'):tr('إيقاف مؤقت'));}
}
function closeLivePanel(){if(!livePanel)return;var id=livePanel.dataset.returnFocus;livePanel.remove();livePanel=null;showLiveBar();var b=$(id);if(b)b.focus();}
function openLivePanel(type){
if(livePanel)closeLivePanel();clearTimeout(zapTimer);
var panel=document.createElement('div');panel.id='live-panel';panel.dataset.returnFocus=type==='quality'?'live-quality':type==='sub'?'live-sub':type==='audio'?'live-audio':'live-settings';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',type==='sub'?tr('الترجمة'):type==='audio'?tr('الصوت'):type==='quality'?tr('الجودة'):tr('إعدادات المشغل'));livePanel=panel;
var heading=document.createElement('h2');heading.textContent=type==='sub'?tr('الترجمة'):type==='audio'?tr('الصوت'):type==='quality'?tr('الجودة'):tr('إعدادات المشغل');panel.appendChild(heading);
function choice(label,fn){var b=button(label,fn);panel.appendChild(b);return b;}
choice(tr('رجوع'),closeLivePanel);
if(type==='sub'){var tracks=video.textTracks||[];choice('OFF',function(){for(var i=0;i<tracks.length;i++)tracks[i].mode='disabled';fRememberTracks();});
for(var i=0;i<tracks.length;i++)(function(t){choice(t.label||t.language||tr('Track ')+(i+1),function(){for(var j=0;j<tracks.length;j++)tracks[j].mode='disabled';t.mode='showing';fRememberTracks();});})(tracks[i]);
if(!tracks.length){var p=document.createElement('p');p.textContent=tr('لا توجد ترجمات متاحة');panel.appendChild(p);}
}else if(type==='quality'){
var vt=video.videoTracks||[],qualityCount=0;
for(var vi=0;vi<vt.length;vi++)(function(t,n){var height=Number(t.height)||0,label=t.label|| (height?height+'p':t.language||tr('مسار فيديو ')+(n+1));choice(label,function(){try{t.selected=true;}catch(e){}});qualityCount++;})(vt[vi],vi);
if(!qualityCount){var qh=Number(video.videoHeight)||0;choice(tr('تلقائي')+(qh?' / '+qh+'p':''),function(){});if(!qh){var note=document.createElement('p');note.textContent=tr('لم يعلن المشغّل دقة الفيديو بعد');panel.appendChild(note);}}
}else if(type==='audio'){var ats=video.audioTracks||[];for(var ai=0;ai<ats.length;ai++)(function(t,n){choice(t.label||t.language||tr('الصوت ')+(n+1),function(){for(var j=0;j<ats.length;j++)ats[j].enabled=ats[j]===t;fRememberTracks();});})(ats[ai],ai);if(!ats.length){var empty=document.createElement('p');empty.textContent=tr('لم يتم اكتشاف مسارات صوتية');panel.appendChild(empty);}}else{[['contain',tr('الحجم الأصلي')],['cover',tr('تكبير')],['fill',tr('ملء الشاشة')]].forEach(function(row){choice(row[1],function(){video.style.objectFit=row[0];});});}
$('player').appendChild(panel);panel.querySelector('button').focus();
}
function showLiveBar(){
if(!state.playing||state.playing.kind!=='live'||!$('quick-channels').hidden)return;
var item=state.playing,b=$('live-now');
if(!b){b=document.createElement('div');b.id='live-now';$('player').appendChild(b);}
var same=b.dataset.channel===key(item),focusId=b.contains(document.activeElement)?document.activeElement.id:'';
if(!same){
b.dataset.channel=key(item);b.replaceChildren();
var logo=channelLogo(item);logo.classList.add('live-brand');b.appendChild(logo);
var status=document.createElement('div');status.className='live-status';status.innerHTML='<time id="live-clock"></time><span id="live-weather" hidden></span>';b.appendChild(status);
var text=document.createElement('div');text.className='live-channel-text';
var badge=document.createElement('span');badge.className='live-badge';badge.textContent=tr('Live');text.appendChild(badge);
var name=document.createElement('strong');name.textContent=(item.name||'').replace(/^\s*\d+\s*[-|·:]\s*/,'');text.appendChild(name);
var channel=document.createElement('span');channel.className='live-channel-name';var normT=function(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();},titleText=(item.name||'').replace(/^\s*\d+\s*[-|·:]\s*/,''),subText=normT(item.group)&&!item.groupMissing&&normT(item.group)!==normT(titleText)&&normT(item.group)!==normT(item.name)?String(item.group).replace(/\s+/g,' ').trim():'';channel.textContent=subText;channel.hidden=!subText;if(subText)text.appendChild(channel);
var elapsed=document.createElement('time');elapsed.id='live-elapsed';elapsed.hidden=true;text.appendChild(elapsed);b.appendChild(text);
var controls=document.createElement('div');controls.className='live-transport';
controls.appendChild(liveButton('live-prev',tr('القناة السابقة'),'prev',function(){zapChannel(-1);}));
controls.appendChild(liveButton('live-pause',tr('إيقاف مؤقت'),'pause',toggle));
controls.appendChild(liveButton('live-next',tr('القناة التالية'),'next',function(){zapChannel(1);}));
controls.appendChild(liveButton('live-list',tr('قائمة القنوات'),'down',openChannelList));b.appendChild(controls);
var actions=document.createElement('div');actions.className='live-actions';
actions.appendChild(liveButton('live-sub',tr('الترجمة'),'sub',function(){openLivePanel('sub');}));
var star=liveButton('live-favorite',tr('المفضلة'),'star',function(){var k=key(state.playing);favorites=saved(favorites,state.playing)?favorites.filter(function(v){return v!==k;}):favorites.concat(k);setSaved('ap-favorites',favorites);star.classList.toggle('saved',saved(favorites,state.playing));star.setAttribute('aria-pressed',saved(favorites,state.playing)?'true':'false');});
star.classList.toggle('saved',saved(favorites,item));star.setAttribute('aria-pressed',saved(favorites,item)?'true':'false');actions.appendChild(star);
actions.appendChild(liveButton('live-settings',tr('إعدادات المشغل'),'settings',function(){openLivePanel('settings');}));b.appendChild(actions);
if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')){
controls.replaceChildren();actions.replaceChildren();
function ayaButton(id,label,icon,fn){var btn=liveButton(id,label,icon,fn);var tx=document.createElement('span');tx.className='aya-live-label';tx.textContent=label;btn.appendChild(tx);controls.appendChild(btn);return btn;}
ayaButton('live-list',tr('القنوات'),'list',openChannelList);
star.id='live-favorite';star.innerHTML=liveIcon('heart');var fl=document.createElement('span');fl.className='aya-live-label';fl.textContent=tr('المفضلة');star.appendChild(fl);controls.appendChild(star);
ayaButton('live-quality',tr('الجودة'),'settings',function(){openLivePanel('quality');});

}
}
b.hidden=false;paintLiveTick();clearInterval(liveClockTimer);liveClockTimer=setInterval(paintLiveTick,1000);liveTimer();
if(focusId&&$(focusId))$(focusId).focus();
// Only a first playback schedules the request, never a focus/remote-key interaction.
}
document.addEventListener('keydown',function(e){
if($('player').hidden||!state.playing||state.playing.kind!=='live')return;
var k=({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter'})[e.keyCode]||e.key;
if(livePanel){e.preventDefault();e.stopImmediatePropagation();if(k==='Escape'||k==='BrowserBack'||e.keyCode===461){closeLivePanel();return;}var buttons=Array.from(livePanel.querySelectorAll('button')),ix=buttons.indexOf(document.activeElement);if(k==='ArrowDown'||k==='ArrowUp'){var next=buttons[Math.max(0,Math.min(buttons.length-1,ix+(k==='ArrowDown'?1:-1)))];if(next)next.focus();}else if(k==='Enter'&&!e.repeat)document.activeElement.click();return;}
var b=$('live-now');if(!b||b.hidden||!$('quick-channels').hidden)return;
if(b.contains(document.activeElement)){
if(k==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)document.activeElement.click();liveTimer();return;}
if(/^Arrow/.test(k)){e.preventDefault();e.stopImmediatePropagation();var ids=['live-prev','live-pause','live-next','live-sub','live-favorite','live-settings'];var ix=ids.indexOf(document.activeElement.id);if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')){ids=['live-list','live-favorite','live-quality'];ix=ids.indexOf(document.activeElement.id);if(k==='ArrowRight'||k==='ArrowLeft')$(ids[Math.max(0,Math.min(ids.length-1,ix+(k==='ArrowRight'?1:-1)))]).focus();}else if(k==='ArrowDown')$('live-list').focus();else if(k==='ArrowUp')$('live-pause').focus();else $(ids[Math.max(0,Math.min(ids.length-1,(ix<0?1:ix)+(k==='ArrowRight'?1:-1)))]).focus();liveTimer();return;}
}
},true);

function hideControls(){clearTimeout(hideTimer);$('player-ui').classList.add('dim');}
function zapChannel(delta){
var list=state.filtered.filter(function(i){return i.kind==='live';});
if(!list.length||!state.playing)return;
var index=list.findIndex(function(i){return key(i)===key(state.playing);});
var next=list[(Math.max(0,index)+delta+list.length)%list.length];
play(next);hideControls();
showLiveBar();
}
document.addEventListener('ap-vod-controls',function(){showControls();});
function controlsMenuOpen(){return !!livePanel||!$('quick-channels').hidden||($('f21-modal')&&!$('f21-modal').hidden)||($('f21-next')&&!$('f21-next').hidden);}
function armControlsHide(){clearTimeout(hideTimer);clearTimeout(zapTimer);hideTimer=setTimeout(function(){if(!state.playing)return;if(video.paused||controlsMenuOpen()){armControlsHide();return;}$('player-ui').classList.add('dim');hideLiveBar();if(fSkip)fSkip.hidden=true;},4000);}
function showControls(){if(state.playing&&state.playing.kind==='live'){showLiveBar();return;}clearSeekFeedback();$('player-ui').classList.remove('dim');armControlsHide();}
var controlsPointer=null;
document.addEventListener('keydown',function(){if(state.playing&&!$('player').hidden)showControls();},true);
function controlsPointerMove(e){if(!state.playing||$('player').hidden)return;var point=String(e.clientX)+','+String(e.clientY);if(point===controlsPointer)return;controlsPointer=point;showControls();}
document.addEventListener('pointermove',controlsPointerMove,true);
document.addEventListener('mousemove',controlsPointerMove,true);
document.addEventListener('pointerdown',function(){if(state.playing)showControls();},true);
video.addEventListener('pause',function(){if(state.playing)showControls();});
video.addEventListener('playing',function(){clearTimeout(playTimeout);clearTimeout(hideTimer);hideTimer=null;$('play-state').textContent=tr('قيد التشغيل');if($('zap-banner').hidden&&!quietSeekActive&&!hideTimer)showControls();});
video.addEventListener('waiting',function(){$('play-state').textContent=tr('جارٍ التخزين المؤقت…');if($('zap-banner').hidden&&!quietSeekActive&&!hideTimer)showControls();});
video.addEventListener('error',function(){if(!state.playing)return;$('play-state').textContent=tr('تعذّر تشغيل البث. قد تكون صيغة الفيديو غير مدعومة أو المزوّد غير متاح.');showControls();});
video.addEventListener('ended',function(){$('play-state').textContent=tr('انتهى التشغيل');if(!quietSeekActive)showControls();});
function toggle(){if(video.paused)video.play().catch(function(){$('play-state').textContent=tr('تعذّر بدء التشغيل');});else video.pause();showControls();}
var seekFeedbackTimer=0,quietSeekActive=false;
function clearSeekFeedback(){clearTimeout(seekFeedbackTimer);seekFeedbackTimer=0;quietSeekActive=false;var el=$('seek-feedback');if(el)el.hidden=true;}
function updateSeekFeedback(){if(!quietSeekActive)return;var d=playerDuration(),t=Math.max(0,Math.min(d,Number(video.currentTime)||0));$('seek-feedback-fill').style.width=(d?t/d*100:0)+'%';$('seek-feedback-time').textContent=timestamp(t)+' / '+timestamp(d);}
function seek(delta,quiet){var d=playerDuration();if(!state.playing||state.playing.kind==='live'||!d)return;
if(quiet){quietSeekActive=true;clearTimeout(hideTimer);$('player-ui').classList.add('dim');}
video.currentTime=Math.max(0,Math.min(d,(isFinite(video.currentTime)?video.currentTime:0)+delta));updateProgress();
if(quiet){$('seek-feedback-direction').textContent=delta>0?tr('+10 ثانية'):tr('−10 ثواني');$('seek-feedback').hidden=false;updateSeekFeedback();clearTimeout(seekFeedbackTimer);seekFeedbackTimer=setTimeout(clearSeekFeedback,1500);}else showControls();}
['timeupdate','seeking','seeked'].forEach(function(n){video.addEventListener(n,updateSeekFeedback);});
// Capture before theme navigation. Seeking never moves focus or opens full controls.
document.addEventListener('keydown',function(e){
var k=({37:'ArrowLeft',39:'ArrowRight'})[e.keyCode]||e.key;
if(k!=='ArrowLeft'&&k!=='ArrowRight'||$('player').hidden||!state.playing||state.playing.kind==='live'||!$('quick-channels').hidden)return;
var picker=$('red-sublist');if(picker&&!picker.hidden)return;
var hidden=$('player-ui').classList.contains('dim');
if(!hidden&&document.activeElement!==$('progress'))return;
e.preventDefault();e.stopImmediatePropagation();seek(k==='ArrowRight'?10:-10,hidden);
},true);
window.apTouchBack=function(){back();};
function back(){if(!$('quick-channels').hidden){$('quick-channels').hidden=true;if(episodePresentation&&!episodePresentation.full)episodeFocus();else if((document.body.dataset.theme==='aya'||document.body.dataset.theme==='alaa'||document.body.dataset.theme==='harak'||document.body.dataset.theme==='muse'||document.body.dataset.theme==='velour')&&state.playing&&state.playing.kind==='live'){showLiveBar();$('live-list').focus();}else{showControls();$('quick-toggle').focus();}return;}if(!$('series-detail').hidden&&(!episodePresentation||!episodePresentation.full)&&$('connection').hidden){closeSeriesDetail();return;}if(episodePresentation&&episodePresentation.full){setEpisodeFullscreen(false);return;}if($('player').hidden&&$('connection').hidden&&homeInline.tile){if(homeInline.origin&&!$('series-detail').hidden){++state.request;returnHomeInline();return;}if(state.view==='home'&&$('movie-detail').hidden&&$('series-detail').hidden){homeTileFocus();return;}}if(!$('movie-detail').hidden&&$('player').hidden&&$('connection').hidden){++state.request;$('movie-back').click();return;}if($('home-details').open){$('home-details').close();$('home-info').focus();return;}if(!$('quick-channels').hidden){$('quick-channels').hidden=true;hideControls();$('stop').focus();return;}if(!$('player').hidden){stop();return;}if(!$('manual').hidden){$('manual').hidden=true;$('manual-toggle').focus();return;}if(!$('connection').hidden){connection(false);return;}if(!$('series-detail').hidden){$('series-detail').hidden=true;render();focusFirst();return;}if(state.episodes){state.items=state.episodes;state.episodes=null;state.group='All';state.page=0;$('search').value='';render();focusFirst();return;}if(state.view!=='home'){state.view='home';state.filter='all';render();$('nav-home').focus();return;}if(window.webOS&&webOS.platformBack)webOS.platformBack();else if(window.PalmSystem&&PalmSystem.stageReady)window.close();else connection(true);}
$('providers').onchange=function(){selectProvider(this.value);};
document.querySelectorAll('[data-kind]').forEach(function(b){b.onclick=function(){navigate(b.dataset.kind);};});
var searchTimer;
$('search').oninput=function(){clearTimeout(searchTimer);searchTimer=setTimeout(function(){if(state.view==='home'){state.view='catalog';state.kind='live';state.items=homeCatalog.live;render();this.focus();}state.page=0;renderItems();},180);};
$('settings-open').onclick=function(){connection(true);};
$('connection-close').onclick=function(){connection(false);};
$('sync').onclick=sync;
var manualTask=null,manualProvider=null;
var MANUAL_TIMEOUT=20000;
$('refresh-list').onclick=function(){
var p=state.provider,b=$('refresh-list');if(manualTask&&manualProvider===p)return manualTask;
if(!p||p.type!=='xtream'){status(tr('لا توجد قائمة للتحديث'));return;}
b.disabled=true;b.textContent=tr('جارٍ التحديث…');status(tr('جارٍ تحديث القائمة… القائمة المحفوظة تبقى شغالة'));
var mine;
// Explicit job set: the three category lists + the visible category (max 4). The other queued sweep jobs are NOT awaited.
var spec=[['get_live_categories',null],['get_vod_categories',null],['get_series_categories',null]];
var k=state.kind;
if(k&&state.view!=='home'&&state.group&&state.group!=='All'&&state.group!=='@favorites'){var cl=k==='live'?liveCategories:vodCategories[k];var c=(cl||[]).find(function(x){return x.category_name===state.group;});if(c)spec.push([k==='live'?'get_live_streams':k==='movies'?'get_vod_streams':'get_series',c.category_id]);}

mine=(async function(){
var jobs=spec.map(function(j){return xc(p,j[0],j[1],true,true);});
var timer,timeout=new Promise(function(r){timer=setTimeout(function(){r('timeout');},MANUAL_TIMEOUT);});
var res=await Promise.race([Promise.allSettled(jobs),timeout]);clearTimeout(timer);
if(state.provider!==p)return {stale:true};
if(res==='timeout')return {timeout:true,paused:document.hidden||!$('player').hidden};
var ok=res.filter(function(x){return x.status==='fulfilled';}).length,fail=res.length-ok;
if(ok){clearTimeout(freshTimer);await applyFresh(p,true);}
return {ok:ok,fail:fail};
})().then(function(r){if(state.provider!==p||r.stale)return;
if(r.timeout)status(r.paused?tr('التحديث متوقف مؤقتاً · لم يكتمل · القائمة المحفوظة تعمل'):tr('لم يكتمل التحديث بعد · يكمل بالخلفية'));
else if(!r.ok)status(tr('تعذّر التحديث · القائمة المحفوظة تعمل بدون إنترنت'));
else if(r.fail)status(tr('تم تحديث جزء من القائمة · بعض الأقسام تعذّر تحديثها'));
else{status(tr('تم تحديث الأقسام والقسم الحالي · باقي الأقسام تتحدّث بالخلفية'));prefetchCatalog(p);}
},function(){if(state.provider===p)status(tr('تعذّر التحديث · القائمة المحفوظة تعمل بدون إنترنت'));}).then(function(){if(manualTask===mine){manualTask=null;}b.disabled=false;b.textContent=tr('تحديث القائمة');});
manualTask=mine;manualProvider=p;
return mine;
};
$('manual-toggle').onclick=function(){$('manual').hidden=!$('manual').hidden;if(!$('manual').hidden)$('manual-type').focus();};
$('manual-type').onchange=function(){$('credentials').hidden=this.value!=='xtream';};
$('manual').onsubmit=async function(e){e.preventDefault();var type=$('manual-type').value,url=A.safeURL($('manual-url').value.trim());if(!url){$('activation').textContent=tr('أدخل رابط HTTP أو HTTPS صالحاً');return;}if(type==='xtream'&&(!$('manual-user').value||!$('manual-pass').value)){$('activation').textContent=tr('أدخل اسم المستخدم وكلمة المرور');return;}
var p={id:'manual',manual:true,type:type,name:tr('قائمة مباشرة'),url:url,server:url,username:$('manual-user').value,password:$('manual-pass').value};state.providers=state.providers.filter(function(p){return !p.manual;}).concat([p]);state.kind='live';providers();await selectProvider('manual');$('providers').value='manual';$('manual-pass').value='';connection(false);};
$('nav-home').onclick=function(){dismissPanels();stopPreview();state.view='home';state.filter='all';render();document.querySelectorAll('nav button').forEach(function(b){b.classList.remove('selected');});this.classList.add('selected');$('home-play').focus();};
$('nav-favorites').onclick=function(){navigate(state.kind,'favorites');};
$('nav-recent').onclick=function(){navigate(state.kind,'recent');};
$('nav-search').onclick=function(){dismissPanels();if(state.view==='home')navigate('live');document.querySelectorAll('nav button').forEach(function(b){b.classList.remove('selected');});$('nav-search').classList.add('selected');$('search').focus();};
$('filter-all').onclick=function(){state.filter='all';state.page=0;renderItems();};
$('filter-hd').onclick=function(){state.filter='hd';state.page=0;renderItems();};
$('filter-4k').onclick=function(){state.filter='4k';state.page=0;renderItems();};
$('filter-favorites').onclick=function(){state.filter='favorites';renderItems();};
$('filter-recent').onclick=function(){state.filter='recent';renderItems();};
document.querySelectorAll('[data-home-kind]').forEach(function(b){b.onclick=function(){navigate(b.dataset.homeKind);};});
// Persistent palettes; Aya shares Red geometry without altering existing defaults.
function theme(value,persist){
if(['apple','navy','red','blue','aya','alaa','harak','muse','velour'].indexOf(value)<0)value='apple';
document.body.dataset.theme=value;
document.body.classList.toggle('apple',value==='apple');
document.body.classList.toggle('blue',value==='blue');
['apple','navy','red','blue','aya','alaa','harak','muse','velour'].forEach(function(t){var b=$('theme-'+t);b.classList.toggle('selected',value===t);b.setAttribute('aria-pressed',value===t?'true':'false');});
if(persist!==false)storeWrite('ap-theme',value);
if(typeof episodeWindow!=='undefined'&&episodeWindow.items.length&&!$('series-detail').hidden)paintEpisodes(episodeWindow.start);
}
['apple','navy','red','blue','aya','alaa','harak','muse','velour'].forEach(function(t){$('theme-'+t).onclick=function(){theme(t);};});
theme(storeRead('ap-theme')||'apple',false);
function channelSize(value,persist){
if(['small','medium','large'].indexOf(value)<0)value='small';
document.body.dataset.channelSize=value;
['small','medium','large'].forEach(function(v){var b=$('channel-size-'+v);b.classList.toggle('selected',v===value);b.setAttribute('aria-pressed',v===value?'true':'false');});
if(persist!==false)storeWrite('ap-channel-icon-size',value);
if(state.kind==='live'&&state.filtered.length){$('items').scrollTop=0;renderWindow(0);}
}
['small','medium','large'].forEach(function(v){$('channel-size-'+v).onclick=function(){channelSize(v);};});
channelSize(storeRead('ap-channel-icon-size')||'small',false);

var quickItems=[],quickIndex=0;
function quickChannelLabel(item){
var normalized=String(item.name||'').normalize('NFKC'),parts=[];
var tags=/\b(?:UHD|FHD|HD|SD|4K|8K|[0-9]{3,4}p)\b|\((?:EVENT|BACKUP|HEVC|H265|H264)\)/gi;
var name=normalized.replace(tags,function(t){parts.push(t);return ' ';}).replace(/\s+/g,' ').replace(/^[\s|·-]+|[\s|·-]+$/g,'').trim();
return {name:name||normalized,quality:parts.join(' ')||item.quality||''};
}
function renderQuick(index){
var list=$('quick-list');quickIndex=Math.max(0,Math.min(quickItems.length-1,index));list.replaceChildren();
var start=Math.max(0,Math.min(quickItems.length-19,quickIndex-5));
function space(n){var el=document.createElement('div');el.className='virtual-space';el.style.height=(n*74)+'px';list.appendChild(el);}
space(start);
quickItems.slice(start,start+19).forEach(function(i,n){
var b=button('',function(){if(i.kind==='episodes'){activateEpisode(i);$('quick-channels').hidden=true;}else{play(i);hideControls();}});b.dataset.quickIndex=start+n;b.dataset.channelKey=key(i);markOrder(b,key(i),i.kind==='episodes'?'episodes:'+key(seriesItem)+':'+seriesSeason:'quick:'+i.kind,i);
var number=document.createElement('span');number.className='quick-number';number.textContent=start+n+1;b.appendChild(number);
if(i.kind==='live')b.appendChild(channelLogo(i));var parsed=i.kind==='live'?quickChannelLabel(i):{name:posterTitle(i.name),quality:''};var label=document.createElement('strong');label.className='quick-name';label.textContent=(start+n+1)+' - '+parsed.name;b.appendChild(label);
var quality=document.createElement('span');quality.className='quick-quality';quality.textContent=parsed.quality;b.appendChild(quality);
b.classList.toggle('selected',state.playing&&key(i)===key(state.playing));list.appendChild(b);
});
space(Math.max(0,quickItems.length-start-19));
}
function focusQuick(index){
if(!quickItems.length)return;
index=(index+quickItems.length)%quickItems.length;quickIndex=index;if(!$('quick-list').querySelector('[data-quick-index="'+index+'"]'))renderQuick(index);
var el=$('quick-list').querySelector('[data-quick-index="'+index+'"]');if(el){el.focus();el.scrollIntoView({block:'nearest'});}
}
function quickList(){
quickItems=state.playing&&state.playing.kind==='episodes'?applyOrder(seriesEpisodes.filter(function(ep){return ep.season===seriesSeason;}),key,'episodes:'+key(seriesItem)+':'+seriesSeason):state.playing&&state.playing.kind==='movies'?movieRelated.filter(function(i){return key(i)!==key(state.playing);}):state.filtered.filter(function(i){return i.kind==='live';});
quickIndex=Math.max(0,quickItems.findIndex(function(i){return state.playing&&key(i)===key(state.playing);}));
renderQuick(quickIndex);
}
function openChannelList(){
if(!state.playing)return;
quickList();if(!quickItems.length)return;hideLiveBar();hideControls();$('quick-channels').hidden=false;
focusQuick(quickIndex);
}
function updateContextList(){var kind=state.playing&&state.playing.kind,related=kind==='movies'&&movieRelated.some(function(i){return key(i)!==key(state.playing);});$('quick-toggle').hidden=kind!=='live'&&kind!=='episodes'&&!related;$('quick-toggle').textContent=kind==='episodes'?tr('الحلقات'):kind==='movies'?tr('أفلام مشابهة'):tr('قائمة القنوات');$('quick-channels').querySelector('h2').textContent=kind==='episodes'?tr('الحلقات'):kind==='movies'?tr('أفلام مشابهة'):tr('القنوات');}
$('quick-toggle').onclick=openChannelList;
function timestamp(s){if(!isFinite(s))return '--:--';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
video.addEventListener('loadedmetadata',function(){if(state.playing&&(state.playing.kind==='episodes'||state.playing.kind==='movies')){var p=progressFor(state.playing);if(p&&p.time<video.duration-10)video.currentTime=p.time;}});
var lastProgressSave=0;
function playerDuration(){var d=video.duration;return isFinite(d)&&d>0?d:0;}
function updateProgress(){var bar=$('progress'),vod=!!state.playing&&state.playing.kind!=='live',d=vod?playerDuration():0,label;
if(!state.playing){bar.disabled=true;bar.value=0;bar.style.setProperty('--p','0');return;}
if(!vod){label=tr('بث مباشر');bar.disabled=true;bar.value=0;bar.style.setProperty('--p','0');}
else if(!d){label='--:-- / --:--';bar.disabled=true;bar.value=0;bar.style.setProperty('--p','0');}
else{var t=Number(video.currentTime);if(!isFinite(t))t=0;t=Math.max(0,Math.min(d,t));var f=t/d;bar.disabled=false;bar.value=f*100;bar.style.setProperty('--p',String(f));label=timestamp(t)+' / '+timestamp(d);}
if($('time-progress').textContent!==label)$('time-progress').textContent=label;}
video.addEventListener('timeupdate',function(){
if(state.playing&&(state.playing.kind==='episodes'||state.playing.kind==='movies')&&isFinite(video.duration)&&video.duration>0&&Date.now()-lastProgressSave>5000){lastProgressSave=Date.now();storeWrite('ap-progress-'+key(state.playing),JSON.stringify({time:video.currentTime,duration:video.duration}));}
updateProgress();});
['loadedmetadata','durationchange','seeking','seeked','pause','play','playing','emptied','ended'].forEach(function(n){video.addEventListener(n,updateProgress);});
function seekToFraction(){var d=playerDuration();if(!state.playing||state.playing.kind==='live'||!d)return;var f=Number($('progress').value)/100;if(!isFinite(f))return;video.currentTime=Math.max(0,Math.min(d,d*Math.max(0,Math.min(1,f))));updateProgress();showControls();}
$('progress').oninput=seekToFraction;$('progress').onchange=seekToFraction;

$('stop').onclick=function(){stop();};$('pause').onclick=toggle;$('retry').onclick=function(){if(state.playing)play(state.playing);};$('seek-back').onclick=function(){seek(-30);};$('seek-forward').onclick=function(){seek(30);};
function focusables(){if(!$('movie-detail').hidden&&$('player').hidden&&$('connection').hidden)return Array.from($('movie-detail').querySelectorAll('button')).filter(function(e){return !e.disabled&&e.getBoundingClientRect().width;});if(!$('series-detail').hidden&&$('player').hidden&&$('connection').hidden)return Array.from($('series-detail').querySelectorAll('button')).filter(function(e){return !e.disabled&&e.getBoundingClientRect().width;});return Array.from(document.querySelectorAll('button,input,select')).filter(function(el){return !el.disabled&&el.getBoundingClientRect().width&&el.getBoundingClientRect().height&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0'&&el.getBoundingClientRect().right>0&&el.getBoundingClientRect().left<innerWidth&&($('player').hidden?($('connection').hidden?!$('connection').contains(el)&&!$('player').contains(el):$('connection').contains(el)):$('player').contains(el));});}
function move(key){var els=focusables(),current=document.activeElement;if(els.indexOf(current)<0){if(els[0])els[0].focus();return;}
var c=current.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,candidates=els.filter(function(el){return el!==current;}).map(function(el){var r=el.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy;var main=key==='ArrowDown'?dy:key==='ArrowUp'?-dy:key==='ArrowRight'?dx:-dx,cross=key==='ArrowDown'||key==='ArrowUp'?Math.abs(dx):Math.abs(dy);return {el:el,score:main+cross*4,main:main,cross:cross};}).filter(function(x){return x.main>5;}).sort(function(a,b){return a.score-b.score;});
if(candidates.length){candidates[0].el.focus();candidates[0].el.scrollIntoView({block:'nearest',inline:'nearest'});}}
function liveZone(el){
if(document.querySelector('nav').contains(el))return 0;
if($('browser').querySelector('aside').contains(el))return 1;
if($('subcategories').contains(el))return 2;
if($('items').contains(el)||$('browser').querySelector('.library').contains(el))return 3;
if($('detail').contains(el))return 4;
return -1;
}
function liveFocus(zone){
var selectors=['nav button.selected','#categories button.selected','#subcategories button.selected','#items button','#detail button'];
var el=document.querySelector(selectors[zone]);
if(!el)el=document.querySelector(zone===1?'#categories button':selectors[zone]);
if(el&&!el.disabled){el.focus();el.scrollIntoView({block:'nearest',inline:'nearest'});}
}
document.addEventListener('keydown',function(e){
var key=({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter'})[e.keyCode]||e.key;if(e.keyCode===461||key==='Escape'||key==='BrowserBack'){
e.preventDefault();
if(state.view!=='home'&&state.kind==='live'&&$('player').hidden&&$('connection').hidden&&liveZone(document.activeElement)>0){liveFocus(liveZone(document.activeElement)-1);return;}
back();return;}
if(!key&&e.keyCode)key=({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter'})[e.keyCode];
if(!$('player').hidden&&!(document.body.classList.contains('episode-inline')&&$('series-detail').contains(document.activeElement))){
if(!$('quick-channels').hidden){
e.preventDefault();
if(key==='ArrowUp'||key==='ArrowDown')focusQuick(quickIndex+(key==='ArrowDown'?1:-1));
else if(key==='Enter'&&!e.repeat&&document.activeElement.dataset.quickIndex!=null)document.activeElement.click();
return;
}
if(e.keyCode===457){e.preventDefault();showControls();if(state.playing&&state.playing.kind!=='live')$('pause').focus();return;}
if(state.playing&&state.playing.kind==='live'&&(key==='ArrowUp'||key==='ArrowDown'||[33,34,427,428].indexOf(e.keyCode)>=0)){
e.preventDefault();zapChannel(key==='ArrowUp'||e.keyCode===33||e.keyCode===427?-1:1);return;
}
if(key==='Enter'){e.preventDefault();if(!e.repeat){if(state.playing&&state.playing.kind==='live')openChannelList();else{showControls();$('pause').focus();}}return;}
if(state.playing&&state.playing.kind==='live'&&(key==='ArrowLeft'||key==='ArrowRight')){e.preventDefault();showLiveBar();$('live-pause').focus();return;}
if(key==='ArrowLeft'||key==='ArrowRight'){
e.preventDefault();if($('player-ui').classList.contains('dim')){showControls();$('pause').focus();return;}if(!$('player-ui').classList.contains('dim')){
var controls=Array.from($('player-ui').querySelectorAll('button')).filter(function(b){return !b.disabled&&b.getBoundingClientRect().height;});
var index=controls.indexOf(document.activeElement),next=Math.max(0,Math.min(controls.length-1,index+(key==='ArrowRight'?1:-1)));if(controls[next])controls[next].focus();showControls();
}return;}
if(key==='ArrowUp'||key==='ArrowDown'){e.preventDefault();return;}
if(e.keyCode===415){video.play().catch(function(){});showControls();e.preventDefault();return;}
if(e.keyCode===19){video.pause();showControls();e.preventDefault();return;}
if(e.keyCode===413){stop();e.preventDefault();return;}
if(e.keyCode===417||e.keyCode===412){seek(e.keyCode===417?30:-30);e.preventDefault();return;}
return;
}
var active=document.activeElement,nav=document.querySelector('nav');
// Sidebar is reachable even when a full-page settings/detail panel is open.
if($('player').hidden&&active.tagName==='INPUT'&&key==='ArrowLeft'&&(!active.selectionStart||active.selectionStart===0)){
e.preventDefault();(nav.querySelector('button.selected')||$('nav-home')).focus();return;}
if($('player').hidden&&nav.contains(active)){
if(key==='ArrowUp'||key==='ArrowDown'){
e.preventDefault();var entries=Array.from(nav.querySelectorAll('button'));var ni=entries.indexOf(active)+(key==='ArrowDown'?1:-1);
if(entries[ni]){entries[ni].focus();entries[ni].click();entries[ni].focus();}return;
}
if(key==='Enter'){e.preventDefault();active.click();return;}
if(key==='ArrowRight'){
e.preventDefault();if(!$('connection').hidden){$('sync').focus();return;}
if(!$('movie-detail').hidden){$('movie-back').focus();return;}
if(!$('series-detail').hidden){$('series-back').focus();return;}
if(state.view==='home'){var rs=$('red-search');if(rs&&rs.getBoundingClientRect().width)rs.focus();else $('search').focus();return;}
if(state.kind!=='live'&&categoryWindow.nodes.length){var cb=categoryWindow.nodes.find(function(b){return b.classList.contains('selected');})||categoryWindow.nodes[0];if(!cb.isConnected)paintCategoryWindow(Math.max(0,Number(cb.dataset.categoryIndex)-3));cb.focus();return;}
focusFirst(true);return;
}
if(key==='ArrowLeft'){e.preventDefault();return;}
}
if($('player').hidden&&$('connection').hidden&&!$('movie-detail').hidden&&!nav.contains(active)&&/^Arrow/.test(key)){
e.preventDefault();
var relatedIndex=active.dataset.relatedIndex;
if(relatedIndex!=null){
var ri=Number(relatedIndex),target=ri+(key==='ArrowDown'?6:key==='ArrowUp'?-6:key==='ArrowRight'?1:-1);
if(key==='ArrowLeft'&&ri%6===0){(nav.querySelector('button.selected')||$('nav-home')).focus();return;}
if(key==='ArrowUp'&&ri<6){$('movie-play').focus();return;}
if(target>=0&&target<movieRelated.length){var card=$('movie-related').querySelector('[data-related-index="'+target+'"]');if(!card){paintRelatedMovies(Math.max(0,target-6));card=$('movie-related').querySelector('[data-related-index=\"'+target+'\"]');}if(card){card.focus();card.scrollIntoView({block:'nearest'});}}return;
}
var top=[$('movie-back'),$('movie-poster'),$('movie-play'),$('movie-resume'),$('movie-favorite')].filter(function(b){return !b.hidden;});
if(key==='ArrowDown'){var firstRelated=$('movie-related').querySelector('button');if(firstRelated)firstRelated.focus();return;}
if(key==='ArrowUp'){$('movie-back').focus();return;}
var mi=top.indexOf(active)+(key==='ArrowRight'?1:-1);
if(mi<0){(nav.querySelector('button.selected')||$('nav-home')).focus();return;}
if(top[mi])top[mi].focus();return;
}
if(($('player').hidden||document.body.classList.contains('episode-inline'))&&active.dataset.episodeIndex!=null&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(key)>=0){
e.preventDefault();var ix=Number(active.dataset.episodeIndex);
if(key==='ArrowLeft'&&ix%episodeCols()===0){(nav.querySelector('button.selected')||$('nav-home')).focus();return;}
if(key==='ArrowUp'&&ix<episodeCols()){($('season-tabs').querySelector('button.selected')||$('series-back')).focus();return;}
var target=ix+(key==='ArrowDown'?episodeCols():key==='ArrowUp'?-episodeCols():key==='ArrowRight'?1:-1);
if(target>=0&&target<episodeWindow.items.length){var eb=$('episode-list').querySelector('[data-episode-index="'+target+'"]');if(!eb){paintEpisodes(Math.max(0,target-2*episodeCols()));eb=$('episode-list').querySelector('[data-episode-index="'+target+'"]');}if(eb){eb.focus();eb.scrollIntoView({block:'nearest'});}}return;
}
if($('season-tabs').contains(active)&&key==='ArrowDown'){e.preventDefault();var first=$('episode-list').querySelector('button');if(first)first.focus();return;}
if($('player').hidden&&!nav.contains(active)&&key==='ArrowLeft'&&(!$('connection').hidden||!$('movie-detail').hidden||!$('series-detail').hidden)){
// Horizontal text editing remains available unless at the field's left edge.
if(active.tagName==='INPUT'&&active.selectionStart>0)return;
e.preventDefault();(nav.querySelector('button.selected')||$('nav-home')).focus();return;
}
if(!$('connection').hidden&&(key==='ArrowUp'||key==='ArrowDown')&&!nav.contains(active)){
e.preventDefault();var cs=Array.from($('connection').querySelectorAll('button,input,select')).filter(function(b){return !b.disabled&&b.getBoundingClientRect().height;});
var ci=cs.indexOf(active)+(key==='ArrowDown'?1:-1);if(cs[ci]){cs[ci].focus();cs[ci].scrollIntoView({block:'nearest'});}return;
}

var vodBase=state.view!=='home'&&state.kind!=='live'&&!state.episodes&&$('player').hidden&&$('connection').hidden&&$('movie-detail').hidden&&$('series-detail').hidden;
if(vodBase&&(key==='ArrowLeft'||key==='ArrowRight')){
var inCats=$('categories').contains(active)||active===$('providers'),inNav=nav.contains(active);
function focusCategory(){var ci=categoryWindow.nodes.findIndex(function(b){return b.classList.contains('selected');});ci=Math.max(0,ci);if(categoryWindow.nodes[ci]){if(!categoryWindow.nodes[ci].isConnected)paintCategoryWindow(Math.max(0,ci-3));categoryWindow.nodes[ci].focus();}}
if(key==='ArrowLeft'&&active.dataset.index!=null&&Number(active.dataset.index)%gridSpec().cols===0){e.preventDefault();focusCategory();return;}
if(key==='ArrowLeft'&&inCats){e.preventDefault();(nav.querySelector('button.selected')||$('nav-home')).focus();return;}
if(key==='ArrowRight'&&inNav){e.preventDefault();focusCategory();return;}
if(key==='ArrowRight'&&inCats){e.preventDefault();focusFirst(true);return;}
if(active.dataset.index!=null){var gi=Number(active.dataset.index)+(key==='ArrowRight'?1:-1);if(gi>=0&&gi<state.filtered.length){e.preventDefault();if(!$('items').querySelector('[data-index="'+gi+'"]'))renderWindow(Math.max(0,gi-6));var gb=$('items').querySelector('[data-index="'+gi+'"]');if(gb){gb.focus();gb.scrollIntoView({block:'nearest'});}return;}}
}

if(active.dataset.episodeIndex!=null&&(key==='ArrowUp'||key==='ArrowDown')){
e.preventDefault();var ei=Number(active.dataset.episodeIndex)+(key==='ArrowDown'?1:-1);if(ei>=0&&ei<episodeWindow.items.length){var eb=$('episode-list').querySelector('[data-episode-index="'+ei+'"]');if(!eb){paintEpisodes(Math.max(0,ei-3));eb=$('episode-list').querySelector('[data-episode-index="'+ei+'"]');}if(eb){eb.focus();eb.scrollIntoView({block:'nearest'});}}return;
}
if(active.dataset.categoryIndex!=null&&(key==='ArrowUp'||key==='ArrowDown')){
e.preventDefault();var ci=Number(active.dataset.categoryIndex)+(key==='ArrowDown'?1:-1);
if(ci>=0&&ci<categoryWindow.nodes.length){var cb=categoryWindow.nodes[ci];if(!cb.isConnected)paintCategoryWindow(Math.max(0,ci-3));cb.focus();cb.scrollIntoView({block:'nearest'});}return;
}
var baseView=$('player').hidden&&$('connection').hidden&&$('movie-detail').hidden&&$('series-detail').hidden&&!$('home-details').open;
if(baseView&&state.view!=='home'&&state.kind==='live'){
var zone=liveZone(active);
if(zone>=0&&(key==='ArrowLeft'||key==='ArrowRight')){
e.preventDefault();liveFocus(Math.max(0,Math.min(4,zone+(key==='ArrowRight'?1:-1))));return;
}
if(zone===1||zone===2||zone===4){
if(key==='ArrowDown'||key==='ArrowUp'){e.preventDefault();var container=zone===1?$('browser').querySelector('aside'):zone===2?$('subcategories'):$('detail');var bs=Array.from(container.querySelectorAll('button,select')).filter(function(b){return !b.disabled&&b.getBoundingClientRect().height;}),idx=bs.indexOf(active)+(key==='ArrowDown'?1:-1);if(bs[idx]){bs[idx].focus();bs[idx].scrollIntoView({block:'nearest'});}return;}
}
}
if(baseView&&state.view==='home'&&homeInline.tile&&/^Arrow/.test(key)){
var inlineCats=Array.from($('home-inline-categories').querySelectorAll('button')),inlineItems=Array.from($('home-inline-items').querySelectorAll('button'));
if($('home-tiles').contains(active)&&key==='ArrowDown'){e.preventDefault();var firstInline=inlineCats[0]||inlineItems[0];if(firstInline){firstInline.focus();firstInline.scrollIntoView({block:'nearest'});}return;}
if($('home-inline-categories').contains(active)){
e.preventDefault();var ci=inlineCats.indexOf(active),target;
if(key==='ArrowUp'){homeTileFocus();return;}
if(key==='ArrowDown')target=inlineItems[0];
if(key==='ArrowRight')target=inlineCats[ci+1];
if(key==='ArrowLeft')target=inlineCats[ci-1]||$('nav-home');
if(target){target.focus();target.scrollIntoView({block:'nearest',inline:'nearest'});}return;
}
if($('home-inline-items').contains(active)){
e.preventDefault();var ii=inlineItems.indexOf(active),columns=homeInline.kind==='live'?1:6;
if(key==='ArrowUp'&&ii<columns){var c=$('home-inline-categories button.selected')||inlineCats[0];if(c)c.focus();else homeTileFocus();return;}
if(key==='ArrowLeft'&&ii%columns===0){$('nav-home').focus();return;}
var next=ii+(key==='ArrowDown'?columns:key==='ArrowUp'?-columns:key==='ArrowRight'?1:-1);
if(inlineItems[next]){inlineItems[next].focus();inlineItems[next].scrollIntoView({block:'nearest'});}return;
}
}
if(baseView&&state.view==='home'&&!nav.contains(active)&&/^Arrow/.test(key)){
var rows=[[$('search'),$('red-search'),$('red-ic-fav'),$('red-ic-recent'),$('red-ic-set')].filter(Boolean),Array.from($('home-hero').querySelectorAll('button')),Array.from($('home-tiles').querySelectorAll('button')),Array.from(document.querySelectorAll('#home-shelves>section:first-child button')),Array.from(document.querySelectorAll('#home-shelves>section:last-child button'))].map(function(r){return r.filter(function(b){return !b.disabled&&b.getBoundingClientRect().width;});});
var ri=rows.findIndex(function(r){return r.indexOf(active)>=0;});
if(ri>=0){e.preventDefault();var ci=rows[ri].indexOf(active),target;
if(key==='ArrowLeft'){target=rows[ri][ci-1]||$('nav-home');}
if(key==='ArrowRight')target=rows[ri][ci+1];
if(key==='ArrowDown'||key==='ArrowUp'){var nr=ri+(key==='ArrowDown'?1:-1);if(rows[nr])target=rows[nr][Math.min(ci,rows[nr].length-1)];}
if(target){target.focus();target.scrollIntoView({block:'nearest',inline:'nearest'});}return;}
}
if(baseView&&nav.contains(active)){
if(key==='Enter'){e.preventDefault();if(!e.repeat)active.click();return;}
if(key==='ArrowRight'){e.preventDefault();focusFirst();return;}
if(key==='ArrowUp'||key==='ArrowDown'){e.preventDefault();var ns=Array.from(nav.querySelectorAll('button')),ni=ns.indexOf(active)+(key==='ArrowDown'?1:-1);if(ns[ni])ns[ni].focus();return;}
if(key==='ArrowLeft'){e.preventDefault();return;}
}
if(baseView&&key==='ArrowLeft'&&active.tagName!=='INPUT'&&active.tagName!=='SELECT'){
e.preventDefault();var selected=nav.querySelector('button.selected')||$('nav-home');selected.focus();return;
}
if(key==='Enter'&&active.tagName==='BUTTON'){e.preventDefault();if(!e.repeat)active.click();return;}
if(/^Arrow/.test(key)){
if(state.kind!=='live'&&!state.episodes&&document.activeElement.dataset.index!=null&&(key==='ArrowLeft'||key==='ArrowRight')){var n=Number(document.activeElement.dataset.index)+(key==='ArrowRight'?1:-1);if(n>=0&&n<state.filtered.length){e.preventDefault();var t=$('items').scrollTop;if(!$('items').querySelector('[data-index="'+n+'"]'))renderWindow(Math.max(0,n-6));$('items').scrollTop=t;var target=$('items').querySelector('[data-index="'+n+'"]');if(target){target.focus();target.scrollIntoView({block:'nearest'});}return;}}
var current=document.activeElement;if(current&&current.dataset.index!=null&&(key==='ArrowDown'||key==='ArrowUp')){var step=state.kind!=='live'&&!state.episodes?gridSpec().cols:1;var index=Number(current.dataset.index)+(key==='ArrowDown'?step:-step);if(state.kind==='live'&&state.filtered.length)index=(index+state.filtered.length)%state.filtered.length;if(index>=0&&index<state.filtered.length){e.preventDefault();var top=$('items').scrollTop;if(!$('items').querySelector('[data-index="'+index+'"]'))renderWindow(Math.max(0,index-2));$('items').scrollTop=top;var next=$('items').querySelector('[data-index="'+index+'"]');if(next){next.focus();next.scrollIntoView({block:'nearest'});}return;}}
if(document.activeElement.tagName==='SELECT')return;if(document.activeElement.tagName==='INPUT'&&(key==='ArrowLeft'||key==='ArrowRight'))return;e.preventDefault();move(key);}
});
document.addEventListener('visibilitychange',function(){if(document.hidden){stopPreview();if(state.playing)stop(false);}});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&deviceIdentity)sync();});
/* Player 2.1 additions, shared by all palettes. No theme defaults changed. */
var f21={previous:null,last:null,retry:null,retries:0,stall:null,digits:'',digitTimer:null,sleep:null,deadline:0,unlocked:false,pinBusy:false};
function fRead(k,fallback){try{return JSON.parse(storeRead(k)||'null')||fallback;}catch(e){return fallback;}}
var fLocks=fRead('ap-locks',{channels:[],groups:[]}),fPin=fRead('ap-parent-pin',null),fResume=fRead('ap-continue',[]);
function fToast(text){var el=$('f21-toast');el.textContent=text;el.hidden=false;clearTimeout(el._timer);el._timer=setTimeout(function(){el.hidden=true;},3500);}
function fLive(){return homeCatalog.live.length?homeCatalog.live:state.items.filter(function(i){return i.kind==='live';});}
function fGroup(i){return String(state.provider&&state.provider.id)+':'+(i.kind==='episodes'?'series':i.kind)+':'+i.group;}
function fLocked(i){return !!fPin&&!f21.unlocked&&(fLocks.channels.indexOf(key(i))>=0||fLocks.groups.indexOf(i.kind==='episodes'&&seriesItem?String(state.provider&&state.provider.id)+':series:'+seriesItem.group:fGroup(i))>=0);}
function fModal(title){var box=$('f21-modal');box.replaceChildren();var h=document.createElement('h2');h.textContent=title;box.appendChild(h);box.hidden=false;box._return=document.activeElement;var close=button('رجوع',fClose);close.id='f21-close';box.appendChild(close);return box;}
function fClose(){var box=$('f21-modal'),ret=box._return;box.hidden=true;if(ret&&ret.isConnected)ret.focus();}
function fField(box,label,type){var l=document.createElement('label');l.textContent=label;var input=document.createElement('input');input.type=type||'text';l.appendChild(input);box.appendChild(l);return input;}
function fHex(bytes){return Array.from(new Uint8Array(bytes)).map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');}
async function fHash(pin,salt){if(!window.crypto||!crypto.subtle)throw Error('PIN unavailable');var enc=new TextEncoder(),material=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);return fHex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},material,256));}
var fPinFails=0,fPinUntil=0;
function fAskPin(done,setup){if(f21.pinBusy)return;var box=fModal(setup?'تعيين رمز PIN':'أدخل رمز PIN'),input=fField(box,setup?'رمز من 4 إلى 8 أرقام':'PIN','password');input.inputMode='numeric';input.maxLength=8;var confirm=setup?fField(box,'تأكيد الرمز','password'):null;if(confirm){confirm.inputMode='numeric';confirm.maxLength=8;}var msg=document.createElement('p');box.appendChild(msg);var submit=button('تأكيد',async function(){
if(Date.now()<fPinUntil){msg.textContent='انتظر دقيقة ثم حاول مجدداً';return;}if(!/^\d{4,8}$/.test(input.value)){msg.textContent='استخدم 4 إلى 8 أرقام';return;}if(confirm&&confirm.value!==input.value){msg.textContent='الرمزان غير متطابقين';return;}
f21.pinBusy=true;submit.disabled=true;try{if(setup){var salt=fHex(crypto.getRandomValues(new Uint8Array(16)));fPin={salt:salt,hash:await fHash(input.value,salt)};storeWrite('ap-parent-pin',JSON.stringify(fPin));}else if(await fHash(input.value,fPin.salt)!==fPin.hash){fPinFails++;if(fPinFails>=5){fPinUntil=Date.now()+60000;fPinFails=0;}msg.textContent='الرمز غير صحيح';return;}fPinFails=0;fClose();done();}catch(e){msg.textContent='تعذّر تفعيل PIN على هذا الجهاز';}finally{f21.pinBusy=false;submit.disabled=false;}});box.appendChild(submit);input.focus();input.addEventListener('keydown',function(e){if(e.key==='Enter')submit.click();});}
function fAuthorize(item,done){if(!fLocked(item)){done();return;}fAskPin(function(){f21.unlocked=true;done();},false);}
function fSaveProgress(){var item=state.playing;if(!item||['movies','episodes'].indexOf(item.kind)<0)return;var d=Number(video.duration),t=Number(video.currentTime);if(!isFinite(d)||d<=0||!isFinite(t))return;storeWrite('ap-progress-'+key(item),JSON.stringify({time:t,duration:d}));var id=key(item);fResume=fResume.filter(function(r){return r.key!==id;});if(t>=10&&d-t>15){var parent=item.kind==='episodes'&&seriesItem?{id:seriesItem.id,group:seriesItem.group}:null;fResume.unshift({key:id,provider:String(state.provider&&state.provider.id),id:item.id,kind:item.kind,name:item.name,logo:item.logo||(seriesItem&&item.kind==='episodes'?seriesItem.logo:''),time:t,duration:d,series:parent,ext:(String(item.url).match(/\.([a-zA-Z0-9]{1,8})(?:\?|$)/)||[])[1]||'mp4'});}fResume=fResume.slice(0,30);storeWrite('ap-continue',JSON.stringify(fResume));fPaintContinue();}
function fPaintContinue(){var section=$('f21-continue');if(!section||!homeCatalog)return;var list=$('f21-continue-list');list.replaceChildren();var rows=fResume.filter(function(r){return state.provider&&r.provider===String(state.provider.id);});section.hidden=!rows.length;if(rows.length){$('home').style.setProperty('overflow-y','auto','important');$('home-shelves').style.setProperty('min-height','420px');}rows.slice(0,8).forEach(function(r){var b=button('',function(){fResumePlay(r);});b.className='continue-card';var match=homeCatalog.movies.find(function(i){return String(i.id)===String(r.id);})||(r.series&&homeCatalog.series.find(function(i){return String(i.id)===String(r.series.id);}));b.appendChild(image(r.logo||(match&&match.logo),'continue-art',r.name));var copy=document.createElement('span');copy.className='continue-copy';var title=document.createElement('strong');title.textContent=r.name;title.dir='auto';var time=document.createElement('small');time.textContent=timestamp(r.time)+' / '+timestamp(r.duration);time.dir='ltr';var progress=document.createElement('progress');progress.max=Number(r.duration)||1;progress.value=Math.max(0,Math.min(Number(r.time)||0,progress.max));progress.setAttribute('aria-label','تقدم المشاهدة');copy.append(title,time,progress);b.appendChild(copy);b.setAttribute('aria-label',r.name+' · '+timestamp(r.time));list.appendChild(b);});}
async function fResumePlay(r){if(!state.provider||r.provider!==String(state.provider.id))return;var found=homeCatalog.movies.find(function(i){return i.id===r.id&&i.kind===r.kind;});if(found){play(found);return;}if(r.kind==='episodes'&&r.series){var parent=homeCatalog.series.find(function(i){return i.id===r.series.id;});if(!parent||!itemAllowed(parent,state.provider)){fToast('العنوان غير متاح');return;}fAuthorize(parent,async function(){try{var data=await xc(state.provider,'get_series_info',r.series.id);var ep=A.episodes(data,state.provider).find(function(i){return i.id===r.id;});if(ep){ep.parentGroup=parent.group;ep.parentSeriesId=parent.id;seriesItem=parent;play(ep);}else fToast('الحلقة غير متاحة');}catch(e){fToast('تعذّر تحميل الحلقة');}});return;}fToast('العنوان غير متاح حالياً');}
function fCancelRetry(){clearTimeout(f21.retry);clearTimeout(f21.stall);f21.retry=null;f21.stall=null;}
function fRetry(){if(!state.playing||state.playing.kind!=='live'||f21.retry||document.hidden)return;var item=state.playing,attempt=++f21.retries;if(attempt>8){fToast('تعذّر الاتصال. جرّب قناة أخرى أو أعد المحاولة');return;}var delay=Math.min(30000,1000*Math.pow(2,attempt-1));fToast('إعادة الاتصال خلال '+Math.ceil(delay/1000)+' ث');f21.retry=setTimeout(function(){f21.retry=null;if(state.playing!==item)return;var url=A.safeURL(item.url);if(!url)return;video.pause();video.src=url;video.load();video.play().catch(function(){fRetry();});f21.stall=setTimeout(fRetry,15000);},delay);}
['error','ended'].forEach(function(n){video.addEventListener(n,fRetry);});
['waiting','stalled'].forEach(function(n){video.addEventListener(n,function(){clearTimeout(f21.stall);f21.stall=setTimeout(fRetry,12000);});});
var fLastMotion=Date.now(),fLastTime=-1;video.addEventListener('playing',function(){fCancelRetry();f21.retries=0;fLastMotion=Date.now();});setInterval(function(){if(!state.playing||state.playing.kind!=='live'||document.hidden)return;if(video.currentTime!==fLastTime){fLastTime=video.currentTime;fLastMotion=Date.now();}else if(Date.now()-fLastMotion>20000){fLastMotion=Date.now();fRetry();}},5000);
var fSaveAt=0;video.addEventListener('timeupdate',function(){if(Date.now()-fSaveAt>5000){fSaveAt=Date.now();fSaveProgress();}});video.addEventListener('pause',fSaveProgress);video.addEventListener('ended',fSaveProgress);window.addEventListener('pagehide',fSaveProgress);
function fLastChannel(){if(f21.previous&&state.provider&&f21.previous.providerId===String(state.provider.id)){play(f21.previous.item);fToast('القناة السابقة');}else fToast('لا توجد قناة سابقة');}
function fJump(){clearTimeout(f21.digitTimer);var n=Number(f21.digits),items=fLive();f21.digits='';if(n>=1&&n<=items.length){play(items[n-1]);fToast('القناة '+n);}else fToast('رقم قناة غير موجود');}
function fSleep(minutes){clearTimeout(f21.sleep);f21.deadline=minutes?Date.now()+minutes*60000:0;$('f21-sleep-state').textContent=minutes?'يتوقف التشغيل بعد '+minutes+' دقيقة':'مؤقت النوم متوقف';if(minutes)f21.sleep=setTimeout(function(){f21.deadline=0;stop(false);stopPreview();fToast('انتهى مؤقت النوم');if($('f21-sleep-state'))$('f21-sleep-state').textContent='مؤقت النوم متوقف';},minutes*60000);fToast(minutes?'تم ضبط مؤقت النوم':'تم إلغاء المؤقت');}
function fManageLocks(){var box=fModal('قفل القنوات والتصنيفات');var note=document.createElement('p');note.textContent='القفل محلي لهذا التطبيق. أدخل PIN مرة لكل جلسة؛ أعد القفل من الإعدادات.';box.appendChild(note);var search=fField(box,'بحث');var list=document.createElement('div');list.className='f21-lock-list';box.appendChild(list);function paint(){list.replaceChildren();var all=homeCatalog.live.concat(homeCatalog.movies,homeCatalog.series),groups={};all.forEach(function(i){groups[fGroup(i)]={id:fGroup(i),name:i.group,kind:i.kind};});var rows=Object.keys(groups).map(function(id){return {id:id,name:'تصنيف · '+groups[id].kind+' · '+groups[id].name,type:'groups'};}).concat(all.filter(function(i){return i.kind==='live';}).map(function(i){return {id:key(i),name:'قناة · '+i.name,type:'channels'};}));var q=search.value.toLowerCase();rows.filter(function(r){return !q||r.name.toLowerCase().indexOf(q)>=0;}).slice(0,200).forEach(function(r){var b=button('',function(){var arr=fLocks[r.type],at=arr.indexOf(r.id);if(at<0)arr.push(r.id);else arr.splice(at,1);storeWrite('ap-locks',JSON.stringify(fLocks));b.textContent=(arr.indexOf(r.id)>=0?'☑ ':'☐ ')+r.name;b.setAttribute('aria-pressed',String(arr.indexOf(r.id)>=0));});b.textContent=(fLocks[r.type].indexOf(r.id)>=0?'☑ ':'☐ ')+r.name;list.appendChild(b);});}search.oninput=paint;paint();search.focus();}
function fSettings(){var box=fModal('خيارات المشاهدة');var text=document.createElement('p');text.textContent='القناة السابقة · زر 0 أثناء البث أو زر الريموت الأزرق. الأرقام 1–9 تبدأ رقم القناة؛ Enter للتأكيد.';box.appendChild(text);var pin=button(fPin?'إدارة PIN والقنوات المقفلة':'تعيين PIN وقفل القنوات',function(){fAskPin(function(){f21.unlocked=true;fManageLocks();},!fPin);});box.appendChild(pin);if(fPin)box.appendChild(button('تغيير PIN',function(){fAskPin(function(){fAskPin(function(){fToast('تم تغيير PIN');fSettings();},true);},false);}));box.appendChild(button('إعادة قفل القنوات الآن',function(){f21.unlocked=false;fToast('تم قفل القنوات');if(state.playing&&fLocked(state.playing))stop(false);}));var h=document.createElement('h3');h.textContent='مؤقت النوم';box.appendChild(h);var p=document.createElement('p');p.id='f21-sleep-state';p.textContent=f21.deadline?'متبقٍ '+Math.ceil((f21.deadline-Date.now())/60000)+' دقيقة':'مؤقت النوم متوقف';box.appendChild(p);[0,30,60,90,120].forEach(function(n){box.appendChild(button(n?n+' دقيقة':'إلغاء المؤقت',function(){fSleep(n);}));});pin.focus();}
var fToastEl=document.createElement('div');fToastEl.id='f21-toast';fToastEl.hidden=true;fToastEl.setAttribute('role','status');$('screen').appendChild(fToastEl);var fModalEl=document.createElement('div');fModalEl.id='f21-modal';fModalEl.hidden=true;fModalEl.setAttribute('role','dialog');fModalEl.setAttribute('aria-modal','true');$('screen').appendChild(fModalEl);
var fButton=button('خيارات المشاهدة · PIN · مؤقت النوم',fSettings);fButton.id='f21-settings';$('glass-row').parentNode.insertBefore(fButton,$('glass-row'));
var fContinue=document.createElement('section');fContinue.id='f21-continue';fContinue.hidden=true;var fHeading=document.createElement('h2');fHeading.textContent='متابعة المشاهدة';fContinue.appendChild(fHeading);var fList=document.createElement('div');fList.id='f21-continue-list';fContinue.appendChild(fList);$('home').insertBefore(fContinue,$('home').firstChild);
function fPaintNew(){var section=$('f21-new');if(!section||!homeCatalog)return;section.hidden=state.view!=='catalog'||state.kind==='live'||!!state.episodes;if(section.hidden)return;var list=$('f21-new-list');list.replaceChildren();var source=(homeCatalog[state.kind]||[]).filter(function(i){return Number(i.added)>0&&isFinite(Number(i.added))&&itemAllowed(i,state.provider);}).slice().sort(function(a,b){return Number(b.added)-Number(a.added);});section.hidden=!source.length;source.slice(0,12).forEach(function(i){var b=button(i.name,function(){open(i);});b.dataset.added=String(i.added);list.appendChild(b);});}
var fNew=document.createElement('section');fNew.id='f21-new';fNew.hidden=true;var fNewHead=document.createElement('h2');fNewHead.textContent='جديد';fNew.appendChild(fNewHead);var fNewList=document.createElement('div');fNewList.id='f21-new-list';fNew.appendChild(fNewList);$('items').parentNode.insertBefore(fNew,$('items'));

function fTrackKey(){return state.playing&&state.playing.kind==='episodes'&&seriesItem?'ap-series-tracks-'+String(state.provider&&state.provider.id)+':'+seriesItem.id:null;}
function fTrackDescriptor(t){return {id:String(t.id||''),language:t.language||'',label:t.label||''};}
function fTrackMatch(t,d){return d&&(d.language||d.label||d.id)&&(!d.language||d.language===t.language)&&(!d.label||d.label===t.label)&&(!d.id||d.id===String(t.id||''));}
function fRememberTracks(){var k=fTrackKey();if(!k)return;var pref={},a=video.audioTracks||[],s=video.textTracks||[];for(var i=0;i<a.length;i++)if(a[i].enabled)pref.audio=fTrackDescriptor(a[i]);pref.sub='off';for(var j=0;j<s.length;j++)if(s[j].mode==='showing')pref.sub=fTrackDescriptor(s[j]);storeWrite(k,JSON.stringify(pref));}
function fRestoreTracks(){var k=fTrackKey(),p=k&&fRead(k,null);if(!p)return;var a=video.audioTracks||[],s=video.textTracks||[],found=null;for(var i=0;i<a.length;i++)if(fTrackMatch(a[i],p.audio)){found=a[i];break;}if(found)for(var n=0;n<a.length;n++)a[n].enabled=a[n]===found;if(p.sub==='off'){for(var j=0;j<s.length;j++)s[j].mode='disabled';}else{var sub=null;for(var x=0;x<s.length;x++)if(fTrackMatch(s[x],p.sub)){sub=s[x];break;}if(sub)for(var y=0;y<s.length;y++)s[y].mode=s[y]===sub?'showing':'disabled';}}
video.addEventListener('loadedmetadata',function(){fRestoreTracks();[video.audioTracks,video.textTracks].forEach(function(list){if(list&&list.addEventListener&&!list._f21bound){list._f21bound=true;list.addEventListener('addtrack',fRestoreTracks);}});});
function fSearch(){var box=fModal('البحث في المكتبة'),input=fField(box,'القنوات والأفلام والمسلسلات');input.id='f21-search-input';var results=document.createElement('div');results.className='f21-lock-list';box.appendChild(results);var searchTimer;function find(){results.replaceChildren();var q=input.value.trim().toLocaleLowerCase();if(!q)return;homeCatalog.live.concat(homeCatalog.movies,homeCatalog.series).filter(function(i){return itemAllowed(i,state.provider)&&i.name.toLocaleLowerCase().indexOf(q)>=0;}).slice(0,100).forEach(function(i){var b=button(({live:'قناة',movies:'فيلم',series:'مسلسل'})[i.kind]+' · '+i.name,function(){fClose();if(i.kind==='live')play(i);else open(i);});results.appendChild(b);});if(!results.childNodes.length){var note=document.createElement('p');note.textContent='لا توجد نتائج في المكتبة المحملة';results.appendChild(note);}}input.oninput=function(){clearTimeout(searchTimer);searchTimer=setTimeout(find,150);};input.focus();}
$('nav-search').onclick=fSearch;
var fRandom=button('عشوائي',function(){var list=state.filtered.filter(function(i){return i.kind==='movies'||i.kind==='series';});if(list.length)open(list[Math.floor(Math.random()*list.length)]);else fToast('لا توجد عناوين متاحة');});fRandom.id='f21-random';document.querySelector('.section-title').appendChild(fRandom);
var fSpeed=button('سرعة التشغيل',function(){var box=fModal('سرعة التشغيل');var options=document.createElement('div');options.id='f22-speed-options';box.insertBefore(options,box.querySelector('h2').nextSibling);[0.75,1,1.25,1.5,2].forEach(function(rate){var b=button(rate+'×',function(){video.preservesPitch=true;video.webkitPreservesPitch=true;video.mozPreservesPitch=true;video.playbackRate=rate;fToast('سرعة التشغيل '+rate+'×');});options.appendChild(b);});var label=document.createElement('small');label.textContent='خاصية خاصة لآية';label.style.display='block';label.style.fontSize='22px';label.style.margin='-8px 8px 20px';box.insertBefore(label,box.querySelector('h2').nextSibling);box.querySelector('button').focus();});fSpeed.id='f21-speed';fSpeed.hidden=true;(window.APTouch?$('player-ui').querySelector('.actions'):$('player-ui')).appendChild(fSpeed);
var fSkip=button('تخطي المقدمة +85 ثانية',function(){var d=playerDuration();if(d)video.currentTime=Math.min(d,video.currentTime+85);showControls();});fSkip.id='f21-skip-intro';fSkip.hidden=true;$('player').appendChild(fSkip);
function fSkipState(){fSpeed.hidden=!state.playing||state.playing.kind==='live';fSkip.hidden=!state.playing||state.playing.kind!=='episodes'||video.currentTime>=180||$('player-ui').classList.contains('dim');}
['timeupdate','loadedmetadata','emptied'].forEach(function(n){video.addEventListener(n,fSkipState);});
var fNextTimer=null,fNextItem=null,fNextBox=document.createElement('div');fNextBox.id='f21-next';fNextBox.hidden=true;$('player').appendChild(fNextBox);
function fCancelNext(){clearInterval(fNextTimer);fNextTimer=null;fNextItem=null;fNextBox.hidden=true;}
video.addEventListener('ended',function(){if(!state.playing||state.playing.kind!=='episodes')return;var pos=seriesEpisodes.findIndex(function(i){return i.id===state.playing.id;});if(pos<0||!seriesEpisodes[pos+1])return;fNextItem=seriesEpisodes[pos+1];var seconds=10;fNextBox.replaceChildren();var label=document.createElement('p');label.textContent='الحلقة التالية خلال '+seconds+' ث';fNextBox.appendChild(label);fNextBox.appendChild(button('إلغاء',function(){fCancelNext();showControls();}));fNextBox.appendChild(button('تشغيل الآن',function(){var next=fNextItem;fCancelNext();if(next)activateEpisode(next);}));fNextBox.hidden=false;fNextBox.querySelector('button').focus();fNextTimer=setInterval(function(){seconds--;label.textContent='الحلقة التالية خلال '+seconds+' ث';if(seconds<=0){var next=fNextItem;fCancelNext();if(next)activateEpisode(next);}},1000);});

// Capture avoids replacing existing remote behaviour; 0 alone is previous channel.
document.addEventListener('keydown',function(e){var k=e.key||'',code=e.keyCode,active=document.activeElement;if(fNextBox&&!fNextBox.hidden){if(k==='Escape'||code===461){e.preventDefault();e.stopImmediatePropagation();fCancelNext();return;}if(k==='Enter'||code===13){e.preventDefault();e.stopImmediatePropagation();if(active.tagName==='BUTTON')active.click();return;}if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();var bs=fNextBox.querySelectorAll('button');(active===bs[0]?bs[1]:bs[0]).focus();return;}}if(!$('f21-modal').hidden){if(code===461||k==='Escape'||k==='BrowserBack'){e.preventDefault();e.stopImmediatePropagation();fClose();return;}if(/^Arrow/.test(k)||code===13){if(active.tagName==='INPUT'&&(k==='ArrowLeft'||k==='ArrowRight'))return;e.preventDefault();e.stopImmediatePropagation();if(k==='Enter'||code===13){if(active.tagName==='BUTTON')active.click();return;}var nodes=Array.from($('f21-modal').querySelectorAll('button,input')).filter(function(n){return !n.disabled&&n.offsetHeight;}),at=nodes.indexOf(active),step=k==='ArrowUp'||k==='ArrowLeft'?-1:1;var next=nodes[(at+step+nodes.length)%nodes.length];if(next){next.focus();next.scrollIntoView({block:'nearest'});}return;}return;}
if(/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)||!$('connection').hidden)return;
if(code===406&&state.playing&&state.playing.kind==='live'){e.preventDefault();e.stopImmediatePropagation();fLastChannel();return;}
var digit=/^[0-9]$/.test(k)?k:code>=48&&code<=57?String(code-48):code>=96&&code<=105?String(code-96):null;
if(digit!==null&&(state.kind==='live'||state.playing&&state.playing.kind==='live')){e.preventDefault();e.stopImmediatePropagation();if(digit==='0'&&!f21.digits&&state.playing&&state.playing.kind==='live'){fLastChannel();return;}f21.digits=(f21.digits+digit).slice(-5);fToast('رقم القناة '+f21.digits);clearTimeout(f21.digitTimer);f21.digitTimer=setTimeout(fJump,1400);return;}
if(f21.digits&&(k==='Enter'||code===13)){e.preventDefault();e.stopImmediatePropagation();fJump();}
},true);

featuredWriter.clear();bootCatalog();setInterval(sync,30*60*1000);setInterval(function(){if(state.expires&&Date.parse(state.expires)<=Date.now()&&state.provider&&!state.provider.manual){stop();featuredQueue.clear();resetFeatured();clearHomeUI();state.items=[];state.provider=null;state.request++;render();$('activation').textContent=tr('انتهى التفعيل. جدّد الجهاز من لوحة التحكم.');connection(true);}},60000);
})();

;(function(){var q=document.getElementById('quick-channels'),pl=document.getElementById('player');if(!q||!pl||!window.MutationObserver)return;function sync(){pl.classList.toggle('quick-open',!q.hidden);}new MutationObserver(sync).observe(q,{attributes:true,attributeFilter:['hidden']});sync();})();

;(function(){
var b=document.getElementById('glass-toggle');if(!b)return;
var ok=!!(window.CSS&&CSS.supports&&(CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)')));
function read(key){try{return localStorage.getItem(key);}catch(e){return null;}}
// Historical ap-glass 1/0 (and on/off) were written ONLY by the click handler,
// never by startup defaults. Other/unrecognised values are not user choices.
var choice=read('ap-glass-choice'),legacy=read('ap-glass');
if(choice!=='1'&&choice!=='0'){
  choice=legacy==='1'||legacy==='on'?'1':legacy==='0'||legacy==='off'?'0':null;
  if(choice!==null)try{localStorage.setItem('ap-glass-choice',choice);}catch(e){}
}
function set(on,save){
  if(save)try{
    localStorage.setItem('ap-glass',on?'1':'0');
    localStorage.setItem('ap-glass-choice',on?'1':'0');
  }catch(e){}
  on=on&&ok;
  document.body.classList.toggle('no-glass',!on);
  b.setAttribute('aria-pressed',on?'true':'false');
  b.textContent=tr('تأثير الزجاج: ')+(on?tr('تشغيل'):tr('إيقاف'));
}
b.onclick=function(){set(document.body.classList.contains('no-glass'),true);};
set(choice==='1',false);
})();
