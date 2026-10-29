'use strict';
const a=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('app/app.js','utf8'),html=fs.readFileSync('app/index.html','utf8');
a(html.includes('id="refresh-list">تحديث القائمة</button>'));
a(!/CATALOG_TTL/.test(js));
a(js.includes('compactRows')&&js.includes('stream_icon:x.stream_icon'));
a(js.includes("f==='provider'"));
console.log('PASS');
