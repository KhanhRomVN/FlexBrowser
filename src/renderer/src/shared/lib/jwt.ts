/**
 * Decode a JWT token payload without external libraries.
 * @param token The JWT string.
 * @returns The decoded payload object, or null on failure.
 */
export function decodeJwt<T = any>(token: string): T | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
