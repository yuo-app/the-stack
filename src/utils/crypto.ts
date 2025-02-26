export function uuidV4Base64url(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  bytes[6] = (bytes[6] & 0x0F) | 0x40
  bytes[8] = (bytes[8] & 0x3F) | 0x80

  let binary = ''
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i])

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '')
}
