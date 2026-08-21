/**
 * Brings the end-to-end database into existence and up to date, then gets out of the way.
 *
 * Chained ahead of `dotnet run` rather than run from Playwright's globalSetup, because Playwright
 * starts its web servers first: the API would boot, be asked for a readiness check, and answer
 * from a database that did not exist yet.
 *
 * Migrations rather than a schema dump, for the same reason the backend suite uses them — the
 * partial unique index, the check constraints and the seeded lookup rows are expressed in
 * migrations, and a schema built any other way is not the schema production runs.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const connectionString = process.env.ConnectionStrings__HobbyTracker;
if (connectionString === undefined) {
  throw new Error('ConnectionStrings__HobbyTracker must name the end-to-end database.');
}

const database = /Database=([^;]+)/.exec(connectionString)?.[1];
if (database === undefined) {
  throw new Error(`No Database= in the connection string: ${connectionString}`);
}

const psql = (sql, target) =>
  execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'admin', '-d', target, '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();

if (psql(`SELECT 1 FROM pg_database WHERE datname = '${database}'`, 'postgres') !== '1') {
  psql(`CREATE DATABASE ${database}`, 'postgres');
  console.log(`created ${database}`);
}

execFileSync(
  'dotnet',
  [
    'ef', 'database', 'update',
    '--project', 'backend/src/HobbyTracker.Api',
    '--startup-project', 'backend/src/HobbyTracker.Api',
  ],
  { cwd: repoRoot, stdio: 'inherit', env: process.env },
);
