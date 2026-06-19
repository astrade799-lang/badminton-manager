'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}
function hariIni() { return new Date().toISOString().split('T')[0] }
function statusHutang(total, bayar) {
  const sisa = total - bayar
  if (sisa <= 0)   return { label:'Lunas',       warna:'#dcfce7', teks:'#14532d' }
  if (bayar === 0) return { label:'Belum Bayar', warna:'#fee2e2', teks:'#991b1b' }
  return                   { label:'Sebagian',    warna:'#fef3c7', teks:'#92400e' }
}
function persen(h) { return h.total_hutang===0?0:Math.min(100,Math.round(h.sudah_bayar/h.total_hutang*100)) }
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
const btnK = { padding:'4px 10px', borderRadius:6, background:'#f59e0b', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnR = { padding:'4px 10px', borderRadius:6, background:'#dc2626', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

const formDefault = { nama:'', keterangan:'', total_hutang:'', sudah_bayar:'0', tanggal:hariIni() }

function ModalBayar({ item, onClose, onProses }) {
  const [jumlah, setJumlah] = useState('')
  const isMobile = useIsMobile()
  if (!item) return null
  const sisa = item.total_hutang - item.sudah_bayar
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }} onClick={onClose}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, width:400, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #334155' }}>💰 Catat Pembayaran</div>
        <div style={{ background:'#0f172a', borderRadius:8, padding:14, marginBottom:20, fontSize:14 }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>{item.nama}</div>
          <div style={{ color:'#94a3b8', fontSize:13, marginBottom:10 }}>{item.keterangan}</div>
          <div style={{ display:'flex', gap:16, fontFamily:'monospace', fontSize:13, flexWrap:'wrap' }}>
            <div><div style={{color:'#475569',fontSize:10,marginBottom:2}}>TOTAL</div>{formatRupiah(item.total_hutang)}</div>
            <div><div style={{color:'#475569',fontSize:10,marginBottom:2}}>SUDAH</div><span style={{color:'#4ade80'}}>{formatRupiah(item.sudah_bayar)}</span></div>
            <div><div style={{color:'#475569',fontSize:10,marginBottom:2}}>SISA</div><span style={{color:'#dc2626'}}>{formatRupiah(Math.max(0,sisa))}</span></div>
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Jumlah yang Dibayar Sekarang (Rp)</label>
          <input style={inp} type="number" placeholder="0" min="0" value={jumlah} onChange={e=>setJumlah(e.target.value)} autoFocus />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button style={btnS} onClick={onClose}>Batal</button>
          <button style={btnG} onClick={()=>onProses(parseInt(jumlah)||0, sisa)}>💰 Catat Bayar</button>
        </div>
      </div>
    </div>
  )
}

