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

    // Verificar sesion
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { datos } = await request.json()
    const { locador, locatario, garante, inmueble, contrato } = datos

    // Calcular fecha de vencimiento
    const hoy = new Date()
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

    const variables = {
      ciudad: inmueble?.ciudad || '',
      dd: String(hoy.getDate()).padStart(2,'0'),
      mes: meses[hoy.getMonth()],
      aa: String(hoy.getFullYear()).slice(2),
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
      garante_nom: datos.garantes?.[0]?.nom || '',
      garante_nom2: datos.garantes?.[1]?.nom || '',
      garante_dni: datos.garantes?.[0]?.dni || '',
      garante_dom: datos.garantes?.[0]?.dom || '',
      garante_imb: datos.garantes?.[0]?.imb || '',
      garante_mat: datos.garantes?.[0]?.mat || '',
      garante_partido: datos.garantes?.[0]?.partido || '',
      canon: contrato?.canon ? contrato.canon : '',
      moneda: contrato?.moneda || 'ARS',
      ajuste: contrato?.ajuste ? contrato.ajuste.toUpperCase() : '',
      periodo: contrato?.periodo || '',
      inicio: contrato?.inicio ? new Date(contrato.inicio).toLocaleDateString('es-AR') : '',
      fecha_venc: contrato?.vencimiento ? new Date(contrato.vencimiento).toLocaleDateString('es-AR') : '',
      deposito: contrato?.deposito_monto || '',
      deposito_moneda: contrato?.deposito_moneda || 'ARS',
      deposito_dias: contrato?.deposito_dias || '60',
      tit_cbu: contrato?.tit_cbu || '',
      banco: contrato?.banco || '',
      sucursal: '',
      cbu: contrato?.cbu || '',
      alias: contrato?.alias || '',
      pag_d: '1',
      pag_h: '5',
    }

    // Obtener modelo activo
    const { data: modelo } = await supabase
      .from('contratos_modelo')
      .select('filename')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let buffer

    if (modelo?.filename) {
      const { data: fileData, error: fileError } = await supabase
        .storage.from('contratos-modelo').download(modelo.filename)

      if (!fileError && fileData) {
        try {
          const PizZip = (await import('pizzip')).default
          const Docxtemplater = (await import('docxtemplater')).default
          const arrayBuffer = await fileData.arrayBuffer()
          const zip = new PizZip(arrayBuffer)
          const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
            nullGetter() { return '' },
          })
          doc.render(variables)
          buffer = doc.getZip().generate({ type: 'nodebuffer' })
        } catch (e) {
          console.error('Error template preview:', e.message)
        }
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: 'No se pudo generar el preview' }, { status: 500 })
    }

    // Subir al bucket publico de previews con nombre unico
    const filename = 'preview-' + session.user.id + '-' + Date.now() + '.docx'
    const { error: uploadError } = await supabase.storage
      .from('previews')
      .upload(filename, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Error al subir preview: ' + uploadError.message }, { status: 500 })
    }

    // Obtener la URL publica del archivo
    const { data: urlData } = supabase.storage.from('previews').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    // Google Docs Viewer acepta cualquier URL publica de docx
    const viewerUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent(publicUrl) + '&embedded=true'

    return NextResponse.json({ viewerUrl, publicUrl })

  } catch (err) {
    console.error('Error preview:', err.message)
    return NextResponse.json({ error: 'Error interno: ' + err.message }, { status: 500 })
  }
}
