import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { uuidV4Base64url } from '~/utils'

export const Users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => uuidV4Base64url()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  image: text('image').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type User = typeof Users.$inferSelect
export type UserNew = typeof Users.$inferInsert
