# Featured exchange, Player 1.1.7

No visual redesign. Player exports using the rooted Homebrew Channel exec API.
The only destination is /media/developer/alaa-player-featured.json.
UTF-8 JSON is limited to 24,576 bytes, with at most 12 latest eligible items,
sorted by provider added/last_modified descending across movies and series.

Schema:
{"version":1,"items":[{"title":"Example","artwork":"https://image.tmdb.org/t/p/w500/example.jpg","type":"movies","id":"123"}]}

Only these four item keys are exported. No provider object, server, stream URL,
credentials, device code, activation data, description, or playback URL.
IDs use 1–128 ASCII letters, digits, underscore or hyphen; title is bounded to
240 characters. Missing/unsafe artwork means omission, not a provider fallback.
Artwork must be HTTPS, with no userinfo, port, query or fragment, on one of
image.tmdb.org, images.metahub.space, assets.fanart.tv, m.media-amazon.com,
ia.media-imdb.com. Only JPG/JPEG/PNG/WebP paths qualify. Provider-hosted images,
credential segments and provider stream/API paths are rejected, including
double-encoded path segments. This intentionally excludes unknown image hosts.
Artwork is referenced, never downloaded by the exporter.

The write uses UTF-8 base64, a fixed-directory mktemp, chmod 0644, then atomic mv.
No item data becomes shell syntax. A serial writer invalidates obsolete queued
exports. An empty version-1 document is written on startup and before loading
a replacement provider; panel removal, expiry and changed assignments clear it.
Old provider catalog completions cannot export after a switch.

Launcher calls com.alaa.player.webos with:
{"featured":{"type":"movies","id":"123"}}
or type "series". No URL is accepted. The featured object must have only type/id.
webOSLaunch and webOSRelaunch event detail, plus initial PalmSystem.launchParams,
are accepted. The latest valid pending request waits until the current provider
catalogs are ready, then resolves against that provider only and opens details.
It never starts playback. Missing IDs are dropped. Provider switches clear pending
requests; the initial request survives initial provider selection.

Missing root/bridge, refused permission, failed export and timeouts do not block
normal Player use. Exports are not persisted in browser storage. No service,
privilege escalation, root setup, system setting or launcher files are installed.
The package still needs actual rooted-LG launch/export acceptance; all bridge,
provider and media browser tests use mocks.

References checked 2026-10-25:
https://raw.githubusercontent.com/webosbrew/webos-homebrew-channel/main/README.md
https://webostv.developer.lge.com/develop/references/webostvjs-webosdev
https://webostv.developer.lge.com/develop/references/webos-event
