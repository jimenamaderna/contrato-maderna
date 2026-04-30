'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'corredor' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState('')

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    setLoading(true); setError(''); setOk('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleRegistro(e) {
    e.preventDefault()
    setLoading(true); setError(''); setOk('')
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { nombre: form.nombre, rol: form.rol } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    // Actualizar perfil con nombre y rol
    if (data.user) {
      await supabase.from('profiles').update({ nombre: form.nombre, rol: form.rol }).eq('id', data.user.id)
    }
    setOk('Cuenta creada. Verificá tu email y luego iniciá sesión.')
    setModo('login')
    setLoading(false)
  }

  const roles = [
    { id: 'corredor', label: 'Corredor', desc: 'Intermediario matriculado' },
    { id: 'locador', label: 'Locador', desc: 'Propietario del inmueble' },
    { id: 'locatario', label: 'Locatario', desc: 'Inquilino' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: '#fff', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 44, height: 44, background: '#C9A84C', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '.6rem' }}>
            <svg width="22" height="22" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#0A1628' }}>Tu contrato de locación</div>
          <div style={{ fontSize: 12, color: '#4A5568', marginTop: 3 }}>Sistema profesional 2026</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', border: '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.25rem' }}>
          {['login','registro'].map(m => (
            <button key={m} onClick={() => { setModo(m); setError(''); setOk('') }}
              style={{ flex: 1, padding: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: modo === m ? '#fff' : '#F8F9FB',
                color: modo === m ? '#0A1628' : '#4A5568',
                fontFamily: 'inherit' }}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Mensajes */}
        {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#A32D2D', marginBottom: '.85rem' }}>{error}</div>}
        {ok && <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#0F6E56', marginBottom: '.85rem' }}>{ok}</div>}

        {/* Google */}
        <button onClick={handleGoogleLogin} disabled={loading}
          style={{ width: '100%', padding: '9px', borderRadius: 8, border: '0.5px solid rgba(10,22,40,.2)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 8, fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.4 5.5-5 7.2v6h8c4.7-4.3 7.4-10.7 7.4-17.5z"/>
            <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-8-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.5v6.2C6.5 42.6 14.7 48 24 48z"/>
            <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.7-2.8-.7-4.3s.2-2.9.7-4.3V14H2.5C.9 17.1 0 20.4 0 24s.9 6.9 2.5 10l8.3-5.2z"/>
            <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.6-6.6C35.9 2.5 30.4 0 24 0 14.7 0 6.5 5.4 2.5 14l8.3 6.2c1.9-5.6 7.1-10.7 13.2-10.7z"/>
          </svg>
          Continuar con Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1rem 0' }}>
          <div style={{ flex: 1, height: .5, background: 'rgba(10,22,40,.1)' }}/>
          <span style={{ fontSize: 11, color: '#8A96A3' }}>o</span>
          <div style={{ flex: 1, height: .5, background: 'rgba(10,22,40,.1)' }}/>
        </div>

        <form onSubmit={modo === 'login' ? handleEmailLogin : handleRegistro}>
          {modo === 'registro' && (
            <>
              <div style={{ marginBottom: 9 }}>
                <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }}>Nombre completo</label>
                <input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Tu nombre" required style={{ width: '100%', fontSize: 13 }}/>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Rol</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {roles.map(r => (
                    <div key={r.id} onClick={() => f('rol', r.id)}
                      style={{ padding: '.55rem .4rem', border: form.rol === r.id ? '1.5px solid #C9A84C' : '0.5px solid rgba(10,22,40,.1)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: form.rol === r.id ? '#F5EDD8' : '#F8F9FB' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: form.rol === r.id ? '#102040' : '#0A1628' }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: form.rol === r.id ? '#6B5A2A' : '#8A96A3', marginTop: 2, lineHeight: 1.3 }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }}>Email</label>
            <input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@ejemplo.com" required style={{ width: '100%', fontSize: 13 }}/>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 500, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 }}>Contraseña</label>
            <input type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'} required style={{ width: '100%', fontSize: 13 }}/>
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: '#0A1628', color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Procesando...' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div style={{ fontSize: 11, color: '#8A96A3', textAlign: 'center', marginTop: '.85rem' }}>
          {modo === 'login' ? <>¿No tenés cuenta? <span onClick={() => setModo('registro')} style={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>Registrarse</span></> : <>¿Ya tenés cuenta? <span onClick={() => setModo('login')} style={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>Iniciar sesión</span></>}
        </div>
      </div>
    </div>
  )
}
