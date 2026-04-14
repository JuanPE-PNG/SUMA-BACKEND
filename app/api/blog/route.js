import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/blog Todos los posts
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error al obtener posts:', error)
    return NextResponse.json({ error: 'Error al obtener posts' }, { status: 500 })
  }
}

// POST /api/blog
export async function POST(request) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()

    const title = formData.get('title')?.toString().trim()
    const excerpt = formData.get('excerpt')?.toString().trim()
    const content = formData.get('content')?.toString().trim() || ''
    const tagsRaw = formData.get('tags')?.toString().trim() || ''
    const author = formData.get('author')?.toString().trim() || auth.name || 'Admin'
    const imageFile = formData.get('image')

    if (!title || !excerpt) {
      return NextResponse.json(
        { error: 'Título y resumen son obligatorios' },
        { status: 400 },
      )
    }

    let imageUrl = null

    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `blog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('blog-images')
        .upload(fileName, buffer, { contentType: imageFile.type || 'image/jpeg' })

      if (uploadError) {
        console.error('Error al subir imagen:', uploadError)
        return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('blog-images')
        .getPublicUrl(fileName)

      imageUrl = urlData?.publicUrl ?? null
    }

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert([{
        title,
        excerpt,
        content,
        image_url: imageUrl,
        tags,
        author,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error al crear post:', error)
    return NextResponse.json({ error: 'Error al crear el post' }, { status: 500 })
  }
}
