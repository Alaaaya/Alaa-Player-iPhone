# Alaa Player for LG webOS
Independent web app port, com.alaa.player.webos 1.0.0. Android source was read only, not modified.
Reference source /home/kit/Alaa-Player-2 at 858e09f8. Android AGENTS.md and graph report read before inspection.
No installation, TV mutation, production RPC, or panel activation was performed.

## Included
Panel pairing matches Android register_device / get_device_config RPCs and public anon role.
Fresh persistent 8-character cryptographic device code, displayed grouped as 4-4.
MAC field is explicitly webOS-CODE, not claimed to be hardware MAC.
Inactive/expired panel playlists are removed. Removed assignments are cleared and changed configurations reloaded on refresh.
Active expiry checked every minute; refresh at startup, manually and every 30 minutes.
Direct M3U and Xtream session login supported independently of activation.
M3U channels, Xtream live TV, movies, series and season/episode navigation.
Vertical category and content rows, search, 75-row paging for bounded DOM, remote geometric focus.
Native HTML5 video; Xtream live uses HLS .m3u8; direct M3U .ts gets video/mp2t.
Full-screen playback, Back, retry, pause/play, VOD ±30 second seek, media remote keys.
Visibility change stops playback; Back removes video sources to release resources.
Classic default palette copied from Android AppColors.ClassicPalette. Three-column category/list/detail composition.
No EPG.

## Honest gaps vs Android
This is an initial functional web rewrite, NOT pixel-identical Android UI or all-feature equivalence.
Only Classic styling included, not Android's alternate themes or exact Compose typography/layout/art.
No Stalker portal, EPG, catch-up, DVR/recording, downloads, cast, Android updater, favorites, playback history/resume,
parental/PIN protection, subtitles/audio-track selection UI, Android provider transport profiles/custom request headers,
encrypted offline provider cache or Android's Media3 recovery/format fallback.
M3U entries are shown in Live TV; M3U VOD/series classification is not inferred.
Xtream provides proper separate movies and series catalogue.
All catalogues parse in memory with a 24 MiB response limit. Pagination bounds DOM, not catalogue RAM.
Remote hardware, LG app-origin CORS/TLS/mixed-content policy and actual streams are UNTESTED.
There is no root proxy or disabled web security. A provider without browser CORS may fail even if Android works.
Native HLS/MP4 compatibility depends on the actual codec/container/provider. Direct TS may fail on webOS.
No transmux/transcode, hls.js, DRM license support, or promise that all Android-playable streams play on LG.
UI/browser source-routing tests mock HTMLMediaElement load/play/pause. They DO NOT validate actual playback,
frame progress, audio, decode speed, long-running streams, performance or recovery on hardware.
Offline panel error keeps current in-memory state; credentials are never persisted in browser storage.
No encrypted offline cache is available. Reloading loses direct credentials and catalogues.
Device code remains localStorage only. Clearing app data produces a new panel identity.
Tests use all mocked providers and mocked panel responses. Sample programme titles do not imply supplied content.

## Build and test
npm run check
npm run test:ui
npm run package

Packaging currently uses the existing, pinned @webos-tools/cli 3.2.6 installation in
/home/kit/alaa-tv-webos/node_modules/.bin/ares-package. For a standalone copy, install that version locally.
Tests use existing Playwright in /home/kit/tvp-valet with WebKit and /opt/hako/bin/google-chrome.
No runtime dependency, remote fonts, background artwork, CSS blur, framework, CDN or extra player engine.
The public panel anon key is the same RLS-protected public client key already shipped in Android, NOT a
service-role token. Source generation asserts anon role. No admin credentials are packaged.

## Install after owner review
Use webOS Dev Manager or existing rooted-TV app installer to install
artifacts/com.alaa.player.webos_1.0.0_all.ipk.
Launch Alaa Player from the LG applications menu, open the existing panel in a browser and activate
the NEW displayed code, then assign an authorized playlist and select Refresh connection.
This is a separate app and identity, not a replacement for Android Alaa Player or the LG launcher.
No default Home, root, ads, system services or other installed apps are changed.
First hardware acceptance must test activation, real channels for at least two minutes with changing
frames/audio, multiple channels, Back, pause, movies, episode navigation and CORS errors.
If unsuccessful, uninstall only com.alaa.player.webos from the normal LG app manager.