export default function Hutang() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(formDefault)
  const [editId, setEditId]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [itemBayar, setItemBayar] = useState(null)
  const [cari, setCari]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [pesan, setPesan]       = useState(null)
  const isMobile = useIsMobile()

  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('hutang').select('*').order('created_at', { ascending:false })
    if (!error) setData(rows)
    setLoading(false)
  }
  useEffect(() => { muatData() }, [])

  async function simpan() {
    if (!form.nama.trim()) { tampilPesan('⚠️ Nama pelanggan wajib diisi!'); return }
    const total = parseInt(form.total_hutang) || 0
    const bayar = parseInt(form.sudah_bayar)  || 0
    if (total <= 0)    { tampilPesan('⚠️ Total hutang harus lebih dari 0!'); return }
    if (bayar > total) { tampilPesan('⚠️ Pembayaran tidak boleh melebihi total!'); return }
    const payload = { nama:form.nama.trim(), keterangan:form.keterangan.trim(), total_hutang:total, sudah_bayar:bayar, tanggal:form.tanggal||null }
    if (editId) {
      const { error } = await supabase.from('hutang').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ '+error.message); return }
      tampilPesan('✅ Data hutang diperbarui!')
    } else {
      const { error } = await supabase.from('hutang').insert([payload])
      if (error) { tampilPesan('❌ '+error.message); return }
      tampilPesan('✅ Hutang berhasil dicatat!')
    }
    setForm(formDefault); setEditId(null); setShowForm(false); muatData()
  }

  function bukaEdit(item) {
    setForm({ nama:item.nama, keterangan:item.keterangan||'', total_hutang:item.total_hutang, sudah_bayar:item.sudah_bayar, tanggal:item.tanggal||hariIni() })
    setEditId(item.id); setShowForm(true)
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  async function hapus(id, nama) {
    if (!confirm(`Hapus hutang "${nama}"?`)) return
    const { error } = await supabase.from('hutang').delete().eq('id', id)
    if (error) { tampilPesan('❌ '+error.message); return }
    tampilPesan('🗑️ Data hutang dihapus'); muatData()
  }

  async function prosesBayar(bayar, sisa) {
    if (!itemBayar) return
    if (bayar <= 0)  { tampilPesan('⚠️ Jumlah bayar harus lebih dari 0'); return }
    if (bayar > sisa){ tampilPesan(`⚠️ Melebihi sisa hutang (${formatRupiah(sisa)})`); return }
    const sudahBayarBaru = itemBayar.sudah_bayar + bayar
    const { error } = await supabase.from('hutang').update({ sudah_bayar: sudahBayarBaru }).eq('id', itemBayar.id)
    if (error) { tampilPesan('❌ '+error.message); return }
    const sisaBaru = itemBayar.total_hutang - sudahBayarBaru
    tampilPesan(sisaBaru<=0 ? `🎉 Hutang ${itemBayar.nama} LUNAS!` : `💰 Bayar ${formatRupiah(bayar)} tercatat. Sisa: ${formatRupiah(sisaBaru)}`)
    setItemBayar(null); muatData()
  }

  function tampilPesan(teks) { setPesan(teks); setTimeout(()=>setPesan(null), 3500) }

  const totalSisa  = data.reduce((s,h)=>s+Math.max(0,h.total_hutang-h.sudah_bayar),0)
  const belumLunas = data.filter(h=>statusHutang(h.total_hutang,h.sudah_bayar).label!=='Lunas').length
  const sudahLunas = data.filter(h=>statusHutang(h.total_hutang,h.sudah_bayar).label==='Lunas').length

  const dataFiltered = data.filter(h => {
    const cocokNama = h.nama.toLowerCase().includes(cari.toLowerCase())
    const s = statusHutang(h.total_hutang, h.sudah_bayar).label
    const cocokStatus = filterStatus === '' || s === filterStatus
    return cocokNama && cocokStatus
  })

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {pesan}
        </div>
      )}

      <ModalBayar item={itemBayar} onClose={()=>setItemBayar(null)} onProses={prosesBayar} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:isMobile?16:24, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>💳 Hutang Pelanggan</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Pantau dan kelola tagihan pelanggan</div>
        </div>
        <button style={btnG} onClick={()=>{setForm(formDefault);setEditId(null);setShowForm(!showForm)}}>
          {showForm ? '✕ Tutup' : '➕ Catat Hutang'}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(3,1fr)', gap:isMobile?10:16, marginBottom:isMobile?16:28 }}>
        {[
          { label:'💳 Sisa Hutang', nilai:formatRupiah(totalSisa), warna:'#dc2626', sub:`dari ${data.length} data` },
          { label:'⏳ Aktif',       nilai:belumLunas+' pelanggan', warna:'#f59e0b', sub:'belum lunas' },
          { label:'✅ Lunas',       nilai:sudahLunas+' pelanggan', warna:'#16a34a', sub:'lunas' },
        ].map((k,i)=>(
          <div key={i} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:isMobile?10:12, padding:isMobile?12:20, position:'relative', overflow:'hidden', gridColumn: isMobile && i===2 ? 'span 2' : 'auto' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.warna }} />
            <div style={{ fontSize:isMobile?10:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5, marginBottom:isMobile?6:10 }}>{k.label}</div>
            <div style={{ fontSize:isMobile?16:22, fontWeight:800, fontFamily:'monospace', marginBottom:6, wordBreak:'break-all' }}>{k.nilai}</div>
            <div style={{ fontSize:isMobile?11:12, color:'#94a3b8' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ ...panel, marginBottom:20 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>
            {editId ? '✏️ Edit Data Hutang' : '➕ Catat Hutang Baru'}
          </div>
          <div style={{ padding:isMobile?16:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:16 }}>
              <div style={{ gridColumn: isMobile?'auto':'span 2' }}>
                <label style={lbl}>Nama Pelanggan</label>
                <input style={inp} placeholder="cth: Pak Budi" value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})} />
              </div>
              <div style={{ gridColumn: isMobile?'auto':'span 2' }}>
                <label style={lbl}>Keterangan</label>
                <textarea style={{ ...inp, minHeight:70, resize:'vertical' }} placeholder="cth: Sewa lapangan A 2 jam" value={form.keterangan} onChange={e=>setForm({...form,keterangan:e.target.value})} />
              </div>
              <div><label style={lbl}>Total Hutang (Rp)</label><input style={inp} type="number" placeholder="0" min="0" value={form.total_hutang} onChange={e=>setForm({...form,total_hutang:e.target.value})} /></div>
              <div><label style={lbl}>Sudah Dibayar (Rp)</label><input style={inp} type="number" placeholder="0" min="0" value={form.sudah_bayar} onChange={e=>setForm({...form,sudah_bayar:e.target.value})} /></div>
              <div><label style={lbl}>Tanggal</label><input style={inp} type="date" value={form.tanggal} onChange={e=>setForm({...form,tanggal:e.target.value})} /></div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
              <button style={btnS} onClick={()=>{setShowForm(false);setEditId(null);setForm(formDefault)}}>Batal</button>
              <button style={btnG} onClick={simpan}>💾 Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input style={{ ...inp, width:'auto', flex:1, minWidth:isMobile?'100%':180, maxWidth:isMobile?'100%':280 }} placeholder="🔍 Cari nama pelanggan..." value={cari} onChange={e=>setCari(e.target.value)} />
        <select style={{ ...inp, width:isMobile?'100%':'auto' }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="Belum Bayar">Belum Bayar</option>
          <option value="Sebagian">Sebagian</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>

      <div style={panel}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Daftar Hutang</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{dataFiltered.length} data</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💳</div>
            <p>Belum ada data hutang.</p>
          </div>
        ) : isMobile ? (
          /* ── MOBILE: CARD LIST ── */
          <div>
            {dataFiltered.map(h => {
              const sisa = h.total_hutang - h.sudah_bayar
              const s    = statusHutang(h.total_hutang, h.sudah_bayar)
              const pct  = persen(h)
              const warna = s.label==='Lunas'?'#16a34a':s.label==='Sebagian'?'#f59e0b':'#dc2626'
              return (
                <div key={h.id} style={{ padding:'14px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{h.nama}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{formatTanggal(h.tanggal)}</div>
                    </div>
                    <span style={{ background:s.warna, color:s.teks, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>{s.label}</span>
                  </div>

                  <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>{h.keterangan}</div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12, marginBottom:8 }}>
                    <div style={{ background:'#0f172a', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ color:'#475569', fontSize:10, marginBottom:2 }}>TOTAL</div>
                      <div style={{ fontFamily:'monospace', fontWeight:700 }}>{formatRupiah(h.total_hutang)}</div>
                    </div>
                    <div style={{ background:'#0f172a', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ color:'#475569', fontSize:10, marginBottom:2 }}>SISA</div>
                      <div style={{ fontFamily:'monospace', fontWeight:700, color: sisa>0?'#dc2626':'#4ade80' }}>{formatRupiah(Math.max(0,sisa))}</div>
                    </div>
                  </div>

                  <div style={{ width:'100%', background:'#0f172a', borderRadius:20, height:6, overflow:'hidden', marginBottom:12 }}>
                    <div style={{ height:'100%', borderRadius:20, width:`${pct}%`, background:warna }} />
                  </div>

                  <div style={{ display:'flex', gap:6 }}>
                    {sisa > 0 && <button style={{...btnK, flex:1}} onClick={()=>setItemBayar(h)}>💰 Bayar</button>}
                    <button style={{...btnS, padding:'4px 10px', fontSize:12}} onClick={()=>bukaEdit(h)}>✏️</button>
                    <button style={btnR} onClick={()=>hapus(h.id,h.nama)}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── DESKTOP: TABEL ── */
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr>{['Nama','Keterangan','Total Hutang','Sudah Bayar','Sisa','Status','Aksi'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataFiltered.map(h => {
                const sisa = h.total_hutang - h.sudah_bayar
                const s    = statusHutang(h.total_hutang, h.sudah_bayar)
                const pct  = persen(h)
                const warna = s.label==='Lunas'?'#16a34a':s.label==='Sebagian'?'#f59e0b':'#dc2626'
                return (
                  <tr key={h.id}>
                    <td style={td}><strong>{h.nama}</strong><div style={{fontSize:11,color:'#475569',marginTop:2}}>{formatTanggal(h.tanggal)}</div></td>
                    <td style={{ ...td, color:'#94a3b8', fontSize:13 }}>{h.keterangan}</td>
                    <td style={{ ...td, fontFamily:'monospace' }}>{formatRupiah(h.total_hutang)}</td>
                    <td style={{ ...td, fontFamily:'monospace', color:'#4ade80' }}>{formatRupiah(h.sudah_bayar)}</td>
                    <td style={td}>
                      <div style={{ fontFamily:'monospace', color: sisa>0?'#dc2626':'#4ade80' }}>{formatRupiah(Math.max(0,sisa))}</div>
                      <div style={{ width:'100%', background:'#0f172a', borderRadius:20, height:6, overflow:'hidden', marginTop:4 }}>
                        <div style={{ height:'100%', borderRadius:20, width:`${pct}%`, background:warna }} />
                      </div>
                    </td>
                    <td style={td}><span style={{ background:s.warna, color:s.teks, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{s.label}</span></td>
                    <td style={{ ...td, display:'flex', gap:6, flexWrap:'wrap' }}>
                      {sisa>0 && <button style={btnK} onClick={()=>setItemBayar(h)}>💰 Bayar</button>}
                      <button style={{...btnS, padding:'4px 10px', fontSize:12}} onClick={()=>bukaEdit(h)}>✏️</button>
                      <button style={btnR} onClick={()=>hapus(h.id,h.nama)}>🗑️</button>
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