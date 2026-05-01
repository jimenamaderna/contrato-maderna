'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function Admin() {
  const [pass, setPass] = useState('')
  const [auth, setAuth] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [historial, setHistorial] = useState([])
  const [ok, setOk] = useState('')
  const supabase = createClient()

  async function login(e) {
    e.preventDefault()
    const res = await fetch('/api/admin/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    })
    if (res.ok) {
      setAuth(true)
      setError('')
      cargarHistorial()
    } else {
      setError('Contrasena incorrecta')
    }
  }

  async function cargarHistorial() {
    const { data } = await supabase
      .from('contratos_modelo')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setHistorial(data)
  }

  async function subir(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true); setError(''); setOk('')
    try {
      const filename = 'modelo-' + Date.now() + '.docx'
      const { error: upErr } = await supabase.storage
        .from('contratos-modelo')
        .upload(filename, file, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (upErr) throw upErr
      const { error: dbErr } = await supabase
        .from('contratos_modelo')
        .insert({ filename, activo: true, nombre: file.name })
      if (dbErr) throw dbErr
      await supabase
        .from('contratos_modelo')
        .update({ activo: false })
        .neq('filename', filename)
      setOk('Modelo actualizado correctamente')
      setFile(null)
      cargarHistorial()
    } catch (err) {
      setError('Error al subir: ' + err.message)
    }
    setUploading(false)
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '.6rem' }}>
            <svg width="20" height="20" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#0A1628' }}>Panel de administracion</div>
          <div style={{ fontSize: 12, color: '#4A5568', marginTop: 3 }}>Acceso restringido</div>
        </div>
        {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#A32D2D', marginBottom: '.85rem' }}>{error}</div>}
        <form onSubmit={login}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }}>Contrasena</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(10,22,40,.2)', borderRadius: 6 }}/>
          </div>
          <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#0A1628', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB' }}>
      <div style={{ background: '#0A1628', padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#C9A84C', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Panel Admin — Contrato PRO Maderna</div>
        </div>
        <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.08em', textTransform: 'uppercase' }}>Acceso admin</div>
      </div>

      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>

        <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#0A1628', marginBottom: '.25rem' }}>Subir nueva version del contrato</div>
          <div style={{ fontSize: 12, color: '#4A5568', marginBottom: '1rem', lineHeight: 1.5 }}>
            El archivo Word que subas reemplaza al modelo activo. Todos los nuevos contratos generados usaran esta version.
          </div>

          {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#A32D2D', marginBottom: '.85rem' }}>{error}</div>}
          {ok && <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#0F6E56', marginBottom: '.85rem', fontWeight: 500 }}>{ok}</div>}

          <form onSubmit={subir}>
            <div onClick={() => document.getElementById('file-input').click()}
              style={{ border: file ? '1.5px solid #C9A84C' : '1.5px dashed rgba(10,22,40,.2)', borderRadius: 10, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: file ? '#F5EDD8' : '#F8F9FB', marginBottom: '1rem', transition: 'all .15s' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628', marginBottom: 4 }}>
                {file ? file.name : 'Hacer clic para seleccionar el archivo .docx'}
              </div>
              <div style={{ fontSize: 11, color: '#8A96A3' }}>
                {file ? 'Archivo listo para subir' : 'Solo archivos Word (.docx)'}
              </div>
            </div>
            <input id="file-input" type="file" accept=".docx" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])}/>
            <button type="submit" disabled={!file || uploading}
              style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: file ? '#C9A84C' : '#ccc', color: file ? '#0A1628' : '#fff', fontSize: 13, fontWeight: 500, cursor: file ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: uploading ? .7 : 1 }}>
              {uploading ? 'Subiendo...' : 'Subir nuevo modelo'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#0A1628', marginBottom: '1rem' }}>Historial de versiones</div>
          {historial.length === 0 ? (
            <div style={{ fontSize: 12, color: '#8A96A3', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>Sin versiones cargadas todavia</div>
          ) : historial.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.65rem .85rem', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, background: h.activo ? '#F5EDD8' : '#F8F9FB', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0A1628' }}>{h.nombre}</div>
                <div style={{ fontSize: 11, color: '#8A96A3', marginTop: 2 }}>
                  Subido: {new Date(h.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {h.activo && (
                <div style={{ fontSize: 10, fontWeight: 500, background: '#C9A84C', color: '#0A1628', padding: '3px 10px', borderRadius: 20 }}>
                  ACTIVO
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
