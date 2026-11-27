import test from 'node:test'
import assert from 'node:assert/strict'
import {buildCheckoutRequest,readCheckoutResponse,verifyProviderPayment} from './paymentProviderContracts.js'
const k={provider:'khipu',environment:'sandbox',reference:'qa-unique-123',amountCLP:2990,merchantId:'9876'}
const mp={...k,provider:'mercadopago'}
const kid='abc123def456',mid='987654321'
const kresult={payment_id:kid,receiver_id:9876,transaction_id:k.reference,currency:'CLP',amount:'2990.0000',status:'done',status_detail:'normal',out_of_date_conciliation:false,bank_account_number:'QA-private'}
const mresult={id:mid,live_mode:false,collector_id:9876,external_reference:mp.reference,currency_id:'CLP',transaction_amount:2990,status:'approved',status_detail:'accredited',payment_type_id:'debit_card',transaction_amount_refunded:0,payer:{email:'qa@example.invalid'}}
test('checkout requests use fixed endpoints, server amount and a reference without personal data',()=>{
 const a=buildCheckoutRequest(k,'https://qa.example.invalid'),b=buildCheckoutRequest(mp,'https://qa.example.invalid')
 assert.equal(a.auth,'x-api-key');assert.equal(a.body.amount,2990);assert.equal(a.body.transaction_id,k.reference)
 assert.equal(b.auth,'Bearer');assert.equal(b.body.items[0].unit_price,2990);assert.equal(b.body.external_reference,mp.reference)
 assert.throws(()=>buildCheckoutRequest({...k,environment:'live'},'https://qa.example.invalid'))
 assert.throws(()=>buildCheckoutRequest({...k,amountCLP:0},'https://qa.example.invalid'))
 assert.throws(()=>buildCheckoutRequest(k,'http://qa.example.invalid'))
})
test('only HTTPS provider checkout URLs and sandbox Mercado Pago URLs are accepted',()=>{
 assert.equal(readCheckoutResponse(k,{payment_id:kid,payment_url:'https://khipu.com/payment/info/'+kid}).checkoutId,kid)
 const response={id:'qa-preference',collector_id:9876,external_reference:mp.reference,sandbox_init_point:'https://sandbox.mercadopago.cl/checkout/pay'}
 assert.equal(readCheckoutResponse(mp,response).checkoutId,'qa-preference')
 for(const url of ['https://khipu.com.evil.invalid/a','https://khipu.com@evil.invalid/a','http://khipu.com/a'])assert.throws(()=>readCheckoutResponse(k,{payment_id:kid,payment_url:url}))
 assert.throws(()=>readCheckoutResponse(mp,{...response,sandbox_init_point:undefined,init_point:'https://www.mercadopago.cl/checkout/pay'}))
})
test('Khipu verifies exact normal timely reconciliation and excludes private response fields',()=>{
 const r=verifyProviderPayment(k,kid,kresult);assert.equal(r.status,'verified_test');assert.equal(r.realPayment,false);assert.equal('bank_account_number' in r,false)
 for(const change of [{amount:2991},{receiver_id:9877},{transaction_id:'other'},{currency:'USD'},{payment_id:'different'}])assert.throws(()=>verifyProviderPayment(k,kid,{...kresult,...change}))
 for(const change of [{status_detail:'marked-paid-by-receiver'},{status_detail:'fully-refunded'},{out_of_date_conciliation:true}])assert.equal(verifyProviderPayment(k,kid,{...kresult,...change}).status,'review')
 assert.equal(verifyProviderPayment(k,kid,{...kresult,status:'verifying',status_detail:'pending'}).status,'pending')
})
test('Mercado Pago rejects live and mismatched responses; only confirmed test card payments qualify',()=>{
 const verify=b=>verifyProviderPayment(mp,'qa-preference',b,{paymentId:mid})
 const r=verify(mresult);assert.equal(r.status,'verified_test');assert.equal(r.realPayment,false);assert.equal('payer' in r,false)
 for(const change of [{live_mode:true},{transaction_amount:2991},{collector_id:123},{external_reference:'other'},{currency_id:'USD'},{id:'other'}])assert.throws(()=>verify({...mresult,...change}))
 for(const change of [{payment_type_id:'account_money'},{transaction_amount_refunded:1},{status:'refunded'}])assert.equal(verify({...mresult,...change}).status,'review')
 assert.equal(verify({...mresult,status:'rejected'}).status,'declined')
})
