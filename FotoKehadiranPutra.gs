/**
 * MODUL KHUSUS FOTO SANTRI PUTRA UNTUK PORTAL KEGIATAN & KEHADIRAN.
 * File ini ditambahkan sebagai file .gs terpisah dalam project Apps Script yang sama.
 * Tidak mengubah database, jadwal, izin, maupun proses pencatatan absensi.
 */
const FOTO_KEHADIRAN_PUTRA_FOLDER_ID = '14N7q8LsBZBVZjfP0nvtqwuE21LRi0T2L';

function attendancePhotoUrl_(nis) {
  var key = String(nis || '').trim().replace(/\D/g, '');
  if (!key) return '';

  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get('attendance_photo_v3_' + key);
    if (cached) return cached;

    var folder = DriveApp.getFolderById(FOTO_KEHADIRAN_PUTRA_FOLDER_ID);
    var files = folder.getFiles();

    while (files.hasNext()) {
      var file = files.next();
      var fileName = String(file.getName() || '').trim();
      // Cocokkan NIS dengan nama file, baik "20260011.jpg" maupun "20260011".
      var baseName = fileName.replace(/\.[^.]+$/, '').replace(/\D/g, '');
      if (baseName === key) {
        var url = 'https://drive.google.com/thumbnail?id=' +
          encodeURIComponent(file.getId()) + '&sz=w480';
        cache.put('attendance_photo_v3_' + key, url, 21600);
        return url;
      }
    }
  } catch (err) {
    console.error('Foto Kehadiran PUTRA: ' + err.message);
  }
  return '';
}
