<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  LogIn, ArrowRight, Menu, X, Monitor, Code, Zap, Check,
  Mail, MapPin, MessageCircle, ShieldCheck, Clock, Wrench, Users,
} from '@lucide/vue'

const router = useRouter()
const goToLogin = () => router.push('/login')

/* ── Ganti data kontak di sini ───────────────────────── */
const company = {
  name: 'PT Putra Wisanggeni Satu',
  whatsapp: '6282232469415', // format internasional tanpa + atau 0 di depan
  email: 'admin@ptpws.id',
  address: 'Jalan Raya Wonosari RT/RW 002/001 Desa Wonosari Kec. Gondangwetan Kab Pasuruan, 67174',
}

const menuOpen = ref(false)
const links = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#keunggulan', label: 'Keunggulan' },
  { href: '#proses', label: 'Cara Kerja' },
  { href: '#kontak', label: 'Kontak' },
]

const services = [
  {
    id: 'it',
    icon: Monitor,
    title: 'IT Support',
    desc: 'Menjaga komputer, jaringan, dan perangkat kantor Anda tetap berjalan tanpa gangguan.',
    items: ['Instalasi dan konfigurasi CCTV', 'Jaringan server: kabel UTP dan Fiber Optic', 'Access point dan jaringan Wi-Fi kantor', 'Maintenance dan troubleshooting perangkat', 'Manajemen server dan backup data', 'Kontrak dukungan rutin (SLA)'],
  },
  {
    id: 'dev',
    icon: Code,
    title: 'Software Development',
    desc: 'Aplikasi yang dibuat sesuai alur kerja bisnis Anda, bukan sebaliknya.',
    items: ['Sistem CCMS terhubung dengan preventive maintenance, overhaul, dan perbaikan perusahaan', 'Sistem absensi perusahaan', 'Aplikasi Android dan iOS', 'Aplikasi berbasis web dan landing page', 'Software custom sesuai kebutuhan bisnis', 'Pemeliharaan dan pengembangan lanjutan'],
  },
  {
    id: 'ele',
    icon: Zap,
    title: 'Electrical Industrial',
    desc: 'Pekerjaan kelistrikan industri yang rapi, aman, dan sesuai standar keselamatan.',
    items: ['Kapasitor bank', 'Panel ATS (Automatic Transfer Switch)', 'Panel LV (Low Voltage)', 'PLTS (pembangkit listrik tenaga surya)', 'Perawatan dan perbaikan sistem kelistrikan industri', 'Dan kebutuhan kelistrikan industri lainnya'],
  },
]

const strengths = [
  { icon: Users, title: 'Satu mitra, tiga bidang', text: 'Jaringan, aplikasi, dan kelistrikan ditangani satu tim. Anda tidak perlu mengoordinasikan banyak vendor.' },
  { icon: Clock, title: 'Respons cepat', text: 'Kendala operasional dicatat dan ditindak dengan jadwal yang jelas sejak laporan pertama.' },
  { icon: ShieldCheck, title: 'Mengutamakan keselamatan', text: 'Setiap pekerjaan mengikuti prosedur K3 dan praktik keamanan data yang baku.' },
  { icon: Wrench, title: 'Dukungan setelah proyek', text: 'Kami tetap mendampingi setelah serah terima: garansi pekerjaan, perawatan, dan pelatihan pengguna.' },
]

const steps = [
  { title: 'Konsultasi', text: 'Anda ceritakan kebutuhan dan kendala di lapangan.' },
  { title: 'Survei dan penawaran', text: 'Tim kami meninjau lokasi atau sistem, lalu mengirim rencana kerja dan biaya.' },
  { title: 'Pengerjaan', text: 'Pekerjaan dilakukan bertahap dengan laporan progres.' },
  { title: 'Serah terima dan dukungan', text: 'Uji bersama, pelatihan, lalu dukungan purna jual.' },
]

const form = ref({ name: '', need: 'IT Support', message: '' })
const sendWhatsApp = () => {
  const text = `Halo ${company.name}, saya ${form.value.name || '(nama)'}. Saya butuh layanan ${form.value.need}. ${form.value.message}`
  window.open(`https://wa.me/${company.whatsapp}?text=${encodeURIComponent(text)}`, '_blank')
}
</script>

