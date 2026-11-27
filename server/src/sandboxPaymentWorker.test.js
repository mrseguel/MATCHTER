import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxPaymentWorker} from './sandboxPaymentWorker.js'
const id='12345678-1234-4234-8234-123456789012',a={id,provider:'khipu',amountCLP:2990},merchants={khipu:'9876',mercadopago:'9876'}
const url='https://khipu.com/payment/info/abc123def456'
function fixture(failure){
 const events=[],response={payment_id:'abc123def456'}
 const worker=createSandboxPaymentWorker({mode:'isolated_test',merchants,db:{query:async()=>({rows:[{...a,checkoutId:'abc123def456',merchantId:'9876'}]})},attempts:{markDispatchUnknown:async()=>{events.push('persist_unknown');if(failure==='reserve')throw Error('blocked');return a}},transport:{createCheckout:async order=>{events.push('create');assert.equal(order.amountCLP,2990);assert.equal(order.reference,id);if(failure==='network')throw Error('ambiguous');return {response,checkout:{checkoutUrl:url}}},readPayment:async(order,checkoutId)=>{events.push('get');assert.equal(order.reference,id);assert.equal(checkoutId,'abc123def456');return {response}}},reconciliation:{bindCheckout:async(attempt,body)=>{events.push('bind');assert.equal(attempt,id);assert.deepEqual(body,response);if(failure==='bind')throw Error('conflict')},observe:async(attempt,body)=>{events.push('observe');assert.equal(attempt,id);assert.deepEqual(body,response);return {status:'verified_test',realPayment:false}}}})
 return {events,worker}
}
test('dispatch persists ambiguity before creating and binds before returning URL',async()=>{
 const {events,worker}=fixture()
 assert.deepEqual(await worker.dispatch(id,'owner'),{attemptId:id,provider:'khipu',checkoutUrl:url,environment:'sandbox',realPayment:false})
 assert.deepEqual(events,['persist_unknown','create','bind'])
})
test('errors never retry creation or bypass durable reservation',async()=>{
 for(const [failure,expected] of [['reserve',['persist_unknown']],['network',['persist_unknown','create']],['bind',['persist_unknown','create','bind']]]){
  const {events,worker}=fixture(failure)
  await assert.rejects(worker.dispatch(id,'owner'));assert.deepEqual(events,expected)
 }
})
test('reconciliation obtains saved checkout and a fresh provider response',async()=>{
 const {events,worker}=fixture();assert.deepEqual(await worker.reconcile(id),{status:'verified_test',realPayment:false});assert.deepEqual(events,['get','observe'])
})
