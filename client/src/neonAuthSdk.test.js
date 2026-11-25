import {test} from 'node:test'
import assert from 'node:assert/strict'
import {BetterAuthVanillaAdapter} from '@neondatabase/auth/vanilla/adapters'
import {createPreviewAuthClient,wrapAuthAdapter} from './features/auth/authSdk.js'
test('installed Neon adapter has concrete JWT retrieval and email API',()=>{
 const adapter=BetterAuthVanillaAdapter()('https://auth.example.test')
 assert.equal(typeof adapter.getBetterAuthInstance,'function')
 assert.equal(typeof adapter.getJWTToken,'function')
 const client=createPreviewAuthClient('https://auth.example.test')
 for(const fn of [client.signUp.email,client.signIn.email,client.emailOtp.verifyEmail,client.emailOtp.sendVerificationOtp,client.getJWTToken])assert.equal(typeof fn,'function')
})
test('use verified session access token or concrete adapter, not dynamic SDK proxy',async()=>{
 let calls=0
 const auth={getSession:async()=>({data:{user:{id:'test'},session:{access_token:'a.b.c'}}})}
 const adapter={getBetterAuthInstance:()=>auth,getJWTToken:async anonymous=>{assert.equal(anonymous,false);calls++;return 'd.e.f'}}
 const client=wrapAuthAdapter(adapter)
 assert.equal(await client.getJWTToken(),'a.b.c');assert.equal(calls,0)
 auth.getSession=async()=>({data:{user:{id:'test'},session:{token:'opaque'}}})
 assert.equal(await client.getJWTToken(),'d.e.f');assert.equal(calls,1)
 auth.getSession=async()=>({data:null})
 await assert.rejects(client.getJWTToken(),/sesión/)
 assert.equal(calls,1)
})
