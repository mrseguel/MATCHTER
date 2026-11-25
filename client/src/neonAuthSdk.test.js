import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createAuthClient,BetterAuthVanillaAdapter} from '@neondatabase/auth'
import {createPreviewAuthClient} from './features/auth/authSdk.js'
test('pinned Neon SDK has usable email sign-up and sign-in methods',()=>{
 const raw=createAuthClient('https://auth.example.test',{adapter:BetterAuthVanillaAdapter()})
 const candidates=[raw,raw?.adapter,raw?.auth]
 assert.ok(candidates.some(c=>typeof c?.signUp?.email==='function'&&typeof c?.signIn?.email==='function'&&typeof c?.getSession==='function'&&typeof c?.signOut==='function'),'Neon SDK missing email methods')
 const client=createPreviewAuthClient('https://auth.example.test')
 assert.equal(typeof client.signUp.email,'function')
 assert.equal(typeof client.signIn.email,'function')
})
