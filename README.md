# Kasir Warung

Aplikasi kasir satu halaman untuk warung kecil. Semua data (menu, foto, pengaturan, dan riwayat penjualan) disimpan di perangkat lewat IndexedDB. Tidak ada server, tidak ada login, dan aplikasi tetap bisa dipakai setelah dibuka sekali secara online.

Dibuat untuk dipakai satu orang pemilik/kasir di tablet atau ponsel, dengan tombol besar, teks besar, dan kontras tinggi.

## Fitur

- **Ambil pesanan** — kartu menu besar per kategori, pencarian, tombol kategori yang langsung menggulir ke bagiannya, pilihan add-on, tombol tambah/kurang jumlah, catatan pesanan, dan ringkasan total yang selalu terlihat.
- **Pembayaran** — daftar pesanan lengkap, total sangat besar, pilihan **TUNAI** atau **QRIS**, serta diskon pelajar dan ojol.
  - Tunai: input uang diterima, kembalian otomatis, tombol cepat Rp 10.000 / 20.000 / 50.000 / 100.000 / uang pas.
  - QRIS: menampilkan gambar QRIS yang diunggah dari Pengaturan. Kasir menekan “Pembayaran diterima” setelah uang benar-benar masuk.
  - Diskon: satu diskon per transaksi, hanya dihitung dari menu Makanan, maksimal Rp 5.000.
- **Kelola menu** — tambah, ubah, hapus, foto opsional, kategori bawaan atau kategori baru, status habis/tersedia, dan add-on berbayar per menu (misalnya telur atau keju).
- **Riwayat penjualan** — total tunai dan QRIS hari ini, daftar transaksi per tanggal, dan struk yang bisa dicetak ulang.
- **Pengaturan** — nama restoran, logo, gambar QRIS, pajak/biaya layanan opsional, diskon pelajar/ojol, bahasa Indonesia/English, PIN pemilik, serta ekspor/impor cadangan.
- **Offline dan PWA** — bisa dipasang ke layar utama dan dibuka tanpa internet setelah pemuatan pertama.
- **Aksesibilitas** — teks minimal 18px, harga/total besar, tombol minimal 56px, fokus keyboard jelas, konfirmasi untuk tindakan berbahaya, dan indikator 3 langkah.

## Menjalankan di komputer

Aplikasi ini perlu dijalankan lewat server HTTP lokal agar IndexedDB dan service worker bekerja normal. Membuka `index.html` langsung dengan `file://` tidak disarankan.

```bash
cd kasir-restoran
python3 -m http.server 8080
```

Buka `http://localhost:8080` di browser.

Alternatif lain:

```bash
npx serve .
# atau
php -S localhost:8080
```

## Cara pakai singkat

1. Buka **Pengaturan**, isi nama restoran, unggah logo (opsional), dan unggah gambar QRIS jika menerima QRIS.
2. Aktifkan **PIN pemilik** bila perangkat juga dipegang pelanggan. PIN akan diminta saat membuka Menu atau Pengaturan.
3. Buka **Menu**, tambahkan makanan/minuman beserta harga, kategori, dan add-on bila ada.
4. Di halaman **Kasir**, ketuk kartu menu untuk menambah pesanan. Menu dengan add-on akan membuka dialog pilihan; centang tambahan yang diinginkan lalu tekan **Tambah ke pesanan**. Gunakan tombol − / + untuk mengubah jumlah.
5. Ketuk **Lihat pesanan** / **Lanjut ke pembayaran**, periksa rincian, pilih diskon pelajar/ojol bila berlaku, lalu pilih **TUNAI** atau **QRIS**.
6. Setelah pembayaran selesai, layar sukses tampil. Dari sana struk bisa dilihat dan dicetak.
7. Buka **Riwayat** untuk melihat total hari ini dan transaksi sebelumnya.
8. Lakukan **Ekspor cadangan** secara rutin dari Pengaturan.

### Pajak atau biaya layanan

Nonaktif secara bawaan. Aktifkan di **Pengaturan → Pajak / biaya tambahan**, isi nama biaya (misalnya “Pajak” atau “Biaya layanan”) dan persentasenya. Nilai dihitung dari subtotal **setelah diskon** dan ikut tercatat di struk serta riwayat.

