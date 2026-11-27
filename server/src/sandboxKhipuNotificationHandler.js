import {SandboxNotificationError} from './sandboxWebhookVerification.js'
// Internal QA ingress coordinator. Expose only on a dedicated, HTTPS, isolated receiver.
// Never trust the claimed payment state; inbox processing calls the authenticated provider GET.
export function createKhipuNotificationHandler({mode,inbox}={}){
 if(mode!=='isolated_test'||typeof inbox?.acceptKhipu!=='function'||typeof inbox?.processOne!=='function'||typeof inbox?.status!=='function')throw Error('Isolated Khipu handler required')
 return async function handle({rawBody,signature}={}){
  try{
   const accepted=await inbox.acceptKhipu({rawBody,signature})
   if(accepted.accepted!==true||!(/^[a-f0-9]{64}$/.test(accepted.eventKey||'')))throw Error('Not persisted')
   let state=await inbox.status(accepted.eventKey)
   if(state!=='processed'&&state!=='review'){
    await inbox.processOne({eventKey:accepted.eventKey})
    state=await inbox.status(accepted.eventKey)
   }
   // Nonterminal state deliberately asks Khipu to retry. A durable lease and
   // bounded retry delay prevent concurrent notifications from duplicating work.
   if(state!=='processed'&&state!=='review')return {status:503,body:{accepted:true,pending:true}}
   return {status:200,body:{accepted:true}}
  }catch(e){
   if(e instanceof SandboxNotificationError)return {status:400,body:{accepted:false}}
   return {status:503,body:{accepted:false}}
  }
 }
}
