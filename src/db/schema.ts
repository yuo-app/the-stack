import * as s from 'drizzle-orm/sqlite-core'

export const users = s.sqliteTable('users', {
  id: s.text('id')
    .primaryKey()
    .$defaultFn(() => uuidBase64url()),
  username: s.text().default('').notNull(),
  password: s.text().default('').notNull(),
})

export type User = typeof users.$inferSelect
export type UserNew = typeof users.$inferInsert

function uuidBase64url(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '')
}
