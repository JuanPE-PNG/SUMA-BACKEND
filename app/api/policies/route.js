import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/policies
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error al obtener políticas:', error)
    return NextResponse.json({ error: 'Error al obtener políticas' }, { status: 500 })
  }
}

// POST /api/policies
export async function POST(request) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()

    const title = formData.get('title')?.toString().trim()
    const pdfFile = formData.get('file')

    if (!title) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
    }

    if (!pdfFile || pdfFile.size === 0) {
      return NextResponse.json({ error: 'El archivo PDF es obligatorio' }, { status: 400 })
    }

    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
    }

    const maxSizeMB = 10
    if (pdfFile.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo no puede superar ${maxSizeMB}MB` },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await pdfFile.arrayBuffer())
    const fileName = `policy_${Date.now()}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('policies')
      .upload(fileName, buffer, { contentType: 'application/pdf' })

    if (uploadError) {
      console.error('Error al subir PDF:', uploadError)
      return NextResponse.json({ error: 'Error al subir el archivo PDF' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('policies')
      .getPublicUrl(fileName)

    const { data, error } = await supabaseAdmin
      .from('policies')
      .insert([{
        title,
        file_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error al crear política:', error)
    return NextResponse.json({ error: 'Error al crear la política' }, { status: 500 })
  }
}
