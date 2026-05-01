import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}

export async function POST(request) {
  try {
    const supabase = await getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('contratos_disponibles').eq('id', session.user.id).single()

    if (!profile || profile.contratos_disponibles < 1)
      return NextResponse.json({ error: 'Sin contratos disponibles. Compra un plan.' }, { status: 403 })

    const { datos } = await request.json()

    const buffer = await generarWordBasico(datos)

    await supabase.from('contratos').insert({ user_id: session.user.id, datos, estado: 'generado' })
    await supabase.from('profiles')
      .update({ contratos_disponibles: profile.contratos_disponibles - 1 }).eq('id', session.user.id)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="contrato-locacion.docx"',
      }
    })
  } catch (err) {
    console.error('ERROR DETALLADO:', err.message, err.stack)
    return NextResponse.json({ error: 'Error: ' + err.message }, { status: 500 })
  }
}

async function generarWordBasico(datos) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx')
  const { locador, locatario, garante, inmueble, contrato } = datos

  function campo(label, valor) {
    return new Paragraph({ spacing: { after: 80 }, children: [
      new TextRun({ text: label + ': ', bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: valor || '_______________', size: 22, font: 'Arial' })
    ]})
  }

  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: 'CONTRATO DE LOCACION DE VIVIENDA', bold: true, size: 32, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'INMUEBLE', bold: true, size: 26, font: 'Arial' })] }),
    campo('Domicilio', inmueble?.dom),
    campo('Ciudad', inmueble?.ciudad),
    campo('Provincia', inmueble?.pcia),
    campo('Tipo', inmueble?.tipo),
    campo('Ocupantes', datos.inmueble_ocupantes_texto || datos.inmueble?.ocupantes),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'LOCADOR', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', locador?.nom),
    campo('DNI', locador?.dni),
    campo('Email', locador?.email),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'LOCATARIO', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', locatario?.nom),
    campo('DNI', locatario?.dni),
    campo('Email', locatario?.email),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'GARANTE', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', garante?.nom),
    campo('DNI', garante?.dni),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'CONDICIONES ECONOMICAS', bold: true, size: 26, font: 'Arial' })] }),
    campo('Canon', (contrato?.moneda || 'ARS') + ' ' + (contrato?.canon ? Number(contrato.canon).toLocaleString('es-AR') : '')),
    campo('Ajuste', contrato?.ajuste ? contrato.ajuste.toUpperCase() : ''),
    campo('Inicio', contrato?.inicio),
    campo('Plazo', (contrato?.plazo || '') + ' meses'),
    campo('Deposito', (contrato?.deposito || '') + ' mes(es)'),
    campo('CBU', contrato?.cbu),
    campo('Alias', contrato?.alias),
    campo('Banco', contrato?.banco),
    new Paragraph({ spacing: { before: 800 }, children: [] }),
    new Paragraph({ children: [new TextRun({ text: '________________________     ________________________', size: 22, font: 'Arial' })] }),
    new Paragraph({ children: [new TextRun({ text: 'LOCADOR: ' + (locador?.nom || '') + '     LOCATARIO: ' + (locatario?.nom || ''), size: 20, font: 'Arial' })] }),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({ children: [new TextRun({ text: '________________________', size: 22, font: 'Arial' })] }),
    new Paragraph({ children: [new TextRun({ text: 'GARANTE: ' + (garante?.nom || ''), size: 20, font: 'Arial' })] }),
  ]}]})

  return await Packer.toBuffer(doc)
}

