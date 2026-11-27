import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {verifyKhipuTestWebhook,verifyMercadoPagoTestWebhook} from './sandboxWebhookVerification.js'
const now=1795795200000,secret='fixture-only-webhook-secret',merchantId='9876'
const raw=Buffer.from('{"payment_id":"abc123def456", "receiver_id":9876,"bank_account_number":"PRIVATE"}')
const kSign=(r,t=now)=>'t='+t+',s='+createHmac('sha256',secret).update(t+'.').update(r).digest('base64')
const k={rawBody:raw,signature:kSign(raw),secret,merchantId,now}
test('Khipu authenticates original bytes and returns minimal signal, never settlement',()=>{
 const h=verifyKhipuTestWebhook(k);assert.equal(h.resourceId,'abc123def456');assert.equal(h.realPayment,false);assert.equal('bank_account_number' in h,false)
 assert.equal(verifyKhipuTestWebhook(k).eventKey,h.eventKey)
 assert.throws(()=>verifyKhipuTestWebhook({...k,rawBody:Buffer.from(JSON.stringify(JSON.parse(raw)))}))
 assert.throws(()=>verifyKhipuTestWebhook({...k,merchantId:'9877'}))
 assert.throws(()=>verifyKhipuTestWebhook({...k,signature:kSign(raw,now-360000)}))
 assert.throws(()=>verifyKhipuTestWebhook({...k,signature:k.signature+',t='+now}))
})
const resourceId='123456',requestId='qa-request-1',mpRaw=Buffer.from(JSON.stringify({type:'payment',live_mode:false,user_id:9876,data:{id:resourceId}}))
const mSign=(ts=now)=>'ts='+ts+',v1='+createHmac('sha256',secret).update('id:'+resourceId+';request-id:'+requestId+';ts:'+ts+';').digest('hex')
const m={rawBody:mpRaw,signature:mSign(),secret,merchantId,now,resourceId,requestId}
test('Mercado Pago validates signed resource and request; rejects mismatched body and live hints',()=>{
 assert.equal(verifyMercadoPagoTestWebhook(m).resourceId,resourceId)
 assert.equal(verifyMercadoPagoTestWebhook({...m,signature:mSign(now/1000)}).realPayment,false)
 for(const change of [{resourceId:'987'},{requestId:'other'},{signature:mSign(now-360000)},{rawBody:Buffer.from(JSON.stringify({type:'payment',live_mode:true,user_id:9876,data:{id:resourceId}}))},{rawBody:Buffer.from('{}')}])assert.throws(()=>verifyMercadoPagoTestWebhook({...m,...change}))
})
test('large or invalid bodies, duplicate fields and invalid HMAC are rejected',()=>{
 assert.throws(()=>verifyKhipuTestWebhook({...k,rawBody:Buffer.alloc(270000)}))
 assert.throws(()=>verifyMercadoPagoTestWebhook({...m,signature:m.signature+',v1='+'0'.repeat(64)}))
 assert.throws(()=>verifyMercadoPagoTestWebhook({...m,signature:'ts='+now+',v1='+'0'.repeat(64)}))
})
