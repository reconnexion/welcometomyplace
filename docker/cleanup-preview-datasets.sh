#!/bin/bash

# Removes the Fuseki datasets left behind by the pull request previews that
# Coolify has already torn down. Coolify deletes the preview containers when a
# PR is closed, but the datasets the backend created in the shared Fuseki
# (`<prefix>-backend-pr-<n>` and `settings-<prefix>-backend-pr-<n>`) stay.
#
# Fuseki datasets must never be deleted through the admin API (it leaves the
# store in a broken state), so this script stops Fuseki, removes the dataset
# files, and starts it again. That interrupts every app using the shared
# Fuseki for ~10 seconds, hence it only runs at night (Europe/Paris), from a
# cron on the Coolify server:
#
#   0 4 * * * /ABSOLUTE_PATH_TO/cleanup-preview-datasets.sh >> ~/cleanup-preview-datasets.log 2>&1
#
# A dataset is kept as long as any container on the host (running or not)
# still declares it in SEMAPPS_MAIN_DATASET or SEMAPPS_AUTH_ACCOUNTS_DATASET_NAME.
# Only datasets whose name ends with `-pr-<n>` are candidates.
#
#   DRY_RUN=1  lists what would be removed without stopping anything.
#   FORCE=1    bypasses the night-time check.

set -euo pipefail

PATH=/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bin

FUSEKI_CONTAINER="${FUSEKI_CONTAINER:-fuseki-m59x3eqz0wb4bc6j3mpadqkh}"
DRY_RUN="${DRY_RUN:-0}"
FORCE="${FORCE:-0}"

hour=$(TZ=Europe/Paris date +%H)
if [ "$FORCE" != 1 ] && [ "$DRY_RUN" != 1 ] && { [ "$hour" -lt 1 ] || [ "$hour" -gt 5 ]; }; then
  echo "It is ${hour}h in Paris: this script only runs between 1h and 6h (set FORCE=1 to override)."
  exit 1
fi

volume=$(docker inspect "$FUSEKI_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/fuseki"}}{{.Name}}{{end}}{{end}}')
if [ -z "$volume" ]; then
  echo "Cannot find the /fuseki volume of container $FUSEKI_CONTAINER"
  exit 1
fi

# Datasets still declared by a container, whatever its stack and state
used=$(docker ps -aq | xargs -r docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^SEMAPPS_(MAIN_DATASET|AUTH_ACCOUNTS_DATASET_NAME)=' | cut -d= -f2- | sort -u)

# Datasets known to Fuseki, from their configuration files
all=$(docker run --rm -v "$volume":/fuseki:ro alpine sh -c 'cd /fuseki/configuration && ls *.ttl' | sed 's/\.ttl$//')

orphans=()
for ds in $all; do
  [[ "$ds" =~ -pr-[0-9]+$ ]] || continue
  grep -qxF "$ds" <<<"$used" || orphans+=("$ds")
done

if [ ${#orphans[@]} -eq 0 ]; then
  echo "No orphan preview dataset."
  exit 0
fi

echo "Orphan preview datasets: ${orphans[*]}"
if [ "$DRY_RUN" = 1 ]; then
  exit 0
fi

# Files to remove: the TDB2 database (plus the Acl and Mirror ones of a secure
# dataset) and the configuration file
paths=()
for ds in "${orphans[@]}"; do
  paths+=("databases/$ds" "databases/${ds}Acl" "databases/${ds}Mirror" "configuration/$ds.ttl")
done

echo "Stopping Fuseki..."
docker stop "$FUSEKI_CONTAINER" > /dev/null
trap 'docker start "$FUSEKI_CONTAINER" > /dev/null' EXIT

docker run --rm -v "$volume":/fuseki alpine sh -c "cd /fuseki && rm -rf ${paths[*]}"

echo "Starting Fuseki..."
docker start "$FUSEKI_CONTAINER" > /dev/null
trap - EXIT
for i in $(seq 1 30); do
  docker exec "$FUSEKI_CONTAINER" curl -sf http://localhost:3030/\$/ping > /dev/null 2>&1 && break
  sleep 2
done

echo "Removed ${#orphans[@]} dataset(s), cron job finished at $(date)"
