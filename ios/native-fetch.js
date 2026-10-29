(function(){
'use strict';
if(!window.webkit || !window.webkit.messageHandlers.nativeFetch)return;
var browserFetch=window.fetch.bind(window);
window.fetch=async function(input,options){
var url=typeof input==='string'?input:input.url;
if(!/^https?:\/\//i.test(url))return browserFetch(input,options);
var o=options||{},signal=o.signal;
if(signal&&signal.aborted)throw new DOMException('Aborted','AbortError');
var headers={};new Headers(o.headers||(input instanceof Request?input.headers:undefined)).forEach(function(v,k){headers[k]=v;});
var request=window.webkit.messageHandlers.nativeFetch.postMessage({url:url,method:o.method||(input instanceof Request?input.method:'GET'),headers:headers,body:typeof o.body==='string'?o.body:null});
var onAbort;
var cancelled=new Promise(function(_,reject){if(signal){onAbort=function(){reject(new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',onAbort,{once:true});}});
try{
var r=await Promise.race([request,cancelled]),raw=atob(r.base64),bytes=new Uint8Array(raw.length);
for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
return new Response([204,205,304].indexOf(r.status)>=0?null:bytes,{status:r.status,headers:r.headers});
}finally{if(signal&&onAbort)signal.removeEventListener('abort',onAbort);}
};
})();
