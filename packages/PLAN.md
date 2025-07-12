# PLAN

> A **vendor-neutral, runtime-agnostic OAuth & JWT authentication toolkit** (built on OAuth 2.1, OIDC, WebAuthn) that runs everywhere Bun runs —from Cloudflare Workers to Tauri desktop apps.

`gau` keeps AuthJS-level DX while avoiding its Node-centric constraints.

---

## Status

- works on the web: vite dev, wrangler dev, remote cloudflare workers
- works even with different hosts eg. from wrangler dev using the remote cloudflare workers
- works with tauri dev and tauri build
- currently getting ready to test in tauri android dev and tauri android build

## 1  Scope & Philosophy

### 1.1  Goals

1. **Open-source & self-hostable.** No required account, no per-login fees.
2. **Database agnostic.** Any SQL engine via adapters (first-party Drizzle, community adapters encouraged).
3. **Framework agnostic.** Core is framework-free; first-party helpers for SolidStart & SvelteKit.
4. **Runtime agnostic.** Bun, Node, Deno, Cloudflare Workers, Tauri (via deep-link).
5. **First-class OAuth + stateless JWT sessions.** No server-side session table.
6. **Automatic account linking.** One user = many providers out-of-the-box.
7. **Modular.** Every package optional; zero heavy UI.

### 1.2  Non-Goals

- Password logins (passkeys/WebAuthn will be explored later).
- Large UI widgets – only headless helpers & demo forms.
- Support for legacy Node (<18) – rely on native `fetch` & Web Crypto.
- Storing app secrets in the browser – JWT defaults to **ES256**.

---

## 2  Architecture Overview

```text
packages/        → temporary and just for easy testing, will be moved to a separate repo
  core/          → shared types, errors, router-agnostic request/response helpers
  oauth/         → provider-agnostic OAuth 2.1 helpers (built on Arctic)
  jwt/           → JWT encode/verify helpers (@oslojs/jwt)
  adapters/
    drizzle/sqlite/ → SQLite adapter (Drizzle)
    # future: drizzle/mysql/ & drizzle/pg/ adapters
  runtimes/
    bun/         → tiny wrapper around Bun.serve()
    cf/          → Cloudflare Pages / Workers proxy
    tauri/       → deep-link callback bridge
  client/
    solid/       → SolidJS reactive client (~1 kB)
    svelte/      → Svelte 5 reactive client (~1 kB)
  cli/           → `bunx @yuo-app/gau` scaffolder & code-gen
```

`core` is the only mandatory dependency; everything else can be swapped or omitted.

```ts
import { DrizzleAdapter } from '@yuo-app/gau/adapters/drizzle'
import { createAuth } from '@yuo-app/gau/core'
import { GitHub } from '@yuo-app/gau/oauth'
import { db } from './db'

export const auth = createAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  // JWT configuration is optional.
  // With no config we default to ES256 and read the private key from AUTH_SECRET.
  jwt: {
    algorithm: 'ES256', // or 'HS256'
    secret: process.env.AUTH_SECRET,
  },
})
```

---

## 3  Component Details

### 3.1  Core

- Type-safe public API (`createAuth`, `getSession`, `signIn`, `signOut`, …).
- Router-agnostic `RequestLike` / `ResponseLike` abstraction.
- Minimal state machine: `signIn()` → providerRedirect → `callback()` → JWT issue → cookie.

### 3.2  OAuth Module

- Builds on **Arctic** provider objects.
- Normalises profile → `{ id, name, email, avatar }`.
- PKCE & `state` baked-in; optional `response_mode=json` for desktop flows.

### 3.3  JWT Module

