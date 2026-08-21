import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The end-to-end database, which is deliberately not the one you use.
 *
 * These tests truncate between cases, and the development database holds the games you actually
 * logged. Pointing the API at `hobbytracker_e2e` for the duration costs one environment variable
 * and makes it impossible for a test run to delete your backlog.
 */
export const E2E_DATABASE = 'hobbytracker_e2e';

export const CONNECTION_STRING =
  `Host=localhost;Port=5432;Database=${E2E_DATABASE};Username=admin;Password=password`;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Runs SQL through the docker-compose Postgres, which is the only one there is locally. */
export function psql(sql: string, database = E2E_DATABASE): string {
  return execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
}

/**
 * Wipes what the tests write, and nothing else.
 *
 * `hobby_lu` and `source_lu` are left standing on purpose. They are migration-managed reference
 * data whose ids are part of the schema contract — the backend suite tells Respawn to ignore
 * them for the same reason, and wiping them surfaces later as baffling foreign-key failures
 * rather than as an empty table.
 */
export function resetDatabase(): void {
  psql('TRUNCATE log_entries, games, media RESTART IDENTITY CASCADE;');
}
