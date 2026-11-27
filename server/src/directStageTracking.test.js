import test from 'node:test'
import assert from 'node:assert/strict'
import {directStageState,nextDirectStageEvent} from './directStageTracking.js'
const agreement={data:{stages:[['Uno','2027-01-01',40000,25],['Dos','2027-01-02',60000,75]]}}
const now=new Date('2026-11-26T23:00:00Z')
const make=(events,action,side,stageNo=1,progressPercent)=>nextDirectStageEvent({agreement,events,action,side,stageNo,progressPercent,now})
test('direct tracking retains contractual values and dates without financial fields',()=>{
 const s=directStageState(agreement)
 assert.deepEqual(s.stages.map(t=>[t.amount,t.physicalPercent,t.date]),[[40000,25,'2027-01-01'],[60000,75,'2027-01-02']])
 assert.equal(s.financialCustody,false)
 assert.ok(s.stages.every(t=>!('fundedAt' in t)&&!('releasedAt' in t)))
})
test('two physical stages can complete in order without deposits or releases',()=>{
 const events=[]
 for(const i of [1,2]){
  events.push(make(events,'start','provider',i))
  events.push(make(events,'progress','provider',i,45))
  assert.equal(directStageState(agreement,events).stages[i-1].progressPercent,45)
  events.push(make(events,'deliver','provider',i))
  assert.equal(directStageState(agreement,events).stages[i-1].progressPercent,100)
  events.push(make(events,'accept','client',i))
 }
 const s=directStageState(agreement,events)
 assert.equal(s.complete,true);assert.equal(s.currentStage,null)
 assert.ok(s.stages.every(t=>t.acceptedAt===now.toISOString()))
})
test('roles, prerequisites, ordering and financial action rejection',()=>{
 const events=[]
 assert.throws(()=>make(events,'start','client'),{status:403})
 assert.throws(()=>make(events,'start','provider',2),{status:409})
 assert.throws(()=>make(events,'deliver','provider'),{status:409})
 assert.throws(()=>make(events,'fund','client'),{status:400})
 events.push(make(events,'start','provider'))
 assert.throws(()=>make(events,'accept','client'),{status:409})
 assert.throws(()=>make(events,'progress','provider',1,101),{status:400})
 assert.throws(()=>make(events,'progress','client',1,25),{status:403})
 events.push(make(events,'progress','provider',1,50))
 assert.throws(()=>make(events,'progress','provider',1,40),{status:409})
 events.push(make(events,'deliver','provider'))
 assert.throws(()=>make(events,'accept','provider'),{status:403})
 assert.throws(()=>make(events,'progress','provider',1,60),{status:409})
 assert.throws(()=>make(events,'release','client'),{status:400})
})
test('idempotent retries do not produce duplicate milestone events',()=>{
 const events=[]
 events.push(make(events,'start','provider'))
 assert.equal(make(events,'start','provider'),null)
 events.push(make(events,'progress','provider',1,30))
 assert.equal(make(events,'progress','provider',1,30),null)
 events.push(make(events,'deliver','provider'))
 assert.equal(make(events,'deliver','provider'),null)
 events.push(make(events,'accept','client'))
 assert.equal(make(events,'accept','client'),null)
 assert.equal(directStageState(agreement,events).currentStage,2)
})
