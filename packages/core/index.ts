/**
 * Core abstractions for gau.
 * These interfaces are intentionally lightweight so they can be
 * implemented by any runtime (Bun, Node, Cloudflare Workers, Tauri, …).
 * They use the standard Web-API primitives whenever possible to keep
 * cross-compatibility costs low.
 */

// ============= Request / Response wrappers =============

/**
 * A minimal subset of the standard `Request` interface that every
 * supported runtime exposes. If you already have a `Request`, you can
 * safely cast it to `RequestLike` – the properties here are a strict
 * subset of the real thing.
 */
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

/**
 * A tiny facade over `Response` so we can type against it without pulling
 * in the whole DOM lib in every downstream package. A real `Response`
 * instance satisfies this type.
 */
export interface ResponseLike {
  readonly status: number
  readonly headers: Headers
  readonly body?: BodyInit | null
}

// ============= Core domain types =============

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

// ============= Adapter contract =============

export interface Adapter {
  getUser: (id: string) => Promise<User | null>
  getUserByEmail: (email: string) => Promise<User | null>
  getUserByAccount: (provider: string, providerAccountId: string) => Promise<User | null>
  createUser: (data: NewUser) => Promise<User>
  linkAccount: (data: NewAccount) => Promise<void>
  updateUser: (data: Partial<User> & { id: string }) => Promise<User>
}

// ============= Error helpers =============

export class AuthError extends Error {
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'AuthError'
    this.cause = cause
  }
}

// ============= Response helpers =============

/** Convenience wrapper to return JSON consistently across runtimes */
export function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

/** Helper for 303 redirects (safe across GET/POST) */
export function redirect(url: string, status: 302 | 303 = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  })
}

export * from './createAuth'
