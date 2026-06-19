import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800']
})

export const metadata = {
  title: 'Badminton Manager | Garuda Takalala',
  description: 'Aplikasi manajemen lapangan badminton',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Badminton Manager',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}