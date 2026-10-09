#!/bin/sh
# Writes the maintenance switch read by index.html (see frontend/src/maintenance.tsx),
# then serves the static build. Toggled from Coolify with MAINTENANCE=true, no rebuild
# needed; MAINTENANCE_PREVIEW_CODE lets testers in with ?preview=<code>. BANNER_MESSAGE
# shows a closable banner on top of the app (see frontend/src/Banner.tsx).
if [ "$MAINTENANCE" = "true" ]; then
  hash=""
  if [ -n "$MAINTENANCE_PREVIEW_CODE" ]; then
    hash=$(printf '%s' "$MAINTENANCE_PREVIEW_CODE" | sha256sum | cut -d' ' -f1)
  fi
  echo "window.MAINTENANCE = { previewCodeHash: '$hash' };" > dist/maintenance.js
else
  echo "window.MAINTENANCE = null;" > dist/maintenance.js
fi
# Banner shown on top of every page (empty: no banner). JSON.stringify escapes the message.
node -e 'process.stdout.write("window.BANNER_MESSAGE = " + JSON.stringify(process.env.BANNER_MESSAGE || "") + ";\n")' >> dist/maintenance.js
exec serve -s dist -l 4000
