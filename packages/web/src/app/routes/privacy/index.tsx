import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, EyeOff, Server, UserCheck } from 'lucide-react';
import { FullLogo } from '@/components/custom/full-logo';
import { Button } from '@/components/ui/button';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <FullLogo />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/terms">
              <Button variant="ghost" size="sm">
                Syarat & Ketentuan
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="ghost" size="sm">
                Dokumentasi
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button size="sm">
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Kepatuhan UU PDP No. 27 Tahun 2022
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Kebijakan Privasi (Privacy Policy)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Terakhir diperbarui: Oktober 2026 • Standar keamanan data pengguna platform Anticeil
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          {/* Ringkasan */}
          <div className="p-4 rounded-xl border bg-muted/40 flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Komitmen Privasi Kami: </span>
              Anticeil menghormati dan melindungi data pribadi seluruh pengguna. Dokumen ini menjelaskan bagaimana Kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP). Seluruh data transaksi pembayaran diproses melalui saluran terenkripsi PCI-DSS oleh <strong>Midtrans</strong>.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              1. Informasi yang Kami Kumpulkan
            </h2>
            <p>
              Kami mengumpulkan informasi yang diperlukan untuk mengoperasikan Layanan secara aman dan efektif:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2 not-prose">
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-primary" /> Data Akun Pengguna
                </div>
                <p className="text-xs text-muted-foreground">
                  Nama lengkap, alamat email, foto profil (opsional), dan kata sandi yang telah dienkripsi menggunakan algoritma hashing satu arah yang aman.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-primary" /> Data Alur Kerja & Eksekusi
                </div>
                <p className="text-xs text-muted-foreground">
                  Konfigurasi flow, nama project, trigger webhook, dan parameter otomasi yang Anda buat untuk menjalankan integrasi.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <EyeOff className="w-4 h-4 text-primary" /> Kunci API & Kredensial
                </div>
                <p className="text-xs text-muted-foreground">
                  Token koneksi OAuth dan API Key pihak ketiga disimpan dalam database terenkripsi kuat menggunakan AES-256-GCM.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-primary" /> Data Transaksi Pembayaran
                </div>
                <p className="text-xs text-muted-foreground">
                  Status pesanan, ID transaksi, jenis paket yang dibeli, dan waktu pembayaran yang diteruskan melalui Midtrans.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              2. Pemrosesan Data Pembayaran oleh Midtrans
            </h2>
            <p>
              Untuk menjaga standar keamanan tertinggi, <strong>Anticeil tidak pernah menyimpan, mencatat, atau mengakses data kartu kredit</strong> (seperti 16 digit nomor kartu, tanggal kedaluwarsa, atau kode CVV/CVC) maupun kata sandi perbankan Anda pada infrastruktur Kami.
            </p>
            <p>
              Ketika Anda melakukan pembelian atau perpanjangan langganan paket:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Transaksi diarahkan secara aman ke antarmuka <strong>Midtrans Snap</strong> melalui koneksi HTTPS/TLS 1.3 terenkripsi.</li>
              <li>Midtrans memproses autentikasi pembayaran langsung ke jaringan bank terkait dan penerbit kartu sesuai standar internasional <strong>PCI-DSS (Payment Card Industry Data Security Standard) Level 1</strong>.</li>
              <li>Anticeil hanya menerima pemberitahuan status transaksi (berhasil, tertunda, atau gagal) beserta Nomor Transaksi (Order ID) dari webhook Midtrans untuk mengaktifkan kuota paket Anda secara otomatis.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              3. Tujuan Penggunaan Informasi
            </h2>
            <p>Informasi yang Kami peroleh digunakan semata-mata untuk:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Menyediakan, memelihara, dan meningkatkan fungsi platform Anticeil.</li>
              <li>Mengeksekusi alur kerja otomasi dan interaksi agen AI sesuai instruksi Anda.</li>
              <li>Mengirimkan informasi penting seperti notifikasi status flow, konfirmasi aktivasi paket, dan faktur penagihan.</li>
              <li>Mencegah aktivitas penyalahgunaan, akses ilegal, atau serangan siber terhadap akun dan infrastruktur.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              4. Perlindungan dan Penyimpanan Data
            </h2>
            <p>
              Keamanan data Anda adalah prioritas utama Kami. Kami menerapkan langkah-langkah perlindungan teknis dan organisasi yang ketat:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Enkripsi Dalam Transit:</strong> Seluruh komunikasi antara browser Anda dan server Kami dienkripsi menggunakan protokol TLS/HTTPS.</li>
              <li><strong>Enkripsi Saat Istirahat (At Rest):</strong> Seluruh kredensial rahasia disimpan dalam bentuk terenkripsi menggunakan kunci enkripsi server independen (AES-256).</li>
              <li><strong>Isolasi Eksekusi:</strong> Kode otomasi dan flow pengguna dijalankan dalam lingkungan eksekusi terisolasi (sandbox) untuk mencegah kebocoran antar akun.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              5. Pembagian Data ke Pihak Ketiga
            </h2>
            <p>
              Kami tidak menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak mana pun untuk keperluan periklanan. Data hanya dibagikan ke pihak ketiga dalam kondisi berikut:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Mitra Pembayaran Resmi:</strong> Midtrans untuk tujuan verifikasi dan pemrosesan transaksi pembayaran langganan.</li>
              <li><strong>Penyedia Layanan yang Anda Hubungkan:</strong> Aplikasi eksternal (seperti Google Workspace, Telegram, OpenAI, Slack) hanya menerima data yang secara spesifik Anda konfigurasikan dalam alur kerja otomasi Anda.</li>
              <li><strong>Kewajiban Hukum:</strong> Apabila diwajibkan oleh perintah pengadilan atau otoritas penegak hukum Republik Indonesia yang sah.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              6. Hak-Hak Pengguna (Subjek Data)
            </h2>
            <p>
              Berdasarkan UU Perlindungan Data Pribadi (UU PDP), Anda berhak untuk:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Mengakses dan memperoleh salinan data pribadi yang Kami simpan.</li>
              <li>Memperbarui atau memperbaiki data pribadi yang tidak akurat melalui menu Pengaturan Profil.</li>
              <li>Meminta penghapusan permanen akun beserta seluruh data konfigurasi flow dan riwayat eksekusi.</li>
              <li>Mencabut izin koneksi pihak ketiga kapan saja melalui menu Koneksi di antarmuka Anticeil.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              7. Kontak Pengaduan & Perlindungan Data
            </h2>
            <p>
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau ingin mengajukan hak terkait data pribadi Anda, silakan hubungi Tim Privasi Kami:
            </p>
            <div className="p-4 rounded-xl border bg-muted/20 text-xs sm:text-sm space-y-1">
              <div><strong>Tim Privasi & Keamanan Anticeil:</strong></div>
              <div>Email: <a href="mailto:privacy@anticeil.com" className="text-primary underline">privacy@anticeil.com</a> / <a href="mailto:support@anticeil.com" className="text-primary underline">support@anticeil.com</a></div>
              <div>Situs Web: <a href="https://anticeil.com" className="text-primary underline">https://anticeil.com</a></div>
              <div>Lokasi: Jakarta, Republik Indonesia</div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} Anticeil. Hak cipta dilindungi undang-undang.
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

export default PrivacyPage;
