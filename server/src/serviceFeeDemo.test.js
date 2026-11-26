import test from 'node:test'
import assert from 'node:assert/strict'
import {quoteServiceFee,serviceFeeReady} from './serviceFeeDemo.js'
const quote=(r,n)=>quoteServiceFee(r,[['Trabajo','2027-01-01',n]])
test('fixed tariffs by actual role and inclusive company boundaries',()=>{
 for(const n of [10000,1000000,100000001]){
  assert.equal(quote('Maestro o contratista',n).amount,2990)
  assert.equal(quote('Profesional',n).amount,4990)
 }
 for(const [n,fee] of [[1,9990],[50000000,9990],[50000001,19990],[100000000,19990],[100000001,39990]])assert.equal(quote('Empresa',n).amount,fee)
 const q=quoteServiceFee('Maestro o contratista',[['A','2027-01-01',2500000],['B','2027-01-02',2500000]])
 assert.equal(q.contractTotal,5000000);assert.equal(q.combinedTotal,5002990);assert.equal(q.payer,'client')
 assert.throws(()=>quote('Cliente',100000),{status:409})
 assert.throws(()=>quote('Empresa',0),{status:400})
 assert.equal(serviceFeeReady({terms:{serviceFee:q}}),false)
 assert.equal(serviceFeeReady({terms:{serviceFee:q},serviceFeePaidAt:'now'}),true)
})
