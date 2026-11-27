import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
import {contractContext} from './projectContractDemo.js'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const fail=(status,message)=>{throw new AuthError(status,message)}
const fields='a.id,a.request_id AS "requestId",a.agreement_version AS "agreementVersion",a.contract_revision AS "contractRevision",a.contract_digest AS digest,a.submission_id AS "submissionId",a.provider,a.amount_clp AS "amountCLP",a.currency,a.environment,a.created_at AS "createdAt"'
const select='SELECT '+fields+',e.state,e.sequence FROM matchter.sandbox_payment_attempts a JOIN LATERAL (SELECT state,sequence FROM matchter.sandbox_payment_attempt_events WHERE attempt_id=a.id ORDER BY sequence DESC LIMIT 1) e ON true '
const view=r=>({...r,demo:true,realPayment:false})
// Internal sandbox service only. No HTTP route or external provider credentials.
export function createSandboxPaymentAttempts({db,verifyIdentity,mode}){
 if(mode!=='isolated_test')throw Error('Sandbox payment reservations require isolated_test mode')
 async function actor(q,header,role){
  if(!PROFILE_ROLES.includes(role))fail(400,'Perfil inválido')
  const i=await verifyIdentity(header)
  const a=(await q.query('SELECT p.id,p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[i.issuer,i.subject])).rows[0]
  if(!a)fail(404,'Perfil no disponible')
  if(a.role!==role)fail(409,'El perfil activo cambió')
  return a
 }
 async function transaction(fn){
  const q=await db.connect()
  try{await q.query('BEGIN');const result=await fn(q);await q.query('COMMIT');return result}
  catch(e){try{await q.query('ROLLBACK')}catch{}throw e}finally{q.release()}
 }
 async function lock(q,requestId,ownerId){await q.query("SELECT pg_advisory_xact_lock(hashtextextended('sandbox-fee:'||$1::text||':'||$2::text,0))",[requestId,ownerId])}
 async function byId(q,id,ownerId){return (await q.query(select+'WHERE a.id=$1 AND a.owner_profile_id=$2',[id,ownerId])).rows[0]}
 async function slot(q,requestId,ownerId){return (await q.query(select+'JOIN matchter.sandbox_payment_slots s ON s.attempt_id=a.id WHERE s.request_id=$1 AND s.owner_profile_id=$2 AND a.owner_profile_id=$2 AND a.request_id=$1',[requestId,ownerId])).rows[0]}
 async function append(q,id,seq,state){await q.query('INSERT INTO matchter.sandbox_payment_attempt_events(attempt_id,sequence,state) VALUES($1,$2,$3)',[id,seq,state])}
 return Object.freeze({
  async reserve(header,b){
   if(!b||Object.keys(b).some(k=>!['role','requestId','agreementVersion','contractRevision','digest','provider','submissionId'].includes(k))||!uuid.test(b.requestId||'')||!uuid.test(b.submissionId||'')||!['khipu','mercadopago'].includes(b.provider)||!Number.isInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isInteger(b.contractRevision)||b.contractRevision<1||typeof b.digest!=='string'||!/^[a-f0-9]{64}$/.test(b.digest))fail(400,'Datos de intento inválidos')
   return transaction(async q=>{
    const a=await actor(q,header,b.role)
    // Lock the same request as contract mutation, then the provider-independent slot.
    const {side,agreement,current}=await contractContext(q,a,b.requestId,true)
    await lock(q,b.requestId,a.id)
    const prior=(await q.query(select+'WHERE a.owner_profile_id=$1 AND a.submission_id=$2',[a.id,b.submissionId])).rows[0]
    if(prior){if(prior.requestId!==b.requestId||prior.provider!==b.provider||prior.agreementVersion!==b.agreementVersion||prior.contractRevision!==b.contractRevision||prior.digest!==b.digest)fail(409,'Identificador de intento ya utilizado');return view(prior)}
    if(!current||!current.clientSignedAt||!current.providerSignedAt||current.terms?.paymentMode!=='direct'||current.terms?.serviceFee?.version!==2||agreement.version!==b.agreementVersion||current.revision!==b.contractRevision||current.digest!==b.digest)fail(409,'Contrato de prueba no elegible')
    if(side==='client'?current.serviceFeePaidAt:current.providerFeePaidAt||current.providerFeeMode)fail(409,'La tarifa ya tiene un registro de prueba')
    const amount=current.terms.serviceFee.amount
    if(!Number.isSafeInteger(amount)||amount<1||amount>2147483647)fail(409,'Importe contractual inválido')
    const existing=await slot(q,b.requestId,a.id)
    if(existing&&existing.state!=='cancelled_unsent')fail(409,'Ya existe un intento para esta tarifa. Consulta su estado antes de continuar.')
    const {id}=(await q.query('INSERT INTO matchter.sandbox_payment_attempts(request_id,agreement_version,contract_revision,contract_digest,owner_profile_id,submission_id,provider,amount_clp) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[b.requestId,b.agreementVersion,b.contractRevision,b.digest,a.id,b.submissionId,b.provider,amount])).rows[0]
    await append(q,id,1,'reserved')
    await q.query('INSERT INTO matchter.sandbox_payment_slots(request_id,owner_profile_id,attempt_id) VALUES($1,$2,$3) ON CONFLICT(request_id,owner_profile_id) DO UPDATE SET attempt_id=excluded.attempt_id',[b.requestId,a.id,id])
    return view(await byId(q,id,a.id))
   })
  },
  async read(header,b){
   if(!b||!uuid.test(b.attemptId||''))fail(400,'Intento inválido')
   const a=await actor(db,header,b.role),r=await byId(db,b.attemptId,a.id)
   if(!r)fail(404,'Intento no disponible');return view(r)
  },
  // Cancel only a reservation never dispatched. An unknown creation outcome stays blocked.
  async cancelUnsent(header,b){
   if(!b||!uuid.test(b.attemptId||''))fail(400,'Intento inválido')
   return transaction(async q=>{
    const a=await actor(q,header,b.role),initial=await byId(q,b.attemptId,a.id)
    if(!initial)fail(404,'Intento no disponible')
    await lock(q,initial.requestId,a.id)
    const r=await byId(q,b.attemptId,a.id)
    if(r.state==='cancelled_unsent')return view(r)
    if(r.state!=='reserved'||(await slot(q,r.requestId,a.id))?.id!==r.id)fail(409,'No se puede cancelar un intento enviado o de resultado incierto')
    await append(q,r.id,r.sequence+1,'cancelled_unsent');return view(await byId(q,r.id,a.id))
   })
  },
  // Internal worker only, not an endpoint. Persist ambiguity BEFORE any external call.
  async markDispatchUnknown(attemptId,ownerId){
   if(!uuid.test(attemptId||'')||!uuid.test(ownerId||''))fail(400,'Intento inválido')
   return transaction(async q=>{
    const initial=await byId(q,attemptId,ownerId)
    if(!initial)fail(404,'Intento no disponible')
    // Preserve lock order used by reserve: contract request first, then payment slot.
    const owner=(await q.query('SELECT id,role FROM matchter.account_profiles WHERE id=$1',[ownerId])).rows[0]
    if(!owner)fail(404,'Perfil no disponible')
    const {side,agreement,current}=await contractContext(q,owner,initial.requestId,true)
    await lock(q,initial.requestId,ownerId)
    const r=await byId(q,attemptId,ownerId)
    if(!current||!current.clientSignedAt||!current.providerSignedAt||current.terms?.paymentMode!=='direct'||current.terms?.serviceFee?.version!==2||agreement.version!==r.agreementVersion||current.revision!==r.contractRevision||current.digest!==r.digest||current.terms.serviceFee.amount!==r.amountCLP)fail(409,'El contrato cambió antes de iniciar el pago')
    if(side==='client'?current.serviceFeePaidAt:current.providerFeePaidAt||current.providerFeeMode)fail(409,'La tarifa ya tiene un registro de prueba')
    if(r.state!=='reserved'||(await slot(q,r.requestId,ownerId))?.id!==r.id)fail(409,'El intento ya fue iniciado o cancelado')
    await append(q,r.id,r.sequence+1,'creation_unknown');return view(await byId(q,r.id,ownerId))
   })
  }
 })
}
