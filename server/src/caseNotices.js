import {AuthError} from './identityAccounts.js'
// Derived notices; no private fee, message content, evidence contents or bank details are returned.
const sql=`WITH cases AS (
 SELECT c.id,c.created_at,c.reporter_profile_id,c.data->>'projectTitle' AS title
 FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id WHERE $1 IN (r.sender_profile_id,r.recipient_profile_id)
), notices AS (
 SELECT 'claim:'||id::text AS id,id AS "claimId",NULL::uuid AS "orderId",'claim' AS kind,created_at AS at,title FROM cases WHERE reporter_profile_id<>$1
 UNION ALL SELECT 'event:'||e.id::text,c.id,NULL::uuid,e.data->>'action',e.recorded_at,c.title FROM cases c JOIN matchter.stage_claim_events e ON e.claim_id=c.id WHERE e.actor_account_id<>$2 AND e.data->>'action' IN ('invite','propose','accept','decision_decline','close','inspection_propose','inspection_accept','inspection_decline','inspection_close','inspection_observation')
 UNION ALL SELECT 'order:'||o.id::text,o.claim_id,o.id,'inspection_request',o.created_at,'Inspección técnica' FROM matchter.inspection_orders o WHERE o.inspector_profile_id=$1
 UNION ALL SELECT 'inspection:'||e.id::text,o.claim_id,o.id,e.data->>'action',e.created_at,'Inspección técnica' FROM matchter.inspection_orders o JOIN matchter.inspection_order_events e ON e.order_id=o.id WHERE $1 IN (o.requester_profile_id,o.inspector_profile_id) AND e.actor_profile_id<>$1 AND e.data->>'action' IN ('message','quote','accept','report','cancel')
 UNION ALL SELECT 'shared:'||e.id::text,c.id,NULL::uuid,e.data->>'action',e.created_at,c.title FROM cases c JOIN matchter.inspection_awards a ON a.claim_id=c.id JOIN matchter.inspection_orders o ON o.id=a.order_id JOIN matchter.inspection_order_events e ON e.order_id=o.id WHERE $1<>o.requester_profile_id AND e.data->>'action' IN ('accept','report','cancel')
)
SELECT n.*, (r.notice_id IS NOT NULL) AS read FROM notices n LEFT JOIN matchter.case_notice_reads r ON r.profile_id=$1 AND r.notice_id=n.id ORDER BY n.at DESC,n.id DESC LIMIT 100`
export function createCaseNotices({db,verifyIdentity}){
 async function actor(header,role){
  const i=await verifyIdentity(header),a=(await db.query('SELECT p.id,a.id AS "accountId",p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[i.issuer,i.subject])).rows[0]
  if(!a||a.role!==role)throw new AuthError(403,'Perfil no autorizado')
  return a
 }
 const list=async a=>(await db.query(sql,[a.id,a.accountId])).rows
 return {
  async get(header,query){return {notices:await list(await actor(header,query.role))}},
  async read(header,body){
   const a=await actor(header,body?.role)
   if(!Array.isArray(body?.ids)||body.ids.length>100||body.ids.some(x=>typeof x!=='string'||x.length>100))throw new AuthError(400,'Avisos inválidos')
   const visible=new Set((await list(a)).map(n=>n.id))
   if(body.ids.some(x=>!visible.has(x)))throw new AuthError(404,'Aviso no disponible')
   if(body.ids.length)await db.query('INSERT INTO matchter.case_notice_reads(profile_id,notice_id) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING',[a.id,body.ids])
   return {notices:await list(a)}
  }
 }
}
