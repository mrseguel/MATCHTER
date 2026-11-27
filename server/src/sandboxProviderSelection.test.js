import test from 'node:test'
import assert from 'node:assert/strict'
import {sandboxProviders,sandboxMerchants} from './sandboxProviderSelection.js'
import {createSandboxPaymentAttempts} from './sandboxPaymentAttempts.js'
import {createSandboxReconciliation} from './sandboxPaymentReconciliation.js'
const id='12345678-1234-4234-8234-123456789012'
test('provider selection defaults to both; explicit single-provider setup never keeps unused credentials',()=>{
 assert.deepEqual(sandboxProviders(),['khipu','mercadopago'])
 assert.deepEqual(sandboxMerchants({khipu:'123',mercadopago:'456'},['khipu']),{khipu:'123'})
 assert.throws(()=>sandboxMerchants({khipu:'123'}))
 assert.throws(()=>sandboxMerchants({khipu:'not-id'},['khipu']))
 for(const p of [null,[],['khipu','khipu'],['__proto__']])assert.throws(()=>sandboxProviders(p))
})
test('Khipu-only reservations reject Mercado Pago before DB access',async()=>{
 let calls=0
 const a=createSandboxPaymentAttempts({mode:'isolated_test',providers:['khipu'],db:{connect:async()=>{calls++;throw Error('unexpected')}},verifyIdentity:async()=>{throw Error('unexpected')}})
 await assert.rejects(a.reserve('fixture',{role:'client',requestId:id,submissionId:id,provider:'mercadopago',agreementVersion:1,contractRevision:1,digest:'a'.repeat(64)}),{message:'Datos de intento inválidos'})
 assert.equal(calls,0)
})
test('Khipu-only reconciliation rejects existing disabled-provider attempt before writes',async()=>{
 const statements=[]
 const service=createSandboxReconciliation({mode:'isolated_test',providers:['khipu'],merchants:{khipu:'123'},db:{connect:async()=>({query:async sql=>{statements.push(sql);return {rows:sql.startsWith('SELECT id,')?[{provider:'mercadopago'}]:[]}},release(){}})}})
 await assert.rejects(service.bindCheckout(id,{}),{message:'Proveedor de prueba no habilitado'})
 assert.equal(statements.length,3)
 assert.equal(statements.at(-1),'ROLLBACK')
})
