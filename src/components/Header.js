'use client'

export default function Header() {
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
      padding: '0 24px',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🏸</div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>
          Badminton <span style={{ color: '#16a34a' }}>Manager</span>
        </div>
      </div>
      <div style={{
        fontSize: 12, color: '#94a3b8',
        background: '#0f172a',
        border: '1px solid #334155',
        padding: '4px 12px', borderRadius: 20,
        fontFamily: 'monospace',
      }}>
        {today}
      </div>
    </header>
  )
}