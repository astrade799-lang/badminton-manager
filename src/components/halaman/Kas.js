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
const btnDanger    = { padding: '4px 10px', borderRadius: 6, background: '#dc2626', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

const formDefault = {
  jenis: 'masuk', kategori: 'Sewa Lapangan',
  keterangan: '', nominal: '', tanggal: hariIni(),
}

const KATEGORI = ['Sewa Lapangan', 'Penjualan Stok', 'Bayar Hutang', 'Beli Stok', 'Operasional', 'Lainnya']

export default function Kas() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(formDefault)
  const [editId, setEditId]       = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [cari, setCari]           = useState('')
  const [filterJenis, setFilterJenis]     = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [pesan, setPesan]         = useState(null)

  async function muatData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('kas')
      .select('*')
      .order('tanggal', { ascending: false })
    if (!error) setData(rows)
    setLoading(false)
  }

  useEffect(() => { muatData() }, [])

  async function simpan() {
    if (!form.keterangan.trim()) { tampilPesan('⚠️ Keterangan wajib diisi!'); return }
    const nominal = parseInt(form.nominal) || 0
    if (nominal <= 0) { tampilPesan('⚠️ Nominal harus lebih dari 0!'); return }

    const payload = {
      jenis:       form.jenis,
      kategori:    form.kategori,
      keterangan:  form.keterangan.trim(),
      nominal,
      tanggal:     form.tanggal || null,
    }

    if (editId) {
      const { error } = await supabase.from('kas').update(payload).eq('id', editId)
      if (error) { tampilPesan('❌ Gagal update: ' + error.message); return }
      tampilPesan('✅ Transaksi diperbarui!')
    } else {
      const { error } = await supabase.from('kas').insert([payload])
      if (error) { tampilPesan('❌ Gagal simpan: ' + error.message); return }
      tampilPesan('✅ Transaksi berhasil dicatat!')
    }
    setForm(formDefault); setEditId(null); setShowForm(false)
    muatData()
  }

  function bukaEdit(item) {
    setForm({
      jenis:      item.jenis,
      kategori:   item.kategori,
      keterangan: item.keterangan,
      nominal:    item.nominal,
      tanggal:    item.tanggal || hariIni(),
    })
    setEditId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function hapus(id, keterangan) {
    if (!confirm(`Hapus transaksi "${keterangan}"?`)) return
    const { error } = await supabase.from('kas').delete().eq('id', id)
    if (error) { tampilPesan('❌ Gagal hapus: ' + error.message); return }
    tampilPesan('🗑️ Transaksi dihapus')
    muatData()
  }

  function tampilPesan(teks) {
    setPesan(teks)
    setTimeout(() => setPesan(null), 3500)
  }

  // ── KALKULASI OTOMATIS ────────────────────────────────────
  // Tidak disimpan ke DB — selalu dihitung ulang dari data
  const totalMasuk  = data.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
  const totalKeluar = data.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)
  const saldo       = totalMasuk - totalKeluar

  // Pemasukan bulan ini
  const bulanIni = hariIni().substring(0, 7)
  const masukBulanIni = data
    .filter(t => t.jenis === 'masuk' && t.tanggal && t.tanggal.startsWith(bulanIni))
    .reduce((s, t) => s + t.nominal, 0)

  // ── FILTER ────────────────────────────────────────────────
  const dataFiltered = data.filter(t =>
    t.keterangan.toLowerCase().includes(cari.toLowerCase()) &&
    (filterJenis    === '' || t.jenis    === filterJenis) &&
    (filterKategori === '' || t.kategori === filterKategori)
  )

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>💰 Kas Bisnis</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Catat semua pemasukan dan pengeluaran</div>
        </div>
        <button style={btnPrimer} onClick={() => { setForm(formDefault); setEditId(null); setShowForm(!showForm) }}>
          {showForm ? '✕ Tutup Form' : '➕ Catat Transaksi'}
        </button>
      </div>

      {/* Kartu Kalkulasi Otomatis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: '📈 Total Pemasukan',    nilai: formatRupiah(totalMasuk),     warna: '#16a34a', sub: data.filter(t=>t.jenis==='masuk').length + ' transaksi' },
          { label: '📉 Total Pengeluaran',  nilai: formatRupiah(totalKeluar),    warna: '#dc2626', sub: data.filter(t=>t.jenis==='keluar').length + ' transaksi' },
          { label: '💼 Saldo Bersih',       nilai: formatRupiah(Math.abs(saldo)),warna: '#2563eb', sub: saldo >= 0 ? '↑ Surplus' : '↓ Defisit' },
          { label: '📅 Pemasukan Bulan Ini',nilai: formatRupiah(masukBulanIni),  warna: '#7c3aed', sub: new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'}) },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.warna }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', marginBottom: 6, color: i===2 ? (saldo>=0?'#4ade80':'#dc2626') : '#f1f5f9' }}>
              {i===2 && saldo<0 ? '-' : ''}{k.nilai}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <div style={{ ...panel, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
            {editId ? '✏️ Edit Transaksi' : '➕ Catat Transaksi Baru'}
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Jenis — tombol toggle, lebih intuitif dari dropdown */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Jenis Transaksi</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'masuk',  label: '📈 Pemasukan',   bg: form.jenis==='masuk'  ? '#16a34a' : '#334155' },
                    { value: 'keluar', label: '📉 Pengeluaran',  bg: form.jenis==='keluar' ? '#dc2626' : '#334155' },
                  ].map(j => (
                    <button key={j.value} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, background: j.bg, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                      onClick={() => setForm({ ...form, jenis: j.value })}>
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Kategori</label>
                <select style={inputStyle} value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                  {KATEGORI.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Keterangan</label>
                <input style={inputStyle} placeholder="cth: Sewa lapangan A 2 jam"
                  value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Nominal (Rp)</label>
                <input style={inputStyle} type="number" placeholder="0" min="0"
                  value={form.nominal} onChange={e => setForm({ ...form, nominal: e.target.value })} />
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
        <input style={{ ...inputStyle, width: 'auto', flex: 1, maxWidth: 260 }}
          placeholder="🔍 Cari keterangan..."
          value={cari} onChange={e => setCari(e.target.value)} />
        <select style={{ ...inputStyle, width: 'auto' }} value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
          <option value="">Semua Jenis</option>
          <option value="masuk">Pemasukan</option>
          <option value="keluar">Pengeluaran</option>
        </select>
        <select style={{ ...inputStyle, width: 'auto' }} value={filterKategori} onChange={e => setFilterKategori(e.target.value)}>
          <option value="">Semua Kategori</option>
          {KATEGORI.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {/* Tabel */}
      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Riwayat Transaksi</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{dataFiltered.length} transaksi</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Memuat data...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
            <p>Belum ada transaksi. Klik <strong>Catat Transaksi</strong> untuk mulai.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Tanggal','Keterangan','Kategori','Jenis','Nominal','Aksi'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataFiltered.map(t => (
                <tr key={t.id} style={{ borderLeft: `3px solid ${t.jenis === 'masuk' ? '#16a34a' : '#dc2626'}` }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {formatTanggal(t.tanggal)}
                  </td>
                  <td style={td}>{t.keterangan}</td>
                  <td style={{ ...td, color: '#94a3b8', fontSize: 13 }}>{t.kategori}</td>
                  <td style={td}>
                    <span style={{
                      background: t.jenis === 'masuk' ? '#dcfce7' : '#fee2e2',
                      color:      t.jenis === 'masuk' ? '#14532d' : '#991b1b',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    }}>
                      {t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td style={{
                    ...td,
                    fontFamily: 'monospace', fontWeight: 700,
                    color: t.jenis === 'masuk' ? '#4ade80' : '#dc2626',
                  }}>
                    {t.jenis === 'masuk' ? '+' : '-'}{formatRupiah(t.nominal)}
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 6 }}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={() => bukaEdit(t)}>✏️</button>
                    <button style={btnDanger} onClick={() => hapus(t.id, t.keterangan)}>🗑️</button>
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