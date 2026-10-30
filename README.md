# Alaa Player for iPhone and iPad

Native iOS shell (WKWebView + VLCKit) around the Alaa Player web app. Version 2.6 (build 26), bundle id `com.alaa.player.web`, landscape only.

## What is inside
- `app/` – the shared Alaa Player web UI (live TV, movies, series, panel pairing, Xtream and M3U).
- `app/touch.js` / touch styles in `app/style.css` – the touch layer used on iPhone and iPad.
- `design/touch-lux.py` – generator for the luxury touch player (gold glass dock, SVG icons, short localized labels). Run `python3 design/touch-lux.py`, then replace the block that starts with `/* Touch luxury pass` at the end of `app/style.css` with `design/touch-lux.css`.
- `ios/Sources/App.swift` – the native app: WKWebView, the `nativeFetch` HTTP bridge (no CORS problems with IPTV servers) and the VLCKit player for movies and episodes. Live channels stay in WebKit.
- `ios/Sources/Assets.xcassets` – the app icon.
- `ios/project.yml` – XcodeGen project.

## Build
```
npm ci
npm run check
npm run build
cp -R dist ios/www
cd ios && xcodegen generate
xcodebuild -project AlaaPlayer.xcodeproj -scheme AlaaPlayer -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```
GitHub Actions builds an unsigned IPA (`Alaa-Player-2.6-unsigned`). The IPA must be signed (AltStore, Sideloadly, or your own Apple developer certificate) before it installs on a device.

## Known limits
- Streams that VLC cannot open will not play; live channels use the system player.
- No EPG, catch-up or recording.
- The CI needs macOS runner minutes on the GitHub account; if jobs fail instantly with a billing message, fix it under GitHub Settings → Billing and plans.
