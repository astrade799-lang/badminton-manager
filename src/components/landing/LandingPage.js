'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Zap, MapPin, Users, Award, ChevronDown } from 'lucide-react'

function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return scrollY
}

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

function useTypewriter(words, speed = 80, pause = 2000) {
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIdx(c => c + 1)
        }
      } else {
        setText(word.slice(0, charIdx - 1))
        if (charIdx === 0) {
          setDeleting(false)
          setWordIdx(i => (i + 1) % words.length)
        } else {
          setCharIdx(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [text, deleting, charIdx, wordIdx])
  return text
}

const labelKategori = {
  paket_bola: '🏸 Paket Bola',
  qr_transfer: '📱 Transfer',
  turnamen: '🏆 Turnamen',
  umum: '📢 Info',
}

// ── SATU SUMBER DATA UNTUK LINK SOSMED — ganti # di sini, otomatis update di hero & footer ──
const sosmedLinks = [
  { label: 'Instagram', icon: '📸', href: '#' }, // ganti # dengan link Instagram
  { label: 'WhatsApp',  icon: '💬', href: '#' }, // ganti # dengan link WhatsApp
  { label: 'Facebook',  icon: '📘', href: '#' }, // ganti # dengan link Facebook
]

// ── ISI MARQUEE — tambah/ganti icon & label di sini (cari nama icon lain di lucide.dev/icons) ──
const marqueeItems = [
  { Icon: Trophy, label: 'GARUDA TAKALALA' },
  { Icon: Zap,    label: 'SESI SORE & MALAM' },
  { Icon: Award,  label: 'TURNAMEN BERKALA' },
  { Icon: MapPin, label: 'TAKALALA' },
  { Icon: Users,  label: 'KOMUNITAS SOLID' },
]

export default function LandingPage() {
  const scrollY = useScrollY()
  const [infoList, setInfoList] = useState([])
  const [infoTerbuka, setInfoTerbuka] = useState(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [heroRef, heroInView] = useInView(0.1)
  const [infoRef, infoInView] = useInView(0.1)
  const [mapsRef, mapsInView] = useInView(0.1)
  const typedText = useTypewriter([ 'BadmintonClub','Kompetitif', 'Aktif', 'Solid', 'Berprestasi'], 90, 1500)

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

  useEffect(() => {
    const handler = (e) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const navOpak = scrollY > 60

  function scrollKeInfo(e) {
    e.preventDefault()
    const el = document.getElementById('informasi')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight:'100vh', background:'#050a14', fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", color:'#f1f5f9', overflowX:'hidden' }}>

      {/* ── CURSOR GLOW EFFECT ── */}
      <div style={{
        position:'fixed', pointerEvents:'none', zIndex:9999,
        width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(22,163,74,0.06) 0%, transparent 70%)',
        left: mouse.x - 200, top: mouse.y - 200,
        transition:'left 0.1s ease-out, top 0.1s ease-out',
      }} />

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        padding:'0 32px', height:64,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: navOpak ? 'rgba(5,10,20,0.85)' : 'transparent',
        backdropFilter: navOpak ? 'blur(20px)' : 'none',
        borderBottom: navOpak ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition:'all 0.4s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:26 }}>🏸</span>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>
            Garuda <span style={{ color:'#16a34a' }}>Takalala</span>
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={scrollKeInfo} style={{
            padding:'8px 18px', borderRadius:40, fontSize:13, fontWeight:600,
            background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
            color:'#94a3b8', cursor:'pointer', fontFamily:'inherit',
          }}>Info</button>
          <a href="#lokasi" onClick={(e)=>{ e.preventDefault(); document.getElementById('lokasi')?.scrollIntoView({behavior:'smooth'}) }} style={{
            padding:'8px 18px', borderRadius:40, fontSize:13, fontWeight:600,
            background:'transparent', border:'1px solid rgba(255,255,255,0.15)',
            color:'#94a3b8', cursor:'pointer', textDecoration:'none',
          }}>Lokasi</a>
          <a href="/pemain" style={{
            padding:'8px 20px', borderRadius:40, fontSize:13, fontWeight:700,
            background:'#16a34a', color:'white', textDecoration:'none',
            boxShadow:'0 0 20px rgba(22,163,74,0.3)',
          }}>Login →</a>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section style={{ position:'relative', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>

        {/* ── GAMBAR HERO ── */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`url('https://barae.desa.id/wp-content/uploads/2026/07/bgDeks7.png')`,
          backgroundSize:'cover', backgroundPosition:'center',
          transform:`translateY(${scrollY * 0.25}px)`,
          filter:'brightness(0.75) saturate(1.2)',
        }} />

        {/* Animated gradient overlay */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(135deg, rgba(5,10,20,0.8) 0%, rgba(5,30,15,0.4) 50%, rgba(5,10,20,0.9) 100%)',
        }} />

        {/* Grid lines dekoratif */}
        <div style={{
          position:'absolute', inset:0, opacity:0.04,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize:'80px 80px',
        }} />

        {/* Partikel mengambang */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position:'absolute',
            width: 2 + (i % 4),
            height: 2 + (i % 4),
            borderRadius:'50%',
            background: i % 2 === 0 ? '#4ade80' : '#16a34a',
            opacity: 0.5 + (i * 0.05),
            top: `${10 + i * 10}%`,
            left: `${5 + i * 11}%`,
            boxShadow:`0 0 ${6 + i * 2}px rgba(74,222,128,0.8)`,
            animation:`floatParticle ${3 + (i % 3)}s ease-in-out infinite`,
            animationDelay:`${i * 0.4}s`,
          }} />
        ))}

        {/* Konten Hero */}
        <div ref={heroRef} style={{
          position:'relative', textAlign:'center', padding:'0 24px', maxWidth:800,
          transform: heroInView ? 'translateY(0)' : 'translateY(50px)',
          opacity: heroInView ? 1 : 0,
          transition:'all 3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'6px 18px', borderRadius:40, marginBottom:28,
            background:'rgba(22,163,74,0.12)', border:'1px solid rgba(22,163,74,0.25)',
            fontSize:12, color:'#4ade80', fontWeight:600,
            backdropFilter:'blur(10px)',
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 8px #4ade80', animation:'pulse 2s ease-in-out infinite' }} />
            Badminton Club · Takalala
          </div>

          <h1 style={{
            fontSize:'clamp(1.7rem, 7vw, 5rem)',
            fontWeight:800, lineHeight:1.05,
            letterSpacing:'-2px', marginBottom:16,
          }}>
            GARUDA TAKALALA
            <br />
            <span style={{
              background:'linear-gradient(135deg, #16a34a 0%, #4ade80 50%, #86efac 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundSize:'200% auto',
              animation:'shimmer 1s linear infinite',
            }}>
              {typedText}
              <span style={{ animation:'blink 10s step-end infinite', color:'#4ade80' }}>|</span>
            </span>
          </h1>

          <p style={{
            fontSize:'clamp(1.2rem, 2vw, 1.15rem)',
            color:'#d4ddebff', lineHeight:1.8, marginBottom:32,
            maxWidth:700, margin:'0 auto 32px',
          }}>
            Garuda Takalala — tempat para pecinta bulutangkis berkumpul, bersaing, dan berkembang bersama.
          </p>

          {/* ── SOSMED ICONS DI HERO ── */}
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
            {sosmedLinks.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:40, fontSize:12, fontWeight:600,
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
                color:'#cbd5e1', textDecoration:'none', backdropFilter:'blur(8px)',
                transition:'all 0.2s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(22,163,74,0.15)'; e.currentTarget.style.borderColor='rgba(22,163,74,0.35)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)' }}
              >
                <span>{s.icon}</span> {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── LOGO / ICON SCROLL MARQUEE ── */}
        <div style={{
          position:'absolute', bottom:70, left:0, right:0,
          overflow:'hidden',
          padding:'12px 0',
          background:'rgba(5,10,20,0.35)',
          borderTop:'1px solid rgba(255,255,255,0.06)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          backdropFilter:'blur(6px)',
        }}>
          <div style={{
            display:'flex', width:'max-content', gap:48,
            animation:'marqueeScroll 22s linear infinite',
          }}>
            {[...marqueeItems, ...marqueeItems].map(({ Icon, label }, i) => (
              <span key={i} style={{
                display:'flex', alignItems:'center', gap:8,
                fontSize:13, fontWeight:700, letterSpacing:1.5,
                color:'#4ade80', opacity:0.75, whiteSpace:'nowrap',
              }}>
                <Icon size={16} strokeWidth={2.2} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── SCROLL INDICATOR (klikable, di atas marquee) ── */}
        <div
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          style={{
            position:'absolute', bottom:135, left:'50%', transform:'translateX(-50%)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            opacity: scrollY > 80 ? 0 : 1, transition:'opacity 0.3s',
            cursor:'pointer',
          }}
        >
          <span style={{ fontSize:10, color:'#64748b', letterSpacing:3, marginBottom:4 }}>SCROLL</span>
          <ChevronDown size={20} color="#4ade80" style={{ animation:'bounceDown 1.6s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        padding:'48px 32px',
        background:'linear-gradient(180deg, rgba(5,10,20,1) 0%, rgba(5,20,10,0.3) 50%, rgba(5,10,20,1) 100%)',
        borderTop:'1px solid rgba(22,163,74,0.1)',
        borderBottom:'1px solid rgba(22,163,74,0.1)',
      }}>
        <div style={{ maxWidth:800, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, textAlign:'center' }}>
          {[
            { icon:'🏸', label:'Lapangan Aktif', sub:'Tersedia setiap hari' },
            { icon:'⚡', label:'Sesi Rutin', sub:'Sore & Malam' },
            { icon:'🏆', label:'Kompetitif', sub:'Turnamen berkala' },
          ].map((s, i) => (
            <div key={i} style={{ padding:'8px 0' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:12, color:'#475569' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INFORMASI SECTION ── */}
      <section id="informasi" style={{ padding:'100px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div ref={infoRef} style={{
            textAlign:'center', marginBottom:56,
            transform: infoInView ? 'translateY(0)' : 'translateY(30px)',
            opacity: infoInView ? 1 : 0,
            transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ fontSize:11, letterSpacing:4, color:'#16a34a', fontWeight:700, marginBottom:14 }}>INFORMASI</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)', fontWeight:800, letterSpacing:-1, marginBottom:14 }}>
              Info & Pengumuman
            </h2>
            <p style={{ color:'#475569', fontSize:14 }}>Klik kartu di bawah untuk melihat detail informasi</p>
          </div>

          {infoList.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'60px 24px',
              background:'rgba(30,41,59,0.4)', borderRadius:20,
              border:'1px solid rgba(51,65,85,0.3)',
              color:'#475569', fontSize:14,
            }}>
              Belum ada informasi yang dipublikasikan.<br />
              <span style={{ fontSize:12, color:'#334155', marginTop:8, display:'block' }}>
                (Admin: aktifkan info dan toggle "🌐 + Landing" di Pengaturan)
              </span>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {infoList.map((info, i) => (
                <div key={info.id} style={{
                  background: infoTerbuka === info.id ? 'rgba(22,163,74,0.06)' : 'rgba(15,23,42,0.8)',
                  border: infoTerbuka === info.id ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(51,65,85,0.4)',
                  borderRadius:16, overflow:'hidden',
                  backdropFilter:'blur(12px)',
                  transform: infoInView ? 'translateY(0)' : 'translateY(20px)',
                  opacity: infoInView ? 1 : 0,
                  transition:`transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i*0.07}s, opacity 0.6s ease ${i*0.07}s, border-color 0.3s, background 0.3s`,
                  boxShadow: infoTerbuka === info.id ? '0 0 30px rgba(22,163,74,0.08)' : 'none',
                }}>
                  <div
                    style={{ padding:'18px 24px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', userSelect:'none' }}
                    onClick={() => setInfoTerbuka(infoTerbuka === info.id ? null : info.id)}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20,
                        background: infoTerbuka === info.id ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.06)',
                        color: infoTerbuka === info.id ? '#4ade80' : '#64748b',
                        transition:'all 0.3s',
                      }}>
                        {labelKategori[info.kategori] || '📢 Info'}
                      </span>
                      <span style={{ fontWeight:700, fontSize:15, color: infoTerbuka === info.id ? '#f1f5f9' : '#cbd5e1' }}>
                        {info.judul}
                      </span>
                    </div>
                    <div style={{
                      width:30, height:30, borderRadius:'50%', flexShrink:0,
                      background: infoTerbuka === info.id ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.05)',
                      border:`1px solid ${infoTerbuka === info.id ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, color: infoTerbuka === info.id ? '#4ade80' : '#475569',
                      transform: infoTerbuka === info.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition:'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                    }}>▼</div>
                  </div>

                  <div style={{
                    maxHeight: infoTerbuka === info.id ? '800px' : '0px',
                    overflow:'hidden',
                    transition:'max-height 0.45s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ padding:'4px 24px 24px', borderTop:'1px solid rgba(51,65,85,0.3)' }}>
                      {info.gambar_url && (
                        <div style={{ textAlign:'center', margin:'20px 0' }}>
                          <img src={info.gambar_url} alt={info.judul}
                            style={{ maxWidth:'100%', maxHeight:400, borderRadius:12, border:'1px solid rgba(51,65,85,0.4)' }}
                          />
                        </div>
                      )}
                      {info.konten && (
                        <p style={{ fontSize:14, color:'#94a3b8', lineHeight:1.9, whiteSpace:'pre-wrap', marginTop: info.gambar_url ? 0 : 16 }}>
                          {info.konten}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── MAPS SECTION ── */}
      <section id="lokasi" style={{ padding:'100px 24px', background:'rgba(5,10,20,0.95)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div ref={mapsRef} style={{
            textAlign:'center', marginBottom:48,
            transform: mapsInView ? 'translateY(0)' : 'translateY(30px)',
            opacity: mapsInView ? 1 : 0,
            transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ fontSize:11, letterSpacing:4, color:'#16a34a', fontWeight:700, marginBottom:14 }}>LOKASI</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)', fontWeight:800, letterSpacing:-1, marginBottom:10 }}>Temukan Kami</h2>
            <p style={{ color:'#475569', fontSize:14 }}>Garuda Takalala Badminton Club · Takalala</p>
          </div>

          <div style={{
            borderRadius:24, overflow:'hidden',
            border:'1px solid rgba(22,163,74,0.15)',
            boxShadow:'0 0 80px rgba(22,163,74,0.06)',
            transform: mapsInView ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(20px)',
            opacity: mapsInView ? 1 : 0,
            transition:'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}>
            <iframe
              src="https://maps.google.com/maps?q=-3.9871,122.5127&z=16&output=embed"
              width="100%" height="420"
              style={{ border:0, display:'block', filter:'invert(90%) hue-rotate(180deg) brightness(0.85) contrast(1.1)' }}
              allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div style={{ textAlign:'center', marginTop:24 }}>
            <a href="https://maps.app.goo.gl/eh669YpEdihuuT3j7" target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'11px 28px', borderRadius:40, fontSize:13, fontWeight:600,
              background:'rgba(22,163,74,0.12)', border:'1px solid rgba(22,163,74,0.25)',
              color:'#4ade80', textDecoration:'none',
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>e.target.style.background='rgba(22,163,74,0.2)'}
            onMouseLeave={e=>e.target.style.background='rgba(22,163,74,0.12)'}
            >
              📍 Buka di Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'64px 24px 40px', background:'#030710', borderTop:'1px solid rgba(255,255,255,0.04)', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏸</div>
          <div style={{ fontWeight:900, fontSize:22, marginBottom:6, letterSpacing:-0.5 }}>
            Garuda <span style={{ color:'#16a34a' }}>Takalala</span>
          </div>
          <p style={{ fontSize:13, color:'#334155', marginBottom:36 }}>Badminton Club · Takalala</p>

          {/* ── SOSMED (pakai data yang sama dengan hero) ── */}
          <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:40, flexWrap:'wrap' }}>
            {sosmedLinks.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                padding:'9px 20px', borderRadius:40, fontSize:13, fontWeight:600,
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                color:'#475569', textDecoration:'none', display:'flex', alignItems:'center', gap:7,
                transition:'all 0.2s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
              onMouseLeave={e=>{ e.currentTarget.style.color='#475569'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}
              >
                {s.icon} {s.label}
              </a>
            ))}
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:28 }}>
            <a href="/pemain" style={{
              display:'inline-flex', alignItems:'center', gap:8, marginBottom:24,
              padding:'10px 28px', borderRadius:40, fontSize:13, fontWeight:700,
              background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.2)',
              color:'#4ade80', textDecoration:'none',
            }}>
              🏸 Login
            </a>
            <p style={{ fontSize:12, color:'#1e293b' }}>
              © {new Date().getFullYear()} Garuda Takalala · Badminton Manager
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(5deg); }
          66% { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 8px #4ade80; }
          50% { box-shadow: 0 0 16px #4ade80, 0 0 24px rgba(74,222,128,0.4); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes scrollDown {
          0% { transform: scaleY(0); transform-origin: top; opacity: 1; }
          100% { transform: scaleY(1); transform-origin: top; opacity: 0; }
        }
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(6px); opacity: 1; }
        }
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050a14; }
        ::-webkit-scrollbar-thumb { background: #16a34a; border-radius: 4px; }
      `}</style>
    </div>
  )
}