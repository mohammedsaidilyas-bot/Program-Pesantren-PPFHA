/**
 * KONFIGURASI SPP KHUSUS PUTRI.
 * Seluruh tab transaksi berada di DATABASE SANTRI PUTRI PPFHA.
 * Tidak menggunakan ID, endpoint, maupun kredensial PUTRA.
 */
const SPP_PUTRI_SHEETS = {
  STUDENTS: 'database putri',
  BILLING: 'SPP_PUTRI_Tagihan',
  PAYMENTS: 'SPP_PUTRI_Pembayaran',
  SETTINGS: 'SPP_PUTRI_Pengaturan'
};
const SPP_PUTRI_HEADERS = {
  BILLING: ['idTagihan','nis','nama','kelas','periode','nominal','status','idPembayaran','dibuatPada','diubahPada'],
  PAYMENTS: ['idPembayaran','tanggalAjukan','tanggalVerifikasi','nis','nama','kelas','periode','nominal','metode','status','referensiBukti','catatan','diverifikasiOleh'],
  SETTINGS: ['kunci','nilai','keterangan']
};
const SPP_PUTRI_STATUS = { UNPAID:'Belum Lunas', PENDING:'Menunggu Verifikasi', PAID:'Lunas', REJECTED:'Ditolak' };
