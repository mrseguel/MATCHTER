import test from 'node:test'
import assert from 'node:assert/strict'
import {workflowSnapshot,readWorkflow} from './projectWorkflow.js'
const t=n=>new Date(Date.UTC(2026,10,26,12,n)).toISOString()
const a={version:3,createdAt:t(1),proposedBy:'client',clientConfirmedAt:t(1),providerConfirmedAt:t(2),data:{title:'Test',stages:[['Uno','2026-11-27',100],['Dos','2026-11-28',200],['Tres','2026-11-29',300]]}}
const c={agreementVersion:3,revision:1,mode:'notary',digest:'a'.repeat(64),payer:'provider',proposedBy:'client',createdAt:t(3),notaryAcceptedAt:t(4),clientSignedAt:t(5),providerSignedAt:t(6),notaryDemoPaidAt:t(7),notaryDemoFee:33490,notaryDemoAuthorizedAt:t(8)}
const snap=(side='client',contracts=[c],stages=[],agreements=[a])=>workflowSnapshot({side,agreements,contracts,stages})
test('next action is contextual to each participant, never forces completed agreement screens',()=>{
 assert.equal(snap('client',[],[],[]).next.title,'Preparar acuerdo')
 assert.equal(snap('provider',[],[],[{...a,providerConfirmedAt:null}]).next.title,'Confirmar acuerdo')
 assert.equal(snap('client',[],[],[{...a,providerConfirmedAt:null}]).next.waiting,true)
 assert.equal(snap('client',[]).next.target,'contract')
 assert.equal(snap('provider',[{...c,notaryAcceptedAt:null}]).next.title,'Aceptar modalidad y costo notarial')
 assert.equal(snap('client',[{...c,clientSignedAt:null}]).next.title,'Leer y firmar contrato')
 assert.equal(snap('provider',[{...c,notaryDemoPaidAt:null,notaryDemoAuthorizedAt:null}]).next.title,'Pagar trámite notarial')
 assert.equal(snap('client',[{...c,notaryDemoPaidAt:null,notaryDemoAuthorizedAt:null}]).next.waiting,true)
 assert.equal(snap('client',[{...c,notaryDemoAuthorizedAt:null}]).next.target,'notary')
 assert.deepEqual(snap().next,{target:'stages',title:'Pagar etapa 1',waiting:false})
 assert.equal(snap('provider').next.waiting,true)
 const s={agreementVersion:3,contractRevision:1,stageNo:1,amount:100,fundedAt:t(9)}
 assert.equal(snap('provider',[c],[s]).next.title,'Notificar entrega de etapa 1')
 assert.equal(snap('client',[c],[{...s,deliveredAt:t(10)}]).next.title,'Confirmar entrega de etapa 1 y liberar pago')
 assert.equal(snap('client',[c],[{...s,deliveredAt:t(10),releasedAt:t(11)}]).next.title,'Pagar etapa 2')
 assert.equal(snap('client',[{...c,mode:'simple',notaryDemoAuthorizedAt:null}]).next.target,'stages')
})
test('events use stable IDs and chronological persisted timestamps without fabricated confirmations',()=>{
 const w=snap(),repeat=snap('provider')
 assert.deepEqual(w.events,repeat.events)
 assert.equal(new Set(w.events.map(e=>e.id)).size,w.events.length)
 assert.ok(w.events.some(e=>e.body==='Contrato firmado por ambas partes'))
 assert.ok(w.events.some(e=>e.body==='Trámite notarial completado'))
 assert.ok(!snap('client',[{...c,notaryDemoAuthorizedAt:null}]).events.some(e=>e.body==='Trámite notarial completado'))
 assert.deepEqual(w.events.map(e=>e.createdAt),w.events.map(e=>e.createdAt).sort())
})
test('workflow snapshot is limited to matched participants and actual role',async()=>{
 const db={query:async(_,params)=>({rows:params[1]==='client'?[{senderId:'client',recipientId:'provider',agreements:[a],contracts:[c],stages:[]}]:[]})}
 await assert.rejects(readWorkflow(db,{id:'other',role:'Cliente'},'x'),{status:404})
 await assert.rejects(readWorkflow(db,{id:'client',role:'Empresa'},'x'),{status:403})
 assert.equal((await readWorkflow(db,{id:'client',role:'Cliente'},'x')).next.title,'Pagar etapa 1')
})

