import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxNotificationDrain} from './sandboxNotificationDrain.js'
test('drain handles bounded batches and stops when queue is empty',async()=>{
 const outcomes=[{processed:true,state:'processed'},{processed:true,state:'review'},{processed:true,state:'pending'},{processed:false}]
 const drain=createSandboxNotificationDrain({mode:'isolated_test',inbox:{processOne:async()=>outcomes.shift()}})
 assert.deepEqual(await drain.run(),{processed:3,review:1,pending:1,leaseLost:0,busy:false,environment:'sandbox',realPayment:false})
 await assert.rejects(drain.run({maxEvents:11}))
})
test('drain stops starting new work at budget and avoids concurrent local invocation',async()=>{
 let now=0,release
 const gate=new Promise(resolve=>{release=resolve})
 const drain=createSandboxNotificationDrain({mode:'isolated_test',clock:()=>now,inbox:{processOne:async()=>{await gate;now=1500;return {processed:true,state:'processed'}}}})
 const first=drain.run({budgetMs:1000})
 assert.equal((await drain.run()).busy,true)
 release()
 assert.equal((await first).processed,1)
})
test('drain reports lost lease and can be called again after an infrastructure error',async()=>{
 let calls=0
 const drain=createSandboxNotificationDrain({mode:'isolated_test',inbox:{processOne:async()=>{if(++calls===1)throw Error('database');return {processed:false,state:'lease_lost'}}}})
 await assert.rejects(drain.run())
 assert.equal((await drain.run()).leaseLost,1)
})
