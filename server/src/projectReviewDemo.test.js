import test from 'node:test'
import assert from 'node:assert/strict'
import {readReviewDemo,changeReviewDemo,validateReview,reviewView,REVIEW_WINDOW_MS} from './projectReviewDemo.js'
const client={id:'c',role:'Cliente'},provider={id:'p',role:'Empresa'},other={id:'o',role:'Cliente'}
const agreement={version:2,data:{stages:[['Uno','2026-12-01',100,50],['Dos','2026-12-02',100,50]]},clientConfirmedAt:'now',providerConfirmedAt:'now'}
const contract={revision:1,digest:'a'.repeat(64),mode:'simple',clientSignedAt:'now',providerSignedAt:'now'}
const payload={agreementVersion:2,contractRevision:1,digest:contract.digest,score:5,comment:' Buen trabajo '}
function fake(){
 const db={released:1,review:null,query:async(sql,p=[])=>{
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]}
  if(sql.startsWith('SELECT id,sender_profile_id'))return {rows:p[0]==='m'&&['c','p'].includes(p[1])?[{senderId:'c',recipientId:'p'}]:[]}
  if(sql.startsWith('SELECT version,data'))return {rows:[agreement]}
  if(sql.startsWith('SELECT revision,agreement_version'))return {rows:[contract]}
  if(sql.startsWith('SELECT stage_no'))return {rows:[1,2].map(stageNo=>({stageNo,releasedAt:stageNo<=db.released?'now':null}))}
  if(sql.startsWith('SELECT COALESCE(e.score'))return {rows:db.review?[db.review]:[]}
  if(sql.startsWith('INSERT INTO matchter.project_review_demos')){const now=new Date().toISOString();db.review={score:p[3],comment:p[4],createdAt:now,updatedAt:now,revision:1};return {rows:[db.review]}}
  if(sql.startsWith('INSERT INTO matchter.project_review_demo_revisions')){const edit={revision:p[3],score:p[4],comment:p[5],updatedAt:new Date().toISOString()};db.review={...db.review,...edit};return {rows:[edit]}}
  throw Error(sql)
 },connect:async()=>({...db,release(){}})}
 return db
}
test('review requires completed contract, customer role, exact revision and immutable initial record and revision window',async()=>{
 const db=fake()
 await assert.rejects(changeReviewDemo(db,client,'m',payload),{status:409})
 db.released=2
 await assert.rejects(readReviewDemo(db,other,'m'),{status:404})
 await assert.rejects(changeReviewDemo(db,provider,'m',payload),{status:403})
 await assert.rejects(changeReviewDemo(db,client,'m',{...payload,digest:'b'.repeat(64)}),{status:409})
 assert.equal((await readReviewDemo(db,client,'m')).review,null)
 const r=await changeReviewDemo(db,client,'m',payload)
 assert.equal(r.review.comment,'Buen trabajo')
 assert.deepEqual(await changeReviewDemo(db,client,'m',payload),r)
 await assert.rejects(changeReviewDemo(db,client,'m',{...payload,score:4}),{status:409})
 const changed=await changeReviewDemo(db,client,'m',{...payload,score:4,expectedRevision:1})
 assert.equal(changed.review.revision,2)
 assert.equal(changed.review.createdAt,r.review.createdAt)
 assert.equal(changed.review.expiresAt,r.review.expiresAt)
 assert.equal(changed.review.score,4)
 await assert.rejects(changeReviewDemo(db,client,'m',{...payload,score:3,expectedRevision:1}),{status:409})
 const read=await readReviewDemo(db,provider,'m');assert.equal(read.review.score,4);assert.equal(read.review.editable,false)
 db.review.createdAt=new Date(Date.now()-REVIEW_WINDOW_MS).toISOString()
 await assert.rejects(changeReviewDemo(db,client,'m',{...payload,score:3,expectedRevision:2}),{status:409})
})
test('review rejects invalid stars, oversized comments and spoofed actors',()=>{
 for(const b of [{...payload,score:0},{...payload,score:1.5},{...payload,comment:'x'.repeat(1501)},{...payload,actorId:'c'}])assert.throws(()=>validateReview(b),{status:400})
})

test('fixed seven-day deadline never extends when edited and is exact to the millisecond',()=>{const t=Date.UTC(2026,10,26,12);const r={createdAt:new Date(t).toISOString(),updatedAt:new Date(t+60000).toISOString(),revision:2,score:4};assert.equal(reviewView(r,'client',t+REVIEW_WINDOW_MS-1).editable,true);assert.equal(reviewView(r,'client',t+REVIEW_WINDOW_MS).editable,false);assert.equal(reviewView(r,'provider',t).editable,false)})
