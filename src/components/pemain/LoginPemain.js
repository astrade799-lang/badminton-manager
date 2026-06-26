'use client'
import { useState } from 'react'

const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:16, padding:'12px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'12px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', width:'100%' }

export default function LoginPemain({ onLoginSuccess }) {
  const [noHp, setNoHp] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!noHp.trim() || !pin.trim()) { setError('No. HP dan PIN wajib diisi'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/pemain/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_hp: noHp.trim(), pin: pin.trim() }),
      })
      const data = await res.json()
      setLoading(false)

      if (!res.ok) { setError(data.error || 'Login gagal'); return }

      localStorage.setItem('pemain_token', data.token)
      onLoginSuccess(data)
    } catch (err) {
      setLoading(false)
      setError('Gagal terhubung ke server. Coba lagi.')
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', padding:24 }}>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏸</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#f1f5f9' }}>Badminton Manager</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>Login Pemain</div>
        </div>

        <form onSubmit={handleLogin} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={lbl}>No. HP</label>
            <input style={inp} type="tel" placeholder="cth: 0812xxxxxxx" value={noHp} onChange={e => setNoHp(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={lbl}>PIN</label>
            <input style={inp} type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
          </div>

          {error && (
            <div style={{ background:'#7f1d1d', color:'#fca5a5', padding:'10px 14px', borderRadius:8, fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" style={{ ...btnG, opacity: loading?0.6:1 }} disabled={loading}>
            {loading ? '⏳ Memproses...' : 'Masuk'}
          </button>

          <div style={{ fontSize:12, color:'#64748b', textAlign:'center' }}>
            Pemain baru? PIN default adalah <strong>0000</strong> — Anda akan diminta mengganti PIN setelah login pertama.
          </div>
        </form>
      </div>
    </div>
  )
}