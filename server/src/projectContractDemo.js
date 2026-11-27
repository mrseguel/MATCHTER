import {createHash} from 'node:crypto'
import {AuthError} from './identityAccounts.js'
import {quoteServiceFee,serviceFeeReady,bilateral,needsFeeUpgrade} from './serviceFeeDemo.js'
import {documentTerms} from '../../client/src/features/contracts/model.js'
const modes=['simple','notary']
export const DEMO_NOTARY_FEE=33490
const fields='revision,agreement_version AS "agreementVersion",mode,terms,digest,created_at AS "createdAt",client_signed_at AS "clientSignedAt",provider_signed_at AS "providerSignedAt",notary_accepted_at AS "notaryAcceptedAt",notary_demo_paid_at AS "notaryDemoPaidAt",notary_demo_fee AS "notaryDemoFee",notary_demo_authorized_at AS "notaryDemoAuthorizedAt",service_fee_demo_paid_at AS "serviceFeePaidAt",provider_fee_demo_mode AS "providerFeeMode",provider_fee_demo_paid_at AS "providerFeePaidAt",provider_fee_demo_stage_no AS "providerFeeStageNo"'
const view=r=>r?{revision:r.revision,agreementVersion:r.agreementVersion,mode:r.mode,terms:r.terms,digest:r.digest,createdAt:r.createdAt,notaryAcceptedAt:r.notaryAcceptedAt||null,notaryDemo:{fee:DEMO_NOTARY_FEE,paidAt:r.notaryDemoPaidAt||null,paidAmount:r.notaryDemoFee||null,authorizedAt:r.notaryDemoAuthorizedAt||null},serviceFeePaidAt:r.serviceFeePaidAt||null,providerFeeMode:r.providerFeeMode||null,providerFeePaidAt:r.providerFeePaidAt||null,providerFeeStageNo:r.providerFeeStageNo||null,confirmed:{client:r.clientSignedAt,provider:r.providerSignedAt}}:null
const shape=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k))
export function validateContractAction(b){
 if(!shape(b,['role','requestId','action','agreementVersion','expectedRevision','mode','digest','accepted','identityDemo','payer','identityChecks','demoAmount'])||!Number.isInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isInteger(b.expectedRevision)||b.expectedRevision<0||b.expectedRevision>=2147483647)throw new AuthError(400,'Datos del contrato no válidos')
 if(b.identityChecks!==undefined&&b.action!=='confirm'||b.demoAmount!==undefined&&!['payNotaryDemo','payServiceFeeDemo','payProviderFeeDemo'].includes(b.action))throw new AuthError(400,'Datos de prueba no válidos')
 if(b.action==='choose'&&modes.includes(b.mode)&&b.digest===undefined&&b.accepted===undefined&&b.identityDemo===undefined&&(b.mode==='simple'?b.payer===undefined:['client','provider'].includes(b.payer)))return
 if(b.action==='acceptNotary'&&b.expectedRevision>0&&b.mode===undefined&&b.payer===undefined&&b.accepted===undefined&&b.identityDemo===undefined&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest))return
 if(['payNotaryDemo','authorizeNotaryDemo'].includes(b.action)&&b.expectedRevision>0&&b.mode===undefined&&b.payer===undefined&&b.identityDemo===undefined&&b.accepted===true&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest)&&(b.action==='payNotaryDemo'?b.demoAmount===DEMO_NOTARY_FEE:b.demoAmount===undefined))return
 if(b.action==='payServiceFeeDemo'&&b.expectedRevision>0&&b.mode===undefined&&b.payer===undefined&&b.identityDemo===undefined&&b.accepted===true&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest)&&Number.isSafeInteger(b.demoAmount)&&b.demoAmount>0)return
 if(['payProviderFeeDemo','deferProviderFeeDemo'].includes(b.action)&&b.expectedRevision>0&&b.mode===undefined&&b.payer===undefined&&b.identityDemo===undefined&&b.accepted===true&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest)&&(b.action==='payProviderFeeDemo'?Number.isSafeInteger(b.demoAmount)&&b.demoAmount>0:b.demoAmount===undefined))return
 if(b.action==='confirm'&&b.payer===undefined&&b.expectedRevision>0&&b.mode===undefined&&typeof b.digest==='string'&&/^[a-f0-9]{64}$/.test(b.digest)&&b.accepted===true&&b.identityDemo===true&&shape(b.identityChecks,['front','back','selfie'])&&['front','back','selfie'].every(k=>b.identityChecks[k]===true))return
 throw new AuthError(400,'Acción de prueba no válida')
}
export async function contractContext(db,a,id,lock){
 const m=(await db.query("SELECT id,sender_profile_id AS \"senderId\",recipient_profile_id AS \"recipientId\", (SELECT role FROM matchter.account_profiles WHERE id=recipient_profile_id) AS \"providerRole\" FROM matchter.swipe_requests WHERE id=$1 AND status='accepted' AND (sender_profile_id=$2 OR recipient_profile_id=$2)"+(lock?' FOR UPDATE':''),[id,a.id])).rows[0]
 if(!m)throw new AuthError(404,'Conversación no disponible')
 const side=m.senderId===a.id?'client':'provider'
 if((side==='client')!==(a.role==='Cliente'))throw new AuthError(403,'Perfil no autorizado')
 const agreement=(await db.query('SELECT version,data,client_confirmed_at AS "clientConfirmedAt",provider_confirmed_at AS "providerConfirmedAt" FROM matchter.project_agreement_versions WHERE request_id=$1 ORDER BY version DESC LIMIT 1',[id])).rows[0]
 if(!agreement?.clientConfirmedAt||!agreement?.providerConfirmedAt)throw new AuthError(409,'Ambas partes deben confirmar primero el acuerdo')
 const current=(await db.query('SELECT '+fields+' FROM matchter.project_contract_demos WHERE request_id=$1 AND agreement_version=$2 ORDER BY revision DESC LIMIT 1',[id,agreement.version])).rows[0]
 return {side,agreement,current,providerRole:m.providerRole}
}
export function contractSnapshot(id,agreement,mode,revision,arrangement,fee,paymentMode){
 if(paymentMode!==undefined&&paymentMode!=='direct')throw new AuthError(409,'La modalidad financiera aún no está disponible')
 if(!modes.includes(mode))throw new AuthError(400,'Se requiere un contrato escrito')
 const d=agreement.data
 const terms=documentTerms({project:d.title,scope:d.scope,startDate:d.start,endDate:d.end},{name:'Cliente de prueba'},{name:'Prestador de prueba'},d.stages)
 if(mode==='notary'){
  if(!arrangement||!['client','provider'].includes(arrangement.payer)||!['client','provider'].includes(arrangement.proposedBy))throw new AuthError(400,'Indica quién asumirá el costo notarial')
  terms.notaryArrangement={payer:arrangement.payer,proposedBy:arrangement.proposedBy,feeStatus:'pending_quote'}
  terms.clauses.push(['DÉCIMO. Costo del trámite notarial · propuesta de prueba','Responsable propuesto del costo completo: '+(arrangement.payer==='client'?'cliente':'prestador')+'. Tarifa definitiva pendiente de cotización y aceptación expresa. No se genera ningún cobro en esta beta.'])
 }
 if(paymentMode==='direct'){
  if(fee?.version!==2)throw new AuthError(409,'Se requiere la tarifa bilateral vigente')
  terms.paymentMode='direct'
  const disputeClause=terms.clauses.find(c=>c[0].startsWith('OCTAVO.'))
  if(!disputeClause)throw new AuthError(409,'No se pudo preparar la cláusula de controversias')
  disputeClause[1]='En caso de controversia relativa a la calidad, alcance, atraso, abandono u otro incumplimiento de los trabajos, cualquiera de las partes podrá presentar un reclamo y aportar antecedentes. MATCHTER facilitará voluntariamente una mediación y formulará una propuesta de solución no vinculante. Si ambas partes la aceptan, se registrará el acuerdo. Si no existe acuerdo, se dejará constancia del cierre sin acuerdo; las partes podrán resolver la controversia directamente o recurrir a las autoridades y tribunales competentes. Cualquiera de las partes podrá solicitar o contratar una inspección técnica independiente, previa cotización y aceptación expresa de sus honorarios y alcance; se procurará designar al profesional de común acuerdo cuando corresponda. El informe podrá incorporarse al expediente como antecedente, con acceso autorizado y posibilidad de formular observaciones. Las decisiones económicas, pagos, reparaciones y descuentos serán gestionados por las partes fuera de MATCHTER conforme a derecho. La plataforma no resguarda, retiene ni distribuye fondos de obra en esta modalidad. La negativa a contratar una inspección o a aceptar una propuesta no equivale a consentimiento, renuncia ni reconocimiento de responsabilidad. No se restringen los derechos, garantías ni acciones legales que correspondan.'

  terms.serviceFee={...fee,paymentMode:'direct',deferAvailable:false}
  const paymentClause=terms.clauses.find(c=>c[0].startsWith('TERCERO.'))
  if(paymentClause)paymentClause[1]+=' Los pagos de los trabajos serán gestionados directamente entre las partes. MATCHTER no recibe ni resguarda esos fondos; el registro de recepción conforme no ejecuta una transferencia.'
  terms.clauses.push(['Tarifa de servicio MATCHTER · simulación','Tarifa única e individual de cada parte: '+fee.amount.toLocaleString('es-CL')+' CLP. Ambas tarifas se pagan directamente a MATCHTER tras las dos firmas, por separado de los pagos de obra. La tarifa remunera la conexión, negociación, acuerdos, gestión documental y formalización. Una vez prestados dichos servicios y formalizado el contrato, no iniciar o continuar los trabajos no constituye por sí solo causal de devolución, sin perjuicio de los derechos irrenunciables y responsabilidades legales de MATCHTER. El seguimiento de hitos y la mediación son prestaciones complementarias, sin otra tarifa de gestión por etapa; no constituyen garantía técnica de la obra. No se realiza ningún cargo real en esta beta.'])
 }else if(fee?.version===2){terms.serviceFee=fee;terms.clauses.push(['Tarifa de servicio MATCHTER · simulación','Tarifa única de cada parte: '+fee.amount.toLocaleString('es-CL')+' CLP. El cliente paga su tarifa adicional al valor de la obra; el ejecutor elige pagar su propia tarifa tras ambas firmas o descontarla de la primera liberación suficiente a su favor. La tarifa remunera la conexión, negociación, acuerdos, gestión documental y formalización del contrato. Una vez prestados esos servicios y formalizado el contrato, no iniciar o continuar los trabajos no constituye por sí solo causal de devolución, sin perjuicio de los derechos irrenunciables y las responsabilidades legales de MATCHTER. Seguimiento, coordinación de pagos protegidos y mediación son prestaciones complementarias sin otra tarifa de gestión por etapa, no garantía técnica de la obra. No se descuenta la tarifa del ejecutor de fondos a restituir al cliente. Esta beta no mueve fondos reales.'])}else if(fee){terms.serviceFee=fee;terms.clauses.push(['Tarifa de servicio MATCHTER · simulación','Tarifa única del cliente: '+fee.amount.toLocaleString('es-CL')+' CLP, adicional al precio contractual y separada de las etapas y del trámite notarial. No reduce el monto del ejecutor. No se realiza ningún cargo real; los costos financieros e impuestos definitivos están pendientes de validación.'])}
 const digest=createHash('sha256').update(JSON.stringify({id,agreementVersion:agreement.version,revision,mode,terms})).digest('hex')
 return {terms,digest}
}
export async function readContractDemo(db,a,id,{paymentModeForNewContract,sandboxFeeProjection}={}){
 const {agreement,current,providerRole}=await contractContext(db,a,id,false)
 let fee=current&&!needsFeeUpgrade(current)?current.terms?.serviceFee||null:quoteServiceFee(providerRole,agreement.data.stages)
 if(!current&&paymentModeForNewContract){const mode=await paymentModeForNewContract(db);if(mode!=='direct')throw new AuthError(409,'La modalidad financiera aún no está disponible');fee={...fee,paymentMode:mode,deferAvailable:false}}
 const projected=sandboxFeeProjection?await sandboxFeeProjection(a,id,current):current
  return {agreementVersion:agreement.version,serviceFee:fee,feeUpgradeRequired:needsFeeUpgrade(current),contract:view(projected),...(sandboxFeeProjection?{sandboxFeeVerification:projected?.sandboxFeeVerification||null}:{})}
}
export async function changeContractDemo(db,a,id,b,{paymentModeForNewContract}={}){
 validateContractAction(b)
 const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const {side,agreement,current,providerRole}=await contractContext(tx,a,id,true)
  const revision=current?.revision||0
  if(b.agreementVersion!==agreement.version||b.expectedRevision!==revision)throw new AuthError(409,'El documento cambió. Actualiza antes de continuar.')
  let saved=current
  if(b.action==='choose'){
   if(needsFeeUpgrade(current)||current?.mode!==b.mode||b.mode==='notary'&&(current?.terms?.notaryArrangement?.payer!==b.payer||!current?.terms?.notaryArrangement)){ 
    if(current?.clientSignedAt||current?.providerSignedAt)throw new AuthError(409,'La modalidad ya tiene una confirmación y no se puede cambiar')
    const paymentMode=current?current.terms?.paymentMode:paymentModeForNewContract?await paymentModeForNewContract(tx):undefined
    const {terms,digest}=contractSnapshot(id,agreement,b.mode,revision+1,b.mode==='notary'?{payer:b.payer,proposedBy:side}:undefined,current&&!needsFeeUpgrade(current)?current.terms?.serviceFee:quoteServiceFee(providerRole,agreement.data.stages),paymentMode)
    saved=(await tx.query('INSERT INTO matchter.project_contract_demos(request_id,agreement_version,revision,mode,terms,digest) VALUES($1,$2,$3,$4,$5,$6) RETURNING '+fields,[id,agreement.version,revision+1,b.mode,JSON.stringify(terms),digest])).rows[0]
   }
  }else if(b.action==='acceptNotary'){
   if(!current||current.mode!=='notary'||!current.terms?.notaryArrangement||b.digest!==current.digest)throw new AuthError(409,'La propuesta notarial no coincide')
   if(current.terms.notaryArrangement.proposedBy===side)throw new AuthError(403,'Debe aceptar la contraparte')
   if(!current.notaryAcceptedAt)saved=(await tx.query('UPDATE matchter.project_contract_demos SET notary_accepted_at=now() WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND notary_accepted_at IS NULL RETURNING '+fields,[id,agreement.version,revision])).rows[0]
  }else if(b.action==='payServiceFeeDemo'){
   if(side!=='client')throw new AuthError(403,'Solo el cliente paga la tarifa MATCHTER')
   if(!current?.terms?.serviceFee||b.digest!==current.digest||!current.clientSignedAt||!current.providerSignedAt||b.demoAmount!==current.terms.serviceFee.amount)throw new AuthError(409,'Confirma ambas firmas y la tarifa exacta del contrato')
   if(!current.serviceFeePaidAt)saved=(await tx.query('UPDATE matchter.project_contract_demos SET service_fee_demo_paid_at=now() WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND service_fee_demo_paid_at IS NULL RETURNING '+fields,[id,agreement.version,revision])).rows[0]
  }else if(['payProviderFeeDemo','deferProviderFeeDemo'].includes(b.action)){
   if(side!=='provider')throw new AuthError(403,'Solo el perfil contratado elige y paga su tarifa')
   if(!bilateral(current)||b.digest!==current.digest||!current.clientSignedAt||!current.providerSignedAt)throw new AuthError(409,'Confirma ambas firmas del contrato bilateral')
   const fee=current.terms.serviceFee,mode=b.action==='payProviderFeeDemo'?'upfront':'deferred'
   if(mode==='upfront'&&b.demoAmount!==fee.amount)throw new AuthError(409,'La tarifa no coincide')
   if(mode==='deferred'&&current.terms?.paymentMode==='direct')throw new AuthError(409,'Sin resguardo de fondos, debes pagar tu tarifa directamente')
   if(mode==='deferred'&&!fee.deferAvailable)throw new AuthError(409,'Ninguna etapa tiene monto suficiente para el descuento')
   if(current.providerFeeMode&&current.providerFeeMode!==mode)throw new AuthError(409,'La modalidad de tarifa ya fue registrada')
   if(!current.providerFeeMode)saved=(await tx.query('UPDATE matchter.project_contract_demos SET provider_fee_demo_mode=$4,provider_fee_demo_paid_at=CASE WHEN $4=\'upfront\' THEN now() ELSE NULL END WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND provider_fee_demo_mode IS NULL RETURNING '+fields,[id,agreement.version,revision,mode])).rows[0]
  }else if(['payNotaryDemo','authorizeNotaryDemo'].includes(b.action)){
   if(!serviceFeeReady(current))throw new AuthError(409,'Primero registra la tarifa MATCHTER de prueba')
   if(!current||current.mode!=='notary'||b.digest!==current.digest||!current.notaryAcceptedAt||!current.clientSignedAt||!current.providerSignedAt)throw new AuthError(409,'Se requiere el acuerdo notarial y ambas firmas de prueba')
   if(b.action==='payNotaryDemo'){
    if(current.terms?.notaryArrangement?.payer!==side)throw new AuthError(403,'Solo paga el responsable acordado')
    if(!current.notaryDemoPaidAt)saved=(await tx.query('UPDATE matchter.project_contract_demos SET notary_demo_paid_at=now(),notary_demo_fee=$4 WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND notary_demo_paid_at IS NULL RETURNING '+fields,[id,agreement.version,revision,DEMO_NOTARY_FEE])).rows[0]
   }else{
    if(!current.notaryDemoPaidAt||current.notaryDemoFee!==DEMO_NOTARY_FEE)throw new AuthError(409,'Falta el pago simulado del responsable')
    if(!current.notaryDemoAuthorizedAt)saved=(await tx.query('UPDATE matchter.project_contract_demos SET notary_demo_authorized_at=now() WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND notary_demo_authorized_at IS NULL RETURNING '+fields,[id,agreement.version,revision])).rows[0]
   }
  }else{
   if(needsFeeUpgrade(current))throw new AuthError(409,'Actualiza el borrador al nuevo modelo bilateral antes de firmar')
   if(!current||!modes.includes(current.mode)||b.digest!==current.digest)throw new AuthError(409,'La versión del documento no coincide')
   if(current.mode==='notary'&&(!current.terms?.notaryArrangement||!current.notaryAcceptedAt))throw new AuthError(409,'Ambas partes deben aceptar la modalidad y el responsable del costo notarial')
   if(!(side==='client'?current.clientSignedAt:current.providerSignedAt)){
    const col=side==='client'?'client_signed_at':'provider_signed_at'
    saved=(await tx.query('UPDATE matchter.project_contract_demos SET '+col+'=now() WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND '+col+' IS NULL RETURNING '+fields,[id,agreement.version,revision])).rows[0]
   }
  }
  if(!saved)throw new AuthError(409,'No se pudo registrar la acción')
  await tx.query('COMMIT')
  return {agreementVersion:agreement.version,contract:view(saved)}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
