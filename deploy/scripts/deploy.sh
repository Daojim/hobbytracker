#!/usr/bin/env bash
#
# Pull and redeploy.
#
#   ./scripts/deploy.sh
#
# Deliberately something you run rather than something that happens. A rebuild drops the app for a
# few seconds, and deploying every push unattended spends the review a pull request was for.
#
# The whole body is wrapped in a function on purpose: this script copies a newer version of itself
# into place as part of its job, and bash reads a script incrementally as it runs it. Wrapping
# forces the entire file to be parsed before a line of it executes, so overwriting it mid-run is
# safe rather than a source of one baffling failure a year.

set -euo pipefail

main() {
	cd "$(dirname "${BASH_SOURCE[0]}")/.."

	# Reads one key out of .env without letting the shell interpret it -- see backup.sh, where a
	# semicolon in ALLOWED_HOSTS ran `localhost` as a command.
	debug_port="$(sed -n 's/^DEBUG_PORT=//p' .env 2>/dev/null | head -n 1)"
	debug_port="${debug_port:-8081}"

	# A clone with local edits is somebody debugging on the server, and pulling over that either
	# fails halfway or silently discards their work. Refuse and say what is in the way.
	if [ -n "$(git -C app status --porcelain)" ]; then
		echo "app/ has local changes; refusing to deploy over them:" >&2
		git -C app status --short >&2
		exit 1
	fi

	before="$(git -C app rev-parse --short HEAD)"

	# --ff-only, so a clone that has diverged stops here rather than inventing a merge commit on a
	# server nobody is watching.
	git -C app pull --quiet --ff-only
	after="$(git -C app rev-parse --short HEAD)"

	if [ "$before" = "$after" ]; then
		echo "already at $after -- nothing new upstream, redeploying anyway"
	else
		echo "$before -> $after"
		git -C app log --oneline "$before..$after" | sed 's/^/  /'
	fi

	# compose.yml is a copy, so a change to it in the repository reaches the server only by being
	# copied again. Done before the deploy, because it is what the deploy reads.
	cp app/deploy/compose.yml ./compose.yml

	docker compose --profile tunnel up -d --build

	# Up is not the same as answering. Without this a container that starts and immediately falls
	# over reads as a successful deploy.
	printf 'waiting for the api'
	for _ in $(seq 1 30); do
		if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$debug_port/api/auth/me")" = "200" ]; then
			echo " -- ok"
			echo "deployed $after"

			# Last, and only once everything else worked: this overwrites the script that is
			# running. See the note at the top for why that is safe here.
			cp app/deploy/scripts/*.sh scripts/
			chmod +x scripts/*.sh
			return 0
		fi
		printf '.'
		sleep 2
	done

	echo >&2
	echo "the api never answered on 127.0.0.1:$debug_port -- deploy did NOT complete cleanly" >&2
	echo "  docker compose logs api --tail 50" >&2
	exit 1
}

main "$@"
