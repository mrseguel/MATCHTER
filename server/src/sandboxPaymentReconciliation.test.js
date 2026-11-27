import test from 'node:test'
import assert from 'node:assert/strict'
import {nextSandboxStatus,assertPreferenceLink,createSandboxReconciliation} from './sandboxPaymentReconciliation.js'
test('sandbox reconciliation never permits live mode',()=>{
 assert.throws(()=>createSandboxReconciliation({mode:'production',merchants:{khipu:'1',mercadopago:'2'}}))
 assert.throws(()=>createSandboxReconciliation({mode:'isolated_test',merchants:{khipu:'1'}}))
})
test('duplicate observations do not downgrade confirmation; uncertain later state requires review',()=>{
 assert.equal(nextSandboxStatus('verified_test','verified_test'),'verified_test')
 for(const status of ['pending','declined','review'])assert.equal(nextSandboxStatus('verified_test',status),'review')
 assert.equal(nextSandboxStatus('review','verified_test'),'review')
 assert.equal(nextSandboxStatus('declined','pending'),'declined')
 assert.equal(nextSandboxStatus('pending','verified_test'),'verified_test')
 assert.throws(()=>nextSandboxStatus('pending','paid'))
})
test('Mercado Pago merchant order must link the exact preference, reference, receiver and payment',()=>{
 const order={reference:'attempt-id',merchantId:'9876'},payment={order:{type:'mercadopago',id:'123'}}
 const m={id:'123',preference_id:'pref-1',external_reference:'attempt-id',collector:{id:9876},payments:[{id:'456'}]}
 assert.doesNotThrow(()=>assertPreferenceLink(order,'pref-1','456',payment,m))
 for(const change of [{preference_id:'wrong'},{external_reference:'wrong'},{collector:{id:9999}},{payments:[]},{id:'wrong'}])assert.throws(()=>assertPreferenceLink(order,'pref-1','456',payment,{...m,...change}),{status:409})
 assert.throws(()=>assertPreferenceLink(order,'pref-1','456',{order:{type:'wrong',id:'123'}},m),{status:409})
})
