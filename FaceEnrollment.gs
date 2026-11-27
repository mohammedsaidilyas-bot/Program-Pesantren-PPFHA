/** FaceEnrollment.gs — backend TERPISAH khusus descriptor wajah.
 * Project ini berdiri sendiri; tidak bergantung pada Code.gs utama.
 * Sebelum deploy, set Script Property FACE_API_KEY dengan kunci rahasia.
 * Descriptor sensitif; persetujuan sukarela dan alternatif KTS harus tetap tersedia.
 */
const FACE_DB_SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_SHEET_NAME = 'FaceDescriptors';

function faceOutput_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}\n\n// Tidak mendefinisikan doGet/doPost di file ini. Handler face berada di Code.gs agar tidak bentrok.\n