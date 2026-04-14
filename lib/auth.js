import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_EXPIRY = '8h'
export const COOKIE_NAME = 'suma_admin_token'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
  }
  return new TextEncoder().encode(secret || 'fallback-secret-change-in-production-min-32chars')
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret())
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export async function verifyAuth() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return await verifyToken(token)
  } catch {
    return null
  }
}

export function buildAuthCookie(token) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60,
    path: '/',
  }
}
