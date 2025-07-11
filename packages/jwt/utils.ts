import { AuthError } from '../core/index'

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++)
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)

  return diff === 0
}

function base64UrlToArray(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (base64.length % 4)) % 4
  const padded = base64.padEnd(base64.length + padLength, '=')
  const binary_string = atob(padded)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++)
    bytes[i] = binary_string.charCodeAt(i)

  return bytes
}

export async function deriveKeysFromSecret(secret: string): Promise<{ privateKey: CryptoKey, publicKey: CryptoKey }> {
  try {
    const secretBytes = base64UrlToArray(secret)
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      secretBytes.slice(),
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    )

    const jwk = await crypto.subtle.exportKey('jwk', privateKey)
    delete jwk.d
    jwk.key_ops = ['verify']

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify'],
    )
    return { privateKey, publicKey }
  }
  catch (error) {
    throw new AuthError('Invalid AUTH_SECRET. Must be a base64url-encoded PKCS#8 private key for ES256. Use `bunx gau secret` to generate one.', error)
  }
}

/**
 * Convert JWS raw signature (r || s) to DER-encoded format for WebCrypto.
 */
export function rawToDer(raw: Uint8Array): Uint8Array {
  if (raw.length !== 64)
    throw new Error('Invalid raw signature length')

  let r = raw.slice(0, 32)
  let s = raw.slice(32)

  let rOffset = 0
  while (rOffset < r.length - 1 && r[rOffset] === 0) rOffset++
  r = r.slice(rOffset)

  let sOffset = 0
  while (sOffset < s.length - 1 && s[sOffset] === 0) sOffset++
  s = s.slice(sOffset)

  if (r.length > 0 && r[0]! & 0x80) {
    const rPadded = new Uint8Array(r.length + 1)
    rPadded[0] = 0
    rPadded.set(r, 1)
    r = rPadded
  }
  if (s.length > 0 && s[0]! & 0x80) {
    const sPadded = new Uint8Array(s.length + 1)
    sPadded[0] = 0
    sPadded.set(s, 1)
    s = sPadded
  }

  const rLength = r.length
  const sLength = s.length
  const totalLength = 2 + rLength + 2 + sLength

  const der = new Uint8Array(2 + totalLength)
  der[0] = 0x30 // SEQUENCE
  der[1] = totalLength
  der[2] = 0x02 // INTEGER
  der[3] = rLength
  der.set(r, 4)
  der[4 + rLength] = 0x02 // INTEGER
  der[5 + rLength] = sLength
  der.set(s, 6 + rLength)

  return der
}
