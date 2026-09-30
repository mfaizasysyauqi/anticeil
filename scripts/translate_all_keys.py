import json
import re
import os

def build_full_translation():
    with open('packages/web/public/locales/en/translation.json', 'r', encoding='utf-8') as f:
        en = json.load(f)

    # Existing translations
    try:
        with open('packages/web/public/locales/id/translation.json', 'r', encoding='utf-8') as f:
            id_data = json.load(f)
    except:
        id_data = {}

    # Comprehensive dictionary of terms, sentences and templates
    full_dict = {
        # ICU & Specific Keys
        "agentStillUsedNamed": "{count, plural, =1 {Masih digunakan oleh {flows}. Hapus agen dari alur tersebut terlebih dahulu.} other {Masih digunakan oleh # alur yang dipublikasikan: {flows}. Hapus agen dari masing-masing alur terlebih dahulu.}}",
        "agentStillUsedPartlyNamed": "Masih digunakan oleh {count} alur yang dipublikasikan, termasuk {flows}. Hapus agen dari masing-masing alur terlebih dahulu.",
        "agentStillUsedUnnamed": "{count, plural, =1 {Masih digunakan oleh satu alur yang dipublikasikan. Hapus agen darinya terlebih dahulu.} other {Masih digunakan oleh # alur yang dipublikasikan. Hapus agen dari alur-alur tersebut terlebih dahulu.}}",
        "agentMoveNothingBreaks": "Setiap alat yang digunakannya juga berfungsi di {project}. Mulai sekarang agen ini akan bekerja dengan akun, file, dan alur proyek tersebut.",
        "agentMoveUsesTargetAccounts": "Agen ini menggunakan akun dari {project}.",
        "agentMoveAndMore": "dan {count} lainnya",
        "agentMoveLosesConnections": "Memindahkan agen ini akan memutus koneksi alat berikut di proyek baru:",
        "agentMoveLosesFlows": "Alur berikut tidak akan dapat lagi memicu atau menjalankan agen ini:",
        "agentMoveLosesKnowledge": "Basis pengetahuan berikut tidak akan terbawa ke proyek baru:",
        "agentMoveLosesMembers": "Anggota yang saat ini memiliki akses khusus akan kehilangan akses di proyek baru.",
        "pieceNotAvailableOnInstanceNote": "Komponen {pieceName} (versi {pieceVersion}) tidak terpasang pada instans ini atau telah disembunyikan oleh admin. Pasang komponen ini atau ganti langkah ini ke versi yang terpasang.",
        "MajorUpgradeNote": "Pengaturan langkah akan diatur ulang, Anda harus mengonfigurasi ulang dan menguji ulang langkah ini.",
        "incompleteSteps": "{count, plural, =1 {# langkah belum lengkap} other {# langkah belum lengkap}}",
        "testPieceWebhookTriggerNote": "Uji pemicu webhook dengan mengirimkan payload sampel dari penyedia.",
        
        # Descriptions & Prompts
        "Describe a task for your agent… e.g. research our competitors and send me a weekly brief": "Deskripsikan tugas untuk agen Anda… mis. riset kompetitor kami dan kirimkan ringkasan mingguan ke saya",
        "Enrich a new lead with company details and write the first email": "Perkaya prospek baru dengan detail perusahaan dan tulis email pertama",
        "It may have been deleted by someone else on the project.": "Mungkin telah dihapus oleh orang lain di proyek ini.",
        "It may have been deleted, or the connection dropped.": "Mungkin telah dihapus, atau koneksi terputus.",
        "Its instructions, its tools, and every conversation held with it are deleted for good. Any draft flow step using it will break.": "Instruksi, alat, dan setiap riwayat obrolan dengannya akan dihapus permanen. Setiap langkah alur draf yang menggunakannya akan rusak.",
        "Its instructions, its tools, and every conversation held with it go with it.": "Instruksi, alat, dan setiap riwayat obrolan dengannya akan ikut dipindahkan.",
        "Your role in {project} cannot create agents there.": "Peran Anda di {project} tidak memiliki izin untuk membuat agen di sana.",
        "Nothing breaks: every tool it uses is connected there too.": "Tidak ada yang rusak: setiap alat yang digunakannya juga terhubung di sana.",
        "Read a support ticket, tag its severity, and route it to a team": "Baca tiket bantuan, tandai tingkat keparahannya, dan teruskan ke tim yang sesuai",
        "Reply to refund requests. Check the order in Stripe first, and escalate anything over $200.": "Balas permintaan pengembalian dana. Periksa pesanan di Stripe terlebih dahulu, dan eskalasikan permintaan di atas $200.",
        "Research a company and send me a cited brief on it": "Lakukan riset terhadap perusahaan dan kirimi saya ringkasan beserta sumbernya",
        "Research keywords for a topic and draft a post that targets them": "Riset kata kunci untuk sebuah topik dan buat draf postingan yang menargetkannya",
        "Try “Only reply to paying customers” or “Add Slack and Notion”.": "Coba “Hanya balas pelanggan berbayar” atau “Tambahkan Slack dan Notion”.",
        "Give the agent a real task. It answers on the settings beside you, so you can watch a change work before every flow gets it.": "Berikan tugas nyata kepada agen. Agen akan merespons di panel pengaturan di samping Anda, sehingga Anda dapat melihat perubahan sebelum alur menggunakannya.",
        "Your changes couldn't be staged for testing. Try again.": "Perubahan Anda tidak dapat disiapkan untuk pengujian. Coba lagi.",
        "The step did not complete successfully. Check the step configuration, or contact support if the issue persists.": "Langkah tidak selesai dengan sukses. Periksa konfigurasi langkah, atau hubungi dukungan jika masalah berlanjut.",
        "The connected account could not authenticate with the service. Try reconnecting the account, or check that the credentials have not expired or been revoked.": "Akun yang terhubung tidak dapat mengautentikasi ke layanan. Coba hubungkan ulang akun, atau periksa apakah kredensial belum kedaluwarsa atau dicabut.",
        "The connected account does not have permission for this action.": "Akun yang terhubung tidak memiliki izin untuk tindakan ini.",
        "The service could not find the requested resource. Double-check the IDs or names in the step input.": "Layanan tidak dapat menemukan sumber daya yang diminta. Periksa kembali ID atau nama pada input langkah.",
        "The service did not respond in time. This is usually a temporary issue — try the step again in a few moments.": "Layanan tidak merespons tepat waktu. Ini biasanya masalah sementara — coba langkah lagi beberapa saat lagi.",
        "The service is rate-limiting this account. Wait a few minutes and try again, or reduce how frequently this flow runs.": "Layanan membatasi laju permintaan akun ini (rate-limit). Tunggu beberapa menit dan coba lagi, atau kurangi frekuensi eksekusi alur ini.",
        "The service reported an internal error. This isn't an issue with your configuration — try again later, and check the service's status page if it persists.": "Layanan melaporkan kesalahan internal. Ini bukan masalah konfigurasi Anda — coba lagi nanti, dan periksa halaman status layanan jika berlanjut.",
        "The service rejected the request. Review the step input and verify each field matches what the service expects.": "Layanan menolak permintaan. Tinjau input langkah dan pastikan setiap bidang sesuai dengan yang diharapkan layanan.",
        "The service rejected the request. Review the step input and the message below for details.": "Layanan menolak permintaan. Tinjau input langkah dan pesan di bawah ini untuk rincian lebih lanjut.",
        "The step did not complete successfully. Check the step configuration and the message below.": "Langkah tidak selesai dengan berhasil. Periksa konfigurasi langkah dan pesan di bawah ini.",
        "Your most reliable teammate for getting work done, powered by your tools and guided by your words.": "Rekan tim paling andal untuk menyelesaikan pekerjaan, didukung oleh alat Anda dan dipandu oleh kata-kata Anda.",
        "Your project has a provider, but writing an agent for you needs one turned on for chat.": "Proyek Anda memiliki penyedia AI, tetapi pembuatan agen membutuhkan penyedia yang diaktifkan untuk obrolan.",
        "Run failed due to output of steps exceeding the log size limit of {logSizeLimit} MB": "Eksekusi gagal karena output langkah melebihi batas ukuran log {logSizeLimit} MB",
        "Run failed due to exceeding the memory limit of {memoryLimit} MB": "Eksekusi gagal karena melebihi batas memori {memoryLimit} MB",
        "Run exceeded {timeout} seconds, try to optimize your steps.": "Eksekusi melebihi {timeout} detik, coba optimalkan langkah-langkah Anda.",
        "Run failed with an internal error, contact support.": "Eksekusi gagal karena kesalahan internal, hubungi dukungan.",
        "File Input i.e a url or file passed from a previous step": "Input File yaitu URL atau file yang diteruskan dari langkah sebelumnya",
        "Without filters, this step returns the most recent results. Add a filter to narrow them.": "Tanpa filter, langkah ini mengembalikan hasil terbaru. Tambahkan filter untuk mempersempit hasil.",
        "{count, plural, =1 {# filter applied} other {# filters applied}} · newest first": "{count, plural, other {# filter diterapkan · terbaru lebih dulu}}",
        "To create an agent, you'll first need to connect to OpenAI in platform settings.": "Untuk membuat agen, Anda harus terlebih dahulu menghubungkan OpenAI di pengaturan platform.",
        "Some input values were too large to keep in the run logs and are shown as truncated. The step ran with the full values.": "Beberapa nilai input terlalu besar untuk disimpan dalam log eksekusi dan ditampilkan terpotong. Langkah tetap dijalankan dengan nilai lengkap.",
        "Output is too large to display inline ({size}). Download to inspect.": "Output terlalu besar untuk ditampilkan langsung ({size}). Unduh untuk memeriksa.",
        "Logs are kept for {days} days after execution and then deleted.": "Log disimpan selama {days} hari setelah eksekusi lalu dihapus secara otomatis.",
        "Show child steps output on round ({iteration}/{totalIterations})": "Tampilkan output sub-langkah pada putaran ({iteration}/{totalIterations})",
        "Select the items to iterate over from the previous step by clicking on the **Items** input, which should be a **list** of items.\n\nThe loop will iterate over each item in the list and execute the next step for every item.": "Pilih item yang akan diulang dari langkah sebelumnya dengan mengklik input **Items**, yang harus berupa **daftar (list)** item.\n\nPerulangan akan mengulang setiap item dalam daftar dan menjalankan langkah berikutnya untuk setiap item.",
        "Settings will carry over. Retest the step as the output may have changed.": "Pengaturan akan tetap dipertahankan. Uji ulang langkah ini karena output mungkin telah berubah.",
        "Settings will carry over. Retest as the output may have changed.": "Pengaturan akan tetap dipertahankan. Uji ulang karena output mungkin telah berubah.",
        "You're switching to an older patch. Your settings will be kept where possible.": "Anda beralih ke versi patch yang lebih lama. Pengaturan Anda akan dipertahankan jika memungkinkan.",
        "The selected version does not include the current action or trigger. Please choose a different version.": "Versi yang dipilih tidak menyertakan aksi atau pemicu saat ini. Silakan pilih versi yang berbeda.",
        "Run this step to capture sample data. You can then use the result in following steps.": "Jalankan langkah ini untuk mengambil data sampel. Anda kemudian dapat menggunakan hasilnya pada langkah-langkah berikutnya.",
        "You’ll get an email if any flow fails. Only the first failure per flow each day sends an alert. Other failures are summarized in a daily email.": "Anda akan menerima email jika ada alur yang gagal. Hanya kegagalan pertama per alur setiap hari yang mengirimkan peringatan. Kegagalan lainnya dirangkum dalam email harian.",
        "Also email the flow owner when their flow fails, even if they are not in the list below.": "Kirim email juga ke pemilik alur saat alurnya gagal, meskipun mereka tidak ada dalam daftar di bawah ini.",
        
        # Additional common UI terms
        "Data": "Data",
        "Item": "Item",
        "logo": "Logo",
        "Info": "Informasi",
        "Error": "Kesalahan",
        "Input": "Input",
        "JSON": "JSON",
        "HTTP {status}": "HTTP {status}",
    }

    # Common word translation rules for translating phrases/sentences
    word_replacements = [
        ("Activepieces", "Anticeil"),
        ("activepieces", "anticeil"),
        ("is required", "wajib diisi"),
        ("is invalid", "tidak valid"),
        ("is disabled", "dinonaktifkan"),
        ("is enabled", "diaktifkan"),
        ("was deleted", "telah dihapus"),
        ("was created", "telah dibuat"),
        ("was updated", "telah diperbarui"),
        ("was published", "telah dipublikasikan"),
        ("has been deleted", "telah dihapus"),
        ("has been created", "telah dibuat"),
        ("has been updated", "telah diperbarui"),
        ("has been saved", "telah disimpan"),
        ("has been published", "telah dipublikasikan"),
        ("Are you sure you want to", "Apakah Anda yakin ingin"),
        ("Are you sure?", "Apakah Anda yakin?"),
        ("This action cannot be undone", "Tindakan ini tidak dapat dibatalkan"),
        ("Please enter a valid", "Silakan masukkan yang valid:"),
        ("Please enter", "Silakan masukkan"),
        ("Please select", "Silakan pilih"),
        ("Please choose", "Silakan pilih"),
        ("Click here to", "Klik di sini untuk"),
        ("Click to", "Klik untuk"),
        ("Failed to", "Gagal"),
        ("Successfully", "Berhasil"),
        ("Learn more about", "Pelajari lebih lanjut tentang"),
        ("Learn more", "Pelajari lebih lanjut"),
        ("Read more", "Baca selengkapnya"),
        ("Terms of Service", "Ketentuan Layanan"),
        ("Privacy Policy", "Kebijakan Privasi"),
        ("All rights reserved", "Hak cipta dilindungi undang-undang"),
        ("Select a", "Pilih"),
        ("Choose a", "Pilih"),
        ("Create a", "Buat"),
        ("Add a", "Tambah"),
        ("Delete a", "Hapus"),
        ("Edit a", "Ubah"),
        ("Update a", "Perbarui"),
        ("No data found", "Data tidak ditemukan"),
        ("No results found", "Hasil tidak ditemukan"),
        ("No records found", "Data tidak ditemukan"),
        ("No flows found", "Alur tidak ditemukan"),
        ("No steps found", "Langkah tidak ditemukan"),
        ("No pieces found", "Komponen tidak ditemukan"),
        ("No runs found", "Eksekusi tidak ditemukan"),
        ("No connections found", "Koneksi tidak ditemukan"),
        ("No members found", "Anggota tidak ditemukan"),
        ("No projects found", "Proyek tidak ditemukan"),
        ("No tables found", "Tabel tidak ditemukan"),
        ("Something went wrong", "Terjadi kesalahan"),
        ("An error occurred", "Terjadi kesalahan"),
        ("An unexpected error occurred", "Terjadi kesalahan yang tidak terduga"),
    ]

    # Process all keys
    translated_count = 0
    result = {}
    
    for key, en_val in en.items():
        if key in full_dict:
            result[key] = full_dict[key]
            translated_count += 1
        elif key in id_data and id_data[key] != key:
            val = id_data[key]
            val = val.replace("Activepieces", "Anticeil").replace("activepieces", "anticeil")
            result[key] = val
            translated_count += 1
        else:
            # Automatic translation with phrase replacements
            trans = en_val
            for src, dst in word_replacements:
                trans = re.sub(re.escape(src), dst, trans, flags=re.IGNORECASE)
            
            # If ICU plural format
            plural_match = re.match(r'^\{(\w+),\s*plural,\s*one\s*\{([^}]+)\}\s*other\s*\{([^}]+)\}\}$', trans)
            if plural_match:
                vname = plural_match.group(1)
                oval = plural_match.group(2)
                for src, dst in word_replacements:
                    oval = re.sub(re.escape(src), dst, oval, flags=re.IGNORECASE)
                trans = f"{{{vname}, plural, other {{{oval}}}}}"

            trans = trans.replace("Activepieces", "Anticeil").replace("activepieces", "anticeil")
            result[key] = trans
            translated_count += 1

    print(f"Total keys translated in ID: {len(result)}")
    with open('packages/web/public/locales/id/translation.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    build_full_translation()
