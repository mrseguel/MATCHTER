import test from 'node:test'
import assert from 'node:assert/strict'
import {identity,pairKey,toggleMember,mayHire,sendSocialMessage,decideSocialMessage,servicePrompt} from './model.js'
test('likes toggle independently of contracting',()=>{assert.deepEqual(toggleMember([],1),['1']);assert.deepEqual(toggleMember(['1'],1),[])})
test('only clients can request service from active providers',()=>{const p=[{id:1},{id:2,sus:true}];assert.ok(mayHire('Cliente','c',1,p));assert.ok(!mayHire('Cliente','c',2,p));assert.ok(!mayHire('Empresa',2,1,p));assert.ok(!mayHire('Cliente','c','c',p))})
test('social chat requires acceptance and cannot create a contract',()=>{let s=sendSocialMessage({},'c',1,'Hola','m1');const k=pairKey(1,'c');assert.equal(s[k].status,'pending');assert.equal(sendSocialMessage(s,1,'c','Hola','m2'),s);assert.equal(decideSocialMessage(s,k,'c','accepted'),s);s=decideSocialMessage(s,k,1,'accepted');s=sendSocialMessage(s,1,'c','Hola','m2');assert.equal(s[k].messages.length,2);assert.equal(s[k].matchId,undefined)})
test('rejected requests cannot be reopened by sending more messages',()=>{let s=sendSocialMessage({},'a','b','Hola','m1');s=decideSocialMessage(s,pairKey('a','b'),'b','rejected');assert.equal(sendSocialMessage(s,'a','b','Otra vez','m2'),s)})

test('service shortcuts draft a message without sending or creating a match',()=>{assert.match(servicePrompt('quote'),/presupuesto/);assert.match(servicePrompt('project'),/proyecto/);assert.equal(servicePrompt('unknown'),'');assert.deepEqual(sendSocialMessage({},'c',1,'','m'),{})})
