// app/api/download/route.js
// Solo entrega el archivo si el usuario tiene sesión activa verificada en Supabase

import { createServerSupabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // 1. Verificar sesión
    const supabase = await createServerSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Iniciá sesión para descargar.' }, { status: 401 })
    }

    // 2. Verificar que el usuario tiene contratos disponibles
    const { data: profile } = await supabase
      .from('profiles')
      .select('contratos_disponibles, plan')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.contratos_disponibles < 1) {
      return NextResponse.json({ error: 'Sin contratos disponibles. Adquirí un plan.' }, { status: 403 })
    }

    // 3. Recibir datos del contrato
    const { datos, formato } = await request.json()

    // 4. Generar el documento (Word o PDF)
    let buffer, contentType, filename

    if (formato === 'word') {
      buffer = await generarWord(datos, session.user)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      filename = `contrato-locacion-${Date.now()}.docx`
    } else {
      buffer = await generarPDF(datos, session.user)
      contentType = 'application/pdf'
      filename = `contrato-locacion-${Date.now()}.pdf`
    }

    // 5. Guardar registro en DB
    await supabase.from('contratos').insert({
      user_id: session.user.id,
      datos: datos,
      estado: 'generado',
      archivo_word: formato === 'word' ? filename : null,
      archivo_pdf: formato === 'pdf' ? filename : null,
    })

    // 6. Descontar contrato disponible
    await supabase
      .from('profiles')
      .update({ contratos_disponibles: profile.contratos_disponibles - 1 })
      .eq('id', session.user.id)

    // 7. Devolver archivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })

  } catch (err) {
    console.error('Error generando contrato:', err)
    return NextResponse.json({ error: 'Error interno al generar el documento.' }, { status: 500 })
  }
}

