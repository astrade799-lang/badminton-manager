import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { token, pin_baru } = await request.json()

    if (!token || !pin_baru) {
      return Response.json({ error: 'Token dan PIN baru wajib diisi' }, { status: 400 })
    }
    if (!/^\d{4,6}$/.test(pin_baru)) {
      return Response.json({ error: 'PIN harus 4-6 digit angka' }, { status: 400 })
    }

    // Validasi token dulu, sama seperti di /me
    const { data: sesi, error: errSesi } = await supabase
      .from('sesi_pemain')
      .select('pemain_id, expired_at')
      .eq('token', token)
      .maybeSingle()

    if (errSesi || !sesi) {
      return Response.json({ error: 'Sesi tidak valid' }, { status: 401 })
    }
    if (new Date(sesi.expired_at) < new Date()) {
      return Response.json({ error: 'Sesi sudah berakhir, silakan login ulang' }, { status: 401 })
    }

    const pinHash = await bcrypt.hash(pin_baru, 10)
    const { error: errUpdate } = await supabase
      .from('pemain')
      .update({ pin_hash: pinHash, pin_sudah_diganti: true })
      .eq('id', sesi.pemain_id)

    if (errUpdate) {
      return Response.json({ error: 'Gagal mengganti PIN' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: 'Permintaan tidak valid' }, { status: 400 })
  }
}