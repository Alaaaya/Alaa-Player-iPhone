'use strict';
// Mini lexer: finds string literals (not regex/comments) in a JS file.
const fs=require('fs');
function lex(src){const out=[];let i=0,prev='';const n=src.length;
 const regexOK=()=>/^(|[(,=:\[!&|?{};+\-*%<>~^]|return|typeof|case)$/.test(prev);
 while(i<n){const c=src[i];
  if(c==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;continue}
  if(c==='/'&&src[i+1]==='*'){i=src.indexOf('*/',i+2)+2;continue}
  if(c==="'"||c==='"'){let j=i+1,s='';while(src[j]!==c){if(src[j]==='\\'){s+=src[j]+src[j+1];j+=2}else s+=src[j++]}out.push({s:i,e:j+1,q:c,v:s});i=j+1;prev='str';continue}
  if(c==='`'){let j=i+1,d=0;while(!(src[j]==='`'&&d===0)){if(src[j]==='\\')j++;else if(src[j]==='$'&&src[j+1]==='{'){d++;j++}else if(src[j]==='}'&&d>0)d--;j++}out.push({s:i,e:j+1,q:'`',v:src.slice(i+1,j)});i=j+1;prev='str';continue}
  if(c==='/'&&regexOK()){let j=i+1,cls=false;while(src[j]!=='/'||cls){if(src[j]==='\\')j++;else if(src[j]==='[')cls=true;else if(src[j]===']')cls=false;j++}j++;while(/[a-z]/.test(src[j]))j++;i=j;prev='re';continue}
  if(/\s/.test(c)){i++;continue}
  if(/[A-Za-z0-9_$]/.test(c)){let j=i;while(/[A-Za-z0-9_$]/.test(src[j]))j++;prev=src.slice(i,j);i=j;continue}
  prev=c;i++}
 return out}
module.exports={lex};
if(require.main===module){for(const f of process.argv.slice(2)){const s=fs.readFileSync(f,'utf8');for(const t of lex(s))if(/[\u0600-\u06FF]/.test(t.v))console.log(f+'\t'+t.q+'\t'+t.v)}}
