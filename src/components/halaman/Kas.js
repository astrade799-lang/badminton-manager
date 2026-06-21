'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}
function hariIni() { return new Date().toISOString().split('T')[0] }
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
const td = { padding:'13px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', verticalAlign:'middle' }
const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'9px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'7px 14px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnS = { padding:'7px 14px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnR = { padding:'4px 10px', borderRadius:6, background:'#dc2626', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

const formDefault = { jenis:'masuk', kategori:'Sewa Lapangan', keterangan:'', nominal:'', tanggal:hariIni() }
const KATEGORI = ['Modal/Investasi', 'Sewa Lapangan', 'Penjualan Stok', 'Bayar Hutang', 'Beli Stok', 'Operasional', 'Lainnya']
// ── Preset filter cepat ───────────────────────────────────────
function getPresetRange(preset) {
  const today = new Date()
  const fmt = (d) => d.toISOString().split('T')[0]

  if (preset === 'hari-ini') {
    return { dari: fmt(today), sampai: fmt(today) }
  }
  if (preset === 'minggu-ini') {
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    return { dari: fmt(start), sampai: fmt(today) }
  }
  if (preset === 'bulan-ini') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { dari: fmt(start), sampai: fmt(today) }
  }
  if (preset === 'bulan-lalu') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end   = new Date(today.getFullYear(), today.getMonth(), 0)
    return { dari: fmt(start), sampai: fmt(end) }
  }
  return { dari: '', sampai: '' }
}

