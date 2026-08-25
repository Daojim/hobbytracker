#!/usr/bin/env bash
#
# Dumps the database somewhere that is not the disk the database is on.
#
#   ./scripts/backup.sh
#
# From cron, nightly:
#   30 4 * * * /path/to/hobbytracker/scripts/backup.sh >> /path/to/backup.log 2>&1
#
# BACKUP_DIR comes from .env and must be on a different physical disk from pgdata. A backup that
# dies with the disk it was protecting against is not a backup, and the whole reason to say this
# out loud is that a default under the compose directory would look like it worked.

set -euo pipefail

# Everything runs from the compose directory: `docker compose` needs to find compose.yml, and
# BACKUP_DIR is read from the .env sitting beside it.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	. ./.env
	set +a
fi

BACKUP_DIR="${BACKUP_DIR:?set BACKUP_DIR in .env, on a different disk from the database}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-14}"
DB_NAME="${POSTGRES_DB:-hobbytracker}"
DB_USER="${POSTGRES_USER:-hobbytracker}"

mkdir -p "$BACKUP_DIR"
target="$BACKUP_DIR/hobbytracker-$(date +%Y-%m-%d_%H%M%S).sql.gz"

# Written under a partial name and moved into place only once it is whole, so a dump interrupted
# half way never sits in the directory looking exactly like a good one. pipefail is what makes
# pg_dump failing mid-stream fail the script rather than leaving a truncated gzip.
docker compose exec -T db pg_dump --username "$DB_USER" --dbname "$DB_NAME" \
	| gzip > "$target.partial"

# Cheap, and it catches the one failure the exit codes above cannot: a stream that gzip finished
# writing but that is not intact on disk.
gzip --test "$target.partial"
mv "$target.partial" "$target"

# Pruned only after the new one is safely down. The other order is how a bad night takes the
# backups with it.
find "$BACKUP_DIR" -name 'hobbytracker-*.sql.gz' -type f -mtime "+$RETAIN_DAYS" -delete

echo "$(date -Is)  wrote $target  ($(du -h "$target" | cut -f1))"
