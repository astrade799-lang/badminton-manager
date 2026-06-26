'use client'
import { useState } from 'react'

const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:16, padding:'12px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'12px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', width:'100%' }

export default function GantiPin({ token, onSelesai, wajib = true }) {
  const [pinBaru, setPinBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSimpan(e) {
    e.preventDefault()
    setError('')

    if (pinBaru.length < 4) { setError('PIN minimal 4 digit'); return }
    if (pinBaru !== konfirmasi) { setError('PIN dan konfirmasi tidak cocok'); return }
    if (pinBaru === '0000') { setError('Jangan gunakan PIN default, pilih PIN lain'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/pemain/ganti-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin_baru: pinBaru }),
      })
      const data = await res.json()
      setLoading(false)

      if (!res.ok) { setError(data.error || 'Gagal mengganti PIN'); return }
      onSelesai()
    } catch (err) {
      setLoading(false)
      setError('Gagal terhubung ke server. Coba lagi.')
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', padding:24 }}>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:18, fontWeight:800, color:'#f1f5f9' }}>
            {wajib ? 'Ganti PIN Anda' : 'Ubah PIN'}
          </div>
          {wajib && (
            <div style={{ fontSize:13, color:'#94a3b8', marginTop:6 }}>
              Demi keamanan, ganti PIN default sebelum lanjut.
            </div>
          )}
        </div>

        <form onSubmit={handleSimpan} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={lbl}>PIN Baru (4-6 digit)</label>
            <input style={inp} type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={pinBaru} onChange={e => setPinBaru(e.target.value.replace(/\D/g, ''))} autoFocus />
          </div>
          <div>
            <label style={lbl}>Konfirmasi PIN Baru</label>
            <input style={inp} type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={konfirmasi} onChange={e => setKonfirmasi(e.target.value.replace(/\D/g, ''))} />
          </div>

          {error && (
            <div style={{ background:'#7f1d1d', color:'#fca5a5', padding:'10px 14px', borderRadius:8, fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" style={{ ...btnG, opacity: loading?0.6:1 }} disabled={loading}>
            {loading ? '⏳ Menyimpan...' : 'Simpan PIN Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}