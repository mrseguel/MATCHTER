// Bounded internal worker invocation, safe to use on a short-lived QA runtime.
// No schedule, public route, external credentials, or financial actions.
export function createSandboxNotificationDrain({mode,inbox,clock=Date.now}={}){
 if(mode!=='isolated_test'||typeof inbox?.processOne!=='function'||typeof clock!=='function')throw Error('Isolated notification drain required')
 let running=false
 return Object.freeze({
  async run({maxEvents=5,budgetMs=15000}={}){
   if(!Number.isInteger(maxEvents)||maxEvents<1||maxEvents>10||!Number.isInteger(budgetMs)||budgetMs<1000||budgetMs>30000)throw Error('Invalid drain budget')
   if(running)return {busy:true,processed:0,environment:'sandbox',realPayment:false}
   running=true
   const started=clock(),counts={processed:0,review:0,pending:0,leaseLost:0}
   try{
    for(let n=0;n<maxEvents&&clock()-started<budgetMs;n++){
     const r=await inbox.processOne()
     if(!r.processed){if(r.state==='lease_lost')counts.leaseLost++;break}
     counts.processed++
     if(r.state==='review')counts.review++
     else if(r.state==='pending')counts.pending++
    }
    return {...counts,busy:false,environment:'sandbox',realPayment:false}
   }finally{running=false}
  }
 })
}
