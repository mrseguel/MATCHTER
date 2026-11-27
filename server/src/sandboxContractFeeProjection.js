// Read-only projection from the authoritative sandbox ledger. Never mark demo fee
// columns or real contracts as paid. Only the explicitly isolated Khipu QA runtime may opt in.
const issuer='https://payment-qa.invalid',merchant='533557'
export function projectSandboxFees(current,rows){
 if(!current||current.terms?.paymentMode!=='direct'||current.terms?.serviceFee?.version!==2)return current
 const amount=current.terms.serviceFee.amount
 const side=s=>{
  const r=rows.filter(x=>x.side===s)
  if(r.length!==1)return {status:r.length?'review':'pending',paidAt:null}
  const x=r[0]
  if(x.status==='review')return {status:'review',paidAt:null}
  if(x.status!=='verified_test'||x.amount!==amount||!x.bound||!x.notified||!x.observedAt)return {status:'pending',paidAt:null}
  return {status:'verified_test',paidAt:x.observedAt}
 }
 const client=side('client'),provider=side('provider')
 return {...current,serviceFeePaidAt:client.paidAt,providerFeePaidAt:provider.paidAt,providerFeeMode:provider.paidAt?'upfront':null,providerFeeStageNo:null,sandboxFeeVerification:{client:client.status,provider:provider.status,realPayment:false}}
}
export function createSandboxContractFeeProjection({db,mode}={}){
 if(mode!=='isolated_test'||typeof db?.query!=='function')throw Error('Isolated QA projection required')
 return async function project(actor,id,current,{query=db,lock=false}={}){
  if(!current)return current
  const scope=(await query.query("SELECT current_database() AS database,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname=current_user")).rows[0]
  if(scope?.database!=='matchter_payment_qa'||scope.role!=='matchter_payment_qa_app'||scope.branch!=='br-royal-mud-b648tp0j'||scope.elevated!==false)throw Error('QA isolation failed')
  const fixture=(await query.query(`SELECT r.sender_profile_id AS client,r.recipient_profile_id AS provider
   FROM matchter.swipe_requests r JOIN matchter.account_profiles cp ON cp.id=r.sender_profile_id JOIN matchter.accounts ca ON ca.id=cp.account_id
   JOIN matchter.account_profiles pp ON pp.id=r.recipient_profile_id JOIN matchter.accounts pa ON pa.id=pp.account_id
   WHERE r.id=$1 AND r.status='accepted' AND ($2=cp.id OR $2=pp.id)
   AND cp.role='Cliente' AND pp.role='Maestro o contratista' AND ca.auth_issuer=$3 AND pa.auth_issuer=$3
   AND ca.auth_subject='khipu-qa-v1-client' AND pa.auth_subject='khipu-qa-v1-provider'
   AND r.details->>'projectTitle' LIKE 'MATCHTER Khipu external QA webhook %'`,[id,actor.id,issuer])).rows[0]
  if(!fixture)throw Error('QA fixture required')
  if(lock){for(const owner of [fixture.client,fixture.provider].sort())await query.query("SELECT pg_advisory_xact_lock(hashtextextended('sandbox-fee:'||$1::text||':'||$2::text,0))",[id,owner])}
  const rows=(await query.query(`SELECT CASE WHEN a.owner_profile_id=$2 THEN 'client' ELSE 'provider' END AS side,
   a.id AS "attemptId",c.checkout_id AS "checkoutId",a.owner_profile_id AS "ownerId",a.amount_clp AS amount,o.status,o.observed_at AS "observedAt", (p.payment_id=c.checkout_id AND p.provider=c.provider AND p.merchant_id=c.merchant_id) AS bound,
   EXISTS(SELECT 1 FROM matchter.sandbox_notification_inbox i WHERE i.provider=c.provider AND i.merchant_id=c.merchant_id AND i.resource_id=c.checkout_id AND i.state='processed') AS notified
   FROM matchter.sandbox_payment_attempts a JOIN matchter.sandbox_payment_slots s ON s.attempt_id=a.id AND s.request_id=a.request_id AND s.owner_profile_id=a.owner_profile_id
   JOIN matchter.sandbox_checkout_bindings c ON c.attempt_id=a.id AND c.provider='khipu' AND c.merchant_id=$7
   JOIN matchter.sandbox_payment_bindings p ON p.attempt_id=a.id
   JOIN LATERAL (SELECT status,observed_at FROM matchter.sandbox_payment_observations WHERE attempt_id=a.id ORDER BY sequence DESC LIMIT 1)o ON true
   WHERE a.request_id=$1 AND a.owner_profile_id IN ($2,$3) AND a.agreement_version=$4 AND a.contract_revision=$5 AND a.contract_digest=$6
   AND a.provider='khipu' AND a.environment='sandbox' AND a.currency='CLP'`,[id,fixture.client,fixture.provider,current.agreementVersion,current.revision,current.digest,merchant])).rows
  const projected=projectSandboxFees(current,rows)
  // This preview resumes only the existing, verified pending QA checkout for its owner.
  const own=rows.find(x=>x.ownerId===actor.id&&x.status==='pending'&&x.bound&&x.amount===current.terms?.serviceFee?.amount)
  const checkout=own?.attemptId==='ec445481-b1e5-4dee-9c49-681a937de52c'&&own.checkoutId==='npugxixinbuh'?'https://khipu.com/payment/info/npugxixinbuh':null
  return {...projected,sandboxFeeCheckout:checkout}
 }
}
