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

# Everything runs from the compose directory: `docker compose` needs to find compose.yml, and the
# settings below are read from the .env sitting beside it.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Reads one key out of .env WITHOUT letting the shell interpret the file.
#
# This is the whole reason there is a function rather than `set -a; . ./.env`. That file is
# docker-compose syntax, not shell, and a value there may legitimately contain `;`, `#`, a space
# or a `$` -- none of which survive being sourced. ALLOWED_HOSTS carries a semicolon so that the
# loopback debugging handle works, and sourcing it ran `localhost` as a command and took this
# script out on its first run.
env_value() {
	[ -f .env ] || return 0
	sed -n "s/^$1=//p" .env | head -n 1
}

BACKUP_DIR="$(env_value BACKUP_DIR)"
: "${BACKUP_DIR:?set BACKUP_DIR in .env, on a different disk from the database}"

RETAIN_DAYS="$(env_value BACKUP_RETAIN_DAYS)"
DB_NAME="$(env_value POSTGRES_DB)"
DB_USER="$(env_value POSTGRES_USER)"

# The same defaults the compose file applies, so the two cannot disagree about what to dump.
RETAIN_DAYS="${RETAIN_DAYS:-14}"
DB_NAME="${DB_NAME:-hobbytracker}"
DB_USER="${DB_USER:-hobbytracker}"

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
