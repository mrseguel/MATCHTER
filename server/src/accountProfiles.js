import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
const roles=new Set(PROFILE_ROLES)
// Identity comes exclusively from the verified credential. Never accept an
// account ID, owner ID, permission, or verification status from the client.
export function createProfilesService({db,verifyIdentity}){
 async function transaction(header,action,body){
  const identity=await verifyIdentity(header)
  if(action!=='list'&&(!body||Object.keys(body).length!==1||!roles.has(body.role)))throw new AuthError(400,'Selecciona un tipo de perfil válido')
  const conn=await db.connect()
  try{
   await conn.query('BEGIN')
   const account=(await conn.query('SELECT id,role FROM matchter.accounts WHERE auth_issuer=$1 AND auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
   if(!account)throw new AuthError(404,'Completa tu perfil')
   await conn.query('INSERT INTO matchter.account_profiles(account_id,role) VALUES ($1,$2) ON CONFLICT(account_id,role) DO NOTHING',[account.id,account.role])
   await conn.query('INSERT INTO matchter.account_active_profiles(account_id,role) VALUES ($1,$2) ON CONFLICT(account_id) DO NOTHING',[account.id,account.role])
   if(action==='add')await conn.query('INSERT INTO matchter.account_profiles(account_id,role) VALUES ($1,$2) ON CONFLICT(account_id,role) DO NOTHING',[account.id,body.role])
   if(action==='switch'||action==='add'){
    const owned=(await conn.query('SELECT id FROM matchter.account_profiles WHERE account_id=$1 AND role=$2',[account.id,body.role])).rows[0]
    if(!owned)throw new AuthError(404,'Primero crea este perfil')
    await conn.query('UPDATE matchter.account_active_profiles SET role=$2 WHERE account_id=$1',[account.id,body.role])
   }
   const profiles=(await conn.query('SELECT id,role FROM matchter.account_profiles WHERE account_id=$1 ORDER BY role',[account.id])).rows
   const active=(await conn.query('SELECT role FROM matchter.account_active_profiles WHERE account_id=$1',[account.id])).rows[0]
   if(!active||!profiles.some(p=>p.role===active.role))throw Error('Invalid active profile')
   await conn.query('COMMIT')
   return {profiles,activeRole:active.role}
  }catch(e){await conn.query('ROLLBACK');throw e}
  finally{conn.release()}
 }
 return Object.freeze({list:header=>transaction(header,'list'),add:(header,body)=>transaction(header,'add',body),switch:(header,body)=>transaction(header,'switch',body)})
}
