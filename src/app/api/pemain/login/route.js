import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PIN_DEFAULT = '0000'
const SESI_DURASI_HARI = 30 // token bertahan 30 hari sebelum harus login ulang

export async function POST(request) {
  try {
    const { no_hp, pin } = await request.json()

    if (!no_hp || !pin) {
      return Response.json({ error: 'No. HP dan PIN wajib diisi' }, { status: 400 })
    }

    // Cari pemain berdasarkan no_hp (harus persis sama)
    const { data: pemain, error: errPemain } = await supabase
      .from('pemain')
      .select('id, nama, no_hp, pin_hash, pin_sudah_diganti')
      .eq('no_hp', no_hp.trim())
      .maybeSingle()

    if (errPemain) {
      return Response.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
    }
    if (!pemain) {
      return Response.json({ error: 'No. HP tidak ditemukan' }, { status: 401 })
    }

    // Cek PIN: kalau pin_hash belum ada (pemain baru), bandingkan dengan PIN default polos.
    // Kalau sudah ada pin_hash, bandingkan dengan bcrypt.
    let pinValid = false
    if (!pemain.pin_hash) {
      pinValid = pin === PIN_DEFAULT
    } else {
      pinValid = await bcrypt.compare(pin, pemain.pin_hash)
    }

    if (!pinValid) {
      return Response.json({ error: 'PIN salah' }, { status: 401 })
    }

    // Buat token sesi acak (256-bit), bukan ID pemain langsung — supaya tidak bisa ditebak
    const token = crypto.randomBytes(32).toString('hex')
    const expiredAt = new Date(Date.now() + SESI_DURASI_HARI * 24 * 60 * 60 * 1000).toISOString()

    const { error: errSesi } = await supabase
      .from('sesi_pemain')
      .insert([{ pemain_id: pemain.id, token, expired_at: expiredAt }])

    if (errSesi) {
      return Response.json({ error: 'Gagal membuat sesi login' }, { status: 500 })
    }

    return Response.json({
      token,
      pemain_id: pemain.id,
      nama: pemain.nama,
      no_hp: pemain.no_hp,
      wajib_ganti_pin: !pemain.pin_sudah_diganti,
    })
  } catch (err) {
    return Response.json({ error: 'Permintaan tidak valid' }, { status: 400 })
  }
}