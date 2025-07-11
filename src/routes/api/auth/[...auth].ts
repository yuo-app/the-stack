import { createHandler } from 'packages/core'
import { authOptions } from '~/server/auth'

const handler = createHandler(authOptions)

export async function GET(event: any) {
  return handler(event.request)
}

export async function POST(event: any) {
  return handler(event.request)
}
