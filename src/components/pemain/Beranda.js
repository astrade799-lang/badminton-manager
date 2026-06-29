'use client'
import { useState, useEffect } from 'react'

function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}
// Kunci pengelompokan: pakai tanggal saja (YYYY-MM-DD), tanpa jam — supaya transaksi di hari yang
// sama (belanja + catatan belum dibayar) muncul dalam 1 grup, walau timestamp persisnya beda.
function tanggalKunci(timestampAtauTanggal) {
  if (!timestampAtauTanggal) return 'tidak-diketahui'
  return timestampAtauTanggal.split('T')[0]
}

export default function Beranda({ pemainId, nama, token }) {
  const [loading, setLoading] = useState(true)
  const [gagal, setGagal] = useState(false)
  const [sesiAktif, setSesiAktif] = useState(null)
  const [matchSesiIni, setMatchSesiIni] = useState([])
  const [biayaSesiIni, setBiayaSesiIni] = useState([])
  const [riwayatMatch, setRiwayatMatch] = useState([])
  const [belumDibayar, setBelumDibayar] = useState([])
  const [belanja, setBelanja] = useState([])
  const [transaksiTerbuka, setTransaksiTerbuka] = useState(false)
  const [matchTerbuka, setMatchTerbuka] = useState(null) // id match yang sedang di-expand
  const [infoAdmin, setInfoAdmin] = useState([])

  // Semua data Beranda diambil lewat SATU API Route (/api/pemain/data) yang jalan di server
  // dengan service role key (bypass RLS) — karena Pemain tidak login lewat Supabase Auth,
  // jadi query langsung dari browser akan selalu ditolak diam-diam oleh RLS policy yang
  // mensyaratkan auth.role() = 'authenticated' (lihat tabel hutang).
  async function muatData() {
    setLoading(true)
    setGagal(false)

    const timer = setTimeout(() => {
      setLoading(false)
      setGagal(true)
    }, 10000)

    try {
      const res = await fetch('/api/pemain/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      clearTimeout(timer)

      if (!res.ok) throw new Error(data.error || 'Gagal memuat data')

      const sesiAktifSekarang = data.matchAktif.length > 0 ? data.matchAktif[0].sesi_main : null
      const riwayat = data.semuaMatch.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

      setSesiAktif(sesiAktifSekarang)
      setMatchSesiIni(data.matchAktif)
      setBiayaSesiIni(data.biayaSesiIni)
      setRiwayatMatch(riwayat)
      setBelumDibayar(data.hutang)
      setBelanja(data.belanja)
      setInfoAdmin(data.infoAdmin)
      setLoading(false)
    } catch (err) {
      clearTimeout(timer)
      setLoading(false)
      setGagal(true)
    }
  }

  useEffect(() => {
    if (pemainId && token) muatData()
  }, [pemainId, token])

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

  // Hitung sisa belum dibayar untuk sesi aktif
  let sisaBola = 0
  let totalSudahDibayar = 0
  if (sesiAktif) {
    const bayarTerakhir = biayaSesiIni.reduce((latest, b) => (!latest || b.created_at > latest) ? b.created_at : latest, null)
    totalSudahDibayar = biayaSesiIni.reduce((s, b) => s + b.biaya, 0)
    sisaBola = matchSesiIni.reduce((s, m) => {
      if (bayarTerakhir && m.created_at <= bayarTerakhir) return s
      return s + m.jumlah_bola_pcs
    }, 0)
  }

  // Gabungkan belanja + belum-dibayar jadi 1 daftar transaksi, dikelompokkan per tanggal
  const grupTransaksi = {}
  belanja.forEach(b => {
    const key = tanggalKunci(b.created_at)
    if (!grupTransaksi[key]) grupTransaksi[key] = { tanggal: key, items: [] }
    grupTransaksi[key].items.push({
      jenis: 'belanja',
      label: `🛒 ${b.stok?.nama || 'Produk'} (${b.jumlah_pcs} ${b.stok?.satuan_kecil || 'pcs'})`,
      nominal: b.total,
      // Lunas HANYA kalau belanja ini sudah ditandai termasuk dalam pembayaran tertentu
      // (sesi_pemain_biaya_id terisi) — bukan diasumsikan lunas begitu saja.
      // Lunas HANYA kalau belanja ini ditandai DAN status pembayaran terkait benar-benar 'lunas'
      // (bukan sekadar "sudah ditandai" — penandaan juga terjadi untuk status 'belum'/hutang).
      lunas: b.biaya_terkait?.status_bayar === 'lunas',
    })
  })
  belumDibayar.forEach(h => {
    const key = tanggalKunci(h.tanggal || h.created_at)
    if (!grupTransaksi[key]) grupTransaksi[key] = { tanggal: key, items: [] }
    const sisa = Math.max(0, h.total_hutang - h.sudah_bayar)
    grupTransaksi[key].items.push({
      jenis: 'belum-dibayar',
      label: `💳 ${h.keterangan || 'Tagihan'}`,
      nominal: sisa,
      lunas: sisa <= 0,
    })
  })
  const daftarTransaksi = Object.values(grupTransaksi).sort((a, b) => b.tanggal.localeCompare(a.tanggal))

  // Total belum dibayar = gabungan SEMUA item (belanja + hutang) yang belum ditandai lunas —
  // bukan cuma dari tabel hutang saja, supaya badge header akurat mewakili isi accordion.
  const totalBelumDibayar = daftarTransaksi.reduce((s, grup) => {
    return s + grup.items.reduce((s2, item) => s2 + (item.lunas ? 0 : item.nominal), 0)
  }, 0)

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>👋 Halo, {nama}!</div>
      </div>

      {/* ── MATCH HARI INI ── */}
      {sesiAktif && (
        <div style={{ background:'#14241a', border:'1px solid #16a34a', borderRadius:12, padding:18, marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#4ade80', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            🟢 Sesi {sesiAktif.waktu === 'sore' ? 'Sore' : 'Malam'} Sedang Berjalan
          </div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:12 }}>
            Anda ikut {matchSesiIni.length} match hari ini
          </div>

          {sisaBola > 0 ? (
            <div style={{ background:'#0f172a', borderRadius:8, padding:14 }}>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Belum Dibayar</div>
              <div style={{ fontSize:20, fontWeight:800, fontFamily:'monospace', color:'#f59e0b' }}>
                {sisaBola} bola
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
                💡 Pembayaran diproses oleh kasir secara langsung di lokasi.
              </div>
            </div>
          ) : (
            <div style={{ background:'#0f172a', borderRadius:8, padding:14, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>✅</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#4ade80' }}>Lunas</div>
                {totalSudahDibayar > 0 && (
                  <div style={{ fontSize:12, color:'#64748b' }}>Sudah dibayar {formatRupiah(totalSudahDibayar)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RIWAYAT MATCH TERAKHIR ── */}
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:14 }}>
          📋 Riwayat Match Terakhir
        </div>
        {riwayatMatch.length === 0 ? (
          <div style={{ textAlign:'center', padding:24, color:'#94a3b8', fontSize:13 }}>Belum pernah ikut match.</div>
        ) : (
          <div>
            {riwayatMatch.map(m => {
              const terbuka = matchTerbuka === m.id
              const namaPemainLain = (m.match_pemain || [])
                .map(mp => mp.pemain?.nama)
                .filter(Boolean)
              return (
                <div key={m.id} style={{ borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  <div
                    style={{ padding:'10px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                    onClick={() => setMatchTerbuka(terbuka ? null : m.id)}
                  >
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>
                        Sesi {m.sesi_main?.waktu === 'sore' ? 'Sore' : 'Malam'} · Match #{m.nomor_match}
                      </div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{formatTanggal(m.sesi_main?.tanggal)}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'monospace', fontSize:13, color:'#4ade80' }}>{m.jumlah_bola_pcs} bola</span>
                      <span style={{ color:'#64748b', fontSize:11 }}>{terbuka ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {terbuka && (
                    <div style={{ padding:'0 16px 12px' }}>
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>Pemain yang ikut match ini:</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {namaPemainLain.map((nama, i) => (
                          <span key={i} style={{ background:'#0f172a', padding:'4px 10px', borderRadius:20, fontSize:12, color:'#cbd5e1' }}>
                            {nama}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── TRANSAKSI — accordion gabungan belanja + belum dibayar, dikelompokkan per tanggal ── */}
      {daftarTransaksi.length > 0 && (
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
          <div
            style={{ padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
            onClick={() => setTransaksiTerbuka(!transaksiTerbuka)}
          >
            <span style={{ fontWeight:700, fontSize:14 }}>💼 Transaksi</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {totalBelumDibayar > 0 ? (
                <span style={{ fontFamily:'monospace', color:'#f59e0b', fontWeight:700, fontSize:13 }}>{formatRupiah(totalBelumDibayar)}</span>
              ) : (
                <span style={{ color:'#4ade80', fontSize:12 }}>✅ Lunas</span>
              )}
              <span style={{ color:'#64748b' }}>{transaksiTerbuka ? '▲' : '▼'}</span>
            </div>
          </div>
          {transaksiTerbuka && (
            <div style={{ borderTop:'1px solid #334155' }}>
              {daftarTransaksi.map(grup => (
                <div key={grup.tanggal} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:8, fontWeight:600 }}>
                    📅 {grup.tanggal === 'tidak-diketahui' ? '–' : formatTanggal(grup.tanggal)}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {grup.items.map((item, i) => (
                      <div key={i} style={{ background:'#0f172a', borderRadius:6, padding:'8px 10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:13, color:'#cbd5e1' }}>{item.label}</span>
                          <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color: item.lunas ? '#4ade80' : '#f59e0b' }}>
                            {formatRupiah(item.nominal)}
                          </span>
                        </div>
                        <div style={{ fontSize:11, marginTop:4, color: item.lunas ? '#4ade80' : '#f59e0b' }}>
                          {item.lunas ? '✅ Lunas' : '⏳ Belum Dibayar'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INFORMASI DARI ADMIN — paket bola, QR transfer, turnamen, dll ── */}
      {infoAdmin.length > 0 && (
        <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:12 }}>
          {infoAdmin.map(info => (
            <div key={info.id} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom: (info.konten || info.gambar_url) ? '1px solid #334155' : 'none', fontWeight:700, fontSize:14 }}>
                📢 {info.judul}
              </div>
              {info.gambar_url && (
                <div style={{ padding:16, textAlign:'center' }}>
                  <img src={info.gambar_url} alt={info.judul} style={{ maxWidth:'100%', borderRadius:8 }} />
                </div>
              )}
              {info.konten && (
                <div style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                  {info.konten}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}