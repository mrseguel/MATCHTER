import {AuthError} from './identityAccounts.js'
import {stageReady} from './projectStageDemo.js'
const stamp=v=>v?new Date(v).toISOString():null
const label=s=>s==='client'?'Cliente':'Prestador'
const both=(a,b)=>a&&b?(new Date(a)>=new Date(b)?a:b):null
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
export function workflowSnapshot({agreements=[],contracts=[],stages=[],side}){
 const events=[]
 const add=(key,at,title,detail,target)=>{if(at)events.push({id:'workflow:'+key,createdAt:stamp(at),kind:'workflow',body:title,event:{title,detail,target,demo:true}})}
 const agreed=agreements.filter(a=>a.clientConfirmedAt&&a.providerConfirmedAt).at(-1)
 const formal=agreed?contracts.filter(c=>c.agreementVersion===agreed.version).at(-1):null
 if(agreed){
  const total=agreed.data.stages.reduce((sum,s)=>sum+Number(s[2]),0)
  add('a:'+agreed.version+':both',both(agreed.clientConfirmedAt,agreed.providerConfirmedAt),'Acuerdo final confirmado',agreed.data.title+' · '+clp(total)+' · '+agreed.data.stages.length+' etapas','agreement')
 }
 if(formal){
  const c=formal,k='c:'+c.agreementVersion+':'+c.revision,p=label(c.payer)
  if(c.mode==='notary'&&['client','provider'].includes(c.payer))add(k+':accepted',c.notaryAcceptedAt,'Acuerdo notarial confirmado','Modalidad notarial · Responsable del pago: '+p,'notary')
  add(k+':both',both(c.clientSignedAt,c.providerSignedAt),'Contrato firmado por ambas partes','Ambas firmas de prueba confirmadas','contract')
  if(c.mode==='notary'&&stageReady(c))add(k+':authorized',both(c.notaryDemoPaidAt,c.notaryDemoAuthorizedAt),'Trámite notarial completado','Pago registrado: '+clp(c.notaryDemoFee)+' · Autorización simulada completada · Sin validez legal','notary')
 }
 for(const s of stages.filter(s=>formal&&s.agreementVersion===formal.agreementVersion&&s.contractRevision===formal.revision)){
  const k='s:'+s.agreementVersion+':'+s.contractRevision+':'+s.stageNo,detail='Etapa '+s.stageNo+' · '+clp(s.amount)+' · simulación'
  add(k+':funded',s.fundedAt,'Depósito de etapa '+s.stageNo+' registrado',detail,'stages')
  add(k+':released',both(both(s.fundedAt,s.deliveredAt),s.releasedAt),'Etapa '+s.stageNo+' recibida conforme y pago liberado',detail,'stages')
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
