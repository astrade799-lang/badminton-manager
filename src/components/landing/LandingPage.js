'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── HOOK: scroll position untuk efek parallax & navbar ──
function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return scrollY
}

// ── HOOK: intersection observer untuk animasi masuk ──
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

const labelKategori = {
  paket_bola: '🏸 Paket Bola',
  qr_transfer: '📱 Transfer',
  turnamen: '🏆 Turnamen',
  umum: '📢 Info',
}

export default function LandingPage() {
  const scrollY = useScrollY()
  const [infoList, setInfoList] = useState([])
  const [infoTerbuka, setInfoTerbuka] = useState(null)
  const [heroRef, heroInView] = useInView(0.1)
  const [infoRef, infoInView] = useInView(0.1)
  const [mapsRef, mapsInView] = useInView(0.1)

  useEffect(() => {
    async function muatInfo() {
      const { data } = await supabase
        .from('info_admin')
        .select('*')
        .eq('aktif', true)
        .eq('tampil_di_landing', true)
        .order('urutan')
      if (data) setInfoList(data)
    }
    muatInfo()
  }, [])

  const navOpak = scrollY > 60

  return (
    <div style={{ minHeight:'100vh', background:'#050a14', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'#f1f5f9', overflowX:'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        padding:'0 24px', height:64,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: navOpak ? 'rgba(5,10,20,0.92)' : 'transparent',
        backdropFilter: navOpak ? 'blur(16px)' : 'none',
        borderBottom: navOpak ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition:'all 0.4s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🏸</span>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>
            Garuda <span style={{ color:'#16a34a' }}>Takalala</span>
          </span>
        </div>
        <a
          href="/pemain"
          style={{
            padding:'8px 20px', borderRadius:40, fontSize:13, fontWeight:700,
            background:'#16a34a', color:'white', textDecoration:'none',
            boxShadow:'0 0 20px rgba(22,163,74,0.4)',
            transition:'all 0.2s',
          }}
        >
          Masuk sebagai Pemain →
        </a>
      </nav>

      {/* ── HERO SECTION ── */}
      <section style={{ position:'relative', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>

        {/* Background image dengan parallax */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`url('https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=80')`,
          backgroundSize:'cover',
          backgroundPosition:'center',
          transform:`translateY(${scrollY * 0.3}px)`,
          filter:'brightness(0.3)',
        }} />

        {/* Gradient overlay */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(5,10,20,0.2) 0%, rgba(5,10,20,0.6) 60%, rgba(5,10,20,1) 100%)',
        }} />

        {/* Partikel dekoratif */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position:'absolute',
            width: 3 + (i % 3) * 2,
            height: 3 + (i % 3) * 2,
            borderRadius:'50%',
            background:'#16a34a',
            opacity: 0.4 + (i * 0.08),
            top: `${15 + i * 12}%`,
            left: `${8 + i * 14}%`,
            boxShadow:'0 0 10px rgba(22,163,74,0.8)',
            animation:`float${i % 2} ${3 + i}s ease-in-out infinite`,
          }} />
        ))}

        {/* Konten Hero */}
        <div ref={heroRef} style={{
          position:'relative', textAlign:'center', padding:'0 24px', maxWidth:700,
          transform: heroInView ? 'translateY(0)' : 'translateY(40px)',
          opacity: heroInView ? 1 : 0,
          transition:'all 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'6px 16px', borderRadius:40,
            background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)',
            fontSize:12, color:'#4ade80', fontWeight:600, marginBottom:24,
            backdropFilter:'blur(10px)',
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 8px #4ade80' }} />
            Lapangan Aktif · Bergabunglah Sekarang
          </div>

          <h1 style={{
            fontSize:'clamp(2.4rem, 7vw, 4.5rem)',
            fontWeight:900, lineHeight:1.05,
            letterSpacing:'-2px', marginBottom:20,
          }}>
            Badminton Club<br />
            <span style={{
              background:'linear-gradient(135deg, #16a34a, #4ade80)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              Garuda Takalala
            </span>
          </h1>

          <p style={{
            fontSize:'clamp(1rem, 2vw, 1.15rem)',
            color:'#94a3b8', lineHeight:1.7, marginBottom:40, maxWidth:520, margin:'0 auto 40px',
          }}>
            Komunitas bulutangkis yang aktif dan kompetitif. Bergabung, main, dan pantau progress permainanmu langsung dari aplikasi.
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/pemain" style={{
              padding:'14px 32px', borderRadius:40, fontSize:15, fontWeight:700,
              background:'linear-gradient(135deg, #16a34a, #15803d)',
              color:'white', textDecoration:'none',
              boxShadow:'0 8px 32px rgba(22,163,74,0.4)',
              transition:'all 0.2s',
            }}>
              🏸 Login Pemain
            </a>
            <a href="#informasi" style={{
              padding:'14px 32px', borderRadius:40, fontSize:15, fontWeight:700,
              background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
              color:'white', textDecoration:'none', backdropFilter:'blur(10px)',
            }}>
              Lihat Info →
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:8,
          opacity: scrollY > 100 ? 0 : 1, transition:'opacity 0.3s',
        }}>
          <span style={{ fontSize:11, color:'#475569', letterSpacing:2 }}>SCROLL</span>
          <div style={{
            width:1, height:40,
            background:'linear-gradient(180deg, #475569, transparent)',
            animation:'scrollLine 1.5s ease-in-out infinite',
          }} />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ padding:'40px 24px', background:'rgba(22,163,74,0.05)', borderTop:'1px solid rgba(22,163,74,0.1)', borderBottom:'1px solid rgba(22,163,74,0.1)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, textAlign:'center' }}>
          {[
            { angka:'🏸', label:'Lapangan Aktif' },
            { angka:'⚡', label:'Sesi Rutin Harian' },
            { angka:'🏆', label:'Komunitas Kompetitif' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize:32, marginBottom:6 }}>{s.angka}</div>
              <div style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INFORMASI SECTION ── */}
      {infoList.length > 0 && (
        <section id="informasi" style={{ padding:'80px 24px' }}>
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div ref={infoRef} style={{
              textAlign:'center', marginBottom:48,
              transform: infoInView ? 'translateY(0)' : 'translateY(30px)',
              opacity: infoInView ? 1 : 0,
              transition:'all 0.7s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <div style={{ fontSize:12, letterSpacing:3, color:'#16a34a', fontWeight:700, marginBottom:12 }}>INFORMASI</div>
              <h2 style={{ fontSize:'clamp(1.6rem,4vw,2.4rem)', fontWeight:800, letterSpacing:-1 }}>Info & Pengumuman</h2>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {infoList.map((info, i) => (
                <div
                  key={info.id}
                  style={{
                    background:'rgba(30,41,59,0.6)',
                    border: infoTerbuka === info.id ? '1px solid rgba(22,163,74,0.4)' : '1px solid rgba(51,65,85,0.5)',
                    borderRadius:16, overflow:'hidden',
                    backdropFilter:'blur(10px)',
                    transition:'border-color 0.3s',
                    transform: infoInView ? 'translateY(0)' : 'translateY(30px)',
                    opacity: infoInView ? 1 : 0,
                    transition:`all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
                  }}
                >
                  {/* Header accordion */}
                  <div
                    style={{ padding:'18px 24px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', userSelect:'none' }}
                    onClick={() => setInfoTerbuka(infoTerbuka === info.id ? null : info.id)}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background:'rgba(22,163,74,0.15)', color:'#4ade80',
                      }}>
                        {labelKategori[info.kategori] || '📢 Info'}
                      </span>
                      <span style={{ fontWeight:700, fontSize:15 }}>{info.judul}</span>
                    </div>
                    <div style={{
                      width:28, height:28, borderRadius:'50%',
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0,
                      transform: infoTerbuka === info.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition:'transform 0.3s',
                    }}>
                      ▼
                    </div>
                  </div>

                  {/* Konten accordion */}
                  <div style={{
                    maxHeight: infoTerbuka === info.id ? '600px' : '0px',
                    overflow:'hidden',
                    transition:'max-height 0.4s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ padding:'0 24px 24px', borderTop:'1px solid rgba(51,65,85,0.4)' }}>
                      {info.gambar_url && (
                        <div style={{ textAlign:'center', margin:'20px 0' }}>
                          <img
                            src={info.gambar_url} alt={info.judul}
                            style={{ maxWidth:'100%', maxHeight:400, borderRadius:12, border:'1px solid rgba(51,65,85,0.5)' }}
                          />
                        </div>
                      )}
                      {info.konten && (
                        <p style={{ fontSize:14, color:'#94a3b8', lineHeight:1.8, whiteSpace:'pre-wrap', marginTop: info.gambar_url ? 0 : 16 }}>
                          {info.konten}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MAPS SECTION ── */}
      <section style={{ padding:'80px 24px', background:'rgba(5,10,20,0.8)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div ref={mapsRef} style={{
            textAlign:'center', marginBottom:40,
            transform: mapsInView ? 'translateY(0)' : 'translateY(30px)',
            opacity: mapsInView ? 1 : 0,
            transition:'all 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ fontSize:12, letterSpacing:3, color:'#16a34a', fontWeight:700, marginBottom:12 }}>LOKASI</div>
            <h2 style={{ fontSize:'clamp(1.6rem,4vw,2.4rem)', fontWeight:800, letterSpacing:-1, marginBottom:12 }}>Temukan Kami</h2>
            <p style={{ color:'#64748b', fontSize:14 }}>Garuda Takalala Badminton Club</p>
          </div>

          <div style={{
            borderRadius:20, overflow:'hidden',
            border:'1px solid rgba(22,163,74,0.2)',
            boxShadow:'0 0 60px rgba(22,163,74,0.08)',
            transform: mapsInView ? 'scale(1)' : 'scale(0.96)',
            opacity: mapsInView ? 1 : 0,
            transition:'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}>
            <iframe
              src="https://maps.google.com/maps?q=-3.9871,122.5127&z=16&output=embed"
              width="100%"
              height="400"
              style={{ border:0, display:'block', filter:'invert(90%) hue-rotate(180deg)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <a
              href="https://maps.app.goo.gl/eh669YpEdihuuT3j7"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'10px 24px', borderRadius:40, fontSize:13, fontWeight:600,
                background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)',
                color:'#4ade80', textDecoration:'none',
              }}
            >
              📍 Buka di Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding:'48px 24px 32px',
        background:'rgba(5,10,20,1)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        textAlign:'center',
      }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🏸</div>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:4 }}>
            Garuda <span style={{ color:'#16a34a' }}>Takalala</span>
          </div>
          <p style={{ fontSize:13, color:'#475569', marginBottom:24 }}>Badminton Club</p>

          {/* Media sosial — isi URL manual di sini */}
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginBottom:32 }}>
            {[
              { label:'Instagram', icon:'📸', href:'#' },
              { label:'WhatsApp', icon:'💬', href:'#' },
              { label:'Facebook', icon:'📘', href:'#' },
            ].map(s => (
              <a key={s.label} href={s.href} style={{
                padding:'8px 18px', borderRadius:40, fontSize:12, fontWeight:600,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#94a3b8', textDecoration:'none', display:'flex', alignItems:'center', gap:6,
              }}>
                {s.icon} {s.label}
              </a>
            ))}
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:24 }}>
            <a href="/pemain" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'10px 28px', borderRadius:40, fontSize:13, fontWeight:700,
              background:'linear-gradient(135deg, #16a34a, #15803d)',
              color:'white', textDecoration:'none',
              boxShadow:'0 4px 20px rgba(22,163,74,0.3)',
              marginBottom:24,
            }}>
              🏸 Login sebagai Pemain
            </a>
            <p style={{ fontSize:12, color:'#334155' }}>
              © {new Date().getFullYear()} Garuda Takalala · Powered by Badminton Manager
            </p>
          </div>
        </div>
      </footer>

      {/* ── CSS ANIMASI ── */}
      <style>{`
        @keyframes float0 {
          0%, 100% { transform: translateY(0px) }
          50% { transform: translateY(-12px) }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) }
          50% { transform: translateY(-18px) }
        }
        @keyframes scrollLine {
          0% { opacity: 1; transform: scaleY(1) }
          100% { opacity: 0; transform: scaleY(0) }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}