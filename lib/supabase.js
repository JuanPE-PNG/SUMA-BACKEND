import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase] Falta SUPABASE_URL — configura .env.local')
  }
}
if (!supabaseServiceKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase] Falta SUPABASE_SERVICE_ROLE_KEY — configura .env.local')
  }
}

/**
 * Cliente con service role key — omite RLS, solo usar en server-side.
 * Usar para todas las operaciones de escritura protegidas del panel admin.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Cliente con anon key — respeta RLS.
 * Usar para lecturas públicas.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey)