### Diskon pelajar dan ojol

Tersedia dua diskon: **Pelajar / Mahasiswa** dan **Ojek Online (Ojol)**. Keduanya aktif dengan bawaan 5% dan bisa diubah atau dinonaktifkan.

1. Buka **Pengaturan → Diskon pelanggan**.
2. Untuk masing-masing jenis, centang **Aktifkan**, pilih **Persentase (%)** atau **Nominal (Rp)**, lalu isi nilainya.
3. Untuk nominal, nilai maksimal Rp 5.000. Untuk persentase, hasil potongan tetap dibatasi Rp 5.000 per transaksi.

Saat membayar, pilih salah satu diskon di halaman **Pembayaran**. Ketuk tombol yang sama untuk menghapusnya. Diskon hanya dihitung dari subtotal menu kategori **Makanan**, termasuk harga add-on pada menu tersebut; minuman dan kategori lain tidak ikut dihitung. Pajak dihitung setelah diskon. Diskon yang dipakai tersimpan di transaksi, struk, riwayat, dan file cadangan.

### Add-on menu

Add-on adalah tambahan opsional untuk satu menu, misalnya **Telur +Rp 2.000**, **Keju +Rp 3.000**, atau **Level pedas gratis**.

1. Buka **Menu → Tambah menu** atau **Ubah** pada menu yang sudah ada.
2. Di bagian **Add-on (opsional)**, tekan **Tambah add-on**.
3. Isi nama dan harga tambahan. Kosongkan harga jika add-on gratis. Satu menu boleh punya beberapa add-on.
4. Simpan menu.

Saat mengambil pesanan, ketuk kartu menu yang memiliki add-on. Dialog pilihan akan muncul; centang add-on yang diinginkan lalu tekan **Tambah ke pesanan**. Jika tidak ada yang dicentang, menu tetap masuk dengan harga dasar.

Harga add-on dijumlahkan ke harga per item dan ikut tampil di pesanan, ringkasan pembayaran, struk, serta riwayat. Menu yang sama dengan kombinasi add-on berbeda menjadi baris terpisah, sedangkan kombinasi yang identik digabung jumlahnya. Pilihan add-on disalin ke transaksi, jadi struk lama tetap benar meskipun menu diubah atau dihapus kemudian.

### PIN pemilik

PIN melindungi halaman **Menu** dan **Pengaturan**, bukan mengenkripsi data. PIN disimpan sebagai hash bergaram di perangkat. Setelah keluar dari halaman owner, PIN diminta lagi saat kembali. Karena semua data lokal, PIN bukan pengganti pengamanan perangkat.

### Cetak struk

Tekan **Lihat / cetak struk**, lalu tombol **Cetak struk**. Dialog cetak browser akan muncul. Struk dirancang untuk kertas thermal 80 mm; pada printer biasa tetap bisa dicetak. Pilih ukuran kertas/margin yang sesuai di dialog cetak.

## Hosting gratis

Semua file bersifat statis. Unggah **isi folder `kasir-restoran`** (bukan folder induknya), lalu akses lewat HTTPS agar PWA dan service worker aktif.

### GitHub Pages

1. Buat repository baru di GitHub.
2. Unggah `index.html`, `css/`, `js/`, `assets/`, `manifest.webmanifest`, dan `sw.js` ke root repository. Jangan memasukkan folder `kasir-restoran` sebagai pembungkus.
3. Buka **Settings → Pages**.
4. Pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu simpan.
5. Situs tersedia di `https://NAMA-AKUN.github.io/NAMA-REPO/`.

### Netlify Drop

1. Buka <https://app.netlify.com/drop>.
2. Seret folder `kasir-restoran` ke halaman tersebut.
3. Netlify memberi URL HTTPS. URL bisa diganti namanya di pengaturan situs.

### Cloudflare Pages

1. Buka dashboard Cloudflare Pages, pilih **Create a project → Direct Upload**.
2. Unggah isi folder `kasir-restoran`.
3. Situs tersedia di subdomain `*.pages.dev`.

