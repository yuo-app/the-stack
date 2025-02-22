/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'

const journal = JSON.parse(
  fs.readFileSync('./drizzle/migrations/meta/_journal.json', 'utf-8'),
)

export interface MigrationMeta {
  idx: number
  when: number
  tag: string
  sql: string[]
}

const migrations: MigrationMeta[] = []

for (const entry of journal.entries) {
  const { when, idx, tag } = entry
  console.log(`Parsing migration: ${tag}`)

  const migrationFile = fs.readFileSync(
    path.join('./drizzle/migrations', `${tag}.sql`),
    'utf-8',
  )

  migrations.push({
    idx,
    when,
    tag,
    sql: migrationFile
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(Boolean),
  })
}

// Create output directory if it doesn't exist
const outDir = './src/db/migrations'
if (!fs.existsSync(outDir))
  fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(
  path.join(outDir, 'migrations.json'),
  JSON.stringify(migrations, null, 2),
)
