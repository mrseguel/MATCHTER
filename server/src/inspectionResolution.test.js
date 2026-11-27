import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectionResolutionState,checkInspectionResolutionAction} from './inspectionResolution.js'
const base={reportId:'report-1',mode:'direct',mediationStatus:'closed_without_agreement'}
const add=(events,side,action,reference,text)=>{const e={id:String(events.length+1),...checkInspectionResolutionAction({...base,events,side,action,reference,text})};events.push(e);return e}
test('no review before selected report or in protected mode',()=>{
 for(const context of [{reportId:null},{mode:'protected'},{mediationStatus:'mediation'}])assert.throws(()=>checkInspectionResolutionAction({...base,...context,side:'client',action:'inspection_observation',text:'Comentario',reference:'report-1'}),{status:409})
})
test('observations and proposal reference the exact report; outsiders cannot act',()=>{
 const e=[];add(e,'client','inspection_observation','report-1','Revisar la partida')
 assert.throws(()=>add(e,'provider','inspection_observation','other','Otra referencia'),{status:409})
 assert.throws(()=>add(e,'other','inspection_observation','report-1','Acceso indebido'),{status:403})
 assert.throws(()=>add(e,'provider','inspection_propose','report-1','Propuesta unilateral'),{status:409})
 const p=add(e,'mediator','inspection_propose','report-1','Reparación acordada')
 add(e,'client','inspection_accept',p.id)
 assert.equal(inspectionResolutionState(e,'report-1').status,'proposed')
 add(e,'provider','inspection_accept',p.id)
 assert.equal(inspectionResolutionState(e,'report-1').status,'closed_with_agreement')
 assert.throws(()=>add(e,'client','inspection_observation','report-1','Reabrir revisión'),{status:409})
})
test('a rejection closes without agreement once both respond; no payment instruction',()=>{
 const e=[],p=add(e,'mediator','inspection_propose','report-1','Solución sugerida')
 add(e,'provider','inspection_decline',p.id);add(e,'client','inspection_accept',p.id)
 const s=inspectionResolutionState(e,'report-1')
 assert.equal(s.status,'closed_without_agreement');assert.equal(s.moneyInstruction,undefined)
})
test('revised proposal resets acceptance, old references fail',()=>{
 const e=[],p=add(e,'mediator','inspection_propose','report-1','Propuesta original')
 add(e,'client','inspection_accept',p.id)
 const q=add(e,'mediator','inspection_propose','report-1','Propuesta revisada')
 assert.deepEqual(inspectionResolutionState(e,'report-1').accepted,[])
 assert.throws(()=>add(e,'provider','inspection_accept',p.id),{status:409})
 add(e,'provider','inspection_accept',q.id)
 add(e,'mediator','inspection_close','report-1','Sin acuerdo bilateral')
 assert.equal(inspectionResolutionState(e,'report-1').status,'closed_without_agreement')
})
