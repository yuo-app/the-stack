import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { uuidV4Base64url } from '~/utils'

export const Posts = sqliteTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => uuidV4Base64url()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type Post = typeof Posts.$inferSelect
export type PostNew = typeof Posts.$inferInsert
