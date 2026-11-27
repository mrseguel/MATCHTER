import {createHash} from 'node:crypto'
import {readWalletHistory} from './walletHistory.js'
import {AuthError} from './identityAccounts.js'
const movementPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{1,10}:\d{1,10}:(service_fee|notary_fee)$/i
export async function readWalletReceipt(db,actor,movementId){
 if(typeof movementId!=='string'||!movementPattern.test(movementId))throw new AuthError(400,'Movimiento inválido')
 const history=await readWalletHistory(db,actor)
 const movement=history.movements.find(m=>m.id===movementId)
 if(!movement)throw new AuthError(404,'Movimiento no disponible')
 if(movement.status!=='recorded_demo')throw new AuthError(409,'No existe un pago de prueba registrado para este movimiento')
 const ref=createHash('sha256').update(JSON.stringify([actor.id,movement.id,new Date(movement.recordedAt).toISOString(),movement.amountCLP])).digest('hex').slice(0,24).toUpperCase()
 return {reference:'DEMO-'+ref,role:actor.role,movement,currency:'CLP',demo:true,realPayment:false,taxDocument:false,notice:'Comprobante de simulación. No acredita un pago real ni constituye documento tributario.'}
}