<template>
  <div class="page">
    <!-- Navbar -->
    <header class="navbar">
      <a href="#top" class="brand">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="#e8a317" />
          <path d="M16 9L22 12.5V19.5L16 23L10 19.5V12.5L16 9Z" fill="#0e1a2b" />
        </svg>
        <span>Ikibisnis</span>
      </a>
      <nav class="nav-links" :class="{ open: menuOpen }" aria-label="Navigasi utama">
        <a v-for="l in links" :key="l.href" :href="l.href" @click="menuOpen = false">{{ l.label }}</a>
        <button class="btn-login" @click="goToLogin">
          <LogIn :size="16" /> Portal karyawan
        </button>
      </nav>
      <button class="menu-toggle" :aria-label="menuOpen ? 'Tutup menu' : 'Buka menu'" @click="menuOpen = !menuOpen">
        <X v-if="menuOpen" :size="22" /><Menu v-else :size="22" />
      </button>
    </header>

    <main id="top">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-text">
          <p class="company">{{ company.name }}</p>
          <h1>Teknologi dan kelistrikan untuk industri yang tidak boleh berhenti.</h1>
          <p class="lead">
            Kami menangani IT support, pengembangan software, dan pekerjaan electrical industrial
            untuk perusahaan yang butuh operasional stabil dan mitra yang bisa dihubungi kapan saja.
          </p>
          <div class="hero-actions">
            <a href="#kontak" class="btn-primary">Konsultasi gratis <ArrowRight :size="18" /></a>
            <a href="#layanan" class="btn-ghost">Lihat layanan</a>
          </div>
        </div>

        <svg class="circuit" viewBox="0 0 440 400" role="img" aria-label="Diagram jalur sirkuit yang menghubungkan IT Support, Software Development, dan Electrical Industrial">
          <path class="trace" d="M60 70 H150 L190 110 V200 H270 L310 240 V320 H380" />
          <path class="trace-base" d="M60 70 H150 L190 110 V200 H270 L310 240 V320 H380" />
          <g class="node n1"><circle cx="60" cy="70" r="12" /><text x="80" y="48">IT Support</text></g>
          <g class="node n2"><circle cx="190" cy="200" r="12" /><text x="210" y="178">Software Development</text></g>
          <g class="node n3"><circle cx="380" cy="320" r="12" /><text x="380" y="352" text-anchor="end">Electrical Industrial</text></g>
        </svg>
      </section>

      <!-- Layanan -->
      <section id="layanan" class="section">
        <div class="section-head">
          <h2>Tiga bidang, satu tim yang bertanggung jawab</h2>
          <p>Pilih layanan yang Anda butuhkan atau gabungkan sesuai kebutuhan proyek.</p>
        </div>
        <div class="services">
          <article v-for="s in services" :key="s.id" class="service" :class="`svc-${s.id}`">
            <component :is="s.icon" :size="30" class="svc-icon" />
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
            <ul>
              <li v-for="i in s.items" :key="i"><Check :size="16" /> {{ i }}</li>
            </ul>
          </article>
        </div>
      </section>

      <!-- Keunggulan -->
      <section id="keunggulan" class="section dark">
        <div class="section-head">
          <h2>Mengapa perusahaan memilih kami</h2>
        </div>
        <div class="strengths">
          <div v-for="s in strengths" :key="s.title" class="strength">
            <component :is="s.icon" :size="24" />
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </div>
      </section>

      <!-- Proses -->
      <section id="proses" class="section">
        <div class="section-head">
          <h2>Cara kerja kami</h2>
          <p>Empat tahap yang sama untuk setiap proyek, besar maupun kecil.</p>
        </div>
        <ol class="steps">
          <li v-for="(s, i) in steps" :key="s.title">
            <span class="step-no">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </section>

      <!-- Kontak -->
      <section id="kontak" class="section contact">
        <div class="contact-info">
          <h2>Ceritakan kebutuhan Anda</h2>
          <p>Kirim pesan singkat. Tim kami akan membalas lewat WhatsApp untuk menjadwalkan konsultasi.</p>
          <ul>
            <li><MessageCircle :size="18" /> WhatsApp: +{{ company.whatsapp }}</li>
            <li><Mail :size="18" /> {{ company.email }}</li>
            <li><MapPin :size="18" /> {{ company.address }}</li>
          </ul>
        </div>
        <div class="form">
          <label>Nama
            <input v-model="form.name" type="text" placeholder="Nama Anda atau perusahaan" />
          </label>
          <label>Layanan yang dibutuhkan
            <select v-model="form.need">
              <option>IT Support</option>
              <option>Software Development</option>
              <option>Electrical Industrial</option>
              <option>Lebih dari satu layanan</option>
            </select>
          </label>
          <label>Pesan
            <textarea v-model="form.message" rows="4" placeholder="Jelaskan kendala atau rencana proyek Anda"></textarea>
          </label>
          <button class="btn-primary" @click="sendWhatsApp">Kirim lewat WhatsApp <ArrowRight :size="18" /></button>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>© {{ new Date().getFullYear() }} {{ company.name }}. Semua hak dilindungi.</span>
      <a href="#" @click.prevent="goToLogin">Portal karyawan</a>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Public+Sans:wght@400;500;600&display=swap');

