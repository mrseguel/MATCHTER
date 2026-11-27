import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'

// Read-only Khipu connectivity diagnostic. No payment creation, DB or browser route.
// Official GET /v3/banks: https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getbanks
const URL='https://payment-api.khipu.com/v3/banks'
const result=(status,extra={})=>({status,operation:'GET /v3/banks',realPayment:false,...extra})
const normalized=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const demoNames=new Set(['demobank','bancodedemostracion','bancodeprueba','bancodepruebas'])
export async function probeKhipu({key,fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
 if(typeof key!=='string'||key.length<8||key.length>512||/[^\x21-\x7e]/.test(key))return result('missing_or_invalid_key')
 if(typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)return result('invalid_transport')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
 try{
  const response=await fetchImpl(URL,{method:'GET',headers:{Accept:'application/json','x-api-key':key},redirect:'error',cache:'no-store',signal:controller.signal})
  if(response?.redirected)return result('unexpected_redirect')
  if(response?.status===401||response?.status===403)return result('credential_rejected')
  if(response?.status!==200)return result('provider_unavailable')
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')||''))return result('invalid_response')
  const reader=response.body?.getReader()
  if(!reader)return result('invalid_response')
  const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,raw=''
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256*1024){controller.abort();return result('invalid_response')}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
  let body;try{body=JSON.parse(raw)}catch{return result('invalid_response')}
  const banks=body?.banks
  if(!Array.isArray(banks)||!banks.length||banks.length>1000||banks.some(b=>!b||typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.bank_id!=='string'||!b.bank_id.trim()))return result('invalid_response')
  const allDemo=banks.every(b=>demoNames.has(normalized(b.name)))
  // Bank labels are evidence, not cryptographic proof of merchant identity or mode.
  // Never expose raw response, bank names, IDs, secrets or customer information.
  return result(allDemo?'demo_banks_only':'bank_mode_unconfirmed',{authenticated:true,bankCount:banks.length})
 }catch{return result('network_or_response_error')}finally{clearTimeout(timer)}
}
export async function selfTest(){
 const key='fixture-key-not-real',demo={bank_id:'fake1',name:'Demo Bank'},real={bank_id:'fake2',name:'Banco Estado'}
 const json=banks=>new Response(JSON.stringify({banks}),{headers:{'Content-Type':'application/json'}})
 let calls=0
 const ok=await probeKhipu({key,fetchImpl:async(u,o)=>{calls++;assert.equal(u,URL);assert.equal(o.method,'GET');assert.equal(o.redirect,'error');assert.equal(o.headers['x-api-key'],key);assert.equal(o.body,undefined);return json([demo])}})
 assert.deepEqual(ok,result('demo_banks_only',{authenticated:true,bankCount:1}));assert.equal(calls,1)
 assert.equal((await probeKhipu({key,fetchImpl:async()=>json([demo,real])})).status,'bank_mode_unconfirmed')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>json([real])})).status,'bank_mode_unconfirmed')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>json([])})).status,'invalid_response')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>json([{name:'DemoBank'}])})).status,'invalid_response')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>new Response('',{status:401})})).status,'credential_rejected')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>new Response('',{status:403})})).status,'credential_rejected')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>new Response('',{status:500})})).status,'provider_unavailable')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>new Response('not json',{headers:{'Content-Type':'application/json'}})})).status,'invalid_response')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>new Response('x'.repeat(262145),{headers:{'Content-Type':'application/json'}})})).status,'invalid_response')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>{throw Error(key)}})).status,'network_or_response_error')
 assert.equal((await probeKhipu({key:'',fetchImpl:async()=>{throw Error('must not call')}})).status,'missing_or_invalid_key')
 assert.equal((await probeKhipu({key,fetchImpl:async()=>({redirected:true,status:200})})).status,'unexpected_redirect')
 console.log('KHIPU_PROBE_SELF_TEST_OK 13')
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{
  if(process.argv[2]==='--self-test')await selfTest()
  else if(process.argv[2]==='--check'&&process.env.VERCEL_ENV==='preview'){
   const outcome=await probeKhipu({key:process.env.KHIPU_API_KEY})
   console.log('KHIPU_PROBE_RESULT '+JSON.stringify(outcome))
   if(outcome.status!=='demo_banks_only')process.exitCode=1
  }else{console.error('KHIPU_PROBE_REFUSED: explicit preview check required');process.exitCode=1}
 }catch{console.error('KHIPU_PROBE_FAILED');process.exitCode=1}
}
