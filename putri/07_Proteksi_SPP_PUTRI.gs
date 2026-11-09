/**
 * Jalankan manual satu kali setelah file-file SPP PUTRI ditambahkan.
 * Hanya membuat tab baru khusus SPP PUTRI; tidak mengubah tab lama.
 */
function setupSPPPutriDatabase() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID), names=SPP_PUTRI_SHEETS, headers=SPP_PUTRI_HEADERS, out=[];
  [['BILLING',names.BILLING],['PAYMENTS',names.PAYMENTS],['SETTINGS',names.SETTINGS]].forEach(pair=>{
    let sh=ss.getSheetByName(pair[1]);
    if(!sh){sh=ss.insertSheet(pair[1]);sh.getRange(1,1,1,headers[pair[0]].length).setValues([headers[pair[0]]]);sh.setFrozenRows(1);out.push(pair[1]+' dibuat');}
    else out.push(pair[1]+' sudah ada; tidak diubah');
  });
  return out.join('. ');
}
function testSPPPutriDatabase() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  return JSON.stringify({ok:true,spreadsheet:ss.getName(),spreadsheetId:ss.getId(),sheets:[SPP_PUTRI_SHEETS.BILLING,SPP_PUTRI_SHEETS.PAYMENTS,SPP_PUTRI_SHEETS.SETTINGS].map(n=>{const s=ss.getSheetByName(n);return {name:n,exists:!!s,rows:s?s.getLastRow():0};})});
}
