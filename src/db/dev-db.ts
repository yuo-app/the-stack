/* eslint-disable no-console */
import type { Client as DatabaseType } from '@libsql/client'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { clientEnv } from '~/env/client'
import * as schema from './schema/local'

let _sqlite: DatabaseType | null = null
let _devDb: LibSQLDatabase<typeof schema> | null = null

function getDevDb() {
  if (!_devDb || !_sqlite) {
    _sqlite = createClient({ url: `file:drizzle/${clientEnv.VITE_DB_FILE}` })
    _devDb = drizzle(_sqlite, { schema })
  }
  return {
    sqlite: _sqlite,
    devDb: _devDb,
  }
}

export async function syncDevDb(operation: { sql: string, params: any[] }) {
  'use server'

  if (clientEnv.MODE !== 'development')
    throw new Error('Only available in development')

  console.log('[DEV] Syncing local db operation:', operation)
  try {
    const { sqlite } = getDevDb()
    const tx = await sqlite.transaction('write')
    try {
      await tx.execute({ sql: operation.sql, args: operation.params })
      await tx.commit()
      console.log('[DEV] Operation executed successfully')
    }
    catch (error) {
      await tx.rollback()
      console.error('Error in transaction:', error)
      throw error
    }

    return { success: true }
  }
  catch (error) {
    console.error('Error syncing to local db:', error)
    throw error
  }
}

export async function copyDBFile(file: File) {
  'use server'

  if (clientEnv.MODE !== 'development')
    throw new Error('Only available in development')

  try {
    const buffer = await file.arrayBuffer()
    const targetPath = `drizzle/${clientEnv.VITE_DB_FILE}`

    await mkdir(dirname(targetPath), { recursive: true })
    fs.writeFileSync(targetPath, Buffer.from(buffer))

    console.log('[DEV] Database file copied successfully')
    return { success: true }
  }
  catch (error) {
    console.error('Error copying database file:', error)
    throw error
  }
}
