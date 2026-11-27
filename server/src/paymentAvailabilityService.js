import {AuthError} from './identityAccounts.js'
import {availableContractModes,validateAvailabilityChange} from './contractPaymentChoice.js'
const fallback='direct-only'
// No live custody adapter exists. Never accept readiness from the browser or an environment toggle.
const verifiedCustody=false
export function createPaymentAvailabilityService({db,verifyIdentity}){
 async function requireAdmin(header){
  const identity=await verifyIdentity(header)
  const row=(await db.query('SELECT a.id FROM matchter.accounts a JOIN matchter.payment_administrators p ON p.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
  if(!row)throw new AuthError(403,'Acceso administrativo requerido')
  return row.id
 }
 async function read(q=db){
  const row=(await q.query('SELECT availability,event_id::text AS revision FROM matchter.payment_availability_events ORDER BY event_id DESC LIMIT 1')).rows[0]
  const availability=row?.availability||fallback
  let modes
  try{modes=availableContractModes({availability,verifiedCustody})}catch{throw new AuthError(409,'Configuración financiera no disponible')}
  return {availability,revision:row?.revision||'0',verifiedCustody,modes}
 }
 return Object.freeze({
  async access(header){await requireAdmin(header);return {authorized:true}},
  async get(header){await requireAdmin(header);return read()},
  async save(header,body){
   const actor=await requireAdmin(header)
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||typeof body.revision!=='string'||!/^\d{1,19}$/.test(body.revision))throw new AuthError(400,'Configuración no válida')
   try{validateAvailabilityChange({isAdmin:true,availability:body.availability,verifiedCustody})}catch{throw new AuthError(409,'Modalidad financiera no disponible')}
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    await tx.query('SELECT pg_advisory_xact_lock(20261126,20)')
    const before=await read(tx)
    if(before.revision!==body.revision)throw new AuthError(409,'La configuración cambió. Actualiza antes de guardar.')
    if(before.availability!==body.availability)await tx.query('INSERT INTO matchter.payment_availability_events(actor_account_id,availability) VALUES($1,$2)',[actor,body.availability])
    const after=await read(tx)
    await tx.query('COMMIT');return after
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  },
  async modeForNewContract(q){const config=await read(q);if(config.modes.length!==1||config.modes[0]!=='direct')throw new AuthError(409,'La modalidad financiera aún no está disponible');return 'direct'}
 })
}
