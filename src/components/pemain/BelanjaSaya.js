'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}

export default function BelanjaSaya({ pemainId }) {
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
      const { data: rows, error } = await supabase
        .from('sesi_belanja')
        .select('*, stok:produk_id(nama, satuan_kecil), sesi_main:sesi_main_id(tanggal, waktu)')
        .eq('pemain_id', pemainId)
        .order('created_at', { ascending: false })

      clearTimeout(timer)
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

  const totalBelanja = data.reduce((s, b) => s + b.total, 0)

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
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>🛒 Belanja Saya</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Riwayat pembelian produk saat sesi main</div>
      </div>

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:18, marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#2563eb' }} />
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, marginBottom:8 }}>Total Belanja</div>
        <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color:'#60a5fa' }}>
          {formatRupiah(totalBelanja)}
        </div>
        <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{data.length} transaksi</div>
      </div>

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:14 }}>
          Riwayat Belanja
        </div>
        {data.length === 0 ? (
          <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Belum ada riwayat belanja.</div>
        ) : (
          <div>
            {data.map(b => (
              <div key={b.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{b.stok?.nama || 'Produk'}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                    {formatTanggal(b.sesi_main?.tanggal)} · {b.sesi_main?.waktu === 'sore' ? 'Sore' : 'Malam'} · {b.jumlah_pcs} {b.stok?.satuan_kecil}
                  </div>
                </div>
                <div style={{ fontFamily:'monospace', fontWeight:700, color:'#4ade80', flexShrink:0 }}>
                  {formatRupiah(b.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}