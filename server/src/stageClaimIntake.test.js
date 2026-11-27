import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareStageClaim,validateStageClaim} from './stageClaimIntake.js'
const digest='a'.repeat(64),agreement={version:2,data:{title:'Remodelación',stages:[['Preparación','2027-01-01',40000,40],['Terminaciones','2027-01-04',60000,60]]}},contract={revision:1,digest,clientSignedAt:'now',providerSignedAt:'now',terms:{paymentMode:'direct'}}
const input={requestId:'11111111-1111-4111-8111-111111111111',submissionId:'22222222-2222-4222-8222-222222222222',agreementVersion:2,contractRevision:1,digest,stageNo:1,reason:'quality_scope',description:'El trabajo no coincide con las especificaciones acordadas.',requestedResolution:'Corregir las terminaciones',contractReference:'Cláusula segunda'}
const tracking={agreementVersion:2,contractRevision:1,digest,currentStage:2,complete:false,stages:[{stageNo:1,progressPercent:100,status:'accepted',acceptedAt:'2027-01-01'},{stageNo:2,progressPercent:25,status:'in_progress'}]}
const make=(overrides={})=>prepareStageClaim({input,agreement,contract,tracking,side:'client',...overrides})
test('claim snapshots selected earlier stage and current project stage independently',()=>{
 const c=make()
 assert.equal(c.stageSnapshot.amount,40000)
 assert.equal(c.stageSnapshot.progressPercent,100)
 assert.equal(c.stageSnapshot.title,'Preparación')
 assert.equal(c.currentStage,2)
 assert.equal(c.status,'received')
 assert.equal(c.projectTitle,'Remodelación')
})
test('both participants may file; outsiders and stale or unsigned documents are rejected',()=>{
 assert.equal(make({side:'provider'}).side,'provider')
 assert.throws(()=>make({side:'other'}),{status:403})
 assert.throws(()=>make({contract:{...contract,revision:2}}),{status:409})
 assert.throws(()=>make({contract:{...contract,clientSignedAt:null}}),{status:409})
 assert.throws(()=>make({tracking:{...tracking,digest:'b'.repeat(64)}}),{status:409})
})
test('server rejects invented stage, monetary data, and caller-supplied case status',()=>{
 assert.throws(()=>make({input:{...input,stageNo:3}}),{status:400})
 for(const extra of [{amount:1},{status:'resolved'},{peerName:'fake'},{attachmentUrl:'https://example.com'}])assert.throws(()=>validateStageClaim({...input,...extra}),{status:400})
})
test('direct and legacy demo cases have no money movement, completed project policy is separate',()=>{
 assert.equal(make().mode,'direct')
 const legacy=make({contract:{...contract,terms:{}}})
 assert.equal(legacy.mode,'legacy_demo')
 assert.equal(legacy.stageSnapshot.progressPercent,null)
 assert.equal(legacy.stageSnapshot.acceptedAt,null)
 assert.throws(()=>make({tracking:{...tracking,complete:true}}),{status:409})
})
