import { describe, expect, it } from 'vitest'
import { MemoryAdapter } from '../adapters/memory/index'
import { createAuth } from './createAuth'

describe('createAuth with MemoryAdapter', () => {
  const auth = createAuth({ adapter: MemoryAdapter(), providers: [] })

  it('creates and retrieves a user', async () => {
    const user = await auth.createUser({ name: 'Alice', email: 'alice@example.com', image: '' })
    expect(user.id).toBeDefined()

    const fetched = await auth.getUser(user.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.email).toBe('alice@example.com')
  })
})
