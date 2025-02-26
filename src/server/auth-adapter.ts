import type { Adapter } from '@auth/core/adapters'
import { and, eq } from 'drizzle-orm'
import { Accounts, Users } from '~/db/schema/remote'
import { remoteDb } from '~/db/turso'
import { uuidV4Base64url } from '~/utils'

export function TursoAdapter(): Adapter {
  return {
    async createUser(user) {
      const newUser = await remoteDb
        .insert(Users)
        .values({
          id: uuidV4Base64url(),
          name: user.name ?? 'Unknown',
          email: user.email ?? 'unknown@example.com',
          image: user.image ?? '',
        })
        .returning()
        .get()

      return {
        ...newUser,
        emailVerified: null,
      }
    },

    async getUser(id) {
      const user = await remoteDb
        .select()
        .from(Users)
        .where(eq(Users.id, id))
        .get()

      return user ? { ...user, emailVerified: null } : null
    },

    async getUserByEmail(email) {
      const user = await remoteDb
        .select()
        .from(Users)
        .where(eq(Users.email, email))
        .get()

      return user ? { ...user, emailVerified: null } : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await remoteDb
        .select()
        .from(Accounts)
        .where(and(
          eq(Accounts.provider, provider),
          eq(Accounts.providerAccountId, providerAccountId),
        ))
        .get()

      if (!account)
        return null

      const user = await remoteDb
        .select()
        .from(Users)
        .where(eq(Users.id, account.userId))
        .get()

      return user ? { ...user, emailVerified: null } : null
    },

    async updateUser(user) {
      const updated = await remoteDb
        .update(Users)
        .set({
          name: user.name ?? '',
          email: user.email ?? '',
          image: user.image ?? '',
          updated_at: new Date(),
        })
        .where(eq(Users.id, user.id))
        .returning()
        .get()

      return { ...updated, emailVerified: null }
    },

    async linkAccount(account) {
      await remoteDb
        .insert(Accounts)
        .values({
          userId: account.userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        })
        .run()

      return account
    },

    // Not needed
    async deleteUser() { return null },
    async unlinkAccount() { },
    async createSession() { return { sessionToken: '', userId: '', expires: new Date() } },
    async getSessionAndUser() { return null },
    async updateSession() { return null },
    async deleteSession() { },
    async createVerificationToken() { return { identifier: '', token: '', expires: new Date() } },
    async useVerificationToken() { return null },
  }
}
