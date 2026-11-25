import {canPay,party} from '../contracts/model.js';
export const agreementReady=j=>!!j&&(!j.agreementRequired||!!j.agreement?.confirmed?.client&&!!j.agreement?.confirmed?.provider);
export const stageCount=j=>j.stages?.length||3;
export const completed=j=>!!j&&j.paid>=stageCount(j)&&!!j.receivedAt;
export const currentStage=j=>j.execution?.[j.paid]||{};
export const stageStatus=(j,i)=>i<j.paid?'Pago liberado':i>j.paid?'Pendiente':j.execution?.[i]?.readyAt?'Pendiente de conformidad':j.execution?.[i]?.fundedAt?'En ejecución · fondos en custodia':'Pendiente de depósito';
const ensure=(v,m)=>{if(!v)throw Error(m)};
export function proposeAgreement(j,actor,data,at){
 const side=party(j,actor);ensure(side&&!j.formal?.mode&&!j.paid,'El acuerdo no se puede modificar después de iniciar la firma.');
 const title=String(data.title||'').trim(),scope=String(data.scope||'').trim(),start=data.start,end=data.end;
 const stages=data.stages.map(s=>[String(s[0]||'').trim(),String(s[1]||''),Number(s[2])]);
 ensure(title.length>=3&&scope.length>=20&&/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&start<=end,'Completa el alcance y las fechas del acuerdo.');
 ensure(stages.length===3&&stages.every(s=>s[0]&&/^\d{4}-\d{2}-\d{2}$/.test(s[1])&&s[1]>=start&&s[1]<=end&&Number.isSafeInteger(s[2])&&s[2]>0)&&stages.every((s,i)=>!i||s[1]>=stages[i-1][1]),'Completa tres hitos, montos positivos y fechas ordenadas dentro del plazo.');
 return {...j,agreementRequired:true,project:title,scope,startDate:start,endDate:end,stages,agreement:{version:(j.agreement?.version||0)+1,proposedBy:side,at,confirmed:{[side]:at}}};
}
export function confirmAgreement(j,actor,at){
 const side=party(j,actor);ensure(side&&j.agreement&&!j.agreement.confirmed[side]&&!j.formal?.mode,'No hay una propuesta pendiente para tu perfil.');
 return {...j,agreement:{...j.agreement,confirmed:{...j.agreement.confirmed,[side]:at}}};
}
function putStage(j,data){return {...j,execution:{...j.execution,[j.paid]:{...currentStage(j),...data}}}}
export function fundStage(j,actor,card,at){
 ensure(party(j,actor)==='client'&&agreementReady(j)&&canPay(j)&&j.paid<stageCount(j)&&!currentStage(j).fundedAt&&card?.l,'Solo el cliente puede depositar una vez por hito con contrato formalizado.');
 return putStage(j,{fundedAt:at,last4:String(card.l).slice(-4)});
}
export function deliverStage(j,actor,at){
 ensure(party(j,actor)==='provider'&&agreementReady(j)&&canPay(j)&&currentStage(j).fundedAt&&!currentStage(j).readyAt&&j.paid<stageCount(j),'Primero debe existir un depósito para este hito.');
 return putStage(j,{readyAt:at});
}
export function releaseStage(j,actor,at,hasClaim=false){
 ensure(party(j,actor)==='client'&&agreementReady(j)&&canPay(j)&&currentStage(j).fundedAt&&currentStage(j).readyAt&&j.paid<stageCount(j)&&!hasClaim,'La liberación requiere entrega del hito, conformidad del cliente y ausencia de un reclamo abierto.');
 const next=putStage(j,{releasedAt:at}),paid=j.paid+1;
 return {...next,paid,receivedAt:paid===stageCount(j)?at:null};
}
export function makeReview(j,actor,score,comment,at,name){
 ensure(party(j,actor)==='client'&&completed(j)&&!j.reviewId&&Number.isInteger(score)&&score>=1&&score<=5,'La calificación corresponde al cliente después de la recepción final y solo puede enviarse una vez.');
 return {id:'review-'+j.id,jobId:j.id,recipientId:String(j.providerId),reviewer:name||'Cliente de prueba',score,date:at.slice(0,10),comment:String(comment||'').trim().slice(0,1500),project:j.project,demo:true,session:true};
}
