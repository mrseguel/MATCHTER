import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT } from 'jose'
import { createIdentityVerifier, createAccountService, PROFILE_ROLES } from './identityAccounts.js'

const issuer='https://identity.example.test',audience='matchter-integration',jwksUrl=issuer+'/jwks'
const {publicKey,privateKey}=await generateKeyPair('ES256')
const verifier=createIdentityVerifier({issuer,audience,jwksUrl,algorithms:['ES256']},publicKey)
async function token({sub='person-1',iss=issuer,aud=audience,verified=true,exp='5m',key=privateKey}={}) {
  return 'Bearer '+await new SignJWT({emailVerified:verified,role:'admin'}).setProtectedHeader({alg:'ES256'}).setIssuer(iss).setAudience(aud).setSubject(sub).setIssuedAt().setExpirationTime(exp).sign(key)
}
test('valid signed identity ignores arbitrary role claim',async()=>{
  assert.deepEqual(await verifier(await token()),{issuer,subject:'person-1'})
})
test('missing, forged, wrong issuer, wrong audience, expired and unverified tokens are rejected',async()=>{
  const other=await generateKeyPair('ES256')
  for(const header of [undefined,'Bearer fake',await token({key:other.privateKey}),await token({iss:'https://other.example.test'}),await token({aud:'other'}),await token({exp:Math.floor(Date.now()/1000)-30})])await assert.rejects(verifier(header),{status:401})
  await assert.rejects(verifier(await token({verified:false})),{status:403})
})
test('issuer and key location must be trusted',()=>{
  assert.throws(()=>createIdentityVerifier({issuer,audience,jwksUrl:'https://attacker.example.test/jwks'}))
})
test('all four profile roles onboard; identity is stable, no role overwrite or account impersonation',async()=>{
  const rows=new Map();let serial=0
  const db={async query(sql,params){
    const [iss,sub,role]=params,key=JSON.stringify([iss,sub])
    if(sql.startsWith('SELECT'))return {rows:rows.has(key)?[rows.get(key)]:[]}
    assert.ok(sql.includes('ON CONFLICT (auth_issuer,auth_subject) DO NOTHING'))
    if(rows.has(key))return {rows:[]}
    const row={id:'id-'+(++serial),role};rows.set(key,row);return {rows:[row]}
  }}
  const service=createAccountService({db,verifyIdentity:verifier})
  for(const [i,role] of PROFILE_ROLES.entries()){
    const header=await token({sub:'person-'+i})
    const account=await service.onboard(header,{role})
    assert.equal(account.role,role)
    assert.deepEqual(await service.me(header),account)
    assert.deepEqual(await service.onboard(header,{role}),account)
    await assert.rejects(service.onboard(header,{role:PROFILE_ROLES[(i+1)%4]}),{status:409})
    await assert.rejects(service.onboard(header,{role,id:'another'}),{status:400})
  }
  await assert.rejects(service.me(await token({sub:'unknown'})),{status:404})
  await assert.rejects(service.onboard(await token(),{role:'admin'}),{status:400})
  assert.equal(rows.size,4)
})
