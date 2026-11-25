import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createProfilesService} from './accountProfiles.js'
import {AuthError} from './identityAccounts.js'
function fixture(){
 const accounts={a:{id:'a',role:'Cliente'},b:{id:'b',role:'Empresa'}}
 const profiles=new Map(),active=new Map()
 let released=0,connected=0
 const db={async connect(){connected++;return {release(){released++},async query(sql,args=[]){
  const [id,role]=args
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]}
  if(sql.startsWith('SELECT id,role FROM matchter.accounts '))return {rows:accounts[role]?[accounts[role]]:[]}
  if(sql.startsWith('INSERT INTO matchter.account_profiles')){const key=id+':'+role;if(!profiles.has(key))profiles.set(key,{id:key,role,account:id});return {rows:[]}}
  if(sql.startsWith('INSERT INTO matchter.account_active_profiles')){if(!active.has(id))active.set(id,role);return {rows:[]}}
  if(sql.startsWith('SELECT id FROM matchter.account_profiles'))return {rows:profiles.has(id+':'+role)?[{id:id+':'+role}]:[]}
  if(sql.startsWith('UPDATE matchter.account_active_profiles')){active.set(id,role);return {rows:[]}}
  if(sql.startsWith('SELECT id,role FROM matchter.account_profiles'))return {rows:[...profiles.values()].filter(p=>p.account===id).map(({id,role})=>({id,role}))}
  if(sql.startsWith('SELECT role FROM matchter.account_active_profiles'))return {rows:active.has(id)?[{role:active.get(id)}]:[]}
  throw Error('Unexpected SQL')
 }}}}
 const service=createProfilesService({db,verifyIdentity:async header=>{if(!['a','b'].includes(header))throw new AuthError(401,'No autenticado');return {issuer:'trusted',subject:header}}})
 return {service,counts:()=>({connected,released})}
}
test('all four modes are available immediately, switches persist without duplicate profiles or changing identity',async()=>{
 const {service,counts}=fixture()
 const first=await service.list('a')
 assert.equal(first.activeRole,'Cliente');assert.equal(first.profiles.length,4)
 const switched=await service.switch('a',{role:'Maestro o contratista'})
 assert.equal(switched.activeRole,'Maestro o contratista');assert.equal(switched.profiles.length,4)
 assert.deepEqual(switched.profiles,first.profiles)
 assert.equal((await service.switch('a',{role:'Empresa'})).activeRole,'Empresa')
 assert.equal((await service.switch('a',{role:'Profesional'})).activeRole,'Profesional')
 assert.equal((await service.switch('a',{role:'Cliente'})).activeRole,'Cliente')
 assert.equal((await service.list('a')).profiles.length,4)
 assert.equal(service.add,undefined)
 assert.deepEqual(counts(),{connected:6,released:6})
})
test('switches stay scoped to signed identity and reject injected permissions',async()=>{
 const {service,counts}=fixture()
 const b=await service.switch('b',{role:'Profesional'})
 const a=await service.switch('a',{role:'Profesional'})
 assert.ok(a.profiles.every(p=>!b.profiles.some(q=>q.id===p.id)))
 await assert.rejects(service.switch('a',{role:'Empresa',account_id:'b'}),e=>e.status===400)
 await assert.rejects(service.switch('a',{role:'admin'}),e=>e.status===400)
 await assert.rejects(service.list('forged'),e=>e.status===401)
 assert.equal((await service.switch('a',{role:'Cliente'})).activeRole,'Cliente')
 assert.equal((await service.list('b')).activeRole,'Profesional')
 assert.equal(counts().connected,counts().released)
})
