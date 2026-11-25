import {AuthError,PROFILE_ROLES} from './identityAccounts.js'
const cityList=new Set(["Angol","Cajón","Capitán Pastene","Carahue","Cherquenco","Cholchol","Collipulli","Cunco","Curacautín","Curarrehue","Ercilla","Freire","Galvarino","General López","Gorbea","Gualpín","Huiscapi","Labranza","Lastarria","Lautaro","Licán Ray","Loncoche","Lonquimay","Los Laureles","Los Sauces","Lumaco","Melipeuco","Mininco","Nueva Imperial","Nueva Toltén","Ñancul","Padre Las Casas","Pailahueque","Perquenco","Pillanlelbún","Pitrufquén","Portal San Francisco","Pucón","Puerto Saavedra","Purén","Quepe","Queule","Renaico","San Ramón","Temuco","Teodoro Schmidt","Tijeral","Traiguén","Trovolhue","Victoria","Vilcún","Villarrica"])
const keys=['city','specialty','bio','workMode','businessName']
const limits={city:100,specialty:120,bio:600,workMode:30,businessName:150}
const empty=()=>Object.fromEntries(keys.map(k=>[k,'']))
export function validateDetails(role,body){
 if(!PROFILE_ROLES.includes(role)||!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw new AuthError(400,'Antecedentes no válidos')
 const out=empty()
 for(const k of keys){if(body[k]===undefined)continue;if(typeof body[k]!=='string'||body[k].length>limits[k])throw new AuthError(400,'Revisa la longitud de los antecedentes');out[k]=body[k].trim()}
 if(out.city&&!cityList.has(out.city))throw new AuthError(400,'Selecciona una ciudad de La Araucanía')
 if(out.workMode&&!['Independiente','Con equipo','Contratista'].includes(out.workMode))throw new AuthError(400,'Selecciona una modalidad válida')
 if(role!=='Maestro o contratista'&&out.workMode||role!=='Empresa'&&out.businessName||role==='Cliente'&&out.specialty)throw new AuthError(400,'Los datos no corresponden al perfil seleccionado')
 return out
}
export function createProfileDetailsService({db,verifyIdentity}){
 async function owned(header,role){
  const identity=await verifyIdentity(header)
  if(!PROFILE_ROLES.includes(role))throw new AuthError(400,'Perfil no válido')
  const p=(await db.query('SELECT p.id FROM matchter.account_profiles p JOIN matchter.accounts a ON a.id=p.account_id WHERE a.auth_issuer=$1 AND a.auth_subject=$2 AND p.role=$3',[identity.issuer,identity.subject,role])).rows[0]
  if(!p)throw new AuthError(404,'Perfil no disponible')
  return p.id
 }
 const select='SELECT city,specialty,bio,work_mode AS "workMode",business_name AS "businessName" FROM matchter.profile_details WHERE profile_id=$1'
 return Object.freeze({
  async get(header,role){const id=await owned(header,role);return {role,details:(await db.query(select,[id])).rows[0]||empty()}},
  async save(header,body){
   const role=body?.role,id=await owned(header,role)
   if(!body||Object.keys(body).length!==2||!Object.hasOwn(body,'details'))throw new AuthError(400,'Solicitud no válida')
   const d=validateDetails(role,body.details)
   const result=await db.query('INSERT INTO matchter.profile_details(profile_id,city,specialty,bio,work_mode,business_name) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(profile_id) DO UPDATE SET city=EXCLUDED.city,specialty=EXCLUDED.specialty,bio=EXCLUDED.bio,work_mode=EXCLUDED.work_mode,business_name=EXCLUDED.business_name,updated_at=now() RETURNING city,specialty,bio,work_mode AS "workMode",business_name AS "businessName"',[id,d.city,d.specialty,d.bio,d.workMode,d.businessName])
   return {role,details:result.rows[0]}
  }
 })
}
