function sppPutriHistory_(nis) {
  nis=String(nis||'').trim().replace(/\D/g,'');if(!nis)return {ok:false,error:'NIS wajib diisi.'};
  const data=sppPutriRows_(SPP_PUTRI_SHEETS.PAYMENTS).filter(x=>String(x.nis)===nis);
  return {ok:true,data:data};
}
