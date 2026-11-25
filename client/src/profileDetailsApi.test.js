import {test} from 'node:test'
import assert from 'node:assert/strict'
import {detailsRequest,emptyDetails} from './features/auth/profileDetailsApi.js'
const c={getJWTToken:async()=>'a.b.c'},res=(status,data)=>({ok:status===200,json:async()=>data})
test('profile detail requests bind the role, bearer token and only user-editable data',async()=>{
 const d={...emptyDetails(),city:'Temuco'}
 assert.deepEqual(await detailsRequest(c,'Cliente',undefined,async(url,options)=>{assert.equal(url,'/api/auth-preview/profiles/details?role=Cliente');assert.equal(options.headers.Authorization,'Bearer a.b.c');assert.equal(options.method,'GET');return res(200,{role:'Cliente',details:d})}),d)
 assert.deepEqual(await detailsRequest(c,'Profesional',d,async(url,options)=>{assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{role:'Profesional',details:d});return res(200,{role:'Profesional',details:d})}),d)
 await assert.rejects(detailsRequest(c,'Cliente',undefined,async()=>res(200,{role:'Empresa',details:d})),/no válida/)
 await assert.rejects(detailsRequest(c,'admin',undefined,async()=>{throw Error('not called')}),/no válido/)
})
