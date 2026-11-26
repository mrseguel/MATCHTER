import {AuthError} from './identityAccounts.js'
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k))
const str=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max
const bad=(m='Datos del acuerdo no válidos')=>{throw new AuthError(400,m)}
export function validateAgreementAction(body){
 if(!shape(body,['role','requestId','action','expectedVersion','data'])||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0||body.expectedVersion>=2147483647)bad()
 if(body.action==='confirm'){if(body.expectedVersion<1||body.data!==undefined)bad();return {action:'confirm',expectedVersion:body.expectedVersion}}
 if(body.action!=='propose'||!shape(body.data,['title','scope','start','end','totalAmount','stages']))bad()
 const {title,scope,start,end,totalAmount,stages}=body.data
 if(!str(title,3,150)||!str(scope,20,1800)||!dateOK(start)||!dateOK(end)||start>end)bad('Completa el alcance y las fechas del acuerdo')
 if(!Array.isArray(stages)||stages.length<1||stages.length>50||stages.some((s,i)=>!Array.isArray(s)||s.length!==4||!str(s[0],1,200)||!dateOK(s[1])||s[1]<start||s[1]>end||i>0&&s[1]<stages[i-1][1]||typeof s[2]!=='number'||!Number.isSafeInteger(s[2])||s[2]<=0||s[2]>100000000000))bad('Completa entre 1 y 50 etapas, montos positivos y fechas ordenadas dentro del plazo')
 const basis=p=>Math.round(p*100)
 if(stages.some(s=>typeof s[3]!=='number'||!Number.isFinite(s[3])||s[3]<=0||s[3]>100||Math.abs(s[3]*100-basis(s[3]))>1e-7)||stages.reduce((n,s)=>n+basis(s[3]),0)!==10000)bad('Los porcentajes de avance físico deben sumar exactamente 100 %, con hasta dos decimales')
 if(!Number.isSafeInteger(totalAmount)||totalAmount<=0||totalAmount!==stages.reduce((n,s)=>n+s[2],0))bad('Los pagos de las etapas deben sumar el valor total acordado')
 return {action:'propose',expectedVersion:body.expectedVersion,data:{title:title.trim(),scope:scope.trim(),start,end,totalAmount,stages:stages.map(s=>[s[0].trim(),s[1],s[2],basis(s[3])/100])}}
}
const columns='version,data,proposed_by AS "proposedBy",created_at AS "createdAt",client_confirmed_at AS "clientConfirmedAt",provider_confirmed_at AS "providerConfirmedAt"'
const view=(row,match)=>row?{version:row.version,data:row.data,proposedBy:row.proposedBy===match.senderId?'client':'provider',at:row.createdAt,confirmed:{client:row.clientConfirmedAt,provider:row.providerConfirmedAt}}:null
async function matchFor(db,a,id,lock=false){
 const row=(await db.query("SELECT id,sender_profile_id AS \"senderId\",recipient_profile_id AS \"recipientId\" FROM matchter.swipe_requests WHERE id=$1 AND status='accepted' AND (sender_profile_id=$2 OR recipient_profile_id=$2)"+(lock?' FOR UPDATE':''),[id,a.id])).rows[0]
 if(!row)throw new AuthError(404,'Conversación no disponible')
 if((row.senderId===a.id)!==(a.role==='Cliente'))throw new AuthError(403,'Perfil no autorizado para este proyecto')
 return row
}
async function latest(db,id){return (await db.query('SELECT '+columns+' FROM matchter.project_agreement_versions WHERE request_id=$1 ORDER BY version DESC LIMIT 1',[id])).rows[0]}
export async function readProjectAgreement(db,a,id){
 const match=await matchFor(db,a,id)
 return {agreement:view(await latest(db,id),match)}
}
export async function changeProjectAgreement(db,a,id,body){
 const action=validateAgreementAction(body)
 const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const match=await matchFor(tx,a,id,true),side=match.senderId===a.id?'client':'provider'
  const row=await latest(tx,id),version=row?.version||0
  if(version!==action.expectedVersion)throw new AuthError(409,'El acuerdo cambió. Actualiza y revisa la última propuesta.')
  let saved
  if(action.action==='confirm'){
   if(!row)throw new AuthError(409,'No existe una propuesta para confirmar')
   const col=side==='client'?'client_confirmed_at':'provider_confirmed_at'
   if(side==='client'?row.clientConfirmedAt:row.providerConfirmedAt)saved=row
   else saved=(await tx.query('UPDATE matchter.project_agreement_versions SET '+col+'=now() WHERE request_id=$1 AND version=$2 AND '+col+' IS NULL RETURNING '+columns,[id,version])).rows[0]
  }else{
   if(row?.clientConfirmedAt&&row?.providerConfirmedAt)throw new AuthError(409,'El acuerdo ya tiene confirmación de ambas partes')
   saved=(await tx.query("INSERT INTO matchter.project_agreement_versions(request_id,version,proposed_by,data,client_confirmed_at,provider_confirmed_at) VALUES($1,$2,$3,$4,CASE WHEN $5='client' THEN now() END,CASE WHEN $5='provider' THEN now() END) RETURNING "+columns,[id,version+1,a.id,JSON.stringify(action.data),side])).rows[0]
  }
  if(!saved)throw new AuthError(409,'No se pudo actualizar el acuerdo')
  await tx.query('COMMIT')
  return {agreement:view(saved,match)}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
