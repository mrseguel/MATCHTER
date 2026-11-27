// Approved product proposal, not an operative custody or legal authorization.
export const PROTECTED_DISPUTE_POLICY=Object.freeze({
 version:1,mode:'protected',status:'draft_pending_legal_financial_review',
 phases:Object.freeze([
  Object.freeze({key:'mediation',days:5}),
  Object.freeze({key:'expert_selection',days:5}),
  Object.freeze({key:'inspection_report',days:10}),
  Object.freeze({key:'observations',days:5}),
  Object.freeze({key:'resolution_or_referral',days:5})
 ]),
 ordinaryBusinessDays:30,expertFeeAdvance:'claimant_subject_to_validated_exceptions',
 silenceIsConsent:false,automaticRelease:false,automaticDeduction:false
})
const date=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Invalid calendar date')
 const d=new Date(s+'T00:00:00Z')
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Invalid calendar date')
 return d
}
// Input is an explicitly supplied Chilean local calendar, including applicable holidays.
// Count from the day after receipt; dates are planning estimates, not statutory deadlines.
export function protectedDisputeSchedule(receivedOn,{holidays=[],calendarVerified=false}={}){
 const start=date(receivedOn),excluded=new Set(holidays.map(x=>date(x).toISOString().slice(0,10)))
 let cursor=start,elapsed=0
 const phases=PROTECTED_DISPUTE_POLICY.phases.map(p=>{
  for(let n=0;n<p.days;){
   cursor=new Date(cursor.getTime()+86400000)
   if(cursor.getUTCDay()!==0&&cursor.getUTCDay()!==6&&!excluded.has(cursor.toISOString().slice(0,10)))n++
  }
  elapsed+=p.days
  return {...p,cumulativeBusinessDays:elapsed,dueOn:cursor.toISOString().slice(0,10)}
 })
 return {policyVersion:1,receivedOn,calendarVerified:calendarVerified===true,planningOnly:true,phases,ordinaryDueOn:phases.at(-1).dueOn}
}
export function protectedDisputeCheckpoint({today,schedule,settlementConfirmed=false}){
 if(schedule?.policyVersion!==1||schedule.planningOnly!==true)throw Error('Invalid draft schedule')
 date(today);date(schedule.ordinaryDueOn)
 const overdue=today>schedule.ordinaryDueOn
 return {overdue,action:settlementConfirmed===true?'record_confirmed_resolution':overdue?'review_and_refer_to_authorized_external_process':'continue_review',moneyInstruction:null}
}
