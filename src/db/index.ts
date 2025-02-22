/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { SQLocalDrizzle } from 'sqlocal/drizzle'
import migrations from './migrations/migrations.json'

const { driver, batchDriver, sql } = new SQLocalDrizzle('db.sqlite')
export const db = drizzle(driver, batchDriver)

await sql`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    tag TEXT NOT NULL
  )
`

const result = await sql`
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
      await sql(statement)

    await sql`
      INSERT INTO __drizzle_migrations (hash, created_at, tag)
      VALUES (${migration.tag}, ${migration.when}, ${migration.tag})
    `
  }
}