- Uses [`@oslojs/jwt`](https://jwt.oslojs.dev/).
- **ES256** (private-key ECDSA) default, private key read from `AUTH_SECRET`, public key derived.
- **HS256** fallback for single-server setups (`AUTH_SECRET` used as shared secret).
- Handles both raw and DER-encoded ECDSA signatures to ensure cross-runtime compatibility (Bun, Node, browsers).
- Helpers: `sign(payload, { ttl })`, `verify(token)`; public key auto-derived for ES256.
- Automatic standard claims (`iat`, `exp`, `sub`, `iss`, `aud`).
- Refresh-token rotation planned (post-MVP).

### 3.4  Database Adapter Contract

```ts
interface Adapter {
  getUser: (id: string) => Promise<User | null>
  getUserByEmail: (email: string) => Promise<User | null>
  getUserByAccount: (provider: string, providerAccountId: string) => Promise<User | null>
  createUser: (data: NewUser) => Promise<User>
  linkAccount: (data: NewAccount) => Promise<void>
  updateUser: (data: Partial<User> & { id: string }) => Promise<User>
}
```

- `SQLiteDrizzleAdapter` (exported as `DrizzleAdapter`) ships first-party; Postgres & MySQL adapters planned.

- later: `DrizzleAdapter` will be a generic adapter that can be used with any SQL engine supported by Drizzle.

### 3.5  Runtime Helpers

- **Bun** – thin sugar, zero dependencies.
- **Cloudflare Workers** – proxy polyfills URL & Headers quirks.
- **Tauri** – `invokeDeepLink(url)` route helper.

### 3.6  Client Packages

- Separate ESM clients (`@yuo-app/gau/solid`, `…/svelte`).
- Expose reactive `session()` store, `signIn`, `signOut`.
- Each ~1 kB gzipped, no dependencies beyond framework runtime.

---

## 4  Database Schema (Drizzle – v0)

```ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => Date.now()),
})

export const accounts = sqliteTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'oauth' for now
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, account => [
  primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
])
```

Notes:
• No `sessions` table—JWT is stateless.
• `authenticators` & `verificationTokens` tables will be added with the future Passkeys module.

---

## 5  API Route Convention

| Route | Method | Behaviour |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `/auth/:provider`               | GET    | Starts OAuth. Returns `{ url }` (JSON) for desktop or 302 redirect for browsers.   |
| `/auth/:provider/callback`      | GET    | Completes OAuth, sets `Set-Cookie: jwt` or returns `{ token, user }` (desktop).     |
| `/auth/session`                 | GET    | Reads JWT, returns `{ user }`. No DB round-trip.                                   |
| `/auth/signout`                 | POST   | Clears cookie (and, once refresh rotation exists, invalidates refresh token).       |

---

## 6  Security

- **CSRF**: double-submit cookie + `state` param (generated in OAuth helper).
- **PKCE** enforced for public clients.
- **JWT** private key / secret stored as `AUTH_SECRET`; public key derived on the fly for ES256.
- Default cookie settings: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Optional `frame-ancestors 'none'` & `referrer-policy` header helpers.

---

## 7  Roadmap & Milestones

| Milestone | Deliverables |
| --------- | ----------- |
| **0.1 MVP** | Core API, **SQLite Drizzle adapter**, GitHub provider, JWT (ES256, HS256), Bun runtime helper, SolidStart & Svelte 5 clients, example `examples/solid-tauri` |
| **0.2**    | Google & Discord providers, automatic account linking, **MySQL & Postgres Drizzle adapters**, Cloudflare Workers runtime helper, CLI scaffolder |
| **0.3**    | Passkeys/WebAuthn (public clients), refresh-token rotation, Next.js & Express examples |
| **1.0**    | Docs (Astro Starlight), full test coverage with `bun test`, semantic-release |

---

## 8  Development Task List

- [x] **[core-abstractions]** Design core `RequestLike`/`ResponseLike` abstraction and Adapter interface.
- [x] **[scaffold-monorepo]** Scaffold monorepo package structure (core, oauth, jwt, adapters, runtimes, clients, cli).
- [x] **[create-auth]** Implement `createAuth()` with in-memory adapter and unit tests.
- [x] **[drizzle-sqlite-adapter]** Implement SQLite Drizzle adapter with helpers & migration script.
- [ ] **[drizzle-mysql-adapter]** Implement MySQL Drizzle adapter.
- [ ] **[drizzle-pg-adapter]** Implement Postgres Drizzle adapter.
- [x] **[jwt-module]** JWT module with ES256 default, HS256 fallback, and tests.
- [x] **[github-oauth]** Integrate GitHub OAuth provider via Arctic including PKCE and CSRF `state`.
- [ ] **[bun-runtime]** Bun runtime helper (`serveAuthRoutes`).
- [ ] **[solid-client]** SolidJS client package with reactive session store.
- [ ] **[svelte-client]** Svelte 5 client package with reactive session store.
- [ ] **[security-hardening]** Security hardening: CSRF double submit, PKCE enforcement, secure cookies.
- [ ] **[account-linking]** Automatic account linking across providers.
- [ ] **[solid-tauri-example]** SolidStart + Tauri example demo.
- [ ] **[cf-runtime]** Cloudflare Workers runtime helper.
- [ ] **[cli-scaffolder]** CLI scaffolder (`bunx @yuo-app/gau init`) including auth secret key generation.
- [ ] **[docs-site]** Documentation site (Astro Starlight) & examples gallery.
- [ ] **[passkeys]** Passkeys/WebAuthn module with authenticators table and helpers.

---

_This document reflects the latest design decisions: OAuth-only for now, separate framework clients, automatic account linking, stateless JWT sessions, and no JWE, just sign-only._
