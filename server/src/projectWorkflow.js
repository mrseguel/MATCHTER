import {AuthError} from './identityAccounts.js'
import {serviceFeeReady,bilateral,needsFeeUpgrade} from './serviceFeeDemo.js'
import {reviewView} from './projectReviewDemo.js'
import {stageReady} from './projectStageDemo.js'
import {isDirectContract,readDirectStageEvents} from './directStageService.js'
import {directStageState} from './directStageTracking.js'
const stamp=v=>v?new Date(v).toISOString():null
const providerLabel=role=>({'Maestro o contratista':'Maestro/contratista',Profesional:'Profesional',Empresa:'Empresa'}[role]||'Prestador')
const rateTitle=role=>({'Maestro o contratista':'Calificar al maestro/contratista',Profesional:'Calificar al profesional',Empresa:'Calificar a la empresa'}[role]||'Calificar a la contraparte')
const both=(a,b)=>a&&b?(new Date(a)>=new Date(b)?a:b):null
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
export function workflowSnapshot({agreements=[],contracts=[],stages=[],directEvents=[],reviews=[],providerRole,side,now=Date.now()}){
 const events=[]
 const add=(key,at,title,detail,target)=>{if(at)events.push({id:'workflow:'+key,createdAt:stamp(at),kind:'workflow',body:title,event:{title,detail,target,demo:true}})}
 const agreed=agreements.filter(a=>a.clientConfirmedAt&&a.providerConfirmedAt).at(-1)
 const formal=agreed?contracts.filter(c=>c.agreementVersion===agreed.version).at(-1):null
 if(agreed){
  const total=agreed.data.stages.reduce((sum,s)=>sum+Number(s[2]),0)
  add('a:'+agreed.version+':both',both(agreed.clientConfirmedAt,agreed.providerConfirmedAt),'Acuerdo final confirmado',agreed.data.title+' · '+clp(total)+' · '+agreed.data.stages.length+' etapas','agreement')
 }
 if(formal){
  const c=formal,k='c:'+c.agreementVersion+':'+c.revision,p=c.payer==='client'?'Cliente':providerLabel(providerRole)
  if(c.mode==='notary'&&['client','provider'].includes(c.payer))add(k+':accepted',c.notaryAcceptedAt,'Acuerdo notarial confirmado','Modalidad notarial · Responsable del pago: '+p,'notary')
  add(k+':both',both(c.clientSignedAt,c.providerSignedAt),'Contrato firmado por ambas partes','Ambas firmas de prueba confirmadas','contract')
  if(c.terms?.serviceFee&&c.serviceFeePaidAt)add(k+':service-fee',c.serviceFeePaidAt,'Tarifa MATCHTER registrada',clp(c.terms.serviceFee.amount)+(bilateral(c)?' · tarifa del cliente':' · pago único de prueba'),'contract')
  if(bilateral(c)&&c.providerFeePaidAt)add(k+':provider-fee',c.providerFeePaidAt,'Tarifa MATCHTER del '+providerLabel(providerRole)+' registrada',clp(c.terms.serviceFee.amount)+(c.providerFeeStageNo?' · descuento de la etapa '+c.providerFeeStageNo:' · pago directo de prueba'),'contract')
  if(c.mode==='notary'&&stageReady(c))add(k+':authorized',both(c.notaryDemoPaidAt,c.notaryDemoAuthorizedAt),'Trámite notarial completado','Pago registrado: '+clp(c.notaryDemoFee)+' · Autorización simulada completada · Sin validez legal','notary')
 }
 if(isDirectContract(formal)&&agreed){
  for(const [i,e] of directEvents.entries()){
   const label={start:'Inicio de etapa ',progress:'Avance de etapa ',deliver:'Entrega de etapa ',accept:'Recepción conforme de etapa '}[e.action]
   if(label)add('d:'+formal.agreementVersion+':'+formal.revision+':'+i,e.at,label+e.stageNo,e.action==='progress'?e.progressPercent+' % de avance informado':'Seguimiento de obra · sin resguardo de fondos','stages')
  }
 }
 for(const s of stages.filter(s=>formal&&!isDirectContract(formal)&&s.agreementVersion===formal.agreementVersion&&s.contractRevision===formal.revision)){
  const k='s:'+s.agreementVersion+':'+s.contractRevision+':'+s.stageNo,detail='Etapa '+s.stageNo+' · '+clp(s.amount)+' · simulación'
  add(k+':funded',s.fundedAt,'Depósito de etapa '+s.stageNo+' registrado',detail,'stages')
  add(k+':released',both(both(s.fundedAt,s.deliveredAt),s.releasedAt),'Etapa '+s.stageNo+' recibida conforme y pago liberado',detail+(formal.providerFeeStageNo===s.stageNo?' · tarifa '+clp(formal.terms.serviceFee.amount)+' · neto '+clp(Number(s.amount)-formal.terms.serviceFee.amount):''),'stages')
 }
 events.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))
 const a=agreements.at(-1)||null,c=contracts.filter(x=>x.agreementVersion===a?.version).at(-1)||null
 const ready=stageReady(c)
 const direct=isDirectContract(c),tracking=ready&&direct?directStageState(a,directEvents):null
 const current=tracking?(tracking.currentStage||0):ready?a.data.stages.findIndex((_,i)=>!stages.find(s=>s.agreementVersion===a.version&&s.contractRevision===c.revision&&s.stageNo===i+1)?.releasedAt)+1:null
 const s=current?stages.find(s=>s.agreementVersion===a.version&&s.contractRevision===c.revision&&s.stageNo===current):null
 const review=c?reviewView(reviews.find(r=>r.agreementVersion===a.version&&r.contractRevision===c.revision)||null,side,now):null
 const complete=ready&&current===0
 if(complete&&review){events.push({id:'workflow:review:'+a.version+':'+c.revision,createdAt:stamp(review.createdAt),kind:'workflow',body:'Calificación registrada',event:{title:'Calificación registrada',target:'review',demo:true,review,providerLabel:providerLabel(providerRole)}});events.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))}
 let next
 const step=(target,title,waiting=false)=>({target,title,waiting})
 if(!a)next=step('agreement','Preparar acuerdo')
 else if(!a.clientConfirmedAt||!a.providerConfirmedAt)next=step('agreement',a[side+'ConfirmedAt']?'Esperando confirmación del acuerdo':'Confirmar acuerdo',!!a[side+'ConfirmedAt'])
 else if(!c)next=step('contract','Elegir modalidad contractual')
 else if(needsFeeUpgrade(c)&&c.terms?.serviceFee)next=step('contract','Actualizar modalidad contractual')
 else if(c.mode==='notary'&&!c.notaryAcceptedAt)next=step('contract',c.proposedBy===side?'Esperando aceptación del costo notarial':'Aceptar modalidad y costo notarial',c.proposedBy===side)
 else if(!c.clientSignedAt||!c.providerSignedAt)next=step('contract',c[side+'SignedAt']?'Esperando firma de la contraparte':'Leer y firmar contrato',!!c[side+'SignedAt'])
 else if(!serviceFeeReady(c)){if(bilateral(c)&&side==='provider'&&!c.providerFeeMode)next=step('contract','Elegir pago de tu tarifa MATCHTER');else if(!c.serviceFeePaidAt)next=step('contract',side==='client'?'Pagar tarifa MATCHTER':'Esperando tarifa del cliente',side!=='client');else next=step('contract','Esperando modalidad de pago del '+providerLabel(providerRole),true)}
 else if(c.mode==='notary'&&!c.notaryDemoPaidAt)next=step('notary',c.payer===side?'Pagar trámite notarial':'Esperando pago notarial',c.payer!==side)
 else if(c.mode==='notary'&&!c.notaryDemoAuthorizedAt)next=step('notary','Simular autorización notarial')
 else if(complete)next=side==='client'&&!review?step('review',rateTitle(providerRole)):review?step('review',side==='client'&&review.editable?'Modificar calificación':'Calificación registrada'):step('stages','Proyecto recibido conforme')
 else if(ready&&current&&direct){
  const milestone=tracking.stages[current-1]
  if(!milestone.startedAt)next=step('stages',side==='provider'?'Registrar inicio de etapa '+current:'Esperando inicio de etapa '+current,side!=='provider')
  else if(!milestone.deliveredAt)next=step('stages',side==='provider'?'Informar avance o entrega de etapa '+current:'Consultar avance de etapa '+current)
  else next=step('stages',side==='client'?'Confirmar recepción de etapa '+current:'Esperando recepción conforme de etapa '+current,side!=='client')
 }
 else if(ready&&current){if(!s?.fundedAt)next=step('stages',side==='client'?'Pagar etapa '+current:'Esperando depósito de etapa '+current,side!=='client');else if(!s.deliveredAt)next=step('stages',side==='provider'?'Notificar entrega de etapa '+current:'Esperando entrega de etapa '+current,side!=='provider');else next=step('stages',side==='client'?'Confirmar entrega de etapa '+current+' y liberar pago':'Esperando liberación del pago de etapa '+current,side!=='client')}
 else next=step('contract','Revisar formalización contractual')
 return {demo:true,next,events,complete,review,providerLabel:providerLabel(providerRole),agreement:a?{version:a.version,data:a.data,confirmed:{client:stamp(a.clientConfirmedAt),provider:stamp(a.providerConfirmedAt)}}:null,contract:c?{revision:c.revision,agreementVersion:c.agreementVersion,digest:c.digest,mode:c.mode}:null,notaryAvailable:c?.mode==='notary',stagesAvailable:ready}
}
export async function readWorkflow(db,actor,id,{sandboxFeeProjection}={}){
 const row=(await db.query(`SELECT r.sender_profile_id AS "senderId",r.recipient_profile_id AS "recipientId",
 (SELECT p.role FROM matchter.account_profiles p WHERE p.id=r.recipient_profile_id) AS "providerRole",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('version',a.version,'data',a.data,'proposedBy',CASE WHEN a.proposed_by=r.sender_profile_id THEN 'client' ELSE 'provider' END,'createdAt',a.created_at,'clientConfirmedAt',a.client_confirmed_at,'providerConfirmedAt',a.provider_confirmed_at) ORDER BY a.version) FROM matchter.project_agreement_versions a WHERE a.request_id=r.id),'[]'::jsonb) AS agreements,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('agreementVersion',c.agreement_version,'revision',c.revision,'mode',c.mode,'digest',c.digest,'terms',jsonb_build_object('serviceFee',c.terms->'serviceFee','paymentMode',c.terms->'paymentMode'),'serviceFeePaidAt',c.service_fee_demo_paid_at,'providerFeeMode',c.provider_fee_demo_mode,'providerFeePaidAt',c.provider_fee_demo_paid_at,'providerFeeStageNo',c.provider_fee_demo_stage_no,'payer',c.terms->'notaryArrangement'->>'payer','proposedBy',c.terms->'notaryArrangement'->>'proposedBy','createdAt',c.created_at,'clientSignedAt',c.client_signed_at,'providerSignedAt',c.provider_signed_at,'notaryAcceptedAt',c.notary_accepted_at,'notaryDemoPaidAt',c.notary_demo_paid_at,'notaryDemoFee',c.notary_demo_fee,'notaryDemoAuthorizedAt',c.notary_demo_authorized_at) ORDER BY c.agreement_version,c.revision) FROM matchter.project_contract_demos c WHERE c.request_id=r.id),'[]'::jsonb) AS contracts,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('agreementVersion',s.agreement_version,'contractRevision',s.contract_revision,'stageNo',s.stage_no,'amount',s.amount,'fundedAt',s.funded_at,'deliveredAt',s.delivered_at,'releasedAt',s.released_at) ORDER BY s.agreement_version,s.contract_revision,s.stage_no) FROM matchter.project_stage_demos s WHERE s.request_id=r.id),'[]'::jsonb) AS stages,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('agreementVersion',v.agreement_version,'contractRevision',v.contract_revision,'score',COALESCE(e.score,v.score),'comment',COALESCE(e.comment,v.comment),'createdAt',v.created_at,'updatedAt',COALESCE(e.created_at,v.created_at),'revision',COALESCE(e.revision,1))) FROM matchter.project_review_demos v LEFT JOIN LATERAL (SELECT score,comment,created_at,revision FROM matchter.project_review_demo_revisions WHERE request_id=v.request_id AND agreement_version=v.agreement_version AND contract_revision=v.contract_revision ORDER BY revision DESC LIMIT 1) e ON true WHERE v.request_id=r.id),'[]'::jsonb) AS reviews
 FROM matchter.swipe_requests r WHERE r.id=$1 AND r.status='accepted' AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)`,[id,actor.id])).rows[0]
 if(!row)throw new AuthError(404,'Conversación no disponible')
 const side=row.senderId===actor.id?'client':'provider'
 if((side==='client')!==(actor.role==='Cliente'))throw new AuthError(403,'Perfil no autorizado')
 const a=row.agreements.at(-1),c=row.contracts.filter(x=>x.agreementVersion===a?.version).at(-1)
 if(sandboxFeeProjection&&c){const projected=await sandboxFeeProjection(actor,id,c);row.contracts=row.contracts.map(x=>x===c?projected:x)}
 const directEvents=isDirectContract(c)?await readDirectStageEvents(db,id,a,c):[]
 return workflowSnapshot({...row,side,directEvents})
}
