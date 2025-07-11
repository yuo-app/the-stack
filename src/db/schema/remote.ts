import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { uuidV4Base64url } from '~/utils'

export const Users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => uuidV4Base64url()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
  image: text('image').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type User = typeof Users.$inferSelect
export type UserNew = typeof Users.$inferInsert

export const Accounts = sqliteTable('accounts', {
  userId: text('userId')
    .notNull()
    .references(() => Users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refreshToken: text('refreshToken'),
  accessToken: text('accessToken'),
  expiresAt: integer('expiresAt'),
  tokenType: text('tokenType'),
  scope: text('scope'),
  idToken: text('idToken'),
  sessionState: text('sessionState'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, account => [
  primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
])

export type Account = typeof Accounts.$inferSelect
export type AccountNew = typeof Accounts.$inferInsert
