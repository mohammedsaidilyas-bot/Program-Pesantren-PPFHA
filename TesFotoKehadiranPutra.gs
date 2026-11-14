/**
 * DIAGNOSTIK FOTO SANTRI PUTRA
 * Jalankan dari editor Apps Script: tesFotoKehadiranPutra
 * Fungsi ini hanya membaca Google Drive; tidak mengubah spreadsheet atau absensi.
 */
function tesFotoKehadiranPutra() {
  var nisUji = '20260011'; // Ganti NIS ini jika ingin menguji santri lain.
  var folderId = '14N7q8LsBZBVZjfP0nvtqwuE21LRi0T2L';
  var hasil = {
    ok: false,
    nis: nisUji,
    folderId: folderId,
    folderTerbaca: false,
    jumlahFile: 0,
    fileCocok: [],
    fotoUrl: '',
    pesan: ''
  };

  try {
    var folder = DriveApp.getFolderById(folderId);
    hasil.folderTerbaca = true;
    hasil.namaFolder = folder.getName();

    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      hasil.jumlahFile++;
      var nama = String(file.getName() || '').trim();
      var dasar = nama.replace(/\\.[^.]+$/, '');
      var angkaDasar = dasar.replace(/\\D/g, '');

      if (angkaDasar === nisUji) {
        hasil.fileCocok.push({
          nama: nama,
          id: file.getId(),
          mimeType: file.getMimeType(),
          url: 'https://drive.google.com/thumbnail?id=' +
            encodeURIComponent(file.getId()) + '&sz=w480'
        });
      }
    }

    if (hasil.fileCocok.length) {
      hasil.ok = true;
      hasil.fotoUrl = hasil.fileCocok[0].url;
      hasil.pesan = 'Foto ditemukan di folder Drive.';
    } else {
      hasil.pesan = 'Folder bisa dibaca, tetapi tidak ada nama file yang cocok dengan NIS ' + nisUji + '.';
    }
  } catch (err) {
    hasil.pesan = 'Gagal membaca folder Drive: ' + err.message;
  }

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}
