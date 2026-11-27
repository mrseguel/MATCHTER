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
 apply(e,'provider','inspection',{text:'Solicito visita técnica'})
 assert.deepEqual(mediationState(e).inspectionRequested,['provider'])
 assert.throws(()=>apply(e,'provider','inspection',{text:'Segunda solicitud'}),{status:409})
 assert.throws(()=>apply(e,'mediator','release',{text:'Liberar dinero'}),{status:400})
 assert.throws(()=>apply(e,'other','comment',{text:'Acceso indebido'}),{status:403})
 assert.throws(()=>apply(e,'client','review'),{status:409})
})