.page {
  --navy: #0e1a2b;
  --navy-2: #16273d;
  --paper: #f3f5f7;
  --ink: #1b2636;
  --muted: #5b6878;
  --amber: #e8a317;
  --teal: #1fb5a8;
  --blue: #4f8cff;
  font-family: 'Public Sans', system-ui, sans-serif;
  color: var(--ink);
  background: var(--paper);
  scroll-behavior: smooth;
}
.page h1, .page h2, .page h3, .brand { font-family: 'Bricolage Grotesque', 'Public Sans', sans-serif; }
.page :focus-visible { outline: 3px solid var(--amber); outline-offset: 3px; }

/* Navbar */
.navbar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 48px; background: var(--navy); color: #fff;
}
.brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font-weight: 700; font-size: 20px; }
.nav-links { display: flex; align-items: center; gap: 28px; }
.nav-links a { color: #cbd5e1; text-decoration: none; font-size: 15px; font-weight: 500; }
.nav-links a:hover { color: #fff; }
.btn-login {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.3);
  padding: 9px 18px; border-radius: 6px; font: 600 14px 'Public Sans', sans-serif;
}
.btn-login:hover { background: rgba(255,255,255,.1); }
.menu-toggle { display: none; background: none; border: 0; color: #fff; cursor: pointer; }

/* Hero */
.hero {
  background: var(--navy); color: #fff;
  display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 48px;
  padding: 72px 48px 96px;
}
.company { color: var(--amber); font-weight: 600; margin: 0 0 16px; }
.hero h1 { font-size: clamp(34px, 4.6vw, 58px); line-height: 1.08; margin: 0 0 22px; font-weight: 800; letter-spacing: -0.02em; max-width: 16em; }
.lead { color: #b6c2d1; font-size: 18px; line-height: 1.65; max-width: 34em; margin: 0 0 34px; }
.hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 10px; cursor: pointer; text-decoration: none;
  background: var(--amber); color: var(--navy); border: 0; border-radius: 6px;
  padding: 14px 26px; font: 700 16px 'Public Sans', sans-serif;
}
.btn-primary:hover { background: #f2b330; }
.btn-ghost {
  display: inline-flex; align-items: center; text-decoration: none; color: #fff;
  border: 1px solid rgba(255,255,255,.3); border-radius: 6px; padding: 14px 26px; font-weight: 600;
}
.btn-ghost:hover { background: rgba(255,255,255,.08); }

/* Circuit (elemen utama yang diingat) */
.circuit { width: 100%; max-width: 480px; justify-self: center; }
.trace-base { fill: none; stroke: rgba(255,255,255,.12); stroke-width: 3; }
.trace {
  fill: none; stroke: var(--amber); stroke-width: 3; stroke-linejoin: round;
  stroke-dasharray: 700; stroke-dashoffset: 700;
  animation: draw 2.4s ease-out .3s forwards; z-index: 2;
}
.node circle { fill: var(--navy); stroke-width: 3; }
.node text { fill: #e2e8f0; font: 600 15px 'Public Sans', sans-serif; }
.n1 circle { stroke: var(--teal); }
.n2 circle { stroke: var(--blue); }
.n3 circle { stroke: var(--amber); }
@keyframes draw { to { stroke-dashoffset: 0; } }

/* Sections */
.section { padding: 88px 48px; max-width: 1240px; margin: 0 auto; }
.section.dark { max-width: none; background: var(--navy-2); color: #fff; }
.section.dark > * { max-width: 1144px; margin-left: auto; margin-right: auto; }
.section-head { margin-bottom: 44px; max-width: 40em; }
.section-head h2 { font-size: clamp(28px, 3.4vw, 40px); line-height: 1.15; margin: 0 0 12px; letter-spacing: -0.015em; }
.section-head p { margin: 0; color: var(--muted); font-size: 17px; line-height: 1.6; }

/* Layanan */
.services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.service { background: #fff; border-top: 5px solid var(--c); padding: 30px 28px 34px; border-radius: 4px 4px 12px 12px; }
.svc-it { --c: var(--teal); }
.svc-dev { --c: var(--blue); }
.svc-ele { --c: var(--amber); }
.svc-icon { color: var(--c); }
.service h3 { font-size: 24px; margin: 14px 0 8px; }
.service > p { color: var(--muted); line-height: 1.6; margin: 0 0 20px; }
.service ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.service li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.45; }
.service li svg { flex: none; margin-top: 2px; color: var(--c); }

/* Keunggulan */
.strengths { display: grid; grid-template-columns: repeat(2, 1fr); gap: 36px 56px; }
.strength svg { color: var(--amber); }
.strength h3 { font-size: 20px; margin: 10px 0 6px; }
.strength p { margin: 0; color: #b6c2d1; line-height: 1.65; }

/* Proses */
.steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; position: relative; }
.steps::before { content: ''; position: absolute; top: 19px; left: 20px; right: 20px; height: 2px; background: #cdd5de; }
.steps li { position: relative; }
.step-no {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: var(--navy); color: var(--amber); font: 700 17px 'Bricolage Grotesque', sans-serif; position: relative;
}
.steps h3 { font-size: 19px; margin: 16px 0 6px; }
.steps p { margin: 0; color: var(--muted); line-height: 1.55; font-size: 15px; }

/* Kontak */
.contact { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; border-top: 1px solid #d8dee6; }
.contact h2 { font-size: clamp(28px, 3.4vw, 40px); margin: 0 0 14px; line-height: 1.15; }
.contact-info > p { color: var(--muted); line-height: 1.65; font-size: 17px; margin: 0 0 26px; }
.contact-info ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.contact-info li { display: flex; gap: 12px; align-items: center; }
.contact-info svg { color: var(--amber); flex: none; }
.form { background: #fff; padding: 30px; border-radius: 12px; display: grid; gap: 18px; box-shadow: 0 1px 0 #d8dee6; }
.form label { display: grid; gap: 6px; font-weight: 600; font-size: 14px; }
.form input, .form select, .form textarea {
  font: 400 16px 'Public Sans', sans-serif; padding: 12px 14px; border: 1px solid #c6cfda; border-radius: 6px; background: #fff; color: var(--ink);
}
.form .btn-primary { justify-content: center; }

/* Footer */
.footer {
  background: var(--navy); color: #9fb0c3; font-size: 14px;
  display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 28px 48px;
}
.footer a { color: #cbd5e1; }

/* Responsif */
@media (max-width: 992px) {
  .hero { grid-template-columns: 1fr; padding: 56px 24px 72px; }
  .circuit { max-width: 400px; }
  .services { grid-template-columns: 1fr; }
  .steps { grid-template-columns: 1fr 1fr; }
  .steps::before { display: none; }
  .contact { grid-template-columns: 1fr; gap: 36px; }
}
@media (max-width: 768px) {
  .navbar { padding: 14px 24px; }
  .menu-toggle { display: block; }
  .nav-links {
    display: none; position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; align-items: flex-start; gap: 18px;
    background: var(--navy); padding: 20px 24px 28px; border-top: 1px solid rgba(255,255,255,.1);
  }
  .nav-links.open { display: flex; }
  .section { padding: 64px 24px; }
  .strengths { grid-template-columns: 1fr; }
  .steps { grid-template-columns: 1fr; }
  .footer { padding: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .trace { animation: none; stroke-dashoffset: 0; }
  .page { scroll-behavior: auto; }
}
</style>
