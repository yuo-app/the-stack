import type { SerializeOptions } from 'cookie'
import type { SignOptions, VerifyOptions } from '../jwt'
import type { OAuthProvider } from '../oauth'
import type { Adapter, User } from './index'
import { sign, verify } from '../jwt'
import { DEFAULT_COOKIE_SERIALIZE_OPTIONS } from './cookies'

export interface CreateAuthOptions {
  adapter: Adapter
  providers: OAuthProvider[]
  basePath?: string
  jwt?: {
    algorithm?: 'ES256' | 'HS256'
    secret?: string // Used for HS256 secret or ES256 private key source (overrides AUTH_SECRET)
    iss?: string
    aud?: string
    ttl?: number
  }
  cookies?: Partial<SerializeOptions>
  trustHosts?: 'all' | string[]
}

export function createAuth(options: CreateAuthOptions) {
  const { adapter, providers, basePath = '/api/auth', jwt: jwtConfig = {}, cookies: cookieConfig = {}, trustHosts = options.trustHosts ?? [] } = options
  const { algorithm = 'ES256', secret, iss, aud, ttl: defaultTTL = 3600 * 24 } = jwtConfig

  const cookieOptions = { ...DEFAULT_COOKIE_SERIALIZE_OPTIONS, ...cookieConfig }

  const providerMap = new Map(providers.map(p => [p.id, p]))

  function buildSignOptions(custom: Partial<SignOptions> = {}): SignOptions {
    const base = { ttl: custom.ttl, iss: custom.iss ?? iss, aud: custom.aud ?? aud, sub: custom.sub }
    if (algorithm === 'HS256')
      return { algorithm, secret: custom.secret ?? secret, ...base }
    else
      return { algorithm, privateKey: custom.privateKey, ...base }
  }

  function buildVerifyOptions(custom: Partial<VerifyOptions> = {}): VerifyOptions {
    const base = { iss: custom.iss ?? iss, aud: custom.aud ?? aud }
    if (algorithm === 'HS256')
      return { algorithm, secret: custom.secret ?? secret, ...base }
    else
      return { algorithm, publicKey: custom.publicKey, ...base }
  }

  async function signJWT<T extends Record<string, unknown>>(payload: T, customOptions: Partial<SignOptions> = {}): Promise<string> {
    return sign(payload, buildSignOptions(customOptions))
  }

  async function verifyJWT<T = Record<string, unknown>>(token: string, customOptions: Partial<VerifyOptions> = {}): Promise<T | null> {
    try {
      return await verify<T>(token, buildVerifyOptions(customOptions))
    }
    catch {
      return null
    }
  }

  async function createSession(userId: string, data: Record<string, unknown> = {}, ttl = defaultTTL): Promise<string> {
    const payload = { sub: userId, ...data }
    return signJWT(payload, { ttl })
  }

  async function validateSession(token: string): Promise<{ user: User | null, session: { id: string, sub: string, [key: string]: unknown } | null }> {
    const payload = await verifyJWT<{ sub: string } & Record<string, unknown>>(token)
    if (!payload)
      return { user: null, session: null }
    const user = await adapter.getUser(payload.sub)
    return { user, session: { id: token, ...payload } }
  }

  return {
    ...adapter,
    providerMap,
    basePath,
    cookieOptions,
    jwt: {
      ttl: defaultTTL,
    },
    signJWT,
    verifyJWT,
    createSession,
    validateSession,
    trustHosts,
  }
}
