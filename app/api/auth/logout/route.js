import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

function buildLogoutResponse() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' })
  response.cookies.delete(COOKIE_NAME)
  return response
}

export async function POST() {
  return buildLogoutResponse()
}

export async function GET() {
  return buildLogoutResponse()
}
