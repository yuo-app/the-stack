import { SolidAuth } from 'packages/solid-start'
import { authOptions } from '~/server/auth'

export const { GET, POST } = SolidAuth(authOptions)
