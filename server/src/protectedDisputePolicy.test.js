import test from 'node:test'
import assert from 'node:assert/strict'
import {PROTECTED_DISPUTE_POLICY,protectedDisputeSchedule,protectedDisputeCheckpoint} from './protectedDisputePolicy.js'
test('five phases total thirty business days, starting after receipt',()=>{
 const s=protectedDisputeSchedule('2026-11-27')
 assert.deepEqual(s.phases.map(p=>p.cumulativeBusinessDays),[5,10,20,25,30])
 assert.deepEqual(s.phases.map(p=>p.dueOn),['2026-12-04','2026-12-11','2026-12-25','2027-01-01','2027-01-08'])
 assert.equal(s.planningOnly,true)
 assert.equal(s.calendarVerified,false)
})
test('explicit holiday dates are excluded without treating weekends as double holidays',()=>{
 const s=protectedDisputeSchedule('2026-11-27',{holidays:['2026-12-08','2026-12-25','2027-01-01','2026-12-05'],calendarVerified:true})
 assert.equal(s.ordinaryDueOn,'2027-01-13')
 assert.equal(s.calendarVerified,true)
})
test('invalid dates are rejected',()=>{
 for(const d of ['2026-02-30','2026-13-01','bad'])assert.throws(()=>protectedDisputeSchedule(d))
 assert.throws(()=>protectedDisputeSchedule('2026-11-27',{holidays:['invalid']}))
})
test('deadline never triggers a payment or presumed consent',()=>{
 const s=protectedDisputeSchedule('2026-11-27')
 assert.deepEqual(protectedDisputeCheckpoint({today:s.ordinaryDueOn,schedule:s}),{overdue:false,action:'continue_review',moneyInstruction:null})
 assert.deepEqual(protectedDisputeCheckpoint({today:'2027-01-09',schedule:s}),{overdue:true,action:'review_and_refer_to_authorized_external_process',moneyInstruction:null})
 assert.equal(protectedDisputeCheckpoint({today:'2027-01-09',schedule:s,settlementConfirmed:true}).moneyInstruction,null)
 assert.equal(PROTECTED_DISPUTE_POLICY.silenceIsConsent,false)
 assert.equal(PROTECTED_DISPUTE_POLICY.automaticRelease,false)
 assert.equal(PROTECTED_DISPUTE_POLICY.automaticDeduction,false)
})
