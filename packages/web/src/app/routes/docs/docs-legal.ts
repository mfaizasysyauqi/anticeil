export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export interface LegalPageData {
  slug: string;
  tab: string;
  group: string;
  title: string;
  sidebarTitle: string;
  description: string;
  icon?: string;
  body: string;
  toc: TocItem[];
}

export const LEGAL_PAGES_EN: Record<string, LegalPageData> = {
  'legal/terms': {
    slug: 'legal/terms',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Terms of Service',
    sidebarTitle: 'Terms of Service',
    description: 'Official Terms of Service for using the Anticeil platform and Midtrans payment processing',
    icon: 'shield',
    body: `These Terms of Service govern the use of the Anticeil workflow automation and AI platform ([anticeil.com](https://anticeil.com)). Official subscription billing payments are securely processed through the licensed payment gateway **Midtrans** in Indonesian Rupiah (IDR).

<Info>
**Official Merchant Document:** Effective for all users of the Anticeil platform. Last updated: October 2026.
</Info>

## 1. Definition and Organizer Identity

The **Anticeil** platform ("Service", "We", "Us") is a workflow automation, no-code application integration, and AI agent orchestration platform provided through the official website **anticeil.com**.

By registering, accessing, or using the Service, the User ("You") agrees to be legally bound by these Terms of Service and our Privacy Policy. If you do not agree to any of these terms, please do not use our Service.

## 2. Account Terms and Registration

- Users must be at least 18 years old or have valid consent from a parent or legal guardian under applicable laws.
- Users must provide accurate, current, and complete identification details (name, active email address) during registration.
- Users are fully responsible for the confidentiality and security of their account credentials, passwords, and API Keys.
- An account may only be used by one entity or team according to the subscribed plan quota.

## 3. Subscription Plans, Pricing, and Currency

Anticeil provides subscription tiers priced officially in **Indonesian Rupiah (IDR)**:

| Plan | Monthly Price | Annual Price | Key Features |
|---|---|---|---|
| **Free** | Rp 0 | Rp 0 | 1,000 automation credits, 1 team member, standard workflows |
| **Plus** | Rp 299,000 | Rp 2,990,000 / yr | 10,000 automation credits, 5 team members, AI Agents & customization |
| **Team** | Rp 2,990,000 | Rp 29,900,000 / yr | 50,000 automation credits, 25 team members, SSO, Audit Logs & Priority |

*Prices above do not include Value Added Tax (VAT) if required by taxation authorities.*

## 4. Payment Methods & Midtrans Verification

All paid plan transactions on Anticeil are processed directly through the official Payment Gateway partner **Midtrans (PT Midtrans)**, licensed and supervised by Bank Indonesia:

- **QRIS & E-Wallet:** GoPay, OVO, ShopeePay, DANA, LinkAja.
- **Virtual Account (Bank Transfer):** BCA, Mandiri, BNI, BRI, Permata Bank, and other major banks.
- **Credit / Debit Cards:** Visa, MasterCard, JCB, American Express with 3D Secure (3DS) authentication.

Anticeil never stores credit card numbers or sensitive financial details on our servers. All payment processing complies with global banking security standard PCI-DSS Level 1 managed by Midtrans.

## 5. Cancellation Policy and Refund Guarantee

We prioritize satisfaction and clarity for every Anticeil customer:

- **Subscription Cancellation:** Users may cancel automatic renewals anytime via the Billing Settings in their Anticeil account without cancellation fees or penalties. Paid access remains active until the end of the current billing cycle.
- **7-Day Money-Back Guarantee:** New paid plan users are entitled to request a full refund within **7 (seven) calendar days** from the initial transaction date if experiencing technical service issues that cannot be resolved by our support team.
- **Refund Claim Procedure:** To request a refund, email [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com) with the Order ID from your Midtrans receipt and reason for request. Refunds are processed within 3-7 business days via the original payment method.

## 6. Data Ownership and Intellectual Property

All business data, integration credentials, workflow configurations, and content created by you on Anticeil remain your exclusive property. We claim no ownership over your data.

Anticeil trademarks, logos, user interface design, and underlying software source code are protected by applicable copyright and software license laws.

## 7. Service Availability & Limitation of Liability

We are committed to providing up to 99.9% service uptime. However, the Service is provided on an "as is" and "as available" basis without absolute warranty against downtime caused by third-party failures (e.g., third-party API providers, global internet outages, or cloud provider disruptions).

## 8. Governing Law and Dispute Resolution

These Terms of Service are governed by and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising shall first be attempted to be resolved amicably through consensus, or under the jurisdiction of the District Court in Indonesia.

## 9. Customer Support Contact Information

If you have questions, clarifications, or need assistance regarding these Terms of Service or Midtrans transactions, please contact us:

- **Customer Support Email:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Official Website:** [https://anticeil.com](https://anticeil.com)
- **Office Location:** Jakarta, Republic of Indonesia`,
    toc: [
      { id: '1-definition-and-organizer-identity', title: '1. Definition and Organizer Identity', level: 2 },
      { id: '2-account-terms-and-registration', title: '2. Account Terms and Registration', level: 2 },
      { id: '3-subscription-plans-pricing-and-currency', title: '3. Subscription Plans, Pricing, and Currency', level: 2 },
      { id: '4-payment-methods-midtrans-verification', title: '4. Payment Methods & Midtrans Verification', level: 2 },
      { id: '5-cancellation-policy-and-refund-guarantee', title: '5. Cancellation Policy and Refund Guarantee', level: 2 },
      { id: '6-data-ownership-and-intellectual-property', title: '6. Data Ownership and Intellectual Property', level: 2 },
      { id: '7-service-availability-limitation-of-liability', title: '7. Service Availability & Limitation of Liability', level: 2 },
      { id: '8-governing-law-and-dispute-resolution', title: '8. Governing Law and Dispute Resolution', level: 2 },
      { id: '9-customer-support-contact-information', title: '9. Customer Support Contact Information', level: 2 },
    ],
  },
  'legal/privacy': {
    slug: 'legal/privacy',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Privacy Policy',
    sidebarTitle: 'Privacy Policy',
    description: 'Official privacy policy and user personal data protection standards for the Anticeil platform',
    icon: 'lock',
    body: `Anticeil respects and protects the personal data of all users. This document explains how we collect, use, store, and protect your information in accordance with personal data protection regulations. All payment transactions are processed over PCI-DSS encrypted channels by **Midtrans**.

<Info>
**Official Privacy Standard:** Standards for privacy protection and data security for users of the Anticeil platform. Last updated: October 2026.
</Info>

## 1. Information We Collect

We collect information necessary to operate the Service safely and effectively:

- **User Account Data:** Full name, email address, profile picture (optional), and passwords hashed using secure one-way algorithms.
- **Workflow & Execution Data:** Flow configurations, project names, webhook triggers, and automation parameters created to run integrations.
- **API Keys & Credentials:** OAuth tokens and third-party API Keys stored in strong encrypted databases using AES-256-GCM.
- **Payment Transaction Data:** Order status, transaction IDs, purchased plan tier, and payment timestamps forwarded by Midtrans.

## 2. Payment Data Processing by Midtrans

To maintain the highest security standards, **Anticeil never stores, logs, or accesses credit card numbers** (such as 16-digit card numbers, expiration dates, or CVV/CVC codes) or banking credentials on our infrastructure.

When you purchase or renew a subscription:
- Transactions are securely redirected to the **Midtrans Snap** interface over encrypted HTTPS/TLS 1.3 connections.
- Midtrans processes payment authentication directly with relevant banks and card issuers under international **PCI-DSS Level 1** compliance.
- Anticeil only receives transaction status notifications (success, pending, or failed) along with the Order ID via Midtrans webhooks to automatically activate your plan quota.

## 3. Purpose of Using Information

Information obtained is used strictly to:
- Provide, maintain, and enhance Anticeil platform features.
- Execute workflow automations and AI agent interactions per your instructions.
- Send critical communications such as flow status notifications, plan activation confirmations, and billing receipts.
- Prevent fraudulent activity, unauthorized access, or cyber attacks against accounts and infrastructure.

## 4. Data Protection and Storage

Security of your data is our top priority. We implement strict technical and organizational safeguards:
- **Encryption in Transit:** All communications between your browser and our servers are encrypted using TLS/HTTPS protocols.
- **Encryption at Rest:** All sensitive credentials are stored encrypted using server-independent encryption keys (AES-256).
- **Execution Isolation:** User automation code and flows execute within isolated sandbox environments to prevent cross-account leaks.

## 5. Sharing Data with Third Parties

We do not sell, rent, or trade your personal data to any third party for marketing purposes. Data is only shared in the following circumstances:
- **Official Payment Partner:** Midtrans for verification and processing of subscription transactions.
- **Connected Third-Party Services:** External applications (such as Google Workspace, Telegram, OpenAI, Slack) only receive data specifically configured by you in your workflows.
- **Legal Compliance:** When required by valid court orders or law enforcement authorities.

## 6. User Rights (Data Subject Rights)

Under applicable personal data protection laws, you have the right to:
- Access and obtain a copy of your personal data stored with us.
- Update or correct inaccurate personal data through your Profile Settings.
- Request permanent deletion of your account along with all flow configuration data and execution history.
- Revoke third-party connection permissions anytime via the Connections menu in the Anticeil interface.

## 7. Data Protection & Grievance Contact

If you have questions regarding this Privacy Policy or wish to exercise your data subject rights, please contact our Privacy Team:

- **Anticeil Privacy & Security Team:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Official Website:** [https://anticeil.com](https://anticeil.com)
- **Office Location:** Jakarta, Republic of Indonesia`,
    toc: [
      { id: '1-information-we-collect', title: '1. Information We Collect', level: 2 },
      { id: '2-payment-data-processing-by-midtrans', title: '2. Payment Data Processing by Midtrans', level: 2 },
      { id: '3-purpose-of-using-information', title: '3. Purpose of Using Information', level: 2 },
      { id: '4-data-protection-and-storage', title: '4. Data Protection and Storage', level: 2 },
      { id: '5-sharing-data-with-third-parties', title: '5. Sharing Data with Third Parties', level: 2 },
      { id: '6-user-rights-data-subject-rights', title: '6. User Rights (Data Subject Rights)', level: 2 },
      { id: '7-data-protection-grievance-contact', title: '7. Data Protection & Grievance Contact', level: 2 },
    ],
  },
};

