'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}
function statusHutang(total, bayar) {
  const sisa = total - bayar
  if (sisa <= 0)   return { label:'Lunas',       warna:'#dcfce7', teks:'#14532d' }
  if (bayar === 0) return { label:'Belum Bayar', warna:'#fee2e2', teks:'#991b1b' }
  return                   { label:'Sebagian',    warna:'#fef3c7', teks:'#92400e' }
}

export default function HutangSaya({ pemainId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [gagal, setGagal] = useState(false)

  async function muatData() {
    setLoading(true)
    setGagal(false)

    // Timer mandiri: kalau 10 detik berlalu dan masih loading, paksa tampilkan tombol coba lagi.
    // Ini independen dari hasil query Supabase (tidak peduli query itu macet atau lambat).
    const timer = setTimeout(() => {
      setLoading(false)
      setGagal(true)
    }, 10000)

    try {
      const { data: rows, error } = await supabase
        .from('hutang')
        .select('*')
        .eq('pemain_id', pemainId)
        .order('created_at', { ascending: false })

      clearTimeout(timer) // query selesai duluan sebelum timer — batalkan timer
      if (error) throw error
      setData(rows)
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

  const totalSisa = data.reduce((s, h) => s + Math.max(0, h.total_hutang - h.sudah_bayar), 0)

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

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>💳 Hutang Saya</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Riwayat dan total hutang yang belum lunas</div>
      </div>

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:18, marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: totalSisa > 0 ? '#dc2626' : '#16a34a' }} />
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, marginBottom:8 }}>Total Belum Lunas</div>
        <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color: totalSisa > 0 ? '#dc2626' : '#4ade80' }}>
          {formatRupiah(totalSisa)}
        </div>
      </div>

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:14 }}>
          Riwayat Hutang
        </div>
        {data.length === 0 ? (
          <div style={{ textAlign:'center', padding:32, color:'#4ade80', fontSize:13 }}>✅ Tidak ada hutang.</div>
        ) : (
          <div>
            {data.map(h => {
              const sisa = Math.max(0, h.total_hutang - h.sudah_bayar)
              const s = statusHutang(h.total_hutang, h.sudah_bayar)
              return (
                <div key={h.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div style={{ fontSize:13, color:'#cbd5e1', flex:1 }}>{h.keterangan || '–'}</div>
                    <span style={{ background:s.warna, color:s.teks, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0, marginLeft:8 }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>{formatTanggal(h.tanggal)}</span>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color: sisa > 0 ? '#dc2626' : '#4ade80' }}>
                      {formatRupiah(sisa)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}