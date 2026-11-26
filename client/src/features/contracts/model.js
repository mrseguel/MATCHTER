const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
export const party=(job,id)=>same(job.clientId,id)?'client':same(job.providerId,id)?'provider':null;
export const bothSigned=job=>!!job.formal?.signatures?.client&&!!job.formal?.signatures?.provider;
export const canPay=job=>bothSigned(job)&&(job.formal.mode==='simple'||job.formal.mode==='notary'&&job.formal.notary===true);
export const label=job=>job.formal?.mode==='none'?'Sin contrato escrito':canPay(job)?job.formal.mode==='simple'?'Contrato simple firmado · demo':'Firmas autorizadas · demo':bothSigned(job)?'Autorización pendiente':job.formal?.mode?'Firmas pendientes':'Borrador';
export function choose(job,actor,mode,terms){
 if(!party(job,actor)||!['simple','notary','none'].includes(mode)||job.paid>0||job.formal?.signatures?.client||job.formal?.signatures?.provider)throw Error('No se puede cambiar la modalidad de un contrato ya firmado o pagado.');
 return {...job,formal:{mode,terms,signatures:{},notary:false},signed:false,notarized:false,idOk:false};
}
export function sign(job,actor,signature){
 const side=party(job,actor);
 if(!side||!['simple','notary'].includes(job.formal?.mode)||job.formal.signatures[side]||!signature?.image||!signature?.at||!signature?.identityDemo||!signature?.accepted)throw Error('Faltan la identidad de prueba, la aceptación o la firma de esta parte.');
 const signatures={...job.formal.signatures,[side]:signature};
 return {...job,formal:{...job.formal,signatures},signed:!!signatures.client&&!!signatures.provider,idOk:!!signatures.client&&!!signatures.provider};
}
export function authorize(job,actor,at){if(!party(job,actor)||job.formal?.mode!=='notary'||!bothSigned(job)||job.formal.notary)throw Error('Se requieren las dos firmas y modalidad notarial.');return {...job,notarized:true,formal:{...job.formal,notary:true,notaryAt:at}}}
const money=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP';
export function documentTerms(job,client,provider,stages){
 const total=stages.reduce((n,s)=>n+Number(s[2]),0);
 const contractor=provider?.role==='Empresa'?'empresa contratista':'contratista independiente';
 return {title:'CONTRATO PRIVADO DE EJECUCIÓN DE OBRA Y/O PRESTACIÓN DE SERVICIOS',project:job.project,client:client?.name||'Cliente por individualizar',provider:provider?.name||'Contratista por individualizar',clauses:[
 ['PRIMERO. Comparecencia y naturaleza del acuerdo','En Temuco, Chile, comparecen '+(client?.name||'Cliente por individualizar')+', en adelante la parte mandante, y '+(provider?.name||'Contratista por individualizar')+', en calidad de '+contractor+'. RUT, domicilios, representación y facultades: por completar y verificar antes de suscribir un contrato real. El presente modelo regula una obra o servicio independiente; no excluye la aplicación de normas laborales si en los hechos existe subordinación y dependencia.'],
 ['SEGUNDO. Objeto y alcance','La parte mandante encarga la ejecución del proyecto «'+job.project+'». '+(job.scope||'Alcance técnico pendiente de definición por las partes.')+' Las partidas, especificaciones, materiales, responsables de su suministro, exclusiones y condiciones de recepción deberán constar en el presupuesto y anexos aprobados por ambas partes.'],
 ['TERCERO. Precio y forma de pago','Precio referencial total del acuerdo: '+money(total)+'. Hitos: '+stages.map((s,i)=>(i+1)+') '+s[0]+' — '+money(s[2])+' (fecha estimada '+s[1]+')').join('; ')+'. El pago de cada hito se sujetará a la conformidad de la obra correspondiente. Las partes deberán confirmar impuestos, documentos tributarios y condiciones de pago antes de la firma real. No existe custodia de fondos en esta demostración.'],
 ['CUARTO. Plazos y modificaciones','Inicio referencial: '+(job.startDate||'01 de diciembre de 2026')+'. Término estimado: '+(job.endDate||'30 de enero de 2027')+'. Las partes documentarán cualquier cambio de alcance, precio o plazo antes de ejecutarlo, así como los impedimentos, atrasos justificados y condiciones de acceso a la obra.'],
 ['QUINTO. Obligaciones de las partes','El contratista ejecutará los trabajos convenidos conforme a las especificaciones, normativa aplicable, seguridad y calidad exigibles; informará avances y contingencias. La parte mandante facilitará el acceso y condiciones acordadas, revisará los hitos y efectuará los pagos convenidos. Los permisos y certificaciones exigibles deberán individualizarse según la naturaleza de la obra.'],
 ['SEXTO. Recepción, observaciones y garantías','La recepción se documentará por etapa y al término. Las observaciones se comunicarán por escrito y se acordará su subsanación, sin perjuicio de los derechos y responsabilidades legales aplicables, incluyendo las garantías que correspondan a la obra o servicio.'],
 ['SÉPTIMO. Incumplimiento y término','Ante incumplimientos, las partes dejarán constancia de los hechos, comunicarán las observaciones y procurarán un plazo razonable de subsanación cuando proceda. La terminación, saldos, restituciones e indemnizaciones se resolverán conforme al acuerdo definitivo y la legislación aplicable, sin renuncia a derechos irrenunciables.'],
 ['OCTAVO. Solución de controversias','Las partes podrán recurrir voluntariamente a la mediación de MATCHTER y conservar sus antecedentes. Si no existe acuerdo, podrán ejercer las acciones y derechos que correspondan ante las autoridades o tribunales competentes. La mediación no impide acudir a las vías legales.'],
 ['NOVENO. Instrumento y firmas','El modelo admite un instrumento privado con firma electrónica simple, o un instrumento privado cuyas firmas sean autorizadas ante notario, según proceda. La Ley N.º 19.799 reconoce la firma electrónica con las excepciones y reglas probatorias de sus artículos 3 y 5. La autorización notarial requiere intervención efectiva del notario; una simulación no la sustituye. En esta versión las identidades, firmas y autorizaciones son de prueba y no constituyen un contrato real.']
 ]};
}
