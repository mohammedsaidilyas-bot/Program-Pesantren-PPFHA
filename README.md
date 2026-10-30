# Program Pesantren PPFHA

Website pengurus untuk mengelola izin santri, pengumuman, dan kegiatan pesantren. Project ini dipisahkan dari repository Wali Santri dan aplikasi TANG Pesantren.

## Status saat ini
- Tahap 1: UI responsif Dashboard, Izin Santri, Pengumuman, dan Kegiatan & Jadwal.
- Tahap 2 (UI): menu Kegiatan & Kehadiran dengan lima aktivitas, pemindai QR KTS/NIS, pengaturan jadwal, dan tampilan rekap sudah ditambahkan ke frontend.
- Tahap 2 (backend): belum aktif. Endpoint Apps Script saat ini belum terbukti mendukung `attendanceConfig`, `saveAttendanceConfig`, `attendanceScan`, dan `attendanceRecords`.
- Formulir saat ini hanya menyimpan data sementara di memori halaman.
- Backend Apps Script disiapkan sebagai fondasi, tetapi belum dipasang/deploy atau dihubungkan ke frontend.
- Jangan masukkan data santri nyata sebelum autentikasi, hak akses, dan penyimpanan online selesai diuji.

## Menyiapkan database
1. Buka spreadsheet izin KTS yang sudah ditentukan.
2. Pilih Extensions → Apps Script, lalu tempel isi Code.gs.
3. Jalankan setupDatabase() satu kali dan setujui izin akses.
4. Deploy sebagai Web App, atur akses dengan pertimbangan keamanan data santri, lalu catat URL /exec.
5. Hubungkan frontend ke endpoint dan implementasikan autentikasi pengurus sebelum operasional.

## Deploy website
Impor repository ini ke Vercel sebagai website statis. File index.html berada di root repository.

## Tahapan berikutnya
1. Verifikasi tampilan setelah deploy.
2. Aktifkan dan uji database online.
3. Hubungkan frontend absensi ke Apps Script/Google Sheets, termasuk daftar santri aktif dan trigger server untuk menetapkan Tidak Hadir setelah batas akhir.
4. Implementasikan alur persetujuan perizinan dan publikasi pengumuman.
5. Hubungkan informasi kehadiran yang sesuai ke website Wali Santri dengan akses baca saja.
