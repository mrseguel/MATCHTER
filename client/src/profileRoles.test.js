import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ACCOUNT_TYPES,ROLE_BY_LABEL,displayRole,workCategoryMatches,WORK_PROFILE_CATEGORIES} from './profileRoles.js'
import {roles} from './features/auth/testAccounts.js'
import {TYPES} from './data.js'
test('all registration entry points use the same four role categories',()=>{
 assert.equal(TYPES,ACCOUNT_TYPES);assert.deepEqual(roles,ACCOUNT_TYPES.map(t=>t[1]))
 assert.deepEqual(ACCOUNT_TYPES.map(t=>displayRole(ROLE_BY_LABEL[t[1]])),['Cliente','Maestros y contratistas','Profesionales','Empresa'])
})
test('WORKS categories distinguish execution and technical profiles',()=>{
 assert.deepEqual(WORK_PROFILE_CATEGORIES,['Maestros y contratistas','Profesionales','Ambos'])
 for(const [role,category] of [['Maestro o contratista','Maestros y contratistas'],['Profesional','Profesionales']]){assert.equal(workCategoryMatches(role,category),true);assert.equal(workCategoryMatches(role,'Ambos'),true)}
 assert.equal(workCategoryMatches('Profesional','Maestros y contratistas'),false)
 assert.equal(workCategoryMatches('Maestro o contratista','Profesionales'),false)
 assert.equal(workCategoryMatches('Empresa','Ambos'),false)
})
