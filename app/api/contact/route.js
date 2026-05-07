import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request) {
  try {
    const { name, lastName, email, phone, message } = await request.json()

    if (!name || !lastName || !email || !phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' },
        { status: 400 },
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'smtpout.secureserver.net',
      port: 993
      ,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Formulario de Contacto" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Nuevo mensaje de ${name} ${lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px; color: #333;">
          <h2>Nuevo mensaje recibido</h2>
          <p><strong>Nombre:</strong> ${name} ${lastName}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${phone}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="background:#f3f4f6; padding:12px; border-radius:8px;">${message}</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: 'Correo enviado correctamente' })
  } catch (error) {
    console.error('[contact] Error al enviar el correo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al enviar el correo' },
      { status: 500 },
    )
  }
}
