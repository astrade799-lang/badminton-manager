'use client'

export default function Header({ profile, onLogout, isMobile }) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric'
  })

  return (
    <header style={{
      height: '60px',
      background: '#1e293b',
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🏸</div>
        <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, letterSpacing: -0.5 }}>
          Badminton <span style={{ color: '#16a34a' }}>Manager</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>

        {/* Tanggal — sembunyikan di mobile */}
        {!isMobile && (
          <div style={{
            fontSize: 12, color: '#94a3b8',
            background: '#0f172a',
            border: '1px solid #334155',
            padding: '4px 12px', borderRadius: 20,
            fontFamily: 'monospace',
          }}>
            {today}
          </div>
        )}

        {/* Info User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
          {profile && !isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                {profile.nama}
              </div>
              <div style={{ fontSize: 11, color: profile.role === 'admin' ? '#4ade80' : '#94a3b8' }}>
                {profile.role === 'admin' ? '👑 Admin' : '🧑‍💼 Kasir'}
              </div>
            </div>
          )}

          {/* Avatar */}
          {profile && (
            <div style={{
              width: 34, height: 34,
              background: profile.role === 'admin'
                ? 'linear-gradient(135deg, #14532d, #16a34a)'
                : 'linear-gradient(135deg, #1e40af, #2563eb)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {profile.nama?.charAt(0).toUpperCase() || '?'}
            </div>
          )}

          {/* Tombol Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                padding: isMobile ? '6px 10px' : '6px 14px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                fontSize: isMobile ? 11 : 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {isMobile ? '🚪' : '🚪 Keluar'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}