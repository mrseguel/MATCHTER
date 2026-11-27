import test from 'node:test'
import assert from 'node:assert/strict'
import {mediationState,checkMediationAction} from './mediationFlow.js'
const apply=(events,side,action,extra={})=>{const e={id:String(events.length+1),...checkMediationAction({events,side,action,...extra})};events.push(e);return e}
function invited(){const e=[];apply(e,'mediator','review');const i=apply(e,'mediator','invite');return [e,i.id]}
function active(){const [e,i]=invited();apply(e,'client','join',{reference:i});apply(e,'provider','join',{reference:i});return e}
test('requires voluntary participation from both parties',()=>{
 const [e,i]=invited()
 assert.throws(()=>apply(e,'client','propose',{text:'Reparar trabajos'}),{status:409})
 apply(e,'client','join',{reference:i})
 assert.equal(mediationState(e).status,'invited')
 assert.throws(()=>apply(e,'client','join',{reference:i}),{status:409})
 apply(e,'provider','join',{reference:i})
 assert.equal(mediationState(e).status,'mediation')
})
test('only both parties accepting the same proposal closes with agreement',()=>{
 const e=active(),p=apply(e,'mediator','propose',{text:'Reparar trabajos'})
 apply(e,'client','accept',{reference:p.id})
 assert.equal(mediationState(e).status,'mediation')
 assert.throws(()=>apply(e,'mediator','accept',{reference:p.id}),{status:409})
 apply(e,'provider','accept',{reference:p.id})
 assert.equal(mediationState(e).status,'closed_with_agreement')
 assert.throws(()=>apply(e,'client','comment',{text:'Otro mensaje'}),{status:409})
})
test('proposal replacement resets prior consent; old references cannot be accepted',()=>{
 const e=active(),p=apply(e,'mediator','propose',{text:'Primera propuesta'})
 apply(e,'client','accept',{reference:p.id})
 const q=apply(e,'mediator','propose',{text:'Nueva propuesta'})
 assert.deepEqual(mediationState(e).accepted,[])
 assert.throws(()=>apply(e,'provider','accept',{reference:p.id}),{status:409})
 apply(e,'provider','reject',{reference:q.id})
 assert.equal(mediationState(e).proposal,null)
})
test('declining mediation or closing without agreement never records consent',()=>{
 const [e,i]=invited();apply(e,'provider','decline',{reference:i})
 assert.equal(mediationState(e).status,'closed_without_agreement')
 const other=active();apply(other,'mediator','close',{text:'No hay acuerdo'})
 assert.equal(mediationState(other).status,'closed_without_agreement')
})
test('inspection and statements do not imply payment or financial authorization',()=>{
 const e=[];apply(e,'client','comment',{text:'Antecedentes de prueba'})
 assert.throws(()=>apply(e,'provider','inspection',{text:'Solicito visita técnica',mode:'direct'}),{status:409})
 assert.deepEqual(mediationState(e).inspectionRequested,[])
 assert.throws(()=>apply(e,'mediator','release',{text:'Liberar dinero'}),{status:400})
 assert.throws(()=>apply(e,'other','comment',{text:'Acceso indebido'}),{status:403})
 assert.throws(()=>apply(e,'client','review'),{status:409})
})

test('direct inspection can be requested after failed mediation without reopening the case',()=>{
 const e=active();apply(e,'mediator','close',{text:'Sin acuerdo'})
 assert.throws(()=>apply(e,'client','inspection',{text:'Evaluar terminaciones',mode:'legacy_demo'}),{status:409})
 apply(e,'client','inspection',{text:'Evaluar terminaciones',mode:'direct'})
 assert.equal(mediationState(e).status,'closed_without_agreement')
 assert.deepEqual(mediationState(e).inspectionRequested,['client'])
 assert.throws(()=>apply(e,'client','inspection',{text:'Evaluar terminaciones',mode:'direct'}),{status:409})
 assert.throws(()=>apply(e,'client','comment',{text:'Reabrir caso',mode:'direct'}),{status:409})
})

test('both explicit rejections conclude mediation and activate optional direct inspection',()=>{
 const e=active(),p=apply(e,'mediator','propose',{text:'Solución final'})
 apply(e,'client','decision_decline',{reference:p.id})
 assert.equal(mediationState(e).status,'mediation')
 assert.deepEqual(mediationState(e).rejected,['client'])
 assert.throws(()=>apply(e,'client','accept',{reference:p.id}),{status:409})
 assert.throws(()=>apply(e,'client','inspection',{text:'Evaluar terminaciones',mode:'direct'}),{status:409})
 apply(e,'provider','decision_decline',{reference:p.id})
 assert.equal(mediationState(e).status,'closed_without_agreement')
 assert.deepEqual(mediationState(e).rejected,['client','provider'])
 apply(e,'client','inspection',{text:'Evaluar terminaciones',mode:'direct'})
 assert.deepEqual(mediationState(e).inspectionRequested,['client'])
})
test('one acceptance and one rejection also mean no bilateral agreement',()=>{
 for(const first of ['client','provider']){
  const e=active(),p=apply(e,'mediator','propose',{text:'Solución final'})
  apply(e,first,'accept',{reference:p.id})
  apply(e,first==='client'?'provider':'client','decision_decline',{reference:p.id})
  assert.equal(mediationState(e).status,'closed_without_agreement')
 }
})
test('new proposal resets decisions and stale proposals cannot be rejected',()=>{
 const e=active(),p=apply(e,'mediator','propose',{text:'Solución inicial'})
 apply(e,'client','decision_decline',{reference:p.id})
 const q=apply(e,'mediator','propose',{text:'Solución revisada'})
 assert.deepEqual(mediationState(e).rejected,[])
 assert.throws(()=>apply(e,'provider','decision_decline',{reference:p.id}),{status:409})
 apply(e,'provider','decision_decline',{reference:q.id})
 assert.equal(mediationState(e).status,'mediation')
})
