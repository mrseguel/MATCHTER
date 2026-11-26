import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createMessagesService,validateMessage} from './messagesService.js'
import {AuthError} from './identityAccounts.js'
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',r='44444444-4444-4444-8444-444444444444',m='55555555-5555-4555-8555-555555555555'
test('message validation rejects empty text and supplied actor IDs',()=>{
 assert.equal(validateMessage({role:'Cliente',requestId:r,clientMessageId:m,body:' Hola '}).body,'Hola')
 for(const body of [{body:' '},{senderId:a},{body:'x'.repeat(3001)},{requestId:'not-uuid'}])assert.throws(()=>validateMessage({role:'Cliente',requestId:r,clientMessageId:m,body:'Hola',...body}),e=>e.status===400)
})
test('accepted Match participants alone can read and send; retries are idempotent',async()=>{
 let accepted=false;const items=[]
 const roles={a:{id:a,role:'Cliente'},b:{id:b,role:'Profesional'},c:{id:c,role:'Cliente'}}
 const db={query:async(sql,p)=>{
  if(sql.startsWith('SELECT p.id,p.role'))return {rows:[roles[p[1]]].filter(Boolean)}
  if(sql.startsWith('SELECT id FROM matchter.swipe_requests'))return {rows:accepted&&p[0]===r&&[a,b].includes(p[1])?[{id:r}]:[]}
  if(sql.startsWith('INSERT INTO matchter.swipe_messages')){if(items.some(x=>x.sender===p[1]&&x.key===p[2]))return {rows:[]};const message={id:m,sender:p[1],key:p[2],body:p[3],me:true};items.push(message);return {rows:[message]}}
  if(sql.includes('client_message_id=$3'))return {rows:items.filter(x=>x.sender===p[1]&&x.key===p[2])}
  if(sql.startsWith('SELECT m.id'))return {rows:items.map(x=>({...x,me:x.sender===p[1]}))}
  throw Error('Unexpected query')
 }}
 const s=createMessagesService({db,verifyIdentity:async h=>{if(!roles[h])throw new AuthError(401,'No autenticado');return {issuer:'test',subject:h}}})
 const body={role:'Cliente',requestId:r,clientMessageId:m,body:'Hola'}
 await assert.rejects(s.send('a',body),e=>e.status===404)
 accepted=true
 await assert.rejects(s.send('c',body),e=>e.status===404)
 await assert.rejects(s.history('c',{role:'Cliente',requestId:r}),e=>e.status===404)
 await assert.rejects(s.history('b',{role:'Cliente',requestId:r}),e=>e.status===409)
 assert.equal((await s.send('a',body)).message.body,'Hola')
 await s.send('a',body);assert.equal(items.length,1)
 await assert.rejects(s.send('a',{...body,body:'Otro'}),e=>e.status===409)
 assert.equal((await s.history('b',{role:'Profesional',requestId:r})).messages[0].me,false)
 assert.equal((await s.history('a',{role:'Cliente',requestId:r})).messages[0].me,true)
 await assert.rejects(s.list('forged','Cliente'),e=>e.status===401)
})
