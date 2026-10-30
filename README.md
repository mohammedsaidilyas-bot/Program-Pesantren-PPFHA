# Program Pesantren PPFHA

Website pengurus untuk mengelola izin santri, pengumuman, dan kegiatan pesantren. Project ini dipisahkan dari repository Wali Santri dan aplikasi TANG Pesantren.

## Status saat ini
- Tahap 1: UI responsif Dashboard, Izin Santri, Pengumuman, dan Kegiatan & Jadwal.
- Tahap 2 (UI): menu Kegiatan & Kehadiran dengan lima aktivitas, pemindai QR KTS/NIS, pengaturan jadwal, dan tampilan rekap sudah ditambahkan ke frontend.
- Tahap 2 (backend): kode Apps Script absensi sudah ditambahkan ke `Code.gs`, mencakup konfigurasi jadwal per sesi, pencatatan scan QR/NIS, rekap, dan pembuatan status Tidak Hadir otomatis melalui pemicu 5 menit. Perubahan baru aktif setelah `Code.gs` disalin ke proyek Apps Script yang terhubung, `setupDatabase()` dijalankan, dan deployment Web App diperbarui.
- Formulir saat ini hanya menyimpan data sementara di memori halaman.
- Backend Apps Script disiapkan sebagai fondasi, tetapi belum dipasang/deploy atau dihubungkan ke frontend.
- Jangan masukkan data santri nyata sebelum autentikasi, hak akses, dan penyimpanan online selesai diuji.

## Menyiapkan database
1. Buka spreadsheet izin KTS yang sudah ditentukan.
2. Pilih Extensions → Apps Script, lalu tempel isi Code.gs.
3. Salin seluruh isi `Code.gs` terbaru dari repository ini ke proyek Apps Script yang sudah terhubung ke URL API di `app.js`, lalu simpan.
4. Jalankan `setupDatabase()` dan setujui izin spreadsheet serta pemicu otomatis. Fungsi ini menyiapkan tab `JadwalAbsensi` dan `Absensi` tanpa menghapus tab/data lama, serta memasang pemicu pemeriksaan setiap 5 menit.
5. Perbarui deployment Web App ke versi terbaru. Pertahankan URL `/exec` yang sama agar frontend tetap terhubung.
6. Uji jadwal dan scan dengan data percobaan sebelum digunakan untuk absensi resmi.

## Deploy website
Impor repository ini ke Vercel sebagai website statis. File index.html berada di root repository.

## Tahapan berikutnya
1. Verifikasi tampilan setelah deploy.
2. Salin dan aktifkan backend absensi di Apps Script, lalu uji database online.
3. Uji scan QR/NIS, batas tepat waktu, terlambat, dan pembuatan Tidak Hadir setelah batas akhir.
4. Implementasikan alur persetujuan perizinan dan publikasi pengumuman.
5. Hubungkan informasi kehadiran yang sesuai ke website Wali Santri dengan akses baca saja.
