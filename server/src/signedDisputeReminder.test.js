import test from 'node:test'
import assert from 'node:assert/strict'
import {signedDisputeReminder} from './signedDisputeReminder.js'
const claim={agreementVersion:2,contractRevision:3,digest:'a'.repeat(64)}
const original='Mediación voluntaria. Las partes podrán acudir a tribunales.'
const contract={agreementVersion:2,revision:3,digest:claim.digest,clientSignedAt:'2026-11-25T12:00:00Z',providerSignedAt:'2026-11-25T13:00:00Z',terms:{paymentMode:'direct',clauses:[['OCTAVO. Solución de controversias',original]]}}
test('returns the exact historical text and both signature dates',()=>{
 const result=signedDisputeReminder(claim,contract)
 assert.equal(result.available,true)
 assert.equal(result.text,original)
 assert.equal(result.clientSignedAt,contract.clientSignedAt)
 assert.equal(result.providerSignedAt,contract.providerSignedAt)
 assert.equal(result.contractRevision,3)
 assert.equal(result.demo,true)
})
test('rejects a different version, digest or incomplete signatures',()=>{
 for(const row of [null,{...contract,revision:4},{...contract,agreementVersion:4},{...contract,digest:'b'.repeat(64)},{...contract,providerSignedAt:null},{...contract,clientSignedAt:null}])assert.equal(signedDisputeReminder(claim,row).available,false)
})
test('never substitutes a missing or ambiguous clause',()=>{
 for(const clauses of [[],null,[['NOVENO. Otro asunto','texto']],[['OCTAVO. Solución de controversias',' ']], [...contract.terms.clauses,...contract.terms.clauses]])assert.equal(signedDisputeReminder(claim,{...contract,terms:{clauses}}).available,false)
})
test('old contracts retain their historical wording and legacy mode',()=>{
 const result=signedDisputeReminder(claim,{...contract,terms:{clauses:[['OCTAVO. Solución de controversias','Texto histórico']]}})
 assert.equal(result.text,'Texto histórico')
 assert.equal(result.mode,'legacy_demo')
})
