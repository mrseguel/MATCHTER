export const plans=Object.freeze({monthly:Object.freeze({name:'Mensual',amount:2990,months:1,label:'mes'}),annual:Object.freeze({name:'Anual',amount:10000,months:12,label:'año'})});
export const activeVerification=(subscription,now=Date.now())=>!!subscription&&Number.isFinite(Date.parse(subscription.expiresAt))&&Date.parse(subscription.expiresAt)>now&&subscription.identityDemo===true&&subscription.paidDemo===true;
export function subscribeVerification({actorId,planId,identity,method,card,accepted,now,previous}){
 const plan=plans[planId],at=new Date(now);
 if(actorId==null||!plan||!identity?.front||!identity?.back||!identity?.accepted||!accepted||!Number.isFinite(+at)||!['wallet','direct'].includes(method)||method==='wallet'&&!card?.l)throw Error('Completa la identidad de prueba, el plan y el pago.');
 if(activeVerification(previous,+at))throw Error('Tu verificación de prueba ya está vigente.');
 const end=new Date(at),day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+plan.months);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));
 return {id:'verification-'+String(actorId)+'-'+at.toISOString(),actorId:String(actorId),planId,amount:plan.amount,paidAt:at.toISOString(),expiresAt:end.toISOString(),method,last4:method==='wallet'?String(card.l).slice(-4):null,identityDemo:true,paidDemo:true,autoRenew:false};
}
