'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BotonDescarga({ datos, disabled = false }) {
  const [loading, setLoading] = useState(null) // 'word' | 'pdf' | null
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function descargar(formato) {
    setLoading(formato)
    setError('')

    // 1. Verificar sesión activa
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    try {
      // 2. Llamar al endpoint protegido
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos, formato })
      })

      if (res.status === 401) {
        setError('Sesión expirada. Iniciá sesión nuevamente.')
        router.push('/login')
        return
      }

      if (res.status === 403) {
        setError('Sin contratos disponibles. Adquirí un plan.')
        return
      }

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Error al generar el documento.')
        return
      }

      // 3. Descargar el archivo
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = formato === 'word' ? 'contrato-locacion.docx' : 'contrato-locacion.pdf'
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (err) {
      setError('Error de conexión. Intentá nuevamente.')
    }

    setLoading(null)
  }

  return (
    <div>
      {/* Card de descarga */}
      <div style={{ background: '#0A1628', borderRadius: 12, padding: '1.25rem', marginBottom: '.85rem', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: '.3rem' }}>
          Contrato de locación vivienda listo
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: '1.1rem', lineHeight: 1.5 }}>
          Modelo propio 2026 · 23 cláusulas · CCyCN · DNU 70/2023<br/>
          Respaldado por martillera corredora y perito judicial
        </div>

        {error && (
          <div style={{ background: 'rgba(240,149,149,.15)', border: '0.5px solid rgba(240,149,149,.4)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12, color: '#F09595', marginBottom: '.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => descargar('word')}
            disabled={disabled || loading !== null}
            style={{
              padding: '11px 28px', background: '#C9A84C', color: '#0A1628', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: disabled || loading ? 'not-allowed' : 'pointer',
              opacity: disabled || loading ? .6 : 1, fontFamily: 'inherit', transition: 'opacity .15s'
            }}>
            {loading === 'word' ? 'Generando...' : 'Descargar Word (.docx)'}
          </button>
          <button
            onClick={() => descargar('pdf')}
            disabled={disabled || loading !== null}
            style={{
              padding: '11px 28px', background: 'transparent', color: '#fff',
              border: '0.5px solid rgba(255,255,255,.25)', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled || loading ? .6 : 1,
              fontFamily: 'inherit', transition: 'all .15s'
            }}>
            {loading === 'pdf' ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Nota de sesión */}
      <div style={{ background: '#F5EDD8', border: '0.5px solid rgba(201,168,76,.3)', borderRadius: 8, padding: '.75rem 1rem', fontSize: 11, color: '#4A5568', textAlign: 'center' }}>
        Para descargar el contrato debés estar logueado. Tu sesión es verificada antes de cada descarga.
      </div>
    </div>
  )
}
