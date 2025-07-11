export interface RequestLike {
  /** Absolute or relative URL */
  readonly url: string
  /** Upper-case HTTP method (e.g. `GET`) */
  readonly method: string
  /** All HTTP headers – mutable so adapters can append */
  readonly headers: Headers
  /** Lazily parse the body as JSON */
  json: <T = unknown>() => Promise<T>
  /** Raw text body */
  text: () => Promise<string>
  /** FormData helper (for `application/x-www-form-urlencoded` or `multipart/form-data`) */
  formData: () => Promise<FormData>
}

export interface ResponseLike {
  readonly status: number
  readonly headers: Headers
  readonly body?: BodyInit | null
}

export interface User {
  id: string
  name?: string | null
  email?: string | null
  emailVerified?: Date | null
  image?: string | null
}

export interface NewUser extends Omit<User, 'id' | 'emailVerified'> {
  id?: string
}

export interface Account {
  userId: string
  provider: string
  providerAccountId: string
  type?: string // e.g. "oauth"
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: number | null // epoch seconds
  idToken?: string | null
  scope?: string | null
  tokenType?: string | null
  sessionState?: string | null
}

export interface NewAccount extends Account {}

export interface Adapter {
  getUser: (id: string) => Promise<User | null>
  getUserByEmail: (email: string) => Promise<User | null>
  getUserByAccount: (provider: string, providerAccountId: string) => Promise<User | null>
  createUser: (data: NewUser) => Promise<User>
  linkAccount: (data: NewAccount) => Promise<void>
  updateUser: (data: Partial<User> & { id: string }) => Promise<User>
}

export class AuthError extends Error {
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'AuthError'
    this.cause = cause
  }
}

export function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function redirect(url: string, status: 302 | 303 = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  })
}

export * from './cookies'
export * from './createAuth'
export * from './handler'