## Evidence
22 core tests, 60 browser assertions across WebKit and Chrome, screenshots with mocked fixtures.
artifacts/ui-results.json reports the test boundary.
artifacts/live-webkit.jpg, movies-webkit.jpg and connection-webkit.jpg are mock UI previews, not TV photos.
Official LG documentation reviewed 2026-10-25; chub had no webOS documentation matching the query.
https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm
https://webostv.developer.lge.com/develop/guides/mediaoption-parameter
LG lists native HLS and HTTP/HTTPS; specifies HLS tag restrictions, matching audio/video segment durations,
and platform-dependent format support. This port does not override those limitations.

## webOS compatibility build (1.2.4)

Run npm ci, npm run check, then npm run package. The packager now consumes
dist, not the unprocessed app directory. Build-time esbuild and Lightning CSS
both target Chrome 79. The generated entry embeds styles, Cairo fonts and all
four classic scripts. This removes external CSS/JS loading and file-origin CSP
self matching as startup dependencies. Scripts/styles have exact SHA-256 CSP
allowlist hashes; arbitrary inline scripts and eval remain forbidden. Network
provider permissions and asset URLs are unchanged. No provider data or keys
were changed.

The reported physical-TV failure was NOT reproducible with the original 1.2.3
entry on desktop Chromium 87.0.4279.0, including file origin. Consequently this
is a compatibility-hardening fix, not a confirmed root-cause diagnosis or a
claim that the real LG issue is resolved.

For reproducible file-origin tests, set CHROMIUM_87 to a Chromium 87 executable
and PLAYWRIGHT_87 to a Playwright 1.40.1 installation, then npm run test:compat.
Do not substitute a user-agent override for a real old engine. The older test
driver avoids modern Playwright checkVisibility requirements. Mocks explicitly
supply CORS preflight headers for the opaque file origin. Media playback and
panel replies are fixtures, not a real-provider or physical-TV test.

## 1.2.5 real-TV follow-up

Owner confirmed 1.2.4 renders on the LG. Removed reference-nav/foundation
pictures that contained duplicate labels, replacing the sidebar with real
buttons and a red in-place focus state. Category artwork is clipped above its
baked-in fake counts; real counts occupy their own bottom strip.

Remote navigation handles LG numeric key codes explicitly (including when key
is Unidentified). Sidebar OK opens the section, Right enters current content,
Up/Down traverse sidebar, content Left returns to selected sidebar item, and
461 returns a section to Home. Organization long-press handling is preserved.

VOD/series fetch independently; category metadata failures no longer discard
the stream list. Large VOD/series responses allow 96 MiB instead of 24 MiB.
Failures now render an error/retry state, not a false empty-library message.
M3U-only libraries explicitly explain their limitation. No public CORS proxy,
credential forwarding or disabling web security was introduced. We cannot
claim the owner's actual provider is fixed without another real-TV test or
its diagnostic response; blocked provider access is reported truthfully.

