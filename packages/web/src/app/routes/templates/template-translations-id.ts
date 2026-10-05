/**
 * Static Indonesian translations for template categories and template metadata.
 * Templates come from the Activepieces cloud API in English — we translate them here
 * on the frontend for Indonesian users.
 *
 * Maintenance: add new entries whenever new templates appear from the API.
 */

/** Map from English category name → Indonesian label */
export const CATEGORY_TRANSLATIONS_ID: Record<string, string> = {
  All: 'Semua',
  'Content Creator': '🎬 Kreator Konten',
  '🎬 Content Creator': '🎬 Kreator Konten',
  Featured: '⭐ Pilihan Utama',
  '✨ Everyday': '✨ Sehari-hari',
  'Customer Service': 'Layanan Pelanggan',
  Sales: 'Penjualan',
  Engineering: 'Rekayasa',
  Finance: 'Keuangan',
  HR: 'SDM',
  IT: 'TI',
  Legal: 'Hukum',
  Marketing: 'Pemasaran',
  Operations: 'Operasional',
  Product: 'Produk',
  Agents: 'Agen AI',
};

/**
 * Translate a category name to Indonesian.
 * Falls back to the original string if no translation exists.
 */
export function translateCategory(category: string): string {
  return CATEGORY_TRANSLATIONS_ID[category] ?? category;
}

/**
 * Template metadata translations (name + summary).
 * Key = English template name (exact match).
 */
export const TEMPLATE_NAME_TRANSLATIONS_ID: Record<
  string,
  { name: string; summary: string }
