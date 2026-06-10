'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── HELPERS ──────────────────────────────────────────────────
function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

function statusStok(n) {
  if (n === 0)    return { label: 'Habis',   warna: '#fee2e2', teks: '#991b1b' }
  if (n <= 5)     return { label: 'Menipis', warna: '#fef3c7', teks: '#92400e' }
  return                 { label: 'Aman',    warna: '#dcfce7', teks: '#14532d' }
}

// ── STYLE CONSTANTS ───────────────────────────────────────────
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
const btnPrimer = {
  padding: '7px 14px', borderRadius: 8,
  background: '#16a34a', color: 'white',
  border: 'none', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}
const btnSecondary = {
  padding: '7px 14px', borderRadius: 8,
  background: '#334155', color: '#f1f5f9',
  border: '1px solid #475569', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}
const btnDanger = {
  padding: '4px 10px', borderRadius: 6,
  background: '#dc2626', color: 'white',
  border: 'none', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}

// ── FORM DEFAULT ──────────────────────────────────────────────
const formDefault = {
  nama: '', kategori: 'Shuttlecock',
  stok: '', satuan: '', harga: '',
}

// ── KOMPONEN UTAMA ────────────────────────────────────────────
export default function Stok() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(formDefault)
  const [editId, setEditId]       = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [cari, setCari]           = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [pesan, setPesan]         = useState(null)

  // ── LOAD DATA dari Supabase ───────────────────────────────
  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('stok')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setData(rows)
    setLoading(false)
  }

  useEffect(() => { muatData() }, [])

  // ── SIMPAN (Create atau Update) ───────────────────────────
  async function simpan() {
    if (!form.nama.trim()) { tampilPesan('⚠️ Nama produk wajib diisi!', 'kuning'); return }
    if (!form.stok && form.stok !== 0) { tampilPesan('⚠️ Jumlah stok wajib diisi!', 'kuning'); return }

    const payload = {
      nama:     form.nama.trim(),
      kategori: form.kategori,
      stok:     parseInt(form.stok) || 0,
      satuan:   form.satuan.trim() || 'pcs',
      harga:    parseInt(form.harga) || 0,
    }

    if (editId) {
      // UPDATE
      const { error } = await supabase.from('stok').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ Gagal update: ' + error.message, 'merah'); return }
      tampilPesan('✅ Produk berhasil diperbarui!', 'hijau')
    } else {
      // CREATE
      const { error } = await supabase.from('stok').insert([payload])
      if (error) { tampilPesan('❌ Gagal simpan: ' + error.message, 'merah'); return }
      tampilPesan('✅ Produk berhasil ditambahkan!', 'hijau')
    }

    setForm(formDefault)
    setEditId(null)
    setShowForm(false)
    muatData()
  }

  // ── EDIT ──────────────────────────────────────────────────
  function bukaEdit(item) {
    setForm({
      nama:     item.nama,
      kategori: item.kategori,
      stok:     item.stok,
      satuan:   item.satuan,
      harga:    item.harga,
    })
    setEditId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── HAPUS ─────────────────────────────────────────────────
  async function hapus(id, nama) {
    if (!confirm(`Hapus "${nama}"? Tidak bisa dibatalkan.`)) return
    const { error } = await supabase.from('stok').delete().eq('id', id)
    if (error) { tampilPesan('❌ Gagal hapus: ' + error.message, 'merah'); return }
    tampilPesan('🗑️ Produk berhasil dihapus', 'merah')
    muatData()
  }

  // ── TOAST PESAN ───────────────────────────────────────────
  function tampilPesan(teks, warna) {
    setPesan({ teks, warna })
    setTimeout(() => setPesan(null), 3000)
  }

  // ── FILTER DATA ───────────────────────────────────────────
  const dataFiltered = data.filter(p =>
    p.nama.toLowerCase().includes(cari.toLowerCase()) &&
    (filterKat === '' || p.kategori === filterKat)
  )

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div>
      {/* Toast Pesan */}
      {pesan && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 8, padding: '12px 18px',
          fontSize: 14, fontWeight: 600, zIndex: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {pesan.teks}
        </div>
      )}

      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
            📦 Manajemen Stok
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Kelola inventaris lapangan</div>
        </div>
        <button style={btnPrimer} onClick={() => { setForm(formDefault); setEditId(null); setShowForm(!showForm) }}>
          {showForm ? '✕ Tutup Form' : '➕ Tambah Produk'}
        </button>
      </div>

      {/* Form Tambah / Edit */}
      {showForm && (
        <div style={{ ...panel, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
            {editId ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Nama Produk</label>
                <input style={inputStyle} placeholder="cth: Shuttlecock Victor No.1"
                  value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Kategori</label>
                <select style={inputStyle} value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                  {['Shuttlecock','Raket','Grip','Senar','Lainnya'].map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Satuan</label>
                <input style={inputStyle} placeholder="lusin, pcs, buah"
                  value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Jumlah Stok</label>
                <input style={inputStyle} type="number" placeholder="0" min="0"
                  value={form.stok} onChange={e => setForm({ ...form, stok: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Harga Jual (Rp)</label>
                <input style={inputStyle} type="number" placeholder="0" min="0"
                  value={form.harga} onChange={e => setForm({ ...form, harga: e.target.value })} />
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
          placeholder="🔍 Cari nama produk..."
          value={cari} onChange={e => setCari(e.target.value)} />
        <select style={{ ...inputStyle, width: 'auto' }} value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {['Shuttlecock','Raket','Grip','Senar','Lainnya'].map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {/* Tabel */}
      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Daftar Stok</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{dataFiltered.length} produk</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p>Belum ada produk. Klik <strong>Tambah Produk</strong> untuk mulai.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Nama Produk','Kategori','Stok','Harga Jual','Status','Aksi'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataFiltered.map(p => {
                const s = statusStok(p.stok)
                return (
                  <tr key={p.id}>
                    <td style={td}><strong>{p.nama}</strong></td>
                    <td style={{ ...td, color: '#94a3b8' }}>{p.kategori}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{p.stok} {p.satuan}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{formatRupiah(p.harga)}</td>
                    <td style={td}>
                      <span style={{ background: s.warna, color: s.teks, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 6 }}>
                      <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={() => bukaEdit(p)}>✏️ Edit</button>
                      <button style={btnDanger} onClick={() => hapus(p.id, p.nama)}>🗑️</button>
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