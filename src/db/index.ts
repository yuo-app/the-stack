import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import { isServer } from 'solid-js/web'
import { clientEnv } from '~/env/client'
import { copyDBFile, syncDevDb } from './dev-db'
import * as localSchema from './schema/local'

// let _remoteDb: LibSQLDatabase<typeof remoteSchema> | null = null

interface ClientDb extends SqliteRemoteDatabase {
  connect: () => Promise<SqliteRemoteDatabase>
}

let _localDb: SqliteRemoteDatabase<typeof localSchema> | null = null
let _sql: any = null

export const localDb = new Proxy({} as ClientDb & typeof localSchema, {
  get(_, prop) {
    if (prop === 'connect')
      return connect

    if (Object.prototype.hasOwnProperty.call(localSchema, prop))
      return Reflect.get(localSchema, prop)

    if (!_localDb)
      throw new Error('Database not initialized. Call localDb.connect() first')

    return Reflect.get(_localDb, prop)
  },
})

async function connect() {
  if (_localDb)
    return _localDb

  if (isServer)
    throw new Error('Database can only be initialized in browser environment')

  const [{ drizzle }, { SQLocalDrizzle }, migrations] = await Promise.all([
    import('drizzle-orm/sqlite-proxy'),
    import('sqlocal/drizzle'),
    import('./localMigrations/migrations.json'),
  ])

  const sqlocal = new SQLocalDrizzle('db.sqlite')
  const { driver, batchDriver, sql } = sqlocal

  _localDb = drizzle(driver, batchDriver, {
    logger: clientEnv.MODE === 'development'
      ? {
          logQuery: (query: string, params: any[]) => {
            const operationType = query.trim().split(' ')[0].toUpperCase()
            if (['INSERT', 'UPDATE', 'DELETE'].includes(operationType))
              syncDevDb({ sql: query, params }).catch(console.error)
          },
        }
      : false,
  })

  _sql = sql

  await initDb(migrations.default)

  if (clientEnv.MODE === 'development')
    await copyInitialDb(sqlocal)

  return _localDb
}

async function copyInitialDb(sqlocal: any) {
  try {
    const dbFile = await sqlocal.getDatabaseFile()
    await copyDBFile(dbFile)
  }
  catch (error) {
    console.error('[DEV] Initial database sync failed:', error)
  }
}

async function initDb(migrations: any[]) {
  if (!_sql)
    throw new Error('SQL not initialized')

  await _sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      tag TEXT NOT NULL
    )
  `

  const result = await _sql`
    SELECT created_at 
    FROM __drizzle_migrations 
    ORDER BY created_at DESC 
    LIMIT 1
  `
  const lastMigration = result[0]?.created_at ?? 0

  for (const migration of migrations) {
    if (migration.when > lastMigration) {
      console.log(`Applying migration: ${migration.tag}`)

      for (const statement of migration.sql)
        await _sql(statement)

      await _sql`
        INSERT INTO __drizzle_migrations (hash, created_at, tag)
        VALUES (${migration.tag}, ${migration.when}, ${migration.tag})
      `
    }
  }
}
