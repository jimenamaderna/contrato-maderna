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

    const { data: modelo } = await supabase
      .from('contratos_modelo').select('filename').eq('activo', true)
      .order('created_at', { ascending: false }).limit(1).single()

    let buffer

    if (modelo?.filename) {
      const { data: fileData, error: fileError } = await supabase
        .storage.from('contratos-modelo').download(modelo.filename)
      if (!fileError && fileData) {
        const modelBuffer = await fileData.arrayBuffer()
        buffer = await reemplazarVariables(modelBuffer, datos)
      }
    }

    if (!buffer) buffer = await generarWordBasico(datos)

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
    return NextResponse.json({ error: 'Error: ' + err.message }, { status: 500 })
  }
}

async function reemplazarVariables(modelBuffer, datos) {
  const { locador, locatario, garante, inmueble, contrato } = datos
  const PizZip = (await import('pizzip')).default
  const Docxtemplater = (await import('docxtemplater')).default
  const zip = new PizZip(modelBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{', end: '}' } })
  doc.render({
    fecha: new Date().toLocaleDateString('es-AR'),
    locador_nom: locador?.nom||'', locador_dni: locador?.dni||'', locador_cuit: locador?.cuit||'',
    locador_ec: locador?.ec||'', locador_dom: locador?.dom||'', locador_email: locador?.email||'',
    locatario_nom: locatario?.nom||'', locatario_dni: locatario?.dni||'', locatario_ec: locatario?.ec||'',
    locatario_dom: locatario?.dom||'', locatario_email: locatario?.email||'',
    garante_nom: garante?.nom||'', garante_dni: garante?.dni||'', garante_dom: garante?.dom||'',
    inmueble_dom: inmueble?.dom||'', inmueble_ciudad: inmueble?.ciudad||'', inmueble_pcia: inmueble?.pcia||'',
    inmueble_tipo: inmueble?.tipo||'', inmueble_ocupantes: inmueble?.ocupantes||'',
    canon: contrato?.canon ? Number(contrato.canon).toLocaleString('es-AR') : '',
    moneda: contrato?.moneda||'ARS', ajuste: contrato?.ajuste?.toUpperCase()||'',
    periodo: contrato?.periodo||'', inicio: contrato?.inicio||'',
    plazo: contrato?.plazo||'', deposito: contrato?.deposito||'',
    cbu: contrato?.cbu||'', alias: contrato?.alias||'', banco: contrato?.banco||'',
  })
  return doc.getZip().generate({ type: 'nodebuffer' })
}

async function generarWordBasico(datos) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx')
  const { locador, locatario, garante, inmueble, contrato } = datos
  function campo(label, valor) {
    return new Paragraph({ spacing: { after: 80 }, children: [
      new TextRun({ text: label + ': ', bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text: valor||'_______________', size: 22, font: 'Arial' })
    ]})
  }
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: 'CONTRATO DE LOCACION DE VIVIENDA', bold: true, size: 32, font: 'Arial' })] }),
    new Paragraph({ children: [new TextRun({ text: 'INMUEBLE', bold: true, size: 26, font: 'Arial' })] }),
    campo('Domicilio', inmueble?.dom), campo('Ciudad', inmueble?.ciudad),
    campo('Provincia', inmueble?.pcia), campo('Ocupantes', inmueble?.ocupantes),
    new Paragraph({ children: [new TextRun({ text: 'LOCADOR', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', locador?.nom), campo('DNI', locador?.dni), campo('Email', locador?.email),
    new Paragraph({ children: [new TextRun({ text: 'LOCATARIO', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', locatario?.nom), campo('DNI', locatario?.dni), campo('Email', locatario?.email),
    new Paragraph({ children: [new TextRun({ text: 'GARANTE', bold: true, size: 26, font: 'Arial' })] }),
    campo('Nombre', garante?.nom), campo('DNI', garante?.dni),
    new Paragraph({ children: [new TextRun({ text: 'CONDICIONES', bold: true, size: 26, font: 'Arial' })] }),
    campo('Canon', (contrato?.moneda||'ARS') + ' ' + Number(contrato?.canon).toLocaleString('es-AR')),
    campo('Ajuste', contrato?.ajuste?.toUpperCase()),
    campo('Inicio', contrato?.inicio), campo('Plazo', (contrato?.plazo||'') + ' meses'),
    campo('CBU', contrato?.cbu),
  ]}]})
  return await Packer.toBuffer(doc)
}