### Memasang di tablet/ponsel

- **Android/Chrome:** buka menu browser → **Install app / Tambahkan ke layar utama**.
- **iPhone/iPad/Safari:** tombol Share → **Add to Home Screen**.
- Setelah dipasang, aplikasi bisa dibuka layar penuh dan tetap bekerja offline.

> Service worker hanya aktif di `https://` atau `http://localhost`. Jika dibuka lewat `file://`, aplikasi masih bisa berjalan, tetapi tidak bisa offline-penuh atau dipasang sebagai PWA.

## Data, cadangan, dan privasi

- Data disimpan di IndexedDB pada browser dan alamat situs yang sama. Data **tidak** dikirim ke server mana pun.
- Data tidak otomatis tersinkron antarperangkat. Untuk memindahkan data, gunakan **Ekspor cadangan** di perangkat lama lalu **Impor cadangan** di perangkat baru.
- Cadangan berisi menu, add-on, foto menu, logo, gambar QRIS, pengaturan (termasuk diskon pelajar/ojol), PIN aktif, dan seluruh riwayat penjualan.
- Menghapus data situs di browser, memakai mode privat, atau membersihkan penyimpanan perangkat akan menghapus data aplikasi. Karena itu lakukan ekspor rutin.
- Safari/iOS dapat membersihkan penyimpanan situs yang jarang dibuka. Simpan cadangan di tempat lain.
- PIN bukan enkripsi. Siapa pun yang bisa membuka DevTools/penyimpanan browser dapat mengakses data lokal.

## Struktur file

```text
kasir-restoran/
├── index.html              # Kerangka aplikasi dan dialog
├── manifest.webmanifest    # Metadata PWA
├── sw.js                   # Service worker offline
├── css/
│   └── style.css           # Seluruh tampilan, responsif, dan gaya cetak
├── js/
│   ├── i18n.js             # Semua teks Indonesia/English
│   ├── db.js               # IndexedDB: state + gambar
│   └── app.js              # Logika pesanan, pembayaran, menu, pengaturan
└── assets/
    ├── icon.svg            # Ikon sumber
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

## Kustomisasi

- **Teks dan bahasa:** ubah kamus di `js/i18n.js`. Bahasa bawaan diatur lewat `DEFAULT_LANGUAGE`; bahasa aktif juga bisa dipilih di Pengaturan.
- **Warna dan ukuran:** variabel warna ada di bagian `:root` pada `css/style.css`.
- **Ikon aplikasi:** ganti `assets/icon.svg`, lalu buat ulang `icon-192.png`, `icon-512.png`, dan `apple-touch-icon.png` (misalnya dengan ImageMagick):
  ```bash
  magick icon.svg -resize 512x512 icon-512.png
  magick icon.svg -resize 192x192 icon-192.png
  magick icon.svg -resize 180x180 apple-touch-icon.png
  ```
- **Nama aplikasi:** ubah `name`/`short_name` di `manifest.webmanifest`, judul di `index.html`, dan teks `common.appName` di `js/i18n.js` bila perlu.
- **Versi cache:** setiap kali mengubah `css/`, `js/`, atau gambar di `assets/`, naikkan `CACHE_VERSION` di `sw.js` agar pengguna mendapat file terbaru. Halaman memakai network-first, aset memakai cache-first.

## Catatan teknis

- Tanpa dependensi frontend eksternal; ikon berupa SVG inline.
- Format uang: `Rp 25.000` (lokal Indonesia).
- Nomor pesanan berurutan dan tersimpan di state.
- QRIS bersifat konfirmasi manual. Aplikasi tidak terhubung ke bank/e-wallet dan tidak memverifikasi pembayaran.
- Ekspor cadangan berupa file JSON, termasuk gambar dalam bentuk data URL. Ukuran file bisa cukup besar bila banyak foto.
- Diuji untuk browser modern: Chrome/Edge, Safari, dan Firefox versi terbaru.

## Lisensi pemakaian

Silakan pakai dan ubah untuk warung Anda. Tidak ada jaminan resmi; uji dulu sebelum dipakai berjualan.
