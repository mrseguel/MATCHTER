// Use only the historical contract row resolved by the authorized case service.
// Never reconstruct accepted clauses from the current template.
export function signedDisputeReminder(claim,contract){
 const unavailable={available:false,message:'No se pudo verificar la cláusula de controversias del contrato asociado. Consulta el documento original.'}
 if(!contract||contract.agreementVersion!==claim?.agreementVersion||contract.revision!==claim?.contractRevision||contract.digest!==claim?.digest||!contract.clientSignedAt||!contract.providerSignedAt)return unavailable
 const clauses=contract.terms?.clauses
 if(!Array.isArray(clauses))return unavailable
 const matching=clauses.filter(c=>Array.isArray(c)&&typeof c[0]==='string'&&/^OCTAVO\.\s*Solución de controversias/i.test(c[0])&&typeof c[1]==='string'&&c[1].trim())
 if(matching.length!==1)return unavailable
 const [title,text]=matching[0]
 return {available:true,title,text,agreementVersion:contract.agreementVersion,contractRevision:contract.revision,clientSignedAt:contract.clientSignedAt,providerSignedAt:contract.providerSignedAt,mode:contract.terms.paymentMode??'legacy_demo',demo:true}
}
