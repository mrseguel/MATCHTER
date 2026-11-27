import {createHash} from 'node:crypto'
import {validateInspectionAttachment,MAX_INSPECTION_ATTACHMENT_BYTES} from './inspectionAttachment.js'
import {AuthError} from './identityAccounts.js'
const fields='id,filename,media_type AS "mediaType",octet_length(bytes) AS size,sha256,created_at AS "createdAt"'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const id=x=>{if(typeof x!=='string'||!uuid.test(x))throw new AuthError(400,'Identificador inválido');return x}
const bad=m=>{throw new AuthError(400,m)}
export function validateClaimEvidence(input){
 if(input.mediaType!=='video/mp4'){try{return validateInspectionAttachment(input)}catch(e){if(e.status===400)bad(e.message);throw e}}
 const {filename,base64}=input
 if(typeof filename!=='string'||filename.trim().length<1||filename.length>180||/[\\/\x00-\x1f\x7f]/.test(filename)||!filename.toLowerCase().endsWith('.mp4'))bad('Nombre de archivo inválido')
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_INSPECTION_ATTACHMENT_BYTES/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))bad('Archivo demasiado grande o inválido')
 const bytes=Buffer.from(base64,'base64')
 if(bytes.length<16||bytes.length>MAX_INSPECTION_ATTACHMENT_BYTES||bytes.toString('base64')!==base64||bytes.subarray(4,8).toString()!=='ftyp'||bytes.readUInt32BE(0)<16||bytes.readUInt32BE(0)>bytes.length)bad('MP4 no compatible')
 return {filename:filename.trim(),mediaType:'video/mp4',bytes,sha256:createHash('sha256').update(bytes).digest('hex')}
}
export async function listClaimEvidence(q,claimId){return (await q.query('SELECT '+fields+' FROM matchter.claim_attachments WHERE claim_id=$1 ORDER BY created_at,id',[id(claimId)])).rows}
export async function readClaimEvidence(q,claimId,fileId){
 const f=(await q.query('SELECT '+fields+',bytes FROM matchter.claim_attachments WHERE claim_id=$1 AND id=$2',[id(claimId),id(fileId)])).rows[0]
 if(!f)throw new AuthError(404,'Archivo no disponible')
 const {bytes,...meta}=f;return {...meta,base64:bytes.toString('base64')}
}
// Caller has authenticated the claim participant inside this transaction.
export async function appendClaimEvidence(q,claimId,profileId,body){
 if(!body||Object.keys(body).some(k=>!['role','claimId','submissionId','filename','mediaType','base64'].includes(k)))bad('Datos inválidos')
 id(body.submissionId);const f=validateClaimEvidence(body)
 await q.query("SELECT pg_advisory_xact_lock(hashtextextended('claim-evidence:'||$1::text,0))",[id(claimId)])
 const prior=(await q.query('SELECT '+fields+' FROM matchter.claim_attachments WHERE claim_id=$1 AND uploader_profile_id=$2 AND submission_id=$3',[claimId,profileId,body.submissionId])).rows[0]
 if(prior){if(prior.sha256!==f.sha256||prior.filename!==f.filename||prior.mediaType!==f.mediaType)throw new AuthError(409,'Identificador ya utilizado')}
 else{
  if((await q.query('SELECT count(*)::int AS n FROM matchter.claim_attachments WHERE claim_id=$1',[claimId])).rows[0].n>=20)throw new AuthError(409,'Límite de 20 archivos de prueba por expediente')
  await q.query('INSERT INTO matchter.claim_attachments(claim_id,uploader_profile_id,submission_id,filename,media_type,bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',[claimId,profileId,body.submissionId,f.filename,f.mediaType,f.bytes,f.sha256])
 }
 return {files:await listClaimEvidence(q,claimId)}
}
