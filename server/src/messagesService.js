import {readWalletReceipt} from './walletReceipt.js'
import {readWalletHistory} from './walletHistory.js'
import {readCoordination,changeCoordination,coordinationContext,coordinationView,chileTime} from './projectCoordination.js'
import {readReviewDemo,changeReviewDemo} from './projectReviewDemo.js'
import {readWorkflow} from './projectWorkflow.js'
import {listStageClaims,submitStageClaim} from './stageClaimsService.js'
import {readStageDemo,changeStageDemo} from './projectStageDemo.js'
import {readContractDemo,changeContractDemo} from './projectContractDemo.js'
import {readProjectAgreement,changeProjectAgreement} from './projectAgreement.js'
import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function id(v){if(typeof v!=='string'||!uuid.test(v))throw new AuthError(400,'Identificador no válido');return v}
const requestPrefix='MATCHTER_REQUEST_V1:'
const requestTitles={quote:'Solicitud de cotización',visit:'Solicitud de visita técnica'}
function structuredRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['kind','note','date','time'].includes(k))||!Object.hasOwn(requestTitles,value.kind))throw new AuthError(400,'Solicitud no válida')
 const note=value.note??'',date=value.date??'',time=value.time??''
 if(typeof note!=='string'||note.length>800||typeof date!=='string'||typeof time!=='string')throw new AuthError(400,'Datos de solicitud no válidos')
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))throw new AuthError(400,'Fecha no válida')
 if(time&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!date))throw new AuthError(400,'Hora no válida o sin fecha')
 if(value.kind==='quote'&&(date||time))throw new AuthError(400,'La cotización no admite fecha de visita')
 return {kind:value.kind,note:note.trim(),date,time}
}
function readMessage(row){
 if(typeof row.body==='string'&&row.body.startsWith(requestPrefix)){
  try{const request=structuredRequest(JSON.parse(row.body.slice(requestPrefix.length)));return {...row,body:requestTitles[request.kind],kind:request.kind,request}}catch{}
 }
 return {...row,kind:'text'}
}
export function validateMessage(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['role','requestId','clientMessageId','body','request'].includes(k)))throw new AuthError(400,'Mensaje no válido')
 const ids={requestId:id(body.requestId),clientMessageId:id(body.clientMessageId)}
 if(body.request!==undefined){
  if(body.body!==undefined)throw new AuthError(400,'Envía un mensaje o una solicitud, no ambos')
  const request=structuredRequest(body.request)
  const encoded=requestPrefix+JSON.stringify(request)
  if(encoded.length>3000)throw new AuthError(400,'Solicitud demasiado extensa')
  return {...ids,body:encoded,request}
 }
 const message=typeof body.body==='string'?body.body.trim():''
 if(!message||message.length>3000||message.startsWith(requestPrefix))throw new AuthError(400,'Escribe un mensaje válido de 1 a 3000 caracteres')
 return {...ids,body:message}
}
const cols='m.id,m.body,m.created_at AS "createdAt",(m.sender_profile_id=$2) AS me'
export function createMessagesService({db,verifyIdentity,paymentModeForNewContract,claimsEnabled=false,walletEnabled=false,sandboxFeeProjection}){
 async function actor(header,expected){
  const identity=await verifyIdentity(header)
  if(!PROFILE_ROLES.includes(expected))throw new AuthError(400,'Perfil no válido')
  const a=(await db.query('SELECT p.id,p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
  if(!a)throw new AuthError(404,'Completa tu perfil')
  if(a.role!==expected)throw new AuthError(409,'El perfil activo cambió. Actualiza la página.')
  return a
 }
 async function match(a,requestId){
  const rid=id(requestId)
  const r=(await db.query("SELECT id FROM matchter.swipe_requests WHERE id=$1 AND status='accepted' AND (sender_profile_id=$2 OR recipient_profile_id=$2)",[rid,a.id])).rows[0]
  if(!r)throw new AuthError(404,'Conversación no disponible')
  return rid
 }
 return Object.freeze({
  async walletReceipt(header,query){if(!walletEnabled)throw new AuthError(404,'Wallet aún no disponible');return readWalletReceipt(db,await actor(header,query.role),query.movementId)},
  async wallet(header,query){if(!walletEnabled)throw new AuthError(404,'Wallet aún no disponible');return readWalletHistory(db,await actor(header,query.role))},
  async coordination(header,query){const a=await actor(header,query.role);return readCoordination(db,a,id(query.requestId))},
  async changeCoordination(header,body){const a=await actor(header,body?.role);id(body.messageId);return changeCoordination(db,a,id(body.requestId),body)},
  async review(header,query){const a=await actor(header,query.role);return readReviewDemo(db,a,id(query.requestId),{sandboxFeeProjection})},
  async changeReview(header,body){const a=await actor(header,body?.role);return changeReviewDemo(db,a,id(body.requestId),body,{sandboxFeeProjection})},
  async workflow(header,query){const a=await actor(header,query.role);const result=await readWorkflow(db,a,id(query.requestId),{sandboxFeeProjection});return claimsEnabled?{...result,claimsAvailable:true}:result},
  async claims(header,query){if(!claimsEnabled)throw new AuthError(404,'Reclamos aún no disponibles');const a=await actor(header,query.role);return listStageClaims(db,a,id(query.requestId))},
  async submitClaim(header,body){if(!claimsEnabled)throw new AuthError(404,'Reclamos aún no disponibles');const a=await actor(header,body?.role);return submitStageClaim(db,a,id(body.requestId),body)},
  async stages(header,query){const a=await actor(header,query.role);return readStageDemo(db,a,id(query.requestId),{sandboxFeeProjection})},
  async changeStage(header,body){const a=await actor(header,body?.role);return changeStageDemo(db,a,id(body.requestId),body,{sandboxFeeProjection})},
  async contract(header,query){const a=await actor(header,query.role);return readContractDemo(db,a,id(query.requestId),{paymentModeForNewContract,sandboxFeeProjection})},
  async changeContract(header,body){const a=await actor(header,body?.role);if(sandboxFeeProjection)throw new AuthError(409,'El contrato QA está fijado. Las tarifas se confirman exclusivamente por Khipu.');return changeContractDemo(db,a,id(body.requestId),body,{paymentModeForNewContract})},
  async agreement(header,query){const a=await actor(header,query.role);return readProjectAgreement(db,a,id(query.requestId))},
  async changeAgreement(header,body){const a=await actor(header,body?.role);return changeProjectAgreement(db,a,id(body.requestId),body)},
  async list(header,role){const a=await actor(header,role)
   const rows=(await db.query(`SELECT r.id,r.details->>'projectTitle' AS project,
     CASE WHEN r.sender_profile_id=$1 THEN COALESCE(c.display_name,'Proveedor') ELSE 'Cliente' END AS "peerName",
     CASE WHEN r.sender_profile_id=$1 THEN p.role ELSE 'Cliente' END AS "peerRole",
     lm.body AS "lastMessage",lm.created_at AS "lastAt"
    FROM matchter.swipe_requests r JOIN matchter.account_profiles p ON p.id=r.recipient_profile_id
    LEFT JOIN matchter.swipe_cards c ON c.profile_id=r.recipient_profile_id
    LEFT JOIN LATERAL (SELECT body,created_at FROM matchter.swipe_messages WHERE request_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1) lm ON true
    WHERE r.status='accepted' AND (r.sender_profile_id=$1 OR r.recipient_profile_id=$1)
    ORDER BY COALESCE(lm.created_at,r.responded_at) DESC,r.id LIMIT 100`,[a.id])).rows
   return {threads:rows.map(row=>({...row,lastMessage:row.lastMessage==null?row.lastMessage:readMessage({body:row.lastMessage}).body}))}
  },
  async history(header,query){const a=await actor(header,query.role),rid=await match(a,query.requestId)
   let before=null
   if(query.before!==undefined&&query.before!==''){before=id(query.before);const cursor=(await db.query('SELECT id FROM matchter.swipe_messages WHERE id=$1 AND request_id=$2',[before,rid])).rows[0];if(!cursor)throw new AuthError(404,'Mensaje no disponible')}
   const rows=(await db.query('SELECT '+cols+' FROM matchter.swipe_messages m WHERE m.request_id=$1 AND ($3::uuid IS NULL OR (m.created_at,m.id)<(SELECT created_at,id FROM matchter.swipe_messages WHERE request_id=$1 AND id=$3)) ORDER BY m.created_at DESC,m.id DESC LIMIT 101',[rid,a.id,before])).rows
   const more=rows.length>100,items=rows.slice(0,100).reverse()
   return {messages:items.map(readMessage),hasMore:more}
  },
  async send(header,body){const a=await actor(header,body?.role),d=validateMessage(body),rid=await match(a,d.requestId)
   if(d.request?.kind==='quote'&&a.role!=='Cliente')throw new AuthError(403,'Solo el cliente puede solicitar una cotización')
   const write=async(q)=>{
   const row=(await q.query(`INSERT INTO matchter.swipe_messages(request_id,sender_profile_id,client_message_id,body)
    SELECT r.id,$2,$3,$4 FROM matchter.swipe_requests r WHERE r.id=$1 AND r.status='accepted' AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)
    ON CONFLICT(request_id,sender_profile_id,client_message_id) DO NOTHING RETURNING id,body,created_at AS "createdAt",true AS me`,[rid,a.id,d.clientMessageId,d.body])).rows[0]
   if(row)return {message:readMessage(row)}
   const saved=(await q.query('SELECT '+cols+' FROM matchter.swipe_messages m WHERE request_id=$1 AND sender_profile_id=$2 AND client_message_id=$3',[rid,a.id,d.clientMessageId])).rows[0]
   if(!saved)throw new AuthError(404,'Conversación no disponible')
   if(saved.body!==d.body)throw new AuthError(409,'El identificador corresponde a otro mensaje')
   return {message:readMessage(saved)}
   }
   if(!d.request)return write(db)
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const ctx=await coordinationContext(tx,a,rid,true)
    const saved=(await tx.query('SELECT '+cols+' FROM matchter.swipe_messages m WHERE request_id=$1 AND sender_profile_id=$2 AND client_message_id=$3',[rid,a.id,d.clientMessageId])).rows[0]
    if(saved){if(saved.body!==d.body)throw new AuthError(409,'El identificador corresponde a otro mensaje');await tx.query('COMMIT');return {message:readMessage(saved)}}
    const flags=coordinationView(ctx)
    if(d.request.kind==='quote'?!flags.canQuote:!flags.canVisit)throw new AuthError(409,'Esta solicitud ya existe o la coordinación inicial está cerrada')
    if(d.request.kind==='visit'&&d.request.date&&d.request.time&&Date.parse(chileTime(d.request.date,d.request.time))<=Date.now())throw new AuthError(400,'Selecciona una fecha de visita futura')
    const result=await write(tx);await tx.query('COMMIT');return result
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 })
}
