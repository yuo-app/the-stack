import type { AuthUser } from '@auth/core/types'
import { Users } from '~/db/schema/remote'
import { remoteDb } from '~/db/turso'

export async function initUser(user: AuthUser) {
  'use server'

  if (!user)
    return

  console.log('initUser', user)

  const userData = {
    id: user.id,
    name: user.name!,
    email: user.email!,
    image: user.image!,
  } satisfies AuthUser

  await remoteDb
    .insert(Users)
    .values(userData)
    .onConflictDoUpdate({
      target: Users.id,
      set: userData,
    })
    .run()

  return userData
}
