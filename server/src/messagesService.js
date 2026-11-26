import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function id(v){if(typeof v!=='string'||!uuid.test(v))throw new AuthError(400,'Identificador no válido');return v}
export function validateMessage(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['role','requestId','clientMessageId','body'].includes(k)))throw new AuthError(400,'Mensaje no válido')
 const message=typeof body.body==='string'?body.body.trim():''
 if(!message||message.length>3000)throw new AuthError(400,'Escribe entre 1 y 3000 caracteres')
 return {requestId:id(body.requestId),clientMessageId:id(body.clientMessageId),body:message}
}
const cols='m.id,m.body,m.created_at AS "createdAt",(m.sender_profile_id=$2) AS me'
export function createMessagesService({db,verifyIdentity}){
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
   return {threads:rows}
  },
  async history(header,query){const a=await actor(header,query.role),rid=await match(a,query.requestId)
   let before=null
   if(query.before!==undefined&&query.before!==''){before=id(query.before);const cursor=(await db.query('SELECT id FROM matchter.swipe_messages WHERE id=$1 AND request_id=$2',[before,rid])).rows[0];if(!cursor)throw new AuthError(404,'Mensaje no disponible')}
   const rows=(await db.query('SELECT '+cols+' FROM matchter.swipe_messages m WHERE m.request_id=$1 AND ($3::uuid IS NULL OR (m.created_at,m.id)<(SELECT created_at,id FROM matchter.swipe_messages WHERE request_id=$1 AND id=$3)) ORDER BY m.created_at DESC,m.id DESC LIMIT 101',[rid,a.id,before])).rows
   const more=rows.length>100,items=rows.slice(0,100).reverse()
   return {messages:items,hasMore:more}
  },
  async send(header,body){const a=await actor(header,body?.role),d=validateMessage(body),rid=await match(a,d.requestId)
   const row=(await db.query(`INSERT INTO matchter.swipe_messages(request_id,sender_profile_id,client_message_id,body)
    SELECT r.id,$2,$3,$4 FROM matchter.swipe_requests r WHERE r.id=$1 AND r.status='accepted' AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)
    ON CONFLICT(request_id,sender_profile_id,client_message_id) DO NOTHING RETURNING id,body,created_at AS "createdAt",true AS me`,[rid,a.id,d.clientMessageId,d.body])).rows[0]
   if(row)return {message:row}
   const saved=(await db.query('SELECT '+cols+' FROM matchter.swipe_messages m WHERE request_id=$1 AND sender_profile_id=$2 AND client_message_id=$3',[rid,a.id,d.clientMessageId])).rows[0]
   if(!saved)throw new AuthError(404,'Conversación no disponible')
   if(saved.body!==d.body)throw new AuthError(409,'El identificador corresponde a otro mensaje')
   return {message:saved}
  }
 })
}
