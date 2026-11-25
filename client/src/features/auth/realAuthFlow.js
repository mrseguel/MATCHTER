import {ROLE_BY_LABEL,roleForLabel} from '../../profileRoles.js'
export {ACCOUNT_TYPES,ROLE_BY_LABEL,displayRole,roleForLabel} from '../../profileRoles.js'
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
