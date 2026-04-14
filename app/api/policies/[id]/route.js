import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/policies/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Política no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al obtener la política' }, { status: 500 })
  }
}

// PUT /api/policies/[id] Actualiza título y/o archivo PDF
export async function PUT(request, { params }) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()

    const updates = {}

    const title = formData.get('title')?.toString().trim()
    if (title) updates.title = title

    const pdfFile = formData.get('file')
    if (pdfFile && pdfFile.size > 0) {
      if (pdfFile.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
      }

      const { data: existing } = await supabaseAdmin
        .from('policies')
        .select('file_url')
        .eq('id', id)
        .single()

      if (existing?.file_url) {
        const oldPath = extractFileName(existing.file_url)
        if (oldPath) {
          await supabaseAdmin.storage.from('policies').remove([oldPath])
        }
      }

      const buffer = Buffer.from(await pdfFile.arrayBuffer())
      const fileName = `policy_${Date.now()}.pdf`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('policies')
        .upload(fileName, buffer, { contentType: 'application/pdf' })

      if (uploadError) {
        console.error('Error al subir PDF de reemplazo:', uploadError)
        return NextResponse.json({ error: 'Error al subir el nuevo PDF' }, { status: 500 })
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('policies')
        .getPublicUrl(fileName)

      updates.file_url = urlData.publicUrl
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error al actualizar política:', error)
    return NextResponse.json({ error: 'Error al actualizar la política' }, { status: 500 })
  }
}

// DELETE /api/policies/[id]
export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { data: policy } = await supabaseAdmin
      .from('policies')
      .select('file_url')
      .eq('id', id)
      .single()

    if (policy?.file_url) {
      const fileName = extractFileName(policy.file_url)
      if (fileName) {
        await supabaseAdmin.storage.from('policies').remove([fileName])
      }
    }

    const { error } = await supabaseAdmin
      .from('policies')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Política eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar política:', error)
    return NextResponse.json({ error: 'Error al eliminar la política' }, { status: 500 })
  }
}

function extractFileName(url) {
  if (!url) return null
  try {
    return decodeURIComponent(url.split('/').pop().split('?')[0])
  } catch {
    return url.split('/').pop()
  }
}
