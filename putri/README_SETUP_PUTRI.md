# PROGRAM PESANTREN PUTRI

File-file di folder ini disalin dari sistem PUTRA dan dipisahkan agar file aktif PUTRA tidak tersentuh.

Database:
- SPREADSHEET_ID diarahkan ke spreadsheet putri.
- STUDENT_DB_ID diarahkan ke spreadsheet putri yang sama.
- Tab master santri tetap memakai nama yang diharapkan kode: Uang Jajan Santri PPFHA.

File:
- Code_PROGRAM_PUTRI.gs
- KegiatanKehadiran_PUTRI.gs
- LiburanSantri_PUTRI.gs
- Notifikasi_PUTRI.gs
- PerpanjanganIzin_PUTRI.gs
- ProteksiAbsensiIzin_PUTRI.gs
- PROGRAM_PUTRI.html, app_PUTRI.js, style_PUTRI.css

Sebelum deploy:
1. Pastikan tab master santri dan seluruh tab operasional tersedia.
2. Periksa Notifikasi_PUTRI.gs: konfigurasi token Firebase dan sumber token/akses harus menunjuk sistem wali yang benar; jangan memakai token putra secara tidak sengaja.
3. Pastikan URL API di app_PUTRI.js / PROGRAM_PUTRI.html mengarah ke deployment putri.
4. Uji scan, status tidak hadir, izin, libur, dan trigger pada data uji.
