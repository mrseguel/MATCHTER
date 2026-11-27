import {verifyKhipuTestWebhook,verifyMercadoPagoTestWebhook} from './sandboxWebhookVerification.js'
import {sandboxProviders} from './sandboxProviderSelection.js'
const digits=/^[0-9]{1,20}$/
const MAX_TRIES=5
// Internal test worker only. No public ingress or automatic scheduling.
export function createSandboxNotificationInbox({mode,db,worker,transport,credentials,providers}={}){
 const selected=sandboxProviders(providers)
 if(mode!=='isolated_test'||!db||!worker||!transport||!selected.every(p=>typeof credentials?.[p]?.merchantId==='string'&&digits.test(credentials[p].merchantId)&&typeof credentials[p].webhookSecret==='string'&&credentials[p].webhookSecret.length>=8&&credentials[p].webhookSecret.length<=512))throw Error('Isolated notification service required')
 const cfg=Object.freeze(Object.fromEntries(selected.map(p=>[p,Object.freeze({merchantId:credentials[p].merchantId,secret:credentials[p].webhookSecret})])))
 async function accept(provider,input){
  const c=cfg[provider];if(!c)throw Error('Provider disabled')
  const verify=provider==='khipu'?verifyKhipuTestWebhook:verifyMercadoPagoTestWebhook
  // Explicit fields only; caller cannot supply the verification clock or credentials.
  const h=verify({rawBody:input?.rawBody,signature:input?.signature,requestId:input?.requestId,resourceId:input?.resourceId,...c})
  const r=await db.query('INSERT INTO matchter.sandbox_notification_inbox(event_key,provider,merchant_id,resource_id) VALUES($1,$2,$3,$4) ON CONFLICT(event_key) DO NOTHING RETURNING event_key',[h.eventKey,provider,c.merchantId,h.resourceId])
  return {accepted:true,duplicate:r.rowCount===0,eventKey:h.eventKey,environment:'sandbox',realPayment:false}
 }
 async function take(eventKey=null){
  // Recover abandoned final leases into review. No deletion or unbounded retry.
  await db.query("UPDATE matchter.sandbox_notification_inbox SET state='review',lease_id=NULL,lease_until=NULL WHERE state='processing' AND lease_until<=now() AND tries>=$1 AND provider=ANY($2::text[]) AND merchant_id=($3::jsonb->>provider) AND ($4::text IS NULL OR event_key=$4)",[MAX_TRIES,selected,JSON.stringify(Object.fromEntries(selected.map(p=>[p,cfg[p].merchantId]))),eventKey])
  return (await db.query("WITH candidate AS (SELECT event_key FROM matchter.sandbox_notification_inbox WHERE tries<$1 AND provider=ANY($2::text[]) AND merchant_id=($3::jsonb->>provider) AND ($4::text IS NULL OR event_key=$4) AND ((state='pending' AND next_attempt_at<=now()) OR (state='processing' AND lease_until<=now())) ORDER BY received_at,event_key LIMIT 1 FOR UPDATE SKIP LOCKED) UPDATE matchter.sandbox_notification_inbox i SET state='processing',tries=i.tries+1,lease_id=gen_random_uuid(),lease_until=now()+interval '90 seconds' FROM candidate WHERE i.event_key=candidate.event_key RETURNING i.event_key,i.provider,i.merchant_id,i.resource_id,i.tries,i.lease_id",[MAX_TRIES,selected,JSON.stringify(Object.fromEntries(selected.map(p=>[p,cfg[p].merchantId]))),eventKey])).rows[0]
 }
 async function resolve(row){
  const c=cfg[row.provider]
  if(!c||row.merchant_id!==c.merchantId)throw Error('Notification merchant mismatch')
  let reference=null
  if(row.provider==='mercadopago')reference=(await transport.locateMercadoPagoPayment(row.resource_id)).reference
  const a=(await db.query("SELECT a.id FROM matchter.sandbox_payment_attempts a JOIN matchter.sandbox_checkout_bindings b ON b.attempt_id=a.id AND b.provider=a.provider JOIN matchter.sandbox_payment_slots s ON s.attempt_id=a.id AND s.request_id=a.request_id AND s.owner_profile_id=a.owner_profile_id WHERE a.provider=$1 AND b.merchant_id=$2 AND (($1='khipu' AND b.checkout_id=$3) OR ($1='mercadopago' AND a.id::text=$4))",[row.provider,row.merchant_id,row.resource_id,reference])).rows[0]
  if(!a)throw Error('Checkout unavailable')
  return worker.reconcile(a.id,row.provider==='mercadopago'?row.resource_id:undefined)
 }
 async function finish(row,state){
  // Only the current lease can acknowledge the work; stale workers cannot overwrite it.
  const r=await db.query("UPDATE matchter.sandbox_notification_inbox SET state=$3,lease_id=NULL,lease_until=NULL,next_attempt_at=now()+make_interval(secs=>CASE WHEN $3='pending' THEN LEAST(900,15*(1<<tries)) ELSE 0 END) WHERE event_key=$1 AND lease_id=$2 AND state='processing' RETURNING event_key",[row.event_key,row.lease_id,state])
  return r.rowCount===1
 }
 return Object.freeze({
  acceptKhipu:input=>accept('khipu',input),
  acceptMercadoPago:input=>accept('mercadopago',input),
  async status(eventKey){
   if(typeof eventKey!=='string'||!/^[a-f0-9]{64}$/.test(eventKey))throw Error('Invalid event')
   return (await db.query("SELECT state FROM matchter.sandbox_notification_inbox WHERE event_key=$1 AND provider=ANY($2::text[]) AND merchant_id=($3::jsonb->>provider)",[eventKey,selected,JSON.stringify(Object.fromEntries(selected.map(p=>[p,cfg[p].merchantId])))] )).rows[0]?.state
  },
  async processOne({eventKey=null}={}){
   if(eventKey!==null&&(typeof eventKey!=='string'||!/^[a-f0-9]{64}$/.test(eventKey)))throw Error('Invalid event')
   const row=await take(eventKey)
   if(!row)return {processed:false,environment:'sandbox',realPayment:false}
   let state='processed'
   try{const r=await resolve(row);if(r.status==='review')state='review';else if(!['pending','declined','verified_test'].includes(r.status))throw Error('Unknown outcome')}
   catch{state=row.tries>=MAX_TRIES?'review':'pending'}
   const acknowledged=await finish(row,state)
   return {processed:acknowledged,state:acknowledged?state:'lease_lost',environment:'sandbox',realPayment:false}
  }
 })
}