> = {
  'YouTube Viral Clipper → Shorts': {
    name: 'Pemotong Video Viral YouTube → Shorts',
    summary:
      'Deteksi otomatis momen viral dari YouTube menggunakan Groq AI, potong klipnya, dan unggah sebagai Shorts.',
  },
  'AI Content Brief → Multi-Platform Posts': {
    name: 'Brief Konten AI → Postingan Multi-Platform',
    summary:
      'Ubah satu brief menjadi postingan siap-terbit untuk Instagram, TikTok, Twitter, dan YouTube.',
  },
  'Trending Topic Monitor & Alert': {
    name: 'Monitor & Notifikasi Topik Trending',
    summary:
      'Pantau topik trending YouTube setiap jam, nilai relevansi niche dengan AI, terima notifikasi Telegram.',
  },
  'Auto Caption & Hashtag Generator': {
    name: 'Generator Caption & Hashtag Otomatis',
    summary:
      'Kirim URL video atau skrip, dapatkan caption viral dan 30 hashtag per platform secara instan.',
  },
  'Content Reward Platform Scraper': {
    name: 'Pengambil Data Platform Reward Konten',
    summary:
      'Ambil video dari platform reward konten, filter berdasarkan pembayaran, antrikan untuk otomasi klip.',
  },
  'Create Investor Update Deck': {
    name: 'Buat Deck Update Investor',
    summary:
      'Buat, ekspor, dan kirim update investor bulanan yang rapi secara otomatis menggunakan data real-time dari alat bisnis utama Anda.',
  },
  'Daily Schedule & Task Briefing': {
    name: 'Briefing Jadwal & Tugas Harian',
    summary:
      'Kirim email harian sederhana yang merangkum cuaca hari ini, jadwal kalender, dan daftar tugas dalam satu ringkasan yang mudah dibaca.',
  },
  'Sync Notion Databases to Google Calendar': {
    name: 'Sinkronisasi Database Notion ke Google Kalender',
    summary: 'Alur ini otomatis menyinkronkan entri CRM Notion ke Google Calendar.',
  },
  'Summarize YouTube Videos to Docs': {
    name: 'Rangkum Video YouTube ke Dokumen',
    summary:
      'Otomasi ini mengambil transkrip video Youtube, merangkum ide-ide utama, dan membuat dokumen yang rapi secara otomatis.',
  },
  'Daily Task Deadline Reminders': {
    name: 'Pengingat Tenggat Tugas Harian',
    summary:
      'Otomasi ini mencegah masalah dengan mengambil tugas dari Notion dan Google Sheets setiap hari, menghitung sisa hari, dan mengirim pengingat Slack.',
  },
  'Daily News Report In Your Email': {
    name: 'Laporan Berita Harian di Email Anda',
    summary:
      'Otomasi ini menyaring puluhan umpan RSS dengan AI dan mengirimkan hanya cerita yang paling relevan ke kotak masuk Anda setiap hari.',
  },
  'Generate Customer Service Replies Automatically': {
    name: 'Buat Balasan Layanan Pelanggan Secara Otomatis',
    summary:
      'Otomasi ini menganalisis email pelanggan masuk dan membuat balasan yang jelas dan membantu menggunakan AI.',
  },
  'Send Personal Morning Briefing': {
    name: 'Kirim Briefing Pagi Pribadi',
    summary:
      'Secara otomatis membuat briefing harian yang cerdas setiap pagi dengan kalender, tugas, sorotan kotak masuk, cuaca, dan berita.',
  },
  'Linear Support Agent': {
    name: 'Agen Dukungan Linear',
    summary:
      'Bot Manajemen Tiket Linear untuk Slack yang membuat, memperbarui, dan melacak masalah melalui perintah bahasa alami.',
  },
  'Self Promotion Discord Moderator': {
    name: 'Moderator Promosi Diri Discord',
    summary:
      'Secara otomatis memantau pesan di saluran Discord, mendeteksi konten promosi diri, dan memberi tahu pengirim dengan sopan.',
  },
  'Generate YouTube Thumbnails': {
    name: 'Buat Thumbnail YouTube',
    summary: 'Buat thumbnail YouTube bermerek dengan AI dalam hitungan menit menggunakan Activepieces.',
  },
  'Human-Approved AI Outreach': {
    name: 'Penjangkauan AI dengan Persetujuan Manusia',
    summary:
      'Secara otomatis menghasilkan ringkasan prospek berbasis AI dari prospek Salesforce baru, meminta persetujuan manusia di Slack.',
  },
  'Slack: Channel Integrity Scanner': {
    name: 'Slack: Pemindai Integritas Saluran',
    summary:
      'Secara otomatis memindai pesan Slack untuk konten yang dibuat AI dan plagiarisme, menandai pelanggaran dalam thread.',
  },
  'Send Slack Alerts for Emails': {
    name: 'Kirim Notifikasi Slack untuk Email',
    summary:
      'Kirim notifikasi Slack otomatis saat email Gmail cocok dengan filter tertentu seperti subjek, pengirim, atau label.',
  },
  'Generate AI Content From Sheet Rows': {
    name: 'Buat Konten AI dari Baris Sheet',
    summary:
      'Buat konten AI secara otomatis dari baris Google Sheets dan tulis hasilnya kembali ke sheet.',
  },
  'Forward Specific Emails Automatically': {
    name: 'Teruskan Email Tertentu Secara Otomatis',
    summary:
      'Teruskan email Gmail yang mengandung kata kunci secara otomatis ke alamat email pilihan.',
  },
  'Send Sheet Updates to Slack': {
    name: 'Kirim Pembaruan Sheet ke Slack',
    summary:
      'Kirim notifikasi Slack instan untuk setiap baris Google Sheets baru, menjaga tim Anda tetap diperbarui secara otomatis.',
  },
  'Run Support Tickets From Slack': {
    name: 'Kelola Tiket Dukungan dari Slack',
    summary:
      'Alur kerja sederhana yang menggunakan Slack, AI, dan Linear untuk mengubah pesan pelanggan menjadi tiket dukungan terstruktur.',
  },
  'Track Jira Ticket Status Counts': {
    name: 'Lacak Jumlah Status Tiket Jira',
    summary:
      'Jaga keselarasan tim Anda dengan laporan Slack harian yang secara otomatis merangkum jumlah tiket Jira berdasarkan status.',
  },
  'Generate Github Activity Summaries For Standup': {
    name: 'Buat Ringkasan Aktivitas GitHub untuk Standup',
    summary:
      'Otomasi ini mengumpulkan 24 jam aktivitas GitHub terakhir dan merangkumnya menjadi laporan standup yang jelas menggunakan AI.',
  },
  'Release Notes Automator': {
    name: 'Otomator Catatan Rilis',
    summary:
      'Saat rilis GitHub diterbitkan, alur ini menghasilkan changelog markdown yang rapi dari data rilis + riwayat commit.',
  },
  '"Stale PR" Auto-Pinger': {
    name: 'Auto-Pinger "PR Terbengkalai"',
    summary:
      'Berjalan setiap hari di hari kerja untuk menemukan pull request terbuka yang tidak aktif lebih dari 15 hari.',
  },
  'List invoices in Excel': {
    name: 'Daftar Invoice di Excel',
    summary:
      'Membuat laporan Excel bulanan yang mencakup semua invoice Stripe dan item baris dari 30 hari terakhir.',
  },
  'Alert on new paid subscriptions and upgrades': {
    name: 'Notifikasi Langganan Berbayar Baru & Peningkatan',
    summary:
      'Secara otomatis melacak langganan Stripe baru, memperkaya data, memberi tahu tim, mencatat analitik.',
  },
  'Detect High-Value Leads and Notify Slack': {
    name: 'Deteksi Prospek Bernilai Tinggi & Beritahu Slack',
    summary:
      'Alur kerja ini mengambil detail prospek dari email, meneliti perusahaan untuk menentukan skor dari 1-10 lalu memberi tahu orang yang tepat di Slack.',
  },
  'Generate Sales Deck from CRM Opportunity': {
    name: 'Buat Deck Penjualan dari Peluang CRM',
    summary:
      'Buat deck pitch penjualan yang dipersonalisasi secara otomatis saat deal mencapai tahap "Presentasi Dijadwalkan".',
  },
  'Keep Business Compliance Up-To-Date': {
    name: 'Jaga Kepatuhan Bisnis Tetap Terkini',
    summary:
      'Otomasi ini memeriksa data pengajuan Anda setiap hari, memperbarui status tenggat yang akan datang atau sudah lewat.',
  },
  'Send Resumes to Google Sheets & Slack': {
    name: 'Kirim Resume ke Google Sheets & Slack',
    summary:
      'Otomasi ini mengekstrak data kandidat terstruktur dari resume dan menyimpannya langsung ke Google Sheets.',
  },
  'Generate Candidate Evaluation Role Context': {
    name: 'Buat Konteks Peran Evaluasi Kandidat',
    summary:
      'Secara otomatis memperkaya konteks kandidat dan pemberi kerja, menganalisis data resume, dan memposting evaluasi kesesuaian yang dibuat AI.',
  },
  'Answer Employee Policy Questions Instantly': {
    name: 'Jawab Pertanyaan Kebijakan Karyawan Secara Instan',
    summary:
      'Chat Dukungan Karyawan berbasis AI — karyawan mengajukan pertanyaan SDM dan TI di Slack, mendapatkan jawaban instan dari kebijakan Notion.',
  },
  'Score and Qualify Inbound Leads': {
    name: 'Nilai & Kualifikasi Prospek Masuk',
    summary:
      'Otomasi ini mengubah setiap pengiriman formulir masuk menjadi prospek yang diprioritaskan dan didukung penelitian tanpa tinjauan manual.',
  },
  'Monitor Discord/Slack and Surface Issues': {
    name: 'Pantau Discord/Slack & Temukan Masalah',
    summary:
      'Otomasi ini memantau pesan Discord atau Slack secara real-time dan menggunakan AI untuk mendeteksi pertanyaan mendesak.',
  },
  'Generate Viral LinkedIn Content Daily': {
    name: 'Buat Konten LinkedIn Viral Setiap Hari',
    summary:
      'Otomasi ini membuat postingan LinkedIn berbasis tren setiap hari menggunakan topik dan hashtag real-time.',
  },
  'Audit Website SEO and Email Reports': {
    name: 'Audit SEO Website & Kirim Laporan via Email',
    summary:
      'Otomasi ini menganalisis SEO website Anda setiap hari dan menghasilkan audit yang jelas dan dapat ditindaklanjuti tanpa pemeriksaan manual.',
  },
  'Create Investor Update Deck (Finance)': {
    name: 'Buat Deck Update Investor (Keuangan)',
    summary:
      'Buat laporan investor bulanan yang rapi menggunakan data dari Stripe, HubSpot, dan Google Sheets.',
  },
  'Weekly KPI Push From Excel to Power BI': {
    name: 'Dorong KPI Mingguan dari Excel ke Power BI',
    summary:
      'Mengotomatisasi pembaruan KPI mingguan dari Excel ke Power BI dengan deteksi anomali AI dan wawasan Teams.',
  },
  'Summarize Weekly Slack Channel Activity': {
    name: 'Rangkum Aktivitas Saluran Slack Mingguan',
    summary:
      'Jaga tim Anda selaras dengan ringkasan Slack mingguan bertenaga AI yang menyuling diskusi saluran yang kompleks.',
  },
  'AI-Powered Habit Coach': {
    name: 'Pelatih Kebiasaan Bertenaga AI',
    summary:
      'Mengirimkan pesan pelatihan kebiasaan yang dipersonalisasi setiap hari ke Slack berdasarkan pelacak kebiasaan Notion pengguna.',
  },
  'Turn Audio Messages Into Tasks': {
    name: 'Ubah Pesan Audio Menjadi Tugas',
    summary:
      'Otomasi ini mengubah pesan suara Telegram menjadi tugas Trello terstruktur dengan mentranskrip audio.',
  },
  'Manage Tasks in Telegram': {
    name: 'Kelola Tugas di Telegram',
    summary:
      'Otomasi ini mengubah bot Telegram Anda menjadi manajer tugas dengan mengkonversi catatan suara dan pesan ketik menjadi tugas terstruktur menggunakan AI.',
  },
  'Idea Capture & Tagging': {
    name: 'Tangkap & Beri Tag Ide',
    summary:
      'Menangkap ide yang dibagikan di Slack sebagai teks atau catatan suara, mengategorikannya secara otomatis menggunakan AI, menyimpannya ke Notion.',
  },
  'Create Brand Strategy': {
    name: 'Buat Strategi Merek',
    summary:
      'Mengumpulkan detail merek dari formulir web, menghasilkan kerangka identitas merek terstruktur menggunakan AI, lalu menyimpan hasilnya ke database Notion.',
  },
  'Generate Newsletters From Daily News': {
    name: 'Buat Newsletter dari Berita Harian',
    summary:
      'Bangun mesin kurasi konten yang sepenuhnya otomatis yang mengikis berita industri harian, menyaring duplikat, dan menggunakan AI untuk menghasilkan newsletter email.',
  },
  'Find Trending YouTube Video Ideas': {
    name: 'Temukan Ide Video YouTube Trending',
    summary:
      'Tingkatkan strategi konten Anda dengan penemuan tren berbasis AI yang memindai YouTube untuk video berkinerja tinggi di niche Anda.',
  },
  'Generate Pricing Proposal Deck': {
    name: 'Buat Deck Proposal Harga',
    summary:
      'Otomatis menghasilkan deck proposal harga dari data deal HubSpot, mengkonversinya ke PDF, dan mengirimkannya ke AE.',
  },
  'Weekly HubSpot Lead Report to Slack': {
    name: 'Laporan Prospek HubSpot Mingguan ke Slack',
    summary:
      'Otomasi ini mengambil prospek HubSpot baru dari minggu lalu dan memposting ringkasan yang jelas langsung ke Slack.',
  },
  'Score and Analyze Client Health': {
    name: 'Nilai & Analisis Kesehatan Klien',
    summary:
      'Otomasi ini memberikan dashboard kesehatan klien mingguan dengan menganalisis setiap email yang tercatat dan menilai kepuasan setiap klien.',
  },
  'Draft Personalized Email Replies': {
    name: 'Buat Draf Balasan Email yang Dipersonalisasi',
    summary:
      'Percepat produktivitas kotak masuk Anda dengan menggunakan AI untuk menghasilkan draf balasan email yang dipersonalisasi.',
  },
  'Translate Blog Posts': {
    name: 'Terjemahkan Posting Blog',
    summary:
      'Otomasi ini memantau database blog Notion Anda dan secara otomatis menerjemahkan postingan ke bahasa baru saat ditandai siap diterbitkan.',
  },
  'Repurpose RSS Feeds Into Social Posts': {
    name: 'Daur Ulang Umpan RSS Menjadi Postingan Sosial',
    summary:
      'Otomasi ini memungkinkan Anda mendapatkan konten dari umpan RSS dan mendaur ulangnya menjadi postingan media sosial.',
  },
  'Generate Daily Marketing Memes': {
    name: 'Buat Meme Marketing Harian',
    summary: 'Menghasilkan meme secara otomatis tentang topik pilihan Anda.',
  },
  'Notify Teams of New Responses': {
    name: 'Beritahu Tim tentang Respons Baru',
    summary:
      'Mengirimkan notifikasi email ke tim setiap kali respons Typeform baru dikirimkan.',
  },
  'Categorize Incoming Emails Automatically': {
    name: 'Kategorikan Email Masuk Secara Otomatis',
    summary:
      'Otomasi ini menggunakan AI untuk langsung mengklasifikasikan setiap pesan Gmail baru berdasarkan kategori dan urgensi.',
  },
  'Generate Proposals in Slides': {
    name: 'Buat Proposal dalam Slide',
    summary:
      'Otomasi ini mengubah respons formulir klien menjadi deck proposal yang dipresentasikan, menghemat jam penelitian, penulisan, dan pemformatan manual.',
  },
  'Create Jira Issues From Form': {
    name: 'Buat Masalah Jira dari Formulir',
    summary:
      'Secara otomatis mengonversi setiap pengiriman Google Form menjadi masalah Jira dengan pelapor, tanggal jatuh tempo, dan tugas opsional yang tepat.',
  },
  'Log Calendar Events in Toggl Track': {
    name: 'Catat Acara Kalender di Toggl Track',
    summary:
      'Buat entri waktu Toggl Track secara otomatis dari acara Google Calendar untuk menjaga log waktu yang akurat.',
  },
  'Export Amazon Reviews to Sheets': {
    name: 'Ekspor Ulasan Amazon ke Sheets',
    summary:
      'Mengumpulkan ulasan produk Amazon dalam jumlah besar melalui RapidAPI dan secara otomatis menyimpannya di Google Sheets.',
  },
  'Extract Text From Images': {
    name: 'Ekstrak Teks dari Gambar',
    summary:
      'Otomasi ini secara instan mengonversi gambar apa pun yang Anda kirim di Telegram menjadi teks yang bersih dan dapat dibaca.',
  },
  'Forward Zendesk Tickets To Slack': {
    name: 'Teruskan Tiket Zendesk ke Slack',
    summary:
      'Tingkatkan waktu respons dukungan dengan menerima notifikasi Slack instan untuk setiap tiket Zendesk baru.',
  },
  'Save Gmail Emails and Attachments': {
    name: 'Simpan Email Gmail dan Lampiran',
    summary:
      'Otomasi ini menyimpan setiap email Gmail masuk dan lampirannya ke Google Drive sambil mencatat detail email di Google Sheets.',
  },
  'Gather Company Insights Before Sales Calls': {
    name: 'Kumpulkan Wawasan Perusahaan Sebelum Panggilan Penjualan',
    summary:
      'Otomasi ini mengumpulkan dan mengatur informasi perusahaan yang terperinci sebelum panggilan penjualan.',
  },
  'Turn Sales Calls Into Action Plans': {
    name: 'Ubah Panggilan Penjualan Menjadi Rencana Aksi',
    summary:
      'Otomasi ini menganalisis transkrip panggilan penjualan dari Google Sheets dan menghasilkan rencana aksi yang jelas dan terstruktur menggunakan AI.',
  },
  'Client Health Tracker': {
    name: 'Pelacak Kesehatan Klien',
    summary:
      'Otomasi ini menangkap email klien masuk, mengekstrak detail utama dengan AI, dan mencatat semuanya ke Google Sheet yang bersih dan terstruktur.',
  },
  'PTO/Leave Request Automation': {
    name: 'Otomasi Permintaan PTO/Cuti',
    summary:
      'Sistem permintaan cuti otomatis dengan validasi berbasis AI, persetujuan manajer instan melalui Slack, dan sinkronisasi otomatis ke Odoo HR.',
  },
  'Send Follow-Ups to Silver Leads': {
    name: 'Kirim Tindak Lanjut ke Prospek Silver',
    summary:
      'Secara otomatis kembali melibatkan kandidat yang baru-baru ini didiskualifikasi dengan mencocokkan mereka ke peran terbuka baru menggunakan AI.',
  },
  'Inbox → Auto Resume Parser': {
    name: 'Kotak Masuk → Parser Resume Otomatis',
    summary:
      'Secara otomatis mengekstrak detail kandidat dari CV yang dikirim melalui email menggunakan AI, mencatatnya ke database.',
  },
  'Weekly AI Client Billing Notes': {
    name: 'Catatan Penagihan Klien AI Mingguan',
    summary:
      'Secara otomatis mencatat entri waktu Anda sepanjang minggu (ditandai berdasarkan klien dan proyek), lalu menghasilkan ringkasan yang jelas.',
  },
  'Collect Research Papers Automatically': {
    name: 'Kumpulkan Makalah Penelitian Secara Otomatis',
    summary:
      'Otomasi ini menghemat berjam-jam pencarian manual dengan secara otomatis mengumpulkan makalah penelitian baru dari Google Scholar.',
  },
  'API Documentation Publisher': {
    name: 'Penerbit Dokumentasi API',
    summary:
      'Alur otomatis yang menghasilkan dan menerbitkan dokumentasi API yang terbaru dari GitHub dan memberi tahu tim melalui Slack.',
  },
  'PostgreSQL Assistant': {
    name: 'Asisten PostgreSQL',
    summary:
      'Asisten berbasis agen untuk database Postgres yang mengambil data berdasarkan permintaan pengguna dari Slack dan mengembalikan respons terstruktur.',
  },
  'Bug → Jira': {
    name: 'Bug → Jira',
    summary:
      'Triase bug Sentry → Jira bertenaga AI dengan persetujuan Slack sebelum pembuatan tiket.',
  },
  'Monitor Inventory for Low Stock and Expiry': {
    name: 'Pantau Inventaris untuk Stok Rendah dan Kedaluwarsa',
    summary:
      'Cegah kehabisan stok dan kurangi pemborosan dengan monitor inventaris harian otomatis yang memindai spreadsheet Anda untuk stok rendah dan tanggal kedaluwarsa.',
  },
  'Generate Research Questions From PDFs': {
    name: 'Buat Pertanyaan Penelitian dari PDF',
    summary:
      'Unggah PDF penelitian dan dapatkan secara otomatis pertanyaan penelitian baru berdasarkan tema yang hilang dan topik yang kurang dieksplorasi.',
  },
  'Send Emails From Excel Rows': {
    name: 'Kirim Email dari Baris Excel',
    summary:
      'Secara otomatis mengirimkan email Outlook setiap kali baris baru ditambahkan ke tabel Microsoft Excel.',
  },
  'Desk and Meeting Room Booking Assistant': {
    name: 'Asisten Pemesanan Meja & Ruang Rapat',
    summary:
      'Agen AI memesan meja/ruangan dari permintaan bahasa alami, memeriksa ketersediaan, dan mengirimkan konfirmasi secara otomatis.',
  },
  'Summarize Briefs and Create Action Plans': {
    name: 'Rangkum Brief & Buat Rencana Aksi',
    summary:
      'Otomasi ini mengubah brief yang diunggah menjadi ringkasan yang jelas dan rencana yang dapat ditindaklanjuti tanpa tinjauan manual.',
  },
  'Auto-Validate Email & Send Event Invites': {
    name: 'Validasi Email Otomatis & Kirim Undangan Acara',
    summary:
      'Secara otomatis memvalidasi setiap email pendaftaran sebelum menambahkan orang ke acara Google Calendar Anda dan mengirimkan undangan yang dipersonalisasi.',
  },
  'Send Slack Messages for New Trello Cards': {
    name: 'Kirim Pesan Slack untuk Kartu Trello Baru',
    summary:
      'Otomasi ini mengirimkan pesan Slack instan setiap kali kartu Trello baru dibuat.',
  },
  'Create Trello Cards from New Google Forms Responses': {
    name: 'Buat Kartu Trello dari Respons Google Forms Baru',
    summary:
      'Otomasi ini membuat kartu Trello setiap kali seseorang mengirimkan Google Form Anda.',
  },
  'Monitor Contract Risks And Expirations': {
    name: 'Pantau Risiko & Kedaluwarsa Kontrak',
    summary:
      'Secara otomatis menemukan kontrak yang mendekati kedaluwarsa, menganalisisnya untuk risiko dan klausul yang hilang.',
  },
  'Score and Categorize CVs': {
    name: 'Nilai & Kategorikan CV',
    summary:
      'Otomasi ini meninjau CV masuk dengan merangkum setiap kandidat dan menilainya terhadap deskripsi pekerjaan tertentu.',
  },
  'Produce Weekly Business Reports Automatically': {
    name: 'Buat Laporan Bisnis Mingguan Secara Otomatis',
    summary:
      'Otomasi ini mengubah data aktivitas mingguan menjadi laporan bisnis yang profesional dan jelas tanpa pekerjaan manual.',
  },
  'Monthly Revenue vs Target Chart': {
    name: 'Grafik Pendapatan Bulanan vs Target',
    summary:
      'Mengirimkan ringkasan email mingguan tentang kinerja pendapatan, secara otomatis menunjukkan apakah pendapatan naik atau turun.',
  },
  'Send Weekly Industry Update Reports': {
    name: 'Kirim Laporan Pembaruan Industri Mingguan',
    summary:
      'Otomasi ini mengirimkan ringkasan berita industri terpenting yang dikurasi AI langsung ke kotak masuk Anda setiap minggu.',
  },
  'Daily KPI Trend Chart → Slack': {
    name: 'Grafik Tren KPI Harian → Slack',
    summary:
      'Mengotomatiskan pelacakan harian kontak HubSpot baru dan pelanggan Stripe, mengumpulkan pendaftaran selama 14 hari terakhir.',
  },
  'Weekly KPI Review': {
    name: 'Tinjauan KPI Mingguan',
    summary:
      'Alur kerja otomatis yang membuat presentasi KPI mingguan dari data spreadsheet, menggunakan AI untuk menyoroti wawasan dan risiko utama.',
  },
  'Turn Discord Questions Into Weekly Events': {
    name: 'Ubah Pertanyaan Discord Menjadi Acara Mingguan',
    summary:
      'Otomasi ini memindai saluran Discord Anda untuk mengidentifikasi pertanyaan trending dan topik berulang dari komunitas Anda.',
  },
  'Generate Image Tags Automatically': {
    name: 'Buat Tag Gambar Secara Otomatis',
    summary:
      'Otomasi ini membuat setiap gambar yang diunggah dapat dicari dengan menggunakan AI untuk menghasilkan kata kunci deskriptif.',
  },
  'Index Documents from Google Drive to Pinecone with OpenAI Embeddings for RAG': {
    name: 'Indeks Dokumen dari Google Drive ke Pinecone dengan Embedding OpenAI untuk RAG',
    summary:
      'Otomasi ini memastikan AI atau chatbot dapat mencari Google Drive Anda dan mengambil informasi tanpa pemrosesan manual.',
  },
  'Add new GitLab issues as ClickUp tasks': {
    name: 'Tambahkan Masalah GitLab Baru sebagai Tugas ClickUp',
    summary:
      'Membuat tugas ClickUp baru setiap kali ada masalah proyek GitLab baru (atau diperbarui).',
  },
  'Create Jira Issues From GitLab': {
    name: 'Buat Masalah Jira dari GitLab',
    summary:
      'Saat ada peristiwa masalah proyek GitLab, alur ini mencari pengguna Jira yang sesuai dan membuat masalah Jira.',
  },
  'Dependency Update Digest': {
    name: 'Ringkasan Pembaruan Dependensi',
    summary:
      'Berjalan setiap minggu untuk mengambil peringatan keamanan Dependabot GitHub terbuka untuk repositori yang dipilih dan memposting ringkasan berbasis tingkat keparahan ke saluran Slack.',
  },
  'Route GitHub Pull Requests to Discord': {
    name: 'Arahkan Pull Request GitHub ke Discord',
    summary:
      'Otomasi ini memantau semua pull request GitHub dan mempostingnya ke Discord, memisahkan PR internal dan eksternal ke saluran yang tepat.',
  },
  'CI/CD Failure Alerts → Slack/Discord': {
    name: 'Notifikasi Kegagalan CI/CD → Slack/Discord',
    summary:
      'Secara otomatis mengirimkan notifikasi Slack yang terperinci setiap kali alur kerja CI/CD GitHub gagal.',
  },
  'List GitHub issues that need to be triaged': {
    name: 'Daftar Masalah GitHub yang Perlu Ditriase',
    summary:
      'Mengotomatiskan triase masalah GitHub harian dan mengirimkan ringkasan Slack yang dikategorikan untuk tim Dukungan.',
  },
  'Create Linear Issues From Slack Messages': {
    name: 'Buat Masalah Linear dari Pesan Slack',
    summary:
      'Secara otomatis membuat masalah Linear baru setiap kali pesan baru diposting di saluran Slack yang dipilih.',
  },
  'Send Linear Issue Updates To Slack': {
    name: 'Kirim Pembaruan Masalah Linear ke Slack',
    summary: 'Otomasi pembaruan masalah Linear ke Slack untuk notifikasi tim secara real-time.',
  },
  'Assign Linear issues to the PM to validate': {
    name: 'Tetapkan Masalah Linear ke PM untuk Divalidasi',
    summary:
      "Saat masalah Linear berpindah ke 'Dalam Tinjauan', alur ini menugaskannya ke PM yang ditunjuk dan memberi tahu PM tersebut di Slack.",
  },
  'Create GitLab Issues From Linear': {
    name: 'Buat Masalah GitLab dari Linear',
    summary:
      'Saat masalah Linear baru dibuat, alur ini secara otomatis membuat masalah GitLab yang cocok di proyek GitLab yang dipilih.',
  },
  'Create Linear Issues From Support Emails': {
    name: 'Buat Masalah Linear dari Email Dukungan',
    summary:
      'Secara otomatis mengubah email dukungan masuk menjadi masalah Linear terstruktur dengan label, prioritas, ringkasan, dan deskripsi yang dibuat AI.',
  },
  'Sync HubSpot Contact from Successful Stripe Payment': {
    name: 'Sinkronkan Kontak HubSpot dari Pembayaran Stripe Berhasil',
    summary:
      'Secara otomatis menyinkronkan kontak HubSpot saat pembayaran Stripe berhasil terjadi.',
  },
  'Stripe Charge → QuickBooks': {
    name: 'Tagihan Stripe → QuickBooks',
    summary:
      'Secara otomatis mencatat tagihan Stripe yang selesai di QuickBooks dengan menyinkronkan pelanggan dan membuat Tanda Terima Penjualan.',
  },
  'Categorize and Track Expenses': {
    name: 'Kategorikan & Lacak Pengeluaran',
    summary:
      'Otomasi ini mengekstrak detail utama dari gambar tanda terima, mengategorikan setiap pengeluaran dengan AI, dan menyimpan semuanya dengan rapi di Google Sheets.',
  },
  'Generate Monthly Financial Reports': {
    name: 'Buat Laporan Keuangan Bulanan',
    summary:
      'Otomasi pengawasan keuangan bulanan Anda dengan menggunakan AI untuk mengubah data transaksi mentah dari Google Sheets menjadi laporan P&L yang profesional.',
  },
  'Budget Variance Monitoring': {
    name: 'Pemantauan Varians Anggaran',
    summary:
      'Secara otomatis memantau varians anggaran departemen bulanan dari Google Sheets dan mengirimkan penjelasan varians yang dibuat AI via email.',
  },
  'Send Invoice Payment Reminders Automatically': {
    name: 'Kirim Pengingat Pembayaran Invoice Secara Otomatis',
    summary:
      'Otomasi ini memeriksa daftar debitur Anda setiap hari, mengidentifikasi invoice yang jatuh tempo atau terlambat, dan mengirimkan email pengingat tepat waktu.',
  },
  'Financial KPI Dashboard Report': {
    name: 'Laporan Dashboard KPI Keuangan',
    summary:
      'Dashboard keuangan harian otomatis yang mengambil data dari Stripe, HubSpot, Salesforce, dan Google Sheets, menghitung metrik utama seperti ARR, MRR, CAC, LTV.',
  },
  'Daily Cash Position Summary': {
    name: 'Ringkasan Posisi Kas Harian',
    summary:
      'Briefing kas harian CFO otomatis yang mengambil data saldo Stripe, menghasilkan ringkasan keuangan berbasis AI, dan mengirimkannya ke Slack setiap pagi.',
  },
  'Summarize top FinTech news': {
    name: 'Rangkum Berita FinTech Teratas',
    summary:
      'Secara otomatis mengubah berita FinTech mingguan menjadi postingan tren LinkedIn yang ringkas dan siap diterbitkan menggunakan AI.',
  },
  'Send Invoice PDFs To Clients': {
    name: 'Kirim PDF Invoice ke Klien',
    summary:
      'Secara otomatis mengirimkan email PDF invoice Stripe kepada pelanggan segera setelah invoice baru dibuat.',
  },
  'Automatically Save & Organize Outlook Email Attachments in OneDrive Folders': {
    name: 'Simpan & Atur Lampiran Email Outlook di Folder OneDrive Secara Otomatis',
    summary:
      'Secara otomatis menyimpan lampiran email dari Outlook ke folder tahun, bulan, dan hari yang terorganisir di OneDrive.',
  },
  'Import CSV Contacts to Notion Database from Google Drive': {
    name: 'Impor Kontak CSV ke Database Notion dari Google Drive',
    summary:
      'Otomasi ini mengubah file CSV apa pun yang diunggah ke Google Drive menjadi entri database Notion yang bersih dan terstruktur.',
  },
  'AI Project Budget Watchdog': {
    name: 'Pengawas Anggaran Proyek AI',
    summary:
      'Pengawas AI otomatis yang memantau entri waktu proyek dan menandai saat proyek mendekati atau melampaui anggaran waktunya.',
  },
  'Competitor Pricing Change Alert System': {
    name: 'Sistem Notifikasi Perubahan Harga Pesaing',
    summary:
      'Tetap unggul dari pasar dengan secara otomatis melacak harga pesaing dan memberi tahu Anda saat ada yang berubah.',
  },
  'Turn Long PDF Documents Into Summaries': {
    name: 'Ubah Dokumen PDF Panjang Menjadi Ringkasan',
    summary:
      'Secara otomatis mengubah dokumen PDF yang panjang menjadi ringkasan yang jelas dan terstruktur dengan mengekstrak teks dari unggahan Google Drive.',
  },
  'Update Notion with Toggl Time Entries': {
    name: 'Perbarui Notion dengan Entri Waktu Toggl',
    summary:
      'Secara otomatis membuat entri waktu Toggl Track saat acara Google Calendar dimulai, memastikan pelacakan waktu yang akurat.',
  },
  'Create Calendar Events From Toggl': {
    name: 'Buat Acara Kalender dari Toggl',
    summary:
      'Sinkronkan entri waktu Toggl Track baru ke Google Calendar secara otomatis, membuat acara kalender sehingga Anda dapat melacak waktu rapat.',
  },
  'Generate Daily Toggl Time Reports': {
    name: 'Buat Laporan Waktu Toggl Harian',
    summary:
      'Secara otomatis mencatat entri waktu Clockify yang selesai ke Google Sheets, kemudian mengirimkan laporan ringkasan harian ke Slack dan email.',
  },
  'Where did my time go?': {
    name: 'Ke mana waktu saya pergi?',
    summary:
      'Otomasi mingguan yang menganalisis data waktu dari Calendar, Clockify, dan Notion untuk mengidentifikasi kebocoran waktu terbesar.',
  },
  'Automate Vendor Due Diligence Research': {
    name: 'Otomatisasi Penelitian Uji Tuntas Vendor',
    summary:
      'Percepat proses pengadaan Anda dengan menggunakan AI untuk secara otomatis meneliti latar belakang vendor dan menghasilkan penilaian risiko komprehensif.',
  },
  'Monitor Pharmacy Stock and Expiry Dates': {
    name: 'Pantau Stok & Tanggal Kedaluwarsa Apotek',
    summary:
      'Pastikan kepatuhan apotek dan cegah kehabisan obat dengan menggunakan auditor harian otomatis untuk memindai inventaris.',
  },
  'Task-Triggered Slack Alerts': {
    name: 'Notifikasi Slack yang Dipicu Tugas',
    summary:
      'Buat Notifikasi Slack yang Dipicu Tugas dengan memantau pembaruan ClickUp.',
  },
  'Turn Support Emails Into Trackable Tasks': {
    name: 'Ubah Email Dukungan Menjadi Tugas yang Dapat Dilacak',
    summary:
      'Konversi email dukungan menjadi tugas Planner yang diprioritaskan dengan ringkasan AI, notifikasi Teams, dan balasan email siap-persetujuan.',
  },
  'Log Zendesk Tickets To Airtable': {
    name: 'Catat Tiket Zendesk ke Airtable',
    summary:
      'Secara otomatis menangkap tiket Zendesk baru dan mengubahnya menjadi catatan Airtable terstruktur.',
  },
  'Create Zendesk Tickets From Typeform Responses': {
    name: 'Buat Tiket Zendesk dari Respons Typeform',
    summary:
      'Secara instan mengkonversi pengiriman Typeform menjadi tiket dukungan Zendesk untuk memastikan pertanyaan pelanggan ditangkap.',
  },
  'Create Zendesk Tickets From Slack': {
    name: 'Buat Tiket Zendesk dari Slack',
    summary:
      'Otomasi ini mengubah setiap pesan langsung Slack menjadi tiket Zendesk, memastikan tidak ada permintaan klien atau internal yang hilang.',
  },
  'Send HubSpot Support Tickets to Slack': {
    name: 'Kirim Tiket Dukungan HubSpot ke Slack',
    summary:
      'Alur kerja ini digunakan untuk mengambil tiket dukungan pelanggan setelah ditambahkan di Hubspot, mengategorikannya dan mengirimkan ke orang yang tepat di Slack.',
  },
  'Create Client Onboarding Tasks From Typeform': {
    name: 'Buat Tugas Orientasi Klien dari Typeform',
    summary:
      'Otomasi ini mengubah pengiriman orientasi Typeform menjadi tugas Asana yang sepenuhnya terstruktur sehingga tim Anda dapat segera memulai orientasi klien baru.',
  },
  'Summarize Meeting Audio Automatically': {
    name: 'Rangkum Audio Rapat Secara Otomatis',
    summary:
      'Secara otomatis transkripsi dan rangkum rekaman audio yang diunggah ke Google Drive menggunakan Whisper dan GPT-4 OpenAI.',
  },
  'Slack Q&A & Summarization Bot': {
    name: 'Bot Tanya Jawab & Ringkasan Slack',
    summary:
      'Bot Tanya Jawab dan Ringkasan Slack yang mencari jawaban yang ada dan merangkum thread untuk mengurangi pertanyaan duplikat.',
  },
  'Draft and Send Client Email Replies': {
    name: 'Buat Draf & Kirim Balasan Email Klien',
    summary:
      'Otomasi ini membaca email klien masuk, memahami maksudnya dengan AI, dan secara otomatis membuat respons yang jelas dan profesional.',
  },
  'Send Reward Emails To High-Spenders': {
    name: 'Kirim Email Reward ke Pelanggan Boros',
    summary:
      'Secara otomatis menemukan tamu dengan pengeluaran tertinggi dari data pemesanan dan mengirimkan penawaran reward yang dipersonalisasi.',
  },
  'Create Enriched Salesforce Leads From HubSpot': {
    name: 'Buat Prospek Salesforce yang Diperkaya dari HubSpot',
    summary:
      'Setiap kali kontak HubSpot baru ditambahkan, otomasi ini memperkaya detail kontak dan membuat prospek lengkap di Salesforce.',
  },
  'Automated AI Lead Enrichment: Enrich Salesforce Leads With Apollo': {
    name: 'Pengayaan Prospek AI Otomatis: Perkaya Prospek Salesforce dengan Apollo',
    summary:
      'Otomasi ini secara instan memperkaya setiap prospek Salesforce baru dengan menarik detail perusahaan dan kontak yang akurat dari Apollo.',
  },
  'HubSpot Contact AI Enrichment': {
    name: 'Pengayaan AI Kontak HubSpot',
    summary:
      'Otomasi ini mengubah setiap kontak HubSpot baru menjadi profil siap-jual yang kaya dengan menggunakan AI untuk mengekstrak detail perusahaan dari hasil pencarian Google live.',
  },
  'Contact Form Submission': {
    name: 'Pengiriman Formulir Kontak',
    summary:
      'Alur ini membuat pesan yang dipersonalisasi dengan AI, mendapatkan persetujuan manusia di Slack, mengirimkan formulir kontak website perusahaan melalui Skyvern, lalu memperbarui HubSpot secara otomatis.',
  },
  'Generate Notion Tasks From Emails': {
    name: 'Buat Tugas Notion dari Email',
    summary:
      'Otomasi ini mengubah email masuk menjadi tugas Notion yang jelas dan dapat ditindaklanjuti sehingga Anda tidak pernah kehilangan tindak lanjut.',
  },
  'Process and Validate Compliance Documents': {
    name: 'Proses & Validasi Dokumen Kepatuhan',
    summary:
      'Otomasi ini mengekstrak data utama dari dokumen kepatuhan masuk dan memvalidasi bidang yang diperlukan menggunakan AI.',
  },
  'Automatically File Incoming Clerky PDFs': {
    name: 'Arsipkan PDF Clerky Masuk Secara Otomatis',
    summary:
      'Otomasi ini mendeteksi email Clerky masuk dan secara otomatis mengarsipkan semua PDF terlampir di lokasi yang benar tanpa pengurutan manual.',
  },
  'PBM Law Change Monitoring': {
    name: 'Pemantauan Perubahan Hukum PBM',
    summary:
      'Otomasi ini memantau undang-undang dan peraturan terkait PBM setiap hari menggunakan govinfo.gov.',
  },
  'Secretary of State Form Autofill': {
    name: 'Pengisian Otomatis Formulir Sekretaris Negara',
    summary:
      'Secara otomatis mengisi formulir pengajuan Sekretaris Negara menggunakan data entitas dari Google Sheets.',
  },
  'Auto-Route Vendor Contracts': {
    name: 'Rute Otomatis Kontrak Vendor',
    summary:
      'Secara otomatis menganalisis kontrak vendor menggunakan AI, merutekan kontrak berisiko rendah untuk ditandatangani, dan mengirimkan kontrak berisiko tinggi untuk tinjauan hukum.',
  },
  'Employee Data Change Assistant': {
    name: 'Asisten Perubahan Data Karyawan',
    summary:
      'Secara otomatis memvalidasi, merutekan, dan mencatat permintaan perubahan data karyawan menggunakan AI.',
  },
  'Training & Compliance Tracking': {
    name: 'Pelacakan Pelatihan & Kepatuhan',
    summary:
      'Otomasi ini secara otomatis menugaskan dan mengingatkan pelatihan karyawan berbasis peran, memastikan kepatuhan yang lebih cepat dan pelacakan SDM yang akurat.',
  },
  'Generate AI Interview Question Packs': {
    name: 'Buat Paket Pertanyaan Wawancara AI',
    summary:
      'Otomasi ini membuat paket pertanyaan wawancara yang disesuaikan segera setelah kandidat mencapai tahap Wawancara.',
  },
  'AI Candidate Screening & Auto-Rating': {
    name: 'Penyaringan Kandidat AI & Penilaian Otomatis',
    summary:
      'Secara otomatis menyaring kandidat baru menggunakan AI, menilai mereka di dalam Workable, dan memberi tahu tim perekrutan di Slack.',
  },
  'Summarize Employee Feedback and Take Action': {
    name: 'Rangkum Umpan Balik Karyawan & Ambil Tindakan',
    summary:
      'Otomasi ini mengubah umpan balik karyawan menjadi wawasan yang jelas dan dapat ditindaklanjuti tanpa tinjauan manual.',
  },
  'Create Support Tickets From Call Transcripts': {
    name: 'Buat Tiket Dukungan dari Transkrip Panggilan',
    summary:
      'Dipicu setiap kali transkripsi baru ditambahkan ke Fireflies. AI menganalisis panggilan dukungan pelanggan dan membuat tiket dukungan.',
  },
  'AI Hiring Pipeline Health & Weekly Report': {
    name: 'Kesehatan Pipeline Rekrutmen AI & Laporan Mingguan',
    summary:
      'Laporan kesehatan pipeline rekrutmen mingguan otomatis dengan wawasan berbasis AI. Menganalisis hambatan, tingkat konversi, dan memberikan rekomendasi yang dapat ditindaklanjuti.',
  },
  'Smart Auto-Screen & Rate Candidates': {
    name: 'Penyaringan & Penilaian Kandidat Otomatis Cerdas',
    summary:
      'Secara otomatis mengurai resume baru, menilai mereka terhadap deskripsi pekerjaan menggunakan AI, dan menilai kandidat di Workable.',
  },
  'Create Enriched Candidate Profiles Automatically': {
    name: 'Buat Profil Kandidat yang Diperkaya Secara Otomatis',
    summary:
      'Otomasi ini menggabungkan data resume dan pengalaman LinkedIn menjadi satu profil kandidat yang diperkaya dengan mengekstrak keterampilan dan menyoroti kesenjangan dengan AI.',
  },
  'Send Confirmation Emails to Applicants': {
    name: 'Kirim Email Konfirmasi ke Pelamar',
    summary:
      'Secara otomatis mengirimkan email konfirmasi kepada kandidat saat mereka melamar melalui Workable.',
  },
  'Send Slack Alerts for Applicants': {
    name: 'Kirim Notifikasi Slack untuk Pelamar',
    summary:
      'Mengirimkan notifikasi Slack otomatis setiap kali kandidat baru melamar pekerjaan di Workable.',
  },
  'Find Qualified Candidates on LinkedIn': {
    name: 'Temukan Kandidat yang Memenuhi Syarat di LinkedIn',
    summary: 'Otomasi ini membantu recruiter menemukan kandidat pekerjaan di LinkedIn.',
  },
  'Automated Job Description Generator': {
    name: 'Generator Deskripsi Pekerjaan Otomatis',
    summary:
      'Menghasilkan deskripsi pekerjaan profesional dari formulir web menggunakan AI dan secara otomatis mempostingnya ke LinkedIn.',
  },
  'Screen Employee Feedback for Harmful Content': {
    name: 'Saring Umpan Balik Karyawan untuk Konten Berbahaya',
    summary:
      'Otomasi ini mengumpulkan umpan balik karyawan dari antarmuka obrolan dan memeriksa apakah ada pernyataan ilegal atau kata-kata seperti profanitas, ancaman atau kekerasan.',
  },
  'Screen Tally Applications and Schedule Interviews': {
    name: 'Saring Lamaran Tally & Jadwalkan Wawancara',
    summary:
      'Otomasi ini meninjau lamaran Tally masuk dengan recruiter AI untuk dengan cepat mengidentifikasi kandidat yang memenuhi syarat.',
  },
  'Create Mailchimp Lists for Applicants': {
    name: 'Buat Daftar Mailchimp untuk Pelamar',
    summary:
      'Secara otomatis menambahkan setiap pelamar baru dari Workable ke mailing list Mailchimp untuk kampanye perekrutan di masa mendatang.',
  },
  'Enrich Company Data for Leads': {
    name: 'Perkaya Data Perusahaan untuk Prospek',
    summary:
      'Secara otomatis memperkaya prospek penjualan atau rekrutmen baru dengan data perusahaan, menilai kesesuaian mereka terhadap Profil Pelanggan Ideal Anda.',
  },
  'Approve Purchase Requests': {
    name: 'Setujui Permintaan Pembelian',
    summary:
      'Alur kerja persetujuan pembelian bertenaga AI yang memvalidasi kebijakan, merutekan keputusan di Teams, mencatat ke SharePoint.',
  },
  'Generate Client KPI Reports as PDFs': {
    name: 'Buat Laporan KPI Klien sebagai PDF',
    summary:
      'Hasilkan dan kirimkan laporan KPI otomatis dengan ringkasan yang ditulis AI dari Google Sheets dan Power BI.',
  },
  'Weekly overview of JIRA Cloud Platform issues in Notion': {
    name: 'Ringkasan Mingguan Masalah Platform JIRA Cloud di Notion',
    summary:
      'Otomasi ini mengumpulkan masalah JIRA yang selesai dan aktif minggu ini, mengelompokkannya berdasarkan status dan penugasan.',
  },
  'Create ClickUp Tasks From Pipedrive Deals': {
    name: 'Buat Tugas ClickUp dari Deal Pipedrive',
    summary:
      'Otomasi ini mengkonversi deal Pipedrive baru menjadi tugas ClickUp dengan menarik organisasi terkait dan menggunakannya untuk memberi label setiap tugas.',
  },
  'Fireflies Transcripts to Meeting Summaries & Task Extractor to Slack & ClickUp': {
    name: 'Transkrip Fireflies ke Ringkasan Rapat & Ekstraktor Tugas ke Slack & ClickUp',
    summary:
      'Otomasi ini mengubah transkrip Fireflies menjadi ringkasan rapat dan tugas di ClickUp.',
  },
  'Add Microsoft Power BI dataset records from new Microsoft Excel spreadsheets': {
    name: 'Tambahkan Catatan Dataset Power BI dari Spreadsheet Excel Baru',
    summary:
      'Otomasi ini mengirimkan setiap baris baru dari buku kerja Excel Anda langsung ke dataset Power BI sehingga laporan Anda selalu mencerminkan data terbaru.',
  },
  'Convert Markdown Content to Notion Pages': {
    name: 'Konversi Konten Markdown ke Halaman Notion',
    summary:
      'Secara instan mengkonversi teks markdown menjadi halaman Notion yang diformat dengan sempurna dengan header, daftar, dan blok kode melalui antarmuka obrolan sederhana.',
  },
  'Create Notion Database Items from New Google Sheets Rows': {
    name: 'Buat Item Database Notion dari Baris Google Sheets Baru',
    summary:
      'Otomasi ini membuat entri database Notion baru setiap kali seseorang menambahkan baris di Google Sheets.',
  },
  'Create Documents From Google Docs Templates': {
    name: 'Buat Dokumen dari Template Google Docs',
    summary:
      'Ekstrak data terstruktur dari bahasa alami melalui obrolan dan secara otomatis isi template Google Docs membuat dokumen yang rapi tanpa pemformatan manual.',
  },
  'Generate and Share Professional PDFs': {
    name: 'Buat & Bagikan PDF Profesional',
    summary:
      'Ubah prompt teks sederhana menjadi dokumen PDF profesional yang tersimpan di Google Drive menggunakan pembuatan konten berbasis AI.',
  },
  'Automatically Analyze Sales Calls and Give Feedback': {
    name: 'Analisis Panggilan Penjualan Secara Otomatis & Beri Umpan Balik',
    summary:
      'Template otomasi ini mengambil transkripsi panggilan baru dari Google Drive dan menggunakan pelatih penjualan AI untuk menganalisis panggilan tersebut.',
  },
  'Qualify and Route Demo Requests': {
    name: 'Kualifikasi & Arahkan Permintaan Demo',
    summary:
      'Otomasi ini mengevaluasi permintaan demo menggunakan aturan yang konsisten dan telah ditentukan untuk menilai dan mengkualifikasikan setiap prospek secara adil.',
  },
  'Qualifying Appointment requests': {
    name: 'Kualifikasi Permintaan Janji',
    summary:
      'Otomasi ini mengevaluasi permintaan demo menggunakan aturan yang konsisten dan telah ditentukan untuk menilai dan mengkualifikasikan setiap prospek secara adil.',
  },
  'Score Salesforce Leads Securely': {
    name: 'Nilai Prospek Salesforce dengan Aman',
    summary:
      'Otomasi ini mengevaluasi prospek Salesforce baru atau yang diperbarui menggunakan GPT-5 sambil menyembunyikan semua informasi sensitif.',
  },
  'AI-Powered Lead Scoring with Salesforce, GPT-5, and Slack with Data Masking': {
    name: 'Penilaian Prospek Bertenaga AI dengan Salesforce, GPT-5, dan Slack dengan Masking Data',
    summary:
      'Secara otomatis menilai prospek dari Salesforce berdasarkan kemungkinan konversi mereka menggunakan GPT-5.',
  },
  'Create Deals From LinkedIn Leads': {
    name: 'Buat Deal dari Prospek LinkedIn',
    summary:
      'Mengambil setiap pengiriman Google Forms baru dan secara otomatis membuat deal yang sesuai di Pipedrive.',
  },
  'Automate Webflow Lead Capture to Pipedrive CRM': {
    name: 'Otomatiskan Penangkapan Prospek Webflow ke CRM Pipedrive',
    summary:
      'Otomasi ini mengubah setiap pengiriman formulir Webflow menjadi prospek Pipedrive yang bersih dan sepenuhnya terstruktur.',
  },
  'Send Slack Alerts for Prospects': {
    name: 'Kirim Notifikasi Slack untuk Prospek',
    summary:
      'Dapatkan notifikasi Slack real-time untuk prospek yang tertarik di Woodpecker sehingga tim penjualan Anda tidak pernah melewatkan prospek berkeinginan tinggi.',
  },
  'Log Won Deals With Commission': {
    name: 'Catat Deal yang Menang Beserta Komisi',
    summary:
      'Secara otomatis mencatat deal HubSpot yang berhasil ditutup ke lembar kerja Microsoft Excel untuk pelacakan komisi.',
  },
  'AI email reply based on HubSpot data + Slack approval': {
    name: 'Balasan Email AI berdasarkan Data HubSpot + Persetujuan Slack',
    summary:
      'Otomasi ini membuat balasan email yang dipersonalisasi dan peka konteks dengan menarik riwayat HubSpot lengkap kontak.',
  },
  'Automate Upselling/Cross-selling': {
    name: 'Otomatiskan Upselling/Cross-selling',
    summary:
      'Otomasi ini mengidentifikasi pelanggan yang sudah melakukan pembelian dan menentukan produk pelengkap yang paling relevan untuk ditawarkan berikutnya.',
  },
  'Send Telegram Notification for New WooCommerce Orders': {
    name: 'Kirim Notifikasi Telegram untuk Pesanan WooCommerce Baru',
    summary:
      'Otomasi ini memberi tahu Anda secara instan dengan mengirimkan notifikasi Telegram real-time setiap kali pesanan WooCommerce baru masuk.',
  },
  'Nurture Leads With Personalized Content': {
    name: 'Bina Prospek dengan Konten yang Dipersonalisasi',
    summary:
      'Otomasi ini secara otomatis mengirimkan artikel, wawasan, dan sumber daya yang relevan ke setiap prospek berdasarkan minat dan tahap mereka.',
  },
  'Create Zoho CRM leads from Google Calendar events enriched with Google Contacts': {
    name: 'Buat Prospek Zoho CRM dari Acara Google Calendar yang Diperkaya dengan Google Contacts',
    summary:
      'Otomasi ini mengubah acara Google Calendar baru menjadi prospek Zoho CRM yang lengkap dengan memperkaya detail peserta dengan data dari Google Contacts.',
  },
  'Auto-Qualify & Enrich Leads into HubSpot': {
    name: 'Kualifikasi & Perkaya Prospek Otomatis ke HubSpot',
    summary:
      'Alur ini secara otomatis meneliti setiap prospek Fillout baru, menilai kesesuaiannya, dan memperkaya prospek berkualitas tinggi dengan detail perusahaan yang terverifikasi.',
  },
  'Enrich Company Data In Sheets': {
    name: 'Perkaya Data Perusahaan di Sheets',
    summary:
      'Secara otomatis meneliti perusahaan baru dari spreadsheet Anda dan mengisi intelijen penjualan utama seperti domain, LinkedIn, harga, integrasi.',
  },
  'Complete Webflow to Pipedrive Integration with Smart Phone Formatting': {
    name: 'Integrasi Webflow ke Pipedrive Lengkap dengan Pemformatan Nomor Telepon Cerdas',
    summary:
      'Otomasi ini mengkonversi setiap pengiriman Webflow menjadi prospek Pipedrive yang bersih dan sepenuhnya terstruktur.',
  },
  'Create Google Calendar events from new Trello cards': {
    name: 'Buat Acara Google Calendar dari Kartu Trello Baru',
    summary:
      'Otomasi ini membuat acara Google Calendar untuk setiap kartu Trello baru, menggunakan tanggal jatuh tempo kartu atau tanggal yang dihitung saat tidak ada.',
  },
  'Sync Google Contacts to ActiveCampaign': {
    name: 'Sinkronkan Google Contacts ke ActiveCampaign',
    summary:
      'Otomasi ini menjaga Google Contacts, ActiveCampaign, dan Google Sheet Anda tetap selaras dengan membuat atau memperbarui catatan saat kontak baru muncul.',
  },
  'Automate Reddit Trend Analysis with GPT-4 and Slack/Gmail Distribution': {
    name: 'Otomatiskan Analisis Tren Reddit dengan GPT-4 & Distribusi Slack/Gmail',
    summary:
      'Secara otomatis mengumpulkan postingan Reddit yang sedang trending, merangkumnya dengan AI, dan mendistribusikan wawasan ke Slack dan Gmail setiap hari.',
  },
  'Download TikTok Videos without Watermarks and Upload to Google Drive': {
    name: 'Unduh Video TikTok tanpa Watermark & Unggah ke Google Drive',
    summary:
      'Secara otomatis mengunduh video TikTok tanpa watermark dari URL yang diberikan, mengkonversinya menjadi MP4, mengunggahnya ke Google Drive.',
  },
  'Create SEO Blogs From Topic Lists': {
    name: 'Buat Blog SEO dari Daftar Topik',
    summary:
      'Otomasi ini secara otomatis meneliti topik yang dipilih dan menghasilkan postingan blog yang sepenuhnya ditulis dan dioptimalkan SEO dengan gambar yang relevan setiap hari.',
  },
  'Track Top YouTube Videos': {
    name: 'Lacak Video YouTube Teratas',
    summary:
      'Otomatiskan penelitian kompetitif Anda dengan memantau saluran YouTube tertentu dan mencatat video berkinerja tertinggi mereka ke database Google Sheets terstruktur.',
  },
  'Collect & Store Restaurant Customer Feedback': {
    name: 'Kumpulkan & Simpan Umpan Balik Pelanggan Restoran',
    summary:
      'Secara otomatis menganalisis umpan balik pelanggan restoran dari Google Forms menggunakan AI untuk menghasilkan ringkasan ringkas dan rekomendasi manajemen yang dapat ditindaklanjuti.',
  },
  'Monitor Website Changes Automatically': {
    name: 'Pantau Perubahan Website Secara Otomatis',
    summary:
      'Otomasi ini terus memantau website Anda (atau website pilihan apa pun) dan memberi tahu Anda saat ada yang berubah.',
  },
  'Generate SEO Keywords From Website': {
    name: 'Buat Kata Kunci SEO dari Website',
    summary:
      'Otomasi ini mengubah halaman web apa pun menjadi aset SEO yang bersih dengan menghasilkan ringkasan topik dan daftar tepat dari 90 kata kunci bernilai tinggi.',
  },
  'Generate Business Documents from Google Sheets': {
    name: 'Buat Dokumen Bisnis dari Google Sheets',
    summary:
      'Otomatiskan proses penerbitan dokumen end-to-end Anda dengan mengambil data dari Google Sheets untuk menghasilkan PDF yang dipersonalisasi.',
  },
  'Scrape and Summarize Website using Chat UI': {
    name: 'Scrape & Rangkum Website menggunakan Antarmuka Obrolan',
    summary:
      'Otomasi ini secara instan mengubah halaman web apa pun menjadi ringkasan yang bersih dan terstruktur, menghemat jam membaca.',
  },
  'AI Marketing Agent for Lead Generation: Reddit + OpenAI+ Gmail': {
    name: 'Agen Marketing AI untuk Generasi Prospek: Reddit + OpenAI + Gmail',
    summary:
      'Otomasi ini menganalisis website Anda untuk memahami niche Anda, kemudian memindai postingan trending teratas Reddit untuk menemukan diskusi yang mengandung peluang bisnis bernilai tinggi.',
  },
  'Collect Instagram Reels In Drive': {
    name: 'Kumpulkan Instagram Reels di Drive',
    summary:
      'Secara otomatis menyimpan Reels yang Anda terima di DM ke Google Drive, mencatat setiap satu untuk pelacakan.',
  },
  'Send Sentiment-Aware Emails With Coupons': {
    name: 'Kirim Email Peka-Sentimen dengan Kupon',
    summary:
      'Secara otomatis mengubah pembelian + umpan balik pelanggan menjadi email marketing yang dipersonalisasi dalam nada pilihan Anda.',
  },
  'Create ActiveCampaign Contacts From Form': {
    name: 'Buat Kontak ActiveCampaign dari Formulir',
    summary:
      'Secara otomatis mengubah setiap pengiriman formulir baru menjadi kontak di ActiveCampaign.',
  },
  'Discover and Repurpose LinkedIn Content Automatically': {
    name: 'Temukan & Daur Ulang Konten LinkedIn Secara Otomatis',
    summary:
      'Otomasi ini memindai LinkedIn setiap hari untuk menemukan postingan segar, menyaring duplikat, dan memperkaya konten baru dengan ide daur ulang yang dibuat AI.',
  },
  'Twitter Virtual AI Influencer': {
    name: 'Influencer AI Virtual Twitter',
    summary:
      'Otomasi ini membuat dan memposting tweet orisinal setiap hari kerja dengan menghasilkan konten berdasarkan niche, suara, dan inspirasi khusus yang Anda tentukan.',
  },
  'Daily Website Data Extraction with Firecrawl and Telegram Alerts': {
    name: 'Ekstraksi Data Website Harian dengan Firecrawl & Notifikasi Telegram',
    summary:
      'Otomasi ini mengikis dan menyusun data website harian menggunakan Firecrawl dan mengirimkan hasilnya ke Telegram setiap pagi pukul 8.',
  },
  'Summarize and Analyze YouTube Videos': {
    name: 'Rangkum & Analisis Video YouTube',
    summary:
      'Chatbot interaktif yang mengekstrak ID video YouTube dari input pengguna, mengambil detail dan transkrip, menyimpan hasilnya di Google Sheets.',
  },
  'Email Outreach Drafter Based on HubSpot Data': {
    name: 'Pembuat Draf Penjangkauan Email Berdasarkan Data HubSpot',
    summary:
      'Otomasi ini mengambil kontak Decision Maker dari HubSpot setiap pagi dan menggunakan AI untuk menganalisis atribut CRM mereka.',
  },
  'Generate and Qualify Leads From Slack': {
    name: 'Buat & Kualifikasikan Prospek dari Slack',
    summary:
      'Otomasi ini mengubah permintaan prospek Slack menjadi prospek yang dikualifikasikan dengan mencari web, memperkaya hasil dengan AI.',
  },
  'Turn Product Reviews Into Content Ideas': {
    name: 'Ubah Ulasan Produk Menjadi Ide Konten',
    summary:
      'Ubah ulasan Amazon nyata menjadi ide konten yang menarik tanpa perlu mengangkat jari. Masukkan tautan produk apa pun di Slack.',
  },
  'Extract YouTube Comments to Google Sheets': {
    name: 'Ekstrak Komentar YouTube ke Google Sheets',
    summary:
      'Otomasi ini mengambil komentar dari video YouTube yang dipilih secara harian dan menyimpannya di Google Sheet terstruktur.',
  },
  'Blog Performance Watchdog': {
    name: 'Pengawas Kinerja Blog',
    summary:
      'Otomasi ini memantau metrik blog Anda dan mengirimkan email kepada Anda secara instan saat postingan mencapai ambang kinerja utama.',
  },
  'Extract Facebook Group Posts with Apify': {
    name: 'Ekstrak Postingan Grup Facebook dengan Apify',
    summary:
      'Otomasi ini secara instan mengambil postingan Grup Facebook terbaru ke Google Sheet.',
  },
  'Summarize YouTube Videos from Transcript': {
    name: 'Rangkum Video YouTube dari Transkrip',
    summary:
      'Otomasi ini memungkinkan Anda menempelkan tautan YouTube ke antarmuka obrolan dan langsung menerima ringkasan yang jelas dan dapat ditindaklanjuti.',
  },
  'Generate Summaries of RSS Feeds': {
    name: 'Buat Ringkasan Umpan RSS',
    summary:
      'Buat sistem pemantauan berita cerdas yang mengagregasi artikel dari beberapa umpan RSS dan menggunakan Gemini AI untuk menghasilkan ringkasan terstruktur.',
  },
  'Track YouTube Channel Data': {
    name: 'Lacak Data Saluran YouTube',
    summary:
      'Otomatiskan penelitian kompetitif dan pelacakan kinerja Anda dengan mengumpulkan metrik saluran YouTube yang komprehensif.',
  },
  'Develop Content Ideas Using Google Trends': {
    name: 'Kembangkan Ide Konten Menggunakan Google Trends',
    summary:
      'Otomasi ini berjalan setiap hari untuk menganalisis Google Trends, mengikis berita yang relevan, dan menggunakan AI untuk menghasilkan ide konten dan kata kunci SEO.',
  },
  'Research Products and Generate SEO Content': {
    name: 'Teliti Produk & Buat Konten SEO',
    summary:
      'Otomasi ini meneliti produk secara online dan menggunakan AI untuk menghasilkan judul SEO, deskripsi, kata kunci, dan tulisan produk lengkap secara otomatis.',
  },
  'Extract URLs From Sitemaps': {
    name: 'Ekstrak URL dari Sitemap',
    summary:
      'Secara otomatis mengekstrak setiap URL dari indeks sitemap website dan sub-sitemap bertingkat ke inventaris Google Sheets.',
  },
  'Content Quality Gate for SEO Agencies': {
    name: 'Gerbang Kualitas Konten untuk Agensi SEO',
    summary:
      'Secara otomatis menjalankan pemeriksaan plagiarisme dan konten AI pada setiap kiriman klien dan menyimpan laporan kualitas di dashboard.',
  },
  'Newsletter Approval Workflow': {
    name: 'Alur Kerja Persetujuan Newsletter',
    summary:
      'Mengotomatiskan proses tinjauan newsletter dengan mengirimkan permintaan persetujuan dan melanjutkan alur kerja hanya setelah peninjau menyetujui atau menolak.',
  },
  'Daily Industry News Digest': {
    name: 'Ringkasan Berita Industri Harian',
    summary:
      'Alur ini mengikis situs berita setiap hari, menyaring untuk artikel yang diterbitkan hari ini, merangkumnya, dan mengirimkan ringkasan lengkap kepada Anda.',
  },
  'Planner assignment autopilot': {
    name: 'Autopilot Penugasan Planner',
    summary:
      'Secara otomatis menghasilkan paket konteks AI saat tugas Planner ditugaskan, memberi tahu penugasan di Teams, membuat tugas To Do, dan mencatat tugas di SharePoint.',
  },
  'Store Survey Results in a Table': {
    name: 'Simpan Hasil Survei di Tabel',
    summary: 'Catat respons survei ke tabel.',
  },
  'Scan Shipping Labels and Update Records': {
    name: 'Pindai Label Pengiriman & Perbarui Catatan',
    summary:
      'Otomasi ini secara instan mengekstrak detail penerima dan pelacakan dari gambar label pengiriman yang diunggah menggunakan AI.',
  },
  'Convert Audio To Text': {
    name: 'Konversi Audio ke Teks',
    summary:
      'Otomasi ini mengkonversi audio apa pun yang diunggah menjadi teks yang bersih dan akurat memberikan Anda catatan tertulis instan.',
  },
  'Trigger Daily Action Plans From Claude': {
    name: 'Picu Rencana Aksi Harian dari Claude',
    summary:
      'Otomasi ini membiarkan Claude memicu rencana aksi harian yang terstruktur melalui alat MCP, mengubah prompt sederhana menjadi tugas yang jelas dan diprioritaskan.',
  },
  'Generate Client Proposals After Calls': {
    name: 'Buat Proposal Klien Setelah Panggilan',
    summary:
      'Mengubah input formulir pasca-panggilan menjadi deck proposal klien yang terstruktur dan bermerek secara otomatis.',
  },
  'Salesforce Lead Capture with GPT-4 Personalized Email & SMS Follow-Up': {
    name: 'Penangkapan Prospek Salesforce dengan Tindak Lanjut Email & SMS Personalisasi GPT-4',
    summary:
      'Otomasi ini secara instan membuat prospek Salesforce dan mengirimkan pesan yang dipersonalisasi melalui email atau SMS.',
  },
  'Learn Customer Onboarding Automation': {
    name: 'Pelajari Otomasi Orientasi Pelanggan',
    summary:
      'Otomasi ini mengubah setiap pendaftaran website baru menjadi perjalanan orientasi yang sepenuhnya terkelola.',
  },
  'Automated Email Routing for Sales': {
    name: 'Perutean Email Otomatis untuk Penjualan',
    summary:
      'Otomasi ini merutekan email penjualan masuk ke perwakilan atau saluran yang tepat berdasarkan aturan yang telah ditentukan.',
  },
  'Add Google Sheets Leads to Odoo CRM': {
    name: 'Tambahkan Prospek Google Sheets ke Odoo CRM',
    summary:
      'Sinkronkan data prospek Anda dengan mulus dengan secara otomatis membuat prospek Odoo CRM setiap kali baris baru ditambahkan ke spreadsheet Google Sheets yang ditentukan.',
  },
  'Auto-Send Contracts for Signature': {
    name: 'Kirim Kontrak Otomatis untuk Ditandatangani',
    summary:
      'Secara otomatis menganalisis kontrak baru, mendeteksi informasi yang hilang, dan mengirimkan kontrak untuk ditandatangani dengan pelacakan dan notifikasi.',
  },
  'Send Branded Web Quotes as PDFs': {
    name: 'Kirim Penawaran Web Bermerek sebagai PDF',
    summary: 'Mengkonversi halaman penawaran menjadi PDF bermerek dan secara otomatis mengirimkannya ke pelanggan.',
  },
  'AI Quote Creation and Approval Coordinator': {
    name: 'Koordinator Pembuatan & Persetujuan Penawaran AI',
    summary:
      'Koordinator Pembuatan & Persetujuan Penawaran AI — secara otomatis membuat dan merutekan ringkasan penawaran untuk persetujuan setiap kali deal HubSpot mencapai tahap Presentasi Dijadwalkan.',
  },
  'Create Odoo CRM leads from Typeform responses': {
    name: 'Buat Prospek Odoo CRM dari Respons Typeform',
    summary:
      'Sinkronkan pengiriman Typeform baru ke Odoo CRM sebagai prospek secara otomatis untuk menghilangkan entri data manual.',
  },
  'Analyze Prospect Calls': {
    name: 'Analisis Panggilan Prospek',
    summary:
      'Otomasi ini menganalisis transkrip rapat dan menilai setiap panggilan untuk mengungkapkan seberapa kuat prospek sebenarnya.',
  },
  'Add Active Campaign contacts from new Google Form responses': {
    name: 'Tambahkan Kontak ActiveCampaign dari Respons Google Form Baru',
    summary:
      'Secara otomatis membuat kontak baru di ActiveCampaign setiap kali Google Form dikirimkan.',
  },
  'Create Salesforce accounts based on Excel File data': {
    name: 'Buat Akun Salesforce berdasarkan Data File Excel',
    summary:
      'Otomasi ini mengkonversi setiap baris baru di Google Sheet Anda menjadi Akun dan Kontak Salesforce yang bersih dan terstruktur dengan benar tanpa duplikat.',
  },
  'Save new Gmail emails matching certain traits to a Google Spreadsheet': {
    name: 'Simpan Email Gmail Baru yang Cocok dengan Kriteria Tertentu ke Google Spreadsheet',
    summary:
      'Secara otomatis menyimpan email Gmail yang difilter ke Google Sheets untuk pencadangan dan referensi yang mudah.',
  },
  'Sync FreeAgent Contacts To Google': {
    name: 'Sinkronkan Kontak FreeAgent ke Google',
    summary:
      'Secara otomatis menyinkronkan kontak baru atau yang diperbarui dari FreeAgent ke Google Contacts.',
  },
  'Create FreeAgent Contacts From Stripe Customers': {
    name: 'Buat Kontak FreeAgent dari Pelanggan Stripe',
    summary:
      'Saat pelanggan baru dibuat di Stripe, alur ini secara otomatis membuat kontak yang cocok di FreeAgent.',
  },
  'Create Xero Invoices From Pipedrive Deals': {
    name: 'Buat Invoice Xero dari Deal Pipedrive',
    summary:
      'Otomasi ini mengubah deal Pipedrive baru menjadi invoice Xero draf dengan menarik item produk.',
  },
  'Automate Financial Operations with GPT-4.1 CFO Finance Team': {
    name: 'Otomatiskan Operasi Keuangan dengan Tim Keuangan CFO GPT-4.1',
    summary:
      'Otomasi ini bertindak sebagai CFO virtual, langsung mengklasifikasikan kueri dan data keuangan yang diunggah, menganalisis angka-angka.',
  },
  'Create Validated Xero Contacts From Sheets': {
    name: 'Buat Kontak Xero Tervalidasi dari Sheets',
    summary:
      'Secara otomatis memvalidasi baris kontak di Google Sheets dan membuat (atau memperbarui) kontak yang cocok di Xero.',
  },
  'Create Salesforce Opportunities From Invoices Automatically': {
    name: 'Buat Peluang Salesforce dari Invoice Secara Otomatis',
    summary:
      'Otomasi ini mengambil setiap PDF invoice baru yang diunggah ke Google Drive dan mengubahnya menjadi Peluang Salesforce yang sepenuhnya terstruktur.',
  },
  'Create Zoho Invoice Contacts From HubSpot': {
    name: 'Buat Kontak Invoice Zoho dari HubSpot',
    summary:
      'Template ini menghubungkan HubSpot dan Zoho Invoice untuk secara otomatis membuat kontak penagihan dari data CRM.',
  },
  'Scrap Events Data Into Google Sheets': {
    name: 'Ambil Data Acara ke Google Sheets',
    summary:
      'Bangun database acara otomatis dengan mengikis daftar 10times menggunakan ekstraksi berbasis AI Firecrawl.',
  },
  'Scrape Events Data Into Google Sheets': {
    name: 'Ambil Data Acara ke Google Sheets',
    summary:
      'Bangun database acara otomatis dengan mengikis daftar 10times menggunakan ekstraksi berbasis AI Firecrawl.',
  },
  'Block Risky Content Before It Goes Live': {
    name: 'Blokir Konten Berisiko Sebelum Dipublikasikan',
    summary:
      'Memantau Google Sheet untuk draf blog baru, menandai konten berisiko atau plagiarisme tinggi untuk ditinjau, dan secara otomatis menerbitkan draf yang bersih ke HubSpot.',
  },
  'Create Client Onboarding Presentation': {
    name: 'Buat Presentasi Orientasi Klien',
    summary: 'Buat presentasi orientasi klien yang dipersonalisasi secara otomatis dari pengiriman Typeform.',
  },
  'Automatically Analyze Sales Calls': {
    name: 'Analisis Panggilan Penjualan Secara Otomatis',
    summary:
      'Mengambil transkripsi panggilan baru dari Google Drive dan menggunakan pelatih penjualan AI untuk menganalisis panggilan tersebut.',
  },
  'Collect & Store Restaurant Customer Feedback (v2)': {
    name: 'Kumpulkan & Simpan Umpan Balik Pelanggan Restoran',
    summary:
      'Otomasi yang merangkum umpan balik Google Form dengan AI dan mengirimkan rekomendasi tindakan yang jelas kepada manajer.',
  },
  'AI-Powered Image Safety Filter': {
    name: 'Filter Keamanan Gambar Bertenaga AI',
    summary:
      'Otomasi ini secara instan menandai gambar sensitif menggunakan AI dan memindahkannya ke folder aman.',
  },
  'Discover and Repurpose Instagram Content': {
    name: 'Temukan & Daur Ulang Konten Instagram',
    summary:
      'Otomasi ini memantau kreator Instagram untuk menemukan reel berkinerja tinggi, kemudian menggunakan AI untuk mentranskrip, menganalisis.',
  },
  'Analyze Reddit Posts with AI to Identify Business Opportunities': {
    name: 'Analisis Postingan Reddit dengan AI untuk Mengidentifikasi Peluang Bisnis',
    summary:
      'Otomasi ini memindai Reddit setiap hari untuk menemukan masalah nyata yang dihadapi orang dan mengubahnya menjadi peluang bisnis.',
  },
  'Create SEO Titles for Shorts/Reels': {
    name: 'Buat Judul SEO untuk Shorts/Reels',
    summary: 'Otomasi ini menghasilkan deskripsi dan judul reel yang kaya SEO.',
  },
  'Automatically File Incoming Clerky PDFs (v2)': {
    name: 'Arsipkan PDF Clerky Masuk Secara Otomatis',
    summary:
      'Otomasi ini mendeteksi email Clerky masuk dan secara otomatis mengarsipkan semua PDF terlampir di lokasi yang benar.',
  },
  'Generate Presentations Automatically': {
    name: 'Buat Presentasi Secara Otomatis',
    summary:
      'Otomasi ini mengubah pengiriman formulir sederhana menjadi dek presentasi buatan AI yang diriset lengkap dengan Gamma.',
  },
  'Create Active Campaign contacts from new Google Form responses': {
    name: 'Buat Kontak ActiveCampaign dari Respons Google Form Baru',
    summary:
      'Secara otomatis membuat kontak baru di ActiveCampaign setiap kali formulir Google Form dikirimkan.',
  },
  'Send Slack Alerts for Big Orders': {
    name: 'Kirim Notifikasi Slack untuk Pesanan Besar',
    summary:
      'Otomasi ini mendeteksi pelanggan bernilai tinggi di Shopify, menarik riwayat pembelian, dan mengirimkan peringatan VIP ke Slack.',
  },
  '“Stale PR” Auto-Pinger': {
    name: 'Auto-Pinger PR yang Terabaikan',
    summary:
      'Berjalan setiap hari kerja untuk menemukan pull request terbuka yang tidak aktif lebih dari 15 hari dan mengirim komentar pengingat otomatis pada PR.',
  },
  '"Stale PR" Auto-Pinger': {
    name: 'Auto-Pinger PR yang Terabaikan',
    summary:
      'Berjalan setiap hari kerja untuk menemukan pull request terbuka yang tidak aktif lebih dari 15 hari dan mengirim komentar pengingat otomatis pada PR.',
  },
  'Create Invoice Ninja Tasks From Trello': {
    name: 'Buat Tugas Invoice Ninja dari Trello',
    summary:
      'Ketika kartu Trello baru dibuat, alur ini secara otomatis membuat tugas yang sesuai di Invoice Ninja.',
  },
  'Create Jira Issues From Web Forms': {
    name: 'Buat Isu Jira dari Formulir Web',
    summary:
      'Secara otomatis mengubah setiap pengiriman formulir web menjadi isu Jira yang terstruktur dengan pelapor dan tenggat waktu.',
  },
  'Create Trello Cards From GitLab Issues': {
    name: 'Buat Kartu Trello dari Isu GitLab',
    summary:
      'Secara otomatis membuat kartu Trello baru setiap kali ada isu baru yang dibuat di proyek GitLab.',
  },
  'Automated Email Marketing Campaign': {
    name: 'Kampanye Email Marketing Otomatis',
    summary:
      'Otomasi ini mengambil prospek dari Google Sheets dan menggunakan AI untuk membuat serta mengirim email yang dipersonalisasi.',
  },
  'Analyze Emails and Save Attachments': {
    name: 'Analisis Email dan Simpan Lampiran',
    summary:
      'Gunakan AI untuk menyusun draf balasan email secara otomatis dan mengekstrak lampiran langsung ke Google Drive.',
  },
  'Extract Purchase Orders from Gmail': {
    name: 'Ekstrak Pesanan Pembelian dari Gmail',
    summary:
      'Ekstrak detail pesanan pembelian dari Gmail secara otomatis menggunakan AI dan catat hasilnya ke Google Sheets.',
  },
};

/**
 * Translate a template name + summary to Indonesian.
 * Returns the original values if no translation is found.
 */
export function translateTemplate(
  name: string,
  summary: string | null | undefined,
): { name: string; summary: string | null | undefined } {
  const translation = TEMPLATE_NAME_TRANSLATIONS_ID[name];
  if (!translation) return { name, summary };
  return {
    name: translation.name,
    summary: translation.summary,
  };
}
