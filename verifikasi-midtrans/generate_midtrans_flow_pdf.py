import os
import base64
import subprocess

DIR = r"D:\portofolio\anticeil\anticeil\verifikasi-midtrans"
OUTPUT_HTML = os.path.join(DIR, "Dokumen-Alur-Transaksi-Midtrans-Anticeil.html")
OUTPUT_PDF = os.path.join(DIR, "Dokumen-Alur-Transaksi-Midtrans-Anticeil.pdf")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

files = [
    ("1. klik tombol tagihan.png", "Langkah 1: Akses Menu Tagihan / Billing", "Pengguna masuk ke dashboard aplikasi Anticeil (anticeil.com) lalu menavigasi ke menu 'Tagihan' (Billing) pada panel navigasi kiri bawah untuk mengelola langganan akun."),
    ("2. klik tombol tingkatkan.png", "Langkah 2: Membuka Opsi Peningkatan Paket", "Pada halaman 'Penagihan & Langganan', sistem menampilkan informasi paket aktif (Paket Gratis). Pengguna mengklik tombol 'Tingkatkan' untuk melihat katalog paket berbayar."),
    ("3. pilih paket.png", "Langkah 3: Pemilihan Paket Langganan & Harga", "Sistem menampilkan dialog 'Jelajahi Paket' yang memuat spesifikasi kuota alur kerja, AI credits, dan harga resmi dalam IDR. Pengguna memilih paket 'Plus' (Rp 299.000/bln) dan menekan tombol 'Beli Sekarang'."),
    ("4. pilih pembayaran.png", "Langkah 4: Antarmuka Midtrans Snap Checkout", "Antarmuka resmi Midtrans Snap Checkout terbuka secara aman dalam bentuk popup modal. Sistem menampilkan nama merchant (Anticeil), nomor unik Order ID (contoh: #AC-ocEsv6o3-plus-1792063983139), rincian tagihan (Rp 299.000), serta daftar kanal pembayaran resmi. Pengguna memilih metode pembayaran yang diinginkan (contoh: DANA)."),
    ("5. masukan pin dan confirm.png", "Langkah 5: Otorisasi & Penyelesaian Pembayaran", "Pengguna dialihkan ke halaman otorisasi pembayaran Midtrans yang aman. Pengguna memasukkan nomor PIN transaksi pada simulator/aplikasi pembayaran e-wallet dan menekan tombol 'Confirm' untuk menyelesaikan pelunasan."),
    ("6. selesai pembayaran dan tunggu halaman berubah.png", "Langkah 6: Konfirmasi Pembayaran Berhasil & Paket Aktif", "Setelah pembayaran terkonfirmasi lunas oleh sistem Midtrans (settlement/capture), sistem otomatis mengarahkan pengguna kembali ke aplikasi Anticeil dengan status 'Berhasil Ditingkatkan!' (Subscription updated Berhasil) dan kuota paket Plus langsung aktif secara instan.")
]

def encode_img(filename):
    path = os.path.join(DIR, filename)
    with open(path, "rb") as f:
        data = f.read()
    return f"data:image/png;base64,{base64.b64encode(data).decode('utf-8')}"

encoded = []
for fname, title, desc in files:
    encoded.append({
        "title": title,
        "desc": desc,
        "data": encode_img(fname)
    })

