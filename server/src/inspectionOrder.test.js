import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectionQuote,acceptInspectionQuote,validateInspectionReport} from './inspectionOrder.js'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const now=Date.parse('2026-11-26T12:00:00Z')
const input={caseId:id(1),requesterAccountId:id(2),partyAccountIds:[id(2),id(3)],inspector:{accountId:id(4),profileId:id(5),verified:true,eligible:true},scope:'Evaluar partidas pendientes y defectos de ejecución',feeCLP:50000,validUntil:'2026-12-01T12:00:00Z',now}
const quote=()=>inspectionQuote(input)
const order=()=>acceptInspectionQuote({quote:quote(),actorAccountId:id(2),acceptedFeeCLP:50000,accepted:true,now})
test('inspector must be independent and verified',()=>{
 assert.equal(quote().status,'quoted')
 for(const inspector of [{...input.inspector,accountId:id(3)},{...input.inspector,verified:false},{...input.inspector,eligible:false}])assert.throws(()=>inspectionQuote({...input,inspector}),{status:403})
})
test('only the requester may accept the exact valid fee; no charge occurs',()=>{
 assert.equal(order().noMoneyMoved,true)
 assert.throws(()=>acceptInspectionQuote({quote:quote(),actorAccountId:id(3),acceptedFeeCLP:50000,accepted:true,now}),{status:403})
 assert.throws(()=>acceptInspectionQuote({quote:quote(),actorAccountId:id(2),acceptedFeeCLP:1,accepted:true,now}),{status:409})
 assert.throws(()=>acceptInspectionQuote({quote:quote(),actorAccountId:id(2),acceptedFeeCLP:50000,accepted:true,now:Date.parse(input.validUntil)}),{status:409})
})
test('assigned inspector provides an estimate, never a deduction instruction',()=>{
 const report={order:order(),actorAccountId:id(4),findings:'Se observaron partidas pendientes de ejecución.',limitations:'Evaluación visual',items:[{kind:'repair',description:'Terminaciones',amountCLP:100000},{kind:'completion',description:'Instalaciones',amountCLP:200000}]}
 const r=validateInspectionReport(report)
 assert.equal(r.estimateCLP,300000)
 assert.equal(r.authorizesDeduction,false)
 assert.throws(()=>validateInspectionReport({...report,actorAccountId:id(2)}),{status:403})
 assert.throws(()=>validateInspectionReport({...report,items:[{kind:'repair',description:'Terminaciones',amountCLP:-1}]}),{status:400})
})
