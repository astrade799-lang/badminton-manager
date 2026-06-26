'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

export default function MatchSaya({ pemainId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [gagal, setGagal] = useState(false)

  async function muatData() {
    setLoading(true)
    setGagal(false)

    const timer = setTimeout(() => {
      setLoading(false)
      setGagal(true)
    }, 10000)

    try {
      // Ambil semua baris match_pemain milik pemain ini, beserta data match dan sesi_main-nya
      const { data: rows, error } = await supabase
        .from('match_pemain')
        .select('match:match_id(id, nomor_match, jumlah_bola_pcs, created_at, sesi_main:sesi_main_id(id, tanggal, waktu, status))')
        .eq('pemain_id', pemainId)

      clearTimeout(timer)
      if (error) throw error

      // Urutkan dari yang terbaru, kelompokkan per sesi di tahap render
      const sorted = rows
        .map(r => r.match)
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setData(sorted)
      setLoading(false)
    } catch (err) {
      clearTimeout(timer)
      setLoading(false)
      setGagal(true)
    }
  }

  useEffect(() => {
    if (pemainId) muatData()
  }, [pemainId])

  if (loading) {
    return <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>⏳ Memuat...</div>
  }

  if (gagal) {
    return (
      <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
        <div style={{ marginBottom:12 }}>⚠️ Gagal memuat data. Server mungkin lambat merespons.</div>
        <button
          onClick={muatData}
          style={{ padding:'8px 20px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
        >
          🔄 Coba Lagi
        </button>
      </div>
    )
  }

  // Kelompokkan per sesi (sesi_main_id), supaya tampilan rapi: 1 sesi, beberapa match di dalamnya
  const grupSesi = {}
  data.forEach(m => {
    const sesiId = m.sesi_main?.id
    if (!sesiId) return
    if (!grupSesi[sesiId]) {
      grupSesi[sesiId] = { sesi: m.sesi_main, matches: [] }
    }
    grupSesi[sesiId].matches.push(m)
  })
  const daftarSesi = Object.values(grupSesi)

  const totalMatch = data.length
  const totalBola = data.reduce((s, m) => s + m.jumlah_bola_pcs, 0)

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>🏸 Match Saya</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Riwayat sesi dan match yang pernah diikuti</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color:'#4ade80' }}>{totalMatch}</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Total Match</div>
        </div>
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color:'#60a5fa' }}>{totalBola}</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Total Bola</div>
        </div>
      </div>

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:14 }}>
          Riwayat Sesi
        </div>
        {daftarSesi.length === 0 ? (
          <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Belum pernah ikut match.</div>
        ) : (
          <div>
            {daftarSesi.map(({ sesi, matches }) => (
              <div key={sesi.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>
                    Sesi {sesi.waktu === 'sore' ? 'Sore' : 'Malam'}
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background: sesi.status === 'aktif' ? '#14532d' : '#334155',
                    color: sesi.status === 'aktif' ? '#4ade80' : '#94a3b8',
                  }}>
                    {sesi.status === 'aktif' ? '🟢 Aktif' : 'Selesai'}
                  </span>
                </div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>{formatTanggal(sesi.tanggal)}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {matches.map(m => (
                    <span key={m.id} style={{ background:'#0f172a', padding:'4px 10px', borderRadius:20, fontSize:12, color:'#94a3b8' }}>
                      Match #{m.nomor_match} · <span style={{ color:'#4ade80' }}>{m.jumlah_bola_pcs} bola</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}