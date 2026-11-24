import test from 'node:test'
import assert from 'node:assert/strict'
import {estimate,reference,addOffer} from './model.js'
const d='20 m2 de '+reference.service,p=[{id:6}]
test('fallback works without providers',()=>{const x=estimate(d,'Temuco',[],[]);assert.equal(x.kind,'external');assert.equal(x.total,66833)})
test('exact provider prices win and retain multiple matches',()=>{let e=addOffer([],{id:6},{service:reference.service,unit:'m2',zone:'Temuco',price:4000});e=addOffer(e,{id:7},{service:reference.service,unit:'m2',zone:'Temuco',price:5000});const x=estimate(d,'Temuco',e,[...p,{id:7}]);assert.equal(x.kind,'internal');assert.deepEqual(x.items.map(i=>i.total),[80000,100000]);assert.equal(estimate(d,'Temuco',e,[{id:6,sus:true}]).kind,'external')})
test('no invented price for unknown or incompatible scope',()=>{assert.equal(estimate('construir una casa','Temuco',[],p).kind,'unavailable');assert.equal(estimate(d,'Santiago',[],p).kind,'unavailable');assert.equal(estimate('0 m2 de '+reference.service,'Temuco',[],p).kind,'invalid')})
