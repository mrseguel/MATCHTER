// Internal guard for external sandbox creation only. No logs, no browser route.
// Khipu GET /v3/banks and POST /v3/payments share the production host.
// A verified developer account is also required; the bank name alone is not proof.
const host='https://payment-api.khipu.com'
const normalize=n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const names=new Set(['demobank','bancodedemostracion','bancodeprueba','bancodepruebas'])
const refuse=()=>new Error('Khipu: banco de demostración no confirmado')
export function createKhipuDemoBankGuard({fetchImpl,merchantId,developerAccountConfirmed=false}={}){
 if(typeof fetchImpl!=='function'||typeof merchantId!=='string'||!/^\d{1,20}$/.test(merchantId)||developerAccountConfirmed!==true)throw refuse()
 return async function guardedFetch(url,options){
  if(typeof url!=='string'||!options||typeof options.headers?.['x-api-key']!=='string'||options.redirect!=='error'||options.cache!=='no-store'||!options.signal)throw refuse()
  if(options.method==='GET'&&new RegExp('^'+host.replaceAll('.','\\.')+'/v3/payments/[a-zA-Z0-9]{12}$').test(url))return fetchImpl(url,options)
  if(options.method!=='POST'||url!==host+'/v3/payments'||typeof options.body!=='string')throw refuse()
  let body;try{body=JSON.parse(options.body)}catch{throw refuse()}
  if(!body||body.currency!=='CLP'||!Number.isSafeInteger(body.amount)||body.amount<1||typeof body.transaction_id!=='string'||!body.transaction_id||body.notify_url||body.notify_api_version||body.send_email||body.send_reminders||body.payer_email)throw refuse()
  try{
   const response=await fetchImpl(host+'/v3/banks',{method:'GET',headers:{Accept:'application/json','x-api-key':options.headers['x-api-key']},redirect:'error',cache:'no-store',signal:options.signal})
   if(response?.status!==200||response.redirected||!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')||''))throw refuse()
   const reader=response.body?.getReader();if(!reader)throw refuse()
   let raw='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true})
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256*1024){await reader.cancel();throw refuse()}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
   const banks=JSON.parse(raw)?.banks
   // Require exactly one bank; if the provider's response changes, fail closed.
   if(!Array.isArray(banks)||banks.length!==1)throw refuse()
   const b=banks[0]
   if(typeof b?.name!=='string'||!names.has(normalize(b.name))||typeof b.bank_id!=='string'||! /^[A-Za-z0-9_-]{1,5}$/.test(b.bank_id)||body.bank_id!==undefined&&body.bank_id!==b.bank_id)throw refuse()
   if(!Number.isFinite(b.min_amount)||b.min_amount<0||body.amount<b.min_amount)throw refuse()
   if(options.signal.aborted)throw refuse()
   return await fetchImpl(url,{...options,body:JSON.stringify({...body,bank_id:b.bank_id,send_email:false,send_reminders:false})})
  }catch{throw refuse()}
 }
}
