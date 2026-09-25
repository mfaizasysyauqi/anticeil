# Anticeil Cloudflare Serverless Runner

Package ini adalah engine eksekusi serverless untuk **Anticeil Flow** berbasis **Cloudflare Workers**, **Cloudflare Workflows**, dan **Cloudflare Browser Rendering**, terhubung dengan **Supabase PostgreSQL & Realtime**.

---

## 🚀 Fitur Utama
1. **Cloudflare Workflows:** Eksekusi node/step yang *durable* (tahan banting, otomatis retry jika ada step error, tanpa batas timeout 10ms I/O).
2. **Cloudflare Browser Rendering (`@cloudflare/puppeteer`):** Scraping web headless resmi & legal langsung di edge.
3. **Supabase Realtime Sync:** Mengupdate status run (`queued` -> `running` -> `success` / `failed`) langsung ke canvas React Flow.
4. **Cloudflare R2 Storage:** Menyimpan file output & screenshot.

---

## 🛠️ Cara Setup & Deploy (3 Langkah Cepat)

### 1. Buat R2 Bucket & Enable Browser Rendering
Login ke Cloudflare Dashboard atau jalankan via terminal:
```bash
npx wrangler r2 bucket create anticeil-assets
```

### 2. Pasang Secrets ke Cloudflare
Set environment variables sensitif ke Cloudflare:
```bash
npx wrangler secret put SUPABASE_URL
# Masukkan: https://your-project.supabase.co

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Masukkan Service Role Key dari Supabase Settings -> API
```

### 3. Deploy ke Cloudflare Workers
```bash
npm run deploy
```

---

## 📡 Endpoint API

* `GET /health`: Health check status runner.
* `POST /api/v1/runs/dispatch`: Men-dispatch flow run baru ke Cloudflare Workflows instance.
