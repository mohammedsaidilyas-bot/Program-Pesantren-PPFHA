# PROGRAM PESANTREN PUTRI

Website dan backend Program Pesantren PUTRI berdiri sendiri. Semua perubahan hanya berada di branch `putri-development` dan folder `putri/`. Jangan mengubah branch `main` atau sistem PUTRA.

## Database
- Nama file Google Sheets: **DATABASE SANTRI PUTRI PPFHA**
- ID spreadsheet: `1ZFOtVEoB48NytlEqtq9RrFHomHMTF7einzGIAHOp9LM`
- Tab master biodata santri: **database putri**
- Kolom master: A–R sesuai struktur database PUTRI yang sudah dibuat.
- Tab operasional (Izin, Pengumuman, Kegiatan, Absensi, JadwalAbsensi, LiburAbsensi, MasaLiburan, serta tab pendidikan) dibuat/diakses di spreadsheet PUTRI ini.

## File website
- `index.html` — halaman utama Vercel.
- `PROGRAM_PUTRI.html` — salinan halaman utama.
- `app_PUTRI.js` — JavaScript website PUTRI.
- `style_PUTRI.css` — stylesheet PUTRI.
- File Apps Script berakhiran `_PUTRI.gs` adalah salinan khusus PUTRI.

## Langkah persiapan Apps Script
1. Buat proyek Apps Script baru khusus Program PUTRI.
2. Salin isi file `Code_PROGRAM_PUTRI.gs`, `KegiatanKehadiran_PUTRI.gs`, `LiburanSantri_PUTRI.gs`, `PerpanjanganIzin_PUTRI.gs`, dan `ProteksiAbsensiIzin_PUTRI.gs` ke proyek yang sama. Tambahkan `Notifikasi_PUTRI.gs` hanya setelah sumber token wali PUTRI dan helper Firebase diverifikasi.
3. Periksa bahwa konstanta `SPREADSHEET_ID` dan `STUDENT_DB_ID` menunjuk ke spreadsheet PUTRI, serta `STUDENT_SHEET_NAME` bernilai `database putri`.
4. Jalankan `setupDatabase()` dan fungsi setup lain yang memang diperlukan. Fungsi setup hanya membuat tab operasional yang belum ada dan tidak menghapus data.
5. Isi Script Properties `ADMIN_API_KEY` dengan kunci pengurus yang kuat.
6. Deploy sebagai Web App terpisah, jalankan sebagai pemilik, dan atur akses sesuai kebutuhan.
7. Salin URL deployment PUTRI berakhiran `/exec`.

## Langkah Vercel
1. Buat proyek Vercel baru dari repository ini.
2. Set **Root Directory** menjadi `putri`.
3. Deploy branch `putri-development`.
4. Setelah deployment tersedia, uji website menggunakan URL Apps Script PUTRI yang akan dipasang di `app_PUTRI.js`.
5. Jangan memakai URL deployment Program PUTRA.

## Pengujian wajib sebelum dipakai
- Baca biodata menggunakan NIS dari tab `database putri`.
- Simpan dan baca ulang izin, pengumuman, kegiatan.
- Uji jadwal, scan absensi, status tidak hadir, izin, liburan, dan fitur pendidikan menggunakan data uji PUTRI.
- Uji notifikasi secara terpisah setelah database token wali PUTRI dan fungsi Firebase teridentifikasi. Jangan mengirim notifikasi ke token PUTRA.
- Jangan menguji atau mengubah sistem PUTRA.
