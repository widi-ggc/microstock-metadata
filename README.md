# MICROSTOCK METADATA GENERATOR (Phase 1)

Aplikasi web untuk menyusun metadata microstock: judul, deskripsi, keywords, kategori, jenis konten, lalu salin atau export ke CSV.

## Isi Phase 1
- Upload gambar (drag & drop), preview, nama file, ukuran, resolusi, aspect ratio
- Isi metadata manual: judul, deskripsi, keywords, kategori, jenis konten, AI generated
- Hitung karakter dan keywords, deteksi duplikat (termasuk singular/plural), validasi per platform
- Salin Judul / Deskripsi / Keywords / Semua / CSV, dan Export CSV
- Demo Mode, mode terang/gelap/sistem, pengaturan tersimpan di browser (localStorage)

## Penting: apa itu Demo Mode?
Phase 1 **belum memakai AI**. Demo Mode hanya menyusun judul, deskripsi, dan keywords dari teks yang Anda isi di "Informasi Gambar" (atau memakai data contoh jika kosong). **Gambar tidak dianalisis.** Analisis gambar dengan AI dikerjakan di Phase 2.

## Struktur folder
```
microstock-metadata/
├── index.html   (tampilan)
├── app.js       (logika aplikasi + konfigurasi platform)
├── style.css    (gaya tambahan)
└── README.md
```

## Cara menjalankan
1. Simpan keempat file dalam satu folder bernama `microstock-metadata`.
2. Klik dua kali `index.html`. Aplikasi terbuka di browser (butuh internet karena Tailwind dimuat dari CDN).

Tidak perlu install apa pun.

## Mengubah batas keywords per platform
Buka `app.js`, cari bagian `PLATFORMS` di baris paling atas, lalu ubah angka `keywords`, `title`, atau `desc`. Angka bawaan hanya nilai awal; cek aturan terbaru tiap platform.

## Deploy ke GitHub Pages (gratis)
1. Buat akun di github.com, lalu klik **New repository**, beri nama `microstock-metadata`, pilih **Public**.
2. Klik **uploading an existing file**, tarik keempat file, lalu **Commit changes**.
3. Buka **Settings → Pages**. Pada **Branch** pilih `main` dan folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Alamatnya: `https://NAMA-GITHUB-ANDA.github.io/microstock-metadata/`

## Deploy ke Firebase Hosting (opsional)
1. Install Node.js dari nodejs.org, lalu di terminal: `npm install -g firebase-tools`
2. `firebase login`
3. Di dalam folder aplikasi: `firebase init hosting` (pilih project, folder publik: `.`, single-page app: `No`)
4. `firebase deploy`

## Firebase, login, dan API AI
Firebase belum dipakai (masuk di Phase 4).

## Phase 2: Generate dengan AI
Tambahan: analisis gambar oleh AI, skor metadata (0–100), relevansi keyword (hijau/kuning/merah), dan saran lisensi, orang, serta merek.

### Cara mengaktifkan AI
1. Buat API key di provider pilihan Anda: Gemini (Google AI Studio, ada tier gratis dengan batas pemakaian), OpenAI, atau Claude (console.anthropic.com).
2. Di aplikasi, buka kartu **Konfigurasi AI**, pilih provider, tempel API key.
3. Matikan **Demo Mode**, upload gambar, lalu klik **Generate Metadata**.

Kolom **Model** boleh dikosongkan (memakai model bawaan). Nama model bawaan ada di `PROVIDERS` dalam `app.js`; jika provider mengganti nama model, isi kolom Model dengan nama yang baru.

### Keamanan API key
- Key dipakai langsung dari browser Anda, jadi jangan dipakai di komputer umum.
- Tanpa centang "Ingat key", key hanya disimpan sampai tab ditutup. Dengan centang, key disimpan di browser ini.
- Jangan menulis key di file kode, jangan upload ke GitHub.
- Jika aplikasi dipakai banyak orang, buat server perantara (mis. Firebase Cloud Functions) agar key tidak terlihat.

### Catatan
- Gambar dikecilkan (maks 1024 px) sebelum dikirim, dan tidak dikirim ulang jika Anda menekan Generate lagi untuk gambar yang sama.
- Saran AI (lisensi, orang, merek, AI-generated) hanya perkiraan. Selalu periksa sendiri.
- Hasil AI bisa salah. Review dan edit sebelum upload.

## Rencana berikutnya
- Phase 2: generate dengan AI, analisis gambar, skor metadata
- Phase 3: batch, riwayat, favorit, template
- Phase 4: Firebase (login dan sinkronisasi cloud)
- Phase 5: preset platform dan analisis keyword lanjutan

