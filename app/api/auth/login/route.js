import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, buildAuthCookie } from '@/lib/auth'
import { loginLimiter } from '@/lib/rateLimit'

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { allowed } = loginLimiter(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 },
      )
    }

    const supabaseReady =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseReady) {
      try {
        const { data: adminUser, error: dbError } = await supabaseAdmin
          .from('admin_users')
          .select('id, email, password_hash, name')
          .eq('email', email.toLowerCase().trim())
          .single()

        if (dbError) {
          const tableNotFound =
            dbError.code === '42P01' ||
            dbError.message?.includes('does not exist') ||
            dbError.message?.includes('relation')

          if (dbError.code === 'PGRST116') {
            return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
          }

          if (!tableNotFound) {
            console.error('[login] Error de Supabase:', dbError.code, dbError.message)
          } else {
            console.warn('[login] Tabla admin_users no encontrada. Usando fallback.')
          }
          // Caer al fallback
        } else if (adminUser) {
          const isValid = await bcrypt.compare(password, adminUser.password_hash)
          if (!isValid) {
            return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
          }

          supabaseAdmin
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', adminUser.id)
            .then(() => {})
            .catch(() => {})

          const token = await signToken({
            sub: adminUser.id,
            email: adminUser.email,
            name: adminUser.name || 'Admin',
            role: 'admin',
          })

          const response = NextResponse.json({
            success: true,
            message: 'Login exitoso',
            user: { email: adminUser.email, name: adminUser.name || 'Admin' },
          })
          response.cookies.set(buildAuthCookie(token))
          return response
        }
      } catch (err) {
        console.error('[login] Excepción Supabase:', err?.message)
      }
    } else {
      console.warn('[login] Variables de Supabase no configuradas. Usando fallback.')
    }

    const envHash = process.env.ADMIN_PASSWORD_HASH
    if (!envHash) {
      console.error('[login] Sin ADMIN_PASSWORD_HASH y sin Supabase configurado.')
      return NextResponse.json(
        { error: 'Servidor no configurado correctamente' },
        { status: 500 },
      )
    }

    const isValid = await bcrypt.compare(password, envHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const token = await signToken({
      sub: 'env-admin',
      email: email.toLowerCase().trim(),
      name: 'Admin',
      role: 'admin',
    })

    const response = NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: { email: email.toLowerCase().trim(), name: 'Admin' },
    })
    response.cookies.set(buildAuthCookie(token))
    return response

  } catch (error) {
    console.error('[login] Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
