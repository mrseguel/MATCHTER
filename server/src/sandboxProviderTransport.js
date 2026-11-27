import {buildCheckoutRequest,readCheckoutResponse,verifyProviderPayment} from './paymentProviderContracts.js'
import {assertPreferenceLink} from './sandboxPaymentReconciliation.js'
const digits=/^[0-9]{1,20}$/
const kid=/^[a-z0-9]{12}$/i
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const limit=256*1024
const safeError=()=>new Error('No se pudo verificar la respuesta de la pasarela de prueba')
const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o?.[k]]))
const kFields=['payment_id','receiver_id','transaction_id','currency','amount','status','status_detail','out_of_date_conciliation']
const mFields=['id','live_mode','collector_id','external_reference','currency_id','transaction_amount','status','status_detail','payment_type_id','transaction_amount_refunded']
// Server-only, explicit injected HTTP transport. No automatic network or environment
// discovery; no production mode. A future isolated worker must verify development
// merchant credentials independently before providing a real HTTPS transport.
export function createSandboxProviderTransport({mode,credentials,fetchImpl,origin,timeoutMs=8000}={}){
 if(mode!=='isolated_test'||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)throw safeError()
 const config={}
 for(const provider of ['khipu','mercadopago']){
  const c=credentials?.[provider]
  if(c?.environment!=='sandbox'||typeof c.merchantId!=='string'||!digits.test(c.merchantId)||typeof c.secret!=='string'||c.secret.length<8||c.secret.length>512||/[^\x21-\x7e]/.test(c.secret))throw safeError()
  config[provider]=Object.freeze({merchantId:c.merchantId,secret:c.secret})
 }
 function orderFor(order){
  if(!order||order.environment!=='sandbox'||!Object.hasOwn(config,order.provider)||order.merchantId!==config[order.provider].merchantId||!uuid.test(order.reference||'')||!Number.isSafeInteger(order.amountCLP)||order.amountCLP<1)throw safeError()
  return order
 }
 async function request(provider,url,method,body){
  const c=config[provider],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
  const headers={Accept:'application/json',...(provider==='khipu'?{'x-api-key':c.secret}:{Authorization:'Bearer '+c.secret}),...(body?{'Content-Type':'application/json'}:{})}
  try{
   const res=await fetchImpl(url,{method,headers,redirect:'error',cache:'no-store',signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})})
   if(res?.redirected||!res?.ok||!/^application\/json(?:\s*;|$)/i.test(res.headers?.get('content-type')||''))throw safeError()
   const reader=res.body?.getReader()
   if(!reader)throw safeError()
   const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,raw=''
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){controller.abort();throw safeError()}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
   const parsed=JSON.parse(raw)
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw safeError()
   return parsed
  }catch{throw safeError()}finally{clearTimeout(timer)}
 }
 const getKhipu=async id=>{if(typeof id!=='string'||!kid.test(id))throw safeError();return pick(await request('khipu','https://payment-api.khipu.com/v3/payments/'+id,'GET'),kFields)}
 const getMP=async id=>{if(typeof id!=='string'||!digits.test(id))throw safeError();const p=await request('mercadopago','https://api.mercadopago.com/v1/payments/'+id,'GET');return {...pick(p,mFields),order:pick(p.order,['id','type'])}}
 const getOrder=async id=>{if(typeof id!=='string'||!digits.test(id))throw safeError();const o=await request('mercadopago','https://api.mercadopago.com/merchant_orders/'+id,'GET');return {...pick(o,['id','preference_id','external_reference']),collector:pick(o.collector,['id']),payments:Array.isArray(o.payments)?o.payments.map(p=>pick(p,['id'])):[]}}
 return Object.freeze({
  // Worker must persist creation_unknown before dispatch. A failure is ambiguous;
  // never retry creation automatically or switch providers.
  async createCheckout(input){
   const order=orderFor(input),spec=buildCheckoutRequest(order,origin)
   const raw=await request(order.provider,spec.url,spec.method,spec.body)
   const response=order.provider==='khipu'?pick(raw,['payment_id','payment_url']):pick(raw,['id','collector_id','external_reference','sandbox_init_point'])
   const parsed=readCheckoutResponse(order,response)
   if(order.provider==='khipu')verifyProviderPayment(order,parsed.checkoutId,await getKhipu(parsed.checkoutId))
   return {response,checkout:parsed}
  },
  async readPayment(input,checkoutId,paymentId){
   const order=orderFor(input)
   if(order.provider==='khipu'){
    if(paymentId!==undefined&&paymentId!==checkoutId)throw safeError()
    const response=await getKhipu(checkoutId)
    verifyProviderPayment(order,checkoutId,response)
    return {response}
   }
   const response=await getMP(paymentId)
   // Verify amount, reference, environment and receiver BEFORE using the returned order ID.
   verifyProviderPayment(order,checkoutId,response,{paymentId})
   const merchantOrder=await getOrder(String(response.order.id??''))
   assertPreferenceLink(order,checkoutId,paymentId,response,merchantOrder)
   return {response,options:{paymentId,merchantOrder}}
  }
 })
}
