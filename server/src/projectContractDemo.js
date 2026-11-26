import {createHash} from 'node:crypto'
import {AuthError} from './identityAccounts.js'
import {documentTerms} from '../../client/src/features/contracts/model.js'
const modes=['simple','notary','none']
const fields='revision,agreement_version AS "agreementVersion",mode,terms,digest,created_at AS "createdAt",client_signed_at AS "clientSignedAt",provider_signed_at AS "providerSignedAt"'
const view=r=>r?{revision:r.revision,agreementVersion:r.agreementVersion,mode:r.mode,terms:r.terms,digest:r.digest,createdAt:r.createdAt,confirmed:{client:r.clientSignedAt,provider:r.providerSignedAt}}:null
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k))
export function validateContractAction(b){
 if(!shape(b,['role','requestId','action','agreementVersion','expectedRevision','mode','digest','accepted','identityDemo'])||!Number.isInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isInteger(b.expectedRevision)||b.expectedRevision<0||b.expectedRevision>=2147483647)throw new AuthError(400,'Datos del contrato no válidos')
 if(b.action==='choose'&&modes.includes(b.mode)&&b.digest===undefined&&b.accepted===undefined&&b.identityDemo===undefined)return
 if(b.action==='confirm'&&b.expectedRevision>0&&b.mode===undefined&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest)&&b.accepted===true&&b.identityDemo===true)return
 throw new AuthError(400,'Acción de prueba no válida')
}
async function context(db,a,id,lock){
 const m=(await db.query("SELECT id,sender_profile_id AS \"senderId\",recipient_profile_id AS \"recipientId\" FROM matchter.swipe_requests WHERE id=$1 AND status='accepted' AND (sender_profile_id=$2 OR recipient_profile_id=$2)"+(lock?' FOR UPDATE':''),[id,a.id])).rows[0]
 if(!m)throw new AuthError(404,'Conversación no disponible')
 const side=m.senderId===a.id?'client':'provider'
 if((side==='client')!==(a.role==='Cliente'))throw new AuthError(403,'Perfil no autorizado')
 const agreement=(await db.query('SELECT version,data,client_confirmed_at AS "clientConfirmedAt",provider_confirmed_at AS "providerConfirmedAt" FROM matchter.project_agreement_versions WHERE request_id=$1 ORDER BY version DESC LIMIT 1',[id])).rows[0]
 if(!agreement?.clientConfirmedAt||!agreement?.providerConfirmedAt)throw new AuthError(409,'Ambas partes deben confirmar primero el acuerdo')
 const current=(await db.query('SELECT '+fields+' FROM matchter.project_contract_demos WHERE request_id=$1 AND agreement_version=$2 ORDER BY revision DESC LIMIT 1',[id,agreement.version])).rows[0]
 return {side,agreement,current}
}
export function contractSnapshot(id,agreement,mode,revision){
 const d=agreement.data
 const terms=documentTerms({project:d.title,scope:d.scope,startDate:d.start,endDate:d.end},{name:'Cliente de prueba'},{name:'Prestador de prueba'},d.stages)
 const digest=createHash('sha256').update(JSON.stringify({id,agreementVersion:agreement.version,revision,mode,terms})).digest('hex')
 return {terms,digest}
}
export async function readContractDemo(db,a,id){
 const {agreement,current}=await context(db,a,id,false)
 return {agreementVersion:agreement.version,contract:view(current)}
}
export async function changeContractDemo(db,a,id,b){
 validateContractAction(b)
 const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const {side,agreement,current}=await context(tx,a,id,true)
  const revision=current?.revision||0
  if(b.agreementVersion!==agreement.version||b.expectedRevision!==revision)throw new AuthError(409,'El documento cambió. Actualiza antes de continuar.')
  let saved=current
  if(b.action==='choose'){
   if(current?.mode!==b.mode){
    if(current?.clientSignedAt||current?.providerSignedAt)throw new AuthError(409,'La modalidad ya tiene una confirmación y no se puede cambiar')
    const {terms,digest}=contractSnapshot(id,agreement,b.mode,revision+1)
    saved=(await tx.query('INSERT INTO matchter.project_contract_demos(request_id,agreement_version,revision,mode,terms,digest) VALUES($1,$2,$3,$4,$5,$6) RETURNING '+fields,[id,agreement.version,revision+1,b.mode,JSON.stringify(terms),digest])).rows[0]
   }
  }else{
   if(!current||b.digest!==current.digest)throw new AuthError(409,'La versión del documento no coincide')
   if(!(side==='client'?current.clientSignedAt:current.providerSignedAt)){
    const col=side==='client'?'client_signed_at':'provider_signed_at'
    saved=(await tx.query('UPDATE matchter.project_contract_demos SET '+col+'=now() WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND '+col+' IS NULL RETURNING '+fields,[id,agreement.version,revision])).rows[0]
   }
  }
  if(!saved)throw new AuthError(409,'No se pudo registrar la acción')
  await tx.query('COMMIT')
  return {agreementVersion:agreement.version,contract:view(saved)}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
