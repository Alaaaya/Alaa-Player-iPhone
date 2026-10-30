from pathlib import Path
import zipfile,plistlib,json,hashlib
p=Path('/home/kit/player-ipa');old=p/'Alaa-Player-2.5-unsigned.ipa';out=p/'Alaa-Player-2.6.7-unsigned.ipa';prefix='Payload/AlaaPlayer.app/'
with zipfile.ZipFile(old) as src,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as dst:
 for entry in src.infolist():
  if entry.filename.startswith(prefix+'www/') or '_CodeSignature/' in entry.filename or entry.filename.endswith('embedded.mobileprovision'):continue
  data=src.read(entry.filename)
  if entry.filename==prefix+'Info.plist':
   pl=plistlib.loads(data);pl['CFBundleShortVersionString']='2.6.7';pl['CFBundleVersion']='265';pl['CFBundleDisplayName']='Alaa Player';pl['CFBundleName']='Alaa Player';pl['CFBundleIcons']={'CFBundlePrimaryIcon':{'CFBundleIconFiles':['AppIcon-60'],'UIPrerenderedIcon':True}};pl['CFBundleIcons~ipad']={'CFBundlePrimaryIcon':{'CFBundleIconFiles':['AppIcon-60','AppIcon-76','AppIcon-83.5'],'UIPrerenderedIcon':True}};pl['CFBundleIconFiles']=['AppIcon-60'];data=plistlib.dumps(pl,fmt=plistlib.FMT_BINARY)
  dst.writestr(entry,data)
 for f in (p/'ios/Assets.xcassets/AppIcon.appiconset').glob('*.png'):dst.write(f,prefix+f.name)
 for f in (p/'dist').rglob('*'):
  if f.is_file():dst.write(f,prefix+'www/'+str(f.relative_to(p/'dist')))
with zipfile.ZipFile(out) as z, zipfile.ZipFile(old) as oldz:
 assert z.testzip() is None
 assert z.read(prefix+'AlaaPlayer')==oldz.read(prefix+'AlaaPlayer')
 assert z.read(prefix+'www/index.html')==(p/'dist/index.html').read_bytes()
 pl=plistlib.loads(z.read(prefix+'Info.plist'));assert pl['CFBundleShortVersionString']=='2.6.7'
 assert all('Landscape' in a for a in pl['UISupportedInterfaceOrientations'])
 for e in oldz.namelist():
  if not e.startswith(prefix+'www/') and e!=prefix+'Info.plist':assert z.read(e)==oldz.read(e),e
 result={'version':'2.6.7','sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'nativeBinaryUnchanged':True,'nativeFrameworksUnchanged':True,'packaging':'updated web resources and Info.plist of owner-tested unsigned 2.5; no native rebuild','uiVerification':'Playwright WebKit landscape 932x430 and 844x390, all 9 themes, all themes, home + player assertions, 0 page errors','iOSSimulatorVerified':False}
 (p/'artifacts/ipa261-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
