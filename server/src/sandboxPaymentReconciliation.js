import {AuthError} from './identityAccounts.js'
import {readCheckoutResponse,verifyProviderPayment} from './paymentProviderContracts.js'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const fail=(status,message)=>{throw new AuthError(status,message)}
// Pure monotonic interpretation of trusted observations. A rejected payment is not proof
// that the checkout is closed; a verified payment remains reserved even after refund.
export function nextSandboxStatus(previous,incoming){
 if(!['pending','declined','verified_test','review'].includes(incoming))fail(400,'Estado inválido')
 if(previous==='review')return 'review'
 if(previous==='verified_test')return incoming==='verified_test'?'verified_test':'review'
 if(previous==='declined'&&incoming==='pending')return 'declined'
 return incoming
}
export function assertPreferenceLink(order,checkoutId,paymentId,payment,merchantOrder){
 // The merchant order MUST come from a second authenticated provider GET, not the browser.
 if(!merchantOrder||merchantOrder.preference_id!==checkoutId||merchantOrder.external_reference!==order.reference||
 String(merchantOrder.collector?.id)!==order.merchantId||!merchantOrder.id||
 payment?.order?.type!=='mercadopago'||String(payment.order.id)!==String(merchantOrder.id)||
 !Array.isArray(merchantOrder.payments)||!merchantOrder.payments.some(p=>String(p.id)===paymentId))fail(409,'No se pudo vincular el pago con su preferencia')
}
// Internal QA worker, deliberately no network transport, public endpoints or live mode.
// Callers may supply fixture responses only until an authenticated server transport exists.
export function createSandboxReconciliation({db,mode,merchants}){
 if(mode!=='isolated_test'||!merchants||!['khipu','mercadopago'].every(p=>typeof merchants[p]==='string'&&/^\d{1,20}$/.test(merchants[p])))throw Error('Sandbox reconciliation requires isolated test merchants')
 const configured=Object.freeze({khipu:merchants.khipu,mercadopago:merchants.mercadopago})
 async function tx(id,fn){
  if(typeof id!=='string'||!uuid.test(id))fail(400,'Intento inválido')
  const q=await db.connect()
  try{
   await q.query('BEGIN')
   const a=(await q.query('SELECT id,request_id,owner_profile_id,provider,amount_clp FROM matchter.sandbox_payment_attempts WHERE id=$1',[id])).rows[0]
   if(!a)fail(404,'Intento no disponible')
   await q.query("SELECT pg_advisory_xact_lock(hashtextextended('sandbox-fee:'||$1::text||':'||$2::text,0))",[a.request_id,a.owner_profile_id])
   const slot=(await q.query('SELECT attempt_id FROM matchter.sandbox_payment_slots WHERE request_id=$1 AND owner_profile_id=$2',[a.request_id,a.owner_profile_id])).rows[0]
   if(slot?.attempt_id!==id)fail(409,'Intento no activo')
   const e=(await q.query('SELECT state,sequence FROM matchter.sandbox_payment_attempt_events WHERE attempt_id=$1 ORDER BY sequence DESC LIMIT 1',[id])).rows[0]
   const order={provider:a.provider,environment:'sandbox',reference:id,amountCLP:a.amount_clp,merchantId:configured[a.provider]}
   const result=await fn(q,order,e)
   await q.query('COMMIT');return result
  }catch(e){try{await q.query('ROLLBACK')}catch{}if(e.code==='23505')fail(409,'Identificador externo ya vinculado');throw e}finally{q.release()}
 }
 async function checkout(q,id){return (await q.query('SELECT provider,merchant_id,checkout_id FROM matchter.sandbox_checkout_bindings WHERE attempt_id=$1',[id])).rows[0]}
 const result=(id,status)=>({attemptId:id,status,environment:'sandbox',realPayment:false})
 return Object.freeze({
  async bindCheckout(id,response){
   return tx(id,async(q,order,e)=>{
    const parsed=readCheckoutResponse(order,response),prior=await checkout(q,id)
    if(prior){if(prior.checkout_id!==parsed.checkoutId||prior.provider!==order.provider||prior.merchant_id!==order.merchantId)fail(409,'Checkout ya vinculado');return result(id,'checkout_created')}
    if(e?.state!=='creation_unknown')fail(409,'Se requiere un despacho reservado')
    await q.query('INSERT INTO matchter.sandbox_checkout_bindings(attempt_id,provider,merchant_id,checkout_id) VALUES($1,$2,$3,$4)',[id,order.provider,order.merchantId,parsed.checkoutId])
    await q.query("INSERT INTO matchter.sandbox_payment_attempt_events(attempt_id,sequence,state) VALUES($1,$2,'checkout_created')",[id,e.sequence+1])
    return result(id,'checkout_created')
   })
  },
  async observe(id,response,{paymentId,merchantOrder}={}){
   return tx(id,async(q,order,e)=>{
    const c=await checkout(q,id)
    if(e?.state!=='checkout_created'||!c||c.provider!==order.provider||c.merchant_id!==order.merchantId)fail(409,'Checkout no vinculado')
    if(order.provider==='mercadopago')assertPreferenceLink(order,c.checkout_id,paymentId,response,merchantOrder)
    const verified=verifyProviderPayment(order,c.checkout_id,response,{paymentId})
    const p=(await q.query('SELECT provider,merchant_id,payment_id FROM matchter.sandbox_payment_bindings WHERE attempt_id=$1',[id])).rows[0]
    const last=(await q.query('SELECT status,sequence FROM matchter.sandbox_payment_observations WHERE attempt_id=$1 ORDER BY sequence DESC LIMIT 1',[id])).rows[0]
    if(p&&(p.payment_id!==verified.providerPaymentId||p.provider!==order.provider||p.merchant_id!==order.merchantId)){
     // Multiple payment IDs are a conflict, not a second verified payment. Freeze for review.
     if(last?.status!=='review')await q.query("INSERT INTO matchter.sandbox_payment_observations(attempt_id,sequence,status) VALUES($1,$2,'review')",[id,(last?.sequence||0)+1])
     return result(id,'review')
    }
    if(!p)await q.query('INSERT INTO matchter.sandbox_payment_bindings(attempt_id,provider,merchant_id,payment_id) VALUES($1,$2,$3,$4)',[id,order.provider,order.merchantId,verified.providerPaymentId])
    const state=nextSandboxStatus(last?.status,verified.status)
    if(last?.status!==state)await q.query('INSERT INTO matchter.sandbox_payment_observations(attempt_id,sequence,status) VALUES($1,$2,$3)',[id,(last?.sequence||0)+1,state])
    return result(id,state)
   })
  }
 })
}
