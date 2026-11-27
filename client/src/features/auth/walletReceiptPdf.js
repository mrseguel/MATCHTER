import {jsPDF} from 'jspdf'
export function buildWalletReceipt(receipt){
 if(receipt?.demo!==true||receipt.realPayment!==false||receipt.taxDocument!==false||receipt.movement?.status!=='recorded_demo'||!/^DEMO-[A-F0-9]{24}$/.test(receipt.reference))throw Error('Comprobante de prueba no válido')
 const m=receipt.movement,pdf=new jsPDF({format:'a4',unit:'mm'}),money=Number(m.amountCLP).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
 let y=24
 function line(t,size=11,bold=false){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(String(t).replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' '),170);for(const s of lines){if(y>270){pdf.addPage();y=24}pdf.text(s,20,y);y+=size*.45+2}y+=3}
 pdf.setTextColor(230,112,35);line('MATCHTER',22,true);pdf.setTextColor(30,30,30)
 line('COMPROBANTE DE SIMULACIÓN',16,true)
 line('NO ACREDITA UN PAGO REAL · NO ES DOCUMENTO TRIBUTARIO',11,true)
 line('Referencia: '+receipt.reference)
 line('Perfil: '+receipt.role)
 line('Concepto: '+(m.kind==='notary_fee'?'Trámite notarial de prueba':'Tarifa de servicio MATCHTER de prueba'))
 line('Proyecto: '+m.projectTitle)
 line('Contrato: '+m.agreementVersion+'.'+m.contractRevision)
 line('Fecha del registro: '+new Date(m.recordedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'}))
 line('Importe simulado: '+money,19,true)
 line('Estado: registro de prueba confirmado')
 line(receipt.notice)
 line('No representa dinero disponible, custodia, transferencia ni factura o boleta. Los pagos externos no se acreditan con este documento.')
 return new Uint8Array(pdf.output('arraybuffer'))
}
export function saveWalletReceipt(receipt){
 const bytes=buildWalletReceipt(receipt),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a')
 a.href=url;a.download='matchter-'+receipt.reference+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
