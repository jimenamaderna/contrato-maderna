'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Contrato() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState({
    inmueble: { dom: '', ciudad: '', pcia: 'Buenos Aires', tipo: 'departamento', destino: 'vivienda', scub: '', stot: '', partida: '', nomen: '', ocupantes: '' },
    locador: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    locatario: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    garante: { tipo: 'inmueble_pba', nom: '', dni: '', dom: '' },
    contrato: { canon: '', moneda: 'ARS', ajuste: 'ipc', periodo: 'trimestral', inicio: '', plazo: '24', deposito: '1', pag_d: '1', pag_h: '5', cbu: '', alias: '', banco: '', tit_cbu: '' },
    clausulas: {}
  })

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
    }
    check()
  }, [])

  function upd(section, key, val) {
    setData(p => ({ ...p, [section]: { ...p[section], [key]: val } }))
  }

  const steps = ['Inmueble','Locador','Locatario','Garantia','Contrato','Clausulas','Descargar']

  async function descargar(formato) {
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: data, formato })
      })
      if (res.status === 401) { setError('Seson expirada. Iniciá sesion.'); router.push('/login'); return }
      if (res.status === 403) { setError('Sin contratos disponibles. Compra un plan.'); return }
      if (!res.ok) { setError('Error al generar el documento.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = formato === 'word' ? 'contrato-locacion.docx' : 'contrato-locacion.pdf'
      document.body.appendChild(a); a.click()
      URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { setError('Error de conexion.') }
    setLoading(false)
  }

  const inp = (section, key) => ({
    value: data[section][key] || '',
    onChange: e => upd(section, key, e.target.value),
    style: { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(10,22,40,.2)', borderRadius: 6, fontFamily: 'inherit' }
  })

  const sel = (section, key, opts) => (
    <select {...inp(section, key)} onChange={e => upd(section, key, e.target.value)}>
      {opts.map(o => <option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
    </select>
  )

  const fg = (label, child, req) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 9 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}{req && <span style={{ color: '#C9A84C', marginLeft: 2 }}>*</span>}</label>
      {child}
    </div>
  )

  const panels = [
    // 0 Inmueble
    <div key={0}>
      {fg('Domicilio completo', <input {...inp('inmueble','dom')} placeholder="Calle N, piso/dpto, Localidad"/>, true)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Ciudad / Partido', <input {...inp('inmueble','ciudad')} placeholder="Ej: Tigre"/>)}
        {fg('Provincia', sel('inmueble','pcia',['Buenos Aires','CABA','Cordoba','Santa Fe','Mendoza','Otra']))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Tipo', sel('inmueble','tipo',[{v:'departamento',l:'Departamento'},{v:'casa',l:'Casa'},{v:'ph',l:'PH'},{v:'local',l:'Local'}]))}
        {fg('Destino', sel('inmueble','destino',[{v:'vivienda',l:'Vivienda familiar'},{v:'apto_profesional',l:'Apto profesional'}]))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Sup. cubierta (m2)', <input {...inp('inmueble','scub')} placeholder="Ej: 65"/>)}
        {fg('Partida inmobiliaria', <input {...inp('inmueble','partida')} placeholder="N de partida"/>)}
      </div>
      {fg('Ocupantes declarados', <input {...inp('inmueble','ocupantes')} placeholder="Nombres de quienes habitaran"/>, true)}
    </div>,

    // 1 Locador
    <div key={1}>
      {fg('Apellido y nombre completo', <input {...inp('locador','nom')} placeholder="Tal como figura en el DNI"/>, true)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('DNI', <input {...inp('locador','dni')} placeholder="XX.XXX.XXX"/>, true)}
        {fg('CUIT / CUIL', <input {...inp('locador','cuit')} placeholder="20-XXXXXXXX-X"/>)}
      </div>
      {fg('Estado civil', sel('locador','ec',['soltero/a','casado/a','divorciado/a','viudo/a','union convivencial']))}
      {fg('Domicilio real', <input {...inp('locador','dom')} placeholder="Calle N, Localidad"/>)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Email', <input {...inp('locador','email')} placeholder="email@ejemplo.com" type="email"/>, true)}
        {fg('Telefono', <input {...inp('locador','tel')} placeholder="+54 11 XXXX-XXXX"/>)}
      </div>
    </div>,

    // 2 Locatario
    <div key={2}>
      {fg('Apellido y nombre completo', <input {...inp('locatario','nom')} placeholder="Tal como figura en el DNI"/>, true)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('DNI', <input {...inp('locatario','dni')} placeholder="XX.XXX.XXX"/>, true)}
        {fg('CUIT / CUIL', <input {...inp('locatario','cuit')} placeholder="20-XXXXXXXX-X"/>)}
      </div>
      {fg('Estado civil', sel('locatario','ec',['soltero/a','casado/a','divorciado/a','viudo/a','union convivencial']))}
      {fg('Domicilio real', <input {...inp('locatario','dom')} placeholder="Calle N, Localidad"/>)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Email', <input {...inp('locatario','email')} placeholder="email@ejemplo.com" type="email"/>, true)}
        {fg('Telefono', <input {...inp('locatario','tel')} placeholder="+54 11 XXXX-XXXX"/>)}
      </div>
    </div>,

    // 3 Garantia
    <div key={3}>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Tipo de garantia</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
          {[{v:'inmueble_pba',l:'Inmueble PBA'},{v:'prop_otro',l:'Propietario otro'},{v:'aval_ban',l:'Aval bancario'},{v:'seg_caucion',l:'Seguro caucion'}].map(t => (
            <div key={t.v} onClick={() => upd('garante','tipo',t.v)}
              style={{ padding: '.6rem', border: data.garante.tipo===t.v ? '1.5px solid #C9A84C' : '0.5px solid rgba(10,22,40,.15)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: data.garante.tipo===t.v ? '#F5EDD8' : '#F8F9FB', fontSize: 12, fontWeight: 500, color: '#0A1628' }}>
              {t.l}
            </div>
          ))}
        </div>
      </div>
      {fg('Nombre del garante', <input {...inp('garante','nom')} placeholder="Apellido y nombre"/>, true)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('DNI del garante', <input {...inp('garante','dni')} placeholder="XX.XXX.XXX"/>)}
        {fg('Domicilio', <input {...inp('garante','dom')} placeholder="Calle N, Localidad"/>)}
      </div>
    </div>,

    // 4 Contrato
    <div key={4}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Canon mensual', <input {...inp('contrato','canon')} placeholder="Ej: 280000" type="number"/>, true)}
        {fg('Moneda', sel('contrato','moneda',[{v:'ARS',l:'Pesos'},{v:'USD',l:'Dolares'}]))}
      </div>
      {fg('Tipo de ajuste', sel('contrato','ajuste',[{v:'ipc',l:'IPC (INDEC)'},{v:'ipcba',l:'IPCBA (CABA)'},{v:'escalonado',l:'Escalonado'},{v:'fijo',l:'% Fijo'},{v:'mixto',l:'Mixto'},{v:'sin_ajuste',l:'Sin ajuste'}]))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Periodicidad ajuste', sel('contrato','periodo',[{v:'trimestral',l:'Trimestral'},{v:'cuatrimestral',l:'Cuatrimestral'},{v:'semestral',l:'Semestral'},{v:'anual',l:'Anual'}]))}
        {fg('Fecha de inicio', <input {...inp('contrato','inicio')} type="date"/>, true)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Plazo', sel('contrato','plazo',[{v:'24',l:'24 meses'},{v:'36',l:'36 meses'},{v:'48',l:'48 meses'},{v:'60',l:'60 meses'}]))}
        {fg('Deposito en garantia', sel('contrato','deposito',[{v:'1',l:'1 mes'},{v:'2',l:'2 meses'},{v:'3',l:'3 meses'}]))}
      </div>
      {fg('CBU del locador', <input {...inp('contrato','cbu')} placeholder="22 digitos"/>)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {fg('Alias', <input {...inp('contrato','alias')} placeholder="alias.cuenta"/>)}
        {fg('Banco', <input {...inp('contrato','banco')} placeholder="Ej: Banco Galicia"/>)}
      </div>
    </div>,

    // 5 Clausulas
    <div key={5}>
      <p style={{ fontSize: 12, color: '#4A5568', marginBottom: 12 }}>Selecciona las clausulas opcionales para incluir en el contrato:</p>
      {[
        {id:'exclusivo',n:'Uso exclusivo y grupo familiar'},
        {id:'mascotas',n:'Mascotas + anexo libreta sanitaria'},
        {id:'no_sub',n:'Prohibicion de sublocacion'},
        {id:'rescision',n:'Rescision anticipada (penalidad 10%)'},
        {id:'inventario',n:'Anexo inventario fotografico'},
        {id:'firma_esc',n:'Ratificacion ante Escribano Publico'},
      ].map(cl => (
        <div key={cl.id} onClick={() => setData(p => ({ ...p, clausulas: { ...p.clausulas, [cl.id]: !p.clausulas[cl.id] } }))}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.65rem .85rem', border: data.clausulas[cl.id] ? '1.5px solid #C9A84C' : '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, background: data.clausulas[cl.id] ? '#F5EDD8' : '#F8F9FB', cursor: 'pointer', marginBottom: 7 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: data.clausulas[cl.id] ? 'none' : '1.5px solid rgba(10,22,40,.2)', background: data.clausulas[cl.id] ? '#C9A84C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#0A1628', flexShrink: 0 }}>
            {data.clausulas[cl.id] ? '✓' : ''}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>{cl.n}</span>
        </div>
      ))}
    </div>,

    // 6 Descargar
    <div key={6}>
      <div style={{ background: '#0A1628', borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: '.35rem' }}>Contrato listo para generar</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: '1.1rem', lineHeight: 1.5 }}>
          Modelo 2026 · CCyCN arts. 1187-1250 · DNU 70/2023<br/>
          Respaldado por martillera corredora y perito judicial
        </div>
        {error && <div style={{ background: 'rgba(240,149,149,.15)', border: '0.5px solid rgba(240,149,149,.4)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#F09595', marginBottom: '.9rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => descargar('word')} disabled={loading}
            style={{ padding: '11px 24px', background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Generando...' : 'Descargar Word'}
          </button>
          <button onClick={() => descargar('pdf')} disabled={loading}
            style={{ padding: '11px 24px', background: 'transparent', color: '#fff', border: '0.5px solid rgba(255,255,255,.25)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1, fontFamily: 'inherit' }}>
            Descargar PDF
          </button>
        </div>
      </div>
      <div style={{ background: '#F5EDD8', border: '0.5px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '.75rem 1rem', fontSize: 11, color: '#4A5568', textAlign: 'center' }}>
        La descarga requiere sesion activa y contratos disponibles en tu plan.
      </div>
    </div>
  ]

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: 14, color: '#4A5568' }}>Cargando...</div></div>

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB' }}>
      <div style={{ background: '#0A1628', padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#C9A84C', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Tu contrato de locacion vivienda</div>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: '3px 8px', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 4, background: 'transparent', fontFamily: 'inherit' }}>
          Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 580, margin: '1.5rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', marginBottom: '1rem', gap: 4 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#C9A84C' : 'rgba(10,22,40,.1)', transition: 'background .3s' }}/>
          ))}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.5rem' }}>Paso {step + 1} de {steps.length}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#0A1628', marginBottom: '1.25rem' }}>{steps[step]}</div>
          {panels[step]}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(p => Math.max(0, p-1))} style={{ visibility: step === 0 ? 'hidden' : 'visible', padding: '8px 18px', borderRadius: 8, border: '0.5px solid rgba(10,22,40,.2)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Anterior
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => setStep(p => Math.min(steps.length-1, p+1))}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#0A1628', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
