import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxProviderTransport} from './sandboxProviderTransport.js'
const reference='12345678-1234-4234-8234-123456789012'
const credentials={khipu:{environment:'sandbox',merchantId:'9876',secret:'fixture-khipu-secret'},mercadopago:{environment:'sandbox',merchantId:'9876',secret:'fixture-mp-secret'}}
const order={provider:'khipu',environment:'sandbox',reference,amountCLP:2990,merchantId:'9876'}
const mp={...order,provider:'mercadopago'}
const kc={payment_id:'abc123def456',payment_url:'https://khipu.com/payment/info/abc123def456'}
const kp={payment_id:kc.payment_id,receiver_id:9876,transaction_id:reference,currency:'CLP',amount:'2990.00',status:'pending',status_detail:'pending',out_of_date_conciliation:false,bank_account_number:'PRIVATE-TEST'}
const mc={id:'pref-1',collector_id:9876,external_reference:reference,sandbox_init_point:'https://sandbox.mercadopago.cl/checkout/pay'}
const payment={id:123456,collector_id:9876,external_reference:reference,currency_id:'CLP',transaction_amount:2990,live_mode:false,status:'approved',status_detail:'accredited',payment_type_id:'debit_card',transaction_amount_refunded:0,order:{type:'mercadopago',id:987},payer:{email:'private@example.invalid'}}
const merchant={id:987,preference_id:mc.id,external_reference:reference,collector:{id:9876,email:'private@example.invalid'},payments:[{id:payment.id,payer:'PRIVATE'}]}
const json=o=>new Response(JSON.stringify(o),{headers:{'Content-Type':'application/json'}})
const make=fetchImpl=>createSandboxProviderTransport({mode:'isolated_test',credentials,fetchImpl,origin:'https://qa.example.invalid'})
test('transport requires explicit isolated mode and injected fetch, and rejects mismatched merchant',async()=>{
 assert.throws(()=>createSandboxProviderTransport({mode:'live',credentials,fetchImpl:async()=>{}}))
 assert.throws(()=>createSandboxProviderTransport({mode:'isolated_test',credentials}))
 const t=make(async()=>assert.fail('No network expected'))
 await assert.rejects(t.createCheckout({...order,merchantId:'123'}))
 await assert.rejects(t.createCheckout({...order,environment:'live'}))
 await assert.rejects(t.readPayment(order,'../evil'))
})
test('Khipu authenticates fixed POST and GET, confirms linkage, discards private fields',async()=>{
 const calls=[];const t=make(async(url,opts)=>{calls.push({url,opts});return json(opts.method==='POST'?kc:kp)})
 const c=await t.createCheckout(order);assert.equal(c.checkout.checkoutId,kc.payment_id)
 const r=await t.readPayment(order,kc.payment_id);assert.equal(r.response.status,'pending')
 assert.equal('bank_account_number' in r.response,false)
 assert.equal(calls.length,3)
 assert.deepEqual(calls.map(c=>c.url),['https://payment-api.khipu.com/v3/payments','https://payment-api.khipu.com/v3/payments/'+kc.payment_id,'https://payment-api.khipu.com/v3/payments/'+kc.payment_id])
 assert.equal(JSON.parse(calls[0].opts.body).amount,2990)
 for(const c of calls){assert.equal(c.opts.headers['x-api-key'],credentials.khipu.secret);assert.equal(c.opts.redirect,'error');assert.equal(c.opts.cache,'no-store')}
})
test('Mercado Pago authenticates preference and queries payment and merchant order independently',async()=>{
 const calls=[];const t=make(async(url,opts)=>{calls.push({url,opts});return json(opts.method==='POST'?mc:url.includes('/merchant_orders/')?merchant:payment)})
 assert.equal((await t.createCheckout(mp)).checkout.checkoutId,mc.id)
 const r=await t.readPayment(mp,mc.id,String(payment.id))
 assert.equal('payer' in r.response,false);assert.equal('email' in r.options.merchantOrder.collector,false)
 assert.deepEqual(calls.map(c=>c.url),['https://api.mercadopago.com/checkout/preferences','https://api.mercadopago.com/v1/payments/123456','https://api.mercadopago.com/merchant_orders/987'])
 for(const c of calls)assert.equal(c.opts.headers.Authorization,'Bearer '+credentials.mercadopago.secret)
})
test('invalid or live payment response does not trigger merchant order query',async()=>{
 let calls=0;const t=make(async()=>{calls++;return json({...payment,live_mode:true})})
 await assert.rejects(t.readPayment(mp,mc.id,String(payment.id)));assert.equal(calls,1)
})
test('provider errors, invalid content, oversize and ambiguous POST are not retried or exposed',async()=>{
 for(const factory of [()=>{throw Error('PRIVATE-SECRET')},()=>new Response('PRIVATE-SECRET',{status:502}),()=>new Response('html'),()=>json({padding:'x'.repeat(270000)})]){
  let n=0;const t=make(async()=>{n++;return factory()})
  await assert.rejects(t.createCheckout(order),{message:'No se pudo verificar la respuesta de la pasarela de prueba'});assert.equal(n,1)
 }
})

test('explicit Khipu-only transport needs no Mercado Pago credentials and blocks its network calls',async()=>{
 const calls=[]
 const t=createSandboxProviderTransport({mode:'isolated_test',providers:['khipu'],credentials:{khipu:credentials.khipu},fetchImpl:async(url,opts)=>{calls.push(url);return json(opts.method==='POST'?kc:kp)},origin:'https://qa.example.invalid'})
 await assert.rejects(t.createCheckout(mp))
 await assert.rejects(t.locateMercadoPagoPayment('123456'))
 assert.equal(calls.length,0)
 assert.equal((await t.createCheckout(order)).checkout.checkoutId,kc.payment_id)
 assert.equal(calls.length,2)
 for(const providers of [[],['khipu','khipu'],['unknown']])assert.throws(()=>createSandboxProviderTransport({mode:'isolated_test',providers,credentials,fetchImpl:async()=>{},origin:'https://qa.example.invalid'}))
})
