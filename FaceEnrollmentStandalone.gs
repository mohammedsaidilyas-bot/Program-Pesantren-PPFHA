/**
 * Helper file untuk API wajah pada proyek Apps Script utama.
 * Tidak memiliki doGet/doPost agar tidak berbenturan dengan router Code.gs.
 * Routing GET facelist dan POST face actions dilakukan oleh Code.gs utama.
 * Fungsi ini hanya diagnostik ringan dan tidak perlu dijalankan.
 */
function faceStandaloneFileStatus_(){
  return {ok:true,message:'Helper wajah tanpa handler Web App. Router berada di Code.gs utama.'};
}
