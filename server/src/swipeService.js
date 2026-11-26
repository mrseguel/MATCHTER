import {createHash} from 'node:crypto'
import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
import {validateDetails} from './profileDetails.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isProvider=role=>PROFILE_ROLES.includes(role)&&role!=='Cliente'
const shape=(body,allowed)=>{if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))throw new AuthError(400,'Solicitud no válida')}
const str=(v,n,required=false)=>{if(typeof v!=='string'||v.length>n||required&&!v.trim())throw new AuthError(400,'Completa los campos requeridos y revisa su longitud');return v.trim()}
const id=v=>{if(typeof v!=='string'||!uuid.test(v))throw new AuthError(400,'Identificador no válido');return v}
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase()
export function validateInvitation(body){
 shape(body,['projectTitle','description','specifications','location','budget','antecedents'])
 const d={projectTitle:str(body.projectTitle,150,true),description:str(body.description,2000,true),specifications:str(body.specifications??'',1500),location:str(body.location,120,true),budget:body.budget??null,antecedents:str(body.antecedents??'',1000)}
 if(d.budget!==null&&(!Number.isSafeInteger(d.budget)||d.budget<0||d.budget>100000000000))throw new AuthError(400,'Presupuesto no válido')
 const dedupe=createHash('sha256').update(JSON.stringify(Object.values(d).map(norm))).digest('hex')
 return {d,dedupe}
}
export function validateCard(role,body){
 if(!isProvider(role))throw new AuthError(403,'Solo los perfiles proveedores pueden publicar')
 shape(body,['displayName','city','specialty','bio','workMode'])
 const displayName=str(body.displayName,150,true)
 const d=validateDetails(role,{city:str(body.city,100,true),specialty:str(body.specialty,120,true),bio:str(body.bio??'',600),workMode:body.workMode??''})
 if(role==='Maestro o contratista'&&!d.workMode)throw new AuthError(400,'Selecciona tu modalidad de trabajo')
 return {displayName,city:d.city,specialty:d.specialty,bio:d.bio,workMode:d.workMode}
}
const cardColumns='c.profile_id AS id,p.role,c.display_name AS "displayName",c.city,c.specialty,c.bio,c.work_mode AS "workMode"'
const requestColumns='r.id,r.sender_profile_id AS "senderId",r.recipient_profile_id AS "recipientId",r.details,r.status,r.created_at AS "createdAt",r.responded_at AS "respondedAt"'
export function createSwipeService({db,verifyIdentity}){
 async function actor(header,expected){
  const identity=await verifyIdentity(header)
  if(!PROFILE_ROLES.includes(expected))throw new AuthError(400,'Perfil no válido')
  const a=(await db.query('SELECT p.id,p.account_id AS "accountId",p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
  if(!a)throw new AuthError(404,'Completa tu perfil')
  if(a.role!==expected)throw new AuthError(409,'El perfil activo cambió. Actualiza la página.')
  return a
 }
 const customer=a=>{if(a.role!=='Cliente')throw new AuthError(403,'Cambia al perfil Cliente para contratar servicios')}
 async function target(a,v){const targetId=id(v)
  const row=(await db.query('SELECT p.id FROM matchter.swipe_cards c JOIN matchter.account_profiles p ON p.id=c.profile_id WHERE c.profile_id=$1 AND c.published=true AND p.account_id<>$2 AND p.role<>$3',[targetId,a.accountId,'Cliente'])).rows[0]
  if(!row)throw new AuthError(404,'Tarjeta no disponible')
  return targetId
 }
 return Object.freeze({
  async browse(header,query){const a=await actor(header,query.role);customer(a)
   const search=str(query.search??'',120),city=str(query.city??'',100),kind=query.kind??''
   if(kind&&!isProvider(kind))throw new AuthError(400,'Categoría no válida')
   const rows=(await db.query('SELECT '+cardColumns+',COALESCE(f.saved,false) AS saved FROM matchter.swipe_cards c JOIN matchter.account_profiles p ON p.id=c.profile_id LEFT JOIN matchter.swipe_favorites f ON f.target_profile_id=c.profile_id AND f.owner_profile_id=$1 WHERE c.published=true AND p.account_id<>$2 AND p.role<>\'Cliente\' AND ($3=\'\' OR strpos(lower(c.specialty||\' \'||c.display_name),lower($3))>0) AND ($4=\'\' OR c.city=$4) AND ($5=\'\' OR p.role=$5) ORDER BY c.updated_at DESC,c.profile_id LIMIT 100',[a.id,a.accountId,search,city,kind])).rows
   return {cards:rows}
  },
  async own(header,role){const a=await actor(header,role);if(!isProvider(a.role))throw new AuthError(403,'Solo proveedores')
   const row=(await db.query('SELECT display_name AS "displayName",city,specialty,bio,work_mode AS "workMode",published FROM matchter.swipe_cards WHERE profile_id=$1',[a.id])).rows[0]
   return {card:row||null}
  },
  async publish(header,body){shape(body,['role','card']);const a=await actor(header,body.role),d=validateCard(a.role,body.card)
   const row=(await db.query('INSERT INTO matchter.swipe_cards(profile_id,display_name,city,specialty,bio,work_mode,published) VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT(profile_id) DO UPDATE SET display_name=EXCLUDED.display_name,city=EXCLUDED.city,specialty=EXCLUDED.specialty,bio=EXCLUDED.bio,work_mode=EXCLUDED.work_mode,published=true,updated_at=now() RETURNING display_name AS "displayName",city,specialty,bio,work_mode AS "workMode",published',[a.id,d.displayName,d.city,d.specialty,d.bio,d.workMode])).rows[0]
   return {card:row}
  },
  async hide(header,body){shape(body,['role']);const a=await actor(header,body.role);if(!isProvider(a.role))throw new AuthError(403,'Solo proveedores')
   await db.query('UPDATE matchter.swipe_cards SET published=false,updated_at=now() WHERE profile_id=$1',[a.id]);return {published:false}
  },
  async favorite(header,body){shape(body,['role','targetId','saved']);const a=await actor(header,body.role);customer(a)
   if(typeof body.saved!=='boolean')throw new AuthError(400,'Selección no válida')
   const t=body.saved?await target(a,body.targetId):id(body.targetId)
   if(body.saved)await db.query('INSERT INTO matchter.swipe_favorites(owner_profile_id,target_profile_id,saved) VALUES ($1,$2,true) ON CONFLICT(owner_profile_id,target_profile_id) DO UPDATE SET saved=true',[a.id,t])
   else await db.query('UPDATE matchter.swipe_favorites SET saved=false WHERE owner_profile_id=$1 AND target_profile_id=$2',[a.id,t])
   return {targetId:t,saved:body.saved}
  },
  async favorites(header,role){const a=await actor(header,role);customer(a)
   const rows=(await db.query('SELECT '+cardColumns+',true AS saved FROM matchter.swipe_favorites f JOIN matchter.swipe_cards c ON c.profile_id=f.target_profile_id JOIN matchter.account_profiles p ON p.id=c.profile_id WHERE f.owner_profile_id=$1 AND f.saved=true AND c.published=true AND p.account_id<>$2 ORDER BY c.display_name LIMIT 100',[a.id,a.accountId])).rows
   return {cards:rows}
  },
  async invite(header,body){shape(body,['role','targetId','details']);const a=await actor(header,body.role);customer(a);const t=await target(a,body.targetId),{d,dedupe}=validateInvitation(body.details)
   const r=(await db.query('INSERT INTO matchter.swipe_requests(sender_profile_id,recipient_profile_id,dedupe_key,details) SELECT $1,c.profile_id,$3,$4::jsonb FROM matchter.swipe_cards c JOIN matchter.account_profiles p ON p.id=c.profile_id WHERE c.profile_id=$2 AND c.published=true AND p.account_id<>$5 AND p.role<>\'Cliente\' ON CONFLICT(sender_profile_id,recipient_profile_id,dedupe_key) DO NOTHING RETURNING id,status',[a.id,t,dedupe,JSON.stringify(d),a.accountId])).rows[0]
   if(r)return {request:r,duplicate:false}
   const existing=(await db.query('SELECT id,status FROM matchter.swipe_requests WHERE sender_profile_id=$1 AND recipient_profile_id=$2 AND dedupe_key=$3',[a.id,t,dedupe])).rows[0]
   if(!existing)throw new AuthError(404,'Tarjeta no disponible')
   return {request:existing,duplicate:true}
  },
  async requests(header,role){const a=await actor(header,role)
   const rows=(await db.query('SELECT '+requestColumns+',CASE WHEN r.sender_profile_id=$1 THEN \'outgoing\' ELSE \'incoming\' END AS direction,COALESCE(c.display_name,\'Cliente\') AS "providerName" FROM matchter.swipe_requests r LEFT JOIN matchter.swipe_cards c ON c.profile_id=r.recipient_profile_id WHERE r.sender_profile_id=$1 OR r.recipient_profile_id=$1 ORDER BY r.created_at DESC LIMIT 100',[a.id])).rows
   return {requests:rows}
  },
  async respond(header,body){shape(body,['role','requestId','decision']);const a=await actor(header,body.role),rid=id(body.requestId)
   if(!['accepted','rejected'].includes(body.decision))throw new AuthError(400,'Decisión no válida')
   const row=(await db.query('UPDATE matchter.swipe_requests SET status=$3,responded_at=now() WHERE id=$1 AND recipient_profile_id=$2 AND status=\'pending\' RETURNING id,status,responded_at AS "respondedAt"',[rid,a.id,body.decision])).rows[0]
   if(!row)throw new AuthError(409,'Solicitud no disponible o ya respondida')
   return {request:row,match:row.status==='accepted'?{id:row.id,requestId:row.id}:null}
  }
 })
}
