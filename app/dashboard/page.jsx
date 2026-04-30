"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/login"); return }
      setUser(session.user)
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FB" }}>
      <div style={{ fontSize: 14, color: "#4A5568" }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB" }}>
      <div style={{ background: "#0A1628", padding: ".85rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, background: "#C9A84C", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="#0A1628"><path d="M7 1L2 4v6l5 3 5-3V4L7 1zm0 1.5L11 5v4L7 11 3 9V5l4-2.5z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Tu contrato de locacion vivienda</div>
            <div style={{ fontSize: 9, color: "#C9A84C", letterSpacing: ".08em", textTransform: "uppercase" }}>Sistema profesional 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>{profile?.nombre || user.email}</div>
            <div style={{ fontSize: 9, color: "#C9A84C", textTransform: "uppercase", letterSpacing: ".06em" }}>{profile?.rol || "corredor"}</div>
          </div>
          <button onClick={logout} style={{ fontSize: 10, color: "rgba(255,255,255,.5)", cursor: "pointer", padding: "3px 8px", border: "0.5px solid rgba(255,255,255,.2)", borderRadius: 4, background: "transparent", fontFamily: "inherit" }}>
            Salir
          </button>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
        <div style={{ background: "#fff", border: "0.5px solid rgba(10,22,40,.1)", borderRadius: 16, padding: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#0A1628", marginBottom: ".5rem" }}>Bienvenida, {profile?.nombre?.split(" ")[0] || "Jimena"}</div>
          <div style={{ fontSize: 13, color: "#4A5568", marginBottom: "1.25rem" }}>
            Contratos disponibles: <strong style={{ color: profile?.contratos_disponibles > 0 ? "#1D9E75" : "#A32D2D" }}>{profile?.contratos_disponibles || 0}</strong>
          </div>
          <button onClick={() => router.push("/contrato")}
            style={{ padding: "11px 32px", background: "#C9A84C", color: "#0A1628", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Generar nuevo contrato
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem" }}>
          {[
            { qty: "1 contrato", price: "$29.900", unit: "$29.900 c/u" },
            { qty: "2 contratos", price: "$39.900", unit: "$19.950 c/u", featured: true },
            { qty: "5 contratos", price: "$79.900", unit: "$15.980 c/u" },
          ].map((p, i) => (
            <div key={i} style={{ background: p.featured ? "#F5EDD8" : "#fff", border: p.featured ? "1.5px solid #C9A84C" : "0.5px solid rgba(10,22,40,.1)", borderRadius: 12, padding: "1rem", textAlign: "center", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#C9A84C", color: "#0A1628", fontSize: 9, fontWeight: 500, padding: "2px 10px", borderRadius: 10, whiteSpace: "nowrap" }}>Mas elegido</div>}
              <div style={{ fontSize: 11, color: "#4A5568", marginBottom: 4 }}>{p.qty}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#0A1628", marginBottom: 3 }}>{p.price}</div>
              <div style={{ fontSize: 10, color: "#8A96A3", marginBottom: 12 }}>{p.unit}</div>
              <button style={{ width: "100%", padding: 8, borderRadius: 6, border: "none", background: p.featured ? "#C9A84C" : "#0A1628", color: p.featured ? "#0A1628" : "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Comprar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
