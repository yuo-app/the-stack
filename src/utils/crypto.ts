export function uuidBase64url(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  let binary = ''
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i])

  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '')
}
