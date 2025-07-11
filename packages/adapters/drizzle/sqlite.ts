import type { AnyColumn, InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import type { Adapter, NewAccount, NewUser, User } from '../../core/index'
import { and, eq } from 'drizzle-orm'

type UsersTable = Table & {
  id: AnyColumn
  name: AnyColumn
  email: AnyColumn
  image: AnyColumn
  createdAt: AnyColumn
  updatedAt: AnyColumn
}

type AccountsTable = Table & {
  userId: AnyColumn
  provider: AnyColumn
  providerAccountId: AnyColumn
}

/**
 * SQLite-specific Drizzle adapter.
 *
 * Pass concrete `users` and `accounts` `Table` objects
 * with the columns we access (`id`, `email`, `userId`, `provider`, `providerAccountId`).
 */
export function SQLiteDrizzleAdapter<
  DB extends BaseSQLiteDatabase<'sync' | 'async', any, any>,
  U extends UsersTable,
  A extends AccountsTable,
>(db: DB, users: U, accounts: A): Adapter {
  type DBUser = InferSelectModel<U>
  type DBAccount = InferSelectModel<A>
  type DBInsertUser = InferInsertModel<U>
  type DBInsertAccount = InferInsertModel<A>

  const toUser = (row: DBUser | undefined | null): User | null =>
    row ? ({ ...(row as any), emailVerified: null }) : null

  return {
    async getUser(id) {
      const user: DBUser | undefined = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .get()
      return toUser(user)
    },

    async getUserByEmail(email) {
      const user: DBUser | undefined = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get()
      return toUser(user)
    },

    async getUserByAccount(provider, providerAccountId) {
      const account: DBAccount | undefined = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)))
        .get()
      if (!account)
        return null
      const user: DBUser | undefined = await db
        .select()
        .from(users)
        .where(eq(users.id, account.userId))
        .get()
      return toUser(user)
    },

    async createUser(data: NewUser) {
      const id = data.id ?? crypto.randomUUID()
      return await db.transaction(async (tx) => {
        await tx
          .insert(users)
          .values({
            id,
            name: data.name ?? null,
            email: data.email ?? null,
            image: data.image ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as DBInsertUser)
          .run()

        const result: DBUser | undefined = await tx.select().from(users).where(eq(users.id, id)).get()
        return toUser(result) as User
      })
    },

    async linkAccount(data: NewAccount) {
      await db
        .insert(accounts)
        .values({
          type: 'oauth',
          ...data,
        } as DBInsertAccount)
        .run()
    },

    async updateUser(partial) {
      await db
        .update(users)
        .set({
          name: partial.name ?? undefined,
          email: partial.email ?? undefined,
          image: partial.image ?? undefined,
          updatedAt: new Date(),
        } as Partial<DBInsertUser>)
        .where(eq(users.id, partial.id))
        .run()

      const result: DBUser | undefined = await db.select().from(users).where(eq(users.id, partial.id)).get()
      return toUser(result) as User
    },
  }
}
