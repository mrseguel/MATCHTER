import {AuthError} from './identityAccounts.js'
import {stageReady} from './projectStageDemo.js'
const stamp=v=>v?new Date(v).toISOString():null
const label=s=>s==='client'?'Cliente':'Prestador'
const both=(a,b)=>a&&b?(new Date(a)>=new Date(b)?a:b):null
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
export function workflowSnapshot({agreements=[],contracts=[],stages=[],side}){
 const events=[]
 const add=(key,at,title,detail,target)=>{if(at)events.push({id:'workflow:'+key,createdAt:stamp(at),kind:'workflow',body:title,event:{title,detail,target,demo:true}})}
 for(const a of agreements){
  const k='a:'+a.version
  add(k+':proposed',a.createdAt,'Acuerdo propuesto','Versión '+a.version+' · '+label(a.proposedBy),'agreement')
  for(const s of ['client','provider'])if(s!==a.proposedBy)add(k+':'+s,a[s+'ConfirmedAt'],'Acuerdo confirmado por '+label(s),'Versión '+a.version,'agreement')
  add(k+':both',both(a.clientConfirmedAt,a.providerConfirmedAt),'Acuerdo confirmado por ambas partes','Versión '+a.version,'agreement')
 }
 for(const c of contracts){
  const k='c:'+c.agreementVersion+':'+c.revision,p=c.payer?label(c.payer):'Por definir'
  add(k+':created',c.createdAt,c.mode==='notary'?'Modalidad notarial propuesta':'Contrato simple preparado','Documento versión '+c.revision+(c.mode==='notary'?' · Paga: '+p:''),'contract')
  add(k+':accepted',c.notaryAcceptedAt,'Acuerdo de costo notarial confirmado','Responsable: '+p,'notary')
  for(const s of ['client','provider'])add(k+':'+s,c[s+'SignedAt'],'Firma de prueba registrada · '+label(s),'Documento versión '+c.revision,'contract')
  add(k+':both',both(c.clientSignedAt,c.providerSignedAt),'Contrato firmado por ambas partes','Firma de prueba · documento versión '+c.revision,'contract')
  add(k+':paid',c.notaryDemoPaidAt,'Pago notarial registrado',clp(c.notaryDemoFee)+' · '+p+' · simulado','notary')
  add(k+':authorized',c.notaryDemoAuthorizedAt,'Autorización notarial completada','Simulación sin validez legal','notary')
 }
 for(const s of stages){
  const k='s:'+s.agreementVersion+':'+s.contractRevision+':'+s.stageNo,detail='Etapa '+s.stageNo+' · '+clp(s.amount)+' · simulación'
  add(k+':funded',s.fundedAt,'Depósito de etapa '+s.stageNo+' registrado',detail,'stages')
  add(k+':delivered',s.deliveredAt,'Entrega de etapa '+s.stageNo+' notificada',detail,'stages')
  add(k+':released',s.releasedAt,'Etapa '+s.stageNo+' recibida conforme y pago liberado',detail,'stages')
 }
 events.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))
 const a=agreements.at(-1)||null,c=contracts.filter(x=>x.agreementVersion===a?.version).at(-1)||null
 const ready=stageReady(c)
 const current=ready?a.data.stages.findIndex((_,i)=>!stages.find(s=>s.agreementVersion===a.version&&s.contractRevision===c.revision&&s.stageNo===i+1)?.releasedAt)+1:null
 const s=current?stages.find(s=>s.agreementVersion===a.version&&s.contractRevision===c.revision&&s.stageNo===current):null
 let next
 const step=(target,title,waiting=false)=>({target,title,waiting})
 if(!a)next=step('agreement','Preparar acuerdo')
 else if(!a.clientConfirmedAt||!a.providerConfirmedAt)next=step('agreement',a[side+'ConfirmedAt']?'Esperando confirmación del acuerdo':'Confirmar acuerdo',!!a[side+'ConfirmedAt'])
 else if(!c)next=step('contract','Elegir modalidad contractual')
 else if(c.mode==='notary'&&!c.notaryAcceptedAt)next=step('contract',c.proposedBy===side?'Esperando aceptación del costo notarial':'Aceptar modalidad y costo notarial',c.proposedBy===side)
 else if(!c.clientSignedAt||!c.providerSignedAt)next=step('contract',c[side+'SignedAt']?'Esperando firma de la contraparte':'Leer y firmar contrato',!!c[side+'SignedAt'])
 else if(c.mode==='notary'&&!c.notaryDemoPaidAt)next=step('notary',c.payer===side?'Pagar trámite notarial':'Esperando pago notarial',c.payer!==side)
 else if(c.mode==='notary'&&!c.notaryDemoAuthorizedAt)next=step('notary','Simular autorización notarial')
 else if(ready&&current===0)next=step('stages','Proyecto recibido conforme')
 else if(ready&&current){if(!s?.fundedAt)next=step('stages',side==='client'?'Pagar etapa '+current:'Esperando depósito de etapa '+current,side!=='client');else if(!s.deliveredAt)next=step('stages',side==='provider'?'Notificar entrega de etapa '+current:'Esperando entrega de etapa '+current,side!=='provider');else next=step('stages',side==='client'?'Confirmar conformidad de etapa '+current:'Esperando conformidad de etapa '+current,side!=='client')}
 else next=step('contract','Revisar formalización contractual')
 return {demo:true,next,events,agreement:a?{version:a.version,data:a.data,confirmed:{client:stamp(a.clientConfirmedAt),provider:stamp(a.providerConfirmedAt)}}:null,contract:c?{revision:c.revision,agreementVersion:c.agreementVersion,digest:c.digest,mode:c.mode}:null,notaryAvailable:c?.mode==='notary',stagesAvailable:ready}
}
export async function readWorkflow(db,actor,id){
 const row=(await db.query(`SELECT r.sender_profile_id AS "senderId",r.recipient_profile_id AS "recipientId",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('version',a.version,'data',a.data,'proposedBy',CASE WHEN a.proposed_by=r.sender_profile_id THEN 'client' ELSE 'provider' END,'createdAt',a.created_at,'clientConfirmedAt',a.client_confirmed_at,'providerConfirmedAt',a.provider_confirmed_at) ORDER BY a.version) FROM matchter.project_agreement_versions a WHERE a.request_id=r.id),'[]'::jsonb) AS agreements,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('agreementVersion',c.agreement_version,'revision',c.revision,'mode',c.mode,'digest',c.digest,'payer',c.terms->'notaryArrangement'->>'payer','proposedBy',c.terms->'notaryArrangement'->>'proposedBy','createdAt',c.created_at,'clientSignedAt',c.client_signed_at,'providerSignedAt',c.provider_signed_at,'notaryAcceptedAt',c.notary_accepted_at,'notaryDemoPaidAt',c.notary_demo_paid_at,'notaryDemoFee',c.notary_demo_fee,'notaryDemoAuthorizedAt',c.notary_demo_authorized_at) ORDER BY c.agreement_version,c.revision) FROM matchter.project_contract_demos c WHERE c.request_id=r.id),'[]'::jsonb) AS contracts,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('agreementVersion',s.agreement_version,'contractRevision',s.contract_revision,'stageNo',s.stage_no,'amount',s.amount,'fundedAt',s.funded_at,'deliveredAt',s.delivered_at,'releasedAt',s.released_at) ORDER BY s.agreement_version,s.contract_revision,s.stage_no) FROM matchter.project_stage_demos s WHERE s.request_id=r.id),'[]'::jsonb) AS stages
 FROM matchter.swipe_requests r WHERE r.id=$1 AND r.status='accepted' AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)`,[id,actor.id])).rows[0]
 if(!row)throw new AuthError(404,'Conversación no disponible')
 const side=row.senderId===actor.id?'client':'provider'
 if((side==='client')!==(actor.role==='Cliente'))throw new AuthError(403,'Perfil no autorizado')
 return workflowSnapshot({...row,side})
}
