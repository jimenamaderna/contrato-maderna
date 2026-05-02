'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const inpSt = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(10,22,40,.2)', borderRadius: 6, fontFamily: 'inherit', background: '#fff' }
const lbSt = { fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }
const STEPS = ['Inmueble', 'Locador', 'Locatario', 'Contrato', 'Garantia', 'Inventario', 'Descargar']
const TIPOS_GAR = [
  { v: 'provincial', l: 'Inmueble Provincial (PBA)' },
  { v: 'caba', l: 'Inmueble CABA' },
  { v: 'juridica', l: 'Persona Juridica' },
  { v: 'caucion', l: 'Seguro de Caucion' },
  { v: 'aval', l: 'Aval Bancario' },
]
const AMBIENTES = ['Hall / Entrada','Living comedor','Dormitorio principal','Dormitorio 2','Cocina','Bano completo','Lavadero','Jardin / Patio','Artefactos','Fachada exterior']
const EC_OPTS = ['soltero/a','casado/a','divorciado/a','viudo/a','union convivencial']

function initGarante() {
  return { nom: '', dni: '', cuit: '', dom: '', tipo_gar: 'provincial', imb: '', mat: '', partido: '', razon_social: '', caucion_comp: '', caucion_pol: '', caucion_monto: '', aval_banco: '', aval_num: '' }
}

function initData() {
  return {
    inmueble: { dom: '', ciudad: '', pcia: 'Buenos Aires', tipo: 'departamento', scub: '', partida: '' },
    mascotas: { tiene: false, descripcion: '' },
    ocupantes: [{ nom: '', dni: '' }],
    locador: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    locatario: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    garantes: [initGarante()],
    contrato: { canon: '', moneda: 'ARS', ajuste: 'ipc', periodo: 'trimestral', inicio: '', vencimiento: '', deposito_monto: '', deposito_moneda: 'ARS', deposito_dias: '60', tit_cbu: '', banco: '', cbu: '', alias: '' },
    // Guardamos los objetos File para poder mostrarlos en preview
    inventario_files: [],
    mascotas_files: []
  }
}

