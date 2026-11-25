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
test('initial profile remains, add is idempotent, switching persists without changing identity',async()=>{
 const {service,counts}=fixture()
 assert.equal((await service.list('a')).activeRole,'Cliente')
 const created=await service.add('a',{role:'Maestro o contratista'})
 assert.equal(created.activeRole,'Maestro o contratista');assert.equal(created.profiles.length,2)
 assert.equal((await service.add('a',{role:'Maestro o contratista'})).profiles.length,2)
 assert.equal((await service.switch('a',{role:'Cliente'})).activeRole,'Cliente')
 assert.equal((await service.list('a')).profiles.length,2)
 assert.deepEqual(counts(),{connected:5,released:5})
})
test('profiles are scoped to signed identity; reject missing profiles and injected permissions',async()=>{
 const {service,counts}=fixture()
 await service.add('b',{role:'Profesional'})
 await assert.rejects(service.switch('a',{role:'Profesional'}),e=>e.status===404)
 await assert.rejects(service.add('a',{role:'Empresa',account_id:'b'}),e=>e.status===400)
 await assert.rejects(service.add('a',{role:'admin'}),e=>e.status===400)
 await assert.rejects(service.list('forged'),e=>e.status===401)
 assert.deepEqual((await service.list('a')).profiles.map(x=>x.role),['Cliente'])
 assert.equal((await service.list('b')).activeRole,'Profesional')
 assert.equal(counts().connected,counts().released)
})
