import test from 'node:test'
import assert from 'node:assert/strict'
import {createKhipuNotificationHandler} from './sandboxKhipuNotificationHandler.js'
import {SandboxNotificationError} from './sandboxWebhookVerification.js'
const key='a'.repeat(64)
test('handler rejects invalid notifications before processing',async()=>{
 const h=createKhipuNotificationHandler({mode:'isolated_test',inbox:{acceptKhipu:async()=>{throw new SandboxNotificationError()},processOne:async()=>assert.fail(),status:async()=>assert.fail()}})
 assert.deepEqual(await h({}),{status:400,body:{accepted:false}})
})
test('automatic targeted reconciliation; repeated delivery does not reprocess',async()=>{
 let state='pending',calls=0
 const h=createKhipuNotificationHandler({mode:'isolated_test',inbox:{acceptKhipu:async()=>({accepted:true,eventKey:key}),status:async k=>{assert.equal(k,key);return state},processOne:async ({eventKey})=>{assert.equal(eventKey,key);calls++;state='processed'}}})
 assert.equal((await h({})).status,200);assert.equal((await h({})).status,200);assert.equal(calls,1)
})
test('retryable failures do not acknowledge completion',async()=>{
 const h=createKhipuNotificationHandler({mode:'isolated_test',inbox:{acceptKhipu:async()=>({accepted:true,eventKey:key}),status:async()=> 'pending',processOne:async()=>({processed:false})}})
 assert.equal((await h({})).status,503)
 assert.throws(()=>createKhipuNotificationHandler({mode:'live',inbox:{}}))
})
