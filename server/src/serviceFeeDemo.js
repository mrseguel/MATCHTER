import {AuthError} from './identityAccounts.js'
export const SERVICE_FEE_VERSION=1
export function quoteServiceFee(role,stages){
 const total=stages.reduce((n,s)=>n+Number(s[2]),0)
 if(!Number.isSafeInteger(total)||total<=0)throw new AuthError(400,'Monto contractual no válido')
 const amount=role==='Maestro o contratista'?2990:role==='Profesional'?4990:role==='Empresa'?(total<=50000000?9990:total<=100000000?19990:39990):null
 if(amount===null)throw new AuthError(409,'Tipo de cuenta contratada no disponible')
 return {version:SERVICE_FEE_VERSION,payer:'client',role,amount,contractTotal:total,combinedTotal:total+amount,currency:'CLP',demo:true}
}
export const serviceFeeReady=c=>!c?.terms?.serviceFee||!!c.serviceFeePaidAt
