import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Query ringan — cukup untuk "membangunkan" Supabase
    const { error } = await supabase.from('stok').select('id').limit(1)

    if (error) {
      return Response.json({ status: 'error', message: error.message }, { status: 500 })
    }

    return Response.json({ status: 'ok', time: new Date().toISOString() })
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 })
  }
}