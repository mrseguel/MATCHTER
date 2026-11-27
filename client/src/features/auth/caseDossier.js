import {jsPDF} from 'jspdf'
import {zipSync} from 'fflate'
const dates=v=>v?new Date(v).toLocaleString('es-CL',{timeZone:'America/Santiago'}):'No registrado'
const money=v=>Number(v).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
const side={client:'Cliente',provider:'Prestador',mediator:'Mediador',inspector:'Inspector',requester:'Solicitante'}
const actions={comment:'Antecedentes',review:'Revisión',invite:'Invitación',join:'Aceptación de mediación',decline:'Mediación declinada',propose:'Propuesta',accept:'Aceptación',decision_decline:'Desacuerdo',reject:'Desacuerdo',close:'Cierre sin acuerdo',inspection:'Solicitud de inspección',inspection_observation:'Observación al informe',inspection_propose:'Propuesta posterior al informe',inspection_accept:'Aceptación posterior al informe',inspection_decline:'Desacuerdo posterior al informe',inspection_close:'Cierre posterior al informe'}
const clean=v=>String(v??'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,' ').replace(/[\u202a-\u202e\u2066-\u2069]/g,'')
export function buildCasePdf(record){
 const pdf=new jsPDF({unit:'mm',format:'a4'}),c=record.case,cl=c.claim,ag=record.agreement,contract=record.contract
 let y=17
 const ensure=h=>{if(y+h>278){pdf.addPage();y=17}}
 function lines(value,{size=10,bold=false}={}){
  pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size)
  const all=pdf.splitTextToSize(clean(value),174)
  for(const line of all){ensure(size*0.43+2);pdf.text(line,18,y);y+=size*0.43+1}
  y+=2
 }
 const heading=t=>{ensure(18);y+=4;pdf.setTextColor(182,81,21);lines(t,{size:13,bold:true});pdf.setTextColor(35,35,35)}
 pdf.setTextColor(35,35,35);lines('MATCHTER | Expediente de controversia',{size:18,bold:true})
 lines('Documento de prueba · No certifica firmas, pagos ni hechos alegados.',{bold:true})
 lines('Expediente: '+c.id+'\nExportado: '+dates(record.exportedAt))
 heading('1. Reclamo y estado de la obra')
 lines('Proyecto: '+cl.projectTitle+'\nEtapa: '+cl.stageNo+' · '+(cl.stageSnapshot?.title||'')+'\nPresentado por: '+(side[cl.side]||cl.side)+'\nRecepción: '+dates(c.createdAt)+'\nEstado de mediación: '+c.status)
 lines('Motivo: '+cl.reason+'\nDescripción: '+cl.description+'\nSolución solicitada: '+cl.requestedResolution+'\nReferencia contractual: '+(cl.contractReference||'No indicada'))
 if(cl.stageSnapshot){const s=cl.stageSnapshot;lines('Etapa al reclamar: '+(s.status||'')+' · Valor contractual: '+money(s.amount)+' · Fecha prevista: '+s.date+'\nAvance físico informado: '+(s.progressPercent??'No registrado'))}
 heading('2. Acuerdo y contrato asociado')
 lines('Acuerdo versión '+ag.version+' · Contrato revisión '+contract.revision+' · Modalidad '+(contract.terms?.paymentMode||'demo anterior')+'\nHuella del contrato: '+contract.digest)
 lines('Confirmación acuerdo cliente: '+dates(ag.clientConfirmedAt)+'\nConfirmación acuerdo prestador: '+dates(ag.providerConfirmedAt)+'\nFirma de prueba cliente: '+dates(contract.clientSignedAt)+'\nFirma de prueba prestador: '+dates(contract.providerSignedAt))
 if(ag.data){lines('Título: '+ag.data.title+'\nAlcance: '+ag.data.scope+'\nPlazo: '+ag.data.start+' a '+ag.data.end+'\nTotal: '+money(ag.data.totalAmount));for(const s of ag.data.stages||[])lines(s[0]+' · '+s[1]+' · '+money(s[2])+' · '+s[3]+' %')}
 for(const clause of contract.terms?.clauses||[]){lines(clause[0],{bold:true});lines(clause[1])}
 heading('3. Historial de actuaciones')
 for(const e of c.events||[]){lines(dates(e.recordedAt)+' · '+(side[e.side]||e.side)+' · '+(actions[e.action]||e.action),{bold:true});if(e.text)lines(e.text)}
 heading('4. Inspección técnica')
 for(const item of record.cancellations||[])lines('Cancelada: '+item.inspectorName+' · '+dates(item.cancelledAt)+' · '+item.reason)
 if(record.inspection){const i=record.inspection;lines(i.inspector.displayName+' · '+i.inspector.specialty+' · '+i.inspector.serviceArea+'\nEstado: '+i.status+'\nIdentificador: '+i.id)
  if(i.report){lines('Visita declarada: '+dates(i.report.visitedAt)+'\nHallazgos: '+i.report.findings+'\nLimitaciones: '+i.report.limitations);for(const p of i.report.items||[])lines(p.description+' · '+money(p.amountCLP));lines('Estimación técnica: '+money(i.report.estimateCLP),{bold:true})}
 }else lines('No hay inspección activa seleccionada.')
 heading('5. Resultado posterior a la inspección')
 const final=c.inspectionResolution
 lines(final?'Estado: '+final.status:'Sin revisión posterior al informe.')
 if(final?.proposal)lines(final.proposal.text+'\nAceptaron: '+final.accepted.map(x=>side[x]).join(', ')+'\nRechazaron: '+final.rejected.map(x=>side[x]).join(', '))
 heading('6. Índice de archivos originales')
 for(const [label,files] of [['Partes',record.evidence||[]],['Inspector',record.inspectionFiles||[]]]){lines(label,{bold:true});if(!files.length)lines('Sin archivos.');for(const f of files)lines(f.filename+' · '+f.size+' bytes · '+dates(f.createdAt)+'\nSHA-256: '+f.sha256)}
 heading('7. Alcance del expediente')
 lines('Los archivos originales se conservan por separado. Se excluyen conversaciones privadas y honorarios del inspector. El registro no constituye una orden de pago ni reemplaza una firma profesional, asesoría jurídica o determinación judicial.')
 for(const warning of record.limitations||[])lines(warning)
 for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);pdf.setFontSize(8);pdf.setTextColor(110);pdf.text('MATCHTER · Prueba · '+p+'/'+pdf.getNumberOfPages(),18,289)}
 return new Uint8Array(pdf.output('arraybuffer'))
}
export async function buildCaseArchive(record,getFile,digest){
 const files={'expediente.pdf':buildCasePdf(record),'registro.json':new TextEncoder().encode(JSON.stringify(record,null,2))}
 for(const [kind,list] of [['reclamo',record.evidence||[]],['inspeccion',record.inspectionFiles||[]]]){
  for(const f of list){
   const original=await getFile(kind,f.id)
   const bytes=Uint8Array.from(atob(original.base64),c=>c.charCodeAt(0))
   if(bytes.length!==f.size||await digest(bytes)!==f.sha256)throw Error('El archivo no coincide con el índice del expediente: '+f.filename)
   const safe=clean(f.filename).replace(/[\\/:*?"<>|]/g,'_').slice(0,180)
   files[kind+'/'+f.id+'-'+safe]=bytes
  }
 }
 return zipSync(files,{level:0})
}
