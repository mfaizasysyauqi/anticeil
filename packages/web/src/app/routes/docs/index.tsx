import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Code2,
  Cpu,
  CreditCard,
  FileText,
  Layers,
  Menu,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { FullLogo } from '@/components/custom/full-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DocSection {
  id: string;
  category: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export function DocsPage() {
  const [activeId, setActiveId] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const sections: DocSection[] = [
    {
      id: 'intro',
      category: 'Memulai (Getting Started)',
      title: 'Pengenalan Anticeil',
      icon: Rocket,
      content: (
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
              Dokumentasi Resmi Anticeil
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pengenalan Anticeil</h1>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Platform otomasi alur kerja (workflow automation) tanpa kode, integrasi agen kecerdasan buatan (AI Agents), dan orkestrasi alur kerja digital untuk tim modern dan kreator konten.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Visual Flow Builder</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Rancang dan jalankan otomasi dengan kanvas drag-and-drop interaktif. Hubungkan trigger webhook, aplikasi eksternal, dan aksi berantai tanpa perlu coding manual.
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Kecerdasan Buatan (AI Agents)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Bebaskan agen AI untuk membuat keputusan, mengolah data formulir, merangkum dokumen, dan berinteraksi melalui Model Context Protocol (MCP).
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Pembayaran Lokal Midtrans</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Terhubung langsung dengan gerbang pembayaran nasional Midtrans. Bayar langganan dengan QRIS, GoPay, Virtual Account Bank (BCA, Mandiri, BRI, BNI), atau Kartu Kredit.
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">100% Fleksibel & Mandiri (Self-Host)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Jalankan di server Oracle VM atau VPS Anda sendiri via Docker, dan hubungkan frontend di Cloudflare Workers/Pages dengan latensi ultra rendah.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-muted/40">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Langkah Selanjutnya</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveId('quickstart')}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                Mulai Panduan Cepat →
              </button>
              <button
                onClick={() => setActiveId('midtrans')}
                className="text-xs px-3 py-1.5 rounded-lg border bg-background font-medium hover:bg-muted"
              >
                Pelajari Paket & Midtrans
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quickstart',
      category: 'Memulai (Getting Started)',
      title: 'Panduan Cepat 5 Menit',
      icon: Terminal,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Panduan Cepat 5 Menit</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Mulai membuat otomasi pertama Anda dalam hitungan menit di platform Anticeil.
            </p>
          </div>

          <ol className="space-y-4">
            <li className="p-4 rounded-xl border bg-card space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
                Masuk ke Akun Anticeil
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Buka <a href="https://anticeil.com/sign-in" className="text-primary underline">anticeil.com/sign-in</a> dan masuk menggunakan email atau akun Google Anda.
              </p>
            </li>
            <li className="p-4 rounded-xl border bg-card space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
                Buat Alur Kerja Baru
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Klik tombol <strong>&quot;Mulai dari awal&quot;</strong> atau pilih dari katalog templat otomasi yang telah disediakan untuk kreator konten dan tim pemasaran.
              </p>
            </li>
            <li className="p-4 rounded-xl border bg-card space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
                Pilih Pemicu (Trigger) & Aksi (Action)
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Tentukan kejadian awal, seperti pesan masuk Telegram, formulir leads baru, atau jadwal waktu tertentu, kemudian tambahkan langkah berikutnya.
              </p>
            </li>
            <li className="p-4 rounded-xl border bg-card space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">4</span>
                Publikasikan Alur Kerja
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Tekan tombol <strong>Publikasikan</strong> di pojok kanan atas. Alur kerja Anda kini aktif 24/7 di cloud Anticeil!
              </p>
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'flows',
      category: 'Alur Kerja (Flows)',
      title: 'Membangun Alur Kerja & Trigger',
      icon: Layers,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Membangun Alur Kerja & Trigger</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Struktur alur kerja di Anticeil terdiri dari satu Pemicu (Trigger) dan serangkaian Tindakan (Actions).
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">1. Webhook Triggers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Menyediakan URL endpoint HTTPS unik yang dapat dipanggil dari aplikasi luar mana pun secara instan saat ada data baru masuk.
              </p>
              <div className="p-2.5 rounded-lg bg-muted text-[11px] font-mono text-muted-foreground">
                POST https://anticeil.com/api/v1/webhooks/YOUR_FLOW_WEBHOOK_ID
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">2. Polling Triggers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anticeil memeriksa aplikasi sumber secara otomatis pada interval reguler (misal: setiap 5 menit) untuk mencari baris spreadsheet baru, email masuk, dsb.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">3. Cabang Kondisi (Branching / If-Else)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gunakan blok kondisi untuk mengevaluasi data dan membagi alur kerja ke jalur yang berbeda berdasarkan logika bisnis Anda.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ai-agents',
      category: 'Kecerdasan Buatan (AI)',
      title: 'AI Agents & OpenRouter',
      icon: Cpu,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">AI Agents & OpenRouter</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Anticeil mengintegrasikan AI terdepan dengan dukungan model OpenRouter dan protokol MCP secara bawaan.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">Penyedia Model Default (Free Tier Ready)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anticeil telah dikonfigurasi dengan gateway AI OpenRouter sehingga Anda dapat langsung memanfaatkan model AI tanpa harus mengeluarkan biaya langganan AI terpisah.
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
                <li>Model Cepat: Pemrosesan teks ringkas, ekstraksi data formulir, penamaan variabel.</li>
                <li>Model Cerdas: Pemecahan masalah logika, pembuatan kode automasi, dan penalaran multi-langkah.</li>
                <li>Dukungan Kunci Kustom: Anda bebas memasukkan API Key OpenAI, Claude, atau OpenRouter pribadi kapan saja di Pengaturan.</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'midtrans',
      category: 'Pembayaran & Langganan',
      title: 'Integrasi Pembayaran Midtrans',
      icon: CreditCard,
      content: (
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              Terverifikasi & Resmi di Indonesia
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Integrasi Pembayaran Midtrans</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Panduan lengkap mengenai paket langganan Anticeil dan proses transaksi melalui payment gateway Midtrans.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">Metode Pembayaran yang Didukung</h3>
              <p className="text-xs text-muted-foreground">
                Pelanggan di Indonesia dapat menyelesaikan pembayaran dalam hitungan detik menggunakan saluran resmi Midtrans Snap:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 rounded-lg border text-center text-xs font-medium bg-muted/40">
                  QRIS (Semua Bank & E-Wallet)
                </div>
                <div className="p-2.5 rounded-lg border text-center text-xs font-medium bg-muted/40">
                  GoPay & ShopeePay
                </div>
                <div className="p-2.5 rounded-lg border text-center text-xs font-medium bg-muted/40">
                  Virtual Account (BCA, Mandiri, BRI, BNI)
                </div>
                <div className="p-2.5 rounded-lg border text-center text-xs font-medium bg-muted/40">
                  Kartu Kredit Visa / Mastercard
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">Alur Pembayaran & Aktivasi Otomatis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Saat Anda mengklik tombol <strong>Konfirmasi & Bayar</strong> pada halaman Billing:
              </p>
              <ol className="text-xs space-y-1.5 text-muted-foreground list-decimal pl-5">
                <li>Sistem Anticeil membuat token sesi transaksi Snap yang aman via API Midtrans.</li>
                <li>Layar pembayaran Midtrans Snap terbuka menampilkan rincian nominal dalam Rupiah (IDR).</li>
                <li>Setelah Anda menyelesaikan transfer atau memindai kode QRIS, Midtrans mengirimkan notifikasi webhook terenkripsi ke server Anticeil.</li>
                <li>Kuota kredit AI dan limit akun Anda otomatis ditingkatkan tanpa perlu konfirmasi manual!</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl border bg-muted/40 space-y-2 text-xs">
              <div className="font-semibold text-foreground">Dokumen Hukum & Legalitas Transaksi:</div>
              <p className="text-muted-foreground">
                Sebelum melakukan transaksi, Anda dapat meninjau{' '}
                <Link to="/terms" className="text-primary underline">Syarat & Ketentuan Layanan</Link> serta{' '}
                <Link to="/privacy" className="text-primary underline">Kebijakan Privasi</Link> resmi Kami.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'self-host',
      category: 'Deployment & Hosting',
      title: 'Self-Hosting via Docker & Cloudflare',
      icon: Server,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Self-Hosting via Docker & Cloudflare</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Arsitektur hibrida Anticeil memungkinkan backend dijalankan di VM/VPS dan frontend di Cloudflare Workers.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">1. Backend dengan Docker Compose</h3>
              <p className="text-xs text-muted-foreground">
                Jalankan service container app, worker, postgres, dan redis dengan satu perintah:
              </p>
              <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto">
{`# Jalankan Anticeil stack
docker compose up -d

# Periksa status kontainer
docker compose ps`}
              </pre>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">2. Frontend di Cloudflare Workers</h3>
              <p className="text-xs text-muted-foreground">
                Build frontend web dan deploy ke Cloudflare Workers dengan konfigurasi wrangler:
              </p>
              <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto">
{`# Build frontend
bun x turbo run build --filter=web

# Deploy ke Cloudflare Workers
cd packages/web
bunx wrangler deploy --config wrangler.jsonc`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api-reference',
      category: 'Pengembang (Developer)',
      title: 'REST API & Kunci Akses',
      icon: Code2,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">REST API & Kunci Akses</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Gunakan API Anticeil untuk memicu alur kerja, mengelola proyek, dan membaca riwayat eksekusi secara terprogram.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">Autentikasi Header</h3>
              <p className="text-xs text-muted-foreground">
                Sertakan API Key Anda dalam header HTTP Authorization:
              </p>
              <div className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground">
                Authorization: Bearer YOUR_ANTICEIL_API_KEY
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <h3 className="font-semibold text-sm">Contoh Memicu Flow via cURL</h3>
              <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto">
{`curl -X POST https://anticeil.com/api/v1/webhooks/FLOW_ID \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Halo dari API", "status": "active"}'`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeSection = sections.find((s) => s.id === activeId) || sections[0];

  // Group by category
  const categories = Array.from(new Set(sections.map((s) => s.category)));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg border hover:bg-muted"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <FullLogo />
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Dokumentasi
            </span>
          </div>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari dokumentasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/50 border-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/terms">
              <Button variant="ghost" size="sm" className="hidden lg:flex text-xs">
                Syarat & Ketentuan
              </Button>
            </Link>
            <Link to="/privacy">
              <Button variant="ghost" size="sm" className="hidden lg:flex text-xs">
                Kebijakan Privasi
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button size="sm" className="text-xs">
                Buka Aplikasi
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 flex">
        {/* Left Sidebar */}
        <aside
          className={`
            fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-background
            p-4 overflow-y-auto transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            left-0
          `}
        >
          <div className="sm:hidden mb-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari dokumentasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <nav className="space-y-6">
            {categories.map((category) => {
              const categoryItems = filteredSections.filter((s) => s.category === category);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category} className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {categoryItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.id === activeId;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveId(item.id);
                            setSidebarOpen(false);
                          }}
                          className={`
                            w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors
                            ${
                              isActive
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-8 pt-4 border-t space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Tautan Terkait
            </div>
            <Link
              to="/terms"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Syarat & Ketentuan</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Kebijakan Privasi</span>
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 py-8 md:px-8 max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dokumentasi</span>
            <ChevronRight className="w-3 h-3" />
            <span>{activeSection.category}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{activeSection.title}</span>
          </div>

          <div className="bg-card rounded-2xl border p-6 sm:p-8">
            {activeSection.content}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} Anticeil. Platform Otomasi & AI Terbuka (Lisensi MIT).
          </div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground underline">Syarat & Ketentuan</Link>
            <Link to="/privacy" className="hover:text-foreground underline">Kebijakan Privasi</Link>
            <Link to="/docs" className="hover:text-foreground underline">Dokumentasi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DocsPage;
