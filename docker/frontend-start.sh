#!/bin/sh
# Writes the maintenance switch read by index.html (see frontend/src/maintenance.tsx),
# then serves the static build. Toggled from Coolify with MAINTENANCE=true, no rebuild
# needed; MAINTENANCE_PREVIEW_CODE lets testers in with ?preview=<code>.
if [ "$MAINTENANCE" = "true" ]; then
  hash=""
  if [ -n "$MAINTENANCE_PREVIEW_CODE" ]; then
    hash=$(printf '%s' "$MAINTENANCE_PREVIEW_CODE" | sha256sum | cut -d' ' -f1)
  fi
  echo "window.MAINTENANCE = { previewCodeHash: '$hash' };" > dist/maintenance.js
else
  echo "window.MAINTENANCE = null;" > dist/maintenance.js
fi
exec serve -s dist -l 4000
