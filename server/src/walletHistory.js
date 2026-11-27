// Read-only projection of existing contract demo records. Never a real cash ledger.
const positive=v=>Number.isSafeInteger(v)&&v>0
export function walletHistory(rows,{hasMore=false}={}){
 const movements=[]
 for(const r of rows){
  const key=r.requestId+':'+r.agreementVersion+':'+r.revision
  const add=(kind,amount,paidAt,status,method)=>{if(!positive(amount))return;movements.push({id:key+':'+kind,requestId:r.requestId,agreementVersion:r.agreementVersion,contractRevision:r.revision,projectTitle:r.projectTitle||'Proyecto MATCHTER',kind,amountCLP:amount,status,method,recordedAt:paidAt||null,contractDate:r.createdAt,demo:true})}
  if(r.feeEligible){
   const status=r.feePaidAt?'recorded_demo':r.feeMode==='deferred'?'deferred_demo':'pending_demo'
   // A deferred authorization is not a payment. Historical records remain simulated.
   add('service_fee',r.feeAmount,r.feePaidAt,status,r.feeMode==='deferred'?'legacy_deferred_demo':r.feePaidAt?'direct_demo':null)
  }
  if(r.notaryEligible)add('notary_fee',r.notaryPaidAt?r.notaryPaidAmount:r.notaryQuotedAmount,r.notaryPaidAt,r.notaryPaidAt?'recorded_demo':'pending_demo',r.notaryPaidAt?'direct_demo':null)
 }
 movements.sort((a,b)=>new Date(b.recordedAt||b.contractDate)-new Date(a.recordedAt||a.contractDate)||a.id.localeCompare(b.id))
 return {currency:'CLP',demo:true,realPaymentsEnabled:false,hasMore,movements}
}
export async function readWalletHistory(db,actor){
 // One row per signed contract revision; only the current profile's own fee state.
 const {rows}=await db.query(`SELECT c.request_id AS "requestId",c.agreement_version AS "agreementVersion",c.revision,c.created_at AS "createdAt",
 a.data->>'title' AS "projectTitle",
 (CASE WHEN r.sender_profile_id=$1 THEN c.terms->'serviceFee' IS NOT NULL ELSE c.terms->'serviceFee'->>'version'='2' END) AS "feeEligible",
 CASE WHEN jsonb_typeof(c.terms->'serviceFee'->'amount')='number' THEN (c.terms->'serviceFee'->>'amount')::numeric::text END AS "feeAmountText",
 CASE WHEN r.sender_profile_id=$1 THEN c.service_fee_demo_paid_at ELSE c.provider_fee_demo_paid_at END AS "feePaidAt",
 CASE WHEN r.recipient_profile_id=$1 THEN c.provider_fee_demo_mode END AS "feeMode",
 (c.mode='notary' AND c.notary_accepted_at IS NOT NULL AND c.terms->'notaryArrangement'->>'payer'=CASE WHEN r.sender_profile_id=$1 THEN 'client' ELSE 'provider' END) AS "notaryEligible",
 CASE WHEN c.terms->'notaryArrangement'->>'payer'=CASE WHEN r.sender_profile_id=$1 THEN 'client' ELSE 'provider' END THEN c.notary_demo_paid_at END AS "notaryPaidAt",
 CASE WHEN c.terms->'notaryArrangement'->>'payer'=CASE WHEN r.sender_profile_id=$1 THEN 'client' ELSE 'provider' END THEN c.notary_demo_fee END AS "notaryPaidAmount"
 FROM matchter.project_contract_demos c JOIN matchter.swipe_requests r ON r.id=c.request_id
 JOIN matchter.project_agreement_versions a ON a.request_id=c.request_id AND a.version=c.agreement_version
 WHERE r.status='accepted' AND (($2='Cliente' AND r.sender_profile_id=$1) OR ($2<>'Cliente' AND r.recipient_profile_id=$1))
 AND c.client_signed_at IS NOT NULL AND c.provider_signed_at IS NOT NULL
 ORDER BY c.created_at DESC,c.request_id,c.agreement_version DESC,c.revision DESC LIMIT 101`,[actor.id,actor.role])
 return walletHistory(rows.slice(0,100).map(r=>({...r,feeAmount:Number(r.feeAmountText),notaryQuotedAmount:33490})),{hasMore:rows.length>100})
}
