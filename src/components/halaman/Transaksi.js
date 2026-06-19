'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}
function hariIni() { return new Date().toISOString().split('T')[0] }
function tampilStok(stok_pcs, isi, satuan_besar, satuan_kecil) {
  if (!isi || isi <= 0) return `${stok_pcs} ${satuan_kecil}`
  const besar = Math.floor(stok_pcs / isi)
  const sisa  = stok_pcs % isi
  if (besar === 0) return `${sisa} ${satuan_kecil}`
  if (sisa === 0)  return `${besar} ${satuan_besar}`
  return `${besar} ${satuan_besar} ${sisa} ${satuan_kecil}`
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function cek() { setIsMobile(window.innerWidth <= 768) }
    cek()
    window.addEventListener('resize', cek)
    return () => window.removeEventListener('resize', cek)
  }, [])
  return isMobile
}

const panel = { background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden', marginBottom:20 }
const th = { padding:'11px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid #334155' }
const td = { padding:'12px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', verticalAlign:'middle', fontSize:14 }
const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'9px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'9px 16px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnS = { padding:'7px 16px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

export default function Transaksi() {
  const [tab, setTab]         = useState('jual')
  const [produkList, setProdukList] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan]     = useState(null)
  const isMobile = useIsMobile()

  const [jualProduk, setJualProduk]   = useState('')
  const [jualSatuan, setJualSatuan]   = useState('besar')
  const [jualJumlah, setJualJumlah]   = useState('')
  const [jualHarga, setJualHarga]     = useState('')
  const [jualDiskon, setJualDiskon]   = useState('0')

  const [lapProduk, setLapProduk]   = useState('')
  const [lapSesi, setLapSesi]       = useState('sore')
  const [lapJumlah, setLapJumlah]   = useState('')
  const [lapHarga, setLapHarga]     = useState('')

  const [filterTipe, setFilterTipe]       = useState('')
  const [filterTanggal, setFilterTanggal] = useState('')

  async function muatData() {
    const [resProduk, resHistory] = await Promise.all([
      supabase.from('stok').select('*').order('nama'),
      supabase.from('transaksi_stok').select('*, stok(nama, satuan_besar, satuan_kecil, isi_per_satuan)').order('created_at', { ascending:false }).limit(100),
    ])
    if (!resProduk.error)  setProdukList(resProduk.data)
    if (!resHistory.error) setHistory(resHistory.data)
  }
  useEffect(() => { muatData() }, [])

  function tampilPesan(teks) { setPesan(teks); setTimeout(()=>setPesan(null), 4000) }

  const produkJual = produkList.find(p => p.id === parseInt(jualProduk))
  const produkLap  = produkList.find(p => p.id === parseInt(lapProduk))

  const jualJmlPcs = produkJual ? (jualSatuan==='besar' ? (parseInt(jualJumlah)||0)*produkJual.isi_per_satuan : (parseInt(jualJumlah)||0)) : 0
  const jualHargaDefault = produkJual ? (jualSatuan==='besar' ? produkJual.harga_jual_besar : produkJual.harga_jual_pcs) : 0
  const jualHargaFinal = parseInt(jualHarga) || jualHargaDefault || 0
  const jualSubtotal   = (parseInt(jualJumlah)||0) * jualHargaFinal
  const jualDiskonNom  = parseInt(jualDiskon) || 0
  const jualTotal      = Math.max(0, jualSubtotal - jualDiskonNom)

  const lapJmlPcs       = parseInt(lapJumlah) || 0
  const lapHargaDefault = produkLap?.harga_pakai_pcs || 0
  const lapHargaFinal   = parseInt(lapHarga) || lapHargaDefault || 0
  const lapTotal        = lapJmlPcs * lapHargaFinal

  async function simpanJual() {
    if (!jualProduk) { tampilPesan('⚠️ Pilih produk dulu!'); return }
    if (!jualJumlah || parseInt(jualJumlah) <= 0) { tampilPesan('⚠️ Jumlah wajib diisi!'); return }
    if (!produkJual) return
    if (jualJmlPcs > produkJual.stok_pcs) { tampilPesan(`⚠️ Stok tidak cukup! Tersedia: ${tampilStok(produkJual.stok_pcs, produkJual.isi_per_satuan, produkJual.satuan_besar, produkJual.satuan_kecil)}`); return }
    setLoading(true)
    await supabase.from('stok').update({ stok_pcs: produkJual.stok_pcs - jualJmlPcs }).eq('id', produkJual.id)
    await supabase.from('transaksi_stok').insert([{
      produk_id: produkJual.id, tipe:'jual', jumlah_pcs:jualJmlPcs,
      harga_per_pcs: jualSatuan==='besar' ? Math.round(jualHargaFinal/produkJual.isi_per_satuan) : jualHargaFinal,
      diskon: jualDiskonNom, total: jualTotal,
      keterangan: `Jual ${jualJumlah} ${jualSatuan==='besar'?produkJual.satuan_besar:produkJual.satuan_kecil} ${produkJual.nama}`,
      tanggal: hariIni(),
    }])
    if (jualTotal > 0) {
      await supabase.from('kas').insert([{
        jenis:'masuk', kategori:'Penjualan Stok', sub_kategori: produkJual.kategori,
        keterangan: `Jual ${jualJumlah} ${jualSatuan==='besar'?produkJual.satuan_besar:produkJual.satuan_kecil} ${produkJual.nama}${jualDiskonNom>0?` (diskon ${formatRupiah(jualDiskonNom)})`:''}`,
        nominal: jualTotal, tanggal: hariIni(),
      }])
    }
    setLoading(false)
    tampilPesan(`✅ Terjual! Kas +${formatRupiah(jualTotal)}`)
    setJualProduk(''); setJualJumlah(''); setJualHarga(''); setJualDiskon('0'); setJualSatuan('besar')
    muatData()
  }

  async function simpanLapangan() {
    if (!lapProduk) { tampilPesan('⚠️ Pilih produk dulu!'); return }
    if (!lapJumlah || lapJmlPcs <= 0) { tampilPesan('⚠️ Jumlah wajib diisi!'); return }
    if (!produkLap) return
    if (lapJmlPcs > produkLap.stok_pcs) { tampilPesan(`⚠️ Stok tidak cukup! Tersedia: ${tampilStok(produkLap.stok_pcs, produkLap.isi_per_satuan, produkLap.satuan_besar, produkLap.satuan_kecil)}`); return }
    setLoading(true)
    await supabase.from('stok').update({ stok_pcs: produkLap.stok_pcs - lapJmlPcs }).eq('id', produkLap.id)
    await supabase.from('transaksi_stok').insert([{
      produk_id: produkLap.id, tipe:'pakai', sesi:lapSesi, jumlah_pcs:lapJmlPcs,
      harga_per_pcs: lapHargaFinal, diskon:0, total: lapTotal,
      keterangan: `Lapangan ${lapSesi} — ${lapJmlPcs} ${produkLap.satuan_kecil} ${produkLap.nama}`,
      tanggal: hariIni(),
    }])
    if (lapTotal > 0) {
      await supabase.from('kas').insert([{
        jenis:'masuk', kategori:'Sewa Lapangan', sub_kategori:`Lapangan ${lapSesi}`,
        keterangan: `Lapangan ${lapSesi} — ${lapJmlPcs} ${produkLap.satuan_kecil} ${produkLap.nama}`,
        nominal: lapTotal, tanggal: hariIni(),
      }])
    }
    setLoading(false)
    tampilPesan(`✅ Pemakaian lapangan ${lapSesi} tercatat! Kas +${formatRupiah(lapTotal)}`)
    setLapProduk(''); setLapJumlah(''); setLapHarga('')
    muatData()
  }

  const historyFiltered = history.filter(t =>
    (filterTipe === '' || t.tipe === filterTipe) &&
    (filterTanggal === '' || t.tanggal === filterTanggal)
  )

  const labelTipe = { jual:'🛒 Jual', pakai:'🏸 Lapangan', restock:'📥 Restock' }
  const warnaTipe = { jual:'#dcfce7', pakai:'#dbeafe', restock:'#fef3c7' }
  const teksTipe  = { jual:'#14532d', pakai:'#1e40af', restock:'#92400e' }

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {pesan}
        </div>
      )}

      <div style={{ marginBottom:isMobile?16:24 }}>
        <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🛒 Transaksi</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Catat penjualan dan pemakaian lapangan</div>
      </div>

      {/* Tab Navigation — scroll horizontal di mobile */}
      <div style={{ display:'flex', gap:8, marginBottom:isMobile?16:24, overflowX:'auto', paddingBottom:4 }}>
        {[
          { id:'jual',     label: isMobile?'🛒 Jual':'🛒 Jual Produk' },
          { id:'lapangan', label: isMobile?'🏸 Lapangan':'🏸 Pakai Lapangan' },
          { id:'history',  label: isMobile?'📋 History':'📋 History' },
        ].map(t => (
          <button key={t.id}
            style={{ padding: isMobile?'8px 14px':'8px 18px', borderRadius:8, fontSize: isMobile?13:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', whiteSpace:'nowrap', flexShrink:0, background: tab===t.id?'#2563eb':'#1e293b', color: tab===t.id?'white':'#94a3b8' }}
            onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: JUAL */}
      {tab === 'jual' && (
        <div style={panel}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>🛒 Catat Penjualan</div>
          <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>

            <div>
              <label style={lbl}>Pilih Produk</label>
              <select style={inp} value={jualProduk} onChange={e=>{setJualProduk(e.target.value);setJualHarga('');setJualJumlah('')}}>
                <option value="">-- Pilih produk --</option>
                {produkList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama} — Stok: {tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil)}</option>
                ))}
              </select>
            </div>

            {produkJual && (
              <>
                <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace' }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:8, fontFamily:'inherit' }}>{produkJual.nama}</div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', color:'#94a3b8' }}>
                    <span>Stok: <strong style={{color:'#f1f5f9'}}>{tampilStok(produkJual.stok_pcs, produkJual.isi_per_satuan, produkJual.satuan_besar, produkJual.satuan_kecil)}</strong></span>
                    <span>/{produkJual.satuan_besar}: <strong style={{color:'#4ade80'}}>{formatRupiah(produkJual.harga_jual_besar)}</strong></span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:16 }}>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <label style={{ ...lbl, marginBottom:0 }}>Jumlah</label>
                      <div style={{ display:'flex', gap:4 }}>
                        {[{v:'besar',l:produkJual.satuan_besar},{v:'kecil',l:produkJual.satuan_kecil}].map(t => (
                          <button key={t.v} style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'none', background: jualSatuan===t.v?'#2563eb':'#334155', color:'white' }}
                            onClick={()=>{setJualSatuan(t.v);setJualHarga('')}}>{t.l}</button>
                        ))}
                      </div>
                    </div>
                    <input style={inp} type="number" min="1" placeholder={`cth: 2 ${jualSatuan==='besar'?produkJual.satuan_besar:produkJual.satuan_kecil}`} value={jualJumlah} onChange={e=>setJualJumlah(e.target.value)} />
                    {jualJumlah > 0 && jualSatuan==='besar' && <div style={{ marginTop:6, fontSize:12, color:'#4ade80', fontFamily:'monospace' }}>= {jualJmlPcs} {produkJual.satuan_kecil}</div>}
                  </div>

                  <div>
                    <label style={lbl}>Harga / {jualSatuan==='besar'?produkJual.satuan_besar:produkJual.satuan_kecil} <span style={{color:'#475569',fontWeight:400}}>(default: {formatRupiah(jualHargaDefault)})</span></label>
                    <input style={inp} type="number" placeholder={`Default: ${jualHargaDefault}`} value={jualHarga} onChange={e=>setJualHarga(e.target.value)} />
                  </div>

                  <div>
                    <label style={lbl}>Diskon (Rp) <span style={{color:'#475569',fontWeight:400}}>— opsional</span></label>
                    <input style={inp} type="number" min="0" placeholder="0" value={jualDiskon} onChange={e=>setJualDiskon(e.target.value)} />
                  </div>
                </div>

                {jualJumlah > 0 && (
                  <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Subtotal:</span><span>{formatRupiah(jualSubtotal)}</span></div>
                    {jualDiskonNom > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Diskon:</span><span style={{color:'#f59e0b'}}>-{formatRupiah(jualDiskonNom)}</span></div>}
                    <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:8, marginTop:4 }}><span style={{color:'#94a3b8'}}>Total kas masuk:</span><span style={{color:'#4ade80',fontWeight:700,fontSize:15}}>{formatRupiah(jualTotal)}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}><span style={{color:'#94a3b8'}}>Stok berkurang:</span><span style={{color:'#dc2626'}}>-{jualJmlPcs} {produkJual.satuan_kecil}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                      <span style={{color:'#94a3b8'}}>Sisa stok:</span>
                      <span style={{ color: produkJual.stok_pcs-jualJmlPcs<0?'#dc2626':'#f1f5f9' }}>
                        {produkJual.stok_pcs-jualJmlPcs<0?'❌ Stok tidak cukup!':tampilStok(produkJual.stok_pcs-jualJmlPcs, produkJual.isi_per_satuan, produkJual.satuan_besar, produkJual.satuan_kecil)}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button style={{ ...btnG, width: isMobile?'100%':'auto' }} onClick={simpanJual} disabled={loading}>
                    {loading ? '⏳ Memproses...' : '🛒 Simpan Penjualan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: LAPANGAN */}
      {tab === 'lapangan' && (
        <div style={panel}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>🏸 Catat Pemakaian Lapangan</div>
          <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>

            <div>
              <label style={lbl}>Sesi</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{v:'sore',l:'🌅 Sore'},{v:'malam',l:'🌙 Malam'}].map(s => (
                  <button key={s.v} style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', background: lapSesi===s.v?'#7c3aed':'#334155', color:'white' }}
                    onClick={()=>setLapSesi(s.v)}>{s.l}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>Pilih Produk</label>
              <select style={inp} value={lapProduk} onChange={e=>{setLapProduk(e.target.value);setLapHarga('');setLapJumlah('')}}>
                <option value="">-- Pilih produk --</option>
                {produkList.filter(p=>p.tipe_produk==='shuttle').map(p => (
                  <option key={p.id} value={p.id}>{p.nama} — Stok: {tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil)}</option>
                ))}
              </select>
              {produkList.filter(p=>p.tipe_produk==='shuttle').length===0 && (
                <div style={{ marginTop:8, fontSize:12, color:'#f59e0b' }}>⚠️ Belum ada produk bertipe Shuttle.</div>
              )}
            </div>

            {produkLap && (
              <>
                <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace' }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:8, fontFamily:'inherit' }}>{produkLap.nama}</div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', color:'#94a3b8' }}>
                    <span>Stok: <strong style={{color:'#f1f5f9'}}>{tampilStok(produkLap.stok_pcs, produkLap.isi_per_satuan, produkLap.satuan_besar, produkLap.satuan_kecil)}</strong></span>
                    <span>Lapangan: <strong style={{color:'#f59e0b'}}>{formatRupiah(produkLap.harga_pakai_pcs)}/{produkLap.satuan_kecil}</strong></span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:16 }}>
                  <div>
                    <label style={lbl}>Jumlah ({produkLap.satuan_kecil})</label>
                    <input style={inp} type="number" min="1" placeholder={`cth: 5 ${produkLap.satuan_kecil}`} value={lapJumlah} onChange={e=>setLapJumlah(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Harga / {produkLap.satuan_kecil} <span style={{color:'#475569',fontWeight:400}}>(default: {formatRupiah(lapHargaDefault)})</span></label>
                    <input style={inp} type="number" placeholder={`Default: ${lapHargaDefault}`} value={lapHarga} onChange={e=>setLapHarga(e.target.value)} />
                  </div>
                </div>

                {lapJumlah > 0 && (
                  <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Sesi:</span><span style={{color:'#c4b5fd'}}>{lapSesi==='sore'?'🌅 Sore':'🌙 Malam'}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Pcs dipakai:</span><span style={{color:'#dc2626'}}>-{lapJmlPcs} {produkLap.satuan_kecil}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:8, marginTop:4 }}><span style={{color:'#94a3b8'}}>Total kas masuk:</span><span style={{color:'#4ade80',fontWeight:700,fontSize:15}}>{formatRupiah(lapTotal)}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span style={{color:'#94a3b8'}}>Sisa stok:</span>
                      <span style={{ color: produkLap.stok_pcs-lapJmlPcs<0?'#dc2626':'#f1f5f9' }}>
                        {produkLap.stok_pcs-lapJmlPcs<0?'❌ Stok tidak cukup!':tampilStok(produkLap.stok_pcs-lapJmlPcs, produkLap.isi_per_satuan, produkLap.satuan_besar, produkLap.satuan_kecil)}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button style={{ ...btnG, background:'#7c3aed', width: isMobile?'100%':'auto' }} onClick={simpanLapangan} disabled={loading}>
                    {loading ? '⏳ Memproses...' : '🏸 Simpan Pemakaian'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: HISTORY */}
      {tab === 'history' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <select style={{ ...inp, width: isMobile?'48%':'auto' }} value={filterTipe} onChange={e=>setFilterTipe(e.target.value)}>
              <option value="">Semua Tipe</option>
              <option value="jual">🛒 Jual</option>
              <option value="pakai">🏸 Lapangan</option>
              <option value="restock">📥 Restock</option>
            </select>
            <input style={{ ...inp, width: isMobile?'48%':'auto' }} type="date" value={filterTanggal} onChange={e=>setFilterTanggal(e.target.value)} />
            {(filterTipe || filterTanggal) && (
              <button style={btnS} onClick={()=>{setFilterTipe('');setFilterTanggal('')}}>✕ Reset</button>
            )}
            <span style={{ marginLeft: isMobile?0:'auto', fontSize:13, color:'#94a3b8', alignSelf:'center' }}>{historyFiltered.length} transaksi</span>
          </div>

          <div style={panel}>
            {historyFiltered.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <p>Belum ada transaksi.</p>
              </div>
            ) : isMobile ? (
              /* ── MOBILE: CARD LIST ── */
              <div>
                {historyFiltered.map(t => (
                  <div key={t.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{t.stok?.nama || '–'}</div>
                        <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{formatTanggal(t.tanggal)}</div>
                      </div>
                      <span style={{ background:warnaTipe[t.tipe]||'#e2e8f0', color:teksTipe[t.tipe]||'#334155', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {labelTipe[t.tipe] || t.tipe}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                      <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{t.jumlah_pcs} pcs {t.sesi ? `· ${t.sesi}` : ''}</span>
                      <span style={{ fontFamily:'monospace', fontWeight:700, color: t.tipe==='restock'?'#dc2626':'#4ade80' }}>
                        {t.tipe==='restock'?'-':'+'}{formatRupiah(t.total)}
                      </span>
                    </div>
                    {t.diskon > 0 && <div style={{ fontSize:11, color:'#f59e0b', marginTop:4 }}>Diskon: -{formatRupiah(t.diskon)}</div>}
                  </div>
                ))}
              </div>
            ) : (
              /* ── DESKTOP: TABEL ── */
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr>{['Tanggal','Produk','Tipe','Jumlah','Harga','Diskon','Total','Keterangan'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {historyFiltered.map(t => (
                    <tr key={t.id}>
                      <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{formatTanggal(t.tanggal)}</td>
                      <td style={td}><strong>{t.stok?.nama || '–'}</strong></td>
                      <td style={td}>
                        <span style={{ background:warnaTipe[t.tipe]||'#e2e8f0', color:teksTipe[t.tipe]||'#334155', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>{labelTipe[t.tipe]||t.tipe}</span>
                        {t.sesi && <span style={{ marginLeft:6, fontSize:11, color:'#94a3b8' }}>{t.sesi}</span>}
                      </td>
                      <td style={{ ...td, fontFamily:'monospace' }}>{t.jumlah_pcs} pcs</td>
                      <td style={{ ...td, fontFamily:'monospace' }}>{formatRupiah(t.harga_per_pcs)}/pcs</td>
                      <td style={{ ...td, fontFamily:'monospace', color: t.diskon>0?'#f59e0b':'#475569' }}>{t.diskon>0?`-${formatRupiah(t.diskon)}`:'–'}</td>
                      <td style={{ ...td, fontFamily:'monospace', fontWeight:700, color: t.tipe==='restock'?'#dc2626':'#4ade80' }}>{t.tipe==='restock'?'-':'+'}{formatRupiah(t.total)}</td>
                      <td style={{ ...td, color:'#94a3b8', fontSize:13 }}>{t.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}