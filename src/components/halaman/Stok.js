'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}
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
const td = { padding:'13px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', verticalAlign:'middle' }
const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'9px 14px', outline:'none', width:'100%' }
const inpAuto = { ...inp, background:'#1e293b', color:'#4ade80', fontFamily:'monospace', cursor:'not-allowed' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'7px 14px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnS = { padding:'7px 14px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnR = { padding:'4px 10px', borderRadius:6, background:'#dc2626', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnB = { padding:'4px 10px', borderRadius:6, background:'#2563eb', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

const KATEGORI = ['Shuttlecock', 'Grip Handuk', 'Grip Karet', 'Air Minum', 'Lainnya']

const FORM0 = {
  nama: '', kategori: 'Shuttlecock', tipe_produk: 'shuttle',
  satuan_besar: 'Lusin', isi_per_satuan: '12', satuan_kecil: 'Pcs',
  harga_modal_besar: '', harga_modal_pcs: '',
  harga_jual_besar: '', harga_jual_pcs: '', harga_pakai_pcs: '',
}

function statusStok(n) {
  if (n === 0)  return { label: 'Habis',   warna: '#fee2e2', teks: '#991b1b' }
  if (n <= 12)  return { label: 'Menipis', warna: '#fef3c7', teks: '#92400e' }
  return               { label: 'Aman',    warna: '#dcfce7', teks: '#14532d' }
}
function hitungModalPcs(besar, isi) {
  const b = parseInt(besar) || 0
  const i = parseInt(isi)   || 1
  return b > 0 ? Math.round(b / i) : 0
}

// ── MODAL RESTOCK ─────────────────────────────────────────────
function ModalRestock({ item, onClose, onSelesai, tampilPesan }) {
  const [jumlahBesar, setJumlahBesar] = useState('')
  const [hargaModal, setHargaModal]   = useState('')
  const [loading, setLoading]         = useState(false)

  if (!item) return null

  const jmlPcs = (parseInt(jumlahBesar) || 0) * (item.isi_per_satuan || 1)
  const hargaDefault = item.harga_modal_besar > 0
    ? item.harga_modal_besar
    : (item.harga_modal_pcs || 0) * (item.isi_per_satuan || 1)
  const hargaInput  = parseInt(hargaModal) || hargaDefault || 0
  const totalBayar  = (parseInt(jumlahBesar) || 0) * hargaInput

  async function proses() {
    if (!jumlahBesar || parseInt(jumlahBesar) <= 0) {
      tampilPesan('⚠️ Jumlah restock wajib diisi!'); return
    }
    setLoading(true)

    const { error: errStok } = await supabase
      .from('stok')
      .update({ stok_pcs: item.stok_pcs + jmlPcs })
      .eq('id', item.id)

    if (errStok) { tampilPesan('❌ Gagal update stok: ' + errStok.message); setLoading(false); return }

    await supabase.from('transaksi_stok').insert([{
      produk_id:    item.id,
      tipe:         'restock',
      jumlah_pcs:   jmlPcs,
      harga_per_pcs: hargaInput > 0 ? Math.round(hargaInput / item.isi_per_satuan) : 0,
      total:         totalBayar,
      keterangan:   `Restock ${jumlahBesar} ${item.satuan_besar} ${item.nama}`,
      tanggal:       new Date().toISOString().split('T')[0],
    }])

    if (totalBayar > 0) {
      await supabase.from('kas').insert([{
        jenis:        'keluar',
        kategori:     'Beli Stok',
        sub_kategori: item.kategori,
        keterangan:   `Restock ${jumlahBesar} ${item.satuan_besar} ${item.nama}`,
        nominal:      totalBayar,
        tanggal:      new Date().toISOString().split('T')[0],
      }])
    }

    setLoading(false)
    tampilPesan(`✅ Restock berhasil! +${jumlahBesar} ${item.satuan_besar} (${jmlPcs} ${item.satuan_kecil})${totalBayar > 0 ? ` — Kas -${formatRupiah(totalBayar)}` : ''}`)
    onSelesai()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }} onClick={onClose}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, width:440, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #334155' }}>📥 Restock Produk</div>

        <div style={{ background:'#0f172a', borderRadius:8, padding:14, marginBottom:20 }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>{item.nama}</div>
          <div style={{ display:'flex', gap:20, fontSize:13, fontFamily:'monospace', color:'#94a3b8', flexWrap:'wrap' }}>
            <span>Stok: <strong style={{ color:'#f1f5f9' }}>{tampilStok(item.stok_pcs, item.isi_per_satuan, item.satuan_besar, item.satuan_kecil)}</strong></span>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl}>Jumlah Restock ({item.satuan_besar})</label>
            <input style={inp} type="number" placeholder={`cth: 5 ${item.satuan_besar}`} min="1"
              value={jumlahBesar} onChange={e=>setJumlahBesar(e.target.value)} autoFocus />
            {jumlahBesar > 0 && <div style={{ marginTop:6, fontSize:12, color:'#4ade80', fontFamily:'monospace' }}>= {jmlPcs} {item.satuan_kecil}</div>}
          </div>

          <div>
            <label style={lbl}>Harga Modal / {item.satuan_besar} <span style={{ color:'#475569', fontWeight:400 }}>(default: {formatRupiah(hargaDefault)})</span></label>
            <input style={inp} type="number" placeholder={`Default: ${hargaDefault}`} value={hargaModal} onChange={e=>setHargaModal(e.target.value)} />
            <div style={{ marginTop:6, fontSize:12, color:'#94a3b8' }}>Kosongkan untuk pakai harga default</div>
          </div>

          {jumlahBesar > 0 && (
            <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Stok bertambah:</span><span style={{color:'#4ade80'}}>+{jmlPcs} {item.satuan_kecil}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{color:'#94a3b8'}}>Stok setelah:</span><span>{tampilStok(item.stok_pcs+jmlPcs, item.isi_per_satuan, item.satuan_besar, item.satuan_kecil)}</span></div>
              {totalBayar > 0 && <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:8, marginTop:8 }}><span style={{color:'#94a3b8'}}>Kas berkurang:</span><span style={{color:'#dc2626',fontWeight:700}}>-{formatRupiah(totalBayar)}</span></div>}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button style={btnS} onClick={onClose}>Batal</button>
          <button style={{...btnG, background: loading?'#334155':'#16a34a', cursor: loading?'not-allowed':'pointer'}} onClick={proses} disabled={loading}>
            {loading ? '⏳ Memproses...' : '📥 Simpan Restock'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Stok() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(FORM0)
  const [editId, setEditId]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [cari, setCari]         = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [pesan, setPesan]       = useState(null)
  const [itemRestock, setItemRestock] = useState(null)
  const isMobile = useIsMobile()

  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('stok').select('*').order('created_at', { ascending: false })
    if (!error) setData(rows)
    setLoading(false)
  }
  useEffect(() => { muatData() }, [])

  function updateForm(field, value) {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if (field === 'harga_modal_besar' || field === 'isi_per_satuan') {
        const b = field === 'harga_modal_besar' ? value : prev.harga_modal_besar
        const i = field === 'isi_per_satuan'    ? value : prev.isi_per_satuan
        u.harga_modal_pcs = hitungModalPcs(b, i)
      }
      return u
    })
  }

  function gantiKategori(kat) {
    const map = {
      'Shuttlecock': { satuan_besar: 'Lusin', isi_per_satuan: '12', satuan_kecil: 'Pcs', tipe_produk: 'shuttle' },
      'Grip Handuk': { satuan_besar: 'Box',   isi_per_satuan: '60', satuan_kecil: 'Pcs', tipe_produk: 'jual' },
      'Grip Karet':  { satuan_besar: 'Box',   isi_per_satuan: '60', satuan_kecil: 'Pcs', tipe_produk: 'jual' },
      'Air Minum':   { satuan_besar: 'Box',   isi_per_satuan: '24', satuan_kecil: 'Pcs', tipe_produk: 'jual' },
      'Lainnya':     { satuan_besar: 'Box',   isi_per_satuan: '1',  satuan_kecil: 'Pcs', tipe_produk: 'jual' },
    }
    const d = map[kat] || map['Lainnya']
    setForm(prev => ({ ...prev, kategori: kat, ...d, harga_modal_pcs: hitungModalPcs(prev.harga_modal_besar, d.isi_per_satuan) }))
  }

  async function simpan() {
    if (!form.nama.trim()) { tampilPesan('⚠️ Nama produk wajib diisi!'); return }
    const isi      = parseInt(form.isi_per_satuan) || 1
    const modBesar = parseInt(form.harga_modal_besar) || 0
    const modPcs   = modBesar > 0 ? Math.round(modBesar / isi) : (parseInt(form.harga_modal_pcs) || 0)
    const payload = {
      nama: form.nama.trim(), kategori: form.kategori, tipe_produk: form.tipe_produk,
      satuan_besar: form.satuan_besar || 'Lusin', isi_per_satuan: isi, satuan_kecil: form.satuan_kecil || 'Pcs',
      harga_modal_besar: modBesar, harga_modal_pcs: modPcs,
      harga_jual_besar: parseInt(form.harga_jual_besar) || 0,
      harga_jual_pcs:   parseInt(form.harga_jual_pcs)   || 0,
      harga_pakai_pcs:  parseInt(form.harga_pakai_pcs)  || 0,
    }
    if (editId) {
      const { error } = await supabase.from('stok').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ ' + error.message); return }
      tampilPesan('✅ Produk berhasil diperbarui!')
    } else {
      const { error } = await supabase.from('stok').insert([{ ...payload, stok_pcs: 0 }])
      if (error) { tampilPesan('❌ ' + error.message); return }
      tampilPesan('✅ Produk ditambahkan! Stok = 0, lakukan Restock untuk mengisi.')
    }
    setForm(FORM0); setEditId(null); setShowForm(false); muatData()
  }

  function bukaEdit(item) {
    setForm({
      nama: item.nama, kategori: item.kategori, tipe_produk: item.tipe_produk || 'jual',
      satuan_besar: item.satuan_besar, isi_per_satuan: item.isi_per_satuan, satuan_kecil: item.satuan_kecil,
      harga_modal_besar: item.harga_modal_besar || '', harga_modal_pcs: item.harga_modal_pcs || '',
      harga_jual_besar: item.harga_jual_besar || '', harga_jual_pcs: item.harga_jual_pcs || '',
      harga_pakai_pcs: item.harga_pakai_pcs || '',
    })
    setEditId(item.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function hapus(id, nama) {
    if (!confirm(`Hapus "${nama}"?`)) return
    const { error } = await supabase.from('stok').delete().eq('id', id)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan('🗑️ Produk dihapus'); muatData()
  }

  function tampilPesan(teks) { setPesan(teks); setTimeout(() => setPesan(null), 4000) }

  const dataFiltered = data.filter(p =>
    p.nama.toLowerCase().includes(cari.toLowerCase()) &&
    (filterKat === '' || p.kategori === filterKat)
  )

  const modalPcsPreview = hitungModalPcs(form.harga_modal_besar, form.isi_per_satuan)
  const marginBesar = (parseInt(form.harga_jual_besar) || 0) - (modalPcsPreview * (parseInt(form.isi_per_satuan) || 1))
  const marginPcs   = (parseInt(form.harga_jual_pcs)   || 0) - modalPcsPreview

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', maxWidth:isMobile?'auto':400 }}>
          {pesan}
        </div>
      )}

      <ModalRestock item={itemRestock} onClose={() => setItemRestock(null)} onSelesai={muatData} tampilPesan={tampilPesan} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:isMobile?16:24, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>📦 Manajemen Stok</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Kelola produk dan inventaris lapangan</div>
        </div>
        <button style={btnG} onClick={() => { setForm(FORM0); setEditId(null); setShowForm(!showForm) }}>
          {showForm ? '✕ Tutup' : '➕ Tambah Produk'}
        </button>
      </div>

      {showForm && (
        <div style={{ ...panel, marginBottom:20 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>
            {editId ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
          </div>
          <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>

            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:16 }}>
              <div style={{ gridColumn: isMobile?'auto':'span 2' }}>
                <label style={lbl}>Nama Produk / Merk</label>
                <input style={inp} placeholder="cth: Shuttlecock JOIN / Aqua / ECO Grip" value={form.nama} onChange={e=>updateForm('nama', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Kategori</label>
                <select style={inp} value={form.kategori} onChange={e=>gantiKategori(e.target.value)}>
                  {KATEGORI.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tipe Produk</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[{v:'shuttle',l:'🏸 Shuttle'},{v:'jual',l:'🛒 Jual pcs'}].map(t => (
                    <button key={t.v} style={{ flex:1, padding:'9px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', background: form.tipe_produk===t.v?'#2563eb':'#334155', color:'white' }}
                      onClick={()=>updateForm('tipe_produk', t.v)}>{t.l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop:'1px solid #334155', paddingTop:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📐 Satuan & Konversi</div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12 }}>
                <div><label style={lbl}>Satuan Besar</label><input style={inp} value={form.satuan_besar} onChange={e=>updateForm('satuan_besar', e.target.value)} /></div>
                <div><label style={lbl}>Isi per Satuan</label><input style={inp} type="number" value={form.isi_per_satuan} onChange={e=>updateForm('isi_per_satuan', e.target.value)} /></div>
                <div><label style={lbl}>Satuan Kecil</label><input style={inp} value={form.satuan_kecil} onChange={e=>updateForm('satuan_kecil', e.target.value)} /></div>
              </div>
              <div style={{ marginTop:8, fontSize:12, color:'#4ade80', fontFamily:'monospace' }}>Preview: 1 {form.satuan_besar} = {form.isi_per_satuan} {form.satuan_kecil}</div>
            </div>

            <div style={{ borderTop:'1px solid #334155', paddingTop:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>💰 Harga</div>

              {form.tipe_produk === 'shuttle' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>Harga Modal / {form.satuan_besar} <span style={{ color:'#4ade80', fontWeight:400 }}>(input)</span></label>
                      <input style={inp} type="number" placeholder="cth: 115000" value={form.harga_modal_besar} onChange={e=>updateForm('harga_modal_besar', e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Harga Modal / {form.satuan_kecil} <span style={{ color:'#f59e0b', fontWeight:400 }}>(auto)</span></label>
                      <input style={inpAuto} readOnly value={modalPcsPreview>0?modalPcsPreview:''} placeholder={`= ${form.harga_modal_besar||'115.000'} ÷ ${form.isi_per_satuan||'12'}`} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12 }}>
                    <div><label style={lbl}>Jual / {form.satuan_besar}</label><input style={inp} type="number" placeholder="cth: 125000" value={form.harga_jual_besar} onChange={e=>updateForm('harga_jual_besar', e.target.value)} /></div>
                    <div><label style={lbl}>Jual / {form.satuan_kecil}</label><input style={inp} type="number" placeholder="cth: 14000" value={form.harga_jual_pcs} onChange={e=>updateForm('harga_jual_pcs', e.target.value)} /></div>
                    <div><label style={lbl}>🏸 Lapangan / {form.satuan_kecil}</label><input style={inp} type="number" placeholder="cth: 10000" value={form.harga_pakai_pcs} onChange={e=>updateForm('harga_pakai_pcs', e.target.value)} /></div>
                  </div>
                  {form.harga_modal_besar > 0 && (
                    <div style={{ padding:'10px 14px', background:'#0f172a', borderRadius:8, fontSize:12, fontFamily:'monospace', display:'flex', gap:16, flexWrap:'wrap' }}>
                      <span><span style={{color:'#475569'}}>Modal/{form.satuan_besar}: </span>{formatRupiah(parseInt(form.harga_modal_besar)||0)}</span>
                      <span><span style={{color:'#475569'}}>Modal/{form.satuan_kecil}: </span>{formatRupiah(modalPcsPreview)}</span>
                      {form.harga_jual_besar && <span><span style={{color:'#475569'}}>Margin/{form.satuan_besar}: </span><span style={{color:marginBesar>=0?'#4ade80':'#dc2626'}}>{formatRupiah(marginBesar)}</span></span>}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12 }}>
                  <div><label style={lbl}>Modal / {form.satuan_kecil}</label><input style={inp} type="number" placeholder="0" value={form.harga_modal_pcs} onChange={e=>updateForm('harga_modal_pcs', e.target.value)} /></div>
                  <div><label style={lbl}>Jual / {form.satuan_kecil}</label><input style={inp} type="number" placeholder="0" value={form.harga_jual_pcs} onChange={e=>updateForm('harga_jual_pcs', e.target.value)} /></div>
                  <div><label style={lbl}>Jual / {form.satuan_besar}</label><input style={inp} type="number" placeholder="0" value={form.harga_jual_besar} onChange={e=>updateForm('harga_jual_besar', e.target.value)} /></div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={btnS} onClick={()=>{setShowForm(false);setEditId(null);setForm(FORM0)}}>Batal</button>
              <button style={btnG} onClick={simpan}>💾 Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input style={{ ...inp, width:'auto', flex:1, minWidth:isMobile?'100%':180, maxWidth:isMobile?'100%':280 }} placeholder="🔍 Cari produk..." value={cari} onChange={e=>setCari(e.target.value)} />
        <select style={{ ...inp, width:isMobile?'100%':'auto' }} value={filterKat} onChange={e=>setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {KATEGORI.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      <div style={panel}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Daftar Produk</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{dataFiltered.length} produk</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
            <p>Belum ada produk. Klik <strong>Tambah Produk</strong> untuk mulai.</p>
          </div>
        ) : isMobile ? (
          /* ── MOBILE: CARD LIST ── */
          <div>
            {dataFiltered.map(p => {
              const s = statusStok(p.stok_pcs)
              return (
                <div key={p.id} style={{ padding:'14px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{p.nama}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>
                        {p.kategori} · {p.tipe_produk==='shuttle'?'🏸 Shuttle':'🛒 Jual'}
                      </div>
                    </div>
                    <span style={{ background:s.warna, color:s.teks, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>{s.label}</span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12, marginBottom:10 }}>
                    <div style={{ background:'#0f172a', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ color:'#475569', fontSize:10, marginBottom:2 }}>STOK</div>
                      <div style={{ fontFamily:'monospace', fontWeight:700 }}>{tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil)}</div>
                    </div>
                    <div style={{ background:'#0f172a', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ color:'#475569', fontSize:10, marginBottom:2 }}>MODAL</div>
                      <div style={{ fontFamily:'monospace' }}>{formatRupiah(p.harga_modal_pcs)}/{p.satuan_kecil}</div>
                    </div>
                  </div>

                  <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10, lineHeight:1.6 }}>
                    {p.harga_jual_besar > 0 && <div>Jual: <span style={{fontFamily:'monospace',color:'#f1f5f9'}}>{formatRupiah(p.harga_jual_besar)}/{p.satuan_besar}</span></div>}
                    {p.tipe_produk==='shuttle' && p.harga_pakai_pcs > 0 && <div>Lapangan: <span style={{fontFamily:'monospace',color:'#f59e0b'}}>{formatRupiah(p.harga_pakai_pcs)}/{p.satuan_kecil}</span></div>}
                  </div>

                  <div style={{ display:'flex', gap:6 }}>
                    <button style={{...btnB, flex:1}} onClick={()=>setItemRestock(p)}>📥 Restock</button>
                    <button style={{...btnS, padding:'4px 10px', fontSize:12}} onClick={()=>bukaEdit(p)}>✏️</button>
                    <button style={btnR} onClick={()=>hapus(p.id,p.nama)}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── DESKTOP: TABEL ── */
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr>{['Nama Produk','Kategori','Stok','Harga Modal','Harga Jual','Status','Aksi'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataFiltered.map(p => {
                const s = statusStok(p.stok_pcs)
                return (
                  <tr key={p.id}>
                    <td style={td}>
                      <strong>{p.nama}</strong>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{p.tipe_produk==='shuttle'?'🏸 Shuttle':'🛒 Jual'}</div>
                    </td>
                    <td style={{ ...td, color:'#94a3b8' }}>{p.kategori}</td>
                    <td style={td}>
                      <div style={{ fontFamily:'monospace', fontWeight:700 }}>{tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil)}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>({p.stok_pcs} {p.satuan_kecil})</div>
                    </td>
                    <td style={{ ...td, fontSize:13 }}>
                      {p.harga_modal_besar > 0
                        ? <><div style={{fontFamily:'monospace'}}>{formatRupiah(p.harga_modal_besar)}/{p.satuan_besar}</div><div style={{fontFamily:'monospace',color:'#475569',fontSize:12}}>{formatRupiah(p.harga_modal_pcs)}/{p.satuan_kecil}</div></>
                        : <div style={{fontFamily:'monospace'}}>{formatRupiah(p.harga_modal_pcs)}/{p.satuan_kecil}</div>}
                    </td>
                    <td style={{ ...td, fontSize:12 }}>
                      {p.harga_jual_besar > 0 && <div style={{fontFamily:'monospace'}}>{formatRupiah(p.harga_jual_besar)}/{p.satuan_besar}</div>}
                      {p.harga_jual_pcs > 0 && <div style={{fontFamily:'monospace',color:'#94a3b8',marginTop:2}}>{formatRupiah(p.harga_jual_pcs)}/{p.satuan_kecil}</div>}
                      {p.tipe_produk==='shuttle' && p.harga_pakai_pcs > 0 && <div style={{fontFamily:'monospace',color:'#f59e0b',marginTop:2}}>🏸 {formatRupiah(p.harga_pakai_pcs)}/lapangan</div>}
                    </td>
                    <td style={td}>
                      <span style={{ background:s.warna, color:s.teks, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{s.label}</span>
                    </td>
                    <td style={{ ...td, display:'flex', gap:6 }}>
                      <button style={btnB} onClick={()=>setItemRestock(p)}>📥 Restock</button>
                      <button style={{...btnS, padding:'4px 10px', fontSize:12}} onClick={()=>bukaEdit(p)}>✏️ Edit</button>
                      <button style={btnR} onClick={()=>hapus(p.id,p.nama)}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}