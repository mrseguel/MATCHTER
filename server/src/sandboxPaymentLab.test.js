import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxPaymentLab} from './sandboxPaymentLab.js'
const fixtureFetch=async()=>{throw Error('No external transport')}
const credentials={khipu:{environment:'sandbox',merchantId:'9876',secret:'fixture-khipu',webhookSecret:'fixture-khipu-hook'},mercadopago:{environment:'sandbox',merchantId:'9876',secret:'fixture-mercadopago',webhookSecret:'fixture-mp-hook'}}
const config={mode:'isolated_test',db:{query:async()=>{throw Error('No database access at construction')},connect:async()=>{throw Error('No database access at construction')}},verifyIdentity:async()=>{throw Error('No identity at construction')},credentials,fixtureFetch,origin:'https://qa.invalid'}
test('laboratory composes payment services without accessing DB or network',()=>{
 const lab=createSandboxPaymentLab(config)
 assert.equal(lab.realPaymentsEnabled,false)
 for(const [name,method] of [['attempts','reserve'],['reconciliation','observe'],['transport','createCheckout'],['worker','dispatch'],['inbox','acceptKhipu'],['drain','run']])assert.equal(typeof lab[name][method],'function')
 assert.equal(typeof lab.router,'function')
})
test('laboratory refuses live mode, real public origins and implicit global network',()=>{
 for(const change of [{mode:'production'},{origin:'https://matchter-beta.vercel.app'},{origin:'http://qa.invalid'},{fixtureFetch:globalThis.fetch},{fixtureFetch:undefined}])assert.throws(()=>createSandboxPaymentLab({...config,...change}))
})
