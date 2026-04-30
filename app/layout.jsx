export const metadata = {
  title: 'Tu contrato de locación vivienda',
  description: 'Sistema profesional de contratos 2026',
}
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