export default function Contrato() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [valErr, setValErr] = useState('')
  const [preview, setPreview] = useState(false)
  const [data, setData] = useState(initData)
  // URLs temporales de las fotos para mostrar en preview
  const [invUrls, setInvUrls] = useState([])
  const [mscUrls, setMscUrls] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else setUser(session.user)
    })
  }, [])

  // Limpiamos las URLs cuando el componente se desmonta para evitar memory leaks
  useEffect(() => {
    return () => {
      invUrls.forEach(url => url && URL.revokeObjectURL(url))
      mscUrls.forEach(url => url && URL.revokeObjectURL(url))
    }
  }, [invUrls, mscUrls])

  const upd = (sec, key, val) => setData(p => ({ ...p, [sec]: { ...p[sec], [key]: val } }))
  const updOc = (i, k, v) => setData(p => { const a = [...p.ocupantes]; a[i] = { ...a[i], [k]: v }; return { ...p, ocupantes: a } })
  const addOc = () => setData(p => ({ ...p, ocupantes: [...p.ocupantes, { nom: '', dni: '' }] }))
  const remOc = (i) => setData(p => ({ ...p, ocupantes: p.ocupantes.filter((_, j) => j !== i) }))
  const updGar = (i, k, v) => setData(p => { const a = [...p.garantes]; a[i] = { ...a[i], [k]: v }; return { ...p, garantes: a } })
  const addGar = () => setData(p => ({ ...p, garantes: [...p.garantes, initGarante()] }))
  const remGar = (i) => setData(p => ({ ...p, garantes: p.garantes.filter((_, j) => j !== i) }))

  // Cuando el usuario selecciona una foto, guardamos el File y creamos una URL temporal
  function selFoto(tipo, i) {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return
      const url = URL.createObjectURL(f)
      if (tipo === 'inv') {
        setData(p => { const a = [...p.inventario_files]; a[i] = f; return { ...p, inventario_files: a } })
        setInvUrls(p => { const a = [...p]; if (a[i]) URL.revokeObjectURL(a[i]); a[i] = url; return a })
      } else {
        setData(p => { const a = [...p.mascotas_files]; a[i] = f; return { ...p, mascotas_files: a } })
        setMscUrls(p => { const a = [...p]; if (a[i]) URL.revokeObjectURL(a[i]); a[i] = url; return a })
      }
    }
    inp.click()
  }

  const textoOc = () => data.ocupantes.filter(o => o.nom.trim()).map(o => o.nom.trim() + (o.dni.trim() ? ' DNI ' + o.dni.trim() : '')).join(', ')
  const fmtNum = (raw) => raw.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')
  const fmtFecha = (d) => { if (!d) return ''; const [y,m,dd] = d.split('-'); return dd+'/'+m+'/'+y }
  const canon = () => (data.contrato.moneda === 'USD' ? 'U ' : '$ ') + (data.contrato.canon || '—')
  const deposito = () => (data.contrato.deposito_moneda === 'USD' ? 'U ' : '$ ') + (data.contrato.deposito_monto || '—')

  const validations = [
    () => !data.inmueble.dom ? 'El domicilio del inmueble es obligatorio.' : !data.ocupantes[0]?.nom ? 'Debe cargar al menos un ocupante.' : '',
    () => !data.locador.nom ? 'El nombre del locador es obligatorio.' : !data.locador.dni ? 'El DNI del locador es obligatorio.' : !data.locador.email ? 'El email del locador es obligatorio.' : '',
    () => !data.locatario.nom ? 'El nombre del locatario es obligatorio.' : !data.locatario.dni ? 'El DNI del locatario es obligatorio.' : !data.locatario.email ? 'El email del locatario es obligatorio.' : '',
    () => !data.contrato.canon ? 'El canon mensual es obligatorio.' : !data.contrato.inicio ? 'La fecha de inicio es obligatoria.' : !data.contrato.vencimiento ? 'La fecha de vencimiento es obligatoria.' : '',
    () => !data.garantes[0]?.nom ? 'Debe cargar al menos un garante.' : '',
    () => '', () => ''
  ]

  function siguiente() {
    const err = validations[step]()
    if (err) { setValErr(err); return }
    setValErr('')
    if (step === STEPS.length - 1) { verPreview(); return }
    setStep(p => p + 1)
  }

  async function verPreview() {
    setLoading(true); setError("")
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/login"); return }
    try {
      const payload = { ...data, inmueble_ocupantes_texto: textoOc(), inventario_files: undefined, mascotas_files: undefined }
      const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datos: payload }) })
      if (!res.ok) { const e = await res.json(); setError(e.error || "Error al generar la vista previa."); setLoading(false); return }
      const { viewerUrl } = await res.json()
      window.open(viewerUrl, "_blank")
    } catch { setError("Error de conexion.") }
    setLoading(false)
  }

  async function descargar(fmt) {
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      const payload = { ...data, inmueble_ocupantes_texto: textoOc(), inventario_files: undefined, mascotas_files: undefined }
      const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: payload, formato: fmt }) })
      if (res.status === 401) { setError('Sesion expirada.'); router.push('/login'); return }
      if (res.status === 403) { setError('Sin contratos disponibles. Compra un plan.'); return }
      if (!res.ok) { setError('Error al generar el documento.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'contrato-locacion.docx'
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { setError('Error de conexion.') }
    setLoading(false)
  }

  function personaJSX(sec) {
    return <>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Apellido y nombre <span style={{ color: '#C9A84C' }}>*</span></label><input value={data[sec].nom} onChange={e => upd(sec,'nom',e.target.value)} placeholder="Tal como figura en el DNI" style={inpSt}/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
        <div><label style={lbSt}>DNI <span style={{ color: '#C9A84C' }}>*</span></label><input value={data[sec].dni} onChange={e => upd(sec,'dni',e.target.value)} placeholder="XX.XXX.XXX" style={inpSt}/></div>
        <div><label style={lbSt}>CUIT / CUIL</label><input value={data[sec].cuit} onChange={e => upd(sec,'cuit',e.target.value)} placeholder="20-XXXXXXXX-X" style={inpSt}/></div>
      </div>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Estado civil</label><select value={data[sec].ec} onChange={e => upd(sec,'ec',e.target.value)} style={inpSt}>{EC_OPTS.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Domicilio real</label><input value={data[sec].dom} onChange={e => upd(sec,'dom',e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        <div><label style={lbSt}>Email <span style={{ color: '#C9A84C' }}>*</span></label><input type="email" value={data[sec].email} onChange={e => upd(sec,'email',e.target.value)} placeholder="email@ejemplo.com" style={inpSt}/></div>
        <div><label style={lbSt}>Telefono</label><input value={data[sec].tel} onChange={e => upd(sec,'tel',e.target.value)} placeholder="+54 11 XXXX-XXXX" style={inpSt}/></div>
      </div>
    </>
  }

  function garanteJSX(g, idx) {
    return <div key={idx} style={{ background: '#F8F9FB', border: '0.5px solid rgba(10,22,40,.12)', borderRadius: 10, padding: '.85rem', marginBottom: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.05em' }}>Garante {idx + 1}</div>
        {idx > 0 && <button onClick={() => remGar(idx)} style={{ fontSize: 11, color: '#A32D2D', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>}
      </div>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Tipo de garantia <span style={{ color: '#C9A84C' }}>*</span></label><select value={g.tipo_gar} onChange={e => updGar(idx,'tipo_gar',e.target.value)} style={inpSt}>{TIPOS_GAR.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
      {(g.tipo_gar === 'provincial' || g.tipo_gar === 'caba') && <>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Nombre y apellido <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.nom} onChange={e => updGar(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}><div><label style={lbSt}>DNI</label><input value={g.dni} onChange={e => updGar(idx,'dni',e.target.value)} placeholder="XX.XXX.XXX" style={inpSt}/></div><div><label style={lbSt}>CUIT</label><input value={g.cuit} onChange={e => updGar(idx,'cuit',e.target.value)} placeholder="20-XXXXXXXX-X" style={inpSt}/></div></div>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Domicilio</label><input value={g.dom} onChange={e => updGar(idx,'dom',e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></div>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Descripcion inmueble en garantia</label><input value={g.imb} onChange={e => updGar(idx,'imb',e.target.value)} placeholder="Ej: Dto. 3A, Rivadavia 1234" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><div><label style={lbSt}>Matricula</label><input value={g.mat} onChange={e => updGar(idx,'mat',e.target.value)} placeholder="FR-XXXXX/X" style={inpSt}/></div><div><label style={lbSt}>Partido</label><input value={g.partido} onChange={e => updGar(idx,'partido',e.target.value)} placeholder="Ej: San Isidro" style={inpSt}/></div></div>
      </>}
      {g.tipo_gar === 'juridica' && <>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Razon social <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.razon_social} onChange={e => updGar(idx,'razon_social',e.target.value)} placeholder="Denominacion social" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}><div><label style={lbSt}>CUIT</label><input value={g.cuit} onChange={e => updGar(idx,'cuit',e.target.value)} placeholder="30-XXXXXXXX-X" style={inpSt}/></div><div><label style={lbSt}>Representante legal</label><input value={g.nom} onChange={e => updGar(idx,'nom',e.target.value)} placeholder="Nombre del rep. legal" style={inpSt}/></div></div>
        <div><label style={lbSt}>Domicilio</label><input value={g.dom} onChange={e => updGar(idx,'dom',e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></div>
      </>}
      {g.tipo_gar === 'caucion' && <>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Nombre del contratante <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.nom} onChange={e => updGar(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></div>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Compania aseguradora <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.caucion_comp} onChange={e => updGar(idx,'caucion_comp',e.target.value)} placeholder="Ej: Federacion Patronal" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><div><label style={lbSt}>N de poliza <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.caucion_pol} onChange={e => updGar(idx,'caucion_pol',e.target.value)} placeholder="N de poliza" style={inpSt}/></div><div><label style={lbSt}>Monto asegurado</label><input value={g.caucion_monto} onChange={e => updGar(idx,'caucion_monto',e.target.value)} placeholder="Ej: 3.000.000" style={inpSt}/></div></div>
      </>}
      {g.tipo_gar === 'aval' && <>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Nombre del avalado <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.nom} onChange={e => updGar(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><div><label style={lbSt}>Banco emisor <span style={{ color: '#C9A84C' }}>*</span></label><input value={g.aval_banco} onChange={e => updGar(idx,'aval_banco',e.target.value)} placeholder="Ej: Banco Galicia" style={inpSt}/></div><div><label style={lbSt}>N de aval</label><input value={g.aval_num} onChange={e => updGar(idx,'aval_num',e.target.value)} placeholder="N de documento" style={inpSt}/></div></div>
      </>}
    </div>
  }

  function slotFoto(nombre, fileObj, url, onClick) {
    return <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.65rem .9rem', border: fileObj ? '0.5px solid rgba(29,158,117,.4)' : '0.5px solid rgba(10,22,40,.12)', borderRadius: 8, background: fileObj ? 'rgba(29,158,117,.06)' : '#F8F9FB', cursor: 'pointer', marginBottom: 6 }}>
      {url ? <img src={url} alt={nombre} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }}/> : <div style={{ width: 40, height: 40, borderRadius: 5, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>+</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: fileObj ? '#1D9E75' : '#0A1628' }}>{nombre}</div>
        <div style={{ fontSize: 10, color: fileObj ? '#1D9E75' : '#8A96A3', marginTop: 1 }}>{fileObj ? fileObj.name : 'Tocar para subir foto'}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: fileObj ? 'rgba(29,158,117,.1)' : 'rgba(10,22,40,.06)', color: fileObj ? '#1D9E75' : '#8A96A3' }}>{fileObj ? 'ok' : 'opcional'}</div>
    </div>
  }

  const panels = [
    // PASO 1 — Inmueble
    <>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Domicilio completo <span style={{ color: '#C9A84C' }}>*</span></label><input value={data.inmueble.dom} onChange={e => upd('inmueble','dom',e.target.value)} placeholder="Calle N, piso/dpto, Localidad" style={inpSt}/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
        <div><label style={lbSt}>Ciudad / Partido</label><input value={data.inmueble.ciudad} onChange={e => upd('inmueble','ciudad',e.target.value)} placeholder="Ej: Tigre" style={inpSt}/></div>
        <div><label style={lbSt}>Provincia</label><select value={data.inmueble.pcia} onChange={e => upd('inmueble','pcia',e.target.value)} style={inpSt}>{['Buenos Aires','CABA','Cordoba','Santa Fe','Mendoza','Tucuman','Otra'].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
        <div><label style={lbSt}>Tipo de inmueble</label><select value={data.inmueble.tipo} onChange={e => upd('inmueble','tipo',e.target.value)} style={inpSt}><option value="departamento">Departamento</option><option value="casa">Casa</option><option value="ph">PH</option><option value="oficina">Oficina</option></select></div>
        <div><label style={lbSt}>Sup. cubierta (m2)</label><input value={data.inmueble.scub} onChange={e => upd('inmueble','scub',e.target.value)} placeholder="Ej: 65" style={inpSt}/></div>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lbSt}>Partida inmobiliaria</label><input value={data.inmueble.partida} onChange={e => upd('inmueble','partida',e.target.value)} placeholder="N de partida" style={inpSt}/></div>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628', marginBottom: '.25rem' }}>Ocupantes <span style={{ color: '#C9A84C' }}>*</span></div>
        <div style={{ fontSize: 11, color: '#4A5568', marginBottom: '.75rem' }}>Nombre, apellido y DNI de cada persona que habitara el inmueble.</div>
        {data.ocupantes.map((oc, i) => <div key={i} style={{ background: '#F8F9FB', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, padding: '.75rem', marginBottom: '.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase' }}>Ocupante {i+1}</div>
            {i > 0 && <button onClick={() => remOc(i)} style={{ fontSize: 11, color: '#A32D2D', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <div><label style={lbSt}>Nombre y apellido</label><input value={oc.nom} onChange={e => updOc(i,'nom',e.target.value)} placeholder="Ej: Juan Perez" style={inpSt}/></div>
            <div><label style={lbSt}>DNI</label><input value={oc.dni} onChange={e => updOc(i,'dni',e.target.value)} placeholder="30.123.456" style={inpSt}/></div>
          </div>
        </div>)}
        <button onClick={addOc} style={{ width: '100%', padding: '8px', border: '1.5px dashed rgba(201,168,76,.5)', borderRadius: 8, background: '#F5EDD8', color: '#C9A84C', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '.75rem' }}>+ Agregar otro ocupante</button>
        {textoOc() && <div style={{ padding: '.6rem .85rem', background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 6, fontSize: 11, color: '#4A5568' }}><strong style={{ color: '#0A1628' }}>Como figurara en el contrato:</strong><br/>{textoOc()}</div>}
      </div>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628', marginBottom: '.75rem' }}>Mascotas</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: '.75rem' }}>
          {[{v:false,l:'Sin mascotas'},{v:true,l:'Con mascotas'}].map(op=><div key={String(op.v)} onClick={()=>upd('mascotas','tiene',op.v)} style={{ flex:1, padding:'.6rem', border: data.mascotas.tiene===op.v?'1.5px solid #C9A84C':'0.5px solid rgba(10,22,40,.15)', borderRadius:8, cursor:'pointer', textAlign:'center', background: data.mascotas.tiene===op.v?'#F5EDD8':'#F8F9FB', fontSize:12, fontWeight:500, color:'#0A1628' }}>{op.l}</div>)}
        </div>
        {data.mascotas.tiene && <div><label style={lbSt}>Descripcion de la mascota</label><input value={data.mascotas.descripcion} onChange={e=>upd('mascotas','descripcion',e.target.value)} placeholder="Ej: Perro, raza labrador, tamano mediano, castrado" style={inpSt}/></div>}
      </div>
    </>,
    // PASO 2 — Locador
    <>{personaJSX('locador')}</>,
    // PASO 3 — Locatario
    <>{personaJSX('locatario')}</>,
    // PASO 4 — Contrato
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
        <div><label style={lbSt}>Canon mensual <span style={{ color: '#C9A84C' }}>*</span></label><input value={data.contrato.canon} onChange={e=>upd('contrato','canon',fmtNum(e.target.value))} placeholder="Ej: 280.000" style={inpSt}/></div>
        <div><label style={lbSt}>Moneda</label><select value={data.contrato.moneda} onChange={e=>upd('contrato','moneda',e.target.value)} style={inpSt}><option value="ARS">Pesos ($)</option><option value="USD">Dolares (U)</option></select></div>
      </div>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Tipo de ajuste</label><select value={data.contrato.ajuste} onChange={e=>upd('contrato','ajuste',e.target.value)} style={inpSt}><option value="ipc">IPC (INDEC)</option><option value="ipcba">IPCBA (CABA)</option><option value="escalonado">Escalonado</option><option value="fijo">Porcentaje fijo</option><option value="mixto">Mixto</option><option value="sin_ajuste">Sin ajuste</option></select></div>
      <div style={{ marginBottom: 9 }}><label style={lbSt}>Periodicidad de ajuste</label><select value={data.contrato.periodo} onChange={e=>upd('contrato','periodo',e.target.value)} style={inpSt}><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="cuatrimestral">Cuatrimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 16 }}>
        <div><label style={lbSt}>Fecha de inicio <span style={{ color: '#C9A84C' }}>*</span></label><input type="date" value={data.contrato.inicio} onChange={e=>upd('contrato','inicio',e.target.value)} style={inpSt}/></div>
        <div><label style={lbSt}>Fecha de vencimiento <span style={{ color: '#C9A84C' }}>*</span></label><input type="date" value={data.contrato.vencimiento} onChange={e=>upd('contrato','vencimiento',e.target.value)} style={inpSt}/></div>
      </div>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '.85rem', marginBottom: 9 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginBottom: '.65rem' }}>Deposito en garantia</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
          <div><label style={lbSt}>Monto del deposito</label><input value={data.contrato.deposito_monto} onChange={e=>upd('contrato','deposito_monto',fmtNum(e.target.value))} placeholder="Ej: 280.000" style={inpSt}/></div>
          <div><label style={lbSt}>Moneda</label><select value={data.contrato.deposito_moneda} onChange={e=>upd('contrato','deposito_moneda',e.target.value)} style={inpSt}><option value="ARS">Pesos ($)</option><option value="USD">Dolares (U)</option></select></div>
        </div>
        <div><label style={lbSt}>Dias para devolucion</label><select value={data.contrato.deposito_dias} onChange={e=>upd('contrato','deposito_dias',e.target.value)} style={inpSt}><option value="30">30 dias corridos</option><option value="60">60 dias corridos</option><option value="90">90 dias corridos</option></select></div>
      </div>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '.85rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginBottom: '.65rem' }}>Datos bancarios para el pago</div>
        <div style={{ marginBottom: 9 }}><label style={lbSt}>Titular de la cuenta</label><input value={data.contrato.tit_cbu} onChange={e=>upd('contrato','tit_cbu',e.target.value)} placeholder="Nombre completo del titular" style={inpSt}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
          <div><label style={lbSt}>Banco</label><input value={data.contrato.banco} onChange={e=>upd('contrato','banco',e.target.value)} placeholder="Ej: Banco Galicia" style={inpSt}/></div>
          <div><label style={lbSt}>Alias</label><input value={data.contrato.alias} onChange={e=>upd('contrato','alias',e.target.value)} placeholder="alias.cuenta" style={inpSt}/></div>
        </div>
        <div><label style={lbSt}>CBU</label><input value={data.contrato.cbu} onChange={e=>upd('contrato','cbu',e.target.value)} placeholder="22 digitos" style={inpSt}/></div>
      </div>
    </>,
    // PASO 5 — Garantia
    <>
      <div style={{ fontSize: 11, color: '#4A5568', marginBottom: '.85rem', lineHeight: 1.5 }}>Carga los datos de cada garante. Podes agregar mas de uno.</div>
      {data.garantes.map((g, i) => garanteJSX(g, i))}
      <button onClick={addGar} style={{ width: '100%', padding: '8px', border: '1.5px dashed rgba(201,168,76,.5)', borderRadius: 8, background: '#F5EDD8', color: '#C9A84C', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar otro garante</button>
    </>,
    // PASO 6 — Inventario
    <>
      <div style={{ fontSize: 11, color: '#4A5568', marginBottom: '.85rem', lineHeight: 1.5 }}>Subi fotos del estado del inmueble. Integran el Anexo 1 firmado por ambas partes. Las fotos aparecen en la vista previa del contrato.</div>
      {AMBIENTES.map((amb, i) => slotFoto(amb, data.inventario_files[i], invUrls[i], () => selFoto('inv', i)))}
      {data.mascotas.tiene && <>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginTop: '1rem', marginBottom: '.6rem' }}>Fotos de la mascota</div>
        {['Foto de la mascota 1','Foto de la mascota 2','Foto de la mascota 3'].map((lbl, i) => slotFoto(lbl, data.mascotas_files[i], mscUrls[i], () => selFoto('msc', i)))}
      </>}
    </>,
    // PASO 7 — Descargar
    <>
      <div style={{ background: '#0A1628', borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: '.35rem' }}>Contrato listo para generar</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: '1.1rem', lineHeight: 1.5 }}>Modelo 2026 · CCyCN arts. 1187-1250 · DNU 70/2023<br/>Respaldado por martillera corredora y perito judicial</div>
        {error && <div style={{ background: 'rgba(240,149,149,.15)', border: '0.5px solid rgba(240,149,149,.4)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#F09595', marginBottom: '.9rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={()=>descargar('word')} disabled={loading} style={{ padding:'11px 24px', background:'#C9A84C', color:'#0A1628', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1, fontFamily:'inherit' }}>{loading?'Generando...':'Descargar Word'}</button>
          <button onClick={()=>descargar('pdf')} disabled={loading} style={{ padding:'11px 24px', background:'transparent', color:'#fff', border:'0.5px solid rgba(255,255,255,.25)', borderRadius:8, fontSize:13, fontWeight:500, cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1, fontFamily:'inherit' }}>Descargar PDF</button>
        </div>
      </div>
      <div style={{ background: '#F5EDD8', border: '0.5px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '.75rem 1rem', fontSize: 11, color: '#4A5568', textAlign: 'center' }}>La descarga requiere sesion activa y contratos disponibles en tu plan.</div>
    </>
  ]

  // ============================================================
  // VISTA PREVIA — reproduce el contrato real con datos y fotos
  // ============================================================
  if (preview) {
    const d = data
    const loc = d.locador, loca = d.locatario, imb = d.inmueble, cont = d.contrato
    const garante1 = d.garantes[0] || {}
    const hoy = new Date().toLocaleDateString('es-AR')
    const tipoGarLabel = TIPOS_GAR.find(t => t.v === garante1.tipo_gar)?.l || ''

    // Estilo del documento legal
    const docSt = { fontFamily: 'Georgia, serif', fontSize: 13, color: '#1a1a1a', lineHeight: 1.8, textAlign: 'justify' }
    const h2St = { fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '.5rem', textAlign: 'center', textDecoration: 'underline' }
    const parSt = { marginBottom: '1rem', textAlign: 'justify' }
    const boldSt = { fontWeight: 'bold' }
    const subray = { textDecoration: 'underline', fontWeight: 'bold' }

    return <div style={{ minHeight: '100vh', background: '#E8E8E8' }}>
      {/* Barra superior fija */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0A1628', padding: '.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Vista previa del contrato</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={()=>setPreview(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', cursor: 'pointer', padding: '5px 12px', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 5, background: 'transparent', fontFamily: 'inherit' }}>Volver a editar</button>
          <button onClick={()=>descargar('word')} disabled={loading} style={{ fontSize: 11, fontWeight: 500, color: '#0A1628', cursor: loading?'not-allowed':'pointer', padding: '5px 14px', border: 'none', borderRadius: 5, background: '#C9A84C', fontFamily: 'inherit', opacity: loading?0.7:1 }}>{loading?'Generando...':'Descargar Word'}</button>
        </div>
      </div>

      {/* Documento */}
      <div style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem 4rem' }}>
        <div style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.12)', borderRadius: 4, padding: '4rem 5rem', ...docSt }}>

          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #1a1a1a', paddingBottom: '1.5rem' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: '.05em', marginBottom: '.5rem' }}>CONTRATO DE LOCACION DE VIVIENDA</div>
            <div style={{ fontSize: 11, color: '#666' }}>CCyCN arts. 1187-1250 · DNU 70/2023 · Infoleg 2025 · Modelo 2026</div>
          </div>

          {/* PRELIMINAR */}
          <p style={parSt}>
            <span style={subray}>PRELIMINAR: LUGAR, FECHA Y PARTES:</span> En <span style={boldSt}>{imb.ciudad || '___________'}</span>, Pcia de {imb.pcia || 'Buenos Aires'}, a los <span style={boldSt}>{new Date().getDate()}</span> dias del mes de <span style={boldSt}>{new Date().toLocaleDateString('es-AR', { month: 'long' })}</span> de 20{String(new Date().getFullYear()).slice(2)}, entre <span style={boldSt}>{loc.nom || '[LOCADOR]'}</span>, DNI <span style={boldSt}>{loc.dni || '___'}</span>, con domicilio en la calle <span style={boldSt}>{loc.dom || '___'}</span>, mail <span style={boldSt}>{loc.email || '___'}</span>, en adelante denominado "LOCADOR" por una parte, y por la otra <span style={boldSt}>{loca.nom || '[LOCATARIO]'}</span>, DNI <span style={boldSt}>{loca.dni || '___'}</span>, con domicilio en <span style={boldSt}>{loca.dom || '___'}</span>, mail <span style={boldSt}>{loca.email || '___'}</span>, en adelante denominado "LOCATARIO"; manifestando ambas partes ser personas habiles para contratar, celebran el presente Contrato de Locacion, el que se regira por las siguientes clausulas y condiciones, y a cuyo cumplimiento se obligan con arreglo a derecho.
          </p>

          <div style={h2St}>CLAUSULAS</div>

          <p style={parSt}><span style={boldSt}>PRIMERA - OBJETO:</span> El LOCADOR entrega en locacion al LOCATARIO el inmueble ubicado en <span style={boldSt}>{imb.dom || '___________'}</span>, {imb.ciudad || '___'}, Provincia de {imb.pcia || '___'}, en el estado en que se encuentra, cuyo detalle se consigna en el Anexo 1 de inventario fotografico que se adjunta y forma parte del presente contrato.</p>

          <p style={parSt}><span style={boldSt}>SEGUNDA - DESTINO:</span> El inmueble objeto de la presente locacion sera destinado exclusivamente para vivienda del/los ocupante/s: <span style={boldSt}>{textoOc() || '[OCUPANTES]'}</span>{d.mascotas.tiene ? ', quien/es declara/n convivir con mascota/s: ' + (d.mascotas.descripcion || 'descripcion pendiente') : ''}. Queda expresamente prohibido darle al inmueble un destino distinto al pactado.</p>

          <p style={parSt}><span style={boldSt}>TERCERA - PLAZO:</span> El presente contrato tendra vigencia desde el dia <span style={boldSt}>{fmtFecha(cont.inicio) || '___'}</span> hasta el dia <span style={boldSt}>{fmtFecha(cont.vencimiento) || '___'}</span>, operandose su vencimiento de pleno derecho sin necesidad de interpelacion alguna.</p>

          <p style={parSt}><span style={boldSt}>CUARTA - PRECIO Y ACTUALIZACION:</span> El canon locativo mensual inicial sera de <span style={boldSt}>{canon()}</span>, ajustable en forma {cont.periodo || 'trimestral'} mediante el indice {cont.ajuste?.toUpperCase() || 'IPC'}, conforme al DNU 70/2023 y la normativa vigente publicada en Infoleg.</p>

          <p style={parSt}><span style={boldSt}>QUINTA - FORMA DE PAGO:</span> El canon debera abonarse del dia 1 al 5 de cada mes mediante transferencia bancaria a la cuenta CBU <span style={boldSt}>{cont.cbu || '___'}</span>, Alias: <span style={boldSt}>{cont.alias || '___'}</span>, Banco <span style={boldSt}>{cont.banco || '___'}</span>, titular <span style={boldSt}>{cont.tit_cbu || '___'}</span>. La mora sera automatica por el solo vencimiento del plazo (art. 886 CCyCN).</p>

          <p style={parSt}><span style={boldSt}>SEXTA - SUMINISTROS:</span> Los gastos de luz, gas, agua, telefono y demas servicios estaran a exclusivo cargo del LOCATARIO, quien debera mantenerlos al dia durante toda la vigencia del contrato.</p>

          <p style={parSt}><span style={boldSt}>SEPTIMA - INCUMPLIMIENTO:</span> El incumplimiento de cualquier obligacion contractual por parte del LOCATARIO facultara al LOCADOR a resolver el contrato de pleno derecho (art. 1086 CCyCN).</p>

          <p style={parSt}><span style={boldSt}>OCTAVA - INTRANSFERIBILIDAD:</span> Queda expresamente prohibido al LOCATARIO ceder, sublocar, o permitir el uso del inmueble a terceros bajo cualquier modalidad, incluyendo plataformas de alquiler temporario.</p>

          <p style={parSt}><span style={boldSt}>NOVENA - MEJORAS:</span> Toda mejora que introduzca el LOCATARIO, con o sin autorizacion del LOCADOR, cedera en beneficio de la propiedad sin derecho a compensacion alguna.</p>

          <p style={parSt}><span style={boldSt}>DECIMA - FALTA DE RESTITUCION:</span> Si al vencimiento del contrato el LOCATARIO no restituyere el inmueble, debera abonar el equivalente al doble del canon mensual por cada mes o fraccion de demora, mas intereses.</p>

          <p style={parSt}><span style={boldSt}>UNDECIMA - SOLIDARIDAD:</span> El LOCATARIO y los fiadores responden solidariamente por todas las obligaciones emergentes del presente contrato.</p>

          <p style={parSt}><span style={boldSt}>DUODECIMA - GARANTIA ({tipoGarLabel.toUpperCase()}):</span> <span style={boldSt}>{garante1.nom || '[GARANTE]'}</span>, DNI <span style={boldSt}>{garante1.dni || '___'}</span>, domicilio en <span style={boldSt}>{garante1.dom || '___'}</span>{garante1.imb ? ', propietario del inmueble ubicado en ' + garante1.imb + ', Matricula ' + (garante1.mat||'___') + ', Partido ' + (garante1.partido||'___') : ''}, se constituye en garante y fiador solidario del LOCATARIO, renunciando expresamente a los beneficios de excusion y division.{d.garantes.length > 1 ? ' Asimismo, ' + d.garantes.slice(1).map(g=>g.nom+' DNI '+g.dni).join(', ') + ' se constituyen como garantes solidarios adicionales.' : ''}</p>

          <p style={parSt}><span style={boldSt}>DECIMO TERCERA - IMPUESTOS Y TASAS:</span> Todos los impuestos, tasas y contribuciones sobre el inmueble estaran a cargo del LOCATARIO durante la vigencia del contrato.</p>

          <p style={parSt}><span style={boldSt}>DECIMO CUARTA - DEPOSITO EN GARANTIA:</span> Al momento de la firma, el LOCATARIO entrega en concepto de deposito en garantia la suma de <span style={boldSt}>{deposito()}</span>, que sera devuelta dentro de los <span style={boldSt}>{cont.deposito_dias || '60'}</span> dias corridos de restituido el inmueble, deducidos los importes correspondientes a danos o deudas (art. 1196 CCyCN).</p>

          <p style={parSt}><span style={boldSt}>DECIMO QUINTA - RESOLUCION ANTICIPADA:</span> El LOCATARIO podra resolver el contrato con preaviso fehaciente de sesenta (60) dias, abonando una penalidad equivalente al diez por ciento (10%) de los alquileres restantes.</p>

          <p style={parSt}><span style={boldSt}>DECIMO SEXTA - ESTADO DEL BIEN:</span> El LOCATARIO recibe el inmueble en el estado detallado en el Anexo 1 (inventario fotografico) y debera restituirlo en igual estado de conservacion.</p>

          <p style={parSt}><span style={boldSt}>DECIMO SEPTIMA - ENTREGA DE LLAVES:</span> Solo se tendra por validamente realizada la entrega de llaves cuando el LOCADOR otorgue constancia escrita de su recepcion.</p>

          <p style={parSt}><span style={boldSt}>DECIMO OCTAVA - SEGURO:</span> El LOCATARIO debera contratar a su cargo un seguro contra incendio y responsabilidad civil frente a terceros durante toda la vigencia del contrato.</p>

          <p style={parSt}><span style={boldSt}>DECIMO NOVENA - USO Y REGLAMENTO:</span> El LOCATARIO se obliga a respetar el reglamento de copropiedad, las normas de convivencia y toda disposicion legal aplicable al inmueble y su entorno.</p>

          <p style={parSt}><span style={boldSt}>VIGESIMA - REPARACIONES:</span> El LOCADOR o sus representantes podran acceder al inmueble para realizar reparaciones necesarias, previo aviso con anticipacion razonable.</p>

          <p style={parSt}><span style={boldSt}>VIGESIMA PRIMERA - JURISDICCION:</span> Para todos los efectos legales derivados del presente contrato, las partes se someten a la jurisdiccion de los Tribunales competentes de {imb.ciudad || '___________'}.</p>

          <p style={parSt}><span style={boldSt}>VIGESIMA SEGUNDA - COMUNICACIONES ELECTRONICAS:</span> Las notificaciones cursadas por medios electronicos a las direcciones de email consignadas ({loc.email || '___'} y {loca.email || '___'}) tendran plena validez entre las partes.</p>

          <p style={parSt}><span style={boldSt}>VIGESIMA TERCERA - EJEMPLARES:</span> Se firman tres (3) ejemplares de igual tenor y a un solo efecto, uno para cada parte, junto con el Anexo 1 de inventario fotografico.</p>

          {/* Firmas */}
          <div style={{ marginTop: '3rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '.5rem', fontSize: 12 }}>
                  <div style={{ fontWeight: 'bold' }}>LOCADOR</div>
                  <div>{loc.nom || '________________________'}</div>
                  <div style={{ color: '#666' }}>DNI: {loc.dni || '___________'}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '.5rem', fontSize: 12 }}>
                  <div style={{ fontWeight: 'bold' }}>LOCATARIO</div>
                  <div>{loca.nom || '________________________'}</div>
                  <div style={{ color: '#666' }}>DNI: {loca.dni || '___________'}</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '.5rem', fontSize: 12, display: 'inline-block', minWidth: 250 }}>
                <div style={{ fontWeight: 'bold' }}>GARANTE</div>
                <div>{garante1.nom || '________________________'}</div>
                <div style={{ color: '#666' }}>DNI: {garante1.dni || '___________'}</div>
              </div>
            </div>
          </div>

          {/* ANEXO 1 — Inventario fotografico */}
          {invUrls.filter(Boolean).length > 0 && <>
            <div style={{ marginTop: '3rem', borderTop: '2px solid #1a1a1a', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: '1rem', letterSpacing: '.05em' }}>ANEXO 1 — INVENTARIO FOTOGRAFICO</div>
              <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: '1.5rem' }}>Estado del inmueble al inicio de la locacion. Firmado por ambas partes.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {AMBIENTES.map((amb, i) => invUrls[i] ? <div key={i} style={{ border: '0.5px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                  <img src={invUrls[i]} alt={amb} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}/>
                  <div style={{ padding: '.4rem .6rem', fontSize: 11, fontWeight: 500, color: '#333', background: '#f8f8f8', borderTop: '0.5px solid #eee' }}>{amb}</div>
                </div> : null)}
              </div>
            </div>
          </>}

          {/* Fotos de mascotas */}
          {d.mascotas.tiene && mscUrls.filter(Boolean).length > 0 && <>
            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: '1rem' }}>ANEXO MASCOTAS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
                {mscUrls.filter(Boolean).map((url, i) => <div key={i} style={{ border: '0.5px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                  <img src={url} alt={'Mascota ' + (i+1)} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}/>
                  <div style={{ padding: '.4rem .6rem', fontSize: 11, color: '#333', background: '#f8f8f8', borderTop: '0.5px solid #eee' }}>Mascota {i+1}</div>
                </div>)}
              </div>
            </div>
          </>}

        </div>
      </div>
    </div>
  }

  if (!user) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ fontSize:14, color:'#4A5568' }}>Cargando...</div></div>

  return <div style={{ minHeight:'100vh', background:'#F8F9FB' }}>
    <div style={{ background:'#0A1628', padding:'.75rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:24, height:24, background:'#C9A84C', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
        </div>
        <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Tu contrato de locacion vivienda</div>
      </div>
      <button onClick={()=>router.push('/dashboard')} style={{ fontSize:11, color:'rgba(255,255,255,.5)', cursor:'pointer', padding:'3px 8px', border:'0.5px solid rgba(255,255,255,.2)', borderRadius:4, background:'transparent', fontFamily:'inherit' }}>Dashboard</button>
    </div>
    <div style={{ maxWidth:580, margin:'1.5rem auto', padding:'0 1rem' }}>
      <div style={{ display:'flex', marginBottom:'1rem', gap:4 }}>
        {STEPS.map((s,i)=><div key={i} onClick={()=>{setValErr('');setStep(i)}} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}>
          <div style={{ height:3, width:'100%', borderRadius:2, background: i<=step?'#C9A84C':'rgba(10,22,40,.1)', marginBottom:4 }}/>
          <div style={{ fontSize:9, color: i===step?'#C9A84C':'#8A96A3', fontWeight: i===step?500:400, textTransform:'uppercase', letterSpacing:'.04em' }}>{s}</div>
        </div>)}
      </div>
      {valErr&&<div style={{ background:'#FCEBEB', border:'0.5px solid #F09595', borderRadius:10, padding:'.75rem 1rem', fontSize:12, color:'#A32D2D', marginBottom:'.85rem', display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:16 }}>⚠</span>{valErr}</div>}
      <div style={{ background:'#fff', border:'0.5px solid rgba(10,22,40,.1)', borderRadius:16, padding:'1.5rem', marginBottom:'1rem' }}>
        <div style={{ fontSize:11, fontWeight:500, color:'#C9A84C', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'.35rem' }}>Paso {step+1} de {STEPS.length}</div>
        <div style={{ fontSize:18, fontWeight:500, color:'#0A1628', marginBottom:'1.25rem' }}>{STEPS[step]}</div>
        {panels[step]}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <button onClick={()=>{setValErr('');setStep(p=>Math.max(0,p-1))}} style={{ visibility:step===0?'hidden':'visible', padding:'8px 18px', borderRadius:8, border:'0.5px solid rgba(10,22,40,.2)', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Anterior</button>
        <button onClick={siguiente} style={{ padding:'9px 22px', borderRadius:8, border:'none', background:'#0A1628', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>{step===STEPS.length-1?'Ver vista previa real':'Siguiente'}</button>
      </div>
    </div>
  </div>
}



