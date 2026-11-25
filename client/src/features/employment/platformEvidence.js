// Preview only. Ratings come from the existing profile, not the CV editor.
// No contract/media is considered confirmed merely because it exists in a portfolio.
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
export function platformEvidence(person,context={}){
 const score=Number(person?.r),count=Number(person?.n);
 const rating=person?.r!=null&&Number.isFinite(score)&&score>=1&&score<=5&&Number.isInteger(count)&&count>0?{score,count,demo:true}:null;
 const works=(context.jobs||[]).filter(j=>same(j.providerId,person?.id)&&j.status==='completed'&&same(j.completionConfirmedByClientId,j.clientId)&&j.shareInCV===true&&!j.demoSeed).map(j=>({
 id:String(j.id),title:String(j.project||'Trabajo realizado'),description:String(j.scope||''),photos:(context.portfolio||[]).filter(m=>m.kind==='image'&&same(m.ownerId,person.id)&&same(m.contractId,j.id)&&same(m.clientApprovedBy,j.clientId)&&m.shareInCV===true&&!m.sample&&!m.local&&typeof m.url==='string'&&/^https:\/\//.test(m.url)).map(m=>({url:m.url,caption:String(m.caption||'Fotografía confirmada')}))
 }));
 return {rating,works,preview:true};
}
