'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }

function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
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

// Normalisasi nama untuk deteksi mirip: lowercase + hapus spasi ekstra
// Ini sengaja sederhana (bukan algoritma fuzzy-match kompleks) — cukup untuk menangkap
// kasus paling umum: typo kapital atau spasi ekstra ("Budi" vs "budi " vs "BUDI")
function normalisasiNama(nama) {
  return nama.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Cari pemain lain yang namanya mirip (normalisasi sama), kecuali dirinya sendiri (saat edit)
function cariPemainMirip(nama, daftarPemain, kecualiId = null) {
  const target = normalisasiNama(nama)
  if (!target) return []
  return daftarPemain.filter(p => p.id !== kecualiId && normalisasiNama(p.nama) === target)
}

// ============================================
// STYLE (konsisten dengan halaman lain)
// ============================================

const panel = { background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden', marginBottom:20 }
const th = { padding:'11px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid #334155' }
const td = { padding:'12px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', verticalAlign:'middle', fontSize:14 }
const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'9px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'9px 16px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnS = { padding:'7px 16px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnR = { padding:'5px 10px', borderRadius:6, background:'#dc2626', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

// ============================================
// KOMPONEN UTAMA
// ============================================

export default function Pemain() {
  const isMobile = useIsMobile()

  const [daftarPemain, setDaftarPemain] = useState([])
  const [daftarHutang, setDaftarHutang] = useState([]) // untuk hitung hutang aktif per pemain
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState(null)
  const [cari, setCari] = useState('')

  // Form tambah baru
  const [showForm, setShowForm] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formHp, setFormHp] = useState('')

  // Edit inline per baris
  const [editId, setEditId] = useState(null)
  const [editNama, setEditNama] = useState('')
  const [editHp, setEditHp] = useState('')

  function tampilPesan(teks) { setPesan(teks); setTimeout(() => setPesan(null), 4000) }

  async function muatData() {
    setLoading(true)
    const [resPemain, resHutang] = await Promise.all([
      supabase.from('pemain').select('*').order('nama'),
      supabase.from('hutang').select('pemain_id, total_hutang, sudah_bayar').not('pemain_id', 'is', null),
    ])
    if (!resPemain.error) setDaftarPemain(resPemain.data)
    if (!resHutang.error) setDaftarHutang(resHutang.data)
    setLoading(false)
  }
  useEffect(() => { muatData() }, [])

  // Hitung sisa hutang aktif (belum lunas) untuk satu pemain, dari semua baris hutang miliknya
  function sisaHutangPemain(pemainId) {
    return daftarHutang
      .filter(h => h.pemain_id === pemainId)
      .reduce((s, h) => s + Math.max(0, h.total_hutang - h.sudah_bayar), 0)
  }

  // Pemain yang namanya mirip dengan pemain lain (untuk highlight di list)
  const pemainMiripMap = {} // { [pemain_id]: true } kalau dia punya kemiripan dengan pemain lain
  daftarPemain.forEach(p => {
    const mirip = cariPemainMirip(p.nama, daftarPemain, p.id)
    if (mirip.length > 0) pemainMiripMap[p.id] = true
  })

  async function simpanBaru() {
    if (!formNama.trim()) { tampilPesan('⚠️ Nama wajib diisi!'); return }
    setLoading(true)
    const namaBaru = formNama.trim()
    const { data, error } = await supabase
      .from('pemain')
      .insert([{ nama: namaBaru, no_hp: formHp.trim() || null }])
      .select()
      .single()

    if (error) { setLoading(false); tampilPesan('❌ ' + error.message); return }

    // Cek apakah ada hutang lama dengan nama SAMA PERSIS (case-insensitive) yang belum terhubung
    // ke pemain manapun (pemain_id masih NULL) — kalau ada, sambungkan otomatis ke pemain baru ini.
    const { data: hutangCocok } = await supabase
      .from('hutang')
      .select('id, nama')
      .is('pemain_id', null)
      .ilike('nama', namaBaru)

    let pesanTambahan = ''
    if (hutangCocok && hutangCocok.length > 0) {
      await supabase.from('hutang').update({ pemain_id: data.id }).is('pemain_id', null).ilike('nama', namaBaru)
      pesanTambahan = ` — ${hutangCocok.length} hutang lama otomatis tersambung!`
    }

    setLoading(false)
    tampilPesan(`✅ Pemain "${data.nama}" ditambahkan!${pesanTambahan}`)
    setFormNama(''); setFormHp(''); setShowForm(false)
    muatData()
  }

  function bukaEdit(p) {
    setEditId(p.id)
    setEditNama(p.nama)
    setEditHp(p.no_hp || '')
  }

  async function simpanEdit() {
    if (!editNama.trim()) { tampilPesan('⚠️ Nama wajib diisi!'); return }
    setLoading(true)
    const { error } = await supabase
      .from('pemain')
      .update({ nama: editNama.trim(), no_hp: editHp.trim() || null })
      .eq('id', editId)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }

    tampilPesan('✅ Data pemain diperbarui!')
    setEditId(null)
    muatData()
  }

  async function hapus(p) {
    const sisaHutang = sisaHutangPemain(p.id)
    let konfirmasi
    if (sisaHutang > 0) {
      konfirmasi = confirm(
        `⚠️ ${p.nama} masih punya hutang ${formatRupiah(sisaHutang)} yang belum lunas.\n\n` +
        `Riwayat hutang akan tetap ada, tapi tidak lagi terhubung ke nama ini.\n\n` +
        `Tetap hapus ${p.nama}?`
      )
    } else {
      konfirmasi = confirm(`Hapus pemain "${p.nama}"?`)
    }
    if (!konfirmasi) return

    setLoading(true)
    const { error } = await supabase.from('pemain').delete().eq('id', p.id)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }

    tampilPesan(`🗑️ ${p.nama} dihapus`)
    muatData()
  }

  const dataFiltered = daftarPemain.filter(p =>
    p.nama.toLowerCase().includes(cari.toLowerCase()) ||
    (p.no_hp || '').includes(cari)
  )

  // Cek kemiripan untuk nama yang sedang diketik di form tambah/edit (real-time feedback)
  const miripSaatTambah = formNama.trim() ? cariPemainMirip(formNama, daftarPemain) : []
  const miripSaatEdit = editId && editNama.trim() ? cariPemainMirip(editNama, daftarPemain, editId) : []

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {pesan}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:isMobile?16:24, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🏸 Kelola Pemain</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Lihat, edit, dan kelola data pemain badminton</div>
        </div>
        <button style={btnG} onClick={() => { setShowForm(!showForm); setFormNama(''); setFormHp('') }}>
          {showForm ? '✕ Tutup' : '➕ Tambah Pemain'}
        </button>
      </div>

      {/* ── FORM TAMBAH BARU ── */}
      {showForm && (
        <div style={panel}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>➕ Tambah Pemain Baru</div>
          <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:16 }}>
              <div>
                <label style={lbl}>Nama</label>
                <input style={inp} placeholder="cth: Budi Santoso" value={formNama} onChange={e => setFormNama(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>No. HP (opsional)</label>
                <input style={inp} placeholder="cth: 0812xxxxxxx" value={formHp} onChange={e => setFormHp(e.target.value)} />
              </div>
            </div>

            {miripSaatTambah.length > 0 && (
              <div style={{ background:'#422006', border:'1px solid #92400e', borderRadius:8, padding:12, fontSize:13 }}>
                ⚠️ Sudah ada pemain dengan nama mirip: <strong>{miripSaatTambah.map(p => p.nama).join(', ')}</strong>.
                Pastikan ini benar-benar orang berbeda sebelum menyimpan.
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button style={{ ...btnG, width: isMobile?'100%':'auto' }} onClick={simpanBaru} disabled={loading}>
                {loading ? '⏳ Menyimpan...' : '💾 Simpan Pemain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH ── */}
      <div style={{ marginBottom:16 }}>
        <input style={inp} placeholder="🔍 Cari nama atau no. HP..." value={cari} onChange={e => setCari(e.target.value)} />
      </div>

      {/* ── LIST PEMAIN ── */}
      <div style={panel}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Daftar Pemain</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{dataFiltered.length} pemain</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏸</div>
            <p>{cari ? 'Tidak ada pemain yang cocok dengan pencarian.' : 'Belum ada data pemain.'}</p>
          </div>
        ) : isMobile ? (
          <div>
            {dataFiltered.map(p => {
              const sisaHutang = sisaHutangPemain(p.id)
              const adaMirip = pemainMiripMap[p.id]
              const sedangEdit = editId === p.id
              return (
                <div key={p.id} style={{ padding:'14px 16px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                  {sedangEdit ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <input style={inp} value={editNama} onChange={e => setEditNama(e.target.value)} autoFocus />
                      <input style={inp} placeholder="No. HP" value={editHp} onChange={e => setEditHp(e.target.value)} />
                      {miripSaatEdit.length > 0 && (
                        <div style={{ fontSize:12, color:'#f59e0b' }}>⚠️ Mirip dengan: {miripSaatEdit.map(x => x.nama).join(', ')}</div>
                      )}
                      <div style={{ display:'flex', gap:8 }}>
                        <button style={{ ...btnG, flex:1 }} onClick={simpanEdit}>💾 Simpan</button>
                        <button style={{ ...btnS, flex:1 }} onClick={() => setEditId(null)}>✕ Batal</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15 }}>
                            {p.nama} {adaMirip && <span title="Ada nama mirip">⚠️</span>}
                          </div>
                          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, fontFamily:'monospace' }}>{p.no_hp || '–'}</div>
                        </div>
                        {sisaHutang > 0 && (
                          <span style={{ background:'#7f1d1d', color:'#fca5a5', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                            💳 {formatRupiah(sisaHutang)}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:8 }}>
                        <button style={{ ...btnS, flex:1, padding:'6px 10px', fontSize:12 }} onClick={() => bukaEdit(p)}>✏️ Edit</button>
                        <button style={btnR} onClick={() => hapus(p)}>🗑️ Hapus</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr>{['Nama', 'No. HP', 'Hutang Aktif', 'Aksi'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataFiltered.map(p => {
                const sisaHutang = sisaHutangPemain(p.id)
                const adaMirip = pemainMiripMap[p.id]
                const sedangEdit = editId === p.id
                return (
                  <tr key={p.id}>
                    {sedangEdit ? (
                      <>
                        <td style={td}>
                          <input style={inp} value={editNama} onChange={e => setEditNama(e.target.value)} autoFocus />
                          {miripSaatEdit.length > 0 && (
                            <div style={{ fontSize:11, color:'#f59e0b', marginTop:4 }}>⚠️ Mirip: {miripSaatEdit.map(x => x.nama).join(', ')}</div>
                          )}
                        </td>
                        <td style={td}><input style={inp} value={editHp} onChange={e => setEditHp(e.target.value)} /></td>
                        <td style={td}>–</td>
                        <td style={{ ...td, display:'flex', gap:6 }}>
                          <button style={{ ...btnG, padding:'6px 12px', fontSize:12 }} onClick={simpanEdit}>💾</button>
                          <button style={{ ...btnS, padding:'6px 12px', fontSize:12 }} onClick={() => setEditId(null)}>✕</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={td}>
                          <strong>{p.nama}</strong> {adaMirip && <span title="Ada nama mirip dengan pemain lain">⚠️</span>}
                        </td>
                        <td style={{ ...td, fontFamily:'monospace', color:'#94a3b8' }}>{p.no_hp || '–'}</td>
                        <td style={td}>
                          {sisaHutang > 0 ? (
                            <span style={{ background:'#7f1d1d', color:'#fca5a5', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                              {formatRupiah(sisaHutang)}
                            </span>
                          ) : (
                            <span style={{ color:'#475569' }}>–</span>
                          )}
                        </td>
                        <td style={{ ...td, display:'flex', gap:6 }}>
                          <button style={{ ...btnS, padding:'6px 12px', fontSize:12 }} onClick={() => bukaEdit(p)}>✏️ Edit</button>
                          <button style={btnR} onClick={() => hapus(p)}>🗑️ Hapus</button>
                        </td>
                      </>
                    )}
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