'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Contrato() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [data, setData] = useState({
    inmueble: { dom: '', ciudad: '', pcia: 'Buenos Aires', tipo: 'departamento', scub: '', partida: '' },
    mascotas: { tiene: false, descripcion: '' },
    ocupantes: [{ nom: '', dni: '' }],
    locador: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    locatario: { nom: '', dni: '', cuit: '', ec: 'soltero/a', dom: '', email: '', tel: '' },
    garantes: [{ nom: '', dni: '', cuit: '', dom: '', tipo_gar: 'provincial', imb: '', mat: '', partido: '', razon_social: '', caucion_comp: '', caucion_pol: '', caucion_monto: '', aval_banco: '', aval_num: '' }],
    contrato: { canon: '', moneda: 'ARS', ajuste: 'ipc', periodo: 'trimestral', inicio: '', vencimiento: '', deposito_monto: '', deposito_moneda: 'ARS', deposito_dias: '60', tit_cbu: '', banco: '', cbu: '', alias: '' },
    inventario: [],
    fotos_mascotas: []
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

  function updOcupante(idx, key, val) {
    setData(p => { const arr = [...p.ocupantes]; arr[idx] = { ...arr[idx], [key]: val }; return { ...p, ocupantes: arr } })
  }
  function addOcupante() { setData(p => ({ ...p, ocupantes: [...p.ocupantes, { nom: '', dni: '' }] })) }
  function removeOcupante(idx) { setData(p => ({ ...p, ocupantes: p.ocupantes.filter((_, i) => i !== idx) })) }

  function updGarante(idx, key, val) {
    setData(p => { const arr = [...p.garantes]; arr[idx] = { ...arr[idx], [key]: val }; return { ...p, garantes: arr } })
  }
  function addGarante() { setData(p => ({ ...p, garantes: [...p.garantes, { nom: '', dni: '', cuit: '', dom: '', tipo_gar: 'provincial', imb: '', mat: '', partido: '', razon_social: '', caucion_comp: '', caucion_pol: '', caucion_monto: '', aval_banco: '', aval_num: '' }] })) }
  function removeGarante(idx) { setData(p => ({ ...p, garantes: p.garantes.filter((_, i) => i !== idx) })) }

  function textoOcupantes() {
    return data.ocupantes.filter(o => o.nom.trim()).map(o => o.nom.trim() + (o.dni.trim() ? ' DNI ' + o.dni.trim() : '')).join(', ')
  }

  function formatCanon(val) {
    const num = val.replace(/\D/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const steps = ['Inmueble', 'Locador', 'Locatario', 'Contrato', 'Garantia', 'Inventario', 'Descargar']

  const validations = [
    () => { if (!data.inmueble.dom) return 'El domicilio del inmueble es obligatorio.'; if (!data.ocupantes[0]?.nom) return 'Debe cargar al menos un ocupante.'; return '' },
    () => { if (!data.locador.nom) return 'El nombre del locador es obligatorio.'; if (!data.locador.dni) return 'El DNI del locador es obligatorio.'; if (!data.locador.email) return 'El email del locador es obligatorio.'; return '' },
    () => { if (!data.locatario.nom) return 'El nombre del locatario es obligatorio.'; if (!data.locatario.dni) return 'El DNI del locatario es obligatorio.'; if (!data.locatario.email) return 'El email del locatario es obligatorio.'; return '' },
    () => { if (!data.contrato.canon) return 'El canon mensual es obligatorio.'; if (!data.contrato.inicio) return 'La fecha de inicio es obligatoria.'; if (!data.contrato.vencimiento) return 'La fecha de vencimiento es obligatoria.'; return '' },
    () => { if (!data.garantes[0]?.nom) return 'Debe cargar al menos un garante.'; return '' },
    () => '',
    () => ''
  ]

  function siguiente() {
    const err = validations[step]()
    if (err) { setValidationError(err); return }
    setValidationError('')
    if (step === steps.length - 1) { setShowPreview(true); return }
    setStep(p => p + 1)
  }

  async function descargar(formato) {
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      const payload = { ...data, inmueble_ocupantes_texto: textoOcupantes() }
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: payload, formato })
      })
      if (res.status === 401) { setError('Sesion expirada.'); router.push('/login'); return }
      if (res.status === 403) { setError('Sin contratos disponibles. Compra un plan.'); return }
      if (!res.ok) { setError('Error al generar el documento.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'contrato-locacion.docx'
      document.body.appendChild(a); a.click()
      URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch { setError('Error de conexion.') }
    setLoading(false)
  }

  const inpSt = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(10,22,40,.2)', borderRadius: 6, fontFamily: 'inherit', background: '#fff' }
  const lbSt = { fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }

  function Fg({ label, children, req }) {
    return <div style={{ marginBottom: 9 }}><label style={lbSt}>{label}{req && <span style={{ color: '#C9A84C', marginLeft: 2 }}>*</span>}</label>{children}</div>
  }

  function Inp({ section, k, placeholder, type = 'text' }) {
    return <input type={type} value={data[section][k] || ''} onChange={e => upd(section, k, e.target.value)} placeholder={placeholder} style={inpSt}/>
  }

  function Sel({ section, k, opts }) {
    return <select value={data[section][k] || ''} onChange={e => upd(section, k, e.target.value)} style={inpSt}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  }

  function Grid2({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>{children}</div>
  }

  function PersonaCard({ title, section }) {
    return <div>
      <Fg label="Apellido y nombre" req><input value={data[section].nom || ''} onChange={e => upd(section, 'nom', e.target.value)} placeholder="Tal como figura en el DNI" style={inpSt}/></Fg>
      <Grid2>
        <Fg label="DNI" req><input value={data[section].dni || ''} onChange={e => upd(section, 'dni', e.target.value)} placeholder="XX.XXX.XXX" style={inpSt}/></Fg>
        <Fg label="CUIT / CUIL"><input value={data[section].cuit || ''} onChange={e => upd(section, 'cuit', e.target.value)} placeholder="20-XXXXXXXX-X" style={inpSt}/></Fg>
      </Grid2>
      <Fg label="Estado civil">
        <select value={data[section].ec || 'soltero/a'} onChange={e => upd(section, 'ec', e.target.value)} style={inpSt}>
          {['soltero/a','casado/a','divorciado/a','viudo/a','union convivencial'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Fg>
      <Fg label="Domicilio real"><input value={data[section].dom || ''} onChange={e => upd(section, 'dom', e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></Fg>
      <Grid2>
        <Fg label="Email" req><input type="email" value={data[section].email || ''} onChange={e => upd(section, 'email', e.target.value)} placeholder="email@ejemplo.com" style={inpSt}/></Fg>
        <Fg label="Telefono"><input value={data[section].tel || ''} onChange={e => upd(section, 'tel', e.target.value)} placeholder="+54 11 XXXX-XXXX" style={inpSt}/></Fg>
      </Grid2>
    </div>
  }

  const TIPOS_GARANTIA = [
    { v: 'provincial', l: 'Inmueble Provincial (PBA)' },
    { v: 'caba', l: 'Inmueble CABA' },
    { v: 'juridica', l: 'Persona Juridica' },
    { v: 'caucion', l: 'Seguro de Caucion' },
    { v: 'aval', l: 'Aval Bancario' },
  ]

  function GaranteCard({ g, idx }) {
    return <div style={{ background: '#F8F9FB', border: '0.5px solid rgba(10,22,40,.12)', borderRadius: 10, padding: '.85rem', marginBottom: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.05em' }}>Garante {idx + 1}</div>
        {idx > 0 && <button onClick={() => removeGarante(idx)} style={{ fontSize: 11, color: '#A32D2D', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>}
      </div>
      <Fg label="Tipo de garantia" req>
        <select value={g.tipo_gar} onChange={e => updGarante(idx, 'tipo_gar', e.target.value)} style={inpSt}>
          {TIPOS_GARANTIA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </Fg>
      {(g.tipo_gar === 'provincial' || g.tipo_gar === 'caba') && <>
        <Fg label="Nombre y apellido" req><input value={g.nom} onChange={e => updGarante(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="DNI"><input value={g.dni} onChange={e => updGarante(idx,'dni',e.target.value)} placeholder="XX.XXX.XXX" style={inpSt}/></Fg>
          <Fg label="CUIT"><input value={g.cuit} onChange={e => updGarante(idx,'cuit',e.target.value)} placeholder="20-XXXXXXXX-X" style={inpSt}/></Fg>
        </Grid2>
        <Fg label="Domicilio"><input value={g.dom} onChange={e => updGarante(idx,'dom',e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></Fg>
        <Fg label="Descripcion inmueble en garantia"><input value={g.imb} onChange={e => updGarante(idx,'imb',e.target.value)} placeholder="Ej: Dto. 3A, Rivadavia 1234, San Isidro" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="Matricula registral"><input value={g.mat} onChange={e => updGarante(idx,'mat',e.target.value)} placeholder="FR-XXXXX/X" style={inpSt}/></Fg>
          <Fg label="Partido"><input value={g.partido} onChange={e => updGarante(idx,'partido',e.target.value)} placeholder="Ej: San Isidro" style={inpSt}/></Fg>
        </Grid2>
      </>}
      {g.tipo_gar === 'juridica' && <>
        <Fg label="Razon social" req><input value={g.razon_social} onChange={e => updGarante(idx,'razon_social',e.target.value)} placeholder="Denominacion social" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="CUIT"><input value={g.cuit} onChange={e => updGarante(idx,'cuit',e.target.value)} placeholder="30-XXXXXXXX-X" style={inpSt}/></Fg>
          <Fg label="Representante legal"><input value={g.nom} onChange={e => updGarante(idx,'nom',e.target.value)} placeholder="Nombre del rep. legal" style={inpSt}/></Fg>
        </Grid2>
        <Fg label="Domicilio"><input value={g.dom} onChange={e => updGarante(idx,'dom',e.target.value)} placeholder="Calle N, Localidad" style={inpSt}/></Fg>
      </>}
      {g.tipo_gar === 'caucion' && <>
        <Fg label="Nombre del contratante" req><input value={g.nom} onChange={e => updGarante(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></Fg>
        <Fg label="Compania aseguradora" req><input value={g.caucion_comp} onChange={e => updGarante(idx,'caucion_comp',e.target.value)} placeholder="Ej: Federacion Patronal" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="N de poliza" req><input value={g.caucion_pol} onChange={e => updGarante(idx,'caucion_pol',e.target.value)} placeholder="N de poliza" style={inpSt}/></Fg>
          <Fg label="Monto asegurado"><input value={g.caucion_monto} onChange={e => updGarante(idx,'caucion_monto',e.target.value)} placeholder="Ej: 3.000.000" style={inpSt}/></Fg>
        </Grid2>
      </>}
      {g.tipo_gar === 'aval' && <>
        <Fg label="Nombre del avalado" req><input value={g.nom} onChange={e => updGarante(idx,'nom',e.target.value)} placeholder="Apellido y nombre" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="Banco emisor" req><input value={g.aval_banco} onChange={e => updGarante(idx,'aval_banco',e.target.value)} placeholder="Ej: Banco Galicia" style={inpSt}/></Fg>
          <Fg label="N de aval"><input value={g.aval_num} onChange={e => updGarante(idx,'aval_num',e.target.value)} placeholder="N de documento" style={inpSt}/></Fg>
        </Grid2>
      </>}
    </div>
  }

  const panels = [
    // PASO 1 — Inmueble
    <div key={0}>
      <Fg label="Domicilio completo" req><input value={data.inmueble.dom} onChange={e => upd('inmueble','dom',e.target.value)} placeholder="Calle N, piso/dpto, Localidad" style={inpSt}/></Fg>
      <Grid2>
        <Fg label="Ciudad / Partido"><input value={data.inmueble.ciudad} onChange={e => upd('inmueble','ciudad',e.target.value)} placeholder="Ej: Tigre" style={inpSt}/></Fg>
        <Fg label="Provincia">
          <select value={data.inmueble.pcia} onChange={e => upd('inmueble','pcia',e.target.value)} style={inpSt}>
            {['Buenos Aires','CABA','Cordoba','Santa Fe','Mendoza','Tucuman','Otra'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Fg>
      </Grid2>
      <Grid2>
        <Fg label="Tipo de inmueble">
          <select value={data.inmueble.tipo} onChange={e => upd('inmueble','tipo',e.target.value)} style={inpSt}>
            <option value="departamento">Departamento</option>
            <option value="casa">Casa</option>
            <option value="ph">PH</option>
            <option value="oficina">Oficina</option>
          </select>
        </Fg>
        <Fg label="Sup. cubierta (m2)"><input value={data.inmueble.scub} onChange={e => upd('inmueble','scub',e.target.value)} placeholder="Ej: 65" style={inpSt}/></Fg>
      </Grid2>
      <Fg label="Partida inmobiliaria"><input value={data.inmueble.partida} onChange={e => upd('inmueble','partida',e.target.value)} placeholder="N de partida" style={inpSt}/></Fg>

      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '1rem', marginTop: '.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628', marginBottom: '.25rem' }}>Ocupantes del inmueble <span style={{ color: '#C9A84C' }}>*</span></div>
        <div style={{ fontSize: 11, color: '#4A5568', marginBottom: '.75rem' }}>Nombre, apellido y DNI de cada persona que habitara el inmueble.</div>
        {data.ocupantes.map((oc, idx) => (
          <div key={idx} style={{ background: '#F8F9FB', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, padding: '.75rem', marginBottom: '.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ocupante {idx + 1}</div>
              {idx > 0 && <button onClick={() => removeOcupante(idx)} style={{ fontSize: 11, color: '#A32D2D', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>}
            </div>
            <Grid2>
              <div><label style={lbSt}>Nombre y apellido</label><input value={oc.nom} onChange={e => updOcupante(idx,'nom',e.target.value)} placeholder="Ej: Juan Perez" style={inpSt}/></div>
              <div><label style={lbSt}>DNI</label><input value={oc.dni} onChange={e => updOcupante(idx,'dni',e.target.value)} placeholder="30.123.456" style={inpSt}/></div>
            </Grid2>
          </div>
        ))}
        <button onClick={addOcupante} style={{ width: '100%', padding: '8px', border: '1.5px dashed rgba(201,168,76,.5)', borderRadius: 8, background: '#F5EDD8', color: '#C9A84C', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '.75rem' }}>
          + Agregar otro ocupante
        </button>
        {textoOcupantes() && <div style={{ padding: '.6rem .85rem', background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 6, fontSize: 11, color: '#4A5568' }}>
          <strong style={{ color: '#0A1628' }}>Como figurara en el contrato:</strong><br/>{textoOcupantes()}
        </div>}
      </div>

      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628', marginBottom: '.75rem' }}>Mascotas</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: '.75rem' }}>
          {[{v:false,l:'Sin mascotas'},{v:true,l:'Con mascotas'}].map(op => (
            <div key={String(op.v)} onClick={() => upd('mascotas','tiene',op.v)}
              style={{ flex: 1, padding: '.6rem', border: data.mascotas.tiene === op.v ? '1.5px solid #C9A84C' : '0.5px solid rgba(10,22,40,.15)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: data.mascotas.tiene === op.v ? '#F5EDD8' : '#F8F9FB', fontSize: 12, fontWeight: 500, color: '#0A1628' }}>
              {op.l}
            </div>
          ))}
        </div>
        {data.mascotas.tiene && <Fg label="Descripcion de la mascota">
          <input value={data.mascotas.descripcion} onChange={e => upd('mascotas','descripcion',e.target.value)} placeholder="Ej: Perro, raza labrador, tamano mediano, castrado" style={inpSt}/>
        </Fg>}
      </div>
    </div>,

    // PASO 2 — Locador
    <div key={1}><PersonaCard title="Locador" section="locador"/></div>,

    // PASO 3 — Locatario
    <div key={2}><PersonaCard title="Locatario" section="locatario"/></div>,

    // PASO 4 — Contrato (era paso 5)
    <div key={3}>
      <Grid2>
        <Fg label="Canon mensual" req>
          <input
            value={data.contrato.canon || ''}
            onChange={e => {
              const raw = e.target.value.replace(/\./g, '')
              if (/^\d*$/.test(raw)) upd('contrato','canon', raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
            }}
            placeholder="Ej: 280.000"
            style={inpSt}
          />
        </Fg>
        <Fg label="Moneda">
          <select value={data.contrato.moneda} onChange={e => upd('contrato','moneda',e.target.value)} style={inpSt}>
            <option value="ARS">Pesos ($)</option>
            <option value="USD">Dolares (U)</option>
          </select>
        </Fg>
      </Grid2>
      <Fg label="Tipo de ajuste">
        <select value={data.contrato.ajuste} onChange={e => upd('contrato','ajuste',e.target.value)} style={inpSt}>
          <option value="ipc">IPC (INDEC)</option>
          <option value="ipcba">IPCBA (CABA)</option>
          <option value="escalonado">Escalonado</option>
          <option value="fijo">Porcentaje fijo</option>
          <option value="mixto">Mixto</option>
          <option value="sin_ajuste">Sin ajuste</option>
        </select>
      </Fg>
      <Fg label="Periodicidad de ajuste">
        <select value={data.contrato.periodo} onChange={e => upd('contrato','periodo',e.target.value)} style={inpSt}>
          <option value="mensual">Mensual</option>
          <option value="bimestral">Bimestral</option>
          <option value="trimestral">Trimestral</option>
          <option value="cuatrimestral">Cuatrimestral</option>
          <option value="semestral">Semestral</option>
          <option value="anual">Anual</option>
        </select>
      </Fg>
      <Grid2>
        <Fg label="Fecha de inicio del contrato" req>
          <input type="date" value={data.contrato.inicio} onChange={e => upd('contrato','inicio',e.target.value)} style={inpSt}/>
        </Fg>
        <Fg label="Fecha de vencimiento del contrato" req>
          <input type="date" value={data.contrato.vencimiento} onChange={e => upd('contrato','vencimiento',e.target.value)} style={inpSt}/>
        </Fg>
      </Grid2>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '.85rem', marginTop: '.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginBottom: '.65rem' }}>Deposito en garantia</div>
        <Grid2>
          <Fg label="Monto del deposito">
            <input value={data.contrato.deposito_monto || ''} onChange={e => {
              const raw = e.target.value.replace(/\./g,'')
              if (/^\d*$/.test(raw)) upd('contrato','deposito_monto', raw.replace(/\B(?=(\d{3})+(?!\d))/g,'.'))
            }} placeholder="Ej: 280.000" style={inpSt}/>
          </Fg>
          <Fg label="Moneda del deposito">
            <select value={data.contrato.deposito_moneda} onChange={e => upd('contrato','deposito_moneda',e.target.value)} style={inpSt}>
              <option value="ARS">Pesos ($)</option>
              <option value="USD">Dolares (U)</option>
            </select>
          </Fg>
        </Grid2>
        <Fg label="Dias para devolucion del deposito">
          <select value={data.contrato.deposito_dias} onChange={e => upd('contrato','deposito_dias',e.target.value)} style={inpSt}>
            <option value="30">30 dias corridos</option>
            <option value="60">60 dias corridos</option>
            <option value="90">90 dias corridos</option>
          </select>
        </Fg>
      </div>
      <div style={{ borderTop: '0.5px solid rgba(10,22,40,.1)', paddingTop: '.85rem', marginTop: '.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginBottom: '.65rem' }}>Datos bancarios para el pago</div>
        <Fg label="Titular de la cuenta"><input value={data.contrato.tit_cbu} onChange={e => upd('contrato','tit_cbu',e.target.value)} placeholder="Nombre completo del titular" style={inpSt}/></Fg>
        <Grid2>
          <Fg label="Banco"><input value={data.contrato.banco} onChange={e => upd('contrato','banco',e.target.value)} placeholder="Ej: Banco Galicia" style={inpSt}/></Fg>
          <Fg label="Alias"><input value={data.contrato.alias} onChange={e => upd('contrato','alias',e.target.value)} placeholder="alias.cuenta" style={inpSt}/></Fg>
        </Grid2>
        <Fg label="CBU"><input value={data.contrato.cbu} onChange={e => upd('contrato','cbu',e.target.value)} placeholder="22 digitos" style={inpSt}/></Fg>
      </div>
    </div>,

    // PASO 5 — Garantia (era paso 4)
    <div key={4}>
      <div style={{ fontSize: 12, color: '#4A5568', marginBottom: '.85rem', lineHeight: 1.5 }}>
        Carga los datos de cada garante. Podes agregar mas de uno usando el boton al final.
      </div>
      {data.garantes.map((g, idx) => <GaranteCard key={idx} g={g} idx={idx}/>)}
      <button onClick={addGarante} style={{ width: '100%', padding: '8px', border: '1.5px dashed rgba(201,168,76,.5)', borderRadius: 8, background: '#F5EDD8', color: '#C9A84C', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
        + Agregar otro garante
      </button>
    </div>,

    // PASO 6 — Inventario fotografico
    <div key={5}>
      <div style={{ fontSize: 12, color: '#4A5568', marginBottom: '.85rem', lineHeight: 1.5 }}>
        Subi fotos del estado del inmueble antes de la entrega de llaves. Estas imagenes integran el Anexo 1 del contrato firmado por ambas partes.
      </div>
      {['Hall / Entrada','Living comedor','Dormitorio principal','Dormitorio 2','Cocina','Bano completo','Lavadero','Jardin / Patio','Artefactos','Fachada exterior'].map((amb, idx) => {
        const foto = data.inventario[idx]
        return <div key={idx} onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=e=>{const f=e.target.files[0]; if(f){setData(p=>{const arr=[...p.inventario]; arr[idx]=f.name; return{...p,inventario:arr}})}};inp.click() }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.65rem .9rem', border: foto ? '0.5px solid rgba(29,158,117,.4)' : '0.5px solid rgba(10,22,40,.12)', borderRadius: 8, background: foto ? 'rgba(29,158,117,.06)' : '#F8F9FB', cursor: 'pointer', marginBottom: 6 }}>
          <div style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{foto ? '✓' : '+'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: foto ? '#1D9E75' : '#0A1628' }}>{amb}</div>
            <div style={{ fontSize: 10, color: foto ? '#1D9E75' : '#8A96A3', marginTop: 1 }}>{foto || 'Tocar para subir foto'}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: foto ? 'rgba(29,158,117,.1)' : 'rgba(10,22,40,.06)', color: foto ? '#1D9E75' : '#8A96A3' }}>{foto ? 'ok' : 'opcional'}</div>
        </div>
      })}
      {data.mascotas.tiene && <>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628', marginTop: '1rem', marginBottom: '.6rem' }}>Fotos de la mascota</div>
        {['Foto de la mascota 1','Foto de la mascota 2'].map((lbl, idx) => {
          const foto = data.fotos_mascotas[idx]
          return <div key={idx} onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=e=>{const f=e.target.files[0]; if(f){setData(p=>{const arr=[...p.fotos_mascotas]; arr[idx]=f.name; return{...p,fotos_mascotas:arr}})}};inp.click() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.65rem .9rem', border: foto ? '0.5px solid rgba(29,158,117,.4)' : '0.5px solid rgba(10,22,40,.12)', borderRadius: 8, background: foto ? 'rgba(29,158,117,.06)' : '#F8F9FB', cursor: 'pointer', marginBottom: 6 }}>
            <div style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{foto ? '✓' : '+'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: foto ? '#1D9E75' : '#0A1628' }}>{lbl}</div>
              <div style={{ fontSize: 10, color: foto ? '#1D9E75' : '#8A96A3', marginTop: 1 }}>{foto || 'Tocar para subir foto'}</div>
            </div>
          </div>
        })}
      </>}
    </div>,

    // PASO 7 — Descargar
    <div key={6}>
      <div style={{ background: '#0A1628', borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: '.35rem' }}>Contrato listo para generar</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: '1.1rem', lineHeight: 1.5 }}>
          Modelo 2026 · CCyCN arts. 1187-1250 · DNU 70/2023<br/>Respaldado por martillera corredora y perito judicial
        </div>
        {error && <div style={{ background: 'rgba(240,149,149,.15)', border: '0.5px solid rgba(240,149,149,.4)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#F09595', marginBottom: '.9rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => descargar('word')} disabled={loading}
            style={{ padding: '11px 24px', background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading?'not-allowed':'pointer', opacity: loading?.6:1, fontFamily: 'inherit' }}>
            {loading ? 'Generando...' : 'Descargar Word'}
          </button>
          <button onClick={() => descargar('pdf')} disabled={loading}
            style={{ padding: '11px 24px', background: 'transparent', color: '#fff', border: '0.5px solid rgba(255,255,255,.25)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading?'not-allowed':'pointer', opacity: loading?.6:1, fontFamily: 'inherit' }}>
            Descargar PDF
          </button>
        </div>
      </div>
      <div style={{ background: '#F5EDD8', border: '0.5px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '.75rem 1rem', fontSize: 11, color: '#4A5568', textAlign: 'center' }}>
        La descarga requiere sesion activa y contratos disponibles en tu plan.
      </div>
    </div>
  ]

  // VISTA PREVIA
  if (showPreview) return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB' }}>
      <div style={{ background: '#0A1628', padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Vista previa del contrato</div>
        <button onClick={() => setShowPreview(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: '3px 8px', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 4, background: 'transparent', fontFamily: 'inherit' }}>Volver a editar</button>
      </div>
      <div style={{ maxWidth: 680, margin: '1.5rem auto', padding: '0 1rem' }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center', borderBottom: '0.5px solid rgba(10,22,40,.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#0A1628' }}>CONTRATO DE LOCACION DE VIVIENDA</div>
            <div style={{ fontSize: 11, color: '#8A96A3', marginTop: 4 }}>Modelo 2026 · CCyCN arts. 1187-1250 · DNU 70/2023</div>
          </div>
          {[
            ['Inmueble', data.inmueble.dom + (data.inmueble.ciudad ? ', ' + data.inmueble.ciudad : '')],
            ['Ocupantes', textoOcupantes()],
            ['Mascotas', data.mascotas.tiene ? data.mascotas.descripcion || 'Si' : 'No'],
            ['Locador', data.locador.nom + (data.locador.dni ? ' · DNI ' + data.locador.dni : '')],
            ['Locatario', data.locatario.nom + (data.locatario.dni ? ' · DNI ' + data.locatario.dni : '')],
            ['Garante/s', data.garantes.filter(g=>g.nom).map(g=>g.nom+(g.dni?' DNI '+g.dni:'')).join(', ')],
            ['Canon', (data.contrato.moneda === 'USD' ? 'U ' : '$ ') + (data.contrato.canon || '—')],
            ['Ajuste', data.contrato.ajuste.toUpperCase() + ' · ' + data.contrato.periodo],
            ['Inicio', data.contrato.inicio],
            ['Vencimiento', data.contrato.vencimiento],
            ['Deposito', (data.contrato.deposito_moneda === 'USD' ? 'U ' : '$ ') + (data.contrato.deposito_monto || '—') + ' · devolucion a ' + data.contrato.deposito_dias + ' dias'],
            ['CBU', data.contrato.cbu || '—'],
            ['Fotos inventario', data.inventario.filter(Boolean).length + ' de 10 subidas'],
          ].map(([k,v]) => v && <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid rgba(10,22,40,.07)', fontSize: 12 }}>
            <span style={{ color: '#4A5568', fontWeight: 500 }}>{k}</span>
            <span style={{ color: '#0A1628', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
          </div>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => descargar('word')} disabled={loading}
            style={{ flex: 1, padding: '12px', background: '#C9A84C', color: '#0A1628', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Generando...' : 'Descargar Word'}
          </button>
          <button onClick={() => setShowPreview(false)}
            style={{ padding: '12px 20px', background: '#fff', color: '#0A1628', border: '0.5px solid rgba(10,22,40,.2)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Editar
          </button>
        </div>
        {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '.65rem', fontSize: 12, color: '#A32D2D', marginTop: '.75rem', textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  )

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
        <button onClick={() => router.push('/dashboard')} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: '3px 8px', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 4, background: 'transparent', fontFamily: 'inherit' }}>Dashboard</button>
      </div>

      <div style={{ maxWidth: 580, margin: '1.5rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', marginBottom: '1rem', gap: 4 }}>
          {steps.map((s, i) => (
            <div key={i} onClick={() => { setValidationError(''); setStep(i) }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ height: 3, width: '100%', borderRadius: 2, background: i <= step ? '#C9A84C' : 'rgba(10,22,40,.1)', marginBottom: 4 }}/>
              <div style={{ fontSize: 9, color: i === step ? '#C9A84C' : '#8A96A3', fontWeight: i === step ? 500 : 400, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s}</div>
            </div>
          ))}
        </div>

        {validationError && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 10, padding: '.75rem 1rem', fontSize: 12, color: '#A32D2D', marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            {validationError}
          </div>
        )}

        <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.35rem' }}>Paso {step + 1} de {steps.length}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#0A1628', marginBottom: '1.25rem' }}>{steps[step]}</div>
          {panels[step]}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => { setValidationError(''); setStep(p => Math.max(0, p-1)) }}
            style={{ visibility: step === 0 ? 'hidden' : 'visible', padding: '8px 18px', borderRadius: 8, border: '0.5px solid rgba(10,22,40,.2)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Anterior
          </button>
          <button onClick={siguiente}
            style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#0A1628', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {step === steps.length - 1 ? 'Ver vista previa' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
