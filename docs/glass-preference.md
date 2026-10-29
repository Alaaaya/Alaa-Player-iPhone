# Glass preference migration

Glass defaults OFF, including the static HTML before scripts run. Startup never
writes a default preference. The setting can still enable glass when supported.

Repository history was checked before migration. The former `ap-glass` writers
in `7027adc`, `307e021` and `bdfcac1` write only from the user's toggle handler,
not from startup. Consequently `1`/`0` and earlier `on`/`off` are distinguishable
explicit choices and are preserved. A missing value means never chosen and is
now OFF. Unrecognised strings, including `true`/`false`, are not promoted into
explicit choices. There is no historical auto-written `true` to preserve.

`ap-glass-choice` stores the explicit choice as `1` or `0` and takes precedence.
Known legacy choices are migrated once into this key. New clicks write both keys
for backward compatibility. Neither a startup default nor feature detection
creates an interaction marker. Unsupported CSS applies OFF without overwriting
a remembered ON preference. Storage errors degrade to an in-session preference.

OFF uses solid translucent backgrounds and disables both backdrop-filter spellings
throughout player descendants and pseudo-elements. Live bar/controls never blur;
the separate channel overlay follows the preference in all themes.

`tests/glass133-default.cjs` exercises fresh/unchosen/unknown/legacy explicit/marked
preferences, actual setting clicks, and full Chromium process restarts, with
computed-style assertions for movie, episode, and live states in all four themes.
These checks do not constitute real LG hardware verification.
