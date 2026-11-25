export const ACCOUNT_TYPES=Object.freeze([
 ['👤','Perfil clientes','Busca y contrata profesionales para tu proyecto'],
 ['🔨','Perfil maestros','Ofrece tus servicios de obra y oficios'],
 ['📐','Profesionales y contratistas','Arquitectos, ingenieros y contratistas independientes'],
 ['🏢','Perfil empresas','Constructoras y empresas que buscan o ofrecen proyectos']
].map(Object.freeze))
export const ROLE_BY_LABEL=Object.freeze({'Perfil clientes':'Cliente','Perfil maestros':'Maestro o contratista','Profesionales y contratistas':'Profesional','Perfil empresas':'Empresa'})
export function roleForLabel(label){if(!Object.hasOwn(ROLE_BY_LABEL,label))throw Error('Selecciona un tipo de cuenta válido');return ROLE_BY_LABEL[label]}
export const canonicalEmail=email=>String(email||'').trim().toLowerCase()
export function pendingRoleFor(pending,user){return pending&&canonicalEmail(pending.email)===canonicalEmail(user?.email)&&user?.emailVerified===true?roleForLabel(pending.label):null}
export async function accountRequest(client,path,body,fetcher=fetch){
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('No se pudo obtener una sesión válida. Inicia sesión nuevamente.')
 const res=await fetcher('/api/auth-preview/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
 const data=await res.json().catch(()=>null)
 if(path==='me'&&res.status===404&&data?.message==='Completa tu perfil')return null
 if(!res.ok)throw Error(data?.message||'API de perfiles: HTTP '+res.status)
 if(!data||!Object.values(ROLE_BY_LABEL).includes(data.role)||typeof data.id!=='string')throw Error('Respuesta de perfil no válida')
 return data
}
export async function completeIdentity(client,session,pending,request=accountRequest){
 if(!session?.user||session.user.emailVerified!==true)return null
 const existing=await request(client,'me')
 if(existing)return existing
 const role=pendingRoleFor(pending,session.user)
 return role?await request(client,'onboard',{role}):null
}
