'use client'

export default function Sidebar({ aktif, onChange, menus = [] }) {
  return (
    <nav style={{
      width: 240,
      background: '#0f172a',
      borderRight: '1px solid #334155',
      position: 'fixed',
      top: 60, left: 0, bottom: 0,
      padding: '20px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#475569',
        letterSpacing: '1.2px', textTransform: 'uppercase',
        padding: '8px 12px 4px',
      }}>
        Menu Utama
      </div>

      {menus.map(menu => (
        <button
          key={menu.id}
          onClick={() => onChange(menu.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14, fontWeight: aktif === menu.id ? 600 : 500,
            color: aktif === menu.id ? '#4ade80' : '#94a3b8',
            background: aktif === menu.id ? 'rgba(22,163,74,0.15)' : 'none',
            border: 'none',
            width: '100%', textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>
            {menu.ikon}
          </span>
          {menu.label}
        </button>
      ))}
    </nav>
  )
}