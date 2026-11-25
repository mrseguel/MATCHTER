import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ACCOUNT_TYPES,roleForLabel,pendingRoleFor,completeIdentity,accountRequest} from './features/auth/realAuthFlow.js'
test('approved four profile labels map to four distinct immutable roles',()=>{
 assert.deepEqual(ACCOUNT_TYPES.map(t=>roleForLabel(t[1])),['Cliente','Maestro o contratista','Profesional','Empresa'])
 assert.throws(()=>roleForLabel('admin'))
 assert.throws(()=>roleForLabel('__proto__'))
})
test('registration choice is only used for the same verified email and only if no profile exists',async()=>{
 const pending={email:'test@example.test',label:'Perfil clientes'}
 const user={email:' TEST@example.test ',emailVerified:true}
 assert.equal(pendingRoleFor(pending,user),'Cliente')
 assert.equal(pendingRoleFor(pending,{email:'other@example.test',emailVerified:true}),null)
 assert.equal(pendingRoleFor(pending,{...user,emailVerified:false}),null)
 const calls=[]
 const client={}
 const req=async(c,path,body)=>{calls.push({path,body});return path==='me'?null:{id:'a',role:body.role}}
 assert.deepEqual(await completeIdentity(client,{user},pending,req),{id:'a',role:'Cliente'})
 assert.deepEqual(calls,[{path:'me',body:undefined},{path:'onboard',body:{role:'Cliente'}}])
 assert.deepEqual(await completeIdentity(client,{user},pending,async(c,path)=>{assert.equal(path,'me');return {id:'a',role:'Empresa'}}),{id:'a',role:'Empresa'})
 assert.equal(await completeIdentity(client,{user:{...user,email:'other@example.test'}},pending,req),null)
 assert.equal(await completeIdentity(client,{user:{...user,emailVerified:false}},pending,()=>{throw Error('must not call API')}),null)
})
test('only explicit no-profile response means onboarding; route failures remain errors',async()=>{
 const client={getJWTToken:async()=>'a.b.c'}
 const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data})
 assert.equal(await accountRequest(client,'me',null,async()=>response(404,{message:'Completa tu perfil'})),null)
 await assert.rejects(accountRequest(client,'me',null,async()=>response(404,{message:'No disponible'})),/No disponible/)
 const value=await accountRequest(client,'onboard',{role:'Cliente'},async(url,options)=>{assert.equal(url,'/api/auth-preview/onboard');assert.equal(options.headers.Authorization,'Bearer a.b.c');assert.equal(options.body,'{"role":"Cliente"}');return response(200,{id:'a',role:'Cliente'})})
 assert.equal(value.role,'Cliente')
})
