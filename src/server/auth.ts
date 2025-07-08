import type { SolidAuthConfig } from '@solid-mediakit/auth'
import GitHub from '@auth/core/providers/github'
import { serverEnv } from '~/env/server'
import { TursoAdapter } from './auth-adapter'

declare module '@auth/core/types' {
  export type AuthUser = DefaultSession['user']

  export interface Session {
    user?: AuthUser
  }
}

export const authOptions: SolidAuthConfig = {
  adapter: TursoAdapter(),
  providers: [
    GitHub({
      clientId: serverEnv.AUTH_GITHUB_ID,
      clientSecret: serverEnv.AUTH_GITHUB_SECRET,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub)
        session.user.id = token.sub

      return session
    },
    async jwt({ token, user }) {
      if (user)
        token.sub = user.id

      return token
    },
  },
  basePath: '/api/auth',
  trustHost: true,
  secret: serverEnv.AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: 'the-stack.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
      },
    },
  },
  session: {
    strategy: 'jwt',
  },
}