## Phase 3: Batch, Riwayat, Favorit, Template
Menu ada di bawah header: Generate, Batch Upload, Riwayat, Favorit, Template.

- **Simpan ke Riwayat / ⭐ Favorit** (halaman Generate): menyimpan metadata ke browser ini. Gambar tidak disimpan, hanya teksnya.
- **Riwayat / Favorit**: Buka/Edit (memuat kembali ke halaman Generate), Salin, Hapus, bintang.
- **Template**: 8 template bawaan dan template buatan sendiri. Template memberi arahan ke AI dan mengisi kategori serta jenis konten awal. Pilih di kartu Pengaturan Generate.
- **Batch Upload**: maksimal 50 gambar, diproses satu per satu (status Pending / Analyzing / Completed / Error). Butuh AI, jadi Demo Mode harus mati. Kolom Informasi Gambar tidak dipakai di batch. Gambar yang error bisa diulang dengan menekan Generate Semua lagi. Tier gratis punya batas permintaan, jadi batch besar bisa terhenti oleh batas itu.
- **Edit hasil batch**: tombol Edit membuka hasilnya di halaman Generate; setelah diedit, klik Simpan ke Riwayat. Perubahan tidak kembali ke tabel batch.
- Data riwayat hilang jika Anda menghapus data browser. Export CSV secara berkala.

## Phase 4: Akun dan Sinkronisasi Cloud (opsional)
Tanpa Phase 4 aplikasi tetap berjalan penuh. Fitur ini hanya untuk menyimpan riwayat, favorit, dan template di cloud agar bisa dipakai di perangkat lain.

**Penting: Phase 4 tidak bisa dijalankan dengan klik dua kali `index.html`.** Firebase Login memerlukan alamat `http://` atau `https://`. Pilih salah satu:
- VS Code + ekstensi **Live Server**: klik kanan `index.html` lalu **Open with Live Server**.
- Atau di terminal, dalam folder aplikasi: `python -m http.server 8000`, lalu buka `http://localhost:8000`.
- Atau langsung deploy (GitHub Pages / Firebase Hosting).

### Langkah setup Firebase
1. Buka console.firebase.google.com, **Add project** (Google Analytics boleh dimatikan).
2. **Project settings (ikon roda) → Your apps → ikon web `</>`** → daftarkan app → salin objek `firebaseConfig`.
3. Buka `firebase-config.js`, ganti semua nilai "ISI..." dengan nilai dari Firebase. (Konfigurasi ini bukan rahasia; keamanan ada di Rules.)
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
5. **Build → Firestore Database → Create database** (pilih mode production dan lokasi terdekat).
6. Di tab **Rules** Firestore, hapus isinya, tempel isi file `firestore.rules`, lalu **Publish**.
7. Buka aplikasi lewat server, menu **Akun**, klik **Daftar**, lalu **Masuk**.

### Jika dipasang di GitHub Pages
Tambahkan domain Anda (`NAMA.github.io`) di **Authentication → Settings → Authorized domains**, kalau tidak login akan ditolak.

### Cara kerja
- Data tetap disimpan lokal dulu. Saat login dan sinkronisasi aktif, perubahan riwayat, favorit, dan template juga dikirim ke Firestore (`users/{uid}/history` dan `users/{uid}/templates`).
- Saat login, tombol **Sinkronkan Sekarang** menggabungkan data lokal dan cloud (yang lebih baru menang).
- Pakai satu akun per browser. Berpindah akun di browser yang sama akan menggabungkan data lokal dengan akun yang baru.
- Gambar dan API key tidak dikirim ke cloud.
- Batas gratis Firebase (paket Spark) cukup untuk pemakaian pribadi.

## Phase 5: Preset Platform dan Analisis Lanjutan
- **Preset Platform** (menu Template, bagian bawah): ubah maksimal/minimal keyword serta maksimal judul dan deskripsi tiap platform tanpa mengedit kode. Tombol Reset mengembalikan nilai bawaan. Angka bawaan hanya nilai awal; cek panduan resmi tiap platform.
- Setiap platform punya catatan gaya umum yang dikirim ke AI (di `PLATFORM_NOTES` dalam `app.js`). Itu petunjuk umum, bukan aturan resmi, dan boleh Anda ubah.
- **Analisis Keyword** (halaman Generate): mendeteksi keyword terlalu umum, keyword hampir sama (bentuk jamak, -ing, -ed, urutan kata), kata di judul yang belum ada di keywords, judul yang menyerupai daftar keyword, dan seberapa banyak keyword teratas muncul di judul/deskripsi.
- **Skor Metadata** kini memberi pengurangan untuk keyword umum, keyword hampir sama, dan judul yang menyerupai daftar keyword.
- Preset disimpan di browser ini (tidak ikut sinkronisasi cloud).
