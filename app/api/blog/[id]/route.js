import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/blog/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al obtener el post' }, { status: 500 })
  }
}

// PUT /api/blog/[id] Actualiza un post
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
    const excerpt = formData.get('excerpt')?.toString().trim()
    const content = formData.get('content')?.toString()
    const author = formData.get('author')?.toString().trim()
    const tagsRaw = formData.get('tags')?.toString()

    if (title) updates.title = title
    if (excerpt) updates.excerpt = excerpt
    if (content !== null && content !== undefined) updates.content = content
    if (author) updates.author = author
    if (tagsRaw !== null && tagsRaw !== undefined) {
      updates.tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    }

    const imageFile = formData.get('image')
    if (imageFile && imageFile.size > 0) {
      // Eliminar imagen anterior si existe
      const { data: existing } = await supabaseAdmin
        .from('blog_posts')
        .select('image_url')
        .eq('id', id)
        .single()

      if (existing?.image_url) {
        const oldPath = extractStoragePath(existing.image_url, 'blog-images')
        if (oldPath) {
          await supabaseAdmin.storage.from('blog-images').remove([oldPath])
        }
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `blog_${Date.now()}.${ext}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('blog-images')
        .upload(fileName, buffer, { contentType: imageFile.type || 'image/jpeg' })

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('blog-images')
          .getPublicUrl(fileName)
        updates.image_url = urlData?.publicUrl ?? null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error al actualizar post:', error)
    return NextResponse.json({ error: 'Error al actualizar el post' }, { status: 500 })
  }
}

// DELETE /api/blog/[id]
export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { data: post } = await supabaseAdmin
      .from('blog_posts')
      .select('image_url')
      .eq('id', id)
      .single()

    if (post?.image_url) {
      const path = extractStoragePath(post.image_url, 'blog-images')
      if (path) {
        await supabaseAdmin.storage.from('blog-images').remove([path])
      }
    }

    const { error } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Post eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar post:', error)
    return NextResponse.json({ error: 'Error al eliminar el post' }, { status: 500 })
  }
}

function extractStoragePath(url, bucket) {
  if (!url) return null
  try {
    const escaped = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`/(?:object|render/image)/public/${escaped}/(.+?)(?:\\?|$)`)
    const m = url.match(re)
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}
