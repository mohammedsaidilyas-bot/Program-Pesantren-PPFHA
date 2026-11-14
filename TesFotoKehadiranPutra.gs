/**
 * DIAGNOSTIK FOTO SANTRI PUTRA
 * Jalankan dari editor Apps Script: tesFotoKehadiranPutra
 * Hanya membaca Google Drive; tidak mengubah spreadsheet atau absensi.
 */
function tesFotoKehadiranPutra() {
  var nisUji = '20260011';
  var folderId = '14N7q8LsBZBVZjfP0nvtqwuE21LRi0T2L';
  var hasil = {
    ok: false,
    nis: nisUji,
    folderId: folderId,
    folderTerbaca: false,
    jumlahFile: 0,
    daftarFile: [],
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

      var namaAsli = String(file.getName() || '');
      var namaBersih = namaAsli.trim();
      var namaTanpaEkstensi = namaBersih.replace(/\.[^.]+$/, '');
      var angkaNama = namaTanpaEkstensi.replace(/\D/g, '');
      var item = {
        nama: namaAsli,
        namaTrim: namaBersih,
        namaTanpaEkstensi: namaTanpaEkstensi,
        angkaTerbaca: angkaNama,
        id: file.getId(),
        mimeType: file.getMimeType()
      };

      // Tampilkan daftar lengkap file agar format nama yang terbaca bisa diperiksa.
      hasil.daftarFile.push(item);

      // Cocokkan NIS dari nama file, mengabaikan spasi dan ekstensi.
      if (angkaNama === nisUji) {
        hasil.fileCocok.push({
          nama: namaAsli,
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
      hasil.pesan = 'Folder terbaca, tetapi NIS tidak cocok. Periksa daftarFile untuk melihat nama persis yang dibaca.';
    }
  } catch (err) {
    hasil.pesan = 'Gagal membaca folder Drive: ' + err.message;
  }

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}
