/**
 * Runs the API for local testing with no PostgreSQL installation: `npm run dev:local`.
 *
 * On first run it creates .env, a private database and the demo data. Later runs reuse them,
 * so anything you change is still there next time. Only for development.
 */
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Kept out of the project folder, because cloud sync such as OneDrive can corrupt a live database.
const DATA_DIR = process.env.DOKAN_DEV_DB_DIR || path.join(os.homedir(), '.dokan-dev-db')
const DB_PORT = 54329
const DB_NAME = 'dokan'
const DB_USER = 'postgres'
const DB_PASSWORD = 'postgres'

const connection = (database) => ({ host: 'localhost', port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database })

async function withClient(database, work) {
  const client = new pg.Client(connection(database))
  await client.connect()
  try {
    return await work(client)
  } finally {
    await client.end()
  }
}

function ensureEnvFile() {
  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) return
  const secret = crypto.randomBytes(48).toString('hex')
  const template = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8')
  fs.writeFileSync(envPath, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`))
  console.log('Created .env')
}

/** Starts the database, unless an earlier run left it going. Returns it if this run started it. */
async function startDatabase() {
  const running = await withClient('postgres', () => true).catch(() => false)
  if (running) {
    console.log(`Database already running on port ${DB_PORT}`)
    return null
  }

  const database = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    // The ৳ symbol is stored in the database, so the default Windows encoding will not do.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: () => {},
  })
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('Creating the database (first run only)...')
    await database.initialise()
  }
  await database.start()
  console.log(`Database started on port ${DB_PORT}`)
  return database
}

async function ensureDatabaseExists() {
  await withClient('postgres', async (client) => {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME])
    if (!rowCount) await client.query(`CREATE DATABASE ${DB_NAME} ENCODING 'UTF8' TEMPLATE template0`)
  })
}

function runNode(args, env) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`"node ${args.join(' ')}" failed.`)
}

async function main() {
  ensureEnvFile()
  const database = await startDatabase()
  await ensureDatabaseExists()

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    DEMO_LOGIN: 'true',
    DATABASE_URL: `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public`,
    PRISMA_HIDE_UPDATE_MESSAGE: 'true',
  }

  runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy'], env)

  const users = await withClient(DB_NAME, (client) => client.query('SELECT COUNT(*)::int AS count FROM "User"'))
  if (users.rows[0].count === 0) runNode(['src/utils/seed.js'], env)

  // No --watch: cloud sync such as OneDrive touches files, which would restart the API mid-test.
  const api = spawn(process.execPath, ['src/server.js'], { cwd: ROOT, env, stdio: 'inherit' })

  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    api.kill()
    await database?.stop().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  api.on('exit', stop)
}

main().catch((error) => {
  console.error(`\nCould not start: ${error.message}`)
  process.exit(1)
})
