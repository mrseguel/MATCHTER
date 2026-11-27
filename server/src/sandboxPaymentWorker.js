import {sandboxMerchants} from './sandboxProviderSelection.js'
// Internal orchestration only. No public routes, environment secrets, or scheduler.
// All callers are trusted isolated QA workers; never take ownerId or a raw response from a browser.
export function createSandboxPaymentWorker({mode,db,attempts,reconciliation,transport,merchants,providers}={}){
 if(mode!=='isolated_test'||!db||!attempts||!reconciliation||!transport)throw Error('Isolated worker required')
 const configured=sandboxMerchants(merchants,providers)
 const orderFor=a=>{if(!Object.hasOwn(configured,a.provider))throw Error('Proveedor de prueba no habilitado');return {provider:a.provider,environment:'sandbox',reference:a.id,amountCLP:a.amountCLP,merchantId:configured[a.provider]}}
 return Object.freeze({
  async dispatch(attemptId,ownerId){
   // Durable state MUST be committed before calling the transport. If anything fails,
   // the reservation remains blocked. Never return a checkout URL before binding.
   const a=await attempts.markDispatchUnknown(attemptId,ownerId)
   const c=await transport.createCheckout(orderFor(a))
   await reconciliation.bindCheckout(a.id,c.response)
   return {attemptId:a.id,provider:a.provider,checkoutUrl:c.checkout.checkoutUrl,environment:'sandbox',realPayment:false}
  },
  async reconcile(attemptId,paymentId){
   const a=(await db.query('SELECT a.id,a.provider,a.amount_clp AS "amountCLP",c.checkout_id AS "checkoutId",c.merchant_id AS "merchantId" FROM matchter.sandbox_payment_attempts a JOIN matchter.sandbox_checkout_bindings c ON c.attempt_id=a.id JOIN matchter.sandbox_payment_slots s ON s.attempt_id=a.id AND s.request_id=a.request_id AND s.owner_profile_id=a.owner_profile_id WHERE a.id=$1',[attemptId])).rows[0]
   if(!a||a.merchantId!==configured[a.provider])throw Error('Checkout de prueba no disponible')
   const r=await transport.readPayment(orderFor(a),a.checkoutId,paymentId)
   return reconciliation.observe(a.id,r.response,r.options)
  }
 })
}
