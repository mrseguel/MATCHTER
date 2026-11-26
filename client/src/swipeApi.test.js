import {test} from 'node:test'
import assert from 'node:assert/strict'
import {swipeRequest} from './features/auth/swipeApi.js'
const client={getJWTToken:async()=>'a.b.c'}
test('SWIPE uses signed credentials and the expected active profile, not demo actor IDs',async()=>{
 await swipeRequest(client,'cards','Cliente',undefined,{city:'Temuco'},async(url,options)=>{assert.equal(url,'/api/auth-preview/swipe/cards?role=Cliente&city=Temuco');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer a.b.c');return {ok:true,json:async()=>({cards:[]})}})
 await swipeRequest(client,'invite','Cliente',{targetId:'target',role:'Empresa',details:{projectTitle:'Prueba'}},{},async(url,options)=>{assert.equal(url,'/api/auth-preview/swipe/invite');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{targetId:'target',role:'Cliente',details:{projectTitle:'Prueba'}});return {ok:true,json:async()=>({request:{id:'test',status:'pending'}})}})
 await assert.rejects(swipeRequest(client,'requests','Cliente',undefined,{},async()=>({ok:false,status:409,json:async()=>({message:'El perfil activo cambió'})})),/perfil activo cambió/)
})
