import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectionState,nextInspectionEvent} from './inspectionLifecycle.js'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const requester={profileId:id(1),accountId:id(2)},professional={profileId:id(3),accountId:id(4)},outsider={profileId:id(5),accountId:id(6)}
const order={caseId:id(7),requesterProfileId:requester.profileId,requesterAccountId:requester.accountId,inspectorProfileId:professional.profileId,partyAccountIds:[requester.accountId,id(8)],inspector:{...professional,verified:true,eligible:true}}
const now=Date.parse('2026-11-26T12:00:00Z')
const quoteInput={scope:'Evaluar los defectos de ejecución y partidas pendientes',feeCLP:50000,validUntil:'2026-12-01T12:00:00Z'}
const invoke=(events,actor,action,input,extra={})=>nextInspectionEvent({order,events,actor,action,input,now,...extra})
const add=(events,actor,action,input,extra={})=>{const e={id:String(events.length+1),...invoke(events,actor,action,input,extra)};events.push(e);return e}
function quoted(){const e=[];add(e,professional,'quote',quoteInput);return e}
function accepted(){const e=quoted();add(e,requester,'accept',{quoteId:'1',feeCLP:50000,accepted:true});return e}
test('only an independent verified assigned professional can quote',()=>{
 const e=quoted()
 assert.equal(inspectionState(e).status,'quoted')
 assert.throws(()=>invoke([],outsider,'quote',quoteInput),{status:403})
 assert.throws(()=>invoke([],requester,'quote',quoteInput),{status:409})
 assert.throws(()=>invoke([],professional,'quote',quoteInput,{order:{...order,inspector:{...order.inspector,eligible:false}}}),{status:403})
})
test('acceptance is tied to latest quote and exact honorarium',()=>{
 const e=quoted();add(e,professional,'quote',{...quoteInput,feeCLP:60000})
 assert.throws(()=>invoke(e,requester,'accept',{quoteId:'1',feeCLP:50000,accepted:true}),{status:409})
 assert.throws(()=>invoke(e,requester,'accept',{quoteId:'2',feeCLP:50000,accepted:true}),{status:409})
 assert.throws(()=>invoke(e,professional,'accept',{quoteId:'2',feeCLP:60000,accepted:true}),{status:409})
 add(e,requester,'accept',{quoteId:'2',feeCLP:60000,accepted:true})
 assert.equal(inspectionState(e).status,'accepted_pending_coordination')
 assert.equal(inspectionState(e).quote.noMoneyMoved,true)
})
test('visit must be proposed and explicitly accepted by requester',()=>{
 const e=accepted(),at='2026-11-30T12:00:00Z'
 assert.throws(()=>invoke(e,requester,'visit',{at}),{status:409})
 add(e,professional,'visit',{at});assert.equal(inspectionState(e).status,'visit_proposed')
 assert.throws(()=>invoke(e,requester,'confirm_visit',{visitId:'2',accepted:true}),{status:409})
 add(e,requester,'confirm_visit',{visitId:'3',accepted:true});assert.equal(inspectionState(e).status,'visit_confirmed')
})
test('report requires confirmed visit, assigned inspector and no financial instruction',()=>{
 const e=accepted(),at='2026-11-30T12:00:00Z'
 const input={visitedAt:at,findings:'Se observaron trabajos pendientes de ejecución.',limitations:'Inspección visual',items:[{kind:'completion',description:'Terminaciones pendientes',amountCLP:150000}]}
 assert.throws(()=>invoke(e,professional,'report',input),{status:409})
 add(e,professional,'visit',{at});add(e,requester,'confirm_visit',{visitId:'3',accepted:true})
 assert.throws(()=>invoke(e,professional,'report',input),{status:409})
 assert.throws(()=>invoke(e,requester,'report',input,{now:Date.parse(at)}),{status:409})
 add(e,professional,'report',input,{now:Date.parse(at)})
 assert.equal(inspectionState(e).report.estimateCLP,150000)
 assert.equal(inspectionState(e).report.authorizesDeduction,false)
 assert.throws(()=>invoke(e,professional,'report',input,{now:Date.parse(at)}),{status:409})
})
