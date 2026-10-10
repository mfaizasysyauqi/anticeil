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
  'legal/payment': {
    slug: 'legal/payment',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Payment Guide & Verification',
    sidebarTitle: 'Payment Guide',
    description: 'Official step-by-step payment instructions, Midtrans payment channels, pricing, and instant activation guide for Anticeil',
    icon: 'credit-card',
    body: `This official Payment Guide outlines the steps, accepted payment channels, pricing tiers, and automated verification process for Anticeil subscriptions ([anticeil.com](https://anticeil.com)). All digital payment transactions are securely processed via licensed payment gateway **Midtrans** (PT Midtrans) under the supervision of Bank Indonesia in Indonesian Rupiah (IDR).

<Info>
**Official Merchant Payment Documentation:** Designed for Midtrans production verification and as an end-user guide for subscription checkout. Last updated: October 2026.
</Info>

## 1. Overview & Official Currency

Anticeil is a modern workflow automation, application integration, and AI orchestration platform. Subscription billing is officially quoted and charged in **Indonesian Rupiah (IDR)**.

Transactions are protected by Bank Indonesia-regulated infrastructure and certified **PCI-DSS Level 1** compliance. Once a payment is completed, your account quota and subscription features are activated automatically in real time.

## 2. Subscription Plans & Official Pricing

Anticeil provides flexible subscription plans with monthly and annual billing cycles:

| Plan | Monthly Price | Annual Price | Key Inclusions |
|---|---|---|---|
| **Free** | Rp 0 | Rp 0 | 1,000 automation credits, 1 team member, standard pieces |
| **Plus** | Rp 299,000 | Rp 2,990,000 / yr | 10,000 automation credits, AI Agents, custom webhooks, priority queue |
| **Team** | Rp 2,990,000 | Rp 29,900,000 / yr | 50,000 automation credits, 25 team members, SSO, Audit Logs, dedicated support |

*All prices are billed transparently without hidden setup fees. Prices exclude applicable Value Added Tax (VAT) if required by taxation rules.*

## 3. Supported Midtrans Payment Channels

Users can settle subscription invoices using a variety of instant payment methods provided by Midtrans:

- **QRIS & e-Wallets (Instant Settlement):**
  - QRIS (compatible with BCA Mobile, Livin by Mandiri, BRImo, BNI Mobile, CIMB Octo, GoPay, OVO, ShopeePay, DANA, LinkAja, and any Indonesian QRIS-compatible app)
  - GoPay / GoPay Later
- **Virtual Account Bank Transfer (Automatic Verification 24/7):**
  - BCA Virtual Account
  - Mandiri Virtual Account (Bill Payment)
  - BRI Virtual Account (BRIVA)
  - BNI Virtual Account
  - Permata Bank & Other ATM Bersama / Prima / Alto banks
- **Credit & Debit Cards (Global Acceptance):**
  - Visa, MasterCard, JCB, and American Express
  - Equipped with 3D Secure (3DS OTP) authentication for cardholder protection

## 4. Step-by-Step Payment Instructions

Follow these 4 simple steps to upgrade or renew your Anticeil subscription:

### Step 1: Select Your Plan and Billing Cycle

Log in to your Anticeil dashboard and navigate to **Settings** > **Billing & Subscriptions** (or visit \`https://app.anticeil.com/billing\`). Compare plan features, choose between **Monthly** or **Annual** billing, and click **Pilih Paket Plus** or **Pilih Paket Team**.

![Step 1: Choose subscription plan and billing cycle on Anticeil](/resources/screenshots/payment-guide/step-1-choose-plan.jpg)

### Step 2: Open Midtrans Snap Checkout

A secure **Midtrans Snap Payment** dialog will appear on your screen, detailing your order summary (e.g. "Anticeil Plus Subscription - Rp 299.000"). Select your preferred payment channel:
1. **QRIS / e-Wallet** (GoPay, QRIS)
2. **Virtual Account** (BCA, Mandiri, BNI, BRI)
3. **Credit / Debit Card** (Visa, Mastercard)

Then click **Lanjut ke Pembayaran** (Proceed to Payment).

![Step 2: Select payment method inside Midtrans Snap popup](/resources/screenshots/payment-guide/step-2-select-payment-method.jpg)

### Step 3: Complete Payment via Preferred Channel

Follow the on-screen instructions according to your chosen payment method:

![Step 3: Scan QRIS code or copy Bank Virtual Account number](/resources/screenshots/payment-guide/step-3-complete-payment-qris-va.jpg)

- **For QRIS:** Scan the dynamic QR code on screen using your mobile banking or e-wallet application, verify the merchant name (**Anticeil**), and confirm with your PIN.
- **For Virtual Account:** Copy the 16-digit Virtual Account number and transfer the exact bill amount through mobile banking, internet banking, or ATM.
- **For Credit Card:** Enter your 16-digit card number, expiry date, and CVV, then input the 6-digit OTP code sent via SMS by your bank.

### Step 4: Automatic Verification & Instant Activation

Once your transaction is processed, Midtrans instantly sends an encrypted webhook notification to Anticeil. Your payment status will update to **Success** and your plan quota will be activated immediately.

![Step 4: Payment confirmed and Anticeil subscription activated instantly](/resources/screenshots/payment-guide/step-4-payment-success-activated.jpg)

You can download your official tax invoice anytime from the billing history panel.

## 5. Channel-Specific Payment Steps

### A. How to Pay with QRIS (BCA Mobile, Livin, GoPay, OVO, Dana)
1. Select **QRIS** on the Midtrans payment modal.
2. Open your mobile banking app (e.g., BCA Mobile, Mandiri Livin, BRImo) or e-wallet (GoPay, OVO, DANA, ShopeePay).
3. Tap the **Scan QR / QRIS** icon.
4. Point your camera at the QR code displayed on the screen.
5. Verify that the merchant name appears as **Anticeil** and the amount matches your subscription plan.
6. Enter your 6-digit PIN and complete the transaction.
7. The checkout screen will automatically refresh and confirm payment success within 5 seconds.

### B. How to Pay with BCA Virtual Account
1. Open the **BCA mobile (m-BCA)** app and enter your m-BCA access code.
2. Select menu **m-Transfer** > **BCA Virtual Account**.
3. Input or paste the Anticeil BCA Virtual Account number provided on screen (e.g. \`1234 5678 9012 3456\`).
4. Review the payment details (Merchant: Anticeil, Total Amount: Rp 299,000).
5. Enter your m-BCA PIN. Transaction is complete!

### C. How to Pay with Mandiri, BRI, or BNI Virtual Account
1. Open your bank's mobile banking app (Livin' by Mandiri, BRImo, or BNI Mobile Banking).
2. Choose **Transfer** / **Bayar** > **Virtual Account** (or **BRIVA** for BRI / **Bayar Multi Payment** for Mandiri).
3. Paste the Virtual Account number displayed by Midtrans.
4. Confirm total amount and enter your transaction PIN.

### D. How to Pay with Credit or Debit Card
1. Select **Credit Card** in the Midtrans payment dialog.
2. Enter your 16-digit Card Number, Expiration Date (MM/YY), and 3-digit CVV/CVC code.
3. Click **Pay Now**.
4. You will be redirected to the bank's **3D Secure** authentication page.
5. Enter the one-time OTP sent to your registered phone number.
6. Upon authorization, your subscription is activated immediately.

## 6. Cancellation & 7-Day Refund Policy

We stand by the quality of our service and offer transparent consumer protection:

- **Cancel Anytime:** You can cancel auto-renewals anytime with a single click in your Anticeil Billing Settings. You retain full access until the end of your prepaid period.
- **7-Day Money-Back Guarantee:** If you encounter technical hurdles or find that Anticeil does not suit your workflows, you may request a 100% refund within **7 (seven) days** of your initial paid transaction.
- **Refund Procedure:** Simply email [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com) with your Order ID. Approved refunds are credited back to your original payment method within 3-7 business days.

## 7. Security & Consumer Protection (PCI-DSS)

Your security and financial data privacy are our highest priority:
- **Zero Card Storage:** Anticeil never stores, views, or logs credit card numbers, CVVs, or bank credentials.
- **PCI-DSS Level 1:** All transaction data is processed directly on Midtrans's PCI-DSS Level 1 certified infrastructure.
- **TLS 1.3 Encryption:** All communication channels between your browser, Anticeil, and Midtrans are protected by military-grade 256-bit SSL/TLS encryption.

## 8. Customer Support & Billing Inquiries

Need help with payment or have a custom enterprise invoicing requirement? Our team is ready to assist:

- **Customer Support Email:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Official Website:** [https://anticeil.com](https://anticeil.com)
- **Response Time:** Under 24 hours (Monday - Sunday, 08:00 - 20:00 WIB)
- **Office Location:** Jakarta, Republic of Indonesia`,
    toc: [
      { id: '1-overview-official-currency', title: '1. Overview & Official Currency', level: 2 },
      { id: '2-subscription-plans-official-pricing', title: '2. Subscription Plans & Official Pricing', level: 2 },
      { id: '3-supported-midtrans-payment-channels', title: '3. Supported Midtrans Payment Channels', level: 2 },
      { id: '4-step-by-step-payment-instructions', title: '4. Step-by-Step Payment Instructions', level: 2 },
      { id: '5-channel-specific-payment-steps', title: '5. Channel-Specific Payment Steps', level: 2 },
      { id: '6-cancellation-7-day-refund-policy', title: '6. Cancellation & 7-Day Refund Policy', level: 2 },
      { id: '7-security-consumer-protection-pci-dss', title: '7. Security & Consumer Protection (PCI-DSS)', level: 2 },
      { id: '8-customer-support-billing-inquiries', title: '8. Customer Support & Billing Inquiries', level: 2 },
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
  'legal/payment': {
    slug: 'legal/payment',
    tab: 'Get Started',
    group: 'Legal',
    title: 'Tata Cara Pembayaran',
    sidebarTitle: 'Tata Cara Pembayaran',
    description: 'Panduan resmi tata cara pembayaran langganan Anticeil melalui payment gateway Midtrans (QRIS, Virtual Account, Kartu Kredit)',
    icon: 'credit-card',
    body: `Dokumen resmi ini menjelaskan tata cara pembayaran, daftar metode pembayaran yang didukung, rincian paket langganan, dan proses verifikasi otomatis untuk seluruh transaksi di platform Anticeil ([anticeil.com](https://anticeil.com)). Seluruh transaksi digital diproses secara aman melalui gerbang pembayaran berlisensi **Midtrans** (PT Midtrans) di bawah pengawasan Bank Indonesia dalam mata uang Rupiah (IDR).

<Info>
**Dokumen Resmi Pembayaran Merchant:** Disusun untuk keperluan verifikasi produksi Midtrans dan panduan pembayaran bagi pengguna layanan Anticeil. Terakhir diperbarui: Oktober 2026.
</Info>

## 1. Gambaran Umum & Mata Uang Resmi

Anticeil adalah platform otomasi alur kerja (workflow automation), integrasi aplikasi tanpa kode, dan orkestrasi agen AI modern. Tagihan biaya langganan secara resmi dinyatakan dan ditagihkan dalam **Rupiah Indonesia (IDR)**.

Seluruh transaksi pembayaran dilindungi oleh regulasi Bank Indonesia dan standar keamanan internasional **PCI-DSS Level 1**. Setelah pembayaran berhasil dilakukan, kuota kredit eksekusi dan seluruh fitur paket langganan Anda akan aktif secara otomatis dan instan tanpa perlu konfirmasi manual.

## 2. Pilihan Paket Langganan & Tarif Resmi

Anticeil menyediakan pilihan paket langganan dengan siklus penagihan bulanan maupun tahunan yang transparan:

| Paket | Tarif Bulanan | Tarif Tahunan | Fasilitas Utama |
|---|---|---|---|
| **Free** | Rp 0 | Rp 0 | 1.000 kredit otomasi, 1 anggota tim, komponen standar |
| **Plus** | Rp 299.000 | Rp 2.990.000 / thn | 10.000 kredit otomasi, Akses Agen AI, webhook kustom, antrean prioritas |
| **Team** | Rp 2.990.000 | Rp 29.900.000 / thn | 50.000 kredit otomasi, 25 anggota tim, SSO, Audit Logs, dukungan prioritas |

*Seluruh tarif di atas ditagihkan secara transparan tanpa biaya tersembunyi (no hidden fees). Tarif belum termasuk Pajak Pertambahan Nilai (PPN) apabila disyaratkan oleh regulasi perpajakan yang berlaku.*

## 3. Saluran Pembayaran Resmi Midtrans

Pengguna dapat melakukan pembayaran langganan melalui berbagai saluran pembayaran instan yang disediakan oleh Midtrans:

- **QRIS & Dompet Digital (e-Wallet - Real-Time):**
  - QRIS (Dapat dipindai dari BCA Mobile, Livin by Mandiri, BRImo, BNI Mobile, CIMB Octo Mobile, GoPay, OVO, ShopeePay, DANA, LinkAja, dan seluruh aplikasi perbankan berstandar QRIS Nasional)
  - GoPay / GoPay Later
- **Virtual Account Transfer Bank (Verifikasi Otomatis 24/7):**
  - BCA Virtual Account
  - Mandiri Virtual Account (Bill Payment)
  - BRI Virtual Account (BRIVA)
  - BNI Virtual Account
  - Permata Bank & Jaringan ATM Bersama / Prima / Alto
- **Kartu Kredit & Debit Internasional:**
  - Visa, MasterCard, JCB, dan American Express
  - Dilengkapi fitur keamanan 3D Secure (OTP SMS) langsung dari bank penerbit kartu

## 4. Panduan Langkah Demi Langkah Pembayaran

Ikuti 4 langkah mudah berikut untuk melakukan pembayaran paket langganan Anticeil:

### Langkah 1: Pilih Paket & Periode Penagihan

Masuk ke dashboard Anticeil Anda, lalu buka menu **Pengaturan** > **Tagihan & Langganan** (atau akses langsung di \`https://app.anticeil.com/billing\`). Pelajari fitur paket yang Anda butuhkan, tentukan siklus penagihan (**Bulanan** atau **Tahunan**), lalu klik tombol **Pilih Paket Plus** atau **Pilih Paket Team**.

![Langkah 1: Memilih paket langganan dan siklus penagihan di Anticeil](/resources/screenshots/payment-guide/step-1-choose-plan.jpg)

### Langkah 2: Buka Popup Midtrans Snap & Pilih Metode

Jendela popup **Midtrans Snap Payment** yang aman akan muncul di layar Anda dengan rincian pemesanan resmi (contoh: "Anticeil Plus Subscription - Rp 299.000"). Pilih salah satu metode pembayaran yang Anda inginkan:
1. **QRIS / e-Wallet** (GoPay, QRIS)
2. **Virtual Account** (BCA, Mandiri, BNI, BRI)
3. **Kartu Kredit / Debit** (Visa, Mastercard)

Kemudian klik tombol **Lanjut ke Pembayaran**.

![Langkah 2: Memilih metode pembayaran di popup Midtrans Snap](/resources/screenshots/payment-guide/step-2-select-payment-method.jpg)

### Langkah 3: Selesaikan Pembayaran Sesuai Saluran

Selesaikan transaksi Anda sesuai instruksi pembayaran pada saluran yang dipilih:

![Langkah 3: Memindai kode QRIS atau menyalin Nomor Virtual Account bank](/resources/screenshots/payment-guide/step-3-complete-payment-qris-va.jpg)

- **Untuk QRIS:** Buka aplikasi mobile banking atau dompet digital Anda, scan kode QR yang tampil di layar, periksa nama merchant (**Anticeil**), dan konfirmasi dengan PIN Anda.
- **Untuk Virtual Account:** Salin 16 digit Nomor Virtual Account yang tertera dan lakukan transfer nominal yang sesuai melalui m-Banking, ATM, atau Internet Banking.
- **Untuk Kartu Kredit:** Masukkan 16 digit nomor kartu, masa berlaku kartu, dan kode CVV, lalu masukkan 6 digit kode OTP (3D Secure) yang dikirimkan bank ke ponsel Anda.

### Langkah 4: Verifikasi Otomatis & Aktivasi Instan

Setelah pembayaran selesai, Midtrans secara otomatis mengirimkan notifikasi terenkripsi (webhook) ke server Anticeil. Layar konfirmasi **Pembayaran Berhasil!** akan langsung muncul dan kuota paket Anda otomatis aktif seketika.

![Langkah 4: Konfirmasi pembayaran berhasil dan paket Anticeil aktif instan](/resources/screenshots/payment-guide/step-4-payment-success-activated.jpg)

Anda dapat langsung mengunduh bukti faktur pembayaran resmi (invoice) melalui panel riwayat tagihan.

## 5. Petunjuk Khusus Tiap Metode Pembayaran

### A. Panduan Pembayaran via QRIS (BCA Mobile, Livin, GoPay, OVO, Dana)
1. Pilih opsi **QRIS** pada modal pembayaran Midtrans.
2. Buka aplikasi m-Banking Anda (BCA Mobile, Livin' by Mandiri, BRImo) atau e-Wallet (GoPay, OVO, DANA, ShopeePay).
3. Pilih menu **Bayar / Scan QRIS**.
4. Arahkan kamera ponsel Anda ke kode QRIS yang tampil di layar.
5. Pastikan nama merchant yang muncul adalah **Anticeil** dan jumlah tagihan sesuai.
6. Masukkan PIN transaksi Anda dan klik Konfirmasi.
7. Sistem Anticeil akan mendeteksi pembayaran berhasil secara otomatis dalam waktu 3–5 detik.

### B. Panduan Pembayaran via BCA Virtual Account
1. Buka aplikasi **BCA mobile (m-BCA)** dan masukkan kode akses Anda.
2. Pilih menu **m-Transfer** > **BCA Virtual Account**.
3. Masukkan atau tempel nomor BCA Virtual Account Anticeil yang tertera di layar (contoh: \`1234 5678 9012 3456\`).
4. Periksa ringkasan transaksi (Nama Merchant: Anticeil, Total Tagihan: Rp 299.000).
5. Masukkan PIN m-BCA Anda. Transaksi selesai!

### C. Panduan Pembayaran via Mandiri, BRI, atau BNI Virtual Account
1. Buka aplikasi mobile banking Anda (Livin' by Mandiri, BRImo, atau BNI Mobile Banking).
2. Pilih menu **Transfer** / **Bayar** > **Virtual Account** (atau menu **BRIVA** untuk BRI / **Multi Payment** untuk Mandiri).
3. Masukkan nomor Virtual Account dari Midtrans.
4. Konfirmasi jumlah tagihan dan selesaikan dengan PIN transaksi Anda.

### D. Panduan Pembayaran via Kartu Kredit / Debit
1. Pilih metode **Credit Card** pada jendela Midtrans.
2. Masukkan 16 digit Nomor Kartu Kredit/Debit, Masa Berlaku (Bulan/Tahun), dan 3 digit kode keamanan CVV/CVC di belakang kartu.
3. Klik tombol **Bayar Sekarang**.
4. Anda akan diarahkan ke halaman autentikasi perbankan **3D Secure**.
5. Masukkan kode OTP yang dikirimkan via SMS oleh bank penerbit kartu Anda.
6. Setelah autentikasi berhasil, paket langganan Anda langsung aktif.

## 6. Kebijakan Pembatalan & Garansi Refund 7 Hari

Kami mengedepankan kenyamanan dan kepuasan penuh bagi setiap pelanggan Anticeil:

- **Pembatalan Kapan Saja (No Lock-In):** Anda dapat membatalkan perpanjangan otomatis langganan kapan saja melalui menu Pengaturan Tagihan tanpa biaya pembatalan. Layanan akan tetap dapat digunakan hingga akhir periode langganan yang telah dibayar.
- **Garansi 100% Uang Kembali (7-Day Money-Back Guarantee):** Jika Anda mengalami kendala teknis atau merasa Anticeil tidak memenuhi kebutuhan alur kerja Anda, Anda berhak mengajukan pengembalian dana penuh dalam waktu **7 (tujuh) hari kalender** sejak tanggal transaksi pertama.
- **Prosedur Klaim Refund:** Kirimkan email ke [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com) dengan mencantumkan Order ID dan alasan permohonan. Tim kami akan memproses pengembalian dana ke rekening/metode pembayaran asal dalam waktu 3–7 hari kerja.

## 7. Keamanan Transaksi & Standar PCI-DSS

Keamanan transaksi dan perlindungan data finansial Anda dijamin dengan standar tertinggi:
- **Tanpa Penyimpanan Data Kartu:** Anticeil sama sekali tidak pernah menyimpan, melihat, atau mencatat nomor kartu kredit, tanggal kedaluwarsa, CVV, maupun password perbankan Anda.
- **Sertifikasi PCI-DSS Level 1:** Seluruh alur pembayaran diproses secara terenkripsi melalui infrastruktur Midtrans yang tersertifikasi PCI-DSS Level 1 (standar keamanan industri perbankan internasional).
- **Enkripsi TLS 1.3:** Komunikasi data antara browser Anda, server Anticeil, dan gateway Midtrans dienkripsi dengan standar TLS 1.3 256-bit.

## 8. Bantuan & Layanan Pelanggan Penagihan

Jika Anda membutuhkan bantuan terkait pembayaran, kendala transaksi, atau penagihan khusus perusahaan (enterprise invoice), silakan hubungi tim kami:

- **Email Layanan Pelanggan:** [anticeil.official@gmail.com](mailto:anticeil.official@gmail.com)
- **Situs Web Resmi:** [https://anticeil.com](https://anticeil.com)
- **Waktu Respons:** Kurang dari 24 jam (Senin - Minggu, 08:00 - 20:00 WIB)
- **Lokasi Kantor:** Jakarta, Republik Indonesia`,
    toc: [
      { id: '1-gambaran-umum-mata-uang-resmi', title: '1. Gambaran Umum & Mata Uang Resmi', level: 2 },
      { id: '2-pilihan-paket-langganan-tarif-resmi', title: '2. Pilihan Paket Langganan & Tarif Resmi', level: 2 },
      { id: '3-saluran-pembayaran-resmi-midtrans', title: '3. Saluran Pembayaran Resmi Midtrans', level: 2 },
      { id: '4-panduan-langkah-demi-langkah-pembayaran', title: '4. Panduan Langkah Demi Langkah Pembayaran', level: 2 },
      { id: '5-petunjuk-khusus-tiap-metode-pembayaran', title: '5. Petunjuk Khusus Tiap Metode Pembayaran', level: 2 },
      { id: '6-kebijakan-pembatalan-garansi-refund-7-hari', title: '6. Kebijakan Pembatalan & Garansi Refund 7 Hari', level: 2 },
      { id: '7-keamanan-transaksi-standar-pci-dss', title: '7. Keamanan Transaksi & Standar PCI-DSS', level: 2 },
      { id: '8-bantuan-layanan-pelanggan-penagihan', title: '8. Bantuan & Layanan Pelanggan Penagihan', level: 2 },
    ],
  },
};

export function getLegalDoc(slug: string, lang: string): LegalPageData | null {
  const isIndonesian = lang === 'id' || lang.startsWith('id-');
  const dataset = isIndonesian ? LEGAL_PAGES_ID : LEGAL_PAGES_EN;
  return dataset[slug] || null;
}
