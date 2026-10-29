'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const {transform} = require('lightningcss');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'app'), out = path.join(root, 'dist');
const hash = text => "'sha256-" + crypto.createHash('sha256').update(text).digest('base64') + "'";
(async () => {
  fs.rmSync(out, {recursive:true, force:true});
  fs.mkdirSync(out, {recursive:true});
  for (const file of ['appinfo.json','icon.png','largeIcon.png','assets'])
    fs.cpSync(path.join(src,file), path.join(out,file), {recursive:true});
  let css = transform({
    filename:'style.css', code:fs.readFileSync(path.join(src,'style.css')),
    targets:{chrome:79 << 16}, minify:true
  }).code.toString();
  // Font fetching in a local/opaque webOS origin differs from an HTTP dev server.
  css = css.replace(/url\(["']?(assets\/[^"')]+\.woff2)["']?\)/g, (_, file) =>
    'url("data:font/woff2;base64,' + fs.readFileSync(path.join(src,file)).toString('base64') + '")');
  const scripts = [];
  for (const file of ['touch.js','i18n.js','panel-public.js','core.js','featured.js','app.js','red.js','lang.js']) {
    const result = await esbuild.transform(fs.readFileSync(path.join(src,file),'utf8'), {
      sourcefile:file, target:'chrome79', charset:'utf8', minify:true, legalComments:'inline'
    });
    scripts.push(result.code.replace(/<\/script/gi, '<\\/script'));
  }
  let html = fs.readFileSync(path.join(src,'index.html'),'utf8');
  // No external CSS/JS requests, no reliance on file:// matching CSP 'self'.
  // Exact hashes permit only our generated scripts/styles, never arbitrary inline JS.
  const csp = [
    "default-src 'none'", 'script-src ' + scripts.map(hash).join(' '),
    'style-src ' + hash(css), "font-src data:",
    "connect-src http: https:", "img-src 'self' file: http: https: data:",
    "media-src http: https: blob:", "object-src 'none'", "base-uri 'none'"
  ].join('; ');
  html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/, '$1' + csp + '$2');
  html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>' + css + '</style>');
  let index=0;
  html = html.replace(/<script src="[^"]+"><\/script>/g, () => '<script>' + scripts[index++] + '</script>');
  if(index!==8 || /<script[^>]+src=|rel="stylesheet"/.test(html)) throw Error('Unexpected entry HTML');
  fs.writeFileSync(path.join(out,'index.html'), html);
  fs.writeFileSync(path.join(out,'build-info.json'), JSON.stringify({
    version:JSON.parse(fs.readFileSync(path.join(src,'appinfo.json'))).version,
    commit:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    jsTarget:'chrome79',cssTarget:'chrome79',entrySHA256:crypto.createHash('sha256').update(html).digest('hex'),
    scriptHashes:scripts.map(hash),styleHash:hash(css)
  },null,2)+'\n');
  console.log('Built offline entry with Chrome 79 targets and hash-only CSP');
})().catch(e=>{console.error(e);process.exit(1);});
