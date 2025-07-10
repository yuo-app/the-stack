import type { Adapter, NewAccount, NewUser, User } from '../../core/index'

interface InternalAccountKey {
  provider: string
  providerAccountId: string
}

function accountKey(k: InternalAccountKey): string {
  return `${k.provider}:${k.providerAccountId}`
}

export function MemoryAdapter(): Adapter {
  const users = new Map<string, User>()
  const usersByEmail = new Map<string, string>() // email -> userId
  const accounts = new Map<string, string>() // accountKey -> userId

  return {
    async getUser(id) {
      return users.get(id) ?? null
    },

    async getUserByEmail(email) {
      const id = usersByEmail.get(email)
      if (!id)
        return null
      return users.get(id) ?? null
    },

    async getUserByAccount(provider, providerAccountId) {
      const id = accounts.get(accountKey({ provider, providerAccountId }))
      if (!id)
        return null
      return users.get(id) ?? null
    },

    async createUser(data: NewUser) {
      const id = data.id ?? crypto.randomUUID()
      const user: User = {
        id,
        name: data.name ?? null,
        email: data.email ?? null,
        image: data.image ?? null,
        emailVerified: null,
      }
      users.set(id, user)
      if (user.email)
        usersByEmail.set(user.email, id)
      return user
    },

    async linkAccount(data: NewAccount) {
      accounts.set(accountKey(data), data.userId)
    },

    async updateUser(partial) {
      const existing = users.get(partial.id)
      if (!existing)
        throw new Error('User not found')
      const updated: User = { ...existing, ...partial }
      users.set(updated.id, updated)
      if (updated.email)
        usersByEmail.set(updated.email, updated.id)
      return updated
    },
  }
}
