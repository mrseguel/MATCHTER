import {AuthError} from './identityAccounts.js'
const fail=(status,message)=>{throw new AuthError(status,message)}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max
export function createInspectorAdministration({db,verifyIdentity}){
 async function actor(header,q=db){
  const i=await verifyIdentity(header)
  const a=(await q.query('SELECT a.id FROM matchter.accounts a JOIN matchter.inspector_administrators ia ON ia.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[i.issuer,i.subject])).rows[0]
  if(!a)fail(403,'Administración de inspectores no autorizada')
  return a
 }
 return {
  async access(header){await actor(header);return {authorized:true}},
  async list(header){
   await actor(header)
   const {rows}=await db.query(`SELECT p.id AS "profileId",c.display_name AS "publicName",c.specialty AS "publicSpecialty",c.city AS "publicCity",i.display_name AS "displayName",i.specialty,i.service_area AS "serviceArea",i.enabled,i.verified_at AS "verifiedAt" FROM matchter.account_profiles p LEFT JOIN matchter.swipe_cards c ON c.profile_id=p.id AND c.published LEFT JOIN matchter.inspector_registry i ON i.profile_id=p.id WHERE p.role='Profesional' AND (c.profile_id IS NOT NULL OR i.profile_id IS NOT NULL) ORDER BY COALESCE(i.display_name,c.display_name),p.id LIMIT 100`)
   return {profiles:rows}
  },
  async save(header,body){
   if(!body||Object.keys(body).some(k=>!['profileId','displayName','specialty','serviceArea','enabled','reason','credentialsReviewed'].includes(k))||!uuid.test(body.profileId||'')||!text(body.displayName,1,120)||!text(body.specialty,1,160)||!text(body.serviceArea,1,160)||!text(body.reason,5,1000)||typeof body.enabled!=='boolean'||body.enabled&&body.credentialsReviewed!==true)fail(400,'Confirma los datos y la revisión manual de antecedentes')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await actor(header,tx)
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('registry:'||$1::text,0))",[body.profileId])
    const p=(await tx.query("SELECT id,account_id FROM matchter.account_profiles WHERE id=$1 AND role='Profesional'",[body.profileId])).rows[0]
    if(!p)fail(404,'Perfil profesional no disponible')
    if(p.account_id===a.id)fail(403,'No puedes habilitar tu propio perfil')
    const previous=(await tx.query('SELECT display_name,specialty,service_area,enabled,verified_at FROM matchter.inspector_registry WHERE profile_id=$1',[p.id])).rows[0]||null
    await tx.query('INSERT INTO matchter.inspector_registry(profile_id,display_name,specialty,service_area,enabled,verified_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $5 THEN now() ELSE NULL END) ON CONFLICT(profile_id) DO UPDATE SET display_name=EXCLUDED.display_name,specialty=EXCLUDED.specialty,service_area=EXCLUDED.service_area,enabled=EXCLUDED.enabled,verified_at=CASE WHEN EXCLUDED.enabled THEN now() ELSE inspector_registry.verified_at END',[p.id,body.displayName.trim(),body.specialty.trim(),body.serviceArea.trim(),body.enabled])
    await tx.query('INSERT INTO matchter.inspector_registry_events(profile_id,actor_account_id,data) VALUES($1,$2,$3)',[p.id,a.id,JSON.stringify({previous,enabled:body.enabled,reason:body.reason.trim(),credentialsReviewed:body.credentialsReviewed===true,displayName:body.displayName.trim(),specialty:body.specialty.trim(),serviceArea:body.serviceArea.trim()})])
    await tx.query('COMMIT');return {saved:true}
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 }
}
