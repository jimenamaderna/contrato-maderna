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
      .from('profiles')
      .select('contratos_disponibles')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.contratos_disponibles < 1)
      return NextResponse.json({ error: 'Sin contratos disponibles. Compra un plan.' }, { status: 403 })

    const { datos } = await request.json()
    const { locador, locatario, garante, inmueble, contrato } = datos

    // Fecha de hoy formateada
    const hoy = new Date()
    const dd = String(hoy.getDate()).padStart(2, '0')
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const mes = meses[hoy.getMonth()]
    const aa = String(hoy.getFullYear()).slice(2)
    const anio = String(hoy.getFullYear())

    // Fecha de vencimiento calculada
    let fechaVenc = ''
    if (contrato?.inicio && contrato?.plazo) {
      const inicio = new Date(contrato.inicio)
      inicio.setMonth(inicio.getMonth() + parseInt(contrato.plazo))
      fechaVenc = inicio.toLocaleDateString('es-AR')
    }

    // Variables para reemplazar en el template
    const variables = {
      ciudad: inmueble?.ciudad || '',
      dd: dd,
      mes: mes,
      aa: aa,
      anio: anio,
      locador_nom: locador?.nom || '',
      locador_dni: locador?.dni || '',
      locador_cuit: locador?.cuit || '',
      locador_ec: locador?.ec || '',
      locador_dom: locador?.dom || '',
      locador_email: locador?.email || '',
      locador_tel: locador?.tel || '',
      locatario_nom: locatario?.nom || '',
      locatario_dni: locatario?.dni || '',
      locatario_cuit: locatario?.cuit || '',
      locatario_ec: locatario?.ec || '',
      locatario_dom: locatario?.dom || '',
      locatario_email: locatario?.email || '',
      inmueble_dom: inmueble?.dom || '',
      inmueble_ciudad: inmueble?.ciudad || '',
      inmueble_pcia: inmueble?.pcia || '',
      inmueble_tipo: inmueble?.tipo || '',
      inmueble_ocupantes: datos.inmueble_ocupantes_texto || '',
      garante_nom: garante?.nom || '',
      garante_nom2: garante?.nom2 || '',
      garante_dni: garante?.dni || '',
      garante_dom: garante?.dom || '',
      garante_imb: garante?.imb || '',
      garante_mat: garante?.mat || '',
      garante_partido: garante?.partido || '',
      canon: contrato?.canon ? Number(contrato.canon).toLocaleString('es-AR') : '',
      moneda: contrato?.moneda || 'ARS',
      ajuste: contrato?.ajuste ? contrato.ajuste.toUpperCase() : '',
      periodo: contrato?.periodo || '',
      inicio: contrato?.inicio ? new Date(contrato.inicio).toLocaleDateString('es-AR') : '',
      fecha_venc: fechaVenc,
      plazo: contrato?.plazo || '',
      deposito: contrato?.deposito || '',
      tit_cbu: contrato?.tit_cbu || '',
      banco: contrato?.banco || '',
      sucursal: '',
      cbu: contrato?.cbu || '',
      alias: contrato?.alias || '',
      pag_d: contrato?.pag_d || '1',
      pag_h: contrato?.pag_h || '5',
    }

    // Buscar el modelo activo en Supabase Storage
    const { data: modelo } = await supabase
      .from('contratos_modelo')
      .select('filename')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let buffer

    if (modelo?.filename) {
      // Descargar el .docx del storage
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('contratos-modelo')
        .download(modelo.filename)

      if (!fileError && fileData) {
        try {
          const PizZip = (await import('pizzip')).default
          const Docxtemplater = (await import('docxtemplater')).default

          const arrayBuffer = await fileData.arrayBuffer()
          const zip = new PizZip(arrayBuffer)

          // Usar llaves simples { } como delimitadores
          const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
            // Si una variable no existe, dejarla en blanco
            nullGetter() { return '' },
          })

          doc.render(variables)
          buffer = doc.getZip().generate({ type: 'nodebuffer' })
        } catch (templateError) {
          console.error('ERROR TEMPLATE DETALLADO:', templateError.message, templateError.stack, JSON.stringify(templateError.properties))
          // Si falla el template, generar básico
          buffer = null
        }
      }
    }

    // Fallback: si no hay modelo o falló el template, generar básico
    if (!buffer) {
      buffer = await generarWordBasico(variables)
    }

    // Registrar y descontar
    await supabase.from('contratos').insert({
      user_id: session.user.id,
      datos: datos,
      estado: 'generado',
    })

    await supabase
      .from('profiles')
      .update({ contratos_disponibles: profile.contratos_disponibles - 1 })
      .eq('id', session.user.id)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="contrato-locacion.docx"',
      }
    })

  } catch (err) {
    console.error('ERROR:', err.message, err.stack)
    return NextResponse.json({ error: 'Error: ' + err.message }, { status: 500 })
  }
}

async function generarWordBasico(v) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx')

  function campo(label, valor) {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: label + ': ', bold: true, size: 22, font: 'Arial' }),
        new TextRun({ text: valor || '', size: 22, font: 'Arial' })
      ]
    })
  }

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'CONTRATO DE LOCACION DE VIVIENDA', bold: true, size: 32, font: 'Arial' })]
        }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'LOCADOR', bold: true, size: 26, font: 'Arial' })] }),
        campo('Nombre', v.locador_nom), campo('DNI', v.locador_dni), campo('Email', v.locador_email),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'LOCATARIO', bold: true, size: 26, font: 'Arial' })] }),
        campo('Nombre', v.locatario_nom), campo('DNI', v.locatario_dni), campo('Email', v.locatario_email),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'INMUEBLE', bold: true, size: 26, font: 'Arial' })] }),
        campo('Domicilio', v.inmueble_dom), campo('Ciudad', v.ciudad), campo('Ocupantes', v.inmueble_ocupantes),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'GARANTIA', bold: true, size: 26, font: 'Arial' })] }),
        campo('Garante', v.garante_nom), campo('DNI', v.garante_dni),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'CONDICIONES', bold: true, size: 26, font: 'Arial' })] }),
        campo('Canon', v.moneda + ' ' + v.canon),
        campo('Ajuste', v.ajuste + ' ' + v.periodo),
        campo('Inicio', v.inicio), campo('Plazo', v.plazo + ' meses'),
        campo('CBU', v.cbu), campo('Alias', v.alias),
      ]
    }]
  })
  return await Packer.toBuffer(doc)
}

