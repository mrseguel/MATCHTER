import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createProfileDetailsService,validateDetails} from './profileDetails.js'
import {AuthError} from './identityAccounts.js'
test('validates fields by role and limits; never accepts identity or verification fields',()=>{
 assert.equal(validateDetails('Maestro o contratista',{city:'Temuco',workMode:'Contratista'}).workMode,'Contratista')
 for(const [role,body] of [['Cliente',{specialty:'Arquitectura'}],['Profesional',{workMode:'Contratista'}],['Cliente',{businessName:'Empresa'}],['Empresa',{verified:true}],['Cliente',{city:'Santiago'}],['Cliente',{bio:'x'.repeat(601)}]])assert.throws(()=>validateDetails(role,body),e=>e.status===400)
})
test('details are isolated by verified identity and mode; changing modes preserves data',async()=>{
 const details=new Map()
 const db={async query(sql,p){
  if(sql.startsWith('SELECT p.id'))return {rows:p[1]==='a'||p[1]==='b'?[{id:p[1]+':'+p[2]}]:[]}
  if(sql.startsWith('SELECT city'))return {rows:details.has(p[0])?[details.get(p[0])]:[]}
  if(sql.startsWith('INSERT INTO')){const [id,city,specialty,bio,workMode,businessName]=p;const d={city,specialty,bio,workMode,businessName};details.set(id,d);return {rows:[d]}}
  throw Error('Unexpected SQL')
 }}
 const s=createProfileDetailsService({db,verifyIdentity:async h=>{if(!['a','b'].includes(h))throw new AuthError(401,'No autenticado');return {issuer:'trusted',subject:h}}})
 await s.save('a',{role:'Maestro o contratista',details:{city:'Temuco',specialty:'Carpintería',workMode:'Con equipo'}})
 await s.save('a',{role:'Profesional',details:{city:'Labranza',specialty:'Arquitectura'}})
 assert.equal((await s.get('a','Maestro o contratista')).details.specialty,'Carpintería')
 assert.equal((await s.get('a','Profesional')).details.specialty,'Arquitectura')
 assert.equal((await s.get('b','Maestro o contratista')).details.specialty,'')
 await assert.rejects(s.save('a',{role:'Cliente',details:{},profileId:'b'}),e=>e.status===400)
 await assert.rejects(s.get('forged','Cliente'),e=>e.status===401)
})
