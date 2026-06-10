'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
function hariIni() {
  return new Date().toISOString().split('T')[0]
}
function statusHutang(total, bayar) {
  const sisa = total - bayar
  if (sisa <= 0)   return { label: 'Lunas',       warna: '#dcfce7', teks: '#14532d' }
  if (bayar === 0) return { label: 'Belum Bayar', warna: '#fee2e2', teks: '#991b1b' }
  return                  { label: 'Sebagian',    warna: '#fef3c7', teks: '#92400e' }
}

const panel = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 12, overflow: 'hidden', marginBottom: 20,
}
const th = {
  padding: '11px 20px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, color: '#475569', textTransform: 'uppercase',
  letterSpacing: '0.8px', borderBottom: '1px solid #334155',
}
const td = {
  padding: '13px 20px', borderBottom: '1px solid rgba(51,65,85,0.5)',
  verticalAlign: 'middle',
}
const inputStyle = {
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 8, color: '#f1f5f9',
  fontFamily: 'inherit', fontSize: 14,
  padding: '9px 14px', outline: 'none', width: '100%',
}
const btnPrimer    = { padding: '7px 14px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnSecondary = { padding: '7px 14px', borderRadius: 8, background: '#334155', color: '#f1f5f9', border: '1px solid #475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnKuning    = { padding: '4px 10px', borderRadius: 6, background: '#f59e0b', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnDanger    = { padding: '4px 10px', borderRadius: 6, background: '#dc2626', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

const formDefault = {
  nama: '', keterangan: '',
  total_hutang: '', sudah_bayar: '0', tanggal: hariIni(),
}

// ── MODAL BAYAR — komponen terpisah agar tidak ada masalah null ──
function ModalBayar({ item, onClose, onProses }) {
  const [jumlah, setJumlah] = useState('')
  if (!item) return null  // guard — jangan render kalau item null

  const sisa = item.total_hutang - item.sudah_bayar

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #334155' }}>
          💰 Catat Pembayaran
        </div>

        {/* Info hutang */}
        <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.nama}</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>{item.keterangan}</div>
          <div style={{ display: 'flex', gap: 20, fontFamily: 'monospace', fontSize: 13 }}>
            <div>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>TOTAL</div>
              {formatRupiah(item.total_hutang)}
            </div>
            <div>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>SUDAH BAYAR</div>
              <span style={{ color: '#4ade80' }}>{formatRupiah(item.sudah_bayar)}</span>
            </div>
            <div>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>SISA</div>
              <span style={{ color: '#dc2626' }}>{formatRupiah(Math.max(0, sisa))}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
            Jumlah yang Dibayar Sekarang (Rp)
          </label>
          <input
            style={inputStyle}
            type="number" placeholder="0" min="0"
            value={jumlah}
            onChange={e => setJumlah(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={onClose}>Batal</button>
          <button style={btnPrimer} onClick={() => onProses(parseInt(jumlah) || 0, sisa)}>
            💰 Catat Bayar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KOMPONEN UTAMA ────────────────────────────────────────────
export default function Hutang() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(formDefault)
  const [editId, setEditId]       = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [itemBayar, setItemBayar] = useState(null)  // null = modal tertutup
  const [cari, setCari]           = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [pesan, setPesan]         = useState(null)

  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('hutang')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setData(rows)
    setLoading(false)
  }

  useEffect(() => { muatData() }, [])

  async function simpan() {
    if (!form.nama.trim()) { tampilPesan('⚠️ Nama pelanggan wajib diisi!'); return }
    const total = parseInt(form.total_hutang) || 0
    const bayar = parseInt(form.sudah_bayar)  || 0
    if (total <= 0)    { tampilPesan('⚠️ Total hutang harus lebih dari 0!'); return }
    if (bayar > total) { tampilPesan('⚠️ Pembayaran tidak boleh melebihi total hutang!'); return }

    const payload = {
      nama:         form.nama.trim(),
      keterangan:   form.keterangan.trim(),
      total_hutang: total,
      sudah_bayar:  bayar,
      tanggal:      form.tanggal || null,
    }

    if (editId) {
      const { error } = await supabase.from('hutang').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ Gagal update: ' + error.message); return }
      tampilPesan('✅ Data hutang diperbarui!')
    } else {
      const { error } = await supabase.from('hutang').insert([payload])
      if (error) { tampilPesan('❌ Gagal simpan: ' + error.message); return }
      tampilPesan('✅ Hutang berhasil dicatat!')
    }
    setForm(formDefault); setEditId(null); setShowForm(false)
    muatData()
  }

  function bukaEdit(item) {
    setForm({
      nama:         item.nama,
      keterangan:   item.keterangan || '',
      total_hutang: item.total_hutang,
      sudah_bayar:  item.sudah_bayar,
      tanggal:      item.tanggal || hariIni(),
    })
    setEditId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function hapus(id, nama) {
    if (!confirm(`Hapus hutang "${nama}"?`)) return
    const { error } = await supabase.from('hutang').delete().eq('id', id)
    if (error) { tampilPesan('❌ Gagal hapus: ' + error.message); return }
    tampilPesan('🗑️ Data hutang dihapus')
    muatData()
  }

  // ── PROSES BAYAR — menerima jumlah dan sisa dari ModalBayar ──
  async function prosesBayar(bayar, sisa) {
    if (!itemBayar) return
    if (bayar <= 0)  { tampilPesan('⚠️ Jumlah bayar harus lebih dari 0'); return }
    if (bayar > sisa){ tampilPesan(`⚠️ Melebihi sisa hutang (${formatRupiah(sisa)})`); return }

    const sudahBayarBaru = itemBayar.sudah_bayar + bayar
    const { error } = await supabase
      .from('hutang')
      .update({ sudah_bayar: sudahBayarBaru })
      .eq('id', itemBayar.id)

    if (error) { tampilPesan('❌ Gagal: ' + error.message); return }

    const sisaBaru = itemBayar.total_hutang - sudahBayarBaru
    tampilPesan(sisaBaru <= 0
      ? `🎉 Hutang ${itemBayar.nama} LUNAS!`
      : `💰 Bayar ${formatRupiah(bayar)} tercatat. Sisa: ${formatRupiah(sisaBaru)}`
    )
    setItemBayar(null)  // tutup modal
    muatData()
  }

  function tampilPesan(teks) {
    setPesan(teks)
    setTimeout(() => setPesan(null), 3500)
  }

  // ── KALKULASI ─────────────────────────────────────────────
  const totalSisa  = data.reduce((s, h) => s + Math.max(0, h.total_hutang - h.sudah_bayar), 0)
  const belumLunas = data.filter(h => statusHutang(h.total_hutang, h.sudah_bayar).label !== 'Lunas').length
  const sudahLunas = data.filter(h => statusHutang(h.total_hutang, h.sudah_bayar).label === 'Lunas').length

  const dataFiltered = data.filter(h => {
    const cocokNama   = h.nama.toLowerCase().includes(cari.toLowerCase())
    const s           = statusHutang(h.total_hutang, h.sudah_bayar).label
    const cocokStatus = filterStatus === '' || s === filterStatus
    return cocokNama && cocokStatus
  })

  return (
    <div>
      {/* Toast */}
      {pesan && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 8, padding: '12px 18px',
          fontSize: 14, fontWeight: 600, zIndex: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>{pesan}</div>
      )}

      {/* Modal Bayar — hanya render kalau itemBayar tidak null */}
      <ModalBayar
        item={itemBayar}
        onClose={() => setItemBayar(null)}
        onProses={prosesBayar}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>💳 Hutang Pelanggan</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Pantau dan kelola tagihan pelanggan</div>
        </div>
        <button style={btnPrimer} onClick={() => { setForm(formDefault); setEditId(null); setShowForm(!showForm) }}>
          {showForm ? '✕ Tutup Form' : '➕ Catat Hutang'}
        </button>
      </div>

      {/* Kartu Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: '💳 Total Sisa Hutang', nilai: formatRupiah(totalSisa),   warna: '#dc2626', sub: `dari ${data.length} data` },
          { label: '⏳ Belum/Sebagian',    nilai: belumLunas + ' pelanggan', warna: '#f59e0b', sub: 'masih aktif' },
          { label: '✅ Sudah Lunas',        nilai: sudahLunas + ' pelanggan', warna: '#16a34a', sub: 'lunas' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.warna }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', marginBottom: 6 }}>{k.nilai}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <div style={{ ...panel, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
            {editId ? '✏️ Edit Data Hutang' : '➕ Catat Hutang Baru'}
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Nama Pelanggan</label>
                <input style={inputStyle} placeholder="cth: Pak Budi"
                  value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Keterangan</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                  placeholder="cth: Sewa lapangan A 2 jam + 1 shuttlecock"
                  value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Total Hutang (Rp)</label>
                <input style={inputStyle} type="number" placeholder="0" min="0"
                  value={form.total_hutang} onChange={e => setForm({ ...form, total_hutang: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Sudah Dibayar (Rp)</label>
                <input style={inputStyle} type="number" placeholder="0" min="0"
                  value={form.sudah_bayar} onChange={e => setForm({ ...form, sudah_bayar: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Tanggal</label>
                <input style={inputStyle} type="date"
                  value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => { setShowForm(false); setEditId(null); setForm(formDefault) }}>Batal</button>
              <button style={btnPrimer} onClick={simpan}>💾 Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, width: 'auto', flex: 1, maxWidth: 280 }}
          placeholder="🔍 Cari nama pelanggan..."
          value={cari} onChange={e => setCari(e.target.value)} />
        <select style={{ ...inputStyle, width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="Belum Bayar">Belum Bayar</option>
          <option value="Sebagian">Sebagian</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>

      {/* Tabel */}
      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Daftar Hutang</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{dataFiltered.length} data</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <p>Belum ada data hutang.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Nama','Keterangan','Total Hutang','Sudah Bayar','Sisa','Status','Aksi'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataFiltered.map(h => {
                const sisa = h.total_hutang - h.sudah_bayar
                const s    = statusHutang(h.total_hutang, h.sudah_bayar)
                return (
                  <tr key={h.id}>
                    <td style={td}>
                      <strong>{h.nama}</strong>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{formatTanggal(h.tanggal)}</div>
                    </td>
                    <td style={{ ...td, color: '#94a3b8', fontSize: 13, maxWidth: 200 }}>{h.keterangan}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{formatRupiah(h.total_hutang)}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#4ade80' }}>{formatRupiah(h.sudah_bayar)}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: sisa > 0 ? '#dc2626' : '#4ade80' }}>
                      {formatRupiah(Math.max(0, sisa))}
                    </td>
                    <td style={td}>
                      <span style={{ background: s.warna, color: s.teks, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sisa > 0 && (
                        <button style={btnKuning} onClick={() => setItemBayar(h)}>💰 Bayar</button>
                      )}
                      <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={() => bukaEdit(h)}>✏️</button>
                      <button style={btnDanger} onClick={() => hapus(h.id, h.nama)}>🗑️</button>
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