html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Dokumen Alur Transaksi & Checkout Midtrans - Anticeil</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 14mm 16mm 16mm 16mm;
    @bottom-center {{
      content: "Dokumen Alur Pembayaran Midtrans - Anticeil (anticeil.com) | Halaman " counter(page);
      font-size: 8pt;
      color: #64748b;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }}
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background-color: #ffffff;
    font-size: 9.5pt;
    line-height: 1.5;
  }}

  .header {{
    border-bottom: 2px solid #0d9488;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }}

  .header-left {{
    max-width: 65%;
  }}

  .brand {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }}

  .brand-logo {{
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14pt;
  }}

  .brand-title {{
    font-size: 16pt;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: -0.5px;
  }}

  .doc-subtitle {{
    font-size: 11pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 2px;
  }}

  .doc-purpose {{
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 2px;
  }}

  .header-right {{
    text-align: right;
    font-size: 8pt;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
  }}

  .header-right strong {{
    color: #0f172a;
  }}

  .info-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }}

  .info-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 8.5pt;
  }}

  .info-card h4 {{
    font-size: 9pt;
    font-weight: 700;
    color: #0f766e;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .info-table {{
    width: 100%;
    border-collapse: collapse;
  }}

  .info-table td {{
    padding: 2px 0;
    vertical-align: top;
  }}

  .info-table td.label {{
    color: #64748b;
    width: 38%;
  }}

  .info-table td.value {{
    color: #0f172a;
    font-weight: 600;
  }}

  .pricing-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 8.5pt;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }}

  .pricing-table th {{
    background: #f1f5f9;
    color: #334155;
    text-align: left;
    padding: 6px 10px;
    font-weight: 700;
    border-bottom: 1px solid #cbd5e1;
    font-size: 8pt;
    text-transform: uppercase;
  }}

  .pricing-table td {{
    padding: 6px 10px;
    border-bottom: 1px solid #f1f5f9;
  }}

  .pricing-table tr.highlight {{
    background: #f0fdfa;
    font-weight: 600;
  }}

  .pricing-table tr.highlight td {{
    color: #0f766e;
  }}

  .badge-plus {{
    display: inline-block;
    background: #0d9488;
    color: white;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
  }}

  .section-title {{
    font-size: 11pt;
    font-weight: 700;
    color: #0f766e;
    border-left: 4px solid #0d9488;
    padding-left: 8px;
    margin: 14px 0 8px 0;
  }}

  .step-container {{
    page-break-inside: avoid;
    margin-bottom: 18px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }}

  .step-header {{
    background: #f8fafc;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}

  .step-number {{
    background: #0d9488;
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }}

  .step-title {{
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    flex-grow: 1;
    margin-left: 10px;
  }}

  .step-body {{
    padding: 10px 12px;
  }}

  .step-desc {{
    font-size: 8.5pt;
    color: #334155;
    margin-bottom: 8px;
    line-height: 1.45;
  }}

  .img-wrapper {{
    text-align: center;
    background: #0f172a;
    padding: 6px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
  }}

  .step-img {{
    width: 100%;
    max-height: 290px;
    object-fit: contain;
    border-radius: 4px;
    display: block;
    margin: 0 auto;
  }}

  .page-break {{
    page-break-before: always;
  }}

  .footer-note {{
    margin-top: 14px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 8pt;
    color: #475569;
    line-height: 1.45;
  }}

  .footer-note strong {{
    color: #0f172a;
  }}
</style>
</head>
<body>

  <!-- HEADER DOKUMEN -->
  <div class="header">
    <div class="header-left">
      <div class="brand">
        <div class="brand-logo">A</div>
        <div class="brand-title">Anticeil</div>
      </div>
      <div class="doc-subtitle">Dokumen Alur Transaksi & Checkout Midtrans (SOP)</div>
      <div class="doc-purpose">Lampiran Dokumen Resmi untuk Pengajuan Verifikasi & Aktivasi Production API Key Midtrans</div>
    </div>
    <div class="header-right">
      <div><strong>Tanggal:</strong> 15 Oktober 2026</div>
      <div><strong>Merchant ID:</strong> Anticeil Official</div>
      <div><strong>Status:</strong> Siap Produksi (Ready for Production)</div>
      <div><strong>Domain:</strong> https://anticeil.com</div>
    </div>
  </div>

  <!-- INFORMASI MERCHANT & GATEWAY -->
  <div class="info-grid">
    <div class="info-card">
      <h4>Profil Usaha / Merchant</h4>
      <table class="info-table">
        <tr>
          <td class="label">Nama Layanan:</td>
          <td class="value">Anticeil Platform Otomasi AI</td>
        </tr>
        <tr>
          <td class="label">Website Resmi:</td>
          <td class="value">https://anticeil.com</td>
        </tr>
        <tr>
          <td class="label">Model Bisnis:</td>
          <td class="value">SaaS Berlangganan (Monthly/Annual)</td>
        </tr>
        <tr>
          <td class="label">Email Resmi:</td>
          <td class="value">anticeil.official@gmail.com</td>
        </tr>
        <tr>
          <td class="label">Mata Uang:</td>
          <td class="value">Indonesian Rupiah (IDR / Rp)</td>
        </tr>
      </table>
    </div>

    <div class="info-card">
      <h4>Integrasi Gateway Midtrans</h4>
      <table class="info-table">
        <tr>
          <td class="label">Metode Integrasi:</td>
          <td class="value">Midtrans Snap.js (Popup & Redirect)</td>
        </tr>
        <tr>
          <td class="label">Endpoint Token:</td>
          <td class="value">/api/v1/platform-billing/midtrans-token</td>
        </tr>
        <tr>
          <td class="label">Webhook URL:</td>
          <td class="value">https://anticeil.com/api/v1/platform-billing/midtrans-notification</td>
        </tr>
        <tr>
          <td class="label">Verifikasi Otomatis:</td>
          <td class="value">Midtrans Core API Status Verification v2</td>
        </tr>
        <tr>
          <td class="label">Keamanan:</td>
          <td class="value">PCI-DSS Level 1 & TLS 1.3 Terenkripsi</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- TABEL PRODUK & HARGA -->
  <div class="section-title">Katalog Produk & Paket Langganan Resmi</div>
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Paket</th>
        <th>Harga (IDR)</th>
        <th>Periode</th>
        <th>Fitur Utama</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Gratis (Free)</strong></td>
        <td>Rp 0</td>
        <td>Bulan</td>
        <td>1 Kursi, 5 Alur Otomasi, 1.000 AI Credits/bln</td>
      </tr>
      <tr class="highlight">
        <td><span class="badge-plus">Plus</span> <strong>(Contoh Transaksi)</strong></td>
        <td><strong>Rp 299.000</strong></td>
        <td>Bulan</td>
        <td>5 Kursi, 100 Alur Otomasi, 10.000 AI Credits/bln, Custom Branding</td>
      </tr>
      <tr>
        <td><strong>Tim (Team)</strong></td>
        <td>Rp 2.990.000</td>
        <td>Bulan</td>
        <td>25 Kursi, Unlimited Flows, 50.000 AI Credits/bln, SSO, Audit Logs, Priority Queue</td>
      </tr>
      <tr>
        <td><strong>Enterprise</strong></td>
        <td>Kustom (Sesuai Kebutuhan)</td>
        <td>Kustom</td>
        <td>Dedicated Infrastructure, SLA VIP 24/7, Custom Invoicing</td>
      </tr>
    </tbody>
  </table>

  <!-- KANAL PEMBAYARAN -->
  <div class="section-title">Kanal Pembayaran yang Didukung (Midtrans)</div>
  <div style="font-size: 8.5pt; color: #475569; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px;">
    <strong>Metode Pembayaran Resmi:</strong> QRIS (Semua E-Wallet / Mobile Banking), GoPay, DANA, ShopeePay, OVO, Virtual Account (BCA, Mandiri, BNI, BRI, Permata), Kartu Kredit/Debit (Visa, Mastercard, JCB), serta Gerai Ritel (Indomaret, Alfamart).
  </div>

  <!-- LANGKAH 1 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 1</span>
      <span class="step-title">{encoded[0]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[0]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[0]['data']}" alt="Langkah 1">
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- LANGKAH 2 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 2</span>
      <span class="step-title">{encoded[1]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[1]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[1]['data']}" alt="Langkah 2">
      </div>
    </div>
  </div>

  <!-- LANGKAH 3 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 3</span>
      <span class="step-title">{encoded[2]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[2]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[2]['data']}" alt="Langkah 3">
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- LANGKAH 4 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 4</span>
      <span class="step-title">{encoded[3]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[3]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[3]['data']}" alt="Langkah 4">
      </div>
    </div>
  </div>

  <!-- LANGKAH 5 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 5</span>
      <span class="step-title">{encoded[4]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[4]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[4]['data']}" alt="Langkah 5">
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- LANGKAH 6 -->
  <div class="step-container">
    <div class="step-header">
      <span class="step-number">Langkah 6</span>
      <span class="step-title">{encoded[5]['title']}</span>
    </div>
    <div class="step-body">
      <div class="step-desc">{encoded[5]['desc']}</div>
      <div class="img-wrapper">
        <img class="step-img" src="{encoded[5]['data']}" alt="Langkah 6">
      </div>
    </div>
  </div>

  <!-- LEGALITAS & KEPATUHAN -->
  <div class="footer-note">
    <h4 style="font-size: 8.5pt; font-weight: 700; color: #0f766e; margin-bottom: 4px;">Pernyataan Kepatuhan Merchant & Perlindungan Konsumen:</h4>
    <p>1. <strong>Keamanan Data Pembayaran:</strong> Anticeil tidak menyimpan data nomor kartu kredit atau informasi finansial sensitif pengguna pada server lokal. Seluruh transaksi dialihkan secara aman menggunakan enkripsi TLS 1.3 dan diproses di bawah standar keamanan perbankan internasional <strong>PCI-DSS Level 1</strong> yang dikelola oleh Midtrans (PT Midtrans).</p>
    <p style="margin-top: 4px;">2. <strong>Kebijakan Pengembalian Dana (Refund Policy):</strong> Pengguna dapat mengajukan pengembalian dana dalam waktu 7 hari kerja dengan melampirkan Nomor Order ID resmi Midtrans melalui email <strong>anticeil.official@gmail.com</strong>.</p>
    <p style="margin-top: 4px;">3. <strong>Dokumentasi Legalitas:</strong> Dokumen Syarat & Ketentuan Layanan (Terms of Service) dan Kebijakan Privasi (Privacy Policy) dapat diakses secara publik pada URL resmi: <a href="https://anticeil.com/docs/legal/terms" style="color: #0d9488; text-decoration: none;">https://anticeil.com/docs/legal/terms</a> dan <a href="https://anticeil.com/docs/legal/privacy" style="color: #0d9488; text-decoration: none;">https://anticeil.com/docs/legal/privacy</a>.</p>
  </div>

</body>
</html>
"""

with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at: {OUTPUT_HTML} ({len(html_content)} bytes)")

cmd = [
    CHROME,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={OUTPUT_PDF}",
    OUTPUT_HTML
]

res = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(OUTPUT_PDF):
    print(f"SUCCESS: PDF created at {OUTPUT_PDF} ({os.path.getsize(OUTPUT_PDF)} bytes)")
else:
    print(f"FAILED: {res.stderr}")