test('chat shows only four final formalization milestones, even with earlier proposals',()=>{
 const oldAgreement={...a,version:1,providerConfirmedAt:null}
 const oldContract={...c,revision:1,notaryAcceptedAt:t(3),clientSignedAt:null,providerSignedAt:null,notaryDemoPaidAt:null,notaryDemoAuthorizedAt:null}
 const latest={...c,revision:2}
 const w=snap('client',[oldContract,latest],[],[oldAgreement,a])
 assert.deepEqual(w.events.map(e=>e.body),['Acuerdo final confirmado','Acuerdo notarial confirmado','Contrato firmado por ambas partes','Trámite notarial completado'])
 assert.match(w.events[0].event.detail,/Test.*600.*3 etapas/)
 assert.match(w.events[1].event.detail,/Responsable del pago: Prestador/)
 assert.match(w.events[3].event.detail,/Pago registrado:.*33.490.*Autorización simulada/)
 assert.equal(w.events[3].createdAt,t(8))
 assert.equal(w.next.title,'Pagar etapa 1')
})
test('individual proposals, signatures, and notary payment do not create cards',()=>{
 assert.equal(snap('client',[],[],[{...a,providerConfirmedAt:null}]).events.length,0)
 assert.equal(snap('client',[{...c,notaryAcceptedAt:null,clientSignedAt:null,providerSignedAt:null,notaryDemoPaidAt:null,notaryDemoAuthorizedAt:null}]).events.length,1)
 assert.equal(snap('client',[{...c,providerSignedAt:null,notaryDemoPaidAt:null,notaryDemoAuthorizedAt:null}]).events.length,2)
 assert.equal(snap('client',[{...c,notaryDemoAuthorizedAt:null}]).events.length,3)
 assert.equal(snap('client',[{...c,mode:'simple'}]).events.length,2)
})
test('stage timeline includes recorded deposit and completed release, not individual delivery',()=>{
 const funded={agreementVersion:3,contractRevision:1,stageNo:1,amount:100,fundedAt:t(9)}
 const delivered={...funded,deliveredAt:t(10)}
 assert.equal(snap('client',[c],[funded]).events.length,5)
 assert.equal(snap('client',[c],[delivered]).events.length,5)
 assert.equal(snap('client',[c],[delivered]).next.title,'Confirmar entrega de etapa 1 y liberar pago')
 assert.equal(snap('client',[c],[{...delivered,releasedAt:t(11)}]).events.length,6)
})

test('completed projects invite only the customer to rate the actual provider role',()=>{
 const stages=a.data.stages.map((_,i)=>({agreementVersion:3,contractRevision:1,stageNo:i+1,amount:100,fundedAt:t(9),deliveredAt:t(10),releasedAt:t(11)}))
 const args={agreements:[a],contracts:[c],stages,providerRole:'Empresa'}
 assert.equal(workflowSnapshot({...args,side:'client'}).next.title,'Calificar a la empresa')
 assert.equal(workflowSnapshot({...args,side:'provider'}).next.target,'stages')
 const reviews=[{agreementVersion:3,contractRevision:1,score:5,comment:'Bien',revision:1,createdAt:t(12)}]
 const first=workflowSnapshot({...args,side:'client',reviews,now:new Date(t(12)).getTime()})
 assert.equal(first.next.title,'Modificar calificación')
 assert.equal(first.events.filter(e=>e.event.review).length,1)
 const edited=workflowSnapshot({...args,side:'provider',reviews:[{...reviews[0],score:4,revision:2,updatedAt:t(13)}],now:new Date(t(13)).getTime()})
 assert.equal(edited.events.at(-1).id,first.events.at(-1).id)
 assert.equal(edited.events.at(-1).event.review.score,4)
 assert.equal(edited.events.at(-1).event.review.editable,false)
 assert.equal(workflowSnapshot({...args,side:'client',reviews,now:new Date(t(12)).getTime()+7*86400000}).next.title,'Calificación registrada')
})

test('new signed contract waits for unique service fee and records receipt without changing milestone amounts',()=>{
 const fresh={...c,mode:'simple',terms:{serviceFee:{amount:2990}},notaryDemoAuthorizedAt:null};const w=snap('client',[fresh]);assert.equal(w.next.title,'Pagar tarifa MATCHTER');assert.equal(w.stagesAvailable,false);assert.equal(snap('provider',[fresh]).next.waiting,true);
 const paid=snap('client',[{...fresh,serviceFeePaidAt:t(9)}]);assert.equal(paid.next.title,'Pagar etapa 1');assert.equal(paid.events.filter(e=>e.body==='Tarifa MATCHTER registrada').length,1)
})
