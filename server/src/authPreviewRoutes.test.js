import {test} from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {request} from 'node:http'
function fetch(url,options={}){return new Promise((resolve,reject)=>{const req=request(url,{method:options.method||'GET',headers:options.headers||{}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode}))});req.on('error',reject);req.end(options.body)})}
import {createAuthRouter} from './authPreviewRoutes.js'
test('authentication preview routes are isolated, reject missing tokens and enforce POST origin',async()=>{
  const app=express();app.use(express.json());let calls=0
  app.use('/api/auth-preview',createAuthRouter({MATCHTER_AUTH_TEST_ORIGIN:'https://auth.example.test',MATCHTER_NEON_AUTH_URL:'https://test.neon.tech/auth'},{service:{async me(){calls++;return {id:'test',role:'Cliente'}},async onboard(){calls++;return {id:'test',role:'Cliente'}}}}))
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
  const base='http://127.0.0.1:'+server.address().port+'/api/auth-preview'
  try{
    assert.equal((await fetch(base+'/config')).status,404)
    const headers={host:'auth.example.test'}
    assert.equal((await fetch(base+'/config',{headers})).status,200)
    assert.equal((await fetch(base+'/me',{headers})).status,401)
    const authorization='Bearer '+ 'a'.repeat(30)
    assert.equal((await fetch(base+'/onboard',{method:'POST',headers:{...headers,authorization,origin:'https://wrong.example.test','content-type':'application/json'},body:'{}'})).status,403)
    assert.equal(calls,0)
    assert.equal((await fetch(base+'/me',{headers:{...headers,authorization}})).status,200)
    assert.equal(calls,1)
  }finally{await new Promise(resolve=>server.close(resolve))}
})
