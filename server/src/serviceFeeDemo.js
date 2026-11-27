import {AuthError} from './identityAccounts.js'
export const SERVICE_FEE_VERSION=2
export function quoteServiceFee(role,stages){
 const total=stages.reduce((n,s)=>n+Number(s[2]),0)
 if(!Number.isSafeInteger(total)||total<=0)throw new AuthError(400,'Monto contractual no válido')
 const amount=role==='Maestro o contratista'?2990:role==='Profesional'?4990:role==='Empresa'?(total<=50000000?9990:total<=100000000?19990:39990):null
 if(amount===null)throw new AuthError(409,'Tipo de cuenta contratada no disponible')
 return {version:SERVICE_FEE_VERSION,payer:'both',role,amount,contractTotal:total,combinedTotal:total+amount,providerNet:total-amount,platformTotal:amount*2,deferAvailable:stages.some(s=>Number(s[2])>=amount),currency:'CLP',demo:true}
}
export const bilateral=c=>c?.terms?.serviceFee?.version===2
export const needsFeeUpgrade=c=>!!c&&!c.clientSignedAt&&!c.providerSignedAt&&!bilateral(c)
export const serviceFeeReady=c=>c?.terms?.paymentMode==='direct'?!!(bilateral(c)&&c.serviceFeePaidAt&&c.providerFeeMode==='upfront'&&c.providerFeePaidAt):!c?.terms?.serviceFee||!!c.serviceFeePaidAt&&(!bilateral(c)||c.providerFeeMode==='deferred'||c.providerFeeMode==='upfront'&&!!c.providerFeePaidAt)
export function deferredDeduction(c,stage){
 return c?.terms?.paymentMode!=='direct'&&bilateral(c)&&c.providerFeeMode==='deferred'&&!c.providerFeePaidAt&&Number(stage.amount)>=c.terms.serviceFee.amount?c.terms.serviceFee.amount:0
}
