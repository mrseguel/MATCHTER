import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {request} from 'node:http'
import {createHmac} from 'node:crypto'
import {createSandboxNotificationRouter} from './sandboxNotificationRouter.js'
import {verifyKhipuTestWebhook,verifyMercadoPagoTestWebhook} from './sandboxWebhookVerification.js'
const host='qa.invalid',secret='fixture-webhook-secret',merchantId='9876'
const raw=Buffer.from('{"payment_id":"abc123def456", "receiver_id":9876}')
function signK(){const t=String(Date.now());return 't='+t+',s='+createHmac('sha256',secret).update(t+'.').update(raw).digest('base64')}
async function withServer(fn){
 const seen=[]
 const inbox={acceptKhipu:async input=>{verifyKhipuTestWebhook({...input,secret,merchantId});seen.push(input.rawBody);return {accepted:true}},acceptMercadoPago:async input=>{verifyMercadoPagoTestWebhook({...input,secret,merchantId});seen.push(input.rawBody);return {accepted:true}}}
 const app=express();app.use('/hooks',createSandboxNotificationRouter({mode:'isolated_test',host,inbox}))
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
 const send=(path,body,headers={},method='POST')=>new Promise((resolve,reject)=>{
  const req=request({host:'127.0.0.1',port:server.address().port,path:'/hooks'+path,method,headers:{Host:host,'Content-Type':'application/json','Content-Length':body.length,...headers}},res=>{let b='';res.on('data',x=>b+=x);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(b),cache:res.headers['cache-control']}))});req.on('error',reject);req.end(body)
 })
 try{await fn({send,seen,inbox})}finally{await new Promise(resolve=>server.close(resolve))}
}
test('sandbox HTTP receiver preserves Khipu original bytes, acknowledges only verified acceptance',()=>withServer(async({send,seen,inbox})=>{
 const headers={'x-khipu-signature':signK()}
 assert.deepEqual(await send('/khipu',raw,headers),{status:200,body:{accepted:true},cache:'no-store'})
 assert.deepEqual(seen[0],raw)
 assert.equal((await send('/khipu',Buffer.from(JSON.stringify(JSON.parse(raw))),headers)).status,400)
 assert.equal((await send('/khipu',raw,{...headers,Host:'other.invalid'})).status,404)
 assert.equal((await send('/khipu',raw,{...headers,'Content-Type':'text/plain'})).status,415)
 assert.equal((await send('/khipu',raw,{...headers,'Content-Encoding':'gzip'})).status,415)
 assert.equal((await send('/khipu',Buffer.alloc(270000),headers)).status,413)
 assert.equal((await send('/khipu',raw,headers,'GET')).status,404)
 assert.equal((await send('/khipu',raw,{'x-khipu-signature':[signK(),signK()]})).status,400)
 inbox.acceptKhipu=async()=>{throw Error('private database details')}
 const failed=await send('/khipu',raw,headers)
 assert.equal(failed.status,503);assert.equal(JSON.stringify(failed).includes('private'),false)
}))
test('Mercado Pago receiver requires one signed query resource and request ID',()=>withServer(async({send,seen})=>{
 const id='123456',requestId='qa-1',ts=String(Date.now()),body=Buffer.from(JSON.stringify({type:'payment',live_mode:false,user_id:9876,data:{id}}))
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update('id:'+id+';request-id:'+requestId+';ts:'+ts+';').digest('hex')
 const h={'x-signature':signature,'x-request-id':requestId}
 assert.equal((await send('/mercadopago?data.id='+id,body,h)).status,200)
 assert.equal((await send('/mercadopago?data.id='+id+'&data.id='+id,body,h)).status,400)
 assert.equal((await send('/mercadopago?data.id=9999',body,h)).status,400)
 assert.equal((await send('/mercadopago',body,h)).status,400)
 assert.equal(seen.length,1)
}))
test('router cannot be created in live mode',()=>assert.throws(()=>createSandboxNotificationRouter({mode:'live',host,inbox:{}})))