tests/remote125.cjs runs against real Chromium 87 file origin with mocked
provider replies, numeric-only remote events and 57 checks. Covers movie
HTTP failure while series succeeds, retry recovery despite failed movie
categories, visible counts without overlap, sidebar/content navigation,
favorites and move persistence. Screenshots are in artifacts/*1.2.5*.png.

The additional LG Live report exposed an actual focus-loss race: the scroll
handler rebuilt virtual rows after remote focus moved, deleting the focused
button. It now leaves the current virtual window intact while its focused row
is valid. Live navigation explicitly traverses sidebar, categories, filters,
channels and preview controls. Vertical navigation stays within each column;
Back steps left a column before returning Home. Numeric OK activates controls
without browser default focus behavior. Header icons use SVG, avoiding missing
font glyphs. A one-time 1.2.5 migration selects the requested red theme; later
manual theme choices are preserved. Chrome87 remote suite now has 72 checks,
including virtual scrolling, preview activation, series detail and settings.

Continuous-list follow-up removes the Live pager completely. Main channel
list and playback channel overlay use 24-row windows with spacers and wrap
across the whole filtered category. The remote suite traverses all 356
category entries in both views and verifies bounded DOM size, focus retention
and visibility. Provider logos are eager, no-referrer images with initials
fallback on failure; relative Xtream logo paths resolve against the provider.
No HTTPS rewrite/proxy or security bypass is used. Real Chromium87 file origin
tests cover HTTP logo success and HTTP404 initials fallback. A provider that
blocks its own images may still fall back; actual LG logo availability needs
a TV retest. Total Chromium87 suite is now 103 checks.

## Real-provider LG large-catalog fix (1.2.6)

Movies and series now fetch their Xtream category index, then fetch titles
only with category_id. Selecting a category replaces the previous title
window rather than merging the entire provider library. Home previews load
one category per media kind sequentially, avoiding concurrent huge JSON
responses on low-memory TVs. Home preview counts are loaded samples, not
provider-wide totals. Live uses only get_live_streams. M3U /movie/ and /series/
URL paths are classified into their corresponding sections instead of Live.

Tested the application with the owner-provided real provider in Chromium87
file origin, with --disable-web-security ONLY in the private diagnostic
harness. Movies: 438 categories, tested first populated category 113 titles.
Series: 370 categories, tested first populated category 8 titles. App Home,
Movies and Series rendered real catalog entries; screenshots real-provider-
{home,movies,series}-126.png. No credentials in source or committed fixtures.
Production security is unchanged. Physical LG retest remains required.

Home remote follow-up: hero Watch Now opens the actual selected catalog item,
and hero artwork prefers provider backdrop/logo. Home has one search field
(the same field is moved to the catalog header, never duplicated).
Directional rows explicitly cover search, hero controls/slides, all six
category tiles, movie View All/cards and series View All/cards. Left moves
within rows before returning to sidebar; Up/Down traverses rows and scrolls
focused items into view. Keyboard-only Chromium87 page audit now31checks.

1.2.7 adds a real-provider five-title hero alternating series/movies, provider
backdrop or cover, title and bounded plot snippet loaded from detail metadata.
Hero arrows/dots and Watch Now target the actual selected item. Nine-second
rotation pauses during hero action focus. Static hero is fallback only.
Empty initial VOD categories are skipped until populated, category-specific
requests remain separate from Live. Playback pipeline was intentionally
unchanged: real LG playback was confirmed by the owner on 1.2.4; desktop
Chromium87 codec failure is not proof of an LG regression.

### Persistent catalog cache in 1.3.1

IndexedDB stores provider-scoped catalog responses and the home presentation snapshot. Startup hydrates the last valid provider configuration and home rows before network synchronization. Cached categories and lists are returned immediately; responses older than 12 hours refresh silently. VOD and series requests now use the same cache path and the correct `category_id` query parameter. Xtream returns a category list in one response, so the entire category response, including its first visible page, is retained.

Idle prefetch visits every live, movie and series category with one background catalog request at a time, pauses during playback/hidden screens, and retains existing records if storage fills. It no longer deletes an arbitrary record after 150 responses. Writes await transaction completion. Foreground navigation can still request a category which has not finished prefetching. A provider timeout or quota exhaustion may leave that category uncached; open it online to retry on a later session.

A first-ever installation cannot display remote catalogs offline. Allow activation and initial prefetch to complete online first. An offline restart can browse cached home, lists and categories, but streaming itself still requires the provider connection. Movie/episode details are available offline only when fetched previously. Expired saved panel configurations do not restore managed providers. A successful panel response replaces the saved configuration, including revocations.

Artwork URLs are retained in cached records. Browser image-cache warming is bounded to 120 unique images, one at a time, with a four-second timeout. This is not an offline image archive; webOS/browser eviction and provider cache headers can remove artwork. Local fallback art remains available. Provider configuration and stream URLs remain private local app data and must not be included in shared test logs.

`node tests/offline-cache131.cjs dist artifacts/cache131/offline.json` exercises persistent Chromium 87 process restarts, whole-network offline browsing, the fresh 12-hour rule, stale background refresh concurrency, retention above 150 records, quota failures and an empty offline installation.

### 1.3.1 Home and theme behavior

Home category tiles open inline content immediately below the tiles without replacing the Home route or hero. Live has a vertical channel list; Movies and Series have poster grids. Categories filter inline, and Back returns focus to the selected tile. Kids, News and Sports match corresponding provider category names; providers without matching categories show an empty state. Sidebar routes remain independent.

Settings offers Apple Graphite, Navy / Red, Red / Black and Blue. Apple is the default only when a valid saved choice is absent. Existing valid `ap-theme` choices are read without migration or reset, and explicit changes persist. The same palette applies to Home inline content, catalogs, movie details, episode grids, Settings, player chrome and the OK channel overlay.

`node tests/themes-routes131.cjs dist artifacts/cache131/themes-routes.json` checks all four palettes across routes and the channel overlay, saved-choice reloads, and an unset Apple default at 1920x1080 and 1280x720. `tests/home-inline131.cjs` checks all six inline tiles and their remote navigation; `tests/offline-cache131.cjs` additionally checks inline Home after a fully offline browser-process restart. The old `apple-only131.cjs` command now delegates to the current four-theme contract.
