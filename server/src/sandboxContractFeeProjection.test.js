import test from 'node:test'
import assert from 'node:assert/strict'
import {projectSandboxFees,createSandboxContractFeeProjection} from './sandboxContractFeeProjection.js'
import {serviceFeeReady} from './serviceFeeDemo.js'
const current={terms:{paymentMode:'direct',serviceFee:{version:2,amount:2990}},clientSignedAt:'2026-11-27',providerSignedAt:'2026-11-27',serviceFeePaidAt:'legacy',providerFeePaidAt:'legacy',providerFeeMode:'upfront'}
const item=side=>({side,status:'verified_test',amount:2990,bound:true,notified:true,observedAt:'2026-11-27T20:30:41.305Z'})
test('one verified side never unlocks bilateral contract',()=>{const c=projectSandboxFees(current,[item('client')]);assert.equal(c.sandboxFeeVerification.client,'verified_test');assert.equal(c.providerFeePaidAt,null);assert.equal(serviceFeeReady(c),false)})
test('both verified sides satisfy the existing fee gate',()=>{const c=projectSandboxFees(current,[item('client'),item('provider')]);assert.equal(serviceFeeReady(c),true);assert.equal(c.providerFeeMode,'upfront')})
test('review, duplicate, mismatched amount, missing webhook or binding fail closed',()=>{for(const bad of [{status:'review'},{amount:1},{notified:false},{bound:false}])assert.equal(serviceFeeReady(projectSandboxFees(current,[item('client'),{...item('provider'),...bad}])),false);assert.equal(serviceFeeReady(projectSandboxFees(current,[item('client'),item('provider'),item('provider')])),false)})
test('never activates live projection',()=>assert.throws(()=>createSandboxContractFeeProjection({mode:'live',db:{query(){}}})))
