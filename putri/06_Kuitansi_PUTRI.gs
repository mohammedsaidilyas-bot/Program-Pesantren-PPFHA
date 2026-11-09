/** Data kuitansi hanya diberikan untuk pembayaran yang sudah disahkan. */
function sppPutriReceipt_(id) {
  const p=sppPutriRows_(SPP_PUTRI_SHEETS.PAYMENTS).find(x=>String(x.idPembayaran)===String(id));
  if(!p)return {ok:false,error:'Pembayaran tidak ditemukan.'};
  if(String(p.status)!==SPP_PUTRI_STATUS.PAID)return {ok:false,error:'Kuitansi tersedia setelah pembayaran disahkan.'};
  return {ok:true,data:p};
}
