// Test-only adapter. No HTTP, card details, live credentials, funds or database writes.
// This fixture must not be exposed through the application's payment routes.
import {createHash} from 'node:crypto'
const safeAmount=n=>Number.isSafeInteger(n)&&n>0
const reference=/^[A-Za-z0-9:_-]{1,160}$/
const fail=message=>{throw new Error(message)}
const scenarios=new Set(['approved','declined','cancelled'])
export function createPaymentProviderSandbox({mode,clock=()=>new Date()}={}){
 if(mode!=='isolated_test')fail('Only isolated_test mode is supported')
 const attempts=new Map()
 const methods=Object.freeze([{id:'fixture-approved',label:'Método ficticio aprobado',demo:true},{id:'fixture-declined',label:'Método ficticio rechazado',demo:true}])
 function create({operationId,ownerId,amountCLP,currency,methodId}={}){
  if(!reference.test(operationId||'')||!reference.test(ownerId||'')||!safeAmount(amountCLP)||currency!=='CLP'||!methods.some(m=>m.id===methodId))fail('Invalid sandbox operation')
  const payload={operationId,ownerId,amountCLP,currency,methodId}
  const prior=attempts.get(operationId)
  if(prior){if(JSON.stringify(prior.payload)!==JSON.stringify(payload))fail('Idempotency conflict');return {...prior.result}}
  const providerReference='TEST-'+createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0,24)
  const result={operationId,providerReference,amountCLP,currency,status:'pending',demo:true,realPayment:false,createdAt:clock().toISOString()}
  attempts.set(operationId,{payload,result});return {...result}
 }
 function query(operationId,ownerId){
  const a=attempts.get(operationId);if(!a||a.payload.ownerId!==ownerId)fail('Operation unavailable')
  return {...a.result}
 }
 function finish(operationId,ownerId,outcome){
  if(!scenarios.has(outcome))fail('Invalid sandbox outcome')
  const a=attempts.get(operationId);if(!a||a.payload.ownerId!==ownerId)fail('Operation unavailable')
  const expected=a.payload.methodId==='fixture-approved'?'approved':'declined'
  if(outcome!=='cancelled'&&outcome!==expected)fail('Inconsistent fixture outcome')
  if(a.result.status!=='pending'){if(a.result.status!==outcome)fail('Terminal state cannot change');return {...a.result}}
  a.result={...a.result,status:outcome,completedAt:clock().toISOString()};return {...a.result}
 }
 return Object.freeze({mode:'isolated_test',realPaymentsEnabled:false,supportsCustody:false,methods,create,query,finish})
}
