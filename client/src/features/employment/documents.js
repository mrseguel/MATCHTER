const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
export const documentTypes=[['identity','Cédula de identidad (ambos lados)'],['background','Certificado de antecedentes']];
export function requestDocuments(state,person,role,applicationId,types){
 const a=state.applications.find(x=>x.id===applicationId);
 if(role!=='Empresa'||!a||!same(a.companyId,person?.id)||a.status!=='Preseleccionada')throw Error('Preselecciona al postulante antes de solicitar documentos.');
 if(!Array.isArray(types)||!types.length||types.some(t=>!documentTypes.some(([k])=>k===t)))throw Error('Selecciona documentos válidos.');
 return {...state,applications:state.applications.map(x=>x.id===applicationId?{...x,documents:{...x.documents,...Object.fromEntries(types.filter(k=>!x.documents?.[k]).map(k=>[k,{status:'Solicitado'}]))}}:x)};
}
export function shareSampleDocument(state,person,role,applicationId,type,consent){
 const a=state.applications.find(x=>x.id===applicationId);
 if(!['Maestro o contratista','Profesional'].includes(role)||!a||!same(a.workerId,person?.id)||a.status!=='Preseleccionada'||a.documents?.[type]?.status!=='Solicitado')throw Error('El documento debe haber sido solicitado por la empresa.');
 if(!consent)throw Error('Debes autorizar el envío de este documento.');
 return {...state,applications:state.applications.map(x=>x.id===applicationId?{...x,documents:{...x.documents,[type]:{status:'Adjuntado (demo)',sample:true,filename:type==='identity'?'cedula-ficticia-anverso-y-reverso.pdf':'certificado-ficticio.pdf'}}}:x)};
}