export default function Kas() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(formDefault)
  const [editId, setEditId]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [cari, setCari]         = useState('')
  const [filterJenis, setFilterJenis]       = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [tglDari, setTglDari]   = useState('')
  const [tglSampai, setTglSampai] = useState('')
  const [pesan, setPesan]       = useState(null)
  const isMobile = useIsMobile()

  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('kas').select('*').order('tanggal', { ascending:false })
    if (!error) setData(rows)
    setLoading(false)
  }
  useEffect(() => { muatData() }, [])

  async function simpan() {
    if (!form.keterangan.trim()) { tampilPesan('⚠️ Keterangan wajib diisi!'); return }
    const nominal = parseInt(form.nominal) || 0
    if (nominal <= 0) { tampilPesan('⚠️ Nominal harus lebih dari 0!'); return }
    const payload = { jenis:form.jenis, kategori:form.kategori, keterangan:form.keterangan.trim(), nominal, tanggal:form.tanggal||null }
    if (editId) {
      const { error } = await supabase.from('kas').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ '+error.message); return }
      tampilPesan('✅ Transaksi diperbarui!')
    } else {
      const { error } = await supabase.from('kas').insert([payload])
      if (error) { tampilPesan('❌ '+error.message); return }
      tampilPesan('✅ Transaksi berhasil dicatat!')
    }
    setForm(formDefault); setEditId(null); setShowForm(false); muatData()
  }

  function bukaEdit(item) {
    setForm({ jenis:item.jenis, kategori:item.kategori, keterangan:item.keterangan, nominal:item.nominal, tanggal:item.tanggal||hariIni() })
    setEditId(item.id); setShowForm(true)
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  async function hapus(id, keterangan) {
    if (!confirm(`Hapus transaksi "${keterangan}"?`)) return
    const { error } = await supabase.from('kas').delete().eq('id', id)
    if (error) { tampilPesan('❌ '+error.message); return }
    tampilPesan('🗑️ Transaksi dihapus'); muatData()
  }

  function tampilPesan(teks) { setPesan(teks); setTimeout(()=>setPesan(null), 3500) }

  function terapkanPreset(preset) {
    const r = getPresetRange(preset)
    setTglDari(r.dari); setTglSampai(r.sampai)
  }

  function resetFilter() {
    setCari(''); setFilterJenis(''); setFilterKategori(''); setTglDari(''); setTglSampai('')
  }

  // ── FILTER — termasuk rentang tanggal ─────────────────────
  const dataFiltered = data.filter(t => {
    const cocokCari = t.keterangan.toLowerCase().includes(cari.toLowerCase())
    const cocokJenis = filterJenis === '' || t.jenis === filterJenis
    const cocokKategori = filterKategori === '' || t.kategori === filterKategori
    const cocokDari = tglDari === '' || (t.tanggal && t.tanggal >= tglDari)
    const cocokSampai = tglSampai === '' || (t.tanggal && t.tanggal <= tglSampai)
    return cocokCari && cocokJenis && cocokKategori && cocokDari && cocokSampai
  })

  // ── Kalkulasi — pakai data TERFILTER kalau ada filter tanggal aktif ──
  const adaFilterTanggal = tglDari || tglSampai
  const dataUntukKalkulasi = adaFilterTanggal ? dataFiltered : data

  const totalMasuk  = dataUntukKalkulasi.filter(t=>t.jenis==='masuk').reduce((s,t)=>s+t.nominal,0)
  const totalKeluar = dataUntukKalkulasi.filter(t=>t.jenis==='keluar').reduce((s,t)=>s+t.nominal,0)
  const saldo       = totalMasuk - totalKeluar
  const bulanIni    = hariIni().substring(0,7)
  const masukBulanIni = data.filter(t=>t.jenis==='masuk'&&t.tanggal&&t.tanggal.startsWith(bulanIni)).reduce((s,t)=>s+t.nominal,0)

  const adaFilterAktif = cari || filterJenis || filterKategori || tglDari || tglSampai

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {pesan}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:isMobile?16:24, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>💰 Kas Bisnis</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Catat semua pemasukan dan pengeluaran</div>
        </div>
        <button style={btnG} onClick={()=>{setForm(formDefault);setEditId(null);setShowForm(!showForm)}}>
          {showForm ? '✕ Tutup' : '➕ Catat Transaksi'}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:isMobile?10:16, marginBottom:isMobile?16:28 }}>
        {[
          { label: adaFilterTanggal ? '📈 Pemasukan (filter)' : '📈 Pemasukan', nilai:formatRupiah(totalMasuk),       warna:'#16a34a', sub:dataUntukKalkulasi.filter(t=>t.jenis==='masuk').length+' transaksi' },
          { label: adaFilterTanggal ? '📉 Pengeluaran (filter)' : '📉 Pengeluaran',nilai:formatRupiah(totalKeluar),      warna:'#dc2626', sub:dataUntukKalkulasi.filter(t=>t.jenis==='keluar').length+' transaksi' },
          { label:'💼 Saldo',      nilai:formatRupiah(Math.abs(saldo)),  warna:'#2563eb', sub:saldo>=0?'↑ Surplus':'↓ Defisit', subWarna:saldo>=0?'#4ade80':'#dc2626' },
          { label:'📅 Bulan Ini',  nilai:formatRupiah(masukBulanIni),    warna:'#7c3aed', sub:new Date().toLocaleDateString('id-ID',{month:'long'}) },
        ].map((k,i)=>(
          <div key={i} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:isMobile?10:12, padding:isMobile?12:20, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.warna }} />
            <div style={{ fontSize:isMobile?10:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, marginBottom:isMobile?6:10 }}>{k.label}</div>
            <div style={{ fontSize:isMobile?14:20, fontWeight:800, fontFamily:'monospace', marginBottom:6, wordBreak:'break-all', color: k.subWarna || '#f1f5f9' }}>{k.nilai}</div>
            <div style={{ fontSize:isMobile?11:12, color: k.subWarna || '#94a3b8' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ ...panel, marginBottom:20 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>
            {editId ? '✏️ Edit Transaksi' : '➕ Catat Transaksi Baru'}
          </div>
          <div style={{ padding:isMobile?16:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:16 }}>

              <div>
                <label style={lbl}>Jenis Transaksi</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { value:'masuk',  label:'📈 Pemasukan',   bg: form.jenis==='masuk' ?'#16a34a':'#334155' },
                    { value:'keluar', label:'📉 Pengeluaran', bg: form.jenis==='keluar'?'#dc2626':'#334155' },
                  ].map(j => (
                    <button key={j.value} style={{ flex:1, padding:'9px 14px', borderRadius:8, background:j.bg, color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
                      onClick={()=>setForm({...form,jenis:j.value})}>{j.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Kategori</label>
                <select style={inp} value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})}>
                  {KATEGORI.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: isMobile?'auto':'span 2' }}>
                <label style={lbl}>Keterangan</label>
                <input style={inp} placeholder="cth: Sewa lapangan A 2 jam" value={form.keterangan} onChange={e=>setForm({...form,keterangan:e.target.value})} />
              </div>

              <div><label style={lbl}>Nominal (Rp)</label><input style={inp} type="number" placeholder="0" min="0" value={form.nominal} onChange={e=>setForm({...form,nominal:e.target.value})} /></div>
              <div><label style={lbl}>Tanggal</label><input style={inp} type="date" value={form.tanggal} onChange={e=>setForm({...form,tanggal:e.target.value})} /></div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
              <button style={btnS} onClick={()=>{setShowForm(false);setEditId(null);setForm(formDefault)}}>Batal</button>
              <button style={btnG} onClick={simpan}>💾 Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER ── */}
      <div style={{ ...panel, marginBottom:16 }}>
        <div style={{ padding:isMobile?14:16 }}>

          {/* Cari + Jenis + Kategori */}
          <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
            <input style={{ ...inp, width:'auto', flex:1, minWidth:isMobile?'100%':180 }} placeholder="🔍 Cari keterangan..." value={cari} onChange={e=>setCari(e.target.value)} />
            <select style={{ ...inp, width:isMobile?'48%':'auto' }} value={filterJenis} onChange={e=>setFilterJenis(e.target.value)}>
              <option value="">Semua Jenis</option>
              <option value="masuk">Pemasukan</option>
              <option value="keluar">Pengeluaran</option>
            </select>
            <select style={{ ...inp, width:isMobile?'48%':'auto' }} value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}>
              <option value="">Semua Kategori</option>
              {KATEGORI.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>

          {/* Preset cepat */}
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {[
              { id:'hari-ini',   l:'Hari Ini' },
              { id:'minggu-ini', l:'Minggu Ini' },
              { id:'bulan-ini',  l:'Bulan Ini' },
              { id:'bulan-lalu', l:'Bulan Lalu' },
            ].map(p => (
              <button key={p.id} style={{ padding:'5px 12px', borderRadius:20, background:'#334155', color:'#f1f5f9', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
                onClick={()=>terapkanPreset(p.id)}>{p.l}</button>
            ))}
          </div>

          {/* Rentang tanggal manual */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ flex: isMobile?'1 1 100%':1, minWidth:140 }}>
              <label style={{ ...lbl, marginBottom:4, fontSize:11 }}>Dari Tanggal</label>
              <input style={inp} type="date" value={tglDari} onChange={e=>setTglDari(e.target.value)} />
            </div>
            <div style={{ flex: isMobile?'1 1 100%':1, minWidth:140 }}>
              <label style={{ ...lbl, marginBottom:4, fontSize:11 }}>Sampai Tanggal</label>
              <input style={inp} type="date" value={tglSampai} onChange={e=>setTglSampai(e.target.value)} />
            </div>
            {adaFilterAktif && (
              <button style={{ ...btnS, alignSelf:isMobile?'stretch':'flex-end', marginTop: isMobile?0:20 }} onClick={resetFilter}>✕ Reset Filter</button>
            )}
          </div>
        </div>
      </div>

      <div style={panel}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Riwayat Transaksi</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{dataFiltered.length} transaksi</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💰</div>
            <p>{adaFilterAktif ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi. Klik Catat Transaksi untuk mulai.'}</p>
          </div>
        ) : isMobile ? (
          <div>
            {dataFiltered.map(t => (
              <div key={t.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)', borderLeft:`3px solid ${t.kategori==='Modal/Investasi' ? '#7c3aed' : (t.jenis==='masuk'?'#16a34a':'#dc2626')}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{t.keterangan}</div>
                    <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{formatTanggal(t.tanggal)} · {t.kategori}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:t.jenis==='masuk'?'#4ade80':'#dc2626' }}>
                      {t.jenis==='masuk'?'+':'-'}{formatRupiah(t.nominal)}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  <button style={{...btnS, padding:'4px 10px', fontSize:12, flex:1}} onClick={()=>bukaEdit(t)}>✏️ Edit</button>
                  <button style={btnR} onClick={()=>hapus(t.id,t.keterangan)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr>{['Tanggal','Keterangan','Kategori','Jenis','Nominal','Aksi'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataFiltered.map(t => (
                <tr key={t.id} style={{ borderLeft:`3px solid ${t.kategori==='Modal/Investasi' ? '#7c3aed' : (t.jenis==='masuk'?'#16a34a':'#dc2626')}` }}>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{formatTanggal(t.tanggal)}</td>
                  <td style={td}>{t.keterangan}</td>
                  <td style={{ ...td, color:'#94a3b8', fontSize:13 }}>{t.kategori}</td>
                  <td style={td}>
                    <span style={{ background: t.jenis==='masuk'?'#dcfce7':'#fee2e2', color: t.jenis==='masuk'?'#14532d':'#991b1b', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                      {t.jenis==='masuk'?'Pemasukan':'Pengeluaran'}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily:'monospace', fontWeight:700, color:t.jenis==='masuk'?'#4ade80':'#dc2626' }}>
                    {t.jenis==='masuk'?'+':'-'}{formatRupiah(t.nominal)}
                  </td>
                  <td style={{ ...td, display:'flex', gap:6 }}>
                    <button style={{...btnS, padding:'4px 10px', fontSize:12}} onClick={()=>bukaEdit(t)}>✏️</button>
                    <button style={btnR} onClick={()=>hapus(t.id,t.keterangan)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}