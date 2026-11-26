import {test} from 'node:test'
import assert from 'node:assert/strict'
import {messagesRequest} from './features/auth/messagesApi.js'
const client={getJWTToken:async()=>'a.b.c'}
test('message requests use verified token and expected active role',async()=>{
 await messagesRequest(client,'history','Cliente',undefined,{requestId:'test'},async(url,o)=>{assert.equal(url,'/api/auth-preview/messages/history?requestId=test&role=Cliente');assert.equal(o.headers.Authorization,'Bearer a.b.c');return {ok:true,json:async()=>({messages:[]})}})
 await messagesRequest(client,'send','Cliente',{role:'Empresa',requestId:'test',clientMessageId:'key',body:'hola'},{},async(url,o)=>{assert.equal(url,'/api/auth-preview/messages/send');assert.equal(JSON.parse(o.body).role,'Cliente');return {ok:true,json:async()=>({message:{id:'test'}})}})
})
