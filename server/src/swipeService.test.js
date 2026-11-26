import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createSwipeService,validateInvitation,validateCard} from './swipeService.js'
import {AuthError} from './identityAccounts.js'
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',r='44444444-4444-4444-8444-444444444444'
const details={projectTitle:'Radier',description:'Construir radier de 20 m²',location:'Temuco',budget:100000}
test('normalized invitation deduplication, no injected identities, validated budget',()=>{
 assert.equal(validateInvitation(details).dedupe,validateInvitation({...details,projectTitle:'  RÁDIER  '}).dedupe)
 assert.throws(()=>validateInvitation({...details,senderId:a}),e=>e.status===400)
 assert.throws(()=>validateInvitation({...details,budget:-1}),e=>e.status===400)
 assert.throws(()=>validateInvitation({...details,description:''}),e=>e.status===400)
})
test('publication is explicit and restricted to providers',()=>{
 const card={displayName:'Prueba',city:'Temuco',specialty:'Carpintería',workMode:'Con equipo'}
 assert.equal(validateCard('Maestro o contratista',card).workMode,'Con equipo')
 assert.throws(()=>validateCard('Cliente',card),e=>e.status===403)
 assert.throws(()=>validateCard('Profesional',{...card,workMode:'Con equipo'}),e=>e.status===400)
 assert.throws(()=>validateCard('Empresa',{...card,workMode:'',email:'private@example.test'}),e=>e.status===400)
})
test('signed active identity scopes discovery, favorites and response; match only on acceptance',async()=>{
 const actors={client:{id:a,accountId:'A',role:'Cliente'},provider:{id:b,accountId:'B',role:'Profesional'},other:{id:c,accountId:'C',role:'Profesional'}}
 let pending=true;const calls=[]
 const db={query:async(sql,p)=>{calls.push({sql,p})
  if(sql.startsWith('SELECT p.id,p.account_id'))return {rows:[actors[p[1]]].filter(Boolean)}
  if(sql.startsWith('SELECT p.id FROM matchter.swipe_cards'))return {rows:p[0]===b&&p[1]==='A'?[{id:b}]:[]}
  if(sql.startsWith('INSERT INTO matchter.swipe_favorites'))return {rows:[]}
  if(sql.startsWith('INSERT INTO matchter.swipe_requests'))return {rows:[{id:r,status:'pending'}]}
  if(sql.startsWith('UPDATE matchter.swipe_requests')){if(p[0]===r&&p[1]===b&&pending){pending=false;return {rows:[{id:r,status:p[2]}]}}return {rows:[]}}
  throw Error('Unexpected query')
 }}
 const s=createSwipeService({db,verifyIdentity:async h=>{if(!actors[h])throw new AuthError(401,'No autenticado');return {issuer:'test',subject:h}}})
 await assert.rejects(s.invite('client',{role:'Profesional',targetId:b,details}),e=>e.status===409)
 await assert.rejects(s.invite('client',{role:'Cliente',targetId:a,details}),e=>e.status===404)
 await assert.rejects(s.favorite('provider',{role:'Profesional',targetId:a,saved:true}),e=>e.status===403)
 await s.favorite('client',{role:'Cliente',targetId:b,saved:true})
 assert.equal(calls.at(-1).p[0],a)
 assert.equal((await s.invite('client',{role:'Cliente',targetId:b,details})).request.status,'pending')
 await assert.rejects(s.respond('other',{role:'Profesional',requestId:r,decision:'accepted'}),e=>e.status===409)
 await assert.rejects(s.respond('client',{role:'Cliente',requestId:r,decision:'accepted'}),e=>e.status===409)
 assert.equal((await s.respond('provider',{role:'Profesional',requestId:r,decision:'accepted'})).match.id,r)
 await assert.rejects(s.respond('provider',{role:'Profesional',requestId:r,decision:'rejected'}),e=>e.status===409)
 await assert.rejects(s.requests('forged','Cliente'),e=>e.status===401)
})
