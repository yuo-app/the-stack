import type { User } from '~/db/schema'
import { createSignal } from 'solid-js'
import { db } from '~/db'
import { users } from '~/db/schema'

export default function Home() {
  const [user, setUser] = createSignal<User>()

  async function addUser() {
    const [newUser] = await db.insert(users).values({ username: 'Bela', password: '***' }).returning()
    setUser(newUser)
  }

  return (
    <main class="w-full p-4 space-y-2">
      <h2 class="font-bold text-3xl">
        Hello
        {' '}
        {user()?.username}
      </h2>
      <button class="p-2 bg-blue-500 text-white" onClick={addUser}>
        Add User
      </button>
    </main>
  )
}
