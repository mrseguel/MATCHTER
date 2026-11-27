import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {request} from 'node:http'
import {createHmac} from 'node:crypto'
import {createKhipuOnlyNotificationRouter} from './sandboxKhipuOnlyNotificationRouter.js'
import {createKhipuNotificationHandler} from './sandboxKhipuNotificationHandler.js'
import {verifyKhipuTestWebhook} from './sandboxWebhookVerification.js'
const host='qa.invalid',secret='fixture-secret-not-provider',merchantId='533557'
const raw=Buffer.from('{"payment_id":"abc123def456", "receiver_id":533557}')
test('isolated HTTP webhook preserves bytes, verifies signature, deduplicates and refuses other routes',async()=>{
 let state='pending',reads=0
 const inbox={acceptKhipu:async input=>{const e=verifyKhipuTestWebhook({...input,secret,merchantId});return {accepted:true,eventKey:e.eventKey}},status:async()=>state,processOne:async()=>{reads++;state='processed'}}
 const handle=createKhipuNotificationHandler({mode:'isolated_test',inbox})
 const app=express();app.use('/hooks',createKhipuOnlyNotificationRouter({mode:'isolated_test',host,handle}))
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
 const t=String(Date.now()),sig='t='+t+',s='+createHmac('sha256',secret).update(t+'.').update(raw).digest('base64')
 const send=(path,body=raw,headers={},method='POST')=>new Promise((resolve,reject)=>{
  const req=request({host:'127.0.0.1',port:server.address().port,path:'/hooks'+path,method,headers:{Host:host,'Content-Type':'application/json','Content-Length':body.length,'x-khipu-signature':sig,...headers}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end(body)
 })
 try{
  assert.equal(await send('/khipu'),200);assert.equal(await send('/khipu'),200);assert.equal(reads,1)
  assert.equal(await send('/khipu',Buffer.from(JSON.stringify(JSON.parse(raw)))),400)
  assert.equal(await send('/khipu',raw,{'x-khipu-signature':[sig,sig]}),400)
  assert.equal(await send('/khipu',raw,{Host:'other.invalid'}),404)
  assert.equal(await send('/mercadopago'),404)
  assert.equal(await send('/khipu',raw,{},'GET'),404)
  assert.equal(await send('/khipu',raw,{'Content-Type':'text/plain'}),415)
  assert.equal(await send('/khipu',Buffer.alloc(270000)),413)
 }finally{await new Promise(resolve=>server.close(resolve))}
 assert.equal(reads,1)
})
test('no live receiver',()=>assert.throws(()=>createKhipuOnlyNotificationRouter({mode:'live',host,handle:async()=>({status:200})})))
