import {createHmac,timingSafeEqual,createHash} from 'node:crypto'
// Pure verification only; no route, database mutation, or external requests.
// Khipu signs the original bytes. MP signs the query resource ID and request headers.
// Both are signals to re-fetch the resource, NEVER proof of payment.
const invalid=()=>{throw Error('Notificación de prueba no válida')}
const maxBytes=256*1024
const maxSkew=5*60*1000
const id=/^[0-9]{1,20}$/
function fields(header,keys){
 if(typeof header!=='string'||header.length>256)invalid()
 const parsed={}
 for(const part of header.split(',')){
  const pos=part.indexOf('=')
  const key=part.slice(0,pos).trim(),value=part.slice(pos+1).trim()
  if(pos<1||!keys.includes(key)||Object.hasOwn(parsed,key)||!value)invalid()
  parsed[key]=value
 }
 if(keys.some(k=>!Object.hasOwn(parsed,k)))invalid()
 return parsed
}
function timestamp(value,now,{seconds=false}={}){
 if(typeof value!=='string'||!/^\d{10,13}$/.test(value)||!Number.isSafeInteger(now))invalid()
 const ms=seconds&&value.length===10?Number(value)*1000:Number(value)
 if(!Number.isSafeInteger(ms)||Math.abs(now-ms)>maxSkew)invalid()
}
function checkSecret(secret){if(typeof secret!=='string'||secret.length<8||secret.length>512)invalid()}
function match(expected,received){if(expected.length!==received.length||!timingSafeEqual(expected,received))invalid()}
function body(raw){
 if(!Buffer.isBuffer(raw)||raw.length<1||raw.length>maxBytes)invalid()
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));if(!value||typeof value!=='object'||Array.isArray(value))invalid();return value}catch{invalid()}
}
function hint(provider,resourceId,unique){
 return {provider,resourceId,eventKey:createHash('sha256').update(provider+':'+unique).digest('hex'),environment:'sandbox',verifiedNotification:true,realPayment:false}
}
export function verifyKhipuTestWebhook({rawBody,signature,secret,merchantId,now=Date.now()}){
 checkSecret(secret)
 if(!Buffer.isBuffer(rawBody)||rawBody.length>maxBytes||!id.test(merchantId||''))invalid()
 const {t,s}=fields(signature,['t','s']);timestamp(t,now)
 if(!/^[A-Za-z0-9+/]{43}=$/.test(s))invalid()
 const expected=createHmac('sha256',secret).update(t+'.').update(rawBody).digest()
 match(expected,Buffer.from(s,'base64'))
 const b=body(rawBody)
 if(typeof b.payment_id!=='string'||!/^[a-z0-9]{12}$/i.test(b.payment_id)||String(b.receiver_id)!==merchantId)invalid()
 // No raw body, personal identifier, name, bank details, or claimed amount in the signal.
 return hint('khipu',b.payment_id,b.payment_id+':'+t+':'+s)
}
export function verifyMercadoPagoTestWebhook({rawBody,signature,requestId,resourceId,secret,merchantId,now=Date.now()}){
 checkSecret(secret)
 if(typeof resourceId!=='string'||!id.test(resourceId)||typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)||!id.test(merchantId||''))invalid()
 const {ts,v1}=fields(signature,['ts','v1']);timestamp(ts,now,{seconds:true})
 if(!/^[a-f0-9]{64}$/i.test(v1))invalid()
 const expected=createHmac('sha256',secret).update('id:'+resourceId+';request-id:'+requestId+';ts:'+ts+';').digest()
 match(expected,Buffer.from(v1,'hex'))
 const b=body(rawBody)
 if(b.type!=='payment'||b.live_mode!==false||String(b.data?.id)!==resourceId||String(b.user_id)!==merchantId)invalid()
 // Body is not cryptographically signed by MP. It is a filter only; GET must verify the resource.
 return hint('mercadopago',resourceId,resourceId+':'+requestId+':'+ts)
}
