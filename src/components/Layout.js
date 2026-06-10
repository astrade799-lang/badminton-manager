'use client'
import { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Ringkasan from './halaman/Ringkasan'
import Stok from './halaman/Stok'
import Hutang from './halaman/Hutang'
import Kas from './halaman/Kas'
import Export from './halaman/Export'

const halaman = {
  ringkasan: <Ringkasan />,
  stok:      <Stok />,
  hutang:    <Hutang />,
  kas:       <Kas />,
  export:    <Export />,
}

export default function Layout() {
  const [aktif, setAktif] = useState('ringkasan')

function gantiHalaman(nama) {
  setAktif(nama)
}

return (
  <div>
    <Header />
    <div style={{ display: 'flex', paddingTop: 60, minHeight: '100vh' }}>
      <Sidebar aktif={aktif} onChange={gantiHalaman} />
      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: 28,
        minHeight: 'calc(100vh - 60px)',
      }}>
        {halaman[aktif]}
      </main>
    </div>
  </div>
)
}