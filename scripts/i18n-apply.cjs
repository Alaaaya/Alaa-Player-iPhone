const {lex}=require('./i18n-extract.cjs'),fs=require('fs');
const EN=new Set(['Playlist','Playlist: ','Device ','Original','Zoom','Stretch','Fullscreen','Exit','Live','Track ']);
for(const f of ['app','red']){const p=__dirname+'/../app/'+f+'.js';let s=fs.readFileSync(p,'utf8'),n=0;const toks=lex(s).filter(t=>(/[\u0600-\u06FF]/.test(t.v)||EN.has(t.v))&&t.q!=='`');
 for(const t of toks.reverse()){const before=s.slice(0,t.s);if(/tr\(\s*$/.test(before))continue;s=before+'tr('+s.slice(t.s,t.e)+')'+s.slice(t.e);n++}
 fs.writeFileSync(p,s);console.log(f,n)}