// Generador Word con datos del contrato
async function generarWord(datos, user) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel } = await import('docx')

  const { locador, locatario, garante, inmueble, contrato, clausulas } = datos

  function parrafo(texto, options = {}) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160 },
      children: [new TextRun({ text: texto, size: 24, font: 'Arial', ...options })]
    })
  }

  function titulo(texto) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: texto, bold: true, size: 26, font: 'Arial', color: '0A1628' })]
    })
  }

  function campo(label, valor) {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22, font: 'Arial' }),
        new TextRun({ text: valor || '_______________', size: 22, font: 'Arial' })
      ]
    })
  }

  const clausulasActivas = clausulas ? Object.entries(clausulas).filter(([,v]) => v).map(([k]) => k) : []

  const clausulasTexto = {
    exclusivo: 'CLÁUSULA ADICIONAL — USO EXCLUSIVO: El inmueble será destinado única y exclusivamente a uso habitacional del locatario y su grupo familiar conviviente declarado, quedando expresamente prohibida cualquier otra actividad.',
    mascotas: 'CLÁUSULA ADICIONAL — MASCOTAS: Se autoriza la tenencia de mascotas debidamente identificadas y con libreta sanitaria al día. El locatario asume total responsabilidad por daños causados por los animales.',
    no_sub: 'CLÁUSULA ADICIONAL — PROHIBICIÓN DE SUBLOCACIÓN: Queda expresamente prohibido al locatario ceder, sublocar, o permitir el uso del inmueble a terceros bajo cualquier modalidad, incluyendo plataformas de alquiler temporario.',
    rescision: 'CLÁUSULA ADICIONAL — RESCISIÓN ANTICIPADA: El locatario podrá rescindir anticipadamente el presente contrato previo preaviso fehaciente de sesenta (60) días, abonando una penalidad equivalente al diez por ciento (10%) de los alquileres restantes.',
    firma_esc: 'CLÁUSULA ADICIONAL — RATIFICACIÓN: Las partes se obligan a ratificar el presente instrumento ante Escribano Público dentro de los treinta (30) días de la firma, a efectos de otorgarle fecha cierta.',
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 24 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        // Título
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'CONTRATO DE LOCACIÓN DE VIVIENDA', bold: true, size: 32, font: 'Arial' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: `Modelo 2026 — CCyCN arts. 1187-1250 · DNU 70/2023 · Infoleg 2025`, size: 20, font: 'Arial', italics: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: `Generado el ${new Date().toLocaleDateString('es-AR')} para ${user.email}`, size: 18, font: 'Arial', color: '888888' })]
        }),

        // Datos del inmueble
        titulo('OBJETO — INMUEBLE'),
        campo('Domicilio', inmueble?.dom),
        campo('Ciudad / Partido', inmueble?.ciudad),
        campo('Provincia', inmueble?.pcia),
        campo('Tipo', inmueble?.tipo),
        campo('Destino', inmueble?.destino),
        campo('Sup. cubierta', inmueble?.scub ? inmueble.scub + ' m²' : ''),
        campo('Partida inmobiliaria', inmueble?.partida),
        campo('Nomenclatura catastral', inmueble?.nomen),
        campo('Ocupantes declarados', inmueble?.ocupantes),

        // Locador
        titulo('LOCADOR — PROPIETARIO'),
        campo('Nombre y apellido', locador?.nom),
        campo('DNI', locador?.dni),
        campo('CUIT/CUIL', locador?.cuit),
        campo('Estado civil', locador?.ec),
        campo('Domicilio', locador?.dom),
        campo('Email', locador?.email),
        campo('Teléfono', locador?.tel),

        // Locatario
        titulo('LOCATARIO — INQUILINO'),
        campo('Nombre y apellido', locatario?.nom),
        campo('DNI', locatario?.dni),
        campo('CUIT/CUIL', locatario?.cuit),
        campo('Estado civil', locatario?.ec),
        campo('Domicilio', locatario?.dom),
        campo('Email', locatario?.email),

        // Garantía
        titulo('GARANTÍA'),
        campo('Tipo de garantía', { inmueble_pba: 'Inmueble Pcia. Bs.As. — Renuncia Ley 14.432', prop_otro: 'Propietario otra jurisdicción', aval_ban: 'Aval bancario', seg_caucion: 'Seguro de caución' }[garante?.tipo] || ''),
        campo('Garante', garante?.nom),
        campo('DNI garante', garante?.dni),
        garante?.imb ? campo('Inmueble en garantía', garante.imb) : parrafo(''),
        garante?.mat ? campo('Matrícula registral', garante.mat) : parrafo(''),

        // Condiciones económicas
        titulo('CONDICIONES ECONÓMICAS'),
        campo('Canon mensual', contrato?.canon ? `${contrato.moneda} ${Number(contrato.canon).toLocaleString('es-AR')}` : ''),
        campo('Tipo de ajuste', contrato?.ajuste?.toUpperCase()),
        campo('Periodicidad', contrato?.periodo),
        campo('Fecha de inicio', contrato?.inicio),
        campo('Plazo', contrato?.plazo ? contrato.plazo + ' meses' : ''),
        campo('Depósito en garantía', contrato?.deposito ? contrato.deposito + ' mes(es)' : ''),
        campo('Pago del día', contrato?.pag_d ? `${contrato.pag_d} al ${contrato.pag_h} de cada mes` : ''),
        campo('CBU', contrato?.cbu),
        campo('Alias', contrato?.alias),
        campo('Banco', contrato?.banco),

        // Cláusulas del modelo base
        titulo('CLÁUSULAS GENERALES'),
        parrafo('PRIMERA — OBJETO: El locador entrega al locatario el inmueble individualizado precedentemente, en el estado en que se encuentra, con el inventario que se adjunta como Anexo 1.'),
        parrafo(`SEGUNDA — DESTINO: El inmueble será destinado ${inmueble?.destino === 'apto_profesional' ? 'a vivienda y actividad profesional compatible' : 'exclusivamente a vivienda del locatario'} y de ${inmueble?.ocupantes || 'los ocupantes declarados'}, con expresa prohibición de cualquier otro uso.`),
        parrafo(`TERCERA — PLAZO: El presente contrato tendrá una duración de ${contrato?.plazo || '24'} meses a partir del ${contrato?.inicio || '______'}, operándose su vencimiento de pleno derecho sin necesidad de interpelación alguna.`),
        parrafo(`CUARTA — PRECIO Y ACTUALIZACIÓN: El canon locativo mensual inicial será de ${contrato?.moneda || 'ARS'} ${Number(contrato?.canon).toLocaleString('es-AR') || '______'}, ajustable en forma ${contrato?.periodo || 'trimestral'} mediante el índice ${contrato?.ajuste?.toUpperCase() || 'IPC'}, conforme al DNU 70/2023 y la normativa vigente publicada en Infoleg.`),
        parrafo(`QUINTA — FORMA DE PAGO: El canon deberá abonarse del día ${contrato?.pag_d || '1'} al ${contrato?.pag_h || '5'} de cada mes mediante transferencia bancaria a la cuenta CBU ${contrato?.cbu || '______'}, Alias: ${contrato?.alias || '______'}, Banco ${contrato?.banco || '______'}, titular ${contrato?.tit_cbu || '______'}. La mora será automática por el solo vencimiento del plazo (art. 886 CCyCN).`),
        parrafo('SEXTA — SUMINISTROS: Los gastos de luz, gas, agua, teléfono y demás servicios estarán a exclusivo cargo del locatario.'),
        parrafo('SÉPTIMA — INCUMPLIMIENTO: El incumplimiento de cualquier obligación contractual por parte del locatario facultará al locador a resolver el contrato de pleno derecho (art. 1086 CCyCN).'),
        parrafo('OCTAVA — INTRANSFERIBILIDAD: Queda prohibida la cesión, sublocación o cualquier otra forma de transferencia total o parcial del uso del inmueble.'),
        parrafo('NOVENA — MEJORAS: Toda mejora que introduzca el locatario, con o sin autorización del locador, cederá en beneficio de la propiedad sin derecho a compensación.'),
        parrafo('DÉCIMA — FALTA DE RESTITUCIÓN: Si al vencimiento del contrato el locatario no restituyere el inmueble, deberá abonar el equivalente al doble del canon mensual por cada mes o fracción de demora, más intereses.'),
        parrafo('UNDÉCIMA — SOLIDARIDAD: El locatario y los fiadores responden solidariamente por todas las obligaciones emergentes del presente contrato.'),
        parrafo(`DUODÉCIMA — GARANTÍA: ${garante?.nom || '______'}, DNI ${garante?.dni || '______'}, se constituye en garante y fiador solidario del locatario, renunciando expresamente a los beneficios de excusión y división.`),
        parrafo('DÉCIMO TERCERA — IMPUESTOS Y TASAS: Todos los impuestos, tasas y contribuciones sobre el inmueble estarán a cargo del locatario.'),
        parrafo(`DÉCIMO CUARTA — DEPÓSITO EN GARANTÍA: Al momento de la firma, el locatario entrega en concepto de depósito en garantía la suma equivalente a ${contrato?.deposito || '1'} mes(es) de canon, que será devuelta dentro de los sesenta (60) días de restituido el inmueble, deducidos los importes correspondientes a daños o deudas (art. 1196 CCyCN).`),
        parrafo('DÉCIMO QUINTA — RESOLUCIÓN ANTICIPADA: El locatario podrá resolver el contrato con preaviso fehaciente de sesenta (60) días.'),
        parrafo('DÉCIMO SEXTA — ESTADO DEL BIEN: El locatario recibirá el inmueble en el estado detallado en el Anexo 1 (inventario fotográfico) y deberá restituirlo en igual estado.'),
        parrafo('DÉCIMO SÉPTIMA — ENTREGA DE LLAVES: Solo se tendrá por válidamente realizada la entrega de llaves cuando el locador otorgue constancia escrita de su recepción.'),
        parrafo('DÉCIMO OCTAVA — SEGURO: El locatario deberá contratar a su cargo un seguro contra incendio y responsabilidad civil frente a terceros.'),
        parrafo('DÉCIMO NOVENA — USO Y REGLAMENTO: El locatario se obliga a respetar el reglamento de copropiedad, las normas de convivencia y toda disposición legal aplicable.'),
        parrafo('VIGÉSIMA — REPARACIONES: El locador o sus representantes podrán acceder al inmueble para realizar reparaciones necesarias, previo aviso.'),
        parrafo(`VIGÉSIMA PRIMERA — JURISDICCIÓN: Para todos los efectos legales derivados del presente contrato, las partes se someten a la jurisdicción de los Tribunales competentes de ${inmueble?.ciudad || '______'}.`),
        parrafo('VIGÉSIMA SEGUNDA — COMUNICACIONES ELECTRÓNICAS: Las notificaciones cursadas por medios electrónicos a las direcciones de email consignadas tendrán plena validez entre las partes.'),
        parrafo('VIGÉSIMA TERCERA — EJEMPLARES: Se firman tres (3) ejemplares de igual tenor y a un solo efecto, uno para cada parte, junto con el Anexo 1 de inventario fotográfico.'),

        // Cláusulas opcionales activadas
        ...(clausulasActivas.length > 0 ? [titulo('CLÁUSULAS OPCIONALES')] : []),
        ...clausulasActivas.map(k => clausulasTexto[k] ? parrafo(clausulasTexto[k]) : parrafo('')),

        // Firmas
        titulo('FIRMAS'),
        new Paragraph({ spacing: { before: 600 }, children: [] }),
        parrafo(`En __________________, a los _____ días del mes de __________________ de ${new Date().getFullYear()}.`),
        new Paragraph({ spacing: { before: 800 }, children: [] }),

        new Paragraph({
          children: [
            new TextRun({ text: '________________________          ', size: 22, font: 'Arial' }),
            new TextRun({ text: '________________________', size: 22, font: 'Arial' }),
          ]
        }),
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({ text: `LOCADOR — ${locador?.nom || ''}          `, size: 20, font: 'Arial' }),
            new TextRun({ text: `LOCATARIO — ${locatario?.nom || ''}`, size: 20, font: 'Arial' }),
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `DNI: ${locador?.dni || '___________'}          `, size: 20, font: 'Arial' }),
            new TextRun({ text: `DNI: ${locatario?.dni || '___________'}`, size: 20, font: 'Arial' }),
          ]
        }),
        new Paragraph({ spacing: { before: 600 }, children: [] }),
        new Paragraph({
          children: [new TextRun({ text: '________________________', size: 22, font: 'Arial' })]
        }),
        new Paragraph({
          children: [new TextRun({ text: `GARANTE — ${garante?.nom || ''}`, size: 20, font: 'Arial' })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: `DNI: ${garante?.dni || '___________'}`, size: 20, font: 'Arial' })]
        }),

        // Pie legal
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [new TextRun({ text: 'Contrato PRO MADERNA — Modelo 2026 — Respaldado por martillera corredora y perito judicial', size: 18, font: 'Arial', italics: true, color: '888888' })]
        }),
      ]
    }]
  })

  return await Packer.toBuffer(doc)
}

async function generarPDF(datos, user) {
  // Para PDF se genera el Word y se convierte
  // En producción usar LibreOffice headless o una API de conversión
  const wordBuffer = await generarWord(datos, user)
  return wordBuffer // placeholder — en producción convertir
}