export const LEGAL_PAGES_ID: Record<string, LegalPageData> = {
  'legal/terms': {
    slug: 'legal/terms',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Syarat dan Ketentuan Layanan',
    sidebarTitle: 'Syarat & Ketentuan',
    description: 'Syarat dan Ketentuan resmi penggunaan platform Anticeil dan pemrosesan pembayaran Midtrans',
    icon: 'shield',
    body: `Syarat dan Ketentuan ini mengatur penggunaan platform otomasi alur kerja dan AI Anticeil ([anticeil.com](https://anticeil.com)). Pembayaran tagihan langganan resmi diproses secara aman melalui gerbang pembayaran terlisensi **Midtrans** dalam mata uang Rupiah (IDR).

<Info>
**Dokumen Resmi Merchant:** Berlaku efektif untuk seluruh pengguna platform Anticeil. Terakhir diperbarui: Oktober 2026.
</Info>

## 1. Definisi dan Identitas Penyelenggara

Platform **Anticeil** ("Layanan", "Kami") adalah platform otomasi alur kerja (workflow automation), integrasi aplikasi tanpa kode, dan orkestrasi agen AI yang disediakan melalui situs web resmi **anticeil.com**.

Dengan mendaftar, mengakses, atau menggunakan Layanan, Pengguna ("Anda") menyetujui untuk terikat secara hukum oleh Syarat dan Ketentuan ini serta Kebijakan Privasi Kami. Apabila Anda tidak menyetujui salah satu ketentuan, Anda dipersilakan untuk tidak menggunakan Layanan Kami.

## 2. Ketentuan Akun dan Pendaftaran

- Pengguna wajib berusia sekurang-kurangnya 18 tahun atau memiliki persetujuan orang tua/wali yang sah menurut hukum Republik Indonesia.
- Pengguna wajib memberikan informasi identitas (nama, alamat email aktif) yang akurat dan terkini saat proses pendaftaran.
- Pengguna bertanggung jawab penuh atas keamanan kredensial akun, kata sandi, dan kunci API (API Key) miliknya.
- Satu akun hanya boleh digunakan oleh satu entitas atau tim sesuai kuota paket langganan yang dipilih.

## 3. Paket Berlangganan, Harga, dan Mata Uang

Anticeil menyediakan pilihan paket langganan dengan harga resmi dalam satuan mata uang **Rupiah (IDR)**:

| Paket | Harga Bulanan | Harga Tahunan | Fitur Utama |
|---|---|---|---|
| **Free** | Rp 0 | Rp 0 | 1.000 kredit otomasi, 1 anggota tim, alur kerja standar |
| **Plus** | Rp 299.000 | Rp 2.990.000 / thn | 10.000 kredit otomasi, 5 anggota tim, AI Agents & kustomisasi |
| **Team** | Rp 2.990.000 | Rp 29.900.000 / thn | 50.000 kredit otomasi, 25 anggota tim, SSO, Audit Log & Prioritas |

*Harga di atas belum termasuk Pajak Pertambahan Nilai (PPN) apabila diwajibkan oleh ketentuan perpajakan Republik Indonesia.*

## 4. Metode Pembayaran & Verifikasi Midtrans

Semua transaksi pembayaran paket berbayar di Anticeil diproses secara langsung melalui mitra resmi Payment Gateway **Midtrans (PT Midtrans)** yang telah berizin dan diawasi oleh Bank Indonesia:

- **QRIS & E-Wallet:** GoPay, OVO, ShopeePay, DANA, LinkAja.
- **Virtual Account (Transfer Bank):** BCA, Mandiri, BNI, BRI, Permata Bank, dan bank lainnya.
- **Kartu Kredit / Debit:** Visa, MasterCard, JCB, American Express dengan autentikasi 3D Secure (3DS).

Anticeil tidak pernah menyimpan data nomor kartu kredit atau informasi finansial sensitif Pengguna di server Kami. Seluruh pemrosesan pembayaran tunduk pada standar keamanan perbankan global PCI-DSS Level 1 yang dikelola oleh Midtrans.

## 5. Kebijakan Pembatalan dan Pengembalian Dana (Refund)

Kami mengutamakan kepuasan dan kepastian bagi setiap pelanggan Anticeil:

- **Pembatalan Langganan:** Pengguna dapat membatalkan perpanjangan langganan kapan saja melalui menu Pengaturan Billing di akun Anticeil tanpa dikenakan biaya denda atau penalti pembatalan. Akses paket berbayar tetap aktif hingga akhir periode penagihan yang sedang berjalan.
- **Garansi Pengembalian Dana 7 Hari:** Pengguna paket berbayar baru berhak mengajukan permohonan pengembalian dana (refund) penuh dalam kurun waktu **7 (tujuh) hari kalender** sejak tanggal transaksi pertama jika mengalami kendala teknis layanan yang tidak dapat diselesaikan oleh tim dukungan Kami.
- **Prosedur Klaim Refund:** Untuk mengajukan pengembalian dana, kirimkan email ke [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com) dengan menyertakan Nomor Pesanan (Order ID) dari bukti transaksi Midtrans dan alasan pengajuan. Pengembalian akan diproses dalam waktu 3-7 hari kerja melalui metode pembayaran awal.

## 6. Kepemilikan Data dan Hak Kekayaan Intelektual

Seluruh data bisnis, kredensial integrasi, konfigurasi alur kerja (flows), dan konten yang Anda buat pada platform Anticeil tetap merupakan hak milik penuh Anda. Kami tidak mengklaim kepemilikan apapun atas data Anda.

Merek dagang, logo Anticeil, desain antarmuka, dan kode sumber dasar perangkat lunak dilindungi oleh hukum hak cipta dan lisensi perangkat lunak yang berlaku.

## 7. Ketersediaan Layanan & Batasan Tanggung Jawab

Kami berkomitmen untuk menyediakan uptime layanan hingga 99,9%. Namun, Layanan disediakan dengan basis "sebagaimana adanya" (as is) tanpa jaminan mutlak atas ketiadaan gangguan akibat kegagalan pihak ketiga (seperti penyedia API pihak ketiga, jaringan internet global, atau pemadaman cloud provider).

## 8. Hukum yang Berlaku dan Penyelesaian Sengketa

Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan yang timbul akan diupayakan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat, atau melalui yurisdiksi Pengadilan Negeri di Indonesia.

## 9. Informasi Kontak Dukungan Pelanggan

Apabila Anda memiliki pertanyaan, klarifikasi, atau memerlukan bantuan terkait Syarat dan Ketentuan Layanan maupun transaksi Midtrans, silakan hubungi Kami:

- **Email Layanan Pelanggan:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Situs Web Resmi:** [https://anticeil.com](https://anticeil.com)
- **Lokasi Kantor:** Jakarta, Republik Indonesia`,
    toc: [
      { id: '1-definisi-dan-identitas-penyelenggara', title: '1. Definisi dan Identitas Penyelenggara', level: 2 },
      { id: '2-ketentuan-akun-dan-pendaftaran', title: '2. Ketentuan Akun dan Pendaftaran', level: 2 },
      { id: '3-paket-berlangganan-harga-dan-mata-uang', title: '3. Paket Berlangganan, Harga, dan Mata Uang', level: 2 },
      { id: '4-metode-pembayaran-verifikasi-midtrans', title: '4. Metode Pembayaran & Verifikasi Midtrans', level: 2 },
      { id: '5-kebijakan-pembatalan-dan-pengembalian-dana-refund', title: '5. Kebijakan Pembatalan dan Pengembalian Dana (Refund)', level: 2 },
      { id: '6-kepemilikan-data-dan-hak-kekayaan-intelektual', title: '6. Kepemilikan Data dan Hak Kekayaan Intelektual', level: 2 },
      { id: '7-ketersediaan-layanan-batasan-tanggung-jawab', title: '7. Ketersediaan Layanan & Batasan Tanggung Jawab', level: 2 },
      { id: '8-hukum-yang-berlaku-dan-penyelesaian-sengketa', title: '8. Hukum yang Berlaku dan Penyelesaian Sengketa', level: 2 },
      { id: '9-informasi-kontak-dukungan-pelanggan', title: '9. Informasi Kontak Dukungan Pelanggan', level: 2 },
    ],
  },
  'legal/privacy': {
    slug: 'legal/privacy',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Kebijakan Privasi',
    sidebarTitle: 'Kebijakan Privasi',
    description: 'Kebijakan privasi dan standar perlindungan data pribadi pengguna platform Anticeil sesuai UU PDP',
    icon: 'lock',
    body: `Anticeil menghormati dan melindungi data pribadi seluruh pengguna. Dokumen ini menjelaskan bagaimana Kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022). Seluruh data transaksi pembayaran diproses melalui saluran terenkripsi PCI-DSS oleh **Midtrans**.

<Info>
**Kepatuhan UU PDP No. 27 Tahun 2022:** Dokumen resmi standar keamanan dan perlindungan privasi data pengguna platform Anticeil. Terakhir diperbarui: Oktober 2026.
</Info>

## 1. Informasi yang Kami Kumpulkan

Kami mengumpulkan informasi yang diperlukan untuk mengoperasikan Layanan secara aman dan efektif:

- **Data Akun Pengguna:** Nama lengkap, alamat email, foto profil (opsional), dan kata sandi yang telah dienkripsi menggunakan algoritma hashing satu arah yang aman.
- **Data Alur Kerja & Eksekusi:** Konfigurasi flow, nama project, trigger webhook, dan parameter otomasi yang Anda buat untuk menjalankan integrasi.
- **Kunci API & Kredensial:** Token koneksi OAuth dan API Key pihak ketiga disimpan dalam database terenkripsi kuat menggunakan AES-256-GCM.
- **Data Transaksi Pembayaran:** Status pesanan, ID transaksi, jenis paket yang dibeli, dan waktu pembayaran yang diteruskan melalui Midtrans.

## 2. Pemrosesan Data Pembayaran oleh Midtrans

Untuk menjaga standar keamanan tertinggi, **Anticeil tidak pernah menyimpan, mencatat, atau mengakses data kartu kredit** (seperti 16 digit nomor kartu, tanggal kedaluwarsa, atau kode CVV/CVC) maupun kata sandi perbankan Anda pada infrastruktur Kami.

Ketika Anda melakukan pembelian atau perpanjangan langganan paket:
- Transaksi diarahkan secara aman ke antarmuka **Midtrans Snap** melalui koneksi HTTPS/TLS 1.3 terenkripsi.
- Midtrans memproses autentikasi pembayaran langsung ke jaringan bank terkait dan penerbit kartu sesuai standar internasional **PCI-DSS (Payment Card Industry Data Security Standard) Level 1**.
- Anticeil hanya menerima pemberitahuan status transaksi (berhasil, tertunda, atau gagal) beserta Nomor Transaksi (Order ID) dari webhook Midtrans untuk mengaktifkan kuota paket Anda secara otomatis.

## 3. Tujuan Penggunaan Informasi

Informasi yang Kami peroleh digunakan semata-mata untuk:
- Menyediakan, memelihara, dan meningkatkan fungsi platform Anticeil.
- Mengeksekusi alur kerja otomasi dan interaksi agen AI sesuai instruksi Anda.
- Mengirimkan informasi penting seperti notifikasi status flow, konfirmasi aktivasi paket, dan faktur penagihan.
- Mencegah aktivitas penyalahgunaan, akses ilegal, atau serangan siber terhadap akun dan infrastruktur.

## 4. Perlindungan dan Penyimpanan Data

Keamanan data Anda adalah prioritas utama Kami. Kami menerapkan langkah-langkah perlindungan teknis dan organisasi yang ketat:
- **Enkripsi Dalam Transit:** Seluruh komunikasi antara browser Anda dan server Kami dienkripsi menggunakan protokol TLS/HTTPS.
- **Enkripsi Saat Istirahat (At Rest):** Seluruh kredensial rahasia disimpan dalam bentuk terenkripsi menggunakan kunci enkripsi server independen (AES-256).
- **Isolasi Eksekusi:** Kode otomasi dan flow pengguna dijalankan dalam lingkungan eksekusi terisolasi (sandbox) untuk mencegah kebocoran antar akun.

## 5. Pembagian Data ke Pihak Ketiga

Kami tidak menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak mana pun untuk keperluan periklanan. Data hanya dibagikan ke pihak ketiga dalam kondisi berikut:
- **Mitra Pembayaran Resmi:** Midtrans untuk tujuan verifikasi dan pemrosesan transaksi pembayaran langganan.
- **Penyedia Layanan yang Anda Hubungkan:** Aplikasi eksternal (seperti Google Workspace, Telegram, OpenAI, Slack) hanya menerima data yang secara spesifik Anda konfigurasikan dalam alur kerja otomasi Anda.
- **Kewajiban Hukum:** Apabila diwajibkan oleh perintah pengadilan atau otoritas penegak hukum Republik Indonesia yang sah.

## 6. Hak-Hak Pengguna (Subjek Data)

Berdasarkan UU Perlindungan Data Pribadi (UU PDP), Anda berhak untuk:
- Mengakses dan memperoleh salinan data pribadi yang Kami simpan.
- Memperbarui atau memperbaiki data pribadi yang tidak akurat melalui menu Pengaturan Profil.
- Meminta penghapusan permanen akun beserta seluruh data konfigurasi flow dan riwayat eksekusi.
- Mencabut izin koneksi pihak ketiga kapan saja melalui menu Koneksi di antarmuka Anticeil.

## 7. Kontak Pengaduan & Perlindungan Data

Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau ingin mengajukan hak terkait data pribadi Anda, silakan hubungi Tim Privasi Kami:

- **Tim Privasi & Keamanan Anticeil:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Situs Web Resmi:** [https://anticeil.com](https://anticeil.com)
- **Lokasi Kantor:** Jakarta, Republik Indonesia`,
    toc: [
      { id: '1-informasi-yang-kami-kumpulkan', title: '1. Informasi yang Kami Kumpulkan', level: 2 },
      { id: '2-pemrosesan-data-pembayaran-oleh-midtrans', title: '2. Pemrosesan Data Pembayaran oleh Midtrans', level: 2 },
      { id: '3-tujuan-penggunaan-informasi', title: '3. Tujuan Penggunaan Informasi', level: 2 },
      { id: '4-perlindungan-dan-penyimpanan-data', title: '4. Perlindungan dan Penyimpanan Data', level: 2 },
      { id: '5-pembagian-data-ke-pihak-ketiga', title: '5. Pembagian Data ke Pihak Ketiga', level: 2 },
      { id: '6-hak-hak-pengguna-subjek-data', title: '6. Hak-Hak Pengguna (Subjek Data)', level: 2 },
      { id: '7-kontak-pengaduan-perlindungan-data', title: '7. Kontak Pengaduan & Perlindungan Data', level: 2 },
    ],
  },
};

export function getLegalDoc(slug: string, lang: string): LegalPageData | null {
  const isIndonesian = lang === 'id' || lang.startsWith('id-');
  const dataset = isIndonesian ? LEGAL_PAGES_ID : LEGAL_PAGES_EN;
  return dataset[slug] || null;
}
