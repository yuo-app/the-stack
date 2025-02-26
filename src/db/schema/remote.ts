import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { uuidV4Base64url } from '~/utils'

export const Users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => uuidV4Base64url()),
  name: text('name').notNull(),
  // TODO: account merging is done via id, what about email should it be unique?
  email: text('email').notNull(),
  image: text('image').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type User = typeof Users.$inferSelect
export type UserNew = typeof Users.$inferInsert

export const Accounts = sqliteTable('accounts', {
  userId: text('userId')
    .notNull()
    .references(() => Users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, account => [
  primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
])

export type Account = typeof Accounts.$inferSelect
export type AccountNew = typeof Accounts.$inferInsert
