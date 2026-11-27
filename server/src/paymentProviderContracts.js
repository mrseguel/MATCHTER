// Pure provider contracts for isolated QA. No network calls, credentials, routes or money movement.
const fail=()=>{throw Error('Invalid or unverified payment provider response')}
const refPattern=/^[A-Za-z0-9_-]{1,64}$/
const validId=x=>typeof x==='string'&&refPattern.test(x)
const safeAmount=x=>Number.isSafeInteger(x)&&x>0
const sameAmount=(raw,expected)=>(typeof raw==='number'||typeof raw==='string'&&/^\d+(?:\.0+)?$/.test(raw))&&Number(raw)===expected
const merchantId=x=>typeof x==='string'&&/^\d{1,20}$/.test(x)
const providers=['khipu','mercadopago']
function validOrder(o){
 if(!o||o.environment!=='sandbox'||!providers.includes(o.provider)||!validId(o.reference)||!safeAmount(o.amountCLP)||!merchantId(o.merchantId))fail()
}
function safeUrl(raw,hosts){
 if(typeof raw!=='string')fail()
 let u;try{u=new URL(raw)}catch{fail()}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname)||u.hash)fail()
 return u.href
}
// The caller must persist a unique obligation and attempt before creating the checkout.
// Never expose this builder directly to client input; origin is a server-owned QA configuration.
export function buildCheckoutRequest(order,origin){
 validOrder(order)
 const url=new URL(origin)
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.href!==url.origin+'/')fail()
 const back=url.origin+'/payment-test-return'
 if(order.provider==='khipu')return {
  url:'https://payment-api.khipu.com/v3/payments',method:'POST',auth:'x-api-key',
  body:{subject:'MATCHTER - tarifa de prueba',amount:order.amountCLP,currency:'CLP',transaction_id:order.reference,return_url:back,cancel_url:back}
 }
 return {url:'https://api.mercadopago.com/checkout/preferences',method:'POST',auth:'Bearer',
  body:{items:[{id:'matchter-service-fee-test',title:'MATCHTER - tarifa de prueba',quantity:1,currency_id:'CLP',unit_price:order.amountCLP}],external_reference:order.reference,back_urls:{success:back,pending:back,failure:back},payment_methods:{excluded_payment_types:[{id:'ticket'},{id:'atm'},{id:'bank_transfer'}]}}}
}
export function readCheckoutResponse(order,body){
 validOrder(order)
 if(order.provider==='khipu'){
  if(typeof body?.payment_id!=='string'||!/^[a-z0-9]{12}$/i.test(body.payment_id))fail()
  return {provider:order.provider,checkoutId:body.payment_id,checkoutUrl:safeUrl(body.payment_url,['khipu.com','app.khipu.com']),environment:'sandbox'}
 }
 if(!validId(body?.id)||String(body.collector_id)!==order.merchantId||body.external_reference!==order.reference)fail()
 // Never fall back to a live init_point. Test credential isolation is still mandatory.
 return {provider:order.provider,checkoutId:body.id,checkoutUrl:safeUrl(body.sandbox_init_point,['sandbox.mercadopago.cl','sandbox.mercadopago.com']),environment:'sandbox'}
}
// Accept only the exact response from an authenticated provider GET, never a browser or webhook body.
// Results are deliberately minimal; discard account numbers, RUT, payer names and all other PII.
export function verifyProviderPayment(order,checkoutId,body,{paymentId}={}){
 validOrder(order)
 if(!validId(checkoutId)||!body||typeof body!=='object')fail()
 let status='pending',id
 if(order.provider==='khipu'){
  if(body.payment_id!==checkoutId||String(body.receiver_id)!==order.merchantId||body.transaction_id!==order.reference||body.currency!=='CLP'||!sameAmount(body.amount,order.amountCLP))fail()
  id=checkoutId
  if(['reversed','partially-refunded','fully-refunded'].includes(body.status_detail))status='review'
  else if(body.status==='done'&&body.status_detail==='normal'&&body.out_of_date_conciliation===false)status='verified_test'
  else if(!['pending','verifying'].includes(body.status)||!['pending','normal'].includes(body.status_detail))status='review'
 }else{
  if(!validId(paymentId)||String(body.id)!==paymentId||body.live_mode!==false||String(body.collector_id)!==order.merchantId||body.external_reference!==order.reference||body.currency_id!=='CLP'||!sameAmount(body.transaction_amount,order.amountCLP))fail()
  id=paymentId
  // Preference linkage and unique payment ID must additionally be checked in the persisted service.
  if(body.status==='approved'&&body.status_detail==='accredited'&&['credit_card','debit_card','prepaid_card'].includes(body.payment_type_id)&&body.transaction_amount_refunded===0)status='verified_test'
  else if(['rejected','cancelled'].includes(body.status))status='declined'
  else if(!['pending','in_process','authorized'].includes(body.status))status='review'
 }
 return {provider:order.provider,reference:order.reference,providerPaymentId:id,amountCLP:order.amountCLP,currency:'CLP',status,environment:'sandbox',realPayment:false}
}
