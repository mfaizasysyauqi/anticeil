import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { FullLogo } from '@/components/custom/full-logo';
import { Button } from '@/components/ui/button';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <FullLogo />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/privacy">
              <Button variant="ghost" size="sm">
                Kebijakan Privasi
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
            <FileText className="w-3.5 h-3.5" /> Dokumen Resmi Merchant
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Syarat dan Ketentuan Layanan (Terms of Service)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Terakhir diperbarui: Oktober 2026 • Berlaku efektif untuk seluruh pengguna platform Anticeil
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          {/* Ringkasan */}
          <div className="p-4 rounded-xl border bg-muted/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Ringkasan Utama: </span>
              Syarat dan Ketentuan ini mengatur penggunaan platform otomasi alur kerja dan AI Anticeil (<a href="https://anticeil.com" className="text-primary underline">anticeil.com</a>). Pembayaran tagihan langganan resmi diproses secara aman melalui gerbang pembayaran terlisensi <strong>Midtrans</strong> dalam mata uang Rupiah (IDR).
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              1. Definisi dan Identitas Penyelenggara
            </h2>
            <p>
              Platform <strong>Anticeil</strong> (&quot;Layanan&quot;, &quot;Kami&quot;) adalah platform otomasi alur kerja (workflow automation), integrasi aplikasi tanpa kode, dan orkestrasi agen AI yang disediakan melalui situs web resmi <strong>anticeil.com</strong>.
            </p>
            <p>
              Dengan mendaftar, mengakses, atau menggunakan Layanan, Pengguna (&quot;Anda&quot;) menyetujui untuk terikat secara hukum oleh Syarat dan Ketentuan ini serta Kebijakan Privasi Kami. Apabila Anda tidak menyetujui salah satu ketentuan, Anda dipersilakan untuk tidak menggunakan Layanan Kami.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              2. Ketentuan Akun dan Pendaftaran
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Pengguna wajib berusia sekurang-kurangnya 18 tahun atau memiliki persetujuan orang tua/wali yang sah menurut hukum Republik Indonesia.</li>
              <li>Pengguna wajib memberikan informasi identitas (nama, alamat email aktif) yang akurat dan terkini saat proses pendaftaran.</li>
              <li>Pengguna bertanggung jawab penuh atas keamanan kredensial akun, kata sandi, dan kunci API (API Key) miliknya.</li>
              <li>Satu akun hanya boleh digunakan oleh satu entitas atau tim sesuai kuota paket langganan yang dipilih.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              3. Paket Berlangganan, Harga, dan Mata Uang
            </h2>
            <p>
              Anticeil menyediakan pilihan paket langganan dengan harga resmi dalam satuan mata uang <strong>Rupiah (IDR)</strong> sebagai berikut:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-3 not-prose">
              <div className="p-4 rounded-xl border bg-card">
                <div className="font-bold text-base">Paket Free</div>
                <div className="text-2xl font-extrabold mt-1">Rp 0</div>
                <div className="text-xs text-muted-foreground">/ bulan</div>
                <ul className="mt-3 text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 1.000 kredit otomasi</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 1 Anggota tim</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Alur kerja standar</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl border-2 border-primary bg-card relative">
                <div className="font-bold text-base text-primary">Paket Plus</div>
                <div className="text-2xl font-extrabold mt-1">Rp 299.000</div>
                <div className="text-xs text-muted-foreground">/ bulan (atau Rp 2.990.000/thn)</div>
                <ul className="mt-3 text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 10.000 kredit otomasi</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 5 Anggota tim</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> AI Agents & Kustomisasi</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <div className="font-bold text-base">Paket Team</div>
                <div className="text-2xl font-extrabold mt-1">Rp 2.990.000</div>
                <div className="text-xs text-muted-foreground">/ bulan (atau Rp 29.900.000/thn)</div>
                <ul className="mt-3 text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 50.000 kredit otomasi</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 25 Anggota tim</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> SSO, Audit Log & Prioritas</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * Harga di atas belum termasuk Pajak Pertambahan Nilai (PPN) apabila diwajibkan oleh ketentuan perpajakan Republik Indonesia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              4. Metode Pembayaran & Verifikasi Midtrans
            </h2>
            <p>
              Semua transaksi pembayaran paket berbayar di Anticeil diproses secara langsung melalui mitra resmi Payment Gateway <strong>Midtrans (PT Midtrans)</strong> yang telah berizin dan diawasi oleh Bank Indonesia:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>QRIS & E-Wallet:</strong> GoPay, OVO, ShopeePay, DANA, LinkAja.</li>
              <li><strong>Virtual Account (Transfer Bank):</strong> BCA, Mandiri, BNI, BRI, Permata Bank, dan bank lainnya.</li>
              <li><strong>Kartu Kredit / Debit:</strong> Visa, MasterCard, JCB, American Express dengan autentikasi 3D Secure (3DS).</li>
            </ul>
            <p>
              Anticeil tidak pernah menyimpan data nomor kartu kredit atau informasi finansial sensitif Pengguna di server Kami. Seluruh pemrosesan pembayaran tunduk pada standar keamanan perbankan global PCI-DSS Level 1 yang dikelola oleh Midtrans.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              5. Kebijakan Pembatalan dan Pengembalian Dana (Cancellation & Refund Policy)
            </h2>
            <p>
              Kami mengutamakan kepuasan dan kepastian bagi setiap pelanggan Anticeil:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Pembatalan Langganan:</strong> Pengguna dapat membatalkan perpanjangan langganan kapan saja melalui menu Pengaturan Billing di akun Anticeil tanpa dikenakan biaya denda atau penalti pembatalan. Akses paket berbayar tetap aktif hingga akhir periode penagihan yang sedang berjalan.</li>
              <li><strong>Garansi Pengembalian Dana 7 Hari:</strong> Pengguna paket berbayar baru berhak mengajukan permohonan pengembalian dana (refund) penuh dalam kurun waktu <strong>7 (tujuh) hari kalender</strong> sejak tanggal transaksi pertama jika mengalami kendala teknis layanan yang tidak dapat diselesaikan oleh tim dukungan Kami.</li>
              <li><strong>Prosedur Klaim Refund:</strong> Untuk mengajukan pengembalian dana, kirimkan email ke <a href="mailto:support@anticeil.com" className="text-primary underline">support@anticeil.com</a> dengan menyertakan Nomor Pesanan (Order ID) dari bukti transaksi Midtrans dan alasan pengajuan. Pengembalian akan diproses dalam waktu 3-7 hari kerja melalui metode pembayaran awal.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              6. Kepemilikan Data dan Hak Kekayaan Intelektual
            </h2>
            <p>
              Seluruh data bisnis, kredensial integrasi, konfigurasi alur kerja (flows), dan konten yang Anda buat pada platform Anticeil tetap merupakan hak milik penuh Anda. Kami tidak mengklaim kepemilikan apapun atas data Anda.
            </p>
            <p>
              Merek dagang, logo Anticeil, desain antarmuka, dan kode sumber dasar perangkat lunak dilindungi oleh hukum hak cipta dan lisensi perangkat lunak yang berlaku.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              7. Ketersediaan Layanan (Service Availability) & Batasan Tanggung Jawab
            </h2>
            <p>
              Kami berkomitmen untuk menyediakan uptime layanan hingga 99,9%. Namun, Layanan disediakan dengan basis &quot;sebagaimana adanya&quot; (as is) tanpa jaminan mutlak atas ketiadaan gangguan akibat kegagalan pihak ketiga (seperti penyedia API pihak ketiga, jaringan internet global, atau pemadaman cloud provider).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              8. Hukum yang Berlaku dan Penyelesaian Sengketa
            </h2>
            <p>
              Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan yang timbul akan diupayakan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat, atau melalui yurisdiksi Pengadilan Negeri di Indonesia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b pb-2">
              9. Informasi Kontak Dukungan Pelanggan
            </h2>
            <p>
              Apabila Anda memiliki pertanyaan, klarifikasi, atau memerlukan bantuan terkait Syarat dan Ketentuan Layanan maupun transaksi Midtrans, silakan hubungi Kami:
            </p>
            <div className="p-4 rounded-xl border bg-muted/20 text-xs sm:text-sm space-y-1">
              <div><strong>Layanan Pelanggan Anticeil:</strong></div>
              <div>Email: <a href="mailto:support@anticeil.com" className="text-primary underline">support@anticeil.com</a> / <a href="mailto:billing@anticeil.com" className="text-primary underline">billing@anticeil.com</a></div>
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

export default TermsPage;
