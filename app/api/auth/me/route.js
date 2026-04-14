import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  try {
    const payload = await verifyAuth()

    if (!payload) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    return NextResponse.json({
      isAdmin: true,
      email: payload.email,
      name: payload.name,
      sub: payload.sub,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
