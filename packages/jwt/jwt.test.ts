import { describe, expect, it } from 'vitest'
import { sign, verify } from '.'

describe('jWT module', () => {
  it('signs and verifies with HS256', async () => {
    const secret = 'super-secret'
    const token = await sign({ foo: 'bar' }, { algorithm: 'HS256', secret, ttl: 60 })

    const payload = await verify<{ foo: string }>(token, { algorithm: 'HS256', secret })
    expect(payload.foo).toBe('bar')
  })

  it('signs and verifies with ES256', async () => {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify'],
    )

    const token = await sign({ hello: 'world' }, { privateKey, ttl: 120 })

    const payload = await verify<{ hello: string }>(token, { publicKey })
    expect(payload.hello).toBe('world')
  })
})
